import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const DEFAULT_VIGNETTE =
  "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.38) 100%), linear-gradient(180deg, rgba(5,12,25,0.32) 0%, rgba(5,12,25,0) 18%, rgba(5,12,25,0) 68%, rgba(5,12,25,0.4) 100%)";

interface VignetteProps {
  background?: boolean | string;
}

export const Vignette: React.FC<VignetteProps> = ({ background = true }) => {
  if (background === false) return null;
  return (
    <AbsoluteFill
      style={{
        zIndex: 40,
        background: typeof background === "string" ? background : DEFAULT_VIGNETTE,
      }}
    />
  );
};

interface FadeOverlayProps {
  fadeInFrames?: number;
  fadeOutFrames?: number;
}

export const FadeOverlay: React.FC<FadeOverlayProps> = ({
  fadeInFrames = 8,
  fadeOutFrames = 14,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn =
    fadeInFrames > 0
      ? interpolate(frame, [0, fadeInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const fadeOut =
    fadeOutFrames > 0
      ? interpolate(
          frame,
          [durationInFrames - fadeOutFrames, durationInFrames - 1],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        )
      : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        opacity: Math.max(fadeIn, fadeOut),
        zIndex: 200,
      }}
    />
  );
};
