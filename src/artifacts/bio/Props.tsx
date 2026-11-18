import type React from "react";
import { useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, vinyl } from "../characters/hero";

/** Analogy props: the balance scale, the knocking gauntlet, the dragonfly. */

// ---------------------------------------------------------------------------
// Balance scale
// ---------------------------------------------------------------------------
export const SCALE = { pivotY: 4.3, arm: 1.3, hang: 3.1, panR: 0.86 };
/** Top surface of a pan (side -1 = left, +1 = right) when the beam is tilted by `tilt` radians (+ = left side down). */
export const panTop = (side: -1 | 1, tilt: number): Vec3 => [side * SCALE.arm * Math.cos(tilt), SCALE.pivotY + side * SCALE.arm * Math.sin(tilt) - SCALE.hang + 0.04, 0];

/** A brass balance: the beam rotates by `tilt`, the pans hang level under its ends. */
export const BalanceScale: React.FC<{ position?: Vec3; tilt: number }> = ({ position = [0, 0, 0], tilt }) => {
  const brass = vinyl("#e2b04a", "gloss");
  const dark = vinyl("#4a4f5e", "leather");
  const { pivotY, arm, hang, panR } = SCALE;
  return (
    <group position={position}>
      <Part geo={G.cyl(0.62, 0.78, 0.16, 28)} mat={dark} position={[0, 0.08, 0]} />
      <Part geo={G.cyl(0.07, 0.1, pivotY, 14)} mat={dark} position={[0, pivotY / 2, 0]} />
      <Part geo={G.sphere(0.15)} mat={brass} position={[0, pivotY + 0.02, 0]} />
      <group position={[0, pivotY, 0]} rotation={[0, 0, tilt]}>
        <Part geo={G.box(arm * 2 + 0.2, 0.1, 0.1, 0.04)} mat={brass} />
        <Part geo={G.cone(0.07, 0.3, 10)} mat={brass} position={[0, 0.2, 0]} ink={INK_THIN} />
      </group>
      {([-1, 1] as const).map((side) => {
        const top = panTop(side, tilt);
        const endY = top[1] + hang - 0.04;
        return (
          <group key={side}>
            {/* Three rods from the beam end down to the rim of the pan. */}
            {[0, 1, 2].map((k) => {
              const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
              const rim: Vec3 = [top[0] + Math.cos(a) * panR * 0.92, top[1], Math.sin(a) * panR * 0.92];
              const end: Vec3 = [top[0], endY, 0];
              const mid: Vec3 = [(rim[0] + end[0]) / 2, (rim[1] + end[1]) / 2, (rim[2] + end[2]) / 2];
              const dx = end[0] - rim[0];
              const dy = end[1] - rim[1];
              const dz = end[2] - rim[2];
              const len = Math.hypot(dx, dy, dz);
              // Aim the rod (a y-axis cylinder) along the rim -> beam-end direction.
              const yaw = Math.atan2(dx, dz);
              const pitch = Math.acos(dy / len);
              return (
                <group key={k} position={mid} rotation={[0, yaw, 0]}>
                  <mesh geometry={G.cyl(0.014, 0.014, 1, 6)} material={brass} rotation={[pitch, 0, 0]} scale={[1, len, 1]} />
                </group>
              );
            })}
            <Part geo={G.cyl(panR, panR * 0.8, 0.08, 32)} mat={brass} position={[top[0], top[1] - 0.04, 0]} />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Gauntlet
// ---------------------------------------------------------------------------
/**
 * An armoured forearm reaching in from off-frame; the fist is at the origin,
 * knuckles toward -y, the arm runs up and away along `reach`. `rap` (0..1)
 * cocks the wrist back for a knock.
 */
export const Gauntlet: React.FC<{ position: Vec3; rap?: number; yaw?: number }> = ({ position, rap = 0, yaw = 0 }) => {
  const steel = vinyl("#9aa3b6", "gloss");
  const dark = vinyl("#5a6274", "leather");
  const leather = vinyl("#6a3f26", "leather");
  return (
    <group position={position} rotation={[0, yaw, -0.7 - rap * 0.5]}>
      <group position={[0, 0.16, 0]}>
        {/* Fist. */}
        <Part geo={G.box(0.3, 0.28, 0.34, 0.09)} mat={steel} position={[0, 0, 0]} />
        {[-0.11, 0, 0.11].map((z) => (
          <Part key={z} geo={G.sphere(0.06)} mat={dark} position={[0.02, -0.13, z]} ink={INK_THIN} />
        ))}
        <Part geo={G.capsule(0.055, 0.22)} mat={steel} position={[0.14, -0.02, 0.15]} rotation={[0.5, 0, 0.4]} ink={INK_THIN} />
        {/* Wrist and flared cuff, then the forearm running out of frame. */}
        <Part geo={G.cyl(0.13, 0.15, 0.16, 16)} mat={leather} position={[0, 0.2, 0]} />
        <Part geo={G.cyl(0.24, 0.15, 0.34, 18)} mat={steel} position={[0, 0.44, 0]} />
        <Part geo={G.torus(0.24, 0.03)} mat={dark} position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
        <Part geo={G.cyl(0.17, 0.19, 2.6, 16)} mat={dark} position={[0, 1.9, 0]} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Dragonfly
// ---------------------------------------------------------------------------
export const Dragonfly: React.FC<{ position: Vec3; yaw?: number; flying?: boolean }> = ({ position, yaw = 0, flying = true }) => {
  const frame = useCurrentFrame();
  const flap = flying ? 0.7 * Math.sin(frame * 2.4) : 0.12 * Math.sin(frame * 0.12);
  const body = vinyl("#35c2d6", "gloss");
  const wing = vinyl("#dff7ff", "gloss");
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={0.6}>
      <Part geo={G.capsule(0.03, 0.4)} mat={body} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
      <Part geo={G.sphere(0.05)} mat={vinyl("#1f7f96", "gloss")} position={[0.21, 0.01, 0]} ink={INK_THIN} />
      {[-1, 1].map((s) =>
        [0.08, -0.02].map((x) => (
          <group key={`${s}${x}`} position={[x, 0.03, 0]} rotation={[s * (0.15 + flap), 0, 0]}>
            <mesh geometry={G.sphere(0.1)} material={wing} position={[0, 0, s * 0.2]} scale={[0.55, 0.06, 2]} />
          </group>
        )),
      )}
    </group>
  );
};
