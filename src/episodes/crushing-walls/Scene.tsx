import type React from "react";
import { useCurrentFrame } from "remotion";
import { DioramaHall, GlowSprite } from "../../artifacts";
import { Skeleton } from "../../artifacts/boulder";
import {
  Coin,
  CrushRoom,
  ElectricArc,
  HydraulicPress,
  LootPedestal,
  MirrorPanels,
  PaladinCube,
  Pole,
  RoomCeiling,
  RoomRails,
  RoomWheels,
  SlidingWall,
  SpellOrb,
  SteelBeam,
  TriggerTile,
} from "../../artifacts/crusher";
import { MimicChest } from "../../artifacts/dungeon";
import { useSurface } from "../../engine/materials";
import { makeMasonry } from "../../engine/textures";
import type { Vec3 } from "../../engine/types";
import {
  ActorView,
  CHAR_SCALE,
  FACE_CAMERA,
  FACE_LEFT,
  FACE_RIGHT,
  HIP,
  arc,
  clamp,
  dust,
  easeInCubic,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  lerp,
  lieHeight,
  lying,
  magic,
  progress,
  slimeSplash,
  sparks,
  flamePuff,
  type Actor,
} from "../../kit";
import {
  BEATS,
  BEAM_Y,
  BOUNCES,
  CHIMNEY_TOP,
  CLIMB_TOP,
  COIN_Y,
  CUBE,
  DOOR_H,
  DOOR_Z,
  ENTRY_X,
  FOLD_END,
  GOBLIN_HOP,
  GOBLIN_PRESS,
  GOBLIN_WALK,
  GRAB_X,
  HALF,
  MAGE1_LEAVE,
  MAGE1_OUT_X,
  MAGE1_WALK,
  MAGE2_PRESS,
  MAGE2_WALK,
  MIMIC,
  MIRROR_POPS,
  ORB_R,
  ORB_START,
  ORB_Y,
  PALADIN1_WALK,
  PARTY,
  PARTY_WALK,
  PEDESTAL,
  POLE_DROP,
  POLE_TAPS,
  POLE_Z,
  PRESS,
  ROGUE1_CLIMB,
  ROGUE1_EXIT,
  ROGUE1_GLOAT_END,
  ROGUE1_KICKS,
  ROGUE1_ROOF_X,
  ROGUE1_WALK,
  ROGUE2_CLIMB,
  ROGUE2_PRESS,
  ROGUE2_SLIPS,
  ROGUE2_WALK,
  ROGUE2_X,
  ROOF_Y,
  SLAB_HALF,
  SLAB_Y,
  TILE_X,
  VENT_HALF,
  WALL_BOTTOM,
  WALL_T,
  WALL_TOP,
  WALL_Z,
  Z,
  beamState,
  bounceSide,
  kickFrame,
  orbX,
  partyFlight,
  poleHand,
  poleTip,
  pressed,
  roomDX,
  trapShut,
  wallInner,
  wallJump,
  wallShudder,
  walkerX,
} from "./timeline";

/**
 * What is on screen. One `xxxActor(frame): Actor | null` per character:
 * null before they enter and never again after they leave. Dead characters
 * stay dead (pancake, cube) for the rest of the episode. Everything that
 * belongs to the crush room (and every corpse in it) renders inside
 * `CrushRoom`, so it all lunges together in Level 5.
 */

const GREASE = "#c8d43a";
const VIOLET = "#c08aff";
const ZAP = "#9fe8ff";

/** In L5 the pedestal also sinks right after the trigger, out of the paladin's way. */
const pedestalSunk = (f: number) => Math.max(trapShut(f), easeInOut(progress(f, [BEATS.trigger + 4, BEATS.trigger + 12])));
const pedestalY = (f: number) =>
  (easeOutBack(progress(f, [BEATS.pedestalUp, BEATS.pedestalUp + 12])) - 1) * (PEDESTAL.h + 0.1) - pedestalSunk(f) * (PEDESTAL.h + 0.12);

// ---------------------------------------------------------------------------
// The coin: respawns on the cushion after every reopen and is taken by the next grabber.
// ---------------------------------------------------------------------------
const COIN_RUNS = [
  { show: BEATS.pedestalUp + 8, take: BEATS.goblinGrab, gone: BEATS.crush1 },
  { show: BEATS.reopen1 + 14, take: BEATS.rogue1Grab, gone: BEATS.rogue1Grab + 18 },
  { show: BEATS.reopen2 + 14, take: BEATS.rogue2Grab, gone: BEATS.rogue2Grab + 18 },
  { show: BEATS.reopen3 + 14, take: BEATS.mage1Grab, gone: BEATS.mage1Grab + 20 },
  { show: BEATS.reopen4 + 14, take: BEATS.mage2Grab, gone: BEATS.mage2Grab + 20 },
];

