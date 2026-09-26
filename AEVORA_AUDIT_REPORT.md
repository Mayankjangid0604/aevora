# AEVORA Full Audit Report

**Generated:** 2026-09-24  
**Scope:** Complete codebase audit — Phases 1–43

---

## 1. What Is Actually Built (Code Exists)

### Backend (apps/api/src/)

**Core modules (Phases 1–41, pre-existing):**
- `prisma/`, `company/`, `department/`, `employee/`, `role/`, `authorization/`
- `agent/`, `goal/`, `task/`, `workload/`, `performance/`
- `simulation/`, `economy/`, `chairman/`, `devices/`
- `client/`, `crm/`, `inquiry/`, `opportunity/`, `proposal/`, `project/`
- `receptionist/`, `project-execution/`, `company-operations/`
- `communication/`, `knowledge/`, `intelligence/`, `research/`, `compute/`
- `integration/`, `job/`, `approval/`, `invoice/`, `logger/`
- `production/`, `finance/`, `sales/`, `customer-operations/`, `marketing/`
- `workforce/`, `management/`, `strategy/`, `lab/`, `model-platform/`
- `product-factory/`, `business-units/`, `capital-allocation/`
- `global-operations/`, `foundation-intelligence/`, `rd-flywheel/`
- `autonomous-enterprise/`, `outreach/`, `world-engine/`

**Phase 42 modules (The Business Loop):**
- `lead-gen/` — LeadSearchService (Google Places + mock), LeadGenService (orchestrator), controller
- `sales-outreach/` — EmailOutreachService, PhoneOutreachService, DiscoveryService, SalesAgentWorker, controller
- `delivery/` — ScopeService, DeliveryAgentWorker, InvoiceAndPaymentService, controller
- `survival/` — SurvivalService (financial kill switch), controller
- `voice-assistant/` — VoiceCommandService, controller
- `ventures/` — NewVentureService, controller
- `simulation/business-loop.service.ts` — BusinessLoopService (the unified tick loop)

**Phase 43 modules (The Thinking CEO):**
- `ceo/` — CeoReviewService, CeoDecisionsService, PipelineManagementService, SelfImprovementService, WeeklyReportService, CeoDialogueService, CeoFeed, controller

### Frontend (apps/web/app/)
33 pages total. Key Phase 42–43 additions:
- `/delivery` — Kanban for client projects
- `/survival` — Status, balance, deposit form
- `/ventures` — Create/manage AI ventures
- `/sales` — Outreach tab added (OutreachPanel.tsx)
- `/management` — Reports tab (WeeklyReports.tsx)
- Components: VoiceButton, RealtimeToasts, CeoActivityCard, AskCeoCard, CeoQuestionDialog, AuthGate

### Mobile (apps/mobile/)
Single-file `App.js` with:
- Login screen
- Dashboard (Calls to make, Leads awaiting follow-up, CEO Updates, CEO Questions)
- CallScreen modal, LeadProfile modal, WeeklyReportScreen, CeoQuestionScreen
- Socket.io realtime with JWT auth
- Push notifications via expo-notifications

### Compilation Status
- **TypeScript:** 1,908 errors after `prisma generate` (down from 2,417 before)
  - 1,892 are TS2339 ("Property does not exist on PrismaService") — PrismaService does not extend PrismaClient properly
  - 14 are TS2307 (missing module declarations, mainly `@aevora/model-gateway`)
  - Root cause: PrismaService wrapper doesn't expose Prisma model delegates as typed properties
- **Tests:** 8 PASS, 34 FAIL out of 42 suites. 10 tests pass total.
  - Passing: client/inquiry/receptionist/proposal/project/opportunity controllers, lead-search.service, ceo-feed
  - Failing: all service specs (same PrismaService typing issue blocks mocking)

---

## 2. What Is Registered in app.module.ts (Wired Into NestJS)

All of these modules are imported in `AppModule`:

