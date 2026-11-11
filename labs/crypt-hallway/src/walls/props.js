// The crushing room and everything that moves in it. buildProps(root, hall) returns update(state),
// fed by anim.js propsAt(f). The room is one group (it rides down the hall in the finale); inside it,
// all positions are room-relative (timeline.js).
//   room       floor plate of pressure tiles, back wall + alcove, pockets, ceiling with the vent, the
//              front frame (the proscenium the camera looks through), torches on the frame
//   walls      two stone slabs; greased steel plates unroll down them (L2), copper bus bars and arcs
//              when electrified (L3), magic mirrors pop on (L4)
//   presses    hydraulic rams that slide out of the frame pillars and telescope after the walls (L3)
//   pedestal   sinks while a trap runs; the coin (on it, or in a hand)
//   boot       a spring-loaded boot in the vent (L2)
//   lance      the paladin's jousting lance, snapping in the press; the cube he becomes (L3)
//   orb        the mage's bouncing spell (L4)
//   finale     rails rise along the hall, bogies drop, the launch plate fires; the pole
//   lair       the Mimic on its gold, at the top of the chute (a separate set, reached by a cut)
import * as THREE from "three/webgpu";
import {
  color, float, mix, uniform, vec3, vec2, smoothstep, positionWorld, positionLocal, mx_fractal_noise_float, mx_noise_float,
  bumpMap, uv, sin, abs, fract, max, clamp, normalWorld, atan,
} from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { bakeUV, clean } from "../geo.js";
import { stoneMaterial, floorMaterial, ironMaterial, woodMaterial, rubbleMaterial } from "../materials.js";
import { NO_GBUFFER } from "../fx.js";
import { bx, makeTorch } from "./hall.js";
import {
  HW, WALL_T, WALL_Z, WALL_BOTTOM, ROOM_H, FRONT_Z, FRAME_T, BOX_HW, BOX_TOP, BACK_Z, CORR_HW, CORR_H, CORR_BACK, DOOR_Z,
  PED, VENT, CUBE_SIZE, ORB_R, MIMIC_ROOM, MIMIC_AT, CHUTE_EXIT,
} from "./timeline.js";

