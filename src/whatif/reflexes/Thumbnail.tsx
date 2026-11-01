import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AdventurerUnit, hipHeight } from "../../artifacts/characters/hero";
import { Bleachers, Dodgeball, GarageEave, GymHall, KitchenCounter, LADDER_STEP, MilkGlass, Room, Stepladder, Window } from "../../artifacts/reflexes";
import { SkyRig, Tilted } from "../../artifacts/sky";
import { Lawn, SpeedLines, Tree } from "../../artifacts/teleport";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { EpisodeConfig, Vec3 } from "../../engine/types";

/**
 * YouTube thumbnails (1280x720) for Reflexes, in the what-if series style
 * (Slow Flight, Teleport): Kit close on the right half, a clean soft
 * background, two big lines top-left (white, then gold or tangerine) and a
 * navy fact pill bottom-left. Three concepts:
 *  0 - reaction: the dodgeball buried in Kit's stomach, "STILL HIT."
 *  1 - number: Kit lunging for the falling milk, "10× BRAIN. 1× BODY."
 *  2 - curiosity: Kit sprinting, Grandpa's ladder tipping behind him, "TOO LATE?"
 * Render: node scripts/solo.mjs still ReflexesThumbnail out/whatif/reflexes/thumbnails/reflexes-thumb-1.png --props='{"variant":0}' --frame=0
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const TANGERINE = "#f27a2e";
const GOLD = "#ffd84d";
const NAVY = "#18213a";
const RED = "#ff6b5a";
const Z = 0;
const WEST = -Math.PI / 2;
const KIT = "flyKit";
const TEO = "grandpaTeo";

const stroke = (px: number, color = NAVY) =>
  [-1, 0, 1]
    .map((x) => [-1, 0, 1].map((y) => `${x * px}px ${y * px}px 0 ${color}`))
    .reduce((a, b) => a.concat(b), [] as string[])
    .concat([`0 ${px * 2}px 0 ${color}`, `0 ${px * 3}px ${px * 3}px rgba(0,0,0,0.35)`])
    .join(", ");

/** Variant 0: the ball squashed into Kit's stomach, Kit folding round it. */
const GymScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.15} azimuth={-0.5} fogNear={200} fogFar={900} />
    <GymHall backZ={-6} />
    <Bleachers position={[0, 0, -7.2]} />
    <AdventurerUnit classType={KIT} pose="cower" expression="pain" position={[0.35, 0, Z]} rotation={[0, WEST + 0.75, 0]} animFrame={frame} />
    <Dodgeball position={[0.08, 0.66, Z + 0.32]} squash={0.82} />
    <SpeedLines frame={frame} center={[-1.4, 0.7, Z + 0.1]} speed={1} count={18} />
  </>
);

/** Variant 1: Kit lunging, arm out, for the glass falling in front of him. */
const GLASS: Vec3 = [-0.25, 0.55, Z + 0.55];
const KitchenScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.15} azimuth={-0.5} fogNear={200} fogFar={900} />
    <Room position={[0, 0, -1.4]} width={12} depth={7} tiles floor="#e9e2d2" floorLine="#d6ccb8" />
    <KitchenCounter position={[-2.2, 0, -4.4]} length={4} />
    <Window position={[1.2, 1.5, -4.8]} />
    <Tilted position={[0.55, 0, Z]} yaw={WEST + 0.75} pitch={0.25} pivot={hipHeight(KIT)}>
      <AdventurerUnit classType={KIT} pose="point" expression="shock" animFrame={frame} />
    </Tilted>
    <MilkGlass position={GLASS} tilt={0.5} milk={0.7} />
  </>
);

