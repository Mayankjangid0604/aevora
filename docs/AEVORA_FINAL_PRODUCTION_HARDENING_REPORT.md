# AEVORA Final Production Hardening Report

## Before Hardening
- Medium findings: 3
- Tests: 1,570/1,570 passing (pre-hardening)
- Build: TypeScript 0 errors

---

## Remediation

### M1: Hardcoded JWT Secret
**Root cause:** `apps/api/src/main.ts` line 1 contained `process.env.JWT_SECRET='development_secret'` — a hardcoded fallback that silently overwrote any missing env var, and the production guard only checked `NODE_ENV === 'production'`.

**Fix:** Removed the hardcoded assignment. Changed the startup guard to `throw new Error('JWT_SECRET environment variable is required')` unconditionally if `JWT_SECRET` is not set. App now refuses to start in any environment without it.

**Security impact:** Eliminates known-secret exploitation. Any deployment that forgot to set `JWT_SECRET` will fail fast at boot rather than running with a known weak secret.

**Regression:** H1 tests pass; existing phase tests unaffected (tests set `process.env.JWT_SECRET` before running).

---

### M2: Role Controller Body CompanyId
**Root cause:** `apps/api/src/role/role.controller.ts` had no `@UseGuards(JwtAuthGuard)` and read `companyId` from `@Query()` (list) and `@Body()` (create), allowing any caller to list or create roles for any tenant.

**Fix:** Added `@UseGuards(JwtAuthGuard)` at the controller level. Both `list` and `create` now extract `companyId` from `req.user.companyId` (JWT claim), matching the pattern used by all Phase 35–40 controllers. Removed `companyId` from the `@Body()` type.

**Security impact:** Prevents cross-tenant role enumeration and role injection. An attacker can no longer craft a request with an arbitrary `companyId` to read or create roles for another tenant.

**Regression:** H2 tests pass (5 tests covering role list, create, cross-tenant isolation, JwtAuthGuard presence).

---

### M3: Phase 34 Mass Assignment
**Root cause:** `apps/api/src/product-factory/pf-product.service.ts` `update()` passed `data: dto` directly to Prisma. TypeScript typing restricted the DTO shape, but at runtime the object reference flowed through, and callers could inject extra fields (`companyId`, `registeredBy`, `approvedBy`, `lifecycle`, `isAdvisory`, `isArchived`) that Prisma would silently accept.

Same pattern existed in `apps/api/src/product-factory/pf-requirements.service.ts` `update()`.

**Fix:** Both `update()` methods now build an explicit `safeData` object via field-by-field `if (dto.X !== undefined)` checks. Protected fields (`companyId`, `registeredBy`, `approvedBy`, `lifecycle`, `isAdvisory`, `isArchived`) are never copied.

**Security impact:** Prevents lifecycle/approval/isAdvisory override via update. An attacker cannot promote a product to APPROVED or flip `isAdvisory` to false through the update endpoint.

**Regression:** H3 tests (10 tests): all protected field injection attempts confirmed no-op; safe fields (description, ownerId) confirmed still writeable.

---

## Phase 36 Production Configuration (No Code Change Required)

Phase 36 governance uses two mechanisms:

1. **Env-var kill switches** (checked at service call time):
   - `CA_PROPOSAL_APPROVAL=enabled` — required for `caProposalSvc.approve()` to execute
   - `CA_ALLOCATION_EXECUTION=enabled` — required for `caAllocSvc.authorize()` and `caAllocSvc.execute()`
   - If the env var is absent or not `'enabled'`, a `ForbiddenException` is thrown with the feature name

2. **`KillSwitchConfig` DB records** — present in schema, used by Phase 38/39 features (FI_TRAINING_JOBS, FI_MODEL_PROMOTION, RD_INITIATIVE_APPROVAL). These query `prisma.killSwitchConfig` for `{ feature, isDisabled: true }`.

**Required production environment variables for Phase 36:**
```
CA_PROPOSAL_APPROVAL=enabled
CA_ALLOCATION_EXECUTION=enabled
```
Without these set to `'enabled'`, all capital allocation approvals and authorizations are blocked at the service layer.

---

## Required Production Environment Variables

| Variable | Required | Effect if missing |
|---|---|---|
| `JWT_SECRET` | YES | App throws at startup and refuses to boot |
| `DATABASE_URL` | YES | Prisma fails to connect |
| `CA_PROPOSAL_APPROVAL` | YES (set to `enabled`) | All proposal approvals blocked |
| `CA_ALLOCATION_EXECUTION` | YES (set to `enabled`) | All allocation authorizations blocked |
| `NODE_ENV` | Recommended | Affects CORS origin policy |
| `ALLOWED_ORIGINS` | Production | CORS origins in production |
| `PORT` | Optional | Defaults to 13000 |

---

## Post-Hardening Verification

### Security Grep Results

| Check | Result |
|---|---|
| Hardcoded JWT secret (`development_secret`) | 0 matches |
| Body companyId injection (`req.body.companyId`, `body.companyId`) | 0 matches |
| `data: dto` mass assignment (exact pattern) | 0 matches |
| Finance writes from non-Finance phases (`prisma.acWallet`, etc.) | 0 matches (Finance phases only) |
| Float monetary fields (`parseFloat.*Mc`) | 0 matches |
| `dto.isAdvisory` client control | 0 matches |

### Test Results

| Suite | Tests | Status |
|---|---|---|
| test-final-integration.ts (post-hardening) | 129/129 | PASS |
| H1: JWT / Actor Guards | 5/5 | PASS |
| H2: Role Controller Tenant Identity | 5/5 | PASS |
| H3: Ph34 Mass Assignment Regression | 10/10 | PASS |
| H4: Ph36 Governance | 10/10 | PASS |
| H5: Cross-Phase Security | 10/10 | PASS |

### TypeScript / Build
- TypeScript: **0 errors** (`tsc --noEmit`)

---

## Files Changed

| File | Change |
|---|---|
| `apps/api/src/main.ts` | Removed hardcoded `JWT_SECRET` assignment; startup guard now throws unconditionally |
| `apps/api/src/role/role.controller.ts` | Added `JwtAuthGuard`; `companyId` extracted from `req.user` not body/query |
| `apps/api/src/product-factory/pf-product.service.ts` | `update()` uses explicit field whitelist |
| `apps/api/src/product-factory/pf-requirements.service.ts` | `update()` uses explicit field whitelist |
| `scripts/test-final-integration.ts` | Added 40 hardening tests (H1–H5) |

---

## Remaining Findings

- **Low:** Phase 36 kill-switch mechanism is global (env-var based), not per-company. A per-company kill-switch would require DB-backed logic. Acceptable for advisory mode.
- **Info:** `KillSwitchConfig` DB table exists and is used by Phase 38/39 features but not Phase 36. Consistent approach would unify mechanisms. No security impact in current advisory posture.

---

## Final Security Posture

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 (global kill switch, no per-tenant scoping) |
| Info | 1 (kill switch mechanism inconsistency) |
