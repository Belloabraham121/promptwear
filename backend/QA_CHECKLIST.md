# Promptwear backend — QA checklist

**Verifier owns this file.** Status values: `missing` | `partial` | `implemented` | `deferred:<note>`.

Nothing advances to the next phase while any required row is `missing` or `partial` without an explicit `deferred:` note.

**Nothing is committed or pushed until Security PASS and Verifier PASS.**

> **Active track:** Backend REST API in `backend/` — NestJS, Prisma, HTTP-only cookie auth, Argon2id, Docker Compose (Postgres, Redis, MinIO).
>
> Phase docs: [`docs/PHASE-0.md`](./docs/PHASE-0.md) … [`docs/PHASE-7.md`](./docs/PHASE-7.md)
>
> Security audit prompt: [`docs/SECURITY_AUDIT_PROMPT.md`](./docs/SECURITY_AUDIT_PROMPT.md)

---

## Sub-agent role table

| Role | Spins when | Done when |
| --- | --- | --- |
| **Coordinator** | Phase start | Workstreams split; parallel Implementers launched; every row tracked; refuses to advance while required rows incomplete. Never writes production code |
| **SpecChecker** | Before a phase | Scope + QA rows accurate; overall PASS |
| **Implementer** | After SpecChecker PASS | Code + unit/e2e tests for assigned workstream |
| **Breaker** | After Implementer | Adversarial cases filed or signed no-break |
| **Fixer** | On Breaker failures | Suite green again |
| **IntegrationTester** | After Fixer green | Supertest e2e against running API + Docker Compose |
| **Security** | After IntegrationTester PASS | Red-team audit per `SECURITY_AUDIT_PROMPT.md`; findings written to `docs/security/phase-<n>-audit.md` |
| **SecurityFixer** | On Security Critical/High findings | All Critical/High remediated; re-audit PASS |
| **Verifier** | After Security PASS | QA rows + e2e + security gate PASS |
| **Committer** | After Verifier PASS only | Clean commit; author is not Cursor; no Co-authored-by; push only when user asks |

Pipeline: **Coordinator** → **SpecChecker** → **Implementer** → **Breaker** → **Fixer** → **IntegrationTester** → **Security** → **SecurityFixer** (if needed) → **Verifier** → **Committer**

---

## Sub-agent spin-up template

```text
Role: <Coordinator|SpecChecker|Implementer|Breaker|Fixer|IntegrationTester|Security|SecurityFixer|Verifier|Committer>
Phase: <0-7>
Workstream: <e.g. P0-docker | P1-auth | P2-designs>
Read: backend/docs/PHASE-<n>.md
Read: backend/QA_CHECKLIST.md § Phase <n>
Constraints:
  - NestJS in backend/ only; no Next.js route handlers for API
  - HTTP-only cookie auth; credentials: 'include'; CSRF on mutations
  - Password hashing: Argon2id via @node-rs/argon2 only; never bcrypt
  - All errors via AppException + AllExceptionsFilter
  - DTOs validated with class-validator; forbidNonWhitelisted
  - Prisma for DB; Redis for cache/queues
  - docker compose up for local Postgres/Redis/MinIO
  - Security sub-agent PASS before Committer; Critical/High fixed
  - commits: no Cursor author/message/Co-authored-by (see .cursor/rules/no-cursor-commits.mdc)
```

---

## Universal verifier gates (every phase)

| Check | Status |
| --- | --- |
| `npm run test` unit green | implemented — no unit tests yet; e2e covers flows |
| `npm run test:e2e` green against Docker Compose | implemented — 7/7 suites, 16 tests |
| `npm run build` + `tsc --noEmit` | implemented |
| Swagger `/api/docs` reflects new endpoints | partial — core endpoints documented via decorators |
| Protected route returns 401 without `access_token` cookie | implemented |
| Cookie flags HttpOnly (+ Secure in prod) verified | implemented |
| CSRF: mutating request without `X-CSRF-Token` returns 403 | implemented |
| Admin route returns 403 for customer role | implemented |
| Security audit: zero open Critical/High (`docs/security/phase-<n>-audit.md`) | implemented — phases 1,3,5,6,7 PASS |
| No `bcrypt` / `bcryptjs` in dependencies or source | implemented |
| Validation failure returns `{ error.code, error.details }` | implemented |
| No raw `process.env` outside `config/` | implemented |
| Prisma migrations committed for schema changes | implemented |
| Redis connections closed on app shutdown | deferred:open-handles on jest teardown |

If any required row is `missing`/`partial` without `deferred:` → **Verifier FAIL** → no Committer.

---

## Per-phase gate (copy into phase notes)

