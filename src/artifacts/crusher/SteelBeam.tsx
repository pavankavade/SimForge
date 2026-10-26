import type React from "react";
import type { Vec3 } from "../../engine/types";

export interface SteelBeamProps {
  /** Centre of the beam. */
  position: Vec3;
  /** Half length. */
  half: number;
  /** Buckle angle (0 = straight): each half pivots about its outer end, the middle rises. */
  buckle?: number;
}

const H = 0.2;
const W = 0.16;

const Half: React.FC<{ len: number }> = ({ len }) => (
  <group>
    <mesh castShadow>
      <boxGeometry args={[len, H * 0.6, 0.05]} />
      <meshStandardMaterial color="#8d939e" metalness={0.5} roughness={0.4} />
    </mesh>
    {[1, -1].map((s) => (
      <mesh key={s} position={[0, (s * H) / 2, 0]} castShadow>
        <boxGeometry args={[len, 0.05, W]} />
        <meshStandardMaterial color="#a9afb9" metalness={0.5} roughness={0.35} />
      </mesh>
    ))}
  </group>
);

/** Reinforced steel I-beam with hazard-striped end caps; buckles in the middle when crushed. */
export const SteelBeam: React.FC<SteelBeamProps> = ({ position, half, buckle = 0 }) => {
  const c = Math.cos(buckle);
  const s = Math.sin(buckle);
  const reach = half * c;
  const ends = [-1, 1].map((side) => {
    // Each half runs from the end (side * reach, 0) to the middle (0, half * s).
    const mid: Vec3 = [(side * reach) / 2, (half * s) / 2, 0];
    return { side, mid, rot: side * -buckle };
  });
  return (
    <group position={position}>
      {ends.map(({ side, mid, rot }) => (
        <group key={side} position={mid} rotation={[0, 0, rot]}>
          <Half len={half + 0.02} />
          {/* Hazard end cap */}
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[side * (half / 2 - 0.05 - k * 0.1), 0, W / 2 + 0.005]}>
              <boxGeometry args={[0.1, H + 0.02, 0.012]} />
              <meshStandardMaterial color={k % 2 === 0 ? "#f2c230" : "#16171b"} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[side * (half / 2 + 0.01), 0, 0]}>
            <boxGeometry args={[0.05, H + 0.06, W + 0.04]} />
            <meshStandardMaterial color="#f2c230" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
