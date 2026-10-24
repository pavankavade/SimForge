import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { SfxTrack } from "../../engine/SfxTrack";
import { Caption } from "../../toon/Caption";
import { Character, headCenter } from "../../toon/Character";
import { INK } from "../../toon/Face";
import {
  CrackDecal,
  DustPuff,
  ImpactStar,
  OrbitStars,
  SpeedLines,
  Splinters,
} from "../../toon/Fx";
import {
  Barrel,
  Cannon,
  Cannonball,
  FarLayers,
  ShipLayer,
} from "../../toon/ShipDeck";
import {
  BALL_R,
  BEATS,
  DISSOLVE,
  HURT_AT,
  IMPACT,
  ROOT,
  SHOTS,
  SLIP,
  ballAt,
  captionWords,
  faceAt,
  hop,
  poseAt,
  signAt,
  type Cam,
} from "./timeline";

const layer = (c: Cam, p: number) => {
  const z = 1 + (c.zoom - 1) * p;
  const fx = 540 + (c.fx - 540) * p;
  const fy = 960 + (c.fy - 960) * p;
  return `translate(540,960) rotate(${c.rot * p}) scale(${z}) translate(${-fx},${-fy})`;
};

const LevelSign: React.FC<{ frame: number }> = ({ frame }) => {
  const { y, swing } = signAt(frame);
  if (y < -650) return null;
  return (
    <g transform={`translate(560,${y}) rotate(${swing})`}>
      <path
        d="M-120,-60 L-90,-900 M120,-60 L90,-900"
        stroke="#6b4a2e"
        strokeWidth={8}
      />
      <rect
        x={-200}
        y={-70}
        width={400}
        height={150}
        rx={18}
        fill="#c98a4c"
        stroke={INK}
        strokeWidth={8}
      />
      <path
        d="M-186,-20 L186,-20 M-186,34 L186,34"
        stroke="#a46a34"
        strokeWidth={4}
      />
      <rect
        x={-200}
        y={-70}
        width={400}
        height={30}
        rx={14}
        fill="#e6ac6c"
        opacity={0.6}
      />
      {[-170, 170].map((x) => (
        <circle
          key={x}
          cx={x}
          cy={-40}
          r={9}
          fill="#5c5f68"
          stroke={INK}
          strokeWidth={3}
        />
      ))}
      <text
        x={0}
        y={34}
        textAnchor="middle"
        fontFamily="'Arial Black', 'Segoe UI Black', sans-serif"
        fontWeight={900}
        fontSize={92}
        fill="#fff1c8"
        stroke={INK}
        strokeWidth={10}
        paintOrder="stroke"
      >
        LEVEL 1
      </text>
    </g>
  );
};

const World: React.FC<{ frame: number; cam: Cam }> = ({ frame, cam }) => {
  const pose = poseAt(frame);
  const face = faceAt(frame);
  const lift = hop(frame);
  const root: [number, number] = [ROOT[0], ROOT[1] - lift];
  const ball = ballAt(frame);
  const bx = ROOT[0] + ball.p[0];
  const by = ball.held ? root[1] + ball.p[1] : ROOT[1] + ball.p[1];
  const hc = headCenter(pose);
  const falling = frame >= SLIP + 2 && frame < IMPACT;
  const ballNode = (
    <Cannonball
      x={ball.held ? ball.p[0] : bx}
      y={ball.held ? ball.p[1] : by}
      r={BALL_R}
      spin={ball.spin}
    />
  );

  return (
    <svg
      viewBox="0 0 1080 1920"
      width={1080}
      height={1920}
      style={{ position: "absolute", inset: 0 }}
    >
      <defs>
        <filter id="dof" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={3.2} />
        </filter>
      </defs>
      <g transform={layer(cam, 0.3)} filter="url(#dof)">
        <FarLayers />
      </g>
      <g transform={layer(cam, 1)}>
        <ShipLayer />
        <Barrel x={190} y={1300} s={0.9} />
        <Barrel x={330} y={1250} s={0.75} />
        <Cannon x={905} y={1330} />
        {frame >= IMPACT ? (
          <CrackDecal x={ROOT[0] + 90} y={ROOT[1] - 2} />
        ) : null}
        <ellipse
          cx={ROOT[0] + pose.hip[0] * 0.6}
          cy={ROOT[1] + 4}
          rx={150 * (1 - lift / 160)}
          ry={26 * (1 - lift / 160)}
          fill="#3b1a08"
          opacity={0.3}
        />
        {!ball.held ? (
          <ellipse
            cx={bx}
            cy={ROOT[1] + 4}
            rx={60}
            ry={14}
            fill="#3b1a08"
            opacity={0.3 * Math.min(1, 300 / (ROOT[1] - by + 1))}
          />
        ) : null}
        <LevelSign frame={frame} />
        <Character
          id="pirate"
          root={root}
          pose={pose}
          face={face}
          sway={Math.sin(frame * 0.18) * 3}
          held={ball.held ? ballNode : null}
        />
        {!ball.held ? (
          <>
            {falling ? <SpeedLines x={bx} y={by} length={90} /> : null}
            {ballNode}
          </>
        ) : null}
        <ImpactStar
          frame={frame}
          at={IMPACT}
          x={ROOT[0] + 85}
          y={ROOT[1] - 30}
        />
        <DustPuff frame={frame} at={IMPACT} x={ROOT[0] + 80} y={ROOT[1]} />
        <Splinters
          frame={frame}
          at={IMPACT}
          x={ROOT[0] + 85}
          y={ROOT[1] - 10}
        />
        <OrbitStars
          frame={frame}
          from={HURT_AT}
          x={root[0] + hc[0]}
          y={root[1] + hc[1] - 150}
        />
      </g>
    </svg>
  );
};

export const ToonTest: React.FC = () => {
  const frame = useCurrentFrame();
  const live = SHOTS.map((s, i) => ({ s, i })).filter(
    ({ s }) => frame >= s.from && frame < s.to,
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {live.map(({ s, i }) => (
        <AbsoluteFill
          key={i}
          style={{
            zIndex: i,
            opacity: i > 0 ? Math.min(1, (frame - s.from + 1) / DISSOLVE) : 1,
          }}
        >
          <World frame={frame} cam={s.cam(frame)} />
        </AbsoluteFill>
      ))}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,214,150,0.18), rgba(255,214,150,0) 55%), radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(40,18,10,0.42) 100%)",
          zIndex: 10,
        }}
      />
      <AbsoluteFill style={{ zIndex: 11 }}>
        <Caption frame={frame} words={captionWords} />
      </AbsoluteFill>
      <Audio src={staticFile("episodes/toon-test/narration_v1.mp3")} />
      <SfxTrack
        cues={[
          {
            src: "episodes/toon-test/sfx/pop.wav",
            frame: BEATS.level - 3,
            volume: 0.45,
          },
          {
            src: "episodes/toon-test/sfx/lift.wav",
            frame: BEATS.heavy - 10,
            volume: 0.6,
          },
          {
            src: "episodes/toon-test/sfx/drop.wav",
            frame: SLIP + 1,
            volume: 0.55,
          },
          {
            src: "episodes/toon-test/sfx/crunch.wav",
            frame: IMPACT,
            volume: 0.9,
          },
        ]}
      />
    </AbsoluteFill>
  );
};
