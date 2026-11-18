import type React from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { inkMaterial } from "../characters/hero/ink";
import { tint } from "./common";
import { SnailShell, Tentacle, type Mood } from "./Creatures";

/**
 * The cast of the slime short: the slime itself (a translucent jelly dome you
 * can see into) and its real-world anchors: the slime mold, the snail that
 * overtakes it, the sea cucumber, the slug, the amoeba and your own stomach.
 * Same "ink & vinyl" toy style as the mimic cast; every one is posed by props,
 * so each is a pure function of the frame.
 */

const UNIT = G.sphere(0.1);

// ---------------------------------------------------------------------------
// The slime
// ---------------------------------------------------------------------------
export const SLIME = { r: 0.62, belly: 0.2, h: 0.72 };
export const SLIME_H = SLIME.belly + SLIME.h;
export const SLIME_COLOR = "#35d6b4";

/** Dome profile: a rounded belly on the floor, then a tall half-ellipse. */
const SLIME_PROFILE: [number, number][] = ([] as [number, number][]).concat(
  Array.from({ length: 9 }, (_, i): [number, number] => {
    const a = (i / 9) * (Math.PI / 2);
    return [SLIME.r * Math.sin(a), SLIME.belly * (1 - Math.cos(a))];
  }),
  Array.from({ length: 17 }, (_, i): [number, number] => {
    const a = (i / 16) * (Math.PI / 2);
    return [Math.max(0.0001, SLIME.r * Math.cos(a)), SLIME.belly + SLIME.h * Math.sin(a)];
  }),
);
const slimeGeo = () => G.lathe("bio-slime-dome", SLIME_PROFILE);

const jellyCache = new Map<string, THREE.Material>();
/**
 * Jelly you can see into. It writes depth, so the depth of field and the
 * ambient occlusion treat the slime as a solid body at its own distance.
 */
const jelly = (color: string, opacity: number) => {
  const key = `front:${color}:${opacity.toFixed(2)}`;
  let m = jellyCache.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity, depthWrite: true });
    jellyCache.set(key, m);
  }
  return m;
};
/** The far inside wall of the dome: what you see through the front. Hides the ink hull. */
const jellyBack = (color: string) => {
  const key = `back:${color}`;
  let m = jellyCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.5, side: THREE.BackSide });
    jellyCache.set(key, m);
  }
  return m;
};
const film = (color: string, opacity: number, emissive = 0) => {
  const key = `film:${color}:${opacity.toFixed(2)}:${emissive}`;
  let m = jellyCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.05, transparent: true, opacity, depthWrite: false });
    jellyCache.set(key, m);
  }
  return m;
};

/** Point on the dome's surface at height angle `up` (0 = belly line, PI/2 = top) and yaw `a`, pushed out by `out`. */
const onDome = (a: number, up: number, out = 0): Vec3 => {
  const rad = SLIME.r * Math.cos(up) + out;
  return [Math.sin(a) * rad, SLIME.belly + SLIME.h * Math.sin(up), Math.cos(a) * rad];
};
/** How far the dome's surface leans back at height angle `up`. */
const domeLean = (up: number) => Math.atan2(Math.sin(up) / SLIME.h, Math.cos(up) / SLIME.r);

export interface SlimeProps {
  position?: Vec3;
  yaw?: number;
  scale?: number;
  /** > 0 flattens it (a landing), < 0 stretches it up (a jump). */
  squash?: number;
  /** 0..1: the dome gives up and spreads into a puddle. */
  melt?: number;
  color?: string;
  mood?: Mood | "happy";
  look?: [number, number];
  /** 0..1 closes the eyes. */
  blink?: number;
  face?: boolean;
  /** 0..1: the one big glowing core. */
  core?: number;
  /** 0..1: many tiny cores spread through the whole body. */
  cores?: number;
  /** 0..1: a wet coat of mucus on the outside. */
  coat?: number;
  /** 0..1: the mucus lining on the inside. */
  lining?: number;
  /** 0..1: digestion bubbles. */
  bubbles?: number;
  /** Things inside it, in its own coordinates (origin on the floor under it). */
  children?: React.ReactNode;
}

