import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BoulderHallway } from "../artifacts/boulder/BoulderHallway";
import {
  AdventurerUnit,
  CLASS_SCALE,
  EXPRESSION_NAMES,
  KITS,
  POSES,
  RIG,
  type AdventurerClass,
  type AdventurerPose,
  type Expression,
} from "../artifacts/characters/hero";
import { Skeleton } from "../artifacts/boulder/Skeleton";
import { EpisodeVideo } from "../engine/EpisodeVideo";
import { ENVIRONMENT_PRESETS } from "../engine/presets";
import { getSurface, makeMasonry } from "../engine/textures";
import type { CameraWaypoint, EpisodeConfig, Vec3 } from "../engine/types";

/**
 * CharacterLab: a model sheet for the hero cast, rendered with the real
 * episode lighting, grade and post FX. One page per 30 frames; render a still
 * at `page * 30 + 15` (see `npm run lab`). Use it whenever you touch the rig,
 * a class kit, a pose or an expression.
 */

const CLASSES: AdventurerClass[] = ["goblin", "rogue", "mage", "paladin"];
const PAGE = 30;
const Z = -0.6;
const ROW_H = 2.25;

type Cell = {
  classType: AdventurerClass;
  pose?: AdventurerPose;
  expression?: Expression;
  yaw?: number;
  label?: string;
};

interface Page {
  title: string;
  /** Grid cells, row-major from the top. */
  rows: Cell[][];
  /** Column spacing and camera distance. */
  dx: number;
  dist: number;
  /** Lift of the camera target above the grid centre. */
  lookY?: number;
  /** Custom scene for non-grid pages. */
  Custom?: React.FC<{ frame: number }>;
  camera?: { position: Vec3; lookAt: Vec3 };
  /** Real episode set (Ep2 hallway) instead of the neutral lab wall. */
  hallway?: boolean;
}

const Shelf: React.FC<{ y: number; width: number }> = ({ y, width }) => (
  <mesh position={[0, y - 0.06, Z]} receiveShadow castShadow>
    <boxGeometry args={[width, 0.12, 1.1]} />
    <meshStandardMaterial color="#4b4e5a" roughness={0.9} />
  </mesh>
);

