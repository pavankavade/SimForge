// Procedural materials (TSL) for no-man's land: churned mud with wet hollows and puddles, sandbag
// hessian, weathered planks, the horses' hide, and the papier-mache copy (grey paper until it is
// painted to match). The sky runs grey dawn -> overcast day -> moonlit night, with far gun flashes.
import * as THREE from "three/webgpu";
import {
  color, uniform, mix, float, vec3, vec4, positionWorld, normalWorld, mx_fractal_noise_float, mx_noise_float,
  bumpMap, hash, floor, smoothstep, select, frontFacing, normalize, clamp, pow, dot, abs, positionWorldDirection,
  sin, cameraViewMatrix,
} from "three/tsl";

const lin = (hex) => color(new THREE.Color(hex));

// Shared animated state the film drives (anim.js propsAt -> main.js).
export const U = {
  night: uniform(0),        // 0 = day, 1 = moonlit night
  dawn: uniform(0),         // 0..1 warm low-sun tint on the sky
  flash: uniform(0),        // 0..1 a far gun flash lighting the horizon (night barrage)
  paint: uniform(1),        // the copy: 0 = bare grey papier-mache, 1 = painted to match the hide
  sunDir: uniform(new THREE.Vector3(0.5, 0.25, -0.8).normalize()),
};

// Churned mud: dark brown, lighter dried crust on the tops, wet and glossy in the hollows (low y),
// with clods and boot-churned ripples in the bump.
export function mudMaterial({ wetY = -0.25 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = positionWorld;
  const big = mx_fractal_noise_float(p.mul(0.12), 3, 2, 0.5);
  const mid = mx_fractal_noise_float(p.mul(0.9), 3, 2, 0.5);
  const fine = mx_noise_float(p.mul(9));
  const wet = smoothstep(wetY + 0.2, wetY - 0.25, p.y).max(smoothstep(0.25, 0.45, big.mul(0.5).add(0.5)).mul(0.35));
  const dry = lin(0x7a5638).mul(float(0.85).add(mid.mul(0.12)));
  const dark = lin(0x45301f).mul(float(0.9).add(mid.mul(0.1)));
  m.colorNode = mix(mix(dry, dark, smoothstep(-0.3, 0.4, big)), lin(0x30200f), wet.mul(0.8)).mul(mix(float(1), float(0.55), U.night));
  m.roughnessNode = mix(float(0.92).add(fine.mul(0.04)), float(0.22), wet);
  m.metalnessNode = float(0);
  m.normalNode = bumpMap(mid.mul(0.05).add(fine.mul(0.003)));
  return m;
}

// Puddle water in a crater bottom: dark, glossy (SSR picks it up), a faint ripple.
export function waterMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = positionWorld;
  m.colorNode = lin(0x1c1a17);
  m.roughnessNode = float(0.14);
  m.metalnessNode = float(0);
  m.normalNode = bumpMap(mx_noise_float(p.mul(vec3(3, 1, 3))).mul(0.004));
  return m;
}

// Hessian sandbags: woven cloth with a damp, muddy lower half.
export function sackMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = positionWorld;
  const weave = sin(p.x.mul(220)).mul(sin(p.z.mul(220))).mul(0.5).add(0.5);
  const blot = mx_fractal_noise_float(p.mul(2.5), 3, 2, 0.5);
  const base = mix(lin(0xc0a06a), lin(0xa08050), blot.mul(0.5).add(0.5));
  m.colorNode = mix(base.mul(float(0.92).add(weave.mul(0.08))), lin(0x4d3b29), smoothstep(0.35, 0.0, p.y).mul(0.55));
  m.roughnessNode = float(0.95);
  m.normalNode = bumpMap(weave.mul(0.002).add(blot.mul(0.01)));
  return m;
}

// Weathered planks (duckboards, revetments, the workshop): grain along the board, darker joints.
export function woodMaterial(hex = 0x7a5a3a, { along = "x" } = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = positionWorld;
  const a = along === "x" ? p.x : along === "y" ? p.y : p.z;
  const b = along === "x" ? p.z.add(p.y) : p.x.add(p.z);
  const grain = sin(b.mul(60).add(mx_noise_float(vec3(a.mul(0.6), b.mul(3), 0)).mul(6))).mul(0.5).add(0.5);
  const blot = mx_fractal_noise_float(p.mul(1.4), 3, 2, 0.5);
  m.colorNode = lin(hex).mul(float(0.8).add(grain.mul(0.14)).add(blot.mul(0.1)));
  m.roughnessNode = float(0.85);
  m.normalNode = bumpMap(grain.mul(0.003));
  return m;
}

