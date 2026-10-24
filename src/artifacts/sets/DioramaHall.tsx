import type React from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMasonry, makeWood } from "../../engine/textures";
import { DustMotes, GlowSprite } from "../dungeon/Fx";

/**
 * Generic cut-away dungeon hall in the series diorama style (Ep2's hallway
 * without the boulder-specific ledge): back wall with brick facing, pillars,
 * a bannered arch, flickering torches, ceiling beams, a tiled floor on a
 * foundation band, and a daylight exit at one end.
 *
 * Start every new episode set from this and add the trap props on top.
 * Leave `floorGaps` where pits, trapdoors or half-pipes replace the floor.
 */
export interface DioramaHallProps {
  left?: number;
  right?: number;
  ceilingY?: number;
  /** Which end opens onto daylight (newcomers enter/exit there). */
  exit?: "left" | "right" | "none";
  pillarXs?: number[];
  torchXs?: number[];
  /** Centre of the bannered arch on the back wall (null for none). */
  archX?: number | null;
  bannerColor?: string;
  /** Floor x ranges left open for pits, trapdoors, ramps. */
  floorGaps?: Array<[number, number]>;
  /** Hide ceiling (e.g. when a ceiling trap brings its own housing). */
  ceiling?: boolean;
  z?: number;
  depth?: number;
}

const BRICK_COLORS = ["#d7dae3", "#e2e5ec", "#cdd1db", "#e9ecf2", "#d2d6df", "#dde0e8"];

