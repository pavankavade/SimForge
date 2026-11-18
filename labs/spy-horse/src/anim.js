// "How a Dead Horse Becomes a WW1 Spy Post": the whole short as pure functions of the frame (30 fps).
// Every beat is keyed to a spoken word (w(line, word)) like an episode timeline, so the picture
// stays locked to the voice (scripts/spy-horse-audio.py writes the cues).
//   l1  crawl out and lie flat: one twitch, and the sniper's bullet pings off your helmet
//   l2  a shell hole dug deeper and sandbagged: the enemy maps it, and shells it by lunch
//   l3  nobody looks twice at a dead horse: the artist sketches one at night; a papier-mache copy
//   l4  put it down next to the real one (don't: they shell both); swap them at night instead
//   l5  inside, one man on his belly with a rifle, a slit in the neck, a telephone wire home
//   l6  at sunrise the enemy sees the same old horse; you call in every move they make
import cues from "./data/narrationCues.json";
import { BODY } from "./soldier.js";
import { heightAt, OUR_X, ENEMY_X, DIG, RING, BESIDE, WS } from "./set.js";

export const FPS = 30;
export const LINES = ["l1a", "l1b", "l2a", "l2b", "l3a", "l3b", "l3c", "l4a", "l4b", "l4c", "l5a", "l5b", "l6a", "l6b", "end"];

// --- cues --------------------------------------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function w(line, word, nth = 0) {
  const hits = cues.lines[line].words.filter((x) => norm(x.word) === norm(word));
  if (!hits[nth]) throw new Error(`cue "${word}" not in ${line}`);
  return hits[nth].startFrame;
}
const lineStart = (id) => cues.lines[id].startFrame;
const lineEnd = (id) => cues.lines[id].endFrame;

// --- helpers -----------------------------------------------------------------------------------
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const prog = (f, a, b) => clamp01((f - a) / (b - a));
const easeInOut = (t) => t * t * (3 - 2 * t);
const easeIn = (t) => t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
const FACE_CAMERA = 0, FACE_RIGHT = Math.PI / 2, FACE_LEFT = -Math.PI / 2;
const gy = (x, z) => heightAt(x, z);

// --- beats -------------------------------------------------------------------------------------
export const B = {
  eyes: w("l1a", "eyes"),
  enemy1: w("l1a", "enemy"),
  crawl: w("l1a", "crawl"),
  land: w("l1a", "land"),
  flat: w("l1a", "flat"),
  moves: w("l1b", "moves"),
  shot: w("l1b", "shot."),
  twitch: w("l1b", "twitch,"),
  sniper: w("l1b", "sniper"),
  has: w("l1b", "has"),
  dig: w("l2a", "dig"),
  deeper: w("l2a", "deeper,"),
  pile: w("l2a", "pile"),
  edge: w("l2a", "edge."),
  enemy2: w("l2b", "enemy"),
  maps: w("l2b", "maps"),
  crater: w("l2b", "crater."),
  fresh: w("l2b", "fresh"),
  morning: w("l2b", "morning"),
  shell2: w("l2b", "shell"),
  lunch: w("l2b", "lunch."),
  nobody: w("l3a", "nobody"),
  twice: w("l3a", "twice"),
  horse3: w("l3a", "horse."),
  hundreds: w("l3a", "hundreds"),
  artist: w("l3b", "artist"),
  crawls: w("l3b", "crawls"),
  night: w("l3b", "night,"),
  holds: w("l3b", "holds"),
  nose: w("l3b", "nose,"),
  sketches: w("l3b", "sketches"),
  fold: w("l3b", "fold"),
  shadow: w("l3b", "shadow."),
  behind: w("l3c", "behind"),
  build: w("l3c", "build"),
  hollow: w("l3c", "hollow"),
  copy3: w("l3c", "copy"),
  papier: w("l3c", "papier-mache,"),
  paint: w("l3c", "paint"),
  match: w("l3c", "match."),
  next: w("l4a", "next"),
  real4: w("l4a", "real"),
  dont: w("l4a", "don't."),
  two: w("l4a", "two"),
  shell4: w("l4a", "shell"),
  both: w("l4a", "both."),
  swap: w("l4b", "swap"),
  noise: w("l4b", "noise"),
  guns: w("l4b", "guns,"),
  drags: w("l4b", "drags"),
  away: w("l4b", "away"),
  trench4: w("l4b", "trench."),
  lay: w("l4c", "lay"),
  copy4: w("l4c", "copy"),
  same4: w("l4c", "same"),
  legs: w("l4c", "legs"),
  dawn: w("l4c", "dawn."),
  inside5: w("l5a", "inside"),
  room: w("l5a", "room"),
  lying: w("l5a", "lying"),
  belly: w("l5a", "belly,"),
  rifle: w("l5a", "rifle."),
  watches: w("l5b", "watches"),
  slit: w("l5b", "slit"),
  neck: w("l5b", "neck,"),
  telephone: w("l5b", "telephone"),
  runs: w("l5b", "runs"),
  trench5: w("l5b", "trench."),
  sunrise: w("l6a", "sunrise,"),
  enemy6: w("l6a", "enemy"),
  same6: w("l6a", "same"),
  ignored: w("l6a", "ignored"),
  inside6: w("l6b", "inside"),
  call: w("l6b", "call"),
  every6: w("l6b", "every"),
  move: w("l6b", "move"),
  make: w("l6b", "make."),
  congrats: w("end", "congratulations."),
};
B.ping = B.has + 2;                      // the bullet rings off the helmet
B.muzzle = B.ping - 4;                   // the far muzzle flash, just before
B.blast2 = B.lunch + 4;                  // the shell lands on the sandbagged hole
B.blast4a = B.shell4 + 6;                // they shell both horses
B.blast4b = B.both + 6;
B.rewind = lineStart("l4b") - 14;        // the two shelled horses rewind to the night before
B.dragEnd = B.trench4 + 6;
B.layDown = [B.lay, B.copy4 + 8];
B.stamp = B.congrats;
B.hits6 = [B.every6 + 6, B.move + 8, B.make + 6]; // our shells land on the enemy line
export const FRAMES = cues.durationFrames + 10;
export const NARRATION_END = FRAMES;

// scene spans (hard cuts hide every reset)
const SPAN = {
  l1: [0, lineStart("l2a") - 8],
  l2: [lineStart("l2a") - 8, lineStart("l3a") - 8],
  l3a: [lineStart("l3a") - 8, lineStart("l3b") - 6],
  l3b: [lineStart("l3b") - 6, lineStart("l3c") - 6],
  ws: [lineStart("l3c") - 6, lineStart("l4a") - 8],
  l4a: [lineStart("l4a") - 8, B.rewind],
  l4b: [B.rewind, lineStart("l5a") - 8],
  l5: [lineStart("l5a") - 8, lineStart("l6a") - 6],
  l6: [lineStart("l6a") - 6, FRAMES + 1],
};
const inSpan = (f, s) => f >= SPAN[s][0] && f < SPAN[s][1];

