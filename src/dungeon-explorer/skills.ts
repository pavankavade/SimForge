// Perks and abilities, Dark and Darker style: each class has a few perks (always on; he picks two)
// and a few abilities, of which he puts two on his ability keys, Q and E (the two ability buttons on
// a phone). A caster's Spell Memory is one of them: held, it opens the spell wheel (the spells he
// memorised, filled in the Class tab), and the spell he picks there is cast with the attack. They are
// chosen in the lobby's Class tab and kept per class. Perks only change numbers in computeStats
// (stats.ts); abilities are run by the game.
import type { ClassId } from "./classes";
import { spellsOf, type SpellId } from "./spells";

export type PerkId =
  | "weapon_mastery"
  | "defense_expert"
  | "robust"
  | "swift"
  | "ranged_mastery"
  | "nimble_fingers"
  | "steady_aim"
  | "light_step"
  | "advanced_healer"
  | "undead_slaying"
  | "blunt_mastery"
  | "protection_evil"
  | "arcane_mastery"
  | "sage"
  | "quick_chant"
  | "fire_mastery"
  | "backstab"
  | "ambush"
  | "light_fingers"
  | "fleet_foot";
export type SkillId = "spell_memory" | "second_wind" | "sprint" | "quick_shot" | "snare" | "smite" | "prayer" | "arcane_shield" | "intense_focus" | "hide" | "poison_blade";

export interface Perk {
  id: PerkId;
  name: string;
  note: string;
}
export interface Skill {
  id: SkillId;
  name: string;
  note: string;
  /** Seconds before it can be used again (cooldown reduction shortens it). */
  cooldown: number;
  /** Spell Memory: held, it opens the spell wheel instead of running on a cooldown. */
  wheel?: boolean;
}

/** The ability keys, in slot order. */
export const ABILITY_KEYS = ["Q", "E"] as const;
export const ABILITY_SLOTS = 2;
/** The two slots: an ability each (or none). */
export type AbilitySlots = [SkillId | null, SkillId | null];

const SPELL_MEMORY: Skill = {
  id: "spell_memory",
  name: "Spell Memory",
  note: "Hold to open your spell wheel and pick a spell; the attack casts it. Fill the wheel below.",
  cooldown: 0,
  wheel: true,
};

export const PERK_SLOTS = 2;

const PERKS: Partial<Record<ClassId, Perk[]>> = {
  fighter: [
    { id: "weapon_mastery", name: "Weapon Mastery", note: "+10% damage with the sword." },
    { id: "defense_expert", name: "Defense Expert", note: "+15 armour rating." },
    { id: "robust", name: "Robust", note: "+10 maximum health." },
    { id: "swift", name: "Swift", note: "+4% move speed." },
  ],
  ranger: [
    { id: "ranged_mastery", name: "Ranged Weapons Expert", note: "+12% damage with bows." },
    { id: "nimble_fingers", name: "Nimble Fingers", note: "Reload 35% faster." },
    { id: "steady_aim", name: "Steady Aim", note: "Draw the bow 25% faster." },
    { id: "light_step", name: "Light Step", note: "+6% move speed while you wear no plate or mail." },
  ],
  cleric: [
    { id: "advanced_healer", name: "Advanced Healer", note: "Healing spells heal 25% more." },
    { id: "undead_slaying", name: "Undead Slaying", note: "+20% damage from your blows and spells against the undead." },
    { id: "blunt_mastery", name: "Blunt Weapon Mastery", note: "+10% damage with the mace." },
    { id: "protection_evil", name: "Protection from Evil", note: "+25 magic resistance." },
  ],
  wizard: [
    { id: "arcane_mastery", name: "Arcane Mastery", note: "+15% damage with your spells." },
    { id: "sage", name: "Sage", note: "+3 memory capacity: room for another spell." },
    { id: "quick_chant", name: "Quick Chant", note: "Cast 20% faster." },
    { id: "fire_mastery", name: "Fire Mastery", note: "Fireball hits 25% harder and bursts a metre wider." },
  ],
  rogue: [
    { id: "backstab", name: "Backstab", note: "+40% damage on blows that land from behind." },
    { id: "ambush", name: "Ambush", note: "The first blow out of hiding deals 60% more on top." },
    { id: "light_fingers", name: "Light Fingers", note: "+30% interaction speed: bandages and the like go faster." },
    { id: "fleet_foot", name: "Fleet Foot", note: "+6% move speed." },
  ],
};

