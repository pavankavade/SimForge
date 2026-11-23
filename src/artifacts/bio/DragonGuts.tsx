import type React from "react";
import { useMemo, useRef } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import type { DragonAnchors } from "./RealDragon";

/**
 * The organs inside the realistic dragon, drawn like a medical illustration
 * seen through its x-ray shell. They ride the animated bones (`anchors`, the
 * dragon's own space), so they move with the body:
 *
 * - the gut (rumen): a bean-shaped membrane sac (fresnel rim, see-through
 *   wall) holding churning plant fragments under a liquid line, with bubbles
 *   that turn from green (fermenting) to cyan (methane);
 * - the second stomach: a striated muscle sac with three squeezing bands round
 *   a swirling volume of methane (noise shader) that brightens under pressure;
 * - the fuel duct: a ribbed, trachea-like tube up the neck to the mouth, with
 *   gas streaming up it (moving bands) or a flame front racing down it;
 * - the fire gland at the throat.
 *
 * Every shader takes the frame as its clock, so stills are deterministic.
 */

export interface GutsState {
  /** Overall visibility (follows the x-ray). */
  show: number;
  /** 0..1 rumen fermenting (bubbles), 0..1 methane colour of its bubbles. */
  ferment?: number;
  methane?: number;
  /** Second stomach: 0 absent, 1 grown. */
  tank?: number;
  /** 0 relaxed, 1 hard squeeze. */
  squeeze?: number;
  /** Methane fill of the tank (core glow). */
  fill?: number;
  /** Gas flowing up the duct (0..1). */
  flow?: number;
  /** Flame front down the duct: 0 at the mouth, 1 at the tank; `back` its brightness. */
  flashback?: number;
  back?: number;
  /** Chemical gland at the throat: 0 hidden, 1 shown; `burn` it flaring. */
  gland?: number;
  burn?: number;
  /** Organs charring (the hook: fire stored in the belly). */
  char?: number;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
type Uniforms = Record<string, { value: number | THREE.Color }>;

/**
 * Wet tissue: a physical material whose rim glows and whose face goes thin,
 * so a sac reads as a see-through organ with a bright edge (the classic
 * medical-render look) instead of a flat translucent blob.
 */
const tissue = (color: string, rim: string, opts: { opacity?: number; map?: THREE.Texture | null; face?: number } = {}) => {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    map: opts.map ?? null,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    sheen: 0.6,
    sheenColor: new THREE.Color(rim),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const u: Uniforms = { uRim: { value: new THREE.Color(rim) }, uShow: { value: 1 }, uFace: { value: opts.face ?? 0.35 }, uOpacity: { value: opts.opacity ?? 0.85 } };
  m.userData.u = u;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.fragmentShader = s.fragmentShader
      .replace("void main() {", "uniform vec3 uRim;\nuniform float uShow;\nuniform float uFace;\nuniform float uOpacity;\nvoid main() {")
      .replace(
        "#include <opaque_fragment>",
        // clamp: pow of a tiny negative is NaN, and bloom spreads it over the frame.
        `float f = pow(clamp(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.0);
         outgoingLight += uRim * f * 1.4;
         diffuseColor.a = uOpacity * uShow * mix(uFace, 1.0, f);
         #include <opaque_fragment>`,
      );
  };
  return m;
};
const setU = (m: THREE.Material, k: string, v: number) => {
  const u = (m.userData.u as Uniforms)[k];
  if (u) u.value = v;
};

const NOISE = `
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }`;

