import type React from "react";
import { Block, LP, OctagonFloor, PlankFloor, Prism, Wedge, matte } from "../../../lowpoly";
import { Fly } from "./Fly";
import {
  BED_X,
  CLOSET_X,
  DOOR_H,
  DOOR_Z0,
  DOOR_Z1,
  EAVE_Y,
  FRONT_Z,
  HALF,
  L2_START,
  L4C_START,
  LIVING_X,
  PART_X,
  ROOF_H,
  TEAR,
  TEAR_FLY,
  WALL_H,
  WALL_Z,
  WINDOW_OPEN,
  WIN_X,
  WIN_Y0,
  WIN_Y1,
  easeOutBack,
  easeInOut,
  progress,
  releaseAt,
  roofGag,
} from "../timeline";

const SLOPE = Math.atan2(ROOF_H, 6.6);
const DEPTH = 6.0;
const MID_Z = WALL_Z + DEPTH / 2 + 0.1;

/** A panelled wainscot band, cap rail and skirting along the back wall of one room. */
const Wainscot: React.FC<{ x: number; w: number }> = ({ x, w }) => (
  <group>
    {Array.from({ length: 4 }, (_, i) => (
      <Block key={i} size={[w / 4 - 0.08, 0.78, 0.1]} position={[x - w / 2 + (i + 0.5) * (w / 4), 0.5, WALL_Z + 0.2]} color="#aeb6bf" />
    ))}
    <Block size={[w, 0.12, 0.2]} position={[x, 0.95, WALL_Z + 0.22]} color={LP.trim} />
    <Block size={[w, 0.16, 0.16]} position={[x, 0.08, WALL_Z + 0.24]} color={LP.trimDark} />
    <Block size={[w, 0.2, 0.26]} position={[x, WALL_H - 0.1, WALL_Z + 0.2]} color={LP.trim} />
  </group>
);

/** A chunky post on a plinth at a wall's cut face. */
export const Post: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 0, FRONT_Z]}>
    <Block size={[0.62, 0.32, 0.62]} position={[0, 0.16, 0]} color={LP.stone} />
    <Block size={[0.46, WALL_H - 0.5, 0.46]} position={[0, WALL_H / 2 + 0.06, 0]} color={LP.plasterWarm} />
    <Block size={[0.6, 0.26, 0.6]} position={[0, WALL_H - 0.02, 0]} color={LP.trim} />
  </group>
);

/** Back wall of the living room with its window; the lower sash slides up in the gag. */
const LivingBack: React.FC<{ frame: number }> = ({ frame }) => {
  const open = frame >= L4C_START ? 0 : easeInOut(progress(frame, WINDOW_OPEN));
  const x0 = PART_X;
  const wl = WIN_X - 1 - x0;
  const xr = WIN_X + 1;
  const wr = HALF - xr;
  return (
    <group>
      <Block size={[wl, WALL_H, 0.3]} position={[x0 + wl / 2, WALL_H / 2, WALL_Z]} color={LP.plaster} />
      <Block size={[wr, WALL_H, 0.3]} position={[xr + wr / 2, WALL_H / 2, WALL_Z]} color={LP.plaster} />
      <Block size={[2.0, WIN_Y0, 0.3]} position={[WIN_X, WIN_Y0 / 2, WALL_Z]} color={LP.plaster} />
      <Block size={[2.0, WALL_H - WIN_Y1, 0.3]} position={[WIN_X, (WALL_H + WIN_Y1) / 2, WALL_Z]} color={LP.plaster} />
      {/* Glass: upper pane fixed, lower sash slides up behind it */}
      <Block size={[1.9, 0.68, 0.04]} position={[WIN_X, WIN_Y1 - 0.35, WALL_Z - 0.06]} material={matte("#cfe3f2", { rough: 0.2, emissive: "#cfe3f2", emissiveIntensity: 0.3 })} castShadow={false} />
      <group position={[0, open * 0.62, 0]}>
        <Block size={[1.9, 0.68, 0.04]} position={[WIN_X, WIN_Y0 + 0.35, WALL_Z + 0.02]} material={matte("#cfe3f2", { rough: 0.2, emissive: "#cfe3f2", emissiveIntensity: 0.3 })} castShadow={false} />
        <Block size={[1.96, 0.08, 0.1]} position={[WIN_X, WIN_Y0 + 0.7, WALL_Z + 0.04]} color={LP.trim} />
        <Block size={[0.5, 0.06, 0.06]} position={[WIN_X, WIN_Y0 + 0.1, WALL_Z + 0.08]} color={LP.trimDark} />
      </group>
      <Block size={[2.2, 0.14, 0.42]} position={[WIN_X, WIN_Y0 - 0.02, WALL_Z + 0.04]} color={LP.trim} />
      <Block size={[2.2, 0.14, 0.36]} position={[WIN_X, WIN_Y1 + 0.02, WALL_Z + 0.02]} color={LP.trim} />
      <Block size={[0.12, 1.4, 0.36]} position={[WIN_X - 1.04, (WIN_Y0 + WIN_Y1) / 2, WALL_Z + 0.02]} color={LP.trim} />
      <Block size={[0.12, 1.4, 0.36]} position={[WIN_X + 1.04, (WIN_Y0 + WIN_Y1) / 2, WALL_Z + 0.02]} color={LP.trim} />
      <Wainscot x={LIVING_X + 0.1} w={3.9} />
    </group>
  );
};

