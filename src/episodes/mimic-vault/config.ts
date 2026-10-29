import type { EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import { ENVIRONMENT_PRESETS } from "../../engine/presets";
import { chainTracks, followTrack, holdTrack, shot, sfxFor } from "../../kit";
import wordTimestamps from "./data/wordTimestamps.json";
import { TrapHUD } from "./TrapHUD";
import {
  BARB_ON_CAMERA,
  BARB_RUN,
  BARB_SPOT,
  BEATS,
  DOOR_II_X,
  DURATION,
  ENTRY_X,
  GRAB_X,
  HUB_BARB_X,
  HUB_CUT,
  HUB_WALK,
  L1_BITES,
  OLD_CHEST_X,
  ROGUE_ENTER,
  ROGUE_IN,
  ROGUE_ON_CAMERA,
  ROGUE_OUT,
  SEAL_X,
  SNAP,
  STAGE_STARTS,
  VAULT_MID,
  WAIT_X,
  Z,
  barbX,
  rogueX,
} from "./timeline";

const sfx = sfxFor("mimic-vault");

/** Every cue is keyed to a BEATS value or a kinematics constant, never a literal frame. */
const SFX: SfxCue[] = [
  // Title + stage badges
  sfx("stamp", 6, 0.4),
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.2)),

  // Cold open: hot seal, door II creaks open, footsteps.
  sfx("sizzle", BEATS.sealed + 4, 0.35),
  sfx("growl", BEATS.sealed + 14, 0.2),
  sfx("trap_open", BEATS.doorOpen, 0.32),
  ...[0, 1].map((k) => sfx("thud", HUB_WALK[0] + 6 + k * 14, 0.18)),

  // Level 1 - the vault wakes and bites.
  sfx("sparkle", BEATS.mimic, 0.18),
  sfx("growl", BEATS.eyesOpen, 0.45),
  sfx("sparkle", BEATS.teethOut, 0.3),
  sfx("creak", BEATS.eyesOpen + 4, 0.35),
  ...[0, 1, 2, 3].map((k) => sfx("thud", BARB_RUN[0] + 14 + k * 12, 0.2)),
  sfx("vault_slam", BEATS.chomp, 0.6),
  sfx("chew", BEATS.chomp + 6, 0.45),
  sfx("burp", BEATS.reveal, 0.45),

  // Counter: the rogue times the bites.
  ...L1_BITES.map((at, i) => sfx("vault_slam", at, i === 3 ? 0.55 : 0.32)),
  sfx("whoosh", ROGUE_IN[0], 0.3),
  sfx("coins", BEATS.grabs, 0.5),
  sfx("whoosh", ROGUE_OUT[0], 0.3),
  sfx("sparkle", BEATS.bow + 6, 0.25),

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
  id: "MimicVault",
  title: "Evolution of a Mimic Vault",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: {
    fov: 40,
    near: 0.2,
    far: 350,
    initialPosition: [(SEAL_X + DOOR_II_X) / 2, 3.4, Z + 11],
    waypoints: [
      // Hub: sealed door I and door II, the barbarian between them.
      wp(0, shot((SEAL_X + DOOR_II_X) / 2, 2.0, 10.5)),
      wp(BEATS.sealed - 6, shot(HUB_BARB_X - 0.5, 1.7, 8.4)),
      wp(BEATS.picks, shot(HUB_BARB_X + 0.4, 1.8, 8.8)),
      wp(HUB_CUT - 1, shot(DOOR_II_X, 1.8, 9.4)),
      // The vault, disguised: just gold behind a big arch. Push in on the burst chest.
      wp(HUB_CUT, shot(VAULT_MID - 0.6, 2.4, 17, { rise: 1.6 })),
      wp(BEATS.oldChest - 20, shot(OLD_CHEST_X + 0.6, 0.8, 9, { rise: 0.9 })),
      wp(BEATS.oldChest + 14, shot(OLD_CHEST_X + 0.4, 0.6, 7.2, { rise: 0.8 })),
      // "It is the whole vault": pull back as it wakes and yawns.
      wp(BEATS.eyesOpen - 8, shot(VAULT_MID - 0.4, 2.6, 17, { rise: 1.4 })),
      wp(BARB_RUN[0], shot(VAULT_MID - 0.6, 2.5, 16, { rise: 1.4 })),
      // Bones on the tongue, then the rogue at the lip.
      wp(BEATS.reveal + 6, shot(BARB_SPOT + 0.6, 1.2, 9)),
      wp(ROGUE_ENTER[0], shot(BARB_SPOT + 0.4, 1.2, 8.4)),
      // Wide enough for the lip, the grab and the snap behind his heels.
      wp(ROGUE_ENTER[1] + 2, shot((WAIT_X + GRAB_X) / 2, 2.0, 12.5)),
      wp(SNAP + 4, shot((WAIT_X + GRAB_X) / 2 - 0.2, 2.0, 12)),
      // The bow, close, jaw chomping angrily behind him.
      wp(BEATS.bow, shot(WAIT_X + 0.9, 1.6, 8.4)),
      wp(BEATS.l2 - 4, shot(WAIT_X + 0.9, 1.5, 8)),
      // Finale placeholder: wide on the vault.
      wp(BEATS.stamp - 34, shot(VAULT_MID - 0.6, 2.6, 18, { rise: 1.6 })),
      wp(DURATION, shot(VAULT_MID - 0.6, 2.8, 20, { rise: 1.6 })),
    ],
    tracks: chainTracks([
      // Barbarian charges in from the entry door.
      followTrack({
        start: BARB_ON_CAMERA,
        end: BARB_RUN[1] - 12,
        target: (f) => [barbX(f), 0.4, Z],
        dist: 10,
        lead: 1.0,
        clampX: [ENTRY_X + 2.4, BARB_SPOT - 1],
        blend: 1,
      }),
      // Tight on him and the teeth coming down; hold through the chew.
      holdTrack(BARB_RUN[1] - 12, BEATS.reveal - 2, shot(BARB_SPOT + 0.8, 2.1, 11.5)),
    ]).concat([
      // Rogue jogs in; cut once he is clear of the door.
      followTrack({
        start: ROGUE_ON_CAMERA,
        end: ROGUE_ENTER[1] + 2,
        target: (f) => [rogueX(f), 0, Z],
        dist: 9.5,
        lead: 0.6,
        clampX: [ENTRY_X + 2.4, Infinity],
        blend: 1,
      }),
    ]),
    shake: [
      { at: BEATS.eyesOpen, strength: 0.08, spread: 6 },
      { at: BEATS.chomp, strength: 0.3, spread: 7 },
      { at: SNAP, strength: 0.18, spread: 6 },
      { at: BEATS.stamp, strength: 0.22, spread: 8 },
      { at: BEATS.dare, strength: 0.16, spread: 6 },
    ],
    rumbles: [{ start: BEATS.eyesOpen, end: BEATS.teethOut + 16, strength: 0.03 }],
  },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  audio: {
    src: "episodes/mimic-vault/narration_v1.mp3",
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 10,
  },
  music: {
    src: "episodes/mimic-vault/score_v1.mp3",
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
      "linear-gradient(135deg, rgba(255,90,150,0.10) 0%, rgba(255,90,150,0) 38%, rgba(18,31,60,0.18) 100%), radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.24) 100%), linear-gradient(180deg, rgba(4,7,12,0.16) 0%, rgba(4,7,12,0) 20%, rgba(4,7,12,0) 72%, rgba(4,7,12,0.34) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 24,
    backgroundColor: "#20232d",
  },
  OverlayComponent: TrapHUD,
};
