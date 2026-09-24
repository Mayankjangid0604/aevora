# AEVORA Session Log

## Last Updated
2026-09-24 — Phase 42 COMPLETE (Steps 1–10)

## Completed Steps
- [x] Step 1 — Auth Guard Fix
- [x] Step 2 — Lead Gen
- [x] Step 3 — Sales Outreach
- [x] Step 4 — Delivery Engine
- [x] Step 5 — Survival / Financial Kill Switch
- [x] Step 6 — Voice Assistant
- [x] Step 7 — Ventures
- [x] Step 8 — Mobile Call Integration
- [x] Step 9 — Web Dashboard Updates
- [x] Step 10 — Wire the Loop

## Current Step
Phase 42 done — next: first live run against a real DB (see below)

## What was done this session
### Step 1
- Global `JwtAuthGuard` (APP_GUARD) with real `verifyAsync`; `@Public()` on `/health`, `/auth/login`, `/devices/pairing/verify`.

### Step 2
- **Extended existing `SalesLead`** instead of adding a duplicate `BusinessLead`: new cols `googlePlaceId` (unique per company), `website`, `qualityScore`, `lastContactedAt`. Status uses existing `SalesLeadStatus` (NEW/CONTACTED/QUALIFIED/DISQUALIFIED/CONVERTED; DISQUALIFIED = spec's REJECTED).
- New models `LeadGenRun`, `LeadGenAudit`. Migration `20260925000000_phase42_step2_lead_gen` (hand-written SQL, not yet applied to a DB).
- `lead-gen/lead-search.service.ts` — Google Places (New) Text Search, radius via locationBias, email scraped from website, `scoreLead()` 0–100. Mock results when `LEAD_GEN_PROVIDER_ENABLED!=true`.
- `lead-gen/lead-gen.service.ts` — orchestrator (`startAutonomousLeadGen` every `LEAD_GEN_INTERVAL_HOURS`, `runForCompany` with kill-switch check `GLOBAL_PRODUCTION`/`LEAD_GEN` + one-run-at-a-time guard) and queue (`listQueue`, atomic `dequeue`). Emits `LEAD_FOUND` SimulationEvent + `lead.found` WS to chairman.
- Controller: `GET /lead-gen/runs`, `GET /lead-gen/leads?status=`, `POST /lead-gen/trigger` (CHAIRMAN).
- tsc clean; 30 suites / 89 tests pass.

### Step 3
- Models `OutreachCampaign` (idempotencyKey `outreach:{leadId}:{channel}`), `OutreachScript`, `DiscoveryCall` (+4 enums). Migration `20260925010000_phase42_step3_sales_outreach` (generated with `prisma migrate diff`).
- Email goes through existing `IntegrationService.sendEmail` (audit log + test-mode redirect kept). `ProductionEmailProvider` now uses nodemailer SMTP when `SMTP_HOST` is set (SendGrid otherwise); PRODUCTION no longer needs a `ProviderIntegration` row when SMTP is configured.
- `sales-outreach/`: `EmailOutreachService` (template render `{{businessName}}` etc., default script if none in DB), `PhoneOutreachService` (SCHEDULED campaign + `call.scheduled` WS), `DiscoveryService` (`extractClientNeeds` via ModelGateway, `completeCall` stores needs + budget in paise, `enrichFromGoogleProfile`), `SalesAgentWorker` (own interval; sales agent = first ACTIVE employee with "sales" in role title; email→phone fallback after 3 days or on failure; `recordOutcome` → INTERESTED/BOOKED qualifies lead, creates DiscoveryCall, `lead.interested` WS).
- Endpoints under `/outreach`: `GET campaigns`, `POST campaigns/:id/outcome`, `POST process`, `GET discovery-calls`, `POST discovery-calls/:id/transcript`.
- tsc clean; 31 suites / 91 tests pass.

### Step 4
- Model `ClientProject` (+ enums `ClientProjectType`, `ClientProjectStatus` incl. FAILED). Extra cols vs spec: `clientId`, `scope`, `sampleHtml`, `revisionCount`, `paymentLinkUrl`, `paymentRef`, `lastReminderAt`, `error`. Migration `20260925020000_phase42_step4_delivery`.
- `delivery/`: `ScopeService` (ModelGateway → scope, price in paise, ₹1,000 floor), `DeliveryAgentWorker` (own interval; intakes COMPLETED DiscoveryCalls → SCOPING → BUILDING → SAMPLE_SENT, emails sample; `requestRevision` = RevisionService; also runs payment reminders), `InvoiceAndPaymentService` (`approve` → Client + existing `InvoiceService` invoice + Razorpay payment link or bank instructions; `check` reminders; `markPaid` = single tx crediting `RealMoneyAccount`, `RealMoneyTransaction` w/ idempotencyKey, invoice PAID, `RevenueRecord` RECEIVED, lead CONVERTED, then triggers lead gen + `payment.received` WS).
- **Deviation:** samples stored in DB (`sampleHtml`) and served by `GET /delivery/samples/:id` (public) with `CSP: sandbox` — not written to `apps/web/public` (AI HTML on the dashboard origin could read the JWT in localStorage).
- Razorpay webhook `POST /delivery/webhooks/razorpay` (public, HMAC verified on raw body; `rawBody: true` enabled in main.ts; amount checked vs invoice).
- Other endpoints: `GET /delivery/projects`, `POST /delivery/process`, `POST /delivery/projects/:id/{revision,approve,mark-paid}`.
- tsc clean; 32 suites / 95 tests pass.

### Step 5
- Models `SurvivalConfig` (per company, thresholds seeded from env), `SurvivalEvent`, enum `SurvivalStatus`. Migration `20260925030000_phase42_step5_survival`.
- `survival/SurvivalService.checkSurvival(companyId)`: balance from `RealMoneyAccount`; `< min` SHUTDOWN, lower half of min..warning CRITICAL, `< warning` WARNING, else HEALTHY. Transitions claimed atomically (updateMany on previous status) so side effects fire once. SHUTDOWN → upserts kill switches `SURVIVAL_FEATURES` (GLOBAL_PRODUCTION, LEAD_GEN, SALES_OUTREACH, OUTBOUND_EMAIL, DELIVERY, AGENT_WORK_CYCLES) with reason `SURVIVAL_SHUTDOWN` + `company.shutdown` WS. Recovery lifts only switches with that reason (Chairman manual switches stay). WARNING/CRITICAL → `survival.warning` WS.
- `POST /survival/deposit` (CHAIRMAN, `{amountPaise, idempotencyKey}`) → existing `EconomyService.injectChairmanCapital` → re-check. `GET /survival/status` → status + config + events + deposits.
- Fixed race in `EconomyService.injectChairmanCapital` (read-modify-write balance → `{ increment }`).
- Own 60s interval for now. tsc clean; 33 suites / 96 tests pass.

### Step 6
- Models `VoiceSession`, `VoiceCommand` (+ enum `VoiceCommandStatus` RECEIVED/EXECUTED/PENDING/FAILED). Migration `20260925040000_phase42_step6_voice`.
- `voice-assistant/VoiceCommandService.processCommand`: ModelGateway intent parse (unknown/failed → CUSTOM). STATUS_REPORT and CHECK_REVENUE answered inline from DB; PAUSE_SIMULATION → `SimulationService.pause`; COMMAND_CEO / ADD_EMPLOYEE / CUSTOM → pre-approved `ManagementDecision` targeted at the first ACTIVE employee with CEO in role title (proposerId = CEO because it is an Employee FK; Chairman in approvedBy); NEW_STARTUP_IDEA → (Step 7) `NewVentureService.spawnTeam` directly.
- Endpoints (CHAIRMAN only): `POST /voice/command {transcript, sessionId?}`, `GET /voice/commands`, `POST /voice/sessions`, `POST /voice/sessions/:id/end`.
- Web: `components/VoiceButton.tsx` (floating mic, SpeechRecognition en-IN, toast, SpeechSynthesis reply) mounted in `layout.tsx`. Web tsc clean.
- API tsc clean; tests pass.

### Step 7
- Models `Venture` (+ `plan`, `departmentId`, `firstTaskId`, `voiceCommandId`, `idempotencyKey`, `error`; status FORMING/ACTIVE/PAUSED/CLOSED/FAILED), `VentureTeam`. Migration `20260925050000_phase42_step7_ventures`.
- `ventures/NewVentureService.spawnTeam(idea, companyId, {idempotencyKey, voiceCommandId?})`: survival check first (refuses on SHUTDOWN) → ModelGateway plan (normalized: ≤ VENTURE_MAX_TEAM, always a Product Manager) → Venture FORMING → one transaction creating a `Venture: <name>` department, reusing an available employee (role title or skill match, not on another live venture) or creating an AI worker (Employee + ACWallet + Agent MANUAL + WorkerProfile AI_AGENT, role found/created) → first Task via existing `TaskService.createTask` assigned to the PM → ACTIVE + `venture.formed` WS. Failure → status FAILED with error.
- Chairman-initiated, so `chairmanApproved = true`; this bypasses the AIProvisioningRequest approval path deliberately.
- Voice `NEW_STARTUP_IDEA` calls `spawnTeam` directly (key `voice:<commandId>`); PENDING voice status no longer used.
- Endpoints: `GET /ventures`, `POST /ventures {idea, idempotencyKey}` (CHAIRMAN), `POST /ventures/:id/status {PAUSED|ACTIVE|CLOSED}`.
- tsc clean; 35 suites / 100 tests pass.

### Step 8
- **Security fix:** `RealtimeGateway` now verifies the JWT on socket connect (`auth: { token }` or Authorization header) and joins `user:<actorId>` from the token; `device:identify` no longer trusts a client-sent userId. Unauthenticated sockets are disconnected.
- `apps/mobile`: its `package-lock.json` was corrupt (dozens of empty entries; npm failed with "Invalid Version") and node_modules half-installed. Backed up the old lockfile to the session scratchpad, regenerated via `npm install`, added `expo-notifications` + `socket.io-client` via `expo install`.
- `App.js`: `useRealtime` (socket.io with JWT, `device:identify`, local notifications for call.scheduled / lead.interested / payment.received / company.shutdown / company.recovered); `CallScreen` modal (auto-opens on call.scheduled; Call Now → `tel:`; Mark as Called; outcome INTERESTED / NOT_INTERESTED / No answer→NO_RESPONSE → `POST /outreach/campaigns/:id/outcome`; on INTERESTED shows discovery-notes box → `POST /outreach/discovery-calls/:id/transcript`); dashboard lists "Calls to make" (PHONE+SCHEDULED campaigns) and "Leads awaiting follow-up" (CONTACTED/QUALIFIED) → `LeadProfile` modal with contact history. Removed the old "calling not enabled" placeholder card.
- Jest: `@nestjs/jwt` v12 is ESM-only; added `apps/api/tsconfig.spec.json` (allowJs, esModuleInterop) and jest `transformIgnorePatterns` so specs importing the gateway load.
- Verified: `npx expo export --platform android` bundles; API tsc clean, tests pass.

### Step 9
- `/sales`: new **Outreach** tab (`components/OutreachPanel.tsx`) — lead funnel NEW→CONTACTED→QUALIFIED→CONVERTED, campaigns table, open-pipeline / won totals from ClientProjects, buttons for `POST /lead-gen/trigger` and `POST /outreach/process`.
- New `/delivery` (kanban Scoping → Building → Sample sent → Approved/Invoiced → Paid; actions: open sample, Client approved, Revision (prompt), Pay link, Mark paid (prompt for ref → idempotencyKey `manual:<ref>`), Run delivery agent).
- New `/survival` (status, balance, thresholds, gauge with threshold markers, deposit form → `POST /survival/deposit` with random idempotency key, deposit log, status history).
- New `/ventures` (create from idea, cards with team/timeline, pause/resume/close).
- Sidebar links added. Mic button was Step 6.
- **Bug fix:** `sales`, `acquisition`, `customer-operations` pages read `localStorage.auth_token`, but login stores `aevora_jwt` → every call 401'd once auth was enforced. Now read `aevora_jwt`.
- Web `tsc` clean, `next build` succeeds.

### Step 10
- `simulation/business-loop.service.ts` (`BusinessLoopService`): per company 1 `SurvivalService.checkSurvival` (not alive → stop) → 2 lead gen if ≥ `LEAD_GEN_INTERVAL_HOURS` since last `LeadGenRun` (real time, persisted) → 3 `SalesAgentWorker.processQueue` → 4 `DeliveryAgentWorker.processQueue` → 5 `InvoiceAndPaymentService.check`. Each step isolated (one failure doesn't stop the rest). (6) voice is synchronous per request; (7) venture agents run via normal work cycles.
- Tick calls `businessLoop.runIfDue()` — background, not awaited, own lock, throttled by `BUSINESS_LOOP_INTERVAL_MS` real time (LLM/SMTP/Places must not stall the 1s tick or scale with sim speed). Only runs while the simulation is RUNNING (so voice "pause" pauses the business too).
- Work cycles gated: `scheduleWorkCycles` and the `EMPLOYEE_WORK_CYCLE` handler skip agents whose company has `GLOBAL_PRODUCTION`/`AGENT_WORK_CYCLES` disabled (what survival SHUTDOWN sets) or who are on PAUSED/CLOSED/FAILED ventures.
- Venture agents now created ASSISTED (MANUAL agents never get work cycles).
- CEO context now includes `chairmanDirectives` (approved CHAIRMAN_VOICE ManagementDecisions from the last 7 days targeted at them).
- Removed per-service timers + `processAll` + unused `startAutonomousLeadGen`; payment reminders moved out of the delivery worker into the loop. Obsolete env vars removed; added `BUSINESS_LOOP_INTERVAL_MS`.
- Verified: tsc clean; 36 suites / 104 tests (new `business-loop.service.spec.ts`: order, shutdown stop, lead-gen due/conflict, throttle); `nest build` + boot with an unreachable DB: every module's DI resolves and all new routes map (stops only at Prisma connect).

## What to do next session
Phase 42 is code-complete. First live run:
1. `cd packages/database && npx prisma migrate deploy` (steps 2–7 migrations).
2. Ensure the Chairman has a password hash (login is now enforced) and a company.
3. Create an ACTIVE employee whose role title contains "sales" (sales loop needs one) and one with "CEO" (voice directives).
4. `POST /survival/deposit` so the company isn't SHUTDOWN, start the simulation, watch logs for `BusinessLoopService`.
5. Keep `OUTREACH_ENVIRONMENT=SANDBOX` and `LEAD_GEN_PROVIDER_ENABLED=false` until a mock run looks right; then enable SMTP / Places / Razorpay one at a time.

## Known issues
- Web/desktop/mobile must now log in (`POST /auth/login`) — local single-user bypass is gone. Chairman needs `credentialHash` set in DB.
- Migration must be applied: `cd packages/database && npx prisma migrate deploy`.
- Email replies are not read automatically; the Chairman logs outcomes via `POST /outreach/campaigns/:id/outcome` (inbox polling = later).
- Sales worker does nothing until a company has an ACTIVE employee whose role title contains "sales".
- Apply migrations: steps 2–7.
- Voice needs Chrome/Edge (Web Speech API) and a logged-in Chairman JWT.
- A company with no RealMoneyAccount / zero balance goes to SHUTDOWN on the first survival check — deposit first (`POST /survival/deposit`).
- Client-project invoices are created with environment SANDBOX (InvoiceService requires an ApprovalRequest for PRODUCTION). Real money is still credited on payment.
- Client replies (revision/approval) are logged by the Chairman via endpoints; no inbox parsing.
- Never run against a live DB: DI/boot verified with an unreachable DB only; flows verified by unit tests on pure logic + tsc.
- WebSocket: connection is JWT-verified (Step 8), but `device:identify` does not check that the deviceId belongs to the user (device rooms are only used by broadcastToDevice).

## Environment variables to add to .env.example
LEAD_GEN_PROVIDER_ENABLED, GOOGLE_PLACES_API_KEY, LEAD_GEN_CATEGORIES, LEAD_GEN_LOCATION, LEAD_GEN_RADIUS_M, LEAD_GEN_INTERVAL_HOURS, SMTP_*, OUTREACH_FROM_NAME, OUTREACH_ENVIRONMENT, OUTREACH_FOLLOWUP_DAYS, SALES_BATCH_SIZE, CHAIRMAN_NAME, COMPANY_NAME, PUBLIC_API_URL, PAYMENT_REMINDER_DAYS, RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET, BANK_TRANSFER_INSTRUCTIONS, MIN_BALANCE_PAISE, WARNING_BALANCE_PAISE, VENTURE_MAX_TEAM, BUSINESS_LOOP_INTERVAL_MS (all added to .env.example).
