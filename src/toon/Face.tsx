import React from "react";

export const INK = "#22161a";

export type Eyes = "open" | "half" | "happy" | "squeeze" | "wide" | "closed";
export type Mouth = "flat" | "smirk" | "grin" | "grit" | "o" | "wail";

export interface Expression {
  eyes: Eyes;
  /** Brow angles in degrees for [back, front]; positive tilts the inner end down (angry). */
  brows: [number, number];
  /** Brow lift in px for [back, front]. */
  lift: [number, number];
  mouth: Mouth;
  sweat?: boolean;
  tears?: boolean;
}

export const EXPRESSIONS = {
  bored: { eyes: "half", brows: [0, 0], lift: [0, 0], mouth: "flat" },
  smug: { eyes: "half", brows: [-6, 14], lift: [-2, 12], mouth: "smirk" },
  strain: {
    eyes: "squeeze",
    brows: [18, 18],
    lift: [0, 0],
    mouth: "grit",
    sweat: true,
  },
  proud: { eyes: "happy", brows: [-8, -8], lift: [8, 8], mouth: "grin" },
  shock: { eyes: "wide", brows: [-18, -18], lift: [20, 20], mouth: "o" },
  pain: {
    eyes: "squeeze",
    brows: [-20, -20],
    lift: [8, 8],
    mouth: "wail",
    tears: true,
  },
} satisfies Record<string, Expression>;

export type ExpressionName = keyof typeof EXPRESSIONS;

export interface FaceState {
  expr: ExpressionName;
  /** 0 = open, 1 = half-closed blink frame, 2 = fully closed. */
  blink: 0 | 1 | 2;
  /** Frames since the face last swapped, drives the tiny pop and the sweat slide. */
  age: number;
}

const FX = 14;
const EYE_Y = 30;
const EYE_DX = 40;

const Eye: React.FC<{ kind: Eyes; side: -1 | 1 }> = ({ kind, side }) => {
  const s = {
    stroke: INK,
    strokeWidth: 7,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  switch (kind) {
    case "open":
      return (
        <g>
          <ellipse rx={11} ry={16} fill={INK} />
          <circle cx={-3} cy={-6} r={3.5} fill="#fff" />
        </g>
      );
    case "half":
      return (
        <g>
          <path d="M-12,0 A12,13 0 0 0 12,0 Z" fill={INK} />
          <path d="M-17,-1 L17,-1" {...s} />
        </g>
      );
    case "happy":
      return <path d="M-15,6 Q0,-14 15,6" {...s} />;
    case "squeeze":
      return (
        <path
          d={side < 0 ? "M-12,-12 L12,0 L-12,12" : "M12,-12 L-12,0 L12,12"}
          {...s}
          strokeLinejoin="round"
        />
      );
    case "wide":
      return (
        <g>
          <circle r={24} fill="#fff" stroke={INK} strokeWidth={6} />
          <circle r={7} fill={INK} />
        </g>
      );
    case "closed":
      return <path d="M-15,2 Q0,8 15,2" {...s} />;
  }
};

const MouthShape: React.FC<{ kind: Mouth }> = ({ kind }) => {
  const s = {
    stroke: INK,
    strokeWidth: 7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "flat":
      return <path d="M-14,0 L14,0" {...s} fill="none" />;
    case "smirk":
      return <path d="M-18,4 Q4,8 20,-8" {...s} fill="none" />;
    case "grin":
      return (
        <g>
          <path
            d="M-34,-6 Q0,-2 34,-6 Q30,36 0,38 Q-30,36 -34,-6 Z"
            fill="#4a1418"
            {...s}
          />
          <path d="M-28,-3 Q0,0 28,-3 L26,8 Q0,11 -26,8 Z" fill="#fff" />
          <path d="M-16,30 Q0,18 16,30 Q0,38 -16,30 Z" fill="#e3646a" />
        </g>
      );
    case "grit":
      return (
        <g>
          <rect
            x={-32}
            y={-14}
            width={64}
            height={28}
            rx={12}
            fill="#fff"
            {...s}
          />
          <path
            d="M-32,0 L32,0 M-12,-14 L-12,14 M8,-14 L8,14"
            stroke={INK}
            strokeWidth={4}
          />
        </g>
      );
    case "o":
      return <ellipse rx={15} ry={20} fill="#4a1418" {...s} />;
    case "wail":
      return (
        <g>
          <path
            d="M-30,-14 Q0,-22 30,-14 Q34,34 0,40 Q-34,34 -30,-14 Z"
            fill="#4a1418"
            {...s}
          />
          <path d="M-16,30 Q0,16 16,30 Q0,40 -16,30 Z" fill="#e3646a" />
        </g>
      );
  }
};

export const Face: React.FC<{ state: FaceState }> = ({ state }) => {
  const e: Expression = EXPRESSIONS[state.expr];
  const eyes: Eyes =
    state.blink === 2 ? "closed" : state.blink === 1 ? "half" : e.eyes;
  const pop = state.age < 3 ? 1 + (3 - state.age) * 0.025 : 1;
  const brow = (side: -1 | 1, i: 0 | 1) => (
    <path
      transform={`translate(${FX + side * EYE_DX},${EYE_Y - 34 - e.lift[i]}) rotate(${side * e.brows[i]})`}
      d="M-15,0 L15,0"
      stroke={INK}
      strokeWidth={7}
      strokeLinecap="round"
    />
  );
  const slide = Math.min(state.age, 20);
  return (
    <g transform={`translate(${FX},40) scale(${pop}) translate(${-FX},-40)`}>
      {brow(-1, 0)}
      {brow(1, 1)}
      <g transform={`translate(${FX - EYE_DX},${EYE_Y})`}>
        <Eye kind={eyes} side={-1} />
      </g>
      <g transform={`translate(${FX + EYE_DX},${EYE_Y})`}>
        <Eye kind={eyes} side={1} />
      </g>
      <g
        transform={`translate(${FX + (e.mouth === "smirk" ? 6 : 0)},${EYE_Y + 48})`}
      >
        <MouthShape kind={e.mouth} />
      </g>
      {e.sweat ? (
        <path
          transform={`translate(${FX + 92},${-8 + slide * 1.6})`}
          d="M0,-18 Q12,0 10,8 A10,10 0 0 1 -10,8 Q-12,0 0,-18 Z"
          fill="#8fd4ff"
          stroke={INK}
          strokeWidth={4}
        />
      ) : null}
      {e.tears
        ? [-1, 1].map((side) => (
            <path
              key={side}
              d={`M${FX + side * 52},${EYE_Y + 4} q${side * 26},-6 ${side * 44},${8 + (state.age % 6)}`}
              stroke="#7cc8ff"
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
            />
          ))
        : null}
    </g>
  );
};
