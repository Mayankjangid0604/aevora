# Phase 44 Part 9 — CSS 3D Building (Option B)

The Part 9 prompt arrived without Steps 1–2 (the Building3D spec), so the component was designed from the Step 4 checklist, as agreed in the session.

## Steps
Step 1 Building3D component: DONE — `apps/web/app/world/Building3D.tsx` + `Building3D.module.css` (pure HTML/CSS 3D transforms; no canvas/WebGL, no per-figure JS timers).
Step 2 World page wired: DONE — `/world` dynamically imports `./Building3D`; simulation controls unchanged; description and "How to use" tips updated.
Step 3 TypeScript: DONE — errors before 0, after 0. `npm run build` succeeds.
Step 4 Live check: DONE — `npm run dev` on :3001, driven in headless Chromium with the API mocked (no API/DB in this environment): 15 sample employees, survival status, leads, projects.

## What it looks like
A dark dollhouse cutaway in real CSS 3D. The stage has perspective, and the whole building is tilted back 12° so you look down into open-fronted rooms. Each room is a box with a back wall, tiled floor and side walls; the floor's roof doubles as its ceiling. Four floors are stacked, narrowing upward (100 / 95 / 87 / 78 %) on a plinth that reads "SAAHVIK TECH".

Each room has a coloured name sign across the top of its opening and a blinking wall screen (scan line, staggered timing) showing its icon and a live value. There's a plant in the back corner, and employees stand at desks with glowing monitors. Figures animate by activity: typing arms (working), strolling with leg swing (walking), a nod (in meeting), breathing (idle).

The CEO office has an indigo glow and a speech bubble with the CEO's current task. Reception has an AEVORA wall sign and a spinning globe. The header strip shows "AEVORA HQ", "SAAHVIK Tech · 4 floors · 18 departments", and live counts (employees, working, in meetings, and "without a room" if any).

## Checklist (Step 4)
1. Dark building with 4 floor sections: YES
2. Room panels inside each floor: YES — 18 rooms (6 / 6 / 3 / 3)
3. Coloured name labels and wall screens: YES
4. Floor labels on left edge: YES — "L3 Command Floor", "L2 Executive Floor", "L1 Operations Floor", "G Ground Floor"
5. AEVORA HQ header and employee count: YES
6. Clicking a floor expands it: YES — room height 142 → 242 px; the other floors shrink to about 100 px; click again to collapse
7. Clicking a room opens the detail panel on the right: YES — it also expands that floor
8. Person figures at desks: YES — 14 of 15 shown (a room shows up to 4, up to 6 when expanded, and a "+N" badge for the rest)
9. Wall screens blinking: YES — 18/18 screens run the blink animation
10. SAAHVIK TECH base label: YES

## Features working
Floor expand on click: YES
Room detail panel: YES — department, floor, live value, clickable list of the people in the room
Employee figures visible: YES — clicking one opens its own panel (name, role, department, current task, activity); Esc closes panels
Wall screens blinking: YES
Live data on screens: YES — Finance = real balance (₹), Reception = survival status, Sales = open leads, Projects & Operations = open projects (every 15s); other staffed rooms show "working / total"

## Compared to Option A (next step)
Option A hasn't been built yet, so there's nothing to compare against. Compared to the Part 8B flat SVG cutaway, this version has real depth (visible floors, walls and ceilings), clearer signage, and floors that expand. It's also lighter at runtime: CSS animations only, instead of a React re-render per figure every 120 ms. The costs:
- the view is a fixed camera (no rotating or zooming)
- the stage needs about 940 px of width and scrolls sideways inside its card on narrow screens
- people stroll in place rather than walking between rooms

## Implementation notes
- The shared employee helpers (`WorldEmployee`, `roomIdFor`, `groupByRoom`, `getEmployeeColor`, `isCeo`, `roomsOnFloor`) moved from `IsometricOffice.tsx` into `office-layout.ts`. Live screen data moved into the `world/useLiveValues.ts` hook.
- Hit-testing fix: the 3D wrapper boxes sit in the front plane, in front of everything pushed back, so they ignore the pointer. Only visible surfaces (walls, floor, sign, people, floor labels, slabs) take clicks. Without this, clicking a person opened their room instead.
- Respects `prefers-reduced-motion` (animations and transitions off). Rooms, people and floor labels are keyboard-focusable buttons.
- `IsometricOffice.tsx` (the Part 8B SVG cutaway) is no longer rendered. It's kept, still compiling, for comparison between options; delete it once an option is chosen.

## Known issues
- Verified with a mocked API only; not run against a live API/DB.
- In the right-hand rooms, the partition wall hides a sliver of the back wall because of the perspective. That's correct occlusion, but it can cut the first letters of the expanded-floor subtitle.
- The company name in the header and base label is hard-coded ("SAAHVIK Tech"), like the rest of the app.
