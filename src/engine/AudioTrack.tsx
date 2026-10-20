import type React from "react";
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import type { AudioConfig } from "./types";

interface AudioTrackProps {
  config: AudioConfig;
}

export const AudioTrack: React.FC<AudioTrackProps> = ({ config }) => {
  const { durationInFrames } = useVideoConfig();
  const baseVolume = config.volume ?? 0.8;
  const fadeInFrames = config.fadeInFrames ?? 9;
  const fadeOutFrames = config.fadeOutFrames ?? 30;

  return (
    <Audio
      src={staticFile(config.src)}
      volume={(frame) => {
        const fadeIn =
          fadeInFrames > 0
            ? interpolate(frame, [0, fadeInFrames], [0, baseVolume], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : baseVolume;
        const fadeOut =
          fadeOutFrames > 0
            ? interpolate(
                frame,
                [durationInFrames - fadeOutFrames, durationInFrames - 1],
                [baseVolume, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }
              )
            : baseVolume;
        return Math.min(fadeIn, fadeOut);
      }}
    />
  );
};
