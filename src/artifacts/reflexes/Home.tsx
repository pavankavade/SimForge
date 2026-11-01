import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Indoor sets for Reflexes, in the ink & vinyl look: the family kitchen
 * (breakfast table, the milk glass and its slow white ribbon), Kit's bedroom
 * (the bed frame), and a classroom with a big wall clock. Rooms are cutaways:
 * a floor, a back wall at -z and one side wall, all facing +z.
 */

const std = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

export const TABLE_TOP = 0.78;
export const CHAIR_SEAT = 0.46;
export const GLASS_H = 0.21;
export const GLASS_R = 0.062;
export const BED_TOP = 0.52;

/** A cutaway room: tiled or planked floor, back wall with a skirting board, and a left side wall. */
export const Room: React.FC<{
  position?: Vec3;
  width?: number;
  depth?: number;
  height?: number;
  wall?: string;
  floor?: string;
  floorLine?: string;
  tiles?: boolean;
}> = ({ position = [0, 0, 0], width = 12, depth = 7, height = 3.2, wall = "#f1dfbf", floor = "#c99a66", floorLine = "#b4855a", tiles = false }) => {
  const step = tiles ? 0.5 : 0.24;
  return (
    <group position={position}>
      <mesh material={std(floor)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
      </mesh>
      {Array.from({ length: Math.floor(depth / step) }, (_, i) => (
        <mesh key={`z${i}`} geometry={G.box(width, 0.004, 0.012, 0.002)} material={std(floorLine)} position={[0, 0.002, -depth / 2 + (i + 1) * step]} />
      ))}
      {tiles
        ? Array.from({ length: Math.floor(width / step) }, (_, i) => (
            <mesh key={`x${i}`} geometry={G.box(0.012, 0.004, depth, 0.002)} material={std(floorLine)} position={[-width / 2 + (i + 1) * step, 0.002, 0]} />
          ))
        : null}
      <mesh geometry={G.box(width, height, 0.2, 0.02)} material={std(wall)} position={[0, height / 2, -depth / 2]} receiveShadow />
      <mesh geometry={G.box(width, 0.14, 0.04, 0.01)} material={std("#fbf6ec")} position={[0, 0.07, -depth / 2 + 0.12]} />
      <mesh geometry={G.box(0.2, height, depth, 0.02)} material={std(wall)} position={[-width / 2, height / 2, 0]} receiveShadow />
    </group>
  );
};

/** A window on a back wall at local z = 0: frame, daylight glass and a sill. */
export const Window: React.FC<{ position: Vec3; w?: number; h?: number; night?: boolean }> = ({ position, w = 1.4, h = 1.1, night = false }) => (
  <group position={position}>
    <Part geo={G.box(w + 0.16, h + 0.16, 0.06, 0.02)} mat={vinyl("#fbf6ec", "wood")} ink={INK_THIN} />
    <mesh geometry={G.box(w, h, 0.02, 0.005)} material={night ? flat("#24305a") : flat("#bfe4ff")} position={[0, 0, 0.035]} />
    <mesh geometry={G.box(0.05, h, 0.03, 0.01)} material={std("#fbf6ec")} position={[0, 0, 0.05]} />
    <mesh geometry={G.box(w, 0.05, 0.03, 0.01)} material={std("#fbf6ec")} position={[0, 0, 0.05]} />
    <Part geo={G.box(w + 0.3, 0.06, 0.18, 0.02)} mat={vinyl("#fbf6ec", "wood")} position={[0, -h / 2 - 0.08, 0.08]} ink={INK_THIN} />
  </group>
);

/** Kitchen run along a back wall: base cabinets, worktop, wall cabinets, a fridge at the left end. */
export const KitchenCounter: React.FC<{ position: Vec3; length?: number }> = ({ position, length = 4 }) => {
  const doors = Math.round(length / 0.6);
  return (
    <group position={position}>
      <Part geo={G.box(length, 0.86, 0.6, 0.03)} mat={vinyl("#6fa8a0", "wood")} position={[0, 0.43, 0]} ink={INK_THIN} />
      <Part geo={G.box(length + 0.06, 0.05, 0.66, 0.02)} mat={vinyl("#f3efe6", "gloss")} position={[0, 0.885, 0.02]} ink={INK_THIN} />
      {Array.from({ length: doors }, (_, i) => (
        <mesh key={i} geometry={G.box(0.12, 0.025, 0.03, 0.01)} material={flat("#d9c27a")} position={[-length / 2 + (i + 0.5) * (length / doors), 0.72, 0.31]} />
      ))}
      <Part geo={G.box(length, 0.7, 0.36, 0.03)} mat={vinyl("#6fa8a0", "wood")} position={[0, 1.95, -0.1]} ink={INK_THIN} />
      {/* Fridge */}
      <Part geo={G.box(0.8, 1.9, 0.7, 0.06)} mat={vinyl("#f6f3ee", "gloss")} position={[-length / 2 - 0.5, 0.95, 0.04]} ink={INK_THIN} />
      <mesh geometry={G.box(0.04, 0.5, 0.04, 0.01)} material={flat("#9aa3ad")} position={[-length / 2 - 0.2, 1.25, 0.41]} />
      {/* Kettle and a fruit bowl */}
      <Part geo={G.cyl(0.08, 0.1, 0.2, 18)} mat={vinyl("#e2533c", "gloss")} position={[length / 2 - 0.5, 1.01, 0]} ink={INK_THIN} />
      <Part geo={G.sphere(0.18, 0, Math.PI / 2)} mat={vinyl("#f3efe6", "gloss")} position={[0.4, 1.06, 0]} rotation={[Math.PI, 0, 0]} ink={INK_THIN} />
      {[-0.08, 0.06, 0].map((x, i) => (
        <Part key={i} geo={G.sphere(0.06)} mat={vinyl(i === 2 ? "#f2c14e" : "#e2533c", "gloss")} position={[0.4 + x, 1.06 + (i === 2 ? 0.07 : 0.02), i === 2 ? 0 : 0.04]} ink={INK_THIN} />
      ))}
    </group>
  );
};

export const BreakfastTable: React.FC<{ position: Vec3; width?: number; depth?: number }> = ({ position, width = 1.8, depth = 0.9 }) => {
  const wood = vinyl("#c98b4f", "wood");
  return (
    <group position={position}>
      <Part geo={G.box(width, 0.06, depth, 0.025)} mat={wood} position={[0, TABLE_TOP - 0.03, 0]} ink={INK_THIN} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Part key={`${sx}${sz}`} geo={G.box(0.07, TABLE_TOP - 0.06, 0.07, 0.02)} mat={wood} position={[sx * (width / 2 - 0.1), (TABLE_TOP - 0.06) / 2, sz * (depth / 2 - 0.1)]} ink={INK_THIN} />
        )),
      )}
    </group>
  );
};

