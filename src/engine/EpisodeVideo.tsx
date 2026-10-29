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
import { OUTPUT_HEIGHT } from "./viewport";

interface EpisodeVideoProps {
  config: EpisodeConfig;
  Scene: React.FC;
}

export const EpisodeVideo: React.FC<EpisodeVideoProps> = ({ config, Scene }) => {
  const overlays = config.overlays ?? {};

  return (
    <AbsoluteFill
      style={{ backgroundColor: overlays.backgroundColor ?? "#1a2530" }}
    >
      {config.audio ? <AudioTrack config={config.audio} /> : null}
      {config.music ? <AudioTrack config={config.music} /> : null}
      {config.sfx ? <SfxTrack cues={config.sfx} /> : null}

      <EpisodeCanvas config={config} Scene={Scene} />

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

/**
 * The graded 3D layer of an episode (camera, environment, Scene, post FX)
 * without audio or overlays. Long-form videos stack one per act inside
 * <Sequence>s and play the audio and HUD once at the top level.
 */
export const EpisodeCanvas: React.FC<EpisodeVideoProps> = ({ config, Scene }) => {
  const { width, height } = useVideoConfig();
  const overlays = config.overlays ?? {};
  const fog = config.environment?.fog;
  // Pixel-sized shader details (minimum outline width) follow this video's height.
  OUTPUT_HEIGHT.value = height;
  return (
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
  );
};
