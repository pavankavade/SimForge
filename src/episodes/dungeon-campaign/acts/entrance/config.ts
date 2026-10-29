import type { CameraConfig, SfxCue } from "../../../../engine/types";
import { chainTracks, followTrack, holdTrack, loopCue, shot, sfxFor } from "../../../../kit";
import { segmentConfig } from "../../shared";
import {
  BEATS,
  CHUTE_X,
  DURATION,
  EDGE_X,
  ENTRY_X,
  FLIGHT_END,
  FLIGHT_START,
  GOBLIN_WALK,
  LIE_X,
  MAGE_WALK,
  PALADIN_X,
  PARTY,
  PLATE_X,
  ROGUE_RUN,
  STAGE_STARTS,
  Z,
  flightCamera,
  landFrame,
  lerp,
  progress,
} from "./timeline";

const sfx = sfxFor("dungeon-trap");

/** Every cue is keyed to a BEATS value or a kinematics constant, never a literal frame. */
const SFX: SfxCue[] = [
  // Level tags (the HUD itself is drawn once by the campaign)
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.11)),

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

  // Level 5 - catapult floor, down the chute
  sfx("rumble", BEATS.chamberReveal, 0.4),
  sfx("ratchet", BEATS.catapultBuild[0], 0.35, { durationInFrames: BEATS.catapultBuild[1] - BEATS.catapultBuild[0], fadeOutFrames: 6 }),
  sfx("clank", BEATS.chuteInstall + 8, 0.35),
  sfx("trap_open", BEATS.chuteOpen, 0.4),
  sfx("launch", BEATS.launch, 0.6),
  sfx("whoosh_big", FLIGHT_START + 4, 0.45),
  ...PARTY.map((m) => sfx("thud", landFrame(m), 0.3)),
];

const wp = (frame: number, pose: ReturnType<typeof shot>) => ({ frame: Math.round(frame), ...pose });