/** Walk-in closet: a side wall with a doorway, a rail of hanging clothes. */
const Closet: React.FC = () => {
  // No wall in front of the doorway: the nook stays open to the camera.
  const backD = DOOR_Z0 - WALL_Z;
  const clothes = ["#c4473d", "#5c7fa3", "#e3b23c", "#7d9165", "#ece6d8", "#8e5428"];
  return (
    <group>
      <Block size={[0.2, WALL_H, backD]} position={[CLOSET_X, WALL_H / 2, WALL_Z + backD / 2]} color={LP.plasterWarm} />
      <Block size={[0.2, WALL_H - DOOR_H, DOOR_Z1 - DOOR_Z0]} position={[CLOSET_X, (WALL_H + DOOR_H) / 2, (DOOR_Z0 + DOOR_Z1) / 2]} color={LP.plasterWarm} />
      <Block size={[0.14, 0.14, 2.0]} position={[CLOSET_X - 0.08, DOOR_H + 0.1, (DOOR_Z0 + DOOR_Z1) / 2]} color={LP.trim} />
      {/* Clothes rail along the back of the nook */}
      <Prism r={0.04} h={1.5} sides={6} position={[(CLOSET_X - HALF) / 2, 2.15, WALL_Z + 0.45]} rotation={[0, 0, Math.PI / 2]} color={LP.steel} />
      {clothes.map((c, i) => (
        <Block key={i} size={[0.2, 0.85, 0.5]} position={[-6.05 + i * 0.24, 1.66, WALL_Z + 0.45]} color={c} />
      ))}
      <Block size={[1.45, 0.08, 0.6]} position={[(CLOSET_X - HALF) / 2, 2.55, WALL_Z + 0.45]} color={LP.wood} />
      <Block size={[0.5, 0.3, 0.4]} position={[-5.7, 2.75, WALL_Z + 0.45]} color="#c99a5f" />
    </group>
  );
};

const Bed: React.FC = () => (
  <group position={[-3.15, 0, 0]}>
    <Block size={[2.0, 0.35, 1.5]} position={[0, 0.28, -2.15]} color={LP.wood} />
    <Block size={[1.9, 0.26, 1.42]} position={[0, 0.58, -2.15]} color={LP.cream} />
    <Block size={[1.25, 0.12, 1.48]} position={[0.3, 0.75, -2.15]} color={LP.cloth} />
    <Block size={[0.42, 0.18, 0.95]} position={[-0.68, 0.78, -2.15]} color="#f3efe6" />
    <Block size={[0.16, 1.2, 1.55]} position={[-1.0, 0.6, -2.15]} color={LP.woodDark} />
  </group>
);

