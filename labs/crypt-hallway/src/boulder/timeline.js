// Boulder hallway: Ep2's timeline ("Evolution of a Boulder Trap", src/episodes/rolling-boulder),
// re-staged in a real corridor. Everything here is in Ep2's own frame (world.js maps it into the
// lab): x runs along the hall (+x = the release ledge, -x = the exit), y is up, z across the hall
// (the walking lane is Z). So Ep2's beats, boulder paths and party choreography port almost as they
// are; what changed for 3D is listed where it happens:
//   - boulders are bigger (stone 1.2, spiked 1.3): the hall is 3.1 m wide and a ball has to fill it
//   - the half-pipe has a 2.0 m radius, so the flat floor it curls up from is exactly its arc
//   - boulders roll out of the doorway and on into the daylight instead of vanishing at the edge
// Every beat is w(line, word) ± n on the voiced narration (narrationCues.json).
import ep2Cues from "../../../../src/episodes/rolling-boulder/data/narrationCues.json";
// the film runs on past Ep2's last line: the comment hook and a pointer to the game (voice-extra.py)
import extraCues from "./data/extraCues.json";
import { clamp01, easeInOut, easeOutCubic, lerp, progress } from "../../../../src/kit/motion";

export { clamp01, easeInOut, easeOutCubic, lerp, progress };
export const FPS = 30;
export const LINES = ["l1a", "l1b", "l2a", "l2b", "l2c", "l3a", "l3b", "l3c", "l4a", "l4b", "l5a", "l5b", "l5c", "cta", "play"];
const cues = { durationFrames: extraCues.durationFrames, lines: { ...ep2Cues.lines, ...extraCues.lines } };

// --- cues ------------------------------------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function w(line, word, nth = 0) {
  const hits = cues.lines[line].words.filter((x) => norm(x.word) === norm(word));
  if (!hits[nth]) throw new Error(`cue "${word}" not in ${line}`);
  return hits[nth].startFrame;
}
export const lineStart = (id) => cues.lines[id].startFrame;
export const lineEnd = (id) => cues.lines[id].endFrame;
export const DURATION = cues.durationFrames + 10;
export { cues };

// --- geometry (Ep2 frame) ---------------------------------------------------------------------
export const Z = -0.6;              // the walking lane
export const HW = 1.55;             // half the hall's width: a hall-wide drum is 3.1 m long
export const EDGE_X = 8.8;          // release ledge lip; a 45° ramp runs down to FOOT_X
export const LEDGE_Y = 2.4;
export const FOOT_X = EDGE_X - LEDGE_Y;
export const BACK_X = 12;           // back wall behind the ledge
export const GATE_GAP = 0.12;
export const WIRE_X = -1.8;        // Ep2: 2.2. Moved 4 m towards the exit (with the slime and the paladin):
                                   // a faster ball clears the doorway sooner, so the rogue can walk in after it
export const SLIME_RANGE = [-4.5, -2.5];
export const SLIME_SPOUT_X = -3.5;
export const MAGNET_X = -0.8;      // 1.25 m in front of where the paladin stands, as in Ep2
export const PIPE_CENTER = [-7.0, 2.0];
export const PIPE_R = 2.0;
export const PIPE_WALL_X = PIPE_CENTER[0] - PIPE_R;
export const PIPE_FLAT = [PIPE_CENTER[0] - (PIPE_R * Math.PI) / 2, PIPE_CENTER[0]]; // the floor that curls up
export const DOOR_X = -9.85;        // blast door face; the doorway wall runs to WALL_END_X
export const WALL_END_X = -10.35;
export const DOOR_H = 3.4;
export const CEILING_Y = 5.9;
export const DROP_X = -13.6; // the courtyard ends in a drop: a ball rolls out of the door and off it
const G_FRAME = 9.8 / (30 * 30);
export const CUBE_CENTER = [-8.2, 4.35, Z];
export const CUBE_SIZE = [3.4, 3.0, 2.8];
export const CRUSHER_XS = [-2.6, -0.6];
export const CRUSHER_SLAM_Y = 4.0;  // crusher face at the bottom of a slam
export const FLOAT_Y = 2.8;

