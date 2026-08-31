# Phase 1 Security Audit

**Date:** 2026-08-30  
**Status:** PASS (Critical/High remediated)

## 1. Vulnerability Summary

| Severity | Found | Open | Fixed |
| -------- | ----- | ---- | ----- |
| Critical | 0 | 0 | 0 |
| High | 1 | 0 | 1 |
| Medium | 4 | 3 | 1 |
| Low | 0 | 0 | 0 |

## 2. Detailed Findings

### SEV-001 — Auth brute-force rate limiting (High) — FIXED

- **Component:** `app.module.ts`, `auth.controller.ts`
- **Fix:** Named `auth` throttler (5 req/min/IP) on `POST /auth/login`, `register`, `refresh`

### SEV-002 — Login CSRF on public auth mutations (Medium) — OPEN

- **Component:** `csrf.guard.ts` skips `@Public()` routes
- **Risk:** Login CSRF can bind victim to attacker account
- **Deferred:** Require client `X-Requested-With` header in Phase 1.1 or apply CSRF to login after `/auth/csrf` fetch

### SEV-003 — Access token valid after logout (Medium) — OPEN

- **Component:** `auth.service.ts`, `jwt-auth.guard.ts`
- **Mitigation:** 15m access TTL; full fix: access-token denylist in Redis (Phase 1.1)

### SEV-004 — Email enumeration on register (Medium) — FIXED

- **Fix:** Generic conflict message: "Unable to create account with these credentials"

### SEV-005 — Root `.gitignore` removed (Medium) — FIXED

- **Fix:** Restored repo-root `.gitignore` with `.env*` ignore rules

## 3. Attack Chains

1. ~~Enumeration → brute force~~ — mitigated by SEV-001 + SEV-004 fixes
2. Login CSRF → PII harvest — remains Medium; deferred

## 4. Controls Verified

- Argon2id password hashing; zero `bcrypt` in `backend/src`
- HttpOnly cookies for `access_token` / `refresh_token`
- Refresh token `SameSite=Strict`, path `/api/v1/auth`
- Refresh rotation + Redis denylist on logout/refresh
- CSRF double-submit on protected mutations
- CORS single origin + `credentials: true`
- `UpdateUserDto` excludes `role`
- `/users/me` scoped to JWT `sub`

## 5. Verifier Gate

- [x] Zero Critical/High open
- [x] bcrypt grep clean
- [x] Auth throttle 5/min on login/register/refresh
