import type React from "react";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { G } from "../characters/hero";

/**
 * Rural coach broken down on the shoulder: cream body with a teal stripe,
 * hazards blinking, steam pouring out of the front grille. Front faces +z.
 */

const LEN = 8;
const W = 2.5;
const H = 2.9;

const std = (color: string, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

/** `broken` 0 = running (no steam, hazards off), 1 = steaming with hazards blinking. */
export const BrokenBus: React.FC<{ position: Vec3; rotationY?: number; broken?: number }> = ({ position, rotationY = 0, broken = 1 }) => {
  const frame = useCurrentFrame();
  const m = useMemo(
    () => ({
      body: std("#f3ead6", 0.5),
      stripe: std("#1f8f8c", 0.5),
      roof: std("#e2d6bd", 0.6),
      glass: std("#2c3d55", 0.15, { envMapIntensity: 1.4 }),
      tyre: std("#22232a", 0.9),
      hub: std("#c9ced6", 0.4),
      bumper: std("#8c96a8", 0.4),
      steam: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.82, depthWrite: false }),
      hazardOn: new THREE.MeshStandardMaterial({ color: "#ffb13b", emissive: "#ff9a1f", emissiveIntensity: 3 }),
      hazardOff: std("#a8641f", 0.4),
      cone: std("#f27a2e", 0.6),
    }),
    []
  );
  const blink = broken > 0.5 && Math.floor(frame / 12) % 2 === 0;
  const front = LEN / 2;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Body */}
      <mesh geometry={G.box(W, H - 0.5, LEN, 0.35)} material={m.body} position={[0, 0.5 + (H - 0.5) / 2, 0]} castShadow receiveShadow />
      <mesh geometry={G.box(W - 0.2, 0.25, LEN - 0.4, 0.1)} material={m.roof} position={[0, H + 0.08, 0]} castShadow />
      {/* Teal stripe all round, under the windows */}
      <mesh geometry={G.box(W + 0.02, 0.28, LEN + 0.02, 0.12)} material={m.stripe} position={[0, 1.45, 0]} />
      {/* Side windows */}
      {([-1, 1] as const).map((s) =>
        [-2.6, -1.3, 0, 1.3, 2.5].map((z) => (
          <mesh key={`${s}${z}`} geometry={G.box(0.04, 0.9, 1.05, 0.02)} material={m.glass} position={[s * (W / 2 + 0.005), 2.15, z]} />
        ))
      )}
      {/* Windshield and route sign */}
      <mesh geometry={G.box(W - 0.4, 1.05, 0.04, 0.04)} material={m.glass} position={[0, 2.1, front + 0.005]} />
      <mesh geometry={G.box(1.5, 0.22, 0.04, 0.03)} material={blink ? m.hazardOn : m.hazardOff} position={[0, 2.82, front + 0.01]} />
      {/* Grille, bumper, headlights and hazards */}
      <mesh geometry={G.box(1.3, 0.5, 0.06, 0.05)} material={m.bumper} position={[0, 1.05, front + 0.02]} />
      <mesh geometry={G.box(W + 0.05, 0.22, 0.25, 0.08)} material={m.bumper} position={[0, 0.6, front]} castShadow />
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh geometry={G.sphere(0.13)} material={std("#fff6d8", 0.2)} position={[s * 0.92, 1.05, front + 0.02]} scale={[1, 1, 0.4]} />
          <mesh geometry={G.sphere(0.09)} material={blink ? m.hazardOn : m.hazardOff} position={[s * 1.05, 1.45, front + 0.03]} scale={[1, 1, 0.4]} />
          <mesh geometry={G.sphere(0.09)} material={blink ? m.hazardOn : m.hazardOff} position={[s * 1.05, 1.45, -front - 0.03]} scale={[1, 1, 0.4]} />
        </group>
      ))}
      {/* Wheels */}
      {([-1, 1] as const).map((s) =>
        [front - 1.5, -front + 1.6].map((z) => (
          <group key={`${s}${z}`} position={[s * (W / 2 - 0.12), 0.48, z]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={G.cyl(0.48, 0.48, 0.34, 24)} material={m.tyre} castShadow />
            <mesh geometry={G.cyl(0.22, 0.22, 0.36, 16)} material={m.hub} />
          </group>
        ))
      )}
      {/* Steam pouring from the grille: puffs rise, swell and drift with the wind */}
      {Array.from({ length: broken > 0 ? 14 : 0 }, (_, i) => {
        const t = ((frame + i * 9) % 126) / 126;
        const s = 0.35 + t * 1.3;
        return (
          <mesh
            key={i}
            geometry={G.sphere(0.5)}
            material={m.steam}
            position={[Math.sin(i * 2.1) * 0.35 - t * t * 2.4, 1.1 + t * 2.4, front + 0.45 + t * 0.5 + Math.cos(i * 1.7) * 0.2]}
            scale={[s * 1.25 * broken, s * (1 - t * 0.35) * broken, s * broken]}
          />
        );
      })}
      {/* Rear: window, tail lights, bumper and engine grille */}
      <mesh geometry={G.box(W - 0.5, 0.8, 0.04, 0.04)} material={m.glass} position={[0, 2.2, -front - 0.005]} />
      <mesh geometry={G.box(1.4, 0.55, 0.05, 0.04)} material={m.bumper} position={[0, 1.05, -front - 0.02]} />
      {[0.9, 1.0, 1.1, 1.2].map((y) => (
        <mesh key={y} geometry={G.box(1.2, 0.03, 0.06, 0.01)} material={m.tyre} position={[0, y, -front - 0.04]} />
      ))}
      <mesh geometry={G.box(W + 0.05, 0.22, 0.25, 0.08)} material={m.bumper} position={[0, 0.6, -front]} castShadow />
      {([-1, 1] as const).map((s) => (
        <mesh key={s} geometry={G.box(0.22, 0.36, 0.05, 0.05)} material={std("#d63a34", 0.3)} position={[s * 0.98, 1.0, -front - 0.02]} />
      ))}
      {/* Warning cone behind the bus */}
      <mesh geometry={G.cone(0.2, 0.55, 16)} material={m.cone} position={[-0.6, 0.28, -front - 2.4]} castShadow />
    </group>
  );
};