export const Slime: React.FC<SlimeProps> = ({
  position = [0, 0, 0],
  yaw = 0,
  scale = 1,
  squash = 0,
  melt = 0,
  color = SLIME_COLOR,
  mood = "neutral",
  look = [0, 0],
  blink = 0,
  face = true,
  core = 1,
  cores = 0,
  coat = 0,
  lining = 0,
  bubbles = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const breathe = 0.018 * Math.sin(frame * 0.1) * (1 - melt);
  const sy = (1 - squash + breathe) * (1 - melt * 0.9);
  const sx = (1 + squash * 0.6 - breathe * 0.5) * (1 + melt * 0.75);
  const geo = slimeGeo();
  const dark = tint(color, "#0b2f3a", 0.5);
  const lid = (mood === "smug" ? 0.5 : mood === "sad" ? 0.6 : 1) * (1 - blink);
  const eyeW = mood === "shock" ? 0.1 : 0.075;
  const eyeH = mood === "shock" ? 0.13 : mood === "happy" ? 0.1 : 0.12;
  const EYE_UP = 0.5;
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <group scale={[sx, sy, sx]}>
        <mesh geometry={geo} material={inkMaterial()} />
        <mesh geometry={geo} material={jellyBack(dark)} />
        {/* The core, or the many small ones. */}
        {core > 0.03 ? (
          <group position={[0, 0.36, 0]} scale={core * (1 + 0.06 * Math.sin(frame * 0.16))}>
            <mesh geometry={G.sphere(0.13)} material={glow("#d8fff2", 2.2)} />
            <mesh geometry={G.sphere(0.19)} material={film("#9dfbe8", 0.3, 0.8)} />
          </group>
        ) : null}
        {cores > 0.01
          ? Array.from({ length: 26 }, (_, i) => {
              const show = Math.min(1, Math.max(0, cores * 26 - i));
              if (show <= 0) return null;
              const a = random(`slime-core-a-${i}`) * Math.PI * 2 + frame * 0.012 * (i % 2 ? 1 : -1);
              const d = 0.08 + random(`slime-core-d-${i}`) * 0.36;
              const y = 0.12 + random(`slime-core-y-${i}`) * 0.5;
              const room = 1 - (y / SLIME_H) ** 2 * 0.6;
              return (
                <mesh
                  key={i}
                  geometry={G.sphere(0.034)}
                  material={glow("#d8fff2", 2.2)}
                  position={[Math.cos(a) * d * room, y + 0.02 * Math.sin(frame * 0.09 + i), Math.sin(a) * d * room]}
                  scale={show * (0.8 + 0.4 * random(`slime-core-s-${i}`))}
                />
              );
            })
          : null}
        {bubbles > 0.01
          ? Array.from({ length: 14 }, (_, i) => {
              const period = 34 + random(`slime-bub-p-${i}`) * 30;
              const u = ((frame + random(`slime-bub-o-${i}`) * period) % period) / period;
              const a = random(`slime-bub-a-${i}`) * Math.PI * 2;
              const d = 0.1 + random(`slime-bub-d-${i}`) * 0.32;
              return (
                <mesh
                  key={i}
                  geometry={G.sphere(0.03)}
                  material={vinyl("#eafff6", "gloss")}
                  position={[Math.cos(a) * d * (1 - u * 0.5), 0.1 + u * 0.6, Math.sin(a) * d * (1 - u * 0.5)]}
                  scale={bubbles * (0.6 + random(`slime-bub-s-${i}`)) * Math.sin(Math.PI * u)}
                />
              );
            })
          : null}
        {children}
        {lining > 0.01 ? <mesh geometry={geo} material={film("#3fe6d4", 0.5, 1.1)} scale={0.84 + 0.04 * lining} position={[0, 0.03, 0]} renderOrder={1} /> : null}
        <mesh geometry={geo} material={jelly(color, 0.42)} renderOrder={2} castShadow />
        {coat > 0.01 ? (
          <>
            <mesh geometry={geo} material={film("#f2fffb", 0.12)} scale={1 + 0.02 * coat} renderOrder={3} />
            {Array.from({ length: 6 }, (_, i) => {
              const period = 46 + random(`slime-drip-p-${i}`) * 34;
              const u = ((frame + random(`slime-drip-o-${i}`) * period) % period) / period;
              const a = -1.2 + i * 0.48;
              const up = (1 - u) * 1.15;
              return <mesh key={i} geometry={G.sphere(0.02)} material={flat("#eafff8")} position={onDome(a, up, 0.012)} scale={[coat, coat * (1.3 + u), coat]} />;
            })}
          </>
        ) : null}
        {/* The face: two glossy eyes and a blush. No mouth. */}
        {face
          ? [-1, 1].map((s) => (
              <group key={s} rotation={[0, s * 0.36, 0]}>
                <group position={[0, onDome(0, EYE_UP)[1] + (mood === "sad" ? -0.03 : 0), onDome(0, EYE_UP, 0.026)[2]]} rotation={[-domeLean(EYE_UP), 0, mood === "sad" ? s * -0.3 : mood === "smug" ? s * 0.22 : 0]}>
                  <mesh geometry={G.disc(0.5)} material={flat("#0d1a22")} scale={[eyeW * 2, eyeH * 2 * Math.max(0.08, lid), 1]} />
                  {lid > 0.3 ? (
                    <>
                      <mesh geometry={G.disc(0.028)} material={flat("#ffffff")} position={[0.022 + look[0] * 0.02, 0.045 * lid + look[1] * 0.02, 0.004]} />
                      <mesh geometry={G.disc(0.013)} material={flat("#ffffff")} position={[-0.02 + look[0] * 0.02, -0.03 * lid + look[1] * 0.02, 0.004]} />
                    </>
                  ) : null}
                </group>
                <group position={[0, onDome(0, 0.2)[1], 0]} rotation={[0, s * 0.3, 0]}>
                  <mesh geometry={G.disc(0.5)} material={flat("#ff9fc4")} position={[0, 0, onDome(0, 0.2, 0.024)[2]]} rotation={[-domeLean(0.2), 0, 0]} scale={[0.12, 0.06, 1]} />
                </group>
              </group>
            ))
          : null}
        {/* A wet highlight on the shoulder of the dome. */}
        <group rotation={[0, -0.75, 0]}>
          <mesh geometry={G.disc(0.5)} material={flat("#f4fffb")} position={onDome(0, 0.95, 0.012)} rotation={[-domeLean(0.95), 0, 0.5]} scale={[0.17, 0.07, 1]} />
        </group>
      </group>
    </group>
  );
};