| Module | Status |
|--------|--------|
| PrismaModule | ✅ Registered |
| EconomyModule | ✅ |
| CompanyModule | ✅ |
| DepartmentModule | ✅ |
| EmployeeModule | ✅ |
| RoleModule | ✅ |
| AuthorizationModule | ✅ |
| AgentModule | ✅ |
| GoalModule | ✅ |
| TaskModule | ✅ |
| WorkloadModule | ✅ |
| PerformanceModule | ✅ |
| SimulationModule | ✅ |
| ClientModule | ✅ |
| CrmModule | ✅ |
| InquiryModule | ✅ |
| OpportunityModule | ✅ |
| ProposalModule | ✅ |
| ProjectModule | ✅ |
| ReceptionistModule | ✅ |
| ProjectExecutionModule | ✅ |
| CompanyOperationsModule | ✅ |
| ChairmanModule | ✅ |
| DevicesModule | ✅ |
| CommunicationModule | ✅ |
| KnowledgeModule | ✅ |
| IntelligenceModule | ✅ |
| ResearchModule | ✅ |
| ComputeModule | ✅ |
| IntegrationModule | ✅ |
| JobModule | ✅ |
| ApprovalModule | ✅ |
| InvoiceModule | ✅ |
| LoggerModule | ✅ |
| ProductionModule | ✅ |
| FinanceModule | ✅ |
| SalesModule | ✅ |
| CustomerOperationsModule | ✅ |
| MarketingModule | ✅ |
| WorkforceModule | ✅ |
| ManagementModule | ✅ |
| StrategyModule | ✅ |
| LabModule | ✅ |
| ModelPlatformModule | ✅ |
| ProductFactoryModule | ✅ |
| BusinessUnitsModule | ✅ |
| CapitalAllocationModule | ✅ |
| GlobalOperationsModule | ✅ |
| FoundationIntelligenceModule | ✅ |
| RdFlywheelModule | ✅ |
| AutonomousEnterpriseModule | ✅ |
| OutreachModule | ✅ |
| LeadGenModule | ✅ |
| SalesOutreachModule | ✅ |
| DeliveryModule | ✅ |
| SurvivalModule | ✅ |
| VoiceAssistantModule | ✅ |
| VenturesModule | ✅ |
| WorldEngineModule | ✅ |

---

## 3. What Is NOT Wired (Code Exists But Not in app.module.ts)

| Module | Directory | Impact |
|--------|-----------|--------|
| **CeoModule** | `apps/api/src/ceo/ceo.module.ts` | **CRITICAL** — The entire Phase 43 "Thinking CEO" is dead code. CEO reviews, pipeline management, self-improvement, weekly reports, CEO questions, CEO feed — none of it loads. No `/ceo/*` routes are registered. BusinessLoopService calls to CeoReviewService will fail at runtime with DI errors. |

This is the **single biggest bug** in the codebase. All of Phase 43 (6 sub-steps) is built but not connected.

---

## 4. Database: Migrations vs Schema

### Migrations that exist (31 total):
1. `20260919190721_init_phase_5` — Core models
2. `20260919192537_init_phase_6a` — Client/Opportunity/Proposal
3. `20260919194028_init_phase_6b` — Project execution
4. `20260919231953_init_phase_6c` — Company operations
5. `20260922111500_phase24_remediation`
6. `20260922120000_phase26_autonomous_sales`
7. `20260923000000_phase28_finance_cfo`
8. `20260923100000_phase29_workforce`
9. `20260923200000_phase30_management`
10. `20260923300000_phase31_strategy`
11. `20260923400000_audit_fix_forecast_version_unique`
12. `20260923500000_phase32_research_lab`
13. `20260923600000_phase33_model_platform`
14. `20260923700000_phase34_product_factory`
15. `20260923800000_phase35_business_units`
16. `20260923900000_phase36_capital_allocation`
17. `20260923910000_phase37_global_operations`
18. `20260923920000_phase38_foundation_intelligence`
19. `20260923930000_phase39_rd_flywheel`
20. `20260923940000_phase40_autonomous_enterprise`
21. `20260923950000_phase41_connected_devices`
22. `20260924000000_phase41_world_engine`
23. `20260925000000_phase42_step2_lead_gen`
24. `20260925010000_phase42_step3_sales_outreach`
25. `20260925020000_phase42_step4_delivery`
26. `20260925030000_phase42_step5_survival`
27. `20260925040000_phase42_step6_voice`
28. `20260925050000_phase42_step7_ventures`
29. `20260926000000_phase43_step1_ceo_review`
30. `20260926010000_phase43_step2_pipeline`
31. `20260926020000_phase43_step3_weekly_report`
32. `20260926030000_phase43_step4_self_improvement`
33. `20260926040000_phase43_step6_ceo_dialogue`

### Status:
- Migration files exist for all schema models
- **No migrations have been applied to any database** (hand-written SQL, never deployed)
- Schema and migrations appear consistent (Phase 43 step 5 had no migration; confirmed)
- `prisma migrate deploy` must be run before first use

---

## 5. Frontend Pages and API Endpoints They Call

