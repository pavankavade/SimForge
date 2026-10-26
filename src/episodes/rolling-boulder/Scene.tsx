import type React from "react";
import { useCurrentFrame } from "remotion";
import {
  BlastDoor,
  BoulderHallway,
  BoulderShatter,
  CeilingCrushers,
  Electromagnet,
  GelatinousCube,
  GlowSprite,
  HalfPipe,
  ReleaseGate,
  RollingBoulder,
  Skeleton,
  SlimePuddle,
  Tripwire,
} from "../../artifacts";
import {
  ActorView,
  CHAR_SCALE,
  FACE_RIGHT,
  HIP,
  Splat,
  dust,
  jellySplash,
  lieHeight,
  lying,
  slimeSplash,
  sparks,
  type Actor,
} from "../../kit";
import {
  BEATS,
  BOULDERS,
  CEILING_Y,
  CRUSHER_XS,
  CUBE_CENTER,
  CUBE_SIZE,
  DOOR_X,
  EDGE_X,
  FLIGHT_START,
  FLOAT_X,
  FOOT_X,
  GOBLIN_HIT_X,
  LEDGE_Y,
  MAGNET_X,
  PALADIN_X,
  PALADIN_YANK_X,
  PARTY,
  PARTY_ENTER,
  PIPE_CENTER,
  PIPE_R,
  R_DRUM,
  ROGUE1_LEAP_X,
  ROGUE2_LIE_X,
  ROGUE_ENTER,
  ROGUE_SNAP_X,
  SLIME_RANGE,
  SLIME_SPOUT_X,
  WIRE_EVENTS,
  WIRE_RETIRE,
  WIRE_X,
  Z,
  boulderById,
  boulderState,
  clamp01,
  easeInOut,
  easeOutCubic,
  enterAfter,
  footFrame,
  gateOpenAmount,
  lerp,
  partyState,
  progress,
  rogueEntryX,
} from "./timeline";
import type { BoulderSpec } from "./timeline";

/** Feet height of a body lying flat on its back (pivot at the hips), same as kit `lying` at class scale 1. */
const LIE_Y = lieHeight("rogue") - HIP;
const LEFT_ENTRY = -10.6;
const FLOAT_Y = 2.8;
const PIPE_FLAT: [number, number] = [-10.6, -7.3];
const DRUM_LENGTH = 3.1;

/** Squashed victims ride the boulder's camera face and spin away with it. */
const hitAngle = (id: string, at: number) => boulderState(boulderById(id), at).angle;

// ---------------------------------------------------------------------------
// Level 1: the goblin trips the wire; it gets up just in time to be flattened.
// ---------------------------------------------------------------------------
const GOBLIN_WALK: [number, number] = [36, BEATS.goblinTrip];
/** Face-down on the floor: chest rests RIG.lieY (scaled) above it. */
const GOBLIN_PRONE_Y = lieHeight("goblin");
const goblinActor = (frame: number): Actor | null => {
  if (frame < GOBLIN_WALK[0] || frame >= BEATS.goblinHit) return null;
  const tripX = WIRE_X - 0.12;
  if (frame < BEATS.goblinTrip) {
    return {
      pose: "walk",
      position: [lerp(-8.4, tripX, progress(frame, GOBLIN_WALK)), 0, Z],
      yaw: FACE_RIGHT,
    };
  }
  const t = progress(frame, [BEATS.goblinTrip, BEATS.goblinTrip + 12]);
  if (t < 1) {
    // Faceplant over the wire.
    return {
      pose: "fall",
      position: [lerp(tripX, tripX + 0.25, t), GOBLIN_PRONE_Y * t + 0.25 * Math.sin(Math.PI * t), Z],
      yaw: FACE_RIGHT,
      tilt: -1.5 * (t * t),
    };
  }
  const upStart = BEATS.goblinHit - 18;
  if (frame < upStart) {
    return { pose: "sprawl", position: [tripX + 0.25, GOBLIN_PRONE_Y, Z], yaw: FACE_RIGHT, tilt: -1.5 };
  }
  const up = easeOutCubic(progress(frame, [upStart, upStart + 8]));
  return {
    pose: up < 1 ? "sprawl" : "cower",
    position: [lerp(tripX + 0.25, GOBLIN_HIT_X, up), GOBLIN_PRONE_Y * (1 - up), Z],
    yaw: FACE_RIGHT,
    tilt: -1.5 * (1 - up),
  };
};

