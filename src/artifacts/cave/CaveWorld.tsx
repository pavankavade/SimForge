import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GlowSprite } from "../dungeon";
import { carve, useRockMaterials, worldUVs, type RockLook, type V2 } from "../mine/rock";

/**
 * A limestone mountain cut open like an ant farm, with a cave winding down through it: the cut
 * face at z = `face`, every passage carved `depth` deep behind it, the jungle on top and on the
 * ground outside the mouth, stalactites in the big chambers, the water standing in the cave on
 * this frame, the divers' guide line, and two map overlays for the wide shots (the trace of the
 * way in, and the rescued boys going out). All in world space.
 */

export type Passage = Array<[number, number, number]>;

export interface CaveWater {
  passage: number;
  x0: number;
  x1: number;
  level: number;
  murk: number;
}

export interface CaveWorldProps {
  face: number;
  depth: number;
  passages: Passage[];
  /** The mountain's outline above the cut, left to right (the mouth's cliff is a vertical step). */
  profile: V2[];
  bounds: { x0: number; x1: number; y0: number; y1: number };
  /** x of the mouth: level 1's first point, at the foot of the cliff. */
  mouthX: number;
  waters: CaveWater[];
  /** The divers' line along the route (floor points), drawn when given. */
  line?: V2[] | null;
  lineY?: number;
  /** The way in, drawn as torch dots up to point `trace` of `route`. */
  route: V2[];
  trace?: number;
  /** Rescued boys on their way out (route points), drawn as bundles with a diver's lamp. */
  bundles?: V2[];
  /** 1 = day, 0 = night (sky and jungle). */
  daylight: number;
  /** 0..1 overcast and rain (the sky greys). */
  storm: number;
}

/** Grey limestone, with mud on the floors. */
export const LIMESTONE: RockLook = {
  key: "cave-limestone-2",
  seed: 7,
  cracks: 0.42,
  palette: ["#f1eee7", "#e0dbd0", "#cbc5b8", "#b1aa9b"],
  face: "#ffffff",
  wall: "#e6e0d5",
  back: "#b3ab9d",
  loose: "#dcd5c8",
  floor: "#e2cba8",
};

const SKY_DAY = new THREE.Color("#a9c6dc");
const SKY_STORM = new THREE.Color("#7f8b94");
const SKY_NIGHT = new THREE.Color("#25324a");
const JUNGLE = ["#2f5a2a", "#3d6b2e", "#4a7a34", "#28502a", "#5b8a3a", "#365f2c"];

type Q = V2[];
/** The convex openings of a passage: one trapezoid per leg (vertical sides). */
export const passageQuads = (p: Passage): Q[] => {
  const out: Q[] = [];
  for (let i = 0; i + 1 < p.length; i++) {
    const [x0, y0, h0] = p[i];
    const [x1, y1, h1] = p[i + 1];
    out.push([
      [x0, y0],
      [x1, y1],
      [x1, y1 + h1],
      [x0, y0 + h0],
    ]);
  }
  return out;
};

/** Sutherland-Hodgman: keep the part of a convex polygon where `inside` holds. */
const clip = (poly: Q, inside: (p: V2) => number): Q => {
  const out: Q = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = inside(a);
    const db = inside(b);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
};

const ccw = (poly: Q): Q => {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    a += x0 * y1 - x1 * y0;
  }
  return a >= 0 ? poly : poly.slice().reverse();
};

const fan = (poly: Q, z: number, pos: number[]) => {
  for (let i = 1; i + 1 < poly.length; i++) {
    pos.push(poly[0][0], poly[0][1], z, poly[i][0], poly[i][1], z, poly[i + 1][0], poly[i + 1][1], z);
  }
};

const geoOf = (pos: number[], normal: [number, number, number]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  const nor = new Float32Array(pos.length);
  for (let i = 0; i < nor.length; i += 3) {
    nor[i] = normal[0];
    nor[i + 1] = normal[1];
    nor[i + 2] = normal[2];
  }
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return g;
};

