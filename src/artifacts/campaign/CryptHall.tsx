import type React from "react";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMasonry } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";
import { DioramaHall } from "../sets/DioramaHall";
import { HallDoor } from "../sets/HallDoor";
import { ChuteMouth } from "./ChuteMouth";

/**
 * Inside the crypt, as one cutaway: the Antechamber (the starting room every
 * party walks into, with four numbered doors to the four hallways) and, under
 * its floor, the Core Chamber (the Dungeon Core in the middle, the Mimic on the
 * left, your drawing table on the right). The four disposal chutes come down
 * inside the side walls from the hallways, run through the floor slab and empty
 * into one hopper above the Mimic.
 *
 * Layout constants are exported so bridge cameras and falling victims agree.
 */

export const ANTE: { x0: number; x1: number; ceilingY: number } = { x0: -9.6, x1: 9.6, ceilingY: 5.9 };
export const DOOR_XS = [-6, -2, 2, 6] as const;
export const CORE_FLOOR = -8;
export const CORE_CEILING = -2.2;
export const CORE_SPOT: Vec3 = [0, CORE_FLOOR, -0.8];
export const MIMIC_SPOT: Vec3 = [-5.4, CORE_FLOOR, -0.4];
export const TABLE_SPOT: Vec3 = [5.4, CORE_FLOOR, -0.4];
export const HOPPER: Vec3 = [-5.2, CORE_CEILING - 0.05, -0.4];
const FACE_Z = 1.15;
const PIPE_Z = FACE_Z + 0.32;
const PIPE_R = 0.3;

export type ChuteId = 0 | 1 | 2 | 3;
/** Chute centre-lines, door I..IV, from the top of the wall down to the hopper. */
export const CRYPT_CHUTES: Array<Array<[number, number]>> = [
  [[-10.6, 6.8], [-10.6, -0.9], [-10.0, -1.45], [-6.4, -1.45], [-5.7, -1.95]],
  [[-11.6, 6.8], [-11.6, -1.2], [-10.9, -1.9], [-6.3, -1.9], [-5.5, -2.1]],
  [[10.6, 6.8], [10.6, -0.9], [10.0, -1.45], [-3.9, -1.45], [-4.7, -1.95]],
  [[11.6, 6.8], [11.6, -1.2], [10.9, -1.9], [-4.1, -1.9], [-4.9, -2.1]],
];

const curves = CRYPT_CHUTES.map(
  (pts) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, PIPE_Z)), false, "catmullrom", 0.05)
);
/** Point along chute `id` at u in [0, 1]. */
export const cryptChutePoint = (id: ChuteId, u: number): Vec3 => {
  const p = curves[id].getPointAt(Math.min(1, Math.max(0, u)));
  return [p.x, p.y, p.z];
};
export const cryptChuteAngle = (id: ChuteId, u: number) => {
  const t = curves[id].getTangentAt(Math.min(1, Math.max(0, u)));
  return Math.atan2(t.y, t.x);
};

