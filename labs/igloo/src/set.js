// The snowfield set. World axes: x right, y up, z towards the camera's side. The igloo sits at the
// origin; its door and entrance tunnel face +x. Interior shots cut the world at z = 0 (main.js
// ClippingGroup): everything in front goes, the terrain's section is capped by a flat wall (`cap`),
// and the cut blocks show their packed-snow cross-section (materials.js cuttable).
import * as THREE from "three/webgpu";
import { snowMaterial, blockMaterial, cuttable, matte } from "./materials.js";

// --- igloo geometry --------------------------------------------------------------------------
export const R0 = 2.0;   // block centreline radius at the base
export const H = 2.35;   // block centreline height at the apex
export const BLOCK = { w: 0.66, h: 0.42, t: 0.28 };
export const DOOR = { phi: 0, half: 0.34, top: 1.05 }; // floor-level doorway on +x (radians half-width, height)
export const TUNNEL = { x0: R0 - 0.25, x1: R0 + 2.9, half: 0.48, depth: 0.78 };
export const PLATFORM = { x0: -R0 + 0.1, x1: -0.25, top: 0.55 };

// quarter-ellipse profile of the dome: r(a) = R0 cos a, y(a) = H sin a, tabulated by arc length
const PROFILE = (() => {
  const n = 400, out = [{ s: 0, a: 0 }];
  let s = 0, pr = R0, py = 0;
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2), r = R0 * Math.cos(a), y = H * Math.sin(a);
    s += Math.hypot(r - pr, y - py);
    out.push({ s, a });
    pr = r; py = y;
  }
  return out;
})();
export const ARC = PROFILE[PROFILE.length - 1].s;
const alphaAt = (s) => {
  if (s <= 0) return 0;
  if (s >= ARC) return Math.PI / 2;
  let lo = 0, hi = PROFILE.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PROFILE[m].s < s) lo = m; else hi = m; }
  const k = (s - PROFILE[lo].s) / (PROFILE[hi].s - PROFILE[lo].s);
  return PROFILE[lo].a + k * (PROFILE[hi].a - PROFILE[lo].a);
};

// A block's frame on the dome at azimuth phi and arc length s: x along the ring, y up the dome,
// z out of it. phi = 0 is +x, increasing through -z (the back of the dome).
function blockFrame(phi, s, { lean = null, r = null, y = null } = {}) {
  const a = lean ?? alphaAt(s);
  const rr = r ?? R0 * Math.cos(a), yy = y ?? H * Math.sin(a);
  const c = Math.cos(phi), sn = Math.sin(phi);
  const ur = -R0 * Math.sin(a), uy = H * Math.cos(a), ul = Math.hypot(ur, uy);
  const tx = new THREE.Vector3(-sn, 0, -c);
  const up = new THREE.Vector3((ur / ul) * c, uy / ul, -(ur / ul) * sn);
  const out = new THREE.Vector3().crossVectors(tx, up);
  const m = new THREE.Matrix4().makeBasis(tx, up, out);
  m.setPosition(rr * c, yy, -rr * sn);
  return m;
}

// L3: one rising spiral, every block leaning on the one before, then the key block on top.
export const SPIRAL = (() => {
  const out = [];
  let phi = 0.05;
  for (let i = 0; i < 400; i++) {
    const s = -0.05 + (phi / (Math.PI * 2)) * BLOCK.h * 1.02;
    const a = alphaAt(s), r = R0 * Math.cos(a);
    if (r < 0.42) break;
    const w = Math.min(BLOCK.w, r * 0.9);
    out.push({ i, phi, s, w, m: blockFrame(phi, s) });
    phi += (w + 0.025) / r;
  }
  return out;
})();
export const KEY = (() => {
  // lies flat over the last hole: the block's thickness (local z) points up
  const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, H - 0.04, 0);
  return { m, w: 0.92, t: 0.3 };
})();

// L2: flat rings stacked like bricks: four straight courses, then two that try to lean in
export const RINGS = (() => {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const lean = k < 4 ? 0 : (k - 3) * 0.32;
    const r = k < 4 ? R0 : R0 - (k - 3) * 0.42;
    const y = 0.21 + BLOCK.h * Math.min(k, 3) + (k < 4 ? 0 : (k - 3) * BLOCK.h * 0.9);
    const n = Math.floor((Math.PI * 2 * r) / (BLOCK.w + 0.03));
    for (let j = 0; j < n; j++) {
      const phi = ((j + (k % 2) * 0.5) / n) * Math.PI * 2;
      out.push({ k, j, phi, m: blockFrame(phi, 0, { lean, r, y }) });
    }
  }
  return out;
})();

