import type { PosterSpec } from "../../../artifacts";
import { defineEpisode } from "../../../engine/defineEpisode";
import type { CameraPose, CameraWaypoint, EpisodeDefinition, SfxCue } from "../../../engine/types";
import { followTrack, sfxFor } from "../../../kit";
import { segmentCues, segmentLength, XF, type SegmentId } from "../timeline";
import { segmentConfig } from "../shared";
import {
  NEVER,
  anteShot,
  boardShot,
  chamberShot,
  coreShot,
  coreTableShot,
  cryptWideShot,
  crowdShot,
  doorShot,
  fallEnd,
  fallTarget,
  graveyardShot,
  hubBreachShot,
  hubShot,
  barbarianShot,
  makeBridgeScene,
  mimicShot,
  pipeTopShot,
  tableShot,
  type Cut,
  type FallSpec,
  type MimicSpec,
  type Reaction,
} from "./BridgeScene";

/**
 * Cold open, the three bridges and the finale. Each is a segment with local
 * frames from `segmentCues(id)`. The shape of a bridge:
 *   1. crypt: the act's last party slides down its chute inside the walls and
 *      drops into the Mimic in the Core Chamber (chomp, burp, the Core flares)
 *   2. tavern: the next group of adventurers at the Guild's bounty board;
 *      posters nailed, ripped, inked
 *   3. crypt: the Antechamber, the next hallway door swings open and the
 *      party heads in (the next act cross-fades in over the push).
 */

const sfx = sfxFor("dungeon-campaign");
const ep1 = sfxFor("dungeon-trap");
const wp = (frame: number, pose: CameraPose): CameraWaypoint => ({ frame: Math.round(frame), ...pose });

// ---------------------------------------------------------------------------
// Posters (continuity: the board only ever gains or loses what the lines say)
// ---------------------------------------------------------------------------
const wanted = (id: string, reward: string, nailAt: number, ripAt?: number, keeperUnderline?: number): PosterSpec => ({
  id,
  x: -1.6,
  y: 0.1,
  w: 2.3,
  h: 3.1,
  tilt: -0.04,
  nailAt,
  ripAt,
  lines: [
    { text: "WANTED", size: 0.15, color: "#9c1a16" },
    { text: "THE DUNGEON", size: 0.085 },
    { text: "KEEPER", size: 0.12, underline: keeperUnderline },
    { text: "DEAD OR ALIVE", size: 0.06, color: "#5a3a1e" },
    { text: `REWARD ${reward} GOLD`, size: 0.075, color: "#9c1a16", hand: true },
  ],
});
const filler: PosterSpec[] = [
  { id: "cat", x: 2.25, y: 1.2, w: 1.3, h: 1.1, tilt: 0.08, nailAt: -100, paper: "#f2ead2", lines: [{ text: "LOST CAT", size: 0.2 }, { text: "answers to 'Mimic'?", size: 0.1, hand: true }] },
];
const report = (nailAt: number, underline: number, ripAt?: number): PosterSpec => ({
  id: "report",
  x: 1.2,
  y: -0.5,
  w: 2.0,
  h: 2.4,
  tilt: 0.06,
  nailAt,
  ripAt,
  paper: "#f6f0de",
  lines: [
    { text: "SURVIVOR REPORT", size: 0.085 },
    { text: "spikes. fire. a blade.", size: 0.07, hand: true },
    { text: "next room is the", size: 0.07, hand: true },
    { text: "HALLWAY", size: 0.14, color: "#2a1a0e", underline },
  ],
});
const plan = (nailAt: number, skip: number, treasure: number, ripAt?: number): PosterSpec => ({
  id: "plan",
  x: 1.1,
  y: -0.35,
  w: 2.1,
  h: 1.5,
  tilt: -0.05,
  nailAt,
  ripAt,
  paper: "#e9ddbf",
  lines: [
    { text: "NEW PLAN", size: 0.17 },
    { text: "skip the hallways", size: 0.12, hand: true, strike: skip },
    { text: "GO FOR THE TREASURE", size: 0.11, color: "#9c1a16", underline: treasure },
  ],
});
const packing = (nailAt: number, marks: [number, number, number], ripAt?: number): PosterSpec => ({
  id: "packing",
  x: 1.3,
  y: -0.8,
  w: 1.9,
  h: 1.9,
  tilt: 0.05,
  nailAt,
  ripAt,
  paper: "#f6f0de",
  lines: [
    { text: "LAST PARTY KIT", size: 0.1 },
    { text: "SHIELDS", size: 0.12, hand: true, underline: marks[0] },
    { text: "WIND SPELLS", size: 0.12, hand: true, underline: marks[1] },
    { text: "BARRICADE", size: 0.12, hand: true, underline: marks[2] },
  ],
});