/** A kitchen chair; `yaw` turns it (the seat faces local +z). */
export const Chair: React.FC<{ position: Vec3; yaw?: number; color?: string }> = ({ position, yaw = 0, color = "#e2a04f" }) => {
  const wood = vinyl(color, "wood");
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Part geo={G.box(0.44, 0.05, 0.42, 0.02)} mat={wood} position={[0, CHAIR_SEAT, 0]} ink={INK_THIN} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Part key={`${sx}${sz}`} geo={G.box(0.04, CHAIR_SEAT, 0.04, 0.01)} mat={wood} position={[sx * 0.18, CHAIR_SEAT / 2, sz * 0.17]} ink={INK_THIN} />),
      )}
      <Part geo={G.box(0.44, 0.5, 0.04, 0.02)} mat={wood} position={[0, CHAIR_SEAT + 0.3, -0.19]} ink={INK_THIN} />
    </group>
  );
};

export const CerealBox: React.FC<{ position: Vec3; yaw?: number }> = ({ position, yaw = 0 }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <Part geo={G.box(0.2, 0.3, 0.07, 0.01)} mat={vinyl("#f2c14e", "cloth")} position={[0, 0.15, 0]} ink={INK_THIN} />
    <mesh geometry={G.disc(0.06)} material={flat("#e2533c")} position={[0, 0.18, 0.036]} />
    <mesh geometry={G.box(0.16, 0.04, 0.005, 0.002)} material={flat("#3a5fb0")} position={[0, 0.25, 0.036]} />
  </group>
);

