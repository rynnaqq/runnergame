import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <div className="h-full w-full">
      <Canvas dpr={[1, 2]} camera={{ fov: 60, position: [0, 4.2, 8] }}>
        <color attach="background" args={['#8fb4c9']} />
        <hemisphereLight intensity={0.9} groundColor="#3a3a34" />
        <directionalLight position={[8, 14, 4]} intensity={1.6} />
        <mesh position={[0, 0, -20]}>
          <boxGeometry args={[8, 0.2, 60]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      </Canvas>
    </div>
  )
}
