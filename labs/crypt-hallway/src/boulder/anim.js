// Film: Ep2 ("Evolution of a Boulder Trap") re-staged in the boulder hallway, voiced with Ep2's
// narration. Beats and kinematics come from timeline.js (keyed to spoken words); this module adds
// what the camera, the cast, the props, the sound and the bursts do at every frame. Pure functions
// of the frame (30 fps), all in Ep2's frame (hall.js toLab() maps them into the lab).
//   l1   tripwire boulder: the goblin trips the wire and is flattened; a rogue snaps it early, flips the ball
//   l2   hall-wide drum + slime: the rogue slips into its path; a paladin stomps through and smashes it
//   l3   spiked iron + electromagnet: the paladin is yanked onto the spikes; a mage levitates over the next
//   l4   ceiling crushers swat the floaters down into the next ball
//   l5   blast door + half-pipe: the party runs, the door seals, the ball launches them into the cube
import { HIP, lieHeight, lying } from "../../../../src/kit/actors";
import {
  BEATS, BOULDERS, Z, HW, WIRE_X, SLIME_RANGE, SLIME_SPOUT_X, MAGNET_X, PIPE_CENTER, CEILING_Y, CUBE_CENTER,
  CRUSHER_XS, CRUSHER_SLAM_Y, FLOAT_Y, FLOAT_X, GOBLIN_HIT_X, ROGUE1_LEAP_X, ROGUE2_LIE_X, PALADIN_X, PALADIN_YANK_X,
  ROGUE_ENTER, ROGUE_SNAP_X, LEFT_ENTRY, PARTY, PARTY_ENTER, FLIGHT_START, FLIGHT_END, STAGE_STARTS, WIRE_EVENTS,
  WIRE_RETIRE, EDGE_X, LEDGE_Y, DOOR_H, WALL_END_X, LINES, FPS, DURATION, cues, PIPE_LIP_FRAME,
  boulderById, boulderState, rolledOver, gateOpenAmount, partyState, enterAfter, footFrame, frameAtX, rogueEntryX,
  clamp01, easeInOut, easeOutCubic, lerp, progress, w, lineStart,
} from "./timeline.js";
import { toLab } from "./hall.js";

export { FPS, LINES };
export const FRAMES = DURATION;
export const NARRATION_END = FRAMES;
const B = BEATS;
const FACE_RIGHT = Math.PI / 2, FACE_LEFT = -Math.PI / 2;
const TO_CAM = FACE_RIGHT + 0.22;   // the film camera sits up the hall, a little to the -z side
const easeOutBack = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
const LIE_Y = lieHeight("rogue") - HIP;
const PANCAKE = 0.16;

/** A body on its back along the hall, flattened as ball b rolls over it (stays flat for good). */
function pancake(classType, x, b, f, since) {
  const t = easeOutCubic(rolledOver(b, x, f));
  const a = lying({ classType, x, z: Z, frame: f, since });
  return { ...a, squash: lerp(1, PANCAKE, t), expression: t > 0 ? "dead" : "scared" };
}

// --- level 1: the goblin trips the wire, gets up just in time to be flattened -------------------
const GOBLIN_WALK = [36, B.goblinTrip];
const GOBLIN_PRONE_Y = lieHeight("goblin");
const b1 = boulderById("b1");
function goblin(f) {
  if (f < GOBLIN_WALK[0]) return null;
  const tripX = WIRE_X - 0.12;
  if (f < B.goblinTrip) {
    return { pose: "walk", position: [lerp(LEFT_ENTRY, tripX, progress(f, GOBLIN_WALK)), 0, Z], yaw: FACE_RIGHT, expression: f > B.goblinTrip - 50 ? "happy" : undefined };
  }
  const t = progress(f, [B.goblinTrip, B.goblinTrip + 12]);
  if (t < 1) { // faceplant over the wire
    return { pose: "fall", position: [lerp(tripX, tripX + 0.25, t), GOBLIN_PRONE_Y * t + 0.25 * Math.sin(Math.PI * t), Z], yaw: FACE_RIGHT, tilt: -1.5 * t * t, expression: "shock" };
  }
  const upStart = B.goblinHit - 22;
  if (f < upStart) return { pose: "sprawl", position: [tripX + 0.25, GOBLIN_PRONE_Y, Z], yaw: FACE_RIGHT, tilt: -1.5, expression: "dazed" };
  if (f < B.goblinHit) {
    const up = easeOutCubic(progress(f, [upStart, upStart + 8]));
    return { pose: up < 1 ? "sprawl" : "cower", position: [lerp(tripX + 0.25, GOBLIN_HIT_X, up), GOBLIN_PRONE_Y * (1 - up), Z], yaw: FACE_RIGHT, tilt: -1.5 * (1 - up), expression: up < 1 ? "dazed" : "scared" };
  }
  return { ...pancake("goblin", GOBLIN_HIT_X, b1, f, B.goblinHit), turn: Math.PI / 2 }; // knocked flat across the hall (hidden by the ball)
}