// ---------------------------------------------------------------------------
// Bridge builder (chute -> board -> next door)
// ---------------------------------------------------------------------------
type Room = "entrance" | "hallway" | "vault" | "gallery";
const CHUTE_OF: Record<Room, 0 | 1 | 2 | 3> = { entrance: 0, hallway: 1, vault: 2, gallery: 3 };
const SLIDE = 40;

/** The adventurers react to the board: who points, cheers or turns to camera, when. */
const chatter = (from: number, to: number): Reaction[] => {
  const span = to - from;
  return [
    { who: 3, from: from + span * 0.1, to: from + span * 0.35, pose: "point", expression: "focus" },
    { who: 0, from: from + span * 0.3, to: from + span * 0.55, pose: "cheer", expression: "happy", faceCamera: true },
    { who: 2, from: from + span * 0.5, to: from + span * 0.75, pose: "cast", expression: "smug" },
    { who: 1, from: from + span * 0.7, to: from + span * 0.95, pose: "point", expression: "smug", faceCamera: true },
  ];
};

interface BridgeOptions {
  id: SegmentId;
  title: string;
  from: Room;
  to: Exclude<Room, "entrance">;
  /** The Mimic swallows on this frame (the fall is solved backwards from it). */
  chompAt: number;
  mimic: Omit<MimicSpec, "openAt" | "chompAt">;
  /** Cut to the tavern here; leave for the Antechamber at `boardEnd`. */
  boardAt: number;
  boardEnd: number;
  /** Close in on the posters from here (before it, the adventurers at the board). */
  boardCloseAt: number;
  posters: PosterSpec[];
  extraSfx: SfxCue[];
}

const bridge = (o: BridgeOptions): EpisodeDefinition => {
  const len = segmentLength(o.id);
  const start = o.chompAt - 2 - (2 * 8 + SLIDE + 14);
  const falls: FallSpec = { chute: CHUTE_OF[o.from], classes: ["rogue", "mage", "paladin"], start, slide: SLIDE };
  const end = fallEnd(falls);
  const mimic: MimicSpec = { ...o.mimic, openAt: end - 18, chompAt: end + 2 };
  const nextDoor = CHUTE_OF[o.to];
  const cuts: Cut[] = [
    { at: 0, place: "crypt" },
    { at: o.boardAt, place: "tavern" },
    { at: o.boardEnd, place: "crypt" },
  ];
  const Scene = makeBridgeScene({
    cuts,
    falls,
    mimic,
    posters: o.posters,
    crowd: chatter(o.boardAt, o.boardCloseAt),
    doorOpen: [0, 1, 2, 3].map((d) => (d < nextDoor ? -100 : d === nextDoor ? o.boardEnd + 4 : NEVER)),
    walk: { door: nextDoor, window: [o.boardEnd - 26, len - 6] },
  });
  const camera = {
    initialPosition: pipeTopShot(falls.chute).position,
    waypoints: [
      wp(0, pipeTopShot(falls.chute)),
      // (the slide is tracked) then the Mimic and the Core.
      wp(end + 4, mimicShot(8.6)),
      wp(o.boardAt - 1, chamberShot(14)),
      wp(o.boardAt, crowdShot(12)),
      wp(o.boardCloseAt - 1, crowdShot(11)),
      wp(o.boardCloseAt, boardShot(8.2)),
      wp(o.boardEnd - 1, boardShot(7.2)),
      wp(o.boardEnd, anteShot(13.5)),
      wp(len, doorShot(nextDoor, 7)),
    ],
    tracks: [
      followTrack({ start: Math.max(0, falls.start + 6), end: end - 2, target: fallTarget(falls, mimic.fullness), dist: 9.5, height: 0.4, minY: -40, z: -0.6, blend: 8 }),
    ],
    shake: [{ at: mimic.chompAt, strength: 0.12, spread: 5 }],
  };
  const cues: SfxCue[] = [
    ep1("whoosh_big", Math.max(0, falls.start + 4), 0.35),
    ep1("growl", mimic.openAt - 10, 0.3),
    ep1("chomp", mimic.chompAt, 0.55),
    ep1("chew", mimic.chompAt + 8, 0.35),
    ep1("sparkle", mimic.chompAt + 4, 0.3),
    ...(o.mimic.burpAt < NEVER ? [sfx("burp", o.mimic.burpAt, 0.5)] : []),
    ep1("trap_open", o.boardEnd + 4, 0.35),
    ...o.extraSfx,
  ];
  return defineEpisode({
    config: segmentConfig(o.id, o.title, camera, cues),
    Scene,
    beats: { fall: Math.max(0, falls.start), chomp: mimic.chompAt, board: o.boardAt, close: o.boardCloseAt, door: o.boardEnd + 4, xf: len - XF },
  });
};