const goblinX = (f: number) =>
  f < GOBLIN_WALK[1] ? walkerX(f, GOBLIN_WALK, ENTRY_X, GRAB_X) : lerp(GRAB_X, 0, easeInOut(progress(f, GOBLIN_HOP)));

const coinPos = (f: number): Vec3 | null => {
  const run = COIN_RUNS.find((r) => f >= r.show && f < r.gone);
  if (!run) return null;
  const cushion: Vec3 = [PEDESTAL.x, pedestalY(f) + COIN_Y, PEDESTAL.z];
  if (f < run.take) return cushion;
  const goblin = run.take === BEATS.goblinGrab;
  const gx = goblin ? goblinX(f) : GRAB_X;
  const hand: Vec3 = goblin && f >= BEATS.coinUp ? [gx, 1.72, Z + 0.1] : [gx + 0.32, goblin ? 0.8 : 1.0, Z + 0.15];
  const t = easeInOut(progress(f, [run.take, run.take + 5]));
  const from: Vec3 = goblin && f >= BEATS.coinUp ? [gx + 0.3, 0.8, Z + 0.15] : cushion;
  const u = goblin && f >= BEATS.coinUp ? easeOutCubic(progress(f, [BEATS.coinUp, BEATS.coinUp + 5])) : t;
  return [lerp(from[0], hand[0], u), lerp(from[1], hand[1], u) + (goblin && f >= GOBLIN_HOP[0] ? arc(progress(f, GOBLIN_HOP), 0.35) : 0), lerp(from[2], hand[2], u)];
};

// ---------------------------------------------------------------------------
// Level 1: the goblin grabs the coin and is pressed into a pancake.
// ---------------------------------------------------------------------------
const goblinActor = (f: number): Actor | null => {
  if (f < GOBLIN_WALK[0]) return null;
  if (f < GOBLIN_WALK[1]) return { pose: "walk", position: [goblinX(f), 0, Z], yaw: FACE_RIGHT, expression: "happy" };
  if (f < BEATS.goblinGrab) return { pose: "point", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.3, expression: "happy" };
  if (f < BEATS.coinUp) return { pose: "idle", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.7, expression: "happy" };
  if (f < GOBLIN_HOP[0]) return { pose: "cheer", position: [GRAB_X, 0, Z], yaw: FACE_CAMERA, expression: "happy" };
  if (f < GOBLIN_HOP[1]) {
    return { pose: "jump", position: [goblinX(f), arc(progress(f, GOBLIN_HOP), 0.35), Z], yaw: FACE_RIGHT - 0.6, expression: "happy" };
  }
  if (f < BEATS.doubleTake) return { pose: "cheer", position: [0, 0, Z], yaw: FACE_CAMERA, expression: "happy", speed: 1.4 };
  if (f < BEATS.doubleTake + 8) {
    return { pose: "idle", position: [0, 0, Z], yaw: f < BEATS.doubleTake + 4 ? -0.9 : 0.9, expression: "shock" };
  }
  const p = pressed(f, GOBLIN_PRESS);
  return {
    pose: "cower",
    position: [p.x, 0, p.z],
    yaw: FACE_CAMERA,
    squash: p.squash,
    squashX: p.squashX,
    tilt: p.tilt,
    expression: p.dead ? "dead" : "scared",
  };
};

// ---------------------------------------------------------------------------
// Level 2: rogue 1 parkours out through the vent; rogue 2 is punted back down.
// ---------------------------------------------------------------------------
const jumpYaw = (side: number) => (side > 0 ? FACE_RIGHT : side < 0 ? FACE_LEFT : FACE_CAMERA);

