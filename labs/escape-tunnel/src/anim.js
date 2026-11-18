// "How a Prison Bed Becomes an Escape Tunnel": the whole short as pure functions of the frame (30 fps).
// Every beat is keyed to a spoken word (w(line, word)), so the picture stays locked to the voice
// (scripts/escape-tunnel-audio.py writes the cues).
// The shape is a strict But / So chain with no title card and no end stamp; the last
// picture loops into the first.
//   l1  dig under your bed: the guards find it. So the shaft starts under the hot stove
//   l2  the sand is yellow and the yard is grey. So it goes out in bags inside your trousers
//   l3  sand caves in. So the bed boards line the walls
//   l4  thirty feet down the air runs out. So a kit-bag pump and a pipe of milk tins
//   l5  crawling takes all night. So wooden rails and a trolley on a rope
//   l6  up the last ladder, through the grass: short of the trees, beside the guard tower
import cues from "./data/narrationCues.json";
import { BODY } from "./soldier.js";
import { DEPTH, BED_X, STOVE_X, EXIT_X, GALLERY, TOWER, PIT, PILE, FLOOR_Y, BAYS, TIN_STEP, SLEEPER_STEP, GAP_DASHES, TREES_X } from "./set.js";

export const FPS = 30;
export const LINES = ["l1a", "l1b", "l2a", "l2b", "l3a", "l4a", "l5a", "l6a", "l6b", "end"];

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
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const bump = (f, at, len) => (f >= at && f < at + len ? Math.sin((Math.PI * (f - at)) / len) : 0);
const easeOutBack = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
const FACE_CAMERA = 0, FACE_RIGHT = Math.PI / 2, FACE_LEFT = -Math.PI / 2;
const galleryX = (g) => lerp(GALLERY[0], GALLERY[1], g);

// --- beats -------------------------------------------------------------------------------------
export const B = {
  dig: w("l1a", "dig"),
  bed: w("l1a", "bed,"),
  escape: w("l1a", "escape"),
  tunnel: w("l1a", "tunnel."),
  guards: w("l1b", "guards"),
  search: w("l1b", "search"),
  every: w("l1b", "every"),
  floor: w("l1b", "floor."),
  so1: w("l1b", "so"),
  under1: w("l1b", "under"),
  hot: w("l1b", "hot"),
  stove: w("l1b", "stove,"),
  where: w("l1b", "where"),
  nobody: w("l1b", "nobody"),
  puts: w("l1b", "puts"),
  hand: w("l1b", "hand."),
  sand: w("l2a", "sand"),
  yellow: w("l2a", "yellow,"),
  yard: w("l2a", "yard"),
  so2: w("l2b", "so"),
  carry: w("l2b", "carry"),
  trousers: w("l2b", "trousers,"),
  shake: w("l2b", "shake"),
  walk: w("l2b", "walk."),
  caves: w("l3a", "caves"),
  so3: w("l3a", "so"),
  everyBed: w("l3a", "bed"),
  boards: w("l3a", "boards"),
  line: w("l3a", "line"),
  walls: w("l3a", "walls."),
  thirty: w("l4a", "thirty"),
  air: w("l4a", "air"),
  out: w("l4a", "out."),
  so4: w("l4a", "so"),
  pump: w("l4a", "pump"),
  pushes: w("l4a", "pushes"),
  pipe: w("l4a", "pipe"),
  tins: w("l4a", "tins."),
  crawling: w("l5a", "crawling"),
  night5: w("l5a", "night."),
  so5: w("l5a", "so"),
  rails: w("l5a", "rails,"),
  ride: w("l5a", "ride"),
  rope: w("l5a", "rope."),
  climb: w("l6a", "climb"),
  ladder: w("l6a", "ladder,"),
  push: w("l6a", "push"),
  grass: w("l6a", "grass,"),
  short: w("l6b", "short"),
  trees: w("l6b", "trees,"),
  beside: w("l6b", "beside"),
  tower: w("l6b", "tower."),
};

export const FRAMES = cues.durationFrames + 4; // the cut back to frame 0 is the loop
export const NARRATION_END = FRAMES;

// scene starts (hard cuts hide every reset)
const CUT = {
  l1b: lineStart("l1b") - 6,
  stove: B.so1 - 4,
  ferret: B.where - 4,
  l2a: lineStart("l2a") - 6,
  dump: B.yellow - 4,
  l2b: lineStart("l2b") - 4,
  l3a: lineStart("l3a") - 6,
  bunks: B.everyBed - 6,
  shore: B.line - 6,
  l4a: lineStart("l4a") - 6,
  pump: B.so4 - 4,
  l5a: lineStart("l5a") - 6,
  rails: B.so5 - 4,
  l6a: lineStart("l6a") - 8,
  l6b: lineStart("l6b") - 2,
  towerCut: B.beside - 4,
};

// --- line 1: the hut ------------------------------------------------------------------------------
// l1a  already digging at frame 0, in a pit under the bunk; on "tunnel" you stand up and hit the bed
// l1b  the ferret's rod taps along the floor, and the third tap is hollow: found
// So   the stove slides aside on its slab and the shaft is under it; the ferret comes back, taps
//      all round it, puts a hand on the stove and leaves blowing on his fingers
const L1 = {
  rise: B.tunnel - 7,                  // you jump up...
  bonk: B.tunnel,                      // ...into the bunk
  enter: B.guards - 8,
  taps: [B.search, B.every, B.floor],  // tok, tok, THUNK
  found: B.floor + 8,                  // the red ring
  flip: B.floor + 14,                  // the rod flips the loose boards up
  shut: B.floor + 31,                  // ...and you reach up and pull them down again
  lean: B.under1,                      // a lean back before the shove
  slide: [B.hot, B.stove + 8],
  taps3: [B.where + 2, B.where + 11],
  reach: B.puts - 6,
  burn: B.hand,
  leave: B.hand + 12,
};
const FERRET_Z = -0.72;  // by the stove (So)
const FERRET_Z1 = -0.12; // l1b: he walks along the cut, in front of the stove
const FERRET_X = [BED_X + 3.3, BED_X + 2.15, BED_X + 1.75, BED_X + 1.4]; // in at the door, then one stop per tap
const FERRET3_X = STOVE_X + 0.86;      // by the stove, an arm's length from it

// --- how far each hole is dug --------------------------------------------------------------------
const pit = (f) => (f >= CUT.stove ? 0 : lerp(0.5, 1, easeInOut(prog(f, 0, B.bed + 12))));
const SHAFT1 = 0.27; // how deep the shaft is when the stove first slides off it (deep enough to crouch in)
const shaft = (f) => (f < CUT.stove ? 0 : f < CUT.l2a ? SHAFT1 : f >= CUT.dump ? 1 : lerp(SHAFT1, 0.5, prog(f, CUT.l2a, CUT.dump)));
const stoveOff = (f) => (f >= CUT.bunks && f < CUT.shore) || (f >= CUT.l4a && f < CUT.face4); // later shots with the trap open
const stoveSlide = (f) => (stoveOff(f) ? 1 : f < CUT.stove || f >= CUT.ferret ? 0 : easeOutCubic(prog(f, ...L1.slide)));

