import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMasonry, makeWood } from "../../engine/textures";
import { DustMotes, GlowSprite } from "../dungeon/Fx";

/**
 * Cut-away boulder hallway in the Ep1 diorama style: light brick back wall,
 * pillars, a central bannered arch, torches, and a release ledge on the right
 * fed by a ceiling chute. The left end opens onto daylight (the exit).
 */
export interface BoulderHallwayProps {
  edgeX: number;
  ledgeY: number;
  /** Floor x range drawn by the half-pipe slats (kept clear here). */
  pipeRange: [number, number];
  /** x of the electromagnet niche cut into the foundation. */
  magnetX: number;
  ceilingY?: number;
}

const HALL_Z = -0.6;
const HALL_DEPTH = 3.4;
const LEFT = -10.6;
const RIGHT = 12.6;
const BRICK_COLORS = ["#d7dae3", "#e2e5ec", "#cdd1db", "#e9ecf2", "#d2d6df", "#dde0e8"];
const TORCH_XS = [-7.1, -3.5, 3.5, 6.1];
const CHUTE: [number, number] = [8.9, 11.95];

export const BoulderHallway: React.FC<BoulderHallwayProps> = ({
  edgeX,
  ledgeY,
  pipeRange,
  magnetX,
  ceilingY = 5.9,
}) => {
  const frame = useCurrentFrame();
  const flicker = Math.sin(frame * 0.3) * 0.12 + Math.cos(frame * 0.77) * 0.08;
  const flickerTwo = Math.sin(frame * 0.26 + 1.7) * 0.1;
  const footX = edgeX - ledgeY;

  const wallStone = useSurface(
    "bh-wall",
    () => makeMasonry({ rows: 7, cols: 4, base: "#3d414e", baseAlt: "#4a4e5c", mortar: "#1b1d24", seed: 21 }),
    [7, 2]
  );
  const brickStone = useSurface(
    "bh-brick",
    () => makeMasonry({ rows: 5, cols: 3, base: "#4c505f", baseAlt: "#5a5e6d", mortar: "#1e2029", seed: 22 }),
    [1, 1]
  );
  const pillarStone = useSurface(
    "bh-pillar",
    () => makeMasonry({ rows: 9, cols: 3, base: "#565a6b", baseAlt: "#646879", mortar: "#20222b", seed: 23 }),
    [1, 3]
  );
  const blockStone = useSurface(
    "bh-block",
    () => makeMasonry({ rows: 6, cols: 3, base: "#575b6b", baseAlt: "#666a7a", mortar: "#1d1f27", seed: 27 }),
    [0.42, 0.42]
  );
  const footing = useSurface(
    "bh-footing",
    () => makeMasonry({ rows: 3, cols: 8, base: "#3a3d49", baseAlt: "#444755", mortar: "#16171d", seed: 28 }),
    [6, 1]
  );
  const floorStone = useSurface(
    "bh-floor",
    () => makeFlagstone({ cells: 4, base: "#4b4e5a", baseAlt: "#565965", grout: "#1c1e25", seed: 24 }),
    [1, 1]
  );
  const slopeStone = useSurface(
    "bh-slope",
    () => makeFlagstone({ cells: 4, base: "#4b4e5a", baseAlt: "#565965", grout: "#1c1e25", seed: 25 }),
    [3, 3]
  );
  const beamWood = useSurface(
    "bh-beam",
    () => makeWood({ planks: 3, base: "#4a3320", baseAlt: "#573d26", seam: "#1e140c", seed: 26 }),
    [3, 1]
  );

  const ledgeShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(footX, 0);
    shape.lineTo(edgeX, ledgeY);
    shape.lineTo(RIGHT, ledgeY);
    shape.lineTo(RIGHT, 0);
    shape.closePath();
    return shape;
  }, [edgeX, ledgeY, footX]);

  const bricks = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 10; col++) {
      const x = LEFT + 0.4 + col * 2.5 + (row % 2 === 0 ? 0 : 1.25);
      if (x > RIGHT - 1) continue;
      bricks.push({ x, y: 0.75 + row * 1.08, color: BRICK_COLORS[(row * 9 + col) % BRICK_COLORS.length], key: `b-${row}-${col}` });
    }
  }

  const onFloor = (x: number) =>
    x > LEFT + 0.3 && x < footX - 0.3 && !(x > pipeRange[0] - 0.2 && x < pipeRange[1] + 0.2);
  const floorCracks = Array.from({ length: 34 }, (_, i) => ({
    x: LEFT + random(`bh-crack-x-${i}`) * (footX - LEFT),
    z: -2.0 + random(`bh-crack-z-${i}`) * 2.9,
    angle: random(`bh-crack-a-${i}`) * Math.PI,
    length: 0.3 + random(`bh-crack-l-${i}`) * 0.5,
    key: `bh-crack-${i}`,
  })).filter((c) => onFloor(c.x));
  // Pebbles stay against the back wall so rolling boulders never clip them.
  const debris = Array.from({ length: 20 }, (_, i) => ({
    x: LEFT + random(`bh-deb-x-${i}`) * (footX - LEFT),
    z: -2.15 + random(`bh-deb-z-${i}`) * 0.45,
    size: 0.06 + random(`bh-deb-s-${i}`) * 0.14,
    rotation: random(`bh-deb-r-${i}`) * Math.PI,
    color: random(`bh-deb-c-${i}`) > 0.6 ? "#615d62" : "#494950",
    key: `bh-deb-${i}`,
  })).filter((d) => onFloor(d.x));

  const tileXs: number[] = [];
  for (let x = LEFT + 0.55; x < footX; x += 1.1) {
    if (x + 0.55 <= pipeRange[0] + 0.01 || x - 0.55 >= pipeRange[1] - 0.01) tileXs.push(x);
  }

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

  return (
    <group>
      {/* Back wall + brick facing */}
      <mesh position={[(LEFT + RIGHT) / 2, 3.1, -2.55]} receiveShadow>
        <boxGeometry args={[RIGHT - LEFT, 6.4, 0.5]} />
        {stoneMat(wallStone, "#c8ccd8", 0.95)}
      </mesh>
      {bricks.map((b) => (
        <mesh key={b.key} position={[b.x, b.y, -2.26]} receiveShadow>
          <boxGeometry args={[2.34, 0.94, 0.08]} />
          {stoneMat(brickStone, b.color, 0.9)}
        </mesh>
      ))}

      {[-8, -4, 4].map((x) => (
        <group key={`pillar-${x}`} position={[x, 3, -2.02]}>
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

      {/* Central arch with banner */}
      {[-2.7, 2.7].map((x) => (
        <group key={`arch-col-${x}`} position={[x, 1.25, -1.88]}>
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
      <mesh position={[0, 2.5, -1.9]} castShadow>
        <torusGeometry args={[2.7, 0.3, 10, 32, Math.PI]} />
        {stoneMat(brickStone, "#a7acba", 0.85)}
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((i + 1) / 10) * Math.PI;
        return (
          <mesh key={`vous-${i}`} position={[Math.cos(a) * 2.7, 2.5 + Math.sin(a) * 2.7, -1.62]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.62, 0.035, 0.04]} />
            <meshStandardMaterial color="#2a2c34" roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position={[0, 5.2, -1.66]}>
        <boxGeometry args={[0.42, 0.5, 0.2]} />
        <meshStandardMaterial color="#c99a3e" metalness={0.6} roughness={0.38} />
      </mesh>
      <mesh position={[0, 3.7, -1.72]}>
        <boxGeometry args={[1.9, 2.2, 0.045]} />
        <meshStandardMaterial color="#7c2024" roughness={0.88} />
      </mesh>
      {[4.82, 2.58].map((y) => (
        <mesh key={`banner-bar-${y}`} position={[0, y, -1.68]}>
          <boxGeometry args={[2.02, 0.1, 0.06]} />
          <meshStandardMaterial color="#d2a545" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* Boulder emblem on the banner: circle with a motion streak */}
      <mesh position={[0.15, 3.72, -1.67]}>
        <circleGeometry args={[0.42, 24]} />
        <meshStandardMaterial color="#d2a545" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0.15, 3.72, -1.66]}>
        <circleGeometry args={[0.32, 24]} />
        <meshStandardMaterial color="#5a1418" roughness={0.8} />
      </mesh>
      {[-0.1, 0.05, 0.2].map((dy, i) => (
        <mesh key={`streak-${i}`} position={[-0.45 + i * 0.05, 3.72 + dy - 0.05, -1.665]}>
          <boxGeometry args={[0.38 - i * 0.08, 0.05, 0.02]} />
          <meshStandardMaterial color="#d2a545" metalness={0.55} roughness={0.4} />
        </mesh>
      ))}

      {/* Torches */}
      {TORCH_XS.map((x) => (
        <group key={`torch-${x}`} position={[x, 3.35, -1.72]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.075, 0.55, 7]} />
            <meshStandardMaterial color="#1a1c22" metalness={0.8} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.48, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#24262e" metalness={0.85} roughness={0.35} />
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
        </group>
      ))}
      {TORCH_XS.map((x) => (
        <GlowSprite key={`torch-glow-${x}`} position={[x, 3.71, -1.62]} color="#ff9933" size={1.6 + flicker} opacity={0.65} />
      ))}

      {/* Ceiling, split by the boulder chute above the ledge */}
      <mesh position={[(LEFT + CHUTE[0]) / 2, ceilingY + 0.25, -0.9]} castShadow receiveShadow>
        <boxGeometry args={[CHUTE[0] - LEFT, 0.5, 3.4]} />
        <meshStandardMaterial color="#30323c" roughness={0.9} />
      </mesh>
      <mesh position={[(CHUTE[1] + RIGHT) / 2, ceilingY + 0.25, -0.9]} castShadow receiveShadow>
        <boxGeometry args={[RIGHT - CHUTE[1], 0.5, 3.4]} />
        <meshStandardMaterial color="#30323c" roughness={0.9} />
      </mesh>
      {[-8, -4, 0, 4].map((x) => (
        <mesh key={`beam-${x}`} position={[x, ceilingY - 0.05, -0.7]}>
          <boxGeometry args={[0.33, 0.36, 3.3]} />
          <meshStandardMaterial map={beamWood.map} normalMap={beamWood.normalMap} color="#b8a48e" roughness={0.9} />
        </mesh>
      ))}
      {/* Chute walls + iron lip */}
      {CHUTE.map((x) => (
        <mesh key={`chute-${x}`} position={[x, ceilingY + 1.4, -0.6]}>
          <boxGeometry args={[0.18, 2.8, 3.4]} />
          <meshStandardMaterial color="#25272f" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[(CHUTE[0] + CHUTE[1]) / 2, ceilingY + 1.4, -2.3]}>
        <boxGeometry args={[CHUTE[1] - CHUTE[0], 2.8, 0.1]} />
        <meshStandardMaterial color="#15161b" roughness={1} />
      </mesh>
      {CHUTE.map((x) => (
        <mesh key={`chute-lip-${x}`} position={[x, ceilingY + 0.02, -0.6]}>
          <boxGeometry args={[0.3, 0.12, 3.5]} />
          <meshStandardMaterial color="#3a3f4a" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}

      {/* Release ledge + 45° ramp */}
      <mesh position={[0, 0, HALL_Z - HALL_DEPTH / 2]} castShadow receiveShadow>
        <extrudeGeometry args={[ledgeShape, { depth: HALL_DEPTH, bevelEnabled: false }]} />
        {stoneMat(blockStone, "#a9aebb")}
      </mesh>
      <mesh
        position={[(footX + edgeX) / 2 - 0.022, ledgeY / 2 + 0.022, HALL_Z]}
        rotation={[0, 0, Math.PI / 4]}
        receiveShadow
      >
        <boxGeometry args={[ledgeY * Math.SQRT2, 0.06, HALL_DEPTH - 0.1]} />
        <meshStandardMaterial
          map={slopeStone.map}
          normalMap={slopeStone.normalMap}
          roughnessMap={slopeStone.roughnessMap}
          color="#c4c9d5"
          roughness={0.82}
        />
      </mesh>
      <mesh position={[(edgeX + RIGHT) / 2, ledgeY + 0.03, HALL_Z]} receiveShadow>
        <boxGeometry args={[RIGHT - edgeX, 0.06, HALL_DEPTH - 0.1]} />
        <meshStandardMaterial map={floorStone.map} normalMap={floorStone.normalMap} color="#c9cedb" roughness={0.82} />
      </mesh>
      {/* Brass edge trim on the lip and the foot */}
      <mesh position={[edgeX, ledgeY + 0.02, HALL_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, HALL_DEPTH, 10]} />
        <meshStandardMaterial color="#b98d3c" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Dark alcove recess behind the waiting boulder */}
      <mesh position={[10.4, ledgeY + 1.65, -2.27]}>
        <boxGeometry args={[3.1, 3.3, 0.06]} />
        <meshStandardMaterial color="#1e2027" roughness={1} />
      </mesh>
      <mesh position={[10.4, ledgeY + 1.75, -2.2]}>
        <torusGeometry args={[1.55, 0.22, 8, 24, Math.PI]} />
        {stoneMat(pillarStone, "#a7acba")}
      </mesh>
      {[8.85, 11.95].map((x) => (
        <mesh key={`alcove-post-${x}`} position={[x, ledgeY + 0.88, -2.2]}>
          <boxGeometry args={[0.44, 1.76, 0.44]} />
          {stoneMat(pillarStone, "#a3a8b6")}
        </mesh>
      ))}
      <mesh position={[10.4, ledgeY + 3.55, -2.12]}>
        <boxGeometry args={[0.5, 0.42, 0.16]} />
        <meshStandardMaterial color="#c99a3e" metalness={0.6} roughness={0.38} />
      </mesh>

      {/* Floor tiles (pipe span is drawn by the half-pipe slats) */}
      {tileXs.map((x, i) => (
        <mesh key={`tile-${i}`} position={[x, 0.012, HALL_Z]} receiveShadow>
          <boxGeometry args={[1.08, 0.035, 3.2]} />
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
      <mesh position={[(LEFT - 3.4 + footX) / 2, -0.12, HALL_Z]} receiveShadow>
        <boxGeometry args={[footX - LEFT + 3.4, 0.24, HALL_DEPTH]} />
        <meshStandardMaterial color="#4d505d" roughness={0.88} />
      </mesh>

      {/* Foundation band with the electromagnet niche */}
      {[
        [LEFT - 3.4, magnetX - 0.75],
        [magnetX + 0.75, RIGHT],
      ].map(([a, b]) => (
        <mesh key={`footing-${a}`} position={[(a + b) / 2, -0.62, HALL_Z]} receiveShadow>
          <boxGeometry args={[b - a, 0.8, HALL_DEPTH]} />
          {stoneMat(footing, "#9ea3b0", 0.92)}
        </mesh>
      ))}
      <mesh position={[magnetX, -0.62, HALL_Z - 0.4]}>
        <boxGeometry args={[1.5, 0.8, HALL_DEPTH - 0.8]} />
        <meshStandardMaterial color="#17181e" roughness={1} />
      </mesh>
      <mesh position={[(LEFT - 3.4 + RIGHT) / 2, -1.06, HALL_Z + 0.05]}>
        <boxGeometry args={[RIGHT - LEFT + 3.4, 0.1, HALL_DEPTH + 0.2]} />
        <meshStandardMaterial color="#b98d3c" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Exit: open archway onto daylight at the left end */}
      <mesh position={[LEFT - 2.0, 2.9, -2.6]}>
        <planeGeometry args={[4.2, 6.2]} />
        <meshBasicMaterial color="#cfe6ff" toneMapped={false} />
      </mesh>
      <mesh position={[LEFT - 2.0, 0.005, HALL_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, HALL_DEPTH]} />
        <meshStandardMaterial color="#9aa8b8" roughness={0.9} />
      </mesh>
      {[-2.15, 0.95].map((z) => (
        <mesh key={`jamb-${z}`} position={[LEFT - 0.25, 2.95, z]} castShadow>
          <boxGeometry args={[0.55, 5.9, 0.35]} />
          {stoneMat(pillarStone, "#a3a8b6")}
        </mesh>
      ))}
      <mesh position={[LEFT - 0.25, ceilingY - 0.3, HALL_Z]}>
        <boxGeometry args={[0.6, 0.6, HALL_DEPTH + 0.1]} />
        {stoneMat(pillarStone, "#b4b9c6", 0.8)}
      </mesh>
      <GlowSprite position={[LEFT - 1.2, 2.4, -0.6]} color="#bfe0ff" size={5.5} opacity={0.35} />
      <pointLight position={[LEFT - 0.6, 3.0, 0.2]} color="#cfe6ff" intensity={4} distance={9} decay={2} />

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

      <pointLight position={[0, 2.4, 2.2]} color="#ffb26b" intensity={1.6} distance={12} decay={2} />
      <pointLight position={[8.6, 4.2, 1.4]} color="#ffb26b" intensity={1.8} distance={9} decay={2} />
      <DustMotes count={130} />
    </group>
  );
};
