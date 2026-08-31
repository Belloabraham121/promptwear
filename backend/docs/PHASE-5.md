# Phase 5 — Admin

## Goals

Implement admin API for catalog, vendors, profit settings, promotions/discounts/coupons, and order fulfillment. Seed demo data from frontend admin store defaults.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P5-catalog** | Implementer | Admin + public catalog: materials, garments, colors, sizes |
| **P5-vendors** | Implementer | Vendor CRUD with cost tables (JSON) |
| **P5-profit** | Implementer | Profit settings singleton, promotions, discounts, coupons admin CRUD |
| **P5-admin-orders** | Implementer | Admin order list, status update, cancel, refund |

## Exit criteria

- All `/admin/*` routes require `@Roles('admin')`
- Customer JWT cannot access admin endpoints (403)
- `prisma/seed.ts` seeds demo catalog/vendors aligned with `client/src/lib/admin/store.ts`
- Public read-only catalog endpoints for storefront
- Security audit PASS

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers → Breaker → Fixer → IntegrationTester → Security → Verifier → Committer

## Per-phase gate

See [`QA_CHECKLIST.md`](../QA_CHECKLIST.md) § Phase 5.
