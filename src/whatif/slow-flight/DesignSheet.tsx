import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AdventurerUnit, KITS, type AdventurerPose, type Expression, type SilhouetteClass } from "../../artifacts/characters/hero";
import { Flyer, Piggyback, PlainsRoad } from "../../artifacts/sky";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { CameraWaypoint, EnvironmentConfig, EpisodeConfig, Vec3 } from "../../engine/types";

/**
 * Slow Flight design sheet: the silhouette cast on the high-plains road set,
 * rendered with episode lighting and post FX. One page per 30 frames; render
 * a still at `page * 30 + 15` (`npm run review -- SlowFlightDesign --pages`).
 */

const PAGE = 30;

type Figure = {
  who: SilhouetteClass;
  position: Vec3;
  yaw: number;
  pose?: AdventurerPose;
  expression?: Expression;
  headColor?: string;
  inkColor?: string;
};

interface Page {
  title: string;
  caption: string;
  figures: Figure[];
  camera: { position: Vec3; lookAt: Vec3 };
  bus?: boolean;
  /** Extra props for custom pages (flight poses). */
  Extra?: React.FC<{ frame: number }>;
  /** Labels spread evenly across the frame, one per group of figures. */
  columns?: string[];
}

const CAST: { who: SilhouetteClass; name: string; note: string }[] = [
  { who: "flyKit", name: "KIT, 13", note: "tangerine windbreaker · teal beanie · aviator goggles" },
  { who: "grandpaTeo", name: "GRANDPA TEO, 71", note: "flight jacket · shearling collar · flat cap · cane" },
  { who: "sisterTess", name: "TESS, 8", note: "sunflower costume · her face is the flower's centre" },
];

/** Turnaround: front, three-quarter, side, back, in a row on the road. */
const turnaround = (who: SilhouetteClass, name: string, note: string): Page => {
  const tall = KITS[who].scale;
  const lookY = 0.95 * tall;
  return {
    title: `${name} — turnaround`,
    caption: note,
    figures: [0, 0.75, Math.PI / 2, Math.PI].map((yaw, i) => ({ who, position: [-2.1 + i * 1.4, 0, 1.5] as Vec3, yaw })),
    camera: { position: [0, lookY + 0.35, 1.5 + 6.2 * Math.max(0.8, tall)], lookAt: [0, lookY, 1.5] },
  };
};

/** Head colour candidates: [label, Kit, Teo, Tess, outline]. Kit and Tess are siblings. */
const HEAD_OPTIONS: [string, string | undefined, string | undefined, string | undefined, string | undefined][] = [
  ["A  black silhouette", "#1b1b21", "#1b1b21", "#1b1b21", "#f7e7c6"],
  ["B  skin tones (chosen)", undefined, undefined, undefined, undefined],
  ["C  toy pastels", "#9ccbee", "#b5dfa8", "#ffb3a0", "#3b2f3f"],
  ["D  warm cream", "#f2dfc0", "#f2dfc0", "#f2dfc0", "#5a3b2e"],
];

/** Four casts side by side, waist up, one per head colour option. */
const headOptions: Page = {
  title: "Head colour options",
  caption: "",
  columns: HEAD_OPTIONS.map((o) => o[0]),
  figures: ([] as Figure[]).concat(
    ...HEAD_OPTIONS.map(([, kit, teo, tess, ink], g) => {
      const x = (g - 1.5) * 2.4;
      return [
        { who: "flyKit" as SilhouetteClass, position: [x - 0.72, 0, 1.5] as Vec3, yaw: 0.2, headColor: kit, inkColor: ink },
        { who: "grandpaTeo" as SilhouetteClass, position: [x + 0.12, 0, 1.3] as Vec3, yaw: -0.1, headColor: teo, inkColor: ink },
        { who: "sisterTess" as SilhouetteClass, position: [x + 0.82, 0, 1.6] as Vec3, yaw: -0.25, headColor: tess, inkColor: ink },
      ];
    })
  ),
  camera: { position: [0, 1.45, 11.6], lookAt: [0, 1.05, 1.5] },
};

const EXPRESSIONS: Expression[] = ["neutral", "happy", "smug", "scared", "shock", "angry"];

/** Head-and-shoulders expression strip. */
const faces = (who: SilhouetteClass, name: string): Page => {
  const s = KITS[who].scale;
  const headY = 1.62 * s + (KITS[who].build?.leg ?? 1) * 0.15 * s;
  return {
    title: `${name} — expressions`,
    caption: EXPRESSIONS.join("  ·  "),
    figures: EXPRESSIONS.map((expression, i) => ({ who, position: [(i - 2.5) * 0.85 * s, 0, 1.5] as Vec3, yaw: 0.15, expression })),
    camera: { position: [0, headY + 0.05, 1.5 + 5.6 * s], lookAt: [0, headY - 0.25 * s, 1.5] },
  };
};

