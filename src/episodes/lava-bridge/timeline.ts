import { HIP, arc, clamp01, createCues, easeInCubic, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit";
import { geyserHeight } from "../../artifacts/lava/LavaGeyser";
import { HALL_DOOR } from "../../artifacts/sets/HallDoor";
import { HUB_BREACH_X, HUB_DOOR_XS } from "../../artifacts/sets/FloorTwoHub";
import cues from "./data/narrationCues.json";

/**
 * Beats, geometry and motion for "Evolution of a Lava Bridge" (Season 2,
 * floor two). Pure functions of the frame only. Every story beat is
 * `w(line, word) ± offset`; every body is solved to be over the hazard on the
 * word that kills it.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Geometry: Scene, camera and SFX all read these, never their own copies.
// ---------------------------------------------------------------------------
/** Action plane: actors walk along x at z = Z, the camera looks at it from +z. */
export const Z = -0.6;
/** Entry door at the left end of the hall; the corridor beyond stays dry. */
export const HALL_LEFT = -10.6;
export const HALL_RIGHT = 10.6;
export const ENTRY_X = -10.2;
export const CEILING_Y = 5.9;
/** Lava pit between the entry ledge and the vault ledge; the lake drains over FALLS_X into a chasm. */
export const LAKE_L = -4.6;
export const FALLS_X = 2.8;
export const VAULT_LEDGE = 4.2;
export const LAVA_Y = -0.75;
export const LAVA_LOW_Y = -2.6;
/** Edge of the entry ledge where walkers stop or step onto the bridge. */
export const EDGE_X = LAKE_L - 0.25;
/** Treasure hoard under the vault arch on the right. */
export const VAULT_X = 7.2;
export const GOLD_PILE_X = 6.4;
/** Bridge: eight stone slabs from ledge to ledge, deck flush with the floor. */
export const SEG_W = (VAULT_LEDGE - LAKE_L) / 8;
export const SEG_XS = Array.from({ length: 8 }, (_, i) => LAKE_L + SEG_W * (i + 0.5));
export const SEG_T = 0.32;
/** Geysers in the lake; the third one sits where the floating mage is on "launches". */
export const GEYSER_XS = [-2.6, -0.6, 0.9] as const;
/** Back-wall vents that open for the flood (left half: the wave runs left to right). */
export const VENT_XS = [-7.4, -2.2] as const;
/** Level the flood settles at: over the floor, under the treasure mounds. */
export const FLOOD_Y = 0.32;
/** Cold open: the barbarian lands in floor two's hub, in front of door I. */
export const BARB_LAND_X = HUB_BREACH_X;
export const DOOR_I_X = HUB_DOOR_XS[0];
export const BARB_SEG = 1;
/** The second rogue is stranded on this slab. */
export const ROGUE2_SEG = 3;
export const BARD_X = -11.2;
/** Walking pace in world units per frame (jogging ~0.14, sprint ~0.2). */
export const WALK = 0.09;
export const MAGE_FLOAT_Y = 1.3;
/** Geyser column height (LavaGeyser default) and the surf board's feet height on the lava. */
export const GEYSER_H = 2.6;
export const BOARD_Y = LAVA_Y + 0.14;

// ---------------------------------------------------------------------------
// Beats (all derived from narration words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Cold open: the barbarian punches through floor one into floor two's hub,
  // and door I (the lava hall) swings open for him.
  punch: w("cold", "punch"),
  land: w("cold", "floor") + 4,
  doorOpen: w("l1a", "welcome"),
  hubWide: w("l1a", "floor"),

  // Level 1 - lava lake and a crumbling bridge.
  lavaRise: w("l1a", "lava") - 6,
  bridgeRise: w("l1a", "bridge"),
  crumbleDemo: w("l1a", "crumbles"),
  barbWalk: w("l1a", "step"),
  stomp: w("l1b", "stomps"),
  barbSlabDrop: w("l1b", "on") + 4,
  barbDrop: w("l1b", "drops"),
  barbSplash: w("l1b", "straight") + 4,
  barbBones: w("l1b", "lava"),

  // Counter: the show-off rogue outruns the collapse.
  bridgeReset: lineStart("l1c") - 22,
  rogueSprint: w("l1c", "sprints"),
  lastGapFalls: w("l1c", "falls"),
  backflip: w("l1c", "backflips"),
  bow: w("l1c", "gap") + 4,
  dive: w("l1c", "dives"),
  coins: w("l1c", "gold"),

  // Level 2 - collapse from both ends.
  bridgeRise2: w("l2a", "make"),
  bothEnds: w("l2a", "ends"),
  collapse: w("l2a", "rogue") - 8,
  stranded: w("l2a", "stranded"),
  sink: w("l2a", "sinks") - 14,
  rogue2Under: w("l2a", "sinks") + 8,

  // Counter: the mage floats over.
  mageFloat: w("l2b", "floats"),

  // Level 3 - geysers.
  geyserInstall: w("l3a", "install"),
  geyserDemo: w("l3a", "geysers"),
  launch: w("l3a", "launches"),
  mageSplash: w("l3a", "sky-high") + 26,

  // Counter: the paladin surfs the shield and rides the geysers.
  surf: w("l3b", "surfs"),
  ride1: w("l3b", "rides"),
  ride2: w("l3b", "like"),

  // Level 4 - the current and the lava waterfall.
  current: w("l4a", "current"),
  overFalls: w("l4a", "over"),
  waterfall: w("l4a", "waterfall"),

  // Counter: the second mage brings his party, freezes the lake, they all stroll across.
  freeze: w("l4b", "freezes"),
  frozen: w("l4b", "solid"),
  party: w("l4b", "party"),
  stroll: w("l4b", "stroll"),

  // Level 5 - cracks, vents, the flood.
  cracks: w("l5a", "cracks"),
  ventsOpen: w("l5a", "open"),
  wave: w("l5a", "wave"),
  mageEngulfed: w("l5a", "lava") - 2,
  flooded: w("l5a", "chamber") + 10,

  // Cameo: the bard peeks in, plays a sad note, backs away.
  bardPeek: w("l5b", "peeks"),
  bardPlay: w("l5b", "plays"),
  sadNote: w("l5b", "sad"),
  bardBack: w("l5b", "backs"),

  stamp: w("end", "unbeatable"),
  // Comment hook: the stamp cracks on "Unless" and splits on "prove".
  crackStamp: w("cta", "unless"),
  dare: w("cta", "prove"),
} as const;

