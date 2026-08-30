import { Component, Suspense, useCallback, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGameStore, RUN } from '../../store/useGameStore.js'
import { SIM } from '../../game/sim.js'
import { useControls } from '../../hooks/useControls.js'
import LoadingScreen from '../UI/LoadingScreen.jsx'

const CAM_BASE_Y = 4.2
const shakeVec = { x: 0, y: 0 }

function CameraRig() {
  useFrame((state, delta) => {
    if (SIM.reducedMotion) return
    if (SIM.shake <= 0) return
    SIM.shake = Math.max(0, SIM.shake - delta * 2.2)
    if (SIM.shake === 0) {
      // shake ended: snap back to base
      state.camera.position.x = 0
      state.camera.position.y = CAM_BASE_Y
      return
    }
    const k = SIM.shake * SIM.shake * 0.35
    shakeVec.x = (Math.random() - 0.5) * k
    shakeVec.y = (Math.random() - 0.5) * k
    state.camera.position.x = shakeVec.x
    state.camera.position.y = CAM_BASE_Y + shakeVec.y
  })
  return null
}

class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    useGameStore.setState({ runState: RUN.ERROR })
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0e14] text-white">
          <p className="text-lg font-semibold">Something went wrong in the renderer.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] min-w-[44px] rounded bg-sky-600 px-6 py-2 font-medium hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function GameCanvas({ children }) {
  const [sceneKey, setSceneKey] = useState(0)
  const retry = useCallback(() => setSceneKey((k) => k + 1), [])
  useControls()

  return (
    <SceneErrorBoundary>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 60, position: [0, CAM_BASE_Y, 8], near: 0.1, far: 200 }}
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e14] p-6 text-center text-white">
            WebGL is not supported in this browser. Please try a current version of Chrome, Edge, Firefox, or Safari.
          </div>
        }
      >
        <color attach="background" args={['#8fb4c9']} />
        <fog attach="fog" args={['#8fb4c9', 35, 130]} />
        <hemisphereLight intensity={0.9} groundColor="#3a3a34" />
        <directionalLight position={[8, 14, 4]} intensity={1.6} />
        <CameraRig />
        <Suspense key={sceneKey} fallback={<LoadingScreen onRetry={retry} />}>
          {children}
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  )
}
