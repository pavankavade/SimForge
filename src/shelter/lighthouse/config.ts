import type { CameraPose, CameraWaypoint, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit/sfx";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  BLASTS,
  BLOW_OUT,
  CAPTAIN1_FLY,
  DECK_Y,
  DURATION,
  HORN_IN,
  IGNITE,
  LAMP_Y,
  LENS_IN,
  MIRROR_IN,
  MIRROR_OUT,
  OTHERS_LIT,
  OTHERS_RISE,
  RELIGHT,
  RISE,
  ROOF_DROP,
  ROOM_FRAME,
  SPIN_START,
  WIND,
  lineEnd,
  lineStart,
  ship2,
  w,
} from "./timeline";
import { shipPoint } from "./components/Ship";

const sfx = sfxFor("lighthouse", "shelter");

// ---------------------------------------------------------------------------
// Camera, in the bunker's language: front-on from the sea side, each shot a
// slow move A -> B over [start, end]; the gap to the next shot is a whip.
// fov 50: at distance d the frame is about 0.52·d wide and 0.93·d tall.
// ---------------------------------------------------------------------------

const P = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });

interface Shot {
  start: number;
  end: number;
  a: CameraPose;
  b: CameraPose;
}

/** Captain 2 on deck, for the close-ups on "can't tell" and the chart. */
const cap2 = (f: number) => shipPoint(ship2(f), [0.45, 0.55, 0.2]);
const capShot = (f: number, dz: number): CameraPose => {
  const c = cap2(f);
  return P([c[0] + 0.7, 2.1, c[2] + dz], [c[0], 1.35, c[2]]);
};

