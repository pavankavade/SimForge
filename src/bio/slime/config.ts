import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { chainTracks, loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { SlimeHUD } from "./SlimeHUD";
import {
  BEATS,
  BRAIN,
  CORE_SPLIT,
  DISSOLVE,
  DURATION,
  HEART,
  HOOK_LANDS,
  KNIGHT_ARRIVE,
  NUDGES,
  POUR,
  RENEW,
  ROUND_UP,
  SNAIL_RUN,
  STRAIN,
  SWALLOW,
  easeInOut,
  lerp,
  progress,
  shotEnd,
  shotStart,
  slugX,
  type ShotId,
} from "./timeline";

const cue = sfxFor("slime", "bio");
/** Effects sit about 6 dB under the voice. */
const SFX_GAIN = 0.5;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);
const bed = (name: string, id: ShotId, volume = 0.5) => loopCue(sfx(name, shotStart(id), volume), shotEnd(id), 8);

/** Every cue keys to a beat or shot boundary, never a literal frame. */
export const SFX: SfxCue[] = [
  // Cold open: four hops, the hop that fails, the puddle
  ...HOOK_LANDS.map((at, i) => sfx("boing", at - 12, 0.5 + i * 0.1)),
  ...HOOK_LANDS.map((at) => sfx("jelly", at, 0.45)),
  sfx("wobble", STRAIN[0], 0.5),
  sfx("pop", STRAIN[1], 0.3),
  sfx("splat", BEATS.puddle, 0.9),
  // Slime mold
  bed("forest", "mold"),
  bed("forest", "pump", 0.35),
  bed("forest", "slow"),
  sfx("squelch", BEATS.mold, 0.3),
  sfx("heartbeat", BEATS.pumping, 0.5),
  sfx("heartbeat", BEATS.back, 0.5),
  sfx("heartbeat", BEATS.forth, 0.5),
  loopCue(sfx("scuttle", SNAIL_RUN[0], 0.2), shotEnd("slow"), 6),
  sfx("tick", BEATS.few, 0.4),
  sfx("tick", BEATS.few + 12, 0.4),
  sfx("tick", BEATS.hour, 0.4),
  // Sea cucumber
  bed("water", "cucumber"),
  sfx("bubble", BEATS.cucumber, 0.3),
  sfx("crack", BEATS.stiff, 0.35),
  sfx("wobble", BEATS.soft + 2, 0.6),
  // Stand up, pour under the door
  sfx("boing", BEATS.standStiff, 0.7),
  sfx("jelly", BEATS.jelly, 0.5),
  sfx("squelch", BEATS.goSoft, 0.5),
  loopCue(sfx("pour", POUR[0], 0.7), POUR[1], 6),
  sfx("knock", POUR[0] + 8, 0.25),
  // Drying out
  loopCue(sfx("steam", BEATS.leaves, 0.4), BEATS.stain + 6, 10),
  sfx("sizzle", BEATS.sun, 0.45),
  sfx("pop", BEATS.stain, 0.3),
  sfx("tick", BEATS.lunch, 0.4),
  // Mucus, slug, the damp
  sfx("squelch", BEATS.wrap, 0.5),
  sfx("sparkle", BEATS.mucus + 4, 0.35),
  bed("swamp", "slug", 0.45),
  sfx("squelch", BEATS.slug, 0.3),
  sfx("drip", BEATS.dark, 0.6),
  sfx("drip", BEATS.dark + 13, 0.45),
  sfx("drip", BEATS.damp, 0.6),
  sfx("drip", BEATS.damp + 11, 0.4),
  // No mouth, amoeba, engulf
  ...NUDGES.map((at) => sfx("jelly", at, 0.5)),
  ...NUDGES.map((at) => sfx("clank", at + 1, 0.15)),
  bed("water", "amoeba", 0.4),
  sfx("squelch", shotStart("amoeba") + 4, 0.4),
  sfx("gulp", BEATS.amoeba + 8, 0.6),
  sfx("wobble", BEATS.flow, 0.6),
  sfx("whoosh", BEATS.over, 0.35),
  sfx("whoosh_big", BEATS.close, 0.5),
  sfx("splat", SWALLOW, 1),
  sfx("gulp", SWALLOW + 4, 0.9),
  // Acid, lining, stomach
  loopCue(sfx("sizzle", BEATS.acid, 0.5), BEATS.line, 10),
  sfx("bubble", BEATS.acid + 6, 0.4),
  sfx("pop", DISSOLVE, 0.5),
  sfx("steam", BEATS.meltYou, 0.45, { durationInFrames: 40, fadeOutFrames: 12 }),
  sfx("whoosh", BEATS.line, 0.3),
  sfx("sparkle", BEATS.lined, 0.45),
  sfx("heartbeat", BEATS.stomach, 0.4),
  sfx("bubble", BEATS.stomach + 8, 0.3),
  sfx("sparkle", RENEW[0], 0.35),
  sfx("sparkle", (RENEW[0] + RENEW[1]) / 2, 0.35),
  sfx("ding", BEATS.days, 0.25),
  // One heart, one brain, millions of cores
  sfx("pop", HEART[0], 0.4),
  sfx("squelch", HEART[1], 0.5),
  sfx("pop", BRAIN[0], 0.4),
  sfx("squelch", BRAIN[1], 0.5),
  bed("forest", "nuclei", 0.35),
  sfx("sparkle", BEATS.millions, 0.4),
  sfx("tick", BEATS.nuclei, 0.3),
  sfx("pop", CORE_SPLIT, 0.5),
  sfx("sparkle", CORE_SPLIT + 3, 0.45),
  // The clincher
  sfx("thud", KNIGHT_ARRIVE, 0.25),
  sfx("clank", BEATS.kill - 2, 0.35),
  sfx("whoosh", BEATS.cut - 4, 0.5),
  sfx("slice", BEATS.cut - 3, 1),
  sfx("splat", BEATS.cut, 0.6),
  sfx("boing", ROUND_UP, 0.7),
  sfx("boing", ROUND_UP + 4, 0.6),
  sfx("jelly", BEATS.two, 0.5),
  sfx("boing", BEATS.finalLunge - 2, 0.9),
  sfx("whoosh_big", BEATS.finalLunge, 0.6),
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
const track = (start: number, end: number, fn: (f: number) => CameraPose, lift = true): CameraTrack => ({ start: start - 1, end, blend: 1, fn: (f) => (lift ? framed(fn(f)) : fn(f)) });
/** Consecutive moves: each entry starts a segment that runs to the next one's start (the last to `end`). */
const cuts = (end: number, list: [number, CameraPose, CameraPose?][]): CameraTrack[] =>
  list.map(([start, a, b], i) => {
    const stop = i + 1 < list.length ? list[i + 1][0] : end;
    return track(start, stop, (f) => mix(a, b ?? a, easeInOut(progress(f, [start, stop]))));
  });
const S = shotStart;
const E = shotEnd;

const SLIME_LOOK: Vec3 = [0, 0.75, 0];

const hook = cuts(E("hook"), [
  // It hops up the vault toward the lens.
  [0, P([0.5, 1.35, 6.6], [0, 0.85, -0.6]), P([0.3, 1.2, 6.0], [0, 0.75, 0.6])],
  // The thought lands: a real one could never do that.
  [BEATS.real - 8, P([0.3, 1.1, 7.0], [0, 0.7, 1.1]), P([0.2, 1.05, 6.6], [0, 0.7, 1.1])],
  // Looking down as it lets go.
  [BEATS.just - 8, P([0.5, 2.4, 7.6], [0, 0.35, 1.1]), P([0.3, 3.4, 8.2], [0, 0.1, 1.1])],
]);
const mold = cuts(E("mold"), [[S("mold"), P([0.7, 2.9, 5.6], [-0.2, 0.05, 0.1]), P([0.1, 2.3, 4.7], [-0.2, 0.05, 0.1])]]);
const pump = cuts(E("pump"), [[S("pump"), P([0.7, 1.25, 2.9], [0.1, 0.05, 0.2], 34), P([0.2, 1.0, 2.5], [0.2, 0.05, 0.2], 34)]]);
const slow = cuts(E("slow"), [
  // Down at its level: it is as thin as paint.
  [S("slow"), P([0.5, 0.42, 4.2], [0, 0.2, 0.2]), P([0.1, 0.36, 3.7], [0, 0.18, 0.2])],
  // The race it loses to a snail.
  [SNAIL_RUN[0], P([0.3, 2.3, 5.4], [0, 0.1, 0.7]), P([0.4, 1.9, 4.8], [0.2, 0.1, 0.8])],
]);
const cucumber = cuts(E("cucumber"), [
  [S("cucumber"), P([1.5, 2.3, 7.6], [0, 1.0, 0]), P([0.6, 2.0, 7.1], [0, 1.0, 0])],
  [BEATS.stiff - 8, P([-1.6, 1.7, 7.2], [0, 0.95, 0]), P([-1.0, 1.5, 6.8], [0, 0.85, 0])],
]);
const stand = cuts(E("stand"), [[S("stand"), P([1.0, 1.8, 7.9], [0, 0.95, 0.7]), P([0.5, 1.6, 7.3], [0, 0.95, 0.7])]]);
const pour = cuts(E("pour"), [[S("pour"), P([0.5, 1.6, 7.3], [0, 0.95, 0.7]), P([0.25, 1.25, 6.3], [0, 0.6, 0])]]);
const dry = cuts(E("dry"), [
  [S("dry"), P([1.8, 1.7, 7.4], [0, 0.85, 0]), P([0.9, 1.6, 6.6], [0, 0.75, 0])],
  [BEATS.sun - 6, P([-0.7, 1.3, 4.9], [0, 0.4, 0]), P([-0.3, 1.9, 4.4], [0, 0.1, 0])],
]);
const coatCam = cuts(E("coat"), [[S("coat"), P([0.9, 1.35, 5.4], SLIME_LOOK), P([0.3, 1.2, 4.7], SLIME_LOOK)]]);
const slugCam = (f: number): CameraPose => {
  const x = slugX(f);
  const t = easeInOut(progress(f, [S("slug"), E("slug")]));
  return P([x + 0.7 - 0.4 * t, lerp(1.0, 0.85, t), lerp(8.6, 8.0, t)], [x + 0.1, 0.1, 0.3], 34);
};
const slug = [track(S("slug"), E("slug"), slugCam)];
const damp = cuts(E("damp"), [[S("damp"), P([-1.3, 1.1, 5.9], [0, 0.85, 0]), P([-0.7, 1.15, 5.3], [0, 0.85, 0])]]);
const nomouth = cuts(E("nomouth"), [[S("nomouth"), P([0.7, 1.55, 8.8], [-0.05, 0.7, 0.3]), P([0.4, 1.4, 8.2], [-0.05, 0.7, 0.3])]]);
// Straight down the eyepiece (no caption lift: the field is a circle in the middle of the frame).
const amoeba = [track(S("amoeba"), E("amoeba"), (f) => mix(P([0.1, 8.2, 1.3], [0.1, 0, 0.5], 46), P([0.2, 7.2, 1.2], [0.2, 0, 0.5], 46), easeInOut(progress(f, [S("amoeba"), E("amoeba")]))), false)];
const engulf = cuts(E("engulf"), [
  [S("engulf"), P([0.3, 1.8, 9.8], [0.1, 1.05, 0]), P([0.6, 1.6, 8.6], [0.5, 1.05, 0])],
  [BEATS.close - 4, P([1.0, 1.5, 7.8], [0.9, 1.0, 0]), P([1.0, 1.35, 7.0], [1.0, 0.95, 0])],
]);
const acid = cuts(E("acid"), [[S("acid"), P([0.7, 1.5, 7.4], [0, 0.95, 0]), P([0.2, 1.35, 6.7], [0, 0.95, 0])]]);
const line = cuts(E("line"), [[S("line"), P([-0.6, 1.4, 6.6], [0, 0.95, 0]), P([-0.2, 1.25, 6.1], [0, 0.95, 0])]]);
const stomach = cuts(E("stomach"), [[S("stomach"), P([0.15, 2.1, 9.4], [0, 1.95, 0]), P([0, 2.0, 8.7], [0, 1.95, 0])]]);
const noheart = cuts(E("noheart"), [[S("noheart"), P([0.6, 1.35, 5.2], SLIME_LOOK), P([0.2, 1.2, 4.6], SLIME_LOOK)]]);
const nuclei = cuts(E("nuclei"), [[S("nuclei"), P([1.1, 1.7, 3.7], [0, 0.05, 0.2], 36), P([0.4, 1.3, 3.2], [0.1, 0.05, 0.2], 36)]]);
const cores = cuts(E("cores"), [[S("cores"), P([-0.6, 1.25, 4.9], SLIME_LOOK), P([-0.1, 1.15, 4.3], SLIME_LOOK)]]);
const weakest = cuts(E("weakest"), [[S("weakest"), P([-0.9, 1.8, 8.4], [0.3, 1.05, -0.4]), P([-0.4, 1.65, 7.6], [0, 1.05, -0.4])]]);
// Low and heroic: the sword goes up behind the smug little slime.
const sword = cuts(E("sword"), [[S("sword"), P([0.6, 0.9, 6.3], [0, 1.15, -0.4]), P([0.3, 0.8, 5.7], [0, 1.2, -0.4])]]);
const cut = cuts(DURATION, [
  [S("cut"), P([0.2, 1.55, 7.4], [0, 0.95, -0.2]), P([0.1, 1.5, 7.1], [0, 0.95, -0.2])],
  [ROUND_UP - 6, P([-0.3, 1.35, 6.9], [0, 0.85, -0.1]), P([0, 1.25, 6.5], [0, 0.85, -0.1])],
]);

const TRACKS: CameraTrack[] = chainTracks(
  ([] as CameraTrack[]).concat(hook, mold, pump, slow, cucumber, stand, pour, dry, coatCam, slug, damp, nomouth, amoeba, engulf, acid, line, stomach, noheart, nuclei, cores, weakest, sword, cut),
);

const opening = P([0.5, 1.35, 6.6], [0, 0.85, -0.6]);

export const config: EpisodeConfig = {
  id: "SlimeBio",
  title: "How a Slime Would Actually Work",
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
      ...HOOK_LANDS.map((at, i) => ({ at, strength: 0.05 + 0.03 * i, spread: 5 })),
      { at: BEATS.puddle, strength: 0.14, spread: 6 },
      { at: BEATS.stiff, strength: 0.08, spread: 5 },
      { at: BEATS.standStiff + 10, strength: 0.07, spread: 5 },
      ...NUDGES.map((at) => ({ at, strength: 0.05, spread: 4 })),
      { at: SWALLOW, strength: 0.3, spread: 8 },
      { at: DISSOLVE, strength: 0.07, spread: 5 },
      { at: HEART[1], strength: 0.06, spread: 4 },
      { at: BRAIN[1], strength: 0.06, spread: 4 },
      { at: CORE_SPLIT, strength: 0.08, spread: 5 },
      { at: BEATS.cut, strength: 0.32, spread: 8 },
      { at: ROUND_UP + 10, strength: 0.08, spread: 5 },
      { at: BEATS.finalLunge + 6, strength: 0.3, spread: 8 },
    ],
  },
  audio: { src: "bio/slime/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 6 },
  music: { src: "bio/slime/score_v1.mp3", volume: 1, fadeInFrames: 10, fadeOutFrames: 20 },
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
  OverlayComponent: SlimeHUD,
};
