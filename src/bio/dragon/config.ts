import type { CameraPose, CameraTrack, EpisodeConfig, SfxCue, SubtitleSegment, Vec3 } from "../../engine/types";
import { loopCue, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { DragonHUD } from "./DragonHUD";
import {
  BEATS,
  DURATION,
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
const bed = (name: string, id: ShotId, volume = 0.5) => loopCue(sfx(name, shotStart(id), volume), shotEnd(id), 8);

/** Every cue keys to a beat or shot boundary, never a literal frame. */
export const SFX: SfxCue[] = [
  // 1. Cold open: beast rumble, belly burn, danger
  sfx("growl", 0, 0.75),
  bed("cavern", "hook", 0.4),
  sfx("blast", BEATS.fire, 0.6),

  // 2. Stomach 1: Fermentation & cow analogy
  bed("cavern", "cow", 0.35),
  sfx("growl", BEATS.gorge, 0.6),
  sfx("gurgle", BEATS.bacteria, 0.8),
  sfx("gurgle", BEATS.ferment, 0.85),
  sfx("burp", BEATS.burps, 0.9),

  // 3. Stomach 2: Muscular pressure vessel
  sfx("pressurize", BEATS.pressure, 0.85),
  sfx("pressurize", BEATS.pumps, 0.9),

  // 4. Living bomb & Oxygen safety
  sfx("blast", BEATS.bomb, 0.5),

  // 5. Gland trap & Komodo iron teeth strike
  sfx("growl", BEATS.light, 0.5),
  sfx("iron_clack", BEATS.snap, 1.0),
  sfx("spark", BEATS.snap, 0.95),
  sfx("spark", BEATS.sparks, 0.8),

  // 6. Flashback hazard & high velocity blast
  sfx("pressurize", BEATS.clench, 0.9),
  sfx("blast", BEATS.blast, 1.0),
  sfx("flamethrower", BEATS.blast + 2, 1.0),
  sfx("thud", BEATS.blast + 14, 0.75),

  // 7. Grand finale roar & flamethrower
  sfx("flamethrower", BEATS.congratulations, 0.95),
  sfx("growl", BEATS.flamethrower, 0.8),
];

// ---------------------------------------------------------------------------
// Camera Staging & Poses
// ---------------------------------------------------------------------------
const P = (position: Vec3, lookAt: Vec3, fov = 40): CameraPose => ({ position, lookAt, fov });
const mix = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
  lookAt: [lerp(a.lookAt[0], b.lookAt[0], t), lerp(a.lookAt[1], b.lookAt[1], t), lerp(a.lookAt[2], b.lookAt[2], t)],
  fov: lerp(a.fov ?? 40, b.fov ?? 40, t),
});

const LIFT = 0.085;
const framed = (p: CameraPose): CameraPose => {
  const d = Math.hypot(p.position[0] - p.lookAt[0], p.position[1] - p.lookAt[1], p.position[2] - p.lookAt[2]);
  const drop = LIFT * 2 * d * Math.tan((((p.fov ?? 40) * Math.PI) / 180) / 2);
  return { ...p, position: [p.position[0], p.position[1] - drop, p.position[2]], lookAt: [p.lookAt[0], p.lookAt[1] - drop, p.lookAt[2]] };
};

const track = (start: number, end: number, fn: (f: number) => CameraPose): CameraTrack => ({
  start: start - 1,
  end,
  blend: 1,
  fn: (f) => framed(fn(f)),
});

const cuts = (end: number, list: [number, CameraPose, CameraPose?][]): CameraTrack[] =>
  list.map(([start, a, b], i) => {
    const stop = i + 1 < list.length ? list[i + 1][0] : end;
    return track(start, stop, (f) => mix(a, b ?? a, easeInOut(progress(f, [start, stop]))));
  });

const S = shotStart;
const E = shotEnd;

