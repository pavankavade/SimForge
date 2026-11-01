import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AdventurerUnit, hipHeight } from "../../artifacts/characters/hero";
import { SkyRig, Tilted, riderOffset } from "../../artifacts/sky";
import { Globe, HayBurst, Hayfield, Hedge, HouseBack, Lawn, PatagoniaSet, Snowball, Snowfall, SpeedLines, SwingSet, Tree, facing, swingSeat } from "../../artifacts/teleport";
import { jellySplash } from "../../kit";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { EpisodeConfig, Vec3 } from "../../engine/types";
import { PLACES } from "./timeline";

/**
 * YouTube thumbnails (1280x720) for Teleport, built to the youtube-thumbnails
 * skill: one close hero, 1-3 huge words that add the stakes (the title asks
 * the question), nothing in the bottom-right badge corner. Three concepts:
 *  0 - reaction: the pair screaming into the hay at 27 mph, "TOO FAST!"
 *  1 - number: Kit's legs out of Grandpa's hedge, "12 MPH"
 *  2 - curiosity: an arrow straight through the Earth, "0 MPH?"
 * Render: node scripts/solo.mjs still TeleportThumbnail out/whatif/teleport/thumbnails/teleport-thumb-1.png --props='{"variant":0}' --frame=0
 */

const FONT = "'Arial Black', 'Arial', sans-serif";
const TANGERINE = "#f27a2e";
const GOLD = "#ffd84d";
const NAVY = "#18213a";
const Z = 0.9;
const EAST = Math.PI / 2;
const KIT = "flyKit";
const TEO = "grandpaTeo";

const stroke = (px: number, color = NAVY) =>
  [-1, 0, 1]
    .map((x) => [-1, 0, 1].map((y) => `${x * px}px ${y * px}px 0 ${color}`))
    .reduce((a, b) => a.concat(b), [] as string[])
    .concat([`0 ${px * 2}px 0 ${color}`, `0 ${px * 3}px ${px * 3}px rgba(0,0,0,0.35)`])
    .join(", ");

/** Variant 0: arriving 150 miles north at 27 mph, screaming, straight at the lens. */
const HayScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.1} azimuth={-0.5} fogNear={40} fogFar={400} />
    <Hayfield frame={3} knock={0} hitX={1.6} />
    <Tilted position={[0.55, 0.35, Z + 0.4]} yaw={-0.55} pitch={0.3} pivot={hipHeight(KIT)}>
      <AdventurerUnit classType={KIT} pose="carry" expression="yell" animFrame={frame} />
      <AdventurerUnit classType={TEO} pose="ride" weapon="none" expression="shock" position={riderOffset(KIT, TEO)} animFrame={frame} />
    </Tilted>
    <HayBurst frame={6} at={0} position={[1.2, 1.2, Z + 0.2]} />
    <HayBurst frame={9} at={0} position={[0.1, 1.6, Z + 0.6]} />
  </>
);

/** Variant 1: the swing launch ends head-first in the hedge; Grandpa can't believe it. */
const HedgeScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.1} azimuth={-0.5} fogNear={40} fogFar={400} />
    <Lawn />
    <HouseBack position={[-8, 0, Z - 3]} width={14} />
    <group position={[0, 0, Z - 2]} rotation={[0, EAST, 0]}>
      <Hedge position={[0, 0, 0]} length={9} hit={0.25} hitX={-2} frame={frame} />
    </group>
    <Tree position={[3, 0, Z - 7]} scale={1.3} seed={2} />
    <Tilted position={[-0.85, 0, Z]} yaw={EAST} pitch={1.25} pivot={0.5}>
      <AdventurerUnit classType={KIT} pose="fall" expression="dazed" animFrame={frame} />
    </Tilted>
    <AdventurerUnit classType={TEO} pose="point" weapon="none" expression="shock" position={[-2.65, 0, Z + 1.3]} rotation={[0, 0.55, 0]} animFrame={frame} />
  </>
);

