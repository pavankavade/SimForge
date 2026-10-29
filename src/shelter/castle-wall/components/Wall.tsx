import type React from "react";
import { random } from "remotion";
import { G, INK_THIN, Part, vinyl } from "../../../artifacts/characters/hero";
import { bezier } from "../../../kit/motion";
import type { Vec3 } from "../../../engine/types";
import {
  BEATS,
  CHAINS_IN,
  COURSE,
  COURSES,
  FLOOD,
  GATEHOUSE_TOP,
  GATE_H,
  GATE_HALF,
  GATE_Z,
  HOLE_Y,
  HOLE_Z,
  MERLON_H,
  MERLON_LEN,
  MERLON_T,
  MOAT_FLOOR,
  MOAT_X1,
  PATCH,
  TOWER_R,
  TOWER_TOP,
  TOWER_X,
  TOWER_ZS,
  WALL_H,
  WALL_IN,
  WALL_OUT,
  WALL_Z0,
  WALL_Z1,
  bridgeLift,
  courseIn,
  easeOutBack,
  easeOutCubic,
  merlonIn,
  merlonZs,
  portcullisY,
  progress,
  towerRise,
} from "../timeline";
import { StoneBox, useWallStone } from "./stone";

const T = WALL_OUT - WALL_IN;
const XC = (WALL_OUT + WALL_IN) / 2;

/** Course drop-in: falls from above with a little overshoot. */
const courseLift = (t: number) => (1 - easeOutBack(t, 1.4)) * 1.6;

/** Z segments of the wall (gate passage and the hole are separate). */
const SEGS = [
  { z: [WALL_Z0, GATE_Z - GATE_HALF], gate: false, hole: false },
  { z: [GATE_Z - GATE_HALF, GATE_Z + GATE_HALF], gate: true, hole: false },
  { z: [GATE_Z + GATE_HALF, HOLE_Z[0]], gate: false, hole: false },
  { z: [HOLE_Z[0], WALL_Z1], gate: false, hole: true },
] as const;

const holeOpen = (f: number) => f >= BEATS.smash && f < PATCH[1];
const inHole = (i: number) => i * COURSE >= HOLE_Y[0] - 1e-3 && (i + 1) * COURSE <= HOLE_Y[1] + 1e-3;

/** Debris blocks knocked out of the hole: they fly into the village and back again for the patch. */
const DEBRIS = (() => {
  const out: { home: Vec3; land: Vec3; size: Vec3; spin: number }[] = [];
  const nz = 4;
  const dz = (HOLE_Z[1] - HOLE_Z[0]) / nz;
  for (let i = 1; i <= 3; i++) {
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < 2; j++) {
        const seed = `deb-${i}-${k}-${j}`;
        const home: Vec3 = [WALL_IN + T * (0.25 + 0.5 * j), i * COURSE + COURSE / 2, HOLE_Z[0] + dz * (k + 0.5)];
        const land: Vec3 = [-1.4 - random(seed) * 3.2, 0.2, home[2] + (random(`${seed}z`) - 0.5) * 1.6];
        out.push({ home, land, size: [T / 2 - 0.04, COURSE - 0.04, dz - 0.05], spin: (random(`${seed}s`) - 0.5) * 6 });
      }
    }
  }
  return out;
})();

const Debris: React.FC<{ frame: number }> = ({ frame }) => {
  if (!holeOpen(frame)) return null;
  const stone = vinyl("#cdb894", "bone");
  return (
    <>
      {DEBRIS.map((d, n) => {
        const out = easeOutCubic(progress(frame, [BEATS.smash, BEATS.smash + 16 + (n % 5)]));
        const back = progress(frame, [PATCH[0] + (n % 4), PATCH[1]]);
        const t = frame < PATCH[0] ? out : 1 - back;
        const mid: Vec3 = [(d.home[0] + d.land[0]) / 2, d.home[1] + 1.4, (d.home[2] + d.land[2]) / 2];
        const p = bezier(d.home, mid, d.land, t);
        return <Part key={n} geo={G.box(d.size[0], d.size[1], d.size[2], 0.05)} mat={stone} position={p} rotation={[t * d.spin * 0.3, t * d.spin, 0]} ink={INK_THIN} />;
      })}
    </>
  );
};

