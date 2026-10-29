import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { chainTracks, followTrack, holdTrack, loopCue, orbitShot, shot, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BARB_LAND_X,
  BARB_ON_CAMERA,
  DOOR_I_X,
  HUB_CUT,
  HUB_WALK,
  barbX,
  BARB_SEG,
  BARB_SPLASH,
  BARB_WALK,
  BARD_X,
  BEATS,
  DURATION,
  ENTRY_X,
  FALLS_X,
  GEYSER_XS,
  GOLD_PILE_X,
  LAKE_L,
  MAGE1_ON_CAMERA,
  MAGE2_ENTER,
  MAGE2_HOP,
  MAGE2_ON_CAMERA,
  MAGE2_STOP_X,
  MAGE2_WALK,
  MAGE_FLOAT_Y,
  PAL_ON_CAMERA,
  ROGUE2_ENTER,
  ROGUE2_ON_CAMERA,
  ROGUE2_SEG,
  ROGUE_DIVE,
  ROGUE_FLIP,
  ROGUE_ON_CAMERA,
  SEG_XS,
  STAGE_STARTS,
  SURF_HOP,
  VAULT_LEDGE,
  VAULT_X,
  Z,
  mage1X,
  mage1Y,
  mage2X,
  palX,
  palY,
  rogue2X,
  rogueX,
} from "./timeline";

const sfx = sfxFor("lava-bridge");
const LAKE_MID = (LAKE_L + VAULT_LEDGE) / 2;

/** Every cue is keyed to a BEATS value or a kinematics constant, never a literal frame. */
const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),

  // Cold open: fist through the ceiling, heavy landing.
  sfx("punch", BEATS.punch, 0.6),
  sfx("whoosh", BEATS.punch + 4, 0.25),
  sfx("thud", BEATS.land, 0.6),
  sfx("growl", BEATS.land + 14, 0.3),
  sfx("trap_open", BEATS.doorOpen, 0.3),
  ...[0, 1].map((k) => sfx("thud", HUB_WALK[0] + 6 + k * 14, 0.18)),

  // Level 1 - lava lake and the crumbling bridge
  sfx("rumble", BEATS.lavaRise, 0.35),
  loopCue(sfx("lava_bubble", BEATS.lavaRise + 10, 0.18), BEATS.wave),
  sfx("grind", BEATS.bridgeRise, 0.4),
  sfx("crack", BEATS.crumbleDemo + 4, 0.25),
  ...[0, 1, 2].map((k) => sfx("thud", BARB_WALK[0] + 10 + k * 16, 0.22)),
  sfx("thud", BEATS.stomp, 0.45),
  sfx("crumble", BEATS.barbSlabDrop, 0.55),
  sfx("whoosh", BEATS.barbDrop, 0.3),
  sfx("lava_splash", BARB_SPLASH, 0.6),
  sfx("bubble", BEATS.barbBones, 0.3),

  // Counter: the rogue outruns the collapse.
  sfx("grind", BEATS.bridgeReset, 0.3),
  ...SEG_XS.slice(0, 7).map((_, i) => sfx("crumble", BEATS.rogueSprint + 6 + i * 9, 0.22)),
  sfx("crumble", BEATS.lastGapFalls, 0.4),
  sfx("whoosh", ROGUE_FLIP[0], 0.35),
  sfx("thud", ROGUE_FLIP[1], 0.3),
  sfx("sparkle", ROGUE_FLIP[1] + 4, 0.2),
  sfx("whoosh", ROGUE_DIVE[0], 0.25),
  sfx("coins", BEATS.coins, 0.55),

  // Level 2 - collapse from both ends
  sfx("grind", BEATS.bridgeRise2, 0.4),
  sfx("zap", BEATS.bothEnds, 0.3),
  ...[0, 1, 2, 3].map((k) => sfx("crumble", BEATS.collapse + k * 9, 0.4)),
  sfx("crack", BEATS.sink, 0.35),
  sfx("sizzle", BEATS.sink + 10, 0.35),
  sfx("lava_splash", BEATS.rogue2Under, 0.45),

  // Counter: the mage floats over.
  sfx("levitate", BEATS.mageFloat, 0.35),

  // Level 3 - geysers
  ...GEYSER_XS.map((_, i) => sfx("grind", BEATS.geyserInstall + i * 6, 0.25)),
  sfx("geyser", BEATS.geyserDemo - 4, 0.5),
  sfx("geyser", BEATS.geyserDemo + 8, 0.45),
  sfx("geyser", BEATS.launch - 7, 0.6),
  sfx("launch", BEATS.launch, 0.4),
  sfx("whoosh_big", BEATS.launch + 2, 0.35),
  sfx("lava_splash", BEATS.mageSplash, 0.55),

  // Counter: the paladin surfs.
  sfx("lava_splash", SURF_HOP[1], 0.35),
  sfx("geyser", BEATS.ride1 - 8, 0.5),
  sfx("geyser", BEATS.ride2 - 8, 0.5),
  sfx("lava_splash", BEATS.ride1 + 26, 0.3),
  sfx("lava_splash", BEATS.ride2 + 26, 0.3),

  // Level 4 - current and lava waterfall
  sfx("grind", BEATS.current - 6, 0.35),
  loopCue(sfx("lava_flow", BEATS.current, 0.35), BEATS.freeze + 12),
  sfx("whoosh", BEATS.overFalls, 0.4),
  sfx("helmet", BEATS.waterfall + 6, 0.25),

  // Counter: the second mage freezes the lake.
  sfx("freeze", BEATS.freeze, 0.55),
  sfx("ice", BEATS.frozen, 0.35),
  sfx("thud", MAGE2_HOP[1], 0.2),

  // Level 5 - cracks, vents, wave
  sfx("crack", BEATS.cracks, 0.5),
  sfx("gate", BEATS.ventsOpen, 0.45),
  sfx("wave", BEATS.wave - 8, 0.65),
  sfx("lava_splash", BEATS.mageEngulfed, 0.5),
  loopCue(sfx("lava_bubble", BEATS.flooded, 0.2), BEATS.stamp + 30),

  // Cameo
  sfx("lute_sad", BEATS.sadNote - 10, 0.6),

  // Finale
  sfx("stamp", BEATS.stamp, 0.6),
  sfx("boom", BEATS.stamp, 0.35),
  sfx("crack", BEATS.crackStamp, 0.45),
  sfx("crumble", BEATS.dare, 0.4),
  sfx("stamp", BEATS.dare + 4, 0.55),
];

