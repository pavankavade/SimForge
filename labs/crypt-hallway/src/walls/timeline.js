// Crushing room (?hall=walls): Ep3 ("Evolution of a Crushing Walls Trap") re-written for the lab and
// re-staged in 3D. The film camera looks INTO the room from the hallway, so the two walls close in
// from the left and right of the 9:16 frame.
//
// Frame (lab world, no root transform): the hall runs along z. The room sits at the -z end; the
// hallway runs out to the daylight doorway at +z, where everyone enters. x is across the hall.
// Room-attached things are authored room-relative and shifted by roomDZ(f) (the finale's lunge).
// Every beat is w(line, word) ± n on the voiced narration (voice-walls.py -> data/cues.json).
import cues from "./data/cues.json";
import { clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../../../src/kit/motion";

export { clamp01, easeInOut, easeOutCubic, lerp, progress, cues };
export const FPS = 30;
export const LINES = ["hook", "hook2", "l1a", "l2a", "l2b", "l2c", "l3a", "l3b", "l3c", "l4a", "l4b", "l4c", "l5a", "l5b", "end", "cta"];

// --- cues ------------------------------------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function w(line, word, nth = 0) {
  const hits = cues.lines[line].words.filter((x) => norm(x.word) === norm(word));
  if (!hits[nth]) throw new Error(`cue "${word}" not in ${line}`);
  return hits[nth].startFrame;
}
export const lineStart = (id) => cues.lines[id].startFrame;
export const lineEnd = (id) => cues.lines[id].endFrame;
export const DURATION = cues.durationFrames + 10;

export const easeInCubic = (t) => t * t * t;
export const easeOutBack = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
export const arc = (t, h) => 4 * h * t * (1 - t);

// --- geometry ------------------------------------------------------------------------------------
export const HW = 1.8;              // room half width with the walls open (their faces)
export const WALL_T = 0.6;          // wall slab thickness
export const CLOSED = 0.06;         // inner face distance when slammed shut
export const WALL_Z = [-3.4, 0.8];  // the slabs' extent along the hall (room-relative)
export const WALL_BOTTOM = 0.12;    // slabs ride this high, over the pancakes
export const ROOM_H = 3.4;          // room ceiling (underside)
export const FRONT_Z = 0.8;         // the room's front frame (the proscenium the camera looks through)
export const FRAME_T = 0.3;
export const BOX_HW = 2.45;         // the room box's outer half width (the slabs' pockets)
export const BOX_TOP = 4.25;
export const BACK_Z = -4.3;         // back wall face; the alcove behind the slabs is where the cube ends up
export const CORR_HW = 2.6;         // the hallway, a little wider than the room box (it rides down it)
export const CORR_H = 4.9;
export const DOOR_Z = 9.0;          // daylight doorway, everyone walks in from here
export const ENTRY_Z = 9.6;
export const CORR_BACK = -9.5;
export const PED = { z: -2.0, h: 1.0, r: 0.2 };
export const COIN_Y = PED.h + 0.05;
export const GRAB_Z = -1.35;        // where a victim stands at the pedestal
export const VENT = { z: GRAB_Z, half: 0.42 }; // vent / chute in the ceiling, straight above them
export const LUNGE = 4.4;           // how far the room rides down the hall in the finale
export const CUBE_SIZE = 0.62;
export const CUBE_REST = [0.0, -3.85];
export const ORB_R = 0.32;
export const ORB_Y = 2.3; // over their heads, so the rally never hides a face
export const HALF = { goblin: 0.3, rogue: 0.34, mage: 0.36, paladin: 0.42 };
/** Where the flattened bodies end up (room-relative hips), lying along the hall, clear of the aisle. */
export const LANES = { goblin: [-0.8, -1.2], rogue2: [0.8, -1.2], mage: [-0.8, -1.2] }; // the mage lands on the goblin
export const PANCAKE = 0.12;
export const WALK = 0.09, JOG = 0.14, SPRINT = 0.2;
export const MAGE_WAIT = [0.5, 2.4];    // where the mage reappears in the hallway after his blink
export const PARTY = [
  { cls: "paladin", x: 0.25, z: 3.3, delay: 0 },
  { cls: "mage", x: -0.35, z: 3.95, delay: 6 },
  { cls: "rogue", x: 0.6, z: 4.55, delay: 12 },
];
export const MIMIC_ROOM = [40, 0, 0];    // the Mimic's lair: a separate set, reached by a cut
export const MIMIC_AT = [MIMIC_ROOM[0], 0, MIMIC_ROOM[2] - 1.7]; // the chest's centre on the floor
export const MIMIC_MOUTH = [MIMIC_AT[0], 0.95, MIMIC_AT[2] + 0.1];
export const CHUTE_EXIT = [MIMIC_ROOM[0], 0, MIMIC_ROOM[2] + 1.1];

