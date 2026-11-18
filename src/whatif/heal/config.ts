import { QP_R, hillY } from "../../artifacts/heal";
import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { chainTracks, crashZoom, loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { HealHUD } from "./HealHUD";
import { HILL, SHOT_GEOMETRY, TZ } from "./Scene";
import { BEATS, DURATION, LAND_X, QP_X, SKATE, Z, boardAt, easeInOut, kitHillX, lerp, lineStart, progress, shotEnd, shotStart, wagonX, type ShotId } from "./timeline";

const { KIT_CHAIR, TESS_AT, TRIP_X, LUNCH_TABLE_Z, POCKET, TEO_PANTRY, KIT_DESK, EXAM, BED_AT, STOVE, KIT_DIN, TESS_DIN, DZ, driveX } = SHOT_GEOMETRY;
const { KIT0, KIT_STOP, SIDEWALK_Z } = HILL;

const cue = sfxFor("heal", "whatif");
/** Effects sit about 6 dB under the voice, as in the rest of the series. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);

/** Every cue keys to a beat or shot boundary, never a literal frame. */
export const SFX: SfxCue[] = [
  sfx("stamp", 8, 0.4),
  sfx("heal", BEATS.healed, 0.3),
  sfx("stomach", BEATS.hungry, 0.5),
  // The paper cut
  sfx("snap", BEATS.slice, 0.25),
  sfx("heal", BEATS.edges, 0.3),
  loopCue(sfx("chomp", BEATS.eat, 0.3), BEATS.stares, 8),
  sfx("pop", BEATS.firstBowl + 8, 0.2),
  sfx("pop", BEATS.second + 8, 0.2),
  sfx("pop", BEATS.third + 8, 0.2),
  sfx("stomach", BEATS.hungryAgain, 0.45),
  // Healing is building
  sfx("pop", BEATS.skin, 0.2),
  sfx("pop", BEATS.vessels, 0.2),
  sfx("pop", BEATS.bone, 0.2),
  sfx("ding", BEATS.atOnce, 0.3),
  sfx("tick", BEATS.digest, 0.35),
  sfx("stomach", BEATS.fat, 0.35),
  // Always hungry
  sfx("thud", BEATS.knee - 2, 0.4),
  sfx("heal", BEATS.threeHours - 6, 0.25),
  sfx("chew", BEATS.candy + 6, 0.4),
  sfx("chomp", BEATS.lunch, 0.3),
  sfx("whoosh", BEATS.friends - 4, 0.2),
  sfx("chomp", BEATS.friends + 20, 0.3),
  sfx("rustle", BEATS.granola, 0.3),
  sfx("rustle", BEATS.peanut, 0.25),
  sfx("curtain", BEATS.grandpaBill - 6, 0.25),
  sfx("sizzle", BEATS.warm, 0.2),
  sfx("steam", BEATS.radiator, 0.3),
  // The broken arm
  loopCue(sfx("skate", SKATE.drop, 0.35), SKATE.lip, 4),
  sfx("whoosh", SKATE.drop + 4, 0.25),
  sfx("clank", SKATE.lip, 0.5),
  sfx("thud", SKATE.land, 0.6),
  sfx("crack", BEATS.crack, 0.8),
  sfx("thud", BEATS.crack + 4, 0.4),
  sfx("ding", BEATS.tenHours, 0.25),
  sfx("zap", BEATS.crooked, 0.25),
  sfx("engine", shotStart("drive"), 0.5),
  sfx("cast", BEATS.cast, 0.5),
  sfx("heal", BEATS.billNight, 0.35),
  sfx("sizzle", BEATS.fever, 0.25),
  sfx("stomach", BEATS.midnight, 0.5),
  sfx("stomach", BEATS.two, 0.45),
  sfx("stomach", BEATS.four, 0.5),
  sfx("sizzle", BEATS.pancakes, 0.35),
  loopCue(sfx("chomp", BEATS.pancakes + 20, 0.3), BEATS.runsOut, 8),
  sfx("ding", BEATS.whole, 0.3),
  // The wagon
  loopCue(sfx("wagon", BEATS.rolls, 0.4), BEATS.math, 10),
  sfx("slowmo", BEATS.math, 0.35),
  sfx("whoosh", BEATS.sprint, 0.3),
  loopCue(sfx("wagon", BEATS.sprint, 0.4), BEATS.grab, 6),
  sfx("clank", BEATS.grab, 0.4),
  loopCue(sfx("skate", BEATS.heels, 0.35), BEATS.curb, 4),
  sfx("curb", BEATS.curb, 0.8),
  sfx("heal", BEATS.alreadyHealing, 0.3),
  sfx("stomach", BEATS.starving, 0.5),
  // Dinner and the hook
  sfx("chomp", BEATS.turkeyLeg, 0.3),
  sfx("chomp", BEATS.secondOne, 0.3),
  sfx("whoosh", BEATS.slides, 0.2),
  sfx("stamp", BEATS.budget, 0.45),
  sfx("pop", BEATS.pie, 0.3),
  sfx("pop", BEATS.deal, 0.25),
  sfx("stamp", BEATS.subscribe, 0.5),
];

// ---------------------------------------------------------------------------
// Camera: one track per shot segment, hard cuts between them (chained so no drift).
// 16:9 at fov 40: at distance d the frame is ~1.3·d wide and ~0.73·d tall.
// ---------------------------------------------------------------------------
const pose = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
const mixPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
});
const ease = (f: number, a: number, b: number) => easeInOut(progress(f, [a, b]));
const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({ start, end, blend: 1, fn });
/** Side-on view of (x, y) on the plane z from distance d, a little above. */
const side = (x: number, y: number, d: number, rise = 0.5, z = Z): CameraPose => pose([x, y + rise, z + d], [x, y, z]);
/** A slow push from `a` to `b` over [start, end]. */
const push = (start: number, end: number, a: CameraPose, b: CameraPose = a): CameraTrack => track(start, end, (f) => mixPose(a, b, ease(f, start, end)));
/** Consecutive pushes: each entry starts a segment that runs to the next one's start (the last to `end`). */
const cuts = (end: number, list: [number, CameraPose, CameraPose?][]): CameraTrack[] =>
  list.map(([start, a, b], i) => push(start, i + 1 < list.length ? list[i + 1][0] : end, a, b ?? a));