const SKILLS: Partial<Record<ClassId, Skill[]>> = {
  fighter: [
    { id: "second_wind", name: "Second Wind", note: "Get your breath back: heal a third of your health over eight seconds.", cooldown: 90 },
    { id: "sprint", name: "Sprint", note: "For six seconds you move 25% faster.", cooldown: 24 },
  ],
  ranger: [
    { id: "quick_shot", name: "Quick Shot", note: "For six seconds the bow draws three times as fast.", cooldown: 30 },
    { id: "snare", name: "Snare Trap", note: "Set iron jaws at your feet. The first monster to step in is bitten and held for three seconds.", cooldown: 20 },
  ],
  cleric: [
    SPELL_MEMORY,
    { id: "smite", name: "Smite", note: "Your next weapon blow in ten seconds strikes with holy fire: 25 more magic damage, twice that to the undead.", cooldown: 18 },
    { id: "prayer", name: "Prayer", note: "A quick word with the gods: one charge back on every spell you know.", cooldown: 75 },
  ],
  wizard: [
    SPELL_MEMORY,
    { id: "arcane_shield", name: "Arcane Shield", note: "A shell of mana takes the next 40 damage for you (for ten seconds).", cooldown: 30 },
    { id: "intense_focus", name: "Intense Focus", note: "Your next three spells cost no charges.", cooldown: 50 },
  ],
  rogue: [
    { id: "hide", name: "Hide", note: "Melt into the shadows for ten seconds: monsters lose you. A blow out of hiding hits 25% harder; striking or being hurt ends it.", cooldown: 25 },
    { id: "poison_blade", name: "Poisoned Blade", note: "For fifteen seconds every blow poisons: 4 damage a second for five seconds, through armour.", cooldown: 30 },
  ],
};

export const perksOf = (cls: ClassId): Perk[] => PERKS[cls] ?? [];
export const skillsOf = (cls: ClassId): Skill[] => SKILLS[cls] ?? [];
export const skillById = (id: SkillId | null | undefined): Skill | null => {
  if (!id) return null;
  for (const k of Object.keys(SKILLS)) for (const s of SKILLS[k as ClassId] ?? []) if (s.id === id) return s;
  return null;
};

/** What he has picked for a class. */
export interface Loadout {
  perks: PerkId[];
  /** The abilities on Q and E. */
  abilities: AbilitySlots;
  /** The spell wheel (casters; spells.ts), in wheel order from the top. Trimmed to his memory where it is used. */
  spells: SpellId[];
}

/** A class's first two perks and first two abilities (Spell Memory first for a caster), until he picks. */
export const defaultLoadout = (cls: ClassId): Loadout => {
  const ids = skillsOf(cls).map((s) => s.id);
  return {
    perks: perksOf(cls).slice(0, PERK_SLOTS).map((p) => p.id),
    abilities: [ids[0] ?? null, ids[1] ?? null],
    spells: spellsOf(cls).map((s) => s.id),
  };
};

/** Is Spell Memory on one of his keys (so the spell wheel is his)? */
export const hasWheel = (l: Loadout): boolean => l.abilities.some((a) => !!a && !!skillById(a)?.wheel);

/** Put ability `id` on slot `slot`; if it was on the other slot, the two swap. */
export function assignAbility(l: Loadout, slot: 0 | 1, id: SkillId): Loadout {
  const next: AbilitySlots = [l.abilities[0], l.abilities[1]];
  const other = slot === 0 ? 1 : 0;
  if (next[other] === id) next[other] = next[slot];
  next[slot] = id;
  return { ...l, abilities: next };
}

const KEY = "simforge.explorer.loadout.v1";

/** His picks for every class he has set up (a class he has not is given its default). */
export function loadLoadout(cls: ClassId): Loadout {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Loadout & { skill?: SkillId | null }>;
    const l = all[cls];
    if (l && Array.isArray(l.perks)) {
      const perks = perksOf(cls).map((p) => p.id);
      const skills = skillsOf(cls).map((s) => s.id);
      const spells = spellsOf(cls).map((s) => s.id);
      const ok = (a: SkillId | null | undefined): SkillId | null => (a && skills.indexOf(a) >= 0 ? a : null);
      // His two abilities; a save from before them had one skill (a caster gets Spell Memory beside it).
      let slots: AbilitySlots;
      if (Array.isArray(l.abilities)) slots = [ok(l.abilities[0]), ok(l.abilities[1])];
      else {
        const one = ok(l.skill);
        const wheel = skills.indexOf("spell_memory") >= 0 ? "spell_memory" : null;
        slots = wheel ? [wheel, one] : [one, skills.filter((x) => x !== one)[0] ?? null];
      }
      if (slots[0] && slots[0] === slots[1]) slots[1] = null;
      // An empty slot takes the next ability not already on the other.
      for (const k of [0, 1] as const) if (!slots[k]) slots[k] = skills.filter((x) => x !== slots[0] && x !== slots[1])[0] ?? null;
      return {
        spells: Array.isArray(l.spells) ? l.spells.filter((p) => spells.indexOf(p) >= 0) : spells,
        perks: l.perks.filter((p) => perks.indexOf(p) >= 0).slice(0, PERK_SLOTS),
        abilities: slots,
      };
    }
  } catch {
    // Blocked or broken storage: the default.
  }
  return defaultLoadout(cls);
}

export function saveLoadout(cls: ClassId, l: Loadout): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Loadout>;
    all[cls] = l;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: the picks last this visit.
  }
}
