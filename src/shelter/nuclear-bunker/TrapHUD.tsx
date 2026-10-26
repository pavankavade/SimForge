import { createTrapHUD } from "../../kit/TrapHUD";
import { BEATS } from "./timeline";

// Title card and end stamp only: the big word captions carry the story.
export const TrapHUD = createTrapHUD({
  kicker: "A HOLE IN YOUR YARD",
  title: "NUCLEAR BUNKER",
  stages: [],
  end: {
    label: "BUNKER STATUS",
    stamp: "FALLOUT-PROOF",
    at: BEATS.congrats,
    color: "#38c172",
  },
});
