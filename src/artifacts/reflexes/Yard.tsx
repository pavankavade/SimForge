import type React from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Sunday in the backyard: the garage eave with a leafy gutter, Grandpa's
 * aluminium stepladder (it tips sideways about its right feet), and Tess's
 * lemonade.
 */

const std = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

/** Gutter height above the lawn. */
export const EAVE_Y = 3.05;
export const LADDER_H = 1.75;
/** Feet spread along x (the tipping axis runs through the +x feet). */
export const LADDER_W = 0.62;
/** Top step Grandpa stands on. */
export const LADDER_STEP = 1.32;

/** Garage side wall with a shallow roof; the gutter runs along its front edge at EAVE_Y, local z = 0. */
export const GarageEave: React.FC<{ position: Vec3; length?: number; leaves?: number }> = ({ position, length = 9, leaves = 1 }) => (
  <group position={position}>
    <mesh geometry={G.box(length, EAVE_Y, 3, 0.04)} material={std("#e7c9a3")} position={[0, EAVE_Y / 2, -2.0]} receiveShadow castShadow />
    {Array.from({ length: 7 }, (_, i) => (
      <mesh key={i} geometry={G.box(length + 0.02, 0.03, 0.02, 0.01)} material={std("#d6b58c")} position={[0, 0.4 + i * 0.4, -0.49]} />
    ))}
    <mesh geometry={G.box(length + 0.6, 0.12, 3.6, 0.03)} material={std("#7a4a40", 0.7)} position={[0, EAVE_Y + 0.12, -1.7]} rotation={[0.12, 0, 0]} castShadow />
    {/* Gutter: a half pipe with leaves poking out */}
    <Part geo={G.cyl(0.08, 0.08, length + 0.4, 14)} mat={vinyl("#f3efe6", "gloss")} position={[0, EAVE_Y - 0.05, 0.02]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
    {Array.from({ length: Math.round(14 * leaves) }, (_, i) => (
      <mesh
        key={i}
        geometry={G.box(0.12, 0.02, 0.08, 0.01)}
        material={flat(i % 3 ? "#c9822e" : "#a35a24")}
        position={[-length / 2 + 0.3 + i * ((length - 0.6) / 14), EAVE_Y + 0.04, 0.02 + ((i * 37) % 5) * 0.012]}
        rotation={[0.3, i, 0.4]}
      />
    ))}
    {/* Side door */}
    <mesh geometry={G.box(0.9, 2.0, 0.05, 0.02)} material={std("#4f7dc4")} position={[length / 2 - 1.4, 1.0, -0.48]} />
  </group>
);

/**
 * A-frame stepladder. `position` is the midpoint between its feet on the
 * ground; `tip` (radians, ≥ 0) rocks it onto its +x feet. Children ride the
 * ladder (place them in ladder space: y = LADDER_STEP is the top step).
 */
export const Stepladder: React.FC<{ position: Vec3; tip?: number; children?: React.ReactNode }> = ({ position, tip = 0, children }) => {
  const rail = vinyl("#c5ced8", "gloss");
  const half = LADDER_W / 2;
  const spread = 0.34;
  const lean = Math.atan2(spread, LADDER_H);
  const railLen = Math.hypot(LADDER_H, spread);
  return (
    <group position={position}>
      <group position={[half, 0, 0]} rotation={[0, 0, -tip]}>
        <group position={[-half, 0, 0]}>
          {[1, -1].map((side) => (
            <group key={side} position={[0, 0, (side * spread) / 2]} rotation={[side * lean, 0, 0]}>
              {[-half, half].map((x) => (
                <Part key={x} geo={G.box(0.05, railLen, 0.07, 0.015)} mat={rail} position={[x, railLen / 2, 0]} ink={INK_THIN} />
              ))}
              {side > 0
                ? [0.35, 0.7, 1.05].map((y) => <Part key={y} geo={G.box(LADDER_W, 0.04, 0.12, 0.012)} mat={rail} position={[0, y, 0.02]} ink={INK_THIN} />)
                : null}
            </group>
          ))}
          <Part geo={G.box(LADDER_W + 0.08, 0.06, 0.4, 0.02)} mat={vinyl("#f2c14e", "gloss")} position={[0, LADDER_STEP, 0]} ink={INK_THIN} />
          <Part geo={G.box(LADDER_W + 0.04, 0.05, 0.2, 0.02)} mat={vinyl("#e2533c", "gloss")} position={[0, LADDER_H, 0]} ink={INK_THIN} />
          {children}
        </group>
      </group>
    </group>
  );
};

/** Ladder-space point → world, for a ladder at `position` tipped by `tip`. */
export const onLadder = (position: Vec3, tip: number, local: Vec3): Vec3 => {
  const half = LADDER_W / 2;
  const x = local[0] - half;
  const c = Math.cos(-tip);
  const s = Math.sin(-tip);
  return [position[0] + half + x * c - local[1] * s, position[1] + x * s + local[1] * c, position[2] + local[2]];
};

export const Lemonade: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Part
      geo={G.cyl(0.045, 0.04, 0.13, 20)}
      mat={new THREE.MeshPhysicalMaterial({ color: "#fff6c8", roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false })}
      position={[0, 0.065, 0]}
      ink={INK_THIN}
    />
    <Part geo={G.cyl(0.04, 0.036, 0.1, 20)} mat={vinyl("#ffe066", "gloss")} position={[0, 0.055, 0]} ink={false} />
    <mesh geometry={G.disc(0.03)} material={flat("#9ccc4a")} position={[0.03, 0.12, 0.02]} rotation={[0, 0.4, 0.6]} />
  </group>
);
