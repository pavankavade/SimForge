import { useMemo } from "react";
import * as THREE from "three";
import type { SurfaceSet } from "./textures";
import { getSurface } from "./textures";

const repeatCache = new Map<string, THREE.Texture | null>();

const repeatOf = (
  texture: THREE.Texture | null,
  key: string,
  x: number,
  y: number
) => {
  if (!texture) return null;
  const cacheKey = `${key}:${x}x${y}`;
  const hit = repeatCache.get(cacheKey);
  if (hit !== undefined) return hit;

  const clone = texture.clone();
  clone.repeat.set(x, y);
  clone.needsUpdate = true;
  repeatCache.set(cacheKey, clone);
  return clone;
};

/**
 * Bakes (once) a procedural surface and returns a copy tiled to `repeat`.
 * Textures are shared across meshes, so this stays cheap at render time.
 */
export const useSurface = (
  key: string,
  build: () => SurfaceSet,
  repeat: [number, number]
): SurfaceSet =>
  useMemo(() => {
    const base = getSurface(key, build);
    const [x, y] = repeat;
    return {
      map: repeatOf(base.map, `${key}-map`, x, y),
      normalMap: repeatOf(base.normalMap, `${key}-normal`, x, y),
      roughnessMap: repeatOf(base.roughnessMap, `${key}-rough`, x, y),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, repeat[0], repeat[1]]);
