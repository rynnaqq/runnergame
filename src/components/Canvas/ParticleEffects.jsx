import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CONFIG } from '../../config.js'
import { SIM } from '../../game/sim.js'
import { setBurstFunction } from '../../hooks/useCollision.js'

// Two pooled THREE.Points systems: coin sparks + crash dust. Fixed counts,
// typed-array state, ring-cursor emission, zero per-frame allocation.
// burst() is the module API consumed by useCollision via setBurstFunction.

const SPARKS = CONFIG.coinParticleCount
const DUST = CONFIG.dustParticleCount
const BURST_COUNT = 12
const BURST_COUNT_REDUCED = 4

function makeSystem(count, color, size) {
  const positions = new Float32Array(count * 3).fill(-999)
  const velocities = new Float32Array(count * 3)
  const life = new Float32Array(count)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.9, depthWrite: false,
  })
  return {
    count, positions, velocities, life,
    points: new THREE.Points(geometry, material),
    cursor: 0, alive: 0,
    frustumCulled: false,
  }
}

const sparkSystem = makeSystem(SPARKS, '#ffd23e', 0.18)
const dustSystem = makeSystem(DUST, '#9c8f80', 0.28)
const systems = { spark: sparkSystem, dust: dustSystem }

function emit(sys, x, y, z, n, spread, speed) {
  for (let k = 0; k < n; k++) {
    const i = sys.cursor
    sys.cursor = (sys.cursor + 1) % sys.count
    const i3 = i * 3
    sys.positions[i3] = x
    sys.positions[i3 + 1] = y
    sys.positions[i3 + 2] = z
    const a = Math.random() * Math.PI * 2
    const r = Math.random()
    sys.velocities[i3] = Math.cos(a) * r * spread
    sys.velocities[i3 + 1] = speed * (0.5 + Math.random() * 0.5)
    sys.velocities[i3 + 2] = Math.sin(a) * r * spread
    sys.life[i] = 0.6 + Math.random() * 0.3
  }
  sys.alive = Math.min(sys.alive + n, sys.count)
}

// Module API (registered into useCollision on mount).
export function burst(kind, x, y, z) {
  const sys = systems[kind]
  if (!sys) return
  if (SIM.reducedMotion) {
    if (kind === 'dust') return // dust disabled under reduced motion
    emit(sys, x, y, z, BURST_COUNT_REDUCED, 0.8, 1.4)
    return
  }
  emit(sys, x, y, z, BURST_COUNT, 1.6, 2.2)
}

function stepSystem(sys, dt) {
  if (sys.alive <= 0) return
  let stillAlive = 0
  for (let i = 0; i < sys.count; i++) {
    if (sys.life[i] <= 0) continue
    sys.life[i] -= dt
    const i3 = i * 3
    sys.positions[i3] += sys.velocities[i3] * dt
    sys.positions[i3 + 1] += sys.velocities[i3 + 1] * dt
    sys.positions[i3 + 2] += sys.velocities[i3 + 2] * dt
    sys.velocities[i3 + 1] += CONFIG.gravity * 0.4 * dt
    if (sys.life[i] <= 0) {
      sys.positions[i3 + 1] = -999
    } else {
      stillAlive++
    }
  }
  sys.alive = stillAlive
  sys.points.geometry.attributes.position.needsUpdate = true
}

export default function ParticleEffects() {
  const rootRef = useRef(null)
  const sceneRef = useRef(null)

  // Register burst into useCollision once.
  useMemo(() => {
    setBurstFunction(burst)
  }, [])

  useFrame(({ scene }, rawDelta) => {
    if (sceneRef.current !== scene) {
      sceneRef.current = scene
      rootRef.current?.add(sparkSystem.points)
      rootRef.current?.add(dustSystem.points)
    }
    if (!rootRef.current || rootRef.current.parent !== scene) {
      if (rootRef.current) scene.add(rootRef.current)
    }
    const dt = Math.min(rawDelta, CONFIG.deltaClamp)
    stepSystem(sparkSystem, dt)
    stepSystem(dustSystem, dt)
  })

  return <group ref={rootRef} />
}
