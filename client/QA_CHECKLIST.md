# Promptwear frontend — QA checklist

**Verifier owns this file.** Status values: `missing` | `partial` | `implemented` | `deferred:<note>`.

Nothing advances to the next phase while any required row is `missing` or `partial` without an explicit `deferred:` note.

**Nothing is committed or pushed until Security PASS and Verifier PASS.**

> **Active track:** Next.js client in `client/` — TanStack Query, HTTP-only cookie auth, CSRF on mutations, API-first server state, IDB drafts-only for studio offline.
>
> Security audit prompt: [`docs/SECURITY_AUDIT_PROMPT.md`](./docs/SECURITY_AUDIT_PROMPT.md)

---

## Sub-agent role table

| Role | Spins when | Done when |
| --- | --- | --- |
| **Coordinator** | Phase start | Workstreams split; parallel Implementers launched; every QA row tracked |
| **SpecChecker** | Before a phase | Scope + QA rows accurate; overall PASS |
| **Implementer** | After SpecChecker PASS | Code + hooks/mutations for assigned workstream |
| **Breaker** | After Implementer | Adversarial cases filed or signed no-break |
| **Fixer** | On Breaker failures | Build green + smoke flows pass again |
| **IntegrationTester** | After Fixer green | Full stack smoke (Docker + API + client) |
| **Security** | After IntegrationTester PASS | Audit → `docs/security/phase-f<n>-audit.md` |
| **SecurityFixer** | On Critical/High | Remediated; re-audit PASS |
| **Verifier** | After Security PASS | QA rows + gates green |
| **Committer** | After Verifier PASS only | No Cursor branding; push only when user asks |

Pipeline: **Coordinator** → **SpecChecker** → **Implementer** → **Breaker** → **Fixer** → **IntegrationTester** → **Security** → **SecurityFixer** → **Verifier** → **Committer**

---

## Universal verifier gates (every phase)

| Check | Status |
| --- | --- |
| `cd client && npm run build` green | implemented |
| `cd client && npm run lint` green | partial — pre-existing react-hooks warnings |
| Full stack: `docker:up` + seed + `dev:api` + `dev:web` | implemented — manual smoke |
| `NEXT_PUBLIC_API_URL` in `.env.example` | implemented |
| All API calls via `lib/api/client.ts` with `credentials: 'include'` | implemented |
| No auth tokens in localStorage/sessionStorage | implemented |
| CSRF on mutations via `X-CSRF-Token` | implemented |
| 401 → refresh → redirect `/login` + cache purge | implemented |
| Logout clears Query cache + IDB drafts | implemented |
| Admin blocked for customer role | implemented |
| TanStack Query invalidation after mutations | implemented |
| No writes to deprecated IDB stores (user, designs, assets, admin.state) | implemented |
| Studio draft IDB: offline save, restore prompt, sync clears draft | implemented |
| Server quote at checkout | implemented |
| UI copy: no IndexedDB/stub/fake auth labels | implemented |
| Security audits: zero open Critical/High | implemented — f1, f3, f5, f6, f7 PASS |
| Backend e2e green | implemented — 7/7 suites |
| No Cursor in commits | implemented |

---

## Phase F0 — API foundation

| Workstream | Status |
| --- | --- |
| F0-api-client | implemented |
| F0-query-provider | implemented |
| F0-env | implemented |

| Check | Status |
| --- | --- |
| api helpers unwrap `{ data }` | implemented |
| ApiError mapping | implemented |
| CSRF fetch + attach on mutations | implemented |
| 401 interceptor with refresh | implemented |
| QueryProvider defaults | implemented |
| Query devtools in dev | implemented |
| Security (combined in phase-f1-audit.md) | implemented |
| Verifier PASS | implemented |

---

## Phase F1 — Auth + session

| Workstream | Status |
| --- | --- |
| F1-auth | implemented |
| F1-route-guard | implemented |
| F1-profile | implemented |

| Check | Status |
| --- | --- |
| AuthPage → POST /auth/login, /auth/register | implemented |
| Session bootstrap GET /auth/session | implemented |
| Dashboard auth gate → /login | implemented |
| Logout POST /auth/logout + cache clear | implemented |
| AdminGate session.role === 'admin' | implemented |
| Account PATCH /users/me | implemented |
| putUser removed from auth | implemented |
| Security audit phase-f1-audit.md | implemented — PASS |
| Verifier PASS | implemented |

---

## Phase F2 — Designs + assets + offline drafts

| Workstream | Status |
| --- | --- |
| F2-designs | implemented |
| F2-assets | implemented |
| F2-draft-idb | implemented |

| Check | Status |
| --- | --- |
| Designs CRUD via API + Query | implemented |
| Presigned asset upload flow | implemented |
| IDB drafts store with ownerId | implemented |
| Studio restore prompt + sync | implemented |
| Deprecated IDB stores not written | implemented |
| Security (combined f1/f5/f6 audits) | implemented |
| Verifier PASS | implemented |

---

## Phase F3 — Orders + quotes + coupons

| Workstream | Status |
| --- | --- |
| F3-quotes | implemented |
| F3-coupons | implemented |
| F3-orders | implemented |

| Check | Status |
| --- | --- |
| POST /orders/quote at checkout | implemented |
| POST /coupons/validate | implemented |
| POST /orders with Idempotency-Key | implemented |
| Orders list/detail from API | implemented |
| No client price fields in create order | implemented |
| Security audit phase-f3-audit.md | implemented — PASS |
| Verifier PASS | implemented |

---

## Phase F4 — Payments

**SKIPPED** — matches backend.

| Workstream | Status |
| --- | --- |
| F4-payments | deferred:skipped |

---

## Phase F5 — Admin

| Workstream | Status |
| --- | --- |
| F5-admin-catalog | implemented |
| F5-vendors | implemented |
| F5-profit | implemented |
| F5-admin-orders | implemented |
| F5-public-catalog | implemented |

| Check | Status |
| --- | --- |
| AdminProvider API-backed | implemented |
| admin/persist.ts removed | implemented |
| AdminGate before AdminProvider | implemented |
| Admin queries enabled only for admin role | implemented |
| Security audit phase-f5-audit.md | implemented — PASS |
| Verifier PASS | implemented |

---

## Phase F6 — Studio AI

| Workstream | Status |
| --- | --- |
| F6-chat | implemented |
| F6-generate | implemented |

| Check | Status |
| --- | --- |
| Chat from API | implemented |
| Generate + poll job | implemented |
| Offline chat disabled | implemented |
| 429 user messaging | implemented |
| Security audit phase-f6-audit.md | implemented — PASS |
| Verifier PASS | implemented |

---

## Phase F7 — Analytics + polish

| Workstream | Status |
| --- | --- |
| F7-analytics-api | implemented |
| F7-cleanup | implemented |
| F7-playwright | deferred:playwright |

| Check | Status |
| --- | --- |
| Admin analytics from API | implemented |
| buildAnalytics stub removed | implemented |
| Logout in DashboardShell | implemented |
| Security audit phase-f7-audit.md | implemented — PASS |
| Verifier PASS | implemented |

---

## Committer — no Cursor / no auto branding

- No Cursor author/message/Co-authored-by
- Security PASS before commit
- Commits only when user explicitly asks
