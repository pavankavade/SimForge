import type { EpisodeDefinition } from "../../engine/types";
import type { SegmentId } from "./timeline";
import { ENTRANCE } from "./acts/entrance";
import { GALLERY } from "./acts/gallery";
import { HALLWAY } from "./acts/hallway";
import { VAULT } from "./acts/vault";
import { BRIDGE1, BRIDGE2, BRIDGE3, COLD, FINALE } from "./bridges";

/** Every segment's definition (local-frame config + Scene), in story order. */
export const SEGMENT_DEFS: Record<SegmentId, EpisodeDefinition> = {
  cold: COLD,
  entrance: ENTRANCE,
  bridge1: BRIDGE1,
  hallway: HALLWAY,
  bridge2: BRIDGE2,
  vault: VAULT,
  bridge3: BRIDGE3,
  gallery: GALLERY,
  finale: FINALE,
};