const lin = (hex) => color(new THREE.Color(hex));
const shadows = (o) => o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
const merged = (geos, mat) => {
  const m = new THREE.Mesh(mergeGeometries(geos.map(clean)), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
};
export const RAIL_X = 2.53;
export const MIRRORS = [ // [side, z0, z1] in pop order
  [-1, -1.7, 0.6], [1, -1.7, 0.6], [-1, -3.25, -1.78], [1, -3.25, -1.78],
];
const PLATES = [[WALL_Z[0] + 0.04, -1.62], [-1.6, WALL_Z[1] - 0.04]];

// brushed steel plate: rivets in rows, grease that oozes down (L2) and arcs that crawl (L3)
function plateMaterial(u) {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = uv(); // metres on the face (u = -z, v = y)
  const wp = positionWorld;
  const brush = mx_fractal_noise_float(vec3(p.x.mul(0.6), p.y.mul(40), 0), 2, 2, 0.5).mul(0.5).add(0.5);
  const mottle = mx_fractal_noise_float(wp.mul(1.6), 3, 2, 0.5).mul(0.5).add(0.5);
  const cell = fract(vec2(p.x.mul(1 / 0.42), p.y.mul(1 / 0.42))).sub(0.5);
  const rivet = smoothstep(0.075, 0.05, cell.length());
  const edge = smoothstep(0.06, 0.0, min2(fract(p.y.mul(1 / 1.08)), fract(p.y.mul(1 / 1.08)).oneMinus())); // seams every 1.08 m
  let c = mix(lin(0x6c7178), lin(0x9aa0a8), brush.mul(0.6).add(mottle.mul(0.4)));
  c = mix(c, lin(0x3c3a36), mottle.mul(0.25));
  c = mix(c, lin(0xb8bdc4), rivet.mul(0.6));
  c = mix(c, lin(0x2a2a2a), edge.mul(0.7));
  // grease: runs down from the top, darker and glossy, thicker in streaks
  const run = mx_fractal_noise_float(vec3(p.x.mul(3.5), p.y.mul(0.35).add(u.clock.mul(0.004)), 1.3), 3, 2, 0.5).mul(0.5).add(0.5);
  const reach = u.grease.mul(ROOM_H + 0.6);
  const top = float(ROOM_H).sub(reach);
  const coat = smoothstep(0.38, 0.55, run).mul(smoothstep(top.sub(0.4), top, p.y)).max(u.grease.mul(0.35));
  const drip = smoothstep(0.62, 0.7, mx_noise_float(vec3(p.x.mul(9), p.y.mul(0.6).add(u.clock.mul(0.01)), 2.2)).mul(0.5).add(0.5)).mul(u.grease);
  c = mix(c, c.mul(lin(0xc89a50)).mul(0.8), coat.mul(0.55));
  c = mix(c, lin(0x7a5418), drip.mul(0.5));
  // arcs: thin bright filaments wandering over the steel
  const n1 = mx_noise_float(vec3(p.x.mul(2.2), p.y.mul(2.2), u.clock.mul(0.35)));
  const n2 = mx_noise_float(vec3(p.x.mul(5.0).add(3.1), p.y.mul(5.0), u.clock.mul(0.6)));
  const arcs = smoothstep(0.045, 0.0, abs(n1)).mul(0.8).add(smoothstep(0.025, 0.0, abs(n2)).mul(0.6));
  m.colorNode = c;
  m.roughnessNode = mix(mix(float(0.34), float(0.5), mottle), float(0.06), coat.max(drip));
  m.metalnessNode = mix(float(0.85), float(0.55), coat);
  m.emissiveNode = lin(0x5fc8ff).mul(arcs.mul(u.volts).mul(14)).add(lin(0x2a6cff).mul(u.volts.mul(0.18)));
  m.normalNode = bumpMap(rivet.mul(0.6).add(brush.mul(0.04)).sub(edge.mul(0.3)).add(coat.mul(run).mul(0.15)), float(0.012));
  return m;
}
const min2 = (a, b) => a.min(b);

export function buildProps(root, hall) {
  const iron = ironMaterial(), wood = woodMaterial();
  const clock = uniform(0), grease = uniform(0), volts = uniform(0);
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0xb8bcc2, metalness: 0.9, roughness: 0.22 });
  const darkSteel = new THREE.MeshStandardNodeMaterial({ color: 0x3a3d42, metalness: 0.8, roughness: 0.4 });
  const copper = new THREE.MeshStandardNodeMaterial({ metalness: 0.9, roughness: 0.3 });
  copper.colorNode = lin(0xc06a3a);
  copper.emissiveNode = lin(0x6fd0ff).mul(volts.mul(3));
  const gold = new THREE.MeshStandardNodeMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.22 });
  gold.emissiveNode = lin(0x5a3a00).mul(0.6);
  const coinGold = new THREE.MeshStandardNodeMaterial({ color: 0xffb81c, metalness: 0.85, roughness: 0.25 });
  const coinGlint = uniform(0);
  coinGold.emissiveNode = lin(0xff8a00).mul(coinGlint.mul(1.6).add(0.45));
  const hazard = new THREE.MeshStandardNodeMaterial({ roughness: 0.55 });
  hazard.colorNode = mix(lin(0x16171b), lin(0xf2c230), smoothstep(0.48, 0.52, sin(positionWorld.x.add(positionWorld.y).mul(7)).mul(0.5).add(0.5)));
  const torches = [...hall.torches];

  // --- the room box ---------------------------------------------------------------------------------
  const room = new THREE.Group();
  root.add(room);
  {
    const tileMat = stoneMaterial({ w: 0.6, h: 0.6, base: 0x8a8073, alt: 0x5f574d, seed: 31, jitterRows: false, irregular: 0, tilt: 0.05, mortar: 0.02, grime: 0.7 });
    const frameMat = stoneMaterial({ w: 0.9, h: 0.45, base: 0x9a8f80, alt: 0x6c6358, seed: 33, bump: 0.05 });
    const shellMat = stoneMaterial({ w: 0.62, h: 0.31, base: 0xa89f90, alt: 0x7a7266, seed: 35 });
    const ceilMat = stoneMaterial({ w: 1.2, h: 0.6, base: 0x8a8276, alt: 0x655e54, seed: 37, grime: 1.3 });
    room.add(merged([bx(-BOX_HW, BOX_HW, -0.3, 0, BACK_Z - 0.4, FRONT_Z + FRAME_T)], tileMat));
    const shell = [
      bx(-BOX_HW, BOX_HW, 0, BOX_TOP, BACK_Z - 0.4, BACK_Z),
      bx(-BOX_HW, -HW, 0, ROOM_H, BACK_Z, WALL_Z[0]), bx(HW, BOX_HW, 0, ROOM_H, BACK_Z, WALL_Z[0]),
      bx(-BOX_HW, -BOX_HW + 0.06, 0, BOX_TOP, WALL_Z[0], FRONT_Z), bx(BOX_HW - 0.06, BOX_HW, 0, BOX_TOP, WALL_Z[0], FRONT_Z),
      // the vent shaft, up through the roof
      ...[-1, 1].map((s) => bx(s * VENT.half - (s > 0 ? 0 : 0.08), s * VENT.half + (s > 0 ? 0.08 : 0), ROOM_H, CORR_H - 0.12, VENT.z - VENT.half - 0.08, VENT.z + VENT.half + 0.08)),
      ...[-1, 1].map((s) => bx(-VENT.half, VENT.half, ROOM_H, CORR_H - 0.12, VENT.z + s * VENT.half - (s > 0 ? 0 : 0.08), VENT.z + s * VENT.half + (s > 0 ? 0.08 : 0))),
    ];
    room.add(merged(shell, shellMat));
    room.add(merged([
      bx(-BOX_HW, BOX_HW, ROOM_H, BOX_TOP, BACK_Z, VENT.z - VENT.half),
      bx(-BOX_HW, BOX_HW, ROOM_H, BOX_TOP, VENT.z + VENT.half, FRONT_Z),
      bx(-BOX_HW, -VENT.half, ROOM_H, BOX_TOP, VENT.z - VENT.half, VENT.z + VENT.half),
      bx(VENT.half, BOX_HW, ROOM_H, BOX_TOP, VENT.z - VENT.half, VENT.z + VENT.half),
    ], ceilMat));
    // the front frame and its iron trim; hazard paint on the lintel
    const fz = FRONT_Z, fz1 = FRONT_Z + FRAME_T;
    room.add(merged([bx(-BOX_HW, -HW, 0, BOX_TOP, fz, fz1), bx(HW, BOX_HW, 0, BOX_TOP, fz, fz1), bx(-HW, HW, ROOM_H, BOX_TOP, fz, fz1)], frameMat));
    room.add(merged([
      bx(-HW - 0.1, -HW, 0, ROOM_H + 0.1, fz1, fz1 + 0.04), bx(HW, HW + 0.1, 0, ROOM_H + 0.1, fz1, fz1 + 0.04),
      bx(-HW - 0.1, HW + 0.1, ROOM_H, ROOM_H + 0.1, fz1, fz1 + 0.04),
    ], iron));
    room.add(merged([bx(-HW, HW, ROOM_H + 0.14, ROOM_H + 0.42, fz1, fz1 + 0.02)], hazard));
    // a brass strip on the threshold
    room.add(merged([bx(-HW, HW, -0.01, 0.012, fz + 0.02, fz + 0.1)], gold));
    // grit in the alcove corners
    {
      let seed = 99;
      const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const n = 70, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), rubbleMaterial(), n);
      const d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const s = 0.015 + Math.pow(r(), 3) * 0.07;
        d.position.set((r() < 0.5 ? -1 : 1) * (HW - 0.05 - Math.pow(r(), 2) * 0.3), s * 0.3, BACK_Z + 0.05 + r() * 0.8);
        d.rotation.set(r() * 3, r() * 3, r() * 3);
        d.scale.set(s, s * 0.55, s);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      }
      room.add(im);
    }
    // torches on the frame, either side of the opening; lanterns in the alcove behind the walls
    for (const s of [-1, 1]) torches.push(makeTorch(room, { x: s * 2.12, y: 2.15, z: fz1, out: [0, 1], seed: 7 + s, iron, wood, intensity: 4 }));
    for (const s of [-1, 1]) torches.push(makeTorch(room, { x: s * 1.15, y: 2.4, z: BACK_Z, out: [0, 1], seed: 11 + s, iron, wood, intensity: 3.2 }));
    for (const z of [-0.2, -2.7]) {
      const fill = new THREE.PointLight(0xffc890, 5, 6, 2);
      fill.position.set(0, ROOM_H - 0.25, z);
      room.add(fill);
    }
    // daylight down the vent: a cold shaft onto the pedestal
    const sky = new THREE.SpotLight(0xd8e6ff, 18, 9, 0.42, 0.6, 2);
    sky.position.set(0, CORR_H - 0.2, VENT.z);
    sky.target.position.set(0, 0, PED.z + 0.2);
    room.add(sky, sky.target);
    const skyGlow = new THREE.Mesh(new THREE.PlaneGeometry(2 * VENT.half, 2 * VENT.half).rotateX(Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xdde8ff).multiplyScalar(3) }));
    skyGlow.position.set(0, CORR_H - 0.13, VENT.z);
    room.add(skyGlow);
  }

  // --- the walls ------------------------------------------------------------------------------------
  const u = { clock, grease, volts };
  const plateMat = plateMaterial(u);
  const slabMat = stoneMaterial({ w: 0.95, h: 0.48, base: 0xa39a8b, alt: 0x766d61, seed: 41, bump: 0.06 });
  const mirrorMat = new THREE.MeshStandardNodeMaterial({ color: 0xdfe4ff, metalness: 1, roughness: 0.1 });
  mirrorMat.emissiveNode = lin(0x8a6cff).mul(sin(positionWorld.y.mul(3).add(positionWorld.z.mul(2)).add(clock.mul(0.08))).mul(0.06).add(0.14));
  const runeMat = new THREE.MeshStandardNodeMaterial({ color: 0x2a1840, roughness: 0.4 });
  runeMat.emissiveNode = lin(0xb46bff).mul(sin(positionWorld.y.mul(9).add(clock.mul(0.15))).mul(0.3).add(0.9)).mul(2.2);
  const slabs = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const L = WALL_Z[1] - WALL_Z[0];
    const h0 = WALL_BOTTOM, h1 = ROOM_H - 0.01;
    g.add(merged([bx(-WALL_T / 2, WALL_T / 2, h0, h1, WALL_Z[0], WALL_Z[1])], slabMat));
    // hazard paint on the front edge: the moving edge reads against the frame, and against the other wall
    g.add(merged([bx(-WALL_T / 2, WALL_T / 2, h0, h1, WALL_Z[1] - 0.04, WALL_Z[1] + 0.02)], hazard));
    g.add(merged([bx(-WALL_T / 2 - 0.004, WALL_T / 2 + 0.004, h0, h1, WALL_Z[1] - 0.22, WALL_Z[1] - 0.04)], darkSteel));
    const face = -s * WALL_T / 2; // the inner face, local x
    // steel plates: unroll down from the ceiling (scale y from the top)
    const plates = PLATES.map(([z0, z1]) => {
      const pg = new THREE.Group();
      pg.position.set(face - s * 0.025, h1, 0);
      const m = new THREE.Mesh(bakeUV(new THREE.BoxGeometry(0.05, h1 - h0 - 0.02, z1 - z0).translate(0, -(h1 - h0 - 0.02) / 2, (z0 + z1) / 2)), plateMat);
      m.castShadow = m.receiveShadow = true;
      pg.add(m);
      pg.scale.y = 0.0001;
      pg.visible = false;
      g.add(pg);
      return pg;
    });
    // copper bus bars on the front edge of the plates
    const bus = merged([bx(face - s * 0.07, face - s * 0.03, h0 + 0.1, h1 - 0.1, WALL_Z[1] - 0.16, WALL_Z[1] - 0.08)], copper);
    bus.visible = false;
    g.add(bus);
    // mirrors: a gold frame, the glass, a strip of runes
    const mirrors = MIRRORS.map((m, i) => (m[0] === s ? i : -1)).filter((i) => i >= 0).map((i) => {
      const [, z0, z1] = MIRRORS[i];
      const mg = new THREE.Group();
      mg.position.set(face - s * 0.06, 1.7, (z0 + z1) / 2);
      const w = z1 - z0, h = 2.7;
      mg.add(merged([bx(-0.03, 0.03, -h / 2, h / 2, -w / 2 + 0.08, w / 2 - 0.08)], mirrorMat));
      mg.add(merged([
        bx(-0.05, 0.05, h / 2 - 0.08, h / 2, -w / 2, w / 2), bx(-0.05, 0.05, -h / 2, -h / 2 + 0.08, -w / 2, w / 2),
        bx(-0.05, 0.05, -h / 2, h / 2, -w / 2, -w / 2 + 0.08), bx(-0.05, 0.05, -h / 2, h / 2, w / 2 - 0.08, w / 2),
      ], gold));
      mg.add(merged([bx(-0.055, 0.055, h / 2 - 0.2, h / 2 - 0.12, -w / 2 + 0.12, w / 2 - 0.12)], runeMat));
      mg.scale.setScalar(0.0001);
      mg.visible = false;
      g.add(mg);
      return { mg, i };
    });
    const glow = new THREE.PointLight(0x7fc8ff, 0, 4, 2);
    glow.position.set(face - s * 0.4, 1.6, -1.3);
    g.add(glow);
    shadows(g);
    room.add(g);
    return { g, s, plates, bus, mirrors, glow };
  });

  // --- hydraulic presses: barrels slide out of the frame pillars; rods telescope after the walls -----
  const PRESS_Y = 2.95, PRESS_Z = FRONT_Z + FRAME_T + 0.26;
  const presses = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const barrel = new THREE.Group();
    barrel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 28).rotateZ(Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0xc23a22, metalness: 0.5, roughness: 0.35 })));
    for (const dx of [-0.28, 0.28]) barrel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.07, 28).rotateZ(Math.PI / 2).translate(dx, 0, 0), darkSteel));
    barrel.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3).translate(s * 0.1, 0, -0.2), darkSteel)); // mount
    barrel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 10).translate(0, 0.45, -0.1), new THREE.MeshStandardNodeMaterial({ color: 0x151515, roughness: 0.7 }))); // hose
    barrel.position.set(s * 2.12, PRESS_Y, PRESS_Z);
    g.add(barrel);
    const stages = [0.13, 0.105, 0.08].map((r) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 20).rotateZ(Math.PI / 2), steel);
      m.position.set(0, PRESS_Y, PRESS_Z);
      g.add(m);
      return m;
    });
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, FRONT_Z + FRAME_T + 0.45 - WALL_Z[1]).translate(0, 0, (PRESS_Z + 0.1 + WALL_Z[1]) / 2 - 0.05), darkSteel);
    yoke.position.y = PRESS_Y;
    g.add(yoke);
    shadows(g);
    g.visible = false;
    room.add(g);
    return { g, s, barrel, stages, yoke };
  });

  // --- pedestal + coin ------------------------------------------------------------------------------
  const pedestal = new THREE.Group();
  {
    const pm = stoneMaterial({ w: 50, h: 0.25, base: 0xb9ad98, alt: 0x8d806c, seed: 43, jitterRows: false, irregular: 0, tilt: 0 });
    const prof = [[0, 0], [0.3, 0], [0.3, 0.08], [0.24, 0.12], [0.18, 0.16], [0.16, PED.h - 0.16], [0.21, PED.h - 0.1], [0.27, PED.h - 0.04], [0.27, PED.h], [0, PED.h]].map(([x, y]) => new THREE.Vector2(x, y));
    pedestal.add(new THREE.Mesh(bakeUV(new THREE.LatheGeometry(prof, 32)), pm));
    pedestal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.04, 32).translate(0, PED.h - 0.24, 0), gold));
    pedestal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.02, 24).translate(0, PED.h + 0.01, 0), new THREE.MeshStandardNodeMaterial({ color: 0x5a1020, roughness: 0.9 }))); // velvet
    pedestal.position.set(0, 0, PED.z);
    shadows(pedestal);
    room.add(pedestal);
  }
  const coin = new THREE.Group();
  {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.018, 32), coinGold);
    c.rotation.x = Math.PI / 2;
    coin.add(c);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.008, 6, 32), coinGold);
    coin.add(rim);
    // No glow sprite: any billboard here also lands in the G-buffer and SSGI drew its outline (a dark
    // square, then a disc) on the wall behind. The coin glows through bloom on its emissive (pumped
    // by the glint) and a small warm light on the pedestal and the hand.
    const glow = new THREE.PointLight(0xffc050, 0, 1.6, 2);
    coin.add(glow);
    coin.userData.glow = glow;
    shadows(c);
    room.add(coin);
  }

  // --- the boot in the vent -------------------------------------------------------------------------
  const boot = new THREE.Group();
  {
    const leather = new THREE.MeshStandardNodeMaterial({ color: 0x5a3418, roughness: 0.7 });
    const sole = new THREE.MeshStandardNodeMaterial({ color: 0x1d1510, roughness: 0.8 });
    const b = new THREE.Group();
    b.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.32, 6, 16), leather));
    const toe = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.2, 0.46, 3, 0.08), leather);
    toe.position.set(0, -0.26, 0.12);
    b.add(toe);
    const so = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.06, 0.5, 2, 0.02), sole);
    so.position.set(0, -0.36, 0.12);
    b.add(so);
    b.add(new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.02, 6, 20).rotateX(Math.PI / 2).translate(0, 0.16, 0), iron)); // cuff
    b.position.y = -0.2;
    boot.add(b);
    // the coil spring above it
    const pts = [];
    for (let i = 0; i <= 140; i++) { const t = i / 140; pts.push(new THREE.Vector3(Math.cos(t * Math.PI * 14) * 0.12, t, Math.sin(t * Math.PI * 14) * 0.12)); }
    const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 280, 0.016, 6), steel);
    spring.position.y = 0.05;
    boot.add(spring);
    boot.userData.spring = spring;
    shadows(boot);
    boot.visible = false;
    room.add(boot);
  }

  // --- the jousting lance and the cube --------------------------------------------------------------
  // A tournament lance, spiral-painted red and white, in two halves that pivot at the middle (so the
  // press can snap it into a V): the tip half ends in a steel point, the grip half carries the
  // vamplate (the steel hand guard), the leather grip and an iron butt cap.
  const lacquer = new THREE.MeshStandardNodeMaterial({ roughness: 0.35 });
  {
    const pl = positionLocal;
    const ang = atan(pl.y, pl.z).div(Math.PI * 2);
    const band = fract(pl.x.mul(2.4).add(ang));
    const stripe = smoothstep(0.47, 0.5, band).sub(smoothstep(0.97, 1.0, band));
    lacquer.colorNode = mix(lin(0xb3161c), lin(0xf2ead8), stripe);
  }
  const leather = new THREE.MeshStandardNodeMaterial({ color: 0x4a2a14, roughness: 0.8 });
  const lathe = (pts, mat) => {
    const g = new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), 24).rotateZ(-Math.PI / 2);
    return new THREE.Mesh(g, mat);
  };
  const beamHalves = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    const h = new THREE.Group();
    if (s > 0) { // the tip half
      h.add(lathe([[0, 0.075], [0.9, 0.042], [0.9, 0]], lacquer));
      h.add(lathe([[0.88, 0], [0.88, 0.05], [0.96, 0.05], [1.12, 0.0]], steel));
    } else { // the grip half: vamplate, grip, butt
      h.add(lathe([[0, 0.075], [0.5, 0.08], [0.5, 0]], lacquer));
      h.add(lathe([[0.46, 0], [0.46, 0.08], [0.7, 0.24], [0.73, 0.24], [0.73, 0]], steel));
      h.add(lathe([[0.72, 0.05], [1.0, 0.05], [1.0, 0]], leather));
      h.add(lathe([[0.98, 0], [0.98, 0.07], [1.1, 0.06], [1.12, 0]], darkSteel));
    }
    h.scale.x = s;
    pivot.add(h);
    room.add(pivot);
    return pivot;
  });
  const beamGroup = new THREE.Group();
  room.add(beamGroup);
  for (const p of beamHalves) beamGroup.add(p);
  shadows(beamGroup);

  const cube = new THREE.Group();
  {
    const armour = new THREE.MeshStandardNodeMaterial({ metalness: 0.45, roughness: 0.35 });
    const n = mx_fractal_noise_float(positionLocal.mul(9), 3, 2, 0.5).mul(0.5).add(0.5);
    armour.colorNode = mix(lin(0xd2d8de), lin(0x9aa2aa), n);
    armour.normalNode = bumpMap(mx_fractal_noise_float(positionLocal.mul(5), 3, 2, 0.5), float(0.03)); // dents
    const S = CUBE_SIZE;
    cube.add(new THREE.Mesh(new RoundedBoxGeometry(S, S, S, 3, 0.04), armour));
    cube.add(new THREE.Mesh(new THREE.BoxGeometry(S * 0.7, 0.05, 0.02).translate(0, 0.12, S / 2 + 0.005), new THREE.MeshBasicNodeMaterial({ color: 0x050505 }))); // visor slit
    const trim = new THREE.MeshStandardNodeMaterial({ color: 0xe0b040, metalness: 1, roughness: 0.3 });
    trim.emissiveNode = lin(0x4a3000);
    // his tabard, folded flat onto the front, with the sun badge
    cube.add(new THREE.Mesh(new THREE.BoxGeometry(S * 0.5, S * 0.55, 0.02).translate(0, -0.03, S / 2 + 0.01), new THREE.MeshStandardNodeMaterial({ color: 0xb8262a, roughness: 0.7 })));
    cube.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 20).rotateX(Math.PI / 2).translate(0, -0.03, S / 2 + 0.025), trim));
    cube.add(new THREE.Mesh(new THREE.BoxGeometry(S + 0.01, 0.04, S + 0.01).translate(0, -0.12, 0), trim));
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 12).translate(0, S / 2 + 0.15, 0), new THREE.MeshStandardNodeMaterial({ color: 0xd8262e, roughness: 0.8 }));
    plume.rotation.z = 0.3;
    cube.add(plume);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8).rotateZ(1.2).translate(S / 2 + 0.08, 0.05, 0.1), new THREE.MeshStandardNodeMaterial({ color: 0x5a3418 }));
    cube.add(hilt);
    shadows(cube);
    cube.visible = false;
    room.add(cube);
  }

  // --- the orb --------------------------------------------------------------------------------------
  const orb = new THREE.Group();
  {
    const core = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xe2b8ff).multiplyScalar(2.6) });
    orb.add(new THREE.Mesh(new THREE.SphereGeometry(ORB_R * 0.55, 24, 16), core));
    const halo = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    halo.colorNode = lin(0xa050ff).mul(0.45);
    halo.mrtNode = NO_GBUFFER();
    orb.add(new THREE.Mesh(new THREE.SphereGeometry(ORB_R, 24, 16), halo));
    const l = new THREE.PointLight(0xb070ff, 6, 6, 2);
    orb.add(l);
    orb.userData.light = l;
    orb.visible = false;
    room.add(orb);
  }

  // --- finale: rails along the hall, bogies on the box, the launch plate, the pole ------------------
  const rails = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const len = DOOR_Z - 0.6 - (CORR_BACK + 2);
    g.add(merged([bx(-0.035, 0.035, -0.1, 0.07, CORR_BACK + 2, DOOR_Z - 0.6), bx(-0.06, 0.06, -0.12, -0.08, CORR_BACK + 2, DOOR_Z - 0.6)], steel));
    for (let z = CORR_BACK + 2.3; z < DOOR_Z - 0.6; z += 0.7) g.add(merged([bx(-0.12, 0.12, -0.14, -0.1, z - 0.08, z + 0.08)], wood)); // sleepers
    g.position.set(s * RAIL_X, -0.3, 0);
    g.userData.len = len;
    root.add(g);
    shadows(g);
    return g;
  });
  const bogies = [-1, 1].map((s) => {
    const g = new THREE.Group();
    for (const z of [WALL_Z[0] + 0.4, -1.3, FRONT_Z - 0.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24).rotateZ(Math.PI / 2), darkSteel);
      wheel.position.set(0, 0.16, z);
      g.add(wheel);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.5).translate(0, 0.32, z), darkSteel));
    }
    g.position.set(s * RAIL_X, 0, 0);
    shadows(g);
    g.visible = false;
    room.add(g);
    return g;
  });
  const launchPlate = new THREE.Mesh(bakeUV(new THREE.BoxGeometry(1.0, 0.4, 1.0).translate(0, -0.2, 0)), stoneMaterial({ w: 0.6, h: 0.6, base: 0x8a8073, alt: 0x5f574d, seed: 31, jitterRows: false, irregular: 0, tilt: 0.05, mortar: 0.02 }));
  launchPlate.position.set(0, 0.002, VENT.z);
  launchPlate.castShadow = launchPlate.receiveShadow = true;
  room.add(launchPlate);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1, 10).translate(0, 0.5, 0), wood);
  pole.castShadow = true;
  pole.visible = false;
  root.add(pole);

  // --- the Mimic's lair -----------------------------------------------------------------------------
  const lair = new THREE.Group();
  lair.position.set(...MIMIC_ROOM);
  root.add(lair);
  const mimic = buildMimic(iron);
  mimic.g.position.set(MIMIC_AT[0] - MIMIC_ROOM[0], 0, MIMIC_AT[2] - MIMIC_ROOM[2]);
  lair.add(mimic.g);
  {
    const lw = 3.2, back = -3.2, front = 4.5, h = 3.6;
    const wm = stoneMaterial({ w: 0.62, h: 0.31, base: 0xa3998a, alt: 0x766c5f, seed: 51 });
    lair.add(merged([bx(-lw - 0.5, -lw, 0, h, back, front), bx(lw, lw + 0.5, 0, h, back, front), bx(-lw, lw, 0, h, back - 0.5, back), bx(-lw, lw, h, h + 0.4, back, front)], wm));
    // floor with the chute's mouth cut in it
    const cz = CHUTE_EXIT[2] - MIMIC_ROOM[2], r = 0.5;
    const fm = floorMaterial();
    lair.add(merged([bx(-lw, lw, -0.3, 0, back, cz - r), bx(-lw, lw, -0.3, 0, cz + r, front), bx(-lw, -r, -0.3, 0, cz - r, cz + r), bx(r, lw, -0.3, 0, cz - r, cz + r)], fm));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 10, 40).rotateX(Math.PI / 2), iron);
    ring.position.set(0, 0.02, cz);
    lair.add(ring);
    const pit = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3, 32, 1, true), new THREE.MeshStandardNodeMaterial({ color: 0x15110d, roughness: 1, side: THREE.BackSide }));
    pit.position.set(0, -1.5, cz);
    lair.add(pit);
    // the hoard: a heap of coins around the chest
    let seed = 5;
    const rr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 900, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 12), gold, n);
    const d = new THREE.Object3D();
    const cx = MIMIC_AT[0] - MIMIC_ROOM[0], cz2 = MIMIC_AT[2] - MIMIC_ROOM[2];
    for (let i = 0; i < n; i++) {
      const a = rr() * Math.PI * 2, rad = 0.65 + Math.pow(rr(), 0.7) * 2.2;
      const x = cx + Math.cos(a) * rad * 1.15, z = cz2 + Math.sin(a) * rad * 0.7 - 0.1;
      if (z > cz - r - 0.3 && Math.abs(x) < r + 0.3) continue;
      const heap = Math.max(0, 0.35 * (1 - (rad - 0.65) / 2.2));
      d.position.set(x, rr() * heap + 0.006, z);
      d.rotation.set((rr() - 0.5) * 1.2, rr() * 3, (rr() - 0.5) * 1.2);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    }
    im.castShadow = im.receiveShadow = true;
    lair.add(im);
    for (const s of [-1, 1]) torches.push(makeTorch(lair, { x: s * lw, y: 2.2, z: -1.0, out: [-s, 0], seed: 21 + s, iron, wood, intensity: 4 }));
    const fill = new THREE.PointLight(0xffc070, 3, 7, 2);
    fill.position.set(0, 2.6, 1.8);
    lair.add(fill);
  }

  // --- update ---------------------------------------------------------------------------------------
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const update = (st) => {
    clock.value = st.clock;
    grease.value = st.grease;
    volts.value = st.volts;
    room.position.z = st.roomDZ;
    for (const sl of slabs) {
      sl.g.position.x = sl.s * (st.inner + WALL_T / 2 + st.shudder);
      sl.plates.forEach((p, i) => {
        const k = st.plates[sl.s < 0 ? i : i + 2];
        p.visible = k > 0.001;
        p.scale.y = Math.max(0.0001, k);
      });
      sl.bus.visible = st.volts > 0.001 || st.busOn;
      for (const { mg, i } of sl.mirrors) {
        const k = st.mirrors[i];
        mg.visible = k > 0.001;
        mg.scale.setScalar(Math.max(0.0001, k));
      }
      sl.glow.intensity = st.volts * (3 + 3 * Math.sin(st.clock * 1.7 + sl.s));
    }
    for (const p of presses) {
      const k = st.presses[p.s < 0 ? 0 : 1];
      p.g.visible = k > 0.001;
      p.barrel.position.z = PRESS_Z - (1 - k) * 0.7; // slides out of the pillar
      // rods telescope from the barrel's inner end to the slab's front edge
      const a = 2.12 - 0.31, b = Math.max(st.inner + 0.06, 0.08);
      const len = Math.max(0.01, a - b);
      p.stages.forEach((m, j) => {
        const seg = len / 3 + 0.08;
        const x0 = a - (len * j) / 3;
        m.scale.x = seg;
        m.position.x = p.s * (x0 - seg / 2 + 0.04);
        m.position.z = p.barrel.position.z;
        m.visible = k > 0.98 && len > 0.05;
      });
      p.yoke.position.x = p.s * (b + 0.02);
      p.yoke.visible = k > 0.98;
    }
    pedestal.position.y = -st.sink * (PED.h + 0.06);
    if (st.coin) {
      coin.visible = true;
      coin.position.set(...st.coin.pos);
      coin.position.z -= st.roomDZ; // coin positions are given in world space
      coin.rotation.y = st.coin.spin ?? 0;
      coinGlint.value = st.coin.glint ?? 0;
      coin.userData.glow.intensity = 0.6 + 2.2 * coinGlint.value;
    } else coin.visible = false;
    boot.visible = st.boot > 0.001;
    boot.position.set(0, ROOM_H + 0.95 - st.boot * 1.25, VENT.z);
    boot.userData.spring.scale.y = 0.4 + st.boot * 1.25;
    if (st.beam) {
      beamGroup.visible = true;
      beamGroup.position.set(st.beam.x, st.beam.y, st.beam.z - st.roomDZ);
      beamGroup.rotation.y = st.beam.yaw ?? 0;
      beamHalves.forEach((p, i) => {
        const s = i ? 1 : -1;
        p.position.set(0, 0, 0);
        p.rotation.z = s * st.beam.buckle; // the two halves fold up into a V
      });
    } else beamGroup.visible = false;
    if (st.cube) {
      cube.visible = true;
      cube.position.set(st.cube.pos[0], st.cube.pos[1], st.cube.pos[2]);
      cube.rotation.set(st.cube.rot[0], st.cube.rot[1], st.cube.rot[2]);
    } else cube.visible = false;
    if (st.orb) {
      orb.visible = true;
      orb.position.set(st.orb.x, st.orb.y, st.orb.z);
      orb.scale.setScalar(st.orb.scale ?? 1);
      orb.userData.light.intensity = 3 * (st.orb.scale ?? 1);
    } else orb.visible = false;
    rails.forEach((r) => { r.position.y = -0.3 + st.rails * 0.3; r.visible = st.rails > 0.001; });
    bogies.forEach((b) => { b.visible = st.rails > 0.5; b.position.y = (1 - st.bogies) * 0.4; });
    launchPlate.position.y = 0.002 + st.launch * 0.9;
    if (st.pole) {
      pole.visible = true;
      tmpA.set(...st.pole[0]); tmpB.set(...st.pole[1]);
      const d = tmpB.clone().sub(tmpA);
      pole.position.copy(tmpA);
      pole.scale.set(1, d.length(), 1);
      pole.quaternion.setFromUnitVectors(up, d.normalize());
    } else pole.visible = false;
    mimic.set(st.mimic);
  };
  return { update, torches, room };
}

