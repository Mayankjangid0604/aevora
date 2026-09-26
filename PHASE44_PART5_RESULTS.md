# Phase 44 Part 5 Results

## Steps completed
Step 1 Schema: DONE — `ContentPost`, `ContentCalendar` (+ Company relations). Migration `20260927030000_phase44_part5_marketing_content` via `migrate deploy` (not `db push`); additive only, 0 drift before.
Step 2 Marketing service: DONE — `marketing-content/marketing-content.service.ts` (+ `isoWeek`, `normalizeHashtags`, `normalizeCalendar`, 3 tests).
Step 3 Marketing controller: DONE — 9 endpoints, JWT + CHAIRMAN, company-scoped.
Step 4 Business loop wiring: DONE — Monday calendar (background, in-flight guard) + CLIENT_SUCCESS post on payment (direct injection — no circular import, no event emitter needed).
Step 5 Dashboard page: DONE — as a **"PIXEL Content" tab (default) on the existing /marketing page**, not a new page (see below). Marketing nav moved into Command after Ideas.
Step 6 Assistant commands: DONE — generate post / calendar / WhatsApp broadcast (+ 2 tests).
Step 7 TypeScript: DONE — errors before 3 after 0 (the 3 were a stale `apps/web/tsconfig.tsbuildinfo` pointing at old `.next/types`; api and model-gateway were 0). `nest build` OK. Jest 44/45 suites (only the pre-existing stale `integration.service.js` suite fails).
Step 8 Live test: DONE — all 5 pass (after fixing 3 gateway/model problems found by Test 2).

## Test results
Post generated (117 s, 17 hashtags): "🚀 Lokali restaurant owners, time to take your digital presence to the next level! At SAAHVIK Tech, we specialize in creating…" — mostly English; later posts came out properly Hinglish.
Calendar theme: "Empowering Local Businesses with Digital Solutions" (ISO week 39/2026, 7 posts, 309 s). Monday: "Transform your business with a stunning website that captures your essence! 🌟 …"; Sunday picked Navratri.
WhatsApp message (23 s): "Namaste Gym Owners! 🏋️‍♂️ / SAAHVIK Tech ke team se, aapke gym ke liye free website demo ka offer hai. …" — 5 lines, Hinglish, signed Team SAAHVIK Tech, Sikar.
Assistant command (115 s, keyword-routed GENERATE_POST, topic "automation for shops"): "🚀 Lok sabhi dukaan ke liye, SAAHVIK Tech ke automation solutions! 🛒 Abhi se online booking, inventory management…"
Posts in database: 9 (8 DRAFT, 1 APPROVED — approved via the UI button in the browser test)

## New endpoints
GET /marketing-content/posts
POST /marketing-content/posts/generate
POST /marketing-content/posts/:id/approve
POST /marketing-content/posts/:id/posted
GET /marketing-content/calendars
GET /marketing-content/calendars/current
POST /marketing-content/calendars/generate
POST /marketing-content/whatsapp/broadcast
POST /marketing-content/pixel/run

## Bugs found by the live test (fixed)
1. **Every model call over 5 minutes failed** ("fetch failed" at exactly 300 s): Node's fetch gives up after 300 s without response headers, and non-streaming Ollama sends none until it's done. `callWithTier` now streams (`readOllamaStream`, 2 tests) — affects every feature, not just PIXEL.
2. **Calendar JSON cut off**: 7 posts overflow LOCAL_BASIC's 2000-token cap → calendar uses LOCAL_COMPLEX (4000).
3. **phi4 sometimes emits invalid JSON** (one run failed, the next identical run parsed). `callWithTier(..., { json: true })` now sets Ollama `format: "json"`; used by all 7 JSON callers (CEO review ×2, assistant intent, idea evaluate/generate, PIXEL post/calendar).

## Changes from the spec (and why)
- **/marketing already existed** (Phase 27: campaigns, brand, personas, analytics — 224 lines). Writing a new page there would have deleted it → PIXEL is a new default tab (`components/PixelContent.tsx`) instead; nav entry moved, not duplicated.
- ISO week/year instead of the spec's week formula (off by one in many years; broke the unique key around New Year).
- Calendar + its 7 posts saved in one transaction; concurrent Monday runs → P2002 → returns the existing calendar.
- Monday loop step starts the calendar in the background (5 min on CPU) instead of blocking the business loop.
- Success post on payment is fire-and-forget; uses the lead's real industry.
- Assistant marketing keywords are matched before status/revenue lookups ("generate post about revenue…" makes a post); command words stripped from the topic.
- ModelGateway `new`'d (not injectable); app design tokens + `chairmanFetch` on the web.

## What PIXEL does automatically
- Monday: generates 7-post weekly calendar (once per ISO week, ~5 min in the background)
- On project paid: generates CLIENT_SUCCESS post
- Via assistant: generate post, calendar, WhatsApp broadcast

## What Mayank does manually
- Open /marketing (PIXEL Content tab) to review posts
- Copy captions and hashtags to Instagram
- Copy WhatsApp message and send from WhatsApp Web
- Click Approve and Mark as Posted to track

## Known issues
- Speed on CPU: post ~2 min, calendar ~5 min, broadcast ~25 s.
- The existing Phase 27 Marketing tabs use hard-coded light colours (look off on the dark theme) — untouched.
- `packages/model-gateway` older tests (gateway.spec, local-provider.spec) don't compile (no jest globals import) — pre-existing.
- Your start.bat API + web stopped during testing (all node processes gone at once, not a crash — the API didn't log one). Restart with start.bat.

## Ready for Part 6
YES