/** What is left of a slime after a morning in the sun. */
export const Stain: React.FC<{ position?: Vec3; amount: number; color?: string }> = ({ position = [0, 0, 0], amount, color = "#3b5a52" }) =>
  amount > 0.02 ? (
    <group position={position}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const d = i === 0 ? 0 : 0.35 + 0.3 * random(`stain-d-${i}`);
        const r = (i === 0 ? 0.62 : 0.2 + 0.22 * random(`stain-r-${i}`)) * amount;
        return (
          <mesh key={i} position={[Math.cos(a) * d * amount, 0.008 + i * 0.0006, Math.sin(a) * d * amount]} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r * 0.8, 1]}>
            <circleGeometry args={[1, 24]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  ) : null;

// ---------------------------------------------------------------------------
// Slime mold
// ---------------------------------------------------------------------------
const MOLD = "#f4c21f";
const VEINS: { a: number; len: number; bend: number; twigs: [number, number, number][] }[] = [
  { a: -1.15, len: 1.25, bend: 0.3, twigs: [[0.55, -0.6, 0.5]] },
  { a: -0.6, len: 1.6, bend: -0.22, twigs: [[0.45, 0.5, 0.55], [0.75, -0.55, 0.4]] },
  { a: -0.08, len: 1.85, bend: 0.18, twigs: [[0.4, -0.5, 0.6], [0.7, 0.55, 0.45]] },
  { a: 0.5, len: 1.6, bend: 0.25, twigs: [[0.5, 0.6, 0.55], [0.78, -0.45, 0.35]] },
  { a: 1.1, len: 1.2, bend: -0.3, twigs: [[0.55, 0.6, 0.45]] },
];
/**
 * A slime mold spreading over a flat surface (y = 0) toward +x. `grow` (0..1)
 * extends the veins; `flow` (-1..1) is where the pulse of pumped fluid sits
 * along each vein (out at +1, back at -1); `nuclei` (0..1) lights up the cores
 * riding the stream.
 */