// --- time of day: presets eased between keys -------------------------------------------------------
const TOD = {
  day: { night: 0, dawn: 0, sunDir: [0.45, 0.5, -0.75], sunI: 4.2, sunColor: 0xfff0d6, skyI: 1.7, skyColor: 0x9cc2ec, groundColor: 0x6a4a30, fog: [90, 700] },
  dawn: { night: 0.0, dawn: 1, sunDir: [0.92, 0.14, -0.35], sunI: 4.4, sunColor: 0xffbc84, skyI: 1.3, skyColor: 0xb4a8d8, groundColor: 0x5a3a24, fog: [60, 500] },
  night: { night: 1, dawn: 0, sunDir: [-0.55, 0.42, -0.7], sunI: 3.6, sunColor: 0x8fb2ff, skyI: 0.9, skyColor: 0x4a6ab8, groundColor: 0x1a1a2a, fog: [50, 380] },
  predawn: { night: 0.6, dawn: 0.5, sunDir: [0.9, 0.08, -0.4], sunI: 3.0, sunColor: 0xd890a0, skyI: 1.3, skyColor: 0x7a7ab8, groundColor: 0x3a2a30, fog: [50, 400] },
};
const TOD_KEYS = [
  [0, "day"],
  [B.fresh, "day"],
  [B.morning + 4, "dawn"],
  [B.shell2, "day"],
  [SPAN.l3b[0] - 1, "day"],
  [SPAN.l3b[0], "night"],
  [SPAN.ws[0] - 1, "night"],
  [SPAN.ws[0], "day"],
  [SPAN.l4a[0] - 1, "day"],
  [SPAN.l4a[0], "dawn"],
  [B.dont, "dawn"],
  [B.shell4, "day"],
  [SPAN.l4b[0] - 1, "day"],
  [SPAN.l4b[0], "night"],
  [B.legs, "night"],
  [B.dawn + 6, "predawn"],
  [SPAN.l5[0] - 1, "predawn"],
  [SPAN.l5[0], "day"],
  [SPAN.l6[0] - 1, "day"],
  [SPAN.l6[0], "dawn"],
  [lineStart("l6b") - 6, "dawn"],
  [lineStart("l6b") + 20, "day"],
  [lineStart("end") - 10, "day"],
  [FRAMES, "dawn"],
];
function tod(f) {
  let i = 1;
  while (i < TOD_KEYS.length - 1 && f >= TOD_KEYS[i][0]) i++;
  const [fa, a] = TOD_KEYS[i - 1], [fb, b] = TOD_KEYS[i];
  const t = easeInOut(prog(f, fa, fb));
  const A = TOD[a], Bk = TOD[b];
  const col = (x, y) => { const ca = [(x >> 16) & 255, (x >> 8) & 255, x & 255], cb = [(y >> 16) & 255, (y >> 8) & 255, y & 255]; const c = ca.map((v, k) => Math.round(lerp(v, cb[k], t))); return (c[0] << 16) | (c[1] << 8) | c[2]; };
  return {
    night: lerp(A.night, Bk.night, t), dawn: lerp(A.dawn, Bk.dawn, t), sunDir: lerp3(A.sunDir, Bk.sunDir, t),
    sunI: lerp(A.sunI, Bk.sunI, t), sunColor: col(A.sunColor, Bk.sunColor), skyI: lerp(A.skyI, Bk.skyI, t),
    skyColor: col(A.skyColor, Bk.skyColor), groundColor: col(A.groundColor, Bk.groundColor), fog: lerp3(A.fog, Bk.fog, t),
  };
}

// --- geometry of the action ----------------------------------------------------------------------
const HIP = BODY.hipY;  // the realistic soldiers (soldier.js): prone bodies pivot at the hip
const LIE = 0.12;       // ... and lie with the hips this high off the mud
const Z1 = 1.1;                                   // the L1 observer's lane (camera side of the horse)
const L1_FROM = OUR_X + 1.6, L1_TO = -3.2;        // over the parapet to his spot
const BACK_TO = OUR_X + 2.0;
const ART = [-1.3, 1.25];                        // the artist sits by the horse's rump (x, z)
const OFFICER = [ENEMY_X - 0.15, 0.05, -1.2];     // the enemy officer on his fire step, head over the parapet
const IN_X = -0.35, IN_Z = -0.08;                 // the observer inside the copy
const SNIPER_AT = [ENEMY_X - 1.05, 0.62, 0.4];

// Lying flat on the belly (the rig's crawl/prone poses, laid face down like lying({on:"front"})).
const flatOn = (x, z, { pose = "prone", face = FACE_RIGHT, expression, speed, lift = 0, scale = 1 } = {}) => ({
  pose, position: [x, gy(x, z) + LIE * scale - HIP + lift, z], yaw: face, tilt: face === FACE_RIGHT ? -Math.PI / 2 : Math.PI / 2, pivot: HIP,
  expression, speed,
});
const stand = (x, z, pose, yaw, expression, extra = {}) => ({ pose, position: [x, x > WS[0] - 20 ? 0 : gy(x, z), z], yaw, expression, ...extra });

// L1 observer: crawl out, lie flat, twitch, the ping, scramble back
function observer(f) {
  if (inSpan(f, "l1")) {
    if (f < B.crawl) return flatOn(L1_FROM, Z1, { expression: "focus" });
    if (f < B.flat + 4) {
      const t = prog(f, B.crawl, B.flat + 4);
      return flatOn(lerp(L1_FROM, L1_TO, easeInOut(t)), Z1, { pose: "crawl", expression: "focus", speed: 1.2 });
    }
    if (f < B.twitch) return flatOn(L1_TO, Z1, { expression: f >= B.moves ? "scared" : "focus" });
    if (f < B.twitch + 10) return flatOn(L1_TO + 0.03 * Math.sin((f - B.twitch) * 1.3), Z1, { pose: "crawl", expression: "neutral", speed: 2.5 }); // the itch
    if (f < B.ping) return flatOn(L1_TO, Z1, { expression: f >= B.sniper ? "shock" : "neutral" });
    if (f < B.ping + 14) return flatOn(L1_TO, Z1, { expression: "scared", lift: -0.02 });
    const t = prog(f, B.ping + 14, SPAN.l1[1] - 4);
    return flatOn(lerp(L1_TO, BACK_TO, easeIn(t)), Z1, { pose: "crawl", face: FACE_LEFT, expression: "scared", speed: 3 });
  }
  // L5-L6: inside the copy, on his belly with the rifle (cutaway) / at the phone
  if (f >= SPAN.l5[0]) {
    const smug = f >= B.call - 2 && f < B.hits6[0] + 30;
    return flatOn(IN_X, IN_Z, { expression: f >= B.hits6[0] + 8 ? "happy" : smug ? "smug" : "focus" });
  }
  return null;
}

