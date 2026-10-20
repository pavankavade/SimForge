import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface MimicChestProps {
  spawnFrame?: number;
  chompStartFrame?: number;
}

export const MimicChest: React.FC<MimicChestProps> = ({
  spawnFrame = 1720,
  chompStartFrame = 1860,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  // Scale in from floor
  const spawnScale = interpolate(
    frame,
    [spawnFrame, spawnFrame + 20],
    [0.001, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.4)),
    }
  );

  // Chomp jaw animation
  let jawAngle = 0.2;
  if (chompStartFrame !== undefined && frame >= chompStartFrame) {
    const elapsed = frame - chompStartFrame;
    // Periodic angry chomping
    jawAngle = 0.65 + Math.sin(elapsed * 0.4) * 0.45;
  }

  // Tongue waggle
  const tongueWaggle = Math.sin((frame - spawnFrame) * 0.3) * 0.2;

  return (
    <group position={[7.0, 0, -0.6]} scale={[spawnScale, spawnScale, spawnScale]}>
      {/* Mimic Base Lower Jaw */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.9, 1.4]} />
        <meshStandardMaterial color="#4a2e1d" roughness={0.7} />
      </mesh>

      {/* Gold & Iron banding on base */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.85, 0.95, 0.25]} />
        <meshStandardMaterial color="#2d2218" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Lower Row of Sharp Teeth */}
      {[-0.7, -0.4, -0.1, 0.2, 0.5, 0.8].map((x, i) => (
        <mesh key={`tooth-bot-${i}`} position={[x, 0.98, 0.62]} rotation={[0.2, 0, 0]} castShadow>
          <coneGeometry args={[0.07, 0.26, 4]} />
          <meshStandardMaterial color="#f5f0d3" roughness={0.3} />
        </mesh>
      ))}

      {/* Purple Fleshy Tongue inside */}
      <group position={[0, 0.85, 0.2]} rotation={[0.3 + tongueWaggle, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.12, 0.9]} />
          <meshStandardMaterial
            color="#8c237a"
            emissive="#521046"
            emissiveIntensity={0.5}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* Dark Void Throat Interior with glowing red eyes */}
      <mesh position={[0, 0.92, -0.1]}>
        <boxGeometry args={[1.5, 0.1, 1.0]} />
        <meshStandardMaterial color="#110517" roughness={0.9} />
      </mesh>
      {/* Red Menacing Eyes inside mouth */}
      <mesh position={[-0.3, 1.05, -0.2]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ff0044" emissive="#ff0000" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0.3, 1.05, -0.2]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ff0044" emissive="#ff0000" emissiveIntensity={2.5} />
      </mesh>

      {/* ================= UPPER JAW / LID (Hinged at back) ================= */}
      <group position={[0, 0.9, -0.65]} rotation={[-jawAngle, 0, 0]}>
        {/* Upper Lid body */}
        <mesh position={[0, 0.35, 0.65]} castShadow>
          <boxGeometry args={[1.8, 0.65, 1.4]} />
          <meshStandardMaterial color="#4a2e1d" roughness={0.7} />
        </mesh>

        {/* Domed curved top */}
        <mesh position={[0, 0.68, 0.65]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.68, 0.68, 1.8, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#5c3822" roughness={0.65} />
        </mesh>

        {/* Upper Row of Vicious Teeth */}
        {[-0.7, -0.4, -0.1, 0.2, 0.5, 0.8].map((x, i) => (
          <mesh key={`tooth-top-${i}`} position={[x, 0.02, 1.28]} rotation={[Math.PI - 0.2, 0, 0]} castShadow>
            <coneGeometry args={[0.08, 0.32, 4]} />
            <meshStandardMaterial color="#f5f0d3" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Internal Purple Spooky Light */}
      <pointLight
        position={[0, 1.2, 0.2]}
        color="#aa11ff"
        intensity={2.2}
        distance={5}
      />
    </group>
  );
};
