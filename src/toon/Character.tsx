import React from "react";
import { INK, Face, type FaceState } from "./Face";
import { hosePath, rotate, type Vec } from "./math";

/** All coordinates are relative to the character root (ground point between the feet). */
export interface Pose extends Record<string, number | Vec> {
  hip: Vec;
  lean: number;
  head: number;
  handB: Vec;
  handF: Vec;
  footB: Vec;
  footF: Vec;
}

export interface Outfit {
  bandana: string;
  stripeA: string;
  stripeB: string;
}

export const PIRATE: Outfit = {
  bandana: "#dc3a2c",
  stripeA: "#d8352b",
  stripeB: "#fbf6ee",
};

const LEG = 400;
const ARM = 300;
const HEAD_R = 128;
const SHOULDER: Vec = [58, -212];
const NECK = -250;
const HIP_W = 26;

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];

export const headCenter = (pose: Pose): Vec =>
  add(
    add(pose.hip, rotate([0, NECK], pose.lean)),
    rotate([0, -HEAD_R + 12], pose.lean + pose.head),
  );

const TORSO =
  "M-72,0 C-86,-80 -80,-190 -54,-238 Q0,-282 54,-238 C80,-190 86,-80 72,0 Q0,26 -72,0 Z";

const Stripes: React.FC<{ outfit: Outfit; id: string }> = ({ outfit, id }) => (
  <g clipPath={`url(#${id}-torso)`}>
    <rect x={-100} y={-300} width={200} height={340} fill={outfit.stripeB} />
    {[-262, -192, -122, -52].map((y) => (
      <path
        key={y}
        d={`M-100,${y} Q0,${y + 14} 100,${y} L100,${y + 36} Q0,${y + 50} -100,${y + 36} Z`}
        fill={outfit.stripeA}
      />
    ))}
    <rect
      x={-100}
      y={-300}
      width={200}
      height={340}
      fill={`url(#${id}-torsoShade)`}
    />
    <rect x={-120} y={-14} width={240} height={50} fill={INK} opacity={0.85} />
  </g>
);

const Bandana: React.FC<{ color: string; id: string; sway: number }> = ({
  color,
  id,
  sway,
}) => {
  const dots: Vec[] = [
    [-70, -88],
    [-20, -108],
    [32, -96],
    [80, -70],
    [-95, -45],
    [-40, -60],
    [10, -55],
    [60, -40],
    [100, -30],
    [-10, -120],
  ];
  return (
    <>
      <g transform={`translate(-118,-34) rotate(${sway})`}>
        <path
          d="M0,0 C-30,10 -52,40 -60,78 L-38,84 C-30,50 -14,24 6,12 Z"
          fill={color}
          stroke={INK}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <path
          d="M2,4 C-20,30 -26,62 -18,100 L4,96 C0,64 6,36 16,14 Z"
          fill={color}
          stroke={INK}
          strokeWidth={6}
          strokeLinejoin="round"
        />
      </g>
      <g clipPath={`url(#${id}-head)`}>
        <path
          d={`M-140,-150 L140,-150 L140,-30 Q0,2 -140,-24 Z`}
          fill={color}
        />
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={7} fill="#fff6ec" />
        ))}
        <path
          d={`M-140,-150 L140,-150 L140,-30 Q0,2 -140,-24 Z`}
          fill={`url(#${id}-capShade)`}
        />
        <path
          d="M-140,-24 Q0,2 140,-30"
          fill="none"
          stroke={INK}
          strokeWidth={6}
        />
      </g>
      <ellipse
        cx={-120}
        cy={-36}
        rx={22}
        ry={18}
        fill={color}
        stroke={INK}
        strokeWidth={6}
      />
    </>
  );
};

export const Character: React.FC<{
  id: string;
  root: Vec;
  pose: Pose;
  face: FaceState;
  outfit?: Outfit;
  sway?: number;
  /** Rendered between the head and the front arm, e.g. a held prop. */
  held?: React.ReactNode;
}> = ({ id, root, pose, face, outfit = PIRATE, sway = 0, held }) => {
  const hip = pose.hip;
  const shB = add(hip, rotate([-SHOULDER[0], SHOULDER[1]], pose.lean));
  const shF = add(hip, rotate(SHOULDER, pose.lean));
  const hipB: Vec = [hip[0] - HIP_W, hip[1] - 6];
  const hipF: Vec = [hip[0] + HIP_W, hip[1] - 6];
  const hc = headCenter(pose);
  const limb = {
    fill: "none",
    stroke: INK,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const foot = (p: Vec, key: string) => (
    <g key={key} transform={`translate(${p[0]},${p[1]})`}>
      <path
        d="M-14,-16 Q-18,4 6,4 L34,4 Q46,2 42,-8 Q36,-20 10,-20 Z"
        fill={INK}
      />
      <path
        d="M8,-15 Q24,-16 34,-10"
        stroke="#5b4a48"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
  const hand = (p: Vec) => (
    <circle
      cx={p[0]}
      cy={p[1]}
      r={21}
      fill={`url(#${id}-skin)`}
      stroke={INK}
      strokeWidth={6}
    />
  );

  // A hand raised above the head passes behind it (only the hand stays in front), so the arm never
  // slices across the face.
  const raised = pose.handF[1] < hc[1] - HEAD_R * 0.4;
  const frontArm = (
    <>
      <path d={hosePath(shF, pose.handF, ARM, -1)} {...limb} strokeWidth={11} />
      {hand(pose.handF)}
    </>
  );

  return (
    <g transform={`translate(${root[0]},${root[1]})`}>
      <defs>
        <radialGradient id={`${id}-skin`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f4f2ee" />
          <stop offset="1" stopColor="#c9c6d0" />
        </radialGradient>
        <linearGradient id={`${id}-torsoShade`} x1="0" x2="1" y1="0" y2="0.3">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.18} />
          <stop offset="0.45" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#2a1030" stopOpacity={0.38} />
        </linearGradient>
        <radialGradient id={`${id}-capShade`} cx="0.3" cy="0.1" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity={0.25} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#3a0a10" stopOpacity={0.35} />
        </radialGradient>
        <clipPath id={`${id}-torso`}>
          <path d={TORSO} />
        </clipPath>
        <clipPath id={`${id}-head`}>
          <circle r={HEAD_R} />
        </clipPath>
      </defs>

      <path d={hosePath(shB, pose.handB, ARM, 1)} {...limb} strokeWidth={11} />
      {hand(pose.handB)}
      <path
        d={hosePath(hipB, pose.footB, LEG, -1)}
        {...limb}
        strokeWidth={12}
      />
      <path
        d={hosePath(hipF, pose.footF, LEG, -1)}
        {...limb}
        strokeWidth={12}
      />
      {foot(pose.footB, "fb")}
      {foot(pose.footF, "ff")}

      <g transform={`translate(${hip[0]},${hip[1]}) rotate(${pose.lean})`}>
        <Stripes outfit={outfit} id={id} />
        <path d={TORSO} fill="none" stroke={INK} strokeWidth={7} />
      </g>

      {raised ? frontArm : null}
      <g
        transform={`translate(${hc[0]},${hc[1]}) rotate(${pose.lean + pose.head})`}
      >
        <circle r={HEAD_R} fill={`url(#${id}-skin)`} />
        <Face state={face} />
        <Bandana color={outfit.bandana} id={id} sway={sway} />
        <circle r={HEAD_R} fill="none" stroke={INK} strokeWidth={7} />
      </g>

      {held}
      {raised ? hand(pose.handF) : frontArm}
    </g>
  );
};
