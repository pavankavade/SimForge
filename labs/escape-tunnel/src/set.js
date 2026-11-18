// The prison camp, as one long side-on cutaway. The ground is cut by the plane z = 0, so the camera
// sees the grey topsoil, the yellow sand under it and the tunnel: a shaft under the hut's stove, a
// gallery under the yard and the fence, and an exit shaft that comes up short of the trees, beside
// the guard tower. Units are metres, except the gallery, which is 26 long here for the real
// tunnel's hundred.
import * as THREE from "three/webgpu";
import { mrt, vec4 } from "three/tsl";
import { woodMaterial, matte, ironMaterial, sandMaterial, topsoilMaterial } from "./materials.js";

export const DEPTH = 7;                       // gallery floor (the real one: 9 m)
export const BED_X = -8.4;                    // the bunk you first dig under
export const STOVE_X = -6;                    // the stove, and the shaft under it
export const EXIT_X = 20;                     // where the tunnel comes up
export const GALLERY = [STOVE_X + 0.5, EXIT_X + 0.5];
export const HUT = { x0: -9.6, x1: -1.8, z0: -5, h: 2.6 };
export const BUNK_B = -2.95;                  // the second bunk
export const PIT = { x: [BED_X - 0.5, BED_X + 0.5], depth: 1.5 };
export const PILE = [BED_X + 1.4, -1.2];      // where the sand from the pit lands (x, z)
export const FENCE_X = [14.5, 16];            // the double fence; grass starts beyond it
export const TOWER = [17.2, 5.2, -3];         // guard tower platform (x, floor height, z)
export const TREES_X = 24;                    // the tree line
export const CUT_Z = -1.3;                    // how far back the tunnel is cut into the ground
export const BAYS = 26;                       // shoring frames along the gallery
export const TINS = 80; export const TIN_STEP = 0.31;                      // milk tins in the air pipe
export const BOARDS = 8;                      // boards under each mattress
export const FLOOR_Y = 0.1;
export const SLEEPER_STEP = 0.5;                // bed-board sleepers under the rails
export const RAIL_TOP = 0.08;
export const GAP_DASHES = 7;                   // the red dashes from the hole to the trees                   // top of the hut's plank floor

const VOIDS = {
  pit: { x: PIT.x, y: [-PIT.depth, 0] },
  shaft: { x: [STOVE_X - 0.5, STOVE_X + 0.5], y: [-DEPTH, 0] },
  gallery: { x: [STOVE_X - 0.5, EXIT_X + 0.5], y: [-DEPTH, -DEPTH + 1] },
  exit: { x: [EXIT_X - 0.5, EXIT_X + 0.5], y: [-DEPTH, 0] },
};

const hash = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const box = (mat, x0, x1, y0, y1, z0, z1) => {
  const m = new THREE.Mesh(UNIT, mat);
  setBox(m, x0, x1, y0, y1, z0, z1);
  return m;
};
function setBox(m, x0, x1, y0, y1, z0, z1) {
  m.visible = x1 - x0 > 0.01 && y1 - y0 > 0.01;
  if (!m.visible) return;
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.scale.set(x1 - x0, y1 - y0, z1 - z0);
}

