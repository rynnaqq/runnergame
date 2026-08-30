// Pure collision predicates (allocation-free, testable on plain objects) plus
// the useCollision frame hook. Mounted once in GameCanvas.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CONFIG } from '../config.js'
import { useGameStore, RUN } from '../store/useGameStore.js'
import { SIM } from '../game/sim.js'
import { playerBox, playerState } from '../game/support.js'
import { colliders } from '../game/colliders.js'
import { coinPool, COIN_COUNT } from '../game/coins.js'

export function inZone(box) {
  return box.min.z < CONFIG.zoneFar && box.max.z > CONFIG.zoneNear
}

export function overlaps(a, b) {
  return (
    a.min.x < b.max.x && a.max.x > b.min.x &&
    a.min.y < b.max.y && a.max.y > b.min.y &&
    a.min.z < b.max.z && a.max.z > b.min.z
  )
}

export function coinHit(coin, px, py, playerHeight) {
  return (
    Math.abs(coin.x - px) < 0.8 &&
    Math.abs(coin.y - (py + playerHeight / 2)) < 1.0 &&
    Math.abs(coin.z) < 1.0
  )
}

// Crash feedback burst — wired to ParticleEffects (Task 8); no-op until then.
let burstFn = null
export function setBurstFunction(fn) {
  burstFn = fn
}
function burst(kind, x, y, z) {
  burstFn?.(kind, x, y, z)
}

export function useCollision() {
  const endedRef = useRef(false)

  useFrame(() => {
    const store = useGameStore.getState()
    if (store.runState !== RUN.RUNNING) {
      endedRef.current = false
      return
    }
    if (!inZone(playerBox)) return

    // Obstacle AABBs (zone-filtered first — cheap z test via box fields).
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i]
      if (!c || !c.active) continue
      if (!inZone(c.box)) continue
      if (overlaps(playerBox, c.box)) {
        crash(store)
        return
      }
    }

    // Coins: distance test on actives near the player.
    const p = playerState
    const h = p.sliding && p.grounded ? CONFIG.playerHeight * CONFIG.slideHeightFactor : CONFIG.playerHeight
    for (let i = 0; i < COIN_COUNT; i++) {
      const coin = coinPool[i]
      if (!coin.active) continue
      const cz = coinWorldZ[coin.chunk]
      if (cz === undefined) continue
      coin.z = cz - coin.localZ
      if (Math.abs(coin.z) > 1.0) continue
      if (coinHit(coin, p.x, p.y, h)) {
        coin.active = false
        coin.z = -999
        store.addCoin()
        burst('spark', coin.x, coin.y, 0)
      }
    }
  })
}

export const coinWorldZ = []

function crash(store) {
  store.crash()
  SIM.shake = 1
  playerState.crashed = true
  const p = playerState
  burst('dust', p.x, p.y + 0.5, 0)
  // Crash feedback window, then game over (endRun is guarded + idempotent).
  setTimeout(() => {
    useGameStore.getState().endRun()
  }, 900)
}
