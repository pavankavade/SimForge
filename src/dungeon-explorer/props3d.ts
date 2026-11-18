// CC0 models from Patch's asset library (public/dungeon-explorer/assets/models/<set>/<name>.glb,
// preview variants: meshopt-compressed, 512 px textures). Loaded once each and cloned per use.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<THREE.Object3D>>();

/** `path` is "<set>/<name>", e.g. "rooms/treasure_chest". */
export function loadModel(path: string): Promise<THREE.Object3D> {
  let p = cache.get(path);
  if (!p) {
    p = loader.loadAsync(`/assets/models/${path}.glb`).then((g) => {
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.45;
        }
      });
      return g.scene;
    });
    cache.set(path, p);
  }
  return p;
}

/** A clone placed in `parent` (metres, the parent's frame), once loaded; returns the promise. */
export function placeModel(
  parent: THREE.Object3D,
  path: string,
  at: [number, number, number],
  opts: { yaw?: number; pitch?: number; roll?: number; scale?: number } = {},
  alive: () => boolean = () => true
): Promise<THREE.Object3D | null> {
  return loadModel(path)
    .then((src) => {
      if (!alive()) return null;
      const o = src.clone(true);
      o.position.set(at[0], at[1], at[2]);
      o.rotation.order = "YXZ";
      o.rotation.set(opts.pitch ?? 0, opts.yaw ?? 0, opts.roll ?? 0);
      o.scale.setScalar(opts.scale ?? 1);
      parent.add(o);
      return o;
    })
    .catch((err: unknown) => {
      console.warn(`model ${path} failed`, err);
      return null;
    });
}
