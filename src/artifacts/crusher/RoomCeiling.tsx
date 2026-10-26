import type React from "react";
import { useCurrentFrame } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMasonry } from "../../engine/textures";
import { easeOutBack, easeOutCubic, progress } from "../../kit";

export interface RoomCeilingProps {
  chimneyAt?: number;
  /** Frames the spring boot punches down out of the vent. */
  bootAts?: number[];
  hatchAt?: number;
  blastAt?: number;
  z?: number;
  slab?: readonly [number, number];
  halfWidth?: number;
  ventHalf?: number;
  chimneyTop?: number;
  /** Lowest point of the boot sole. */
  bootReach?: number;
  depth?: readonly [number, number];
}

/** 0..1 boot extension: out in 3 frames, wobble, back in by +18. */
export const bootOut = (frame: number, ats: number[]) =>
  ats.reduce((s, at) => {
    const t = frame - at;
    if (t < 0 || t > 18) return s;
    const v = t <= 3 ? t / 3 : t <= 8 ? 1 - 0.08 * Math.sin((t - 3) * 1.6) : 1 - easeOutCubic((t - 8) / 10);
    return Math.max(s, v);
  }, 0);

/**
 * The crush room's ceiling slab with the vent hole, the brick chimney that rises over it, the
 * spring-loaded boot hidden inside, and the hatch flaps under the vent.
 */
