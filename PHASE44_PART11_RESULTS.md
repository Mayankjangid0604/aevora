# Phase 44 Part 11 — Real 3D Office

## Steps
Step 1 GLB downloaded: NOT DOWNLOADED, and not needed. `drive.google.com` (and `unpkg.com`) are blocked by this environment's network policy. The office HTML doesn't load a GLB: it builds the whole office procedurally in Three.js, and `aevora-office.glb` is an export of that same scene (the HTML imports only `GLTFExporter`). The repo copy on `main` is a 134-byte Git LFS pointer and nothing references it.
Step 2 HTML read: original kept (`Aevora_Office_3D_v3.html` from `main`, merged into this branch)
  1. Element: `<three-d-stage name="aevora-office">` custom element
  2. Pointer handling: `stage.addEventListener('pointerdown'|'pointermove'|'pointerup'|'dblclick')` (walk-mode look and double-click to walk); no click picking existed
  3. GLB loading: none (procedural geometry; meshes named `ZONE__material`, grouped per zone)
  4. Room events: none; walk mode computes the zone from `ZONES` rects each frame and shows it in `#where`
  5. Variables: `scene = stage._scene`, `cam = stage._camera`, `controls = stage._controls` (OrbitControls), `renderer = stage._renderer`; also `stage._key`, `_ground`, `_loop`, `setObject`
  6. The script ends with `stage._loop = loop; renderer.setAnimationLoop(loop);`
Step 3 GLB path fixed: N/A, no GLB path. Local dependencies: `three-d-stage.js` and `_ds/nocturne/styles.css`, both missing.
Step 4 Self-contained HTML: not used. The spec's replacement viewer needs the unreachable GLB and guessed room coordinates. Instead I recreated `three-d-stage.js` (renderer, scene, camera, OrbitControls, hemisphere + shadowed key light, ground, loop, `setObject`, resize), so Claude Design's full office runs unchanged.
Step 5 Dependencies: resolved. Added `three-d-stage.js` and a minimal `_ds/nocturne/styles.css` (only the tokens and classes the HTML uses). Three.js 0.184 still comes from unpkg with SRI hashes, so browsers need access to unpkg.com.
Step 6 World page: DONE. `/world` = iframe + bridge + live panel. The CSS 3D building moved to `/world-classic` as the lightweight fallback; `/world-pixi`'s compare link points there.
Step 7 TypeScript: errors before 0, after 0. `npm run build` OK.
Step 8 Live check: `npm run dev` :3001 in headless Chromium (software WebGL), with the API mocked and three@0.184.0 served from the npm package for the unpkg URLs (integrity hashes verified). The office is ready in about 30 s here (software GL); on a GPU it will be much faster. It renders the full building from above: 14 glass-walled department rooms, the atrium globe, the CEO suite, Chairman Assistant, cafeteria and reception. Walk mode shows people at desks, dashboards on monitors, and city windows.

## Bridge (postMessage, same-origin only)
- Office → dashboard:
  - `OFFICE_READY {zones}`
  - `CLICK_ROOM {key, name}`: a click (not a drag) raycasts; overview picks under the pointer, walk mode picks at the crosshair
  - `ROOM_ENTER {key, name}`
- Dashboard → office: `FOCUS_ZONE {key}` (flies the camera, or respawns you there in walk mode)
- Zone keys map to departments by name (`ENGINEERING_IT` → Engineering / IT, …). Atrium, Entrance and the concourse show as shared spaces.

## 3D office contents (measured in the running scene)
986 meshes, 120 materials, 20 zones (18 departments + Entrance + Atrium).
Procedural marble, wood, carpet, glass and brushed-metal materials; people at desks; AEVORA globe in the atrium; walk-mode floor reflections; ACESFilmic tone mapping; collision boxes.

## Controls working
Overview orbit: YES
Walk WASD: YES (Shift runs; the room label updates, e.g. "you are in: SALES"; Esc returns to overview)
Room click panel: YES (e.g. Sales: 4 open leads, 3 employees with status)
Employee click: YES from the room panel's list. People aren't individually clickable in 3D: their meshes are merged per room and material, so a click on a person opens their room.

## Known issues
- The GLB isn't used. To use it later (e.g. a lighter file than building procedurally), host it somewhere the browser can reach; Drive direct links are rate-limited.
- Three.js 0.184 is vendored in `public/office/three/` (no CDN needed).
- Heavy on low-end devices; `/world-classic` is linked from the page as the lighter view.
