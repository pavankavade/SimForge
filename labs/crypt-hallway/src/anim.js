// Film test: levels 1-2 of the Ep1 script ("Evolution of a Dungeon Trap") in the realistic hall,
// voiced with the Ep1 narration. Every beat is keyed to a spoken word (w(line, word)) like an
// episode timeline, so the picture stays locked to the voice. Pure functions of the frame (30 fps).
//   l1a  spike pit installs; the goblin walks right in
//   l1b  a rogue spots the gap and leaps it
//   l2a  hinged false floor + a glowing chest out of reach; rogue #2 jumps for it, lands on the plate
//   l2b  the mage freezes the trapdoor solid and walks across
import cues from "../../../src/episodes/dungeon-trap-v2/data/narrationCues.json";
import { CHAR_SCALE_VALUE, FACE_CAMERA, FACE_RIGHT } from "./castConsts.js";
import { AISLE_X } from "./hall.js";

export const FPS = 30;
export const LINES = ["l1a", "l1b", "l2a", "l2b", "l3a", "l3b", "l4a", "l5a", "end", "cta"];

// --- cues ------------------------------------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function w(line, word, nth = 0) {
  const hits = cues.lines[line].words.filter((x) => norm(x.word) === norm(word));
  if (!hits[nth]) throw new Error(`cue "${word}" not in ${line}`);
  return hits[nth].startFrame;
}
const lineStart = (id) => cues.lines[id].startFrame;
const lineEnd = (id) => cues.lines[id].endFrame;

// --- geometry --------------------------------------------------------------------------------
// wall to wall across nave and both aisles, pier to pier along the hall (3 m): no way round, too far to step
export const PIT = { s: 13.5, hw: AISLE_X, hl: 1.5, depth: 1.3 };
const SPIKES_Y = -0.62; // where a body comes to rest on the spike tips
const EDGE_S = PIT.s + PIT.hl; // far rim: everyone arrives from the far end of the hall
const NEAR_S = PIT.s - PIT.hl;
export const CHEST = { s: 13.9, hang: 2.78, top: 9.2 }; // chest bottom height when hung (a near miss for a jump); chain anchor
export const PLATE_S = CHEST.s;
export const ICE_Y = 0.07;

const HIP = 0.95 * CHAR_SCALE_VALUE;
const lieHeight = (classScale) => 0.2 * CHAR_SCALE_VALUE * classScale;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const corpse = (x, s, classScale, settleFrom, f, tilt = Math.PI / 2) => ({
  pose: "sprawl", position: [x, SPIKES_Y + lieHeight(classScale) - HIP + 0.1 * Math.sin(Math.PI * clamp01((f - settleFrom) / 7)), -s],
  yaw: FACE_RIGHT, tilt, pivot: HIP, expression: "dead",
});

const lerp = (a, b, t) => a + (b - a) * t;
const prog = (f, a, b) => clamp01((f - a) / (b - a));
const easeInOut = (t) => t * t * (3 - 2 * t);
const easeIn = (t) => t * t;
const easeOutBack = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
const WALK = 0.09, JOG = 0.14;

// --- beats -----------------------------------------------------------------------------------
export const B = {
  spikes: w("l1a", "spike"),                     // spike bed rises out of the pit floor
  gobEdge: w("l1a", "in"),                       // "walks right in": steps off the far rim
  rogueIn: w("l1b", "rogue") - 6,
  spots: w("l1b", "spots"),                      // stops at the rim, looks down
  leap: w("l1b", "leaps"),
  cover: w("l2a", "cover"),                      // the flaps rise, standing open at the rims
  flapA: w("l2a", "false"),                      // near flap slams shut
  flapB: w("l2a", "floor"),                      // far flap slams shut
  chest: w("l2a", "hang"),                       // chest drops on its chain
  glow: w("l2a", "glowing"),
  rogue2Jump: w("l2a", "jumps"),
  plate: w("l2a", "lands"),                      // lands on the plate: click
  plateShow: w("l2a", "pressure"),               // the plate lights up for the audience
  mage: w("l2b", "mage"),
  freeze: w("l2b", "freezes"),
  solid: w("l2b", "solid"),
};
B.gobDrop = B.gobEdge + 14;         // cartoon hang (a close-up on his face), then gravity
B.gobImpale = B.gobDrop + 11;
B.rogueLand = B.leap + 24;          // a 3.8 m running leap
B.rogueGloat = B.rogueLand + 8;
B.rogueExit = Math.max(B.rogueGloat + 22, lineStart("l2a") + 12);
B.flapsUp = B.cover;
B.rogue2Land = B.plate;
B.trapOpen = B.plate + 12;          // a beat to realise (close-up), then the floor goes
B.rogue2Impale = B.trapOpen + 13;
B.reset = B.plateShow + 16;         // flaps ratchet shut again
B.mageArrive = B.freeze - 6;
// level 3: copper pipes + oil tank; the mage tiptoes out on her ice... which becomes a frying pan
B.chestUp = w("l3a", "copper");                 // the bait is winched away (the pendulum needs the vault)
B.pipes = w("l3a", "pipes");                    // burner pipes slide out along the rims
B.tank = w("l3a", "tank");                      // the oil tank drops in
B.mageGo = w("l3a", "fed");
B.mageStop = w("l3a", "becomes") - 8;
B.mageClick = B.mageGo + Math.round((EDGE_S + 0.4 - PLATE_S) / ((EDGE_S + 0.4 - 13.2) / (B.mageStop - B.mageGo)));
B.fire = w("l3a", "becomes");
B.pan = w("l3a", "pan");                        // ice gone, floor drops
B.mageImpale = B.pan + 15;
B.close3 = B.pan + 44;
// counter: the paladin pushes through the flames behind his shield
B.palIn = B.pan + 40;
B.palStop = w("l3b", "shield") + 2;
B.fireEnd = w("l3b", "shield") + 24;
// level 4: a gear-driven pendulum, timed to the spot where he stands
B.pendulum = w("l4a", "pendulum");
B.cock = w("l4a", "timed");
B.release = w("l4a", "spot") - 12;
B.bladeHit = w("l4a", "spot");
B.palImpale = B.bladeHit + 24;
B.close4 = B.bladeHit + 52;
// level 5: the party won't step; counterweight catapult under the entrance; into the Mimic
B.partyIn = lineStart("l5a") - 30;
B.partyLine = w("l5a", "refuses");
B.shieldUp = w("l5a", "single");
B.reveal = w("l5a", "counterweight");
B.build = [w("l5a", "catapult"), w("l5a", "entrance")];
B.huddle = [w("l5a", "moment"), w("l5a", "plan")];
B.mimic = w("l5a", "floor") - 30;
B.mimicOpen = w("l5a", "throws") - 6;
B.launch = w("l5a", "throws");
B.slabReset = w("l5a", "chute") + 12;
B.burp = w("end", "congratulations") + 4;
B.stamp = w("end", "unbeatable");
B.crack = w("cta", "unless");
B.dare = w("cta", "prove");
export const FRAMES = cues.durationFrames + 10;
export const NARRATION_END = FRAMES;