// the ferret's walk in line 1: x at frame f (he stops for each tap)
function ferretX(f) {
  const [x0, x1, x2, x3] = FERRET_X, [t1, t2, t3] = L1.taps;
  if (f < t1 - 6) return lerp(x0, x1, prog(f, L1.enter, t1 - 6));
  if (f < t2 - 5) return lerp(x1, x2, easeInOut(prog(f, t1 + 2, t2 - 5)));
  return lerp(x2, x3, easeInOut(prog(f, t2 + 2, t3 - 5)));
}
// his probe rod: from the hand (a) to the tip (b); the tip comes down on every tap
function rodAt(f) {
  if (f >= L1.enter && f < CUT.stove) {
    const x = ferretX(f);
    const lift = Math.min(1, ...L1.taps.map((t) => Math.abs(f - t) / 5));
    const hook = easeInOut(prog(f, L1.flip - 3, L1.flip + 8)); // the tip lifts the boards
    return { a: [x - 0.38, 1.02, FERRET_Z1 - 0.1], b: [x - 1.02, FLOOR_Y + 0.02 + 0.3 * lift * (1 - hook) + 0.5 * hook, FERRET_Z1 - 0.3] };
  }
  if (f >= CUT.ferret && f < L1.leave) {
    const lift = Math.min(1, ...L1.taps3.map((t) => Math.abs(f - t) / 4));
    const x = FERRET3_X;
    if (f < L1.reach) return { a: [x - 0.38, 1.02, FERRET_Z + 0.22], b: [x - 0.2 - 0.5 * prog(f, L1.taps3[0], L1.taps3[1]), FLOOR_Y + 0.02 + 0.25 * lift, FERRET_Z + 0.5] };
    return { a: [x + 0.3, 1.1, FERRET_Z - 0.1], b: [x + 0.36, FLOOR_Y, FERRET_Z - 0.1] }; // planted beside him
  }
  return null;
}
const boardsOverPit = (f) => {
  if (f < CUT.l1b) return null; // out of the way while you dig
  if (f >= CUT.stove) return { y: 0, rot: 0 };
  const peek = f < L1.taps[0] - 8 ? 0.07 + 0.015 * Math.sin(f * 0.5) : 0; // you peep out from under them, then duck
  return { y: peek, rot: 1.25 * easeOutBack(prog(f, L1.flip, L1.flip + 9)) * (1 - easeInOut(prog(f, L1.shut, L1.shut + 6))) };
};
// --- lines 2 to 6: more beats and cuts ---------------------------------------------------------------
Object.assign(B, {
  bright: w("l2a", "bright"),
  dark: w("l2a", "dark"),
  grey: w("l2a", "grey."),
  bags: w("l2b", "bags"),
  inside: w("l2b", "inside"),
  and2: w("l2b", "and"),
  loose: w("l2b", "loose"),
  cavesIn: w("l3a", "in."),
  gives: w("l3a", "gives"),
  feet: w("l4a", "feet"),
  down: w("l4a", "down,"),
  the4: w("l4a", "the"),
  runs: w("l4a", "runs"),
  kit: w("l4a", "kit"),
  through: w("l4a", "through"),
  football: w("l5a", "football"),
  all: w("l5a", "all"),
  lay: w("l5a", "lay"),
  trolley: w("l5a", "trolley"),
  one: w("l6a", "one"),
  up: w("l6a", "up"),
  just: w("l6b", "just"),
  guard: w("l6b", "guard"),
  so6: w("end", "so."),
  run: w("end", "run,"),
  go: w("end", "go"),
  down6: w("end", "down?"),
});
Object.assign(CUT, {
  dump: B.bright - 2,      // l2a: from the shaft to the yard
  walk2: B.and2 - 6,       // l2b: he sets off
  bunks: B.so3 - 4,        // l3: the hut's bunks
  shore: B.line - 6,       // l3: back down, the boards go in
  face4: B.the4 - 6,       // l4: at the face, the air runs out
  pump: B.so4 - 4,
  pipeCut: B.through - 6,  // l4: along the pipe
  rails: B.so5 - 4,
  rideCut: B.ride - 4,
  top: B.push - 8,         // l6: at the surface
  towerCut: B.beside - 4,
  endCut: B.so6 - 8,       // the ending: close on you in the light
});

// --- line 2: the yard -------------------------------------------------------------------------------
// l2a  down the shaft the sand is bright yellow; you tip a sack of it on the dark grey yard, admire
//      it, look round, and try to stand in front of it
// l2b  the bags inside the trousers light up (an x-ray flash); hands in pockets, and you waddle off
//      trickling sand, with a mate behind to scuff it in
const DUMP_AT = [1.5, -1.6];
const YARD_X = DUMP_AT[0] - 1.0, YARD_Z = DUMP_AT[1] + 0.25; // where you stand to tip it
const HEAP_TOP = 0.2;                                        // the heap, once you have landed on it
const L2 = {
  tip: [CUT.dump, B.yellow],        // the sack goes over
  proud: B.yellow + 10,
  look: [B.yard - 4, B.yard + 5, B.dark - 2], // left, right, oh no
  ring: B.dark,
  crouch: B.grey - 10,                // oh no: a crouch...
  dive: [B.grey - 5, B.grey + 2],     // ...and a belly flop on top of it
  xray: [B.bags - 4, B.trousers + 12],
  pockets: B.inside,
  trickle: B.shake,
};
const PENGUIN_Z = DUMP_AT[1] + 0.45, PENGUIN_X0 = DUMP_AT[0] - 1.15, WADDLE = 0.05; // units a frame
const penguinX = (f) => PENGUIN_X0 + Math.max(0, f - CUT.walk2) * WADDLE;
const STEPS = Array.from({ length: 16 }, (_, i) => L2.trickle + i * 4).filter((t) => t < lineStart("l3a") - 8);
const trailAt = (f) => STEPS.map((t, i) => (f < t || f >= CUT.l3a ? null : {
  x: penguinX(t) - 0.05, z: PENGUIN_Z + (i % 2 ? 0.11 : -0.11),
  k: easeOutCubic(prog(f, t, t + 5)) * (1 - prog(f, t + 24, t + 46)), // trickled, then scuffed into the grey
}));

// --- line 3: the cave-in and the bed boards ---------------------------------------------------------
const GAL = { l3: 0.16, l3end: 0.3, l4: 0.5, l5: 0.985 };
const L3 = {
  fall: B.caves,                                  // the roof lets go
  launches: Array.from({ length: 6 }, (_, i) => B.everyBed - 8 + i * 9), // a board leaves a bunk
  flight: 16,
  sag: B.gives + 2,                               // the top bunk drops onto the bottom one...
  crash: B.gives + 16,                            // ...and both go through to the floor
  sagOld: 0,                              // the top bunk gives way under your mate
};
// --- line 4: the air ----------------------------------------------------------------------------------
const L4 = {
  climb: [CUT.l4a, B.down + 14],                  // down the ladder, thirty feet
  wilt: [B.the4, B.out + 4],                      // the lamp gutters, and so do you
  flop: B.runs,
  stroke: 0.3,                                    // pump phase per frame
  pipe: [B.through - 4, B.tins - 2],                // the tins click out to the face
  puff: B.tins + 8,
};
// --- line 5: the crawl, the rails, the ride -----------------------------------------------------------
const CRAWL_X0 = GALLERY[0] + 2.4, CRAWL = 0.03;
const TROLLEY_X = [GALLERY[0] + 1.3, GALLERY[1] - 2.4];
const L5 = {
  flop: B.all + 6,
  rails: [CUT.rails + 4, B.rails + 6],
  drop: B.rails + 8,                              // the trolley lands on the rails
  on: B.rails + 14,                               // you are on it
  snap: B.ride,                                   // the rope goes tight
  ride: [B.ride + 2, CUT.l6a - 3],
};
// --- line 6: out ------------------------------------------------------------------------------------
const HEAD_OUT = -0.98; // your feet on the ladder when your head and shoulders are through the turf
const L6 = {
  climb: [CUT.l6a + 4, B.push - 2],
  lift: [B.push, B.grass - 2],                    // the square of turf goes up
  whip: [B.short - 5, B.short + 7],               // from your face to the trees
  dashes: [B.short + 4, B.trees + 4],
  turn: B.guard - 8,                              // the sentry turns
  light: [B.guard - 6, B.tower - 1],              // the beam swings onto you
  caught: B.tower,
  glance: [B.run - 4, B.go - 8],                  // the trees... no
  sink: [B.go - 2, B.down6 + 6],                  // back down, pulling the turf over your head
  peek: lineEnd("end") + 10,                      // one eye out, and it loops
};