// --- beats (all derived from narration words, as in Ep2) ---------------------------------------
export const BEATS = {
  // Level 1 – tripwire boulder
  wireSet: w("l1a", "tripwire") + 2,
  goblinTrip: w("l1a", "into") - 4,
  goblinHit: w("l1a", "flattened") + 3,
  rogue1Snap: w("l1b", "snap") + 8,
  rogue1Leap: [w("l1b", "leap") - 3, w("l1b", "leap") + 21],
  // Level 2 – hall-wide drum + slime
  slimePour: [w("l2a", "pour"), w("l2a", "pour") + 40],
  rogue2Snap: w("l2a", "off") + 4,
  rogue2Slip: w("l2b", "slips"),
  rogue2Hit: w("l2b", "path") - 8,
  paladinStomp: w("l2c", "braces") - 5,
  paladinBrace: w("l2c", "braces"),
  smash: w("l2c", "shatters") + 2,
  slimeGone: lineStart("l3a") - 8,
  // Level 3 – spiked iron + electromagnet
  magnetInstall: w("l3a", "electromagnet"),
  paladin3Brace: w("l3b", "braces"),
  yank: w("l3b", "yanks"),
  skewer: w("l3b", "spikes") - 6,
  cast: w("l3c", "casts"),
  levitate: w("l3c", "levitate"),
  float: [w("l3c", "floats"), w("l3c", "rafters") + 6],
  underneath: w("l3c", "underneath"),
  // Level 4 – ceiling crushers
  crusherInstall: w("l4a", "crushers") - 8,
  gearsStart: w("l4a", "timed"),
  swat: w("l4b", "swatted"),
  hitRogue4: w("l4b", "into") + 4,
  hitMage4: w("l4b", "path") - 1,
  // Level 5 – blast door, half-pipe, gelatinous cube
  turn: w("l5a", "turn"),
  run: w("l5a", "run"),
  doorDrop: w("l5a", "seal"),
  doorSlam: w("l5a", "seal") + 15,
  curve: [w("l5a", "curve"), w("l5a", "half-pipe") + 4],
  cubeSpawn: w("l5a", "half-pipe") + 5,
  chase: w("l5b", "chases"),
  launch: w("l5b", "launches"),
  dissolve: w("l5b", "cube"),
  stamp: w("l5c", "unbeatable"),
  crack: w("cta", "unless"),
  dare: w("cta", "prove"),
  play: w("play", "check"),
};

export const STAGE_STARTS = [84, lineStart("l2a"), lineStart("l3a"), lineStart("l4a"), lineStart("l5a")];

// --- boulder kinematics (Ep2's, radius-generic) -----------------------------------------------
const kneeX = (r) => FOOT_X + r - r * Math.SQRT2; // centre x where the ramp meets the floor
export const restPosition = (r) => [EDGE_X + r + GATE_GAP, LEDGE_Y + r];

/** Centre of a boulder of radius r after travelling s along its path. */
export function pathPoint(s, r, mode) {
  const [rx, ry] = restPosition(r);
  const ledge = r + GATE_GAP;
  if (s <= ledge) return [rx - s, ry];
  const arcLen = (r * Math.PI) / 4;
  if (s <= ledge + arcLen) {
    const a = Math.PI / 2 + (s - ledge) / r;
    return [EDGE_X + r * Math.cos(a), LEDGE_Y + r * Math.sin(a)];
  }
  const c1 = [EDGE_X - r * Math.SQRT1_2, LEDGE_Y + r * Math.SQRT1_2];
  const k = [kneeX(r), r];
  const rampLen = Math.SQRT2 * (c1[0] - k[0]);
  const s1 = ledge + arcLen + rampLen;
  if (s <= s1) {
    const u = (s - ledge - arcLen) / Math.SQRT2;
    return [c1[0] - u, c1[1] - u];
  }
  const floorX = k[0] - (s - s1);
  if (mode !== "pipe" || floorX >= PIPE_CENTER[0]) return [floorX, r];
  const into = PIPE_CENTER[0] - floorX;
  const rr = PIPE_R - r;
  const arc = (rr * Math.PI) / 2;
  if (into <= arc) {
    const phi = into / rr;
    return [PIPE_CENTER[0] - rr * Math.sin(phi), PIPE_CENTER[1] - rr * Math.cos(phi)];
  }
  return [PIPE_CENTER[0] - rr, PIPE_CENTER[1] + (into - arc)];
}

