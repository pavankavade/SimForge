import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface IceBridgeProps {
  castFrame?: number;
  meltFrame?: number;
}

export const IceBridge: React.FC<IceBridgeProps> = ({
  castFrame = 780,
  meltFrame = 890,
}) => {
  const frame = useCurrentFrame();

  if (frame < castFrame) return null;

  // Freeze formation animation
  const formProgress = interpolate(
    frame,
    [castFrame, castFrame + 18],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // Melting animation when flamers activate
  let meltProgress = 0;
  if (meltFrame !== undefined && frame >= meltFrame) {
    meltProgress = interpolate(
      frame,
      [meltFrame, meltFrame + 20],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.cubic),
      }
    );
  }

  if (meltProgress >= 1) return null;

  const scaleY = (1 - meltProgress) * formProgress;
  const opacity = (1 - meltProgress * 0.85) * 0.85;

  return (
    <group position={[0, 0.05, -0.6]}>
      {/* Main crystalline ice slab spanning the gap */}
      <mesh position={[0, 0, 0]} scale={[formProgress, scaleY, 1]} receiveShadow>
        <boxGeometry args={[4.2, 0.22, 2.8]} />
        <meshPhysicalMaterial
          color="#6ee2ff"
          emissive="#2299cc"
          emissiveIntensity={0.4}
          roughness={0.15}
          transmission={0.65}
          thickness={0.8}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Frost spikes / crystals along edges */}
      {[-1.8, -1.0, 0, 1.0, 1.8].map((x, i) => (
        <group key={`frost-${i}`} position={[x, 0.12, 1.2]} scale={[scaleY, scaleY, scaleY]}>
          <mesh rotation={[0.3, 0, 0.2]}>
            <coneGeometry args={[0.08, 0.35, 5]} />
            <meshStandardMaterial
              color="#b5f2ff"
              emissive="#33bbff"
              emissiveIntensity={0.6}
              transparent
              opacity={opacity}
            />
          </mesh>
        </group>
      ))}

      {/* Cyan magical glow */}
      <pointLight
        position={[0, 0.4, 0]}
        color="#00eeff"
        intensity={(1 - meltProgress) * 1.5}
        distance={4.5}
      />
    </group>
  );
};
