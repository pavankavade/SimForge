import type React from "react";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Everything Kit eats, in the ink & vinyl look: cereal bowls, a candy bar,
 * granola bars, school lunch trays, Grandpa's pancake stack and the
 * Thanksgiving table (turkey, mashed potatoes, pie). Plus the grocery
 * receipt. Each sits with its base at local y = 0.
 */

/** A stack of `n` pancakes (0..12) with butter on top. */
export const Pancakes: React.FC<{ position: Vec3; n: number }> = ({ position, n }) => {
  const count = Math.max(0, Math.round(n));
  return (
    <group position={position}>
      <Part geo={G.cyl(0.2, 0.2, 0.015, 24)} mat={vinyl("#f3efe6", "gloss")} position={[0, 0.008, 0]} ink={INK_THIN} />
      {Array.from({ length: count }, (_, i) => (
        <Part key={i} geo={G.cyl(0.14, 0.145, 0.03, 20)} mat={vinyl(i % 2 ? "#d9a05b" : "#cf9450", "cloth")} position={[((i * 37) % 5) * 0.004 - 0.008, 0.03 + i * 0.03, 0]} ink={INK_THIN} />
      ))}
      {count > 0 ? <Part geo={G.box(0.05, 0.02, 0.05, 0.008)} mat={vinyl("#f6dc6f", "gloss")} position={[0, 0.03 + count * 0.03, 0]} ink={false} /> : null}
    </group>
  );
};

export const CandyBar: React.FC<{ position: Vec3; yaw?: number; bitten?: number }> = ({ position, yaw = 0, bitten = 0 }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <Part geo={G.box(0.16 * (1 - 0.6 * bitten), 0.025, 0.05, 0.008)} mat={vinyl("#6b3b22", "gloss")} position={[0, 0.0125, 0]} ink={INK_THIN} />
    <Part geo={G.box(0.1, 0.027, 0.052, 0.006)} mat={vinyl("#e2533c", "cloth")} position={[0.04, 0.0135, 0]} ink={false} />
  </group>
);

export const GranolaBar: React.FC<{ position: Vec3; yaw?: number }> = ({ position, yaw = 0 }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <Part geo={G.box(0.2, 0.035, 0.07, 0.01)} mat={vinyl("#33c2bd", "cloth")} position={[0, 0.018, 0]} ink={INK_THIN} />
    <mesh geometry={G.box(0.07, 0.002, 0.05, 0.001)} material={flat("#ffd84d")} position={[0, 0.036, 0]} />
  </group>
);

/** A school lunch tray: a sandwich, an apple and a carton (or empty crumbs). */
export const LunchTray: React.FC<{ position: Vec3; empty?: boolean; yaw?: number }> = ({ position, empty = false, yaw = 0 }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <Part geo={G.box(0.42, 0.02, 0.3, 0.02)} mat={vinyl("#ff9d6e", "gloss")} position={[0, 0.01, 0]} ink={INK_THIN} />
    {empty ? (
      [0, 1, 2].map((i) => <mesh key={i} geometry={G.sphere(0.008)} material={flat("#c98b4f")} position={[-0.08 + i * 0.07, 0.025, 0.02 * i]} />)
    ) : (
      <>
        <Part geo={G.box(0.14, 0.05, 0.12, 0.02)} mat={vinyl("#e7c48a", "cloth")} position={[-0.08, 0.045, 0]} ink={INK_THIN} />
        <Part geo={G.sphere(0.04)} mat={vinyl("#d8392f", "gloss")} position={[0.1, 0.06, 0.06]} ink={INK_THIN} />
        <Part geo={G.box(0.06, 0.1, 0.06, 0.01)} mat={vinyl("#f3efe6", "cloth")} position={[0.12, 0.07, -0.07]} ink={INK_THIN} />
      </>
    )}
  </group>
);