const LivingStuff: React.FC = () => (
  <group position={[LIVING_X, 0, 0]}>
    <Block size={[2.6, 0.04, 2.3]} position={[0, 0.02, -0.5]} color={LP.red} castShadow={false} />
    <Block size={[2.3, 0.42, 0.95]} position={[-0.6, 0.32, -2.35]} color="#4f7d86" />
    <Block size={[2.3, 0.62, 0.3]} position={[-0.6, 0.78, -2.72]} color="#4f7d86" />
    <Block size={[0.3, 0.6, 0.95]} position={[-1.75, 0.42, -2.35]} color="#456f78" />
    <Block size={[0.3, 0.6, 0.95]} position={[0.55, 0.42, -2.35]} color="#456f78" />
    <Prism r={0.18} h={0.06} sides={8} position={[1.3, 0.03, -2.5]} color={LP.ink} />
    <Prism r={0.035} h={1.5} sides={6} position={[1.3, 0.78, -2.5]} color={LP.ink} />
    <Prism r={0.26} h={0.36} sides={8} position={[1.3, 1.62, -2.5]} material={matte("#f1e2bf", { emissive: "#ffd99a", emissiveIntensity: 0.25 })} />
    <Block size={[0.75, 0.6, 0.65]} position={[1.35, 0.3, 1.6]} color="#c99a5f" />
    <Block size={[0.55, 0.45, 0.5]} position={[1.3, 0.83, 1.55]} rotation={[0, 0.3, 0]} color="#d5a96e" />
    <Block size={[0.6, 0.5, 0.55]} position={[0.55, 0.25, 1.85]} rotation={[0, -0.2, 0]} color={LP.wood} />
  </group>
);

/**
 * Everything of the house except the safe room: foundation, floors, the
 * outside walls, the bedroom and living room, ceilings and the roof. Pieces
 * fly off with the L1 tear (put back for L2) and when the funnel passes in L6.
 */
