import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { BEATS, CAVE_ENTRANCE_X, CAVE_BACK_X } from "../timeline";
import { progress } from "../../../kit/motion";

interface CaveDioramaProps {
  frame: number;
}

/** Front cutaway plane Z coordinate (flawlessly aligns subterranean, cave, and mountain) */
const CUTAWAY_Z = 1.82;
const BACK_WALL_Z = -2.15;
const BACK_Z = -4.8;
const MOUNTAIN_LEFT_X = -8.2;
const MOUNTAIN_RIGHT_X = 7.6;
const CLIFF_OUTER_X = -1.15;

/** Organic mountain summit surface elevation function at (x, z) */
function mountainElevation(x: number, z: number): number {
  const vZ = Math.max(0, Math.min(1, (CUTAWAY_Z - z) / (CUTAWAY_Z - BACK_Z)));
  const ridgeLift = Math.pow(vZ, 1.25) * 1.6;
  const peakX = Math.sin(x * 0.75 + 1.2) * 0.45 + Math.cos(x * 1.6) * 0.25;
  const undulation = Math.sin(x * 1.1 + z * 0.8) * 0.25 + Math.cos(x * 2.1 - z * 1.4) * 0.12;
  return 7.25 + ridgeLift + peakX + undulation;
}

/**
 * Master Cross-Section Profile of the Cave Cavern and Entrance Arch.
 * Parameter v goes from 0 (floor at back rock wall) to 1 (front cutaway rim).
 * All cave and mountain meshes evaluate this exact same function to guarantee ZERO seams!
 */
function caveCrossSection(v: number, x: number): { x: number; y: number; z: number } {
  let baseY: number;
  let baseZ: number;

  if (v <= 0.35) {
    // Back rock wall rising from floor Y=0 up to Y=2.45
    const t = v / 0.35;
    baseY = t * 2.45;
    baseZ = BACK_WALL_Z + Math.pow(t, 1.6) * 0.30;
  } else if (v <= 0.70) {
    // Arching over the cave interior up to peak Y=3.85 at Z=-0.35
    const t = (v - 0.35) / 0.35;
    baseY = 2.45 + Math.sin(t * Math.PI * 0.5) * 1.40;
    baseZ = -1.85 + t * 1.50;
  } else {
    // Descending to front cutaway rim at Y=3.40, Z=1.82
    const t = (v - 0.70) / 0.30;
    baseY = 3.85 - Math.sin(t * Math.PI * 0.5) * 0.45;
    baseZ = -0.35 + t * (CUTAWAY_Z - (-0.35));
  }

  // Organic deterministic rock crags:
  // Smoothly zero at floor (v = 0) and front cutaway (v = 1) so it joins other meshes with 0 seam
  const cragWeight = Math.sin(v * Math.PI);
  const crag =
    (Math.sin(x * 2.5 + v * 8.0) * 0.04 +
     Math.cos(x * 5.0 - v * 12.0) * 0.02) * cragWeight;

  return {
    x: x,
    y: baseY + crag * 0.45,
    z: baseZ + crag,
  };
}

