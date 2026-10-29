import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { chainTracks, loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { JumpHUD } from "./JumpHUD";
import { HOUSE_X, LADDER_X, PARTY_X, SHOT_GEOMETRY, SWING_X, orbitEarth } from "./Scene";
import { BEATS, DURATION, HEDGE_X, Z, easeInOut, hayX, kitRunX, lerp, progress, shotEnd, shotStart, type ShotId } from "./timeline";

const { KIT_PARTY, KIT_GIVE, NIGHT_GLOBE } = SHOT_GEOMETRY;

const cue = sfxFor("teleport", "whatif");
/** Effects sit about 6 dB under the voice, as in Slow Flight. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);

/** Every blink: departures and arrivals (same frame: teleporting is instant). */
const BLINKS = [
  BEATS.anywhere,
  BEATS.blinkWord,
  BEATS.momentum - 10,
  BEATS.leave,
  BEATS.land2 - 3,
  BEATS.hop1,
  BEATS.hop2,
  BEATS.hop3,
  BEATS.bigJump,
  BEATS.axisJump,
  BEATS.step - 3,
  BEATS.stepBack - 2,
  BEATS.hopSouth,
  BEATS.barns - 4,
  BEATS.rivers - 4,
  BEATS.backyards - 4,
  BEATS.twoMin - 4,
  BEATS.oneMin - 4,
  BEATS.lastHop,
];

/** Every cue keys to a beat or shot boundary, never a literal frame. */
export const SFX: SfxCue[] = ([] as SfxCue[]).concat(
  [sfx("stamp", 8, 0.4)],
  BLINKS.map((f) => sfx("teleport", f - 2, 0.45)),
  [
    // Cold open: the swing, the run, the hedge
    loopCue(sfx("creak", BEATS.momentum, 0.25), BEATS.leave + 30, 10),
    sfx("thud", BEATS.leave + 3, 0.3),
    sfx("whoosh", BEATS.porch, 0.3),
    sfx("hay", BEATS.hedge, 0.6),
    sfx("rustle", BEATS.hedge + 4, 0.5),
    // The spinning ground
    sfx("pop", BEATS.equator, 0.25),
    sfx("pop", BEATS.connecticut, 0.25),
    sfx("pop", BEATS.pole, 0.25),
    sfx("pop", BEATS.feel, 0.2),
    sfx("whoosh", BEATS.sun, 0.25),
    sfx("pop", BEATS.far, 0.25),
    sfx("pop", BEATS.mile, 0.3),
    // The party and the pole plan
    sfx("ding", BEATS.snowball, 0.25),
    sfx("pop", BEATS.easy, 0.2),
    sfx("whoosh", BEATS.grabs, 0.3),
    sfx("rustle", BEATS.maps, 0.3),
    sfx("boom", BEATS.ice, 0.35),
    // The ladder
    sfx("pop", BEATS.escalator, 0.2),
    sfx("thud", BEATS.hop1 + 4, 0.2),
    sfx("thud", BEATS.hop2 + 4, 0.2),
    sfx("thud", BEATS.hop3 + 4, 0.2),
    sfx("splash", BEATS.dock + 8, 0.35),
    sfx("pop", BEATS.fortyHops, 0.25),
    sfx("ding", BEATS.thirtyFive, 0.25),
    // The big hop
    sfx("whoosh", BEATS.bigJump + 2, 0.5),
    loopCue(sfx("roll", BEATS.bigJump + 4, 0.35), BEATS.bales, 6),
    sfx("hay", BEATS.bales, 0.7),
    sfx("thud", BEATS.bales + 2, 0.45),
    sfx("whoosh", BEATS.soGrandpa, 0.35),
    sfx("hay", BEATS.soGrandpa + 26, 0.55),
    // The axis
    sfx("sparkle", BEATS.spinsIt, 0.25),
    sfx("pop", BEATS.axis, 0.25),
    sfx("whoosh", BEATS.through, 0.3),
    sfx("pop", BEATS.exactly, 0.25),
    sfx("sparkle", BEATS.winter, 0.3),
    // Through the Earth, Patagonia
    sfx("whoosh", BEATS.axisJump + 4, 0.4),
    sfx("ding", BEATS.zero2, 0.3),
    loopCue(sfx("wind_bed", shotStart("patagonia"), 0.18), shotEnd("patagonia"), 10),
    sfx("crunch", BEATS.step, 0.5),
    sfx("crunch", BEATS.pack, 0.4),
    sfx("crunch", BEATS.pack + 18, 0.4),
    sfx("crunch", BEATS.pack + 36, 0.4),
    sfx("sparkle", BEATS.biggest, 0.25),
    // Home
    sfx("ding", BEATS.eleven, 0.25),
    sfx("thud", BEATS.barns, 0.2),
    sfx("thud", BEATS.rivers, 0.2),
    sfx("thud", BEATS.backyards, 0.2),
    sfx("pop", BEATS.drips, 0.2),
    // Payoff
    sfx("steam", BEATS.blows, 0.3, { durationInFrames: 30, fadeOutFrames: 12 }),
    sfx("whoosh", BEATS.hits - 6, 0.35),
    sfx("splat", BEATS.face, 0.7),
    sfx("cheer", BEATS.face + 4, 0.45),
    // Hook
    sfx("sparkle", BEATS.spinsAgain, 0.2),
    sfx("pop", BEATS.stops, 0.25),
    sfx("whoosh", BEATS.arrive - 20, 0.3),
    sfx("stamp", BEATS.launch, 0.45),
    sfx("boom", BEATS.launch, 0.25),
    sfx("stamp", BEATS.subscribe, 0.5),
  ],
);

// ---------------------------------------------------------------------------
// Camera: one track per shot, hard cuts between shots (chained so no drift).
// 16:9 at fov 40: at distance d the frame is ~1.3·d wide and ~0.73·d tall.
// ---------------------------------------------------------------------------
const pose = (position: Vec3, lookAt: Vec3): CameraPose => ({ position, lookAt });
const mixPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
});
const ease = (f: number, a: number, b: number) => easeInOut(progress(f, [a, b]));
const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({ start, end, blend: 1, fn });
/** Side-on view of (x, y) on the action plane from distance d, a little above. */
const side = (x: number, y: number, d: number, rise = 0.6, z = Z): CameraPose => pose([x, y + rise, z + d], [x, y, z]);
/** Eased move between two poses over the whole shot. */
const push = (id: ShotId, a: CameraPose, b: CameraPose): CameraTrack => track(shotStart(id), shotEnd(id), (f) => mixPose(a, b, ease(f, shotStart(id), shotEnd(id))));

