import type React from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMasonry } from "../../engine/textures";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { DustMotes, GlowSprite } from "../dungeon/Fx";
import { Atmosphere, Backdrop, Drift, Rock, Shaft, ThreePoint } from "./common";
import { Tentacle } from "./Creatures";

/**
 * The four places of a fantasy-biology short, each lit for a moving camera
 * (not a side-on diorama): the dungeon vault where the mimic lives, the reef
 * and the swamp where its real-world anchors live, and the dark studio for
 * scale comparisons. The subject of every set stands at the origin.
 */

// ---------------------------------------------------------------------------
// Props shared by the sets
// ---------------------------------------------------------------------------
/** Loose gold coins scattered on the floor around `position`. */
export const Coins: React.FC<{ position?: Vec3; count?: number; spread?: number; seed?: string }> = ({ position = [0, 0, 0], count = 18, spread = 1.6, seed = "coins" }) => {
  const gold = vinyl("#f0c040", "gloss");
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const a = random(`${seed}-a-${i}`) * Math.PI * 2;
        const d = 0.25 + random(`${seed}-d-${i}`) * spread;
        const lean = random(`${seed}-l-${i}`) < 0.25 ? 0.5 + random(`${seed}-t-${i}`) : 0;
        return (
          <Part
            key={i}
            geo={G.cyl(0.075, 0.075, 0.018, 16)}
            mat={gold}
            position={[Math.cos(a) * d, 0.012 + lean * 0.03, Math.sin(a) * d * 0.7]}
            rotation={[lean, a, 0]}
            ink={INK_THIN}
          />
        );
      })}
    </group>
  );
};