// ---------------------------------------------------------------------------
// Levels 1-2: the rogue snaps the wire, leaps B2, then slips on the slime.
// ---------------------------------------------------------------------------
const SLIP_START_X = 1.3;

const rogueActor = (frame: number): Actor | null => {
  const [leapA, leapB] = BEATS.rogue1Leap;
  if (frame < ROGUE_ENTER[0] || frame >= BEATS.rogue2Hit) return null;
  if (frame < ROGUE_ENTER[1]) {
    return { pose: "walk", position: [rogueEntryX(frame), 0, Z], yaw: FACE_RIGHT, speed: 2.2 };
  }
  if (frame < BEATS.rogue1Snap - 8) {
    return { pose: "idle", position: [ROGUE_SNAP_X, 0, Z], yaw: FACE_RIGHT - 0.2 };
  }
  if (frame < BEATS.rogue1Snap + 6) {
    return { pose: frame < BEATS.rogue1Snap ? "cast" : "smash", position: [ROGUE_SNAP_X, 0, Z], yaw: FACE_RIGHT };
  }
  // Backs off for a run-up while the boulder comes down.
  const backEnd = BEATS.rogue1Snap + 30;
  if (frame < backEnd) {
    const t = easeInOut(progress(frame, [BEATS.rogue1Snap + 6, backEnd]));
    return { pose: "walk", position: [lerp(ROGUE_SNAP_X, ROGUE1_LEAP_X[0] - 0.4, t), 0, Z], yaw: FACE_RIGHT, speed: -1 };
  }
  if (frame < leapA - 6) {
    return { pose: "idle", position: [ROGUE1_LEAP_X[0] - 0.4, 0, Z], yaw: FACE_RIGHT };
  }
  if (frame < leapA) {
    const t = progress(frame, [leapA - 6, leapA]);
    return { pose: "walk", position: [lerp(ROGUE1_LEAP_X[0] - 0.4, ROGUE1_LEAP_X[0], t), 0, Z], yaw: FACE_RIGHT, speed: 2 };
  }
  if (frame < leapB) {
    // Front flip right over the boulder's crown.
    const t = progress(frame, [leapA, leapB]);
    return {
      pose: "jump",
      position: [lerp(ROGUE1_LEAP_X[0], ROGUE1_LEAP_X[1], t), Math.sin(Math.PI * t) * 2.55, Z],
      yaw: FACE_RIGHT,
      tilt: -Math.PI * 2 * easeInOut(t),
      pivot: HIP,
    };
  }
  const landX = ROGUE1_LEAP_X[1];
  if (frame < leapB + 8) {
    return { pose: "cower", position: [landX, 0, Z], yaw: FACE_RIGHT, scale: 1 };
  }
  // Fist pump to the camera, then waits around for the next trap.
  if (frame < leapB + 28) return { pose: "cast", position: [landX, 0, Z], yaw: 0.2, expression: "smug" };
  const slimeLook = BEATS.slimePour[0] - 10;
  if (frame < boulderById("d1").spawn + 4) return { pose: "idle", position: [landX, 0, Z], yaw: 0.35 };
  if (frame < slimeLook) return { pose: "idle", position: [landX, 0, Z], yaw: FACE_RIGHT - 0.3 };
  if (frame < BEATS.slimePour[1] + 8) return { pose: "idle", position: [landX, 0, Z], yaw: -0.4 };
  // Snap the new wire, then back up for a run-up... onto the slime.
  if (frame < BEATS.rogue2Snap - 8) {
    const t = easeInOut(progress(frame, [BEATS.slimePour[1] + 8, BEATS.rogue2Snap - 8]));
    return { pose: t < 1 ? "walk" : "idle", position: [lerp(landX, ROGUE_SNAP_X + 0.1, t), 0, Z], yaw: FACE_RIGHT };
  }
  if (frame < BEATS.rogue2Snap + 6) {
    return { pose: frame < BEATS.rogue2Snap ? "cast" : "smash", position: [ROGUE_SNAP_X + 0.1, 0, Z], yaw: FACE_RIGHT };
  }
  if (frame < BEATS.rogue2Slip) {
    const t = progress(frame, [BEATS.rogue2Snap + 6, BEATS.rogue2Slip]);
    return { pose: "walk", position: [lerp(ROGUE_SNAP_X + 0.1, SLIP_START_X, t), 0, Z], yaw: FACE_RIGHT, speed: -1.3 };
  }
  // Feet shoot forward, he flies up and lands flat on his back in the path.
  const slipEnd = BEATS.rogue2Slip + 18;
  if (frame < slipEnd) {
    const t = progress(frame, [BEATS.rogue2Slip, slipEnd]);
    const startY = 0;
    return {
      pose: "slip",
      position: [lerp(SLIP_START_X, ROGUE2_LIE_X, easeOutCubic(t)), lerp(startY, LIE_Y, t) + 0.9 * Math.sin(Math.PI * t), Z],
      yaw: FACE_RIGHT,
      tilt: (Math.PI / 2) * easeInOut(Math.min(1, t * 1.3)),
      pivot: HIP,
    };
  }
  return lying({ classType: "rogue", x: ROGUE2_LIE_X, z: Z, frame, since: slipEnd });
};

