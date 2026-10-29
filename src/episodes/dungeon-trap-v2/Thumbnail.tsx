import type React from "react";
import { AbsoluteFill, type CalculateMetadataFunction } from "remotion";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { CameraPose, EpisodeConfig } from "../../engine/types";
import { config } from "./config";
import { Scene } from "./Scene";
import { BEATS, FLIGHT_START, LIE_X, MIMIC_X, PALADIN_X, PARTY, PLATE_X, Z, partyState } from "./timeline";

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

const rogueDrop = BEATS.rogueFall[0] + 10;
const fryFrame = BEATS.fireStart + 12;
const swatFrame = BEATS.bladeHit + 1;
/** The party strung out mid-air, the first one at the Mimic's open jaws. */
const yeetFrame = FLIGHT_START + 25;
const yeetPts = PARTY.map((m) => partyState(m, yeetFrame).position);
const yeetX = Math.min(...yeetPts.map((p) => p[0]));

export const DUNGEON_V2_THUMB_VARIANTS: ThumbVariant[] = [
  {
    // The party flung across the hall into the Mimic.
    frame: yeetFrame,
    camera: side((yeetX + MIMIC_X + 0.8) / 2, 2.0, 14, 0.4),
    lines: [
      { text: "FLOOR GOES", size: 118, color: "#ffffff" },
      { text: "YEET", size: 200, color: "#ff5fa2", rotate: -4 },
    ],
    top: 140,
  },
  {
    // The rogue dropping through the false floor under the bait chest.
    frame: rogueDrop,
    camera: side(PLATE_X - 0.1, 0.9, 9, 0.2),
    lines: [
      { text: "SHE TOOK", size: 128, color: "#ffffff" },
      { text: "THE BAIT", size: 160, color: "#ffd84d", rotate: -4 },
    ],
    top: 140,
  },
  {
    // The mage cowering on the ice as the flame pipes fire.
    frame: fryFrame,
    camera: side(LIE_X.mage, 1.2, 7, 0.4),
    lines: [
      { text: "ICE BRIDGE?", size: 124, color: "#7fd8ff" },
      { text: "FRYING PAN", size: 140, color: "#ff5a2a", rotate: -4 },
    ],
    top: 140,
  },
  {
    // The pendulum swatting the paladin off his safe spot.
    frame: swatFrame,
    camera: side(PALADIN_X - 0.4, 1.6, 8, 0.4),
    lines: [
      { text: "TIMED FOR", size: 128, color: "#ffffff" },
      { text: "HIS SHIELD", size: 150, color: "#9fd0ff", rotate: -4 },
    ],
    top: 140,
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
export const dungeonV2ThumbMetadata: CalculateMetadataFunction<ThumbProps> = ({ props }) => ({
  props: {
    ...props,
    frame: (DUNGEON_V2_THUMB_VARIANTS[props.variant] ?? DUNGEON_V2_THUMB_VARIANTS[0]).frame,
    count: DUNGEON_V2_THUMB_VARIANTS.length,
  },
});

export const DungeonTrapV2Thumbnail: React.FC<ThumbProps> = ({ variant }) => {
  const v = DUNGEON_V2_THUMB_VARIANTS[variant] ?? DUNGEON_V2_THUMB_VARIANTS[0];
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