/** Neutral masonry wall + flagstone-coloured floor, evenly lit at every height. */
const LabBackdrop: React.FC = () => {
  const wall = getSurface("lab-wall", () =>
    makeMasonry({ size: 1024, rows: 22, cols: 7, base: "#4a4f5e", baseAlt: "#3f4452", mortar: "#262a33", seed: 7 })
  );
  return (
    <>
      <mesh position={[0, 4, Z - 1.6]} receiveShadow>
        <planeGeometry args={[18, 16]} />
        <meshStandardMaterial map={wall.map} normalMap={wall.normalMap} roughnessMap={wall.roughnessMap} roughness={1} />
      </mesh>
      <mesh position={[0, 0, Z + 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color="#3a3d49" roughness={0.95} />
      </mesh>
    </>
  );
};

const exprRow = (names: Expression[]): Cell[][] =>
  CLASSES.map((c) => names.map((e) => ({ classType: c, expression: e, yaw: 0.25, label: e })));

/** Poses for one class, 3x3 per page. */
const poseSheets = (c: AdventurerClass): Cell[][][] => {
  const cells: Cell[] = POSES.map((p) => ({ classType: c, pose: p, yaw: 0.65, label: p }));
  const pages: Cell[][][] = [];
  for (let i = 0; i < cells.length; i += 9) {
    const chunk = cells.slice(i, i + 9);
    const rows: Cell[][] = [];
    for (let j = 0; j < chunk.length; j += 3) rows.push(chunk.slice(j, j + 3));
    pages.push(rows);
  }
  return pages;
};

/** Shift an anim frame off the class's blink window so sheets never show closed eyes. */
const openEyes = (c: AdventurerClass, f: number) => {
  let a = f;
  while ((a + KITS[c].blinkSeed) % 83 < 3) a += 3;
  return a;
};

const LIE_SHELF = 1.3;

/**
 * One body per shelf, lying along x, to check floor contact: the spine rests
 * `RIG.lieY * scale` above the surface (the recipe episodes use for corpses).
 */
const lyingPage =
  (faceDown: boolean): React.FC<{ frame: number }> =>
  ({ frame }) => (
    <>
      {CLASSES.map((c, i) => {
        const s = CLASS_SCALE[c];
        const y = (CLASSES.length - 1 - i) * LIE_SHELF;
        return (
          <group key={c}>
            {y > 0.01 ? <Shelf y={y} width={3.2} /> : null}
            <group position={[0, y + RIG.lieY * s, Z]} rotation={[0, 0, faceDown ? -Math.PI / 2 : Math.PI / 2]}>
              <AdventurerUnit
                classType={c}
                pose="sprawl"
                expression={faceDown ? "dazed" : "dead"}
                position={[0, -RIG.hipY * s, 0]}
                rotation={[0, Math.PI / 2, 0]}
                animFrame={frame}
              />
            </group>
          </group>
        );
      })}
    </>
  );

/** Skeletons (what a victim leaves behind) next to a live reference. */
const SkeletonPage: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {CLASSES.map((c, i) => {
      const y = i < 2 ? ROW_H : 0;
      const x = (i % 2 ? 1 : -1) * 0.8;
      return (
        <group key={c}>
          {i === 0 ? <Shelf y={ROW_H} width={3.2} /> : null}
          <Skeleton variant={c} position={[x, y, Z]} rotation={[0, 0.4, 0]} animFrame={frame} />
        </group>
      );
    })}
  </>
);

/** All four at episode scale on the real floor: phone-size readability. */
const LineupPage: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {CLASSES.map((c, i) => (
      <AdventurerUnit
        key={c}
        classType={c}
        pose={i % 2 ? "walk" : "idle"}
        position={[-1.75 + i * 1.17, 0, Z]}
        rotation={[0, i % 2 ? 0.9 : 0.35, 0]}
        scale={1.12}
        animFrame={openEyes(c, frame)}
      />
    ))}
  </>
);

const PAGES: Page[] = [
  {
    title: "Turnaround: front, 3/4, side, back",
    rows: CLASSES.map((c) => [0, 0.7, Math.PI / 2, Math.PI].map((yaw) => ({ classType: c, yaw }))),
    dx: 1.25,
    dist: 13,
  },
  { title: "Expressions A", rows: exprRow(EXPRESSION_NAMES.slice(0, 4)), dx: 1.25, dist: 13 },
  { title: "Expressions B", rows: exprRow(EXPRESSION_NAMES.slice(4, 8)), dx: 1.25, dist: 13 },
  { title: "Expressions C", rows: exprRow([...EXPRESSION_NAMES.slice(8), "neutral"]), dx: 1.25, dist: 13 },
  ...([] as Page[]).concat(
    ...CLASSES.map((c) =>
      poseSheets(c).map((rows, i) => ({ title: `Poses: ${c} ${i + 1}`, rows, dx: 1.5, dist: 12.5, lookY: 0.3 }))
    )
  ),
  ...[false, true].map((faceDown) => ({
    title: faceDown ? "Lying face down (contact)" : "Lying on back (contact)",
    rows: [],
    dx: 0,
    dist: 0,
    Custom: lyingPage(faceDown),
    camera: { position: [0, 2.6, Z + 8.6] as Vec3, lookAt: [0, 2.15, Z] as Vec3 },
  })),
  {
    title: "Skeletons",
    rows: [],
    dx: 0,
    dist: 0,
    Custom: SkeletonPage,
    camera: { position: [0, 2.4, Z + 7.5], lookAt: [0, 1.9, Z] },
  },
  {
    title: "Episode scale lineup",
    rows: [],
    dx: 0,
    dist: 0,
    hallway: true,
    Custom: LineupPage,
    camera: { position: [0, 2.5, Z + 11.5], lookAt: [0, 1.25, Z] },
  },
  ...CLASSES.map((c) => ({
    title: `Close-up: ${c}`,
    rows: [
      [
        { classType: c, yaw: 0.45, expression: "neutral" as Expression },
        { classType: c, yaw: -0.3, expression: "happy" as Expression },
      ],
      [
        { classType: c, yaw: 0.2, expression: "angry" as Expression },
        { classType: c, yaw: -0.5, expression: "scared" as Expression },
      ],
    ],
    dx: 1.3,
    dist: 6.2,
    lookY: 0.4,
  })),
];

