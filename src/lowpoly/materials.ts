import * as THREE from "three";

/**
 * The clean low-poly palette: muted, a little desaturated, so the soft sun and
 * the AO do the work. One saturated accent per scene (hazard yellow, danger red).
 */
export const LP = {
  stone: "#8d98a6",
  stoneDark: "#5f6a78",
  plaster: "#c9cdd2",
  plasterWarm: "#d8d1c4",
  trim: "#c8b48a",
  trimDark: "#9c875f",
  wood: "#c47a3c",
  woodDark: "#8e5428",
  concrete: "#a7aaa8",
  steel: "#a6b0ba",
  grass: "#93a476",
  grassDark: "#7d9165",
  leaf: "#86a06a",
  roof: "#6b7480",
  cloth: "#5c7fa3",
  cream: "#ece6d8",
  red: "#c4473d",
  hazard: "#e3b23c",
  ink: "#2b2f36",
} as const;

const cache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Flat-shaded matte material (no textures). Cached per colour and options, so
 * hundreds of blocks share a handful of programs.
 */
export const matte = (
  color: string,
  { rough = 0.82, metal = 0, emissive, emissiveIntensity = 1 }: { rough?: number; metal?: number; emissive?: string; emissiveIntensity?: number } = {}
) => {
  const key = `${color}|${rough}|${metal}|${emissive ?? ""}|${emissiveIntensity}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      flatShading: true,
      ...(emissive ? { emissive: new THREE.Color(emissive), emissiveIntensity } : {}),
    });
    cache.set(key, m);
  }
  return m;
};

/** Brushed steel that still reads as a colour at a distance (low metalness on purpose). */
export const steel = (color: string = LP.steel) => matte(color, { rough: 0.55, metal: 0.12 });
