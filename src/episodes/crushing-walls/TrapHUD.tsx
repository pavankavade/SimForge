import { createTrapHUD } from "../../kit";
import { BEATS, STAGE_STARTS } from "./timeline";

export const TrapHUD = createTrapHUD({
  kicker: "EVOLUTION OF A",
  title: "CRUSHING WALLS",
  stages: [
    { at: STAGE_STARTS[0], name: "SLIDING STONE WALLS", color: "#d9a066" },
    { at: STAGE_STARTS[1], name: "GREASE + SPRING BOOT", color: "#9bd35a" },
    { at: STAGE_STARTS[2], name: "ELECTRIC PRESS", color: "#5fd0ff" },
    { at: STAGE_STARTS[3], name: "ARCANE MIRROR PONG", color: "#c27bff" },
    { at: STAGE_STARTS[4], name: "LUNGING RAIL ROOM", color: "#ff6a4d" },
  ],
  end: { label: "DUNGEON STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
});