// L2 digger: spade in the shell hole, sandbags, the shell; pops up dazed
const DIG_SPOT = [DIG.x + 0.1, DIG.z - 0.2];
function digger(f) {
  if (inSpan(f, "l2")) {
    const y = heightAt(DIG_SPOT[0], DIG_SPOT[1], digAmount(f));
    const at = (pose, yaw, expression, extra = {}) => ({ pose, position: [DIG_SPOT[0], y, DIG_SPOT[1]], yaw, expression, ...extra });
    if (f < B.dig) return at("idle", FACE_RIGHT - 0.4, "focus");
    if (f < B.pile) return at(Math.floor((f - B.dig) / 7) % 2 ? "smash" : "windup", FACE_RIGHT - 0.5, "focus", { blend: 3 });
    if (f < B.edge + 14) return at(Math.floor((f - B.pile) / 9) % 2 ? "carry" : "idle", FACE_CAMERA + Math.sin(f * 0.12) * 1.2, "focus");
    if (f < B.fresh) return at("idle", FACE_RIGHT - 0.2, "smug");
    if (f < B.shell2) return at("cheer", FACE_CAMERA + 0.3, "happy");
    if (f < B.blast2 - 6) return at("idle", FACE_RIGHT - 0.3, "shock");
    if (f < B.blast2 + 10) return at("cower", FACE_CAMERA, "scared");
    // blasted flat, then sits up out of the smoke, dazed
    if (f < B.blast2 + 30) return { ...flatOn(DIG_SPOT[0] - 0.6, DIG_SPOT[1], { face: FACE_LEFT, expression: "dazed" }), pose: "sprawl", tilt: -Math.PI / 2 };
    return { pose: "sit", position: [DIG_SPOT[0] - 0.4, y, DIG_SPOT[1] + 0.2], yaw: FACE_CAMERA + 0.3, expression: "dazed" };
  }
  // L4b-L4c: night crew (with tommyC): rope drag, then carry the copy out
  return crew(f, 0);
}
function crew(f, k) {
  if (!inSpan(f, "l4b")) return null;
  const z = 0.9 + k * 0.5;
  const lead = 2.3 + k * 0.6;
  const hx = realX(f);
  if (f < B.drags - 26) { // crawl out to the horse
    const t = prog(f, B.rewind + 6, B.drags - 26);
    return flatOn(lerp(OUR_X + 2 + k * 0.4, 1.4 - k * 0.5, easeInOut(t)), z, { pose: "crawl", expression: "focus", speed: 1.4 });
  }
  if (f < B.drags) return stand(hx + lead - 0.4 * prog(f, B.drags - 26, B.drags), z, "cower", FACE_LEFT, "focus"); // crouch, take the rope
  if (f < B.dragEnd) return stand(hx - lead + 0.2, z, "walk", FACE_LEFT, "focus", { speed: 0.8 }); // hauling backwards... towards our trench
  if (f < lineStart("l4c") - 2) return stand(OUR_X + 1.6 + k * 0.5, z, "idle", FACE_RIGHT, "happy");
  // L4c: carry the copy out to the spot, set it down, crawl away before dawn
  const cx = copyCarryX(f);
  const end = k === 0 ? cx + 1.75 : cx - 1.5;
  if (f < B.layDown[1]) return stand(end, 0.75, "carry", FACE_RIGHT, "focus", { speed: 1 });
  if (f < B.legs + 6) return stand(end, 0.75, "idle", FACE_CAMERA + (k ? 0.5 : -0.5), "smug");
  const t = prog(f, B.legs + 6, SPAN.l4b[1] - 4);
  return flatOn(lerp(end, end - 4.5, easeIn(t)), 0.75 + k * 0.4, { pose: "crawl", face: FACE_LEFT, expression: "happy", speed: 2.4 });
}

// L3b artist: crawls out at night, sits by the horse, holds his nose, sketches. L3c: paints.
function artist(f) {
  if (inSpan(f, "l3b")) {
    if (f < B.holds - 6) {
      const t = prog(f, SPAN.l3b[0], B.holds - 6);
      return flatOn(lerp(ART[0] - 3.4, ART[0] - 0.2, easeInOut(t)), ART[1], { pose: "crawl", expression: "focus", speed: 1.3 });
    }
    const nose = f < B.sketches;
    return { pose: "sit", hands: nose ? "nose" : undefined, position: [ART[0], gy(ART[0], ART[1]), ART[1]], yaw: FACE_CAMERA + 0.7, expression: nose ? "pain" : "focus", blend: 5 };
  }
  if (inSpan(f, "ws")) {
    const x = WS[0] + (f < B.paint ? -2.1 : 1.0), z = f < B.paint ? -0.6 : 0.95;
    if (f >= B.match + 8) return stand(x, z, "point", FACE_CAMERA - 0.3, "smug");
    return stand(x, z, f < B.paint ? "point" : "cast", f < B.paint ? FACE_RIGHT - 0.2 : FACE_LEFT + 0.4, f < B.paint ? "focus" : "happy");
  }
  return null;
}
const builder = (f) => {
  if (inSpan(f, "ws")) {
    const x = WS[0] - 0.4, z = 0.95;
    if (f < B.build) return stand(x, z, "idle", FACE_CAMERA, "neutral");
    if (f < B.paint) return stand(x, z, Math.floor((f - B.build) / 6) % 2 ? "smash" : "windup", -0.6, "focus", { blend: 3 });
    return stand(x - 1.2, z + 0.2, f >= B.match + 6 ? "cheer" : "idle", FACE_CAMERA + 0.3, "happy");
  }
  return crew(f, 1);
};

// the enemy officer: binoculars over the parapet, shrugs, ducks our shells
function officer(f) {
  const show = (f >= B.enemy2 - 6 && f < SPAN.l2[1]) || inSpan(f, "l3a") || inSpan(f, "l4a") || f >= SPAN.l6[0];
  if (!show && !(f >= B.sniper - 6 && f < B.ping + 20)) return null;
  const pos = [OFFICER[0], OFFICER[1], OFFICER[2]];
  if (f >= B.hits6[0] - 2) return { pose: "cower", position: pos, yaw: FACE_LEFT + 0.6, expression: "scared" };
  if (f >= B.ignored && f < SPAN.l6[1]) return { pose: "idle", position: pos, yaw: FACE_CAMERA + 0.9, expression: "neutral" }; // bored, turns away
  if (f >= B.sniper - 6 && f < B.ping + 20) return { pose: "cast", position: [SNIPER_AT[0] + 0.55, -0.7, SNIPER_AT[2]], yaw: FACE_LEFT, expression: "smug" }; // the sniper, crouched behind his loophole
  return { pose: "cast", hands: "binoculars", position: pos, yaw: FACE_LEFT, expression: f >= B.two && f < B.shell4 ? "smug" : "focus" };
}

