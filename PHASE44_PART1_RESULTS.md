# Phase 44 Part 1 — Results

## Step Results
- Step 1 (Models + env): DONE — no models pulled (phi4 + qwen2.5:7b already present). All 17 vars set in .env; new ones added to .env.example. briefs/pending + briefs/completed created with .gitkeep; `briefs/pending/*.md` gitignored.
- Step 2 (Model gateway): DONE — `model-tier.ts` added exactly as specified, `callWithTier` added to ModelGateway, exports added, package rebuilt.
- Step 3 (Company structure): DONE — script adapted to the real schema (see Errors Fixed). Output: 6 departments, 4 employees, balance OK Rs5000, ACWallet 5,000,000 AC, Survival HEALTHY.
- Step 4 (CEO model tier): DONE — review uses LOCAL_BASIC; switches to LOCAL_COMPLEX for HIRE_AGENT / CREATE_VENTURE / ESCALATE_TO_CHAIRMAN or any figure > 5,000,000 paise. Chairman Q&A uses LOCAL_BASIC.
- Step 5 (Brief generation): DONE — tier stored in `ClientProject.scope.modelTier`; SONNET/OPUS/FABLE projects write `briefs/pending/<projectId>.md`. NOTE: the prompt was cut off at "Brief file content:", so the brief format (project, client, quote, tier/model, description, deliverables, requirements JSON, stack + signature rules) was chosen by Claude — review it.
- Step 6 (Email signatures): DONE — single `emailSignature()` used by all client emails + WhatsApp; `{{chairmanName}}` no longer resolves to the personal name; 2 active OutreachScripts updated to the Hindi SAAHVIK template.
- Step 7 (TypeScript): DONE — error count before: 0 after: 0 (api, model-gateway, web). `nest build` succeeds. 4 errors were introduced and fixed along the way (see below).
- Step 8 (Live check): DONE — API boots clean, /health returns `{"status":"ok"}`, seed re-verified. phi4 retested after freeing RAM (22 GB free): loads and returns parseable CEO review JSON via `callWithTier(LOCAL_BASIC)` in ~41 s.

## Models Available
```
NAME           ID              SIZE      MODIFIED
phi4:latest    ac896e5b8b34    9.1 GB    18 hours ago
qwen2.5:7b     845dbda0ea48    4.7 GB    18 hours ago
```

## Employees Created
ARIA — CEO — 5c6517ba-68d9-4cf2-952f-8935a480013b
NOVA — Sales — e11223b7-54bd-4bc1-a3c2-4701edd9ed0e
PIXEL — Marketing — 76678130-4d74-40ad-b95d-0eec607880ec
FORGE — Dev — 88ef2306-9ff5-4b5a-b522-44d3527ef331

(Company: SAAHVIK Tech, 4a5bb889-43d6-49fb-bf72-83cefc3bf8bf. ARIA and NOVA already existed and were updated in place.)

## Company Balance
Real money: Rs5,000
AC balance: 5,000,000 AC
Survival: HEALTHY

## Errors Fixed
1. Seed script vs schema: `Department.description` and `name_companyId` unique don't exist → find-or-create by name; description dropped.
2. Seed script: `Role.isAiRole` and `title_companyId` unique don't exist → find-or-create by title.
3. Seed script: `Employee.name` is required → set.
4. Seed script: `AutonomyLevel.SUPERVISED` doesn't exist → CONTROLLED for ARIA.
5. Seed script: `RealMoneyAccount.balancePaise` → `balance`; `SimulationState.speed` → `speedMultiplier`.
6. Seed script: `(prisma as any)` is TypeScript in a .js file (syntax error) → direct `prisma.aCWallet`.
7. Seed script: would have created duplicate ARIA/NOVA (earlier seed used other identitySeeds) → match by identitySeed OR name.
8. `callWithTier` returns text, not parsed JSON → added `parseJson` for the CEO review.
9. scope.service.ts: unterminated string in brief template (tsc TS1002) → fixed.
10. Every client email signed with CHAIRMAN_NAME (personal name) → replaced with team signature everywhere.
11. AI-written outreach emails had no enforced signature → model told not to sign; team signature appended.

## Open issues (not fixed)
- phi4 needs ~9 GB free RAM. It failed with `std::bad_alloc` at ~6 GB free; works at 22 GB free. If it fails again, close other apps or set CEO_MODEL=qwen2.5:7b.
- `integration.service.spec.ts` (6 tests) fails: a stale compiled `apps/api/src/integration/integration.service.js` sits next to the .ts and Jest loads it. This existed before this session. Delete that .js to fix.
- **Real sending is live in .env**: `OUTREACH_ENVIRONMENT=PRODUCTION`, `ENABLE_REAL_PRODUCTION_SENDING=true`, `SALES_AUTO_PROCESS=true`, and both simulations are RUNNING. start.bat will email real businesses and deploy demos to Vercel right away. (The verification run disabled the two sending flags for that process only; the simulation still deployed one Vercel demo on its own during boot.)

## What Mayank must do manually
1. Add Gmail app password for saahvik2026@gmail.com to .env as SMTP_PASS
2. Add ANTHROPIC_API_KEY to .env when ready for Sonnet/Opus/Fable tier projects
3. Run start.bat to launch the system

## Ready for Part 2
YES — proceed to Part 2 (keep ~9 GB RAM free for phi4; check the live-sending flags before start.bat).