/** Variant 2: the Earth, big, with the pair beside it about to jump straight through. */
const GlobeScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={2} azimuth={-0.5} fogNear={400} fogFar={3000} />
    <directionalLight position={[-12, 6, 14]} intensity={2.8} color="#fff4e2" />
    <ambientLight intensity={0.5} color="#9fb4ff" />
    <Globe
      position={[-0.4, 1.3, -6]}
      radius={3.6}
      spin={facing(-72.4) + 0.35}
      pins={[
        { lat: PLACES.vermont[0], lon: PLACES.vermont[1], color: TANGERINE, size: 0.07 },
        { lat: PLACES.queulat[0], lon: PLACES.queulat[1], color: "#5ee1ff", size: 0.07 },
      ]}
    />
    <group position={[1.9, 0, Z + 1.6]} rotation={[0, -0.55, 0]}>
      <AdventurerUnit classType={KIT} pose="carry" expression="happy" animFrame={frame} />
      <AdventurerUnit classType={TEO} pose="ride" weapon="none" expression="smug" position={riderOffset(KIT, TEO)} animFrame={frame} />
    </group>
  </>
);

/** Teleport-energy streaks trailing behind a body moving toward -x (saturated cyan: additive washes out on a pale sky). */
const Trail: React.FC = () => (
  <group position={[-0.45, 0.15, Z - 0.35]} scale={[1, 1, 1]}>
    {[
      { y: 2.05, len: 3.4, r: 0.05, o: 0.85 },
      { y: 1.8, len: 4.6, r: 0.09, o: 0.7 },
      { y: 1.5, len: 2.6, r: 0.04, o: 0.9 },
      { y: 1.25, len: 5.2, r: 0.11, o: 0.6 },
      { y: 1.0, len: 3.0, r: 0.05, o: 0.85 },
      { y: 0.75, len: 4.0, r: 0.08, o: 0.6 },
      { y: 0.5, len: 2.2, r: 0.04, o: 0.8 },
    ].map((t, i) => (
      <mesh key={i} position={[t.len / 2 + 0.2, t.y, -0.05 * i]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[t.r * 0.7, t.len, 6, 16]} />
        <meshBasicMaterial color="#1fb8ff" transparent opacity={t.o} depthWrite={false} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

/** Variant 3: Kit hurtling left at 1,000 mph: leaning back into the wind, arms flailing, a glowing trail, dutch angle. */
const SpeedScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.1} azimuth={-0.5} fogNear={40} fogFar={400} />
    <Trail />
    <group position={[0, 0.3, Z]} rotation={[0, 0, 0.22]}>
      <Tilted position={[0, 0, 0]} yaw={-0.08} pitch={-0.15} pivot={hipHeight(KIT)}>
        <AdventurerUnit classType={KIT} pose="launch" expression="scared" animFrame={6} />
      </Tilted>
    </group>
    <SpeedLines frame={frame} center={[1.2, 1.9, Z - 0.8]} speed={1} count={34} />
    <SpeedLines frame={frame + 17} center={[1.6, 1.0, Z - 1.2]} speed={1} count={22} />
  </>
);

/** Comic panic marks around Kit's head for variant 3: sweat drops and shock lines. */
const PanicMarks: React.FC = () => {
  const drop = (x: number, y: number, s: number, rot: number) => (
    <path
      key={`${x}-${y}`}
      d="M0,-26 C10,-10 16,0 16,10 A16,16 0 0 1 -16,10 C-16,0 -10,-10 0,-26 Z"
      transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}
      fill="#a9e8ff"
      stroke={NAVY}
      strokeWidth={4}
    />
  );
  const ray = (x1: number, y1: number, x2: number, y2: number) => (
    <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={NAVY} strokeWidth={10} strokeLinecap="round" />
  );
  return (
    <svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
      {[ray(...PANIC.rays[0]), ray(...PANIC.rays[1]), ray(...PANIC.rays[2])]}
      {PANIC.drops.map(([x, y, sc, r]) => drop(x, y, sc, r))}
    </svg>
  );
};
/** Screen positions (1280x720) of the panic marks, placed by eye around Kit's head. */
const PANIC: { rays: [number, number, number, number][]; drops: [number, number, number, number][] } = {
  rays: [
    [1080, 70, 1120, 30],
    [1110, 130, 1170, 115],
    [1095, 195, 1150, 215],
  ],
  drops: [
    [1060, 120, 1.3, 20],
    [800, 95, 1.0, 25],
  ],
};

/** Variant 4: Patagonia in July: Kit's scared, shivering face fills the frame, snow falling. */
const SnowScene: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.25} azimuth={2.5} fogNear={60} fogFar={600} />
    <PatagoniaSet frame={frame} />
    <Snowfall frame={frame + 200} amount={1.4} center={[0.3, 0, Z + 1.0]} />
    <AdventurerUnit classType={KIT} pose="cower" expression="scared" position={[0.45, 0, Z]} rotation={[0, -0.3, 0]} animFrame={frame} />
    <Snowball position={[0.2, 0.62, Z + 0.45]} r={0.16} />
  </>
);

