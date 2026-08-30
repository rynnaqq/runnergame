# Product Requirements Document: 3D Endless Runner Web Game

**Working title:** Railway Rush  
**Document version:** 1.0  
**Status:** Ready for implementation  
**Date:** August 30, 2026  
**Product type:** Browser-based 3D endless runner  
**Primary platforms:** Desktop and mobile web

---

## 1. Product Summary

Railway Rush is a polished, production-ready 3D endless runner set in a dense urban railway corridor. The player runs forward automatically across three lanes, dodging trains and barriers, collecting coins, jumping, sliding, and changing lanes as the environment accelerates around them.

The experience should match the responsiveness, readability, energy, and environmental richness expected from leading lane-based endless runners. All shipped branding, characters, models, textures, graffiti, posters, audio, and environmental artwork must be original or properly licensed. The product must not copy protected assets, characters, logos, maps, UI, music, or other distinctive trade dress from an existing game.

The game will be implemented as a client-only React application using React Three Fiber. It must support keyboard and touch controls, maintain bounded memory through object pooling, persist the local high score, and remain smooth during extended play sessions.

---

## 2. Goals

1. Deliver a complete gameplay loop that is immediately understandable on desktop and mobile.
2. Create a convincing urban rail environment with substantial scenery on both sides of the playable tracks.
3. Maintain responsive input and reliable collision detection at increasing game speeds.
4. Sustain a target of 60 frames per second on supported devices through instancing, pooling, bounded collision checks, and allocation-free frame loops.
5. Produce a maintainable component architecture that separates rendering, simulation, input, state, collision, effects, and UI.
6. Run successfully after a clean dependency installation and production build, without placeholder logic or required proprietary assets.

## 3. Non-Goals

- Multiplayer, social leaderboards, authentication, or cloud saves.
- Backend services or server-authoritative simulation.
- Purchases, advertising, monetization, or live-operations tooling.
- A level editor or user-generated content.
- Native mobile or desktop packaging.
- Exact duplication of any existing commercial game's intellectual property.
- Advanced audio systems unless added in a later scope.

---

## 4. Target Users and Platforms

### 4.1 Primary user

A casual player who wants a fast, visually rich game session that can be learned in seconds and played with one hand on mobile or a keyboard on desktop.

### 4.2 Supported environments

- Current stable versions of Chrome, Edge, Firefox, and Safari.
- Modern Android and iOS browsers with WebGL 2 support.
- Desktop keyboard layouts using Arrow keys or WASD.
- Portrait and landscape mobile layouts using touch swipes.

### 4.3 Minimum experience requirements

- The game remains usable at a viewport width of 320 CSS pixels.
- UI respects safe-area insets on notched mobile devices.
- Touch input does not scroll or zoom the page while a run is active.
- A visible fallback message is shown if WebGL cannot initialize.

---

## 5. Experience Principles

- **Immediate control:** Lane changes, jumps, and slides must begin on the input frame whenever possible.
- **Readable hazards:** Every obstacle must be identifiable early enough for a valid response at the current speed.
- **Dense but legible world:** Trackside detail should create atmosphere without obscuring gameplay lanes.
- **Continuous motion:** Chunk recycling, object activation, and scenery transitions must not produce visible gaps or popping in the normal camera view.
- **Fair generation:** Procedural layouts must always preserve at least one traversable route.
- **Original presentation:** The game may use genre conventions, but its visual identity and content must remain distinct.

---

## 6. Core Gameplay Loop

1. Load the game and required assets.
2. Show the player and environment in a ready state.
3. Start the run on the first directional action or an explicit start action.
4. Move track chunks, obstacles, coins, and scenery toward the camera while the player remains near `Z = 0`.
5. Let the player switch lanes, jump, and slide to avoid hazards and collect coins.
6. Increase speed and score over time according to tunable progression values.
7. On a frontal collision, freeze gameplay, play crash feedback, and show the final score.
8. Save a new high score locally when earned.
9. Restart in place without a page reload, clearing all transient run state and resetting pooled objects.

---

## 7. Functional Requirements

### 7.1 Game states

The application must support the following explicit states:

| State | Description | Allowed transition |
| --- | --- | --- |
| `loading` | Assets and initial scene are being prepared. | `ready`, `error` |
| `ready` | Scene is visible and waiting for the player. | `running` |
| `running` | Simulation, score, input, collisions, and spawning are active. | `crashed` |
| `crashed` | Motion is frozen while crash feedback completes. | `gameOver` |
| `gameOver` | Final score and restart controls are shown. | `ready`, `running` |
| `error` | A non-recoverable renderer or initialization issue occurred. | Reload/retry |

The store must expose a single authoritative run state. Derived flags such as `isGameOver` may exist for UI convenience but must not conflict with the canonical state.

### 7.2 Coordinate system and lanes

- The player remains at or near `Z = 0`.
- World objects move toward the camera along positive Z.
- Lane centers are fixed at:
  - Left: `X = -2.5`
  - Center: `X = 0`
  - Right: `X = 2.5`
- Lane indices must be clamped so repeated input cannot move the player beyond the three lanes.
- Track geometry, collision shapes, and obstacle placement must use the same coordinate constants.

### 7.3 Player movement

#### Lane switching

- A horizontal input changes the target lane by one lane.
- The player smoothly approaches the target X position using frame-rate-independent exponential interpolation.
- The player rolls toward the movement direction, with a maximum visual tilt of 15 degrees, and returns smoothly to upright.
- New lane input may be accepted during an existing lane transition, but the target must remain within valid lanes.

#### Jumping

- A jump applies upward velocity and follows a gravity-driven parabolic trajectory.
- Ground detection must prevent unintended repeated jumps.
- Landing returns the player cleanly to the track height without sinking or oscillation.
- The player animation transitions to `Jump` while airborne and returns to `Run` after landing.

#### Sliding

- A grounded slide reduces the player's collision-box height by 50% for exactly 0.75 seconds.
- A slide input while airborne applies an immediate downward impulse.
- The reduced bounding box must be anchored so it represents the player's lower body rather than floating at the previous center height.
- The animation transitions to `Slide` for the active duration.

#### Hoverboard

- A hoverboard mesh must be attached beneath the player's feet.
- Its visibility must be controlled by an `isHoverboardActive` state or configuration flag.
- Hoverboard power-up acquisition and protection mechanics are outside the MVP unless separately specified; the default state is inactive.

### 7.4 Input controls

The `useControls.js` hook must normalize keyboard and touch input into semantic actions: `moveLeft`, `moveRight`, `jump`, and `slide`.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move left | Left Arrow or `A` | Swipe left |
| Move right | Right Arrow or `D` | Swipe right |
| Jump | Up Arrow, `W`, or Space | Swipe up |
| Slide | Down Arrow or `S` | Swipe down |

Additional requirements:

- Listeners must be registered once and removed on unmount.
- Key repeat must not cause uncontrolled multi-lane skipping.
- Swipe recognition must use a minimum movement threshold and choose the dominant axis.
- A primarily horizontal gesture must never also trigger a vertical action.
- Input must be ignored during `loading`, `crashed`, and `gameOver`, except for the designated restart action.

### 7.5 Player model and animations

- `Player.jsx` must attempt to load `/models/character.glb` through `useGLTF` and use `useAnimations` for rigged clips.
- Supported clip names are `Idle`, `Run`, `Jump`, `Slide`, and `Crash`.
- Animation changes must reset and cross-fade into the target clip using a 0.15-second fade.
- The loader must tolerate missing clips and use the closest valid state without crashing.
- If the GLB is missing, invalid, or cannot be decoded, an error boundary or equivalent recovery path must render a complete stylized primitive character made from Three.js geometry.
- The fallback character must support the same position, tilt, hoverboard, collision, and gameplay behavior as the GLB character.
- Model loading failure must not prevent the game from reaching `ready`.

### 7.6 Camera, lighting, and atmosphere

