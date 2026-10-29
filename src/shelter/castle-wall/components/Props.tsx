import type React from "react";
import { G, INK_THIN, Part, flat, vinyl } from "../../../artifacts/characters/hero";
import type { Vec3 } from "../../../engine/types";
import { LADDER_LEN, RAM_LEN } from "../timeline";

/** A fluffy sheep: wool puffs, a dark face, stick legs. Faces +x at yaw 0. */
export const Sheep: React.FC<{ position: Vec3; yaw?: number; frame: number; seed?: number; kick?: number; tilt?: number }> = ({ position, yaw = 0, frame, seed = 0, kick = 0, tilt = 0 }) => {
  const wool = vinyl("#f6f2ea", "cloth");
  const face = vinyl("#3a3030", "skin");
  const graze = 0.5 + 0.5 * Math.sin(frame * 0.05 + seed * 2);
  const leg = kick * Math.sin(frame * 0.9);
  return (
    <group position={position} rotation={[0, yaw, tilt]}>
      {[
        [0, 0.55, 0, 0.32],
        [0.22, 0.6, 0.1, 0.24],
        [-0.22, 0.6, -0.08, 0.25],
        [0.05, 0.75, -0.05, 0.22],
        [-0.12, 0.62, 0.16, 0.22],
        [0.16, 0.58, -0.17, 0.21],
      ].map(([x, y, z, r], k) => (
        <Part key={k} geo={G.sphere(r)} mat={wool} position={[x, y, z]} />
      ))}
      <group position={[0.38, 0.62 - graze * 0.18, 0]} rotation={[0, 0, -0.5 * graze]}>
        <Part geo={G.sphere(0.15)} mat={face} position={[0.08, 0, 0]} scale={[1.25, 1, 0.9]} />
        <Part geo={G.sphere(0.06)} mat={face} position={[0.0, 0.08, 0.14]} scale={[0.6, 0.4, 1.4]} ink={false} />
        <Part geo={G.sphere(0.06)} mat={face} position={[0.0, 0.08, -0.14]} scale={[0.6, 0.4, 1.4]} ink={false} />
        <Part geo={G.sphere(0.035)} mat={flat("#ffffff")} position={[0.17, 0.05, 0.08]} ink={false} />
        <Part geo={G.sphere(0.035)} mat={flat("#ffffff")} position={[0.17, 0.05, -0.08]} ink={false} />
        <Part geo={G.sphere(0.12)} mat={wool} position={[0.0, 0.13, 0]} />
      </group>
      {[
        [0.18, 0.12],
        [0.18, -0.12],
        [-0.18, 0.12],
        [-0.18, -0.12],
      ].map(([x, z], k) => (
        <Part key={k} geo={G.cyl(0.04, 0.035, 0.36)} mat={face} position={[x, 0.18, z]} rotation={[0, 0, (k % 2 ? 1 : -1) * leg * 0.6]} ink={INK_THIN} />
      ))}
    </group>
  );
};

/** Battering ram: an iron-capped log with rope handles; `position` is its tip, pointing -x. */
export const Ram: React.FC<{ position: Vec3; roll?: number; pitch?: number }> = ({ position, roll = 0, pitch = 0 }) => {
  const log = vinyl("#8a5a32", "wood");
  const iron = vinyl("#4a4f58", "gloss");
  return (
    <group position={position} rotation={[roll, 0, pitch]}>
      <Part geo={G.cyl(0.2, 0.2, RAM_LEN - 0.4)} mat={log} position={[RAM_LEN / 2 + 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
      <Part geo={G.cyl(0.24, 0.24, 0.46)} mat={iron} position={[0.23, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
      <Part geo={G.sphere(0.2)} mat={iron} position={[0.0, 0, 0]} scale={[0.6, 1, 1]} />
      {[1.1, 2.0, 2.8].map((x) => (
        <Part key={x} geo={G.torus(0.22, 0.035)} mat={vinyl("#c9a46a", "cloth")} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} ink={false} />
      ))}
    </group>
  );
};

/** A long siege ladder. `position` is its foot; it rises along +x rotated by `angle` about z. */
export const Ladder: React.FC<{ position: Vec3; angle: number }> = ({ position, angle }) => {
  const wood = vinyl("#a8733f", "wood");
  const rungs = Math.floor(LADDER_LEN / 0.42);
  return (
    <group position={position} rotation={[0, 0, angle]}>
      {[-0.26, 0.26].map((z) => (
        <Part key={z} geo={G.box(LADDER_LEN, 0.09, 0.09, 0.03)} mat={wood} position={[LADDER_LEN / 2, 0, z]} ink={INK_THIN} />
      ))}
      {Array.from({ length: rungs }, (_, k) => (
        <Part key={k} geo={G.box(0.06, 0.06, 0.52, 0.02)} mat={wood} position={[0.3 + k * 0.42, 0, 0]} ink={false} />
      ))}
    </group>
  );
};

export const Rock: React.FC<{ position: Vec3; spin?: number; r?: number }> = ({ position, spin = 0, r = 0.26 }) => (
  <Part geo={G.sphere(r)} mat={vinyl("#9b9488", "bone")} position={position} rotation={[spin, spin * 0.7, 0]} scale={[1.15, 0.85, 1]} />
);