// --- how far the gallery is dug, and what is in it -----------------------------------------------------
function gallery(f) {
  if (f < CUT.l3a) return 0;
  if (f < L3.fall) return lerp(0.1, GAL.l3, prog(f, CUT.l3a, L3.fall));
  if (f < CUT.shore) return GAL.l3;
  if (f < CUT.l4a) return lerp(GAL.l3, GAL.l3end, easeInOut(prog(f, CUT.shore + 6, lineEnd("l3a") + 6)));
  if (f < CUT.l5a) return GAL.l4;
  return GAL.l5;
}
const shore = (f) => (f < CUT.shore ? 0 : f < CUT.l4a ? (gallery(f) - 0.035) * easeInOut(prog(f, CUT.shore + 2, B.walls + 8)) : gallery(f) - 0.03);
const pipeLen = (f) => (f < L4.pipe[0] ? 0 : (gallery(f) - 0.02) * (f < CUT.l5a ? easeInOut(prog(f, ...L4.pipe)) : 1));
const railLen = (f) => (f < L5.rails[0] ? 0 : gallery(f) * (f < CUT.rideCut ? 0.42 * easeOutCubic(prog(f, ...L5.rails)) : 1));
const rideT = (f) => easeInOut(prog(f, ...L5.ride));
const trolleyX = (f) => (f < L5.drop - 8 || f >= CUT.l6a ? null : lerp(...TROLLEY_X, rideT(f)));
const trolleyY = (f) => (f < L5.drop ? 1.1 * Math.pow(1 - prog(f, L5.drop - 8, L5.drop), 2) : 0.05 * bump(f, L5.drop, 6));
const pumpStroke = (f) => 0.5 - 0.5 * Math.cos((f - CUT.pump) * L4.stroke);
const air = (f) => (f < L4.wilt[0] || f >= L4.puff + 10 ? 1 : f < L4.puff ? lerp(1, 0.22, easeInOut(prog(f, ...L4.wilt))) : lerp(0.22, 1, prog(f, L4.puff, L4.puff + 10)));
const boardsLeft = (f) => (f < CUT.bunks ? 8 : Math.max(3, 8 - L3.launches.filter((t) => f >= t).length));
const SHAFT_MOUTH = [STOVE_X, FLOOR_Y + 0.25, Z_LINE()];
function Z_LINE() { return -0.62; }
// a bed board in the air: up off its bunk, over, and down the shaft
function flyerAt(f, i) {
  const t0 = L3.launches[i];
  if (f < t0 || f >= t0 + L3.flight + 8 || f < CUT.bunks || f >= CUT.shore) return null;
  const from = [BED_X - 0.6 + (i % 3) * 0.6, i % 2 ? 1.42 : 0.62, -0.6];
  const t = prog(f, t0, t0 + L3.flight);
  const drop = prog(f, t0 + L3.flight, t0 + L3.flight + 8);
  return { pos: [lerp(from[0], SHAFT_MOUTH[0], t), lerp(from[1], SHAFT_MOUTH[1], t) + 1.3 * Math.sin(Math.PI * t) - 2.2 * drop * drop, -0.6], rot: t * 7 + drop * 1.57 };
}
const fall = (f, at, h) => (f < at ? 0 : -h * Math.min(1, Math.pow((f - at) / 4, 2)) + 0.07 * bump(f, at + 4, 6));
const bunkDrop = (f) => (f >= CUT.shore || f < CUT.bunks ? 0 : fall(f, L3.crash, 0.42));       // the lower bed, to the floor
const bunkSag = (f) => (f >= CUT.shore || f < CUT.bunks ? 0 : fall(f, L3.sag, 0.6) + bunkDrop(f)); // the upper bed, onto it
const climbY4 = (f) => lerp(-0.7, -DEPTH, easeInOut(prog(f, ...L4.climb)));
const climbY6 = (f) => lerp(-DEPTH + 0.3, HEAD_OUT - 0.55, easeInOut(prog(f, ...L6.climb)));
const sinkT = (f) => easeInOut(prog(f, ...L6.sink));
const peekT = (f) => easeInOut(prog(f, L6.peek, L6.peek + 6));
const headY6 = (f) => (f < CUT.top ? climbY6(f) : lerp(HEAD_OUT - 0.55, HEAD_OUT, easeInOut(prog(f, L6.lift[0] + 4, L6.lift[1] + 6))) - 1.0 * sinkT(f) + 0.1 * peekT(f));
const lidOpen = (f) => easeOutBack(prog(f, ...L6.lift)) * (1 - easeInOut(prog(f, L6.sink[0] + 6, L6.sink[1] + 2))) + 0.14 * peekT(f);

const DAY = { night: 0, dawn: 0, sunDir: [-0.45, 0.72, 0.42], sunI: 3.6, sunColor: 0xfff0d6, skyI: 1.6, skyColor: 0x9cc2ec, groundColor: 0x6a5a40, fog: [80, 600] };
const NIGHT = { night: 1, dawn: 0, sunDir: [0.5, 0.6, -0.4], sunI: 2.6, sunColor: 0xcfe0ff, skyI: 1.15, skyColor: 0x6a84c0, groundColor: 0x1e2a44, fog: [50, 400] };
const LAMP_Y = -DEPTH + 0.7;
const TOWER_LAMP = [TOWER[0] + 0.9, TOWER[1] + 1.3, TOWER[2] + 1];

export function propsAt(f) {
  const g = gallery(f), front = galleryX(g), under = f >= CUT.l3a && f < CUT.top && !(f >= CUT.bunks && f < CUT.shore);
  const inHut = f < CUT.l2a || (f >= CUT.bunks && f < CUT.shore) || (f >= CUT.l4a && f < CUT.face4);
  const yardSack = f >= CUT.dump && f < CUT.l2b;
  const tipT = easeInOut(prog(f, L2.tip[0] + 2, L2.tip[1] - 2));
  const swing = easeInOut(prog(f, ...L6.light));
  const sweep = Math.sin((f - CUT.top) * 0.045);
  return {
    ...(f >= CUT.l6a ? NIGHT : DAY),
    night: f < CUT.l6a ? 0 : f < CUT.top ? lerp(0.25, 0.8, prog(f, ...L6.climb)) : 1, // the cold light comes down the shaft to meet you
    pit: pit(f),
    shaft: shaft(f),
    gallery: g,
    exit: f < CUT.l6a ? 0 : lerp(0.92, 1, prog(f, L6.lift[0], L6.lift[0] + 5)),
    lid: lidOpen(f),
    stove: stoveSlide(f),
    pad: f >= CUT.stove && f < CUT.ferret,
    hutLight: inHut ? 1 : 0,
    pitBoards: boardsOverPit(f),
    pile: f < CUT.stove ? 0.45 + 0.55 * pit(f) : 0,
    bunkJolt: 0.16 * bump(f, L1.bonk, 9) + bunkDrop(f),
    rod: rodAt(f),
    ring: f >= L1.found && f < CUT.stove ? { pos: [BED_X, -0.35, 0.05], k: easeOutBack(prog(f, L1.found, L1.found + 8)) }
      : f >= L2.ring && f < CUT.l2b ? { pos: [DUMP_AT[0], 0.5, DUMP_AT[1] + 0.9], k: 0.8 * easeOutBack(prog(f, L2.ring, L2.ring + 8)) } : null,
    // the yard
    dumpFlat: f >= L2.dive[1] && f < CUT.l2b ? 1 : 0,
    dump: f < L2.tip[1] - 3 || f >= CUT.walk2 ? 0 : f < CUT.l2b ? easeOutBack(prog(f, L2.tip[1] - 3, L2.tip[1] + 8), 1.2) : 1 - easeInOut(prog(f, CUT.l2b + 4, L2.xray[0])),
    dumpAt: DUMP_AT,
    sack: !yardSack ? null : f < L2.tip[1] + 6
      ? { pos: [YARD_X + 0.42 + 0.14 * tipT, 1.74 + 0.04 * tipT, YARD_Z], rot: -2.6 * tipT }
      : { pos: [YARD_X - 0.55, 0.16, YARD_Z - 0.2], rot: 1.45 },
    bags: f >= L2.xray[0] && f < L2.xray[1] ? { x: PENGUIN_X0, z: PENGUIN_Z, k: easeOutBack(prog(f, L2.xray[0], L2.xray[0] + 7)) * (1 - prog(f, L2.xray[1] - 6, L2.xray[1])) * (0.92 + 0.08 * Math.sin(f * 0.8)) } : null,
    trail: trailAt(f),
    // the hut again
    boards: boardsLeft(f),
    flyers: L3.launches.map((_, i) => flyerAt(f, i)),
    bunkSag: bunkSag(f),
    // the tunnel
    shore: shore(f),
    slump: f >= L3.fall && f < CUT.bunks ? { x: front - 1.55, k: easeOutBack(prog(f, L3.fall, L3.fall + 6), 1.2) } : null,
    pipe: pipeLen(f),
    pump: f >= CUT.pump,
    pumpStroke: f >= CUT.pump && f < CUT.l5a ? pumpStroke(f) : 0.5,
    air: air(f),
    rails: railLen(f),
    trolley: trolleyX(f),
    trolleyY: trolleyY(f),
    tow: f >= L5.on && f < CUT.l6a ? [(trolleyX(f) ?? 0) + 0.6, f < CUT.rideCut ? (trolleyX(f) ?? 0) + 2.4 : GALLERY[1] - 0.6] : null,
    // fat lamps: at the shaft foot, behind the digger, half way, and at the exit ladder
    lamps: f >= CUT.top ? [[EXIT_X, -2.7, -0.3]] : under || (f >= CUT.l4a && f < CUT.face4) ? [[GALLERY[0] + 0.4, LAMP_Y, -0.4], [front - 2.2, LAMP_Y, -0.4], [lerp(GALLERY[0], front, 0.5), LAMP_Y, -0.4], [EXIT_X - 1.1, LAMP_Y, -0.4]] : [],
    fill: under ? (f >= CUT.l6a ? 9 : 14) * (0.45 + 0.55 * air(f)) : f >= CUT.l4a && f < CUT.face4 ? 12 : (f >= CUT.top && f < CUT.towerCut) || f >= CUT.endCut ? 3.5 : 0,
    // outside the wire
    gap: Math.round(GAP_DASHES * prog(f, ...L6.dashes)),
    search: f >= CUT.top ? { from: TOWER_LAMP, to: lerp3([TREES_X + 1 + sweep * 3, 0, -5], [EXIT_X, 0.2, -0.62], swing), i: f >= CUT.endCut ? 240 : 900 } : null,
  };
}

