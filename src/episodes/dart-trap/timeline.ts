import {
  HIP,
  arc,
  bezier,
  bezier3,
  createCues,
  easeInOut,
  easeOutCubic,
  lerp,
  lerp3,
  lieHeight,
  progress,
  bump,
} from "../../kit";
import cues from "./data/narrationCues.json";
import type { Vec3 } from "../../engine/types";

/**
 * Beats, geometry and motion for "Evolution of a Dart Trap". Pure functions of
 * the frame only. Every story beat is `w(line, word) ± offset`; every
 * projectile is solved toward the exact point it hits, so darts land on bodies
 * and stay stuck to them.
 */

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit";

// ---------------------------------------------------------------------------
// Geometry: Scene, camera and SFX all read these, never their own copies.
// ---------------------------------------------------------------------------
/** Action plane: actors walk along x at z = Z, the camera looks at it from +z. */
export const Z = -0.6;
/** Daylight exit at the left end of the hall: newcomers enter here, on camera. */
export const ENTRY_X = -10.2;
export const CEILING_Y = 5.9;
/** The hall stops at the solid end wall; its left face closes the trap corridor. */
export const HALL_RIGHT = 7.8;
export const WALL_X = 6.6;
/** Bannered arch by the entrance: kept out of the trap shots so the banner never fills the frame. */
export const ARCH_X = -6.0;
/** Walking pace in world units per frame (jogging ~0.14, sprint ~0.2). */
export const WALK = 0.09;

/**
 * Dart battery bolted to the end wall: 8 rows x 2 nozzles, mouths facing -x.
 * Rows 0-3 (body height) fire at the goblin and the bats; rows 5-7 fire the
 * high volley the rogue bends under.
 */
export const NOZZLE_X = WALL_X - 0.5;
export const NOZZLE_YS = [0.46, 0.63, 0.8, 0.97, 1.14, 1.31, 1.48, 1.65] as const;
export const NOZZLE_ZS = [Z - 0.11, Z + 0.11] as const;
export const NOZZLES: Vec3[] = ([] as Vec3[]).concat(
  ...NOZZLE_YS.map((y) => NOZZLE_ZS.map((z): Vec3 => [NOZZLE_X, y, z]))
);

export const PLATE_X = 4.4;
/** Goblin starts out of shot and is blown back off the plate onto his back. */
export const GOBLIN_X0 = -3.4;
export const GOBLIN_DEAD_X = 2.5;
/** Rogue hops the goblin corpse onto the plate, bends under the volley, then backflips back over it. */
export const ROGUE_HOP_X = 1.2;
export const ROGUE_PLATE_X = 4.45;
export const ROGUE_LAND_X = 0.4;
export const ROGUE_DEAD_X = 0.5;
/** Paladin and mage both make their stand left of the corpses. */
export const PALADIN_X = -1.0;
export const SHIELD_X = PALADIN_X + 0.45;
/** Floor-mounted ballista (then coilgun) rises in front of the end wall. */
export const BALLISTA_X = 5.5;
export const MUZZLE_X = BALLISTA_X - 1.0;
export const BOLT_Y = 1.05;
export const HARPOON_LEN = 1.5;
/** Winch drum on the end wall; the paladin is reeled up and pinned below it. */
export const WINCH: Vec3 = [WALL_X - 0.28, 3.05, Z - 0.7];
export const PIN_X = WALL_X - 0.34;
export const PIN_Y = 1.95;
export const MAGE_X = -1.0;
export const CYCLONE_R = 1.0;
export const CYCLONE_Y = 1.1;
export const COIL_MUZZLE_X = BALLISTA_X - 1.25;
/** Party pushes the barricade in from the exit, hides, then creeps onto the plate. */
export const CART_START_X = -9.3;
export const CART_HIDE_X = -2.5;
export const CART_TRIGGER_X = -2.1;
/** Front face of the barricade (spikes stick out a little further). */
export const CART_FACE = 0.3;
export const PARTY = [
  { cls: "rogue", dx: -0.72, dz: 0.32 },
  { cls: "paladin", dx: -1.38, dz: 0.02 },
  { cls: "mage", dx: -1.02, dz: -0.36 },
] as const;
/** Twin rams sit right under the party when the cart is on the plate. */
export const RAMS_X = CART_TRIGGER_X - 1.05;
export const MIMIC_X = 4.85;
export const MIMIC_MOUTH: Vec3 = [MIMIC_X, 0.95, Z];
/** "Both walls": two turrets on the back wall, one on the end wall. */
export const TURRETS: Array<{ key: string; pos: Vec3; mount: "back" | "end" }> = [
  { key: "t-back-1", pos: [1.3, 2.55, Z - 1.35], mount: "back" },
  { key: "t-back-2", pos: [3.7, 2.55, Z - 1.35], mount: "back" },
  { key: "t-end", pos: [WALL_X - 0.3, 1.72, Z + 0.55], mount: "end" },
];
export const GATLING_TARGET: Vec3 = [CART_TRIGGER_X + CART_FACE, 1.05, Z];