const yardCam = (f: number) => {
  const wide = side(SWING_X + 2.6, 1.6, 10);
  const swing = side(SWING_X + 0.6, 1.2, 7.4);
  return mixPose(wide, swing, ease(f, BEATS.momentum - 20, BEATS.swing));
};

const porchCam = (f: number) => {
  const x = Math.min(kitRunX(f), HEDGE_X - 2.2);
  const run = side(x + 1.0, 1.1, 7.6);
  const hedge = side(HEDGE_X - 2.0, 1.0, 5.6);
  return mixPose(run, hedge, ease(f, BEATS.hedge - 10, BEATS.hedge + 30));
};

const globe = (d: number, y = 0.3, x = 0): CameraPose => pose([x, y + 0.5, d], [x, y, 0]);

const orbitCam = (f: number) => {
  const e = orbitEarth(f);
  const wide = pose([-2, 10, 26], [-3, 0, -5]);
  const near = pose([e[0] + 1.5, e[1] + 1.4, e[2] + 6], [e[0], e[1], e[2]]);
  return mixPose(wide, near, ease(f, BEATS.together - 20, BEATS.together + 20));
};

const partyCam = (f: number) => {
  const wide = side(PARTY_X - 1.2, 1.2, 9.0, 0.9, Z - 0.8);
  const kit = side(KIT_PARTY[0] + 0.5, 1.2, 5.4, 0.4);
  if (f < BEATS.easy - 6) return wide;
  return mixPose(wide, kit, ease(f, BEATS.easy - 6, BEATS.easy + 16));
};

const hayCam = (f: number) => {
  const x = hayX(f);
  const chase = side(x + 1.4, 0.8, 8.5);
  const pile = side(1.6, 0.7, 9.5);
  return mixPose(chase, pile, ease(f, BEATS.bales - 4, BEATS.bales + 20));
};

const patagoniaCam = (f: number) => {
  const arrive = side(0.1, 1.1, 6.5, 0.5);
  const glacier = pose([0.4, 1.4, Z + 7.5], [2.8, 7.5, -20]);
  const pair = side(0.1, 1.15, 5.2, 0.4);
  if (f < BEATS.glacier - 10) return arrive;
  if (f < BEATS.sunSpot + 10) return mixPose(arrive, glacier, ease(f, BEATS.glacier - 10, BEATS.glacier + 20));
  return mixPose(glacier, pair, ease(f, BEATS.sunSpot + 10, BEATS.sunSpot + 40));
};

const hop = (id: ShotId) => push(id, side(0.6, 1.1, 6.6), side(1.0, 1.1, 6.0));

