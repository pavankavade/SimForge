import React from "react";
import { INK } from "./Face";
import { rand } from "./math";

/** Wooden splinters bursting from `at`, frame-pure. */
export const Splinters: React.FC<{
  frame: number;
  at: number;
  x: number;
  y: number;
  count?: number;
  seed?: number;
}> = ({ frame, at, x, y, count = 34, seed = 1 }) => {
  const t = frame - at;
  if (t < 0 || t > 32) return null;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = (-90 + (rand(seed * 100 + i) - 0.5) * 150) * (Math.PI / 180);
        const v = 26 + rand(seed * 200 + i) * 34;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 2.2 * t * t;
        const len = 44 + rand(seed * 300 + i) * 70;
        const rot =
          rand(seed * 400 + i) * 360 + t * (rand(seed * 500 + i) - 0.5) * 50;
        const op = t > 24 ? (32 - t) / 8 : 1;
        const tone =
          i % 3 === 0 ? "#e2a868" : i % 3 === 1 ? "#c4844b" : "#a76533";
        return (
          <path
            key={i}
            transform={`translate(${px},${py}) rotate(${rot})`}
            d={`M${-len / 2},0 L${-len / 4},-6 L${len / 2},-2 L${len / 4},7 Z`}
            fill={tone}
            stroke="#6b3a17"
            strokeWidth={3}
            strokeLinejoin="round"
            opacity={op}
          />
        );
      })}
    </g>
  );
};

export const DustPuff: React.FC<{
  frame: number;
  at: number;
  x: number;
  y: number;
  seed?: number;
}> = ({ frame, at, x, y, seed = 3 }) => {
  const t = frame - at;
  if (t < 0 || t > 26) return null;
  const k = t / 26;
  const spread = 1 - Math.pow(1 - k, 3);
  const puffs = Array.from({ length: 7 }, (_, i) => {
    const dir = (i / 6 - 0.5) * 2;
    return {
      cx: x + dir * 170 * spread,
      cy: y - 30 - (1 - Math.abs(dir)) * 70 * spread,
      r: (34 + rand(seed + i) * 26) * (0.5 + spread * 0.9),
    };
  });
  return (
    <g opacity={k > 0.5 ? (1 - k) * 2 : 1}>
      {puffs.map((p, i) => (
        <circle key={`b${i}`} cx={p.cx} cy={p.cy} r={p.r + 5} fill="#c9a77a" />
      ))}
      {puffs.map((p, i) => (
        <circle key={`f${i}`} cx={p.cx} cy={p.cy} r={p.r} fill="#f6ead2" />
      ))}
      {puffs.map((p, i) => (
        <circle
          key={`h${i}`}
          cx={p.cx - p.r * 0.25}
          cy={p.cy - p.r * 0.3}
          r={p.r * 0.45}
          fill="#fffaf0"
        />
      ))}
    </g>
  );
};

/** Short, bright cartoon impact star; lives 5 frames. */
export const ImpactStar: React.FC<{
  frame: number;
  at: number;
  x: number;
  y: number;
}> = ({ frame, at, x, y }) => {
  const t = frame - at;
  if (t < 0 || t > 5) return null;
  const s = 0.7 + t * 0.22;
  const pts = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const r = i % 2 === 0 ? 150 : 60;
    return `${Math.cos(a) * r},${Math.sin(a) * r * 0.6}`;
  }).join(" ");
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={1 - t / 6}>
      <polygon
        points={pts}
        fill="#fff4b0"
        stroke="#ffb02e"
        strokeWidth={8}
        strokeLinejoin="round"
      />
    </g>
  );
};

export const CrackDecal: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y}) scale(1,0.4)`}>
    <ellipse rx={70} ry={40} fill="#5a2c10" opacity={0.35} />
    <path
      d="M-80,0 L-40,-8 L-20,10 L10,-4 L40,14 L84,4 M-20,10 L-30,40 M10,-4 L20,-44 M40,14 L60,46"
      stroke="#3a1a08"
      strokeWidth={7}
      fill="none"
      strokeLinejoin="round"
    />
  </g>
);

/** Little stars orbiting a point (dizzy / pain). */
export const OrbitStars: React.FC<{
  frame: number;
  from: number;
  x: number;
  y: number;
}> = ({ frame, from, x, y }) => {
  const t = frame - from;
  if (t < 0) return null;
  const grow = Math.min(1, t / 5);
  return (
    <g transform={`translate(${x},${y}) scale(${grow})`}>
      {[0, 1, 2].map((i) => {
        const a = t * 0.22 + (i * Math.PI * 2) / 3;
        const sx = Math.cos(a) * 150;
        const sy = Math.sin(a) * 34;
        const pts = Array.from({ length: 10 }, (_, k) => {
          const b = (k / 10) * Math.PI * 2 - Math.PI / 2;
          const r = k % 2 === 0 ? 24 : 10;
          return `${Math.cos(b) * r},${Math.sin(b) * r}`;
        }).join(" ");
        return (
          <polygon
            key={i}
            transform={`translate(${sx},${sy})`}
            points={pts}
            fill="#ffd84d"
            stroke={INK}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
};

export const SpeedLines: React.FC<{ x: number; y: number; length: number }> = ({
  x,
  y,
  length,
}) => (
  <g stroke="#ffffff" strokeWidth={7} strokeLinecap="round" opacity={0.85}>
    {[-38, 0, 38].map((dx, i) => (
      <path
        key={dx}
        d={`M${x + dx},${y - 70 - i * 10} l0,${-length * (i === 1 ? 1.2 : 0.8)}`}
      />
    ))}
  </g>
);