// ---------------------------------------------------------------------------
// Beats (all derived from narration words)
// ---------------------------------------------------------------------------
export const BEATS = {
  // Level 1 - wall dart slits. Plate, then battery, named and installed on screen.
  plateInstall: w("l1a", "pressure"),
  batteryInstall: w("l1a", "spring-loaded"),
  slits: w("l1a", "slits"),
  goblinStep: w("l1a", "step"),
  goblinTrigger: w("l1a", "trigger"),
  nozzlesOpen: w("l1a", "turned"),
  goblinHit: w("l1a", "pin-cushion"),

  // Counter: the rogue hops onto the plate and Matrix-dodges a slow-motion volley.
  rogueOnPlate: w("l2a", "Matrix-dodge") - 8,
  matrixLean: w("l2a", "Matrix-dodge") - 4,
  matrix: w("l2a", "Matrix-dodge"),
  matrixUp: w("l2a", "backflips") + 10,
  swagger: w("l2a", "swagger"),

  // Level 2 - homing bat darts.
  enchant: w("l2b", "enchant"),
  batWings: w("l2b", "bat"),
  rogueLeap: w("l2c", "leaps"),
  batFire: w("l2c", "leaps") + 2,
  uTurn: w("l2c", "U-turn"),
  rogueHit: w("l2c", "behind"),

  // Counter: paladin's tower shield.
  shieldUp: w("l3a", "raises"),
  paladinBatFire: w("l3a", "letting"),
  bounce: w("l3a", "bounce"),
  rain: w("l3a", "rain"),

  // Level 3 - pneumatic ballista + winch.
  ballistaInstall: w("l3b", "install"),
  ballistaBolted: w("l3b", "floor-mounted"),
  ballistaLift: w("l3b", "pneumatic"),
  harpoonLoad: w("l3b", "massive"),
  ballistaCock: w("l3b", "harpoon"),
  ballistaFire: w("l3c", "punches") - 12,
  harpoonHit: w("l3c", "punches"),
  winch: w("l3c", "winch"),
  reel: w("l3c", "reels"),
  pin: w("l3c", "wall"),

  // Counter: mage's cyclone deflects a second harpoon.
  mageCast: w("l4a", "cast"),
  cyclone: w("l4a", "cyclone"),
  ballistaFire2: w("l4a", "deflect") - 18,
  deflect: w("l4a", "deflect"),

  // Level 4 - arcane coilgun.
  upgrade: w("l4b", "upgrade"),
  arcane: w("l4b", "arcane"),
  magnetic: w("l4b", "magnetic"),
  capacitors: w("l4b", "capacitors"),
  coilFire: w("l4c", "punches") - 6,
  slugHit: w("l4c", "punches"),
  shatter: w("l4c", "shattering"),
  coilFire2: w("l4c", "blasting") - 6,
  mageBlasted: w("l4c", "blasting"),
  boots: w("l4c", "boots"),

  // Level 5 - gatling battery, floor rams, pet mimic.
  push: w("l5a", "push"),
  hide: w("l5a", "hide"),
  coilgunSink: w("l5b", "line"),
  turretsReveal: w("l5b", "walls"),
  gatling: w("l5b", "Gatling"),
  creep: w("l5b", "moment"),
  cartTrigger: w("l5b", "floor"),
  gatlingSpin: w("l5b", "steel"),
  gatlingFire: w("l5b", "flechettes"),
  splinter: w("l5b", "splinters"),
  ramPunch: w("l5b", "rams"),
  launch: w("l5b", "launch"),
  mimicOpen: w("l5b", "straight"),
  mimicChomp: w("l5b", "Mimic"),
  mimicBurp: w("l5b", "Mimic") + 22,

  stamp: w("end", "unbeatable"),
} as const;