// --- the cast (the episode kit's Actor format; cast.jsx eases the pose switches) -----------------
const Z = -0.62;            // the acting line, inside the cutaway
const TUNNEL_Y = -DEPTH;
const HIP = BODY.hipY, LIE = 0.12; // prone bodies pivot at the hip and lie with it this high off the floor
const BACK = Math.PI;       // facing away from the camera (on a ladder)
// Lying flat on the belly, head towards +x (the rig's crawl/prone poses, laid face down).
const flatOn = (x, y, z, pose, expression, speed, extra = {}) => ({ pose, position: [x, y + LIE - HIP, z], yaw: FACE_RIGHT, tilt: -Math.PI / 2, pivot: HIP, expression, speed, ...extra });

// "you": the digger, in every scene
function you(f) {
  // l1a: knee-deep under your own bunk, throwing sand out; then up, proud, and into the bed boards
  if (f < CUT.l1b) {
    const floor = -PIT.depth * pit(f);
    if (f < L1.rise) {
      return { pose: "cower", hands: "dig", phase: f * 0.52, position: [BED_X - 0.08, floor, Z], tilt: -0.14, pivot: 0.5, yaw: f >= B.escape - 4 ? FACE_CAMERA + 0.15 : FACE_CAMERA + 0.5, expression: f >= B.escape - 4 ? "happy" : "focus" };
    }
    // a proud jump, straight up into the bed boards; then down, seeing stars
    const hit = f >= L1.bonk;
    const up = hit ? 0.24 * (1 - easeOutCubic(prog(f, L1.bonk, L1.bonk + 5))) : 0.24 * easeOutCubic(prog(f, L1.rise, L1.bonk));
    return { pose: hit ? "cower" : "idle", position: [BED_X, floor + up, Z], yaw: FACE_CAMERA + 0.15, expression: !hit ? "smug" : f < L1.bonk + 10 ? "pain" : "dazed" };
  }
  // l1b: hiding in the pit with the boards pulled over your head, until the rod finds them
  if (f < CUT.stove) {
    const found = f >= L1.flip + 4;
    if (found && f < L1.shut + 2) return { pose: "idle", hands: "wave", phase: f * 0.9, position: [BED_X, -PIT.depth, Z], yaw: FACE_CAMERA + 0.45, expression: "happy" }; // a little wave
    return { pose: "cower", position: [BED_X, -PIT.depth, Z], yaw: FACE_CAMERA + 0.1, expression: "scared" };
  }
  // So: lean back, then shove the stove off its trap; point at what is under it
  if (f < CUT.ferret) {
    const x = STOVE_X - 0.9;
    if (f < L1.lean) return { pose: "idle", hands: "push", position: [x, FLOOR_Y, Z], yaw: FACE_RIGHT, expression: "focus" };
    if (f < L1.slide[0]) return { pose: "idle", hands: "push", phase: 0.9 * easeInOut(prog(f, L1.lean, L1.slide[0])), position: [x, FLOOR_Y, Z], yaw: FACE_RIGHT, tilt: 0.1 * easeInOut(prog(f, L1.lean, L1.slide[0])), expression: "focus" };
    if (f < L1.slide[1] + 4) return { pose: "idle", hands: "push", position: [x + 0.16 * prog(f, L1.slide[0], L1.slide[0] + 6), FLOOR_Y, Z], yaw: FACE_RIGHT, tilt: -0.2 * bump(f, L1.slide[0], 18), expression: "yell" };
    return { pose: "cheer", position: [x + 0.16, FLOOR_Y, Z], yaw: FACE_CAMERA + 0.5, expression: "smug" };
  }
  // ...and you are down in it, under the stove, holding your breath while he searches
  if (f < CUT.l2a) return { pose: "cower", position: [STOVE_X, -DEPTH * SHAFT1, Z], yaw: FACE_CAMERA + 0.1, expression: f >= L1.burn + 8 ? "smug" : "scared" };
  // l2a: deeper, and the sand coming up is yellow
  if (f < CUT.dump) return { pose: "cower", hands: "dig", phase: f * 0.52, position: [STOVE_X - 0.08, -DEPTH * shaft(f), Z], tilt: -0.14, pivot: 0.5, yaw: FACE_CAMERA + 0.5, expression: "focus" };
  // ...so you tip a sack of it on the yard, admire it, look round, and try to hide it
  if (f < CUT.l2b) {
    const at = [YARD_X, 0, YARD_Z];
    if (f < L2.tip[1] + 6) return { pose: "idle", hands: "tip", position: at, yaw: FACE_RIGHT, tilt: -0.1 * easeInOut(prog(f, ...L2.tip)), expression: "focus" };
    if (f < L2.look[0]) return { pose: "idle", position: at, yaw: FACE_RIGHT - 0.6, expression: f >= L2.proud ? "smug" : "happy" };
    if (f < L2.look[1]) return { pose: "idle", position: at, yaw: FACE_LEFT + 0.5, expression: "neutral" };
    if (f < L2.look[2]) return { pose: "idle", position: at, yaw: FACE_RIGHT - 0.5, expression: "neutral" };
    if (f < L2.crouch) return { pose: "idle", position: at, yaw: FACE_RIGHT - 0.7, expression: "shock" };
    if (f < L2.dive[0]) return { pose: "cower", position: at, yaw: FACE_RIGHT, expression: "scared" };
    // the belly flop: an arc from where you stood onto the heap, and you lie there looking innocent
    const t = prog(f, ...L2.dive), landed = f >= L2.dive[1];
    return flatOn(lerp(YARD_X + 0.3, DUMP_AT[0] - 0.1, t), lerp(0.75, HEAP_TOP, t) + 0.5 * Math.sin(Math.PI * t), lerp(YARD_Z, DUMP_AT[1], t), "prone", landed ? "happy" : "yell");
  }
  if (f < CUT.l3a) return null; // (the walker in the greatcoat is you: see penguin)
  // l3: digging at the face when the roof comes down; later the boards go in and you crawl on
  if (f < CUT.bunks) {
    const x = galleryX(gallery(f)) - 1.3;
    if (f < L3.fall) return flatOn(x, TUNNEL_Y, Z, "crawl", "focus", 1.4);
    return flatOn(x, TUNNEL_Y - 0.03, Z, "prone", f < L3.fall + 14 ? "scared" : "dazed");
  }
  if (f < CUT.shore) return null;
  if (f < CUT.l4a) return flatOn(galleryX(gallery(f)) - 1.3, TUNNEL_Y, Z, "crawl", f >= B.walls ? "happy" : "focus", 1.3);
  // l4: down the ladder, thirty feet; at the face the air runs out; then it arrives
  if (f < CUT.face4) {
    const landed = f >= L4.climb[1];
    return { pose: "idle", hands: landed ? undefined : "climb", phase: f * 0.5, position: [STOVE_X, climbY4(f), -0.86], yaw: landed ? FACE_RIGHT - 0.5 : BACK, expression: "focus" };
  }
  if (f < CUT.l5a) {
    const x = galleryX(GAL.l4) - 1.3;
    if (f < L4.flop) return flatOn(x - 0.5 * (1 - easeOutCubic(prog(f, CUT.face4, L4.flop))), TUNNEL_Y, Z, "crawl", f >= L4.wilt[0] + 8 ? "dazed" : "focus", lerp(1.2, 0.3, prog(f, L4.wilt[0], L4.flop)));
    if (f < L4.puff + 4) return flatOn(x, TUNNEL_Y - 0.02, Z, "prone", "dazed");
    return flatOn(x - 0.45 * easeOutCubic(prog(f, L4.puff, L4.puff + 6)) + 0.45 * easeInOut(prog(f, L4.puff + 10, L4.puff + 22)), TUNNEL_Y, Z, "crawl", f < L4.puff + 8 ? "shock" : "happy", 1.5); // the first puff blows you back
  }
  // l5: the long crawl; then the trolley
  if (f < CUT.rails) {
    const x = CRAWL_X0 + (Math.min(f, L5.flop) - CUT.l5a) * CRAWL;
    return f < L5.flop ? flatOn(x, TUNNEL_Y, Z, "crawl", f >= B.football ? "dazed" : "focus", lerp(1.1, 0.5, prog(f, CUT.l5a, L5.flop))) : flatOn(x, TUNNEL_Y - 0.02, Z, "prone", "dazed");
  }
  if (f < CUT.l6a) {
    if (f < L5.on) return null;
    return flatOn((trolleyX(f) ?? TROLLEY_X[0]) - 0.15, TUNNEL_Y + 0.27 + trolleyY(f), -0.58, "prone", f >= L5.snap + 14 ? "happy" : f >= L5.snap ? "yell" : "focus", 1, { tilt: -Math.PI / 2 + 0.3 * bump(f, L5.snap, 16) }); // the rope snaps tight: your legs fly up
  }
  // l6: the last ladder, the turf, and what is outside
  if (f < CUT.top) return { pose: "idle", hands: "climb", phase: f * 0.5, position: [EXIT_X, climbY6(f), -0.86], yaw: BACK, expression: "focus" };
  const y = headY6(f);
  if (f < L6.lift[1] - 2) return { pose: "idle", hands: "lift", position: [EXIT_X, y, Z], yaw: FACE_CAMERA, expression: "focus" };
  if (f < L6.whip[0] - 6) return { pose: "idle", position: [EXIT_X, y, Z], yaw: FACE_CAMERA + 0.2, expression: "happy" };
  if (f < L6.turn + 2) return { pose: "idle", position: [EXIT_X, y, Z], yaw: FACE_RIGHT - 0.35, expression: f >= B.short ? "shock" : "happy" };
  if (f < L6.glance[0]) return { pose: "idle", position: [EXIT_X, y - (f >= L6.caught ? 0.08 : 0), Z], yaw: f >= CUT.endCut ? FACE_CAMERA - 0.5 : FACE_LEFT + 0.55, expression: f >= L6.caught - 4 ? "scared" : "shock" };
  // the ending: a look at the trees, a look at the hole, and down you go with the turf over your head
  if (f < L6.glance[1]) return { pose: "idle", position: [EXIT_X, y, Z], yaw: FACE_RIGHT - 0.5, expression: "focus" };
  if (f < L6.sink[0]) return { pose: "idle", position: [EXIT_X, y, Z], yaw: FACE_CAMERA, expression: "scared" };
  return { pose: "idle", hands: "lift", position: [EXIT_X, y, Z], yaw: FACE_CAMERA, expression: "scared" };
}

