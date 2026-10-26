import { createTrapHUD } from "../../kit/TrapHUD";
import { BEATS, lineStart } from "./timeline";

export const TrapHUD = createTrapHUD({
  kicker: "SURVIVAL SHELTER",
  title: "CAVE HOME",
  stages: [
    { name: "ENTRANCE FIRE", color: "#ff8c3a", at: Math.max(84, lineStart("l3a")) },
    { name: "STONE WIND WALL", color: "#4fa8d1", at: lineStart("l4a") },
    { name: "SMOKE VENT TRANSOM", color: "#f6993f", at: lineStart("l5b") },
    { name: "DRAINAGE & BED", color: "#38c172", at: lineStart("l6b") },
    { name: "TIED BRANCH DOOR", color: "#e3342f", at: lineStart("l8b") },
  ],
  stageLabel: "SHELTER STEP",
  end: {
    label: "CAVE STATUS",
    stamp: "COZY HOME",
    at: BEATS.congrats,
    color: "#38c172",
  },
});
