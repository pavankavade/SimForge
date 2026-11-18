// "How a Snow Pile Becomes an Igloo": the whole short as pure functions of the frame (30 fps).
// Every beat is keyed to a spoken word (w(line, word)) like an episode timeline, so the picture
// stays locked to the voice (scripts/igloo-audio.py writes the cues).
//   l1  a heap of powder, hollowed out: the roof sags and caves in
//   l2  blocks of wind-packed snow in flat rings: they can't close, the top falls in
//   l3  one rising spiral, each block leaning on the last; the key block locks it
//   l4  the floor-level door lets the wind in: a sunken tunnel (cold trap) and a raised platform
//   l5  a campfire melts the roof (don't); an oil lamp glazes the walls with ice; a vent hole
//   l6  forty below outside, above freezing inside; furs, and a block to seal the tunnel
import * as THREE from "three/webgpu";
import cues from "./data/narrationCues.json";
import { CHAR_SCALE_VALUE } from "./castConsts.js";
import { SPIRAL, RINGS, KEY, inDoor, R0, H, TUNNEL, PLATFORM } from "./set.js";

export const FPS = 30;
export const LINES = ["l1a", "l1b", "l2a", "l2b", "l3a", "l3b", "l4a", "l4b", "l4c", "l5a", "l5b", "l5c", "l6a", "l6b", "end"];

// --- cues ------------------------------------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function w(line, word, nth = 0) {
  const hits = cues.lines[line].words.filter((x) => norm(x.word) === norm(word));
  if (!hits[nth]) throw new Error(`cue "${word}" not in ${line}`);
  return hits[nth].startFrame;
}
const lineStart = (id) => cues.lines[id].startFrame;

// --- helpers -----------------------------------------------------------------------------------
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const prog = (f, a, b) => clamp01((f - a) / (b - a));
const easeInOut = (t) => t * t * (3 - 2 * t);
const easeIn = (t) => t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

const FACE_CAMERA = 0, FACE_RIGHT = Math.PI / 2, FACE_LEFT = -Math.PI / 2, FACE_AWAY = Math.PI;

// --- beats -------------------------------------------------------------------------------------
export const B = {
  blizzard: w("l1a", "blizzard"),
  pile: w("l1a", "pile"),
  dig: w("l1a", "dig"),
  air: w("l1b", "air"),
  sags: w("l1b", "sags"),
  caves: w("l1b", "caves"),
  cut: w("l2a", "cut"),
  hard: w("l2a", "hard"),
  stack: w("l2a", "stack"),
  rings: w("l2a", "rings"),
  fine: w("l2b", "fine"),
  flat: w("l2b", "flat"),
  close: w("l2b", "close"),
  falls: w("l2b", "falls"),
  lay: w("l3a", "lay"),
  spiral: w("l3a", "spiral"),
  leaning: w("l3a", "leaning"),
  holds: w("l3b", "holds"),
  key: w("l3b", "key"),
  locks: w("l3b", "locks"),
  shut: w("l3b", "shut"),
  door: w("l4a", "door"),
  wind: w("l4a", "wind"),
  dig4: w("l4b", "dig"),
  tunnel: w("l4b", "tunnel"),
  lower: w("l4b", "lower"),
  sinks: w("l4b", "sinks"),
  raise: w("l4c", "raise"),
  platform: w("l4c", "platform"),
  warm: w("l4c", "warm"),
  cold5: w("l5a", "cold"),
  campfire: w("l5a", "campfire"),
  dont: w("l5a", "don't"),
  melts: w("l5a", "melts"),
  smoke: w("l5a", "smoke"),
  instead: w("l5b", "instead"),
  light: w("l5b", "light"),
  lamp: w("l5b", "lamp"),
  inside5: w("l5b", "inside"),
  freeze: w("l5b", "freeze"),
  glaze: w("l5b", "glaze"),
  seals: w("l5c", "seals"),
  hole: w("l5c", "hole"),
  fresh: w("l5c", "fresh"),
  outside: w("l6a", "outside"),
  forty: w("l6a", "forty"),
  inside6: w("l6a", "inside"),
  freezing: w("l6a", "freezing"),
  furs: w("l6b", "furs"),
  sleep: w("l6b", "sleep"),
  block6: w("l6b", "block"),
  seal: w("l6b", "seal"),
  congrats: w("end", "congratulations"),
};
B.heapUp = B.dig - 4;            // the heap reaches full size as he starts digging
B.hollowed = B.dig + 34;
B.collapse = B.caves + 6;        // the roof drops in (hard cut outside on "caves")
B.heads = B.caves + 14;          // three heads pop out of the slumped heap
B.blockUp = B.cut + 2;           // the first block lifts out of the drift
B.ringsDone = B.fine + 4;
B.leanIn = B.flat;
B.tip = B.falls - 14;            // the leaning courses tip in, landing on "falls"
B.spiralEnd = B.key - 10;
B.keyLand = B.locks;
B.dadOut = B.shut + 2;
B.trench = [B.dig4, B.tunnel + 4];
B.arch = [B.tunnel, B.lower + 14];
B.platUp = [B.raise, B.platform + 8];
B.fire = B.campfire + 4;
B.rewind = B.instead;
B.night = [lineStart("l6a") - 30, B.forty];
B.sealIn = [B.block6, B.seal];
B.stamp = B.congrats;
export const FRAMES = cues.durationFrames + 10;
export const NARRATION_END = FRAMES;