/** Stage badges pop at the start of each level's install line (after the title card). */
export const STAGE_STARTS = [
  Math.max(84, lineStart("l1a")),
  lineStart("l2b"),
  lineStart("l3b"),
  lineStart("l4b"),
  lineStart("l5b"),
];

// ---------------------------------------------------------------------------
// Bodies. `Body` is an actor's root: x (hips), y (feet offset), tilt about the
// hips (pivot HIP). `onBody` maps a point given relative to the upright actor's
// feet (x toward its facing-right front) into the world, so stuck darts ride
// along when the body tumbles and lies down.
// ---------------------------------------------------------------------------
export interface Body {
  x: number;
  y: number;
  tilt: number;
}
export interface Shot {
  pos: Vec3;
  /** Nose direction in the x-y plane (0 = +x). */
  angle: number;
}

export const onBody = (b: Body, [bx, by]: readonly [number, number], z: number, angle: number): Shot => {
  const c = Math.cos(b.tilt);
  const s = Math.sin(b.tilt);
  const dy = by - HIP;
  return { pos: [b.x + c * bx - s * dy, b.y + HIP + s * bx + c * dy, z], angle: angle + b.tilt };
};

/** Knocked over between `at` and `at + len`, then lying with a settle bounce. */
const topple = (f: number, at: number, len: number, x0: number, x1: number, tilt1: number, lieY: number): Body => {
  const t = easeOutCubic(progress(f, [at, at + len]));
  if (f < at + len) return { x: lerp(x0, x1, t), y: lerp(0, lieY - HIP, t) + arc(t, 0.3), tilt: lerp(0, tilt1, t) };
  return { x: x1, y: lieY - HIP + bump(f, at + len, 7, 0.1), tilt: tilt1 };
};

