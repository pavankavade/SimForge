// Spells, Dark and Darker style: a caster memorises spells up to his memory capacity (Knowledge,
// stats.ts; each spell costs its tier), each comes with a few charges, and charges come back only
// by praying (sit down with X). Picked in the lobby's Class tab with the perks and skill (skills.ts
// keeps them in the loadout). The game casts them with 5–9 (or the touch spell buttons).
import type { ClassId } from "./classes";

export type SpellId = "lesser_heal" | "bless" | "protection" | "holy_light" | "sanctuary";

export interface Spell {
  id: SpellId;
  name: string;
  /** A short name for the touch buttons. */
  short: string;
  note: string;
  /** Memory it takes (its tier). */
  tier: number;
  /** Casts before it needs a rest. */
  charges: number;
  /** Seconds to cast at neutral casting speed. */
  cast: number;
  /** Its light (CSS and three.js). */
  color: string;
}

/** The numbers the game uses (DungeonApp), kept beside the words that describe them. */
export const SPELL = {
  healAmount: 25,
  healRadiusM: 4,
  blessS: 30,
  blessDamage: 0.15,
  blessMove: 0.05,
  wardAmount: 30,
  wardS: 20,
  lightDamage: 20,
  lightReachM: 3,
  lightRadiusM: 2.2,
  undeadTimes: 2,
  sanctuaryS: 10,
  sanctuaryHps: 4,
  sanctuaryRadiusM: 2.2,
  /** Resting: sitting this long before the first charge comes back, then one every `restEach`. */
  restFirst: 2.5,
  restEach: 1.6,
  restHps: 1.5,
};

const SPELLS: Partial<Record<ClassId, Spell[]>> = {
  cleric: [
    { id: "lesser_heal", name: "Lesser Heal", short: "HEAL", note: "Heal yourself and every ally within four metres for 25 (magical power adds to it).", tier: 1, charges: 4, cast: 1, color: "#ffe9a8" },
    { id: "bless", name: "Bless", short: "BLESS", note: "For thirty seconds your blows and arrows hit 15% harder and you move 5% faster.", tier: 1, charges: 3, cast: 0.8, color: "#fff1c9" },
    { id: "protection", name: "Protection", short: "WARD", note: "A ward of light takes the next 30 damage for you (for twenty seconds).", tier: 2, charges: 2, cast: 1.2, color: "#bfe3ff" },
    { id: "holy_light", name: "Holy Light", short: "LIGHT", note: "Light bursts three metres ahead: 20 magic damage to everything in it, twice that to the undead.", tier: 2, charges: 3, cast: 0.9, color: "#fff6d8" },
    { id: "sanctuary", name: "Sanctuary", short: "SANCT", note: "Holy ground at your feet for ten seconds: four health a second to everyone standing in it.", tier: 3, charges: 1, cast: 1.6, color: "#ffd77a" },
  ],
};

export const spellsOf = (cls: ClassId): Spell[] => SPELLS[cls] ?? [];
export const spellById = (id: SpellId): Spell | null => {
  for (const k of Object.keys(SPELLS)) for (const s of SPELLS[k as ClassId] ?? []) if (s.id === id) return s;
  return null;
};
/** Memory the picked spells take. */
export const memoryUsed = (ids: SpellId[]): number => ids.reduce((n, id) => n + (spellById(id)?.tier ?? 0), 0);

/** The class's spells in order, as many as fit in `memory`. */
export function defaultSpells(cls: ClassId, memory: number): SpellId[] {
  const out: SpellId[] = [];
  let used = 0;
  for (const s of spellsOf(cls)) {
    if (used + s.tier > memory) continue;
    out.push(s.id);
    used += s.tier;
  }
  return out;
}

/** The picks that still fit (memory can drop when gear comes off): the last ones go first. */
export function fitSpells(ids: SpellId[], memory: number): SpellId[] {
  const out: SpellId[] = [];
  let used = 0;
  for (const id of ids) {
    const t = spellById(id)?.tier ?? 99;
    if (used + t > memory) continue;
    out.push(id);
    used += t;
  }
  return out;
}

/** Keys that cast the memorised spells, in order. */
export const SPELL_KEYS = ["5", "6", "7", "8", "9"];
