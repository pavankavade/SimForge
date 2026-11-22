// Perks and skills, Dark and Darker style: each class has a few perks (always on; he picks two) and
// a few skills (used with G; he picks one). They are chosen in the lobby's Class tab and kept per
// class. Perks only change numbers in computeStats (stats.ts); skills are run by the game.
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
  | "fire_mastery";
export type SkillId = "second_wind" | "quick_shot" | "snare" | "smite" | "prayer" | "arcane_shield" | "intense_focus";

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
}

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
};

const SKILLS: Partial<Record<ClassId, Skill[]>> = {
  fighter: [{ id: "second_wind", name: "Second Wind", note: "Get your breath back: heal a third of your health over eight seconds.", cooldown: 90 }],
  ranger: [
    { id: "quick_shot", name: "Quick Shot", note: "For six seconds the bow draws three times as fast.", cooldown: 30 },
    { id: "snare", name: "Snare Trap", note: "Set iron jaws at your feet. The first monster to step in is bitten and held for three seconds.", cooldown: 20 },
  ],
  cleric: [
    { id: "smite", name: "Smite", note: "Your next weapon blow in ten seconds strikes with holy fire: 25 more magic damage, twice that to the undead.", cooldown: 18 },
    { id: "prayer", name: "Prayer", note: "A quick word with the gods: one charge back on every spell you know.", cooldown: 75 },
  ],
  wizard: [
    { id: "arcane_shield", name: "Arcane Shield", note: "A shell of mana takes the next 40 damage for you (for ten seconds).", cooldown: 30 },
    { id: "intense_focus", name: "Intense Focus", note: "Your next three spells cost no charges.", cooldown: 50 },
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
  skill: SkillId | null;
  /** Memorised spells (casters; spells.ts), in key order. Trimmed to his memory where it is used. */
  spells: SpellId[];
}

/** A class's first two perks and first skill, until he picks. */
export const defaultLoadout = (cls: ClassId): Loadout => ({
  perks: perksOf(cls).slice(0, PERK_SLOTS).map((p) => p.id),
  skill: skillsOf(cls)[0]?.id ?? null,
  spells: spellsOf(cls).map((s) => s.id),
});

const KEY = "simforge.explorer.loadout.v1";

/** His picks for every class he has set up (a class he has not is given its default). */
export function loadLoadout(cls: ClassId): Loadout {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Loadout>;
    const l = all[cls];
    if (l && Array.isArray(l.perks)) {
      const perks = perksOf(cls).map((p) => p.id);
      const skills = skillsOf(cls).map((s) => s.id);
      const spells = spellsOf(cls).map((s) => s.id);
      return {
        spells: Array.isArray(l.spells) ? l.spells.filter((p) => spells.indexOf(p) >= 0) : spells,
        perks: l.perks.filter((p) => perks.indexOf(p) >= 0).slice(0, PERK_SLOTS),
        skill: l.skill && skills.indexOf(l.skill) >= 0 ? l.skill : skills[0] ?? null,
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