// --- beats ---------------------------------------------------------------------------------------
export const BEATS = {
  // hook (the finale, flashed forward) and the title over the coin
  title: w("hook2", "and"),
  coinGlint: w("hook2", "gold"),
  // L1: the goblin grabs, the walls grind in, slam
  goblinGrab: w("l1a", "grabs"),
  grind: w("l1a", "two"),
  slam1: w("l1a", "slam"),
  crush1: w("l1a", "shut"),
  pancake1: w("l1a", "pancake"),
  // L1 counter: the rogue runs up the closing walls and out of the vent
  rogue1Flip: w("l2a", "show-off"),
  rogue1Grab: w("l2a", "grabs"),
  rogue1Close: w("l2a", "coin"),
  climb1: [w("l2a", "runs"), w("l2a", "through")],
  ventIn: w("l2a", "ceiling"),
  peek: w("l2a", "vent"),
  // L2 install: greased steel plates, the boot in the vent
  plates: w("l2b", "swap"),
  grease: w("l2b", "greased"),
  steel: w("l2b", "steel"),
  bootHide: w("l2b", "hide"),
  bootDemo: w("l2b", "boot"),
  // L2 victim
  rogue2Grab: lineStart("l2c") - 2,
  climb2: [w("l2c", "slips") - 8, w("l2c", "up")],
  slip2: w("l2c", "slips"),
  boot2: w("l2c", "boot"),
  punt: w("l2c", "punts"),
  crush2: w("l2c", "down"),
  // L2 counter: the paladin's beam
  paladinGrab: w("l3a", "wedges") - 10,
  wedge: w("l3a", "wedges"),
  stall: w("l3a", "walls"),
  stands: w("l3a", "stands"),
  smug: w("l3a", "smugly"),
  // L3 install: hydraulic presses, electrified walls
  backOff: lineStart("l3b"),
  pressL: w("l3b", "hydraulic"),
  pressR: w("l3b", "presses"),
  electrify: w("l3b", "electrify"),
  // L3 victim
  pressIn: w("l3c", "moment"),
  touchL: w("l3c", "touches"),
  circuit: w("l3c", "sides"),
  fry: w("l3c", "fries"),
  fold: w("l3c", "folds"),
  cube: w("l3c", "cube"),
  // L3 counter: the mage blinks out
  mageGrab: w("l4a", "mage"),
  teleport: w("l4a", "teleports"),
  blinkIn: w("l4a", "out"),
  slam4: w("l4a", "through"),
  // L4 install: magic mirrors
  mirrors: [w("l4b", "line"), w("l4b", "room"), w("l4b", "magic"), w("l4b", "mirrors")],
  // L4 victim: Pong
  mageBack: w("l4c", "now"),
  spell: w("l4c", "spell"),
  bounces: w("l4c", "bounces"),
  pong: w("l4c", "pong"),
  nowhere: w("l4c", "nowhere"),
  crush5: w("l4c", "bounce"),
  // L5: the party, the pole, the room on rails, the Mimic
  partyArrive: w("l5a", "party"),
  pokes: w("l5a", "pokes"),
  pole: w("l5a", "pole"),
  safety: w("l5a", "safety"),
  rails: w("l5b", "put"),
  engage: w("l5b", "room"),
  railsLock: w("l5b", "rails"),
  lunge: w("l5b", "lunges"),
  swallow: w("l5b", "swallows"),
  fire: w("l5b", "fires"),
  chute: w("l5b", "chute"),
  into: w("l5b", "into"),
  chomp: w("l5b", "mimic"),
  burp: w("end", "congratulations") + 26,
  stamp: w("end", "unbeatable"),
  crack: w("cta", "unless"),
  dare: w("cta", "prove"),
};
BEATS.fatalTap = BEATS.lunge - 8;
BEATS.reopen1 = BEATS.crush1 + 16;
BEATS.flop1 = BEATS.pancake1 - 6;
BEATS.slam2 = BEATS.ventIn + 4;
BEATS.reopen2 = BEATS.slam2 + 10; // open again before he peeks out of the vent
BEATS.land2 = BEATS.punt + 9;
BEATS.reopen3 = BEATS.crush2 + 14;
BEATS.flop2 = BEATS.reopen3 + 18;
BEATS.cubeOpen = BEATS.cube - 14;
BEATS.blinkOut = BEATS.teleport + 8;
BEATS.reopen4 = w("l4a", "wall") + 8;
BEATS.orbOut = BEATS.spell + 6;
BEATS.reopen5 = BEATS.crush5 + 14;
BEATS.flop5 = BEATS.reopen5 + 18;
BEATS.launch = BEATS.fire + 2;