- `GameCanvas.jsx` owns the React Three Fiber canvas, camera, renderer settings, lighting, fog, and Suspense boundary.
- The camera must clearly frame all three lanes and enough forward distance for fair obstacle reaction time.
- Directional sunlight provides the primary exterior lighting.
- Ambient or hemisphere fill lighting prevents unreadably dark shaded areas.
- Atmospheric fog must hide the far recycle boundary and support seamless chunk reuse.
- A crash triggers a short, decaying camera shake without changing the player's collision state.
- Tunnel sections must darken the ambient scene and use localized emergency lighting without an abrupt visual cut.
- Pixel ratio must be capped or adaptive to protect mobile performance.

### 7.7 Track generation and object pooling

- `TrackManager.jsx` creates a finite pool of track chunks during initialization.
- No new track chunk, obstacle, coin, or repeated scenery object may be created continuously during a run.
- When a chunk passes `Z > 15`, it must be relocated behind the current farthest chunk, maintaining an active forward range that extends to approximately `Z = -120` or farther as required by the camera and speed.
- Recycled chunks must receive a new, valid obstacle/scenery configuration from the existing pool.
- Chunk joins must align without gaps, overlapping collision surfaces, or visible seams.
- Procedural generation must be constrained by a solvability validator. At least one lane or valid train-roof route must remain navigable through every generated sequence.
- Consecutive patterns must provide enough time for the required lane change, jump, or slide at the current maximum speed.
- Random generation should accept an optional seed in development mode so bugs can be reproduced.

### 7.8 Obstacles and collectibles

`Obstacles.jsx` must support the following pooled object types:

| Type | Gameplay behavior | Required response |
| --- | --- | --- |
| Train | Tall, solid lane blocker. Some variants include a usable entrance ramp and rooftop path. | Change lane or use a valid ramp route |
| Low hurdle | Solid ground-level blocker. | Jump |
| High barrier | Elevated blocker with safe clearance underneath. | Slide |
| Coin | Non-blocking collectible that deactivates on overlap. | Move through it |
| Coin arc | Coins arranged in a parabolic formation over a hurdle or open track. | Follow the arc, usually by jumping |

Additional requirements:

- Obstacle silhouettes and colors must remain readable under exterior and tunnel lighting.
- Train ramps and rooftops must have collision surfaces aligned with their visible geometry.
- Coins must use a pooled active/inactive state and must not be collected more than once per activation.
- Active obstacle metadata must identify type, lane, chunk, collision behavior, and collection state without allocating new objects each frame.

### 7.9 Collision detection

- `useCollision.js` performs dynamic axis-aligned bounding-box checks using `THREE.Box3`.
- Player and obstacle boxes must reflect current transforms before overlap testing.
- Collision checks are limited to active colliders in the player zone `-5 < Z < 5`.
- Reusable `Box3`, `Vector3`, matrices, and other temporary objects must be allocated outside `useFrame` and reused.
- The player's box must update for jumping, sliding, lane movement, and model/fallback dimensions.
- A frontal obstacle collision must:
  1. stop world progression immediately;
  2. block further gameplay input;
  3. play the `Crash` animation or fallback pose;
  4. emit crash dust;
  5. trigger camera shake; and
  6. transition to `gameOver` after the short crash feedback window.
- A coin overlap must:
  1. mark the coin inactive immediately;
  2. increment the coin total once;
  3. award the configured score value;
  4. emit coin spark particles; and
  5. avoid stopping or slowing the run.

### 7.10 Score, progression, and persistence

- Score increases continuously based on distance traveled and the active multiplier.
- Coins are tracked independently from score.
- Speed increases gradually from a configurable starting value to a configurable maximum.
- The HUD must display score, coins, multiplier, and current speed in real time.
- Default tuning values must live in one exported configuration object rather than being scattered through components.
- Unless revised during balancing, use these MVP defaults:

| Value | Default |
| --- | --- |
| Starting multiplier | `1x` |
| Maximum multiplier | `10x` |
| Multiplier increase | `+1x` every 30 seconds survived |
| Coin count award | `+1` coin |
| Coin score award | `25 × multiplier` points |
| Slide duration | `0.75 s` |

- Distance-score rate, starting speed, acceleration, maximum speed, jump velocity, and gravity must be tuned during playtesting and remain configurable.
- High score must be stored in `localStorage` under a versioned key.
- Invalid, missing, or inaccessible storage data must fail safely and fall back to zero.
- High score must update only when the final score exceeds the stored value.
- Restart resets score, coins, multiplier, speed, player motion, pooled object state, particles, and camera shake, but preserves high score.

