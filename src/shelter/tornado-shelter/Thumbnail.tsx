import type React from "react";
import { AbsoluteFill } from "remotion";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { CameraPose, EpisodeConfig } from "../../engine/types";
import { config } from "./config";
import { Scene } from "./Scene";
import { BEATS, BOARD_HIT, DURATION, FUNNEL6, Z, lerp } from "./timeline";

/**
 * Shorts thumbnails (1080x1920) for the tornado shelter, in the shelter-series
 * style: one moment frozen from the episode, a fixed camera, heavy caps text.
 *  0 - series: the funnel tears the house away, the room stands. "A CLOSET ⬇ TORNADO SHELTER" / "EF5-PROOF?"
 *  1 - reaction: the family cowers as the closet's outside wall tears off. "WRONG CLOSET"
 *  2 - stakes: a board spears through the drywall past dad's head. "100 MPH"
 * The composition runs the whole episode; render each variant at its THUMB_FRAMES entry:
 * node scripts/solo.mjs still TornadoShelterThumbnail out/shelter/tornado-shelter/thumbnails/tornado-shelter-thumb-1.png --props='{"variant":0}' --frame=<THUMB_FRAMES[0]>
 */

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', sans-serif";
const STROKE = "-7px -7px 0 #000, 7px -7px 0 #000, -7px 7px 0 #000, 7px 7px 0 #000, 0 7px 0 #000, 0 -7px 0 #000, 0 12px 28px rgba(0,0,0,0.6)";
const GOLD = "#ffd84d";
const LIME = "#b8ff4a";

const P = (position: CameraPose["position"], lookAt: CameraPose["lookAt"]): CameraPose => ({ position, lookAt });

interface Variant {
  frame: number;
  pose: CameraPose;
  fov: number;
  Text: React.FC;
}

const line = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontSize: size,
  color,
  textShadow: STROKE,
  lineHeight: 1.02,
  ...extra,
});

const VARIANTS: Variant[] = [
  {
    frame: Math.round(lerp(FUNNEL6[0], FUNNEL6[1], 0.3)),
    pose: P([-1.5, 2.6, 15], [1.2, 4.6, -3]),
    fov: 44,
    Text: () => (
      <>
        <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
          <div style={line(110, "#ffffff")}>A CLOSET</div>
          <div style={line(70, GOLD, { margin: "8px 0" })}>⬇</div>
          <div style={line(124, GOLD, { transform: "rotate(-3deg)" })}>TORNADO</div>
          <div style={line(124, GOLD, { transform: "rotate(-3deg)" })}>SHELTER</div>
        </div>
        <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontFamily: FONT, ...line(104, LIME) }}>EF5-PROOF?</div>
      </>
    ),
  },
  {
    frame: BEATS.tears + 10,
    pose: P([-4.9, 1.7, Z + 6.8], [-6.0, 1.4, Z - 0.6]),
    fov: 36,
    Text: () => (
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
        <div style={line(150, "#ffffff", { transform: "rotate(-3deg)" })}>WRONG</div>
        <div style={line(170, GOLD, { transform: "rotate(-3deg)" })}>CLOSET</div>
      </div>
    ),
  },
  {
    frame: BOARD_HIT + 10,
    pose: P([-0.9, 1.8, Z + 4.7], [0.1, 1.4, Z - 0.4]),
    fov: 36,
    Text: () => (
      <>
        <div style={{ position: "absolute", top: 170, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
          <div style={line(200, GOLD, { transform: "rotate(-3deg)" })}>100</div>
          <div style={line(150, "#ffffff", { transform: "rotate(-3deg)" })}>MPH</div>
        </div>
        {/* Pointer at the board's tip, an inch from dad's face (placed by eye) */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <path d="M150,1180 L360,920" stroke="#000" strokeWidth={46} strokeLinecap="round" />
          <path d="M150,1180 L360,920" stroke="#ff3b30" strokeWidth={30} strokeLinecap="round" />
          <path d="M410,858 L300,905 L380,970 Z" fill="#ff3b30" stroke="#000" strokeWidth={8} strokeLinejoin="round" />
        </svg>
      </>
    ),
  },
];

export const THUMB_FRAMES = VARIANTS.map((v) => v.frame);

export const TornadoShelterThumbnail: React.FC<{ variant?: number }> = ({ variant = 0 }) => {
  const v = VARIANTS[variant] ?? VARIANTS[0];
  const still: EpisodeConfig = {
    ...config,
    id: "TornadoShelterThumbnail",
    audio: undefined,
    music: undefined,
    sfx: [],
    subtitles: undefined,
    camera: {
      ...config.camera,
      fov: v.fov,
      initialPosition: v.pose.position,
      waypoints: [
        { frame: 0, ...v.pose },
        { frame: DURATION, ...v.pose },
      ],
      shake: [],
      rumbles: [],
    },
    overlays: { ...config.overlays, fadeInFrames: 0, fadeOutFrames: 0 },
    OverlayComponent: v.Text,
  };
  return (
    <AbsoluteFill>
      <EpisodeVideo config={still} Scene={Scene} />
    </AbsoluteFill>
  );
};
