import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes/registry";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EPISODES.map((episode) => (
        <Composition
          key={episode.config.id}
          id={episode.config.id}
          component={episode.Video}
          durationInFrames={episode.config.durationInFrames}
          fps={episode.config.fps}
          width={episode.config.width}
          height={episode.config.height}
        />
      ))}
    </>
  );
};
