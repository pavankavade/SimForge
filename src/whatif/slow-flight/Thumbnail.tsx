import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CloudPuff, Piggyback, PlainsRoad, Ridge, SkyRig, WindStreaks } from "../../artifacts/sky";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { EpisodeConfig, Vec3 } from "../../engine/types";

/**
 * YouTube thumbnail (1280x720) for Slow Flight. Two variants:
 *  0 - bright afternoon over the patchwork, "FLY AT 3 MPH?"
 *  1 - the sunset run to town, "38 MILES. 3 MPH."
 * Render: npx remotion still SlowFlightThumbnail out/slow-flight-thumb-0.png --props='{"variant":0}'
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const TANGERINE = "#f27a2e";
const TEAL = "#33c2bd";
const Z = 0.9;

const stroke = (px: number, color = "#18213a") =>
  [-1, 0, 1]
    .map((x) => [-1, 0, 1].map((y) => `${x * px}px ${y * px}px 0 ${color}`))
    .reduce((a, b) => a.concat(b), [] as string[])
    .concat([`0 ${px * 2}px 0 ${color}`])
    .join(", ");

const ThumbScene: React.FC<{ variant: number }> = ({ variant }) => {
  const frame = useCurrentFrame() + 40;
  const sunset = variant === 1;
  return (
    <>
      <SkyRig tod={sunset ? 1.15 : 0} azimuth={sunset ? 1.2 : -0.5} fogNear={90} fogFar={900} />
      <group position={[-40, sunset ? -26 : -30, 0]}>
        <group rotation={[0, -Math.PI / 2, 0]}>
          <PlainsRoad bus={false} ridge={false} windsock={false} powerSide={-1} />
        </group>
      </group>
      <Ridge z={-330} scale={0.9} />
      <Piggyback
        carrier="flyKit"
        rider="grandpaTeo"
        position={[0, 0, Z]}
        yaw={0.95}
        pitch={0.5}
        carrierExpression="happy"
        riderExpression="shock"
        frame={frame}
      />
      <CloudPuff position={[-9, -3.5, -22]} scale={3} seed={11} />
      <CloudPuff position={[9, 3.5, -30]} scale={4} seed={12} />
      <WindStreaks frame={frame} center={[0, 1, Z]} speed={0.3} count={50} size={[14, 6, 5]} opacity={0.55} seed={7} />
    </>
  );
};

const Card: React.FC<{ variant: number }> = ({ variant }) => {
  const sunset = variant === 1;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 46, top: 70, lineHeight: 0.95, transform: "rotate(-3deg)" }}>
        <div style={{ fontSize: 108, color: "#fff", textShadow: stroke(6) }}>{sunset ? "38 MILES." : "FLY AT"}</div>
        <div style={{ fontSize: 150, color: sunset ? "#ffd84d" : TANGERINE, textShadow: stroke(7) }}>{sunset ? "3 MPH." : "3 MPH?"}</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 56,
          bottom: 60,
          padding: "12px 24px",
          background: "rgba(24, 33, 58, 0.9)",
          border: `5px solid ${TANGERINE}`,
          borderRadius: 22,
          color: "#fff",
          fontSize: 44,
          boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
        }}
      >
        {sunset ? (
          <>
            CURTAIN IN <span style={{ color: "#ff6b5a" }}>0:04</span>
          </>
        ) : (
          <>
            <span style={{ color: "#ffd84d" }}>3</span> + <span style={{ color: TEAL }}>17</span> WIND = 20 MPH
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

const config = (variant: number): EpisodeConfig => {
  // Low, close, slightly below the pair so they loom over the frame's right side.
  const cam: { position: Vec3; lookAt: Vec3 } = { position: [0.6, 0.1, Z + 3.9], lookAt: [-0.85, 1.25, Z] };
  return {
    id: "SlowFlightThumbnail",
    title: "Slow Flight thumbnail",
    width: 1280,
    height: 720,
    fps: 30,
    durationInFrames: 2,
    camera: { fov: 40, near: 0.1, far: 3000, initialPosition: cam.position, waypoints: [{ frame: 0, ...cam }, { frame: 1, ...cam }] },
    overlays: {
      grade: variant === 1 ? "saturate(1.2) contrast(1.06)" : "saturate(1.22) contrast(1.06) brightness(1.03)",
      vignette: "radial-gradient(ellipse at 60% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)",
      fadeInFrames: 0,
      fadeOutFrames: 0,
      backgroundColor: "#a5d2f0",
      postfx: { aoIntensity: 1.3, bloomIntensity: 0.4, bloomThreshold: 0.85, grain: 0 },
    },
    OverlayComponent: () => <Card variant={variant} />,
  };
};

export const SlowFlightThumbnail: React.FC<{ variant?: number }> = ({ variant = 0 }) => (
  <EpisodeVideo config={config(variant)} Scene={() => <ThumbScene variant={variant} />} />
);
