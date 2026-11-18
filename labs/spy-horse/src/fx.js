// Particle bursts for the film (anim.js BURSTS), as in the crypt and igloo labs: pure functions of
// the frame, every particle's path a hash of (burst, index). Soft things (dust, smoke, haze) are
// alpha-blended; flashes and sparks add; clods, flies and torn sandbags are small solids.
import * as THREE from "three/webgpu";
import { color, normalView, mrt, vec4, instancedBufferAttribute, float } from "three/tsl";
import { BURSTS, FPS } from "./anim.js";

const MAX = 3000;
const NO_GBUFFER = () => mrt({ diffuseColor: vec4(0), normal: vec4(0), velocity: vec4(0) });
const G = -9.8;
const hash = (a, b, k) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

const TINT = {
  dust: new THREE.Color(0x8a7458),
  smoke: new THREE.Color(0x4a4540),
  haze: new THREE.Color(0xb8b4ac),
  spray: new THREE.Color(0x3b2c1f),
  sacks: new THREE.Color(0x9a845c),
  flies: new THREE.Color(0x101010),
  flash: new THREE.Color(0xff9a40).multiplyScalar(1.8),
  flashCore: new THREE.Color(0xffd890).multiplyScalar(2.4),
  sparks: new THREE.Color(0xffd27a).multiplyScalar(5),
};