const PAGES: Page[] = [
  {
    title: "Slow Flight — cast on location",
    caption: "Kit · Grandpa Teo · Tess — the bus has just broken down, 38 miles from the recital",
    figures: [
      { who: "flyKit", position: [0.9, 0, 1.6], yaw: -0.45 },
      { who: "grandpaTeo", position: [2.1, 0, 1.1], yaw: -0.6 },
      { who: "sisterTess", position: [0.1, 0, 2.3], yaw: -0.3, pose: "cheer" },
    ],
    camera: { position: [-1.5, 1.25, 5.6], lookAt: [1.25, 1.05, 0.9] },
    bus: true,
  },
  headOptions,
  ...CAST.map((c) => turnaround(c.who, c.name, c.note)),
  ...CAST.map((c) => faces(c.who, c.name)),
  {
    title: "Flight poses",
    caption: "hover  ·  fly (tilted 1.2 rad)  ·  piggyback on the ground  ·  piggyback in flight",
    figures: [],
    camera: { position: [0.2, 1.6, 9.4], lookAt: [0.2, 1.25, 1.5] },
    Extra: ({ frame }) => (
      <>
        <Flyer who="flyKit" pose="hover" position={[-3.2, 0.45, 1.5]} yaw={0.3} frame={frame} />
        <Flyer who="flyKit" position={[-1.1, 1.0, 1.5]} yaw={Math.PI / 2} pitch={1.2} frame={frame} />
        <Piggyback carrier="flyKit" rider="grandpaTeo" position={[1.2, 0, 1.5]} yaw={0.7} frame={frame} />
        <Piggyback carrier="flyKit" rider="grandpaTeo" position={[3.4, 0.9, 1.5]} yaw={Math.PI / 2} pitch={0.95} frame={frame} />
      </>
    ),
  },
  {
    title: "Kit — poses",
    caption: "idle · walk · point · cheer · float · jump",
    figures: (["idle", "walk", "point", "cheer", "float", "jump"] as AdventurerPose[]).map((pose, i) => ({
      who: "flyKit" as SilhouetteClass,
      position: [-3.2 + i * 1.3, pose === "float" ? 0.5 : 0, 1.5] as Vec3,
      yaw: 0.55,
      pose,
    })),
    camera: { position: [0, 1.25, 9.6], lookAt: [0, 1.0, 1.5] },
  },
  {
    title: "Background — high-plains road",
    caption: "patchwork fields · broken-down bus · windsock · power line · farm · the ridge they must cross",
    figures: [],
    camera: { position: [-3.2, 2.6, 12], lookAt: [0.6, 1.6, -10] },
    bus: true,
  },
  {
    title: "Background — reverse angle",
    caption: "looking back down the road toward the farm and the windsock",
    figures: [],
    camera: { position: [6.2, 2.4, -24], lookAt: [-5, 2.2, -4] },
    bus: true,
  },
];

export const DESIGN_DURATION = PAGES.length * PAGE;

const waypoints: CameraWaypoint[] = ([] as CameraWaypoint[]).concat(
  ...PAGES.map((p, i) => [
    { frame: i * PAGE, ...p.camera },
    { frame: i * PAGE + PAGE - 1, ...p.camera },
  ])
);

/** Shift an anim frame off the blink window so sheets never show closed eyes. */
const openEyes = (who: SilhouetteClass, f: number) => {
  let a = f;
  while ((a + KITS[who].blinkSeed) % 83 < 3) a += 3;
  return a;
};

const pageAt = (frame: number) => PAGES[Math.min(PAGES.length - 1, Math.floor(frame / PAGE))];

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const page = pageAt(frame);
  return (
    <>
      <PlainsRoad bus={page.bus ?? false} />
      {page.Extra ? <page.Extra frame={openEyes("flyKit", frame + 7)} /> : null}
      {page.figures.map((f, i) => (
        <AdventurerUnit
          key={i}
          classType={f.who}
          pose={f.pose}
          expression={f.expression}
          headColor={f.headColor}
          inkColor={f.inkColor}
          position={f.position}
          rotation={[0, f.yaw, 0]}
          animFrame={openEyes(f.who, frame + 7)}
        />
      ))}
    </>
  );
};

const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.min(PAGES.length - 1, Math.floor(frame / PAGE));
  const page = PAGES[index];
  return (
    <AbsoluteFill style={{ fontFamily: "Arial, sans-serif", color: "#fff", padding: "36px 36px 36px 220px" }}>
      <div style={{ fontSize: 40, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
        {index}. {page.title}
      </div>
      <div style={{ position: "absolute", bottom: 32, left: 36, right: 36, fontSize: 30, fontWeight: 700, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
        {page.caption}
      </div>
      {page.columns ? (
        <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, display: "flex", fontSize: 32, fontWeight: 800, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
          {page.columns.map((c) => (
            <div key={c} style={{ flex: 1, textAlign: "center" }}>
              {c}
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Clear high-plains afternoon: soft warm sun from front-left, cool sky fill, warm back rim. */
const AFTERNOON: EnvironmentConfig = {
  sky: { top: "#4f93d6", mid: "#a5d2f0", bottom: "#f1e4c6" },
  fog: { color: "#c9dceb", near: 80, far: 560 },
  ground: { color: "#a8834f", hidden: true },
  hills: [],
  clouds: [],
  lights: {
    key: { position: [-18, 26, 22], intensity: 2.7, color: "#fff0d4" },
    fill: { position: [20, 12, 16], intensity: 0.9, color: "#bcd6ff" },
    rim: { position: [6, 10, -24], intensity: 1.6, color: "#ffd9a8" },
    ambient: { intensity: 0.95, color: "#eef3ff" },
    shadows: true,
  },
};

const config: EpisodeConfig = {
  id: "SlowFlightDesign",
  title: "Slow Flight design sheet",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: DESIGN_DURATION,
  camera: { fov: 34, near: 0.1, far: 900, initialPosition: waypoints[0].position, waypoints },
  environment: AFTERNOON,
  overlays: {
    grade: "saturate(1.04) contrast(1.02)",
    vignette: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.16) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 0,
    backgroundColor: "#a5d2f0",
    postfx: { aoIntensity: 1.4, bloomIntensity: 0.25, bloomThreshold: 0.92, grain: 0 },
  },
  OverlayComponent: Overlay,
};

export const SlowFlightDesign: React.FC = () => <EpisodeVideo config={config} Scene={Scene} />;