const until = (id: ShotId) => shotEnd(id);

const kitHead: Vec3 = [KIT_CHAIR[0], 1.12, TZ];
const kitchen = cuts(until("kitchen"), [
  [0, side(0.0, 1.0, 5.6, 0.6, TZ), side(0.0, 1.0, 4.8, 0.5, TZ)],
  [BEATS.hungry - 4, pose([-0.4, 1.25, TZ + 1.6], kitHead), pose([-0.5, 1.22, TZ + 1.35], kitHead)],
  [lineStart("a3") - 6, side(-0.5, 0.95, 3.8, 0.4, TZ), side(-0.6, 0.95, 3.4, 0.4, TZ)],
  [BEATS.firstBowl - 4, pose([KIT_CHAIR[0] + 1.4, 1.2, TZ + 1.9], [KIT_CHAIR[0] + 0.15, 0.95, TZ - 0.1]), pose([KIT_CHAIR[0] + 1.2, 1.18, TZ + 1.6], [KIT_CHAIR[0] + 0.15, 0.95, TZ - 0.1])],
  [BEATS.stares - 4, pose([TESS_AT[0] - 0.3, 1.05, TESS_AT[2] + 2.0], [TESS_AT[0], 0.95, TESS_AT[2]]), pose([TESS_AT[0] - 0.25, 1.02, TESS_AT[2] + 1.7], [TESS_AT[0], 0.95, TESS_AT[2]])],
  [lineStart("a8") - 4, side(0.0, 1.1, 5.0, 0.5, TZ), side(-0.3, 1.1, 4.4, 0.5, TZ)],
]);

const body = cuts(until("body"), [
  [shotStart("body"), side(0.7, 1.0, 4.6, 0.4), side(0.7, 1.0, 4.2, 0.4)],
  [BEATS.foodSlow - 4, side(0.8, 0.95, 4.2, 0.35), side(0.8, 0.95, 3.8, 0.35)],
]);

const scrape = cuts(until("scrape"), [
  [shotStart("scrape"), side(TRIP_X - 0.6, 0.8, 5.2, 0.4), side(TRIP_X, 0.75, 4.6, 0.4)],
  [BEATS.threeHours - 6, side(TRIP_X + 0.4, 0.55, 3.0, 0.3), side(TRIP_X + 0.45, 0.55, 2.6, 0.3)],
]);
const lunch = [push(shotStart("lunch"), until("lunch"), side(0, 0.95, 3.8, 0.45, LUNCH_TABLE_Z), side(-0.1, 0.95, 3.3, 0.4, LUNCH_TABLE_Z))];
const pantry = cuts(until("pantry"), [
  [shotStart("pantry"), side(POCKET[0] - 0.1, 0.95, 4.0, 0.4, POCKET[2]), side(POCKET[0], 0.95, 3.5, 0.4, POCKET[2])],
  [BEATS.grandpaBill - 8, side((POCKET[0] + TEO_PANTRY[0]) / 2, 1.0, 4.4, 0.4, POCKET[2]), side((POCKET[0] + TEO_PANTRY[0]) / 2, 1.0, 4.0, 0.4, POCKET[2])],
]);
const deskHead: Vec3 = [KIT_DESK[0], 1.05, KIT_DESK[2] - 0.42];
const radiator = cuts(until("radiator"), [
  [shotStart("radiator"), side(0, 1.2, 7.0, 0.8, Z - 1.0), side(0, 1.2, 6.2, 0.7, Z - 1.0)],
  [BEATS.radiator - 8, pose([0.25, 1.2, deskHead[2] + 2.0], deskHead), pose([0.2, 1.18, deskHead[2] + 1.6], deskHead)],
]);

