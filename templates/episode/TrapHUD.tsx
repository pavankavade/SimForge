import { createTrapHUD } from "../../kit";
import { BEATS, STAGE_STARTS } from "./timeline";

/** One stage per level, in order. Keep names under ~26 characters. */
export const TrapHUD = createTrapHUD({
  kicker: "EVOLUTION OF A",
  title: "__TITLE_UPPER__",
  stages: [
    { name: "CEILING CRUSHER", color: "#ff9a3d" },
    // { name: "LEVEL 2 TRAP", color: "#7dff5a" },
    // { name: "LEVEL 3 TRAP", color: "#4dc4ff" },
    // { name: "LEVEL 4 TRAP", color: "#ffba42" },
    // { name: "LEVEL 5 TRAP", color: "#ff5d8f" },
  ].map((s, i) => ({ ...s, at: STAGE_STARTS[i] })),
  end: { label: "__THEME_UPPER__ STATUS", stamp: "UNBEATABLE", at: BEATS.stamp },
});