// --- levels 1-2: the rogue snaps the wire, flips the second ball, then slips on the slime --------
const SLIP_START_X = SLIME_RANGE[1] - 0.2;
const d1 = boulderById("d1");
function rogue(f) {
  const [leapA, leapB] = B.rogue1Leap;
  if (f < ROGUE_ENTER[0]) return null;
  if (f < ROGUE_ENTER[1]) return { pose: "run", position: [rogueEntryX(f), 0, Z], yaw: FACE_RIGHT, speed: 2.2 };
  if (f < B.rogue1Snap - 8) return { pose: "idle", position: [ROGUE_SNAP_X, 0, Z], yaw: FACE_RIGHT - 0.25, expression: f < ROGUE_ENTER[1] + 14 ? "focus" : "smug" };
  if (f < B.rogue1Snap + 6) return { pose: f < B.rogue1Snap ? "windup" : "smash", position: [ROGUE_SNAP_X, 0, Z], yaw: FACE_RIGHT, expression: "focus" };
  const backEnd = B.rogue1Snap + 30; // backs off for a run-up while the ball comes down
  const runUp = ROGUE1_LEAP_X[0] - 0.4;
  if (f < backEnd) {
    const t = easeInOut(progress(f, [B.rogue1Snap + 6, backEnd]));
    return { pose: "walk", position: [lerp(ROGUE_SNAP_X, runUp, t), 0, Z], yaw: FACE_RIGHT, speed: -1, expression: "focus" };
  }
  if (f < leapA - 6) return { pose: "cower", position: [runUp, 0, Z], yaw: FACE_RIGHT, expression: "focus" };
  if (f < leapA) {
    const t = progress(f, [leapA - 6, leapA]);
    return { pose: "run", position: [lerp(runUp, ROGUE1_LEAP_X[0], t), 0, Z], yaw: FACE_RIGHT, speed: 2, expression: "focus" };
  }
  if (f < leapB) { // a front flip right over the crown of the ball
    const t = progress(f, [leapA, leapB]);
    return { pose: "jump", position: [lerp(ROGUE1_LEAP_X[0], ROGUE1_LEAP_X[1], t), Math.sin(Math.PI * t) * 2.95, Z], yaw: FACE_RIGHT, tilt: -Math.PI * 2 * easeInOut(t), pivot: HIP, expression: "focus" };
  }
  const landX = ROGUE1_LEAP_X[1];
  if (f < leapB + 8) return { pose: "cower", position: [landX, 0, Z], yaw: FACE_RIGHT, expression: "happy" };
  if (f < leapB + 34) return { pose: "cheer", position: [landX, 0, Z], yaw: TO_CAM, expression: "smug" }; // fist pump to camera
  const look = B.slimePour[0] - 10;
  if (f < d1.spawn + 4) return { pose: "idle", position: [landX, 0, Z], yaw: TO_CAM, expression: "smug" };
  if (f < look) return { pose: "idle", position: [landX, 0, Z], yaw: FACE_RIGHT, expression: f < d1.spawn + 30 ? "shock" : "focus" }; // the drum lands
  if (f < B.slimePour[1] + 8) return { pose: "idle", position: [landX, 0, Z], yaw: FACE_LEFT + 0.55, expression: "smug" }; // looks back at the slime
  // snap the new wire, then back up for a run-up... onto the slime
  if (f < B.rogue2Snap - 8) {
    const t = easeInOut(progress(f, [B.slimePour[1] + 8, B.rogue2Snap - 8]));
    return { pose: t < 1 ? "walk" : "idle", position: [lerp(landX, ROGUE_SNAP_X + 0.1, t), 0, Z], yaw: FACE_RIGHT, speed: -0.8 };
  }
  if (f < B.rogue2Snap + 6) return { pose: f < B.rogue2Snap ? "windup" : "smash", position: [ROGUE_SNAP_X + 0.1, 0, Z], yaw: FACE_RIGHT, expression: "focus" };
  if (f < B.rogue2Slip) {
    const t = progress(f, [B.rogue2Snap + 6, B.rogue2Slip]);
    return { pose: "walk", position: [lerp(ROGUE_SNAP_X + 0.1, SLIP_START_X, t), 0, Z], yaw: FACE_RIGHT, speed: -1.3, expression: "smug" };
  }
  const slipEnd = B.rogue2Slip + 18; // feet shoot forward, up he goes, flat on his back in the path
  if (f < slipEnd) {
    const t = progress(f, [B.rogue2Slip, slipEnd]);
    return {
      pose: "slip", position: [lerp(SLIP_START_X, ROGUE2_LIE_X, easeOutCubic(t)), lerp(0, LIE_Y, t) + 0.9 * Math.sin(Math.PI * t), Z],
      yaw: FACE_RIGHT, tilt: (Math.PI / 2) * easeInOut(Math.min(1, t * 1.3)), pivot: HIP, expression: "shock",
    };
  }
  return pancake("rogue", ROGUE2_LIE_X, d1, f, slipEnd);
}

// --- levels 2-3: the paladin stomps through, smashes the second drum, then gets magnetised ------
const PALADIN_ENTER = enterAfter("d1");
const STOMP_START = Math.round(lerp(PALADIN_ENTER, B.paladinStomp, 0.6));
const s1 = boulderById("s1");
function paladin(f) {
  if (f < PALADIN_ENTER || f >= B.skewer) return null;
  if (f < STOMP_START) {
    const t = progress(f, [PALADIN_ENTER, STOMP_START]);
    return { pose: "walk", position: [lerp(LEFT_ENTRY, SLIME_RANGE[0] - 0.6, t), 0, Z], yaw: FACE_RIGHT, speed: 1.1 };
  }
  if (f < B.paladinStomp) { // heavy, deliberate steps through the slime
    const t = progress(f, [STOMP_START, B.paladinStomp]);
    return { pose: "walk", position: [lerp(SLIME_RANGE[0] - 0.6, PALADIN_X, t), 0, Z], yaw: FACE_RIGHT, speed: 0.75, expression: "focus" };
  }
  if (f < B.paladinBrace) return { pose: "idle", position: [PALADIN_X, -0.04 * Math.sin(Math.PI * progress(f, [B.paladinStomp, B.paladinBrace])), Z], yaw: FACE_RIGHT, expression: "focus" };
  if (f < B.smash - 4) return { pose: "windup", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT, expression: "angry" };
  if (f < B.smash + 16) return { pose: "smash", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT, expression: "yell" };
  if (f < B.smash + 30) return { pose: "idle", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT, expression: "happy" };
  if (f < s1.spawn + 6) return { pose: f < B.smash + 64 ? "cheer" : "idle", position: [PALADIN_X, 0, Z], yaw: TO_CAM, expression: "smug" };
  if (f < B.magnetInstall + 6) return { pose: "idle", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT, expression: f < s1.spawn + 30 ? "shock" : "smug" };
  if (f < B.paladin3Brace) return { pose: "idle", position: [PALADIN_X, 0, Z], yaw: f < B.magnetInstall + 30 ? FACE_RIGHT + 0.5 : FACE_RIGHT, expression: "smug" };
  if (f < B.yank) return { pose: "windup", position: [PALADIN_X, 0, Z], yaw: FACE_RIGHT, expression: "angry" };
  const yankEnd = B.yank + 10; // yanked by his armour onto the magnet plate
  if (f < yankEnd) {
    const t = easeOutCubic(progress(f, [B.yank, yankEnd]));
    return { pose: "fall", position: [lerp(PALADIN_X, PALADIN_YANK_X, t), 0.3 * Math.sin(Math.PI * t), Z], yaw: FACE_RIGHT, tilt: -0.35 * Math.sin(Math.PI * t), expression: "shock" };
  }
  const jitter = 0.03 * Math.sin(f * 2.3);
  return { pose: "fall", position: [PALADIN_YANK_X + jitter, 0, Z], yaw: FACE_RIGHT - 0.25, tilt: 0.04 * Math.sin(f * 1.7), speed: 1.6, expression: "scared" };
}

