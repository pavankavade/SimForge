import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface HingedTrapdoorProps {
  spawnFrame?: number;
  openFrame?: number;
}

export const HingedTrapdoor: React.FC<HingedTrapdoorProps> = ({
  spawnFrame = 330,
  openFrame,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  // Fly-in drop animation when trapdoor is installed
  const installProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 18],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.2)),
    }
  );

  const installOffsetY = (1 - installProgress) * 4;

  // Flap opening rotation (0 = flat closed, Math.PI / 2.2 = dropped open)
  let openAngle = 0;
  if (openFrame !== undefined && frame >= openFrame) {
    openAngle = interpolate(frame, [openFrame, openFrame + 10], [0, Math.PI / 2.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  }

  return (
    <group position={[0, installOffsetY, 0]}>
      {/* ===== LEFT TRAPDOOR FLAP (Pivots at x = -2.0) ===== */}
      <group position={[-2.0, -0.05, -0.6]}>
        {/* Iron Hinge Bracket */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3.2, 8]} />
          <meshStandardMaterial color="#22242a" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Door flap body rotates around Z axis */}
        <group rotation={[0, 0, -openAngle]}>
          <mesh position={[1.0, -0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.96, 0.16, 3.1]} />
            <meshStandardMaterial color="#513723" roughness={0.8} />
          </mesh>
          {/* Iron reinforcement straps */}
          {[-1.0, 0, 1.0].map((z, i) => (
            <mesh key={`strap-l-${i}`} position={[1.0, 0.01, z]} castShadow>
              <boxGeometry args={[1.9, 0.03, 0.14]} />
              <meshStandardMaterial color="#2d3039" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ===== RIGHT TRAPDOOR FLAP (Pivots at x = 2.0) ===== */}
      <group position={[2.0, -0.05, -0.6]}>
        {/* Iron Hinge Bracket */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3.2, 8]} />
          <meshStandardMaterial color="#22242a" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Door flap body rotates around Z axis */}
        <group rotation={[0, 0, openAngle]}>
          <mesh position={[-1.0, -0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.96, 0.16, 3.1]} />
            <meshStandardMaterial color="#513723" roughness={0.8} />
          </mesh>
          {/* Iron reinforcement straps */}
          {[-1.0, 0, 1.0].map((z, i) => (
            <mesh key={`strap-r-${i}`} position={[-1.0, 0.01, z]} castShadow>
              <boxGeometry args={[1.9, 0.03, 0.14]} />
              <meshStandardMaterial color="#2d3039" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};
