import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HeroChest, Tongue, VaultSet } from "../../artifacts/bio";
import { AdventurerUnit, type FaceKit } from "../../artifacts/characters/hero";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { EpisodeConfig, Vec3 } from "../../engine/types";
import { CHAR_SCALE } from "../../kit";

/**
 * YouTube thumbnail (1280x720) for the mimic short, built to the
 * youtube-thumbnails skill: one close, terrified face on the right, the trap
 * that explains it behind, and three huge words that give the twist the title
 * does not ("How a Mimic Would Actually Work" -> "NOT A CHEST").
 * Render: node scripts/solo.mjs still MimicBioThumbnail out/bio/mimic/thumbnails/mimic-thumb-1.png --props='{"variant":0}' --frame=0
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const GOLD = "#ffd84d";
const NAVY = "#18213a";

const stroke = (px: number, color = NAVY) =>
  [-1, 0, 1]
    .map((x) => [-1, 0, 1].map((y) => `${x * px}px ${y * px}px 0 ${color}`))
    .reduce((a, b) => a.concat(b), [] as string[])
    .concat([`0 ${px * 2}px 0 ${color}`, `0 ${px * 3}px ${px * 3}px rgba(0,0,0,0.45)`])
    .join(", ");

/** The decal face pushed to thumbnail size so it still reads at 168 px. */
const BIG_FACE: Partial<FaceKit> = { eyeR: 0.074, eyeYaw: 0.33, mouthScale: 1.6, mouthPitch: 0.45, browSize: 1.5 };

/** Layouts: 0 = 16:9 (text left, hero right), 1 = 9:16 Shorts cover (text top, everything in the middle 60%). */
const LAYOUT = [
  { chest: [-1.15, 0, 0] as Vec3, chestYaw: 0.45, victim: [1.1, 0, 2.5] as Vec3, victimYaw: -0.45, tip: [0.8, 1.3, 2.5] as Vec3, cam: { position: [0.35, 1.5, 6.3] as Vec3, lookAt: [0.1, 1.5, 0] as Vec3 }, fov: 28 },
  { chest: [-0.42, 0, 0] as Vec3, chestYaw: 0.3, victim: [0.5, 0, 2.6] as Vec3, victimYaw: -0.4, tip: [0.45, 1.35, 2.3] as Vec3, cam: { position: [0.1, 1.95, 7.6] as Vec3, lookAt: [0.05, 1.75, 0] as Vec3 }, fov: 30 },
];

const ThumbScene: React.FC<{ variant: number }> = ({ variant }) => {
  const frame = useCurrentFrame() + 40;
  const l = LAYOUT[variant];
  return (
    <>
      <VaultSet torches={1} motes={false} />
      <pointLight position={[0.2, 2.2, 4.6]} color="#fff0dc" intensity={5} distance={6} decay={2} />
      <HeroChest alive position={l.chest} yaw={l.chestYaw} lid={1.25} eyes={1} lean={0.12} mouth={<Tongue tip={l.tip} out={1} sag={0.35} curl={0.5} />} />
      <group position={l.victim} rotation={[0, l.victimYaw, 0]} scale={CHAR_SCALE}>
        <AdventurerUnit classType="paladin" pose="cheer" expression="shock" weapon="none" faceKit={BIG_FACE} animFrame={frame} />
      </group>
    </>
  );
};

const Card: React.FC<{ variant: number }> = ({ variant }) => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    {variant === 0 ? (
      <div style={{ position: "absolute", left: 44, top: 30, lineHeight: 0.9, transform: "rotate(-3deg)" }}>
        <div style={{ fontSize: 138, color: "#fff", textShadow: stroke(7) }}>NOT A</div>
        <div style={{ fontSize: 180, color: GOLD, textShadow: stroke(9) }}>CHEST</div>
      </div>
    ) : (
      // Shorts cover: the text sits inside the centre crop the shelf and profile grid keep.
      <div style={{ position: "absolute", left: 0, right: 0, top: 400, lineHeight: 0.9, textAlign: "center", transform: "rotate(-3deg)" }}>
        <div style={{ fontSize: 170, color: "#fff", textShadow: stroke(9) }}>NOT A</div>
        <div style={{ fontSize: 236, color: GOLD, textShadow: stroke(11) }}>CHEST</div>
      </div>
    )}
  </AbsoluteFill>
);

const config = (variant: number): EpisodeConfig => {
  const l = LAYOUT[variant];
  return {
    id: variant === 0 ? "MimicBioThumbnail" : "MimicBioShortThumbnail",
    title: "Mimic thumbnail",
    width: variant === 0 ? 1280 : 1080,
    height: variant === 0 ? 720 : 1920,
    fps: 30,
    durationInFrames: 2,
    camera: { fov: l.fov, near: 0.05, far: 400, initialPosition: l.cam.position, waypoints: [{ frame: 0, ...l.cam }, { frame: 1, ...l.cam }] },
    overlays: {
      grade: "saturate(1.28) contrast(1.08) brightness(1.0)",
      vignette: "radial-gradient(ellipse at 55% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.4) 100%)",
      fadeInFrames: 0,
      fadeOutFrames: 0,
      backgroundColor: "#0c0e15",
      postfx: { aoIntensity: 1.6, bloomIntensity: 0.15, bloomThreshold: 0.95, grain: 0 },
    },
    OverlayComponent: () => <Card variant={variant} />,
  };
};

export const MimicBioThumbnail: React.FC<{ variant?: number }> = () => <EpisodeVideo config={config(0)} Scene={() => <ThumbScene variant={0} />} />;
/** The 9:16 cover for the Short itself (and Instagram Reels). */
export const MimicBioShortThumbnail: React.FC = () => <EpisodeVideo config={config(1)} Scene={() => <ThumbScene variant={1} />} />;
