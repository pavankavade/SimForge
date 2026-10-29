import type React from "react";
import { AbsoluteFill, type CalculateMetadataFunction } from "remotion";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { CameraPose, EpisodeConfig } from "../../engine/types";
import { config } from "./config";
import { Scene } from "./Scene";
import { BEATS, MAGE_X, MIMIC_X, PARTY_FLIGHT, PIN_X, PIN_Y, ROGUE_LAND_X, ROGUE_PLATE_X, SLOWMO, Z } from "./timeline";

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
  /** Optional red stamp under the text. */
  stamp?: string;
}

/** Late in the flight: the party dropping toward the open mimic. */
const flightFrame = PARTY_FLIGHT[1] - 16;

export const DART_THUMB_VARIANTS: ThumbVariant[] = [
  {
    // Bullet time: the rogue bent back, the volley crawling inches over his face.
    frame: Math.round(SLOWMO[0] + (SLOWMO[1] - SLOWMO[0]) * 0.45),
    camera: { position: [ROGUE_PLATE_X - 0.9, 2.3, Z + 4.4], lookAt: [ROGUE_PLATE_X - 0.5, 0.95, Z] },
    lines: [
      { text: "HE DODGED", size: 118, color: "#ffffff" },
      { text: "EVERY DART", size: 128, color: "#ffd84d", rotate: -3 },
    ],
    top: 150,
  },
  {
    // Bat darts diving into the rogue's back.
    frame: BEATS.rogueHit - 4,
    camera: { position: [ROGUE_LAND_X - 0.2, 1.7, Z + 5.2], lookAt: [ROGUE_LAND_X - 0.4, 1.4, Z] },
    lines: [
      { text: "THE DARTS", size: 120, color: "#ffffff" },
      { text: "U-TURNED", size: 150, color: "#ff5fa2", rotate: -4 },
    ],
    top: 150,
  },
  {
    // Paladin harpooned and pinned to the wall under the winch.
    frame: BEATS.pin + 24,
    camera: { position: [PIN_X - 1.6, PIN_Y + 1.1, Z + 6.6], lookAt: [PIN_X - 0.9, PIN_Y + 1.6, Z] },
    lines: [
      { text: "SHIELD UP?", size: 118, color: "#ffffff" },
      { text: "HARPOON.", size: 156, color: "#4dc4ff", rotate: -4 },
    ],
    top: 150,
  },
  {
    // Coilgun slug blasting the mage out of his boots.
    frame: BEATS.mageBlasted + 2,
    camera: { position: [MAGE_X + 0.55, 2.0, Z + 6.6], lookAt: [MAGE_X + 0.55, 2.0, Z] },
    lines: [
      { text: "BLASTED OUT", size: 112, color: "#ffffff" },
      { text: "OF HIS BOOTS", size: 118, color: "#7ff4ff", rotate: -3 },
    ],
    top: 150,
  },
  {
    // The whole party flying into the pet mimic.
    frame: flightFrame,
    camera: { position: [MIMIC_X - 1.0, 2.9, Z + 10.4], lookAt: [MIMIC_X - 1.0, 2.75, Z] },
    lines: [
      { text: "LEVEL 5", size: 140, color: "#ffffff" },
      { text: "IS UNFAIR", size: 150, color: "#ff5d8f", rotate: -4 },
    ],
    top: 110,
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
      {variant.stamp ? (
        <div
          style={{
            marginTop: 30,
            padding: "8px 30px",
            border: "10px solid #e8322a",
            borderRadius: 18,
            color: "#e8322a",
            fontSize: 100,
            background: "rgba(20,8,8,0.45)",
            boxShadow: "0 0 0 4px rgba(0,0,0,0.6)",
            transform: "rotate(-7deg)",
          }}
        >
          {variant.stamp}
        </div>
      ) : null}
    </div>
  </AbsoluteFill>
);

type ThumbProps = { variant: number; frame?: number; count?: number };

/** Hands the render script each variant's frame and the variant count (frames stay in BEATS). */
export const dartThumbMetadata: CalculateMetadataFunction<ThumbProps> = ({ props }) => ({
  props: {
    ...props,
    frame: (DART_THUMB_VARIANTS[props.variant] ?? DART_THUMB_VARIANTS[0]).frame,
    count: DART_THUMB_VARIANTS.length,
  },
});

export const DartTrapThumbnail: React.FC<ThumbProps> = ({ variant }) => {
  const v = DART_THUMB_VARIANTS[variant] ?? DART_THUMB_VARIANTS[0];
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