### 7.11 Particle effects

- `ParticleEffects.jsx` manages pooled coin sparks and crash dust.
- Effects must have fixed maximum particle counts and must recycle particles.
- Coin sparks appear at the collected coin's world position.
- Crash dust appears near the player at impact.
- Effects must stop updating when inactive and must not allocate new materials or geometries during play.
- Reduced-motion mode must shorten, simplify, or disable camera shake and nonessential particles.

### 7.12 User interface

#### Loading screen

- `LoadingScreen.jsx` is the Suspense fallback.
- It displays an actual asset-loading progress indicator rather than a simulated timer.
- It remains legible on mobile and desktop.
- A recoverable asset failure must provide a retry or fallback path.

#### HUD

- `HUD.jsx` displays real-time score, coin count, multiplier, and speedometer.
- It must subscribe only to the individual Zustand values it renders.
- It must not re-render in response to unrelated high-frequency game state.
- It must remain inside safe-area boundaries and avoid covering the center gameplay lanes.

#### Game-over modal

- `GameOverModal.jsx` displays final score, high score, collected coins, and a restart control.
- The modal must be operable by touch and keyboard.
- Restart must not reload the browser page.
- Focus must move into the modal when it opens and return to the game region after restart.

---

## 8. Environment and Visual Requirements

### 8.1 Track bed

- Three parallel railway lanes with rails, sleepers, ballast, and clear lane separation.
- Repeated sleepers and other high-count geometry must use instancing.
- Track switches and occasional raised concrete service walkways add variation without changing the lane coordinate contract.

### 8.2 Outer boundary walls and fencing

- Both outer sides of the playable corridor are bounded around `X = -5.5` and `X = 5.5`.
- Primary sections use high concrete retaining walls over brick foundations.
- Walls include randomized original graffiti, posters, stains, and weathering.
- Some sections transition to rusted chain-link security fencing topped with stylized barbed wire.
- Fence sections allow views of the distant skyline while retaining a clear boundary.
- Decals must avoid excessive transparent overdraw and must be pooled or drawn from an atlas where practical.

### 8.3 Catenary and railway infrastructure

- Arched steel catenary gantries span all three tracks every 25 world units.
- Continuous overhead electrical cables run along the corridor and appear suspended from the gantries.
- Utility poles, transformers, junction boxes, and signal towers alternate between the left and right curbs.
- Signal towers use emissive green, amber, and red lenses. Signal states are decorative in the MVP and must not imply gameplay rules.
- Repeated gantries, cable supports, poles, and signal elements use instancing where geometry/material compatibility permits.

### 8.4 Trackside clutter

The narrow area between the outer rails and boundary structures includes pooled combinations of:

- wooden cargo pallets;
- metal oil drums;
- industrial dumpsters;
- trash bags and low-cost street debris;
- track switches;
- raised concrete walkways;
- wall-mounted emergency ladders; and
- alternating streetlights with localized warm light or emissive glow.

Clutter must never overlap a playable lane collision volume unless it is intentionally registered as a gameplay obstacle.

### 8.5 Tunnel sections

- Procedural generation periodically introduces arched concrete tunnel portals.
- Portals transition into darker tunnel chunks with pillars, interior wall materials, and emergency lights.
- Fog, lighting, and environment colors blend over a short distance instead of switching instantly.
- Tunnel geometry must preserve all three lanes and the same obstacle rules.
- Portal geometry must not clip the camera or hide unavoidable obstacles.

### 8.6 City backdrop

- Low-poly skyscrapers, highway overpasses, rooftop shapes, and original billboards appear beyond both boundary sides.
- Backdrop layers move at visually different rates to create parallax depth.
- Background geometry has no gameplay collision.
- Distant assets use simplified materials and geometry, with fog masking their recycle boundary.

---

## 9. Technical Architecture

### 9.1 Required stack

| Area | Technology |
| --- | --- |
| Application framework | React + Vite, ES6+ |
| 3D rendering | Three.js through `@react-three/fiber` |
| 3D helpers and asset loading | `@react-three/drei` |
| State management | Zustand |
| Styling | Tailwind CSS |