export const TRACKS = [
  { id: "observer", classType: "tommy", track: observer },
  { id: "digger", classType: "tommyB", track: digger },
  { id: "builder", classType: "tommyC", track: builder },
  { id: "artist", classType: "artist", track: artist },
  { id: "officer", classType: "enemyOfficer", track: officer },
];

// --- props -------------------------------------------------------------------------------------
const digAmount = (f) => (f < B.dig ? 0 : easeInOut(prog(f, B.dig, B.deeper + 18)));
const realX = (f) => (f < B.drags ? 0 : lerp(0, OUR_X + 1.3, easeInOut(prog(f, B.drags, B.dragEnd))));
const copyCarryX = (f) => lerp(OUR_X + 3.2, 0, easeInOut(prog(f, lineStart("l4c") - 2, B.lay)));
const settle = (f, at, k = 0.05) => (f >= at && f < at + 10 ? -k * Math.sin(Math.PI * (f - at) / 10) : 0);

function realHorse(f) {
  if (inSpan(f, "ws") || f >= SPAN.l5[0]) return null;
  if (inSpan(f, "l4b") && f >= B.dragEnd + 8) return null; // gone into the trench
  const x = realX(f);
  const drop = f >= B.trench4 ? -1.1 * easeIn(prog(f, B.trench4, B.dragEnd)) : 0;
  const wob = f >= B.drags && f < B.dragEnd ? Math.sin(f * 0.5) * 0.03 : 0;
  return { pos: [x, gy(x, 0) - 0.04 + drop, 0], rot: [wob, 0, f >= B.trench4 ? 0.3 * prog(f, B.trench4, B.dragEnd) : 0] };
}
function copyHorse(f) {
  if (inSpan(f, "ws")) return { pos: [WS[0], 0.33, 0] };
  if (inSpan(f, "l4a")) return { pos: [BESIDE[0], gy(BESIDE[0], BESIDE[2]) - 0.04, BESIDE[2]], rot: [0, -0.35, 0] };
  if (inSpan(f, "l4b") && f >= lineStart("l4c") - 2) {
    const x = copyCarryX(f);
    const y = f < B.layDown[0] ? 0.6 + Math.sin(f * 0.4) * 0.02 : lerp(0.6, gy(0, 0) - 0.04, easeIn(prog(f, ...B.layDown)));
    return { pos: [x, y + settle(f, B.layDown[1], 0.04), 0] };
  }
  if (f >= SPAN.l5[0]) return { pos: [0, gy(0, 0) - 0.04, 0] };
  return null;
}

const RING_AT = (i) => lerp(B.pile, B.edge + 10, i / (RING.length - 1));
function ringBags(f) {
  if (!inSpan(f, "l2") || f < B.pile || f >= B.blast2) return [];
  return RING.filter((_, i) => f >= RING_AT(i)).map((m, i) => {
    const t = prog(f, RING_AT(i), RING_AT(i) + 6);
    const out = m.clone();
    out.elements[13] += 0.35 * (1 - easeOutBack(t, 1.4));
    return out;
  });
}

const CUT_SHOTS = [];
const blastLight = (f, at, pos, k = 70) => (f >= at && f < at + 24 ? { pos, i: k * Math.exp(-(f - at) / 5) } : null);
const NIGHT_FLASHES = Array.from({ length: 14 }, (_, i) => Math.round(lerp(SPAN.l4b[0] + 8, B.dragEnd + 10, i / 13) + ((i * 37) % 9)));

export function propsAt(f) {
  const t = tod(f);
  const cut = CUT_SHOTS.some(([a, b]) => f >= a && f < b);
  // far gun flashes over the horizon on the swap night
  let flash = 0;
  if (inSpan(f, "l4b") && f < B.legs) for (const at of NIGHT_FLASHES) if (f >= at && f < at + 8) flash = Math.max(flash, Math.exp(-(f - at) / 2.5));
  const ws = inSpan(f, "ws");
  const blasts = [
    blastLight(f, B.blast2, [DIG.x, 1.2, DIG.z]) ?? blastLight(f, B.blast4a, [0, 1.2, 0]) ?? blastLight(f, B.hits6[0], [ENEMY_X + 2.5, 1.5, -2]) ?? blastLight(f, B.hits6[2], [ENEMY_X + 3, 1.5, -5]),
    blastLight(f, B.blast4b, [BESIDE[0], 1.2, BESIDE[2]]) ?? blastLight(f, B.hits6[1], [ENEMY_X + 1.8, 1.5, 1]) ?? (inSpan(f, "l4b") && flash > 0.05 ? { pos: [40, 6, -30], i: 600 * flash } : null),
  ];
  const frameN = ws ? Math.floor(lerp(0, 13.99, prog(f, B.build - 4, B.hollow + 14))) : 0;
  const reveal = ws ? WS[0] - 1.75 + 4.4 * easeInOut(prog(f, B.copy3, B.papier + 10)) : 1e5;
  const L4 = inSpan(f, "l4b");
  // rope from the horse's hind leg to the two haulers' hands
  const rx = realX(f);
  const rope = L4 && f >= B.drags - 12 && f < B.dragEnd ? [[rx - 0.7, 1.2, 0.2], [rx - 2.3 + 0.2, 1.05, 0.9]] : null;
  const rope2 = L4 && f >= B.drags - 12 && f < B.dragEnd ? [[rx - 0.8, 1.2, -0.2], [rx - 2.9 + 0.2, 1.05, 1.4]] : null;
  return {
    ...t,
    flash,
    paint: ws ? easeInOut(prog(f, B.paint, B.match + 8)) : 1,
    sunTarget: ws ? [WS[0], 0, 0] : [0, 0, 0],
    dig: inSpan(f, "l1") ? 0 : f < SPAN.l2[1] ? digAmount(f) : 1,
    ring: ringBags(f),
    real: realHorse(f),
    copy: copyHorse(f),
    frame: ws && f < B.paint ? { pos: [WS[0], 0.33, 0] } : cut ? { pos: [0, gy(0, 0) - 0.04, 0] } : null,
    frameN: cut ? 13 : frameN,
    reveal,
    slit: f >= SPAN.l5[0] ? (f < B.slit ? 0 : easeOutBack(prog(f, B.slit, B.slit + 8))) : 0,
    cut,
    workshop: ws,
    others: !ws,
    props: {
      rifle: f >= B.rifle - 4 && f >= SPAN.l5[0] ? { pos: [IN_X + 0.95, gy(0, 0) + 0.24, IN_Z - 0.12], rot: [0, 0, 0.1] } : null,
      phone: f >= B.telephone && f >= SPAN.l5[0] ? { pos: [IN_X + 0.5, gy(0, 0) + 0.08, IN_Z + 0.32] } : null,
      spade: inSpan(f, "l2") && (f < B.dig || f >= B.pile) && f < B.blast2 ? { pos: [DIG.x + 1.1, gy(DIG.x + 1.1, DIG.z), DIG.z + 0.6], rot: [0.2, 0, -0.3] } : null,
      book: inSpan(f, "l3b") && f >= B.sketches ? { pos: [ART[0] + 0.42, gy(ART[0], ART[1]) + 0.45, ART[1] + 0.35], rot: [0.6, 0.7, 0] } : null,
    },
    rope: rope ? [rope[0], rope[1]] : null,
    rope2: rope2 ? [rope2[0], rope2[1]] : null,
    wire: f >= SPAN.l5[0] ? easeInOut(prog(f, B.telephone, B.trench5 + 10)) : 0,
    blasts,
    lantern: ws ? 9 : 0,
    lanternPos: [WS[0] + 0.6, 2.7, 1.0],
    fill: cut ? 2.2 : t.night > 0.5 ? 10 : ws ? 1.6 : 0,
    flare: t.night,
  };
}