export const Bowl: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#5ea8d8" }) => (
  <group position={position}>
    <Part geo={G.sphere(0.09, Math.PI / 2, Math.PI / 2)} mat={vinyl(color, "gloss")} position={[0, 0.08, 0]} ink={INK_THIN} />
    <mesh geometry={G.disc(0.082)} material={flat("#f4e3b8")} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.075, 0]} />
  </group>
);

/**
 * The milk glass. `position` is the base centre; `tilt` rolls it about z
 * (positive tips toward -x) around the base rim on the tipping side; `milk`
 * is the fill 0..1.
 */
export const MilkGlass: React.FC<{ position: Vec3; tilt?: number; spin?: number; milk?: number }> = ({ position, tilt = 0, spin = 0, milk = 0.8 }) => {
  const glass = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#e8f4ff", roughness: 0.08, metalness: 0, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false }),
    [],
  );
  const rim = Math.sign(tilt || 1) * -GLASS_R;
  const h = GLASS_H * Math.max(0.02, milk) * 0.92;
  return (
    <group position={position} rotation={[spin, 0, 0]}>
      <group position={[rim, 0, 0]} rotation={[0, 0, tilt]}>
        <group position={[-rim, 0, 0]}>
          <Part geo={G.cyl(GLASS_R, GLASS_R * 0.86, GLASS_H, 24)} mat={glass} position={[0, GLASS_H / 2, 0]} ink={INK_THIN} />
          {milk > 0.01 ? <Part geo={G.cyl(GLASS_R * 0.9, GLASS_R * 0.8, h, 24)} mat={vinyl("#fbfaf6", "gloss")} position={[0, 0.008 + h / 2, 0]} ink={false} /> : null}
        </group>
      </group>
    </group>
  );
};

/**
 * Spilt milk: a ribbon from `from` falling to the floor (a parabola with the
 * glass's sideways drift `vx`), drawn to `progress` 0..1 of its length, and
 * the puddle it leaves.
 */
export const MilkRibbon: React.FC<{ from: Vec3; vx?: number; progress: number; floorY?: number; puddle?: number }> = ({ from, vx = -0.25, progress, floorY = 0, puddle = 0 }) => {
  const geo = useMemo(() => {
    if (progress <= 0.02) return null;
    const pts: THREE.Vector3[] = [];
    const n = 24;
    const drop = from[1] - floorY;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * progress;
      pts.push(new THREE.Vector3(from[0] + vx * t, from[1] - drop * t * t, from[2]));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.016, 8, false);
  }, [from, vx, progress, floorY]);
  return (
    <>
      {geo ? <mesh geometry={geo} material={vinyl("#fbfaf6", "gloss")} castShadow /> : null}
      {puddle > 0 ? (
        <mesh geometry={G.disc(0.28 * puddle)} material={vinyl("#fbfaf6", "gloss")} rotation={[-Math.PI / 2, 0, 0]} position={[from[0] + vx * progress, floorY + 0.004, from[2]]} scale={[1.2, 0.8, 1]} />
      ) : null}
    </>
  );
};

