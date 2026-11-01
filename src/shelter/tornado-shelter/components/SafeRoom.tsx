import type React from "react";
import { random } from "remotion";
import { Blob, Block, LP, Prism, matte, steel } from "../../../lowpoly";
import { Post } from "./House";
import {
  ANCHOR_N,
  BLOW,
  DOOR_CLOSE,
  DOOR_H,
  DOOR_OPEN,
  DOOR_Z0,
  DOOR_Z1,
  FRONT_Z,
  L3B_START,
  L6_START,
  LAYER_T,
  PART_X,
  STEEL_HANG,
  SUPPLY_AT,
  VENT_XS,
  VENT_Y,
  WALL_H,
  WALL_Z,
  COVER_IN,
  anchorAt,
  arc,
  clamp01,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  hingeAt,
  layerIn,
  lerp,
  lockAt,
  progress,
  roomY,
} from "../timeline";

const IN = PART_X - 0.12;
const BACK_IN = WALL_Z + 0.15;
const FRONT_IN = FRONT_Z - 0.25;
const PLY = ["#d9b27a", "#c9a066"];

/** Offset of layer k's inner face from the bare wall (layers stack inward). */
const depthOf = (k: number) => LAYER_T.slice(0, k).reduce((a, b) => a + b, 0);
const layerMat = (k: number) => (k < 2 ? matte(PLY[k], { rough: 0.85 }) : steel());

/** One lining layer on all three walls (left wall split around the doorway); drops in from above. */
const Layer: React.FC<{ frame: number; k: number }> = ({ frame, k }) => {
  const p = layerIn(frame, k);
  if (p <= 0) return null;
  const drop = (1 - easeOutBack(p)) * 3.5;
  const t = LAYER_T[k];
  const o = depthOf(k) + t / 2;
  const h = WALL_H - 0.12;
  const m = layerMat(k);
  const span = (z0: number, z1: number) => [z1 - z0, (z0 + z1) / 2] as const;
  const [bd, bz] = span(BACK_IN + depthOf(k) + t, DOOR_Z0);
  const [fd, fz] = span(DOOR_Z1, FRONT_IN);
  const [rd, rz] = span(BACK_IN + depthOf(k) + t, FRONT_IN);
  return (
    <group position={[0, drop, 0]}>
      <Block size={[2 * IN - 2 * depthOf(k), h, t]} position={[0, h / 2, BACK_IN + o]} material={m} bevel={0.02} />
      <Block size={[t, h, bd]} position={[-IN + o, h / 2, bz]} material={m} bevel={0.02} />
      <Block size={[t, h, fd]} position={[-IN + o, h / 2, fz]} material={m} bevel={0.02} />
      <Block size={[t, h - DOOR_H, DOOR_Z1 - DOOR_Z0]} position={[-IN + o, (h + DOOR_H) / 2, (DOOR_Z0 + DOOR_Z1) / 2]} material={m} bevel={0.02} />
      <Block size={[t, h, rd]} position={[IN - o, h / 2, rz]} material={m} bevel={0.02} />
      {k === 2 &&
        Array.from({ length: 10 }, (_, i) => (
          <Block key={i} size={[0.36, 0.16, 0.03]} position={[-1.8 + i * 0.4, 0.14, BACK_IN + depthOf(3) + 0.02]} color={i % 2 ? LP.ink : LP.hazard} castShadow={false} />
        ))}
    </group>
  );
};