/** Stage badges pop at the start of each level's install line (after the title card). */
export const STAGE_STARTS = [
  Math.max(84, lineStart("l1a")),
  lineStart("l2a"),
  lineStart("l3a"),
  lineStart("l4a"),
  lineStart("l5a"),
];

// ---------------------------------------------------------------------------
// Bridge slabs. Each slab drops into the lava when its frame comes, and the
// whole bridge rises back for level 2. After level 2 it stays down for good.
// ---------------------------------------------------------------------------
export const DROP_LEN = 22;

/** Rogue 1: jogs in, sprints the bridge from the edge, backflips over the last slab. */
export const ROGUE_SPRINT_X0 = EDGE_X;
export const ROGUE_FLIP_X0 = SEG_XS[6] + 0.2;
export const ROGUE_FLIP_X1 = VAULT_LEDGE + 0.55;
export const ROGUE_FLIP: [number, number] = [BEATS.backflip - 2, BEATS.backflip + 20];
export const ROGUE_ENTER: [number, number] = [BEATS.bridgeReset + 4, BEATS.rogueSprint];
export const ROGUE_ON_CAMERA = ROGUE_ENTER[0] + Math.round(((ROGUE_ENTER[1] - ROGUE_ENTER[0]) * 1.6) / (ROGUE_SPRINT_X0 - ENTRY_X));
export const ROGUE_DIVE: [number, number] = [BEATS.dive - 4, BEATS.coins];

export const rogueX = (frame: number) => {
  if (frame < ROGUE_ENTER[1]) return lerp(ENTRY_X, ROGUE_SPRINT_X0, progress(frame, ROGUE_ENTER));
  if (frame < ROGUE_FLIP[0]) return lerp(ROGUE_SPRINT_X0, ROGUE_FLIP_X0, progress(frame, [ROGUE_ENTER[1], ROGUE_FLIP[0]]));
  if (frame < ROGUE_DIVE[0]) return lerp(ROGUE_FLIP_X0, ROGUE_FLIP_X1, easeInOut(progress(frame, ROGUE_FLIP)));
  return lerp(ROGUE_FLIP_X1, GOLD_PILE_X, progress(frame, ROGUE_DIVE));
};

