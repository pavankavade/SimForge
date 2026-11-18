// A skeleton's bones, made in code and hung on the fighter's rig (a fleshless `createPaladin`), so
// it walks, cuts, blocks and falls with the fighter's own animation. Every bone is sized from the
// rig's rest joints (REST: limbs hang along -Y, the body faces +Z, its left is +X), so it matches
// the armour fitted to the same rig. One merged mesh per rig bone keeps the draw calls low.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EYE_LOCAL, REST, type BoneName, type Paladin } from "../../artifacts/characters/paladin";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const DOWN = V(0, -1, 0);

/** A long bone along -Y from 0 to -len: knobbed ends, a slimmer waist (lathe). */
function shaft(len: number, r: number, top = 1.7, bottom = 1.5, seg = 9): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const prof: Array<[number, number]> = [
    [0.0, 0.25],
    [0.02, top * 0.9],
    [0.07, top],
    [0.14, 1.05],
    [0.3, 0.92],
    [0.5, 0.86],
    [0.7, 0.92],
    [0.86, 1.08],
    [0.93, bottom],
    [0.98, bottom * 0.9],
    [1.0, 0.25],
  ];
  for (const [u, k] of prof) pts.push(new THREE.Vector2(r * k, -u * len));
  pts.reverse();
  return new THREE.LatheGeometry(pts, seg);
}

/** Point a geometry built along -Y from `from` toward `to` (bone-local). */
function along(g: THREE.BufferGeometry, from: THREE.Vector3, to: THREE.Vector3): THREE.BufferGeometry {
  const dir = to.clone().sub(from);
  const q = new THREE.Quaternion().setFromUnitVectors(DOWN, dir.clone().normalize());
  g.applyQuaternion(q);
  g.translate(from.x, from.y, from.z);
  return g;
}

/** A bone from a to b (bone-local), radius r. */
const boneAB = (a: THREE.Vector3, b: THREE.Vector3, r: number, top?: number, bottom?: number, seg?: number) =>
  along(shaft(a.distanceTo(b), r, top, bottom, seg), a, b);

/** A tube along a smooth curve (ribs, clavicles, the jaw). */
function tube(points: THREE.Vector3[], r: number, seg = 14, radial = 5): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, seg, r, radial, false);
  return g;
}

function ball(r: number, at: THREE.Vector3, sx = 1, sy = 1, sz = 1, w = 10, h = 8): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, w, h);
  g.scale(sx, sy, sz);
  g.translate(at.x, at.y, at.z);
  return g;
}

function box(w: number, h: number, d: number, at: THREE.Vector3, rx = 0, ry = 0, rz = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(at.x, at.y, at.z);
  return g;
}

/** Strip down to position + normal so everything merges. */
function clean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== "position" && k !== "normal") out.deleteAttribute(k);
  return out;
}

const merge = (gs: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const m = mergeGeometries(gs.map(clean), false);
  if (!m) throw new Error("skeleton: merge failed");
  return m;
};

/** Joint `b` in bone `a`'s frame (rest pose: bones are unrotated, so it is a plain difference). */
const rel = (a: BoneName, b: BoneName) => REST[b].clone().sub(REST[a]);

/** The geometry per rig bone, built once from the rest joints and shared by every skeleton. */
interface SkeletonGeo {
  parts: Array<{ bone: BoneName; geo: THREE.BufferGeometry; tag?: "skull" | "hand" | "foot" }>;
  eyes: THREE.BufferGeometry;
  sockets: THREE.BufferGeometry;
}
let shared: SkeletonGeo | null = null;

