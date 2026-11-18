// No-man's land. World axes: x right, y up, z towards the camera's side. Our trench runs along z at
// OUR_X (left), the enemy's at ENEMY_X (right, on a slight rise). The dead horse lies at the origin
// on its back, legs in the air, head towards the enemy (+x). The papier-mache copy is the same
// shape, hollow: in the cutaway (z = 0 clipping plane, main.js) its inside shows.
// The workshop behind the lines is its own little set far off at WS.
import * as THREE from "three/webgpu";
import { mudMaterial, waterMaterial, sackMaterial, woodMaterial, hideMaterial, copyMaterial, matte, ironMaterial, paperMaterial, ropeMaterial, pointsMaterial, hairMaterial } from "./materials.js";

export const OUR_X = -11.5;
export const ENEMY_X = 14;
export const TRENCH = { half: 0.85, depth: 1.75 };
export const HORSE_AT = [0, 0, 0];
/** The other carcasses out in the mud (what nobody looks at twice). */
export const CARCASSES = [
  { pos: [-4.6, 0, -7.5], yaw: 2.6, hex: 0x8a8278 },
  { pos: [6.0, 0, -11], yaw: -0.7, hex: 0x4a3020 },
  { pos: [8.4, 0, 2.6], yaw: 0.5, hex: 0x8b6a45 },
  { pos: [-1.5, 0, -19], yaw: 1.4, hex: 0x5a3a26 },
  { pos: [9.5, 0, -24], yaw: -2.2, hex: 0x9a948a },
  { pos: [-6.5, 0, -30], yaw: 0.2, hex: 0x6b4128 },
  { pos: [3.5, 0, -38], yaw: 2.9, hex: 0x3e2a1e },
];
/** L2: the shell hole that gets dug deeper and sandbagged. */
export const DIG = { x: -5.2, z: 1.6, r: 1.25 };
/** L4a: where the second (copy) horse is put down next to the real one. */
export const BESIDE = [2.6, 0, -1.4];
export const WS = [220, 0, 0];

// --- noise --------------------------------------------------------------------------------------
const fract = (x) => x - Math.floor(x);
const h2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Shell craters: scattered, but clear of the horses, the trenches and the dig spot.
export const CRATERS = (() => {
  const out = [];
  const clear = [HORSE_AT, BESIDE, ...CARCASSES.map((c) => c.pos), [DIG.x, 0, DIG.z]];
  for (let i = 0; out.length < 46 && i < 600; i++) {
    const x = -9 + h2(i, 1) * 21, z = -40 + h2(i, 2) * 52, r = 0.9 + h2(i, 3) * 1.9;
    if (clear.some((p) => Math.hypot(p[0] - x, p[2] - z) < r + 2.2)) continue;
    if (out.some((c) => Math.hypot(c.x - x, c.z - z) < (c.r + r) * 0.8)) continue;
    out.push({ x, z, r, d: 0.35 + h2(i, 4) * 0.45 * r, water: h2(i, 5) < 0.45 });
  }
  return out;
})();

const bowl = (dist, r, d) => { // crater profile: a bowl with a raised rim
  if (dist > r * 1.6) return 0;
  const u = dist / r;
  return u < 1 ? -d * (1 - u * u) + 0.18 * d * u * u * u : 0.18 * d * Math.exp(-(((u - 1) / 0.28) ** 2));
};

// height of the mud; dig = 0..1 deepens the L2 shell hole
export function heightAt(x, z, dig = 0) {
  let h = (fbm(x * 0.45 + 20, z * 0.45 + 20, 4) - 0.5) * 0.22;
  h += smooth(6, 18, x) * 0.45;                                   // the enemy side sits on a rise
  h += smooth(30, 120, -z) * (fbm(x * 0.03 + 5, z * 0.03, 4) * 14 - 3); // far low hills
  h += smooth(26, 80, Math.abs(x - 1)) * fbm(x * 0.04, z * 0.04, 3) * 6;
  for (const c of CRATERS) h += bowl(Math.hypot(x - c.x, z - c.z), c.r, c.d);
  h += bowl(Math.hypot(x - DIG.x, z - DIG.z), DIG.r, 0.32 + 0.5 * dig);
  // trenches: a straight cut with a parapet mound on the no-man's-land side
  for (const [tx, side] of [[OUR_X, 1], [ENEMY_X, -1]]) {
    const dx = (x - tx) * side;
    const cut = 1 - smooth(TRENCH.half - 0.15, TRENCH.half + 0.1, Math.abs(dx));
    h = h * (1 - cut) + (-TRENCH.depth) * cut;
    h += 0.45 * Math.exp(-(((dx - TRENCH.half - 0.7) / 0.6) ** 2));
  }
  return h;
}