/** A torch on a wall bracket with a flickering flame and its light. */
const Torch: React.FC<{ position: Vec3; seed: number; level?: number }> = ({ position, seed, level = 1 }) => {
  const frame = useCurrentFrame();
  const flicker = 1 + 0.12 * Math.sin(frame * 0.31 + seed) + 0.08 * Math.cos(frame * 0.77 + seed * 2.1);
  return (
    <group position={position}>
      <Part geo={G.cyl(0.05, 0.035, 0.6, 10)} mat={vinyl("#4a3324", "wood")} position={[0, 0, 0.18]} rotation={[0.35, 0, 0]} ink={INK_THIN} />
      <Part geo={G.cyl(0.08, 0.06, 0.12, 10)} mat={vinyl("#3b3f4b", "leather")} position={[0, 0.27, 0.28]} rotation={[0.35, 0, 0]} ink={INK_THIN} />
      <mesh geometry={G.cone(0.09, 0.3 * flicker, 10)} material={glow("#ffb347", 2.4)} position={[0, 0.46, 0.32]} />
      <mesh geometry={G.cone(0.05, 0.18 * flicker, 10)} material={glow("#fff0b0", 3)} position={[0, 0.42, 0.33]} />
      <GlowSprite position={[0, 0.5, 0.4]} color="#ff9a3d" size={2.4 * flicker} opacity={0.42 * level} />
      <pointLight position={[0, 0.5, 0.7]} color="#ffa552" intensity={16 * flicker * level} distance={11} decay={2} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// The vault
// ---------------------------------------------------------------------------
/**
 * A treasure vault deep in the dungeon. The chest stands at the origin under
 * an arched niche, lit by two torches and one cold shaft from a grate above.
 * `day` (0..1 through one day) swings the shaft for the time-lapse; `torches`
 * dims the fire (the year of waiting).
 */
export const VaultSet: React.FC<{ day?: number; torches?: number; motes?: boolean }> = ({ day = 0.3, torches = 1, motes = true }) => {
  const floor = useSurface("bio-vault-flags", () => makeFlagstone({ cells: 5, base: "#5c5a58", baseAlt: "#6b6966", grout: "#22201f", seed: 31 }), [5, 4]);
  const wall = useSurface("bio-vault-wall", () => makeMasonry({ rows: 7, cols: 4, base: "#3f4350", baseAlt: "#4c505e", mortar: "#191b22", seed: 33 }), [5, 2]);
  const pillar = useSurface("bio-vault-pillar", () => makeMasonry({ rows: 9, cols: 2, base: "#585c6d", baseAlt: "#666a7b", mortar: "#20222b", seed: 35 }), [1, 3]);
  const stone = vinyl("#5d6172", "cloth");
  const sun = Math.sin(day * Math.PI);
  const shaftTilt = 0.55 - day * 1.1;
  return (
    <>
      <Atmosphere color="#0c0e15" near={10} far={30} />
      <ThreePoint
        key_={{ position: [-4.5, 7, 6.5], color: "#ffe6c8", intensity: 2.5 * (0.5 + 0.5 * torches) }}
        rim={{ position: [5, 6, -5], color: "#6d9bff", intensity: 1.0 + 1.6 * sun }}
        fill={{ color: "#93a1c4", ground: "#3a2c22", intensity: 0.75 }}
        area={7}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial map={floor.map} normalMap={floor.normalMap} roughnessMap={floor.roughnessMap} color="#d6d9e4" roughness={0.82} />
      </mesh>
      {/* Back wall with the arched niche, then the side walls. */}
      <mesh position={[0, 5, -3.3]} receiveShadow>
        <planeGeometry args={[22, 10]} />
        <meshStandardMaterial map={wall.map} normalMap={wall.normalMap} roughnessMap={wall.roughnessMap} color="#c9cdd9" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 7.5, 5, 1]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[14, 10]} />
          <meshStandardMaterial map={wall.map} normalMap={wall.normalMap} roughnessMap={wall.roughnessMap} color="#a9adba" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.75, -3.24]}>
        <planeGeometry args={[3.0, 3.5]} />
        <meshStandardMaterial color="#2a2d3a" roughness={1} />
      </mesh>
      <mesh position={[0, 3.5, -3.24]} geometry={G.disc(1.5, 0, Math.PI)} material={flat("#171a24")} />
      {/* A faded banner in the niche and a soft pool of light behind the chest. */}
      <Part geo={G.box(0.95, 1.7, 0.04, 0.01)} mat={vinyl("#5e1c26", "cloth")} position={[0, 3.25, -3.18]} />
      <Part geo={G.box(0.3, 0.3, 0.05, 0.01)} mat={vinyl("#c9983c", "gloss")} position={[0, 3.45, -3.14]} rotation={[0, 0, Math.PI / 4]} ink={false} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.85, 0, -2.95]}>
          <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 3.5, 0.62]} />
            <meshStandardMaterial map={pillar.map} normalMap={pillar.normalMap} roughnessMap={pillar.roughnessMap} color="#d3d7e2" roughness={0.85} />
          </mesh>
          <Part geo={G.box(0.84, 0.22, 0.84, 0.05)} mat={stone} position={[0, 3.6, 0]} />
          <Part geo={G.box(0.8, 0.26, 0.8, 0.05)} mat={stone} position={[0, 0.13, 0]} />
          <Torch position={[0, 2.25, 0.34]} seed={s * 1.7} level={torches} />
        </group>
      ))}
      <Part geo={G.torus(1.85, 0.3, Math.PI)} mat={stone} position={[0, 3.7, -2.95]} />
      <Part geo={G.box(0.5, 0.62, 0.7, 0.06)} mat={vinyl("#74798c", "cloth")} position={[0, 5.55, -2.9]} />
      {/* Steps under the chest, coins, rubble and an old skull. */}
      <Part geo={G.box(3.0, 0.12, 1.9, 0.04)} mat={stone} position={[0, -0.04, -0.15]} />
      <Coins position={[0.2, 0.02, 0.9]} count={22} spread={1.9} />
      <Coins position={[-2.6, 0, -1.6]} count={9} spread={0.7} seed="coins-b" />
      <Rock position={[-4.2, 0, -2.2]} size={1.1} color="#4a4e5c" seed="v1" />
      <Rock position={[4.6, 0, -1.8]} size={0.8} color="#555a69" seed="v2" />
      <Rock position={[3.3, 0, -2.6]} size={0.5} color="#4a4e5c" seed="v3" />
      <group position={[-2.3, 0, 0.5]} rotation={[0, 0.7, 0]}>
        <Part geo={G.sphere(0.17)} mat={vinyl("#e6dcc4", "bone")} position={[0, 0.16, 0]} scale={[1, 0.95, 1.12]} />
        <Part geo={G.box(0.2, 0.09, 0.16, 0.03)} mat={vinyl("#e6dcc4", "bone")} position={[0, 0.05, 0.1]} ink={INK_THIN} />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={G.disc(0.045)} material={flat("#1a1412")} position={[s * 0.07, 0.17, 0.185]} />
        ))}
        <Part geo={G.capsule(0.03, 0.5)} mat={vinyl("#e6dcc4", "bone")} position={[0.4, 0.03, 0.1]} rotation={[0, 0.5, Math.PI / 2]} ink={INK_THIN} />
      </group>
      {/* The cold shaft from the ceiling grate. */}
      <Shaft position={[1.3, 8.2, -0.6]} length={8.6} width={2.6} color="#a8c6ff" opacity={0.05 + 0.2 * sun} tilt={shaftTilt * 0.5} />
      <Shaft position={[2.1, 8.2, -1.4]} length={8.6} width={1.6} color="#cfe0ff" opacity={0.04 + 0.14 * sun} tilt={shaftTilt * 0.5 + 0.05} />
      {motes ? <DustMotes count={70} /> : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// The reef
// ---------------------------------------------------------------------------
const Coral: React.FC<{ position: Vec3; color: string; scale?: number; seed: string }> = ({ position, color, scale = 1, seed }) => {
  const mat = vinyl(color, "skin");
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + random(`${seed}-a`) * 3;
        const h = 0.7 + random(`${seed}-h-${i}`) * 0.8;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <Part geo={G.bentCone(0.11, 0.05, h, 0.35 + random(`${seed}-b-${i}`) * 0.3, 0)} mat={mat} />
            <Part geo={G.sphere(0.075)} mat={mat} position={[0.35 + random(`${seed}-b-${i}`) * 0.3, h * 0.78, 0]} ink={INK_THIN} />
          </group>
        );
      })}
    </group>
  );
};