const GOB_START = lineStart("l1a") + 100;
const GOB_S0 = EDGE_S + WALK * (B.gobEdge - GOB_START);
const GOB_CORPSE_S = EDGE_S - 1.0; // clear of the far flap when it drops open
const ROGUE_TAKEOFF_S = EDGE_S + 0.35;
const ROGUE_S0 = ROGUE_TAKEOFF_S + JOG * (B.spots - B.rogueIn);
const ROGUE_LAND_S = NEAR_S - 0.45;
const ROGUE2_START = B.rogue2Jump - 8 - 64;
const ROGUE2_S0 = PLATE_S + WALK * (B.rogue2Jump - 8 - ROGUE2_START);
const MAGE_START = B.mageArrive - 62;
const MAGE_STOP_S = EDGE_S + 0.4;
const MAGE_S0 = MAGE_STOP_S + WALK * (B.mageArrive - MAGE_START);
const MAGE_MID_S = 13.2; // where she stands, mid-pan, when the fire starts
const PAL_STOP_S = EDGE_S - 0.5; // on the far flap, short of the plate: "the exact spot"
const PAL_S0 = 21;
const PENDULUM = { s: PAL_STOP_S, y: 7.5, len: 6.1, amp: 0.5 }; // swings across the nave: past 0.5 rad the arm would cut into the arcade wall
const SLAB = { s0: 15.55, s1: 19.6, hw: 1.9 }; // the catapult: the floor under the entrance, hinged at s0
const MIMIC = { x: 0.35, s: 10.4 };
export const TANK = [-3.5, 19.5]; // the oil tank (x, s): out in the left aisle, mid-bay, beside the catapult slab
export { MAGE_MID_S, PENDULUM, SLAB, MIMIC };

// --- props -----------------------------------------------------------------------------------
// flap angles (radians about the hinge): 0 = shut and flush, pi/2 = standing up, negative = dropped open.
// Open, a flap's tip stops short of the pit floor; hall.js grades the spikes down near the rims to clear it.
export const FLAP_OPEN = 0.95;
const flapSwing = (f, start, land) => {
  if (f < B.flapsUp) return null; // not installed yet
  if (f < start) return Math.PI / 2;
  const t = prog(f, start, land);
  return f <= land ? (Math.PI / 2) * (1 - easeIn(t)) : 0.04 * Math.sin((f - land) * 1.6) * Math.exp(-(f - land) / 3);
};
function flapAngle(f, start, land) {
  let a = flapSwing(f, start - 12, land);
  if (a == null) return null;
  // each trigger: both drop open, then ratchet back shut
  for (const [open, close] of TRAP_EVENTS) {
    if (f < open || f >= close + 14) continue;
    const o = -FLAP_OPEN * easeOutBack(prog(f, open, open + 7), 1.2);
    a = f < close ? o : lerp(o, 0, easeInOut(prog(f, close, close + 14)));
  }
  return a;
}
const TRAP_EVENTS = [[B.trapOpen, B.reset], [B.pan, B.close3], [B.bladeHit, B.close4]];

