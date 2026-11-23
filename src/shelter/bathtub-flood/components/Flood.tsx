import type React from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Blob, Block, LP, LowPolyLight, Prism, Wedge, matte } from "../../../lowpoly";
import { mix } from "../../tornado-shelter/components/Outdoors";
import {
  FLOOD_X,
  HELI_IN,
  HILL_FOOT,
  HILL_TOP,
  HILL_X0,
  HILL_X1,
  INT_X,
  INT_Y,
  LOG_HIT,
  LOG_LEN,
  LOG_SHOWN,
  L2B_START,
  POD_Z,
  SPOT_ON,
  heliPos,
  hillY,
  hullX,
  hullY,
  intShown,
  logX,
  storm,
  waveY,
} from "../timeline";
import { WaterSlab } from "./Water";

/** Sky, sun and fill, grey and dim in the storm, clearing for the finale. */
export const FloodLight: React.FC<{ frame: number; target: [number, number, number] }> = ({ frame, target }) => {
  const s = storm(frame);
  return (
    <group>
      <LowPolyLight
        target={target}
        bounds={16}
        sunIntensity={THREE.MathUtils.lerp(3.0, 1.3, s)}
        sunColor={mix("#fff2de", "#cfd8de", s)}
        sky={mix("#bcd0f2", "#8796a0", s)}
        ground={mix("#a3825f", "#56605e", s)}
        hemiIntensity={THREE.MathUtils.lerp(1.0, 0.9, s)}
      />
      <directionalLight position={[target[0] + 2, 8, -20]} intensity={0.8} color={mix("#dfe8f5", "#9aa6a8", s)} />
      <mesh position={[target[0], 0, 0]}>
        <sphereGeometry args={[150, 24, 12]} />
        <meshBasicMaterial color={mix("#c3d6e6", "#6b7a80", s)} side={THREE.BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
};

const rainMat = new THREE.MeshBasicMaterial({ color: "#dfe8ee", transparent: true, opacity: 0.45, depthWrite: false });
/** Rain streaks falling and slanting a little, around a centre point. Pure function of frame. */
export const Rain: React.FC<{ frame: number; center: [number, number, number]; amount: number }> = ({ frame, center, amount }) => {
  const n = Math.round(160 * amount);
  if (n <= 0) return null;
  return (
    <group position={center}>
      {Array.from({ length: n }, (_, i) => {
        const x = (random(`rx-${i}`) - 0.5) * 26;
        const z = (random(`rz-${i}`) - 0.5) * 14 - 1;
        const y = 12 - ((random(`ry-${i}`) * 14 + frame * 0.55) % 14);
        return (
          <mesh key={i} position={[x - y * 0.12, y - 1, z]} rotation={[0, 0, 0.12]} material={rainMat}>
            <boxGeometry args={[0.025, 0.55, 0.025]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** A drowned house: only the gable roof and the chimney poke out of the water. */
const DrownedRoof: React.FC<{ x: number; z: number; w: number; color: string; seed: number }> = ({ x, z, w, color, seed }) => (
  <group position={[x, -0.5, z]}>
    <Block size={[w, 0.7, 3]} position={[0, 0.1, 0]} color={seed % 2 ? LP.plasterWarm : LP.plaster} />
    <Wedge size={[w / 2, 1.5, 3.4]} position={[w / 4, 1.2, 0]} color={color} />
    <Wedge size={[w / 2, 1.5, 3.4]} position={[-w / 4, 1.2, 0]} rotation={[0, Math.PI, 0]} color={color} />
    {seed % 3 === 0 && <Block size={[0.4, 1.1, 0.4]} position={[w * 0.25, 1.9, -0.6]} color={LP.stoneDark} />}
  </group>
);

/** A tree up to its crown in water. */
const DrownedTree: React.FC<{ x: number; z: number; s: number; seed: number }> = ({ x, z, s, seed }) => (
  <group position={[x, 0, z]} scale={[s, s, s]}>
    <Prism r={0.12} h={1.2} position={[0, 0.3, 0]} color={LP.woodDark} />
    <Blob r={0.9} seed={seed} position={[0, 1.3, 0]} color={seed % 2 ? LP.leaf : LP.grassDark} />
  </group>
);

/** The hill road out of the water: a ramp of earth with a road and a fence, a flat top. */
const Hill: React.FC = () => {
  const run = HILL_X1 - HILL_X0;
  const rise = HILL_TOP - HILL_FOOT;
  const mid: [number, number] = [(HILL_X0 + HILL_X1) / 2, (HILL_TOP + HILL_FOOT) / 2];
  return (
    <group>
      {/* One smooth ramp (tall at +x) on a block of earth, the road laid along its face */}
      <Wedge size={[run, rise, 9]} position={[mid[0], mid[1], -2]} rotation={[0, Math.PI, 0]} color={LP.grass} castShadow={false} />
      <Block size={[run, 2.4, 9]} position={[mid[0], HILL_FOOT - 1.2, -2]} color={LP.grassDark} castShadow={false} />
      <Block size={[Math.hypot(run, rise), 0.06, 1.6]} position={[mid[0], mid[1] + 0.03, POD_Z + 0.1]} rotation={[0, 0, Math.atan2(rise, run)]} color="#7b7f7b" castShadow={false} />
      {/* The plateau */}
      <Block size={[16, HILL_TOP + 3, 12]} position={[HILL_X1 + 8, (HILL_TOP - 3) / 2, -2]} color={LP.grass} castShadow={false} />
      <Block size={[16, 0.06, 1.6]} position={[HILL_X1 + 8, HILL_TOP + 0.02, POD_Z + 0.1]} color="#7b7f7b" castShadow={false} />
      {/* A fence along the road, and a sign at the top */}
      {Array.from({ length: 10 }, (_, i) => {
        const x = HILL_X0 + 0.5 + i * 1.3;
        return <Block key={i} size={[0.1, 0.7, 0.1]} position={[x, hillY(Math.min(x, HILL_X1)) + 0.35, POD_Z - 1.1]} color={LP.wood} />;
      })}
      <group position={[HILL_X1 + 5.5, HILL_TOP, -1.5]}>
        <Prism r={0.06} h={1.6} position={[0, 0.8, 0]} color={LP.woodDark} />
        <Block size={[1.3, 0.6, 0.08]} position={[0, 1.6, 0]} color="#2f7a4a" />
      </group>
      {Array.from({ length: 5 }, (_, i) => (
        <DrownedTree key={i} x={HILL_X1 + 2 + i * 2.6} z={-4.5 - (i % 2) * 1.5} s={1.4} seed={40 + i} />
      ))}
    </group>
  );
};

/** The helicopter: body, tail boom, spinning rotor, and its searchlight on the pod. */
const Helicopter: React.FC<{ frame: number }> = ({ frame }) => {
  const [x, y, z] = heliPos(frame);
  const beam = frame >= SPOT_ON;
  const target: [number, number, number] = [hullX(frame), hullY(frame) + 1, POD_Z];
  const dx = target[0] - x;
  const dy = target[1] - y;
  const dz = target[2] - z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  return (
    <group>
      <group position={[x, y, z]} rotation={[0, 0, 0.08]}>
        <Block size={[2.0, 1.0, 1.0]} color="#e8e4da" bevel={0.3} />
        <Block size={[0.9, 0.6, 1.02]} position={[0.55, 0.05, 0]} material={matte("#26343c", { rough: 0.2 })} castShadow={false} />
        <Block size={[2.0, 0.18, 0.18]} position={[-1.8, 0.15, 0]} color="#e8e4da" />
        <Block size={[0.12, 0.7, 0.12]} position={[-2.7, 0.4, 0]} color="#c4473d" />
        <Block size={[2.0, 0.18, 0.18]} position={[0, 0.2, 0]} color="#c4473d" castShadow={false} />
        <Prism r={0.08} h={0.3} position={[0, 0.65, 0]} color={LP.steel} />
        {[0, 1].map((k) => (
          <Block key={k} size={[5, 0.04, 0.22]} position={[0, 0.82, 0]} rotation={[0, frame * 0.9 + (k * Math.PI) / 2, 0]} color="#3a3f46" castShadow={false} />
        ))}
        {[-0.4, 0.4].map((dz2) => (
          <Block key={dz2} size={[1.8, 0.06, 0.06]} position={[0, -0.7, dz2]} color="#3a3f46" castShadow={false} />
        ))}
      </group>
      {beam && (
        <mesh position={[(x + target[0]) / 2, (y + target[1]) / 2, (z + target[2]) / 2]} quaternion={q}>
          <coneGeometry args={[1.1, len, 18, 1, true]} />
          <meshBasicMaterial color="#fff6d0" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
      {beam && <pointLight position={[target[0], target[1] + 1.2, target[2] + 0.8]} color="#fff2c4" intensity={6} distance={5} decay={1.5} />}
    </group>
  );
};

/** The floating log that rams the pod in L4b. */
const Log: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < LOG_SHOWN[0] || frame >= LOG_SHOWN[1]) return null;
  const x = logX(frame);
  const y = waveY(x, POD_Z, frame) + 0.14;
  const roll = frame < LOG_HIT ? frame * 0.08 : LOG_HIT * 0.08;
  return (
    <group position={[x, y, POD_Z + 0.1]} rotation={[roll, 0, 0.05 * Math.sin(frame * 0.2)]}>
      <Prism r={0.32} h={LOG_LEN} sides={8} rotation={[0, 0, Math.PI / 2]} color="#6e4a2c" />
      <Prism r={0.24} h={0.04} sides={8} position={[LOG_LEN / 2 + 0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#c99a5f" castShadow={false} />
      <Block size={[0.6, 0.12, 0.12]} position={[-0.4, 0.3, 0.1]} rotation={[0, 0, 0.6]} color="#6e4a2c" castShadow={false} />
    </group>
  );
};

/** The open flood (x ≈ FLOOD_X): water, rooftops, trees, the hill road, the log and the helicopter. */
export const FloodSet: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < L2B_START - 2) return null;
  const roofs = [
    { x: -12, z: -9, w: 4.2, c: "#6b7480" },
    { x: -6, z: -14, w: 5, c: "#8e5428" },
    { x: -1.5, z: -8, w: 3.6, c: "#5c7fa3" },
    { x: 4.5, z: -12, w: 4.6, c: "#6b7480" },
    { x: -9, z: -20, w: 5.5, c: "#8e5428" },
    { x: 2, z: -22, w: 5, c: "#6b7480" },
  ];
  return (
    <group>
      <WaterSlab frame={frame} x={[FLOOD_X - 40, HILL_X1 + 1]} z={[-40, 45]} level={0} bottom={-3} wave={(x, z) => waveY(x, z, frame)} seg={[110, 34]} front={false} />
      {roofs.map((r, i) => (
        <DrownedRoof key={i} x={FLOOD_X + r.x} z={r.z} w={r.w} color={r.c} seed={i} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <DrownedTree key={i} x={FLOOD_X - 18 + i * 3.4 + random(`tx-${i}`) * 1.5} z={-4.5 - random(`tz-${i}`) * 6} s={0.9 + random(`ts-${i}`) * 0.5} seed={20 + i} />
      ))}
      {/* Power poles leaning in the current */}
      {[-14, -5, 5].map((dx, i) => (
        <group key={i} position={[FLOOD_X + dx, -0.5, -3.2]} rotation={[0, 0, (i - 1) * 0.08]}>
          <Prism r={0.09} h={5} position={[0, 2.5, 0]} color={LP.woodDark} />
          <Block size={[1.2, 0.1, 0.1]} position={[0, 4.6, 0]} color={LP.woodDark} />
        </group>
      ))}
      <Hill />
      <Log frame={frame} />
      {frame >= HELI_IN[0] && <Helicopter frame={frame} />}
    </group>
  );
};

/** A dark, rain-grey backdrop around the inside-of-the-pod set (it floats in a void otherwise). */
export const InsideBackdrop: React.FC<{ frame: number }> = ({ frame }) => {
  if (!intShown(frame)) return null;
  return (
    <group position={[INT_X, INT_Y, 0]}>
      <mesh position={[0, 1, -3]}>
        <planeGeometry args={[30, 20]} />
        <meshBasicMaterial color="#25333a" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3, 4]} color="#dfe8f5" intensity={8} distance={12} decay={1.4} />
    </group>
  );
};
