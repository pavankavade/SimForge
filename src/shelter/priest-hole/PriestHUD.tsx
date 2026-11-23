import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import type { CameraPose } from "../../engine/types";
import { createTrapHUD } from "../../kit/TrapHUD";
import { camPose } from "./camera";
import { ROPE_IN_A, ROPE_OUT_A } from "./ropes";
import { BEATS, ROPE_IN, ROPE_OUT, SHOTS, type V3 } from "./timeline";

/** Title card and end stamp; the big word captions carry the story. */
const TrapHUD = createTrapHUD({
  kicker: "HOW A STAIRCASE BECOMES",
  title: "A PRIEST HOLE",
  stages: [],
  end: {
    label: "HIDE STATUS",
    stamp: "UNFINDABLE",
    at: BEATS.congrats,
    color: "#38c172",
  },
});

const W = 1080;
const H = 1920;
const FOV = (40 * Math.PI) / 180;

/** Where a world point lands on the 1080x1920 frame for a camera pose. */
const project = (p: V3, cam: CameraPose): [number, number] => {
  const [px, py, pz] = cam.position;
  const f = [cam.lookAt[0] - px, cam.lookAt[1] - py, cam.lookAt[2] - pz];
  const fl = Math.hypot(f[0], f[1], f[2]);
  const fw = [f[0] / fl, f[1] / fl, f[2] / fl];
  // right = forward x up(0,1,0); up' = right x forward
  const r = [-fw[2], 0, fw[0]];
  const rl = Math.hypot(r[0], r[2]);
  const rt = [r[0] / rl, 0, r[2] / rl];
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  const v = [p[0] - px, p[1] - py, p[2] - pz];
  const x = v[0] * rt[0] + v[1] * rt[1] + v[2] * rt[2];
  const y = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
  const z = v[0] * fw[0] + v[1] * fw[1] + v[2] * fw[2];
  const t = Math.tan(FOV / 2);
  return [((x / (z * t * (W / H)) + 1) / 2) * W, ((1 - y / (z * t)) / 2) * H];
};

const STROKE = "0 0 4px #000, 0 0 4px #000, 0 4px 0 #000, 3px 3px 0 #000, -3px 3px 0 #000";

/** A length written over a rope once it is drawn, popping in. */
const RopeLabel: React.FC<{ frame: number; at: number; text: string; point: V3; dy: number; color: string }> = ({ frame, at, text, point, dy, color }) => {
  if (frame < at || frame >= SHOTS.shaft) return null;
  const [x, y] = project(point, camPose(frame));
  const pop = interpolate(frame, [at, at + 8], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  return (
    <div
      style={{
        position: "absolute",
        left: x - 200,
        top: y + dy - 50,
        width: 400,
        textAlign: "center",
        fontFamily: "'Arial Black', 'Arial', sans-serif",
        fontWeight: 900,
        fontSize: 84,
        color,
        textShadow: STROKE,
        transform: `scale(${pop})`,
      }}
    >
      {text}
    </div>
  );
};

export const PriestHUD: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <RopeLabel frame={frame} at={ROPE_OUT[1]} text="60 FT" point={[-3.4, ROPE_OUT_A[1], ROPE_OUT_A[2]]} dy={-62} color="#ffffff" />
      <RopeLabel frame={frame} at={ROPE_IN[1]} text="55 FT" point={[2.3, ROPE_IN_A[1], ROPE_IN_A[2]]} dy={-62} color="#ffd84d" />
      <TrapHUD />
    </>
  );
};