export const STAGE_STARTS = [lineStart("l1a"), lineStart("l2b"), lineStart("l3b"), lineStart("l4b"), lineStart("l5b")];

// --- the room's lunge down the hall ------------------------------------------------------------------
export const roomDZ = (f) => (f < BEATS.lunge ? 0 : LUNGE * easeOutBack(progress(f, [BEATS.lunge, BEATS.lunge + 9]), 1.1));
export const roomZ = (zRel, f) => zRel + roomDZ(f);

// --- the wall schedule (both walls mirror each other: inner face at ±wallInner) --------------------
const lin = (t) => t;
export const WALL_MOVES = [
  // L1: a slow grind, then the slam
  { start: BEATS.grind, end: BEATS.slam1 - 3, to: 1.15, ease: easeInOut },
  { start: BEATS.slam1 - 3, end: BEATS.crush1, to: CLOSED, ease: easeInCubic },
  { start: BEATS.reopen1, end: BEATS.reopen1 + 14, to: HW, ease: easeInOut },
  // L1 counter: the rogue kicks up between them; they slam on the empty room
  { start: BEATS.rogue1Close, end: BEATS.ventIn, to: 0.95, ease: easeInOut },
  { start: BEATS.ventIn, end: BEATS.slam2, to: CLOSED, ease: easeInCubic },
  { start: BEATS.reopen2, end: BEATS.reopen2 + 14, to: HW, ease: easeInOut },
  // L2 victim
  { start: BEATS.rogue2Grab + 6, end: BEATS.punt, to: 1.0, ease: easeInOut },
  { start: BEATS.crush2 - 5, end: BEATS.crush2, to: CLOSED, ease: easeInCubic },
  { start: BEATS.reopen3, end: BEATS.reopen3 + 14, to: HW, ease: easeInOut },
  // L2 counter: stalled on the beam
  { start: BEATS.wedge + 4, end: BEATS.stall, to: 1.1, ease: easeInCubic },
  // L3: back off for the upgrade, press in, fold
  { start: BEATS.backOff, end: BEATS.backOff + 12, to: 1.36, ease: easeInOut },
  { start: BEATS.pressIn, end: BEATS.touchL, to: 1.1, ease: easeInOut },
  { start: BEATS.fold, end: BEATS.fold + 12, to: CLOSED, ease: easeInCubic },
  { start: BEATS.cubeOpen, end: BEATS.cubeOpen + 12, to: HW, ease: easeInOut },
  // L3 counter: the mage blinks out before they meet
  { start: BEATS.mageGrab + 4, end: BEATS.slam4, to: CLOSED, ease: easeInCubic },
  { start: BEATS.reopen4, end: BEATS.reopen4 + 14, to: HW, ease: easeInOut },
  // L4 victim: a steady squeeze while the orb rallies
  { start: BEATS.mageBack + 6, end: BEATS.crush5 - 3, to: HALF.mage + 0.02, ease: lin },
  { start: BEATS.crush5 - 3, end: BEATS.crush5 + 1, to: CLOSED, ease: easeInCubic },
  { start: BEATS.reopen5, end: BEATS.reopen5 + 14, to: HW, ease: easeInOut },
  // L5: they swallow the party, then spring back after the launch
  { start: BEATS.swallow - 6, end: BEATS.swallow + 2, to: 0.45, ease: easeInCubic },
  { start: BEATS.launch + 12, end: BEATS.launch + 30, to: HW, ease: easeInOut },
];
export function wallInner(f) {
  let v = HW;
  for (const m of WALL_MOVES) {
    if (f < m.start) break;
    v = lerp(v, m.to, m.ease(progress(f, [m.start, m.end])));
    if (f < m.end) break;
  }
  return v;
}
/** A shudder on stalls, sparks and press hits (visual only). */
export const wallShudder = (f) => [BEATS.stall, BEATS.touchL, BEATS.circuit, BEATS.pressL, BEATS.pressR].reduce((s, at) => {
  const t = f - at;
  return t < 0 ? s : s + 0.025 * Math.sin(t * 2.4) * Math.exp(-t / 7);
}, 0);

