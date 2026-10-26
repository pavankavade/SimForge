import type React from "react";
import { useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";
import { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, wobble } from "../../kit";
import { Cable, HarpoonMesh, HazardBand } from "./Dart";

interface HydraulicBallistaProps {
  x: number;
  z: number;
  /** Height of the harpoon groove once lifted (the bolt flies at this height). */
  boltY: number;
  /** x of the loaded harpoon's tip, relative to `x`. */
  muzzle: number;
  harpoonLength: number;
  installFrame: number;
  boltFrame: number;
  liftFrame: number;
  /** [load, fire] windows: a harpoon lies in the groove between them, string cocked. */
  shots: ReadonlyArray<readonly [number, number]>;
  sinkFrame: number;
}

const DROP = 1.6;
const BOW_R = 0.72;

/**
 * Floor-mounted pneumatic ballista. Rises out of a hazard-striped floor hatch,
 * bolts down, then two chrome pistons lift the deck to firing height. Each
 * shot: a harpoon slides into the groove, the bowstring cocks, fires with a
 * recoil kick.
 */
export const HydraulicBallista: React.FC<HydraulicBallistaProps> = ({
  x,
  z,
  boltY,
  muzzle,
  harpoonLength,
  installFrame,
  boltFrame,
  liftFrame,
  shots,
  sinkFrame,
}) => {
  const frame = useCurrentFrame();
  if (frame < installFrame) return null;
  const sink = clamp01((frame - sinkFrame) / 16);
  if (sink >= 1) return null;

  const rise = easeOutBack(clamp01((frame - installFrame) / 20), 1.4);
  const baseY = -DROP * (1 - rise) - DROP * easeInOut(sink);
  const lift = easeOutBack(clamp01((frame - liftFrame) / 14), 1.6);
  const deckY = lerp(boltY - 0.45, boltY, lift);
  const bolted = frame >= boltFrame;

  const fired = shots.map(([, fire]) => fire).filter((f) => frame >= f);
  const lastFire = fired.length ? fired[fired.length - 1] : -1000;
  const recoil = frame >= lastFire ? 0.16 * Math.exp(-(frame - lastFire) / 5) : 0;
  const loaded = shots.find(([load, fire]) => frame >= load && frame < fire);
  const slideIn = loaded ? easeOutCubic(clamp01((frame - loaded[0]) / 10)) : 0;
  const cock = loaded ? easeInOut(clamp01((frame - loaded[0] - 8) / 14)) : 0;
  const pistonH = deckY - 0.3;

  return (
    <group position={[x, 0, z]}>
      {/* Floor hatch (stays flush with the floor) */}
      <Part geo={G.box(2.1, 0.04, 1.5, 0.015)} mat={vinyl("#24262d", "leather")} position={[0, 0.02, 0]} ink={INK_THIN} />
      <HazardBand width={2.1} height={0.05} depth={0.04} position={[0, 0.03, 0.76]} count={12} />

      <group position={[0, baseY, 0]}>
        {/* Base turret ring with brass trim, hazard band and bolts */}
        <Part geo={G.cyl(0.62, 0.7, 0.3, 28)} mat={vinyl("#4a4f5c", "leather")} position={[0, 0.15, 0]} />
        <Part geo={G.torus(0.62, 0.035)} mat={vinyl("#ffcf5a", "gloss")} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const pop = bolted ? easeOutBack(clamp01((frame - boltFrame - i * 2) / 6), 2.5) : 0;
          return (
            <Part
              key={i}
              geo={G.cyl(0.07, 0.07, 0.08, 6)}
              mat={vinyl("#d9dee8", "metal")}
              position={[Math.cos(a) * 0.56, 0.3 + 0.04 * pop, Math.sin(a) * 0.56]}
              scale={[1, Math.max(0.05, pop), 1]}
              ink={INK_THIN}
            />
          );
        })}
        {/* Pneumatic pistons */}
        {[-0.38, 0.38].map((px) => (
          <group key={px} position={[px, 0.3, 0]}>
            <Part geo={G.cyl(0.11, 0.11, 0.3, 14)} mat={vinyl("#3a3e4a", "leather")} position={[0, 0.15, 0]} />
            <Part geo={G.cyl(0.065, 0.065, pistonH, 14)} mat={vinyl("#e8edf5", "metal")} position={[0, pistonH / 2, 0]} ink={INK_THIN} />
          </group>
        ))}
        {/* Pressure gauge */}
        <group position={[0.42, 0.62, 0.45]}>
          <Part geo={G.cyl(0.09, 0.09, 0.04, 16)} mat={vinyl("#ffcf5a", "gloss")} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
          <mesh geometry={G.disc(0.07)} material={lift > 0.5 ? glow("#7dff5a", 1.6) : flat("#e8e3d4")} position={[0, 0, 0.022]} />
        </group>

        {/* Deck: wood stock with iron straps, kicked back on recoil */}
        <group position={[recoil, deckY - 0.3, 0]}>
          <Part geo={G.box(1.85, 0.18, 0.32, 0.05)} mat={vinyl("#8a5a32", "wood")} position={[0.05, 0.16, 0]} />
          {[-0.55, 0.05, 0.65].map((sx) => (
            <Part key={sx} geo={G.box(0.07, 0.2, 0.34, 0.02)} mat={vinyl("#4a4f5c", "leather")} position={[sx, 0.16, 0]} ink={INK_THIN} />
          ))}
          {/* Groove rails */}
          {[-1, 1].map((s) => (
            <Part key={s} geo={G.box(1.7, 0.05, 0.04, 0.015)} mat={vinyl("#ffcf5a", "gloss")} position={[0.05, 0.27, s * 0.07]} ink={INK_THIN} />
          ))}
          {/* Bow arms: a flattened half-torus bulging forward (-x), tips swept back */}
          <group position={[-0.35, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <Part geo={G.torus(BOW_R, 0.065, Math.PI)} mat={vinyl("#6e4426", "wood")} rotation={[0, 0, Math.PI / 2]} scale={[1, 0.45, 1]} />
          </group>
          {[-1, 1].map((s) => (
            <Part key={`cap${s}`} geo={G.sphere(0.08)} mat={vinyl("#ffcf5a", "gloss")} position={[-0.35, 0.28, s * BOW_R]} ink={INK_THIN} />
          ))}
          {/* Bowstring to the nock (pulled back when cocked) */}
          <Cable a={[-0.35, 0.28, BOW_R]} b={[lerp(-0.35, 0.55, cock), 0.3, 0]} radius={0.014} color="#e8dcc0" />
          <Cable a={[-0.35, 0.28, -BOW_R]} b={[lerp(-0.35, 0.55, cock), 0.3, 0]} radius={0.014} color="#e8dcc0" />
          {/* Rear crank */}
          <Part geo={G.cyl(0.12, 0.12, 0.42, 16)} mat={vinyl("#4a4f5c", "leather")} position={[0.85, 0.2, 0]} rotation={[Math.PI / 2, 0, cock * 6]} />
          <Part geo={G.box(0.05, 0.3, 0.05, 0.015)} mat={vinyl("#ffcf5a", "gloss")} position={[0.85, 0.2, 0.24]} rotation={[0, 0, cock * 6]} ink={INK_THIN} />
          {/* Loaded harpoon slides in from the back */}
          {loaded ? (
            <group position={[muzzle + (1 - slideIn) * harpoonLength * 0.9, 0.3, 0]} rotation={[0, 0, Math.PI]}>
              <HarpoonMesh length={harpoonLength} />
            </group>
          ) : null}
        </group>
      </group>
      {frame >= lastFire && frame < lastFire + 5 ? (
        <GlowSprite position={[muzzle - 0.1, boltY, 0]} size={1.4} color="#fff0c0" opacity={0.8} />
      ) : null}
    </group>
  );
};

