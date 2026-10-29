import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";

/**
 * Queulat, Patagonia, in July: a snowy meadow at the foot of a dark rock wall
 * with a blue hanging glacier and its waterfall, snowy conifers, and falling
 * snow. The landing spot is the origin; the wall is behind (-z).
 */

const std = (color: string, roughness = 0.95, flatShading = false) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading });

/** Snowy fir: stacked cones with white caps. */
export const SnowFir: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <Part geo={G.cyl(0.12, 0.16, 0.8, 8)} mat={vinyl("#5a3d28", "wood")} position={[0, 0.4, 0]} ink={INK_THIN} />
    {[0, 1, 2].map((k) => (
      <group key={k} position={[0, 0.9 + k * 0.75, 0]}>
        <Part geo={G.cone(1.0 - k * 0.25, 1.3, 9)} mat={vinyl("#2f5d46", "cloth")} ink={INK_THIN} />
        <mesh geometry={G.cone((1.0 - k * 0.25) * 0.55, 0.62, 9)} material={vinyl("#f4f7fb", "cloth")} position={[0, 0.36, 0]} />
      </group>
    ))}
  </group>
);

export const PatagoniaSet: React.FC<{ frame: number; snow?: number }> = ({ frame, snow = 1 }) => {
  const rock = useMemo(() => std("#6f7a8c", 1, true), []);
  const rockLight = useMemo(() => std("#8592a6", 1, true), []);
  const snowMat = useMemo(() => std("#f2f5fa", 0.9), []);
  const ice = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8fd3f0", emissive: "#3aa3d6", emissiveIntensity: 0.25, roughness: 0.3, flatShading: true }), []);
  const peaks = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        x: -60 + i * 12 + (random(`pp${i}`) - 0.5) * 6,
        h: 22 + random(`ph${i}`) * 16,
        r: 9 + random(`pr${i}`) * 5,
        z: -34 - random(`pz${i}`) * 10,
      })),
    [],
  );
  return (
    <group>
      {/* Snowy meadow with drifts */}
      <mesh material={snowMat} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} material={snowMat} position={[(random(`dx${i}`) - 0.5) * 40, -0.35, -3 - random(`dz${i}`) * 20]} scale={[2 + random(`ds${i}`) * 3, 0.8, 1.5 + random(`dd${i}`) * 2]} receiveShadow>
          <sphereGeometry args={[1, 18, 10]} />
        </mesh>
      ))}
      {/* Rock wall and peaks behind */}
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, random(`pt${i}`) * 3, 0]}>
          <mesh material={i % 2 ? rock : rockLight} position={[0, p.h / 2 - 2, 0]}>
            <coneGeometry args={[p.r, p.h, 7, 1]} />
          </mesh>
          <mesh material={snowMat} position={[0, p.h * 0.8 - 2, 0]}>
            <coneGeometry args={[p.r * 0.42, p.h * 0.42, 7, 1]} />
          </mesh>
        </group>
      ))}
      <mesh material={rock} position={[2, 7, -26]} scale={[20, 9, 4]}>
        <dodecahedronGeometry args={[1, 1]} />
      </mesh>
      {/* The hanging glacier: an ice tongue draped over the cliff lip, and its waterfall */}
      <mesh material={ice} position={[3, 14.5, -23.5]} scale={[7, 2.2, 3]} rotation={[0.2, 0, 0.05]}>
        <dodecahedronGeometry args={[1, 1]} />
      </mesh>
      <mesh material={ice} position={[3.5, 12.6, -22.6]} scale={[4, 1.4, 1.6]} rotation={[0.5, 0.2, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const t = ((frame * 0.03 + i / 5) % 1) as number;
        return <mesh key={i} geometry={G.box(0.5, 2.6, 0.05, 0.02)} material={flat(i % 2 ? "#ffffff" : "#e3f3fb")} position={[3.6, 11.5 - t * 9, -22.2]} />;
      })}
      <mesh geometry={G.box(0.7, 10, 0.04, 0.02)} material={flat("#eaf6fc")} position={[3.6, 7.2, -22.3]} />
      {/* Snowy firs framing the meadow */}
      {[
        [-7, -6, 1.6],
        [-9.5, -9, 2],
        [-5, -12, 1.8],
        [8, -7, 1.7],
        [10.5, -10, 2.1],
        [13, -5, 1.5],
        [-13, -4, 1.4],
        [6, -14, 2],
      ].map(([x, z, s], i) => (
        <SnowFir key={i} position={[x, 0, z]} scale={s} />
      ))}
      <Snowfall frame={frame} amount={snow} />
    </group>
  );
};

/** Slow flakes drifting down around the origin. */
export const Snowfall: React.FC<{ frame: number; amount?: number; center?: Vec3 }> = ({ frame, amount = 1, center = [0, 0, 0] }) => {
  const n = Math.round(160 * amount);
  return (
    <group position={center}>
      {Array.from({ length: n }, (_, i) => {
        const r = (k: string) => random(`flake${i}${k}`);
        const fall = (frame * (0.015 + r("v") * 0.015) + r("y") * 9) % 9;
        return <mesh key={i} geometry={G.sphere(0.03 + r("s") * 0.03)} material={flat("#ffffff")} position={[(r("x") - 0.5) * 18 + Math.sin(frame * 0.02 + i) * 0.3, 8 - fall, (r("z") - 0.5) * 12 - 1]} />;
      })}
    </group>
  );
};
