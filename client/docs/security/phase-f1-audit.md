# Phase F0 + F1 Security Audit

Date: 2026-08-31  
Auditor: Security sub-agent  
Scope: `client/src/lib/api/` (client, csrf, auth, errors, types, query-keys), `client/src/providers/` (AuthProvider, QueryProvider), `AuthPage`, `DashboardAuthGate`, `AdminGate`, `client/src/lib/query/session-cache.ts`, `client/src/lib/db/purge.ts`

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 2 | 0 | 2 | 0 |
| Medium | 3 | 2 | 1 | 0 |
| Low | 2 | 2 | 0 | 0 |

**Overall:** PASS

## 2. Detailed Findings

### [SEV-F1-001] Cross-account React Query cache leak on login without logout

- **Severity:** High
- **Component:** `AuthProvider`, login/register mutations
- **Description:** Logging in as a different user without calling logout first left the prior user's designs/orders in the TanStack Query cache. The UI could briefly (or until refetch) show another account's data on a shared browser.
- **Exploitation:**
  1. User A signs in; designs and orders populate query cache.
  2. User A navigates to `/login` and signs in as User B without logging out.
  3. Session query updates to User B, but cached `designs` / `orders` keys still hold User A's records.
- **Impact:** Confidentiality — cross-account data exposure in the browser.
- **Fix:** `resetQueryCacheForUser()` clears all query data and re-seeds session on login/register; `useEffect` watches `session.id` changes and purges when the authenticated user switches.
- **Status:** fixed

### [SEV-F1-002] IndexedDB order/draft data persisted after logout

- **Severity:** High
- **Component:** `AuthProvider`, `lib/db/purge.ts`
- **Description:** Legacy IndexedDB stores (`orders`, `drafts`) could retain PII (checkout contact, addresses) after logout if not explicitly cleared. React Query cache alone does not wipe disk-backed IDB.
- **Exploitation:**
  1. User places orders (checkout PII written to IDB via legacy paths).
  2. User logs out; in-memory cache cleared but IDB remains.
  3. Next local session or forensic access reads stale order records from IDB.
- **Impact:** Confidentiality — local PII leak on shared devices.
- **Fix:** `clearLocalUserData()` clears `orders` and `drafts` stores on logout, login/register account switch, and auth failure.
- **Status:** fixed

### [SEV-F1-003] 401 auth failure left session cache populated until redirect

- **Severity:** Medium
- **Component:** `lib/api/client.ts`, `AuthProvider`
- **Description:** When refresh failed after 401, the client redirected to `/login` but did not invalidate query cache or IDB until full page reload completed. A blocked or slow redirect could flash stale authenticated data.
- **Exploitation:** Session expires while dashboard is open; API calls 401; UI still reads cached session/orders until navigation completes.
- **Impact:** Confidentiality — brief stale-data window on shared terminals.
- **Fix:** `notifyAuthFailure()` hook from the API client; `AuthProvider` registers a handler that clears CSRF token, query cache, and local IDB.
- **Status:** fixed

### [SEV-F1-004] AdminGate is client-side only

- **Severity:** Medium
- **Component:** `AdminGate`, `/dashboard/admin/*`
- **Description:** Non-admin users see a friendly block message but can still load admin route shells. Authorization must be enforced server-side on `/admin/*` (verified in backend Phase 3/5 audits).
- **Exploitation:** Customer navigates to `/dashboard/admin`; UI blocked, but direct API calls return 403 from backend `RolesGuard`.
- **Impact:** Low direct impact; defense relies on backend (confirmed PASS).
- **Fix:** No frontend-only escalation path; optional hard redirect to `/dashboard` deferred to UX polish.
- **Status:** open (accepted — backend is source of truth)

### [SEV-F1-005] Public auth routes skip CSRF (backend behavior)

- **Severity:** Medium
- **Component:** Backend `CsrfGuard` + `AuthPage`
- **Description:** `POST /auth/login` and `POST /auth/register` are `@Public()` and skip CSRF validation (mirrors backend SEV-002). Login CSRF could bind a victim session to an attacker-controlled account.
- **Exploitation:** Attacker tricks victim into submitting login form for attacker credentials.
- **Impact:** Integrity/confidentiality — session binding to wrong account.
- **Fix:** Deferred to backend Phase 1.1 (apply CSRF to auth mutations or require custom header).
- **Status:** open (backend deferred)

### [SEV-F1-006] AuthPage "Continue as guest" link

- **Severity:** Low
- **Component:** `AuthPage`
- **Description:** Header link targets `/dashboard`; `DashboardAuthGate` redirects unauthenticated users to `/login`. No guest bypass, but copy implies guest access exists.
- **Impact:** None (no auth bypass).
- **Status:** open

### [SEV-F1-007] CSRF token cached in memory (not localStorage)

- **Severity:** Low
- **Component:** `lib/api/csrf.ts`
- **Description:** CSRF token is cached in module scope for performance. Cleared on logout, auth failure, and login/register. Not persisted to `localStorage` / `sessionStorage`.
- **Impact:** None — acceptable pattern for double-submit CSRF.
- **Status:** open (informational)

## 3. Attack Chains

### Chain A — Cross-account cache leak (fixed)

1. User A uses dashboard on shared PC.
2. User A leaves; User B logs in via `/login` without logout.
3. ~~Cached orders/designs from User A render for User B.~~ **Blocked by SEV-F1-001 fix.**

### Chain B — Local PII after logout (fixed)

1. User completes checkout; legacy IDB path stores order + address.
2. User logs out.
3. ~~IDB retains checkout PII.~~ **Blocked by SEV-F1-002 fix.**

### Chain C — Admin UI bypass (not exploitable)

1. Customer sets `session.role` in DevTools.
2. `AdminGate` might be bypassed in React tree, but `/admin/*` API returns 403.
3. No privilege escalation — backend enforced.

## 4. Controls Verified

| Control | Status |
| --- | --- |
| No `access_token` / `refresh_token` in localStorage or sessionStorage | PASS |
| All API calls via `lib/api/client.ts` with `credentials: 'include'` | PASS |
| CSRF token fetched from `GET /auth/csrf`; attached to all mutations | PASS |
| 401 → refresh once → clear cache + redirect `/login` | PASS |
| Logout → `POST /auth/logout` + `queryClient.clear()` + IDB purge | PASS |
| Login/register → cache reset + CSRF clear + IDB purge | PASS |
| `DashboardAuthGate` redirects unauthenticated users | PASS |
| `AdminGate` checks `session.role === 'admin'` | PASS |
| `AuthPage` uses API login/register (no local fake auth) | PASS |
| Password never stored client-side | PASS |

## 5. Secure Design Recommendations

- Redirect non-admin users away from `/dashboard/admin` (not just message).
- Remove misleading "Continue as guest" link until guest mode exists.
- Apply backend CSRF or custom header on public auth mutations (backend track).
- Consider `Clear-Site-Data` response header on logout (backend).

## 6. Verifier Gate

- [x] Zero open Critical/High findings
- [x] Token storage grep clean (`localStorage` / `sessionStorage` — no auth tokens)
- [x] CSRF on client mutations
- [x] Cache + IDB purge on logout and account switch
