import type React from "react";
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeWood } from "../../engine/textures";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { tint } from "./common";

/**
 * The fantasy-biology cast in the series "ink & vinyl" toy style: the mimic
 * (as a blob and as a soft, painted chest), and its real-world anchors: the
 * octopus, the giant clam, the hermit crab and the crocodile. All built from
 * hero-rig Parts (cached geometry, vinyl materials, ink outline) and posed by
 * props, so every one is a pure function of the frame.
 */

const UNIT = G.sphere(0.1);

/**
 * A soft limb as a chain of overlapping spheres along `path(t)`, tapering from
 * r0 to r1 (arms, tongues, tails, a body pouring through a gap). The ink hulls
 * of neighbours hide inside each other, so the chain reads as one shape.
 */
export const Tentacle: React.FC<{
  path: (t: number) => Vec3;
  r0: number;
  r1: number;
  n?: number;
  mat: THREE.Material;
  ink?: number | false;
  /** Radius profile override (t -> radius). */
  radius?: (t: number) => number;
}> = ({ path, r0, r1, n = 10, mat, ink, radius }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const r = radius ? radius(t) : r0 + (r1 - r0) * t;
      return <Part key={i} geo={UNIT} mat={mat} position={path(t)} scale={r / 0.1} ink={ink} />;
    })}
  </>
);

/** A glossy eye ball with a dark pupil; `slit` picks the pupil shape, `open` (0..1) the lid. */
const Eye: React.FC<{ position: Vec3; r?: number; color?: string; slit?: "v" | "h" | "round"; open?: number; look?: [number, number]; yaw?: number }> = ({
  position,
  r = 0.1,
  color = "#ffe36b",
  slit = "v",
  open = 1,
  look = [0, 0],
  yaw = 0,
}) => {
  const pupil: Vec3 = slit === "v" ? [r * 0.3, r * 1.25, 1] : slit === "h" ? [r * 1.3, r * 0.34, 1] : [r * 0.75, r * 0.75, 1];
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[1, Math.max(0.06, open), 1]}>
      <Part geo={G.sphere(r)} mat={vinyl(color, "gloss")} ink={INK_THIN} />
      <mesh position={[look[0] * r * 0.4, look[1] * r * 0.4, r * 0.93]} scale={pupil} geometry={G.disc(0.5)} material={flat("#170d12")} />
      <mesh position={[r * 0.32 + look[0] * r * 0.2, r * 0.36, r * 0.98]} geometry={G.disc(r * 0.16)} material={flat("#ffffff")} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// The mimic as itself: a soft, boneless ambush animal
// ---------------------------------------------------------------------------
export const FLESH = "#b3477f";
const FLESH_DARK = "#7e2c5c";
const FLESH_PALE = "#e79ab8";

export type Mood = "neutral" | "smug" | "shock" | "sad";

/**
 * The mimic out of its chest: a dome of muscle on six short arms. `scale`
 * shrinks it as it pours away; `squash` > 0 flattens it, < 0 stretches it up.
 */
