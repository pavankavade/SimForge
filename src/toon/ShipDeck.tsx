import React from "react";
import { rand } from "./math";
import { INK } from "./Face";

const HORIZON = 880;
const RAIL_TOP = 1020;
const DECK_TOP = 1215;
const VP: [number, number] = [540, 330];

export const DECK_Y = 1500;

/** Far layers: sky, clouds, sea stacks, sea. Drawn behind a parallax camera with soft focus. */
export const FarLayers: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#3f9fe8" />
        <stop offset="0.65" stopColor="#8fd0f6" />
        <stop offset="1" stopColor="#d6f0fb" />
      </linearGradient>
      <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#58d0e6" />
        <stop offset="1" stopColor="#1590c4" />
      </linearGradient>
      <linearGradient id="rockLit" x1="0" x2="1">
        <stop offset="0" stopColor="#f1d3a2" />
        <stop offset="0.55" stopColor="#ddb27c" />
        <stop offset="1" stopColor="#b98a5c" />
      </linearGradient>
    </defs>
    <rect
      x={-800}
      y={-600}
      width={2700}
      height={HORIZON + 620}
      fill="url(#sky)"
    />
    {[
      [120, 300, 1.1],
      [760, 180, 1.4],
      [980, 560, 0.9],
      [-120, 640, 1.0],
    ].map(([x, y, s], i) => (
      <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
        <path
          d="M-130,30 Q-140,-10 -95,-14 Q-90,-62 -40,-58 Q-20,-100 30,-80 Q70,-96 90,-50 Q140,-50 140,0 Q150,30 120,34 Z"
          fill="#ffffff"
        />
        <path d="M-130,30 Q-60,6 0,16 Q70,4 120,34 Z" fill="#d7e9f6" />
      </g>
    ))}
    <Stack x={130} w={190} h={560} seed={1} falls />
    <Stack x={430} w={150} h={430} seed={2} />
    <Stack x={820} w={230} h={640} seed={3} falls />
    <Stack x={1120} w={160} h={480} seed={4} />
    <rect
      x={-800}
      y={300}
      width={2700}
      height={HORIZON - 300}
      fill="#cfeaf8"
      opacity={0.28}
    />
    <rect x={-800} y={HORIZON} width={2700} height={700} fill="url(#sea)" />
    {Array.from({ length: 34 }, (_, i) => {
      const x = -300 + rand(i + 3) * 1700;
      const y = HORIZON + 14 + rand(i + 40) * 260;
      const w = 30 + rand(i + 80) * 70 * (1 + (y - HORIZON) / 200);
      return (
        <path
          key={i}
          d={`M${x},${y} q${w / 2},-5 ${w},0`}
          stroke="#c9f4ff"
          strokeWidth={3 + (y - HORIZON) / 90}
          strokeLinecap="round"
          fill="none"
          opacity={0.75}
        />
      );
    })}
  </g>
);

const Stack: React.FC<{
  x: number;
  w: number;
  h: number;
  seed: number;
  falls?: boolean;
}> = ({ x, w, h, seed, falls }) => {
  const top = HORIZON - h;
  const j = (k: number) => (rand(seed * 17 + k) - 0.5) * w * 0.18;
  const body = `M${x - w / 2},${HORIZON} L${x - w / 2 + j(1)},${top + h * 0.6} L${x - w * 0.45 + j(2)},${top + h * 0.3} Q${x - w * 0.4},${top} ${x},${top - 6} Q${x + w * 0.4},${top} ${x + w * 0.46 + j(3)},${top + h * 0.3} L${x + w / 2 + j(4)},${top + h * 0.62} L${x + w / 2},${HORIZON} Z`;
  return (
    <g>
      <path
        d={body}
        fill="url(#rockLit)"
        stroke="#7d5638"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {[0.22, 0.4, 0.58, 0.76].map((t, i) => (
        <path
          key={i}
          d={`M${x - w * 0.46},${top + h * t + j(i + 9)} Q${x},${top + h * t + 14} ${x + w * 0.47},${top + h * t + j(i + 12)}`}
          stroke="#9b6f48"
          strokeWidth={3}
          fill="none"
          opacity={0.7}
        />
      ))}
      {[0.3, 0.55].map((t, i) => (
        <ellipse
          key={i}
          cx={x + w * 0.3 * (i ? -1 : 1)}
          cy={top + h * t}
          rx={w * 0.16}
          ry={14}
          fill="#5aa641"
          stroke="#2f6326"
          strokeWidth={3}
        />
      ))}
      <path
        d={`M${x - w * 0.55},${top + 30} Q${x - w * 0.5},${top - 40} ${x - w * 0.15},${top - 38} Q${x},${top - 70} ${x + w * 0.2},${top - 40} Q${x + w * 0.55},${top - 40} ${x + w * 0.56},${top + 26} Q${x},${top + 46} ${x - w * 0.55},${top + 30} Z`}
        fill="#4f9c38"
        stroke="#2c5c22"
        strokeWidth={4}
      />
      <path
        d={`M${x - w * 0.4},${top + 6} Q${x},${top - 40} ${x + w * 0.35},${top}`}
        stroke="#86cf5c"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      {falls ? (
        <path
          d={`M${x + w * 0.12},${top + 20} L${x + w * 0.24},${top + 20} L${x + w * 0.26},${HORIZON} L${x + w * 0.1},${HORIZON} Z`}
          fill="#f2fbff"
          opacity={0.9}
        />
      ) : null}
    </g>
  );
};