// the "ferret": the guard who searches the hut
function ferret(f) {
  if (f >= L1.enter && f < CUT.stove) {
    const x = ferretX(f), [t1, , t3] = L1.taps;
    const walking = f < t1 - 6 || (f > t1 + 2 && f < L1.taps[1] - 5) || (f > L1.taps[1] + 2 && f < t3 - 5);
    return { pose: walking ? "walk" : "idle", hands: "rod", position: [x, FLOOR_Y, FERRET_Z1], yaw: FACE_LEFT, speed: 1.1, expression: f >= t3 + 4 ? "angry" : "focus" };
  }
  if (f >= CUT.ferret && f < CUT.l2a) {
    const at = [FERRET3_X, FLOOR_Y, FERRET_Z];
    if (f < L1.reach) return { pose: "idle", hands: "rod", position: at, yaw: FACE_LEFT, expression: "focus" };
    if (f < L1.burn) return { pose: "idle", hands: "reach", position: at, yaw: FACE_LEFT, tilt: 0.08 * easeInOut(prog(f, L1.reach, L1.burn)), expression: "focus" };
    if (f < L1.leave) return { pose: "idle", hands: "blow", position: [at[0] + 0.25 * easeOutCubic(prog(f, L1.burn, L1.burn + 5)), FLOOR_Y + 0.3 * bump(f, L1.burn, 7) + 0.18 * bump(f, L1.burn + 7, 5), FERRET_Z], yaw: FACE_LEFT + 0.5, expression: "pain" };
    return { pose: "walk", hands: "blow", position: [at[0] + 0.25 + (f - L1.leave) * 0.085, FLOOR_Y, FERRET_Z], yaw: FACE_RIGHT, speed: 1.4, expression: "pain" };
  }
  return null;
}

// the walker in the greatcoat (you, dressed for it): bags inside the trousers, hands in the
// pockets on the strings, and a waddle that lets the sand run out of both legs
function penguin(f) {
  if (f < CUT.l2b || f >= CUT.l3a) return null;
  if (f < CUT.walk2) return { pose: "idle", hands: f >= L2.pockets ? "pockets" : undefined, position: [PENGUIN_X0, 0.04 * bump(f, L2.xray[0], 8), PENGUIN_Z], yaw: FACE_CAMERA + 0.1, expression: f >= L2.pockets ? "smug" : "focus" };
  return { pose: "walk", hands: "pockets", position: [penguinX(f), 0, PENGUIN_Z], yaw: FACE_RIGHT, tilt: 0.075 * Math.sin((f - CUT.walk2) * 0.42), speed: 0.85, expression: "smug" };
}

