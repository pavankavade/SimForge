import type React from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { GlowSprite } from "../dungeon/Fx";
import { clamp01, easeInOut, easeOutBack, lerp } from "../../kit";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { Cable, HazardBand } from "./Dart";

interface ArcaneCoilgunProps {
  x: number;
  z: number;
  /** Barrel axis height (the slug flies at this height). */
  boltY: number;
  /** Muzzle x relative to `x`. */
  muzzle: number;
  installFrame: number;
  runeFrame: number;
  coilFrame: number;
  capacitorFrame: number;
  /** [charge start, fire] windows. */
  shots: ReadonlyArray<readonly [number, number]>;
  sinkFrame: number;
}

const DROP = 1.8;
const RING_XS = [-0.75, -0.42, -0.09, 0.24];

/** Jagged bolt between two points, re-rolled every two frames. */
const Bolt: React.FC<{ a: Vec3; b: Vec3; seed: string; color?: string }> = ({ a, b, seed, color = "#bff6ff" }) => {
  const pts: Vec3[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const jitter = i > 0 && i < 5 ? 0.12 : 0;
    pts.push([
      lerp(a[0], b[0], t) + (random(`${seed}-x${i}`) - 0.5) * jitter,
      lerp(a[1], b[1], t) + (random(`${seed}-y${i}`) - 0.5) * jitter,
      lerp(a[2], b[2], t) + (random(`${seed}-z${i}`) - 0.5) * jitter,
    ]);
  }
  return (
    <group>
      {pts.slice(1).map((p, i) => (
        <Cable key={i} a={pts[i]} b={p} radius={0.016} color={color} />
      ))}
    </group>
  );
};

/**
 * Supersonic arcane coilgun on a rune plinth: four copper accelerator coils
 * around a long barrel, two glass capacitors crackling with lightning. Rises
 * from the floor; coils light one by one while it charges, fires with a kick.
 */
