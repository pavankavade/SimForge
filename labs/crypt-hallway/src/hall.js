// The crypt hall: an arcaded nave under a barrel vault, galleries over the aisles, and a light
// well in the vault. Hall runs along -Z; "s" is the distance down the hall (world z = -s).
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bakeUV, clean, box, extrudeSY, extrudeXY, rng } from "./geo.js";
import { buildMasonry } from "./masonry.js";
import { stoneMaterial, floorMaterial, columnMaterial, clothMaterial, ironMaterial, spikeMaterial, woodMaterial, flameMaterial, rubbleMaterial } from "./materials.js";

export const L = 36;            // hall length
export const BAY = 3;           // column spacing
export const WALL_X = 2.5;      // arcade wall centre line
export const WALL_T = 0.5;
export const AISLE_X = 4.75;    // aisle outer wall inner face
export const SPRING = 2.8;      // arch spring line (top of capitals)
export const ARCH_R = 1.2;
export const GALLERY_Y = 4.6;
export const WALL_TOP = 6.5;
export const VAULT_R = 2.75;
export const WELL = [16.5, 19.5]; // light well span (s)
export const WELL_HALF = 1.3;
export const WELL_TOP = 12.4;

// --- geometry helpers -------------------------------------------------------------------------

// Half-cylinder vault (inside faces) from s0 to s1, between angles a0..a1 measured from the
// left spring (0) over the crown (PI/2) to the right spring (PI). UV = (s, arc length).
function vault(s0, s1, a0 = 0, a1 = Math.PI, seg = 48) {
  const pos = [], uvs = [], idx = [];
  const n = Math.max(2, Math.round(seg * (a1 - a0) / Math.PI));
  const rings = Math.max(2, Math.round((s1 - s0) * 2));
  for (let j = 0; j <= rings; j++) {
    const s = s0 + (s1 - s0) * (j / rings);
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pos.push(-Math.cos(a) * VAULT_R, WALL_TOP + Math.sin(a) * VAULT_R, -s);
      uvs.push(s, a * VAULT_R);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < n; i++) {
    const A = j * (n + 1) + i, B = A + 1, C = A + n + 1, D = C + 1;
    idx.push(A, B, C, B, D, C);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // faces must point inward (towards the vault axis)
  const nn = g.attributes.normal, pp = g.attributes.position;
  const mid = Math.floor(nn.count / 2);
  if (nn.getX(mid) * -pp.getX(mid) + nn.getY(mid) * (WALL_TOP - pp.getY(mid)) < 0) {
    const ia = g.index.array;
    for (let i = 0; i < ia.length; i += 3) { const t = ia[i + 1]; ia[i + 1] = ia[i + 2]; ia[i + 2] = t; }
    g.computeVertexNormals();
  }
  return g.toNonIndexed();
}

// Arcade wall: a run of round arches on piers with small gallery openings above each bay.
function arcadeShape() {
  const sh = new THREE.Shape();
  const pier = 0.3;
  sh.moveTo(0, WALL_TOP);
  sh.lineTo(0, 0);
  sh.lineTo(pier, 0);
  sh.lineTo(pier, SPRING);
  const bays = L / BAY;
  for (let k = 0; k < bays; k++) {
    const c = k * BAY + BAY / 2;
    sh.absarc(c, SPRING, ARCH_R, Math.PI, 0, true);
    if (k < bays - 1) sh.lineTo((k + 1) * BAY + pier, SPRING);
  }
  sh.lineTo(L - pier, 0);
  sh.lineTo(L, 0);
  sh.lineTo(L, WALL_TOP);
  sh.lineTo(0, WALL_TOP);
  for (let k = 0; k < bays; k++) {
    const c = k * BAY + BAY / 2;
    const hole = new THREE.Path();
    hole.moveTo(c - 0.6, 5.0);
    hole.lineTo(c + 0.6, 5.0);
    hole.lineTo(c + 0.6, 5.6);
    hole.absarc(c, 5.6, 0.6, 0, Math.PI, false);
    hole.lineTo(c - 0.6, 5.0);
    sh.holes.push(hole);
  }
  return sh;
}

// Far wall with an arched doorway into a back chamber.
function farWallShape() {
  const W = AISLE_X + 0.3, H = WALL_TOP + VAULT_R + 0.4;
  const sh = new THREE.Shape();
  sh.moveTo(-W, 0);
  sh.lineTo(-1.0, 0);
  sh.lineTo(-1.0, 2.2);
  sh.absarc(0, 2.2, 1.0, Math.PI, 0, true);
  sh.lineTo(1.0, 0);
  sh.lineTo(W, 0);
  sh.lineTo(W, H);
  sh.lineTo(-W, H);
  sh.lineTo(-W, 0);
  return sh;
}

// End wall of the light shaft: bottom edge follows the vault curve so nothing hangs into the nave.
function shaftEndShape(half) {
  const sh = new THREE.Shape();
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const x = -half + (2 * half * i) / N;
    const y = WALL_TOP + Math.sqrt(VAULT_R * VAULT_R - x * x) - 0.03;
    if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
  }
  sh.lineTo(half, WELL_TOP + 0.3);
  sh.lineTo(-half, WELL_TOP + 0.3);
  return sh;
}