export const DioramaHall: React.FC<DioramaHallProps> = ({
  left = -10.6,
  right = 10.6,
  ceilingY = 5.9,
  exit = "left",
  pillarXs = [-8, -4, 4, 8],
  torchXs = [-6.1, -2.2, 2.2, 6.1],
  archX = 0,
  bannerColor = "#7c2024",
  floorGaps = [],
  ceiling = true,
  z = -0.6,
  depth = 3.4,
}) => {
  const frame = useCurrentFrame();
  const flicker = Math.sin(frame * 0.3) * 0.12 + Math.cos(frame * 0.77) * 0.08;
  const flickerTwo = Math.sin(frame * 0.26 + 1.7) * 0.1;
  const width = right - left;
  const mid = (left + right) / 2;

  const wallStone = useSurface(
    "dh-wall",
    () => makeMasonry({ rows: 7, cols: 4, base: "#3d414e", baseAlt: "#4a4e5c", mortar: "#1b1d24", seed: 21 }),
    [7, 2]
  );
  const brickStone = useSurface(
    "dh-brick",
    () => makeMasonry({ rows: 5, cols: 3, base: "#4c505f", baseAlt: "#5a5e6d", mortar: "#1e2029", seed: 22 }),
    [1, 1]
  );
  const pillarStone = useSurface(
    "dh-pillar",
    () => makeMasonry({ rows: 9, cols: 3, base: "#565a6b", baseAlt: "#646879", mortar: "#20222b", seed: 23 }),
    [1, 3]
  );
  const footing = useSurface(
    "dh-footing",
    () => makeMasonry({ rows: 3, cols: 8, base: "#3a3d49", baseAlt: "#444755", mortar: "#16171d", seed: 28 }),
    [6, 1]
  );
  const floorStone = useSurface(
    "dh-floor",
    () => makeFlagstone({ cells: 4, base: "#4b4e5a", baseAlt: "#565965", grout: "#1c1e25", seed: 24 }),
    [1, 1]
  );
  const beamWood = useSurface(
    "dh-beam",
    () => makeWood({ planks: 3, base: "#4a3320", baseAlt: "#573d26", seam: "#1e140c", seed: 26 }),
    [3, 1]
  );

  const inGap = (x: number, pad = 0) => floorGaps.some(([a, b]) => x > a - pad && x < b + pad);

  const bricks: Array<{ x: number; y: number; color: string; key: string }> = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < Math.ceil(width / 2.5) + 1; col++) {
      const x = left + 0.4 + col * 2.5 + (row % 2 === 0 ? 0 : 1.25);
      if (x > right - 1) continue;
      bricks.push({ x, y: 0.75 + row * 1.08, color: BRICK_COLORS[(row * 9 + col) % BRICK_COLORS.length], key: `b-${row}-${col}` });
    }
  }

  const tileXs: number[] = [];
  for (let x = left + 0.55; x < right - 0.5; x += 1.1) {
    if (!floorGaps.some(([a, b]) => x + 0.55 > a + 0.01 && x - 0.55 < b - 0.01)) tileXs.push(x);
  }

  const floorCracks = Array.from({ length: Math.round(width * 1.5) }, (_, i) => ({
    x: left + random(`dh-crack-x-${i}`) * width,
    z: z - 1.4 + random(`dh-crack-z-${i}`) * 2.9,
    angle: random(`dh-crack-a-${i}`) * Math.PI,
    length: 0.3 + random(`dh-crack-l-${i}`) * 0.5,
    key: `dh-crack-${i}`,
  })).filter((c) => !inGap(c.x, 0.3) && c.x > left + 0.3 && c.x < right - 0.3);
  // Pebbles stay against the back wall so actors never clip them.
  const debris = Array.from({ length: Math.round(width) }, (_, i) => ({
    x: left + random(`dh-deb-x-${i}`) * width,
    z: z - 1.55 + random(`dh-deb-z-${i}`) * 0.45,
    size: 0.06 + random(`dh-deb-s-${i}`) * 0.14,
    rotation: random(`dh-deb-r-${i}`) * Math.PI,
    color: random(`dh-deb-c-${i}`) > 0.6 ? "#615d62" : "#494950",
    key: `dh-deb-${i}`,
  })).filter((d) => !inGap(d.x, 0.3) && d.x > left + 0.3 && d.x < right - 0.3);

  const stoneMat = (surface: typeof brickStone, color: string, roughness = 0.86) => (
    <meshStandardMaterial
      map={surface.map}
      normalMap={surface.normalMap}
      roughnessMap={surface.roughnessMap}
      normalScale={new THREE.Vector2(0.8, 0.8)}
      color={color}
      roughness={roughness}
    />
  );

  const exitX = exit === "left" ? left : right;
  const out = exit === "left" ? -1 : 1;

  return (
    <group>
      {/* Back wall + brick facing */}
      <mesh position={[mid, 3.1, z - 1.95]} receiveShadow>
        <boxGeometry args={[width, 6.4, 0.5]} />
        {stoneMat(wallStone, "#c8ccd8", 0.95)}
      </mesh>
      {bricks.map((b) => (
        <mesh key={b.key} position={[b.x, b.y, z - 1.66]} receiveShadow>
          <boxGeometry args={[2.34, 0.94, 0.08]} />
          {stoneMat(brickStone, b.color, 0.9)}
        </mesh>
      ))}

      {pillarXs.map((x) => (
        <group key={`pillar-${x}`} position={[x, 3, z - 1.42]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.82, 6.1, 0.52]} />
            {stoneMat(pillarStone, "#9da3b0")}
          </mesh>
          {[3.02, -3.02].map((y) => (
            <mesh key={y} position={[0, y, 0.05]} castShadow>
              <boxGeometry args={[1.16, 0.34, 0.66]} />
              {stoneMat(pillarStone, "#ccd2dd", 0.8)}
            </mesh>
          ))}
        </group>
      ))}

      {/* Bannered arch */}
      {archX !== null ? (
        <group position={[archX, 0, 0]}>
          {[-2.7, 2.7].map((x) => (
            <group key={`arch-col-${x}`} position={[x, 1.25, z - 1.28]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.62, 2.5, 0.58]} />
                {stoneMat(pillarStone, "#a3a8b6")}
              </mesh>
              <mesh position={[0, 1.3, 0]} castShadow>
                <boxGeometry args={[0.84, 0.2, 0.68]} />
                {stoneMat(pillarStone, "#b4b9c6", 0.8)}
              </mesh>
            </group>
          ))}
          <mesh position={[0, 2.5, z - 1.3]} castShadow>
            <torusGeometry args={[2.7, 0.3, 10, 32, Math.PI]} />
            {stoneMat(brickStone, "#a7acba", 0.85)}
          </mesh>
          <mesh position={[0, 5.2, z - 1.06]}>
            <boxGeometry args={[0.42, 0.5, 0.2]} />
            <meshStandardMaterial color="#c99a3e" metalness={0.6} roughness={0.38} />
          </mesh>
          <mesh position={[0, 3.7, z - 1.12]}>
            <boxGeometry args={[1.9, 2.2, 0.045]} />
            <meshStandardMaterial color={bannerColor} roughness={0.88} />
          </mesh>
          {[4.82, 2.58].map((y) => (
            <mesh key={`banner-bar-${y}`} position={[0, y, z - 1.08]}>
              <boxGeometry args={[2.02, 0.1, 0.06]} />
              <meshStandardMaterial color="#d2a545" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
          <mesh position={[0, 3.72, z - 1.07]}>
            <circleGeometry args={[0.42, 24]} />
            <meshStandardMaterial color="#d2a545" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[0, 3.72, z - 1.06]}>
            <circleGeometry args={[0.3, 24]} />
            <meshStandardMaterial color="#5a1418" roughness={0.8} />
          </mesh>
        </group>
      ) : null}

      {/* Torches */}
      {torchXs.map((x) => (
        <group key={`torch-${x}`} position={[x, 3.35, z - 1.12]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.075, 0.55, 7]} />
            <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.08, 0.04]} rotation={[0.22, 0, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 0.48, 6]} />
            <meshStandardMaterial color="#5d3a22" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.36, 0.1]} scale={[1, 1.18 + flicker + flickerTwo, 1]}>
            <coneGeometry args={[0.14, 0.38, 9]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ff7a1a" emissiveIntensity={2.6 + flicker} roughness={0.3} />
          </mesh>
          <pointLight position={[0, 0.4, 0.45]} color="#ff9a45" intensity={3.1 + flicker * 1.6} distance={10} decay={2} />
          <GlowSprite position={[0, 0.36, 0.1]} color="#ff9933" size={1.6 + flicker} opacity={0.65} />
        </group>
      ))}

      {/* Ceiling + beams */}
      {ceiling ? (
        <>
          <mesh position={[mid, ceilingY + 0.25, z - 0.3]} castShadow receiveShadow>
            <boxGeometry args={[width, 0.5, depth]} />
            <meshStandardMaterial color="#30323c" roughness={0.9} />
          </mesh>
          {pillarXs.concat(archX !== null ? [archX] : []).map((x) => (
            <mesh key={`beam-${x}`} position={[x, ceilingY - 0.05, z - 0.1]}>
              <boxGeometry args={[0.33, 0.36, depth - 0.1]} />
              <meshStandardMaterial map={beamWood.map} normalMap={beamWood.normalMap} color="#b8a48e" roughness={0.9} />
            </mesh>
          ))}
        </>
      ) : null}

      {/* Floor tiles on a slab, foundation band with brass trim */}
      {tileXs.map((x, i) => (
        <mesh key={`tile-${i}`} position={[x, 0.012, z]} receiveShadow>
          <boxGeometry args={[1.08, 0.035, depth - 0.2]} />
          <meshStandardMaterial
            map={floorStone.map}
            normalMap={floorStone.normalMap}
            roughnessMap={floorStone.roughnessMap}
            normalScale={new THREE.Vector2(0.6, 0.6)}
            color={i % 2 === 0 ? "#c9cedb" : "#bcc1cc"}
            roughness={0.82}
          />
        </mesh>
      ))}
      {[[left - 3.4, right + 3.4] as [number, number]]
        .reduce<Array<[number, number]>>((spans, [a, b]) => {
          // Split the slab and footing around the gaps.
          let cursor = a;
          const sorted = floorGaps.slice().sort((p, q) => p[0] - q[0]);
          for (const [ga, gb] of sorted) {
            if (ga > cursor) spans.push([cursor, ga]);
            cursor = Math.max(cursor, gb);
          }
          if (cursor < b) spans.push([cursor, b]);
          return spans;
        }, [])
        .map(([a, b]) => (
          <group key={`slab-${a}`}>
            <mesh position={[(a + b) / 2, -0.12, z]} receiveShadow>
              <boxGeometry args={[b - a, 0.24, depth]} />
              <meshStandardMaterial color="#4d505d" roughness={0.88} />
            </mesh>
            <mesh position={[(a + b) / 2, -0.62, z]} receiveShadow>
              <boxGeometry args={[b - a, 0.8, depth]} />
              {stoneMat(footing, "#9ea3b0", 0.92)}
            </mesh>
          </group>
        ))}
      <mesh position={[mid, -1.06, z + 0.05]}>
        <boxGeometry args={[width + 6.8, 0.1, depth + 0.2]} />
        <meshStandardMaterial color="#b98d3c" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Exit: open archway onto daylight */}
      {exit !== "none" ? (
        <>
          <mesh position={[exitX + out * 2.0, 2.9, z - 2.0]}>
            <planeGeometry args={[4.2, 6.2]} />
            <meshBasicMaterial color="#cfe6ff" toneMapped={false} />
          </mesh>
          <mesh position={[exitX + out * 2.0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.2, depth]} />
            <meshStandardMaterial color="#9aa8b8" roughness={0.9} />
          </mesh>
          {[z - 1.55, z + 1.55].map((jz) => (
            <mesh key={`jamb-${jz}`} position={[exitX + out * 0.25, 2.95, jz]} castShadow>
              <boxGeometry args={[0.55, 5.9, 0.35]} />
              {stoneMat(pillarStone, "#a3a8b6")}
            </mesh>
          ))}
          <mesh position={[exitX + out * 0.25, ceilingY - 0.3, z]}>
            <boxGeometry args={[0.6, 0.6, depth + 0.1]} />
            {stoneMat(pillarStone, "#b4b9c6", 0.8)}
          </mesh>
          <GlowSprite position={[exitX + out * 1.2, 2.4, z]} color="#bfe0ff" size={5.5} opacity={0.35} />
          <pointLight position={[exitX + out * 0.6, 3.0, z + 0.8]} color="#cfe6ff" intensity={4} distance={9} decay={2} />
        </>
      ) : null}

      {floorCracks.map((c) => (
        <mesh key={c.key} position={[c.x, 0.032, c.z]} rotation={[-Math.PI / 2, 0, c.angle]}>
          <planeGeometry args={[c.length, 0.04]} />
          <meshBasicMaterial color="#1f1e24" />
        </mesh>
      ))}
      {debris.map((d) => (
        <mesh key={d.key} position={[d.x, d.size * 0.5 + 0.03, d.z]} rotation={[0, d.rotation, 0]} castShadow>
          <boxGeometry args={[d.size, d.size, d.size]} />
          <meshStandardMaterial color={d.color} roughness={0.9} />
        </mesh>
      ))}

      <pointLight position={[mid, 2.4, z + 2.8]} color="#ffb26b" intensity={1.6} distance={12} decay={2} />
      <DustMotes count={130} />
    </group>
  );
};
