import type React from "react";
import { random, useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";
import { clamp01, easeInOut, easeOutBack, lerp } from "../../kit";
import { HazardBand } from "./Dart";

interface RotaryGatlingTurretProps {
  position: Vec3;
  /** Which wall it swings out of: the back wall (-z) or the end wall (+x). */
  mount: "back" | "end";
  revealFrame: number;
  spinFrame: number;
  fire: readonly [number, number];
  target: Vec3;
}

const BARRELS = 6;

/**
 * Motorised six-barrel gatling on a wall bracket. Swings out of its wall,
 * turns to aim at `target`, spins up, then streams flechette tracers into it.
 */
export const RotaryGatlingTurret: React.FC<RotaryGatlingTurretProps> = ({ position, mount, revealFrame, spinFrame, fire, target }) => {
  const frame = useCurrentFrame();
  if (frame < revealFrame) return null;
  const out = easeOutBack(clamp01((frame - revealFrame) / 16));
  const aimT = easeInOut(clamp01((frame - revealFrame - 12) / 20));

  const [px, py, pz] = position;
  const dx = target[0] - px;
  const dy = target[1] - py;
  const dz = target[2] - pz;
  const flat2 = Math.hypot(dx, dz);
  const restYaw = mount === "back" ? -Math.PI / 2 : Math.PI;
  let aimYaw = Math.atan2(-dz, dx);
  if (aimYaw - restYaw > Math.PI) aimYaw -= Math.PI * 2;
  if (aimYaw - restYaw < -Math.PI) aimYaw += Math.PI * 2;
  const yaw = lerp(restYaw, aimYaw, aimT);
  const pitch = lerp(0, Math.atan2(dy, flat2), aimT);
  const range = Math.hypot(flat2, dy);

  const spinning = frame >= spinFrame;
  const firing = frame >= fire[0] && frame < fire[1];
  const spinUp = clamp01((frame - spinFrame) / 15);
  const barrelAngle = spinning ? (frame - spinFrame) * (0.25 + spinUp * 0.9) : 0;
  const slide = (1 - out) * 0.7;
  const offset: Vec3 = mount === "back" ? [0, 0, -slide] : [slide, 0, 0];
  const armLen = mount === "back" ? 0.55 : 0.4;

  return (
    <group position={[px + offset[0], py + offset[1], pz + offset[2]]}>
      {/* Wall bracket arm back into the wall */}
      <group rotation={[0, restYaw, 0]}>
        <Part geo={G.box(armLen, 0.16, 0.2, 0.04)} mat={vinyl("#4a4f5c", "leather")} position={[-armLen / 2 - 0.12, 0, 0]} />
        <Part geo={G.box(0.08, 0.5, 0.5, 0.03)} mat={vinyl("#3a3e4a", "leather")} position={[-armLen - 0.12, 0, 0]} ink={INK_THIN} />
      </group>
      <group rotation={[0, yaw, 0]}>
        <group rotation={[0, 0, pitch]}>
          {/* Swivel and drum housing */}
          <Part geo={G.sphere(0.2)} mat={vinyl("#ffcf5a", "gloss")} ink={INK_THIN} />
          <Part geo={G.cyl(0.2, 0.22, 0.42, 20)} mat={vinyl("#4a4f5c", "leather")} position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
          <Part geo={G.box(0.26, 0.2, 0.18, 0.04)} mat={vinyl("#6b4a2a", "wood")} position={[0.12, -0.2, 0.16]} ink={INK_THIN} />
          <HazardBand width={0.38} height={0.06} position={[0.22, 0.2, 0]} count={6} />
          {/* Spinning barrel cluster */}
          <group position={[0.42, 0, 0]} rotation={[barrelAngle, 0, 0]}>
            {Array.from({ length: BARRELS }, (_, i) => {
              const a = (i / BARRELS) * Math.PI * 2;
              return (
                <Part key={i} geo={G.cyl(0.035, 0.035, 0.7, 10)} mat={vinyl("#2f3340", "leather")} position={[0.35, Math.sin(a) * 0.1, Math.cos(a) * 0.1]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
              );
            })}
            {[0.12, 0.62].map((bx) => (
              <Part key={bx} geo={G.cyl(0.15, 0.15, 0.05, 18)} mat={vinyl("#ffcf5a", "gloss")} position={[bx, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
            ))}
          </group>
          {/* Muzzle flash and flechette tracers along the aim line */}
          {firing ? (
            <>
              <GlowSprite position={[1.2, 0, 0]} size={0.9 + (frame % 2) * 0.5} color="#ffd24a" opacity={0.95} />
              {Array.from({ length: 5 }, (_, i) => {
                const t = (frame * 0.37 + i / 5) % 1;
                return (
                  <mesh key={i} position={[lerp(1.2, range, t), (random(`gt-${i}-${frame}`) - 0.5) * 0.12, (random(`gtz-${i}-${frame}`) - 0.5) * 0.12]} rotation={[0, 0, Math.PI / 2]} material={glow("#ffe866", 2.5)}>
                    <cylinderGeometry args={[0.018, 0.018, 0.45, 5]} />
                  </mesh>
                );
              })}
              <pointLight position={[1.3, 0, 0]} color="#ffc84a" intensity={4} distance={4} decay={2} />
            </>
          ) : null}
        </group>
      </group>
    </group>
  );
};

interface ArmoredMantletProps {
  x: number;
  z: number;
  /** Flechettes start punching holes. */
  hitFrame: number;
  splinterFrame: number;
}

const PLANKS = [-0.64, -0.32, 0, 0.32, 0.64];
const WHEEL_R = 0.3;

/**
 * Wheeled oak barricade with iron bands, front spikes and push handles. Gets
 * peppered by flechettes, then blows apart into planks that stay on the floor.
 */
export const ArmoredMantlet: React.FC<ArmoredMantletProps> = ({ x, z, hitFrame, splinterFrame }) => {
  const frame = useCurrentFrame();
  const roll = -x / WHEEL_R;

  if (frame >= splinterFrame) {
    // Planks fly apart and come to rest on the floor.
    const dt = frame - splinterFrame;
    return (
      <group position={[x, 0, z]}>
        {PLANKS.concat(PLANKS.map((p) => p + 0.16)).map((pz, i) => {
          const vx = (random(`mv-x-${i}`) - 0.7) * 0.16;
          const vy = 0.1 + random(`mv-y-${i}`) * 0.12;
          const vz = (random(`mv-z-${i}`) - 0.5) * 0.06;
          const g = 0.012;
          const land = (vy + Math.sqrt(vy * vy + 4 * g * 0.9)) / (2 * g);
          const t = Math.min(dt, land);
          const half = i >= PLANKS.length;
          return (
            <Part
              key={i}
              geo={G.box(0.16, 0.85, 0.28, 0.04)}
              mat={vinyl(i % 2 ? "#8a5a32" : "#7a4c2a", "wood")}
              position={[vx * t, Math.max(0.1, 0.9 + (half ? 0.4 : -0.3) + vy * t - g * t * t), pz + vz * t]}
              rotation={[dt < land ? t * 0.3 : Math.PI / 2, 0, dt < land ? t * (0.2 + 0.1 * i) : Math.PI / 2]}
            />
          );
        })}
      </group>
    );
  }

  const peppered = frame >= hitFrame ? clamp01((frame - hitFrame) / (splinterFrame - hitFrame)) : 0;
  const shake = peppered > 0 ? (random(`mshake-${frame}`) - 0.5) * 0.05 : 0;
  const holes = Math.floor(peppered * 22);
  return (
    <group position={[x + shake, 0, z]}>
      {PLANKS.map((pz) => (
        <Part key={pz} geo={G.box(0.18, 1.85, 0.3, 0.05)} mat={vinyl(pz === 0 ? "#8a5a32" : "#7a4c2a", "wood")} position={[0, 1.08, pz]} />
      ))}
      {[0.45, 1.65].map((by) => (
        <Part key={by} geo={G.box(0.22, 0.14, 1.66, 0.04)} mat={vinyl("#4a4f5c", "leather")} position={[0.01, by, 0]} ink={INK_THIN} />
      ))}
      {[-0.5, 0, 0.5].map((sz) =>
        [0.85, 1.3].map((sy) => (
          <Part key={`${sz}-${sy}`} geo={G.cone(0.06, 0.24, 8)} mat={vinyl("#d9dee8", "metal")} position={[0.2, sy, sz]} rotation={[0, 0, -Math.PI / 2]} ink={INK_THIN} />
        ))
      )}
      <mesh geometry={G.box(0.03, 0.08, 0.5, 0.01)} material={flat("#0b0a0d")} position={[0.1, 1.45, 0]} />
      {/* Flechette holes and stuck flechettes */}
      {Array.from({ length: holes }, (_, i) => (
        <group key={i} position={[0.1, 0.5 + random(`mh-y-${i}`) * 1.3, -0.7 + random(`mh-z-${i}`) * 1.4]}>
          <mesh geometry={G.sphere(0.035)} material={flat("#1a1216")} scale={[0.5, 1, 1]} />
          <mesh geometry={G.cyl(0.008, 0.008, 0.16, 4)} material={vinyl("#e8edf5", "metal")} position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
        </group>
      ))}
      {/* Wheels and push handles */}
      {[-1, 1].map((s) => (
        <group key={s} position={[-0.2, WHEEL_R, s * 0.86]}>
          <Part geo={G.cyl(WHEEL_R, WHEEL_R, 0.09, 18)} mat={vinyl("#5a3a20", "wood")} rotation={[Math.PI / 2, 0, 0]} />
          <group rotation={[0, 0, roll]}>
            <Part geo={G.box(0.5, 0.05, 0.1, 0.015)} mat={vinyl("#4a4f5c", "leather")} ink={false} />
            <Part geo={G.box(0.05, 0.5, 0.1, 0.015)} mat={vinyl("#4a4f5c", "leather")} ink={false} />
          </group>
        </group>
      ))}
      {[-0.45, 0.45].map((hz) => (
        <Part key={hz} geo={G.box(0.7, 0.07, 0.07, 0.02)} mat={vinyl("#6b4a2a", "wood")} position={[-0.42, 0.95, hz]} ink={INK_THIN} />
      ))}
    </group>
  );
};

interface FloorPneumaticRamsProps {
  x: number;
  z: number;
  /** Hatch doors drop open a few frames before the punch. */
  punchFrame: number;
  retractFrame: number;
}

const RAM_EXT = 1.05;

/**
 * Twin pneumatic rams under a hazard-striped floor hatch, angled toward +x so
 * they fling whatever stands on them across the room.
 */
export const FloorPneumaticRams: React.FC<FloorPneumaticRamsProps> = ({ x, z, punchFrame, retractFrame }) => {
  const frame = useCurrentFrame();
  const doors = clamp01((frame - punchFrame + 6) / 5);
  const ext = frame < retractFrame ? clamp01((frame - punchFrame) / 8) : 1 - clamp01((frame - retractFrame) / 16);
  const length = 0.2 + ext * RAM_EXT;
  return (
    <group position={[x, 0, z]}>
      <Part geo={G.box(1.5, 0.04, 1.3, 0.015)} mat={vinyl("#24262d", "leather")} position={[0, 0.02, 0]} ink={INK_THIN} />
      <HazardBand width={1.5} height={0.05} depth={0.04} position={[0, 0.03, 0.66]} count={10} />
      {[-1, 1].map((s) => (
        <Part key={`door${s}`} geo={G.box(0.7, 0.05, 1.15, 0.015)} mat={vinyl("#3a3e4a", "leather")} position={[s * (0.36 + doors * 0.05), 0.045 - doors * 0.3, 0]} rotation={[0, 0, s * doors * 1.3]} ink={INK_THIN} />
      ))}
      {ext > 0
        ? [-0.3, 0.3].map((rx) => (
            <group key={rx} position={[rx, -0.2, 0]} rotation={[0, 0, -0.35]}>
              <Part geo={G.cyl(0.07, 0.07, length, 14)} mat={vinyl("#e8edf5", "metal")} position={[0, length / 2, 0]} ink={INK_THIN} />
              <Part geo={G.box(0.5, 0.12, 0.9, 0.04)} mat={vinyl("#d83a30", "leather")} position={[0, length, 0]} />
              <HazardBand width={0.5} height={0.05} position={[0, length + 0.07, 0.46]} count={5} />
            </group>
          ))
        : null}
      {frame >= punchFrame && frame < punchFrame + 6 ? <GlowSprite position={[0, 0.5, 0.2]} size={1.5} color="#fff0c0" opacity={0.6} /> : null}
    </group>
  );
};
