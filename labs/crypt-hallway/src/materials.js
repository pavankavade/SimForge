// Procedural PBR materials (TSL). Every stone surface carries UVs in metres (see hall.js), so
// block sizes are real-world and continuous across meshes.
import * as THREE from "three/webgpu";
import {
  uv, vec2, vec3, float, floor, fract, min, max, smoothstep, mix, hash, abs, pow, clamp, select, exp, dot,
  mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, mx_worley_noise_vec2, positionWorld, bumpMap,
  color, time, sin, uniform, attribute,
} from "three/tsl";

const lin = (hex) => color(new THREE.Color(hex));
const h01 = (n) => hash(n); // hash() wants a positive seed; callers add a large offset

// Ashlar / flagstone pattern with irregular head joints. p = vec2 in metres.
// Returns masks plus block-local coordinates for per-block shaping.
function blocks(p, { w, h, mortar = 0.012, bevel = 0.03, seed = 0, jitterRows = true, irregular = 0.35 }) {
  const row = floor(p.y.div(h));
  const rs = row.mul(131.7).add(9000 + seed);
  const u = p.x.add(jitterRows ? h01(row.add(5000 + seed)).mul(w) : row.mul(w * 0.5));
  // each head joint k sits at k*w + jitter(k); find the cell whose span contains u
  const jit = (k) => h01(k.mul(7.31).add(rs)).sub(0.5).mul(w * irregular);
  const c = floor(u.div(w));
  const cell = select(u.lessThan(c.mul(w).add(jit(c))), c.sub(1),
    select(u.greaterThanEqual(c.add(1).mul(w).add(jit(c.add(1)))), c.add(1), c));
  const left = cell.mul(w).add(jit(cell));
  const right = cell.add(1).mul(w).add(jit(cell.add(1)));
  const ly = fract(p.y.div(h));
  const dx = min(u.sub(left), right.sub(u));
  const dy = min(ly, ly.oneMinus()).mul(h);
  const ids = cell.mul(17.0).add(row.mul(57.0)).add(40000 + seed);
  const id = h01(ids), id2 = h01(ids.add(1.7)), id3 = h01(ids.add(3.1));

  // eroded arrises: small crumbly chips everywhere, bigger bites taken out of some corners
  const wp = positionWorld;
  const crumble = mx_fractal_noise_float(wp.mul(22.0), 2, 2.0, 0.5).mul(0.006);
  const bite = smoothstep(0.35, 0.75, mx_noise_float(wp.mul(5.0).add(id.mul(30)))).mul(0.028);
  const d = min(dx, dy).add(crumble).sub(bite);

  const face = smoothstep(mortar * 0.5, mortar * 0.5 + bevel, d);          // 0 in joint, 1 on face
  const joint = float(1).sub(smoothstep(mortar * 0.3, mortar * 0.8, d));
  const arris = face.mul(float(1).sub(smoothstep(bevel, bevel * 3.0, d))); // worn edge band
  // block-local coordinates (metres from the block centre), for tilt and pillowing
  const local = vec2(u.sub(left.add(right).mul(0.5)), ly.sub(0.5).mul(h));
  const halfMin = min(right.sub(left), float(h)).mul(0.5);
  const pillow = pow(clamp(min(dx, dy).div(halfMin), 0, 1), 0.6);
  return { face, joint, arris, id, id2, id3, local, pillow };
}

function stoneFromAttr(seed) {
  const id = attribute("blockId", "float");
  const ids = id.mul(9973).add(70000 + seed);
  return {
    face: float(1), joint: float(0), arris: float(0), id, id2: h01(ids), id3: h01(ids.add(3.1)),
    local: vec2(0), pillow: float(0.5),
  };
}

// Smoke stains rising above each torch flame (world positions).
function sootMask(flames) {
  if (!flames?.length) return float(0);
  const wp = positionWorld;
  let s = float(0);
  for (const [x, y, z] of flames) {
    const dy = wp.y.sub(y);
    const r = wp.xz.sub(vec2(x, z)).length();
    const width = max(dy, 0).mul(0.16).add(0.14);
    const streak = mx_noise_float(vec3(wp.x.mul(9), wp.y.mul(1.5), wp.z.mul(9))).mul(0.25).add(0.85);
    s = s.add(smoothstep(-0.15, 0.25, dy).mul(exp(dy.mul(-0.38))).mul(exp(r.mul(r).div(width.mul(width)).negate())).mul(streak));
  }
  return clamp(s, 0, 1);
}

