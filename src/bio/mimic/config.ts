import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { chainTracks, loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { MimicHUD } from "./MimicHUD";
import {
  BEATS,
  CLAM_LAND,
  CRAB_IN,
  DAGGER_LAND,
  DURATION,
  KNOCKS,
  MEN_LAND,
  MORPH,
  PASSERS,
  POUR,
  WAIT,
  crabX,
  easeInOut,
  lerp,
  progress,
  shotEnd,
  shotStart,
  type ShotId,
} from "./timeline";

const cue = sfxFor("mimic", "bio");
/** Effects sit about 6 dB under the voice. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);
const reefBed = (id: ShotId) => loopCue(sfx("water", shotStart(id), 0.5), shotEnd(id), 8);

/** Every cue keys to a beat or shot boundary, never a literal frame. */
export const SFX: SfxCue[] = [
  // Cold open
  sfx("growl", 0, 0.7),
  sfx("chomp", BEATS.chomp0, 0.9),
  sfx("thud", BEATS.never + 3, 0.3),
  // Octopus and skin
  reefBed("octopus"),
  sfx("bubble", BEATS.octopus, 0.35),
  sfx("sparkle", BEATS.octopus + 4, 0.25),
  sfx("pop", BEATS.sacs, 0.3),
  sfx("pop", BEATS.muscles, 0.3),
  // Paint and knock
  sfx("squelch", MORPH, 0.5),
  sfx("whoosh", BEATS.paint, 0.25),
  sfx("sparkle", BEATS.painted - 6, 0.3),
  sfx("knock", KNOCKS[0], 0.9),
  sfx("wobble", KNOCKS[0] + 1, 0.7),
  sfx("jelly", KNOCKS[1], 0.4),
  sfx("wobble", BEATS.wobbleWord, 0.35),
  // Clam
  reefBed("clam"),
  sfx("ding", BEATS.hinged, 0.2),
  sfx("shell", BEATS.snaps, 1),
  sfx("bubble", BEATS.snaps + 2, 0.4),
  // Scale
  sfx("whoosh", CLAM_LAND - 8, 0.3),
  sfx("slam", CLAM_LAND, 0.5),
  sfx("thud", MEN_LAND[0], 0.4),
  sfx("thud", MEN_LAND[1], 0.4),
  sfx("thud", MEN_LAND[2], 0.45),
  sfx("ding", MEN_LAND[2] + 8, 0.25),
  sfx("tick", BEATS.decades, 0.4),
  sfx("tick", BEATS.decades + 9, 0.4),
  sfx("tick", BEATS.decades + 18, 0.4),
  // Steal and hermit crab
  sfx("sparkle", BEATS.steal, 0.4),
  reefBed("hermit"),
  loopCue(sfx("scuttle", shotStart("hermit"), 0.5), BEATS.grows + 6, 4),
  loopCue(sfx("scuttle", BEATS.moves + 6, 0.4), CRAB_IN, 3),
  sfx("pop", CRAB_IN, 0.5),
  // Pour
  sfx("pop", BEATS.bones, 0.25),
  loopCue(sfx("pour", POUR[0], 0.6), POUR[1], 6),
  sfx("pop", POUR[1], 0.4),
  // The year of waiting
  ...Array.from({ length: 12 }, (_, i) => sfx("tick", WAIT[0] + (i * (WAIT[1] - WAIT[0])) / 12, 0.3)),
  ...PASSERS.map(([start]) => sfx("whoosh", start + 6, 0.4)),
  sfx("heartbeat", BEATS.warm, 0.6),
  sfx("heartbeat", BEATS.warm + 18, 0.6),
  sfx("heartbeat", BEATS.starve - 6, 0.6),
  sfx("rumble", BEATS.starve, 0.3, { durationInFrames: 28, fadeOutFrames: 10 }),
  // Cold and crocodile
  sfx("ice", BEATS.cold, 0.3),
  sfx("heartbeat", BEATS.cold + 14, 0.5),
  sfx("heartbeat", BEATS.neverMove + 16, 0.4),
  loopCue(sfx("swamp", shotStart("croc"), 0.6), shotEnd("croc"), 8),
  sfx("bubble", BEATS.year, 0.2),
  // The bite
  sfx("click", BEATS.tongue - 9, 0.4),
  sfx("lash", BEATS.tongue, 1),
  sfx("squelch", BEATS.tongue + 5, 0.5),
  sfx("squelch", BEATS.suckers, 0.4),
  sfx("pop", BEATS.sixteen, 0.35),
  sfx("whoosh_big", BEATS.yank, 0.5),
  sfx("chomp", BEATS.chomp, 1),
  sfx("slam", BEATS.chomp, 0.4),
  sfx("chew", BEATS.chomp + 6, 0.5),
  sfx("burp", BEATS.burp, 0.7),
  sfx("clank", DAGGER_LAND, 0.45),
  // The clincher
  sfx("pop", BEATS.movedIn, 0.3),
  sfx("trap_open", BEATS.lid, 0.35),
  sfx("growl", BEATS.finalLunge - 2, 0.8),
];

// ---------------------------------------------------------------------------
// Camera: one or more pushes per shot, hard cuts between them (chained so
// nothing drifts). 9:16 at fov 40: at distance d the frame is ~0.41·d wide and
// ~0.73·d tall. Every pose looks AT its subject: the depth of field focuses
// on the look target.
// ---------------------------------------------------------------------------
const P = (position: Vec3, lookAt: Vec3, fov?: number): CameraPose => ({ position, lookAt, ...(fov === undefined ? {} : { fov }) });
const mix = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
  fov: lerp(a.fov ?? 40, b.fov ?? 40, t),
});
/**
 * Captions sit a quarter of the way up the frame, so every shot is framed with
 * its subject above centre: the whole camera drops by LIFT of the frame height
 * at the look target (the angle does not change).
 */