// --- camera --------------------------------------------------------------------------------------
// Each shot is a slow move from a to b over [start, end); consecutive shots cut. `cut` shots show
// the copy's cutaway. `mask` puts the HUD's binocular or slit mask over it.
const shot = (start, end, a, b, opts = {}) => ({ start, end, a, b: b ?? a, ...opts });
const v = (pos, look, fov = 40) => ({ pos, look, fov });
const EYE = [ENEMY_X - 1.7, 1.75, OFFICER[2]]; // the officer's binoculars
const binoc = (target, fov = 9) => v(EYE, target, fov);
const SLIT_EYE = [1.75, gy(0, 0) + 0.82, 0.0];
const SHOTS = [
  // L1: the field from behind our trench; the crawl; the twitch; the sniper; the ping
  shot(0, B.crawl - 4, v([-17, 5.2, 10], [1.5, 0.6, -4]), v([-15.5, 4.4, 8.6], [1.5, 0.5, -4])),
  shot(B.crawl - 4, B.land + 14, v([L1_FROM + 1.2, 1.5, 6.4], [L1_FROM + 1.4, 0.1, Z1 - 1]), v([-6.2, 1.4, 6.2], [-6.0, 0.1, Z1 - 1])),
  shot(B.land + 14, B.moves - 4, v([-1.2, 1.1, 5.6], [L1_TO, 0.15, Z1]), v([-1.4, 1.0, 5.0], [L1_TO, 0.15, Z1])),
  shot(B.moves - 4, B.twitch - 2, v([L1_TO - 2.2, 1.35, Z1 + 0.5], [ENEMY_X - 1, 0.9, -0.2], 20), v([L1_TO - 2.2, 1.35, Z1 + 0.5], [ENEMY_X - 1, 0.9, -0.2], 15)),
  shot(B.twitch - 2, B.sniper - 2, v([L1_TO + 1.9, 0.75, Z1 + 1.7], [L1_TO + 0.8, 0.3, Z1]), v([L1_TO + 1.7, 0.7, Z1 + 1.5], [L1_TO + 0.8, 0.3, Z1]), { crash: [B.twitch + 2, B.sniper - 2, [L1_TO + 0.95, 0.32, Z1], 1.3] }),
  shot(B.sniper - 2, B.ping, v([L1_TO + 0.5, 0.8, Z1 + 0.3], [SNIPER_AT[0] + 0.3, SNIPER_AT[1] + 0.25, SNIPER_AT[2]], 7)),
  shot(B.ping, SPAN.l1[1], v([L1_TO + 2.6, 0.95, Z1 + 2.4], [L1_TO + 0.6, 0.35, Z1]), v([L1_TO + 1.0, 1.6, Z1 + 4.6], [L1_TO - 1.4, 0.3, Z1])),
  // L2: the dig, the sandbags; the officer maps it; morning; the shell
  shot(SPAN.l2[0], B.pile - 4, v([DIG.x + 2.6, 2.2, DIG.z + 3.8], [DIG.x, 0.1, DIG.z]), v([DIG.x + 2.2, 1.9, DIG.z + 3.3], [DIG.x, 0.0, DIG.z])),
  shot(B.pile - 4, B.enemy2 - 2, v([DIG.x - 1.8, 3.4, DIG.z + 4.6], [DIG.x, 0.2, DIG.z]), v([DIG.x - 1.2, 3.0, DIG.z + 4.0], [DIG.x, 0.2, DIG.z])),
  shot(B.enemy2 - 2, B.crater + 4, v([OFFICER[0] - 3.4, 2.2, OFFICER[2] + 2.6], [OFFICER[0], 1.3, OFFICER[2]]), v([OFFICER[0] - 3.0, 2.05, OFFICER[2] + 2.3], [OFFICER[0], 1.3, OFFICER[2]])),
  shot(B.crater + 4, B.shell2 - 2, binoc([DIG.x, 0.35, DIG.z], 7), binoc([DIG.x, 0.3, DIG.z], 6), { mask: "binoc", mark: true }),
  shot(B.shell2 - 2, SPAN.l2[1], v([DIG.x + 3.2, 2.4, DIG.z + 5.2], [DIG.x, 0.4, DIG.z]), v([DIG.x + 2.9, 2.2, DIG.z + 4.6], [DIG.x - 0.3, 0.3, DIG.z])),
  // L3a: the binoculars sweep past the horses; the field is full of them
  shot(SPAN.l3a[0], B.hundreds - 4, binoc([-6, 0.4, -6], 11), binoc([0.5, 0.5, 0], 11), { mask: "binoc" }),
  shot(B.hundreds - 4, SPAN.l3a[1], v([-14, 7.5, 8], [0, 0, -14]), v([-13, 6.6, 6], [0, 0, -14])),
  // L3b: night; the artist crawls out, holds his nose, sketches
  shot(SPAN.l3b[0], B.holds - 8, v([ART[0] - 3.2, 1.6, ART[1] + 4.6], [ART[0] - 1.6, 0.3, 0]), v([ART[0] - 1.2, 1.5, ART[1] + 4.0], [ART[0], 0.4, 0])),
  shot(B.holds - 8, B.sketches - 2, v([ART[0] + 0.9, 1.3, ART[1] + 2.3], [ART[0], 0.75, ART[1]]), v([ART[0] + 0.8, 1.25, ART[1] + 2.0], [ART[0], 0.75, ART[1]])),
  shot(B.sketches - 2, SPAN.l3b[1], v([0.6, 2.4, 5.4], [0.2, 0.6, 0]), v([0.5, 2.2, 4.8], [0.2, 0.6, 0]), { mask: "sketch" }),
  // L3c: the workshop: frame, papier-mache skin, paint
  shot(SPAN.ws[0], B.copy3 - 2, v([WS[0] + 1.2, 2.6, 6.4], [WS[0] - 0.4, 1.0, 0]), v([WS[0] + 0.9, 2.4, 5.6], [WS[0] - 0.4, 1.0, 0])),
  shot(B.copy3 - 2, B.paint - 2, v([WS[0] + 2.6, 1.9, 4.2], [WS[0], 0.8, 0]), v([WS[0] + 2.2, 1.8, 3.7], [WS[0], 0.8, 0])),
  shot(B.paint - 2, SPAN.ws[1], v([WS[0] - 1.0, 1.9, 4.6], [WS[0] + 0.1, 0.9, 0]), v([WS[0] - 0.8, 1.8, 4.0], [WS[0] + 0.1, 0.9, 0])),
  // L4a: two horses at sunrise; Don't; the binoculars count two; both shelled
  shot(SPAN.l4a[0], B.two - 2, v([-3.4, 2.4, 6.6], [1.2, 0.6, -0.6]), v([-3.0, 2.2, 6.0], [1.2, 0.6, -0.6])),
  shot(B.two - 2, B.shell4 - 2, binoc([1.3, 0.5, -0.7], 10), binoc([1.3, 0.5, -0.7], 9), { mask: "binoc", mark: 2 }),
  shot(B.shell4 - 2, SPAN.l4a[1], v([-4.8, 3.2, 8.2], [1.2, 0.8, -0.6]), v([-4.4, 3.0, 7.6], [1.2, 0.8, -0.6])),
  // L4b: the swap night: guns on the horizon; the drag to our trench
  shot(SPAN.l4b[0], B.noise - 4, v([-6.5, 1.6, 6.4], [-1.5, 0.4, 0]), v([-5.5, 1.5, 6.0], [-0.5, 0.4, 0])),
  shot(B.noise - 4, B.drags - 4, v([-9.5, 3.4, 3.5], [6, 2.2, -6], 34), v([-9.2, 3.2, 3.2], [6, 2.0, -6], 34)),
  shot(B.drags - 4, B.dragEnd + 4, v([2.2, 1.8, 6.2], [-0.6, 0.5, 0]), v([OUR_X + 6.2, 1.9, 6.0], [OUR_X + 2.0, 0.2, 0])),
  // L4c: carry the copy out, lay it down, legs in the air, crawl away before dawn
  shot(lineStart("l4c") - 2, B.layDown[1] + 2, v([OUR_X + 6.5, 1.8, 6.8], [OUR_X + 4, 0.7, 0.3]), v([2.6, 1.8, 6.2], [0, 0.7, 0.3])),
  shot(B.layDown[1] + 2, B.dawn - 4, v([1.4, 1.4, 4.2], [0.1, 0.9, 0]), v([1.2, 1.35, 3.8], [0.1, 0.9, 0])),
  shot(B.dawn - 4, SPAN.l4b[1], v([-2.6, 2.6, 7.4], [-1.5, 0.4, 0]), v([-3.4, 3.2, 8.6], [-2, 0.4, 0])),
  // L5: the cutaway: one man, on his belly, with a rifle; the slit; the wire home
  shot(SPAN.l5[0], B.lying - 4, v([0.3, 1.5, 6.8], [0.1, 0.55, 0]), v([0.25, 1.4, 6.0], [0.1, 0.55, 0]), { cut: true }),
  shot(B.lying - 4, lineStart("l5b") - 2, v([1.3, 1.0, 3.6], [0.35, 0.4, 0]), v([1.2, 0.95, 3.2], [0.35, 0.4, 0]), { cut: true }),
  shot(lineStart("l5b") - 2, B.slit + 10, v([2.6, 1.2, 1.8], [1.25, 0.6, 0]), v([2.4, 1.15, 1.6], [1.25, 0.6, 0])),
  shot(B.slit + 10, B.telephone - 2, v(SLIT_EYE, [ENEMY_X, 0.6, -1], 18), v(SLIT_EYE, [ENEMY_X, 0.6, -1], 15), { mask: "slit" }),
  shot(B.telephone - 2, SPAN.l5[1], v([0.2, 2.3, 4.6], [-2.2, 0.1, 0.2]), v([-6.2, 2.5, 5.0], [-9.8, -0.3, 0.6])),
  // L6a: sunrise: the officer sees the same old horse, turns away
  shot(SPAN.l6[0], B.same6 - 4, v([OFFICER[0] - 3.4, 2.2, OFFICER[2] + 2.6], [OFFICER[0], 1.3, OFFICER[2]]), v([OFFICER[0] - 3.0, 2.05, OFFICER[2] + 2.3], [OFFICER[0], 1.3, OFFICER[2]])),
  shot(B.same6 - 4, B.ignored + 2, binoc([0.2, 0.6, 0], 9), binoc([0.2, 0.6, 0], 8), { mask: "binoc" }),
  shot(B.ignored + 2, lineStart("l6b") - 4, v([OFFICER[0] - 3.4, 2.2, OFFICER[2] + 2.6], [OFFICER[0], 1.3, OFFICER[2]]), v([OFFICER[0] - 3.0, 2.05, OFFICER[2] + 2.3], [OFFICER[0], 1.3, OFFICER[2]])),
  // L6b: inside, the call; our shells land on the enemy line
  shot(lineStart("l6b") - 4, B.every6 - 2, v([1.3, 1.0, 3.6], [0.35, 0.4, 0]), v([1.2, 0.95, 3.2], [0.35, 0.4, 0]), { cut: true }),
  shot(B.every6 - 2, lineStart("end") - 4, v([ENEMY_X - 7, 3.0, 6.5], [ENEMY_X + 0.5, 0.6, -1.5]), v([ENEMY_X - 6.4, 2.8, 6.0], [ENEMY_X + 0.5, 0.6, -1.5])),
  // end: pull back over the field, the spy horse in the middle
  shot(lineStart("end") - 4, FRAMES, v([2.6, 1.6, 6.6], [0.2, 0.7, 0]), v([5.5, 4.6, 14.5], [0.6, 0.8, -1])),
];
for (const s of SHOTS) if (s.cut) CUT_SHOTS.push([s.start, s.end]);