// ---------------------------------------------------------------------------
// Cold open: graveyard -> tavern (the WANTED poster) -> the Antechamber's four
// doors -> down to the Core Chamber -> the drawing table -> door I opens.
// ---------------------------------------------------------------------------
const coldOpen = (): EpisodeDefinition => {
  const { w, lineStart, lineEnd } = segmentCues("cold");
  const len = segmentLength("cold");
  const B = {
    tavern: w("c0a", "adventurers'") - 4,
    nail: w("c0a", "nailed"),
    name: w("c0a", "name"),
    ante: lineStart("c0b") - 4,
    four: w("c0b", "four"),
    descend: w("c0b", "between"),
    throne: w("c0b", "throne"),
    build: w("c0c", "build"),
    out: lineEnd("c0c") + 8,
  };
  const Scene = makeBridgeScene({
    cuts: [
      { at: 0, place: "graveyard" },
      { at: B.tavern, place: "tavern" },
      { at: B.ante, place: "crypt" },
    ],
    mimic: { fullness: 0, openAt: NEVER, chompAt: NEVER, burpAt: NEVER },
    corePulses: [B.throne],
    posters: [...filler, wanted("wanted100", "100", B.nail, undefined, B.name + 2)],
    crowd: [
      { who: 3, from: B.nail + 6, to: B.nail + 40, pose: "point", expression: "angry" },
      { who: 0, from: B.nail + 14, to: B.name + 10, pose: "cheer", expression: "happy", faceCamera: true },
      { who: 1, from: B.name - 6, to: B.ante, pose: "idle", expression: "smug", faceCamera: true },
      { who: 2, from: B.name, to: B.ante, pose: "cast", expression: "focus" },
    ],
    doorLit: [0, 1, 2, 3].map((i) => B.four + i * 6),
    doorOpen: [B.out + 2, NEVER, NEVER, NEVER],
  });
  const camera = {
    initialPosition: graveyardShot(18).position,
    waypoints: [
      wp(0, graveyardShot(18)),
      wp(B.tavern - 1, graveyardShot(14.5)),
      wp(B.tavern, crowdShot(12.5)),
      wp(B.nail - 6, crowdShot(11)),
      wp(B.name - 4, boardShot(8.4)),
      wp(B.ante - 1, boardShot(7.2)),
      // The four doors light up one by one, then the crane down into the Core Chamber.
      wp(B.ante, anteShot(16.5)),
      wp(B.descend, anteShot(15)),
      wp(B.descend + 22, cryptWideShot()),
      wp(B.throne + 6, coreShot(9)),
      wp(B.build - 16, chamberShot(14.5)),
      wp(B.build + 4, tableShot(5)),
      wp(B.out - 1, tableShot(4.2)),
      // Door I swings open under the cross-fade into Act I.
      wp(B.out, doorShot(0, 11)),
      wp(len, doorShot(0, 6.5)),
    ],
  };
  const cues: SfxCue[] = [
    sfx("nail", B.nail - 2, 0.55),
    ...[0, 1, 2, 3].map((i) => ep1("ignite", B.four + i * 6, 0.25)),
    ep1("whoosh", B.descend, 0.3),
    ep1("sparkle", B.throne, 0.35),
    ep1("sparkle", B.build, 0.3),
    ep1("trap_open", B.out + 2, 0.35),
  ];
  return defineEpisode({ config: segmentConfig("cold", "Campaign cold open", camera, cues), Scene, beats: { ...B, xf: len - XF } });
};