// ---------------------------------------------------------------------------
// Levels 2-3: the paladin stomps through, smashes D2, then gets magnetised.
// ---------------------------------------------------------------------------
const PALADIN_ENTER = enterAfter("d1");
const STOMP_START = Math.round(lerp(PALADIN_ENTER, BEATS.paladinStomp, 0.6));

const paladinActor = (frame: number): Actor | null => {
  if (frame < PALADIN_ENTER || frame >= BEATS.skewer) return null;
  if (frame < STOMP_START) {
    const t = progress(frame, [PALADIN_ENTER, STOMP_START]);
    return { pose: "walk", position: [lerp(LEFT_ENTRY, SLIME_RANGE[0] - 0.6, t), 0, Z], yaw: FACE_RIGHT, speed: 1.1 };
  }
  if (frame < BEATS.paladinStomp) {
    // Heavy, deliberate steps through the slime.
    const t = progress(frame, [STOMP_START, BEATS.paladinStomp]);
    return { pose: "walk", position: [lerp(SLIME_RANGE[0] - 0.6, PALADIN_X, t), 0, Z], yaw: FACE_RIGHT, speed: 0.75 };
  }
  if (frame < BEATS.paladinBrace) {
    return { pose: "idle", position: [PALADIN_X, -0.04 * Math.sin(Math.PI * progress(frame, [BEATS.paladinStomp, BEATS.paladinBrace])), Z], yaw: FACE_RIGHT };
  }
  if (frame < BEATS.smash - 4) return { pose: "windup", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT };
  if (frame < BEATS.smash + 16) return { pose: "smash", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT };
  if (frame < BEATS.smash + 40) return { pose: "idle", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT };
  // Smug pose to camera through the Level 3 install.
  if (frame < boulderById("s1").spawn + 6) return { pose: "idle", position: [PALADIN_X, 0, Z], yaw: 0.3, expression: "smug" };
  if (frame < BEATS.paladin3Brace) return { pose: "idle", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT - 0.35 };
  if (frame < BEATS.yank) return { pose: "windup", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT };
  // Yanked by his armour onto the magnet plate.
  const yankEnd = BEATS.yank + 10;
  if (frame < yankEnd) {
    const t = easeOutCubic(progress(frame, [BEATS.yank, yankEnd]));
    return {
      pose: "fall",
      position: [lerp(PALADIN_X, PALADIN_YANK_X, t), 0.3 * Math.sin(Math.PI * t), Z],
      yaw: FACE_RIGHT,
      tilt: -0.35 * Math.sin(Math.PI * t),
    };
  }
  const jitter = 0.03 * Math.sin(frame * 2.3);
  return { pose: "fall", position: [PALADIN_YANK_X + jitter, 0, Z], yaw: FACE_RIGHT - 0.25, tilt: 0.04 * Math.sin(frame * 1.7), speed: 1.6 };
};

