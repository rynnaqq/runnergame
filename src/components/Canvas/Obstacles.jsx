import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CONFIG } from '../../config.js'
import { useGameStore } from '../../store/useGameStore.js'
import { chunkWorldZ, registerChunkConfigurator } from './TrackManager.jsx'
import { colliders, makeCollider, resetColliders } from '../../game/colliders.js'
import { supportSurfaces } from '../../game/support.js'
import { resetCoins, COIN_COUNT, COINS_PER_CHUNK, coinPool } from '../../game/coins.js'
import { TRAIN_LENGTH, SMALL_DEPTH } from '../../game/patterns.js'

// ---------------- Shared geometry/material (created once) ----------------
// Obstacle geometries use front-edge origin: z=0 is the edge nearest the
// player; geometry extends toward -z. Mesh z = world front Z.

const barrierGapY = 1.1 // crossbar bottom; collider y 1.1..2.0 (slide under)
const rampLength = 5
const rampTop = 2.6 // roof walk height

function trainGeoSolid() {
  const body = new THREE.BoxGeometry(2.0, 2.8, TRAIN_LENGTH)
  body.translate(0, 1.4, -TRAIN_LENGTH / 2)
  return body
}

function trainGeoRamped() {
  const parts = []
  const bodyLen = TRAIN_LENGTH - rampLength
  const body = new THREE.BoxGeometry(2.0, 2.3, bodyLen)
  body.translate(0, 1.45, -(rampLength + bodyLen / 2))
  parts.push(body)
  // Ramp wedge: rises from ground at front (z=0) to roof at z=-rampLength.
  const wedge = new THREE.BoxGeometry(2.0, 0.3, rampLength)
  wedge.rotateX(Math.atan2(rampTop, rampLength))
  wedge.translate(0, rampTop / 2, -rampLength / 2)
  parts.push(wedge)
  return mergeGeometries(parts)
}

const geoSolid = trainGeoSolid()
const geoRamped = trainGeoRamped()
const trainMat = new THREE.MeshStandardMaterial({ color: '#b3402f' })

const hurdleGeo = new THREE.BoxGeometry(2.0, 0.7, SMALL_DEPTH)
hurdleGeo.translate(0, 0.35, -SMALL_DEPTH / 2)
const hurdleMat = new THREE.MeshStandardMaterial({ color: '#d9a13b' })

const barrierGeo = (() => {
  const parts = []
  const crossbar = new THREE.BoxGeometry(2.2, 0.9, 0.15)
  crossbar.translate(0, barrierGapY + 0.45, -SMALL_DEPTH / 2)
  parts.push(crossbar)
  for (const side of [-1, 1]) {
    const post = new THREE.BoxGeometry(0.12, 2.0, 0.12)
    post.translate(side * 1.05, 1.0, -SMALL_DEPTH / 2)
    parts.push(post)
  }
  return mergeGeometries(parts)
})()
const barrierMat = new THREE.MeshStandardMaterial({ color: '#3d7ac2' })

const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12)
coinGeo.rotateX(Math.PI / 2)
const coinMat = new THREE.MeshStandardMaterial({
  color: '#ffd23e', emissive: '#b8860b', emissiveIntensity: 0.35,
})

// ---------------- Collider registry helpers ----------------

function attachColliderRef(collider) {
  if (colliders.includes(collider)) return
  const i = colliders.indexOf(null)
  if (i >= 0) colliders[i] = collider
}

function makeSurface() {
  return {
    active: false, x: 0, halfW: 1.0,
    zStart: 0, zEnd: 0, h0: 0, h1: 0, chunk: -1, // zStart/zEnd written as WORLD z per frame
  }
}

// ---------------- Component ----------------

