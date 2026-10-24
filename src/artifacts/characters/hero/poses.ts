import type { Vec3 } from "../../../engine/types";

export const POSES = [
  "idle",
  "walk",
  "run",
  "jump",
  "cast",
  "shield",
  "shieldWalk",
  "fall",
  "launch",
  "sprawl",
  "slip",
  "float",
  "windup",
  "smash",
  "cower",
  "cheer",
  "point",
] as const;
export type AdventurerPose = (typeof POSES)[number];

/**
 * Joint angles of the hero rig. Arms/legs are Euler [x, y, z] at the shoulder/hip
 * (x < 0 swings forward/up); elbow < 0 bends the forearm forward; knee > 0 bends
 * the shin back. Side "L" is -x, "R" is +x (the weapon hand).
 */
export interface RigPose {
  armL: Vec3;
  armR: Vec3;
  elbowL: number;
  elbowR: number;
  legL: Vec3;
  legR: Vec3;
  kneeL: number;
  kneeR: number;
  /** Vertical body offset (squash into a crouch is negative). */
  bob: number;
  /** Forward lean of the whole upper body (radians, + = forward). */
  lean: number;
  /** Head pitch (+ = look down) and roll. */
  head: [number, number];
  /** Breathing / squash scale applied to the torso (1 = rest). */
  breathe: number;
}

const base = (): RigPose => ({
  armL: [0.1, 0, 0.12],
  armR: [0.1, 0, -0.12],
  elbowL: -0.25,
  elbowR: -0.25,
  legL: [0, 0, 0.03],
  legR: [0, 0, -0.03],
  kneeL: 0.05,
  kneeR: 0.05,
  bob: 0,
  lean: 0,
  head: [0, 0],
  breathe: 1,
});

