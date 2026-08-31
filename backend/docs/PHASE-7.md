# Phase 7 — Analytics + scale

## Goals

Replace client-side analytics stubs with server-side rollup workers and admin analytics API. Tune throttling and validate performance under load.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P7-analytics-rollup** | Implementer | `AnalyticsRollupProcessor` (BullMQ cron); daily snapshot cache in Redis |
| **P7-analytics-api** | Implementer | Admin endpoints: snapshot, revenue series, bestsellers |

## Exit criteria

- Analytics APIs match shapes expected by `client/src/lib/admin/analytics.ts`
- Rollup idempotent per date; safe to re-run
- `@nestjs/throttler` configured for production traffic
- Load test documents baseline latency under Docker Compose
- Security audit PASS
- Full backend migration complete: frontend uses API for all former IndexedDB operations

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers → Breaker → Fixer → IntegrationTester → Security → Verifier → Committer

## Per-phase gate

See [`QA_CHECKLIST.md`](../QA_CHECKLIST.md) § Phase 7.
