import type React from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * The school gym for the dodgeball tournament: a planked court with painted
 * lines along x (the centre line at x = 0), block walls, high windows,
 * pull-out bleachers along the back and a red dodgeball with seams.
 */

const std = (color: string, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

export const BALL_R = 0.11;
/** Bleacher rows: seat heights and depths, from the front row back. */
export const BLEACHER_ROWS = [0.42, 0.84, 1.26, 1.68];
export const BLEACHER_STEP = 0.7;

export const GymHall: React.FC<{ position?: Vec3; width?: number; backZ?: number }> = ({ position = [0, 0, 0], width = 30, backZ = -6 }) => (
  <group position={position}>
    <mesh material={std("#d9a868", 0.55)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, backZ / 2 + 4]} receiveShadow>
      <planeGeometry args={[width, 20]} />
    </mesh>
    {Array.from({ length: 70 }, (_, i) => (
      <mesh key={i} geometry={G.box(width, 0.003, 0.008, 0.002)} material={std("#c4945a")} position={[0, 0.002, backZ + 0.2 + i * 0.2]} />
    ))}
    {/* Court lines: centre line, side lines and the centre circle */}
    <mesh geometry={G.box(0.06, 0.004, 10, 0.002)} material={flat("#e2533c")} position={[0, 0.004, backZ + 6]} />
    {[-7, 7].map((x) => (
      <mesh key={x} geometry={G.box(0.06, 0.004, 10, 0.002)} material={flat("#3a5fb0")} position={[x, 0.004, backZ + 6]} />
    ))}
    <mesh geometry={G.torus(1.2, 0.03)} material={flat("#e2533c")} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, backZ + 6]} scale={[1, 1, 0.1]} />
    {/* Block wall, a stripe, and high windows */}
    <mesh geometry={G.box(width, 8, 0.3, 0.02)} material={std("#e8e0cf")} position={[0, 4, backZ - 1.4]} receiveShadow />
    <mesh geometry={G.box(width, 0.5, 0.05, 0.01)} material={std("#3a5fb0")} position={[0, 3.1, backZ - 1.22]} />
    {Array.from({ length: 6 }, (_, i) => (
      <group key={i} position={[-12.5 + i * 5, 5.6, backZ - 1.22]}>
        <mesh geometry={G.box(2.6, 1.4, 0.04, 0.01)} material={std("#fbf6ec")} />
        <mesh geometry={G.box(2.4, 1.2, 0.04, 0.01)} material={flat("#cfeaff")} position={[0, 0, 0.02]} />
      </group>
    ))}
    {/* Banner */}
    <group position={[0, 4.3, backZ - 1.2]}>
      <mesh geometry={G.box(4.4, 0.9, 0.04, 0.01)} material={std("#e2533c")} />
      <mesh geometry={G.box(3.8, 0.12, 0.01, 0.004)} material={flat("#fbf6ec")} position={[0, 0.12, 0.03]} />
      <mesh geometry={G.box(2.6, 0.12, 0.01, 0.004)} material={flat("#fbf6ec")} position={[0, -0.12, 0.03]} />
    </group>
    <Bleachers position={[0, 0, backZ - 1.2]} width={width - 2} />
  </group>
);

/** Pull-out bleachers: four stepped rows of planks; local z = 0 is the back edge. */
export const Bleachers: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 20 }) => (
  <group position={position}>
    {BLEACHER_ROWS.map((y, i) => {
      const z = (BLEACHER_ROWS.length - i - 0.5) * BLEACHER_STEP;
      return (
        <group key={i}>
          <Part geo={G.box(width, 0.08, BLEACHER_STEP * 0.92, 0.02)} mat={vinyl("#c98b4f", "wood")} position={[0, y, z]} ink={INK_THIN} />
          <mesh geometry={G.box(width, y, 0.05, 0.01)} material={std("#7a8794")} position={[0, y / 2, z + BLEACHER_STEP * 0.46]} />
        </group>
      );
    })}
  </group>
);

/** Seat (hip) world point for row `row` (0 = front) of bleachers placed at `origin`. */
export const bleacherSeat = (origin: Vec3, row: number, x: number): Vec3 => [origin[0] + x, origin[1] + BLEACHER_ROWS[row] + 0.04, origin[2] + (BLEACHER_ROWS.length - row - 0.5) * BLEACHER_STEP];

/** The dodgeball: red rubber with two crossing seams; `spin` turns it about its flight axis. */
export const Dodgeball: React.FC<{ position: Vec3; spin?: number; squash?: number }> = ({ position, spin = 0, squash = 1 }) => (
  <group position={position} scale={[1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash)]}>
    <group rotation={[0.4, 0.3, spin]}>
      <Part geo={G.sphere(BALL_R)} mat={vinyl("#e2533c", "gloss")} ink={INK_THIN} />
      <mesh geometry={G.torus(BALL_R * 1.005, 0.006)} material={flat("#8f2a1c")} />
      <mesh geometry={G.torus(BALL_R * 1.005, 0.006)} material={flat("#8f2a1c")} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  </group>
);