// is a spiral block part of the doorway (cut out once the door exists)?
export const inDoor = (b) => {
  let d = Math.abs(((b.phi - DOOR.phi + Math.PI) % (Math.PI * 2)) - Math.PI);
  d = Math.min(d, Math.abs(b.phi - Math.PI * 2 - DOOR.phi));
  const y = new THREE.Vector3().setFromMatrixPosition(b.m).y;
  return d < DOOR.half + 0.12 && y < DOOR.top;
};

// --- terrain ---------------------------------------------------------------------------------
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

// height of the snow surface; dig = 0..1 the entrance trench
export function heightAt(x, z, dig = 0) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.35 + 40, z * 0.35 + 40, 3) - 0.5) * 0.06; // gentle near the igloo
  h += smooth(6, 28, r) * (fbm(x * 0.05, z * 0.05, 4) - 0.35) * 2.4; // drifts
  h += smooth(45, 140, -z) * (fbm(x * 0.012 + 3, z * 0.012, 4) * 34 - 6); // far ridges behind
  h += smooth(60, 160, Math.abs(x)) * fbm(x * 0.02, z * 0.02, 3) * 14;
  if (dig > 0) {
    const inX = smooth(TUNNEL.x0 - 0.05, TUNNEL.x0 + 0.15, x) * (1 - smooth(TUNNEL.x1 - 0.1, TUNNEL.x1 + 0.1, x));
    const inZ = 1 - smooth(TUNNEL.half - 0.08, TUNNEL.half + 0.04, Math.abs(z));
    // the far end ramps up to the surface so you can walk down into it
    const ramp = 1 - smooth(TUNNEL.x1 - 0.9, TUNNEL.x1, x);
    h -= TUNNEL.depth * dig * inX * inZ * ramp;
  }
  return h;
}

// a grid dense near the igloo (about 3 cm cells), coarse at the horizon
const warp = (u) => Math.sign(u) * (0.03 * Math.abs(u) + 0.97 * Math.pow(Math.abs(u), 5)) * 220;

export function buildTerrain() {
  const N = 520;
  const g = new THREE.PlaneGeometry(1, 1, N, N);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const base = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = warp(pos.getX(i) * 2), z = warp(pos.getZ(i) * 2);
    base[i * 2] = x; base[i * 2 + 1] = z;
  }
  const mesh = new THREE.Mesh(g, snowMaterial());
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  let lastDig = -1;
  const set = (dig) => {
    if (dig === lastDig) return;
    lastDig = dig;
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

// The section face of the snow under the cut (z = 0): a wall from deep down up to the surface.
export function buildCap() {
  const N = 900, X = 60, DEEP = -7;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array((N + 1) * 2 * 3);
  const idx = [];
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = cuttable(snowMaterial(), { dense: 0.3 });
  m.side = THREE.BackSide; // only its "cut" face shows
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  let lastDig = -1;
  const set = (dig, z = -0.004) => {
    if (dig === lastDig) return;
    lastDig = dig;
    for (let i = 0; i <= N; i++) {
      const x = -X + (2 * X * i) / N;
      pos.set([x, DEEP, z, x, heightAt(x, 0, dig) - 0.004, z], i * 6);
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  };
  set(0);
  return { mesh, set };
}

// --- blocks ----------------------------------------------------------------------------------
function roundedBlock(w, h, t, bevel = 0.035) {
  const shape = new THREE.Shape();
  const x = w / 2 - bevel, y = h / 2 - bevel;
  shape.moveTo(-x, -h / 2);
  shape.lineTo(x, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -y);
  shape.lineTo(w / 2, y); shape.quadraticCurveTo(w / 2, h / 2, x, h / 2);
  shape.lineTo(-x, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, y);
  shape.lineTo(-w / 2, -y); shape.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 2, curveSegments: 3 });
  g.translate(0, 0, -(t - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

// An instanced set of blocks; update(list of {matrix, scale?}) per frame.
export function blockSet(max, w = BLOCK.w, h = BLOCK.h, t = BLOCK.t) {
  const mesh = new THREE.InstancedMesh(roundedBlock(w, h, t), cuttable(blockMaterial(), { dense: 0.5 }), max);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.count = 0;
  return {
    mesh,
    update(items) {
      let n = 0;
      for (const it of items) { if (n >= max) break; mesh.setMatrixAt(n++, it); }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
  };
}

// --- the snow cave (L1): a heap of powder hollowed out; `sag` 0..1 drops the roof in -----------
export function caveGeometry(heap, sag, hollow) {
  const pts = [];
  const top = 1.75 * heap, rad = 2.3;
  const inner = 1.25 * hollow, innerTop = (1.3 - sag * 1.2) * hollow;
  const n = 24;
  for (let i = 0; i <= n; i++) { // outer surface, base to top
    const a = (i / n) * (Math.PI / 2);
    const dip = sag * 0.9 * Math.exp(-Math.pow(Math.cos(a) * 1.8, 2));
    pts.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * rad * (0.85 + 0.15 * heap)), Math.max(0.02, Math.sin(a) * top - dip)));
  }
  if (hollow > 0.01) {
    for (let i = n; i >= 0; i--) { // the hollow, top back down to the floor
      const a = (i / n) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * inner), Math.max(0.0, Math.sin(a) * innerTop)));
    }
  }
  pts.push(new THREE.Vector2(0.001, 0));
  const g = new THREE.LatheGeometry(pts, 64);
  g.computeVertexNormals();
  return g;
}

