import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import {
  CORE_FLOOR,
  CORE_SPOT,
  CryptHall,
  DOOR_XS,
  DrawingTable,
  DungeonCore,
  GraveyardCrypt,
  GuildBoard,
  HOPPER,
  MIMIC_SPOT,
  MOON,
  MimicChest,
  TABLE_SPOT,
  TAVERN_BOARD_POS,
  TavernGuildHall,
  boardFace,
  cryptChuteAngle,
  cryptChutePoint,
  type ChuteId,
  type PosterSpec,
  FloorTwoHub,
  HUB_BREACH_X,
} from "../../../artifacts";
import type { AdventurerClass, AdventurerPose, Expression } from "../../../artifacts";
import type { CameraPose, Vec3 } from "../../../engine/types";
import { ActorView, FACE_RIGHT, HIP, clamp01, dust, lerp, magic, progress, shot, type Actor } from "../../../kit";

/**
 * Shared pieces of the cold open, the three bridges and the finale. They cut
 * between three places, each built at its own spot in the same 3D world and
 * only rendered while the camera is there:
 *   - "crypt": the Antechamber (four hallway doors) over the Core Chamber
 *     (Dungeon Core, Mimic, drawing table), chutes inside the walls;
 *   - "tavern": the Adventurers' Guild with the bounty board;
 *   - "graveyard": the crypt entrance outside.
 */

// ---------------------------------------------------------------------------
// Places and shots
// ---------------------------------------------------------------------------
export type Place = "crypt" | "tavern" | "graveyard" | "hub";
/** "hub" is floor two's hub (Season 2), dug under floor one in the finale. */
export const PLACE_ORIGIN: Record<Place, Vec3> = { crypt: [0, 0, 0], tavern: [-80, 0, 0], graveyard: [80, 0, 0], hub: [160, 0, 0] };
const at = (place: Place, x: number, y: number, z = 0): Vec3 => [PLACE_ORIGIN[place][0] + x, y, z];

const BOARD_LOCAL = TAVERN_BOARD_POS;
const BOARD_FACE = boardFace(at("tavern", BOARD_LOCAL[0], BOARD_LOCAL[1], BOARD_LOCAL[2]));

/** The bounty board, close. */
export const boardShot = (d = 7.6): CameraPose => shot(BOARD_FACE[0], BOARD_FACE[1] + 0.3, d, { z: BOARD_FACE[2], rise: 0.2 });
/** The board with the adventurers in front of it. */
export const crowdShot = (d = 11.5): CameraPose => shot(BOARD_FACE[0], 2.1, d, { z: -0.6, rise: 0.6 });
/** The whole Antechamber and its four doors. */
export const anteShot = (d = 15.5): CameraPose => shot(0, 2.7, d, { z: -0.6, rise: 0.6 });
/** One hallway door. */
export const doorShot = (door: ChuteId, d = 8): CameraPose => shot(DOOR_XS[door], 1.7, d, { z: -1.2, rise: 0.4 });
/** Both crypt rooms at once (the crane between them). */
export const cryptWideShot = (): CameraPose => shot(0, -1.2, 24, { z: -0.6, rise: 0 });
/** The Core Chamber: Mimic, Core, table. */
export const chamberShot = (d = 15): CameraPose => shot(-0.4, CORE_FLOOR + 2.9, d, { z: -0.6, rise: 0.4 });
export const mimicShot = (d = 7.6): CameraPose => shot(MIMIC_SPOT[0] + 0.8, CORE_FLOOR + 2.2, d, { z: -0.6, rise: 0.4 });
export const coreShot = (d = 7.5): CameraPose => shot(CORE_SPOT[0], CORE_FLOOR + 2.0, d, { z: -0.6, rise: 0.5 });
/** The drawing table, with the Core glowing at the left edge. */
export const tableShot = (d = 4.6): CameraPose => shot(TABLE_SPOT[0] - 0.6, CORE_FLOOR + 1.2, d, { z: TABLE_SPOT[2], rise: 1.2 });
/** The Core and the drawing table together (the last shot). */
export const coreTableShot = (d = 9): CameraPose => shot((CORE_SPOT[0] + TABLE_SPOT[0]) / 2, CORE_FLOOR + 1.6, d, { z: -0.6, rise: 0.9 });
/** Top of a chute, where it leaves its hallway. */
export const pipeTopShot = (id: ChuteId, d = 10): CameraPose => {
  const p = cryptChutePoint(id, 0.08);
  return shot(p[0] * 0.75, p[1] - 0.5, d, { z: -0.6, rise: 0 });
};
/** The graveyard and the crypt entrance. */
export const graveyardShot = (d = 16, y = 2.6): CameraPose => shot(PLACE_ORIGIN.graveyard[0], y, d, { z: 0, rise: 0.5 });
export const cryptDoorShot = (d = 8.5): CameraPose => shot(PLACE_ORIGIN.graveyard[0], 1.7, d, { z: 0, rise: 0.3 });
/** Up at the moon over the crypt (the dragon passes in front of it). */
/** Floor two's hub: all five doors. */
export const hubShot = (d = 15.5): CameraPose => shot(PLACE_ORIGIN.hub[0], 2.7, d, { z: -0.6, rise: 0.6 });
/** The hub ceiling over door I, where the barbarian's fist comes through. */
export const hubBreachShot = (d = 9): CameraPose => shot(PLACE_ORIGIN.hub[0] + HUB_BREACH_X + 0.8, 3.4, d, { z: -0.6, rise: -0.4 });
/** The barbarian at the bounty board. */
export const barbarianShot = (d = 6): CameraPose => shot(BOARD_FACE[0] + 0.25 - 0.9, 1.9, d, { z: -0.6, rise: 0.4 });
export const moonShot = (): CameraPose => ({
  position: [PLACE_ORIGIN.graveyard[0] + 2, 2.6, 12],
  lookAt: [PLACE_ORIGIN.graveyard[0] + 4.5, 5.2, -6],
});

