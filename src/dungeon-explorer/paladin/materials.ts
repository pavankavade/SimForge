// Paladin materials: PBR steel, riveted mail, cloth, leather and gilt, all from procedural textures
// (no external files). A small generated environment gives the metal something to reflect.
import * as THREE from "three";

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise, `freq` lattice cells across the tile. */
function tileNoise(size: number, freq: number, seed: number): Float32Array {
  const rnd = mulberry(seed);
  const lat = new Float32Array(freq * freq);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * freq;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * freq;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const a = lat[(y0 % freq) * freq + (x0 % freq)];
      const b = lat[(y0 % freq) * freq + ((x0 + 1) % freq)];
      const c = lat[((y0 + 1) % freq) * freq + (x0 % freq)];
      const d = lat[((y0 + 1) % freq) * freq + ((x0 + 1) % freq)];
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

function fbm(size: number, base: number, octaves: number, seed: number): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = tileNoise(size, base << o, seed + o * 17);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function dataTex(size: number, fill: (i: number, px: Uint8Array, o: number) => void, srgb: boolean): THREE.DataTexture {
  const px = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4 + 3] = 255;
    fill(i, px, i * 4);
  }
  const t = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Tangent-space normal map from a tileable height field. */
function normalTex(size: number, h: Float32Array, strength: number): THREE.DataTexture {
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  return dataTex(
    size,
    (i, px, o) => {
      const x = i % size;
      const y = Math.floor(i / size);
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.sqrt(dx * dx + dy * dy + 1);
      px[o] = Math.round((-dx / l) * 127.5 + 127.5);
      px[o + 1] = Math.round((-dy / l) * 127.5 + 127.5);
      px[o + 2] = Math.round((1 / l) * 127.5 + 127.5);
    },
    false
  );
}

const u8 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

interface MapSet {
  map: THREE.Texture;
  orm: THREE.Texture;
  normal: THREE.Texture;
}

/** Worked steel: fine scratches, soft hammer marks, darker patina in the low spots. */
function steelMaps(): MapSet {
  const S = 512;
  const rnd = mulberry(91);
  const blotch = fbm(S, 4, 4, 3);
  const fine = fbm(S, 32, 3, 9);
  const dents = fbm(S, 9, 2, 21);
  const scratch = new Float32Array(S * S);
  for (let k = 0; k < 520; k++) {
    let x = rnd() * S;
    let y = rnd() * S;
    const a = rnd() < 0.7 ? (rnd() - 0.5) * 0.5 + Math.PI / 2 : rnd() * Math.PI;
    const len = 12 + rnd() * 90;
    const depth = 0.25 + rnd() * 0.75;
    for (let s = 0; s < len; s++) {
      x += Math.cos(a);
      y += Math.sin(a);
      const i = ((Math.floor(y) + S * 4) % S) * S + ((Math.floor(x) + S * 4) % S);
      scratch[i] = Math.max(scratch[i], depth * (1 - Math.abs(s / len - 0.5) * 1.6));
    }
  }
  const height = new Float32Array(S * S);
  for (let i = 0; i < height.length; i++) height[i] = dents[i] * 0.55 + fine[i] * 0.07 - scratch[i] * 0.06;
  return {
    map: dataTex(
      S,
      (i, px, o) => {
        const patina = Math.max(0, 0.52 - blotch[i]) * 1.7;
        const v = 0.82 + blotch[i] * 0.2 - patina * 0.3 + scratch[i] * 0.08;
        px[o] = u8(v * (1 - patina * 0.04));
        px[o + 1] = u8(v * (1 - patina * 0.12));
        px[o + 2] = u8(v * (1 - patina * 0.24));
      },
      true
    ),
    orm: dataTex(
      S,
      (i, px, o) => {
        const patina = Math.max(0, 0.52 - blotch[i]) * 1.7;
        px[o] = 255;
        px[o + 1] = u8(0.36 + blotch[i] * 0.3 + patina * 0.55 + scratch[i] * 0.28 + fine[i] * 0.14);
        px[o + 2] = u8(1 - patina * 0.35);
      },
      false
    ),
    normal: normalTex(S, height, 5.5),
  };
}

