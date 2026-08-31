# Phase 0 — Scaffold + common layer

## Goals

Establish the backend foundation: local infrastructure via Docker Compose, NestJS project in `backend/`, Prisma schema aligned with frontend types, shared error/auth/config layer, and QA/security documentation so later phases can run the sub-agent pipeline.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P0-docker** | Implementer | Root `docker-compose.yml` (Postgres 16, Redis 7, MinIO), `scripts/init-minio.sh`, root `package.json` scripts (`docker:up`, `docker:down`, `docker:reset`, `dev:api`, `dev:web`) |
| **P0-nest-scaffold** | Implementer | NestJS CLI scaffold in `backend/`: `main.ts`, `app.module.ts`, global prefix `api/v1`, CORS with credentials, Swagger at `/api/docs` |
| **P0-common-layer** | Implementer | `common/`: `AppException`, `AllExceptionsFilter`, `ValidationPipe`, `JwtAuthGuard` (cookie stub), `CsrfGuard` stub, `@Public()`, config Zod schema |
| **P0-prisma-schema** | Implementer | `prisma/schema.prisma` (all models), `prisma/seed.ts` stub, initial migration |
| **P0-cursor-rules** | Implementer | `.cursor/rules/no-cursor-commits.mdc`, `QA_CHECKLIST.md`, `SECURITY_AUDIT_PROMPT.md`, `PHASE-0.md` … `PHASE-7.md`, `backend/.env.example` |

## Exit criteria

- `docker compose up -d` starts Postgres, Redis, MinIO with healthchecks
- `cd backend && npm run build` succeeds
- `GET /api/v1/health` and `/ready` respond (ready may be stub until Terminus wired in Phase 1)
- Prisma schema matches frontend type contracts in `client/src/lib/dashboard/types.ts` and `client/src/lib/admin/types.ts`
- Global error shape `{ error: { code, message, details } }` wired
- QA checklist Phase 0 rows updated by Verifier

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers (P0-*) → Breaker → Fixer → IntegrationTester → Security → Verifier → Committer

## Per-phase gate

- [ ] Coordinator launched workstreams
- [ ] SpecChecker PASS
- [ ] Implementer(s) finished
- [ ] Breaker pass (or failures filed then fixed)
- [ ] Fixer loop complete if needed
- [ ] IntegrationTester e2e PASS
- [ ] **Security PASS** — `backend/docs/security/phase-0-audit.md`
- [ ] **Verifier PASS**
- [ ] Committer (no Cursor branding)
