import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";

/**
 * The family's backyard on the Connecticut shore, in the ink & vinyl look:
 * lawn, a swing set, the porch, Grandpa's hedge, and Tess's birthday party
 * (table, cake with candles, balloons, bunting). Everything faces +z and is a
 * pure function of its props.
 */

const std = (color: string, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

/** Mown lawn with soft stripes, out to the horizon. */
export const Lawn: React.FC<{ size?: number; color?: string }> = ({ size = 400, color = "#86b95a" }) => {
  const base = useMemo(() => std(color), [color]);
  const stripe = useMemo(() => std("#93c466"), []);
  return (
    <group>
      <mesh material={base} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} material={stripe} rotation={[-Math.PI / 2, 0, 0]} position={[-18 + i * 4, 0.005, -4]} receiveShadow>
          <planeGeometry args={[2, 36]} />
        </mesh>
      ))}
    </group>
  );
};

/** A round leafy tree. */
export const Tree: React.FC<{ position: Vec3; scale?: number; seed?: number; color?: string }> = ({ position, scale = 1, seed = 0, color = "#5f9442" }) => (
  <group position={position} scale={scale}>
    <Part geo={G.cyl(0.16, 0.24, 2.2, 10)} mat={vinyl("#6b4a2e", "wood")} position={[0, 1.1, 0]} ink={INK_THIN} />
    <Part geo={G.sphere(1.4)} mat={vinyl(color, "cloth")} position={[0, 3.0, 0]} ink={INK_THIN} />
    <Part geo={G.sphere(0.95)} mat={vinyl(seed % 2 ? "#6fa64e" : "#548a3a", "cloth")} position={[0.8, 2.6, 0.3]} ink={INK_THIN} />
    <Part geo={G.sphere(0.8)} mat={vinyl("#6fa64e", "cloth")} position={[-0.7, 2.5, -0.2]} ink={INK_THIN} />
  </group>
);

// ---------------------------------------------------------------------------
// Swing set: two A-frames joined by a top beam along x; one seat swings about
// the beam at `angle` (radians, + swings toward +z).
// ---------------------------------------------------------------------------
export const SWING = { beamY: 2.5, chain: 2.0, width: 3.2 } as const;

/** Seat position relative to the swing set origin for a swing angle. */
export const swingSeat = (angle: number): Vec3 => [0, SWING.beamY - Math.cos(angle) * SWING.chain, Math.sin(angle) * SWING.chain];

