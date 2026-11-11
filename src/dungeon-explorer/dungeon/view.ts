// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).
import * as THREE from "three";
import type { CryptLamp, CryptViewTarget } from "./crypt";
import { floorAt } from "./floors";
import type { DungeonData } from "./generator";
import { CEIL_TOP, type InstanceBuffer, type LevelData } from "./level";
import type { ProceduralTextureData } from "./masonry";
import { THEMES, type ThemeName } from "./themes";

export const CELL_M = 1.5;
const LIGHT_K = 4 * Math.PI;
const SEE_THROUGH = 1;
const EARLY_Z = 5;

function bgFromTris(v: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(v), 3));
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) + p.getZ(i)) * 0.53 + 0.5;
    uv[i * 2 + 1] = p.getY(i) * 0.61 + (p.getX(i) - p.getZ(i)) * 0.21;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function chamferBox(w: number, h: number, d: number, ch: number) {
  const hw = w / 2;
  const hd = d / 2;
  const iw = Math.max(0.01, hw - ch);
  const id = Math.max(0.01, hd - ch);
  const hb = Math.max(0.01, h - ch);
  const v: number[] = [];
  const q = (a: number[], b: number[], c: number[], e: number[]) => v.push(...a, ...b, ...c, ...a, ...c, ...e);
  const b0 = [-hw, 0, -hd];
  const b1 = [hw, 0, -hd];
  const b2 = [hw, 0, hd];
  const b3 = [-hw, 0, hd];
  const m0 = [-hw, hb, -hd];
  const m1 = [hw, hb, -hd];
  const m2 = [hw, hb, hd];
  const m3 = [-hw, hb, hd];
  const t0 = [-iw, h, -id];
  const t1 = [iw, h, -id];
  const t2 = [iw, h, id];
  const t3 = [-iw, h, id];
  q(b1, b0, m0, m1);
  q(b3, b2, m2, m3);
  q(b2, b1, m1, m2);
  q(b0, b3, m3, m0);
  q(m1, m0, t0, t1);
  q(m3, m2, t2, t3);
  q(m2, m1, t1, t2);
  q(m0, m3, t3, t0);
  q(t3, t2, t1, t0);
  q(b0, b1, b2, b3);
  return bgFromTris(v);
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _E = new THREE.Euler();

function xg(g: THREE.BufferGeometry, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy?: number, sz?: number) {
  const c = g.index ? g.toNonIndexed() : g.clone();
  _m.compose(
    _p.set(x, y, z),
    _q.setFromEuler(_E.set(rx, ry, rz)),
    _s.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz)
  );
  c.applyMatrix4(_m);
  return c;
}

function mergeGeos(list: THREE.BufferGeometry[]) {
  let vc = 0;
  for (const g of list) vc += g.attributes.position.count;
  const pos = new Float32Array(vc * 3);
  const nor = new Float32Array(vc * 3);
  const uv = new Float32Array(vc * 2);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

function makeGeometry() {
  const standShape = [
    [0.001, 0.08],
    [0.052, 0.082],
    [0.046, 0.102],
    [0.026, 0.125],
    [0.018, 0.16],
    [0.03, 0.178],
    [0.031, 0.198],
    [0.017, 0.222],
    [0.0135, 0.42],
    [0.022, 0.44],
    [0.037, 0.468],
    [0.022, 0.496],
    [0.0135, 0.52],
    [0.0125, 0.76],
    [0.021, 0.774],
    [0.029, 0.794],
    [0.021, 0.814],
    [0.0125, 0.83],
    [0.012, 0.925],
    [0.022, 0.948],
    [0.052, 0.966],
    [0.084, 0.984],
    [0.088, 1.0],
    [0.074, 1.003],
    [0.03, 0.994],
    [0.001, 0.992],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const legs: THREE.BufferGeometry[] = [];
  for (const i of [0, 1, 2]) {
    const a = i * 2.094;
    const at = (r: number, y: number): [number, number, number] => [Math.cos(a) * r, y, -Math.sin(a) * r];
    const p1 = at(0.075, 0.066);
    const p2 = at(0.178, 0.02);
    const p3 = at(0.228, 0.012);
    legs.push(
      xg(new THREE.BoxGeometry(0.15, 0.022, 0.026), p1[0], p1[1], p1[2], 0, a, -0.72, 1),
      xg(new THREE.BoxGeometry(0.1, 0.016, 0.028), p2[0], p2[1], p2[2], 0, a, -0.2, 1),
      xg(new THREE.SphereGeometry(0.02, 6, 4), p3[0], p3[1], p3[2], 0, 0, 0, 1, 0.6, 1)
    );
  }
  const stand = mergeGeos([new THREE.LatheGeometry(standShape, 14).toNonIndexed(), ...legs]);

  const waxShape = [
    [0.001, 0],
    [0.056, 0.001],
    [0.058, 0.007],
    [0.046, 0.013],
    [0.036, 0.022],
    [0.0315, 0.05],
    [0.03, 0.15],
    [0.0305, 0.24],
    [0.033, 0.262],
    [0.03, 0.272],
    [0.021, 0.268],
    [0.013, 0.258],
    [0.001, 0.254],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const wick = xg(new THREE.CylinderGeometry(0.0016, 0.002, 0.022, 4), 0, 0.264, 0, 0, 0, 0, 1);
  const body = new THREE.LatheGeometry(waxShape, 16).toNonIndexed();
  const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const a = Math.atan2(bp.getZ(i), bp.getX(i));
    const k = 1 + 0.05 * Math.sin(a * 3 + 1.3) * Math.min(1, bp.getY(i) / 0.1) + 0.03 * Math.sin(a * 7 + bp.getY(i) * 30);
    bp.setX(i, bp.getX(i) * k);
    bp.setZ(i, bp.getZ(i) * k);
  }
  body.computeVertexNormals();
  const streams: THREE.BufferGeometry[] = [];
  for (const [a, length] of [
    [0.4, 0.12],
    [1.5, 0.19],
    [2.3, 0.08],
    [3.5, 0.15],
    [4.4, 0.21],
    [5.4, 0.1],
  ]) {
    const x = Math.cos(a) * 0.031;
    const z = Math.sin(a) * 0.031;
    const top = 0.268;
    streams.push(
      xg(new THREE.CylinderGeometry(0.0055, 0.0085, length, 6), x, top - length / 2, z, 0, 0, 0, 1),
      xg(new THREE.SphereGeometry(0.0088, 6, 4), x, top - length, z, 0, 0, 0, 1, 1.6, 1)
    );
  }
  const standWax = mergeGeos([body, ...streams, wick]);

  const panShape = [
    [0.001, -0.012],
    [0.03, -0.012],
    [0.06, 0],
    [0.064, 0.008],
    [0.052, 0.009],
    [0.001, 0.003],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const sconce = mergeGeos([
    xg(new THREE.BoxGeometry(0.055, 0.17, 0.016), 0, -0.03, 0.006, 0, 0, 0, 1),
    xg(new THREE.BoxGeometry(0.022, 0.022, 0.17), 0, 0, 0.09, 0, 0, 0, 1),
    xg(new THREE.BoxGeometry(0.016, 0.016, 0.17), 0, -0.07, 0.07, 0.8, 0, 0, 1),
    xg(new THREE.LatheGeometry(panShape, 12).toNonIndexed(), 0, 0.012, 0.17, 0, 0, 0, 1),
  ]);

  const lump = (kind: typeof THREE.DodecahedronGeometry | typeof THREE.IcosahedronGeometry, r: number, a: number, d: number, y: number, squash: number) =>
    xg(new kind(r, 0), Math.cos(a) * d, y, Math.sin(a) * d, a, a * 1.7, 0, 1, squash, 1);
  const embers = mergeGeos(
    [0.2, 0.9, 1.6, 2.4, 3.1, 3.7, 4.5, 5.2, 5.9, 0.6, 2.8, 4.9].map((a, i) =>
      lump(THREE.DodecahedronGeometry, 0.028 + (i % 3) * 0.014, a, i > 8 ? 0.2 : 0.11 + (i % 2) * 0.05, 0.012, 0.55)
    )
  );
  const emberCoals = mergeGeos(
    [0.5, 1.4, 2.2, 3, 3.9, 4.8, 5.6, 0.9, 2.7, 4.4].map((a, i) =>
      lump(THREE.IcosahedronGeometry, 0.018 + (i % 3) * 0.007, a, i > 6 ? 0.03 : 0.08, 0.018, 0.55)
    )
  );

  const pillar = mergeGeos([
    xg(chamferBox(0.68, 0.15, 0.68, 0.035), 0, 0, 0, 0, 0, 0, 1),
    xg(new THREE.CylinderGeometry(0.19, 0.25, 1.5, 12), 0, 0.89, 0, 0, 0, 0, 1),
    xg(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 12), 0, 1.68, 0, 0, 0, 0, 1),
    xg(chamferBox(0.55, 0.14, 0.55, 0.03), 0, 1.72, 0, 0, 0, 0, 1),
  ]);

  return {
    stand,
    standWax,
    sconce,
    embers,
    emberCoals,
    pillar,
    flame: new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    basin: new THREE.BoxGeometry(1, 0.55, 1).translate(0, -0.43, 0),
    skirt: new THREE.PlaneGeometry(2.7, 2.7).rotateX(-Math.PI / 2).translate(0, 0.02, 0),
  };
}

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) draw(ctx);
  return new THREE.CanvasTexture(c);
}

