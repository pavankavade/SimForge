import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { AdventurerUnit, G, INK_THIN, Part, flat, vinyl, type AdventurerClass } from "../characters/hero";

/**
 * Supporting cast and props for the "What if" sets, all in the ink & vinyl
 * look: a fence-walking cat, a pasture cow, a crop-duster biplane, an airliner
 * with a contrail, a paraglider, a mountain crest with a perch rock, a weather
 * vane and a farmyard fence. Every piece faces +z and is a pure function of
 * its props.
 */

// ---------------------------------------------------------------------------
// Cat: walks along a fence top (`walk` advances the leg cycle).
// ---------------------------------------------------------------------------
export const Cat: React.FC<{ position: Vec3; heading?: number; walk?: number }> = ({ position, heading = Math.PI / 2, walk = 0 }) => {
  const fur = vinyl("#f2a34a", "hair");
  const stripe = vinyl("#c96f22", "hair");
  const s = Math.sin(walk * 0.4);
  return (
    <group position={position} rotation={[0, heading, 0]}>
      <Part geo={G.capsule(0.09, 0.42)} mat={fur} position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {[-0.06, 0.06].map((z) => (
        <mesh key={z} geometry={G.box(0.19, 0.03, 0.03, 0.01)} material={stripe} position={[0, 0.33, z]} />
      ))}
      <Part geo={G.sphere(0.1)} mat={fur} position={[0, 0.34, 0.24]} />
      {([-1, 1] as const).map((k) => (
        <Part key={k} geo={G.cone(0.04, 0.08, 8)} mat={fur} position={[k * 0.055, 0.44, 0.23]} ink={INK_THIN} />
      ))}
      {([-1, 1] as const).map((k) => (
        <mesh key={`e${k}`} geometry={G.sphere(0.016)} material={flat("#2b2230")} position={[k * 0.04, 0.36, 0.33]} />
      ))}
      {/* Legs: diagonal pairs swing together */}
      {[
        [-0.05, 0.12, 1],
        [0.05, 0.12, -1],
        [-0.05, -0.12, -1],
        [0.05, -0.12, 1],
      ].map(([x, z, ph], i) => (
        <group key={i} position={[x, 0.2, z]} rotation={[s * 0.5 * ph, 0, 0]}>
          <Part geo={G.capsule(0.03, 0.2)} mat={fur} position={[0, -0.1, 0]} ink={INK_THIN} />
        </group>
      ))}
      {/* Tail held high with a curl */}
      <group position={[0, 0.3, -0.2]} rotation={[-0.9 + s * 0.1, 0, 0]}>
        <Part geo={G.capsule(0.03, 0.34)} mat={stripe} position={[0, 0.16, 0]} ink={INK_THIN} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Cow: black-and-white pasture cow; `look` turns her head toward a target yaw.
// ---------------------------------------------------------------------------
export const Cow: React.FC<{ position: Vec3; heading?: number; look?: number; chew?: number }> = ({ position, heading = 0, look = 0, chew = 0 }) => {
  const white = vinyl("#f3efe6", "cloth");
  const black = vinyl("#2a2628", "cloth");
  const pink = vinyl("#f0a8a8", "skin");
  return (
    <group position={position} rotation={[0, heading, 0]}>
      <Part geo={G.box(0.62, 0.55, 1.15, 0.22)} mat={white} position={[0, 0.85, 0]} />
      <mesh geometry={G.sphere(0.2)} material={black} position={[0.24, 0.95, 0.15]} scale={[0.5, 1, 1.2]} />
      <mesh geometry={G.sphere(0.18)} material={black} position={[-0.25, 0.9, -0.25]} scale={[0.5, 1, 1.3]} />
      {[
        [-0.2, 0.38],
        [0.2, 0.38],
        [-0.2, -0.4],
        [0.2, -0.4],
      ].map(([x, z]) => (
        <Part key={`${x}${z}`} geo={G.capsule(0.08, 0.62)} mat={white} position={[x, 0.3, z]} ink={INK_THIN} />
      ))}
      <group position={[0, 1.0, 0.62]} rotation={[0.2, look, 0]}>
        <Part geo={G.box(0.34, 0.36, 0.42, 0.14)} mat={white} position={[0, 0, 0.12]} />
        <Part geo={G.box(0.3, 0.2, 0.16, 0.07)} mat={pink} position={[0, -0.12 - Math.abs(Math.sin(chew * 0.3)) * 0.02, 0.36]} ink={INK_THIN} />
        {([-1, 1] as const).map((k) => (
          <group key={k}>
            <Part geo={G.sphere(0.07)} mat={black} position={[k * 0.22, 0.1, 0.05]} scale={[1.4, 0.6, 0.6]} ink={INK_THIN} />
            <Part geo={G.cone(0.03, 0.12, 8)} mat={vinyl("#efe2c8", "bone")} position={[k * 0.12, 0.24, 0.06]} rotation={[0, 0, -k * 0.5]} ink={INK_THIN} />
            <mesh geometry={G.sphere(0.035)} material={flat("#2b2230")} position={[k * 0.1, 0.06, 0.33]} />
          </group>
        ))}
      </group>
      <group position={[0, 1.0, -0.6]} rotation={[0.4, 0, 0]}>
        <Part geo={G.capsule(0.025, 0.5)} mat={white} position={[0, -0.25, 0]} ink={INK_THIN} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Crop-duster biplane, flying toward +z; the prop spins with `frame`.
// ---------------------------------------------------------------------------
export const Biplane: React.FC<{ position: Vec3; heading?: number; frame: number; scale?: number }> = ({ position, heading = 0, frame, scale = 1 }) => {
  const yellow = vinyl("#f2c14e", "gloss");
  const red = vinyl("#d8413a", "gloss");
  const dark = vinyl("#2e3442", "leather");
  return (
    <group position={position} rotation={[0, heading, 0]} scale={scale}>
      <Part geo={G.capsule(0.32, 3.2)} mat={yellow} rotation={[Math.PI / 2, 0, 0]} />
      <Part geo={G.cyl(0.3, 0.34, 0.25, 18)} mat={red} position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]} />
      {[0.55, -0.35].map((y) => (
        <Part key={y} geo={G.box(5.2, 0.08, 0.9, 0.04)} mat={y > 0 ? yellow : red} position={[0, y, 0.55]} />
      ))}
      {([-1.8, 1.8] as const).map((x) => (
        <mesh key={x} geometry={G.cyl(0.03, 0.03, 0.9, 6)} material={dark} position={[x, 0.1, 0.55]} />
      ))}
      <Part geo={G.box(1.6, 0.06, 0.5, 0.03)} mat={red} position={[0, 0.05, -1.45]} />
      <Part geo={G.box(0.06, 0.6, 0.5, 0.03)} mat={red} position={[0, 0.35, -1.45]} />
      <mesh geometry={G.sphere(0.18)} material={dark} position={[0, 0.38, -0.2]} />
      <group position={[0, 0, 1.68]} rotation={[0, 0, frame * 1.7]}>
        <mesh geometry={G.box(1.6, 0.12, 0.03, 0.02)} material={dark} />
      </group>
      {/* Spray bar and a faint trailing mist */}
      <mesh geometry={G.cyl(0.03, 0.03, 4.4, 6)} material={dark} position={[0, -0.55, 0.4]} rotation={[0, 0, Math.PI / 2]} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Airliner high above with a long contrail (flying toward +x).
// ---------------------------------------------------------------------------
export const Jet: React.FC<{ position: Vec3; trail?: number }> = ({ position, trail = 120 }) => {
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f6fa", roughness: 0.4, fog: false }), []);
  const contrail = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.75, fog: false, depthWrite: false }), []);
  return (
    <group position={position}>
      <mesh material={body} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.9, 9, 6, 12]} />
      </mesh>
      <mesh material={body} position={[0.5, 0, 0]}>
        <boxGeometry args={[2.2, 0.2, 13]} />
      </mesh>
      <mesh material={body} position={[-4.4, 1.2, 0]}>
        <boxGeometry args={[1.4, 2.4, 0.2]} />
      </mesh>
      {[-3, 3].map((z) => (
        <mesh key={z} material={contrail} position={[-trail / 2 - 3, -0.3, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.9, trail, 8, 1, true]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Paraglider: an arched canopy on lines over a seated pilot (any cast class).
// ---------------------------------------------------------------------------
export const Paraglider: React.FC<{ position: Vec3; heading?: number; pilot?: AdventurerClass; frame: number }> = ({
  position,
  heading = 0,
  pilot = "neighborC",
  frame,
}) => {
  const cells = 9;
  const span = 7;
  const canopyY = 5.2;
  const line = flat("#3a3330");
  return (
    <group position={position} rotation={[0, heading, 0]}>
      {Array.from({ length: cells }, (_, i) => {
        const t = (i / (cells - 1)) * 2 - 1;
        const a = t * 0.75;
        const x = Math.sin(a) * (span / 2) * 1.05;
        const y = canopyY + Math.cos(a) * 1.0 - 1.0;
        return (
          <Part
            key={i}
            geo={G.box(span / cells + 0.04, 0.32, 1.7, 0.12)}
            mat={vinyl(i % 2 ? "#e84a8a" : "#ffd23f", "cloth")}
            position={[x, y, 0]}
            rotation={[0, 0, -a]}
            ink={INK_THIN}
          />
        );
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const t = (i / 5) * 2 - 1;
        const top = new THREE.Vector3(Math.sin(t * 0.7) * span * 0.45, canopyY - 1 + Math.cos(t * 0.7) - 0.15, 0);
        const bottom = new THREE.Vector3(t * 0.25, 1.55, 0);
        const mid = top.clone().add(bottom).multiplyScalar(0.5);
        const len = top.distanceTo(bottom);
        const ang = Math.atan2(top.x - bottom.x, top.y - bottom.y);
        return <mesh key={i} geometry={G.cyl(0.008, 0.008, len, 4)} material={line} position={mid.toArray() as Vec3} rotation={[0, 0, -ang]} />;
      })}
      <Part geo={G.box(0.6, 0.35, 0.6, 0.12)} mat={vinyl("#2d3f69", "leather")} position={[0, 0.82, -0.1]} />
      <AdventurerUnit classType={pilot} pose="ride" expression="happy" position={[0, 0.22, 0]} animFrame={frame} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Mountain crest: a long faceted ridge running along x with snow on top and a
// flat perch rock on the crest at (0, CREST_Y, 0).
// ---------------------------------------------------------------------------
export const CREST_Y = 0;

export const MountainCrest: React.FC<{ position?: Vec3; length?: number; seed?: number; sunset?: number }> = ({
  position = [0, 0, 0],
  length = 160,
  seed = 2,
  sunset = 0,
}) => {
  const rock = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7d82a8", roughness: 1, flatShading: true }), []);
  const rockDark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#656a92", roughness: 1, flatShading: true }), []);
  const snow = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f2f6", roughness: 0.9, flatShading: true }), []);
  rock.color.set(sunset > 0 ? "#8a7aa0" : "#7d82a8");
  const peaks = useMemo(
    () =>
      Array.from({ length: Math.round(length / 9) }, (_, i) => ({
        x: -length / 2 + i * 9 + (random(`cx${seed}${i}`) - 0.5) * 4,
        h: 7 + random(`ch${seed}${i}`) * 9,
        r: 9 + random(`cr${seed}${i}`) * 5,
        z: (random(`cz${seed}${i}`) - 0.5) * 6,
        rot: random(`ct${seed}${i}`) * Math.PI,
      })),
    [length, seed]
  );
  return (
    <group position={position}>
      {/* The peaks rise to roughly y = 0..+4 around the crest line; their bases sit far below. */}
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, -p.h - 26, p.z - 4]} rotation={[0, p.rot, 0]}>
          <mesh material={i % 2 ? rock : rockDark} position={[0, (p.h + 28) / 2, 0]}>
            <coneGeometry args={[p.r + 14, p.h + 28, 7, 1]} />
          </mesh>
          <mesh material={snow} position={[0, p.h + 28 - 2.6, 0]}>
            <coneGeometry args={[(p.r + 14) * 0.18, 5.4, 7, 1]} />
          </mesh>
        </group>
      ))}
      {/* Perch rock on the crest */}
      <mesh material={rockDark} position={[0, CREST_Y - 0.6, 1.2]}>
        <dodecahedronGeometry args={[1.4, 0]} />
      </mesh>
      <mesh material={rock} position={[0, CREST_Y - 2.2, 0.4]} scale={[2.4, 1.6, 2]}>
        <dodecahedronGeometry args={[1.6, 0]} />
      </mesh>
    </group>
  );
};

/** Top surface height of the perch rock (actors sit/stand on it). */
export const PERCH = { x: 0, y: CREST_Y + 0.55, z: 1.2 } as const;

// ---------------------------------------------------------------------------
// Weather vane: arrow on a post that swings to `angle` (radians about y).
// ---------------------------------------------------------------------------
export const WeatherVane: React.FC<{ position: Vec3; angle: number }> = ({ position, angle }) => {
  const iron = vinyl("#2e3442", "leather");
  const copper = vinyl("#d9894a", "gloss");
  return (
    <group position={position}>
      <mesh geometry={G.cyl(0.03, 0.04, 1.4, 8)} material={iron} position={[0, 0.7, 0]} />
      <group position={[0, 1.4, 0]} rotation={[0, angle, 0]}>
        <mesh geometry={G.cyl(0.02, 0.02, 1.3, 6)} material={iron} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={G.cone(0.1, 0.24, 4)} material={copper} position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={G.box(0.02, 0.3, 0.32, 0.01)} material={copper} position={[0, 0, -0.6]} />
      </group>
      {(["N", "E", "S", "W"] as const).map((d, i) => (
        <mesh key={d} geometry={G.cyl(0.012, 0.012, 0.5, 4)} material={iron} position={[Math.sin((i * Math.PI) / 2) * 0.25, 1.15, Math.cos((i * Math.PI) / 2) * 0.25]} rotation={[Math.PI / 2, 0, (i * Math.PI) / 2]} />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Farmyard fence: posts and two rails along x (the cat walks on the top rail).
// ---------------------------------------------------------------------------
export const FENCE_TOP = 1.0;

export const YardFence: React.FC<{ position: Vec3; length: number }> = ({ position, length }) => {
  const wood = vinyl("#c9a46a", "wood");
  const posts = Math.floor(length / 1.8) + 1;
  return (
    <group position={position}>
      {Array.from({ length: posts }, (_, i) => (
        <Part key={i} geo={G.box(0.14, FENCE_TOP + 0.1, 0.14, 0.03)} mat={wood} position={[-length / 2 + i * 1.8, (FENCE_TOP + 0.1) / 2, 0]} ink={INK_THIN} />
      ))}
      {[FENCE_TOP - 0.04, 0.5].map((y) => (
        <Part key={y} geo={G.box(length, 0.1, 0.08, 0.03)} mat={wood} position={[0, y, 0.06]} ink={INK_THIN} />
      ))}
    </group>
  );
};

/** Grandpa's thermos with steam that rises once it is open (`open` 0..1, `frame` animates). */
export const Thermos: React.FC<{ position: Vec3; open: number; frame: number }> = ({ position, open, frame }) => (
  <group position={position}>
    <Part geo={G.cyl(0.06, 0.06, 0.26, 14)} mat={vinyl("#c4473a", "gloss")} ink={INK_THIN} />
    <Part geo={G.cyl(0.065, 0.065, 0.06, 14)} mat={vinyl("#d9dde3", "metal")} position={[0, 0.16, 0]} ink={INK_THIN} />
    {open > 0.05
      ? Array.from({ length: 6 }, (_, i) => {
          const t = ((frame + i * 9) % 54) / 54;
          return (
            <mesh key={i} geometry={G.sphere(0.06)} material={flat("#ffffff")} position={[Math.sin(i * 2 + t * 4) * 0.05, 0.22 + t * 0.6, 0]} scale={(0.4 + t) * open * (1 - t)} />
          );
        })
      : null}
  </group>
);
