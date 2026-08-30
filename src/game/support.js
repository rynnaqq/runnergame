import * as THREE from 'three'
import { CONFIG } from '../config.js'

// Player AABB, updated every frame by Player.jsx. Consumers read it.
export const playerBox = new THREE.Box3()

// Active ramp/roof surfaces: { x, halfW, zStart, zEnd, h0, h1 } (world Z,
// linear height h0 -> h1 across [zStart, zEnd]). Registered by Obstacles.
export const supportSurfaces = []

const supportOut = { h: 0 }
export { supportOut }

// Query the support height under (x, z). Allocation-free: pass an object with
// an `h` field (or use the module default) and read out.h.
export function supportHeightAt(x, z, out = supportOut) {
  out.h = 0
  for (let i = 0; i < supportSurfaces.length; i++) {
    const s = supportSurfaces[i]
    if (!s.active) continue
    if (Math.abs(x - s.x) > s.halfW) continue
    if (z < s.zStart || z > s.zEnd) continue
    const t = s.zEnd === s.zStart ? 1 : (z - s.zStart) / (s.zEnd - s.zStart)
    const h = s.h0 + (s.h1 - s.h0) * t
    if (h > out.h) out.h = h
  }
  return out
}

// Canonical player simulation state, shared with collision/effects/camera.
export const playerState = {
  lane: 1,
  x: 0,
  y: 0,
  vy: 0,
  grounded: true,
  sliding: false,
  slideTimer: 0,
  roll: 0,
  crashed: false,
}

export function resetPlayer() {
  playerState.lane = 1
  playerState.x = 0
  playerState.y = 0
  playerState.vy = 0
  playerState.grounded = true
  playerState.sliding = false
  playerState.slideTimer = 0
  playerState.roll = 0
  playerState.crashed = false
  playerBox.makeEmpty()
}

// Scratch vectors for collider updates (preallocated, never in the loop).
export const scratchVecA = new THREE.Vector3()
export const scratchVecB = new THREE.Vector3()

export function updatePlayerBox() {
  const h = playerState.sliding && playerState.grounded
    ? CONFIG.playerHeight * CONFIG.slideHeightFactor
    : CONFIG.playerHeight
  scratchVecA.set(playerState.x, playerState.y + h / 2, 0)
  scratchVecB.set(CONFIG.playerHalfWidth * 2, h, 0.6)
  playerBox.setFromCenterAndSize(scratchVecA, scratchVecB)
}
