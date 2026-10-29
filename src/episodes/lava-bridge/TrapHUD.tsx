import { createTrapHUD } from "../../kit";
import { BEATS, STAGE_STARTS } from "./timeline";

/** One stage per level, in order. Keep names under ~26 characters. */
export const TrapHUD = createTrapHUD({
  kicker: "EVOLUTION OF A",
  title: "LAVA BRIDGE",
  stages: [
    { name: "CRUMBLING BRIDGE", color: "#ff9a3d" },
    { name: "DOUBLE COLLAPSE", color: "#ff5d5d" },
    { name: "LAVA GEYSERS", color: "#ffba42" },
    { name: "LAVA CURRENT", color: "#4dc4ff" },
    { name: "THE FLOOD", color: "#ff5d8f" },
  ].map((s, i) => ({ ...s, at: STAGE_STARTS[i] })),
  end: { label: "SECOND FLOOR STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
  challenge: { text: "PROVE US WRONG", sub: "IN THE COMMENTS", crackAt: BEATS.crackStamp, at: BEATS.dare },
});
