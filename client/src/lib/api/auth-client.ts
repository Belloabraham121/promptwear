import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { getApiBaseUrl } from "./csrf";

/**
 * Better Auth client — Phase 1 scaffold (dual-run, NOT used yet).
 *
 * The Nest API serves Better Auth under the `/api/v1` prefix
 * (`basePath: "/api/v1/auth"` in `backend/src/lib/auth.ts`), so the client
 * base URL is `<apiBase>/auth`, e.g. `http://localhost:3001/api/v1/auth`
 * locally or `/api/v1/auth` behind the same-origin proxy.
 *
 * Phase 4 cutover: `AuthProvider` switches from `@/lib/api/auth`
 * (legacy `/auth/login` etc.) to `signIn`/`signUp`/`signOut`/`useSession`
 * below, and Google buttons call
 * `authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })`.
 */
export function getAuthBaseUrl(): string {
  return `${getApiBaseUrl()}/auth`;
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [organizationClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