const Kelp: React.FC<{ position: Vec3; height?: number; phase?: number }> = ({ position, height = 3.2, phase = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      <Tentacle
        n={34}
        r0={0.13}
        r1={0.07}
        mat={vinyl("#2f8a4e", "leather")}
        path={(t) => [0.4 * Math.sin(frame * 0.035 + phase + t * 2.5) * t, t * height, 0.2 * Math.cos(frame * 0.03 + phase + t * 2) * t]}
      />
    </group>
  );
};

/** A little fish crossing the background (soft through the depth of field). */
const Fish: React.FC<{ y: number; z: number; speed: number; phase: number; color: string }> = ({ y, z, speed, phase, color }) => {
  const frame = useCurrentFrame();
  const span = 26;
  const x = (((frame * speed + phase * span) % span) + span) % span - span / 2;
  const dir = speed > 0 ? 1 : -1;
  const wag = 0.4 * Math.sin(frame * 0.5 + phase * 9);
  return (
    <group position={[x, y + 0.2 * Math.sin(frame * 0.05 + phase * 5), z]} scale={[dir, 1, 1]}>
      <Part geo={G.sphere(0.2)} mat={vinyl(color, "gloss")} scale={[1.6, 0.8, 0.5]} />
      <Part geo={G.cone(0.14, 0.24, 4)} mat={vinyl(color, "gloss")} position={[-0.4, 0, 0]} rotation={[0, wag, -Math.PI / 2]} scale={[1, 1, 0.3]} ink={INK_THIN} />
    </group>
  );
};