// pendulum angle about its pivot (radians, + swings the blade towards the far end of the hall)
function pendulumAngle(f) {
  if (f < B.cock) return 0;
  if (f < B.release) { // ratcheted back notch by notch
    const t = prog(f, B.cock, B.release - 6), notches = 11;
    return PENDULUM.amp * Math.min(1, (Math.floor(t * notches) + easeOutCubic((t * notches) % 1)) / notches);
  }
  const w0 = Math.PI / 2 / (B.bladeHit - B.release); // reaches the bottom exactly on "spot"
  const decay = f < B.close4 ? 1 : Math.exp(-(f - B.close4) / 40);
  return PENDULUM.amp * decay * Math.cos(w0 * (f - B.release));
}
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function propsAt(f) {
  const rise = f < B.flapsUp ? 0 : easeOutBack(prog(f, B.flapsUp, B.flapsUp + 14));
  const chestT = prog(f, B.chest, B.chest + 18);
  const chestUp = easeIn(prog(f, B.chestUp, B.chestUp + 40));
  const melt = prog(f, B.fire + 6, B.pan);
  const fire = f >= B.fire && f < B.fireEnd + 8 ? Math.min(1, (f - B.fire) / 5) * (f > B.fireEnd ? 1 - (f - B.fireEnd) / 8 : 1) : 0;
  return {
    clock: f,
    pipes: easeOutBack(prog(f, B.pipes, B.pipes + 16)),
    tank: f < B.tank - 10 ? null : lerp(5, 0, easeOutBack(prog(f, B.tank - 10, B.tank), 0.8)),
    gauge: prog(f, B.tank + 4, B.fire), // pressure needle climbs to the red
    fire,
    melt,
    pendulumIn: f < B.pendulum ? 0 : easeOutBack(prog(f, B.pendulum, B.pendulum + 16), 1.1) * (1 - easeInOut(prog(f, B.partyIn, B.partyIn + 40))),
    pendulumAngle: pendulumAngle(f),
    slabReveal: f < B.launch ? prog(f, B.reveal, B.reveal + 12) : 0,
    counterweight: f < B.reveal ? null : f < B.launch ? lerp(8, 3.1, easeOutBack(prog(f, B.reveal, B.reveal + 14))) + 1.3 * easeInOut(prog(f, B.build[0], B.build[1])) : lerp(4.4, 1.1, easeIn(prog(f, B.launch - 2, B.launch + 3))),
    slab: slabAngle(f),
    mimicY: f < B.mimic ? null : lerp(5, 0, easeIn(prog(f, B.mimic, B.mimic + 9))),
    mimicLid: mimicLid(f),
    chestGone: chestUp >= 1,
    spikesY: -0.95 * (1 - easeOutBack(prog(f, B.spikes, B.spikes + 14), 1.3)),
    flapsY: lerp(-1.6, 0, rise),
    flapA: flapAngle(f, B.flapsUp, B.flapA),
    flapB: flapAngle(f, B.flapsUp, B.flapB),
    chestY: f < B.chest || chestUp >= 1 ? null : lerp(lerp(CHEST.top, CHEST.hang, easeOutBack(chestT, 1.2)) + 0.03 * Math.sin(f * 0.07), CHEST.top + 1, chestUp),
    chestSwing: 0.05 * Math.sin(f * 0.09) * (1 - 0.5 * chestT),
    chestGlow: prog(f, B.glow - 4, B.glow + 10),
    plateGlow: f >= B.plateShow - 3 && f < B.reset ? 1 : f >= B.mageClick && f < B.mageClick + 20 ? 0.6 : 0,
    plateDown: (f >= B.plate && f < B.reset) || (f >= B.mageClick && f < B.mageClick + 12) ? 1 : 0,
    ice: f >= B.pan ? 0 : easeInOut(prog(f, B.freeze + 4, B.solid)), // grows from the far rim to the near rim
    castGlow: f >= B.freeze - 2 && f < B.solid + 8 ? Math.min(1, (f - B.freeze + 2) / 4) * (f > B.solid ? 1 - (f - B.solid) / 8 : 1) : 0,
  };
}

// --- actors ----------------------------------------------------------------------------------
function goblin(f) {
  if (f < GOB_START) return null;
  if (f < B.gobEdge) {
    const s = GOB_S0 - WALK * (f - GOB_START);
    return { pose: "walk", position: [0, 0, -s], yaw: FACE_CAMERA, expression: f > B.gobEdge - 30 ? "happy" : undefined };
  }
  if (f < B.gobDrop) {
    const look = f >= B.gobEdge + 3; // walked off the edge... and only now noticed
    return { pose: look ? "cower" : "walk", position: [0, 0, -(EDGE_S - 0.25)], yaw: FACE_CAMERA, speed: look ? 1 : 0, expression: look ? "scared" : "neutral" };
  }
  if (f < B.gobImpale) {
    const t = (f - B.gobDrop) / FPS;
    const s = lerp(EDGE_S - 0.25, GOB_CORPSE_S, prog(f, B.gobDrop, B.gobImpale));
    return { pose: "fall", position: [0, Math.max(SPIKES_Y, -4.9 * t * t), -s], yaw: FACE_CAMERA, tilt: 0.25 * prog(f, B.gobDrop, B.gobImpale), pivot: HIP, expression: "scared" };
  }
  return corpse(0.05, GOB_CORPSE_S, 0.82, B.gobImpale, f);
}

function gloat(f, at, pos, gloatYaw, from = FACE_CAMERA, pose = "cheer") {
  const turn = easeInOut(prog(f, at, at + 6));
  return { pose: f < at + 6 ? "idle" : pose, position: pos, yaw: lerp(from, gloatYaw, turn), expression: "smug" };
}

function rogue(f, gloatYaw) {
  if (f < B.rogueIn) return null;
  if (f < B.spots) return { pose: "run", position: [0, 0, -(ROGUE_S0 - JOG * (f - B.rogueIn))], yaw: FACE_CAMERA, speed: 2 };
  if (f < B.leap - 6) return { pose: "idle", position: [0, 0, -ROGUE_TAKEOFF_S], yaw: FACE_CAMERA, expression: f < B.spots + 10 ? "shock" : "focus" };
  if (f < B.leap) {
    const k = Math.sin(Math.PI * 0.5 * prog(f, B.leap - 6, B.leap));
    return { pose: "cower", position: [0, -0.06 * k, -ROGUE_TAKEOFF_S], yaw: FACE_CAMERA, expression: "focus" };
  }
  if (f < B.rogueLand) {
    const t = prog(f, B.leap, B.rogueLand);
    return { pose: "jump", position: [0, 4 * 1.3 * t * (1 - t), -lerp(ROGUE_TAKEOFF_S, ROGUE_LAND_S, t)], yaw: FACE_CAMERA, expression: "focus" };
  }
  const here = [0, 0, -ROGUE_LAND_S];
  if (f < B.rogueGloat) return { pose: "idle", position: here, yaw: FACE_CAMERA, expression: "happy" };
  if (f < B.rogueExit) return gloat(f, B.rogueGloat, here, gloatYaw, FACE_CAMERA, "point");
  // off she goes, through the arcade into the left aisle
  const to = [-4.2, 10.5], from = [0, ROGUE_LAND_S];
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const t = Math.min(1, ((f - B.rogueExit) * WALK) / dist);
  if (t >= 1) return null;
  return { pose: "walk", position: [lerp(from[0], to[0], t), 0, -lerp(from[1], to[1], t)], yaw: Math.atan2(to[0] - from[0], from[1] - to[1]) };
}