// --- levels 3-4: the mage levitates herself and a rogue; the crushers swat them down -------------
const FLOATER_ENTER = enterAfter("s1");
const FALL_FRAMES = 9;
const b3 = boulderById("b3");
function floater(who, f) {
  const x = FLOAT_X[who];
  const delay = who === "mage" ? 0 : 8;
  const enter = [FLOATER_ENTER + delay, B.cast - 14 + delay];
  if (f < enter[0]) return null;
  if (f < enter[1]) return { pose: "walk", position: [lerp(LEFT_ENTRY, x, progress(f, enter)), 0, Z], yaw: FACE_RIGHT, speed: 1.4 };
  const bob = 0.08 * Math.sin(f * 0.09 + delay);
  if (f < B.float[0]) {
    if (who === "mage" && f >= B.cast) return { pose: "cast", position: [x, 0, Z], yaw: TO_CAM, expression: "focus" };
    return { pose: "idle", position: [x, 0, Z], yaw: who === "mage" ? FACE_RIGHT : TO_CAM + 0.3, expression: who === "rogue" && f > B.levitate ? "shock" : undefined };
  }
  if (f < B.swat) {
    const rise = easeInOut(progress(f, [B.float[0] + delay * 0.5, B.float[1]]));
    const looksUp = f >= B.crusherInstall + 6 && f < B.crusherInstall + 40;
    return {
      pose: who === "mage" && f < B.float[1] ? "cast" : "float", position: [x, rise * FLOAT_Y + bob * rise, Z],
      yaw: who === "mage" ? TO_CAM : TO_CAM - 0.25, tilt: 0.06 * Math.sin(f * 0.05 + delay) * rise, pivot: HIP,
      expression: looksUp ? "shock" : f > B.swat - 12 ? "scared" : "smug",
    };
  }
  const land = B.swat + FALL_FRAMES; // swatted straight down, flat on their backs
  if (f < land) {
    const t = progress(f, [B.swat, land]);
    return { pose: "fall", position: [x, lerp(FLOAT_Y, LIE_Y, t), Z], yaw: FACE_RIGHT, tilt: (Math.PI / 2) * easeInOut(t), pivot: HIP, expression: "pain" };
  }
  const hit = rolledOver(b3, x, f) > 0;
  return { ...pancake(who, x, b3, f, land), expression: hit ? "dead" : f > b3.release + 10 ? "scared" : "dazed" };
}

// --- level 5: the party flees, cowers, gets chased up the pipe into the cube --------------------
function partyMember(i, f) {
  const m = PARTY[i];
  if (f < PARTY_ENTER + m.delay) return null;
  const s = partyState(m, f);
  const base = { position: s.position, yaw: s.yaw, tilt: s.tilt };
  switch (s.phase) {
    case "enter": return { ...base, pose: "walk", speed: 1.5 };
    case "stare": return { ...base, pose: m.classType === "paladin" ? "shield" : "idle", expression: f >= B.turn ? "shock" : "smug" };
    case "flee": return { ...base, pose: "run", speed: 2.3, expression: "scared" };
    case "bonk": return { ...base, pose: m.classType === "rogue" ? "fall" : "idle", expression: m.classType === "rogue" ? "dazed" : "shock" };
    case "cower": return { ...base, pose: s.t < 1 ? "walk" : "cower", speed: 1.4, expression: "scared" };
    case "look": return { ...base, pose: "cower", expression: "scared" };
    case "scramble": return { ...base, pose: "run", speed: 2.6, expression: "scared" };
    case "pinned": return { ...base, pose: "fall", speed: 1.5, expression: "scared" };
    case "flight":
    case "jelly":
      return { ...base, position: [s.position[0], s.position[1] - HIP, s.position[2]], pose: s.phase === "flight" ? "launch" : "float", pivot: HIP, speed: s.phase === "jelly" ? 0.3 : 1, expression: s.phase === "flight" ? "scared" : "pain" };
    default: return null;
  }
}

// One track per character (frame -> Actor | null), eased by the kit's ActorView in cast.jsx.
export const TRACKS = [
  { id: "goblin", classType: "goblin", track: goblin },
  { id: "rogue", classType: "rogue", track: rogue },
  { id: "paladin", classType: "paladin", track: paladin, weapon: "warhammer" },
  { id: "mage", classType: "mage", track: (f) => floater("mage", f) },
  { id: "rogue2", classType: "rogue", track: (f) => floater("rogue", f) },
  ...PARTY.map((m, i) => ({ id: `p-${m.classType}`, classType: m.classType, track: (f) => partyMember(i, f) })),
];

// Bodies that ride a hazard or are left as bones (cast.jsx draws them with the kit's Splat/Skeleton)
export function extrasAt(f) {
  const out = [];
  if (f >= B.skewer) {
    const st = boulderState(s1, f);
    if (st.visible) out.push({ kind: "splat", id: "pal-splat", classType: "paladin", weapon: "warhammer", center: st.position, angle: st.angle - boulderState(s1, B.skewer).angle, faceZ: s1.r * 0.72, size: 0.85, flat: 0.55 });
  }
  PARTY.forEach((m) => {
    const s = partyState(m, f);
    if (s.phase === "skeleton") out.push({ kind: "skeleton", id: `skel-${m.classType}`, variant: m.classType, position: s.position, tilt: s.tilt, yaw: s.yaw });
  });
  return out;
}

