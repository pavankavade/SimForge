import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { sfxFor } from "../../kit";
import { OPENING, TRACKS } from "./camera";
import wordTimestamps from "./data/wordTimestamps.json";
import { PriestHUD } from "./PriestHUD";
import {
  BEATS,
  BOLT,
  BRICKS,
  BURST,
  CLOSE1,
  CLOSE2,
  DROP1,
  DROP2,
  DURATION,
  FORCE,
  H1_ON_STEP,
  HINGE_ON,
  KNOCKS_HOLLOW,
  KNOCKS_SOLID,
  LIFT1,
  LIFT2,
  OUT_DOOR,
  PANEL_OFF,
  POUNDS,
  POUR,
  SECRET_OPEN,
  SECRET_SHUT,
  SHAFT_DOWN,
  THUMP_HIT,
  TRIP,
} from "./timeline";

const B = BEATS;

// ---------------------------------------------------------------------------
// Sound: every cue keys to a beat or kinematics constant, never a literal frame.
// ---------------------------------------------------------------------------
const cue = sfxFor("priest-hole", "shelter");
/** Effects sit well under the voice (about -11 dB): subtle room sounds, nothing that jumps out. */
const SFX_GAIN = 0.28;
const sfx: typeof cue = (name, frame, volume = 1, extra) => cue(name, frame, volume * SFX_GAIN, extra);
/** One knock out of a three-knock clip. */
const knock = (name: string, frame: number, volume: number) => sfx(name, frame, volume, { durationInFrames: 7, fadeOutFrames: 3 });

const BRICK_TAPS = Array.from({ length: 6 }, (_, i) => BRICKS[0] + Math.round(((BRICKS[1] - BRICKS[0]) * i) / 6));

export const SFX: SfxCue[] = [
  // The title.
  sfx("stamp", 6, 0.35),
  // l1: pounding, in under the stairs, the door, the creak under the boot.
  sfx("pound", POUNDS[0], 0.55),
  sfx("pound", POUNDS[4], 0.4, { durationInFrames: 16, fadeOutFrames: 4 }),
  sfx("creak", LIFT1[0], 0.4),
  sfx("thud", DROP1[1], 0.3),
  sfx("trap_close", CLOSE1[1] - 2, 0.25),
  sfx("door_burst", BURST, 0.5),
  sfx("creak", H1_ON_STEP, 0.7),
  // l2: the hinge, the drop, the bolt; the hollow knocks.
  sfx("clank", HINGE_ON[0] + 6, 0.25),
  sfx("creak", LIFT2[0], 0.3),
  sfx("thud", DROP2[1], 0.3),
  sfx("trap_close", CLOSE2[1] - 2, 0.25),
  sfx("bolt", BOLT[0], 0.5),
  ...KNOCKS_HOLLOW.map((k) => knock("knock_hollow", k, 0.7)),
  // l3: bricks laid, the dead knocks; the ropes.
  ...BRICK_TAPS.map((t) => sfx("brick", t, 0.3)),
  ...KNOCKS_SOLID.map((k) => knock("knock_solid", k, 0.7)),
  // l4: down the shaft; the reed and the soup.
  sfx("thud", SHAFT_DOWN[1], 0.25),
  sfx("chew", B.camp, 0.2),
  sfx("pour", POUR[0], 0.5),
  // l5: panels prised off; the secret door; the hatch forced, the thump on the wall.
  ...PANEL_OFF.map((p) => sfx("rip", p - 12, 0.35)),
  ...PANEL_OFF.map((p) => sfx("clatter", p + 10, 0.3)),
  sfx("creak", SECRET_OPEN[0], 0.3),
  sfx("trap_close", SECRET_SHUT[1] - 2, 0.2),
  sfx("crack", FORCE, 0.35),
  sfx("thud", THUMP_HIT, 0.45),
  sfx("creak", OUT_DOOR - 30, 0.25),
  // l6: the trip, the cat; the stamp.
  sfx("creak", TRIP - 2, 0.5),
  sfx("thud", TRIP + 4, 0.25),
  sfx("meow", B.cat + 2, 0.35),
  sfx("stamp", B.congrats, 0.35),
];

const wp = (frame: number, p: { position: [number, number, number]; lookAt: [number, number, number] }) => ({ frame: Math.round(frame), ...p });
const POSTFX = { aoIntensity: 1.2, bloomIntensity: 0.35, bloomThreshold: 0.88, grain: 0.008 };

export const config: EpisodeConfig = {
  id: "PriestHole",
  title: "How a Staircase Becomes a Priest Hole",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 400,
    initialPosition: OPENING.position,
    waypoints: [wp(0, OPENING), wp(DURATION, OPENING)],
    tracks: TRACKS,
    shake: [
      ...POUNDS.map((p) => ({ at: p, strength: 0.04, spread: 4, punch: 0 })),
      { at: BURST, strength: 0.12, spread: 8 },
      { at: H1_ON_STEP, strength: 0.06, spread: 6, punch: 0 },
      { at: DROP2[1], strength: 0.05, spread: 4, punch: 0 },
      { at: FORCE, strength: 0.08, spread: 6 },
      { at: THUMP_HIT, strength: 0.1, spread: 7 },
      { at: TRIP + 4, strength: 0.06, spread: 5, punch: 0 },
      { at: B.congrats, strength: 0.1, spread: 8 },
    ],
    rumbles: [],
  },
  audio: { src: "shelter/priest-hole/narration_v4.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 },
  music: { src: "shelter/priest-hole/score_v4.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 40 },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.05) contrast(1.05)",
    vignette: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.22) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 30,
    backgroundColor: "#8fb8e3",
    postfx: POSTFX,
  },
  OverlayComponent: PriestHUD,
};

// ---------------------------------------------------------------------------
// PriestHoleLab: the cast's kit and acting poses (Lab.tsx).
// ---------------------------------------------------------------------------
export const LAB_DURATION = 240;

export const labConfig: EpisodeConfig = {
  id: "PriestHoleLab",
  title: "Priest Hole Lab",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: LAB_DURATION,
  camera: {
    fov: 40,
    near: 0.05,
    far: 200,
    initialPosition: [0, 1.5, 7.6],
    waypoints: [
      { frame: 0, position: [0, 1.5, 7.6], lookAt: [0, 0.95, 0] },
      { frame: LAB_DURATION, position: [0, 1.5, 7.6], lookAt: [0, 0.95, 0] },
    ],
  },
  overlays: { fadeInFrames: 0, fadeOutFrames: 0, backgroundColor: "#2a2f3a" },
};
