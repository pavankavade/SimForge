import type React from "react";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";

/**
 * Season 2, door II: the pet Mimic outgrew its chest, so now it is the whole
 * vault. Seen side-on it is one giant jaw: the vault ceiling is the upper jaw,
 * hinged high at the back (`hingeX`, `hingeY`) and opening toward the hall
 * (`lipX`). Its front cheek tapers from the hinge to the lip, lined with
 * teeth, banded like a chest, with two eyes and a keyhole nose. Closed, the
 * cheek comes down on the lower tooth rail and hides whoever is inside; the
 * gold sits deep in the mouth where the closed jaw still clears it.
 *
 * Pure function of beat-driven values: the episode solves `open` (0 shut ..
 * 1 wide), `teeth` (install 0..1), `eyes` (0 shut .. 1 open) per frame.
 * `vaultJaw` gives the same geometry to timeline code for contacts.
 */

/** Height of the lower tooth rail; the closed cheek lands on it. */
export const VAULT_LOWER_Y = 0.32;
const CLOSED_LIP_Y = 0.55;
const OPEN_LIP_Y = 5.15;
const T = 0.45;
const DEPTH = 3.2;
const CHEEK_MAX = 1.05;

export const vaultJaw = (lipX: number, hingeX: number, hingeY: number) => {
  const L = hingeX - lipX;
  const closed = Math.asin((hingeY - CLOSED_LIP_Y) / L);
  const wide = -Math.asin((OPEN_LIP_Y - hingeY) / L);
  const theta = (open: number) => closed + (wide - closed) * open;
  /** World y of the jaw's centre line above x. */
  const lineY = (x: number, open: number) => hingeY - (hingeX - x) * Math.sin(theta(open));
  /** Cheek depth (below the panel) at distance s from the hinge, solved so the closed cheek lands on the rail. */
  const cheek = (s: number) => Math.min(CHEEK_MAX, (hingeY - VAULT_LOWER_Y - s * Math.sin(closed)) / Math.cos(closed) - T / 2);
  /** World y of the cheek's tooth line above x (what a victim under it gets hit by). */
  const biteY = (x: number, open: number) => lineY(x, open) - (T / 2 + cheek(hingeX - x)) * Math.cos(theta(open));
  return { L, theta, lineY, cheek, biteY };
};

const WOOD = "#7a4a28";
const WOOD_DARK = "#5e381e";
const BAND = "#4a4f5c";
const GOLD = "#f2c14e";
const TOOTH = "#f6efd6";
const GUM = "#c2306c";

export interface MimicVaultProps {
  lipX: number;
  hingeX: number;
  hingeY: number;
  z?: number;
  open: number;
  teeth: number;
  eyes: number;
  /** Pupils look toward this x (world), e.g. the next victim. */
  lookX?: number;
  /** x of the old pet's burst chest on the vault floor (omit for none). */
  oldChestX?: number;
}

/** The chest the Mimic outgrew: banded like the vault, lid ripped off, front split open. */
const BurstChest: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]} rotation={[0, 0.3, 0]} scale={1.3}>
    <Part geo={G.box(0.9, 0.5, 0.6, 0.06)} mat={vinyl(WOOD, "wood")} position={[0, 0.25, -0.05]} />
    {[-0.3, 0.3].map((dx) => (
      <Part key={dx} geo={G.box(0.08, 0.52, 0.64, 0.02)} mat={vinyl(GOLD, "gloss")} position={[dx, 0.25, -0.05]} ink={INK_THIN} />
    ))}
    {/* Front panel burst outward, with a dark split behind it */}
    <mesh geometry={G.box(0.5, 0.36, 0.02, 0.01)} material={flat("#1a0d05")} position={[0.05, 0.3, 0.26]} />
    <Part geo={G.box(0.5, 0.4, 0.06, 0.02)} mat={vinyl(WOOD_DARK, "wood")} position={[0.1, 0.12, 0.42]} rotation={[1.1, 0, 0.25]} />
    {/* Lid torn off, lying upside down beside it */}
    <group position={[0.85, 0.12, 0.15]} rotation={[0, -0.6, Math.PI - 0.25]}>
      <Part geo={G.box(0.9, 0.18, 0.6, 0.06)} mat={vinyl(WOOD, "wood")} />
      <Part geo={G.box(0.08, 0.2, 0.62, 0.02)} mat={vinyl(GOLD, "gloss")} position={[-0.3, 0, 0]} ink={INK_THIN} />
      <Part geo={G.box(0.08, 0.2, 0.62, 0.02)} mat={vinyl(GOLD, "gloss")} position={[0.3, 0, 0]} ink={INK_THIN} />
    </group>
    {/* A few splinters */}
    {[-0.6, -0.45].map((dx, i) => (
      <Part key={dx} geo={G.box(0.32, 0.05, 0.08, 0.01)} mat={vinyl(WOOD, "wood")} position={[dx, 0.03, 0.35 - i * 0.2]} rotation={[0, 0.7 + i, 0]} ink={INK_THIN} />
    ))}
  </group>
);