// a grid dense near the horse, coarse at the horizon
const warp = (u) => Math.sign(u) * (0.04 * Math.abs(u) + 0.96 * Math.pow(Math.abs(u), 4)) * 170;

export function buildTerrain() {
  const N = 460;
  const g = new THREE.PlaneGeometry(1, 1, N, N);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const base = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    base[i * 2] = warp(pos.getX(i) * 2) + 1;
    base[i * 2 + 1] = warp(pos.getZ(i) * 2) - 6;
  }
  const mesh = new THREE.Mesh(g, mudMaterial());
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  let last = -1;
  const set = (dig) => {
    if (dig === last) return;
    last = dig;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 2], z = base[i * 2 + 1];
      pos.setXYZ(i, x, heightAt(x, z, dig), z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  };
  set(0);
  return { mesh, set };
}

// Puddles in the deeper craters (and one in the dig hole once it is deep)
export function buildPuddles() {
  const group = new THREE.Group();
  const mat = waterMaterial();
  for (const c of CRATERS) {
    if (!c.water) continue;
    const m = new THREE.Mesh(new THREE.CircleGeometry(c.r * 0.5, 28), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(c.x, heightAt(c.x, c.z) + c.d * 0.22, c.z);
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

// --- sandbags -----------------------------------------------------------------------------------
function sackGeometry() {
  const g = new THREE.SphereGeometry(1, 16, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // a pillow: flat top and bottom, squared-off ends, a tied neck crease
    y = Math.sign(y) * Math.pow(Math.abs(y), 0.6) * 0.5;
    x = Math.sign(x) * Math.pow(Math.abs(x), 0.55);
    z = Math.sign(z) * Math.pow(Math.abs(z), 0.7);
    p.setXYZ(i, x * 0.36, y * 0.22, z * 0.2);
  }
  g.computeVertexNormals();
  return g;
}
export function sackSet(max) {
  const mesh = new THREE.InstancedMesh(sackGeometry(), sackMaterial(), max);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.count = 0;
  return {
    mesh,
    update(list) {
      let n = 0;
      for (const m of list) { if (n >= max) break; mesh.setMatrixAt(n++, m); }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
const M = (x, y, z, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(s, s, s));

/** Parapet bags along both trench lines (static). */
export const PARAPETS = (() => {
  const out = [];
  for (const [tx, side] of [[OUR_X, 1], [ENEMY_X, -1]]) {
    for (let k = 0; k < 3; k++) {
      for (let z = -34; z < 22; z += 0.74) {
        const zz = z + (k % 2) * 0.37;
        if (h2(zz * 3, k + tx) < 0.06) continue; // a few gaps
        const x = tx + side * (TRENCH.half + 0.15 + k * 0.05);
        out.push(M(x, heightAt(x + side * 0.35, zz) + 0.12 + k * 0.21, zz, Math.PI / 2 + (h2(zz, k) - 0.5) * 0.25, (h2(zz, k + 7) - 0.5) * 0.08));
      }
    }
  }
  return out;
})();

/** L2: the ring of bags round the dig hole, in the order they are laid (two courses). */
export const RING = (() => {
  const out = [];
  for (let k = 0; k < 2; k++) {
    const n = 15;
    for (let j = 0; j < n; j++) {
      const a = ((j + k * 0.5) / n) * Math.PI * 2;
      const r = DIG.r + 0.35 - k * 0.06;
      const x = DIG.x + Math.cos(a) * r, z = DIG.z + Math.sin(a) * r;
      out.push(M(x, heightAt(x, z) + 0.1 + k * 0.2, z, -a, 0));
    }
  }
  return out;
})();

// --- wire, pickets, stumps, duckboards ----------------------------------------------------------
export function buildStatic() {
  const group = new THREE.Group();
  const iron = ironMaterial();
  // barbed-wire belts in front of both trenches: corkscrew pickets with loose coils between
  for (const wx of [OUR_X + 3.2, ENEMY_X - 3.4]) {
    const pickets = [];
    for (let z = -36; z < 22; z += 2.6) pickets.push([wx + (h2(z, wx) - 0.5) * 0.5, z]);
    const pg = new THREE.CylinderGeometry(0.025, 0.03, 1.2, 6);
    for (const [x, z] of pickets) {
      const m = new THREE.Mesh(pg, iron);
      m.position.set(x, heightAt(x, z) + 0.5, z);
      m.rotation.set((h2(x, z) - 0.5) * 0.3, 0, (h2(z, x) - 0.5) * 0.3);
      m.castShadow = true;
      group.add(m);
    }
    for (let i = 0; i < pickets.length - 1; i++) {
      const [x0, z0] = pickets[i], [x1, z1] = pickets[i + 1];
      const pts = [];
      for (let k = 0; k <= 120; k++) {
        const t = k / 120, a = t * Math.PI * 2 * 9;
        const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        const r = 0.38 + 0.06 * Math.sin(t * 17 + i);
        pts.push(new THREE.Vector3(x + Math.cos(a) * r * 0.9, heightAt(x, z) + 0.42 + Math.sin(a) * r - Math.sin(Math.PI * t) * 0.12, z + Math.cos(a) * 0.04));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 360, 0.008, 4), iron);
      m.castShadow = true;
      group.add(m);
    }
  }
  // rifle barrels poking over the enemy parapet, pointed at us
  const gun = matte(0x1e1d1c, 0.5, 0.6);
  for (const z of [-9.5, -6.2, -3.4, 0.9, 3.8, 7.5]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.7, 6), gun);
    b.position.set(ENEMY_X - 1.05, heightAt(ENEMY_X - 1.05, z) + 0.62, z);
    b.rotation.set(0, 0, Math.PI / 2 - 0.08);
    b.castShadow = true;
    group.add(b);
  }
  // shattered tree stumps
  const bark = woodMaterial(0x3e3024, { along: "y" });
  for (const [x, z, hgt, r] of [[-2.4, -15, 3.2, 0.24], [10.5, -19, 4.4, 0.3], [-7.8, -24, 2.4, 0.2], [3.4, -31, 5.5, 0.32], [15.5, -7, 3.0, 0.22], [-1.0, -44, 6, 0.35], [12, -40, 4.2, 0.3]]) {
    const g = new THREE.CylinderGeometry(r * 0.75, r * 1.15, hgt, 10, 6, true);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > hgt / 2 - 0.01) p.setY(i, y - h2(i, x) * hgt * 0.35); // jagged, splintered top
      p.setX(i, p.getX(i) * (0.9 + h2(i, 3) * 0.2));
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, bark);
    m.position.set(x, heightAt(x, z) + hgt / 2 - 0.1, z);
    m.rotation.z = (h2(x, z) - 0.5) * 0.25;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    // one snapped branch stub
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.4, hgt * 0.35, 6), bark);
    b.position.set(x + r, heightAt(x, z) + hgt * 0.55, z);
    b.rotation.z = -0.9;
    b.castShadow = true;
    group.add(b);
  }
  // duckboards along the trench floors and plank revetments on the trench walls
  const plank = woodMaterial(0x6b5136, { along: "z" });
  for (const tx of [OUR_X, ENEMY_X]) {
    for (let z = -34; z < 22; z += 1.4) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 1.3), plank);
      d.position.set(tx, -TRENCH.depth + 0.03, z);
      d.receiveShadow = true;
      group.add(d);
    }
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.06, TRENCH.depth * 0.85, 56), plank);
      wall.position.set(tx + side * (TRENCH.half - 0.08), -TRENCH.depth * 0.55, -6);
      wall.receiveShadow = true;
      group.add(wall);
    }
  }
  return group;
}

