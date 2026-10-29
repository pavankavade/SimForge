import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { chainTracks, followTrack, holdTrack, loopCue, shot, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BEATS,
  CHOMP,
  DURATION,
  EDGE_X,
  ENTRY_X,
  FLIGHT_END,
  FLIGHT_START,
  GOBLIN_WALK,
  JOG,
  LIE_X,
  MAGE_WALK,
  MIMIC_X,
  PALADIN_X,
  PARTY,
  PIT,
  PLATE_X,
  RIGHT_LEDGE_X,
  ROGUE_RUN,
  SPIKE_TOPS_Y,
  STAGE_STARTS,
  WALK,
  Z,
  flightCamera,
  landFrame,
  lerp,
  progress,
} from "./timeline";

const sfx = sfxFor("dungeon-trap-v2");

/** Every cue is keyed to a BEATS value or a kinematics constant, never a literal frame. */
const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),

  // Level 1 - spike pit
  sfx("spike", BEATS.spikeSpawn + 6, 0.45),
  sfx("whoosh", BEATS.goblinFall + 2, 0.3),
  sfx("spike", BEATS.goblinLand, 0.5),
  sfx("thud", BEATS.goblinLand, 0.4),
  sfx("whoosh", BEATS.rogueLeap[0], 0.35),
  sfx("thud", BEATS.rogueLeap[1], 0.3),

  // Level 2 - false floor, bait, plate
  sfx("clank", BEATS.trapdoorSpawn + 10, 0.4),
  sfx("click", BEATS.plateSpawn, 0.3),
  sfx("chain", BEATS.chestSpawn, 0.35),
  sfx("sparkle", BEATS.chestSpawn + 14, 0.25),
  sfx("whoosh", BEATS.rogueJump[0], 0.3),
  sfx("thud", BEATS.rogueJump[1], 0.3),
  sfx("click", BEATS.plateClick, 0.55),
  sfx("trap_open", BEATS.trapdoorOpen, 0.5),
  sfx("spike", BEATS.rogueFall[1], 0.5),
  sfx("trap_close", BEATS.trapdoorClose, 0.4),

  // Level 2 counter - ice
  sfx("ice", BEATS.iceCast, 0.5),
  sfx("sparkle", BEATS.iceCast + 4, 0.3),

  // Level 3 - flamers
  sfx("clank", BEATS.flamerSpawn + 8, 0.35),
  sfx("ignite", BEATS.fireStart, 0.55),
  loopCue(sfx("fire_loop", BEATS.fireStart + 4, 0.35), BEATS.fireEnd),
  sfx("sizzle", BEATS.fireStart + 10, 0.35),
  sfx("trap_open", BEATS.trapdoorOpen3, 0.45),
  sfx("spike", BEATS.mageFall[1], 0.5),
  sfx("trap_close", BEATS.trapdoorClose3, 0.4),

  // Level 3 counter + Level 4 - pendulum
  sfx("helmet", BEATS.paladinWalk[1] - 30, 0.25),
  sfx("chain", BEATS.pendulumSpawn, 0.4),
  sfx("ratchet", BEATS.cockStart, 0.4, { durationInFrames: BEATS.release - BEATS.cockStart, fadeOutFrames: 4 }),
  sfx("twang", BEATS.release, 0.45),
  sfx("whoosh_big", BEATS.release + 4, 0.4),
  sfx("clang", BEATS.bladeHit, 0.6),
  sfx("trap_open", BEATS.trapdoorOpen4 + 2, 0.4),
  sfx("spike", BEATS.paladinLand, 0.5),
  sfx("helmet", BEATS.paladinLand + 3, 0.35),
  sfx("trap_close", BEATS.trapdoorClose4, 0.4),

  // Level 5 - catapult floor, into the Mimic
  sfx("rumble", BEATS.chamberReveal, 0.4),
  sfx("ratchet", BEATS.catapultBuild[0], 0.35, { durationInFrames: BEATS.catapultBuild[1] - BEATS.catapultBuild[0], fadeOutFrames: 6 }),
  sfx("growl", BEATS.mimicOpen, 0.3),
  sfx("launch", BEATS.launch, 0.6),
  sfx("whoosh_big", FLIGHT_START + 4, 0.45),
  ...PARTY.map((m) => sfx("thud", landFrame(m), 0.3)),
  sfx("chomp", CHOMP, 0.6),
  sfx("chew", CHOMP + 8, 0.4),
  sfx("burp", BEATS.burp, 0.5),

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
/** Floor (y = 0) about 30% up the frame (the camera looks slightly down), clear of the subtitles. */
const floorShot = (x: number, d: number) => shot(x, 0.25 * d, d);
/** Spike bed about 30% up the frame: the pit cutaway and its bodies. */
const pitShot = (x: number, d: number) => shot(x, SPIKE_TOPS_Y + 0.18 * d, d);

