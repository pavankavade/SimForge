import type React from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../engine/types";
import { chamferBox, chamferPrism, chamferWedge, facetBlob } from "./geometry";
import { matte } from "./materials";

interface Placed {
  position?: Vec3;
  rotation?: Vec3;
  /** A colour (matte) or a ready material (steel, glow). */
  color?: string;
  material?: THREE.Material;
  castShadow?: boolean;
}

const mat = (p: Placed) => p.material ?? matte(p.color ?? "#cccccc");

/** One chamfered block. `size` is [w, h, d]; `bevel` defaults to 12% of the thinnest side. */
export const Block: React.FC<Placed & { size: Vec3; bevel?: number }> = ({ size, bevel, position, rotation, castShadow = true, ...p }) => (
  <mesh
    geometry={chamferBox(size[0], size[1], size[2], bevel)}
    material={mat(p)}
    position={position}
    rotation={rotation}
    castShadow={castShadow}
    receiveShadow
  />
);

/** Upright chamfered prism (posts, pillars, octagon tiles). */
export const Prism: React.FC<Placed & { r: number; h: number; sides?: number; bevel?: number; turn?: number }> = ({
  r,
  h,
  sides = 8,
  bevel,
  turn = Math.PI / sides,
  position,
  rotation,
  castShadow = true,
  ...p
}) => (
  <mesh
    geometry={chamferPrism(r, h, sides, bevel, turn)}
    material={mat(p)}
    position={position}
    rotation={rotation}
    castShadow={castShadow}
    receiveShadow
  />
);

/** Chamfered wedge (roof halves, ramps): tall at -x, zero at +x. */
export const Wedge: React.FC<Placed & { size: Vec3; bevel?: number }> = ({ size, bevel, position, rotation, castShadow = true, ...p }) => (
  <mesh
    geometry={chamferWedge(size[0], size[1], size[2], bevel)}
    material={mat(p)}
    position={position}
    rotation={rotation}
    castShadow={castShadow}
    receiveShadow
  />
);

/** Faceted blob: foliage, rocks, clouds. `scale` squashes it. */
export const Blob: React.FC<Placed & { r: number; scale?: Vec3; seed?: number; detail?: number; jitter?: number }> = ({
  r,
  scale,
  seed = 1,
  detail = 1,
  jitter = 0.18,
  position,
  rotation,
  castShadow = true,
  ...p
}) => (
  <mesh
    geometry={facetBlob(r, detail, jitter, seed)}
    material={mat(p)}
    position={position}
    rotation={rotation}
    scale={scale}
    castShadow={castShadow}
    receiveShadow
  />
);

/**
 * Octagon-and-square tile floor (the reference's floor): octagons `cell` wide
 * on a grid, small diamond keystones in the corners sitting a little lower.
 * The area spans `cols × rows` cells with its top at y = 0 of the group.
 */
export const OctagonFloor: React.FC<{
  cols: number;
  rows: number;
  cell?: number;
  tile?: string;
  keystone?: string;
  gap?: number;
  position?: Vec3;
}> = ({ cols, rows, cell = 0.8, tile = "#a9b3bd", keystone = "#b9a27a", gap = 0.035, position }) => {
  const octRef = useRef<THREE.InstancedMesh>(null);
  const keyRef = useRef<THREE.InstancedMesh>(null);
  const h = cell * 0.12;
  // Flat-to-flat width cell - gap: corner radius = half width / cos(22.5°).
  const octGeo = chamferPrism((cell - gap) / 2 / Math.cos(Math.PI / 8), h, 8, h * 0.45, Math.PI / 8);
  // The diamond between four octagons has a side of cell·tan(22.5°).
  const keySide = cell * Math.tan(Math.PI / 8) - gap;
  const keyGeo = chamferPrism(keySide / Math.SQRT2, h, 4, h * 0.35, 0);
  const octMat = useMemo(() => matte(tile, { rough: 0.7 }), [tile]);
  const keyMat = useMemo(() => matte(keystone, { rough: 0.75 }), [keystone]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    let i = 0;
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        m.makeTranslation((c - (cols - 1) / 2) * cell, -h / 2, (r - (rows - 1) / 2) * cell);
        octRef.current?.setMatrixAt(i++, m);
      }
    if (octRef.current) octRef.current.instanceMatrix.needsUpdate = true;
    i = 0;
    for (let c = 0; c <= cols; c++)
      for (let r = 0; r <= rows; r++) {
        m.makeTranslation((c - cols / 2) * cell, -h / 2 - h * 0.25, (r - rows / 2) * cell);
        keyRef.current?.setMatrixAt(i++, m);
      }
    if (keyRef.current) keyRef.current.instanceMatrix.needsUpdate = true;
  }, [cols, rows, cell, h]);

  return (
    <group position={position}>
      <instancedMesh ref={octRef} args={[octGeo, octMat, cols * rows]} receiveShadow />
      <instancedMesh ref={keyRef} args={[keyGeo, keyMat, (cols + 1) * (rows + 1)]} receiveShadow />
      {/* Grout bed under the tiles, so the gaps read dark-but-not-black. */}
      <mesh position={[0, -h * 1.2, 0]} receiveShadow material={matte("#5d6570")}>
        <boxGeometry args={[cols * cell, h * 0.4, rows * cell]} />
      </mesh>
    </group>
  );
};

/** Chamfered planks along X filling `w × d` (wood floors, decks, fences). */
export const PlankFloor: React.FC<{ w: number; d: number; plank?: number; color?: string; position?: Vec3 }> = ({
  w,
  d,
  plank = 0.42,
  color = "#b98a5a",
  position,
}) => {
  const n = Math.max(1, Math.round(d / plank));
  const pd = d / n;
  const t = 0.09;
  // Alternate two close shades so the boards read without a texture.
  const shades = [color, new THREE.Color(color).multiplyScalar(0.92).getStyle()];
  return (
    <group position={position}>
      {Array.from({ length: n }, (_, i) => (
        <Block
          key={i}
          size={[w, t, pd - 0.02]}
          bevel={0.03}
          color={shades[i % 2]}
          position={[0, -t / 2, (i - (n - 1) / 2) * pd]}
          castShadow={false}
        />
      ))}
    </group>
  );
};
