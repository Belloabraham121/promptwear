# Phase F3 Security Audit

Date: 2026-08-31  
Auditor: Security sub-agent  
Scope: `client/src/lib/api/orders.ts`, `client/src/lib/api/coupons.ts`, `client/src/app/dashboard/orders/**`, `DashboardProvider.placeOrder`, checkout flow in `orders/new/page.tsx`

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 1 | 0 | 1 | 0 |
| Medium | 2 | 1 | 1 | 0 |
| Low | 2 | 2 | 0 | 0 |

**Overall:** PASS

## 2. Detailed Findings

### [SEV-F3-001] Legacy IDB write on client-side order status update

- **Severity:** High
- **Component:** `DashboardProvider.updateOrderStatus`, order detail admin advance button
- **Description:** Admin "Advance" on the customer order detail page called `DashboardProvider.updateOrderStatus`, which wrote the full order (including checkout PII) to the legacy IndexedDB `orders` store and updated only the local query cache — not the server. Status changes appeared in UI but were not persisted; IDB retained sensitive checkout data locally.
- **Exploitation:**
  1. Admin opens `/dashboard/orders/:id` and clicks "Advance".
  2. Order with contact/address written to IDB; server status unchanged.
  3. PII persists locally until logout purge; admin sees false status.
- **Impact:** Integrity (false status display) + confidentiality (local PII persistence).
- **Fix:** Removed `putOrder()` from `DashboardProvider.updateOrderStatus`; order detail admin advance now calls `updateAdminOrderStatus()` (PATCH `/admin/orders/:id/status`) and refetches from API.
- **Status:** fixed

### [SEV-F3-002] Client price tampering at checkout

- **Severity:** Medium (not exploitable — verified)
- **Component:** `CreateOrderInput`, `orders/new/page.tsx`, backend `CreateOrderDto`
- **Description:** Audited whether the client could submit fabricated `subtotal`, `total`, or `grandTotal` at order placement.
- **Exploitation:** Attacker modifies request body or DevTools state to inject lower prices.
- **Impact:** Would be financial integrity loss if server trusted client totals.
- **Fix:** Not required on client — `CreateOrderInput` sends only `designId`, `quality`, `print`, `sizes`, `couponCode`, `note`, and `checkout` (contact/address/payment). Backend `CreateOrderDto` has no price fields; server recomputes via `PricingService` (backend Phase 3 PASS).
- **Status:** fixed (verified not exploitable)

### [SEV-F3-003] Coupon preview uses client-supplied orderTotal

- **Severity:** Medium
- **Component:** `orders/new/page.tsx`, `lib/api/coupons.ts`, backend `POST /coupons/validate`
- **Description:** After fetching a server quote, the UI optionally calls `validateCoupon({ orderTotal: nextQuote.total })`. The validate endpoint accepts `orderTotal` from the client for discount preview display. Actual checkout recomputes on the server; tampering only affects the coupon message in UI, not the charged amount.
- **Exploitation:** Attacker modifies `orderTotal` in validate request to show inflated/deflated discount in UI.
- **Impact:** Low integrity — misleading UI only; order creation re-validates coupon against server quote.
- **Fix:** Deferred — rely on server quote in `POST /orders`; optional: remove separate validate call and use quote response coupon fields only.
- **Status:** open

### [SEV-F3-004] Idempotency key not stable on retry

- **Severity:** Low
- **Component:** `DashboardProvider.placeOrder`
- **Description:** Each `placeOrder` call generates a fresh `crypto.randomUUID()` idempotency key. Double-clicks or retries create duplicate orders instead of replaying the same idempotent response.
- **Impact:** Availability/integrity — duplicate orders on rapid submit (UX); not a price bypass.
- **Fix:** Deferred — persist idempotency key per checkout attempt in component state.
- **Status:** open

### [SEV-F3-005] Orders list/detail use local component state

- **Severity:** Low
- **Component:** `orders/page.tsx`, `orders/[id]/page.tsx`
- **Description:** Pages fetch via API into `useState` rather than shared query keys. Logout clears global cache and redirects; local state is discarded on navigation. No cross-session leak, but inconsistent with Query cache invalidation patterns.
- **Impact:** None for security on logout (full redirect + cache clear).
- **Status:** open

## 3. Attack Chains

### Chain A — Price manipulation at checkout (not exploitable)

1. Attacker intercepts `POST /orders` and adds `"total": 100`.
2. Backend DTO whitelist rejects unknown fields / ignores price fields.
3. Server recomputes quote — attacker charged server price.

### Chain B — Fake admin status + IDB PII (fixed)

1. Admin advances order from customer detail page.
2. ~~Client writes to IDB only; server unchanged; PII in IDB.~~ **Blocked by SEV-F3-001 fix.**

### Chain C — Stale quote display (not exploitable)

1. Attacker modifies displayed quote in React DevTools.
2. User submits order; server recomputes at `POST /orders`.
3. Order total matches server pricing, not tampered display.

## 4. Controls Verified

| Control | Status |
| --- | --- |
| Checkout quote from `POST /orders/quote` (debounced) | PASS |
| No client `quoteSmartOrder` / `loadAdminState` in checkout path | PASS |
| `placeOrder` → `POST /orders` with `Idempotency-Key` header | PASS |
| Order body excludes price fields | PASS |
| Orders list/detail from API (`GET /orders`, `GET /orders/:id`) | PASS |
| Coupon code sent to server quote + order (server validates) | PASS |
| Payment UI labeled offline / no fake charge | PASS |
| Admin order actions on admin page use `/admin/orders/*` API | PASS |
| Server-side pricing authoritative (backend Phase 3) | PASS |

## 5. Secure Design Recommendations

- Migrate orders pages to TanStack Query keys for consistent cache invalidation.
- Stable idempotency key per checkout session to prevent duplicate submits.
- Remove redundant `validateCoupon` call; use quote response discount fields only.
- Delete legacy `lib/dashboard/store.ts` IDB order paths when F2 migration completes.

## 6. Verifier Gate

- [x] Zero open Critical/High findings
- [x] Server quote used at checkout
- [x] No client price fields in order creation payload
- [x] IDB order writes removed from status update path