const LIFT = 0.085;
const framed = (p: CameraPose): CameraPose => {
  const d = Math.hypot(p.position[0] - p.lookAt[0], p.position[1] - p.lookAt[1], p.position[2] - p.lookAt[2]);
  const drop = LIFT * 2 * d * Math.tan((((p.fov ?? 40) * Math.PI) / 180) / 2);
  return { ...p, position: [p.position[0], p.position[1] - drop, p.position[2]], lookAt: [p.lookAt[0], p.lookAt[1] - drop, p.lookAt[2]] };
};
/** A hard cut: the track starts one frame early so it is at full weight on the shot's first frame. */
const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({ start: start - 1, end, blend: 1, fn: (f) => framed(fn(f)) });
/** Consecutive moves: each entry starts a segment that runs to the next one's start (the last to `end`). */
const cuts = (end: number, list: [number, CameraPose, CameraPose?][]): CameraTrack[] =>
  list.map(([start, a, b], i) => {
    const stop = i + 1 < list.length ? list[i + 1][0] : end;
    return track(start, stop, (f) => mix(a, b ?? a, easeInOut(progress(f, [start, stop]))));
  });
const S = shotStart;
const E = shotEnd;

const CHEST_LOOK: Vec3 = [0, 0.8, 0];

const hook = cuts(E("hook"), [
  // Jaws at the lens.
  [0, P([0.35, 0.95, 3.5], [0, 0.85, 0]), P([0.35, 1.0, 3.8], [0, 0.85, 0])],
  // Orbit the innocent chest.
  [BEATS.chomp0 + 6, P([-2.5, 1.55, 4.9], [0, 0.86, 0]), P([1.5, 1.35, 4.7], [0, 0.86, 0])],
  [BEATS.realMimic - 12, P([0.35, 1.15, 4.9], CHEST_LOOK), P([0.15, 1.05, 4.4], CHEST_LOOK)],
]);
const octopus = cuts(E("octopus"), [[S("octopus"), P([1.4, 2.3, 7.8], [0, 0.78, 0]), P([0.5, 1.95, 7.0], [0, 0.78, 0])]]);
const skin = cuts(E("skin"), [[S("skin"), P([1.6, 2.4, 3.3], [0.1, 0, 0], 32), P([-0.6, 2.05, 2.9], [-0.1, 0, 0], 32)]]);
const paint = cuts(E("paint"), [[S("paint"), P([1.7, 1.55, 5.1], [0, 0.82, 0]), P([0.5, 1.3, 4.8], [0, 0.82, 0])]]);
const knock = cuts(E("knock"), [
  [S("knock"), P([-1.6, 1.75, 4.8], [0.1, 1.0, 0]), P([-1.1, 1.55, 4.5], [0.1, 1.0, 0])],
  [KNOCKS[0] - 2, P([-0.7, 1.45, 4.1], [0.05, 0.95, 0]), P([-0.5, 1.4, 3.9], [0.05, 0.95, 0])],
]);
const clam = cuts(E("clam"), [
  [S("clam"), P([2.3, 2.2, 6.4], [0, 0.72, 0]), P([1.3, 1.85, 5.8], [0, 0.72, 0])],
  [BEATS.hinged - 4, P([-2.6, 1.9, 5.6], [0, 0.7, -0.1]), P([-2.0, 1.6, 5.4], [0, 0.7, -0.1])],
  [BEATS.snaps - 12, P([0.3, 1.3, 7.2], [0, 0.6, 0]), P([0.1, 1.2, 6.6], [0, 0.6, 0])],
]);
const scale = cuts(E("scale"), [[S("scale"), P([1.0, 3.5, 12.6], [0, 2.55, 0]), P([0.3, 3.2, 11.6], [0, 2.55, 0])]]);
const steal = cuts(E("steal"), [
  [S("steal"), P([-1.5, 1.6, 6.3], [-0.5, 0.6, 0.7]), P([-1.4, 1.55, 6.1], [-0.5, 0.6, 0.7])],
  // Rack focus from the mimic to the empty chest.
  [BEATS.steal - 10, P([-1.4, 1.55, 6.1], [-0.5, 0.6, 0.7]), P([-1.2, 1.5, 5.9], [0.5, 0.75, -0.6])],
  [BEATS.steal + 8, P([-1.2, 1.5, 5.9], [0.5, 0.75, -0.6]), P([-1.0, 1.45, 5.6], [0.5, 0.75, -0.6])],
]);
const hermitCam = (f: number): CameraPose => {
  const x = lerp(crabX(f), 0.55, 0.5);
  const t = easeInOut(progress(f, [S("hermit"), E("hermit")]));
  return P([x - 0.3 + 0.4 * t, lerp(1.0, 0.8, t), lerp(5.2, 4.5, t)], [x, 0.3, 0.4], 34);
};
const hermit = [track(S("hermit"), E("hermit"), hermitCam)];
const pour = cuts(E("pour"), [[S("pour"), P([0.6, 1.65, 5.7], [0, 1.0, 0.3]), P([0.2, 1.35, 5.0], [0, 0.95, 0.3])]]);
const wait = cuts(E("wait"), [[S("wait"), P([2.7, 0.9, 6.5], [0, 0.98, 0]), P([1.8, 1.0, 5.9], [0, 0.98, 0])]]);
const starve = cuts(E("starve"), [[S("starve"), P([0.3, 1.2, 5.1], [0, 0.8, 0.3]), P([0.1, 1.1, 4.7], [0, 0.8, 0.3])]]);
const cold = cuts(E("cold"), [[S("cold"), P([0.1, 1.1, 4.7], [0, 0.8, 0.3]), P([-0.2, 1.05, 4.4], [0, 0.8, 0.3])]]);
const croc = cuts(E("croc"), [[S("croc"), P([2.9, 2.6, 6.3], [0.7, 0.4, 1.0]), P([2.5, 2.2, 5.7], [0.7, 0.4, 1.0])]]);
const bite = cuts(E("bite"), [
  [S("bite"), P([1.4, 1.55, 7.0], [0.55, 0.95, 0]), P([1.0, 1.4, 6.5], [0.55, 0.95, 0])],
  [BEATS.tongue - 2, P([1.0, 1.4, 6.5], [0.55, 0.95, 0]), P([0.9, 1.3, 6.2], [0.55, 0.95, 0])],
]);
const suckers = cuts(E("suckers"), [[S("suckers"), P([1.2, 0.6, 5.2], [0.1, 0, 0], 34), P([-0.5, 0.35, 4.6], [-0.1, 0, 0], 34)]]);
const yank = cuts(E("yank"), [
  [S("yank"), P([0.9, 1.3, 6.2], [0.55, 0.95, 0])],
  [BEATS.chomp - 1, P([0.5, 1.15, 5.0], CHEST_LOOK), P([0.6, 1.2, 4.9], CHEST_LOOK)],
]);
const end = cuts(E("end"), [[S("end"), P([0.6, 1.2, 4.9], [0.15, 0.8, 0]), P([-1.5, 1.6, 6.4], [0.3, 0.8, 0])]]);
const inside = cuts(E("inside"), [[S("inside"), P([0.15, 1.15, 5.0], [0, 0.8, 0.3]), P([0, 1.08, 4.6], [0, 0.8, 0.3])]]);
const waiting = cuts(DURATION, [
  [S("waiting"), P([0, 1.08, 4.6], [0, 0.8, 0.3]), P([0.2, 1.4, 5.9], [0, 0.78, 0])],
  // Your point of view, walking up to lift the lid.
  [BEATS.waiting + 14, P([0.2, 1.4, 5.9], [0, 0.78, 0]), P([0.12, 1.0, 3.9], [0, 0.8, 0])],
  [BEATS.lid, P([0.12, 1.0, 3.9], [0, 0.8, 0]), P([0.1, 0.98, 3.6], [0, 0.82, 0])],
]);

