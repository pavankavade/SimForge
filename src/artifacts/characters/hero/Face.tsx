import type React from "react";
import { G, INK_THIN, flat, vinyl } from "./ink";
import { Part } from "./Part";

export type EyeShape = "open" | "wide" | "happy" | "closed" | "x" | "squint" | "spiral";
export type MouthShape = "line" | "smile" | "frown" | "smirk" | "grin" | "o" | "yell" | "grit" | "wavy" | "tongue";

export interface ExpressionSpec {
  eyes: EyeShape;
  /** Upper lid closure 0 (open) .. 1 (shut). */
  lid: number;
  /** + lowers the inner corner of the lids (angry), - raises it (worried). */
  lidTilt: number;
  /** Brow lift in head units (+ = surprised). */
  brow: number;
  /** + = angry (inner ends down), - = worried. */
  browTilt: number;
  /** Pupil size multiplier. */
  pupil: number;
  /** Pupil offset [-1..1] (x = towards the character's +x side, y = up). */
  look: [number, number];
  mouth: MouthShape;
}

export const EXPRESSIONS = {
  neutral: { eyes: "open", lid: 0.12, lidTilt: 0, brow: 0, browTilt: 0, pupil: 1, look: [0, 0], mouth: "line" },
  happy: { eyes: "happy", lid: 0, lidTilt: 0, brow: 0.012, browTilt: -0.2, pupil: 1, look: [0, 0], mouth: "grin" },
  smug: { eyes: "open", lid: 0.5, lidTilt: -0.12, brow: 0.004, browTilt: 0.18, pupil: 0.95, look: [0.35, 0], mouth: "smirk" },
  focus: { eyes: "open", lid: 0.32, lidTilt: 0.25, brow: -0.006, browTilt: 0.3, pupil: 0.9, look: [0, 0], mouth: "line" },
  angry: { eyes: "open", lid: 0.38, lidTilt: 0.5, brow: -0.012, browTilt: 0.55, pupil: 0.85, look: [0, 0], mouth: "grit" },
  yell: { eyes: "open", lid: 0.32, lidTilt: 0.5, brow: -0.012, browTilt: 0.6, pupil: 0.8, look: [0, 0], mouth: "yell" },
  scared: { eyes: "wide", lid: 0, lidTilt: -0.3, brow: 0.03, browTilt: -0.5, pupil: 0.55, look: [0, 0], mouth: "wavy" },
  shock: { eyes: "wide", lid: 0, lidTilt: 0, brow: 0.045, browTilt: -0.15, pupil: 0.45, look: [0, 0], mouth: "o" },
  pain: { eyes: "squint", lid: 0, lidTilt: 0, brow: 0.01, browTilt: -0.45, pupil: 1, look: [0, 0], mouth: "grit" },
  dazed: { eyes: "spiral", lid: 0, lidTilt: 0, brow: 0.02, browTilt: -0.2, pupil: 1, look: [0, 0], mouth: "wavy" },
  dead: { eyes: "x", lid: 0, lidTilt: 0, brow: 0, browTilt: 0, pupil: 1, look: [0, 0], mouth: "tongue" },
} satisfies Record<string, ExpressionSpec>;

export type Expression = keyof typeof EXPRESSIONS;
export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS) as Expression[];

/** Per-class face layout, all in head units (head radius `r`). */
export interface FaceKit {
  r: number;
  skin: string;
  /** Eye centre angles on the head sphere. */
  eyeYaw: number;
  eyePitch: number;
  eyeR: number;
  sclera: string;
  iris: string;
  brow: string | null;
  /** Brow length multiplier (bushy wizard brows > 1). */
  browSize?: number;
  /** False when the mouth is hidden (masks). */
  mouth: boolean;
  mouthPitch: number;
  /** Extra outward offset of the mouth (sits on top of a beard). */
  mouthLift?: number;
  mouthWidth?: number;
  /** Goblin fangs poking out of the lower lip. */
  fangs?: boolean;
}

const PUPIL = "#1a1220";
const MOUTH = "#4a1520";
const TONGUE = "#e8667a";
const TEETH = "#fbf7ee";

/** Places children on the head sphere at (yaw, pitch), facing outward. */
const OnHead: React.FC<{ r: number; yaw: number; pitch: number; lift?: number; children: React.ReactNode }> = ({
  r,
  yaw,
  pitch,
  lift = 0,
  children,
}) => (
  <group rotation={[0, yaw, 0]}>
    <group rotation={[pitch, 0, 0]}>
      <group position={[0, 0, r + lift]}>{children}</group>
    </group>
  </group>
);

