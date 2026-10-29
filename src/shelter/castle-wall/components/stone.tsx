import { useMemo } from "react";
import * as THREE from "three";
import { useSurface } from "../../../engine/materials";
import { makeMasonry } from "../../../engine/textures";

/** Metres covered by one tile of the masonry texture (6 courses of 0.45). */
export const TILE = 2.7;

const cache = new Map<string, THREE.BoxGeometry>();

/**
 * A box whose UVs are world-space (metres / TILE), so masonry courses stay the
 * same size and line up across every block of the wall, whatever its shape.
 */
export const worldBox = (w: number, h: number, d: number, cx: number, cy: number, cz: number) => {
  const key = [w, h, d, cx, cy, cz].map((v) => v.toFixed(3)).join(",");
  const hit = cache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.getAttribute("position");
  const nrm = g.getAttribute("normal");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const y = pos.getY(i) + cy;
    const z = pos.getZ(i) + cz;
    const [u, v] = Math.abs(nrm.getX(i)) > 0.5 ? [z, y] : Math.abs(nrm.getY(i)) > 0.5 ? [x, z] : [x, y];
    uv.setXY(i, u / TILE, v / TILE);
  }
  uv.needsUpdate = true;
  cache.set(key, g);
  return g;
};

/** Warm sandstone ashlar for the wall, gatehouse and towers. */
export const useWallStone = (repeat: [number, number] = [1, 1]) => {
  const s = useSurface("cw-ashlar", () => makeMasonry({ rows: 6, cols: 3, base: "#d9c7a3", baseAlt: "#c8b38c", mortar: "#8f8069", seed: 7 }), repeat);
  return useMemo(() => {
    for (const t of [s.map, s.normalMap, s.roughnessMap]) {
      if (t) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }
    return s;
  }, [s]);
};

/** A box of wall masonry positioned by its centre, with world-locked courses. */
export const StoneBox: React.FC<{
  size: [number, number, number];
  at: [number, number, number];
  /** Visual offset that does not move the texture (drop-in animation). */
  lift?: number;
  color?: string;
}> = ({ size, at, lift = 0, color = "#ffffff" }) => {
  const stone = useWallStone();
  const geo = worldBox(size[0], size[1], size[2], at[0], at[1], at[2]);
  return (
    <mesh geometry={geo} position={[at[0], at[1] + lift, at[2]]} castShadow receiveShadow>
      <meshStandardMaterial {...stone} color={color} roughness={0.9} />
    </mesh>
  );
};
