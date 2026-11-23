import type React from "react";
import { useCurrentFrame } from "remotion";
import { PaladinActor } from "../../artifacts/characters/paladin/PaladinActor";
import type { ArmsPose, PaladinInput, Stance } from "../../artifacts/characters/paladin";
import { Bundle, DiverKit } from "../../artifacts/cave";
import { defineEpisode } from "../../engine/defineEpisode";
import { CAST, MINER_EQUIPMENT, type CastId } from "./cast";
import { SET_FRAMES, labConfig, worldLabConfig } from "./config";
import { World } from "./Scene";

/**
 * CaveRescueLab (1920x1080): the cast's kit and every acting pose side by side, to check them
 * before they go into the episode (boys standing, sitting and drinking, a diver swimming, the
 * sedated boy wrapped and masked).
 *   node scripts/solo.mjs still CaveRescueLab out/whatif/cave-rescue/wip/lab-f120.png --frame=120
 */

type Step = [number, Partial<PaladinInput>];
const seq = (steps: Step[]) => (f: number): Partial<PaladinInput> => {
  let cur: Partial<PaladinInput> = {};
  for (const [at, s] of steps) if (f >= at) cur = s;
  return { relaxed: true, ...cur };
};
const sit = (seatY: number, arms?: ArmsPose): Partial<PaladinInput> => ({ stance: "sit" as Stance, seatY, arms });

const COLUMNS: Array<{ id: CastId; x: number; act: (f: number) => Partial<PaladinInput>; walk?: boolean }> = [
  { id: "hero", x: -3.2, act: seq([[0, {}]]), walk: true },
  { id: "coach", x: -2.2, act: seq([[0, {}], [30, sit(0.05)], [70, sit(0.05, "knees")], [150, sit(0.05, "hold")]]) },
  { id: "b1", x: -1.3, act: seq([[0, {}], [30, sit(0.05, "knees")], [150, sit(0.05, "cross")]]) },
  { id: "b2", x: -0.5, act: seq([[0, { arms: "reach", aimPitch: 0.7 }], [100, { arms: "eat", aimPitch: 0.5 }]]) },
  { id: "b3", x: 0.3, act: seq([[0, {}], [30, { arms: "cheer" }], [110, { arms: "wave" }]]) },
  { id: "b4", x: 1.0, act: seq([[0, {}], [30, { stance: "crouch" }]]) },
  { id: "d2", x: 2.0, act: seq([[0, {}], [30, { stance: "crouch", arms: "reach" }]]) },
];

const LabScene: React.FC = () => (
  <>
    <ambientLight intensity={0.5} color="#8090b0" />
    <directionalLight position={[3, 6, 5]} intensity={2.6} color="#ffe2bf" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#88aaff" />
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#6a5a46" roughness={0.95} />
    </mesh>
    {COLUMNS.map((c) => (
      <PaladinActor
        key={c.id}
        character={CAST[c.id].spec}
        outfit={CAST[c.id].outfit}
        equipment={MINER_EQUIPMENT}
        workwear={CAST[c.id].workwear}
        scale={CAST[c.id].scale}
        lampIntensity={2}
        position={(f) => [c.walk ? Math.min(c.x + 0.6, c.x - 1.6 + f * 0.04) : c.x, 0, c.walk ? 0.4 : 0]}
        yaw={(f) => (c.walk && f < 55 ? Math.PI / 2 : 0)}
        act={c.act}
      />
    ))}
    {/* A diver swimming across, face down, kit on. */}
    <PaladinActor
      character={CAST.d1.spec}
      outfit={CAST.d1.outfit}
      equipment={MINER_EQUIPMENT}
      workwear={CAST.d1.workwear}
      lampIntensity={2}
      position={(f) => [2.6 + ((f * 0.03) % 1.2), 0.9, -1.2]}
      floorY={0.9}
      yaw={() => Math.PI / 2}
      pitch={() => Math.PI / 2}
      act={() => ({ relaxed: true, arms: "cheer" })}
    />
    <group position={[2.6 + ((0 * 0.03) % 1.2), 0.9, -1.2]} rotation={[Math.PI / 2, Math.PI / 2, 0, "YXZ"]}>
      <DiverKit />
    </group>
    {/* The sedated boy: on his back, masked and wrapped. */}
    <PaladinActor
      character={CAST.b5.spec}
      outfit={CAST.b5.outfit}
      equipment={MINER_EQUIPMENT}
      workwear={CAST.b5.workwear}
      scale={CAST.b5.scale}
      position={() => [-0.6, 0.16, 1.4]}
      floorY={0.16}
      yaw={() => Math.PI / 2}
      pitch={() => -Math.PI / 2}
      act={() => ({ relaxed: true })}
    />
    <group position={[-0.6, 0.16, 1.4]} rotation={[-Math.PI / 2, Math.PI / 2, 0, "YXZ"]} scale={CAST.b5.scale}>
      <Bundle mask={1} wrap={0.7} />
    </group>
  </>
);

export const caveRescueLab = defineEpisode({ config: labConfig, Scene: LabScene });

/**
 * CaveWorldLab (1080x1920): the episode's set without its cast. Lab frame i is the episode on
 * SET_FRAMES[i], seen through the episode's own camera, so stills take seconds.
 *   npm run review -- CaveWorldLab 0:39:1 --out out/review/CaveWorldLab
 */
const WorldLabScene: React.FC = () => {
  const frame = useCurrentFrame();
  // (Splash and bubble bursts run on the lab's own clock, so they do not show here.)
  return <World humans={false} at={SET_FRAMES[Math.min(SET_FRAMES.length - 1, Math.max(0, frame))]} />;
};

export const caveWorldLab = defineEpisode({ config: worldLabConfig, Scene: WorldLabScene });