/** Frame a slab starts to fall during the rogue's sprint: right behind his heels. */
const sprintDrop = (i: number) => {
  if (i === 7) return BEATS.lastGapFalls;
  const t = (SEG_XS[i] + SEG_W * 0.5 - ROGUE_SPRINT_X0) / (ROGUE_FLIP_X0 - ROGUE_SPRINT_X0);
  return Math.round(lerp(ROGUE_ENTER[1], ROGUE_FLIP[0], t)) + 3;
};

/** Level 2 collapse order: the two end slabs first, then inward, leaving ROGUE2_SEG. */
const BOTH_ENDS_ORDER = [
  [0, 7],
  [1, 6],
  [2, 5],
  [4],
] as const;
const bothEndsDrop = (i: number) => {
  if (i === ROGUE2_SEG) return BEATS.sink;
  const k = BOTH_ENDS_ORDER.findIndex((pair) => (pair as readonly number[]).indexOf(i) >= 0);
  return BEATS.collapse + k * 9;
};

export interface Slab {
  x: number;
  y: number;
  tilt: number;
  /** 0..1 glowing cracks (the trap arming under a foot). */
  crack: number;
  /** 0..1 red rune glow on the end slabs ("both ends"). */
  rune: number;
  visible: boolean;
}

const fall = (frame: number, at: number, i: number) => {
  const t = clamp01((frame - at) / DROP_LEN);
  return { y: -2.4 * easeInCubic(t), tilt: (i % 2 ? 1 : -1) * 0.5 * t, gone: frame >= at + DROP_LEN };
};
const rise = (frame: number, at: number, i: number) => easeOutBack(progress(frame, [at + i * 3, at + i * 3 + 16]));

export const slab = (i: number, frame: number): Slab => {
  const x = SEG_XS[i];
  const base: Slab = { x, y: 0, tilt: 0, crack: 0, rune: 0, visible: true };
  // Level 1 install: rise out of the lava, one after another.
  if (frame < BEATS.barbSlabDrop || i !== BARB_SEG) {
    if (frame < BEATS.bridgeReset) {
      const r = rise(frame, BEATS.bridgeRise, i);
      const demo = i === 0 ? Math.max(0, 1 - Math.abs(frame - BEATS.crumbleDemo - 8) / 14) : 0;
      const crack = i === BARB_SEG ? clamp01((frame - BEATS.stomp) / 16) : demo;
      return { ...base, y: lerp(-2.4, 0, r), visible: frame >= BEATS.bridgeRise + i * 3, crack };
    }
  }
  if (frame < BEATS.bridgeReset) {
    const f = fall(frame, BEATS.barbSlabDrop, i);
    return { ...base, y: f.y, tilt: f.tilt, crack: 1, visible: !f.gone };
  }
  // Reset for the rogue (only the barbarian's slab was missing).
  if (frame < BEATS.bridgeRise2 - 4) {
    const drop = sprintDrop(i);
    if (frame >= drop) {
      const f = fall(frame, drop, i);
      return { ...base, y: f.y, tilt: f.tilt, crack: 1, visible: !f.gone };
    }
    const r = i === BARB_SEG ? easeOutBack(progress(frame, [BEATS.bridgeReset, BEATS.bridgeReset + 16])) : 1;
    return { ...base, y: lerp(-2.4, 0, r), crack: clamp01((frame - drop + 10) / 10) };
  }
  // Level 2: rises again with runes on both ends, then collapses inward.
  const drop = bothEndsDrop(i);
  const runeOn = i === 0 || i === 7 ? clamp01((frame - BEATS.bothEnds + 4) / 8) : 0;
  if (frame >= drop) {
    if (i === ROGUE2_SEG) {
      const t = progress(frame, [BEATS.sink, BEATS.rogue2Under + 6]);
      return { ...base, y: lerp(0, LAVA_Y - SEG_T - 0.1, easeInOut(t)) - 0.03 * Math.sin(frame * 0.5), crack: 1, visible: t < 1 };
    }
    const f = fall(frame, drop, i);
    return { ...base, y: f.y, tilt: f.tilt, crack: 1, rune: runeOn, visible: !f.gone };
  }
  const r = rise(frame, BEATS.bridgeRise2, i);
  return { ...base, y: lerp(-2.4, 0, r), rune: runeOn, crack: clamp01((frame - drop + 8) / 8), visible: frame >= BEATS.bridgeRise2 + i * 3 };
};

