import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Loads a .glb from `public/` once per tab and holds the frame until it is
 * drawn, so stills and renders never catch a half-loaded model. Callers clone
 * what they need (SkeletonUtils for skinned models): the cached scene is shared.
 * Use inside a <ThreeCanvas> scene.
 */
const cache = new Map<string, Promise<GLTF>>();

export const loadGltf = (path: string): Promise<GLTF> => {
  let p = cache.get(path);
  if (!p) {
    p = new GLTFLoader().loadAsync(staticFile(path));
    cache.set(path, p);
  }
  return p;
};

export const useGltf = (path: string): GLTF | null => {
  const { advance } = useThree();
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender(`Loading ${path}`, { timeoutInMilliseconds: 120000 }));
  const released = useRef(false);
  const release = () => {
    if (released.current) return;
    released.current = true;
    continueRender(handle);
  };

  useEffect(() => {
    let alive = true;
    loadGltf(path)
      .then((g) => alive && setGltf(g))
      .catch((err: unknown) => cancelRender(err instanceof Error ? err : new Error(String(err))));
    return () => {
      alive = false;
    };
  }, [path]);

  // While rendering, <ThreeCanvas> only draws when the frame changes, and that draw happened
  // before the model arrived: draw once more with it posed (the caller poses during render).
  useLayoutEffect(() => {
    if (!gltf || released.current) return;
    advance(performance.now());
    release();
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => release(), []);
  return gltf;
};
