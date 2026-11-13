// Small procedural-geometry toolkit for the paladin. Everything returns NON-indexed geometry with
// position / normal / uv, so pieces can be mirrored, skinned and merged freely.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Texture repeats per metre for generated UVs. */
export const TEX = 2.5;

/** One cross-section of a loft: a superellipse in the XZ plane at height y. */
export interface Ring {
  y: number;
  x?: number;
  z?: number;
  /** Half width (X). */
  rx: number;
  /** Radius toward +Z (front). */
  rf: number;
  /** Radius toward -Z (back); defaults to rf. */
  rb?: number;
  /** Superellipse exponent: 2 = ellipse, higher = boxier, 1 = diamond. */
  n?: number;
}

export interface LoftOpts {
  seg?: number;
  /** Angle range in radians, measured from +Z toward +X. Omit for a closed ring. */
  arc?: [number, number];
  /** Plate thickness: adds an inner wall and rims so the piece reads as solid metal. */
  thick?: number;
  capTop?: boolean;
  capBottom?: boolean;
  /** Faceted shading (blades). */
  flat?: boolean;
}

const _v = new THREE.Vector3();

export function ringPoint(r: Ring, a: number, inset: number, out: THREE.Vector3): THREE.Vector3 {
  const s = Math.sin(a);
  const c = Math.cos(a);
  const e = 2 / (r.n ?? 2);
  const rx = Math.max(0.0005, r.rx - inset);
  const rz = Math.max(0.0005, (c >= 0 ? r.rf : r.rb ?? r.rf) - inset);
  return out.set(
    (r.x ?? 0) + Math.sign(s) * Math.pow(Math.abs(s), e) * rx,
    r.y,
    (r.z ?? 0) + Math.sign(c) * Math.pow(Math.abs(c), e) * rz
  );
}

/** Surface from a grid of points P[i][j]; `wrap` welds the normals of the first and last column. */
function gridGeo(P: THREE.Vector3[][], uv: Array<Array<[number, number]>>, wrap: boolean, flip: boolean): THREE.BufferGeometry {
  const rows = P.length;
  const cols = P[0].length;
  const pos = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j;
      pos[k * 3] = P[i][j].x;
      pos[k * 3 + 1] = P[i][j].y;
      pos[k * 3 + 2] = P[i][j].z;
      uvs[k * 2] = uv[i][j][0];
      uvs[k * 2 + 1] = uv[i][j][1];
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if (flip) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (wrap) {
    const n = g.getAttribute("normal") as THREE.BufferAttribute;
    for (let i = 0; i < rows; i++) {
      const a = i * cols;
      const b = a + cols - 1;
      _v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
      n.setXYZ(a, _v.x, _v.y, _v.z);
      n.setXYZ(b, _v.x, _v.y, _v.z);
    }
  }
  const out = g.toNonIndexed();
  g.dispose();
  return out;
}