export const totalRamp = (r) => r + GATE_GAP + (r * Math.PI) / 4 + Math.SQRT2 * (EDGE_X - r * Math.SQRT1_2 - kneeX(r));

// release -> impact: accelerates down the ramp in t1 frames, then rolls on at 2·L1/t1
const solveT1 = (r, release, impact, hitX) => (impact - release) / (1 + (kneeX(r) - hitX) / (2 * totalRamp(r)));

const spec = (id, kind, r, spawn, release, impact, hitX, mode = "exit", end) => ({
  id, kind, r, spawn, release, t1: solveT1(r, release, impact, hitX), mode, end,
});

export const R_STONE = 1.2;
export const R_DRUM = 1.35;
export const R_SPIKED = 1.3;
export const R_FINALE = 0.8;
export const DRUM_LENGTH = 2 * HW - 0.06;

// victim x positions at their impact frames
export const GOBLIN_HIT_X = WIRE_X + 0.25;
export const ROGUE1_LEAP_X = [-3.5, -1.7];
export const ROGUE2_LIE_X = -4.45;
export const PALADIN_X = -2.05;
export const PALADIN_YANK_X = MAGNET_X + 0.1;
export const FLOAT_X = { mage: -2.6, rogue: -0.6 }; // right under the crushers
// a pancake: the front of the ball touches the body on the impact word, the crown rolls over it after
const CONTACT = 0.85;

export const BOULDERS = [
  spec("b1", "stone", R_STONE, w("l1a", "boulder"), BEATS.goblinTrip + 2, BEATS.goblinHit, GOBLIN_HIT_X + CONTACT * R_STONE),
  spec("b2", "stone", R_STONE, lineStart("l1b") - 10, BEATS.rogue1Snap + 2, BEATS.rogue1Leap[0] + 12, (ROGUE1_LEAP_X[0] + ROGUE1_LEAP_X[1]) / 2),
  spec("d1", "drum", R_DRUM, w("l2a", "boulder"), BEATS.rogue2Snap + 2, BEATS.rogue2Hit, ROGUE2_LIE_X + CONTACT * R_DRUM),
  spec("d2", "drum", R_DRUM, BEATS.rogue2Hit + 30, BEATS.paladinStomp + 2, BEATS.smash, PALADIN_X + 0.85 + R_DRUM, "shatter", BEATS.smash),
  spec("s1", "spiked", R_SPIKED, w("l3a", "iron"), BEATS.yank - 1, BEATS.skewer, PALADIN_YANK_X + 0.8 + R_SPIKED * 0.25),
  spec("s2", "spiked", R_SPIKED, BEATS.skewer + 30, BEATS.underneath - 57, BEATS.underneath, -1.5),
  spec("b3", "stone", R_STONE, w("l4a", "boulder"), BEATS.swat + 3, BEATS.hitRogue4, FLOAT_X.rogue + CONTACT * R_STONE),
  spec("b4", "stone", R_FINALE, lineStart("l5a") - 12, BEATS.chase - 30, BEATS.launch - 10, PIPE_CENTER[0], "pipe"),
];
export const boulderById = (id) => {
  const b = BOULDERS.find((x) => x.id === id);
  if (!b) throw new Error(`boulder ${id}`);
  return b;
};

