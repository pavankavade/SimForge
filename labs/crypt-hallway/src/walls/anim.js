// Film: "Evolution of a Crushing Room", the lab's re-make of Ep3 (src/episodes/crushing-walls), voiced
// by voice-walls.py. Beats and kinematics come from timeline.js; this module says what the cast, the
// props, the camera, the sound and the bursts do at every frame. Pure functions of the frame (30 fps).
//
// The cold open: the first 108 frames play moments of the finale (the room lunging down the hall and
// swallowing the party, the squeeze, the Mimic's chomp) under the hook line, then the story runs from
// the empty room. storyFrame(f) maps a film frame to the frame the world is evaluated at; captions,
// badges and the narration run on film frames.
//   l1  the goblin grabs the coin; the walls grind in and slam (pancake)
//   l2  a rogue wall-runs out of the vent / greased plates + a boot in the vent punt the next one down
//   l3  a paladin wedges a beam / hydraulic presses + electrified walls fry him and fold him into a cube
//   l4  a mage blinks out / magic mirrors bounce his spell back until the walls meet
//   l5  a party pokes from the hallway / the room on rails lunges, swallows them, fires them to the Mimic
import { HIP, lieHeight } from "../../../../src/kit/actors";
import {
  BEATS, FPS, DURATION, LINES, cues, STAGE_STARTS, HW, WALL_Z, ROOM_H, FRONT_Z, BACK_Z, DOOR_Z, PED, COIN_Y, GRAB_Z, VENT,
  HALF, LANES, PANCAKE, ENTRY_Z, MAGE_WAIT, PARTY, CUBE_SIZE, CUBE_REST, ORB_Y, BEAM_Y, MIMIC_ROOM, MIMIC_MOUTH, CHUTE_EXIT,
  GOBLIN_RUN, ROGUE1_RUN, ROGUE2_RUN, PALADIN_RUN, PALADIN_Z, MAGE_RUN, MAGE_BACK, PARTY_WALK, KICKS, CLIMB_TOP, POLE_TAPS,
  roomDZ, roomZ, wallInner, wallShudder, pedestalSink, wallRun, beamState, orbX, BOUNCES, PONG_BEEPS, poleTip, POLE_HAND,
  partyFlight, lairFlight, clamp01, easeInOut, easeOutCubic, easeInCubic, easeOutBack, lerp, progress, arc, w, lineStart,
} from "./timeline.js";

export { FPS, LINES };
export const FRAMES = DURATION;
export const NARRATION_END = FRAMES;
const B = BEATS;
const CAM = 0;                // facing the camera (+z)
const IN = Math.PI;           // facing into the room (-z)
const R90 = Math.PI / 2;

// --- the cold open ------------------------------------------------------------------------------------
// [film from, film to, story frame at `from`]
export const HOOK = [
  [0, 46, B.lunge - 32],
  [46, 72, B.swallow - 4],
  [72, 108, B.chomp - 32],
];
export const storyFrame = (f) => {
  for (const [a, b, s] of HOOK) if (f >= a && f < b) return s + (f - a);
  return f;
};

// --- bodies: the squeeze, the wafer, the flop, the pancake --------------------------------------------
const SCALE = { goblin: 0.82, rogue: 1, mage: 1, paladin: 1.06 };
const heightOf = (cls) => 1.64 * 1.12 * SCALE[cls];
/** Squeezed between the walls: the body's width follows the gap, never thinner than a wafer. */
const squeezeOf = (cls, f) => Math.max(0.1, Math.min(1, wallInner(f) / HALF[cls]));
/**
 * A crushed victim from the slam on: squeezed at x0 (room-relative) facing the camera, then (after the
 * walls reopen) a wobbling wafer that flops onto its back into its lane, flat for good.
 */
function crushed(cls, f, { x0 = 0, z0 = GRAB_Z, flopAt, lane, stackY = 0, shutAt }) {
  const dz = roomDZ(f);
  if (f < flopAt) {
    const wob = Math.sin((f - flopAt) * 0.9) * 0.08 * clamp01((flopAt - f) / 14);
    return { pose: "idle", position: [x0, 0, z0 + dz], yaw: CAM, wsx: squeezeOf(cls, Math.min(f, shutAt)), tilt: wob, pivot: 0.05, expression: "dead", blend: 0 };
  }
  const t = progress(f, [flopAt, flopAt + 6]);
  const e = easeInCubic(t);
  const lieY = lieHeight(cls) - HIP + stackY;
  const settle = t >= 1 ? 0.06 * Math.sin(Math.PI * clamp01((f - flopAt - 6) / 6)) : 0;
  return {
    pose: "sprawl", position: [lerp(x0, lane[0], e), lerp(0, lieY, e) + settle, lerp(z0, lane[1], e) + dz],
    yaw: R90, turn: -R90, tilt: R90 * e, pivot: HIP, wsx: lerp(0.12, 1, e), squash: lerp(1, PANCAKE, e), expression: "dead", blend: 0,
  };
}
const walkIn = (f, win, toZ, x = 0) => [x, 0, lerp(ENTRY_Z, toZ, progress(f, win))];

// --- L1: the goblin -------------------------------------------------------------------------------
const SLAM1_CONTACT = (() => { for (let f = B.slam1 - 3; f < B.crush1; f++) if (wallInner(f) <= HALF.goblin) return f; return B.crush1; })();
function goblin(f) {
  if (f < GOBLIN_RUN[0]) return null;
  if (f < GOBLIN_RUN[1]) return { pose: "run", position: walkIn(f, GOBLIN_RUN, GRAB_Z), yaw: IN, speed: 1.9, expression: "happy" };
  if (f < B.goblinGrab - 4) return { pose: "idle", position: [0, 0, GRAB_Z], yaw: IN, expression: "happy" };
  if (f < B.goblinGrab + 2) return { pose: "point", position: [0, 0.04 * Math.sin(Math.PI * progress(f, [B.goblinGrab - 4, B.goblinGrab + 2])), GRAB_Z], yaw: IN, expression: "happy" }; // tiptoe reach
  if (f < B.grind) return { pose: "cheer", position: [0, 0, GRAB_Z], yaw: CAM, expression: "happy", speed: 1.5 }; // the prize, held high
  // double take: left wall, right wall, back to us
  if (f < B.grind + 10) return { pose: "idle", position: [0, 0, GRAB_Z], yaw: CAM - 0.8, expression: "neutral", blend: 4 };
  if (f < B.grind + 20) return { pose: "idle", position: [0, 0, GRAB_Z], yaw: CAM + 0.8, expression: "shock", blend: 3 };
  if (f < SLAM1_CONTACT - 14) return { pose: "idle", position: [0, 0, GRAB_Z], yaw: CAM, expression: "shock", blend: 3 };
  if (f < SLAM1_CONTACT) return { pose: "cower", position: [0, 0, GRAB_Z], yaw: CAM, expression: "scared" };
  return crushed("goblin", f, { flopAt: B.flop1, lane: LANES.goblin, shutAt: B.crush1 });
}