const TRACKS: CameraTrack[] = chainTracks(
  ([] as CameraTrack[]).concat(hook, octopus, skin, paint, knock, clam, scale, steal, hermit, pour, wait, starve, cold, croc, bite, suckers, yank, end, inside, waiting),
);

const opening = P([0.35, 0.95, 3.5], [0, 0.85, 0]);

export const config: EpisodeConfig = {
  id: "MimicBio",
  title: "How a Mimic Would Actually Work",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 400,
    initialPosition: opening.position,
    waypoints: [
      { frame: 0, ...opening },
      { frame: DURATION, ...opening },
    ],
    tracks: TRACKS,
    shake: [
      { at: BEATS.chomp0, strength: 0.32, spread: 8 },
      { at: BEATS.never + 3, strength: 0.06, spread: 5 },
      { at: MORPH, strength: 0.08, spread: 5 },
      { at: KNOCKS[0], strength: 0.1, spread: 5 },
      { at: KNOCKS[1], strength: 0.08, spread: 5 },
      { at: BEATS.snaps, strength: 0.24, spread: 7 },
      { at: CLAM_LAND, strength: 0.16, spread: 6 },
      { at: MEN_LAND[0], strength: 0.07, spread: 5 },
      { at: MEN_LAND[1], strength: 0.07, spread: 5 },
      { at: MEN_LAND[2], strength: 0.09, spread: 5 },
      { at: CRAB_IN, strength: 0.06, spread: 5 },
      { at: BEATS.tongue + 5, strength: 0.14, spread: 6 },
      { at: BEATS.chomp, strength: 0.34, spread: 8 },
      { at: BEATS.burp, strength: 0.08, spread: 5 },
      { at: BEATS.finalLunge + 4, strength: 0.3, spread: 8 },
    ],
  },
  audio: { src: "bio/mimic/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 6 },
  music: { src: "bio/mimic/score_v1.mp3", volume: 1, fadeInFrames: 10, fadeOutFrames: 20 },
  sfx: SFX,
  // The series subtitle style: 4-5 word chunks, active word in yellow.
  subtitles: { segments: wordTimestamps as SubtitleSegment[], activeColor: "#ffd84d", textColor: "#ffffff", bottomOffset: 370 },
  overlays: {
    grade: "saturate(1.1) contrast(1.05)",
    vignette: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 5,
    backgroundColor: "#0c0e15",
    postfx: { aoIntensity: 1.9, bloomIntensity: 0.42, bloomThreshold: 0.84, grain: 0.012, dof: { bokehScale: 3.6, range: 0.42 } },
  },
  OverlayComponent: MimicHUD,
};
