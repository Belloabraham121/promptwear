# Phase 7 Security Audit

Date: 2026-08-30  
Auditor: Security sub-agent  
Scope: `backend/src/modules/admin/analytics/` (controller, service, rollup, DTO, utils), Redis daily rollup cache, `backend/test/analytics.e2e-spec.ts`

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 1 | 0 | 1 | 0 |
| Medium | 2 | 1 | 1 | 0 |
| Low | 1 | 0 | 0 | 1 |

**Overall:** PASS

## 2. Detailed Findings

### [SEV-001] Unbounded revenue date range enables resource exhaustion

- **Severity:** High
- **Component:** `AdminAnalyticsController.getRevenue`, `AnalyticsRollupService.rollupDateRange`, `eachDateKey`
- **Description:** `GET /admin/analytics/revenue?from=&to=` accepted any ISO date pair with no upper bound. `rollupDateRange` issued `Promise.all` over every day in the span, each triggering a Redis lookup and potential DB aggregation. A single authenticated admin (or stolen admin session) could request e.g. `1900-01-01` → `2099-12-31` (~73k parallel operations), exhausting CPU, Postgres connections, and Redis memory.
- **Exploitation:**
  1. Obtain valid admin session (compromised credential or insider).
  2. `GET /api/v1/admin/analytics/revenue?from=1900-01-01&to=2099-12-31`.
  3. Server fans out tens of thousands of rollup queries in one request.
- **Impact:** Availability — API/worker starvation, Redis cache flood, degraded service for all users.
- **Fix:** Cap range to 366 days; reject `from > to`; restrict dates to `YYYY-MM-DD` in DTO; enforce same rules in `eachDateKey` / `assertDateKey`.
- **Status:** fixed

### [SEV-002] Unvalidated Redis cache JSON (cache poisoning / integrity)

- **Severity:** Medium
- **Component:** `AnalyticsRollupService.getDailyRollup`
- **Description:** Cached rollups were returned via unchecked `JSON.parse(cached) as DailyRollup`. If Redis were misconfigured, shared, or compromised, an attacker could write malformed or inflated values under `analytics:daily:*` keys and serve falsified revenue to admins without hitting Postgres.
- **Exploitation:**
  1. Gain write access to Redis (open port, weak ACL, side-channel from another app).
  2. `SET analytics:daily:2026-08-29 '{"date":"2026-08-29","revenue":999999999,"orderCount":0,"bestSelling":[]}'`.
  3. Admin revenue chart reflects poisoned data until TTL expiry (1 h).
- **Impact:** Integrity of admin analytics; potential bad business decisions; no direct customer PII leak.
- **Fix:** Schema-validate parsed cache; require `parsed.date === dateKey`; delete invalid entries and recompute from DB.
- **Status:** fixed

### [SEV-003] Stale daily rollups after order mutations

- **Severity:** Medium
- **Component:** `AnalyticsRollupService` cache invalidation wiring
- **Description:** `invalidateDailyRollup` exists but is not invoked from order create/update/cancel flows. Revenue series can be up to 1 hour stale after order changes.
- **Exploitation:** Not attacker-driven; operational integrity gap.
- **Impact:** Admin sees outdated revenue/order counts briefly after fulfillment changes.
- **Fix:** Call `invalidateDailyRollup(toDateKey(order.createdAt))` from order lifecycle hooks or BullMQ rollup cron on order events.
- **Status:** open (deferred: wire invalidation when order event handlers land in P7-analytics-rollup worker)

### [SEV-004] Snapshot endpoint loads full order table

- **Severity:** Low
- **Component:** `AdminAnalyticsService.getSnapshot`
- **Description:** Snapshot aggregates via `order.findMany` without pagination. Acceptable at current scale; becomes a latency/memory concern as orders grow.
- **Fix:** Derive snapshot fields from pre-computed rollups or materialized views.
- **Status:** deferred: acceptable for MVP scale; revisit before 100k+ orders

## 3. Attack Chains

1. **Blocked — non-admin data exfiltration**
   - Attacker registers customer account → `GET /admin/analytics` → 401 without cookie / 403 with customer JWT. `@Roles('admin')` on controller + global `JwtAuthGuard` + `RolesGuard` enforce boundary. E2E confirms.

2. **Mitigated — admin session revenue DoS**
   - Stolen admin cookie → wide date-range revenue request → previously caused unbounded parallel rollups. Now capped at 366 days (~366 Redis/DB ops max per request) + global 100 req/min throttle.

3. **Mitigated — Redis cache poisoning**
   - Redis write access → poison `analytics:daily:*` → previously served unchecked JSON. Now validated; mismatch triggers delete + DB recompute.

## 4. Controls Verified

| Control | Result |
| --- | --- |
| `@Roles('admin')` on `AdminAnalyticsController` (class-level) | PASS |
| No `@Public()` on analytics routes | PASS |
| Global `JwtAuthGuard` — unauthenticated → 401 | PASS (e2e) |
| Global `RolesGuard` — customer → 403 | PASS (e2e) |
| CSRF skipped for GET (safe methods) | PASS — read-only endpoints |
| `ValidationPipe` whitelist + forbidNonWhitelisted on DTO | PASS |
| `RevenueQueryDto` date format + range limits | PASS (fixed) |
| Redis keys namespaced `analytics:daily:` + date validation | PASS (fixed) |
| JWT role sourced from DB on login/refresh | PASS |
| `bcrypt` / `bcryptjs` in password paths | PASS — zero matches in source/deps |
| Throttling `@nestjs/throttler` 100/min default | PASS |

### Endpoints reviewed

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/analytics` | admin | Aggregated revenue, vendors, bestsellers |
| GET | `/api/v1/admin/analytics/revenue` | admin | Date-range series; range capped |
| GET | `/api/v1/admin/analytics/bestsellers` | admin | Top designs by units |

## 5. Secure Design Recommendations

- Wire `invalidateDailyRollup` into order status transitions and nightly BullMQ rollup cron (P7-analytics-rollup).
- Add dedicated admin throttler (e.g. 30/min) on analytics routes if dashboards poll aggressively.
- Replace full-table snapshot scan with rollup-backed aggregates as order volume grows.
- Ensure Redis requires auth in production Compose; restrict network to API/worker only.
- Add audit log entries when admin analytics endpoints are accessed (who, when, range queried).

## 6. Verifier Gate

- [x] Zero Critical/High open
- [x] bcrypt grep clean
- [x] Auth bypass tested (401/403)
- [x] Revenue range DoS remediated
- [x] Cache integrity validation added
