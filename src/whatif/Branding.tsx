import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CloudPuff, Flyer, Hawk, Piggyback, PlainsRoad, Ridge, SkyRig, WindStreaks } from "../artifacts/sky";
import { EpisodeVideo } from "../engine/EpisodeVideo";
import type { EpisodeConfig, Vec3 } from "../engine/types";

/**
 * Channel art for the "What if" series (Kit and Grandpa Teo):
 *  - ChannelAvatar: 1024x1024 profile picture (YouTube shows it as an 800 px circle),
 *  - ChannelBanner: 2560x1440 banner; name, tagline and the pair sit inside the
 *    1546x423 centre band every device shows.
 * Render: npx remotion still ChannelBanner out/channel-banner.png --props='{"name":"THE IF KIT"}'
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const TANGERINE = "#f27a2e";
const TEAL = "#33c2bd";
const INK = "#18213a";

const stroke = (px: number, color = INK) =>
  [-1, 0, 1]
    .map((x) => [-1, 0, 1].map((y) => `${x * px}px ${y * px}px 0 ${color}`))
    .reduce((a, b) => a.concat(b), [] as string[])
    .concat([`0 ${px * 2}px 0 ${color}`])
    .join(", ");

const still = (id: string, width: number, height: number, cam: { position: Vec3; lookAt: Vec3 }, OverlayComponent: React.FC): EpisodeConfig => ({
  id,
  title: id,
  width,
  height,
  fps: 30,
  durationInFrames: 2,
  camera: { fov: 40, near: 0.1, far: 3000, initialPosition: cam.position, waypoints: [{ frame: 0, ...cam }, { frame: 1, ...cam }] },
  overlays: {
    grade: "saturate(1.22) contrast(1.06) brightness(1.03)",
    fadeInFrames: 0,
    fadeOutFrames: 0,
    backgroundColor: "#a5d2f0",
    postfx: { aoIntensity: 1.3, bloomIntensity: 0.4, bloomThreshold: 0.85, grain: 0 },
  },
  OverlayComponent,
});

// ---------------------------------------------------------------------------
// Profile picture: Kit hovering, arms out, grinning into the wind.
// ---------------------------------------------------------------------------

const AvatarScene: React.FC = () => {
  const frame = useCurrentFrame() + 40;
  return (
    <>
      <SkyRig tod={0} azimuth={-0.5} fogNear={90} fogFar={900} />
      <group position={[-40, -34, 0]}>
        <group rotation={[0, -Math.PI / 2, 0]}>
          <PlainsRoad bus={false} ridge={false} windsock={false} powerSide={-1} />
        </group>
      </group>
      <CloudPuff position={[-7, -0.5, -22]} scale={2.2} seed={31} />
      <CloudPuff position={[7, 4.5, -26]} scale={2.2} seed={32} />
      <Flyer who="flyKit" position={[0, 0, 0]} yaw={-0.25} pitch={0.08} pose="hover" expression="happy" frame={frame} />
      <WindStreaks frame={frame} center={[0, 1.2, -2.5]} speed={0.3} count={14} size={[8, 3, 1]} opacity={0.35} seed={9} />
    </>
  );
};

const AvatarOverlay: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 60%, rgba(24,33,58,0.35) 72%)" }} />
);

export const ChannelAvatar: React.FC = () => (
  <EpisodeVideo
    config={still("ChannelAvatar", 1024, 1024, { position: [0.05, 1.45, 1.95], lookAt: [0, 1.5, 0] }, AvatarOverlay)}
    Scene={AvatarScene}
  />
);

// ---------------------------------------------------------------------------
// Banner: the pair gliding over the patchwork, name and tagline beside them.
// ---------------------------------------------------------------------------

const BANNER_Z = 0;

const BannerScene: React.FC = () => {
  const frame = useCurrentFrame() + 40;
  return (
    <>
      <SkyRig tod={0.35} azimuth={-0.6} fogNear={90} fogFar={900} />
      <group position={[-40, -34, 0]}>
        <group rotation={[0, -Math.PI / 2, 0]}>
          <PlainsRoad bus={false} ridge={false} windsock={false} powerSide={-1} />
        </group>
      </group>
      <Ridge z={-330} scale={0.9} />
      <Piggyback
        carrier="flyKit"
        rider="grandpaTeo"
        position={[2.0, -0.7, BANNER_Z + 1.6]}
        yaw={-0.75}
        pitch={0.45}
        carrierExpression="happy"
        riderExpression="happy"
        frame={frame}
      />
      <Hawk position={[6.2, 1.4, BANNER_Z - 3]} heading={-Math.PI / 2} bank={0.3} scale={0.7} />
      <CloudPuff position={[-14, -3, -30]} scale={2.6} seed={41} />
      <CloudPuff position={[-4, 5, -40]} scale={2.8} seed={42} />
      <CloudPuff position={[13, -2.5, -30]} scale={2.6} seed={43} />
      <CloudPuff position={[20, 6, -45]} scale={3.2} seed={44} />
      <WindStreaks frame={frame} center={[1, 0.8, BANNER_Z - 2]} speed={0.3} count={60} size={[16, 4, 4]} opacity={0.5} seed={5} />
    </>
  );
};

const BannerOverlay: React.FC<{ name: string; tagline: string }> = ({ name, tagline }) => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    {/* Centre band 1546x423 (x 507-2053, y 509-932): the only part every device shows. */}
    <div style={{ position: "absolute", left: 560, top: 548, width: 920, lineHeight: 1 }}>
      <div style={{ fontSize: 150, color: "#fff", textShadow: stroke(8), transform: "rotate(-2deg)", whiteSpace: "nowrap" }}>{name}</div>
      <div
        style={{
          display: "inline-block",
          marginTop: 30,
          padding: "14px 30px",
          background: TANGERINE,
          borderRadius: 22,
          color: "#fff",
          fontSize: 46,
          boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
          transform: "rotate(-2deg)",
          whiteSpace: "nowrap",
        }}
      >
        {tagline}
      </div>
      <div style={{ marginTop: 26, fontSize: 30, letterSpacing: 4, color: TEAL, textShadow: stroke(3) }}>NEW EPISODES EVERY WEEK</div>
    </div>
  </AbsoluteFill>
);

export const ChannelBanner: React.FC<{ name?: string; tagline?: string; guides?: boolean }> = ({
  name = "THE IF KIT",
  tagline = "IMPOSSIBLE WHAT-IFS. REAL SCIENCE.",
  guides = false,
}) => (
  <EpisodeVideo
    config={still("ChannelBanner", 2560, 1440, { position: [0, 0.3, BANNER_Z + 8.5], lookAt: [0, 0.7, BANNER_Z] }, () => (
      <>
        <BannerOverlay name={name} tagline={tagline} />
        {guides ? <div style={{ position: "absolute", left: 507, top: 509, width: 1546, height: 423, border: "4px dashed #ff3b3b" }} /> : null}
      </>
    ))}
    Scene={BannerScene}
  />
);