// ---------------------------------------------------------------------------
// Lava surface: rises on install, flows after the current, freezes left to
// right, cracks, and the flood fills the hall.
// ---------------------------------------------------------------------------
export const lavaY = (frame: number) => lerp(LAVA_LOW_Y, LAVA_Y, easeOutCubic(progress(frame, [BEATS.lavaRise, BEATS.lavaRise + 40])));
export const lavaGlow = (frame: number) => progress(frame, [BEATS.lavaRise, BEATS.lavaRise + 30]);
/** x of the frost front sweeping across the lake. */
export const frostX = (frame: number) => lerp(LAKE_L - 0.4, VAULT_LEDGE + 0.4, easeOutCubic(progress(frame, [BEATS.freeze, BEATS.frozen + 6])));
/** Current strength 0..1: drags the crust, the skeletons and the surfer toward the falls. */
export const currentK = (frame: number) => easeInOut(progress(frame, [BEATS.current - 6, BEATS.current + 30]));
/** Distance a floating thing has drifted downstream by `frame`. */
export const drift = (frame: number) => {
  const a = BEATS.current - 6;
  if (frame <= a) return 0;
  // Integral of a speed that ramps up to 0.075 units/frame.
  const ramp = 36;
  const v = 0.075;
  const t = frame - a;
  return t < ramp ? (v * t * t) / (2 * ramp) : v * (ramp / 2 + (t - ramp));
};
/** Wave front x: from the left wall, over the strolling mage on his beat, past the vault. */
export const WAVE: [number, number] = [BEATS.wave - 8, BEATS.flooded];
export const waveX = (frame: number) => {
  if (frame < BEATS.mageEngulfed) return lerp(HALL_LEFT - 0.5, MAGE2_STOP_X, easeInCubic(progress(frame, [WAVE[0], BEATS.mageEngulfed])));
  return lerp(MAGE2_STOP_X, HALL_RIGHT + 0.5, easeOutCubic(progress(frame, [BEATS.mageEngulfed, WAVE[1]])));
};
export const waveRun = (frame: number) => progress(frame, WAVE);

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------
/** The cold open plays in the hub; the lava hall takes over as the lava rises. */
export const HUB_CUT = BEATS.lavaRise - 6;
/**
 * Barbarian: falls from the hole in the hub at BARB_LAND_X, walks to door I and
 * into its dark passage (he is gone before HUB_CUT), then comes out of the lava
 * hall's entry door and plods onto slab BARB_SEG.
 */
export const BARB_FALL: [number, number] = [BEATS.punch + 2, BEATS.land];
export const HUB_WALK: [number, number] = [BEATS.doorOpen + 4, BEATS.doorOpen + 4 + Math.round((BARB_LAND_X - DOOR_I_X) / WALK)];
const PASSAGE_Z = HALL_DOOR.z - 0.9;
export const HUB_IN: [number, number] = [HUB_WALK[1], Math.min(HUB_CUT - 4, HUB_WALK[1] + Math.round((Z - PASSAGE_Z) / 0.08))];
export const hubBarb = (frame: number): [number, number] => [
  lerp(BARB_LAND_X, DOOR_I_X, progress(frame, HUB_WALK)),
  lerp(Z, PASSAGE_Z, progress(frame, HUB_IN)),
];
export const BARB_WALK: [number, number] = [Math.max(HUB_CUT + 2, BEATS.stomp - Math.round((SEG_XS[BARB_SEG] - ENTRY_X) / 0.085)), BEATS.stomp];
export const BARB_ON_CAMERA = BARB_WALK[0] + Math.round(1.6 / 0.085);
export const barbX = (frame: number) => lerp(ENTRY_X, SEG_XS[BARB_SEG], progress(frame, BARB_WALK));
/** Feet height during the cartoon pause in mid-air and the drop into the lava. */
export const barbY = (frame: number) => {
  if (frame < BEATS.barbDrop) return 0;
  const t = frame - BEATS.barbDrop;
  return Math.max(LAVA_Y - 0.5, -0.012 * t * t - 0.02 * t);
};
export const BARB_SPLASH = BEATS.barbDrop + Math.round((-0.02 + Math.sqrt(0.0004 + 4 * 0.012 * -LAVA_Y)) / (2 * 0.012));

/** Rogue 2: jogs in and reaches the middle slab just before the collapse. */
export const ROGUE2_ENTER: [number, number] = [BEATS.collapse - Math.round((SEG_XS[ROGUE2_SEG] - ENTRY_X) / 0.125), BEATS.collapse - 2];
export const ROGUE2_ON_CAMERA = ROGUE2_ENTER[0] + 14;
export const rogue2X = (frame: number) => lerp(ENTRY_X, SEG_XS[ROGUE2_SEG], progress(frame, ROGUE2_ENTER));