export const SlimeMold: React.FC<{ position?: Vec3; yaw?: number; scale?: number; grow?: number; flow?: number; nuclei?: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1, grow = 1, flow = 0, nuclei = 0 }) => {
  const frame = useCurrentFrame();
  const mat = vinyl(MOLD, "gloss");
  const pale = vinyl("#ffe46b", "gloss");
  const u = 0.5 + 0.5 * flow;
  const pulse = (t: number) => 1 + 0.75 * Math.exp(-(((t - u) / 0.17) ** 2));
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <group scale={[1, 0.42, 1]}>
        <Part geo={G.sphere(0.34)} mat={mat} position={[-0.05, 0.05, 0]} scale={[1.1, 1, 1.25]} />
        {VEINS.map((v, i) => {
          const len = v.len * grow;
          const at = (t: number): Vec3 => {
            const a = v.a + v.bend * Math.sin(t * 2.4 + i);
            return [Math.cos(a) * len * t, 0.05, Math.sin(a) * len * t];
          };
          return (
            <group key={i}>
              <Tentacle n={30} r0={0.1} r1={0.05} mat={mat} path={at} radius={(t) => (0.1 - 0.05 * t) * pulse(t)} ink={INK_THIN} />
              {v.twigs.map(([from, turn, l], k) => {
                const root = at(from);
                const a = v.a + turn;
                return (
                  <Tentacle
                    key={k}
                    n={14}
                    r0={0.06}
                    r1={0.03}
                    mat={mat}
                    ink={INK_THIN}
                    path={(t) => [root[0] + Math.cos(a) * l * grow * t, 0.05, root[2] + Math.sin(a) * l * grow * t]}
                    radius={(t) => (0.06 - 0.03 * t) * pulse(from + t * 0.3)}
                  />
                );
              })}
              {/* The advancing front: a soft fan at the tip of every vein. */}
              <Part geo={UNIT} mat={pale} position={at(1)} scale={[1.7 * pulse(1), 0.9, 2.1 * pulse(1)]} ink={INK_THIN} />
            </group>
          );
        })}
      </group>
      {nuclei > 0.01
        ? VEINS.map((v, i) =>
            Array.from({ length: 7 }, (_, k) => {
              const t = (((k / 7 + frame * 0.006 * (i % 2 ? 1 : 0.7)) % 1) + 1) % 1;
              const a = v.a + v.bend * Math.sin(t * 2.4 + i);
              const show = Math.min(1, Math.max(0, nuclei * 9 - (k + i) * 0.7));
              return show > 0 ? (
                <mesh key={`${i}-${k}`} geometry={G.sphere(0.03)} material={glow("#fffbd0", 2.6)} position={[Math.cos(a) * v.len * grow * t, 0.075, Math.sin(a) * v.len * grow * t]} scale={show} />
              ) : null;
            }),
          )
        : null}
    </group>
  );
};

/** An eye on a stalk (snails, slugs). */
const StalkEye: React.FC<{ position: Vec3; lean: Vec3; length?: number; mat: THREE.Material }> = ({ position, lean, length = 0.26, mat }) => (
  <group position={position} rotation={lean}>
    <Part geo={G.cyl(0.02, 0.028, length, 8)} mat={mat} position={[0, length / 2, 0]} ink={INK_THIN} />
    <Part geo={G.sphere(0.05)} mat={vinyl("#fff6dc", "gloss")} position={[0, length + 0.02, 0]} ink={INK_THIN} />
    <mesh geometry={G.sphere(0.024)} material={flat("#170d12")} position={[0.03, length + 0.03, 0.02]} />
  </group>
);