### 9.2 Required source structure

```text
src/
  components/
    Canvas/
      GameCanvas.jsx
      Player.jsx
      TrackManager.jsx
      SceneryManager.jsx
      Obstacles.jsx
      ParticleEffects.jsx
    UI/
      HUD.jsx
      GameOverModal.jsx
      LoadingScreen.jsx
  hooks/
    useControls.js
    useCollision.js
  store/
    useGameStore.js
  App.jsx
  main.jsx
```

The implementation must also include every project-level file needed for a clean build, including `package.json`, `index.html`, Vite configuration, Tailwind/PostCSS configuration as required by the selected Tailwind version, and global stylesheet entry points.

### 9.3 Component responsibilities

| File | Responsibility |
| --- | --- |
| `GameCanvas.jsx` | Canvas creation, camera, renderer settings, lighting, atmosphere, fog, Suspense, WebGL fallback, and camera shake |
| `Player.jsx` | GLB/fallback rendering, animation blending, lane interpolation, jump/slide transform, hoverboard, and player bounds |
| `TrackManager.jsx` | Track chunk lifecycle, procedural layouts, pooling, recycling, and world movement |
| `SceneryManager.jsx` | Left/right walls, fences, gantries, cables, utility assets, clutter, tunnel dressing, skyline, instancing, and recycling |
| `Obstacles.jsx` | Pooled trains, barriers, ramps, rooftops, coins, and coin arcs |
| `ParticleEffects.jsx` | Pooled coin and crash effects |
| `HUD.jsx` | Live gameplay metrics with selective state subscriptions |
| `GameOverModal.jsx` | Results, persisted high score, focus handling, and restart |
| `LoadingScreen.jsx` | Asset progress, loading state, and recoverable failure UI |
| `useControls.js` | Normalized keyboard and touch gesture input |
| `useCollision.js` | Allocation-free active-zone AABB collision and collection checks |
| `useGameStore.js` | Canonical run state, score, coins, multiplier, speed, actions, and reset logic |
| `App.jsx` | Top-level game composition, overlays, and error boundaries |
| `main.jsx` | React bootstrap and global styles |

### 9.4 State management requirements

The Zustand store must include, at minimum:

- `runState`
- `isGameOver` as a derived or synchronized compatibility flag
- `speed`
- `score`
- `coins`
- `multiplier`
- `highScore`
- `isHoverboardActive`
- actions for start, crash, game over, restart, score tick, coin collection, speed update, and multiplier update

High-frequency simulation values that do not affect UI should remain in refs or pooled object structures. Frame-loop code should use direct store access where appropriate instead of causing React tree re-renders.

### 9.5 Simulation ownership

- One frame-loop owner must advance world distance and speed-dependent movement to avoid double updates.
- Rendering components may read the shared distance/speed but must not independently advance the same objects.
- Gameplay must use delta-time movement and clamp unusually large deltas after tab suspension.
- The run must not continue scoring or moving while the browser tab is hidden or while the run state is not `running`.

---

## 10. Performance Requirements

### 10.1 Targets

| Metric | Requirement |
| --- | --- |
| Frame rate | Target 60 FPS during normal play on a contemporary mid-range phone or mainstream laptop |
| Draw calls | Fewer than 50 during representative gameplay |
| Runtime allocation | No continuous per-frame object, array, geometry, or material allocation in core movement and collision loops |
| Object count | Bounded for the entire run; a 15-minute session must not continually increase active scene objects |
| Collision scope | Only colliders in `-5 < Z < 5` are tested against the player |
| Loading | Initial experience shows measurable progress and never presents a permanently blank canvas |

### 10.2 Required optimization techniques

- `THREE.InstancedMesh` for repeated wall sections, sleepers, gantries, lamps, poles, and compatible clutter.
- Finite object pools for chunks, obstacles, coins, scenery variations, and particles.
- Shared geometries, materials, and texture atlases where practical.
- Preallocated `THREE.Box3`, `THREE.Vector3`, matrices, and scratch values for frame-loop math.
- Selective Zustand subscriptions for UI.
- Capped/adaptive device pixel ratio.
- Frustum-appropriate active ranges and fog-hidden recycling.
- No React state updates every frame for values that do not need DOM rendering.