// --- the horse ----------------------------------------------------------------------------------
// Lying on its back along +x (head end), belly up, four stiff legs in the air, head turned to the
// camera side with a cartoon X eye. Returns { group, legs[], slit } built from smooth primitives.
const cap = (r, len, seg = 20) => new THREE.CapsuleGeometry(r, len, 8, seg);

// A loft: rings of an elliptical section swept along a smooth centreline through key sections.
// keys: [{ p: [x, y, z], s: side radius, u: up radius }], `ref` is the frame's reference "up".
// The ends close to points, so lofts are watertight (the copy's cutaway shows a clean inside).
function loft(keys, { rings = 40, seg = 22, ref = [0, 1, 0], roll = 0 } = {}) {
  const curve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.p)), false, "centripetal");
  const R = new THREE.Vector3(...ref).normalize();
  const pos = [];
  const idx = [];
  const radii = (t) => { // interpolate the key radii by arc position (keys spaced by index)
    const f = t * (keys.length - 1), i = Math.min(keys.length - 2, Math.floor(f)), k = f - i;
    const e = k * k * (3 - 2 * k);
    return [keys[i].s + (keys[i + 1].s - keys[i].s) * e, keys[i].u + (keys[i + 1].u - keys[i].u) * e];
  };
  const T = new THREE.Vector3(), S = new THREE.Vector3(), Up = new THREE.Vector3(), P = new THREE.Vector3();
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T);
    S.crossVectors(T, R);
    if (S.lengthSq() < 1e-6) S.set(0, 0, 1);
    S.normalize();
    Up.crossVectors(S, T).normalize();
    let [rs, ru] = radii(t);
    if (r === 0 || r === rings) { rs *= 0.02; ru *= 0.02; }
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2 + roll;
      pos.push(P.x + S.x * Math.cos(a) * rs + Up.x * Math.sin(a) * ru, P.y + S.y * Math.cos(a) * rs + Up.y * Math.sin(a) * ru, P.z + S.z * Math.cos(a) * rs + Up.z * Math.sin(a) * ru);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let j = 0; j < seg; j++) {
      const a = r * seg + j, b = r * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Hair strands (mane, tail): thin tapered tubes along wavy paths, merged into one geometry.
function strands(paths, r0 = 0.012) {
  const parts = paths.map((pts) => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(c, 12, r0, 4, false);
    // taper towards the tip
    const p = g.attributes.position, n = 13, ring = 5;
    for (let i = 0; i < n; i++) {
      const k = 1 - (i / (n - 1)) * 0.85, cp = c.getPoint(i / (n - 1));
      for (let j = 0; j < ring; j++) {
        const v = i * ring + j;
        p.setXYZ(v, cp.x + (p.getX(v) - cp.x) * k, cp.y + (p.getY(v) - cp.y) * k, cp.z + (p.getZ(v) - cp.z) * k);
      }
    }
    return g;
  });
  return mergeGeos(parts);
}
function mergeGeos(list) {
  let n = 0, m = 0;
  for (const g of list) { n += g.attributes.position.count; m += g.index.count; }
  const pos = new Float32Array(n * 3), idx = new Uint32Array(m);
  let o = 0, q = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    for (let i = 0; i < g.index.count; i++) idx[q + i] = g.index.array[i] + o;
    o += g.attributes.position.count; q += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeVertexNormals();
  return out;
}

