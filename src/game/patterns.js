import { CONFIG } from '../config.js'
import { SIM } from './sim.js'

// Authored, solvable obstacle patterns. z is relative to chunk start [0, 30).
// Types: train (blocks lane / roof route), hurdle (jump), barrier (slide).
export const TRAIN_LENGTH = 14
export const SMALL_DEPTH = 0.8

export const PATTERNS = [
  {
    id: 'empty',
    obstacles: [],
    coins: line(1, 5, 4, 0.5),
  },
  {
    id: 'hurdle-center-arc',
    obstacles: [{ type: 'hurdle', lane: 1, z: 8 }],
    coins: arc(1, 3.5, 8, 1.8),
  },
  {
    id: 'hurdle-sides',
    obstacles: [
      { type: 'hurdle', lane: 0, z: 8 },
      { type: 'hurdle', lane: 2, z: 8 },
    ],
    coins: line(1, 5, 5, 0.5),
  },
  {
    id: 'barrier-left',
    obstacles: [{ type: 'barrier', lane: 0, z: 10 }],
    coins: line(1, 5, 6, 0.5),
  },
  {
    id: 'train-center',
    obstacles: [{ type: 'train', lane: 1, z: 2 }],
    coins: [
      ...line(0, 3, 4, 0.5),
      ...line(2, 3, 4, 0.5),
    ],
  },
  {
    id: 'train-right-ramp',
    obstacles: [
      { type: 'train', lane: 2, z: 2, ramp: true },
      { type: 'hurdle', lane: 0, z: 12 },
    ],
    coins: [
      ...arc(2, 2.5, 4.5, 2.55),
      ...line(2, 3, 9, 2.55),
    ],
  },
  {
    id: 'barriers-sides',
    obstacles: [
      { type: 'barrier', lane: 0, z: 10 },
      { type: 'barrier', lane: 2, z: 10 },
    ],
    coins: line(1, 5, 6, 0.5),
  },
  {
    id: 'hurdle-stagger',
    obstacles: [
      { type: 'hurdle', lane: 0, z: 5 },
      { type: 'hurdle', lane: 2, z: 18 },
    ],
    coins: [
      ...line(0, 2, 3.5, 0.5),
      ...line(1, 2, 10, 0.5),
      ...line(2, 2, 16.5, 0.5),
    ],
  },
  {
    id: 'train-left-long',
    obstacles: [
      { type: 'train', lane: 0, z: 2 },
      { type: 'train', lane: 1, z: 2 },
    ],
    coins: line(2, 5, 4, 0.5),
  },
  {
    id: 'double-row',
    obstacles: [
      { type: 'barrier', lane: 1, z: 6 },
      { type: 'hurdle', lane: 1, z: 20 },
    ],
    coins: [
      ...line(0, 2, 4, 0.5),
      ...arc(1, 18.5, 20, 1.8),
    ],
  },
]

function line(lane, count, zStart, y) {
  const coins = []
  for (let i = 0; i < count; i++) coins.push({ lane, z: zStart + i * 1.5, y })
  return coins
}

// Parabolic coin arc over position (peakZ, apex y).
function arc(lane, zStart, peakZ, apexY) {
  const coins = []
  const count = 5
  const span = peakZ - zStart
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const z = zStart + span * t
    const y = 0.5 + (apexY - 0.5) * Math.sin(Math.PI * t)
    coins.push({ lane, z, y })
  }
  return coins
}

// Seeded RNG (mulberry32) for reproducible dev runs via ?seed=
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let lastEndWorldZ = -Infinity

export function resetPatternStream() {
  lastEndWorldZ = -Infinity
}

function patternEndLocal(pattern) {
  let end = -Infinity
  for (const o of pattern.obstacles) {
    const len = o.type === 'train' ? TRAIN_LENGTH : SMALL_DEPTH
    end = Math.max(end, o.z + len)
  }
  return end
}

// Pick the next pattern + placement offset for the chunk whose local z=0 sits
// at world Z `chunkStartWorldZ`. The reaction gap between consecutive obstacle
// groups is enforced in WORLD space so it holds across chunk boundaries.
// Returns local placement for the chunk plus world-space markers.
export function nextPattern(rng, chunkStartWorldZ) {
  const minGap = Math.max(CONFIG.reactionGapMin, SIM.speed * 1.1)
  for (let attempt = 0; attempt < PATTERNS.length; attempt++) {
    const idx = Math.floor(rng() * PATTERNS.length)
    const pattern = PATTERNS[idx]
    if (pattern.obstacles.length === 0) {
      return { pattern, offset: 0, firstZ: Infinity, lastEndZ: -Infinity, worldFirstZ: Infinity, worldLastEndZ: -Infinity }
    }
    const firstLocal = Math.min(...pattern.obstacles.map((o) => o.z))
    const endLocal = patternEndLocal(pattern)
    const minOffset = Number.isFinite(lastEndWorldZ)
      ? lastEndWorldZ + minGap - chunkStartWorldZ - firstLocal
      : 0
    const offset = Math.max(0, minOffset)
    if (endLocal + offset <= CONFIG.chunkLength) {
      const worldFirstZ = chunkStartWorldZ + firstLocal + offset
      const worldLastEndZ = chunkStartWorldZ + endLocal + offset
      lastEndWorldZ = worldLastEndZ
      return { pattern, offset, firstZ: firstLocal + offset, lastEndZ: endLocal + offset, worldFirstZ, worldLastEndZ }
    }
  }
  // Nothing fits behind the previous group in this chunk: empty filler.
  // lastEndWorldZ persists — the constraint survives the chunk boundary.
  return { pattern: PATTERNS[0], offset: 0, firstZ: Infinity, lastEndZ: -Infinity, worldFirstZ: Infinity, worldLastEndZ: -Infinity }
}
