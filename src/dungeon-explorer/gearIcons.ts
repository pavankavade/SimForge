// Inventory pictures of the armour, drawn from his own body: every plate piece, then the same shapes
// in leather for the leathers (items.ts LEATHER_IDS). He is put back as he was afterwards.
import type * as THREE from "three";
import type { Paladin } from "../artifacts/characters/paladin";
import { LEATHER_IDS } from "./items";

export function renderGearIcons(p: Paladin, gl: THREE.WebGLRenderer, size = 112): Record<string, string> {
  const before = { ...p.finish };
  for (const [, slot] of LEATHER_IDS) p.setFinish(slot, "plate");
  const out: Record<string, string> = {};
  const plate = p.renderIcons(gl, size);
  for (const k of Object.keys(plate)) out[k] = plate[k as keyof typeof plate] as string;
  for (const [, slot] of LEATHER_IDS) p.setFinish(slot, "leather");
  const leather = p.renderIcons(gl, size);
  for (const [id, slot] of LEATHER_IDS) {
    const url = leather[slot];
    if (url) out[id] = url;
  }
  for (const [, slot] of LEATHER_IDS) p.setFinish(slot, before[slot] ?? "plate");
  return out;
}
