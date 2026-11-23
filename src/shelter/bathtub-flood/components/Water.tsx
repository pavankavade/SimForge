import type React from "react";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Floodwater: murky, faceted, a little see-through so legs and hulls read
 * under the surface. Transparent so it draws after every solid (and after a
 * DryMask), which is what keeps it out of the tub.
 */
export const waterMat = new THREE.MeshStandardMaterial({
  color: "#6f8a86",
  roughness: 0.35,
  metalness: 0.05,
  flatShading: true,
  transparent: true,
  opacity: 0.86,
  depthWrite: true,
});
const sideMat = new THREE.MeshStandardMaterial({ color: "#4f6662", roughness: 0.6, flatShading: true, transparent: true, opacity: 0.9 });
const foamMat = new THREE.MeshStandardMaterial({ color: "#e4ece8", roughness: 0.8, flatShading: true, transparent: true, opacity: 0.85 });

export type WaveFn = (x: number, z: number) => number;

/** Faceted top surface over [x0,x1]×[z0,z1] at `level` + wave(x, z). */
const surface = (x0: number, x1: number, z0: number, z1: number, level: number, wave: WaveFn | undefined, nx: number, nz: number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, level + (wave ? wave(p.getX(i), p.getZ(i)) : 0));
  g.computeVertexNormals();
  return g;
};

/**
 * A slab of water: wavy faceted top at `level`, plus a dark front face down to
 * `bottom` when `front` is set (the diorama cut). Rebuilt per frame (frame is
 * in the deps through `level`/`frame`), so it stays a pure function of frame.
 */
export const WaterSlab: React.FC<{
  frame: number;
  x: [number, number];
  z: [number, number];
  level: number;
  bottom?: number;
  wave?: WaveFn;
  seg?: [number, number];
  front?: boolean;
  renderOrder?: number;
}> = ({ frame, x, z, level, bottom = level - 1, wave, seg = [16, 8], front = true, renderOrder = 3 }) => {
  const geo = useMemo(() => surface(x[0], x[1], z[0], z[1], level, wave, seg[0], seg[1]), [frame, x[0], x[1], z[0], z[1], level, seg[0], seg[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  const depth = Math.max(0.01, level - bottom);
  return (
    <group>
      <mesh geometry={geo} material={waterMat} renderOrder={renderOrder} receiveShadow />
      {front && (
        <mesh position={[(x[0] + x[1]) / 2, bottom + depth / 2, z[1]]} material={sideMat} renderOrder={renderOrder}>
          <planeGeometry args={[x[1] - x[0], depth]} />
        </mesh>
      )}
    </group>
  );
};

/** A flat sheet of water spreading over a floor (the gush under the door). */
export const Sheet: React.FC<{ position: [number, number, number]; size: [number, number]; foam?: boolean }> = ({ position, size, foam = true }) => (
  <group position={position}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={waterMat} renderOrder={3}>
      <planeGeometry args={size} />
    </mesh>
    {foam && (
      <mesh position={[size[0] / 2 - 0.05, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={foamMat} renderOrder={4}>
        <planeGeometry args={[0.1, size[1]]} />
      </mesh>
    )}
  </group>
);

/**
 * Keeps water out of an open hull: an invisible lid that only writes depth,
 * drawn after the solids and before the water, so the water surface behind it
 * (inside the tub) fails the depth test while everything inside still shows.
 */
const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true });
export const DryMask: React.FC<{ size: [number, number]; position: [number, number, number] }> = ({ size, position }) => (
  <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} material={maskMat} renderOrder={2}>
    <planeGeometry args={size} />
  </mesh>
);

export const FOAM = foamMat;