export default function Obstacles() {
  const runId = useGameStore((s) => s.runId)
  const coinMeshRef = useRef()
  const rootRef = useMemo(() => new THREE.Group(), [])

  // Per-chunk slots: 2 trains, 2 hurdles, 2 barriers. Created once.
  const slots = useMemo(
    () =>
      Array.from({ length: CONFIG.chunkCount }, (_, chunk) => ({
        chunk,
        trains: Array.from({ length: 2 }, () => ({
          mesh: null, collider: makeCollider(),
          surfaces: [makeSurface(), makeSurface()],
        })),
        hurdles: Array.from({ length: 2 }, () => ({ mesh: null, collider: makeCollider() })),
        barriers: Array.from({ length: 2 }, () => ({ mesh: null, collider: makeCollider() })),
      })),
    []
  )

  useEffect(() => {
    resetColliders()
    resetCoins()
    supportSurfaces.length = 0
  }, [runId])

  useEffect(() => {
    // Register every collider into the fixed registry once.
    for (const slot of slots) {
      for (const t of slot.trains) attachColliderRef(t.collider)
      for (const h of slot.hurdles) attachColliderRef(h.collider)
      for (const b of slot.barriers) attachColliderRef(b.collider)
    }

    const unregister = registerChunkConfigurator((chunkIndex, rng, result) => {
      const slot = slots[chunkIndex]
      if (!slot) return

      const ensureMesh = (item, geo, mat) => {
        if (!item.mesh) {
          item.mesh = new THREE.Mesh(geo, mat)
          item.mesh.visible = false
          rootRef.add(item.mesh)
          item.collider.mesh = item.mesh
        }
        return item.mesh
      }
      for (const t of slot.trains) ensureMesh(t, geoRamped, trainMat)
      for (const h of slot.hurdles) ensureMesh(h, hurdleGeo, hurdleMat)
      for (const b of slot.barriers) ensureMesh(b, barrierGeo, barrierMat)

      // Deactivate everything on this chunk first.
      const deactivate = (item) => { item.collider.active = false }
      for (const t of slot.trains) { deactivate(t); for (const s of t.surfaces) s.active = false }
      for (const h of slot.hurdles) deactivate(h)
      for (const b of slot.barriers) deactivate(b)
      for (const c of coinPool) if (c.chunk === chunkIndex) c.active = false

      if (!result) return // chunk kept empty (start chunk / filler)

      const { pattern, offset } = result

      const placeTrain = (o) => {
        const t = slot.trains.find((x) => !x.collider.active)
        if (!t) return
        const x = CONFIG.lanes[o.lane]
        const c = t.collider
        c.type = 'train'
        c.lane = o.lane
        c.chunk = chunkIndex
        c.active = true
        c.x = x
        c.minX = x - 1.0
        c.maxX = x + 1.0
        c.localZFront = o.z + offset
        t.mesh.geometry = o.ramp ? geoRamped : geoSolid
        if (o.ramp) {
          // Ramp region is climbable (support surfaces); the solid body behind
          // it blocks from ground to roof height. Riding the roof (feet at
          // rampTop) clears the collider by strict-inequality touching.
          c.depth = TRAIN_LENGTH - rampLength
          c.localZFront += rampLength
          c.minY = 0
          c.maxY = rampTop
          const [rampSurf, roofSurf] = t.surfaces
          Object.assign(rampSurf, {
            active: true, x, halfW: 1.0, h0: 0, h1: rampTop,
            localStart: o.z + offset, localEnd: o.z + offset + rampLength, chunk: chunkIndex,
          })
          Object.assign(roofSurf, {
            active: true, x, halfW: 1.0, h0: rampTop, h1: rampTop,
            localStart: o.z + offset + rampLength, localEnd: o.z + offset + TRAIN_LENGTH, chunk: chunkIndex,
          })
        } else {
          c.depth = TRAIN_LENGTH
          c.minY = 0
          c.maxY = 2.8
        }
      }

      const placeSimple = (list, type, o) => {
        const item = list.find((x) => !x.collider.active)
        if (!item) return
        const x = CONFIG.lanes[o.lane]
        const c = item.collider
        c.type = type
        c.lane = o.lane
        c.chunk = chunkIndex
        c.active = true
        c.x = x
        c.minX = x - 1.0
        c.maxX = x + 1.0
        c.localZFront = o.z + offset
        c.depth = SMALL_DEPTH
        if (type === 'hurdle') { c.minY = 0; c.maxY = 0.7 }
        else { c.minY = barrierGapY; c.maxY = 2.0 }
      }

      for (const o of pattern.obstacles) {
        if (o.type === 'train') placeTrain(o)
        else if (o.type === 'hurdle') placeSimple(slot.hurdles, 'hurdle', o)
        else if (o.type === 'barrier') placeSimple(slot.barriers, 'barrier', o)
      }

      // Coins: claim this chunk's instances from the global pool.
      let coinIdx = 0
      for (const coin of pattern.coins) {
        if (coinIdx >= COINS_PER_CHUNK) break
        const entry = coinPool[chunkIndex * COINS_PER_CHUNK + coinIdx]
        entry.active = true
        entry.x = CONFIG.lanes[coin.lane]
        entry.y = coin.y
        entry.localZ = coin.z + offset
        entry.chunk = chunkIndex
        coinIdx++
      }
    })

    return unregister
  }, [slots, rootRef, runId])

  // Per-frame: scene attach, collider/surface world refresh, mesh transforms,
  // coin matrices. Scalar math only — no allocations.
  useFrame(({ scene }) => {
    if (rootRef.parent !== scene) scene.add(rootRef)
    const mesh = coinMeshRef.current

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i]
      if (!c || c.chunk < 0) continue
      const cz = chunkWorldZ[c.chunk]
      if (cz === undefined) continue
      if (c.active) {
        const frontZ = cz - c.localZFront
        c.box.min.z = frontZ - c.depth
        c.box.max.z = frontZ
        c.box.min.x = c.minX
        c.box.max.x = c.maxX
        c.box.min.y = c.minY
        c.box.max.y = c.maxY
        if (c.mesh) {
          c.mesh.visible = true
          c.mesh.position.x = c.x
          c.mesh.position.z = frontZ
        }
      } else if (c.mesh) {
        c.mesh.visible = false
      }
    }

    for (const s of supportSurfaces) {
      if (!s.active || s.chunk < 0) continue
      const cz = chunkWorldZ[s.chunk]
      if (cz === undefined) continue
      s.zStart = cz - s.localStart
      s.zEnd = cz - s.localEnd
    }

    if (!mesh) return
    const t = performance.now() * 0.003
    for (let i = 0; i < COIN_COUNT; i++) {
      const coin = coinPool[i]
      if (!coin.active) {
        COIN_POS.set(0, -999, 0)
        COIN_MAT.makeTranslation(0, -999, 0)
        mesh.setMatrixAt(i, COIN_MAT)
        continue
      }
      const cz = chunkWorldZ[coin.chunk] ?? 0
      const worldZ = cz - coin.localZ
      COIN_POS.set(coin.x, coin.y, worldZ)
      COIN_EULER.set(0, t, 0)
      COIN_QUAT.setFromEuler(COIN_EULER)
      COIN_MAT.compose(COIN_POS, COIN_QUAT, COIN_SCALE.set(1, 1, 1))
      mesh.setMatrixAt(i, COIN_MAT)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={coinMeshRef} args={[coinGeo, coinMat, COIN_COUNT]} frustumCulled={false} />
  )
}

// Scratch (module-level, reused every frame).
const COIN_POS = new THREE.Vector3()
const COIN_QUAT = new THREE.Quaternion()
const COIN_EULER = new THREE.Euler()
const COIN_SCALE = new THREE.Vector3()
const COIN_MAT = new THREE.Matrix4()
