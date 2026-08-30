import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { SIM } from '../../game/sim.js'

// Stylized primitive fallback character (capsule body, sphere head, limbs).
// Same gameplay contract as the GLB: position/tilt applied by Player.jsx.
export default function PrimitiveCharacter() {
  const leftArm = useRef()
  const rightArm = useRef()
  const leftLeg = useRef()
  const rightLeg = useRef()

  useFrame(() => {
    const swing = Math.sin(SIM.distance * 1.5) * 0.8
    if (leftArm.current) leftArm.current.rotation.x = swing
    if (rightArm.current) rightArm.current.rotation.x = -swing
    if (leftLeg.current) leftLeg.current.rotation.x = -swing * 0.8
    if (rightLeg.current) rightLeg.current.rotation.x = swing * 0.8
  })

  const limb = { radius: 0.07, height: 0.55, capSegments: 4, radialSegments: 6 }

  return (
    <group>
      {/* body */}
      <mesh position={[0, 1.0, 0]}>
        <capsuleGeometry args={[0.24, 0.55, 4, 8]} />
        <meshStandardMaterial color="#e05d3d" />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.19, 12, 12]} />
        <meshStandardMaterial color="#f2c19a" />
      </mesh>
      {/* arms */}
      <group ref={leftArm} position={[-0.32, 1.22, 0]}>
        <mesh position={[0, -0.28, 0]}>
          <capsuleGeometry args={[limb.radius, limb.height, limb.capSegments, limb.radialSegments]} />
          <meshStandardMaterial color="#e05d3d" />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.32, 1.22, 0]}>
        <mesh position={[0, -0.28, 0]}>
          <capsuleGeometry args={[limb.radius, limb.height, limb.capSegments, limb.radialSegments]} />
          <meshStandardMaterial color="#e05d3d" />
        </mesh>
      </group>
      {/* legs */}
      <group ref={leftLeg} position={[-0.12, 0.68, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <capsuleGeometry args={[limb.radius, limb.height, limb.capSegments, limb.radialSegments]} />
          <meshStandardMaterial color="#2b4a6f" />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.12, 0.68, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <capsuleGeometry args={[limb.radius, limb.height, limb.capSegments, limb.radialSegments]} />
          <meshStandardMaterial color="#2b4a6f" />
        </mesh>
      </group>
    </group>
  )
}
