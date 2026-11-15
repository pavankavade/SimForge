// Inventory icons: each piece of the paladin's kit rendered on its own in a small studio (three
// lights and the materials' own environment), framed to its bounds, three-quarter view. Rendered
// into a float target with the game's renderer, then tone mapped here, so it needs no second WebGL
// context and leaves the screen and the renderer's state as they were.
import * as THREE from "three";

const _box = new THREE.Box3();
const _b = new THREE.Box3();

/** Every half-float bit pattern decoded once (the pixel loop reads millions of them). */
let HALF: Float32Array | null = null;
function halfTable(): Float32Array {
  if (!HALF) {
    HALF = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) HALF[i] = THREE.DataUtils.fromHalfFloat(i);
  }
  return HALF;
}

/** ACES filmic (Narkowicz fit) then sRGB encoding, linear in, 0..255 out. */
function toneMap(x: number): number {
  const v = Math.max(0, x * 1.25);
  const t = Math.min(1, (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14));
  const s = t <= 0.0031308 ? t * 12.92 : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, s)) * 255);
}

/**
 * Render one icon per key. `objects(key)` lists what to show for it; `everything` is every piece
 * that might be visible (all hidden while each icon renders); `restore` puts the visibility back.
 */
export function renderPieceIcons<K extends string>(
  renderer: THREE.WebGLRenderer,
  group: THREE.Group,
  keys: K[],
  objects: (key: K) => THREE.Object3D[],
  everything: THREE.Object3D[],
  size: number,
  restore: () => void
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  const S = size * 2;
  const rt = new THREE.WebGLRenderTarget(S, S, { type: THREE.HalfFloatType, depthBuffer: true });
  const studio = new THREE.Scene();
  studio.add(new THREE.HemisphereLight(0xcdd8e6, 0x2a241d, 1.4));
  const key = new THREE.DirectionalLight(0xfff2e2, 3.2);
  key.position.set(1.2, 2, 2.4);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 2.2);
  rim.position.set(-2, 1.4, -1.6);
  const fill = new THREE.DirectionalLight(0xffe0c0, 0.9);
  fill.position.set(-1.6, 0.4, 1.8);
  studio.add(key, rim, fill);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 20);

  // Borrow the paladin: into the studio at the origin, facing the camera.
  const parent = group.parent;
  const pos = group.position.clone();
  const rot = group.rotation.clone();
  const wasVisible = group.visible;
  studio.add(group);
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.visible = true;
  group.updateMatrixWorld(true);

  const prevTarget = renderer.getRenderTarget();
  const prevColor = new THREE.Color();
  renderer.getClearColor(prevColor);
  const prevAlpha = renderer.getClearAlpha();
  const prevAutoClear = renderer.autoClear;
  const pixels = new Uint16Array(S * S * 4);
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  const small = document.createElement("canvas");
  small.width = size;
  small.height = size;
  const sctx = small.getContext("2d");
  const dir = new THREE.Vector3(0.5, 0.28, 1).normalize();

  try {
    for (const k of keys) {
      const shown = objects(k);
      if (!shown.length) continue;
      for (const o of everything) o.visible = false;
      _box.makeEmpty();
      for (const o of shown) {
        o.visible = true;
        o.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          const sk = c as THREE.SkinnedMesh;
          if (sk.isSkinnedMesh) {
            sk.computeBoundingBox();
            _b.copy(sk.boundingBox as THREE.Box3).applyMatrix4(sk.matrixWorld);
          } else {
            // Cloth moves its vertices every frame, so always measure afresh.
            m.geometry.computeBoundingBox();
            _b.copy(m.geometry.boundingBox as THREE.Box3).applyMatrix4(m.matrixWorld);
          }
          _box.union(_b);
        });
      }
      if (_box.isEmpty()) continue;
      const centre = _box.getCenter(new THREE.Vector3());
      const radius = _box.getSize(new THREE.Vector3()).length() / 2;
      const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.02;
      camera.position.copy(centre).addScaledVector(dir, dist);
      camera.near = Math.max(0.01, dist - radius * 2);
      camera.far = dist + radius * 2;
      camera.updateProjectionMatrix();
      camera.lookAt(centre);

      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = true;
      renderer.clear();
      renderer.render(studio, camera);
      renderer.readRenderTargetPixels(rt, 0, 0, S, S, pixels);
      if (!ctx || !sctx) continue;
      const img = ctx.createImageData(S, S);
      const H = halfTable();
      for (let y = 0; y < S; y++) {
        // Render targets are bottom-up; images are top-down.
        const src = (S - 1 - y) * S * 4;
        const dst = y * S * 4;
        for (let x = 0; x < S * 4; x += 4) {
          const a = H[pixels[src + x + 3]];
          if (a <= 0.001) continue;
          img.data[dst + x] = toneMap(H[pixels[src + x]] / a);
          img.data[dst + x + 1] = toneMap(H[pixels[src + x + 1]] / a);
          img.data[dst + x + 2] = toneMap(H[pixels[src + x + 2]] / a);
          img.data[dst + x + 3] = Math.round(Math.min(1, a) * 255);
        }
      }
      ctx.putImageData(img, 0, 0);
      // Half size: the double resolution render is the anti-aliasing.
      sctx.clearRect(0, 0, size, size);
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(canvas, 0, 0, size, size);
      out[k] = small.toDataURL("image/png");
    }
  } catch (err) {
    console.warn("paladin: inventory icons could not be rendered", err);
  } finally {
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevColor, prevAlpha);
    renderer.autoClear = prevAutoClear;
    rt.dispose();
    if (parent) parent.add(group);
    else studio.remove(group);
    group.position.copy(pos);
    group.rotation.copy(rot);
    group.visible = wasVisible;
    group.updateMatrixWorld(true);
    restore();
  }
  return out;
}