function rogue2(f) {
  if (f < ROGUE2_START) return null;
  const crouch = B.rogue2Jump - 8;
  if (f < crouch) return { pose: "walk", position: [0, 0, -(ROGUE2_S0 - WALK * (f - ROGUE2_START))], yaw: FACE_CAMERA, expression: "happy" };
  if (f < B.rogue2Jump) {
    const k = Math.sin(Math.PI * 0.5 * prog(f, crouch, B.rogue2Jump));
    return { pose: "cower", position: [0, -0.06 * k, -PLATE_S], yaw: FACE_CAMERA, expression: "focus" };
  }
  if (f < B.rogue2Land) {
    const t = prog(f, B.rogue2Jump, B.rogue2Land);
    return { pose: "jump", position: [0, 4 * 0.62 * t * (1 - t), -PLATE_S], yaw: FACE_CAMERA, expression: "focus" };
  }
  if (f < B.trapOpen + 2) return { pose: "idle", position: [0, 0, -PLATE_S], yaw: FACE_CAMERA, expression: f < B.plate + 3 ? "neutral" : "shock" };
  if (f < B.rogue2Impale) {
    const t = (f - B.trapOpen - 2) / FPS;
    return { pose: "fall", position: [0, Math.max(SPIKES_Y, -4.9 * t * t), -PLATE_S], yaw: FACE_CAMERA, expression: "scared" };
  }
  return corpse(0.55, PLATE_S - 0.35, 1, B.rogue2Impale, f, -Math.PI / 2);
}

function mage(f, gloatYaw) {
  if (f < MAGE_START) return null;
  if (f < B.mageArrive) return { pose: "walk", position: [0, 0, -(MAGE_S0 - WALK * (f - MAGE_START))], yaw: FACE_CAMERA };
  const at = [0, 0, -MAGE_STOP_S];
  if (f < B.freeze - 2) return { pose: "idle", position: at, yaw: FACE_CAMERA, expression: "focus" };
  if (f < B.solid + 8) return { pose: "cast", position: at, yaw: FACE_CAMERA, expression: f < B.solid ? "focus" : "smug" };
  if (f < B.solid + 44) return gloat(f, B.solid + 8, at, gloatYaw, FACE_CAMERA, "cheer");
  if (f < B.mageGo) {
    // the pipes slide in around her; a double-take at the tank, then shrugs it off
    const look = f >= B.tank + 2 && f < B.tank + 20;
    return { pose: "idle", position: at, yaw: look ? -0.9 : FACE_CAMERA, expression: look ? "shock" : "smug" };
  }
  if (f < B.mageStop) { // tiptoes out onto her ice; the plate clicks and nothing happens
    const s = lerp(MAGE_STOP_S, MAGE_MID_S, prog(f, B.mageGo, B.mageStop));
    const onIce = s < EDGE_S ? ICE_Y : 0;
    const clickJolt = f >= B.mageClick && f < B.mageClick + 4 ? -0.02 : 0;
    return { pose: "walk", speed: 0.55, position: [0, onIce + clickJolt, -s], yaw: FACE_CAMERA, expression: f >= B.mageClick && f < B.mageClick + 14 ? "smug" : "focus" };
  }
  const here = [0, ICE_Y, -MAGE_MID_S];
  if (f < B.fire) return { pose: "idle", position: here, yaw: gloatYaw, expression: "smug" };
  if (f < B.pan) { // the pan heats up: hot-foot hops
    const hop = 0.1 * Math.abs(Math.sin((f - B.fire) * 0.4));
    return { pose: "cower", position: [0, ICE_Y * (1 - prog(f, B.fire + 6, B.pan)) + hop, -MAGE_MID_S], yaw: FACE_CAMERA, expression: f < B.fire + 4 ? "shock" : "pain" };
  }
  if (f < B.mageImpale) {
    const t = (f - B.pan) / FPS;
    return { pose: "fall", position: [lerp(0, -0.7, prog(f, B.pan, B.mageImpale)), Math.max(SPIKES_Y, -4.9 * t * t), -MAGE_MID_S], yaw: FACE_CAMERA, expression: "scared" };
  }
  return corpse(-0.7, MAGE_MID_S + 0.1, 1, B.mageImpale, f);
}

const PAL_CORPSE = [1.1, 13.15];
function paladin(f, gloatYaw) {
  if (f < B.palIn) return null;
  if (f < B.palStop) { // pushes through the far rim's flames behind the shield
    const s = lerp(PAL_S0, PAL_STOP_S, prog(f, B.palIn, B.palStop));
    const shielding = s < EDGE_S + 1.4;
    return { pose: shielding ? "shieldWalk" : "walk", position: [0, 0, -s], yaw: FACE_CAMERA, speed: shielding ? 0.7 : 0.9, expression: shielding ? "focus" : undefined };
  }
  const at = [0, 0, -PAL_STOP_S];
  if (f < B.fireEnd + 8) return { pose: "shield", position: at, yaw: FACE_CAMERA, expression: "focus" };
  if (f < B.fireEnd + 50) return gloat(f, B.fireEnd + 8, at, gloatYaw, FACE_CAMERA, "cheer");
  if (f < B.bladeHit - 10) {
    const up = f >= B.pendulum && f < B.pendulum + 24; // glances up at the thing that just dropped in... and shrugs
    return { pose: "idle", position: at, yaw: FACE_CAMERA, expression: up ? "shock" : "smug" };
  }
  if (f < B.bladeHit) return { pose: "cower", position: at, yaw: FACE_CAMERA, expression: "scared" };
  if (f < B.palImpale) { // swatted from behind: tumbles forward into the opening floor
    const t = prog(f, B.bladeHit, B.palImpale);
    return {
      pose: "fall", position: [lerp(0, PAL_CORPSE[0], t), lerp(0.2, SPIKES_Y, t * t) + 0.9 * Math.sin(Math.PI * Math.min(1, t * 1.4)), -lerp(PAL_STOP_S, PAL_CORPSE[1], t)],
      yaw: FACE_CAMERA, tilt: -Math.PI * 1.5 * t, pivot: HIP, expression: "pain",
    };
  }
  return corpse(PAL_CORPSE[0], PAL_CORPSE[1], 1.06, B.palImpale, f, Math.PI / 2); // shield side down, so it never pokes through the shut floor
}

