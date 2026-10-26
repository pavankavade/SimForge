import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { followTrack, holdTrack, orbitShot, shot, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  BEEPS,
  DURATION,
  ENTRY_X,
  FOLD_END,
  GRAB_X,
  LUNGE_DX,
  MAGE1_LEAVE,
  MAGE1_ON_CAMERA,
  MAGE1_WALK,
  MAGE2_ON_CAMERA,
  MAGE2_WALK,
  MIMIC,
  MIRROR_POPS,
  PALADIN1_ON_CAMERA,
  PALADIN1_WALK,
  PARTY,
  PARTY_ON_CAMERA,
  PARTY_WALK,
  POLE_TAPS,
  ROGUE1_CLIMB,
  ROGUE1_GLOAT_END,
  ROGUE1_KICKS,
  ROGUE1_ON_CAMERA,
  ROGUE1_WALK,
  ROGUE2_CLIMB,
  ROGUE2_ON_CAMERA,
  ROGUE2_SLIPS,
  ROGUE2_WALK,
  STAGE_STARTS,
  Z,
  kickFrame,
  walkerX,
} from "./timeline";

const sfx = sfxFor("crushing-walls");

const kicks = (win: readonly [number, number]) => Array.from({ length: ROGUE1_KICKS - 1 }, (_, k) => kickFrame(k, win));
const plateLands = [0, 1, 2].map((i) => BEATS.platesIn + i * 8 + 12);

