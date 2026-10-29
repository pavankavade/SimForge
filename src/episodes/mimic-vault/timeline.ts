import { createCues, easeInOut, easeOutBack, lerp, progress } from "../../kit";
import { vaultJaw } from "../../artifacts/mimic/MimicVault";
import { HALL_DOOR } from "../../artifacts/sets/HallDoor";
import { HUB_DOOR_XS } from "../../artifacts/sets/FloorTwoHub";
import cues from "./data/narrationCues.json";

/**
 * Beats, geometry and motion for "Evolution of a Mimic Vault" (Season 2,
 * floor two, door II). Pure functions of the frame only. Every story beat is
 * `w(line, word) ± offset`; the jaw is solved to shut on the word that kills.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Geometry: Scene, camera and SFX all read these, never their own copies.
// ---------------------------------------------------------------------------
/** Action plane: actors walk along x at z = Z, the camera looks at it from +z. */
export const Z = -0.6;
/** Entry door at the left end of the vault hall (the passage from the hub). */
export const HALL_LEFT = -6.4;
export const HALL_RIGHT = 10.6;
export const ENTRY_X = HALL_LEFT + 0.4;
export const CEILING_Y = 5.9;
/** The vault's jaw: lip toward the hall, hinge high at the back. */
export const LIP_X = 2.2;
export const HINGE_X = 9.6;
export const HINGE_Y = 3.1;
export const JAW = vaultJaw(LIP_X, HINGE_X, HINGE_Y);
export const VAULT_MID = (LIP_X + HINGE_X) / 2;
/** The hoard sits deep in the mouth, where the shut jaw still clears it. */
export const HOARD_X = 7.6;
export const OLD_CHEST_X = LIP_X + 0.9;
/** Where victims stand when the jaw shuts, and where the rogue grabs. */
export const BARB_SPOT = LIP_X + 1.8;
export const GRAB_X = LIP_X + 2.3;
/** Bodies end up on the tongue, behind the walking lane. */
export const TONGUE_Z = Z - 0.75;
/** Outside the lip, where the rogue watches the bites and bows. */
export const WAIT_X = LIP_X - 1.8;

/** Cold open: floor two's hub, door I sealed, the barbarian picks door II. */
export const HUB_BARB_X = HUB_DOOR_XS[0] + 1.6;
export const DOOR_II_X = HUB_DOOR_XS[1];
export const SEAL_X = HUB_DOOR_XS[0];

export const WALK = 0.09;
export const RUN = 0.15;
export const DART = 0.22;

// ---------------------------------------------------------------------------
// Beats (all derived from narration words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Cold open: door I is sealed (he burns a finger on it), door II opens.
  sealed: w("cold", "sealed"),
  picks: w("cold", "picks"),
  doorOpen: w("cold", "number"),

  // Level 1 - the vault wakes up and bites.
  mimic: w("l1a", "mimic"),
  oldChest: w("l1a", "chest"),
  eyesOpen: w("l1a", "whole"),
  teethOut: w("l1a", "vault"),
  charges: w("l1a", "charges"),
  chomp: w("l1a", "chomped"),
  reveal: w("l1a", "chomped") + 30,

  // Counter: the show-off rogue times the bites.
  rogue: w("l1b", "rogue"),
  times: w("l1b", "times"),
  bites: w("l1b", "bites"),
  darts: w("l1b", "darts"),
  grabs: w("l1b", "grabs"),
  gold: w("l1b", "gold"),
  bow: w("l1b", "takes"),

  // Levels 2-5 come next.
  l2: lineStart("l2a"),

  stamp: w("end", "unbeatable"),
  crackStamp: w("cta", "unless"),
  dare: w("cta", "prove"),
} as const;

/** Stage badges pop at the start of each level's first line (after the title card). */
export const STAGE_STARTS = [Math.max(84, lineStart("l1a")), lineStart("l2a"), lineStart("l3a"), lineStart("l4a"), lineStart("l5a")] as const;

// ---------------------------------------------------------------------------
// Cold open in the hub
// ---------------------------------------------------------------------------
/** The hub plays until the first vault line; door II's passage swallows him first. */
export const HUB_CUT = lineStart("l1a") + 4;
export const HUB_WALK: [number, number] = [BEATS.doorOpen + 2, BEATS.doorOpen + 2 + Math.round((DOOR_II_X - HUB_BARB_X) / WALK)];
const PASSAGE_Z = HALL_DOOR.z - 0.9;
export const HUB_IN: [number, number] = [HUB_WALK[1], Math.min(HUB_CUT - 2, HUB_WALK[1] + Math.round((Z - PASSAGE_Z) / 0.1))];
export const hubBarb = (frame: number): [number, number] => [
  lerp(HUB_BARB_X, DOOR_II_X, progress(frame, HUB_WALK)),
  lerp(Z, PASSAGE_Z, progress(frame, HUB_IN)),
];

