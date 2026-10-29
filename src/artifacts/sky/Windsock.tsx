import type React from "react";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";

/**
 * Airfield-style windsock on a pole. Five alternating orange/white bands; a
 * real sock fills one band per ~3 knots and flies straight out at 15 knots.
 * `dir` is the heading the sock points to (radians about y, 0 = +z).
 */
export const Windsock: React.FC<{ position: Vec3; dir: number; knots: number; height?: number }> = ({
  position,
  dir,
  knots,
  height = 6,
}) => {
  const frame = useCurrentFrame();
  const mats = useMemo(
    () => ({
      pole: new THREE.MeshStandardMaterial({ color: "#d9dde3", roughness: 0.4 }),
      orange: new THREE.MeshStandardMaterial({ color: "#f27a2e", roughness: 0.7, side: THREE.DoubleSide }),
      white: new THREE.MeshStandardMaterial({ color: "#f6f3ec", roughness: 0.7, side: THREE.DoubleSide }),
    }),
    []
  );
  const fill = Math.min(1, knots / 15);
  /** Droop of the sock below horizontal, plus a little flutter. */
  const droop = (1 - fill) * 1.1 + Math.sin(frame * 0.35) * 0.04 * fill;
  const bands = 5;
  const bandLen = 0.42;
  return (
    <group position={position}>
      <mesh material={mats.pole} position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, height, 10]} />
      </mesh>
      <mesh material={mats.pole} position={[0, height, 0]}>
        <sphereGeometry args={[0.08, 10, 8]} />
      </mesh>
      <group position={[0, height - 0.1, 0]} rotation={[0, dir, 0]}>
        <group rotation={[Math.PI / 2 + droop, 0, 0]}>
          <mesh material={mats.pole} position={[0, 0, 0]}>
            <torusGeometry args={[0.3, 0.025, 6, 24]} />
          </mesh>
          {Array.from({ length: bands }, (_, i) => {
            const r0 = 0.3 - i * 0.04;
            const r1 = r0 - 0.04;
            // Bands past the filled length sag a bit more and wave.
            const slack = i / bands > fill ? 0.12 : 0;
            const wave = Math.sin(frame * 0.4 - i * 0.9) * 0.03 * (i + 1);
            return (
              <mesh
                key={i}
                material={i % 2 ? mats.white : mats.orange}
                position={[wave, (i + 0.5) * bandLen, slack * i * 0.4]}
                castShadow
              >
                <cylinderGeometry args={[r1, r0, bandLen, 16, 1, true]} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
};
