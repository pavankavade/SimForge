import type React from "react";
import { PaladinActor } from "../../artifacts/characters/paladin/PaladinActor";
import type { PaladinInput } from "../../artifacts/characters/paladin";
import { defineEpisode } from "../../engine/defineEpisode";
import { CAST, type CastId } from "./cast";
import { labConfig } from "./config";

/**
 * PriestHoleLab (1920x1080): the cast in their kit and the acting the episode uses, in candle
 * light, to check before it goes into the house.
 *   node scripts/solo.mjs still PriestHoleLab out/shelter/priest-hole/wip/lab-f120.png --frame=120
 */

type Step = [number, Partial<PaladinInput>];
const seq = (steps: Step[], relaxed = true) => (f: number): Partial<PaladinInput> => {
  let cur: Partial<PaladinInput> = {};
  for (const [at, s] of steps) if (f >= at) cur = s;
  return { relaxed, ...cur };
};

const COLUMNS: Array<{ id: CastId; x: number; yaw?: number; act: (f: number) => Partial<PaladinInput>; walk?: boolean; swings?: number[] }> = [
  { id: "priest", x: -3.6, act: seq([[0, {}]]), walk: true },
  { id: "priest", x: -2.5, yaw: Math.PI, act: seq([[0, {}]]) },
  { id: "priest", x: -1.9, act: seq([[0, {}], [30, { stance: "crouch" }], [120, { stance: "sit", seatY: 0.12, arms: "knees" }]]) },
  { id: "priest", x: -1.0, yaw: 0.5, act: seq([[0, { arms: "eat", aimPitch: 0.3 }], [120, { arms: "cross" }]]) },
  { id: "h1", x: -0.2, act: seq([[0, {}], [40, { arms: "cheer" }]]) },
  { id: "h2", x: 1.0, yaw: -0.4, act: seq([[0, {}]], false), swings: [60, 69, 78] },
  { id: "h3", x: 2.2, act: seq([[0, { stance: "sit", seatY: 0.48, arms: "eat" }]]) },
  { id: "owner", x: 3.4, act: seq([[0, { stance: "crouch", arms: "hold", aimPitch: -0.5 }], [120, { arms: "reach" }]]) },
];

const LabScene: React.FC = () => (
  <>
    <ambientLight intensity={0.35} color="#8a90a8" />
    <pointLight position={[0, 2.4, 2.2]} intensity={18} distance={12} decay={1.6} color="#ffb870" castShadow />
    <directionalLight position={[3, 6, 5]} intensity={1.2} color="#ffe2bf" />
    <directionalLight position={[-4, 3, -3]} intensity={0.8} color="#88aaff" />
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#5a4330" roughness={0.9} />
    </mesh>
    <mesh position={[0, 2, -1.5]} receiveShadow>
      <boxGeometry args={[14, 4, 0.2]} />
      <meshStandardMaterial color="#7d8f6e" roughness={0.95} />
    </mesh>
    {COLUMNS.map((c, i) => (
      <PaladinActor
        key={i}
        character={CAST[c.id].spec}
        outfit={CAST[c.id].outfit}
        equipment={CAST[c.id].equipment}
        workwear={CAST[c.id].workwear}
        scale={CAST[c.id].scale}
        swings={c.swings}
        position={(f) => [c.walk ? Math.min(c.x + 0.4, c.x - 1.6 + f * 0.035) : c.x, 0, c.walk ? 0.5 : 0]}
        yaw={(f) => (c.walk && f < 60 ? Math.PI / 2 : c.yaw ?? 0)}
        act={c.act}
      />
    ))}
  </>
);

export const priestHoleLab = defineEpisode({ config: labConfig, Scene: LabScene, beats: {} });
