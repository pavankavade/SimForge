import type { CameraPose, CameraWaypoint, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit/sfx";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  CHAINS_IN,
  CHARGE_GO,
  CLIMB_JUMP,
  CLIMB_SLIDE,
  DIG,
  DURATION,
  FLOOD,
  GATE_Z,
  JUMP5,
  LAY,
  LADDER_LAG,
  LIFT,
  MERLONS_UP,
  PATCH,
  PILE_UP,
  PORTCULLIS_DROP,
  PUSH_TIP,
  RAM_SLOTS,
  THIEF_GRAB,
  THIEF_HOP,
  THIEF_HOP2,
  THROW,
  TOPPLE,
  TOWER_RISE,
  TOWER_TOP,
  TOWER_ZS,
  WADE,
  WALL_BUILD,
  Z,
  ladderLanded,
  lineEnd,
  lineStart,
  pushAt,
  ramTip,
  splashFrame,
} from "./timeline";

const sfx = sfxFor("castle-wall", "shelter");

// ---------------------------------------------------------------------------
// Camera, in the lighthouse's language: each shot a slow move A -> B over
// [start, end]; the gap to the next shot is a whip. Side-on shots look along
// -z at the wall's cut face; the gate shots look down the moat.
// fov 50: at distance d the frame is about 0.52·d wide and 0.93·d tall.
// ---------------------------------------------------------------------------

const P = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
/** Side-on shot centred on (x, y) at distance d from the action plane. */
// Looks a little above the subject so the floor sits about a quarter up the frame, above the captions.
const side = (x: number, y: number, d: number, rise = 0.8): CameraPose => P([x, y + 1.0 + rise, Z + d], [x, y + 1.0, Z - 1]);

interface Shot {
  start: number;
  end: number;
  a: CameraPose;
  b: CameraPose;
}