/** The ship: mast, sail, rigging, bulwark and the perspective plank deck. */
export const ShipLayer: React.FC = () => {
  const planks = Array.from({ length: 23 }, (_, i) => i - 11);
  const at = (bottomX: number, y: number) =>
    VP[0] + ((bottomX - VP[0]) * (y - VP[1])) / (2600 - VP[1]);
  return (
    <g>
      <defs>
        <linearGradient id="deckFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3b1a08" stopOpacity={0.45} />
          <stop offset="0.12" stopColor="#3b1a08" stopOpacity={0} />
          <stop offset="0.7" stopColor="#3b1a08" stopOpacity={0} />
          <stop offset="1" stopColor="#3b1a08" stopOpacity={0.35} />
        </linearGradient>
        <radialGradient id="deckPool" cx="0.5" cy="0.35" r="0.5">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="mast" x1="0" x2="1">
          <stop offset="0" stopColor="#e2a868" />
          <stop offset="0.4" stopColor="#c0814a" />
          <stop offset="1" stopColor="#8a5330" />
        </linearGradient>
        <linearGradient id="metal" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c9ced8" />
          <stop offset="0.35" stopColor="#8d93a0" />
          <stop offset="1" stopColor="#4c505c" />
        </linearGradient>
      </defs>

      {/* rigging behind the rail */}
      {[-60, 40, 140].map((x, i) => (
        <path
          key={i}
          d={`M${x + 900},${-400} L${x + 760},${RAIL_TOP}`}
          stroke="#5a3d2a"
          strokeWidth={5}
        />
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const y = -200 + i * 120;
        const t = (y + 400) / (RAIL_TOP + 400);
        return (
          <path
            key={i}
            d={`M${840 - 140 * t},${y} L${1040 - 140 * t},${y}`}
            stroke="#5a3d2a"
            strokeWidth={3}
          />
        );
      })}

      {/* bulwark */}
      <rect
        x={-600}
        y={RAIL_TOP}
        width={2300}
        height={DECK_TOP - RAIL_TOP}
        fill="#a9532f"
      />
      {[RAIL_TOP + 50, RAIL_TOP + 100, RAIL_TOP + 150].map((y) => (
        <path
          key={y}
          d={`M-600,${y} L1700,${y}`}
          stroke="#6e2f1a"
          strokeWidth={4}
        />
      ))}
      {Array.from({ length: 30 }, (_, i) => (
        <path
          key={i}
          d={`M${-560 + rand(i) * 2200},${RAIL_TOP + 25 + Math.floor(rand(i + 9) * 3) * 50} l${30 + rand(i + 4) * 60},2`}
          stroke="#c66f45"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
      {[-420, -160, 100, 360, 720, 980, 1240].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y={RAIL_TOP - 6}
            width={36}
            height={DECK_TOP - RAIL_TOP + 6}
            fill="#8d4126"
            stroke={INK}
            strokeWidth={4}
          />
          <rect
            x={x + 6}
            y={RAIL_TOP}
            width={8}
            height={DECK_TOP - RAIL_TOP - 6}
            fill="#b8643d"
          />
        </g>
      ))}
      <rect
        x={-600}
        y={RAIL_TOP - 34}
        width={2300}
        height={38}
        rx={8}
        fill="#6b2d18"
        stroke={INK}
        strokeWidth={5}
      />
      <rect
        x={-600}
        y={RAIL_TOP - 30}
        width={2300}
        height={10}
        fill="#9a4d2c"
      />
      <rect
        x={-600}
        y={DECK_TOP - 18}
        width={2300}
        height={22}
        fill="#3d1a0c"
        opacity={0.55}
      />

      {/* deck planks */}
      <g>
        <rect x={-600} y={DECK_TOP} width={2300} height={1400} fill="#c4844b" />
        {planks.map((i) => {
          const b0 = VP[0] + i * 170 - 85;
          const b1 = b0 + 170;
          const tone = ["#c98b52", "#bd7c45", "#d09560", "#b97640"][
            (i + 11) % 4
          ];
          const pts = `${at(b0, DECK_TOP)},${DECK_TOP} ${at(b1, DECK_TOP)},${DECK_TOP} ${at(b1, 2600)},2600 ${at(b0, 2600)},2600`;
          return <polygon key={i} points={pts} fill={tone} />;
        })}
        {planks.map((i) => {
          const b = VP[0] + i * 170 - 85;
          return (
            <path
              key={i}
              d={`M${at(b, DECK_TOP)},${DECK_TOP} L${at(b, 2600)},2600`}
              stroke="#5c3015"
              strokeWidth={4}
            />
          );
        })}
        {Array.from({ length: 70 }, (_, k) => {
          const i = Math.floor(rand(k + 200) * 22) - 11;
          const y = DECK_TOP + 20 + Math.pow(rand(k + 300), 1.4) * 1300;
          const b = VP[0] + i * 170 - 85 + 25 + rand(k + 400) * 120;
          const x = at(b, y);
          const len = 40 + rand(k + 500) * 120 * ((y - VP[1]) / 1000);
          const x2 = at(b, y + len);
          return (
            <path
              key={k}
              d={`M${x},${y} Q${x + 6},${y + len / 2} ${x2},${y + len}`}
              stroke="#8f5428"
              strokeWidth={2 + (y - DECK_TOP) / 500}
              fill="none"
              opacity={0.55}
              strokeLinecap="round"
            />
          );
        })}
        {Array.from({ length: 16 }, (_, k) => {
          const i = Math.floor(rand(k + 600) * 20) - 10;
          const y = DECK_TOP + 60 + rand(k + 700) * 1100;
          const b0 = VP[0] + i * 170 - 85;
          return (
            <path
              key={k}
              d={`M${at(b0, y)},${y} L${at(b0 + 170, y)},${y}`}
              stroke="#5c3015"
              strokeWidth={3}
            />
          );
        })}
        <rect
          x={-600}
          y={DECK_TOP}
          width={2300}
          height={1400}
          fill="url(#deckFade)"
        />
        <ellipse cx={560} cy={1420} rx={760} ry={420} fill="url(#deckPool)" />
      </g>

      {/* mast and sail, left */}
      <g transform="translate(150,0)">
        <path
          d="M-260,-500 Q60,-300 120,40 Q150,260 60,520 L-260,560 Z"
          fill="#f3e6c8"
          stroke="#8b7652"
          strokeWidth={5}
        />
        <path
          d="M-260,-500 Q60,-300 120,40 Q150,260 60,520"
          fill="none"
          stroke="#d5c39d"
          strokeWidth={26}
          opacity={0.5}
        />
        {[-160, -60, 40].map((x) => (
          <path
            key={x}
            d={`M${x},-420 Q${x + 90},0 ${x + 30},530`}
            stroke="#d2bf98"
            strokeWidth={4}
            fill="none"
          />
        ))}
        <rect
          x={-118}
          y={-600}
          width={84}
          height={1880}
          fill="url(#mast)"
          stroke={INK}
          strokeWidth={5}
        />
        {[200, 760].map((y) => (
          <rect
            key={y}
            x={-128}
            y={y}
            width={104}
            height={26}
            rx={6}
            fill="#555b66"
            stroke={INK}
            strokeWidth={4}
          />
        ))}
      </g>
    </g>
  );
};

export const Barrel: React.FC<{ x: number; y: number; s?: number }> = ({
  x,
  y,
  s = 1,
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cx={0} cy={6} rx={96} ry={22} fill="#2a1206" opacity={0.3} />
    <path
      d="M-80,0 Q-100,-110 -80,-220 L80,-220 Q100,-110 80,0 Q0,22 -80,0 Z"
      fill="#b8763d"
      stroke={INK}
      strokeWidth={6}
    />
    {[-48, -16, 16, 48].map((sx) => (
      <path
        key={sx}
        d={`M${sx},-226 Q${sx * 1.25},-110 ${sx},6`}
        stroke="#8a5126"
        strokeWidth={4}
        fill="none"
      />
    ))}
    <path
      d="M-80,0 Q-100,-110 -80,-220 L80,-220 Q100,-110 80,0 Q0,22 -80,0 Z"
      fill="url(#barrelShade)"
    />
    {[-30, -190].map((by) => (
      <path
        key={by}
        d={`M-90,${by} Q0,${by + 18} 90,${by} L90,${by - 18} Q0,${by} -90,${by - 18} Z`}
        fill="#6b6f7a"
        stroke={INK}
        strokeWidth={4}
      />
    ))}
    <ellipse
      cx={0}
      cy={-220}
      rx={80}
      ry={20}
      fill="#9a5f2e"
      stroke={INK}
      strokeWidth={6}
    />
    <defs>
      <linearGradient id="barrelShade" x1="0" x2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={0.2} />
        <stop offset="0.5" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#2a0e00" stopOpacity={0.35} />
      </linearGradient>
    </defs>
  </g>
);

export const Cannon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <ellipse cx={0} cy={10} rx={190} ry={30} fill="#2a1206" opacity={0.3} />
    <path
      d="M-150,-60 L120,-60 L150,0 L-170,0 Z"
      fill="#a0532c"
      stroke={INK}
      strokeWidth={6}
      strokeLinejoin="round"
    />
    <path
      d="M-200,-170 Q-215,-120 -190,-90 L190,-140 Q205,-170 190,-196 Z"
      fill="url(#metal)"
      stroke={INK}
      strokeWidth={6}
      strokeLinejoin="round"
    />
    <ellipse
      cx={196}
      cy={-168}
      rx={18}
      ry={34}
      fill="#3c3f48"
      stroke={INK}
      strokeWidth={6}
    />
    <ellipse cx={200} cy={-168} rx={8} ry={18} fill="#111" />
    <path
      d="M-180,-160 L170,-182"
      stroke="#eef2f8"
      strokeWidth={8}
      strokeLinecap="round"
      opacity={0.7}
    />
    {[-110, 90].map((wx) => (
      <g key={wx} transform={`translate(${wx},-20)`}>
        <circle r={52} fill="#c2552c" stroke={INK} strokeWidth={6} />
        <circle r={16} fill="#5a2a14" stroke={INK} strokeWidth={4} />
        {[0, 60, 120].map((a) => (
          <path
            key={a}
            transform={`rotate(${a})`}
            d="M-46,0 L46,0"
            stroke="#7d3218"
            strokeWidth={6}
          />
        ))}
      </g>
    ))}
  </g>
);

export const Cannonball: React.FC<{
  x: number;
  y: number;
  r?: number;
  spin?: number;
}> = ({ x, y, r = 58, spin = 0 }) => (
  <g transform={`translate(${x},${y})`}>
    <defs>
      <radialGradient id="ball" cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#6c7180" />
        <stop offset="0.45" stopColor="#2c2e36" />
        <stop offset="1" stopColor="#101116" />
      </radialGradient>
    </defs>
    <circle r={r} fill="url(#ball)" stroke={INK} strokeWidth={6} />
    <ellipse
      cx={-r * 0.34}
      cy={-r * 0.38}
      rx={r * 0.26}
      ry={r * 0.15}
      transform={`rotate(-30 ${-r * 0.34} ${-r * 0.38})`}
      fill="#e9eef8"
      opacity={0.75}
    />
    <path
      transform={`rotate(${spin})`}
      d={`M${-r * 0.5},${r * 0.2} Q0,${r * 0.45} ${r * 0.55},${r * 0.1}`}
      stroke="#545866"
      strokeWidth={4}
      fill="none"
    />
  </g>
);