const HORSE_GEO = {}; // built once, shared by every horse (real, copy, carcasses)
function horseGeometry() {
  if (HORSE_GEO.body) return HORSE_GEO;
  // body: lying on its back along x (head +x), spine on the mud, the bloated belly up.
  // keys: x, centre height, half-width (z) and half-height (y)
  const B = [[-1.42, 0.3, 0.06, 0.06], [-1.3, 0.34, 0.26, 0.3], [-1.08, 0.42, 0.42, 0.42], [-0.8, 0.46, 0.47, 0.46], [-0.45, 0.47, 0.45, 0.48],
    [-0.05, 0.5, 0.49, 0.52], [0.35, 0.49, 0.48, 0.5], [0.68, 0.45, 0.43, 0.46], [0.92, 0.4, 0.36, 0.4], [1.1, 0.36, 0.28, 0.32]];
  HORSE_GEO.body = loft(B.map(([x, y, s, u]) => ({ p: [x, y, 0], s, u })), { rings: 48, seg: 28 });
  // neck: from the chest, curving out and down to the head lying on the mud
  HORSE_GEO.neck = loft([
    { p: [0.85, 0.42, 0.0], s: 0.3, u: 0.34 }, { p: [1.15, 0.37, 0.03], s: 0.25, u: 0.3 }, { p: [1.45, 0.3, 0.08], s: 0.2, u: 0.25 },
    { p: [1.72, 0.24, 0.13], s: 0.16, u: 0.2 }, { p: [1.88, 0.22, 0.15], s: 0.15, u: 0.18 },
  ], { rings: 30, seg: 22 });
  // head: lying on its cheek, profile to the camera: deep at the jaw, tapering to a soft muzzle
  HORSE_GEO.head = loft([
    { p: [1.78, 0.25, 0.14], s: 0.1, u: 0.13 }, { p: [1.92, 0.22, 0.17], s: 0.13, u: 0.19 }, { p: [2.06, 0.2, 0.2], s: 0.12, u: 0.17 },
    { p: [2.24, 0.17, 0.23], s: 0.095, u: 0.12 }, { p: [2.4, 0.15, 0.25], s: 0.085, u: 0.1 }, { p: [2.5, 0.14, 0.26], s: 0.08, u: 0.095 }, { p: [2.56, 0.13, 0.265], s: 0.05, u: 0.06 },
  ], { rings: 34, seg: 22, ref: [0, 0.3, 1] });
  // legs: stiff, bloated out from the belly. Front legs reach forward and up, hind legs back.
  // each: the upper leg (muscled), knee/hock, cannon, fetlock, pastern; the hoof separately
  const leg = (pts, r) => loft(pts.map((p, i) => ({ p, s: r[i], u: r[i] * 1.12 })), { rings: 36, seg: 14, ref: [1, 0, 0] });
  const LEGS = [
    { root: [0.62, 0.62, 0.2], pts: [[0.6, 0.75, 0.22], [0.78, 1.15, 0.27], [0.95, 1.42, 0.3], [1.08, 1.78, 0.33], [1.12, 1.88, 0.34], [1.16, 1.98, 0.35]] },
    { root: [0.55, 0.62, -0.2], pts: [[0.52, 0.75, -0.2], [0.62, 1.15, -0.24], [0.8, 1.4, -0.27], [0.96, 1.75, -0.3], [1.0, 1.85, -0.31], [1.04, 1.95, -0.32]] },
    { root: [-0.75, 0.62, 0.22], pts: [[-0.72, 0.75, 0.24], [-0.88, 1.12, 0.3], [-1.05, 1.3, 0.33], [-1.22, 1.68, 0.36], [-1.26, 1.78, 0.37], [-1.3, 1.88, 0.38]] },
    { root: [-0.85, 0.62, -0.2], pts: [[-0.82, 0.75, -0.2], [-0.96, 1.12, -0.25], [-1.16, 1.32, -0.28], [-1.36, 1.66, -0.31], [-1.4, 1.76, -0.32], [-1.44, 1.86, -0.33]] },
  ];
  HORSE_GEO.legs = LEGS.map((L, i) => {
    const hind = i >= 2;
    const upper = leg([L.root, L.pts[0], L.pts[1], L.pts[2]], hind ? [0.2, 0.17, 0.11, 0.08] : [0.16, 0.13, 0.09, 0.075]);
    const lower = leg([L.pts[2], L.pts[3], L.pts[4], L.pts[5]], [0.06, 0.05, 0.065, 0.055]);
    const dir = new THREE.Vector3(...L.pts[5]).sub(new THREE.Vector3(...L.pts[4])).normalize();
    return { upper, lower, hoofAt: L.pts[5], dir };
  });
  HORSE_GEO.hoof = new THREE.CylinderGeometry(0.06, 0.082, 0.12, 16);
  // mane: strands lying out from the crest of the neck onto the mud (the crest is on the ground side)
  const mane = [];
  for (let k = 0; k < 26; k++) {
    const t = k / 25, x = 0.95 + t * 0.85, y = 0.13 - t * 0.04, z = -0.18 - t * 0.06;
    const len = 0.18 + ((k * 37) % 10) / 60, sway = (((k * 53) % 7) - 3) * 0.02;
    mane.push([[x, y + 0.05, z + 0.08], [x + 0.03, y, z - len * 0.4], [x + 0.05 + sway, 0.03, z - len]]);
  }
  HORSE_GEO.mane = strands(mane, 0.014);
  const forelock = [];
  for (let k = 0; k < 6; k++) forelock.push([[1.84, 0.33, 0.12 + k * 0.012], [1.93, 0.35, 0.18 + k * 0.01], [2.02, 0.32 - k * 0.01, 0.24]]);
  HORSE_GEO.forelock = strands(forelock, 0.01);
  // tail: a long switch lying out on the mud behind the rump
  const tail = [];
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI * 2, spread = 0.03 + ((k * 31) % 9) / 140;
    const len = 0.7 + ((k * 17) % 11) / 30;
    tail.push([[-1.35, 0.22 + Math.sin(a) * 0.03, Math.cos(a) * 0.03], [-1.6, 0.08 + Math.sin(a) * 0.03, 0.12 + Math.cos(a) * spread], [-1.35 - len, 0.03, 0.3 + Math.cos(a) * spread * 3 + Math.sin(a) * 0.05]]);
  }
  HORSE_GEO.tail = strands(tail, 0.016);
  return HORSE_GEO;
}