export const ArcaneCoilgun: React.FC<ArcaneCoilgunProps> = ({
  x,
  z,
  boltY,
  muzzle,
  installFrame,
  runeFrame,
  coilFrame,
  capacitorFrame,
  shots,
  sinkFrame,
}) => {
  const frame = useCurrentFrame();
  if (frame < installFrame) return null;
  const sink = clamp01((frame - sinkFrame) / 16);
  if (sink >= 1) return null;

  const rise = easeOutBack(clamp01((frame - installFrame) / 20), 1.4);
  const baseY = -DROP * (1 - rise) - DROP * easeInOut(sink);
  const runes = clamp01((frame - runeFrame) / 12);
  const coils = frame >= coilFrame;
  const caps = clamp01((frame - capacitorFrame) / 10);
  const active = shots.find(([a, b]) => frame >= a && frame < b);
  const charge = active ? clamp01((frame - active[0]) / (active[1] - active[0])) : 0;
  const lastFire = shots.map(([, f]) => f).filter((f) => frame >= f).pop() ?? -1000;
  const since = frame - lastFire;
  const recoil = since >= 0 ? 0.22 * Math.exp(-since / 5) : 0;
  const flash = since >= 0 && since < 5;
  const flicker = Math.floor(frame / 2);
  const barrelLen = 0.7 - muzzle;

  return (
    <group position={[x, 0, z]}>
      <Part geo={G.box(2.0, 0.04, 1.4, 0.015)} mat={vinyl("#24262d", "leather")} position={[0, 0.02, 0]} ink={INK_THIN} />
      <HazardBand width={2.0} height={0.05} depth={0.04} position={[0, 0.03, 0.71]} count={12} />

      <group position={[0, baseY, 0]}>
        {/* Rune plinth */}
        <Part geo={G.cyl(0.55, 0.66, 0.5, 8)} mat={vinyl("#3b3550", "leather")} position={[0, 0.25, 0]} />
        <Part geo={G.torus(0.6, 0.04)} mat={runes > 0 ? glow("#7de9ff", 0.6 + 2 * runes) : vinyl("#ffcf5a", "gloss")} position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            geometry={G.box(0.1, 0.18, 0.01, 0.004)}
            material={runes > 0 ? glow("#b45cff", 2.5 * runes) : flat("#2a2438")}
            position={[-0.25 + i * 0.25, 0.22, 0.6]}
          />
        ))}
        {/* Yoke */}
        {[-1, 1].map((s) => (
          <Part key={s} geo={G.box(0.24, boltY - 0.35, 0.1, 0.03)} mat={vinyl("#4a4f5c", "leather")} position={[-0.1, 0.5 + (boltY - 0.35) / 2, s * 0.3]} />
        ))}

        <group position={[recoil, boltY, 0]}>
          {/* Barrel */}
          <Part geo={G.cyl(0.13, 0.15, barrelLen, 20)} mat={vinyl("#2f3340", "leather")} position={[muzzle + barrelLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
          <Part geo={G.cyl(0.19, 0.17, 0.18, 20)} mat={vinyl("#ffcf5a", "gloss")} position={[muzzle + 0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
          <Part geo={G.box(0.5, 0.36, 0.42, 0.08)} mat={vinyl("#4a4f5c", "leather")} position={[0.6, 0, 0]} />
          {/* Accelerator coils: light up front-to-back as the charge builds */}
          {RING_XS.map((rx, i) => {
            const lit = coils && (charge > i / RING_XS.length || since < 10);
            return (
              <group key={rx} position={[rx, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <Part geo={G.torus(0.22, 0.065)} mat={vinyl("#c8743a", "leather")} />
                {lit ? <mesh geometry={G.torus(0.22, 0.03)} material={glow("#5ff0ff", 3)} position={[0, 0, 0.02]} /> : null}
              </group>
            );
          })}
          {/* Capacitors */}
          {[-1, 1].map((s) => (
            <group key={s} position={[0.55, 0.42, s * 0.32]}>
              <Part geo={G.cyl(0.13, 0.13, 0.08, 16)} mat={vinyl("#ffcf5a", "gloss")} position={[0, -0.22, 0]} ink={INK_THIN} />
              <mesh geometry={G.cyl(0.11, 0.11, 0.38, 16)} position={[0, 0, 0]}>
                <meshStandardMaterial color="#a8f4ff" transparent opacity={0.35} roughness={0.1} depthWrite={false} />
              </mesh>
              <mesh geometry={G.cyl(0.04, 0.04, 0.32, 8)} material={caps > 0 ? glow("#5ff0ff", 1 + 3 * Math.max(caps * 0.4, charge)) : flat("#3a5560")} />
              <Part geo={G.cyl(0.13, 0.13, 0.06, 16)} mat={vinyl("#ffcf5a", "gloss")} position={[0, 0.22, 0]} ink={INK_THIN} />
            </group>
          ))}
          {/* Lightning between the capacitors and onto the coils while charging */}
          {charge > 0.05 ? (
            <>
              <Bolt a={[0.55, 0.64, -0.32]} b={[0.55, 0.64, 0.32]} seed={`cg-cap-${flicker}`} />
              <Bolt a={[0.55, 0.6, 0.32]} b={[RING_XS[3], 0.22, 0.1]} seed={`cg-c1-${flicker}`} />
              {charge > 0.5 ? <Bolt a={[0.55, 0.6, -0.32]} b={[RING_XS[1], 0.22, -0.1]} seed={`cg-c2-${flicker}`} /> : null}
              <pointLight position={[0.2, 0.6, 0.6]} color="#5ff0ff" intensity={2 + 6 * charge} distance={4} decay={2} />
            </>
          ) : null}
        </group>
      </group>
      {charge > 0 || flash ? (
        <GlowSprite position={[muzzle - 0.1, boltY, 0]} size={flash ? 2.2 : 0.4 + charge * 1.2} color="#7ff4ff" opacity={flash ? 0.95 : 0.4 + 0.5 * charge} />
      ) : null}
    </group>
  );
};

/** The coilgun slug: a white-hot rod with a cyan sheath (nose at the origin, +x). */
export const SlugMesh: React.FC = () => (
  <group>
    <mesh geometry={G.capsule(0.07, 0.42)} material={glow("#ffffff", 2.5)} position={[-0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
    <GlowSprite position={[-0.15, 0, 0]} size={0.9} color="#5ff0ff" opacity={0.9} />
  </group>
);

interface CycloneShieldProps {
  position: Vec3;
  startFrame: number;
  /** Slug grinding in the vortex: it wobbles and shrinks. */
  strainFrame: number;
  shatterFrame: number;
}

const BAND_YS = [0.15, 0.55, 0.95, 1.35, 1.75];

/**
 * Swirling wind funnel around the mage: stacked spinning wind bands and
 * streaks with debris riding the vortex. Bursts into shards when it shatters.
 */
export const CycloneShield: React.FC<CycloneShieldProps> = ({ position, startFrame, strainFrame, shatterFrame }) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > shatterFrame + 20) return null;
  const [px, py, pz] = position;

  if (frame >= shatterFrame) {
    const t = clamp01((frame - shatterFrame) / 18);
    return (
      <group position={[px, py + 1.0, pz]}>
        <GlowSprite size={3.2 * (1 - t) + 0.5} color="#9ff0ff" opacity={0.9 * (1 - t)} />
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const r = 0.9 + t * 3.2;
          return (
            <mesh
              key={i}
              geometry={G.box(0.18, 0.06, 0.02, 0.01)}
              material={glow("#7de9ff", 2)}
              position={[Math.cos(a) * r, Math.sin(a) * r * 0.75 - t * t * 1.2, 0.2 * Math.sin(a * 3)]}
              rotation={[t * 6, t * 4, a]}
              scale={1 - t * 0.7}
            />
          );
        })}
      </group>
    );
  }

  const grow = easeOutBack(clamp01((frame - startFrame) / 12));
  const strain = frame >= strainFrame ? clamp01((frame - strainFrame) / (shatterFrame - strainFrame)) : 0;
  const jitter = strain > 0 ? (random(`cy-${frame}`) - 0.5) * 0.12 * strain : 0;
  const spin = frame * 0.32;
  return (
    <group position={[px + jitter, py, pz]} scale={[grow * (1 - 0.15 * strain), grow, grow * (1 - 0.15 * strain)]}>
      {BAND_YS.map((by, i) => {
        const r = 0.62 + by * 0.28;
        return (
          <group key={by} position={[0, by, 0]} rotation={[0.18 * Math.sin(frame * 0.1 + i), spin * (1 + i * 0.12), 0.12 * Math.cos(frame * 0.13 + i)]}>
            <mesh geometry={G.torus(r, 0.035, Math.PI * 1.3)} rotation={[Math.PI / 2, 0, 0]}>
              <meshBasicMaterial color={strain > 0.5 && frame % 4 < 2 ? "#ffffff" : "#9ff0ff"} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh geometry={G.torus(r * 0.92, 0.02, Math.PI * 0.7)} rotation={[Math.PI / 2, 0, Math.PI]}>
              <meshBasicMaterial color="#d8fbff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {/* Debris riding the vortex */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = spin * 1.4 + (i / 8) * Math.PI * 2;
        const y = 0.2 + ((i * 0.37 + frame * 0.02) % 1) * 1.7;
        const r = 0.65 + y * 0.28;
        return (
          <mesh key={i} geometry={G.sphere(0.035)} material={vinyl(i % 2 ? "#b8b0a6" : "#7a6a52", "cloth")} position={[Math.cos(a) * r, y, Math.sin(a) * r]} />
        );
      })}
      <GlowSprite position={[0, 1.0, 0]} size={2.4} color="#7de9ff" opacity={0.18 + 0.3 * strain} />
    </group>
  );
};

interface SmokingBootsProps {
  position: Vec3;
  spawnFrame: number;
}

/** A pair of empty wizard boots left smoking on a scorch mark. */
export const SmokingBoots: React.FC<SmokingBootsProps> = ({ position, spawnFrame }) => {
  const frame = useCurrentFrame();
  if (frame < spawnFrame) return null;
  const age = frame - spawnFrame;

  return (
    <group position={position}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.14, 0, 0]} rotation={[0, s * -0.15, 0]}>
          <Part geo={G.box(0.18, 0.035, 0.3, 0.015)} mat={vinyl("#1f140d", "leather")} position={[0, 0.018, 0.03]} ink={INK_THIN} />
          <Part geo={G.box(0.17, 0.12, 0.26, 0.045)} mat={vinyl("#5a341e", "leather")} position={[0, 0.08, 0.04]} />
          <Part geo={G.cyl(0.092, 0.086, 0.16, 18)} mat={vinyl("#442514", "leather")} position={[0, 0.16, 0]} />
          <mesh geometry={G.disc(0.075)} material={flat("#0d0a08")} position={[0, 0.242, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <Part geo={G.box(0.07, 0.045, 0.025, 0.01)} mat={vinyl("#ffd84d", "gloss")} position={[0, 0.09, 0.16]} ink={INK_THIN} />
        </group>
      ))}

      {/* Scorch ring on the floor */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.6, 24]} />
        <meshBasicMaterial color="#1a1518" transparent opacity={0.55} />
      </mesh>

      {/* Smoke curling out of both boots */}
      {[-0.14, 0.14, 0].map((sx, i) => {
        const cycle = ((age + i * 15) % 45) / 45;
        return (
          <GlowSprite
            key={i}
            position={[sx + Math.sin((age + i * 15) * 0.12) * 0.08, 0.25 + cycle * 0.95, 0.02 * i]}
            size={0.35 + cycle * 0.55}
            color="#99aabb"
            opacity={Math.max(0, (1 - cycle) * 0.45)}
          />
        );
      })}
    </group>
  );
};
