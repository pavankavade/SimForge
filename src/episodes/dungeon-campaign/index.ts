import type { EpisodeDefinition } from "../../engine/types";
import { DURATION, SEGMENT_ORDER } from "./timeline";
import { CampaignVideo } from "./Campaign";
import { SEGMENT_DEFS } from "./segments";
import { FPS, HEIGHT, WIDTH } from "./shared";

/** The full long-form video (DungeonCampaign). */
export const dungeonCampaign = {
  id: "DungeonCampaign",
  component: CampaignVideo,
  durationInFrames: DURATION,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

/** One review composition per segment (CampaignEntrance, CampaignBridge1, ...), local frames. */
export const CAMPAIGN_SEGMENTS: EpisodeDefinition[] = SEGMENT_ORDER.map((id) => SEGMENT_DEFS[id]);