const rogue1Actor = (f: number): Actor | null => {
  if (f < ROGUE1_WALK[0]) return null;
  if (f < ROGUE1_WALK[1]) {
    return { pose: "run", position: [walkerX(f, ROGUE1_WALK, ENTRY_X, GRAB_X), 0, Z], yaw: FACE_RIGHT, speed: 2.2, expression: "focus" };
  }
  if (f < BEATS.rogue1Grab + 6) return { pose: "point", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.3, expression: "smug" };
  if (f < BEATS.parkour) return { pose: "idle", position: [GRAB_X, 0, Z], yaw: FACE_CAMERA, expression: "smug" };
  if (f < BEATS.escape) {
    const j = wallJump(f, ROGUE1_CLIMB, GRAB_X);
    return { pose: "jump", position: [j.x, j.y, Z], yaw: jumpYaw(j.side), expression: "focus" };
  }
  if (f < BEATS.ventIn) return { pose: "jump", position: [0, CLIMB_TOP, Z], yaw: FACE_CAMERA, expression: "smug" };
  if (f < BEATS.roof) {
    const t = easeOutCubic(progress(f, [BEATS.ventIn, BEATS.roof]));
    return { pose: "jump", position: [0, lerp(CLIMB_TOP, ROOF_Y, t), Z], yaw: FACE_CAMERA, expression: "focus" };
  }
  if (f < BEATS.roof + 8) {
    const t = progress(f, [BEATS.roof, BEATS.roof + 8]);
    return { pose: "jump", position: [lerp(0, ROGUE1_ROOF_X, t), ROOF_Y + arc(t, 0.3), Z], yaw: FACE_RIGHT - 0.6, expression: "smug" };
  }
  if (f < ROGUE1_GLOAT_END) {
    const pose = f < BEATS.roof + 24 ? "cheer" : "point";
    return { pose, position: [ROGUE1_ROOF_X, ROOF_Y, Z], yaw: FACE_CAMERA, expression: "smug" };
  }
  const [e0, e1] = ROGUE1_EXIT;
  const edge = SLAB_HALF - 0.15;
  if (f < e0 + 8) {
    return { pose: "run", position: [lerp(ROGUE1_ROOF_X, edge, progress(f, [e0, e0 + 8])), ROOF_Y, Z], yaw: FACE_RIGHT, speed: 2, expression: "happy" };
  }
  if (f < e0 + 20) {
    const t = progress(f, [e0 + 8, e0 + 20]);
    return { pose: "jump", position: [lerp(edge, 3.4, t), lerp(ROOF_Y, 0, t * t) + arc(t, 0.4), Z], yaw: FACE_RIGHT, expression: "happy" };
  }
  if (f < e1) return { pose: "run", position: [lerp(3.4, 9, progress(f, [e0 + 20, e1])), 0, Z], yaw: FACE_RIGHT, speed: 2, expression: "happy" };
  return null;
};

const rogue2Actor = (f: number): Actor | null => {
  if (f < ROGUE2_WALK[0]) return null;
  if (f < ROGUE2_WALK[1]) {
    return { pose: "run", position: [walkerX(f, ROGUE2_WALK, ENTRY_X, GRAB_X), 0, Z], yaw: FACE_RIGHT, speed: 2.4, expression: "focus" };
  }
  if (f < BEATS.rogue2Grab + 6) return { pose: "point", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.3, expression: "happy" };
  if (f < BEATS.climb2) return { pose: "idle", position: [GRAB_X, 0, Z], yaw: FACE_CAMERA, expression: "focus" };
  if (f < BEATS.atVent2) {
    const j = wallJump(f, ROGUE2_CLIMB, GRAB_X);
    const slip = ROGUE2_SLIPS.find(([a, b]) => f >= a && f < b + 4);
    const drop = ROGUE2_SLIPS.reduce((s, [a]) => s + 0.5 * Math.sin(Math.PI * progress(f, [a, a + 10])), 0);
    return {
      pose: slip ? "slip" : "jump",
      position: [j.x, Math.max(0, j.y - drop), Z],
      yaw: jumpYaw(j.side),
      expression: slip ? "shock" : "focus",
    };
  }
  if (f < BEATS.punt) return { pose: "jump", position: [0, CLIMB_TOP, Z], yaw: FACE_CAMERA, expression: "happy" };
  if (f < BEATS.land2) {
    const t = progress(f, [BEATS.punt, BEATS.land2]);
    return {
      pose: "launch",
      position: [lerp(0, ROGUE2_X, t), lerp(CLIMB_TOP, lieHeight("rogue") - HIP, easeOutCubic(t)), Z],
      yaw: FACE_RIGHT,
      tilt: (Math.PI / 2) * easeOutCubic(t),
      pivot: HIP,
      expression: "pain",
    };
  }
  if (f < BEATS.slam3 - 6) return lying({ classType: "rogue", x: ROGUE2_X, z: Z, frame: f, since: BEATS.land2, expression: "dazed" });
  const p = pressed(f, ROGUE2_PRESS);
  return {
    pose: "cower",
    position: [p.x, 0, p.z],
    yaw: FACE_CAMERA,
    squash: p.squash,
    squashX: p.squashX,
    tilt: p.tilt,
    expression: p.dead ? "dead" : "scared",
  };
};