// The pedestal sinks while a trap runs (out of the walls' way) and comes back up with a fresh coin.
export const TRAP_RUNS = [
  [BEATS.goblinGrab + 2, BEATS.reopen1 + 14],
  [BEATS.rogue1Grab + 2, BEATS.reopen2 + 14],
  [BEATS.rogue2Grab + 2, BEATS.reopen3 + 14],
  [BEATS.paladinGrab + 2, BEATS.cubeOpen + 12],
  [BEATS.mageGrab + 2, BEATS.reopen4 + 14],
  [BEATS.mageBack + 4, BEATS.reopen5 + 14],
];
export const pedestalSink = (f) => TRAP_RUNS.reduce((s, [a, b]) => {
  if (f < a || f >= b + 14) return s;
  return Math.max(s, easeInCubic(progress(f, [a, a + 6])) * (1 - easeInOut(progress(f, [b, b + 14]))));
}, 0);

// --- walkers, solved back from the frame they must arrive ------------------------------------------
export const walkWindow = (arrive, from, to, speed) => [arrive - Math.round(Math.abs(to - from) / speed), arrive];
export const GOBLIN_RUN = walkWindow(BEATS.goblinGrab - 8, ENTRY_Z, GRAB_Z, JOG);
export const ROGUE1_RUN = walkWindow(BEATS.rogue1Grab - 6, ENTRY_Z, GRAB_Z, SPRINT);
export const ROGUE2_RUN = walkWindow(BEATS.rogue2Grab - 4, ENTRY_Z, GRAB_Z, SPRINT);
export const PALADIN_Z = GRAB_Z + 0.25;
export const PALADIN_RUN = walkWindow(BEATS.paladinGrab - 6, ENTRY_Z, PALADIN_Z, 0.14);
export const MAGE_RUN = walkWindow(BEATS.mageGrab - 6, ENTRY_Z, GRAB_Z, 0.1);
export const MAGE_BACK = walkWindow(BEATS.mageBack, MAGE_WAIT[1], GRAB_Z, 0.1);
export const PARTY_WALK = PARTY.map((p) => walkWindow(BEATS.partyArrive - p.delay * 0.5, ENTRY_Z, p.z, WALK));

