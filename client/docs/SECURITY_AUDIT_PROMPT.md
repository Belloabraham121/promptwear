# Security Audit Prompt — Promptwear Frontend

Use when launching the **Security** sub-agent after IntegrationTester PASS for each frontend phase (F0–F7).

## Role spin-up

```text
Role: Security
Phase: <F0-F7>
Workstream: security-audit
Read: client/docs/SECURITY_AUDIT_PROMPT.md
Read: client/QA_CHECKLIST.md § Phase F<n>
Scope: client/src/lib/api/, providers, and pages changed in this phase
Output: client/docs/security/phase-f<n>-audit.md
```

## Focus areas

### Auth & session (F0, F1)
- No JWT or refresh tokens in localStorage/sessionStorage
- All requests use `credentials: 'include'`
- CSRF token in memory only; attached to mutations
- Logout and account switch clear TanStack Query cache + IDB drafts
- 401 triggers refresh once, then purge + redirect `/login`

### Authorization (F1, F5, F7)
- Admin UI gated by `session.role === 'admin'` from API (not client override)
- Admin queries `enabled: isAdmin` only after AdminGate
- Customer cannot prefetch admin analytics/catalog mutations

### Data integrity (F2, F3)
- Checkout never sends client-computed totals
- Idempotency-Key on place order
- Designs/orders scoped to authenticated user via API ownership

### Offline drafts (F2, F6)
- Drafts keyed by `designId` + `ownerId`
- Drafts purged on logout
- Restore prompt when local draft newer than server

### Cache (all phases)
- `queryClient.clear()` on logout
- `resetQueryCacheForUser()` on login/register when user id changes
- No cross-user data visible after account switch

## Verdict

PASS only when zero open Critical/High findings.
