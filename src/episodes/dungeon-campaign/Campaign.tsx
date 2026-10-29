import type React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { AudioTrack } from "../../engine/AudioTrack";
import { EpisodeCanvas } from "../../engine/EpisodeVideo";
import { FadeOverlay, Vignette } from "../../engine/Overlays";
import { SfxTrack } from "../../engine/SfxTrack";
import { Subtitles } from "../../engine/Subtitles";
import type { EpisodeDefinition, SubtitleSegment } from "../../engine/types";
import { SEGMENTS, SEGMENT_ORDER, XF, type SegmentId } from "./timeline";
import { CampaignHUD } from "./CampaignHUD";
import wordTimestamps from "./data/wordTimestamps.json";
import { SEGMENT_DEFS } from "./segments";
import { SUBTITLE_BOTTOM, VIGNETTE } from "./shared";

/** Cross-fades a segment in over its first XF frames (it sits on top of the previous one). */
const SegmentLayer: React.FC<{ id: SegmentId; def: EpisodeDefinition }> = ({ id, def }) => {
  const frame = useCurrentFrame();
  const fadeIn = id === "cold" ? 1 : interpolate(frame, [0, XF], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {def.config.sfx ? <SfxTrack cues={def.config.sfx} /> : null}
      <EpisodeCanvas config={def.config} Scene={def.Scene} />
    </AbsoluteFill>
  );
};

/**
 * The full 16:9 campaign: one narration and score, the nine segments in
 * overlapping Sequences (each graded by its own canvas), then vignette, subtitles and the chapter HUD on top.
 */
export const CampaignVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#20232d" }}>
    <AudioTrack config={{ src: "episodes/dungeon-campaign/narration_v3.mp3", volume: 1, fadeInFrames: 0, fadeOutFrames: 10 }} />
    <AudioTrack config={{ src: "episodes/dungeon-campaign/score_v3.mp3", volume: 1, fadeInFrames: 20, fadeOutFrames: 60 }} />

    <AbsoluteFill>
      {SEGMENT_ORDER.map((id) => (
        <Sequence key={id} from={SEGMENTS[id].start} durationInFrames={SEGMENTS[id].end - SEGMENTS[id].start} name={id}>
          <SegmentLayer id={id} def={SEGMENT_DEFS[id]} />
        </Sequence>
      ))}
    </AbsoluteFill>

    <Vignette background={VIGNETTE} />
    <Subtitles segments={wordTimestamps as SubtitleSegment[]} activeColor="#ffd84d" textColor="#ffffff" bottomOffset={SUBTITLE_BOTTOM} />
    <CampaignHUD />
    <FadeOverlay fadeInFrames={12} fadeOutFrames={40} />
  </AbsoluteFill>
);