/** Which place is on screen: the last cut at or before the frame. */
export interface Cut {
  at: number;
  place: Place;
}
export const placeAt = (cuts: Cut[], frame: number): Place => cuts.reduce<Place>((p, c) => (frame >= c.at ? c.place : p), cuts[0].place);

// ---------------------------------------------------------------------------
// A party sliding down a chute inside the walls into the Mimic
// ---------------------------------------------------------------------------
export const NEVER = 1e6;
export interface FallSpec {
  chute: ChuteId;
  classes: AdventurerClass[];
  start: number;
  /** Frames to slide the whole chute. */
  slide: number;
}
const STAGGER = 8;
const DROP = 14;
const PIPE_SCALE = 0.42;

export const mimicScale = (fullness: number): Vec3 => [1.35 * (1 + 0.2 * fullness), 1.35 * (1 + 0.12 * fullness), 1.35 * (1 + 0.16 * fullness)];
export const mimicMouth = (fullness: number): Vec3 => [MIMIC_SPOT[0], MIMIC_SPOT[1] + 0.95 * mimicScale(fullness)[1], MIMIC_SPOT[2] + 0.3];
export const fallEnd = (f: FallSpec) => f.start + (f.classes.length - 1) * STAGGER + f.slide + DROP;

const fallActor = (f: FallSpec, i: number, fullness: number, frame: number): Actor | null => {
  const start = f.start + i * STAGGER;
  if (frame < start) return null;
  const t = progress(frame, [start, start + f.slide]);
  const spin = (frame - start) * 0.3 + i;
  const pivot = HIP * PIPE_SCALE * 0.6;
  if (t < 1) {
    const u = t ** 1.4;
    const p = cryptChutePoint(f.chute, u);
    return { pose: "launch", position: [p[0], p[1] - pivot, p[2] + 0.05], yaw: FACE_RIGHT, tilt: cryptChuteAngle(f.chute, u) + spin, pivot, scale: PIPE_SCALE, expression: "scared" };
  }
  const k = progress(frame, [start + f.slide, start + f.slide + DROP]);
  if (k >= 1) return null;
  const to = mimicMouth(fullness);
  return {
    pose: "launch",
    position: [lerp(HOPPER[0], to[0], k), lerp(HOPPER[1] - 0.4, to[1], k * k) - pivot, lerp(HOPPER[2], to[2], k)],
    yaw: FACE_RIGHT,
    tilt: spin,
    pivot,
    scale: PIPE_SCALE * (1.1 - 0.4 * k),
    expression: "scared",
  };
};

/** Camera target riding the middle victim down the chute, then the Mimic's mouth. */
export const fallTarget = (f: FallSpec, fullness: number) => (frame: number): Vec3 => {
  const start = f.start + Math.floor(f.classes.length / 2) * STAGGER;
  const t = progress(frame, [start, start + f.slide]);
  if (t < 1) return cryptChutePoint(f.chute, t ** 1.4);
  const to = mimicMouth(fullness);
  const k = progress(frame, [start + f.slide, start + f.slide + DROP]);
  return [lerp(HOPPER[0], to[0], k), lerp(HOPPER[1], to[1], k), 0];
};

