import type React from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender, staticFile, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AdventurerUnit, type AdventurerPose, type Expression, type Weapon } from "../../artifacts";
import { EpisodeCanvas } from "../../engine/EpisodeVideo";
import { SceneEnvironment } from "../../engine/SceneEnvironment";
import type { CameraPose, EpisodeConfig, Vec3 } from "../../engine/types";
import { ROGUE_PLATE_X, SLOWMO, Z as GALLERY_Z } from "./acts/gallery/timeline";
import { PALADIN_YANK_X } from "./acts/hallway/timeline";
import { SEGMENT_DEFS } from "./segments";
import type { SegmentId } from "./timeline";

/**
 * YouTube thumbnails for the long-form campaign (1280x720), built like
 * hand-made ones: the Paladin posed on one side (bored, smug eyes; hard key +
 * coloured rim light, white sticker outline) and, on the other side, sharp
 * moments from the video that explain it (one scene, or a 2x2 of the four
 * traps), under a Luckiest Guy headline. `npm run thumb:dungeon-campaign`.
 */

const FONT_FAMILY = "Luckiest Guy";
/** Composition frame the stills are taken at; each panel is shifted to its own local frame. */
const STILL_FRAME = 4000;

/** Loads the thumbnail display face (public/fonts, Apache-2.0) before the still is taken. */
const useDisplayFont = () => {
  const [handle] = useState(() => delayRender("Luckiest Guy"));
  useEffect(() => {
    const face = new FontFace(FONT_FAMILY, `url(${staticFile("fonts/LuckiestGuy-Regular.ttf")})`);
    face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

interface Hero {
  pose: AdventurerPose;
  expression: Expression;
  weapon?: Weapon;
  /** Facing about +y (0 = camera). */
  yaw: number;
  /** Rim light colour. */
  rim: string;
}

/** One moment from the video: a segment frozen at a local frame, seen from its own camera. */
interface Panel {
  segment: SegmentId;
  frame: number;
  camera: CameraPose;
}

interface Line {
  text: string;
  size: number;
  color: string;
}

interface ThumbVariant {
  hero: Hero;
  /** One panel fills the frame behind the hero; four make a 2x2 grid on the right. */
  panels: Panel[];
  lines: Line[];
}

const beat = (id: SegmentId, name: string) => {
  const b = SEGMENT_DEFS[id].beats?.[name];
  if (typeof b !== "number") throw new Error(`thumbnail: no beat ${id}.${name}`);
  return b;
};

/** The bored, half-lidded smirk (the "smug" face), pointing at what's behind him. */
const BORED: Omit<Hero, "rim"> = { pose: "point", expression: "smug", yaw: 0.6 };

export const CAMPAIGN_THUMB_VARIANTS: ThumbVariant[] = [
  {
    // The four traps, one per act.
    hero: { pose: "idle", expression: "smug", yaw: 0.35, rim: "#ffd84d" },
    panels: [
      { segment: "entrance", frame: beat("entrance", "bladeHit") + 2, camera: { position: [-1.0, 1.6, 6.2], lookAt: [-1.0, 1.0, -0.6] } },
      { segment: "hallway", frame: beat("hallway", "skewer") - 3, camera: { position: [PALADIN_YANK_X + 0.8, 1.6, 4.6], lookAt: [PALADIN_YANK_X + 0.8, 1.05, -0.6] } },
      { segment: "vault", frame: beat("vault", "crush1") - 4, camera: { position: [0, 1.6, 5.6], lookAt: [0, 1.0, -0.6] } },
      {
        segment: "gallery",
        frame: Math.round(SLOWMO[0] + (SLOWMO[1] - SLOWMO[0]) * 0.45),
        camera: { position: [ROGUE_PLATE_X - 0.9, 2.3, GALLERY_Z + 4.4], lookAt: [ROGUE_PLATE_X - 0.5, 0.95, GALLERY_Z] },
      },
    ],
    lines: [{ text: "0 SURVIVORS", size: 104, color: "#ff5d4d" }],
  },
  {
    // The stuffed Mimic beside the Dungeon Core.
    hero: { ...BORED, rim: "#ff3a6a" },
    panels: [{ segment: "bridge3", frame: beat("bridge3", "board") - 6, camera: { position: [-6.6, -6.0, 6.6], lookAt: [-6.6, -6.5, -0.6] } }],
    lines: [
      { text: "IT ATE", size: 120, color: "#ffffff" },
      { text: "THEM ALL", size: 120, color: "#ffd84d" },
    ],
  },
  {
    // The spiked iron ball, the magnet yanking a paladin into it.
    hero: { ...BORED, rim: "#5fd8ff" },
    panels: [
      { segment: "hallway", frame: beat("hallway", "skewer") - 3, camera: { position: [PALADIN_YANK_X - 0.6, 1.4, 6.2], lookAt: [PALADIN_YANK_X - 0.6, 1.05, -0.6] } },
    ],
    lines: [
      { text: "THE TRAPS", size: 110, color: "#ffffff" },
      { text: "LEARN", size: 150, color: "#ff5d4d" },
    ],
  },
  {
    // The four hallway doors.
    hero: { ...BORED, rim: "#ffb03a" },
    panels: [{ segment: "cold", frame: beat("cold", "descend") - 2, camera: { position: [-1.8, 2.3, 10.2], lookAt: [-1.8, 1.9, -1.2] } }],
    lines: [
      { text: "PICK A", size: 120, color: "#ffffff" },
      { text: "DOOR", size: 170, color: "#ffd84d" },
    ],
  },
  {
    // The Guild's new barbarian at the board.
    hero: { ...BORED, rim: "#7dff5a" },
    panels: [{ segment: "finale", frame: beat("finale", "barbarian") + 16, camera: { position: [-82.2, 2.2, 5.6], lookAt: [-82.2, 1.75, -0.4] } }],
    lines: [
      { text: "THEY HIRED", size: 100, color: "#ffffff" },
      { text: "A BARBARIAN", size: 108, color: "#7dff5a" },
    ],
  },
];

/** A segment frozen at its local frame (the still is taken at STILL_FRAME). */
const SceneShot: React.FC<{ panel: Panel }> = ({ panel }) => {
  const def = SEGMENT_DEFS[panel.segment];
  const config: EpisodeConfig = {
    ...def.config,
    camera: {
      ...def.config.camera,
      initialPosition: panel.camera.position,
      waypoints: [{ frame: 0, position: panel.camera.position, lookAt: panel.camera.lookAt }],
      tracks: [],
      shake: [],
      rumbles: [],
    },
    overlays: { ...def.config.overlays, grade: "saturate(1.35) contrast(1.1) brightness(1.08)" },
  };
  return (
    <Sequence from={STILL_FRAME - panel.frame} layout="none">
      <EpisodeCanvas config={config} Scene={def.Scene} />
    </Sequence>
  );
};

/** Points the hero camera at the paladin's chest. */
const LookAt: React.FC<{ target: Vec3 }> = ({ target }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, target]);
  return null;
};

/** The paladin in close-up on a transparent canvas, filling the left of the frame. */
const HeroLayer: React.FC<{ hero: Hero }> = ({ hero }) => {
  const { width, height } = useVideoConfig();
  const dx = 0.66;
  const sticker =
    "drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 12px 24px rgba(0,0,0,0.75))";
  return (
    <AbsoluteFill style={{ filter: sticker }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 30, near: 0.1, far: 50, position: [dx, 1.3, 3.0] }} gl={{ alpha: true }}>
        <LookAt target={[dx, 1.16, 0]} />
        <SceneEnvironment intensity={0.5} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[2.5, 3, 4]} intensity={2.6} color="#fff1dd" />
        <directionalLight position={[-3, 2.5, -2.5]} intensity={5} color={hero.rim} />
        <directionalLight position={[3, 1.5, -2.5]} intensity={3.5} color={hero.rim} />
        <AdventurerUnit classType="paladin" pose={hero.pose} expression={hero.expression} weapon={hero.weapon} animFrame={12} rotation={[0, hero.yaw, 0]} scale={1} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const Headline: React.FC<{ lines: Line[] }> = ({ lines }) => (
  <div
    style={{
      position: "absolute",
      top: 22,
      right: 40,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      fontFamily: `'${FONT_FAMILY}', 'Arial Black', sans-serif`,
      transform: "rotate(-2deg)",
    }}
  >
    {lines.map((line) => (
      <div
        key={line.text}
        style={{
          fontSize: line.size,
          lineHeight: 0.95,
          color: line.color,
          whiteSpace: "nowrap",
          WebkitTextStroke: `${Math.round(line.size / 9)}px #111`,
          paintOrder: "stroke fill",
          textShadow: `0 ${Math.round(line.size / 14)}px 0 #111, 0 12px 26px rgba(0,0,0,0.8)`,
        }}
      >
        {line.text}
      </div>
    ))}
  </div>
);

/** 2x2 grid of moments on the right, white-bordered like stickers. */
const Grid: React.FC<{ panels: Panel[] }> = ({ panels }) => {
  const W = 352;
  const H = 216;
  const x0 = 514;
  const y0 = 170;
  return (
    <>
      {panels.map((panel, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return (
          <div
            key={`${panel.segment}-${i}`}
            style={{
              position: "absolute",
              left: x0 + col * (W + 22),
              top: y0 + row * (H + 22),
              width: W,
              height: H,
              overflow: "hidden",
              border: "6px solid #fff",
              borderRadius: 14,
              boxShadow: "0 10px 26px rgba(0,0,0,0.7)",
              transform: `rotate(${(col === row ? -1 : 1) * 1.5}deg)`,
              background: "#111",
            }}
          >
            {/* The scene renders at full size and is scaled into the tile. */}
            <div style={{ width: 1280, height: 720, transform: `scale(${W / 1280 + 0.005})`, transformOrigin: "0 0" }}>
              <SceneShot panel={panel} />
            </div>
          </div>
        );
      })}
    </>
  );
};

type ThumbProps = { variant: number; frame?: number; count?: number };

/** Every variant is a still at STILL_FRAME; hands the render script the variant count. */
export const campaignThumbMetadata: CalculateMetadataFunction<ThumbProps> = ({ props }) => ({
  props: { ...props, frame: STILL_FRAME, count: CAMPAIGN_THUMB_VARIANTS.length },
});

export const CampaignThumbnail: React.FC<ThumbProps> = ({ variant }) => {
  useDisplayFont();
  const v = CAMPAIGN_THUMB_VARIANTS[variant] ?? CAMPAIGN_THUMB_VARIANTS[0];
  const grid = v.panels.length > 1;
  return (
    <AbsoluteFill style={{ backgroundColor: "#15121c" }}>
      {grid ? (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 25% 55%, ${v.hero.rim}44 0%, rgba(0,0,0,0) 50%), linear-gradient(135deg, #2a1f3a 0%, #120f18 100%)` }} />
      ) : (
        <>
          <SceneShot panel={v.panels[0]} />
          {/* Darken only behind the hero and the headline so the scene stays crisp */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 38%), linear-gradient(200deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 32%)`,
            }}
          />
        </>
      )}
      {grid ? <Grid panels={v.panels} /> : null}
      <HeroLayer hero={v.hero} />
      <Headline lines={v.lines} />
    </AbsoluteFill>
  );
};