// Turned column: plinth, torus base, tapered shaft with entasis, necking, flared capital.
function columnGeo() {
  const pts = [
    [0.001, 0.16], [0.3, 0.16], [0.31, 0.2], [0.29, 0.25], [0.255, 0.27], [0.25, 0.31], [0.235, 0.33],
  ];
  const shaftTop = 2.48;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = 0.225 - 0.03 * t + 0.012 * Math.sin(Math.PI * t);
    pts.push([r, 0.33 + (shaftTop - 0.33) * t]);
  }
  pts.push([0.215, shaftTop + 0.02], [0.225, shaftTop + 0.05], [0.2, shaftTop + 0.07], [0.205, 2.56],
    [0.26, 2.62], [0.3, 2.65], [0.001, 2.65]);
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const gg = g.toNonIndexed();
  const p = gg.attributes.position;
  const uvs = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uvs[i * 2] = Math.atan2(p.getX(i), p.getZ(i)) * 0.22;
    uvs[i * 2 + 1] = p.getY(i);
  }
  gg.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  const plinth = new THREE.BoxGeometry(0.66, 0.16, 0.66).translate(0, 0.08, 0);
  const abacus = new THREE.BoxGeometry(0.66, 0.15, 0.66).translate(0, 2.725, 0);
  return mergeGeometries([clean(gg), clean(bakeUV(plinth)), clean(bakeUV(abacus))]);
}

