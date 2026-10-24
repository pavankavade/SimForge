import type React from "react";
import { useCurrentFrame } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMetal } from "../../engine/textures";

interface CeilingCrushersProps {
  xs: number[];
  installFrame: number;
  /** Gears start turning (armed and synced to the boulder). */
  gearsStart: number;
  /** Slam cue: the faces start dropping 4 frames before and bottom out 4 frames after. */
  slamFrame: number;
  /** Extra slams (same timing as slamFrame) for crushers that cycle. */
  moreSlams?: number[];
  ceilingY?: number;
  z?: number;
  width?: number;
  depth?: number;
  /** Lowest point of the crusher face during the slam. */
  slamY?: number;
  /** How far the crusher face hangs below the ceiling at rest (raise it to keep it in frame). */
  restDrop?: number;
}

const STRIPES = 7;

const Gear: React.FC<{ radius: number; teeth: number; angle: number; color?: string }> = ({
  radius,
  teeth,
  angle,
  color = "#b98d3c",
}) => (
  <group rotation={[0, 0, angle]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius, radius, 0.12, 28]} />
      <meshStandardMaterial color={color} metalness={0.75} roughness={0.35} />
    </mesh>
    {Array.from({ length: teeth }, (_, i) => {
      const a = (i / teeth) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.cos(a) * (radius + 0.07), Math.sin(a) * (radius + 0.07), 0]} rotation={[0, 0, a]}>
          <boxGeometry args={[0.16, 0.12, 0.12]} />
          <meshStandardMaterial color={color} metalness={0.75} roughness={0.35} />
        </mesh>
      );
    })}
    {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a) => (
      <mesh key={a} position={[0, 0, 0.07]} rotation={[0, 0, a]}>
        <boxGeometry args={[radius * 1.7, 0.08, 0.03]} />
        <meshStandardMaterial color="#5a4320" metalness={0.6} roughness={0.5} />
      </mesh>
    ))}
    <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius * 0.22, radius * 0.22, 0.06, 14]} />
      <meshStandardMaterial color="#2c2f37" metalness={0.85} roughness={0.35} />
    </mesh>
  </group>
);

/**
 * Pair of gear-driven crusher blocks mounted in the ceiling. They drop out of
 * hatches, the gears wind up in sync with the next boulder, and on the cue
 * they slam down to swat anything floating near the rafters.
 */
export const CeilingCrushers: React.FC<CeilingCrushersProps> = ({
  xs,
  installFrame,
  gearsStart,
  slamFrame,
  ceilingY = 5.9,
  z = -0.4,
  width = 1.15,
  depth = 2.0,
  slamY = 2.7,
  moreSlams = [],
  restDrop = 0.45,
}) => {
  const frame = useCurrentFrame();
  const iron = useSurface("crusher-iron", () => makeMetal({ base: "#4a4f5a", seed: 31, roughness: 160 }), [1, 1]);
  if (frame < installFrame) return null;

  const age = frame - installFrame;
  const drop = Math.min(1, age / 14);
  const installOffset = drop < 1 ? (1 - drop) ** 2 * 1.6 : -0.08 * Math.sin((age - 14) * 0.9) * Math.exp(-(age - 14) / 5);

  // Slam: fast extension, short hold, slow ratcheting retract.
  const restBottom = ceilingY - restDrop;
  const slams = [slamFrame].concat(moreSlams);
  const extendFor = (s: number) => {
    if (frame >= s - 4 && frame < s + 4) {
      const t = (frame - s + 4) / 8;
      return t * t;
    }
    if (frame >= s + 4 && frame < s + 16) return 1;
    if (frame >= s + 16 && frame < s + 50) {
      const t = (frame - s - 16) / 34;
      return 1 - t + 0.03 * Math.sin(t * 40) * (1 - t);
    }
    return 0;
  };
  const extend = Math.max(0, Math.min(1, Math.max(...slams.map(extendFor))));
  const bottom = restBottom - (restBottom - slamY) * extend;

  const lastSlam = Math.max(...slams);
  const running = frame >= gearsStart && frame < lastSlam + 50;
  const kick = slams.reduce((sum, s) => sum + (frame >= s - 4 ? (Math.min(frame, s + 4) - s + 4) * 0.25 : 0), 0);
  const spin = running ? (frame - gearsStart) * 0.09 + kick : 0;
  const front = z + depth / 2;
  const plateH = 0.5;
  const centerX = (xs[0] + xs[xs.length - 1]) / 2;

  return (
    <group position={[0, installOffset, 0]}>
      {xs.map((x, i) => (
        <group key={x} position={[x, 0, z]}>
          {/* Ceiling housing */}
          <mesh position={[0, ceilingY - 0.12, 0]} castShadow>
            <boxGeometry args={[width + 0.3, 0.3, depth + 0.2]} />
            <meshStandardMaterial color="#2c2f37" metalness={0.8} roughness={0.45} />
          </mesh>
          {/* Piston rods */}
          {[-0.3, 0.3].map((dz) => {
            const len = Math.max(0.05, ceilingY - 0.2 - (bottom + plateH));
            return (
              <mesh key={dz} position={[0, bottom + plateH + len / 2, dz]}>
                <cylinderGeometry args={[0.08, 0.08, len, 10]} />
                <meshStandardMaterial color="#d8dde6" metalness={0.95} roughness={0.15} />
              </mesh>
            );
          })}
          {/* Crusher block */}
          <group position={[0, bottom, 0]}>
            <mesh position={[0, plateH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[width, plateH, depth]} />
              <meshStandardMaterial map={iron.map} roughnessMap={iron.roughnessMap} color="#8d939f" metalness={0.8} roughness={0.45} />
            </mesh>
            {/* Hazard stripes on the camera face */}
            {Array.from({ length: STRIPES }, (_, s) => (
              <mesh key={s} position={[-width / 2 + ((s + 0.5) * width) / STRIPES, plateH / 2, depth / 2 + 0.006]} rotation={[0, 0, 0.6]}>
                <planeGeometry args={[0.08, plateH * 1.15]} />
                <meshStandardMaterial color={s % 2 === 0 ? "#f2c230" : "#16171b"} roughness={0.6} />
              </mesh>
            ))}
            <mesh position={[0, plateH / 2, depth / 2 + 0.003]}>
              <planeGeometry args={[width, plateH * 0.8]} />
              <meshStandardMaterial color="#16171b" roughness={0.7} />
            </mesh>
            {/* Teeth */}
            {[-0.38, 0, 0.38].map((dx) =>
              [-0.6, 0, 0.6].map((dz) => (
                <mesh key={`${dx}-${dz}`} position={[dx, -0.1, dz]} rotation={[Math.PI, 0, 0]} castShadow>
                  <coneGeometry args={[0.12, 0.22, 4]} />
                  <meshStandardMaterial color="#c9ced8" metalness={0.9} roughness={0.25} />
                </mesh>
              ))
            )}
          </group>
          {/* Drive gear on the front of each housing */}
          <group position={[0, ceilingY - 0.42, front + 0.16]}>
            <Gear radius={0.36} teeth={12} angle={i % 2 === 0 ? spin : -spin + 0.26} />
          </group>
        </group>
      ))}
      {/* Idler gear between them, linking the pair */}
      <group position={[centerX, ceilingY - 0.3, front + 0.1]}>
        <Gear radius={0.24} teeth={9} angle={-spin * 1.5} color="#8a6a2c" />
      </group>
    </group>
  );
};