// ---------------------------------------------------------------------------
// Level 3: the paladin wedges a beam, then gets roasted and folded into a cube.
// ---------------------------------------------------------------------------
const paladin1Actor = (f: number): Actor | null => {
  if (f < PALADIN1_WALK[0] || f >= BEATS.cubeReopen) return null;
  if (f < PALADIN1_WALK[1]) {
    return { pose: "walk", position: [walkerX(f, PALADIN1_WALK, ENTRY_X, 0), 0, Z], yaw: FACE_RIGHT, speed: 0.9, expression: "focus" };
  }
  const at = (pose: Actor["pose"], expression: Actor["expression"], yaw = FACE_CAMERA, y = 0): Actor => ({ pose, position: [0, y, Z], yaw, expression });
  if (f < BEATS.wedge) return at("idle", "focus", FACE_RIGHT - 0.6);
  if (f < BEATS.stall - 6) return at("cheer", "focus");
  if (f < BEATS.stall) return at("cheer", "focus", FACE_CAMERA, arc(progress(f, [BEATS.stall - 6, BEATS.stall]), 0.25));
  if (f < BEATS.smug) return at("idle", "smug", lerp(FACE_RIGHT - 0.6, FACE_CAMERA, progress(f, [BEATS.stall, BEATS.stall + 10])));
  if (f < BEATS.sparkL) return at(f < BEATS.smug + 30 ? "point" : "cheer", "smug");
  if (f < BEATS.arc1) return at("idle", "shock");
  if (f < BEATS.roastEnd) return at("cower", "pain");
  if (f < BEATS.fold) return at("cower", "dazed");
  const squashX = clamp(wallInner(f) / HALF.paladin, 0.12, 1);
  return {
    pose: "cower",
    position: [0, 0, Z],
    yaw: FACE_CAMERA,
    squashX,
    squash: lerp(1, 0.35, progress(f, [BEATS.fold, FOLD_END])),
    expression: f >= FOLD_END ? "dead" : "pain",
  };
};
/** X-ray flicker: every other 3-frame slot shows the skeleton instead. */
const xray = (f: number) => f >= BEATS.roast && f < BEATS.roastEnd && Math.floor((f - BEATS.roast) / 3) % 2 === 1;

// ---------------------------------------------------------------------------
// Level 4: mage 1 blinks through the wall; mage 2's spell plays pong.
// ---------------------------------------------------------------------------
const mage1Actor = (f: number): Actor | null => {
  if (f < MAGE1_WALK[0]) return null;
  if (f < MAGE1_WALK[1]) return { pose: "walk", position: [walkerX(f, MAGE1_WALK, ENTRY_X, GRAB_X), 0, Z], yaw: FACE_RIGHT, speed: 0.8, expression: "neutral" };
  if (f < BEATS.mage1Grab + 6) return { pose: "point", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.3, expression: "neutral" };
  if (f < BEATS.cast) return { pose: "idle", position: [GRAB_X, 0, Z], yaw: FACE_CAMERA, expression: "neutral" };
  if (f < BEATS.blink) return { pose: "cast", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.5, expression: "focus" };
  const pop = easeOutBack(progress(f, [BEATS.blink, BEATS.blink + 6]));
  if (f < MAGE1_LEAVE[0]) {
    return {
      pose: f < BEATS.blink + 10 ? "idle" : "point",
      position: [MAGE1_OUT_X, 0, Z],
      yaw: FACE_LEFT + 0.9,
      scale: Math.max(0.01, pop),
      expression: "smug",
    };
  }
  if (f < MAGE1_LEAVE[1]) {
    return { pose: "walk", position: [lerp(MAGE1_OUT_X, 9, progress(f, MAGE1_LEAVE)), 0, Z], yaw: FACE_RIGHT, speed: 0.8, expression: "happy" };
  }
  return null;
};

const mage2Actor = (f: number): Actor | null => {
  if (f < MAGE2_WALK[0]) return null;
  if (f < MAGE2_WALK[1]) {
    return { pose: "run", position: [walkerX(f, MAGE2_WALK, ENTRY_X, GRAB_X), 0, Z], yaw: FACE_RIGHT, speed: 2, expression: "focus" };
  }
  if (f < BEATS.mage2Grab + 4) return { pose: "point", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.3, expression: "happy" };
  if (f < BEATS.teleport) return { pose: "cast", position: [GRAB_X, 0, Z], yaw: FACE_RIGHT - 0.5, expression: "shock" };
  if (f < BEATS.pop) return null;
  const p = pressed(f, MAGE2_PRESS);
  return {
    pose: "cower",
    position: [p.x, 0, p.z],
    yaw: FACE_CAMERA,
    squash: p.squash,
    squashX: p.squashX,
    tilt: p.tilt,
    expression: p.dead ? "dead" : "scared",
  };
};

// ---------------------------------------------------------------------------
// Level 5: the paranoid party pokes, the room lunges, the mimic eats.
// ---------------------------------------------------------------------------
const partyX = (f: number, i: number) => walkerX(f, PARTY_WALK[i], PARTY[i].x - 7, PARTY[i].x);