/** Split variants 5 | 6, composed by scripts/thumb-split.mjs: leaving the swing, arriving in the hedge. */
const SWING_ANGLE = 0.75;
const SwingHalf: React.FC<{ frame: number }> = ({ frame }) => {
  const s = swingSeat(SWING_ANGLE);
  const seat: Vec3 = [s[2], s[1], Z - s[0]];
  const hip = hipHeight(KIT);
  return (
    <>
      <SkyRig tod={0.1} azimuth={-0.5} fogNear={40} fogFar={400} />
      <Lawn />
      <Tree position={[-3, 0, Z - 6]} scale={1.3} seed={1} />
      <SwingSet position={[0, 0, Z]} rotationY={EAST} angle={SWING_ANGLE} empty={false} />
      <Tilted position={[seat[0], seat[1] + 0.06 - hip, seat[2]]} yaw={EAST} pitch={-SWING_ANGLE} pivot={hip}>
        <AdventurerUnit classType={KIT} pose="ride" expression="happy" animFrame={frame} />
      </Tilted>
    </>
  );
};

const HedgeHalf: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SkyRig tod={0.1} azimuth={-0.5} fogNear={40} fogFar={400} />
    <Lawn />
    <group position={[0, 0, Z - 2]} rotation={[0, EAST, 0]}>
      <Hedge position={[0, 0, 0]} length={9} hit={0.25} hitX={-2} frame={frame} />
    </group>
    <Tree position={[3, 0, Z - 7]} scale={1.3} seed={2} />
    <Tilted position={[-0.85, 0, Z]} yaw={EAST} pitch={1.25} pivot={0.5}>
      <AdventurerUnit classType={KIT} pose="fall" expression="dazed" animFrame={frame} />
    </Tilted>
    {jellySplash(-5, [-0.55, 1.0, Z + 0.1], "hedge-leaves", "#5c9a44")}
  </>
);

/** The one text element: 1-3 words, key word coloured. */
const WORDS: { lines: { text: string; color: string; size: number }[]; left: number; top: number }[] = [
  { lines: [{ text: "TOO", color: "#fff", size: 150 }, { text: "FAST!", color: GOLD, size: 190 }], left: 44, top: 40 },
  { lines: [{ text: "12", color: GOLD, size: 230 }, { text: "MPH", color: "#fff", size: 150 }], left: 52, top: 30 },
  { lines: [{ text: "0", color: GOLD, size: 260 }, { text: "MPH?", color: "#fff", size: 140 }], left: 60, top: 20 },
  { lines: [{ text: "1,000", color: GOLD, size: 200 }, { text: "MPH", color: "#fff", size: 160 }], left: 40, top: 40 },
  { lines: [{ text: "SNOW IN", color: "#fff", size: 120 }, { text: "JULY?!", color: GOLD, size: 190 }], left: 40, top: 40 },
  { lines: [], left: 0, top: 0 },
  { lines: [{ text: "12", color: GOLD, size: 210 }, { text: "MPH!", color: "#fff", size: 130 }], left: 345, top: 24 },
];