interface WallWinchProps {
  position: Vec3;
  installFrame: number;
  /** Drum spins between these frames. */
  spin: readonly [number, number];
  /** Rattles on impact. */
  slamFrame: number;
}

/** Motorised winch drum bolted to the wall: the paladin's harpoon cable winds onto it. */
export const WallWinch: React.FC<WallWinchProps> = ({ position, installFrame, spin, slamFrame }) => {
  const frame = useCurrentFrame();
  if (frame < installFrame) return null;
  const out = easeOutBack(clamp01((frame - installFrame) / 14));
  const turns = clamp01((frame - spin[0]) / (spin[1] - spin[0]));
  const angle = turns * turns * 22;
  const shake = wobble(frame, slamFrame, 0.04, 1.4, 5);
  const running = frame >= spin[0] && frame < spin[1] + 6;
  return (
    <group position={[position[0] + (1 - out) * 0.5, position[1] + shake, position[2]]}>
      <Part geo={G.box(0.16, 0.9, 1.1, 0.04)} mat={vinyl("#4a4f5c", "leather")} position={[0.12, 0, 0]} />
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.box(0.32, 0.22, 0.08, 0.03)} mat={vinyl("#3a3e4a", "leather")} position={[-0.05, 0, s * 0.42]} ink={INK_THIN} />
      ))}
      <group rotation={[0, 0, angle]}>
        <Part geo={G.cyl(0.2, 0.2, 0.76, 20)} mat={vinyl("#8a5a32", "wood")} position={[-0.08, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {[-0.24, -0.08, 0.08, 0.24].map((cz) => (
          <Part key={cz} geo={G.torus(0.21, 0.03)} mat={vinyl("#2b2d33", "leather")} position={[-0.08, 0, cz]} ink={false} />
        ))}
        <Part geo={G.box(0.05, 0.46, 0.05, 0.015)} mat={vinyl("#ffcf5a", "gloss")} position={[-0.08, 0, 0.4]} ink={INK_THIN} />
      </group>
      <HazardBand width={1.0} height={0.08} position={[0.03, -0.38, 0]} rotation={[0, Math.PI / 2, 0]} count={8} />
      <mesh geometry={G.sphere(0.06)} material={running ? glow("#ff4a3a", 3) : flat("#5a1a1a")} position={[0.02, 0.36, 0.45]} />
      {running ? <GlowSprite position={[0.02, 0.36, 0.5]} size={0.6} color="#ff4a3a" opacity={0.6} /> : null}
    </group>
  );
};
