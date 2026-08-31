# Phase 3 — Pricing + orders

## Goals

Port smart pricing engine to server-side `PricingService`. Implement quotes, order creation, status machine, and coupon validation with concurrency controls.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P3-pricing** | Implementer | Port `client/src/lib/pricing/engine.ts` → `backend/src/pricing/`; `QuotesModule` with Redis cache |
| **P3-orders** | Implementer | `OrdersModule`: list, get, create, patch; `OrderStatusMachine`; status events |
| **P3-coupons** | Implementer | Coupon validation endpoint; Redis lock to prevent double redemption |

## Exit criteria

- `POST /orders/quote` returns server-authoritative pricing
- Checkout rejects client-supplied totals that don't match server quote
- Invalid order status transitions return `ORDER_INVALID_TRANSITION`
- Coupon race: parallel redeem → only one succeeds
- Security audit PASS

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers → Breaker → Fixer → IntegrationTester → Security → Verifier → Committer

## Per-phase gate

See [`QA_CHECKLIST.md`](../QA_CHECKLIST.md) § Phase 3.