/** Skin a stack of rings (authored bottom to top) into a tube, a shell or a thick plate. */
export function loft(rings: Ring[], opts: LoftOpts = {}): THREE.BufferGeometry {
  const seg = opts.seg ?? 20;
  const closed = !opts.arc;
  const a0 = opts.arc ? opts.arc[0] : 0;
  const a1 = opts.arc ? opts.arc[1] : Math.PI * 2;
  const down = rings[rings.length - 1].y < rings[0].y;

  const build = (inset: number): { P: THREE.Vector3[][]; uv: Array<Array<[number, number]>> } => {
    const P: THREE.Vector3[][] = [];
    const uv: Array<Array<[number, number]>> = [];
    let run = 0;
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      if (i > 0) {
        const q = rings[i - 1];
        run += Math.hypot(r.y - q.y, (r.z ?? 0) - (q.z ?? 0), (r.x ?? 0) - (q.x ?? 0), (r.rx - q.rx + r.rf - q.rf) / 2);
      }
      const around = Math.max(1, Math.round(Math.PI * (r.rx + r.rf) * TEX * ((a1 - a0) / (Math.PI * 2)) * 4) / 4);
      const row: THREE.Vector3[] = [];
      const uvRow: Array<[number, number]> = [];
      for (let j = 0; j <= seg; j++) {
        const t = j / seg;
        row.push(ringPoint(r, a0 + (a1 - a0) * t, inset, new THREE.Vector3()));
        uvRow.push([t * around, run * TEX]);
      }
      P.push(row);
      uv.push(uvRow);
    }
    return { P, uv };
  };

  const parts: THREE.BufferGeometry[] = [];
  const outer = build(0);
  parts.push(gridGeo(outer.P, outer.uv, closed, down));

  if (opts.thick) {
    const inner = build(opts.thick);
    parts.push(gridGeo(inner.P, inner.uv, closed, !down));
    const last = rings.length - 1;
    const strip = (a: THREE.Vector3[], b: THREE.Vector3[], flip: boolean) => {
      const uvA = a.map((_, j): [number, number] => [j / 4, 0]);
      const uvB = a.map((_, j): [number, number] => [j / 4, 0.05]);
      parts.push(gridGeo([a, b], [uvA, uvB], false, flip));
    };
    strip(inner.P[0], outer.P[0], down);
    strip(outer.P[last], inner.P[last], down);
    if (!closed) {
      strip(outer.P.map((row) => row[0]), inner.P.map((row) => row[0]), down);
      strip(inner.P.map((row) => row[seg]), outer.P.map((row) => row[seg]), down);
    }
  }

  const cap = (i: number, top: boolean) => {
    const r = rings[i];
    const centre = new THREE.Vector3(r.x ?? 0, r.y, r.z ?? 0);
    const rim = outer.P[i];
    const a = rim.map(() => centre);
    const uvA = rim.map((): [number, number] => [0.5, 0.5]);
    const uvB = rim.map((p): [number, number] => [0.5 + (p.x - centre.x) * TEX, 0.5 + (p.z - centre.z) * TEX]);
    parts.push(gridGeo(top ? [rim, a] : [a, rim], top ? [uvB, uvA] : [uvA, uvB], false, down));
  };
  if (opts.capBottom) cap(0, false);
  if (opts.capTop) cap(rings.length - 1, true);

  const g = parts.length === 1 ? parts[0] : merge(parts);
  if (opts.flat) g.computeVertexNormals();
  return g;
}

/** A rolled edge: a thin tube running around a ring (armour rims, gold trim). */
export function bead(r: Ring, radius: number, opts: { seg?: number; arc?: [number, number]; sides?: number } = {}): THREE.BufferGeometry {
  const seg = opts.seg ?? 20;
  const sides = opts.sides ?? 6;
  const closed = !opts.arc;
  const a0 = opts.arc ? opts.arc[0] : 0;
  const a1 = opts.arc ? opts.arc[1] : Math.PI * 2;
  const P: THREE.Vector3[][] = [];
  const uv: Array<Array<[number, number]>> = [];
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const out = new THREE.Vector3();
  for (let k = 0; k <= sides; k++) {
    const b = (k / sides) * Math.PI * 2;
    const row: THREE.Vector3[] = [];
    const uvRow: Array<[number, number]> = [];
    for (let j = 0; j <= seg; j++) {
      const a = a0 + ((a1 - a0) * j) / seg;
      ringPoint(r, a, 0, p);
      ringPoint(r, a, -0.01, q);
      out.copy(q).sub(p).normalize();
      row.push(new THREE.Vector3().copy(p).addScaledVector(out, Math.cos(b) * radius).setY(p.y + Math.sin(b) * radius));
      uvRow.push([(j / seg) * 4, k / sides / 8]);
    }
    P.push(row);
    uv.push(uvRow);
  }
  const g = gridGeo(P, uv, closed, true);
  return g;
}

/** A round tube swept along a path; `side` is any vector not parallel to the path (frame hint). */
export function tube(path: THREE.Vector3[], radius: number, side: THREE.Vector3, closed = false, sides = 6): THREE.BufferGeometry {
  const n = path.length;
  const P: THREE.Vector3[][] = [];
  const uv: Array<Array<[number, number]>> = [];
  const t = new THREE.Vector3();
  const u = new THREE.Vector3();
  const w = new THREE.Vector3();
  const count = closed ? n + 1 : n;
  for (let k = 0; k <= sides; k++) {
    const b = (k / sides) * Math.PI * 2;
    const row: THREE.Vector3[] = [];
    const uvRow: Array<[number, number]> = [];
    for (let j = 0; j < count; j++) {
      const i = j % n;
      const prev = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const next = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      t.copy(next).sub(prev).normalize();
      u.crossVectors(t, side).normalize();
      w.crossVectors(u, t).normalize();
      row.push(new THREE.Vector3().copy(path[i]).addScaledVector(u, Math.cos(b) * radius).addScaledVector(w, Math.sin(b) * radius));
      uvRow.push([j / 3, k / sides / 8]);
    }
    P.push(row);
    uv.push(uvRow);
  }
  return gridGeo(P, uv, false, false);
}