/** Wall clock: hands from `minutes` (0..60 on the minute hand) plus a red sweep `seconds`. */
export const WallClock: React.FC<{ position: Vec3; r?: number; hours?: number; minutes: number; seconds?: number }> = ({ position, r = 0.32, hours = 9, minutes, seconds }) => {
  const hand = (len: number, w: number, a: number, color: string, z: number) => (
    <mesh geometry={G.box(w, len, 0.01, 0.004)} material={flat(color)} position={[Math.sin(a) * len * 0.42, Math.cos(a) * len * 0.42, z]} rotation={[0, 0, -a]} />
  );
  const hA = ((hours + minutes / 60) / 12) * Math.PI * 2;
  const mA = (minutes / 60) * Math.PI * 2;
  return (
    <group position={position}>
      <Part geo={G.cyl(r, r, 0.06, 36)} mat={vinyl("#2b3550", "gloss")} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
      <mesh geometry={G.disc(r * 0.88)} material={flat("#fbf6ec")} position={[0, 0, 0.032]} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <mesh key={i} geometry={G.box(0.018, i % 3 ? 0.04 : 0.07, 0.005, 0.002)} material={flat("#2b3550")} position={[Math.sin(a) * r * 0.74, Math.cos(a) * r * 0.74, 0.035]} rotation={[0, 0, -a]} />;
      })}
      {hand(r * 0.5, 0.03, hA, "#2b3550", 0.04)}
      {hand(r * 0.76, 0.02, mA, "#2b3550", 0.045)}
      {seconds !== undefined ? hand(r * 0.8, 0.008, (seconds / 60) * Math.PI * 2, "#e2533c", 0.05) : null}
      <mesh geometry={G.disc(0.02)} material={flat("#e2533c")} position={[0, 0, 0.055]} />
    </group>
  );
};

/** Kit's bed: wooden frame with posts at the foot (+x end), mattress, pillow and a quilt. */
export const Bed: React.FC<{ position: Vec3; length?: number }> = ({ position, length = 2.0 }) => {
  const wood = vinyl("#a9744a", "wood");
  return (
    <group position={position}>
      <Part geo={G.box(length, 0.22, 1.0, 0.03)} mat={wood} position={[0, 0.2, 0]} ink={INK_THIN} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Part key={`${sx}${sz}`} geo={G.box(0.09, sx < 0 ? 0.95 : 0.45, 0.09, 0.02)} mat={wood} position={[sx * (length / 2 - 0.02), sx < 0 ? 0.475 : 0.225, sz * 0.47]} ink={INK_THIN} />
        )),
      )}
      <Part geo={G.box(0.06, 0.55, 0.96, 0.02)} mat={wood} position={[-length / 2, 0.6, 0]} ink={INK_THIN} />
      <Part geo={G.box(length - 0.12, 0.18, 0.94, 0.06)} mat={vinyl("#f4f1e8", "cloth")} position={[0, BED_TOP - 0.09 + 0.04, 0]} ink={INK_THIN} />
      <Part geo={G.box(0.42, 0.12, 0.6, 0.05)} mat={vinyl("#fbf6ec", "cloth")} position={[-length / 2 + 0.32, BED_TOP + 0.1, 0]} ink={INK_THIN} />
      <Part geo={G.box(length * 0.62, 0.06, 1.0, 0.03)} mat={vinyl("#5a86c8", "cloth")} position={[length * 0.17, BED_TOP + 0.04, 0.01]} ink={INK_THIN} />
    </group>
  );
};

/** A school desk with a chair tucked under it. */
export const Desk: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Part geo={G.box(0.8, 0.04, 0.5, 0.015)} mat={vinyl("#d9b07a", "wood")} position={[0, 0.72, 0]} ink={INK_THIN} />
    {[-1, 1].map((sx) => (
      <Part key={sx} geo={G.box(0.04, 0.7, 0.4, 0.01)} mat={vinyl("#5c6c7c", "metal")} position={[sx * 0.36, 0.35, 0]} ink={INK_THIN} />
    ))}
    <Chair position={[0, 0, 0.42]} yaw={Math.PI} color="#4f7dc4" />
  </group>
);

/** Classroom back wall: a chalkboard with sums on it. */
export const Chalkboard: React.FC<{ position: Vec3; w?: number }> = ({ position, w = 3.4 }) => (
  <group position={position}>
    <Part geo={G.box(w + 0.14, 1.34, 0.06, 0.02)} mat={vinyl("#a9744a", "wood")} ink={INK_THIN} />
    <mesh geometry={G.box(w, 1.2, 0.02, 0.005)} material={flat("#2f4a3a")} position={[0, 0, 0.035]} />
    {[0.3, 0.05, -0.2].map((y, i) => (
      <mesh key={i} geometry={G.box(w * (0.55 - i * 0.12), 0.035, 0.005, 0.002)} material={flat("#dfe7df")} position={[-w * 0.12, y, 0.05]} />
    ))}
  </group>
);
