# Phase 4 — Payments

## Goals

Integrate payment provider (Paystack or Stripe): payment intents, bank transfer flow, webhooks with signature verification, and idempotency on order/payment creation.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P4-payments** | Implementer | `PaymentsModule`: create intent, bank transfer, payment status |
| **P4-webhooks** | Implementer | Webhook handler with signature verification; `IdempotencyInterceptor` on POST /orders and payment intent |

## Exit criteria

- Duplicate `POST /orders` with same `Idempotency-Key` returns identical response
- Webhook replay without valid signature rejected
- Payment status syncs order state correctly
- No payment secrets in logs or error responses
- Security audit PASS

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers → Breaker → Fixer → IntegrationTester → Security → Verifier → Committer

## Per-phase gate

See [`QA_CHECKLIST.md`](../QA_CHECKLIST.md) § Phase 4.