// --- L1 counter: the show-off rogue ------------------------------------------------------------------
const ROGUE1_PEEK = [B.slam2 + 24, B.slam2 + 46];
function rogue1(f) {
  if (f < ROGUE1_RUN[0]) return null;
  const flip = [B.rogue1Flip, B.rogue1Flip + 16];
  if (f < ROGUE1_RUN[1]) {
    const p = walkIn(f, ROGUE1_RUN, GRAB_Z);
    if (f >= flip[0] && f < flip[1]) { // an aerial cartwheel mid-sprint
      const t = progress(f, flip);
      return { pose: "jump", position: [p[0], arc(t, 0.75), p[2]], yaw: IN, tilt: -Math.PI * 2 * easeInOut(t), pivot: HIP, expression: "happy", blend: 3 };
    }
    return { pose: "run", position: p, yaw: IN, speed: 2.6, expression: "smug" };
  }
  if (f < B.rogue1Grab - 2) return { pose: "idle", position: [0, 0, GRAB_Z], yaw: IN, expression: "smug" };
  if (f < B.rogue1Grab + 4) return { pose: "point", position: [0, 0, GRAB_Z], yaw: IN, expression: "smug" };
  if (f < B.climb1[0] - 4) return { pose: "cheer", position: [0, 0, GRAB_Z], yaw: CAM, expression: "smug", speed: 1.3 };
  if (f < B.climb1[0]) return { pose: "cower", position: [0, 0, GRAB_Z], yaw: CAM, expression: "focus" }; // crouch, then go
  if (f < B.climb1[1]) {
    const r = wallRun(f, B.climb1);
    return { pose: "jump", position: [r.x, r.y, GRAB_Z], yaw: CAM - r.side * 0.5, tilt: r.side * 0.3, pivot: HIP, expression: "focus", blend: 3 };
  }
  if (f < B.ventIn + 4) { // the last hop, up into the vent
    const t = progress(f, [B.climb1[1], B.ventIn + 4]);
    return { pose: "hoist", position: [0, lerp(CLIMB_TOP, ROOM_H + 0.4, easeOutCubic(t)), GRAB_Z], yaw: CAM, expression: "happy", blend: 3 };
  }
  if (f < ROGUE1_PEEK[0] || f >= ROGUE1_PEEK[1]) return null;
  // hangs upside down out of the vent, coin in hand, grinning
  const t = progress(f, ROGUE1_PEEK);
  const drop = easeOutBack(clamp01(t * 4)) * (1 - easeInCubic(clamp01((t - 0.8) * 5)));
  const feetY = ROOM_H - 0.55 - (2 * HIP - heightOf("rogue")) + (1 - drop) * 1.2;
  return { pose: "cheer", position: [0, feetY, VENT.z], yaw: CAM, tilt: Math.PI, pivot: HIP, expression: "smug", blend: 0 };
}

// --- L2 victim: the next rogue -----------------------------------------------------------------------
const SLIPS2 = [[B.slip2, B.slip2 + 7, 0.45], [B.slip2 + 18, B.slip2 + 25, 0.3]];
const HANG = [B.climb2[1] + 4, B.punt];
const HANG_Y = ROOM_H - heightOf("rogue") - 0.12; // feet, hanging from the vent's rim
const LAND2_X = 0.1;
const CRUSH2_CONTACT = (() => { for (let f = B.crush2 - 5; f < B.crush2 + 2; f++) if (wallInner(f) <= HALF.rogue) return f; return B.crush2; })();
function rogue2(f) {
  if (f < ROGUE2_RUN[0]) return null;
  if (f < ROGUE2_RUN[1]) return { pose: "run", position: walkIn(f, ROGUE2_RUN, GRAB_Z), yaw: IN, speed: 2.6, expression: "smug" };
  if (f < B.rogue2Grab) return { pose: "point", position: [0, 0, GRAB_Z], yaw: IN, expression: "smug" };
  if (f < B.climb2[0] - 4) return { pose: "cheer", position: [0, 0, GRAB_Z], yaw: CAM, expression: "smug", speed: 1.2 };
  if (f < B.climb2[0]) return { pose: "cower", position: [0, 0, GRAB_Z], yaw: CAM, expression: "focus" };
  if (f < B.climb2[1]) {
    const r = wallRun(f, B.climb2, SLIPS2);
    const slipping = SLIPS2.some(([a, b]) => f >= a && f < b);
    return {
      pose: slipping ? "slip" : "jump", position: [r.x, r.y, GRAB_Z], yaw: CAM - r.side * 0.5, tilt: r.side * (slipping ? -0.25 : 0.3), pivot: HIP,
      expression: slipping ? "shock" : "focus", blend: 3,
    };
  }
  if (f < HANG[0]) { // the last scramble up to the vent rim
    const r = wallRun(B.climb2[1] - 1, B.climb2, SLIPS2);
    const t = progress(f, [B.climb2[1], HANG[0]]);
    return { pose: "hoist", position: [lerp(r.x, 0, t), lerp(r.y, HANG_Y, easeOutCubic(t)), GRAB_Z], yaw: CAM, expression: "focus", blend: 3 };
  }
  if (f < B.punt) { // hanging, smug... until he looks up
    const sway = 0.04 * Math.sin((f - HANG[0]) * 0.25);
    return { pose: "hoist", position: [sway, HANG_Y, GRAB_Z], yaw: CAM, tilt: sway * 0.5, pivot: heightOf("rogue"), expression: f < B.boot2 + 4 ? "smug" : "shock" };
  }
  if (f < B.land2) { // punted straight down
    const t = progress(f, [B.punt, B.land2]);
    return { pose: "fall", position: [lerp(0, LAND2_X, t), lerp(HANG_Y, 0, t * t), GRAB_Z], yaw: CAM, expression: "pain", blend: 2 };
  }
  if (f < B.land2 + 8) return { pose: "sprawl", position: [LAND2_X, lieHeight("rogue") - HIP, GRAB_Z], yaw: R90, turn: -R90, tilt: R90 * 0.9, pivot: HIP, expression: "dazed", blend: 3 };
  if (f < CRUSH2_CONTACT - 10) return { pose: "cower", position: [LAND2_X, 0, GRAB_Z], yaw: CAM, expression: "dazed" };
  if (f < CRUSH2_CONTACT) return { pose: "cower", position: [LAND2_X, 0, GRAB_Z], yaw: CAM, expression: "scared" };
  return crushed("rogue", f, { x0: LAND2_X, flopAt: B.flop2, lane: LANES.rogue2, shutAt: B.crush2 });
}

// --- L2 counter / L3 victim: the paladin and his beam ------------------------------------------------
const FRY = [B.circuit, B.fold];
const FOLD_HIDE = B.fold + 12;
function paladin(f) {
  if (f < PALADIN_RUN[0] || f >= FOLD_HIDE) return null;
  const at = [0, 0, PALADIN_Z];
  if (f < PALADIN_RUN[1]) return { pose: "walk", position: walkIn(f, PALADIN_RUN, PALADIN_Z), yaw: IN, speed: 1.6, expression: "focus", weapon: "none" };
  if (f < B.paladinGrab) return { pose: "point", position: at, yaw: IN, expression: "focus", weapon: "none" };
  if (f < B.wedge) return { pose: "idle", position: at, yaw: CAM, expression: "smug", weapon: "none" };
  if (f < B.stall + 16) return { pose: "hoist", position: at, yaw: CAM, expression: f < B.stall ? "focus" : "happy", weapon: "none" };
  if (f < B.smug) return { pose: "idle", position: at, yaw: CAM, expression: "smug", weapon: "none" };
  if (f < B.backOff) return { pose: "point", position: at, yaw: CAM + 0.15, expression: "smug", weapon: "none" }; // "you can't touch this"
  if (f < B.electrify) return { pose: "hoist", position: at, yaw: CAM, expression: f < B.pressL ? "shock" : "scared", weapon: "none" }; // grabs the beam again as the walls let go
  if (f < FRY[0]) return { pose: "hoist", position: at, yaw: CAM, expression: "scared", weapon: "none" };
  if (f < FRY[1]) { // fried: jittering, every few frames the skeleton shows through
    const j = 0.035 * Math.sin(f * 2.7);
    return { pose: "hoist", position: [j, 0.02 * Math.abs(Math.sin(f * 3.1)), PALADIN_Z], yaw: CAM, tilt: j, pivot: HIP, expression: f < B.fry ? "shock" : "dazed", speed: 3, weapon: "none" };
  }
  return { pose: "hoist", position: at, yaw: CAM, wsx: squeezeOf("paladin", f), expression: "dazed", weapon: "none" };
}
const xray = (f) => f >= FRY[0] && f < FRY[1] && Math.floor((f - FRY[0]) / 3) % 2 === 0;

