// Particle bursts for the film (anim.js BURSTS), as in the crypt lab: pure functions of the frame,
// every particle's path a hash of (burst, index). On bright snow additive puffs blow out, so soft
// things (snow puffs, smoke, the cold and warm air) are alpha-blended; only flames and glints add.
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
  snow: new THREE.Color(0xf4f7fb).multiplyScalar(1.7), // unlit: bright enough to match sunlit snow
  spray: new THREE.Color(0xf4f7fb),
  smoke: new THREE.Color(0x6d6a68),
  cold: new THREE.Color(0x7fbcff).multiplyScalar(1.3),
  warm: new THREE.Color(0xffd8b0).multiplyScalar(1.2),
  wind: new THREE.Color(0xffffff),
  drip: new THREE.Color(0xdfeeff),
  wisp: new THREE.Color(0xe8eef4).multiplyScalar(1.3),
  flame: new THREE.Color(0xff7a1e).multiplyScalar(1.7),
  flameCore: new THREE.Color(0xffa43a).multiplyScalar(1.9),
  flameTip: new THREE.Color(0xe8300a).multiplyScalar(1.3),
  lampflame: new THREE.Color(0xffb04a).multiplyScalar(3.5),
  glints: new THREE.Color(0xdff4ff).multiplyScalar(6),
};

