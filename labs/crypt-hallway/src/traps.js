// Levels 3-5 trap props, shared by the film and the game: buildTraps returns update(state), the
// plain prop state from anim.js propsAt(f) or game.js (`clock` is the frame, for flicker):
//   3  copper burner pipes along both rims of the trapdoor, fed from a pressurised oil tank
//   4  a gear-driven pendulum blade hung from the vault over "the exact spot", swiping across the hall
//   5  the counterweight catapult (the floor under the entrance) and the pet Mimic
import * as THREE from "three/webgpu";
import { color, uniform } from "three/tsl";
import { ironMaterial, flameMaterial } from "./materials.js";
import { PIT, PENDULUM, SLAB, MIMIC, TANK } from "./anim.js";
import { NO_GBUFFER } from "./fx.js";

const NEAR_S = PIT.s - PIT.hl, FAR_S = PIT.s + PIT.hl;
const RIM_X = 2.2; // the burners span the nave

const copper = () => {
  const m = new THREE.MeshStandardNodeMaterial({ color: 0xd07a45, metalness: 0.55, roughness: 0.32 });
  m.emissiveNode = color(0x2a1006);
  return m;
};
const hash = (i, k) => { const x = Math.sin(i * 51.3 + k * 17.9) * 43758.5453; return x - Math.floor(x); };

