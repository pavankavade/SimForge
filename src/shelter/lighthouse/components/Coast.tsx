import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../../engine/materials";
import { makeGranite } from "../../../engine/textures";
import { LAND_Y, OTHERS, ROCK_X, ROCK_Z, SEA_Y, SHORE_X, TOWER_X, TOWER_Z } from "../timeline";

const SEA_W = 220;
const SEA_D = 170;
const SEA_SEG_X = 110;
const SEA_SEG_Z = 85;

/** Rolling swell: a few travelling sines, pure function of x, z and frame. */
const swell = (x: number, z: number, f: number) =>
  0.07 * Math.sin(x * 0.55 + z * 0.2 - f * 0.09) + 0.05 * Math.sin(z * 0.8 - x * 0.3 + f * 0.07) + 0.03 * Math.sin((x + z) * 1.7 + f * 0.15);

const Sea: React.FC<{ frame: number }> = ({ frame }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(SEA_W, SEA_D, SEA_SEG_X, SEA_SEG_Z);
    g.rotateX(-Math.PI / 2);
    g.translate(30, SEA_Y, -50);
    return g;
  }, []);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, SEA_Y + swell(pos.getX(i), pos.getZ(i), frame));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#2f6f9f" roughness={0.2} metalness={0.2} />
    </mesh>
  );
};

const ROCKS = [
  { p: [0, 0.35, 0], s: [0.95, 0.75, 0.8] },
  { p: [0.75, 0.15, 0.3], s: [0.6, 0.5, 0.55] },
  { p: [-0.7, 0.1, -0.2], s: [0.65, 0.45, 0.6] },
  { p: [0.3, 0.05, -0.8], s: [0.7, 0.4, 0.5] },
  { p: [-0.25, 0.0, 0.75], s: [0.45, 0.3, 0.4] },
] as const;

/** Foam rings that swell out from a point and fade, offset in time. */
const Foam: React.FC<{ frame: number; x: number; z: number; r: number; seed: number }> = ({ frame, x, z, r, seed }) => (
  <>
    {[0, 1, 2].map((k) => {
      const t = ((frame + seed * 13 + k * 26) % 78) / 78;
      return (
        <mesh key={k} position={[x, SEA_Y + 0.06, z]} rotation={[-Math.PI / 2, 0, 0]} scale={r * (1 + t * 0.7)}>
          <ringGeometry args={[0.92, 1, 40]} />
          <meshBasicMaterial color="#e8f6ff" transparent opacity={0.55 * (1 - t)} depthWrite={false} />
        </mesh>
      );
    })}
  </>
);

/**
 * The coast: animated sea, a sandy beach that runs back to grassy dunes, the
 * rocks in the shipping lane, and far headlands for the other lighthouses.
 */
export const Coast: React.FC<{ frame: number }> = ({ frame }) => {
  const granite = useSurface("lh-granite", () => makeGranite({ base: "#5a5c66", baseAlt: "#71737f", darkVein: "#3a3b44", seed: 9 }), [1, 1]);
  const dunes = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: -30 + i * 2.2 + random(`dune-x-${i}`) * 1.2,
        z: -9 - random(`dune-z-${i}`) * 5,
        r: 1.6 + random(`dune-r-${i}`) * 1.4,
      })).filter((d) => d.x < SHORE_X - 2),
    [],
  );
  const tufts = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        x: -14 + random(`tuft-x-${i}`) * 13,
        z: -7.5 + random(`tuft-z-${i}`) * 3,
        h: 0.25 + random(`tuft-h-${i}`) * 0.25,
      })),
    [],
  );
  const shoreT = Math.sin(frame * 0.06);

  return (
    <>
      <Sea frame={frame} />

      {/* Beach slab, its wet edge sloping into the water */}
      <mesh position={[(-40 + SHORE_X) / 2, LAND_Y - 1.5, -25]} receiveShadow>
        <boxGeometry args={[40 + SHORE_X, 3, 80]} />
        <meshStandardMaterial color="#e2c08a" roughness={1} />
      </mesh>
      <mesh position={[SHORE_X + 0.55, LAND_Y - 0.42, -25]} rotation={[0, 0, -0.42]} receiveShadow>
        <boxGeometry args={[1.6, 0.6, 80]} />
        <meshStandardMaterial color="#c9a46e" roughness={0.6} />
      </mesh>
      {/* Surf line washing up and down the slope */}
      <mesh position={[SHORE_X + 1.0 + 0.18 * shoreT, SEA_Y + 0.07, -25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, 80]} />
        <meshBasicMaterial color="#f2fbff" transparent opacity={0.7} depthWrite={false} />
      </mesh>

      {/* Dunes and beach grass behind the beach */}
      {dunes.map((d, i) => (
        <mesh key={i} position={[d.x, LAND_Y - d.r * 0.55, d.z]} scale={[1.4, 1, 1]} receiveShadow castShadow>
          <sphereGeometry args={[d.r, 20, 14]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#d6b47e" : "#5f8a43"} roughness={1} />
        </mesh>
      ))}
      {tufts.map((t, i) => (
        <mesh key={`t${i}`} position={[t.x, LAND_Y + t.h / 2, t.z]}>
          <coneGeometry args={[0.08, t.h, 5]} />
          <meshStandardMaterial color="#7da350" roughness={1} />
        </mesh>
      ))}

      {/* Rocks in the lane, and a few round the foot of the tower */}
      <group position={[ROCK_X, SEA_Y, ROCK_Z]}>
        {ROCKS.map((r, i) => (
          <mesh key={i} position={[r.p[0], r.p[1], r.p[2]]} scale={[r.s[0], r.s[1], r.s[2]]} rotation={[i * 0.7, i * 1.3, i * 0.4]} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial {...granite} color="#9a9cab" roughness={0.85} flatShading />
          </mesh>
        ))}
      </group>
      <Foam frame={frame} x={ROCK_X} z={ROCK_Z} r={1.5} seed={1} />
      <Foam frame={frame} x={ROCK_X + 0.6} z={ROCK_Z - 0.6} r={1.1} seed={4} />
      {[-0.9, 0.95].map((dx, i) => (
        <mesh key={`tr${i}`} position={[TOWER_X + dx * 1.35, LAND_Y + 0.05, TOWER_Z + (i ? -0.6 : 0.7)]} scale={[0.55, 0.38, 0.5]} rotation={[i, i * 2, 0]} castShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial {...granite} color="#9a9cab" roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* Far headland and an island for the other lighthouses */}
      {OTHERS.map((o, i) => (
        <group key={`h${i}`} position={[o.x, SEA_Y, o.z]}>
          <mesh position={[0, -2.2, 0]} scale={[1.6, 1, 1.2]} receiveShadow>
            <sphereGeometry args={[4.2 * o.s, 24, 16]} />
            <meshStandardMaterial color="#56604f" roughness={1} />
          </mesh>
          <mesh position={[0, -2.4, 0]} scale={[1.75, 1, 1.3]}>
            <sphereGeometry args={[4.2 * o.s, 24, 16]} />
            <meshStandardMaterial color="#cdb084" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* Distant coastline */}
      {[
        [-30, -70, 14],
        [-6, -85, 16],
        [40, -95, 18],
      ].map(([x, z, r], i) => (
        <mesh key={`far${i}`} position={[x, -r * 0.7, z]} scale={[2.2, 1, 1]}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshStandardMaterial color="#3e4a55" roughness={1} />
        </mesh>
      ))}
    </>
  );
};