const SHAKES = [
  { at: B.ping, strength: 0.12 },
  { at: B.blast2, strength: 0.4 },
  { at: B.blast4a, strength: 0.35 },
  { at: B.blast4b, strength: 0.35 },
  { at: B.layDown[1], strength: 0.06 },
  ...B.hits6.map((at) => ({ at, strength: 0.22 })),
  { at: B.stamp, strength: 0.14 },
];
function shake(f) {
  let x = 0, y = 0;
  for (const s of SHAKES) {
    const d = f - s.at;
    if (d < 0 || d > 16) continue;
    const e = s.strength * Math.exp(-d / 4);
    x += e * 0.12 * Math.sin(d * 2.3);
    y += e * 0.12 * (Math.cos(d * 1.9) - (d < 2 ? 1 : 0));
  }
  return [x, y];
}
export function shotAt(f) {
  return SHOTS.find((k) => f >= k.start && f < k.end) ?? SHOTS[SHOTS.length - 1];
}
function camAt(f) {
  const s = shotAt(f);
  const t = easeInOut(prog(f, s.start, s.end));
  let pos = lerp3(s.a.pos, s.b.pos, t), look = lerp3(s.a.look, s.b.look, t), fov = lerp(s.a.fov, s.b.fov, t);
  if (s.crash && f >= s.crash[0] && f < s.crash[1]) {
    const target = s.crash[2], d = s.crash[3];
    const dir = pos.map((p, i) => p - target[i]), len = Math.hypot(...dir);
    pos = target.map((p, i) => p + (dir[i] / len) * d);
    look = target;
    fov = lerp(40, 30, easeOutCubic(prog(f, s.crash[0], s.crash[0] + 5)));
  }
  const [sx, sy] = shake(f);
  const k = s.mask === "binoc" ? 0.15 : 1; // long lenses: a smaller shake
  return { pos: [pos[0] + sx * k, pos[1] + sy * k, pos[2]], look, fov };
}
const still = (pos, look, fov) => () => ({ pos, look, fov });
const P = new URLSearchParams(globalThis.location?.search ?? "");
const num3 = (k) => P.get(k)?.split(",").map(Number);
export const CAMS = {
  main: camAt,
  // ?cam=dbg&pos=x,y,z&look=x,y,z&fov=n: a fixed debug lens
  dbg: () => ({ pos: num3("pos") ?? [3, 1.5, 5], look: num3("look") ?? [0, 0.5, 0], fov: Number(P.get("fov") ?? 40) }),
  // Thumbnail plates, filmed with ?clean=1 (see out/shelter/spy-horse/thumbnails/render-thumbs.sh):
  // thumb1 at 2575, thumb2 at 2100; the third is the main cam at 1556 (both horses shelled)
  thumb1: still([-1.2, 2.6, 6.8], [0.3, 0.35, -1.5], 40), // the cutaway copy in a field of dead horses
  thumb2: still([1.9, 1.5, 2.9], [0.2, 0.45, 0.2], 36),   // the man inside, close
};

