import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";

interface PressurePlateProps {
  spawnFrame?: number;
  triggerFrame?: number;
}

export const PressurePlate: React.FC<PressurePlateProps> = ({
  spawnFrame = 360,
  triggerFrame,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  // Fly-in spawn animation
  const spawnScale = interpolate(
    frame,
    [spawnFrame, spawnFrame + 14],
    [0.001, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.5)),
    }
  );

  // Depression when stepped on
  let depression = 0;
  if (triggerFrame !== undefined && frame >= triggerFrame) {
    depression = interpolate(
      frame,
      [triggerFrame, triggerFrame + 4],
      [0, 0.06],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );
  }

  // Active glow pulse when triggered
  const isTriggered = triggerFrame !== undefined && frame >= triggerFrame;
  const pulseIntensity = isTriggered
    ? 1.5 + Math.sin((frame - triggerFrame) * 0.4) * 0.5
    : 0.4;

  return (
    <group position={[1.1, 0, -0.6]} scale={[spawnScale, spawnScale, spawnScale]}>
      {/* Stone Border Recess on the floor */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[1.1, 0.04, 1.1]} />
        <meshStandardMaterial color="#21222b" roughness={0.9} />
      </mesh>

      {/* Raised Pressure Plate Slab */}
      <mesh position={[0, 0.05 - depression, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.06, 0.9]} />
        <meshStandardMaterial
          color="#3d414e"
          metalness={0.72}
          roughness={0.42}
        />
      </mesh>

      {/* Iron rim */}
      {[-1, 1].map((side) => (
        <mesh
          key={`rim-x-${side}`}
          position={[side * 0.42, 0.075 - depression, 0]}
        >
          <boxGeometry args={[0.07, 0.05, 0.92]} />
          <meshStandardMaterial color="#6d7484" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`rim-z-${side}`}
          position={[0, 0.075 - depression, side * 0.42]}
        >
          <boxGeometry args={[0.92, 0.05, 0.07]} />
          <meshStandardMaterial color="#6d7484" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* Glowing rune cross on the plate face */}
      <mesh position={[0, 0.083 - depression, 0]}>
        <boxGeometry args={[0.56, 0.012, 0.05]} />
        <meshStandardMaterial
          color="#e04a3a"
          emissive="#ff2a1a"
          emissiveIntensity={pulseIntensity * 1.5}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.083 - depression, 0]}>
        <boxGeometry args={[0.05, 0.012, 0.56]} />
        <meshStandardMaterial
          color="#e04a3a"
          emissive="#ff2a1a"
          emissiveIntensity={pulseIntensity * 1.5}
          roughness={0.4}
        />
      </mesh>

      {/* Corner rivets */}
      {[
        [-0.36, -0.36],
        [0.36, -0.36],
        [-0.36, 0.36],
        [0.36, 0.36],
      ].map(([x, z]) => (
        <mesh key={`plate-rivet-${x}-${z}`} position={[x, 0.085 - depression, z]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color="#9aa2b2" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}

      {/* ================= UNDERGROUND LINKAGE RODS ================= */}
      {/* Vertical plunger underneath plate extending down to y = -1.2 */}
      <mesh position={[0, -0.6 - depression, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
        <meshStandardMaterial
          color="#d13838"
          emissive="#ff1111"
          emissiveIntensity={pulseIntensity * 0.8}
          metalness={0.8}
        />
      </mesh>

      {/* Pivot Bell Crank joint under the floor */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 10]} />
        <meshStandardMaterial color="#3a3d4a" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Horizontal glowing linkage rod connecting toward the trapdoor release (x = 0) */}
      <mesh position={[-0.55, -1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
        <meshStandardMaterial
          color="#d13838"
          emissive="#ff1111"
          emissiveIntensity={pulseIntensity}
          metalness={0.8}
        />
      </mesh>

      {/* Trapdoor Release Latch Hook under trapdoor edge */}
      <mesh position={[-1.1, -1.1, 0]}>
        <boxGeometry args={[0.15, 0.35, 0.15]} />
        <meshStandardMaterial
          color="#ff3333"
          emissive="#ff0000"
          emissiveIntensity={pulseIntensity * 1.2}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
};
