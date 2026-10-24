import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { followTrack, holdTrack, shot, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  CRUSHER_X,
  DURATION,
  ENTRY_X,
  GOBLIN_WALK,
  GOBLIN_X0,
  ROGUE_ENTER,
  ROGUE_END_X,
  ROGUE_ON_CAMERA,
  ROGUE_STROLL,
  ROGUE_WAIT_X,
  SLAMS,
  STAGE_STARTS,
  Z,
  rogueX,
} from "./timeline";

const sfx = sfxFor("__SLUG__");

/** Every cue is keyed to a BEATS value or a kinematics constant, never a literal frame. */
const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),

  // Level 1 - ceiling crusher
  sfx("chain", BEATS.install, 0.35),
  sfx("clank", BEATS.install + 14, 0.38),
  sfx("gears", BEATS.gearsStart, 0.25, { durationInFrames: SLAMS[0] - BEATS.gearsStart, fadeOutFrames: 6 }),
  sfx("whoosh", SLAMS[0], 0.3),
  sfx("slam", BEATS.crush, 0.55),
  sfx("squash", BEATS.crush, 0.5),
  sfx("slam", SLAMS[1] + 4, 0.45),
  sfx("hydraulic", BEATS.lift, 0.3),
  sfx("whoosh", ROGUE_STROLL[0] + 12, 0.25),
  sfx("thud", ROGUE_STROLL[0] + 26, 0.25),
  sfx("sparkle", ROGUE_STROLL[1], 0.2),

  // Finale
  sfx("stamp", BEATS.stamp, 0.6),
  sfx("boom", BEATS.stamp, 0.35),
];

/**
 * Camera. Portrait 9:16 at fov 40: at distance d the frame is ~0.41·d wide and
 * ~0.73·d tall. `shot(x, y, d)` = side-on view of (x, y) on the action plane.
 * Waypoints for establishing/reaction shots (hold them 25-90 frames), tracks
 * for anything fast. Waypoint frames come from BEATS, so keep them in order.
 */
const wp = (frame: number, pose: ReturnType<typeof shot>) => ({ frame: Math.round(frame), ...pose });

export const config: EpisodeConfig = {
  id: "__COMPOSITION_ID__",
  title: "Evolution of a __TITLE__",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [CRUSHER_X - 1, 3.6, Z + 13],
    waypoints: [
      // Title card over a wide shot of the hall.
      wp(0, shot(CRUSHER_X - 1, 2.4, 13)),
      // Install: look up at the crusher while the line names it. It sits in
      // the middle of the frame, below the title card (top ~30% of the frame).
      wp(BEATS.install - 8, shot(CRUSHER_X, 4.6, 8, { rise: -0.6 })),
      wp(BEATS.install + 24, shot(CRUSHER_X, 4.4, 8.6, { rise: -0.5 })),
      // Victim: the goblin wanders under it. Wide enough that the hanging
      // crusher stays in frame above him, floor above the subtitle band.
      wp(GOBLIN_WALK[0] + 10, shot((GOBLIN_X0 + CRUSHER_X) / 2, 1.9, 10)),
      wp(BEATS.goblinUnder, shot(CRUSHER_X, 2.0, 10.6, { rise: 0.8 })),
      // Impact, then hold on the pancake (>= 15 frames readable).
      wp(BEATS.crush + 2, shot(CRUSHER_X, 1.2, 8)),
      wp(ROGUE_ENTER[0] - 2, shot(CRUSHER_X, 0.8, 6.8)),
      // Counter: rogue waits out the second slam, strolls through, gloats.
      wp(ROGUE_ENTER[1] + 4, shot(ROGUE_WAIT_X + 0.6, 1.6, 9.6)),
      wp(ROGUE_STROLL[0], shot(CRUSHER_X, 1.5, 9.4)),
      wp(ROGUE_STROLL[1], shot(ROGUE_END_X - 0.4, 1.2, 7.2)),
      wp(ROGUE_STROLL[1] + 30, shot(ROGUE_END_X - 0.4, 1.1, 6.6)),
      // Finale: pull back for the stamp.
      wp(BEATS.stamp - 24, shot((CRUSHER_X + ROGUE_END_X) / 2, 2.4, 13)),
      wp(DURATION, shot((CRUSHER_X + ROGUE_END_X) / 2, 2.6, 14.5)),
    ],
    tracks: [
      // Rogue jogs in from the exit on camera. Cut once he is clear of the
      // doorway; clampX keeps the bright exit out of the frame.
      followTrack({
        start: ROGUE_ON_CAMERA,
        end: ROGUE_ENTER[1] + 6,
        target: (f) => [rogueX(f), 0, Z],
        dist: 9,
        lead: 0.3,
        clampX: [ENTRY_X + 2.4, Infinity],
        blend: 1,
      }),
      // Hard cut to a tight two-shot just before the second slam (never
      // before the rogue has arrived, or he is cut by the frame edge).
      holdTrack(Math.max(SLAMS[1] - 6, ROGUE_ENTER[1] + 2), SLAMS[1] + 16, shot((ROGUE_WAIT_X + CRUSHER_X) / 2, 1.3, 7.4)),
    ],
    shake: [
      { at: BEATS.crush, strength: 0.26, spread: 7 },
      { at: SLAMS[1] + 4, strength: 0.16, spread: 6 },
      { at: BEATS.stamp, strength: 0.22, spread: 8 },
    ],
    rumbles: [{ start: BEATS.install, end: BEATS.install + 14, strength: 0.03 }],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/__SLUG__/narration_v1.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/__SLUG__/score_v1.mp3",
    volume: 1,
    fadeInFrames: 20,
    fadeOutFrames: 40,
  },
  sfx: SFX,
  subtitles: {
    segments: wordTimestamps as SubtitleSegment[],
    activeColor: "#ffd84d",
    textColor: "#ffffff",
    bottomOffset: 370,
  },
  overlays: {
    grade: "saturate(1.18) contrast(1.05) brightness(1.05)",
    vignette:
      "linear-gradient(135deg, rgba(255,156,74,0.10) 0%, rgba(255,156,74,0) 38%, rgba(18,31,60,0.18) 100%), radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.24) 100%), linear-gradient(180deg, rgba(4,7,12,0.16) 0%, rgba(4,7,12,0) 20%, rgba(4,7,12,0) 72%, rgba(4,7,12,0.34) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 24,
    backgroundColor: "#20232d",
  },
  OverlayComponent: TrapHUD,
};