| Page | API Endpoints Called |
|------|-------------------|
| `/` (overview) | `/api/company`, `/api/employees`, `/api/simulation` + WebSocket |
| `/sales` | `/lead-gen/runs`, `/lead-gen/leads`, `/outreach/campaigns`, `/outreach/process`, `/lead-gen/trigger`, `/delivery/projects` |
| `/delivery` | `/delivery/projects`, `/delivery/process`, `/delivery/projects/:id/*` |
| `/survival` | `/survival/status`, `/survival/deposit` |
| `/ventures` | `/ventures`, `POST /ventures`, `POST /ventures/:id/status` |
| `/management` | `/ceo/weekly-reports`, `POST /ceo/weekly-reports/run` (Reports tab) |
| `/simulation` | `/simulation/*` |
| `/employees` | `/employees/*` |
| `/departments` | `/departments/*` |
| `/projects` | `/projects/*` |
| `/financials` | `/finance/*` |
| `/communication` | `/communication/*` |
| `/knowledge` | `/knowledge/*` |
| `/research` | `/research/*` |
| `/decisions` | `/management/*` |
| `/alerts` | `/company-operations/alerts/*` |
| `/activity` | `/simulation/events/*` |
| `/acquisition` | `/sales/*`, `/outreach/*` |
| `/customer-operations` | `/customer-operations/*` |
| `/marketing` | `/marketing/*` |
| `/workforce` | `/workforce/*` |
| `/strategy` | `/strategy/*` |
| `/lab` | `/lab/*` |
| `/model-platform` | `/model-platform/*` |
| `/product-factory` | `/product-factory/*` |
| `/business-units` | `/business-units/*` |
| `/capital-allocation` | `/capital-allocation/*` |
| `/global-operations` | `/global-operations/*` |
| `/foundation-intelligence` | `/foundation-intelligence/*` |
| `/rd-flywheel` | `/rd-flywheel/*` |
| `/autonomous-enterprise` | `/autonomous-enterprise/*` |
| `/world` | `/world-engine/*` |

**Components always loaded (layout.tsx):**
- `VoiceButton.tsx` — `POST /voice/command`
- `RealtimeToasts.tsx` — WebSocket events
- `CeoQuestionDialog.tsx` — `GET /ceo/questions`, `POST /ceo/questions/:id/answer`
- `CeoActivityCard.tsx` — `GET /ceo/feed`
- `AskCeoCard.tsx` — `POST /ceo/ask`

**Bug fixed in Phase 42 Step 9:** Pages now use `aevora_jwt` from localStorage (was `auth_token`/`token`).

---

## 6. Mobile: Screens and Functionality

**App.js** (single-file Expo app):

| Screen | What It Does |
|--------|-------------|
| **LoginScreen** | Email/password → `POST /auth/login` → stores JWT in AsyncStorage |
| **Dashboard (Home)** | Cards: CEO Questions (from `/ceo/feed`), CEO Updates, Latest Weekly Report, Calls to Make (PHONE+SCHEDULED campaigns), Leads Awaiting Follow-up |
| **CallScreen** (modal) | Auto-opens on `call.scheduled` WS event. "Call Now" → `tel:` URI. Mark as Called. Outcome: INTERESTED/NOT_INTERESTED/NO_RESPONSE → `POST /outreach/campaigns/:id/outcome`. On INTERESTED → discovery notes → `POST /outreach/discovery-calls/:id/transcript` |
| **LeadProfile** (modal) | Contact history for a lead |
| **WeeklyReportScreen** (modal) | Full CEO weekly report display |
| **CeoQuestionScreen** (modal) | Answer CEO questions → `POST /ceo/questions/:id/answer` |

**Realtime:** socket.io with JWT auth. Events: `call.scheduled`, `lead.interested`, `payment.received`, `company.shutdown`, `company.recovered`, `ceo.weekly_report`, `ceo.question`, `ceo.activity`.

---

## 7. Environment Variables