/** Variant 2: a fat red arrow straight through the planet, Vermont to Chile. */
const ThroughArrow: React.FC = () => (
  <svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(0,0,0,0.45)" />
      </filter>
    </defs>
    <g filter="url(#glow)">
      <line x1={652} y1={104} x2={652} y2={540} stroke={NAVY} strokeWidth={34} strokeLinecap="round" />
      <line x1={652} y1={104} x2={652} y2={540} stroke="#ff3b3b" strokeWidth={22} strokeLinecap="round" />
      <polygon points="652,618 606,528 698,528" fill="#ff3b3b" stroke={NAVY} strokeWidth={7} strokeLinejoin="round" />
    </g>
  </svg>
);

const Card: React.FC<{ variant: number }> = ({ variant }) => {
  const w = WORDS[variant];
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {variant === 2 ? <ThroughArrow /> : null}
      {variant === 3 ? <PanicMarks /> : null}
      <div style={{ position: "absolute", left: w.left, top: w.top, lineHeight: 0.88, transform: "rotate(-3deg)" }}>
        {w.lines.map((l) => (
          <div key={l.text} style={{ fontSize: l.size, color: l.color, textShadow: stroke(l.size > 180 ? 9 : 7) }}>
            {l.text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Long lens, close and a little low: the hero on the right half, text on the left. */
const CAMS: { position: Vec3; lookAt: Vec3; fov: number; roll?: number }[] = [
  { position: [-0.45, 1.1, Z + 3.9], lookAt: [-0.25, 1.6, Z], fov: 28 },
  { position: [-2.7, 1.05, Z + 4.6], lookAt: [-2.55, 1.15, Z + 0.6], fov: 30 },
  { position: [-0.2, 1.1, Z + 6.6], lookAt: [0.2, 1.35, Z - 1], fov: 34 },
  { position: [-0.45, 1.6, Z + 3.3], lookAt: [-0.55, 1.4, Z], fov: 26, roll: -0.12 },
  { position: [-0.15, 0.95, Z + 3.0], lookAt: [-0.35, 1.0, Z], fov: 24 },
  // Split halves: the subject sits in the middle 640 px, which is all thumb-split keeps.
  { position: [2.75, 1.7, Z + 2.5], lookAt: [1.3, 1.55, Z], fov: 30 },
  { position: [-0.9, 0.95, Z + 3.4], lookAt: [-0.95, 0.95, Z], fov: 30 },
];

const ThumbScene: React.FC<{ variant: number }> = ({ variant }) => {
  const frame = useCurrentFrame() + 40;
  if (variant === 3) return <SpeedScene frame={frame} />;
  if (variant === 4) return <SnowScene frame={frame} />;
  if (variant === 5) return <SwingHalf frame={frame} />;
  if (variant === 6) return <HedgeHalf frame={frame} />;
  if (variant === 1) return <HedgeScene frame={frame} />;
  if (variant === 2) return <GlobeScene frame={frame} />;
  return <HayScene frame={frame} />;
};

const config = (variant: number): EpisodeConfig => {
  const { fov, ...cam } = CAMS[variant];
  return {
    id: "TeleportThumbnail",
    title: "Teleport thumbnail",
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
      backgroundColor: variant === 2 ? "#0b1230" : "#a5d2f0",
      postfx: { aoIntensity: 1.3, bloomIntensity: 0.4, bloomThreshold: 0.85, grain: 0 },
    },
    OverlayComponent: () => <Card variant={variant} />,
  };
};

export const TeleportThumbnail: React.FC<{ variant?: number }> = ({ variant = 0 }) => (
  <EpisodeVideo config={config(variant)} Scene={() => <ThumbScene variant={variant} />} />
);
