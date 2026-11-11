// Particle bursts for the film (anim.js BURSTS), the lab's take on the kit's fx (dust, sparks, magic).
// Pure functions of the frame: every particle's path comes from a hash of (burst, index), so any
// frame renders the same way on its own. Two instanced meshes, both additive: soft puffs (dust,
// frost) and hot bits (sparks, ice shards, glints, the mage's stream).
import * as THREE from "three/webgpu";
import { color, normalView, mrt, vec4 } from "three/tsl";
import { BURSTS, FPS } from "./anim.js";

const MAX = 2000;
export const NO_GBUFFER = () => mrt({ diffuseColor: vec4(0), normal: vec4(0), velocity: vec4(0) });
const G = -9.8;
const hash = (a, b, k) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

const TINT = {
  dust: new THREE.Color(0xb59d7c).multiplyScalar(0.22),
  frost: new THREE.Color(0xbfe6ff).multiplyScalar(0.14),
  sparks: new THREE.Color(0xffa040).multiplyScalar(9),
  shards: new THREE.Color(0xd8f2ff).multiplyScalar(2.2),
  glints: new THREE.Color(0xffd070).multiplyScalar(7),
  ice: new THREE.Color(0x9fe4ff).multiplyScalar(6),
  stream: new THREE.Color(0x8fdcff).multiplyScalar(6),
  fire: new THREE.Color(0xff7a20).multiplyScalar(8),
  splinter: new THREE.Color(0xe8d6a8).multiplyScalar(2),
  burp: new THREE.Color(0xc9b8e8).multiplyScalar(3),
  // boulder hallway
  slime: new THREE.Color(0x6eff3a).multiplyScalar(0.3),
  jelly: new THREE.Color(0x7dffa6).multiplyScalar(5),
  arc: new THREE.Color(0x7fd8ff).multiplyScalar(9),
  // crushing room
  magic: new THREE.Color(0xc07aff).multiplyScalar(3.5),
  grease: new THREE.Color(0x6a4a16).multiplyScalar(0.25),
  smoke: new THREE.Color(0x6a6560).multiplyScalar(0.18),
};