// Horse hide: short coat with soft mottling, a darker dorsal side; `hex` picks bay/grey/dun.
// The papier-mache copy uses the same hide once U.paint reaches 1; before that it is grey paper
// with torn-strip edges. Its inside (back faces, seen in the cutaway) is raw paper over laths.
// The coat: short hair laid along the body (fine streaks), soft dapples and a sun-bleached top,
// dried mud caked on whatever lies near the ground, and matted, darker patches.
function hideColor(hex, p) {
  const mott = mx_fractal_noise_float(p.mul(3.2), 3, 2, 0.5);
  const hairGrain = mx_noise_float(vec3(p.x.mul(6), p.y.mul(90), p.z.mul(90))).mul(0.5).add(0.5);
  const matted = smoothstep(0.55, 0.8, mx_fractal_noise_float(p.mul(1.6).add(7), 3, 2, 0.5).mul(0.5).add(0.5));
  const mudFace = mx_fractal_noise_float(p.mul(5), 3, 2, 0.5).mul(0.5).add(0.5);
  const mud = smoothstep(0.38, 0.1, p.y).mul(smoothstep(0.35, 0.6, mudFace)).mul(0.85);
  const coat = lin(hex).mul(float(0.78).add(mott.mul(0.16)).add(hairGrain.mul(0.12))).mul(float(1).sub(matted.mul(0.18)));
  return mix(coat, mix(lin(0x5a4632), lin(0x3b2c1f), mudFace), mud);
}
const hideBump = (p) => mx_noise_float(vec3(p.x.mul(8), p.y.mul(120), p.z.mul(120))).mul(0.0012)
  .add(mx_fractal_noise_float(p.mul(5), 3, 2, 0.5).mul(0.006));

export function hideMaterial(hex = 0x6b4128) {
  const m = new THREE.MeshPhysicalNodeMaterial();
  const p = positionWorld;
  m.colorNode = hideColor(hex, p);
  m.roughnessNode = float(0.62).add(mx_noise_float(p.mul(4)).mul(0.1));
  m.sheen = 0.5;
  m.sheenRoughness = 0.5;
  m.sheenColor = new THREE.Color(0x8a6a50);
  m.normalNode = bumpMap(hideBump(p));
  return m;
}

/** The dark "points" of a bay: black lower legs, ears (same coat grain, much darker). */
export function pointsMaterial() {
  const m = new THREE.MeshPhysicalNodeMaterial();
  const p = positionWorld;
  const n = mx_fractal_noise_float(p.mul(4), 3, 2, 0.5).mul(0.5).add(0.5);
  m.colorNode = mix(lin(0x1f1712).mul(float(0.85).add(n.mul(0.3))), lin(0x4a3a2a), smoothstep(0.62, 0.8, n).mul(0.5));
  m.roughnessNode = float(0.6);
  m.sheen = 0.4;
  m.sheenColor = new THREE.Color(0x5a4636);
  m.normalNode = bumpMap(hideBump(p));
  return m;
}

/** Coarse mane and tail hair: near black, a little glossy, dusty at the tips. */
export function hairMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const n = mx_noise_float(positionWorld.mul(30)).mul(0.5).add(0.5);
  m.colorNode = mix(lin(0x0f0c0a), lin(0x4a3e30), n.mul(0.35));
  m.roughnessNode = float(0.45).add(n.mul(0.25));
  return m;
}

export function copyMaterial(hex = 0x6b4128) {
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide });
  const p = positionWorld;
  const strips = abs(sin(p.x.mul(18).add(p.y.mul(7)).add(mx_noise_float(p.mul(3)).mul(3))));
  const paper = lin(0x938670).mul(float(0.8).add(strips.mul(0.16)).add(mx_noise_float(p.mul(30)).mul(0.04)));
  const outside = mix(paper, hideColor(hex, p), U.paint);
  const inside = lin(0x9a8462).mul(float(0.75).add(strips.mul(0.12)));
  m.colorNode = select(frontFacing, outside, inside);
  m.roughnessNode = select(frontFacing, mix(float(0.9), float(0.72), U.paint), float(0.95));
  m.normalNode = select(frontFacing, bumpMap(strips.mul(0.004).mul(float(1).sub(U.paint.mul(0.7)))), normalize(cameraViewMatrix.mul(vec4(normalWorld.negate(), 0)).xyz));
  return m;
}