/** The roast turkey on its platter; `legs` 0..2 still attached. */
export const Turkey: React.FC<{ position: Vec3; legs?: number }> = ({ position, legs = 2 }) => {
  const skin = vinyl("#b8682d", "gloss");
  return (
    <group position={position}>
      <Part geo={G.cyl(0.34, 0.34, 0.02, 28)} mat={vinyl("#f3efe6", "gloss")} position={[0, 0.01, 0]} ink={INK_THIN} />
      <Part geo={G.sphere(0.2)} mat={skin} position={[0, 0.16, 0]} scale={[1.25, 0.8, 1]} ink={INK_THIN} />
      {[-1, 1].slice(0, Math.max(0, Math.round(legs))).map((s) => (
        <group key={s} position={[0.2, 0.14, s * 0.12]} rotation={[0, 0, -0.6]}>
          <Part geo={G.sphere(0.07)} mat={skin} scale={[1.3, 1, 1]} ink={INK_THIN} />
          <Part geo={G.cyl(0.015, 0.015, 0.1, 8)} mat={vinyl("#f3efe6", "bone")} position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
        </group>
      ))}
    </group>
  );
};

/** A turkey leg held in a hand or on a plate. */
export const TurkeyLeg: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Part geo={G.sphere(0.07)} mat={vinyl("#b8682d", "gloss")} scale={[1.3, 1, 1]} ink={INK_THIN} />
    <Part geo={G.cyl(0.015, 0.015, 0.1, 8)} mat={vinyl("#f3efe6", "bone")} position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
  </group>
);

export const PotatoBowl: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Part geo={G.sphere(0.13, Math.PI / 2, Math.PI / 2)} mat={vinyl("#5ea8d8", "gloss")} position={[0, 0.11, 0]} ink={INK_THIN} />
    <Part geo={G.sphere(0.11)} mat={vinyl("#f6ecd0", "cloth")} position={[0, 0.11, 0]} scale={[1, 0.45, 1]} ink={INK_THIN} />
    <mesh geometry={G.box(0.04, 0.012, 0.04, 0.005)} material={flat("#f6dc6f")} position={[0, 0.165, 0]} />
  </group>
);

/** A pumpkin pie on the table. */
export const Pie: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Part geo={G.cyl(0.19, 0.16, 0.05, 28)} mat={vinyl("#e7c48a", "cloth")} position={[0, 0.025, 0]} ink={INK_THIN} />
    <mesh geometry={G.disc(0.16)} material={flat("#d98a3a")} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.052, 0]} />
  </group>
);

/** One slice on a small plate. */
export const PieSlice: React.FC<{ position: Vec3; yaw?: number }> = ({ position, yaw = 0 }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <Part geo={G.cyl(0.1, 0.1, 0.012, 18)} mat={vinyl("#f3efe6", "gloss")} position={[0, 0.006, 0]} ink={INK_THIN} />
    <Part geo={G.box(0.12, 0.045, 0.07, 0.012)} mat={vinyl("#e7c48a", "cloth")} position={[0, 0.035, 0]} ink={INK_THIN} />
    <mesh geometry={G.box(0.11, 0.004, 0.06, 0.002)} material={flat("#d98a3a")} position={[0, 0.059, 0]} />
  </group>
);

/** The grocery receipt, hanging from Grandpa's hand; `length` unrolled (m). */
export const Receipt: React.FC<{ position: Vec3; length: number }> = ({ position, length }) => (
  <group position={position}>
    <mesh geometry={G.box(0.2, Math.max(0.02, length), 0.006, 0.001)} material={flat("#fbfaf6")} position={[0, -length / 2, 0]} />
    {Array.from({ length: Math.floor(length / 0.05) }, (_, i) => (
      <mesh key={i} geometry={G.box(0.14 - (i % 3) * 0.025, 0.01, 0.001, 0.0005)} material={flat("#6b7380")} position={[-0.01, -0.03 - i * 0.05, 0.004]} />
    ))}
  </group>
);