// Shared stone look. opts: base/alt colours, block size, grime, soot sources.
export function stoneMaterial({
  w = 0.6, h = 0.3, base = 0xb8a68a, alt = 0x8d7d68, mortarColor = 0x9a9080,
  rough = 0.82, seed = 0, bump = 0.04, grime = 1, uvSwap = false, jitterRows = true, mortar = 0.014,
  irregular = 0.35, tilt = 0.12, soot = null, perStone = false,
} = {}) {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = uvSwap ? uv().yx : uv();
  // perStone: real block geometry (masonry.js) supplies the joints; tint comes from its blockId
  const b = perStone ? stoneFromAttr(seed) : blocks(p, { w, h, seed, jitterRows, mortar, irregular });

  const wp = positionWorld;
  const big = mx_fractal_noise_float(wp.mul(0.35), 3, 2.0, 0.5).mul(0.5).add(0.5);
  const rock = mx_fractal_noise_float(wp.mul(3.2), 4, 2.0, 0.55);                    // hewn face
  const fine = mx_fractal_noise_float(wp.mul(14.0), 3, 2.1, 0.5);                    // grain
  const pits = smoothstep(0.8, 0.95, mx_worley_noise_float(wp.mul(30.0)).oneMinus()).mul(big);
  const streaks = smoothstep(0.1, 0.6, mx_fractal_noise_float(vec3(wp.x.mul(5), wp.y.mul(0.45), wp.z.mul(5)), 3, 2.0, 0.5));

  // per-block tone: three families of stone, each block slightly different
  let c = mix(lin(base), lin(alt), b.id.mul(0.8).add(big.mul(0.35)).clamp());
  c = mix(c, lin(0xa39479), b.id3.mul(0.45));
  c = c.mul(b.id2.mul(0.22).add(0.86)).mul(rock.mul(0.16).add(1.0)).mul(fine.mul(0.06).add(1.0));
  c = mix(c, c.mul(1.12), b.arris.mul(0.6));                       // worn edges catch dust
  c = c.mul(float(1).sub(pits.mul(0.2)));
  c = mix(c, c.mul(0.72), streaks.mul(0.35).mul(grime));            // water run-off
  // damp rising from the floor, with green growth in the lowest courses
  const damp = smoothstep(1.5, 0.0, wp.y).mul(big.mul(0.6).add(0.4)).mul(grime);
  c = mix(c, c.mul(0.62), damp.mul(0.7));
  const moss = smoothstep(0.55, 0.8, mx_fractal_noise_float(wp.mul(1.6), 3, 2.0, 0.5).mul(0.5).add(0.5)).mul(smoothstep(0.7, 0.0, wp.y)).mul(grime);
  c = mix(c, lin(0x39431f), moss.mul(0.55));
  // salt efflorescence in a tide band above the damp
  const salt = smoothstep(0.62, 0.8, mx_fractal_noise_float(wp.mul(2.4).add(7.0), 3, 2.0, 0.5).mul(0.5).add(0.5))
    .mul(smoothstep(0.3, 0.7, wp.y)).mul(smoothstep(1.6, 0.9, wp.y)).mul(grime);
  c = mix(c, lin(0xcfcabd), salt.mul(0.3));
  const sootM = sootMask(soot);
  c = c.mul(float(1).sub(sootM.mul(0.82)));
  c = c.mul(float(1).sub(smoothstep(5.0, 9.0, wp.y).mul(0.4).mul(grime)));
  // recessed, sandy mortar
  const mortarC = lin(mortarColor).mul(fine.mul(0.15).add(big.mul(0.3)).add(0.62)).mul(float(1).sub(damp.mul(0.4)));
  c = mix(mortarC.mul(float(1).sub(sootM.mul(0.7))), c, b.face);

  m.colorNode = c;
  m.roughnessNode = clamp(float(rough).add(fine.mul(0.06)).sub(damp.mul(0.18)).add(b.joint.mul(0.1)).add(salt.mul(0.1)).sub(b.arris.mul(0.1)), 0.3, 1);
  m.metalnessNode = float(0);
  // relief: pillowed, slightly tilted hewn faces; mortar sits back and is gritty
  const tiltH = dot(b.local, vec2(b.id2.sub(0.5), b.id3.sub(0.5))).mul(tilt);
  const chisel = mx_fractal_noise_float(wp.mul(7.0), 3, 2.0, 0.5);                  // tool-mark scale
  const faceH = b.pillow.mul(0.3).add(rock.mul(0.45)).add(chisel.mul(0.2)).add(fine.mul(0.06)).add(tiltH).sub(pits.mul(0.12));
  const height = mix(fine.mul(0.04), faceH.add(0.22), b.face);
  m.normalNode = bumpMap(height, float(bump));
  return m;
}