const partyActor = (f: number, i: number): Actor | null => {
  const p = PARTY[i];
  const win = PARTY_WALK[i];
  if (f < win[0]) return null;
  const glance = i === 0 ? 0 : 0.4 * Math.sin(f * 0.11 + i * 2.1);
  if (f < win[1]) return { pose: "walk", position: [partyX(f, i), 0, p.z], yaw: FACE_RIGHT + glance, expression: i === 0 ? "focus" : "scared" };
  if (f < BEATS.blast - 4) {
    const base = { position: [p.x, 0, p.z] as Vec3 };
    if (f >= BEATS.portcullis) return { ...base, pose: "cower", yaw: FACE_CAMERA, expression: "scared" };
    if (f >= BEATS.trigger + 20) return { ...base, pose: "idle", yaw: FACE_CAMERA, expression: "shock" };
    if (f >= BEATS.trigger) return { ...base, pose: i === 0 ? "point" : "idle", yaw: FACE_RIGHT, expression: "shock" };
    if (i === 0) return { ...base, pose: f >= BEATS.poke - 8 ? "point" : "idle", yaw: FACE_RIGHT, expression: "focus" };
    return { ...base, pose: "idle", yaw: FACE_RIGHT - 0.3 + glance * 0.5, expression: "scared" };
  }
  const fl = partyFlight(f, i);
  if (fl.phase === "gone") return null;
  const dx = roomDX(f);
  if (fl.phase === "squeeze") {
    return {
      pose: "cower",
      position: [dx + fl.pos[0], 0, fl.pos[2]],
      yaw: FACE_CAMERA,
      squashX: clamp(wallInner(f) / HALF[p.cls], 0.12, 1),
      expression: "scared",
    };
  }
  return {
    pose: "launch",
    position: [dx + fl.pos[0], fl.pos[1], fl.pos[2]],
    yaw: 0.6 * (f - BEATS.launch),
    squashX: 0.2,
    expression: "dazed",
  };
};

const poleState = (f: number): { hand: Vec3; tip: Vec3 } | null => {
  const win = PARTY_WALK[0];
  if (f < win[0]) return null;
  if (f < win[1]) {
    const px = partyX(f, 0);
    return { hand: [px + 0.35, 1.05, POLE_Z], tip: [px + 1.8, 0.5, POLE_Z] };
  }
  if (f < POLE_DROP) return { hand: poleHand(f), tip: poleTip(f) };
  const t = easeInCubic(progress(f, [POLE_DROP, POLE_DROP + 8]));
  const h0 = poleHand(POLE_DROP);
  const tip: Vec3 = [TILE_X, 0.04, POLE_Z];
  const len = Math.hypot(h0[0] - TILE_X, h0[1]);
  return { hand: [lerp(h0[0], TILE_X - len, t), lerp(h0[1], 0.04, t), POLE_Z], tip };
};

