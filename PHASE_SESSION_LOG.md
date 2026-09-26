# AEVORA Session Log

## Last Updated
2026-09-24 — Phase 44 AUDIT & FIX (deployment blockers resolved)

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

## Phase 43 — The Thinking CEO
- [x] 43-1 CEO Business Review Cycle
- [x] 43-2 Proactive Pipeline Management
- [x] 43-3 Weekly Report to Chairman
- [x] 43-4 Self-Improvement Loop
- [x] 43-5 Chairman Notification Feed
- [x] 43-6 CEO ↔ Chairman Dialogue

## Phase 44 — Audit & Deployment Fix
- [x] 44-1 Full codebase audit (AEVORA_AUDIT_REPORT.md)
- [x] 44-2 Register CeoModule in app.module.ts (Phase 43 was dead code)
- [x] 44-3 Build workspace packages (database, model-gateway, shared)
- [x] 44-4 Add missing env vars to .env.example (JWT_SECRET, OLLAMA_BASE_URL, etc.)
- [x] 44-5 Create .env.local.example (Windows/Neon/Gmail ready)
- [x] 44-6 Fix seed-employees.js (speedMultiplier, SurvivalConfig)
- [x] 44-7 Create start.bat (Windows one-click startup)

## Phase 44 Part 1 — Company Structure & Model Tiers (2026-09-25)
- [x] P1-1 .env/.env.example: CEO_MODEL=phi4, MODEL_TIER_1..4, BUDGET_TIER_1..3_MAX, BRIEF_OUTPUT_DIR, COMPANY_PHONE, CLAUDE_CODE_ENABLED. `briefs/pending|completed/` (+ .gitkeep), `.gitignore` briefs/pending/*.md. No models pulled.
- [x] P1-2 `packages/model-gateway/src/model-tier.ts` (ModelTier, getTierConfig, getBudgetTier, shouldUseComplexModel) + `ModelGateway.callWithTier` (Anthropic Messages API when ANTHROPIC_API_KEY set, else falls back to LOCAL_BASIC; Ollama /api/generate). Exported from index; gateway rebuilt.
- [x] P1-3 `scripts/seed-company-structure.js` (idempotent): 6 departments, 23 roles, ARIA/NOVA/PIXEL/FORGE with Agent config {systemInstructions, model, modelTier}, Rs5000 floor, ACWallet 5,000,000, Survival HEALTHY, SimulationState if missing, active OutreachScript bodies → SAAHVIK Hindi template. Adapted from spec to schema: no Department.description / unique keys (find-or-create), no Role.isAiRole, SUPERVISED→CONTROLLED, `balance` not `balancePaise`, matches existing employees by name.
- [x] P1-4 `CeoReviewService`: review uses `callWithTier(LOCAL_BASIC)`; re-runs with LOCAL_COMPLEX when decisions include HIRE_AGENT/CREATE_VENTURE/ESCALATE_TO_CHAIRMAN or pipeline/balance/paid > 5,000,000 paise (logs "CEO using complex model for:"). `answerChairman` uses LOCAL_BASIC. New `parseJson` extracts JSON from raw replies.
- [x] P1-5 `ScopeService`: `getBudgetTier(pricePaise)` stored as `scope.modelTier`; above LOCAL_BASIC writes `briefs/pending/<projectId>.md` (`buildBrief`, resolved from repo root like main.ts). Brief content format chosen by us (spec text was truncated).
- [x] P1-6 Signatures: `emailSignature()` in email-outreach.service → "Team SAAHVIK Tech | saahvik2026@gmail.com | +91 9530301131". Used by default/follow-up templates (`{{signature}}`), AI-written outreach (appended), pipeline follow-up/referral, delivery sample, invoice emails, WhatsApp. `{{chairmanName}}` now resolves to "Team SAAHVIK Tech" so stored/LLM scripts never leak the personal name. SMTP from-name default → SAAHVIK Tech.
- [x] P1-7 tsc 0 errors (api, model-gateway, web); `nest build` OK; jest 41/42 suites (integration.service.spec fails — pre-existing stale `src/integration/integration.service.js` shadows the .ts). Added budget-tier boundary test.
- [x] P1-8 API boots clean ("Nest application successfully started", no DI errors), /health ok. DB: 6 depts, 4 employees ACTIVE, Rs5000, 5,000,000 AC, HEALTHY.

## Phase 44 Part 2 — The Assistant Layer (2026-09-25)
- [x] P2-1 Models `AssistantMessage`, `PcTask` (+ Company relations). Migration `20260927010000_phase44_part2_assistant` (only these tables; applied via `migrate deploy`). Live DB has older drift: `InboundMessage` table + ~40 FKs missing.
- [x] P2-2 `assistant/` module: `POST /assistant/message`, `GET /assistant/messages`, `GET /assistant/pc-tasks` (JWT + CHAIRMAN). `AssistantService.processMessage` → phi4 intent (`normalizeAssistantIntent`, unknown → CUSTOM) → STATUS_REPORT / COMMAND_CEO / NEW_VENTURE (spawnTeam) / FIND_LEADS (background) / PAUSE|RESUME_SIMULATION / CHECK_REVENUE / WHATSAPP_MESSAGE (PcTask) / ASK_CEO (answerChairman) / CUSTOM (→ CEO directive). Directives use the voice shape (`payload.source = CHAIRMAN_VOICE`, `via = ASSISTANT`) so the CEO reads them. Both messages stored; `assistant.reply` WS to Chairman.
- [x] P2-3 `VoiceButton`: mic + 💬 text panel + quick commands → /assistant/message, speaks reply.
- [x] P2-4 `/assistant` page (chat + PC tasks), nav "Assistant" (lucide Bot) second in Command. Web has no Tailwind → `.assistant-*` styles in globals.css.
- [x] P2-5 CEO snapshot `chairmanMessages` (Chairman → Assistant, last 24h, DONE, max 5).
- [x] P2-6 tsc 0/0/0, nest build OK, jest 42/43 (stale integration .js).
- [x] P2-7 Live: status report + CEO directive via HTTP; /assistant page + floating panel verified in browser. Replies ~40–65 s (phi4 on CPU).
- `.claude/launch.json` `aevora-api-safe` now runs on 13000 (web's API port).

## Phase 44 Part 3 — Fast Responses (2026-09-26)
- [x] P3-1 `node-cache` dep; `assistant/response-cache.service.ts` (per-company TTLs, side-effect intents TTL 0, PARSED_INTENT 10 min). Imported via `import X = require()` (API tsconfig has no esModuleInterop).
- [x] P3-2 `detectSimpleIntent` (pure, exported): ASK_CEO / COMMAND_CEO ("tell CEO …") / NEW_VENTURE ("idea: …") by prefix; pause/resume/find-leads only as whole phrases; status/revenue loose. Then cached phi4 parse, then phi4.
- [x] P3-3 Cached status/revenue (30 s), Ask-CEO (2 min, keyed by question); invalidateAll on pause/resume; FIND_LEADS throttled 5 min.
- [ ] P3-4 CEO snapshot cache — skipped: snapshot measured 0.6–0.9 s; reviews ≥15 min apart so a 5-min cache never hits; stale snapshot would replay read directives.
- [x] P3-5 /assistant shows last response time + cache note.
- [x] P3-6 tsc 0/0/0, build OK, assistant tests 8/8.
- [x] P3-7 Live: status 1.6 s → 0.44 s cached; revenue 0.96 s → 0.35 s; "Tell CEO …" 0.81 s; "kitna paisa hai" 0.60 s; unmatched phi4 path 163 s → 0.64 s repeated.

## Phase 44 — DB incident & rebuild (2026-09-26)
- Live Neon schema wiped by `prisma migrate diff --shadow-database-url $DATABASE_URL` (Claude's error). NEVER pass DATABASE_URL as a shadow DB; never `migrate dev`/`reset` here. Schema changes: hand-written SQL + `migrate deploy`.
- Rebuilt: baselined 21 existing migrations, fixed `phase41_world_engine` (duplicate AIProvisioningRequest index → DROP IF EXISTS first), deployed 14, added `20260927015000_backfill_customer_ops_marketing_inbound` (18 tables never in any migration). 36 migrations, 0 drift. create-admin + seed-company-structure re-run. All previous business data lost.

## Phase 44 Part 4 — Ideas (2026-09-26)
- [x] P4-1 `StartupIdea` model + migration `20260927020000_phase44_part4_ideas`.
- [x] P4-2 `ideas/` module: submit (async phi4 evaluation), `normalizeEvaluation` (score decides, NEED_INFO → question), answer → re-evaluate, approve/reject, `createVentureFromIdea` (spawnTeam, idempotent `idea-<id>`), `generateCeoIdea` (1 per 7 days, checked before the model call). `parseJson` moved to `common/parse-json.ts`.
- [x] P4-3 `/ideas` endpoints (JWT + CHAIRMAN, company-scoped).
- [x] P4-4 CEO review: Monday → `generateCeoIdea` (background). Assistant NEW_VENTURE → `ideas.submitIdea`.
- [x] P4-5 `/ideas` page + nav (Lightbulb).
- [x] Fix: `NewVentureService.formTeam` transaction timeout 60 s (Neon latency broke every venture); FAILED venture re-formed on retry.
- [x] Live: WhatsApp-restaurants idea 7/10 → SikarDineBot (3); CEO idea AgriConnect 8/10 → venture auto-formed.

- Hindi outreach template `local-business-hindi-english` upserted (only active EMAIL script).

## Phase 44 Part 5 — Marketing / PIXEL (2026-09-26)
- [x] P5-1 `ContentPost`, `ContentCalendar` + migration `20260927030000_phase44_part5_marketing_content`.
- [x] P5-2/3 `marketing-content/` module: generatePost, generateWeeklyCalendar (ISO week, tx, P2002-safe, LOCAL_COMPLEX), WhatsApp broadcast, approve/posted (company-scoped), `runPixelWeeklyWork` (background + in-flight guard), `generateSuccessPost` (fire-and-forget). 9 endpoints, CHAIRMAN.
- [x] P5-4 BusinessLoop: Monday → PIXEL calendar if none this week. `InvoiceAndPaymentService.markPaid` credited branch → CLIENT_SUCCESS post.
- [x] P5-5 `components/PixelContent.tsx` as default "PIXEL Content" tab on existing /marketing (Phase 27 page kept). Nav Marketing moved after Ideas.
- [x] P5-6 Assistant: GENERATE_POST / GENERATE_CALENDAR / WHATSAPP_BROADCAST (keywords before lookups).
- [x] Gateway: Ollama streamed (`readOllamaStream`) — fixes Node fetch 300 s header timeout; `callWithTier(..., { json: true })` → Ollama `format: "json"` for all JSON callers.
- [x] Live: post 117 s, calendar 7 posts 309 s, broadcast 23 s, assistant post 115 s; 9 posts.

## Phase 44 Part 6 — World Map (2026-09-26)
- [x] P6-1 `leaflet` 1.9.4 (+ types) in apps/web. No react-leaflet.
- [x] P6-2 `GET /map/pins` (`chairman/map-data.controller.ts` + pure `chairman/map-data.ts`: `leadCoordinates`, `buildPins`). Lead-gen now stores Places `lat/lng` in `SalesLead.metadata`.
- [x] P6-3 `components/WorldMapInner.tsx` (map created once, marker layer redrawn, escaped popups), `WorldMap.tsx` (dynamic ssr:false), `map-pins.ts`.
- [x] P6-4 `/world-map` page, nav "World Map" after Ideas.
- [x] P6-5 `components/ClientMapCard.tsx` on overview (below CEO cards).
- [x] P6-7 Live: 3 pins (2 approx, 1 stored GPS), centred on Sikar, popups, overview preview. Test data inserted and deleted.

## Phase 44 Part 7 — Gmail Inbox (2026-09-26)
- Extended the existing `sales-outreach/inbound-message.service.ts` (no parallel inbox module).
- [x] P7-2 `InboundMessage` + messageId (unique per company), confidence, draftReply, replySentAt, receivedAt; status REPLIED. Migration `20260927040000_phase44_part7_inbox`.
- [x] P7-3 `checkInbox` (INBOX_ENABLED gate, in-flight guard, 7-day window read-only, Message-ID dedupe, lead senders only), `precheck` (auto-reply → SPAM, unsubscribe → NOT_INTERESTED), `normalizeClassification`, intents + ASKING_PRICE/SPAM, drafts for questions, discovery call on INTERESTED, `sendReply` via IntegrationService, `ignore`, `unreadCount`.
- [x] P7-4 `sales-outreach/inbox.controller.ts` → `/inbox/*` (CHAIRMAN).
- [x] P7-5 BusinessLoop inbox step every 10 min.
- [x] P7-6 `/inbox` page, sidebar Inbox + unread badge, toasts.
- [x] P7-7 Assistant CHECK_INBOX; `.env.example` INBOX_ENABLED / IMAP_*.
- [x] Live: disabled-state endpoints + assistant; ASKING_PRICE classification with Hinglish draft (52 s); test data deleted.

## Phase 44 Part 8 — UI Redesign + 2.5D World (2026-09-26)
- [x] A1 `globals.css` rewritten: spec tokens (light + `[data-theme="dark"]`), legacy token names aliased to them, flat components (6px, no gradients/shadows), spec classes (stat-card, empty-state, table, sidebar-*, theme-toggle…).
- [x] A2/A3 Phosphor icons (`TrendUp`, `Heartbeat` — spec names don't exist); new Sidebar (exact-match active state, sign out, theme toggle, inbox badge). lucide-react removed.
- [x] A4 Overview rewritten (stats, CEO activity, Ask CEO, client map, pipeline). CeoActivityCard/AskCeoCard deleted.
- [x] A5 Emoji/hex/radius cleanup on 10 pages + shared components; Marketing/Sales palettes → tokens.
- [x] A6 Layout: `data-theme="dark"` + pre-paint theme script.
- [x] B `world/office-layout.ts`, `EmployeeCharacter.tsx`, `IsometricOffice.tsx`, `page.tsx` (from `/chairman/world`); department seating, walk to CEO and back, CEO feed bubbles, CSS animations. Old `components/world/*` deleted.
- [x] tsc 0, `next build` OK; live DOM checks on overview, world, survival + 9 pages; theme toggle verified.

## Current Step
Phase 44 Part 8 done — see PHASE44_PART8_RESULTS.md. Ready for Part 9.

### Earlier: Phase 44 Part 2 done — see PHASE44_PART2_RESULTS.md.

### Earlier: Phase 44 Part 1 done — see PHASE44_PART1_RESULTS.md. phi4 verified after freeing RAM (needs ~9 GB free; bad_alloc at 6 GB). Ready for Part 2.

### Phase 44 Results
- TypeScript errors: 1,908 → **0**
- Test suites: 8/42 passing → **42/42 passing** (129 tests)
- `nest build`: **succeeds**
- Root cause of all errors: workspace packages (`@aevora/database`, `@aevora/model-gateway`, `@aevora/shared`) were not built — `dist/` dirs were missing
- CeoModule was never registered in app.module.ts — entire Phase 43 was dead code

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

### Step 43-1
- New module `apps/api/src/ceo/` (not `agent/`: AgentModule has a forwardRef cycle with Simulation; CEO needs LeadGen/Task/Ventures).
- Models `CeoReview` (+ `simHour` key, `@@unique([companyId, simHour])` = one review per sim hour, idempotent) and `LeadGenConfig` (CEO-editable categories; `LeadGenService.categoriesFor` prefers it over env). Migration `20260926000000_phase43_step1_ceo_review`.
- `CeoReviewService.runIfDue` (from BusinessLoopService step 6): CEO = first ACTIVE employee with CEO/Chief Executive in role title (`findCeo`, also used by voice now). Due when the sim hour changed AND ≥ `CEO_REVIEW_MIN_INTERVAL_MIN` (15) real minutes passed (weekday-9am always allowed).
- `runReview`: snapshot (lead gen, leads by status, outreach sent/positive this week, client projects + pipeline, balance/paid, survival, ventures, unread Chairman directives) → ModelGateway → `normalizeReview` (whitelisted types, ≤3) → claim `CeoReview` row → `CeoDecisionsService.apply` → mark directives read (`payload.ceoReadAt`) → weekday 9am sim: `ceo.report` WS + `sentToChairman`.
- Directive source: Phase 42 voice COMMAND_CEO creates APPROVED `CHAIRMAN_VOICE` ManagementDecisions; VoiceCommands are already EXECUTED synchronously, so "unread" is tracked on the decision.
- Decisions: REALLOCATE_AGENT (idle agent, prefer paused-venture staff → Task "Support client project: X" on the top-value open ClientProject; skips if already staffed), CHANGE_LEAD_CATEGORY (sanitized add/remove, ≤10, never empty), ADJUST_OUTREACH_SCRIPT (needs ≥5 emails in 14d; LLM rewrite validated: known placeholders only, must keep {{businessName}}; new version active, old inactive), PAUSE_VENTURE (ACTIVE venture >7 days old with zero team task activity in 7 days — deliberately stricter than "lowest activity"). HIRE_AGENT/ESCALATE_TO_CHAIRMAN → PROPOSED ManagementDecision. New kill switch `CEO_AUTONOMY` (or GLOBAL_PRODUCTION) → auto decisions recorded as BLOCKED. Outcome per decision stored in `decisionsProposed`.
- Endpoints: `GET /ceo/reviews`, `POST /ceo/reviews/run` (CHAIRMAN).
- tsc clean; 37 suites / 109 tests; boot DI check OK.

### Step 43-2
- `ceo/pipeline-management.service.ts` (`PipelineManagementService.manage`), run inside every CEO review (only when CEO_AUTONOMY allows); each action logged in `CeoReview.decisionsProposed` as `type: PIPELINE_ACTION` with outcome + detail.
  - <10 NEW leads → `LeadGenService.runForCompany(companyId, 'CEO')` (at most once/hour; 6-hourly loop search unchanged).
  - First-touch EMAIL campaigns sent >5 days ago, no positive outcome, lead still CONTACTED → one follow-up via new `EmailOutreachService.sendFollowUp` (idempotency `followup:<campaignId>`; follow-ups are never followed up). Complements the sales worker, which at 3 days closes as NO_RESPONSE and schedules a phone call. One LLM-revised template per review (validated by `validScript`, fallback `DEFAULT_FOLLOW_UP`).
  - ClientProject SAMPLE_SENT >7 days (by `updatedAt`) → one email offering a free revision or 10% off; claimed via `ceoFollowUpAt`; discount recorded in `ceoNotes` as pending Chairman approval — invoice untouched.
  - PAID/CLOSED → one referral-request email (`referralRequestedAt`).
  - Max 5 emails of each kind per review; OUTBOUND_EMAIL / GLOBAL_PRODUCTION / CEO_AUTONOMY kill switches → no emails (logged BLOCKED).
- Migration `20260926010000_phase43_step2_pipeline` (ClientProject `ceoFollowUpAt`, `referralRequestedAt`, `ceoNotes`).
- tsc clean; 38 suites / 115 tests; boot DI OK.

### Step 43-3
- Model `WeeklyReport` (`@@unique([companyId, weekStartDate])`, + `ceoEmployeeId`). Migration `20260926020000_phase43_step3_weekly_report`.
- `ceo/weekly-report.service.ts`: `generateAndSend(companyId, ceoId, simNow)` — idempotent per week (week = previous sim Monday 00:00 → this Monday 00:00; activity measured over last 7 real days because records carry real timestamps). Aggregates LeadGenRun, campaigns (+positive), CLIENT_PAYMENT RealMoneyTransactions (actual revenue), deals paid, top QUALIFIED/CONVERTED category, the week's CeoReviews (executed actions, risks) → ModelGateway 3-paragraph commentary + biggest challenge (template fallback) → store → `ceo.weekly_report` WS. Triggered from `runReview` on Monday 09:xx sim time.
- Endpoints: `GET /ceo/weekly-reports` (last 4), `POST /ceo/weekly-reports/run` (CHAIRMAN, last week's report now).
- Web: `/management` gets a **Reports** tab (`components/WeeklyReports.tsx`, expandable `<details>`, newest open, "Generate last week's report"); `?tab=reports` deep link. New `components/RealtimeToasts.tsx` (socket.io-client, JWT auth) mounted in layout: toasts for ceo.weekly_report, ceo.report, payment.received, lead.interested, company.shutdown/recovered and re-dispatches each as a `aevora:<event>` window event (reuse for 43-5/43-6).
- **Bug fix:** `/management`, `/model-platform`, `/product-factory` called relative `/api/...` (no Next rewrite exists → 404) and read `localStorage.token` → never loaded. Now use exported `API_BASE` + new `authHeaders()` from `lib/api.ts`.
- Mobile: `ceo.weekly_report` notification carries the payload; tapping it opens `WeeklyReportScreen` (full-screen modal); home screen shows a "Latest CEO weekly report" card (from `GET /ceo/weekly-reports`).
- API tsc clean; 39 suites / 118 tests; boot DI OK. Web tsc + next build OK. Mobile `expo export` bundles.

### Step 43-4
- `ceo/self-improvement.service.ts` (`SelfImprovementService.run`), called at the end of every CEO review; actions logged in `CeoReview.decisionsProposed`.
- ConversionTracker: per `SalesLead.industry` (lead-gen leads with ≥1 campaign) → contacted, responses (INTERESTED/BOOKED), conversions (QUALIFIED/CONVERTED), avg paid revenue. Derived from DB each review (not in memory) so it's always current; conversion = qualified-or-converted ÷ contacted (paid-only would drop everything early on). Rules (`planCategoryChanges`, pure): >5 contacted & <10% → CHANGE_LEAD_CATEGORY via `CeoDecisionsService.apply` (remove + adjacent category from a static neighbour map, never a previously dropped one); >30% → weight 2.
- `LeadGenConfig.weights` (category → searches/cycle) and `.dropped` (never auto re-added). `LeadGenService` runs weight-2 categories twice with a query variant ("best …") since repeating the identical query only returns already-known places.
- OutreachScriptOptimizer: per active EMAIL script, when campaigns ≥ `evaluatedAtCount + 10`: record `responseRatePct`; <15% → LLM rewrites subject + opening paragraph only (`replaceOpening`, then `validScript`), new version `parentId` = old, old deactivated; A/B comparison (parent % vs this %) in the log. First run materializes the built-in default script so its campaigns get a `scriptId`.
- Respects `CEO_AUTONOMY` (BLOCKED entries). Migration `20260926030000_phase43_step4_self_improvement`.
- tsc clean; 40 suites / 123 tests; boot DI OK.

### Step 43-5
- `GET /ceo/feed` → last 20 items from `ceo/ceo-feed.ts` `buildFeed` (pure): each CeoReview becomes a REVIEW summary item plus one item per logged action; WeeklyReports become WEEKLY_REPORT items; newest first. SKIPPED no-ops are dropped except script A/B checks. Each item {id, at, kind, outcome, title (1 sentence), detail, reason}.
- Actions now carry `kind` (`ActionKind`: DECISION, ESCALATION, LEAD_GEN, FOLLOW_UP, SCRIPT, CATEGORY, PIPELINE) set where they are created (pipeline + self-improvement); LLM decisions map by type.
- `runReview` emits low-priority `ceo.activity` WS {reviewId, count, latest}.
- Web: `components/CeoActivityCard.tsx` on the overview page (last 5, lucide icon + colour per kind, relative time; click → slide-out panel with full detail, Esc/overlay closes). `RealtimeToasts` handles `ceo.activity` silently (window event only, no toast) so the card refreshes live.
- Mobile: "🧠 CEO Updates" section above "Calls to make" (top 4 from `/ceo/feed`, tap → detail modal); `ceo.activity` bumps an unseen counter + app badge via `setBadgeCountAsync` (no banner); tapping clears it.
- API tsc; 41 suites / 125 tests; boot OK (route mapped). Web next build OK. Mobile bundles.

### Step 43-6
- Model `CeoQuestion` (+ enums `CeoQuestionUrgency` LOW/MEDIUM/HIGH, `CeoQuestionStatus` OPEN/ANSWERED/USED/EXPIRED). Migration `20260926040000_phase43_step6_ceo_dialogue`.
- `ceo/ceo-dialogue.service.ts`: `ask` (dedupes identical open questions, max 3 open, pushes `ceo.question` WS), `answer` (OPEN→ANSWERED atomically, once), `pendingAnswers` (expires OPEN > 7 days), `markUsed`.
- ESCALATE_TO_CHAIRMAN now creates a CeoQuestion (question = `parameters.question` or reason, urgency = `parameters.urgency`); HIRE_AGENT stays a ManagementDecision. Review prompt tells the CEO how/when to ask.
- Review `snapshot` includes `chairmanAnswers` (ANSWERED); after the review they are marked USED.
- Chairman → CEO: `POST /ceo/ask {question}` → `CeoReviewService.answerChairman`: immediate ModelGateway answer grounded in the live snapshot + last review (≤1000 chars in).
- Endpoints: `GET /ceo/questions?status=`, `POST /ceo/questions/:id/answer` (CHAIRMAN), `POST /ceo/ask` (CHAIRMAN).
- Web: `components/CeoQuestionDialog.tsx` (global, in layout): loads OPEN questions on start + live `ceo.question` (silent in RealtimeToasts) → modal with question, urgency, context, answer box, "Tell CEO" / "Later" (snoozes until reload), "N more waiting". `components/AskCeoCard.tsx` on the overview next to CEO Activity (answers shown inline, last 5).
- Mobile: `ceo.question` → notification (title marks urgent) → `CeoQuestionScreen` answer modal (also opens immediately if the app is in the foreground); "❓ Your CEO is asking (n)" card at the top of home.
- API tsc; 42 suites / 129 tests; boot OK (routes mapped). Web next build OK. Mobile bundles.

### Phase 44 Part 8B — Company World redesign
- `/world` is now a 4-floor building cutaway (`world/IsometricOffice.tsx` → `CompanyBuilding`, data in `world/office-layout.ts`: 18 departments). Perspective floors, animated people seated by role (fallback by department), CEO glow + current-task bubble, AEVORA globe in Reception, live Finance balance / Reception status / Sales lead count on room displays. Click a room or a person for a side panel.
- Deleted the old `EmployeeCharacter.tsx` and the orphaned lucide-based `AskCeoCard`, `CeoActivityCard`, `components/world/*` that broke `next build`.
- Web tsc 0 errors; next build OK; rendered on :3001 with a mocked API. See `PHASE44_PART8B_RESULTS.md`.

## What to do next session
Phase 43 is code-complete. Live run: `cd packages/database && npx prisma migrate deploy` (Phase 42 steps 2–7 + Phase 43 steps 1–4, 6; 43-5 had no migration), ensure a CEO + a sales employee exist, deposit, start the simulation, watch `CeoReviewService` logs; try `POST /ceo/reviews/run` and `POST /ceo/ask`. Keep `OUTREACH_ENVIRONMENT=SANDBOX` until reviews look sane.

## Known issues
- Web/desktop/mobile must now log in (`POST /auth/login`) — local single-user bypass is gone. Chairman needs `credentialHash` set in DB.
- Migration must be applied: `cd packages/database && npx prisma migrate deploy`.
- Email replies are not read automatically; the Chairman logs outcomes via `POST /outreach/campaigns/:id/outcome` (inbox polling = later).
- Sales worker does nothing until a company has an ACTIVE employee whose role title contains "sales".
- Apply migrations: steps 2–7 and phase43 steps 1–4 and 6.
- Android "high priority" for ceo.question relies on the default notification channel; a dedicated high-importance channel (`setNotificationChannelAsync`) would make it heads-up on all devices.
- CEO needs an ACTIVE employee with CEO in the role title, and the simulation RUNNING (reviews ride the business loop).
- Voice needs Chrome/Edge (Web Speech API) and a logged-in Chairman JWT.
- A company with no RealMoneyAccount / zero balance goes to SHUTDOWN on the first survival check — deposit first (`POST /survival/deposit`).
- Client-project invoices are created with environment SANDBOX (InvoiceService requires an ApprovalRequest for PRODUCTION). Real money is still credited on payment.
- Client replies (revision/approval) are logged by the Chairman via endpoints; no inbox parsing.
- Never run against a live DB: DI/boot verified with an unreachable DB only; flows verified by unit tests on pure logic + tsc.
- WebSocket: connection is JWT-verified (Step 8), but `device:identify` does not check that the deviceId belongs to the user (device rooms are only used by broadcastToDevice).

## Environment variables to add to .env.example
LEAD_GEN_PROVIDER_ENABLED, GOOGLE_PLACES_API_KEY, LEAD_GEN_CATEGORIES, LEAD_GEN_LOCATION, LEAD_GEN_RADIUS_M, LEAD_GEN_INTERVAL_HOURS, SMTP_*, OUTREACH_FROM_NAME, OUTREACH_ENVIRONMENT, OUTREACH_FOLLOWUP_DAYS, SALES_BATCH_SIZE, CHAIRMAN_NAME, COMPANY_NAME, PUBLIC_API_URL, PAYMENT_REMINDER_DAYS, RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET, BANK_TRANSFER_INSTRUCTIONS, MIN_BALANCE_PAISE, WARNING_BALANCE_PAISE, VENTURE_MAX_TEAM, BUSINESS_LOOP_INTERVAL_MS, CEO_REVIEW_MIN_INTERVAL_MIN (all added to .env.example).