export function buildSet() {
  const group = new THREE.Group();
  const sand = sandMaterial(), sandDark = sandMaterial({ shade: 0.62 }), topsoil = topsoilMaterial(), grass = matte(0x4a6a32, 0.95);
  const wood = woodMaterial(), woodPale = woodMaterial(0xb39262), woodWall = woodMaterial(0x9a7c56, { along: "y" }), iron = ironMaterial(), dark = matte(0x1d1b19, 0.7, 0.3);
  const blanket = matte(0x6e7480, 0.95), pillow = matte(0xd8d2c4, 0.9), tin = matte(0xb9b6ae, 0.45, 0.7), rope = matte(0x9c8256, 0.95), pine = matte(0x244a2a, 0.9), bark = matte(0x4a3524, 0.95);
  const add = (...o) => { group.add(...o); return o[0]; };

  // --- the ground: a grid of blocks, cut back to CUT_Z wherever a void (pit, shafts, gallery) runs ---
  const xs = [-34, FENCE_X[1] + 0.6, 44], ys = [-16, -0.3, 0];
  for (const k of Object.keys(VOIDS)) { xs.push(...VOIDS[k].x); ys.push(...VOIDS[k].y); }
  const uniq = (a) => [...new Set(a)].sort((p, q) => p - q);
  const X = uniq(xs), Y = uniq(ys);
  for (let i = 0; i < X.length - 1; i++) {
    for (let j = 0; j < Y.length - 1; j++) {
      const cx = (X[i] + X[i + 1]) / 2, cy = (Y[j] + Y[j + 1]) / 2;
      const open = Object.keys(VOIDS).some((k) => cx > VOIDS[k].x[0] && cx < VOIDS[k].x[1] && cy > VOIDS[k].y[0] && cy < VOIDS[k].y[1]);
      const mat = cy > -0.3 ? (cx > FENCE_X[1] + 0.6 ? grass : topsoil) : open ? sandDark : sand;
      add(box(mat, X[i], X[i + 1], Y[j], Y[j + 1], -26, open ? CUT_Z : 0));
    }
  }
  // each void is plugged by one block of sand that the film shrinks as the digging goes on
  const fills = {};
  for (const k of Object.keys(VOIDS)) fills[k] = add(box(sand, ...VOIDS[k].x, ...VOIDS[k].y, CUT_Z, 0));
  const crust = { pit: add(box(topsoil, ...VOIDS.pit.x, -0.3, 0, CUT_Z, 0)), shaft: add(box(topsoil, ...VOIDS.shaft.x, -0.3, 0, CUT_Z, 0)) };
  const lid = add(box(grass, EXIT_X - 0.55, EXIT_X + 0.55, -0.02, 0.14, CUT_Z, 0)); // the last square of turf
  const dumpMat = matte(0xe6b62c, 0.9); // fresh subsoil in daylight: as bright as a traffic cone on the grey
  const dump = add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dumpMat)); // yellow sand tipped on the grey yard

  // --- the hut: plank floor, back and end walls, half a roof (the camera side is cut away) ---
  const { x0, x1, z0, h } = HUT;
  add(box(wood, x0, x1, 0, FLOOR_Y, z0, CUT_Z));                                              // the floor behind the cut
  for (const [a, b] of [[x0, PIT.x[0]], [PIT.x[1], VOIDS.shaft.x[0]], [VOIDS.shaft.x[1], x1]]) add(box(wood, a, b, 0, FLOOR_Y, CUT_Z, 0));
  add(box(woodWall, x0, x1, FLOOR_Y, h, z0 - 0.1, z0));
  add(box(woodWall, x0 - 0.1, x0, FLOOR_Y, h, z0, 0), box(woodWall, x1, x1 + 0.1, FLOOR_Y, h, z0, 0));
  const roof = add(box(woodPale, x0 - 0.4, x1 + 0.4, 0, 0.1, z0 - 0.4, -1.6));
  roof.position.y = h + 0.55;
  roof.rotation.x = -0.32;
  for (let bx = x0 + 0.6; bx < x1; bx += 1.3) add(box(wood, bx - 0.05, bx + 0.05, h - 0.12, h, z0, -1.4));   // rafters
  // two windows in the back wall: bright panes with a cross of glazing bars
  const pane = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xdcecff).multiplyScalar(2.2) });
  for (const wx of [-6.75, -4.3]) {
    add(box(pane, wx - 0.45, wx + 0.45, 1.15, 2.0, z0, z0 + 0.02)).castShadow = false;
    add(box(wood, wx - 0.5, wx + 0.5, 1.1, 1.15, z0, z0 + 0.06), box(wood, wx - 0.5, wx + 0.5, 2.0, 2.05, z0, z0 + 0.06));
    add(box(wood, wx - 0.5, wx - 0.45, 1.1, 2.05, z0, z0 + 0.06), box(wood, wx + 0.45, wx + 0.5, 1.1, 2.05, z0, z0 + 0.06));
    add(box(wood, wx - 0.02, wx + 0.02, 1.15, 2.0, z0, z0 + 0.05), box(wood, wx - 0.45, wx + 0.45, 1.56, 1.6, z0, z0 + 0.05));
  }
  const hutLight = add(new THREE.PointLight(0xffdcb0, 0, 16, 1.1)); // the hut is in its own roof's shade: a warm bounce
  hutLight.position.set(-6.4, 2.0, -1.6);
  // two bunks: posts, two frames, a mattress each, and the boards under them (the film takes them away)
  const boards = [];
  let bunkLow = null; // bunk A's lower bed, which jolts when a head hits it from below
  let bunkTop = null; // ...and its upper bed, which sags when its boards are gone
  for (const bx of [BED_X, BUNK_B]) {
    for (const [px, pz] of [[-0.95, -0.2], [0.95, -0.2], [-0.95, -1.0], [0.95, -1.0]]) add(box(wood, bx + px - 0.04, bx + px + 0.04, FLOOR_Y, 1.75, pz - 0.04, pz + 0.04));
    for (const by of [0.55, 1.35]) {
      const bed = add(new THREE.Group());
      if (bx === BED_X && by < 1) bunkLow = bed;
      if (bx === BED_X && by > 1) bunkTop = bed;
      bed.add(box(wood, bx - 0.95, bx + 0.95, by - 0.05, by + 0.05, -0.24, -0.16), box(wood, bx - 0.95, bx + 0.95, by - 0.05, by + 0.05, -1.04, -0.96));
      bed.add(box(blanket, bx - 0.9, bx + 0.9, by + 0.07, by + 0.2, -0.98, -0.22), box(pillow, bx - 0.86, bx - 0.5, by + 0.2, by + 0.28, -0.9, -0.3));
      for (let i = 0; i < BOARDS; i++) {
        const u = bx - 0.84 + (i / (BOARDS - 1)) * 1.68;
        const mesh = box(woodPale, u - 0.09, u + 0.09, by + 0.02, by + 0.06, -1.0, -0.2);
        bed.add(mesh);
        boards.push({ i, mesh });
      }
    }
  }
  // the loose floorboards over the pit: hinged at the pit's left edge
  const pitBoards = add(new THREE.Group());
  pitBoards.position.set(PIT.x[0], 0, 0);
  for (let i = 0; i < 3; i++) pitBoards.add(box(woodPale, 0.01, PIT.x[1] - PIT.x[0] - 0.01, 0.0, FLOOR_Y, CUT_Z + i * 0.435 + 0.01, CUT_Z + (i + 1) * 0.435 - 0.01));
  const pile = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), sand)); // the sand you threw out
  pile.position.set(PILE[0], FLOOR_Y, PILE[1]);
  // the stove on its tile slab, with a flue to the roof: the whole thing slides aside over the trap
  const stove = add(new THREE.Group());
  stove.add(box(matte(0x8a4a38, 0.7), -0.62, 0.62, FLOOR_Y, FLOOR_Y + 0.07, CUT_Z + 0.02, -0.02));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.85, 20), dark);
  body.position.set(0, FLOOR_Y + 0.56, -0.65);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), dark);
  top.position.set(0, FLOOR_Y + 1.0, -0.65);
  const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 10), dark);
  flue.position.set(0, FLOOR_Y + 1.8, -0.65);
  for (const fx of [-0.2, 0.2]) stove.add(box(dark, fx - 0.03, fx + 0.03, FLOOR_Y + 0.07, FLOOR_Y + 0.15, -0.5, -0.44));
  const glowMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xff6a20).multiplyScalar(5) });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.02), glowMat);
  glow.position.set(0, FLOOR_Y + 0.45, -0.345);
  const ember = new THREE.PointLight(0xff7a30, 3, 3, 1.5);
  ember.position.set(0, FLOOR_Y + 0.45, -0.1);
  stove.add(body, top, flue, glow, ember);
  const pad = box(blanket, -0.4, -0.3, FLOOR_Y + 0.72, FLOOR_Y + 1.0, -0.85, -0.45); // a folded blanket to shove it with
  stove.add(pad);
  // the ferret's probe rod and the red ring round what he finds
  const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), matte(0x8c8c90, 0.35, 0.9)));
  const ringMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xff2a1c).multiplyScalar(1.6) });
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 10, 48), ringMat));

  // --- the tunnel's dressing (blockout) ---
  const ladder = (x) => {
    const g = add(new THREE.Group());
    g.add(box(woodPale, x - 0.25, x - 0.2, -DEPTH, 0, -1.1, -1.05), box(woodPale, x + 0.2, x + 0.25, -DEPTH, 0, -1.1, -1.05));
    for (let y = -DEPTH + 0.3; y < 0; y += 0.38) g.add(box(woodPale, x - 0.25, x + 0.25, y, y + 0.05, -1.1, -1.05));
    return g;
  };
  const ladders = [ladder(STOVE_X), ladder(EXIT_X)];
  const bays = Array.from({ length: BAYS }, (_, i) => {
    const g = add(new THREE.Group()), a = GALLERY[0] + i, b = a + 1;
    g.add(box(woodPale, a + 0.02, b - 0.02, -DEPTH + 0.94, -DEPTH + 1, CUT_Z, 0));            // roof boards
    g.add(box(woodPale, a + 0.02, b - 0.02, -DEPTH, -DEPTH + 1, CUT_Z, CUT_Z + 0.05));        // back wall boards
    g.add(box(wood, a, a + 0.07, -DEPTH, -DEPTH + 1, CUT_Z, CUT_Z + 0.12));                   // a post
    return g;
  });
  const tins = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085, 0.085, TIN_STEP - 0.02, 12), tin, TINS));
  tins.frustumCulled = false; // its count changes, so its bounds would be stale
  const dummy = new THREE.Object3D();
  for (let i = 0; i < TINS; i++) {
    dummy.position.set(GALLERY[0] + 0.5 + i * TIN_STEP, -DEPTH + 0.1, CUT_Z + 0.3);
    dummy.rotation.set(0, 0, Math.PI / 2);
    dummy.updateMatrix();
    tins.setMatrixAt(i, dummy.matrix);
  }
  // the air pump at the foot of the shaft: a kit bag between two boards, rowed like a bellows
  const pump = add(new THREE.Group());
  const canvas = matte(0x8f8056, 0.95);
  pump.add(box(wood, -0.55, 0.75, 0, 0.06, -0.28, 0.28), box(wood, -0.5, -0.42, 0.06, 0.64, -0.27, 0.27));
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1, 16), canvas);
  bag.rotation.z = Math.PI / 2;
  const plate = box(wood, -0.04, 0.04, 0.06, 0.64, -0.27, 0.27);
  const handle = box(woodPale, -0.03, 0.03, 0.3, 1.0, -0.03, 0.03);
  pump.add(bag, plate, handle);
  pump.position.set(GALLERY[0] + 0.2, -DEPTH, -0.62);
  // rails on bed-board sleepers, the trolley and its tow rope
  const rails = [-0.78, -0.38].map((z) => add(box(wood, 0, 1, -DEPTH + 0.03, -DEPTH + RAIL_TOP, z - 0.03, z + 0.03)));
  const SLEEPERS = Math.floor((GALLERY[1] - GALLERY[0]) / SLEEPER_STEP);
  const sleepers = add(new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.03, 0.62), woodPale, SLEEPERS));
  sleepers.frustumCulled = false;
  for (let i = 0; i < SLEEPERS; i++) {
    dummy.position.set(GALLERY[0] + 0.3 + i * SLEEPER_STEP, -DEPTH + 0.015, -0.58);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  const trolley = add(new THREE.Group());
  trolley.add(box(woodPale, -0.6, 0.6, 0.12, 0.18, -0.3, 0.3), box(wood, -0.6, -0.54, 0.18, 0.3, -0.3, 0.3));
  for (const [wx, wz] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), wood);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.07, wz);
    trolley.add(w);
  }
  const tow = add(box(rope, 0, 1, -DEPTH + 0.2, -DEPTH + 0.225, -0.59, -0.565));
  // the fat lamps: a tin with a flame, one per tunnel light
  const flameMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xffa040).multiplyScalar(5) });
  const flames = [0, 1, 2, 3].map(() => {
    const g = add(new THREE.Group());
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), tin));
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), flameMat);
    fl.position.y = 0.09;
    fl.scale.y = 1.8;
    g.add(fl);
    g.userData.flame = fl;
    return g;
  });
  // the cave-in: a mound of sand that drops on the digger
  const slump = add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), sand));
  // bed boards on their way from the bunks to the shaft
  const flyers = Array.from({ length: 6 }, () => add(box(woodPale, -0.42, 0.42, -0.09, 0.09, -0.02, 0.02))); // flat to the camera, so they read as boards

  // --- the yard (line 2): the sack of sand, the trouser bags, the trail they leave ---
  const sack = add(new THREE.Group());
  sack.add(box(canvas, -0.17, 0.17, -0.26, 0.26, -0.15, 0.15));
  const trail = Array.from({ length: 16 }, () => add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.03, 10), dumpMat)));
  const bagMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xffd23a).multiplyScalar(2.2) });
  const bags = [-0.11, 0.11].map((dx) => {
    const g = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.46, 4, 10), bagMat));
    g.userData.dx = dx;
    return g;
  });
  // more huts behind the yard
  for (const [hx, hz, hw] of [[-1.5, -11, 7], [8.5, -12.5, 6], [-13, -12, 7]]) {
    add(box(woodWall, hx - hw / 2, hx + hw / 2, 0, 2.6, hz - 2.4, hz + 2.4));
    for (const k of [-1, 1]) {
      const slope = add(box(dark, hx - hw / 2 - 0.3, hx + hw / 2 + 0.3, 0, 0.12, -1.55, 1.55));
      slope.position.set(hx, 3.05, hz + k * 1.3);
      slope.rotation.x = k * 0.52;
    }
    for (let wx = hx - hw / 2 + 1; wx < hx + hw / 2; wx += 1.7) add(box(dark, wx - 0.35, wx + 0.35, 1.2, 1.9, hz + 2.4, hz + 2.42));
  }

  // --- above ground: the double fence, the guard tower, the trees (blockout) ---
  for (const fx of FENCE_X) {
    for (let z = -25; z <= -0.5; z += 2.5) add(box(wood, fx - 0.06, fx + 0.06, 0, 2.7, z - 0.06, z + 0.06));
    for (let y = 0.3; y < 2.7; y += 0.4) add(box(iron, fx - 0.012, fx + 0.012, y, y + 0.024, -25.5, 0));
  }
  const [tx, ty, tz] = TOWER;
  for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) add(box(wood, tx + lx - 0.08, tx + lx + 0.08, 0, ty + 1.9, tz + lz - 0.08, tz + lz + 0.08));
  add(box(wood, tx - 1.2, tx + 1.2, ty - 0.1, ty, tz - 1.2, tz + 1.2));
  add(box(woodPale, tx - 1.2, tx + 1.2, ty, ty + 0.9, tz - 1.2, tz - 1.12), box(woodPale, tx - 1.2, tx - 1.12, ty, ty + 0.9, tz - 1.2, tz + 1.2), box(woodPale, tx + 1.12, tx + 1.2, ty, ty + 0.9, tz - 1.2, tz + 1.2));
  const cap = add(new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 4), dark));
  cap.position.set(tx, ty + 2.35, tz);
  cap.rotation.y = Math.PI / 4;
  const lamp = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.3, 12), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xfff2d0) })));
  lamp.position.set(tx + 0.9, ty + 1.3, tz + 1.0);
  lamp.rotation.z = -0.9;
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 1, 7), coneGeo = new THREE.ConeGeometry(1, 1, 8);
  const tree = (x, z, s) => {
    const t = new THREE.Mesh(trunkGeo, bark);
    t.scale.set(s, 2.2 * s, s);
    t.position.set(x, 1.1 * s, z);
    add(t);
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(coneGeo, pine);
      c.scale.set((1.5 - k * 0.38) * s, 2.3 * s, (1.5 - k * 0.38) * s);
      c.position.set(x, (2.6 + k * 1.45) * s, z);
      add(c);
    }
  };
  for (let i = 0; i < 34; i++) tree(TREES_X + hash(i) * 18, -1.2 - hash(i, 1) * 23, 0.9 + hash(i, 2) * 0.7);   // the woods you were aiming for
  for (let i = 0; i < 40; i++) tree(-32 + i * 1.5 + hash(i, 3), -19 - hash(i, 4) * 6, 1.1 + hash(i, 5) * 0.7);  // behind the camp

  // tufts of grass outside the wire
  const tuft = add(new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.26, 5), matte(0x5d8a3a, 0.9), 220));
  for (let i = 0; i < 220; i++) {
    dummy.position.set(FENCE_X[1] + 0.8 + hash(i, 7) * 9, 0.1, -0.08 - hash(i, 8) * hash(i, 8) * 7);
    if (Math.abs(dummy.position.x - EXIT_X) < 0.95 && dummy.position.z > -1.6) dummy.position.z -= 1.8; // none over the hole
    dummy.rotation.set((hash(i, 9) - 0.5) * 0.5, hash(i, 10) * 6, (hash(i, 11) - 0.5) * 0.5);
    dummy.scale.setScalar(0.7 + hash(i, 12) * 0.8);
    dummy.updateMatrix();
    tuft.setMatrixAt(i, dummy.matrix);
  }
  // the gap: red dashes on the grass from the hole to the first trees
  const dashMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xff3020).multiplyScalar(3) });
  const dashes = Array.from({ length: GAP_DASHES }, (_, i) => add(box(dashMat, EXIT_X + 0.8 + i * 0.5, EXIT_X + 1.12 + i * 0.5, 0.02, 0.07, -0.55, -0.25)));
  // the searchlight's beam
  const beamMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xfff2c8), transparent: true, opacity: 0.055, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  beamMat.mrtNode = mrt({ diffuseColor: vec4(0), normal: vec4(0), velocity: vec4(0) });
  const beam = add(new THREE.Mesh(new THREE.ConeGeometry(1, 1, 48, 1, true), beamMat));

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const o of [lamp, glow, ring, rod, beam, tuft, ...dashes, ...bags, ...flames.map((g) => g.userData.flame)]) { o.castShadow = false; o.receiveShadow = false; }
  const back = (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);

  // Per-frame state from anim.propsAt: how far each hole is dug, and which props are out.
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const update = (s) => {
    const z = [CUT_Z, 0];
    setBox(fills.pit, ...VOIDS.pit.x, -PIT.depth, -PIT.depth * s.pit, ...z);
    setBox(fills.shaft, ...VOIDS.shaft.x, -DEPTH, -DEPTH * s.shaft, ...z);
    crust.pit.visible = s.pit < 0.2;
    crust.shaft.visible = s.shaft < 0.04;
    const front = GALLERY[0] + (GALLERY[1] - GALLERY[0]) * s.gallery;
    setBox(fills.gallery, front, GALLERY[1], -DEPTH, -DEPTH + 1, ...z);
    setBox(fills.exit, ...VOIDS.exit.x, -DEPTH + 1 + (DEPTH - 1) * s.exit, 0, ...z);
    lid.visible = s.exit < 0.999 || s.lid < 1;
    lid.rotation.z = s.lid * 1.1;
    lid.position.set(EXIT_X + s.lid * 0.5, 0.06 + s.lid * 0.5, CUT_Z / 2);
    dump.visible = s.dump > 0.01;
    dump.position.set(s.dumpAt[0], 0.04, s.dumpAt[1]);
    dump.scale.set(s.dump * (0.62 + 0.2 * s.dumpFlat), s.dump * (0.3 - 0.12 * s.dumpFlat), s.dump * (0.62 + 0.14 * s.dumpFlat));
    // the hut
    hutLight.intensity = s.hutLight * 13;
    pitBoards.visible = !!s.pitBoards;
    if (s.pitBoards) { pitBoards.position.y = s.pitBoards.y; pitBoards.rotation.z = s.pitBoards.rot; }
    pile.visible = s.pile > 0.01;
    pile.scale.set(s.pile, s.pile * 0.7, s.pile);
    bunkLow.position.y = s.bunkJolt;
    stove.position.set(STOVE_X + s.stove * 1.1, 0, 0);
    pad.visible = !!s.pad;
    rod.visible = !!s.rod;
    if (s.rod) {
      va.set(...s.rod.a); vb.set(...s.rod.b);
      rod.position.copy(va).add(vb).multiplyScalar(0.5);
      rod.scale.set(1, va.distanceTo(vb), 1);
      rod.quaternion.setFromUnitVectors(up, vb.sub(va).normalize());
    }
    ring.visible = !!s.ring;
    if (s.ring) { ring.position.set(...s.ring.pos); ring.scale.setScalar(s.ring.k); }
    for (const b of boards) b.mesh.visible = b.i < s.boards || (b.i % 3 === 1 && s.boards < 4);
    bunkTop.position.y = s.bunkSag;
    flyers.forEach((m, i) => { const t = s.flyers[i]; m.visible = !!t; if (t) { m.position.set(...t.pos); m.rotation.z = t.rot; } });
    // the yard
    sack.visible = !!s.sack;
    if (s.sack) { sack.position.set(...s.sack.pos); sack.rotation.z = s.sack.rot; }
    trail.forEach((m, i) => { const t = s.trail[i]; m.visible = !!t && t.k > 0.02; if (m.visible) { m.position.set(t.x, 0.015, t.z); m.scale.set(t.k, 1, t.k); } });
    bags.forEach((m) => { m.visible = !!s.bags; if (s.bags) { m.position.set(s.bags.x + m.userData.dx, 0.52, s.bags.z + 0.13); m.scale.setScalar(Math.max(0.001, s.bags.k)); } });
    // the tunnel
    ladders[0].visible = s.shaft > 0.97;
    ladders[1].visible = s.exit > 0.5;
    bays.forEach((g, i) => { const k = Math.min(1, Math.max(0, s.shore * BAYS - i)); g.visible = k > 0; g.position.z = (1 - back(k)) * 0.7; });
    tins.count = Math.round(s.pipe * TINS);
    pump.visible = s.pump;
    const len = 0.3 + 0.5 * (1 - s.pumpStroke);
    bag.scale.set(1, len, 1);
    bag.position.set(-0.42 + len / 2, 0.35, 0);
    plate.position.x = -0.42 + len;
    handle.position.x = -0.42 + len;
    const railX = GALLERY[0] + (GALLERY[1] - GALLERY[0]) * s.rails;
    for (const r of rails) { const zc = r.position.z; setBox(r, GALLERY[0], railX, -DEPTH + 0.03, -DEPTH + RAIL_TOP, zc - 0.03, zc + 0.03); }
    sleepers.count = Math.max(0, Math.min(SLEEPERS, Math.floor((railX + 0.3 - GALLERY[0]) / SLEEPER_STEP)));
    trolley.visible = s.trolley != null;
    if (trolley.visible) trolley.position.set(s.trolley, -DEPTH + RAIL_TOP - 0.0 + s.trolleyY, -0.58);
    setBox(tow, s.tow ? s.tow[0] : 0, s.tow ? s.tow[1] : 0, -DEPTH + 0.2, -DEPTH + 0.225, -0.59, -0.565);
    flames.forEach((g, i) => { const p = s.lamps[i]; g.visible = !!p; if (p) { g.position.set(p[0], -DEPTH + 0.04, CUT_Z + 0.2); g.userData.flame.scale.set(1, 1.8 * (0.35 + 0.65 * s.air), 1); } });
    slump.visible = !!s.slump;
    if (s.slump) { slump.position.set(s.slump.x, -DEPTH, -0.62); slump.scale.set(1.05 * s.slump.k, 1.05 * s.slump.k, 0.9 * s.slump.k); }
    // outside the wire
    dashes.forEach((d, i) => { d.visible = i < s.gap; });
    beam.visible = !!s.search;
    if (s.search) {
      va.set(...s.search.from); vb.set(...s.search.to);
      beam.position.copy(va).add(vb).multiplyScalar(0.5);
      beam.scale.set(1.1, va.distanceTo(vb), 1.1);
      beam.quaternion.setFromUnitVectors(up, va.sub(vb).normalize());
    }
  };
  return { group, update };
}