// --- props -----------------------------------------------------------------------------------
const magnetCharge = (f) => (f >= B.yank ? Math.max(0, 1 - Math.max(0, f - B.skewer) / 18) : 0);
const CRUSHER_REST = CEILING_Y - 1.05;  // crusher face height between slams
const CRUSHER_HIDDEN = CEILING_Y + 1.6;
function crusherY(f, i) {
  if (f < B.crusherInstall) return null;
  const drop = easeOutBack(progress(f, [B.crusherInstall + i * 3, B.crusherInstall + 16 + i * 3]), 1.2);
  let y = lerp(CRUSHER_HIDDEN, CRUSHER_REST, drop);
  const d = f - B.swat;
  if (d >= -3 && d < 0) y = lerp(CRUSHER_REST, CRUSHER_REST + 0.25, (d + 3) / 3); // a hitch up, then it lets go
  else if (d >= 0 && d < 3) y = lerp(CRUSHER_REST + 0.25, CRUSHER_SLAM_Y, d / 3);
  else if (d >= 3 && d < 10) y = CRUSHER_SLAM_Y;
  else if (d >= 10) y = lerp(CRUSHER_SLAM_Y, CRUSHER_REST, easeInOut(progress(d, [10, 34])));
  return y;
}
const IMPULSES = [...PARTY.map((m) => FLIGHT_START + m.flightFrames), PIPE_LIP_FRAME + 6];
function cubeWobble(f) {
  let wv = 0;
  if (f >= B.cubeSpawn) wv += 0.12 * Math.sin((f - B.cubeSpawn) * 0.6) * Math.exp(-(f - B.cubeSpawn) / 10);
  for (const at of IMPULSES) if (f >= at) wv += 0.07 * Math.sin((f - at) * 0.7) * Math.exp(-(f - at) / 8);
  return wv + 0.008 * Math.sin(f * 0.11);
}
function wireAt(f) {
  if (f >= WIRE_RETIRE) return { set: false };
  const ev = [...WIRE_EVENTS].reverse().find((e) => f >= e.set);
  if (!ev) return { set: false };
  return { set: true, cutAge: f >= ev.cut ? f - ev.cut : -1 };
}
const d2 = boulderById("d2");
const D2_HIT = boulderState(d2, B.smash - 1).position;

export function propsAt(f) {
  const balls = BOULDERS.map((b) => ({ b, st: boulderState(b, f) })).filter((x) => x.st.visible);
  const pour = f >= B.slimePour[0] && f < B.slimePour[1] + 6 ? Math.min(1, (f - B.slimePour[0]) / 4) * (f > B.slimePour[1] ? 1 - (f - B.slimePour[1]) / 6 : 1) : 0;
  return {
    clock: f,
    boulders: balls.map(({ b, st }) => ({ kind: b.kind, r: b.r, position: st.position, angle: st.angle })),
    charge: magnetCharge(f),
    gate: gateOpenAmount(f),
    wire: wireAt(f),
    spout: f < B.slimePour[0] - 20 ? 0 : f < B.slimeGone ? easeOutBack(progress(f, [B.slimePour[0] - 20, B.slimePour[0] - 6])) : 1 - progress(f, [B.slimeGone, B.slimeGone + 14]),
    pour,
    slime: f < B.slimePour[0] + 2 ? 0 : f < B.slimeGone ? easeOutCubic(progress(f, [B.slimePour[0] + 2, B.slimePour[1] + 4])) : 1 - easeInOut(progress(f, [B.slimeGone, B.slimeGone + 24])),
    magnet: f < B.magnetInstall ? 0 : easeOutBack(progress(f, [B.magnetInstall, B.magnetInstall + 14])),
    coil: f < B.magnetInstall ? 0 : Math.max(0.15 * (1 - progress(f, [B.magnetInstall + 14, B.magnetInstall + 40])),
      f >= B.paladin3Brace && f < B.skewer + 18 ? (f < B.yank ? 0.35 + 0.15 * Math.sin(f * 0.8) : 1 - Math.max(0, f - B.skewer) / 18) : 0),
    crusherY: CRUSHER_XS.map((_, i) => crusherY(f, i)),
    gears: f < B.gearsStart ? 0 : (Math.min(f, B.swat) - B.gearsStart) * 0.16,
    pipe: easeInOut(progress(f, B.curve)),
    door: Math.pow(progress(f, [B.doorDrop, B.doorSlam]), 2),
    doorLamp: f >= B.doorDrop - 10 && f < B.doorSlam + 40 ? (Math.floor((f - B.doorDrop) / 5) % 2 ? 0.2 : 1) : 0,
    cube: f < B.cubeSpawn ? 0 : easeOutBack(progress(f, [B.cubeSpawn, B.cubeSpawn + 12]), 1.4),
    cubeWobble: f < B.cubeSpawn ? 0 : cubeWobble(f),
    auras: f >= B.levitate && f < B.swat ? ["mage", "rogue"].map((who) => {
      const a = floater(who, f);
      return { position: [FLOAT_X[who], (a ? a.position[1] : 0) + 0.04, Z], on: clamp01((f - B.levitate) / 10) * (f > B.swat - 4 ? (B.swat - f) / 4 : 1) };
    }) : [],
    shards: f >= B.smash && f < B.smash + 70 ? { age: f - B.smash, position: D2_HIT } : null,
  };
}

// --- camera ----------------------------------------------------------------------------------
// Shots are { pos, look, fov } in Ep2's frame. KEYS: [frame, shot, cut?]; between two keys the
// camera glides (eased) unless the second is a cut, which holds the first and snaps on its frame.
// A shot may be a function of the frame (follows). Crash zooms snap the lens in over 5 frames.
const shot = (pos, look, fov = 50) => ({ pos, look, fov });
const LEDGE = shot([0.4, 2.3, Z + 0.75], [10.2, 3.5, Z], 46);                  // reverse angle: the ramp, the gate, the ledge
const WIDE = (x, y = 0.9, back = 6.2, h = 4.2, fov = 50) => shot([x + back, h, Z - 0.95], [x - 0.6, y, Z], fov); // high three-quarter from up the hall
const POV = shot([11.85, 5.6, Z - 0.3], [-1.5, 0.4, Z], 44);                   // over the waiting ball, down the hall
const crash = (target, from, d, zoom = 1.3) => (f0) => (f) => {
  const dir = from.map((v, i) => v - target[i]), n = Math.hypot(...dir);
  const snap = 1 - Math.pow(1 - clamp01((f - f0) / 5), 3);
  return { pos: target.map((v, i) => v + (dir[i] / n) * d), look: target, fov: lerp(50, 50 / zoom, snap) };
};
const face = (x, h = 1.45) => [x, h, Z];
const UP_HALL = (x) => [x + 6, 2.2, Z - 1.1];  // crash zooms come in from up the hall, about eye level
const follow = (id, back = 5.4, h = 3.6) => (f) => {
  const b = boulderById(id);
  const p = boulderState(b, Math.max(f, b.release)).position;
  const x = Math.max(p[0], -3.2); // stop short of the doorway (and the corpses) and let it roll out
  return { pos: [x + back, Math.max(h, p[1] + 2.4), Z - 0.8], look: [x - 1.2, Math.max(0.8, p[1] * 0.7), Z], fov: 50 };
};
const b2 = boulderById("b2"), s2 = boulderById("s2"), b4 = boulderById("b4");

