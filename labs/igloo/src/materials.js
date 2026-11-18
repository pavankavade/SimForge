// Procedural snow and ice (TSL), lit by a low sun and a cold sky. Everything that the cutaway can
// slice (terrain, the snow cave, igloo blocks, the platform) uses `cuttable`: drawn double-sided,
// its back faces become the flat cross-section you see through the cut (packed-snow strata), lit as
// if they faced the camera's side of the cut plane.
import * as THREE from "three/webgpu";
import {
  color, uniform, mix, float, vec3, vec4, positionWorld, normalWorld, mx_fractal_noise_float, mx_noise_float,
  bumpMap, hash, floor, smoothstep, select, frontFacing, cameraViewMatrix, normalize, clamp, pow, dot, abs,
  positionWorldDirection, sin, fract,
} from "three/tsl";

const lin = (hex) => color(new THREE.Color(hex));

// Shared animated state the film drives (anim.js propsAt -> main.js).
export const U = {
  glaze: uniform(0),       // 0..1 the lamp has melted and refrozen the igloo's inner face into ice
  glow: uniform(0),        // 0..1 lamplight shining through the dome at night
  center: uniform(new THREE.Vector3(0, 1, 0)), // the dome's centre, for "inner face" tests
  night: uniform(0),       // 0 = low golden sun, 1 = night
  whiteout: uniform(0),    // 0..1 blizzard haze over the horizon and sky
  sunDir: uniform(new THREE.Vector3(-0.55, 0.22, -0.8).normalize()),
};

// The cut face: packed snow seen in section, with faint wind-laid strata and grain.
function cutFace(dense = 0) {
  const p = positionWorld;
  const strata = sin(p.y.mul(38).add(mx_noise_float(p.mul(vec3(1.2, 0.6, 1.2))).mul(6))).mul(0.5).add(0.5);
  const grain = mx_fractal_noise_float(p.mul(24), 2, 2, 0.5).mul(0.5).add(0.5);
  const base = mix(lin(0xeef3f9), lin(0xe2eaf4), float(dense));
  const deep = smoothstep(0.2, -3.5, p.y).mul(0.1); // older, denser snow further down
  return base.mul(float(0.9).add(strata.mul(0.08)).add(grain.mul(0.04)).sub(deep));
}
const cutNormal = () => normalize(cameraViewMatrix.mul(vec4(0, 0, 1, 0)).xyz); // view-space +z of the world

export function cuttable(m, { dense = 0 } = {}) {
  m.side = THREE.DoubleSide;
  const front = m.colorNode ?? lin(0xffffff);
  m.colorNode = select(frontFacing, front, cutFace(dense));
  if (m.normalNode) m.normalNode = select(frontFacing, m.normalNode, cutNormal());
  else m.normalNode = select(frontFacing, normalize(cameraViewMatrix.mul(vec4(normalWorld, 0)).xyz), cutNormal());
  if (m.roughnessNode) m.roughnessNode = select(frontFacing, m.roughnessNode, float(0.9));
  return m;
}

// Fresh, wind-sculpted snow: near-white with cold shadows, sastrugi ripples, and sparse glints that
// catch the low sun (they bloom).
export function snowMaterial({ ripple = 1, tint = 0xf8fafd } = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = positionWorld;
  const big = mx_fractal_noise_float(p.mul(vec3(0.08, 0.08, 0.08)), 3, 2, 0.5);
  const mid = mx_fractal_noise_float(p.mul(vec3(0.6, 0.6, 0.6)), 3, 2, 0.5);
  // sastrugi: wind ripples stretched across the wind (x), small hummocks between
  const rip = mx_noise_float(vec3(p.x.mul(0.9), p.y, p.z.mul(5.5))).mul(0.6).add(mx_noise_float(p.mul(3.2)).mul(0.25));
  const shade = float(0.97).add(big.mul(0.035)).add(mid.mul(0.025));
  m.colorNode = lin(tint).mul(shade);
  m.roughnessNode = float(0.72).add(mid.mul(0.08));
  m.metalnessNode = float(0);
  m.normalNode = bumpMap(rip.mul(0.012 * ripple).add(mx_noise_float(p.mul(28)).mul(0.0015)));
  // glints: a sparse lattice of ice crystals that flash when the sun mirrors off them
  const cell = floor(p.mul(70));
  const g = hash(cell.x.add(cell.y.mul(57)).add(cell.z.mul(113)).add(5000));
  const facet = normalize(vec3(hash(cell.x.add(9000)).sub(0.5), 1.2, hash(cell.z.add(9100)).sub(0.5)));
  const mirror = pow(clamp(dot(facet, normalize(U.sunDir.add(positionWorldDirection.negate()))), 0, 1), 60);
  const sparkle = smoothstep(0.985, 1, g).mul(mirror).mul(float(1).sub(U.night.mul(0.85)));
  m.emissiveNode = vec3(1, 0.97, 0.9).mul(sparkle).mul(6);
  return m;
}

