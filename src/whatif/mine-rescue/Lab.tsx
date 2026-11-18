import type React from "react";
import { useCurrentFrame } from "remotion";
import { PaladinActor } from "../../artifacts/characters/paladin/PaladinActor";
import type { ArmsPose, PaladinInput, Stance } from "../../artifacts/characters/paladin";
import { defineEpisode } from "../../engine/defineEpisode";
import { CAST, MINER_EQUIPMENT, MINER_WORKWEAR, type CastId } from "./cast";
import { SET_FRAMES, labConfig, worldLabConfig } from "./config";
import { World } from "./Scene";

/**
 * MineRescueLab (1920x1080): the miners' workwear and every acting pose side by side, to check
 * them before they go into the episode. Each column runs its own little sequence.
 *   node scripts/solo.mjs still MineRescueLab out/whatif/mine-rescue/wip/lab-f120.png --frame=120
 */

type Step = [number, Partial<PaladinInput>];
const seq = (steps: Step[]) => (f: number): Partial<PaladinInput> => {
  let cur: Partial<PaladinInput> = {};
  for (const [at, s] of steps) if (f >= at) cur = s;
  return { relaxed: true, ...cur };
};
const sit = (seatY: number, arms?: ArmsPose): Partial<PaladinInput> => ({ stance: "sit" as Stance, seatY, arms });

const COLUMNS: Array<{ id: CastId; x: number; act: (f: number) => Partial<PaladinInput>; walk?: boolean; glasses?: boolean }> = [
  { id: "hero", x: -2.5, act: seq([[0, {}]]), walk: true },
  { id: "foreman", x: -1.5, act: seq([[0, {}], [30, sit(0.5)], [70, sit(0.5, "knees")], [150, sit(0.5, "hold")]]) },
  { id: "m1", x: -0.5, act: seq([[0, {}], [30, sit(0.2)], [70, sit(0.2, "knees")], [150, sit(0.2, "eat")]]) },
  { id: "m2", x: 0.5, act: seq([[0, {}], [30, { stance: "crouch" }], [80, { stance: "crouch", arms: "reach" }], [160, { arms: "reach" }]]) },
  { id: "m3", x: 1.5, act: seq([[0, {}], [30, { arms: "cheer" }], [110, { arms: "wave" }], [180, { aimPitch: 0.7 }]]) },
  { id: "m4", x: 2.5, act: seq([[0, {}], [30, { arms: "shade" }], [110, { arms: "cross" }], [180, { arms: "eat" }]]), glasses: true },
];

const LabScene: React.FC = () => (
  <>
    <ambientLight intensity={0.5} color="#8090b0" />
    <directionalLight position={[3, 6, 5]} intensity={2.6} color="#ffe2bf" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#88aaff" />
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#5a4c40" roughness={0.95} />
    </mesh>
    {COLUMNS.map((c) => (
      <PaladinActor
        key={c.id}
        character={CAST[c.id].spec}
        outfit={CAST[c.id].outfit}
        equipment={MINER_EQUIPMENT}
        workwear={{ ...MINER_WORKWEAR, sunglasses: !!c.glasses }}
        lampIntensity={2}
        position={(f) => [c.walk ? Math.min(c.x + 0.6, c.x - 1.6 + f * 0.04) : c.x, 0, c.walk ? 0.4 : 0]}
        yaw={(f) => (c.walk && f < 55 ? Math.PI / 2 : 0)}
        act={c.act}
      />
    ))}
  </>
);

export const mineRescueLab = defineEpisode({ config: labConfig, Scene: LabScene });

/**
 * MineWorldLab (1080x1920): the episode's set without its cast. Lab frame i is the episode on
 * SET_FRAMES[i], seen through the episode's own camera, so stills take seconds.
 *   npm run review -- MineWorldLab 0:39:1 --out out/review/MineWorldLab
 */
const WorldLabScene: React.FC = () => {
  const frame = useCurrentFrame();
  // (Dust and spark bursts run on the lab's own clock, so they do not show here.)
  return <World humans={false} at={SET_FRAMES[Math.min(SET_FRAMES.length - 1, Math.max(0, frame))]} />;
};

export const mineWorldLab = defineEpisode({ config: worldLabConfig, Scene: WorldLabScene });