/** A garden snail facing +x: the animal that overtakes the slime mold. `step` is the crawl phase. */
export const Snail: React.FC<{ position?: Vec3; yaw?: number; scale?: number; step?: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1, step = 0 }) => {
  const skin = vinyl("#d9b98a", "skin");
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <Tentacle n={10} r0={0.07} r1={0.13} mat={skin} path={(t) => [-0.55 + 1.2 * t, 0.09 + 0.012 * Math.sin(step - t * 7) + 0.1 * Math.max(0, t - 0.75), 0]} />
      <SnailShell position={[-0.02, 0.1, 0]} scale={0.95} roll={0.1} />
      <StalkEye position={[0.66, 0.2, 0.06]} lean={[0.25, 0, -0.45 + 0.08 * Math.sin(step * 0.5)]} mat={skin} />
      <StalkEye position={[0.66, 0.2, -0.06]} lean={[-0.25, 0, -0.45 - 0.08 * Math.sin(step * 0.5)]} mat={skin} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Sea cucumber
// ---------------------------------------------------------------------------
export const CUCUMBER = { half: 1.3, rest: 0.9 };
/**
 * A sea cucumber lying along x across the top of a rock (top at `CUCUMBER.rest`).
 * `soft` 0 = stiff as a log, ends in the open water; 1 = limp, draped over the rock.
 */
export const SeaCucumber: React.FC<{ position?: Vec3; yaw?: number; scale?: number; soft: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1, soft }) => {
  const frame = useCurrentFrame();
  const skin = vinyl(tint("#d5482f", "#e0705c", soft), "skin");
  const knob = vinyl("#f6cf6a", "skin");
  const N = 17;
  const at = (t: number): Vec3 => {
    const x = (t * 2 - 1) * CUCUMBER.half;
    const k = Math.abs(x) / CUCUMBER.half;
    const stiffY = CUCUMBER.rest + 0.08;
    const softY = Math.max(0.16, CUCUMBER.rest + 0.2 - 0.95 * k ** 1.7) + 0.012 * Math.sin(frame * 0.12 + t * 9);
    return [x * (1 - 0.06 * soft), stiffY + (softY - stiffY) * soft, 0.1 * soft * Math.sin(t * 5)];
  };
  const radius = (t: number) => (0.2 + 0.12 * Math.sin(Math.PI * t) ** 0.6) * (1 - 0.14 * soft);
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <group scale={[1, 1 - 0.18 * soft, 1 + 0.2 * soft]}>
        <Tentacle n={N} r0={0.2} r1={0.2} mat={skin} path={at} radius={radius} />
        {/* Rows of warts down the back: standing up when stiff, flat when soft. */}
        {Array.from({ length: 13 }, (_, i) => {
          const t = 0.08 + (i / 12) * 0.84;
          const p = at(t);
          const r = radius(t);
          return [-1, 1].map((s) => (
            <Part key={`${i}${s}`} geo={G.cone(0.055, 0.16, 8)} mat={knob} position={[p[0], p[1] + r * 0.86, p[2] + s * r * 0.45]} rotation={[s * 0.45, 0, 0]} scale={[1, 1 - 0.7 * soft, 1]} ink={INK_THIN} />
          ));
        })}
        {/* The ring of feeding tentacles around the mouth. */}
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          const p = at(1);
          return (
            <Part
              key={i}
              geo={G.capsule(0.03, 0.2)}
              mat={knob}
              position={[p[0] + 0.2, p[1] + Math.sin(a) * 0.11, p[2] + Math.cos(a) * 0.11]}
              rotation={[0, 0, -Math.PI / 2 + Math.sin(a) * 0.5 + 0.2 * Math.sin(frame * 0.15 + i)]}
              ink={INK_THIN}
            />
          );
        })}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------