### 10.3 Performance validation

- Profile a representative exterior section and tunnel section.
- Run continuously for at least 15 minutes and confirm stable object counts and no monotonic memory growth caused by game logic.
- Verify no recurring garbage-collection spikes are introduced by frame-loop allocations.
- Confirm the draw-call target using the renderer's diagnostic information in a development-only overlay or console report.

---

## 11. Accessibility and Usability

- HUD text and modal controls must meet WCAG AA contrast where practical.
- Essential information cannot depend on color alone.
- Buttons must have visible focus states and accessible names.
- The game-over flow must be keyboard operable.
- Reduced-motion preference must reduce camera shake and nonessential particles.
- Touch targets must be at least 44 by 44 CSS pixels.
- Gameplay instructions must identify both keyboard and swipe controls before or at the beginning of the first run.
- Decorative canvas content should not overwhelm screen-reader users; the DOM UI must provide the meaningful score and status information.

---

## 12. Asset and Content Requirements

- `/models/character.glb` is optional at runtime because a functional primitive fallback is mandatory.
- All textures must have clear usage rights and production-appropriate compression.
- Graffiti and billboards must be original, generic, or licensed; no real-world trademarks are required.
- Asset filenames must be stable and case-correct for deployment on case-sensitive hosts.
- Large textures should be sized for web use and reused through atlases where possible.
- Missing optional environment textures must fall back to procedural colors/materials without stopping play.
- The repository must not require uncommitted local files to build successfully.

---

## 13. Error Handling and Resilience

- Character model failure activates the primitive player fallback.
- Optional texture or scenery asset failure uses a basic material fallback.
- WebGL initialization failure displays a clear unsupported-browser message outside the canvas.
- Corrupt `localStorage` data is ignored and replaced with safe defaults.
- Repeated restart actions are idempotent and cannot create duplicate listeners, frame loops, or pooled objects.
- Tab suspension and large frame deltas cannot teleport active obstacles through the player without collision evaluation.
- React error boundaries must prevent a single optional asset failure from replacing the entire page with a blank screen.

---

## 14. Analytics and Privacy

The MVP has no remote analytics, account system, advertising identifiers, or networked player data. High score and settings remain in local browser storage. Any future telemetry must be separately specified with consent and privacy requirements.

---

## 15. Acceptance Criteria

The MVP is accepted only when all criteria below pass.

### 15.1 Build and startup

- A clean install followed by the documented development and production build commands succeeds without manual code edits.
- The game reaches a playable state when `/models/character.glb` exists.
- The game also reaches a playable state when `/models/character.glb` is absent or invalid.
- No source file contains omitted logic, placeholder comments, or incomplete pseudo-code.

### 15.2 Controls and movement

- Arrow keys, WASD, Space, and directional swipes trigger the documented actions.
- The player cannot leave the three lane centers.
- Lane transitions are smooth and show a turn tilt of no more than 15 degrees.
- Jumping follows a gravity-based arc and lands reliably.
- Sliding lasts 0.75 seconds and reduces the active player collider height by 50%.
- Airborne slide input accelerates descent.

### 15.3 World generation

- The track and both sides of the corridor remain visually populated during continuous play.
- Recycled chunks do not reveal gaps, overlaps, or visible spawn flashes.
- Catenary gantries repeat every 25 world units.
- Exterior wall/fence sections, rail infrastructure, clutter, tunnel sections, and city backdrop all appear during a representative run.
- Generated obstacle patterns retain at least one valid route.
- Object and pool counts remain bounded after 15 minutes.

### 15.4 Obstacles and collision

- Trains, low hurdles, high barriers, coins, and coin arcs all spawn from pools.
- Low hurdles are avoidable by jumping; high barriers are avoidable by sliding.
- Coin collection increments exactly once, triggers sparks, and deactivates the coin.
- A frontal collision freezes forward motion immediately, triggers crash feedback, and opens the game-over modal.
- Only obstacles within the configured active Z zone are considered for collision.
- Player collision dimensions change correctly during jump and slide.