/**
 * Camera. Portrait 9:16 at fov 40: at distance d the frame is ~0.41·d wide and
 * ~0.73·d tall. Waypoints for establishing/reaction shots, tracks for anything
 * fast. Waypoint frames come from BEATS, so they stay in order.
 */
const wp = (frame: number, pose: ReturnType<typeof shot>) => ({ frame: Math.round(frame), ...pose });

export const config: EpisodeConfig = {
  id: "LavaBridge",
  title: "Evolution of a Lava Bridge",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [BARB_LAND_X + 1.2, 3.6, Z + 12],
    waypoints: [
      // Title over door I of floor two's hub, then up at the ceiling for the punch.
      wp(0, shot(BARB_LAND_X - 0.6, 2.2, 11.5)),
      wp(BEATS.punch - 30, shot(BARB_LAND_X - 0.6, 2.8, 10.5, { rise: 0.4 })),
      wp(BEATS.land + 4, shot(BARB_LAND_X - 0.4, 1.6, 8.6)),
      wp(BEATS.land + 18, shot(BARB_LAND_X - 0.6, 1.4, 7.8)),
      // "Welcome to floor two": swing round to look down the row of five doors
      // as he takes door I (the angle fits all five into the portrait frame).
      wp(BEATS.hubWide, orbitShot(DOOR_I_X + 0.5, 1.6, 12.5, -1.12, { rise: 1.2 })),
      wp(HUB_CUT - 1, orbitShot(DOOR_I_X + 0.8, 1.6, 13.5, -1.1, { rise: 1.3 })),
      // Install: the whole pit as the lava rises and the bridge comes up.
      wp(BEATS.lavaRise - 6, shot(LAKE_MID, 0.5, 17, { rise: 4.1 })),
      wp(BEATS.bridgeRise + 30, shot(LAKE_MID, 0.5, 16, { rise: 3.6 })),
      // Barbarian plods onto the bridge (follow track below).
      wp(BEATS.stomp, shot(SEG_XS[BARB_SEG] - 0.6, 0.5, 9)),
      // Bones bob up.
      wp(BARB_SPLASH + 22, shot(SEG_XS[BARB_SEG], -0.1, 7.4)),
      wp(BEATS.barbBones + 20, shot(SEG_XS[BARB_SEG] - 0.4, -0.1, 8)),
      // Rogue lands, bows, dives into the gold.
      wp(ROGUE_FLIP[1] + 2, shot(VAULT_LEDGE + 1.3, 1.1, 8.6)),
      wp(BEATS.coins + 18, shot(GOLD_PILE_X + 0.2, 1.2, 8)),
      // Level 2 install: bridge rises again, runes on both ends.
      wp(BEATS.bridgeRise2 - 6, shot(LAKE_MID, 0.5, 16.5, { rise: 3.6 })),
      wp(ROGUE2_ON_CAMERA - 2, shot(LAKE_MID - 0.5, 0.6, 16, { rise: 3.6 })),
      // Stranded, sinking.
      wp(BEATS.stranded + 14, shot(SEG_XS[ROGUE2_SEG], 0.2, 8.4)),
      wp(BEATS.rogue2Under + 24, shot(SEG_XS[ROGUE2_SEG], -0.1, 7.8)),
      // Level 3 install: three vents push up around the floating mage.
      wp(BEATS.geyserInstall - 4, shot(-0.9, 1.2, 15, { rise: 2.1 })),
      wp(BEATS.geyserDemo + 26, shot(-0.4, 1.3, 14, { rise: 2.1 })),
      // Bones again after the splash.
      wp(BEATS.mageSplash + 6, shot(mage1X(BEATS.mageSplash), 0.1, 9)),
      // Level 4: current, skeletons drifting to the lip.
      wp(BEATS.current - 10, shot(0.8, 0.0, 13)),
      wp(BEATS.overFalls - 16, shot(FALLS_X - 0.6, -0.3, 10.5)),
      wp(BEATS.waterfall + 20, shot(FALLS_X + 0.2, -1.2, 10)),
      // Level 4 counter: the freeze sweeps the lake.
      wp(MAGE2_ENTER[1] + 2, shot(LAKE_L - 1.6, 0.9, 12)),
      wp(BEATS.freeze + 6, shot(-3.3, 0.6, 15, { rise: 3.2 })),
      wp(BEATS.frozen + 10, shot(-2.6, 0.6, 14, { rise: 3 })),
      // Level 5: cracks under his feet, vents, the wave.
      wp(MAGE2_WALK[1] - 2, shot(MAGE2_STOP_X - 1.4, 0.3, 11)),
      wp(BEATS.cracks + 16, shot(MAGE2_STOP_X - 1.4, 0.2, 10.2)),
      wp(BEATS.ventsOpen - 10, shot(-3.0, 1.6, 16.5, { rise: 2.1 })),
      wp(BEATS.wave - 6, shot(-2.4, 1.5, 16.5, { rise: 2.1 })),
      wp(BEATS.flooded, shot(0, 1.5, 20, { rise: 3.1 })),
      // Cameo in the doorway.
      wp(BEATS.bardPeek - 24, shot(BARD_X - 0.4, 1.3, 7.4)),
      wp(BEATS.bardBack + 16, shot(BARD_X - 0.6, 1.2, 6.8)),
      // Finale: wide on the flooded hall and the untouched treasure.
      wp(BEATS.stamp - 34, shot(1.5, 1.8, 21, { rise: 3.1 })),
      wp(DURATION, shot(1.5, 2.0, 24, { rise: 3.1 })),
    ],
    tracks: chainTracks([
      // The barbarian comes out of the entry door and plods to the bridge.
      followTrack({
        start: BARB_ON_CAMERA,
        end: BEATS.stomp - 4,
        target: (f) => [barbX(f), 0, Z],
        dist: 10,
        lead: 0.8,
        clampX: [ENTRY_X + 2.4, Infinity],
        blend: 1,
      }),
      // Hold on the slab giving way and the drop.
      holdTrack(BEATS.barbSlabDrop - 4, BARB_SPLASH + 18, shot(SEG_XS[BARB_SEG] + 0.2, 0.0, 8)),
      // Rogue jogs in and sprints the bridge.
      followTrack({
        start: ROGUE_ON_CAMERA,
        end: ROGUE_FLIP[1],
        target: (f) => [rogueX(f), 0, Z],
        dist: 10,
        lead: 0.8,
        clampX: [ENTRY_X + 2.4, VAULT_X - 1.4],
        blend: 1,
      }),
    ]).concat(
      chainTracks([
        followTrack({
          start: ROGUE2_ON_CAMERA,
          end: ROGUE2_ENTER[1],
          target: (f) => [rogue2X(f), 0, Z],
          dist: 10,
          lead: 0.6,
          clampX: [ENTRY_X + 2.4, Infinity],
          blend: 1,
        }),
        // Both ends fall away toward him.
        holdTrack(ROGUE2_ENTER[1], BEATS.stranded + 12, shot(SEG_XS[ROGUE2_SEG], 0.4, 14), 1),
      ]),
      [
        // Mage walks in and floats out.
        followTrack({
          start: MAGE1_ON_CAMERA,
          end: BEATS.geyserInstall - 6,
          target: (f) => [mage1X(f), mage1Y(f) * 0.6, Z],
          dist: 10,
          lead: 0.6,
          clampX: [ENTRY_X + 2.4, Infinity],
          blend: 1,
        }),
        // The launch: the column fires and he leaves the top of the frame.
        holdTrack(BEATS.launch - 10, BEATS.mageSplash + 4, shot(GEYSER_XS[2], 1.6 + MAGE_FLOAT_Y * 0.3, 11.5)),
        // Paladin walks in, hops on, surfs and rides both geysers.
        followTrack({
          start: PAL_ON_CAMERA,
          end: BEATS.current - 12,
          target: (f) => [palX(f), Math.max(0, palY(f)), Z],
          dist: 10,
          lead: 0.6,
          clampX: [ENTRY_X + 2.4, Infinity],
          blend: 1,
        }),
        // Mage 2 walks in; then follows his stroll.
        followTrack({
          start: MAGE2_ON_CAMERA,
          end: MAGE2_ENTER[1] + 2,
          target: (f) => [mage2X(f), 0, Z],
          dist: 10,
          lead: 0.6,
          clampX: [ENTRY_X + 2.4, Infinity],
          blend: 1,
        }),
        followTrack({
          start: BEATS.stroll - 4,
          end: MAGE2_WALK[1] - 4,
          target: (f) => [mage2X(f) - 1.4, 0, Z],
          dist: 11,
          lead: 0.6,
          blend: 8,
        }),
      ]
    ),
    shake: [
      { at: BEATS.punch, strength: 0.18, spread: 6 },
      { at: BEATS.land, strength: 0.3, spread: 7 },
      { at: BEATS.stomp, strength: 0.12, spread: 5 },
      { at: BEATS.barbSlabDrop, strength: 0.12, spread: 5 },
      { at: BARB_SPLASH, strength: 0.16, spread: 6 },
      { at: BEATS.lastGapFalls, strength: 0.1, spread: 5 },
      { at: BEATS.collapse, strength: 0.16, spread: 6 },
      { at: BEATS.launch, strength: 0.24, spread: 7 },
      { at: BEATS.ride1, strength: 0.14, spread: 6 },
      { at: BEATS.ride2, strength: 0.14, spread: 6 },
      { at: BEATS.cracks, strength: 0.12, spread: 6 },
      { at: BEATS.mageEngulfed, strength: 0.3, spread: 8 },
      { at: BEATS.stamp, strength: 0.22, spread: 8 },
      { at: BEATS.dare, strength: 0.16, spread: 6 },
    ],
    rumbles: [
      { start: BEATS.lavaRise, end: BEATS.lavaRise + 40, strength: 0.03 },
      { start: BEATS.bridgeRise, end: BEATS.bridgeRise + 36, strength: 0.025 },
      { start: BEATS.collapse, end: BEATS.collapse + 36, strength: 0.03 },
      { start: BEATS.current, end: BEATS.overFalls, strength: 0.02 },
      { start: BEATS.ventsOpen, end: BEATS.flooded, strength: 0.05 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/lava-bridge/narration_v6.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/lava-bridge/score_v6.mp3",
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
      "linear-gradient(135deg, rgba(255,120,40,0.12) 0%, rgba(255,120,40,0) 38%, rgba(18,31,60,0.18) 100%), radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.24) 100%), linear-gradient(180deg, rgba(4,7,12,0.16) 0%, rgba(4,7,12,0) 20%, rgba(4,7,12,0) 72%, rgba(4,7,12,0.34) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 24,
    backgroundColor: "#20232d",
  },
  OverlayComponent: TrapHUD,
};