/** Linear flight from a to b over [f0, f1]; null before launch. */
const fly = (f: number, a: Vec3, b: Vec3, f0: number, f1: number): Shot | null => {
  if (f < f0) return null;
  return { pos: lerp3(a, b, progress(f, [f0, f1])), angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
};

/** Heading of any path at frame f from a central difference. */
const heading = (path: (f: number) => Vec3, f: number) => {
  const a = path(f - 0.5);
  const b = path(f + 0.5);
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};

// --- Goblin: walks onto the plate on "trigger", blown back on "pin-cushion".
export const GOBLIN_WALK: [number, number] = [
  BEATS.goblinTrigger - Math.round((PLATE_X - GOBLIN_X0) / WALK),
  BEATS.goblinTrigger,
];
export const goblinBody = (f: number): Body => {
  if (f < BEATS.goblinHit) {
    return { x: lerp(GOBLIN_X0, PLATE_X, progress(f, GOBLIN_WALK)), y: 0, tilt: 0 };
  }
  return topple(f, BEATS.goblinHit, 10, PLATE_X, GOBLIN_DEAD_X, Math.PI / 2, lieHeight("goblin"));
};
export const goblinX = (f: number) => goblinBody(f).x;

/** One dart per low nozzle (rows 0-3). Each flies straight down its row and sticks in his chest. */
export const GOBLIN_DARTS = 8;
const GOBLIN_DART_DELAY = [0, 1, 0, 2, 1, 0, 2, 1];
export const goblinDart = (n: number, f: number): Shot | null => {
  const [nx, ny, nz] = NOZZLES[n];
  const hit = BEATS.goblinHit + GOBLIN_DART_DELAY[n];
  const stuck = (frame: number) => onBody(goblinBody(frame), [0.14, ny], nz, Math.PI);
  if (f >= hit) return stuck(f);
  const target = stuck(hit).pos;
  const fire = hit - Math.round((nx - target[0]) / 0.3);
  return fly(f, [nx, ny, nz], target, fire, hit);
};

// --- Rogue: sprints in, hops the corpse onto the plate, bends back under the
// slow-motion volley (the "matrix" pose), then a backflip leap over the bat
// burst back to the left, hit from behind.
export const ROGUE_HOP: [number, number] = [BEATS.rogueOnPlate - 22, BEATS.rogueOnPlate];
const ROGUE_SPRINT = 0.17;
export const ROGUE_RUN: [number, number] = [
  Math.max(BEATS.goblinHit + 16, ROGUE_HOP[0] - Math.round((ROGUE_HOP_X - ENTRY_X) / ROGUE_SPRINT)),
  ROGUE_HOP[0],
];
/** First frame the rogue is clear of the exit glow: cut to him then. */
export const ROGUE_ON_CAMERA =
  ROGUE_RUN[0] + Math.round(((ROGUE_RUN[1] - ROGUE_RUN[0]) * 1.8) / (ROGUE_HOP_X - ENTRY_X));
export const ROGUE_LEAP: [number, number] = [BEATS.rogueLeap, BEATS.rogueLeap + 38];

const flipBody = (f: number, win: readonly [number, number], x0: number, x1: number, h: number): Body => {
  const t = progress(f, win);
  return { x: lerp(x0, x1, easeInOut(t)), y: arc(t, h), tilt: Math.PI * 2 * easeInOut(t) };
};

export const rogueBody = (f: number): Body => {
  if (f < ROGUE_RUN[1]) return { x: lerp(ENTRY_X, ROGUE_HOP_X, progress(f, ROGUE_RUN)), y: 0, tilt: 0 };
  if (f < ROGUE_HOP[1]) {
    const t = progress(f, ROGUE_HOP);
    return { x: lerp(ROGUE_HOP_X, ROGUE_PLATE_X, t), y: arc(t, 1.2), tilt: 0 };
  }
  if (f < ROGUE_LEAP[0]) return { x: ROGUE_PLATE_X, y: 0, tilt: 0 };
  if (f < ROGUE_LEAP[1]) return flipBody(f, ROGUE_LEAP, ROGUE_PLATE_X, ROGUE_LAND_X, 1.9);
  if (f < BEATS.rogueHit) return { x: ROGUE_LAND_X, y: 0, tilt: 0 };
  return topple(f, BEATS.rogueHit, 9, ROGUE_LAND_X, ROGUE_DEAD_X, -Math.PI / 2, lieHeight("rogue"));
};
export const rogueX = (f: number) => rogueBody(f).x;

/**
 * The high volley, in bullet time: six darts from the top rows leave at full
 * speed on "Matrix-dodge", slow to a crawl as they pass inches over the
 * bent-back rogue, then snap back to speed and zip off down the hall.
 * Darts follow each other in three ranks (`rank` lag along the path).
 */
export const DODGE_DARTS = 6;
const DODGE_FAST = 0.32;
const DODGE_SLOW = 0.036;
/** Slow-motion stretch of the path, in distance travelled from the nozzle. */
const SLOW_FROM = NOZZLE_X - (ROGUE_PLATE_X + 0.6);
const SLOW_TO = NOZZLE_X - (ROGUE_PLATE_X - 1.5) + 0.7;
export const SLOWMO: [number, number] = [
  BEATS.matrix + Math.round(SLOW_FROM / DODGE_FAST),
  BEATS.matrix + Math.round(SLOW_FROM / DODGE_FAST + (SLOW_TO - SLOW_FROM) / DODGE_SLOW),
];
const dodgeTravel = (f: number) => {
  if (f < BEATS.matrix) return -1;
  if (f < SLOWMO[0]) return DODGE_FAST * (f - BEATS.matrix);
  if (f < SLOWMO[1]) return lerp(SLOW_FROM, SLOW_TO, progress(f, SLOWMO));
  return SLOW_TO + DODGE_FAST * (f - SLOWMO[1]);
};
export const dodgeDart = (n: number, f: number): Shot | null => {
  const [nx, ny, nz] = NOZZLES[10 + n];
  const s = dodgeTravel(f) - (n % 3) * 0.35;
  if (s < 0) return null;
  const x = nx - s;
  if (x < ENTRY_X - 2) return null;
  return { pos: [x, ny, nz], angle: Math.PI };
};
/** True while a dart crawls through the slow-motion stretch (for the ripple wake). */
export const dodgeSlow = (f: number) => f >= SLOWMO[0] && f < SLOWMO[1];

/**
 * Bat darts: a low burst passes under the backflip leap, overshoots, makes a
 * U-turn above the hall and dives into the rogue's back on "behind".
 */
export const ROGUE_BATS = 6;
const BAT_SPEED = 0.28;
const BAT_A_END = BEATS.batFire + Math.round((NOZZLE_X + 0.4) / BAT_SPEED);
const BAT_B_END = BEATS.uTurn + 8;
const rogueBatHit = (i: number) => BEATS.rogueHit + (i % 3);
const rogueBatLocal = (i: number): [number, number] => [-0.2, 0.74 + 0.08 * i];
const rogueBatPath = (i: number) => {
  const [nx, ny, nz] = NOZZLES[i + 1];
  const lift = 0.15 * (i % 3);
  // The burst flies a little in front of the corpses (toward camera), then curls back onto the action plane.
  const aEnd: Vec3 = [-0.6 - 0.2 * (i % 3), ny + 0.75, nz + 0.45];
  const bEnd: Vec3 = [-0.7, 2.45 + lift, nz + 0.2];
  const hit = rogueBatHit(i);
  const target = onBody(rogueBody(hit), rogueBatLocal(i), nz, 0).pos;
  return (f: number): Vec3 => {
    if (f < BAT_A_END) return lerp3([nx, ny, nz], aEnd, progress(f, [BEATS.batFire + i, BAT_A_END]));
    if (f < BAT_B_END) {
      return bezier3(aEnd, [-2.3, ny + 0.2, nz + 0.45], [-2.3, 2.45 + lift, nz + 0.3], bEnd, progress(f, [BAT_A_END, BAT_B_END]));
    }
    return bezier3(bEnd, [0.2, 2.6 + lift, nz], [target[0] - 0.9, target[1] + 0.1, nz], target, progress(f, [BAT_B_END, hit]));
  };
};
export const rogueBat = (i: number, f: number): Shot | null => {
  if (f < BEATS.batFire + i) return null;
  const hit = rogueBatHit(i);
  if (f >= hit) return onBody(rogueBody(f), rogueBatLocal(i), NOZZLES[i + 1][2], 0);
  const path = rogueBatPath(i);
  return { pos: path(f), angle: heading(path, f) };
};

// --- Paladin: walks in, raises the shield, bats ricochet off and rain down.
const PALADIN_PACE = 0.105;
export const PALADIN_WALK: [number, number] = [
  Math.max(BEATS.rogueHit + 14, BEATS.shieldUp - 4 - Math.round((PALADIN_X - ENTRY_X) / PALADIN_PACE)),
  BEATS.shieldUp - 4,
];
export const PALADIN_ON_CAMERA =
  PALADIN_WALK[0] + Math.round(((PALADIN_WALK[1] - PALADIN_WALK[0]) * 1.8) / (PALADIN_X - ENTRY_X));
/** Animation speed that matches his ground pace (no foot skating). */
export const PALADIN_STRIDE = (PALADIN_X - ENTRY_X) / (PALADIN_WALK[1] - PALADIN_WALK[0]) / WALK;
const PALADIN_PUSHED_X = PALADIN_X - 0.15;

export const paladinBody = (f: number): Body => {
  if (f < PALADIN_WALK[1]) return { x: lerp(ENTRY_X, PALADIN_X, progress(f, PALADIN_WALK)), y: 0, tilt: 0 };
  if (f < BEATS.harpoonHit) return { x: PALADIN_X, y: 0, tilt: 0 };
  if (f < BEATS.reel) {
    const t = easeOutCubic(progress(f, [BEATS.harpoonHit, BEATS.harpoonHit + 6]));
    return { x: lerp(PALADIN_X, PALADIN_PUSHED_X, t), y: 0, tilt: 0.25 * t };
  }
  if (f < BEATS.pin) {
    // Yanked up and across toward the winch, clearing the corpses and the ballista.
    const t = progress(f, [BEATS.reel, BEATS.pin]);
    return {
      x: lerp(PALADIN_PUSHED_X, PIN_X, t * t),
      y: PIN_Y * Math.sin((t * Math.PI) / 2),
      tilt: -0.55 * Math.sin(Math.PI * t),
    };
  }
  return { x: PIN_X, y: PIN_Y + bump(f, BEATS.pin, 6, -0.08), tilt: 0 };
};
export const paladinX = (f: number) => paladinBody(f).x;

/** 3 waves of 3 bats, one wave per beat from "bounce" to "rain". */
export const PALADIN_BATS = 9;
const PALADIN_BAT_GAP = Math.round((BEATS.rain - BEATS.bounce) / 2);
export const paladinBatHit = (k: number) => BEATS.bounce + PALADIN_BAT_GAP * Math.floor(k / 3) + (k % 3);
export const paladinBat = (k: number, f: number): Shot | null => {
  const wave = Math.floor(k / 3);
  const j = k % 3;
  const [nx, ny, nz] = NOZZLES[2 + j * 2];
  const hit = paladinBatHit(k);
  const fire = BEATS.paladinBatFire + PALADIN_BAT_GAP * wave + j;
  if (f < fire) return null;
  const tz = Z + 0.14 * (j - 1);
  const target: Vec3 = [SHIELD_X + 0.04, 0.78 + 0.2 * j + 0.06 * wave, tz];
  if (f < hit) {
    // Homing arc over the corpses into the shield face.
    const path = (ff: number): Vec3 => {
      const t = progress(ff, [fire, hit]);
      const p = lerp3([nx, ny, nz], target, t);
      return [p[0], p[1] + arc(t, 0.55 + 0.1 * j), p[2]];
    };
    return { pos: path(f), angle: heading(path, f) };
  }
  // Ricochet: kicked up and back, tumbling, then lying on the floor like rain.
  const vx = 0.022 + 0.006 * j;
  const vy = 0.12;
  const g = 0.0065;
  const land = (vy + Math.sqrt(vy * vy + 4 * g * (target[1] - 0.04))) / (2 * g);
  const dt = Math.min(f - hit, land);
  const pos: Vec3 = [target[0] + vx * dt, target[1] + vy * dt - g * dt * dt, tz + 0.01 * dt * (j - 1)];
  return { pos, angle: f - hit < land ? Math.PI + (f - hit) * 0.55 : (j % 2) * Math.PI };
};

// --- Harpoon 1: punches through shield and paladin, then rides him to the wall.
const harpoonLocal: [number, number] = [-0.42, BOLT_Y];
export const harpoon1 = (f: number): Shot | null => {
  if (f < BEATS.ballistaFire) return null;
  if (f < BEATS.harpoonHit) {
    return fly(f, [MUZZLE_X, BOLT_Y, Z], [SHIELD_X, BOLT_Y, Z], BEATS.ballistaFire, BEATS.harpoonHit);
  }
  const attached = onBody(paladinBody(f), harpoonLocal, Z, Math.PI);
  if (f >= BEATS.harpoonHit + 3) return attached;
  // Punching through: from the shield face to its final depth in 3 frames.
  const t = progress(f, [BEATS.harpoonHit, BEATS.harpoonHit + 3]);
  return { pos: [lerp(SHIELD_X, attached.pos[0], t), attached.pos[1], Z], angle: attached.angle };
};
/** Tail end of a harpoon (where the cable attaches). */
export const harpoonTail = (s: Shot): Vec3 => [
  s.pos[0] - Math.cos(s.angle) * HARPOON_LEN,
  s.pos[1] - Math.sin(s.angle) * HARPOON_LEN,
  s.pos[2],
];

// --- Mage: jogs in, casts the cyclone, deflects harpoon 2, blasted out of his boots.
const MAGE_PACE = 0.12;
export const MAGE_WALK: [number, number] = [
  Math.max(BEATS.pin + 14, BEATS.mageCast - Math.round((MAGE_X - ENTRY_X) / MAGE_PACE)),
  BEATS.mageCast,
];
export const MAGE_ON_CAMERA = MAGE_WALK[0] + Math.round(((MAGE_WALK[1] - MAGE_WALK[0]) * 1.8) / (MAGE_X - ENTRY_X));
export const MAGE_STRIDE = (MAGE_X - ENTRY_X) / (MAGE_WALK[1] - MAGE_WALK[0]) / WALK;
export const MAGE_FLIGHT: [number, number] = [BEATS.mageBlasted, BEATS.mageBlasted + 32];
export const mageBody = (f: number): Body => {
  if (f < MAGE_WALK[1]) return { x: lerp(ENTRY_X, MAGE_X, progress(f, MAGE_WALK)), y: 0, tilt: 0 };
  if (f < BEATS.mageBlasted) return { x: MAGE_X, y: 0, tilt: 0 };
  const t = progress(f, MAGE_FLIGHT);
  return { x: lerp(MAGE_X, MAGE_X - 1.6, t), y: 8.5 * t * (1.4 - 0.4 * t), tilt: 5 * Math.PI * t };
};
export const mageX = (f: number) => mageBody(f).x;

/** Harpoon 2: deflected by the cyclone, spins up and sticks in the ceiling. */
export const harpoon2 = (f: number): Shot | null => {
  const edge: Vec3 = [MAGE_X + CYCLONE_R, BOLT_Y + 0.05, Z];
  if (f < BEATS.deflect) return fly(f, [MUZZLE_X, BOLT_Y + 0.05, Z], edge, BEATS.ballistaFire2, BEATS.deflect);
  const t = progress(f, [BEATS.deflect, BEATS.deflect + 16]);
  const stuckAngle = Math.PI * 0.62;
  const pos = bezier(edge, [MAGE_X + 0.4, CEILING_Y - 0.4, Z], [MAGE_X - 1.6, CEILING_Y - 0.25, Z + 0.3], easeOutCubic(t));
  return { pos, angle: t < 1 ? Math.PI + t * Math.PI * 3.62 : stuckAngle };
};

/** Coilgun slug 1: punches into the vortex, is spun around inside it, flung out on "shattering". */
export const slug1 = (f: number): Shot | null => {
  if (f < BEATS.coilFire) return null;
  if (f < BEATS.slugHit) {
    return fly(f, [COIL_MUZZLE_X, CYCLONE_Y, Z], [MAGE_X + CYCLONE_R, CYCLONE_Y, Z], BEATS.coilFire, BEATS.slugHit);
  }
  if (f < BEATS.shatter) {
    const t = progress(f, [BEATS.slugHit, BEATS.shatter]);
    const phi = t * Math.PI * 7;
    const r = lerp(CYCLONE_R, 0.62, t);
    return {
      pos: [MAGE_X + r * Math.cos(phi), CYCLONE_Y + 0.12 * Math.sin(phi * 2), Z + r * Math.sin(phi)],
      angle: Math.PI / 2 + phi,
    };
  }
  const t = progress(f, [BEATS.shatter, BEATS.shatter + 12]);
  if (t >= 1) return null;
  return { pos: [lerp(MAGE_X + 0.62, MAGE_X + 4.5, t), lerp(CYCLONE_Y, 6.5, t), Z], angle: 0.9 };
};
/** Slug 2: straight into his chest on "blasting". */
export const slug2 = (f: number): Shot | null => {
  if (f >= BEATS.mageBlasted + 2) return null;
  return fly(f, [COIL_MUZZLE_X, CYCLONE_Y, Z], [MAGE_X + 0.2, 0.95, Z], BEATS.coilFire2, BEATS.mageBlasted);
};

// --- Level 5: the barricade, the plate, the rams and the flight into the mimic.
export const CART_PUSH: [number, number] = [Math.max(BEATS.boots + 30, lineStart("l5a") - 12), BEATS.hide];
export const CART_CREEP: [number, number] = [BEATS.creep, BEATS.cartTrigger];
export const CART_STRIDE = (CART_HIDE_X - CART_START_X) / (CART_PUSH[1] - CART_PUSH[0]) / WALK;
export const cartX = (f: number) => {
  if (f < CART_PUSH[1]) return lerp(CART_START_X, CART_HIDE_X, progress(f, CART_PUSH));
  return lerp(CART_HIDE_X, CART_TRIGGER_X, easeInOut(progress(f, CART_CREEP)));
};
/** The party flies off the rams and lands in the mimic's mouth just before the chomp. */
export const PARTY_FLIGHT: [number, number] = [BEATS.ramPunch, BEATS.mimicChomp - 7];
export const partyFlight = (i: number, f: number): Body => {
  const t = progress(f, PARTY_FLIGHT);
  const p = PARTY[i];
  const x0 = CART_TRIGGER_X + p.dx;
  return {
    x: lerp(x0, MIMIC_MOUTH[0] - 0.25 + 0.25 * i, t),
    y: lerp(0, MIMIC_MOUTH[1] - 0.3, t) + arc(t, 3.0 + 0.25 * i),
    tilt: -Math.PI * (2 + i * 0.5) * t,
  };
};
export const partyFlightCenter = (f: number): Vec3 => {
  const b = partyFlight(1, f);
  return [b.x, b.y + 0.9, Z];
};