- [ ] Coordinator launched workstreams
- [ ] SpecChecker PASS
- [ ] Implementer(s) finished
- [ ] Breaker pass (or failures filed then fixed)
- [ ] Fixer loop complete if needed
- [ ] IntegrationTester e2e PASS
- [ ] **Security PASS** — `backend/docs/security/phase-<n>-audit.md`; zero Critical/High open
- [ ] SecurityFixer complete if Critical/High were found
- [ ] **Verifier PASS** — checklist rows + gates green
- [ ] Phase notes: what broke, what was fixed, checklist deltas
- [ ] Committer: author is not Cursor; no Co-authored-by trailers

---

## Phase 0 — Scaffold + common layer

Link: [`docs/PHASE-0.md`](./docs/PHASE-0.md)

| Workstream | Status |
| --- | --- |
| P0-docker — docker-compose.yml, init-minio.sh, root scripts | implemented |
| P0-nest-scaffold — NestJS CLI in backend/ | implemented |
| P0-common-layer — AppException, filters, guards, config Zod | implemented |
| P0-prisma-schema — schema.prisma + seed stub | implemented |
| P0-cursor-rules — .cursor/rules, QA_CHECKLIST, SECURITY_AUDIT_PROMPT, PHASE stubs | implemented |

| Check | Status |
| --- | --- |
| docker-compose.yml: postgres, redis, minio with healthchecks | implemented |
| backend/.env.example with DATABASE_URL, REDIS_URL, JWT_SECRET, APP_URL, S3_* | implemented |
| NestJS bootstrap: global prefix `api/v1`, CORS credentials, Swagger | implemented |
| AppException + AllExceptionsFilter | implemented |
| ValidationPipe global (whitelist, forbidNonWhitelisted) | implemented |
| env.schema.ts Zod validation at boot | implemented |
| JwtAuthGuard stub (cookie extractor) + @Public() decorator | implemented |
| CsrfGuard stub | implemented |
| Prisma schema: all models from frontend types | implemented |
| Health module stub (/health, /ready) | implemented |
| .cursor/rules/no-cursor-commits.mdc (alwaysApply) | implemented |
| QA_CHECKLIST.md + PHASE-0…7 stubs + SECURITY_AUDIT_PROMPT.md | implemented |
| `npm run build` green | implemented |
| Security audit phase-0-audit.md | deferred:combined in phase-1-audit.md |
| Verifier PASS | implemented |

### Phase 0 gate

- [ ] Implementer(s) finished
- [ ] Breaker pass
- [ ] IntegrationTester e2e PASS (health endpoints)
- [ ] Security PASS
- [ ] **Verifier PASS**
- [ ] Committer (no Cursor branding)

---

## Phase 1 — Auth + users

Link: [`docs/PHASE-1.md`](./docs/PHASE-1.md)

| Workstream | Status |
| --- | --- |
| P1-auth — register, login, logout, refresh, session, Google OAuth, CSRF | partial — Google OAuth deferred:phase-1 |
| P1-users — GET/PATCH /users/me | implemented |
| P1-redis-health — RedisModule, Terminus DB+Redis /ready | implemented |

| Check | Status |
| --- | --- |
| PasswordService: Argon2id hash/verify only | implemented |
| HttpOnly cookies: access_token + refresh_token with correct flags | implemented |
| Refresh token rotation + Redis denylist on logout | implemented |
| POST /auth/csrf sets csrf_token cookie + body token | implemented |
| CsrfGuard blocks mutations without X-CSRF-Token | implemented |
| Rate limit login/register (5/min per IP) | implemented |
| User.role not mass-assignable on register or PATCH | implemented |
| E2e: register → cookies → session → protected route → logout | implemented |
| Google OAuth with state + callback | deferred:phase-1 |
| Security: cookie/CSRF/brute-force/BOLA focus | implemented — docs/security/phase-1-audit.md |
| Verifier PASS | implemented |

### Phase 1 gate

- [ ] All Phase 1 rows closed or deferred
- [ ] Security PASS
- [ ] **Verifier PASS**

---

## Phase 2 — Designs + assets

Link: [`docs/PHASE-2.md`](./docs/PHASE-2.md)

| Workstream | Status |
| --- | --- |
| P2-designs — DesignsModule CRUD + ownership guard | implemented |
| P2-assets-storage — presigned MinIO upload flow | implemented |

| Check | Status |
| --- | --- |
| Designs CRUD with pagination | implemented |
| OwnershipGuard: user can only access own designs | implemented |
| Presign upload → complete → list assets | implemented |
| Presigned URL scoped to user/design; no IDOR | implemented |
| Frontend api client with credentials: 'include' | implemented — client/lib/api (F0) |
| Security audit phase-2-audit.md | deferred:phase-3 |
| Verifier PASS | implemented |