// --- level 5: the party -------------------------------------------------------------------------
// slab angle (radians, far edge up) about its hinge at SLAB.s0
function slabAngle(f) {
  if (f < B.launch) return 0;
  if (f < B.slabReset) return 0.95 * easeOutCubic(prog(f, B.launch, B.launch + 7));
  return 0.95 * (1 - easeInOut(prog(f, B.slabReset, B.slabReset + 24)));
}
const slabPoint = (x, s, f) => {
  const a = slabAngle(f), u = s - SLAB.s0;
  return [x, u * Math.sin(a), -(SLAB.s0 + u * Math.cos(a))];
};
export const MIMIC_MOUTH = [MIMIC.x, 0.95, -MIMIC.s];
const PARTY = [
  { id: "p-rogue", classType: "rogue", delay: 0, line: [-0.9, 17.0], huddle: [-0.45, 17.5], flight: 30, apex: 3.6 },
  { id: "p-mage", classType: "mage", delay: 8, line: [0, 17.6], huddle: [0, 18.0], flight: 34, apex: 4.0 },
  { id: "p-paladin", classType: "paladin", delay: 16, line: [0.9, 17.0], huddle: [0.45, 17.5], flight: 38, apex: 4.4 },
];
const FLIGHT_START = B.launch + 3;
const landAt = (m) => FLIGHT_START + m.flight;
export const CHOMP = Math.max(...PARTY.map(landAt)) + 2;
const HUDDLE_C = [0, 17.65];
function mimicLid(f) { // radians open (lid hinged at the back)
  if (f < B.mimicOpen) return 0;
  if (f < CHOMP) return 1.75 * easeOutBack(prog(f, B.mimicOpen, B.mimicOpen + 6));
  if (f < CHOMP + 3) return 1.75 * (1 - prog(f, CHOMP, CHOMP + 3));
  if (f < B.burp) return 0.12 * Math.max(0, Math.sin((f - CHOMP - 3) * 0.5)) * Math.exp(-(f - CHOMP) / 40); // chewing
  return 0.5 * Math.sin(Math.PI * prog(f, B.burp, B.burp + 12));
}

function partyMember(m, f) {
  const from = B.partyIn + m.delay, to = B.partyLine + m.delay * 0.5;
  if (f < from) return null;
  const S0 = 23.5;
  if (f < to) {
    const t = prog(f, from, to);
    return { pose: "walk", position: [m.line[0], 0, -lerp(S0, m.line[1], t)], yaw: FACE_CAMERA };
  }
  const line = [m.line[0], 0, -m.line[1]];
  const huddleAt = B.huddle[0] + m.delay * 0.5;
  if (f < huddleAt) {
    const shield = m.classType === "paladin" && f >= B.shieldUp;
    const peek = f >= B.reveal && f < B.reveal + 16; // the floor rumbles: a look down
    return { pose: shield ? "shield" : "idle", position: line, yaw: FACE_CAMERA, expression: peek ? "shock" : f >= B.shieldUp ? "smug" : "neutral" };
  }
  const face = Math.atan2(HUDDLE_C[0] - m.huddle[0], -HUDDLE_C[1] + m.huddle[1]);
  if (f < B.launch) {
    const t = easeInOut(prog(f, huddleAt, huddleAt + 22));
    const walking = t > 0 && t < 1;
    return { pose: walking ? "walk" : "idle", position: [lerp(m.line[0], m.huddle[0], t), 0, -lerp(m.line[1], m.huddle[1], t)], yaw: lerp(FACE_CAMERA, face, t), expression: "focus" };
  }
  if (f < FLIGHT_START) return { pose: "launch", position: slabPoint(m.huddle[0], m.huddle[1], f), yaw: face, expression: "shock" };
  const u = prog(f, FLIGHT_START, landAt(m));
  if (u >= 1) return null; // swallowed
  const p0 = slabPoint(m.huddle[0], m.huddle[1], FLIGHT_START);
  const lift = m.apex - (p0[1] + MIMIC_MOUTH[1]) / 2;
  return {
    pose: "launch",
    position: [lerp(p0[0], MIMIC_MOUTH[0], u), lerp(p0[1], MIMIC_MOUTH[1], u) + 4 * lift * u * (1 - u) - HIP, lerp(p0[2], MIMIC_MOUTH[2], u)],
    yaw: face + u * 1.5, tilt: -u * Math.PI * 3.2, pivot: HIP, scale: u < 0.85 ? 1 : 1 - (u - 0.85) * 5, expression: "scared",
  };
}

// --- camera ----------------------------------------------------------------------------------
// what the camera cares about, beat by beat; the rig box-filters it so it glides
function subject(f) {
  const pit = [0, -0.1, -PIT.s];
  const at = (a) => (a ? [a.position[0] * 0.5, Math.min(0.9, a.position[1] + 0.6), a.position[2]] : pit);
  if (f < GOB_START + 30) return pit; // the spike pit installs centre frame, under the title
  if (f < B.gobImpale + 12) return at(goblin(f));
  if (f < B.rogueIn + 10) return pit;
  if (f < B.rogueExit) {
    const r = at(rogue(f, 0));
    return [r[0], r[1], lerp(r[2], -PIT.s, 0.35)];
  }
  if (f < B.chest - 4) return [0, 0.2, -PIT.s];
  if (f < ROGUE2_START + 20) return [0, 2.1, -CHEST.s];
  if (f < B.rogue2Impale + 14) {
    const r = at(rogue2(f));
    return [r[0], f < B.trapOpen ? 1.8 : Math.max(r[1], 0.9), r[2]]; // keep the bait in shot until she drops
  }
  if (f < MAGE_START + 20) return [0, 0, -PIT.s];
  if (f < B.pipes) return at(mage(f, 0));
  if (f < B.mageGo) return [-0.6, 0.4, -(PIT.s + 2.6)]; // pipes, the tank, the mage between them
  if (f < B.pan + 20) return at(mage(f, 0));
  if (f < B.palIn + 30) return [0, 0, -PIT.s];
  if (f < B.pendulum - 6) {
    const p = at(paladin(f, 0));
    return [p[0], p[1], lerp(p[2], -PIT.s, 0.4)];
  }
  if (f < B.bladeHit + 4) return [0, 1.5, -(PAL_STOP_S - 0.5)]; // the blade drops in, cocks, swings
  if (f < B.partyIn + 20) return [0, 0, -PIT.s];
  if (f < B.mimic) return [0, 0.5, -17.0];
  return [0.2, 0.4, -12.8]; // the Mimic in front, the catapult beyond
}

