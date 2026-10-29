import type React from "react";
import { random, useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMasonry, makeWood } from "../../engine/textures";
import { DustMotes, GlowSprite } from "../dungeon/Fx";

/**
 * The Adventurers' Guild: a cosy tavern interior seen side-on. Timber-framed
 * plaster back wall, plank floor, a bar with bottles and kegs on the left, a
 * fireplace on the right, hanging lanterns and a couple of tables. The
 * GuildBoard stands against the back wall at x = 0 (placed by the scene).
 */
export const TAVERN = { x0: -9.5, x1: 9.5, ceilingY: 6.2, z: -0.6 } as const;
/** Where the GuildBoard stands (its feet), for scenes and cameras. */
export const TAVERN_BOARD_POS: Vec3 = [0, 0, -1.6];

export const TavernGuildHall: React.FC = () => {
  const frame = useCurrentFrame();
  const planks = useSurface("tavern-floor", () => makeWood({ planks: 6, base: "#6b4729", baseAlt: "#7a5230", seam: "#2a180c", seed: 221 }), [6, 1]);
  const beams = useSurface("tavern-beam", () => makeWood({ planks: 3, base: "#3f2715", baseAlt: "#4b2f1a", seam: "#1a0f07", seed: 222 }), [1, 3]);
  const stone = useSurface("tavern-hearth", () => makeMasonry({ rows: 6, cols: 4, base: "#6b6560", baseAlt: "#7a736c", mortar: "#2a2622", seed: 223 }), [1, 1]);
  const flag = useSurface("tavern-plaster", () => makeFlagstone({ cells: 3, base: "#d8c7a4", baseAlt: "#e0d0ad", grout: "#b9a77f", seed: 224 }), [4, 2]);
  const { x0, x1, ceilingY, z } = TAVERN;
  const w = x1 - x0;
  const fire = 0.8 + 0.2 * Math.sin(frame * 0.4) + 0.1 * Math.cos(frame * 1.1);
  const bottles = Array.from({ length: 12 }, (_, i) => ({
    x: x0 + 1.0 + i * 0.32,
    h: 0.35 + random(`btl-h-${i}`) * 0.2,
    c: ["#3d7a3a", "#7a3a2a", "#2a4f7a", "#8a6a2a"][i % 4],
  }));
  return (
    <group>
      {/* Back wall: plaster panels between dark timber */}
      <mesh position={[0, ceilingY / 2, z - 1.95]} receiveShadow>
        <boxGeometry args={[w, ceilingY, 0.3]} />
        <meshStandardMaterial map={flag.map} normalMap={flag.normalMap} color="#f2e2c0" roughness={0.95} />
      </mesh>
      {[-8, -4.8, -1.6, 1.6, 4.8, 8].map((x) => (
        <mesh key={`post-${x}`} position={[x, ceilingY / 2, z - 1.75]} castShadow>
          <boxGeometry args={[0.32, ceilingY, 0.2]} />
          <meshStandardMaterial map={beams.map} normalMap={beams.normalMap} color="#9a7a5a" roughness={0.85} />
        </mesh>
      ))}
      {[1.2, ceilingY - 0.4].map((y) => (
        <mesh key={`rail-${y}`} position={[0, y, z - 1.72]}>
          <boxGeometry args={[w, 0.24, 0.2]} />
          <meshStandardMaterial map={beams.map} color="#8a6a4a" roughness={0.85} />
        </mesh>
      ))}
      {/* Ceiling beams */}
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={`cb-${x}`} position={[x, ceilingY, z]}>
          <boxGeometry args={[0.36, 0.4, 3.8]} />
          <meshStandardMaterial map={beams.map} color="#7a5a3a" roughness={0.9} />
        </mesh>
      ))}
      {/* Floor */}
      <mesh position={[0, -0.1, z]} receiveShadow>
        <boxGeometry args={[w + 6, 0.2, 4.2]} />
        <meshStandardMaterial map={planks.map} normalMap={planks.normalMap} color="#c49b70" roughness={0.85} />
      </mesh>

      {/* Bar on the left: counter, shelf of bottles, kegs */}
      <mesh position={[x0 + 2.6, 0.6, z - 0.9]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 1.2, 0.9]} />
        <meshStandardMaterial map={beams.map} color="#8a5a34" roughness={0.8} />
      </mesh>
      <mesh position={[x0 + 2.6, 1.24, z - 0.9]}>
        <boxGeometry args={[4.4, 0.1, 1.0]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.6} />
      </mesh>
      <mesh position={[x0 + 2.6, 2.6, z - 1.7]}>
        <boxGeometry args={[4.2, 0.08, 0.3]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.7} />
      </mesh>
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.x, 2.64 + b.h / 2, z - 1.68]}>
          <cylinderGeometry args={[0.07, 0.08, b.h, 8]} />
          <meshStandardMaterial color={b.c} roughness={0.25} metalness={0.1} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={`keg-${i}`} position={[x0 + 0.7 + i * 1.0, 0.45, z - 1.3]} rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.9, 16]} />
          <meshStandardMaterial map={planks.map} color="#9a6a3e" roughness={0.8} />
        </mesh>
      ))}
      {[1.6, 2.0].map((y) => (
        <GlowSprite key={y} position={[x0 + 2.6, y, z - 0.5]} color="#ffb060" size={0.5} opacity={0.2} />
      ))}

      {/* Fireplace on the right */}
      <group position={[x1 - 2.4, 0, z - 1.6]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <boxGeometry args={[2.6, 3.2, 0.7]} />
          <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} color="#a69c92" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.75, 0.36]}>
          <boxGeometry args={[1.4, 1.2, 0.05]} />
          <meshBasicMaterial color="#1a0d06" />
        </mesh>
        <mesh position={[0, 0.5, 0.4]} scale={[1, fire, 1]}>
          <coneGeometry args={[0.4, 0.8, 10]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff6a1a" emissiveIntensity={2.6} />
        </mesh>
        <GlowSprite position={[0, 0.7, 0.6]} color="#ff8a2a" size={2.6 * fire} opacity={0.6} />
        <pointLight position={[0, 1.0, 1.2]} color="#ff8a3a" intensity={6 * fire} distance={10} decay={2} />
      </group>

      {/* Tables with mugs */}
      {[-3.6, 4.4].map((x) => (
        <group key={`table-${x}`} position={[x, 0, z + 0.6]}>
          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.1, 18]} />
            <meshStandardMaterial map={planks.map} color="#a87a4e" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.1, 0.18, 0.84, 8]} />
            <meshStandardMaterial color="#4a2f1a" roughness={0.8} />
          </mesh>
          <mesh position={[0.25, 1.02, 0.1]}>
            <cylinderGeometry args={[0.1, 0.1, 0.24, 10]} />
            <meshStandardMaterial color="#c9a36a" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Hanging lanterns */}
      {[-6, -2, 2, 6].map((x) => (
        <group key={`lamp-${x}`} position={[x, ceilingY - 1.3, z - 0.3]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1.2, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.3, 0.42, 0.3]} />
            <meshStandardMaterial color="#ffd68a" emissive="#ff9a3a" emissiveIntensity={1.6} transparent opacity={0.85} />
          </mesh>
          <GlowSprite color="#ffb060" size={1.6} opacity={0.5} />
          <pointLight position={[0, -0.2, 0.6]} color="#ffb26b" intensity={2.2} distance={8} decay={2} />
        </group>
      ))}
      <hemisphereLight args={["#ffe2b8", "#3a2414", 0.5]} />
      <DustMotes count={70} />
    </group>
  );
};