export function buildHorse(mat, { copy = false, points: pointsMat } = {}) {
  const G = horseGeometry();
  const group = new THREE.Group();
  const meshes = [];
  const mk = (parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const points = pointsMat ?? (copy ? mat : pointsMaterial());
  const hair = copy ? mat : hairMaterial();
  const hoofM = copy ? mat : matte(0x2a2420, 0.55);
  const dark = matte(0x120d0a, 0.5);
  mk(group, G.body, mat);
  mk(group, G.neck, mat);
  mk(group, G.head, mat);
  // closed, sunken dead eye on the camera-side cheek, nostrils, the mouth line, ears
  mk(group, new THREE.SphereGeometry(0.03, 12, 8), copy ? mat : matte(0x1c1410, 0.35), [1.97, 0.3, 0.33], [0, 0.4, 0.5], [1.4, 0.45, 0.6]);
  mk(group, new THREE.SphereGeometry(0.035, 12, 8), mat, [1.97, 0.315, 0.325], [0, 0.4, 0.5], [1.45, 0.4, 0.7]); // lid
  for (const dz of [0, 0.07]) mk(group, new THREE.SphereGeometry(0.018, 8, 6), copy ? mat : dark, [2.53, 0.18 - dz * 0.4, 0.27 + dz * 0.4], [0, 0, 0], [0.7, 1.2, 1]);
  mk(group, new THREE.BoxGeometry(0.18, 0.012, 0.012), copy ? mat : dark, [2.43, 0.09, 0.3], [0.4, 0.2, 0.15]);
  for (const s of [-1, 1]) mk(group, new THREE.ConeGeometry(0.045, 0.17, 10), points, [1.78, 0.36 + s * 0.02, 0.13 + s * 0.07], [0.3 * s, 0, 1.5], [1, 1, 0.55]);
  // legs: the upper legs in the coat, the lower legs in the dark points, hooves
  const legs = G.legs.map((L) => {
    const g = new THREE.Group();
    group.add(g);
    mk(g, L.upper, mat);
    mk(g, L.lower, points);
    const h = mk(g, G.hoof, hoofM, L.hoofAt);
    h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), L.dir);
    return g;
  });
  mk(group, G.mane, hair);
  mk(group, G.forelock, hair);
  mk(group, G.tail, hair);
  let slit = null;
  if (copy) {
    slit = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.22), matte(0x050403, 1));
    slit.position.set(1.2, 0.66, 0.03);
    slit.rotation.z = -0.35;
    group.add(slit);
  }
  return { group, legs, slit, meshes };
}

