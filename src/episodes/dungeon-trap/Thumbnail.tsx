import type React from "react";
import { AbsoluteFill } from "remotion";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { CameraPose, EpisodeConfig } from "../../engine/types";
import { config } from "./config";
import { Scene } from "./Scene";
import { flightCamera } from "./timeline";

const FONT =
  "'Arial Black', 'Arial Bold', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

interface Line {
  text: string;
  size: number;
  color: string;
  rotate?: number;
}

interface ThumbVariant {
  /** Video frame whose scene state is frozen. */
  frame: number;
  camera: CameraPose;
  lines: Line[];
  /** Vertical position of the text block (px from top). */
  top?: number;
  /** Optional red stamp under the text. */
  stamp?: string;
}

export const THUMB_VARIANTS: ThumbVariant[] = [
  {
    // Party mid-air flying into the open mimic.
    frame: 2150,
    camera: { position: [3.0, 2.6, 8.6], lookAt: [5.4, 0.9, -0.6] },
    lines: [
      { text: "THE FLOOR", size: 120, color: "#ffffff" },
      { text: "IS A CATAPULT", size: 94, color: "#ffd84d", rotate: -3 },
    ],
  },
  {
    // Pendulum swatting the shielded paladin.
    frame: 1653,
    camera: { position: [-2.4, 2.4, 6.4], lookAt: [-1.0, 1.6, -0.6] },
    lines: [
      { text: "SHIELD BLOCKS FIRE?", size: 72, color: "#ffffff" },
      { text: "FINE.", size: 170, color: "#ff5a2a", rotate: -4 },
    ],
  },
  {
    // Launch: the party tumbling over the dungeon.
    frame: 2118,
    camera: flightCamera(2118),
    lines: [
      { text: "THEY HUDDLED", size: 112, color: "#ffffff" },
      { text: "MISTAKE.", size: 150, color: "#ff5fa2", rotate: -4 },
    ],
  },
  {
    // Greedy rogue on the hidden plate reaching for the bait.
    frame: 671,
    camera: { position: [2.6, 0.7, 7.4], lookAt: [1.1, 1.0, -0.6] },
    top: 170,
    lines: [
      { text: "DON'T TOUCH", size: 120, color: "#ffffff" },
      { text: "THE CHEST", size: 136, color: "#ffd84d", rotate: -3 },
    ],
  },
  {
    // Every trap stage armed at once.
    frame: 2290,
    camera: { position: [1.6, 0.9, 19.5], lookAt: [1.6, 0.3, -0.6] },
    lines: [
      { text: "TRAP LEVEL 1", size: 84, color: "#ffffff" },
      { text: "→ LEVEL 5", size: 140, color: "#ffd84d", rotate: -3 },
    ],
    top: 170,
    stamp: "UNBEATABLE",
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

export const DungeonTrapThumbnail: React.FC<{ variant: number }> = ({ variant }) => {
  const v = THUMB_VARIANTS[variant] ?? THUMB_VARIANTS[0];
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