/** Mage 1: walks to the edge, then floats out so he is over geyser 3 on "launches". */
export const MAGE1_ENTER: [number, number] = [BEATS.mageFloat - Math.round((EDGE_X - ENTRY_X) / WALK), BEATS.mageFloat];
export const MAGE1_FLOAT: [number, number] = [BEATS.mageFloat, BEATS.launch];
export const MAGE1_ON_CAMERA = MAGE1_ENTER[0] + 16;
export const mage1X = (frame: number) => {
  if (frame < MAGE1_ENTER[1]) return lerp(ENTRY_X, EDGE_X, progress(frame, MAGE1_ENTER));
  if (frame < BEATS.launch) return lerp(EDGE_X, GEYSER_XS[2], progress(frame, MAGE1_FLOAT));
  return lerp(GEYSER_XS[2], GEYSER_XS[2] + 0.5, progress(frame, [BEATS.launch, BEATS.mageSplash]));
};
export const mage1Y = (frame: number) => {
  if (frame < MAGE1_ENTER[1]) return 0;
  if (frame < BEATS.launch) return MAGE_FLOAT_Y * easeOutCubic(progress(frame, [MAGE1_FLOAT[0], MAGE1_FLOAT[0] + 20])) + 0.08 * Math.sin(frame * 0.12);
  // Launched far above the frame, then back down into the lake.
  const t = progress(frame, [BEATS.launch, BEATS.mageSplash]);
  return lerp(MAGE_FLOAT_Y, LAVA_Y, t) + arc(t, 9);
};

/** Paladin: walks in, hops onto his shield and surfs; two geysers lift him on the beats. */
export const PAL_ENTER: [number, number] = [BEATS.surf - 8 - Math.round((EDGE_X - ENTRY_X) / 0.1), BEATS.surf - 8];
export const PAL_ON_CAMERA = PAL_ENTER[0] + 16;
export const SURF_X0 = LAKE_L + 0.5;
export const SURF_HOP: [number, number] = [BEATS.surf - 8, BEATS.surf + 6];
export const RIDE_LEN = 26;
const SURF_KEYS: Array<[number, number]> = [
  [SURF_HOP[1], SURF_X0],
  [BEATS.ride1, GEYSER_XS[1]],
  [BEATS.ride2, GEYSER_XS[2]],
  [BEATS.ride2 + RIDE_LEN + 8, GEYSER_XS[2] + 0.35],
];
export const OVER_FALLS = BEATS.overFalls;
export const palX = (frame: number) => {
  if (frame < SURF_HOP[0]) return lerp(ENTRY_X, EDGE_X, progress(frame, PAL_ENTER));
  if (frame < SURF_HOP[1]) return lerp(EDGE_X, SURF_X0, progress(frame, SURF_HOP));
  const last = SURF_KEYS[SURF_KEYS.length - 1];
  if (frame < last[0]) {
    let k = 0;
    while (frame >= SURF_KEYS[k + 1][0]) k++;
    const [fa, xa] = SURF_KEYS[k];
    const [fb, xb] = SURF_KEYS[k + 1];
    return lerp(xa, xb, progress(frame, [fa, fb]));
  }
  // Carried by the current: reaches the lip on "over", then keeps going out.
  if (frame < OVER_FALLS) return lerp(last[1], FALLS_X, easeInCubic(progress(frame, [Math.max(last[0], BEATS.current - 6), OVER_FALLS])));
  return FALLS_X + (frame - OVER_FALLS) * 0.05;
};
/** Board height above the lava: bobbing, the two geyser rides, then the drop down the falls. */
export const palY = (frame: number) => {
  if (frame < SURF_HOP[0]) return 0;
  if (frame < SURF_HOP[1]) {
    const t = progress(frame, SURF_HOP);
    return lerp(0, BOARD_Y, t) + arc(t, 0.7);
  }
  if (frame >= OVER_FALLS) {
    const t = frame - OVER_FALLS;
    return BOARD_Y - 0.01 * t * t;
  }
  // Sits on the column top while over the vent, slides off as he moves on.
  const x = palX(frame);
  const ride = (at: number, gx: number) => {
    const h = geyserHeight(frame, at - 4);
    return h > 0 ? (GEYSER_H * h + 0.25) * clamp01(1 - Math.abs(x - gx) / 0.9) : 0;
  };
  return BOARD_Y + 0.04 * Math.sin(frame * 0.22) + Math.max(ride(BEATS.ride1, GEYSER_XS[1]), ride(BEATS.ride2, GEYSER_XS[2]));
};

