# Phase 44 Part 6 Results

## Steps completed
Step 1 Leaflet installed: DONE — leaflet 1.9.4 + @types/leaflet 1.9.22. `react-leaflet` skipped: the map uses Leaflet directly, so it would be an unused dependency.
Step 2 Map API endpoint: DONE — `GET /map/pins` (`chairman/map-data.controller.ts`, logic in `chairman/map-data.ts`, 3 tests). JWT + CHAIRMAN.
Step 3 Map component: DONE — `WorldMapInner.tsx` (Leaflet + OSM), `WorldMap.tsx` (dynamic, ssr:false), `map-pins.ts` (shared type/colours).
Step 4 World map page: DONE — `/world-map` + "World Map" (lucide Map) after Ideas in the Command nav.
Step 5 Overview preview: DONE — full mini map (280 px), not just a link: self-contained `ClientMapCard` below the CEO cards; the overview page only gained one line.
Step 6 TypeScript: DONE — errors before 0 after 0 (api, web). `nest build` OK. Jest 45/46 suites (only the pre-existing stale `integration.service.js` suite fails).
Step 7 Live test: DONE — all 4 pass.

## Test results
API response: pins count 3, summary structure YES — `{ totalPins: 3, leads: 2, activeProjects: 1, paidClients: 0, totalPipelineRs: 8000, paidRs: 0, approximatePins: 2 }`; 401 without a token.
Leads visible on map: YES — 3 markers (orange, blue, orange); popup "[TEST] Rajputana Restaurant · Active project · BUILDING · ₹8,000".
Map centers on Sikar: YES — zoom 13, OSM tiles x 5804–5807 / y 3440–3442 (Sikar is ~x 5805 / y 3443 at z13); 12 tiles loaded.
Overview link/preview: YES — "🗺️ Client map" card with a live 280 px map (3 markers) + "View full map →", below "CEO activity" and "Ask the CEO" (both intact).

Test data: the DB was empty after the rebuild, so 3 leads + 1 project marked `[TEST]` / `source: MAP_TEST` (no email/phone — nothing could contact them) were inserted for the test and deleted afterwards. DB back to 0 leads, 0 projects. Lead-gen was not triggered (real Google Places + outreach).

## New endpoints
GET /map/pins

## New pages
/world-map — full interactive map (refreshes every 30 s without resetting zoom/position)
/ (overview) — map preview added

## Pin color system
Orange — leads (potential clients)
Blue — active projects
Green — paid clients (project PAID/CLOSED, or lead CONVERTED)

## How coordinates work
- **Real GPS from now on:** lead search already requested `places.location` from Google but threw it away. It is now saved in `SalesLead.metadata.lat/lng` (no schema change). Leads with it are pinned exactly.
- **Fallback:** leads without coordinates (mock leads, leads found before this change) are spread around Sikar centre by industry + a stable id hash, flagged `approximate` ("Approximate location" in the popup, "(approx.)" in the list, count in the legend).

## Changes from the spec (and why)
- Field names fixed to the real schema: no `businessName`/`location`; `quotedAmount` not `quotedAmountPaise`.
- One pin per business: a project replaces its lead's pin; FAILED projects are skipped.
- "Pipeline" = open projects only (the spec summed paid work too); paid revenue is a separate number.
- Popup text is HTML-escaped (business names come from Google Places; the spec injected them raw).
- Leaflet CSS from the installed package, not the unpkg CDN; default-icon CDN fix dropped (circle markers don't use icons).
- The map is created once; refreshes only redraw the marker layer (the spec destroyed/re-created the map every 30 s).
- App design tokens + `chairmanFetch` instead of `--color-*` vars and raw fetch.

## Ready for Part 7
YES
