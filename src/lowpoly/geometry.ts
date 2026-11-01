import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";

/**
 * Clean low-poly geometry: convex hulls with one chamfer facet on every edge,
 * so each edge catches its own highlight under flat shading. Hulls are always
 * wound outward and cached by size.
 */

const cache = new Map<string, THREE.BufferGeometry>();
const k = (...parts: number[]) => parts.map((p) => p.toFixed(4)).join(",");

const memo = (key: string, make: () => THREE.BufferGeometry) => {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
};

/** Box `w × h × d` centred on the origin, every edge chamfered by `bevel`. */
export const chamferBox = (w: number, h: number, d: number, bevel = Math.min(Math.min(w, h, d) * 0.22, 0.12)) =>
  memo(`box:${k(w, h, d, bevel)}`, () => {
    const b = Math.min(bevel, Math.min(w, h, d) / 2 - 0.0005);
    const [x, y, z] = [w / 2, h / 2, d / 2];
    const pts: THREE.Vector3[] = [];
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          pts.push(new THREE.Vector3(sx * x, sy * (y - b), sz * (z - b)));
          pts.push(new THREE.Vector3(sx * (x - b), sy * y, sz * (z - b)));
          pts.push(new THREE.Vector3(sx * (x - b), sy * (y - b), sz * z));
        }
    return new ConvexGeometry(pts);
  });

/**
 * Upright prism with `sides` faces (octagon tiles, pillars, posts), radius `r`
 * to the corners, height `h`, top and bottom rims chamfered by `bevel`.
 * `turn` rotates it about Y (an octagon with flats on the axes is turn = π/8).
 */
export const chamferPrism = (r: number, h: number, sides: number, bevel = Math.min(r, h) * 0.15, turn = 0) =>
  memo(`prism:${k(r, h, sides, bevel, turn)}`, () => {
    const b = Math.min(bevel, h / 2 - 0.0005, r * 0.5);
    const pts: THREE.Vector3[] = [];
    const ring = (radius: number, y: number) => {
      for (let i = 0; i < sides; i++) {
        const a = turn + (i / sides) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
      }
    };
    ring(r - b, h / 2);
    ring(r, h / 2 - b);
    ring(r, -h / 2 + b);
    ring(r - b, -h / 2);
    return new ConvexGeometry(pts);
  });

/**
 * Wedge (a ramp or a gable roof half): `w` wide along X, `h` tall at x = -w/2
 * falling to zero at +w/2, `d` deep, slightly chamfered.
 */
export const chamferWedge = (w: number, h: number, d: number, bevel = Math.min(w, h, d) * 0.08) =>
  memo(`wedge:${k(w, h, d, bevel)}`, () => {
    const tri = [new THREE.Vector2(-w / 2, -h / 2), new THREE.Vector2(w / 2, -h / 2), new THREE.Vector2(-w / 2, h / 2)];
    const centre = tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3);
    // The end faces are the triangle shrunk toward its centre; the full one sits `bevel` inside.
    const shrink = (p: THREE.Vector2) => p.clone().sub(centre).multiplyScalar(1 - (bevel * 3) / Math.min(w, h)).add(centre);
    const pts: THREE.Vector3[] = [];
    for (const sz of [-1, 1]) {
      for (const p of tri) {
        pts.push(new THREE.Vector3(p.x, p.y, sz * (d / 2 - bevel)));
        const s = shrink(p);
        pts.push(new THREE.Vector3(s.x, s.y, (sz * d) / 2));
      }
    }
    return new ConvexGeometry(pts);
  });

/** Faceted blob (foliage, rocks, storm clouds): an icosahedron with seeded vertex jitter. */
export const facetBlob = (r: number, detail = 1, jitter = 0.18, seed = 1) =>
  memo(`blob:${k(r, detail, jitter, seed)}`, () => {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    // Jitter per unique position so shared corners stay welded.
    const offsets = new Map<string, number>();
    let s = seed * 9301 + 49297;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
      let o = offsets.get(key);
      if (o === undefined) {
        o = 1 + (rnd() - 0.5) * 2 * jitter;
        offsets.set(key, o);
      }
      v.multiplyScalar(o);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });

/**
 * Faceted terrain: a `w × d` grid of `seg` cells per side with seeded height
 * jitter `amp`, flat-shaded into big soft triangles. The edges stay at y = 0
 * within `flat` of the centre (so a house slab sits flush).
 */
export const facetGround = (w: number, d: number, seg = 24, amp = 0.35, seed = 1, flat = 0) =>
  memo(`ground:${k(w, d, seg, amp, seed, flat)}`, () => {
    const g = new THREE.PlaneGeometry(w, d, seg, seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    let s = seed * 7919 + 104729;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x / (w / 2), z / (d / 2));
      // Calm near the middle, rolling further out.
      const reach = Math.min(1, Math.max(0, (Math.hypot(x, z) - flat) / (flat + 6)));
      p.setY(i, (rnd() - 0.35) * amp * reach * (1 + r));
    }
    return g.toNonIndexed();
  });