export function buildFx(scene) {
  const make = (geo, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, MAX);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    return m;
  };
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
  const softMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  softMat.colorNode = color(1, 1, 1);
  softMat.opacityNode = instancedBufferAttribute(alpha).mul(normalView.z.clamp(0, 1).pow(1.6));
  softMat.mrtNode = NO_GBUFFER();
  const softs = make(new THREE.IcosahedronGeometry(1, 2), softMat);
  const solidMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
  const solids = make(new THREE.IcosahedronGeometry(1, 1), solidMat);
  const hotMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  hotMat.colorNode = color(1, 1, 1).mul(normalView.z.clamp(0, 1).pow(2).add(float(0.15)));
  hotMat.mrtNode = NO_GBUFFER();
  const hots = make(new THREE.SphereGeometry(1, 10, 8), hotMat);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const n = { softs: 0, solids: 0, hots: 0 };
  const put = (which, pos, scale, col, fade, stretch) => {
    const mesh = which === "softs" ? softs : which === "solids" ? solids : hots;
    const i = n[which]++;
    if (i >= MAX) return;
    dummy.position.set(...pos);
    dummy.rotation.set(pos[0] * 3.1, pos[1] * 2.3, pos[2] * 1.7);
    if (Array.isArray(scale)) dummy.scale.set(...scale); else dummy.scale.setScalar(scale);
    if (stretch) {
      dummy.rotation.set(0, 0, 0);
      dummy.lookAt(pos[0] + stretch[0], pos[1] + stretch[1], pos[2] + stretch[2]);
      dummy.scale.z *= 1 + Math.hypot(...stretch) * 3;
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (which === "softs") { mesh.setColorAt(i, col); alpha.setX(i, fade); }
    else mesh.setColorAt(i, tint.copy(col).multiplyScalar(which === "hots" ? fade : 1));
  };
  const spread = (b, i) => {
    const box = b.box ?? [0, 0, 0];
    return [0, 1, 2].map((k) => b.pos[k] + (hash(b.at, i, k + 1) * 2 - 1) * box[k]);
  };

  const emit = (b, f) => {
    const N = b.n ?? 20, size = b.size ?? 1;
    for (let i = 0; i < N; i++) {
      const r = (k) => hash(b.at + b.pos[0] * 3.1 + b.pos[2], i, k);
      const p0 = spread(b, i);
      if (b.kind === "dust") {
        // a puff of dry mud that bursts out, slows and settles as it thins
        const life = 1.0 + r(4) * 1.2, t = (f - b.at) / FPS - r(5) * 0.06;
        if (t < 0 || t > life) continue;
        const a = r(6) * Math.PI * 2, sp = (0.6 + r(7) * 1.4) * size, k = 3;
        const drag = (1 - Math.exp(-k * t)) / k;
        const pos = [p0[0] + Math.cos(a) * sp * drag, p0[1] + 0.5 * (0.5 + r(8)) * size * drag + 0.1 * t, p0[2] + Math.sin(a) * sp * drag];
        const u = t / life;
        put("softs", pos, (0.08 + 0.3 * Math.sqrt(u)) * size * (0.7 + r(9) * 0.6), TINT.dust, 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.5 + 0.05)) * (1 - u));
      } else if (b.kind === "spray" || b.kind === "sacks") {
        // clods of mud (or torn sandbag) thrown in an arc, landing and lying a moment
        const life = 1.0 + r(4) * 0.5, t = (f - b.at) / FPS - r(5) * 0.05;
        if (t < 0 || t > life + (b.kind === "sacks" ? 1.5 : 0.4)) continue;
        const dir = b.dir ?? [0, 1.2, 0];
        const v = [dir[0] * (1 + r(6)) + (r(7) - 0.5) * 3, dir[1] * (1.6 + r(8) * 2.4), dir[2] * (1 + r(6)) + (r(9) - 0.5) * 3].map((x) => x * size);
        const tt = Math.min(t, life);
        let y = p0[1] + v[1] * tt + 0.5 * G * tt * tt;
        const floorY = b.floor ?? 0;
        if (y < floorY) y = floorY;
        const s = b.kind === "sacks" ? [0.16, 0.08, 0.1] : (0.03 + r(10) * 0.06) * size;
        put("solids", [p0[0] + v[0] * tt, y, p0[2] + v[2] * tt], s, b.kind === "sacks" ? TINT.sacks : TINT.spray, 1);
      } else if (b.kind === "smoke" || b.kind === "haze") {
        if (f < b.at || f >= b.end + 50) continue;
        const life = b.life ?? 2.2, t = ((f - b.at) / FPS + r(4) * life) % life;
        const born = (f - b.at) / FPS - t;
        if (b.kind === "smoke" && (born < -0.01 || born > (b.end - b.at) / FPS)) continue;
        const u = t / life;
        const to = b.to ?? b.pos;
        const k = Math.sqrt(u);
        const pos = [0, 1, 2].map((j) => p0[j] + (to[j] + (r(5 + j) * 2 - 1) * (b.toBox?.[j] ?? 0.3) - p0[j]) * k);
        const grow = b.kind === "haze" ? 0.6 + 0.4 * u : 0.2 + 0.5 * u;
        const ramp = b.kind === "haze" ? 1 : Math.min(1, (f - b.at) / 3) * (f > b.end ? Math.max(0, 1 - (f - b.end) / 50) : 1);
        put("softs", pos, grow * size, TINT[b.kind], (b.opacity ?? 0.3) * Math.sin(Math.PI * u) * ramp);
      } else if (b.kind === "flash") {
        // the fireball: a few hot blobs that swell and die in a third of a second
        const t = (f - b.at) / FPS;
        if (t < 0 || t > 0.4) continue;
        const u = t / 0.4;
        const a = r(4) * Math.PI * 2, e = r(5) * Math.PI;
        const d = (0.15 + 0.6 * u) * size * r(6);
        const pos = [p0[0] + Math.cos(a) * Math.sin(e) * d, p0[1] + Math.cos(e) * d * 0.7 + u * 0.4 * size, p0[2] + Math.sin(a) * Math.sin(e) * d];
        put("hots", pos, (0.2 + 0.5 * u) * size * (0.6 + r(7) * 0.6), i < 3 ? TINT.flashCore : TINT.flash, (1 - u) * (1 - u));
      } else if (b.kind === "sparks") {
        const life = 0.25 + r(4) * 0.25, t = (f - b.at) / FPS;
        if (t < 0 || t > life) continue;
        const v = [(r(5) - 0.3) * 5, r(6) * 4, (r(7) - 0.5) * 4];
        const pos = [p0[0] + v[0] * t, p0[1] + v[1] * t + 0.5 * G * t * t, p0[2] + v[2] * t];
        put("hots", pos, [0.006, 0.006, 0.02], TINT.sparks, 1 - t / life, [v[0] * 0.02, (v[1] + G * t) * 0.02, v[2] * 0.02]);
      } else if (b.kind === "flies") {
        // a few flies looping round a carcass
        if (f < b.at || f >= b.end) continue;
        const t = f / FPS, sp = 1.4 + r(4) * 1.6, ph = r(5) * 6.28;
        const box = b.box ?? [1, 0.3, 0.6];
        const pos = [
          b.pos[0] + Math.sin(t * sp + ph) * box[0] * (0.5 + r(6) * 0.5),
          b.pos[1] + Math.sin(t * sp * 2.3 + ph * 2) * box[1],
          b.pos[2] + Math.cos(t * sp * 1.3 + ph) * box[2] * (0.5 + r(7) * 0.5),
        ];
        put("solids", pos, [0.022, 0.016, 0.03], TINT.flies, 1);
      }
    }
  };

  return (f, bursts = BURSTS) => {
    n.softs = n.solids = n.hots = 0;
    for (const b of bursts) emit(b, f);
    for (const [m, k] of [[softs, "softs"], [solids, "solids"], [hots, "hots"]]) {
      m.count = Math.min(MAX, n[k]);
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    }
    alpha.needsUpdate = true;
  };
}
