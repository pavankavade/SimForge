// What the paladin keeps in town between dives: which rooms upstairs he rents, and what is in the
// three chests in each. Saved in the browser like his inventory; the dungeon never touches it.
import { emptyGrid, migrateGrid, type Grid } from "../items";
import { CHESTS_PER_ROOM, ROOMS } from "./layout";

export const STASH_W = 10;
export const STASH_H = 6;
const KEY = "simforge.explorer.town.v1";

export interface TownSave {
  rented: boolean[];
  /** stash[room][chest] */
  stash: Grid[][];
}

const freshStash = (): Grid[][] => ROOMS.map(() => Array.from({ length: CHESTS_PER_ROOM }, () => emptyGrid(STASH_W, STASH_H)));

export function loadTown(): TownSave {
  const out: TownSave = { rented: ROOMS.map(() => false), stash: freshStash() };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return out;
    const s = JSON.parse(raw) as Partial<TownSave>;
    ROOMS.forEach((_, r) => {
      out.rented[r] = !!s.rented?.[r];
      for (let c = 0; c < CHESTS_PER_ROOM; c++) {
        const g = s.stash?.[r]?.[c];
        // Pieces from before the six armour slots are renamed (the ones now folded into a whole armour go).
        if (g && Array.isArray(g.items)) out.stash[r][c] = migrateGrid({ w: STASH_W, h: STASH_H, items: g.items }).grid;
      }
    });
  } catch {
    // Blocked or broken storage: nothing rented yet.
  }
  return out;
}

export function saveTown(t: TownSave): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // Not remembered.
  }
}

/** A copy with one chest's contents replaced. */
export function withStash(t: TownSave, room: number, chest: number, g: Grid): TownSave {
  const stash = t.stash.map((row, r) => (r === room ? row.map((old, c) => (c === chest ? g : old)) : row));
  return { ...t, stash };
}

export function withRented(t: TownSave, room: number): TownSave {
  return { ...t, rented: t.rented.map((v, r) => v || r === room) };
}
