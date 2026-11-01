import { createTrapHUD } from "../../kit/TrapHUD";
import { BEATS } from "./timeline";

// Title card and end stamp only: the big word captions carry the story.
export const TrapHUD = createTrapHUD({
  kicker: "HOW A CLOSET BECOMES A",
  title: "TORNADO SHELTER",
  stages: [],
  end: {
    label: "TORNADO STATUS",
    stamp: "EF5-PROOF",
    at: BEATS.congrats,
    color: "#38c172",
  },
});
