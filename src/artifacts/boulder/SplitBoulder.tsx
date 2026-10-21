import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface SplitBoulderProps {
  rollStartFrame?: number;
  shatterFrame?: number;
  endFrame?: number;
}

export const SplitBoulder: React.FC<SplitBoulderProps> = ({
  rollStartFrame = 780,
  shatterFrame = 840,
  endFrame = 950,
}) => {
  const frame = useCurrentFrame();

  if (frame < rollStartFrame || frame > endFrame) return null;

  const radius = 1.35;
  const slopeAngle = 0.242;

  // Rolling motion from top x = 6.8 down toward Paladin at x = -3.0
  const isShattered = frame >= shatterFrame;

  // Pre-shatter roll progress (from rollStartFrame to shatterFrame)
  const preShatterX = interpolate(
    frame,
    [rollStartFrame, shatterFrame],
    [6.8, -1.6],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const rollRotation = (6.8 - preShatterX) / radius;
  const preShatterY = 1.5 + preShatterX * Math.tan(slopeAngle) + radius * 0.98;

  // Post-shatter split apart animation
  const shatterProgress = isShattered
    ? interpolate(frame, [shatterFrame, shatterFrame + 25], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;

  const splitZ = interpolate(shatterProgress, [0, 1], [0, 1.4]);
  const postShatterX = -1.6 - shatterProgress * 3.5;
  const postShatterY = 1.5 + postShatterX * Math.tan(slopeAngle) + (radius * 0.98 - shatterProgress * 0.6);

  const currentX = isShattered ? postShatterX : preShatterX;
  const currentY = isShattered ? postShatterY : preShatterY;

  return (
    <group position={[currentX, currentY, -0.6]}>
      {/* Front Half of Boulder */}
      <group
        position={[0, 0, splitZ]}
        rotation={[0, 0, rollRotation + shatterProgress * 1.5]}
      >
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, 18, 12, 0, Math.PI]} />
          <meshStandardMaterial
            color="#565968"
            roughness={0.88}
            metalness={0.05}
          />
        </mesh>
        {/* Interior rough cleavage face */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[radius, 16]} />
          <meshStandardMaterial color="#424552" roughness={0.95} />
        </mesh>
      </group>

      {/* Back Half of Boulder */}
      <group
        position={[0, 0, -splitZ]}
        rotation={[0, 0, rollRotation - shatterProgress * 1.5]}
      >
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, 18, 12, Math.PI, Math.PI]} />
          <meshStandardMaterial
            color="#565968"
            roughness={0.88}
            metalness={0.05}
          />
        </mesh>
        {/* Interior rough cleavage face */}
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[radius, 16]} />
          <meshStandardMaterial color="#424552" roughness={0.95} />
        </mesh>
      </group>

      {/* Shatter Flying Rock Chunks when broken */}
      {isShattered && (
        <group>
          {[-0.6, 0, 0.6].map((offset, i) => {
            const chunkDist = shatterProgress * 2.2;
            return (
              <mesh
                key={`chunk-${i}`}
                position={[offset + chunkDist * 0.4, chunkDist * 0.8, offset * 1.5]}
                rotation={[shatterProgress * 3, shatterProgress * 2, 0]}
                castShadow
              >
                <boxGeometry args={[0.25, 0.25, 0.25]} />
                <meshStandardMaterial color="#6a6f80" roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};
