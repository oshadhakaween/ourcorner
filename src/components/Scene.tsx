"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScrollControls, Scroll, useScroll } from "@react-three/drei";

// A flower that turns and grows as you scroll down the page.
function Flower() {
  const group = useRef<THREE.Group>(null!);
  const scroll = useScroll();
  const vw = useThree((s) => s.viewport.width);
  const base = Math.min(1, vw / 7); // smaller on phones

  const still = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useFrame(() => {
    const t = still ? 0 : scroll.offset; // 0 at the top, 1 at the bottom
    group.current.rotation.y = t * Math.PI * 4;
    group.current.rotation.x = Math.sin(t * Math.PI) * 0.6;
    group.current.position.y = -t * 1.5;
    group.current.scale.setScalar(base * (1 + Math.sin(t * Math.PI) * 0.5));
  });

  return (
    <group ref={group}>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh
            key={i}
            rotation={[0, 0, a]}
            position={[Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0]}
            scale={[1, 0.45, 0.3]}
          >
            <sphereGeometry args={[0.7, 32, 32]} />
            <meshStandardMaterial color="#f9a8d4" roughness={0.4} />
          </mesh>
        );
      })}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function Scene() {
  return (
    <div className="h-dvh w-full bg-white">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 4]} intensity={1.3} />
        <ScrollControls pages={4} damping={0.25}>
          <Flower />
          <Scroll html style={{ width: "100%" }}>
            <section className="grid h-screen place-items-center text-center">
              <h1 className="text-5xl font-light">Our Corner</h1>
            </section>
            <section className="grid h-screen place-items-center px-8 text-center">
              <p className="max-w-md text-2xl">Write your story here.</p>
            </section>
            <section className="grid h-screen place-items-center px-8 text-center">
              <p className="max-w-md text-2xl">A favourite memory.</p>
            </section>
            <section className="grid h-screen place-items-center">
              <a href="/games" className="rounded-full bg-pink-500 px-8 py-3 text-white">
                Play with me
              </a>
            </section>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
}