function buildGeo(): SkeletonGeo {
  const parts: SkeletonGeo["parts"] = [];
  const add = (bone: BoneName, gs: THREE.BufferGeometry[], tag?: "skull" | "hand" | "foot") => parts.push({ bone, geo: merge(gs), tag });

  // ---- Skull (head bone; the joint is the base of the skull). EYE_LOCAL is the eyes' centre.
  const e = EYE_LOCAL;
  // The vault sits low and forward so the forehead runs down into the brow ridge.
  const cranium = ball(0.1, V(0, e.y + 0.028, e.z - 0.076), 0.74, 0.88, 0.9, 20, 16);
  const brow = ball(0.05, V(0, e.y + 0.022, e.z - 0.02), 1.25, 0.3, 0.76, 14, 8);
  const cheekL = ball(0.022, V(0.042, e.y - 0.028, e.z - 0.002), 1.2, 0.8, 1, 8, 6);
  const cheekR = ball(0.022, V(-0.042, e.y - 0.028, e.z - 0.002), 1.2, 0.8, 1, 8, 6);
  const maxilla = ball(0.035, V(0, e.y - 0.045, e.z - 0.005), 1.05, 0.75, 0.85, 12, 8);
  const temples = ball(0.07, V(0, e.y - 0.005, e.z - 0.06), 0.95, 0.75, 0.9, 14, 8);
  const occiput = ball(0.058, V(0, e.y - 0.004, e.z - 0.13), 1.05, 0.95, 0.8, 12, 8);
  // The upper teeth: a short row under the maxilla.
  const teeth: THREE.BufferGeometry[] = [];
  for (let k = -3; k <= 3; k++) {
    const a = (k / 3) * 0.95;
    teeth.push(box(0.0075, 0.014, 0.008, V(Math.sin(a) * 0.028, e.y - 0.07, e.z - 0.01 + Math.cos(a) * 0.028), 0, a, 0));
  }
  // The jaw hangs a little open: a U of bone from the ears to the chin, with its own teeth.
  const jy = e.y - 0.088;
  const jaw = tube(
    [V(0.044, e.y - 0.03, e.z - 0.062), V(0.044, jy, e.z - 0.045), V(0.028, jy - 0.008, e.z - 0.008), V(0, jy - 0.012, e.z + 0.006), V(-0.028, jy - 0.008, e.z - 0.008), V(-0.044, jy, e.z - 0.045), V(-0.044, e.y - 0.03, e.z - 0.062)],
    0.0085,
    16,
    6
  );
  const chin = ball(0.014, V(0, jy - 0.012, e.z), 1.4, 0.8, 0.8, 8, 6);
  for (let k = -2; k <= 2; k++) {
    const a = (k / 2) * 0.85;
    teeth.push(box(0.007, 0.011, 0.007, V(Math.sin(a) * 0.024, jy + 0.004, e.z - 0.022 + Math.cos(a) * 0.024), 0, a, 0));
  }
  // Neck vertebrae under the skull belong to the neck bone (below).
  add("head", [cranium, brow, cheekL, cheekR, maxilla, temples, occiput, jaw, chin, ...teeth], "skull");

  // The eye sockets and the nose: dark hollows set into the face; in each socket a small light
  // (its own material, so it can glow in the kind's colour).
  const sockets = merge([
    ball(0.019, V(0.031, e.y, e.z + 0.004), 1, 0.9, 0.63, 10, 8),
    ball(0.019, V(-0.031, e.y, e.z + 0.004), 1, 0.9, 0.63, 10, 8),
    ball(0.009, V(0, e.y - 0.027, e.z + 0.012), 0.85, 1.35, 0.7, 8, 6),
  ]);
  const eyes = merge([ball(0.0072, V(0.031, e.y + 0.001, e.z + 0.0155), 1, 0.9, 0.6, 8, 6), ball(0.0072, V(-0.031, e.y + 0.001, e.z + 0.0155), 1, 0.9, 0.6, 8, 6)]);

  // ---- Spine: vertebrae from the pelvis to the skull, each on the bone it rides with.
  const spineRun: Array<[BoneName, BoneName, number, number]> = [
    ["hips", "spine", 0.024, 3],
    ["spine", "chest", 0.022, 4],
    ["chest", "neck", 0.019, 6],
    ["neck", "head", 0.015, 3],
  ];
  for (const [b, next, r, n] of spineRun) {
    const to = rel(b, next);
    const gs: THREE.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      // The column runs a hand's width behind the joints (they are at the body's middle).
      const at = to.clone().multiplyScalar(u).add(V(0, 0, b === "neck" ? -0.02 : -0.06));
      const v = new THREE.CylinderGeometry(r, r * 1.05, (to.length() / n) * 0.62, 8);
      v.translate(at.x, at.y, at.z);
      gs.push(v);
      // The spinous process: a little fin out the back.
      gs.push(box(r * 0.45, (to.length() / n) * 0.4, r * 1.6, V(at.x, at.y - 0.004, at.z - r * 1.4), 0.5, 0, 0));
    }
    add(b, gs);
  }

  // ---- Ribcage (chest bone): ribs curving from the spine round to the breastbone.
  {
    const top = rel("chest", "neck").y - 0.075;
    const ribs: THREE.BufferGeometry[] = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const y = top - i * 0.03;
      const w = 0.085 + 0.055 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) - 0.012 * u;
      const dep = 0.075 + 0.03 * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5);
      const zc = -0.005;
      const end = i < 7 ? Math.PI * 0.93 : Math.PI * 0.62;
      for (const side of [1, -1]) {
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 7; k++) {
          const t = 0.18 + ((end - 0.18) * k) / 7;
          pts.push(V(side * w * Math.sin(t), y - 0.045 * Math.pow(t / Math.PI, 1.4), zc - dep * Math.cos(t)));
        }
        ribs.push(tube(pts, 0.0062 + 0.0015 * (1 - u), 12, 5));
      }
    }
    // The breastbone.
    const sy0 = top + 0.005;
    ribs.push(box(0.026, 0.17, 0.012, V(0, sy0 - 0.09, 0.083), -0.18, 0, 0));
    ribs.push(ball(0.016, V(0, sy0 - 0.005, 0.078), 1.4, 0.8, 0.6, 8, 6));
    add("chest", ribs);
  }

  // ---- Shoulder girdle: collarbones (clavicle bones), shoulder blades (chest).
  for (const [clav, arm, side] of [
    ["clavL", "upperArmL", 1],
    ["clavR", "upperArmR", -1],
  ] as Array<[BoneName, BoneName, number]>) {
    const to = rel(clav, arm);
    const c = tube([V(0, -0.005, 0.07), V(to.x * 0.5, to.y * 0.5 + 0.012, 0.06), V(to.x * 0.92, to.y + 0.012, 0.0)], 0.0075, 10, 5);
    // The shoulder blade: a thin tapering plate on the back of the ribs.
    const scap = new THREE.CylinderGeometry(0.035, 0.008, 0.1, 3, 1);
    scap.scale(1, 1, 0.18);
    scap.rotateY(side * 0.35);
    scap.translate(to.x * 0.5, to.y - 0.06, -0.105);
    const socket = ball(0.02, V(to.x * 0.95, to.y + 0.005, -0.01), 1, 1, 1, 8, 6);
    add(clav, [c, scap, socket]);
  }

  // ---- Arms: humerus, then radius and ulna side by side, then the hand.
  for (const s of ["L", "R"] as const) {
    const side = s === "L" ? 1 : -1;
    const up = `upperArm${s}` as BoneName;
    const fore = `foreArm${s}` as BoneName;
    const hand = `hand${s}` as BoneName;
    const elbow = rel(up, fore);
    add(up, [boneAB(V(0, -0.01, 0), elbow, 0.0145, 1.8, 1.7), ball(0.02, V(0, -0.005, 0), 1, 1, 1, 8, 6)]);
    const wrist = rel(fore, hand);
    add(fore, [boneAB(V(side * 0.009, -0.01, 0.006), wrist.clone().add(V(side * 0.012, 0, 0.008)), 0.0085, 1.6, 1.9, 7), boneAB(V(-side * 0.006, 0.0, -0.008), wrist.clone().add(V(-side * 0.006, 0, -0.004)), 0.0078, 2.1, 1.4, 7)]);
    // The hand closed in a fist (what it holds sits in it): knuckles forward of the wrist, the
    // fingers curling under toward the palm (palms face in, toward the body: -side in X).
    const hgs: THREE.BufferGeometry[] = [ball(0.016, V(0, -0.015, 0), 1.2, 1, 1.3, 8, 6)];
    for (let f = 0; f < 4; f++) {
      const z = 0.024 - f * 0.016;
      const k0 = V(0, -0.012, z * 0.6);
      const k1 = V(0, -0.075, z);
      const k2 = V(-side * 0.025, -0.09, z);
      const k3 = V(-side * 0.035, -0.07, z);
      hgs.push(boneAB(k0, k1, 0.0042, 1.4, 1.5, 5), boneAB(k1, k2, 0.0038, 1.3, 1.3, 5), boneAB(k2, k3, 0.0034, 1.2, 1.1, 5));
    }
    hgs.push(boneAB(V(-side * 0.008, -0.01, 0.025), V(-side * 0.022, -0.045, 0.042), 0.0048, 1.4, 1.3, 5), boneAB(V(-side * 0.022, -0.045, 0.042), V(-side * 0.03, -0.068, 0.03), 0.0042, 1.3, 1.1, 5));
    add(hand, hgs, "hand");
  }

  // ---- Pelvis (hips): the two wings, the ring, the sacrum.
  {
    const hip = rel("hips", "thighL");
    const gs: THREE.BufferGeometry[] = [];
    for (const side of [1, -1]) {
      const wing = new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI, 0, Math.PI * 0.55);
      wing.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2);
      wing.rotateZ(side * -0.5);
      wing.scale(0.75, 1.1, 1);
      wing.translate(side * (Math.abs(hip.x) + 0.005), hip.y + 0.075, -0.02);
      gs.push(wing);
      gs.push(ball(0.026, V(side * Math.abs(hip.x), hip.y, 0), 1, 1, 1, 8, 6));
    }
    const ring = new THREE.TorusGeometry(0.075, 0.014, 6, 16);
    ring.rotateX(Math.PI / 2 - 0.5);
    ring.scale(1.15, 1, 0.8);
    ring.translate(0, hip.y + 0.02, 0.0);
    gs.push(ring);
    gs.push(along(new THREE.ConeGeometry(0.035, 0.11, 8).rotateX(Math.PI), V(0, hip.y + 0.09, -0.06), V(0, hip.y - 0.01, -0.075)));
    add("hips", gs);
  }

  // ---- Legs: femur (with its neck into the hip), kneecap, tibia and fibula, then the foot.
  for (const s of ["L", "R"] as const) {
    const side = s === "L" ? 1 : -1;
    const th = `thigh${s}` as BoneName;
    const sh = `shin${s}` as BoneName;
    const ft = `foot${s}` as BoneName;
    const toe = `toe${s}` as BoneName;
    const knee = rel(th, sh);
    add(th, [boneAB(V(side * 0.022, -0.035, 0), knee, 0.018, 1.7, 1.9), boneAB(V(0, 0, 0), V(side * 0.024, -0.04, 0), 0.012, 1.5, 1, 6)]);
    const ankle = rel(sh, ft);
    add(sh, [
      boneAB(V(0, -0.01, 0.004), ankle.clone().add(V(0, 0.01, 0.006)), 0.0155, 1.9, 1.5),
      boneAB(V(side * 0.022, -0.035, -0.008), ankle.clone().add(V(side * 0.022, 0.025, -0.006)), 0.0068, 1.6, 1.8, 6),
      ball(0.018, V(0, 0.01, 0.038), 1, 1.15, 0.6, 8, 6),
    ]);
    // The foot: a heel and ankle block, then five long bones fanning to the toes.
    const tp = rel(ft, toe);
    // Talus under the shin, the heel behind, and the arch of tarsals forward to the long bones.
    const fgs: THREE.BufferGeometry[] = [
      ball(0.021, V(0, -0.012, 0.002), 1.1, 0.9, 1.1, 8, 6),
      ball(0.024, V(0, -0.05, -0.035), 0.9, 0.85, 1.25, 8, 6),
      ball(0.03, V(0, -0.038, 0.012), 1.0, 0.7, 1.8, 10, 6),
    ];
    for (let k = 0; k < 5; k++) {
      const x = (k - 2) * 0.012 * side - side * 0.004;
      fgs.push(boneAB(V(x * 0.6, -0.04, 0.035), V(x, tp.y + 0.008, tp.z + 0.01), 0.0055 - k * 0.0004, 1.5, 1.4, 5));
      fgs.push(boneAB(V(x, tp.y + 0.008, tp.z + 0.012), V(x * 1.05, tp.y - 0.004, tp.z + 0.045 - k * 0.004), 0.0045, 1.2, 1.1, 5));
    }
    add(ft, fgs, "foot");
  }

  return { parts, eyes, sockets };
}