export function buildFx(scene) {
  const soft = (geo, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, MAX);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    return m;
  };
  // puffs: spheres that fade towards their silhouette, so they read as soft blobs
  const puffMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  puffMat.colorNode = color(1, 1, 1).mul(normalView.z.clamp(0, 1).pow(5));
  // additive glows add light to the picture but must leave the G-buffer (diffuse, normal, velocity)
  // alone, or SSGI reads them as dark solid blobs
  puffMat.mrtNode = NO_GBUFFER();
  const puffs = soft(new THREE.IcosahedronGeometry(1, 2), puffMat);
  const hotMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  hotMat.colorNode = color(1, 1, 1);
  hotMat.mrtNode = NO_GBUFFER();
  const hots = soft(new THREE.SphereGeometry(1, 8, 6), hotMat);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let nPuff = 0, nHot = 0;
  const put = (mesh, pos, scale, col, fade, vel) => {
    const i = mesh === puffs ? nPuff++ : nHot++;
    if (i >= MAX) return;
    dummy.position.set(...pos);
    dummy.scale.setScalar(scale);
    dummy.rotation.set(0, 0, 0);
    if (vel) { // streak along the velocity
      const sp = Math.hypot(...vel);
      dummy.lookAt(pos[0] + vel[0], pos[1] + vel[1], pos[2] + vel[2]);
      dummy.scale.set(scale, scale, scale * (1 + sp * 2.2));
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tint.copy(col).multiplyScalar(fade));
  };

  const spread = (b, i) => {
    const box = b.box ?? [0, 0, 0];
    return [
      b.pos[0] + (hash(b.at, i, 1) * 2 - 1) * box[0],
      b.pos[1] + (hash(b.at, i, 2) * 2 - 1) * box[1],
      b.pos[2] + (hash(b.at, i, 3) * 2 - 1) * box[2],
    ];
  };

  const emit = (b, f) => {
    const n = b.n ?? 20, size = b.size ?? 1;
    for (let i = 0; i < n; i++) {
      const r = (k) => hash(b.at + b.pos[2], i, k);
      const p0 = spread(b, i);
      if (b.kind === "dust" || b.kind === "frost") {
        // a puff that rolls out low, slows (drag) and lifts as it fades
        const life = 0.9 + r(4) * 0.9, t = (f - b.at) / FPS - r(5) * 0.08;
        if (t < 0 || t > life) continue;
        const a = r(6) * Math.PI * 2, sp = (0.6 + r(7) * 1.2) * size, k = 3.2;
        const drag = (1 - Math.exp(-k * t)) / k;
        const pos = [p0[0] + Math.cos(a) * sp * drag, p0[1] + (0.25 + r(8) * 0.5) * size * drag + 0.12 * t, p0[2] + Math.sin(a) * sp * drag];
        const u = t / life;
        put(puffs, pos, (0.07 + 0.28 * Math.sqrt(u)) * size * (0.7 + r(9) * 0.6), TINT[b.tint ?? b.kind], Math.sin(Math.PI * Math.min(1, u * 1.6 + 0.05)) * (1 - u));
      } else if (b.kind === "sparks" || b.kind === "shards") {
        // ballistic bits fanning upward, bouncing off the floor once
        const life = (b.kind === "sparks" ? 0.3 : 0.6) + r(4) * 0.35, t = (f - b.at) / FPS;
        if (t < 0 || t > life) continue;
        const a = r(6) * Math.PI * 2, up = b.kind === "sparks" ? 2.2 + r(7) * 3 : 1.6 + r(7) * 2.4;
        const out = b.kind === "sparks" ? 0.8 + r(8) * 2.4 : 0.4 + r(8) * 1.2;
        const v = [Math.cos(a) * out, up, Math.sin(a) * out];
        let y = p0[1] + v[1] * t + 0.5 * G * t * t, vy = v[1] + G * t;
        if (b.kind === "shards" && y < p0[1]) { y = p0[1] + Math.abs(y - p0[1]) * 0.25; vy = 0; }
        const pos = [p0[0] + v[0] * t, y, p0[2] + v[2] * t];
        const u = t / life;
        put(hots, pos, (b.kind === "sparks" ? 0.012 : 0.025 + r(9) * 0.02), TINT[b.tint ?? b.kind], 1 - u * u, b.kind === "sparks" ? [v[0], vy, v[2]].map((x) => x * 0.03) : null);
      } else if (b.kind === "glints") {
        // twinkles that keep popping around the subject, each on its own cycle
        if (f < b.at || f >= b.end) continue;
        const period = 0.7 + r(4) * 0.6, t = ((f - b.at) / FPS + r(5) * period) % period;
        const cycle = Math.floor(((f - b.at) / FPS + r(5) * period) / period);
        const q = (k) => hash(b.at + cycle, i, k);
        const box = b.box ?? [0, 0, 0];
        const pos = [b.pos[0] + (q(1) * 2 - 1) * box[0], b.pos[1] + (q(2) * 2 - 1) * box[1] + t * 0.15, b.pos[2] + (q(3) * 2 - 1) * box[2]];
        const tw = Math.sin(Math.PI * (t / period));
        put(hots, pos, 0.018 * tw, TINT[b.tint ?? "glints"], tw * tw * Math.min(1, (f - b.at) / 8));
      } else if (b.kind === "stream") {
        // motes spiralling from the staff down to the target
        if (f < b.at || f >= b.end + 12) continue;
        const life = 0.55, t = ((f - b.at) / FPS + (i / n) * life) % life;
        const born = (f - b.at) / FPS - t;
        if (born < 0 || born > (b.end - b.at) / FPS) continue;
        const u = t / life, sw = 0.18 * Math.sin(u * Math.PI);
        const a = u * 9 + r(4) * Math.PI * 2;
        const to = [b.to[0] + (r(5) * 2 - 1) * AISLE_HALF, b.to[1], b.to[2] + (r(6) * 2 - 1) * 1.2];
        const pos = [0, 1, 2].map((k) => b.pos[k] + (to[k] - b.pos[k]) * u * u);
        pos[0] += Math.cos(a) * sw;
        pos[1] += Math.sin(a) * sw + 0.5 * Math.sin(Math.PI * u);
        put(hots, pos, 0.022 * (1 - 0.5 * u), TINT.stream, 1 - u * 0.6);
      }
    }
  };

  // update(frame, bursts): the film passes its beat-keyed list, the game its own
  return (f, bursts = BURSTS) => {
    nPuff = nHot = 0;
    for (const b of bursts) emit(b, f);
    for (const [m, n] of [[puffs, nPuff], [hots, nHot]]) {
      m.count = Math.min(MAX, n);
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    }
  };
}

const AISLE_HALF = 2.2; // how wide the mage's stream fans out over the trapdoor
