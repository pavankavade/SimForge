import type React from "react";
import { useCurrentFrame } from "remotion";
import { DustMotes, GlowSprite } from "../dungeon/Fx";

export const SlopedCorridor: React.FC = () => {
  const frame = useCurrentFrame();
  const torchFlicker = Math.sin(frame * 0.28) * 0.12 + Math.cos(frame * 0.72) * 0.08;

  // The track descends from right (x = 8.5, y = 3.6) to left (x = -8.5, y = -0.6)
  // Slope angle is atan2(4.2, 17) ≈ 0.242 rad (~13.8 degrees)
  const slopeAngle = 0.242;
  const yFloor = (x: number) => 1.5 + x * Math.tan(slopeAngle);

  return (
    <group position={[0, 0, 0]}>
      {/* ================= BACK STONE WALL ================= */}
      {/* Main stone wall behind the corridor, angled to follow the slope */}
      <mesh position={[0, 4.2, -2.5]} receiveShadow>
        <boxGeometry args={[22, 10.0, 0.6]} />
        <meshStandardMaterial color="#2d2f3a" roughness={0.92} />
      </mesh>

      {/* Decorative vertical stone buttresses / pillars on the back wall */}
      {[-7.5, -3.5, 0.5, 4.5, 8.5].map((x, i) => {
        const yOffset = yFloor(x);
        return (
          <group key={`buttress-${i}`} position={[x, yOffset + 2.8, -2.15]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.9, 8.0, 0.45]} />
              <meshStandardMaterial color="#3b3e4c" roughness={0.85} />
            </mesh>
            {/* Arch stone cap */}
            <mesh position={[0, 3.8, 0.1]} castShadow>
              <boxGeometry args={[1.2, 0.5, 0.55]} />
              <meshStandardMaterial color="#4a4e5e" roughness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* Wall Torches with warm point lights and glow sprites along the slope */}
      {[-5.5, -1.0, 3.5, 7.5].map((x, i) => {
        const y = yFloor(x) + 2.5;
        return (
          <group key={`torch-${i}`} position={[x, y, -1.9]}>
            {/* Wrought Iron Sconce */}
            <mesh position={[0, -0.2, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.09, 0.55, 6]} />
              <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.5} />
            </mesh>
            {/* Wood torch stick */}
            <mesh position={[0, 0.1, 0.06]} rotation={[0.22, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.45, 6]} />
              <meshStandardMaterial color="#55341c" roughness={0.9} />
            </mesh>
            {/* Fire flame head */}
            <mesh position={[0, 0.35, 0.14]} scale={[1, 1.2 + torchFlicker, 1]}>
              <coneGeometry args={[0.13, 0.34, 8]} />
              <meshStandardMaterial
                color="#ffaa33"
                emissive="#ff5500"
                emissiveIntensity={2.2 + torchFlicker}
              />
            </mesh>
            {/* Dynamic Torch Light */}
            <pointLight
              position={[0, 0.4, 0.35]}
              color="#ff9922"
              intensity={2.8 + torchFlicker * 0.6}
              distance={8.5}
              decay={2}
            />
            {/* Additive Glow Sprite */}
            <GlowSprite
              position={[0, 0.4, 0.2]}
              color="#ff9922"
              size={1.6 + torchFlicker * 0.3}
              opacity={0.65}
            />
          </group>
        );
      })}

      {/* ================= HEAVY CEILING TIMBERS ================= */}
      {[-7, -3.5, 0, 3.5, 7].map((x, i) => {
        const y = yFloor(x) + 5.2;
        return (
          <mesh key={`rafter-${i}`} position={[x, y, -0.6]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.6, 3.8]} />
            <meshStandardMaterial color="#3a2517" roughness={0.9} />
          </mesh>
        );
      })}

      {/* ================= SLOPED TRACK / RAMP FLOOR ================= */}
      {/* The main ramp floor slab descending from x = 9 to x = -9 */}
      <group position={[0, 1.5, -0.6]} rotation={[0, 0, slopeAngle]}>
        {/* Main Cobblestone Ramp Slab */}
        <mesh position={[0, -0.28, 0]} receiveShadow>
          <boxGeometry args={[18.8, 0.55, 3.2]} />
          <meshStandardMaterial color="#404352" roughness={0.86} />
        </mesh>

        {/* Stone Guide Curbs / Side Rails along the ramp */}
        {/* Front low border (flush so it doesn't block character legs) */}
        <mesh position={[0, 0.01, 1.5]} receiveShadow>
          <boxGeometry args={[18.8, 0.08, 0.2]} />
          <meshStandardMaterial color="#2d303b" roughness={0.88} />
        </mesh>
        {/* Back wall guide curb */}
        <mesh position={[0, 0.18, -1.5]} castShadow receiveShadow>
          <boxGeometry args={[18.8, 0.42, 0.24]} />
          <meshStandardMaterial color="#2d303b" roughness={0.88} />
        </mesh>

        {/* Flagstone grooves crosswise on the ramp */}
        {Array.from({ length: 18 }).map((_, i) => (
          <mesh
            key={`ramp-groove-${i}`}
            position={[-8.5 + i * 1.0, 0.01, 0]}
            receiveShadow
          >
            <boxGeometry args={[0.06, 0.02, 3.0]} />
            <meshStandardMaterial color="#21232c" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* ================= UNDERGROUND SOLID MASONRY / SUB-STRUCTURE ================= */}
      {/* Triangular / stepped masonry filling under the sloped ramp */}
      <mesh position={[0, -2.6, -0.6]} receiveShadow>
        <boxGeometry args={[20, 5.0, 3.4]} />
        <meshStandardMaterial color="#161820" roughness={0.95} />
      </mesh>

      {/* Bedrock Foundation at bottom */}
      <mesh position={[0, -5.4, -0.6]} receiveShadow>
        <boxGeometry args={[22, 1.2, 3.8]} />
        <meshStandardMaterial color="#0e0f14" roughness={0.98} />
      </mesh>

      {/* Atmospheric Dust Motes */}
      <DustMotes count={100} />
    </group>
  );
};
