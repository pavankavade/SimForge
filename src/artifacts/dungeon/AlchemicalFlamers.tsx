import React from "react";
import * as THREE from "three";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { GlowSprite } from "./Fx";

interface AlchemicalFlamersProps {
  spawnFrame?: number;
  fireStartFrame?: number;
  fireEndFrame?: number;
}

export const AlchemicalFlamers: React.FC<AlchemicalFlamersProps> = ({
  spawnFrame = 800,
  fireStartFrame = 880,
  fireEndFrame = 1200,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  // Assembly fly-in progress
  const assembleProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 20],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.2)),
    }
  );

  const isFiring =
    fireStartFrame !== undefined &&
    fireEndFrame !== undefined &&
    frame >= fireStartFrame &&
    frame <= fireEndFrame;

  // Flame flicker animation
  const flicker = isFiring
    ? Math.sin(frame * 0.8) * 0.15 + Math.cos(frame * 1.3) * 0.1
    : 0;

  return (
    <group position={[0, 0, 0]} scale={[assembleProgress, assembleProgress, assembleProgress]}>
      {/* ================= UNDERGROUND COPPER FUEL TANK ================= */}
      <group position={[0, -2.6, -1.8]}>
        {/* Main Cylindrical Copper Tank */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 0.7, 3.2, 16]} />
          <meshStandardMaterial
            color="#b86532"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
        {/* Brass Pressure Gauge */}
        <mesh position={[0, 0.85, 0.4]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 12]} />
          <meshStandardMaterial color="#d4aa42" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Brass Reinforcement Rings */}
        {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
          <mesh key={`ring-${i}`} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.72, 0.05, 8, 16]} />
            <meshStandardMaterial color="#2d2217" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ================= WALL PIPING SYSTEM ================= */}
      {/* Vertical feed pipes from tank up along back wall */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <group key={`pipe-${i}`} position={[x, 0, -2.2]}>
          {/* Vertical pipe */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 4.4, 10]} />
            <meshStandardMaterial color="#c27038" metalness={0.8} roughness={0.35} />
          </mesh>

          {/* Wall-mounted Brass Flamer Nozzle at y = 1.0 pointing forward into corridor */}
          <group position={[0, 1.0, 0.1]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.1, 0.45, 10]} />
              <meshStandardMaterial color="#d49433" metalness={0.85} roughness={0.3} />
            </mesh>

            {/* Igniter Pilot Flame */}
            <mesh position={[0, 0, 0.35]} scale={[1, 1, 1 + flicker * 0.5]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial
                color="#ffaa22"
                emissive="#ff5500"
                emissiveIntensity={1.5}
              />
            </mesh>

            {/* Massive Jet Flame Stream when firing */}
            {isFiring ? (
              <group position={[0, 0, 0.4]}>
                {/* Core white/yellow flame cone */}
                <mesh
                  position={[0, 0, 1.1]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[1 + flicker, 1 + flicker, 1 + flicker * 0.3]}
                >
                  <coneGeometry args={[0.26, 2.3, 14]} />
                  <meshStandardMaterial
                    color="#fff3b0"
                    emissive="#ffab00"
                    emissiveIntensity={4.2}
                    transparent
                    opacity={0.92}
                  />
                </mesh>

                {/* Outer orange flame envelope */}
                <mesh
                  position={[0, 0, 1.35]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[1.25 + flicker, 1.25 + flicker, 1.05]}
                >
                  <coneGeometry args={[0.4, 3.0, 14]} />
                  <meshStandardMaterial
                    color="#ff5511"
                    emissive="#d92c00"
                    emissiveIntensity={2.2}
                    transparent
                    opacity={0.42}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>

                <GlowSprite
                  position={[0, 0, 0.65]}
                  color="#ff8a2a"
                  size={1.5 + flicker * 0.4}
                  opacity={0.55}
                />

                {/* Bright Fire Point Light */}
                <pointLight
                  position={[0, 0, 1.5]}
                  color="#ff6611"
                  intensity={3.5 + flicker * 1.5}
                  distance={7}
                  decay={1.8}
                />
              </group>
            ) : null}
          </group>
        </group>
      ))}
    </group>
  );
};
