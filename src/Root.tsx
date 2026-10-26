import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes/registry";
import { SHELTER_PRODUCTIONS } from "./shelter/registry";
import { DungeonTrapThumbnail } from "./episodes/dungeon-trap/Thumbnail";
import { DURATION as DUNGEON_DURATION } from "./episodes/dungeon-trap/timeline";
import { RollingBoulderThumbnail } from "./episodes/rolling-boulder/Thumbnail";
import { DURATION as BOULDER_DURATION } from "./episodes/rolling-boulder/timeline";
import { ToonTest } from "./episodes/toon-test/ToonTest";
import { CharacterLab, LAB_DURATION } from "./lab/CharacterLab";
import { ProfileAvatar } from "./lab/ProfileAvatar";
import { DURATION as TOON_TEST_DURATION } from "./episodes/toon-test/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* SimForge Dungeon Episodes */}
      {EPISODES.map((episode) => (
        <Composition
          key={episode.config.id}
          id={episode.config.id}
          component={episode.Video}
          durationInFrames={episode.config.durationInFrames}
          fps={episode.config.fps}
          width={episode.config.width}
          height={episode.config.height}
          defaultProps={{ beats: episode.beats }}
        />
      ))}
      {/* SimForge Shelter & Bushcraft Engineering Series */}
      {SHELTER_PRODUCTIONS.map((prod) => (
        <Composition
          key={prod.config.id}
          id={prod.config.id}
          component={prod.Video}
          durationInFrames={prod.config.durationInFrames}
          fps={prod.config.fps}
          width={prod.config.width}
          height={prod.config.height}
          defaultProps={{ beats: prod.beats }}
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
      <Composition id="CharacterLab" component={CharacterLab} durationInFrames={LAB_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="ProfileAvatar" component={ProfileAvatar} durationInFrames={30} fps={30} width={1024} height={1024} defaultProps={{ classType: "paladin" }} />
      <Composition id="ToonTest" component={ToonTest} durationInFrames={TOON_TEST_DURATION} fps={30} width={1080} height={1920} />
    </>
  );
};