const TRACKS: CameraTrack[] = [
  // 1. Hook: Medium establishing shot drifting closer to glowing cutaway belly
  ...cuts(E("hook"), [
    [0, P([-0.3, 1.5, 7.2], [-0.55, 1.0, 0]), P([-0.4, 1.35, 6.0], [-0.55, 0.95, 0])],
  ]),

  // 2. Fuel: Camera pulls back to reveal the whole proud beast
  ...cuts(E("fuel"), [
    [S("fuel"), P([0.1, 1.6, 8.2], [0.1, 1.1, 0]), P([0.2, 1.55, 7.8], [0.1, 1.1, 0])],
  ]),

  // 3. Cow: Framing dragon and goblin entering
  ...cuts(E("cow"), [
    [S("cow"), P([0.9, 1.5, 7.2], [0.7, 1.0, 0.2]), P([0.8, 1.45, 6.8], [0.7, 1.0, 0.2])],
  ]),

  // 4. Ferment: Close-up on Stomach 1 (Rumen) bubbling
  ...cuts(E("ferment"), [
    [S("ferment"), P([-0.85, 0.95, 3.6], [-0.87, 0.83, 0.18], 34), P([-0.85, 0.9, 3.3], [-0.87, 0.83, 0.18], 34)],
  ]),

  // 5. Burp: Cut to snout releasing a tiny comical puff
  ...cuts(E("burp"), [
    [S("burp"), P([1.35, 1.85, 3.8], [1.34, 1.84, 0], 34), P([1.38, 1.85, 4.0], [1.34, 1.84, 0], 34)],
  ]),

  // 6. Stomach 2: Close-up on Stomach 2 forming
  ...cuts(E("stomach2"), [
    [S("stomach2"), P([-0.28, 1.1, 3.6], [-0.29, 1.0, 0.18], 34), P([-0.28, 1.05, 3.3], [-0.29, 1.0, 0.18], 34)],
  ]),

  // 7. Pressure: Squeezing under pressure
  ...cuts(E("pressure"), [
    [S("pressure"), P([-0.28, 1.05, 3.3], [-0.29, 1.0, 0.18], 33), P([-0.28, 1.02, 2.9], [-0.29, 1.0, 0.18], 31)],
  ]),

  // 8. Living Bomb: Dramatic low-angle danger view
  ...cuts(E("bomb"), [
    [S("bomb"), P([-0.3, 0.7, 5.4], [-0.3, 1.1, 0]), P([-0.3, 0.75, 4.8], [-0.3, 1.1, 0])],
  ]),

  // 9. Oxygen: Close on pure cyan anaerobic tank (0% O2)
  ...cuts(E("oxygen"), [
    [S("oxygen"), P([-0.28, 1.08, 3.3], [-0.29, 1.0, 0.18], 33), P([-0.28, 1.05, 3.0], [-0.29, 1.0, 0.18], 33)],
  ]),

  // 10. Lips: Tight focus on lips and snout
  ...cuts(E("lips"), [
    [S("lips"), P([1.35, 1.85, 3.4], [1.34, 1.84, 0], 32), P([1.38, 1.85, 3.2], [1.34, 1.84, 0], 32)],
  ]),

  // 11. Gland: High-angle inspection of the throat hazard
  ...cuts(E("gland"), [
    [S("gland"), P([0.45, 1.65, 4.0], [0.45, 1.5, 0], 35), P([0.5, 1.6, 3.7], [0.45, 1.5, 0], 35)],
  ]),

  // 12. Teeth: Close-up of dark serrated Komodo iron teeth & head
  ...cuts(E("teeth"), [
    [S("teeth"), P([1.25, 1.85, 4.2], [1.25, 1.8, 0], 34), P([1.28, 1.85, 3.9], [1.25, 1.8, 0], 34)],
  ]),

  // 13. Strike: Jaws snap violently with sparks!
  ...cuts(E("strike"), [
    [S("strike"), P([1.28, 1.85, 3.9], [1.25, 1.8, 0], 34), P([1.3, 1.85, 3.5], [1.25, 1.8, 0], 32)],
  ]),

  // 14. Flashback: Side angle showing neck fuel conduit
  ...cuts(E("flashback"), [
    [S("flashback"), P([0.3, 1.5, 4.4], [0.3, 1.35, 0], 35), P([0.25, 1.45, 4.0], [0.3, 1.35, 0], 35)],
  ]),

  // 15. Clench: Tight muscular contraction
  ...cuts(E("clench"), [
    [S("clench"), P([-0.28, 1.08, 3.3], [-0.29, 1.0, 0.18], 33), P([-0.28, 1.02, 2.8], [-0.29, 1.0, 0.18], 31)],
  ]),

  // 16. Gas blast: Jetstream rushing out
  ...cuts(E("gasblast"), [
    [S("gasblast"), P([1.8, 1.75, 4.6], [1.6, 1.65, 0], 35), P([1.9, 1.75, 5.0], [1.7, 1.65, 0], 35)],
  ]),

  // 17. Flamethrower: Roaring inferno locked outside mouth, goblin blown back
  ...cuts(E("flamethrower"), [
    [S("flamethrower"), P([1.8, 1.75, 8.8], [1.7, 1.25, 0]), P([1.9, 1.75, 9.2], [1.7, 1.25, 0])],
  ]),

  // 18. Finale: Majestic full-cavern pull-back
  ...cuts(DURATION, [
    [S("finale"), P([1.8, 1.9, 10.2], [1.6, 1.2, 0]), P([1.8, 1.95, 10.8], [1.6, 1.2, 0])],
  ]),
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
      { at: BEATS.burps, strength: 0.05, spread: 4 },
      { at: BEATS.snap, strength: 0.28, spread: 7 },
      { at: BEATS.blast, strength: 0.36, spread: 12 },
      { at: BEATS.blast + 14, strength: 0.12, spread: 5 },
      { at: BEATS.congratulations, strength: 0.24, spread: 10 },
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
      aoIntensity: 1.8,
      bloomIntensity: 0.45,
      bloomThreshold: 0.82,
      grain: 0.012,
      dof: { bokehScale: 3.5, range: 0.45 },
    },
  },
  OverlayComponent: DragonHUD,
};