/** Steel angle brackets bolted through the base of the walls into the slab. */
const ANCHOR_SPOTS: Array<{ x: number; z: number; face: "back" | "left" | "right" }> = [
  { x: -1.45, z: 0, face: "back" },
  { x: -0.5, z: 0, face: "back" },
  { x: 0.5, z: 0, face: "back" },
  { x: 1.45, z: 0, face: "back" },
  { x: 0, z: -1.6, face: "left" },
  { x: 0, z: 2.0, face: "left" },
  { x: 0, z: -1.6, face: "right" },
  { x: 0, z: 1.2, face: "right" },
];
const Anchor: React.FC<{ frame: number; i: number }> = ({ frame, i }) => {
  const at = anchorAt(i);
  if (frame < at - 4) return null;
  const s = easeOutBack(progress(frame, [at - 4, at + 2]));
  const a = ANCHOR_SPOTS[i];
  const inset = depthOf(3) + 0.06;
  const pos: [number, number, number] =
    a.face === "back" ? [a.x, 0, BACK_IN + inset] : a.face === "left" ? [-IN + inset, 0, a.z] : [IN - inset, 0, a.z];
  const yaw = a.face === "back" ? 0 : a.face === "left" ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group position={pos} rotation={[0, yaw, 0]} scale={[s, s, s]}>
      <Block size={[0.5, 0.42, 0.06]} position={[0, 0.21, 0]} color={LP.hazard} bevel={0.02} />
      <Block size={[0.5, 0.06, 0.36]} position={[0, 0.03, 0.18]} color={LP.hazard} bevel={0.02} />
      {[-0.14, 0.14].map((x) => (
        <Prism key={x} r={0.06} h={0.07} sides={6} position={[x, 0.09, 0.22]} material={steel("#5f6a78")} />
      ))}
      <Prism r={0.05} h={0.06} sides={6} position={[0, 0.28, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={steel("#5f6a78")} />
    </group>
  );
};

/** Wooden bathroom door: open into the bedroom, shut for the storms, blown in on "blows". */
const WoodDoor: React.FC<{ frame: number }> = ({ frame }) => {
  const w = DOOR_Z1 - DOOR_Z0 - 0.04;
  const panel = (
    <group>
      <Block size={[0.08, DOOR_H - 0.06, w]} position={[0, (DOOR_H - 0.06) / 2, w / 2]} color="#c88a52" />
      <Block size={[0.1, 0.7, w - 0.3]} position={[0, 1.55, w / 2]} color="#b77a45" bevel={0.03} />
      <Block size={[0.1, 0.7, w - 0.3]} position={[0, 0.6, w / 2]} color="#b77a45" bevel={0.03} />
      <Prism r={0.05} h={0.12} sides={6} position={[-0.06, 1.05, w - 0.12]} rotation={[0, 0, Math.PI / 2]} color={LP.trim} />
    </group>
  );
  if (frame >= BLOW[0]) {
    // Ripped off: flung into the room, tipping over, slapped flat on the floor.
    const p = progress(frame, BLOW);
    const x = lerp(-PART_X, -PART_X + 0.15, easeOutCubic(p));
    const y = arc(clamp01(p * 1.2), 0.5) + lerp(0, 0.04, p);
    const tip = (-Math.PI / 2) * easeInOut(p);
    return (
      <group position={[x, y, DOOR_Z0 + 0.02]} rotation={[0, 0, tip]}>
        {panel}
      </group>
    );
  }
  const open = frame < DOOR_CLOSE ? -Math.PI / 2 : 0;
  const rattle = frame >= BLOW[0] - 10 ? 0.06 * Math.sin(frame * 2.7) : 0;
  return (
    <group position={[-PART_X, 0, DOOR_Z0 + 0.02]} rotation={[0, open + rattle, 0]}>
      {panel}
    </group>
  );
};

/** The steel door: hung on "steel", three hinges, three slide bolts; swung open after the storm. */
const SteelDoor: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < STEEL_HANG[0]) return null;
  const drop = (1 - easeOutBack(progress(frame, STEEL_HANG))) * 3;
  const swing = (-100 * Math.PI) / 180 * easeInOut(progress(frame, DOOR_OPEN));
  const w = DOOR_Z1 - DOOR_Z0 - 0.04;
  const unlocked = frame >= DOOR_OPEN[0] - 4;
  const ox = -0.09;
  return (
    <group>
      {/* Steel frame around the opening */}
      <Block size={[0.3, 0.14, w + 0.3]} position={[-PART_X, DOOR_H + 0.05, (DOOR_Z0 + DOOR_Z1) / 2]} material={steel("#7f8a95")} />
      <group position={[-PART_X, drop, DOOR_Z0 + 0.02]} rotation={[0, swing, 0]}>
        <Block size={[0.12, DOOR_H - 0.06, w]} position={[0, (DOOR_H - 0.06) / 2, w / 2]} material={steel()} bevel={0.03} />
        {/* Hazard band and rivets on the outside face */}
        {Array.from({ length: 6 }, (_, i) => (
          <Block key={i} size={[0.02, 0.16, w / 6 - 0.02]} position={[ox, 0.14, (i + 0.5) * (w / 6)]} color={i % 2 ? LP.ink : LP.hazard} castShadow={false} />
        ))}
        {[0.5, 1.2, 1.9].map((y) =>
          [0.12, w - 0.12].map((z) => <Prism key={`${y}-${z}`} r={0.03} h={0.03} sides={6} position={[ox, y, z]} rotation={[0, 0, Math.PI / 2]} color="#6b7480" />)
        )}
        {[0, 1, 2].map((k) => {
          const y = 0.35 + k * 0.78;
          const hs = easeOutBack(progress(frame, [hingeAt(k) - 3, hingeAt(k) + 3]));
          const ls = progress(frame, [lockAt(k) - 3, lockAt(k) + 2]);
          const slide = unlocked ? 0 : easeOutCubic(ls) * 0.16;
          return (
            <group key={k}>
              {hs > 0 && (
                <group position={[ox, y, 0.06]} scale={[hs, hs, hs]}>
                  <Block size={[0.08, 0.26, 0.12]} material={steel("#5f6a78")} bevel={0.02} />
                </group>
              )}
              {ls > 0 && (
                <group>
                  <Block size={[0.06, 0.12, 0.3]} position={[ox, y, w - 0.25]} material={steel("#5f6a78")} bevel={0.02} />
                  <Prism r={0.035} h={0.3} sides={6} position={[ox - 0.03, y, w - 0.2 + slide]} rotation={[Math.PI / 2, 0, 0]} color={LP.hazard} />
                </group>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
};

/** Vent grilles high on the back wall; louvered steel hoods pop over them. */
const Vents: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < L3B_START) return null;
  const hood = easeOutBack(progress(frame, COVER_IN));
  return (
    <group>
      {VENT_XS.map((x) => (
        <group key={x}>
          <Block size={[0.5, 0.26, 0.05]} position={[x, VENT_Y, BACK_IN + depthOf(3) + 0.02]} color={LP.ink} castShadow={false} />
          {[0, 1, 2].map((i) => (
            <Block key={i} size={[0.46, 0.03, 0.06]} position={[x, VENT_Y - 0.08 + i * 0.08, BACK_IN + depthOf(3) + 0.04]} material={steel()} castShadow={false} />
          ))}
          {hood > 0 && (
            <group position={[x, VENT_Y, BACK_IN + depthOf(3)]} scale={[hood, hood, hood]}>
              <Block size={[0.72, 0.08, 0.4]} position={[0, 0.24, 0.2]} material={steel()} />
              <Block size={[0.06, 0.5, 0.4]} position={[-0.34, 0.02, 0.2]} material={steel()} />
              <Block size={[0.06, 0.5, 0.4]} position={[0.34, 0.02, 0.2]} material={steel()} />
              {[0, 1, 2].map((i) => (
                <Block key={i} size={[0.64, 0.05, 0.16]} position={[0, -0.12 + i * 0.13, 0.36]} rotation={[0.6, 0, 0]} material={steel("#7f8a95")} />
              ))}
              {[-0.26, 0.26].map((bx) => (
                <Prism key={bx} r={0.03} h={0.03} sides={6} position={[bx, 0.2, 0.41]} rotation={[Math.PI / 2, 0, 0]} color={LP.hazard} />
              ))}
            </group>
          )}
        </group>
      ))}
    </group>
  );
};

const SUPPLIES: Array<{ x: number; node: React.ReactNode }> = [
  { x: -0.55, node: <Prism r={0.07} h={0.36} sides={8} rotation={[0, 0, Math.PI / 2]} position={[0, 0.07, 0]} color={LP.hazard} /> },
  { x: -0.2, node: <Prism r={0.08} h={0.34} sides={6} position={[0, 0.17, 0]} color="#79a7c8" /> },
  { x: 0.0, node: <Prism r={0.08} h={0.34} sides={6} position={[0, 0.17, 0]} color="#79a7c8" /> },
  { x: 0.33, node: <Blob r={0.17} detail={0} jitter={0} position={[0, 0.06, 0]} scale={[1, 0.8, 1]} color={LP.red} /> },
  { x: 0.7, node: <Blob r={0.17} detail={0} jitter={0} position={[0, 0.06, 0]} scale={[1, 0.8, 1]} color={LP.cloth} /> },
  { x: 1.07, node: <Blob r={0.15} detail={0} jitter={0} position={[0, 0.05, 0]} scale={[1, 0.8, 1]} color={LP.hazard} /> },
  {
    x: 1.5,
    node: (
      <group>
        <Block size={[0.42, 0.26, 0.16]} position={[0, 0.13, 0]} color="#3d4a58" />
        <Prism r={0.07} h={0.02} sides={10} position={[0.08, 0.14, 0.09]} rotation={[Math.PI / 2, 0, 0]} color={LP.cream} />
        <Prism r={0.015} h={0.4} sides={6} position={[-0.14, 0.45, 0]} color={LP.steel} />
      </group>
    ),
  },
];

/**
 * The bathroom that becomes the shelter: partitions, back wall, ceiling, tub,
 * shelf; the lining layers, anchors, doors, vents and supplies arrive on their
 * beats. The whole box lifts off its floor in L4 (the floor tiles stay).
 */
export const SafeRoom: React.FC<{ frame: number }> = ({ frame }) => {
  const y = roomY(frame);
  const backD = DOOR_Z0 - WALL_Z;
  const frontD = FRONT_Z - DOOR_Z1;
  return (
    <group>
      <group position={[0, y, 0]}>
        <Block size={[2 * PART_X, WALL_H, 0.3]} position={[0, WALL_H / 2, WALL_Z]} color={LP.plaster} />
        {/* Tile band on the bathroom wall */}
        {Array.from({ length: 9 }, (_, i) => (
          <Block key={i} size={[0.42, 0.42, 0.05]} position={[-1.76 + i * 0.44, 1.25, BACK_IN + 0.01]} color={i % 2 ? "#dfe6ec" : "#cfd8e0"} castShadow={false} />
        ))}
        {/* Left partition, with the doorway on the action plane */}
        <Block size={[0.24, WALL_H, backD]} position={[-PART_X, WALL_H / 2, WALL_Z + backD / 2]} color={LP.plaster} />
        <Block size={[0.24, WALL_H, frontD]} position={[-PART_X, WALL_H / 2, DOOR_Z1 + frontD / 2]} color={LP.plaster} />
        <Block size={[0.24, WALL_H - DOOR_H, DOOR_Z1 - DOOR_Z0]} position={[-PART_X, (WALL_H + DOOR_H) / 2, (DOOR_Z0 + DOOR_Z1) / 2]} color={LP.plaster} />
        <Block size={[0.24, WALL_H, FRONT_Z - WALL_Z]} position={[PART_X, WALL_H / 2, (WALL_Z + FRONT_Z) / 2]} color={LP.plaster} />
        <Post x={-PART_X} />
        <Post x={PART_X} />
        {/* Bedroom face of the door wall: a framed picture and a light switch, so the L5 door shots aren't bare plaster */}
        <group position={[-PART_X - 0.14, 0, 0]}>
          <Block size={[0.05, 0.62, 0.82]} position={[0, 1.75, 2.05]} color={LP.woodDark} castShadow={false} />
          <Block size={[0.03, 0.48, 0.68]} position={[-0.02, 1.75, 2.05]} color="#9cc3d9" castShadow={false} />
          <Block size={[0.02, 0.18, 0.68]} position={[-0.035, 1.6, 2.05]} color="#7c9c5c" bevel={0.005} castShadow={false} />
          <Prism r={0.08} h={0.02} sides={8} position={[-0.035, 1.86, 2.22]} rotation={[0, 0, Math.PI / 2]} color={LP.hazard} castShadow={false} />
          <Block size={[0.03, 0.16, 0.1]} position={[0, 1.15, 1.45]} color={LP.cream} castShadow={false} />
        </group>
        <Block size={[2 * PART_X + 0.2, 0.26, 6.3]} position={[0, WALL_H + 0.13, -0.2]} color={LP.plasterWarm} castShadow={false} />
        <Block size={[2 * PART_X, 0.2, 0.26]} position={[0, WALL_H - 0.1, BACK_IN + 0.05]} color={LP.trim} />
        {[0, 1, 2].map((k) => (
          <Layer key={k} frame={frame} k={k} />
        ))}
        <Vents frame={frame} />
        {frame < BLOW[0] ? <WoodDoor frame={frame} /> : null}
        <SteelDoor frame={frame} />
      </group>
      {/* Fixed to the floor: tub, the blown-in door, anchors, the shelf and its supplies */}
      <Block size={[2.5, 0.72, 1.05]} position={[0.35, 0.36, -2.35]} color={LP.cream} />
      <Block size={[2.15, 0.04, 0.72]} position={[0.35, 0.72, -2.35]} color="#9fb7c9" castShadow={false} />
      <Prism r={0.05} h={0.3} sides={6} position={[1.45, 0.92, -2.75]} color={LP.steel} />
      {frame >= BLOW[0] ? <WoodDoor frame={frame} /> : null}
      {Array.from({ length: ANCHOR_N }, (_, i) => (
        <Anchor key={i} frame={frame} i={i} />
      ))}
      <group position={[0, y, 0]}>
        <Block size={[2.4, 0.08, 0.42]} position={[0.5, 1.95, BACK_IN + depthOf(3) + 0.22]} color={LP.wood} />
        {[-0.6, 1.6].map((x) => (
          <Block key={x} size={[0.06, 0.24, 0.3]} position={[x, 1.8, BACK_IN + depthOf(3) + 0.17]} color={LP.woodDark} />
        ))}
        {frame >= L6_START &&
          SUPPLIES.map((s, i) => {
            const p = easeOutBack(progress(frame, [SUPPLY_AT[i] - 3, SUPPLY_AT[i] + 5]));
            if (p <= 0) return null;
            const wob = 0.15 * (random(`sup-${i}`) - 0.5) * (1 - clamp01((frame - SUPPLY_AT[i]) / 10));
            return (
              <group key={i} position={[s.x, 1.99, BACK_IN + depthOf(3) + 0.22]} scale={[p, p, p]} rotation={[0, wob, 0]}>
                {s.node}
              </group>
            );
          })}
      </group>
    </group>
  );
};