// ---------------------------------------------------------------------------
// Levels 3-4: mage levitates herself and a rogue; crushers swat them down.
// ---------------------------------------------------------------------------
const FLOATER_ENTER = enterAfter("s1");
const FALL_FRAMES = 9;

const floaterActor = (who: "mage" | "rogue", frame: number): Actor | null => {
  const x = FLOAT_X[who];
  const delay = who === "mage" ? 0 : 8;
  const enter: [number, number] = [FLOATER_ENTER + delay, BEATS.cast - 14 + delay];
  const hit = who === "mage" ? BEATS.hitMage4 : BEATS.hitRogue4;
  if (frame < enter[0] || frame >= hit) return null;
  if (frame < enter[1]) {
    return { pose: "walk", position: [lerp(LEFT_ENTRY, x, progress(frame, enter)), 0, Z], yaw: FACE_RIGHT, speed: 1.2 };
  }
  const bob = 0.08 * Math.sin(frame * 0.09 + delay);
  if (frame < BEATS.float[0]) {
    if (who === "mage" && frame >= BEATS.cast) return { pose: "cast", position: [x, 0, Z], yaw: 0.7 };
    return { pose: "idle", position: [x, 0, Z], yaw: who === "mage" ? FACE_RIGHT - 0.3 : 0.3 };
  }
  if (frame < BEATS.swat) {
    const rise = easeInOut(progress(frame, [BEATS.float[0] + delay * 0.5, BEATS.float[1]]));
    return {
      pose: who === "mage" && frame < BEATS.float[1] ? "cast" : "float",
      position: [x, rise * FLOAT_Y + bob * rise, Z],
      yaw: who === "mage" ? 0.55 : 0.25,
      tilt: 0.06 * Math.sin(frame * 0.05 + delay) * rise,
      pivot: HIP,
    };
  }
  // Swatted straight down, landing flat on their backs.
  const land = BEATS.swat + FALL_FRAMES;
  if (frame < land) {
    const t = progress(frame, [BEATS.swat, land]);
    return {
      pose: "fall",
      position: [x, lerp(FLOAT_Y, LIE_Y, t), Z],
      yaw: FACE_RIGHT,
      tilt: (Math.PI / 2) * easeInOut(t),
      pivot: HIP,
    };
  }
  return lying({ classType: who, x, z: Z, frame, since: land });
};

// ---------------------------------------------------------------------------
// Level 5: the party flees, cowers, gets chased up the pipe into the cube.
// ---------------------------------------------------------------------------
const partyActor = (index: number, frame: number): Actor | null => {
  const m = PARTY[index];
  if (frame < PARTY_ENTER + m.delay) return null;
  const s = partyState(m, frame);
  const base = { position: s.position, yaw: s.yaw, tilt: s.tilt };
  switch (s.phase) {
    case "enter":
      return { ...base, pose: "walk", speed: 1.5 };
    case "stare":
      return { ...base, pose: m.classType === "paladin" ? "shield" : "idle" };
    case "flee":
      return { ...base, pose: "walk", speed: 2.3 };
    case "bonk":
      return { ...base, pose: m.classType === "rogue" ? "fall" : "idle" };
    case "cower":
      return { ...base, pose: s.t < 1 ? "walk" : "cower", speed: 1.4 };
    case "look":
      return { ...base, pose: "cower" };
    case "scramble":
      return { ...base, pose: "walk", speed: 2.6 };
    case "pinned":
      return { ...base, pose: "fall", speed: 1.5 };
    case "flight":
    case "jelly":
      return {
        ...base,
        position: [s.position[0], s.position[1] - HIP, s.position[2]],
        pose: s.phase === "flight" ? "launch" : "float",
        pivot: HIP,
        speed: s.phase === "jelly" ? 0.3 : 1,
      };
    default:
      return null;
  }
};