// the second prisoner: scuffs the sand in behind you, loses his bed boards, rows the pump
function mate(f) {
  if (f >= CUT.walk2 + 6 && f < CUT.l3a) return { pose: "walk", position: [penguinX(f) - 1.45, 0, PENGUIN_Z - 0.05], yaw: FACE_RIGHT, speed: 0.95, expression: "neutral" };
  if (f >= CUT.bunks && f < CUT.shore) return flatOn(BED_X - 0.2, 1.57 + bunkSag(f), -0.6, "prone", f >= L3.sag && f < L3.sag + 8 ? "shock" : "dazed"); // asleep all the way down
  if (f >= CUT.pump && f < CUT.l5a) {
    const plate = GALLERY[0] + 0.2 - 0.42 + 0.3 + 0.5 * (1 - pumpStroke(f)); // the pump's moving board (see set.js)
    return { ...flatOn(plate + 1.28, TUNNEL_Y, Z, "prone", "focus"), yaw: FACE_LEFT, tilt: Math.PI / 2 }; // flat on his belly, head to the pump, rowing its handle
  }
  return null;
}

// the tower guard: looking the other way all film, until he turns and the light finds you
const sentry = (f) => ({ pose: "idle", position: [TOWER[0], TOWER[1], TOWER[2]], yaw: f >= L6.turn ? FACE_RIGHT - 0.5 : FACE_LEFT + 0.6, expression: f >= L6.caught ? "angry" : "neutral" });

export const TRACKS = [
  { id: "you", classType: "prisoner", track: you },
  { id: "mate", classType: "prisonerB", track: mate },
  { id: "penguin", classType: "penguin", track: penguin },
  { id: "ferret", classType: "guard", track: ferret },
  { id: "sentry", classType: "guard", track: sentry },
];

// --- camera --------------------------------------------------------------------------------------
// 9:16 at fov 40 shows 0.41 d wide and 0.73 d tall. shot(x, y, d) looks side-on at (x, y) on the cut.
const shot = (x, y, d, { rise = 0.2, fov = 40, z = Z } = {}) => ({ pos: [x, y + rise, z + d], look: [x, y, z], fov });
const hold = (start, end, a, b = a, extra = {}) => ({ start, end, a, b, ...extra });
const follow = (start, end, fn) => ({ start, end, fn });
const FACE3 = galleryX(GAL.l3), FACE4 = galleryX(GAL.l4);
const TREE_SHOT = shot(EXIT_X + 2.5, 1.0, 9.5, { rise: 0.7 });
const SHOTS = [
  hold(0, CUT.l1b, shot(BED_X + 0.3, -0.4, 6.6), shot(BED_X + 0.2, -0.45, 5.8)),                        // the dig, already under way: a slow push in
  hold(CUT.l1b, CUT.stove, shot(BED_X + 0.75, 0.0, 8.4), shot(BED_X + 0.5, -0.25, 7.6)),                // the ferret's rod works along the floor
  hold(CUT.stove, CUT.ferret, shot(STOVE_X - 0.1, 0.1, 8.6), shot(STOVE_X - 0.05, -0.15, 8.2)),          // the stove slides off its trap
  hold(CUT.ferret, CUT.l2a, shot(STOVE_X + 0.3, -0.5, 8.4), shot(STOVE_X + 0.3, -0.6, 7.8)),           // he searches; you are under it
  // line 2
  hold(CUT.l2a, CUT.dump, shot(STOVE_X, -0.7, 7.2), shot(STOVE_X, -1.9, 7.8)),                          // down the shaft: grey crust, yellow sand
  hold(CUT.dump, CUT.l2b, shot(DUMP_AT[0] - 0.3, 0.8, 7.4, { z: DUMP_AT[1] }), shot(DUMP_AT[0] - 0.15, 0.7, 6.4, { z: DUMP_AT[1] })),
  hold(CUT.l2b, CUT.walk2, shot(PENGUIN_X0 + 0.15, 0.85, 5.8, { z: PENGUIN_Z }), shot(PENGUIN_X0, 0.8, 4.9, { z: PENGUIN_Z })), // the bags
  follow(CUT.walk2, CUT.l3a, (f) => shot(penguinX(f) - 0.55, 0.8, 7.2, { z: PENGUIN_Z })),              // the waddle
  // line 3
  hold(CUT.l3a, CUT.bunks, shot(FACE3 - 1.05, -DEPTH + 0.5, 5.8), shot(FACE3 - 1.05, -DEPTH + 0.5, 5.2)), // the face; the roof comes down
  hold(CUT.bunks, CUT.shore, shot(-7.35, 0.8, 10), shot(-7.35, 0.72, 9.3)),                             // boards fly off the bunks
  hold(CUT.shore, CUT.l4a, shot(FACE3 - 2.3, -DEPTH + 0.5, 6.4), shot(galleryX(GAL.l3end) - 1.7, -DEPTH + 0.5, 6.4)),
  // line 4
  follow(CUT.l4a, CUT.face4, (f) => shot(STOVE_X + 0.35, climbY4(f) + 0.95, 8.2)),                      // thirty feet down, with you
  hold(CUT.face4, CUT.pump, shot(FACE4 - 1.4, -DEPTH + 0.5, 5.6), shot(FACE4 - 1.3, -DEPTH + 0.5, 4.9)), // the air runs out
  hold(CUT.pump, CUT.pipeCut, shot(GALLERY[0] + 0.6, -DEPTH + 0.6, 6.0), shot(GALLERY[0] + 0.6, -DEPTH + 0.6, 5.4)), // the pump
  hold(CUT.pipeCut, CUT.l5a, shot(GALLERY[0] + 3, -DEPTH + 0.5, 5.4), shot(FACE4 - 1.3, -DEPTH + 0.5, 5.4), { moveEnd: L4.pipe[1] + 12 }), // along the pipe
  // line 5
  hold(CUT.l5a, CUT.rails, shot(CRAWL_X0 + 1.9, -DEPTH + 1.35, 9.2), shot(CRAWL_X0 + 3.2, -DEPTH + 1.35, 8.8)), // a long way to crawl
  hold(CUT.rails, CUT.rideCut, shot(TROLLEY_X[0] + 0.6, -DEPTH + 0.5, 5.9), shot(TROLLEY_X[0] + 0.3, -DEPTH + 0.5, 5.4)), // rails, and the trolley
  follow(CUT.rideCut, CUT.l6a, (f) => shot(lerp(...TROLLEY_X, rideT(f)) + 0.35, -DEPTH + 0.5, 5.6)),    // the ride
  // line 6
  follow(CUT.l6a, CUT.top, (f) => shot(EXIT_X, climbY6(f) + 1.0, 7.4)),                                // the last ladder
  hold(CUT.top, CUT.l6b, shot(EXIT_X, 0.2, 4.8, { rise: 0.4 }), shot(EXIT_X, 0.3, 4.1, { rise: 0.4 })), // the turf lifts
  follow(CUT.l6b, CUT.towerCut, (f) => {                                                                // your face; then the trees, a run away
    const a = shot(EXIT_X + 0.2, 0.45, 4.3, { rise: 0.4 }), t = easeInOut(prog(f, ...L6.whip)), push = 1 - 0.06 * prog(f, L6.whip[1], CUT.towerCut);
    return { pos: lerp3(a.pos, [TREE_SHOT.pos[0], TREE_SHOT.pos[1], TREE_SHOT.look[2] + (TREE_SHOT.pos[2] - TREE_SHOT.look[2]) * push], t), look: lerp3(a.look, TREE_SHOT.look, t), fov: 40 };
  }),
  hold(CUT.endCut, FRAMES + 1, shot(EXIT_X + 0.1, 0.35, 4.9, { rise: 0.5 }), shot(EXIT_X + 0.1, 0.25, 4.2, { rise: 0.5 })), // the ending: you, in the light
  hold(CUT.towerCut, CUT.endCut, { pos: [EXIT_X + 1.6, 0.4, 6.2], look: [EXIT_X - 1.7, 2.3, -3.3], fov: 55 }, { pos: [EXIT_X + 1.5, 0.4, 5.4], look: [EXIT_X - 1.7, 2.35, -3.3], fov: 55 }), // from the grass: you, and the tower right above you
];
export function shotAt(f) {
  return SHOTS.find((k) => f >= k.start && f < k.end) ?? SHOTS[SHOTS.length - 1];
}
// impacts: nothing moves before `at`; then a dip and a decaying rattle
const SHAKES = [
  { at: L1.bonk, strength: 0.22 },
  { at: L1.taps[2], strength: 0.14 },
  { at: L1.slide[1] - 2, strength: 0.1 },
  { at: L1.burn, strength: 0.12 },
  { at: L2.tip[1], strength: 0.1 },
  { at: L2.dive[1], strength: 0.2 },
  { at: L3.crash + 4, strength: 0.26 },
  { at: L3.fall + 1, strength: 0.3 },
  { at: L3.sag + 4, strength: 0.2 },
  { at: L4.climb[1], strength: 0.1 },
  { at: L4.flop + 2, strength: 0.08 },
  { at: L5.flop, strength: 0.08 },
  { at: L5.drop, strength: 0.12 },
  { at: L5.snap, strength: 0.14 },
  { at: L6.caught, strength: 0.24 },
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
  const s = shotAt(f);
  let c;
  if (s.fn) c = s.fn(f);
  else {
    const t = easeInOut(prog(f, s.start, s.moveEnd ?? s.end));
    c = { pos: lerp3(s.a.pos, s.b.pos, t), look: lerp3(s.a.look, s.b.look, t), fov: lerp(s.a.fov, s.b.fov, t) };
  }
  const [sx, sy] = shake(f);
  return { pos: [c.pos[0] + sx, c.pos[1] + sy, c.pos[2]], look: [c.look[0] + sx * 0.5, c.look[1] + sy * 0.5, c.look[2]], fov: c.fov };
}
const P = new URLSearchParams(globalThis.location?.search ?? "");
const num3 = (k) => P.get(k)?.split(",").map(Number);
const still = (pos, look, fov) => () => ({ pos, look, fov });
export const CAMS = {
  main: camAt,
  // ?cam=dbg&pos=x,y,z&look=x,y,z&fov=n: a fixed debug lens
  dbg: () => ({ pos: num3("pos") ?? [3, 1.5, 14], look: num3("look") ?? [3, -2, 0], fov: Number(P.get("fov") ?? 40) }),
  // the whole cutaway in one frame (for thumbnails: film with ?clean=1)
  wide: still([7, -1.5, 42], [7, -2.2, 0], 40),
};

