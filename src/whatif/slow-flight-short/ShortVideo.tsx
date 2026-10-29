import type React from "react";
import { AbsoluteFill, Freeze, Sequence } from "remotion";
import { AudioTrack } from "../../engine/AudioTrack";
import { EpisodeCanvas } from "../../engine/EpisodeVideo";
import { FadeOverlay, Vignette } from "../../engine/Overlays";
import { SfxTrack } from "../../engine/SfxTrack";
import { Subtitles } from "../../engine/Subtitles";
import type { SubtitleSegment } from "../../engine/types";
import { Scene } from "../slow-flight/Scene";
import { SHORT_SFX, canvasConfig } from "./config";
import wordTimestamps from "./data/wordTimestamps.json";
import { ShortHUD } from "./ShortHUD";
import { CLIPS, clipEnd } from "./timeline";

/**
 * Slow Flight Short: hard cuts between long-form clips. Each clip mounts the
 * long-form canvas in an inner Sequence offset so its frame is long-form time
 * (scene, camera, sky and shakes all follow); the frozen last clip holds the
 * frame before touchdown under the end card.
 */
export const SlowFlightShort: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#a5d2f0" }}>
    <AudioTrack config={{ src: "whatif/slow-flight-short/narration_v1.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 }} />
    <AudioTrack config={{ src: "whatif/slow-flight-short/score_v1.mp3", volume: 1, fadeInFrames: 10, fadeOutFrames: 30 }} />
    <SfxTrack cues={SHORT_SFX} />

    {CLIPS.map((clip, i) => (
      <Sequence key={i} from={clip.at} durationInFrames={clipEnd(i) - clip.at} name={`clip ${i + 1}`}>
        <Freeze frame={0} active={Boolean(clip.freeze)}>
          <Sequence from={-clip.src} layout="none">
            <EpisodeCanvas config={canvasConfig} Scene={Scene} />
          </Sequence>
        </Freeze>
      </Sequence>
    ))}

    <Vignette background={canvasConfig.overlays?.vignette ?? true} />
    <Subtitles segments={wordTimestamps as SubtitleSegment[]} activeColor="#ffd84d" textColor="#ffffff" bottomOffset={560} />
    <ShortHUD />
    <FadeOverlay fadeInFrames={0} fadeOutFrames={20} />
  </AbsoluteFill>
);
