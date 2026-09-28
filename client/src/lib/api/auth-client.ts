import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { getApiBaseUrl } from "./csrf";

/**
 * Better Auth client (live — cutover done).
 *
 * The Nest API serves Better Auth under the `/api/v1` prefix
 * (`basePath: "/api/v1/auth"` in `backend/src/lib/auth.ts`), so the client
 * base URL is `<apiBase>/auth`, e.g. `http://localhost:3001/api/v1/auth`
 * locally or `/api/v1/auth` behind the same-origin proxy.
 */
export function getAuthBaseUrl(): string {
  return `${getApiBaseUrl()}/auth`;
}

/**
 * Better Auth requires an ABSOLUTE baseURL (`new URL()` at construction),
 * but our configured base is relative (`/api/v1/auth`) behind the
 * same-origin proxy. Resolve against the page origin at runtime; during
 * prerender (no `window`) fall back to a placeholder — no request is ever
 * made server-side, it only satisfies constructor validation so `next build`
 * doesn't crash (Vercel builds with `NEXT_PUBLIC_API_URL=/api/v1`).
 */
function resolveAuthBaseUrl(): string {
  const base = getAuthBaseUrl();
  if (/^https?:\/\//i.test(base)) return base;
  if (typeof window !== "undefined") return `${window.location.origin}${base}`;
  return "http://localhost:3001/api/v1/auth";
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [organizationClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
