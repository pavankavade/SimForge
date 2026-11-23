import type React from "react";
import * as THREE from "three";
import { Block, LP, Prism, matte, steel } from "../../../lowpoly";
import { mix } from "../../tornado-shelter/components/Outdoors";
import { LID_H, TUB_FLOOR, TUB_H, TUB_L, TUB_W, TUB_WALL } from "../timeline";
import { DryMask } from "./Water";

const ENAMEL = "#eef1f2";
const YELLOW = "#f2c230";
const IRON = "#3b4048";
const gasketMat = (flash: number) => matte(mix("#1d1f22", "#ffd84d", flash), flash > 0 ? { emissive: "#ffb000", emissiveIntensity: flash * 0.6 } : {});

/**
 * The bathtub and, level by level, the pod it becomes. Origin at the middle of
 * the hull bottom; long axis on x. Builds stack up: `lid` (0..1 drops it on),
 * `keel` (0..1 slides the iron weight up), `vents` (0..1 pops the snorkels),
 * `paint` (0..1 white -> yellow). `open` hulls get a DryMask at the rim.
 */
export const Hull: React.FC<{
  frame: number;
  lid?: number;
  gasket?: number;
  keel?: number;
  bolts?: number;
  vents?: number;
  valve?: number;
  paint?: number;
  beacon?: boolean;
  feet?: boolean;
  pipe?: boolean;
  mask?: boolean;
}> = ({ frame, lid = 0, gasket = 0, keel = 0, bolts = 0, vents = 0, valve = 0, paint = 0, beacon = false, feet = false, pipe = false, mask = true }) => {
  const color = mix(ENAMEL, YELLOW, paint);
  const body = matte(color, { rough: 0.45 });
  const inner = matte(mix("#dfe5e7", "#e9c254", paint), { rough: 0.5 });
  const L = TUB_L;
  const W = TUB_W;
  const H = TUB_H;
  const t = TUB_WALL;
  const lidOn = lid > 0;
  // The lid drops from above with an overshoot.
  const lidY = H + (1 - lid) * 2.4 - Math.sin(Math.min(1, lid) * Math.PI) * 0.06;
  return (
    <group>
      {/* Hull: floor slab and four walls, rounded ends */}
      <Block size={[L - 0.1, TUB_FLOOR, W - 0.1]} position={[0, TUB_FLOOR / 2, 0]} material={body} bevel={0.06} />
      <Block size={[L, H, t]} position={[0, H / 2, -W / 2 + t / 2]} material={body} bevel={0.05} />
      <Block size={[L, H, t]} position={[0, H / 2, W / 2 - t / 2]} material={body} bevel={0.05} />
      <Block size={[t * 1.6, H, W]} position={[-L / 2 + t * 0.8, H / 2, 0]} material={body} bevel={0.07} />
      <Block size={[t * 1.6, H, W]} position={[L / 2 - t * 0.8, H / 2, 0]} material={body} bevel={0.07} />
      {/* Inner face of the floor, a shade darker, and the rolled rim */}
      <Block size={[L - 0.4, 0.02, W - 0.3]} position={[0, TUB_FLOOR + 0.01, 0]} material={inner} castShadow={false} />
      <Block size={[L + 0.08, 0.08, W + 0.08]} position={[0, H - 0.04, 0]} material={body} bevel={0.04} castShadow={false} />
      {/* Drain and the chrome tap at the left end */}
      <Prism r={0.07} h={0.02} position={[-L / 2 + 0.45, TUB_FLOOR + 0.02, 0]} material={steel("#9aa3ab")} castShadow={false} />
      {!lidOn && (
        <group position={[-L / 2 + 0.12, H + 0.12, 0]}>
          <Prism r={0.05} h={0.24} material={steel("#c9d1d8")} castShadow={false} />
          <Block size={[0.22, 0.06, 0.07]} position={[0.1, 0.12, 0]} material={steel("#c9d1d8")} castShadow={false} />
        </group>
      )}
      {/* Claw feet (in the house) */}
      {feet &&
        [-1, 1].map((sx) =>
          [-1, 1].map((sz) => <Block key={`${sx}${sz}`} size={[0.16, 0.14, 0.16]} position={[sx * (L / 2 - 0.35), -0.06, sz * (W / 2 - 0.2)]} color="#c8b48a" bevel={0.05} />)
        )}
      {/* The torn-off drain pipe dangling under the freed tub */}
      {pipe && keel === 0 && (
        <group position={[-L / 2 + 0.45, 0, 0]} rotation={[0, 0, 0.25 * Math.sin(frame * 0.2)]}>
          <Block size={[0.09, 0.45, 0.09]} position={[0, -0.22, 0]} material={steel("#8e979f")} castShadow={false} />
        </group>
      )}
      {mask && !lidOn && <DryMask size={[L - 2 * t, W - 2 * t]} position={[0, H - 0.02, 0]} />}

      {/* L3: the lid, a second shell upside down on top, sealed with a black gasket */}
      {lidOn && (
        <group position={[0, lidY, 0]}>
          <Block size={[L, LID_H, W]} position={[0, LID_H / 2, 0]} material={body} bevel={0.32} />
          <Block size={[L + 0.1, 0.09, W + 0.1]} position={[0, 0.02, 0]} material={gasketMat(gasket)} bevel={0.04} castShadow={false} />
          {/* Porthole on the camera side */}
          <Prism r={0.2} h={0.05} sides={10} position={[0, LID_H * 0.45, W / 2 - 0.01]} rotation={[Math.PI / 2, 0, 0]} material={matte("#1d3440", { rough: 0.2 })} castShadow={false} />
          <Prism r={0.25} h={0.04} sides={10} position={[0, LID_H * 0.45, W / 2 - 0.03]} rotation={[Math.PI / 2, 0, 0]} material={steel("#aab3bb")} castShadow={false} />
          {/* L5: two snorkel vents with float-ball valves in cages */}
          {vents > 0 &&
            [-0.75, 0.75].map((dx, i) => (
              <group key={i} position={[dx, LID_H - 0.06, 0]} scale={[1, Math.max(0.01, vents), 1]}>
                <Prism r={0.09} h={0.5} position={[0, 0.25, 0]} material={steel("#8e979f")} />
                <Prism r={0.15} h={0.04} position={[0, 0.5, 0]} material={steel("#8e979f")} castShadow={false} />
                {[0, 1, 2, 3].map((k) => (
                  <Block key={k} size={[0.025, 0.26, 0.025]} position={[Math.cos((k * Math.PI) / 2) * 0.13, 0.63, Math.sin((k * Math.PI) / 2) * 0.13]} material={steel("#8e979f")} castShadow={false} />
                ))}
                <Prism r={0.15} h={0.03} position={[0, 0.77, 0]} material={steel("#8e979f")} castShadow={false} />
                {/* The ball rises to seal the pipe when a wave washes over */}
                <mesh position={[0, 0.6 + valve * 0.12, 0]} material={matte(LP.red, { rough: 0.4 })}>
                  <icosahedronGeometry args={[0.09, 1]} />
                </mesh>
              </group>
            ))}
          {/* L5c: a blinking beacon */}
          {beacon && (
            <group position={[0, LID_H - 0.04, -0.3]}>
              <Prism r={0.07} h={0.12} position={[0, 0.06, 0]} material={steel()} castShadow={false} />
              <mesh position={[0, 0.17, 0]}>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshBasicMaterial color={Math.floor(frame / 8) % 2 ? "#ff5a2a" : "#7a2a18"} toneMapped={false} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* L4: the iron keel, slid up under the hull and bolted on */}
      {keel > 0 && (
        <group position={[0, -0.32 - (1 - keel) * 1.6, 0]}>
          <Block size={[L * 0.62, 0.42, 0.5]} position={[0, 0.0, 0]} color={IRON} bevel={0.1} />
          <Block size={[L * 0.4, 0.22, 0.22]} position={[0, 0.27, 0]} color={IRON} bevel={0.05} castShadow={false} />
          {[-0.6, 0, 0.6].filter((_, k) => bolts > k).map((dx, k) => (
            <Prism key={k} r={0.06} h={0.08} sides={6} position={[dx, 0.4, 0.26]} material={steel("#c9d1d8")} castShadow={false} />
          ))}
        </group>
      )}
    </group>
  );
};

const padMat = matte("#c4473d", { rough: 0.7 });
const beltMat = matte("#f2c230", { rough: 0.6 });

/**
 * The inside of the pod, as a cutaway (no front wall): the hull, the lid's
 * ceiling, the porthole looking out at the water, and the L4c seats / L5a
 * air gauge. Origin at the hull bottom centre, like `Hull`.
 */
export const PodInside: React.FC<{ frame: number; seats: number; belts: number; air: number; paint: number }> = ({ frame, seats, belts, air, paint }) => {
  const body = matte(mix("#e9ecee", "#f2c230", paint * 0.6), { rough: 0.5 });
  const shell = matte(mix("#d7dcdf", "#d8ad35", paint * 0.6), { rough: 0.55 });
  const L = TUB_L;
  const W = TUB_W;
  const H = TUB_H + LID_H;
  const t = TUB_WALL;
  // The gauge needle: from green (left) to red (right) as the air goes stale.
  const needle = THREE.MathUtils.lerp(0.9, -0.9, 1 - air) + 0.03 * Math.sin(frame * 0.6) * (1 - air);
  return (
    <group>
      <Block size={[L, TUB_FLOOR, W]} position={[0, TUB_FLOOR / 2, 0]} material={body} bevel={0.06} />
      <Block size={[L, H, t]} position={[0, H / 2, -W / 2 + t / 2]} material={shell} bevel={0.05} />
      <Block size={[t * 1.6, H, W]} position={[-L / 2 + t * 0.8, H / 2, 0]} material={body} bevel={0.07} />
      <Block size={[t * 1.6, H, W]} position={[L / 2 - t * 0.8, H / 2, 0]} material={body} bevel={0.07} />
      <Block size={[L, t, W]} position={[0, H - t / 2, 0]} material={body} bevel={0.05} />
      {/* The seam where the lid meets the tub, with its gasket */}
      <Block size={[L - 0.1, 0.06, 0.03]} position={[0, TUB_H, -W / 2 + t + 0.01]} color="#1d1f22" castShadow={false} />
      {/* Porthole in the back wall: murky water outside */}
      <group position={[0, TUB_H + 0.38, -W / 2 + t + 0.02]}>
        <Prism r={0.26} h={0.04} sides={12} rotation={[Math.PI / 2, 0, 0]} material={steel("#aab3bb")} castShadow={false} />
        <Prism r={0.2} h={0.05} sides={12} position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]} material={matte("#4d6b6a", { emissive: "#2c4a4c", emissiveIntensity: 0.4 })} castShadow={false} />
      </group>
      {/* L5a: the air gauge, needle sweeping into the red */}
      <group position={[-L / 2 + 0.62, TUB_H + 0.3, -W / 2 + t + 0.03]}>
        <Prism r={0.2} h={0.04} sides={14} rotation={[Math.PI / 2, 0, 0]} material={matte("#f4f1e8")} castShadow={false} />
        <Block size={[0.12, 0.03, 0.01]} position={[0.08, 0.07, 0.03]} rotation={[0, 0, 0.6]} color="#3fae5a" castShadow={false} />
        <Block size={[0.12, 0.03, 0.01]} position={[-0.08, 0.07, 0.03]} rotation={[0, 0, -0.6]} color="#c4473d" castShadow={false} />
        <Block size={[0.025, 0.16, 0.01]} position={[0, 0, 0.04]} rotation={[0, 0, needle]} color="#22262b" castShadow={false} />
      </group>
      {/* L4c: two padded seats slide in from the ends, belts snap across */}
      {seats > 0 &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * (0.62 + (1 - seats) * 1.4), TUB_FLOOR, -0.15]}>
            <Block size={[0.78, 0.36, 0.62]} position={[0, 0.18, 0]} material={padMat} bevel={0.1} />
            <Block size={[0.78, 0.92, 0.18]} position={[0, 0.62, -0.32]} material={padMat} bevel={0.08} />
          </group>
        ))}
      {belts > 0 &&
        [-1, 1].map((s) => (
          <group key={`b${s}`} position={[s * 0.62, TUB_FLOOR + 0.82, 0.18]} scale={[belts, 1, 1]}>
            <Block size={[0.5, 0.07, 0.03]} rotation={[0, 0, 0.55]} material={beltMat} castShadow={false} />
            <Block size={[0.48, 0.07, 0.03]} position={[0, -0.32, 0.02]} material={beltMat} castShadow={false} />
          </group>
        ))}
      {/* A warm lamp inside */}
      <pointLight position={[0, H - 0.3, 0.6]} color="#ffe2b8" intensity={3} distance={4} decay={1.6} />
    </group>
  );
};