/** Distance travelled along the path, frames after release. */
export function rollS(b, frame) {
  const t = frame - b.release;
  if (t <= 0) return 0;
  const l1 = totalRamp(b.r);
  if (t < b.t1) return l1 * (t / b.t1) ** 2;
  return l1 + ((2 * l1) / b.t1) * (t - b.t1);
}
export function frameAtS(b, s) {
  const l1 = totalRamp(b.r);
  if (s < l1) return b.release + b.t1 * Math.sqrt(s / l1);
  return b.release + b.t1 + ((s - l1) * b.t1) / (2 * l1);
}
export const frameAtX = (b, x) => frameAtS(b, totalRamp(b.r) + (kneeX(b.r) - x));
export const footFrame = (b) => b.release + b.t1;
/** Newcomers walk in through the doorway only once the previous boulder has rolled out past it. */
export const enterAfter = (id) => { // gone over the drop beyond the doorway
  const b = boulderById(id);
  return Math.ceil(frameAtX(b, DROP_X) + Math.sqrt((2 * (b.r + 2.5)) / G_FRAME));
};

export const ROGUE_ENTER = [enterAfter("b1"), w("l1b", "rogue")];
export const ROGUE_SNAP_X = WIRE_X - 0.45;
export const LEFT_ENTRY = -11.6; // outside, in the daylight beyond the doorway
export const rogueEntryX = (frame) => lerp(LEFT_ENTRY, ROGUE_SNAP_X, 1 - (1 - progress(frame, ROGUE_ENTER)) ** 2);

export const PIPE_LIP_FRAME = (() => {
  const b = BOULDERS[BOULDERS.length - 1];
  return frameAtS(b, totalRamp(b.r) + (kneeX(b.r) - PIPE_CENTER[0]) + ((PIPE_R - b.r) * Math.PI) / 2);
})();
const FINALE_REST_Y = CUBE_CENTER[1] - 0.05;
const FINALE_RISE_FRAMES = 34;

/** { visible, position: [x, y, z], angle (roll about +z), spawn 0..1 } */
export function boulderState(b, frame) {
  const [rx, ry] = restPosition(b.r);
  const hidden = { visible: false, position: [rx, ry, Z], angle: 0, spawn: 0 };
  if (frame < b.spawn) return hidden;
  if (b.end !== undefined && frame >= b.end) return hidden;
  const spawn = clamp01((frame - b.spawn) / 14);
  if (frame < b.release) {
    // dropped down the chute onto the ledge with a little bounce
    const fall = spawn < 0.7 ? (1 - (spawn / 0.7) ** 2) * 4.2 : 0.18 * Math.sin(((spawn - 0.7) / 0.3) * Math.PI);
    return { visible: true, position: [rx, ry + fall, Z], angle: 0, spawn };
  }
  if (b.mode === "pipe" && frame >= PIPE_LIP_FRAME) {
    const x = PIPE_CENTER[0] - (PIPE_R - b.r);
    const u = easeOutCubic(clamp01((frame - PIPE_LIP_FRAME) / FINALE_RISE_FRAMES));
    const sLip = rollS(b, PIPE_LIP_FRAME);
    const wob = frame > PIPE_LIP_FRAME + FINALE_RISE_FRAMES ? 0.04 * Math.sin((frame - PIPE_LIP_FRAME) * 0.12) : 0;
    return { visible: true, position: [lerp(x, CUBE_CENTER[0] - 0.75, u), lerp(PIPE_CENTER[1], FINALE_REST_Y + 0.2, u) + wob, Z], angle: sLip / b.r + u * 2.2, spawn: 1 }; // sinks to the back of the jelly; the party hangs in front
  }
  const s = rollS(b, frame);
  const [x, y] = pathPoint(s, b.r, b.mode);
  if (x < DROP_X) { // over the edge: keeps its speed, falls
    const t = frame - frameAtX(b, DROP_X);
    const yy = y - 0.5 * G_FRAME * t * t;
    if (yy < -20) return hidden;
    return { visible: true, position: [x, yy, Z], angle: s / b.r, spawn: 1 };
  }
  return { visible: true, position: [x, y, Z], angle: s / b.r, spawn: 1 };
}

/** 0..1: how far a boulder has rolled over a body lying at x (0 = front touching, 1 = crown over it). */
export function rolledOver(b, x, frame) {
  const c = boulderState(b, frame);
  if (frame < b.release) return 0;
  return clamp01((x + CONTACT * b.r - c.position[0]) / (CONTACT * b.r));
}

