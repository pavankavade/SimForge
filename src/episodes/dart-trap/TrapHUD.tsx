import { createTrapHUD } from "../../kit";
import { BEATS, STAGE_STARTS } from "./timeline";

/** One stage per level, in order. Keep names under ~26 characters. */
export const TrapHUD = createTrapHUD({
  kicker: "EVOLUTION OF A",
  title: "DART TRAP",
  stages: [
    { name: "WALL DART SLITS", color: "#ff9a3d" },
    { name: "HOMING BAT DARTS", color: "#7dff5a" },
    { name: "PNEUMATIC BALLISTA", color: "#4dc4ff" },
    { name: "ARCANE COILGUN", color: "#ffba42" },
    { name: "ROTARY GATLING BATTERY", color: "#ff5d8f" },
  ].map((s, i) => ({ ...s, at: STAGE_STARTS[i] })),
  end: { label: "DUNGEON STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
});
