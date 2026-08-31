# Phase 2 — Designs + assets

## Goals

Replace IndexedDB design CRUD with REST API. Add MinIO-backed asset upload via presigned URLs with ownership enforcement.

## Workstreams

| ID | Owner | Deliverables |
| --- | --- | --- |
| **P2-designs** | Implementer | `DesignsModule`: list/create/get/update/delete with pagination and `OwnershipGuard` |
| **P2-assets-storage** | Implementer | `AssetsModule` + `StorageService`: presign upload, complete, list, get, delete; MinIO integration |

## Exit criteria

- Customer can CRUD only their own designs
- Asset presigned URLs scoped to owning user/design; no cross-tenant IDOR
- Typed frontend API client stub with `credentials: 'include'` and CSRF header
- Swagger documents all design/asset endpoints
- Security audit PASS

## Sub-agent order

Coordinator → SpecChecker → parallel Implementers → Breaker → Fixer → IntegrationTester → Security → Verifier → Committer

## Per-phase gate

See [`QA_CHECKLIST.md`](../QA_CHECKLIST.md) § Phase 2.