export const MimicVault: React.FC<MimicVaultProps> = ({ lipX, hingeX, hingeY, z = -0.6, open, teeth, eyes, lookX, oldChestX }) => {
  const frame = useCurrentFrame();
  const jaw = vaultJaw(lipX, hingeX, hingeY);
  const L = jaw.L;
  const theta = jaw.theta(open);
  const zFront = DEPTH / 2;
  const toothS = Array.from({ length: Math.floor((L - 0.5) / 0.48) }, (_, i) => 0.5 + i * 0.48);
  const lowerXs = Array.from({ length: Math.floor((hingeX - lipX - 0.3) / 0.5) }, (_, i) => lipX + 0.3 + i * 0.5);
  const tooth = Math.max(0.001, teeth);
  const mouthGlow = 0.35 + 0.65 * open;
  // Eyes sit on the cheek where it is full height; pupils follow lookX.
  const eyeS = [2.1, 3.4];
  const look = lookX === undefined ? 0 : Math.max(-1, Math.min(1, (lookX - (hingeX - 2.7)) / 4));
  // One smooth tapered cheek face, sampled from the closed-jaw solution.
  const cheekGeo = useMemo(() => {
    const { cheek } = vaultJaw(lipX, hingeX, hingeY);
    const shape = new THREE.Shape();
    const n = 24;
    shape.moveTo(0.05, -T / 2 + 0.04);
    for (let i = 0; i <= n; i++) {
      const sv = 0.05 + ((L - 0.05) * i) / n;
      shape.lineTo(-sv, -T / 2 - Math.max(0.1, cheek(sv)) + 0.04);
    }
    shape.lineTo(-L, -T / 2 + 0.04);
    shape.lineTo(0.05, -T / 2 + 0.04);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  }, [L, lipX, hingeX, hingeY]);
  const blink = eyes * (1 - Math.max(0, Math.sin(frame * 0.07) > 0.985 ? 1 : 0));

  return (
    <group>
      {/* Inside of the mouth: gum-red back wall with a dark throat by the hinge */}
      <group position={[0, 0, z]}>
        {/* Flushes in from the floor as it wakes, so the disguised vault is just stone */}
        {eyes > 0.01 ? (
          <>
            <mesh position={[(lipX + hingeX) / 2, 1.25 * Math.min(1, eyes), -DEPTH / 2 + 0.06]} scale={[1, Math.min(1, eyes), 1]}>
              <planeGeometry args={[L, 2.5]} />
              <meshStandardMaterial color="#3e0a19" emissive="#2a0512" emissiveIntensity={0.5 * mouthGlow} roughness={0.7} />
            </mesh>
            <mesh position={[hingeX - 1.2, 1.0, -DEPTH / 2 + 0.08]} scale={[Math.min(1, eyes), 1.15 * Math.min(1, eyes), 1]}>
              <circleGeometry args={[0.75, 28]} />
              <meshBasicMaterial color="#12030a" />
            </mesh>
          </>
        ) : null}
        {/* Tongue along the floor behind the walking lane */}
        <Part geo={G.capsule(0.32, L * 0.62)} mat={vinyl(GUM, "gloss")} position={[hingeX - L * 0.42, 0.1, -0.85]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 2.4]} ink={INK_THIN} />
        {/* Lower jaw: front rail with teeth, gum strip */}
        <Part geo={G.box(L + 0.2, VAULT_LOWER_Y, 0.34, 0.06)} mat={vinyl(WOOD_DARK, "wood")} position={[(lipX + hingeX) / 2, VAULT_LOWER_Y / 2, zFront - 0.17]} />
        <Part geo={G.box(L + 0.1, 0.08, 0.3, 0.03)} mat={vinyl(GUM, "gloss")} position={[(lipX + hingeX) / 2, VAULT_LOWER_Y + 0.02, zFront - 0.17]} ink={false} />
        {lowerXs.map((x, i) => (
          <Part
            key={`lt-${i}`}
            geo={G.cone(0.1, 0.32 + (i % 3) * 0.06)}
            mat={vinyl(TOOTH, "bone")}
            position={[x, VAULT_LOWER_Y + 0.12 * tooth, zFront - 0.17]}
            scale={tooth}
            ink={INK_THIN}
          />
        ))}
        {/* Lip teeth at the mouth's edge, leaving the walking lane clear */}
        {[-1.35, -0.95, 0.95, 1.35].map((dz) => (
          <Part key={`lip-${dz}`} geo={G.cone(0.11, 0.38)} mat={vinyl(TOOTH, "bone")} position={[lipX + 0.1, 0.16 * tooth, dz]} scale={tooth} ink={INK_THIN} />
        ))}
        {oldChestX !== undefined ? <BurstChest x={oldChestX} z={0.55} /> : null}
      </group>

      {/* Upper jaw, pivoting at the hinge */}
      <group position={[hingeX, hingeY, z]} rotation={[0, 0, theta]}>
        <Part geo={G.box(L + 0.3, T, DEPTH, 0.14)} mat={vinyl(WOOD, "wood")} position={[-L / 2 + 0.15, 0, 0]} />
        {[0.22, 0.5, 0.78].map((k) => (
          <Part key={`band-${k}`} geo={G.box(0.2, T + 0.08, DEPTH + 0.06, 0.05)} mat={vinyl(BAND, "leather")} position={[-L * k, 0, 0]} ink={INK_THIN} />
        ))}
        {/* Gold cap on the lip */}
        <Part geo={G.box(0.26, T + 0.1, DEPTH + 0.1, 0.06)} mat={vinyl(GOLD, "gloss")} position={[-L, 0, 0]} ink={INK_THIN} />

        {/* Front cheek: tapered so the closed jaw lands on the rail, teeth along its edge */}
        <mesh geometry={cheekGeo} position={[0, 0, zFront - 0.3]} castShadow>
          <meshStandardMaterial color={WOOD_DARK} roughness={0.75} />
        </mesh>
        {toothS.map((s, i) => {
          const h = Math.max(0.12, jaw.cheek(s));
          return (
            <group key={`ck-${i}`}>
              <Part
                geo={G.cone(0.11, 0.34 + ((i + 1) % 3) * 0.06)}
                mat={vinyl(TOOTH, "bone")}
                position={[-s, -T / 2 - h - 0.1 * tooth, zFront - 0.15]}
                rotation={[Math.PI, 0, 0]}
                scale={tooth}
                ink={INK_THIN}
              />
            </group>
          );
        })}
        {/* Cheek outline strip and bands, so it reads as one banded chest face */}
        {[0.22, 0.5].map((k) => (
          <Part key={`cb-${k}`} geo={G.box(0.16, jaw.cheek(L * k), 0.06, 0.03)} mat={vinyl(BAND, "leather")} position={[-L * k, -T / 2 - jaw.cheek(L * k) / 2, zFront + 0.02]} ink={false} />
        ))}

        {/* Eyes on the cheek: lids close to slits while asleep */}
        {eyeS.map((s) => (
          <group key={`eye-${s}`} position={[-s, -T / 2 - 0.5, zFront + 0.05]}>
            <Part geo={G.sphere(0.34)} mat={vinyl("#fff4c4", "gloss")} scale={[1, Math.max(0.06, blink), 0.5]} ink={INK_THIN} />
            <mesh geometry={G.sphere(0.15)} material={glow("#ff9a1a", 2.2)} position={[look * 0.12, 0, 0.14]} scale={[0.8, Math.max(0.06, blink), 0.4]} />
            <mesh geometry={G.sphere(0.07)} material={flat("#1a0505")} position={[look * 0.14, 0, 0.2]} scale={[0.6, Math.max(0.06, blink), 0.3]} />
            {/* Brow plank, angrier as it wakes */}
            <Part geo={G.box(0.6, 0.1, 0.1, 0.03)} mat={vinyl(BAND, "leather")} position={[0, 0.38, 0.06]} rotation={[0, 0, (s < 3 ? 1 : -1) * 0.3 * eyes]} ink={INK_THIN} />
          </group>
        ))}
        {/* Keyhole nose */}
        <group position={[-2.75, -T / 2 - 0.82, zFront + 0.03]}>
          <Part geo={G.box(0.32, 0.36, 0.06, 0.04)} mat={vinyl(GOLD, "gloss")} ink={INK_THIN} />
          <mesh geometry={G.disc(0.06)} material={flat("#1a0d05")} position={[0, 0.05, 0.035]} />
          <mesh geometry={G.box(0.05, 0.12, 0.01, 0.01)} material={flat("#1a0d05")} position={[0, -0.05, 0.035]} />
        </group>
      </group>

      {/* Hungry pink glow from inside the mouth */}
      <GlowSprite position={[(lipX + hingeX) / 2, 1.2, z + 0.4]} color="#ff3b8a" size={4 * mouthGlow} opacity={0.22 * eyes} />
      <pointLight position={[(lipX + hingeX) / 2, 1.4, z + 1.2]} color="#ff4d8f" intensity={2.5 * eyes * mouthGlow} distance={7} decay={2} />
    </group>
  );
};
