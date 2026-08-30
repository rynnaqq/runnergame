import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CONFIG } from '../../config.js'
import { useGameStore, RUN } from '../../store/useGameStore.js'
import { SIM, resetSim } from '../../game/sim.js'
import { nextPattern, resetPatternStream, mulberry32 } from '../../game/patterns.js'

// Chunk registry: TrackManager owns the pools and the ONE world-movement loop.
// Obstacles/Scenery attach pooled children into chunk groups and reconfigure
// them on recycle via these callbacks.
const chunkConfigurators = [] // fn(chunkIndex, rng)

export function registerChunkConfigurator(fn) {
  chunkConfigurators.push(fn)
  return () => {
    const i = chunkConfigurators.indexOf(fn)
    if (i >= 0) chunkConfigurators.splice(i, 1)
  }
}

function makeRng() {
  if (import.meta.env.DEV) {
    const seedParam = new URLSearchParams(window.location.search).get('seed')
    if (seedParam !== null) return mulberry32(Number(seedParam) || 0)
  }
  return mulberry32((Math.random() * 0xffffffff) >>> 0)
}

// Merged track base: ballast slab + 2 rails per lane. One geometry, one draw.
function buildTrackBaseGeometry() {
  const parts = []
  const slab = new THREE.BoxGeometry(8, 0.2, CONFIG.chunkLength)
  slab.translate(0, -0.1, -CONFIG.chunkLength / 2)
  parts.push(slab)
  for (const laneX of CONFIG.lanes) {
    for (const railOffset of [-0.7, 0.7]) {
      const rail = new THREE.BoxGeometry(0.12, 0.14, CONFIG.chunkLength)
      rail.translate(laneX + railOffset, 0.07, -CONFIG.chunkLength / 2)
      parts.push(rail)
    }
  }
  return mergeGeometries(parts)
}

function buildChunk() {
  const group = new THREE.Group()
  const base = new THREE.Mesh(trackBaseGeometry, trackBaseMaterial)
  group.add(base)

  // Sleepers: instanced, 20 per chunk (every 1.5u).
  const sleeperGeo = new THREE.BoxGeometry(7.6, 0.08, 0.5)
  const sleeperMat = new THREE.MeshStandardMaterial({ color: '#4a3b2a' })
  const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, 20)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 20; i++) {
    m.makeTranslation(0, 0.04, -(i * 1.5 + 0.75))
    sleepers.setMatrixAt(i, m)
  }
  sleepers.instanceMatrix.needsUpdate = true
  group.add(sleepers)
  return group
}

// Shared geometry/material (created once per module).
const trackBaseGeometry = buildTrackBaseGeometry()
const trackBaseMaterial = new THREE.MeshStandardMaterial({ color: '#6b6b66' })

export default function TrackManager({ onRecycle }) {
  const chunksRef = useRef([])
  const rngRef = useRef(makeRng())
  const runId = useGameStore((s) => s.runId)

  const pool = useMemo(() => {
    return Array.from({ length: CONFIG.chunkCount }, () => buildChunk())
  }, [])

  // Build/attach pool and fill initial patterns on mount and restart.
  useEffect(() => {
    const chunks = chunksRef.current
    // Detach previous pool from scene graph if remounting.
    for (const c of chunks) c.parent?.remove(c)
    chunks.length = 0

    resetPatternStream()
    resetSim()
    rngRef.current = makeRng()

    for (let i = 0; i < CONFIG.chunkCount; i++) {
      const chunk = pool[i]
      chunk.position.z = -i * CONFIG.chunkLength
      chunks.push(chunk)
      // Fill chunk with a pattern (offset from player area: first chunk free).
      if (i > 0) {
        const worldStart = chunk.position.z
        const r = nextPattern(rngRef.current, worldStart)
        for (const fn of chunkConfigurators) fn(i, rngRef.current, r)
      } else {
        for (const fn of chunkConfigurators) fn(i, rngRef.current, null)
      }
    }
    return () => {
      for (const c of chunksRef.current) c.parent?.remove(c)
    }
  }, [runId, pool])

  // Attach chunks into the scene once a parent is available.
  const sceneRef = useRef()
  useFrame(({ scene }) => {
    if (!sceneRef.current && chunksRef.current.length) {
      for (const c of chunksRef.current) scene.add(c)
      sceneRef.current = scene
    }
  }, -1) // runs before other frame callbacks? R3F: lower priority runs first — attach early.

  // THE world-movement loop (simulation owner). Priority 0: runs before
  // collision (priority 1) each frame.
  useFrame((state, rawDelta) => {
    const store = useGameStore.getState()
    if (store.runState !== RUN.RUNNING) return

    const dt = Math.min(rawDelta, CONFIG.deltaClamp)
    SIM.speed = Math.min(SIM.speed + CONFIG.speedAccel * dt, CONFIG.speedMax)
    const dz = SIM.speed * dt
    SIM.distance += dz

    // HUD/multiplier throttle at CONFIG.hudHz.
    SIM.hudTimer += dt
    SIM.multTimer += dt
    if (SIM.hudTimer >= 1 / CONFIG.hudHz) {
      const scored = SIM.distance - SIM.lastScored
      SIM.lastScored = SIM.distance
      store.addScore(scored)
      store.setSpeed(SIM.speed)
      SIM.hudTimer = 0
    }
    if (SIM.multTimer >= CONFIG.multInterval) {
      store.nextMultiplier()
      SIM.multTimer = 0
    }

    // Move chunks; recycle past the player.
    const chunks = chunksRef.current
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      chunk.position.z += dz
      if (chunk.position.z > CONFIG.recycleZ) {
        chunk.position.z -= CONFIG.chunkCount * CONFIG.chunkLength
        const r = nextPattern(rngRef.current, chunk.position.z)
        for (const fn of chunkConfigurators) fn(i, rngRef.current, r)
        onRecycle?.(i)
      }
    }

    // Expose current world Z of each chunk for consumers (collision etc.).
    chunkWorldZ.length = 0
    for (let i = 0; i < chunks.length; i++) chunkWorldZ.push(chunks[i].position.z)
  })

  return null
}

// Module-level: current world Z per chunk index, refreshed each frame.
export const chunkWorldZ = []