const KEYS = [
  // level 1
  [0, LEDGE], [B.wireSet - 30, shot([1.2, 2.4, Z + 0.7], [10.2, 3.4, Z], 46)],
  [B.wireSet - 2, shot([WIRE_X + 3.2, 1.25, Z - 1.0], [WIRE_X - 3.0, 0.55, Z], 48), true],         // the wire is strung; the goblin far off
  [B.wireSet + 30, POV, true], [B.goblinTrip - 26, POV],                                            // the goblin walks in, the ball waits
  [B.goblinTrip - 24, WIDE(WIRE_X, 0.6, 5.2, 2.9), true], [B.goblinTrip + 20, WIDE(WIRE_X, 0.5, 5.0, 2.8)],
  [B.goblinHit - 16, crash(face(GOBLIN_HIT_X, 0.95), UP_HALL(GOBLIN_HIT_X), 2.6, 1.3)(B.goblinHit - 16), true],
  [B.goblinHit - 3, WIDE(GOBLIN_HIT_X, 0.5, 5.2, 3.4), true],
  [B.goblinHit + 16, follow("b1"), false], [ROGUE_ENTER[0] - 4, follow("b1")],
  [ROGUE_ENTER[0] + 2, WIDE(ROGUE_SNAP_X, 0.8, 5.4, 3.3), true], [ROGUE_ENTER[1] + 6, WIDE(ROGUE_SNAP_X, 0.8, 4.6, 3.0)],
  [ROGUE_ENTER[1] + 8, crash(face(ROGUE_SNAP_X, 1.5), UP_HALL(ROGUE_SNAP_X), 2.4, 1.25)(ROGUE_ENTER[1] + 8), true],
  [B.rogue1Snap - 10, WIDE(ROGUE_SNAP_X, 0.6, 3.8, 2.4), true],
  [B.rogue1Snap + 18, shot([5.2, 2.5, Z - 1.0], [-2.6, 2.0, Z], 52), true], [B.rogue1Leap[1] + 6, shot([4.8, 2.4, Z - 1.0], [-2.4, 1.6, Z], 52)],
  [B.rogue1Leap[1] + 8, crash(face(ROGUE1_LEAP_X[1], 1.5), UP_HALL(ROGUE1_LEAP_X[1]), 3.0, 1.15)(B.rogue1Leap[1] + 8), true],
  // level 2
  [lineStart("l2a") + 2, LEDGE, true], [d1.spawn + 34, shot([2.4, 3.3, Z + 0.6], [10.2, 3.0, Z], 50)],
  [B.slimePour[0] - 24, shot([1.4, 3.6, Z + 1.15], [-3.6, 0.8, Z - 0.3], 50), true], [B.slimePour[1] + 10, shot([1.2, 3.5, Z + 1.15], [-3.4, 0.5, Z - 0.3], 50)],
  [B.rogue2Snap - 30, WIDE(-3.0, 0.5, 5.6, 3.7), true], [B.rogue2Hit + 6, WIDE(-3.4, 0.4, 5.8, 3.8)],
  [B.rogue2Hit + 8, follow("d1", 5.8, 3.8), false], [Math.round(frameAtX(d1, -8)), follow("d1", 5.8, 3.8)],
  [d2.spawn - 4, LEDGE, true], [Math.min(d2.spawn + 22, PALADIN_ENTER + 4), LEDGE],
  [PALADIN_ENTER + 6, WIDE(-6.0, 0.9, 6.0, 3.6), true], [B.paladinStomp - 4, WIDE(-2.6, 0.9, 5.4, 3.4)],
  [B.paladinBrace - 2, shot([-5.4, 1.6, Z + 1.05], [1.8, 1.3, Z], 52), true], [B.smash + 18, shot([-5.6, 1.7, Z + 1.05], [0.8, 1.4, Z], 54)],
  [B.smash + 20, crash(face(PALADIN_X, 1.55), UP_HALL(PALADIN_X), 3.0, 1.15)(B.smash + 20), true],
  // level 3
  [lineStart("l3a") + 4, LEDGE, true], [s1.spawn + 40, shot([2.6, 3.3, Z + 0.6], [10.2, 3.0, Z], 50)],
  [B.magnetInstall - 22, shot([MAGNET_X + 3.4, 2.6, Z - 1.0], [MAGNET_X - 0.8, 0.5, Z], 50), true], [B.magnetInstall + 34, shot([MAGNET_X + 3.8, 2.8, Z - 1.0], [MAGNET_X - 1.2, 0.8, Z], 50)],
  [B.paladin3Brace - 24, WIDE(-0.9, 0.9, 5.2, 3.6), true], [B.skewer + 4, WIDE(-0.6, 1.0, 5.6, 3.8)],
  [B.skewer + 6, follow("s1", 5.4, 3.8), false], [Math.round(frameAtX(s1, -8)), follow("s1", 5.4, 3.8)],
  [FLOATER_ENTER + 10, WIDE(-1.6, 1.0, 5.4, 3.5), true], [B.cast - 6, WIDE(-1.6, 1.0, 5.0, 3.3)],
  [B.cast - 4, crash(face(FLOAT_X.mage, 1.45), [FLOAT_X.mage + 4, 2.0, Z + 1.4], 2.6, 1.2)(B.cast - 4), true],
  [B.levitate + 8, WIDE(-1.6, 1.4, 5.6, 3.6), true], [B.float[1], shot([4.4, 1.5, Z - 1.0], [-1.6, 2.5, Z], 56)], [s2.release + 20, shot([4.6, 1.4, Z - 1.0], [-1.6, 2.2, Z], 56)], [B.underneath + 14, shot([4.6, 1.4, Z - 1.0], [-1.6, 2.2, Z], 56)],
  // level 4
  [B.crusherInstall - 10, shot([4.6, 2.9, Z - 1.1], [-1.6, 4.8, Z], 56), true], [B.gearsStart + 10, shot([4.2, 3.0, Z - 1.1], [-1.6, 4.4, Z], 56)],
  [boulderById("b3").spawn - 6, LEDGE, true], [boulderById("b3").spawn + 24, LEDGE],
  [B.swat - 26, WIDE(-1.5, 2.2, 6.0, 4.0, 54), true], [B.swat + 4, WIDE(-1.5, 1.8, 6.0, 3.9, 54)], [B.hitMage4 + 8, WIDE(-1.5, 0.4, 5.6, 3.6)],
  [B.hitMage4 + 10, follow("b3", 5.6, 3.6), false], [PARTY_ENTER - 4, follow("b3", 5.6, 3.6)],
  // level 5
  [PARTY_ENTER, WIDE(-6.6, 1.0, 6.4, 3.4), true], [B.turn + 6, WIDE(-6.0, 1.0, 6.0, 3.2)],
  [B.run + 4, shot([0.6, 3.0, Z - 0.9], [-9.4, 1.3, Z], 50)], [B.doorSlam + 14, shot([-0.6, 2.9, Z - 0.9], [-9.6, 1.5, Z], 48)],
  [B.doorSlam + 40, shot([0.0, 3.0, Z - 1.0], [-7.6, 1.3, Z], 52)], [B.curve[0] - 4, shot([-0.4, 2.8, Z - 1.0], [-7.6, 1.2, Z], 52)],
  [B.curve[0] + 6, shot([-2.2, 3.6, Z + 1.0], [-8.6, 1.0, Z], 56)], [Math.min(B.cubeSpawn + 20, b4.release - 15), shot([-2.4, 3.5, Z + 1.0], [-8.4, 1.6, Z], 58)],
  [b4.release - 14, shot([3.0, 3.4, Z + 0.7], [10.2, 3.0, Z], 48), true], [b4.release + 10, shot([3.0, 3.4, Z + 0.7], [10.2, 3.0, Z], 48)],
  [b4.release + 12, shot([-0.8, 2.4, Z - 1.0], [-7.6, 1.4, Z], 56), true], [B.launch - 2, shot([-1.4, 2.2, Z - 1.0], [-8.0, 1.8, Z], 58)],
  [B.launch, shot([-1.6, 2.4, Z - 1.1], [-8.0, 3.4, Z], 60), true], [FLIGHT_END + 10, shot([-2.4, 2.8, Z - 1.0], [-8.2, 4.0, Z], 54)],
  [B.dissolve + 40, shot([-3.4, 3.2, Z - 0.9], [-8.2, 4.2, Z], 48)], [lineStart("l5c"), shot([-1.6, 2.6, Z - 1.0], [-7.8, 3.0, Z], 58)],
  [FRAMES, shot([-1.0, 2.7, Z - 1.0], [-7.8, 3.0, Z], 60)],
];
for (let i = 1; i < KEYS.length; i++) if (KEYS[i][0] < KEYS[i - 1][0]) throw new Error(`camera key ${i} (frame ${KEYS[i][0]}) is before the one before it`);

