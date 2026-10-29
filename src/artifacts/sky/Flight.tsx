import type React from "react";
import type { Vec3 } from "../../engine/types";
import { AdventurerUnit, hipHeight, type AdventurerClass, type AdventurerPose, type Expression } from "../characters/hero";

/**
 * Flight helpers for the "What if" cast. Poses are modelled upright; these
 * wrappers tilt the whole body forward about the hips, so a `fly` pose at
 * `pitch` ~1.2 reads as a Superman glide and a piggyback pair leans into the
 * wind together.
 */

/** Pitches children forward by `pitch` about a point `pivot` above `position` (feet). */
export const Tilted: React.FC<{ position: Vec3; yaw?: number; pitch: number; pivot: number; children: React.ReactNode }> = ({
  position,
  yaw = 0,
  pitch,
  pivot,
  children,
}) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <group position={[0, pivot, 0]} rotation={[pitch, 0, 0]}>
      <group position={[0, -pivot, 0]}>{children}</group>
    </group>
  </group>
);

export interface FlyerProps {
  who: AdventurerClass;
  /** Feet position of the upright body (before the tilt). */
  position: Vec3;
  yaw?: number;
  /** Forward tilt about the hips (0 upright, ~1.2 full glide). */
  pitch?: number;
  pose?: AdventurerPose;
  expression?: Expression;
  frame: number;
}

export const Flyer: React.FC<FlyerProps> = ({ who, position, yaw = 0, pitch = 0, pose = "fly", expression, frame }) => (
  <Tilted position={position} yaw={yaw} pitch={pitch} pivot={hipHeight(who)}>
    <AdventurerUnit classType={who} pose={pose} expression={expression} animFrame={frame} />
  </Tilted>
);

/** Rider's feet relative to the carrier's feet: hips on the carrier's lower back. */
export const riderOffset = (carrier: AdventurerClass, rider: AdventurerClass): Vec3 => [
  0,
  hipHeight(carrier) + 0.2 - hipHeight(rider),
  -0.34,
];

export interface PiggybackProps {
  carrier: AdventurerClass;
  rider: AdventurerClass;
  position: Vec3;
  yaw?: number;
  /** Forward tilt of the pair about the carrier's hips. */
  pitch?: number;
  carrierExpression?: Expression;
  riderExpression?: Expression;
  frame: number;
}

export const Piggyback: React.FC<PiggybackProps> = ({
  carrier,
  rider,
  position,
  yaw = 0,
  pitch = 0,
  carrierExpression,
  riderExpression,
  frame,
}) => (
  <Tilted position={position} yaw={yaw} pitch={pitch} pivot={hipHeight(carrier)}>
    <AdventurerUnit classType={carrier} pose="carry" expression={carrierExpression} animFrame={frame} />
    <AdventurerUnit classType={rider} pose="ride" weapon="none" expression={riderExpression} position={riderOffset(carrier, rider)} animFrame={frame} />
  </Tilted>
);