export const RoomCeiling: React.FC<RoomCeilingProps> = ({
  chimneyAt,
  bootAts = [],
  hatchAt,
  blastAt,
  z = -0.6,
  slab = [3.2, 3.45],
  halfWidth = 2.6,
  ventHalf = 0.45,
  chimneyTop = 4.05,
  bootReach = 2.2,
  depth = [-1.7, 0.3],
}) => {
  const frame = useCurrentFrame();
  const stone = useSurface(
    "ceiling-masonry",
    () => makeMasonry({ rows: 2, cols: 6, base: "#575a63", baseAlt: "#4a4d56", mortar: "#1b1d22", seed: 62 }),
    [2, 1]
  );
  const brick = useSurface(
    "chimney-brick",
    () => makeMasonry({ rows: 4, cols: 3, base: "#8a4d33", baseAlt: "#7a422b", mortar: "#2a1a14", seed: 63 }),
    [1, 1]
  );
  const [y0, y1] = slab;
  const h = y1 - y0;
  const my = (y0 + y1) / 2;
  const [b0, b1] = depth;
  const v0 = z - ventHalf;
  const v1 = z + ventHalf;
  const side = halfWidth - ventHalf;
  const panels: [number, number, number, number][] = [
    // x, width, z, depth
    [-(ventHalf + side / 2), side, (b0 + b1) / 2, b1 - b0],
    [ventHalf + side / 2, side, (b0 + b1) / 2, b1 - b0],
    [0, ventHalf * 2, (b0 + v0) / 2, v0 - b0],
    [0, ventHalf * 2, (v1 + b1) / 2, b1 - v1],
  ];

  const chimT = chimneyAt === undefined ? 0 : easeOutBack(progress(frame, [chimneyAt, chimneyAt + 14]));
  const chimH = chimneyTop - y1;
  const out = bootOut(frame, bootAts);
  const sole = y0 + 0.25 - out * (y0 + 0.25 - bootReach);
  const blown = blastAt !== undefined && frame >= blastAt - 2;
  const hatchClose = hatchAt === undefined ? 0 : easeOutBack(progress(frame, [hatchAt, hatchAt + 6]));
  const flapOpen = blown ? 1 : Math.max(1 - hatchClose, out * 1.4);
  const flapAngle = Math.min(1, Math.max(0, flapOpen)) * 1.45;

  return (
    <group>
      {panels.map(([x, w, pz, d], i) => (
        <mesh key={i} position={[x, my, pz]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} roughnessMap={stone.roughnessMap} color="#c0c2ca" roughness={0.85} />
        </mesh>
      ))}
      {/* Iron trim along the front edge */}
      <mesh position={[0, y0 + 0.03, b1 + 0.02]}>
        <boxGeometry args={[halfWidth * 2, 0.06, 0.04]} />
        <meshStandardMaterial color="#3c3a38" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Hatch flaps under the vent, hinged at its edges */}
      {hatchAt !== undefined && frame >= hatchAt ? (
        <>
          <group position={[-ventHalf, y0 - 0.02, z]} rotation={[0, 0, -flapAngle]}>
            <mesh position={[ventHalf / 2, 0, 0]}>
              <boxGeometry args={[ventHalf, 0.05, ventHalf * 2 - 0.04]} />
              <meshStandardMaterial color="#4a4038" metalness={0.4} roughness={0.5} />
            </mesh>
          </group>
          <group position={[ventHalf, y0 - 0.02, z]} rotation={[0, 0, flapAngle]}>
            <mesh position={[-ventHalf / 2, 0, 0]}>
              <boxGeometry args={[ventHalf, 0.05, ventHalf * 2 - 0.04]} />
              <meshStandardMaterial color="#4a4038" metalness={0.4} roughness={0.5} />
            </mesh>
          </group>
        </>
      ) : null}

      {/* Brick chimney around the vent */}
      {chimT > 0.001 ? (
        <group position={[0, y1, z]} scale={[1, chimT, 1]}>
          {[
            [-(ventHalf + 0.09), 0, 0.18, ventHalf * 2 + 0.36],
            [ventHalf + 0.09, 0, 0.18, ventHalf * 2 + 0.36],
            [0, -(ventHalf + 0.09), ventHalf * 2, 0.18],
            [0, ventHalf + 0.09, ventHalf * 2, 0.18],
          ].map(([x, cz, w, d], i) => (
            <mesh key={i} position={[x, chimH / 2, cz]} castShadow>
              <boxGeometry args={[w, chimH, d]} />
              <meshStandardMaterial map={brick.map} normalMap={brick.normalMap} color="#e0b8a4" roughness={0.9} />
            </mesh>
          ))}
          {[
            [-(ventHalf + 0.11), 0, 0.24, ventHalf * 2 + 0.46],
            [ventHalf + 0.11, 0, 0.24, ventHalf * 2 + 0.46],
            [0, -(ventHalf + 0.11), ventHalf * 2, 0.24],
            [0, ventHalf + 0.11, ventHalf * 2, 0.24],
          ].map(([x, cz, w, d], i) => (
            <mesh key={`c${i}`} position={[x, chimH + 0.04, cz]}>
              <boxGeometry args={[w, 0.09, d]} />
              <meshStandardMaterial color="#3a3836" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ) : null}

      {/* Spring-loaded boot */}
      {out > 0.001 ? (
        <group position={[0, sole, z]}>
          {Array.from({ length: 7 }, (_, i) => {
            const top = y1 + 0.3 - sole;
            const y = 0.55 + ((top - 0.55) * (i + 0.5)) / 7;
            return (
              <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.15, 0.03, 8, 20]} />
                <meshStandardMaterial color="#b9bec8" metalness={0.7} roughness={0.25} />
              </mesh>
            );
          })}
          {/* Leg shaft + cuff */}
          <mesh position={[-0.04, 0.38, 0]}>
            <cylinderGeometry args={[0.19, 0.17, 0.42, 16]} />
            <meshStandardMaterial color="#7a4a2a" roughness={0.6} />
          </mesh>
          <mesh position={[-0.04, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.19, 0.05, 8, 18]} />
            <meshStandardMaterial color="#4e2e18" roughness={0.6} />
          </mesh>
          {/* Foot, toe cap and sole */}
          <mesh position={[0.08, 0.1, 0]}>
            <boxGeometry args={[0.56, 0.2, 0.32]} />
            <meshStandardMaterial color="#7a4a2a" roughness={0.6} />
          </mesh>
          <mesh position={[0.34, 0.1, 0]}>
            <sphereGeometry args={[0.13, 14, 10]} />
            <meshStandardMaterial color="#7a4a2a" roughness={0.6} />
          </mesh>
          <mesh position={[0.1, -0.02, 0]}>
            <boxGeometry args={[0.66, 0.06, 0.34]} />
            <meshStandardMaterial color="#231a14" roughness={0.9} />
          </mesh>
          {[0.12, 0.22, 0.32].map((dy) => (
            <mesh key={dy} position={[-0.04, dy + 0.14, 0.19]}>
              <boxGeometry args={[0.2, 0.025, 0.01]} />
              <meshStandardMaterial color="#e8d9b0" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
};
