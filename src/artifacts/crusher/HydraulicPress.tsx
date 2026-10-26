import type React from "react";
import { useCurrentFrame } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMetal } from "../../engine/textures";
import { easeOutBack, progress } from "../../kit";
import { GlowSprite } from "../dungeon/Fx";

export interface HydraulicPressProps {
  side: -1 | 1;
  /** Wall inner face distance; the piston rod reaches the wall's outer face. */
  inner: number;
  dropAt: number;
  hissAt?: number;
  wallT?: number;
  x0?: number;
  x1?: number;
  y?: number;
  r?: number;
  z?: number;
  /** z of the back wall the bracket bolts to. */
  backZ?: number;
}

const BANDS = 8;

/**
 * Huge hazard-striped hydraulic ram that drops in beside a wall and drives it through a chrome
 * piston rod. Bolted to the back wall by a heavy bracket.
 */
export const HydraulicPress: React.FC<HydraulicPressProps> = ({
  side,
  inner,
  dropAt,
  hissAt,
  wallT = 0.6,
  x0 = 2.5,
  x1 = 3.5,
  y = 2.75,
  r = 0.4,
  z = -0.6,
  backZ = -2.2,
}) => {
  const frame = useCurrentFrame();
  const steel = useSurface("press-steel", () => makeMetal({ base: "#5d636e", seed: 71, roughness: 110 }), [1, 1]);
  if (frame < dropAt) return null;
  const drop = (1 - easeOutBack(progress(frame, [dropAt, dropAt + 10]))) * 3.5;
  const len = x1 - x0;
  const bodyX = side * (x0 + len / 2);
  const outer = inner + wallT;
  const rodLen = x0 - outer;
  const hiss = hissAt === undefined ? 0 : Math.max(0, 1 - Math.abs(frame - hissAt - 6) / 10);

  return (
    <group position={[0, y + drop, z]}>
      {/* Cylinder body with hazard bands */}
      {Array.from({ length: BANDS }, (_, b) => (
        <mesh key={b} position={[side * (x0 + ((b + 0.5) * len) / BANDS), 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r, r, len / BANDS + 0.001, 24]} />
          <meshStandardMaterial color={b % 2 === 0 ? "#f2c230" : "#2c2d33"} roughness={0.45} metalness={0.2} />
        </mesh>
      ))}
      {/* End caps */}
      {[x0, x1].map((ex, i) => (
        <mesh key={i} position={[side * ex, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r + 0.06, r + 0.06, 0.12, 24]} />
          <meshStandardMaterial map={steel.map} color="#b4bac4" metalness={0.25} roughness={0.4} />
        </mesh>
      ))}
      {/* Gauge on the front */}
      <group position={[bodyX, 0.12, r + 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.05, 18]} />
          <meshStandardMaterial color="#e9e4d6" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.03]} rotation={[0, 0, -0.6 - hiss * 1.6 + Math.sin(frame * 0.7) * 0.05]}>
          <boxGeometry args={[0.015, 0.11, 0.01]} />
          <meshBasicMaterial color="#c8322b" />
        </mesh>
      </group>
      {/* Bracket to the back wall */}
      <mesh position={[bodyX, 0, (backZ - z) / 2]}>
        <boxGeometry args={[0.36, 0.3, Math.abs(backZ - z)]} />
        <meshStandardMaterial map={steel.map} color="#8a909a" metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[bodyX, 0, 0]}>
        <boxGeometry args={[0.42, r * 2 + 0.16, r * 2 + 0.1]} />
        <meshStandardMaterial map={steel.map} color="#7a808a" metalness={0.25} roughness={0.5} />
      </mesh>
      {/* Chrome piston rod and the push plate on the wall's outer face */}
      {rodLen > 0.01 ? (
        <mesh position={[side * (outer + rodLen / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, rodLen, 16]} />
          <meshStandardMaterial color="#e6ebf2" metalness={0.85} roughness={0.12} />
        </mesh>
      ) : null}
      {rodLen > -0.05 ? (
        <mesh position={[side * (outer + 0.04), 0, 0]}>
          <boxGeometry args={[0.08, 0.7, 0.9]} />
          <meshStandardMaterial map={steel.map} color="#8a909a" metalness={0.5} roughness={0.4} />
        </mesh>
      ) : null}
      {hiss > 0 ? <GlowSprite position={[side * x1, 0.3, 0.2]} color="#ffffff" size={0.9} opacity={hiss * 0.35} /> : null}
    </group>
  );
};
