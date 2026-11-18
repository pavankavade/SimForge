import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeGravel } from "./textures";

/**
 * Shared bits of the mine sets: gravel surfaces, a plain box, and tubes between points (the rock
 * itself is in rock.tsx).
 * Everything here is static; the props pass in what changes per frame.
 */

export type V3 = [number, number, number];

/** Packed gravel floors (the shelter, tunnels). */
export const useGravel = (repeat: [number, number], seed = 11) =>
  useSurface(
    `mine-gravel2-${seed}`,
    () => makeGravel({ seed, cells: 64, dirt: ["#b9a084", "#a0876c"], stones: ["#cdb79a", "#b7a084", "#9d8770", "#c3aa8a", "#8a7560", "#d8c6ac"] }),
    repeat
  );

/** Desert ground at the surface camp: paler, sun-bleached gravel. */
export const useDesert = (repeat: [number, number]) =>
  useSurface("mine-desert-gravel", () => makeGravel({ seed: 9, dirt: ["#cfae86", "#b9946c"], stones: ["#e2c9a4", "#cdb08a", "#b49372", "#d8bb92", "#a3876a", "#efdcc0"], cells: 54 }), repeat);

/** A box from its min and max corners. */
export const Block: React.FC<{
  min: V3;
  max: V3;
  color?: string;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  castShadow?: boolean;
}> = ({ min, max, color = "#ffffff", map, normalMap, roughness = 0.9, metalness = 0, emissive, emissiveIntensity = 0, castShadow = true }) => (
  <mesh position={[(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]} castShadow={castShadow} receiveShadow>
    <boxGeometry args={[max[0] - min[0], max[1] - min[1], max[2] - min[2]]} />
    <meshStandardMaterial
      color={color}
      map={map ?? undefined}
      normalMap={normalMap ?? undefined}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissiveIntensity}
    />
  </mesh>
);

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** A cylinder from a to b. */
export const Rod: React.FC<{
  a: V3;
  b: V3;
  r: number;
  color?: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  seg?: number;
}> = ({ a, b, r, color = "#888", roughness = 0.5, metalness = 0.6, emissive, emissiveIntensity = 0, seg = 12 }) => {
  _a.set(a[0], a[1], a[2]);
  _b.set(b[0], b[1], b[2]);
  const len = Math.max(1e-4, _a.distanceTo(_b));
  const q = new THREE.Quaternion().setFromUnitVectors(_up, _b.clone().sub(_a).normalize());
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive ?? "#000000"} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
};

/** A tube along a curve, drawn up to `amount` (0..1) of its length. Rebuilt when the amount changes. */
export const CurveTube: React.FC<{
  points: V3[];
  amount: number;
  r: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  z?: number;
}> = ({ points, amount, r, color, emissive, emissiveIntensity = 0 }) => {
  const key = points.map((p) => p.join(",")).join(";");
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = Math.round(Math.max(0, Math.min(1, amount)) * 200) / 200;
  const geo = useMemo(() => {
    if (t <= 0.001) return null;
    const pts = curve.getPoints(80).slice(0, Math.max(2, Math.round(81 * t)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(4, pts.length), r, 8, false);
  }, [curve, t, r]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={emissiveIntensity} roughness={0.5} toneMapped={emissiveIntensity < 1.5} />
    </mesh>
  );
};

/** A rough lump of rock (squashed icosahedron), for walls and rubble. */
export const Lump: React.FC<{ position: V3; scale: V3; rotation?: V3; color?: string; map?: THREE.Texture | null }> = ({
  position,
  scale,
  rotation = [0, 0, 0],
  color = "#6a5c50",
  map,
}) => (
  <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
    <icosahedronGeometry args={[1, 1]} />
    <meshStandardMaterial color={color} map={map ?? undefined} roughness={0.95} />
  </mesh>
);

/** Chile's flag on a canvas (white over red, blue canton with a white star). */
export const useChileFlag = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 192;
    c.height = 128;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 192, 64);
    g.fillStyle = "#d52b1e";
    g.fillRect(0, 64, 192, 64);
    g.fillStyle = "#0039a6";
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#ffffff";
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 9 : 22;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