export function buildTraps(scene, { floorMaterial }) {
  const iron = ironMaterial(), cu = copper();
  const shadows = (o) => o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });

  // --- level 3: burner pipes, feed pipe, oil tank, flames ---------------------------------------
  const pipes = new THREE.Group();
  const rimPipe = (s) => { // grows out from the feed side (x = -RIM_X)
    const g = new THREE.Group();
    g.position.set(-RIM_X, 0.07, -s);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, RIM_X * 2, 12).rotateZ(Math.PI / 2).translate(RIM_X, 0, 0), cu);
    g.add(pipe);
    for (let x = 0.15; x < RIM_X * 2; x += 0.35) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.1, 8).translate(0, 0.07, 0), iron);
      nozzle.position.x = x;
      g.add(nozzle);
    }
    for (const x of [0.02, RIM_X * 2 - 0.02]) { // brackets
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.18).translate(0, -0.03, 0), iron);
      b.position.x = x;
      g.add(b);
    }
    pipes.add(g);
    return g;
  };
  const rims = [rimPipe(NEAR_S - 0.14), rimPipe(FAR_S + 0.14)];
  // the feed: along the left of the nave from the tank down past both rims
  const feedLen = TANK[1] - (NEAR_S - 0.14);
  const feed = new THREE.Group();
  feed.position.set(-RIM_X, 0.07, -TANK[1]);
  const feedPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, feedLen, 12).rotateX(Math.PI / 2).translate(0, 0, feedLen / 2), cu);
  feed.add(feedPipe);
  for (let s = 0.6; s < feedLen; s += 1.4) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 14), iron);
    ring.position.z = s;
    feed.add(ring);
  }
  // tank to feed: a short run across the aisle through the arcade
  const stub = TANK[0] + 0.45 + RIM_X; // tank wall, in the feed's local x (negative)
  const stubPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, -stub, 12).rotateZ(Math.PI / 2).translate(stub / 2, 0, 0), cu);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), iron);
  feed.add(stubPipe, elbow);
  pipes.add(feed);
  shadows(pipes);
  scene.add(pipes);

  const tank = new THREE.Group();
  const R = 0.48, TH = 1.5;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TH, 28).translate(0, TH / 2 + 0.12, 0), cu);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(0, TH + 0.12, 0), cu);
  tank.add(shell, dome);
  for (const y of [0.3, 0.9, 1.45]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(R + 0.012, 0.025, 6, 32).rotateX(Math.PI / 2), iron);
    band.position.y = y;
    tank.add(band);
  }
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { // legs
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), iron);
    leg.position.set(Math.cos(a) * R * 0.8, 0.1, Math.sin(a) * R * 0.8);
    tank.add(leg);
  }
  // pressure gauge facing the camera: white face, red sector, a needle that climbs
  const gauge = new THREE.Group();
  gauge.position.set(0.18, 1.1, R + 0.05);
  gauge.rotation.y = 0.35;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicNodeMaterial({ color: 0xf2ead8 }));
  const red = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 16, 1, -0.4, 1.0), new THREE.MeshBasicNodeMaterial({ color: 0xd8261a }));
  red.position.z = 0.002;
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), cu);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.01).translate(0, 0.07, 0), new THREE.MeshBasicNodeMaterial({ color: 0x111111 }));
  needle.position.z = 0.006;
  gauge.add(face, red, bezel, needle);
  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 20), new THREE.MeshStandardNodeMaterial({ color: 0xc8241a, roughness: 0.4 }));
  valve.position.set(-0.3, 1.55, R * 0.7);
  valve.rotation.y = -0.6;
  tank.add(gauge, valve);
  shadows(tank);
  tank.position.set(TANK[0], 0, -TANK[1]);
  scene.add(tank);

  // flames: rows of flame sprites standing on each rim pipe, and warm light on the trapdoor
  const flameMats = [0, 1, 2, 3].map((k) => Object.assign(flameMaterial(k * 3.7 + 1), { mrtNode: NO_GBUFFER() }));
  const flames = [];
  for (const s of [NEAR_S - 0.14, FAR_S + 0.14]) {
    for (let x = -RIM_X + 0.2, i = 0; x < RIM_X; x += 0.55, i++) {
      const sp = new THREE.Sprite(flameMats[i % 4]);
      sp.center.set(0.5, 0.05);
      sp.position.set(x, 0.12, -s);
      sp.visible = false;
      scene.add(sp);
      flames.push({ sp, seed: i + s });
    }
  }
  const fireLights = [];
  for (const s of [NEAR_S - 0.1, FAR_S + 0.1]) for (const x of [-1.2, 1.2]) {
    const l = new THREE.PointLight(0xff7a2a, 0, 0, 2);
    l.position.set(x, 0.8, -s);
    scene.add(l);
    fireLights.push(l);
  }

  // --- level 4: the pendulum -------------------------------------------------------------------
  const pend = new THREE.Group(); // drops in from the vault
  pend.position.set(0, PENDULUM.y, -PENDULUM.s);
  pend.rotation.y = Math.PI / 2; // the beam runs down the hall, the blade swipes across it (left to right)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.28, 0.32), new THREE.MeshStandardNodeMaterial({ color: 0x3a2a1c, roughness: 0.8 }));
  beam.position.y = 0.32;
  pend.add(beam);
  const gear = (r, teeth, thick) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, thick, 32).rotateZ(Math.PI / 2), iron));
    const tooth = new THREE.BoxGeometry(thick, 0.08, 0.08);
    for (let i = 0; i < teeth; i++) {
      const t = new THREE.Mesh(tooth, iron);
      const a = (i / teeth) * Math.PI * 2;
      t.position.set(0, Math.cos(a) * (r + 0.03), Math.sin(a) * (r + 0.03));
      t.rotation.x = -a;
      g.add(t);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, thick * 1.6, 12).rotateZ(Math.PI / 2), cu);
    g.add(hub);
    return g;
  };
  const bigGear = gear(0.55, 22, 0.1), pinion = gear(0.22, 9, 0.1);
  bigGear.position.x = -0.2;
  pinion.position.set(-0.2, 0.55 + 0.22 + 0.04, 0);
  pend.add(bigGear, pinion);
  const swing = new THREE.Group(); // rotates about x at the pivot
  pend.add(swing);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, PENDULUM.len, 10).translate(0, -PENDULUM.len / 2, 0), iron);
  swing.add(arm);
  // crescent blade in the swing plane (y-s), edge down and forward/back
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.95, Math.PI * 1.15, Math.PI * 1.85, false);
  shape.absarc(0, 0.3, 0.62, Math.PI * 1.8, Math.PI * 1.2, true);
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.03, bevelSegments: 1, curveSegments: 24 });
  bladeGeo.translate(0, 0, -0.0175).rotateY(Math.PI / 2);
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0xd9dcdf, metalness: 0.7, roughness: 0.22 });
  steel.emissiveNode = color(0x1a1a1c);
  const blade = new THREE.Mesh(bladeGeo, steel);
  blade.position.y = -PENDULUM.len + 0.45;
  const hubB = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 16).rotateZ(Math.PI / 2), iron);
  hubB.position.y = -PENDULUM.len + 0.45;
  swing.add(blade, hubB);
  shadows(pend);
  pend.visible = false;
  scene.add(pend);

  // --- level 5: the catapult slab, its counterweight, the Mimic -------------------------------
  const len = SLAB.s1 - SLAB.s0;
  const slabGeo = new THREE.BoxGeometry(SLAB.hw * 2, 0.14, len).translate(0, -0.07 + 0.006, -len / 2);
  { // floor UVs, so it reads as part of the floor until it moves
    const p = slabGeo.attributes.position, uv = slabGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), SLAB.s0 - p.getZ(i));
  }
  const slabPivot = new THREE.Group();
  slabPivot.position.set(0, 0, -SLAB.s0);
  const slab = new THREE.Mesh(slabGeo, floorMaterial);
  slab.castShadow = slab.receiveShadow = true;
  slabPivot.add(slab);
  scene.add(slabPivot);
  // seams that light up when it's revealed
  const seamGlow = uniform(0);
  const seamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  seamMat.colorNode = color(new THREE.Color(0xff5fa2).multiplyScalar(5)).mul(seamGlow);
  for (const [x, z, w, d] of [[0, -0.01, SLAB.hw * 2, 0.03], [0, -len + 0.01, SLAB.hw * 2, 0.03], [-SLAB.hw, -len / 2, 0.03, len], [SLAB.hw, -len / 2, 0.03, len]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), seamMat);
    m.position.set(x, 0.012, z);
    slabPivot.add(m);
  }
  const hole = new THREE.Mesh(new THREE.BoxGeometry(SLAB.hw * 2, 0.02, len), new THREE.MeshBasicNodeMaterial({ color: 0x050403 }));
  hole.position.set(0, 0.002, -(SLAB.s0 + len / 2));
  scene.add(hole);
  // counterweight: a dressed stone block on two chains, behind the party
  const cw = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.0).translate(0, 0.55, 0), new THREE.MeshStandardNodeMaterial({ color: 0x6c655c, roughness: 0.85 }));
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.12, 1.04).translate(0, 0.85, 0), iron);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), new THREE.MeshBasicNodeMaterial({ color: 0xffd84d }));
  label.position.set(0, 0.45, 0.502);
  cw.add(block, strap, label);
  const cwChains = [];
  for (const x of [-0.45, 0.45]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0), iron);
    c.position.set(x, 1.1, 0);
    cw.add(c);
    cwChains.push(c);
  }
  shadows(cw);
  cw.position.set(0, 9, -(SLAB.s1 + 0.9));
  cw.visible = false;
  scene.add(cw);

  // the Mimic: a battered chest with teeth, a tongue and eyes; mouth towards the camera
  const mimic = new THREE.Group();
  const MW = 1.35, MH = 0.72, MD = 0.95;
  const oak = new THREE.MeshStandardNodeMaterial({ color: 0x6a4126, roughness: 0.7 });
  const brass = new THREE.MeshStandardNodeMaterial({ color: 0xe0a83a, metalness: 0.35, roughness: 0.3 });
  const bone = new THREE.MeshStandardNodeMaterial({ color: 0xf2ead6, roughness: 0.35 });
  const flesh = new THREE.MeshStandardNodeMaterial({ color: 0x7a1020, roughness: 0.5 });
  const tongueMat = new THREE.MeshStandardNodeMaterial({ color: 0xe0587a, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(MW, MH, MD).translate(0, MH / 2, 0), oak);
  const gullet = new THREE.Mesh(new THREE.BoxGeometry(MW - 0.12, 0.02, MD - 0.12), flesh);
  gullet.position.y = MH - 0.05;
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10).scale(1, 0.25, 1.3), tongueMat);
  tongue.position.set(0, MH - 0.02, 0.05);
  mimic.add(body, gullet, tongue);
  for (const x of [-MW * 0.38, MW * 0.38]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, MH + 0.012, MD + 0.024).translate(0, MH / 2, 0), brass);
    band.position.x = x;
    mimic.add(band);
  }
  const tooth = new THREE.ConeGeometry(0.045, 0.14, 6);
  for (let i = 0; i < 9; i++) { // lower jaw: front edge
    const t = new THREE.Mesh(tooth, bone);
    t.position.set(-MW / 2 + 0.1 + (i * (MW - 0.2)) / 8, MH + 0.06, MD / 2 - 0.06);
    mimic.add(t);
  }
  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, MH, -MD / 2);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(MD / 2, MD / 2, MW, 24, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, MD / 2), oak);
  const lidUnder = new THREE.Mesh(new THREE.BoxGeometry(MW - 0.04, 0.03, MD - 0.04).translate(0, 0.0, MD / 2), flesh);
  lidHinge.add(lid, lidUnder);
  for (let i = 0; i < 8; i++) { // upper jaw: hanging from the lid's front edge
    const t = new THREE.Mesh(tooth, bone);
    t.rotation.x = Math.PI;
    t.position.set(-MW / 2 + 0.14 + (i * (MW - 0.28)) / 7, -0.06, MD - 0.06);
    lidHinge.add(t);
  }
  const eyeMat = new THREE.MeshBasicNodeMaterial();
  eyeMat.colorNode = color(new THREE.Color(0xffd23a).multiplyScalar(4));
  for (const x of [-0.28, 0.28]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), eyeMat);
    eye.position.set(x, 0.3, 0.84);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.02), new THREE.MeshBasicNodeMaterial({ color: 0x000000 }));
    pupil.position.set(x, 0.3, 0.91);
    lidHinge.add(eye, pupil);
  }
  for (const x of [-MW * 0.38, MW * 0.38]) {
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(MD / 2 + 0.012, MD / 2 + 0.012, 0.08, 24, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, MD / 2), brass);
    lb.position.x = x;
    lidHinge.add(lb);
  }
  mimic.add(lidHinge);
  shadows(mimic);
  const mouthLight = new THREE.PointLight(0xff4060, 0, 0, 2);
  mouthLight.position.set(0, MH + 0.4, 0.5);
  mimic.add(mouthLight);
  mimic.rotation.y = 0.26; // mouth towards the camera
  mimic.visible = false;
  scene.add(mimic);

  return (p) => {
    const f = p.clock;
    // level 3
    const grow = Math.max(0.001, p.pipes);
    pipes.visible = p.pipes > 0.001;
    for (const r of rims) r.scale.x = grow;
    feed.scale.z = grow;
    tank.visible = p.tank != null;
    if (p.tank != null) tank.position.y = p.tank;
    needle.rotation.z = 1.9 - 2.5 * p.gauge + (p.fire > 0 ? 0.06 * Math.sin(f * 1.7) : 0);
    for (const { sp, seed } of flames) {
      sp.visible = p.fire > 0.01;
      const flick = 0.85 + 0.3 * hash(Math.floor(f / 2), seed);
      sp.scale.set(0.75 * p.fire, 0.85 * p.fire * flick, 1);
    }
    for (const [i, l] of fireLights.entries()) l.intensity = 9 * p.fire * (0.85 + 0.15 * Math.sin(f * 0.9 + i));
    // level 4
    pend.visible = p.pendulumIn > 0.001;
    swing.scale.y = Math.max(0.001, p.pendulumIn);
    pend.position.y = PENDULUM.y + 1.2 * (1 - Math.min(1, p.pendulumIn));
    swing.rotation.x = p.pendulumAngle; // + angle carries the blade towards -x (the left of the nave, looking down the hall)
    bigGear.rotation.x = -p.pendulumAngle;
    pinion.rotation.x = p.pendulumAngle * 2.5;
    // level 5
    seamGlow.value = p.slabReveal * (p.slab > 0.01 ? 0 : 1) * (0.7 + 0.3 * Math.sin(f * 0.3));
    slabPivot.rotation.x = p.slab; // far edge (-z) up
    hole.visible = p.slab > 0.01;
    cw.visible = p.counterweight != null;
    if (p.counterweight != null) {
      cw.position.y = p.counterweight;
      const chain = Math.max(0.01, 9.4 - p.counterweight - 1.1);
      for (const c of cwChains) c.scale.y = chain;
    }
    mimic.visible = p.mimicY != null;
    if (p.mimicY != null) {
      mimic.position.set(MIMIC.x, p.mimicY, -MIMIC.s);
      lidHinge.rotation.x = -p.mimicLid;
      mouthLight.intensity = 3 * Math.min(1, p.mimicLid);
    }
  };
}

