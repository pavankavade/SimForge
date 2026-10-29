import type React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "../../engine/CameraRig";
import { PostFX } from "../../engine/PostFX";
import { SceneEnvironment } from "../../engine/SceneEnvironment";
import type { Vec3 } from "../../engine/types";
import { Scene } from "./Scene";
import { BEATS, TOWER_TOP, TOWER_ZS } from "./timeline";

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', sans-serif";
const STROKE =
  "-6px -6px 0 #000, 6px -6px 0 #000, -6px 6px 0 #000, 6px 6px 0 #000, 0 10px 26px rgba(0,0,0,0.6)";

/**
 * Shorts thumbnail: the finished wall from outside the moat, the first tower
 * with dad cheering on top, raiders bobbing in the water, and hook text.
 * Render it as a still at THUMB_FRAME (the "Congratulations" beat).
 */
export const THUMB_FRAME = BEATS.congrats + 24;
const POSE: { position: Vec3; lookAt: Vec3 } = {
  position: [12.5, 2.2, 9.5],
  lookAt: [1.2, TOWER_TOP + 0.4, TOWER_ZS[0] + 0.8],
};

const line = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontSize: size,
  color,
  textShadow: STROKE,
  lineHeight: 1.04,
  ...extra,
});

export const CastleWallThumbnail: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#8fc0ee" }}>
    <AbsoluteFill style={{ filter: "saturate(1.2) contrast(1.06)" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ fov: 50, near: 0.1, far: 400, position: POSE.position }} shadows>
        <CameraRig config={{ initialPosition: POSE.position, waypoints: [{ frame: 0, ...POSE }] }} />
        <SceneEnvironment intensity={0.4} />
        <Scene />
        <PostFX />
      </ThreeCanvas>
    </AbsoluteFill>

    {/* Hook text */}
    <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
      <div style={line(96, "#ffffff")}>A PILE OF</div>
      <div style={line(96, "#ffffff")}>STONES</div>
      <div style={line(70, "#ffd84d", { margin: "10px 0" })}>⬇</div>
      <div style={line(124, "#ffd84d", { transform: "rotate(-3deg)" })}>CASTLE</div>
      <div style={line(124, "#ffd84d", { transform: "rotate(-3deg)" })}>WALL</div>
    </div>
    <div style={{ position: "absolute", bottom: 120, left: 0, right: 0, textAlign: "center", fontFamily: FONT, ...line(84, "#b8ff4a") }}>
      RAID-PROOF?
    </div>
  </AbsoluteFill>
);
