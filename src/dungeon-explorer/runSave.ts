// Where he is, kept in this browser so coming back puts him there again:
// - below, the run: which floor (seed, rooms, theme, life), when the dungeon closes, what he carried
//   in, and every few seconds where he stands, his health, the chests and remains (what is left in
//   them) and which monsters are dead. Coming back before the dungeon closes resumes the run; after
//   it closed (or if he had fallen) the run is lost like a death: he wakes in town with what he
//   carried in. The clock runs on while he is away.
// - in town, the spot he last stood on.
// Only this browser knows: the server keeps what he brought out (profile.ts), never a run.
import type { ThemeName } from "./dungeon/themes";
import type { Container } from "./loot";
import type { PlayerInv } from "./playerInv";

const RUN_KEY = "simforge.explorer.run.v1";
// v2: the town became the Adventurers' Guild (2026-11-19); spots in the old streets are void.
const TOWN_KEY = "simforge.explorer.townspot.v2";
/** Less than this left on the clock and the run is not worth resuming. */
const MIN_LEFT_MS = 5000;

export interface RunPlace {
  x: number;
  z: number;
  yaw: number;
  hp: number;
  /** Dead monsters by id, where they fell (m). */
  deadMobs: Array<{ id: number; x: number; z: number }>;
  /** The floor's chests, remains and dropped sacks as they are now, and the sacks' heights. */
  containers: Container[];
  pileYs: Record<string, number>;
}

export interface RunSnapshot {
  v: 1;
  seed: number;
  rooms: number;
  theme: ThemeName;
  life: number;
  /** When the dungeon closes (ms since 1970). */
  endsAt: number;
  /** What he carried in. */
  runStart: PlayerInv;
  /** Null until the first save on the floor (then he resumes at the entrance). */
  at: RunPlace | null;
  /** He fell (and had not yet gone back up). */
  dead: boolean;
}

let current: RunSnapshot | null = null;

function write() {
  try {
    if (current) window.localStorage.setItem(RUN_KEY, JSON.stringify(current));
    else window.localStorage.removeItem(RUN_KEY);
  } catch {
    // Blocked or full storage: the run is not kept.
  }
}

function read(): RunSnapshot | null {
  try {
    const raw = window.localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as RunSnapshot;
    if (!s || s.v !== 1 || typeof s.seed !== "number" || typeof s.endsAt !== "number" || !s.runStart) return null;
    return s;
  } catch {
    return null;
  }
}

/** A floor was built fresh: a new run starts now. */
export function beginRun(r: Omit<RunSnapshot, "v" | "at" | "dead">): void {
  current = { v: 1, ...r, at: null, dead: false };
  write();
}

/** Where he is on the floor now, and how long is left on the clock (seconds). */
export function updateRun(at: RunPlace, secondsLeft: number): void {
  if (!current || current.dead) return;
  current.at = at;
  current.endsAt = Date.now() + secondsLeft * 1000;
  write();
}

export function markRunDead(): void {
  if (!current || current.dead) return;
  current.dead = true;
  write();
}

/** The run is over (he escaped, or is back in town). */
export function endRun(): void {
  if (!current && !read()) return;
  current = null;
  write();
}

export type RunAtStart =
  | { kind: "resume"; run: RunSnapshot }
  /** The run he left could not be resumed: back to what he carried in. */
  | { kind: "lost"; runStart: PlayerInv; why: "closed" | "fell" }
  | null;

let atStart: RunAtStart | undefined;

/** What the run he left last time means now (worked out once per page). */
export function runAtStart(): RunAtStart {
  if (atStart !== undefined) return atStart;
  const s = read();
  if (!s) atStart = null;
  else if (!s.dead && s.endsAt - Date.now() > MIN_LEFT_MS) {
    current = s;
    atStart = { kind: "resume", run: s };
  } else {
    atStart = { kind: "lost", runStart: s.runStart, why: s.dead ? "fell" : "closed" };
    current = null;
    write();
  }
  return atStart;
}

export interface TownSpot {
  x: number;
  z: number;
  y: number;
  yaw: number;
}

export function saveTownSpot(s: TownSpot): void {
  try {
    window.localStorage.setItem(TOWN_KEY, JSON.stringify(s));
  } catch {
    // Not kept.
  }
}

export function loadTownSpot(): TownSpot | null {
  try {
    const raw = window.localStorage.getItem(TOWN_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TownSpot;
    return [s.x, s.z, s.y, s.yaw].every((n) => typeof n === "number" && Number.isFinite(n)) ? s : null;
  } catch {
    return null;
  }
}
