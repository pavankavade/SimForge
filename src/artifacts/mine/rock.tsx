import { useMemo } from "react";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { useDesert, useGravel } from "./common";
import { ROCK_TILE, makeMacro, makeRock } from "./textures";

/**
 * The rock of the mine world: its materials (one crisp tile laid in world space, with a slow tone
 * drift over the whole mountain) and the carving that turns a list of convex openings into the cut
 * face around them and the walls and floors inside them.
 */

export type V2 = [number, number];

/** World size the macro tone map covers before it mirrors. */
const MACRO: V2 = [64, 86];
let macro: THREE.CanvasTexture | null = null;

/** Multiplies the macro tone map over a material's colour, by world position. */
const withMacro = (mat: THREE.MeshStandardMaterial) => {
  mat.onBeforeCompile = (shader) => {
    if (!macro) macro = makeMacro();
    shader.uniforms.mineMacro = { value: macro };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMinePos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMinePos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D mineMacro;\nvarying vec3 vMinePos;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>\ndiffuseColor.rgb *= texture2D(mineMacro, vec2(vMinePos.x + vMinePos.z * 0.35, vMinePos.y) / vec2(${MACRO[0].toFixed(1)}, ${MACRO[1].toFixed(1)})).rgb * 2.0;`
      );
  };
  mat.customProgramCacheKey = () => "mine-macro";
  return mat;
};

export interface RockMaterials {
  /** The cut face of the mountain. */
  face: THREE.MeshStandardMaterial;
  /** Walls and roofs inside the openings (vertex colours darken them toward the back). */
  wall: THREE.MeshStandardMaterial;
  /** The far wall of every opening. */
  back: THREE.MeshStandardMaterial;
  /** Gravel floors and the ramp road (vertex colours as for the walls). */
  floor: THREE.MeshStandardMaterial;
  /** Loose rock: rubble, boulders. */
  loose: THREE.MeshStandardMaterial;
  /** The desert on top. */
  desert: THREE.MeshStandardMaterial;
}

export const useRockMaterials = (): RockMaterials => {
  const rock = useSurface("mine-rock-5", () => makeRock({ seed: 3 }), [1, 1]);
  const gravel = useGravel([1, 1], 12);
  const desert = useDesert([1, 1]);
  return useMemo(() => {
    const base = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      withMacro(
        new THREE.MeshStandardMaterial({
          map: rock.map ?? undefined,
          normalMap: rock.normalMap ?? undefined,
          normalScale: new THREE.Vector2(1.5, 1.5),
          roughness: 0.94,
          color,
          ...extra,
        })
      );
    return {
      face: base("#ffffff"),
      wall: base("#e8dccf", { vertexColors: true }),
      back: base("#a89888"),
      loose: base("#d9cdc0"),
      floor: new THREE.MeshStandardMaterial({
        map: gravel.map ?? undefined,
        normalMap: gravel.normalMap ?? undefined,
        roughness: 0.96,
        color: "#f1e9df",
        vertexColors: true,
      }),
      desert: new THREE.MeshStandardMaterial({ map: desert.map ?? undefined, normalMap: desert.normalMap ?? undefined, roughness: 0.97, color: "#f4e6d2" }),
    };
  }, [rock, gravel, desert]);
};

/** Lays a geometry's UVs out in world space (it must not be moved afterwards): one tile per `tile` m. */
export const worldUVs = <G extends THREE.BufferGeometry>(geo: G, tile = ROCK_TILE): G => {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const [u, v] = az >= ax && az >= ay ? [x, y] : ay >= ax ? [x, z] : [z, y];
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
};

/** A rock box from its corners, in world space with world UVs. */
export const rockBox = (min: [number, number, number], max: [number, number, number], tile = ROCK_TILE): THREE.BufferGeometry => {
  const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return worldUVs(g, tile);
};

// ---------------------------------------------------------------------------
// Carving
// ---------------------------------------------------------------------------
const ccw = (pts: V2[]): V2[] => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a >= 0 ? pts : pts.slice().reverse();
};

type Edge = [V2, V2];
const xAt = ([p, q]: Edge, y: number) => p[0] + ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]);

export interface Carving {
  /** The cut face around the openings (at z = face). */
  face: THREE.BufferGeometry;
  /** Walls and roofs of the openings, from the face back by `depth`. */
  walls: THREE.BufferGeometry;
  /** Their floors (everything that faces up). */
  floors: THREE.BufferGeometry;
}

interface Soup {
  pos: number[];
  nor: number[];
  uv: number[];
  col: number[];
}

/**
 * Cuts convex openings (in x, y) out of the rectangle `bounds` at z = `face`, `depth` deep.
 * Openings may overlap (their union is the cavity) but should cross each other properly: an edge
 * that lies exactly along another opening's edge is dropped. `slots` are cut out of the face
 * only (shafts that get their own lining).
 */
export const carve = (
  openings: V2[][],
  slots: V2[][],
  bounds: { x0: number; x1: number; y0: number; y1: number },
  face: number,
  depth: number,
  floorTile = 3
): Carving => {
  const polys = openings.map(ccw);
  const edges: Edge[][] = polys.map((p) => p.map((a, i) => [a, p[(i + 1) % p.length]] as Edge));

  // --- The face: between two neighbouring critical heights no edges cross, so the rock is a row
  // of trapezoids between the openings.
  const ys: number[] = [bounds.y0, bounds.y1];
  const cuts: Edge[][] = edges.concat(slots.map(ccw).map((p) => p.map((a, i) => [a, p[(i + 1) % p.length]] as Edge)));
  const flat = ([] as Edge[]).concat(...cuts);
  for (const [p] of flat) ys.push(p[1]);
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      const [a, b] = flat[i];
      const [c, d] = flat[j];
      const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
      if (Math.abs(den) < 1e-9) continue;
      const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
      const s = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
      if (t > 0 && t < 1 && s > 0 && s < 1) ys.push(a[1] + (b[1] - a[1]) * t);
    }
  }
  const levels = ys.filter((y) => y >= bounds.y0 && y <= bounds.y1).sort((a, b) => a - b);
  const facePos: number[] = [];
  const quad = (xl0: number, xr0: number, y0: number, xl1: number, xr1: number, y1: number) => {
    if (xr0 - xl0 < 1e-5 && xr1 - xl1 < 1e-5) return;
    facePos.push(xl0, y0, face, xr0, y0, face, xr1, y1, face, xl0, y0, face, xr1, y1, face, xl1, y1, face);
  };
  const left: Edge = [
    [bounds.x0, -1e6],
    [bounds.x0, 1e6],
  ];
  const right: Edge = [
    [bounds.x1, -1e6],
    [bounds.x1, 1e6],
  ];
  for (let k = 0; k + 1 < levels.length; k++) {
    const ya = levels[k];
    const yb = levels[k + 1];
    if (yb - ya < 1e-6) continue;
    const ym = (ya + yb) / 2;
    // Each opening that spans this band: its left and right edge here.
    const spans: Array<{ l: Edge; r: Edge }> = [];
    for (const es of cuts) {
      const hit = es.filter(([p, q]) => Math.min(p[1], q[1]) < ym && Math.max(p[1], q[1]) > ym);
      if (hit.length < 2) continue;
      hit.sort((e, f) => xAt(e, ym) - xAt(f, ym));
      spans.push({ l: hit[0], r: hit[hit.length - 1] });
    }
    spans.sort((a, b) => xAt(a.l, ym) - xAt(b.l, ym));
    // The band is drawn a hair taller than it is, so neighbouring bands leave no cracks.
    const y0 = ya - 0.004;
    const y1 = yb + 0.004;
    let from = left;
    let cur: { l: Edge; r: Edge } | null = null;
    const flush = (next: Edge) => quad(xAt(from, y0), xAt(next, y0), y0, xAt(from, y1), xAt(next, y1), y1);
    for (const s of spans) {
      if (xAt(s.r, ym) <= bounds.x0 || xAt(s.l, ym) >= bounds.x1) continue;
      if (cur && xAt(s.l, ym) <= xAt(cur.r, ym)) {
        if (xAt(s.r, ym) > xAt(cur.r, ym)) cur.r = s.r;
        continue;
      }
      if (cur) from = cur.r;
      flush(s.l);
      cur = { l: s.l, r: s.r };
    }
    if (cur) from = cur.r;
    flush(right);
  }
  const faceGeo = new THREE.BufferGeometry();
  faceGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(facePos), 3));
  const faceNor = new Float32Array(facePos.length);
  for (let i = 2; i < faceNor.length; i += 3) faceNor[i] = 1;
  faceGeo.setAttribute("normal", new THREE.BufferAttribute(faceNor, 3));
  worldUVs(faceGeo);

  // --- Walls: every opening's edges, less the stretches inside another opening.
  const wall: Soup = { pos: [], nor: [], uv: [], col: [] };
  const floor: Soup = { pos: [], nor: [], uv: [], col: [] };
  const back = face - depth;
  const EPS = 1e-4;
  polys.forEach((_, pi) => {
    edges[pi].forEach(([p, q]) => {
      let keep: Array<[number, number]> = [[0, 1]];
      polys.forEach((other, oi) => {
        if (oi === pi) return;
        let tin = 0;
        let tout = 1;
        let inside = true;
        for (let e = 0; e < other.length && inside; e++) {
          const a = other[e];
          const b = other[(e + 1) % other.length];
          const mx = -(b[1] - a[1]);
          const my = b[0] - a[0];
          const len = Math.hypot(mx, my) || 1;
          const d0 = ((p[0] - a[0]) * mx + (p[1] - a[1]) * my) / len;
          const d1 = ((q[0] - a[0]) * mx + (q[1] - a[1]) * my) / len;
          if (d0 < -EPS && d1 < -EPS) inside = false;
          else if (d0 < -EPS) tin = Math.max(tin, d0 / (d0 - d1));
          else if (d1 < -EPS) tout = Math.min(tout, d0 / (d0 - d1));
        }
        if (!inside || tout - tin < 1e-6) return;
        const next: Array<[number, number]> = [];
        for (const [k0, k1] of keep) {
          if (tin > k0) next.push([k0, Math.min(k1, tin)]);
          if (tout < k1) next.push([Math.max(k0, tout), k1]);
        }
        keep = next.filter(([k0, k1]) => k1 - k0 > 1e-5);
      });
      const ex = q[0] - p[0];
      const ey = q[1] - p[1];
      const len = Math.hypot(ex, ey) || 1;
      const nx = -ey / len;
      const ny = ex / len;
      const isFloor = ny > 0.5;
      const out = isFloor ? floor : wall;
      const tile = isFloor ? floorTile : ROCK_TILE;
      for (const [k0, k1] of keep) {
        const a: V2 = [p[0] + ex * k0, p[1] + ey * k0];
        const b: V2 = [p[0] + ex * k1, p[1] + ey * k1];
        const corners: Array<[number, number, number]> = [
          [a[0], a[1], face],
          [b[0], b[1], face],
          [b[0], b[1], back],
          [a[0], a[1], back],
        ];
        for (const i of [0, 1, 2, 0, 2, 3]) {
          const [x, y, z] = corners[i];
          out.pos.push(x, y, z);
          out.nor.push(nx, ny, 0);
          // Along the edge and into the depth, so slopes are not stretched.
          const along = (x - p[0]) * (ex / len) + (y - p[1]) * (ey / len) + p[0] * 0.7 + p[1] * 0.3;
          out.uv.push(along / tile, z / tile);
          const shade = z === face ? 1 : isFloor ? 0.86 : 0.74;
          out.col.push(shade, shade, shade);
        }
      }
    });
  });
  const build = (b: Soup) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(b.pos), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(b.nor), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(b.uv), 2));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(b.col), 3));
    return g;
  };
  return { face: faceGeo, walls: build(wall), floors: build(floor) };
};
