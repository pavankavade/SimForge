import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface SlimeSlickProps {
  spawnFrame?: number;
  endFrame?: number;
}

export const SlimeSlick: React.FC<SlimeSlickProps> = ({
  spawnFrame = 535,
  endFrame = 940,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame || frame > endFrame) return null;

  const fadeOut = interpolate(frame, [endFrame - 15, endFrame], [1, 0.001], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slime drops and expands
  const expandProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 18],
    [0.001, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.4)),
    }
  ) * fadeOut;

  const bubbleWobble = Math.sin((frame - spawnFrame) * 0.25) * 0.05;
  const slopeAngle = 0.242;

  return (
    // Rotated along the slope surface
    <group
      position={[-1.5, 1.5 + -1.5 * Math.tan(slopeAngle) + 0.04, -0.6]}
      rotation={[0, 0, slopeAngle]}
      scale={[expandProgress, 1, expandProgress]}
    >
      {/* Glossy Green Alchemical Slime Main Puddle */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[4.8, 0.06, 2.7]} />
        <meshPhysicalMaterial
          color="#1aff55"
          emissive="#00aa33"
          emissiveIntensity={0.65}
          roughness={0.12}
          transmission={0.6}
          thickness={0.4}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Surface Bubbles & Viscous Blisters */}
      {[
        [-1.6, 0.6, 0.22],
        [-0.8, -0.5, 0.18],
        [0.4, 0.4, 0.28],
        [1.2, -0.3, 0.2],
        [1.8, 0.5, 0.16],
      ].map(([bx, bz, bRadius], i) => (
        <mesh
          key={`bubble-${i}`}
          position={[bx, 0.05 + bubbleWobble, bz]}
          scale={[1, 0.6, 1]}
          castShadow
        >
          <sphereGeometry args={[bRadius, 10, 8]} />
          <meshPhysicalMaterial
            color="#33ff66"
            emissive="#00ff44"
            emissiveIntensity={0.8}
            roughness={0.08}
            transmission={0.7}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Alchemical green pool light */}
      <pointLight
        position={[0, 0.6, 0]}
        color="#22ff66"
        intensity={2.2}
        distance={4.5}
      />
    </group>
  );
};