/** Sunlit shallow reef: sand, rocks, coral, kelp, light shafts, bubbles, fish in the distance. */
export const ReefSet: React.FC<{ rock?: boolean }> = ({ rock = false }) => {
  const frame = useCurrentFrame();
  const caustic = 1 + 0.1 * Math.sin(frame * 0.17) + 0.06 * Math.sin(frame * 0.29 + 1);
  return (
    <>
      <Atmosphere color="#0d4660" near={7} far={30} />
      <Backdrop stops={["#58c6d8", "#1c86a6", "#0b4460", "#082f46"]} z={-20} y={7} />
      <ThreePoint
        key_={{ position: [2.5, 10, 4], color: "#e6fbff", intensity: 1.7 * caustic }}
        rim={{ position: [-5, 5, -6], color: "#3fe0cf", intensity: 1.8 }}
        fill={{ color: "#7fd3e6", ground: "#27586a", intensity: 0.7 }}
        area={7}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 44]} />
        <meshStandardMaterial color="#c2ad7c" roughness={0.95} />
      </mesh>
      {rock ? <Rock position={[0, 0, -0.15]} size={1.75} color="#6b7480" seed="reef-main" flat={0.55} /> : null}
      <Rock position={[-2.4, 0, -2.4]} size={1.9} color="#5c6a78" seed="reef-a" flat={0.9} />
      <Rock position={[2.7, 0, -2.9]} size={2.3} color="#52606e" seed="reef-b" flat={1.1} />
      <Rock position={[1.9, 0, 1.5]} size={0.4} color="#70798a" seed="reef-c" />
      <Rock position={[-1.7, 0, 1.9]} size={0.3} color="#7d8696" seed="reef-d" />
      <Coral position={[-1.9, 0.9, -2.0]} color="#f0668a" seed="c1" scale={1.1} />
      <Coral position={[2.3, 1.6, -2.5]} color="#f59a3c" seed="c2" scale={1.3} />
      <Coral position={[-3.2, 0, -0.9]} color="#b06ae0" seed="c3" scale={0.9} />
      <Coral position={[3.3, 0, -1.2]} color="#f0668a" seed="c4" scale={0.8} />
      {/* Ripples in the sand and a few shells. */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[(i % 2 ? 0.4 : -0.3) + Math.sin(i * 1.7) * 0.6, 0.012, 3.2 - i * 0.75]} rotation={[-Math.PI / 2, 0, 0.12 * Math.sin(i * 2.3)]} scale={[9 + (i % 3), 0.16, 1]}>
          <circleGeometry args={[1, 24]} />
          <meshStandardMaterial color="#ad9868" roughness={1} />
        </mesh>
      ))}
      {[
        [-1.5, 1.2],
        [1.3, 2.0],
        [2.2, 0.5],
        [-2.3, 0.4],
        [0.6, 2.7],
      ].map(([x, z], i) => (
        <Part key={i} geo={G.sphere(0.07)} mat={vinyl(i % 2 ? "#f3e6d0" : "#e8b7a6", "bone")} position={[x, 0.03, z]} scale={[1.3, 0.5, 1]} rotation={[0, i * 1.4, 0]} ink={INK_THIN} />
      ))}
      {[-3.9, -3.1, 3.8, 4.5, -1.0, 1.4].map((x, i) => (
        <Kelp key={x} position={[x, 0, -3.6 - (i % 3) * 0.9]} height={3 + (i % 3) * 0.9} phase={i * 1.3} />
      ))}
      {[-3.2, -0.6, 2.2, 4.6].map((x, i) => (
        <Shaft key={x} position={[x, 10.5, -1.5 - (i % 2)]} length={11} width={2 + (i % 2)} color="#c9fbff" opacity={0.16} tilt={-0.22} />
      ))}
      <Drift count={46} center={[0, 3.2, -0.5]} box={[12, 7, 7]} rise={0.03} size={0.14} color="#d8fbff" opacity={0.55} seed="bubbles" />
      <Drift count={70} center={[0, 2.5, 0.5]} box={[14, 6, 9]} rise={0.004} size={0.05} color="#bfeef5" opacity={0.5} seed="plankton" />
      <Fish y={3.6} z={-7} speed={0.035} phase={0.1} color="#ffd34d" />
      <Fish y={4.4} z={-9} speed={0.028} phase={0.45} color="#ff8f5a" />
      <Fish y={2.8} z={-8} speed={-0.03} phase={0.7} color="#8fe3ff" />
      <Fish y={5.0} z={-11} speed={-0.022} phase={0.25} color="#ffd34d" />
    </>
  );
};

// ---------------------------------------------------------------------------
// The studio
// ---------------------------------------------------------------------------
/** A dark seamless studio with one pool of light: the stage for scale comparisons. */
export const StudioSet: React.FC<{ accent?: string }> = ({ accent = "#ffb648" }) => (
  <>
    <Atmosphere color="#141821" near={16} far={44} />
    <Backdrop stops={["#0f1219", "#232a38", "#2f3848", "#1a1f29"]} z={-13} y={6} />
    <hemisphereLight args={["#8fa0c8", "#1a1c22", 0.55]} />
    <spotLight
      position={[1.5, 11, 6]}
      angle={0.5}
      penumbra={0.85}
      intensity={420}
      color="#fff3e0"
      decay={2}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
    />
    <directionalLight position={[-6, 5, -6]} color={accent} intensity={1.6} />
    <directionalLight position={[6, 4, -5]} color="#5fa0ff" intensity={1.2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[70, 50]} />
      <meshStandardMaterial color="#2b313d" roughness={0.55} metalness={0.1} />
    </mesh>
    <Drift count={40} center={[0, 3.5, 0]} box={[10, 7, 6]} rise={0.003} size={0.05} color="#ffe6c0" opacity={0.35} seed="studio-dust" />
  </>
);

// ---------------------------------------------------------------------------
// The swamp
// ---------------------------------------------------------------------------
export const WATER_Y = 0.33;

const Reeds: React.FC<{ position: Vec3; count?: number; seed: string }> = ({ position, count = 7, seed }) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const h = 1.6 + random(`${seed}-h-${i}`) * 1.6;
        const sway = 0.07 * Math.sin(frame * 0.04 + i * 1.7 + position[0]);
        return (
          <group key={i} position={[(random(`${seed}-x-${i}`) - 0.5) * 1.3, 0, (random(`${seed}-z-${i}`) - 0.5) * 0.9]} rotation={[0, 0, sway + (random(`${seed}-l-${i}`) - 0.5) * 0.2]}>
            <Part geo={G.cyl(0.02, 0.035, h, 6)} mat={vinyl("#5e8a3a", "leather")} position={[0, h / 2, 0]} ink={INK_THIN} />
            {i % 2 === 0 ? <Part geo={G.capsule(0.06, 0.34)} mat={vinyl("#5a3a22", "cloth")} position={[0, h - 0.1, 0]} ink={INK_THIN} /> : null}
          </group>
        );
      })}
    </group>
  );
};