function smoothSubject(f) {
  const out = [0, 0, 0];
  const N = 20;
  for (let i = 0; i < N; i++) {
    const p = subject(Math.max(0, f - i));
    for (let k = 0; k < 3; k++) out[k] += p[k] / N;
  }
  return out;
}

// contact hits: { at, strength } -> a dip and a decaying rattle
const SHAKES = [
  { at: B.gobImpale, strength: 0.22 },
  { at: B.rogueLand, strength: 0.06 },
  { at: B.reset + 14, strength: 0.1 },
  { at: B.flapA, strength: 0.1 },
  { at: B.flapB, strength: 0.14 },
  { at: B.trapOpen, strength: 0.12 },
  { at: B.rogue2Impale, strength: 0.22 },
  { at: B.solid, strength: 0.1 },
];
function shake(f) {
  let x = 0, y = 0;
  for (const s of SHAKES) {
    const d = f - s.at;
    if (d < 0 || d > 14) continue;
    const e = s.strength * Math.exp(-d / 4);
    x += e * 0.12 * Math.sin(d * 2.3);
    y += e * 0.12 * (Math.cos(d * 1.9) - (d < 2 ? 1 : 0));
  }
  return [x, y];
}

// high three-quarter: sees into the pit and down the hall at once
const GLOAT_YAW = 0.5; // "to camera" for a gloat from this rig
const wideAt = (f) => {
  const p = smoothSubject(f);
  const drift = easeInOut(prog(f, 0, 996));
  const back = easeInOut(prog(f, B.partyIn, B.partyIn + 60)); // level 5 needs the Mimic and the catapult in one frame
  return {
    pos: [lerp(lerp(1.8, 1.55, drift), 1.4, back), lerp(3.6, 4.3, back), -lerp(lerp(7.7, 8.0, drift), 6.4, back)],
    look: [0, p[1] - 0.3, p[2] + 0.3], fov: lerp(50, 54, back),
  };
};

// Cuts away from the wide rig (kit camera's crashZoom / holdTrack): a hard cut in, a hard cut back.
//   crash: punch in on a face along the wide camera's own line of sight, lens snapping in over 5 frames
//   hold:  a fixed shot (the bait chest from below)
const headAt = (s, h = 1.45) => [0, h, -s];
const CUTS = [
  { kind: "crash", start: B.gobEdge + 3, end: B.gobDrop + 2, target: headAt(EDGE_S - 0.25, 1.15), d: 3.0, zoom: 1.3 },
  { kind: "crash", start: B.spots, end: B.spots + 18, target: headAt(ROGUE_TAKEOFF_S), d: 3.2, zoom: 1.25 },
  { kind: "hold", start: B.glow - 3, end: B.glow + 32, pos: [1.15, 1.25, -(CHEST.s - 3.3)], look: [0, CHEST.hang + 0.3, -CHEST.s], fov: 44 },
  { kind: "crash", start: B.plate + 3, end: B.trapOpen, target: headAt(PLATE_S), d: 3.0, zoom: 1.3 },
  { kind: "crash", start: B.solid + 14, end: B.solid + 44, target: headAt(MAGE_STOP_S, 1.35), d: 3.8, zoom: 1.15, push: 0.5 },
  { kind: "crash", start: B.fire + 1, end: B.fire + 18, target: headAt(MAGE_MID_S, 1.25), d: 3.4, zoom: 1.25, lift: 1.3 },
  { kind: "crash", start: B.fireEnd + 14, end: B.fireEnd + 46, target: headAt(PAL_STOP_S, 1.5), d: 3.6, zoom: 1.15, push: 0.5 },
  { kind: "crash", start: B.bladeHit - 10, end: B.bladeHit, target: headAt(PAL_STOP_S, 1.35), d: 3.6, zoom: 1.25, lift: 0.8 },
  { kind: "crash", start: B.shieldUp, end: B.shieldUp + 22, target: [0, 1.4, -17.2], d: 4.6, zoom: 1.2 },
  { kind: "hold", start: FLIGHT_START - 4, end: CHOMP + 26, pos: [1.4, 4.3, -6.4], look: [0.2, 1.2, -12.2], fov: 60 },
];

function camAt(f) {
  const base = wideAt(f);
  const cut = CUTS.find((c) => f >= c.start && f < c.end);
  if (!cut) return base;
  if (cut.kind === "hold") return { pos: cut.pos, look: cut.look, fov: cut.fov };
  const from = wideAt(cut.start).pos, t = cut.target;
  const dir = from.map((v, i) => v - t[i]);
  const len = Math.hypot(...dir);
  const d = cut.d - (cut.push ?? 0) * easeInOut(prog(f, cut.start, cut.end));
  const snap = 1 - Math.pow(1 - prog(f, cut.start, cut.start + 5), 3);
  const pos = t.map((v, i) => v + (dir[i] / len) * d);
  pos[1] -= cut.lift ?? 0; // a lower angle, so a face isn't all hat
  return { pos, look: t, fov: lerp(50, 50 / cut.zoom, snap) };
}

// Each rig returns { pos, look, fov }.
export const CAMS = {
  threeq: (f) => {
    const c = camAt(f);
    const [sx, sy] = shake(f);
    return { ...c, pos: [c.pos[0] + sx, c.pos[1] + sy, c.pos[2]] };
  },
};