/** The papier-mache's wooden frame: hoops round the barrel and laths along it (workshop, L3c). */
export function buildFrame() {
  const group = new THREE.Group();
  const lath = woodMaterial(0xa07a4e, { along: "x" });
  const hoops = [];
  for (let k = 0; k < 7; k++) {
    const x = -1.05 + k * 0.35;
    const r = 0.45 * Math.sqrt(Math.max(0.05, 1 - ((x / 1.35) ** 4)));
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 6, 28), lath);
    m.position.set(x, 0.44, 0);
    m.rotation.y = Math.PI / 2;
    m.castShadow = true;
    group.add(m);
    hoops.push(m);
  }
  const laths = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.03, 0.04), lath);
    m.position.set(0, 0.44 + Math.sin(a) * 0.42, Math.cos(a) * 0.42);
    m.castShadow = true;
    group.add(m);
    laths.push(m);
  }
  return { group, hoops, laths };
}

export function horseMaterials() {
  return { real: hideMaterial(0x7a4a2c), copy: copyMaterial(0x7a4a2c), copyPoints: copyMaterial(0x231a14), others: CARCASSES.map((c) => hideMaterial(c.hex)) };
}

// --- small props ----------------------------------------------------------------------------------
export function buildProps() {
  const group = new THREE.Group();
  const wood = woodMaterial(0x5a3e26, { along: "x" });
  const steel = matte(0x2e2f31, 0.45, 0.7);
  // rifle (L5): lies in front of the prone observer, barrel to the slit
  const rifle = new THREE.Group();
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.05), wood);
  stock.position.x = -0.15;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.65, 8), steel);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.42, 0.02, 0);
  rifle.add(stock, barrel);
  group.add(rifle);
  // field telephone: a wooden box with a crank, by the observer's head
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.16), woodMaterial(0x6b4a2c)));
  const handset = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.14, 4, 8), matte(0x151515, 0.5));
  handset.rotation.z = Math.PI / 2;
  handset.position.y = 0.09;
  phone.add(handset);
  group.add(phone);
  // spade (L2)
  const spade = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), wood);
  shaft.position.y = 0.45;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.02), steel);
  spade.add(shaft, blade);
  group.add(spade);
  // sketchbook (L3b)
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.2), paperMaterial());
  group.add(book);
  for (const o of [rifle, phone, spade, book]) o.traverse((c) => { if (c.isMesh) c.castShadow = c.receiveShadow = true; });
  return { group, rifle, phone, spade, book };
}