const SHOTS: Shot[] = [
  // L1: the village and its sheep; the stones piled up; the thief scrambles over
  { start: 0, end: BEATS.pile - 10, a: side(-2.2, 1.0, 12.5, 1.6), b: side(-2.0, 1.0, 11, 1.4) },
  { start: BEATS.pile - 6, end: lineStart("l1b") - 8, a: side(-1.0, 0.9, 11.5, 1.4), b: side(-0.9, 0.9, 10.6, 1.3) },
  { start: lineStart("l1b") - 4, end: THIEF_HOP[0] - 6, a: side(2.6, 0.9, 11.5, 1.2), b: side(2.2, 0.9, 10.5, 1.1) },
  { start: THIEF_HOP[0] - 2, end: lineStart("l2a") - 8, a: side(-1.4, 1.0, 11.5, 1.2), b: side(-1.3, 1.0, 11, 1.2) },
  // L2: the courses rise (3/4 view down the wall); the climber; the ram
  { start: lineStart("l2a") - 4, end: lineStart("l2b") - 8, a: P([6.5, 5.0, 12], [0, 1.6, -3.5]), b: P([5.6, 4.6, 10.5], [0, 1.8, -3.5]) },
  { start: lineStart("l2b") - 4, end: BEATS.bring - 6, a: P([4.6, 2.2, 8.5], [1.0, 1.3, -1.2]), b: P([4.2, 2.1, 7.8], [1.0, 1.3, -1.2]) },
  { start: BEATS.bring - 2, end: BEATS.smash - 16, a: side(ramTip(BEATS.bring - 2) + 1.0, 1.0, 9.5), b: side(ramTip(BEATS.smash - 16) + 1.0, 1.0, 9.5) },
  { start: BEATS.smash - 12, end: lineStart("l3a") - 8, a: side(1.0, 1.4, 12.5, 1.0), b: side(0.9, 1.4, 11.8, 1.0) },
  // L3: patch from inside; dig and flood; the teeter, back-up and charge
  { start: lineStart("l3a") - 4, end: BEATS.dig - 8, a: P([-3.0, 2.0, 8.2], [-0.8, 1.3, -0.6]), b: P([-2.8, 1.9, 7.6], [-0.8, 1.3, -0.6]) },
  { start: BEATS.dig - 4, end: lineStart("l3b") - 10, a: side(4.0, 0.2, 12.5, 1.8), b: side(3.9, 0.2, 11.5, 1.6) },
  { start: lineStart("l3b") - 6, end: CHARGE_GO - 2, a: P([11.5, 5.6, 14.0], [3.0, 1.9, -1.2]), b: P([11.8, 5.4, 13.5], [3.4, 1.7, -1.2]) },
  { start: CHARGE_GO + 2, end: lineStart("l4a") - 10, a: side(4.4, 0.8, 14, 1.0), b: side(3.4, 0.6, 12.5, 1.0) },
  // L4: ladders arrive, laid across and climbed; battlements; pushed off
  { start: lineStart("l4a") - 6, end: LAY[0] - 4, a: side(6.2, 1.6, 15, 1.0), b: side(5.6, 1.6, 14, 1.0) },
  { start: LAY[0], end: lineStart("l4b") - 6, a: side(2.8, 2.0, 13.5, 1.0), b: side(2.7, 2.0, 12.8, 1.0) },
  { start: lineStart("l4b") - 2, end: BEATS.hide - 8, a: P([4.0, 7.0, 8.0], [0.2, 3.7, -4.5]), b: P([3.6, 6.6, 7.2], [0.2, 3.7, -4.5]) },
  { start: BEATS.hide - 4, end: pushAt(0) + PUSH_TIP - 2, a: side(1.4, 3.6, 8.5, 0.6), b: side(1.6, 3.4, 8.8, 0.6) },
  { start: pushAt(0) + PUSH_TIP + 2, end: lineStart("l5a") - 8, a: side(5.0, 1.6, 14.5, 1.0), b: side(5.2, 1.4, 14, 1.0) },
  // L5: wade across; the hiding gag; towers rise; the view along the wall; the rock
  { start: lineStart("l5a") - 4, end: BEATS.foot - 10, a: side(4.6, 1.0, 13.5, 1.0), b: side(3.8, 1.0, 12.5, 1.0) },
  { start: BEATS.foot - 6, end: lineEnd("l5a") + 4, a: P([4.8, 1.0, 7.6], [0.8, 2.3, -0.4]), b: P([4.4, 1.0, 7.0], [0.8, 2.4, -0.4]) },
  { start: lineEnd("l5a") + 8, end: BEATS.see - 12, a: P([10, 6.0, 9.5], [0.5, 2.6, -6]), b: P([9.4, 5.6, 8.6], [0.5, 2.8, -6]) },
  { start: BEATS.see - 8, end: THROW[0] - 18, a: P([2.7, TOWER_TOP + 3.0, TOWER_ZS[0] - 1.8], [1.1, 0.4, Z + 0.6]), b: P([2.6, TOWER_TOP + 2.8, TOWER_ZS[0] - 1.5], [1.1, 0.4, Z + 0.6]) },
  { start: THROW[0] - 14, end: lineEnd("l5b") + 10, a: P([13.6, 4.0, -0.8], [1.2, 3.0, -1.4]), b: P([13.0, 3.9, -0.9], [1.2, 3.0, -1.4]) },
  // L6: the gate from outside; the drawbridge; the portcullis from inside
  { start: lineStart("l6a") - 6, end: lineStart("l6b") - 8, a: P([10.4, 3.6, -1.6], [4.2, 1.5, GATE_Z]), b: P([9.8, 3.4, -2.0], [4.0, 1.5, GATE_Z]) },
  { start: lineStart("l6b") - 4, end: PORTCULLIS_DROP[0] - 8, a: P([10.2, 3.6, -1.4], [2.8, 1.8, GATE_Z]), b: P([9.8, 3.5, -1.8], [2.8, 1.9, GATE_Z]) },
  { start: PORTCULLIS_DROP[0] - 4, end: lineStart("end") - 8, a: P([-8.2, 2.8, -4.4], [-0.4, 2.3, GATE_Z]), b: P([-7.6, 2.8, -4.8], [-0.4, 2.3, GATE_Z]) },
  // Finale: pull back over the whole wall
  { start: lineStart("end") - 4, end: DURATION, a: P([10, 7, 13], [0.5, 2.0, -6]), b: P([14, 10, 21], [0.5, 2.4, -7]) },
];

const waypoints: CameraWaypoint[] = ([] as CameraWaypoint[]).concat(
  ...SHOTS.map((s) => [
    { frame: Math.round(s.start), ...s.a },
    { frame: Math.round(s.end), ...s.b },
  ]),
);

// ---------------------------------------------------------------------------
// Sound: every cue keyed to a beat.
// ---------------------------------------------------------------------------

