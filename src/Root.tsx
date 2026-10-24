import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes/registry";
import { DungeonTrapThumbnail } from "./episodes/dungeon-trap/Thumbnail";
import { DURATION as DUNGEON_DURATION } from "./episodes/dungeon-trap/timeline";
import { RollingBoulderThumbnail } from "./episodes/rolling-boulder/Thumbnail";
import { DURATION as BOULDER_DURATION } from "./episodes/rolling-boulder/timeline";
import { ToonTest } from "./episodes/toon-test/ToonTest";
import { DURATION as TOON_TEST_DURATION } from "./episodes/toon-test/timeline";

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
        durationInFrames={DUNGEON_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ variant: 0 }}
      />
      <Composition
        id="RollingBoulderThumbnail"
        component={RollingBoulderThumbnail}
        durationInFrames={BOULDER_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ variant: 0 }}
      />
      <Composition id="ToonTest" component={ToonTest} durationInFrames={TOON_TEST_DURATION} fps={30} width={1080} height={1920} />
    </>
  );
};