// --- L3 counter / L4 victim: the mage ----------------------------------------------------------------
const CRUSH5_CONTACT = (() => { for (let f = B.crush5 - 4; f < B.crush5 + 2; f++) if (wallInner(f) <= HALF.mage) return f; return B.crush5; })();
function mage(f) {
  if (f < MAGE_RUN[0]) return null;
  if (f < MAGE_RUN[1]) return { pose: "walk", position: walkIn(f, MAGE_RUN, GRAB_Z), yaw: IN, speed: 1.1, expression: "neutral" };
  if (f < B.mageGrab + 2) return { pose: "point", position: [0, 0, GRAB_Z], yaw: IN, expression: "smug" };
  if (f < B.teleport) return { pose: "idle", position: [0, 0, GRAB_Z], yaw: CAM, expression: "smug" };
  if (f < B.blinkOut) return { pose: "cast", position: [0, 0, GRAB_Z], yaw: CAM, expression: "focus" };
  if (f < B.blinkIn) return null; // gone in a flash
  if (f < MAGE_BACK[0]) {
    const at = [MAGE_WAIT[0], 0, MAGE_WAIT[1]];
    if (f < B.slam4 + 4) return { pose: "idle", position: at, yaw: CAM, expression: "smug", blend: 0 };
    if (f < lineStart("l4b")) return { pose: "cheer", position: at, yaw: CAM, expression: "smug" };
    return { pose: "idle", position: at, yaw: IN + 0.3, expression: f < B.mirrors[2] ? "neutral" : "smug" }; // watches the mirrors go in, unimpressed
  }
  if (f < MAGE_BACK[1]) {
    const t = progress(f, MAGE_BACK);
    return { pose: "walk", position: [lerp(MAGE_WAIT[0], 0, t), 0, lerp(MAGE_WAIT[1], GRAB_Z, t)], yaw: IN, speed: 1.1, expression: "smug" };
  }
  if (f < B.mageBack + 4) return { pose: "point", position: [0, 0, GRAB_Z], yaw: IN, expression: "smug" };
  if (f < B.spell) return { pose: "idle", position: [0, 0, GRAB_Z], yaw: CAM, expression: "smug" };
  if (f < B.spell + 10) return { pose: "cast", position: [0, 0, GRAB_Z], yaw: CAM - 0.5, expression: "focus" };
  if (f < CRUSH5_CONTACT - 12) {
    const x = orbX(f);
    return { pose: "idle", position: [0, 0, GRAB_Z], yaw: CAM + x * 0.35, expression: f < B.pong ? "shock" : "scared" }; // follows the rally
  }
  if (f < CRUSH5_CONTACT) return { pose: "cower", position: [0, 0, GRAB_Z], yaw: CAM, expression: "scared" };
  return crushed("mage", f, { flopAt: B.flop5, lane: LANES.mage, stackY: 0.05, shutAt: B.crush5 + 1 });
}

// --- L5: the party --------------------------------------------------------------------------------
function partyMember(i, f) {
  const p = PARTY[i];
  const win = PARTY_WALK[i];
  if (f < win[0]) return null;
  const weapon = i === 0 ? "none" : undefined;
  if (f < win[1]) return { pose: "walk", position: [p.x, 0, lerp(ENTRY_Z, p.z, progress(f, win))], yaw: IN, speed: 1, expression: "focus", weapon };
  if (f < B.lunge) {
    const pos = [p.x, 0, p.z];
    if (i === 0 && f >= B.pokes - 10) return { pose: "point", position: pos, yaw: IN, expression: f >= B.lunge - 6 ? "shock" : "focus", weapon };
    if (i === 2 && f >= B.safety && f < B.safety + 30) return { pose: "cheer", position: pos, yaw: CAM, expression: "smug" }; // "totally safe"
    const look = f >= B.rails && f < B.railsLock + 10;
    return { pose: "idle", position: pos, yaw: IN + (look ? 0.4 * (i - 1) : 0), expression: f >= B.lunge - 6 ? "shock" : look ? "scared" : "neutral", weapon };
  }
  const fl = partyFlight(f, i);
  if (fl.phase === "gone") return null;
  if (fl.phase === "squeeze") {
    const sq = Math.max(0.3, Math.min(1, wallInner(f) / 0.62));
    if (f < B.lunge + 14) return { pose: "cower", position: fl.pos, yaw: IN, expression: "shock", weapon, blend: 3 }; // it came to them
    return { pose: f < B.swallow - 6 ? "cower" : "idle", position: fl.pos, yaw: CAM, wsx: sq, expression: f < B.swallow - 6 ? "scared" : "pain", weapon };
  }
  return { pose: "launch", position: fl.pos, yaw: CAM, wsx: 0.6, expression: "scared", weapon, blend: 2 };
}
function lairMember(i, f) {
  const fl = lairFlight(f, i);
  if (!fl || fl.done) return null;
  return { pose: "launch", position: [fl.pos[0], fl.pos[1] - HIP, fl.pos[2]], yaw: CAM + (i - 1) * 0.5, tilt: -fl.t * Math.PI * (1.2 + i * 0.2), pivot: HIP, expression: "scared", weapon: i === 0 ? "none" : undefined, blend: 0 };
}

// One track per character (frame -> Actor | null), eased by the kit's ActorView in cast.jsx.
export const TRACKS = [
  { id: "goblin", classType: "goblin", track: goblin },
  { id: "rogue1", classType: "rogue", track: rogue1 },
  { id: "rogue2", classType: "rogue", track: rogue2 },
  { id: "paladin", classType: "paladin", track: (f) => (xray(f) ? null : paladin(f)), weapon: "none" },
  { id: "mage", classType: "mage", track: mage },
  ...PARTY.map((m, i) => ({ id: `p-${m.cls}`, classType: m.cls, track: (f) => partyMember(i, f) })),
  ...PARTY.map((m, i) => ({ id: `l-${m.cls}`, classType: m.cls, track: (f) => lairMember(i, f) })),
];

export function extrasAt(f) {
  if (!xray(f)) return [];
  const a = paladin(f);
  return [{ kind: "skeleton", id: "pal-xray", variant: "paladin", position: a.position, yaw: CAM, scale: SCALE.paladin }];
}

// --- the coin ------------------------------------------------------------------------------------
// held overhead in "cheer" (the right hand: screen left for someone facing us), at the hand in "point"
const handOf = (a, cls) => {
  if (!a) return null;
  const s = 1.12 * SCALE[cls];
  const [x, y, z] = a.position;
  if (a.pose === "cheer") {
    if (Math.abs((a.tilt ?? 0) - Math.PI) < 0.1) return [x + 0.22 * s, y + 2 * HIP - 1.6 * s, z + 0.05]; // upside down
    return [x - 0.25 * s * Math.cos(a.yaw), y + 1.62 * s, z + 0.25 * s * Math.sin(a.yaw)];
  }
  if (a.pose === "point") return [x - 0.18 * s, y + 1.0 * s, z - 0.5 * s];
  return [x - 0.3 * s, y + 0.72 * s, z + 0.08];
};
const HOLDS = [
  { who: goblin, cls: "goblin", from: B.goblinGrab, to: SLAM1_CONTACT },
  { who: rogue1, cls: "rogue", from: B.rogue1Grab, to: B.climb1[0] - 4 },
  { who: rogue1, cls: "rogue", from: ROGUE1_PEEK[0], to: ROGUE1_PEEK[1] },
  { who: rogue2, cls: "rogue", from: B.rogue2Grab, to: B.climb2[0] - 4 },
  { who: mage, cls: "mage", from: B.mageGrab, to: B.teleport },
  { who: mage, cls: "mage", from: B.mageBack + 2, to: B.spell },
];
const GRABS = [B.goblinGrab, B.rogue1Grab, B.rogue2Grab, B.paladinGrab, B.mageGrab, B.mageBack + 2];
function coinAt(f) {
  const h = HOLDS.find((x) => f >= x.from && f < x.to);
  if (h) return { pos: handOf(h.who(f), h.cls), spin: f * 0.3, glint: 0.3 };
  // on the pedestal unless it was taken and the pedestal has not come back up with a fresh one
  const taken = GRABS.filter((g) => g <= f).length;
  if (taken && pedestalSink(f) > 0.001) return null;
  if (taken && f >= GRABS[taken - 1] && pedestalSink(f) === 0 && f < GRABS[taken - 1] + 30) return null;
  const glint = Math.exp(-Math.abs(f - B.coinGlint) / 6) + 0.25 * (0.5 + 0.5 * Math.sin(f * 0.15));
  return { pos: [0, COIN_Y + 0.075 - pedestalSink(f) * (PED.h + 0.06) + 0.02 * Math.sin(f * 0.08), roomZ(PED.z, f)], spin: f * 0.04, glint };
}

