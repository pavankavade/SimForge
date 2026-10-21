import type React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { AudioTrack } from "./AudioTrack";
import { CameraRig } from "./CameraRig";
import { EnvironmentScene } from "./EnvironmentScene";
import { FadeOverlay, Vignette } from "./Overlays";
import { PostFX } from "./PostFX";
import { SceneEnvironment } from "./SceneEnvironment";
import { SfxTrack } from "./SfxTrack";
import { Subtitles } from "./Subtitles";
import type { EpisodeConfig } from "./types";

interface EpisodeVideoProps {
  config: EpisodeConfig;
  Scene: React.FC;
}

export const EpisodeVideo: React.FC<EpisodeVideoProps> = ({ config, Scene }) => {
  const { width, height } = useVideoConfig();
  const overlays = config.overlays ?? {};
  const fog = config.environment?.fog;

  return (
    <AbsoluteFill
      style={{ backgroundColor: overlays.backgroundColor ?? "#1a2530" }}
    >
      {config.audio ? <AudioTrack config={config.audio} /> : null}
      {config.music ? <AudioTrack config={config.music} /> : null}
      {config.sfx ? <SfxTrack cues={config.sfx} /> : null}

      <AbsoluteFill style={{ filter: overlays.grade ?? "saturate(1.06) contrast(1.03)" }}>
        <ThreeCanvas
          width={width}
          height={height}
          camera={{
            fov: config.camera.fov ?? 46,
            near: config.camera.near ?? 0.2,
            far: config.camera.far ?? 400,
            position: config.camera.initialPosition,
          }}
          shadows
        >
          {fog ? <fog attach="fog" args={[fog.color, fog.near, fog.far]} /> : null}

          <CameraRig config={config.camera} />

          <SceneEnvironment intensity={0.4} />

          {config.environment ? (
            <EnvironmentScene preset={config.environment} />
          ) : null}

          <Scene />

          {overlays.postfx?.enabled !== false ? (
            <PostFX {...overlays.postfx} />
          ) : null}
        </ThreeCanvas>
      </AbsoluteFill>

      <Vignette background={overlays.vignette ?? true} />

      {config.subtitles ? <Subtitles {...config.subtitles} /> : null}

      {config.OverlayComponent ? <config.OverlayComponent /> : null}

      <FadeOverlay
        fadeInFrames={overlays.fadeInFrames ?? 8}
        fadeOutFrames={overlays.fadeOutFrames ?? 14}
      />
    </AbsoluteFill>
  );
};
