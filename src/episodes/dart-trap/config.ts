import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { chainTracks, easeInOut, followTrack, holdTrack, lerp, loopCue, progress, shot, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  CART_CREEP,
  CART_PUSH,
  CART_TRIGGER_X,
  DURATION,
  ENTRY_X,
  GOBLIN_DEAD_X,
  GOBLIN_WALK,
  MAGE_FLIGHT,
  MAGE_ON_CAMERA,
  MAGE_WALK,
  MAGE_X,
  MIMIC_X,
  PALADIN_ON_CAMERA,
  PALADIN_WALK,
  PALADIN_X,
  PARTY_FLIGHT,
  PIN_X,
  PLATE_X,
  ROGUE_HOP,
  ROGUE_LEAP,
  ROGUE_ON_CAMERA,
  ROGUE_PLATE_X,
  ROGUE_RUN,
  SLOWMO,
  STAGE_STARTS,
  Z,
  cartX,
  goblinX,
  mageX,
  paladinBatHit,
  paladinBody,
  paladinX,
  partyFlightCenter,
  rogueBody,
  rogueX,
} from "./timeline";

const sfx = sfxFor("dart-trap");

/** Every cue is keyed to a BEATS value or a kinematics constant, never a literal frame. */
const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),

  // Level 1 - plate + dart battery
  sfx("clank", BEATS.plateInstall + 4, 0.35),
  sfx("trap_open", BEATS.batteryInstall, 0.4),
  sfx("clank", BEATS.batteryInstall + 12, 0.35),
  sfx("click", BEATS.goblinTrigger, 0.55),
  sfx("ratchet", BEATS.nozzlesOpen, 0.4),
  sfx("dart_fire", BEATS.goblinHit - 5, 0.7),
  sfx("dart_hit", BEATS.goblinHit, 0.58),
  sfx("thud", BEATS.goblinHit + 10, 0.45),

  // Counter - rogue backflips the volleys
  sfx("whoosh", ROGUE_HOP[0], 0.3),
  sfx("click", ROGUE_HOP[1], 0.5),
  sfx("whoosh", BEATS.matrixLean, 0.4),
  sfx("dart_fire", BEATS.matrix, 0.6),
  sfx("whoosh_big", SLOWMO[0], 0.3),
  loopCue(sfx("wind", SLOWMO[0], 0.22), SLOWMO[1]),
  sfx("whoosh", SLOWMO[1], 0.45),
  sfx("thud", BEATS.matrixUp, 0.2),
  sfx("sparkle", BEATS.swagger, 0.25),

  // Level 2 - bat darts
  sfx("magic", BEATS.enchant, 0.45),
  sfx("zap", BEATS.batWings, 0.35),
  sfx("whoosh", ROGUE_LEAP[0], 0.45),
  sfx("dart_fire", BEATS.batFire, 0.6),
  sfx("thud", ROGUE_LEAP[1], 0.3),
  sfx("bank", BEATS.uTurn - 6, 0.75),
  sfx("dart_hit", BEATS.rogueHit, 0.61),
  sfx("thud", BEATS.rogueHit + 9, 0.45),

  // Counter - paladin's shield
  sfx("clank", BEATS.shieldUp, 0.35),
  sfx("dart_fire", BEATS.paladinBatFire, 0.55),
  ...[0, 1, 2].map((wv) => sfx("tink", paladinBatHit(wv * 3), 0.65)),
  sfx("sparkle", BEATS.rain + 10, 0.25),

  // Level 3 - ballista + winch
  sfx("hydraulic", BEATS.ballistaInstall, 0.55),
  sfx("clank", BEATS.ballistaBolted, 0.45),
  sfx("hydraulic", BEATS.ballistaLift, 0.45),
  sfx("chain", BEATS.harpoonLoad, 0.35),
  sfx("ballista_cock", BEATS.harpoonLoad + 8, 0.55),
  sfx("ballista_fire", BEATS.ballistaFire, 0.61),
  sfx("harpoon_hit", BEATS.harpoonHit, 0.68),
  sfx("winch", BEATS.winch, 0.7, { durationInFrames: BEATS.pin - BEATS.winch + 4, fadeOutFrames: 6, loop: true }),
  sfx("slam", BEATS.pin, 0.5),
  sfx("thud", BEATS.pin + 2, 0.5),

  // Counter - mage's cyclone
  sfx("ballista_cock", BEATS.pin + 32, 0.45),
  sfx("magic", BEATS.mageCast, 0.4),
  loopCue(sfx("wind", BEATS.cyclone, 0.55), BEATS.shatter),
  sfx("ballista_fire", BEATS.ballistaFire2, 0.54),
  sfx("clang", BEATS.deflect, 0.7),
  sfx("whoosh", BEATS.deflect + 2, 0.4),

  // Level 4 - arcane coilgun
  sfx("hydraulic", BEATS.upgrade, 0.45),
  sfx("sparkle", BEATS.arcane, 0.4),
  sfx("coil_charge", BEATS.capacitors, 0.7),
  sfx("coil_fire", BEATS.coilFire, 0.65),
  sfx("zap", BEATS.slugHit, 0.7),
  sfx("boom", BEATS.shatter, 0.54),
  sfx("coil_charge", BEATS.shatter + 12, 0.55),
  sfx("coil_fire", BEATS.coilFire2, 0.65),
  sfx("boom", BEATS.mageBlasted, 0.65),
  sfx("launch", BEATS.mageBlasted + 2, 0.6),

  // Level 5 - gatlings, barricade, rams, mimic
  loopCue(sfx("roll", CART_PUSH[0], 0.3), CART_PUSH[1]),
  sfx("hydraulic", BEATS.coilgunSink, 0.35),
  sfx("gears", BEATS.turretsReveal, 0.55),
  sfx("creak", BEATS.gatling, 0.4),
  sfx("roll", CART_CREEP[0], 0.25, { durationInFrames: CART_CREEP[1] - CART_CREEP[0], fadeOutFrames: 6, loop: true }),
  sfx("click", BEATS.cartTrigger, 0.6),
  sfx("gears", BEATS.gatlingSpin, 0.6),
  sfx("gatling", BEATS.gatlingFire, 0.65, { durationInFrames: BEATS.splinter + 6 - BEATS.gatlingFire, fadeOutFrames: 6, loop: true }),
  sfx("splinter", BEATS.splinter, 0.68),
  sfx("ram", BEATS.ramPunch, 0.68),
  sfx("whoosh", BEATS.launch, 0.7),
  sfx("creak", BEATS.mimicOpen, 0.5),
  sfx("chomp", BEATS.mimicChomp, 0.68),
  sfx("burp", BEATS.mimicBurp, 0.6),

  // Finale stamp
  sfx("stamp", BEATS.stamp, 0.58),
  sfx("boom", BEATS.stamp, 0.5),
];