// --- props ---------------------------------------------------------------------------------------
const PLATE_AT = [0, 1, 2, 3].map((i) => B.plates + i * 7);
const MIRROR_AT = B.mirrors;
const PRESS_AT = [B.pressL, B.pressR];
const CUBE_TUMBLE = [B.cube, B.cube + 22];
function cubeAt(f) {
  if (f < B.cubeOpen) return null;
  const at = [0, CUBE_SIZE / 2, PALADIN_Z];
  if (f < B.cube) return { pos: at, rot: [0, 0, 0] };
  const t = progress(f, CUBE_TUMBLE);
  const steps = 3, k = Math.min(steps - 1, Math.floor(t * steps)), u = t * steps - k;
  const x = lerp(0, CUBE_REST[0], t), z = lerp(PALADIN_Z, CUBE_REST[1], t);
  const tip = t < 1 ? (CUBE_SIZE * (Math.SQRT2 - 1)) / 2 * Math.sin(Math.PI * u) + arc(u, 0.12) : 0;
  return { pos: [x, CUBE_SIZE / 2 + tip, z], rot: [-(k + easeInOut(u)) * R90, 0.3 * t, 0] };
}
function beamAt(f) {
  if (f < PALADIN_RUN[0] || f >= B.fold + 14) return null;
  const st = beamState(f);
  if (!st.visible) return null;
  const p = paladin(f) ?? { position: [0, 0, PALADIN_Z] };
  if (f < PALADIN_RUN[1]) return { x: p.position[0] + 0.3, y: 1.62, z: p.position[2], yaw: R90, buckle: 0 }; // on his shoulder
  if (f < B.paladinGrab + 2) return { x: 0.3, y: 1.62, z: PALADIN_Z, yaw: R90, buckle: 0 };
  if (f < B.wedge) { // swung round in front of him, across the room
    const t = easeInOut(progress(f, [B.paladinGrab + 2, B.wedge]));
    return { x: lerp(0.3, 0, t), y: lerp(1.62, 1.15, t), z: PALADIN_Z + 0.35 * t, yaw: lerp(R90, 0, t), buckle: 0 };
  }
  const y = f < B.backOff ? st.y : lerp(st.y, BEAM_Y, 1);
  return { x: 0, y, z: PALADIN_Z + 0.35 - 0.2 * clamp01((f - B.wedge) / 14), yaw: 0, buckle: st.buckle };
}
function orbAt(f) {
  if (f < B.orbOut || f > B.crush5 + 3) return null;
  const pop = f >= B.crush5 ? 1 + (f - B.crush5) * 0.6 : 1;
  return { x: orbX(f), y: ORB_Y, z: GRAB_Z + 0.45, scale: f >= B.crush5 ? Math.max(0, 1.6 - (f - B.crush5) * 0.5) : clamp01((f - B.orbOut) / 4) * pop };
}
const BOOT = (f) => {
  const demo = f >= B.bootDemo - 4 && f < B.bootDemo + 22 ? Math.sin(Math.PI * progress(f, [B.bootDemo - 4, B.bootDemo + 22])) : 0;
  const peekOut = f >= B.boot2 && f < B.punt ? 0.25 * easeOutBack(progress(f, [B.boot2, B.boot2 + 8])) : 0;
  const kick = f >= B.punt - 2 && f < B.punt + 20 ? (f < B.punt ? lerp(0.25, 1, (f - B.punt + 2) / 2) : 1 - easeInOut(progress(f, [B.punt + 6, B.punt + 20])) * 1) : 0;
  return Math.max(demo, peekOut, kick);
};
export function propsAt(f) {
  const inner = wallInner(f);
  return {
    clock: f,
    roomDZ: roomDZ(f),
    inner,
    shudder: wallShudder(f),
    sink: pedestalSink(f),
    coin: coinAt(f),
    plates: PLATE_AT.map((a) => (f < a ? 0 : Math.min(1, easeOutCubic(progress(f, [a, a + 9]))))),
    grease: f < B.grease ? 0 : easeOutCubic(progress(f, [B.grease, B.grease + 40])),
    volts: f < B.electrify ? 0 : (f < FRY[0] ? 0.55 + 0.25 * Math.sin(f * 0.9) : f < FRY[1] ? 1 : Math.max(0.35, 1 - (f - FRY[1]) / 30)) * clamp01((f - B.electrify) / 6),
    busOn: f >= B.electrify - 30,
    mirrors: MIRROR_AT.map((a) => (f < a ? 0 : easeOutBack(progress(f, [a, a + 10]), 1.6))),
    presses: PRESS_AT.map((a) => (f < a - 6 ? 0 : easeOutBack(progress(f, [a - 6, a + 6]), 1.3))),
    boot: BOOT(f),
    beam: beamAt(f),
    cube: cubeAt(f),
    orb: orbAt(f),
    rails: f < B.rails ? 0 : easeOutBack(progress(f, [B.rails, B.rails + 16]), 1.2),
    bogies: f < B.engage ? 0 : easeOutCubic(progress(f, [B.engage, B.engage + 6])),
    launch: f < B.launch ? 0 : f < B.launch + 4 ? easeOutCubic((f - B.launch) / 4) : 1 - easeInOut(progress(f, [B.launch + 14, B.launch + 30])),
    pole: (() => {
      const tip = poleTip(f);
      if (!tip || f < PARTY_WALK[0][0]) return null;
      const p = partyMember(0, f);
      if (!p) return null;
      if (f < B.pokes - 10) { // carried upright on the walk in
        const [x, , z] = p.position;
        return [[x + 0.32, 0.35, z - 0.1], [x + 0.3, 3.2, z - 0.35]];
      }
      return [[POLE_HAND[0], POLE_HAND[1] + 0.25, POLE_HAND[2] + 0.45], tip];
    })(),
    mimic: {
      open: f < B.chute ? 0.3 : f < B.chomp - 3 ? lerp(0.3, 1, easeOutCubic(progress(f, [B.chute, B.chute + 8]))) : f < B.chomp ? lerp(1, 0, (f - B.chomp + 3) / 3)
        : f < B.burp ? 0.08 * Math.max(0, Math.sin((f - B.chomp) * 0.5)) : 0.55 * Math.sin(Math.PI * clamp01((f - B.burp) / 16)) + 0.05,
      chew: f >= B.chomp && f < B.burp ? Math.max(0, Math.sin((f - B.chomp) * 0.5)) * (1 - clamp01((f - B.chomp - 40) / 20)) : f >= B.chomp && f < B.chomp + 6 ? 1 : 0,
      blink: f > B.burp + 30 && (f % 70) < 4,
      clock: f,
    },
  };
}

// --- camera -----------------------------------------------------------------------------------------
// KEYS: [story frame, shot, cut?]. Between keys the camera glides (eased) unless the second is a cut.
const shot = (pos, look, fov = 46) => ({ pos, look, fov });
const crash = (target, from, d, zoom = 1.3) => (f0) => (f) => {
  const dir = from.map((v, i) => v - target[i]), n = Math.hypot(...dir);
  const snap = 1 - Math.pow(1 - clamp01((f - f0) / 5), 3);
  return { pos: target.map((v, i) => v + (dir[i] / n) * d), look: target, fov: lerp(46, 46 / zoom, snap), crash: true };
};
const G = GRAB_Z;
const REV = (push = 0) => shot([0.38, 1.75 - push * 0.15, -3.6 + push * 0.5], [0, 1.0, 3.0], 46);  // from the alcove, out towards the doorway
const FRONT = (d = 3.6, h = 1.55, fov = 44) => shot([0.15, h, G + d], [0, 1.2, G - 0.2], fov);    // into the room, chest height
const WIDE = (d = 6.2, h = 2.2) => shot([0, h, G + d], [0, 1.35, G - 0.3], 46);                     // the whole opening
const UPV = (d = 3.4) => shot([0, 1.2, G + d], [0, 2.35, G], 52);                                    // looking up the walls at the vent
const lair = (pos, look, fov = 46) => shot(pos.map((v, i) => v + (i === 0 ? MIMIC_ROOM[0] : 0)), look.map((v, i) => v + (i === 0 ? MIMIC_ROOM[0] : 0)), fov);
const roomShot = (s) => (f) => ({ ...s, pos: [s.pos[0], s.pos[1], s.pos[2] + roomDZ(f)], look: [s.look[0], s.look[1], s.look[2] + roomDZ(f)] });

