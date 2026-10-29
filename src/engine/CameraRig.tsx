import type React from "react";
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { CameraConfig, CameraWaypoint } from "./types";

interface CameraRigProps {
  config: CameraConfig;
}

type Channel = (w: CameraWaypoint) => number;

const CHANNELS: Channel[] = [
  (w) => w.position[0],
  (w) => w.position[1],
  (w) => w.position[2],
  (w) => w.lookAt[0],
  (w) => w.lookAt[1],
  (w) => w.lookAt[2],
];

/**
 * Monotone cubic (Fritsch-Carlson) tangents through the waypoints. A waypoint
 * between two moves in the same direction is passed through without stopping;
 * holds (equal neighbours), turnarounds, both ends and hard cuts (two
 * waypoints on the same frame) keep a zero tangent, so the camera eases there
 * exactly like the old per-segment smoothstep and never overshoots a waypoint.
 */
const tangents = (frames: number[], values: number[]) => {
  const m = new Array<number>(values.length).fill(0);
  for (let i = 1; i < values.length - 1; i++) {
    const h0 = frames[i] - frames[i - 1];
    const h1 = frames[i + 1] - frames[i];
    if (h0 <= 0 || h1 <= 0) continue;
    const d0 = (values[i] - values[i - 1]) / h0;
    const d1 = (values[i + 1] - values[i]) / h1;
    if (d0 * d1 <= 0) continue;
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d0 + w2 / d1);
  }
  return m;
};

const hermite = (y0: number, y1: number, m0: number, m1: number, h: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1;
};

/** Smooth deterministic shake noise in about [-1, 1] (three incommensurate sines, 4-13 Hz at 30 fps). */
const wave = (f: number, seed: number) =>
  (Math.sin(f * 0.93 + seed * 12.9898) + 0.55 * Math.sin(f * 1.71 + seed * 78.233) + 0.3 * Math.sin(f * 2.63 + seed * 37.719)) / 1.85;

export const CameraRig: React.FC<CameraRigProps> = ({ config }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const { waypoints, tracks = [], shake = [], rumbles = [] } = config;
  const baseFov = config.fov ?? 46;

  const spline = useMemo(() => {
    const frames = waypoints.map((w) => w.frame);
    const channels = [
      ...CHANNELS,
      (w: CameraWaypoint) => w.fov ?? baseFov,
      (w: CameraWaypoint) => w.roll ?? 0,
    ].map((get) => {
      const values = waypoints.map(get);
      return { values, m: tangents(frames, values) };
    });
    return { frames, channels };
  }, [waypoints, baseFov]);

  useLayoutEffect(() => {
    if (waypoints.length === 0) return;

    // [px, py, pz, lx, ly, lz, fov, roll]
    let pose: number[];
    const { frames, channels } = spline;
    const last = frames.length - 1;
    if (frame <= frames[0]) {
      pose = channels.map((c) => c.values[0]);
    } else if (frame >= frames[last]) {
      pose = channels.map((c) => c.values[last]);
    } else {
      let i = 0;
      while (i < last - 1 && !(frame >= frames[i] && frame < frames[i + 1])) i++;
      const h = frames[i + 1] - frames[i];
      const t = h <= 0 ? 1 : (frame - frames[i]) / h;
      pose = channels.map((c) => hermite(c.values[i], c.values[i + 1], c.m[i], c.m[i + 1], h, t));
    }

    for (const track of tracks) {
      if (frame < track.start || frame > track.end) continue;
      const blend = Math.max(1, track.blend ?? 15);
      const raw = Math.min(1, (frame - track.start) / blend, (track.end - frame) / blend);
      const w = raw * raw * (3 - 2 * raw);
      const p = track.fn(frame);
      const target = [...p.position, ...p.lookAt, p.fov ?? pose[6], p.roll ?? pose[7]];
      pose = pose.map((v, k) => v + (target[k] - v) * w);
    }

    // Impacts: nothing before the hit, a jolt on it, then a decaying rattle.
    // `spread` keeps its old meaning (frames to fall to ~1/e).
    let amount = 0;
    let kick = 0;
    let punch = 0;
    for (const burst of shake) {
      if (frame < burst.at) continue;
      const age = frame - burst.at;
      const spread = (burst.spread ?? 8) * 1.25;
      amount += burst.strength * Math.exp(-((age / spread) ** 2));
      kick += burst.strength * Math.exp(-age / 2.5);
      punch += (burst.punch ?? Math.min(0.05, burst.strength * 0.1)) * Math.exp(-age / 4);
    }
    for (const rumble of rumbles) {
      if (frame < rumble.start || frame > rumble.end) continue;
      const span = Math.max(1, rumble.end - rumble.start);
      amount += rumble.strength * Math.sin(((frame - rumble.start) / span) * Math.PI);
    }

    const s = amount * 0.75;
    camera.position.set(
      pose[0] + wave(frame, 1) * s,
      pose[1] + wave(frame, 2) * s - kick * 0.45,
      pose[2] + wave(frame, 3) * s * 0.5
    );
    camera.lookAt(new THREE.Vector3(pose[3] + wave(frame, 4) * s * 0.8, pose[4] + wave(frame, 5) * s * 0.8 - kick * 0.3, pose[5]));
    const roll = pose[7] + wave(frame, 6) * amount * 0.05;
    if (roll !== 0) camera.rotateZ(roll);
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = pose[6] * (1 - Math.min(0.15, punch));
    perspective.updateProjectionMatrix();
  }, [camera, frame, spline, waypoints, tracks, shake, rumbles]);

  return null;
};
