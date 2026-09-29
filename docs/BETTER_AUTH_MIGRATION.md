# Better Auth Migration — Promptwear (`feature/better-auth-migration`)

Branch: `feature/better-auth-migration` (branched from `ui-redesign` @ `27f8c88`).

**Status legend for every section's to-do list:**

- `[x]` Done and verified
- `[~]` Scaffolded — code exists but not live (dual-run: legacy auth still serves)
- `[ ]` Pending — tagged with the rollout phase that owns it (§10)

## 1. Goal

Migrate **everything auth OTB to [Better Auth](https://better-auth.com/docs/introduction)**:

1. **One email = one user.** Today registering with email+password then trying Google with the same email fails by design (`AuthService.loginOrRegisterWithGoogle` throws `CONFLICT` — "Never auto-link Google to an existing password/guest account"). Target: password + Google **link to the same user** when the Google email is verified.
2. Delete custom auth plumbing (manual JWT issue/refresh, `RefreshToken` table + Redis denylist, hand-rolled Google code exchange + state cookies, `passwordHash`/`googleId` columns) in favor of Better Auth primitives.
3. Get **multitenancy** OTB via the [organization plugin](https://better-auth.com/docs/plugins/organization) instead of inventing `tenantId` columns later. Today there is **no tenancy at all** — only `User.role` (`customer` | `admin`) + `guest` flag, and all domain rows (`Design`, `Asset`, `Order`, `Payment`) are scoped by `userId`.
4. Get **email flows** OTB (forgot-password, verification, org invites) via one pluggable sender — today there is zero email infrastructure (see §9).

**To-dos:**

- [x] One email = one user (live on backend 2026-09-28: signup/signin/session/reset verified; Google leg needs Console URI — §11)
- [x] Delete custom auth plumbing (legacy services, guards, CSRF, RefreshToken logic deleted; `passwordHash`/`googleId` columns + `RefreshToken` table drop pending Phase 6)
- [ ] Multitenancy live (Phase 5)
- [x] Email sender wired with dev fallback (proven live: reset email logged server-side)

## 2. Current state (audited 2026-09-28)

### Backend (`backend/`, NestJS + Prisma + Postgres)

| Piece | File | Notes |
|---|---|---|
| Register/login/refresh/session/logout | `src/modules/auth/auth.service.ts`, `auth.controller.ts` | `POST /api/v1/auth/{register,login,refresh,logout}`, `GET /session`, `GET /csrf` |
| Cookies | `src/modules/auth/auth-cookie.service.ts` | `access_token` (path `/`), `refresh_token` (path `/api/v1/auth`), `csrf_token` (readable). `SameSite=None+Secure` in prod |
| JWT guard (global) | `src/common/guards/jwt-auth.guard.ts` + `APP_GUARD` in `app.module.ts` | Reads `access_token` cookie, `@Public()` opt-out. `CsrfGuard` + `RolesGuard` also global |
| Passwords | `src/modules/auth/password.service.ts` (`@node-rs/argon2`) | Stored on `User.passwordHash` |
| Google OAuth | `src/modules/auth/google-oauth.service.ts` | Manual `accounts.google.com` → token exchange → `userinfo`, Redis state (`oauth:google:state:*`), cookie `oauth_google_state`. **Blocks linking** (see §1) |
| Refresh rotation | `AuthService.refresh()` + `RefreshToken` model + Redis `rt:deny:*` | Replace with Better Auth sessions |
| User model | `prisma/schema.prisma` `User` | `id cuid()`, `email @unique`, `name`, `passwordHash?`, `role`, `guest`, `googleId? @unique`, `refreshTokens[]` |
| Portal split | `LoginDto.portal: creator \| admin` | Admin emails blocked from creator login and vice versa. Must be re-expressed in Better Auth (admin plugin + `validateUserInfo`, separate admin login page kept) |
| Config | `src/config/{configuration.ts,env.schema.ts}`, `backend/.env.example` | `JWT_SECRET/ACCESS_TTL/REFRESH_TTL`, `APP_URL`, `GOOGLE_{CLIENT_ID,CLIENT_SECRET,CALLBACK_URL}` |
| Email infra | — | **None.** No SMTP, no Resend/SES, no sender code anywhere. `AuthPage` "Forgot?" is a toast stub |

### Frontend (`client/`, Next.js 16 + React 19 + TanStack Query)

| Piece | File | Notes |
|---|---|---|
| API wrapper | `src/lib/api/client.ts` | `credentials: include`, CSRF header on mutations, 401 → `POST /auth/refresh` retry → redirect `/login` or `/admin/login` |
| Auth API | `src/lib/api/auth.ts` | `getSession/login/register/logout/refreshSession` against `/auth/*` envelope (`{data}`) |
| Session state | `src/providers/AuthProvider.tsx` | `useQuery(session)` + login/register/logout mutations, per-user query-cache reset |
| Pages | `src/components/auth/AuthPage.tsx`, `AdminLoginPage.tsx`, `app/{login,signup,admin/login}` | Google = full-page redirect to `${API}/auth/google`. No password-reset (toast says "available once auth is connected"). No `/reset-password`, `/verify-email`, `/accept-invitation` routes |
| Guards | `DashboardAuthGate`, `AdminGate`, `DashboardShell` | Role checks on `session.role` |

No `better-auth` dependency exists today in either `package.json`.

**To-dos:**

- [x] Audit backend auth surface (§2 table)
- [x] Audit frontend auth surface (§2 table)
- [x] Confirm zero email infra (grep: no resend/nodemailer/SMTP/SES; no OTP/forgot UI)

## 3. Target state (Better Auth OTB)

```
Next.js (better-auth/react authClient) ──► NestJS /api/v1/auth/* ──► Better Auth handler ──► Prisma (Postgres)
        signUp.email / signIn.email / signIn.social(google)      toNodeHandler(auth.handler)
        organizationClient, adminClient                           BetterAuthGuard replaces JwtAuthGuard
        requestPasswordReset / resetPassword ──► Resend (prod) / console log (dev)
```

- **Single `auth` instance**: `backend/src/lib/auth.ts` → `betterAuth({ database: prismaAdapter(prisma, {provider:"postgresql"}), emailAndPassword, socialProviders.google, plugins: [admin(), organization()], account.accountLinking, session, user.additionalFields })`.
- **Mount**: catch-all in Nest (`AuthController` `@All('auth/*')` → `auth.handler`, or Express `app.all('/api/v1/auth/*')` with `bodyParser:false` for that route — see [NestJS integration](https://better-auth.com/docs/integrations/nestjs), community `@thallesp/nestjs-better-auth` optional; raw `toNodeHandler` preferred to avoid extra dep).
- **Client**: `client/src/lib/auth-client.ts` → `createAuthClient({ baseURL: NEXT_PUBLIC_API_URL, plugins: [organizationClient(), adminClient()] })`. `AuthProvider` re-implements on `authClient.useSession()`.
- **IDs**: keep `cuid()`-compatible text IDs (`advanced.database.generateId` default is fine; existing `cuid()` rows remain valid).

**To-dos:**

- [~] `backend/src/lib/auth.ts` instance created (not mounted — Phase 3)
- [~] `client/src/lib/api/auth-client.ts` created (not consumed — Phase 4)
- [ ] Handler mounted at `/api/v1/auth/*` (Phase 3)
- [ ] `AuthProvider` + pages on `authClient` (Phase 4)

## 4. The account-linking fix (your reported bug)

Current behavior: `byEmail` exists + no `googleId` → always `409 CONFLICT`, even when Google email is verified. That was a deliberate anti-squatting guard, but it breaks the "same email, either method" UX you want.

Better Auth replacement (all OTB, no custom crypto — scaffolded in `backend/src/lib/auth.ts`):

```ts
export const auth = betterAuth({
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
    },
  },
  account: {
    accountLinking: {
      enabled: true,                    // default — link when provider email is verified
      trustedProviders: ["google"],     // Google verified email ⇒ safe to link to existing password user
      allowDifferentEmails: false,      // keep strict: only same-email auto-link
      updateUserInfoOnLink: false,
    },
  },
});
```

Result:

| Scenario | Before | After |
|---|---|---|
| Sign up password `a@x.com`, then Google `a@x.com` (verified) | `409` "Log in with your password instead" | **Linked**: same `userId`, new `account` row `providerId=google`, session issued |
| Google first, then password sign-up same email | `409` | `422` credential-link path: user signs in with Google → **set password** (`auth.api.setPassword`, server-only) adds `credential` account |
| Truly different Google `sub` claiming same email, email **unverified** | `409` | Rejected OTB (no session), no takeover |
| Admin email on creator portal | `403` custom | `user.validateUserInfo` gate (see §6) |

Explicit linking/unlinking from account settings stays available OTB: `authClient.linkSocial({provider:"google"})`, `authClient.unlinkAccount({accountId})`, `authClient.listAccounts()`. Keep `allowUnlinkingAll: false` so users can't orphan themselves.

**To-dos:**

- [x] Linking config in `auth.ts` (`accountLinking` + `trustedProviders: ["google"]`)
- [x] Live-verified password side: signup → signin → session → reset → new-password signin (e2e + curl, 2026-09-28)
- [ ] Live-verify Google leg: password signup → same-email Google → one `userId`, two `account` rows — **blocked on Google Console URI (§11)**
- [x] Account-settings link/unlink available OTB (`listAccounts`/`linkSocial`/`unlinkAccount`); UI surface still to build
- [x] Portal gate, client-side (AdminLoginPage rejects non-admin + signs out); server `validateUserInfo` still open (§7.6)

## 5. Multitenancy (organization plugin, phased)

Today: no orgs. Target: Better Auth org tables own tenancy; domain tables gain optional `organizationId` later — **no big-bang rewrite of `Design/Order/Asset` in this migration**.

- **Phase A (this migration)**: add `organization | member | invitation` (+ `team` tables only if `teams.enabled`, default off) tables; `session.activeOrganizationId`; client `organizationClient()`. Single-user behavior unchanged; every user gets an implicit personal org lazily (created on first org-gated action, not at signup, to avoid signup friction).
- **Phase B (later)**: add `organizationId?` to `Design/Order/Asset`, backfill from `userId`'s personal org, then enforce `member` checks in service layer (`getActiveMember` / `auth.api`). Roles: `owner | admin | member` at org level stay **orthogonal** to the global `customer | admin` app role (staff admin stays global via admin plugin; org roles govern workspaces).
- Guards: `allowUserToCreateOrganization: true` initially (or gate on non-guest); `requireEmailVerificationOnInvitation: true` once email delivery exists (sender is wired — §9); `sendInvitationEmail` is implemented in `auth.ts`, accept-page UI is Phase 5.

**To-dos:**

- [x] Org tables in schema (`Organization/Member/Invitation`, `activeOrganizationId`) — migration applied to dev
- [x] `organization()` plugin in `auth.ts` + `organizationClient()` in `auth-client.ts`
- [x] `sendInvitationEmail` wired (§9, dev-logged until Resend key)
- [x] Personal workspace auto-provision on signup (`databaseHooks.user.create.after`, owner role) — live-verified
- [x] Invite-by-email → signup → accept flow — live-verified end-to-end + `test/org.e2e-spec.ts` 4/4 (incl. member-cannot-invite 403)
- [x] Team UI (`/dashboard/team`: list/create/switch orgs, members, invite, cancel) + `/accept-invitation/[id]` page + nav item
- [ ] Run org-tables migration on staging/prod (dev done)
- [ ] Flip `requireEmailVerificationOnInvitation` → `true` once real delivery + verification enforced
- [ ] "My pending invites" browser (needs verified email for `listUserInvitations`; link flow covers it today)
- [ ] Phase B: `organizationId?` on domain tables (out of this migration)

## 6. Schema mapping (Prisma)

Better Auth core needs `user | session | account | verification` ([core schema](https://better-auth.com/docs/concepts/database#core-schema)); admin plugin adds `role, banned, banReason, banExpires` on user + `impersonatedBy` on session; org plugin adds `organization, member, invitation`.

Migration strategy — **alter in place, backfill, then drop legacy columns**:

1. `npx @better-auth/cli generate` against the new `auth.ts`, then hand-merge into `prisma/schema.prisma` to preserve `UserRole`, `guest`, and domain relations.
2. `User` deltas:
   - keep: `id (String, cuid default — compatible)`, `email @unique`, `name`, `createdAt/updatedAt`, domain relations;
   - add: `emailVerified Boolean @default(false)`, `image String?`, `role String @default("customer")` (admin plugin stores string roles — decision (a) in §13: keep `customer/admin` strings), `banned Boolean @default(false)`, `banReason String?`, `banExpires DateTime?`, plus `guest Boolean` as `user.additionalFields` (stays);
   - drop **after** backfill: `passwordHash` (→ `account` `providerId="credential"` via scrypt; argon2 hashes **cannot** be imported — users keep sessions, else password-reset flow), `googleId` (→ `account` rows), `RefreshToken` model (→ `session` table).
3. Data migration (single transaction, downtime window or dual-write):
   - password users → force **password-reset** (don't fake hashes). Pre-create `verification` reset tokens or send reset emails post-cutover (§9 sender is ready).
   - Google users → `account(providerId="google", accountId=<old googleId>)`; set `emailVerified=true` where Google-verified.
   - sessions: invalidate all legacy JWTs (rotate `BETTER_AUTH_SECRET` fresh; old `RefreshToken` rows deleted).
4. `npx prisma migrate dev --name better-auth-core` (+ `--name better-auth-orgs`, `--name better-auth-admin` or one squashed migration on this branch).

**To-dos:**

- [x] `auth.ts` instance for CLI introspection
- [x] CLI `generate` output hand-merged into `schema.prisma` (legacy columns kept, `TODO(better-auth)` markers)
- [x] `prisma validate` + `prisma generate` pass
- [x] Migration `20260928155910_better_auth_core` applied to dev DB (additive; 3 legacy users intact)
- [x] Backfill script (`prisma/backfill-better-auth.ts`, dry-run default, `--live` writes, idempotent) — **run on dev 2026-09-28**: 2 Google users linked + verified, 3 personal workspaces created, 1 password user (admin) routed to reset flow
- [ ] Convert `User.role` enum → String `customer/admin` (deferred; enum values match so runtime is fine)
- [ ] Drop `passwordHash`, `googleId`, `RefreshToken` after backfill verified (Phase 6)

## 7. Backend work list

1. Deps: `npm i better-auth` (+ `@better-auth/cli -D`); adapter needs no extra (`better-auth/adapters/prisma` uses existing `@prisma/client`). Plus `npm i resend` for email (§9).
2. Env (`env.schema.ts` + `.env.example`): add `BETTER_AUTH_SECRET (min 32)`, `BETTER_AUTH_URL` (= `APP_URL` for OAuth callback construction); keep `GOOGLE_*` but **replace** `GOOGLE_CALLBACK_URL` value with `${APP_URL}/api/auth/callback/google` (Better Auth default path, not `/api/v1/auth/google/callback`); deprecate `JWT_*` after cutover (keep during dual-run). Add `RESEND_API_KEY`, `EMAIL_FROM` (§9).
3. `backend/src/lib/auth.ts`: email+password + Google + linking (§4) + `admin({defaultRole:"customer",adminRoles:["admin"]})` + `organization({...})` + email callbacks (§9) + `user.additionalFields: { guest }` + `session: { expiresIn: 7d, updateAge: 1d, cookieCache }` + `trustedOrigins: [APP_URL]` + `advanced.cookiePrefix: "promptwear"`.
4. Mount: `AuthController` → `@All('auth/*')` delegating to `auth.handler` (preserve `/api/v1` global prefix → Better Auth `basePath: "/api/v1/auth"`); set `bodyParser:false` for that route (global ValidationPipe stays for other routes). Delete `google-oauth.service.ts`, `password.service.ts` (or keep argon2 only for a one-shot verify-during-dual-run if chosen), `auth-cookie.service.ts`, `RefreshToken` logic.
5. Guards: replace `JwtAuthGuard` payload verification with Better Auth session lookup (`auth.api.getSession({headers})`); new `BetterAuthGuard` sets `request.user = { sub: session.user.id, email, role }` so `CurrentUser`, `RolesGuard`, `OwnershipGuard`, `CsrfGuard` (relax: Better Auth uses `Origin`/`Host` checks + its own CSRF — drop custom `X-CSRF-Token` flow) keep working. Keep `@Public()` semantics.
6. Portal gating: `validateUserInfo` (or `databaseHooks.user.create.before`) rejects `admin`-role emails on creator signup and non-admin on admin login path; `AdminLoginPage` calls `signIn.email` then checks `role === "admin"` client-side as today.
7. Swagger: replace `addCookieAuth('access_token')` with Better Auth session cookie name.
8. Rate-limit: move auth throttles into Better Auth `rateLimit` options; remove `@Throttle` on deleted routes.

**To-dos:**

- [x] 7.1 Deps (`better-auth`, `@better-auth/cli`, `resend`)
- [x] 7.2 Env additions (additive; `JWT_*` untouched — still used by nothing, removal Phase 6)
- [x] 7.3 `auth.ts` (+ `prisma.ts`, `email.ts`) — mounted and serving
- [x] 7.4 Mount (`@All('*')` → `toNodeHandler`, `bodyParser: false` + selective JSON in `main.ts`); legacy `auth.service`/`password.service`/`google-oauth.service`/`auth-cookie.service`/DTOs **deleted**
- [x] 7.5 `BetterAuthGuard` (same `RequestUser` shape) + custom CSRF replaced by `OriginGuard` (Origin/Referer vs `APP_URL`; Better Auth signs `sign-out` with `MISSING_OR_NULL_ORIGIN` when curl omits Origin — browsers always send it)
- [x] 7.6 Portal gating, client-side only (server `validateUserInfo` still open)
- [x] 7.7 Swagger cookie name → `promptwear.session_token`
- [x] 7.8 Legacy `@Throttle` decorators deleted with old controller; global 300/min kept (Better Auth `rateLimit` tuning still open)

Behavioral notes (verified 2026-09-28): `get-session` signed-out returns **200 + null** (not 401); `cookieCache` deliberately **off** so sign-out/revoke is immediate; session cookie is `promptwear.session_token`.

## 8. Frontend work list

1. Deps: `npm i better-auth` (client).
2. `client/src/lib/api/auth-client.ts`: `createAuthClient({ baseURL: <apiBase>/auth, plugins: [organizationClient(), adminClient()] })`.
3. `AuthProvider`: replace `api/auth.ts` calls with `authClient.signUp.email / signIn.email / signOut / useSession`; drop `refreshSession` + CSRF token fetching (Better Auth handles session cookies + refresh); keep `resetQueryCacheForUser`/`clearLocalUserData` side-effects and `/admin/login` redirect logic.
4. `AuthPage`: Google button → `authClient.signIn.social({ provider:"google", callbackURL:"/dashboard" })`; error query param becomes Better Auth `?error=` codes (map to toasts); "Forgot?" → `requestPasswordReset` flow + `/reset-password` page (§9 — sender is wired, UI is the remaining work).
5. `next.config.ts` proxy: ensure `/api/v1/auth/*` passthrough preserves `Set-Cookie` (Better Auth cookies are `HttpOnly`, `SameSite=Lax` by default; set `secure` + `sameSite:none` only for cross-site prod like today).
6. Types: `SafeUser` gains `emailVerified, image`; `role` stays `"customer"|"admin"` per decision (a).
7. New routes: `/reset-password` (token → new password), `/verify-email` (optional), `/accept-invitation/[id]` (Phase 5).

**To-dos:**

- [x] 8.1 Client dep
- [x] 8.2 `auth-client.ts` (+ `getAuthBaseUrl()`); `tsc` clean
- [x] 8.3 `AuthProvider` on `useSession`/`signIn.email`/`signUp.email`/`signOut`; `lib/api/auth.ts` deleted; `client.ts` refresh/CSRF paths removed (401 → notify + redirect)
- [x] 8.4 `AuthPage` Google via `signIn.social`, working Forgot? (`requestPasswordReset`), `?error=` toasts
- [x] 8.5 Local absolute API URL (proxy `Set-Cookie` check still open for Vercel→Coolify prod)
- [x] 8.6 `SafeUser` mapping from BA session user (role/guest via defensive runtime map)
- [x] 8.7 `/reset-password` + `/forgot-password` (email input, sending/sent/error states) + `/verify-email` routes; `/accept-invitation/[id]` (Phase 5, done)

## 9. Email (Resend) — forgot-password, verification, invites

**Decision (was §13.3): Resend.** No email infra existed, so: one `sendEmail()` sender (`backend/src/lib/email.ts`) backed by Resend in prod, console-log fallback locally. Better Auth never sends mail itself — every flow below just hands `{ to, url }` to our function.

### 9a. Forgot password — magic LINK, not OTP

1. User submits email → client calls `authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })`.
2. Better Auth stores a token in `verification`, builds `url`, calls our `sendResetPassword({ user, url })` → Resend.
3. User clicks link → `/reset-password?token=…` → client calls `authClient.resetPassword({ newPassword, token })` → hash updated (scrypt, `Account`), optionally revoke other sessions (`revokeSessionsOnPasswordReset`).

No OTP plugin involved. This is also the recovery path for password users at cutover (argon2 hashes can't migrate — §6.3).

### 9b. Verification — link, not OTP

`emailVerification.sendVerificationEmail` is wired the same way, with `sendOnSignUp: true` so every signup sends the welcome/verify email (proven live 2026-09-28). Login is **not** gated on verification yet; `authClient.sendVerificationEmail()` works whenever needed. Gating (`requireEmailVerification`) is a Phase 5 call.

### 9c. Org invites — link, not OTP

`organization.sendInvitationEmail` emails `${APP_URL}/accept-invitation/${invitationId}`. Accept = logged-in `authClient.organization.acceptInvitation({ invitationId })`. Only flow that hard-requires real delivery (dev fallback logs the link).

### 9d. Where OTP fits (opt-in, later)

Six-digit codes (passwordless sign-in, code verification) come from the separate `emailOTP` plugin — not installed. Add it only if link-based flows prove insufficient.

### Env

| Var | Required where | Notes |
|---|---|---|
| `RESEND_API_KEY` | staging/prod | unset → dev log-fallback, nothing sends |
| `EMAIL_FROM` | staging/prod | must be a Resend-verified domain in prod (default `Promptwear <noreply@promptwear.app>`) |

**Link host rule:** emailed links are built against the WEB origin (`CLIENT_URL ?? APP_URL`) — never Better Auth's `baseURL`, which points at the API and 404s on page paths. Applies to reset, verification, and invite links alike.

**To-dos:**

- [x] 9.0 Provider decision: Resend
- [x] 9.1 `resend` dep + `src/lib/email.ts` (Resend w/ dev log-fallback, never throws)
- [x] 9.2 `sendResetPassword` wired in `auth.ts`
- [x] 9.3 `sendVerificationEmail` wired in `auth.ts`
- [x] 9.4 `sendInvitationEmail` wired in `auth.ts`
- [x] 9.5 Env vars (`RESEND_API_KEY`, `EMAIL_FROM`) in schema + config + `.env.example`
- [x] 9.6 `nest build` passes with email module
- [x] 9.7 Real delivery proven 2026-09-28: send-only key `promptwear-dev` scoped to verified domain `team.locimind.org`; CLI test email **delivered** to Gmail; app forgot-password for the admin account sent branded template (no longer dev-logged). Key lives only in gitignored `backend/.env` (`RESEND_API_KEY`, `EMAIL_FROM=noreply@team.locimind.org`).
- [x] 9.8 Branded HTML templates (Bone/lime shell shared by reset/verify/invite + plain-text fallbacks; `email.ts` exposes typed senders)
- [ ] 9.9 Failure alerting / dead-letter on repeated send failures

## 10. Rollout phases on this branch

- [x] **0 — Plan (this file).** Audit + target + decisions.
- [x] **1 — Scaffold (dual-run).** Done, then superseded by cutover below.
- [~] **2 — Data backfill (staging).** Migration applied to dev; backfill of 3 legacy users pending.
- [x] **3 — Backend cutover.** Handler mounted, guards swapped, email proven via dev log, legacy services deleted.
- [x] **4 — Frontend cutover.** `AuthProvider`/`AuthPage`/reset page on `authClient`; legacy client auth paths removed.
- [~] **5 — Org rollout.** Team UI + accept page + auto personal orgs + e2e done and live on dev. Left: staging/prod migration run, `requireEmailVerificationOnInvitation` flip, `requireEmailVerification` decision.
- [~] **6 — Cleanup.** Auth services/guards/CSRF already deleted. Left: `passwordHash`, `googleId`, `RefreshToken` columns/table, `JWT_*` env, secret rotation.

## 11. Testing

- `backend`: `jest` guard tests (valid/invalid/expired session, admin vs customer, public routes); e2e: password signup → Google same-email link → session; OAuth callback; unlink-last-account blocked; org create/invite/accept/setActive.
- `client`: login/signup/Google redirect, session bootstrap 401→null, admin gate redirects, per-user cache purge on user switch.
- Email: dev-fallback log assertion (no key); staging end-to-end (reset → inbox → new password login; invite → accept) once key + domain exist.
- Staging checklist: Google Cloud **Authorized redirect URI** updated to Better Auth callback; `BETTER_AUTH_URL` = public API URL; cross-site cookie check (Vercel → Coolify); old JWTs rejected post-cutover.
- Deploy runtime: Node **>=22.12 required** (`engines` pinned in `backend/package.json`) — better-auth ships ESM-only dist and our CommonJS build needs `require(esm)`; older runtimes (e.g. Nixpacks' 22.11) crash at boot with `ERR_REQUIRE_ESM`. Prefer the `backend/Dockerfile` builder over Nixpacks where possible.
- Rollback: keep pre-migration DB snapshot; legacy code path tagged `pre-better-auth` (this branch base); rollback = revert deploy + restore snapshot (sessions lost — acceptable, document it).

**Results 2026-09-28 (dev, all live):**

- [x] e2e **18/19 pass** (`auth` 3/3 incl. signup→session→guarded `/users/me`→signout, duplicate 422, wrong-pw 401, reset→new-pw signin; `admin`/`analytics`/`orders`/`designs`/`app` green). Jest needed ESM transform rules for better-auth/jose/rou3/ohash (`test/jest-e2e.json` + `test/tsconfig.e2e-esm.json`).
- [x] curl: same flows green; Google `sign-in/social` returns correct `accounts.google.com` URL with `redirect_uri=http://localhost:3001/api/v1/auth/callback/google`.
- [x] Client `:3002` serves `/login` + `/reset-password` 200, no compile errors (`tsc` clean).
- [x] **Real-Chrome smoke** (`client/scripts/ba-smoke.mjs`, `playwright-core` + system Chrome, isolated profile): login renders, Google button present, **email signup → `/dashboard`** with `promptwear.session_token` set and `get-session` returning the user, **Forgot? → reset email** (success toast; invalid addresses get a specific message instead of a generic error), dashboard screenshot verified. Rerun: `TEST_EMAIL=you@x.com node scripts/ba-smoke.mjs`.
- [x] **Org e2e** (`test/org.e2e-spec.ts` 4/4): personal workspace on signup, create + invite, signup + accept → member, member-invite 403. Full suite 22/23 (studio excluded, see below).
- [x] **CORS multi-origin**: `:3000` is taken by another project, so the web app runs on `:3002`; `CLIENT_URL` env added (CORS + `trustedOrigins` + `OriginGuard` allowlist). Preflight from `:3002` verified. (Note: `CLIENT_URL` once vanished from local `.env` — origin unknown; re-added. Keep an eye on it.)
- [ ] **Studio e2e fails pre-existing**: `chat` → 502, reproduced on pristine pre-cutover code — OpenAI account has **no credits** (`credit_balance_exhausted`). Needs billing top-up, unrelated to auth.
- [ ] **Google redirect confirmed blocked in-browser**: click lands on Google `redirect_uri_mismatch` error page — the Console URI below is the *only* missing piece.
- [ ] **Manual step — Google Console**: add `http://localhost:3001/api/v1/auth/callback/google` (and the prod equivalent) to Authorized redirect URIs. Legacy `GOOGLE_CALLBACK_URL` value is now unused.
- [ ] Manual click-through with your own email: Google button same-email link, Forgot? → reset page, admin login gate.

**To-dos:**

- [ ] Backend guard/session e2e incl. same-email link case (Phase 3)
- [ ] Client auth-flow tests incl. `/reset-password` (Phase 4)
- [ ] Email dev-fallback assertion (Phase 3)
- [ ] Staging email + OAuth + cookie checklist (Phase 3)
- [ ] Pre-migration DB snapshot runbook (Phase 2)

## 12. What this change implements (Goal 1 cutover, live)

Backend (`promptwear-api`):

- `src/lib/auth.ts` — Better Auth instance (email+password, Google, account-linking fix, admin + organization plugins, email callbacks, Prisma adapter).
- `src/lib/prisma.ts` — standalone client for Better Auth (unify with `PrismaService` later).
- `src/lib/email.ts` — Resend sender with dev log-fallback; wired as `sendResetPassword` / `sendVerificationEmail` / `sendInvitationEmail`.
- `src/modules/auth/` — reduced to the Better Auth catch-all controller; legacy services + DTOs deleted.
- `src/common/guards/better-auth.guard.ts` + `origin.guard.ts` — replace `jwt-auth.guard` + `csrf.guard` (deleted).
- `src/main.ts` — `bodyParser: false` + selective JSON, Swagger cookie `promptwear.session_token`.
- `prisma/` — migration `20260928155910_better_auth_core` (additive).
- `test/` — `helpers.ts` shared setup, all suites on Better Auth, jest ESM transform config.

Frontend (`promptwear`):

- `src/lib/api/auth-client.ts` — `createAuthClient` with `organizationClient` + `adminClient`.
- `src/providers/AuthProvider.tsx` — on `useSession`/`signIn`/`signUp`/`signOut`; `src/lib/api/auth.ts` deleted; `client.ts` CSRF/refresh removed.
- `AuthPage` (Google + working Forgot?), `AdminLoginPage` (client-side admin gate), new `/reset-password` route.
- Team (`Phase 5`, live): `/dashboard/team` (workspaces list/create/switch, members + remove, invite-by-email + cancel, pending invites), `/accept-invitation/[id]` (login-gated accept/decline), nav item; every signup auto-gets a personal workspace.

## 13. Open decisions (need your call)

1. Role strings: keep `customer/admin` (recommended, scaffolded) vs adopt Better Auth `user/admin` defaults.
2. Argon2 → scrypt: force password-reset on cutover (recommended; §9 sender ready) vs dual-verify shim (more code, smoother UX).
3. ~~Email provider~~ → **Resolved: Resend** (dev log-fallback until key + verified domain).
4. Personal orgs: ~~lazy-create~~ → **create-at-signup** (chosen: zero-setup invite UX; `databaseHooks.user.create.after`, never breaks signup).
5. `@thallesp/nestjs-better-auth` vs raw `toNodeHandler` mount — scaffold uses raw (fewer deps).
6. Gate login on email verification (`requireEmailVerification`) — deferred to Phase 5.
7. `emailOTP` plugin for code-based flows — deferred; link-based covers reset/verify/invites.