/** Dusk in a still swamp: dark water, reeds, lily pads, mangroves in the mist, fireflies. */
export const SwampSet: React.FC = () => {
  const frame = useCurrentFrame();
  const trunk = vinyl("#1f2a2a", "cloth");
  return (
    <>
      <Atmosphere color="#1a2b30" near={8} far={30} />
      <Backdrop stops={["#16242e", "#27434a", "#7c7a55", "#e09a52", "#3a3a2c"]} z={-20} y={6.5} height={34} />
      <GlowSprite position={[-3.4, 5.6, -19]} color="#ffd9a0" size={7} opacity={0.5} />
      <ThreePoint
        key_={{ position: [4, 7, 6], color: "#d9e6ee", intensity: 2.4 }}
        rim={{ position: [-6, 4, -7], color: "#ffa64d", intensity: 2.6 }}
        fill={{ color: "#8fb3bd", ground: "#3a4030", intensity: 1.1 }}
        area={8}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 44]} />
        <meshStandardMaterial color="#3a3526" roughness={1} />
      </mesh>
      <mesh position={[0, WATER_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 44]} />
        <meshStandardMaterial color="#3d6e66" roughness={0.3} metalness={0} transparent opacity={0.8} />
      </mesh>
      {/* Slow rings where the animal breaks the surface. */}
      {[0, 1, 2].map((i) => {
        const t = ((frame / 150 + i / 3) % 1 + 1) % 1;
        return (
          <mesh key={i} position={[1.0, WATER_Y + 0.004, 1.6]} rotation={[-Math.PI / 2, 0, 0]} scale={0.6 + t * 3.2}>
            <ringGeometry args={[0.98, 1, 48]} />
            <meshBasicMaterial color="#bfe3d6" transparent opacity={0.22 * (1 - t)} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
      <Reeds position={[-3.6, 0, -1.6]} seed="r1" count={9} />
      <Reeds position={[4.2, 0, -2.2]} seed="r2" count={8} />
      <Reeds position={[-5.2, 0, 0.8]} seed="r3" count={6} />
      <Reeds position={[5.6, 0, 1.0]} seed="r4" count={5} />
      {[
        [-1.6, 1.2, 0.42],
        [-2.3, 0.4, 0.3],
        [3.4, 0.6, 0.4],
        [2.6, -1.6, 0.36],
      ].map(([x, z, r], i) => (
        <group key={i} position={[x, WATER_Y + 0.012, z]} rotation={[0, i * 1.3, 0]}>
          <Part geo={G.cyl(r, r, 0.02, 24)} mat={vinyl("#4c8f3f", "leather")} ink={INK_THIN} />
          {i === 0 ? <Part geo={G.sphere(0.1)} mat={vinyl("#f6b6d2", "skin")} position={[0.1, 0.08, 0.05]} scale={[1, 0.7, 1]} ink={INK_THIN} /> : null}
        </group>
      ))}
      {[-7.5, -4.6, -1.2, 3.2, 6.8].map((x, i) => (
        <group key={x} position={[x, 0, -6.5 - (i % 2) * 2.2]}>
          <Part geo={G.cyl(0.26, 0.42, 7, 8)} mat={trunk} position={[0, 3.5, 0]} rotation={[0, 0, (i - 2) * 0.05]} ink={false} />
          {[-1, 1].map((s) => (
            <Part key={s} geo={G.bentCone(0.16, 0.08, 1.6, s * 0.9, 0.3)} mat={trunk} position={[0, 1.7, 0]} rotation={[Math.PI, 0, 0]} ink={false} />
          ))}
          <Part geo={G.sphere(1.7)} mat={vinyl("#1b2c26", "cloth")} position={[0, 7.2, 0]} scale={[1.4, 0.7, 1]} ink={false} />
        </group>
      ))}
      <Drift count={26} center={[0, 0.9, -1]} box={[16, 1.0, 9]} rise={0.001} size={2.6} color="#9fb8b0" opacity={0.07} seed="mist" />
      <Drift count={34} center={[0, 1.9, 0]} box={[12, 2.6, 8]} rise={0.006} size={0.1} color="#e9ff8a" opacity={0.9} seed="fireflies" twinkle />
    </>
  );
};
