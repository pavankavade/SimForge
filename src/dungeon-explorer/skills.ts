// Perks and skills, Dark and Darker style: each class has a few perks (always on; he picks two) and
// a few skills (used with G; he picks one). They are chosen in the lobby's Class tab and kept per
// class. Perks only change numbers in computeStats (stats.ts); skills are run by the game.
import type { ClassId } from "./classes";

export type PerkId =
  | "weapon_mastery"
  | "defense_expert"
  | "robust"
  | "swift"
  | "ranged_mastery"
  | "nimble_fingers"
  | "steady_aim"
  | "light_step";
export type SkillId = "second_wind" | "quick_shot" | "snare";

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
};

const SKILLS: Partial<Record<ClassId, Skill[]>> = {
  fighter: [{ id: "second_wind", name: "Second Wind", note: "Get your breath back: heal a third of your health over eight seconds.", cooldown: 90 }],
  ranger: [
    { id: "quick_shot", name: "Quick Shot", note: "For six seconds the bow draws three times as fast.", cooldown: 30 },
    { id: "snare", name: "Snare Trap", note: "Set iron jaws at your feet. The first monster to step in is bitten and held for three seconds.", cooldown: 20 },
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
}

/** A class's first two perks and first skill, until he picks. */
export const defaultLoadout = (cls: ClassId): Loadout => ({ perks: perksOf(cls).slice(0, PERK_SLOTS).map((p) => p.id), skill: skillsOf(cls)[0]?.id ?? null });

const KEY = "simforge.explorer.loadout.v1";

/** His picks for every class he has set up (a class he has not is given its default). */
export function loadLoadout(cls: ClassId): Loadout {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Loadout>;
    const l = all[cls];
    if (l && Array.isArray(l.perks)) {
      const perks = perksOf(cls).map((p) => p.id);
      const skills = skillsOf(cls).map((s) => s.id);
      return {
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