const evalShot = (s, f) => (typeof s === "function" ? s(f) : s);
function camAt(f) {
  let i = KEYS.findIndex((k) => k[0] > f);
  if (i < 0) return evalShot(KEYS[KEYS.length - 1][1], f);
  if (i === 0) return evalShot(KEYS[0][1], f);
  const [f0, s0] = KEYS[i - 1], [f1, s1x, cut] = KEYS[i];
  const a = evalShot(s0, f);
  if (cut) return a;
  const b = evalShot(s1x, f), t = easeInOut(clamp01((f - f0) / (f1 - f0)));
  return { pos: a.pos.map((v, k) => lerp(v, b.pos[k], t)), look: a.look.map((v, k) => lerp(v, b.look[k], t)), fov: lerp(a.fov, b.fov, t) };
}

// contact hits: a dip and a decaying rattle (Ep2's config, plus each ball's floor impact)
const SHAKES = [
  ...BOULDERS.filter((b) => b.mode !== "shatter").map((b) => ({ at: Math.round(footFrame(b)), strength: b.kind === "drum" ? 0.14 : 0.1 })),
  ...BOULDERS.map((b) => ({ at: b.spawn + 10, strength: 0.06 })),
  { at: B.goblinHit, strength: 0.18 }, { at: B.rogue2Hit, strength: 0.2 }, { at: B.smash, strength: 0.34 },
  { at: B.yank, strength: 0.14 }, { at: B.skewer, strength: 0.24 }, { at: B.swat, strength: 0.28 }, { at: B.hitRogue4, strength: 0.16 },
  { at: B.doorSlam, strength: 0.3 }, { at: B.launch, strength: 0.32 }, { at: B.stamp, strength: 0.22 }, { at: B.dare + 4, strength: 0.12 }, { at: B.play + 3, strength: 0.08 },
];
function shake(f) {
  let x = 0, y = 0;
  for (const s of SHAKES) {
    const d = f - s.at;
    if (d < 0 || d > 14) continue;
    const e = s.strength * Math.exp(-d / 4);
    x += e * 0.12 * Math.sin(d * 2.3);
    y += e * 0.12 * (Math.cos(d * 1.9) - (d < 2 ? 1 : 0));
  }
  return [x, y];
}

// Each rig returns { pos, look, fov } in the lab's world.
export const CAMS = {
  threeq: (f) => {
    const c = camAt(f);
    const [sx, sy] = shake(f);
    const pos = toLab(c.pos), look = toLab(c.look);
    return { pos: [pos[0] + sx, pos[1] + sy, pos[2]], look, fov: c.fov };
  },
};

// --- sound (Ep2's procedural + AI-picked SFX, public/episodes/rolling-boulder/sfx) -------------------
export const STAGES = [
  { name: "TRIPWIRE BOULDER", color: "#ff9a3d" },
  { name: "HALL-WIDE BOULDER + SLIME", color: "#7dff5a" },
  { name: "SPIKED IRON + ELECTROMAGNET", color: "#4dc4ff" },
  { name: "CEILING CRUSHERS", color: "#ffba42" },
  { name: "BLAST DOOR + HALF-PIPE", color: "#ff5d8f" },
].map((s, i) => ({ ...s, n: i + 1, at: STAGE_STARTS[i] }));

