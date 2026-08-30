import { describe, it, expect } from 'vitest'
import { inZone, overlaps, coinHit } from './useCollision.js'

describe('collision predicates', () => {
  it('zone filter -5 < z < 5', () => {
    expect(inZone({ min: { z: -6 }, max: { z: -4.5 } })).toBe(true)
    expect(inZone({ min: { z: 5.2 }, max: { z: 7 } })).toBe(false)
    expect(inZone({ min: { z: -20 }, max: { z: 0 } })).toBe(true)
  })
  it('AABB overlap on all axes', () => {
    const a = { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 1.7, z: 0.3 } }
    expect(overlaps(a, { min: { x: -0.5, y: 0, z: -0.4 }, max: { x: 0.5, y: 2, z: 0.4 } })).toBe(true)
    expect(overlaps(a, { min: { x: 0.31, y: 0, z: -0.4 }, max: { x: 1, y: 2, z: 0.4 } })).toBe(false)
    expect(overlaps(a, { min: { x: -1, y: 1.8, z: -0.4 }, max: { x: 1, y: 3, z: 0.4 } })).toBe(false)
  })
  it('slide-height player box clears high barrier gap (y 1.1..2.0)', () => {
    const barrier = { min: { x: -1, y: 1.1, z: -0.4 }, max: { x: 1, y: 2.0, z: 0.4 } }
    const sliding = { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 0.85, z: 0.3 } }
    expect(overlaps(sliding, barrier)).toBe(false)
    const standing = { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 1.7, z: 0.3 } }
    expect(overlaps(standing, barrier)).toBe(true)
  })
  it('coin hit radius', () => {
    expect(coinHit({ x: 0, y: 0.9, z: 0.5 }, 0, 0, 1.7)).toBe(true) // ground coin, grounded player
    expect(coinHit({ x: 0, y: 2.4, z: 0.5 }, 0, 0, 1.7)).toBe(false) // too high to reach standing
    expect(coinHit({ x: 2.5, y: 0.9, z: 0.5 }, 0, 0, 1.7)).toBe(false) // other lane
    expect(coinHit({ x: 0, y: 1.8, z: 0.2 }, 0, 1.2, 1.7)).toBe(true) // arc coin mid-jump
  })
})
