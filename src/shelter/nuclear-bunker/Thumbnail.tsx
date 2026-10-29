import type React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "../../engine/CameraRig";
import { PostFX } from "../../engine/PostFX";
import { SceneEnvironment } from "../../engine/SceneEnvironment";
import type { Vec3 } from "../../engine/types";
import { Blast } from "./components/Blast";
import { Scene } from "./Scene";
import { BEATS } from "./timeline";

const FONT = "'Arial Black', 'Arial Bold', 'Segoe UI', sans-serif";
const STROKE =
  "-6px -6px 0 #000, 6px -6px 0 #000, -6px 6px 0 #000, 6px 6px 0 #000, 0 10px 26px rgba(0,0,0,0.6)";

/**
 * Shorts thumbnail: the finished bunker in cutaway with the family cheering
 * inside, the mushroom cloud towering over the yard, and big hook text.
 * Render it as a still at THUMB_FRAME (Freeze does not reach into the canvas).
 */
export const THUMB_FRAME = BEATS.congrats + 20;
const POSE: { position: Vec3; lookAt: Vec3 } = {
  position: [0.4, 0.2, 10.5],
  lookAt: [0.3, -1.6, -2],
};

export const NuclearBunkerThumbnail: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#8fc0ee" }}>
      <AbsoluteFill style={{ filter: "saturate(1.25) contrast(1.08)" }}>
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 400, position: POSE.position }}
          shadows
        >
          <CameraRig
            config={{
              initialPosition: POSE.position,
              waypoints: [{ frame: 0, ...POSE }],
            }}
          />
          <SceneEnvironment intensity={0.4} />
          {/* Everything built, everyone cheering (inside the "Congratulations" beat) */}
          <Scene />
          {/* ...with the cloud from the explosion beat still towering over the yard */}
          <group position={[-13, 0, 10]}>
            <Blast frame={BEATS.explosion + 70} />
          </group>
          <PostFX />
        </ThreeCanvas>
      </AbsoluteFill>

    {/* Hook text */}
    <div
      style={{
        position: "absolute",
        top: 120,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 96,
          color: "#ffffff",
          textShadow: STROKE,
          lineHeight: 1.05,
        }}
      >
        A HOLE IN
      </div>
      <div
        style={{
          fontSize: 96,
          color: "#ffffff",
          textShadow: STROKE,
          lineHeight: 1.05,
        }}
      >
        YOUR YARD
      </div>
      <div
        style={{
          fontSize: 70,
          color: "#ffd84d",
          textShadow: STROKE,
          margin: "14px 0",
        }}
      >
        ⬇
      </div>
      <div
        style={{
          fontSize: 124,
          color: "#ffd84d",
          textShadow: STROKE,
          lineHeight: 1.0,
          transform: "rotate(-3deg)",
        }}
      >
        NUCLEAR
      </div>
      <div
        style={{
          fontSize: 124,
          color: "#ffd84d",
          textShadow: STROKE,
          lineHeight: 1.0,
          transform: "rotate(-3deg)",
        }}
      >
        BUNKER
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 110,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 84,
        color: "#b8ff4a",
        textShadow: STROKE,
      }}
    >
      FALLOUT-PROOF?
    </div>
  </AbsoluteFill>
);