export const LAB_DURATION = PAGES.length * PAGE;
export const LAB_PAGES = PAGES.map((p) => p.title);

const gridOrigin = (page: Page) => {
  const cols = Math.max(...page.rows.map((r) => r.length));
  return { x0: (-(cols - 1) * page.dx) / 2, top: (page.rows.length - 1) * ROW_H };
};

const pageCamera = (page: Page): { position: Vec3; lookAt: Vec3 } => {
  if (page.camera) return page.camera;
  const { top } = gridOrigin(page);
  const cy = top / 2 + 0.85 + (page.lookY ?? 0);
  return { position: [0, cy + 0.4, Z + page.dist], lookAt: [0, cy, Z] };
};

const waypoints: CameraWaypoint[] = ([] as CameraWaypoint[]).concat(
  ...PAGES.map((p, i) => {
    const cam = pageCamera(p);
    return [
      { frame: i * PAGE, ...cam },
      { frame: i * PAGE + PAGE - 1, ...cam },
    ];
  })
);

const LabScene: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.min(PAGES.length - 1, Math.floor(frame / PAGE));
  const page = PAGES[index];
  const { x0, top } = gridOrigin(page);
  return (
    <>
      {page.hallway ? (
        <BoulderHallway edgeX={8.8} ledgeY={2.4} pipeRange={[-10.6, -7.3]} magnetX={40} ceilingY={5.9} />
      ) : (
        <LabBackdrop />
      )}
      {page.Custom ? <page.Custom frame={frame} /> : null}
      {page.rows.map((row, r) => {
        const y = top - r * ROW_H;
        return (
          <group key={r}>
            {y > 0.01 ? <Shelf y={y} width={page.dx * row.length + 0.6} /> : null}
            {row.map((cell, c) => (
              <AdventurerUnit
                key={c}
                classType={cell.classType}
                pose={cell.pose}
                expression={cell.expression}
                position={[x0 + c * page.dx, y, Z]}
                rotation={[0, cell.yaw ?? 0, 0]}
                animFrame={openEyes(cell.classType, frame + 7)}
              />
            ))}
          </group>
        );
      })}
    </>
  );
};

const LabOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.min(PAGES.length - 1, Math.floor(frame / PAGE));
  const page = PAGES[index];
  const labels = page.rows.some((row) => row.some((c) => c.label))
    ? page.rows.map((row) => row.map((c) => c.label ?? "").join("  ·  "))
    : [];
  return (
    <AbsoluteFill style={{ fontFamily: "Arial, sans-serif", color: "#fff", padding: 40 }}>
      <div style={{ fontSize: 46, fontWeight: 800, textShadow: "0 3px 8px #000" }}>
        {index}. {page.title}
      </div>
      <div style={{ position: "absolute", bottom: 40, left: 40, right: 40, fontSize: 30, lineHeight: 1.4, textShadow: "0 2px 6px #000" }}>
        {labels.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const config: EpisodeConfig = {
  id: "CharacterLab",
  title: "Character Lab",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: LAB_DURATION,
  camera: { fov: 40, near: 0.2, far: 120, initialPosition: waypoints[0].position, waypoints },
  environment: ENVIRONMENT_PRESETS.dungeonVault,
  overlays: {
    grade: "saturate(1.18) contrast(1.05) brightness(1.05)",
    vignette: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 100%)",
    fadeInFrames: 0,
    fadeOutFrames: 0,
    backgroundColor: "#20232d",
  },
  OverlayComponent: LabOverlay,
};

export const CharacterLab: React.FC = () => <EpisodeVideo config={config} Scene={LabScene} />;