export interface SkeletonBones {
  /** Show or hide the skull (a closed helm), hands (gauntlets), feet (sabatons). */
  sync: (cover: { helm: boolean; gauntlets: boolean; sabatons: boolean }) => void;
  /** The light in its eyes (hex), and how bright (0 when it has died). */
  setGlow: (hex: number, intensity: number) => void;
  dispose: () => void;
}

let boneMat: THREE.MeshStandardMaterial | null = null;
/** Old bone: a dry ivory with grime in it, a little rough. */
function boneMaterial(): THREE.MeshStandardMaterial {
  if (boneMat) return boneMat;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#cfc1a0";
    g.fillRect(0, 0, 128, 128);
    let s = 7;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 900; i++) {
      const v = rnd();
      g.fillStyle = v < 0.5 ? `rgba(92,74,48,${0.05 + rnd() * 0.12})` : `rgba(240,232,210,${0.05 + rnd() * 0.1})`;
      g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 5, 1 + rnd() * 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  boneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.82, metalness: 0 });
  // The geometry carries no UVs: map by world-ish position instead (triplanar-lite on object xy/zy).
  boneMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBonePos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBonePos = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBonePos;")
      .replace(
        "#include <map_fragment>",
        "vec4 sampledDiffuseColor = texture2D( map, vBonePos.xy * 9.0 ) * 0.5 + texture2D( map, vBonePos.zy * 9.0 + 0.37 ) * 0.5;\ndiffuseColor *= sampledDiffuseColor;"
      );
  };
  return boneMat;
}

