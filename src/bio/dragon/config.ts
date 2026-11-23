import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { DragonHUD } from "./DragonHUD";
import {
  BEATS,
  D,
  DURATION,
  SNAPS,
  easeInOut,
  lerp,
  progress,
  shotEnd,
  shotStart,
  type ShotId,
} from "./timeline";

const cue = sfxFor("dragon", "bio");
/** Effects sit about 6 dB under the voice. */
const SFX_GAIN = 0.55;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);

/** Cave room tone under every lair stretch (not under the cow, Komodo, rocket and stove inserts). */
const lairBed = (from: number, to: number) => loopCue(sfx("cavern", from, 0.35), to, 10);

/** Every cue keys to a beat or shot boundary, never a literal frame. Sounds: AI takes (scripts/sfx-prompts/dragon.json). */
export const SFX: SfxCue[] = [
  // Cave beds
  lairBed(0, shotStart("cow")),
  lairBed(shotStart("stomach2"), shotStart("komodo")),
  lairBed(shotStart("strike"), shotStart("rocket")),
  lairBed(shotStart("face"), DURATION),

  // 1. Cold open: fire lit in the belly, the organs cook
  sfx("growl", 2, 0.55),
  sfx("fire_burst", BEATS.fire, 0.75),
  sfx("sizzle", BEATS.roast, 0.45),
  sfx("growl", BEATS.organs - 2, 0.7),
  sfx("gas_hiss", BEATS.never, 0.3),
  sfx("bubble", BEATS.fuel, 0.5),

  // 2. Gut: chewing, fermentation, the cow
  sfx("growl", BEATS.gorge, 0.4),
  sfx("chew", BEATS.rotting, 0.85),
  sfx("chew", BEATS.rotting + 40, 0.7),
  sfx("gurgle", BEATS.bacteria, 0.85),
  sfx("bubble", BEATS.ferment, 0.8),
  sfx("bubble", BEATS.methane, 0.6),
  sfx("burp", BEATS.burps, 0.95),
  sfx("candle", BEATS.burps + 6, 0.7),

  // 3. Second stomach: grows, pumps
  sfx("squeeze", BEATS.stomach, 0.7),
  sfx("pressurize", BEATS.pumps, 0.85),
  ...[0, 15, 30].map((k) => sfx("squeeze", BEATS.pumps + k, 0.55)),

  // 4. Living bomb
  sfx("spark_small", BEATS.spark - 6, 0.7),
  sfx("explosion", BEATS.detonates, 1.0),

  // 5. Inert tank, venting lips, the gland
  sfx("spark_small", BEATS.air, 0.4),
  sfx("gas_hiss", BEATS.lips - 8, 0.5),
  sfx("fire_burst", BEATS.incinerates, 0.6),
  sfx("sizzle", BEATS.incinerates, 0.9),
  sfx("roar", BEATS.incinerates + 2, 0.6),

  // 6. Iron teeth: three snaps
  ...SNAPS.map((t) => sfx("iron_clack", t, 1.0)),
  ...SNAPS.map((t) => sfx("spark", t, 0.8)),

  // 7. Flashback, clench, blast
  sfx("fire_burst", BEATS.backwards - 14, 0.5),
  sfx("flashback", BEATS.backwards - 6, 0.85),
  sfx("squeeze", BEATS.clench, 0.9),
  sfx("pressurize", BEATS.clench + 4, 0.75),
  sfx("gas_hiss", BEATS.blast - 4, 0.6),
  loopCue(sfx("flamethrower", BEATS.blast, 0.9), shotStart("rocket"), 6),

  // 8. Rocket, stove, the walking flamethrower
  sfx("rocket", shotStart("rocket"), 0.9, { durationInFrames: shotEnd("rocket") - shotStart("rocket") + 4, fadeOutFrames: 4 }),
  sfx("stove", shotStart("stove"), 0.8),
  loopCue(sfx("flamethrower", shotStart("face"), 0.85), DURATION, 12),
  sfx("roar", BEATS.congratulations, 0.85),
  sfx("growl", BEATS.flamethrower, 0.6),
];

// ---------------------------------------------------------------------------
// Camera: one or two poses per shot, eased between them; hard cuts between shots
// ---------------------------------------------------------------------------
const P = (position: Vec3, lookAt: Vec3, fov = 40): CameraPose => ({ position, lookAt, fov });
const mix = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
  fov: lerp(a.fov ?? 40, b.fov ?? 40, t),
});

/** Lift the subject above the subtitle band: aim a little low. */
const LIFT = 0.085;
const framed = (p: CameraPose): CameraPose => {
  const d = Math.hypot(p.position[0] - p.lookAt[0], p.position[1] - p.lookAt[1], p.position[2] - p.lookAt[2]);
  const drop = LIFT * 2 * d * Math.tan((((p.fov ?? 40) * Math.PI) / 180) / 2);
  return { ...p, position: [p.position[0], p.position[1] - drop, p.position[2]], lookAt: [p.lookAt[0], p.lookAt[1] - drop, p.lookAt[2]] };
};

const S = shotStart;
const E = shotEnd;
/** One shot: hard cut in, ease from `a` to `b` over the shot. */
const shot = (id: ShotId, a: CameraPose, b?: CameraPose): CameraTrack => ({
  start: S(id) - 1,
  end: E(id),
  blend: 1,
  fn: (f) => framed(mix(a, b ?? a, easeInOut(progress(f, [S(id), E(id)])))),
});
const at = (p: Vec3, dx = 0, dy = 0, dz = 0): Vec3 => [p[0] + dx, p[1] + dy, p[2] + dz];