const KEYS = [
  // the title over the coin (frames under 108 are the cold open; see HOOK)
  [0, shot([0, 1.95, 4.4], [0, 1.15, PED.z], 42)], [B.title + 4, shot([0, 1.95, 4.4], [0, 1.15, PED.z], 42)],
  [lineStart("l1a") - 2, shot([0, 1.45, 0.9], [0, 1.08, PED.z], 38)],
  // L1
  [lineStart("l1a"), REV(), true], [B.goblinGrab - 10, REV(1)],
  [B.goblinGrab - 6, FRONT(3.0, 1.45), true], [B.grind, FRONT(2.6, 1.4)],
  [B.grind + 18, crash([0, 1.2, G], [0, 1.3, G + 3], 2.3, 1.2)(B.grind + 18), true],
  [B.grind + 34, WIDE(5.2, 2.0), true], [B.slam1 - 6, WIDE(4.6, 1.9)], [B.crush1 + 30, WIDE(4.4, 1.85)],
  [B.flop1 - 8, FRONT(3.0, 1.6, 46), true], [ROGUE1_RUN[0] - 4, FRONT(2.8, 1.5, 46)],
  // L1 counter
  [ROGUE1_RUN[0] + 8, REV(), true], [ROGUE1_RUN[1] - 2, REV(1)],
  [ROGUE1_RUN[1], FRONT(2.8, 1.45), true], [B.climb1[0] - 2, FRONT(3.0, 1.45)],
  [B.climb1[0], UPV(3.6), true], [B.ventIn, UPV(3.9)],
  [B.ventIn + 2, WIDE(5.0, 2.0), true], [ROGUE1_PEEK[0] - 3, WIDE(4.8, 2.0)],
  [ROGUE1_PEEK[0] - 1, shot([0.12, 1.7, G + 2.1], [0, 2.95, VENT.z], 46), true], [ROGUE1_PEEK[1] + 2, shot([0.12, 1.7, G + 1.9], [0, 2.95, VENT.z], 46)],
  // L2 install: the plates, the grease, the boot
  [ROGUE1_PEEK[1] + 4, shot([-1.1, 1.7, G + 2.7], [1.0, 1.6, G - 1.2], 50), true], [B.grease - 4, shot([-1.0, 1.65, G + 2.2], [1.1, 1.7, G - 1.0], 50)],
  [B.grease, shot([-0.7, 1.55, G + 1.5], [1.5, 1.9, G - 0.6], 46), true], [B.bootHide - 12, shot([-0.6, 1.6, G + 1.3], [1.5, 1.9, G - 0.9], 46)],
  [B.bootHide - 10, shot([0, 0.75, G + 1.6], [0, 3.1, G], 54), true], [B.bootDemo + 20, shot([0, 0.8, G + 1.4], [0, 3.2, G], 52)],
  // L2 victim
  [Math.max(ROGUE2_RUN[1] - 12, B.bootDemo + 22), REV(0.5), true], [ROGUE2_RUN[1] + 2, FRONT(2.8, 1.45), true], [B.climb2[0] - 2, FRONT(3.0, 1.45)],
  [B.climb2[0], UPV(3.6), true], [B.boot2 + 2, UPV(3.4)],
  [B.boot2 + 4, crash([0, 2.85, G], [0, 2.5, G + 3], 2.5, 1.2)(B.boot2 + 4), true],
  [B.punt, shot([0, 1.7, G + 4.4], [0, 1.4, G - 0.2], 46), true], [B.crush2 + 12, shot([0, 1.7, G + 4.2], [0, 1.3, G - 0.2], 46)],
  [B.crush2 + 14, FRONT(3.2, 1.6, 46), true], [B.flop2 + 6, FRONT(3.2, 1.6, 46)],
  // L2 counter: the paladin's beam
  [B.flop2 + 8, REV(), true], [PALADIN_RUN[1] - 2, REV(1)],
  [PALADIN_RUN[1], FRONT(3.0, 1.55), true], [B.wedge + 14, FRONT(3.3, 1.7, 46)],
  [B.wedge + 16, WIDE(5.4, 2.1), true], [B.stall + 20, WIDE(5.0, 2.0)],
  [B.stands - 4, FRONT(2.8, 1.6), true], [B.smug - 4, FRONT(2.6, 1.6)],
  [B.smug - 2, crash([0, 1.75, PALADIN_Z], [0, 1.8, PALADIN_Z + 3], 2.5, 1.2)(B.smug - 2), true],
  // L3 install: the presses slide out of the frame, the walls light up
  [B.backOff, WIDE(5.6, 2.3), true],
  [B.pressL - 10, shot([1.0, 2.35, FRONT_Z + 3.0], [-2.0, 2.85, FRONT_Z + 0.4], 48), true], [B.pressR - 10, shot([0.9, 2.35, FRONT_Z + 3.0], [-2.0, 2.85, FRONT_Z + 0.4], 48)],
  [B.pressR - 8, shot([-1.0, 2.35, FRONT_Z + 3.0], [2.0, 2.85, FRONT_Z + 0.4], 48), true], [B.electrify - 10, shot([-0.9, 2.35, FRONT_Z + 3.0], [2.0, 2.85, FRONT_Z + 0.4], 48)],
  [B.electrify - 8, FRONT(3.6, 1.7, 50), true], [B.pressIn, FRONT(3.4, 1.7, 50)],
  // L3 victim
  [B.touchL - 4, FRONT(3.2, 1.75, 48)], [B.circuit + 4, FRONT(2.9, 1.75, 48)],
  [B.fry - 6, shot([0.1, 1.9, PALADIN_Z + 2.1], [0, 1.65, PALADIN_Z], 44), true], [B.fold - 4, shot([0.1, 1.9, PALADIN_Z + 2.0], [0, 1.6, PALADIN_Z], 44)],
  [B.fold - 2, shot([0, 2.0, G + 3.9], [0, 1.4, G - 0.2], 46), true], [B.cubeOpen + 6, shot([0, 2.0, G + 3.8], [0, 1.3, G - 0.2], 46)],
  [B.cubeOpen + 8, shot([0.3, 1.5, G + 2.6], [0.1, 0.45, PALADIN_Z - 0.6], 44), true], [B.cube + 2, shot([0.3, 1.45, G + 2.5], [0.1, 0.45, PALADIN_Z - 0.6], 44)], [CUBE_TUMBLE[1] + 4, shot([0.55, 1.4, G + 2.4], [0.5, 0.4, -3.3], 46)],
  // L3 counter: the mage blinks out
  [CUBE_TUMBLE[1] + 6, REV(0.5), true], [MAGE_RUN[1] - 2, REV(1)],
  [MAGE_RUN[1], FRONT(2.9, 1.5), true], [B.teleport, FRONT(2.6, 1.5)],
  [B.blinkOut + 3, shot([0.3, 1.9, MAGE_WAIT[1] + 3.2], [0.3, 1.4, G], 46), true], [B.reopen4 + 10, shot([0.3, 1.9, MAGE_WAIT[1] + 3.0], [0.3, 1.4, G], 46)],
  // L4 install: mirrors pop on, the mage watches
  [B.mirrors[0] - 8, shot([1.2, 1.7, 1.9], [-1.7, 1.7, -0.8], 50), true], [B.mirrors[1] - 3, shot([1.1, 1.7, 1.7], [-1.7, 1.7, -0.9], 50)],
  [B.mirrors[1] - 2, shot([-1.2, 1.7, 1.9], [1.7, 1.7, -0.8], 50), true], [B.mirrors[2] - 3, shot([-1.1, 1.7, 1.7], [1.7, 1.7, -0.9], 50)],
  [B.mirrors[2] - 2, shot([0.9, 1.8, 0.4], [-1.7, 1.7, -2.5], 52), true], [B.mirrors[3] - 3, shot([0.8, 1.8, 0.3], [-1.7, 1.7, -2.5], 52)],
  [B.mirrors[3] - 2, shot([-0.9, 1.8, 0.4], [1.7, 1.7, -2.5], 52), true], [B.mirrors[3] + 4, shot([-0.8, 1.8, 0.3], [1.7, 1.7, -2.5], 52)],
  [Math.max(MAGE_BACK[0] + 6, B.mirrors[3] + 6), shot([0.3, 1.75, MAGE_WAIT[1] + 2.4], [0, 1.3, G], 46), true], [MAGE_BACK[1] + 2, FRONT(3.0, 1.5)],
  // L4 victim: Pong
  [B.spell - 4, shot([0, 1.5, G + 2.9], [0, 1.4, G], 52), true], [B.pong - 4, shot([0, 1.5, G + 2.6], [0, 1.4, G], 52)],
  [B.pong - 2, crash([0, 1.6, G], [0, 1.6, G + 3], 2.4, 1.2)(B.pong - 2), true],
  [B.nowhere - 6, shot([0, 1.55, G + 3.1], [0, 1.4, G], 50), true], [B.crush5 + 10, shot([0, 1.6, G + 3.4], [0, 1.4, G], 50)],
  [B.crush5 + 12, FRONT(3.3, 1.65, 46), true], [B.flop5 + 8, FRONT(3.3, 1.65, 46)],
  // L5: the party arrives, pokes from the hallway
  [B.flop5 + 10, shot([0.4, 1.8, -3.55], [0, 1.2, 6.0], 40), true], [PARTY_WALK[0][1] - 10, shot([0.35, 1.7, -2.9], [0, 1.2, 6.0], 40)],
  [PARTY_WALK[0][1] - 6, shot([0.15, 1.45, -0.1], [0.1, 1.15, 4.4], 46), true], [B.pole + 6, shot([0.15, 1.4, 0.2], [0.1, 1.1, 4.2], 46)],
  [B.pole + 8, shot([1.0, 2.0, 7.4], [0.1, 1.0, 0.4], 46), true], [B.rails - 4, shot([0.95, 1.95, 7.2], [0.1, 1.0, 0.4], 46)],
  [B.rails - 2, shot([-2.3, 0.55, 8.5], [-2.2, 0.15, 0.5], 48), true], [B.railsLock + 2, shot([-2.25, 0.6, 8.3], [-1.9, 0.2, 0.5], 48)],
  [B.railsLock + 4, shot([0.7, 3.7, 8.7], [0.0, 0.9, -0.6], 46), true], [B.lunge - 2, shot([0.6, 3.5, 8.4], [0.0, 1.0, 0.2], 46)],
  [B.lunge + 8, shot([0.55, 3.4, 8.5], [0.0, 1.3, 3.0], 50)], [B.swallow - 8, shot([0.5, 3.3, 8.5], [0.0, 1.3, 3.2], 50)],
  [B.swallow - 7, shot([0, 1.9, 8.6], [0, 1.3, 3.4], 36), true], [B.fire - 6, shot([0, 1.85, 8.4], [0, 1.3, 3.4], 36)],
  [B.fire - 4, shot([0, 1.6, 8.5], [0, 2.5, 3.05], 42), true], [B.chute - 2, shot([0, 1.7, 8.4], [0, 2.9, 3.05], 42)],
  // the lair
  [B.chute, lair([0.35, 1.7, 4.9], [0, 1.0, -0.9], 46), true], [B.chomp - 2, lair([0.3, 1.6, 4.3], [0, 0.95, -1.1], 44)],
  [B.chomp, lair([0.2, 1.3, 1.6], [0, 0.85, -1.6], 44), true], [B.burp + 20, lair([0.2, 1.25, 1.2], [0, 0.85, -1.6], 44)],
  [B.stamp - 30, lair([0.6, 2.1, 4.2], [0, 1.0, -1.4], 46), true], [FRAMES, lair([0.5, 1.9, 3.6], [0, 1.0, -1.4], 46)],
];
{
  const bad = KEYS.map((k, i) => (i && k[0] < KEYS[i - 1][0] ? `key ${i} (frame ${k[0]}) before key ${i - 1} (${KEYS[i - 1][0]})` : null)).filter(Boolean);
  if (bad.length) throw new Error(`camera keys out of order: ${bad.join('; ')}`);
}

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

