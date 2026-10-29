import type React from "react";
import { AbsoluteFill, type CalculateMetadataFunction } from "remotion";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { CameraPose, EpisodeConfig } from "../../engine/types";
import { config } from "./config";
import { Scene } from "./Scene";
import { BARB_SEG, BARB_SPLASH, BEATS, MAGE2_STOP_X, SEG_XS, Z, mage2X, palX, palY } from "./timeline";

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

interface Line {
  text: string;
  size: number;
  color: string;
  rotate?: number;
}

interface ThumbVariant {
  /** Video frame whose scene state is frozen (always derived from BEATS). */
  frame: number;
  camera: CameraPose;
  lines: Line[];
  /** Vertical position of the text block (px from top). */
  top?: number;
}

/** Side-on camera at distance d looking at (x, y) on the action plane, raised by `rise`. */
const side = (x: number, y: number, d: number, rise = 0): CameraPose => ({ position: [x, y + rise, Z + d], lookAt: [x, y, Z] });

const surfFrame = BEATS.ride1 + 10;
const strollFrame = BEATS.stroll + 40;

export const LAVA_THUMB_VARIANTS: ThumbVariant[] = [
  {
    // Paladin riding the first geyser on his shield.
    frame: surfFrame,
    camera: side(palX(surfFrame), palY(surfFrame) + 0.4, 7.2, 0.6),
    lines: [
      { text: "HE SURFED", size: 128, color: "#ffffff" },
      { text: "THE LAVA", size: 150, color: "#ffba42", rotate: -4 },
    ],
    top: 150,
  },
  {
    // The barbarian's slab giving way under him.
    frame: BARB_SPLASH - 8,
    camera: side(SEG_XS[BARB_SEG] + 0.2, 0.6, 8, -0.2),
    lines: [
      { text: "THE BRIDGE", size: 124, color: "#ffffff" },
      { text: "FELL", size: 190, color: "#ff5d5d", rotate: -4 },
    ],
    top: 150,
  },
  {
    // The party strolling over the frozen lake.
    frame: strollFrame,
    camera: side(mage2X(strollFrame) - 1.4, 0.9, 9.5, 1.2),
    lines: [
      { text: "HE FROZE", size: 128, color: "#ffffff" },
      { text: "THE LAVA", size: 150, color: "#7fd8ff", rotate: -4 },
    ],
    top: 150,
  },
  {
    // The wave of lava crashing into the party on the frozen lake.
    frame: BEATS.mageEngulfed - 1,
    camera: side(MAGE2_STOP_X - 2.2, 1.6, 11, 1.0),
    lines: [
      { text: "THE ROOM", size: 130, color: "#ffffff" },
      { text: "FLOODED", size: 150, color: "#ff5d8f", rotate: -4 },
    ],
    top: 130,
  },
];

const ThumbText: React.FC<{ variant: ThumbVariant }> = ({ variant }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        top: variant.top ?? 200,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
        fontWeight: 900,
      }}
    >
      {variant.lines.map((line) => (
        <div
          key={line.text}
          style={{
            fontSize: line.size,
            lineHeight: 1.08,
            color: line.color,
            letterSpacing: 1,
            whiteSpace: "nowrap",
            WebkitTextStroke: `${Math.round(line.size / 7)}px #000`,
            paintOrder: "stroke fill",
            textShadow: "0 10px 30px rgba(0,0,0,0.8)",
            transform: `rotate(${line.rotate ?? 0}deg)`,
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

type ThumbProps = { variant: number; frame?: number; count?: number };

/** Hands the render script each variant's frame and the variant count (frames stay in BEATS). */
export const lavaThumbMetadata: CalculateMetadataFunction<ThumbProps> = ({ props }) => ({
  props: {
    ...props,
    frame: (LAVA_THUMB_VARIANTS[props.variant] ?? LAVA_THUMB_VARIANTS[0]).frame,
    count: LAVA_THUMB_VARIANTS.length,
  },
});

export const LavaBridgeThumbnail: React.FC<ThumbProps> = ({ variant }) => {
  const v = LAVA_THUMB_VARIANTS[variant] ?? LAVA_THUMB_VARIANTS[0];
  const thumbConfig: EpisodeConfig = {
    ...config,
    camera: {
      ...config.camera,
      initialPosition: v.camera.position,
      waypoints: [{ frame: 0, position: v.camera.position, lookAt: v.camera.lookAt }],
      tracks: [],
      shake: [],
      rumbles: [],
    },
    audio: undefined,
    music: undefined,
    sfx: undefined,
    subtitles: undefined,
    overlays: { ...config.overlays, fadeInFrames: 0, fadeOutFrames: 0 },
    OverlayComponent: () => <ThumbText variant={v} />,
  };
  // Rendered as a still at `v.frame` (Freeze doesn't reach into ThreeCanvas).
  return <EpisodeVideo config={thumbConfig} Scene={Scene} />;
};