// --- HUD ---------------------------------------------------------------------------------------------
export const STAGES = [
  { at: Math.max(84, lineStart("l1a")), n: 1, name: "LIE FLAT", color: "#bfe6ff" },
  { at: lineStart("l2a"), n: 2, name: "SANDBAGGED CRATER", color: "#ffd84d" },
  { at: lineStart("l3a"), n: 3, name: "FAKE DEAD HORSE", color: "#d9a066" },
  { at: lineStart("l4a"), n: 4, name: "THE SWAP", color: "#8fb4ff" },
  { at: lineStart("l5a"), n: 5, name: "SNIPER INSIDE", color: "#7fe0c2" },
  { at: lineStart("l6a"), n: 6, name: "SAME OLD HORSE", color: "#ff8a6b" },
];

const chunks = [];
for (const id of LINES) {
  const words = cues.lines[id].words;
  for (let i = 0; i < words.length; ) {
    let n = Math.min(5, words.length - i);
    if (words.length - i - n === 1) n = 4;
    chunks.push({ words: words.slice(i, i + n), end: (words[i + n] ?? { startFrame: cues.lines[id].endFrame + 8 }).startFrame });
    i += n;
  }
}
export function hudAt(f) {
  const c = chunks.find((k) => f >= k.words[0].startFrame && f < k.end);
  const stage = [...STAGES].reverse().find((s) => f >= s.at);
  const s = shotAt(f);
  return {
    title: f < 82,
    titleFrame: f,
    stage: stage ? { ...stage, pop: f - stage.at } : null,
    caption: c ? c.words.map((x) => ({ word: x.word, on: f >= x.startFrame })) : null,
    mask: s.mask === "binoc" || s.mask === "slit" ? s.mask : null,
    mark: s.mark ? { n: s.mark === 2 ? 2 : 1, age: f - s.start } : null,
    sketch: s.mask === "sketch" ? { t: prog(f, B.sketches, B.shadow + 10), age: f - s.start } : null,
    noX: f >= B.dont && f < B.dont + 28 ? f - B.dont : null,
    rewind: f >= B.rewind - 2 && f < B.rewind + 10 ? f - (B.rewind - 2) : null,
    end: f >= B.stamp ? { age: f - B.stamp } : null,
  };
}

