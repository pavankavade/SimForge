import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * SimForge character look ("ink & vinyl"):
 *  - chunky rounded shapes with smooth normals,
 *  - soft-plastic PBR materials with a warm fresnel rim so bodies pop off the
 *    dark dungeon walls,
 *  - an inverted-hull ink outline of constant world width.
 *
 * Geometry and materials are cached module-wide and shared by every character,
 * so a crowd costs no extra shader programs. Always size parts through the
 * geometry factories below (real units) and use `scale` only for shaping.
 */

export const INK = "#1a1216";
/** Outline width in world units (view-space extrusion, independent of scale). */
export const INK_WIDTH = 0.013;
export const INK_THIN = 0.008;

const geoCache = new Map<string, THREE.BufferGeometry>();
const memoGeo = (key: string, make: () => THREE.BufferGeometry) => {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
};

/**
 * RoundedBoxGeometry winds some triangles inward on non-cubic boxes. The mesh
 * hides it, but the welded ink hull then extrudes those faces toward the
 * camera and paints flat panels (capes, shields) solid black. A centred box is
 * convex, so every face normal must point away from the origin.
 */
const fixWinding = (g: THREE.BufferGeometry) => {
  const attrs = Object.keys(g.attributes).map((name) => g.attributes[name] as THREE.BufferAttribute);
  const p = g.attributes.position;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i + 2 < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b));
    const centre = a.clone().add(b).add(c);
    if (n.dot(centre) >= 0) continue;
    for (const attr of attrs) {
      for (let j = 0; j < attr.itemSize; j++) {
        const t = attr.getComponent(i + 1, j);
        attr.setComponent(i + 1, j, attr.getComponent(i + 2, j));
        attr.setComponent(i + 2, j, t);
      }
    }
  }
  return g;
};

const k = (...parts: number[]) => parts.map((p) => p.toFixed(4)).join(",");

export const G = {
  sphere: (r: number, thetaStart = 0, thetaLength = Math.PI, phiStart = 0, phiLength = Math.PI * 2) =>
    memoGeo(`sphere:${k(r, thetaStart, thetaLength, phiStart, phiLength)}`, () =>
      new THREE.SphereGeometry(r, 28, 20, phiStart, phiLength, thetaStart, thetaLength)
    ),
  /** Capsule of total length `len` (including both caps), centred on the origin along y. */
  capsule: (r: number, len: number) =>
    memoGeo(`capsule:${k(r, len)}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 16)),
  box: (w: number, h: number, d: number, radius = Math.min(w, h, d) * 0.3) =>
    memoGeo(`rbox:${k(w, h, d, radius)}`, () =>
      fixWinding(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, Math.min(w, h, d) / 2 - 0.0005)))
    ),
  cyl: (rTop: number, rBottom: number, h: number, seg = 20) =>
    memoGeo(`cyl:${k(rTop, rBottom, h, seg)}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg)),
  cone: (r: number, h: number, seg = 18) =>
    memoGeo(`cone:${k(r, h, seg)}`, () => new THREE.ConeGeometry(r, h, seg)),
  torus: (r: number, tube: number, arc = Math.PI * 2) =>
    memoGeo(`torus:${k(r, tube, arc)}`, () => new THREE.TorusGeometry(r, tube, 10, 32, arc)),
  /** Half disc (flat side up): open mouths, tongues. */
  disc: (r: number, thetaStart = 0, thetaLength = Math.PI * 2) =>
    memoGeo(`disc:${k(r, thetaStart, thetaLength)}`, () => new THREE.CircleGeometry(r, 28, thetaStart, thetaLength)),
  /** Surface of revolution from [radius, y] pairs (torsos, robes, beards). */
  lathe: (key: string, profile: ReadonlyArray<readonly [number, number]>) =>
    memoGeo(`lathe:${key}`, () =>
      new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        32
      )
    ),
  /** Lathe over part of the circle: phi 0 is +z (front). Tabards, aprons, mask panels. */
  latheArc: (key: string, profile: ReadonlyArray<readonly [number, number]>, phiStart: number, phiLength: number) =>
    memoGeo(`lathearc:${key}:${k(phiStart, phiLength)}`, () =>
      new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        24,
        phiStart,
        phiLength
      )
    ),
  /**
   * Cone/frustum standing on y=0 whose axis droops sideways as it rises
   * (floppy hats, hood tails). Offsets grow with t^2 so the base stays upright.
   */
  bentCone: (rBottom: number, rTop: number, h: number, bendX: number, bendZ: number) =>
    memoGeo(`bent:${k(rBottom, rTop, h, bendX, bendZ)}`, () => {
      const g = new THREE.CylinderGeometry(rTop, rBottom, h, 28, 18);
      g.translate(0, h / 2, 0);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = pos.getY(i) / h;
        pos.setX(i, pos.getX(i) + bendX * t * t);
        pos.setZ(i, pos.getZ(i) + bendZ * t * t);
        pos.setY(i, pos.getY(i) - (Math.abs(bendX) + Math.abs(bendZ)) * 0.35 * t * t);
      }
      g.computeVertexNormals();
      return g;
    }),
};

const inkGeoCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

/** Same shape with welded, averaged normals so the extruded hull has no cracks at hard edges. */
export const inkGeometry = (g: THREE.BufferGeometry) => {
  let out = inkGeoCache.get(g);
  if (!out) {
    const c = g.clone();
    c.deleteAttribute("normal");
    c.deleteAttribute("uv");
    out = mergeVertices(c, 1e-4);
    out.computeVertexNormals();
    inkGeoCache.set(g, out);
  }
  return out;
};

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export type Finish = "skin" | "cloth" | "leather" | "metal" | "gold" | "wood" | "bone" | "gloss" | "hair";

const FINISH: Record<Finish, { roughness: number; metalness: number; rim: number }> = {
  skin: { roughness: 0.55, metalness: 0, rim: 0.32 },
  cloth: { roughness: 0.82, metalness: 0, rim: 0.28 },
  leather: { roughness: 0.62, metalness: 0.04, rim: 0.24 },
  hair: { roughness: 0.75, metalness: 0, rim: 0.3 },
  wood: { roughness: 0.7, metalness: 0, rim: 0.2 },
  bone: { roughness: 0.6, metalness: 0, rim: 0.3 },
  gloss: { roughness: 0.25, metalness: 0, rim: 0.2 },
  metal: { roughness: 0.32, metalness: 0.78, rim: 0.42 },
  gold: { roughness: 0.28, metalness: 0.85, rim: 0.4 },
};

const RIM_COLOR = new THREE.Color("#ffd2a0");
const matCache = new Map<string, THREE.Material>();

/** Shared toy-vinyl material: PBR + warm fresnel rim. */
export const vinyl = (color: string, finish: Finish = "cloth") => {
  const key = `v:${color}:${finish}`;
  let m = matCache.get(key);
  if (!m) {
    const f = FINISH[finish];
    const mat = new THREE.MeshStandardMaterial({ color, roughness: f.roughness, metalness: f.metalness });
    const rim = f.rim;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.rimColor = { value: RIM_COLOR };
      shader.uniforms.rimStrength = { value: rim };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;")
        .replace(
          "#include <emissivemap_fragment>",
          [
            "#include <emissivemap_fragment>",
            "float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);",
            "totalEmissiveRadiance += rimColor * diffuseColor.rgb * smoothstep(0.55, 1.0, rimF) * rimStrength;",
          ].join("\n")
        );
    };
    mat.customProgramCacheKey = () => `vinyl-rim-${rim}`;
    m = mat;
    matCache.set(key, m);
  }
  return m;
};

/** Self-lit material for gems, orbs, eye glints and magic. Blooms in PostFX. */
export const glow = (color: string, intensity = 2) => {
  const key = `g:${color}:${intensity}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.2 });
    matCache.set(key, m);
  }
  return m;
};

/** Unlit flat colour (pupils, mouths, brows): reads the same under any light. */
export const flat = (color: string) => {
  const key = `f:${color}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    matCache.set(key, m);
  }
  return m;
};

/** Inverted-hull outline pushed out along view-space normals by `width` world units. */
export const inkMaterial = (width = INK_WIDTH) => {
  const key = `ink:${width}`;
  let m = matCache.get(key);
  if (!m) {
    const mat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.inkWidth = { value: width };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float inkWidth;")
        .replace(
          "#include <project_vertex>",
          [
            "vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );",
            "mvPosition.xyz += normalize( normalMatrix * normal ) * inkWidth;",
            "gl_Position = projectionMatrix * mvPosition;",
          ].join("\n")
        );
    };
    mat.customProgramCacheKey = () => `ink-${width}`;
    m = mat;
    matCache.set(key, m);
  }
  return m;
};
