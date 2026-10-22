import type React from "react";
import { useCurrentFrame } from "remotion";
import { useSurface } from "../../engine/materials";
import { makeMetal } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

interface BlastDoorProps {
  x: number;
  /** [start, slam] frames of the drop. */
  dropWindow: readonly [number, number];
  ceilingY?: number;
  z?: number;
  depth?: number;
}

const THICK = 0.34;
const STRIPES = 9;

/**
 * Steel blast door that slams down out of a ceiling slot and seals the exit,
 * with hazard striping, rivets and a spinning warning lamp.
 */
export const BlastDoor: React.FC<BlastDoorProps> = ({ x, dropWindow, ceilingY = 5.9, z = -0.6, depth = 3.4 }) => {
  const frame = useCurrentFrame();
  const steel = useSurface("blast-steel", () => makeMetal({ base: "#6a707c", seed: 77, roughness: 140 }), [1, 2]);
  const [start, slam] = dropWindow;
  const height = ceilingY;
  const warn = frame >= start - 10;
  const t = Math.min(1, Math.max(0, (frame - start) / (slam - start)));
  const fall = t * t;
  const bounce = frame > slam ? 0.12 * Math.abs(Math.sin((frame - slam) * 0.7)) * Math.exp(-(frame - slam) / 4) : 0;
  const bottom = (1 - fall) * height + bounce;
  const front = depth / 2;
  const vis = Math.max(0.01, ceilingY - bottom);
  const lampOn = warn && Math.floor(frame / 5) % 2 === 0;

  return (
    <group position={[x, 0, z]}>
      {/* Ceiling slot + lamp */}
      <mesh position={[0, ceilingY + 0.02, 0]}>
        <boxGeometry args={[THICK + 0.3, 0.16, depth + 0.1]} />
        <meshStandardMaterial color="#25272f" metalness={0.7} roughness={0.5} />
      </mesh>
      {warn ? (
        <group position={[0.35, ceilingY - 0.25, front - 0.2]}>
          <mesh>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshStandardMaterial color={lampOn ? "#ff5a3a" : "#5a1a12"} emissive="#ff3a1a" emissiveIntensity={lampOn ? 3 : 0} />
          </mesh>
          {lampOn ? (
            <>
              <GlowSprite color="#ff5a2a" size={1.6} opacity={0.6} />
              <pointLight color="#ff4a2a" intensity={4} distance={6} decay={2} />
            </>
          ) : null}
        </group>
      ) : null}

      {frame >= start ? (
        <group position={[0, bottom, 0]}>
          <mesh position={[0, vis / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[THICK, vis, depth]} />
            <meshStandardMaterial map={steel.map} roughnessMap={steel.roughnessMap} color="#aab0bc" metalness={0.85} roughness={0.4} />
          </mesh>
          {/* Hazard band along the bottom edge, on both faces visible to camera */}
          {(vis > 0.62 ? Array.from({ length: STRIPES }, (_, s) => s) : []).map((s) => (
            <mesh key={s} position={[0, 0.3, -depth / 2 + ((s + 0.5) * depth) / STRIPES]} rotation={[0.6, 0, 0]}>
              <boxGeometry args={[THICK + 0.02, 0.62, 0.17]} />
              <meshStandardMaterial color={s % 2 === 0 ? "#f2c230" : "#16171b"} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 0.3, front + 0.005]} visible={vis > 0.62}>
            <planeGeometry args={[THICK, 0.6]} />
            <meshStandardMaterial color="#f2c230" roughness={0.6} />
          </mesh>
          {/* Reinforcing ribs + rivets on the hall side */}
          {[1.4, 2.8, 4.2].filter((y) => y < vis).map((y) => (
            <mesh key={y} position={[THICK / 2 + 0.03, y, 0]}>
              <boxGeometry args={[0.06, 0.16, depth - 0.1]} />
              <meshStandardMaterial color="#5a606c" metalness={0.85} roughness={0.4} />
            </mesh>
          ))}
          {[1.4, 2.8, 4.2].filter((y) => y < vis).map((y) =>
            [-1.2, -0.4, 0.4, 1.2].map((dz) => (
              <mesh key={`${y}-${dz}`} position={[THICK / 2 + 0.07, y, dz]}>
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshStandardMaterial color="#d8dde6" metalness={0.9} roughness={0.2} />
              </mesh>
            ))
          )}
          {/* Big painted "X" warning on the hall face */}
          {(vis > 3.0 ? [0.8, -0.8] : []).map((a) => (
            <mesh key={a} position={[THICK / 2 + 0.065, 2.1, 0]} rotation={[a, 0, 0]}>
              <boxGeometry args={[0.02, 2.0, 0.22]} />
              <meshStandardMaterial color="#c8322b" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
};