const camera: CameraConfig = {
  initialPosition: shot(0, 0.4, 15).position,
  waypoints: [
    // Establishing: the hall and the pit cutaway below the floor.
    wp(0, shot(0, 0.6, 15.5)),
    wp(BEATS.spikeSpawn - 6, shot(0, 0.0, 12.5)),
    wp(BEATS.spikeSpawn + 30, shot(0, -0.6, 11.5)),
    // Goblin walks in and drops.
    wp(GOBLIN_WALK[1] - 40, shot(-3.2, 0.4, 10.5)),
    wp(BEATS.goblinFall, shot(-2.2, -0.2, 10)),
    wp(BEATS.goblinLand + 6, shot(-1.4, -1.4, 9)),
    wp(ROGUE_RUN[0] + 4, shot(-1.6, -1.2, 9.2)),
    // Rogue spots the gap and leaps it.
    wp(BEATS.rogueSpots, shot(-2.4, 0.2, 9.4)),
    wp(BEATS.rogueLeap[0] - 2, shot(0, 0.9, 11)),
    wp(BEATS.rogueLeap[1] + 8, shot(1.4, 0.9, 9.6)),
    wp(BEATS.trapdoorSpawn - 4, shot(1.6, 0.9, 8.8)),
    // False floor, the bait chest, the jump and the plate.
    wp(BEATS.trapdoorSpawn + 4, shot(0, 0.3, 10.5)),
    wp(BEATS.chestSpawn - 4, shot(0.8, 1.4, 10.5)),
    wp(BEATS.rogueJump[0], shot(1.8, 1.2, 9.6)),
    wp(BEATS.plateClick - 4, shot(PLATE_X + 0.4, 0.6, 8.4)),
    wp(BEATS.rogueFall[0] + 6, shot(0.8, -0.8, 10)),
    wp(BEATS.rogueFall[1] + 14, shot(0.6, -1.3, 9.4)),
    // Mage walks in, freezes the trapdoor.
    wp(MAGE_WALK[1] - 24, shot(EDGE_X - 1.2, 0.8, 9.6)),
    wp(BEATS.iceCast + 4, shot(EDGE_X + 1.4, 0.6, 9.4)),
    // Pipes along the walls, oil tank, the ice becomes a frying pan.
    wp(BEATS.flamerSpawn - 4, shot(0, 1.0, 13)),
    wp(BEATS.mageCross[1] - 10, shot(LIE_X.mage, 0.4, 10)),
    wp(BEATS.fireStart + 6, shot(LIE_X.mage, 0.5, 9)),
    wp(BEATS.mageFall[0] + 6, shot(LIE_X.mage, -0.9, 9.6)),
    wp(BEATS.mageFall[1] + 14, shot(0, -1.0, 10)),
    // Paladin shields through the flames (tracked), stops on the safe spot.
    wp(BEATS.paladinWalk[1] + 4, shot(PALADIN_X - 0.4, 1.0, 9)),
    // Pendulum: mount, ratchet back, release, the hit.
    wp(BEATS.pendulumSpawn - 6, shot(-1.8, 2.2, 11.5)),
    wp(BEATS.cockStart + 4, shot(-1.8, 1.8, 11)),
    wp(BEATS.release - 2, shot(-1.4, 1.3, 10)),
    wp(BEATS.bladeHit + 4, shot(-1.0, 0.2, 10.4)),
    wp(BEATS.paladinLand + 4, shot(-0.6, -1.2, 9.6)),
    wp(BEATS.paladinLand + 24, shot(-0.2, -1.4, 10.4)),
    // Last party: in, refuse, the chamber opens below them, huddle.
    wp(BEATS.partyEnter[1] - 6, shot(-7.0, 1.0, 10.5)),
    wp(BEATS.chamberReveal - 4, shot(-6.6, 0.6, 11)),
    wp(BEATS.chamberReveal + 16, shot(-6.2, -1.0, 12.5)),
    wp(BEATS.catapultBuild[1], shot(-6.6, -0.6, 12)),
    wp(BEATS.huddle[0], shot(-7.6, 0.9, 9)),
    wp(BEATS.launch - 2, shot(-7.4, 0.8, 9.4)),
    // (flight tracked) then the hatch, and the pull-back for the bridge.
    wp(FLIGHT_END + 4, shot(CHUTE_X - 0.6, 0.8, 9)),
    wp(DURATION, shot(0, 1.0, 22)),
  ],
  tracks: chainTracks([
    // Paladin walks in through the fire.
    followTrack({
      start: BEATS.paladinWalk[0] + 6,
      end: BEATS.paladinWalk[1],
      target: (f) => [lerp(ENTRY_X, PALADIN_X, progress(f, BEATS.paladinWalk)), 0, Z],
      dist: 9.6,
      lead: 0.6,
      clampX: [-6.8, PALADIN_X],
      z: Z,
      blend: 8,
    }),
    // The party enters from the left on camera.
    followTrack({
      start: BEATS.partyEnter[0] + 10,
      end: BEATS.partyEnter[1] - 6,
      target: (f) => [lerp(ENTRY_X, PARTY[0].lineX, progress(f, BEATS.partyEnter)) - 0.8, 0, Z],
      dist: 10.5,
      clampX: [-7.2, -6],
      z: Z,
      blend: 8,
    }),
    { start: FLIGHT_START, end: FLIGHT_END, blend: 6, fn: flightCamera },
    holdTrack(FLIGHT_END, FLIGHT_END + 4, shot(CHUTE_X - 0.6, 0.8, 9), 4),
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
    { at: BEATS.launch, strength: 0.3, spread: 8 },
  ],
  rumbles: [
    { start: BEATS.fireStart, end: BEATS.fireEnd, strength: 0.02 },
    { start: BEATS.chamberReveal, end: BEATS.catapultBuild[1], strength: 0.03 },
  ],
};

export const config = segmentConfig("entrance", "Act I: The Entrance", camera, SFX);
