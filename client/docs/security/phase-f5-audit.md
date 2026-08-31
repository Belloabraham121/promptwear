# Phase F5 Security Audit — Admin

Date: 2026-08-31  
Auditor: Security sub-agent  
Scope: AdminProvider, AdminGate, admin layout/pages, admin API client, DashboardProvider role surfacing

**Files reviewed**

- `client/src/components/admin/AdminProvider.tsx`
- `client/src/components/admin/AdminGate.tsx`
- `client/src/components/admin/AdminShell.tsx`
- `client/src/app/dashboard/admin/**`
- `client/src/lib/api/admin.ts`, `query-keys.ts`
- `client/src/components/dashboard/DashboardProvider.tsx`
- `client/src/providers/AuthProvider.tsx`

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 3 | 0 | 3 | 0 |
| Medium | 2 | 1 | 1 | 0 |
| Low | 1 | 1 | 0 | 0 |

**Overall:** PASS (Critical/High remediated)

## 2. Detailed Findings

### SEV-F501 — AdminProvider prefetches admin data before role gate (High) — FIXED

- **Severity:** High
- **Component:** `app/dashboard/admin/layout.tsx`, `AdminProvider.tsx`
- **Description:** Layout mounted `AdminProvider` outside `AdminGate`, so catalog/vendors/profit/orders queries fired for every authenticated user visiting `/dashboard/admin/*`. Non-admins received 403 from API, but React Query could retain cached admin payloads from a prior admin session for up to `gcTime` (5 min).
- **Exploitation:** Admin logs out (or session expires) on a shared browser → customer logs in → navigates to `/dashboard/admin` → UI shows denial message but devtools or a race could surface stale cached vendor costs, order PII, or profit margins.
- **Impact:** Confidentiality — cross-user admin data leak via client cache
- **Fix:** Reordered layout to `AdminGate → AdminProvider`; added `enabled: session?.role === 'admin'` on all admin queries in `AdminProvider`.
- **Status:** fixed

### SEV-F502 — React Query cache not cleared on login/account switch (High) — FIXED

- **Severity:** High
- **Component:** `AuthProvider.tsx`, `QueryProvider.tsx`
- **Description:** `queryClient.clear()` ran only on logout. Login/register called `setQueryData` for session but left prior user's designs, orders, and admin queries in cache. Query keys are not scoped by user id.
- **Exploitation:** User A (admin) logs out → User B logs in on same browser → dashboard briefly or persistently shows User A's designs/orders/admin analytics until refetch or gc expiry.
- **Impact:** Confidentiality — cross-account data exposure
- **Fix:** Added `resetQueryCacheForUser()` (`lib/query/session-cache.ts`) on login/register success; `useEffect` clears cache when `session.id` changes; logout also clears IndexedDB via `clearLocalUserData()`.
- **Status:** fixed

### SEV-F503 — Client-side admin role override via DashboardProvider.setUser (High) — FIXED

- **Severity:** High
- **Component:** `DashboardProvider.tsx`, `DashboardShell.tsx`, `account/page.tsx`, `orders/[id]/page.tsx`
- **Description:** `setUser` stored `role` in `userOverride`, merging into `toDashboardUser()`. Any future caller could set `role: 'admin'` in client state, revealing admin nav links and order-advance controls. Backend still enforces roles, but UI exposed privileged actions.
- **Exploitation:** Malicious or buggy client code calls `setUser({ …, role: 'admin' })` → admin link and fulfillment buttons render for a customer.
- **Impact:** Integrity — UI privilege escalation; confused deputy if combined with cached admin data (SEV-F501/F502)
- **Fix:** Removed `role` from `userOverride`; role always derived from `session.role`. Admin UI checks now use `useAuth().session?.role`.
- **Status:** fixed

### SEV-F504 — AdminGate denial-only, no redirect (Medium) — OPEN

- **Severity:** Medium
- **Component:** `AdminGate.tsx`
- **Description:** Non-admin users see a static denial page but remain on `/dashboard/admin/*` URLs. No `router.replace` to dashboard home.
- **Exploitation:** Low risk after cache fixes; primarily UX and bookmark confusion.
- **Impact:** Confidentiality — negligible post-fix
- **Fix:** Optional `router.replace('/dashboard')` for non-admins
- **Status:** open (deferred: UX polish)

### SEV-F505 — Admin mutations lack optimistic UI rollback on 403 (Medium) — VERIFIED OK

- **Severity:** N/A (control verified)
- **Component:** Admin API client, backend `RolesGuard`
- **Description:** All admin mutations go through API; backend returns 403 for non-admin JWT. Client invalidates queries on success only.
- **Status:** fixed (no defect — server is source of truth)

### SEV-F506 — Admin order list exposes customer PII in DOM (Low) — OPEN

- **Severity:** Low
- **Component:** `admin/orders/page.tsx`
- **Description:** Admin orders table renders design titles and totals as intended for admins. Screen-recording or shoulder-surfing on admin workstation is out of scope for client-only mitigation.
- **Impact:** Confidentiality — operational, admin-only
- **Fix:** None required for MVP; consider field-level redaction in future
- **Status:** open (accepted)

## 3. Attack Chains

Attempted adversarial paths:

1. **Customer → admin catalog via UI** — Navigate to `/dashboard/admin/products` → `AdminGate` blocks render; `AdminProvider` queries disabled → no network fetch; stale cache cleared on login (SEV-F502).
2. **Customer → admin API** — Direct `fetch('/admin/catalog')` without admin JWT → backend 403 (verified backend Phase 5 audit).
3. **Client role spoof** — `setUser({ role: 'admin' })` no longer affects UI; session cookie is HttpOnly.
4. **Shared-browser admin → customer** — Logout clears React Query + IndexedDB; login as customer gets empty cache.

## 4. Controls Verified

- `AdminGate` checks `session?.role === 'admin'` from server session, not client override
- Admin queries gated with `enabled: isAdmin`
- Login/logout/account-switch cache isolation
- Admin nav link gated on `session.role`
- Backend `@Roles('admin')` on all `/admin/*` routes (cross-ref backend phase-5-audit)

## 5. Secure Design Recommendations

- Scope React Query keys with `session.id` prefix for defense-in-depth
- Redirect non-admins away from `/dashboard/admin/*`
- Consider Content Security Policy headers on admin routes
- Audit log admin mutations client-side (telemetry only; server audit is authoritative)