// Irregular, worn flagstones: cracked slabs, dirt in the joints and along the walls, standing water.
export function floorMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const p = vec2(uv().x, uv().y);
  const b = blocks(p, { w: 0.85, h: 0.72, mortar: 0.016, bevel: 0.06, seed: 7, irregular: 0.55 });
  const wp = positionWorld;
  const big = mx_fractal_noise_float(wp.xz.mul(0.25), 3, 2.0, 0.5).mul(0.5).add(0.5);
  const rock = mx_fractal_noise_float(wp.mul(2.6), 4, 2.0, 0.55);
  const fine = mx_fractal_noise_float(wp.mul(12.0), 3, 2.0, 0.55);
  const wear = mx_fractal_noise_float(wp.xz.mul(1.3), 2, 2.0, 0.5).mul(0.5).add(0.5);

  // cracks: Voronoi borders, only on some slabs
  const warp = vec2(mx_noise_float(wp.mul(3.0)), mx_noise_float(wp.mul(3.0).add(11.0))).mul(0.35);
  const vor = mx_worley_noise_vec2(wp.xz.mul(1.6).add(warp).add(b.id.mul(17)));
  const run = smoothstep(0.15, 0.45, mx_noise_float(wp.mul(1.7).add(5.0)));         // cracks die out
  const crackLine = smoothstep(0.022, 0.0, vor.y.sub(vor.x)).mul(run).mul(step01(b.id2, 0.55)).mul(b.face);

  // puddles: low-frequency mask, more likely along the worn centre line and in the joints
  const puddleN = mx_fractal_noise_float(wp.xz.mul(vec2(0.45, 0.22)).add(3.1), 3, 2.0, 0.5).mul(0.5).add(0.5);
  const centre = smoothstep(2.2, 0.4, abs(wp.x)).mul(0.12);
  const wetN = puddleN.add(centre).add(b.joint.mul(0.08)).add(crackLine.mul(0.05));
  const damp = smoothstep(0.56, 0.7, wetN);
  const puddle = smoothstep(0.68, 0.71, wetN);
  // dust and grime gathered against walls and pier bases, away from the walking line
  const edgeDust = smoothstep(1.2, 2.2, abs(wp.x)).mul(big.mul(0.6).add(0.4));

  let c = mix(lin(0x857a6a), lin(0x5b5349), b.id.mul(0.8).add(big.mul(0.35)).clamp());
  c = mix(c, lin(0x6d6a64), b.id3.mul(0.5));
  c = c.mul(b.id2.mul(0.2).add(0.86)).mul(rock.mul(0.15).add(1.0)).mul(fine.mul(0.08).add(1.0));
  c = mix(c, c.mul(1.15), b.arris.mul(0.5));
  c = mix(c, lin(0x2c2620), crackLine.mul(0.9));
  c = mix(lin(0x3a332b).mul(big.mul(0.4).add(0.7)), c, b.face);  // packed dirt in the joints
  c = mix(c, c.mul(lin(0xb3a68f)).mul(1.25), edgeDust.mul(0.35).mul(float(1).sub(damp)));
  c = mix(c, c.mul(0.62), damp);
  c = mix(c, c.mul(0.7), puddle);
  c = mix(c, c.mul(1.12), smoothstep(0.6, 0.9, wear).mul(b.face).mul(float(1).sub(edgeDust))); // polished track

  m.colorNode = c;
  const dry = float(0.8).add(fine.mul(0.08)).sub(wear.mul(0.15)).add(edgeDust.mul(0.1));
  m.roughnessNode = mix(mix(dry, float(0.38), damp), float(0.03), puddle);
  m.metalnessNode = float(0);
  const tiltH = dot(b.local, vec2(b.id2.sub(0.5), b.id3.sub(0.5))).mul(0.08);
  const faceH = b.pillow.mul(0.25).add(rock.mul(0.3)).add(fine.mul(0.08)).add(tiltH).sub(crackLine.mul(0.3));
  const height = mix(fine.mul(0.04), faceH.add(0.25), b.face).mul(float(1).sub(puddle));
  m.normalNode = bumpMap(height, float(0.035));
  return m;
}
function step01(x, edge) { return smoothstep(edge, edge + 0.01, x); }

// Weathered monolithic drums for turned columns (horizontal joints only).
export function columnMaterial(soot) {
  return stoneMaterial({
    w: 50, h: 0.72, base: 0xb5a78d, alt: 0x8a7d68, rough: 0.75, seed: 3, bump: 0.03,
    jitterRows: false, irregular: 0, tilt: 0, soot,
  });
}