### Set in .env.example (with defaults):
| Variable | Default | Critical? |
|----------|---------|-----------|
| `DATABASE_URL` | `postgresql://aevora:secret@localhost:5432/aevoradb` | **YES** |
| `REDIS_URL` | `redis://localhost:6379` | No (unused by core loop) |
| `PORT_API` | `3000` | Yes |
| `PORT_WEB` | `3001` | Yes |
| `LEAD_GEN_PROVIDER_ENABLED` | `false` | No (uses mocks when false) |
| `GOOGLE_PLACES_API_KEY` | empty | Only if LEAD_GEN_PROVIDER_ENABLED=true |
| `LEAD_GEN_CATEGORIES` | `restaurant,salon,...` | Has default |
| `LEAD_GEN_LOCATION` | `Sikar, Rajasthan, India` | Has default |
| `LEAD_GEN_RADIUS_M` | `50000` | Has default |
| `LEAD_GEN_INTERVAL_HOURS` | `6` | Has default |
| `SMTP_HOST/PORT/USER/PASS` | Gmail defaults | **YES for real email** |
| `OUTREACH_FROM_NAME` | `AEVORA Team` | Has default |
| `OUTREACH_ENVIRONMENT` | `SANDBOX` | Safe default |
| `CHAIRMAN_NAME` | `Mayank Jangid` | Has default |
| `COMPANY_NAME` | `SAAHVIK Tech` | Has default |
| `PUBLIC_API_URL` | `http://localhost:3000` | **YES for production** |
| `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | empty | **YES for payments** |
| `BANK_TRANSFER_INSTRUCTIONS` | `UPI: yourname@upi` | Needs customization |
| `MIN_BALANCE_PAISE` | `50000` (₹500) | Has default |
| `WARNING_BALANCE_PAISE` | `200000` (₹2,000) | Has default |
| `VENTURE_MAX_TEAM` | `5` | Has default |
| `BUSINESS_LOOP_INTERVAL_MS` | `60000` | Has default |
| `CEO_REVIEW_MIN_INTERVAL_MIN` | `15` | Has default |

### Missing from .env.example but referenced in code:
| Variable | Where Used |
|----------|-----------|
| `JWT_SECRET` | AuthorizationModule (critical!) |
| `OLLAMA_URL` / `OLLAMA_MODEL` | model-gateway package (LLM calls) |
| `ENABLE_REAL_PRODUCTION_SENDING` | IntegrationService email |
| `TEST_EMAIL_RECIPIENT` | Sandbox email redirect |
| `PAYMENT_REMINDER_DAYS` | Listed in .env.example ✓ |

---

## 8. Deployment Readiness

### Frontend on Vercel
**Env vars needed:**
- `NEXT_PUBLIC_API_URL` — Backend URL (e.g., `https://api.aevora.com`)
- `NEXT_PUBLIC_WS_URL` — WebSocket URL (same as API for socket.io)

**Status:** `next build` succeeds. Ready to deploy after setting env vars.

### Backend on Render
**Env vars needed:**
- `DATABASE_URL` — Neon connection string
- `JWT_SECRET` — Secret for JWT signing
- `PORT_API` — Usually `3000` or `$PORT`
- `OLLAMA_URL` — URL to Ollama instance (or external LLM API)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — For email
- `OUTREACH_ENVIRONMENT` — `SANDBOX` to start
- `PUBLIC_API_URL` — Render service URL
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — For payments
- All other vars from .env.example

**Build command:** `npm install && cd packages/database && npx prisma generate && cd ../../apps/api && npm run build`
**Start command:** `node dist/main.js`

**Blockers:**
1. CeoModule not registered — must fix app.module.ts first
2. PrismaService typing issues — may prevent compilation on strict builds
3. Migrations must be applied before first start

### Database on Neon
**Connection string format:** `postgresql://<user>:<password>@<host>/<database>?sslmode=require`
- Neon provides this in the dashboard
- Must run `npx prisma migrate deploy` after setting DATABASE_URL

### Local Ollama
- **Model needed:** Whatever `@aevora/model-gateway` defaults to (likely `llama3` or similar)
- **How API connects:** Via `OLLAMA_URL` env var (default `http://localhost:11434`)
- Used by: CEO reviews, delivery scoping, outreach script generation, voice command parsing, venture planning, discovery call analysis

---

## 9. What Breaks First When You Start the System

**In order of failure:**

1. **`prisma migrate deploy` not run** → Prisma client connects but finds no tables → every DB query crashes
2. **No `JWT_SECRET` set** → Auth module fails to sign/verify tokens → no login possible
3. **CeoModule not in AppModule** → DI resolution fails if BusinessLoopService tries to inject CeoReviewService → potential crash at startup (or silent failure of CEO review step)
4. **No Chairman with `credentialHash` in DB** → Login impossible (no user to authenticate)
5. **No Company/Employee seed data** → Business loop has nothing to operate on
6. **No RealMoneyAccount** → First survival check → SHUTDOWN → all kill switches activated → loop stops everything
7. **No ACTIVE employee with "sales" in role title** → Sales worker does nothing
8. **No ACTIVE employee with "CEO" in role title** → CEO review service skips all reviews
9. **OLLAMA_URL not set or Ollama not running** → All LLM-dependent operations fail (scoping, outreach scripts, CEO reviews)
10. **PrismaService type mismatch** → If the build step uses strict checking, `nest build` may fail before the app even starts

