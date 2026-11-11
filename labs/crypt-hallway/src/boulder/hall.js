// The boulder hallway: a tall ashlar corridor with a release ledge and its 45° ramp at one end
// and a full-width doorway into daylight at the other. Built in Ep2's frame (timeline.js) inside
// one root group; toLab() maps a point from that frame into the lab's world.
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bakeUV, clean } from "../geo.js";
import { stoneMaterial, floorMaterial, ironMaterial, woodMaterial, flameMaterial, rubbleMaterial } from "../materials.js";
import {
  Z, HW, EDGE_X, LEDGE_Y, FOOT_X, BACK_X, WALL_END_X, DOOR_H, CEILING_Y, CRUSHER_XS, PIPE_FLAT, DROP_X,
} from "./timeline.js";

// Ep2 frame -> lab world: x along the hall becomes lab z, the lane Z becomes lab x = 0.
export const toLab = ([x, y, z]) => [Z - z, y, x];
export const ROOT = { position: [Z, 0, 0], rotationY: -Math.PI / 2 };

const Z0 = Z - HW, Z1 = Z + HW;     // the hall's side walls (inner faces)
const T = 0.45;                      // wall thickness
export const CHUTE = [9.2, 11.6];     // hole in the ceiling the boulders drop through
export const CRUSHER_W = 1.1;         // crusher block length along the hall (slot size)
export const TORCH_XS = [-8.2, -4.9, -1.5, 1.8, 5.0, 8.2];
const TORCH_Y = 2.25;

// an axis-aligned box in the Ep2 frame with UVs in metres
function bx(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return bakeUV(g);
}

