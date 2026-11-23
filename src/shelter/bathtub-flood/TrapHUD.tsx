import { createTrapHUD } from "../../kit/TrapHUD";
import { BEATS } from "./timeline";

// Title card and end stamp only: the big word captions carry the story.
export const TrapHUD = createTrapHUD({
  kicker: "HOW A BATHTUB BECOMES A",
  title: "FLOOD SHELTER",
  stages: [],
  end: {
    label: "FLOOD STATUS",
    stamp: "UNSINKABLE",
    at: BEATS.congrats,
    color: "#38c172",
  },
  challenge: { text: "PROVE US WRONG", sub: "IN THE COMMENTS", crackAt: BEATS.unless, at: BEATS.prove },
});