export const House: React.FC<{ frame: number }> = ({ frame }) => {
  const tearBack = L2_START;
  // L1: the outside wall hinges out about its bottom edge before it flies.
  const hinge = frame >= TEAR[0] && frame < tearBack ? 0.45 * easeOutBack(progress(frame, TEAR)) : 0;
  const gag = roofGag(frame);
  const r6 = (x: number) => releaseAt(x);
  return (
    <group>
      {/* Foundation: never moves */}
      <Block size={[13.4, 0.5, 6.6]} position={[0, -0.35, -0.2]} color={LP.concrete} />
      <Block size={[14.2, 0.3, 7.4]} position={[0, -0.62, -0.2]} color={LP.stone} />
      {[0, 1].map((i) => (
        <Block key={i} size={[2.4, 0.22, 0.6]} position={[LIVING_X, -0.24 - i * 0.24, 3.4 + i * 0.5]} color={LP.concrete} />
      ))}
      <OctagonFloor cols={5} rows={7} cell={0.8} position={[0, 0, -0.1]} />

      {/* Bedroom */}
      <Fly frame={frame} at={[BED_X, 0, 0]} flights={[[r6(BED_X)]]} seed="bed-floor" power={0.8}>
        <PlankFloor w={4.0} d={DEPTH} position={[BED_X, 0, -0.1]} color="#b48656" />
      </Fly>
      <Fly frame={frame} at={[-4.2, 1.6, WALL_Z]} flights={[[r6(-4.2)]]} seed="bed-back">
        <Block size={[4.25, WALL_H, 0.3]} position={[-4.22, WALL_H / 2, WALL_Z]} color={LP.plaster} />
        <Wainscot x={-4.3} w={3.9} />
      </Fly>
      <Fly frame={frame} at={[-3.2, 0.5, -2.1]} flights={[[r6(-3.2)]]} seed="bed">
        <Bed />
        <Block size={[0.55, 0.55, 0.45]} position={[-2.55, 0.28, -2.55]} color={LP.woodDark} />
        <Prism r={0.11} h={0.32} sides={6} position={[-2.55, 0.72, -2.55]} color={LP.hazard} />
      </Fly>
      <Fly frame={frame} at={[CLOSET_X, 1.6, 0]} flights={[[r6(CLOSET_X - 0.4)]]} seed="closet">
        <Closet />
      </Fly>
      <Fly frame={frame} at={[-2.9, 0.25, -1.0]} flights={[[r6(-2.9)]]} seed="toy" power={1.3}>
        <Block size={[0.45, 0.45, 0.45]} position={[-2.9, 0.23, -1.0]} rotation={[0, 0.4, 0]} color="#d9a441" />
      </Fly>

      {/* The outside wall (L1's weak point) */}
      <Fly frame={frame} at={[-HALF, 1.6, 0]} flights={[[TEAR_FLY, tearBack], [r6(-HALF)]]} seed="wall-l" power={1.2}>
        <group position={[-HALF - 0.15, 0, 0]} rotation={[0, 0, hinge]}>
          <group position={[HALF + 0.15, 0, 0]}>
            <Block size={[0.3, WALL_H, DEPTH + 0.2]} position={[-HALF, WALL_H / 2, MID_Z]} color={LP.plasterWarm} />
            <Post x={-HALF} />
          </group>
        </group>
      </Fly>

      {/* Living room */}
      <Fly frame={frame} at={[LIVING_X, 0, 0]} flights={[[r6(LIVING_X)]]} seed="liv-floor" power={0.8}>
        <PlankFloor w={4.0} d={DEPTH} position={[LIVING_X, 0, -0.1]} color="#c39a6b" />
      </Fly>
      <Fly frame={frame} at={[LIVING_X, 1.6, WALL_Z]} flights={[[r6(LIVING_X + 0.5)]]} seed="liv-back">
        <LivingBack frame={frame} />
      </Fly>
      <Fly frame={frame} at={[LIVING_X, 0.6, -1.5]} flights={[[r6(LIVING_X - 0.5)]]} seed="liv-stuff">
        <LivingStuff />
      </Fly>
      <Fly frame={frame} at={[HALF, 1.6, 0]} flights={[[r6(HALF)]]} seed="wall-r">
        <Block size={[0.3, WALL_H, DEPTH + 0.2]} position={[HALF, WALL_H / 2, MID_Z]} color={LP.plasterWarm} />
        <Post x={HALF} />
      </Fly>

      {/* Ceilings over the side rooms (the safe room has its own). They cast no
          shadow: a cutaway lets the sun into the rooms. */}
      <Fly frame={frame} at={[-4.3, WALL_H, 0]} flights={[[TEAR_FLY + 3, tearBack], [r6(-4.3)]]} seed="ceil-l">
        <Block size={[4.3, 0.24, 6.3]} position={[-4.3, WALL_H + 0.12, -0.2]} color={LP.plasterWarm} castShadow={false} />
      </Fly>
      <Fly frame={frame} at={[4.3, WALL_H, 0]} flights={[[r6(4.3)]]} seed="ceil-r">
        <Block size={[4.3, 0.24, 6.3]} position={[4.3, WALL_H + 0.12, -0.2]} color={LP.plasterWarm} castShadow={false} />
      </Fly>

      {/* Roof: two gable halves and shingle slabs; it rises bodily in the window gag */}
      <group position={[0, gag, 0]} rotation={[0, 0, gag * 0.06]}>
        {[-1, 1].map((s) => (
          <Fly key={s} frame={frame} at={[s * 3.3, EAVE_Y + 1, -0.2]} flights={s < 0 ? [[TEAR_FLY + 6, tearBack], [r6(-3.3)]] : [[r6(3.3)]]} seed={`roof-${s}`}>
            <Wedge size={[6.6, ROOF_H, DEPTH]} position={[s * 3.3, EAVE_Y + ROOF_H / 2, -0.2]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} color={LP.plasterWarm} castShadow={false} />
            <Block
              size={[7.6, 0.26, 6.9]}
              position={[s * (3.3 + 0.15 * Math.sin(SLOPE)), EAVE_Y + ROOF_H / 2 + 0.15 * Math.cos(SLOPE), -0.2]}
              rotation={[0, 0, -s * SLOPE]}
              color={LP.roof}
              castShadow={false}
            />
          </Fly>
        ))}
        <Fly frame={frame} at={[0, EAVE_Y + ROOF_H, -0.2]} flights={[[r6(0)]]} seed="ridge">
          <Prism r={0.2} h={6.9} sides={6} position={[0, EAVE_Y + ROOF_H + 0.12, -0.2]} rotation={[Math.PI / 2, 0, 0]} color={LP.stoneDark} castShadow={false} />
        </Fly>
      </group>
    </group>
  );
};