/** Pure: pose name + animation frame -> joint angles. */
export const solvePose = (pose: AdventurerPose, f: number): RigPose => {
  const p = base();
  switch (pose) {
    case "walk": {
      const c = Math.sin(f * 0.32);
      p.armL = [c * 0.65, 0, 0.14];
      p.armR = [-c * 0.65, 0, -0.14];
      p.elbowL = -0.3 - Math.max(0, -c) * 0.4;
      p.elbowR = -0.3 - Math.max(0, c) * 0.4;
      p.legL = [-c * 0.6, 0, 0.02];
      p.legR = [c * 0.6, 0, -0.02];
      p.kneeL = Math.max(0, -c) * 0.85 + 0.06;
      p.kneeR = Math.max(0, c) * 0.85 + 0.06;
      p.bob = Math.abs(c) * 0.05;
      p.lean = 0.06;
      p.head = [-0.03 + Math.abs(c) * 0.04, c * 0.04];
      break;
    }
    case "run": {
      const c = Math.sin(f * 0.42);
      p.armL = [c * 1.05, 0, 0.2];
      p.armR = [-c * 1.05, 0, -0.2];
      p.elbowL = -1.25;
      p.elbowR = -1.25;
      p.legL = [-c * 0.95, 0, 0.02];
      p.legR = [c * 0.95, 0, -0.02];
      p.kneeL = Math.max(0, -c) * 1.4 + 0.2;
      p.kneeR = Math.max(0, c) * 1.4 + 0.2;
      p.bob = Math.abs(c) * 0.09 - 0.02;
      p.lean = 0.24;
      p.head = [-0.12, c * 0.05];
      break;
    }
    case "jump":
      p.armL = [0.9, 0.1, 0.5];
      p.armR = [1.0, -0.1, -0.5];
      p.elbowL = -0.55;
      p.elbowR = -0.45;
      p.legL = [-0.85, 0, 0.1];
      p.legR = [0.5, 0, -0.1];
      p.kneeL = 1.3;
      p.kneeR = 0.4;
      p.lean = 0.16;
      p.head = [-0.15, 0];
      break;
    case "cast":
      p.armL = [-1.3, 0.3, 0.55];
      p.armR = [-2.45, -0.2, -0.15];
      p.elbowL = -0.7;
      p.elbowR = -0.3;
      p.legL = [-0.18, 0, 0.1];
      p.legR = [0.24, 0, -0.1];
      p.kneeL = 0.12;
      p.kneeR = 0.22;
      p.lean = -0.08;
      p.head = [-0.18, 0.06];
      break;
    case "shield":
      p.armL = [-1.35, 0.35, 0.25];
      p.armR = [-0.45, 0.1, -0.35];
      p.elbowL = -0.9;
      p.elbowR = -0.6;
      p.legL = [-0.32, 0, 0.12];
      p.legR = [0.38, 0, -0.12];
      p.kneeL = 0.35;
      p.kneeR = 0.25;
      p.bob = -0.04;
      p.lean = 0.12;
      p.head = [0.05, 0];
      break;
    case "shieldWalk": {
      const c = Math.sin(f * 0.26);
      p.armL = [-1.35, 0.35, 0.25];
      p.armR = [-0.45 + c * 0.15, 0.1, -0.35];
      p.elbowL = -0.9;
      p.elbowR = -0.6;
      p.legL = [-c * 0.5, 0, 0.06];
      p.legR = [c * 0.5, 0, -0.06];
      p.kneeL = Math.max(0, -c) * 0.7 + 0.14;
      p.kneeR = Math.max(0, c) * 0.7 + 0.14;
      p.bob = Math.abs(c) * 0.035 - 0.03;
      p.lean = 0.16;
      p.head = [0.04, c * 0.03];
      break;
    }
    case "sprawl":
      // Limp, splayed: lies flat when the scene tilts the body by ±π/2.
      p.armL = [-0.3, 0, 1.35];
      p.armR = [0.25, 0, -1.2];
      p.elbowL = -0.3;
      p.elbowR = -0.6;
      p.legL = [0.1, 0, 0.4];
      p.legR = [-0.2, 0, -0.3];
      p.kneeL = 0.25;
      p.kneeR = 0.55;
      p.head = [0, 0.35];
      break;
    case "fall":
    case "launch": {
      const flail = Math.sin(f * 0.55);
      p.armL = [-2.3 + flail * 0.45, 0, 0.75];
      p.armR = [-2.15 - flail * 0.45, 0, -0.75];
      p.elbowL = -0.45;
      p.elbowR = -0.45;
      p.legL = [0.65 - flail * 0.35, 0, 0.25];
      p.legR = [0.95 + flail * 0.35, 0, -0.25];
      p.kneeL = 0.8;
      p.kneeR = 1.05;
      p.lean = 0.1;
      p.head = [-0.2, flail * 0.08];
      break;
    }
    case "slip":
      p.armL = [-2.2, 0, 0.75];
      p.armR = [-2.1, 0, -0.75];
      p.elbowL = -0.35;
      p.elbowR = -0.35;
      p.legL = [-1.4, 0, 0.15];
      p.legR = [-1.15, 0, -0.15];
      p.kneeL = 0.3;
      p.kneeR = 0.5;
      p.lean = -0.55;
      p.bob = -0.18;
      p.head = [0.2, 0];
      break;
    case "float": {
      const b = Math.sin(f * 0.16);
      p.armL = [-0.45, 0, 0.85];
      p.armR = [-0.45, 0, -0.85];
      p.elbowL = -0.4;
      p.elbowR = -0.4;
      p.legL = [0.25 + b * 0.12, 0, 0.1];
      p.legR = [-0.1 - b * 0.12, 0, -0.1];
      p.kneeL = 0.5;
      p.kneeR = 0.32;
      p.bob = b * 0.1;
      p.lean = 0.04;
      p.head = [-0.08, b * 0.05];
      break;
    }
    case "windup":
      p.armL = [-2.85, 0.15, 0.25];
      p.armR = [-2.95, -0.15, -0.25];
      p.elbowL = -0.45;
      p.elbowR = -0.35;
      p.legL = [-0.45, 0, 0.14];
      p.legR = [0.4, 0, -0.14];
      p.kneeL = 0.35;
      p.kneeR = 0.3;
      p.lean = -0.18;
      p.bob = -0.04;
      p.head = [-0.12, 0];
      break;
    case "smash":
      p.armL = [-1.05, 0.2, 0.18];
      p.armR = [-1.0, -0.2, -0.18];
      p.elbowL = -0.08;
      p.elbowR = -0.05;
      p.legL = [-0.6, 0, 0.16];
      p.legR = [0.5, 0, -0.16];
      p.kneeL = 0.55;
      p.kneeR = 0.25;
      p.lean = 0.36;
      p.bob = -0.08;
      p.head = [-0.15, 0];
      break;
    case "cower":
      p.armL = [-2.4, 0, -0.55];
      p.armR = [-2.4, 0, 0.55];
      p.elbowL = -1.75;
      p.elbowR = -1.75;
      p.legL = [-0.95, 0, 0.14];
      p.legR = [-0.75, 0, -0.14];
      p.kneeL = 1.5;
      p.kneeR = 1.35;
      p.lean = 0.3;
      p.bob = -0.22 + Math.sin(f * 1.3) * 0.012;
      p.head = [0.18, Math.sin(f * 1.3) * 0.03];
      p.breathe = 0.96;
      break;
    case "cheer": {
      const pump = Math.max(0, Math.sin(f * 0.35));
      p.armL = [-0.2, 0, 0.35];
      p.armR = [-2.9 + pump * 0.25, 0, -0.35];
      p.elbowL = -1.6;
      p.elbowR = -0.4 - pump * 0.5;
      p.legL = [-0.1, 0, 0.12];
      p.legR = [0.12, 0, -0.12];
      p.bob = pump * 0.05;
      p.lean = -0.08;
      p.head = [-0.15, 0.1];
      break;
    }
    case "point":
      p.armL = [0.05, 0, 0.5];
      p.armR = [-1.55, 0.25, -0.1];
      p.elbowL = -1.7;
      p.elbowR = -0.05;
      p.legL = [-0.08, 0, 0.1];
      p.legR = [0.1, 0, -0.08];
      p.lean = -0.06;
      p.head = [-0.06, 0.12];
      break;
    case "idle":
    default: {
      const s = Math.sin(f * 0.06);
      p.legL = [-0.05, 0, 0.04];
      p.legR = [0.05, 0, -0.04];
      p.armL = [0.08, 0, 0.14 + s * 0.02];
      p.armR = [0.08, 0, -0.14 - s * 0.02];
      p.bob = s * 0.006;
      p.head = [0, Math.sin(f * 0.031) * 0.04];
      p.breathe = 1 + s * 0.012;
      break;
    }
  }
  return p;
};