// One track per character (frame -> Actor | null): cast.jsx hands them to the kit's ActorView,
// which looks back a few frames and eases every pose switch.
export const TRACKS = [
  { id: "goblin", classType: "goblin", track: goblin },
  { id: "rogue", classType: "rogue", track: (f) => rogue(f, GLOAT_YAW) },
  { id: "rogue2", classType: "rogue", track: rogue2 },
  { id: "mage", classType: "mage", track: (f) => mage(f, GLOAT_YAW) },
  { id: "paladin", classType: "paladin", track: (f) => paladin(f, GLOAT_YAW) },
  ...PARTY.map((m) => ({ id: m.id, classType: m.classType, track: (f) => partyMember(m, f) })),
];

// where the mage's staff glows while casting (for the cast light)
export const MAGE_CAST_POS = [0.35, 1.5, -(MAGE_STOP_S - 0.35)];

// --- sound -----------------------------------------------------------------------------------
// Ep1's procedural SFX (public/episodes/dungeon-trap-v2/sfx), volumes as in its config.ts
export const STAGES = [
  { at: Math.max(84, lineStart("l1a")), n: 1, name: "SPIKE PIT", color: "#ff9a3d" },
  { at: lineStart("l2a"), n: 2, name: "FALSE FLOOR + BAIT", color: "#ffd84d" },
  { at: lineStart("l3a"), n: 3, name: "FLAME PIPES", color: "#ff5a2a" },
  { at: lineStart("l4a"), n: 4, name: "PENDULUM BLADE", color: "#9fd0ff" },
  { at: lineStart("l5a"), n: 5, name: "CATAPULT + MIMIC", color: "#ff5fa2" },
];
export const SFX = [
  ["stamp", 6, 0.4],
  ...STAGES.map((s) => ["pop", s.at, 0.2]),
  ["spike", B.spikes + 6, 0.45],
  ["whoosh", B.gobDrop + 2, 0.3],
  ["spike", B.gobImpale, 0.5],
  ["thud", B.gobImpale, 0.4],
  ["whoosh", B.leap, 0.35],
  ["thud", B.rogueLand, 0.3],
  ["gears", B.flapsUp, 0.3],
  ["trap_close", B.flapA, 0.45],
  ["slam", B.flapB, 0.4],
  ["chain", B.chest, 0.35],
  ["sparkle", B.glow, 0.25],
  ["whoosh", B.rogue2Jump, 0.3],
  ["click", B.plate, 0.55],
  ["trap_open", B.trapOpen, 0.5],
  ["spike", B.rogue2Impale, 0.5],
  ["thud", B.rogue2Impale, 0.35],
  ["ratchet", B.reset, 0.35],
  ["trap_close", B.reset + 14, 0.4],
  ["ice", B.freeze, 0.5],
  ["sparkle", B.freeze + 4, 0.3],
  ["crack", B.solid, 0.4],
  ["sparkle", B.solid + 10, 0.25],
  // level 3
  ["chain", B.chestUp, 0.3],
  ["clank", B.pipes + 8, 0.35],
  ["thud", B.tank, 0.45],
  ["click", B.mageClick, 0.4],
  ["ignite", B.fire, 0.55],
  ["fire_loop", B.fire + 4, 0.35, B.fireEnd - B.fire],
  ["sizzle", B.fire + 10, 0.35],
  ["crack", B.pan - 4, 0.35],
  ["trap_open", B.pan, 0.45],
  ["spike", B.mageImpale, 0.5],
  ["trap_close", B.close3, 0.4],
  ["helmet", B.palStop - 30, 0.25],
  // level 4
  ["chain", B.pendulum, 0.4],
  ["ratchet", B.cock, 0.4, B.release - B.cock],
  ["twang", B.release, 0.45],
  ["whoosh_big", B.release + 4, 0.4],
  ["clang", B.bladeHit, 0.6],
  ["trap_open", B.bladeHit + 2, 0.4],
  ["spike", B.palImpale, 0.5],
  ["helmet", B.palImpale + 3, 0.35],
  ["trap_close", B.close4, 0.4],
  // level 5
  ["rumble", B.reveal, 0.4],
  ["ratchet", B.build[0], 0.35, B.build[1] - B.build[0]],
  ["thud", B.mimic + 9, 0.45],
  ["growl", B.mimicOpen, 0.3],
  ["launch", B.launch, 0.6],
  ["whoosh_big", FLIGHT_START + 4, 0.45],
  ...PARTY.map((m) => ["thud", landAt(m), 0.3]),
  ["chomp", CHOMP, 0.6],
  ["chew", CHOMP + 8, 0.4],
  ["burp", B.burp, 0.5],
  ["stamp", B.stamp, 0.6],
  ["boom", B.stamp, 0.35],
  ["crack", B.crack, 0.45],
  ["crumble", B.dare, 0.4],
  ["stamp", B.dare + 4, 0.55],
].map(([name, at, vol, dur]) => ({ name, at, vol, dur }));

