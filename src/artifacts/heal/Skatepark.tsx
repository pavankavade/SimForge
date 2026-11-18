import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Saturday at the skate park, in the ink & vinyl look: a concrete pad, the
 * big quarter pipe Marcus dares Kit to drop into, a small kicker with a steel
 * lip (where the board catches), and the skateboard itself.
 */

const std = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

/** Quarter pipe: transition radius (also its height) and deck depth. */
export const QP_R = 1.5;
export const QP_DECK = 0.8;
/** Kicker: length along x and lip height. */
export const KICK_L = 1.1;
export const KICK_H = 0.36;
/** Skateboard deck top above the ground (wheels plus deck). */
export const BOARD_H = 0.1;

/** A point on the transition, angle `phi` 0 (bottom, local x = 0) .. pi/2 (the coping at x = -QP_R). */
export const qpPoint = (phi: number): [number, number] => [-QP_R * Math.sin(phi), QP_R - QP_R * Math.cos(phi)];

const extruded = (pts: [number, number][], depth: number) => {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) shape.lineTo(p[0], p[1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
};

/** Quarter pipe; `position` is the bottom of the transition, which rises toward -x. */
export const QuarterPipe: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 3 }) => {
  const geo = useMemo(() => {
    const curve: [number, number][] = Array.from({ length: 19 }, (_, i) => qpPoint(((i / 18) * Math.PI) / 2));
    return extruded([...curve, [-QP_R - QP_DECK, QP_R], [-QP_R - QP_DECK, 0]], width);
  }, [width]);
  return (
    <group position={position}>
      <mesh geometry={geo} material={std("#b9bec4", 0.9)} castShadow receiveShadow />
      {/* Steel coping along the lip, and a painted stripe down the face */}
      <Part geo={G.cyl(0.045, 0.045, width + 0.04, 12)} mat={vinyl("#d7dde3", "gloss")} position={[-QP_R, QP_R, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
      <mesh geometry={G.box(QP_DECK, 0.02, width, 0.005)} material={std("#a7adb4")} position={[-QP_R - QP_DECK / 2, QP_R + 0.01, 0]} />
      <mesh geometry={G.box(0.02, 0.5, 0.02, 0.005)} material={flat("#f27a2e")} position={[-QP_R - QP_DECK + 0.1, QP_R + 0.45, -width / 2 + 0.1]} />
    </group>
  );
};

/** Small kicker ramp rising toward +x; `position` is its low end. The steel lip is at (KICK_L, KICK_H). */
export const Kicker: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 1.4 }) => {
  const geo = useMemo(() => extruded([[0, 0], [KICK_L, 0], [KICK_L, KICK_H], [KICK_L - 0.06, KICK_H]], width), [width]);
  return (
    <group position={position}>
      <mesh geometry={geo} material={std("#9aa1a8", 0.9)} castShadow receiveShadow />
      <Part geo={G.cyl(0.03, 0.03, width + 0.02, 10)} mat={vinyl("#e2533c", "gloss")} position={[KICK_L - 0.03, KICK_H, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
    </group>
  );
};

/** The board: `position` is the ground contact under its centre; `tilt` rolls it about z (the ramp angle); `flip` spins it as it shoots away. */
export const Skateboard: React.FC<{ position: Vec3; tilt?: number; flip?: number; yaw?: number }> = ({ position, tilt = 0, flip = 0, yaw = 0 }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <group rotation={[flip, 0, tilt]}>
      <Part geo={G.box(0.78, 0.03, 0.21, 0.012)} mat={vinyl("#33c2bd", "gloss")} position={[0, BOARD_H - 0.015, 0]} ink={INK_THIN} />
      <mesh geometry={G.box(0.6, 0.004, 0.17, 0.002)} material={flat("#2b2230")} position={[0, BOARD_H + 0.001, 0]} />
      {[-0.27, 0.27].map((x) =>
        [-0.08, 0.08].map((z) => <Part key={`${x}${z}`} geo={G.cyl(0.032, 0.032, 0.03, 12)} mat={vinyl("#f2c14e", "gloss")} position={[x, 0.032, z]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />),
      )}
    </group>
  </group>
);

/** The park: a concrete pad, a low back wall with a fence on top, and a bench. */
export const SkateparkSet: React.FC<{ width?: number }> = ({ width = 30 }) => (
  <group>
    <mesh material={std("#c9ccd0", 0.95)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
      <planeGeometry args={[width, 14]} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => (
      <mesh key={i} geometry={G.box(0.02, 0.003, 14, 0.001)} material={std("#b4b8bd")} position={[-width / 2 + (i + 1) * (width / 13), 0.002, -2]} />
    ))}
    <mesh geometry={G.box(width, 1.0, 0.3, 0.04)} material={std("#8f97a3")} position={[0, 0.5, -6.5]} receiveShadow />
    <mesh geometry={G.box(width, 0.04, 0.04, 0.01)} material={std("#6b7380")} position={[0, 2.2, -6.5]} />
    {Array.from({ length: 16 }, (_, i) => (
      <mesh key={i} geometry={G.box(0.04, 1.2, 0.04, 0.01)} material={std("#6b7380")} position={[-width / 2 + 0.5 + i * (width / 16), 1.6, -6.5]} />
    ))}
    {/* Graffiti blocks on the wall */}
    {[
      [-5, "#f27a2e"],
      [-1.5, "#33c2bd"],
      [3, "#ffd84d"],
      [6.5, "#e2533c"],
    ].map(([x, c]) => (
      <mesh key={String(x)} geometry={G.box(1.6, 0.5, 0.01, 0.1)} material={flat(String(c))} position={[Number(x), 0.55, -6.34]} />
    ))}
    <group position={[5.5, 0, -4.5]}>
      <Part geo={G.box(1.6, 0.06, 0.4, 0.02)} mat={vinyl("#c98b4f", "wood")} position={[0, 0.45, 0]} ink={INK_THIN} />
      {[-0.65, 0.65].map((x) => (
        <Part key={x} geo={G.box(0.06, 0.45, 0.36, 0.02)} mat={vinyl("#6b7380", "metal")} position={[x, 0.225, 0]} ink={INK_THIN} />
      ))}
    </group>
  </group>
);
