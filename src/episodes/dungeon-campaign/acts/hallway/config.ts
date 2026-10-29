import type { CameraConfig, SfxCue, Vec3 } from "../../../../engine/types";
import { sfxFor, walkTrack } from "../../../../kit";
import { segmentConfig } from "../../shared";
import {
  BEATS,
  BOULDERS,
  CHUTE_POS,
  DURATION,
  FLIGHT_END,
  FLIGHT_START,
  PIPE_LIP_FRAME,
  ROGUE_ENTER,
  STAGE_STARTS,
  rogueEntryX,
  boulderById,
  boulderCam,
  enterAfter,
  flightCamera,
  footFrame,
  frameAtX,
  type BoulderSpec,
} from "./timeline";

const sfx = sfxFor("rolling-boulder");

/** Last frame a boulder is audible: shatter/launch, or rolling out the left exit. */
const rollEnd = (b: BoulderSpec) => {
  if (b.mode === "shatter") return b.end ?? b.release + 60;
  if (b.mode === "pipe") return PIPE_LIP_FRAME;
  return Math.round(frameAtX(b, -11.5));
};

/** Ledge drop, gate, ramp rumble and a trimmed rolling loop for every boulder. */
const boulderSfx = (b: BoulderSpec): SfxCue[] => {
  const vol = b.kind === "drum" ? 0.35 : b.kind === "spiked" ? 0.32 : 0.28;
  const foot = Math.round(footFrame(b));
  const end = rollEnd(b);
  return [
    sfx("gate", b.release - 2, 0.35),
    sfx("thud", foot, 0.45),
    sfx("roll", b.release + 2, vol, {
      durationInFrames: Math.max(8, Math.min(118, end - b.release - 2)),
      fadeOutFrames: 8,
    }),
  ];
};

const SFX: SfxCue[] = [
  // Level tags (the HUD itself is drawn once by the campaign)
  ...STAGE_STARTS.map((f) => sfx("pop", f, 0.11)),
  ...BOULDERS.reduce<SfxCue[]>((all, b) => all.concat(boulderSfx(b)), []),

  // Level 1 – tripwire
  sfx("twang", BEATS.wireSet, 0.3),
  sfx("snap", BEATS.goblinTrip, 0.45),
  sfx("thud", BEATS.goblinTrip + 12, 0.35),
  sfx("squash", BEATS.goblinHit, 0.5),
  sfx("snap", BEATS.rogue1Snap, 0.45),
  sfx("whoosh", BEATS.rogue1Leap[0], 0.35),
  sfx("thud", BEATS.rogue1Leap[1], 0.35),

  // Level 2 – drum + slime
  sfx("hydraulic", BEATS.slimePour[0] - 6, 0.35),
  sfx("squelch", BEATS.slimePour[0] + 8, 0.4),
  sfx("snap", BEATS.rogue2Snap, 0.45),
  sfx("slip", BEATS.rogue2Slip, 0.45),
  sfx("squelch", BEATS.rogue2Slip + 18, 0.35),
  sfx("squash", BEATS.rogue2Hit, 0.5),
  sfx("thud", BEATS.paladinStomp, 0.45),
  sfx("clank", BEATS.paladinStomp, 0.35),
  sfx("whoosh", BEATS.paladinBrace, 0.35),
  sfx("crack", BEATS.smash, 0.55),
  sfx("boom", BEATS.smash, 0.35),

  // Level 3 – spiked iron + electromagnet
  sfx("clank", BEATS.magnetInstall, 0.38),
  sfx("hydraulic", BEATS.magnetInstall + 4, 0.3),
  sfx("zap", BEATS.paladin3Brace + 6, 0.25),
  sfx("zap", BEATS.yank, 0.42),
  sfx("whoosh", BEATS.yank + 2, 0.35),
  sfx("clang", BEATS.yank + 10, 0.35),
  sfx("skewer", BEATS.skewer, 0.5),
  sfx("clang", BEATS.skewer, 0.35),
  sfx("levitate", BEATS.levitate, 0.4),
  sfx("sparkle", BEATS.float[0], 0.10),

  // Level 4 – ceiling crushers
  sfx("chain", BEATS.crusherInstall, 0.35),
  sfx("clank", BEATS.crusherInstall + 12, 0.35),
  sfx("gears", BEATS.gearsStart, 0.28, { durationInFrames: BEATS.swat - BEATS.gearsStart, fadeOutFrames: 6 }),
  sfx("ratchet", BEATS.swat - 30, 0.25, { durationInFrames: 30, fadeOutFrames: 4 }),
  sfx("slam", BEATS.swat, 0.55),
  sfx("clang", BEATS.swat + 1, 0.35),
  sfx("thud", BEATS.swat + 9, 0.35),
  sfx("squash", BEATS.hitRogue4, 0.45),
  sfx("squash", BEATS.hitMage4, 0.45),

  // Level 5 – blast door, half-pipe, chute
  sfx("hydraulic", BEATS.doorDrop, 0.35),
  sfx("slam", BEATS.doorSlam, 0.55),
  sfx("boom", BEATS.doorSlam, 0.3),
  sfx("helmet", BEATS.doorSlam + 2, 0.4),
  sfx("ramp", BEATS.curve[0], 0.4),
  sfx("rumble", BEATS.curve[0], 0.35),
  sfx("chain", BEATS.chuteSpawn, 0.35),
  sfx("clank", BEATS.chuteSpawn + 10, 0.4),
  sfx("hydraulic", BEATS.chuteOpen, 0.3),
  sfx("launch", BEATS.launch, 0.5),
  sfx("whoosh_big", BEATS.launch + 6, 0.35),
  sfx("whoosh", FLIGHT_START + 28, 0.35),
  sfx("thud", FLIGHT_END, 0.3),
];