const rollEnd = (b) => (b.mode === "shatter" ? b.end : b.mode === "pipe" ? Math.round(PIPE_LIP_FRAME) : Math.round(frameAtX(b, -13)));
const boulderSfx = (b) => {
  const vol = b.kind === "drum" ? 0.35 : b.kind === "spiked" ? 0.32 : 0.28;
  return [
    ["thud", b.spawn + 10, 0.3],
    ["gate", b.release - 2, 0.35],
    ["thud", Math.round(footFrame(b)), 0.45],
    ["roll", b.release + 2, vol, Math.max(8, rollEnd(b) - b.release - 2)],
  ];
};
export const SFX = [
  ["stamp", 6, 0.4],
  ...STAGE_STARTS.map((f) => ["pop", f, 0.11]),
  ...[].concat(...BOULDERS.map(boulderSfx)),
  // level 1
  ["twang", B.wireSet, 0.3], ["snap", B.goblinTrip, 0.45], ["thud", B.goblinTrip + 12, 0.35], ["squash", B.goblinHit, 0.5],
  ["snap", B.rogue1Snap, 0.45], ["whoosh", B.rogue1Leap[0], 0.35], ["thud", B.rogue1Leap[1], 0.35],
  // level 2
  ["hydraulic", B.slimePour[0] - 6, 0.35], ["squelch", B.slimePour[0] + 8, 0.4], ["snap", B.rogue2Snap, 0.45],
  ["slip", B.rogue2Slip, 0.45], ["squelch", B.rogue2Slip + 18, 0.35], ["squash", B.rogue2Hit, 0.5],
  ["thud", B.paladinStomp, 0.45], ["clank", B.paladinStomp, 0.35], ["whoosh", B.paladinBrace, 0.35], ["crack", B.smash, 0.55], ["boom", B.smash, 0.35],
  // level 3
  ["clank", B.magnetInstall, 0.38], ["hydraulic", B.magnetInstall + 4, 0.3], ["zap", B.paladin3Brace + 6, 0.25], ["zap", B.yank, 0.42],
  ["whoosh", B.yank + 2, 0.35], ["clang", B.yank + 10, 0.35], ["skewer", B.skewer, 0.5], ["clang", B.skewer, 0.35],
  ["levitate", B.levitate, 0.4], ["sparkle", B.float[0], 0.1],
  // level 4
  ["chain", B.crusherInstall, 0.35], ["clank", B.crusherInstall + 12, 0.35], ["gears", B.gearsStart, 0.28, B.swat - B.gearsStart],
  ["ratchet", B.swat - 30, 0.25, 30], ["slam", B.swat, 0.55], ["clang", B.swat + 1, 0.35], ["thud", B.swat + 9, 0.35],
  ["squash", B.hitRogue4, 0.45], ["squash", B.hitMage4, 0.45],
  // level 5
  ["hydraulic", B.doorDrop, 0.35], ["slam", B.doorSlam, 0.55], ["boom", B.doorSlam, 0.3], ["helmet", B.doorSlam + 2, 0.4],
  ["ramp", B.curve[0], 0.4], ["rumble", B.curve[0], 0.35], ["jelly", B.cubeSpawn, 0.4], ["launch", B.launch, 0.5],
  ["whoosh_big", B.launch + 6, 0.35], ["jelly", FLIGHT_START + 12, 0.45], ["squelch", FLIGHT_START + 16, 0.35],
  ["sizzle", B.dissolve, 0.35], ["bubble", B.dissolve + 20, 0.3], ["stamp", B.stamp, 0.6], ["boom", B.stamp, 0.35],
  // the hook: the stamp cracks on "unless", splits on "prove"; the game card pops on "check"
  ["crack", B.crack, 0.45], ["crumble", B.dare, 0.4, undefined, "dungeon-trap-v2"], ["stamp", B.dare + 4, 0.55],
  ["pop", B.play, 0.3], ["stamp", B.play + 3, 0.45],
].map(([name, at, vol, dur, ep]) => ({ name, at, vol, dur, ep }));