---

## 10. Exact Ordered Fix List: Getting the Base Loop Working

**Goal: Find leads → Email them → Crack a deal → Get paid**

### Step 1: Fix CeoModule Registration
```typescript
// In apps/api/src/app.module.ts — add import and registration
import { CeoModule } from './ceo/ceo.module';
// Add CeoModule to imports array
```

### Step 2: Fix PrismaService
The `PrismaService` class must extend `PrismaClient` from `@prisma/client` so that `this.prisma.salesLead`, `this.prisma.clientProject`, etc. resolve. Check `apps/api/src/prisma/prisma.service.ts` — it likely needs to be:
```typescript
import { PrismaClient } from '@prisma/client';
export class PrismaService extends PrismaClient { ... }
```

### Step 3: Generate Prisma Client + Apply Migrations
```bash
cd packages/database
npx prisma generate
npx prisma migrate deploy
```

### Step 4: Set Critical Environment Variables
```bash
JWT_SECRET=<random-32-char-string>
DATABASE_URL=<neon-connection-string>
OLLAMA_URL=http://localhost:11434  # or remote
OUTREACH_ENVIRONMENT=SANDBOX
```

### Step 5: Seed the Database
Create (via API or direct SQL):
1. A **Chairman** with `credentialHash` (for login)
2. A **Company** owned by that Chairman
3. A **RealMoneyAccount** for the company with balance ≥ `WARNING_BALANCE_PAISE` (₹2,000+)
4. An **Employee** with role title containing "CEO" (ACTIVE)
5. An **Employee** with role title containing "sales" (ACTIVE), with an Agent (ASSISTED)
6. A **SimulationState** for the company (status: RUNNING)

### Step 6: Start Ollama
```bash
ollama serve
ollama pull llama3  # or whichever model model-gateway expects
```

### Step 7: Start the API
```bash
cd apps/api && npm run start
```

### Step 8: Login and Deposit
```bash
# Login as Chairman
curl -X POST http://localhost:3000/auth/login -d '{"email":"...","password":"..."}'

# Deposit money to avoid SHUTDOWN
curl -X POST http://localhost:3000/survival/deposit \
  -H "Authorization: Bearer <jwt>" \
  -d '{"amountPaise": 1000000, "idempotencyKey": "seed-deposit-1"}'
```

### Step 9: Trigger Lead Generation
```bash
curl -X POST http://localhost:3000/lead-gen/trigger \
  -H "Authorization: Bearer <jwt>"
```
With `LEAD_GEN_PROVIDER_ENABLED=false`, this generates mock leads.

### Step 10: Process Sales Outreach
```bash
curl -X POST http://localhost:3000/outreach/process \
  -H "Authorization: Bearer <jwt>"
```
With `OUTREACH_ENVIRONMENT=SANDBOX`, emails are logged but not sent.

### Step 11: Simulate a Deal
- Use the mobile app or API to mark a campaign outcome as `INTERESTED`
- Complete a discovery call with budget and needs
- Delivery agent will scope → build → send sample
- Chairman approves → invoice generated → mark paid

### Step 12: Verify the Loop
Once the simulation is RUNNING, the `BusinessLoopService` should automatically:
1. Check survival (every tick)
2. Run lead gen (every `LEAD_GEN_INTERVAL_HOURS`)
3. Process sales queue
4. Process delivery queue
5. Check payments/reminders
6. Run CEO review (every sim hour, ≥15 real minutes)

Monitor via:
- `GET /survival/status`
- `GET /lead-gen/runs`
- `GET /outreach/campaigns`
- `GET /delivery/projects`
- `GET /ceo/reviews`
- WebSocket events in browser console

---

## Summary

| Metric | Value |
|--------|-------|
| Total backend modules | 58 |
| Registered in AppModule | 57 |
| **NOT registered** | **1 (CeoModule — all of Phase 43)** |
| Prisma migrations | 33 files |
| Migrations applied | 0 (none deployed) |
| Web pages | 33 |
| Mobile screens | 6 |
| TypeScript errors | 1,908 (1,892 from PrismaService typing) |
| Test suites | 42 (8 pass, 34 fail) |
| Individual tests | 10 pass |
| Critical env vars missing from .env.example | JWT_SECRET, OLLAMA_URL |
| Deployment blockers | 3 (CeoModule, PrismaService types, migrations) |
