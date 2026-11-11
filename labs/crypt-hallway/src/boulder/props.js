// The boulder hallway's traps, shared by the film and the game: buildProps(root, hall) returns
// update(state), fed a plain state object by anim.js propsAt(f) (the film) or game.js (triggers).
// All in Ep2's frame (timeline.js), under the hall's root group.
//   boulders   granite balls, the hall-wide drum, the spiked iron ball (glows when magnetised)
//   gate       the release gate at the ledge lip; tripwire across the hall
//   slime      a spout in the ceiling and the puddle it pours
//   magnet     the electromagnet plate buried in the floor
//   crushers   two iron blocks that drop out of ceiling slots and slam on a gear train
//   pipe       the floor by the doorway curling up into a half-pipe; the blast door
//   cube       the gelatinous cube hanging from the ceiling; levitation auras; drum shards
import * as THREE from "three/webgpu";
import { color, float, mix, uniform, vec3, smoothstep, positionWorld, positionLocal, mx_fractal_noise_float, mx_noise_float, bumpMap, uv, time, sin } from "three/tsl";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { ironMaterial, stoneMaterial, floorMaterial } from "../materials.js";
import { NO_GBUFFER } from "../fx.js";
import {
  Z, HW, EDGE_X, LEDGE_Y, WIRE_X, SLIME_RANGE, SLIME_SPOUT_X, MAGNET_X, PIPE_CENTER, PIPE_R, PIPE_FLAT,
  WALL_END_X, DOOR_H, CEILING_Y, CUBE_CENTER, CUBE_SIZE, CRUSHER_XS, DRUM_LENGTH,
} from "./timeline.js";
import { CRUSHER_W } from "./hall.js";

const Z0 = Z - HW, Z1 = Z + HW;
const lin = (hex) => color(new THREE.Color(hex));
const hash = (i, k) => { const x = Math.sin(i * 51.3 + k * 17.9) * 43758.5453; return x - Math.floor(x); };
const shadows = (o) => o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });

function graniteMaterial({ base = 0xa29d94, alt = 0x6c6861, lichen = true } = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = positionLocal; // rides with the ball as it rolls
  const big = mx_fractal_noise_float(p.mul(1.3), 3, 2.0, 0.5).mul(0.5).add(0.5);
  const grain = mx_fractal_noise_float(p.mul(16), 3, 2.0, 0.5);
  const fleck = smoothstep(0.55, 0.75, mx_noise_float(p.mul(38)));
  const vein = smoothstep(0.02, 0.0, mx_noise_float(p.mul(vec3(0.9, 2.4, 1.1))).abs()).mul(smoothstep(0.4, 0.7, big));
  const rock = mx_fractal_noise_float(p.mul(4.5), 4, 2.0, 0.55);
  const pits = smoothstep(0.78, 0.95, mx_noise_float(p.mul(11)).mul(0.5).add(0.5));
  let c = mix(lin(base), lin(alt), big).mul(grain.mul(0.18).add(1));
  c = mix(c, lin(0xe8e2d6), fleck.mul(0.35));
  c = mix(c, lin(0x3a3631), vein.mul(0.35)).mul(rock.mul(0.2).add(1)).mul(float(1).sub(pits.mul(0.35)));
  if (lichen) c = mix(c, lin(0x6d7a3a), smoothstep(0.62, 0.8, mx_fractal_noise_float(p.mul(2.2).add(5), 3, 2.0, 0.5).mul(0.5).add(0.5)).mul(0.5));
  m.colorNode = c;
  m.roughnessNode = float(0.86).add(grain.mul(0.08));
  m.metalnessNode = float(0);
  m.normalNode = bumpMap(rock.mul(0.6).add(big.mul(0.3)).add(grain.mul(0.12)).sub(pits.mul(0.4)).sub(vein.mul(0.2)), float(0.09));
  return m;
}

