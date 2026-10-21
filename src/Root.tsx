import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes/registry";
import { DungeonTrapThumbnail } from "./episodes/dungeon-trap/Thumbnail";
import { DURATION } from "./episodes/dungeon-trap/timeline";

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
      <Composition
        id="DungeonTrapThumbnail"
        component={DungeonTrapThumbnail}
        durationInFrames={DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ variant: 0 }}
      />
    </>
  );
};
