import * as THREE from 'three'

// Fixed-capacity collider registry. Written by Obstacles on configure/recycle,
// refreshed per frame (active only) with direct scalar math, read by collision.
export const MAX_COLLIDERS = 40
export const colliders = Array.from({ length: MAX_COLLIDERS }, () => null)

export function makeCollider() {
  return {
    type: 'train', // 'train' | 'hurdle' | 'barrier'
    lane: 1,
    chunk: -1,
    active: false,
    localZ: 0, // z within chunk (min edge)
    halfDepth: 0.4,
    minX: 0, maxX: 0,
    minY: 0, maxY: 0,
    box: new THREE.Box3(),
  }
}

export function resetColliders() {
  for (let i = 0; i < colliders.length; i++) {
    if (colliders[i]) colliders[i].active = false
  }
}