/**
 * Mage 2 and his party: they file in behind him, wait while he casts the
 * freeze, then hop down one after another and stroll across the ice in a
 * line, a step in front of the dead geyser vents (PARTY_Z) so nobody walks
 * through a cone.
 */
export const MAGE2_ENTER: [number, number] = [BEATS.freeze - 10 - Math.round((EDGE_X - ENTRY_X) / WALK), BEATS.freeze - 10];
export const MAGE2_ON_CAMERA = MAGE2_ENTER[0] + 16;
export const MAGE2_HOP: [number, number] = [BEATS.stroll - 6, BEATS.stroll + 8];
export const MAGE2_STOP_X = 0.5;
export const MAGE2_WALK: [number, number] = [MAGE2_HOP[1], MAGE2_HOP[1] + Math.round((MAGE2_STOP_X - (LAKE_L + 0.6)) / 0.07)];
export const PARTY_Z = Z + 0.8;
/** Marching order: each member follows the leader's path `delay` frames later, at least `GAP` behind. */
export const PARTY = [
  { cls: "mage", delay: 0 },
  { cls: "rogue", delay: 12 },
  { cls: "paladin", delay: 24 },
  { cls: "barbarian", delay: 36 },
] as const;
const GAP = 0.95;
const HOP_X0 = EDGE_X;
const HOP_X1 = LAKE_L + 0.6;
const leaderX = (frame: number) => {
  if (frame < MAGE2_HOP[0]) return lerp(ENTRY_X, EDGE_X, progress(frame, MAGE2_ENTER));
  if (frame < MAGE2_HOP[1]) return lerp(HOP_X0, HOP_X1, progress(frame, MAGE2_HOP));
  return lerp(HOP_X1, MAGE2_STOP_X, progress(frame, MAGE2_WALK));
};
export const memberX = (i: number, frame: number): number => {
  const own = leaderX(frame - PARTY[i].delay);
  return i === 0 ? own : Math.min(own, memberX(i - 1, frame) - GAP);
};
/** On screen once their delayed path has started. */
export const memberIn = (i: number, frame: number) => frame - PARTY[i].delay >= MAGE2_ENTER[0];
/** 0..1 through the hop down onto the ice (by position, so a held-back member never floats). */
export const memberHop = (i: number, frame: number) => clamp01((memberX(i, frame) - HOP_X0) / (HOP_X1 - HOP_X0));
export const memberY = (i: number, frame: number) => {
  const t = memberHop(i, frame);
  return lerp(0, LAVA_Y, t) + arc(t, 0.5);
};
export const memberZ = (i: number, frame: number) => lerp(Z, PARTY_Z, memberHop(i, frame));
export const memberStopX = (i: number) => MAGE2_STOP_X - i * GAP;
export const mage2X = (frame: number) => memberX(0, frame);

/** First frame the wave front has passed `x` (members are taken from the back of the line). */
export const engulfAt = (x: number) => {
  for (let f = WAVE[0]; f <= WAVE[1]; f++) if (waveX(f) >= x - 0.1) return f;
  return WAVE[1];
};

/** Bard: steps into the doorway (dry corridor), plays, backs out. */
export const BARD_ENTER: [number, number] = [BEATS.bardPeek - 22, BEATS.bardPeek];
export const BARD_BACK: [number, number] = [BEATS.bardBack, BEATS.bardBack + 40];
export const bardX = (frame: number) => {
  if (frame < BARD_BACK[0]) return lerp(BARD_X - 1.6, BARD_X, easeOutCubic(progress(frame, BARD_ENTER)));
  return lerp(BARD_X, BARD_X - 2.2, easeInOut(progress(frame, BARD_BACK)));
};

/** Skeletons bob where their owners went under and drift with the current. */
export const floater = (x0: number, since: number, frame: number) => {
  if (frame < since) return null;
  const x = x0 + drift(frame);
  const over = x > FALLS_X;
  const y = over ? LAVA_Y - 6 * (x - FALLS_X) ** 2 : LAVA_Y + 0.05 * Math.sin(frame * 0.15 + x0);
  return { x, y, rise: easeOutCubic(progress(frame, [since, since + 14])), gone: y < LAVA_Y - 4 };
};

export { HIP };