export function buildFx(scene) {
  const make = (geo, mat, alphaAttr) => {
    const m = new THREE.InstancedMesh(geo, mat, MAX);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    if (alphaAttr) m.geometry.setAttribute("fxAlpha", alphaAttr);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    return m;
  };
  // soft: alpha-blended blobs that fade towards their silhouette; per-instance opacity
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
  const softMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  softMat.colorNode = color(1, 1, 1);
  softMat.opacityNode = instancedBufferAttribute(alpha).mul(normalView.z.clamp(0, 1).pow(1.6));
  softMat.mrtNode = NO_GBUFFER();
  const softs = make(new THREE.IcosahedronGeometry(1, 2), softMat, null);
  softs.geometry.setAttribute("fxAlpha", alpha);
  // solid: small opaque bits (thrown snow, drips)
  const solidMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
  const solids = make(new THREE.IcosahedronGeometry(1, 1), solidMat, null);
  // hot: additive glows (flames, glints)
  const hotMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  hotMat.colorNode = color(1, 1, 1).mul(normalView.z.clamp(0, 1).pow(2).add(float(0.15)));
  hotMat.mrtNode = NO_GBUFFER();
  const hots = make(new THREE.SphereGeometry(1, 10, 8), hotMat, null);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const n = { softs: 0, solids: 0, hots: 0 };
  const put = (which, pos, scale, col, fade, stretch) => {
    const mesh = which === "softs" ? softs : which === "solids" ? solids : hots;
    const i = n[which]++;
    if (i >= MAX) return;
    dummy.position.set(...pos);
    dummy.rotation.set(0, 0, 0);
    if (Array.isArray(scale)) dummy.scale.set(...scale); else dummy.scale.setScalar(scale);
    if (stretch) { // lie along a direction
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
      if (b.kind === "snow") {
        // a puff of powder that bursts out, slows (drag) and settles as it thins
        const life = 0.8 + r(4) * 1.0, t = (f - b.at) / FPS - r(5) * 0.06;
        if (t < 0 || t > life) continue;
        const a = r(6) * Math.PI * 2, sp = (0.8 + r(7) * 1.6) * size, k = 3;
        const drag = (1 - Math.exp(-k * t)) / k;
        const up = (b.up ?? 0.6) * (0.5 + r(8)) * size;
        const pos = [p0[0] + Math.cos(a) * sp * drag, p0[1] + up * drag - 0.15 * t * t, p0[2] + Math.sin(a) * sp * drag * (b.flat ?? 1)];
        const u = t / life;
        put("softs", pos, (0.06 + 0.22 * Math.sqrt(u)) * size * (0.7 + r(9) * 0.6), TINT.snow, 0.42 * Math.sin(Math.PI * Math.min(1, u * 1.5 + 0.05)) * (1 - u));
      } else if (b.kind === "spray") {
        // chunks of snow thrown in an arc (a shovelful, a collapse), landing and staying a moment
        const life = 0.9 + r(4) * 0.4, t = (f - b.at) / FPS - r(5) * 0.1;
        if (t < 0 || t > life) continue;
        const dir = b.dir ?? [0, 1, 0];
        const v = [dir[0] * (1 + r(6)) + (r(7) - 0.5) * 1.6, dir[1] * (1.4 + r(8) * 1.8), dir[2] * (1 + r(6)) + (r(9) - 0.5) * 1.6].map((x) => x * size);
        let y = p0[1] + v[1] * t + 0.5 * G * t * t;
        const floorY = b.floor ?? 0;
        if (y < floorY) y = floorY;
        put("solids", [p0[0] + v[0] * t * (y > floorY ? 1 : 0.9), y, p0[2] + v[2] * t], (0.03 + r(10) * 0.05) * size, TINT.spray, 1);
      } else if (b.kind === "smoke" || b.kind === "warm" || b.kind === "cold" || b.kind === "wisp") {
        // continuous haze from `at` to `end`: each blob is born, travels its path, and fades
        if (f < b.at || f >= b.end + 40) continue;
        const life = b.life ?? 2.2, t = ((f - b.at) / FPS + r(4) * life) % life;
        const born = (f - b.at) / FPS - t;
        if (born < -0.01 || born > (b.end - b.at) / FPS) continue;
        const u = t / life;
        const to = b.to ?? b.pos;
        const k = b.kind === "cold" ? u * u : Math.sqrt(u); // cold air falls and pools; warm air rises and slows
        const pos = [0, 1, 2].map((j) => p0[j] + (to[j] + (r(5 + j) * 2 - 1) * (b.toBox?.[j] ?? 0.3) - p0[j]) * k);
        pos[0] += Math.sin(t * 1.3 + r(9) * 6) * 0.08;
        const grow = b.kind === "wisp" ? 0.05 + 0.25 * u : 0.18 + 0.32 * u;
        const ramp = Math.min(1, (f - b.at) / 20) * (f > b.end ? Math.max(0, 1 - (f - b.end) / 40) : 1);
        put("softs", pos, grow * size, TINT[b.kind], (b.opacity ?? 0.3) * Math.sin(Math.PI * u) * ramp);
      } else if (b.kind === "wind") {
        // streaks blowing in through the door and across the floor
        if (f < b.at || f >= b.end) continue;
        const life = 0.45 + r(4) * 0.3, t = ((f - b.at) / FPS + r(5) * life) % life;
        const u = t / life;
        const pos = [lerp(b.pos[0], b.to[0], u), p0[1] + Math.sin(u * 7 + r(6) * 6) * 0.05, p0[2]];
        put("softs", pos, [0.005 * size, 0.005 * size, 0.07 * size], TINT.wind, 0.4 * Math.sin(Math.PI * u), [b.to[0] - b.pos[0], 0, 0.0001]);
      } else if (b.kind === "flame" || b.kind === "lampflame") {
        // tongues of flame licking up from `pos` (box spreads them), flickering
        if (f < b.at || f >= b.end) continue;
        const life = 0.35 + r(4) * 0.3, t = ((f - b.at) / FPS + r(5) * life) % life;
        const u = t / life, hgt = (b.height ?? 0.5) * (0.6 + r(6) * 0.6);
        const pos = [p0[0] + Math.sin(t * 9 + r(7) * 6) * 0.03 * size, p0[1] + hgt * u, p0[2] + Math.cos(t * 8 + r(8) * 6) * 0.03 * size];
        const s = (b.kind === "lampflame" ? 0.018 : 0.06) * size * (1 - u * 0.75);
        const col = b.kind === "lampflame" ? TINT.lampflame : u < 0.4 ? tint2.copy(TINT.flameCore).lerp(TINT.flame, u / 0.4) : tint2.copy(TINT.flame).lerp(TINT.flameTip, (u - 0.4) / 0.6);
        put("hots", pos, [s * 0.8, s * 2.8, s * 0.8], col, Math.sin(Math.PI * Math.min(1, u * 1.3 + 0.1)) * (b.bright ?? 1) * Math.min(1, (f - b.at) / 6));
      } else if (b.kind === "drip") {
        // meltwater dripping off the roof
        if (f < b.at || f >= b.end) continue;
        const period = 0.6 + r(4) * 0.9, t = ((f - b.at) / FPS + r(5) * period) % period;
        const hang = 0.25 * period;
        const y = t < hang ? p0[1] - 0.02 * (t / hang) : p0[1] - 0.02 + 0.5 * G * (t - hang) * (t - hang);
        if (y < (b.floor ?? 0)) continue;
        put("solids", [p0[0], y, p0[2]], [0.018, t < hang ? 0.03 : 0.045, 0.018], TINT.drip, 1);
      } else if (b.kind === "glints") {
        if (f < b.at || f >= b.end) continue;
        const period = 0.7 + r(4) * 0.6, t = ((f - b.at) / FPS + r(5) * period) % period;
        const cycle = Math.floor(((f - b.at) / FPS + r(5) * period) / period);
        const q = (k) => hash(b.at + cycle, i, k);
        const box = b.box ?? [0, 0, 0];
        const pos = [0, 1, 2].map((k) => b.pos[k] + (q(k + 1) * 2 - 1) * box[k]);
        const tw = Math.sin(Math.PI * (t / period));
        put("hots", pos, 0.014 * tw, TINT.glints, tw * tw * Math.min(1, (f - b.at) / 8));
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

const lerp = (a, b, t) => a + (b - a) * t;
const tint2 = new THREE.Color();