let socketMat: THREE.MeshStandardMaterial | null = null;
const socketMaterial = () => (socketMat ??= new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: 1, metalness: 0 }));

/** Hang a skeleton's bones on a fleshless fighter's rig. */
export function attachBones(p: Paladin): SkeletonBones {
  if (!shared) shared = buildGeo();
  const mat = boneMaterial();
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7fd4ff });
  const meshes: Array<{ mesh: THREE.Mesh; tag?: string }> = [];
  for (const part of shared.parts) {
    const mesh = new THREE.Mesh(part.geo, mat);
    mesh.name = `bone-${part.bone}`;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    p.rig.bone(part.bone).add(mesh);
    meshes.push({ mesh, tag: part.tag });
  }
  const eyes = new THREE.Mesh(shared.eyes, eyeMat);
  eyes.frustumCulled = false;
  const sockets = new THREE.Mesh(shared.sockets, socketMaterial());
  sockets.frustumCulled = false;
  p.rig.bone("head").add(eyes, sockets);
  const base = new THREE.Color();
  return {
    sync(cover) {
      for (const m of meshes) {
        if (m.tag === "skull") m.mesh.visible = !cover.helm;
        else if (m.tag === "hand") m.mesh.visible = !cover.gauntlets;
        else if (m.tag === "foot") m.mesh.visible = !cover.sabatons;
      }
      eyes.visible = !cover.helm;
      sockets.visible = !cover.helm;
    },
    setGlow(hex, intensity) {
      // Over 1 it blooms; at 0 the sockets are just dark.
      base.setHex(hex);
      eyeMat.color.setRGB(0.02 + base.r * intensity, 0.02 + base.g * intensity, 0.02 + base.b * intensity);
    },
    dispose() {
      for (const m of meshes) m.mesh.removeFromParent();
      eyes.removeFromParent();
      sockets.removeFromParent();
      eyeMat.dispose();
    },
  };
}

/** A long bone on its own (an icon), standing along +Y and centred. */
export function boneGeometry(len: number, r: number): THREE.BufferGeometry {
  const g = shaft(len, r, 1.9, 1.9, 10);
  g.translate(0, len / 2, 0);
  return g;
}

/** The skull on its own (an icon): bone, dark sockets, centred on the eyes. */
export function skullObject(mat: THREE.Material): THREE.Group {
  if (!shared) shared = buildGeo();
  const head = shared.parts.find((p) => p.tag === "skull");
  const o = new THREE.Group();
  if (head) o.add(new THREE.Mesh(head.geo, mat));
  o.add(new THREE.Mesh(shared.sockets, socketMaterial()));
  o.children.forEach((c) => c.position.set(-EYE_LOCAL.x, -EYE_LOCAL.y + 0.02, -EYE_LOCAL.z + 0.06));
  return o;
}