/** First frame each newcomer is clear of the crypt door (cut to them then). */
const onCamera = (start: number, speed: number) => Math.round(start + 1.6 / speed);
const ROGUE_ON_CAMERA = onCamera(ROGUE_RUN[0], JOG);
const MAGE_ON_CAMERA = onCamera(MAGE_WALK[0], WALK);
const DOOR_CLAMP = ENTRY_X + 2.2;
/** The mage waits off camera until the rogue's body has been readable for ~18 frames. */
const MAGE_TRACK = Math.max(MAGE_ON_CAMERA, BEATS.rogueFall[1] + 18);
/** Finale: centred between the pit and the Mimic. */
const FINALE_X = (PIT[0] + MIMIC_X + 1) / 2;

export const config: EpisodeConfig = {
  id: "DungeonTrapV2",
  title: "Evolution of a Dungeon Trap",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: floorShot(-1, 13).position,
    waypoints: [
      // Title card over the hall, then down into the pit as the spikes rise.
      wp(0, floorShot(-1, 13)),
      wp(BEATS.spikeSpawn - 6, pitShot(0, 12.5)),
      wp(BEATS.spikeSpawn + 30, pitShot(0, 11.5)),
      // Goblin walks in and drops.
      wp(GOBLIN_WALK[1] - 40, floorShot(-3.4, 8.5)),
      wp(BEATS.goblinFall, floorShot(-2.2, 9.5)),
      wp(BEATS.goblinLand + 6, pitShot(-1.4, 9)),
      wp(ROGUE_ON_CAMERA - 2, pitShot(-1.4, 9.4)),
      // (rogue run tracked) She spots the gap and leaps it.
      wp(BEATS.rogueSpots + 4, floorShot(EDGE_X + 0.6, 9)),
      wp(BEATS.rogueLeap[0] - 4, floorShot(EDGE_X + 1.0, 9)),
      wp(BEATS.rogueLeap[1] + 8, floorShot(2.4, 9)),
      wp(BEATS.trapdoorSpawn - 4, floorShot(2.6, 8)),
      // False floor, the bait chest, the jump and the plate.
      wp(BEATS.trapdoorSpawn + 4, floorShot(1.2, 12)),
      wp(BEATS.chestSpawn - 4, floorShot(1.4, 10)),
      wp(BEATS.rogueJump[0], floorShot(1.9, 9)),
      wp(BEATS.plateClick - 4, floorShot(PLATE_X + 0.4, 8)),
      wp(BEATS.rogueFall[0] + 6, shot(0.9, -0.8, 10.5)),
      wp(BEATS.rogueFall[1] + 14, pitShot(-0.1, 10.5)),
      wp(MAGE_TRACK - 2, pitShot(-0.1, 10.5)),
      // (mage walk tracked) Freezes the trapdoor.
      wp(MAGE_WALK[1] + 2, floorShot(EDGE_X + 0.8, 9)),
      wp(BEATS.iceCast + 4, floorShot(EDGE_X + 1.6, 9.5)),
      // Pipes along the walls, oil tank, the ice becomes a frying pan.
      wp(BEATS.flamerSpawn - 4, floorShot(0, 13)),
      wp(BEATS.mageCross[1] - 10, floorShot(LIE_X.mage, 9)),
      wp(BEATS.fireStart + 6, floorShot(LIE_X.mage, 8)),
      wp(BEATS.mageFall[0] + 6, shot(LIE_X.mage, -0.8, 10.5)),
      wp(BEATS.mageFall[1] + 14, pitShot(-0.1, 10.5)),
      // (paladin walk tracked) He stops on the safe spot behind the shield.
      wp(BEATS.paladinWalk[1] + 4, floorShot(PALADIN_X - 0.4, 8.5)),
      // Pendulum: mount, ratchet back, release, the hit.
      wp(BEATS.pendulumSpawn - 6, shot(-1.6, 3.4, 11)),
      wp(BEATS.cockStart + 4, shot(-1.6, 3.0, 11.5)),
      wp(BEATS.release - 2, floorShot(-1.3, 11)),
      wp(BEATS.bladeHit + 4, floorShot(-1.0, 10)),
      wp(BEATS.paladinLand + 4, pitShot(-0.4, 10.5)),
      wp(BEATS.paladinLand + 24, pitShot(-0.2, 11)),
      // Last party: in, refuse, the chamber opens below them, huddle.
      wp(BEATS.partyEnter[1] - 6, floorShot(-7.6, 9)),
      wp(BEATS.chamberReveal - 4, floorShot(-7.4, 9.5)),
      wp(BEATS.chamberReveal + 16, shot(-6.1, -0.6, 15)),
      wp(BEATS.catapultBuild[1], shot(-6.4, -0.4, 14.5)),
      wp(BEATS.huddle[0], floorShot(-7.8, 8)),
      wp(BEATS.launch - 2, floorShot(-7.4, 9)),
      // (flight tracked) into the Mimic, chomp, burp.
      wp(CHOMP + 2, floorShot(MIMIC_X - 0.4, 9)),
      wp(BEATS.burp + 10, floorShot(MIMIC_X - 0.4, 8.5)),
      // Finale: pull back to hold the pit and the Mimic for the stamp.
      wp(BEATS.stamp - 10, shot(FINALE_X, 1.6, 26)),
      wp(DURATION, shot(FINALE_X, 1.8, 28)),
    ],
    tracks: chainTracks([
      // Rogue runs in from the crypt door.
      followTrack({
        start: ROGUE_ON_CAMERA,
        end: ROGUE_RUN[1],
        target: (f) => [lerp(ENTRY_X, EDGE_X, progress(f, ROGUE_RUN)), 0, Z],
        dist: 9,
        lead: 0.5,
        clampX: [DOOR_CLAMP, EDGE_X],
        blend: 1,
      }),
      // Rogue leaps the pit (kept centred over the gap).
      followTrack({
        start: BEATS.rogueLeap[0] - 4,
        end: BEATS.rogueLeap[1] + 4,
        target: (f) => [lerp(EDGE_X, RIGHT_LEDGE_X, progress(f, BEATS.rogueLeap)), 0, Z],
        dist: 10,
        clampX: [EDGE_X + 1.0, RIGHT_LEDGE_X - 0.6],
        blend: 4,
      }),
      // Mage walks in.
      followTrack({
        start: MAGE_TRACK,
        end: MAGE_WALK[1],
        target: (f) => [lerp(ENTRY_X, EDGE_X, progress(f, MAGE_WALK)), 0, Z],
        dist: 9,
        lead: 0.4,
        clampX: [DOOR_CLAMP, EDGE_X],
        blend: 1,
      }),
      // Paladin walks in through the fire.
      followTrack({
        start: BEATS.paladinWalk[0] + 12,
        end: BEATS.paladinWalk[1],
        target: (f) => [lerp(ENTRY_X, PALADIN_X, progress(f, BEATS.paladinWalk)), 0, Z],
        dist: 9,
        lead: 0.5,
        clampX: [DOOR_CLAMP, PALADIN_X],
        blend: 8,
      }),
      // The party enters from the left on camera.
      followTrack({
        start: BEATS.partyEnter[0] + 14,
        end: BEATS.partyEnter[1] - 6,
        target: (f) => [lerp(ENTRY_X, PARTY[0].lineX, progress(f, BEATS.partyEnter)) - 0.8, 0, Z],
        dist: 9,
        clampX: [DOOR_CLAMP, -7.4],
        blend: 8,
      }),
      { start: FLIGHT_START, end: FLIGHT_END, blend: 6, fn: flightCamera },
      holdTrack(FLIGHT_END, CHOMP + 2, floorShot(MIMIC_X - 0.4, 9), 4),
    ]),
    shake: [
      { at: BEATS.spikeSpawn + 6, strength: 0.08, spread: 5 },
      { at: BEATS.goblinLand, strength: 0.16, spread: 6 },
      { at: BEATS.trapdoorSpawn + 12, strength: 0.1, spread: 5 },
      { at: BEATS.trapdoorOpen, strength: 0.12, spread: 5 },
      { at: BEATS.rogueFall[1], strength: 0.16, spread: 6 },
      { at: BEATS.fireStart, strength: 0.14, spread: 6 },
      { at: BEATS.mageFall[1], strength: 0.16, spread: 6 },
      { at: BEATS.bladeHit, strength: 0.3, spread: 8 },
      { at: BEATS.paladinLand, strength: 0.2, spread: 6 },
      { at: BEATS.launch, strength: 0.32, spread: 9 },
      { at: CHOMP, strength: 0.24, spread: 8 },
      { at: BEATS.stamp, strength: 0.22, spread: 8 },
      { at: BEATS.dare, strength: 0.12, spread: 6 },
    ],
    rumbles: [
      { start: BEATS.fireStart, end: BEATS.fireEnd, strength: 0.02 },
      { start: BEATS.chamberReveal, end: BEATS.catapultBuild[1], strength: 0.03 },
    ],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/dungeon-trap-v2/narration_v1.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/dungeon-trap-v2/score_v1.mp3",
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
