import { useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useGameStore, RUN } from '../../store/useGameStore.js'
import { playerState } from '../../game/support.js'

const CLIP_ALIASES = ['idle', 'run', 'jump', 'slide', 'crash']

function findClip(actions, alias) {
  const names = Object.keys(actions)
  const hit = names.find((n) => n.toLowerCase().includes(alias))
  return hit ? actions[hit] : null
}

// Nearest valid fallbacks per spec 7.5: missing clip -> closest valid state.
const CLIP_FALLBACK = { idle: 'run', run: 'idle', jump: 'run', slide: 'run', crash: 'idle' }

export default function GltfPlayer() {
  const group = useRef()
  const gltf = useGLTF('/models/character.glb')
  const { actions } = useAnimations(gltf.animations, group)
  const currentRef = useRef(null)

  const playClip = (alias) => {
    if (currentRef.current === alias) return
    let next = findClip(actions, alias)
    if (!next) next = findClip(actions, CLIP_FALLBACK[alias])
    if (!next) return
    const prev = currentRef.current ? findClip(actions, currentRef.current) : null
    if (prev && prev !== next) prev.fadeOut(0.15)
    next.reset().fadeIn(0.15).play()
    currentRef.current = alias
  }

  useFrame(() => {
    const runState = useGameStore.getState().runState
    const p = playerState
    let alias = 'run'
    if (p.crashed) alias = 'crash'
    else if (!p.grounded) alias = 'jump'
    else if (p.sliding && p.grounded) alias = 'slide'
    else if (runState === RUN.READY || runState === RUN.LOADING) alias = 'idle'
    playClip(alias)
  })

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  )
}

useGLTF.preload('/models/character.glb')
