# Phase 1 — Auth + users

## Goals

Implement secure session-based authentication with HTTP-only cookies, Argon2id password hashing, CSRF protection, Google OAuth, and user profile endpoints. Wire Redis and Terminus health checks.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P1-auth** | Implementer | `AuthModule`: register, login, logout, refresh, session, forgot/reset password, Google OAuth; `PasswordService` (Argon2id); cookie issuance; CSRF endpoint |
| **P1-users** | Implementer | `UsersModule`: GET/PATCH `/users/me`; role not mass-assignable |
| **P1-redis-health** | Implementer | `RedisModule`, `HealthModule` with Terminus (DB + Redis on `/ready`) |

## Exit criteria

- Register/login sets `access_token` + `refresh_token` HttpOnly cookies; body returns user only
- Refresh rotates refresh token; logout clears cookies and denylists `jti` in Redis
- CSRF required on all mutating non-public routes
- E2e: full auth flow green against Docker Compose
- Zero `bcrypt` in codebase or password-hashing paths
- Security audit: zero open Critical/High

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers → Breaker → Fixer → IntegrationTester → Security → SecurityFixer (if needed) → Verifier → Committer

## Per-phase gate

See [`QA_CHECKLIST.md`](../QA_CHECKLIST.md) § Phase 1.
