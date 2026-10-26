import type React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { AudioTrack } from "./AudioTrack";
import { FadeOverlay, Vignette } from "./Overlays";
import { SfxTrack } from "./SfxTrack";
import { Subtitles } from "./Subtitles";
import type { EpisodeBeats, FootageConfig } from "./types";

/** EpisodeVideo's layer stack with pre-rendered footage in place of the 3D canvas. */
export const FootageVideo: React.FC<{ config: FootageConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const overlays = config.overlays ?? {};
  const { src, lastFrame } = config.footage;
  const video = <OffthreadVideo src={staticFile(src)} muted />;

  return (
    <AbsoluteFill style={{ backgroundColor: overlays.backgroundColor ?? "#1a2530" }}>
      {config.audio ? <AudioTrack config={config.audio} /> : null}
      {config.music ? <AudioTrack config={config.music} /> : null}
      {config.sfx ? <SfxTrack cues={config.sfx} /> : null}

      <AbsoluteFill style={{ filter: overlays.grade ?? "none" }}>
        {frame > lastFrame ? <Freeze frame={lastFrame}>{video}</Freeze> : video}
      </AbsoluteFill>

      <Vignette background={overlays.vignette ?? false} />

      {config.subtitles ? <Subtitles {...config.subtitles} /> : null}

      {config.OverlayComponent ? <config.OverlayComponent /> : null}

      <FadeOverlay
        fadeInFrames={overlays.fadeInFrames ?? 8}
        fadeOutFrames={overlays.fadeOutFrames ?? 14}
      />
    </AbsoluteFill>
  );
};

export interface FootageDefinition {
  config: FootageConfig;
  Video: React.FC<{ beats?: EpisodeBeats }>;
  beats?: EpisodeBeats;
}

export const defineFootage = ({ config, beats }: { config: FootageConfig; beats?: EpisodeBeats }): FootageDefinition => {
  const Video: React.FC<{ beats?: EpisodeBeats }> = () => <FootageVideo config={config} />;
  return { config, Video, beats };
};