/** Swirling glowing gas (methane): 3D noise, soft at the silhouette, additive. */
const GAS_VERT = `
varying vec3 vPos; varying vec3 vN; varying vec3 vView;
void main() {
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const GAS_FRAG = `
uniform float uTime; uniform float uAmount; uniform vec3 uColor; uniform vec3 uHot;
varying vec3 vPos; varying vec3 vN; varying vec3 vView;
${NOISE}
void main() {
  vec3 p = normalize(vPos) * 2.2;
  float swirl = fbm(p + vec3(uTime * 0.6, -uTime * 0.4, uTime * 0.3));
  float wisps = fbm(p * 2.0 - vec3(0.0, uTime * 0.9, 0.0) + swirl * 1.5);
  float face = clamp(abs(dot(vN, vView)), 0.0, 1.0);
  float body = pow(face, 1.6);
  float a = uAmount * body * (0.25 + 0.95 * wisps);
  vec3 c = mix(uColor, uHot, smoothstep(0.55, 0.9, wisps) * 0.8);
  gl_FragColor = vec4(c * (0.6 + 1.2 * wisps), a);
}`;
const gasMaterial = (color: [number, number, number], hot: [number, number, number]) =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmount: { value: 1 }, uColor: { value: new THREE.Color(...color) }, uHot: { value: new THREE.Color(...hot) } },
    vertexShader: GAS_VERT,
    fragmentShader: GAS_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

/** Flow inside the duct (uv.x runs tank → mouth): gas bands going up, or fire filling down to a front. */
const FLOW_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLOW_FRAG = `
uniform float uTime; uniform float uGas; uniform float uFire; uniform float uFront;
varying vec2 vUv;
${NOISE}
void main() {
  float x = vUv.x;
  float n = fbm(vec3(x * 18.0 - uTime * 3.0, vUv.y * 6.0, uTime * 0.5));
  float bands = smoothstep(0.35, 0.8, sin(x * 26.0 - uTime * 7.0) * 0.5 + 0.5) * (0.4 + n);
  vec3 gas = vec3(0.35, 1.5, 1.7) * bands * uGas;
  float lit = smoothstep(uFront - 0.04, uFront + 0.02, x);
  float edge = exp(-pow((x - uFront) * 22.0, 2.0));
  vec3 fire = mix(vec3(2.2, 0.6, 0.1), vec3(2.6, 1.8, 0.7), edge) * (lit * (0.5 + 0.8 * n) + edge * 1.5) * uFire;
  vec3 c = gas + fire;
  gl_FragColor = vec4(c, clamp(max(max(c.r, c.g), c.b), 0.0, 1.0));
}`;

// ---------------------------------------------------------------------------
// Textures and shapes
// ---------------------------------------------------------------------------
const canvasTex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Striated muscle: dense wavy fibres with darker seams between bundles. */
let muscle: THREE.Texture | null = null;
const muscleTex = () =>
  (muscle ??= canvasTex(512, 256, (ctx) => {
    ctx.fillStyle = "#8e2a2c";
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 180; i++) {
      const y0 = (i / 180) * 256;
      const shade = 0.75 + 0.5 * random(`fib-${i}`);
      ctx.strokeStyle = `rgba(${Math.round(210 * shade)},${Math.round(80 * shade)},${Math.round(84 * shade)},0.55)`;
      ctx.lineWidth = 1 + random(`fw-${i}`) * 1.5;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = y0 + 3 * Math.sin(x * 0.03 + i) + 1.5 * Math.sin(x * 0.11 + i * 2);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(60,10,16,0.6)";
    ctx.lineWidth = 3;
    for (let k = 0; k < 9; k++) {
      const y = (k / 9) * 256 + 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 16) ctx.lineTo(x, y + 4 * Math.sin(x * 0.02 + k));
      ctx.stroke();
    }
  }));

/** Stomach wall: pink mucosa with fine veins. */
let wall: THREE.Texture | null = null;
const wallTex = () =>
  (wall ??= canvasTex(512, 256, (ctx) => {
    ctx.fillStyle = "#c98a7a";
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 40; i++) {
      let x = random(`vx-${i}`) * 512;
      let y = random(`vy-${i}`) * 256;
      ctx.strokeStyle = `rgba(150,40,60,${0.25 + 0.3 * random(`va-${i}`)})`;
      ctx.lineWidth = 0.8 + 1.6 * random(`vw-${i}`);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 14; k++) {
        x += (random(`dx-${i}-${k}`) - 0.3) * 30;
        y += (random(`dy-${i}-${k}`) - 0.5) * 22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }));

/** A bean (kidney) shape: stretched sphere bent upward at both ends, dented on top. */
const beanGeo = () => {
  const g = new THREE.SphereGeometry(1, 64, 40);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const x = v.x * 1.35;
    const dent = Math.max(0, v.y) * 0.22 * Math.exp(-v.x * v.x * 3);
    const y = v.y * 0.85 + 0.28 * v.x * v.x - dent;
    const z = v.z * 0.9 * (1 + 0.06 * Math.sin(v.x * 7) * Math.sin(v.y * 5));
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
};

/** Teardrop sac pointing up (toward the duct). */
const sacGeo = () => {
  const pts = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39;
    const r = Math.sin(t * Math.PI) * (1 - 0.45 * t * t) + 0.12 * Math.pow(t, 6);
    return new THREE.Vector2(Math.max(0.001, r), -Math.cos(t * Math.PI) * 1.05);
  });
  const g = new THREE.LatheGeometry(pts, 56);
  g.computeVertexNormals();
  return g;
};

const C = new THREE.Color();
const C2 = new THREE.Color();
const mixHex = (a: string, b: string, t: number) => `#${C.set(a).lerp(C2.set(b), Math.max(0, Math.min(1, t))).getHexString()}`;
const FRAGS = 90;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const DragonGuts: React.FC<{ a: DragonAnchors; s: GutsState }> = ({ a, s }) => {
  const frame = useCurrentFrame();
  const R = a.size;
  const geo = useMemo(
    () => ({
      bean: beanGeo(),
      sac: sacGeo(),
      ball: new THREE.SphereGeometry(1, 40, 28),
      bead: new THREE.SphereGeometry(1, 12, 10),
      frag: new THREE.SphereGeometry(1, 8, 6).scale(1, 0.18, 0.6),
      band: new THREE.TorusGeometry(1, 0.055, 12, 48),
      ring: new THREE.TorusGeometry(1, 0.1, 8, 24),
      disc: new THREE.CircleGeometry(1, 40),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      gutWall: tissue("#d49284", "#ffb39a", { opacity: 0.8, map: wallTex(), face: 0.18 }),
      liquid: new THREE.MeshPhysicalMaterial({ color: "#5d6a24", roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
      frag: new THREE.MeshStandardMaterial({ roughness: 0.45 }),
      muscle: tissue("#ffffff", "#ff7060", { opacity: 0.95, map: muscleTex(), face: 0.62 }),
      band: new THREE.MeshPhysicalMaterial({ color: "#9a3036", roughness: 0.4, clearcoat: 0.6, map: muscleTex(), transparent: true, opacity: 0.9 }),
      gas: gasMaterial([0.12, 0.62, 0.72], [0.45, 1.1, 1.2]),
      duct: tissue("#d98a88", "#ffc0b4", { opacity: 0.75, face: 0.3 }),
      cartilage: new THREE.MeshPhysicalMaterial({ color: "#d9b8a8", roughness: 0.45, clearcoat: 0.5, transparent: true, opacity: 0.55, depthWrite: false }),
      flow: new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uGas: { value: 0 }, uFire: { value: 0 }, uFront: { value: 1 } },
        vertexShader: FLOW_VERT,
        fragmentShader: FLOW_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
      gland: tissue("#d8cf48", "#fff7a0", { opacity: 0.95, face: 0.6 }),
      bubble: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.6, 0.5), transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }),
    }),
    [],
  );
  const fragMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo.frag, mats.frag, FRAGS);
    const palette = ["#39421a", "#4a3f1a", "#2e3512", "#55491f", "#3d2c14"];
    for (let i = 0; i < FRAGS; i++) m.setColorAt(i, C.set(palette[Math.floor(random(`gf-c-${i}`) * palette.length)]));
    m.renderOrder = 3;
    m.frustumCulled = false;
    return m;
  }, [geo, mats]);
  const lastTubes = useRef<THREE.BufferGeometry[]>([]);

  const show = Math.max(0, Math.min(1, s.show));
  if (show <= 0.01) return null;
  const char = s.char ?? 0;
  const t = frame / 30;

  // ---- Gut (rumen) ----------------------------------------------------------
  const gutR = 0.3 * R;
  setU(mats.gutWall, "uShow", show);
  mats.gutWall.color.set(mixHex("#d49284", "#2a1410", char));
  mats.liquid.opacity = 0.55 * show;
  mats.liquid.color.set(mixHex("#5d6a24", "#120c06", char));
  mats.frag.color.set(mixHex("#ffffff", "#1a1208", char));
  mats.frag.transparent = show < 1;
  mats.frag.opacity = show;
  // Plant fragments churn slowly round the sac under the liquid line.
  const o = new THREE.Object3D();
  for (let i = 0; i < FRAGS; i++) {
    const r = (k: string) => random(`gf-${k}-${i}`);
    const ang = r("a") * Math.PI * 2 + t * (0.25 + 0.2 * r("w"));
    const rad = Math.sqrt(r("d")) * 0.95;
    o.position.set(Math.cos(ang) * rad * 1.15, -0.55 + 0.75 * r("h") + 0.05 * Math.sin(t * 2 + i), Math.sin(ang) * rad * 0.6);
    o.rotation.set(r("rx") * 6 + t * 0.3, r("ry") * 6, r("rz") * 6);
    const k = 0.07 + 0.09 * r("s");
    o.scale.set(k, k, k);
    o.updateMatrix();
    fragMesh.setMatrixAt(i, o.matrix);
  }
  fragMesh.instanceMatrix.needsUpdate = true;
  if (fragMesh.instanceColor) fragMesh.instanceColor.needsUpdate = true;

  const ferment = s.ferment ?? 0;
  const methane = s.methane ?? 0;
  mats.bubble.color.setRGB(0.35 - 0.2 * methane, 0.95, 0.3 + 0.75 * methane);
  mats.bubble.opacity = 0.75 * show;
  const bubbles = Array.from({ length: 34 }, (_, i) => {
    const r = (k: string) => random(`gutb-${k}-${i}`);
    const L = 40 + 50 * r("l");
    const age = (((frame * (0.6 + ferment)) / L + r("p")) % 1 + 1) % 1;
    const ang = r("a") * Math.PI * 2;
    const rad = 0.8 * Math.sqrt(r("r"));
    return {
      p: [Math.cos(ang) * rad * 1.1, -0.5 + age * 1.1, 0.25 + Math.sin(ang) * rad * 0.4] as Vec3,
      size: (0.04 + 0.07 * r("s")) * Math.sin(age * Math.PI),
    };
  });

  // ---- Second stomach ---------------------------------------------------------
  const tank = Math.max(0, s.tank ?? 0);
  const squeeze = s.squeeze ?? 0;
  const breathe = 1 + 0.03 * Math.sin(frame * 0.25) * (1 - squeeze);
  const tankR = 0.27 * R * tank;
  const fill = s.fill ?? 0;
  const bright = 1 + 1.6 * squeeze;
  setU(mats.muscle, "uShow", show);
  mats.muscle.color.set(mixHex("#ffffff", "#3a1a14", char));
  mats.band.color.set(mixHex("#c0484c", "#1d0c0a", char));
  mats.gas.uniforms.uTime.value = t * (1 + 2 * squeeze);
  mats.gas.uniforms.uAmount.value = show * Math.min(1, fill * 1.4) * (0.7 + 0.5 * squeeze);
  (mats.gas.uniforms.uColor.value as THREE.Color).setRGB(0.12 * bright, 0.62 * bright, 0.72 * bright);
  const sq: Vec3 = [1 - 0.28 * squeeze, 1 - 0.18 * squeeze, 1 - 0.28 * squeeze];

  // ---- Duct: from the top of the tank, up the throat, to the mouth -----------
  const pts = [a.tank, ...a.throat, a.mouth].map((p) => new THREE.Vector3(...p));
  pts[0].y += tankR * 0.9;
  const curve = new THREE.CatmullRomCurve3(pts);
  const ductR = 0.05 * R;
  const ductGeo = new THREE.TubeGeometry(curve, 64, ductR, 14, false);
  const flowGeo = new THREE.TubeGeometry(curve, 64, ductR * 0.62, 10, false);
  // Two tubes per frame: free last frame's.
  lastTubes.current.forEach((g) => g.dispose());
  lastTubes.current = [ductGeo, flowGeo];
  setU(mats.duct, "uShow", show);
  mats.cartilage.opacity = 0.85 * show;
  const flow = s.flow ?? 0;
  const front = s.flashback ?? -1;
  const back = Math.max(0, Math.min(1, s.back ?? 0));
  mats.flow.uniforms.uTime.value = t;
  mats.flow.uniforms.uGas.value = flow * show;
  mats.flow.uniforms.uFire.value = front >= 0 ? back * show : 0;
  mats.flow.uniforms.uFront.value = front >= 0 ? 1 - front : 1;
  const Z = new THREE.Vector3(0, 0, 1);
  const rings = Array.from({ length: 16 }, (_, i) => {
    const u = (i + 0.5) / 16;
    return { p: curve.getPointAt(u).toArray() as Vec3, q: new THREE.Quaternion().setFromUnitVectors(Z, curve.getTangentAt(u)) };
  });

  // ---- Gland --------------------------------------------------------------------
  const gland = s.gland ?? 0;
  const burn = s.burn ?? 0;
  mats.gland.emissive.set(mixHex("#5a5010", "#ff5a10", burn));
  mats.gland.emissiveIntensity = 0.4 + 5 * burn;
  setU(mats.gland, "uShow", show);

  return (
    <group>
      {/* Gut: sac, contents, liquid line, bubbles. */}
      <group position={a.gut} scale={gutR} rotation={[0, 0, 0.12]}>
        <mesh geometry={geo.bean} material={mats.gutWall} renderOrder={4} />
        <primitive object={fragMesh} />
        <mesh geometry={geo.disc} material={mats.liquid} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 0.7, 1]} renderOrder={3} />
        {ferment > 0.01
          ? bubbles.map((b, i) =>
              // A zero scale gives NaN normals, and bloom spreads one NaN pixel over the whole frame.
              b.size > 1e-4 ? <mesh key={i} geometry={geo.bead} material={mats.bubble} position={b.p} scale={b.size} renderOrder={5} /> : null,
            )
          : null}
      </group>

      {/* Second stomach: muscle sac, squeezing bands, swirling methane. */}
      {tank > 0.01 ? (
        <group position={a.tank} scale={tankR} rotation={[0, 0, -0.35]}>
          <group scale={sq}>
            <mesh geometry={geo.ball} material={mats.gas} scale={[0.78 * breathe, 0.82 * breathe, 0.78 * breathe]} renderOrder={3} />
            <mesh geometry={geo.sac} material={mats.muscle} scale={breathe} renderOrder={4} />
          </group>
          {[-0.45, 0, 0.42].map((y, i) => {
            const pinch = 1 - 0.22 * squeeze * (0.8 + 0.2 * Math.sin(frame * 0.5 + i));
            const w = Math.sqrt(Math.max(0.05, 1 - (y / 1.05) ** 2)) * 0.97 * sq[0] * pinch;
            return <mesh key={i} geometry={geo.band} material={mats.band} position={[0, y * sq[1], 0]} rotation={[Math.PI / 2, 0, 0]} scale={[w, w, 1]} renderOrder={4} />;
          })}
        </group>
      ) : null}

      {/* Fuel duct: ribbed tube with the flow inside. */}
      {tank > 0.5 ? (
        <>
          <mesh geometry={ductGeo} material={mats.duct} renderOrder={4} />
          <mesh geometry={flowGeo} material={mats.flow} renderOrder={5} />
          {rings.map((r, i) => (
            <mesh key={i} geometry={geo.ring} material={mats.cartilage} position={r.p} quaternion={r.q} scale={ductR * 1.02} renderOrder={4} />
          ))}
        </>
      ) : null}

      {/* Fire gland. */}
      {gland > 0.01 ? <mesh geometry={geo.ball} material={mats.gland} position={a.throat[a.throat.length - 2]} scale={[0.1 * R * gland, 0.075 * R * gland, 0.08 * R * gland]} renderOrder={5} /> : null}
    </group>
  );
};