// --- geometry ----------------------------------------------------------------------------------
const Z_IN = -0.45;                // where the family sits inside (just behind the cut)
const PLAT_TOP = PLATFORM.top;
const LAMP_POS = [0.55, PLAT_TOP, -0.35];
const FIRE_POS = [0.85, 0, -0.55];
const TOP_BLOCK = SPIRAL.length - 1; // the last, smallest block: knocked out for the vent hole
const DOOR_X = R0 * 0.98;

// --- block choreography --------------------------------------------------------------------------
const M = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), Q1 = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
const dropIn = (m, t, lift = 0.45) => { // a block set down from above, settling with a little overshoot
  const out = m.clone();
  const e = 1 - easeOutBack(clamp01(t), 1.4);
  out.elements[13] += lift * e;
  return out;
};

// L2: ring blocks appear course by course, then the leaning courses tip into the middle
const ringAt = (b) => {
  if (b.k < 4) return lerp(B.stack, B.ringsDone - 10, (b.k * 40 + b.j) / (4 * 40));
  return lerp(B.leanIn, B.close + 4, ((b.k - 4) * 40 + b.j) / (2 * 40));
};
const falls = (b) => b.k >= 4 || (b.k === 3 && hash(b.j, 3) < 0.45);
function ringBlock(b, f) {
  const at = ringAt(b);
  if (f < at) return null;
  if (!falls(b) || f < B.tip + hash(b.j, b.k) * 8) return dropIn(b.m, prog(f, at, at + 6));
  // tip inward and fall into the middle, landing in a heap on "falls"
  const t0 = B.tip + hash(b.j, b.k) * 8, t = prog(f, t0, B.falls + hash(b.j, b.k + 9) * 4);
  b.m.decompose(P, Q0, S);
  const a = hash(b.j, b.k + 2) * Math.PI * 2, r = 0.2 + hash(b.j, b.k + 5) * 1.15;
  const end = new THREE.Vector3(Math.cos(a) * r, 0.14 + hash(b.j, b.k + 7) * 0.25, Math.sin(a) * r);
  Q1.setFromEuler(new THREE.Euler(Math.PI / 2 + (hash(b.j, b.k + 3) - 0.5) * 0.8, hash(b.j, b.k + 4) * 6, (hash(b.j, 1) - 0.5) * 0.6));
  const e = easeIn(t);
  const pos = P.clone().lerp(end, e);
  pos.y = lerp(P.y, end.y, e) + 0.3 * Math.sin(Math.PI * t) * (1 - t);
  return M.compose(pos, Q0.clone().slerp(Q1, easeInOut(t)), S).clone();
}

// L3: the spiral, one block after another; L5 roof sag (campfire) and the vent hole
const layAt = (i) => lerp(B.lay + 4, B.spiralEnd, i / (SPIRAL.length - 1));
function spiralBlock(b, f, sag) {
  if (inDoor(b)) return null;
  if (b.i === TOP_BLOCK && f >= B.hole) return null;
  const at = layAt(b.i);
  if (f < at) return null;
  const m = dropIn(b.m, prog(f, at, at + 7), 0.35);
  if (sag > 0) {
    const y = m.elements[13];
    m.elements[13] -= sag * 0.14 * clamp01((y - 1.4) / (H - 1.4));
  }
  return m;
}

// the tunnel's arched roof and, at the end, the block that seals its mouth
const ARCH = (() => {
  const out = [];
  const xs = [];
  for (let x = TUNNEL.x0 + 0.45; x < TUNNEL.x1 - 0.5; x += 0.52) xs.push(x);
  xs.forEach((x, k) => {
    [0.45, Math.PI / 2, Math.PI - 0.45].forEach((a, j) => {
      const r = 0.62;
      const pos = new THREE.Vector3(x, Math.sin(a) * r - 0.04, Math.cos(a) * r);
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, Math.cos(a), -Math.sin(a)), new THREE.Vector3(0, Math.sin(a), Math.cos(a)));
      out.push({ k, j, m: m.setPosition(pos) });
    });
  });
  return out;
})();
const SEAL = new THREE.Matrix4().compose(new THREE.Vector3(TUNNEL.x1 - 0.95, -0.36, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), S);
const archAt = (b) => lerp(B.arch[0], B.arch[1], (b.k * 3 + b.j) / ARCH.length);

// --- props -------------------------------------------------------------------------------------
const heapHeight = (r, heap, sag) => { // the snow cave's outer surface height at radius r
  const rad = 2.3 * (0.85 + 0.15 * heap), top = 1.75 * heap;
  if (r >= rad) return 0;
  const a = Math.acos(r / rad);
  return Math.sin(a) * top - sag * 0.9 * Math.exp(-Math.pow(Math.cos(a) * 1.8, 2));
};
const caveState = (f) => {
  if (f < B.pile || f >= lineStart("l2a") - 4) return null;
  const heap = easeOutCubic(prog(f, B.pile, B.heapUp));
  const hollow = easeInOut(prog(f, B.dig, B.hollowed));
  const sag = f < B.caves ? 0.42 * easeInOut(prog(f, B.sags, B.caves)) : lerp(0.42, 1, easeIn(prog(f, B.caves, B.collapse)));
  return [Math.max(0.02, heap), sag, f < B.caves ? hollow : 0];
};
const CUT_SHOTS = []; // filled by the camera list: which spans show the cutaway

