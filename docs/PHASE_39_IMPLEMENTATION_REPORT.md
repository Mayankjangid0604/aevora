# Phase 39 — Autonomous R&D Flywheel Implementation Report

## Executive Summary

Phase 39 implements the R&D Flywheel: a full lifecycle for managing R&D portfolios, initiatives, capabilities, feedback, and resource plans. All data is advisory (non-authoritative) except `RdPortfolio` itself. Self-approval is blocked on initiatives. A forward-only state machine governs initiative workflow. All endpoints are tenant-scoped, and the Finance boundary is strictly observed.

---

## Schema

### Enums (5)
- `RdPortfolioStatus`: ACTIVE, PAUSED, CLOSED
- `RdInitiativeStatus`: PROPOSED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED
- `RdCapabilityMaturity`: NONE, EMERGING, DEVELOPING, MATURE, LEADING
- `RdFeedbackType`: PRODUCT_OUTCOME, CUSTOMER_INSIGHT, MODEL_PERFORMANCE, RESEARCH_FINDING, MARKET_SIGNAL

### Models (7)
| Model | Key Fields |
|---|---|
| `RdPortfolio` | `isAdvisory: false` (authoritative), unique(companyId, name) |
| `RdInitiative` | `isAdvisory: true`, forward-only status machine, idempotencyKey @unique |
| `RdCapability` | `isAdvisory: true`, unique(companyId, name) |
| `RdCapabilityLink` | unique(initiativeId, capabilityId) |
| `RdFeedbackItem` | `isAdvisory: true`, initiativeId optional |
| `RdResourcePlan` | `isAdvisory: true`, allocatedMc/forecastedMc integer microcents |
| `RdAuditEvent` | append-only, portfolioId optional |

Company model extended with `rdPortfolios RdPortfolio[] @relation("RdCompany")`.

---

## Migration

File: `packages/database/prisma/migrations/20260923930000_phase39_rd_flywheel/migration.sql`

Applied via docker psql, resolved via `prisma migrate resolve --applied`, client regenerated via `prisma generate`.

---

## Services

| Service | Responsibility |
|---|---|
| `RdAuditService` | Append-only `record()` and `trail()`. No delete/update methods. |
| `RdPortfolioService` | Create/list/get/update portfolios; `isAdvisory: false`; CLOSED blocks update |
| `RdInitiativeService` | Forward-only state machine; self-approval blocked; kill switch `RD_INITIATIVE_APPROVAL`; idempotency |
| `RdCapabilityService` | Create/list/get/updateMaturity; `isAdvisory: true`; `assessedBy: actorId` |
| `RdCapabilityLinkService` | Link capability to initiative; tenant isolation; P2002 → ConflictException |
| `RdFeedbackService` | Submit/list feedback; `isAdvisory: true`; optional initiativeId |
| `RdResourcePlanService` | Create/list plans; integer guards; application-level null fiscalQuarter unique check |
| `RdAnalyticsService` | `flyWheelSummary(companyId)` read-only; returns `isAdvisory: true` |

---

## Endpoints

All under `/rd-flywheel`, protected by `JwtAuthGuard`, `companyId`/`actorId` from `req.user`:

- `POST /portfolios`, `GET /portfolios`, `GET /portfolios/:id`, `PATCH /portfolios/:id`
- `POST /portfolios/:portfolioId/initiatives`
- `GET /initiatives`, `GET /initiatives/:id`, `PATCH /initiatives/:id`
- `POST /initiatives/:id/approve`, `POST /initiatives/:id/start`, `POST /initiatives/:id/complete`, `POST /initiatives/:id/cancel`
- `POST /capabilities`, `GET /capabilities`, `GET /capabilities/:id`, `PATCH /capabilities/:id/maturity`
- `POST /initiatives/:initiativeId/capabilities`, `GET /initiatives/:initiativeId/capabilities`
- `POST /feedback`, `GET /feedback`
- `POST /resource-plans`, `GET /resource-plans`
- `GET /analytics/flywheel`
- `GET /audit`

---

## Frontend

`apps/web/app/rd-flywheel/page.tsx` — 5-tab page:
- **Portfolio**: portfolio list with status
- **Initiatives**: initiative list with approve/start/complete workflow
- **Capabilities**: maturity levels, domain grouping
- **Feedback**: feedback items by type, linked initiative
- **Analytics**: flywheel summary, resource plans

---

## Governance Controls

1. `companyId`/`actorId` never read from body — always from `req.user`
2. Finance models never written (no journalEntry, invoice, acWallet in rd-*.service.ts)
3. Self-approval blocked: `proposedBy === actorId` → ForbiddenException
4. Kill switch `RD_INITIATIVE_APPROVAL`: blocks approve, does not block create/start/complete
5. `isAdvisory: false` on RdPortfolio; `isAdvisory: true` on everything else
6. Integer guards on all Mc fields (estimatedCostMc, actualCostMc, allocatedMc, forecastedMc)
7. Null fiscalQuarter unique: application-level findFirst check (DB unique constraint cannot cover null)
8. Explicit whitelist in every `update()` — isAdvisory cannot change via update
9. P2002 on initiative idempotencyKey → returns existing for same company, throws for different company
10. Forward-only initiative state machine: PROPOSED→APPROVED→IN_PROGRESS→COMPLETED
11. Audit service: no delete, no update methods

---

## Test Results

Phase 39: **146 passed, 0 failed** (tests cover all R1–R11 + ADD-01–ADD-40)

## Regression Results

| Phase | Tests | Result |
|---|---|---|
| Phase 38 | 225 | ✅ 225 passed |
| Phase 37 | 200 | ✅ 200 passed |
| Phase 36 | 107 | ✅ 107 passed |
| Phase 35 | 76 | ✅ 76 passed |
| Phase 34 | 107 | ✅ 107 passed |

---

## TypeScript / Build

- `npx tsc --noEmit`: 0 errors
- `npx turbo build`: 5 tasks, all successful

---

## Security Grep

- No `journalEntry`, `invoice`, `acWallet`, `realMoney` in `apps/api/src/rd-flywheel/`
- No `req.body.companyId` or `req.body.actorId` — all from `req.user` via destructure

---

## Files Changed

- `packages/database/prisma/schema.prisma` — Phase 39 enums, 7 models, Company relation
- `packages/database/prisma/migrations/20260923930000_phase39_rd_flywheel/migration.sql` — DDL
- `apps/api/src/rd-flywheel/rd-audit.service.ts` — new
- `apps/api/src/rd-flywheel/rd-portfolio.service.ts` — new
- `apps/api/src/rd-flywheel/rd-initiative.service.ts` — new
- `apps/api/src/rd-flywheel/rd-capability.service.ts` — new
- `apps/api/src/rd-flywheel/rd-capability-link.service.ts` — new
- `apps/api/src/rd-flywheel/rd-feedback.service.ts` — new
- `apps/api/src/rd-flywheel/rd-resource-plan.service.ts` — new
- `apps/api/src/rd-flywheel/rd-analytics.service.ts` — new
- `apps/api/src/rd-flywheel/rd-flywheel.controller.ts` — new
- `apps/api/src/rd-flywheel/rd-flywheel.module.ts` — new
- `apps/api/src/app.module.ts` — RdFlywheelModule registered
- `apps/web/app/rd-flywheel/page.tsx` — new
- `scripts/test-phase39.ts` — new (146 tests)