const PartySkeleton: React.FC<{ index: number; frame: number }> = ({ index, frame }) => {
  const m = PARTY[index];
  const s = partyState(m, frame);
  if (s.phase !== "skeleton") return null;
  return (
    <group position={s.position} rotation={[0, 0, s.tilt]}>
      <Skeleton variant={m.classType} position={[0, -HIP, 0]} rotation={[0, s.yaw, 0]} scale={CHAR_SCALE} animFrame={frame} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Boulders + riders
// ---------------------------------------------------------------------------
const Riders: React.FC<{ b: BoulderSpec; frame: number }> = ({ b, frame }) => {
  const face = b.kind === "drum" ? DRUM_LENGTH / 2 + 0.02 : b.r * 0.92;
  switch (b.id) {
    case "b1":
      return frame >= BEATS.goblinHit ? (
        <Splat classType="goblin" angle={-hitAngle("b1", BEATS.goblinHit)} faceZ={face} size={0.95} frame={frame} />
      ) : null;
    case "d1":
      return frame >= BEATS.rogue2Hit ? (
        <Splat classType="rogue" angle={-hitAngle("d1", BEATS.rogue2Hit)} faceZ={face} size={1.05} frame={frame} />
      ) : null;
    case "s1":
      return frame >= BEATS.skewer ? (
        <Splat
          classType="paladin"
          angle={-hitAngle("s1", BEATS.skewer)}
          faceZ={b.r * 0.7}
          size={0.85}
          flat={0.55}
          frame={frame}
          weapon="warhammer"
        />
      ) : null;
    case "b3":
      return (
        <>
          {frame >= BEATS.hitRogue4 ? (
            <Splat classType="rogue" angle={-hitAngle("b3", BEATS.hitRogue4) + 0.55} faceZ={face} size={0.85} frame={frame} />
          ) : null}
          {frame >= BEATS.hitMage4 ? (
            <Splat classType="mage" angle={-hitAngle("b3", BEATS.hitMage4) - 0.55} faceZ={face + 0.04} size={0.85} frame={frame} />
          ) : null}
        </>
      );
    default:
      return null;
  }
};

const magnetCharge = (frame: number) =>
  frame >= BEATS.yank ? Math.max(0, 1 - Math.max(0, frame - BEATS.skewer) / 18) : 0;

const Boulders: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {BOULDERS.map((b) => {
      const st = boulderState(b, frame);
      if (!st.visible) return null;
      return (
        <RollingBoulder
          key={b.id}
          kind={b.kind}
          radius={b.r}
          position={st.position}
          angle={st.angle}
          drumLength={DRUM_LENGTH}
          charge={b.id === "s1" ? magnetCharge(frame) : 0}
        >
          <Riders b={b} frame={frame} />
        </RollingBoulder>
      );
    })}
  </>
);

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
const LevitateAura: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < BEATS.levitate || frame >= BEATS.swat) return null;
  const on = clamp01((frame - BEATS.levitate) / 10);
  const rise = easeInOut(progress(frame, [BEATS.float[0], BEATS.float[1]]));
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.3);
  return (
    <>
      {(["mage", "rogue"] as const).map((who) => (
        <group key={who} position={[FLOAT_X[who], rise * FLOAT_Y + 1.0, Z + 0.1]}>
          <GlowSprite color="#7de9ff" size={2.6 * on * pulse} opacity={0.32 * on} />
          <mesh position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, frame * 0.05]}>
            <ringGeometry args={[0.45, 0.55, 28]} />
            <meshBasicMaterial color="#9ff0ff" transparent opacity={0.6 * on} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const d2 = boulderById("d2");
  const d2Hit = boulderState(d2, BEATS.smash - 1).position;
  const lipX = PIPE_CENTER[0] - PIPE_R;

  return (
    <>
      <BoulderHallway edgeX={EDGE_X} ledgeY={LEDGE_Y} pipeRange={PIPE_FLAT} magnetX={MAGNET_X} ceilingY={CEILING_Y} />
      <ReleaseGate edgeX={EDGE_X} ledgeY={LEDGE_Y} open={gateOpenAmount(frame)} z={Z} />
      <Tripwire x={WIRE_X} events={WIRE_EVENTS} retireFrame={WIRE_RETIRE} footX={FOOT_X} edgeX={EDGE_X} ledgeY={LEDGE_Y} />
      <SlimePuddle range={SLIME_RANGE} spoutX={SLIME_SPOUT_X} pourWindow={BEATS.slimePour} goneFrame={BEATS.slimeGone} ceilingY={CEILING_Y} />
      <Electromagnet x={MAGNET_X} installFrame={BEATS.magnetInstall} armFrame={BEATS.paladin3Brace} pullWindow={[BEATS.yank, BEATS.skewer]} />
      <CeilingCrushers xs={CRUSHER_XS} installFrame={BEATS.crusherInstall} gearsStart={BEATS.gearsStart} slamFrame={BEATS.swat} ceilingY={CEILING_Y} slamY={4.0} />
      <HalfPipe center={PIPE_CENTER} radius={PIPE_R} flatRange={PIPE_FLAT} curveWindow={BEATS.curve} z={Z} />
      <BlastDoor x={DOOR_X} dropWindow={[BEATS.doorDrop, BEATS.doorSlam]} ceilingY={CEILING_Y} />
      <GelatinousCube
        center={CUBE_CENTER}
        size={CUBE_SIZE}
        spawnFrame={BEATS.cubeSpawn}
        impulses={[...PARTY.map((m) => FLIGHT_START + m.flightFrames), FLIGHT_START + 30]}
      />

      <Boulders frame={frame} />
      <BoulderShatter at={BEATS.smash} position={d2Hit} radius={R_DRUM} drumLength={DRUM_LENGTH} />

      <ActorView classType="goblin" actor={goblinActor(frame)} frame={frame} />
      <ActorView classType="rogue" actor={rogueActor(frame)} frame={frame} />
      <ActorView classType="paladin" actor={paladinActor(frame)} frame={frame} weapon="warhammer" />
      <ActorView classType="mage" actor={floaterActor("mage", frame)} frame={frame} />
      <ActorView classType="rogue" actor={floaterActor("rogue", frame)} frame={frame} />
      {PARTY.map((m, i) => (
        <ActorView key={m.classType} classType={m.classType} actor={partyActor(i, frame)} frame={frame} />
      ))}
      {PARTY.map((m, i) => (
        <PartySkeleton key={`skel-${m.classType}`} index={i} frame={frame} />
      ))}
      <LevitateAura frame={frame} />

      {/* Boulder drops onto the ledge, and the floor impact at the ramp foot */}
      {BOULDERS.map((b) => dust(b.spawn + 10, [EDGE_X + b.r + 0.1, LEDGE_Y + 0.05, Z], `drop-${b.id}`, 0.8))}
      {BOULDERS.filter((b) => b.mode !== "shatter").map((b) => dust(Math.round(footFrame(b)), [FOOT_X - 0.4, 0.05, Z], `foot-${b.id}`, 0.9))}

      {/* Level 1 */}
      {sparks(BEATS.goblinTrip, [WIRE_X, 0.3, Z + 0.4], "wire-goblin", "#fff2c0", 14)}
      {dust(BEATS.goblinTrip + 12, [WIRE_X + 0.8, 0.05, Z], "goblin-faceplant", 0.6)}
      {dust(BEATS.goblinHit, [GOBLIN_HIT_X, 0.4, Z], "goblin-squash", 1.1)}
      {sparks(BEATS.rogue1Snap, [WIRE_X, 0.3, Z + 0.4], "wire-rogue1", "#fff2c0", 14)}
      {dust(BEATS.rogue1Leap[1], [ROGUE1_LEAP_X[1], 0.05, Z], "rogue1-land", 0.5)}

      {/* Level 2 */}
      {slimeSplash(BEATS.slimePour[0] + 8, [SLIME_SPOUT_X, 0.05, Z + 0.3], "pour-splash", 1.2)}
      {sparks(BEATS.rogue2Snap, [WIRE_X, 0.3, Z + 0.4], "wire-rogue2", "#fff2c0", 14)}
      {slimeSplash(BEATS.rogue2Slip, [SLIP_START_X, 0.05, Z], "slip-splash", 1.2)}
      {slimeSplash(BEATS.rogue2Slip + 18, [ROGUE2_LIE_X, 0.05, Z], "slip-land", 1.4)}
      {dust(BEATS.rogue2Hit, [ROGUE2_LIE_X, 0.4, Z], "rogue2-squash", 1.2)}
      {slimeSplash(BEATS.rogue2Hit, [ROGUE2_LIE_X + 0.4, 0.05, Z + 0.4], "rogue2-slime", 1.6)}
      {[0, 1, 2, 3].map((i) => {
        const at = Math.round(lerp(STOMP_START, BEATS.paladinStomp, (i + 0.5) / 4));
        const x = lerp(SLIME_RANGE[0] - 0.6, PALADIN_X, progress(at, [STOMP_START, BEATS.paladinStomp]));
        return x > SLIME_RANGE[0] && x < SLIME_RANGE[1] ? slimeSplash(at, [x, 0.05, Z], `stomp-${i}`, 0.9) : null;
      })}
      {sparks(BEATS.paladinStomp, [WIRE_X, 0.3, Z + 0.4], "wire-paladin", "#fff2c0", 14)}
      {dust(BEATS.paladinStomp, [PALADIN_X + 0.2, 0.05, Z], "paladin-stomp", 0.6)}
      {sparks(BEATS.smash, [d2Hit[0] - R_DRUM, d2Hit[1] - 0.4, Z + 0.4], "smash-sparks", "#ffd27a", 60)}
      {dust(BEATS.smash, [d2Hit[0], d2Hit[1], Z], "smash-dust", 1.8)}

      {/* Level 3 */}
      {dust(BEATS.magnetInstall + 4, [MAGNET_X, 0.1, Z + 0.8], "magnet-install", 0.8)}
      {sparks(BEATS.yank, [PALADIN_YANK_X, 0.4, Z + 0.3], "yank-arcs", "#9fe8ff", 40)}
      {sparks(BEATS.skewer, [PALADIN_YANK_X + 0.4, 1.0, Z + 0.4], "skewer-sparks", "#ffd27a", 60)}
      {dust(BEATS.skewer, [PALADIN_YANK_X, 0.4, Z], "skewer-dust", 1.2)}
      {sparks(BEATS.levitate, [FLOAT_X.mage, 1.2, Z + 0.3], "levitate-mage", "#9ff0ff", 50)}
      {sparks(BEATS.levitate + 4, [FLOAT_X.rogue, 1.2, Z + 0.3], "levitate-rogue", "#9ff0ff", 40)}
      {dust(Math.round(BEATS.underneath - 6), [-1.5, 0.05, Z], "s2-pass", 0.8)}

      {/* Level 4 */}
      {CRUSHER_XS.map((x) => dust(BEATS.crusherInstall + 12, [x, CEILING_Y - 0.6, Z + 0.2], `crusher-install-${x}`, 0.7))}
      {CRUSHER_XS.map((x) => sparks(BEATS.swat, [x, FLOAT_Y + 1.9, Z + 0.3], `swat-${x}`, "#ffd27a", 30))}
      {CRUSHER_XS.map((x) => dust(BEATS.swat + FALL_FRAMES, [x, 0.05, Z], `swat-land-${x}`, 0.9))}
      {dust(BEATS.hitRogue4, [FLOAT_X.rogue, 0.4, Z], "b3-rogue", 1.1)}
      {dust(BEATS.hitMage4, [FLOAT_X.mage, 0.4, Z], "b3-mage", 1.1)}

      {/* Level 5 */}
      {dust(BEATS.doorSlam, [DOOR_X + 0.3, 0.05, Z], "door-slam", 1.4)}
      {sparks(BEATS.doorSlam + 2, [DOOR_X + 0.4, 1.6, Z + 0.3], "door-bonk", "#fff2a0", 20)}
      {[0, 1, 2, 3].map((i) =>
        dust(Math.round(BEATS.curve[0] + i * 8), [PIPE_CENTER[0] - 0.6 - i * 0.65, 0.1 + i * 0.3, Z], `pipe-lift-${i}`, 0.7)
      )}
      {jellySplash(BEATS.cubeSpawn, [CUBE_CENTER[0], CUBE_CENTER[1] + 0.8, Z + 0.4], "cube-spawn")}
      {dust(BEATS.launch, [lipX + 0.4, PIPE_CENTER[1], Z], "launch-dust", 1.2)}
      {PARTY.map((m) => jellySplash(FLIGHT_START + m.flightFrames, m.target, `jelly-${m.classType}`))}
      {PARTY.map((m) => jellySplash(BEATS.dissolve, m.target, `dissolve-${m.classType}`))}
    </>
  );
};