// A plain matte material for small props.
export function matte(hex, rough = 0.85, metal = 0) {
  return new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
}

// Rusty wire and iron pickets.
export function ironMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const rust = mx_fractal_noise_float(positionWorld.mul(12), 2, 2, 0.5).mul(0.5).add(0.5);
  m.colorNode = mix(lin(0x3a3330), lin(0x7a4426), rust.mul(0.7));
  m.roughnessNode = float(0.8);
  m.metalnessNode = float(0.35);
  return m;
}

// The sky: low grey overcast with a pale glow at the sun, warmer at dawn; moonlit blue-black at
// night with a few stars through the cloud gaps; far gun flashes light the horizon orange.
export function skyNode() {
  const d = positionWorldDirection;
  const h = clamp(d.y, -0.2, 1);
  const up = pow(clamp(h, 0, 1), 0.55);
  // soft cumulus: thresholded fractal noise on a flattened dome, brighter tops, greyer bellies
  const q = vec3(d.x, d.y, d.z).div(d.y.max(0.06).add(0.25));
  const n = mx_fractal_noise_float(vec3(q.x.mul(1.6), q.z.mul(1.6), 0.3), 5, 2, 0.5).mul(0.5).add(0.5);
  const cloud = smoothstep(0.52, 0.72, n).mul(smoothstep(0.02, 0.18, h));
  const shade = smoothstep(0.52, 0.9, n);
  const dayLow = mix(lin(0xa9cdee), lin(0xffb27a), U.dawn), dayHigh = mix(lin(0x2f6cc4), lin(0x5a64b0), U.dawn);
  let sky = mix(dayLow, dayHigh, up);
  const cloudCol = mix(mix(lin(0xffffff), lin(0xffd2a8), U.dawn), mix(lin(0xb8c4d4), lin(0xc08a90), U.dawn), shade.mul(0.6));
  sky = mix(sky, cloudCol, cloud.mul(0.92));
  const sunDot = clamp(dot(d, U.sunDir), 0, 1);
  sky = sky.add(mix(vec3(1, 0.95, 0.85), vec3(1, 0.6, 0.28), U.dawn).mul(pow(sunDot, 18).mul(0.5).add(pow(sunDot, 400).mul(3))).mul(float(1).sub(U.night)));
  // night: deep moonlit blue, silvery cloud edges, stars in the gaps, a big moon with a halo
  const nightSky = mix(lin(0x2a4478), lin(0x0a1636), up);
  const nightCloud = mix(lin(0x5a6e9c), lin(0x22305a), shade);
  const sc = floor(d.mul(400));
  const star = smoothstep(0.997, 1, hash(sc.x.add(sc.y.mul(131)).add(sc.z.mul(17)).add(7000))).mul(smoothstep(0.1, 0.35, h)).mul(cloud.oneMinus());
  const moon = pow(sunDot, 2500).mul(4).add(pow(sunDot, 40).mul(0.35));
  const night = mix(nightSky, nightCloud, cloud.mul(0.85)).add(vec3(star.mul(2))).add(vec3(0.75, 0.88, 1).mul(moon));
  sky = mix(sky, night, U.night);
  // gun flashes: an orange glow low on the far horizon (+x, the enemy side and beyond)
  const low = smoothstep(0.25, 0.0, h).mul(smoothstep(-0.2, 0.6, d.x));
  return sky.add(vec3(1, 0.5, 0.18).mul(low).mul(U.flash).mul(5));
}

export function fogColor() {
  return mix(mix(lin(0xc4d6e6), lin(0xf0b890), U.dawn), lin(0x22345e), U.night);
}

// For the sketch book and the rope.
export const paperMaterial = () => matte(0xece4cf, 0.9);
export const ropeMaterial = () => {
  const m = new THREE.MeshStandardNodeMaterial();
  m.colorNode = lin(0x9c8256).mul(abs(sin(positionWorld.x.add(positionWorld.z).mul(160))).mul(0.15).add(0.85));
  m.roughnessNode = float(0.95);
  return m;
};