// ---------------------------------------------------------------------------
// Bridges
// ---------------------------------------------------------------------------
const bridge1 = (): EpisodeDefinition => {
  const { w, lineStart, lineEnd } = segmentCues("bridge1");
  const doubles = w("b1a", "doubles");
  const underline = w("b1b", "underlined") + 4;
  return bridge({
    id: "bridge1",
    title: "Campaign bridge 1",
    from: "entrance",
    to: "hallway",
    chompAt: w("b1a", "mimic") - 4,
    mimic: { fullness: 1, burpAt: w("b1a", "burps") },
    boardAt: w("b1a", "up") - 3,
    boardCloseAt: doubles - 10,
    boardEnd: lineEnd("b1b") + 14,
    posters: [...filler, wanted("wanted100", "100", -100, doubles - 6), wanted("wanted200", "200", doubles + 2), report(lineStart("b1b") + 4, underline)],
    extraSfx: [sfx("nail", doubles, 0.5), sfx("nail", lineStart("b1b") + 2, 0.45), ep1("click", underline, 0.3)],
  });
};

const bridge2 = (): EpisodeDefinition => {
  const { w, lineEnd } = segmentCues("bridge2");
  const desperate = w("b2a", "desperate");
  const skip = w("b2b", "skip") + 4;
  const treasure = w("b2b", "treasure") + 2;
  return bridge({
    id: "bridge2",
    title: "Campaign bridge 2",
    from: "hallway",
    to: "vault",
    chompAt: w("b2a", "mimic"),
    mimic: { fullness: 2, burpAt: w("b2a", "round") + 4 },
    boardAt: w("b2a", "guild") - 6,
    boardCloseAt: desperate - 8,
    boardEnd: lineEnd("b2b") + 14,
    posters: [
      ...filler,
      wanted("wanted200", "200", -100, desperate - 6),
      wanted("wanted500", "500", desperate + 2),
      report(-100, -100, desperate + 30),
      plan(w("b2b", "plan") + 2, skip, treasure),
    ],
    extraSfx: [sfx("nail", desperate, 0.5), sfx("nail", w("b2b", "plan"), 0.45), ep1("click", skip, 0.3), ep1("click", treasure, 0.3)],
  });
};

const bridge3 = (): EpisodeDefinition => {
  const { w, lineStart, lineEnd } = segmentCues("bridge3");
  const marks: [number, number, number] = [w("b3b", "shields") + 3, w("b3b", "wind") + 3, w("b3b", "barricade") + 3];
  return bridge({
    id: "bridge3",
    title: "Campaign bridge 3",
    from: "vault",
    to: "gallery",
    chompAt: w("b3a", "mimic"),
    // Swallows the vault party, then the lid jams open on "close".
    mimic: { fullness: 3, burpAt: NEVER, jamAt: w("b3a", "close") },
    boardAt: lineStart("b3b") - 4,
    boardCloseAt: w("b3b", "this") - 4,
    boardEnd: lineEnd("b3b") + 14,
    posters: [...filler, wanted("wanted500", "500", -100), plan(-100, -100, -100, w("b3b", "last") - 4), packing(w("b3b", "last") + 2, marks)],
    extraSfx: [sfx("nail", w("b3b", "last"), 0.5), ...marks.map((m) => ep1("click", m, 0.3)), ep1("clank", w("b3a", "close") + 2, 0.4)],
  });
};