// ---------------------------------------------------------------------------
// The Mimic (grows every bridge; can jam open; can hop and bonk on the hopper)
// ---------------------------------------------------------------------------
export interface MimicSpec {
  fullness: number;
  openAt: number;
  chompAt: number;
  burpAt: number;
  jamAt?: number;
  hop?: [number, number];
  /** From this frame it strains against its own chest (bulging, shuddering). */
  strainAt?: number;
}
const mimicLift = (m: MimicSpec, frame: number) => {
  if (!m.hop) return { y: 0, squash: 1 };
  const [a, b] = m.hop;
  const t = progress(frame, [a, b]);
  const top = HOPPER[1] - 0.6 - (MIMIC_SPOT[1] + 1.55 * mimicScale(m.fullness)[1]);
  if (t <= 0 || t >= 1) {
    const land = frame >= b ? Math.exp(-(frame - b) / 5) : 0;
    return { y: 0, squash: 1 - 0.25 * land * Math.abs(Math.cos((frame - b) * 0.8)) };
  }
  const up = t < 0.45 ? 1 - (1 - t / 0.45) ** 2 : 1 - ((t - 0.45) / 0.55) ** 2;
  const bonk = t > 0.4 && t < 0.6 ? 1 - Math.abs(t - 0.5) / 0.1 : 0;
  return { y: up * Math.max(1, top), squash: 1 - 0.3 * bonk };
};