// Heavy cloth banner with an embroidered gold border, sheen for the velvet look.
export function clothMaterial(hex) {
  const m = new THREE.MeshPhysicalNodeMaterial({ side: THREE.DoubleSide });
  const u = uv();
  const edge = min(min(u.x, u.x.oneMinus()).mul(2.4), u.y.oneMinus().mul(1.5)); // metres-ish from side/bottom edge
  const trim = smoothstep(0.07, 0.075, edge).sub(smoothstep(0.115, 0.12, edge));
  const inner = smoothstep(0.15, 0.155, edge).sub(smoothstep(0.165, 0.17, edge));
  const weave = sin(u.x.mul(900)).mul(sin(u.y.mul(700))).mul(0.04);
  const n = mx_fractal_noise_float(positionWorld.mul(4.0), 3, 2.0, 0.5);
  const dirt = smoothstep(0.35, 0.0, u.y.oneMinus()).mul(0.35); // lower hem darker
  let c = lin(hex).mul(n.mul(0.12).add(1.0)).mul(float(1).add(weave)).mul(float(1).sub(dirt));
  c = mix(c, lin(0xb08a3a), max(trim, inner).clamp());
  m.colorNode = c;
  m.roughnessNode = mix(float(0.88), float(0.45), max(trim, inner));
  m.metalnessNode = mix(float(0), float(0.6), max(trim, inner));
  m.sheen = 1;
  m.sheenRoughness = 0.45;
  m.sheenColor = new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.35);
  return m;
}

export function ironMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const n = mx_fractal_noise_float(positionWorld.mul(12.0), 3, 2.0, 0.5).mul(0.5).add(0.5);
  const rust = smoothstep(0.45, 0.75, n);
  m.colorNode = mix(lin(0x2a2826), lin(0x5a3220), rust);
  m.roughnessNode = mix(float(0.45), float(0.9), rust);
  m.metalnessNode = mix(float(0.85), float(0.2), rust);
  return m;
}

// Spike bed: rusty dark roots, worn bright steel towards the points so the bed glints in the pit.
// `bedY` is the pit floor; tips sit 0.6-1.0 above it.
export function spikeMaterial(bedY) {
  const m = new THREE.MeshStandardNodeMaterial();
  const n = mx_fractal_noise_float(positionWorld.mul(14.0), 3, 2.0, 0.5).mul(0.5).add(0.5);
  const up = smoothstep(bedY + 0.15, bedY + 0.75, positionWorld.y);
  const rust = smoothstep(0.4, 0.7, n).mul(up.oneMinus().mul(0.8).add(0.2));
  m.colorNode = mix(mix(lin(0x3a3634), lin(0xb4b0a8), up), lin(0x6a3820), rust);
  m.roughnessNode = mix(mix(float(0.6), float(0.22), up), float(0.85), rust);
  m.metalnessNode = mix(float(0.9), float(0.25), rust);
  return m;
}

export function woodMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const g = sin(positionWorld.y.mul(80).add(mx_noise_float(positionWorld.mul(20)).mul(4))).mul(0.5).add(0.5);
  m.colorNode = mix(lin(0x2b1a10), lin(0x4a2e1a), g);
  m.roughnessNode = float(0.8);
  return m;
}

// Loose rubble: plain weathered stone, no joints, dusty.
export function rubbleMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const wp = positionWorld;
  const rock = mx_fractal_noise_float(wp.mul(6.0), 4, 2.0, 0.55);
  const fine = mx_fractal_noise_float(wp.mul(20.0), 3, 2.0, 0.5);
  m.colorNode = mix(lin(0x8a7f6e), lin(0x5f574b), rock.mul(0.5).add(0.5)).mul(fine.mul(0.1).add(1.0));
  m.roughnessNode = float(0.9);
  m.normalNode = bumpMap(rock.mul(0.6).add(fine.mul(0.15)), float(0.01));
  return m;
}

// Billboard flame. Additive, HDR (feeds bloom). One material per torch so each flickers on its own.
export function flameMaterial(seed) {
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const s = uniform(seed);
  const p = uv();
  const t = time.mul(1.0).add(s);
  const warp = mx_fractal_noise_float(vec3(p.x.mul(3), p.y.mul(2).sub(t.mul(2.6)), t.mul(0.7)), 3, 2.0, 0.5);
  const x = p.x.sub(0.5).add(warp.mul(0.18).mul(p.y));
  const y = p.y.add(warp.mul(0.06));
  const width = pow(clamp(y.mul(1.2), 0, 1), 0.5).mul(pow(clamp(float(1).sub(y), 0, 1), 1.4)).mul(0.62);
  const body = smoothstep(width, width.mul(0.15), abs(x));
  const core = smoothstep(width.mul(0.55), 0.0, abs(x)).mul(smoothstep(0.75, 0.15, y));
  const fade = smoothstep(0.0, 0.08, p.y);
  const col = mix(mix(lin(0x8a1c02), lin(0xff6a10), body), lin(0xfff0b0), core);
  m.colorNode = col.mul(body.mul(fade)).mul(14.0);
  m.opacityNode = body.mul(fade);
  return m;
}