// --- the rogue's wall-run: kicks off alternate walls, then up into the vent ------------------------
export const KICKS = 4;
export const CLIMB_TOP = 1.55; // feet height after the last kick: the next hop takes him into the vent
export function wallRun(f, win, slips = []) {
  const t = progress(f, win);
  const k = Math.min(KICKS - 1, Math.floor(t * KICKS));
  const local = t * KICKS - k;
  const side = k % 2 === 0 ? -1 : 1;
  const reach = (ff) => Math.max(0.15, wallInner(ff) - 0.32);
  const from = k === 0 ? 0 : -side * reach(f);
  const to = side * reach(f);
  let y = lerp((k / KICKS) * CLIMB_TOP, ((k + 1) / KICKS) * CLIMB_TOP, local) + arc(local, 0.35);
  for (const [a, b, drop] of slips) if (f >= a) y -= drop * easeOutCubic(progress(f, [a, b])); // slides back down the grease
  return { x: lerp(from, to, easeInOut(local)), y: Math.max(0, y), side, local, k };
}

// --- the paladin's beam -----------------------------------------------------------------------------
export const BEAM_L = 2.2;
export const BEAM_Y = 2.35;
/** Beam centre (room-relative), its length and the buckle angle once the press folds it. */
export function beamState(f) {
  const half = BEAM_L / 2;
  if (f < BEATS.wedge) return { y: 1.15, half, buckle: 0, visible: true, carried: true };
  if (f < BEATS.fold) {
    const up = easeOutBack(progress(f, [BEATS.wedge, BEATS.wedge + 14]));
    return { y: lerp(1.15, BEAM_Y, up), half, buckle: 0, visible: true, carried: false };
  }
  const inner = wallInner(f);
  return { y: BEAM_Y, half, buckle: Math.acos(Math.min(1, inner / half)), visible: inner > 0.25, carried: false };
}

// --- the orb (L4): rallies between the closing mirrors, faster every bounce -------------------------
const ORB_START = BEATS.orbOut;
const ORB_XS = [];
export const BOUNCES = [];
{
  let x = 0, dir = -1;
  for (let f = ORB_START; f <= BEATS.crush5; f++) {
    const v = lerp(0.1, 0.42, progress(f, [ORB_START, BEATS.crush5]));
    const lim = Math.max(0, wallInner(f) - ORB_R);
    x += dir * v;
    if (Math.abs(x) >= lim) {
      x = Math.sign(x || dir) * lim;
      dir = -Math.sign(x || dir);
      BOUNCES.push(f);
    }
    ORB_XS.push(x);
  }
}
export const orbX = (f) => ORB_XS[Math.max(0, Math.min(ORB_XS.length - 1, Math.round(f) - ORB_START))];
export const PONG_BEEPS = BOUNCES.filter((f, i) => i === 0 || f - BOUNCES[i - 1] >= 3);