/** Every cue is keyed to a BEATS value or a kinematics constant, never a literal frame. */
const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),

  // Level 1: sliding stone walls, goblin pancake
  sfx("rumble", BEATS.wallsIn, 0.35, { durationInFrames: BEATS.wallsInEnd - BEATS.wallsIn, fadeOutFrames: 6 }),
  sfx("slam", BEATS.wallsInEnd - 6, 0.35),
  sfx("ramp", BEATS.pedestalUp, 0.3),
  sfx("zap", BEATS.wiresGlow, 0.15),
  sfx("ding", BEATS.goblinGrab, 0.3),
  sfx("sparkle", BEATS.coinUp, 0.25),
  sfx("gears", BEATS.l1Close, 0.3, { durationInFrames: BEATS.crush1 - BEATS.l1Close, fadeOutFrames: 4 }),
  sfx("slam", BEATS.crush1, 0.55),
  sfx("squash", BEATS.crush1, 0.5),
  sfx("hydraulic", BEATS.reopen1, 0.25),

  // Level 1 counter: rogue parkours out through the vent
  sfx("whoosh", ROGUE1_ON_CAMERA, 0.2),
  sfx("ding", BEATS.rogue1Grab, 0.25),
  sfx("gears", BEATS.rogue1Grab + 2, 0.22, { durationInFrames: BEATS.escape - BEATS.rogue1Grab, fadeOutFrames: 6 }),
  ...kicks(ROGUE1_CLIMB).map((f) => sfx("thud", f, 0.3)),
  sfx("whoosh", BEATS.ventIn, 0.3),
  sfx("slam", BEATS.roof + 6, 0.5),
  sfx("sparkle", BEATS.roof + 10, 0.25),

  // Level 2: greased steel plates + spring boot
  sfx("hydraulic", BEATS.reopen2, 0.25),
  ...plateLands.map((f) => sfx("clank", f, 0.35)),
  sfx("squelch", BEATS.grease, 0.35),
  sfx("ratchet", BEATS.chimney, 0.3),
  sfx("boing", BEATS.bootDemo, 0.35),
  sfx("trap_close", BEATS.hatch, 0.3),
  sfx("whoosh", Math.max(ROGUE2_ON_CAMERA, BEATS.hatch + 4), 0.2),
  sfx("ding", BEATS.rogue2Grab, 0.25),
  sfx("gears", BEATS.rogue2Grab + 2, 0.25, { durationInFrames: BEATS.slam3 - BEATS.rogue2Grab, fadeOutFrames: 4 }),
  ...kicks(ROGUE2_CLIMB).map((f) => sfx("thud", f, 0.22)),
  ...ROGUE2_SLIPS.map(([a]) => sfx("slip", a, 0.4)),
  sfx("boing", BEATS.punt, 0.45),
  sfx("launch", BEATS.punt, 0.3),
  sfx("thud", BEATS.land2, 0.4),
  sfx("slam", BEATS.slam3 + 6, 0.55),
  sfx("squash", BEATS.slam3 + 6, 0.5),
  sfx("hydraulic", BEATS.reopen3, 0.25),

  // Level 2 counter: the paladin wedges a beam
  sfx("gears", BEATS.creep3, 0.22, { durationInFrames: BEATS.stall - BEATS.creep3, fadeOutFrames: 6 }),
  sfx("ratchet", BEATS.wedge, 0.3),
  sfx("clang", BEATS.stall, 0.5),
  sfx("sparkle", BEATS.smug, 0.25),

  // Level 3: electrified hydraulic presses
  sfx("clank", BEATS.pressL, 0.4),
  sfx("slam", BEATS.pressL + 10, 0.35),
  sfx("clank", BEATS.pressR, 0.4),
  sfx("slam", BEATS.pressR + 10, 0.35),
  sfx("hydraulic", BEATS.hiss, 0.45),
  sfx("zap", BEATS.electrify, 0.3),
  sfx("zap", BEATS.sparkL, 0.3),
  sfx("zap", BEATS.sparkR, 0.3),
  sfx("sizzle", BEATS.arc1, 0.35, { durationInFrames: BEATS.roastEnd - BEATS.arc1, fadeOutFrames: 6 }),
  sfx("zap", BEATS.arc2, 0.35),
  sfx("helmet", BEATS.fold, 0.4),
  sfx("crack", BEATS.fold + 8, 0.4),
  sfx("squash", FOLD_END, 0.5),
  sfx("hydraulic", BEATS.cubeReopen, 0.25),
  sfx("toaster_ding", BEATS.cube, 0.5),

  // Level 3 counter: the mage blinks out
  sfx("ding", BEATS.mage1Grab, 0.25),
  sfx("gears", BEATS.mage1Grab + 3, 0.25, { durationInFrames: BEATS.close4End - BEATS.mage1Grab, fadeOutFrames: 4 }),
  sfx("levitate", BEATS.cast, 0.3),
  sfx("sparkle", BEATS.blink, 0.3),
  sfx("whoosh", BEATS.blink, 0.3),
  sfx("slam", BEATS.close4End, 0.45),
  sfx("sparkle", MAGE1_LEAVE[0] - 20, 0.2),

  // Level 4: arcane mirror pong
  sfx("hydraulic", BEATS.reopen4, 0.25),
  ...MIRROR_POPS.map((f) => sfx("pop", f, 0.25)),
  sfx("ice", MIRROR_POPS[0], 0.15),
  sfx("ding", BEATS.mage2Grab, 0.25),
  sfx("levitate", BEATS.mage2Grab + 4, 0.3),
  sfx("zap", BEATS.teleport, 0.3),
  sfx("gears", BEATS.mage2Grab + 3, 0.22, { durationInFrames: BEATS.pop - BEATS.mage2Grab, fadeOutFrames: 4 }),
  ...BEEPS.map((f) => sfx("pong_beep", f, 0.18)),
  sfx("pop", BEATS.pop, 0.5),
  sfx("slam", BEATS.pop + 2, 0.45),
  sfx("squash", BEATS.pop + 2, 0.5),
  sfx("hydraulic", BEATS.reopen5, 0.25),

  // Level 5: the lunging rail room
  sfx("whoosh", PARTY_ON_CAMERA, 0.15),
  ...POLE_TAPS.map((t) => sfx("click", t.at, 0.3)),
  sfx("rumble", BEATS.rails, 0.35, { durationInFrames: 16, fadeOutFrames: 6 }),
  sfx("roll", BEATS.rails, 0.3, { durationInFrames: 16, fadeOutFrames: 6 }),
  sfx("clank", BEATS.wheels, 0.4),
  sfx("twang", BEATS.booster, 0.35),
  sfx("ratchet", BEATS.booster + 6, 0.3),
  sfx("growl", BEATS.rails + 8, 0.2),
  sfx("click", BEATS.trigger, 0.4),
  sfx("zap", BEATS.trigger, 0.2),
  sfx("whoosh_big", BEATS.lunge, 0.5),
  sfx("roll", BEATS.lunge, 0.35, { durationInFrames: 10, fadeOutFrames: 4 }),
  sfx("slam", BEATS.lunge + 8, 0.4),
  sfx("gate", BEATS.portcullis, 0.5),
  sfx("slam", BEATS.blast + 2, 0.55),
  sfx("squash", BEATS.blast + 2, 0.4),
  sfx("whoosh", BEATS.launch, 0.35),
  ...PARTY.map((_, i) => sfx("launch", BEATS.launch + 6 * i, 0.3)),
  sfx("trap_open", BEATS.mimicOpen, 0.4),
  sfx("chomp", BEATS.chomp, 0.55),
  sfx("chew", BEATS.chomp + 10, 0.4),
  sfx("burp", BEATS.burp, 0.5),

  // Finale
  sfx("stamp", BEATS.stamp, 0.6),
  sfx("boom", BEATS.stamp, 0.35),
];

