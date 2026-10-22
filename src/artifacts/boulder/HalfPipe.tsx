import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeFlagstone } from "../../engine/textures";

interface HalfPipeProps {
  /** Centre of the quarter circle (x, y). */
  center: [number, number];
  radius: number;
  /** Floor x span the slats cover while flat. */
  flatRange: [number, number];
  /** [start, end] frames of the floor curling up. */
  curveWindow: readonly [number, number];
  z?: number;
  depth?: number;
  slats?: number;
}

const THICK = 0.14;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

/**
 * Floor slats on hydraulic rams. They start flush with the hall floor, then
 * lift one after another into a quarter-pipe that curls up to the exit wall.
 */
export const HalfPipe: React.FC<HalfPipeProps> = ({
  center,
  radius,
  flatRange,
  curveWindow,
  z = -0.6,
  depth = 3.2,
  slats = 8,
}) => {
  const frame = useCurrentFrame();
  const stone = useSurface(
    "hp-slat",
    () => makeFlagstone({ cells: 2, base: "#4b4e5a", baseAlt: "#565965", grout: "#1c1e25", seed: 61 }),
    [1, 2]
  );
  const [x0, x1] = flatRange;
  const flatW = (x1 - x0) / slats;
  const arcW = (radius * Math.PI) / 2 / slats;
  const [c0, c1] = curveWindow;
  const span = c1 - c0;
  const each = span * 0.55;

  const pieces = Array.from({ length: slats }, (_, i) => {
    // Rightmost slat (nearest the hall) lifts first and stays lowest.
    const order = slats - 1 - i;
    const phi = ((order + 0.5) / slats) * (Math.PI / 2);
    const start = c0 + (order / Math.max(1, slats - 1)) * (span - each);
    const raw = Math.min(1, Math.max(0, (frame - start) / each));
    const p = easeInOut(raw);
    const settle = raw >= 1 ? 0.04 * Math.sin((frame - start - each) * 0.9) * Math.exp(-(frame - start - each) / 5) : 0;
    const sx = center[0] - radius * Math.sin(phi);
    const sy = center[1] - radius * Math.cos(phi);
    const arcPos: [number, number] = [sx - (THICK / 2) * Math.sin(phi), sy - (THICK / 2) * Math.cos(phi)];
    const flatPos: [number, number] = [x0 + (i + 0.5) * flatW, -THICK / 2 + 0.035];
    const x = flatPos[0] + (arcPos[0] - flatPos[0]) * p;
    const y = flatPos[1] + (arcPos[1] - flatPos[1]) * p + settle;
    return { i, x, y, angle: -phi * p, width: (flatW + (arcW - flatW) * p) * 1.04, lift: Math.max(0, y) };
  });

  const lipY = center[1] * easeInOut(Math.min(1, Math.max(0, (frame - c0 - span * 0.6) / (span * 0.4))));

  return (
    <group>
      {/* Lead-in plate between the slats and the regular floor */}
      <mesh position={[(x1 + center[0]) / 2, 0.035 - THICK / 2, z]} receiveShadow>
        <boxGeometry args={[Math.max(0.01, center[0] - x1 + 0.02), THICK, depth]} />
        <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} color="#c4c9d5" roughness={0.82} />
      </mesh>
      {pieces.map((s) => (
        <group key={s.i}>
          <group position={[s.x, s.y, z]} rotation={[0, 0, s.angle]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[s.width, THICK, depth]} />
              <meshStandardMaterial
                map={stone.map}
                normalMap={stone.normalMap}
                roughnessMap={stone.roughnessMap}
                normalScale={new THREE.Vector2(0.6, 0.6)}
                color={s.i % 2 === 0 ? "#c9cedb" : "#bcc1cc"}
                roughness={0.82}
              />
            </mesh>
            {/* Iron edge band on the camera end */}
            <mesh position={[0, 0, depth / 2 + 0.01]}>
              <boxGeometry args={[s.width, THICK + 0.02, 0.03]} />
              <meshStandardMaterial color="#3a3f4a" metalness={0.8} roughness={0.4} />
            </mesh>
          </group>
          {/* Hydraulic rams under each lifted slat */}
          {s.lift > 0.08
            ? [-0.95, 0.95].map((dz) => (
                <group key={dz} position={[s.x + 0.08 * Math.sign(-s.angle), 0, z + dz]}>
                  <mesh position={[0, Math.min(s.lift, 0.7) / 2, 0]}>
                    <cylinderGeometry args={[0.11, 0.11, Math.min(s.lift, 0.7), 10]} />
                    <meshStandardMaterial color="#2c2f37" metalness={0.8} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, s.lift / 2, 0]}>
                    <cylinderGeometry args={[0.055, 0.055, s.lift, 8]} />
                    <meshStandardMaterial color="#e2e6ee" metalness={0.95} roughness={0.12} />
                  </mesh>
                  <mesh position={[0, 0.7, 0]}>
                    <cylinderGeometry args={[0.13, 0.13, 0.06, 10]} />
                    <meshStandardMaterial color="#f2c230" roughness={0.6} />
                  </mesh>
                </group>
              ))
            : null}
        </group>
      ))}
      {/* Brass lip at the top of the curve */}
      {lipY > 0.05 ? (
        <mesh position={[center[0] - radius - THICK / 2, lipY, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, depth, 10]} />
          <meshStandardMaterial color="#b98d3c" metalness={0.7} roughness={0.35} />
        </mesh>
      ) : null}
    </group>
  );
};
