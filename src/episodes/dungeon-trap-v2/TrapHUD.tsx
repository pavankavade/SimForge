import { createTrapHUD } from "../../kit";
import { BEATS, STAGE_STARTS } from "./timeline";

/** One stage per level, in order. Keep names under ~26 characters. */
export const TrapHUD = createTrapHUD({
  kicker: "EVOLUTION OF A",
  title: "DUNGEON TRAP",
  stages: [
    { name: "SPIKE PIT", color: "#ff9a3d" },
    { name: "FALSE FLOOR + BAIT", color: "#ffd84d" },
    { name: "FLAME PIPES", color: "#ff5a2a" },
    { name: "PENDULUM BLADE", color: "#9fd0ff" },
    { name: "CATAPULT + MIMIC", color: "#ff5fa2" },
  ].map((s, i) => ({ ...s, at: STAGE_STARTS[i] })),
  end: { label: "DUNGEON STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
  challenge: { text: "PROVE US WRONG", sub: "IN THE COMMENTS", crackAt: BEATS.crackStamp, at: BEATS.dare },
});
