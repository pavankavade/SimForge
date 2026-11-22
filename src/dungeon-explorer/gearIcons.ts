// Inventory pictures of the armour, drawn from his own body: every plate piece, then the same shapes
// in leather for the leathers, in cloth for the wizard's cloth and in shadow for the rogue's
// (items.ts LEATHER_IDS, CLOTH_IDS, SHADOW_IDS).
// He is put back as he was afterwards.
import type * as THREE from "three";
import type { ArmorSlot, Finish, Paladin } from "../artifacts/characters/paladin";
import { CLOTH_IDS, LEATHER_IDS, SHADOW_IDS } from "./items";

export function renderGearIcons(p: Paladin, gl: THREE.WebGLRenderer, size = 112): Record<string, string> {
  const before = { ...p.finish };
  const sets: Array<[Finish, Array<[string, ArmorSlot]>]> = [
    ["leather", LEATHER_IDS],
    ["cloth", CLOTH_IDS],
    ["shadow", SHADOW_IDS],
  ];
  const slots = LEATHER_IDS.concat(CLOTH_IDS, SHADOW_IDS).map(([, s]) => s);
  for (const s of slots) p.setFinish(s, "plate");
  const out: Record<string, string> = {};
  const plate = p.renderIcons(gl, size);
  for (const k of Object.keys(plate)) out[k] = plate[k as keyof typeof plate] as string;
  for (const [finish, ids] of sets) {
    for (const [, slot] of ids) p.setFinish(slot, finish);
    const pics = p.renderIcons(gl, size);
    for (const [id, slot] of ids) {
      const url = pics[slot];
      if (url) out[id] = url;
    }
    for (const s of slots) p.setFinish(s, "plate");
  }
  for (const s of slots) p.setFinish(s, before[s] ?? "plate");
  return out;
}
