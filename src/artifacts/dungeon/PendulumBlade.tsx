import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface PendulumBladeProps {
  spawnFrame?: number;
  swingStartFrame?: number;
}

export const PendulumBlade: React.FC<PendulumBladeProps> = ({
  spawnFrame = 1260,
  swingStartFrame = 1320,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  // Drop-down ceiling mount animation
  const mountProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 22],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.4)),
    }
  );

  const mountY = interpolate(mountProgress, [0, 1], [8.5, 5.8]);

  // Pendulum oscillation angle around Z axis
  let swingAngle = 0;
  if (swingStartFrame !== undefined && frame >= swingStartFrame) {
    const elapsed = frame - swingStartFrame;
    // Starts from high swing and maintains periodic oscillation
    const amplitude = interpolate(elapsed, [0, 20], [0, 1.1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    swingAngle = Math.sin(elapsed * 0.16) * amplitude;
  }

  // Gear rotation corresponding to swing
  const gearRot = swingAngle * 2.5;

  return (
    <group position={[-2.4, mountY, -0.6]}>
      {/* Ceiling Iron Support Gallows */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.6, 0.4, 2.2]} />
        <meshStandardMaterial color="#1f2128" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Decorative Large Brass Cogwheel */}
      <mesh position={[0, -0.3, 0.8]} rotation={[0, 0, gearRot]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 12]} />
        <meshStandardMaterial color="#b8933b" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Main Pendulum Pivot Axle */}
      <group position={[0, -0.4, 0]} rotation={[0, 0, swingAngle]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1.6, 12]} />
          <meshStandardMaterial color="#2d303a" metalness={0.9} roughness={0.25} />
        </mesh>

        {/* Heavy Iron Pendulum Shaft extending downward */}
        <mesh position={[0, -1.8, 0]} castShadow>
          <boxGeometry args={[0.18, 3.6, 0.22]} />
          <meshStandardMaterial color="#3b3f4c" metalness={0.85} roughness={0.35} />
        </mesh>

        {/* Crescent Executioner Blade at bottom (y = -3.6) */}
        <group position={[0, -3.6, 0]}>
          {/* Central Blade Core / Hub */}
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.24, 12]} />
            <meshStandardMaterial color="#1a1c22" metalness={0.95} roughness={0.2} />
          </mesh>

          {/* Curved Crescent Axe Blade */}
          <mesh position={[0.7, -0.2, 0]} rotation={[0, 0, -0.4]} castShadow>
            <boxGeometry args={[1.5, 0.8, 0.06]} />
            <meshStandardMaterial
              color="#d2d8e4"
              metalness={0.95}
              roughness={0.15}
            />
          </mesh>
          <mesh position={[-0.7, -0.2, 0]} rotation={[0, 0, 0.4]} castShadow>
            <boxGeometry args={[1.5, 0.8, 0.06]} />
            <meshStandardMaterial
              color="#d2d8e4"
              metalness={0.95}
              roughness={0.15}
            />
          </mesh>

          {/* Sharpened edge highlight */}
          <mesh position={[0, -0.7, 0]} castShadow>
            <coneGeometry args={[1.3, 0.4, 4]} />
            <meshStandardMaterial
              color="#ffffff"
              metalness={0.98}
              roughness={0.1}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};