/** The mountain's top height at x. */
const profileY = (profile: V2[], x: number): number => {
  for (let i = 0; i + 1 < profile.length; i++) {
    const [x0, y0] = profile[i];
    const [x1, y1] = profile[i + 1];
    if (x >= x0 && x <= x1 && x1 > x0) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 0;
};

/** One merged mesh of jungle: canopy blobs and trunks, coloured per vertex. */
const jungleGeo = (profile: V2[], face: number, mouthX: number, bounds: { x0: number; x1: number }) => {
  const parts: THREE.BufferGeometry[] = [];
  const blob = new THREE.IcosahedronGeometry(1, 1);
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1, 6);
  const colorize = (g: THREE.BufferGeometry, hex: string, shade = 1) => {
    const c = new THREE.Color(hex).multiplyScalar(shade);
    const n = (g.getAttribute("position") as THREE.BufferAttribute).count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // A little top-light baked in, so the canopy reads as round from a distance.
      const y = (g.getAttribute("normal") as THREE.BufferAttribute).getY(i);
      const k = 0.78 + 0.22 * y;
      arr[i * 3] = c.r * k;
      arr[i * 3 + 1] = c.g * k;
      arr[i * 3 + 2] = c.b * k;
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return g;
  };
  const add = (x: number, y: number, z: number, r: number, i: number) => {
    const g = blob.clone();
    g.scale(r * (1 + random(`jw-${i}`) * 0.4), r * (0.75 + random(`jh-${i}`) * 0.3), r);
    g.translate(x, y + r * 0.7, z);
    parts.push(colorize(g, JUNGLE[i % JUNGLE.length], 0.85 + random(`js-${i}`) * 0.3));
    if (r > 1.0) {
      const t = trunk.clone().toNonIndexed();
      t.scale(1, r * 1.2, 1);
      t.translate(x, y + r * 0.1, z);
      parts.push(colorize(t, "#5a4532"));
    }
  };
  let i = 0;
  // Over the mountain.
  for (let x = mouthX + 0.6; x < bounds.x1 - 20; x += 0.9) {
    for (let row = 0; row < 7; row++) {
      const r = 0.9 + random(`jr-${i}`) * 1.9;
      const z = face - r - 0.2 - row * 5.5 - random(`jz-${i}`) * 4;
      const y = profileY(profile, x + random(`jx-${i}`) * 0.6) - 0.3;
      if (row === 0 && random(`jskip-${i}`) < 0.25) {
        i++;
        continue;
      }
      add(x, y, z, r, i++);
    }
  }
  // The ground outside the mouth (leaving the clearing by the mouth open).
  for (let x = bounds.x0 + 6; x < mouthX - 1; x += 1.4) {
    for (let row = 0; row < 6; row++) {
      const clearing = x > mouthX - 16 && row < 2;
      if (clearing) continue;
      const r = 1.1 + random(`gr-${i}`) * 2.0;
      const z = face - r - 3.2 - row * 5 - random(`gz-${i}`) * 3;
      add(x + random(`gx-${i}`) * 0.8, -0.2, z, r, i++);
    }
  }
  blob.dispose();
  trunk.dispose();
  const g = mergeGeometries(parts, false) as THREE.BufferGeometry;
  parts.forEach((p) => p.dispose());
  return g;
};