const Eye: React.FC<{ kit: FaceKit; side: -1 | 1; spec: ExpressionSpec; blink: boolean }> = ({ kit, side, spec, blink }) => {
  const e = kit.eyeR;
  const line = flat(PUPIL);
  const shape = blink && (spec.eyes === "open" || spec.eyes === "wide") ? "closed" : spec.eyes;

  if (shape === "happy" || shape === "closed") {
    const arc = shape === "happy" ? 0 : Math.PI;
    return (
      <mesh geometry={G.torus(e * 0.8, e * 0.2, Math.PI)} material={line} rotation={[0, 0, arc]} position={[0, shape === "happy" ? -e * 0.3 : e * 0.2, 0]} />
    );
  }
  if (shape === "x") {
    return (
      <group>
        {[1, -1].map((s) => (
          <mesh key={s} geometry={G.capsule(e * 0.2, e * 1.9)} material={line} rotation={[0, 0, s * Math.PI * 0.25]} />
        ))}
      </group>
    );
  }
  if (shape === "squint") {
    // Chevrons pointing at the nose: > <
    return (
      <group>
        {[1, -1].map((s) => (
          <mesh
            key={s}
            geometry={G.capsule(e * 0.2, e * 1.3)}
            material={line}
            position={[side * e * 0.15, s * e * 0.3, 0]}
            rotation={[0, 0, Math.PI / 2 + side * s * 0.55]}
          />
        ))}
      </group>
    );
  }

  const wide = shape === "wide";
  const lid = Math.min(1, spec.lid);
  const scl = wide ? 1.18 : 1;
  return (
    <group scale={[scl, scl * 1.22, 0.55]} position={[0, 0, -e * 0.3]}>
      <Part geo={G.sphere(e)} mat={vinyl(kit.sclera, "gloss")} ink={INK_THIN} shadow={false} />
      {shape === "spiral" ? (
        <group position={[0, 0, e * 0.98]} rotation={[0, 0, side * 1.3]}>
          <mesh geometry={G.torus(e * 0.62, e * 0.11, Math.PI * 1.6)} material={line} />
          <mesh geometry={G.torus(e * 0.28, e * 0.11, Math.PI * 1.5)} material={line} rotation={[0, 0, Math.PI]} />
        </group>
      ) : (
        <group position={[spec.look[0] * e * 0.32, spec.look[1] * e * 0.3, 0]}>
          <mesh geometry={G.sphere(e * 0.56 * spec.pupil)} material={flat(kit.iris)} scale={[1, 1, 0.5]} position={[0, 0, e * 0.76]} />
          <mesh geometry={G.sphere(e * 0.36 * spec.pupil)} material={flat(PUPIL)} scale={[1, 1, 0.5]} position={[0, 0, e * 0.88]} />
          <mesh geometry={G.sphere(e * 0.15)} material={flat("#ffffff")} position={[-e * 0.2, e * 0.24, e * 0.98]} />
        </group>
      )}
      {lid > 0.01 ? (
        <group rotation={[0, 0, side * spec.lidTilt]}>
          <mesh
            geometry={G.sphere(e * 1.2, 0, Math.PI / 2)}
            material={vinyl(kit.skin, "skin")}
            rotation={[-Math.PI / 2 + lid * Math.PI, 0, 0]}
          />
        </group>
      ) : null}
    </group>
  );
};