/**
 * Camera. Portrait 9:16 at fov 40: at distance d the frame is ~0.41·d wide and
 * ~0.73·d tall; look height ~0.19·d keeps the floor ~25% up from the bottom.
 * Waypoints for establishing/reaction shots, tracks for everything fast.
 */
const wp = (frame: number, pose: ReturnType<typeof shot>) => ({ frame: Math.round(frame), ...pose });

/** The level-2 bat loop: rogue on the left, the U-turn above the corpses. */
const BAT_LOOP_SHOT = shot(-0.25, 2.0, 10.6);
/** Two-shot of the ballista/coilgun and the wall winch. */
const TRAP_SHOT = shot(5.2, 1.75, 8.8);
/** Paladin or mage making their stand, with incoming fire from the right. */
const STAND_SHOT = shot(-0.3, 1.8, 9.6);

export const config: EpisodeConfig = {
  id: "DartTrap",
  title: "Evolution of a Dart Trap",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [4.3, 3.8, Z + 12.5],
    waypoints: [
      // Title over the trap corridor, then push in to the plate and the battery as they're named.
      wp(0, shot(4.7, 2.0, 10.5)),
      wp(BEATS.plateInstall - 8, shot(5.1, 1.3, 6.8)),
      wp(BEATS.batteryInstall + 10, shot(5.3, 1.25, 6.6)),
      wp(GOBLIN_WALK[1] - 50, shot(5.2, 1.3, 6.8)),
      // Rogue's swagger, then the enchanted battery.
      wp(BEATS.matrixUp + 12, shot(ROGUE_PLATE_X, 1.4, 6.8)),
      wp(BEATS.enchant - 6, shot(ROGUE_PLATE_X + 0.4, 1.4, 6.6)),
      wp(BEATS.enchant + 10, shot(5.2, 1.5, 7.4)),
      wp(BEATS.rogueLeap - 4, shot(5.0, 1.6, 8.0)),
      // Bounce off the shield, rain, gloat.
      wp(BEATS.bounce - 4, STAND_SHOT),
      wp(BEATS.rain + 6, shot(PALADIN_X + 0.6, 1.5, 7.6)),
      wp(BEATS.ballistaInstall - 8, shot(PALADIN_X + 0.4, 1.4, 7.0)),
      // Boots, smoking.
      wp(MAGE_FLIGHT[1] + 4, shot(MAGE_X, 1.0, 6.4)),
      wp(CART_PUSH[0] + 10, shot(MAGE_X, 0.9, 5.8)),
      // Finale: pull back over the whole trap corridor for the stamp.
      wp(BEATS.stamp - 40, shot(3.8, 2.9, 15.6)),
      wp(DURATION, shot(3.8, 3.0, 16.6)),
    ],
    tracks: chainTracks([
      // L1 victim: pan with the goblin, widening so the plate stays in frame ahead of him.
      {
        start: GOBLIN_WALK[1] - 46,
        end: BEATS.goblinTrigger,
        blend: 12,
        fn: (f) => {
          const gx = goblinX(f);
          const d = Math.max(7.2, Math.min(11, (PLATE_X + 1.0 - gx + 1.2) / 0.36));
          return shot((gx - 0.5 + PLATE_X + 1.0) / 2, 0.19 * d, d);
        },
      },
      // Trigger, double-take, pin-cushion, corpse.
      holdTrack(BEATS.goblinTrigger, BEATS.goblinHit + 12, shot(5.15, 1.4, 7.4), 10),
      holdTrack(BEATS.goblinHit + 12, ROGUE_ON_CAMERA, shot(GOBLIN_DEAD_X + 0.5, 1.25, 6.6), 12),
      // Rogue sprints in from the exit (cut once he's clear of the doorway).
      followTrack({
        start: ROGUE_ON_CAMERA,
        end: ROGUE_RUN[1] - 4,
        target: (f) => [rogueX(f), 0, Z],
        dist: 9,
        lead: 1.0,
        minY: 1.6,
        clampX: [ENTRY_X + 2.4, 1.0],
        blend: 1,
      }),
      // Hop onto the plate, then a slow push-in through bullet time as the volley
      // crawls inches over the bent-back rogue.
      holdTrack(ROGUE_RUN[1] - 4, BEATS.matrixLean, shot(4.4, 1.6, 8.6), 6),
      {
        start: BEATS.matrixLean,
        end: BEATS.matrixUp + 6,
        blend: 6,
        fn: (f) => {
          const t = easeInOut(progress(f, SLOWMO));
          return shot(lerp(4.6, 4.3, t), lerp(1.35, 1.15, t), lerp(7.2, 5.8, t), { rise: lerp(1.3, 0.7, t) });
        },
      },
      // Backflip leap over the bat burst, following him back to the left.
      followTrack({
        start: ROGUE_LEAP[0] - 2,
        end: ROGUE_LEAP[1] + 2,
        target: (f) => [rogueBody(f).x - 0.4, 1.6, Z],
        dist: 10.4,
        minY: 1.9,
        blend: 8,
      }),
      // U-turn and the dive into his back, corpse held until the paladin is clear of the door.
      holdTrack(ROGUE_LEAP[1] + 2, PALADIN_ON_CAMERA, BAT_LOOP_SHOT, 10),
      // Paladin shield-walks in.
      followTrack({
        start: PALADIN_ON_CAMERA,
        end: PALADIN_WALK[1],
        target: (f) => [paladinX(f), 0, Z],
        dist: 9.4,
        lead: 0.9,
        minY: 1.7,
        clampX: [ENTRY_X + 2.4, PALADIN_X],
        blend: 1,
      }),
      holdTrack(PALADIN_WALK[1], BEATS.bounce - 4, shot(0.2, 2.0, 10.8), 10),
      // Ballista install, then the paladin bracing.
      holdTrack(BEATS.ballistaInstall - 2, BEATS.harpoonLoad + 26, TRAP_SHOT, 10),
      holdTrack(BEATS.harpoonLoad + 26, BEATS.reel, shot(-0.1, 1.7, 9.0), 1),
      // Reeled across and up into the wall.
      followTrack({
        start: BEATS.reel,
        end: BEATS.pin,
        target: (f) => [paladinX(f) + 0.5, paladinBody(f).y + 1.4, Z],
        dist: 10,
        minY: 1.6,
        clampX: [-Infinity, PIN_X - 1.0],
        blend: 6,
      }),
      holdTrack(BEATS.pin, MAGE_ON_CAMERA, shot(PIN_X - 1.0, 2.5, 9.2), 6),
      // Mage jogs in; cyclone; deflect.
      followTrack({
        start: MAGE_ON_CAMERA,
        end: MAGE_WALK[1],
        target: (f) => [mageX(f), 0, Z],
        dist: 9.4,
        lead: 0.9,
        minY: 1.7,
        clampX: [ENTRY_X + 2.4, MAGE_X],
        blend: 1,
      }),
      holdTrack(MAGE_WALK[1], BEATS.upgrade - 8, STAND_SHOT, 10),
      // Coilgun install and charge, then back to the mage for both shots.
      holdTrack(BEATS.upgrade - 8, BEATS.coilFire - 30, TRAP_SHOT, 10),
      holdTrack(BEATS.coilFire - 30, MAGE_FLIGHT[0] + 6, STAND_SHOT, 1),
      followTrack({
        start: MAGE_FLIGHT[0] + 6,
        end: MAGE_FLIGHT[1],
        target: (f) => [MAGE_X, Math.min(3.2, f - MAGE_FLIGHT[0]) * 0.6, Z],
        dist: 9.6,
        minY: 1.8,
        blend: 4,
      }),
      // Party pushes the barricade down the hallway.
      followTrack({
        start: CART_PUSH[0] + 30,
        end: CART_PUSH[1] + 4,
        target: (f) => [cartX(f) - 0.7, 0, Z],
        dist: 9,
        lead: 0.6,
        minY: 1.7,
        clampX: [ENTRY_X + 2.6, Infinity],
        blend: 1,
      }),
      holdTrack(CART_PUSH[1] + 4, BEATS.turretsReveal - 6, shot(CART_TRIGGER_X - 0.8, 1.6, 8.0), 8),
      // The turrets swing out of both walls.
      holdTrack(BEATS.turretsReveal - 6, BEATS.creep - 6, shot(3.9, 2.3, 11.6), 1),
      // Creep onto the plate, the crossfire, splinters, rams.
      holdTrack(BEATS.creep - 6, PARTY_FLIGHT[0] + 4, shot(CART_TRIGGER_X + 0.2, 1.9, 10.0), 1),
      // Flight into the mimic.
      followTrack({
        start: PARTY_FLIGHT[0] + 4,
        end: PARTY_FLIGHT[1],
        target: (f) => partyFlightCenter(f),
        dist: 11,
        minY: 1.9,
        clampX: [-Infinity, MIMIC_X - 0.8],
        blend: 6,
      }),
      holdTrack(PARTY_FLIGHT[1], BEATS.stamp - 46, shot(MIMIC_X - 0.2, 1.9, 9.0), 6),
    ]),
    shake: [
      { at: BEATS.goblinHit, strength: 0.16, spread: 6 },
      { at: BEATS.rogueHit, strength: 0.18, spread: 6 },
      { at: paladinBatHit(0), strength: 0.1, spread: 5 },
      { at: BEATS.ballistaInstall + 14, strength: 0.14, spread: 6 },
      { at: BEATS.ballistaFire, strength: 0.14, spread: 5 },
      { at: BEATS.harpoonHit, strength: 0.3, spread: 8 },
      { at: BEATS.pin, strength: 0.32, spread: 8 },
      { at: BEATS.deflect, strength: 0.14, spread: 5 },
      { at: BEATS.coilFire, strength: 0.16, spread: 5 },
      { at: BEATS.shatter, strength: 0.26, spread: 8 },
      { at: BEATS.mageBlasted, strength: 0.34, spread: 9 },
      { at: BEATS.splinter, strength: 0.3, spread: 8 },
      { at: BEATS.ramPunch, strength: 0.34, spread: 9 },
      { at: BEATS.mimicChomp, strength: 0.3, spread: 8 },
      { at: BEATS.stamp, strength: 0.3, spread: 10 },
    ],
    rumbles: [
      { start: BEATS.ballistaInstall, end: BEATS.ballistaInstall + 20, strength: 0.03 },
      { start: BEATS.winch, end: BEATS.pin, strength: 0.03 },
      { start: BEATS.capacitors, end: BEATS.coilFire, strength: 0.025 },
      { start: BEATS.gatlingFire, end: BEATS.splinter, strength: 0.045 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/dart-trap/narration_v1.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/dart-trap/score_v1.mp3",
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