const payoffCam = (f: number) => {
  const table = side(PARTY_X - 1.2, 1.2, 7.4, 0.6, Z - 0.9);
  const give = side(KIT_GIVE[0] + 0.7, 1.2, 4.8, 0.4, Z - 0.6);
  const face = side(KIT_GIVE[0] + 0.1, 1.35, 3.6, 0.2, KIT_GIVE[2]);
  if (f < BEATS.holdOut - 6) return table;
  if (f < BEATS.hits - 10) return mixPose(table, give, ease(f, BEATS.holdOut - 6, BEATS.holdOut + 20));
  return mixPose(give, face, ease(f, BEATS.hits - 10, BEATS.face));
};

const nightCam = (f: number) => {
  const porch = pose([HOUSE_X - 1.4, 1.7, Z + 7], [HOUSE_X - 1.5, 0.9, Z + 1.4]);
  const g = NIGHT_GLOBE;
  const close = pose([g[0] + 0.1, g[1] + 0.02, g[2] + 0.6], [g[0], g[1] + 0.03, g[2]]);
  return mixPose(porch, close, ease(f, BEATS.spinsAgain - 10, BEATS.spinsAgain + 30));
};

const TRACKS: CameraTrack[] = chainTracks([
  track(0, shotEnd("yard"), yardCam),
  track(shotStart("porch"), shotEnd("porch"), porchCam),
  push("spin", globe(12), globe(10.5)),
  push("still", side(HEDGE_X - 4.5, 1.8, 11, 0.8, Z - 1), side(HEDGE_X - 4, 1.6, 9.5, 0.8, Z - 1)),
  track(shotStart("orbit"), shotEnd("orbit"), orbitCam),
  push("rule", globe(11.5, 0.8), globe(10.5, 0.8)),
  track(shotStart("party"), shotEnd("party"), partyCam),
  push("polePlan", pose([0, 6.5, 8.6], [0, 1.3, 0]), pose([0, 6.2, 7.8], [0, 1.4, 0])),
  push("ladder", side(LADDER_X + 1.2, 1.2, 7.4), side(LADDER_X + 1.6, 1.2, 6.6)),
  hop("corn"),
  hop("pasture"),
  push("dock", side(-0.4, 1.0, 7.2), side(-0.2, 1.0, 6.0)),
  track(shotStart("hayCrash"), shotEnd("hayCrash"), hayCam),
  push("hayTalk", pose([3.4, 1.3, Z + 4.0], [0, 0.75, Z + 0.3]), pose([2.6, 1.2, Z + 3.2], [0.2, 0.8, Z + 0.4])),
  push("axis", globe(11.5, 0.2, -0.5), globe(10, 0.2, -0.5)),
  push("handJump", side(0.05, 1.2, 4.6, 0.3), side(0.05, 1.2, 4.0, 0.3)),
  push("chord", globe(10, 0.2, -0.5), globe(9.4, 0.2, -0.5)),
  track(shotStart("patagonia"), shotEnd("patagonia"), patagoniaCam),
  push("hayReturn", side(0.1, 1.1, 6.0, 0.4), side(0.1, 1.1, 5.2, 0.4)),
  hop("barns"),
  hop("rivers"),
  push("backyards", side(0.8, 1.1, 6.0), side(1.5, 1.1, 3.8, 0.2)),
  hop("corn2"),
  hop("pasture2"),
  push("arrive", side(KIT_PARTY[0] - 1.6, 1.2, 9, 0.7, Z - 0.6), side(KIT_PARTY[0] - 0.8, 1.2, 8.2, 0.7, Z - 0.6)),
  track(shotStart("payoff"), shotEnd("payoff"), payoffCam),
  track(shotStart("night"), shotEnd("night"), nightCam),
  push("launchGlobe", globe(12, 0.6), globe(10.5, 0.6)),
]);

const wp = (frame: number, p: CameraPose) => ({ frame: Math.round(frame), ...p });

export const config: EpisodeConfig = {
  id: "Teleport",
  title: "What if you could teleport, but kept your momentum?",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 3000,
    initialPosition: yardCam(0).position,
    waypoints: [wp(0, yardCam(0)), wp(DURATION, yardCam(0))],
    tracks: TRACKS,
    shake: [
      { at: BEATS.hedge, strength: 0.14, spread: 6 },
      { at: BEATS.bigJump + 3, strength: 0.12, spread: 6 },
      { at: BEATS.bales, strength: 0.22, spread: 7 },
      { at: BEATS.soGrandpa + 26, strength: 0.12, spread: 6 },
      { at: BEATS.face, strength: 0.12, spread: 6 },
    ],
    rumbles: [{ start: BEATS.bigJump, end: BEATS.bales, strength: 0.03 }],
  },
  audio: { src: "whatif/teleport/narration_v2.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "whatif/teleport/score_v2.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
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
  OverlayComponent: JumpHUD,
};

