import { useThree } from "@react-three/fiber";
import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";

/**
 * Realistic fire, sparks, explosions and gas for the dragon short: deterministic
 * particle fields drawn as soft camera-facing points (one draw call each).
 * Every particle is a pure function of (frame, index, seed): nothing is
 * simulated, so any frame renders on its own.
 *
 * - FireJet: a breath of flame from `origin` along `dir` (white core → yellow →
 *   orange → red → smoke), with buoyancy, widening and turbulence.
 * - Fireball: an explosion at one frame (flash, expanding fire, then smoke).
 * - SparkShower: ballistic sparks with short streaks, at one frame.
 * - GasJet: a cool, see-through stream (methane) from `origin` along `dir`.
 * - Embers: slow glowing motes drifting up through a box.
 */

// ---------------------------------------------------------------------------
// Shared points material
// ---------------------------------------------------------------------------
const blobTexture = (() => {
  let tex: THREE.Texture | null = null;
  return () => {
    if (tex || typeof document === "undefined") return tex;
    const n = 128;
    const c = document.createElement("canvas");
    c.width = c.height = n;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const dx = (x - n / 2) / (n / 2);
        const dy = (y - n / 2) / (n / 2);
        const r = Math.hypot(dx, dy);
        // Soft gaussian puff with faint wisps: many overlapping puffs make the flame.
        const wisp = 1 + 0.18 * Math.sin(dx * 9 + Math.sin(dy * 7) * 2) * Math.sin(dy * 8 + 1.1);
        const v = Math.max(0, Math.exp(-r * r * 3.2) * wisp - 0.04) * Math.max(0, 1 - r);
        const i = (y * n + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.min(255, 255 * v);
      }
    ctx.putImageData(img, 0, 0);
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();

const VERT = `
attribute float aSize;
attribute vec4 aColor;
attribute float aSpin;
uniform float uScale;
varying vec4 vColor;
varying float vSpin;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float unit = length(modelMatrix[0].xyz);
  gl_PointSize = aSize * unit * uScale / max(0.05, -mv.z);
  gl_Position = projectionMatrix * mv;
  vColor = aColor;
  vSpin = aSpin;
}`;
const FRAG = `
uniform sampler2D uMap;
varying vec4 vColor;
varying float vSpin;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vSpin), s = sin(vSpin);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  float a = texture2D(uMap, p).a;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

type Particle = { p: Vec3; size: number; color: [number, number, number, number]; spin?: number };

/** One points cloud; `additive` for light (fire, sparks), normal for smoke and gas. */
const Points: React.FC<{ parts: Particle[]; additive?: boolean; order?: number }> = ({ parts, additive = true, order = 10 }) => {
  const { size, camera } = useThree();
  const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;
  const uScale = size.height / 2 / Math.tan(((fov * Math.PI) / 180) / 2);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: blobTexture() }, uScale: { value: 1 } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: false,
      }),
    [additive],
  );
  mat.uniforms.uScale.value = uScale;
  const n = parts.length;
  const pos = new Float32Array(n * 3);
  const sz = new Float32Array(n);
  const col = new Float32Array(n * 4);
  const spin = new Float32Array(n);
  parts.forEach((q, i) => {
    pos.set(q.p, i * 3);
    sz[i] = q.size;
    col.set(q.color, i * 4);
    spin[i] = q.spin ?? 0;
  });
  if (!n) return null;
  return (
    <points material={mat} renderOrder={order} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sz, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[col, 4]} />
        <bufferAttribute attach="attributes-aSpin" args={[spin, 1]} />
      </bufferGeometry>
    </points>
  );
};

// ---------------------------------------------------------------------------
// Colour ramps
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const ramp = (stops: [number, RGB][], t: number): RGB => {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++)
    if (t <= stops[i][0]) {
      const [t0, a] = stops[i - 1];
      const [t1, b] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
  return stops[stops.length - 1][1];
};
/** HDR fire (values above 1 bloom): white-blue root, yellow, orange, deep red. */
const FIRE: [number, RGB][] = [
  [0, [1.9, 1.45, 0.8]],
  [0.1, [2.0, 1.1, 0.3]],
  [0.3, [1.7, 0.55, 0.1]],
  [0.6, [1.0, 0.2, 0.04]],
  [1, [0.3, 0.05, 0.02]],
];
/** Clean gas flame (stove, rocket): blue root, violet, a little orange at the tips. */
const BLUE: [number, RGB][] = [
  [0, [1.4, 1.6, 2.4]],
  [0.25, [0.35, 0.6, 2.2]],
  [0.6, [0.5, 0.25, 1.1]],
  [0.85, [0.9, 0.35, 0.15]],
  [1, [0.2, 0.05, 0.05]],
];

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Two unit vectors perpendicular to `d`. */
const basis = (d: Vec3): [Vec3, Vec3] => {
  const up: Vec3 = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = norm(cross(d, up));
  return [u, norm(cross(u, d))];
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// FireJet
// ---------------------------------------------------------------------------
export interface FireJetProps {
  origin: Vec3;
  dir: Vec3;
  /** 0..1 over time (throttle): scales length, width and emission. */
  power: (frame: number) => number;
  /** First frame the jet can emit (particles never come from before it). */
  start: number;
  length?: number;
  width?: number;
  count?: number;
  /** Frames a particle lives at full power. */
  life?: number;
  seed?: string;
  /** Lift per unit length at the far end (hot gas rises). */
  lift?: number;
  /** Add a smoke trail above the flame. */
  smoke?: boolean;
  light?: boolean;
  /** "fire" (orange) or "blue" (clean gas burner, rocket). */
  palette?: "fire" | "blue";
  /** Opacity per particle. */
  alpha?: number;
  /** "add" glows (small flames); "mix" keeps big flames orange instead of saturating to white. */
  blend?: "add" | "mix";
}

export const FireJet: React.FC<FireJetProps> = ({
  origin,
  dir,
  power,
  start,
  length = 4,
  width = 0.9,
  count = 320,
  life = 20,
  seed = "jet",
  lift = 0.25,
  smoke = true,
  light = true,
  palette = "fire",
  alpha = 0.55,
  blend = "add",
}) => {
  const frame = useCurrentFrame();
  const d = norm(dir);
  const [u, v] = basis(d);
  const fire: Particle[] = [];
  const soot: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${k}-${i}`);
    const L = life * (0.75 + 0.5 * r("l"));
    const phase = r("p");
    const age = (((frame - start) / L + phase) % 1 + 1) % 1;
    const born = frame - age * L;
    if (born < start) continue;
    const pw = power(Math.round(born));
    if (pw <= 0.02 || r("e") > pw + 0.15) continue;
    const reach = length * pw * (0.82 + 0.3 * r("reach"));
    const s = reach * (1 - Math.pow(1 - age, 1.7));
    const ang = r("a") * Math.PI * 2;
    const rad = width * pw * (0.08 + age * 0.9) * Math.sqrt(r("r"));
    const swirl = 0.35 * width * age * Math.sin(frame * 0.35 + i * 1.7);
    const off = [
      Math.cos(ang) * rad + swirl * 0.5,
      Math.sin(ang) * rad + Math.cos(frame * 0.29 + i) * 0.3 * width * age,
    ];
    const rise = lift * length * age * age;
    const p: Vec3 = [
      origin[0] + d[0] * s + u[0] * off[0] + v[0] * off[1],
      origin[1] + d[1] * s + u[1] * off[0] + v[1] * off[1] + rise,
      origin[2] + d[2] * s + u[2] * off[0] + v[2] * off[1],
    ];
    const c = ramp(palette === "blue" ? BLUE : FIRE, age * (0.85 + 0.3 * r("c")));
    const fade = smooth(0, 0.06, age) * (1 - smooth(0.62, 1, age));
    const sz = width * pw * (0.22 + 1.5 * age) * (0.7 + 0.6 * r("s"));
    fire.push({ p, size: sz, color: [c[0], c[1], c[2], alpha * fade], spin: r("spin") * 6 + frame * 0.05 * (r("dir") - 0.5) });
    if (smoke && age > 0.55 && r("smk") < 0.45) {
      const k = smooth(0.55, 1, age);
      soot.push({
        p: [p[0], p[1] + rise * 0.6 + 0.4 * k, p[2]],
        size: sz * (1.3 + 0.8 * k),
        color: [0.09, 0.07, 0.065, 0.32 * k * (1 - smooth(0.88, 1, age))],
        spin: r("spin2") * 6,
      });
    }
  }
  const now = power(frame);
  const flick = 0.85 + 0.15 * Math.sin(frame * 0.9) + 0.08 * Math.sin(frame * 2.3);
  return (
    <>
      <Points parts={soot} additive={false} order={9} />
      <Points parts={fire} order={11} additive={blend === "add"} />
      {light && now > 0.02 ? (
        <pointLight
          position={[origin[0] + d[0] * length * 0.35, origin[1] + d[1] * length * 0.35 + 0.2, origin[2] + d[2] * length * 0.35]}
          color={palette === "blue" ? "#6f8cff" : "#ff8a33"}
          intensity={60 * now * flick * (length / 4)}
          distance={length * 4}
          decay={2}
        />
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// Fireball
// ---------------------------------------------------------------------------
export const Fireball: React.FC<{ at: Vec3; frame0: number; radius?: number; count?: number; seed?: string; light?: number; dur?: number }> = ({
  at,
  frame0,
  radius = 2.5,
  count = 420,
  seed = "boom",
  light = 1,
  dur = 50,
}) => {
  const frame = useCurrentFrame();
  const t = frame - frame0;
  if (t < 0 || t > dur * 1.6) return null;
  const fire: Particle[] = [];
  const soot: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${k}-${i}`);
    const z = r("z") * 2 - 1;
    const ph = r("ph") * Math.PI * 2;
    const q = Math.sqrt(1 - z * z);
    const dirv: Vec3 = [q * Math.cos(ph), z * 0.8 + 0.25, q * Math.sin(ph)];
    const life = dur * (0.55 + 0.6 * r("l"));
    const age = t / life;
    if (age > 1.4) continue;
    const reach = radius * (0.35 + 0.75 * r("d"));
    const s = reach * (1 - Math.pow(1 - Math.min(1, age), 3));
    const rise = 0.9 * radius * Math.max(0, age - 0.2) ** 2;
    const p: Vec3 = [at[0] + dirv[0] * s, at[1] + dirv[1] * s + rise, at[2] + dirv[2] * s];
    const sz = radius * (0.3 + 0.7 * Math.min(1, age * 2)) * (0.6 + 0.7 * r("s"));
    if (age < 1) {
      const c = ramp(FIRE, Math.min(1, age * 1.25));
      fire.push({ p, size: sz, color: [c[0], c[1], c[2], 0.75 * (1 - smooth(0.6, 1, age))], spin: r("sp") * 6 });
    }
    if (age > 0.35 && r("smk") < 0.6) {
      const k = smooth(0.35, 1.4, age);
      soot.push({ p: [p[0], p[1] + 0.3 * k * radius, p[2]], size: sz * (1.2 + k), color: [0.08, 0.065, 0.06, 0.5 * smooth(0.35, 0.6, age) * (1 - smooth(1.1, 1.4, age))], spin: r("sp2") * 6 });
    }
  }
  const flash = Math.max(0, 1 - t / 14);
  return (
    <>
      <Points parts={soot} additive={false} order={9} />
      <Points parts={fire} order={11} additive={false} />
      {light > 0 ? <pointLight position={[at[0], at[1] + 0.5, at[2] + 0.5]} color="#ffb060" intensity={(120 * flash + 40 * Math.max(0, 1 - t / dur)) * light} distance={radius * 10} decay={2} /> : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// SparkShower
// ---------------------------------------------------------------------------
export const SparkShower: React.FC<{ at: Vec3; dir: Vec3; frame0: number; count?: number; speed?: number; spread?: number; seed?: string; size?: number; gravity?: number }> = ({
  at,
  dir,
  frame0,
  count = 90,
  speed = 0.09,
  spread = 0.9,
  seed = "spark",
  size = 0.05,
  gravity = 0.004,
}) => {
  const frame = useCurrentFrame();
  const t = frame - frame0;
  if (t < 0 || t > 34) return null;
  const d = norm(dir);
  const [u, v] = basis(d);
  const parts: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${k}-${i}`);
    const life = 10 + 22 * r("l");
    if (t > life) continue;
    const a = r("a") * Math.PI * 2;
    const k = spread * Math.sqrt(r("k"));
    const vel: Vec3 = norm([d[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * k, d[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * k, d[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * k]);
    const sp = speed * (0.4 + 1.2 * r("sp"));
    const drag = (x: number) => (1 - Math.pow(0.93, x)) / (1 - 0.93);
    const fade = 1 - t / life;
    // A short streak: the spark and three samples behind it.
    for (let j = 0; j < 4; j++) {
      // +1.5: sparks leave the strike already moving, never as one blob on the contact frame.
      const tt = Math.max(0, t + 1.5 - j * 0.7);
      const s = sp * drag(tt);
      parts.push({
        p: [at[0] + vel[0] * s, at[1] + vel[1] * s - gravity * tt * tt, at[2] + vel[2] * s],
        size: size * (1 - j * 0.2) * (0.7 + 0.6 * r("s")),
        color: [2.6, 1.7 - 0.5 * (1 - fade), 0.6 * fade, fade * (1 - j * 0.22)],
      });
    }
  }
  const flash = Math.max(0, 1 - t / 6);
  return (
    <>
      <Points parts={parts} order={12} />
      {flash > 0 ? <pointLight position={at} color="#ffd27a" intensity={2 * flash} distance={1.2} decay={2} /> : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// GasJet (methane: cool, faintly visible)
// ---------------------------------------------------------------------------
export const GasJet: React.FC<{ origin: Vec3; dir: Vec3; power: (f: number) => number; start: number; length?: number; width?: number; count?: number; color?: RGB; seed?: string; opacity?: number }> = ({
  origin,
  dir,
  power,
  start,
  length = 2,
  width = 0.4,
  count = 90,
  color = [0.55, 0.95, 1.0],
  seed = "gas",
  opacity = 0.16,
}) => {
  const frame = useCurrentFrame();
  const d = norm(dir);
  const [u, v] = basis(d);
  const parts: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${k}-${i}`);
    const L = 26 * (0.7 + 0.6 * r("l"));
    const age = (((frame - start) / L + r("p")) % 1 + 1) % 1;
    const born = frame - age * L;
    if (born < start) continue;
    const pw = power(Math.round(born));
    if (pw <= 0.02) continue;
    const s = length * pw * (1 - Math.pow(1 - age, 2));
    const ang = r("a") * Math.PI * 2;
    const rad = width * (0.1 + age) * Math.sqrt(r("r"));
    const p: Vec3 = [
      origin[0] + d[0] * s + (u[0] * Math.cos(ang) + v[0] * Math.sin(ang)) * rad,
      origin[1] + d[1] * s + (u[1] * Math.cos(ang) + v[1] * Math.sin(ang)) * rad + 0.1 * age,
      origin[2] + d[2] * s + (u[2] * Math.cos(ang) + v[2] * Math.sin(ang)) * rad,
    ];
    const fade = smooth(0, 0.15, age) * (1 - smooth(0.5, 1, age));
    parts.push({ p, size: width * (0.4 + 1.6 * age), color: [color[0], color[1], color[2], opacity * fade * pw], spin: r("s") * 6 });
  }
  return <Points parts={parts} additive={false} order={8} />;
};

// ---------------------------------------------------------------------------
// Embers
// ---------------------------------------------------------------------------
export const Embers: React.FC<{ center: Vec3; box: Vec3; count?: number; seed?: string; amount?: number }> = ({ center, box, count = 60, seed = "ember", amount = 1 }) => {
  const frame = useCurrentFrame();
  if (amount <= 0) return null;
  const parts: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${k}-${i}`);
    const L = 120 + 120 * r("l");
    const age = ((frame / L + r("p")) % 1 + 1) % 1;
    const p: Vec3 = [
      center[0] + (r("x") - 0.5) * box[0] + 0.3 * Math.sin(frame * 0.03 + i),
      center[1] - box[1] / 2 + age * box[1],
      center[2] + (r("z") - 0.5) * box[2] + 0.3 * Math.cos(frame * 0.025 + i * 2),
    ];
    const tw = 0.6 + 0.4 * Math.sin(frame * 0.3 + i * 3.1);
    parts.push({ p, size: 0.035 + 0.03 * r("s"), color: [2.2, 0.9, 0.3, amount * tw * Math.sin(age * Math.PI)] });
  }
  return <Points parts={parts} order={7} />;
};