const LIQUID_FRAG = `
  precision highp float;
  varying vec2 vP, vE;
  varying vec4 vM;
  uniform float uTime, uMode, uGlow, uOp;
  uniform vec3 uColA, uColB;
  float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    float a=h21(i), b=h21(i+vec2(1,0)), c=h21(i+vec2(0,1)), d=h21(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
  float fbm(vec2 p){ float v=0.0, a=0.5;
    for(int i=0;i<4;i++){ v+=a*vnoise(p); p=p*2.03+11.7; a*=0.5; } return v; }
  void main(){
    vec3 col;
    if(uMode < 0.5){
      float n = fbm(vP*0.55 + vec2(uTime*0.045, uTime*0.021));
      float crust = smoothstep(0.40, 0.62, n);
      float veins = smoothstep(0.06, 0.0, abs(n-0.5));
      col = mix(uColB*1.6, uColA, crust);
      col += vec3(1.0,0.72,0.32) * veins * 0.9;
      col += uColB * 0.22 * (0.5 + 0.5*sin(uTime*1.7 + n*22.0));
    } else if(uMode < 1.5){
      float n = fbm(vP*0.8);
      float cr = smoothstep(0.47, 0.5, abs(fract(n*6.0)-0.5));
      col = mix(uColA, uColB, n);
      col += vec3(1.0) * cr * 0.16;
      float tw = step(0.994, h21(floor(vP*3.0) + floor(uTime*2.0)));
      col += vec3(0.8,0.95,1.0) * tw * 0.45;
    } else if(uMode < 2.5){
      float n = fbm(vP*0.7 + vec2(uTime*0.05, -uTime*0.035));
      float n2 = fbm(vP*1.3 - vec2(uTime*0.04, uTime*0.05));
      float caust = pow(1.0 - abs(n - n2), 6.0);
      col = mix(uColA, uColB, n*0.85) + vec3(0.5,0.9,0.8)*caust*0.35;
    } else {
      vec2 w = vP + 1.5*vec2(fbm(vP*0.35 + uTime*0.02), fbm(vP*0.35 - uTime*0.016));
      float n = fbm(w*0.5);
      col = mix(uColA, uColB, smoothstep(0.25, 0.75, n));
      col += uColB * 0.3 * smoothstep(0.6, 0.9, n);
    }
    float e = 0.0;
    e = max(e, vM.x * smoothstep(0.26, 0.5, -vE.x));
    e = max(e, vM.y * smoothstep(0.26, 0.5,  vE.x));
    e = max(e, vM.z * smoothstep(0.26, 0.5, -vE.y));
    e = max(e, vM.w * smoothstep(0.26, 0.5,  vE.y));
    float aOut = uOp;
    if(uMode < 0.5)      col = mix(col, vec3(0.10,0.03,0.01), e*0.85);
    else if(uMode < 1.5) col *= (1.0 - 0.25*e);
    else if(uMode < 2.5) col *= (1.0 - 0.4*e);
    else                 aOut *= (1.0 - 0.55*e);
    gl_FragColor = vec4(col * (0.5 + uGlow), aOut);
  }`;

const PART_VERT = `
  attribute float aSeed;
  uniform float uTime, uPx, uKind;
  varying float vA;
  float h(float n){ return fract(sin(n*127.1)*43758.5453); }
  void main(){
    vec3 p = position;
    float s = aSeed, t, w;
    if(uKind < 0.5){
      w = 0.05 + 0.05*h(s+3.1);
      p.x += sin(uTime*0.10 + s*17.0)*0.25;
      p.z += cos(uTime*0.08 + s*23.0)*0.25;
      p.y += 0.25*sin(uTime*0.13 + s*31.0);
      vA = 0.10 + 0.08*sin(uTime*0.5 + s*40.0);
    } else if(uKind < 1.5){
      w = 0.045 + 0.05*h(s+3.1);
      t = fract(uTime*(0.10 + 0.08*h(s)) + s);
      p.y += t*(1.1 + 0.9*h(s+5.0));
      p.x += sin(t*9.0 + s*50.0)*0.10;
      p.z += cos(t*8.0 + s*60.0)*0.10;
      vA = smoothstep(0.0,0.05,t)*(1.0-t)*(0.55 + 0.45*sin(uTime*10.0 + s*90.0));
    } else if(uKind < 2.5){
      w = 0.04 + 0.045*h(s+3.1);
      t = fract(uTime*(0.035 + 0.02*h(s)) + s);
      p.y += (1.0-t)*2.1;
      p.x += sin(uTime*0.5 + s*30.0)*0.3;
      p.z += cos(uTime*0.42 + s*36.0)*0.3;
      vA = 0.5*smoothstep(0.0,0.05,t)*smoothstep(1.0,0.95,t);
    } else if(uKind < 3.5){
      w = 0.09 + 0.07*h(s+3.1);
      p.x += sin(uTime*0.25 + s*44.0)*0.35;
      p.z += cos(uTime*0.21 + s*52.0)*0.35;
      p.y += 0.35 + 0.25*sin(uTime*0.4 + s*20.0);
      vA = 0.16 + 0.14*sin(uTime*1.3 + s*70.0);
    } else {
      w = 0.035 + 0.04*h(s+3.1);
      t = fract(uTime*0.03*(0.6 + h(s)) + s);
      p.y += t*1.3 + 0.08;
      p.x += sin(uTime*0.35 + s*25.0)*0.3;
      p.z += cos(uTime*0.3 + s*29.0)*0.3;
      vA = 0.35*smoothstep(0.0,0.08,t)*(1.0-t);
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(w * uPx / max(0.05, -mv.z), 1.2);
  }`;

export interface ScanSet {
  color: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
  height: THREE.Texture;
}

export interface ShadowLightSlot {
  light: THREE.PointLight;
  lamp: CryptLamp | null;
  leaving: boolean;
}

