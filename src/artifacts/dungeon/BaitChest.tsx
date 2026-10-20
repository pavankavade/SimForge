import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface BaitChestProps {
  spawnFrame?: number;
}

export const BaitChest: React.FC<BaitChestProps> = ({ spawnFrame = 350 }) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  // Drop in from ceiling
  const dropProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 24],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.bounce),
    }
  );

  const chestY = interpolate(dropProgress, [0, 1], [6.0, 2.2]);

  // Gentle pendular sway
  const sway = Math.sin((frame - spawnFrame) * 0.08) * 0.06;

  return (
    <group position={[1.2, 0, -0.6]} rotation={[0, 0, sway]}>
      {/* Suspension Rope from ceiling (y = 6.0 down to chestY + 0.5) */}
      <mesh position={[0, (6.0 + chestY) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 6.0 - chestY, 6]} />
        <meshStandardMaterial color="#826647" roughness={0.9} />
      </mesh>

      {/* Hanging Golden Chest */}
      <group position={[0, chestY, 0]}>
        {/* Chest Base */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.0, 0.55, 0.65]} />
          <meshStandardMaterial
            color="#d49419"
            metalness={0.8}
            roughness={0.3}
            emissive="#774400"
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Chest Domed Lid */}
        <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.33, 0.33, 1.0, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial
            color="#f2ad24"
            metalness={0.85}
            roughness={0.25}
            emissive="#885500"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Iron Edge Banding */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1.04, 0.6, 0.12]} />
          <meshStandardMaterial color="#2d2d38" metalness={0.9} roughness={0.4} />
        </mesh>

        {/* Golden Lock / Keyhole Plate */}
        <mesh position={[0, 0.08, 0.34]} castShadow>
          <boxGeometry args={[0.2, 0.22, 0.05]} />
          <meshStandardMaterial color="#fff0a0" metalness={0.95} roughness={0.2} />
        </mesh>

        {/* Golden Glow Light */}
        <pointLight
          position={[0, 0.2, 0.4]}
          color="#ffcc44"
          intensity={1.8}
          distance={4.5}
        />
      </group>
    </group>
  );
};