/** A straight rope between two points (rebuilt per frame by moving one stretched cylinder). */
export function buildRope() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), ropeMaterial());
  m.castShadow = true;
  const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  return {
    mesh: m,
    set(from, to) {
      m.visible = !!from;
      if (!from) return;
      a.set(...from); b.set(...to);
      d.subVectors(b, a);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.scale.set(1, d.length(), 1);
      m.quaternion.setFromUnitVectors(up, d.normalize());
    },
  };
}

/** The telephone wire from the horse back to our trench, laid on the mud; `reveal(t)` grows it. */
export function buildWire(from = [-1.3, 0.1, -0.25]) {
  const pts = [];
  for (let k = 0; k <= 80; k++) {
    const t = k / 80;
    const x = from[0] + (OUR_X + 0.9 - from[0]) * t, z = from[2] + Math.sin(t * 9) * 0.25 + t * 0.6;
    pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.03 + (t > 0.97 ? (t - 0.97) * 20 : 0), z));
  }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.028, 5);
  const m = new THREE.Mesh(g, matte(0x1b1b1b, 0.6));
  m.castShadow = true;
  const total = g.index.count;
  return { mesh: m, reveal(t) { m.visible = t > 0; g.setDrawRange(0, Math.floor((total * Math.min(1, t)) / 30) * 30); } };
}