const sunDay = [-0.62, 0.24, -0.75], sunNight = [-0.55, 0.65, 0.6]; // the moon lights the dome from the front-left
export function propsAt(f) {
  const nightT = easeInOut(prog(f, B.night[0], B.night[1]));
  const cut = CUT_SHOTS.some(([a, b]) => f >= a && f < b);
  const sag = f >= B.melts && f < B.rewind ? easeInOut(prog(f, B.melts, B.smoke)) : 0;
  const spiral = f >= B.lay ? SPIRAL.map((b) => spiralBlock(b, f, sag)).filter(Boolean) : [];
  const rings = f >= B.stack && f < B.lay ? RINGS.map((b) => ringBlock(b, f)).filter(Boolean) : [];
  // L2: the first blocks lifted out of the drift by dad
  const loose = [];
  if (f >= B.blockUp && f < B.stack) {
    const up = easeOutBack(prog(f, B.blockUp, B.blockUp + 14), 1.2);
    loose.push(new THREE.Matrix4().compose(new THREE.Vector3(2.35, lerp(-0.22, 0.21, up), 0.25), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, 0)), S));
    loose.push(new THREE.Matrix4().compose(new THREE.Vector3(2.0, 0.21, -0.55), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.2, 0)), S));
  }
  const arch = f >= B.arch[0] ? ARCH.filter((b) => f >= archAt(b)).map((b) => dropIn(b.m, prog(f, archAt(b), archAt(b) + 6), 0.3)) : [];
  if (f >= B.sealIn[0]) {
    const t = easeOutCubic(prog(f, B.sealIn[0], B.sealIn[1]));
    const m = SEAL.clone();
    m.elements[12] += lerp(1.6, 0, t);
    arch.push(m);
  }
  let key = null;
  if (f >= B.key - 6) {
    const t = prog(f, B.key - 6, B.keyLand);
    key = KEY.m.clone();
    key.elements[13] += lerp(1.6, 0, easeIn(t)) - sag * 0.12;
    if (f >= B.keyLand && f < B.keyLand + 6) key.elements[13] -= 0.03 * Math.sin(Math.PI * (f - B.keyLand) / 6);
  }
  const platform = f < B.platUp[0] ? 0 : PLAT_TOP * easeOutBack(prog(f, ...B.platUp), 1.1);
  const fire = f >= B.fire && f < B.rewind ? Math.min(1, (f - B.fire) / 6) : 0;
  const lamp = f >= B.light ? Math.min(1, (f - B.light) / 8) : 0;
  const glaze = f < B.inside5 ? 0 : f < B.freeze ? 0.45 * easeInOut(prog(f, B.inside5, B.inside5 + 30)) : lerp(0.45, 1, easeInOut(prog(f, B.freeze, B.glaze + 6)));
  const whiteout = f < B.night[0] ? lerp(0.08, 0.32, easeInOut(prog(f, B.blizzard, B.dig))) * (f < lineStart("l2a") ? 1 : 0.6) : lerp(0.2, 0.55, nightT);
  return {
    night: nightT,
    whiteout,
    blizzard: f < lineStart("l2a") ? lerp(0.25, 0.75, prog(f, B.blizzard, B.dig)) : f < B.night[0] ? 0.4 : lerp(0.4, 1, nightT),
    sunDir: lerp3(sunDay, sunNight, nightT),
    sunI: lerp(6.1, 1.3, nightT) * (1 - whiteout * 0.4),
    sunColor: nightT > 0.5 ? 0xa8bcff : 0xfff0e0,
    skyI: lerp(0.55, 0.3, nightT),
    skyColor: nightT > 0.5 ? 0x34477a : 0xc2d3ec,
    cut,
    cutZ: 0,
    dig: f < B.trench[0] ? 0 : easeInOut(prog(f, ...B.trench)),
    spiral,
    rings: rings.concat(loose),
    arch,
    key,
    cave: caveState(f),
    platform,
    platformTop: platform,
    fire,
    lamp,
    lampPos: LAMP_POS,
    firePos: FIRE_POS,
    furs: f < B.furs - 4 ? 0 : easeOutCubic(prog(f, B.furs - 4, B.furs + 8)),
    shovel: f >= B.pile - 20 && f < lineStart("l2a") ? { pos: [2.9, 0, 1.25], rot: [0.15, 0.4, -0.25] } : null,
    glaze,
    glow: nightT * lamp,
    fill: cut ? lerp(2.2, f >= B.block6 - 6 ? 3.2 : 1.2, nightT) : 0,
  };
}

// --- the family ------------------------------------------------------------------------------
// One track per person (frame -> Actor | null); ActorView eases every pose switch.
const SEAT = { dad: -1.25, mom: -0.6, kid: 0.05 };      // on the floor inside (L4a)
const PLAT_SEAT = { dad: -0.95, mom: -0.4, kid: 0.1 }; // on the platform (L4c on)
const CAVE_SEAT = { dad: -0.65, mom: 0.0, kid: 0.55 };
const HEAD = { dad: 1.51, mom: 1.45, kid: 1.12 };       // standing height (rig 1.64 x CHAR_SCALE x FAMILY_SCALE x class)
const OUT = { dad: [-2.0, 1.7], mom: [-2.6, 0.9], kid: [-3.1, 1.6] }; // outside, left of the igloo (the cameras sit on the right)

