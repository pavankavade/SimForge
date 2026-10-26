import type { FootageConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import subtitlesData from "./data/wordTimestamps.json";
import { BEATS, DURATION, FOOTAGE_LAST } from "./timeline";
import { loopCue, sfxFor } from "../../kit/sfx";
import { TrapHUD } from "./TrapHUD";

const sfx = sfxFor("nuclear-bunker", "shelter");

// Every cue matches a key in scripts/blender_nuclear_bunker.py.
const SFX_CUES: SfxCue[] = [
  sfx("stamp", 6, 0.45),

  // L1: Dad drops into the hole; the walls cave in
  sfx("whoosh", BEATS.climb - 2, 0.4),
  sfx("thud", BEATS.climb + 7, 0.5),
  sfx("rumble", BEATS.bombDrops, 0.25, { durationInFrames: 40, fadeOutFrames: 16 }),
  sfx("dirt_collapse", BEATS.cavesIn - 4, 0.65),
  sfx("thud", BEATS.cavesIn + 18, 0.4),

  // L2: the steel pipe drops in and is buried; the bomb goes off
  sfx("whoosh_big", BEATS.pipe - 8, 0.45),
  sfx("clang", BEATS.pipe + 6, 0.6),
  sfx("slam", BEATS.pipe + 14, 0.45),
  sfx("dust", BEATS.bury, 0.45),
  sfx("boom", BEATS.explosion, 0.75),
  loopCue(sfx("rumble", BEATS.explosion + 4, 0.35), BEATS.rains, 20),
  sfx("sizzle", BEATS.rains, 0.25, { durationInFrames: 50, fadeOutFrames: 14 }),
  sfx("geiger", BEATS.radioactive, 0.3, { durationInFrames: 36, fadeOutFrames: 10 }),

  // L3: half-value layers appear, the rays fall and die at each one
  sfx("pop", BEATS.layers + 6, 0.3),
  sfx("pop", BEATS.layers + 14, 0.3),
  sfx("pop", BEATS.layers + 22, 0.3),
  sfx("pop", BEATS.layers + 30, 0.3),
  sfx("zap", BEATS.halfRays, 0.45),
  sfx("ding", BEATS.stops, 0.4),
  sfx("zap", BEATS.doorwayRays, 0.45),
  sfx("whoosh", BEATS.doorway - 4, 0.4),

  // L4: the tunnel bends; ten people squeeze in
  sfx("clank", BEATS.bend, 0.55),
  sfx("sparkle", BEATS.bend + 2, 0.35),
  sfx("clank", BEATS.again, 0.5),
  sfx("pop", BEATS.ten + 4, 0.25),
  sfx("pop", BEATS.ten + 16, 0.25),
  sfx("pop", BEATS.ten + 28, 0.25),
  sfx("pop", BEATS.ten + 40, 0.25),
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
  sfx("dust", BEATS.dig, 0.45),
  sfx("hatch", BEATS.hatchOpen, 0.6),

  // L8: the Geiger counter clicks
  sfx("pop", BEATS.hang, 0.35),
  sfx("geiger", BEATS.clicks, 0.55, { durationInFrames: 108, fadeOutFrames: 12 }),

  // L9-L10: decay, supplies, furniture
  sfx("sparkle", BEATS.decay + 20, 0.35),
  sfx("pop", BEATS.supplies, 0.35),
  sfx("pop", BEATS.supplies + 6, 0.3),
  sfx("thud", BEATS.beds + 10, 0.45),
  sfx("radio_static", BEATS.radio, 0.35, { durationInFrames: 40, fadeOutFrames: 10 }),

  // Finale
  sfx("stamp", BEATS.congrats, 0.6),
  sfx("boom", BEATS.congrats + 4, 0.5),
];

export const config: FootageConfig = {
  id: "NuclearBunker",
  title: "How a Hole in Your Yard Becomes a Nuclear Bunker",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  footage: {
    src: "shelter/nuclear-bunker/scene_v1.mp4",
    lastFrame: FOOTAGE_LAST,
  },
  audio: {
    src: "shelter/nuclear-bunker/narration_v1.mp3",
    volume: 1.0,
  },
  music: {
    src: "shelter/nuclear-bunker/score_v1.mp3",
    volume: 1.0,
  },
  subtitles: {
    segments: subtitlesData as SubtitleSegment[],
    mode: "word",
    wordTop: 700,
  },
  sfx: SFX_CUES,
  overlays: {
    vignette: false,
    fadeInFrames: 6,
    fadeOutFrames: 14,
  },
  OverlayComponent: TrapHUD,
};
