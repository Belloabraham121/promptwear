# Phase 5 Security Audit

Date: 2026-08-30  
Auditor: Security sub-agent  
Scope: Phase 5 admin module — catalog, vendors, profit, analytics, public catalog, and admin orders

**Files reviewed**

- `backend/src/modules/admin/**` (catalog, vendors, profit, analytics)
- `backend/src/modules/orders/admin-orders.controller.ts`
- Global guards: `JwtAuthGuard`, `RolesGuard`, `CsrfGuard`, `ValidationPipe`
- Auth/user DTOs (role self-promotion check)
- `backend/test/admin.e2e-spec.ts`

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 0 | 0 | 0 | 0 |
| Medium | 2 | 2 | 0 | 0 |
| Low | 2 | 2 | 0 | 0 |

**Overall:** PASS

## 2. Detailed Findings

### [SEV-001] Percent coupon/discount value uncapped in admin DTOs

- **Severity:** Medium
- **Component:** `profit/dto/coupon.dto.ts`, `profit/dto/discount.dto.ts`
- **Description:** `CreateCouponDto`, `UpdateCouponDto`, `CreateDiscountDto`, and `UpdateDiscountDto` allow `value` ≥ 0 with no upper bound when `type === 'percent'`. An admin (or compromised admin session) can create a 200% coupon.
- **Exploitation:** Admin creates coupon `{ type: 'percent', value: 200 }` → customer applies at checkout → `computeDiscount` returns up to 2× order total; `grandTotal` is clamped to 0 via `Math.max(0, …)`, yielding a free order rather than negative payment.
- **Impact:** Integrity — pricing abuse, revenue loss; requires admin access or stolen admin session.
- **Fix:** Add conditional validation (`@Max(100)` when `type === 'percent'`) or a custom validator on create/update DTOs.
- **Status:** open

### [SEV-002] Promotion date ordering not validated

- **Severity:** Medium
- **Component:** `profit/dto/promotion.dto.ts`, `profit/profit.service.ts`
- **Description:** `CreatePromotionDto` / `UpdatePromotionDto` accept any ISO date pair; service does not enforce `endsAt > startsAt`.
- **Exploitation:** Admin creates promotion with `endsAt` before `startsAt` → promotion never active or behaves unexpectedly in downstream pricing logic.
- **Impact:** Integrity — business logic confusion; admin-only.
- **Fix:** Add `@Validate` custom constraint or service-level check before persist.
- **Status:** open

### [SEV-003] Public catalog exposes `active` on filtered records

- **Severity:** Low
- **Component:** `catalog/catalog.service.ts`, `admin.mapper.ts`
- **Description:** `GET /catalog/colors` and `GET /catalog/garments` return `active: true` on every row because queries filter `active: true`. Field is redundant on public responses.
- **Exploitation:** None material; slightly widens response surface.
- **Impact:** Confidentiality — negligible.
- **Fix:** Introduce a `PublicGarmentResponse` / `PublicColorResponse` type omitting `active`, or map to storefront-specific DTO.
- **Status:** open

### [SEV-004] Catalog PATCH passes DTO directly to Prisma

- **Severity:** Low
- **Component:** `catalog/catalog.service.ts` (`updateMaterial`, `updateGarment`, `updateColor`, `updateSize`)
- **Description:** Update methods use `data: dto` whereas vendors/profit services build explicit Prisma input objects. Currently safe because DTOs align with schema fields and global `forbidNonWhitelisted: true` blocks extra keys.
- **Exploitation:** None today; future DTO/schema drift could introduce mass-assignment regression.
- **Impact:** Integrity — defense-in-depth only.
- **Fix:** Mirror vendor/profit pattern with explicit field mapping in service layer.
- **Status:** open

## 3. Attack Chains

Attempted adversarial paths (all blocked):

1. **Customer → admin catalog** — Customer JWT on `GET /admin/catalog` → `RolesGuard` returns 403 (same guard chain as vendor PATCH; e2e confirms 403 on `PATCH /admin/vendors/:id`).
2. **Self-promotion to admin** — `RegisterDto` and `UpdateUserDto` exclude `role`; `User.role` defaults to `customer` in schema; JWT role is signed server-side at login.
3. **Mass assignment on profit entities** — Extra body keys (`profitSettingsId`, `redemptionCount`, `id`) rejected by global `ValidationPipe` (`forbidNonWhitelisted: true`); create/update services hardcode `profitSettingsId: 'default'` and omit redemption counters from DTOs.
4. **Mass assignment on vendors** — `VendorsService.toCreateData` / `toUpdateData` whitelist fields explicitly; nested cost JSON validated via `@ValidateNested`.
5. **Public catalog cost leak** — `GET /catalog/colors` returns id/name/hex/active only. `GET /catalog/garments` returns retail `basePrice` and `materialId` but **not** `costPerUnit`, vendor costs, or inactive items. No public material/vendor endpoints exist.
6. **Unauthenticated admin access** — Non-`@Public()` routes require JWT; missing token → 401 before role check.
7. **CSRF on admin mutations** — Admin POST/PATCH/DELETE require double-submit CSRF token (not skipped for protected routes).

## 4. Controls Verified

| Control | Result |
| --- | --- |
| `@Roles('admin')` on all `/admin/*` controllers | PASS — catalog, vendors, profit, analytics, orders |
| Customer JWT blocked from admin routes | PASS — e2e: 403 on vendor PATCH |
| Public catalog read-only, no auth required | PASS — `@Public()` on `GET /catalog/colors`, `GET /catalog/garments` |
| Sensitive costs not in public responses | PASS — `costPerUnit`, vendor cost tables, margin settings admin-only |
| Global validation `whitelist` + `forbidNonWhitelisted` | PASS — `main.ts` |
| Role not writable via register/profile | PASS |
| Argon2id / no bcrypt | PASS — zero matches in `backend/src` |
| Admin e2e suite | PASS — 3/3 tests green |

### Admin route inventory

| Controller | Prefix | Guard |
| --- | --- | --- |
| `CatalogController` | `admin/catalog` | `@Roles('admin')` |
| `VendorsController` | `admin/vendors` | `@Roles('admin')` |
| `ProfitController` | `admin/profit` | `@Roles('admin')` |
| `AdminAnalyticsController` | `admin/analytics` | `@Roles('admin')` |
| `AdminOrdersController` | `admin/orders` | `@Roles('admin')` |
| `PublicCatalogController` | `catalog` | `@Public()` (intentional) |

## 5. Secure Design Recommendations

- Add `@Max(100)` (conditional on percent type) to coupon/discount DTOs before production admin use.
- Add admin audit logging for catalog price changes, vendor cost table edits, and profit margin updates.
- Extend e2e coverage: unauthenticated 401 on admin GET, customer 403 on all admin prefixes, public garments response must not contain `costPerUnit`.
- Consider rate limiting admin mutation endpoints separately from default 100/min.

## 6. Verifier Gate

- [x] Zero open Critical/High findings
- [x] bcrypt grep clean
- [x] All `/admin/*` routes require `@Roles('admin')`
- [x] Public catalog does not leak vendor/material cost data
- [x] Mass assignment mitigated via DTO whitelist + service-layer mapping (vendors/profit)