const shiver = (f, k) => 0.012 * Math.sin(f * 2.3 + k);
const CLASS_SCALE = { dad: 1, mom: 0.96, kid: 0.74 };
const FAMILY_SCALE = 0.82;
const HIP = 0.95 * CHAR_SCALE_VALUE * FAMILY_SCALE;
const lieHeight = (m) => 0.2 * CHAR_SCALE_VALUE * FAMILY_SCALE * CLASS_SCALE[m];
function member(m, f) {
  const k = m === "dad" ? 0 : m === "mom" ? 1 : 2;
  const o = OUT[m];
  // L1: watching the storm come, then the heap
  if (f < B.pile) {
    const look = f >= B.blizzard + 4;
    return { pose: "idle", position: [o[0], 0, o[1]], yaw: look ? FACE_AWAY - 0.3 : FACE_CAMERA + 0.4, expression: look ? "shock" : "happy" };
  }
  if (f < B.dig) {
    if (m === "dad") { // shovelling the heap up
      const stroke = Math.floor((f - B.pile) / 7) % 2;
      return { pose: stroke ? "smash" : "windup", position: [2.25, 0, 0.55], yaw: FACE_LEFT + 0.25, expression: "focus", blend: 3 };
    }
    return { pose: m === "kid" ? "cheer" : "idle", position: [o[0] + 0.3, 0, o[1]], yaw: FACE_RIGHT - 0.3, expression: "happy" };
  }
  if (f < B.caves) { // tucked inside the cave (cutaway)
    const up = f >= B.sags;
    return { pose: "sit", position: [CAVE_SEAT[m], 0, Z_IN + (k === 1 ? -0.1 : 0)], yaw: FACE_CAMERA, expression: up ? "shock" : "happy", blend: f < B.dig + 2 ? 0 : 6 };
  }
  if (f < lineStart("l2a") - 4) { // buried; the heads pop out of the slumped heap, dazed
    const x = CAVE_SEAT[m] * 1.05, z = (k - 1) * 0.35;
    const surf = heapHeight(Math.hypot(x, z), 1, 1);
    const pop = easeOutBack(prog(f, B.heads + k * 4, B.heads + k * 4 + 8), 1.6);
    return { pose: "idle", position: [x, surf - HEAD[m] + lerp(-0.2, 0.62, pop), z], yaw: FACE_CAMERA + (k - 1) * 0.3, expression: "dazed", blend: 0 };
  }
  // L2: dad cuts blocks; everyone stacks rings; the top falls in
  if (f < B.stack) {
    if (m === "dad") {
      const saw = f < B.blockUp + 16 ? (Math.floor((f - B.cut) / 5) % 2 ? "smash" : "windup") : "point";
      return { pose: saw, position: [3.0, 0, 0.2], yaw: FACE_LEFT + 0.25, expression: saw === "point" ? "smug" : "focus", blend: 3 };
    }
    return { pose: "idle", position: [o[0] + 0.4, 0, o[1]], yaw: FACE_RIGHT - 0.2, expression: "happy" };
  }
  if (f < B.lay - 4) {
    const shock = f >= B.tip;
    if (shock) return { pose: f < B.falls + 4 ? "cower" : "idle", position: [o[0] + 0.3, 0, o[1]], yaw: FACE_CAMERA + 0.7, expression: f < B.falls + 4 ? "scared" : "shock" };
    const pose = f >= B.fine && f < B.flat ? "cheer" : m === "kid" ? "idle" : "cast";
    return { pose, position: [o[0] + 0.3, 0, o[1]], yaw: FACE_RIGHT - 0.4, expression: "happy" };
  }
  // L3: dad builds the spiral from inside; mom and kid hand blocks in, cheer the key block
  if (f < B.door - 6) {
    if (m === "dad") {
      if (f < B.dadOut) {
        const pose = f >= B.key - 6 && f < B.keyLand + 4 ? "carry" : "cast";
        return { pose, position: [-0.1, 0, 0.1], yaw: FACE_CAMERA + Math.sin(f * 0.05) * 0.8, expression: pose === "carry" ? "focus" : "happy" };
      }
      // crawls out of the door and cheers
      const t = prog(f, B.dadOut, B.dadOut + 26);
      if (t < 1) return { pose: "walk", position: [lerp(0.6, DOOR_X + 1.2, t), 0, 0.15], yaw: FACE_RIGHT, expression: "happy", speed: 1.1 };
      return { pose: "cheer", position: [DOOR_X + 1.2, 0, 0.15], yaw: FACE_CAMERA + 0.5, expression: "happy" };
    }
    const cheer = (f >= B.holds && f < B.holds + 40) || f >= B.shut;
    return { pose: cheer ? "cheer" : "cast", position: [o[0] + 0.2, 0, o[1]], yaw: cheer ? FACE_CAMERA + 0.7 : FACE_RIGHT - 0.4, expression: cheer ? "happy" : "focus" };
  }
  // L4-L6 inside (cutaway); the platform lifts them on "raise"
  const onPlat = f >= B.platUp[0] - 2;
  if (f < B.platUp[0] - 26) {
    const cold = f >= B.wind;
    return { pose: "sit", position: [SEAT[m] + (cold ? shiver(f, k) : 0), 0, Z_IN], yaw: FACE_CAMERA, expression: cold && f < B.sinks + 10 ? "scared" : "neutral", blend: f < B.door ? 0 : 6 };
  }
  if (!onPlat) { // shuffle back onto where the platform will rise
    const t = easeInOut(prog(f, B.platUp[0] - 26, B.platUp[0] - 4));
    return { pose: "sit", position: [lerp(SEAT[m], PLAT_SEAT[m], t), 0, Z_IN], yaw: FACE_CAMERA, expression: "neutral" };
  }
  const y = f < B.platUp[1] + 4 ? PLAT_TOP * easeOutBack(prog(f, ...B.platUp), 1.1) : PLAT_TOP;
  const pos = [PLAT_SEAT[m], y, Z_IN];
  if (f < B.cold5) return { pose: "sit", position: pos, yaw: FACE_CAMERA, expression: f >= B.warm ? "happy" : "neutral" };
  if (f < B.campfire) return { pose: "sit", position: [pos[0] + shiver(f, k), y, Z_IN], yaw: FACE_CAMERA, expression: "scared" };
  if (f < B.dont) return { pose: m === "dad" && f >= B.fire + 6 ? "cheer" : "sit", position: m === "dad" && f >= B.fire + 6 ? [pos[0] - 0.05, 0, -0.12] : pos, yaw: FACE_CAMERA, expression: "happy" };
  if (f < B.rewind) return { pose: "sit", position: pos, yaw: FACE_CAMERA, expression: f < B.melts ? "shock" : f >= B.smoke - 10 ? "pain" : "scared" };
  if (f < B.inside6 - 40) {
    if (m === "mom" && f >= B.light - 16 && f < B.light + 14) return { pose: "cast", position: [0.95, 0, -0.12], yaw: FACE_LEFT + 0.35, expression: "focus" };
    return { pose: "sit", position: pos, yaw: FACE_CAMERA, expression: f >= B.freeze ? "happy" : "neutral" };
  }
  // L6: night; furs; lie down to sleep
  if (f < B.sleep || m === "dad") return { pose: "sit", position: pos, yaw: FACE_CAMERA, expression: "happy" };
  // lying on the furs, as the crypt lab lays out a body: back on the surface, pivot at the hip
  const settle = 0.06 * Math.sin(Math.PI * prog(f, B.sleep, B.sleep + 7));
  return {
    pose: "sprawl", position: [m === "kid" ? -0.55 : -0.85, PLAT_TOP + 0.06 + lieHeight(m) - HIP + settle, m === "kid" ? -1.25 : -0.85],
    yaw: FACE_RIGHT, tilt: Math.PI / 2, pivot: HIP, expression: "happy",
  };
}

