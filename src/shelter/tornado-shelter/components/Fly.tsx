import type React from "react";
import type { Vec3 } from "../../../engine/types";
import { flyOff } from "../timeline";

/**
 * A piece of the house the wind can rip off. Children are authored in world
 * coordinates; `at` is the piece's centre (it tumbles about it). `flights` are
 * [release, back?] windows (see flyOff).
 */
export const Fly: React.FC<{
  frame: number;
  at: Vec3;
  flights: Array<[number, number?]>;
  seed: string;
  power?: number;
  children: React.ReactNode;
}> = ({ frame, at, flights, seed, power, children }) => {
  const s = flyOff(frame, flights, seed, power);
  if (!s.visible) return null;
  return (
    <group position={[at[0] + s.d[0], at[1] + s.d[1], at[2] + s.d[2]]} rotation={s.r}>
      <group position={[-at[0], -at[1], -at[2]]}>{children}</group>
    </group>
  );
};