/** Masonry above the hall's back wall, so the raised ceiling never shows the void. */
const UpperWall: React.FC = () => {
  const stone = useSurface(
    "cw-upper",
    () => makeMasonry({ rows: 3, cols: 6, base: "#3a3e4a", baseAlt: "#454957", mortar: "#1a1c22", seed: 27 }),
    [7, 1]
  );
  return (
    <mesh position={[0, 7.0, Z - 1.95]} receiveShadow>
      <boxGeometry args={[21.2, 1.5, 0.5]} />
      <meshStandardMaterial map={stone.map} normalMap={stone.normalMap} color="#c0c4d0" roughness={0.95} />
    </mesh>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const inner = wallInner(frame);
  const shudder = wallShudder(frame);
  const dx = roomDX(frame);
  const coin = coinPos(frame);
  const beam = beamState(frame);
  const pole = poleState(frame);
  const slabDrop = (1 - easeOutBack(progress(frame, [BEATS.wallsIn, BEATS.wallsInEnd]))) * 4;
  const pal = paladin1Actor(frame);
  const helmet: Vec3 = [0, 1.85, Z];
  const zapOn = frame >= BEATS.arc1 && frame < BEATS.fold;
  const orbOn = frame >= BEATS.teleport && frame < BEATS.pop;
  const orbTrail: Vec3[] = [1, 2, 3, 4].map((k) => frame - 2 * k).filter((f) => f >= ORB_START).map((f) => [orbX(f), ORB_Y, Z] as Vec3);

  return (
    <>
      <DioramaHall
        exit="left"
        archX={null}
        ceilingY={7.4}
        pillarXs={[-9.2, 5.0, 7.4]}
        torchXs={[-8.4, 6.2]}
        bannerColor="#7a2a2a"
      />
      <UpperWall />
      {/* Dark plinth under the hall, so wide shots never show the void below the floor */}
      <mesh position={[0, -5.1, Z]}>
        <boxGeometry args={[34, 8, 3.4]} />
        <meshStandardMaterial color="#15171e" roughness={1} />
      </mesh>

      <RoomRails
        railsAt={BEATS.rails}
        boosterAt={BEATS.booster}
        pushX={dx + wallInner(Math.min(frame, BEATS.lunge + 8)) + WALL_T}
        zs={[WALL_Z[0] + 0.2, WALL_Z[1] - 0.15]}
        z={Z}
      />

      <CrushRoom dx={dx}>
        <pointLight position={[0, 2.7, Z + 1.6]} color="#ffc88a" intensity={2.2} distance={7} decay={2} />

        {frame >= BEATS.wallsIn ? (
          <>
            <SlidingWall
              side={-1}
              inner={inner}
              shudder={-shudder}
              platesFrom={BEATS.platesIn}
              platesTo={BEATS.platesInEnd}
              greaseAt={BEATS.grease}
              electrifyAt={BEATS.electrify}
              doorway={{ z: DOOR_Z, h: DOOR_H }}
              doorShut={trapShut(frame)}
              thickness={WALL_T}
              bottom={WALL_BOTTOM}
              top={WALL_TOP}
              z={WALL_Z}
            />
            <SlidingWall
              side={1}
              inner={inner}
              shudder={shudder}
              platesFrom={BEATS.platesIn}
              platesTo={BEATS.platesInEnd}
              greaseAt={BEATS.grease}
              electrifyAt={BEATS.electrify}
              thickness={WALL_T}
              bottom={WALL_BOTTOM}
              top={WALL_TOP}
              z={WALL_Z}
            />
            <group position={[0, slabDrop, 0]}>
              <RoomCeiling
                chimneyAt={BEATS.chimney}
                bootAts={[BEATS.bootDemo - 3, BEATS.punt - 3]}
                hatchAt={BEATS.hatch}
                blastAt={BEATS.blast}
                z={Z}
                slab={SLAB_Y}
                halfWidth={SLAB_HALF}
                ventHalf={VENT_HALF}
                chimneyTop={CHIMNEY_TOP}
                depth={WALL_Z}
                bootReach={2.4}
              />
            </group>
          </>
        ) : null}

        <LootPedestal riseAt={BEATS.pedestalUp} wiresAt={BEATS.wiresGlow} inner={inner} sunk={pedestalSunk(frame)} x={PEDESTAL.x} z={PEDESTAL.z} h={PEDESTAL.h} />
        {coin ? <Coin position={coin} spin={frame * 0.08} /> : null}

        {[-1, 1].map((side) => (
          <HydraulicPress
            key={side}
            side={side as -1 | 1}
            inner={inner}
            dropAt={side < 0 ? BEATS.pressL - 8 : BEATS.pressR - 8}
            hissAt={BEATS.hiss}
            wallT={WALL_T}
            x0={PRESS.x0}
            x1={PRESS.x1}
            y={PRESS.y}
            r={PRESS.r}
            z={Z}
            backZ={Z - 1.6}
          />
        ))}
        <MirrorPanels
          pops={MIRROR_POPS}
          inner={inner}
          flashes={BOUNCES.map((at) => ({ at, side: bounceSide(at) }))}
          z={Z}
          ceilingY={SLAB_Y[0]}
        />
        <RoomWheels wheelsAt={BEATS.wheels} inner={inner} dx={dx} wallT={WALL_T} zs={[WALL_Z[0] + 0.2, WALL_Z[1] - 0.15]} />
        <TriggerTile x={TILE_X} triggerAt={BEATS.trigger} showAt={BEATS.reopen5 + 14} z={Z} />
        <MimicChest
          position={[MIMIC.x, MIMIC.y, Z]}
          rotationY={-0.3}
          scale={MIMIC.scale}
          spawnFrame={BEATS.rails + 8}
          openFrame={BEATS.mimicOpen}
          chompFrame={BEATS.chomp}
          burpFrame={BEATS.burp}
        />

        {/* The beam, its arcs and the cube */}
        {beam.visible && frame >= PALADIN1_WALK[0] && frame < BEATS.cubeReopen ? (
          <SteelBeam position={[beam.x, beam.y, Z]} half={beam.half} buckle={beam.buckle} />
        ) : null}
        {frame >= BEATS.electrify && frame < BEATS.electrify + 30
          ? [-1, 1].map((side) =>
              [
                [0.5, 1.4],
                [1.8, 2.9],
              ].map(([y0, y1], k) => (
                <ElectricArc
                  key={`test${side}${k}`}
                  a={[side * (inner + 0.02), y0, WALL_Z[1] + 0.06]}
                  b={[side * (inner + 0.02), y1, WALL_Z[1] + 0.06]}
                  seed={`test${side}${k}`}
                  frame={frame}
                  opacity={(frame + k) % 4 < 2 ? 1 : 0.35}
                  jitter={0.07}
                />
              ))
            )
          : null}
        {zapOn ? (
          <>
            {[-1, 1].map((side) => (
              <ElectricArc key={`helm${side}`} a={[side * inner, BEAM_Y, Z]} b={helmet} seed={`helm${side}`} frame={frame} />
            ))}
            <ElectricArc a={[-inner, BEAM_Y, Z]} b={[inner, BEAM_Y, Z]} seed="beam" frame={frame} jitter={0.08} />
            {frame >= BEATS.arc2
              ? [-1, 1].map((side) => (
                  <ElectricArc key={`helm2${side}`} a={[side * inner, BEAM_Y - 0.05, Z + 0.05]} b={helmet} seed={`helm2${side}`} frame={frame} jitter={0.2} />
                ))
              : null}
            {frame >= BEATS.roast && frame < BEATS.roastEnd ? (
              <GlowSprite position={[0, 1.2, Z + 0.4]} color={ZAP} size={2.2} opacity={0.12 + 0.08 * Math.sin(frame * 1.3)} />
            ) : null}
          </>
        ) : null}
        <PaladinCube appearAt={BEATS.cubeReopen} popAt={BEATS.cube} from={[0, 0, Z]} to={[CUBE.x, 0, CUBE.z]} size={CUBE.size} />

        {/* Characters in the room (corpses stay here and ride the lunge) */}
        <ActorView classType="goblin" actor={goblinActor(frame)} frame={frame} />
        <ActorView classType="rogue" actor={rogue1Actor(frame)} frame={frame} />
        <ActorView classType="rogue" actor={rogue2Actor(frame)} frame={frame} />
        {xray(frame) ? (
          <Skeleton variant="paladin" position={[0, 0, Z]} rotation={[0, FACE_CAMERA, 0]} scale={CHAR_SCALE * 1.06} animFrame={frame} />
        ) : (
          <ActorView classType="paladin" actor={pal} frame={frame} weapon="none" />
        )}
        <ActorView classType="mage" actor={mage1Actor(frame)} frame={frame} />
        <ActorView classType="mage" actor={mage2Actor(frame)} frame={frame} />
        {orbOn ? (
          <SpellOrb
            position={[orbX(frame), ORB_Y, Z]}
            frame={frame}
            r={ORB_R}
            scale={easeOutBack(progress(frame, [BEATS.teleport, BEATS.teleport + 8]))}
            trail={orbTrail}
          />
        ) : null}

        {/* L1 bursts */}
        {dust(BEATS.wallsInEnd - 8, [-1.8, 0.15, Z + 0.6], "wall-in-l", 0.8)}
        {dust(BEATS.wallsInEnd - 8, [1.8, 0.15, Z + 0.6], "wall-in-r", 0.8)}
        {dust(BEATS.pedestalUp, [PEDESTAL.x, 0.05, PEDESTAL.z + 0.3], "ped-rise", 0.6)}
        {sparks(BEATS.goblinGrab, [GRAB_X + 0.35, 0.85, Z + 0.15], "coin-grab", "#ffd84d", 18)}
        {COIN_RUNS.slice(1).map((r, i) => sparks(r.show, [PEDESTAL.x, COIN_Y, PEDESTAL.z], `coin-respawn-${i}`, "#ffd84d", 16))}
        {[BEATS.crush1, BEATS.roof + 6, BEATS.slam3 + 6, FOLD_END, BEATS.close4End, BEATS.pop + 4, BEATS.blast + 2].map((at) => (
          <group key={`slam-${at}`}>
            {dust(at, [0, 0.2, Z + 0.7], `slam-lo-${at}`)}
            {dust(at, [0, 2.6, Z + 0.7], `slam-hi-${at}`, 0.6)}
          </group>
        ))}

        {/* L2 bursts */}
        {Array.from({ length: ROGUE1_KICKS - 1 }, (_, k) => {
          const side = k % 2 === 0 ? 1 : -1;
          const r1 = kickFrame(k, ROGUE1_CLIMB);
          const r2 = kickFrame(k, ROGUE2_CLIMB);
          const y = ((k + 1) / ROGUE1_KICKS) * CLIMB_TOP;
          return (
            <group key={`kick${k}`}>
              {dust(r1, [side * (wallInner(r1) - 0.05), y + 0.2, Z], `kick1-${k}`, 0.35)}
              {dust(r2, [side * (wallInner(r2) - 0.05), y + 0.2, Z], `kick2-${k}`, 0.35)}
            </group>
          );
        })}
        {dust(BEATS.roof - 2, [0, ROOF_Y, Z], "vent-pop", 0.5)}
        {[0, 1, 2].map((i) => sparks(BEATS.platesIn + i * 8 + 12, [i === 2 ? -1.8 : 1.8, 0.3, WALL_Z[1]], `plate-${i}`, "#ffe2a8", 24))}
        {slimeSplash(BEATS.grease + 8, [-1.8, 0.1, WALL_Z[1] - 0.1], "grease-l", 0.6, GREASE)}
        {slimeSplash(BEATS.grease + 8, [1.8, 0.1, WALL_Z[1] - 0.1], "grease-r", 0.6, GREASE)}
        {dust(BEATS.chimney, [0, ROOF_Y, Z], "chimney", 0.6)}
        {ROGUE2_SLIPS.map(([a], i) => slimeSplash(a, [0, 0.8 + i * 0.3, Z], `slip-${i}`, 0.5, GREASE))}
        {sparks(BEATS.punt, [0, 2.4, Z], "punt", "#ffd27a", 30)}
        {dust(BEATS.punt, [0, 2.4, Z], "punt-dust", 0.4)}
        {dust(BEATS.land2, [ROGUE2_X, 0.1, Z], "land2", 0.6)}

        {/* L3 bursts */}
        {sparks(BEATS.stall, [-1.1, BEAM_Y, Z], "stall-l")}
        {sparks(BEATS.stall, [1.1, BEAM_Y, Z], "stall-r")}
        {dust(BEATS.pressL + 10, [-(PRESS.x0 + PRESS.x1) / 2, PRESS.y - 0.4, Z], "press-l", 0.6)}
        {dust(BEATS.pressR + 10, [(PRESS.x0 + PRESS.x1) / 2, PRESS.y - 0.4, Z], "press-r", 0.6)}
        {flamePuff(BEATS.hiss, [-PRESS.x1, PRESS.y + 0.3, Z + 0.3], "hiss-l", 0.7, "#dfe8f2")}
        {flamePuff(BEATS.hiss, [PRESS.x1, PRESS.y + 0.3, Z + 0.3], "hiss-r", 0.7, "#dfe8f2")}
        {sparks(BEATS.sparkL, [-1.1, BEAM_Y, Z], "spark-l", ZAP)}
        {sparks(BEATS.sparkR, [1.1, BEAM_Y, Z], "spark-r", ZAP)}
        {sparks(BEATS.arc1, helmet, "arc1", ZAP)}
        {sparks(BEATS.arc2, helmet, "arc2", ZAP)}
        {dust(BEATS.roastEnd, [0, 1.6, Z], "smoke", 0.5)}
        {dust(BEATS.cube + 10, [CUBE.x, 0.05, CUBE.z], "cube-land", 0.5)}

        {/* L4 bursts */}
        {magic(BEATS.cast, [GRAB_X + 0.4, 1.5, Z], "m1-cast", VIOLET)}
        {magic(BEATS.blink, [GRAB_X, 1.0, Z], "m1-out", VIOLET, 40)}
        {magic(BEATS.blink, [MAGE1_OUT_X, 1.0, Z], "m1-in", VIOLET, 40)}
        {MIRROR_POPS.map((at, i) => {
          const side = [-1, 1, -1, 1, 0][i];
          const pos: Vec3 = side === 0 ? [0.95, SLAB_Y[0] - 0.1, Z] : [side * (wallInner(at) - 0.1), i < 2 ? 0.9 : 2.05, Z];
          return magic(at, pos, `mirror-${i}`, VIOLET, 18);
        })}
        {magic(BEATS.mage2Grab + 4, [GRAB_X + 0.4, 1.5, Z], "m2-cast", VIOLET)}
        {magic(BEATS.teleport, [GRAB_X, ORB_Y, Z], "m2-teleport", VIOLET, 40)}
        {BOUNCES.slice(-6).map((at) => sparks(at, [bounceSide(at) * wallInner(at), ORB_Y, Z], `bounce-${at}`, VIOLET, 20))}
        {magic(BEATS.pop, [0, ORB_Y, Z], "orb-pop", VIOLET, 60)}

        {/* L5 bursts (room-relative) */}
        {sparks(BEATS.trigger, [TILE_X, 0.05, Z], "tile", "#ff4a3a", 26)}
        {dust(BEATS.lunge + 6, [-(1.8 + WALL_T), 0.1, Z + 0.4], "lunge-l")}
        {dust(BEATS.lunge + 6, [1.8 + WALL_T, 0.1, Z + 0.4], "lunge-r", 0.7)}
        {dust(BEATS.portcullis + 5, [-(1.8 + WALL_T / 2), 0.1, Z + 0.6], "gate", 0.5)}
        {flamePuff(BEATS.launch, [0, CHIMNEY_TOP, Z], "chute", 0.8, "#e8e4dc")}
        {dust(BEATS.chomp, [MIMIC.x, MIMIC.y + 0.9, Z], "chomp", 0.5)}
      </CrushRoom>

      {/* The party and the pole live in the hall (world x) */}
      {PARTY.map((p, i) => (
        <ActorView key={p.cls} classType={p.cls} actor={partyActor(frame, i)} frame={frame} weapon={p.cls === "paladin" ? "none" : undefined} />
      ))}
      {pole ? <Pole hand={pole.hand} tip={pole.tip} length={3.2} /> : null}
      {POLE_TAPS.map((t, i) => dust(t.at, [t.x, 0.02, POLE_Z], `tap-${i}`, 0.25))}
      {dust(POLE_DROP + 8, [TILE_X - 1.5, 0.05, POLE_Z], "pole-drop", 0.4)}
      {dust(BEATS.booster + 10, [6.2, 0.1, Z], "booster", 0.6)}
      {sparks(BEATS.lunge + 8, [LUNGE_RAIL_X, 0.1, WALL_Z[1] - 0.15], "lunge-rail", "#ffd27a", 40)}
    </>
  );
};

const LUNGE_RAIL_X = -2;