### 15.5 UI and persistence

- Score, coins, multiplier, and speed update correctly in the HUD.
- Final score and high score appear in the game-over modal.
- A new high score survives a browser refresh through `localStorage`.
- Restart begins a clean run without reloading the page or duplicating event listeners.
- HUD and modal remain usable at desktop and 320-pixel-wide mobile viewports.

### 15.6 Performance

- Representative gameplay stays under 50 draw calls.
- No core `useFrame` loop creates recurring temporary Three.js math objects.
- The game targets 60 FPS on the defined device class, with adaptive rendering safeguards on slower devices.
- A 15-minute test shows no unbounded increase in chunks, obstacles, coins, particles, geometries, or materials.

---

## 16. QA Test Matrix

| Area | Test cases |
| --- | --- |
| Build | Clean install, development start, production build, production preview |
| Model fallback | Valid GLB, missing GLB, corrupt GLB, missing animation clips |
| Keyboard | Arrows, WASD, Space, held keys, rapid alternating lane inputs |
| Touch | Four swipe directions, diagonal gestures, short taps, browser-edge gestures |
| Movement | Boundary lanes, jump at lane switch, slide at lane switch, airborne slide, repeated restart |
| Collision | Each obstacle type, collider edges, high speed, slide height, rooftop/ramp surface |
| Generation | Long run, maximum speed, consecutive recycle events, tunnel transition, valid path guarantee |
| Persistence | No stored value, valid high score, corrupt value, unavailable storage |
| Responsive UI | 320 px mobile, portrait, landscape, desktop, safe-area inset |
| Performance | Exterior, tunnel, particles active, maximum speed, 15-minute soak test |
| Accessibility | Keyboard focus, modal focus trap/return, reduced motion, contrast, labels |

---

## 17. Delivery Requirements

The implementation handoff must include:

1. Complete source code for every required file.
2. All configuration and dependency files required by React, Vite, Tailwind CSS, R3F, Drei, Three.js, and Zustand.
3. Original or licensed local assets included in the repository, with fallbacks for optional assets.
4. A README with install, development, build, preview, controls, asset replacement, and performance-validation instructions.
5. No truncated code, hidden dependencies, pseudo-code, TODO-only behavior, or comments that substitute for implementation.
6. A successful production build and a documented manual QA result against the acceptance criteria.

---

## 18. Implementation Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Excessive environment detail | Low frame rate and high draw calls | Use instancing, shared materials, atlases, fog, and simplified distant geometry |
| Per-frame allocations | Garbage-collection stutter | Preallocate math objects and use fixed pools outside frame loops |
| Impossible procedural layouts | Unfair unavoidable crashes | Validate every generated sequence against reaction-time and route constraints |
| GLB or animation mismatch | Blank player or broken gameplay | Primitive fallback, tolerant clip mapping, and asset error boundary |
| Touch gestures conflict with browser behavior | Missed or accidental actions | Use dominant-axis thresholds, appropriate `touch-action`, and scoped listeners |
| Tunnel lighting hides hazards | Poor gameplay readability | Maintain obstacle contrast and blend lighting gradually |
| High-speed tunneling through colliders | Missed collisions | Clamp delta time and use swept or sub-stepped checks when displacement exceeds collider depth |
| Reference-game similarity | Legal or brand risk | Use original art direction, names, characters, UI, audio, environments, and balancing |

---

## 19. Open Product Decisions

These choices do not block the architecture but should be resolved before final art and balance lock:

1. Final product name and original visual identity.
2. Exact starting speed, acceleration curve, maximum speed, jump velocity, gravity, and distance-score rate.
3. Whether hoverboards become a collectible protection mechanic in a later release.
4. Whether sound effects and music are included in the MVP or a follow-up milestone.
5. Exact target-device benchmark models for performance sign-off.

---

## 20. Definition of Done

The product is done when it provides a complete start-to-game-over-to-restart loop, includes the required three-lane movement and obstacle behaviors, renders rich railway scenery on both sides, remains playable without the optional character model, passes the acceptance criteria, meets the bounded-memory and draw-call targets, and builds cleanly as a deployable static web application using the required technology stack.
