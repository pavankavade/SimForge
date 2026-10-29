import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes/registry";
import { CAMPAIGN_SEGMENTS, dungeonCampaign } from "./episodes/dungeon-campaign";
import { CampaignThumbnail, campaignThumbMetadata } from "./episodes/dungeon-campaign/Thumbnail";
import { SHELTER_PRODUCTIONS } from "./shelter/registry";
import { DungeonTrapThumbnail } from "./episodes/dungeon-trap/Thumbnail";
import { DURATION as DUNGEON_DURATION } from "./episodes/dungeon-trap/timeline";
import { RollingBoulderThumbnail } from "./episodes/rolling-boulder/Thumbnail";
import { NuclearBunkerThumbnail } from "./shelter/nuclear-bunker/Thumbnail";
import { DURATION as NUCLEAR_DURATION } from "./shelter/nuclear-bunker/timeline";
import { LighthouseThumbnail } from "./shelter/lighthouse/Thumbnail";
import { DURATION as LIGHTHOUSE_DURATION } from "./shelter/lighthouse/timeline";
import { CastleWallThumbnail } from "./shelter/castle-wall/Thumbnail";
import { DURATION as CASTLE_WALL_DURATION } from "./shelter/castle-wall/timeline";
import { DURATION as BOULDER_DURATION } from "./episodes/rolling-boulder/timeline";
import { DartTrapThumbnail, dartThumbMetadata } from "./episodes/dart-trap/Thumbnail";
import { DURATION as DART_DURATION } from "./episodes/dart-trap/timeline";
import { LavaBridgeThumbnail, lavaThumbMetadata } from "./episodes/lava-bridge/Thumbnail";
import { DungeonTrapV2Thumbnail, dungeonV2ThumbMetadata } from "./episodes/dungeon-trap-v2/Thumbnail";
import { DURATION as DUNGEON_V2_DURATION } from "./episodes/dungeon-trap-v2/timeline";
import { DURATION as LAVA_DURATION } from "./episodes/lava-bridge/timeline";
import { ToonTest } from "./episodes/toon-test/ToonTest";
import { CharacterLab, LAB_DURATION } from "./lab/CharacterLab";
import { ProfileAvatar } from "./lab/ProfileAvatar";
import { slowFlightEpisode } from "./whatif/slow-flight";
import { teleportEpisode } from "./whatif/teleport";
import { SlowFlightThumbnail } from "./whatif/slow-flight/Thumbnail";
import { ChannelAvatar, ChannelBanner } from "./whatif/Branding";
import { SlowFlightShort } from "./whatif/slow-flight-short/ShortVideo";
import { DURATION as SHORT_DURATION } from "./whatif/slow-flight-short/timeline";
import { DESIGN_DURATION as SLOW_FLIGHT_DESIGN_DURATION, SlowFlightDesign } from "./whatif/slow-flight/DesignSheet";
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
          defaultProps={{ beats: episode.beats, audit: episode.audit }}
        />
      ))}
      {/* Long-form: the four dungeon shorts as one 16:9 campaign, plus a review composition per segment */}
      <Composition {...dungeonCampaign} />
      <Composition
        id="DungeonCampaignThumbnail"
        component={CampaignThumbnail}
        durationInFrames={dungeonCampaign.durationInFrames}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ variant: 0 }}
        calculateMetadata={campaignThumbMetadata}
      />
      {CAMPAIGN_SEGMENTS.map((segment) => (
        <Composition
          key={segment.config.id}
          id={segment.config.id}
          component={segment.Video}
          durationInFrames={segment.config.durationInFrames}
          fps={segment.config.fps}
          width={segment.config.width}
          height={segment.config.height}
          defaultProps={{ beats: segment.beats, audit: segment.audit }}
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
          defaultProps={{ beats: prod.beats, audit: prod.audit }}
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
      <Composition
        id="DartTrapThumbnail"
        component={DartTrapThumbnail}
        durationInFrames={DART_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ variant: 0 }}
        calculateMetadata={dartThumbMetadata}
      />
      <Composition
        id="LavaBridgeThumbnail"
        component={LavaBridgeThumbnail}
        durationInFrames={LAVA_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ variant: 0 }}
        calculateMetadata={lavaThumbMetadata}
      />
      <Composition
        id="DungeonTrapV2Thumbnail"
        component={DungeonTrapV2Thumbnail}
        durationInFrames={DUNGEON_V2_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ variant: 0 }}
        calculateMetadata={dungeonV2ThumbMetadata}
      />
      <Composition id="NuclearBunkerThumbnail" component={NuclearBunkerThumbnail} durationInFrames={NUCLEAR_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="LighthouseThumbnail" component={LighthouseThumbnail} durationInFrames={LIGHTHOUSE_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="CastleWallThumbnail" component={CastleWallThumbnail} durationInFrames={CASTLE_WALL_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="CharacterLab" component={CharacterLab} durationInFrames={LAB_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="ProfileAvatar" component={ProfileAvatar} durationInFrames={30} fps={30} width={1024} height={1024} defaultProps={{ classType: "paladin" }} />
      <Composition
        id={slowFlightEpisode.config.id}
        component={slowFlightEpisode.Video}
        durationInFrames={slowFlightEpisode.config.durationInFrames}
        fps={slowFlightEpisode.config.fps}
        width={slowFlightEpisode.config.width}
        height={slowFlightEpisode.config.height}
        defaultProps={{ beats: slowFlightEpisode.beats, audit: slowFlightEpisode.audit }}
      />
      <Composition
        id={teleportEpisode.config.id}
        component={teleportEpisode.Video}
        durationInFrames={teleportEpisode.config.durationInFrames}
        fps={teleportEpisode.config.fps}
        width={teleportEpisode.config.width}
        height={teleportEpisode.config.height}
        defaultProps={{ beats: teleportEpisode.beats, audit: teleportEpisode.audit }}
      />
      <Composition id="SlowFlightThumbnail" component={SlowFlightThumbnail} durationInFrames={2} fps={30} width={1280} height={720} defaultProps={{ variant: 0 }} />
      <Composition id="SlowFlightShort" component={SlowFlightShort} durationInFrames={SHORT_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="ChannelAvatar" component={ChannelAvatar} durationInFrames={2} fps={30} width={1024} height={1024} />
      <Composition id="ChannelBanner" component={ChannelBanner} durationInFrames={2} fps={30} width={2560} height={1440} defaultProps={{ guides: false }} />
      <Composition id="SlowFlightDesign" component={SlowFlightDesign} durationInFrames={SLOW_FLIGHT_DESIGN_DURATION} fps={30} width={1920} height={1080} />
      <Composition id="ToonTest" component={ToonTest} durationInFrames={TOON_TEST_DURATION} fps={30} width={1080} height={1920} />
    </>
  );
};