export interface Xf {
  p?: [number, number, number];
  /** Euler XYZ in radians. */
  r?: [number, number, number];
  s?: number | [number, number, number];
}

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _eul = new THREE.Euler();

/** Transform a geometry in place (scale, then rotate, then translate). */
export function tf(g: THREE.BufferGeometry, x: Xf): THREE.BufferGeometry {
  _pos.set(x.p ? x.p[0] : 0, x.p ? x.p[1] : 0, x.p ? x.p[2] : 0);
  _quat.setFromEuler(_eul.set(x.r ? x.r[0] : 0, x.r ? x.r[1] : 0, x.r ? x.r[2] : 0, "XYZ"));
  if (typeof x.s === "number") _scl.setScalar(x.s);
  else if (x.s) _scl.set(x.s[0], x.s[1], x.s[2]);
  else _scl.set(1, 1, 1);
  g.applyMatrix4(_mat.compose(_pos, _quat, _scl));
  return g;
}

function plain(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  const names = Object.keys(out.attributes);
  for (const n of names) if (n !== "position" && n !== "normal" && n !== "uv") out.deleteAttribute(n);
  out.clearGroups();
  return out;
}

export function box(w: number, h: number, d: number, r = 0.008, x?: Xf): THREE.BufferGeometry {
  const g = plain(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
  return x ? tf(g, x) : g;
}

export function sphere(r: number, x?: Xf, w = 16, h = 12, theta0 = 0, thetaLen = Math.PI): THREE.BufferGeometry {
  const g = plain(new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, theta0, thetaLen));
  return x ? tf(g, x) : g;
}

export function cyl(rTop: number, rBot: number, h: number, x?: Xf, seg = 16): THREE.BufferGeometry {
  const g = plain(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1));
  return x ? tf(g, x) : g;
}

export function capsule(r: number, len: number, x?: Xf): THREE.BufferGeometry {
  const g = plain(new THREE.CapsuleGeometry(r, len, 5, 12));
  return x ? tf(g, x) : g;
}

export function torus(r: number, tube: number, x?: Xf, arc = Math.PI * 2): THREE.BufferGeometry {
  const g = plain(new THREE.TorusGeometry(r, tube, 8, 24, arc));
  return x ? tf(g, x) : g;
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(list, false);
  if (!g) throw new Error("paladin: geometry merge failed (attribute mismatch)");
  for (const part of list) part.dispose();
  return g;
}

/** Mirror across the YZ plane (a copy), fixing the winding so lighting stays correct. */
export function mirrorX(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = src.clone();
  const names = Object.keys(g.attributes);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const nor = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, -pos.getX(i));
    nor.setX(i, -nor.getX(i));
  }
  for (const name of names) {
    const at = g.getAttribute(name) as THREE.BufferAttribute;
    const arr = at.array as unknown as number[];
    const n = at.itemSize;
    for (let t = 0; t + 2 < at.count; t += 3) {
      for (let k = 0; k < n; k++) {
        const a = (t + 1) * n + k;
        const b = (t + 2) * n + k;
        const tmp = arr[a];
        arr[a] = arr[b];
        arr[b] = tmp;
      }
    }
    at.needsUpdate = true;
  }
  return g;
}

/** Scale the UVs (texture density tweak per piece). */
export function uvScale(g: THREE.BufferGeometry, su: number, sv: number): THREE.BufferGeometry {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

/** Bind every vertex of a piece to one bone (rigid plate). */
export function rigid(g: THREE.BufferGeometry, bone: number): THREE.BufferGeometry {
  const n = (g.getAttribute("position") as THREE.BufferAttribute).count;
  const idx = new Uint16Array(n * 4);
  const w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    idx[i * 4] = bone;
    w[i * 4] = 1;
  }
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(w, 4));
  return g;
}

export type Influence = Array<[number, number]>;

/** Smooth-skin a piece: `fn` returns up to four [bone, weight] pairs for a rest-pose position. */
export function weighted(g: THREE.BufferGeometry, fn: (p: THREE.Vector3) => Influence): THREE.BufferGeometry {
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const n = pos.count;
  const idx = new Uint16Array(n * 4);
  const w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const inf = fn(_v.fromBufferAttribute(pos, i)).filter((e) => e[1] > 0.0005);
    let sum = 0;
    for (const e of inf) sum += e[1];
    for (let k = 0; k < Math.min(4, inf.length); k++) {
      idx[i * 4 + k] = inf[k][0];
      w[i * 4 + k] = inf[k][1] / (sum || 1);
    }
  }
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(w, 4));
  return g;
}

export const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
