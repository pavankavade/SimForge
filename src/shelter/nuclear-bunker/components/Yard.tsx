import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { useSurface } from "../../../engine/materials";
import { makeEarth, makeLawn, makeWood } from "../../../engine/textures";
import {
  GROUND_Y,
  HOUSE_X,
  HOUSE_Z,
  PIT_BACK_Z,
  PIT_FLOOR,
  PIT_X0,
  PIT_X1,
  TUBE_BACK_Z,
  TUBE_R,
  TUBE_X,
  TUBE_Y,
  digDepth,
  faceOpenings,
  pitFillY,
  type Opening,
} from "../timeline";

const W = 40;
const BOTTOM = -40;
const TURF = 0.22;
const YARD_BACK = -32;

const EARTH = ["#7a4a2c", "#8c5a34", "#6a4026", "#9a6a40", "#5e3a24"];
const FILL_EARTH = ["#8a5a36", "#7a4c2e", "#946640", "#6e4428"];

/**
 * The cut face as horizontal slices: each row of the face skips the x-ranges
 * that are dug out (pit, pipe mouth, shafts, tunnels), so openings can grow
 * frame by frame and anything behind them shows through.
 */
const sliceFace = (rects: Opening[], tube: boolean, yTop: number, yBottom: number) => {
  const ys = new Set<number>([yTop, yBottom]);
  for (const r of rects) {
    if (r.y0 < yTop && r.y0 > yBottom) ys.add(r.y0);
    if (r.y1 < yTop && r.y1 > yBottom) ys.add(r.y1);
  }
  if (tube) {
    for (let y = TUBE_Y - TUBE_R; y <= TUBE_Y + TUBE_R; y += 0.05) if (y < yTop && y > yBottom) ys.add(y);
  }
  const rows = Array.from(ys).sort((a, b) => b - a);
  const pos: number[] = [];
  const uv: number[] = [];
  const quad = (x0: number, x1: number, ya: number, yb: number) => {
    pos.push(x0, yb, 0, x1, yb, 0, x1, ya, 0, x0, yb, 0, x1, ya, 0, x0, ya, 0);
    uv.push(x0, yb, x1, yb, x1, ya, x0, yb, x1, ya, x0, ya);
  };
  for (let i = 0; i < rows.length - 1; i++) {
    const ya = rows[i];
    const yb = rows[i + 1];
    const mid = (ya + yb) / 2;
    const holes: Array<[number, number]> = [];
    for (const r of rects) if (mid > r.y0 && mid < r.y1) holes.push([r.x0, r.x1]);
    if (tube) {
      // Narrowest chord in the row, so dirt laps over the pipe's rim, never a gap.
      const far = Math.max(Math.abs(ya - TUBE_Y), Math.abs(yb - TUBE_Y));
      if (far < TUBE_R) {
        const c = Math.sqrt(TUBE_R ** 2 - far ** 2);
        holes.push([TUBE_X - c, TUBE_X + c]);
      }
    }
    holes.sort((a, b) => a[0] - b[0]);
    let x = -W;
    for (const [h0, h1] of holes) {
      if (h0 > x) quad(x, h0, ya, yb);
      x = Math.max(x, h1);
    }
    if (x < W) quad(x, W, ya, yb);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};

/**
 * The yard as a cutaway: lawn on top, layered soil face at z = 0 with the pit
 * notch Dad digs, the pit's walls, and the dirt that later fills it around the
 * steel pipe. Behind: the house, a fence, trees and a hedge.
 */
export const Yard: React.FC<{ frame: number }> = ({ frame }) => {
  const earth = useSurface("nb-earth", () => makeEarth({ layers: EARTH, seed: 61 }), [0.34, 0.34]);
  const pitEarth = useSurface("nb-earth", () => makeEarth({ layers: EARTH, seed: 61 }), [0.55, 0.55]);
  const fillEarth = useSurface("nb-fill", () => makeEarth({ layers: FILL_EARTH, seed: 7 }), [0.45, 0.45]);
  const turfSurf = useSurface("nb-lawn", () => makeLawn({}), [0.5, 0.5]);
  const lawn = useSurface("nb-lawn", () => makeLawn({}), [0.12, 0.08]);
  const wood = useSurface("nb-fence", () => makeWood({}), [1, 1]);

  const depth = digDepth(frame);
  const notchY = THREE.MathUtils.lerp(-TURF, PIT_FLOOR, depth);
  const open = depth > 0.001;
  const fillY = pitFillY(frame);
  const { rects, tube } = faceOpenings(frame);
  const piped = tube;
  const filled = fillY > PIT_FLOOR + 1e-3;
  const fillTop = Math.round(fillY * 40) / 40;
  // Rebuilt only when an opening changes.
  const key = JSON.stringify(rects.map((r) => [r.x0, r.x1, r.y0, r.y1].map((v) => Math.round(v * 50)))) + tube;
  const face = useMemo(() => sliceFace(rects, tube, -TURF, BOTTOM), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const turf = useMemo(() => sliceFace(rects, false, 0, -TURF), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Top of the fill: full width, or two strips beside the buried pipe.
  const fillTopStrips: Array<[number, number, number, number]> = [];
  if (filled) {
    const dy = fillTop - TUBE_Y;
    if (piped && Math.abs(dy) < TUBE_R) {
      const c = Math.sqrt(TUBE_R ** 2 - dy ** 2);
      fillTopStrips.push([PIT_X0, TUBE_X - c, 0, PIT_BACK_Z], [TUBE_X + c, PIT_X1, 0, PIT_BACK_Z]);
      fillTopStrips.push([TUBE_X - c, TUBE_X + c, TUBE_BACK_Z, PIT_BACK_Z]);
    } else {
      fillTopStrips.push([PIT_X0, PIT_X1, 0, PIT_BACK_Z]);
    }
  }

  const grassMat = <meshStandardMaterial {...lawn} color="#ffffff" roughness={0.95} />;
  const turfSide = <meshStandardMaterial color="#3f7d2c" roughness={1} />;

  return (
    <group>
      {/* Soil face (z = 0) and its turf band, with every dug opening cut out */}
      <mesh geometry={face} receiveShadow>
        <meshStandardMaterial {...earth} roughness={1} />
      </mesh>
      <mesh geometry={turf} position={[0, 0, 0.001]}>
        <meshStandardMaterial {...turfSurf} color="#7fae5a" roughness={1} />
      </mesh>

      {/* Lawn, with a gap over the pit while it is open */}
      {[
        [-W, PIT_X0, 0, YARD_BACK],
        [PIT_X1, W, 0, YARD_BACK],
        [PIT_X0, PIT_X1, open ? PIT_BACK_Z : 0, YARD_BACK],
      ].map(([x0, x1, z0, z1], i) => (
        <group key={i}>
          <mesh position={[(x0 + x1) / 2, GROUND_Y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[x1 - x0, z0 - z1]} />
            {grassMat}
          </mesh>
        </group>
      ))}

      {/* Pit walls and floor while it is open */}
      {open ? (
        <group>
          {[
            [PIT_X0, Math.PI / 2],
            [PIT_X1, -Math.PI / 2],
          ].map(([x, ry]) => (
            <mesh key={x} position={[x, (notchY - TURF) / 2, PIT_BACK_Z / 2]} rotation={[0, ry, 0]} receiveShadow>
              <planeGeometry args={[-PIT_BACK_Z, -TURF - notchY]} />
              <meshStandardMaterial {...pitEarth} color="#b8a898" roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, (notchY - TURF) / 2, PIT_BACK_Z]} receiveShadow>
            <planeGeometry args={[PIT_X1 - PIT_X0, -TURF - notchY]} />
            <meshStandardMaterial {...pitEarth} color="#a89888" roughness={1} />
          </mesh>
          <mesh position={[0, notchY, PIT_BACK_Z / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[PIT_X1 - PIT_X0, -PIT_BACK_Z]} />
            <meshStandardMaterial {...pitEarth} color="#8a7a6a" roughness={1} />
          </mesh>
          {/* Turf lip around the hole */}
          {[PIT_X0, PIT_X1].map((x) => (
            <mesh key={x} position={[x, -TURF / 2, PIT_BACK_Z / 2]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <planeGeometry args={[-PIT_BACK_Z, TURF]} />
              {turfSide}
            </mesh>
          ))}
        </group>
      ) : null}

      {/* Top of the dirt in the pit: the cave-in, then the burial over the pipe */}
      {fillTopStrips.map(([x0, x1, z0, z1], i) => (
        <mesh key={i} position={[(x0 + x1) / 2, Math.min(fillTop, -0.004), (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[x1 - x0, z0 - z1]} />
          {fillTop > -0.05 ? grassMat : <meshStandardMaterial {...fillEarth} color="#c8a888" roughness={1} />}
        </mesh>
      ))}

      <House />
      {/* Fence along the back of the yard */}
      <group position={[0, 0, -10]}>
        {Array.from({ length: 34 }, (_, i) => -20 + i * 1.25).map((x) => (
          <mesh key={x} position={[x, 0.55, 0]} castShadow>
            <boxGeometry args={[0.14, 1.1, 0.14]} />
            <meshStandardMaterial {...wood} color="#a8784a" roughness={0.9} />
          </mesh>
        ))}
        {[0.35, 0.85].map((y) => (
          <mesh key={y} position={[0, y, 0.05]} castShadow>
            <boxGeometry args={[42, 0.12, 0.06]} />
            <meshStandardMaterial {...wood} color="#b8885a" roughness={0.9} />
          </mesh>
        ))}
      </group>
      {/* Trees and a hedge */}
      {[
        [-9.5, -12, 1.2],
        [13, -16, 1.4],
        [-12, -15, 1.3],
      ].map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.26, 2.4, 10]} />
            <meshStandardMaterial color="#6b4a2e" roughness={1} />
          </mesh>
          {[
            [0, 3.1, 0, 1.4],
            [0.8, 2.6, 0.2, 1],
            [-0.75, 2.7, -0.1, 1.05],
          ].map(([cx, cy, cz, r], j) => (
            <mesh key={j} position={[cx, cy, cz]} castShadow>
              <sphereGeometry args={[r, 18, 14]} />
              <meshStandardMaterial color={j % 2 ? "#3f8a36" : "#4a9a3c"} roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: 16 }, (_, i) => -30 + i * 4).map((x, i) => (
        <mesh key={x} position={[x, 0.9, -21 - (i % 2) * 0.6]} scale={[1.6, 1, 1]}>
          <sphereGeometry args={[1.5, 16, 12]} />
          <meshStandardMaterial color={i % 2 ? "#2f6a2c" : "#367a32"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

/** A two-storey suburban house with siding, a red roof, shutters and a porch light. */
const House: React.FC = () => {
  const siding = useSurface("nb-siding", () => makeWood({ base: "#e9e4d8", seed: 5 }), [3, 6]);
  const w = 8;
  const h = 4.6;
  const d = 5;
  return (
    <group position={[HOUSE_X, 0, HOUSE_Z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...siding} roughness={0.85} />
      </mesh>
      {/* Gable roof */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, h + 0.95, s * (d / 4 + 0.15)]} rotation={[s * -0.65, 0, 0]} castShadow>
          <boxGeometry args={[w + 0.6, 0.18, d / 2 + 0.75]} />
          <meshStandardMaterial color="#b8442e" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.62, 0]}>
        <boxGeometry args={[w - 0.02, 1.25, 0.02]} />
        <meshStandardMaterial color="#e9e4d8" />
      </mesh>
      <mesh position={[2.4, h + 1.4, -0.6]} castShadow>
        <boxGeometry args={[0.6, 1.8, 0.6]} />
        <meshStandardMaterial color="#8a7a70" roughness={0.9} />
      </mesh>
      {/* Windows with shutters, two rows, and the front door */}
      {[-2.8, -1.2, 1.2, 2.8].map((x) =>
        [1.4, 3.3].map((y) => (
          <group key={`${x}-${y}`} position={[x, y, d / 2 + 0.02]}>
            <mesh>
              <boxGeometry args={[0.95, 1.15, 0.06]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <boxGeometry args={[0.78, 0.98, 0.04]} />
              <meshStandardMaterial color="#5a86b8" roughness={0.2} metalness={0.1} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.68, 0, 0.02]}>
                <boxGeometry args={[0.32, 1.15, 0.05]} />
                <meshStandardMaterial color="#2c4f86" roughness={0.7} />
              </mesh>
            ))}
          </group>
        )),
      )}
      <mesh position={[0, 1.05, d / 2 + 0.03]}>
        <boxGeometry args={[1.1, 2.1, 0.06]} />
        <meshStandardMaterial color="#2c4f86" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, d / 2 + 0.6]} receiveShadow>
        <boxGeometry args={[2.2, 0.16, 1.2]} />
        <meshStandardMaterial color="#b0a89c" roughness={1} />
      </mesh>
    </group>
  );
};