/** Riveted mail: staggered rows of interlocking rings over a dark padded backing. */
function mailMaps(): MapSet {
  const S = 256;
  const cols = 10;
  const rows = 16;
  const cw = S / cols;
  const ch = S / rows;
  const height = new Float32Array(S * S);
  const mask = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let best = 0;
      const row0 = Math.floor(y / ch);
      for (let dr = -1; dr <= 1; dr++) {
        const r = row0 + dr;
        const off = ((r % 2) + 2) % 2 === 0 ? 0 : cw / 2;
        const cy = (r + 0.5) * ch;
        const col0 = Math.floor((x - off) / cw);
        for (let dc = -1; dc <= 1; dc++) {
          const cx = (col0 + dc + 0.5) * cw + off;
          // Rings lean alternately left and right, like real 4-in-1 mail.
          const lean = ((r % 2) + 2) % 2 === 0 ? 0.35 : -0.35;
          const px = (x - cx) / (cw * 0.62);
          const py = (y - cy + (x - cx) * lean) / (ch * 0.95);
          const d = Math.abs(Math.sqrt(px * px + py * py) - 0.72);
          const ringH = Math.max(0, 1 - d / 0.27);
          if (ringH > best) best = ringH;
        }
      }
      const i = y * S + x;
      mask[i] = Math.min(1, best * 2.2);
      height[i] = Math.sqrt(best);
    }
  }
  const grime = fbm(S, 6, 3, 44);
  return {
    map: dataTex(
      S,
      (i, px, o) => {
        const v = 0.06 + mask[i] * (0.52 + grime[i] * 0.22);
        px[o] = u8(v);
        px[o + 1] = u8(v * 0.99);
        px[o + 2] = u8(v * 0.97);
      },
      true
    ),
    orm: dataTex(
      S,
      (i, px, o) => {
        px[o] = 255;
        px[o + 1] = u8(0.95 - mask[i] * (0.5 - grime[i] * 0.2));
        px[o + 2] = u8(mask[i]);
      },
      false
    ),
    normal: normalTex(S, height, 3.2),
  };
}

/** Plain-weave cloth normal (also reused, coarser, for leather grain). */
function weaveNormal(threads: number, rough: number, seed: number): THREE.Texture {
  const S = 256;
  const n = fbm(S, 16, 3, seed);
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * threads * Math.PI * 2;
      const v = (y / S) * threads * Math.PI * 2;
      h[y * S + x] = (Math.sin(u) * Math.sin(v) * 0.5 + 0.5) * (1 - rough) + n[y * S + x] * rough;
    }
  }
  return normalTex(S, h, 2.2);
}

function leatherMaps(): MapSet {
  const S = 256;
  const a = fbm(S, 8, 4, 71);
  const cells = fbm(S, 40, 2, 5);
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.5 + Math.abs(cells[i] - 0.5) * 0.9;
  return {
    map: dataTex(
      S,
      (i, px, o) => {
        const v = 0.72 + a[i] * 0.5;
        px[o] = u8(0.3 * v);
        px[o + 1] = u8(0.17 * v);
        px[o + 2] = u8(0.09 * v);
      },
      true
    ),
    orm: dataTex(
      S,
      (i, px, o) => {
        px[o] = 255;
        px[o + 1] = u8(0.5 + a[i] * 0.35);
        px[o + 2] = 0;
      },
      false
    ),
    normal: normalTex(S, h, 2.6),
  };
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function speckle(c: CanvasRenderingContext2D, w: number, h: number, seed: number, alpha: number): void {
  const rnd = mulberry(seed);
  for (let k = 0; k < 1400; k++) {
    const dark = rnd() < 0.6;
    c.fillStyle = dark ? `rgba(20,8,6,${alpha * rnd()})` : `rgba(255,236,210,${alpha * 0.6 * rnd()})`;
    const s = 1 + rnd() * 6;
    c.fillRect(rnd() * w, rnd() * h, s * (0.4 + rnd() * 2.4), s * 0.5);
  }
}

/** A radiant sun-cross: the paladin's device, shared by shield, tabard and cape. */
function sunCross(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, gold: string, shade: string): void {
  c.save();
  c.translate(cx, cy);
  c.fillStyle = gold;
  c.strokeStyle = shade;
  c.lineWidth = r * 0.05;
  for (let k = 0; k < 16; k++) {
    const long = k % 2 === 0;
    c.save();
    c.rotate((k / 16) * Math.PI * 2);
    c.beginPath();
    c.moveTo(-r * 0.09, -r * 0.42);
    c.lineTo(0, -r * (long ? 1 : 0.72));
    c.lineTo(r * 0.09, -r * 0.42);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
  c.beginPath();
  c.arc(0, 0, r * 0.46, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = shade;
  const t = r * 0.085;
  c.fillRect(-t, -r * 0.34, t * 2, r * 0.68);
  c.fillRect(-r * 0.27, -r * 0.1 - t, r * 0.54, t * 2);
  c.restore();
}

const CRIMSON = "#7c1418";
const CRIMSON_DARK = "#4f0b10";
const GILT = "#d8a53c";
const GILT_DARK = "#7a5413";
const IVORY = "#d9cfb8";

function shieldFace(): THREE.Texture {
  return canvasTex(512, 640, (c) => {
    c.fillStyle = IVORY;
    c.fillRect(0, 0, 512, 640);
    // Crimson cross on ivory, gilt sun at the crossing.
    c.fillStyle = CRIMSON;
    c.fillRect(206, 0, 100, 640);
    c.fillRect(0, 170, 512, 100);
    c.strokeStyle = GILT_DARK;
    c.lineWidth = 5;
    c.strokeRect(206, -10, 100, 660);
    c.strokeRect(-10, 170, 532, 100);
    sunCross(c, 256, 220, 96, GILT, GILT_DARK);
    speckle(c, 512, 640, 7, 0.28);
    // Old cuts across the paint.
    const rnd = mulberry(202);
    c.strokeStyle = "rgba(40,30,24,0.55)";
    for (let k = 0; k < 9; k++) {
      c.lineWidth = 1 + rnd() * 2.5;
      const x = rnd() * 512;
      const y = rnd() * 640;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rnd() - 0.5) * 150, y + (rnd() - 0.2) * 120);
      c.stroke();
    }
  });
}

function capeFace(): THREE.Texture {
  return canvasTex(512, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, CRIMSON);
    g.addColorStop(1, CRIMSON_DARK);
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 1024);
    c.strokeStyle = GILT;
    c.lineWidth = 16;
    c.strokeRect(26, -40, 460, 1036);
    c.lineWidth = 4;
    c.strokeRect(50, -40, 412, 1012);
    sunCross(c, 256, 430, 130, GILT, GILT_DARK);
    speckle(c, 512, 1024, 12, 0.2);
    // Mud and fraying toward the hem.
    const hem = c.createLinearGradient(0, 820, 0, 1024);
    hem.addColorStop(0, "rgba(25,14,10,0)");
    hem.addColorStop(1, "rgba(25,14,10,0.7)");
    c.fillStyle = hem;
    c.fillRect(0, 820, 512, 204);
  });
}