const Mimic: React.FC<{ m: MimicSpec; frame: number }> = ({ m, frame }) => {
  const s = mimicScale(m.fullness);
  const { y, squash } = mimicLift(m, frame);
  const jammed = m.jamAt !== undefined && frame >= m.jamAt;
  const strain = m.strainAt !== undefined && frame >= m.strainAt ? Math.min(1, (frame - m.strainAt) / 20) : 0;
  const breathe = 1 + 0.025 * Math.sin(frame * (0.12 - m.fullness * 0.015)) + strain * (0.06 + 0.035 * Math.sin(frame * 0.9));
  return (
    <group position={[MIMIC_SPOT[0], MIMIC_SPOT[1] + y, MIMIC_SPOT[2]]} scale={[(s[0] / 1.35) * breathe, (s[1] / 1.35) * squash, s[2] / 1.35]}>
      <MimicChest
        position={[0, 0, 0]}
        rotationY={0.35}
        scale={1.35}
        spawnFrame={-60}
        openFrame={jammed ? Math.min(m.openAt, m.jamAt ?? m.openAt) : m.openAt}
        chompFrame={jammed ? NEVER : m.chompAt}
        burpFrame={jammed ? NEVER : m.burpAt}
      />
      {m.fullness >= 2 ? (
        <mesh position={[0.2, 1.05, 0.55]} rotation={[0.3, 0, -0.5]}>
          <sphereGeometry args={[0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c9d4e6" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      {m.fullness >= 3 ? (
        <mesh position={[-0.45, 1.0, 0.5]} rotation={[0, 0, 0.7]}>
          <boxGeometry args={[0.18, 0.42, 0.26]} />
          <meshStandardMaterial color="#4a2e1c" roughness={0.8} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Adventurers at the board, and the next party heading for its door
// ---------------------------------------------------------------------------
export interface CrowdMember {
  cls: AdventurerClass;
  x: number;
}
/** Goblin, rogue, mage, paladin in front of the board (tavern-local x). */
export const CROWD: CrowdMember[] = [
  { cls: "goblin", x: -2.6 },
  { cls: "rogue", x: -1.0 },
  { cls: "mage", x: 0.7 },
  { cls: "paladin", x: 2.4 },
];
export interface Reaction {
  /** Index into CROWD. */
  who: number;
  from: number;
  to: number;
  pose: AdventurerPose;
  expression?: Expression;
  /** Turn to the camera while reacting. */
  faceCamera?: boolean;
}

const crowdActor = (i: number, reactions: Reaction[], frame: number): Actor => {
  const m = CROWD[i];
  const pos = at("tavern", m.x, 0, 0.5);
  // Facing the board, angled a little toward the middle so the faces read.
  const baseYaw = Math.PI + (m.x < 0 ? 0.5 : -0.5);
  const r = reactions.find((q) => q.who === i && frame >= q.from && frame < q.to);
  if (!r) return { pose: "idle", position: pos, yaw: baseYaw, expression: "focus" };
  const turn = clamp01((frame - r.from) / 6) * clamp01((r.to - frame) / 6);
  return { pose: r.pose, position: pos, yaw: r.faceCamera ? lerp(baseYaw, m.x < 0 ? Math.PI * 2 : 0, turn) : baseYaw, expression: r.expression };
};

export interface DoorWalk {
  door: ChuteId;
  /** [start, arrive] of the walk from the stairs door to the hallway door. */
  window: [number, number];
}
const walkerActor = (cls: AdventurerClass, i: number, w: DoorWalk, frame: number): Actor | null => {
  const t = progress(frame, [w.window[0] + i * 4, w.window[1] + i * 4]);
  const x0 = -8.6 - i * 0.9;
  const x1 = DOOR_XS[w.door] - 0.6 - i * 0.9;
  if (frame < w.window[0]) return null;
  return { pose: t < 1 ? "walk" : "idle", position: [lerp(x0, x1, t), 0, lerp(-0.6, -1.0, t)], yaw: t < 1 ? FACE_RIGHT : Math.PI * 0.75, speed: 1.2 };
};

// ---------------------------------------------------------------------------
// Dragon: a silhouette crossing the moon
// ---------------------------------------------------------------------------
const dragonShape = (() => {
  // Side-on dragon facing left: horned head, long neck, scalloped bat wing, legs, spaded tail.
  const pts: Array<[number, number]> = [
    [-6.0, 0.6], [-5.4, 0.35], [-4.6, 0.25], [-3.6, 0.0], [-2.6, -0.35], [-1.0, -0.45],
    [-0.6, -0.95], [-0.25, -0.5], [0.6, -0.45], [1.0, -0.95], [1.35, -0.4], [2.2, -0.2],
    [3.6, -0.1], [4.8, 0.1], [5.8, 0.5], [6.4, 0.95], [6.05, 0.4], [6.6, 0.25], [4.8, 0.32],
    [3.5, 0.17], [2.2, 0.17], [1.2, 0.38], [0.8, 0.45], [3.0, 5.4], [2.0, 3.0], [1.6, 4.9],
    [0.95, 2.6], [0.4, 4.4], [-0.05, 2.2], [-0.7, 3.8], [-0.95, 0.5], [-2.6, 0.48], [-3.8, 0.78],
    [-4.6, 0.98], [-5.0, 1.05], [-4.75, 1.6], [-5.3, 1.1], [-5.8, 0.88],
  ];
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(([x, y]) => s.lineTo(x, y));
  s.closePath();
  return s;
})();

const DragonShadow: React.FC<{ window: [number, number]; frame: number }> = ({ window, frame }) => {
  const t = progress(frame, window);
  if (t <= 0 || t >= 1) return null;
  // Crosses the moon (x offset 0) at t = 14/30; the wings peak right then.
  const crossing = window[0] + (14 / 30) * (window[1] - window[0]);
  const flap = 1 + 0.25 * Math.cos((frame - crossing) * 0.5);
  const [mx, my, mz] = at("graveyard", MOON[0], MOON[1], MOON[2] + 0.5);
  return (
    <group position={[mx + lerp(14, -16, t), my + Math.sin(t * Math.PI) * 0.6 - 0.4, mz]} scale={[0.62, 0.62 * flap, 1]}>
      <mesh>
        <shapeGeometry args={[dragonShape]} />
        <meshBasicMaterial color="#07060a" />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Scene factory
// ---------------------------------------------------------------------------
export interface BridgeSceneSpec {
  cuts: Cut[];
  falls?: FallSpec;
  mimic: MimicSpec;
  /** Core flares (default: on the chomp). */
  corePulses?: number[];
  coreEnergy?: number;
  posters: PosterSpec[];
  /** Adventurers at the board (omit for an empty tavern). */
  crowd?: Reaction[];
  doorOpen?: number[];
  doorLit?: number[];
  walk?: DoorWalk;
  doorKnocks?: number[];
  dragon?: [number, number];
  /** Which plan lies on the drawing table. */
  tableSheet?: "floor1" | "floor2";
  /** Floor two's hub: door torches lighting I..V, and the frame the ceiling is punched through. */
  hub?: { doorLit: number[]; breachAt: number };
  /** The barbarian at the board: walks in over `enter`, tears the poster down on `rip`. */
  barbarian?: { enter: [number, number]; rip: number };
}

/** Tavern-local x of the recruit roster the barbarian tears down. */
const POSTER_X = 0.25;

const barbarianActor = (b: { enter: [number, number]; rip: number }, frame: number): Actor | null => {
  if (frame < b.enter[0]) return null;
  const stand = at("tavern", POSTER_X - 0.9, 0, 0.3);
  if (frame < b.enter[1]) {
    const t = progress(frame, b.enter);
    return { pose: "walk", position: [lerp(stand[0] - 6, stand[0], t), 0, stand[2]], yaw: FACE_RIGHT, speed: 0.8, expression: "angry" };
  }
  if (frame < b.rip - 8) return { pose: "idle", position: stand, yaw: Math.PI - 0.4, expression: "angry" };
  if (frame < b.rip + 10) return { pose: frame < b.rip ? "windup" : "smash", position: stand, yaw: Math.PI - 0.6, expression: "yell" };
  // Turns to camera, fists up.
  return { pose: "cheer", position: stand, yaw: 0.3, expression: "smug" };
};

export const makeBridgeScene = (spec: BridgeSceneSpec): React.FC => {
  const BridgeScene: React.FC = () => {
    const frame = useCurrentFrame();
    const place = placeAt(spec.cuts, frame);
    const f = spec.falls;
    const mouth = mimicMouth(spec.mimic.fullness);
    const fallGulps = f ? f.classes.map((_, i) => f.start + i * STAGGER + f.slide) : [];
    const walkers: AdventurerClass[] = ["goblin", "rogue", "mage", "paladin"];
    if (place === "tavern") {
      return (
        <>
          <group position={PLACE_ORIGIN.tavern}>
            <TavernGuildHall />
            <GuildBoard position={BOARD_LOCAL} posters={spec.posters} />
          </group>
          {spec.crowd
            ? CROWD.map((m, i) => <ActorView key={m.cls} classType={m.cls} actor={crowdActor(i, spec.crowd ?? [], frame)} frame={frame} />)
            : null}
          {spec.barbarian ? <ActorView classType="barbarian" actor={barbarianActor(spec.barbarian, frame)} frame={frame} /> : null}
          {spec.barbarian ? dust(spec.barbarian.rip, at("tavern", POSTER_X, 2.8, -1.2), "poster-rip", 0.6) : null}
        </>
      );
    }
    if (place === "hub") {
      return (
        <group position={PLACE_ORIGIN.hub}>
          <FloorTwoHub doorLit={spec.hub?.doorLit} breachAt={spec.hub?.breachAt ?? 1e6} />
        </group>
      );
    }
    if (place === "graveyard") {
      return (
        <>
          <group position={PLACE_ORIGIN.graveyard}>
            <GraveyardCrypt doorKnocks={spec.doorKnocks} />
          </group>
          {spec.dragon ? <DragonShadow window={spec.dragon} frame={frame} /> : null}
        </>
      );
    }
    return (
      <>
        <CryptHall doorOpen={spec.doorOpen} doorLit={spec.doorLit} hopperGulps={fallGulps} />
        <DungeonCore position={CORE_SPOT} energy={spec.coreEnergy ?? 0.6} pulses={spec.corePulses ?? [spec.mimic.chompAt]} />
        <DrawingTable position={TABLE_SPOT} rotationY={-0.25} sheet={spec.tableSheet} />
        <Mimic m={spec.mimic} frame={frame} />
        {f ? f.classes.map((c, i) => <ActorView key={`${c}-${i}`} classType={c} actor={fallActor(f, i, spec.mimic.fullness, frame)} frame={frame} />) : null}
        {spec.walk ? walkers.map((c, i) => <ActorView key={`walk-${c}`} classType={c} actor={walkerActor(c, i, spec.walk as DoorWalk, frame)} frame={frame} />) : null}
        {dust(spec.mimic.chompAt, [mouth[0], mouth[1] + 0.2, mouth[2] + 0.6], "mimic-chomp", 0.8)}
        {magic(spec.mimic.burpAt, [mouth[0] + 0.3, mouth[1] + 0.5, mouth[2] + 0.7], "mimic-burp", "#c9b8e8", 22)}
        {spec.mimic.hop ? dust(spec.mimic.hop[1], [MIMIC_SPOT[0], CORE_FLOOR + 0.1, 0.2], "mimic-land", 1.4) : null}
      </>
    );
  };
  return BridgeScene;
};

