import { createTrapHUD } from "../../kit/TrapHUD";
import { BEATS } from "./timeline";

// Title card and end stamp only: the big word captions carry the story.
export const TrapHUD = createTrapHUD({
  kicker: "HOW A PILE OF STONES BECOMES A",
  title: "CASTLE WALL",
  stages: [],
  end: {
    label: "CASTLE STATUS",
    stamp: "RAID-PROOF",
    at: BEATS.congrats,
    color: "#38c172",
  },
});