export const MimicBlob: React.FC<{
  position?: Vec3;
  yaw?: number;
  scale?: number;
  squash?: number;
  mood?: Mood;
  look?: [number, number];
  color?: string;
  arms?: boolean;
  /** 0..1 closes the eyes (asleep). */
  blink?: number;
}> = ({ position = [0, 0, 0], yaw = 0, scale = 1, squash = 0, mood = "neutral", look = [0, 0], color = FLESH, arms = true, blink = 0 }) => {
  const frame = useCurrentFrame();
  const breathe = 0.02 * Math.sin(frame * 0.09);
  const sy = 1 - squash + breathe;
  const sx = 1 + squash * 0.6 - breathe * 0.5;
  const skin = vinyl(color, "skin");
  const lid = (mood === "smug" ? 0.5 : mood === "sad" ? 0.62 : 1) * (1 - blink);
  const eyeR = mood === "shock" ? 0.15 : 0.125;
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {arms
        ? Array.from({ length: 6 }, (_, i) => {
            const th = (i / 6) * Math.PI * 2 + 0.5;
            return (
              <Tentacle
                key={i}
                n={7}
                r0={0.15}
                r1={0.05}
                mat={skin}
                path={(t) => {
                  const a = th + 0.35 * Math.sin(frame * 0.07 + i * 1.9 + t * 2.4) * t;
                  const d = 0.34 * sx + 0.52 * t;
                  return [Math.cos(a) * d, 0.1 - 0.03 * t + 0.16 * Math.max(0, t - 0.7) * (1 + Math.sin(frame * 0.1 + i)), Math.sin(a) * d];
                }}
              />
            );
          })
        : null}
      <group scale={[sx, sy, sx]}>
        <Part geo={G.sphere(0.55)} mat={skin} position={[0, 0.44, 0]} scale={[1.12, 0.86, 1]} />
        <Part geo={G.sphere(0.4)} mat={vinyl(FLESH_PALE, "skin")} position={[0, 0.2, 0.2]} scale={[1.15, 0.5, 0.9]} ink={false} />
        {/* Darker spots across the back of the dome. */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const a = -2.6 + i * 0.85;
          const up = 0.5 + 0.3 * random(`blob-spot-${i}`);
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 0.5 * Math.cos(up), 0.44 + 0.47 * Math.sin(up), -Math.cos(a) * 0.42 * Math.cos(up) - 0.05]}
              scale={[1, 0.5, 1]}
              geometry={G.sphere(0.07 + 0.03 * random(`blob-spot-r-${i}`))}
              material={vinyl(FLESH_DARK, "skin")}
            />
          );
        })}
        <Eye position={[-0.22, 0.6, 0.42]} r={eyeR} open={lid} look={look} yaw={-0.25} />
        <Eye position={[0.22, 0.6, 0.42]} r={eyeR} open={lid} look={look} yaw={0.25} />
        {/* Mouth: a dark crescent with two small fangs; wide open on a shock. */}
        <group position={[0, 0.33, 0.56]} rotation={[-0.2, 0, 0]}>
          <mesh
            geometry={G.disc(0.16, Math.PI, Math.PI)}
            material={flat("#2a0a16")}
            scale={mood === "shock" ? [0.7, 1.5, 1] : mood === "sad" ? [1, -0.5, 1] : [1.15, mood === "smug" ? 0.75 : 0.55, 1]}
            position={[0, mood === "sad" ? -0.08 : 0, 0]}
          />
          {mood !== "sad"
            ? [-0.09, 0.09].map((x) => <Part key={x} geo={G.cone(0.028, 0.08, 8)} mat={vinyl("#fff5dc", "bone")} position={[x, -0.035, 0.01]} rotation={[Math.PI, 0, 0]} ink={false} />)
            : null}
        </group>
      </group>
    </group>
  );
};

/**
 * The mimic holding the shape of a chest. `paint` sweeps the plank-and-iron
 * skin pattern across it from left to right (real clipping planes: flesh on one
 * side of the line, paint on the other). `wobble` is a jelly offset (-1..1).
 */