/** Variant 2: Kit sprinting at the lens, Grandpa's ladder rocking over behind him. */
const YardScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.1} azimuth={-0.5} fogNear={40} fogFar={400} />
    <Lawn />
    <GarageEave position={[0, 0, -3.4]} length={12} />
    <Tree position={[-6, 0, -6]} scale={1.4} seed={2} />
    <Stepladder position={[-0.55, 0, -2.6]} tip={0.3}>
      <AdventurerUnit classType={TEO} pose="cheer" weapon="none" expression="scared" position={[0, LADDER_STEP + 0.03, 0]} rotation={[0, 0.5, 0]} animFrame={frame} />
    </Stepladder>
    <AdventurerUnit classType={KIT} pose="run" expression="scared" position={[0.55, 0, Z + 0.4]} rotation={[0, WEST + 0.7, 0]} animFrame={frame} />
  </>
);

/** The text block and the fact pill, per variant. */
const CARDS: { top: [string, number]; key: [string, number, string]; pill: React.ReactNode }[] = [
  {
    top: ["STILL", 120],
    key: ["HIT.", 190, GOLD],
    pill: (
      <>
        SAW IT FOR <span style={{ color: GOLD }}>3 SECONDS</span>
      </>
    ),
  },
  {
    top: ["10× BRAIN.", 112],
    key: ["1× BODY.", 150, TANGERINE],
    pill: (
      <>
        REACTS <span style={{ color: GOLD }}>2.5×</span> FASTER, NOT <span style={{ color: RED }}>10×</span>
      </>
    ),
  },
  {
    top: ["TOO", 120],
    key: ["LATE?", 190, GOLD],
    pill: (
      <>
        LADDER FALLS IN <span style={{ color: RED }}>2.3 s</span>
      </>
    ),
  },
];

const Card: React.FC<{ variant: number }> = ({ variant }) => {
  const c = CARDS[variant];
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 46, top: 50, lineHeight: 0.95, transform: "rotate(-3deg)", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: c.top[1], color: "#fff", textShadow: stroke(6) }}>{c.top[0]}</div>
        <div style={{ fontSize: c.key[1], color: c.key[2], textShadow: stroke(8) }}>{c.key[0]}</div>
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
          whiteSpace: "nowrap",
        }}
      >
        {c.pill}
      </div>
    </AbsoluteFill>
  );
};

/** Long lens, close and a little low: Kit on the right half, text on the left. */
const CAMS: { position: Vec3; lookAt: Vec3; fov: number }[] = [
  { position: [-0.45, 0.7, Z + 2.7], lookAt: [-0.3, 0.9, Z], fov: 30 },
  { position: [-0.45, 0.8, Z + 3.1], lookAt: [-0.3, 0.98, Z], fov: 30 },
  { position: [-0.35, 0.8, Z + 3.4], lookAt: [-0.4, 1.4, Z], fov: 34 },
];

const ThumbScene: React.FC<{ variant: number }> = ({ variant }) => {
  const frame = useCurrentFrame() + 40;
  if (variant === 1) return <KitchenScene frame={frame} />;
  if (variant === 2) return <YardScene frame={frame} />;
  return <GymScene frame={frame} />;
};

const config = (variant: number): EpisodeConfig => {
  const { fov, ...cam } = CAMS[variant];
  return {
    id: "ReflexesThumbnail",
    title: "Reflexes thumbnail",
    width: 1280,
    height: 720,
    fps: 30,
    durationInFrames: 2,
    camera: { fov, near: 0.05, far: 3000, initialPosition: cam.position, waypoints: [{ frame: 0, ...cam }, { frame: 1, ...cam }] },
    overlays: {
      grade: "saturate(1.28) contrast(1.08) brightness(1.03)",
      vignette: "radial-gradient(ellipse at 62% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.32) 100%)",
      fadeInFrames: 0,
      fadeOutFrames: 0,
      backgroundColor: "#a5d2f0",
      postfx: { aoIntensity: 1.3, bloomIntensity: 0.4, bloomThreshold: 0.85, grain: 0 },
    },
    OverlayComponent: () => <Card variant={variant} />,
  };
};

export const ReflexesThumbnail: React.FC<{ variant?: number }> = ({ variant = 0 }) => (
  <EpisodeVideo config={config(variant)} Scene={() => <ThumbScene variant={variant} />} />
);