// --- HUD -----------------------------------------------------------------------------------------
// One badge per fix, on its "So". No title card (the hook is spoken from frame 0) and no end stamp.
export const STAGES = [
  { at: B.so1, n: 1, name: "UNDER THE HOT STOVE", color: "#ff8a6b" },
  { at: B.so2, n: 2, name: "SAND IN YOUR TROUSERS", color: "#ffd84d" },
  { at: B.so3, n: 3, name: "BED BOARD WALLS", color: "#d9a066" },
  { at: B.so4, n: 4, name: "MILK TIN AIR PIPE", color: "#bfe6ff" },
  { at: B.so5, n: 5, name: "ROPE TROLLEY", color: "#7fe0c2" },
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
  return {
    stage: stage ? { ...stage, pop: f - stage.at } : null,
    caption: c ? c.words.map((x) => ({ word: x.word, on: f >= x.startFrame })) : null,
    depth: f >= CUT.l4a + 4 && f < CUT.face4 ? Math.round(30 * prog(climbY4(f), -0.7, -DEPTH)) : null,
    clock: f >= CUT.l5a + 2 && f < CUT.rails ? { t: easeInOut(prog(f, CUT.l5a + 6, L5.flop + 4)), age: f - CUT.l5a - 2 } : null,
    fade: 0,
  };
}

// --- sound ---------------------------------------------------------------------------------------
const DIGS = Array.from({ length: Math.floor((L1.rise - 6) / 13) }, (_, i) => 5 + i * 13); // each handful out of the pit
const every = (from, to, step, off = 0) => Array.from({ length: Math.max(0, Math.floor((to - from - off) / step) + 1) }, (_, i) => from + off + i * step).filter((t) => t < to);
const DIGS2 = every(CUT.l2a, CUT.dump, 12, 4);
const DIGS3 = every(CUT.l3a, L3.fall - 6, 11, 3);
const BAY_AT = Array.from({ length: Math.floor((GAL.l3end - 0.035) * BAYS) }, (_, i) => {   // the frame each shoring bay lands
  for (let f = CUT.shore; f < CUT.l4a; f++) if (shore(f) * BAYS >= i + 0.9) return f;
  return null;
}).filter((f) => f != null);
const STROKES = every(CUT.pump, CUT.l5a, Math.round((2 * Math.PI) / L4.stroke), 6);
const TIN_AT = every(L4.pipe[0], L4.pipe[1], 3);
const RUNGS4 = every(L4.climb[0] + 4, L4.climb[1] - 2, 7);
const RUNGS6 = every(L6.climb[0], L6.climb[1], 8);
const SLEEPER_AT = every(L5.rails[0], L5.rails[1] - 4, 4);
export const SFX = [
  ...STAGES.map((s) => ["pop", s.at, 0.2]),
  ["wind", 0, 0.05, CUT.l3a],
  // L1a: the dig, the head on the bed boards
  ...DIGS.map((at) => ["shovel", at, 0.38]),
  ["thud", L1.bonk, 0.6],
  ["clank", L1.bonk, 0.22],
  // L1b: tok, tok, THUNK; the ring; the boards flip
  ["click", L1.taps[0], 0.5],
  ["click", L1.taps[1], 0.5],
  ["slam", L1.taps[2], 0.4],
  ["thud", L1.taps[2], 0.4],
  ["pop", L1.found, 0.3],
  ["whoosh", L1.flip - 1, 0.25],
  ["clank", L1.flip + 6, 0.2],
  // So: the stove grinds aside; he taps round it, then the hand
  ["drag", L1.slide[0] - 1, 0.5],
  ["thud", L1.slide[1] - 2, 0.35],
  ["click", L1.taps3[0], 0.45],
  ["click", L1.taps3[1], 0.45],
  ["sizzle", L1.burn, 0.5],
  // L2a: the shaft, the sack of yellow sand, the ring
  ...DIGS2.map((at) => ["shovel", at, 0.35]),
  ["whoosh", L2.tip[0] + 3, 0.22],
  ["sand", L2.tip[1] - 6, 0.5],
  ["crunch", L2.tip[1], 0.4],
  ["pop", L2.ring, 0.3],
  ["whoosh", L2.dive[0], 0.3],
  ["thud", L2.dive[1], 0.6],
  ["sand", L2.dive[1], 0.4],
  // L2b: the bags light up; the trickle
  ["sparkle", L2.xray[0], 0.3],
  ["click", L2.pockets + 4, 0.3],
  ["sand", L2.trickle, 0.5],
  ["sand", L2.trickle + 26, 0.4],
  // L3: the roof comes down; boards off the bunks; the bays go in
  ...DIGS3.map((at) => ["shovel", at, 0.35]),
  ["rumble", L3.fall - 3, 0.55],
  ["crunch", L3.fall + 1, 0.6],
  ["thud", L3.fall + 2, 0.5],
  ...L3.launches.map((at) => ["whoosh", at, 0.16]),
  ...L3.launches.map((at) => ["clank", at + L3.flight + 5, 0.15]),
  ["crack", L3.sag, 0.4],
  ["thud", L3.sag + 4, 0.55],
  ["crack", L3.crash, 0.45],
  ["slam", L3.crash + 4, 0.6],
  ["clank", L3.crash + 6, 0.3],
  ...BAY_AT.map((at) => ["thud", at, 0.28]),
  // L4: the ladder; the lamp; the pump; the tins
  ...RUNGS4.map((at) => ["click", at, 0.2]),
  ["thud", L4.climb[1], 0.4],
  ["thud", L4.flop + 2, 0.3],
  ...STROKES.map((at) => ["bellows", at, 0.45]),
  ...TIN_AT.map((at) => ["tin", at, 0.2]),
  ["whoosh", L4.puff - 2, 0.3],
  ["sparkle", L4.puff + 4, 0.2],
  // L5: the crawl; the rails; the trolley
  ...every(CUT.l5a, L5.flop - 4, 20, 4).map((at) => ["drag", at, 0.22]),
  ["thud", L5.flop, 0.35],
  ...SLEEPER_AT.map((at) => ["click", at, 0.28]),
  ["clank", L5.drop, 0.35],
  ["thud", L5.drop, 0.3],
  ["snap", L5.snap, 0.5],
  ["trolley", L5.ride[0], 0.6],
  ["whoosh", L5.ride[0] + 4, 0.3],
  ["trolley", L5.ride[0] + 22, 0.4],
  // L6: the ladder, the turf, the trees, the light
  ["wind", CUT.l6a, 0.08, FRAMES - CUT.l6a],
  ...RUNGS6.map((at) => ["click", at, 0.2]),
  ["crunch", L6.lift[0] + 3, 0.4],
  ["whoosh", L6.whip[0] + 2, 0.3],
  ...every(L6.dashes[0], L6.dashes[1], 3).map((at) => ["click", at, 0.18]),
  ["hydraulic", L6.light[0], 0.2],
  ["slam", L6.caught - 1, 0.45],
  ["boom", L6.caught, 0.5],
  ["whoosh", L6.glance[0], 0.15],
  ["crunch", L6.sink[1], 0.4],
  ["thud", L6.sink[1] + 1, 0.3],
  ["pop", L6.peek + 2, 0.25],
  ["clank", L1.shut + 5, 0.25],
].map(([name, at, vol, dur]) => ({ name, at, vol, dur }));

