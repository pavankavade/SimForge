// Level 2 trap props, shared by the film and the game: buildProps returns update(state), the plain
// prop state anim.js propsAt(f) builds from the narration (or game.js from triggers): the hinged false floor over
// the spike pit (two flagstone flaps that match the floor exactly when shut), its hidden pressure
// plate, the bait chest hanging on a chain from the vault, the mage's ice, and the cast light.
import * as THREE from "three/webgpu";
import { color, float, mix, uniform, vec3, smoothstep, positionWorld, mx_fractal_noise_float } from "three/tsl";
import { ironMaterial } from "./materials.js";
import { PIT, CHEST, PLATE_S, ICE_Y, MAGE_CAST_POS } from "./anim.js";

const T = 0.12; // flap thickness

// One flap, hinged at s = hingeS and reaching `dir` (+1 towards +s, -1 towards -s) over hl.
// UVs are the floor's own (x, s) so the flagstone pattern runs straight across when shut.
function flapGeo(hingeS, dir) {
  const len = PIT.hl - 0.006;
  const g = new THREE.BoxGeometry(PIT.hw * 2, T, len, 1, 1, 1);
  g.translate(0, -T / 2, (-dir * len) / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), hingeS - p.getZ(i));
  return g;
}

export function buildProps(scene, { pit, floorMaterial }) {
  const iron = ironMaterial();
  const s0 = PIT.s - PIT.hl, s1 = PIT.s + PIT.hl;

  // flaps: pivot groups at the hinges
  const flaps = [[s0, 1], [s1, -1]].map(([hs, dir]) => {
    const g = new THREE.Group();
    g.position.set(0, 0, -hs);
    const m = new THREE.Mesh(flapGeo(hs, dir), floorMaterial);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, PIT.hw * 2, 10).rotateZ(Math.PI / 2), iron);
    pin.position.set(0, -0.05, 0);
    g.add(pin);
    scene.add(g);
    return { g, dir };
  });

  // pressure plate on the far flap: a hair-thin seam you only see when it lights up
  const plateGlow = uniform(0);
  const plate = new THREE.Group();
  const seamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  seamMat.colorNode = mix(color(0x15110c), color(new THREE.Color(0xff3020).multiplyScalar(6)), plateGlow);
  seamMat.opacityNode = mix(float(0.35), float(1), plateGlow);
  const half = 0.36, wdt = 0.018;
  for (const [x, z, w, d] of [[0, -half, half * 2, wdt], [0, half, half * 2, wdt], [-half, 0, wdt, half * 2], [half, 0, wdt, half * 2]]) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), seamMat);
    seam.position.set(x, 0.003, z);
    plate.add(seam);
  }
  const fillMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  fillMat.colorNode = color(new THREE.Color(0xff2a10).multiplyScalar(0.6)).mul(plateGlow);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2).rotateX(-Math.PI / 2), fillMat);
  fill.position.y = 0.004;
  plate.add(fill);
  plate.position.set(0, 0, s1 - PLATE_S); // far flap local: +z is towards the near rim
  flaps[1].g.add(plate);

  // chest on its chain: the bait has to read at phone size against beige stone, so it is big,
  // red-lacquered with bright gold bands, its lid cracked open on a hoard that glows
  const chest = new THREE.Group();
  const lacquer = new THREE.MeshStandardNodeMaterial();
  const grain = mx_fractal_noise_float(positionWorld.mul(vec3(4, 40, 4)), 2, 2.0, 0.5).mul(0.5).add(0.5);
  lacquer.colorNode = mix(color(0x4a0f0a), color(0x8c2416), grain);
  lacquer.roughnessNode = float(0.38);
  const gold = new THREE.MeshStandardNodeMaterial({ color: 0xffc23a, metalness: 0.35, roughness: 0.28 });
  gold.emissiveNode = color(0x4a2a00);
  const chestGlow = uniform(0);
  const glowMat = new THREE.MeshBasicNodeMaterial();
  glowMat.colorNode = color(new THREE.Color(0xffc45a).multiplyScalar(7)).mul(chestGlow).add(color(0x5a3a10));
  const W = 1.0, H = 0.5, D = 0.62;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), lacquer);
  body.position.y = H / 2;
  // lid hinged along the back edge, cracked open so the hoard's light spills out of the front
  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, H, -D / 2);
  lidHinge.rotation.x = -0.12;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, W, 24, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), lacquer);
  lid.position.set(0, 0.0, D / 2);
  const lidBase = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), lacquer);
  lidBase.position.set(0, 0.02, D / 2);
  lidHinge.add(lid, lidBase);
  const hoard = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.04, D - 0.08), glowMat);
  hoard.position.y = H - 0.03;
  chest.add(body, lidHinge, hoard);
  for (const x of [-W * 0.38, 0, W * 0.38]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.07, H + 0.012, D + 0.024), gold);
    band.position.set(x, H / 2, 0);
    const lidBand = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 + 0.014, D / 2 + 0.014, 0.07, 24, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), gold);
    lidBand.position.set(x, 0, D / 2);
    chest.add(band);
    lidHinge.add(lidBand);
  }
  for (const y of [0.03, H - 0.03]) { // gold rims top and bottom
    const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.05, D + 0.02), gold);
    rim.position.y = y;
    chest.add(rim);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.05), gold);
  lock.position.set(0, H - 0.08, D / 2 + 0.03);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 16), iron);
  ring.position.y = H + D / 2 + 0.07;
  chest.add(lock, ring);
  chest.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  hoard.castShadow = false;
  const chestLight = new THREE.PointLight(0xffb84a, 0, 0, 2); // the hoard's spill
  chestLight.position.set(0, H + 0.2, D / 2 + 0.3);
  chest.add(chestLight);
  const keyLight = new THREE.PointLight(0xffd9a0, 0, 0, 2); // a warm key from the camera side, so the lacquer reads
  keyLight.position.set(0.9, 0.6, 1.3);
  chest.add(keyLight);
  const chestTop = H + D / 2 + 0.13;
  const pivot = new THREE.Group(); // swings about the chain anchor
  pivot.position.set(0, CHEST.top, -CHEST.s);
  pivot.add(chest);
  scene.add(pivot);

  const LINK = 0.085, MAXL = 90;
  const links = new THREE.InstancedMesh(new THREE.TorusGeometry(0.03, 0.009, 6, 12).scale(1, 1.5, 1), iron, MAXL);
  links.castShadow = true;
  pivot.add(links);
  const dummy = new THREE.Object3D();

  // ice sheet: frost creeps from the far rim to the near rim along a ragged, glowing front
  // (`iceFront` 0..1), crystals sprouting behind it
  const iceFront = uniform(0), iceMelt = uniform(0); // melt: level 3's fire turns it to slush
  const iceMat = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false });
  const frost = mx_fractal_noise_float(positionWorld.mul(3.5), 4, 2.0, 0.55).mul(0.5).add(0.5);
  const along = positionWorld.z.add(s1).div(PIT.hl * 2); // 0 at the far rim, 1 at the near rim
  const ragged = along.add(mx_fractal_noise_float(positionWorld.mul(vec3(1.6, 1, 0.6)), 3, 2.0, 0.5).mul(0.14));
  const reach = iceFront.mul(1.16).sub(0.08);
  const shown = float(1).sub(smoothstep(reach.sub(0.015), reach.add(0.015), ragged));
  const edge = float(1).sub(smoothstep(0, 0.07, reach.sub(ragged).abs())).mul(float(1).sub(smoothstep(0.92, 1, iceFront)));
  iceMat.colorNode = mix(color(0x8fd2ff), color(0xeaf8ff), frost);
  iceMat.roughnessNode = mix(float(0.04), float(0.45), frost.pow(2));
  iceMat.metalnessNode = float(0);
  iceMat.emissiveNode = color(0x3d9de0).mul(0.25).add(color(new THREE.Color(0xa8ecff).multiplyScalar(4)).mul(edge));
  iceMat.opacityNode = mix(float(0.62), float(0.92), frost).mul(shown).mul(float(1).sub(iceMelt.mul(0.8)));
  iceMat.colorNode = mix(mix(color(0x8fd2ff), color(0xeaf8ff), frost), color(0x6a8090), iceMelt);
  const iceGeo = new THREE.BoxGeometry(PIT.hw * 2, ICE_Y + 0.03, PIT.hl * 2).translate(0, (ICE_Y - 0.03) / 2, PIT.hl);
  const ice = new THREE.Mesh(iceGeo, iceMat);
  ice.position.set(0, 0, -s1);
  ice.receiveShadow = true;
  scene.add(ice);
  // crystals: little spikes of ice that pop up as the front passes them, thicker near the rims
  const crystalMat = new THREE.MeshStandardNodeMaterial({ color: 0xd6f1ff, roughness: 0.15, metalness: 0 });
  crystalMat.emissiveNode = color(0x4fb4f0).mul(0.5);
  const NC = 160;
  const crystals = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0), crystalMat, NC);
  crystals.frustumCulled = false;
  scene.add(crystals);
  const hashC = (i, k) => { const x = Math.sin(i * 91.7 + k * 47.3) * 43758.5453; return x - Math.floor(x); };
  const crystal = Array.from({ length: NC }, (_, i) => {
    const rim = hashC(i, 1) < 0.45; // a share crowd the rims and seams
    const u = rim ? (hashC(i, 2) < 0.5 ? hashC(i, 3) * 0.12 : 1 - hashC(i, 3) * 0.12) : hashC(i, 3);
    return {
      u, x: (hashC(i, 4) < 0.5 ? -1 : 1) * (0.4 + hashC(i, 9) * (PIT.hw - 0.5)), // clear of the mage's path down the middle
      h: 0.06 + hashC(i, 5) * (rim ? 0.22 : 0.12), r: 0.025 + hashC(i, 6) * 0.03,
      tx: (hashC(i, 7) - 0.5) * 0.8, tz: (hashC(i, 8) - 0.5) * 0.8,
    };
  });
  const cd = new THREE.Object3D();

  // the mage's cast: a cold orb and its light
  const castGlow = uniform(0);
  const orbMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  orbMat.colorNode = color(new THREE.Color(0x9fe0ff).multiplyScalar(8)).mul(castGlow);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), orbMat);
  orb.position.set(...MAGE_CAST_POS);
  const castLight = new THREE.PointLight(0x7fd0ff, 0, 0, 2);
  castLight.position.set(...MAGE_CAST_POS);
  scene.add(orb, castLight);

  return (p) => {
    pit.bed.position.y = p.spikesY;
    for (const [i, a] of [p.flapA, p.flapB].entries()) {
      const { g, dir } = flaps[i];
      g.visible = a != null;
      if (a == null) continue;
      g.position.y = p.flapsY;
      g.rotation.x = dir * a; // +a stands the flap up, -a drops it into the pit
    }
    plateGlow.value = p.plateGlow;
    pivot.visible = p.chestY != null;
    if (p.chestY != null) {
      const len = CHEST.top - (p.chestY + chestTop);
      chest.position.y = -len - chestTop;
      pivot.rotation.z = p.chestSwing;
      const n = Math.min(MAXL, Math.max(0, Math.floor(len / LINK)));
      links.count = n;
      for (let i = 0; i < n; i++) {
        dummy.position.set(0, -i * LINK - LINK / 2, 0);
        dummy.rotation.set(0, (i % 2) * Math.PI / 2, 0);
        dummy.updateMatrix();
        links.setMatrixAt(i, dummy.matrix);
      }
      links.instanceMatrix.needsUpdate = true;
      chestGlow.value = p.chestGlow;
      chestLight.intensity = 7 * p.chestGlow;
      keyLight.intensity = 2.5;
    }
    ice.visible = crystals.visible = p.ice > 0.001;
    iceFront.value = p.ice;
    iceMelt.value = p.melt;
    for (let i = 0; i < NC; i++) {
      const c = crystal[i];
      const g = Math.min(1, Math.max(0, (p.ice * 1.08 - c.u) * 9));
      const k = Math.max(0.0001, (g <= 0 ? 0 : 1 + 2.7 * Math.pow(g - 1, 3) + 1.7 * Math.pow(g - 1, 2)) * (1 - p.melt)); // easeOutBack pop, shrinking as it melts
      cd.position.set(c.x, ICE_Y - 0.01, -s1 + c.u * PIT.hl * 2);
      cd.rotation.set(c.tx, 0, c.tz);
      cd.scale.set(c.r * k, c.h * k, c.r * k);
      cd.updateMatrix();
      crystals.setMatrixAt(i, cd.matrix);
    }
    crystals.instanceMatrix.needsUpdate = true;
    castGlow.value = p.castGlow;
    castLight.intensity = 5 * p.castGlow;
    orb.visible = p.castGlow > 0;
    if (p.castPos) { orb.position.set(...p.castPos); castLight.position.set(...p.castPos); } // the game's mage casts wherever she stands
  };
}
