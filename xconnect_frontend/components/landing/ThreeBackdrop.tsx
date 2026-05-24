"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function OrbitalCore() {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock, mouse }) => {
    if (!group.current || !ring.current) return;

    const elapsed = clock.getElapsedTime();
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, mouse.x * 0.45, 0.08);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -mouse.y * 0.2, 0.08);
    ring.current.rotation.z = elapsed * 0.18;
  });

  return (
    <group ref={group} scale={0.55} position={[0, 0.15, -0.8]}>
      <Float speed={1.1} rotationIntensity={0.45} floatIntensity={0.9}>
        <mesh position={[0, 0, 0]}>
          <torusKnotGeometry args={[0.78, 0.22, 140, 20]} />
          <meshStandardMaterial color="#00F0FF" emissive="#00F0FF" emissiveIntensity={0.65} roughness={0.1} metalness={0.9} />
        </mesh>
      </Float>

      <mesh ref={ring} position={[0, 0, -0.4]}>
        <torusGeometry args={[1.55, 0.045, 2, 180]} />
        <meshStandardMaterial color="#FF00C8" emissive="#7A00FF" emissiveIntensity={0.45} roughness={0.2} metalness={1} />
      </mesh>

      <Float speed={1.6} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh position={[1.8, -0.65, -0.75]}>
          <icosahedronGeometry args={[0.38, 0]} />
          <meshStandardMaterial color="#7A00FF" emissive="#FF00C8" emissiveIntensity={0.8} roughness={0.15} metalness={1} />
        </mesh>
      </Float>

      <Float speed={1} rotationIntensity={0.45} floatIntensity={0.75}>
        <mesh position={[-1.8, 0.85, -0.85]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial color="#0A0A0A" emissive="#00F0FF" emissiveIntensity={0.7} roughness={0.18} metalness={1} />
        </mesh>
      </Float>
    </group>
  );
}

type ThreeBackdropProps = {
  enabled?: boolean;
};

export default function ThreeBackdrop({ enabled = true }: ThreeBackdropProps) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 opacity-55" aria-hidden="true">
      <Canvas
        dpr={[1, 1.2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 9.4], fov: 36 }}
      >
        <color attach="background" args={["#0A0A0A"]} />
        <fog attach="fog" args={["#0A0A0A", 10, 20]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 4, 3]} intensity={1.4} color="#00F0FF" />
        <pointLight position={[-4, -2, 4]} intensity={1} color="#FF00C8" />
        <pointLight position={[2, 2, 5]} intensity={0.9} color="#7A00FF" />
        <OrbitalCore />
        <Sparkles count={36} speed={0.25} size={1.35} scale={[8, 5, 2.5]} color="#00F0FF" opacity={0.28} />
        <Stars radius={50} depth={24} count={220} factor={1.2} saturation={0} fade speed={0.25} />
      </Canvas>
    </div>
  );
}
