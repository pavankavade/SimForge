import type React from "react";
import { useCurrentFrame } from "remotion";
import { CeilingBreach } from "../lava/CeilingBreach";
import { DioramaHall } from "./DioramaHall";
import { HallDoor } from "./HallDoor";

/**
 * Floor two's hub, the Season 2 counterpart of floor one's Antechamber: five
 * numbered doors, one per episode. The barbarian broke in through the ceiling
 * in S2E1 (the hole stays), and each room that was destroyed in its episode
 * keeps its door sealed (door I: flooded with lava). A stair door on the right
 * leads up to floor one; the left end stays open so the camera can look down
 * the row of doors.
 */

export const HUB = { x0: -9.6, x1: 9.6, ceilingY: 5.9 } as const;
export const HUB_DOOR_XS = [-6.4, -3.2, 0, 3.2, 6.4] as const;
/** Where the barbarian's fist came through, in front of door I. */
export const HUB_BREACH_X = HUB_DOOR_XS[0] + 1.6;

const NUMERALS = ["I", "II", "III", "IV", "V"];

export interface FloorTwoHubProps {
  /** Frame each door I..V swings open (absent = shut). */
  doorOpen?: number[];
  /** Frame each door I..V's torch lights (absent = lit from the start). */
  doorLit?: number[];
  /** Frame each door I..V is plugged with cooled lava (absent = never). */
  doorSealed?: number[];
  /** Frame the barbarian punches through (S2E1); later episodes pass a negative frame so the hole is just there. */
  breachAt?: number;
  z?: number;
}

export const FloorTwoHub: React.FC<FloorTwoHubProps> = ({ doorOpen = [], doorLit = [], doorSealed = [], breachAt = -1000, z = -0.6 }) => {
  const frame = useCurrentFrame();
  return (
    <group>
      <DioramaHall
        left={HUB.x0}
        right={HUB.x1}
        ceilingY={HUB.ceilingY}
        exit="right"
        exitStyle="door"
        archX={null}
        pillarXs={[]}
        torchXs={[]}
        bannerColor="#6a1a20"
      />
      {HUB_DOOR_XS.map((x, i) => (
        <HallDoor key={x} x={x} numeral={NUMERALS[i]} frame={frame} openAt={doorOpen[i]} litAt={doorLit[i]} sealedAt={doorSealed[i]} />
      ))}
      <CeilingBreach x={HUB_BREACH_X} at={breachAt} ceilingY={HUB.ceilingY} z={z} />
      <hemisphereLight args={["#ffd9c8", "#2a2230", 0.3]} />
      <pointLight position={[0, HUB.ceilingY - 1.2, 2.2]} color="#ffb26b" intensity={1.8} distance={14} decay={2} />
    </group>
  );
};
