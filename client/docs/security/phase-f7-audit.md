# Phase F7 Security Audit — Analytics + Polish

Date: 2026-08-31  
Auditor: Security sub-agent  
Scope: Admin analytics pages, analytics API client, DashboardProvider, account page, cross-user cache hygiene

**Files reviewed**

- `client/src/app/dashboard/admin/analytics/page.tsx`
- `client/src/app/dashboard/admin/page.tsx` (overview analytics cards)
- `client/src/lib/api/analytics.ts`
- `client/src/lib/api/query-keys.ts`
- `client/src/providers/AuthProvider.tsx`
- `client/src/lib/query/session-cache.ts`
- `client/src/app/dashboard/account/page.tsx`
- Backend cross-ref: `backend/docs/security/phase-5-audit.md` (analytics endpoints)

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 2 | 0 | 2 | 0 |
| Medium | 2 | 1 | 1 | 0 |
| Low | 1 | 1 | 0 | 0 |

**Overall:** PASS (Critical/High remediated)

## 2. Detailed Findings

### SEV-F701 — Analytics queries fetch without admin role guard (High) — FIXED

- **Severity:** High
- **Component:** `admin/analytics/page.tsx`, `admin/page.tsx`
- **Description:** `useQuery({ queryFn: getAnalyticsSnapshot })` ran unconditionally when component mounted. Non-admin users blocked by `AdminGate` could still trigger fetches if layout order allowed mount, and cached analytics (revenue, vendor performance, bestsellers) persisted in React Query.
- **Exploitation:** Customer navigates to analytics URL → network 403 but cache from prior admin session may render revenue/vendor tables until gc expiry.
- **Impact:** Confidentiality — business metrics exposure
- **Fix:** Added `enabled: session?.role === 'admin'` on analytics queries in overview and analytics pages.
- **Status:** fixed

### SEV-F702 — Stale admin analytics after session downgrade (High) — FIXED

- **Severity:** High
- **Component:** `AuthProvider.tsx`, `session-cache.ts`
- **Description:** Admin logs out or non-admin logs in; `queryKeys.admin.analytics` data remained in QueryClient. Customer session could read platform revenue and vendor metrics from memory via React DevTools or UI components that read cache before refetch error.
- **Exploitation:** Admin session → view analytics → logout → login as customer → revisit any page that shared query key or inspect QueryClient cache within 5 min gc window.
- **Impact:** Confidentiality — cross-session business intelligence leak
- **Fix:** `resetQueryCacheForUser()` on login/register; `queryClient.clear()` on logout; user-id change detection purges all cached queries including admin analytics.
- **Status:** fixed

### SEV-F703 — Account page showed role from overridable DashboardProvider state (Medium) — FIXED

- **Severity:** Medium
- **Component:** `account/page.tsx`
- **Description:** Account snapshot displayed `user.role` from `DashboardProvider`, which previously allowed client override (see SEV-F503).
- **Exploitation:** Spoofed admin role label and admin CTA link for non-admin.
- **Impact:** Integrity — misleading privilege display
- **Fix:** Role display and admin link now use `session?.role` from `useAuth()`.
- **Status:** fixed

### SEV-F704 — Analytics query keys not user-scoped (Medium) — OPEN

- **Severity:** Medium
- **Component:** `query-keys.ts`
- **Description:** Admin analytics keys are global strings `['admin', 'analytics']`. Mitigated by full cache clear on auth transitions, but a future refactor could reintroduce cross-user bleed if clear is skipped.
- **Impact:** Confidentiality — defense-in-depth gap
- **Fix:** Prefix keys with `session.id` or use `queryClient.removeQueries({ queryKey: ['admin'] })` explicitly on logout
- **Status:** open (deferred: mitigated by SEV-F702 fix)

### SEV-F705 — Revenue series / bestsellers endpoints wired but not yet in UI (Low) — OPEN

- **Severity:** Low
- **Component:** `lib/api/analytics.ts`
- **Description:** Client exports `getRevenueSeries` and `getBestsellers` without dedicated pages yet. No exposure until UI mounts queries; when added, must reuse admin `enabled` guard.
- **Impact:** None today
- **Fix:** Apply same `enabled: isAdmin` pattern when charts land
- **Status:** open (informational)

## 3. Attack Chains

1. **Admin analytics → customer handoff** — Admin views `/dashboard/admin/analytics` → logout → customer login → pre-fix: cached `AnalyticsSnapshot` in QueryClient; post-fix: cache cleared, queries disabled for non-admin.
2. **Direct API scrape** — Customer JWT on `GET /admin/analytics` → backend 403 (RolesGuard).
3. **Account page admin link** — Customer with spoofed `user.role` (pre-fix) saw admin link; clicking still hit `AdminGate` denial; post-fix: link hidden unless `session.role === 'admin'`.

## 4. Controls Verified

- Analytics API routes admin-only on backend
- Client analytics queries gated on admin session
- Auth transition clears all React Query caches
- Account admin affordances tied to server session role
- `DashboardProvider` designs/orders queries require `session != null`

## 5. Secure Design Recommendations

- Set `staleTime: 5 * 60_000` on analytics queries per F7 spec once charts ship; pair with manual refresh that respects admin gate
- Add `queryClient.removeQueries({ queryKey: ['admin'] })` on logout for explicit admin namespace purge
- Never embed aggregate revenue in public pages or error messages
- Consider separate QueryClient instance for admin subtree (hard isolation)