const SHOTS: Shot[] = [
  // Night on the beach: a keeper, a candle, ships out at sea
  { start: 0, end: BEATS.candle - 8, a: P([1.2, 2.4, 10.5], [0.6, 1.8, -4]), b: P([0.4, 1.9, 8.5], [-0.3, 1.4, -3]) },
  // "a candle won't do": the keeper and the tiny candle
  { start: BEATS.candle - 4, end: BEATS.light - 8, a: P([-1.3, 1.4, 4.8], [-1.3, 0.9, -1.3]), b: P([-1.3, 1.3, 4.2], [-1.3, 0.9, -1.3]) },
  // "so you light a big fire on the beach"
  { start: BEATS.light - 4, end: lineStart("l1b") - 6, a: P([-0.9, 2.0, 7.4], [-1.2, 1.3, -2]), b: P([-0.9, 2.2, 8.4], [-1.2, 1.4, -2]) },
  // "can't be seen from far away": from behind the ship, the fire is a dot
  { start: lineStart("l1b") - 2, end: w("l1b", "and") - 6, a: P([28, 1.5, 0.5], [-1, 1.0, -2.5]), b: P([27, 1.4, 0.3], [-1, 1.0, -2.5]) },
  // "...sails straight onto the rocks"
  { start: w("l1b", "and") - 2, end: lineStart("l2a") - 10, a: P([6.6, 2.0, 10.5], [6.0, 0.9, -2.2]), b: P([6.0, 1.9, 9.2], [5.4, 0.9, -2.2]) },
  // "So you build a tall stone tower": back on the beach, then ride it up
  { start: lineStart("l2a") - 6, end: RISE[0], a: P([-0.6, 1.7, 7.4], [-1.2, 1.4, -2]), b: P([-0.6, 1.6, 7.0], [-1.2, 1.4, -2]) },
  { start: RISE[0] + 1, end: RISE[1] + 4, a: P([-0.6, 1.6, 7.0], [-1.2, 1.4, -2]), b: P([0.6, 4.8, 12.5], [-1.0, 4.4, -2]) },
  { start: RISE[1] + 5, end: lineStart("l2b") - 8, a: P([0.6, 4.8, 12.5], [-1.0, 4.4, -2]), b: P([0.5, 4.9, 11.6], [-1.0, 4.5, -2]) },
  // "Now ships can see it for miles": from far out at sea again
  { start: lineStart("l2b") - 4, end: BEATS.wind - 40, a: P([28, 2.0, 0.5], [-1, 4.0, -2.5]), b: P([27, 2.0, 0.3], [-1, 4.0, -2.5]) },
  // "the wind blows the flame right out"
  { start: BEATS.wind - 36, end: lineStart("l3a") - 10, a: P([0.4, DECK_Y + 1.6, 5.8], [-1.2, DECK_Y + 0.9, -2]), b: P([0.2, DECK_Y + 1.5, 5.0], [-1.2, DECK_Y + 0.9, -2]) },
  // "seal the flame inside a room made of glass"
  { start: lineStart("l3a") - 4, end: lineStart("l3b") - 10, a: P([0.4, DECK_Y + 2.0, 7.0], [-1.2, DECK_Y + 1.1, -2]), b: P([0.3, DECK_Y + 1.9, 6.2], [-1.2, DECK_Y + 1.1, -2]) },
  // "shines everywhere ... sky ... ground": wide for the rays
  { start: lineStart("l3b") - 4, end: lineStart("l4a") - 10, a: P([1.0, LAMP_Y - 0.5, 15.5], [-0.9, LAMP_Y - 0.6, -2]), b: P([0.9, LAMP_Y - 0.5, 14], [-0.9, LAMP_Y - 0.6, -2]) },
  // "curved mirrors ... bounce that light back out to sea"
  { start: lineStart("l4a") - 4, end: lineStart("l4b") - 8, a: P([1.6, LAMP_Y + 0.4, 8.5], [0.4, LAMP_Y, -2]), b: P([1.5, LAMP_Y + 0.3, 7.5], [0.4, LAMP_Y, -2]) },
  // "a Fresnel lens. Rings of glass": close on the lens
  { start: lineStart("l4b") - 4, end: BEATS.beam - 38, a: P([0.0, LAMP_Y + 0.5, 3.6], [-1.1, LAMP_Y, -2]), b: P([-0.2, LAMP_Y + 0.4, 2.9], [-1.1, LAMP_Y, -2]) },
  // "one bright beam": out wide over the sea
  { start: BEATS.beam - 34, end: lineStart("l5a") - 10, a: P([2.5, LAMP_Y - 0.5, 15], [2.5, LAMP_Y - 0.8, -3]), b: P([2.5, LAMP_Y - 0.6, 13.5], [2.5, LAMP_Y - 0.8, -3]) },
  // "every lighthouse on the coast now looks the same"
  { start: lineStart("l5a") - 4, end: BEATS.cantTell - 24, a: P([4, 8.5, 24], [3, 3.5, -24]), b: P([4, 8.0, 22], [3, 3.5, -24]) },
  // "...captains can't tell which one they're seeing"
  { start: BEATS.cantTell - 20, end: lineStart("l5b") - 10, a: capShot(BEATS.cantTell - 20, 5.5), b: capShot(lineStart("l5b") - 10, 4.8) },
  // "So you make the lens turn, with its own flash pattern"
  { start: lineStart("l5b") - 4, end: BEATS.two - 14, a: P([0.6, LAMP_Y + 0.8, 8.5], [-1.2, LAMP_Y, -2]), b: P([0.5, LAMP_Y + 0.7, 7.5], [-1.2, LAMP_Y, -2]) },
  // "Two quick flashes": head-on from the sea
  { start: BEATS.two - 10, end: lineStart("l5c") - 8, a: P([-1.2, 3.5, 22], [-1.2, LAMP_Y - 1, -2]), b: P([-1.2, 3.6, 20], [-1.2, LAMP_Y - 1, -2]) },
  // "Captains look it up on their charts, and know exactly where they are"
  { start: lineStart("l5c") - 4, end: lineStart("l6a") - 10, a: capShot(lineStart("l5c") - 4, 5.4), b: capShot(lineStart("l6a") - 10, 4.6) },
  // "Then the fog rolls in"
  { start: lineStart("l6a") - 4, end: lineStart("l6b") - 6, a: P([3.6, 4.0, 17], [2.4, 3.4, -3]), b: P([3.4, 4.0, 15.5], [2.2, 3.4, -3]) },
  // "So you add a horn"
  { start: lineStart("l6b") - 2, end: BEATS.blasts - 6, a: P([1.4, DECK_Y + 1.2, 6.8], [0.0, DECK_Y + 0.5, -2]), b: P([1.3, DECK_Y + 1.1, 6.0], [0.0, DECK_Y + 0.5, -2]) },
  // "...that blasts every thirty seconds": the horn turns the ship away
  { start: BEATS.blasts - 2, end: lineStart("end") - 8, a: P([4.4, 4.2, 19], [4.4, 3.0, -4]), b: P([4.4, 4.0, 17.5], [4.4, 3.0, -4]) },
  // Congratulations: pull back to the whole lighthouse, beam sweeping
  { start: lineStart("end") - 4, end: DURATION, a: P([1.0, 4.6, 15], [0.4, 4.0, -3]), b: P([2.5, 6.5, 26], [1.5, 3.6, -6]) },
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
  loopCue(sfx("waves", 0, 0.16), DURATION, 30),

  // L1: candle, bonfire, the wreck
  sfx("ignite", IGNITE[0], 0.55),
  loopCue(sfx("fire_loop", IGNITE[0] + 6, 0.16), BLOW_OUT[1], 10),
  sfx("crunch", BEATS.crash, 0.7),
  sfx("splash", BEATS.crash + 2, 0.45),
  sfx("whoosh", CAPTAIN1_FLY[0], 0.35),
  sfx("thud", CAPTAIN1_FLY[1], 0.45),

  // L2: the tower pushes up; the wind blows the flame out
  sfx("stone_wall", RISE[0], 0.55),
  sfx("rumble", RISE[0], 0.35, { durationInFrames: 40, fadeOutFrames: 12 }),
  sfx("thud", RISE[1] - 6, 0.5),
  sfx("wind_gust", WIND[0], 0.55),
  sfx("fire_extinguish", BLOW_OUT[0], 0.55),

  // L3: relight, lantern room, rays
  sfx("ignite", RELIGHT[0], 0.4),
  sfx("clank", ROOM_FRAME[0] + 4, 0.45),
  sfx("glass", BEATS.glass, 0.5),
  sfx("clang", ROOF_DROP[1], 0.5),
  sfx("sparkle", BEATS.lanternRoom, 0.35),
  sfx("hum", BEATS.shines - 6, 0.35),
  sfx("whoosh", BEATS.sky - 2, 0.3),
  sfx("whoosh", BEATS.ground - 2, 0.3),

  // L4: mirrors, the lens, the beam
  sfx("clank", MIRROR_IN[1] - 4, 0.45),
  sfx("zap", BEATS.bounce, 0.35),
  sfx("whoosh", MIRROR_OUT[0], 0.35),
  sfx("clang", LENS_IN[1] - 6, 0.45),
  sfx("glass", LENS_IN[1], 0.4),
  sfx("sparkle", BEATS.rings, 0.4),
  sfx("whoosh_big", BEATS.beam - 8, 0.45),
  sfx("hum", BEATS.beam - 6, 0.4),

  // L5: copycat towers, the lens turns, two flashes, the chart
  sfx("stone_wall", OTHERS_RISE[0], 0.35),
  sfx("ding", OTHERS_LIT, 0.3),
  loopCue(sfx("gears", SPIN_START, 0.3), lineEnd("l5b") + 10, 10),
  sfx("ding", BEATS.two, 0.45),
  sfx("ding", BEATS.flash2, 0.45),
  sfx("pop", BEATS.charts - 4, 0.4),
  sfx("ding", BEATS.exactly, 0.4),

  // L6: fog, the foghorn
  sfx("wind_gust", BEATS.fog - 10, 0.3),
  sfx("clank", HORN_IN[1] - 4, 0.45),
  ...BLASTS.map((b) => sfx("foghorn", b, 0.7)),

  // Finale
  sfx("stamp", BEATS.congrats, 0.6),
  sfx("boom", BEATS.congrats + 4, 0.5),
];

export const config: EpisodeConfig = {
  id: "Lighthouse",
  title: "How a Candle Becomes a Lighthouse",
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
      { at: BEATS.crash, strength: 0.24, spread: 7 },
      { at: RISE[1] - 6, strength: 0.2, spread: 8 },
      { at: ROOF_DROP[1], strength: 0.1, spread: 5 },
      { at: LENS_IN[1] - 6, strength: 0.1, spread: 5 },
      ...BLASTS.map((b) => ({ at: b, strength: 0.14, spread: 8 })),
      { at: BEATS.congrats, strength: 0.16, spread: 8 },
    ],
    rumbles: [{ start: RISE[0], end: RISE[1], strength: 0.04 }],
  },
  audio: { src: "shelter/lighthouse/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "shelter/lighthouse/score_v1.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  // Same caption style as the other shorts: 4-5 word chunks, active word in yellow.
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.12) contrast(1.05)",
    vignette: false,
    fadeInFrames: 6,
    fadeOutFrames: 14,
    backgroundColor: "#14204a",
  },
  OverlayComponent: TrapHUD,
};

