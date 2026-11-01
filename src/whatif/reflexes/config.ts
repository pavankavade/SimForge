import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { chainTracks, crashZoom, loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { ReflexHUD } from "./ReflexHUD";
import { CATCH, SHOT_GEOMETRY, TZ } from "./Scene";
import { BEATS, DURATION, KIT_GYM_X, KIT_LEMON_X, KIT_RAIL_X, MARCUS_X, REPLAY, STEP, THROW1, THROW2, Z, easeInOut, lerp, lineStart, progress, shotEnd, shotStart, type ShotId } from "./timeline";

const { TESS_AT, KIT_CHAIR, GLASS_EDGE, RELEASE, BENCH_SEAT, LADDER_AT, TESS_YARD, POST_X, KIT_DESK, KIT_HEAD } = SHOT_GEOMETRY;

const cue = sfxFor("reflexes", "whatif");
/** Effects sit about 6 dB under the voice, as in Slow Flight and Teleport. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);

/** Every cue keys to a beat or shot boundary, never a literal frame. */
export const SFX: SfxCue[] = [
  sfx("stamp", 8, 0.4),
  sfx("sparkle", BEATS.tenTimes, 0.25),
  sfx("slowmo", BEATS.bodyNot, 0.35),
  // The milk glass
  sfx("clunk", BEATS.clips, 0.3),
  sfx("slowmo", BEATS.blink, 0.4),
  sfx("pop", BEATS.catchIt, 0.2),
  loopCue(sfx("pour", BEATS.pours, 0.3), BEATS.close + 10, 10),
  sfx("glass", BEATS.close, 0.6),
  sfx("whoosh", REPLAY.start + 2, 0.3),
  sfx("glass", REPLAY.start + REPLAY.len, 0.45),
  // Why
  sfx("pop", BEATS.quarter, 0.2),
  sfx("zap", BEATS.eyes, 0.15),
  sfx("sparkle", BEATS.nowTen, 0.3),
  sfx("zap", BEATS.nerves, 0.2),
  sfx("pop", BEATS.muscle, 0.25),
  sfx("ding", BEATS.twoAndHalf, 0.25),
  sfx("boom", BEATS.gun, 0.25),
  sfx("whoosh", BEATS.gun + 3, 0.25),
  sfx("ding", BEATS.line, 0.25),
  sfx("slowmo", BEATS.slower, 0.35),
  // Slow motion life
  sfx("tick", BEATS.sixHour, 0.4),
  sfx("tick", BEATS.sixty, 0.4),
  sfx("thud", BEATS.stub, 0.4),
  sfx("pop", BEATS.sting, 0.25),
  sfx("ouch", BEATS.arrives, 0.7),
  sfx("thud", BEATS.arrives + 9, 0.2),
  sfx("thud", BEATS.arrives + 18, 0.2),
  // Dodgeball
  sfx("whistle", BEATS.dodgeball, 0.35),
  loopCue(sfx("crowd", shotStart("gym"), 0.18), BEATS.leave, 10),
  sfx("pop", BEATS.forty, 0.25),
  sfx("whoosh", THROW1.release, 0.3),
  sfx("slowmo", THROW1.release + 2, 0.35),
  sfx("thwack", THROW1.hit, 0.7),
  sfx("bounce", THROW1.hit + 10, 0.35),
  sfx("bounce", THROW1.hit + 28, 0.2),
  sfx("pop", BEATS.quarterD, 0.2),
  sfx("sparkle", BEATS.shoulder, 0.25),
  sfx("whistle", BEATS.nextRound, 0.3),
  sfx("whoosh", THROW2.release, 0.35),
  sfx("bounce", THROW2.pass + 25, 0.3),
  sfx("stamp", BEATS.earlier, 0.5),
  sfx("crowd", BEATS.wins, 0.4),
  // The ladder
  sfx("pop", BEATS.lemonade, 0.2),
  sfx("ratchet", BEATS.rocks, 0.3),
  sfx("slowmo", BEATS.oneDegree, 0.35),
  sfx("tick", BEATS.fiveDeg, 0.4),
  sfx("tick", BEATS.secondHalf, 0.4),
  sfx("ding", BEATS.grass, 0.25),
  sfx("whoosh", BEATS.alreadyRunning, 0.25),
  sfx("clank", BEATS.rail, 0.45),
  sfx("ladder", BEATS.thump, 0.7),
  sfx("clunk", BEATS.grabsGutter, 0.3),
  // Payoff and hook
  sfx("clunk", BEATS.clipsAgain, 0.3),
  sfx("slowmo", BEATS.journey, 0.35),
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

const kitSeatHead: Vec3 = [KIT_CHAIR[0], 1.12, TZ];
const kitchen = cuts(until("kitchen"), [
  [0, side(0.3, 1.0, 5.6, 0.6, TZ), side(0.5, 1.0, 4.6, 0.5, TZ)],
  [BEATS.bodyNot - 2, pose([-0.1, 1.25, TZ + 1.5], kitSeatHead), pose([-0.3, 1.22, TZ + 1.25], kitSeatHead)],
  [lineStart("a3") - 6, side(0.2, 0.95, 4.0, 0.4, TZ), side(0.1, 0.95, 3.6, 0.4, TZ)],
  [BEATS.blink - 4, pose([GLASS_EDGE[0] - 0.55, 0.92, GLASS_EDGE[2] + 1.1], [GLASS_EDGE[0], 0.82, GLASS_EDGE[2]]), pose([GLASS_EDGE[0] - 0.42, 0.9, GLASS_EDGE[2] + 0.85], [GLASS_EDGE[0], 0.82, GLASS_EDGE[2]])],
  [BEATS.know - 4, pose([-0.2, 1.25, TZ + 1.3], kitSeatHead), pose([-0.35, 1.2, TZ + 1.05], kitSeatHead)],
  [BEATS.drifts - 6, side(-0.45, 0.65, 3.5, 0.35, TZ + 0.3), side(-0.35, 0.6, 3.1, 0.3, TZ + 0.3)],
  [BEATS.fourSeconds - 4, pose([-0.6, 0.75, CATCH[2] + 2.6], [-0.15, 0.45, CATCH[2]]), pose([-0.5, 0.7, CATCH[2] + 2.3], [-0.1, 0.4, CATCH[2]])],
  [BEATS.close - 6, pose([CATCH[0] + 0.9, 0.42, CATCH[2] + 1.5], [CATCH[0] - 0.3, 0.2, CATCH[2]]), pose([CATCH[0] + 0.8, 0.4, CATCH[2] + 1.3], [CATCH[0] - 0.3, 0.2, CATCH[2]])],
]);
const tessFace: Vec3 = [TESS_AT[0], 0.9, TESS_AT[2]];
const replay = cuts(until("replay"), [
  [shotStart("replay"), side(0.3, 0.75, 4.4, 0.5, TZ + 0.1)],
  [BEATS.snatched - 4, pose([TESS_AT[0] + 0.2, 1.0, TESS_AT[2] + 1.8], tessFace), pose([TESS_AT[0] + 0.15, 0.98, TESS_AT[2] + 1.5], tessFace)],
]);
const after = [push(shotStart("after"), until("after"), side(-0.2, 0.35, 2.6, 0.3, CATCH[2]), side(-0.15, 0.32, 2.2, 0.25, CATCH[2]))];

const head: Vec3 = [0, KIT_HEAD, 0];
const body = cuts(until("body"), [
  [shotStart("body"), side(0, 1.0, 4.4, 0.4), side(0, 1.0, 4.0, 0.4)],
  [BEATS.eyes - 6, pose([0.35, KIT_HEAD + 0.1, 1.6], head), pose([0.3, KIT_HEAD + 0.08, 1.3], head)],
  [BEATS.nerves - 6, side(-0.1, 1.0, 3.6, 0.3), side(-0.15, 0.95, 3.2, 0.3)],
  [BEATS.none - 6, side(0, 1.0, 4.2, 0.4)],
]);
const raceX = (f: number) => (f < BEATS.gun + 3 ? 0.4 : Math.min(9, 0.4 + 0.11 * (f - BEATS.gun - 3) + 0.004 * (f - BEATS.gun - 3) ** 2));
const race = [track(shotStart("race"), until("race"), (f) => side(raceX(f), 0.75, f < BEATS.gun ? 4.2 : 5.2, 0.4))];
const self = [push(shotStart("self"), until("self"), side(0, 1.1, 3.8, 0.3), side(0, 1.15, 3.0, 0.2))];

const deskHead: Vec3 = [KIT_DESK[0], 1.05, KIT_DESK[2] - 0.42];
const classroom = cuts(until("classroom"), [
  [shotStart("classroom"), side(0, 1.2, 8.0, 0.9, Z - 1.0), side(0, 1.2, 7.0, 0.8, Z - 1.0)],
  [BEATS.blinkC - 6, pose([0.3, 1.2, deskHead[2] + 1.8], deskHead), pose([0.25, 1.18, deskHead[2] + 1.5], deskHead)],
  [lineStart("c3") - 4, side(0, 1.0, 4.4, 0.4, KIT_DESK[2] - 0.4), side(0.1, 1.0, 3.9, 0.4, KIT_DESK[2] - 0.4)],
  [BEATS.sixHour - 6, pose([0, 2.2, Z - 3.2], [0, 2.35, Z - 5.85]), pose([0, 2.3, Z - 3.9], [0, 2.35, Z - 5.85])],
  [BEATS.math - 4, side(0, 1.2, 7.0, 0.8, Z - 1.0)],
]);
const bedroom = cuts(until("bedroom"), [
  [shotStart("bedroom"), side(POST_X - 0.9, 0.85, 4.6, 0.4, Z), side(POST_X - 0.5, 0.85, 3.8, 0.35, Z)],
  [BEATS.sting - 4, pose([POST_X - 1.1, 1.3, Z + 3.0], [POST_X - 0.2, 0.95, Z]), pose([POST_X - 1.0, 1.28, Z + 2.6], [POST_X - 0.2, 0.95, Z])],
  [BEATS.arrives - 3, side(POST_X - 0.5, 0.9, 4.4, 0.4, Z)],
]);
const porch = [push(shotStart("porch"), until("porch"), side(0.3, 1.0, 5.4, 0.5, Z - 0.8), side(0.3, 1.0, 4.6, 0.4, Z - 0.8))];

const marcusHead: Vec3 = [MARCUS_X, 1.35, Z];
const kitGym: Vec3 = [KIT_GYM_X, 1.0, Z];
const ballCam = (release: number, arrive: number, target: Vec3) => (f: number) => {
  const t = progress(f, [release, arrive]);
  const x = lerp(RELEASE[0], target[0], t);
  return pose([x - 1.2, 1.35, Z + 1.6], [x + 0.3, 1.0, Z]);
};
const gym = cuts(until("gym"), [
    [shotStart("gym"), side(0, 1.6, 12.5, 1.2, Z - 2.0), side(0, 1.5, 11.0, 1.1, Z - 2.0)],
    [BEATS.marcus - 4, side(MARCUS_X + 0.4, 1.0, 4.6, 0.4)],
    [BEATS.twentyFeet - 6, side(0, 0.9, 7.6, 0.6), side(0, 0.9, 7.0, 0.6)],
    [BEATS.leave - 2, pose([RELEASE[0] - 1.0, 1.4, Z + 1.7], [RELEASE[0] + 0.4, 1.1, Z])],
    [BEATS.legsStart - 4, pose([KIT_GYM_X + 0.6, 0.6, Z + 2.2], [KIT_GYM_X, 0.45, Z - 0.1])],
    [BEATS.halfway - 4, side(0, 0.9, 7.0, 0.6)],
    [BEATS.sideways - 4, pose([KIT_GYM_X - 1.6, 1.1, Z + 2.8], kitGym), pose([KIT_GYM_X - 1.3, 1.05, Z + 2.4], kitGym)],
    [BEATS.watchCome - 4, side(KIT_GYM_X - 1.4, 0.85, 3.8, 0.3)],
]);
const gymOver = [
  track(BEATS.leave + 14, BEATS.legsStart - 4, ballCam(THROW1.release, THROW1.hit, [KIT_GYM_X - 0.12, 0.72, Z])),
  crashZoom(BEATS.forty - 2, BEATS.twentyFeet - 6, pose([MARCUS_X + 1.6, 1.4, Z + 2.2], marcusHead), { zoom: 1.6 }),
];
const benchMid: Vec3 = [(BENCH_SEAT[0] - 0.6) / 2, 1.0, (BENCH_SEAT[2] - 2.8) / 2];
const bench = cuts(until("bench"), [
    [shotStart("bench"), pose([BENCH_SEAT[0] - 0.6, 1.1, BENCH_SEAT[2] + 2.6], [BENCH_SEAT[0], 0.9, BENCH_SEAT[2]]), pose([BENCH_SEAT[0] - 0.5, 1.1, BENCH_SEAT[2] + 2.2], [BENCH_SEAT[0], 0.9, BENCH_SEAT[2]])],
    [lineStart("d10") - 4, pose([benchMid[0] + 0.5, 1.6, benchMid[2] + 6.0], benchMid), pose([benchMid[0] + 0.4, 1.5, benchMid[2] + 5.4], benchMid)],
]);
const benchOver = [crashZoom(BEATS.shoulder - 2, until("bench") - 1, pose([0.5, 1.25, -6 + 3.4 + 2.2], [-0.55, 1.15, -6 + 3.2]), { zoom: 1.6 })];
const gym2 = cuts(until("gym2"), [
    [shotStart("gym2"), side(0, 0.95, 7.4, 0.6), side(0.2, 0.95, 6.8, 0.6)],
    [BEATS.wins - 4, side(1.5, 1.3, 8.5, 0.8, Z - 0.8), side(1.8, 1.2, 7.2, 0.7, Z - 0.8)],
]);
const gym2Over = [crashZoom(BEATS.notFaster - 4, BEATS.wins - 4, pose([KIT_GYM_X + 0.1, 1.05, Z - STEP + 3.4], [KIT_GYM_X + 0.75, 1.05, Z - STEP]), { zoom: 1.25 })];

const ladderTop: Vec3 = [LADDER_AT[0], 2.6, LADDER_AT[2]];
const yard = cuts(until("yard"), [
    [shotStart("yard"), side(0.6, 1.8, 8.8, 0.6, Z - 0.6), side(0.8, 1.7, 7.8, 0.5, Z - 0.6)],
    [BEATS.calls - 4, side(2.4, 1.2, 8.2, 0.5, Z - 0.4), side(2.2, 1.3, 7.6, 0.5, Z - 0.4)],
    [BEATS.leans - 4, pose([0.4, 2.2, Z + 3.6], ladderTop), pose([0.4, 2.3, Z + 3.2], ladderTop)],
    [BEATS.rocks - 2, pose([1.3, 0.9, Z + 4.6], [LADDER_AT[0] + 0.2, 1.45, LADDER_AT[2]]), pose([1.2, 0.85, Z + 4.1], [LADDER_AT[0] + 0.2, 1.45, LADDER_AT[2]])],
    [BEATS.notice - 4, side(1.6, 1.5, 8.0, 0.5, Z - 0.5)],
    [BEATS.startFall - 4, pose([KIT_LEMON_X - 1.8, 1.25, Z + 1.7], [KIT_LEMON_X - 0.6, 1.2, Z - 0.3])],
]);
const graph = [push(shotStart("graph"), until("graph"), side(1.6, 1.5, 9.0, 0.5, Z - 0.5), side(1.6, 1.5, 8.4, 0.5, Z - 0.5))];
const runCam = (f: number) => {
  const t = progress(f, [BEATS.alreadyRunning, BEATS.rail]);
  const x = lerp(KIT_LEMON_X - 0.6, KIT_RAIL_X, t);
  return side((x + LADDER_AT[0]) / 2 + 0.3, 1.5, 6.6, 0.5, Z - 0.5);
};
const save = cuts(until("save"), [
    [shotStart("save"), pose([KIT_LEMON_X - 1.6, 1.3, Z + 1.3], [KIT_LEMON_X - 0.6, 1.25, Z - 0.3])],
    [BEATS.alreadyRunning - 2, side(1.6, 1.5, 6.8, 0.5, Z - 0.5)],
    [BEATS.rail - 4, pose([KIT_RAIL_X + 1.2, 1.4, Z + 2.8], [KIT_RAIL_X - 0.3, 1.3, Z - 0.6]), pose([KIT_RAIL_X + 1.0, 1.35, Z + 2.5], [KIT_RAIL_X - 0.3, 1.3, Z - 0.6])],
    [BEATS.thump - 3, side(0.8, 1.6, 7.0, 0.5, Z - 0.6)],
    [BEATS.looksDown - 4, pose([1.4, 0.9, Z + 3.2], [0.5, 1.9, Z - 0.6]), pose([1.3, 0.95, Z + 2.9], [0.5, 1.9, Z - 0.6])],
    [BEATS.tessE16 - 4, side((KIT_RAIL_X + TESS_YARD[0]) / 2, 1.1, 5.6, 0.4, Z - 0.2)],
]);
const saveOver = [
  track(BEATS.alreadyRunning + 30, BEATS.rail - 4, runCam),
  crashZoom(shotStart("save"), BEATS.alreadyRunning - 2, pose([KIT_LEMON_X - 1.35, 1.32, Z + 0.9], [KIT_LEMON_X - 0.6, 1.3, Z - 0.3]), { zoom: 1.6 }),
];
const night = [push(shotStart("night"), until("night"), side(0.2, 1.0, 5.2, 0.5, Z - 0.8), side(0.1, 0.95, 4.4, 0.45, Z - 0.8))];
const kitchen2 = cuts(until("kitchen2"), [
  [shotStart("kitchen2"), side(0.2, 0.95, 4.0, 0.4, TZ), side(0.2, 0.95, 3.6, 0.4, TZ)],
  [BEATS.sigh - 4, pose([-0.2, 1.25, TZ + 1.3], kitSeatHead), pose([-0.35, 1.2, TZ + 1.05], kitSeatHead)],
]);
const outro = [push(shotStart("outro"), DURATION, side(0.3, 1.0, 5.0, 0.6, TZ), side(0.3, 1.0, 5.6, 0.7, TZ))];

/** Base cuts, chained so nothing drifts between them; follows and crash zooms ride on top. */
const TRACKS: CameraTrack[] = chainTracks(
  ([] as CameraTrack[]).concat(kitchen, replay, after, body, race, self, classroom, bedroom, porch, gym, bench, gym2, yard, graph, save, night, kitchen2, outro),
).concat(gymOver, benchOver, gym2Over, saveOver);

const wp = (frame: number, p: CameraPose) => ({ frame: Math.round(frame), ...p });
const opening = side(0.3, 1.0, 5.6, 0.6, TZ);

export const config: EpisodeConfig = {
  id: "Reflexes",
  title: "What if you could react 10x faster, but your body couldn't?",
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
      { at: BEATS.close, strength: 0.08, spread: 6 },
      { at: BEATS.arrives, strength: 0.18, spread: 8 },
      { at: THROW1.hit, strength: 0.24, spread: 7 },
      { at: BEATS.earlier, strength: 0.1, spread: 6 },
      { at: BEATS.rail, strength: 0.1, spread: 6 },
      { at: BEATS.thump, strength: 0.2, spread: 7 },
    ],
  },
  audio: { src: "whatif/reflexes/narration_v3.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "whatif/reflexes/score_v3.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
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
  OverlayComponent: ReflexHUD,
};
