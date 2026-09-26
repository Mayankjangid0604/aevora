# Phase 38 — Foundation Intelligence Implementation Report

## Executive Summary

Phase 38 implements AEVORA Foundation Intelligence: a governance-first MLOps platform for managing training datasets, training jobs, model checkpoints, model versions, evaluations, and audit trails. All records are isAdvisory:true until a model reaches PRODUCTION status via a two-person approval gate.

## Schema Changes

### Enums Added
- `FiDatasetStatus`: DRAFT, VALIDATING, VALIDATED, REJECTED, ARCHIVED
- `FiTrainingJobStatus`: QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
- `FiModelStatus`: EXPERIMENTAL, EVALUATED, APPROVED, PRODUCTION, RETIRED
- `FiEvalResult`: PASS, FAIL, INCONCLUSIVE

### Models Added
| Model | Key Fields |
|-------|-----------|
| `FiDataset` | companyId, name, version, status, hasSecrets (hardcoded false), isAdvisory |
| `FiTrainingJob` | companyId, datasetId, status, resourceLimitCpu, resourceLimitMemMb, idempotencyKey |
| `FiCheckpoint` | companyId, jobId, step, epochPct (0-100 int), loss (string) |
| `FiModelVersion` | companyId, family, version, status, proposedBy, approvedBy, isAdvisory |
| `FiEvaluation` | companyId, modelVersionId, benchmarkName, result, score (string), idempotencyKey |
| `FiAuditEvent` | companyId, datasetId, actorId, action — append-only |

### Company Model
Added `fiDatasets FiDataset[] @relation("FiCompany")`.

## Migration Status

- Migration: `20260923920000_phase38_foundation_intelligence`
- Status: Applied and resolved
- All 6 Fi* tables created in PostgreSQL

## Backend Services

| Service | File |
|---------|------|
| FiAuditService | `fi-audit.service.ts` — record() + trail(), no delete/update |
| FiDatasetService | `fi-dataset.service.ts` — CRUD + validate + reject |
| FiTrainingJobService | `fi-training-job.service.ts` — CRUD + start/complete/fail/cancel |
| FiCheckpointService | `fi-checkpoint.service.ts` — create + list |
| FiModelVersionService | `fi-model-version.service.ts` — CRUD + promote + retire |
| FiEvaluationService | `fi-evaluation.service.ts` — create + list |
| FiAnalyticsService | `fi-analytics.service.ts` — summary (read-only) |
| FoundationIntelligenceController | `foundation-intelligence.controller.ts` |
| FoundationIntelligenceModule | `foundation-intelligence.module.ts` |

## API Endpoints

```
POST   /foundation-intelligence/datasets
GET    /foundation-intelligence/datasets
GET    /foundation-intelligence/datasets/:id
PATCH  /foundation-intelligence/datasets/:id
POST   /foundation-intelligence/datasets/:id/validate
POST   /foundation-intelligence/datasets/:id/reject

POST   /foundation-intelligence/training-jobs
GET    /foundation-intelligence/training-jobs
GET    /foundation-intelligence/training-jobs/:id
POST   /foundation-intelligence/training-jobs/:id/start
POST   /foundation-intelligence/training-jobs/:id/complete
POST   /foundation-intelligence/training-jobs/:id/fail
POST   /foundation-intelligence/training-jobs/:id/cancel

POST   /foundation-intelligence/training-jobs/:jobId/checkpoints
GET    /foundation-intelligence/training-jobs/:jobId/checkpoints

POST   /foundation-intelligence/model-versions
GET    /foundation-intelligence/model-versions
GET    /foundation-intelligence/model-versions/:id
POST   /foundation-intelligence/model-versions/:id/promote
POST   /foundation-intelligence/model-versions/:id/retire

POST   /foundation-intelligence/model-versions/:modelVersionId/evaluations
GET    /foundation-intelligence/model-versions/:modelVersionId/evaluations

GET    /foundation-intelligence/analytics/summary
GET    /foundation-intelligence/audit
```

## Frontend

File: `apps/web/app/foundation-intelligence/page.tsx`