export function createDungeonView(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): CryptViewTarget & {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  carriedLight: THREE.PointLight;
  setMasonry: (data: { stone: ProceduralTextureData }) => void;
  setScans: (scans: { wall: ScanSet; floor: ScanSet; plaster: ScanSet }) => void;
  setLevel: (d: DungeonData, level: LevelData) => void;
  clearCrypt: () => void;
  updateLights: (dt: number, ex: number, ez: number, lamps: CryptLamp[], d: DungeonData) => void;
  renderFrame: (time: number, dt: number, px: number, py: number, pz: number, w: number, h: number) => void;
  dispose: () => void;
} {
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene.fog = new THREE.FogExp2(0x040605, 0.025);
  const hemi = new THREE.HemisphereLight(0x4b5b62, 0x111316, 0.65);
  scene.add(hemi);

  // Soft player-carried warm lantern so the Paladin & nearby mobs pop cleanly against dark stone.
  const carried = new THREE.PointLight(0xffcb8a, 2.8, 12, 1.8);
  scene.add(carried);

  const shadowLights: ShadowLightSlot[] = [0, 1].map(() => {
    const light = new THREE.PointLight(0xffffff, 0, 11, 2);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.002;
    light.shadow.normalBias = 0.04;
    light.shadow.radius = 4;
    light.shadow.camera.near = 0.2;
    light.shadow.camera.far = 22;
    scene.add(light);
    return { light, lamp: null, leaving: false };
  });

  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const U = {
    uField: { value: blank as THREE.Texture },
    uFieldDir: { value: blank as THREE.Texture },
    uFieldMap: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFieldGain: { value: 1 },
    uTime: { value: 0 },
    uRaise: { value: 1 },
    uTop: { value: CEIL_TOP },
    uRevealT: { value: 1e6 },
    uRevealC: { value: new THREE.Vector2() },
    tWall: { value: blank as THREE.Texture },
    tWallN: { value: blank as THREE.Texture },
    tStone: { value: blank as THREE.Texture },
    tStoneN: { value: blank as THREE.Texture },
    tWallR: { value: blank as THREE.Texture },
    tPlaster: { value: blank as THREE.Texture },
    tPlasterN: { value: blank as THREE.Texture },
    tPlasterR: { value: blank as THREE.Texture },
    tPlasterH: { value: blank as THREE.Texture },
    tWallH: { value: blank as THREE.Texture },
    tFloorH: { value: blank as THREE.Texture },
    tFloor: { value: blank as THREE.Texture },
    tFloorN: { value: blank as THREE.Texture },
    tFloorR: { value: blank as THREE.Texture },
  };

  const patch = (
    mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
    { stone = null, shape = null, lit = true, scale = 0.5 }: { stone?: string | null; shape?: string | null; lit?: boolean; scale?: number } = {}
  ) => {
    const defs: string[] = [];
    const stoneMap: Record<string, number> = { wall: 1, floor: 2, vault: 3, dressed: 4, tunnel: 6, paving: 7 };
    if (stone) defs.push(`#define STONE ${stoneMap[stone] ?? 0}`);
    const key = `${stone}|${shape}|${lit}|${scale}`;
    mat.customProgramCacheKey = () => key;
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, U);
      s.vertexShader = `${defs.join("\n")}
        varying vec3 vWP; varying vec3 vWN;
        ${stone === "vault" ? "attribute vec4 aBay; attribute float aRise; varying vec4 vBay; varying float vRise;" : ""}
        ${stone === "wall" ? "attribute float aS; attribute vec2 aTan; varying float vS; varying vec2 vTan;" : ""}
        ${stone === "paving" ? "attribute vec2 aTone; varying vec2 vTone;" : ""}
        uniform float uRaise, uTop, uRevealT; uniform vec2 uRevealC;
        ${s.vertexShader}`.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        {
          mat4 mw = modelMatrix;
          #ifdef USE_INSTANCING
          mw = mw * instanceMatrix;
          #endif
          vWP = (mw * vec4(transformed, 1.0)).xyz / ${CELL_M.toFixed(3)};
          ${stone === "vault" ? "vBay = aBay; vRise = aRise;" : ""}
          ${stone === "wall" ? "vS = aS; vTan = aTan;" : ""}
          ${stone === "paving" ? "vTone = aTone;" : ""}
          ${lit ? "vWN = normalize((mw * vec4(objectNormal, 0.0)).xyz);" : ""}
        }`
      );
      let fs = `${defs.join("\n")}
        varying vec3 vWP; varying vec3 vWN;
        uniform sampler2D uField, uFieldDir, tWall, tWallN, tWallR, tWallH, tStone, tStoneN, tFloor, tFloorN, tFloorR, tFloorH, tPlaster, tPlasterN, tPlasterR, tPlasterH;
        ${stone === "vault" ? "varying vec4 vBay; varying float vRise;" : ""}
        ${stone === "wall" ? "varying float vS; varying vec2 vTan;" : ""}
        ${stone === "paving" ? "varying vec2 vTone;" : ""}
        vec2 marchHeight(sampler2D map, vec2 uv, vec3 v, float depth) {
          if (depth < 0.0005) return uv;
          vec2 dx = dFdx(uv) * 1024.0;
          vec2 dy = dFdy(uv) * 1024.0;
          float lod = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
          const float STEPS = 9.0;
          vec2 step2 = -v.xy / v.z * depth / STEPS;
          vec2 p = uv;
          float d = 0.0;
          float h = textureLod(map, p, lod).r;
          float prevH = h;
          for (int i = 0; i < 9; i++) {
            if (d >= 1.0 - h) break;
            prevH = h;
            p += step2;
            d += 1.0 / STEPS;
            h = textureLod(map, p, lod).r;
          }
          float after = (1.0 - h) - d;
          float before = (1.0 - prevH) - (d - 1.0 / STEPS);
          float t = after / (after - before + 1e-5);
          return mix(p, p - step2, clamp(t, 0.0, 1.0));
        }
        uniform vec4 uFieldMap; uniform float uFieldGain, uTime;
        ${s.fragmentShader}`;
      if (stone) {
        fs = fs
          .replace(
            "#include <map_fragment>",
            `
          vec3 wn0 = normalize(vWN);
          vec2 suv; vec3 sT; vec3 sB;
          #if STONE == 3
          vec2 bq = clamp((vWP.xz - vBay.xy) / vBay.zw, vec2(-0.995), vec2(0.995));
          vec2 bh = sqrt(1.0 - bq * bq);
          if (bh.x >= bh.y) {
            float g = -vRise * bq.x / (vBay.z * bh.x);
            wn0 = normalize(vec3(g, -1.0, 0.0));
            suv = vec2(vBay.x + asin(bq.x) * max(vBay.z, vRise), vWP.z);
            sT = normalize(vec3(1.0, g, 0.0)); sB = vec3(0.0, 0.0, 1.0);
          } else {
            float g = -vRise * bq.y / (vBay.w * bh.y);
            wn0 = normalize(vec3(0.0, -1.0, g));
            suv = vec2(vWP.x, vBay.y + asin(bq.y) * max(vBay.w, vRise));
            sT = vec3(1.0, 0.0, 0.0); sB = normalize(vec3(0.0, g, 1.0));
          }
          #elif STONE == 1
          suv = vec2(vS, vWP.y);
          sT = normalize(vec3(vTan.x, 0.0, vTan.y) - wn0 * dot(vec3(vTan.x, 0.0, vTan.y), wn0));
          sB = normalize(vec3(0.0, 1.0, 0.0) - wn0 * wn0.y);
          #elif STONE == 6
          suv = vWP.xz + vWP.yy * 0.7;
          sT = normalize(vec3(1.0, 0.0, 0.0) - wn0 * wn0.x);
          sB = normalize(vec3(0.0, 0.0, 1.0) - wn0 * wn0.z);
          #else
          if (abs(wn0.y) > 0.7) { suv = vWP.xz; sT = vec3(1.0, 0.0, 0.0); sB = vec3(0.0, 0.0, 1.0); }
          else {
            vec2 t2 = normalize(vec2(-wn0.z, wn0.x));
            suv = vec2(dot(vWP.xz, t2), vWP.y);
            sT = vec3(t2.x, 0.0, t2.y); sB = vec3(0.0, 1.0, 0.0);
          }
          #endif
          vec4 sA; vec3 sN; vec2 reliefUv = vec2(0.0); float reliefH = 1.0;
          vec3 sView = normalize(cameraPosition / ${CELL_M.toFixed(3)} - vWP);
          vec3 sTan = vec3(dot(sView, sT), dot(sView, sB), max(0.2, dot(sView, wn0)));
          float sFade = 1.0 - smoothstep(6.0, 11.0, length(cameraPosition / ${CELL_M.toFixed(3)} - vWP));
          #if STONE == 1 || STONE == 3 || STONE == 6
          vec2 luv = marchHeight(tWallH, suv * 0.75, sTan, 0.042 * sFade);
          reliefUv = luv;
          reliefH = textureLod(tWallH, luv, 0.0).r;
          sA = texture2D(tWall, suv * 0.75 + (luv - suv * 0.75));
          sN = texture2D(tWallN, luv).xyz * 2.0 - 1.0;
          sA.a = texture2D(tWallR, luv).r;
          vec2 puv = suv * 0.62 + 0.37;
          float sWear = texture2D(tStone, suv * 0.021).r * 0.75 + texture2D(tStone, suv * 0.063).r * 0.25;
          #if STONE == 3 || STONE == 6
          float sPl = smoothstep(0.0, 0.035, sWear - 0.47 - reliefH * 0.1);
          #else
          float sPl = smoothstep(0.0, 0.035, sWear - 0.6 - reliefH * 0.14 + (vWP.y - 1.0) * 0.12);
          #endif
          vec3 sPc = texture2D(tPlaster, puv).rgb * 1.05;
          float sLip = smoothstep(0.0, 0.5, sPl) * (1.0 - smoothstep(0.5, 1.0, sPl));
          sA.rgb = mix(sA.rgb * 1.0, sPc, sPl) * (1.0 - 0.75 * sLip);
          sN = normalize(mix(sN, texture2D(tPlasterN, puv).xyz * 2.0 - 1.0, sPl));
          sA.a = mix(sA.a, texture2D(tPlasterR, puv).r, sPl);
          reliefH = mix(reliefH, 0.8, sPl);
          float sDamp = texture2D(tStone, vec2(suv.x * 0.11, suv.y * 0.02)).r;
          sA.rgb *= mix(0.72, 1.08, smoothstep(0.5, 0.85, sDamp));
          #if STONE == 1
          sA.rgb *= mix(0.32, 1.0, smoothstep(0.0, 0.85, vWP.y));
          #endif
          float sL = dot(sA.rgb, vec3(0.3, 0.6, 0.1));
          sA.rgb = mix(vec3(sL), sA.rgb, 0.35) * 1.75;
          sN.xy *= 1.5;
          sN = normalize(sN);
          #elif STONE == 2
          vec2 luv = marchHeight(tFloorH, suv * 0.72, sTan, 0.018 * sFade);
          reliefUv = luv;
          reliefH = textureLod(tFloorH, luv, 0.0).r;
          sA = texture2D(tFloor, luv);
          sN = texture2D(tFloorN, luv).xyz * 2.0 - 1.0;
          sA.a = texture2D(tFloorR, luv).r;
          float sWet = smoothstep(0.66, 0.86, texture2D(tStone, suv * 0.11).r + (1.0 - reliefH) * 0.16);
          sA.a = max(0.8, sA.a * mix(1.3, 1.0, sWet));
          float sL = dot(sA.rgb, vec3(0.3, 0.6, 0.1));
          sA.rgb = mix(vec3(sL), sA.rgb, 0.38) * mix(1.3, 1.0, sWet) * mix(0.42, 1.05, smoothstep(0.36, 0.7, texture2D(tStone, suv * 0.17).r * 0.7 + texture2D(tStone, suv * 0.71).r * 0.3 + (reliefH - 0.5) * 0.3));
          sN.xy *= 1.3;
          sN = normalize(sN);
          #elif STONE == 4 || STONE == 7
          vec3 tw = pow(abs(wn0), vec3(5.0));
          tw /= tw.x + tw.y + tw.z;
          #if STONE == 7
          float sTile = 0.7;
          #else
          float sTile = 1.05;
          #endif
          vec2 uvX = vWP.zy * sTile; vec2 uvZ = vWP.xy * sTile;
          #if STONE == 7
          vec2 uvY = vWP.xz * sTile + vTone.x * vec2(5.3, 3.1);
          #else
          vec2 uvY = vWP.xz * sTile;
          #endif
          sA = texture2D(tPlaster, uvX) * tw.x + texture2D(tPlaster, uvY) * tw.y + texture2D(tPlaster, uvZ) * tw.z;
          vec3 nX = texture2D(tPlasterN, uvX).xyz * 2.0 - 1.0;
          vec3 nY = texture2D(tPlasterN, uvY).xyz * 2.0 - 1.0;
          vec3 nZ = texture2D(tPlasterN, uvZ).xyz * 2.0 - 1.0;
          #if STONE == 7
          float sCut = 0.5;
          #else
          float sCut = 1.3;
          #endif
          wn0 = normalize(wn0 + sCut * (vec3(0.0, nX.y, nX.x) * tw.x + vec3(nY.x, 0.0, nY.y) * tw.y + vec3(nZ.x, nZ.y, 0.0) * tw.z));
          sN = vec3(0.0, 0.0, 1.0); sT = vec3(1.0, 0.0, 0.0); sB = vec3(0.0, 1.0, 0.0);
          float sDirt = texture2D(tStone, vWP.xz * 0.21 + vWP.y * 0.13).r;
          sA.a = texture2D(tPlasterR, uvY).r;
          float sL = dot(sA.rgb, vec3(0.3, 0.6, 0.1));
          #if STONE == 7
          float sPit = texture2D(tPlasterH, uvY).r;
          sA.rgb = mix(vec3(sL), sA.rgb, 0.3) * vec3(0.93, 1.0, 1.05) * mix(0.74, 1.08, smoothstep(0.38, 0.78, sDirt)) * mix(0.82, 1.05, smoothstep(0.2, 0.55, sPit)) * vTone.x * vTone.y * vTone.y * 1.95;
          vec2 cuv = vWP.xz + vTone.x * vec2(7.3, 4.1);
          float caa = length(fwidth(vWP.xz)) * 0.12;
          float crack = (1.0 - smoothstep(0.0015, 0.007 + caa, abs(texture2D(tStone, cuv * 0.27).r - 0.5))) * smoothstep(0.52, 0.66, texture2D(tStone, cuv * 0.07 + 0.3).r);
          crack = max(crack, (1.0 - smoothstep(0.001, 0.005 + caa, abs(texture2D(tStone, cuv * 0.83 + 0.5).r - 0.5))) * smoothstep(0.58, 0.7, texture2D(tStone, cuv * 0.13).r) * 0.5);
          sA.rgb *= mix(1.0, 0.2, crack * step(0.5, wn0.y + 0.4));
          float drift = smoothstep(0.58, 0.8, texture2D(tStone, vWP.xz * 0.15).r * 0.65 + texture2D(tStone, vWP.xz * 0.61).r * 0.35 + (1.0 - vTone.y) * 1.3);
          vec3 sEarth = texture2D(tFloor, vWP.xz * 0.72).rgb;
          sA.rgb = mix(sA.rgb, mix(vec3(dot(sEarth, vec3(0.3, 0.6, 0.1))), sEarth, 0.38) * 1.35, drift * 0.55 * smoothstep(0.2, 0.7, wn0.y + 0.3));
          #else
          sA.rgb = mix(vec3(sL), sA.rgb, 0.35) * mix(0.55, 1.15, smoothstep(0.42, 0.9, sDirt)) * mix(0.45, 1.0, smoothstep(0.0, 0.5, vWP.y)) * 1.7;
          #endif
          #else
          sA = texture2D(tStone, suv * ${scale.toFixed(3)});
          sN = texture2D(tStoneN, suv * ${scale.toFixed(3)}).xyz * 2.0 - 1.0;
          #endif
          diffuseColor.rgb *= sA.rgb;`
          )
          .replace(
            "#include <roughnessmap_fragment>",
            `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor * sA.a * 1.1, 0.05, 1.0);`
          )
          .replace(
            "#include <normal_fragment_maps>",
            `
          normal = normalize((viewMatrix * vec4(normalize(sT * sN.x + sB * sN.y + wn0 * sN.z), 0.0)).xyz);`
          );
      }
      if (lit) {
        fs = fs.replace(
          "#include <lights_fragment_end>",
          `#include <lights_fragment_end>
        {
          vec3 wNf = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
          vec2 fuv = (vWP.xz + wNf.xz * 0.42) * uFieldMap.xy + uFieldMap.zw;
          vec4 fc = texture2D(uField, fuv);
          vec4 fd = texture2D(uFieldDir, fuv);
          vec3 fcol = fc.rgb * fc.rgb * 4.0;
          float drop = 1.5 - vWP.y;
          vec3 Lw = normalize(vec3(fd.x * 2.0 - 1.0, drop * 0.55, fd.y * 2.0 - 1.0) + vec3(0.0, 0.0001, 0.0));
          float wrap = mix(0.75, 0.15, fd.z);
          float nl = clamp((dot(wNf, Lw) + wrap) / (1.0 + wrap), 0.0, 1.0);
          float fall = 1.0 / (1.0 + drop * drop * 0.16);
          float flick = 0.985 + 0.02 * sin(uTime * 5.3 + vWP.x * 0.31 + vWP.z * 0.37) * sin(uTime * 3.1 + vWP.z * 0.23 - vWP.x * 0.19);
          vec3 fE = fcol * fall * flick * uFieldGain;
          #if defined(STONE) && (STONE == 1 || STONE == 2 || STONE == 3 || STONE == 6)
          {
            vec2 lT = vec2(dot(Lw, sT), dot(Lw, sB));
            float rs = 1.0;
            for (int i = 1; i <= 3; i++) {
              float k = float(i) * 1.3;
              #if STONE == 2
              float rh = texture2D(tFloorH, reliefUv + lT * 0.01 * k).r;
              #else
              float rh = texture2D(tWallH, reliefUv + lT * 0.01 * k).r;
              #endif
              rs = min(rs, 1.0 - clamp((rh - reliefH - 0.03 * k) * 7.0, 0.0, 1.0));
            }
            fE *= mix(0.3, 1.0, rs);
          }
          #endif
          vec3 fdiff = diffuseColor.rgb * (1.0 - metalnessFactor);
          reflectedLight.directDiffuse += fE * mix(nl, 1.0, 0.3) * fdiff * 1.2;
          vec3 Lv = normalize((viewMatrix * vec4(Lw, 0.0)).xyz);
          vec3 Hv = normalize(Lv + normalize(vViewPosition));
          float sp = pow(clamp(dot(normal, Hv), 0.0, 1.0), mix(90.0, 8.0, roughnessFactor)) * (1.0 - roughnessFactor * 0.82);
          reflectedLight.directSpecular += fE * nl * sp * mix(vec3(0.28), diffuseColor.rgb, metalnessFactor) * 1.4;
          float high = clamp(vWP.y / 1.6, 0.0, 1.0);
          float aoAmt = wNf.y < -0.4 ? 0.0 : high;
          float ao = mix(fc.a, 1.0, aoAmt);
          reflectedLight.directDiffuse *= ao;
          reflectedLight.indirectDiffuse *= ao * ao;
          reflectedLight.directSpecular *= ao;
        }`
        );
      }
      s.fragmentShader = fs;
    };
    return mat;
  };

  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const M = {
    wall: patch(std({ roughness: 0.92, metalness: 0.02, color: 0x77777a }), { stone: "wall" }),
    archWall: patch(std({ roughness: 0.92, metalness: 0.02, color: 0x77777a }), { stone: "wall" }),
    tunnel: patch(std({ roughness: 0.95, metalness: 0, color: 0x6b6b6d }), { stone: "dressed" }),
    vault: patch(std({ roughness: 0.95, metalness: 0, color: 0x77787b }), { stone: "vault" }),
    dressed: patch(std({ roughness: 0.9, metalness: 0.02, color: 0x7c7d80 }), { stone: "dressed" }),
    paving: patch(std({ roughness: 0.88, metalness: 0.02, color: 0x7c7d80 }), { stone: "paving" }),
    iron: patch(std({ roughness: 0.6, metalness: 0.3, color: 0x3a3a40 })),
    floor: patch(std({ roughness: 0.9, metalness: 0.02, color: 0x6d6c69 }), { stone: "floor", scale: CELL_M / 2 }),
    stone: patch(std({ roughness: 0.92, metalness: 0.02 }), { stone: "stone", scale: 1 }),
    pillar: patch(std({ roughness: 0.86, metalness: 0.02 }), { stone: "stone", scale: 1 }),
  };

  const basic = (o: THREE.MeshBasicMaterialParameters) => {
    const m = new THREE.MeshBasicMaterial(o);
    m.toneMapped = false;
    return m;
  };
  const matGlow = patch(basic({ color: 0xffffff }), { lit: false });
  const glowTex = canvasTex(128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,0.9)");
    grd.addColorStop(0.5, "rgba(255,255,255,0.3)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });
  const matSkirt = basic({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });

  const matLiquid = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: U.uTime,
      uMode: { value: 0 },
      uGlow: { value: 0.85 },
      uOp: { value: 1 },
      uColA: { value: new THREE.Color() },
      uColB: { value: new THREE.Color() },
    },
    vertexShader: `attribute vec2 aE; attribute vec4 aM; varying vec2 vP, vE; varying vec4 vM;
      void main(){ vP = vec2(position.x, position.z); vE = aE; vM = aM; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: LIQUID_FRAG,
  });

  const matPart = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, uPx: { value: 500 }, uKind: { value: 0 }, uColor: { value: new THREE.Color(0xffffff) } },
    vertexShader: PART_VERT,
    fragmentShader: `precision mediump float; uniform vec3 uColor; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d) * vA;
      gl_FragColor = vec4(uColor * (1.0 + 0.8*smoothstep(0.3, 0.0, d)), a); }`,
  });

  const matWax = patch(std({ roughness: 0.5, metalness: 0, color: 0xa9a598 }));
  {
    const base = matWax.onBeforeCompile;
    matWax.onBeforeCompile = (s, r) => {
      base(s, r);
      s.vertexShader = `varying float vWaxH;\n${s.vertexShader}`.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n\tvWaxH = position.y;"
      );
      s.fragmentShader = `varying float vWaxH;\n${s.fragmentShader}`
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vec3(1.0, 0.9, 0.74) * pow(clamp(vWaxH / 0.27, 0.0, 1.0), 4.0) * 0.35;"
        )
        .replace(
          "#include <opaque_fragment>",
          "outgoingLight = outgoingLight / (1.0 + outgoingLight * 3.0);\n\t#include <opaque_fragment>"
        );
    };
    matWax.customProgramCacheKey = () => "wax";
  }

  const matFlame = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: U.uTime,
      uCol: { value: new THREE.Color(0xffa640) },
      uCore: { value: new THREE.Color(0xfff3c8) },
      uRevealT: U.uRevealT,
      uRevealC: U.uRevealC,
    },
    vertexShader: `
      uniform float uRevealT; uniform vec2 uRevealC;
      varying vec2 vUvF; varying float vSeed; varying vec3 vTint;
      void main(){
        vTint = instanceColor;
        vec3 c = instanceMatrix[3].xyz;
        float s = length(instanceMatrix[0].xyz);
        vec3 toCam = cameraPosition - (modelMatrix * vec4(c, 1.0)).xyz; toCam.y = 0.0; toCam = normalize(toCam + vec3(0.0001, 0.0, 0.0));
        vec3 right = vec3(toCam.z, 0.0, -toCam.x);
        vec3 p = c + right * position.x * 0.42 * s + vec3(0.0, 1.0, 0.0) * position.y * 0.66 * s;
        vSeed = fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        vUvF = vec2(position.x * 2.0, position.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime; uniform vec3 uCol, uCore;
      varying vec2 vUvF; varying float vSeed; varying vec3 vTint;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ return 0.55*vn(p)+0.3*vn(p*2.1+3.7)+0.15*vn(p*4.3+9.1); }
      void main(){
        float y = vUvF.y;
        float t = uTime * (1.5 + vSeed * 0.6) + vSeed * 40.0;
        float n = fbm(vec2(vUvF.x * 2.2 + vSeed * 17.0, y * 2.6 - t));
        float n2 = fbm(vec2(vUvF.x * 5.0 - vSeed * 5.0, y * 5.0 - t * 1.6));
        float x = vUvF.x + (n - 0.5) * 0.85 * y + (n2 - 0.5) * 0.3 * y;
        float tall = 0.72 + 0.2 * sin(t * 0.9) * sin(t * 0.37);
        float width = 0.52 * smoothstep(0.0, 0.12, y) * pow(max(0.0, 1.0 - y / tall), 0.72);
        float body = 1.0 - smoothstep(width * 0.3, width, abs(x));
        body *= smoothstep(0.0, 0.05, y) * (0.55 + 0.75 * n);
        float core = 1.0 - smoothstep(width * 0.1, width * 0.62, abs(x));
        core *= smoothstep(0.75, 0.15, y / tall);
        vec3 col = uCol * body * 2.1 + uCore * core * body * 2.0;
        col = mix(col * 0.45 * vec3(0.5, 0.65, 1.0), col, smoothstep(0.02, 0.2, y)) * vTint;
        gl_FragColor = vec4(col, body);
      }`,
  });

  const haloMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUvH; varying vec3 vCol;
      void main(){
        vUvH = position.xy * 2.0;
        vec3 c = instanceMatrix[3].xyz;
        float s = length(instanceMatrix[0].xyz);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        float size = s * ${CELL_M.toFixed(3)};
        vCol = instanceColor * smoothstep(size * 0.7, size * 2.0, -mv.z);
        mv.xy += position.xy * s * ${CELL_M.toFixed(3)};
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec2 vUvH; varying vec3 vCol;
      void main(){
        float r = length(vUvH);
        float a = pow(max(0.0, 1.0 - r), 2.2);
        gl_FragColor = vec4(vCol * a, a);
      }`,
  });

  const G = makeGeometry();
  const DEFS: Record<string, [THREE.BufferGeometry, THREE.Material, number]> = {
    stand: [G.stand, M.iron, 0],
    standWax: [G.standWax, matWax, 0],
    sconce: [G.sconce, M.iron, 0],
    embers: [G.embers, M.stone, 0],
    emberCoals: [G.emberCoals, matGlow, 0],
    pillar: [G.pillar, M.pillar, 1],
    flame: [G.flame, matFlame, 0],
    basin: [G.basin, M.stone, 0],
    skirt: [G.skirt, matSkirt, 0],
  };

  const group = new THREE.Group();
  group.scale.setScalar(CELL_M);
  scene.add(group);

  const meshes: Record<string, THREE.InstancedMesh> = {};
  for (const name of Object.keys(DEFS)) {
    const [geo, mat, shadow] = DEFS[name];
    const mesh = new THREE.InstancedMesh(geo, mat, 1);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
    mesh.castShadow = shadow === 1;
    mesh.receiveShadow = shadow > 0;
    if (mat.transparent) mesh.layers.set(SEE_THROUGH);
    group.add(mesh);
    meshes[name] = mesh;
  }

  let extraChildren: THREE.Object3D[] = [];
  let roomLights: THREE.PointLight[] = [];
  let liquids: THREE.Mesh[] = [];
  let parts: THREE.Points | null = null;
  let fieldTex: THREE.DataTexture[] = [];
  const walkBg = new THREE.Color(0x040605);

  const POST = (() => {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mk = (mat: THREE.ShaderMaterial) => {
      const s = new THREE.Scene();
      const q = new THREE.Mesh(tri, mat);
      q.frustumCulled = false;
      s.add(q);
      return s;
    };
    const V = "varying vec2 vUv; void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }";
    const thresh = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, uPx: { value: new THREE.Vector2(1, 1) } },
      vertexShader: V,
      fragmentShader: `varying vec2 vUv; uniform sampler2D tS; uniform vec2 uPx;
        vec3 bright(vec2 o){ vec3 c = texture2D(tS, vUv + o * uPx).rgb; float l = dot(c, vec3(0.299, 0.587, 0.114)); return min(c, vec3(4.0)) * smoothstep(0.58, 0.95, l); }
        void main(){ vec3 c = bright(vec2(0.0)) * 4.0;
          c += (bright(vec2(-2.0, 0.0)) + bright(vec2(2.0, 0.0)) + bright(vec2(0.0, -2.0)) + bright(vec2(0.0, 2.0))) * 2.0;
          c += bright(vec2(-2.0, -2.0)) + bright(vec2(2.0, -2.0)) + bright(vec2(-2.0, 2.0)) + bright(vec2(2.0, 2.0));
          gl_FragColor = vec4(c / 16.0, 1.0); }`,
      depthTest: false,
      depthWrite: false,
    });
    const blur = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1, 1) } },
      vertexShader: V,
      fragmentShader: `varying vec2 vUv; uniform sampler2D tS; uniform vec2 uDir, uRes;
        void main(){ vec2 px = uDir / uRes; vec3 c = texture2D(tS, vUv).rgb * 0.227;
        c += (texture2D(tS, vUv + px*1.384).rgb + texture2D(tS, vUv - px*1.384).rgb) * 0.316;
        c += (texture2D(tS, vUv + px*3.230).rgb + texture2D(tS, vUv - px*3.230).rgb) * 0.0703;
        gl_FragColor = vec4(c, 1.0); }`,
      depthTest: false,
      depthWrite: false,
    });
    const fin = new THREE.ShaderMaterial({
      uniforms: {
        tAO: { value: blank },
        uAO: { value: 1 },
        tS: { value: null },
        tB: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: U.uTime,
        uBloom: { value: 0.45 },
        uExposure: { value: 2.1 },
      },
      vertexShader: V,
      fragmentShader: `varying vec2 vUv; uniform sampler2D tAO, tS, tB; uniform float uAO, uTime, uBloom, uExposure; uniform vec2 uRes;
        float contact(vec2 uv){
          vec2 px = 2.0 / uRes;
          float s = 0.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) s += texture2D(tAO, uv + vec2(float(x), float(y)) * px).r;
          return s / 9.0;
        }
        void main(){
          vec3 col = texture2D(tS, vUv).rgb;
          if (uAO > 0.0) col *= mix(contact(vUv), 1.0, smoothstep(0.7, 1.6, dot(col, vec3(0.3, 0.6, 0.1))));
          col += texture2D(tB, vUv).rgb * uBloom;
          col *= uExposure;
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, col * vec3(0.72, 0.92, 1.08), (1.0 - smoothstep(0.02, 0.45, lum)) * 0.85);
          col = mix(vec3(lum), col, 0.92);
          float vg = smoothstep(1.38, 0.52, length(vUv - 0.5) * 1.5);
          col *= mix(0.35, 1.0, vg);
          float gr = fract(sin(dot(gl_FragCoord.xy + mod(uTime,10.0)*37.0, vec2(12.9898,78.233))) * 43758.5453);
          col = max(col, 0.0);
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
          col += (gr - 0.5) * 0.004;
          col = pow(max(col, 0.0), vec3(0.4545));
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const ao = new THREE.ShaderMaterial({
      uniforms: { tZ: { value: blank }, uNear: { value: 0.1 }, uFar: { value: 240 }, uLens: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) } },
      vertexShader: V,
      fragmentShader: `#include <packing>
        varying vec2 vUv; uniform sampler2D tZ; uniform float uNear, uFar, uLens; uniform vec2 uRes;
        float sceneZ(vec2 uv){ return perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tZ, uv)), uNear, uFar); }
        void main(){
          float z = sceneZ(vUv);
          if (z < -60.0) { gl_FragColor = vec4(1.0); return; }
          vec2 px = 2.0 / uRes;
          float iz = 1.0 / z;
          float xa = 1.0 / sceneZ(vUv + vec2(px.x, 0.0)) - iz;
          float xb = iz - 1.0 / sceneZ(vUv - vec2(px.x, 0.0));
          float ya = 1.0 / sceneZ(vUv + vec2(0.0, px.y)) - iz;
          float yb = iz - 1.0 / sceneZ(vUv - vec2(0.0, px.y));
          vec2 slope = vec2(abs(xa) < abs(xb) ? xa : xb, abs(ya) < abs(yb) ? ya : yb) / px;
          float occ = 0.0;
          vec2 scale = vec2(uRes.y / uRes.x, 1.0) * uLens * 0.22 / -z;
          for (int i = 0; i < 12; i++) {
            float a = float(i) * 2.399963;
            float r = sqrt((float(i) + 0.5) / 12.0);
            vec2 o = vec2(cos(a), sin(a)) * scale * r;
            float d = sceneZ(vUv + o) - 1.0 / (iz + dot(slope, o));
            occ += smoothstep(0.14, 0.42, d) * (1.0 - smoothstep(0.7, 1.4, d));
          }
          gl_FragColor = vec4(vec3(1.0 - min(1.0, occ / 12.0 * 2.0) * 0.6), 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    return {
      qcam,
      sThresh: mk(thresh),
      sBlur: mk(blur),
      sFinal: mk(fin),
      sAO: mk(ao),
      thresh,
      blur,
      fin,
      ao,
      rtScene: null as THREE.WebGLRenderTarget | null,
      rtA: null as THREE.WebGLRenderTarget | null,
      rtB: null as THREE.WebGLRenderTarget | null,
      rtAO: null as THREE.WebGLRenderTarget | null,
      rtDepth: null as THREE.WebGLRenderTarget | null,
      w: 0,
      h: 0,
    };
  })();

  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const earlyZ = new THREE.MeshBasicMaterial({
    colorWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2,
  });
  const drawingSize = new THREE.Vector2();

  function setupRTs() {
    renderer.getDrawingBufferSize(drawingSize);
    const sx = Math.max(2, drawingSize.x);
    const sy = Math.max(2, drawingSize.y);
    if (POST.w === sx && POST.h === sy && POST.rtScene) return;
    POST.w = sx;
    POST.h = sy;
    POST.rtScene?.dispose();
    POST.rtA?.dispose();
    POST.rtB?.dispose();
    POST.rtAO?.dispose();
    POST.rtDepth?.dispose();
    POST.rtScene = new THREE.WebGLRenderTarget(sx, sy, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 2,
    });
    const pb: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    };
    POST.rtA = new THREE.WebGLRenderTarget(Math.max(1, sx >> 2), Math.max(1, sy >> 2), pb);
    POST.rtB = new THREE.WebGLRenderTarget(Math.max(1, sx >> 2), Math.max(1, sy >> 2), pb);
    POST.rtAO = new THREE.WebGLRenderTarget(Math.max(1, sx >> 1), Math.max(1, sy >> 1), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    POST.rtDepth = new THREE.WebGLRenderTarget(Math.max(2, sx >> 1), Math.max(2, sy >> 1), {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });
    POST.ao.uniforms.tZ.value = POST.rtDepth.texture;
  }

  function setScans({ wall, floor, plaster }: { wall: ScanSet; floor: ScanSet; plaster: ScanSet }) {
    for (const t of [
      wall.color,
      wall.normal,
      wall.roughness,
      wall.height,
      floor.color,
      floor.normal,
      floor.roughness,
      floor.height,
      plaster.color,
      plaster.normal,
      plaster.roughness,
      plaster.height,
    ]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    wall.color.colorSpace = THREE.SRGBColorSpace;
    floor.color.colorSpace = THREE.SRGBColorSpace;
    plaster.color.colorSpace = THREE.SRGBColorSpace;
    U.tPlaster.value = plaster.color;
    U.tPlasterN.value = plaster.normal;
    U.tPlasterR.value = plaster.roughness;
    U.tPlasterH.value = plaster.height;
    U.tWallH.value = wall.height;
    U.tFloorH.value = floor.height;
    U.tWall.value = wall.color;
    U.tWallN.value = wall.normal;
    U.tWallR.value = wall.roughness;
    U.tFloor.value = floor.color;
    U.tFloorN.value = floor.normal;
    U.tFloorR.value = floor.roughness;
  }

  function setMasonry({ stone }: { stone: ProceduralTextureData }) {
    const tex = (arr: Uint8Array, sz: number) => {
      const t = new THREE.DataTexture(arr, sz, sz, THREE.RGBAFormat);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      return t;
    };
    U.tStone.value = tex(stone.color, stone.size);
    U.tStoneN.value = tex(stone.normal, stone.size);
  }

  function applyTheme(key: ThemeName) {
    const TH = THEMES[key];
    walkBg.set(TH.walkFog);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(TH.walkFog);
      scene.fog.density = TH.walkFogD ?? 0.036 / CELL_M;
    }
    hemi.color.set(TH.hemi[0]);
    hemi.groundColor.set(TH.hemi[1]);
    hemi.intensity = Math.max(0.5, TH.hemi[2] * LIGHT_K * 0.48);
    carried.color.set(TH.torchLight[0]).lerp(new THREE.Color(0xffe0b0), 0.45);
    matFlame.uniforms.uCol.value.set(TH.flame);
    matFlame.uniforms.uCore.value.set(TH.flameCore);
    if (TH.pools) {
      matLiquid.uniforms.uMode.value = TH.pools.mode;
      matLiquid.uniforms.uColA.value.set(TH.pools.colA);
      matLiquid.uniforms.uColB.value.set(TH.pools.colB);
      matLiquid.uniforms.uGlow.value = TH.pools.glow > 1 ? TH.pools.glow : TH.pools.glow * 0.4;
    }
    matPart.uniforms.uKind.value = TH.particles.kind;
    matPart.uniforms.uColor.value.set(TH.particles.color);
  }

  function clearCrypt() {
    for (const o of extraChildren) {
      group.remove(o);
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    }
    extraChildren = [];
    for (const rl of roomLights) scene.remove(rl);
    roomLights = [];
    for (const slot of shadowLights) {
      slot.lamp = null;
      slot.leaving = false;
      slot.light.intensity = 0;
    }
  }

  function setLevel(d: DungeonData, level: LevelData) {
    clearCrypt();
    applyTheme(d.params.theme);

    for (const name of Object.keys(meshes)) {
      const m = meshes[name];
      const s: InstanceBuffer | undefined = level.sets[name];
      m.dispose();
      const count = s ? s.n : 0;
      m.instanceMatrix = new THREE.InstancedBufferAttribute(count ? s!.m : new Float32Array(16), 16);
      m.instanceColor = new THREE.InstancedBufferAttribute(count ? s!.c : new Float32Array(3), 3);
      m.count = count;
    }

    for (const l of liquids) {
      l.geometry.dispose();
      group.remove(l);
    }
    liquids = level.liquids.map((l) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(l.pos, 3));
      g.setAttribute("aE", new THREE.BufferAttribute(l.ae, 2));
      g.setAttribute("aM", new THREE.BufferAttribute(l.am, 4));
      const mesh = new THREE.Mesh(g, matLiquid);
      mesh.frustumCulled = false;
      mesh.layers.set(SEE_THROUGH);
      group.add(mesh);
      return mesh;
    });

    if (parts) {
      parts.geometry.dispose();
      group.remove(parts);
    }
    {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(level.parts.pos, 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(level.parts.seed, 1));
      parts = new THREE.Points(g, matPart);
      parts.frustumCulled = false;
      parts.layers.set(SEE_THROUGH);
      group.add(parts);
    }

    for (const t of fieldTex) t.dispose();
    if (level.field) {
      const mk = (arr: Uint8Array) => {
        const t = new THREE.DataTexture(arr, level.field!.w, level.field!.h, THREE.RGBAFormat);
        t.minFilter = t.magFilter = THREE.LinearFilter;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        t.needsUpdate = true;
        return t;
      };
      fieldTex = [mk(level.field.color), mk(level.field.dir)];
      U.uField.value = fieldTex[0];
      U.uFieldDir.value = fieldTex[1];
      U.uFieldMap.value.set(1 / d.W, 1 / d.H, 0.5, 0.5);
    }

    // Add gentle non-shadow room fill lights so NPCs/mobs running in every room stay clearly visible.
    const lightColor = THEMES[d.params.theme].torchLight[0];
    for (const r of d.rooms) {
      const wx = (r.cx - d.W / 2 + 0.5) * CELL_M;
      const wz = (r.cy - d.H / 2 + 0.5) * CELL_M;
      const fl = floorAt(d, r.cx + 0.5, r.cy + 0.5) * CELL_M;
      const pl = new THREE.PointLight(lightColor, 2.2, 13, 1.8);
      pl.position.set(wx, fl + 2.7, wz);
      scene.add(pl);
      roomLights.push(pl);
    }
  }

  // Track non-instanced crypt meshes added by buildCrypt for cleanup on seed reset.
  const baseCount = group.children.length;

  const LAMP_LOOK = {
    candle: { color: new THREE.Color(0xd8d6c8), power: 1.05 },
    door: { color: new THREE.Color(0xd8d6c8), power: 0.7 },
    ember: { color: new THREE.Color(0xf2b47e), power: 1.6 },
  };
  const LAMP_FADE = [9, 13];
  let lampCheck = 0;

  function seesLamp(lamp: CryptLamp, ex: number, ez: number, d: DungeonData) {
    const steps = Math.ceil(Math.hypot(lamp.x - ex, lamp.z - ez) * 3);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = Math.floor(ex + (lamp.x - ex) * t + d.W / 2);
      const z = Math.floor(ez + (lamp.z - ez) * t + d.H / 2);
      if (d.grid[z * d.W + x] !== 1) return false;
    }
    return true;
  }

  function updateLights(dt: number, ex: number, ez: number, lamps: CryptLamp[], d: DungeonData) {
    lampCheck -= dt;
    if (lampCheck <= 0) {
      lampCheck = 0.12;
      const score = (lamp: CryptLamp) => {
        const dist = Math.hypot(lamp.x - ex, lamp.z - ez);
        return dist < 30 && seesLamp(lamp, ex, ez, d) ? dist : dist * 1.5 + 3;
      };
      const ranked = lamps.map((lamp) => ({ lamp, score: score(lamp) })).sort((a, b) => a.score - b.score);
      for (const { lamp, score: s } of ranked.slice(0, shadowLights.length)) {
        if (shadowLights.some((slot) => slot.lamp === lamp)) continue;
        const free = shadowLights.find((slot) => !slot.lamp);
        if (free) {
          free.lamp = lamp;
          free.leaving = false;
          free.light.position.set(lamp.x * CELL_M, lamp.y * CELL_M, lamp.z * CELL_M);
          free.light.color.copy(LAMP_LOOK[lamp.kind].color);
          free.light.intensity = 0;
          continue;
        }
        const worst = shadowLights.filter((slot) => !slot.leaving).sort((a, b) => score(b.lamp!) - score(a.lamp!))[0];
        if (worst && worst.lamp && score(worst.lamp) > s + 2.5) worst.leaving = true;
      }
    }
    for (const slot of shadowLights) {
      let goal = 0;
      if (slot.lamp && !slot.leaving) {
        const dist = Math.hypot(slot.lamp.x - ex, slot.lamp.z - ez);
        const k = Math.min(1, Math.max(0, (LAMP_FADE[1] - dist) / (LAMP_FADE[1] - LAMP_FADE[0])));
        goal = LAMP_LOOK[slot.lamp.kind].power * k * k * (3 - 2 * k);
      }
      slot.light.intensity += (goal - slot.light.intensity) * Math.min(1, dt * 3);
      if (slot.leaving && slot.light.intensity < 0.015) {
        slot.lamp = null;
        slot.leaving = false;
        slot.light.intensity = 0;
      }
    }
  }

  const _bg = new THREE.Color();

  function renderFrame(time: number, _dt: number, px: number, py: number, pz: number, w: number, h: number) {
    setupRTs();
    U.uTime.value = time;
    carried.position.set(px, py + 1.85, pz);
    camera.layers.enable(SEE_THROUGH);

    // 1. Half-resolution depth buffer for contact shadows.
    if (POST.rtDepth) {
      const ao = POST.ao.uniforms;
      ao.uNear.value = camera.near;
      ao.uFar.value = camera.far;
      ao.uLens.value = camera.projectionMatrix.elements[5];
      const mask = camera.layers.mask;
      const alpha = renderer.getClearAlpha();
      renderer.getClearColor(_bg);
      scene.overrideMaterial = depthMaterial;
      camera.layers.set(0);
      renderer.setRenderTarget(POST.rtDepth);
      renderer.setClearColor(0xffffff, 1);
      renderer.clear();
      renderer.render(scene, camera);
      scene.overrideMaterial = null;
      camera.layers.mask = mask;
      renderer.setClearColor(_bg, alpha);
      renderer.setRenderTarget(null);
    }

    matPart.uniforms.uPx.value = (0.4 * Math.max(1, h)) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    void w;

    // 2. Main scene into MSAA half-float target.
    renderer.setClearColor(walkBg, 1);
    renderer.setRenderTarget(POST.rtScene);
    renderer.clear();

    const layerMask = camera.layers.mask;
    camera.layers.set(EARLY_Z);
    scene.overrideMaterial = earlyZ;
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.mask = layerMask;

    renderer.setRenderTarget(POST.rtScene);
    renderer.clear(true, false, false);
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = prevAutoClear;

    // 3. Bloom pass.
    if (POST.rtScene && POST.rtA && POST.rtB) {
      POST.thresh.uniforms.tS.value = POST.rtScene.texture;
      POST.thresh.uniforms.uPx.value.set(1 / POST.w, 1 / POST.h);
      renderer.setRenderTarget(POST.rtA);
      renderer.render(POST.sThresh, POST.qcam);
      POST.blur.uniforms.uRes.value.set(Math.max(1, POST.w >> 2), Math.max(1, POST.h >> 2));
      for (const spread of [1, 2.6]) {
        POST.blur.uniforms.tS.value = POST.rtA.texture;
        POST.blur.uniforms.uDir.value.set(spread, 0);
        renderer.setRenderTarget(POST.rtB);
        renderer.render(POST.sBlur, POST.qcam);
        POST.blur.uniforms.tS.value = POST.rtB.texture;
        POST.blur.uniforms.uDir.value.set(0, spread);
        renderer.setRenderTarget(POST.rtA);
        renderer.render(POST.sBlur, POST.qcam);
      }
    }

    // 4. Contact AO pass.
    if (POST.fin.uniforms.uAO.value > 0 && POST.rtAO) {
      POST.ao.uniforms.uRes.value.set(POST.w, POST.h);
      renderer.setRenderTarget(POST.rtAO);
      renderer.render(POST.sAO, POST.qcam);
      POST.fin.uniforms.tAO.value = POST.rtAO.texture;
    }

    // 5. Final composite + tone mapping + gamma.
    if (POST.rtScene && POST.rtA) {
      POST.fin.uniforms.tS.value = POST.rtScene.texture;
      POST.fin.uniforms.tB.value = POST.rtA.texture;
      POST.fin.uniforms.uRes.value.set(POST.w, POST.h);
      renderer.setRenderTarget(null);
      renderer.render(POST.sFinal, POST.qcam);
    }
  }

  return {
    renderer,
    scene,
    camera,
    group,
    materials: M,
    U,
    candleParts: { sconce: G.sconce, wax: G.standWax, flame: G.flame, waxMaterial: matWax, flameMaterial: matFlame },
    haloMaterial,
    carriedLight: carried,
    markSolid() {
      extraChildren = group.children.slice(baseCount);
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.Material | undefined;
        if ((mesh.isMesh || (o as THREE.InstancedMesh).isInstancedMesh) && mat && !mat.transparent && o.layers.isEnabled(0)) {
          o.layers.enable(EARLY_Z);
        }
      });
    },
    setMasonry,
    setScans,
    setLevel,
    clearCrypt,
    updateLights,
    renderFrame,
    dispose() {
      clearCrypt();
      scene.remove(group);
      scene.remove(hemi);
      scene.remove(carried);
      for (const s of shadowLights) scene.remove(s.light);
      POST.rtScene?.dispose();
      POST.rtA?.dispose();
      POST.rtB?.dispose();
      POST.rtAO?.dispose();
      POST.rtDepth?.dispose();
      for (const t of fieldTex) t.dispose();
    },
  };
}