const SLAMS = { l1: SLAM1_CONTACT, l2: B.slam2, l2c: CRUSH2_CONTACT, l3: B.fold + 12, l4: B.slam4, l5: CRUSH5_CONTACT };
const SHAKES = [
  { at: SLAMS.l1, strength: 0.3 }, { at: B.crush1, strength: 0.12 }, { at: SLAMS.l2, strength: 0.22 }, { at: B.punt, strength: 0.16 },
  { at: B.land2, strength: 0.12 }, { at: SLAMS.l2c, strength: 0.3 }, { at: B.stall, strength: 0.2 }, { at: B.pressL, strength: 0.1 },
  { at: B.pressR, strength: 0.1 }, { at: B.circuit, strength: 0.22 }, { at: SLAMS.l3, strength: 0.3 }, { at: B.slam4, strength: 0.25 },
  { at: SLAMS.l5, strength: 0.32 }, { at: B.lunge + 9, strength: 0.36 }, { at: B.swallow + 2, strength: 0.3 }, { at: B.launch, strength: 0.26 },
  { at: B.chomp, strength: 0.3 }, { at: B.stamp, strength: 0.2 }, { at: B.dare + 4, strength: 0.12 }, { at: B.engage, strength: 0.08 },
  ...PLATE_AT.map((a) => ({ at: a + 9, strength: 0.05 })), ...MIRROR_AT.map((a) => ({ at: a, strength: 0.04 })),
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
// Zoom out: every shot but the crash zooms backs off along its line of sight (ZOOM_OUT) with a
// slightly wider lens, kept inside the set: the hallway, the room (clear of the closing slabs and
// under its ceiling) and the lair.
const ZOOM_OUT = 1.3, FOV_OUT = 1.08;
function backOff(c, f) {
  if (c.crash) return c;
  const pos = c.pos.map((v, i) => c.look[i] + (v - c.look[i]) * ZOOM_OUT);
  if (c.pos[0] > 20) { // the lair
    pos[0] = Math.max(MIMIC_ROOM[0] - 2.9, Math.min(MIMIC_ROOM[0] + 2.9, pos[0]));
    pos[1] = Math.max(0.4, Math.min(3.3, pos[1]));
    pos[2] = Math.max(-2.9, Math.min(4.3, pos[2]));
  } else {
    const dz = roomDZ(f);
    pos[2] = Math.max(BACK_Z + 0.25 + dz, Math.min(DOOR_Z - 0.2, pos[2]));
    const inRoom = pos[2] < FRONT_Z + 0.35 + dz;
    const hw = inRoom ? Math.max(0.05, Math.min(HW, wallInner(f)) - 0.18) : 2.35;
    pos[0] = Math.max(-hw, Math.min(hw, pos[0]));
    pos[1] = Math.max(0.35, Math.min(inRoom ? ROOM_H - 0.2 : 4.5, pos[1]));
  }
  return { pos, look: c.look, fov: Math.min(70, c.fov * FOV_OUT) };
}
export const CAMS = {
  threeq: (f) => {
    const c = backOff(camAt(f), f);
    const [sx, sy] = shake(f);
    return { pos: [c.pos[0] + sx, c.pos[1] + sy, c.pos[2]], look: c.look, fov: c.fov };
  },
};

// --- sound (story frames; the cold open copies the finale's cues it shows) ------------------------------
export const STAGES = [
  { name: "CRUSHING WALLS", color: "#ff9a3d" },
  { name: "GREASED STEEL + BOOT", color: "#7dff5a" },
  { name: "ELECTRIC PRESSES", color: "#4dc4ff" },
  { name: "MAGIC MIRRORS", color: "#c77dff" },
  { name: "ROOM ON RAILS", color: "#ff5d8f" },
].map((s, i) => ({ ...s, n: i + 1, at: STAGE_STARTS[i] }));

const kickFrames = (win) => Array.from({ length: KICKS }, (_, k) => Math.round(lerp(win[0], win[1], (k + 1) / KICKS)));
const STORY_SFX = [
  // title + badges
  ["stamp", B.title + 2, 0.4], ["sparkle", B.coinGlint, 0.3],
  ...STAGE_STARTS.map((f) => ["pop", f, 0.11]),
  // L1
  ["click", B.goblinGrab + 2, 0.4], ["sparkle", B.goblinGrab, 0.2], ["gears", B.grind, 0.3, B.slam1 - B.grind], ["rumble", B.grind, 0.35, B.slam1 - B.grind + 6],
  ["whoosh", B.grind + 10, 0.15], ["slam", SLAMS.l1, 0.6], ["squash", SLAMS.l1 + 1, 0.5], ["boom", SLAMS.l1, 0.3],
  ["hydraulic", B.reopen1, 0.3], ["squelch", B.pancake1, 0.35], ["thud", B.pancake1, 0.3],
  // L1 counter
  ["whoosh", B.rogue1Flip, 0.3], ["click", B.rogue1Grab + 2, 0.4], ["sparkle", B.rogue1Grab, 0.2], ["rumble", B.rogue1Close, 0.3, B.ventIn - B.rogue1Close],
  ...kickFrames(B.climb1).map((f) => ["thud", f, 0.22]), ["whoosh", B.climb1[1], 0.3], ["slam", SLAMS.l2, 0.55], ["boom", SLAMS.l2, 0.25],
  ["hydraulic", B.slam2 + 10, 0.25], ["boing", ROGUE1_PEEK[0] + 2, 0.3],
  // L2 install
  ...PLATE_AT.map((a) => ["clang", a + 9, 0.35]), ["chain", B.plates - 4, 0.25], ["squelch", B.grease, 0.4], ["squelch", B.grease + 18, 0.25],
  ["sparkle", B.steel, 0.2], ["ratchet", B.bootHide, 0.3], ["boing", B.bootDemo, 0.45], ["whoosh", B.bootDemo + 2, 0.25],
  // L2 victim
  ["click", B.rogue2Grab + 2, 0.4], ["rumble", B.rogue2Grab + 6, 0.28, B.punt - B.rogue2Grab - 6],
  ...SLIPS2.map(([a]) => ["slip", a, 0.45]), ["ratchet", B.boot2, 0.3], ["boing", B.punt, 0.55], ["whoosh", B.punt + 1, 0.3],
  ["thud", B.land2, 0.45], ["slam", SLAMS.l2c, 0.6], ["squash", SLAMS.l2c + 1, 0.5], ["boom", SLAMS.l2c, 0.3], ["hydraulic", B.reopen3, 0.25], ["thud", B.flop2 + 6, 0.3],
  // L2 counter
  ["whoosh", B.wedge, 0.3], ["clank", B.wedge + 12, 0.35], ["rumble", B.wedge + 4, 0.3, B.stall - B.wedge - 4], ["clang", B.stall, 0.55], ["gears", B.stall, 0.2, 20], ["sparkle", B.smug, 0.2],
  // L3 install
  ["hydraulic", B.backOff, 0.3], ["hydraulic", B.pressL - 4, 0.5], ["clank", B.pressL + 4, 0.4], ["hydraulic", B.pressR - 4, 0.5], ["clank", B.pressR + 4, 0.4],
  ["zap", B.electrify, 0.45], ["ignite", B.electrify + 2, 0.3],
  // L3 victim
  ["hydraulic", B.pressIn, 0.4], ["zap", B.touchL, 0.35], ["zap", B.circuit, 0.6], ["crack", B.circuit, 0.35], ["sizzle", B.circuit + 4, 0.4, B.fold - B.circuit],
  ["zap", B.fry, 0.4], ["hydraulic", B.fold, 0.45], ["slam", SLAMS.l3, 0.6], ["squash", SLAMS.l3, 0.35], ["hydraulic", B.cubeOpen, 0.25],
  ["toaster_ding", B.cube, 0.55], ["clank", B.cube + 7, 0.3], ["clank", B.cube + 14, 0.3], ["thud", B.cube + 22, 0.3],
  // L3 counter
  ["click", B.mageGrab + 2, 0.4], ["rumble", B.mageGrab + 4, 0.3, B.slam4 - B.mageGrab - 4], ["levitate", B.teleport, 0.35], ["pop", B.blinkOut, 0.45], ["whoosh", B.blinkOut, 0.3],
  ["pop", B.blinkIn, 0.4], ["sparkle", B.blinkIn, 0.25], ["slam", B.slam4, 0.55], ["boom", B.slam4, 0.25], ["hydraulic", B.reopen4, 0.25],
  // L4 install
  ...MIRROR_AT.map((a) => ["ice", a, 0.35]), ...MIRROR_AT.map((a) => ["sparkle", a + 2, 0.18]),
  // L4 victim
  ["click", B.mageBack + 4, 0.35], ["rumble", B.mageBack + 6, 0.25, B.crush5 - B.mageBack - 6], ["levitate", B.spell, 0.35], ["whoosh", B.orbOut, 0.25],
  ...PONG_BEEPS.map((f) => ["pong_beep", f, 0.3]), ["slam", SLAMS.l5, 0.6], ["squash", SLAMS.l5 + 1, 0.5], ["pop", B.crush5, 0.4], ["boom", B.crush5, 0.3],
  ["hydraulic", B.reopen5, 0.25], ["thud", B.flop5 + 6, 0.3],
  // L5
  ...POLE_TAPS.map((t) => ["click", t.at, 0.3]),
  ["ramp", B.rails, 0.35], ["rumble", B.rails, 0.3, 30], ["clank", B.engage, 0.45], ["thud", B.engage + 2, 0.35], ["clang", B.railsLock, 0.35],
  ["click", B.fatalTap, 0.6], ["whoosh_big", B.lunge, 0.5], ["roll", B.lunge, 0.4, 12], ["slam", B.lunge + 9, 0.6], ["boom", B.lunge + 9, 0.4],
  ["slam", B.swallow + 2, 0.55], ["squash", B.swallow + 2, 0.4], ["launch", B.launch, 0.55], ["boing", B.launch, 0.35], ["whoosh", B.chute, 0.35],
  ["whoosh_big", B.chute + 4, 0.3], ["growl", B.chute + 6, 0.3], ["chomp", B.chomp, 0.65], ["chew", B.chomp + 4, 0.45, 40], ["burp", B.burp, 0.55],
  // end card
  ["stamp", B.stamp, 0.6], ["boom", B.stamp, 0.35], ["crack", B.crack, 0.45], ["crumble", B.dare, 0.4, undefined, "dungeon-trap-v2"], ["stamp", B.dare + 4, 0.55],
];
const toFilm = (list) => {
  const out = [];
  for (const c of list) {
    if (c[1] >= HOOK[HOOK.length - 1][1]) out.push(c); // story frames after the cold open are film frames
    for (const [a, b, s] of HOOK) if (c[1] >= s && c[1] < s + (b - a)) out.push([c[0], a + (c[1] - s), c[2], c[3] && Math.min(c[3], b - (a + c[1] - s)), c[4]]);
  }
  return out;
};
export const SFX = toFilm(STORY_SFX).map(([name, at, vol, dur, ep]) => ({ name, at, vol, dur, ep }));

// --- bursts (fx.js, story frames): every contact gets one, keyed to the same beat as its sound ----------
const SEAM = (at, n = 60, extra = {}) => ({ kind: "dust", at, pos: [0, 1.5, G], box: [0.05, 1.4, 1.8], n, size: 1.1, ...extra });
const raw = [
  // L1
  ...[0, 1, 2].map((i) => ({ kind: "dust", at: B.grind + i * 16, pos: [0, ROOM_H - 0.1, G], box: [1.4, 0, 1.6], n: 24, size: 0.7 })),
  SEAM(SLAMS.l1), { kind: "sparks", at: SLAMS.l1, pos: [0, 2.6, G], box: [0.02, 0.6, 1.6], n: 30 },
  { kind: "dust", at: B.pancake1, pos: [LANES.goblin[0], 0.05, LANES.goblin[1]], box: [0.2, 0, 0.7], n: 24 },
  // L1 counter
  { kind: "dust", at: B.rogue1Flip + 16, pos: [0, 0.05, 1.5], n: 14, size: 0.6 },
  ...kickFrames(B.climb1).map((f, k) => ({ kind: "dust", at: f, pos: [(k % 2 ? 1 : -1) * (wallInner(f) - 0.05), 0.5 + ((k + 1) / KICKS) * CLIMB_TOP, G], box: [0, 0.1, 0.15], n: 12, size: 0.5 })),
  SEAM(SLAMS.l2, 40), { kind: "dust", at: ROGUE1_PEEK[0] + 2, pos: [0, ROOM_H, VENT.z], box: [0.3, 0, 0.3], n: 14, size: 0.5 },
  // L2 install
  ...PLATE_AT.map((a, i) => ({ kind: "sparks", at: a + 9, pos: [(i % 2 ? 1 : -1) * (HW - 0.05), 0.2, i < 2 ? -2.5 : -0.5], box: [0, 0.05, 0.8], n: 30 })),
  { kind: "dust", at: B.bootDemo, pos: [0, ROOM_H - 0.05, VENT.z], box: [0.35, 0, 0.35], n: 20, size: 0.6 },
  // L2 victim
  ...SLIPS2.map(([a], i) => ({ kind: "dust", at: a, pos: [(i ? 1 : -1) * 0.8, 1.0, G], box: [0, 0.2, 0.2], n: 10, size: 0.5, tint: "grease" })),
  { kind: "dust", at: B.punt, pos: [0, ROOM_H - 0.1, VENT.z], box: [0.35, 0, 0.35], n: 24, size: 0.7 },
  { kind: "dust", at: B.land2, pos: [LAND2_X, 0.05, G], n: 24 },
  SEAM(SLAMS.l2c), { kind: "dust", at: B.flop2 + 6, pos: [LANES.rogue2[0], 0.05, LANES.rogue2[1]], box: [0.2, 0, 0.7], n: 24 },
  // L2 counter
  { kind: "sparks", at: B.stall, pos: [-1.1, BEAM_Y, PALADIN_Z + 0.2], n: 40 }, { kind: "sparks", at: B.stall, pos: [1.1, BEAM_Y, PALADIN_Z + 0.2], n: 40 },
  { kind: "glints", at: B.smug, end: B.smug + 30, pos: [0, 1.7, PALADIN_Z + 0.3], box: [0.4, 0.4, 0.2], n: 10 },
  // L3 install
  ...[B.pressL, B.pressR].map((a, i) => ({ kind: "frost", at: a + 2, pos: [(i ? 1 : -1) * 2.0, 3.0, FRONT_Z + 0.6], box: [0.3, 0.2, 0.2], n: 30, size: 1.2 })),
  ...[-1, 1].map((s) => ({ kind: "sparks", at: B.electrify, pos: [s * 1.36, 1.6, -1.2], box: [0, 1.4, 1.8], n: 50, tint: "arc" })),
  // L3 victim
  ...[-1, 1].map((s) => ({ kind: "sparks", at: B.touchL, pos: [s * 1.1, BEAM_Y, PALADIN_Z + 0.2], n: 30, tint: "arc" })),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ kind: "sparks", at: B.circuit + i * 6, pos: [0, 1.4 + (i % 3) * 0.4, PALADIN_Z + 0.2], box: [0.9, 0.6, 0.1], n: 26, tint: "arc" })),
  { kind: "dust", at: B.fry + 10, pos: [0, 1.8, PALADIN_Z], box: [0.3, 0.3, 0.2], n: 30, size: 1.2, tint: "smoke" },
  SEAM(SLAMS.l3, 50), { kind: "shards", at: B.fold + 4, pos: [0, BEAM_Y, PALADIN_Z + 0.35], box: [0.1, 0.1, 0.1], n: 40, tint: "splinter" },
  ...[7, 14, 22].map((d) => ({ kind: "dust", at: B.cube + d, pos: [lerp(0, CUBE_REST[0], d / 22), 0.05, lerp(PALADIN_Z, CUBE_REST[1], d / 22)], n: 12, size: 0.5 })),
  // L3 counter
  { kind: "sparks", at: B.blinkOut, pos: [0, 1.0, G], box: [0.3, 0.7, 0.3], n: 50, tint: "magic" },
  { kind: "glints", at: B.teleport, end: B.blinkOut, pos: [0, 1.1, G], box: [0.4, 0.8, 0.3], n: 18, tint: "magic" },
  { kind: "sparks", at: B.blinkIn, pos: [MAGE_WAIT[0], 1.0, MAGE_WAIT[1]], box: [0.3, 0.7, 0.3], n: 50, tint: "magic" },
  SEAM(B.slam4, 40),
  // L4 install
  ...MIRROR_AT.map((a, i) => ({ kind: "glints", at: a, end: a + 26, pos: [(i % 2 ? 1 : -1) * (HW - 0.1), 1.7, i < 2 ? -0.55 : -2.5], box: [0.02, 1.2, 0.7], n: 22, tint: "magic" })),
  // L4 victim
  ...BOUNCES.map((f) => ({ kind: "sparks", at: f, pos: [orbX(f) + Math.sign(orbX(f)) * 0.3, ORB_Y, G + 0.45], n: 14, tint: "magic" })),
  { kind: "sparks", at: B.crush5, pos: [0, ORB_Y, G + 0.45], box: [0.05, 0.3, 0.3], n: 40, tint: "magic" }, SEAM(SLAMS.l5),
  { kind: "dust", at: B.flop5 + 6, pos: [LANES.mage[0], 0.1, LANES.mage[1]], box: [0.2, 0, 0.7], n: 24 },
  // L5
  ...POLE_TAPS.map((t) => ({ kind: "dust", at: t.at, pos: [PARTY[0].x + 0.1, 0.02, t.z], n: 8, size: 0.4 })),
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ kind: "dust", at: B.rails + i * 3, pos: [0, 0.02, 7.5 - i * 1.8], box: [2.5, 0, 0.3], n: 22, size: 0.6 })),
  { kind: "dust", at: B.engage, pos: [0, 0.05, 0.8], box: [2.4, 0, 0.3], n: 30, size: 0.8 },
  { kind: "sparks", at: B.lunge + 2, pos: [0, 0.05, 2.5], box: [2.5, 0, 1.5], n: 60 },
  { kind: "dust", at: B.lunge + 9, pos: [0, 0.3, FRONT_Z + 4.4 + 0.5], box: [2.4, 0.3, 0.3], n: 90, size: 1.5 },
  { kind: "dust", at: B.swallow + 2, pos: [0, 1.4, 3.8], box: [0.05, 1.2, 1.4], n: 50 },
  { kind: "dust", at: B.launch, pos: [0, 0.4, 3.05], box: [0.6, 0.2, 0.6], n: 50, size: 1.3 },
  // the lair
  { kind: "dust", at: B.chute + 2, pos: CHUTE_EXIT.map((v, i) => (i === 1 ? 0.05 : v)), box: [0.5, 0, 0.5], n: 40, size: 1.1 },
  { kind: "glints", at: B.chomp, end: B.chomp + 30, pos: MIMIC_MOUTH, box: [0.9, 0.4, 0.5], n: 26 },
  { kind: "sparks", at: B.chomp, pos: MIMIC_MOUTH, box: [0.6, 0.1, 0.3], n: 30, tint: "glints" },
  { kind: "dust", at: B.burp, pos: [MIMIC_MOUTH[0], MIMIC_MOUTH[1] + 0.3, MIMIC_MOUTH[2] + 0.4], box: [0.2, 0.1, 0.15], n: 18, size: 0.8, tint: "smoke" },
  { kind: "glints", at: B.burp, end: B.burp + 24, pos: [MIMIC_MOUTH[0], MIMIC_MOUTH[1] + 0.5, MIMIC_MOUTH[2] + 0.4], box: [0.4, 0.3, 0.2], n: 14 },
];
// room-attached bursts ride the room (all of them sit inside it before the lunge, which they never span)
export const BURSTS = raw.map((b) => ({ ...b, pos: [b.pos[0], b.pos[1], b.pos[2] + (b.at >= B.lunge && b.pos[2] < FRONT_Z + 0.5 && b.pos[0] < 30 ? roomDZ(b.at) : 0)] }));

