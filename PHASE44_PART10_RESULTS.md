# Phase 44 Part 10 — PixiJS Office (Option C)

## Steps
Step 1 PixiJS installed: version 7.4.3 (`pixi.js@7`, no `@pixi/react`)
Step 2 Sprite helpers: DONE — `apps/web/app/world/pixi-assets.ts` (desk, wall screen, plant, person, globe; all drawn with `PIXI.Graphics`)
Step 3 PixiOffice component: DONE — `apps/web/app/world/PixiOffice.tsx`
Step 4 Test page /world-pixi: DONE — `apps/web/app/world-pixi/page.tsx`
Step 5 TypeScript: errors before 2, after 0 (`getEmployeeColor` returns a CSS hex string; Pixi needs a number). `npm run build` OK.
Step 6 Live check: DONE — `npm run dev` on :3001 in headless Chromium, with the API mocked (15 sample employees; no API/DB in this environment)

## Deviations from the spec code (needed to work)
- The spec imported `ROOMS` and used `room.floorId`, `room.shortName`, `room.roles` and `room.icon`. None of these exist; `office-layout.ts` exports `DEPARTMENTS`. The component uses `DEPARTMENTS` / `roomsOnFloor` / `groupByRoom`, so rooms and employee placement match Option B.
- The spec's page fetched `GET /simulation`, which isn't an endpoint (only `/simulation/status`), and its compare link was a broken `<a>` tag. The page now uses `/chairman/world` + `chairmanFetch` and the same start/pause/resume logic as `/world`, and passes employees to `PixiOffice` as a prop. The compare link is a `next/link`.
- Performance fixes:
  - The spec destroyed and recreated the whole WebGL app on every live-value refresh, with one `PIXI.Ticker` per sprite. Here the app is created once and the scene graph is rebuilt only when employees change.
  - Live values update the screen text in place.
  - All animation runs on the single `app.ticker`.
- Hit-testing fix: desks, name tags and the CEO bubble use `eventMode = 'none'`. Otherwise a click on a person over their desk resolved to the room.
- Desks are a single row per room, with a "+N" badge for overflow. Two rows collided with the wall screens in the narrow rooms.

## Visual quality vs Option B
Better: PARTLY — about the same quality, with different strengths.
What improved:
- Warm ceiling lights with light cones, lit wall screens with scan lines, and chairs, monitors and plants drawn as sprites.
- Varied skin and hair per employee.
- Walking people actually move across the floor.
- The CEO room glow pulses.
- It renders in WebGL on a single canvas (one draw loop), so it scales to many more figures than DOM/CSS.

What still needs work:
- The depth is a flat 2D trapezoid "dollhouse", not real 3D. Option B's CSS perspective actually reads as more three-dimensional.
- Everything is vector primitives; there are no real textures or sprite art yet, so the "real sprites" win hasn't materialised.
- The globe sits in the Reception atrium, not between floors: the floors are stacked flush, and a globe between them would cover rooms.
- Canvas content is invisible to screen readers and not keyboard-reachable (Option B's rooms and people are buttons).
- Headless software GL managed 13 fps. This environment has no GPU, so real-browser fps is unmeasured.

## Option B still working at /world
YES — 18 rooms render, and the "View Option B (CSS 3D)" link on /world-pixi navigates there. `Building3D.tsx` is untouched.

## Ready to replace /world with Option C
NO — needs more work first:
- real sprite or texture art (or isometric pixel art, Option A)
- a keyboard/screen-reader fallback (e.g. an accessible room list)
- a real-GPU fps check

## Live check (Step 6)
1. Canvas renders: YES
2. 4 floor sections: YES (L3 / L2 / L1 / G, narrowing upward)
3. Rooms with coloured borders and signs: YES (18)
4. Wall screens visible and blinking: YES (staggered blink; live ₹ balance, HEALTHY, 4 leads, 2 open)
5. Person figures at desks: YES
6. Click a room → detail panel: YES
7. Click an employee → their info: YES (ARIA, CEO, current task)
8. Globe: YES, in the Reception atrium (not between floors, see above)
9. AEVORA HQ top left: YES
10. SAAHVIK TECH base label: YES ("SAAHVIK TECH · SIKAR, RAJASTHAN")
11. Compare link to /world: YES