// --- sound -------------------------------------------------------------------------------------------
const SPADE = Array.from({ length: Math.floor((B.pile - B.dig) / 14) }, (_, i) => B.dig + 7 + i * 14);
const HAMMER = Array.from({ length: Math.floor((B.paint - B.build) / 12) }, (_, i) => B.build + 6 + i * 12);
export const SFX = [
  ["stamp", 6, 0.4],
  ...STAGES.map((s) => ["pop", s.at, 0.2]),
  ["wind", 0, 0.08, SPAN.l3b[0]],
  ["guns", 0, 0.12, SPAN.l3b[0]],
  ["flies", SPAN.l3a[0], 0.06, SPAN.l3a[1] - SPAN.l3a[0]],
  // L1
  ["drag", B.crawl, 0.25],
  ["drag", B.crawl + 40, 0.22],
  ["drag", B.twitch, 0.2],
  ["glint", B.sniper - 2, 0.35],
  ["rifle", B.muzzle, 0.55],
  ["ricochet", B.ping, 0.5],
  ["clank", B.ping, 0.3],
  ["drag", B.ping + 16, 0.3],
  // L2
  ...SPADE.map((at) => ["shovel", at, 0.4]),
  ...RING.map((_, i) => ["crunch", Math.round(RING_AT(i)) + 5, 0.16]).filter((_, i) => i % 2 === 0),
  ["glint", B.crater + 4, 0.25],
  ["pencil", B.crater + 10, 0.3],
  ["whoosh", B.blast2 - 16, 0.35],
  ["artillery", B.blast2, 0.8],
  ["thud", B.blast2 + 6, 0.35],
  // L3
  ["flies", SPAN.l3b[0], 0.07, SPAN.l3b[1] - SPAN.l3b[0]],
  ["wind", SPAN.l3b[0], 0.06, SPAN.l3b[1] - SPAN.l3b[0]],
  ["drag", SPAN.l3b[0] + 10, 0.2],
  ["drag", SPAN.l3b[0] + 50, 0.2],
  ["pencil", B.sketches, 0.35],
  ["pencil", B.fold, 0.35],
  ["pencil", B.shadow - 6, 0.3],
  ...HAMMER.map((at) => ["thud", at, 0.28]),
  ["saw", B.build + 30, 0.25],
  ["squelch", B.copy3 + 4, 0.25],
  ["squelch", B.papier, 0.22],
  ["sparkle", B.match + 6, 0.25],
  // L4a
  ["wind", SPAN.l4a[0], 0.07, SPAN.l4a[1] - SPAN.l4a[0]],
  ["slam", B.dont, 0.4],
  ["glint", B.two, 0.25],
  ["whoosh", B.blast4a - 14, 0.3],
  ["artillery", B.blast4a, 0.75],
  ["artillery", B.blast4b, 0.8],
  ["whoosh_big", B.rewind, 0.4],
  // L4b/c
  ["guns", SPAN.l4b[0], 0.35, B.legs - SPAN.l4b[0]],
  ["wind", SPAN.l4b[0], 0.06, SPAN.l4b[1] - SPAN.l4b[0]],
  ["drag", B.drags, 0.45],
  ["drag", B.drags + 45, 0.45],
  ["thud", B.trench4 + 4, 0.45],
  ["thud", B.layDown[1], 0.35],
  ["drag", B.legs + 8, 0.22],
  // L5
  ["wind", SPAN.l5[0], 0.05, FRAMES - SPAN.l5[0]],
  ["guns", SPAN.l5[0], 0.06, FRAMES - SPAN.l5[0]],
  ["clank", B.rifle, 0.25],
  ["click", B.slit, 0.4],
  ["ring", B.telephone + 4, 0.3],
  // L6
  ["flies", SPAN.l6[0], 0.05, lineStart("l6b") - SPAN.l6[0]],
  ["ring", B.call - 6, 0.25],
  ...B.hits6.map((at) => ["artillery", at, 0.65]),
  ["stamp", B.stamp, 0.6],
  ["boom", B.stamp, 0.3],
].map(([name, at, vol, dur]) => ({ name, at, vol, dur }));

// --- bursts (fx.js) ------------------------------------------------------------------------------
const blast = (at, pos, big = 1, until = Infinity) => [
  { kind: "flash", at, pos: [pos[0], pos[1] + 0.5, pos[2]], n: 10, size: 0.6 * big },
  { kind: "spray", at, pos: [pos[0], pos[1] + 0.1, pos[2]], box: [0.4, 0.1, 0.4], dir: [0, 1.3, 0], n: 80, size: 1.2 * big, floor: pos[1] - 0.1 },
  { kind: "smoke", at, end: Math.min(at + 50, until), pos: [pos[0], pos[1] + 0.4, pos[2]], to: [pos[0] + 1.2, pos[1] + 4.5 * big, pos[2] - 0.5], box: [0.6, 0.2, 0.6], toBox: [1.5, 0.6, 1], n: 90, life: 2.4, opacity: 0.7, size: 2.0 * big },
  { kind: "dust", at, pos: [pos[0], pos[1] + 0.3, pos[2]], box: [0.6, 0.2, 0.6], n: 50, size: 1.6 * big },
];
export const BURSTS = [
  // flies over every carcass, all film long
  { kind: "flies", at: 0, end: FRAMES, pos: [0, 1.35, 0], box: [1.2, 0.35, 0.6], n: 9 },
  { kind: "flies", at: 0, end: FRAMES, pos: [8.4, 1.3, 2.6], box: [1.0, 0.3, 0.6], n: 6 },
  { kind: "flies", at: 0, end: FRAMES, pos: [-4.6, 1.3, -7.5], box: [1.0, 0.3, 0.6], n: 6 },
  // drifting battlefield smoke
  { kind: "haze", at: 0, end: FRAMES, pos: [2, 0.8, -12], to: [-6, 2.5, -12], box: [14, 0.6, 10], toBox: [14, 0.6, 10], n: 40, life: 12, opacity: 0.06, size: 5 },
  // L1
  { kind: "dust", at: B.crawl, pos: [L1_FROM + 0.5, 0.1, Z1], n: 10, size: 0.6 },
  { kind: "flash", at: B.sniper - 2, pos: [SNIPER_AT[0] - 0.3, SNIPER_AT[1] + 0.05, SNIPER_AT[2]], n: 2, size: 0.1 }, // scope glint
  { kind: "flash", at: B.muzzle, pos: SNIPER_AT, n: 6, size: 0.35 },
  { kind: "sparks", at: B.ping, pos: [L1_TO + 0.85, gy(L1_TO, Z1) + 0.42, Z1], n: 22 },
  { kind: "dust", at: B.ping, pos: [L1_TO + 1.3, 0.1, Z1 + 0.2], n: 14, size: 0.5 },
  // L2
  ...SPADE.map((at) => ({ kind: "spray", at, pos: [DIG.x + 0.5, 0.0, DIG.z], dir: [1.2, 1, 0.4], n: 18, size: 0.8, floor: 0.0 })),
  ...blast(B.blast2, [DIG.x, gy(DIG.x, DIG.z), DIG.z], 1.1),
  { kind: "sacks", at: B.blast2, pos: [DIG.x, 0.3, DIG.z], n: 18, size: 1 },
  // L4a
  ...blast(B.blast4a, [0, 0, 0], 1, B.rewind),
  ...blast(B.blast4b, [BESIDE[0], gy(BESIDE[0], BESIDE[2]), BESIDE[2]], 1, B.rewind),
  // L4b
  { kind: "dust", at: B.trench4 + 4, pos: [OUR_X + 1.2, -0.4, 0], n: 20, size: 1 },
  { kind: "dust", at: B.layDown[1], pos: [0, 0.1, 0], box: [1.2, 0.05, 0.4], n: 24, size: 0.8 },
  // L6b
  ...B.hits6.flatMap((at, i) => blast(at, [ENEMY_X + [2.5, 1.8, 3][i], gy(ENEMY_X + 2.5, -2), [-2, 1, -5][i]], 1.2)),
];
