import type React from "react";
import { EpisodeVideo } from "./EpisodeVideo";
import type { EpisodeBeats, EpisodeConfig, EpisodeDefinition } from "./types";

interface EpisodeSource {
  config: EpisodeConfig;
  Scene: React.FC;
  /** The episode's BEATS table; lets `node scripts/review.mjs <Id> --beats` render every beat. */
  beats?: EpisodeBeats;
}

export const defineEpisode = ({ config, Scene, beats }: EpisodeSource): EpisodeDefinition => {
  // `beats` arrives as a prop (defaultProps) but only review tooling reads it.
  const Video: React.FC<{ beats?: EpisodeBeats }> = () => <EpisodeVideo config={config} Scene={Scene} />;
  return { config, Scene, Video, beats };
};
