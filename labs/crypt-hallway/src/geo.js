// Geometry helpers shared by the hall and the masonry. World z = -s (s = distance down the hall).
import * as THREE from "three/webgpu";

// UVs in metres, projected along each vertex's dominant normal axis.
export function bakeUV(g) {
  g = g.index ? g.toNonIndexed() : g;
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const uvs = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = -p.getZ(i); v = p.getY(i); }
    else if (ay >= az) { u = p.getX(i); v = -p.getZ(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uvs[i * 2] = u; uvs[i * 2 + 1] = v;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  g.clearGroups();
  return g;
}

export function clean(g) {
  g = g.index ? g.toNonIndexed() : g;
  g.clearGroups();
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "blockId"].includes(k)) g.deleteAttribute(k);
  return g;
}

export function box(x0, x1, y0, y1, s0, s1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, s1 - s0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, -(s0 + s1) / 2);
  return bakeUV(g);
}

// Extrude a shape drawn in the (s, y) plane through x in [x0, x0 + depth].
export function extrudeSY(shape, x0, depth, bevel = 0.02, curveSegments = 28) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, curveSegments,
  });
  g.translate(0, 0, bevel);
  g.rotateY(Math.PI / 2); // shape x (= s) -> world -z, extrusion z -> world +x
  g.translate(x0, 0, 0);
  return bakeUV(g);
}

// Extrude a shape drawn in the (x, y) plane through s in [s0, s0 + depth].
export function extrudeXY(shape, s0, depth, bevel = 0.02, curveSegments = 40) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, curveSegments,
  });
  g.translate(0, 0, -(s0 + depth - bevel));
  return bakeUV(g);
}

// deterministic RNG so the rubble is the same every load
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

