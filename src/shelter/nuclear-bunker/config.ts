import type { CameraPose, CameraWaypoint, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit/sfx";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import { AIR_X, BEATS, BURY_FILL, CAVE_IN, DAD_HOP, DECK_Y, DURATION, EXIT_Y, HATCH_X, PIPE_DROP, SHAFT_X, SHED_X1, VALVE_Y, lineStart } from "./timeline";

const sfx = sfxFor("nuclear-bunker", "shelter");

// ---------------------------------------------------------------------------
// Camera, in the original's language: front-on to the cut face near lawn
// height, pushing into the pipe, tilting up to the sky for the bomb. Each shot
// is a slow move A -> B over [start, end]; the gap to the next shot's start is
// a whip (smoothstep over a few frames). fov 50: at distance d the frame is
// about 0.52·d wide and 0.93·d tall.
// ---------------------------------------------------------------------------

const P = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });

interface Shot {
  start: number;
  end: number;
  a: CameraPose;
  b: CameraPose;
}

const SHOTS: Shot[] = [
  // Dig a hole in your yard, climb in
  { start: 0, end: BEATS.bombDrops - 10, a: P([1.8, 2.6, 13.5], [1.2, -1.6, -2]), b: P([1.6, 2.1, 12], [1.2, -1.9, -2]) },
  // ...when the bomb drops: tilt up to the flash on the horizon
  { start: BEATS.bombDrops - 4, end: lineStart("l1b") - 10, a: P([1.2, 1.5, 10], [13, 3, -45]), b: P([1.2, 1.5, 10], [13, 6, -45]) },
  // You have a bunker. The walls cave in on top of you.
  { start: lineStart("l1b") - 4, end: lineStart("l2a") - 12, a: P([1.0, -2.6, 7.4], [0.7, -4.6, -1.6]), b: P([0.9, -3.0, 6.4], [0.7, -4.7, -1.6]) },
  // Drop in a steel pipe, bury it under three feet of dirt
  { start: lineStart("l2a") - 6, end: BEATS.explosion - 10, a: P([0.2, 1.6, 14.5], [0, -2.4, -2.5]), b: P([0.2, 1.0, 13], [0, -2.6, -2.5]) },
  // The explosion sucks dirt into the sky
  { start: BEATS.explosion - 4, end: BEATS.rains - 10, a: P([-1.5, 0.9, 9], [12, 11, -40]), b: P([-1.5, 0.9, 9], [12, 15, -40]) },
  // ...and it rains back down radioactive: fallout on the lawn
  { start: BEATS.rains - 4, end: lineStart("l3a") - 10, a: P([2.0, 1.3, 4.8], [1.5, -0.1, -6]), b: P([1.8, 1.1, 4.0], [1.5, -0.2, -6]) },
  // Every three and a half inches of dirt cuts the radiation in half
  { start: lineStart("l3a") - 4, end: lineStart("l3b") - 10, a: P([1.0, -0.2, 7.0], [1.0, -1.4, -1]), b: P([1.05, -0.4, 6.0], [1.1, -1.3, -1]) },
  // ...straight lines, right down your doorway: onto Dad
  { start: lineStart("l3b") - 4, end: lineStart("l4a") - 10, a: P([SHAFT_X + 0.7, -0.6, 7.6], [SHAFT_X + 0.3, -2.4, -0.6]), b: P([SHAFT_X + 0.6, -1.6, 5.8], [SHAFT_X + 0.1, -3.3, -0.6]) },
  // Bend the tunnel once, and then again; rays hit dirt
  { start: lineStart("l4a") - 4, end: lineStart("l4b") - 10, a: P([-3.0, 0.9, 10], [-3.0, -1.6, -1]), b: P([-3.0, 0.5, 8.8], [-3.0, -1.7, -1]) },
  // Ten people, hot and stale: inside the pipe
  { start: lineStart("l4b") - 4, end: lineStart("l5a") - 10, a: P([0, DECK_Y + 1.9, 6.6], [0, DECK_Y + 1.0, -3]), b: P([0, DECK_Y + 1.8, 4.6], [0, DECK_Y + 0.9, -3]) },
  // Air pipe to the surface, dust filter, hand-cranked fan
  { start: lineStart("l5a") - 4, end: lineStart("l5b") - 10, a: P([1.0, -0.4, 8], [1.0, -2.0, -1]), b: P([1.0, -1.3, 6.2], [1.0, -2.6, -1]) },
  // The next shockwave shoots straight down that pipe
  { start: lineStart("l5b") - 4, end: lineStart("l6a") - 10, a: P([2.6, 2.6, 12.5], [1.6, -0.8, -2]), b: P([2.3, 2.0, 11], [1.6, -1.0, -2]) },
  // The blast valve slams shut in thousandths of a second
  { start: lineStart("l6a") - 4, end: lineStart("l6b") - 10, a: P([AIR_X - 0.1, VALVE_Y + 0.9, 3.6], [AIR_X - 0.25, VALVE_Y + 0.05, 0.2]), b: P([AIR_X - 0.15, VALVE_Y + 0.8, 3.0], [AIR_X - 0.25, VALVE_Y + 0.05, 0.2]) },
  // The blast hits your door like a truck; hang it to open outward; slams tighter
  { start: lineStart("l6b") - 4, end: lineStart("l7a") - 10, a: P([SHED_X1 + 3.6, 1.4, 3.8], [SHED_X1 + 0.3, 0.9, -1.0]), b: P([SHED_X1 + 3.0, 1.2, 3.0], [SHED_X1 + 0.2, 0.9, -1.0]) },
  // Rubble piles up against it: you are trapped
  { start: lineStart("l7a") - 4, end: lineStart("l7b") - 10, a: P([SHED_X1 + 3.4, 2.2, 4.4], [SHED_X1 + 0.5, 0.5, -1.0]), b: P([SHED_X1 + 3.0, 1.8, 3.6], [SHED_X1 + 0.4, 0.5, -1.0]) },
  // Dig a second tunnel up to a hatch in the yard
  { start: lineStart("l7b") - 4, end: lineStart("l8a") - 10, a: P([3.9, -1.2, 10], [3.9, -2.7, -1]), b: P([4.2, -0.8, 8.8], [4.3, -2.2, -1]) },
  // You cannot see radiation: peeking out of the hatch
  { start: lineStart("l8a") - 4, end: lineStart("l8b") - 10, a: P([HATCH_X - 1.6, 1.0, 3.6], [HATCH_X, 0.25, -0.6]), b: P([HATCH_X - 1.2, 0.8, 2.9], [HATCH_X, 0.25, -0.6]) },
  // Hang a counter by the ladder that clicks: the Geiger counter
  { start: lineStart("l8b") - 4, end: lineStart("l8c") - 10, a: P([HATCH_X + 0.4, EXIT_Y + 2.4, 3.6], [HATCH_X + 0.15, EXIT_Y + 1.9, -0.3]), b: P([HATCH_X + 0.35, EXIT_Y + 2.3, 2.7], [HATCH_X + 0.2, EXIT_Y + 2.0, -0.3]) },
  // Stuck down there for years? Not even close: inside, everyone settles
  { start: lineStart("l8c") - 4, end: lineStart("l9a") - 10, a: P([0, DECK_Y + 1.9, 6.4], [0, DECK_Y + 1.0, -3]), b: P([0, DECK_Y + 1.85, 5.4], [0, DECK_Y + 0.95, -3]) },
  // Fallout decays overnight: the whole yard, night falls and lifts
  { start: lineStart("l9a") - 4, end: lineStart("l9b") - 10, a: P([0.6, 1.4, 13], [0.5, -1.8, -2]), b: P([0.6, 1.0, 12], [0.5, -2.0, -2]) },
  // Supplies, bunk beds, canned food, crank radio, board game: inside the pipe
  { start: lineStart("l9b") - 4, end: lineStart("end") - 10, a: P([0, DECK_Y + 2.0, 6.8], [0, DECK_Y + 0.9, -3]), b: P([0, DECK_Y + 1.8, 4.4], [0, DECK_Y + 0.8, -3]) },
  // Congratulations: pull back to the whole bunker
  { start: lineStart("end") - 4, end: DURATION, a: P([0.3, -2.2, 7], [0.2, -3.4, -2]), b: P([0.5, 1.6, 16.5], [0.3, -2.2, -2]) },
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

  // L1: digging, the hop in, the bomb, the cave-in
  ...[0, 1, 2, 3, 4, 5].map((i) => sfx("dust", BEATS.dig + i * 6, 0.22)),
  sfx("whoosh", DAD_HOP[0], 0.35),
  sfx("thud", DAD_HOP[1], 0.45),
  sfx("rumble", BEATS.bombDrops, 0.3, { durationInFrames: 40, fadeOutFrames: 16 }),
  sfx("dirt_collapse", CAVE_IN[0], 0.65),
  sfx("thud", CAVE_IN[0] + 12, 0.4),

  // L2: the pipe drops in and is buried; the explosion; fallout
  sfx("whoosh_big", PIPE_DROP[0], 0.45),
  sfx("clang", PIPE_DROP[1], 0.65),
  sfx("dust", BURY_FILL[0], 0.45),
  sfx("dirt_collapse", BURY_FILL[0] + 10, 0.35),
  sfx("boom", BEATS.explosion, 0.75),
  loopCue(sfx("rumble", BEATS.explosion + 4, 0.35), BEATS.rains, 20),
  sfx("sizzle", BEATS.rains, 0.25, { durationInFrames: 50, fadeOutFrames: 14 }),
  sfx("geiger", BEATS.radioactive, 0.3, { durationInFrames: 36, fadeOutFrames: 10 }),

  // L3: half-value layers, rays down the doorway
  sfx("zap", BEATS.halfRays, 0.45),
  sfx("ding", BEATS.stops, 0.4),
  sfx("zap", BEATS.doorwayRays, 0.45),
  sfx("whoosh", BEATS.doorway - 4, 0.4),

  // L4: the tunnel bends; ten people squeeze in
  sfx("clank", BEATS.bend, 0.55),
  sfx("clank", BEATS.again, 0.5),
  sfx("air_hiss", BEATS.stale, 0.4),

  // L5: air pipe and hand-cranked fan; the shockwave
  sfx("clank", BEATS.airPipe, 0.45),
  loopCue(sfx("ratchet", BEATS.fan, 0.4), BEATS.fan + 60, 10),
  sfx("whoosh_big", BEATS.shockwave, 0.65),

  // L6: blast valve, blast door
  sfx("valve_slam", BEATS.valveSlams, 0.75),
  sfx("slam", BEATS.truck, 0.7),
  sfx("gate", BEATS.outward, 0.55),

  // L7: rubble, second tunnel and hatch
  sfx("dirt_collapse", BEATS.rubble - 4, 0.6),
  sfx("dust", BEATS.dig2, 0.45),
  sfx("hatch", BEATS.hatchOpen, 0.6),

  // L8: the Geiger counter clicks
  sfx("geiger", BEATS.clicks, 0.55, { durationInFrames: 108, fadeOutFrames: 12 }),

  // L9-L10: decay, supplies, furniture
  sfx("sparkle", BEATS.decay + 20, 0.35),
  sfx("pop", BEATS.supplies, 0.35),
  sfx("thud", BEATS.beds + 10, 0.45),
  sfx("radio_static", BEATS.radio, 0.35, { durationInFrames: 40, fadeOutFrames: 10 }),

  // Finale
  sfx("stamp", BEATS.congrats, 0.6),
  sfx("boom", BEATS.congrats + 4, 0.5),
];

export const config: EpisodeConfig = {
  id: "NuclearBunker",
  title: "How a Hole in Your Yard Becomes a Nuclear Bunker",
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
      { at: PIPE_DROP[1], strength: 0.3, spread: 7 },
      { at: CAVE_IN[0] + 4, strength: 0.18, spread: 8 },
      { at: BEATS.explosion + 6, strength: 0.22, spread: 10 },
      { at: BEATS.valveSlams, strength: 0.2, spread: 6 },
      { at: BEATS.truck + 4, strength: 0.26, spread: 7 },
      { at: BEATS.congrats, strength: 0.16, spread: 8 },
    ],
    rumbles: [{ start: BEATS.explosion, end: BEATS.rains, strength: 0.05 }],
  },
  audio: { src: "shelter/nuclear-bunker/narration_v2.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "shelter/nuclear-bunker/score_v2.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  // Same caption style as the dungeon-trap episodes: 4-5 word chunks, active word in yellow.
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.1) contrast(1.04)",
    vignette: false,
    fadeInFrames: 6,
    fadeOutFrames: 14,
    backgroundColor: "#8fc0ee",
  },
  OverlayComponent: TrapHUD,
};
