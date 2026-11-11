// The crushing room's hallway: a long ashlar corridor (z) with a sunlit doorway at the +z end, oak
// beams, torches near the door and a dark run behind the room. The room itself (props.js) is a box
// that sits at the -z end and rides down this hallway in the finale. Lab world, no root transform.
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bakeUV, clean } from "../geo.js";
import { stoneMaterial, floorMaterial, woodMaterial, ironMaterial, flameMaterial, rubbleMaterial } from "../materials.js";
import { CORR_HW, CORR_H, DOOR_Z, CORR_BACK } from "./timeline.js";

const T = 0.5;
export const DOOR_HW = 1.35, DOOR_H = 3.3;
// torches only where the room box never rides (it reaches z ≈ 5.6 in the finale)
export const TORCH_ZS = [6.4, 8.1];
const TORCH_Y = 2.3;

export function bx(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return bakeUV(g);
}

export function makeTorch(root, { x, y, z, out, seed, intensity = 4.5, iron, wood }) {
  // out: [dx, dz], the unit direction into the hall from the wall
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = Math.atan2(out[0], out[1]);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.24).translate(0, 0, 0.12), iron);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.5, 8), wood);
  stick.position.set(0, 0.12, 0.26);
  stick.rotation.x = 0.18;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.1, 10, 1, true), iron);
  cup.position.set(0, 0.38, 0.3);
  cup.rotation.x = 0.18;
  for (const m of [arm, stick, cup]) { m.receiveShadow = true; grp.add(m); }
  const flame = new THREE.Sprite(flameMaterial(seed));
  flame.center.set(0.5, 0.08);
  flame.scale.set(0.2, 0.42, 1);
  flame.position.set(0, 0.42, 0.31);
  grp.add(flame);
  const light = new THREE.PointLight(0xffa25a, intensity, 0, 2);
  light.position.set(0, 0.6, 0.5);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.camera.near = 0.08;
  light.shadow.camera.far = 14;
  light.shadow.bias = -0.003;
  light.shadow.radius = 3;
  grp.add(light);
  root.add(grp);
  return { light, base: intensity, seed: seed * 3.1 + 0.7, grp };
}

export function buildHall(root) {
  const wallMat = stoneMaterial({ w: 0.62, h: 0.31, base: 0xb3aa9a, alt: 0x837a6d, seed: 21 });
  const ceilMat = stoneMaterial({ w: 1.2, h: 0.6, base: 0x958d80, alt: 0x6f685d, seed: 25, grime: 1.2 });
  const floorMat = floorMaterial();
  const iron = ironMaterial(), wood = woodMaterial();
  const X0 = -CORR_HW, X1 = CORR_HW;

  const walls = [], ceil = [], beams = [], corbels = [];
  for (const [a, b] of [[X0 - T, X0], [X1, X1 + T]]) walls.push(bx(a, b, -0.3, CORR_H + 0.4, CORR_BACK, DOOR_Z));
  walls.push(bx(X0 - T, X1 + T, -0.3, CORR_H + 0.4, CORR_BACK - T, CORR_BACK));
  // the doorway wall at +z: an opening into the daylight
  walls.push(bx(X0 - T, -DOOR_HW, -0.3, CORR_H + 0.4, DOOR_Z, DOOR_Z + 0.6));
  walls.push(bx(DOOR_HW, X1 + T, -0.3, CORR_H + 0.4, DOOR_Z, DOOR_Z + 0.6));
  walls.push(bx(-DOOR_HW, DOOR_HW, DOOR_H, CORR_H + 0.4, DOOR_Z, DOOR_Z + 0.6));
  ceil.push(bx(X0, X1, CORR_H, CORR_H + 0.4, CORR_BACK, DOOR_Z));
  for (let z = CORR_BACK + 1.2; z < DOOR_Z - 0.4; z += 2.4) {
    beams.push(bx(X0, X1, CORR_H - 0.32, CORR_H, z - 0.15, z + 0.15));
    for (const [a, b] of [[X0, X0 + 0.22], [X1 - 0.22, X1]]) corbels.push(bx(a, b, CORR_H - 0.6, CORR_H - 0.32, z - 0.21, z + 0.21));
  }
  const add = (geos, mat) => {
    const m = new THREE.Mesh(mergeGeometries(geos.map(clean)), mat);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  add(walls, wallMat);
  add(ceil, ceilMat);
  add(beams, wood);
  add(corbels, wallMat);
  // the hallway floor sits 1.2 cm under the room's own floor plate, so the plate can ride over it
  add([bx(X0 - 0.05, X1 + 0.05, -0.3, -0.012, CORR_BACK, DOOR_Z + 0.6)], floorMat);
  // a lintel beam and a worn threshold at the doorway
  add([bx(-DOOR_HW - 0.15, DOOR_HW + 0.15, DOOR_H - 0.28, DOOR_H, DOOR_Z - 0.06, DOOR_Z + 0.66)], wood);

  // outside: a sunlit yard and a cliff, seen through the doorway behind the newcomers
  {
    const yard = new THREE.Mesh(bakeUV(new THREE.BoxGeometry(30, 6, 26).translate(0, -3.012, DOOR_Z + 0.6 + 13)), stoneMaterial({ w: 0.9, h: 0.45, base: 0xb8ab92, alt: 0x8c806a, seed: 12 }));
    yard.receiveShadow = true;
    root.add(yard);
    const cliff = new THREE.Mesh(bakeUV(new THREE.BoxGeometry(60, 40, 2).translate(0, 4, DOOR_Z + 24)), stoneMaterial({ w: 3.5, h: 1.6, base: 0xc8b896, alt: 0x9c8c70, seed: 9, bump: 0.08, grime: 0.4 }));
    cliff.receiveShadow = true;
    root.add(cliff);
  }

  const torches = [];
  TORCH_ZS.forEach((z, i) => {
    const side = i % 2 ? 1 : -1;
    torches.push(makeTorch(root, { x: side * CORR_HW, y: TORCH_Y, z, out: [-side, 0], seed: i * 2.3 + 1, iron, wood }));
  });

  // grit along the wall feet
  {
    let seed = 777;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 300, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), rubbleMaterial(), n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const z = CORR_BACK + 0.3 + r() * (DOOR_Z - CORR_BACK - 0.6);
      const side = r() < 0.5 ? -1 : 1;
      const off = Math.pow(r(), 2.2) * 0.3;
      const s = 0.015 + Math.pow(r(), 3) * 0.08 * (1 - off);
      d.position.set(side * (CORR_HW - 0.03 - off), s * 0.35 - 0.012, z);
      d.rotation.set(r() * 3, r() * 3, r() * 3);
      d.scale.set(s, s * 0.55, s * (0.7 + r() * 0.6));
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    }
    im.castShadow = im.receiveShadow = true;
    root.add(im);
  }
  return { torches, iron, wood };
}
