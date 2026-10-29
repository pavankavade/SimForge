import type React from "react";
import { auditEpisode } from "./audit";
import { EpisodeVideo } from "./EpisodeVideo";
import type { EpisodeAuditInfo, EpisodeBeats, EpisodeConfig, EpisodeDefinition } from "./types";

interface EpisodeSource {
  config: EpisodeConfig;
  Scene: React.FC;
  /** The episode's BEATS table; lets `node scripts/review.mjs <Id> --beats` render every beat. */
  beats?: EpisodeBeats;
}

export const defineEpisode = ({ config, Scene, beats }: EpisodeSource): EpisodeDefinition => {
  // `beats` and `audit` arrive as props (defaultProps) but only review tooling reads them.
  const Video: React.FC<{ beats?: EpisodeBeats; audit?: EpisodeAuditInfo }> = () => <EpisodeVideo config={config} Scene={Scene} />;
  return { config, Scene, Video, beats, audit: auditEpisode(config, beats) };
};