// --- captions + badges (hud.js, film frames) --------------------------------------------------------------
const chunks = [];
for (const id of LINES) {
  const words = cues.lines[id].words;
  for (let i = 0; i < words.length;) {
    let n = Math.min(5, words.length - i);
    if (words.length - i - n === 1) n = 4;
    chunks.push({ words: words.slice(i, i + n), end: (words[i + n] ?? { startFrame: cues.lines[id].endFrame + 8 }).startFrame });
    i += n;
  }
}
export const HUD_TEXT = { kicker: "EVOLUTION OF A", titleText: "CRUSHING ROOM", status: "DUNGEON STATUS" };
export function hudAt(f) {
  const c = chunks.find((k) => f >= k.words[0].startFrame && f < k.end);
  const stage = [...STAGES].reverse().find((s) => f >= s.at);
  return {
    ...HUD_TEXT,
    title: f >= B.title && f < B.title + 82,
    titleFrame: f - B.title,
    stage: stage ? { ...stage, pop: f - stage.at } : null,
    caption: c ? c.words.map((x) => ({ word: x.word, on: f >= x.startFrame })) : null,
    end: f >= B.stamp ? { age: f - B.stamp, crack: f >= B.crack ? f - B.crack : -1, dare: f >= B.dare ? f - B.dare : -1 } : null,
  };
}
export { w, MIMIC_ROOM, BACK_Z, WALL_Z };