// --- bursts (fx.js) --------------------------------------------------------------------------------
const sandSpray = (at, pos, dir, n = 14, size = 0.7, floor = 0) => ({ kind: "spray", tint: "sand", at, pos, dir, n, size, floor });
const sandDust = (at, pos, n = 12, size = 0.6, box) => ({ kind: "dust", tint: "sand", at, pos, n, size, box });
export const BURSTS = [
  ...DIGS.map((at) => ({ kind: "spray", at: at + 2, pos: [BED_X + 0.25, -PIT.depth * pit(at) + 0.9, Z], dir: [1.1, 1.5, -0.35], n: 16, size: 0.7, floor: FLOOR_Y })),
  ...DIGS.map((at) => ({ kind: "dust", at: at + 12, pos: [PILE[0], FLOOR_Y + 0.2, PILE[1]], n: 5, size: 0.35 })),
  { kind: "dust", at: L1.bonk, pos: [BED_X, 0.75, -0.6], box: [0.7, 0.05, 0.3], n: 18, size: 0.5 },
  { kind: "dust", at: L1.taps[2], pos: [BED_X + 0.3, FLOOR_Y + 0.05, -0.4], n: 8, size: 0.35 },
  { kind: "dust", at: L1.flip + 6, pos: [PIT.x[0], FLOOR_Y + 0.4, -0.6], n: 10, size: 0.4 },
  { kind: "dust", at: L1.slide[0] + 2, pos: [STOVE_X + 0.7, FLOOR_Y + 0.08, -0.6], box: [0.5, 0.03, 0.4], n: 16, size: 0.5 },
  { kind: "smoke", at: L1.burn, end: L1.burn + 26, pos: [STOVE_X + 0.42, 1.05, -0.5], to: [STOVE_X + 0.5, 1.7, -0.5], box: [0.06, 0.04, 0.06], toBox: [0.2, 0.1, 0.2], n: 10, life: 0.8, opacity: 0.5, size: 0.35 },
  // L2a
  ...DIGS2.map((at) => sandSpray(at + 2, [STOVE_X + 0.2, -DEPTH * shaft(at) + 0.8, Z], [0.2, 1.6, 0.1], 14, 0.7, -DEPTH * shaft(at))),
  sandSpray(L2.tip[1] - 6, [DUMP_AT[0], 1.3, DUMP_AT[1]], [0, -0.4, 0], 40, 0.5, 0.05),
  sandDust(L2.tip[1], [DUMP_AT[0], 0.2, DUMP_AT[1]], 18, 0.8),
  sandSpray(L2.dive[1], [DUMP_AT[0], 0.2, DUMP_AT[1]], [0, 0.9, 0.2], 40, 0.9, 0.03),
  sandDust(L2.dive[1], [DUMP_AT[0], 0.25, DUMP_AT[1]], 30, 1.1, [0.6, 0.05, 0.3]),
  // L2b: a trickle out of each trouser leg, every step
  ...STEPS.map((at, i) => sandSpray(at, [penguinX(at) + 0.1, 0.25, PENGUIN_Z + (i % 2 ? 0.11 : -0.11)], [0.1, -0.2, 0], 7, 0.28, 0.02)),
  ...STEPS.filter((_, i) => i % 3 === 0).map((at) => ({ kind: "dust", at: at + 30, pos: [penguinX(at), 0.08, PENGUIN_Z], n: 6, size: 0.4 })), // scuffed in
  // L3
  ...DIGS3.map((at) => sandSpray(at + 2, [galleryX(gallery(at)) - 0.2, -DEPTH + 0.35, Z], [-0.8, 0.6, 0.2], 10, 0.5, -DEPTH)),
  sandSpray(L3.fall, [FACE3 - 1.5, -DEPTH + 0.95, Z], [0, -0.3, 0], 50, 0.6, -DEPTH),
  sandDust(L3.fall + 1, [FACE3 - 1.5, -DEPTH + 0.5, Z], 46, 1.0, [0.8, 0.3, 0.3]),
  { kind: "dust", at: L3.sag + 4, pos: [BED_X, 0.9, -0.6], box: [0.8, 0.05, 0.3], n: 18, size: 0.6 },
  { kind: "dust", at: L3.crash + 4, pos: [BED_X, 0.25, -0.5], box: [0.9, 0.05, 0.4], n: 34, size: 0.9 },
  ...BAY_AT.map((at, i) => sandDust(at, [GALLERY[0] + i + 0.5, -DEPTH + 0.9, -0.3], 6, 0.35)),
  // L4
  sandDust(L4.climb[1], [STOVE_X, -DEPTH + 0.1, Z], 10, 0.5),
  ...STROKES.map((at) => ({ kind: "dust", tint: "air", at: at + 4, pos: [GALLERY[0] + 0.7, -DEPTH + 0.2, -0.9], n: 5, size: 0.3 })),
  { kind: "dust", tint: "air", at: L4.puff, pos: [FACE4 - 0.9, -DEPTH + 0.25, -0.75], n: 14, size: 0.6 },
  // L5
  sandDust(L5.flop, [CRAWL_X0 + (L5.flop - CUT.l5a) * CRAWL + 0.5, -DEPTH + 0.1, Z], 8, 0.4),
  sandDust(L5.drop, [TROLLEY_X[0], -DEPTH + 0.1, -0.58], 12, 0.5),
  ...every(L5.ride[0], L5.ride[1] - 6, 5).map((at) => sandDust(at, [lerp(...TROLLEY_X, rideT(at)) - 0.5, -DEPTH + 0.1, -0.58], 4, 0.4)),
  // L6
  { kind: "spray", at: L6.lift[0] + 3, pos: [EXIT_X, 0.1, Z], dir: [0.3, 0.8, 0.3], n: 14, size: 0.5, floor: 0.02 },
  { kind: "dust", at: L6.lift[0] + 3, pos: [EXIT_X, 0.15, Z], n: 10, size: 0.5 },
  { kind: "dust", at: L6.sink[1], pos: [EXIT_X, 0.12, Z], n: 12, size: 0.5 },
];
void TIN_STEP; void SLEEPER_STEP;