// --- bursts (fx.js): every contact gets one, keyed to the same beat as its SFX ------------------
//   dust / sparks / shards: one-shot; glints / stream: running from `at` to `end`
// `box` spreads the emitters (half extents in x, y, s)
const SEAM = [AISLE_X * 0.85, 0, 0.06];
const RIM_DUST = [AISLE_X * 0.85, 0, PIT.hl * 0.9];
export const BURSTS = [
  { kind: "dust", at: B.spikes + 4, pos: [0, 0.05, -PIT.s], box: RIM_DUST, n: 60 },
  { kind: "sparks", at: B.gobImpale, pos: [0.05, -0.5, -GOB_CORPSE_S], n: 34 },
  { kind: "dust", at: B.gobImpale, pos: [0.05, -0.55, -GOB_CORPSE_S], n: 18 },
  { kind: "dust", at: B.leap, pos: [0, 0.02, -ROGUE_TAKEOFF_S], n: 12, size: 0.7 },
  { kind: "dust", at: B.rogueLand, pos: [0, 0.02, -ROGUE_LAND_S], n: 18 },
  { kind: "dust", at: B.flapsUp + 3, pos: [0, 0.05, -PIT.s], box: RIM_DUST, n: 50 },
  { kind: "dust", at: B.flapA, pos: [0, 0.03, -PIT.s], box: SEAM, n: 40 },
  { kind: "dust", at: B.flapB, pos: [0, 0.03, -PIT.s], box: SEAM, n: 50 },
  { kind: "dust", at: B.chest + 10, pos: [0, CHEST.top - 0.4, -CHEST.s], n: 14, size: 0.8 },
  { kind: "glints", at: B.glow - 2, end: B.chestUp + 30, pos: [0, CHEST.hang + 0.35, -CHEST.s], box: [0.65, 0.4, 0.45], n: 26 },
  { kind: "dust", at: B.rogue2Jump, pos: [0, 0.02, -PLATE_S], n: 12, size: 0.7 },
  { kind: "dust", at: B.rogue2Land, pos: [0, 0.02, -PLATE_S], n: 14, size: 0.8 },
  { kind: "dust", at: B.trapOpen, pos: [0, 0.0, -PIT.s], box: SEAM, n: 40 },
  { kind: "sparks", at: B.rogue2Impale, pos: [0.55, -0.5, -(PLATE_S - 0.35)], n: 34 },
  { kind: "dust", at: B.rogue2Impale, pos: [0.55, -0.55, -(PLATE_S - 0.35)], n: 18 },
  { kind: "dust", at: B.reset + 14, pos: [0, 0.03, -PIT.s], box: SEAM, n: 40 },
  { kind: "stream", at: B.freeze - 2, end: B.solid + 4, pos: MAGE_CAST_POS, to: [0, 0.1, -PIT.s], n: 70 },
  { kind: "shards", at: B.solid, pos: [0, 0.08, -PIT.s], box: [AISLE_X * 0.7, 0, PIT.hl * 0.8], n: 70 },
  { kind: "glints", at: B.mageClick, end: B.mageClick + 16, pos: [0, 0.15, -PLATE_S], box: [0.4, 0.05, 0.4], n: 10, tint: "ice" },
  // level 3
  { kind: "dust", at: B.tank, pos: [TANK[0], 0.05, -TANK[1]], n: 24 },
  { kind: "glints", at: B.fire, end: B.fireEnd, pos: [0, 0.9, -(NEAR_S - 0.1)], box: [2.2, 0.6, 0.15], n: 40, tint: "fire" },
  { kind: "glints", at: B.fire, end: B.fireEnd, pos: [0, 0.9, -(EDGE_S + 0.1)], box: [2.2, 0.6, 0.15], n: 40, tint: "fire" },
  { kind: "shards", at: B.pan, pos: [0, 0.05, -PIT.s], box: [AISLE_X * 0.6, 0, PIT.hl * 0.7], n: 60 },
  { kind: "dust", at: B.pan, pos: [0, 0.0, -PIT.s], box: SEAM, n: 30 },
  { kind: "sparks", at: B.mageImpale, pos: [-0.7, -0.5, -(MAGE_MID_S + 0.1)], n: 30 },
  { kind: "dust", at: B.close3, pos: [0, 0.03, -PIT.s], box: SEAM, n: 40 },
  // level 4
  { kind: "dust", at: B.pendulum + 6, pos: [0, PENDULUM.y + 0.3, -PENDULUM.s], box: [0.3, 0.1, 1.2], n: 20, size: 0.8 },
  { kind: "sparks", at: B.bladeHit, pos: [0, 1.1, -(PAL_STOP_S + 0.15)], n: 60 },
  { kind: "sparks", at: B.palImpale, pos: [PAL_CORPSE[0], -0.5, -PAL_CORPSE[1]], n: 34 },
  { kind: "dust", at: B.palImpale, pos: [PAL_CORPSE[0], -0.55, -PAL_CORPSE[1]], n: 18 },
  { kind: "dust", at: B.close4, pos: [0, 0.03, -PIT.s], box: SEAM, n: 40 },
  // level 5
  { kind: "dust", at: B.reveal + 4, pos: [0, 0.03, -(SLAB.s0 + SLAB.s1) / 2], box: [SLAB.hw, 0, (SLAB.s1 - SLAB.s0) / 2], n: 70 },
  { kind: "dust", at: B.mimic + 9, pos: [MIMIC.x, 0.03, -MIMIC.s], n: 24 },
  { kind: "dust", at: B.launch, pos: [0, 0.1, -17.5], box: [SLAB.hw, 0, 1.6], n: 60 },
  ...PARTY.map((m) => ({ kind: "dust", at: landAt(m), pos: [MIMIC.x, 1.3, -MIMIC.s], n: 12, size: 0.6 })),
  { kind: "sparks", at: CHOMP, pos: [MIMIC.x, 1.0, -(MIMIC.s - 0.3)], n: 30, tint: "splinter" },
  { kind: "glints", at: B.burp, end: B.burp + 24, pos: [MIMIC.x, 1.4, -(MIMIC.s - 0.2)], box: [0.4, 0.3, 0.3], n: 16, tint: "burp" },
];

// --- captions + badges (drawn as DOM over the canvas) -----------------------------------------
const chunks = [];
for (const id of LINES) {
  const words = cues.lines[id].words;
  for (let i = 0; i < words.length; ) {
    let n = Math.min(5, words.length - i);
    if (words.length - i - n === 1) n = 4; // no one-word tails
    chunks.push({ words: words.slice(i, i + n), end: (words[i + n] ?? { startFrame: cues.lines[id].endFrame + 8 }).startFrame });
    i += n;
  }
}
export function hudAt(f) {
  const c = chunks.find((k) => f >= k.words[0].startFrame && f < k.end);
  const stage = [...STAGES].reverse().find((s) => f >= s.at);
  return {
    title: f < 82,
    titleFrame: f,
    stage: stage ? { ...stage, pop: f - stage.at } : null,
    caption: c ? c.words.map((x) => ({ word: x.word, on: f >= x.startFrame })) : null,
    end: f >= B.stamp ? { age: f - B.stamp, crack: f - B.crack, dare: f - B.dare } : null,
  };
}