const TRACKS: CameraTrack[] = [
  // Hook: the whole beast in its cave, low and wide, pushing in; then side-on through the glass.
  shot("hook", P([6.0, 1.4, 6.6], [0.4, 1.6, 0]), P([4.9, 1.45, 5.5], [0.5, 1.6, 0])),
  shot("hookXray", P([0.4, 1.6, 6.4], [0.3, 1.5, 0]), P([0.5, 1.4, 4.8], at(D.chest, 0, 0.1))),
  shot("fuel", P([0.3, 1.4, 4.6], at(D.gut, 0.1, 0.1)), P([0.3, 1.3, 4.0], at(D.gut, 0.1, 0.05))),
  // Gut: head down into the heap, then the rumen up close.
  shot("gorge", P([4.4, 1.4, 4.6], [1.5, 0.95, 0.2]), P([3.9, 1.2, 3.9], [1.6, 0.8, 0.3])),
  shot("ferment", P([0.3, 1.15, 3.0], D.gut, 36), P([0.25, 1.1, 2.5], D.gut, 36)),
  // Cow: side medium, then the mouth and the candle.
  shot("cow", P([0.5, 1.0, 4.6], [0.3, 0.8, 0]), P([0.7, 1.0, 4.0], [0.4, 0.8, 0])),
  shot("burp", P([1.3, 1.0, 2.1], [1.25, 0.9, 0], 36), P([1.3, 0.98, 1.85], [1.25, 0.9, 0], 36)),
  // Second stomach grows, then pumps.
  shot("stomach2", P([0.6, 1.35, 4.2], at(D.tank, -0.15, 0.1)), P([0.65, 1.3, 3.5], at(D.tank, -0.1, 0.05))),
  shot("pressure", P([0.75, 1.15, 2.8], D.tank, 36), P([0.72, 1.13, 2.3], D.tank, 36)),
  // Bomb: low hero angle; the ember drifts in; the blast.
  shot("bomb", P([3.8, 0.6, 8.0], [0.2, 1.55, 0]), P([3.3, 0.65, 7.0], [0.2, 1.5, 0])),
  // Oxygen: the sealed tank, then the lips.
  shot("oxygen", P([0.9, 1.25, 3.1], D.tank, 36), P([0.8, 1.2, 2.6], D.tank, 36)),
  shot("lips", P([1.5, 1.6, 2.2], [1.25, 1.5, 0], 36), P([1.5, 1.58, 1.95], [1.25, 1.5, 0], 36)),
  // Gland: head and neck side-on through the glass.
  shot("gland", P([1.0, 1.75, 3.6], [0.95, 1.65, 0])),
  // Teeth turn to iron; the Komodo; the snaps.
  shot("teeth", P([1.3, 1.62, 2.3], [1.2, 1.55, 0], 38), P([1.3, 1.6, 2.0], [1.2, 1.53, 0], 38)),
  shot("komodo", P([1.2, 0.8, 3.0], [0.95, 0.45, 0], 36), P([1.25, 0.7, 2.5], [1.05, 0.4, 0], 36)),
  shot("strike", P([1.45, 1.55, 2.5], [1.15, 1.42, 0], 38), P([1.4, 1.52, 2.25], [1.15, 1.4, 0], 38)),
  // Flashback down the duct, the clench, the blast.
  shot("flashback", P([0.95, 1.6, 4.2], [0.95, 1.5, 0])),
  shot("clench", P([0.8, 1.45, 4.2], [0.8, 1.38, 0]), P([0.8, 1.4, 3.8], [0.8, 1.35, 0])),
  shot("blast", P([1.7, 1.8, 7.0], [1.6, 1.7, 0]), P([1.95, 1.8, 6.4], [1.8, 1.7, 0])),
  // Comparisons.
  shot("rocket", P([0.3, 2.4, 5.6], [0, 2.0, 0]), P([0.2, 2.3, 5.0], [0, 2.0, 0])),
  shot("stove", P([0, 1.0, 1.7], [0, 0.15, 0], 40), P([0, 0.9, 1.45], [0, 0.15, 0], 40)),
  // The flame held off the face, then the walking flamethrower, wide.
  shot("face", P([2.8, 1.95, 3.9], [1.45, 1.8, 0]), P([2.6, 1.92, 3.5], [1.5, 1.8, 0])),
  shot("finale", P([4.6, 1.9, 8.6], [2.0, 1.7, 0.4]), P([6.0, 2.0, 9.0], [3.6, 1.7, 0.8])),
];


const opening = TRACKS[0].fn(0);

export const config: EpisodeConfig = {
  id: "DragonBio",
  title: "How a Dragon Survives Its Own Fire",
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
      { at: BEATS.fire, strength: 0.1, spread: 6 },
      { at: BEATS.organs, strength: 0.12, spread: 6 },
      { at: BEATS.detonates, strength: 0.36, spread: 12 },
      { at: BEATS.incinerates, strength: 0.16, spread: 7 },
      ...SNAPS.map((t) => ({ at: t, strength: 0.14, spread: 5 })),
      { at: BEATS.blast, strength: 0.3, spread: 10 },
      { at: BEATS.congratulations, strength: 0.18, spread: 8 },
    ],
  },
  audio: { src: "bio/dragon/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 6 },
  music: { src: "bio/dragon/score_v1.mp3", volume: 1, fadeInFrames: 10, fadeOutFrames: 20 },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffea3b",
    textColor: "rgba(255, 255, 255, 0.88)",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.15) contrast(1.08)",
    vignette: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.48) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 6,
    backgroundColor: "#0d0f14",
    postfx: {
      aoIntensity: 1.4,
      bloomIntensity: 0.7,
      bloomThreshold: 0.9,
      grain: 0.018,
      dof: { bokehScale: 1.8, range: 0.6 },
    },
  },
  OverlayComponent: DragonHUD,
};