// A chest that is a mouth: iron-banded oak, a hinged lid with fangs on both rims, a tongue and eyes.
function buildMimic(iron) {
  const g = new THREE.Group();
  const W = 1.5, D = 0.9, H = 0.72;
  const oak = new THREE.MeshStandardNodeMaterial({ roughness: 0.75 });
  {
    const row = positionLocal.y.mul(6.5);
    const plank = fract(row);
    const gap = smoothstep(0.06, 0.0, plank).add(smoothstep(0.94, 1.0, plank));
    const tone = mx_noise_float(vec3(row.floor().mul(3.7), 0.5, 1.3)).mul(0.5).add(0.5);
    const grain = mx_fractal_noise_float(vec3(positionLocal.x.mul(2.5), positionLocal.y.mul(40), positionLocal.z.mul(2.5)), 3, 2, 0.5).mul(0.5).add(0.5);
    oak.colorNode = mix(mix(lin(0x5c3519), lin(0x8a5528), tone.mul(0.6).add(grain.mul(0.4))), lin(0x1e120a), gap.clamp());
    oak.normalNode = bumpMap(grain.mul(0.15).sub(gap.mul(0.5)), float(0.012));
  }
  const maw = new THREE.MeshStandardNodeMaterial({ color: 0x5a0d14, roughness: 0.55 });
  const tooth = new THREE.MeshStandardNodeMaterial({ color: 0xefe6cc, roughness: 0.4 });
  const tongueMat = new THREE.MeshStandardNodeMaterial({ color: 0xd2476a, roughness: 0.35 });
  const eyeMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xffd84d).multiplyScalar(4) });
  // base: an open box (walls + floor), dark red inside
  const base = new THREE.Group();
  base.add(merged([bx(-W / 2, W / 2, 0, 0.1, -D / 2, D / 2), bx(-W / 2, -W / 2 + 0.08, 0, H, -D / 2, D / 2), bx(W / 2 - 0.08, W / 2, 0, H, -D / 2, D / 2),
    bx(-W / 2, W / 2, 0, H, -D / 2, -D / 2 + 0.08), bx(-W / 2, W / 2, 0, H, D / 2 - 0.08, D / 2)], oak));
  base.add(merged([bx(-W / 2 + 0.08, W / 2 - 0.08, 0.1, 0.4, -D / 2 + 0.08, D / 2 - 0.08)], maw));
  base.add(merged([bx(-W / 2 - 0.02, -W / 2 + 0.12, 0, H + 0.02, -D / 2 - 0.02, D / 2 + 0.02), bx(W / 2 - 0.12, W / 2 + 0.02, 0, H + 0.02, -D / 2 - 0.02, D / 2 + 0.02)], iron));
  const fang = new THREE.ConeGeometry(0.045, 0.16, 8);
  for (let i = 0; i < 9; i++) {
    const t = new THREE.Mesh(fang, tooth);
    t.position.set(-W / 2 + 0.16 + (i * (W - 0.32)) / 8, H + 0.06, D / 2 - 0.06);
    base.add(t);
  }
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 6, 16).rotateX(Math.PI / 2).scale(1.4, 0.45, 1), tongueMat);
  tongue.position.set(0.1, 0.45, 0.25);
  base.add(tongue);
  g.add(base);
  // lid: a half drum hinged at the back top edge
  const hinge = new THREE.Group();
  hinge.position.set(0, H, -D / 2);
  const lid = new THREE.Group();
  const drum = new THREE.CylinderGeometry(D / 2, D / 2, W, 32, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2);
  const shell = new THREE.Mesh(drum, oak);
  shell.position.set(0, 0, D / 2);
  lid.add(shell);
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, D - 0.04).rotateX(Math.PI / 2), maw);
  inside.position.set(0, 0.005, D / 2);
  lid.add(inside);
  for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 + 0.015, D / 2 + 0.015, 0.1, 32, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), iron);
    band.position.set(x, 0, D / 2);
    lid.add(band);
  }
  for (let i = 0; i < 9; i++) {
    const t = new THREE.Mesh(fang, tooth);
    t.rotation.x = Math.PI;
    t.position.set(-W / 2 + 0.16 + (i * (W - 0.32)) / 8, -0.06, D - 0.06);
    lid.add(t);
  }
  const eyes = [-0.28, 0.28].map((x) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), eyeMat);
    e.position.set(x, D * 0.32, D * 0.93);
    lid.add(e);
    return e;
  });
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.05), new THREE.MeshStandardNodeMaterial({ color: 0xd8a63a, metalness: 1, roughness: 0.3 }));
  lock.position.set(0, -0.02, D + 0.02);
  lid.add(lock);
  hinge.add(lid);
  g.add(hinge);
  shadows(g);
  return {
    g,
    set: (m) => {
      const open = m?.open ?? 0.35;
      hinge.rotation.x = -open * 1.25;
      g.scale.set(1 + (m?.chew ?? 0) * 0.06, 1 - (m?.chew ?? 0) * 0.08, 1 + (m?.chew ?? 0) * 0.04);
      for (const e of eyes) e.scale.y = Math.max(0.1, m?.blink ? 0.15 : 1);
      tongue.rotation.z = Math.sin((m?.clock ?? 0) * 0.15) * 0.15;
    },
  };
}