const SFX: SfxCue[] = [
  sfx("stamp", 6, 0.45),

  // L1: sheep, stones, the thief
  sfx("bleat", BEATS.sheep, 0.45),
  sfx("stone_wall", PILE_UP[0] + 4, 0.5),
  sfx("thud", PILE_UP[0] + 14, 0.4),
  sfx("thud", PILE_UP[1] - 6, 0.4),
  sfx("whoosh", THIEF_HOP[0], 0.35),
  sfx("thud", THIEF_HOP[1], 0.35),
  sfx("bleat", THIEF_GRAB[0], 0.55),
  sfx("whoosh", THIEF_HOP2[0], 0.3),
  sfx("bleat", THIEF_HOP2[1] + 6, 0.4),

  // L2: courses, mortar, the climber, the ram
  sfx("stone_wall", WALL_BUILD[0], 0.55),
  sfx("rumble", WALL_BUILD[0], 0.3, { durationInFrames: WALL_BUILD[1] - WALL_BUILD[0], fadeOutFrames: 12 }),
  sfx("thud", WALL_BUILD[1], 0.5),
  sfx("sparkle", BEATS.mortar, 0.35),
  sfx("whoosh", CLIMB_JUMP[0], 0.3),
  sfx("slip", CLIMB_SLIDE[0], 0.45),
  sfx("thud", CLIMB_SLIDE[1], 0.4),
  sfx("boom", BEATS.smash, 0.6),
  sfx("crunch", BEATS.smash, 0.55),
  sfx("crack", BEATS.smash + 2, 0.4),

  // L3: patch, dig, flood, the charge into the water
  sfx("stone_wall", PATCH[0], 0.45),
  sfx("thud", PATCH[1], 0.4),
  sfx("trench_dig", DIG[0], 0.55),
  sfx("splash", FLOOD[0], 0.4),
  sfx("bubble", FLOOD[0] + 6, 0.3),
  sfx("whoosh", CHARGE_GO, 0.35),
  ...RAM_SLOTS.map((off, k) => sfx("splash", Math.round(splashFrame(off, k === 2 ? "barbarian" : "goblin")), k === 2 ? 0.65 : 0.45)),

  // L4: ladders, battlements, pushed off
  ...[0, 1].map((i) => sfx("clank", LAY[1] + i * LADDER_LAG * 0.5, 0.4)),
  sfx("stone_wall", MERLONS_UP[0], 0.45),
  sfx("pop", MERLONS_UP[0] + 6, 0.3),
  ...[0, 1].map((i) => sfx("whoosh", pushAt(i) + PUSH_TIP, 0.35)),
  ...[0, 1].map((i) => sfx("thud", ladderLanded(i), 0.5)),
  ...[0, 1].map((i) => sfx("crunch", ladderLanded(i), 0.25)),

  // L5: wade, towers, the rock
  sfx("splash", WADE[0] + 2, 0.3),
  sfx("stone_wall", TOWER_RISE[0], 0.55),
  sfx("rumble", TOWER_RISE[0], 0.35, { durationInFrames: 50, fadeOutFrames: 12 }),
  sfx("thud", TOWER_RISE[1] - 4, 0.45),
  sfx("whoosh", THROW[0], 0.35),
  sfx("helmet", BEATS.hiding, 0.55),
  sfx("splash", TOPPLE[1], 0.45),
  sfx("splash", JUMP5[1], 0.45),

  // L6: chains, the drawbridge, the portcullis
  sfx("chain", CHAINS_IN[0], 0.45),
  sfx("creak", LIFT[0], 0.5),
  sfx("slam", LIFT[1], 0.5),
  loopCue(sfx("splash", LIFT[1] + 8, 0.5), LIFT[1] + 40, 6),
  sfx("gate", PORTCULLIS_DROP[0], 0.4),
  sfx("clang", PORTCULLIS_DROP[1], 0.6),
  sfx("slam", PORTCULLIS_DROP[1], 0.4),

  // Finale
  sfx("stamp", BEATS.congrats, 0.6),
  sfx("boom", BEATS.congrats + 4, 0.5),
];

export const config: EpisodeConfig = {
  id: "CastleWall",
  title: "How a Pile of Stones Becomes a Castle Wall",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 50,
    near: 0.1,
    far: 400,
    initialPosition: SHOTS[0].a.position,
    waypoints,
    shake: [
      { at: BEATS.smash, strength: 0.3, spread: 8 },
      { at: PATCH[1], strength: 0.08, spread: 5 },
      ...[0, 1].map((i) => ({ at: ladderLanded(i), strength: 0.1, spread: 5 })),
      { at: TOWER_RISE[1] - 4, strength: 0.16, spread: 7 },
      { at: LIFT[1], strength: 0.14, spread: 6 },
      { at: PORTCULLIS_DROP[1], strength: 0.2, spread: 6 },
      { at: BEATS.congrats, strength: 0.16, spread: 8 },
    ],
    rumbles: [
      { start: WALL_BUILD[0], end: WALL_BUILD[1], strength: 0.03 },
      { start: DIG[0], end: DIG[1], strength: 0.025 },
      { start: TOWER_RISE[0], end: TOWER_RISE[1], strength: 0.04 },
    ],
  },
  audio: { src: "shelter/castle-wall/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "shelter/castle-wall/score_v1.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  // Same caption style as the other shorts: 4-5 word chunks, active word in yellow.
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.1) contrast(1.05)",
    vignette: false,
    fadeInFrames: 6,
    fadeOutFrames: 14,
    backgroundColor: "#8fc0ee",
  },
  OverlayComponent: TrapHUD,
};

