import { createCampaignHUD } from "../../kit";
import { SEGMENTS, lineStart, w, type LineId } from "./timeline";

const CARD_HOLD = 80;

/**
 * Chapter card per act (global frames) and a level tag per trap level. The
 * first tag waits for the chapter card to leave.
 */
const chapter = (kicker: string, title: string, start: number, color: string, stages: Array<[string, string, LineId]>) => ({
  kicker,
  title,
  color,
  at: start + 6,
  hold: CARD_HOLD,
  stages: stages.map(([name, c, line], i) => ({
    name,
    color: c,
    at: i === 0 ? Math.max(lineStart(line), start + 6 + CARD_HOLD) : lineStart(line),
  })),
});

export const CampaignHUD = createCampaignHUD({
  chapters: [
    chapter("ACT I", "THE ENTRANCE", SEGMENTS.entrance.start, "#ffd84d", [
      ["SPIKE PIT", "#ff9a3d", "e1a"],
      ["FALSE FLOOR + BAIT", "#ffd84d", "e2a"],
      ["OIL FLAMERS", "#ff5a3a", "e3a"],
      ["PENDULUM BLADE", "#4dc4ff", "e4a"],
      ["CATAPULT FLOOR", "#ff5d8f", "e5a"],
    ]),
    chapter("ACT II", "THE HALLWAY", SEGMENTS.hallway.start, "#ffd84d", [
      ["TRIPWIRE BOULDER", "#ff9a3d", "h1a"],
      ["HALL-WIDE BOULDER + SLIME", "#7dff5a", "h2a"],
      ["SPIKED IRON + MAGNET", "#4dc4ff", "h3a"],
      ["CEILING CRUSHERS", "#ffba42", "h4a"],
      ["BLAST DOOR + HALF-PIPE", "#ff5d8f", "h5a"],
    ]),
    chapter("ACT III", "THE VAULT", SEGMENTS.vault.start, "#ffd84d", [
      ["SLIDING STONE WALLS", "#ff9a3d", "v1a"],
      ["GREASE + SPRING BOOT", "#ffd84d", "v2a"],
      ["ELECTRIC PRESS", "#4dc4ff", "v3a"],
      ["ARCANE MIRROR PONG", "#b48cff", "v4a"],
      ["ROOM ON RAILS", "#ff5d8f", "v5a"],
    ]),
    chapter("ACT IV", "THE GALLERY", SEGMENTS.gallery.start, "#ffd84d", [
      ["DART WALLS", "#ff9a3d", "g1a"],
      ["HEAT-SEEKING DARTS", "#ff5a3a", "g2a"],
      ["PNEUMATIC BALLISTA", "#4dc4ff", "g3a"],
      ["ARCANE COILGUN", "#b48cff", "g4a"],
      ["GATLING TURRETS", "#ff5d8f", "g5a"],
    ]),
    // Closing card over floor two's hub (Season 2 starts here).
    chapter("COMING NEXT", "FLOOR TWO", w("fc", "second") - 8, "#ff8a3a", []),
  ],
});