/** Open-fronted iron pipe along a chute, with brass collars. */
const Pipe: React.FC<{ id: ChuteId }> = ({ id }) => {
  const segs = useMemo(() => {
    const c = curves[id];
    const n = 70;
    return Array.from({ length: n }, (_, i) => {
      const a = c.getPointAt(i / n);
      const b = c.getPointAt((i + 1) / n);
      return {
        mid: [(a.x + b.x) / 2, (a.y + b.y) / 2, a.z] as Vec3,
        len: a.distanceTo(b) + 0.02,
        angle: Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2,
        ring: i % 7 === 0,
      };
    });
  }, [id]);
  return (
    <group>
      {segs.map((s, i) => (
        <group key={i} position={s.mid} rotation={[0, 0, s.angle]}>
          <mesh>
            <cylinderGeometry args={[PIPE_R, PIPE_R, s.len, 14, 1, true, Math.PI / 2, Math.PI]} />
            <meshStandardMaterial color="#5f6672" metalness={0.6} roughness={0.45} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.04]}>
            <cylinderGeometry args={[PIPE_R - 0.05, PIPE_R - 0.05, s.len, 10, 1, true, Math.PI / 2, Math.PI]} />
            <meshStandardMaterial color="#121318" roughness={1} side={THREE.BackSide} />
          </mesh>
          {s.ring ? (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[PIPE_R + 0.03, 0.04, 6, 16, Math.PI]} />
              <meshStandardMaterial color="#c99a3e" metalness={0.7} roughness={0.35} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
};

interface CryptHallProps {
  /** Frame each door I..IV swings open (absent = shut). */
  doorOpen?: number[];
  /** Frame each door's torch lights (absent = lit from the start). */
  doorLit?: number[];
  /** Frames the hopper above the Mimic gulps something down. */
  hopperGulps?: number[];
}

export const CryptHall: React.FC<CryptHallProps> = ({ doorOpen = [], doorLit = [], hopperGulps = [] }) => {
  const frame = useCurrentFrame();
  const masonry = useSurface("crypt-face", () => makeMasonry({ rows: 4, cols: 3, base: "#3a3b45", baseAlt: "#454654", mortar: "#16171c", seed: 213 }), [0.35, 0.35]);
  const coreWall = useSurface("crypt-core-wall", () => makeMasonry({ rows: 7, cols: 4, base: "#33303a", baseAlt: "#3d3946", mortar: "#141218", seed: 214 }), [5, 2]);
  const floor = useSurface("crypt-core-floor", () => makeFlagstone({ cells: 4, base: "#4b4752", baseAlt: "#57525e", grout: "#1a181e", seed: 215 }), [6, 1]);

  // Cut face of the crypt masonry with the two rooms open to the camera.
  const face = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-40, -30);
    shape.lineTo(40, -30);
    shape.lineTo(40, 30);
    shape.lineTo(-40, 30);
    shape.lineTo(-40, -30);
    const hole = (x0: number, x1: number, y0: number, y1: number) => {
      const h = new THREE.Path();
      h.moveTo(x0, y0);
      h.lineTo(x0, y1);
      h.lineTo(x1, y1);
      h.lineTo(x1, y0);
      h.lineTo(x0, y0);
      return h;
    };
    shape.holes.push(hole(ANTE.x0, ANTE.x1, -1.15, ANTE.ceilingY + 0.55));
    shape.holes.push(hole(ANTE.x0, ANTE.x1, CORE_FLOOR - 0.35, CORE_CEILING));
    return new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
  }, []);

  const coreMid = (CORE_FLOOR + CORE_CEILING) / 2;
  const coreH = CORE_CEILING - CORE_FLOOR;
  const width = ANTE.x1 - ANTE.x0;

  return (
    <group>
      {/* The Antechamber: the series hall, door at the left (stairs from the graveyard) */}
      <DioramaHall
        left={ANTE.x0}
        right={ANTE.x1}
        ceilingY={ANTE.ceilingY}
        exit="left"
        exitStyle="door"
        archX={null}
        pillarXs={[-8, -4, 0, 4, 8]}
        torchXs={[]}
        bannerColor="#3d2a5c"
      />
      {DOOR_XS.map((x, i) => (
        <HallDoor key={x} x={x} numeral={["I", "II", "III", "IV"][i]} openAt={doorOpen[i]} litAt={doorLit[i]} frame={frame} />
      ))}

      {/* The Core Chamber under the floor */}
      <mesh position={[0, coreMid, -2.5]} receiveShadow>
        <boxGeometry args={[width, coreH, 0.4]} />
        <meshStandardMaterial map={coreWall.map} normalMap={coreWall.normalMap} color="#a69fb6" roughness={0.95} />
      </mesh>
      <mesh position={[0, CORE_FLOOR - 0.15, -0.6]} receiveShadow>
        <boxGeometry args={[width, 0.3, 3.8]} />
        <meshStandardMaterial map={floor.map} normalMap={floor.normalMap} color="#bdb6c8" roughness={0.85} />
      </mesh>
      <mesh position={[0, CORE_CEILING + 0.2, -0.8]}>
        <boxGeometry args={[width, 0.4, 3.6]} />
        <meshStandardMaterial color="#25232b" roughness={1} />
      </mesh>
      {/* Rune circle around the core */}
      <mesh position={[CORE_SPOT[0], CORE_FLOOR + 0.01, CORE_SPOT[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.9, 2.05, 48]} />
        <meshBasicMaterial color="#9b6bff" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      {/* Wall sconces down here */}
      {[-8.4, -1.9, 1.9, 8.4].map((x) => (
        <group key={x} position={[x, CORE_CEILING - 1.2, -2.25]}>
          <GlowSprite color="#ff9933" size={1.1} opacity={0.55} />
          <pointLight position={[0, 0, 0.6]} color="#ff9a45" intensity={1.6} distance={6} decay={2} />
        </group>
      ))}

      {/* Cut masonry face around both rooms */}
      <mesh geometry={face} position={[0, 0, FACE_Z - 0.5]} receiveShadow>
        <meshStandardMaterial map={masonry.map} normalMap={masonry.normalMap} color="#b4b0c0" roughness={0.95} />
      </mesh>

      {/* Disposal chutes inside the walls, and the hopper over the Mimic */}
      {([0, 1, 2, 3] as ChuteId[]).map((id) => (
        <Pipe key={id} id={id} />
      ))}
      <ChuteMouth position={HOPPER} facing="down" radius={0.95} installFrame={-100} openFrame={-100} gulps={hopperGulps} />

      <hemisphereLight args={["#d9c8ff", "#2a2230", 0.35]} />
      <pointLight position={[0, ANTE.ceilingY - 1.2, 2.2]} color="#ffb26b" intensity={1.8} distance={14} decay={2} />
    </group>
  );
};
