import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";

/** Puffy cumulus: a flat-bottomed cluster of smooth spheres, bright on top, cooler underneath. */
export const CloudPuff: React.FC<{ position: Vec3; scale?: number; seed?: number }> = ({ position, scale = 1, seed = 0 }) => {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#dfe8f4",
        emissiveIntensity: 0.35,
        roughness: 1,
        fog: false,
      }),
    []
  );
  const blobs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = random(`cloud-${seed}-a${i}`);
        const b = random(`cloud-${seed}-b${i}`);
        const x = (i - 3.5) * 0.5 + (a - 0.5) * 0.4;
        const r = 0.55 + b * 0.5 - Math.abs(x) * 0.12;
        return { x, y: r * 0.55, z: (b - 0.5) * 0.5, r };
      }),
    [seed]
  );
  return (
    <group position={position} scale={scale}>
      {blobs.map((p, i) => (
        <mesh key={i} material={mat} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.r, 20, 14]} />
        </mesh>
      ))}
      {/* Flat base */}
      <mesh material={mat} position={[0, 0.12, 0]} scale={[2.3, 0.25, 0.7]}>
        <sphereGeometry args={[1, 24, 12]} />
      </mesh>
    </group>
  );
};
