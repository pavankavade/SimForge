// The character rig's two custom materials patch GLSL with onBeforeCompile, which WebGPURenderer
// ignores. Swap them for node-material equivalents: vinyl (PBR + warm fresnel rim) and the
// inverted-hull ink outline (pushed out along view-space normals, never thinner than a few px).
import * as THREE from "three/webgpu";
import {
  vec4, float, max, normalize, dot, positionView, normalView, smoothstep, color, uniform,
  modelViewMatrix, cameraProjectionMatrix, positionLocal, transformNormalToView, normalLocal, materialColor,
} from "three/tsl";

const RIM = new THREE.Color("#ffd2a0");
const INK_MIN_PX = 2.2, INK_WIDTH = 0.02; // must match src/artifacts/characters/hero/ink.ts
const cache = new Map();

export function convertRigMaterials(root, outputHeight, camera) {
  const p11 = uniform(camera.projectionMatrix.elements[5]);
  const vh = uniform(outputHeight);
  root.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.isNodeMaterial) return;
    const m = o.material;
    if (cache.has(m)) { o.material = cache.get(m); return; }
    const key = m.customProgramCacheKey?.() ?? "";
    let n = null;
    if (key.startsWith("vinyl-rim-")) {
      const rim = Number(key.slice("vinyl-rim-".length));
      n = new THREE.MeshStandardNodeMaterial({ color: m.color, roughness: m.roughness, metalness: m.metalness });
      const rimF = float(1).sub(dot(normalView, normalize(positionView).negate()).clamp());
      n.emissiveNode = color(RIM).mul(materialColor).mul(smoothstep(0.55, 1.0, rimF)).mul(rim);
    } else if (key.startsWith("ink-")) {
      const width = Number(key.slice("ink-".length));
      n = new THREE.MeshBasicNodeMaterial({ color: m.color, side: THREE.BackSide });
      const mv = modelViewMatrix.mul(vec4(positionLocal, 1));
      const px = mv.z.negate().max(0).mul(2).div(p11.mul(vh));
      const push = max(float(width), float((INK_MIN_PX * width) / INK_WIDTH).mul(px));
      n.vertexNode = cameraProjectionMatrix.mul(vec4(mv.xyz.add(normalize(transformNormalToView(normalLocal)).mul(push)), 1));
    }
    if (n) { cache.set(m, n); o.material = n; }
  });
}