// The family a size smaller than the episode cast (FAMILY_SCALE), so three fit a real-sized igloo.
const scaled = (a) => (a ? { ...a, scale: FAMILY_SCALE } : a);
export const TRACKS = [
  { id: "dad", classType: "dadParka", track: (f) => scaled(member("dad", f)) },
  { id: "mom", classType: "momParka", track: (f) => scaled(member("mom", f)) },
  { id: "kid", classType: "kidParka", track: (f) => scaled(member("kid", f)) },
];

// --- camera --------------------------------------------------------------------------------------
// Each shot is a slow move from a to b over [start, end); consecutive shots cut. `cut` shots show
// the cutaway. A shot's `crash` punches the lens in over 5 frames (a reaction).
const shot = (start, end, a, b, opts = {}) => ({ start, end, a, b: b ?? a, ...opts });
const v = (pos, look, fov = 40) => ({ pos, look, fov });
const SHOTS = [
  // L1
  shot(0, B.pile - 2, v([5.0, 3.5, 19], [0.6, 2.4, -2]), v([4.2, 3.0, 16.5], [0.5, 2.1, -2])),
  shot(B.pile - 2, B.dig, v([5.6, 2.1, 7.8], [0.8, 0.8, 0]), v([5.1, 2.0, 7.0], [0.8, 0.8, 0])),
  shot(B.dig, B.caves, v([0.1, 1.15, 7.4], [0, 0.75, 0]), v([0.05, 1.05, 6.4], [0, 0.75, 0]), { cut: true }),
  shot(B.caves, lineStart("l2a") - 2, v([2.6, 2.3, 7.2], [0, 0.8, 0]), v([2.3, 2.1, 6.4], [0, 0.8, 0])),
  // L2
  shot(lineStart("l2a") - 2, B.stack - 4, v([0.7, 1.6, 6.5], [2.5, 0.7, 0.2]), v([0.9, 1.55, 6.0], [2.5, 0.7, 0.2])),
  shot(B.stack - 4, B.tip - 6, v([6.2, 4.6, 10.0], [0, 1.0, 0]), v([5.5, 4.3, 9.0], [0, 1.0, 0])),
  shot(B.tip - 6, lineStart("l3a") - 2, v([4.2, 5.4, 6.8], [0, 0.6, 0]), v([3.9, 5.1, 6.2], [0, 0.6, 0])),
  // L3
  shot(lineStart("l3a") - 2, B.leaning - 2, v([1.6, 9.0, 7.0], [0, 0.6, -0.3]), v([1.3, 8.2, 6.0], [0, 0.6, -0.3])),
  shot(B.leaning - 2, lineStart("l3b") - 2, v([4.0, 1.9, 4.0], [0.4, 1.5, -0.2]), v([3.7, 1.95, 3.6], [0.4, 1.55, -0.2])),
  shot(lineStart("l3b") - 2, B.key - 8, v([5.6, 2.8, 11.5], [0, 1.4, 0]), v([5.0, 2.6, 10.4], [0, 1.4, 0])),
  shot(B.key - 8, lineStart("l4a") - 2, v([3.8, 4.4, 7.4], [0.4, 2.0, 0]), v([4.6, 3.4, 8.6], [1.2, 1.6, 0])),
  // L4 (cutaway)
  shot(lineStart("l4a") - 2, B.dig4 - 4, v([0.2, 1.5, 9.2], [-0.1, 1.25, 0]), v([0.15, 1.45, 8.4], [-0.1, 1.2, 0]), { cut: true }),
  shot(B.dig4 - 4, lineStart("l4c") - 2, v([2.6, 1.25, 8.8], [2.55, 0.1, 0]), v([2.55, 1.15, 8.0], [2.55, 0.05, 0]), { cut: true }),
  shot(lineStart("l4c") - 2, lineStart("l5a") - 2, v([-0.1, 1.55, 8.0], [-0.5, 1.2, 0]), v([-0.2, 1.5, 7.3], [-0.5, 1.2, 0]), { cut: true }),
  // L5 (cutaway)
  shot(lineStart("l5a") - 2, B.dont, v([0.3, 1.5, 8.6], [0.1, 1.2, 0]), v([0.25, 1.5, 7.9], [0.1, 1.2, 0]), { cut: true }),
  shot(B.dont, B.dont + 22, v([1.4, 0.95, 3.2], [0.85, 0.45, -0.55], 34), null, { cut: true }),
  shot(B.dont + 22, B.rewind, v([0.3, 1.55, 8.2], [0.1, 1.3, 0]), v([0.3, 1.55, 7.6], [0.1, 1.3, 0]), { cut: true }),
  shot(B.rewind, B.inside5 - 6, v([0.5, 1.1, 3.9], [0.45, 0.75, -0.3]), v([0.5, 1.05, 3.5], [0.45, 0.75, -0.3]), { cut: true }),
  shot(B.inside5 - 6, lineStart("l5c") - 2, v([0.0, 1.55, 7.4], [0, 1.35, -0.4]), v([0.0, 1.55, 6.7], [0, 1.35, -0.4]), { cut: true }),
  shot(lineStart("l5c") - 2, B.hole - 4, v([-0.6, 1.6, 9.4], [-0.4, 1.35, 0]), v([-0.5, 1.6, 8.8], [-0.4, 1.35, 0]), { cut: true }),
  shot(B.hole - 4, B.night[0], v([-0.25, 1.5, 7.8], [-0.25, 1.75, -0.5]), v([-0.2, 1.55, 7.1], [-0.2, 1.85, -0.5]), { cut: true }),
  // L6
  shot(B.night[0], B.inside6 - 4, v([4.6, 1.8, 13.5], [0, 1.4, 0]), v([4.0, 1.7, 12.2], [0, 1.4, 0])),
  shot(B.inside6 - 4, lineStart("l6b") - 2, v([-0.1, 1.45, 7.8], [-0.4, 1.2, 0]), v([-0.15, 1.4, 7.2], [-0.4, 1.2, 0]), { cut: true }),
  shot(lineStart("l6b") - 2, B.block6 - 6, v([-0.5, 1.4, 6.4], [-0.75, 0.75, -0.2]), v([-0.55, 1.35, 5.9], [-0.75, 0.75, -0.2]), { cut: true }),
  shot(B.block6 - 6, B.congrats - 2, v([1.7, 2.1, 16.2], [1.65, 1.35, 0]), v([1.65, 2.0, 15.0], [1.65, 1.3, 0]), { cut: true }),
  shot(B.congrats - 2, FRAMES, v([3.2, 1.6, 9.5], [0.3, 1.4, 0]), v([4.6, 2.6, 14.0], [0.4, 1.9, 0])),
];
for (const s of SHOTS) if (s.cut) CUT_SHOTS.push([s.start, s.end]);