// ---------------------------------------------------------------------------
// The jaw
// ---------------------------------------------------------------------------
/** Disguised as a plain vault: jaw half up, no teeth, eyes shut. */
const DISGUISE_OPEN = 0.6;

/** One bite: shut over 5 frames, hold 2, reopen over 8. Multiplies the base opening. */
const bite = (frame: number, at: number) => {
  const d = frame - at;
  if (d < -5 || d > 10) return 1;
  if (d <= 0) return 1 - easeInOut((d + 5) / 5);
  if (d <= 2) return 0;
  return easeInOut((d - 2) / 8);
};

/** Rogue (counter): jogs to the lip, darts in between bites, grabs, darts out, bows. */
export const ROGUE_ENTER: [number, number] = [BEATS.times - 6 - Math.round((WAIT_X - ENTRY_X) / 0.14), BEATS.times - 6];
export const ROGUE_ON_CAMERA = ROGUE_ENTER[0] + Math.round(1.6 / 0.14);
export const ROGUE_IN: [number, number] = [BEATS.darts, BEATS.darts + Math.round((GRAB_X - WAIT_X) / DART)];
export const ROGUE_OUT: [number, number] = [Math.max(BEATS.gold, ROGUE_IN[1] + 8), Math.max(BEATS.gold, ROGUE_IN[1] + 8) + Math.round((GRAB_X - WAIT_X) / DART)];
/** The jaw snaps shut right behind his heels. */
export const SNAP = ROGUE_OUT[1] + 2;

/** The bites he times: the last one reopens just as he darts. */
export const L1_BITES = [BEATS.times - 2, BEATS.times + 12, BEATS.darts - 10, SNAP, SNAP + 18, SNAP + 32] as const;

export const vaultOpen = (frame: number) => {
  if (frame < BEATS.eyesOpen) return DISGUISE_OPEN;
  // Wakes: a huge yawn as the teeth come out.
  if (frame < BEATS.chomp - 6) {
    const yawn = lerp(DISGUISE_OPEN, 1, easeOutBack(progress(frame, [BEATS.eyesOpen, BEATS.teethOut + 14])));
    return Math.min(1.05, yawn) - 0.03 * Math.sin(frame * 0.12) * progress(frame, [BEATS.teethOut + 14, BEATS.teethOut + 30]);
  }
  // Chomp, then chew with the barbarian inside.
  if (frame < BEATS.chomp) return lerp(1, 0, progress(frame, [BEATS.chomp - 6, BEATS.chomp]) ** 2);
  if (frame < BEATS.reveal) return 0.14 * Math.abs(Math.sin((frame - BEATS.chomp) * 0.28));
  // Opens back up (bones on the tongue), then the bites the rogue times.
  const base = lerp(0.1, 0.92, easeOutBack(progress(frame, [BEATS.reveal, BEATS.reveal + 12])));
  return L1_BITES.reduce((o, at) => o * bite(frame, at), base);
};

export const vaultTeeth = (frame: number) => easeOutBack(progress(frame, [BEATS.teethOut - 2, BEATS.teethOut + 10]));
export const vaultEyes = (frame: number) => easeOutBack(progress(frame, [BEATS.eyesOpen, BEATS.eyesOpen + 6]), 2.2);

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------
/** Barbarian: charges in from the entry door and reaches the gold just before the jaw shuts. */
export const BARB_RUN: [number, number] = [BEATS.chomp - 10 - Math.round((BARB_SPOT - ENTRY_X) / RUN), BEATS.chomp - 10];
export const BARB_ON_CAMERA = BARB_RUN[0] + Math.round(1.6 / RUN);
export const barbX = (frame: number) => lerp(ENTRY_X, BARB_SPOT, progress(frame, BARB_RUN));

export const rogueX = (frame: number) => {
  if (frame < ROGUE_ENTER[1]) return lerp(ENTRY_X, WAIT_X, progress(frame, ROGUE_ENTER));
  if (frame < ROGUE_IN[0]) return WAIT_X;
  if (frame < ROGUE_OUT[0]) return lerp(WAIT_X, GRAB_X, progress(frame, ROGUE_IN));
  return lerp(GRAB_X, WAIT_X, progress(frame, ROGUE_OUT));
};
