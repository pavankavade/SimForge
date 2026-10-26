import { defineEpisode } from "../../engine/defineEpisode";
import { config } from "./config";
import { Scene } from "./Scene";
import { BEATS } from "./timeline";

export const caveHomeProduction = defineEpisode({ config, Scene, beats: BEATS });