export const SwingSet: React.FC<{ position: Vec3; angle: number; rotationY?: number; empty?: boolean }> = ({ position, angle, rotationY = 0, empty }) => {
  const frame = vinyl("#d9534f", "gloss");
  const chain = vinyl("#9aa3ad", "leather");
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[(s * SWING.width) / 2, 0, 0]}>
          {([-1, 1] as const).map((k) => (
            <Part key={k} geo={G.cyl(0.07, 0.07, 2.75, 10)} mat={frame} position={[0, 1.25, k * 0.55]} rotation={[k * -0.42, 0, 0]} ink={INK_THIN} />
          ))}
        </group>
      ))}
      <Part geo={G.cyl(0.08, 0.08, SWING.width + 0.4, 12)} mat={frame} position={[0, SWING.beamY, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
      <group position={[0, SWING.beamY, 0]} rotation={[-angle, 0, 0]}>
        {([-1, 1] as const).map((s) => (
          <mesh key={s} geometry={G.cyl(0.015, 0.015, SWING.chain, 6)} material={chain} position={[s * 0.32, -SWING.chain / 2, 0]} />
        ))}
        {!empty ? <Part geo={G.box(0.78, 0.07, 0.34, 0.03)} mat={vinyl("#2e3442", "leather")} position={[0, -SWING.chain, 0]} ink={INK_THIN} /> : null}
      </group>
      {/* A second, still swing for scale */}
      <group position={[-1.0, SWING.beamY, 0]}>
        {([-1, 1] as const).map((s) => (
          <mesh key={s} geometry={G.cyl(0.015, 0.015, SWING.chain, 6)} material={chain} position={[s * 0.28, -SWING.chain / 2, 0]} />
        ))}
        <Part geo={G.box(0.66, 0.07, 0.32, 0.03)} mat={vinyl("#f2c14e", "leather")} position={[0, -SWING.chain, 0]} ink={INK_THIN} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Grandpa's hedge: a row of rounded box bushes along x. `hit` (0..1) shoves
// the bushes around `hitX` back and scatters leaves.
// ---------------------------------------------------------------------------
export const HEDGE_H = 1.25;

export const Hedge: React.FC<{ position: Vec3; length: number; hit?: number; hitX?: number; frame?: number }> = ({ position, length, hit = 0, hitX = 0, frame = 0 }) => {
  const n = Math.round(length / 1.1);
  const shake = hit > 0 && hit < 1 ? Math.sin(frame * 1.7) * (1 - hit) * 0.12 : 0;
  return (
    <group position={position}>
      {Array.from({ length: n }, (_, i) => {
        const x = -length / 2 + (i + 0.5) * (length / n);
        const near = Math.max(0, 1 - Math.abs(x - hitX) / 1.6);
        const push = near * Math.min(1, hit * 3) * 0.35;
        return (
          <Part
            key={i}
            geo={G.box(1.3, HEDGE_H, 1.0, 0.42)}
            mat={vinyl(i % 3 ? "#4f8a3b" : "#5c9a44", "cloth")}
            position={[x + shake * near, HEDGE_H / 2, -push]}
            rotation={[-push * 0.6, 0, shake * near]}
            scale={[1, 1 + (random(`hedge${i}`) - 0.5) * 0.12, 1]}
            ink={INK_THIN}
          />
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Back of the house with a wooden porch: deck, two steps, rail posts.
// ---------------------------------------------------------------------------
export const PORCH_TOP = 0.5;

export const HouseBack: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 12 }) => {
  const roof = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2 - 0.4, 0);
    s.lineTo(0, 2.6);
    s.lineTo(width / 2 + 0.4, 0);
    s.lineTo(-width / 2 - 0.4, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 7, bevelEnabled: false });
    g.translate(0, 0, -3.5);
    return g;
  }, [width]);
  const deck = vinyl("#b98b5a", "wood");
  return (
    <group position={position}>
      {/* House wall (clapboard blue) and roof */}
      <mesh geometry={G.box(width, 4.6, 6, 0.1)} material={std("#9cc0d8")} position={[0, 2.3, -3]} castShadow receiveShadow />
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} geometry={G.box(width + 0.02, 0.04, 0.02, 0.01)} material={std("#86aac4")} position={[0, 0.6 + i * 0.45, 0.01]} />
      ))}
      <mesh geometry={roof} material={std("#7a4a40", 0.7)} position={[0, 4.6, -3]} castShadow />
      {/* Back door and windows */}
      <mesh geometry={G.box(1.0, 2.0, 0.06, 0.02)} material={std("#f2eadb")} position={[-1.2, PORCH_TOP + 1.0, 0.03]} />
      <mesh geometry={G.box(0.6, 1.0, 0.04, 0.02)} material={std("#4a6a8a", 0.3)} position={[-1.2, PORCH_TOP + 1.35, 0.07]} />
      {[1.6, 4.0, -4.0].map((x) => (
        <group key={x} position={[x, 2.4, 0.04]}>
          <mesh geometry={G.box(1.2, 1.2, 0.05, 0.02)} material={std("#f2eadb")} />
          <mesh geometry={G.box(1.0, 1.0, 0.05, 0.02)} material={std("#4a6a8a", 0.3)} position={[0, 0, 0.02]} />
        </group>
      ))}
      {/* Porch deck, steps, posts and rail */}
      <Part geo={G.box(6, PORCH_TOP, 2.4, 0.05)} mat={deck} position={[-0.6, PORCH_TOP / 2, 1.2]} ink={INK_THIN} />
      {[0, 1].map((k) => (
        <Part key={k} geo={G.box(1.6, PORCH_TOP * (0.66 - k * 0.33), 0.4, 0.03)} mat={deck} position={[-1.2, (PORCH_TOP * (0.66 - k * 0.33)) / 2, 2.6 + k * 0.4]} ink={INK_THIN} />
      ))}
      {[-3.4, 2.2].map((x) => (
        <Part key={x} geo={G.box(0.14, 2.4, 0.14, 0.03)} mat={vinyl("#f2eadb", "wood")} position={[x, PORCH_TOP + 1.2, 2.3]} ink={INK_THIN} />
      ))}
      <Part geo={G.box(5.6, 0.1, 0.1, 0.03)} mat={vinyl("#f2eadb", "wood")} position={[-0.6, PORCH_TOP + 0.85, 2.3]} ink={INK_THIN} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// The party: a table with a striped cloth, the cake, balloons and bunting.
// ---------------------------------------------------------------------------
export const TABLE_TOP = 0.78;

/** Cake on the table: three tiers, nine candles; `lit` 0..1 (flames shrink as she blows), `frame` flickers. */
export const Cake: React.FC<{ position: Vec3; lit: number; frame: number; blow?: number }> = ({ position, lit, frame, blow = 0 }) => (
  <group position={position}>
    <Part geo={G.cyl(0.36, 0.36, 0.03, 28)} mat={vinyl("#f4f1e8", "gloss")} ink={INK_THIN} />
    <Part geo={G.cyl(0.3, 0.3, 0.2, 28)} mat={vinyl("#f6c8d6", "cloth")} position={[0, 0.12, 0]} ink={INK_THIN} />
    <Part geo={G.cyl(0.31, 0.31, 0.04, 28)} mat={vinyl("#ffffff", "gloss")} position={[0, 0.22, 0]} ink={INK_THIN} />
    <Part geo={G.cyl(0.2, 0.2, 0.16, 24)} mat={vinyl("#ffe08a", "cloth")} position={[0, 0.32, 0]} ink={INK_THIN} />
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const flick = 1 + Math.sin(frame * 0.9 + i * 1.7) * 0.15;
      const lean = blow * 0.8;
      return (
        <group key={i} position={[Math.cos(a) * 0.13, 0.4, Math.sin(a) * 0.13]}>
          <mesh geometry={G.cyl(0.012, 0.012, 0.12, 6)} material={flat(["#e94f64", "#33c2bd", "#f2c14e"][i % 3])} position={[0, 0.06, 0]} />
          {lit > 0.02 ? (
            <mesh geometry={G.sphere(0.022)} material={glow("#ffb347", 3)} position={[lean * 0.03, 0.15, -lean * 0.02]} scale={[0.8 * lit, 1.6 * lit * flick, 0.8 * lit]} />
          ) : null}
        </group>
      );
    })}
  </group>
);

