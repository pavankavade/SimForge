// Small things the monsters carry or leave, made in code: mana crystals (in a slime's heart, on the
// floor, in the bag), the skeleton archer's bow and arrows, the mage's staff and its bolts.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RARITY, rarityRank, type Rarity } from "../items";

const clean = (g: THREE.BufferGeometry): THREE.BufferGeometry => {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== "position" && k !== "normal") out.deleteAttribute(k);
  return out;
};
const merge = (gs: THREE.BufferGeometry[]) => {
  const m = mergeGeometries(gs.map(clean), false);
  if (!m) throw new Error("props: merge failed");
  return m;
};

// ---- Mana crystals ---------------------------------------------------------------------------

/** One six-sided crystal, pointed at both ends, along +Y from 0 to `h`. */
function prism(r: number, h: number, tip = 0.32, tilt = 0, turn = 0, at = new THREE.Vector3()): THREE.BufferGeometry {
  const body = new THREE.CylinderGeometry(r, r * 0.92, h * (1 - tip - 0.08), 6, 1, true);
  body.translate(0, h * (0.08 + (1 - tip - 0.08) / 2), 0);
  const top = new THREE.ConeGeometry(r, h * tip, 6, 1, true);
  top.translate(0, h * (1 - tip / 2), 0);
  const bot = new THREE.ConeGeometry(r * 0.92, h * 0.08, 6, 1, true);
  bot.rotateX(Math.PI);
  bot.translate(0, h * 0.04, 0);
  const g = merge([body, top, bot]);
  g.rotateZ(tilt);
  g.rotateY(turn);
  g.translate(at.x, at.y, at.z);
  return g;
}

const crystalGeos: Partial<Record<Rarity, THREE.BufferGeometry>> = {};
/**
 * A crystal of rarity `r`, about 10 cm tall (scale it): rarer ones grow a cluster of side points,
 * so the rarity reads from the shape as well as the colour.
 */
export function crystalGeometry(r: Rarity): THREE.BufferGeometry {
  const have = crystalGeos[r];
  if (have) return have;
  const k = rarityRank(r);
  const gs = [prism(0.026, 0.1)];
  const sides = Math.min(5, k);
  for (let i = 0; i < sides; i++) {
    const a = (i / Math.max(1, sides)) * Math.PI * 2 + 0.4;
    gs.push(prism(0.016 + 0.002 * (i % 2), 0.055 + 0.01 * ((i * 7) % 3), 0.34, 0.45 + 0.1 * (i % 2), a, new THREE.Vector3(Math.cos(a) * 0.012, 0.004, Math.sin(a) * 0.012)));
  }
  const g = merge(gs);
  g.computeVertexNormals();
  crystalGeos[r] = g;
  return g;
}

const crystalMats: Partial<Record<Rarity, THREE.MeshStandardMaterial>> = {};
/** Glassy, faceted and lit from within in the rarity's colour (it blooms). */
export function crystalMaterial(r: Rarity): THREE.MeshStandardMaterial {
  const have = crystalMats[r];
  if (have) return have;
  const c = new THREE.Color(RARITY[r].color);
  const m = new THREE.MeshStandardMaterial({
    color: c.clone().multiplyScalar(0.55),
    emissive: c,
    emissiveIntensity: 0.9 + rarityRank(r) * 0.12,
    roughness: 0.12,
    metalness: 0.15,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  });
  crystalMats[r] = m;
  return m;
}

export function crystalMesh(r: Rarity): THREE.Mesh {
  const m = new THREE.Mesh(crystalGeometry(r), crystalMaterial(r));
  m.castShadow = false;
  return m;
}

// ---- The archer's bow and arrows -------------------------------------------------------------

let bowGeo: { limbs: THREE.BufferGeometry; string: THREE.BufferGeometry } | null = null;
/** A recurve of horn and bone, held at the grip (origin), limbs along ±Y, belly toward +Z. */
export function bowGeometry() {
  if (bowGeo) return bowGeo;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16 - 0.5;
    const y = t * 1.25;
    // Bent back away from the archer (-Z), with the tips recurving forward.
    const z = -0.16 * (1 - Math.pow(2 * t, 2)) + 0.05 * Math.pow(Math.abs(2 * t), 6);
    pts.push(new THREE.Vector3(0, y, z));
  }
  const limbs = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.013, 6, false);
  const grip = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8);
  grip.translate(0, 0, -0.16);
  const str = new THREE.CylinderGeometry(0.0022, 0.0022, 1.0, 4);
  bowGeo = { limbs: merge([limbs, grip]), string: str };
  return bowGeo;
}

let arrowGeo: THREE.BufferGeometry | null = null;
/** An arrow along +Z: tip at +0.36, nock at -0.36. */
export function arrowGeometry(): THREE.BufferGeometry {
  if (arrowGeo) return arrowGeo;
  const shaft = new THREE.CylinderGeometry(0.0045, 0.0045, 0.7, 5);
  shaft.rotateX(Math.PI / 2);
  const head = new THREE.ConeGeometry(0.012, 0.05, 4);
  head.rotateX(Math.PI / 2);
  head.translate(0, 0, 0.37);
  const fl: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.BoxGeometry(0.0015, 0.022, 0.09);
    f.translate(0, 0.012, -0.3);
    f.rotateZ((i / 3) * Math.PI * 2);
    fl.push(f);
  }
  arrowGeo = merge([shaft, head, ...fl]);
  return arrowGeo;
}

// ---- The mage's staff and bolts --------------------------------------------------------------

let staffGeo: { shaft: THREE.BufferGeometry; head: THREE.BufferGeometry } | null = null;
/** A blackthorn staff along +Z from -0.55 to +0.95, a thighbone lashed at the top round a crystal. */
export function staffGeometry() {
  if (staffGeo) return staffGeo;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector3(Math.sin(t * 9) * 0.008, Math.cos(t * 7) * 0.008, -0.55 + t * 1.45));
  }
  const rod = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.016, 6, false);
  const fork: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    fork.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0.88), new THREE.Vector3(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.98), new THREE.Vector3(Math.cos(a) * 0.025, Math.sin(a) * 0.025, 1.08)]),
        8,
        0.007,
        5,
        false
      )
    );
  }
  const head = crystalGeometry("rare").clone();
  head.rotateX(Math.PI / 2);
  head.scale(0.8, 0.8, 0.8);
  head.translate(0, 0, 0.93);
  staffGeo = { shaft: merge([rod, ...fork]), head };
  return staffGeo;
}

let glowTex: THREE.Texture | null = null;
/** A soft round glow for sprites (bolts, a slime's heart). */
export function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