const SHAKES = [
  { at: B.collapse, strength: 0.25 },
  { at: B.falls, strength: 0.3 },
  { at: B.keyLand, strength: 0.22 },
  { at: B.platUp[1], strength: 0.08 },
  { at: B.seal, strength: 0.12 },
  { at: B.stamp, strength: 0.14 },
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

function camAt(f) {
  const s = SHOTS.find((k) => f >= k.start && f < k.end) ?? SHOTS[SHOTS.length - 1];
  const t = easeInOut(prog(f, s.start, s.end));
  let pos = lerp3(s.a.pos, s.b.pos, t), look = lerp3(s.a.look, s.b.look, t), fov = lerp(s.a.fov, s.b.fov, t);
  if (s.crash && f >= s.crash[0] && f < s.crash[1]) { // punch in on a face along the shot's own line
    const target = s.crash[2], d = s.crash[3];
    const dir = pos.map((p, i) => p - target[i]), len = Math.hypot(...dir);
    pos = target.map((p, i) => p + (dir[i] / len) * d);
    look = target;
    fov = lerp(40, 30, easeOutCubic(prog(f, s.crash[0], s.crash[0] + 5)));
  }
  const [sx, sy] = shake(f);
  return { pos: [pos[0] + sx, pos[1] + sy, pos[2]], look, fov };
}
// Thumbnail plates (thumb1-3): fixed lenses on a picked frame, filmed with ?clean (no captions or badges)
const still = (pos, look, fov) => () => ({ pos, look, fov });
export const CAMS = {
  main: camAt,
  thumb1: still([4.0, 0.9, 10.2], [-0.2, 1.9, 0], 40),      // the glowing igloo under the aurora
  thumb2: still([0.0, 2.2, 4.0], [0, 0.85, 0], 34),        // three dazed heads in the collapsed snow cave
  thumb3: still([0.1, 1.5, 4.7], [0.05, 1.2, -0.4], 30),   // warm faces round the lamp at forty below
};

// --- sound -----------------------------------------------------------------------------------
export const STAGES = [
  { at: Math.max(84, lineStart("l1a")), n: 1, name: "SNOW CAVE", color: "#bfe6ff" },
  { at: lineStart("l2a"), n: 2, name: "BLOCK RINGS", color: "#ffd84d" },
  { at: lineStart("l3a"), n: 3, name: "SPIRAL DOME", color: "#7fe0c2" },
  { at: lineStart("l4a"), n: 4, name: "COLD-TRAP TUNNEL", color: "#6fb4ff" },
  { at: lineStart("l5a"), n: 5, name: "LAMP + ICE GLAZE", color: "#ffb04a" },
  { at: lineStart("l6a"), n: 6, name: "FORTY BELOW", color: "#ff6b6b" },
];
const SHOVEL_STROKES = Array.from({ length: Math.floor((B.dig - B.pile) / 14) }, (_, i) => B.pile + 7 + i * 14);
export const SFX = [
  ["stamp", 6, 0.4],
  ...STAGES.map((s) => ["pop", s.at, 0.2]),
  ["wind", 0, 0.07, B.door],
  ["wind", B.blizzard, 0.07, B.dig - B.blizzard],
  ...SHOVEL_STROKES.map((at) => ["shovel", at, 0.35]),
  ["shovel", B.dig + 2, 0.3],
  ["shovel", B.dig + 16, 0.3],
  ["crack", B.sags, 0.3],
  ["whump", B.caves, 0.6],
  ...[0, 1, 2].map((k) => ["pop", B.heads + k * 4, 0.25]),
  ["saw", B.cut, 0.4],
  ["crunch", B.blockUp + 12, 0.4],
  ...Array.from({ length: 10 }, (_, i) => ["crunch", Math.round(lerp(B.stack, B.ringsDone, i / 9)), 0.22]),
  ["crunch", B.leanIn + 6, 0.25],
  ["crack", B.tip, 0.35],
  ["whump", B.falls, 0.6],
  ...Array.from({ length: 16 }, (_, i) => ["crunch", Math.round(layAt(i * Math.floor(SPIRAL.length / 16)) + 6), 0.2]),
  ["whoosh", B.key - 6, 0.3],
  ["thud", B.keyLand, 0.55],
  ["crunch", B.keyLand, 0.4],
  ["wind", B.door, 0.13, B.dig4 - B.door],
  ["whoosh", B.wind, 0.3],
  ...Array.from({ length: 4 }, (_, i) => ["shovel", B.trench[0] + i * 9, 0.32]),
  ...Array.from({ length: 5 }, (_, i) => ["crunch", Math.round(lerp(B.arch[0], B.arch[1], i / 4)) + 4, 0.22]),
  ["whoosh", B.sinks, 0.2],
  ["wind", B.dig4, 0.06, B.night[0] - B.dig4],
  ["rumble", B.platUp[0], 0.3],
  ["thud", B.platUp[1], 0.35],
  ["ignite", B.fire, 0.45],
  ["fire", B.fire + 4, 0.35, B.rewind - B.fire - 4],
  ["slam", B.dont, 0.4],
  ...Array.from({ length: 8 }, (_, i) => ["drip", B.melts + 6 + i * 9, 0.3]),
  ["whoosh_big", B.rewind, 0.35],
  ["ignite", B.light, 0.35],
  ...Array.from({ length: 3 }, (_, i) => ["drip", B.inside5 + 8 + i * 10, 0.22]),
  ["freeze", B.freeze, 0.45],
  ["sparkle", B.glaze, 0.3],
  ["pop", B.hole, 0.35],
  ["wind", B.night[0], 0.16, B.inside6 - B.night[0]],
  ["wind", B.inside6, 0.06, FRAMES - B.inside6],
  ["thud", B.furs + 6, 0.25],
  ["crunch", B.seal, 0.45],
  ["thud", B.seal, 0.35],
  ["stamp", B.stamp, 0.6],
  ["boom", B.stamp, 0.3],
].map(([name, at, vol, dur]) => ({ name, at, vol, dur }));

// --- bursts (fx.js) ------------------------------------------------------------------------------
export const BURSTS = [
  ...SHOVEL_STROKES.map((at) => ({ kind: "spray", at, pos: [1.7, 0.4, 0.5], dir: [-1.2, 1, 0], n: 22, floor: 0.2 })),
  ...SHOVEL_STROKES.map((at) => ({ kind: "snow", at: at + 6, pos: [0.6, 0.8, 0.3], box: [0.6, 0.3, 0.6], n: 8, size: 0.8 })),
  { kind: "snow", at: B.dig + 2, pos: [0.4, 0.4, -0.3], box: [0.5, 0.2, 0.3], n: 14, size: 0.7 },
  { kind: "snow", at: B.sags + 4, pos: [0, 1.3, -0.4], box: [0.6, 0.05, 0.3], n: 12, size: 0.5, up: -0.4 },
  { kind: "snow", at: B.caves, pos: [0, 1.0, 0], box: [1.2, 0.3, 1.2], n: 70, size: 1.0 },
  { kind: "spray", at: B.caves, pos: [0, 1.0, 0], box: [0.8, 0.1, 0.8], dir: [0, 0.6, 0], n: 50, floor: 0.4 },
  ...[0, 1, 2].map((k) => ({ kind: "snow", at: B.heads + k * 4, pos: [CAVE_SEAT[["dad", "mom", "kid"][k]], 0.9, (k - 1) * 0.35], n: 10, size: 0.6 })),
  { kind: "spray", at: B.blockUp, pos: [2.35, 0.05, 0.25], dir: [0.4, 0.8, 0.4], n: 26, size: 0.8 },
  { kind: "snow", at: B.blockUp + 2, pos: [2.35, 0.1, 0.25], n: 12, size: 0.6 },
  { kind: "snow", at: B.falls, pos: [0, 0.4, 0], box: [1.2, 0.3, 1.2], n: 70, size: 0.9 },
  { kind: "spray", at: B.falls, pos: [0, 0.5, 0], box: [1, 0.2, 1], dir: [0, 0.7, 0], n: 40 },
  { kind: "snow", at: B.keyLand, pos: [0, H + 0.1, 0], box: [0.5, 0.05, 0.5], n: 24, size: 0.7 },
  { kind: "wind", at: B.wind - 6, end: B.dig4 + 10, pos: [R0 + 1.2, 0.3, -0.3], to: [-R0 + 0.4, 0, 0], box: [0, 0.3, 0.3], n: 70, size: 2.2 },
  ...Array.from({ length: 4 }, (_, i) => ({ kind: "spray", at: B.trench[0] + i * 9, pos: [TUNNEL.x0 + 0.6 + i * 0.6, -0.2, -0.2], dir: [0.6, 1, 0.3], n: 20, floor: 0 })),
  { kind: "cold", at: B.sinks - 6, end: B.raise, pos: [DOOR_X - 0.3, 0.5, -0.25], to: [TUNNEL.x0 + 1.4, -0.55, -0.2], box: [0.3, 0.2, 0.2], toBox: [0.9, 0.08, 0.2], n: 120, life: 2.4, opacity: 0.3, size: 0.75 },
  { kind: "warm", at: B.warm - 8, end: lineStart("l5a") + 10, pos: [-0.8, 0.9, -0.5], to: [-0.2, 2.0, -0.6], box: [0.7, 0.2, 0.3], toBox: [1.0, 0.15, 0.4], n: 80, life: 2.6, opacity: 0.07, size: 0.5 },
  { kind: "flame", at: B.fire, end: B.rewind, pos: [FIRE_POS[0], 0.16, FIRE_POS[2]], box: [0.08, 0.02, 0.08], n: 80, height: 0.7, size: 0.85 },
  { kind: "smoke", at: B.fire + 10, end: B.rewind, pos: [FIRE_POS[0], 0.6, FIRE_POS[2]], to: [0, 1.9, -0.7], box: [0.1, 0.1, 0.1], toBox: [1.2, 0.3, 0.6], n: 60, life: 3.2, opacity: 0.45, size: 1.6 },
  { kind: "drip", at: B.melts + 4, end: B.rewind, pos: [0.2, H - 0.25, -0.5], box: [0.7, 0.05, 0.5], n: 12, floor: 0.02 },
  { kind: "lampflame", at: B.light, end: FRAMES, pos: [LAMP_POS[0], LAMP_POS[1] + 0.05, LAMP_POS[2]], box: [0.0, 0.0, 0.17], n: 24, height: 0.1, size: 1.8 },
  { kind: "drip", at: B.inside5 + 4, end: B.freeze, pos: [0, H - 0.3, -0.6], box: [0.9, 0.05, 0.5], n: 6, floor: PLAT_TOP },
  { kind: "glints", at: B.freeze, end: B.hole, pos: [0, 1.4, -1.2], box: [1.6, 0.8, 0.4], n: 50 },
  { kind: "snow", at: B.hole, pos: [0.25, H - 0.1, -0.3], n: 12, size: 0.5 },
  { kind: "wisp", at: B.hole + 4, end: FRAMES, pos: [0.25, H, -0.3], to: [0.6, H + 1.4, -0.3], box: [0.04, 0.02, 0.04], toBox: [0.3, 0.2, 0.2], n: 45, life: 2.4, opacity: 0.32, size: 0.32 },
  { kind: "wind", at: B.seals - 4, end: B.hole, pos: [-R0 - 3.5, 1.0, -0.5], to: [-R0 - 0.3, 0, 0], box: [0, 0.8, 0.4], n: 40, size: 1.4 },
  { kind: "snow", at: B.furs + 6, pos: [-0.9, PLAT_TOP + 0.05, -0.7], box: [0.6, 0, 0.3], n: 10, size: 0.4 },
  { kind: "snow", at: B.seal, pos: [TUNNEL.x1 - 0.95, 0.0, -0.2], box: [0.25, 0.25, 0.3], n: 30, size: 0.75 },
];

// --- captions + badges (DOM over the canvas, hud.js) ------------------------------------------------
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
  const thermo = f >= B.forty - 4 && f < lineStart("l6b") - 4
    ? { age: f - (B.forty - 4), out: lerp(-12, -40, easeOutCubic(prog(f, B.forty - 4, B.forty + 14))), inside: lerp(-8, 2, easeOutCubic(prog(f, B.inside6, B.freezing + 6))) }
    : null;
  return {
    title: f < 82,
    titleFrame: f,
    stage: stage ? { ...stage, pop: f - stage.at } : null,
    caption: c ? c.words.map((x) => ({ word: x.word, on: f >= x.startFrame })) : null,
    thermo,
    noX: f >= B.dont && f < B.dont + 30 ? f - B.dont : null,
    end: f >= B.stamp ? { age: f - B.stamp } : null,
  };
}