// --- the workshop behind the lines (L3c) ----------------------------------------------------------
export function buildWorkshop() {
  const group = new THREE.Group();
  group.position.set(...WS);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 9), woodMaterial(0x6e5134, { along: "x" }));
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  group.add(floor);
  const wallMat = woodMaterial(0x5d4430, { along: "y" });
  const back = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 0.15), wallMat);
  back.position.set(0, 2.25, -3.2);
  back.receiveShadow = true;
  group.add(back);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.5, 9), wallMat);
  side.position.set(-4.6, 2.25, 0);
  side.receiveShadow = true;
  group.add(side);
  // a window in the back wall (bright, blooms a little)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xd9e2ea).multiplyScalar(1.6) }));
  win.position.set(2.6, 2.4, -3.11);
  group.add(win);
  const bars = matte(0x2b2018, 0.8);
  for (const [w, h, x, y] of [[0.06, 1.15, 2.6, 2.4], [1.65, 0.06, 2.6, 2.4]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), bars);
    b.position.set(x, y, -3.08);
    group.add(b);
  }
  // trestles under the horse, a workbench with paint pots and paper strips
  const trestle = woodMaterial(0x7a5a3a, { along: "x" });
  for (const x of [-0.8, 0.8]) {
    for (const z of [-0.45, 0.45]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), trestle);
      leg.position.set(x, 0.15, z);
      group.add(leg);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 1.1), trestle);
    top.position.set(x, 0.3, 0);
    group.add(top);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.8), trestle);
  bench.position.set(-2.6, 0.9, -2.5);
  group.add(bench);
  for (const x of [-3.5, 1.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.7), trestle);
    leg.position.set(x < 0 ? -3.7 : -1.5, 0.45, -2.5);
    group.add(leg);
  }
  const potCols = [0x6b4128, 0x3b2a1e, 0x8a8278, 0xb9b3a6];
  potCols.forEach((c, i) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.18, 14), matte(0x777a7e, 0.5, 0.6));
    pot.position.set(-3.4 + i * 0.32, 1.04, -2.4);
    const paint = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), matte(c, 0.3));
    paint.rotation.x = -Math.PI / 2;
    paint.position.set(-3.4 + i * 0.32, 1.135, -2.4);
    group.add(pot, paint);
  });
  for (let i = 0; i < 6; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.005, 0.08), paperMaterial());
    strip.position.set(-2.2 + (i % 3) * 0.2, 0.96 + i * 0.006, -2.6 + Math.floor(i / 3) * 0.12);
    strip.rotation.y = i * 0.5;
    group.add(strip);
  }
  // the artist's sketch pinned on an easel beside the work
  const easel = new THREE.Group();
  easel.position.set(-2.4, 0, -0.8);
  easel.rotation.y = 0.5;
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), trestle);
    l.position.set(s * 0.35, 0.95, 0);
    l.rotation.z = s * -0.12;
    easel.add(l);
  }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.7), new THREE.MeshStandardNodeMaterial({ map: sketchTexture(), roughness: 0.9 }));
  board.position.set(0, 1.4, 0.04);
  board.rotation.x = -0.1;
  easel.add(board);
  group.add(easel);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  win.castShadow = false;
  return group;
}

// The artist's sketch: pencil lines of the horse on its back (shared with the HUD overlay).
export const SKETCH_PATHS = [
  "M120 300 C 150 230, 330 220, 420 250 C 470 265, 520 285, 560 300",          // belly line
  "M120 300 C 100 330, 140 360, 200 360 L 470 360 C 520 360, 560 340, 560 300", // back on the ground
  "M560 300 C 610 300, 650 320, 700 345 L 760 352 C 780 356, 780 372, 760 374 L 690 372 C 640 370, 600 360, 560 340", // neck + head
  "M200 250 L 180 150 L 205 80",  // hind leg
  "M245 240 L 255 140 L 230 70",  // hind leg
  "M430 248 L 455 150 L 440 75",  // fore leg
  "M480 262 L 520 165 L 545 95",  // fore leg
  "M118 305 C 90 300, 70 315, 60 335", // tail
  "M715 350 l 12 10 M727 350 l -12 10", // X eye
  "M240 330 C 300 320, 360 325, 420 335 M260 300 C 320 290, 380 292, 430 305", // shading folds
];

function sketchTexture() {
  const c = document.createElement("canvas");
  c.width = 840; c.height = 440;
  const x = c.getContext("2d");
  x.fillStyle = "#ece4cf";
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = "#2c2a28";
  x.lineWidth = 4;
  x.lineCap = "round";
  for (const d of SKETCH_PATHS) x.stroke(new Path2D(d));
  x.font = "bold 26px Georgia";
  x.fillStyle = "#3a3632";
  x.fillText("Bay, 14 hands. Left eye up.", 40, 420);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Placement helper: a matrix for a sack at (x, z) on the mud (used by anim.js for the L2 ring). */
export const sackAt = M;