/** A slug gliding toward +x on y = 0, laying its trail of mucus. `trail` is the length of wet trail behind it. */
export const Slug: React.FC<{ position?: Vec3; yaw?: number; scale?: number; trail?: number }> = ({ position = [0, 0, 0], yaw = 0, scale = 1, trail = 0 }) => {
  const frame = useCurrentFrame();
  const skin = vinyl("#f09a3e", "gloss");
  const dark = vinyl("#b8611f", "gloss");
  const at = (t: number): Vec3 => [-0.95 + 1.7 * t, 0.1 + 0.07 * Math.sin(Math.PI * t) + 0.012 * Math.sin(frame * 0.3 - t * 8) + 0.12 * Math.max(0, t - 0.82), 0];
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {trail > 0.02 ? (
        <>
          {Array.from({ length: 12 }, (_, i) => {
            const x = -0.9 - (i / 11) * trail;
            return (
              <mesh key={i} position={[x, 0.006 + i * 0.0004, 0.03 * Math.sin(i * 1.9)]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.26, 0.16 - i * 0.004, 1]} material={film("#e9fbff", 0.5, 0.25)}>
                <circleGeometry args={[1, 20]} />
              </mesh>
            );
          })}
        </>
      ) : null}
      <Tentacle n={14} r0={0.05} r1={0.13} mat={skin} path={at} radius={(t) => 0.05 + 0.15 * Math.sin(Math.PI * (0.08 + 0.62 * t)) ** 0.7} />
      {/* The mantle: the saddle on its back. */}
      <Part geo={G.sphere(0.2)} mat={dark} position={[0.25, 0.27, 0]} scale={[1.5, 0.62, 0.95]} />
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={G.sphere(0.035)} material={dark} position={[-0.62 + i * 0.16, 0.2 + 0.05 * Math.sin(i * 1.3), 0.11 * (i % 2 ? 1 : -1)]} scale={[1.4, 0.5, 1]} />
      ))}
      <StalkEye position={[0.72, 0.27, 0.07]} lean={[0.3, 0, -0.5 + 0.1 * Math.sin(frame * 0.07)]} length={0.22} mat={skin} />
      <StalkEye position={[0.72, 0.27, -0.07]} lean={[-0.3, 0, -0.5 - 0.1 * Math.sin(frame * 0.07 + 1)]} length={0.22} mat={skin} />
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.capsule(0.02, 0.12)} mat={skin} position={[0.86, 0.14, s * 0.05]} rotation={[0, 0, -1.2]} ink={INK_THIN} />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Amoeba (seen from above, lying on y = 0)
// ---------------------------------------------------------------------------
/**
 * An amoeba under the microscope. Its food sits at `food` (x, z). `reach`
 * (0..1) sends two arms out around it, `close` (0..1) brings their tips
 * together beyond it.
 */
export const Amoeba: React.FC<{ position?: Vec3; food: [number, number]; reach: number; close: number; gulp?: number }> = ({ position = [0, 0, 0], food, reach, close, gulp = 0 }) => {
  const frame = useCurrentFrame();
  const body = vinyl("#9fb2f2", "gloss");
  const dist = Math.hypot(food[0], food[1]);
  const dir = Math.atan2(food[1], food[0]);
  const arm = (s: number) => (t: number): Vec3 => {
    // Out past the food on one side, then curling in behind it.
    const open = 0.62 - 0.5 * close;
    const a = dir + s * open * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - 0.35 * t);
    const d = 0.45 + (dist + 0.55 * close) * reach * t;
    const hook = s * -0.5 * close * t * t;
    return [Math.cos(a + hook) * d, 0.1, Math.sin(a + hook) * d];
  };
  return (
    <group position={position}>
      <group scale={[1, 0.3, 1]}>
        <Part geo={G.sphere(0.72)} mat={body} scale={[1 + 0.12 * gulp, 1, 1 + 0.12 * gulp]} />
        {Array.from({ length: 7 }, (_, i) => {
          const a = dir + Math.PI * 0.45 + (i / 6) * Math.PI * 1.1;
          const d = 0.6 + 0.12 * Math.sin(frame * 0.06 + i * 2.1);
          return <Part key={i} geo={G.sphere(0.34)} mat={body} position={[Math.cos(a) * d, 0, Math.sin(a) * d]} scale={[1 + 0.2 * Math.sin(frame * 0.05 + i), 1, 1]} />;
        })}
        {reach > 0.02 ? [-1, 1].map((s) => <Tentacle key={s} n={12} r0={0.32} r1={0.17} mat={body} path={arm(s)} />) : null}
      </group>
      {/* Nucleus and a few vacuoles, lying on top of the flat body. */}
      <mesh geometry={G.sphere(0.2)} material={vinyl("#5a45b8", "gloss")} position={[-0.15 * Math.cos(dir), 0.2, -0.15 * Math.sin(dir)]} scale={[1, 0.3, 1]} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} geometry={G.sphere(0.07 + 0.03 * (i % 2))} material={vinyl("#e6eeff", "gloss")} position={[0.4 * Math.cos(dir + 2 + i * 1.1), 0.2, 0.4 * Math.sin(dir + 2 + i * 1.1)]} scale={[1, 0.3, 1]} />
      ))}
    </group>
  );
};