// Igloo blocks: wind-packed snow, a touch denser and bluer, with knife-cut faces. The inner face
// (pointing at the dome's centre) turns to glossy ice as `glaze` rises, and at night the whole shell
// glows warm with the lamplight inside (thin snow is translucent).
export function blockMaterial() {
  const m = new THREE.MeshPhysicalNodeMaterial();
  const p = positionWorld;
  const mid = mx_fractal_noise_float(p.mul(2.2), 3, 2, 0.5);
  const cuts = abs(sin(p.y.mul(90).add(mx_noise_float(p.mul(4)).mul(3)))).mul(0.5); // knife strokes
  const inward = clamp(dot(normalWorld, normalize(U.center.sub(p))), 0, 1);
  const glazed = smoothstep(0.2, 0.6, inward).mul(U.glaze);
  const snow = lin(0xeef2f8).mul(float(0.93).add(mid.mul(0.05)).sub(cuts.mul(0.025)));
  // the inside of the shell: daylight through the snow gives it a cool, dim, translucent blue
  const innerTint = mix(snow, lin(0xbcd2ea), smoothstep(0.2, 0.7, inward).mul(0.55));
  m.colorNode = mix(innerTint, lin(0xcfe4f4), glazed.mul(0.6));
  m.roughnessNode = mix(float(0.78).add(mid.mul(0.06)), float(0.06), glazed);
  m.clearcoatNode = glazed;
  m.clearcoatRoughnessNode = float(0.04);
  m.metalnessNode = float(0);
  m.normalNode = bumpMap(mid.mul(0.006).add(cuts.mul(0.002)).mul(float(1).sub(glazed.mul(0.85))));
  // lamplight through the shell at night: brightest at the joints and the thin top
  const outward = clamp(dot(normalWorld, normalize(p.sub(U.center))), 0, 1);
  // a soft, even warmth through the snow, strongest where the shell is thinnest (the top)
  const thin = float(0.25).add(smoothstep(0.4, 2.4, p.y).mul(0.55));
  m.emissiveNode = vec3(1.0, 0.62, 0.3).mul(U.glow).mul(outward).mul(thin).mul(float(0.85).add(mid.mul(0.3))).mul(0.18);
  return m;
}

// A plain matte material for small props (fur, wood, soapstone).
export function matte(hex, rough = 0.85, metal = 0) {
  return new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
}

// The sky dome: golden hour fading to night, the sun's disc and halo, a whiteout haze for the
// blizzard, and an aurora with stars once it's dark.
export function skyNode() {
  const d = positionWorldDirection;
  const h = clamp(d.y, -0.2, 1);
  const up = pow(clamp(h, 0, 1), 0.55);
  const dayHorizon = lin(0xf4e2d4), dayMid = lin(0xa9bfdc), dayZenith = lin(0x4a6ea8);
  const day = mix(mix(dayHorizon, dayMid, smoothstep(0, 0.18, h)), dayZenith, up);
  const nightSky = mix(lin(0x1c2a4a), lin(0x050a1a), up);
  let sky = mix(day, nightSky, U.night);
  // sun: a soft disc and a broad warm halo (day only)
  const sunDot = clamp(dot(d, U.sunDir), 0, 1);
  const sun = pow(sunDot, 900).mul(30).add(pow(sunDot, 12).mul(0.6));
  sky = sky.add(vec3(1, 0.8, 0.55).mul(sun).mul(U.night.oneMinus()));
  // stars and aurora (night)
  const sc = floor(d.mul(420));
  const star = smoothstep(0.9975, 1, hash(sc.x.add(sc.y.mul(131)).add(sc.z.mul(17)).add(7000))).mul(smoothstep(0.05, 0.3, h));
  const curtain = mx_noise_float(vec3(d.x.mul(3), d.z.mul(3), 0.5)).mul(0.5).add(0.5);
  const aurora = smoothstep(0.12, 0.3, h).mul(smoothstep(0.75, 0.35, h)).mul(pow(curtain, 3)).mul(
    smoothstep(0.2, 0.9, fract(d.x.mul(1.7).add(d.z.mul(0.9)).add(curtain.mul(0.6)))).mul(1.2));
  sky = sky.add(vec3(star).mul(2).add(vec3(0.15, 1.0, 0.55).mul(aurora).mul(1.4)).mul(U.night));
  // blizzard whiteout: the sky closes in to a flat bright grey
  const white = mix(lin(0xc9d3de), lin(0x3a4458), U.night);
  return mix(sky, white, U.whiteout.mul(float(0.55).add(float(0.45).mul(float(1).sub(up)))));
}

// Fog colour for the same whiteout (matches the low sky)
export function fogColor() {
  return mix(mix(lin(0xeceef2), lin(0xd6dee8), U.whiteout), lin(0x1c2640), U.night);
}