// --- gate + tripwire --------------------------------------------------------------------------
/** The gate is down while a boulder waits on the ledge and drops open on release. */
export function gateOpenAmount(frame) {
  let at = -Infinity, opening = false, ever = false;
  for (const b of BOULDERS) {
    if (frame >= b.spawn && b.spawn > at) { at = b.spawn; opening = false; }
    if (frame >= b.release && b.release > at) { at = b.release; opening = true; ever = true; }
  }
  if (!ever) return 0;
  const t = clamp01((frame - at) / (opening ? 5 : 10));
  return opening ? t : 1 - t;
}

export const WIRE_EVENTS = [
  { set: BEATS.wireSet, cut: BEATS.goblinTrip },
  { set: boulderById("b2").spawn + 8, cut: BEATS.rogue1Snap },
  { set: w("l2a", "boulder") + 20, cut: BEATS.rogue2Snap },
  { set: boulderById("d2").spawn + 10, cut: BEATS.paladinStomp },
];
export const WIRE_RETIRE = lineStart("l3a") - 2;

// --- level 5 party: flee, bonk, half-pipe scramble, launch into the cube -----------------------
const FACE_RIGHT = Math.PI / 2, FACE_LEFT = -Math.PI / 2;
export const PARTY = [
  { classType: "rogue", delay: 0, stareX: -5.0, cowerX: -4.4, climbPhi: 1.05, lead: 0.62, target: [-7.35, 4.45, Z - 0.75], flightFrames: 50, z: Z - 0.75 },
  { classType: "mage", delay: 10, stareX: -6.0, cowerX: -5.0, climbPhi: 0.78, lead: 0.42, target: [-7.0, 3.85, Z + 0.1], flightFrames: 54, z: Z + 0.05 },
  { classType: "paladin", delay: 20, stareX: -7.0, cowerX: -5.6, climbPhi: 0.48, lead: 0.24, target: [-6.95, 4.75, Z + 0.8], flightFrames: 58, z: Z + 0.8 },
];
export const PARTY_ENTER = enterAfter("b3");
export const FLIGHT_START = BEATS.launch;

export const pipeSurface = (phi) => [PIPE_CENTER[0] - PIPE_R * Math.sin(phi), PIPE_CENTER[1] - PIPE_R * Math.cos(phi)];
const finaleBoulder = () => BOULDERS[BOULDERS.length - 1];
export function boulderPhi(frame) {
  const b = finaleBoulder();
  const into = rollS(b, frame) - (totalRamp(b.r) + (kneeX(b.r) - PIPE_CENTER[0]));
  return into / (PIPE_R - b.r);
}
const slowMo = (u) => u + (0.55 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);