function tabardFace(): THREE.Texture {
  return canvasTex(256, 512, (c) => {
    c.fillStyle = CRIMSON;
    c.fillRect(0, 0, 256, 512);
    c.strokeStyle = GILT;
    c.lineWidth = 12;
    c.strokeRect(14, -30, 228, 528);
    sunCross(c, 128, 230, 70, GILT, GILT_DARK);
    speckle(c, 256, 512, 31, 0.22);
    const hem = c.createLinearGradient(0, 400, 0, 512);
    hem.addColorStop(0, "rgba(25,14,10,0)");
    hem.addColorStop(1, "rgba(25,14,10,0.6)");
    c.fillStyle = hem;
    c.fillRect(0, 400, 256, 112);
  });
}

function woodBack(): THREE.Texture {
  return canvasTex(256, 320, (c) => {
    c.fillStyle = "#5a3d24";
    c.fillRect(0, 0, 256, 320);
    const rnd = mulberry(77);
    for (let x = 0; x < 256; x++) {
      const plank = Math.floor(x / 52);
      c.fillStyle = `rgba(${20 + plank * 6},${12 + plank * 3},6,${0.1 + rnd() * 0.3})`;
      c.fillRect(x, 0, 1, 320);
    }
    c.fillStyle = "rgba(10,6,3,0.8)";
    for (let x = 52; x < 256; x += 52) c.fillRect(x, 0, 2, 320);
  });
}

/** A dim torch-lit room for the metal to reflect: warm lights low, cool fill above. */
function buildEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 lo = vec3(0.03,0.024,0.02); vec3 mid = vec3(0.07,0.062,0.055); vec3 hi = vec3(0.035,0.045,0.06); vec3 c = h < 0.0 ? mix(mid, lo, -h) : mix(mid, hi, h); gl_FragColor = vec4(c, 1.0); }",
    })
  );
  scene.add(shell);
  const panel = (color: number, power: number, pos: [number, number, number], size: [number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide })
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(0xffb066, 16, [9, 3, 6], [2.4, 5]);
  panel(0xffc890, 12, [-10, 2, -3], [2.4, 5]);
  panel(0xff9a50, 10, [-3, 1, 11], [2, 4]);
  panel(0x9fc2ff, 5, [2, 12, -6], [7, 7]);
  panel(0xdfe8ff, 4, [0, 6, -12], [5, 2.5]);
  panel(0xffd9a8, 6, [5, -2, -9], [6, 2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035, 0.1, 60);
  pmrem.dispose();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  });
  return target.texture;
}

