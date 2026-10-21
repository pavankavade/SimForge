import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface CeilingPistonsProps {
  spawnFrame?: number;
  slamFrame?: number;
  endFrame?: number;
}

export const CeilingPistons: React.FC<CeilingPistonsProps> = ({
  spawnFrame = 1460,
  slamFrame = 1625,
  endFrame = 1780,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame || frame > endFrame) return null;

  const slopeAngle = 0.242;

  // Mount down from rafters
  const mountProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 20],
    [0.001, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.4)),
    }
  );

  // Hydraulic slam extension down toward track
  // Pistons slam downward rapidly, then slowly retract
  let slamDistance = 0;
  if (slamFrame !== undefined && frame >= slamFrame) {
    const elapsed = frame - slamFrame;
    if (elapsed < 8) {
      slamDistance = interpolate(elapsed, [0, 8], [0, 2.8], {
        easing: Easing.in(Easing.quad),
      });
    } else {
      slamDistance = interpolate(elapsed, [8, 35], [2.8, 0.4], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
  }

  // 3 Piston positions along the slope
  const pistonXs = [2.2, -0.8, -3.8];

  return (
    <group scale={[mountProgress, mountProgress, mountProgress]}>
      {pistonXs.map((px, i) => {
        // Ceiling height above track at position px
        const ceilingY = 1.5 + px * Math.tan(slopeAngle) + 5.2;

        return (
          <group key={`piston-${i}`} position={[px, ceilingY, -0.6]}>
            {/* Top Fixed Mounting Gallows */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[1.4, 0.5, 2.4]} />
              <meshStandardMaterial color="#2a2d36" metalness={0.8} roughness={0.4} />
            </mesh>

            {/* Brass Hydraulic Cylinder Housing */}
            <mesh position={[0, -0.8, 0]} castShadow>
              <cylinderGeometry args={[0.38, 0.38, 1.4, 12]} />
              <meshStandardMaterial color="#c29438" metalness={0.85} roughness={0.25} />
            </mesh>

            {/* Moving Piston Shaft & Stone Hammer Head */}
            <group position={[0, -1.4 - slamDistance, 0]}>
              {/* Chrome Steel Rod */}
              <mesh position={[0, 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.16, 1.8, 10]} />
                <meshStandardMaterial color="#dbe2ed" metalness={0.95} roughness={0.15} />
              </mesh>

              {/* Massive Stone Crushing Block Hammer */}
              <mesh position={[0, 0, 0]} rotation={[0, 0, slopeAngle]} castShadow receiveShadow>
                <boxGeometry args={[1.5, 0.7, 2.4]} />
                <meshStandardMaterial color="#4d505e" roughness={0.9} />
              </mesh>

              {/* Iron Striker Plate under the stone */}
              <mesh position={[0, -0.36, 0]} rotation={[0, 0, slopeAngle]}>
                <boxGeometry args={[1.54, 0.08, 2.44]} />
                <meshStandardMaterial color="#1f222a" metalness={0.88} roughness={0.3} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};
