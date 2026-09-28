import { Logger } from '@nestjs/common';
import { Resend } from 'resend';

const logger = new Logger('Email');

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Single email entry point for every Better Auth callback.
 *
 * - Prod (`RESEND_API_KEY` set): sends via Resend from `EMAIL_FROM`.
 * - Local dev (no key): logs instead of sending, so password-reset,
 *   verification and invite flows stay testable with zero config.
 *
 * Never throws — delivery failure is logged loudly. Better Auth callbacks
 * invoke senders with `void ...(...)` (fire-and-forget, per upstream
 * guidance to avoid timing attacks), so a throw would surface as an
 * unhandled rejection. TODO(better-auth-phase-3): dead-letter / alerting
 * on repeated Resend failures.
 */
async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    logger.warn(
      `[dev-fallback] email NOT sent (RESEND_API_KEY unset) ` +
        `to=${input.to} subject=${JSON.stringify(input.subject)}\n${input.text}`,
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const from =
      process.env.EMAIL_FROM?.trim() ?? 'Promptwear <noreply@promptwear.app>';
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<pre>${escapeHtml(input.text)}</pre>`,
    });

    if (error) {
      logger.error(`Resend rejected email to=${input.to}: ${error.message}`);
      return;
    }

    logger.log(
      `Email sent to=${input.to} subject=${JSON.stringify(input.subject)}`,
    );
  } catch (err) {
    logger.error(
      `Email send failed to=${input.to}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Brand shell (Driblab Bone + lime) shared by every template. */
function layout(params: {
  heading: string;
  intro: string;
  cta?: { label: string; url: string };
  outro: string;
}): string {
  const button = params.cta
    ? `<a href="${params.cta.url}" style="display:inline-block;background:#d6ff3c;color:#070807;font-weight:bold;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;margin:24px 0;">${escapeHtml(params.cta.label)}</a>`
    : '';
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f0e8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
<p style="font-weight:800;font-size:20px;letter-spacing:-0.05em;color:#0b1f1c;margin:0 0 4px;">driblab<span style="color:#5a6b14;">.</span></p>
<div style="background:#ffffff;border:1px solid rgba(11,31,28,0.1);border-radius:16px;padding:32px;margin-top:16px;">
<h1 style="font-size:22px;color:#0b1f1c;margin:0 0 16px;">${escapeHtml(params.heading)}</h1>
<p style="font-size:15px;line-height:1.6;color:#0b1f1c;margin:0;">${params.intro}</p>
${button}
<p style="font-size:13px;line-height:1.6;color:#52706a;margin:16px 0 0;">${params.outro}</p>
</div>
<p style="font-size:12px;color:#52706a;opacity:0.7;margin:16px 0 0;">© 2026 Driblab</p>
</div>
</body></html>`;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: 'Reset your Promptwear password',
    text:
      `You asked to reset your Promptwear password.\n\n` +
      `Reset it here: ${input.url}\n\n` +
      `This link expires in 10 minutes. If you didn't ask for this, ignore this email.`,
    html: layout({
      heading: 'Reset your password',
      intro: 'You asked to reset your Promptwear password. Tap the button below — it expires in 10 minutes.',
      cta: { label: 'Set a new password', url: input.url },
      outro: `Button not working? Paste this link into your browser:<br>${escapeHtml(input.url)}<br><br>If you didn't ask for this, ignore this email.`,
    }),
  });
}

export async function sendVerificationEmail(input: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: 'Verify your Promptwear email',
    text:
      `Welcome to Promptwear, ${input.name}.\n\n` +
      `Verify your email here: ${input.url}\n\n` +
      `If you didn't create this account, ignore this email.`,
    html: layout({
      heading: 'Verify your email',
      intro: `Welcome to Promptwear, ${escapeHtml(input.name)}. Confirm this address to finish setting up your account.`,
      cta: { label: 'Verify email', url: input.url },
      outro: `Button not working? Paste this link into your browser:<br>${escapeHtml(input.url)}<br><br>If you didn't create this account, ignore this email.`,
    }),
  });
}

export async function sendInvitationEmail(input: {
  to: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: `You've been invited to ${input.organizationName} on Promptwear`,
    text:
      `${input.inviterName} (${input.inviterEmail}) invited you to join ` +
      `${input.organizationName} on Promptwear.\n\n` +
      `Accept here: ${input.url}\n\n` +
      `If you weren't expecting this, ignore this email.`,
    html: layout({
      heading: `Join ${input.organizationName}`,
      intro: `${escapeHtml(input.inviterName)} (${escapeHtml(input.inviterEmail)}) invited you to join <strong>${escapeHtml(input.organizationName)}</strong> on Promptwear.`,
      cta: { label: 'Accept invitation', url: input.url },
      outro: `Button not working? Paste this link into your browser:<br>${escapeHtml(input.url)}<br><br>If you weren't expecting this, ignore this email.`,
    }),
  });
}