// a lumpy ball that still rolls true: radius r on average, chips and bulges of a few cm
function stoneGeo(r, seed) {
  const ico = new THREE.IcosahedronGeometry(r, 6);
  ico.deleteAttribute("uv"); ico.deleteAttribute("normal");
  const g = mergeVertices(ico); // indexed, so the normals come out smooth
  const p = g.attributes.position, ph = [0, 1, 2, 3].map((k) => hash(seed, k) * 6.28);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize();
    const k = 1 + 0.04 * Math.sin(3.1 * v.x + ph[0]) * Math.sin(2.7 * v.y + ph[1]) + 0.025 * Math.sin(6.3 * v.z + ph[2]) + 0.012 * Math.sin(13 * v.x + 11 * v.y + ph[1])
      - 0.07 * Math.max(0, Math.sin(2.2 * v.x + 1.7 * v.z + ph[3]) - 0.7) - 0.05 * Math.max(0, Math.sin(-1.9 * v.y + 2.4 * v.z + ph[0]) - 0.8);
    p.setXYZ(i, v.x * r * k, v.y * r * k, v.z * r * k);
  }
  g.computeVertexNormals();
  return g;
}

// layout: where the wire, slime, magnet and crushers sit (the film's by default; the game has its own)
export function buildProps(root, hall, layout = {}) {
  const L = { wireX: WIRE_X, slime: SLIME_RANGE, spoutX: SLIME_SPOUT_X, magnetX: MAGNET_X, crusherXs: CRUSHER_XS, ...layout };
  const iron = ironMaterial();
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0xc8ccd2, metalness: 0.85, roughness: 0.25 });
  const hazardMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.55 });
  hazardMat.colorNode = mix(lin(0x16171b), lin(0xf2c230), smoothstep(0.48, 0.52, sin(positionWorld.x.add(positionWorld.y).add(positionWorld.z).mul(9)).mul(0.5).add(0.5)));

  // --- boulders: a pool per kind; the state lists { kind, r, position, angle, charge } --------------
  const granite = graniteMaterial();
  const drumStone = graniteMaterial({ base: 0x7c7a78, alt: 0x55524f, lichen: false });
  const ironBall = new THREE.MeshStandardNodeMaterial({ metalness: 0.75 });
  const charge = uniform(0);
  {
    const n = mx_fractal_noise_float(positionLocal.mul(9), 3, 2.0, 0.5).mul(0.5).add(0.5);
    ironBall.colorNode = mix(lin(0x34363a), lin(0x6a3a22), smoothstep(0.5, 0.75, n));
    ironBall.roughnessNode = mix(float(0.35), float(0.85), smoothstep(0.5, 0.75, n));
    ironBall.emissiveNode = lin(0x3fb6ff).mul(charge.mul(0.35)).mul(sin(time.mul(40)).mul(0.25).add(0.75));
  }
  const make = {
    stone: (r, i) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(stoneGeo(r, i + 1), granite));
      return g;
    },
    drum: (r) => { // a dressed granite drum, iron-banded at both ends, rolling on its long axis (z)
      const g = new THREE.Group();
      const L = DRUM_LENGTH;
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L - 0.1, 48, 4).rotateX(Math.PI / 2), drumStone));
      for (const s of [-1, 1]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.22, 48).rotateX(Math.PI / 2), iron);
        band.position.z = s * (L / 2 - 0.16);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.1, r - 0.1, 0.06, 40).rotateX(Math.PI / 2), drumStone);
        cap.position.z = s * (L / 2 - 0.05);
        g.add(band, cap);
        for (let k = 0; k < 10; k++) { // rivets
          const a = (k / 10) * Math.PI * 2;
          const rv = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), iron);
          rv.position.set(Math.cos(a) * (r + 0.04), Math.sin(a) * (r + 0.04), s * (L / 2 - 0.16));
          g.add(rv);
        }
      }
      // carved grooves so the roll reads
      for (let k = 0; k < 6; k++) {
        const groove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, L - 0.5), iron);
        const a = (k / 6) * Math.PI * 2;
        groove.position.set(Math.cos(a) * (r - 0.015), Math.sin(a) * (r - 0.015), 0);
        groove.rotation.z = a;
        g.add(groove);
      }
      return g;
    },
    spiked: (r) => { // iron core, spike tips at r
      const g = new THREE.Group();
      const core = r * 0.7;
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(core, 5), ironBall));
      const n = 34, up = new THREE.Vector3(0, 1, 0);
      const spike = new THREE.ConeGeometry(0.11, r - core + 0.08, 8).translate(0, (r - core + 0.08) / 2 + core - 0.08, 0);
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
        const m = new THREE.Mesh(spike, steel);
        m.quaternion.setFromUnitVectors(up, new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr));
        g.add(m);
      }
      return g;
    },
  };
  const pool = { stone: [], drum: [], spiked: [] };
  const getBall = (kind, r, i) => {
    const key = `${r}`;
    let list = pool[kind].filter((b) => b.key === key);
    while (list.length <= i) {
      const g = make[kind](r, pool[kind].length);
      shadows(g);
      g.visible = false;
      root.add(g);
      const entry = { g, key };
      pool[kind].push(entry);
      list = pool[kind].filter((b) => b.key === key);
    }
    return list[i].g;
  };

  // --- release gate (a portcullis at the ledge lip that sinks into the ledge) -------------------
  const gate = new THREE.Group();
  for (let z = Z0 + 0.12; z < Z1; z += 0.22) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8).translate(0, 1.3, 0), iron);
    bar.position.z = z;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8).translate(0, 2.68, 0), iron);
    tip.position.z = z;
    gate.add(bar, tip);
  }
  for (const y of [0.4, 1.3, 2.3]) gate.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2 * HW).translate(0, y, Z), iron));
  gate.position.set(EDGE_X + 0.08, LEDGE_Y, 0);
  shadows(gate);
  root.add(gate);

  // --- tripwire: a taut steel wire at shin height; cut, its two ends drop to the walls ------------
  const wireMat = new THREE.MeshStandardNodeMaterial({ color: 0xe8e4d8, metalness: 0.9, roughness: 0.2 });
  wireMat.emissiveNode = lin(0x403828);
  const WIRE_Y = 0.26;
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2 * HW, 6).rotateX(Math.PI / 2).translate(0, 0, Z), wireMat);
  wire.position.set(L.wireX, WIRE_Y, 0);
  root.add(wire);
  const halves = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(L.wireX, WIRE_Y, s < 0 ? Z0 : Z1);
    pivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, HW, 6).rotateX(Math.PI / 2).translate(0, 0, -s * HW / 2), wireMat));
    root.add(pivot);
    return { pivot, s };
  });
  for (const zz of [Z0, Z1]) { // eyelets
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), iron);
    eye.position.set(L.wireX, WIRE_Y, zz + (zz === Z0 ? 0.01 : -0.01));
    root.add(eye);
  }

  // --- slime: ceiling spout + glossy puddle ------------------------------------------------------
  const slimeAmt = uniform(0);
  const slimeMat = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false });
  {
    const wp = positionWorld;
    const n = mx_fractal_noise_float(wp.mul(1.4), 3, 2.0, 0.5);
    const d = uv().sub(0.5).mul(vec3(1, 1, 0).xy).length().mul(2); // 0 centre .. 1 edge
    const edge = smoothstep(slimeAmt.mul(1.05), slimeAmt.mul(1.05).sub(0.08), d.add(n.mul(0.18)));
    const bubbles = smoothstep(0.82, 0.9, mx_noise_float(wp.mul(14)).mul(0.5).add(0.5));
    slimeMat.colorNode = mix(lin(0x2e8a1c), lin(0x9cff4a), n.mul(0.5).add(0.5)).add(bubbles.mul(0.3));
    slimeMat.emissiveNode = lin(0x2a7a10).mul(0.55);
    slimeMat.roughnessNode = float(0.06);
    slimeMat.metalnessNode = float(0);
    slimeMat.opacityNode = edge.mul(0.92);
    slimeMat.normalNode = bumpMap(n.mul(0.6).add(bubbles.mul(0.5)), float(0.02));
  }
  const len = L.slime[1] - L.slime[0];
  const puddle = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.6, 2 * HW - 0.1).rotateX(-Math.PI / 2), slimeMat);
  puddle.position.set((L.slime[0] + L.slime[1]) / 2, 0.012, Z);
  puddle.receiveShadow = true;
  root.add(puddle);
  const spout = new THREE.Group();
  {
    const brass = new THREE.MeshStandardNodeMaterial({ color: 0xb08a3a, metalness: 0.7, roughness: 0.35 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 16).translate(0, -0.3, 0), brass);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.12, 16).translate(0, -0.62, 0), brass);
    spout.add(pipe, lip);
    shadows(spout);
  }
  spout.position.set(L.spoutX, CEILING_Y, Z);
  root.add(spout);
  const streamMat = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, roughness: 0.05 });
  streamMat.colorNode = lin(0x6ee83a);
  streamMat.emissiveNode = lin(0x3a9a1a).mul(sin(positionWorld.y.mul(12).add(time.mul(20))).mul(0.2).add(0.8));
  streamMat.opacityNode = float(0.85);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1, 12).translate(0, -0.5, 0), streamMat);
  stream.position.set(L.spoutX, CEILING_Y - 0.66, Z);
  root.add(stream);

  // --- electromagnet: an iron plate with copper windings, flush in the floor ---------------------
  const magnet = new THREE.Group();
  const coilGlow = uniform(0);
  {
    const copper = new THREE.MeshStandardNodeMaterial({ color: 0xc7743e, metalness: 0.6, roughness: 0.3 });
    copper.emissiveNode = lin(0x4fc8ff).mul(coilGlow.mul(3));
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.84, 0.3, 40).translate(0, -0.15, 0), iron);
    magnet.add(plate);
    for (const r of [0.28, 0.44, 0.6, 0.74]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 48).rotateX(Math.PI / 2), copper);
      ring.position.y = 0.005;
      magnet.add(ring);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 20), steel);
    magnet.add(hub);
    for (let k = 0; k < 8; k++) { // bolts
      const a = (k / 8) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), steel);
      b.position.set(Math.cos(a) * 0.79, 0.006, Math.sin(a) * 0.79);
      magnet.add(b);
    }
    shadows(magnet);
  }
  magnet.position.set(L.magnetX, 0, Z);
  root.add(magnet);
  const magnetLight = new THREE.PointLight(0x5fc8ff, 0, 0, 2);
  magnetLight.position.set(L.magnetX, 0.6, Z);
  root.add(magnetLight);

  // --- ceiling crushers ------------------------------------------------------------------------
  const crushers = L.crusherXs.map((x) => {
    const g = new THREE.Group();
    const D = 2 * HW - 0.3, H = 0.9;
    const block = new THREE.Mesh(new RoundedBoxGeometry(CRUSHER_W, H, D, 2, 0.05).translate(0, H / 2, 0), iron);
    const face = new THREE.Mesh(new THREE.BoxGeometry(CRUSHER_W + 0.02, 0.14, D + 0.02).translate(0, 0.07, 0), hazardMat);
    g.add(block, face);
    for (const zz of [-D / 2 + 0.35, D / 2 - 0.35]) { // pistons up into the slot
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 14).translate(0, H + 1.5, 0), steel);
      rod.position.z = zz;
      g.add(rod);
    }
    for (let k = 0; k < 4; k++) { // studs on the face
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 6).rotateX(Math.PI), steel);
      s.position.set(((k % 2) - 0.5) * 0.5, -0.05, (Math.floor(k / 2) - 0.5) * 1.2);
      g.add(s);
    }
    g.position.set(x, CEILING_Y + 1.5, Z);
    shadows(g);
    root.add(g);
    // a gear on the wall beside each slot (spins while the train is wound)
    const gear = new THREE.Group();
    const gearMat = new THREE.MeshStandardNodeMaterial({ color: 0xb98d3c, metalness: 0.75, roughness: 0.35 });
    gear.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 32).rotateX(Math.PI / 2), gearMat));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), gearMat);
      t.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0);
      t.rotation.z = a;
      gear.add(t);
    }
    gear.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12).rotateX(Math.PI / 2), steel));
    gear.position.set(x, CEILING_Y - 0.65, Z1 - 0.08);
    shadows(gear);
    gear.visible = false;
    root.add(gear);
    return { g, gear };
  });

  // --- half-pipe: the floor slabs between the doorway and PIPE_CENTER curl up into a quarter pipe --
  const SLATS = 16, slatLen = (PIPE_FLAT[1] - PIPE_FLAT[0]) / SLATS;
  const slabMat = floorMaterial();
  const slats = Array.from({ length: SLATS }, (_, j) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(slatLen + 0.012, 0.22, 2 * HW).translate(-slatLen / 2, -0.11, Z), slabMat);
    // the flagstone pattern runs on unbroken when the floor is flat
    const p = m.geometry.attributes.position, uvA = m.geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) uvA.setXY(i, PIPE_CENTER[0] - j * slatLen + p.getX(i), -p.getZ(i));
    m.castShadow = m.receiveShadow = true;
    pivot.add(m);
    if (j % 4 === 3) { // iron hinge straps across every fourth joint
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 2 * HW - 0.2).translate(-slatLen, 0.012, Z), iron);
      pivot.add(strap);
    }
    root.add(pivot);
    return pivot;
  });
  const slatPose = (k) => { // arc-length chain from the hinge at PIPE_CENTER x towards the doorway
    const kap = k / PIPE_R;
    return slats.map((_, j) => {
      const s = j * slatLen;
      if (kap < 1e-4) return { x: PIPE_CENTER[0] - s, y: 0, a: 0 };
      return { x: PIPE_CENTER[0] - Math.sin(kap * s) / kap, y: (1 - Math.cos(kap * s)) / kap, a: kap * (s + slatLen / 2) };
    });
  };

  // --- blast door ------------------------------------------------------------------------------
  const door = new THREE.Group();
  {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, DOOR_H, 2 * HW + 0.3).translate(0, DOOR_H / 2, Z), new THREE.MeshStandardNodeMaterial({ color: 0x8a909a, metalness: 0.8, roughness: 0.38 }));
    door.add(plate);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 2 * HW + 0.3).translate(0.07, 0.3, Z), hazardMat);
    door.add(band);
    for (let i = 0; i < 4; i++) { // ribs
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 2 * HW + 0.3).translate(0.08, 0.9 + i * 0.7, Z), iron);
      door.add(rib);
    }
    for (const zz of [Z0 + 0.4, Z1 - 0.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, DOOR_H - 0.2, 0.14).translate(0.08, DOOR_H / 2, zz), iron);
      door.add(post);
    }
    shadows(door);
  }
  door.position.set(WALL_END_X - 0.08, DOOR_H + 0.1, 0);
  root.add(door);
  const lampMat = new THREE.MeshBasicNodeMaterial();
  const lampOn = uniform(0);
  lampMat.colorNode = mix(lin(0x3a0a06), lin(0xff3a1a).mul(6), lampOn);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), lampMat);
  lamp.position.set(WALL_END_X + 0.14, DOOR_H + 0.35, Z);
  root.add(lamp);
  const lampLight = new THREE.PointLight(0xff4020, 0, 0, 2);
  lampLight.position.set(WALL_END_X + 0.6, DOOR_H + 0.3, Z);
  root.add(lampLight);

  // --- gelatinous cube -------------------------------------------------------------------------
  const cube = new THREE.Group();
  const jelly = new THREE.MeshPhysicalNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  {
    const n = mx_fractal_noise_float(positionWorld.mul(1.8).add(vec3(0, time.mul(0.15), 0)), 3, 2.0, 0.5).mul(0.5).add(0.5);
    jelly.colorNode = mix(lin(0x3fbf6a), lin(0x9fffc0), n);
    jelly.emissiveNode = lin(0x1a7a40).mul(n.mul(0.25).add(0.15));
    jelly.roughnessNode = float(0.06);
    jelly.metalnessNode = float(0);
    jelly.opacityNode = float(0.3);
    jelly.mrtNode = NO_GBUFFER();
  }
  const [CW, CH, CD] = CUBE_SIZE;
  const blob = new THREE.Mesh(new RoundedBoxGeometry(CW, CH, CD, 4, 0.35), jelly);
  cube.add(blob);
  // the hoard it has digested: coins, a sword, a helmet
  const gold = new THREE.MeshStandardNodeMaterial({ color: 0xffc23a, metalness: 0.6, roughness: 0.3 });
  gold.emissiveNode = lin(0x3a2400);
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 14), gold);
    c.position.set((hash(i, 1) - 0.5) * CW * 0.75, (hash(i, 2) - 0.5) * CH * 0.7, (hash(i, 3) - 0.5) * CD * 0.7);
    c.rotation.set(hash(i, 4) * 3, hash(i, 5) * 3, 0);
    cube.add(c);
  }
  {
    const sword = new THREE.Group();
    sword.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.015), steel));
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05).translate(0, -0.47, 0), gold);
    sword.add(hilt);
    sword.position.set(0.9, -0.3, -0.5);
    sword.rotation.set(0.4, 0.3, 1.1);
    cube.add(sword);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), steel);
    helm.position.set(-1.0, 0.6, 0.6);
    helm.rotation.set(0.6, 0, 0.9);
    cube.add(helm);
  }
  const cubeLight = new THREE.PointLight(0x7dffa6, 0, 0, 2);
  cubeLight.position.set(0, -CH / 2 - 0.4, 0);
  cube.add(cubeLight);
  cube.position.set(...CUBE_CENTER);
  root.add(cube);

  // --- levitation: a rune ring under each floater and a cold glow ----------------------------------
  const auraOn = uniform(0);
  const ringMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  ringMat.colorNode = lin(0x7de9ff).mul(4).mul(auraOn).mul(sin(time.mul(6)).mul(0.2).add(0.8));
  ringMat.mrtNode = NO_GBUFFER();
  const auras = [0, 1, 2].map(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 40).rotateX(-Math.PI / 2), ringMat));
    g.add(new THREE.Mesh(new THREE.RingGeometry(0.6, 0.63, 40).rotateX(-Math.PI / 2), ringMat));
    const l = new THREE.PointLight(0x7de9ff, 0, 0, 2);
    l.position.y = 0.9;
    g.add(l);
    g.visible = false;
    root.add(g);
    return { g, l };
  });

  // --- drum shards: the hall-wide drum breaking up under the warhammer ---------------------------
  const NS = 26;
  const shardGeo = new THREE.IcosahedronGeometry(1, 0);
  const shards = new THREE.InstancedMesh(shardGeo, drumStone, NS);
  shards.castShadow = true;
  shards.frustumCulled = false;
  root.add(shards);
  const sd = new THREE.Object3D();

  // --- update ----------------------------------------------------------------------------------
  return (p) => {
    const f = p.clock;
    // boulders
    for (const kind of Object.keys(pool)) for (const b of pool[kind]) b.g.visible = false;
    const used = {};
    for (const b of p.boulders ?? []) {
      const k = `${b.kind}${b.r}`;
      used[k] = (used[k] ?? -1) + 1;
      const g = getBall(b.kind, b.r, used[k]);
      g.visible = true;
      g.position.set(...b.position);
      g.rotation.set(0, 0, b.angle);
    }
    charge.value = p.charge ?? 0;
    // gate: open = sunk into the ledge
    gate.position.y = LEDGE_Y - 2.75 * (p.gate ?? 0);
    gate.visible = (p.gate ?? 0) < 0.999;
    // wire
    const ws = p.wire ?? { set: false };
    wire.visible = ws.set && !(ws.cutAge >= 0);
    wire.scale.z = 1;
    for (const { pivot, s } of halves) {
      pivot.visible = ws.set && ws.cutAge >= 0 && ws.cutAge < 200;
      const t = Math.min(1, (ws.cutAge ?? 0) / 8);
      pivot.rotation.x = s * (Math.PI / 2) * t * t + (t >= 1 ? s * 0.08 * Math.sin((ws.cutAge - 8) * 0.6) * Math.exp(-(ws.cutAge - 8) / 10) : 0);
    }
    // slime
    slimeAmt.value = p.slime ?? 0;
    puddle.visible = (p.slime ?? 0) > 0.001;
    const pour = p.pour ?? 0;
    stream.visible = pour > 0.01;
    stream.scale.set(pour, (CEILING_Y - 0.66) * Math.min(1, pour * 3), pour);
    spout.position.y = CEILING_Y + 0.7 * (1 - Math.min(1, p.spout ?? 0));
    spout.visible = (p.spout ?? 0) > 0.001;
    // magnet
    magnet.position.y = -0.32 * (1 - (p.magnet ?? 0));
    magnet.visible = (p.magnet ?? 0) > 0.001;
    coilGlow.value = p.coil ?? 0;
    magnetLight.intensity = 6 * (p.coil ?? 0) * (0.8 + 0.2 * Math.sin(f * 1.7));
    // crushers
    crushers.forEach(({ g, gear }, i) => {
      const y = p.crusherY?.[i];
      g.visible = y != null;
      if (y != null) g.position.y = y;
      gear.visible = y != null;
      gear.rotation.z = (p.gears ?? 0) * (i % 2 ? -1 : 1);
    });
    // half-pipe
    slatPose(p.pipe ?? 0).forEach((s, j) => {
      slats[j].position.set(s.x, s.y, 0);
      slats[j].rotation.z = -s.a;
    });
    // blast door
    door.position.y = (DOOR_H + 0.1) * (1 - (p.door ?? 0));
    lampOn.value = p.doorLamp ?? 0;
    lampLight.intensity = 6 * (p.doorLamp ?? 0);
    // cube
    const cs = p.cube ?? 0;
    cube.visible = cs > 0.001;
    const wob = p.cubeWobble ?? 0;
    cube.scale.set(cs * (1 + wob), cs * (1 - wob), cs * (1 + wob * 0.6));
    cube.position.y = CUBE_CENTER[1] + (1 - cs) * 1.2 + (CUBE_SIZE[1] / 2) * (1 - cs);
    cubeLight.intensity = 1.4 * cs;
    // levitation
    auraOn.value = Math.max(0, ...(p.auras ?? []).map((a) => a.on));
    auras.forEach((a, i) => {
      const s = p.auras?.[i];
      a.g.visible = !!s && s.on > 0.01;
      if (!a.g.visible) return;
      a.g.position.set(...s.position);
      a.g.rotation.y = f * 0.05;
      a.l.intensity = 4 * s.on;
    });
    // drum shards
    const sh = p.shards;
    shards.visible = !!sh;
    if (sh) {
      const t = sh.age / 30;
      for (let i = 0; i < NS; i++) {
        const a = hash(i, 1) * Math.PI * 2, up = 2 + hash(i, 2) * 4, out = 1 + hash(i, 3) * 3;
        const v = [Math.cos(a) * out * 0.6 + 1.5, up, Math.sin(a) * out]; // flung back up the hall, away from the hammer
        let y = sh.position[1] + (hash(i, 4) - 0.5) * 1.6 + v[1] * t - 4.9 * t * t;
        const size = 0.12 + hash(i, 5) * 0.28;
        y = Math.max(size * 0.5, y);
        const x = sh.position[0] + v[0] * Math.min(t, 1.2), z = Math.min(Z1 - size, Math.max(Z0 + size, sh.position[2] + (hash(i, 6) - 0.5) * 2.6 + v[2] * Math.min(t, 0.5) * 0.4));
        sd.position.set(x, y, z);
        sd.rotation.set(hash(i, 7) * 6 + t * 6, hash(i, 8) * 6, t * 3);
        sd.scale.set(size, size * 0.8, size * 1.1);
        sd.updateMatrix();
        shards.setMatrixAt(i, sd.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
    }
  };
}
