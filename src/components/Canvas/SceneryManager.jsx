import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CONFIG } from '../../config.js'
import { chunkWorldZ, registerChunkConfigurator } from './TrackManager.jsx'
import { mulberry32 } from '../../game/patterns.js'
import { SIM } from '../../game/sim.js'

// Instanced rail-corridor scenery. Per chunk: walls/fence, clutter, poles,
// signals, streetlights. Global: gantries (25u), catenary wires, 2 skyline
// parallax layers, tunnel light blending. All matrices written on configure.

const WALL_X = 5.75
const WALL_H = 4

// ---------------- Procedural textures (created once) ----------------

function makeWallTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#8a8378'
  ctx.fillRect(0, 0, 512, 512)
  // brick foundation band
  ctx.fillStyle = '#6e4f3a'
  ctx.fillRect(0, 400, 512, 112)
  ctx.strokeStyle = '#5a3f2e'
  for (let y = 400; y < 512; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
  }
  // graffiti tags (original, generic)
  const colors = ['#e05d3d', '#3d7ac2', '#59b04f', '#d9a13b', '#c2478f']
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = colors[i % colors.length]
    const x = Math.random() * 480, y = 60 + Math.random() * 300
    ctx.fillRect(x, y, 20 + Math.random() * 90, 10 + Math.random() * 26)
  }
  // posters
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 160, y = 90 + (i % 2) * 120
    ctx.fillStyle = '#ddd6c8'
    ctx.fillRect(x, y, 70, 95)
    ctx.fillStyle = colors[(i + 2) % colors.length]
    ctx.fillRect(x + 6, y + 6, 58, 40)
    ctx.fillStyle = '#333'
    ctx.fillRect(x + 6, y + 54, 58, 8)
  }
  // stains
  ctx.fillStyle = 'rgba(40,35,30,0.25)'
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(Math.random() * 512, 380 + Math.random() * 40, 8 + Math.random() * 30, 90)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

function makeFenceAlphaTexture() {
  const c = document.createElement('canvas')
  c.width = 128; c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 128, 128)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  for (let i = -128; i < 256; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(i + 128, 0); ctx.lineTo(i, 128); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 2)
  return tex
}

function makeBillboardTexture() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1a2a44'
  ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#ffd23e'
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText('RAIL 24', 40, 60)
  ctx.fillStyle = '#59b04f'
  ctx.font = 'bold 28px sans-serif'
  ctx.fillText('COLD SODA', 34, 105)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ---------------- Global instanced sets ----------------

const GANTRY_COUNT = Math.ceil(150 / CONFIG.gantrySpacing) + 1 // covers -135..15

function buildGantryGeometry() {
  const parts = []
  for (const side of [-1, 1]) {
    const post = new THREE.BoxGeometry(0.3, 6.5, 0.3)
    post.translate(side * WALL_X, 3.25, 0)
    parts.push(post)
  }
  const beam = new THREE.BoxGeometry(WALL_X * 2, 0.35, 0.35)
  beam.translate(0, 6.3, 0)
  parts.push(beam)
  // catenary wire segment under the beam
  for (const laneX of CONFIG.lanes) {
    const wire = new THREE.BoxGeometry(0.05, 0.05, CONFIG.gantrySpacing)
    wire.translate(laneX, 5.7, -CONFIG.gantrySpacing / 2)
    parts.push(wire)
  }
  return parts
}

const gantryGeoParts = buildGantryGeometry()
const gantryFrameGeo = gantryGeoParts[0] // posts+beam handled per part below

const steelMat = new THREE.MeshStandardMaterial({ color: '#4a5560' })