const deckKit: Vec3 = [QP_X - QP_R - 0.4, QP_R + 1.15, Z];
const boardCam = (f: number) => {
  const b = boardAt(f);
  return side(Math.max(b.x + 0.8, QP_X - 1.2), Math.max(0.9, b.y + 0.6), 6.0, 0.4);
};
const skate = cuts(until("skate"), [
  [shotStart("skate"), side(-0.8, 1.3, 9.2, 0.8), side(-0.8, 1.3, 8.4, 0.7)],
  [BEATS.worst - 4, pose([deckKit[0] + 1.6, deckKit[1] - 0.1, Z + 3.6], deckKit), pose([deckKit[0] + 1.4, deckKit[1] - 0.1, Z + 3.2], deckKit)],
  [SKATE.drop - 2, side(-1.0, 1.1, 8.0, 0.6)],
  [SKATE.land - 2, side(LAND_X + 0.3, 0.6, 3.8, 0.35), side(LAND_X + 0.4, 0.5, 3.4, 0.3)],
]);
const skateOver = [track(SKATE.drop + 6, SKATE.lip - 2, boardCam), crashZoom(BEATS.crack - 1, until("skate"), pose([LAND_X + 0.5, 0.9, Z + 2.6], [LAND_X + 0.6, 0.3, Z]), { zoom: 1.4 })];

const xray = cuts(until("xray"), [
  [shotStart("xray"), side(0.9, 1.0, 4.4, 0.4), side(0.9, 1.0, 4.0, 0.4)],
  [BEATS.remembers - 6, side(0.4, 1.0, 5.0, 0.4), side(0.4, 1.0, 4.4, 0.4)],
]);
const drive = [track(shotStart("drive"), until("drive"), (f) => pose([driveX(f) + 1.2, 1.5, Z + 5.4], [driveX(f), 0.95, Z]))];
const clinic = cuts(until("clinic"), [
  [shotStart("clinic"), side(EXAM[0] + 0.7, 0.95, 4.4, 0.4, EXAM[2] + 0.5), side(EXAM[0] + 0.7, 0.95, 3.9, 0.4, EXAM[2] + 0.5)],
  [BEATS.tomorrow - 6, pose([EXAM[0] + 0.7, 1.05, EXAM[2] + 2.3], [EXAM[0] + 0.2, 0.95, EXAM[2] + 0.35])],
]);
const bedNight = cuts(until("bedNight"), [
  [shotStart("bedNight"), side(BED_AT[0], 0.9, 5.0, 0.6, BED_AT[2]), side(BED_AT[0] - 0.2, 0.9, 4.2, 0.5, BED_AT[2])],
  [BEATS.marathon - 6, pose([BED_AT[0] - 0.2, 1.6, BED_AT[2] + 2.4], [BED_AT[0] - 0.4, 0.6, BED_AT[2]])],
  [BEATS.fever - 6, side(BED_AT[0] - 0.3, 0.85, 4.2, 0.5, BED_AT[2])],
]);
const pancakes = cuts(until("pancakes"), [
  [shotStart("pancakes"), side((KIT_CHAIR[0] + STOVE[0]) / 2 + 0.3, 1.0, 5.4, 0.5, Z - 1.5), side((KIT_CHAIR[0] + STOVE[0]) / 2 + 0.3, 1.0, 4.8, 0.5, Z - 1.5)],
  [BEATS.batter - 4, side(-0.9, 0.95, 3.0, 0.3, TZ)],
]);
const morning = [push(shotStart("morning"), until("morning"), side(BED_AT[0] + 1.2, 1.0, 4.6, 0.4, BED_AT[2] + 0.9), side(BED_AT[0] + 1.4, 1.0, 3.6, 0.3, BED_AT[2] + 0.9))];
const skate2 = [push(shotStart("skate2"), until("skate2"), side(-1.6, 1.3, 8.0, 0.6), side(-2.2, 1.3, 7.4, 0.5))];

