import type React from "react";
import { EpisodeVideo } from "./EpisodeVideo";
import type { EpisodeConfig, EpisodeDefinition } from "./types";

interface EpisodeSource {
  config: EpisodeConfig;
  Scene: React.FC;
}

export const defineEpisode = ({ config, Scene }: EpisodeSource): EpisodeDefinition => {
  const Video: React.FC = () => <EpisodeVideo config={config} Scene={Scene} />;
  return { config, Scene, Video };
};