// ---------------------------------------------------------------------------
// Finale: the empty tavern, the Mimic outgrowing its chest, the drawing board
// and floor two's hub with five new doors, then the Guild's barbarian, whose
// fist comes through the hub ceiling (where Season 2, S2E1, picks up).
// ---------------------------------------------------------------------------
const finale = (): EpisodeDefinition => {
  const { w, lineStart, lineEnd } = segmentCues("finale");
  const len = segmentLength("finale");
  const B = {
    board: lineStart("fa") - 3,
    empty: w("fa", "empty"),
    chamber: lineStart("fb") - 3,
    outgrowing: w("fb", "outgrowing"),
    table: lineStart("fc") - 3,
    drawing: w("fc", "drawing"),
    hub: w("fc", "second") - 2,
    five: w("fc", "five"),
    tavern: lineStart("fd") - 3,
    barbarian: w("fd", "barbarian"),
    breachCut: lineEnd("fd") + 14,
    breach: lineEnd("fd") + 24,
  };
  const falls: FallSpec = { chute: 3, classes: ["rogue", "mage", "paladin"], start: -30, slide: SLIDE };
  const end = fallEnd(falls);
  const roster: PosterSpec = {
    id: "roster",
    x: 0.25,
    y: 0,
    w: 2.2,
    h: 3.2,
    tilt: 0.02,
    nailAt: -100,
    ripAt: B.barbarian + 2,
    paper: "#f6f0de",
    lines: [
      { text: "RECRUITS", size: 0.1 },
      { text: "GOBLINS", size: 0.11, hand: true, strike: w("fa", "goblins") + 2 },
      { text: "ROGUES", size: 0.11, hand: true, strike: w("fa", "rogues") + 2 },
      { text: "MAGES", size: 0.11, hand: true, strike: w("fa", "mages") + 2 },
      { text: "PALADINS", size: 0.11, hand: true, strike: w("fa", "paladins") + 2 },
    ],
  };
  const Scene = makeBridgeScene({
    cuts: [
      { at: 0, place: "crypt" },
      { at: B.board, place: "tavern" },
      { at: B.chamber, place: "crypt" },
      { at: B.hub, place: "hub" },
      { at: B.tavern, place: "tavern" },
      { at: B.breachCut, place: "hub" },
    ],
    falls,
    mimic: { fullness: 4, openAt: end - 18, chompAt: end + 2, burpAt: NEVER, strainAt: B.outgrowing - 6 },
    corePulses: [end + 2, B.outgrowing, B.drawing],
    coreEnergy: 1,
    tableSheet: "floor2",
    hub: { doorLit: [0, 1, 2, 3, 4].map((i) => B.five + i * 5), breachAt: B.breach },
    barbarian: { enter: [B.tavern - 10, w("fd", "they") - 4], rip: B.barbarian },
    posters: [
      { ...wanted("wanted500", "500", -100, B.empty - 10), x: -2.15 },
      { ...packing(-100, [-100, -100, -100], B.empty - 2), x: 2.4, y: -1.0 },
      { ...filler[0], ripAt: B.empty + 2 },
      roster,
    ],
  });
  const camera = {
    initialPosition: pipeTopShot(3).position,
    waypoints: [
      wp(0, pipeTopShot(3)),
      wp(B.board - 1, mimicShot(9)),
      wp(B.board, boardShot(8.4)),
      wp(B.chamber - 1, boardShot(7.2)),
      wp(B.chamber, chamberShot(14.5)),
      wp(B.outgrowing - 10, mimicShot(9.6)),
      wp(B.table - 1, mimicShot(8.4)),
      wp(B.table, coreTableShot(9)),
      wp(B.hub - 1, tableShot(4.2)),
      // Floor two: the five new doors light up I..V.
      wp(B.hub, hubShot(17)),
      wp(B.tavern - 1, hubShot(15)),
      wp(B.tavern, crowdShot(11)),
      wp(B.barbarian - 12, barbarianShot(6.4)),
      wp(B.breachCut - 1, barbarianShot(5.4)),
      // Under the hub ceiling: the fist comes through.
      wp(B.breachCut, hubBreachShot(10)),
      wp(len, hubBreachShot(8.5)),
    ],
    tracks: [
      followTrack({ start: 0, end: Math.min(end, B.board - 2), target: fallTarget(falls, 4), dist: 9.5, height: 0.4, minY: -40, z: -0.6, blend: 6 }),
    ],
    shake: [
      { at: B.barbarian + 2, strength: 0.12, spread: 5 },
      { at: B.breach, strength: 0.36, spread: 9 },
    ],
    rumbles: [
      { start: B.outgrowing - 6, end: B.table - 4, strength: 0.02 },
      { start: B.breachCut, end: B.breach, strength: 0.04 },
    ],
  };
  const boulder = sfxFor("rolling-boulder");
  const cues: SfxCue[] = [
    ep1("whoosh_big", 2, 0.3),
    ...["goblins", "rogues", "mages", "paladins"].map((n) => ep1("click", w("fa", n) + 2, 0.3)),
    ep1("whoosh", B.empty - 10, 0.25),
    ep1("whoosh", B.empty - 2, 0.25),
    ep1("growl", B.outgrowing - 4, 0.35),
    ep1("chew", B.outgrowing + 6, 0.3),
    ep1("sparkle", B.drawing, 0.3),
    ...[0, 1, 2, 3, 4].map((i) => ep1("ignite", B.five + i * 5, 0.22)),
    ep1("thud", B.tavern + 6, 0.3),
    ep1("whoosh", B.barbarian, 0.35),
    boulder("crack", B.barbarian + 2, 0.45),
    ep1("rumble", B.breachCut, 0.4),
    boulder("crack", B.breach, 0.6),
    ep1("boom", B.breach, 0.5),
    ep1("dust", B.breach + 4, 0.4),
  ];
  return defineEpisode({ config: segmentConfig("finale", "Campaign finale", camera, cues), Scene, beats: B });
};

export const COLD = coldOpen();
export const BRIDGE1 = bridge1();
export const BRIDGE2 = bridge2();
export const BRIDGE3 = bridge3();
export const FINALE = finale();