5 tabs:
1. **Datasets** — list with status badges, provenance, isAdvisory flag
2. **Training** — jobs with status, resource limits
3. **Models** — model versions by family, status, proposedBy/approvedBy
4. **Evaluations** — list model versions with eval prompt
5. **Governance** — kill switch docs, audit trail (last 50 events)

## Governance Controls

| Control | Enforcement |
|---------|------------|
| `FI_TRAINING_JOBS` kill switch | Blocks `start()` — checked via `KillSwitchConfig.isDisabled` |
| `FI_MODEL_PROMOTION` kill switch | Blocks APPROVED→PRODUCTION only |
| Self-promotion block | `proposedBy === actorId` at PRODUCTION step → ForbiddenException |
| `hasSecrets` guard | Hardcoded false on create; dataset with hasSecrets=true cannot be validated or used for training |
| Forward-only state machine | EXPERIMENTAL→EVALUATED→APPROVED→PRODUCTION; RETIRED is terminal |
| isAdvisory | All records advisory until PRODUCTION promotion sets isAdvisory=false |
| Tenant isolation | All reads/writes scoped by companyId |
| Actor status | ACTIVE only; SUSPENDED/TERMINATED/ON_HOLD → 403 |
| Audit immutability | FiAuditService has no delete or update methods |

## Test Results

**Phase 38: 225 passed, 0 failed**

| Group | Tests | Result |
|-------|-------|--------|
| Q1: Dataset security | 15 | PASS |
| Q2: Training job security | 15 | PASS |
| Q3: Checkpoint integrity | 8 | PASS |
| Q4: Model version security | 20 | PASS |
| Q5: Evaluation security | 10 | PASS |
| Q6: Tenant isolation | 12 | PASS |
| Q7: Finance boundary | 5 | PASS |
| Q8: Audit immutability | 5 | PASS |
| Q9: Kill switch behavior | 5 | PASS |
| Q10: Regression | 10 | PASS |
| ADV: Adversarial | 45 | PASS |
| EXT: Extended coverage | 75 | PASS |
| **Total** | **225** | **ALL PASS** |

## Regression Results

| Phase | Tests | Result |
|-------|-------|--------|
| Phase 37 — Global Operations | 200 | PASS |
| Phase 36 — Capital Allocation | 107 | PASS |
| Phase 35 — Business Units | 76 | PASS |
| Phase 34 — Product Factory | 107 | PASS |

## TypeScript / Build

- `npx tsc --noEmit`: 0 errors
- `npx turbo build`: 5/5 tasks successful

## Security Grep Results

```
acWallet:        0 hits in fi-*.ts
acTransaction:   0 hits in fi-*.ts
journalEntry:    0 hits in fi-*.ts
body.companyId:  0 hits (companyId from service param only)
body.actorId:    0 hits (actorId from service param only)
```

## Files Created / Modified

Created:
- `apps/api/src/foundation-intelligence/fi-audit.service.ts`
- `apps/api/src/foundation-intelligence/fi-dataset.service.ts`
- `apps/api/src/foundation-intelligence/fi-training-job.service.ts`
- `apps/api/src/foundation-intelligence/fi-checkpoint.service.ts`
- `apps/api/src/foundation-intelligence/fi-model-version.service.ts`
- `apps/api/src/foundation-intelligence/fi-evaluation.service.ts`
- `apps/api/src/foundation-intelligence/fi-analytics.service.ts`
- `apps/api/src/foundation-intelligence/foundation-intelligence.controller.ts`
- `apps/api/src/foundation-intelligence/foundation-intelligence.module.ts`
- `apps/web/app/foundation-intelligence/page.tsx`
- `scripts/test-phase38.ts`
- `packages/database/prisma/migrations/20260923920000_phase38_foundation_intelligence/migration.sql`

Modified:
- `packages/database/prisma/schema.prisma` (enums + models appended, Company relation added)
- `apps/api/src/app.module.ts` (FoundationIntelligenceModule registered)

## Remaining Low/Info Observations

- `epochPct` stored as Int — callers must ensure integer, enforced in service
- Score/loss fields stored as String per spec — no arithmetic performed
- Kill switches are global (companyId: null) — per-company kill switches not implemented (YAGNI)
- Frontend page uses `credentials: 'include'` for cookie auth — assumes same-origin JWT cookie session
