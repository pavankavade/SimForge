import type React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "../../engine/CameraRig";
import { PostFX } from "../../engine/PostFX";
import { SceneEnvironment } from "../../engine/SceneEnvironment";
import type { Vec3 } from "../../engine/types";
import { Scene } from "./Scene";
import { LAMP_Y, TOWER_X } from "./timeline";

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', sans-serif";
const STROKE =
  "-6px -6px 0 #000, 6px -6px 0 #000, -6px 6px 0 #000, 6px 6px 0 #000, 0 10px 26px rgba(0,0,0,0.6)";

/**
 * Shorts thumbnail: the finished lighthouse low and heroic against the dusk sky,
 * its beam swinging out over the sea, with the hook text above.
 * Render it as a still at THUMB_FRAME (the end shot, fog cleared, beam turning).
 */
export const THUMB_FRAME = 2500;
const POSE: { position: Vec3; lookAt: Vec3 } = {
  position: [3.0, 1.4, 15.5],
  lookAt: [TOWER_X + 2.0, LAMP_Y - 1.6, -2],
};

const line = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontSize: size,
  color,
  textShadow: STROKE,
  lineHeight: 1.04,
  ...extra,
});

export const LighthouseThumbnail: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#14204a" }}>
    <AbsoluteFill style={{ filter: "saturate(1.25) contrast(1.08)" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ fov: 50, near: 0.1, far: 400, position: POSE.position }} shadows>
        <CameraRig config={{ initialPosition: POSE.position, waypoints: [{ frame: 0, ...POSE }] }} />
        <SceneEnvironment intensity={0.4} />
        <Scene />
        <PostFX />
      </ThreeCanvas>
    </AbsoluteFill>

    {/* Hook text */}
    <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center", fontFamily: FONT }}>
      <div style={line(104, "#ffffff")}>A CANDLE</div>
      <div style={line(70, "#ffd84d", { margin: "10px 0" })}>⬇</div>
      <div style={line(124, "#ffd84d", { transform: "rotate(-3deg)" })}>LIGHTHOUSE</div>
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
        ...line(84, "#7fe0ff"),
      }}
    >
      IN 6 UPGRADES
    </div>
  </AbsoluteFill>
);
