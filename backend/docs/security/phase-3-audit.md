# Phase 3 Security Audit

Date: 2026-08-30  
Auditor: Security sub-agent  
Scope: `backend/src/pricing/`, `backend/src/modules/orders/`, `backend/src/modules/quotes/`, `backend/src/modules/coupons/`

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 1 | 0 | 1 | 0 |
| Medium | 2 | 1 | 1 | 0 |
| Low | 2 | 2 | 0 | 0 |

**Overall:** PASS

## 2. Detailed Findings

### [SEV-001] Idempotency race allows duplicate orders

- **Severity:** High
- **Component:** `IdempotencyService`, `OrdersService.create`
- **Description:** Parallel `POST /orders` requests sharing the same `Idempotency-Key` could both miss the Redis cache (checked before order creation, written after) and create duplicate orders with separate IDs — defeating idempotency and enabling duplicate coupon redemption attempts.
- **Exploitation:**
  1. Authenticated attacker sends two concurrent `POST /orders` with identical body and `Idempotency-Key`.
  2. Both pass `getCached()` before either completes.
  3. Both proceed through pricing and DB insert; only post-hoc cache write remains.
  4. Attacker receives two orders; limited-redemption coupons may still be protected by transactional `updateMany`, but duplicate orders and charges are possible.
- **Impact:** Integrity — duplicate orders, potential double billing, inventory/design state corruption.
- **Fix:** Acquire a Redis `SET NX` processing lock (`beginOrGetCached`) before order work; return cached response on replay; release lock on failure; overwrite with final response on success.
- **Status:** fixed

### [SEV-002] Public coupon validate held Redis redemption lock

- **Severity:** Medium
- **Component:** `CouponsController.validate`
- **Description:** The public `POST /coupons/validate` endpoint called `validateCouponCode` with `{ lock: true }`, acquiring the same Redis key (`coupon:lock:{CODE}`) used during checkout redemption. An unauthenticated attacker could spam validate requests to intermittently block legitimate users from completing orders with that coupon (`CONFLICT: Coupon is being processed`).
- **Exploitation:**
  1. Attacker scripts rapid `POST /coupons/validate` with code `WELCOME10`.
  2. Victim submits order with same coupon during lock window.
  3. Order creation fails with conflict despite coupon being valid.
- **Impact:** Availability — checkout denial for targeted coupon codes.
- **Fix:** Use `{ lock: false }` on the validate-only endpoint; reserve Redis locks for actual redemption paths (`OrdersService.create`, `CouponsService.redeemCoupon`).
- **Status:** fixed

### [SEV-003] Order note update missing userId in Prisma where clause

- **Severity:** Medium
- **Component:** `OrdersService.updateNote`
- **Description:** `prisma.order.update({ where: { id } })` did not scope by `userId`. `OwnershipGuard` enforces access at the controller layer, but a future refactor removing the guard would expose cross-user note mutation.
- **Exploitation:** Requires bypass or removal of `OwnershipGuard`; not exploitable in current routing.
- **Impact:** Integrity — latent IDOR if guard bypassed.
- **Fix:** Add `userId` to the update `where` clause for defense-in-depth.
- **Status:** fixed

### [SEV-004] No upper bound on size quantities

- **Severity:** Low
- **Component:** `SizeBreakdownDto`, `PricingService`
- **Description:** Size quantities accept any non-negative integer with no `@Max()`. Extremely large values force expensive pricing computation and may produce unrealistic totals before vendor capacity rejection.
- **Exploitation:** Submit `{ M: 999999999 }` to quote/order endpoints.
- **Impact:** Availability — resource consumption; no price manipulation (server recomputes; capacity filter rejects ineligible vendors).
- **Fix:** Add `@Max(500)` (or business-defined cap) per size field.
- **Status:** open

### [SEV-005] Public coupon validate exposes coupon metadata

- **Severity:** Low
- **Component:** `CouponsController.validate`
- **Description:** Anonymous callers receive coupon `id`, `type`, `value`, and `expiresAt`. Acceptable for UX preview; enables coupon enumeration/brute-force of weak codes.
- **Exploitation:** Iterate common codes against `/coupons/validate`.
- **Impact:** Confidentiality — low; codes are meant to be shared; rate limiting mitigates brute force.
- **Fix:** Optional: rate-limit public validate endpoint; omit internal `id` from response.
- **Status:** open

## 3. Attack Chains

### Chain A — Duplicate order via idempotency race (fixed)

1. Attacker registers and creates a design.
2. Sends parallel `POST /orders` with same `Idempotency-Key` and coupon.
3. ~~Both create separate orders before cache is set.~~ **Blocked by SEV-001 fix.**

### Chain B — Coupon checkout DoS (fixed)

1. Attacker hammers `POST /coupons/validate` for `SUMMER20`.
2. ~~Concurrent checkout hits Redis lock and fails.~~ **Blocked by SEV-002 fix.**

### Chain C — Order IDOR (not exploitable)

1. Attacker obtains another user's order UUID.
2. `GET /orders/:id` and `PATCH /orders/:id` pass through `OwnershipGuard` + service-level `userId` filter.
3. Returns 404 — no data leak.

### Chain D — Status machine bypass (not exploitable)

1. Customer attempts `PATCH /admin/orders/:id/status` → 403 (RolesGuard).
2. Admin attempts skip from `design_confirmed` → `shipped` → 400 `ORDER_INVALID_TRANSITION` (verified in e2e).

### Chain E — Pricing manipulation (not exploitable)

1. Attacker submits fabricated `subtotal`/`total` in order body → rejected by DTO whitelist (`CreateOrderDto` has no price fields).
2. Server recomputes quote via `PricingService` at order creation; client totals never trusted.

## 4. Controls Verified

| Control | Status |
| --- | --- |
| Server-authoritative pricing at quote + checkout | PASS |
| `CreateOrderDto` excludes client price fields | PASS |
| Order IDOR: `OwnershipGuard` + `userId` in queries | PASS |
| Admin routes: global `RolesGuard` + `@Roles('admin')` | PASS |
| Status machine: sequential transitions enforced | PASS |
| Cancel/refund guards on terminal states | PASS |
| Coupon redemption: transactional `updateMany` optimistic lock | PASS |
| Coupon lock scoped to redemption, not validate | PASS (post-fix) |
| Idempotency: per-user key + Redis processing lock | PASS (post-fix) |
| Size quantities: `@Min(0)` prevents negative qty discount | PASS |
| bcrypt/bcryptjs absent from source and `package.json` | PASS |

## 5. Secure Design Recommendations

- Add per-user coupon redemption limits if business rules require one-use-per-customer.
- Cap size quantities (`@Max`) to reduce quote-compute abuse.
- Rate-limit `POST /coupons/validate` (e.g. 20/min/IP) to slow code enumeration.
- Persist idempotency records in Postgres for audit trail beyond Redis TTL.
- Add explicit e2e tests for parallel idempotency-key and parallel coupon redemption.
- Phase 4: verify payment webhook signatures before status transitions to `paid`.

## 6. Verifier Gate

- [x] Zero Critical/High open
- [x] bcrypt grep clean (docs-only references)
- [x] High/Medium fixes applied in source
