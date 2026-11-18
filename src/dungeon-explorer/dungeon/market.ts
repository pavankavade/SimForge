// A merchant's stall, as a plan: where it backs onto a wall and which way it faces. The stalls
// stand down the town's market street (town/layout.ts plans them); marketView.ts builds them.

/** Half the stall's width along the wall, and its depth out from the wall (cells; 1 cell = 1.5 m). */
export const STALL_HALF = 0.78;
export const STALL_DEPTH = 1.12;
/** Where the counter's middle sits, out from the wall (cells). */
export const COUNTER_AT = 0.78;
/** Where the merchant stands behind it (cells from the wall). */
export const KEEPER_AT = 0.36;

export interface StallPlan {
  /** Index into the merchant list. */
  merchant: number;
  /** Middle of the stall where it meets the wall (cells about the grid's middle; town: from the origin). */
  x: number;
  z: number;
  /** Unit normal out of the wall into the room, and the along-wall direction (normal turned left). */
  nx: number;
  nz: number;
  tx: number;
  tz: number;
  /** Floor height under the stall (cells). */
  floor: number;
}

/** A point `depth` cells out from the wall and `along` cells along it, from a stall's base. */
export function stallPoint(s: Pick<StallPlan, "x" | "z" | "nx" | "nz" | "tx" | "tz">, along: number, depth: number) {
  return { x: s.x + s.tx * along + s.nx * depth, z: s.z + s.tz * along + s.nz * depth };
}