/**
 * Camera. Portrait 9:16 at fov 40: at distance d the frame is ~0.41·d wide and
 * ~0.73·d tall. `shot(x, y, d)` = side-on view of (x, y) on the action plane.
 * Waypoints for establishing/reaction shots, tracks for anything fast.
 * Waypoint frames come from BEATS, so keep them in order.
 */
const wp = (frame: number, pose: ReturnType<typeof shot>) => ({ frame: Math.round(frame), ...pose });

/** Entry follows: start once the newcomer is clear of the doorway, never frame the exit. */
const entry = (start: number, end: number, x: (f: number) => number, dist = 9.5, clampMax = 0) =>
  followTrack({ start, end, target: (f) => [x(f), 0, Z], dist, lead: 0.6, height: 0.7, clampX: [-7.8, clampMax], blend: 1 });

const MIMIC_X = LUNGE_DX + MIMIC.x;
const FINALE_X = (LUNGE_DX + MIMIC_X) / 2;

export const config: EpisodeConfig = {
  id: "CrushingWalls",
  title: "Evolution of a Crushing Walls",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [0, 3.0, Z + 14.5],
    waypoints: [
      // L1: title card over the hall; the walls slide in below it.
      wp(0, shot(0, 2.0, 14.5, { rise: 1 })),
      wp(BEATS.pedestalUp - 4, shot(0, 1.5, 10)),
      wp(BEATS.goblinGrab - 30, shot(-0.8, 1.5, 9.5)),
      wp(BEATS.coinUp, shot(0, 1.35, 8.2)),
      wp(BEATS.doubleTake, shot(0, 1.25, 7.4)),
      wp(BEATS.crush1 + 2, shot(0, 1.15, 6.6)),
      wp(BEATS.reopen1 + 16, shot(0, 1.0, 6.4)),
      // L1 counter: whole room height for the wall-jumps, tilt up to the roof.
      wp(BEATS.parkour - 4, shot(0, 1.85, 10.5)),
      wp(BEATS.escape, shot(0, 2.3, 10.5)),
      wp(BEATS.roof, shot(0.4, 3.6, 10)),
      wp(ROGUE1_GLOAT_END - 6, shot(0.4, 3.4, 10)),
      // L2 install: roof + chimney, then under the vent for the boot.
      wp(BEATS.chimney - 4, shot(0, 3.3, 9)),
      wp(BEATS.bootDemo - 4, shot(0, 2.2, 9)),
      wp(BEATS.climb2, shot(0, 1.85, 10.5)),
      wp(BEATS.punt + 6, shot(0, 1.4, 9)),
      // L2 counter: the beam wedge.
      wp(BEATS.wedge - 4, shot(0, 1.7, 10)),
      wp(BEATS.stall, shot(0, 1.6, 9.2)),
      wp(BEATS.smug, shot(0, 1.3, 7.5)),
      wp(BEATS.pressL - 5, shot(0, 1.3, 7.1)),
      // L3: wide on both presses, then in on the beam and the roast.
      wp(BEATS.hiss - 4, shot(0, 2.3, 22, { rise: 2 })),
      wp(BEATS.electrify, shot(0, 1.7, 11)),
      wp(BEATS.sparkL - 4, shot(0, 1.5, 8.5)),
      wp(BEATS.fold, shot(0, 1.2, 7.5)),
      wp(BEATS.cube, shot(0.5, 0.9, 6.4)),
      // L3 counter: the blink, with mage 1 outside the right wall.
      wp(BEATS.cast - 4, shot(0, 1.3, 8)),
      wp(BEATS.blink + 2, shot(1.6, 1.35, 10)),
      wp(MIRROR_POPS[0] - 5, shot(1.4, 1.4, 10)),
      // L4: the orb forms, slow push-in during the pong.
      wp(BEATS.teleport - 2, shot(0, 1.5, 9.5)),
      wp(BEATS.pop - 30, shot(0, 1.4, 8.2)),
      wp(BEATS.reopen5 + 22, shot(0, 1.1, 7)),
      // L5: the party pokes ahead outside the doorway.
      wp(BEATS.poke - 4, shot(-3.0, 1.3, 10.5)),
      wp(BEATS.rails - 2, shot(-1.7, 1.7, 18.5, { rise: 3.5 })),
      wp(BEATS.booster + 10, shot(-1.7, 1.7, 18.5, { rise: 3.5 })),
      wp(BEATS.stickIn - 4, shot(-1.3, 1.0, 10.5)),
      wp(BEATS.trigger + 4, shot(-1.3, 1.0, 10.5)),
      wp(BEATS.trigger + 18, shot(-3.3, 1.3, 10)),
      wp(BEATS.blast - 6, shot(LUNGE_DX, 1.4, 9)),
      wp(BEATS.launch + 4, shot(LUNGE_DX + 0.7, 3.0, 12)),
      wp(BEATS.chomp - 6, shot(MIMIC_X, 3.7, 9.8)),
      // Finale: room + mimic centred for the stamp.
      wp(BEATS.burp + 10, shot(FINALE_X, 2.6, 18)),
      wp(DURATION, shot(FINALE_X, 2.7, 19.5)),
    ],
    tracks: [
      // L1 counter: rogue 1 sprints in.
      entry(ROGUE1_ON_CAMERA, BEATS.rogue1Grab, (f) => walkerX(f, ROGUE1_WALK, ENTRY_X, GRAB_X)),
      // L2 install: three-quarter view on the right wall's inner face for the plates and grease.
      holdTrack(BEATS.platesIn - 2, BEATS.grease + 24, orbitShot(0.2, 1.6, 9.2, -0.22)),
      // L2 victim: rogue 2 sprints in once the hatch is shut.
      entry(Math.max(ROGUE2_ON_CAMERA, BEATS.hatch + 4), BEATS.rogue2Grab, (f) => walkerX(f, ROGUE2_WALK, ENTRY_X, GRAB_X)),
      holdTrack(BEATS.slam3 - 4, BEATS.reopen3 + 20, shot(0, 1.15, 6.8)),
      // L2 counter: the paladin walks in.
      entry(Math.max(PALADIN1_ON_CAMERA, BEATS.reopen3 + 20), BEATS.paladinArrive, (f) => walkerX(f, PALADIN1_WALK, ENTRY_X, 0), 10),
      // L3: left press drops, then the right.
      holdTrack(BEATS.pressL - 4, BEATS.pressR - 2, shot(-2.0, 2.3, 11)),
      holdTrack(BEATS.pressR - 2, BEATS.pressR + 16, shot(2.0, 2.3, 11)),
      holdTrack(BEATS.roast - 2, BEATS.roastEnd + 4, shot(0, 1.2, 6.8)),
      // L3 counter: mage 1 strolls in.
      entry(MAGE1_ON_CAMERA, BEATS.mage1Grab, (f) => walkerX(f, MAGE1_WALK, ENTRY_X, GRAB_X)),
      // L4 install: mirrors pop in on each wall face.
      holdTrack(MIRROR_POPS[0] - 4, MIRROR_POPS[2], orbitShot(0, 1.5, 9, 0.45)),
      holdTrack(MIRROR_POPS[2], MIRROR_POPS[4] + 12, orbitShot(0, 1.5, 9, -0.45)),
      // L4 victim: mage 2 jogs in.
      entry(Math.max(MAGE2_ON_CAMERA, MIRROR_POPS[4] + 12), BEATS.mage2Grab, (f) => walkerX(f, MAGE2_WALK, ENTRY_X, GRAB_X)),
      holdTrack(BEATS.pop - 2, BEATS.reopen5 + 22, shot(0, 1.15, 6.8)),
      // L5: the party walks in behind the paladin.
      entry(
        Math.max(PARTY_ON_CAMERA, BEATS.reopen5 + 22),
        BEATS.partyArrive,
        (f) => walkerX(f, PARTY_WALK[0], PARTY[0].x - 7, PARTY[0].x) - 0.8,
        10,
        -2.4
      ),
      // The room lunges into frame around them.
      holdTrack(BEATS.lunge - 3, BEATS.portcullis + 20, shot(LUNGE_DX, 1.8, 14)),
    ],
    shake: [
      { at: BEATS.crush1, strength: 0.26, spread: 7 },
      { at: BEATS.roof + 6, strength: 0.18, spread: 6 },
      ...plateLands.map((at) => ({ at, strength: 0.08, spread: 5 })),
      { at: BEATS.punt, strength: 0.14, spread: 5 },
      { at: BEATS.land2, strength: 0.12, spread: 5 },
      { at: BEATS.slam3 + 6, strength: 0.28, spread: 7 },
      { at: BEATS.stall, strength: 0.16, spread: 6 },
      { at: BEATS.pressL + 10, strength: 0.2, spread: 6 },
      { at: BEATS.pressR + 10, strength: 0.2, spread: 6 },
      { at: BEATS.sparkL, strength: 0.08, spread: 5 },
      { at: FOLD_END, strength: 0.3, spread: 7 },
      { at: BEATS.cube, strength: 0.08, spread: 5 },
      { at: BEATS.close4End, strength: 0.18, spread: 6 },
      { at: BEATS.pop + 2, strength: 0.26, spread: 7 },
      { at: BEATS.lunge + 8, strength: 0.32, spread: 8 },
      { at: BEATS.portcullis, strength: 0.12, spread: 5 },
      { at: BEATS.blast + 2, strength: 0.3, spread: 7 },
      { at: BEATS.chomp, strength: 0.16, spread: 6 },
      { at: BEATS.stamp, strength: 0.22, spread: 8 },
    ],
    rumbles: [
      { start: BEATS.wallsIn, end: BEATS.wallsInEnd, strength: 0.03 },
      { start: BEATS.l1Close, end: BEATS.crush1, strength: 0.02 },
      { start: BEATS.rogue2Grab + 2, end: BEATS.slam3, strength: 0.02 },
      { start: BEATS.creep3, end: BEATS.stall, strength: 0.02 },
      { start: BEATS.hiss, end: BEATS.hiss + 20, strength: 0.03 },
      { start: BEATS.roast, end: BEATS.roastEnd, strength: 0.02 },
      { start: BEATS.mage2Grab + 3, end: BEATS.pop - 40, strength: 0.02 },
      { start: BEATS.pop - 40, end: BEATS.pop, strength: 0.04 },
      { start: BEATS.rails, end: BEATS.booster, strength: 0.03 },
      { start: BEATS.lunge, end: BEATS.lunge + 12, strength: 0.05 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/crushing-walls/narration_v2.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/crushing-walls/score_v2.mp3",
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