// --- the pole (L5): safe taps on the hallway floor, then one tile too far ---------------------------
export const POLE_HAND = [PARTY[0].x + 0.3, 1.12, PARTY[0].z - 0.35];
export const POLE_TAPS = [0, 1, 2, 3].map((i) => ({ at: BEATS.pokes + i * 13, z: 2.0 - i * 0.32 }));
export const TILE_Z = FRONT_Z - 0.35; // the room's first floor tile
export function poleTip(f) {
  const x = PARTY[0].x + 0.1;
  for (let i = 0; i < POLE_TAPS.length; i++) {
    if (f < POLE_TAPS[i].at) {
      const prev = i === 0 ? { at: POLE_TAPS[0].at - 10, z: 2.4 } : POLE_TAPS[i - 1];
      const t = progress(f, [prev.at, POLE_TAPS[i].at]);
      return [x, i === 0 ? lerp(0.6, 0, easeInCubic(t)) : arc(t, 0.25), lerp(prev.z, POLE_TAPS[i].z, easeInOut(t))];
    }
  }
  const last = POLE_TAPS[POLE_TAPS.length - 1];
  if (f < BEATS.fatalTap - 14) return [x, 0.3 * easeInOut(progress(f, [last.at + 2, last.at + 12])), last.z];
  if (f < BEATS.lunge) {
    const t = progress(f, [BEATS.fatalTap - 14, BEATS.fatalTap]);
    return [x, Math.max(0, 0.3 * (1 - t) + arc(t, 0.12)), lerp(last.z, TILE_Z, easeInOut(t))];
  }
  return null; // dropped
}

// --- the party in the finale --------------------------------------------------------------------------
/** After the walls swallow them: squeezed together, then fired up the chute. Room-relative x, world z. */
export function partyFlight(f, i) {
  const p = PARTY[i];
  const squeeze = easeInCubic(progress(f, [BEATS.swallow - 6, BEATS.swallow + 2]));
  const x = lerp(p.x, (i - 1) * 0.12, squeeze);
  const ventZ = roomZ(VENT.z, f);
  const z = lerp(p.z, ventZ + (i - 1) * 0.1, squeeze * 0.35);
  const l0 = BEATS.launch + i * 3;
  if (f < l0) return { pos: [x, 0, z], phase: "squeeze" };
  const t = progress(f, [l0, l0 + 9]);
  return { pos: [lerp(x, 0, t), easeInCubic(t) * (BOX_TOP + 2), lerp(z, ventZ, t)], phase: t < 1 ? "rise" : "gone" };
}
/** Out of the chute into the Mimic's mouth (in its lair). */
export function lairFlight(f, i) {
  const a = BEATS.chute + 2 + i * 4, b = BEATS.into + 2 + i * 3;
  if (f < a) return null;
  const t = clamp01((f - a) / (b - a));
  const p0 = [CHUTE_EXIT[0] + (i - 1) * 0.15, -0.6, CHUTE_EXIT[2]];
  const c = [CHUTE_EXIT[0] + (i - 1) * 0.35, 3.3 + i * 0.2, (CHUTE_EXIT[2] + MIMIC_MOUTH[2]) / 2];
  const p1 = [MIMIC_MOUTH[0] + (i - 1) * 0.18, MIMIC_MOUTH[1] + 0.1, MIMIC_MOUTH[2] + 0.05];
  const q = (k) => (1 - t) ** 2 * p0[k] + 2 * (1 - t) * t * c[k] + t * t * p1[k];
  return { pos: [q(0), q(1), q(2)], t, done: f >= b };
}

// --- safety net: a re-voice must not break the order of events ---------------------------------------
{
  const fail = (m) => { throw new Error(`[walls] ${m}`); };
  for (let i = 1; i < WALL_MOVES.length; i++) if (WALL_MOVES[i].start < WALL_MOVES[i - 1].end) fail(`wall move ${i} starts before move ${i - 1} ends`);
  if (BEATS.reopen1 - BEATS.crush1 < 15) fail("goblin wafer not readable");
  if (ROGUE1_RUN[0] < BEATS.pancake1 - 40) fail("rogue enters before the goblin's flop");
  if (PALADIN_RUN[0] < BEATS.punt) fail("paladin enters before the punt");
  if (BEATS.into + 10 > BEATS.chomp) fail("party arrives after the chomp");
  for (const k of Object.keys(BEATS)) {
    const v = BEATS[k];
    for (const x of [].concat(v)) if (!(x < DURATION)) fail(`beat ${k} = ${x} is past the end`);
  }
}
