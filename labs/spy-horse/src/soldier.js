// Realistic WW1 soldiers for the spy-horse film, replacing the episodes' chibi toy cast: real
// proportions (about 1.78 m, a small head), wool tunic with pockets, belt, webbing and pouches,
// puttees and ankle boots, a Brodie helmet with chin strap (or a peaked cap), and a modelled face.
// Plain PBR, no ink outline. The figure is driven by the episode rig's joint angles
// (src/artifacts/characters/hero/poses.ts RigPose, same conventions as AdventurerUnit), so the
// film's tracks and ActorView-style pose easing work unchanged.
import * as THREE from "three/webgpu";
import { color, float, mix, positionWorld, positionLocal, mx_fractal_noise_float, mx_noise_float, sin, abs, bumpMap, smoothstep, vec3, attribute } from "three/tsl";

// metric rig (feet on y = 0, facing +z)
export const BODY = {
  hipY: 0.93, hipX: 0.09, thigh: 0.44, shin: 0.43,
  shoulderY: 1.43, shoulderX: 0.19, upperArm: 0.29, forearm: 0.26,
  neckY: 1.5, headY: 1.63,
  /** chibi rig -> metric: vertical offsets (bob) are scaled by the hip-height ratio */
  bobK: 0.93 / 0.62,
};

const lin = (hex) => color(new THREE.Color(hex));
const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

// --- materials ---------------------------------------------------------------------------------
function wool(hex, dirt = 0.35) {
  return once(`wool-${hex}-${dirt}`, () => {
    const m = new THREE.MeshStandardNodeMaterial();
    const p = positionWorld;
    const weave = sin(p.x.mul(400)).mul(sin(p.y.mul(400))).mul(0.5).add(0.5);
    const blot = mx_fractal_noise_float(p.mul(3.5), 3, 2, 0.5).mul(0.5).add(0.5);
    const base = lin(hex).mul(float(0.82).add(weave.mul(0.06)).add(blot.mul(0.16)));
    m.colorNode = mix(base, lin(0x4a3a28), blot.mul(dirt).mul(0.5));
    m.roughnessNode = float(0.95);
    // soft creases: stretched noise reads as fabric folds on sleeves, legs and the tunic
    const folds = mx_fractal_noise_float(p.mul(vec3(14, 34, 14)), 3, 2, 0.5);
    m.normalNode = bumpMap(weave.mul(0.0012).add(mx_noise_float(p.mul(40)).mul(0.0008)).add(folds.mul(0.0035)));
    return m;
  });
}
function puttee(hex) {
  return once(`puttee-${hex}`, () => {
    const m = new THREE.MeshStandardNodeMaterial();
    const wrap = abs(sin(positionLocal.y.mul(95).add(positionLocal.x.mul(30)))).pow(0.4); // the spiral wrap
    const blot = mx_fractal_noise_float(positionWorld.mul(4), 3, 2, 0.5).mul(0.5).add(0.5);
    m.colorNode = mix(lin(hex).mul(float(0.7).add(wrap.mul(0.3))), lin(0x3e2f20), blot.mul(0.35));
    m.roughnessNode = float(0.95);
    m.normalNode = bumpMap(wrap.mul(0.003));
    return m;
  });
}
function leather(hex) {
  return once(`leather-${hex}`, () => {
    const m = new THREE.MeshStandardNodeMaterial();
    const n = mx_fractal_noise_float(positionWorld.mul(9), 3, 2, 0.5).mul(0.5).add(0.5);
    m.colorNode = lin(hex).mul(float(0.8).add(n.mul(0.25)));
    m.roughnessNode = float(0.6).add(n.mul(0.2));
    m.normalNode = bumpMap(n.mul(0.002));
    return m;
  });
}
function skin(hex, vc = false) {
  return once(`skin-${hex}-${vc}`, () => {
    const m = new THREE.MeshPhysicalNodeMaterial();
    const n = mx_fractal_noise_float(positionWorld.mul(30), 2, 2, 0.5).mul(0.5).add(0.5);
    const grime = mx_fractal_noise_float(positionWorld.mul(6), 2, 2, 0.5).mul(0.5).add(0.5);
    const base = mix(lin(hex).mul(float(0.92).add(n.mul(0.1))), lin(0x5a4636), grime.mul(0.18));
    m.colorNode = vc ? base.mul(attribute("color").rgb) : base;
    m.roughnessNode = float(0.5).add(n.mul(0.15));
    m.sheen = 0.25;
    m.sheenColor = new THREE.Color(0xff9a7a);
    m.normalNode = bumpMap(n.mul(0.0006));
    return m;
  });
}
function paintedSteel(hex) {
  return once(`steel-${hex}`, () => {
    const m = new THREE.MeshStandardNodeMaterial();
    const n = mx_fractal_noise_float(positionWorld.mul(14), 3, 2, 0.5).mul(0.5).add(0.5);
    const chip = smoothstep(0.78, 0.84, mx_noise_float(positionWorld.mul(40)).mul(0.5).add(0.5));
    m.colorNode = mix(lin(hex).mul(float(0.85).add(n.mul(0.2))), vec3(0.35, 0.33, 0.3), chip.mul(0.6));
    m.roughnessNode = mix(float(0.75), float(0.4), chip);
    m.metalnessNode = chip.mul(0.6);
    m.normalNode = bumpMap(n.mul(0.003));
    return m;
  });
}
const plain = (hex, rough = 0.8, metal = 0) => once(`plain-${hex}-${rough}-${metal}`, () => new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal }));