/** One flanking tower: rises out of the ground (and the moat) with an overshoot. */
const Tower: React.FC<{ frame: number; i: number }> = ({ frame, i }) => {
  const rise = towerRise(frame, i);
  const stone = useWallStone([5, 3]);
  if (rise <= 0) return null;
  const h = TOWER_TOP - MOAT_FLOOR;
  const y = (rise - 1) * h;
  return (
    <group position={[TOWER_X, y, TOWER_ZS[i]]}>
      <mesh position={[0, MOAT_FLOOR + h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[TOWER_R, TOWER_R * 1.06, h, 40]} />
        <meshStandardMaterial {...stone} roughness={0.9} />
      </mesh>
      {/* Floor of the fighting platform, a string course and crenellations */}
      <mesh position={[0, TOWER_TOP - 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[TOWER_R + 0.08, TOWER_R + 0.08, 0.14, 40]} />
        <meshStandardMaterial color="#b9a47f" roughness={0.9} />
      </mesh>
      {Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(a) * (TOWER_R - 0.08), TOWER_TOP + 0.33, Math.sin(a) * (TOWER_R - 0.08)]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.3, 0.66, 0.62]} />
            <meshStandardMaterial {...stone} roughness={0.9} />
          </mesh>
        );
      })}
      {/* Arrow slits facing along the wall and out over the moat */}
      {[0.2, 0.9, 1.6, -0.5].map((a, k) => (
        <Part key={k} geo={G.box(0.1, 0.62, 0.14, 0.03)} mat={vinyl("#2a2018", "cloth")} position={[Math.cos(a) * (TOWER_R + 0.02), WALL_H - 0.6 + (k % 2) * 1.0, Math.sin(a) * (TOWER_R + 0.02)]} rotation={[0, -a, 0]} ink={false} />
      ))}
      {/* Pennant */}
      <Part geo={G.cyl(0.035, 0.035, 1.6)} mat={vinyl("#5a3820", "wood")} position={[-0.6, TOWER_TOP + 0.8, -0.6]} ink={INK_THIN} />
      <Part geo={G.box(0.7, 0.36, 0.03, 0.01)} mat={vinyl("#c8322b", "cloth")} position={[-0.25, TOWER_TOP + 1.4 + 0.03 * Math.sin(frame * 0.3), -0.6]} rotation={[0, 0, -0.06 * Math.sin(frame * 0.25)]} ink={INK_THIN} />
    </group>
  );
};

/** The drawbridge deck, hinged at the outer face of the gate; chains appear in L6. */
const DRAW_LEN = MOAT_X1 - WALL_OUT + 0.25;
const Drawbridge: React.FC<{ frame: number }> = ({ frame }) => {
  const placed = easeOutBack(progress(frame, [FLOOD[1] - 6, FLOOD[1] + 6]), 1.3);
  if (placed <= 0) return null;
  const lift = bridgeLift(frame) * Math.PI * 0.49;
  const wood = vinyl("#9a6a3c", "wood");
  const dark = vinyl("#6e4626", "wood");
  const iron = vinyl("#4a4f58", "gloss");
  const chains = easeOutBack(progress(frame, CHAINS_IN), 1.2);
  const tip: Vec3 = [WALL_OUT + 0.05 + Math.cos(lift) * (DRAW_LEN - 0.2), 0.1 + Math.sin(lift) * (DRAW_LEN - 0.2), 0];
  const anchor: Vec3 = [WALL_OUT + 0.12, GATEHOUSE_TOP - 0.55, 0];
  return (
    <group position={[0, 0, GATE_Z]}>
      <group position={[WALL_OUT + 0.05, 0.02, 0]} rotation={[0, 0, lift]} scale={[placed, 1, 1]}>
        {Array.from({ length: 9 }, (_, k) => (
          <Part key={k} geo={G.box(DRAW_LEN / 9 - 0.03, 0.16, 2.1, 0.03)} mat={k % 2 ? wood : dark} position={[(k + 0.5) * (DRAW_LEN / 9), 0.08, 0]} ink={INK_THIN} />
        ))}
        {[-0.85, 0.85].map((z) => (
          <Part key={z} geo={G.box(DRAW_LEN, 0.08, 0.12, 0.02)} mat={iron} position={[DRAW_LEN / 2, 0.19, z]} ink={INK_THIN} />
        ))}
      </group>
      {chains > 0
        ? [-0.85, 0.85].map((z) =>
            Array.from({ length: 30 }, (_, k) => {
              const t = (k + 0.5) / 30;
              const p: Vec3 = [anchor[0] + (tip[0] - anchor[0]) * t, anchor[1] + (tip[1] - anchor[1]) * t * chains, z];
              return <Part key={`${z}-${k}`} geo={G.torus(0.1, 0.035)} mat={iron} position={p} rotation={[k % 2 ? Math.PI / 2 : 0, 0, Math.atan2(tip[1] - anchor[1], tip[0] - anchor[0])]} ink={INK_THIN} />;
            }),
          )
        : null}
    </group>
  );
};

/** Iron portcullis just inside the gate passage, hidden in the gatehouse until L6. */
const Portcullis: React.FC<{ frame: number }> = ({ frame }) => {
  const y = portcullisY(frame);
  const iron = vinyl("#3f444c", "gloss");
  const x = WALL_IN + 0.38;
  return (
    <group position={[x, y, GATE_Z]}>
      {Array.from({ length: 7 }, (_, k) => (
        <Part key={`v${k}`} geo={G.box(0.08, GATE_H + 0.1, 0.08, 0.02)} mat={iron} position={[0, GATE_H / 2, -GATE_HALF + 0.15 + k * ((2 * GATE_HALF - 0.3) / 6)]} ink={INK_THIN} />
      ))}
      {Array.from({ length: 4 }, (_, k) => (
        <Part key={`h${k}`} geo={G.box(0.07, 0.07, 2 * GATE_HALF - 0.1, 0.02)} mat={iron} position={[0, 0.35 + k * 0.6, 0]} ink={INK_THIN} />
      ))}
      {Array.from({ length: 7 }, (_, k) => (
        <Part key={`s${k}`} geo={G.cone(0.06, 0.18, 6)} mat={iron} position={[0, -0.06, -GATE_HALF + 0.15 + k * ((2 * GATE_HALF - 0.3) / 6)]} rotation={[Math.PI, 0, 0]} ink={false} />
      ))}
    </group>
  );
};