export const SOFT = { w: 1.5, h: 1.02, d: 0.95 };
export const SoftChest: React.FC<{ position?: Vec3; paint: number; wobble?: number; eyes?: number; look?: [number, number]; lean?: number }> = ({
  position = [0, 0, 0],
  paint,
  wobble = 0,
  eyes = 0,
  look = [0, 0],
  lean = 0,
}) => {
  const frame = useCurrentFrame();
  const { gl } = useThree();
  gl.localClippingEnabled = true;
  const wood = useSurface("bio-skin-oak", () => makeWood({ planks: 5, base: "#96682f", baseAlt: "#a9783a", seam: "#2e1c0c", seed: 91 }), [1, 1]);
  const sweepX = position[0] + (paint * 1.2 - 0.6) * (SOFT.w + 0.3);
  const mats = useMemo(() => {
    const keepRight = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    const keepLeft = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    const painted = (color: string, roughness: number, map?: THREE.Texture | null, normalMap?: THREE.Texture | null) =>
      new THREE.MeshStandardMaterial({ color, roughness, map: map ?? null, normalMap: normalMap ?? null, clippingPlanes: [keepLeft] });
    return {
      keepRight,
      keepLeft,
      flesh: new THREE.MeshStandardMaterial({ color: FLESH, roughness: 0.5, clippingPlanes: [keepRight] }),
      // A touch too glossy for real timber: it is still wet skin.
      wood: painted("#ffffff", 0.4, wood.map, wood.normalMap),
      iron: painted("#4b505e", 0.4),
      brass: painted("#e3b548", 0.3),
      seam: painted("#2a160c", 0.6),
    };
  }, [wood.map, wood.normalMap]);
  mats.keepRight.constant = -sweepX;
  mats.keepLeft.constant = sweepX;

  const breathe = 0.012 * Math.sin(frame * 0.09);
  const sy = 1 - wobble * 0.16 + breathe;
  const sx = 1 + wobble * 0.11 - breathe * 0.5;
  const { w, h, d } = SOFT;
  const body = G.box(w, h, d, 0.2);
  const sweeping = paint > 0.02 && paint < 0.98;
  return (
    <group position={position} rotation={[0, 0, lean]} scale={[sx, sy, sx]}>
      {/* Little arms peeking out from under the "chest". */}
      {[-1, 1].map((s) =>
        [-1, 1].map((f) => (
          <Tentacle
            key={`${s}${f}`}
            n={5}
            r0={0.11}
            r1={0.045}
            mat={vinyl(FLESH, "skin")}
            path={(t) => [s * (w / 2 - 0.12 + 0.3 * t), 0.08 + 0.05 * Math.sin(frame * 0.11 + s + f + t * 3) * t, f * (d / 2 - 0.1 + 0.16 * t)]}
          />
        )),
      )}
      {/* The outline comes from the flesh body; the painted body shares its silhouette. */}
      <Part geo={body} mat={mats.flesh} position={[0, h / 2, 0]} />
      <mesh geometry={body} material={mats.wood} position={[0, h / 2, 0]} castShadow receiveShadow />
      {[-0.5, 0, 0.5].map((x) => (
        <mesh key={x} geometry={G.box(0.11, h - 0.06, d + 0.02, 0.05)} material={mats.iron} position={[x, h / 2, 0]} />
      ))}
      <mesh geometry={G.box(w + 0.015, 0.035, d + 0.015, 0.015)} material={mats.seam} position={[0, 0.62, 0]} />
      <mesh geometry={G.box(0.2, 0.24, 0.05, 0.02)} material={mats.brass} position={[0, 0.52, d / 2]} />
      {sweeping ? (
        <mesh position={[(sweepX - position[0]) / sx, h / 2, 0]}>
          <boxGeometry args={[0.025, h + 0.03, d + 0.03]} />
          <meshBasicMaterial color="#7df2ff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      ) : null}
      {eyes > 0.02 ? (
        <>
          <Eye position={[-0.3, 0.8, d / 2 - 0.02]} r={0.13} open={eyes} look={look} />
          <Eye position={[0.3, 0.8, d / 2 - 0.02]} r={0.13} open={eyes} look={look} />
        </>
      ) : null}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Octopus
// ---------------------------------------------------------------------------
/** `camo` (0..1) fades the octopus from its own colour to `camoColor` (the rock behind it). */
export const Octopus: React.FC<{ position?: Vec3; yaw?: number; scale?: number; color?: string; camoColor?: string; camo?: number; look?: [number, number] }> = ({
  position = [0, 0, 0],
  yaw = 0,
  scale = 1,
  color = "#e2643a",
  camoColor = "#6b7480",
  camo = 0,
  look = [0, 0],
}) => {
  const frame = useCurrentFrame();
  const skin = vinyl(tint(color, camoColor, camo), "skin");
  const spot = vinyl(tint("#a8381e", "#4a525c", camo), "skin");
  const pulse = 1 + 0.035 * Math.sin(frame * 0.11);
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {Array.from({ length: 8 }, (_, i) => {
        const th = (i / 8) * Math.PI * 2 + 0.39;
        return (
          <Tentacle
            key={i}
            n={12}
            r0={0.17}
            r1={0.035}
            mat={skin}
            path={(t) => {
              const a = th + 0.42 * Math.sin(frame * 0.055 + i * 1.7 + t * 2.6) * t;
              const dist = 0.24 + 1.2 * t - 0.2 * t * t;
              const curl = Math.max(0, t - 0.68);
              return [Math.cos(a) * dist, 0.1 + 0.3 * (1 - t) ** 3 + curl * curl * 3.2 * (0.6 + 0.4 * Math.sin(frame * 0.07 + i * 2.1)), Math.sin(a) * dist];
            }}
          />
        );
      })}
      {/* Head, then the big mantle slung behind it. */}
      <Part geo={G.sphere(0.4)} mat={skin} position={[0, 0.46, 0.04]} scale={[1.05, 0.9, 1]} />
      <group position={[0, 0.82, -0.3]} rotation={[-0.62, 0, 0]} scale={[pulse, 1 / pulse, pulse]}>
        <Part geo={G.sphere(0.5)} mat={skin} scale={[0.92, 1.22, 0.95]} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const a = (i / 9) * Math.PI * 2;
          const up = -0.2 + 0.9 * random(`octo-spot-${i}`);
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 0.45 * Math.cos(up), 0.6 * Math.sin(up), Math.cos(a) * 0.46 * Math.cos(up)]}
              geometry={G.sphere(0.05 + 0.035 * random(`octo-spot-r-${i}`))}
              material={spot}
            />
          );
        })}
      </group>
      {/* Octopus pupils are horizontal bars. */}
      <Eye position={[-0.27, 0.62, 0.27]} r={0.11} slit="h" look={look} yaw={-0.5} color="#f4e7b0" />
      <Eye position={[0.27, 0.62, 0.27]} r={0.11} slit="h" look={look} yaw={0.5} color="#f4e7b0" />
    </group>
  );
};