const Mouth: React.FC<{ kit: FaceKit; shape: MouthShape }> = ({ kit, shape }) => {
  const w = kit.mouthWidth ?? 1;
  const m = flat(MOUTH);
  const t = 0.014;
  switch (shape) {
    case "line":
      return <mesh geometry={G.capsule(t, 0.08 * w)} material={m} rotation={[0, 0, Math.PI / 2]} />;
    case "smile":
      return <mesh geometry={G.torus(0.05 * w, t, Math.PI)} material={m} rotation={[0, 0, Math.PI]} position={[0, 0.02, 0]} />;
    case "frown":
      return <mesh geometry={G.torus(0.045 * w, t, Math.PI)} material={m} position={[0, -0.025, 0]} />;
    case "smirk":
      return (
        <mesh geometry={G.torus(0.045 * w, t, Math.PI * 0.55)} material={m} rotation={[0, 0, Math.PI * 1.25]} position={[0.02, 0.025, 0]} />
      );
    case "wavy":
      return (
        <group>
          <mesh geometry={G.torus(0.022 * w, t * 0.9, Math.PI)} material={m} position={[-0.022 * w, 0, 0]} />
          <mesh geometry={G.torus(0.022 * w, t * 0.9, Math.PI)} material={m} position={[0.022 * w, 0, 0]} rotation={[0, 0, Math.PI]} />
        </group>
      );
    case "o":
      return <mesh geometry={G.disc(0.03)} material={m} scale={[0.85, 1.2, 1]} position={[0, -0.01, 0]} />;
    case "tongue":
      return (
        <group>
          <mesh geometry={G.capsule(t, 0.09 * w)} material={m} rotation={[0, 0, Math.PI / 2 + 0.12]} />
          <mesh geometry={G.capsule(0.02, 0.06)} material={flat(TONGUE)} position={[0.022, -0.028, 0.004]} rotation={[0, 0, 0.25]} />
        </group>
      );
    case "grit":
      return (
        <group>
          <Part geo={G.box(0.11 * w, 0.045, 0.012, 0.006)} mat={vinyl(TEETH, "gloss")} ink={INK_THIN} shadow={false} />
          <mesh geometry={G.box(0.11 * w, 0.006, 0.014, 0.002)} material={flat("#8a6a6a")} />
          {[-0.025, 0.012].map((x) => (
            <mesh key={x} geometry={G.box(0.005, 0.042, 0.014, 0.002)} material={flat("#8a6a6a")} position={[x * w, 0, 0]} />
          ))}
        </group>
      );
    case "grin":
    case "yell": {
      const tall = shape === "yell" ? 1.25 : 0.72;
      const r = shape === "yell" ? 0.065 : 0.075;
      return (
        <group position={[0, 0.02, 0]}>
          <mesh geometry={G.disc(r * w, Math.PI, Math.PI)} material={m} scale={[1, tall, 1]} />
          <mesh geometry={G.box(r * 1.7 * w, 0.02, 0.006, 0.003)} material={flat(TEETH)} position={[0, -0.011, 0.002]} />
          <mesh geometry={G.disc(r * 0.55, 0, Math.PI)} material={flat(TONGUE)} position={[0, -r * tall * 0.92, 0.002]} scale={[1, 0.6, 1]} />
        </group>
      );
    }
  }
};

export const Face: React.FC<{ kit: FaceKit; expression: Expression; blink: boolean }> = ({ kit, expression, blink }) => {
  const spec: ExpressionSpec = EXPRESSIONS[expression];
  const r = kit.r;
  const browLen = 0.085 * (kit.browSize ?? 1);
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <OnHead key={`eye-${side}`} r={r} yaw={side * kit.eyeYaw} pitch={kit.eyePitch}>
          <Eye kit={kit} side={side} spec={spec} blink={blink} />
        </OnHead>
      ))}
      {kit.brow
        ? ([-1, 1] as const).map((side) => (
            <OnHead
              key={`brow-${side}`}
              r={r}
              yaw={side * kit.eyeYaw * 1.05}
              pitch={kit.eyePitch - 0.36 - spec.brow * 6}
              lift={0.006}
            >
              <mesh
                geometry={G.capsule(0.017 * (kit.browSize ?? 1), browLen)}
                material={flat(kit.brow as string)}
                rotation={[0, 0, Math.PI / 2 + side * spec.browTilt]}
              />
            </OnHead>
          ))
        : null}
      {kit.mouth ? (
        <OnHead r={r} yaw={0} pitch={kit.mouthPitch} lift={0.004 + (kit.mouthLift ?? 0)}>
          <Mouth kit={kit} shape={spec.mouth} />
          {kit.fangs && spec.mouth !== "yell" && spec.mouth !== "o" ? (
            <group position={[0, spec.mouth === "grin" ? 0.012 : 0.002, 0.004]}>
              {[-1, 1].map((s) => (
                <mesh key={s} geometry={G.cone(0.014, 0.04, 8)} material={vinyl(TEETH, "gloss")} position={[s * 0.035, 0.022, 0]} />
              ))}
            </group>
          ) : null}
        </OnHead>
      ) : null}
    </group>
  );
};
