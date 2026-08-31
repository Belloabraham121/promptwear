# Phase 6 — AI studio

## Goals

Replace hardcoded studio chat in the frontend with backend `StudioModule`: SSE chat streaming and async design generation via BullMQ.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P6-chat** | Implementer | SSE chat endpoint; conversation scoped to authenticated user |
| **P6-generate-queue** | Implementer | Async generate job + `GenerateProcessor`; ownership on design context |

## Exit criteria

- Chat and generate endpoints require auth; no cross-user conversation access
- Generate jobs processed via BullMQ with retry and failure handling
- Rate limits on AI endpoints to prevent abuse
- Frontend `StudioWorkspace` wired to real API
- Security audit PASS (prompt injection, SSRF via AI provider config)

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers → Breaker → Fixer → IntegrationTester → Security → Verifier → Committer

## Per-phase gate

See [`QA_CHECKLIST.md`](../QA_CHECKLIST.md) § Phase 6.