export type MatKey = "steel" | "mail" | "gold" | "leather" | "dark" | "cloth";

export interface PaladinMaterials {
  skinned: Record<MatKey, THREE.MeshStandardMaterial>;
  blade: THREE.MeshStandardMaterial;
  shieldFace: THREE.MeshStandardMaterial;
  shieldBack: THREE.MeshStandardMaterial;
  cape: THREE.MeshStandardMaterial;
  tabard: THREE.MeshStandardMaterial;
  all: THREE.MeshStandardMaterial[];
  setEnvIntensity: (v: number) => void;
  dispose: () => void;
}

export function createPaladinMaterials(renderer: THREE.WebGLRenderer): PaladinMaterials {
  const env = buildEnvironment(renderer);
  const steel = steelMaps();
  const mail = mailMaps();
  const leather = leatherMaps();
  const weave = weaveNormal(24, 0.25, 8);
  const textures: THREE.Texture[] = [env, steel.map, steel.orm, steel.normal, mail.map, mail.orm, mail.normal, leather.map, leather.orm, leather.normal, weave];

  const std = (p: THREE.MeshStandardMaterialParameters) =>
    new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: 1, side: THREE.DoubleSide, ...p });

  const skinned: Record<MatKey, THREE.MeshStandardMaterial> = {
    steel: std({
      color: 0xb6bac1,
      map: steel.map,
      roughnessMap: steel.orm,
      metalnessMap: steel.orm,
      normalMap: steel.normal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.66,
      metalness: 1,
    }),
    mail: std({
      color: 0xaeb2b8,
      map: mail.map,
      roughnessMap: mail.orm,
      metalnessMap: mail.orm,
      normalMap: mail.normal,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 1,
      metalness: 1,
    }),
    gold: std({
      color: 0xd9a441,
      roughnessMap: steel.orm,
      normalMap: steel.normal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.62,
      metalness: 1,
    }),
    leather: std({
      map: leather.map,
      roughnessMap: leather.orm,
      normalMap: leather.normal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.4,
    }),
    dark: std({ color: 0x050506, roughness: 1, metalness: 0, envMapIntensity: 0 }),
    cloth: std({ color: 0x6a1216, roughness: 0.92, metalness: 0, normalMap: weave, envMapIntensity: 0.3 }),
  };
  mail.map.repeat.set(5, 5);
  mail.orm.repeat.set(5, 5);
  mail.normal.repeat.set(5, 5);
  leather.map.repeat.set(3, 3);
  leather.orm.repeat.set(3, 3);
  leather.normal.repeat.set(3, 3);

  const blade = std({
    color: 0xe2e6ec,
    roughnessMap: steel.orm,
    normalMap: steel.normal,
    normalScale: new THREE.Vector2(0.15, 0.15),
    roughness: 0.42,
    metalness: 1,
    envMapIntensity: 1.25,
  });

  const face = shieldFace();
  const back = woodBack();
  const capeMap = capeFace();
  const tabardMap = tabardFace();
  const clothWeave = weave.clone();
  clothWeave.repeat.set(14, 28);
  clothWeave.needsUpdate = true;
  textures.push(face, back, capeMap, tabardMap, clothWeave);

  const shieldFaceMat = std({ map: face, roughness: 0.62, metalness: 0.05, normalMap: steel.normal, normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.6 });
  const shieldBackMat = std({ map: back, roughness: 0.85, metalness: 0, envMapIntensity: 0.3 });
  const cape = std({ map: capeMap, roughness: 0.9, metalness: 0, normalMap: clothWeave, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.3 });
  const tabard = std({ map: tabardMap, roughness: 0.9, metalness: 0, normalMap: clothWeave, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.3 });

  const all = [skinned.steel, skinned.mail, skinned.gold, skinned.leather, skinned.dark, skinned.cloth, blade, shieldFaceMat, shieldBackMat, cape, tabard];
  const base = all.map((m) => m.envMapIntensity);

  return {
    skinned,
    blade,
    shieldFace: shieldFaceMat,
    shieldBack: shieldBackMat,
    cape,
    tabard,
    all,
    setEnvIntensity(v: number) {
      all.forEach((m, i) => {
        m.envMapIntensity = base[i] * v;
      });
    },
    dispose() {
      for (const m of all) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