/**
 * Macro of cephalopod skin: `sacs` (0..1) opens the chromatophores (pigment
 * discs pulled wide by muscle), `bumps` (0..1) raises the papillae.
 */
export const SkinPatch: React.FC<{ position?: Vec3; sacs: number; bumps: number }> = ({ position = [0, 0, 0], sacs, bumps }) => {
  const frame = useCurrentFrame();
  const COLS = 11;
  const ROWS = 9;
  const pigments = ["#f1b233", "#c8452c", "#5b2a1c"].map((c) => vinyl(c, "gloss"));
  const bumpMat = vinyl("#d9a48c", "skin");
  return (
    <group position={position}>
      <Part geo={G.box(4.6, 0.5, 3.6, 0.22)} mat={vinyl("#e9b7a0", "skin")} position={[0, -0.25, 0]} />
      {Array.from({ length: COLS * ROWS }, (_, k) => {
        const i = k % COLS;
        const j = Math.floor(k / COLS);
        const x = (i - (COLS - 1) / 2) * 0.38 + (j % 2) * 0.19;
        const z = (j - (ROWS - 1) / 2) * 0.34;
        // The wave of opening sacs crosses the patch from the left.
        const local = Math.min(1, Math.max(0, sacs * 2.2 - (x + 2.2) / 4.4 - 0.12 * random(`sac-d-${k}`)));
        const open = 0.3 + 0.7 * local * (0.9 + 0.1 * Math.sin(frame * 0.3 + k));
        const r = 0.15 * open;
        return <mesh key={k} position={[x, 0.012, z]} scale={[r / 0.1, 0.3 * (0.4 + 0.6 * open), r / 0.1]} geometry={UNIT} material={pigments[(i + j * 2) % 3]} castShadow />;
      })}
      {bumps > 0.01
        ? Array.from({ length: 44 }, (_, k) => {
            const x = (random(`pap-x-${k}`) - 0.5) * 4;
            const z = (random(`pap-z-${k}`) - 0.5) * 3;
            const rise = Math.min(1, Math.max(0, bumps * 1.8 - random(`pap-d-${k}`) * 0.8));
            const hgt = (0.16 + 0.2 * random(`pap-h-${k}`)) * rise * (1 + 0.04 * Math.sin(frame * 0.2 + k));
            return hgt > 0.01 ? <Part key={k} geo={G.sphere(0.1)} mat={bumpMat} position={[x, 0, z]} scale={[0.6, (hgt * 0.75) / 0.1, 0.6]} ink={INK_THIN} /> : null;
          })
        : null}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Giant clam
// ---------------------------------------------------------------------------
const valveCache = new Map<number, THREE.BufferGeometry>();
/** One valve: a flattened dome whose lip zigzags; `sign` picks the phase so two valves interlock when mirrored. */
const valveGeo = (sign: number) => {
  let g = valveCache.get(sign);
  if (!g) {
    g = new THREE.SphereGeometry(1, 64, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const v = Math.acos(Math.min(1, Math.max(-1, y))) / (Math.PI / 2);
      // Ribs fan out from the hinge at the back (z = -1).
      const a = Math.atan2(z + 1.0, x);
      const rib = Math.cos(a * 11);
      const front = Math.min(1, Math.max(0, (z + 0.5) / 0.9));
      const swell = 1 + 0.085 * rib * v;
      p.setXYZ(i, x * swell, y * 0.5 * (1 + 0.14 * rib * v) + sign * 0.12 * rib * v ** 3 * front, z * 0.74 * swell);
    }
    g.computeVertexNormals();
    valveCache.set(sign, g);
  }
  return g;
};

export const CLAM_HINGE_Z = -0.7;
/**
 * A giant clam lying like a chest: lower valve in the sand, upper valve hinged
 * at the back. `open` 0 = shut, 1 = gaping, with the mantle glowing inside.
 */
export const GiantClam: React.FC<{ position?: Vec3; yaw?: number; scale?: number; open: number; pitch?: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1, open, pitch = 0.16 }) => {
  const frame = useCurrentFrame();
  const shell = vinyl("#c4b596", "bone");
  const lining = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f3d9d2", roughness: 0.25, side: THREE.BackSide }), []);
  const pulse = (k: number) => 1 + 0.06 * Math.sin(frame * 0.12 + k * 0.9);
  const gape = Math.min(1, open * 1.4);
  return (
    <group position={position} rotation={[pitch, yaw, 0]} scale={scale}>
      <group position={[0, 0.5, 0]}>
        {/* Lower valve (mirrored). */}
        <group scale={[1, -1, 1]}>
          <Part geo={valveGeo(-1)} mat={shell} />
          <mesh geometry={valveGeo(-1)} material={lining} scale={0.96} />
        </group>
        {/* The animal: dark body and the wavy, sunlit mantle along the lip. */}
        {gape > 0.03 ? (
          <group scale={[1, gape, 1]}>
            <mesh geometry={G.sphere(0.72)} material={vinyl("#16364a", "skin")} scale={[1, 0.2, 0.66]} position={[0, 0.02, -0.02]} />
            {Array.from({ length: 15 }, (_, i) => {
              const a = -0.25 + (i / 14) * (Math.PI + 0.5);
              return (
                <group key={i} position={[Math.cos(a) * 0.82, 0.07, Math.sin(a) * 0.56 + 0.04]} scale={pulse(i)}>
                  <Part geo={G.sphere(0.15)} mat={vinyl(i % 2 ? "#1f9fb5" : "#2a6fd0", "gloss")} scale={[1, 0.6, 1]} ink={INK_THIN} />
                  <mesh geometry={G.sphere(0.035)} material={glow("#9dfbe8", 1.6)} position={[0, 0.085, 0.02]} />
                </group>
              );
            })}
            <Part geo={G.torus(0.09, 0.035)} mat={vinyl("#0f2030", "skin")} position={[-0.22, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} ink={false} />
            <Part geo={G.torus(0.07, 0.03)} mat={vinyl("#0f2030", "skin")} position={[0.24, 0.14, -0.05]} rotation={[Math.PI / 2, 0, 0]} ink={false} />
          </group>
        ) : null}
        {/* Upper valve on its hinge. */}
        <group position={[0, 0, CLAM_HINGE_Z]} rotation={[-open * 0.95, 0, 0]}>
          <group position={[0, 0, -CLAM_HINGE_Z]}>
            <Part geo={valveGeo(1)} mat={shell} />
            <mesh geometry={valveGeo(1)} material={lining} scale={0.96} />
          </group>
        </group>
        <Part geo={G.capsule(0.09, 0.7)} mat={vinyl("#8a7a62", "leather")} position={[0, 0, CLAM_HINGE_Z - 0.02]} rotation={[0, 0, Math.PI / 2]} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Hermit crab
// ---------------------------------------------------------------------------
/** An empty spiral snail shell; its opening faces +x at about [0.3, 0.2, 0]. */
export const SnailShell: React.FC<{ position?: Vec3; yaw?: number; scale?: number; roll?: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1, roll = 0 }) => {
  const a = vinyl("#efe2c4", "bone");
  const b = vinyl("#b9773f", "bone");
  return (
    <group position={position} rotation={[0, yaw, roll]} scale={scale}>
      {Array.from({ length: 9 }, (_, k) => {
        const t = k / 8;
        const ang = k * 1.05;
        const ring = 0.2 * (1 - t) ** 1.2;
        return <Part key={k} geo={UNIT} mat={k % 2 ? b : a} position={[-0.05 - t * 0.5 + Math.cos(ang) * ring * 0.4, 0.32 + Math.sin(ang) * ring + t * 0.12, Math.cos(ang) * ring]} scale={(0.32 * (1 - t * 0.82)) / 0.1} />;
      })}
      <mesh geometry={G.disc(0.2)} material={flat("#2b1a14")} position={[0.26, 0.26, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1.15, 1]} />
    </group>
  );
};

/**
 * A hermit crab facing +x. `shell` 0 = naked (soft curled abdomen showing),
 * 1 = wearing the shell. `step` is the walk phase (radians), `claw` lifts the big claw.
 */
export const HermitCrab: React.FC<{ position?: Vec3; yaw?: number; scale?: number; shell: number; step?: number; claw?: number; look?: [number, number] }> = ({
  position = [0, 0, 0],
  yaw = 0,
  scale = 1,
  shell,
  step = 0,
  claw = 0,
  look = [0, 0],
}) => {
  const red = vinyl("#e2573a", "gloss");
  const dark = vinyl("#a5331f", "gloss");
  const bob = 0.02 * Math.sin(step * 2);
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <group position={[0, bob, 0]}>
        {/* The soft abdomen that the shell protects. */}
        {shell < 0.95 ? (
          <Tentacle n={7} r0={0.17} r1={0.07} mat={vinyl("#f0b6a8", "skin")} path={(t) => [-0.2 - 0.5 * t + 0.12 * t * t, 0.24 - 0.12 * Math.sin(t * 2.6) + 0.02, 0.1 * Math.sin(t * 3)]} />
        ) : null}
        {shell > 0.02 ? <SnailShell position={[-0.26, 0.02, 0]} scale={shell * 0.68} roll={0.15} /> : null}
        <Part geo={G.sphere(0.2)} mat={red} position={[0, 0.25, 0]} scale={[1.2, 0.82, 1.05]} />
        {[-1, 1].map((s) => (
          <group key={s} position={[0.16, 0.36, s * 0.08]} rotation={[0, 0, -0.2]}>
            <Part geo={G.cyl(0.018, 0.022, 0.16, 8)} mat={dark} position={[0, 0.08, 0]} ink={INK_THIN} />
            <Eye position={[0, 0.18, 0]} r={0.055} color="#fff6dc" slit="round" look={look} yaw={0.8} />
          </group>
        ))}
        {/* Walking legs: two per side, stepping in opposite phase. */}
        {[-1, 1].map((s) =>
          [0, 1].map((k) => {
            const swing = 0.35 * Math.sin(step + (k + (s > 0 ? 1 : 0)) * Math.PI);
            return (
              <group key={`${s}${k}`} position={[0.04 - k * 0.14, 0.2, s * 0.17]} rotation={[s * -0.5, swing, 0]}>
                <Part geo={G.capsule(0.035, 0.22)} mat={red} position={[0, 0.03, s * 0.09]} rotation={[s * 1.0, 0, 0]} ink={INK_THIN} />
                <Part geo={G.cone(0.035, 0.24, 8)} mat={dark} position={[0, -0.07, s * 0.2]} rotation={[Math.PI + s * -0.2, 0, 0]} ink={INK_THIN} />
              </group>
            );
          }),
        )}
        {/* Claws: a big one and a small one. */}
        {[-1, 1].map((s) => {
          const big = s > 0 ? 1 : 0.62;
          return (
            <group key={s} position={[0.2, 0.2, s * 0.17]} rotation={[0, s * -0.35, claw * (s > 0 ? 0.9 : 0.3)]}>
              <Part geo={G.capsule(0.04, 0.2)} mat={red} position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
              <group position={[0.24, 0.02, 0]} scale={big}>
                <Part geo={G.sphere(0.11)} mat={red} scale={[1.25, 0.9, 0.8]} />
                <Part geo={G.cone(0.05, 0.17, 8)} mat={dark} position={[0.16, 0.035, 0]} rotation={[0, 0, -Math.PI / 2 + 0.25 + claw * 0.3]} ink={INK_THIN} />
                <Part geo={G.cone(0.04, 0.15, 8)} mat={dark} position={[0.15, -0.045, 0]} rotation={[0, 0, -Math.PI / 2 - 0.2]} ink={INK_THIN} />
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Crocodile
// ---------------------------------------------------------------------------
/** A crocodile facing +x, lying on y = 0 (the set's water covers most of it). `blink` 0..1 closes the eyes. */
export const Crocodile: React.FC<{ position?: Vec3; yaw?: number; scale?: number; blink?: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1, blink = 0 }) => {
  const hide = vinyl("#55703c", "leather");
  const dark = vinyl("#3c5229", "leather");
  const belly = vinyl("#c9c58a", "leather");
  const tooth = vinyl("#fff5dc", "bone");
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <Part geo={G.capsule(0.4, 2.5)} mat={hide} position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.92, 1, 1.25]} />
      <Part geo={G.capsule(0.3, 2.1)} mat={belly} position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.7, 1, 1.3]} ink={false} />
      <Tentacle n={12} r0={0.36} r1={0.05} mat={hide} path={(t) => [-1.1 - 2.3 * t, 0.36 - 0.2 * t, 0.55 * Math.sin(t * 2.4) * t]} />
      {/* Two rows of scutes down the back and along the tail. */}
      {Array.from({ length: 16 }, (_, i) => {
        const t = i / 15;
        const x = 1.0 - 3.9 * t;
        const onTail = x < -1.1;
        const tt = onTail ? (-1.1 - x) / 2.3 : 0;
        const y = onTail ? 0.36 - 0.2 * tt + 0.36 * (1 - tt * 0.86) : 0.78;
        const z = onTail ? 0.55 * Math.sin(tt * 2.4) * tt : 0;
        const size = onTail ? 1 - tt * 0.6 : 1;
        return [-1, 1].map((s) => (
          <Part key={`${i}${s}`} geo={G.cone(0.07, 0.16, 6)} mat={dark} position={[x, y, z + s * (onTail ? 0.05 : 0.2) * size]} scale={size} ink={INK_THIN} />
        ));
      })}
      {/* Skull and the long flat snout. */}
      <Part geo={G.sphere(0.36)} mat={hide} position={[1.34, 0.42, 0]} scale={[1.1, 0.85, 1.12]} />
      <Part geo={G.box(1.25, 0.2, 0.5, 0.09)} mat={hide} position={[2.1, 0.43, 0]} />
      <Part geo={G.box(1.15, 0.12, 0.44, 0.06)} mat={belly} position={[2.05, 0.29, 0]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Part geo={G.sphere(0.07)} mat={hide} position={[2.64, 0.55, s * 0.1]} ink={INK_THIN} />
          <Part geo={G.sphere(0.13)} mat={hide} position={[1.42, 0.72, s * 0.22]} />
          <Eye position={[1.47, 0.76, s * 0.27]} r={0.085} color="#d9e24a" open={1 - blink} yaw={s * 0.9} />
          {Array.from({ length: 8 }, (_, i) => (
            <Part key={i} geo={G.cone(0.028, 0.09, 6)} mat={tooth} position={[1.62 + i * 0.14, 0.31, s * 0.235]} rotation={[Math.PI, 0, 0]} ink={false} />
          ))}
        </group>
      ))}
      {/* Short legs splayed in the mud. */}
      {[-1, 1].map((s) =>
        [0.75, -0.8].map((x) => (
          <group key={`${s}${x}`} position={[x, 0.22, s * 0.5]}>
            <Part geo={G.capsule(0.12, 0.5)} mat={hide} rotation={[s * 0.9, 0, 0.3]} />
            <Part geo={G.sphere(0.14)} mat={dark} position={[0.08, -0.16, s * 0.24]} scale={[1.4, 0.5, 1]} />
          </group>
        )),
      )}
    </group>
  );
};
