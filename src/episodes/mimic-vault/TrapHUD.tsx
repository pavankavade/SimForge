import { createTrapHUD } from "../../kit";
import { BEATS, STAGE_STARTS } from "./timeline";

/** One stage per level, in order. Keep names under ~26 characters. */
export const TrapHUD = createTrapHUD({
  kicker: "EVOLUTION OF A",
  title: "MIMIC VAULT",
  stages: [
    { name: "THE HUNGRY VAULT", color: "#ff5d8f" },
    { name: "FAST JAWS + TONGUE", color: "#ff9a3d" },
    { name: "THE GULLET", color: "#ffba42" },
    { name: "BITING GOLD", color: "#7dff5a" },
    { name: "NO MORE NAPS", color: "#4dc4ff" },
  ].map((s, i) => ({ ...s, at: STAGE_STARTS[i] })),
  end: { label: "FLOOR TWO · DOOR II", stamp: "UNBEATABLE", at: BEATS.stamp },
  challenge: { text: "PROVE US WRONG", sub: "IN THE COMMENTS", crackAt: BEATS.crackStamp, at: BEATS.dare },
});