// --- distant mountains: low ridges on the horizon (the terrain covers the near ones) -------------
export function buildRidges() {
  const group = new THREE.Group();
  const mat = snowMaterial({ ripple: 0, tint: 0xe9eef6 });
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI * 0.85 + (k / 8) * Math.PI * 0.7;
    const d = 230 + (k % 3) * 40;
    const g = new THREE.ConeGeometry(40 + (k % 4) * 18, 30 + ((k * 7) % 5) * 9, 7, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (h2(i, k) - 0.5) * 4);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.position.set(Math.cos(a) * d, 4, Math.sin(a) * d);
    m.rotation.y = k;
    group.add(m);
  }
  return group;
}

// --- props -----------------------------------------------------------------------------------
export function buildProps() {
  const group = new THREE.Group();
  // sleeping platform: a snow bench along the back that rises out of the floor (L4c)
  const plat = new THREE.Mesh(
    new THREE.CylinderGeometry(R0 - 0.2, R0 - 0.2, 1, 48, 1, false, Math.PI / 2 + 0.25, Math.PI - 0.5),
    cuttable(blockMaterial(), { dense: 0.5 }),
  );
  plat.castShadow = plat.receiveShadow = true;
  group.add(plat);
  // the oil lamp (qulliq): a half-moon soapstone dish, a line of small flames
  const lamp = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.09, 24, 1, false, 0, Math.PI), matte(0x9a9184, 0.55));
  dish.rotation.y = Math.PI / 2;
  lamp.add(dish);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.23, 24, 0, Math.PI), matte(0x5a3f18, 0.1));
  oil.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  oil.position.y = 0.046;
  lamp.add(oil);
  group.add(lamp);
  // campfire (L5a): a ring of stones, a teepee of logs leaning in, a bed of glowing embers
  const fire = new THREE.Group();
  const stoneGeo = new THREE.IcosahedronGeometry(0.075, 1);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, stone = new THREE.Mesh(stoneGeo, matte([0x5d5a56, 0x6c6762, 0x4e4b48][i % 3], 0.85));
    stone.position.set(Math.cos(a) * 0.3, 0.035, Math.sin(a) * 0.3);
    stone.scale.set(1.1, 0.65, 0.9);
    stone.rotation.y = a * 2.3;
    fire.add(stone);
  }
  const logGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.42, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const log = new THREE.Mesh(logGeo, matte(i % 2 ? 0x5a3a22 : 0x4a2f1b, 0.9));
    log.position.set(Math.cos(a) * 0.13, 0.16, Math.sin(a) * 0.13);
    log.lookAt(0, 0.6, 0);
    log.rotateX(Math.PI / 2);
    fire.add(log);
  }
  const embers = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshStandardNodeMaterial({ color: 0x1a0c06, emissive: 0xff5212, emissiveIntensity: 2.2, roughness: 1 }));
  embers.rotation.x = -Math.PI / 2;
  embers.position.y = 0.02;
  fire.add(embers);
  group.add(fire);
  // caribou furs on the platform (L6b)
  const furs = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), matte([0x8a6a48, 0x6e5238, 0xa4825c][i], 1));
    f.scale.set(0.55, 0.06, 0.42);
    f.position.set(-0.6 - i * 0.45, 0, -0.5 - (i % 2) * 0.5);
    furs.add(f);
  }
  group.add(furs);
  // snow knife and shovel (L1/L2) are hand props on the actors' side; a shovel stuck in the snow
  const shovel = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), matte(0x6b4a2e, 0.7));
  shaft.position.y = 0.55;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.02), matte(0x9aa3ad, 0.35, 0.8));
  blade.position.y = 0.05;
  shovel.add(shaft, blade);
  group.add(shovel);
  for (const o of [lamp, fire, furs, shovel]) o.traverse((c) => { if (c.isMesh) c.castShadow = c.receiveShadow = true; });
  return { group, plat, lamp, fire, furs, shovel };
}