/** A single green alga with a whip of a tail: the amoeba's dinner. */
export const Alga: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <group position={position} scale={scale}>
      <Part geo={G.sphere(0.2)} mat={vinyl("#58d36c", "gloss")} scale={[1.2, 0.5, 1]} />
      <mesh geometry={G.sphere(0.06)} material={vinyl("#f2a23a", "gloss")} position={[0.1, 0.09, 0.03]} scale={[1, 0.4, 1]} />
      <Tentacle n={8} r0={0.03} r1={0.012} mat={vinyl("#3aa851", "gloss")} ink={false} path={(t) => [0.22 + 0.45 * t, 0.02, 0.1 * Math.sin(frame * 0.5 + t * 6) * t]} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Your own stomach (a cross-section standing in the studio)
// ---------------------------------------------------------------------------
const STOMACH_N = 22;
/** Centre line of the stomach: gullet in at the top, the bag curving down and across, out at the lower right. */
const stomachAt = (t: number): [number, number] => {
  if (t < 0.16) return [-0.3, 2.85 - 0.55 * (t / 0.16)];
  const s = (t - 0.16) / 0.84;
  const q = (a: number, c: number, b: number) => (1 - s) ** 2 * a + 2 * (1 - s) * s * c + s * s * b;
  return [q(-0.3, -0.5, 0.95), q(2.3, 0.85, 1.3)];
};
const stomachR = (t: number) => (t < 0.16 ? 0.15 : 0.15 + 0.42 * Math.sin(Math.PI * Math.min(1, ((t - 0.16) / 0.84) * 1.1)) ** 0.7);
/**
 * The stomach cut open from the front: muscle wall, the mucus lining (cyan),
 * the cavity and the acid pooled in it. `renew` (0..1) runs a wave of fresh
 * lining along the wall; `lining` (0..1) fades the lining in.
 */