// Hanging banner: scalloped hem, vertical folds, slight billow. Local origin = top centre.
function bannerGeo(width, drop) {
  const g = new THREE.PlaneGeometry(width, 1, 48, 36);
  const p = g.attributes.position;
  const half = width / 2;
  const phase = Math.random() * 6;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const v = 0.5 - p.getY(i); // 0 top .. 1 bottom
    const e = x / half;
    const len = drop - 0.35 * e * e;
    const y = -v * len;
    const folds = Math.sin(x * 7.5 + phase) * 0.045 + Math.sin(x * 17 + phase * 2) * 0.012;
    const z = folds * Math.pow(v, 0.6) + 0.08 * v * (1 - e * e) + 0.01;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// --- build -------------------------------------------------------------------------------------

// Lumpy faceted stone, unit radius.
function rockGeo(seed) {
  const r = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, 2);
  const ph = Array.from({ length: 6 }, () => r() * 6.28);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.18 * Math.sin(3.1 * x + ph[0]) * Math.sin(2.7 * y + ph[1]) + 0.12 * Math.sin(5.3 * z + ph[2])
      + 0.08 * Math.sin(7.7 * (x + y) + ph[3]) - 0.25 * Math.max(0, Math.sin(2.2 * x + 1.3 * z + ph[4]) - 0.6);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// Stone-lined pit with a bed of rusted iron spikes. Top flush with the floor at y = 0.
function buildSpikePit(scene, { s, hw, hl, depth = 1.3 }, stoneMat) {
  const t = 0.3, liner = [];
  liner.push(box(-hw - t, -hw, -depth, -0.004, s - hl - t, s + hl + t)); // tops sit just under the floor (no z-fight)
  liner.push(box(hw, hw + t, -depth, -0.004, s - hl - t, s + hl + t));
  liner.push(box(-hw, hw, -depth, -0.004, s - hl - t, s - hl));
  liner.push(box(-hw, hw, -depth, -0.004, s + hl, s + hl + t));
  liner.push(box(-hw, hw, -depth - 0.1, -depth, s - hl, s + hl));
  // arcade columns that stand in or on the edge of the pit get square footings down to the bed
  const FOOT = 0.36, feet = [];
  for (let k = 1; k < L / BAY; k++) {
    if (Math.abs(k * BAY - s) > hl + FOOT) continue;
    for (const sx of [-1, 1]) {
      feet.push([sx * WALL_X, k * BAY]);
      liner.push(box(sx * WALL_X - FOOT, sx * WALL_X + FOOT, -depth, -0.004, k * BAY - FOOT, k * BAY + FOOT));
    }
  }
  const onFoot = (x, z) => feet.some(([fx, fz]) => Math.abs(x - fx) < FOOT + 0.05 && Math.abs(z - fz) < FOOT + 0.05);
  const walls = new THREE.Mesh(mergeGeometries(liner.map(clean)), stoneMat);
  walls.castShadow = walls.receiveShadow = true;
  scene.add(walls);
  const r = rng(99);
  const spikes = [];
  for (let x = -hw + 0.14; x < hw - 0.08; x += 0.2) for (let z = s - hl + 0.14; z < s + hl - 0.08; z += 0.2) {
    if (onFoot(x, z)) continue;
    // near the rims the spikes get shorter, so a false-floor flap dropped open (anim.js FLAP_OPEN,
    // tip ~1.4 m down per metre out) never cuts through them
    const d = Math.min(z - (s - hl), s + hl - z);
    const h = Math.min(0.6 + r() * 0.4, d < 0.97 ? depth - 1.4 * d - 0.28 : 9); // the flap reaches ~0.87 m out
    if (h < 0.12) continue;
    const g = new THREE.ConeGeometry(0.035 + r() * 0.015, h, 7);
    g.translate(0, h / 2, 0).rotateZ((r() - 0.5) * 0.25).rotateX((r() - 0.5) * 0.25);
    g.translate(x + (r() - 0.5) * 0.06, -depth, -(z + (r() - 0.5) * 0.06));
    spikes.push(clean(g));
  }
  const bed = new THREE.Mesh(mergeGeometries(spikes), spikeMaterial(-depth));
  bed.castShadow = bed.receiveShadow = true;
  scene.add(bed);
  const bedGroup = bed;
  // a little warm bounce down in the hole so the spikes read
  // warm glow up under both rims, clear of anything that lands in the pit; one pair per ~2.4 m
  // of width, so the whole bed reads from any camera
  const n = Math.max(1, Math.round((2 * hw) / 2.4));
  for (let i = 0; i < n; i++) for (const [rim, power] of [[s - hl + 0.15, 3.2], [s + hl - 0.15, 2.2]]) {
    const fill = new THREE.PointLight(0xffa25a, power, 0, 2);
    fill.position.set(-hw + ((i + 0.5) * 2 * hw) / n, -0.15, -rim);
    scene.add(fill);
  }
  return { bed: bedGroup };
}

// Torches stand on the nave face of every other column, alternating sides, none under the well.
function torchSpots() {
  const out = [];
  for (let k = 1; k < L / BAY; k++) for (const sx of [-1, 1]) {
    const s = k * BAY;
    if ((k % 2 === 0) !== (sx > 0)) continue;
    if (s > WELL[0] - 1 && s < WELL[1] + 1) continue;
    out.push({ s, sx, k });
  }
  return out;
}
const TORCH_Y = 2.15;

export function buildHall(scene, { pit = null } = {}) {
  const spots = torchSpots();
  const flames = spots.map(({ s, sx }) => [sx * (WALL_X - 0.52), TORCH_Y + 0.45, -s]);
  const wallMat = stoneMaterial({ w: 0.62, h: 0.31, base: 0xb3aa9a, alt: 0x837a6d, seed: 1 });
  const archMat = stoneMaterial({ w: 0.55, h: 0.3, base: 0xbdb3a0, alt: 0x8f8573, seed: 2, soot: flames });
  const vaultMat = stoneMaterial({ w: 0.5, h: 0.26, base: 0xa49d90, alt: 0x7a7367, seed: 5, uvSwap: false });
  const colMat = columnMaterial(flames);
  const ashlarMat = stoneMaterial({ base: 0xb3aa9a, alt: 0x837a6d, seed: 1, perStone: true, soot: flames });
  const voussoirMat = stoneMaterial({ base: 0xbdb3a0, alt: 0x8f8573, seed: 2, perStone: true, soot: flames });
  const mortarMat = stoneMaterial({ w: 100, h: 100, base: 0x8e8576, alt: 0x6b6357, seed: 21, tilt: 0, bump: 0.012 });
  const floorMat = floorMaterial();
  const iron = ironMaterial();
  const wood = woodMaterial();
  vaultMat.shadowSide = THREE.DoubleSide;
  wallMat.shadowSide = THREE.DoubleSide;

  const walls = [], arches = [], vaults = [], cols = [], irons = [], bed = [];

  // arcade walls (both sides)
  const arc = arcadeShape();
  arches.push(extrudeSY(arc, -WALL_X - WALL_T / 2, WALL_T));
  arches.push(extrudeSY(arc, WALL_X - WALL_T / 2, WALL_T));

  // aisle outer walls, gallery floors, aisle roofs, end walls
  for (const sx of [-1, 1]) {
    const a = sx < 0 ? [-AISLE_X - 0.3, -AISLE_X] : [AISLE_X, AISLE_X + 0.3];
    bed.push(box(a[0], a[1], 0, WALL_TOP + 0.3, -0.4, L + 0.4)); // mortar bed behind real stones
    const g = sx < 0 ? [-AISLE_X, -WALL_X - WALL_T / 2] : [WALL_X + WALL_T / 2, AISLE_X];
    walls.push(box(g[0], g[1], GALLERY_Y, GALLERY_Y + 0.2, 0, L));
    const r = sx < 0 ? [-AISLE_X - 0.3, -WALL_X] : [WALL_X, AISLE_X + 0.3];
    walls.push(box(r[0], r[1], WALL_TOP, WALL_TOP + 0.3, -0.4, L + 0.4));
    // gallery balustrade rail along the arcade back
  }
  const H = WALL_TOP + VAULT_R + 0.4;
  walls.push(box(-AISLE_X - 0.3, AISLE_X + 0.3, 0, H, -0.4, 0));
  bed.push(extrudeXY(farWallShape(), L, 0.45));
  // cornice under the vault spring
  for (const sx of [-1, 1]) {
    const x0 = sx * (WALL_X - WALL_T / 2);
    walls.push(box(Math.min(x0, x0 - sx * 0.12), Math.max(x0, x0 - sx * 0.12), WALL_TOP - 0.18, WALL_TOP, 0, L));
    walls.push(box(Math.min(x0, x0 - sx * 0.1), Math.max(x0, x0 - sx * 0.1), GALLERY_Y + 0.25, GALLERY_Y + 0.38, 0, L));
  }

  // vault, ribs and the light well
  vaults.push(vault(0, WELL[0]));
  vaults.push(vault(WELL[1], L));
  const gap = Math.asin(WELL_HALF / VAULT_R);
  vaults.push(vault(WELL[0], WELL[1], 0, Math.PI / 2 - gap));
  vaults.push(vault(WELL[0], WELL[1], Math.PI / 2 + gap, Math.PI));
  // well shaft
  const half = WELL_HALF + 0.3;
  walls.push(box(-half, -WELL_HALF, WALL_TOP + 2.2, WELL_TOP + 0.3, WELL[0] - 0.3, WELL[1] + 0.3));
  walls.push(box(WELL_HALF, half, WALL_TOP + 2.2, WELL_TOP + 0.3, WELL[0] - 0.3, WELL[1] + 0.3));
  walls.push(extrudeXY(shaftEndShape(half), WELL[0] - 0.3, 0.3, 0));
  walls.push(extrudeXY(shaftEndShape(half), WELL[1], 0.3, 0));
  // iron grate over the well
  for (let x = -WELL_HALF + 0.12; x < WELL_HALF; x += 0.22) {
    irons.push(clean(new THREE.CylinderGeometry(0.018, 0.018, WELL[1] - WELL[0], 6).rotateX(Math.PI / 2).translate(x, WELL_TOP, -(WELL[0] + WELL[1]) / 2)));
  }
  for (let s = WELL[0] + 0.5; s < WELL[1]; s += 0.65) {
    irons.push(clean(new THREE.BoxGeometry(2 * WELL_HALF, 0.06, 0.04).translate(0, WELL_TOP + 0.03, -s)));
  }

  // columns
  const cg = columnGeo();
  for (let k = 1; k < L / BAY; k++) for (const sx of [-1, 1]) {
    cols.push(cg.clone().translate(sx * WALL_X, 0, -k * BAY));
  }

  // back chamber behind the far door
  const bx = 2.2;
  walls.push(box(-bx - 0.3, -bx, 0, 3.6, L + 0.45, L + 4.5));
  walls.push(box(bx, bx + 0.3, 0, 3.6, L + 0.45, L + 4.5));
  walls.push(box(-bx - 0.3, bx + 0.3, 0, 3.6, L + 4.5, L + 4.8));
  walls.push(box(-bx - 0.3, bx + 0.3, 3.6, 3.9, L + 0.45, L + 4.8));

  const add = (geos, mat, opts = {}) => {
    const mesh = new THREE.Mesh(mergeGeometries(geos.map(clean)), mat);
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  add(walls, wallMat);
  add(bed, mortarMat);
  const masonry = buildMasonry();
  add(masonry.walls, ashlarMat);
  add(masonry.arches, voussoirMat);
  add(arches, archMat);
  add(vaults, vaultMat);
  add(cols, colMat);
  add(irons, iron);

  // floor, drawn in (x, s) and laid flat; a spike pit cuts a hole in it when asked for
  const fw = AISLE_X + 0.3;
  const outline = new THREE.Shape([[-fw, -1], [fw, -1], [fw, L + 5], [-fw, L + 5]].map(([x, y]) => new THREE.Vector2(x, y)));
  if (pit) {
    const { s: ps, hw, hl } = pit;
    outline.holes.push(new THREE.Path([[-hw, ps - hl], [-hw, ps + hl], [hw, ps + hl], [hw, ps - hl]].map(([x, y]) => new THREE.Vector2(x, y))));
  }
  const floorGeo = new THREE.ShapeGeometry(outline).rotateX(-Math.PI / 2);
  const fp = floorGeo.attributes.position;
  const fuv = floorGeo.attributes.uv;
  for (let i = 0; i < fp.count; i++) fuv.setXY(i, fp.getX(i), -fp.getZ(i));
  const floor = new THREE.Mesh(floorGeo, floorMat);
  const pitParts = pit ? buildSpikePit(scene, pit, wallMat) : null;
  floor.receiveShadow = true;
  scene.add(floor);

  // banners hanging below the gallery openings, both sides
  const palette = [0x8a1a1c, 0x1f3f8c, 0x245f2e, 0x8a1a1c, 0x957020, 0x1f3f8c];
  const clothMats = palette.map(clothMaterial);
  let ci = 0;
  for (let k = 0; k < L / BAY; k++) for (const sx of [-1, 1]) {
    const c = k * BAY + BAY / 2;
    if (c > WELL[0] - 1 && c < WELL[1] + 1 && sx > 0) continue;
    if ((k * 7 + (sx > 0 ? 3 : 0)) % 5 === 4) continue; // a few missing, torn down long ago
    const g = bannerGeo(2.1, 1.25 + ((k * 13) % 5) * 0.06);
    const m = new THREE.Mesh(g, clothMats[ci++ % clothMats.length]);
    m.position.set(sx * (WALL_X - WALL_T / 2 - 0.05), GALLERY_Y + 0.22, -c);
    m.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    // rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.3, 8).rotateX(Math.PI / 2), iron);
    rod.position.set(sx * (WALL_X - WALL_T / 2 - 0.075), GALLERY_Y + 0.23, -c);
    scene.add(rod);
  }

  // torches (see torchSpots); each casts soft shadows from the columns and arches
  const torches = [];
  for (const { s, sx, k } of spots) {
    const x = sx * (WALL_X - 0.24);
    const grp = new THREE.Group();
    grp.position.set(x, TORCH_Y, -s);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03).translate(-sx * 0.11, 0, 0), iron);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 16).rotateX(Math.PI / 2), iron);
    ring.position.set(-sx * 0.22, 0, 0);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.5, 8), wood);
    stick.position.set(-sx * 0.24, 0.12, 0);
    stick.rotation.z = sx * 0.18;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.1, 10, 1, true), iron);
    cup.position.set(-sx * 0.27, 0.38, 0);
    cup.rotation.z = sx * 0.18;
    for (const m of [arm, ring, stick, cup]) { m.castShadow = false; m.receiveShadow = true; grp.add(m); }
    const flame = new THREE.Sprite(flameMaterial(k * 1.7 + (sx > 0 ? 10 : 0)));
    flame.center.set(0.5, 0.08);
    flame.scale.set(0.2, 0.42, 1);
    flame.position.set(-sx * 0.28, 0.42, 0);
    grp.add(flame);
    const light = new THREE.PointLight(0xffa25a, 4, 0, 2);
    light.position.set(-sx * 0.45, 0.6, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.08;
    light.shadow.camera.far = 14;
    light.shadow.bias = -0.003;
    light.shadow.radius = 3;
    grp.add(light);
    scene.add(grp);
    torches.push({ light, base: light.intensity, seed: k * 3.1 + sx });
  }

  // rubble: grit along every wall foot, small heaps at some piers, and a few fallen blocks
  {
    const r = rng(1234);
    const rockMat = rubbleMaterial();
    const geos = [0, 1, 2, 3].map((i) => rockGeo(77 + i));
    const placed = geos.map(() => []);
    const put = (x, z, size, flat = 0.55) => {
      if (pit && Math.abs(x) < pit.hw + 0.1 && Math.abs(-z - pit.s) < pit.hl + 0.1) return; // nothing floats over the pit
      placed[Math.floor(r() * geos.length)].push({ x, z, size, flat, rot: r() * 6.28, tilt: (r() - 0.5) * 0.6 });
    };
    // wall feet (aisle walls and the far wall corners), denser and finer near the stone
    for (const sx of [-1, 1]) for (let i = 0; i < 240; i++) {
      const s = r() * L;
      const off = Math.pow(r(), 2.2) * 0.7;
      put(sx * (AISLE_X - 0.04 - off), -s, 0.015 + Math.pow(r(), 3) * 0.12 * (1 - off));
    }
    // heaps at a few piers (nave side) and in the aisles
    for (let k = 1; k < L / BAY; k++) for (const sx of [-1, 1]) {
      if (r() > 0.35) continue;
      const n = 8 + Math.floor(r() * 18);
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28, d = 0.32 + Math.pow(r(), 1.5) * 0.6;
        put(sx * WALL_X + Math.cos(a) * d, -k * BAY + Math.sin(a) * d, 0.02 + Math.pow(r(), 2.5) * 0.11);
      }
    }
    const dummy = new THREE.Object3D();
    geos.forEach((g, gi) => {
      const list = placed[gi];
      const im = new THREE.InstancedMesh(g, rockMat, list.length);
      list.forEach((it, i) => {
        dummy.position.set(it.x, it.size * it.flat * 0.7, it.z);
        dummy.rotation.set(it.tilt, it.rot, it.tilt * 0.5);
        dummy.scale.set(it.size, it.size * it.flat, it.size * (0.7 + r() * 0.6));
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.castShadow = true;
      im.receiveShadow = true;
      scene.add(im);
    });
    // fallen ashlar blocks, one cracked in two
    const blockMat = stoneMaterial({ w: 5, h: 5, base: 0xb3aa9a, alt: 0x837a6d, seed: 11, grime: 0.6 });
    const fallen = [
      [-(AISLE_X - 0.5), 0.16, -7.2, 0.62, 0.31, 0.4, 0.3, 0.08],
      [AISLE_X - 0.45, 0.16, -22.6, 0.6, 0.31, 0.38, -0.5, 0.0],
      [-1.75, 0.15, -25.4, 0.34, 0.3, 0.4, 0.9, 0.12],
      [-1.38, 0.13, -25.75, 0.3, 0.26, 0.38, 1.4, -0.2],
    ];
    for (const [x, y, z, w, h, d, ry, rz] of fallen) {
      const m = new THREE.Mesh(bakeUV(new THREE.BoxGeometry(w, h, d, 1, 1, 1)), blockMat);
      m.position.set(x, y, z);
      m.rotation.set(0, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    }
  }

  // cold light in the back chamber, seen through the far door
  const back = new THREE.PointLight(0x7f9ccf, 3, 0, 2);
  back.position.set(0, 3.0, -(L + 3));
  scene.add(back);

  return { torches, pit: pitParts, floorMaterial: floorMat };
}
