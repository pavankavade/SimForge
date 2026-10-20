import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface TrebuchetFloorProps {
  spawnFrame?: number;
  launchFrame?: number;
}

export const TrebuchetFloor: React.FC<TrebuchetFloorProps> = ({
  spawnFrame = 1710,
  launchFrame = 1860,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  // Underground installation snap animation
  const installProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 22],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.3)),
    }
  );

  // Catapult floor tilt angle (0 to -45 deg around Z)
  let tiltAngle = 0;
  let counterweightDrop = 0;
  if (launchFrame !== undefined && frame >= launchFrame) {
    const launchProgress = interpolate(
      frame,
      [launchFrame, launchFrame + 8],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      }
    );
    tiltAngle = -launchProgress * (Math.PI / 4);
    counterweightDrop = -launchProgress * 1.8;
  }

  return (
    <group position={[-6.5, 0, -0.6]} scale={[installProgress, installProgress, installProgress]}>
      {/* ================= UNDERGROUND CATAPULT MECHANISM ================= */}
      {/* Underground Heavy Timber Frame under entrance floor */}
      <group position={[0, -2.4, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.8, 0.4, 2.6]} />
          <meshStandardMaterial color="#422e1b" roughness={0.85} />
        </mesh>

        {/* Pivot A-Frame Pillars */}
        <mesh position={[-1.8, 1.1, 0]} castShadow>
          <boxGeometry args={[0.3, 2.2, 0.3]} />
          <meshStandardMaterial color="#352414" roughness={0.9} />
        </mesh>
        <mesh position={[-1.8, 1.1, 1.0]} castShadow>
          <boxGeometry args={[0.3, 2.2, 0.3]} />
          <meshStandardMaterial color="#352414" roughness={0.9} />
        </mesh>
        <mesh position={[-1.8, 1.1, -1.0]} castShadow>
          <boxGeometry args={[0.3, 2.2, 0.3]} />
          <meshStandardMaterial color="#352414" roughness={0.9} />
        </mesh>

        {/* Massive Iron Coiled Torsion Springs */}
        {[-0.6, 0.6].map((z, i) => (
          <mesh key={`spring-${i}`} position={[-1.8, 1.8, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.45, 0.12, 10, 20]} />
            <meshStandardMaterial color="#d4a338" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}

        {/* Heavy Stone Counterweight block */}
        <mesh position={[-2.8, -0.2 + counterweightDrop, 0]} castShadow>
          <boxGeometry args={[1.5, 1.6, 1.8]} />
          <meshStandardMaterial color="#2d2f3a" roughness={0.95} />
        </mesh>
      </group>

      {/* ================= HINGED LAUNCH FLOOR SLAB ================= */}
      {/* Pivot point is at x = -3.8 (near entrance to trap) */}
      <group position={[-1.8, -0.05, 0]} rotation={[0, 0, tiltAngle]}>
        {/* Main reinforced stone floor slab (pivoting from its right end) */}
        <mesh position={[-2.2, -0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.3, 3.2]} />
          <meshStandardMaterial color="#484b5c" roughness={0.8} />
        </mesh>

        {/* Heavy iron rim banding and studs */}
        <mesh position={[-2.2, 0.02, 1.55]}>
          <boxGeometry args={[4.4, 0.06, 0.1]} />
          <meshStandardMaterial color="#252730" metalness={0.85} roughness={0.4} />
        </mesh>
        <mesh position={[-2.2, 0.02, -1.55]}>
          <boxGeometry args={[4.4, 0.06, 0.1]} />
          <meshStandardMaterial color="#252730" metalness={0.85} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
};
