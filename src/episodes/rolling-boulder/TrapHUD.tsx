import { createTrapHUD } from "../../kit";
import { BEATS, STAGE_STARTS } from "./timeline";

export const TrapHUD = createTrapHUD({
  kicker: "EVOLUTION OF A",
  title: "BOULDER HALLWAY",
  stages: [
    { name: "TRIPWIRE BOULDER", color: "#ff9a3d" },
    { name: "HALL-WIDE BOULDER + SLIME", color: "#7dff5a" },
    { name: "SPIKED IRON + ELECTROMAGNET", color: "#4dc4ff" },
    { name: "CEILING CRUSHERS", color: "#ffba42" },
    { name: "BLAST DOOR + HALF-PIPE", color: "#ff5d8f" },
  ].map((s, i) => ({ ...s, at: STAGE_STARTS[i] })),
  end: { label: "HALLWAY STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
});