export const CaveWorld: React.FC<CaveWorldProps> = ({ face, depth, passages, profile, bounds, mouthX, waters, line, lineY = 0.75, route, trace = 0, bundles = [], daylight, storm }) => {
  const m = useRockMaterials(LIMESTONE);
  const back = face - depth;

  // --- The cut: every passage leg is an opening, the sky above the outline is cut from the face.
  const { carving, backWall, top, cliff, ground, jungle, spikes } = useMemo(() => {
    const openings: Q[] = ([] as Q[]).concat(...passages.map(passageQuads));
    const sky: Q[] = [];
    for (let i = 0; i + 1 < profile.length; i++) {
      const [x0, y0] = profile[i];
      const [x1, y1] = profile[i + 1];
      if (x1 - x0 < 1e-4) continue;
      sky.push([
        [x0, y0],
        [x1, y1],
        [x1, bounds.y1],
        [x0, bounds.y1],
      ]);
    }
    // The mouth's outer edge stays open: the cave runs out under the cliff onto the ground.
    const atMouth = (a: V2, b: V2) => Math.abs(a[0] - mouthX) < 1e-4 && Math.abs(b[0] - mouthX) < 1e-4;
    const carving = carve(openings, sky, bounds, face, depth, 3, atMouth);

    // The back of every passage.
    const bpos: number[] = [];
    openings.forEach((q) => fan(ccw(q), back, bpos));
    const backWall = worldUVs(geoOf(bpos, [0, 0, 1]));

    // The mountain's skin on top, from the cut back to the horizon (the cliff is open over the mouth).
    const tpos: number[] = [];
    const cliffPos: number[] = [];
    const far = face - 90;
    for (let i = 1; i + 1 < profile.length; i++) {
      const [x0, y0] = profile[i];
      const [x1, y1] = profile[i + 1];
      if (x1 - x0 < 1e-4) {
        // The cliff over the mouth: from the mouth's roof up behind the cut, and all of it beyond the passage.
        const roof = passages[0][0][1] + passages[0][0][2];
        const quadZ = (ya: number, yb: number, za: number, zb: number) => tpos.push(x0, ya, za, x0, ya, zb, x0, yb, zb, x0, ya, za, x0, yb, zb, x0, yb, za);
        const before = tpos.length;
        quadZ(roof, y1, face, back);
        quadZ(y0, y1, back, far);
        cliffPos.push(...tpos.splice(before));
        continue;
      }
      tpos.push(x0, y0, face, x1, y1, face, x1, y1, far, x0, y0, face, x1, y1, far, x0, y0, far);
    }
    // (The cliff is split out below so it can wear rock, not jungle.)
    const top = geoOf(tpos, [0, 1, 0]);
    top.computeVertexNormals();
    worldUVs(top, 6);
    // The ground outside the mouth.
    const g = new THREE.PlaneGeometry(mouthX - bounds.x0, face - far);
    g.rotateX(-Math.PI / 2);
    g.translate((bounds.x0 + mouthX) / 2, 0, (face + far) / 2);
    worldUVs(g, 4);

    // Stalactites in the big chambers (and a few stalagmites), hanging from the roof line.
    const spikes: Array<{ x: number; y: number; z: number; h: number; r: number; up: boolean }> = [];
    passages.forEach((p, pi) => {
      for (let k = 0; k + 1 < p.length; k++) {
        const [x0, y0, h0] = p[k];
        const [x1, y1, h1] = p[k + 1];
        const hmin = Math.min(h0, h1);
        if (hmin < 3.5) continue;
        const n = Math.round(Math.abs(x1 - x0) * 1.6);
        for (let j = 0; j < n; j++) {
          const s = `sp-${pi}-${k}-${j}`;
          const t = random(`${s}-t`);
          const x = x0 + (x1 - x0) * t;
          const roof = y0 + (y1 - y0) * t + h0 + (h1 - h0) * t;
          const fl = y0 + (y1 - y0) * t;
          const z = back + 0.3 + random(`${s}-z`) * (depth - 0.6);
          const h = 0.25 + random(`${s}-h`) ** 2 * 1.3;
          spikes.push({ x, y: roof, z, h, r: 0.05 + h * 0.09, up: false });
          if (random(`${s}-g`) < 0.18 && z < back + 1.4) spikes.push({ x: x + 0.3, y: fl, z, h: h * 0.6, r: 0.08 + h * 0.08, up: true });
        }
      }
    });
    const cliff = worldUVs(geoOf(cliffPos, [-1, 0, 0]));
    return { carving, backWall, top, cliff, ground: g, jungle: jungleGeo(profile, face, mouthX, bounds), spikes };
    // The layout is constant for an episode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mats = useMemo(
    () => ({
      top: new THREE.MeshStandardMaterial({ color: "#3e5e2c", roughness: 1, side: THREE.DoubleSide }),
      ground: new THREE.MeshStandardMaterial({ color: "#5c5a36", roughness: 1 }),
      jungle: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
      water: new THREE.MeshStandardMaterial({ color: "#5d8a80", roughness: 0.15, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
      murky: new THREE.MeshStandardMaterial({ color: "#8a7a52", roughness: 0.15, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
      surface: new THREE.MeshStandardMaterial({ color: "#6f948a", roughness: 0.25, metalness: 0, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
      line: new THREE.MeshStandardMaterial({ color: "#f2e7c8", roughness: 0.7, emissive: "#3a3426" }),
      spike: m.loose,
      cliff: (() => {
        const c = m.face.clone();
        c.side = THREE.DoubleSide;
        c.color.set("#d8d2c4");
        c.onBeforeCompile = m.face.onBeforeCompile;
        c.customProgramCacheKey = m.face.customProgramCacheKey;
        return c;
      })(),
    }),
    [m]
  );

  // --- Water on this frame: the front where it meets the cut, and its surface.
  const water = useMemo(() => {
    const clear: number[] = [];
    const murk: number[] = [];
    const surf: number[] = [];
    for (const wtr of waters) {
      const p = passages[wtr.passage];
      for (let i = 0; i + 1 < p.length; i++) {
        const [xa, ya, ha] = p[i];
        const [xb, yb, hb] = p[i + 1];
        const lo = Math.max(Math.min(xa, xb), wtr.x0);
        const hi = Math.min(Math.max(xa, xb), wtr.x1);
        if (hi - lo < 1e-4) continue;
        let poly: Q = [
          [xa, ya],
          [xb, yb],
          [xb, yb + hb],
          [xa, ya + ha],
        ];
        poly = clip(poly, (q) => wtr.level - q[1]);
        poly = clip(poly, (q) => q[0] - lo);
        poly = clip(poly, (q) => hi - q[0]);
        if (poly.length < 3) continue;
        fan(poly, face - 0.02, wtr.murk > 0.7 ? murk : clear);
        // The surface: where the level is between this leg's floor and its roof.
        const fl = (x: number) => ya + ((yb - ya) * (x - xa)) / (xb - xa || 1);
        const rf = (x: number) => fl(x) + ha + ((hb - ha) * (x - xa)) / (xb - xa || 1);
        const n = 24;
        let s0: number | null = null;
        for (let k = 0; k <= n; k++) {
          const x = lo + ((hi - lo) * k) / n;
          const wet = fl(x) < wtr.level && rf(x) > wtr.level;
          if (wet && s0 === null) s0 = x;
          if ((!wet || k === n) && s0 !== null) {
            const s1 = wet ? x : lo + ((hi - lo) * (k - 1)) / n;
            if (s1 > s0) {
              const y = wtr.level;
              surf.push(s0, y, face - 0.02, s1, y, face - 0.02, s1, y, back, s0, y, face - 0.02, s1, y, back, s0, y, back);
            }
            s0 = null;
          }
        }
      }
    }
    return { clear: clear.length ? geoOf(clear, [0, 0, 1]) : null, murk: murk.length ? geoOf(murk, [0, 0, 1]) : null, surf: surf.length ? geoOf(surf, [0, 1, 0]) : null };
    // Rebuilt when any level moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waters.map((v) => `${v.passage}:${v.x1.toFixed(2)}:${v.level.toFixed(3)}`).join("|")]);

  const sky = SKY_NIGHT.clone().lerp(SKY_STORM.clone().lerp(SKY_DAY, 1 - storm), daylight);
  const jungleShade = 0.35 + 0.65 * daylight;
  mats.jungle.color.setScalar(jungleShade);
  mats.top.color.set("#3e5e2c").multiplyScalar(jungleShade);
  mats.ground.color.set("#5c5a36").multiplyScalar(jungleShade);

  // The way in, as torch dots.
  const dots = useMemo(() => {
    const pts: V2[] = [];
    let acc = 0;
    for (let i = 1; i < route.length; i++) {
      const [x0, y0] = route[i - 1];
      const [x1, y1] = route[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let s = acc; s < len; s += 0.7) pts.push([x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len]);
      acc = (acc - len) % 0.7;
      if (acc < 0) acc += 0.7;
    }
    return pts;
  }, [route]);

  return (
    <>
      {/* Sky. */}
      <mesh position={[0, 20, 0]}>
        <sphereGeometry args={[420, 24, 16]} />
        <meshBasicMaterial color={sky} side={THREE.BackSide} />
      </mesh>

      <mesh geometry={carving.face} material={m.face} receiveShadow />
      <mesh geometry={carving.walls} material={m.wall} receiveShadow />
      <mesh geometry={carving.floors} material={m.floor} receiveShadow />
      <mesh geometry={backWall} material={m.back} receiveShadow />
      <mesh geometry={top} material={mats.top} receiveShadow />
      <mesh geometry={cliff} material={mats.cliff} receiveShadow />
      <mesh geometry={ground} material={mats.ground} receiveShadow />
      <mesh geometry={jungle} material={mats.jungle} castShadow receiveShadow />

      {spikes.map((s, i) => (
        <mesh key={i} position={[s.x, s.up ? s.y + s.h / 2 : s.y - s.h / 2 + 0.02, s.z]} rotation={[s.up ? 0 : Math.PI, 0, 0]} material={mats.spike} castShadow>
          <coneGeometry args={[s.r, s.h, 7]} />
        </mesh>
      ))}

      {water.clear && <mesh geometry={water.clear} material={mats.water} renderOrder={2} />}
      {water.murk && <mesh geometry={water.murk} material={mats.murky} renderOrder={2} />}
      {water.surf && <mesh geometry={water.surf} material={mats.surface} renderOrder={3} />}

      {/* The divers' guide line, along the route at hand height. */}
      {line &&
        line.slice(1).map((b, i) => {
          const a = line[i];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const len = Math.hypot(dx, dy);
          return (
            <mesh key={i} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + lineY, 0.25]} rotation={[0, 0, Math.atan2(dy, dx) + Math.PI / 2]} material={mats.line}>
              <cylinderGeometry args={[0.012, 0.012, len, 5]} />
            </mesh>
          );
        })}

      {/* The way in, as a trail of torch light down the cave. */}
      {trace > 0 &&
        dots.slice(0, Math.floor(dots.length * trace)).map((p, i, all) => (
          <GlowSprite key={i} position={[p[0], p[1] + 0.6, face - 0.3]} color={i > all.length - 4 ? "#fff2c4" : "#ffc35a"} size={i > all.length - 4 ? 1.0 : 0.6} opacity={i > all.length - 4 ? 0.7 : 0.75} />
        ))}

      {/* Rescued boys on the way out: a wrapped stretcher and its diver's lamp, big enough to read wide. */}
      {bundles.map((p, i) => (
        <group key={i} position={[p[0], p[1] + 0.7, face - 0.5]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.6, 1.5, 4, 10]} />
            <meshStandardMaterial color="#f06a1c" emissive="#f06a1c" emissiveIntensity={0.5} roughness={0.5} />
          </mesh>
          <GlowSprite position={[-1.4, 0.6, 0.3]} color="#fff4d0" size={3.4} opacity={0.9} />
        </group>
      ))}
    </>
  );
};