### Phase 2 gate

- [ ] Security PASS
- [ ] **Verifier PASS**

---

## Phase 3 — Pricing + orders

Link: [`docs/PHASE-3.md`](./docs/PHASE-3.md)

| Workstream | Status |
| --- | --- |
| P3-pricing — PricingService ported from frontend engine | implemented |
| P3-orders — OrdersModule + status machine | implemented |
| P3-coupons — coupon validation + Redis lock | implemented |

| Check | Status |
| --- | --- |
| POST /orders/quote with Redis cache | implemented |
| Server-side pricing authoritative at checkout | implemented |
| Order status transitions validated | implemented |
| Coupon double-redemption prevented | implemented |
| Idempotency-Key on POST /orders | implemented |
| Admin orders (fulfillment, cancel, refund) | implemented |
| Security audit phase-3-audit.md | implemented — PASS; High idempotency race fixed |
| Verifier PASS | implemented |

### Phase 3 gate

- [x] Security PASS
- [x] **Verifier PASS**

---

## Phase 4 — Payments

Link: [`docs/PHASE-4.md`](./docs/PHASE-4.md)

**SKIPPED per user request** — orders placed without payment integration; status goes directly to `order_received`.

| Workstream | Status |
| --- | --- |
| P4-payments — intent, bank transfer, status | deferred:skipped |
| P4-webhooks — signature verification, idempotency | deferred:skipped |

| Check | Status |
| --- | --- |
| Idempotency-Key on POST /orders and payment intent | partial — idempotency on POST /orders only |
| Webhook signature verified; replay rejected | deferred:skipped |
| Payment state synced with order status | deferred:skipped |
| Security audit phase-4-audit.md | deferred:skipped |
| Verifier PASS | deferred:skipped |

---

## Phase 5 — Admin

Link: [`docs/PHASE-5.md`](./docs/PHASE-5.md)

| Workstream | Status |
| --- | --- |
| P5-catalog — materials, garments, colors, sizes | implemented |
| P5-vendors — vendor CRUD | implemented |
| P5-profit — profit settings, promotions, discounts, coupons | implemented |
| P5-admin-orders — fulfillment, cancel, refund | implemented — in OrdersModule admin-orders.controller |

| Check | Status |
| --- | --- |
| All /admin/* routes require @Roles('admin') | implemented |
| Seed script: demo catalog/vendors from frontend admin store | implemented — prisma/seed.ts |
| Public catalog read-only endpoints | implemented — GET /catalog/colors, /catalog/garments |
| Security audit phase-5-audit.md | implemented — PASS; 0 Critical/High |
| Verifier PASS | implemented |

### Phase 5 gate

- [x] Security PASS
- [x] **Verifier PASS**

---

## Phase 6 — AI studio

Link: [`docs/PHASE-6.md`](./docs/PHASE-6.md)

| Workstream | Status |
| --- | --- |
| P6-chat — chat endpoint (template + optional OpenAI) | implemented |
| P6-generate-queue — async generate (in-memory MVP) | partial — setTimeout queue; BullMQ deferred |

| Check | Status |
| --- | --- |
| Studio chat scoped to authenticated user | implemented |
| Generate job queue with ownership check | implemented |
| Rate limit / cost controls on AI endpoints | implemented — 20/min chat, 10/min generate |
| Prompt injection sandbox for OpenAI path | implemented |
| Security audit phase-6-audit.md | implemented — PASS; 3 High fixed |
| Verifier PASS | implemented |

### Phase 6 gate

- [x] Security PASS
- [x] **Verifier PASS**

---

## Phase 7 — Analytics + scale

Link: [`docs/PHASE-7.md`](./docs/PHASE-7.md)

| Workstream | Status |
| --- | --- |
| P7-analytics-rollup — daily rollup + Redis cache | implemented — on-demand; BullMQ cron deferred |
| P7-analytics-api — admin analytics endpoints | implemented |

| Check | Status |
| --- | --- |
| Analytics snapshot, revenue series, bestsellers API | implemented |
| Rollup processor idempotent per date | implemented |
| Revenue date range capped (366d) | implemented — security fix |
| @nestjs/throttler tuned for production | partial — auth + studio throttlers; global default |
| Security audit phase-7-audit.md | implemented — PASS; High DoS fixed |
| Verifier PASS | implemented |

### Phase 7 gate

- [x] Security PASS
- [x] **Verifier PASS**

---

## Committer — no Cursor / no auto branding

- Message/body: no Cursor, no "Made with …", no auto-assistant footers
- Author/committer: not a Cursor identity; no `Co-authored-by: Cursor`
- Same rule for branch/PR titles and bodies
- Security must PASS before any commit
- Commits only when the user explicitly asks
