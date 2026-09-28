/**
 * Better Auth browser smoke test (Goal 1).
 *
 * Drives the system Chrome (own test profile — your open Chrome windows are
 * untouched) through: login page render → email signup → dashboard landing →
 * Google button redirect target.
 *
 * Run:  TEST_EMAIL=you@example.com node scripts/ba-smoke.mjs
 * Env:  WEB_URL (default http://localhost:3002), HEADLESS (default true)
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB_URL = (process.env.WEB_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
const TEST_EMAIL =
  process.env.TEST_EMAIL ?? `pw-smoke-${Date.now()}@example.com`;
const TEST_NAME = process.env.TEST_NAME ?? 'Smoke Test';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Smoke-test-123';
const SHOT_DIR = new URL('./ba-smoke-shots/', import.meta.url);

const failures = [];
const notes = [];

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: process.env.HEADLESS !== 'false',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (err) => {
  check('no page errors', false, String(err).slice(0, 160));
});

try {
  mkdirSync(SHOT_DIR, { recursive: true });

  // 1. Login page renders.
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: new URL('01-login.png', SHOT_DIR).pathname });
  check('login page renders', await page.getByRole('tab', { name: 'Log in' }).isVisible());
  check(
    'google button present',
    await page.getByRole('button', { name: /continue with google/i }).isVisible(),
  );

  // 2. Email signup → dashboard.
  await page.getByRole('tab', { name: 'Sign up' }).click();
  await page.locator('input[name="name"]').fill(TEST_NAME);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    check('signup lands on /dashboard', true, TEST_EMAIL);
  } catch {
    check('signup lands on /dashboard', false, 'no redirect within 15s');
  }
  await page.screenshot({ path: new URL('02-dashboard.png', SHOT_DIR).pathname });

  // Session cookie set?
  const cookies = await page.context().cookies();
  check(
    'session cookie set',
    cookies.some((c) => c.name === 'promptwear.session_token' && c.value),
  );

  // 3. Session API agrees (same origin, cookies included).
  const sessionState = await page.evaluate(async () => {
    const res = await fetch('http://localhost:3001/api/v1/auth/get-session', {
      credentials: 'include',
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  });
  check(
    'get-session returns the new user',
    sessionState.status === 200 && sessionState.body?.user?.email === TEST_EMAIL,
    `status=${sessionState.status}`,
  );

  // 4. Forgot? → dedicated page → reset email requested (throwaway address
  // so no real inbox gets mail; the server still exercises validation + send).
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });
  await page.context().clearCookies();
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^forgot\?$/i }).click();
  try {
    await page.waitForURL(/\/forgot-password/, { timeout: 10000 });
    check('forgot-password page opens', true);
  } catch {
    check('forgot-password page opens', false, page.url());
  }
  await page.locator('input[name="email"]').fill(`pw-forgot-${Date.now()}@example.com`);
  await page.getByRole('button', { name: /send reset link/i }).click();
  try {
    await page.getByText('Check your inbox').waitFor({ timeout: 10000 });
    check('forgot-password requests reset email', true);
  } catch {
    check('forgot-password requests reset email', false, 'no success state');
  }
  await page.screenshot({ path: new URL('03-forgot.png', SHOT_DIR).pathname });

  // 5. Google button target (fresh profile → Google sign-in or mismatch page).  await page.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });
  // Already authenticated → app redirects to /dashboard; use a fresh context
  // state by clearing cookies first so the login form shows.
  await page.context().clearCookies();
  await page.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /continue with google/i }).click();
  try {
    await page.waitForURL(/accounts\.google\.com/, { timeout: 15000 });
    const url = page.url();
    const callbackOk = url.includes(
      encodeURIComponent('http://localhost:3001/api/v1/auth/callback/google'),
    );
    notes.push(`google authorize URL reached: ${url.slice(0, 120)}…`);
    check('google redirect uses Better Auth callback', callbackOk);
  } catch {
    check('google redirect reaches accounts.google.com', false, page.url().slice(0, 120));
  }
  await page.screenshot({ path: new URL('03-google.png', SHOT_DIR).pathname });
} finally {
  await browser.close();
}

for (const note of notes) console.log(`NOTE  ${note}`);
console.log(
  failures.length === 0
    ? `\nSMOKE OK (${TEST_EMAIL})`
    : `\nSMOKE FAILED: ${failures.join(', ')}`,
);
process.exit(failures.length === 0 ? 0 : 1);
