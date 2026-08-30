import { describe, it, expect, beforeEach } from 'vitest'
import { PATTERNS, nextPattern, resetPatternStream, mulberry32, TRAIN_LENGTH, SMALL_DEPTH } from './patterns.js'
import { CONFIG } from '../config.js'

const passable = { train: null, hurdle: 'jump', barrier: 'slide' }

beforeEach(() => {
  resetPatternStream()
})

describe('pattern library', () => {
  it('every pattern keeps at least one lane passable at every obstacle z-band', () => {
    for (const p of PATTERNS) {
      const bands = []
      for (const o of p.obstacles) {
        const len = o.type === 'train' ? TRAIN_LENGTH : SMALL_DEPTH
        bands.push({ z0: o.z, z1: o.z + len, lanes: new Map() })
      }
      for (const b of bands) {
        for (const o of p.obstacles) {
          const len = o.type === 'train' ? TRAIN_LENGTH : SMALL_DEPTH
          if (o.z < b.z1 && o.z + len > b.z0) b.lanes.set(o.lane, passable[o.type])
        }
        const free = [0, 1, 2].filter((l) => !b.lanes.has(l))
        const actionable = [...b.lanes.values()]
        expect(free.length > 0 || actionable.every(Boolean), `${p.id} band ${b.z0}`).toBe(true)
        expect(b.lanes.size < 3 || actionable.every(Boolean), `${p.id} trains wall`).toBe(true)
      }
    }
  })
  it('coin arcs over hurdles reach jumpable apex above hurdle height', () => {
    for (const p of PATTERNS) {
      for (const c of p.coins) {
        if (c.y > 1.0) {
          const under = p.obstacles.some((o) => o.type === 'hurdle' && o.lane === c.lane && Math.abs(o.z - c.z) < 2)
          if (under) expect(c.y).toBeGreaterThanOrEqual(1.4)
        }
      }
    }
  })
  it('obstacles stay within chunk bounds and valid lanes', () => {
    for (const p of PATTERNS) {
      for (const o of p.obstacles) {
        expect([0, 1, 2]).toContain(o.lane)
        expect(o.z).toBeGreaterThanOrEqual(0)
        expect(o.z + (o.type === 'train' ? TRAIN_LENGTH : SMALL_DEPTH)).toBeLessThanOrEqual(CONFIG.chunkLength)
      }
      for (const c of p.coins) {
        expect([0, 1, 2]).toContain(c.lane)
        expect(c.z).toBeGreaterThanOrEqual(0); expect(c.z).toBeLessThan(CONFIG.chunkLength)
        // Coins ride the ground (0.5), jump arcs (<= 2), or train roofs (2.55).
        expect(c.y).toBeGreaterThanOrEqual(0.5); expect(c.y).toBeLessThanOrEqual(2.6)
      }
    }
  })
  it('nextPattern enforces reaction gap between consecutive obstacle groups across chunks', () => {
    const rng = mulberry32(42)
    let lastEnd = -Infinity
    let sawObstacles = false
    for (let i = 0; i < 30; i++) {
      const chunkStartWorldZ = -i * CONFIG.chunkLength
      const r = nextPattern(rng, chunkStartWorldZ)
      if (r.pattern.obstacles.length > 0) {
        if (Number.isFinite(lastEnd)) {
          expect(r.worldFirstZ - lastEnd).toBeGreaterThanOrEqual(CONFIG.reactionGapMin)
        }
        lastEnd = r.worldLastEndZ
        sawObstacles = true
      }
    }
    expect(sawObstacles).toBe(true)
  })
  it('mulberry32 is deterministic per seed', () => {
    const a = mulberry32(7), b = mulberry32(7)
    for (let i = 0; i < 10; i++) expect(a()).toBe(b())
  })
})
