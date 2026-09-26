# Phase 44 Part 8B — Company World Redesign

## Steps
Step 1 Office layout data: DONE — `office-layout.ts` replaced with the spec's `Department`/`Floor` types, 18 departments, `FLOOR_NAMES`.
Step 2 Building renderer: DONE — `IsometricOffice.tsx` is now `CompanyBuilding` (default export; file name kept for the dynamic import).
Step 3 World page: DONE — title "Company World", description "N employees across 4 floors — click a room or a person for details" (N = non-terminated employees from `/chairman/world`). Simulation controls unchanged; dynamic import still points to `./IsometricOffice`. The "How to use" tips were updated because "Walk to CEO" no longer exists.
Step 4 TypeScript: DONE — errors before 4, after 0. `npm run build` succeeds.
Step 5 Live check: DONE — `next start` on :3001 + headless Chromium, with the API mocked (no API/DB in this environment): 11 sample employees, survival status, 7 leads.

## What renders
A dark (#050508) cutaway of a 4-floor building on a 1000×720 SVG viewBox. Floors narrow going up (perspective), each with a slab line and an uppercase floor label above it. Each room: a tinted background with an accent border, uppercase name + subtitle, a wall display (icon + live value) at bottom-left, a plant at bottom-right, and desks with animated people (arms move when WORKING, legs + bob when WALKING). The CEO office has a thicker indigo border with a blurred glow and a speech bubble showing the CEO's current task. An animated AEVORA globe (rotating meridian, "PEOPLE · IDEAS · IMPACT") sits in the Reception lobby. The AEVORA wordmark is top-left.

Live values on displays: Finance = real balance (₹), Reception = survival status, Sales = lead count (refreshed every 15s). Employees come from the page's existing 5s `/chairman/world` poll.

## Rooms visible
Ground: Legal & Compliance, Cafeteria, Finance, Reception, Projects & Operations, Data & Analytics
Operations: Customer Support, Sales, Engineering / IT, Product, Marketing, Human Resources
Executive: Research & Development, CEO, Strategy & Planning
Command: Board Room, Chairman Assistant, Executive Lounge

## Interactions working
Click room: YES — panel with department, employee count, clickable list of its people, live value
Click employee: YES — panel with name, role, department, current task, activity badge
Chat bubbles: YES — CEO's current task
Globe animation: YES

## Deviations from the spec code (deliberate)
- `/chairman/world` returns flat fields (`role`, `departmentName`, `currentTaskTitle`), not `role.title`/`department.name`. The spec's fetch mapping would have put every employee under role "Employee" and in no room, so the component takes the page's employees as a prop (no second poll) and uses `chairmanFetch` (auth + 401 handling).
- Room assignment: CEO → CEO office; otherwise role-title match; otherwise a department fallback (Sales→Sales, Development→Engineering, Management→Projects, Marketing→Marketing, Venture*→Product, …). The spec's two-way `includes` matched every room for an empty role title.
- The globe is in Reception rather than just below the CEO room (that position overlapped the Operations floor).
- The wall display sits bottom-left instead of top-left so it doesn't collide with the room title in narrow rooms.
- Survival status field is `status` (spec read `currentStatus`; both are accepted).
- Idle people don't run a re-render timer.

## Other changes
- Deleted `world/EmployeeCharacter.tsx` (only used by the old office).
- The build was already failing before this part: `AskCeoCard.tsx`, `CeoActivityCard.tsx`, `components/world/WorldRenderer.tsx` and `WorldSidebar.tsx` imported `lucide-react`, which Part 8 uninstalled. Nothing imports those files (Part 8 meant to delete them), so they were deleted along with their only dependency, `components/world/floorplan.ts`.

## Known issues
- `reference.png` is not in the repo, so the layout follows the written description rather than being compared to the image.
- Live check used mocked API responses; not verified against a running API/DB.
- A room shows at most 4 people, with "+N" for the rest. Employees matching no room are counted in a top-right note.
- Movement is animation in place; people don't walk between rooms.
