// The bows the fighter (and the ranger) can shoot: each holds a few arrows loaded (shots before a
// reload with R), draws at its own pace and throws its arrow at its own speed. A short bow is quick
// and light, a longbow slow and heavy, the recurve between. Damage lives on the item def (items.ts);
// this is how each one handles.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type BowShape = "short" | "recurve" | "long";

export interface BowSpec {
  shape: BowShape;
  /** Arrows it holds loaded: shots before a reload (R). */
  capacity: number;
  /** Seconds to full draw (action speed shortens it). */
  drawTime: number;
  /** Arrow speed at full draw, metres per second (a quick release throws it slower). */
  speed: number;
  /** Seconds to load it full again (action speed shortens it). */
  reload: number;
  /** Half its length (the string ties at ±tipY) and how far the string sits back from the grip. */
  tipY: number;
  tipZ: number;
}

export const BOWS: Record<string, BowSpec> = {
  short_bow: { shape: "short", capacity: 10, drawTime: 0.45, speed: 40, reload: 2.2, tipY: 0.5, tipZ: 0.13 },
  recurve_bow: { shape: "recurve", capacity: 7, drawTime: 0.65, speed: 52, reload: 2.6, tipY: 0.625, tipZ: 0.15 },
  long_bow: { shape: "long", capacity: 5, drawTime: 0.95, speed: 64, reload: 3.0, tipY: 0.9, tipZ: 0.17 },
};

export const bowSpec = (id: string | undefined): BowSpec | null => (id ? BOWS[id] ?? null : null);

const clean = (g: THREE.BufferGeometry): THREE.BufferGeometry => {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== "position" && k !== "normal") out.deleteAttribute(k);
  return out;
};

const cache: Partial<Record<BowShape, THREE.BufferGeometry>> = {};
/**
 * The bow's limbs, held at the grip (origin), limbs along ±Y, the archer toward +Z (face +Z at him:
 * yaw + π). A short bow is a small recurve, the recurve curls its tips away from him, a longbow is
 * one long even D of yew.
 */
export function bowLimbs(shape: BowShape): THREE.BufferGeometry {
  const have = cache[shape];
  if (have) return have;
  const spec = shape === "short" ? BOWS.short_bow : shape === "long" ? BOWS.long_bow : BOWS.recurve_bow;
  const pts: THREE.Vector3[] = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N - 0.5;
    const u = Math.abs(2 * t);
    let z: number;
    if (shape === "long") z = (spec.tipZ + 0.01) * u * u;
    else {
      const curl = Math.max(0, (u - 0.72) / 0.28);
      z = (spec.tipZ + 0.09) * u * u - 0.09 * curl * curl;
    }
    pts.push(new THREE.Vector3(0, t * 2 * spec.tipY, z));
  }
  const thick = shape === "long" ? 0.015 : shape === "short" ? 0.011 : 0.012;
  const limbs = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, thick, 6, false);
  const riser = new THREE.CylinderGeometry(thick * 1.6, thick * 1.6, shape === "long" ? 0.2 : 0.28, 8);
  const wrap = new THREE.CylinderGeometry(thick * 1.95, thick * 1.95, 0.1, 8);
  const g = mergeGeometries([limbs, riser, wrap].map(clean), false) ?? limbs;
  cache[shape] = g;
  return g;
}

/** Wood colours: ash for the short bow, dark horn-and-ash for the recurve, pale yew for the longbow. */
export const BOW_WOOD: Record<BowShape, number> = { short: 0x8a6238, recurve: 0x6b4426, long: 0xb08a55 };
