import type React from "react";
import { useCurrentFrame } from "remotion";
import { easeOutBack, progress } from "../../kit";

export interface RoomRailsProps {
  railsAt: number;
  boosterAt: number;
  /** World x of the right wall's outer face (the booster plate pushes on it). */
  pushX: number;
  /** World x of the booster base. */
  baseX?: number;
  from?: number;
  to?: number;
  zs?: readonly [number, number];
  z?: number;
}

/**
 * High-speed rails along the hall floor (they stay put while the room lunges) and the big
 * compressed-spring booster that shoves the room down them.
 */
export const RoomRails: React.FC<RoomRailsProps> = ({ railsAt, boosterAt, pushX, baseX = 6.2, from = -9.5, to = 7, zs = [-1.5, 0.15], z = -0.6 }) => {
  const frame = useCurrentFrame();
  if (frame < railsAt) return null;
  const slide = (1 - easeOutBack(progress(frame, [railsAt, railsAt + 16]))) * 14;
  const len = to - from;
  const sleepers = Math.round(len / 0.7);
  const boost = frame >= boosterAt ? easeOutBack(progress(frame, [boosterAt, boosterAt + 10])) : 0;
  const springLen = Math.max(0.3, baseX - 0.3 - pushX);
  return (
    <group>
      <group position={[slide, 0, 0]}>
        {Array.from({ length: sleepers }, (_, i) => (
          <mesh key={i} position={[from + (i + 0.5) * (len / sleepers), 0.02, (zs[0] + zs[1]) / 2]} receiveShadow>
            <boxGeometry args={[0.28, 0.05, zs[1] - zs[0] + 0.6]} />
            <meshStandardMaterial color="#9a6436" roughness={0.85} />
          </mesh>
        ))}
        {zs.map((rz) => (
          <mesh key={rz} position={[from + len / 2, 0.07, rz]} castShadow>
            <boxGeometry args={[len, 0.07, 0.13]} />
            <meshStandardMaterial color="#e8ecf4" emissive="#ffb347" emissiveIntensity={0.45} metalness={0.3} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {boost > 0.001 ? (
        <group position={[0, 1.1 + (1 - boost) * 4, z]}>
          {/* Base block bolted to the floor */}
          <mesh position={[baseX, -0.35, 0]} castShadow>
            <boxGeometry args={[0.6, 1.5, 1.4]} />
            <meshStandardMaterial color="#3d4048" metalness={0.4} roughness={0.5} />
          </mesh>
          {Array.from({ length: 4 }, (_, s) => (
            <mesh key={s} position={[baseX - 0.31, -0.9 + s * 0.4, 0.71]} rotation={[0, 0, 0.6]}>
              <boxGeometry args={[0.12, 0.42, 0.02]} />
              <meshStandardMaterial color={s % 2 === 0 ? "#f2c230" : "#16171b"} roughness={0.6} />
            </mesh>
          ))}
          {/* Spring */}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[baseX - 0.3 - ((i + 0.5) * springLen) / 9, 0, 0]} rotation={[0, Math.PI / 2, 0.3]}>
              <torusGeometry args={[0.32, 0.05, 8, 22]} />
              <meshStandardMaterial color="#d9534a" metalness={0.3} roughness={0.35} />
            </mesh>
          ))}
          {/* Push plate */}
          <mesh position={[pushX + 0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.14, 1.2, 1.2]} />
            <meshStandardMaterial color="#f2c230" roughness={0.5} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

export interface RoomWheelsProps {
  wheelsAt: number;
  inner: number;
  /** Room offset: the wheels spin with it. */
  dx: number;
  wallT?: number;
  zs?: readonly [number, number];
  r?: number;
}

/** Flanged wheels popping out under both walls; ride inside the CrushRoom. */
export const RoomWheels: React.FC<RoomWheelsProps> = ({ wheelsAt, inner, dx, wallT = 0.6, zs = [-1.5, 0.15], r = 0.1 }) => {
  const frame = useCurrentFrame();
  if (frame < wheelsAt) return null;
  const pop = easeOutBack(progress(frame, [wheelsAt, wheelsAt + 8]));
  return (
    <group>
      {[-1, 1].map((side) =>
        [-0.17, 0.17].map((ox) =>
          zs.map((wz) => (
            <group key={`${side}${ox}${wz}`} position={[side * (inner + wallT / 2) + ox, 0.07 + r, wz]} scale={pop} rotation={[0, 0, -dx / r]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[r, r, 0.08, 16]} />
                <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh position={[0, 0, 0.045]}>
                <boxGeometry args={[r * 1.6, 0.025, 0.01]} />
                <meshStandardMaterial color="#f2c230" roughness={0.5} />
              </mesh>
            </group>
          ))
        )
      )}
    </group>
  );
};