function Skyline({ tex }) {
  const nearRef = useRef()
  const farRef = useRef()
  const nearData = useMemo(() => buildSkylineRow(12, 20, 12, 0.6), [])
  const farData = useMemo(() => buildSkylineRow(22, 38, 20, 0.3), [])

  function buildSkylineRow(xMin, xMax, count, parallax) {
    const towers = []
    const rng = mulberry32(xMin * 100)
    for (let i = 0; i < count; i++) {
      const x = (xMin + rng() * (xMax - xMin)) * (rng() > 0.5 ? 1 : -1)
      towers.push({
        x, z: -rng() * 140,
        w: 4 + rng() * 6, h: 8 + rng() * 22, d: 4 + rng() * 6,
        parallax,
      })
    }
    return towers
  }

  const towerGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const towerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#39465a' }), [])
  const billboardMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 }),
    [tex]
  )

  useFrame(() => {
    const wrap = (z, range) => ((z % range) + range * 1.5) % range - range
    for (const [ref, data] of [[nearRef, nearData], [farRef, farData]]) {
      const mesh = ref.current
      if (!mesh) continue
      const m = new THREE.Matrix4()
      data.forEach((t, i) => {
        const z = ((t.z + SIM.distance * t.parallax) % 150 + 150) % 150 - 140
        m.makeScale(t.w, t.h, t.d)
        m.setPosition(t.x, t.h / 2, z)
        mesh.setMatrixAt(i, m)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={nearRef} args={[towerGeo, towerMat, nearData.length]} frustumCulled={false} />
      <instancedMesh ref={farRef} args={[towerGeo, towerMat, farData.length]} frustumCulled={false} />
    </>
  )
}

// Billboard quads ride the near skyline row (fixed positions, recycled by fog).
function Billboards({ tex }) {
  const ref = useRef()
  const data = useMemo(() => {
    const rng = mulberry32(777)
    return Array.from({ length: 6 }, (_, i) => ({
      x: (14 + rng() * 10) * (i % 2 ? 1 : -1),
      z: -rng() * 140,
      y: 6 + rng() * 4,
    }))
  }, [])
  const geo = useMemo(() => new THREE.PlaneGeometry(6, 3), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }),
    [tex]
  )
  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    data.forEach((b, i) => {
      const z = ((b.z + SIM.distance * 0.6) % 150 + 150) % 150 - 140
      m.makeTranslation(b.x, b.y, z)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, data.length]} frustumCulled={false} />
}

// ---------------- Per-chunk scenery ----------------

const CLUTTER_PER_CHUNK = 10

function buildClutterGeometry() {
  // One merged "junk" geometry per instance shape choice is overkill; use a
  // single box + per-instance scale/color to suggest pallets/drums/bags.
  return new THREE.BoxGeometry(1, 1, 1)
}

export default function SceneryManager() {
  const runId = useRunIdSafe()
  const wallTex = useMemo(() => makeWallTexture(), [])
  const fenceTex = useMemo(() => makeFenceAlphaTexture(), [])
  const billboardTex = useMemo(() => makeBillboardTexture(), [])

  const clutterGeo = useMemo(() => buildClutterGeometry(), [])
  const clutterMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff' }),
    []
  )
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ map: wallTex }), [wallTex])
  const fenceMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#9aa3ab', alphaMap: fenceTex, transparent: true, side: THREE.DoubleSide,
    }),
    [fenceTex]
  )

  // Per-chunk instanced meshes (created once, matrices written per configure).
  const chunkSets = useMemo(() => {
    return Array.from({ length: CONFIG.chunkCount }, () => {
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, CONFIG.chunkLength), wallMat)
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, CONFIG.chunkLength), wallMat)
      const fence = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.chunkLength, WALL_H), fenceMat)
      fence.rotation.y = Math.PI / 2
      const clutter = new THREE.InstancedMesh(clutterGeo, clutterMat, CLUTTER_PER_CHUNK)
      clutter.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CLUTTER_PER_CHUNK * 3), 3)
      for (const m of [leftWall, rightWall, fence, clutter]) m.visible = false
      return { leftWall, rightWall, fence, clutter }
    })
  }, [wallMat, fenceMat, clutterGeo, clutterMat])

  const rootRef = useRef(null)

  // Global gantries: one InstancedMesh per geometry part, recycled by modulo.
  const gantryRefs = useRef([])
  const gantryXf = useMemo(() => {
    // precompute per-gantry instance matrices for the static frame parts
    return gantryGeoParts.map(() => new THREE.Matrix4())
  }, [])

  useFrame(({ scene }) => {
    if (!rootRef.current.parent) scene.add(rootRef.current)

    // Gantries: wrap positions along z every spacing unit.
    const baseZ = 15
    for (let p = 0; p < gantryGeoParts.length; p++) {
      const mesh = gantryRefs.current[p]
      if (!mesh) continue
      const m = gantryXf[p]
      for (let i = 0; i < mesh.count; i++) {
        const z = ((baseZ - i * CONFIG.gantrySpacing - SIM.distance) % (CONFIG.gantrySpacing * mesh.count)
          + CONFIG.gantrySpacing * mesh.count) % (CONFIG.gantrySpacing * mesh.count)
          + baseZ - CONFIG.gantrySpacing * mesh.count
        m.copy(new THREE.Matrix4().makeTranslation(0, 0, z))
        mesh.setMatrixAt(i, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  // Configure chunk scenery on (re)configuration.
  useEffect(() => {
    const unregister = registerChunkConfigurator((chunkIndex, rng, _result) => {
      const set = chunkSets[chunkIndex]
      const cz = chunkWorldZ[chunkIndex] ?? 0
      const variant = rng()
      const isTunnel = variant < 0.15
      const isFence = !isTunnel && variant < 0.45

      set.leftWall.visible = !isTunnel && !isFence
      set.rightWall.visible = !isTunnel && !isFence
      set.fence.visible = isFence
      set.leftWall.position.set(-WALL_X, WALL_H / 2, cz - CONFIG.chunkLength / 2)
      set.rightWall.position.set(WALL_X, WALL_H / 2, cz - CONFIG.chunkLength / 2)
      set.fence.position.set(-WALL_X, WALL_H / 2, cz - CONFIG.chunkLength / 2)

      // Clutter: pallets/drums/bags between outer rails and boundary.
      const m = new THREE.Matrix4()
      const color = new THREE.Color()
      for (let i = 0; i < CLUTTER_PER_CHUNK; i++) {
        const side = rng() > 0.5 ? 1 : -1
        const x = side * (4.0 + rng() * 1.2)
        const y = 0.1 + rng() * 0.5
        const z = cz - rng() * CONFIG.chunkLength
        const sx = 0.5 + rng() * 1.1
        const sy = 0.4 + rng() * 0.9
        const sz = 0.5 + rng() * 1.1
        m.makeScale(sx, sy, sz)
        m.setPosition(x, y, z)
        set.clutter.setMatrixAt(i, m)
        color.setHSL(rng() * 0.1 + 0.05, 0.3 + rng() * 0.3, 0.3 + rng() * 0.2)
        set.clutter.setColorAt(i, color)
      }
      set.clutter.instanceMatrix.needsUpdate = true
      if (set.clutter.instanceColor) set.clutter.instanceColor.needsUpdate = true
      set.clutter.visible = !isTunnel
    })
    return unregister
  }, [chunkSets])

  // Tunnel light blend: dim hemisphere when a tunnel chunk is near the player.
  const hemiRef = useRef(null)
  const blendTimer = useRef(0)
  useFrame((state, delta) => {
    blendTimer.current += delta
    if (blendTimer.current < 0.1) return
    blendTimer.current = 0
    let tunnelNear = false
    for (let i = 0; i < chunkWorldZ.length; i++) {
      const cz = chunkWorldZ[i]
      if (cz > -60 && cz < 20 && chunkVariants[i] === 'tunnel') tunnelNear = true
    }
    const hemi = state.scene.children.find((c) => c.isHemisphereLight)
    if (hemi) {
      const target = tunnelNear ? 0.45 : 0.9
      hemi.intensity += (target - hemi.intensity) * 0.2
    }
    if (state.scene.fog) {
      const targetColor = tunnelNear ? new THREE.Color('#2a2f38') : new THREE.Color('#8fb4c9')
      state.scene.fog.color.lerp(targetColor, 0.2)
    }
  })

  const chunkVariants = useMemo(() => Array(CONFIG.chunkCount).fill('exterior'), [])

  return (
    <group ref={rootRef}>
      {chunkSets.map((set, i) => (
        <group key={i}>
          <primitive object={set.leftWall} />
          <primitive object={set.rightWall} />
          <primitive object={set.fence} />
          <primitive object={set.clutter} />
        </group>
      ))}
      {gantryGeoParts.map((geo, p) => (
        <instancedMesh
          key={p}
          ref={(el) => { gantryRefs.current[p] = el }}
          args={[geo, steelMat, GANTRY_COUNT]}
          frustumCulled={false}
        />
      ))}
      <Skyline tex={billboardTex} />
      <Billboards tex={billboardTex} />
    </group>
  )
}

import { useGameStore } from '../../store/useGameStore.js'
function useRunIdSafe() {
  return useGameStore((s) => s.runId)
}