/** Floor-impact shake + rumble while each boulder rolls. */
const boulderShakes = BOULDERS.filter((b) => b.mode !== "shatter").map((b) => ({
  at: Math.round(footFrame(b)),
  strength: b.kind === "drum" ? 0.14 : 0.1,
  spread: 6,
}));
const boulderRumbles = BOULDERS.map((b) => ({
  start: Math.round(footFrame(b)),
  end: rollEnd(b),
  strength: b.kind === "drum" ? 0.03 : 0.02,
}));

const b1 = boulderById("b1");
const d1 = boulderById("d1");
const s1 = boulderById("s1");
const b3 = boulderById("b3");
const b4 = boulderById("b4");

const wp = (frame: number, position: Vec3, lookAt: Vec3) => ({
  frame: Math.round(frame),
  position,
  lookAt,
});

const camera: CameraConfig = {
  initialPosition: [8.6, 3.4, 9.0],
  waypoints: [
    // Level 1: boulder drops onto the ledge, goblin trips the wire.
    wp(0, [9.0, 3.8, 10.4], [9.5, 2.9, -0.6]),
    wp(b1.spawn + 8, [8.8, 3.6, 11.2], [9.3, 2.7, -0.6]),
    wp(BEATS.wireSet + 12, [-1.6, 2.1, 7.8], [-1.4, 0.8, -0.6]),
    wp(BEATS.goblinTrip - 27, [1.6, 2.0, 7.4], [1.8, 0.7, -0.6]),
    wp(BEATS.goblinTrip - 7, [2.0, 2.0, 7.4], [2.2, 0.7, -0.6]),
    wp(BEATS.goblinTrip + 13, [4.0, 2.4, 11.5], [4.4, 1.0, -0.6]),
    // Rogue sprints in (tracked), snaps the wire early, leaps the boulder.
    wp(ROGUE_ENTER[1] + 4, [2.25, 2.2, 8.4], [2.45, 0.9, -0.6]),
    wp(BEATS.rogue1Snap - 5, [1.8, 2.2, 8.6], [2.0, 0.9, -0.6]),
    wp(BEATS.rogue1Leap[0] - 5, [2.4, 2.8, 11.6], [2.4, 1.4, -0.6]),
    wp(Math.round((BEATS.rogue1Leap[0] + BEATS.rogue1Leap[1]) / 2), [1.4, 2.8, 11.2], [1.4, 1.9, -0.6]),
    wp(BEATS.rogue1Leap[1] + 1, [1.6, 2.4, 10.0], [1.7, 1.3, -0.6]),
    wp(BEATS.rogue1Leap[1] + 21, [1.6, 1.9, 6.4], [1.8, 1.0, -0.6]),
    // Level 2: drum drops, slime pours, rogue slips into its path.
    wp(STAGE_STARTS[1] + 1, [9.2, 3.9, 11.8], [9.9, 3.0, -0.6]),
    wp(d1.spawn + 23, [9.0, 3.8, 12.2], [9.7, 2.9, -0.6]),
    wp(BEATS.slimePour[0] - 25, [0.6, 2.8, 9.6], [0.6, 1.4, -0.6]),
    wp(BEATS.slimePour[0] + 30, [0.8, 2.4, 9.0], [0.8, 0.8, -0.6]),
    wp(BEATS.rogue2Snap - 27, [1.8, 2.0, 7.6], [2.0, 0.8, -0.6]),
    wp(BEATS.rogue2Snap - 2, [2.6, 2.6, 11.4], [3.0, 1.0, -0.6]),
    wp(BEATS.rogue2Slip - 4, [0.6, 2.2, 8.4], [0.6, 0.6, -0.6]),
    wp(BEATS.rogue2Slip + 16, [0.6, 2.2, 8.4], [0.2, 0.6, -0.6]),
    // Paladin stomps through the slime and smashes the second drum.
    wp(BEATS.paladinStomp + 1, [1.8, 2.4, 9.0], [2.2, 1.1, -0.6]),
    wp(BEATS.paladinBrace + 15, [3.2, 2.8, 12.0], [3.6, 1.2, -0.6]),
    wp(BEATS.smash - 1, [3.0, 2.6, 11.0], [3.4, 1.2, -0.6]),
    wp(BEATS.smash + 19, [2.8, 2.6, 11.6], [3.0, 1.2, -0.6]),
    wp(BEATS.smash + 44, [2.2, 2.1, 7.4], [2.2, 1.2, -0.6]),
    wp(STAGE_STARTS[2] - 8, [2.0, 2.0, 6.8], [2.0, 1.2, -0.6]),
    // Level 3: spiked iron on the ledge, magnet in the floor.
    wp(STAGE_STARTS[2] + 1, [9.2, 3.9, 11.8], [9.9, 3.0, -0.6]),
    wp(s1.spawn + 8, [9.0, 3.8, 12.2], [9.7, 2.9, -0.6]),
    wp(BEATS.magnetInstall - 40, [3.0, 1.5, 7.6], [3.1, -0.6, -0.6]),
    wp(BEATS.magnetInstall + 10, [2.9, 1.5, 8.0], [3.0, -0.4, -0.6]),
    wp(BEATS.magnetInstall + 40, [2.2, 2.2, 8.6], [2.4, 1.0, -0.6]),
    wp(BEATS.paladin3Brace - 5, [2.6, 2.2, 8.6], [2.8, 1.0, -0.6]),
    wp(BEATS.yank - 13, [3.2, 2.0, 7.6], [3.4, 0.8, -0.6]),
    wp(BEATS.yank + 12, [4.4, 2.6, 11.4], [4.8, 1.2, -0.6]),
    wp(BEATS.skewer - 3, [3.8, 2.4, 10.8], [3.9, 1.1, -0.6]),
    // Mage and rogue float, the next ball rolls under them.
    wp(BEATS.cast - 12, [-1.6, 2.6, 9.6], [-1.4, 1.6, -0.6]),
    wp(BEATS.levitate + 16, [-1.5, 3.2, 10.2], [-1.5, 2.2, -0.6]),
    wp(BEATS.float[1] - 19, [-0.9, 2.9, 13.2], [-0.9, 2.0, -0.6]),
    wp(BEATS.underneath - 4, [-1.3, 2.9, 13.0], [-1.3, 2.0, -0.6]),
    // Level 4: crushers mount, gears turn, floaters get swatted.
    wp(STAGE_STARTS[3] + 1, [-1.5, 1.8, 9.6], [-1.5, 4.6, -0.6]),
    wp(BEATS.crusherInstall + 2, [-1.5, 2.0, 9.8], [-1.5, 4.4, -0.6]),
    wp(BEATS.gearsStart - 17, [-1.4, 3.6, 7.6], [-1.4, 4.8, -0.6]),
    wp(b3.spawn - 12, [9.2, 3.9, 11.8], [9.9, 3.0, -0.6]),
    wp(b3.spawn + 18, [9.0, 3.8, 12.2], [9.7, 2.9, -0.6]),
    wp(BEATS.swat - 16, [-1.5, 3.2, 10.6], [-1.5, 3.0, -0.6]),
    wp(BEATS.swat + 4, [-1.5, 3.0, 10.8], [-1.5, 2.6, -0.6]),
    wp(BEATS.swat + 29, [-1.4, 2.2, 8.6], [-1.4, 0.6, -0.6]),
    wp(Math.round(frameAtX(b3, -11)) + 3, [0.0, 2.4, 10.4], [0.2, 0.8, -0.6]),
    // Level 5: party enters, stares, flees, door seals, floor curves.
    wp(STAGE_STARTS[4] + 2, [-8.0, 2.4, 9.6], [-7.6, 1.0, -0.6]),
    wp(BEATS.turn - 6, [-4.0, 2.2, 8.6], [-3.6, 1.0, -0.6]),
    wp(BEATS.run - 2, [-3.6, 2.4, 9.6], [-3.4, 1.0, -0.6]),
    wp(BEATS.doorDrop - 17, [-6.0, 2.6, 9.8], [-6.2, 1.2, -0.6]),
    wp(BEATS.doorDrop + 8, [-7.8, 2.8, 10.2], [-8.2, 1.6, -0.6]),
    wp(BEATS.doorSlam + 8, [-7.6, 2.8, 10.4], [-8.0, 1.6, -0.6]),
    wp(BEATS.curve[0] - 49, [-6.4, 2.4, 9.6], [-6.4, 1.0, -0.6]),
    wp(BEATS.curve[0] - 4, [-7.0, 3.2, 15.2], [-7.2, 2.5, -0.6]),
    wp(BEATS.chuteSpawn - 8, [-7.0, 3.2, 15.6], [-7.2, 2.6, -0.6]),
    // Party gone up the chute: pull back past the cutaway for the bridge.
    wp(FLIGHT_END + 10, [CHUTE_POS[0] + 1.2, 4.4, 10.4], [CHUTE_POS[0] + 0.4, 4.6, -0.6]),
    wp(DURATION, [-3.0, 3.2, 21], [-3.0, 3.0, -0.6]),
  ],
  tracks: [
    { start: Math.round(footFrame(b1)) - 6, end: Math.round(frameAtX(b1, -11.5)), blend: 8, fn: boulderCam("b1", 10, -0.5) },
    {
      start: ROGUE_ENTER[0],
      end: ROGUE_ENTER[1],
      blend: 2,
      fn: (f) => {
        const x = rogueEntryX(f) + 0.5;
        return { position: [x, 2.2, 8.4], lookAt: [x + 0.2, 0.9, -0.6] };
      },
    },
    { start: Math.round(footFrame(d1)) - 6, end: Math.round(frameAtX(d1, -11.5)), blend: 8, fn: boulderCam("d1", 11, -0.6) },
    walkTrack(enterAfter("d1"), BEATS.paladinStomp, -10.6, -1.1),
    walkTrack(enterAfter("s1"), BEATS.cast - 14, -10.6, -2.2, 9.6),
    { start: BEATS.skewer, end: Math.round(frameAtX(s1, -11.5)), blend: 8, fn: boulderCam("s1", 10, -0.5) },
    { start: BEATS.hitRogue4 - 6, end: Math.round(frameAtX(b3, -11)), blend: 8, fn: boulderCam("b3", 10, -0.5) },
    // Hard cut to the ledge for the release, then ride the boulder to the pipe.
    {
      start: b4.release - 18,
      end: Math.round(footFrame(b4)) + 4,
      blend: 1,
      fn: () => ({ position: [9.2, 3.9, 11.8] as Vec3, lookAt: [9.9, 3.0, -0.6] as Vec3 }),
    },
    { start: Math.round(footFrame(b4)) - 6, end: Math.round(PIPE_LIP_FRAME), blend: 8, fn: boulderCam("b4", 10, -0.8) },
    { start: FLIGHT_START, end: FLIGHT_END + 12, blend: 10, fn: flightCamera },
  ],
  shake: [
    ...boulderShakes,
    { at: BEATS.goblinHit, strength: 0.18, spread: 6 },
    { at: BEATS.rogue2Hit, strength: 0.2, spread: 6 },
    { at: BEATS.smash, strength: 0.34, spread: 9 },
    { at: BEATS.yank, strength: 0.14, spread: 5 },
    { at: BEATS.skewer, strength: 0.24, spread: 7 },
    { at: BEATS.swat, strength: 0.28, spread: 7 },
    { at: BEATS.hitRogue4, strength: 0.16, spread: 6 },
    { at: BEATS.doorSlam, strength: 0.3, spread: 8 },
    { at: BEATS.launch, strength: 0.32, spread: 9 },
  ],
  rumbles: [
    ...boulderRumbles,
    { start: BEATS.curve[0], end: BEATS.curve[1], strength: 0.04 },
    { start: d1.spawn, end: d1.spawn + 14, strength: 0.03 },
    { start: s1.spawn, end: s1.spawn + 14, strength: 0.02 },
    { start: b4.spawn, end: b4.spawn + 14, strength: 0.02 },
  ],
};

export const config = segmentConfig("hallway", "Act II: The Hallway", camera, SFX);
