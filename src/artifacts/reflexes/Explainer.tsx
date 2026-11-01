import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Explainer pieces for Reflexes: a blueprint stage (navy floor and backdrop
 * with a grid) for the "why" diagrams, a glowing signal that runs along a
 * path through the body (eye → brain → spine → arm → hand), and a running
 * track with starting blocks for the false-start line.
 */

const std = (color: string, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

export const Blueprint: React.FC<{ position?: Vec3; width?: number }> = ({ position = [0, 0, 0], width = 24 }) => {
  const line = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3f6fb8", transparent: true, opacity: 0.55, toneMapped: false }), []);
  return (
    <group position={position}>
      <mesh material={std("#1b2b55")} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, 12]} />
      </mesh>
      <mesh material={std("#1f3263")} position={[0, 6, -3]}>
        <planeGeometry args={[width, 12]} />
      </mesh>
      {Array.from({ length: Math.round(width / 0.5) }, (_, i) => (
        <mesh key={`v${i}`} material={line} position={[-width / 2 + i * 0.5, 6, -2.99]}>
          <planeGeometry args={[0.012, 12]} />
        </mesh>
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={`h${i}`} material={line} position={[0, i * 0.5, -2.99]}>
          <planeGeometry args={[width, 0.012]} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * A signal travelling along `points`: the path glows in `dim` once lit, and a
 * bright pulse sits at `progress` (0..1 of the path length). Segments between
 * `marks` (path fractions) can take their own colours.
 */
export const SignalPath: React.FC<{ points: Vec3[]; progress: number; color?: string; dim?: string; width?: number }> = ({
  points,
  progress,
  color = "#ffd84d",
  dim = "#4fd1ff",
  width = 0.012,
}) => {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, "catmullrom", 0.2), [points]);
  const lit = useMemo(() => new THREE.MeshBasicMaterial({ color: dim, toneMapped: false, transparent: true, opacity: 0.9 }), [dim]);
  const ghost = useMemo(() => new THREE.MeshBasicMaterial({ color: dim, toneMapped: false, transparent: true, opacity: 0.18 }), [dim]);
  const pulse = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false }), [color]);
  const full = useMemo(() => new THREE.TubeGeometry(curve, 80, width, 6, false), [curve, width]);
  const p = Math.max(0, Math.min(1, progress));
  const done = useMemo(() => {
    if (p < 0.01) return null;
    const pts = Array.from({ length: 41 }, (_, i) => curve.getPointAt((i / 40) * p));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, width * 1.6, 6, false);
  }, [curve, p, width]);
  const at = curve.getPointAt(p);
  return (
    <>
      <mesh geometry={full} material={ghost} />
      {done ? <mesh geometry={done} material={lit} /> : null}
      {progress > 0 && progress < 1.02 ? (
        <mesh material={pulse} position={at}>
          <sphereGeometry args={[width * 4.5, 16, 12]} />
        </mesh>
      ) : null}
    </>
  );
};

/** A red running track along x with white lane lines; lanes step toward -z from local z = 0. */
export const RaceTrack: React.FC<{ position?: Vec3; length?: number; lanes?: number }> = ({ position = [0, 0, 0], length = 60, lanes = 4 }) => (
  <group position={position}>
    <mesh material={std("#c4553c")} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -lanes * 0.6 + 0.6]} receiveShadow>
      <planeGeometry args={[length, lanes * 1.2 + 2]} />
    </mesh>
    {Array.from({ length: lanes + 1 }, (_, i) => (
      <mesh key={i} geometry={G.box(length, 0.004, 0.05, 0.002)} material={flat("#fbf6ec")} position={[0, 0.003, 0.6 - i * 1.2]} />
    ))}
    <mesh geometry={G.box(0.08, 0.004, lanes * 1.2, 0.002)} material={flat("#fbf6ec")} position={[0, 0.004, 0.6 - lanes * 0.6]} />
    {/* Infield grass and stands far behind */}
    <mesh material={std("#86b95a")} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -lanes * 1.2 - 8]}>
      <planeGeometry args={[length * 2, 14]} />
    </mesh>
    <mesh geometry={G.box(length, 2.2, 3, 0.05)} material={std("#7a8794")} position={[0, 1.1, -lanes * 1.2 - 16]} />
  </group>
);

/** Starting blocks: two angled pedals on a rail, facing +x. */
export const StartingBlocks: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Part geo={G.box(0.7, 0.04, 0.08, 0.01)} mat={vinyl("#9aa3ad", "metal")} position={[0, 0.02, 0]} ink={INK_THIN} />
    {[
      [-0.18, 0.08],
      [0.12, -0.08],
    ].map(([x, z], i) => (
      <Part key={i} geo={G.box(0.06, 0.16, 0.12, 0.01)} mat={vinyl("#3a5fb0", "gloss")} position={[x, 0.08, z]} rotation={[0, 0, 0.7]} ink={INK_THIN} />
    ))}
  </group>
);