export const Stomach: React.FC<{ position?: Vec3; scale?: number; lining?: number; renew?: number }> = ({ position = [0, 0, 0], scale = 1, lining = 1, renew = -1 }) => {
  const frame = useCurrentFrame();
  const wall = vinyl("#e58a8f", "skin");
  const cavity = vinyl("#6e1f33", "skin");
  const mucus = vinyl("#3fe6d4", "gloss");
  const fresh = vinyl("#d6fff8", "gloss");
  const ts = Array.from({ length: STOMACH_N }, (_, i) => i / (STOMACH_N - 1));
  const ACID_Y = 1.55 + 0.02 * Math.sin(frame * 0.12);
  return (
    <group position={position} scale={scale}>
      <group scale={[1, 1, 0.5]}>
        <Tentacle n={STOMACH_N} r0={0.2} r1={0.2} mat={wall} path={(t) => [stomachAt(t)[0], stomachAt(t)[1], 0]} radius={stomachR} />
      </group>
      {lining > 0.02 ? (
        <group position={[0, 0, 0.17]} scale={[1, 1, 0.3]}>
          {ts.map((t, i) => {
            const wave = renew >= 0 ? Math.exp(-(((t - renew) / 0.09) ** 2)) : 0;
            const p = stomachAt(t);
            return <mesh key={i} geometry={UNIT} material={wave > 0.5 ? fresh : mucus} position={[p[0], p[1], 0]} scale={(stomachR(t) * 0.86 * lining * (1 + 0.1 * wave)) / 0.1} />;
          })}
        </group>
      ) : null}
      <group position={[0, 0, 0.25]} scale={[1, 1, 0.2]}>
        <Tentacle n={STOMACH_N} r0={0.2} r1={0.2} mat={cavity} ink={false} path={(t) => [stomachAt(t)[0], stomachAt(t)[1], 0]} radius={(t) => stomachR(t) * 0.62} />
      </group>
      {/* The acid: everything in the cavity below the waterline. */}
      <group position={[0, 0, 0.3]} scale={[1, 1, 0.12]}>
        {ts.map((t, i) => {
          const p = stomachAt(t);
          const r = stomachR(t) * 0.56;
          return p[1] - r * 0.3 < ACID_Y ? <mesh key={i} geometry={UNIT} material={vinyl("#c4e23c", "gloss")} position={[p[0], Math.min(p[1], ACID_Y - r * 0.55), 0]} scale={[r / 0.1, (r * 0.8) / 0.1, r / 0.1]} /> : null;
        })}
      </group>
      {Array.from({ length: 8 }, (_, i) => {
        const period = 30 + random(`acid-p-${i}`) * 26;
        const u = ((frame + random(`acid-o-${i}`) * period) % period) / period;
        return <mesh key={i} geometry={G.sphere(0.03)} material={vinyl("#f2ffb0", "gloss")} position={[-0.3 + random(`acid-x-${i}`) * 0.8, 1.15 + u * 0.36, 0.36]} scale={Math.sin(Math.PI * u)} />;
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// The door the slime pours under
// ---------------------------------------------------------------------------
export const DOOR = { z: -0.6, gap: 0.11, width: 1.5, height: 2.5, thick: 0.34 };
/**
 * A wall across the vault (in the plane z = DOOR.z, facing the camera) with a
 * plank door in it. The door hangs `DOOR.gap` above the flagstones.
 */
export const DoorWall: React.FC<{ rattle?: number }> = ({ rattle = 0 }) => {
  const stone = vinyl("#575c6c", "cloth");
  const iron = vinyl("#4b5160", "leather");
  const { z, gap, width, height, thick } = DOOR;
  const side = 4.0;
  return (
    <group position={[0, 0, z]}>
      {/* Wall on both sides of the doorway and the lintel over it. */}
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.box(side, 5.2, thick, 0.05)} mat={stone} position={[s * (width / 2 + side / 2), 2.6, 0]} />
      ))}
      <Part geo={G.box(width + 0.3, 5.2 - height, thick + 0.06, 0.06)} mat={stone} position={[0, height + (5.2 - height) / 2, 0]} />
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.box(0.16, height, thick + 0.1, 0.04)} mat={vinyl("#6e7386", "cloth")} position={[s * (width / 2 - 0.02), height / 2, 0]} />
      ))}
      <Part geo={G.box(width + 0.2, 0.18, thick + 0.1, 0.04)} mat={vinyl("#6e7386", "cloth")} position={[0, height + 0.05, 0]} />
      {/* The dark of the next room through the gap. */}
      <mesh position={[0, gap / 2, 0.02]}>
        <planeGeometry args={[width - 0.2, gap]} />
        <meshBasicMaterial color="#07080c" />
      </mesh>
      <group rotation={[rattle * 0.012, 0, 0]}>
        {[-2, -1, 0, 1, 2].map((i) => (
          <Part key={i} geo={G.box((width - 0.2) / 5 - 0.012, height - gap - 0.04, 0.12, 0.02)} mat={vinyl(i % 2 ? "#8a5a2a" : "#7a4e24", "wood")} position={[(i * (width - 0.2)) / 5, gap + (height - gap) / 2, 0.06]} ink={INK_THIN} />
        ))}
        {[0.55, 1.95].map((y) => (
          <Part key={y} geo={G.box(width - 0.16, 0.14, 0.16, 0.03)} mat={iron} position={[0, y, 0.08]} ink={INK_THIN} />
        ))}
        <Part geo={G.torus(0.1, 0.025)} mat={vinyl("#c9a13c", "gloss")} position={[width / 2 - 0.36, 1.25, 0.16]} ink={INK_THIN} />
      </group>
    </group>
  );
};