export const PartyTable: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 2.6 }) => {
  const cloth = vinyl("#f4f1e8", "cloth");
  return (
    <group position={position}>
      <Part geo={G.box(width, 0.06, 1.1, 0.03)} mat={cloth} position={[0, TABLE_TOP, 0]} ink={INK_THIN} />
      {/* Striped skirt */}
      {Array.from({ length: Math.round(width / 0.26) }, (_, i) => (
        <mesh key={i} geometry={G.box(0.26, 0.3, 0.02, 0.01)} material={vinyl(i % 2 ? "#e94f64" : "#ffffff", "cloth")} position={[-width / 2 + 0.13 + i * 0.26, TABLE_TOP - 0.16, 0.56]} />
      ))}
      {([-1, 1] as const).map((s) => (
        <Part key={s} geo={G.box(0.08, TABLE_TOP, 0.9, 0.02)} mat={vinyl("#c9a46a", "wood")} position={[s * (width / 2 - 0.15), TABLE_TOP / 2, 0]} ink={INK_THIN} />
      ))}
      {/* Cups and a present */}
      {[-0.9, -0.7, 0.8].map((x) => (
        <mesh key={x} geometry={G.cyl(0.05, 0.04, 0.12, 10)} material={vinyl(x > 0 ? "#33c2bd" : "#f27a2e", "gloss")} position={[x, TABLE_TOP + 0.09, 0.25]} />
      ))}
      <Part geo={G.box(0.3, 0.24, 0.3, 0.03)} mat={vinyl("#8e6fb8", "gloss")} position={[1.0, TABLE_TOP + 0.15, -0.2]} ink={INK_THIN} />
      <mesh geometry={G.box(0.06, 0.25, 0.31, 0.01)} material={vinyl("#ffd84d", "gloss")} position={[1.0, TABLE_TOP + 0.15, -0.2]} />
    </group>
  );
};

const BALLOON_COLORS = ["#e94f64", "#33c2bd", "#f2c14e", "#8e6fb8", "#f27a2e"];

/** A bunch of balloons tied at `position`, bobbing with `frame`. */
export const Balloons: React.FC<{ position: Vec3; frame: number; count?: number; seed?: number }> = ({ position, frame, count = 5, seed = 0 }) => (
  <group position={position}>
    {Array.from({ length: count }, (_, i) => {
      const r = (k: string) => random(`bal${seed}-${i}-${k}`);
      const top: Vec3 = [(r("x") - 0.5) * 0.9, 1.5 + r("y") * 0.6 + Math.sin(frame * 0.05 + i) * 0.05, (r("z") - 0.5) * 0.5];
      const len = Math.hypot(top[0], top[1], top[2]);
      return (
        <group key={i}>
          <Part geo={G.sphere(0.2)} mat={vinyl(BALLOON_COLORS[(i + seed) % 5], "gloss")} position={top} scale={[1, 1.18, 1]} ink={INK_THIN} />
          <mesh
            geometry={G.cyl(0.004, 0.004, len, 4)}
            material={flat("#ffffff")}
            position={[top[0] / 2, top[1] / 2 - 0.12, top[2] / 2]}
            rotation={[Math.atan2(top[2], top[1]), 0, -Math.atan2(top[0], top[1])]}
          />
        </group>
      );
    })}
  </group>
);

/** A sagging string of triangle flags from `a` to `b`. */
export const Bunting: React.FC<{ a: Vec3; b: Vec3; flags?: number }> = ({ a, b, flags = 14 }) => (
  <group>
    {Array.from({ length: flags }, (_, i) => {
      const t = (i + 0.5) / flags;
      const sag = Math.sin(Math.PI * t) * 0.6;
      const p: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag, a[2] + (b[2] - a[2]) * t];
      return <mesh key={i} geometry={G.cone(0.14, 0.32, 3)} material={vinyl(BALLOON_COLORS[i % 5], "cloth")} position={[p[0], p[1] - 0.14, p[2]]} rotation={[Math.PI, 0, 0]} />;
    })}
  </group>
);