export function partyState(m, frame) {
  const enterEnd = BEATS.turn - 4 + m.delay * 0.3;
  const runStart = BEATS.run + m.delay * 0.4;
  const doorX = DOOR_X + 0.55;
  const bonkAt = BEATS.doorSlam + 2;
  const fleeEnd = m.classType === "rogue" ? bonkAt : bonkAt + 6 + m.delay * 0.6;
  const fleeTo = m.classType === "rogue" ? doorX : doorX + 1.0 + m.delay * 0.07;
  const cowerStart = bonkAt + 24 + m.delay;
  const cowerEnd = BEATS.curve[0] - 6;
  const lookStart = finaleBoulder().release + 4;
  const scrambleStart = BEATS.chase + 2 + m.delay * 0.3;
  const climbEnd = BEATS.launch - 12;
  const zLane = (t) => lerp(Z, m.z, t);

  if (frame < enterEnd) {
    const t = progress(frame, [PARTY_ENTER + m.delay, enterEnd]);
    return { phase: "enter", position: [lerp(LEFT_ENTRY, m.stareX, t), 0, zLane(t)], tilt: 0, yaw: FACE_RIGHT, t };
  }
  if (frame < runStart) return { phase: "stare", position: [m.stareX, 0, m.z], tilt: 0, yaw: FACE_RIGHT, t: progress(frame, [enterEnd, runStart]) };
  if (frame < fleeEnd) {
    const t = progress(frame, [runStart, fleeEnd]);
    return { phase: "flee", position: [lerp(m.stareX, fleeTo, t), 0, m.z], tilt: 0, yaw: FACE_LEFT, t };
  }
  if (frame < cowerStart) {
    const t = progress(frame, [fleeEnd, cowerStart]);
    if (m.classType === "rogue") { // bounces off the door and lands on his back
      const k = easeOutCubic(Math.min(1, t * 2));
      return { phase: "bonk", position: [lerp(fleeTo, fleeTo + 1.0, k), 0.5 * Math.sin(Math.PI * Math.min(1, t * 2)), m.z], tilt: -1.35 * k, yaw: FACE_LEFT, t };
    }
    return { phase: "bonk", position: [fleeTo, 0, m.z], tilt: 0, yaw: FACE_LEFT + 0.6, t };
  }
  if (frame < lookStart) {
    const from = m.classType === "rogue" ? fleeTo + 1.0 : fleeTo;
    const t = progress(frame, [cowerStart, cowerEnd]);
    return { phase: "cower", position: [lerp(from, m.cowerX, easeInOut(t)), 0, m.z], tilt: 0, yaw: FACE_LEFT + 0.5, t };
  }
  if (frame < scrambleStart) {
    const t = progress(frame, [lookStart, lookStart + 12]);
    return { phase: "look", position: [m.cowerX, 0, m.z], tilt: 0, yaw: lerp(FACE_LEFT + 0.5, FACE_RIGHT - 0.4, easeInOut(t)), t };
  }
  const phiB = boulderPhi(frame);
  const pinnedPhi = Math.min(Math.PI / 2, phiB + m.lead + 0.3);
  if (frame < FLIGHT_START) {
    const t = progress(frame, [scrambleStart, climbEnd]);
    const floorRun = m.cowerX - PIPE_CENTER[0];
    const along = Math.min(t * 1.15, 1) * (floorRun + m.climbPhi * PIPE_R);
    const x = m.cowerX - Math.min(along, floorRun);
    let phi = 0;
    if (along > floorRun) phi = Math.max(0, (along - floorRun) / PIPE_R - 0.06 * Math.max(0, Math.sin(frame * 0.35))); // slips back every step
    const pinned = phiB + m.lead > phi && phiB > -0.2;
    if (pinned) phi = pinnedPhi;
    if (phi > 0) {
      const [px, py] = pipeSurface(phi);
      return { phase: pinned ? "pinned" : "scramble", position: [px, py, m.z], tilt: -phi, yaw: FACE_LEFT, t };
    }
    return { phase: "scramble", position: [x, 0, m.z], tilt: 0, yaw: FACE_LEFT, t };
  }
  const u = clamp01((frame - FLIGHT_START) / m.flightFrames);
  const [lx, ly] = pipeSurface(Math.PI / 2);
  const from = [lx + 0.3, ly + 0.2, m.z];
  const finalTilt = -Math.PI / 2 - Math.PI * (1.6 + m.delay * 0.03);
  if (u < 1) {
    const s = slowMo(u);
    const c = [from[0] - 0.3, m.target[1] + 1.2, m.z];
    const q = (i) => (1 - s) ** 2 * from[i] + 2 * (1 - s) * s * c[i] + s * s * m.target[i];
    return { phase: "flight", position: [q(0), q(1), q(2)], tilt: -Math.PI / 2 - s * Math.PI * (1.6 + m.delay * 0.03), yaw: FACE_LEFT + s * 1.2, t: u };
  }
  const hang = frame - (FLIGHT_START + m.flightFrames);
  const drift = [
    m.target[0] + 0.05 * Math.sin(hang * 0.05 + m.delay),
    m.target[1] + 0.08 * Math.sin(hang * 0.07 + m.delay) - Math.min(0.25, hang * 0.004),
    m.target[2],
  ];
  return { phase: frame >= BEATS.dissolve ? "skeleton" : "jelly", position: drift, tilt: finalTilt + hang * 0.004, yaw: FACE_LEFT + 1.2 + hang * 0.006, t: clamp01(hang / 30) };
}
export const FLIGHT_END = FLIGHT_START + Math.max(...PARTY.map((m) => m.flightFrames));
