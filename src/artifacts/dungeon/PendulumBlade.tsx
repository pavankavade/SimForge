import type React from "react";
import * as THREE from "three";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMetal } from "../../engine/textures";

interface PendulumBladeProps {
  spawnFrame: number;
  /** Swing angle (radians, around z) for the current frame. */
  angle: number;
  /** Angle one frame earlier, used for motion trails. */
  previousAngle: number;
}

const ARM = 3.6;

const Gear: React.FC<{ radius: number; teeth: number; rotation: number; color: string }> = ({
  radius,
  teeth,
  rotation,
  color,
}) => (
  <group rotation={[0, 0, rotation]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, 0.12, 24]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
    </mesh>
    {Array.from({ length: teeth }, (_, i) => {
      const a = (i / teeth) * Math.PI * 2;
      return (
        <mesh
          key={`tooth-${i}`}
          position={[Math.cos(a) * (radius + 0.06), Math.sin(a) * (radius + 0.06), 0]}
          rotation={[0, 0, a]}
        >
          <boxGeometry args={[0.14, 0.1, 0.12]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
        </mesh>
      );
    })}
    <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius * 0.3, radius * 0.3, 0.04, 12]} />
      <meshStandardMaterial color="#2b2e36" metalness={0.8} roughness={0.35} />
    </mesh>
    {[0, 1, 2].map((i) => (
      <mesh key={`spoke-${i}`} position={[0, 0, 0.065]} rotation={[0, 0, (i * Math.PI) / 3]}>
        <boxGeometry args={[radius * 1.7, 0.07, 0.03]} />
        <meshStandardMaterial color="#2b2e36" metalness={0.8} roughness={0.35} />
      </mesh>
    ))}
  </group>
);

const Blade: React.FC<{ ghost?: number }> = ({ ghost }) => {
  const transparent = ghost !== undefined;
  const opacity = ghost ?? 1;
  return (
    <group position={[0, -ARM, 0]}>
      {!transparent ? (
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.24, 14]} />
          <meshStandardMaterial color="#343945" metalness={0.6} roughness={0.25} />
        </mesh>
      ) : null}
      <mesh position={[0, -0.18, 0]} castShadow={!transparent}>
        <ringGeometry args={[0.55, 1.05, 32, 1, Math.PI, Math.PI]} />
        <meshStandardMaterial
          color="#aab6ca"
          metalness={0.7}
          roughness={0.22}
          side={THREE.DoubleSide}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
        />
      </mesh>
      <mesh position={[0, -0.18, 0.02]}>
        <ringGeometry args={[0.98, 1.07, 32, 1, Math.PI, Math.PI]} />
        <meshStandardMaterial
          color="#f6faff"
          emissive="#8fa6c8"
          emissiveIntensity={1.1}
          metalness={0.5}
          roughness={0.1}
          side={THREE.DoubleSide}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
        />
      </mesh>
    </group>
  );
};

export const PendulumBlade: React.FC<PendulumBladeProps> = ({ spawnFrame, angle, previousAngle }) => {
  const frame = useCurrentFrame();
  const iron = useSurface(
    "pendulum-iron",
    () => makeMetal({ base: "#4e5462", seed: 91, roughness: 100 }),
    [1, 2]
  );

  if (frame < spawnFrame) return null;

  const mount = interpolate(frame, [spawnFrame, spawnFrame + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.4)),
  });
  const mountY = interpolate(mount, [0, 1], [8.5, 5.8]);
  const omega = angle - previousAngle;
  const trail = Math.min(1, Math.abs(omega) / 0.12);

  return (
    <group position={[-2.4, mountY, -0.6]}>
      {/* Ceiling gallows */}
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.42, 2.2]} />
        <meshStandardMaterial
          map={iron.map}
          roughnessMap={iron.roughnessMap}
          color="#8c93a3"
          metalness={0.7}
          roughness={0.35}
        />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={`bracket-${x}`} position={[x, -0.3, 0]}>
          <boxGeometry args={[0.16, 0.5, 1.9]} />
          <meshStandardMaterial color="#3f4450" metalness={0.75} roughness={0.35} />
        </mesh>
      ))}

      {/* Gear train: big wheel on the axle, small drive pinion beside it */}
      <group position={[0, -0.4, 0.95]}>
        <Gear radius={0.55} teeth={14} rotation={angle * 2.2} color="#d0a848" />
      </group>
      <group position={[0.98, -0.12, 0.95]}>
        <Gear radius={0.28} teeth={8} rotation={-angle * 4.4 + 0.2} color="#b88a36" />
      </group>
      {/* Ratchet pawl resting on the big gear */}
      <mesh position={[-0.55, 0.12, 1.02]} rotation={[0, 0, -0.6 + Math.abs(Math.sin(angle * 25)) * 0.12]}>
        <boxGeometry args={[0.42, 0.07, 0.06]} />
        <meshStandardMaterial color="#2d3038" metalness={0.8} roughness={0.35} />
      </mesh>

      {/* Motion trails */}
      {trail > 0.05
        ? [1, 2, 3].map((i) => (
            <group key={`trail-${i}`} position={[0, -0.4, -0.02 * i]} rotation={[0, 0, angle - omega * i * 0.7]}>
              <Blade ghost={0.22 * trail * (1 - i / 4)} />
            </group>
          ))
        : null}

      {/* Swinging arm */}
      <group position={[0, -0.4, 0]} rotation={[0, 0, angle]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 1.7, 14]} />
          <meshStandardMaterial color="#596173" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, -ARM / 2, 0]} castShadow>
          <boxGeometry args={[0.2, ARM, 0.22]} />
          <meshStandardMaterial
            map={iron.map}
            roughnessMap={iron.roughnessMap}
            color="#9aa1b0"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        {[-1.2, -2.4].map((y) => (
          <mesh key={`collar-${y}`} position={[0, y, 0]}>
            <boxGeometry args={[0.3, 0.12, 0.3]} />
            <meshStandardMaterial color="#c79a3e" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        <Blade />
        <pointLight position={[0, -ARM - 0.3, 1.6]} color="#cfe4ff" intensity={3.2} distance={6.5} decay={2} />
      </group>
    </group>
  );
};