// --- geometry helpers -----------------------------------------------------------------------------
const geo = (key, make) => once(`g-${key}`, make);
/** A limb segment hanging down from its joint: tapered, rounded at both ends. */
function limb(r0, r1, len, seg = 28) {
  return geo(`limb-${r0}-${r1}-${len}`, () => {
    // a tapered tube with a slight muscle bulge two-fifths of the way down, closed at both ends
    const pts = [new THREE.Vector2(0, 0.0)];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const r = r0 + (r1 - r0) * t + Math.sin(Math.PI * Math.min(1, t * 1.25)) * r0 * 0.08;
      pts.push(new THREE.Vector2(r, -t * len));
    }
    pts.push(new THREE.Vector2(0, -len));
    pts.reverse();
    const g = new THREE.LatheGeometry(pts, seg);
    g.computeVertexNormals();
    return g;
  });
}
const sphere = (r, w = 16, h = 12) => geo(`s-${r}-${w}-${h}`, () => new THREE.SphereGeometry(r, w, h));
const box = (x, y, z) => geo(`b-${x}-${y}-${z}`, () => roundBox(x, y, z));
function roundBox(x, y, z) {
  const g = new THREE.BoxGeometry(x, y, z, 3, 3, 3);
  const p = g.attributes.position, v = new THREE.Vector3();
  const r = Math.min(x, y, z) * 0.35;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = new THREE.Vector3(Math.sign(v.x) * Math.max(0, Math.abs(v.x) - r), Math.sign(v.y) * Math.max(0, Math.abs(v.y) - r), Math.sign(v.z) * Math.max(0, Math.abs(v.z) - r));
    const d = v.clone().sub(c);
    if (d.length() > 0) v.copy(c.add(d.normalize().multiplyScalar(r)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const lathe = (key, prof, seg = 44) => geo(`l-${key}`, () => { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.computeVertexNormals(); return g; });

// One sculpted head: an ellipsoid pushed in and out by soft gaussian features (brow, sockets, nose,
// cheekbones, lips, chin, a narrower jaw), so the face reads as one smooth surface instead of
// stacked balls. Vertex colours carry the lips, a cheek flush, darker sockets and jaw stubble.
const HEAD_R = [0.078, 0.112, 0.098];
const FEAT = [
  // [cx, cy, cz, sx, sy, sz, amount]   (metres, head-local, face toward +z)
  [0, -0.1, 0.07, 0.026, 0.02, 0.03, 0.012],          // chin
  [-0.032, 0.012, 0.09, 0.019, 0.013, 0.02, -0.013], [0.032, 0.012, 0.09, 0.019, 0.013, 0.02, -0.013], // sockets
  [-0.03, 0.034, 0.09, 0.028, 0.009, 0.02, 0.007], [0.03, 0.034, 0.09, 0.028, 0.009, 0.02, 0.007],     // brow
  [0, 0.004, 0.098, 0.009, 0.024, 0.02, 0.011],       // nose bridge
  [0, -0.028, 0.1, 0.012, 0.012, 0.02, 0.025],        // nose tip
  [-0.014, -0.034, 0.09, 0.008, 0.008, 0.02, 0.009], [0.014, -0.034, 0.09, 0.008, 0.008, 0.02, 0.009], // nostril wings
  [-0.05, -0.006, 0.068, 0.02, 0.016, 0.02, 0.006], [0.05, -0.006, 0.068, 0.02, 0.016, 0.02, 0.006],   // cheekbones
  [-0.046, -0.046, 0.068, 0.016, 0.016, 0.02, -0.004], [0.046, -0.046, 0.068, 0.016, 0.016, 0.02, -0.004], // cheek hollows
  [0, -0.052, 0.094, 0.021, 0.007, 0.02, 0.006],      // upper lip
  [0, -0.067, 0.092, 0.017, 0.006, 0.02, 0.005],      // lower lip
  [0, -0.0595, 0.097, 0.019, 0.0022, 0.02, -0.004],   // mouth line
  [-0.072, 0.04, 0.035, 0.02, 0.025, 0.025, -0.004], [0.072, 0.04, 0.035, 0.02, 0.025, 0.025, -0.004], // temples
  [0, 0.03, -0.09, 0.045, 0.04, 0.03, 0.008],         // back of the skull
];
const TINTS = [
  // [cx, cy, cz, sigma, r, g, b]  multiplied in
  [0, -0.06, 0.095, 0.012, 0.86, 0.66, 0.62],                                         // lips
  [-0.045, -0.025, 0.07, 0.02, 1.0, 0.86, 0.82], [0.045, -0.025, 0.07, 0.02, 1.0, 0.86, 0.82], // cheek flush
  [-0.032, 0.012, 0.085, 0.014, 0.72, 0.62, 0.6], [0.032, 0.012, 0.085, 0.014, 0.72, 0.62, 0.6], // socket shade
  [0, -0.03, 0.1, 0.012, 1.0, 0.9, 0.86],                                             // nose tip
];
const gauss = (dx, dy, dz, sx, sy, sz) => Math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2 + (dz / sz) ** 2));
function headGeometry(stubble) {
  return geo(`head-${stubble}`, () => {
    const g = new THREE.SphereGeometry(1, 72, 54);
    const p = g.attributes.position, v = new THREE.Vector3(), cols = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      let x = v.x * HEAD_R[0], y = v.y * HEAD_R[1], z = v.z * HEAD_R[2];
      // jaw narrows toward the chin; the lower back tucks in to the neck; the face flattens a little
      const jaw = THREE.MathUtils.smoothstep(-y, 0.02, 0.11);
      x *= 1 - 0.3 * jaw;
      if (z < 0) z *= 1 - 0.3 * jaw;
      if (z > 0) x *= 1 + 0.06 * THREE.MathUtils.smoothstep(z, 0.03, 0.08) * (1 - jaw);
      const n = new THREE.Vector3(x, y, z).normalize();
      let d = 0;
      for (const [cx, cy, cz, sx, sy, sz, a] of FEAT) d += a * gauss(x - cx, y - cy, z - cz, sx, sy, sz);
      x += n.x * d; y += n.y * d; z += n.z * d;
      p.setXYZ(i, x, y, z);
      const c = [1, 1, 1];
      for (const [cx, cy, cz, sg, r, gg, b] of TINTS) {
        const w = gauss(x - cx, y - cy, z - cz, sg, sg, sg * 1.5);
        c[0] *= 1 + (r - 1) * w; c[1] *= 1 + (gg - 1) * w; c[2] *= 1 + (b - 1) * w;
      }
      const st = stubble * THREE.MathUtils.smoothstep(-y, 0.035, 0.07) * THREE.MathUtils.smoothstep(z, -0.02, 0.04) * (1 - gauss(x, y + 0.06, z - 0.095, 0.02, 0.012, 0.02));
      cols.push(c[0] * (1 - 0.28 * st), c[1] * (1 - 0.3 * st), c[2] * (1 - 0.3 * st));
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  });
}

// tunic: waist, chest, shoulders; the skirt below the belt flares a little over the hips
const TUNIC = [[0.0, 0.76], [0.19, 0.76], [0.2, 0.84], [0.175, 0.95], [0.165, 1.04], [0.185, 1.18], [0.2, 1.3], [0.19, 1.4], [0.15, 1.46], [0.08, 1.5], [0.0, 1.51]];

// --- the figure -------------------------------------------------------------------------------
export const LOOKS = {
  tommy: { skin: 0xc99474, tunic: 0x7d6e4a, trousers: 0x75664a, puttees: 0x6a5c40, boots: 0x3b291c, hair: 0x4a3222, helmet: 0x5f6446 },
  tommyB: { rifle: true, skin: 0xb07c5c, tunic: 0x786a48, trousers: 0x6e6043, puttees: 0x625538, boots: 0x35251a, hair: 0x1e1612, helmet: 0x5b6043, moustache: 0x2a1d14 },
  tommyC: { rifle: true, skin: 0xd8a888, tunic: 0x837350, trousers: 0x786a4a, puttees: 0x6c5e40, boots: 0x3b291c, hair: 0x9a5a2c, helmet: 0x62674a },
  artist: { skin: 0xcf9f80, tunic: 0x7d6e4a, trousers: 0x75664a, puttees: 0x6a5c40, boots: 0x3b291c, hair: 0x3a2516, cap: { crown: 0x6e6145, band: 0x5d5238 } },
  enemyOfficer: { skin: 0xd8ad8e, tunic: 0x5f6556, trousers: 0x555a4c, puttees: 0x3b3a33, boots: 0x1d1814, hair: 0xb8955e, cap: { crown: 0x5f6556, band: 0x8e2a22 }, moustache: 0x6a4e30, boots_tall: true },
};

// The chibi rig's arm angles assume short toy arms; on real proportions a few poses need their
// arms re-aimed (the legs, lean and bob stay as solved). `actor.hands` asks for a specific grip.
function fixRig(rig0, actor) {
  const r = { ...rig0, armL: [...rig0.armL], armR: [...rig0.armR] };
  const set = (aL, aR, eL, eR) => { r.armL = aL; r.armR = aR; r.elbowL = eL; r.elbowR = eR; };
  if (actor.hands === "binoculars") set([-1.45, 0, 0.42], [-1.45, 0, -0.42], -2.35, -2.35);
  else if (actor.hands === "nose") { r.armR = [-1.25, 0, -0.35]; r.elbowR = -2.45; r.armL = [-0.6, 0, 0.25]; r.elbowL = -0.8; }
  else if (actor.pose === "carry") set([-0.95, 0, 0.12], [-0.95, 0, -0.12], -0.35, -0.35);
  else if (actor.pose === "cower") set([-2.5, 0, 0.55], [-2.5, 0, -0.55], -1.9, -1.9);
  else if (actor.pose === "cast") set([-1.1, 0, 0.3], [-1.3, 0, -0.2], -0.9, -0.6);
  if (actor.pose === "prone" || actor.pose === "crawl") r.head = [rig0.head[0] * 1.2, rig0.head[1]];
  return r;
}

export function buildSoldier(look) {
  const L = look;
  const root = new THREE.Group();     // world placement (x, 0, z) + scale
  const tiltG = new THREE.Group();    // tilt about the pivot
  const pivotG = new THREE.Group();
  const body = new THREE.Group();     // yaw
  const bob = new THREE.Group();
  root.add(tiltG); tiltG.add(pivotG); pivotG.add(body); body.add(bob);
  const add = (parent, g, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => {
    const m = new THREE.Mesh(g, mat);
    m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const tunic = wool(L.tunic), trousers = wool(L.trousers, 0.5), skinM = skin(L.skin), boot = leather(L.boots);
  const strap = leather(0x6b5236), brass = plain(0xb08a3c, 0.35, 0.8);

  // legs
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * BODY.hipX, BODY.hipY, 0);
    bob.add(hip);
    add(hip, sphere(0.088), trousers, [0, 0, 0]);
    add(hip, limb(0.088, 0.066, BODY.thigh), trousers, [0, 0, 0]);
    const knee = new THREE.Group();
    knee.position.y = -BODY.thigh;
    hip.add(knee);
    add(knee, sphere(0.064), trousers, [0, 0, 0.005]);
    add(knee, limb(0.062, 0.05, 0.2), trousers, [0, 0.02, 0]); // trouser below the knee
    add(knee, limb(0.058, 0.048, BODY.shin - 0.06), L.boots_tall ? boot : puttee(L.puttees), [0, -0.14, 0]);
    const ankle = new THREE.Group();
    ankle.position.y = -BODY.shin;
    knee.add(ankle);
    add(ankle, box(0.1, 0.1, 0.27), boot, [0, -0.02, 0.05]);
    add(ankle, box(0.105, 0.025, 0.28), plain(0x1a1410, 0.9), [0, -0.065, 0.05]); // sole
    return { hip, knee };
  });

  // upper body (leans about the hips)
  const upper = new THREE.Group();
  upper.position.y = BODY.hipY;
  bob.add(upper);
  const U = new THREE.Group();
  U.position.y = -BODY.hipY;
  upper.add(U);
  add(U, lathe("tunic", TUNIC), tunic, [0, 0, 0], [0, 0, 0], [1, 1, 0.66]);
  add(U, sphere(0.15), trousers, [0, BODY.hipY - 0.02, -0.01], [0, 0, 0], [1.1, 0.62, 0.7]); // seat
  // belt, buckle, ammo pouches, cross strap, haversack
  add(U, geo("belt", () => new THREE.CylinderGeometry(0.185, 0.185, 0.05, 24)), strap, [0, 0.93, 0], [0, 0, 0], [1.02, 1, 0.7]);
  add(U, box(0.06, 0.045, 0.02), brass, [0, 0.93, 0.13]);
  for (const s of [-1, 1]) add(U, box(0.1, 0.085, 0.05), strap, [s * 0.1, 0.92, 0.115], [0, s * 0.45, 0]);
  add(U, box(0.035, 0.62, 0.012), strap, [0.0, 1.2, 0.118], [-0.12, 0, 0.62]);
  add(U, box(0.035, 0.62, 0.012), strap, [0.0, 1.2, -0.118], [0.12, 0, -0.62]);
  add(U, box(0.24, 0.2, 0.08), wool(0x8a7a56, 0.5), [0.02, 1.06, -0.15], [0.08, 0, 0]); // haversack
  // skirt pockets, the felt-covered water bottle on the right hip, the entrenching tool behind
  for (const s of [-1, 1]) add(U, box(0.1, 0.1, 0.022), tunic, [s * 0.1, 0.83, 0.122], [0.05, s * 0.4, 0]);
  add(U, sphere(0.06, 14, 10), wool(0x6a5d42, 0.3), [0.18, 0.84, 0.02], [0, 0, 0], [0.55, 1.15, 0.95]);
  add(U, box(0.04, 0.06, 0.035), strap, [0.18, 0.93, 0.02]);
  add(U, box(0.16, 0.2, 0.04), leather(0x5d4a33), [-0.05, 0.82, -0.13], [0.1, 0, 0.1]);
  add(U, geo("helve", () => new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6)), leather(0x6a4a2e), [-0.08, 0.98, -0.14], [0.1, 0, 0.1]);
  if (L.rifle) { // a Lee-Enfield slung across the back, muzzle up over the right shoulder
    const r = new THREE.Group();
    r.position.set(0.02, 1.12, -0.17);
    r.rotation.set(0, 0, -0.42);
    U.add(r);
    add(r, box(0.045, 0.62, 0.035), leather(0x5a3a22), [0, -0.12, 0]);
    add(r, box(0.06, 0.2, 0.04), leather(0x5a3a22), [0, -0.5, 0]);
    add(r, geo("barrel", () => new THREE.CylinderGeometry(0.009, 0.009, 0.3, 6)), plain(0x252322, 0.45, 0.7), [0, 0.32, 0.006]);
    add(r, box(0.012, 0.9, 0.006), leather(0x7a5a36), [0.03, -0.05, 0.03]);
  }
  // breast pockets, buttons, collar
  for (const s of [-1, 1]) {
    add(U, box(0.085, 0.085, 0.02), tunic, [s * 0.075, 1.27, 0.117], [-0.15, s * 0.35, 0]);
    add(U, sphere(0.008, 8, 6), brass, [s * 0.075, 1.305, 0.13]);
  }
  for (let k = 0; k < 4; k++) add(U, sphere(0.009, 8, 6), brass, [0, 1.02 + k * 0.1, 0.122 - (k === 0 ? 0.004 : 0)]);
  add(U, geo("collar", () => new THREE.CylinderGeometry(0.066, 0.078, 0.06, 28, 1, true)), tunic, [0, 1.515, 0.004], [0.12, 0, 0], [1.05, 1, 0.95]);
  // shoulder straps (epaulettes)
  for (const s of [-1, 1]) add(U, box(0.05, 0.015, 0.11), tunic, [s * 0.15, 1.455, 0], [0, 0, -s * 0.35]);

  // arms
  const arms = [-1, 1].map((side) => {
    const sh = new THREE.Group();
    sh.position.set(side * BODY.shoulderX, BODY.shoulderY, 0);
    U.add(sh);
    add(sh, sphere(0.068, 20, 14), tunic, [-side * 0.012, 0.005, 0], [0, 0, 0], [1.1, 1.0, 1.0]);
    add(sh, limb(0.065, 0.052, BODY.upperArm + 0.03), tunic, [0, 0.01, 0]);
    const el = new THREE.Group();
    el.position.y = -BODY.upperArm;
    sh.add(el);
    add(el, sphere(0.053), tunic, [0, 0, 0]);
    add(el, limb(0.052, 0.042, BODY.forearm), tunic, [0, 0.01, 0]);
    add(el, geo("cuff", () => new THREE.CylinderGeometry(0.046, 0.046, 0.04, 12)), tunic, [0, -BODY.forearm + 0.04, 0]);
    const wr = new THREE.Group();
    wr.position.y = -BODY.forearm;
    el.add(wr);
    // hand: palm, four fingers curled a little, thumb
    add(wr, box(0.07, 0.075, 0.03), skinM, [0, -0.035, 0.004]);
    for (let k = 0; k < 4; k++) add(wr, geo("finger", () => new THREE.CapsuleGeometry(0.0085, 0.045, 3, 6)), skinM, [(k - 1.5) * 0.017, -0.095, 0.012], [0.45, 0, 0]);
    add(wr, geo("thumb", () => new THREE.CapsuleGeometry(0.01, 0.04, 3, 6)), skinM, [-side * 0.038, -0.045, 0.02], [0.4, 0, -side * 0.6]);
    return { sh, el };
  });

  // head and neck (pitch/roll about the neck)
  const neck = new THREE.Group();
  neck.position.y = BODY.neckY;
  U.add(neck);
  add(neck, geo("neck", () => new THREE.CylinderGeometry(0.05, 0.058, 0.13, 24)), skinM, [0, 0.035, -0.006], [0, 0, 0], [1.05, 1, 1]);
  const head = new THREE.Group();
  head.position.y = BODY.headY - BODY.neckY;
  neck.add(head);
  add(head, headGeometry(L.stubble ?? 0.6), skin(L.skin, true), [0, 0.005, 0]);
  for (const sd of [-1, 1]) { // ears: flattened shells angled back
    add(head, sphere(0.022, 12, 10), skinM, [sd * 0.074, -0.004, -0.004], [0, sd * 0.35, 0], [0.38, 1.05, 0.75]);
  }
  // eyes sit in the sockets: white, iris, pupil, and a skin lid that closes over them
  const eyes = [-1, 1].map((sd) => {
    const g = new THREE.Group();
    g.position.set(sd * 0.031, 0.016, 0.072);
    head.add(g);
    add(g, sphere(0.0125, 14, 10), plain(0xe6ded2, 0.25), [0, 0, 0]);
    add(g, sphere(0.0062, 12, 8), plain(L.eye ?? 0x4a3420, 0.25), [0, 0, 0.0085], [0, 0, 0], [1, 1, 0.5]);
    add(g, sphere(0.003, 8, 6), plain(0x080605, 0.2), [0, 0, 0.0115], [0, 0, 0], [1, 1, 0.4]);
    const lid = add(g, sphere(0.0136, 14, 10), skinM, [0, 0.003, 0.0005], [0, 0, 0], [1.08, 0.55, 1.05]);
    return { g, lid };
  });
  const mouth = add(head, box(0.03, 0.008, 0.008), plain(0x3a1a16, 0.6), [0, -0.06, 0.088]);
  if (L.moustache) for (const sd of [-1, 1]) add(head, geo("stache", () => new THREE.CapsuleGeometry(0.008, 0.024, 4, 8)), plain(L.moustache, 0.9), [sd * 0.013, -0.047, 0.098], [0.25, -sd * 0.2, Math.PI / 2 + sd * 0.12], [0.55, 0.85, 0.32]);
  add(head, sphere(0.1, 24, 16), wool(L.hair, 0), [0, 0.03, -0.018], [-0.4, 0, 0], [0.84, 1.08, 1.04]); // hair (mostly under the hat)
  if (L.helmet) {
    const st = paintedSteel(L.helmet);
    const h = new THREE.Group();
    h.position.set(0, 0.075, -0.005);
    h.rotation.x = 0.12;
    head.add(h);
    add(h, geo("dome", () => new THREE.SphereGeometry(0.125, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45)), st, [0, 0, 0], [0, 0, 0], [1, 0.72, 1.1]);
    add(h, lathe("brim", [[0.0, 0.0], [0.125, 0.008], [0.19, -0.01], [0.195, -0.018], [0.19, -0.016], [0.122, 0.0], [0.0, -0.004]], 28), st, [0, 0.008, 0], [0, 0, 0], [1, 1, 1.12]);
    add(h, geo("strap", () => new THREE.TorusGeometry(0.105, 0.006, 6, 24, Math.PI)), strap, [0, -0.02, 0.01], [0, Math.PI / 2, Math.PI], [1, 1.2, 1]);
  }
  if (L.cap) {
    const c = new THREE.Group();
    c.position.set(0, 0.07, -0.005);
    head.add(c);
    add(c, geo("crown", () => new THREE.CylinderGeometry(0.125, 0.102, 0.065, 24)), wool(L.cap.crown, 0.2), [0, 0.04, -0.005], [0, 0, 0], [1, 1, 1.08]);
    add(c, geo("band", () => new THREE.CylinderGeometry(0.104, 0.104, 0.03, 24)), wool(L.cap.band, 0.1), [0, 0.0, -0.003], [0, 0, 0], [1, 1, 1.06]);
    add(c, geo("visor", () => new THREE.CylinderGeometry(0.075, 0.075, 0.008, 18, 1, false, -Math.PI / 2, Math.PI)), plain(0x15110e, 0.35), [0, -0.01, 0.075], [0.25, Math.PI / 2, 0], [1, 1, 0.75]);
  }

  // binoculars (shown while an actor holds them up)
  const bino = new THREE.Group();
  bino.position.set(0, 0.0, 0.14);
  head.add(bino);
  for (const s of [-1, 1]) {
    add(bino, geo("bino", () => new THREE.CylinderGeometry(0.019, 0.024, 0.1, 18)), leather(0x2a211a), [s * 0.032, 0.01, 0.01], [Math.PI / 2, 0, 0]);
    add(bino, geo("binoRim", () => new THREE.CylinderGeometry(0.025, 0.025, 0.012, 18)), plain(0x3a3430, 0.35, 0.8), [s * 0.032, 0.01, 0.06], [Math.PI / 2, 0, 0]);
  }
  add(bino, box(0.03, 0.012, 0.03), brass, [0, 0.012, 0.01]);
  bino.visible = false;

  // per-frame pose
  const setFace = (expr) => {
    const wide = expr === "shock" || expr === "scared" || expr === "yell";
    const closed = expr === "dead" || expr === "pain";
    const sleepy = expr === "dazed" || expr === "smug";
    for (const e of eyes) e.lid.scale.y = closed ? 1.05 : sleepy ? 0.85 : wide ? 0.25 : 0.55;
    mouth.visible = wide || expr === "pain";
    mouth.scale.set(1, wide ? 2.6 : 1.6, 1);
  };
  return {
    root,
    set(actor, rig, yaw) {
      const [x, y, z] = actor.position;
      const pivot = actor.pivot ?? 0;
      root.position.set(x, 0, z);
      root.scale.setScalar(actor.scale ?? 1);
      tiltG.position.set(0, y + pivot, 0);
      tiltG.rotation.set(0, 0, actor.tilt ?? 0);
      pivotG.position.set(0, -pivot, 0);
      body.rotation.set(0, yaw, 0);
      bob.position.y = rig.bob * BODY.bobK;
      rig = fixRig(rig, actor);
      bino.visible = actor.hands === "binoculars";
      legs[0].hip.rotation.set(...rig.legL); legs[1].hip.rotation.set(...rig.legR);
      legs[0].knee.rotation.set(rig.kneeL, 0, 0); legs[1].knee.rotation.set(rig.kneeR, 0, 0);
      upper.rotation.set(rig.lean, 0, 0);
      U.scale.set(rig.breathe, 1, rig.breathe);
      arms[0].sh.rotation.set(...rig.armL); arms[1].sh.rotation.set(...rig.armR);
      arms[0].el.rotation.set(rig.elbowL, 0, 0); arms[1].el.rotation.set(rig.elbowR, 0, 0);
      neck.rotation.set(rig.head[0] * 0.6, 0, rig.head[1]);
      head.rotation.set(rig.head[0] * 0.4, 0, 0);
      setFace(actor.expression ?? "neutral");
    },
  };
}
