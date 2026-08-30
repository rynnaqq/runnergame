# Railway Rush

A 3D endless runner for desktop and mobile web, built with React, Three.js
(via React Three Fiber), Zustand, and Tailwind CSS. Dodge trains, hurdles, and
barriers across three railway lanes, collect coins, and chase the high score.

## Requirements

- Node.js 18+ (tested on Node 26)
- A browser with WebGL 2 support

## Install, develop, build

```bash
npm install        # install dependencies
npm run dev        # start the dev server (shows local URL)
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm test           # run unit tests (Vitest)
```

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move left | Left Arrow or A | Swipe left |
| Move right | Right Arrow or D | Swipe right |
| Jump | Up Arrow, W, or Space | Swipe up |
| Slide | Down Arrow or S | Swipe down |

The run starts on the first directional input (or the "Tap to start" button).

## Character model (optional)

The game looks for a GLB character at `public/models/character.glb`. If the
file is missing or invalid, a stylized primitive character is used instead —
the game always remains playable. To use your own model:

1. Place your file at `public/models/character.glb` (lowercase, exact name —
   case-sensitive on most hosts).
2. Include animation clips named (case-insensitive substrings are accepted):
   `Idle`, `Run`, `Jump`, `Slide`, `Crash`. Missing clips fall back to the
   nearest valid state.

## Tuning

All gameplay tuning (speed, gravity, jump velocity, slide duration, scoring,
lane positions, spawn gaps, particle counts) lives in one place:
`src/config.js`.

## Reproducible generation (development)

Append a seed to the dev URL to get a deterministic obstacle stream:
`http://localhost:5173/?seed=42`.

## Performance validation

A dev-only console report prints every 5 seconds while the game runs:

```
[perf] drawCalls=<n> fps=<n> objects=<n>
```

Acceptance targets (PRD §10):

- draw calls < 50 during representative play
- 60 FPS target on mid-range devices (DPR is capped at [1, 2])
- `objects=` stays constant over long sessions (bounded pools — run 15+ minutes
  to confirm no growth)

Reduced-motion OS preference shortens/disables camera shake and particles.

## Architecture overview

```
src/
  components/
    Canvas/    GameCanvas, Player, TrackManager, SceneryManager,
               Obstacles, ParticleEffects
    UI/        HUD, GameOverModal, LoadingScreen
  hooks/       useControls (input), useCollision (AABB + coin overlap)
  game/        sim (simulation state), patterns (generation), support
               (player state/surfaces), colliders, coins
  store/       useGameStore (zustand: run state, score, persistence)
```

One frame loop (TrackManager) advances the world; the player stays near Z=0.
Chunks, obstacles, coins, scenery, and particles are finite pools — nothing is
allocated per frame in movement/collision loops.