/** Generates a single continuous, corner-free curved cave cavern geometry */
function createCavernGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const nx = 44;
  const nv = 32;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const baseX = CAVE_ENTRANCE_X + u * (CAVE_BACK_X - CAVE_ENTRANCE_X);

    // Natural rounding into back alcove only at the far end (x > 5.6)
    const backT = Math.max(0, (baseX - 5.6) / 0.8);
    const alcoveInward = Math.sin(backT * Math.PI * 0.5);

    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv;
      const pt = caveCrossSection(v, baseX);

      let curX = pt.x;
      const curY = pt.y;
      let curZ = pt.z;

      // Close back alcove smoothly at far end
      if (alcoveInward > 0) {
        curZ = curZ + alcoveInward * (1.82 - curZ) * (1 - v * 0.5) * 0.6;
        curX = curX - alcoveInward * (1 - v * 0.6) * 0.25;
      }

      positions.push(curX, curY, curZ);
      uvs.push(u * 2.5, v * 2.0);
    }
  }

  for (let ix = 0; ix < nx; ix++) {
    for (let iv = 0; iv < nv; iv++) {
      const a = ix * (nv + 1) + iv;
      const b = (ix + 1) * (nv + 1) + iv;
      const c = (ix + 1) * (nv + 1) + (iv + 1);
      const d = ix * (nv + 1) + (iv + 1);

      // Facing inward into cave chamber
      indices.push(a, c, b);
      indices.push(a, d, c);
    }
  }

  // Solid back alcove end-cap at ix = nx (sealing the cave end cleanly)
  const centerIdx = positions.length / 3;
  const centerPt = caveCrossSection(0.5, CAVE_BACK_X);
  positions.push(CAVE_BACK_X - 0.25, centerPt.y * 0.6, 0.0);
  uvs.push(2.5, 1.0);

  const lastRowStart = nx * (nv + 1);
  for (let iv = 0; iv < nv; iv++) {
    const p1 = lastRowStart + iv;
    const p2 = lastRowStart + (iv + 1);
    // Facing inward
    indices.push(p1, centerIdx, p2);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates the solid Upper Mountain Cutaway Face at Z = CUTAWAY_Z (1.82).
 * Firmly and seamlessly joins the cave ceiling front edge with ZERO hollow gap,
 * extending from CLIFF_OUTER_X (-1.15) to MOUNTAIN_RIGHT_X (7.60)!
 */
function createUpperCutawayGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nx = 44;
  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const baseX = CLIFF_OUTER_X + u * (MOUNTAIN_RIGHT_X - CLIFF_OUTER_X);

    // Ceiling connection line (bottom of upper cutaway face at Z = CUTAWAY_Z = 1.82)
    let botY = 3.40;

    if (baseX <= CAVE_BACK_X) {
      botY = 3.40;
    } else {
      // Past the back of the cave, curve down into the floor to seal off the right cutaway
      const pastT = (baseX - CAVE_BACK_X) / (MOUNTAIN_RIGHT_X - CAVE_BACK_X);
      botY = 3.40 * (1 - pastT);
    }

    const topY = mountainElevation(baseX, CUTAWAY_Z);

    // Bottom vertex
    positions.push(baseX, botY, CUTAWAY_Z);
    uvs.push((baseX - CLIFF_OUTER_X) / 4.0, (botY - 3.40) / 4.0);

    // Top vertex
    positions.push(baseX, topY, CUTAWAY_Z);
    uvs.push((baseX - CLIFF_OUTER_X) / 4.0, (topY - 3.40) / 4.0);
  }

  for (let ix = 0; ix < nx; ix++) {
    const vBotA = ix * 2;
    const vTopA = ix * 2 + 1;
    const vBotB = (ix + 1) * 2;
    const vTopB = (ix + 1) * 2 + 1;

    // Facing +Z (towards camera cutaway)
    indices.push(vBotA, vBotB, vTopA);
    indices.push(vTopA, vBotB, vTopB);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates the organic 3D Mountain Summit Terrain (Plateau and Alpine Ridge).
 * Solidly caps the entire diorama volume with undulating rock ridges, peaks, and crags.
 */
function createMountainSummitGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nx = 40;
  const nz = 28;

  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = MOUNTAIN_LEFT_X + u * (MOUNTAIN_RIGHT_X - MOUNTAIN_LEFT_X);

    for (let iz = 0; iz <= nz; iz++) {
      const v = iz / nz; // 0 at front CUTAWAY_Z, 1 at back BACK_Z
      const z = CUTAWAY_Z - v * (CUTAWAY_Z - BACK_Z);
      const y = mountainElevation(x, z);

      positions.push(x, y, z);
      uvs.push((x - MOUNTAIN_LEFT_X) / 4.0, (CUTAWAY_Z - z) / 4.0);
    }
  }

  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const a = ix * (nz + 1) + iz;
      const b = (ix + 1) * (nz + 1) + iz;
      const c = (ix + 1) * (nz + 1) + (iz + 1);
      const d = ix * (nz + 1) + (iz + 1);

      // Facing +Y / upward
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates the Sheer Mountain Cliff Face above and around the Cave Entrance at X = CLIFF_OUTER_X (-1.15).
 * Spans Z from BACK_WALL_Z (-2.15) to CUTAWAY_Z (1.82).
 * Rises from the wide natural cave entrance arch (caveCrossSection) up to the mountain summit rim!
 */
function createExteriorCliffGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nv = 32;

  for (let iv = 0; iv <= nv; iv++) {
    const v = iv / nv;
    const ptBottom = caveCrossSection(v, CLIFF_OUTER_X);
    const topY = mountainElevation(CLIFF_OUTER_X, ptBottom.z);

    // Bottom vertex (arch rim at CLIFF_OUTER_X)
    positions.push(ptBottom.x, ptBottom.y, ptBottom.z);
    uvs.push((ptBottom.z - BACK_WALL_Z) / 4.0, ptBottom.y / 4.0);

    // Top vertex (mountain summit rim at CLIFF_OUTER_X)
    positions.push(CLIFF_OUTER_X, topY, ptBottom.z);
    uvs.push((ptBottom.z - BACK_WALL_Z) / 4.0, topY / 4.0);
  }

  for (let iv = 0; iv < nv; iv++) {
    const vBotA = iv * 2;
    const vTopA = iv * 2 + 1;
    const vBotB = (iv + 1) * 2;
    const vTopB = (iv + 1) * 2 + 1;

    // Facing -X (towards exterior forest)
    indices.push(vBotA, vTopA, vBotB);
    indices.push(vTopA, vTopB, vBotB);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates the 3D Rocky Arch Soffit (Underside of the Cave Mouth Overhang).
 * Connects the outer cliff rim at X = CLIFF_OUTER_X (-1.15) to the inner cavern vault at X = -0.80.
 * Gives the cave mouth a beveled, rugged stone rim with genuine depth!
 */
function createEntranceSoffitGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nv = 32;

  for (let iv = 0; iv <= nv; iv++) {
    const v = iv / nv;
    const ptOuter = caveCrossSection(v, CLIFF_OUTER_X);
    const ptInner = caveCrossSection(v, CAVE_ENTRANCE_X);

    // Outer arch vertex (at CLIFF_OUTER_X)
    positions.push(ptOuter.x, ptOuter.y, ptOuter.z);
    uvs.push(0, v * 2.0);

    // Inner arch vertex (at CAVE_ENTRANCE_X)
    positions.push(ptInner.x, ptInner.y, ptInner.z);
    uvs.push(0.35 / 4.0, v * 2.0);
  }

  for (let iv = 0; iv < nv; iv++) {
    const vOutA = iv * 2;
    const vInA = iv * 2 + 1;
    const vOutB = (iv + 1) * 2;
    const vInB = (iv + 1) * 2 + 1;

    // Facing downward / into cave
    indices.push(vOutA, vOutB, vInA);
    indices.push(vInA, vOutB, vInB);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates the Massive Mountain Cliff Wall behind the exterior forest at Z = BACK_WALL_Z (-2.15).
 * Spans X from MOUNTAIN_LEFT_X (-8.2) to CAVE_ENTRANCE_X (-0.80), rising from ground Y = 0 to summit.
 * Towering behind the exterior pine trees in the rain!
 */
function createExteriorBackdropCliffGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nx = 32;
  const z = BACK_WALL_Z; // -2.15

  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = MOUNTAIN_LEFT_X + u * (CAVE_ENTRANCE_X - MOUNTAIN_LEFT_X);

    const botY = 0;
    const topY = mountainElevation(x, z);

    // Bottom vertex
    positions.push(x, botY, z);
    uvs.push((x - MOUNTAIN_LEFT_X) / 4.0, 0);

    // Top vertex
    positions.push(x, topY, z);
    uvs.push((x - MOUNTAIN_LEFT_X) / 4.0, topY / 4.0);
  }

  for (let ix = 0; ix < nx; ix++) {
    const vBotA = ix * 2;
    const vTopA = ix * 2 + 1;
    const vBotB = (ix + 1) * 2;
    const vTopB = (ix + 1) * 2 + 1;

    // Facing +Z (towards exterior forest & camera)
    indices.push(vBotA, vBotB, vTopA);
    indices.push(vTopA, vBotB, vTopB);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates the Subterranean Foundation Cutaway Face at Z = CUTAWAY_Z (1.82).
 * Extends from Y = -5.5 up to Y = 0 with sedimentary rock strata.
 */
function createSubterraneanCutawayGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nx = 40;
  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = MOUNTAIN_LEFT_X + u * (MOUNTAIN_RIGHT_X - MOUNTAIN_LEFT_X);

    // Bottom vertex (Y = -5.5)
    positions.push(x, -5.5, CUTAWAY_Z);
    uvs.push((x - MOUNTAIN_LEFT_X) / 4.0, 0);

    // Top vertex (Y = 0)
    positions.push(x, 0, CUTAWAY_Z);
    uvs.push((x - MOUNTAIN_LEFT_X) / 4.0, 5.5 / 4.0);
  }

  for (let ix = 0; ix < nx; ix++) {
    const vBotA = ix * 2;
    const vTopA = ix * 2 + 1;
    const vBotB = (ix + 1) * 2;
    const vTopB = (ix + 1) * 2 + 1;

    // Facing +Z (towards camera cutaway)
    indices.push(vBotA, vBotB, vTopA);
    indices.push(vTopA, vBotB, vTopB);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates the Towering Mountain Ridge Backdrop at Z = BACK_Z (-4.8).
 */
function createMountainBackdropGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nx = 36;
  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = MOUNTAIN_LEFT_X + u * (MOUNTAIN_RIGHT_X - MOUNTAIN_LEFT_X);

    const topY = mountainElevation(x, BACK_Z);

    positions.push(x, 0, BACK_Z);
    uvs.push((x - MOUNTAIN_LEFT_X) / 4.0, 0);

    positions.push(x, topY, BACK_Z);
    uvs.push((x - MOUNTAIN_LEFT_X) / 4.0, topY / 4.0);
  }

  for (let ix = 0; ix < nx; ix++) {
    const vBotA = ix * 2;
    const vTopA = ix * 2 + 1;
    const vBotB = (ix + 1) * 2;
    const vTopB = (ix + 1) * 2 + 1;

    // Facing +Z / inward
    indices.push(vBotA, vTopA, vBotB);
    indices.push(vTopA, vBotB, vTopB);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/** Deterministic PRNG helper for texture generation */
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Bakes a high-res continuous, seamless warm cave rock texture */
function createCaveRockTexture(): THREE.Texture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const rnd = mulberry32(42);

  // Base warm earthy rock tone matching reference video
  ctx.fillStyle = "#6e5845";
  ctx.fillRect(0, 0, size, size);

  // Broad organic mineral wash gradients
  const washes = [
    { color: "rgba(122, 98, 77, 0.45)", x: 200, y: 300, r: 400 },
    { color: "rgba(88, 68, 51, 0.55)", x: 700, y: 600, r: 450 },
    { color: "rgba(134, 108, 86, 0.40)", x: 800, y: 200, r: 350 },
    { color: "rgba(77, 60, 44, 0.50)", x: 300, y: 800, r: 400 },
    { color: "rgba(114, 90, 71, 0.35)", x: 500, y: 450, r: 500 },
  ];
  for (const w of washes) {
    const grad = ctx.createRadialGradient(w.x, w.y, 50, w.x, w.y, w.r);
    grad.addColorStop(0, w.color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizontal sedimentary rock strata (flowing smoothly across the entire cave)
  const strataCount = 20;
  for (let s = 0; s < strataCount; s++) {
    const y = (s / strataCount) * size;
    const bandHeight = size / strataCount;
    const tone =
      s % 2 === 0 ? "rgba(90, 70, 52, 0.35)" : "rgba(126, 102, 80, 0.28)";
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) {
      const wave =
        Math.sin((x / size) * Math.PI * 4 + s * 1.5) * 8 +
        Math.sin((x / size) * Math.PI * 8 + s * 3.0) * 4;
      ctx.lineTo(x, y + wave + bandHeight * 0.5);
    }
    ctx.lineTo(size, y + bandHeight);
    ctx.lineTo(0, y + bandHeight);
    ctx.closePath();
    ctx.fill();
  }

  // Fine organic rock grain and mineral speckles
  for (let i = 0; i < 4000; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    const pr = 0.8 + rnd() * 2.2;
    const isLight = rnd() > 0.55;
    ctx.fillStyle = isLight
      ? "rgba(220, 205, 185, 0.08)"
      : "rgba(20, 15, 10, 0.12)";
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Bakes a high-res seamless packed earth/dirt floor texture */
function createCaveFloorTexture(): THREE.Texture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const rnd = mulberry32(88);

  // Packed cave dirt base
  ctx.fillStyle = "#4a3e30";
  ctx.fillRect(0, 0, size, size);

  // Soft earth mottling
  for (let i = 0; i < 30; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 80 + rnd() * 160;
    const grad = ctx.createRadialGradient(x, y, 20, x, y, r);
    const col =
      rnd() > 0.5 ? "rgba(74, 62, 48, 0.4)" : "rgba(54, 44, 34, 0.5)";
    grad.addColorStop(0, col);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gravel and fine soil texture
  for (let i = 0; i < 5000; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    const pr = 0.6 + rnd() * 2.0;
    ctx.fillStyle =
      rnd() > 0.5
        ? "rgba(180, 160, 130, 0.09)"
        : "rgba(25, 20, 15, 0.15)";
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Reusable stylized alpine pine tree */
const PineTree: React.FC<{ x: number; y: number; z: number; scale: number }> = ({
  x,
  y,
  z,
  scale,
}) => (
  <group position={[x, y, z]} scale={scale}>
    {/* Trunk */}
    <mesh position={[0, 0.75, 0]}>
      <cylinderGeometry args={[0.09, 0.13, 1.5, 6]} />
      <meshStandardMaterial color="#3b2618" roughness={0.9} />
    </mesh>
    {/* Tiered Pine Foliage Cones */}
    <mesh position={[0, 1.8, 0]}>
      <coneGeometry args={[0.85, 1.3, 6]} />
      <meshStandardMaterial color="#223b28" roughness={0.8} />
    </mesh>
    <mesh position={[0, 2.5, 0]}>
      <coneGeometry args={[0.65, 1.1, 6]} />
      <meshStandardMaterial color="#294630" roughness={0.8} />
    </mesh>
    <mesh position={[0, 3.1, 0]}>
      <coneGeometry args={[0.45, 0.9, 6]} />
      <meshStandardMaterial color="#32543a" roughness={0.8} />
    </mesh>
  </group>
);

export const CaveDiorama: React.FC<CaveDioramaProps> = ({ frame }) => {
  // Day to night lighting transition
  const nightT = progress(frame, [BEATS.animalsNight - 30, BEATS.animalsNight + 30]);
  const skyColor = useMemo(() => {
    const c1 = new THREE.Color("#b8d2eb"); // bright overcast daytime sky
    const c2 = new THREE.Color("#141d2e"); // moonlit night
    return c1.lerp(c2, nightT);
  }, [nightT]);

  const exteriorLightIntensity = 1.45 * (1 - nightT * 0.7);

  // Geometries
  const cavernGeo = useMemo(() => createCavernGeometry(), []);
  const upperCutawayGeo = useMemo(() => createUpperCutawayGeometry(), []);
  const mountainSummitGeo = useMemo(() => createMountainSummitGeometry(), []);
  const exteriorCliffGeo = useMemo(() => createExteriorCliffGeometry(), []);
  const entranceSoffitGeo = useMemo(() => createEntranceSoffitGeometry(), []);
  const exteriorBackdropCliffGeo = useMemo(() => createExteriorBackdropCliffGeometry(), []);
  const subCutawayGeo = useMemo(() => createSubterraneanCutawayGeometry(), []);
  const mountainBackdropGeo = useMemo(() => createMountainBackdropGeometry(), []);

  // Baked seamless textures
  const caveRockTexture = useMemo(() => createCaveRockTexture(), []);
  const caveFloorTexture = useMemo(() => createCaveFloorTexture(), []);

  // Pine trees on exterior slope (X: -6.5 to -1.5, Y = 0, in front of the mountain cliff)
  const exteriorTrees = useMemo(() => {
    return [
      { x: -5.8, y: 0, z: -0.5, scale: 1.4 },
      { x: -4.5, y: 0, z: 0.8, scale: 1.1 },
      { x: -3.4, y: 0, z: -0.8, scale: 1.3 },
      { x: -3.2, y: 0, z: 1.3, scale: 0.95 },
      { x: -2.0, y: 0, z: -1.2, scale: 1.2 },
    ];
  }, []);

  // Majestic pine trees standing along the top of the Mountain Summit & Ridge
  const summitTrees = useMemo(() => {
    const rawTrees = [
      { x: -0.2, z: 0.6, scale: 1.15 },
      { x: 1.4, z: -0.5, scale: 1.35 },
      { x: 2.8, z: 0.4, scale: 1.2 },
      { x: 4.2, z: -0.6, scale: 1.4 },
      { x: 5.6, z: 0.2, scale: 1.18 },
      { x: 6.8, z: -0.8, scale: 1.25 },
      { x: -0.8, z: -1.6, scale: 1.3 },
      { x: 0.8, z: -2.6, scale: 1.45 },
      { x: 2.5, z: -3.2, scale: 1.6 },
      { x: 4.6, z: -2.8, scale: 1.5 },
      { x: -2.5, z: -3.2, scale: 1.4 },
      { x: -4.8, z: -3.0, scale: 1.5 },
      { x: -6.5, z: -2.8, scale: 1.35 },
    ];
    return rawTrees.map((t) => ({
      ...t,
      y: mountainElevation(t.x, t.z),
    }));
  }, []);

  // Boulders & rocky crags along mountain summit and plateau
  const summitBoulders = useMemo(() => {
    const rawBoulders = [
      { x: -0.5, z: 1.4, scale: 0.85, rot: [0.2, 0.4, 0] as [number, number, number] },
      { x: 1.2, z: 1.5, scale: 0.75, rot: [-0.1, 0.6, 0.2] as [number, number, number] },
      { x: 3.2, z: 1.45, scale: 0.8, rot: [0.3, -0.2, 0.1] as [number, number, number] },
      { x: 5.2, z: 1.5, scale: 0.85, rot: [-0.2, 0.3, -0.1] as [number, number, number] },
      { x: 6.9, z: 1.3, scale: 0.9, rot: [0.1, -0.4, 0.3] as [number, number, number] },
      { x: -0.7, z: -0.6, scale: 1.1, rot: [0.4, 0.2, -0.2] as [number, number, number] },
      { x: 1.8, z: -2.4, scale: 1.3, rot: [-0.3, 0.5, 0] as [number, number, number] },
      { x: 3.8, z: -3.0, scale: 1.4, rot: [0.2, -0.3, 0.4] as [number, number, number] },
      { x: -2.2, z: -2.4, scale: 1.25, rot: [0.1, 0.5, -0.3] as [number, number, number] },
      { x: -4.8, z: -2.4, scale: 1.35, rot: [-0.2, 0.3, 0.2] as [number, number, number] },
    ];
    return rawBoulders.map((b) => ({
      ...b,
      y: mountainElevation(b.x, b.z),
    }));
  }, []);

  // Falling rain outside (strictly X < CAVE_ENTRANCE_X)
  const rainDrops = useMemo(() => {
    const drops = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      drops.push({
        x: -7.5 + random(`rx-${i}`) * 6.5,
        z: -2.0 + random(`rz-${i}`) * 3.8,
        speed: 0.28 + random(`rs-${i}`) * 0.15,
        offsetY: random(`ry-${i}`) * 8.0,
        len: 0.35 + random(`rl-${i}`) * 0.2,
      });
    }
    return drops;
  }, []);

  return (
    <group>
      {/* Exterior Ambient & Directional Lights */}
      <ambientLight intensity={0.7} color={skyColor} />
      <directionalLight
        position={[-6, 12, 6]}
        intensity={exteriorLightIntensity}
        color={skyColor}
        castShadow={false}
      />
      {/* Daylight pouring in through entrance doorway & top vent gap */}
      <directionalLight
        position={[-8, 4.5, 0]}
        intensity={1.1 * (1 - nightT * 0.75)}
        color="#d8ebfa"
        castShadow={false}
      />

      {/* Front Fill Light to highlight 3D stone facets and textures */}
      <directionalLight
        position={[-2, 6, 8]}
        intensity={0.65}
        color="#c5d8ea"
        castShadow={false}
      />

      {/* Interior Ambient Fill Light (Soft warm bounce inside cave) */}
      <pointLight
        position={[3.0, 2.0, 0]}
        intensity={0.9}
        color="#ffd4aa"
        distance={12}
        decay={1.5}
      />

      {/* Exterior Overcast Sky Backdrop Plane */}
      <mesh position={[0, 6.0, -6.2]}>
        <planeGeometry args={[28, 16]} />
        <meshBasicMaterial color={skyColor} />
      </mesh>

      {/* Subterranean Foundation Solid Core (underground earth below Y = -0.10, completely avoids floor Z-fighting) */}
      <mesh position={[-0.3, -3.10, -1.52]}>
        <boxGeometry args={[16.0, 6.0, 6.56]} />
        <meshStandardMaterial color="#24170d" roughness={0.95} />
      </mesh>

      {/* SUBTERRANEAN FRONT CUTAWAY FACE (Stratified rock face from Y = -5.5 to 0 at Z = 1.82) */}
      <mesh geometry={subCutawayGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.92}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cave Floor Surface (Continuous packed dirt, non-tiled, X: -0.80 to 6.80) */}
      <mesh position={[3.0, 0.001, -0.165]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.6, 4.0]} />
        <meshStandardMaterial map={caveFloorTexture} roughness={0.92} />
      </mesh>

      {/* Exterior Ground Surface (Mossy Dirt in front of mountain cliff, X: -8.20 to -0.80) */}
      <mesh position={[-4.5, 0.001, -0.165]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 4.0]} />
        <meshStandardMaterial color="#4a422e" roughness={0.95} />
      </mesh>

      {/* SINGLE CONTINUOUS CURVED CAVE CAVERN (Zero 90-degree corners, seamless rock) */}
      <mesh geometry={cavernGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.9}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* SOLID MOUNTAIN UPPER CUTAWAY FACE (Flawlessly seals cave ceiling at Z = 1.82 up to summit) */}
      <mesh geometry={upperCutawayGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.9}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3D ORGANIC MOUNTAIN SUMMIT TERRAIN (Plateau & alpine ridge with rock strata) */}
      <mesh geometry={mountainSummitGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.92}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* SHEER MOUNTAIN CLIFF FACE ABOVE & AROUND CAVE ENTRANCE (At X = CLIFF_OUTER_X) */}
      <mesh geometry={exteriorCliffGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.9}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3D ROCKY ARCH SOFFIT (Solid 35-cm stone overhang underside of the Cave Mouth) */}
      <mesh geometry={entranceSoffitGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.9}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* TOWERING MOUNTAIN CLIFF WALL BEHIND EXTERIOR FOREST (At Z = -2.2) */}
      <mesh geometry={exteriorBackdropCliffGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.9}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Natural Rock Boulders & Crags Framing the Cave Mouth */}
      {/* 1. Massive Rear Buttress Crag nestled in the corner */}
      <mesh position={[-1.25, 1.2, -2.0]} scale={[0.55, 1.8, 0.55]} rotation={[0.2, 0.4, -0.1]}>
        <dodecahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial color="#504235" roughness={0.92} flatShading={true} />
      </mesh>
      {/* 2. Exterior Ground Boulder near Forest Left Path */}
      <mesh position={[-2.1, 0.35, -1.4]} scale={[0.85, 0.65, 0.75]} rotation={[0.3, 0.5, 0.1]}>
        <dodecahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial color="#524538" roughness={0.92} flatShading={true} />
      </mesh>
      {/* 3. Exterior Ground Boulder near Forest Right Path */}
      <mesh position={[-2.5, 0.25, 0.8]} scale={[0.8, 0.55, 0.7]} rotation={[-0.2, 0.4, 0.3]}>
        <dodecahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial color="#504336" roughness={0.92} flatShading={true} />
      </mesh>

      {/* TOWERING MOUNTAIN RIDGE BACKDROP (At Z = -4.8, sealing the horizon) */}
      <mesh geometry={mountainBackdropGeo}>
        <meshStandardMaterial
          map={caveRockTexture}
          roughness={0.92}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Alpine Pine Trees standing proudly on top of the Mountain Summit */}
      {summitTrees.map((t, idx) => (
        <PineTree key={`summit-tree-${idx}`} x={t.x} y={t.y} z={t.z} scale={t.scale} />
      ))}

      {/* Summit Rock Crags & Boulders along the mountain ridge */}
      {summitBoulders.map((b, idx) => (
        <mesh key={`summit-boulder-${idx}`} position={[b.x, b.y, b.z]} rotation={b.rot} scale={b.scale}>
          <dodecahedronGeometry args={[1.0, 0]} />
          <meshStandardMaterial color="#58483a" roughness={0.92} flatShading={true} />
        </mesh>
      ))}

      {/* Rocky boulder crags on the exterior forest slope */}
      <mesh position={[-4.5, 1.2, -1.2]} rotation={[0.2, 0.3, 0]}>
        <dodecahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial color="#554638" roughness={0.92} flatShading={true} />
      </mesh>
      <mesh position={[-5.8, 1.5, 0.8]} rotation={[-0.1, 0.4, 0.2]}>
        <dodecahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color="#504235" roughness={0.92} flatShading={true} />
      </mesh>

      {/* Exterior Forest Pine Trees */}
      {exteriorTrees.map((t, idx) => (
        <PineTree key={`ext-tree-${idx}`} x={t.x} y={t.y} z={t.z} scale={t.scale} />
      ))}

      {/* Exterior Rain Particles */}
      <group>
        {rainDrops.map((d, i) => {
          const y = ((d.offsetY - frame * d.speed) % 8.0 + 8.0) % 8.0;
          return (
            <mesh key={i} position={[d.x, y, d.z]}>
              <cylinderGeometry args={[0.012, 0.012, d.len, 3]} />
              <meshBasicMaterial color="#b8d4e8" transparent opacity={0.55} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};