/** Wooden gate leaves, standing open into the village. */
const GateDoors: React.FC = () => {
  const wood = vinyl("#8a5a32", "wood");
  const iron = vinyl("#4a4f58", "gloss");
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[WALL_IN, 0, GATE_Z + s * GATE_HALF]} rotation={[0, s * 1.75, 0]}>
          <Part geo={G.box(0.12, GATE_H - 0.05, GATE_HALF - 0.04, 0.03)} mat={wood} position={[0, GATE_H / 2, -s * (GATE_HALF / 2)]} ink={INK_THIN} />
          {[0.5, 1.6].map((y) => (
            <Part key={y} geo={G.box(0.16, 0.1, GATE_HALF - 0.1, 0.02)} mat={iron} position={[0, y, -s * (GATE_HALF / 2)]} ink={false} />
          ))}
        </group>
      ))}
    </>
  );
};

/** A plain wooden ladder up the inner face, so the family can reach the walkway. */
const InnerLadder: React.FC = () => {
  const wood = vinyl("#8a5a32", "wood");
  const len = WALL_H + 0.6;
  return (
    <group position={[WALL_IN - 1.0, 0, -2.6]} rotation={[0, 0, -0.27]}>
      {[-0.24, 0.24].map((z) => (
        <Part key={z} geo={G.box(0.08, len, 0.08, 0.02)} mat={wood} position={[0, len / 2, z]} ink={INK_THIN} />
      ))}
      {Array.from({ length: 9 }, (_, k) => (
        <Part key={k} geo={G.box(0.06, 0.06, 0.5, 0.02)} mat={wood} position={[0, 0.35 + k * 0.42, 0]} ink={false} />
      ))}
    </group>
  );
};

export const Wall: React.FC<{ frame: number }> = ({ frame }) => {
  const built = courseIn(frame, 0) > 0;
  return (
    <>
      {Array.from({ length: COURSES }, (_, i) => {
        const t = courseIn(frame, i);
        if (t <= 0) return null;
        const lift = courseLift(t);
        const y = i * COURSE + COURSE / 2;
        return SEGS.map((s, k) => {
          if (s.gate && (i + 1) * COURSE <= GATE_H + 1e-3) return null;
          if (s.hole && inHole(i) && holeOpen(frame)) return null;
          const d = s.z[1] - s.z[0];
          return <StoneBox key={`${i}-${k}`} size={[T, COURSE, d]} at={[XC, y, s.z[0] + d / 2]} lift={lift} />;
        });
      })}
      {/* Gatehouse over the passage */}
      {courseIn(frame, COURSES - 1) > 0 ? (
        <StoneBox size={[T + 0.4, GATEHOUSE_TOP - WALL_H, 3.0]} at={[XC, (WALL_H + GATEHOUSE_TOP) / 2, GATE_Z]} lift={courseLift(courseIn(frame, COURSES - 1))} color="#f2e6cf" />
      ) : null}
      {built ? (
        <>
          <GateDoors />
          <InnerLadder />
          <Portcullis frame={frame} />
          {/* Dark passage ceiling so the gate reads as a tunnel */}
          <mesh position={[XC, GATE_H - 0.02, GATE_Z]}>
            <boxGeometry args={[T, 0.04, 2 * GATE_HALF]} />
            <meshStandardMaterial color="#3a3026" roughness={1} />
          </mesh>
        </>
      ) : null}
      <Debris frame={frame} />

      {/* Battlements: merlons along the outer edge, and on the gatehouse */}
      {merlonZs.map((z) => {
        const t = merlonIn(frame, z);
        if (t <= 0) return null;
        const onGate = Math.abs(z - GATE_Z) < 1.5;
        const base = onGate ? GATEHOUSE_TOP : WALL_H;
        const s = Math.max(0.01, easeOutBack(t, 1.6));
        return (
          <group key={z} position={[WALL_OUT - MERLON_T / 2 + (onGate ? 0.2 : 0), base, z]} scale={[1, s, 1]}>
            <StoneBox size={[MERLON_T, MERLON_H, MERLON_LEN]} at={[0, MERLON_H / 2, 0]} />
          </group>
        );
      })}

      {TOWER_ZS.map((_, i) => (
        <Tower key={i} frame={frame} i={i} />
      ))}
      <Drawbridge frame={frame} />
    </>
  );
};