// --- bursts (fx.js): every contact gets one, keyed to the same beat as its SFX ------------------
const P = (x, y, z = Z) => toLab([x, y, z]);
const ACROSS = (x, y, n, kind = "dust", extra = {}) => ({ kind, pos: P(x, y), box: [HW * 0.8, 0, 0.12], n, ...extra });
const raw = [
  ...BOULDERS.map((b) => ({ kind: "dust", at: b.spawn + 10, pos: P(EDGE_X + b.r + 0.1, LEDGE_Y + 0.05), box: [HW * 0.7, 0, 0.4], n: 30 })),
  ...BOULDERS.filter((b) => b.mode !== "shatter").map((b) => ({ ...ACROSS(EDGE_X - LEDGE_Y - 0.4, 0.05, 40), at: Math.round(footFrame(b)) })),
  // level 1
  { kind: "sparks", at: B.goblinTrip, pos: P(WIRE_X, 0.3), n: 14 },
  { kind: "dust", at: B.goblinTrip + 12, pos: P(WIRE_X + 0.6, 0.05), n: 14, size: 0.6 },
  { ...ACROSS(GOBLIN_HIT_X, 0.15, 40), at: B.goblinHit, size: 1.1 },
  { kind: "sparks", at: B.rogue1Snap, pos: P(WIRE_X, 0.3), n: 14 },
  { kind: "dust", at: B.rogue1Leap[0], pos: P(ROGUE1_LEAP_X[0], 0.02), n: 10, size: 0.6 },
  { kind: "dust", at: B.rogue1Leap[1], pos: P(ROGUE1_LEAP_X[1], 0.02), n: 14, size: 0.7 },
  // level 2
  { kind: "dust", at: B.slimePour[0] + 8, pos: P(SLIME_SPOUT_X, 0.05), n: 24, tint: "slime" },
  { kind: "sparks", at: B.rogue2Snap, pos: P(WIRE_X, 0.3), n: 14 },
  { kind: "dust", at: B.rogue2Slip, pos: P(SLIP_START_X, 0.05), n: 20, tint: "slime" },
  { kind: "dust", at: B.rogue2Slip + 18, pos: P(ROGUE2_LIE_X, 0.05), n: 26, tint: "slime" },
  { ...ACROSS(ROGUE2_LIE_X, 0.1, 40, "dust", { tint: "slime" }), at: B.rogue2Hit, size: 1.2 },
  ...[0, 1, 2, 3].map((i) => {
    const at = Math.round(lerp(STOMP_START, B.paladinStomp, (i + 0.5) / 4));
    const x = lerp(SLIME_RANGE[0] - 0.6, PALADIN_X, progress(at, [STOMP_START, B.paladinStomp]));
    return x > SLIME_RANGE[0] && x < SLIME_RANGE[1] ? { kind: "dust", at, pos: P(x, 0.05), n: 14, size: 0.7, tint: "slime" } : null;
  }),
  { kind: "sparks", at: B.paladinStomp, pos: P(WIRE_X, 0.3), n: 14 },
  { kind: "sparks", at: B.smash, pos: P(D2_HIT[0] - d2.r, D2_HIT[1]), box: [HW * 0.6, 0.4, 0.1], n: 80 },
  { kind: "dust", at: B.smash, pos: P(D2_HIT[0] - 0.4, 0.4), box: [HW * 0.8, 0.6, 0.6], n: 70, size: 1.4 },
  // level 3
  { kind: "dust", at: B.magnetInstall + 4, pos: P(MAGNET_X, 0.05), box: [0.6, 0, 0.6], n: 26 },
  { kind: "sparks", at: B.yank, pos: P(PALADIN_YANK_X, 0.4), n: 40, tint: "arc" },
  { kind: "glints", at: B.paladin3Brace, end: B.skewer + 10, pos: P(MAGNET_X, 0.25), box: [0.7, 0.15, 0.7], n: 20, tint: "arc" },
  { kind: "sparks", at: B.skewer, pos: P(PALADIN_YANK_X + 0.3, 1.0), n: 60 },
  { kind: "dust", at: B.skewer, pos: P(PALADIN_YANK_X, 0.3), n: 30, size: 1.1 },
  { kind: "glints", at: B.levitate, end: B.swat, pos: P(FLOAT_X.mage, 1.2), box: [0.4, 0.9, 0.4], n: 24, tint: "ice" },
  { kind: "glints", at: B.levitate + 4, end: B.swat, pos: P(FLOAT_X.rogue, 1.2), box: [0.4, 0.9, 0.4], n: 20, tint: "ice" },
  { kind: "dust", at: Math.round(B.underneath - 6), pos: P(-1.5, 0.05), box: [0.2, 0, HW * 0.7], n: 24 },
  // level 4
  ...CRUSHER_XS.map((x) => ({ kind: "dust", at: B.crusherInstall + 12, pos: P(x, CEILING_Y - 0.4), box: [0.5, 0, HW * 0.7], n: 26, size: 0.8 })),
  ...CRUSHER_XS.map((x) => ({ kind: "sparks", at: B.swat, pos: P(x, CRUSHER_SLAM_Y), box: [0.4, 0, HW * 0.6], n: 40 })),
  ...CRUSHER_XS.map((x) => ({ kind: "dust", at: B.swat + FALL_FRAMES, pos: P(x, 0.05), n: 20 })),
  { ...ACROSS(FLOAT_X.rogue, 0.1, 30), at: B.hitRogue4 },
  { ...ACROSS(FLOAT_X.mage, 0.1, 30), at: B.hitMage4 },
  // level 5
  { ...ACROSS(WALL_END_X + 0.3, 0.05, 50), at: B.doorSlam, size: 1.3 },
  { kind: "sparks", at: B.doorSlam + 2, pos: P(WALL_END_X + 0.5, 1.6), n: 20 },
  ...[0, 1, 2, 3].map((i) => ({ ...ACROSS(PIPE_CENTER[0] - 0.6 - i * 0.6, 0.1 + i * 0.35, 20), at: Math.round(B.curve[0] + i * 8), size: 0.7 })),
  { kind: "glints", at: B.cubeSpawn, end: B.cubeSpawn + 30, pos: P(CUBE_CENTER[0], CUBE_CENTER[1] - 1.2), box: [1.4, 0.3, 1.2], n: 30, tint: "jelly" },
  { ...ACROSS(PIPE_CENTER[0] - 1.6, PIPE_CENTER[1], 40), at: B.launch, size: 1.2 },
  ...PARTY.map((m) => ({ kind: "dust", at: FLIGHT_START + m.flightFrames, pos: P(...m.target), n: 16, tint: "slime" })),
  ...PARTY.map((m) => ({ kind: "glints", at: B.dissolve, end: B.dissolve + 50, pos: P(...m.target), box: [0.4, 0.5, 0.4], n: 14, tint: "jelly" })),
].filter(Boolean);
export const BURSTS = raw;

// --- captions + badges (hud.js) -----------------------------------------------------------------
const chunks = [];
for (const id of LINES) {
  const words = cues.lines[id].words;
  for (let i = 0; i < words.length;) {
    let n = Math.min(5, words.length - i);
    if (words.length - i - n === 1) n = 4; // no one-word tails
    chunks.push({ words: words.slice(i, i + n), end: (words[i + n] ?? { startFrame: cues.lines[id].endFrame + 8 }).startFrame });
    i += n;
  }
}
export const HUD_TEXT = { kicker: "EVOLUTION OF A", titleText: "BOULDER HALLWAY", status: "HALLWAY STATUS" };
export function hudAt(f) {
  const c = chunks.find((k) => f >= k.words[0].startFrame && f < k.end);
  const stage = [...STAGES].reverse().find((s) => f >= s.at);
  return {
    ...HUD_TEXT,
    title: f < 82,
    titleFrame: f,
    stage: stage ? { ...stage, pop: f - stage.at } : null,
    caption: c ? c.words.map((x) => ({ word: x.word, on: f >= x.startFrame })) : null,
    end: f >= B.stamp ? { age: f - B.stamp, crack: f >= B.crack ? f - B.crack : -1, dare: f >= B.dare ? f - B.dare : -1, play: f >= B.play ? f - B.play : -1 } : null,
  };
}
export const LIGHTS_NEAR = (f) => camAt(f).look[0]; // where the action is (for per-frame shadow updates)
export { w };
