// Inventory pictures of the armour, drawn from his own body: every armour item is the rig pieces it
// shows (items.ts `shows`), together, in its finish (plate, leather or cloth). The kit's sword and
// shield are rendered too. Items that show nothing on him (hoods, hats, jewellery) are drawn
// instead (icons.ts). He is put back as he was afterwards.
import type * as THREE from "three";
import type { ArmorSlot, Finish, Paladin } from "../artifacts/characters/paladin";
import { ARMOR_IDS, def } from "./items";

export function renderGearIcons(p: Paladin, gl: THREE.WebGLRenderer, size = 112): Record<string, string> {
  const before = { ...p.finish };
  const out: Record<string, string> = {};
  const finishes: Finish[] = ["plate", "leather", "cloth"];
  const all = ARMOR_IDS.filter((id) => (def(id).shows ?? []).length);
  for (const finish of finishes) {
    const groups: Record<string, ArmorSlot[]> = {};
    for (const id of all) if ((def(id).finish ?? "plate") === finish) groups[id] = def(id).shows as ArmorSlot[];
    if (finish === "plate") {
      groups.sword = ["sword"];
      groups.shield = ["shield"];
    }
    const pieces = Object.keys(groups).reduce<ArmorSlot[]>((a, k) => a.concat(groups[k]), []);
    for (const s of pieces) p.setFinish(s, finish);
    const pics = p.renderGroupIcons(gl, groups, size);
    for (const k of Object.keys(pics)) out[k] = pics[k];
  }
  for (const s of Object.keys(p.finish) as ArmorSlot[]) p.setFinish(s, before[s] ?? "plate");
  return out;
}