export function buildHall(root, { crusherXs = CRUSHER_XS } = {}) {
  const torchFlames = TORCH_XS.map((x, i) => [x, TORCH_Y + 0.45, i % 2 ? Z1 - 0.3 : Z0 + 0.3]);
  const wallMat = stoneMaterial({ w: 0.62, h: 0.31, base: 0xb3aa9a, alt: 0x837a6d, seed: 1, soot: [] });
  const ledgeMat = stoneMaterial({ w: 0.9, h: 0.45, base: 0xa89f8f, alt: 0x7c7366, seed: 4, bump: 0.05 });
  const ceilMat = stoneMaterial({ w: 1.2, h: 0.6, base: 0x958d80, alt: 0x6f685d, seed: 5, grime: 1.2 });
  const floorMat = floorMaterial();
  const iron = ironMaterial(), wood = woodMaterial();

  const walls = [], ledge = [], ceil = [], beams = [], irons = [];
  // side walls run from the doorway to the back wall
  for (const [a, b] of [[Z0 - T, Z0], [Z1, Z1 + T]]) walls.push(bx(WALL_END_X, BACK_X + T, 0, CEILING_Y + 0.4, a, b));
  walls.push(bx(BACK_X, BACK_X + T, 0, CEILING_Y + 0.4, Z0, Z1));
  // the doorway: a full-width opening under a deep lintel, slotted for the blast door
  walls.push(bx(WALL_END_X - 0.6, WALL_END_X - 0.14, DOOR_H, CEILING_Y + 0.4, Z0 - T, Z1 + T));
  walls.push(bx(WALL_END_X, WALL_END_X + 0.1, DOOR_H, CEILING_Y, Z0, Z1));
  for (const [a, b] of [[Z0 - T - 2.5, Z0 - T], [Z1 + T, Z1 + T + 2.5]]) walls.push(bx(WALL_END_X - 0.6, WALL_END_X, 0, CEILING_Y + 0.4, a, b)); // façade
  // release ledge, its ramp and the floor under it
  ledge.push(bx(EDGE_X, BACK_X, 0, LEDGE_Y, Z0, Z1));
  {
    const sh = new THREE.Shape([new THREE.Vector2(FOOT_X, 0), new THREE.Vector2(EDGE_X, LEDGE_Y), new THREE.Vector2(EDGE_X, 0)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 2 * HW, bevelEnabled: false }).translate(0, 0, Z0);
    ledge.push(bakeUV(g));
  }
  // ceiling slabs, leaving the chute and the crusher slots open (recesses above them)
  const holes = [CHUTE, ...crusherXs.map((x) => [x - CRUSHER_W / 2 - 0.05, x + CRUSHER_W / 2 + 0.05])].sort((a, b) => a[0] - b[0]);
  let from = WALL_END_X;
  for (const [a, b] of holes) {
    ceil.push(bx(from, a, CEILING_Y, CEILING_Y + 0.4, Z0, Z1));
    ceil.push(bx(a, b, CEILING_Y + 2.2, CEILING_Y + 2.6, Z0, Z1)); // the dark recess above a slot
    for (const zz of [[Z0, Z0 + 0.05], [Z1 - 0.05, Z1]]) walls.push(bx(a, b, CEILING_Y, CEILING_Y + 2.2, ...zz));
    walls.push(bx(a - 0.05, a, CEILING_Y, CEILING_Y + 2.2, Z0, Z1), bx(b, b + 0.05, CEILING_Y, CEILING_Y + 2.2, Z0, Z1));
    from = b;
  }
  ceil.push(bx(from, BACK_X, CEILING_Y, CEILING_Y + 0.4, Z0, Z1));
  // oak beams across the hall on stone corbels, clear of the slots
  for (let x = WALL_END_X + 1.3; x < BACK_X - 0.5; x += 2.6) {
    if (holes.some(([a, b]) => x > a - 0.3 && x < b + 0.3)) continue;
    beams.push(bx(x - 0.16, x + 0.16, CEILING_Y - 0.34, CEILING_Y, Z0, Z1));
    for (const [a, b] of [[Z0, Z0 + 0.22], [Z1 - 0.22, Z1]]) ledge.push(bx(x - 0.22, x + 0.22, CEILING_Y - 0.62, CEILING_Y - 0.34, a, b));
  }

  const add = (geos, mat) => {
    const m = new THREE.Mesh(mergeGeometries(geos.map(clean)), mat);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  add(walls, wallMat);
  add(ledge, ledgeMat);
  add(ceil, ceilMat);
  add(beams, wood);

  // floor: flagstones from the doorway (and out onto the threshold) to the foot of the ramp; the
  // stretch the half-pipe curls up from is its own slab set (props.js) over a dark pit
  const floor = add([
    bx(WALL_END_X - 0.6, PIPE_FLAT[0], -0.3, 0, Z0 - 0.05, Z1 + 0.05),
    bx(PIPE_FLAT[1], FOOT_X + 0.4, -0.3, 0, Z0 - 0.05, Z1 + 0.05),
  ], floorMat);
  add([bx(PIPE_FLAT[0], PIPE_FLAT[1], -0.75, -0.6, Z0, Z1)], rubbleMaterial());

  // outside: a sunlit courtyard and a cliff beyond, seen through the doorway
  {
    // the yard is a terrace: a few metres out it drops away (the balls go over), the cliff stands beyond
    const yardLen = WALL_END_X - DROP_X + 0.6;
    const yard = new THREE.Mesh(bakeUV(new THREE.BoxGeometry(yardLen, 6, 40).translate(WALL_END_X - 0.6 - yardLen / 2, -3, Z)), stoneMaterial({ w: 0.9, h: 0.45, base: 0xb8ab92, alt: 0x8c806a, seed: 12 }));
    yard.receiveShadow = true;
    root.add(yard);
    const cliffMat = stoneMaterial({ w: 3.5, h: 1.6, base: 0xc8b896, alt: 0x9c8c70, seed: 9, bump: 0.08, grime: 0.4 });
    const cliff = new THREE.Mesh(bakeUV(new THREE.BoxGeometry(2, 40, 60).translate(WALL_END_X - 22, 4, Z)), cliffMat);
    cliff.receiveShadow = true;
    root.add(cliff);
  }

  // torches: iron brackets on alternate walls, each a flickering shadow-casting light
  const torches = [];
  TORCH_XS.forEach((x, i) => {
    const side = i % 2 ? 1 : -1; // -1: on the Z0 wall
    const grp = new THREE.Group();
    grp.position.set(x, TORCH_Y, side < 0 ? Z0 : Z1);
    const out = -side; // into the hall
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.24).translate(0, 0, out * 0.12), iron);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.5, 8), wood);
    stick.position.set(0, 0.12, out * 0.26);
    stick.rotation.x = out * 0.18;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.1, 10, 1, true), iron);
    cup.position.set(0, 0.38, out * 0.3);
    cup.rotation.x = out * 0.18;
    for (const m of [arm, stick, cup]) { m.receiveShadow = true; grp.add(m); }
    const flame = new THREE.Sprite(flameMaterial(i * 2.3 + 1));
    flame.center.set(0.5, 0.08);
    flame.scale.set(0.2, 0.42, 1);
    flame.position.set(0, 0.42, out * 0.31);
    grp.add(flame);
    const light = new THREE.PointLight(0xffa25a, 4.5, 0, 2);
    light.position.set(0, 0.6, out * 0.5);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.08;
    light.shadow.camera.far = 14;
    light.shadow.bias = -0.003;
    light.shadow.radius = 3;
    grp.add(light);
    root.add(grp);
    torches.push({ light, base: light.intensity, seed: i * 3.1 + 0.7, x });
  });

  // a chute lamp: cold light spilling down the boulder chute onto the ledge
  const chuteLight = new THREE.PointLight(0xe0d2bc, 2.5, 0, 2);
  chuteLight.position.set((CHUTE[0] + CHUTE[1]) / 2, CEILING_Y + 0.4, Z);
  // and a pair of braziers on the ledge, either side of the waiting ball
  for (const zz of [Z0 + 0.35, Z1 - 0.35]) {
    const l = new THREE.PointLight(0xffa25a, 3.5, 0, 2);
    l.position.set(EDGE_X + 0.5, LEDGE_Y + 1.3, zz);
    root.add(l);
  }
  root.add(chuteLight);

  // grit along the wall feet
  {
    let seed = 4321;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const n = 260, im = new THREE.InstancedMesh(geo, rubbleMaterial(), n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const x = WALL_END_X + 0.3 + r() * (FOOT_X - WALL_END_X - 0.6);
      const side = r() < 0.5 ? Z0 : Z1;
      const off = Math.pow(r(), 2.2) * 0.45;
      const s = 0.015 + Math.pow(r(), 3) * 0.09 * (1 - off);
      d.position.set(x, s * 0.35, side === Z0 ? Z0 + 0.03 + off : Z1 - 0.03 - off);
      d.rotation.set(r() * 3, r() * 3, r() * 3);
      d.scale.set(s, s * 0.55, s * (0.7 + r() * 0.6));
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    }
    im.castShadow = im.receiveShadow = true;
    root.add(im);
  }
  return { torches, floor, floorMaterial: floorMat, iron };
}
