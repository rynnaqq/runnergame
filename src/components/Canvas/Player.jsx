import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CONFIG } from '../../config.js'
import { useGameStore, RUN } from '../../store/useGameStore.js'
import { resetSim } from '../../game/sim.js'
import { inputQueue } from '../../hooks/useControls.js'
import {
  playerState, resetPlayer, updatePlayerBox, supportHeightAt, supportOut,
} from '../../game/support.js'
import GltfPlayer from './GltfPlayer.jsx'
import PrimitiveCharacter from './PrimitiveCharacter.jsx'
import PlayerErrorBoundary from './PlayerErrorBoundary.jsx'

const { lanes, laneLerp, tiltMax, gravity, jumpVelocity, slideDuration, slideImpulse, deltaClamp } = CONFIG

// Terrain height under the player (player is fixed at z = 0).
const terrainHeightAt = (x) => supportHeightAt(x, 0, supportOut).h

export default function Player() {
  const groupRef = useRef()
  const crouchRef = useRef()
  const isHoverboardActive = useGameStore((s) => s.isHoverboardActive)
  const runId = useGameStore((s) => s.runId)
  // Once the GLB path fails, stay on the primitive for the session.
  const [glbFailed, setGlbFailed] = useState(false)

  useEffect(() => {
    resetPlayer()
    resetSim()
  }, [runId])

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, deltaClamp)
    const store = useGameStore.getState()
    const p = playerState

    if (store.runState === RUN.CRASHED) {
      p.crashed = true
      updatePlayerBox()
      applyTransform(groupRef.current)
      return
    }
    if (store.runState !== RUN.RUNNING && store.runState !== RUN.READY) return

    // Drain input queue so actions land on the input frame.
    while (inputQueue.length > 0) {
      const action = inputQueue.shift()
      if (store.runState !== RUN.RUNNING) continue
      if (action === 'moveLeft') p.lane = Math.max(0, p.lane - 1)
      else if (action === 'moveRight') p.lane = Math.min(2, p.lane + 1)
      else if (action === 'jump' && p.grounded && !p.crashed) {
        p.vy = jumpVelocity
        p.grounded = false
        p.sliding = false
        p.slideTimer = 0
      } else if (action === 'slide' && !p.crashed) {
        p.sliding = true
        p.slideTimer = slideDuration
        if (!p.grounded) p.vy = Math.min(p.vy, slideImpulse) // fast-drop impulse
      }
    }

    const targetX = lanes[p.lane]

    // Frame-rate-independent exponential approach (lane + tilt).
    p.x += (targetX - p.x) * (1 - Math.exp(-laneLerp * dt))
    const targetRoll = Math.max(-tiltMax, Math.min(tiltMax, (targetX - p.x) * -0.12))
    p.roll += (targetRoll - p.roll) * (1 - Math.exp(-laneLerp * dt))

    if (store.runState === RUN.RUNNING) {
      p.vy += gravity * dt
      p.y += p.vy * dt
      const g = terrainHeightAt(p.x)
      if (p.y <= g && p.vy <= 0) {
        p.y = g
        p.vy = 0
        p.grounded = true
      } else if (p.y > g + 0.01) {
        p.grounded = false
      }
      if (p.sliding) {
        p.slideTimer -= dt
        if (p.slideTimer <= 0) p.sliding = false
      }
    }

    updatePlayerBox()
    applyTransform(groupRef.current)

    if (crouchRef.current) {
      // Primitive variant crouches visually; GLB plays its Slide clip instead.
      crouchRef.current.rotation.x = glbFailed && p.sliding && p.grounded ? -1.1 : 0
    }
  })

  return (
    <group ref={groupRef}>
      <group ref={crouchRef} position={[0, isHoverboardActive ? 0.12 : 0, 0]}>
        {glbFailed ? (
          <PrimitiveCharacter />
        ) : (
          <PlayerErrorBoundary onError={() => setGlbFailed(true)}>
            <GltfPlayer />
          </PlayerErrorBoundary>
        )}
      </group>
      <Hoverboard active={isHoverboardActive} />
    </group>
  )
}

function Hoverboard({ active }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.visible = active
  })
  return (
    <mesh ref={ref} position={[0, 0.06, 0]} visible={false}>
      <boxGeometry args={[0.8, 0.08, 1.6]} />
      <meshStandardMaterial color="#22d3ee" emissive="#0e7490" emissiveIntensity={0.6} />
    </mesh>
  )
}

function applyTransform(group) {
  if (!group) return
  const p = playerState
  group.position.x = p.x
  group.position.y = p.y
  group.rotation.z = p.roll
}