/** Hill shots sit on the slope: y follows the ground under the subject. */
const hillSide = (x: number, y: number, d: number, rise = 0.5, z = SIDEWALK_Z) => side(x, hillY(x) + y, d, rise, z);
const wagonCam = (f: number) => {
  const x = wagonX(f);
  return hillSide(x + 0.6, 0.8, 5.6, 0.5);
};
const runCam = (f: number) => {
  const x = Math.max(kitHillX(f), wagonX(f));
  return hillSide(x + 0.3, 0.9, 6.4, 0.6);
};
const hill = cuts(until("hill"), [
  [shotStart("hill"), hillSide(2.0, 1.4, 12.5, 1.6), hillSide(2.4, 1.3, 11.0, 1.4)],
  [lineStart("e2") - 4, hillSide(0.2, 0.7, 4.2, 0.4), hillSide(0.25, 0.7, 3.6, 0.35)],
  [BEATS.rolls - 4, hillSide(1.6, 0.8, 6.0, 0.5)],
  [BEATS.math - 4, pose([KIT0 + 0.3, 1.75, SIDEWALK_Z + 2.4], [KIT0 - 0.55, 1.15, SIDEWALK_Z + 0.5]), pose([KIT0 + 0.25, 1.7, SIDEWALK_Z + 2.0], [KIT0 - 0.5, 1.15, SIDEWALK_Z + 0.5])],
  [BEATS.sprint - 2, hillSide(0.8, 1.0, 7.0, 0.6)],
  [BEATS.curb - 2, hillSide(KIT_STOP - 0.6, 0.6, 3.8, 0.3), hillSide(KIT_STOP - 0.6, 0.6, 3.4, 0.3)],
  [BEATS.ribs + 10, hillSide(KIT_STOP - 1.6, 0.9, 6.2, 0.6)],
  [BEATS.hugsYou - 6, hillSide(KIT_STOP - 0.4, 0.7, 3.4, 0.3), hillSide(KIT_STOP - 0.35, 0.7, 3.0, 0.3)],
]);
const hillOver = [track(BEATS.rolls + 10, BEATS.math - 4, wagonCam), track(BEATS.sprint + 8, BEATS.curb - 2, runCam)];

const kitDinHead: Vec3 = [KIT_DIN[0], 1.1, DZ];
const dinner = cuts(until("dinner"), [
  [shotStart("dinner"), side(0, 1.1, 5.4, 0.6, DZ), side(0.1, 1.1, 4.8, 0.5, DZ)],
  [BEATS.turkeyLeg - 4, pose([KIT_DIN[0] - 1.2, 1.2, DZ + 1.8], kitDinHead), pose([KIT_DIN[0] - 1.0, 1.18, DZ + 1.5], kitDinHead)],
  [BEATS.slides - 4, side(0, 1.0, 4.6, 0.5, DZ)],
  [BEATS.lazy - 4, side(0, 1.2, 6.0, 0.7, DZ), side(0, 1.2, 5.2, 0.6, DZ)],
  [BEATS.pie - 8, side((TESS_DIN[0] + KIT_DIN[0]) / 2, 1.0, 3.6, 0.4, DZ)],
]);
const outro = [push(shotStart("outro"), DURATION, side(0, 1.1, 5.2, 0.6, DZ), side(0, 1.2, 6.2, 0.7, DZ))];

/** Base cuts, chained so nothing drifts between them; follows and crash zooms ride on top. */
const TRACKS: CameraTrack[] = chainTracks(
  ([] as CameraTrack[]).concat(kitchen, body, scrape, lunch, pantry, radiator, skate, xray, drive, clinic, bedNight, pancakes, morning, skate2, hill, dinner, outro),
).concat(skateOver, hillOver);

const wp = (frame: number, p: CameraPose) => ({ frame: Math.round(frame), ...p });
const opening = side(0.0, 1.0, 5.6, 0.6, TZ);

export const config: EpisodeConfig = {
  id: "Heal",
  title: "What if you healed 100x faster, but you were always starving?",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 3000,
    initialPosition: opening.position,
    waypoints: [wp(0, opening), wp(DURATION, opening)],
    tracks: TRACKS,
    shake: [
      { at: BEATS.slice, strength: 0.06, spread: 5 },
      { at: SKATE.lip, strength: 0.12, spread: 6 },
      { at: SKATE.land, strength: 0.2, spread: 7 },
      { at: BEATS.crack, strength: 0.3, spread: 8 },
      { at: BEATS.grab, strength: 0.12, spread: 6 },
      { at: BEATS.curb, strength: 0.3, spread: 8 },
      { at: BEATS.budget, strength: 0.08, spread: 6 },
    ],
  },
  audio: { src: "whatif/heal/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "whatif/heal/score_v1.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 70,
  },
  overlays: {
    grade: "saturate(1.08) contrast(1.03)",
    vignette: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.2) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 30,
    backgroundColor: "#a5d2f0",
    postfx: { aoIntensity: 1.3, bloomIntensity: 0.32, bloomThreshold: 0.88, grain: 0.006 },
  },
  OverlayComponent: HealHUD,
};

