import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface MagneticSpikeBoulderProps {
  spawnFrame?: number;
  rollStartFrame?: number;
  magnetActiveFrame?: number;
  endFrame?: number;
}

export const MagneticSpikeBoulder: React.FC<MagneticSpikeBoulderProps> = ({
  spawnFrame = 980,
  rollStartFrame = 1170,
  magnetActiveFrame = 1160,
  endFrame = 1750,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame || frame > endFrame) return null;

  const radius = 1.15;
  const slopeAngle = 0.242;

  // Underground magnet installation
  const magnetSpawnProgress = interpolate(
    frame,
    [spawnFrame, spawnFrame + 20],
    [0.001, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.4)),
    }
  );

  const isMagnetActive = frame >= magnetActiveFrame;
  const magnetPulse = isMagnetActive
    ? Math.sin((frame - magnetActiveFrame) * 0.45) * 0.4 + 1.2
    : 0.2;

  // Rolling motion from top x = 6.8 down to x = -8.5
  const isRolling = frame >= rollStartFrame;
  const rollProgress = isRolling
    ? interpolate(frame, [rollStartFrame, rollStartFrame + 60], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      })
    : 0;

  const currentX = interpolate(rollProgress, [0, 1], [6.8, -8.5]);
  const currentY = 1.5 + currentX * Math.tan(slopeAngle) + radius * 0.98;
  const rollRotation = (6.8 - currentX) / radius;

  // 16 spike angles around the sphere
  const spikes = [
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0.7, 0.7, 0],
    [-0.7, 0.7, 0],
    [0.7, -0.7, 0],
    [-0.7, -0.7, 0],
    [0, 0.7, 0.7],
    [0, -0.7, 0.7],
    [0, 0.7, -0.7],
    [0, -0.7, -0.7],
    [0.6, 0.6, 0.6],
    [-0.6, 0.6, -0.6],
  ];

  const magnetX = -1.5;
  const magnetY = 1.5 + magnetX * Math.tan(slopeAngle) - 0.7;

  return (
    <group position={[0, 0, -0.6]}>
      {/* ================= UNDERGROUND ELECTROMAGNET COIL ================= */}
      <group
        position={[magnetX, magnetY, 0]}
        rotation={[0, 0, slopeAngle]}
        scale={[magnetSpawnProgress, magnetSpawnProgress, magnetSpawnProgress]}
      >
        {/* Heavy Iron Armature Core */}
        <mesh position={[0, -0.4, 0]} castShadow>
          <cylinderGeometry args={[0.9, 1.1, 1.4, 16]} />
          <meshStandardMaterial color="#22242c" metalness={0.9} roughness={0.3} />
        </mesh>

        {/* Wound Copper Magnetic Coils */}
        {[-0.6, -0.3, 0, 0.3].map((y, i) => (
          <mesh key={`copper-coil-${i}`} position={[0, y, 0]} castShadow>
            <torusGeometry args={[0.95, 0.12, 10, 24]} />
            <meshStandardMaterial color="#c27438" metalness={0.88} roughness={0.25} />
          </mesh>
        ))}

        {/* Glowing Magnetic Flux Ring (blue/purple) */}
        {isMagnetActive && (
          <group position={[0, 0.5, 0]}>
            <mesh scale={[magnetPulse, 1, magnetPulse]}>
              <torusGeometry args={[1.3, 0.08, 12, 32]} />
              <meshStandardMaterial
                color="#55b8ff"
                emissive="#0088ff"
                emissiveIntensity={2.5}
                transparent
                opacity={0.8}
              />
            </mesh>
            <mesh scale={[magnetPulse * 1.3, 1, magnetPulse * 1.3]}>
              <torusGeometry args={[1.7, 0.05, 12, 32]} />
              <meshStandardMaterial
                color="#aa55ff"
                emissive="#8800ff"
                emissiveIntensity={2.0}
                transparent
                opacity={0.5}
              />
            </mesh>
            <pointLight
              position={[0, 0.8, 0]}
              color="#00aaff"
              intensity={4.5 * magnetPulse}
              distance={7}
            />
          </group>
        )}
      </group>

      {/* ================= SPIKED IRON BOULDER ================= */}
      <group position={[currentX, currentY, 0]} rotation={[0, 0, rollRotation]}>
        {/* Heavy Wrought Iron Core Sphere */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[radius, 20, 16]} />
          <meshStandardMaterial
            color="#2a2d36"
            metalness={0.85}
            roughness={0.35}
          />
        </mesh>

        {/* Spikes radiating from sphere */}
        {spikes.map(([sx, sy, sz], i) => (
          <group
            key={`spike-${i}`}
            position={[sx * radius * 0.9, sy * radius * 0.9, sz * radius * 0.9]}
            rotation={[
              Math.atan2(sy, Math.sqrt(sx * sx + sz * sz)),
              0,
              -Math.atan2(sx, sy),
            ]}
          >
            <mesh position={[0, 0.38, 0]} castShadow>
              <coneGeometry args={[0.15, 0.75, 6]} />
              <meshStandardMaterial
                color="#4e5362"
                metalness={0.9}
                roughness={0.25}
              />
            </mesh>
            {/* Spike Collar */}
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.18, 0.22, 0.08, 6]} />
              <meshStandardMaterial color="#1a1c22" metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
