import type React from "react";
import {
  AdventurerUnit,
  CLASS_SCALE,
  RIG,
  blendRig,
  poseSway,
  solvePose,
  type AdventurerClass,
  type AdventurerPose,
  type Expression,
  type RigPose,
  type Weapon,
} from "../artifacts/characters/hero";
import type { Vec3 } from "../engine/types";
import { clamp01, easeOutCubic } from "./motion";

/**
 * Actors: how episodes put the hero cast on screen.
 *
 * Scene.tsx defines one small `xxxActor(frame): Actor | null` per character
 * (null = not on screen: not entered yet, or gone for good) and renders it with
 * `<ActorView classType=... actor={xxxActor} frame={frame} />`.
 *
 * Pass the FUNCTION, not `xxxActor(frame)`: ActorView then looks a few frames
 * back and eases every pose switch, facing snap and speed change over
 * POSE_BLEND frames (no popping limbs), and gives landings from a jump a
 * squash. Positions, tilts and squashes stay exactly as authored. An Actor
 * object still works (no easing). `blend: 0` on an actor snaps into it (a
 * deliberate cut).
 *
 * Dead characters stay dead: switch them to a corpse (`lying(...)` with
 * expression "dead"), a `<Splat>` on the hazard, or a `<Skeleton>`.
 */

/** Size of the cast in every episode (1.12 = Ep1/Ep2). */
export const CHAR_SCALE = 1.12;
export const FACE_RIGHT = Math.PI / 2;
export const FACE_LEFT = -Math.PI / 2;
export const FACE_CAMERA = 0;
/** Pivot height (scale 1.12 cast) used for flips, tumbles and lying down. */
export const HIP = 0.95 * CHAR_SCALE;
/** Middle of the body at scale 1: splats centre this point on the hazard face. */
export const BODY_MID = 0.82;
/** Frames ActorView takes to ease one pose (or facing) into the next. */
export const POSE_BLEND = 6;
/** Faster eases into hits and quick actions, so impacts stay snappy. */
const POSE_EASE: Partial<Record<AdventurerPose, number>> = { fall: 3, launch: 3, sprawl: 3, slip: 3, smash: 3, jump: 4, cast: 4 };
/** Frames to ease into an actor's state: its own `blend`, else per pose, else POSE_BLEND. */
const easeFrames = (a: Actor) => a.blend ?? POSE_EASE[a.pose] ?? POSE_BLEND;

export interface Actor {
  pose: AdventurerPose;
  /** Feet position (or pivot-relative, see `pivot`). */
  position: Vec3;
  /** Facing about +y: FACE_RIGHT walks toward +x. */
  yaw: number;
  /** World-space roll about z, applied around `pivot` above the feet. */
  tilt?: number;
  pivot?: number;
  /** Multiplies CHAR_SCALE. */
  scale?: number;
  /** Animation speed multiplier (jogging 1.5-2.5, heavy stomping 0.7). */
  speed?: number;
  /** Face override ("dead" for corpses, "smug" for gloats). Defaults per pose. */
  expression?: Expression;
  weapon?: Weapon;
  /** World-y squash about the floor (0.15 = pancaked by a crusher). Default 1. */
  squash?: number;
  /** World-x squash (0.15 = squeezed between walls). Default 1. Bulges a little in z. */
  squashX?: number;
  /**
   * Frames to ease into this pose/facing from the previous one (0 = snap, e.g.
   * on a camera cut). Default POSE_BLEND, 3-4 for hits and quick actions.
   */
  blend?: number;
}

/** A character's whole performance: frame -> Actor (null = off screen). */
export type ActorTrack = (frame: number) => Actor | null;

/** What the rig shows on a frame: joints, cape sway and facing. */
interface Shown {
  rig: RigPose;
  sway: number;
  yaw: number;
}

/** A facing change bigger than this in one frame is a snap to ease, not an authored turn. */
const SNAP_YAW = 0.25;
/** Feet moving further than this in one frame is a cut or teleport: never eased across. */
const TELEPORT = 1.5;
const AIRBORNE: ReadonlySet<AdventurerPose> = new Set(["jump", "fall", "launch"]);
const GROUNDED: ReadonlySet<AdventurerPose> = new Set([
  "idle", "walk", "run", "cast", "shield", "shieldWalk", "windup", "smash", "cower", "cheer", "point",
]);
/** Landing squash per frame after touchdown (about the feet). */
const LANDING = [0.86, 0.92, 1, 1.04, 1.02];

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Signed turn from a to b; a half turn swings through facing the camera so the face shows. */
const turn = (a: number, b: number) => {
  const d = wrap(b - a);
  if (Math.abs(Math.abs(d) - Math.PI) > 1e-3) return d;
  return Math.abs(wrap(a + Math.PI / 2)) < Math.abs(wrap(a - Math.PI / 2)) ? Math.PI : -Math.PI;
};

const solved = (a: Actor, frame: number): Shown => {
  const anim = frame * (a.speed ?? 1);
  return { rig: solvePose(a.pose, anim), sway: poseSway(a.pose, anim), yaw: a.yaw };
};

type Lookup = (frame: number) => Actor | null;

/**
 * Did the actor switch between `prev` (frame f-1) and `next` (frame f)? A new
 * pose or speed, or a facing jump against the trend (`before` is frame f-2),
 * so authored turns and spins are left alone.
 */
const switched = (before: Actor | null, prev: Actor, next: Actor) => {
  if (prev.pose !== next.pose || (prev.speed ?? 1) !== (next.speed ?? 1)) return true;
  const trend = before ? turn(before.yaw, prev.yaw) : 0;
  return Math.abs(turn(prev.yaw, next.yaw) - trend) > SNAP_YAW;
};

const teleported = (prev: Actor, next: Actor) =>
  Math.hypot(next.position[0] - prev.position[0], next.position[1] - prev.position[1], next.position[2] - prev.position[2]) > TELEPORT;

/**
 * What the rig shows at `frame`: the solved pose, or, within `blend` frames of
 * the last switch, an ease from what was shown just before it (recursively, so
 * quick successive switches stay smooth).
 */
const shownAt = (frame: number, actor: Actor, at: Lookup, depth = 0): Shown => {
  const target = solved(actor, frame);
  const window = easeFrames(actor);
  if (window <= 0 || depth > 3) return target;
  let next = actor;
  for (let k = 1; k <= window && frame - k >= 0; k++) {
    const prev = at(frame - k);
    if (!prev || teleported(prev, next)) return target;
    if (switched(frame - k - 1 >= 0 ? at(frame - k - 1) : null, prev, next)) {
      const from = shownAt(frame - k, prev, at, depth + 1);
      const t = easeOutCubic(k / (window + 1));
      return {
        rig: blendRig(from.rig, target.rig, t),
        sway: from.sway + (target.sway - from.sway) * t,
        yaw: from.yaw + turn(from.yaw, target.yaw) * t,
      };
    }
    next = prev;
  }
  return target;
};

/** Squash about the feet for a few frames after landing from a jump or fall (1 = none). */
const landingAt = (frame: number, actor: Actor, at: Lookup) => {
  if (actor.squash !== undefined || Math.abs(actor.tilt ?? 0) > 0.05 || !GROUNDED.has(actor.pose)) return 1;
  let next = actor;
  for (let k = 1; k <= LANDING.length && frame - k >= 0; k++) {
    const prev = at(frame - k);
    if (!prev || teleported(prev, next)) return 1;
    if (AIRBORNE.has(prev.pose) && GROUNDED.has(next.pose)) return easeFrames(next) > 0 ? LANDING[k - 1] : 1;
    next = prev;
  }
  return 1;
};

export const ActorView: React.FC<{
  classType: AdventurerClass;
  /** The actor function (eased, preferred) or one frame's Actor (as authored). */
  actor: Actor | null | ActorTrack;
  frame: number;
  /** Default weapon for this character (an actor's own `weapon` wins). */
  weapon?: Weapon;
}> = ({ classType, actor: source, frame, weapon }) => {
  const track = typeof source === "function" ? source : null;
  const memo = new Map<number, Actor | null>();
  const at: Lookup = (f) => {
    if (!memo.has(f)) memo.set(f, track ? track(f) : null);
    return memo.get(f) ?? null;
  };
  const actor = track ? at(frame) : (source as Actor | null);
  if (!actor) return null;
  const shown = track ? shownAt(frame, actor, at) : null;
  const land = track ? landingAt(frame, actor, at) : 1;

  const pivot = actor.pivot ?? 0;
  const [x, y, z] = actor.position;
  const squash = actor.squash ?? 1;
  const squashX = actor.squashX ?? 1;
  const spread = 1 + (1 - squash) * 0.6;
  const landSpread = 1 + (1 - land) * 0.6;
  return (
    <group position={[x, 0, z]} scale={[spread * squashX, squash, spread * (1 + (1 - squashX) * 0.5)]}>
      <group position={[0, y + pivot, 0]} rotation={[0, 0, actor.tilt ?? 0]}>
        <group position={[0, -pivot, 0]} scale={[landSpread, land, landSpread]}>
          <AdventurerUnit
            classType={classType}
            pose={actor.pose}
            rotation={[0, shown ? shown.yaw : actor.yaw, 0]}
            scale={CHAR_SCALE * (actor.scale ?? 1)}
            animFrame={frame * (actor.speed ?? 1)}
            weapon={actor.weapon ?? weapon}
            expression={actor.expression}
            rig={shown?.rig}
            sway={shown?.sway}
          />
        </group>
      </group>
    </group>
  );
};

/** Height of the spine above the floor for a body lying flat. */
export const lieHeight = (classType: AdventurerClass, scale = 1) => RIG.lieY * CHAR_SCALE * scale * CLASS_SCALE[classType];

/**
 * A body lying flat on the floor, hips at `x`, with a small settle bounce
 * after `since`. `on: "back"` shows the face to the sky; `facing` is the
 * direction the character was facing when it went down.
 */
export const lying = ({
  classType,
  x,
  z,
  frame,
  since,
  on = "back",
  facing = "right",
  floorY = 0,
  expression,
}: {
  classType: AdventurerClass;
  x: number;
  z: number;
  frame: number;
  since: number;
  on?: "back" | "front";
  facing?: "right" | "left";
  floorY?: number;
  expression?: Expression;
}): Actor => {
  const settle = 0.12 * Math.sin(Math.PI * clamp01((frame - since) / 7));
  const sign = (on === "back" ? 1 : -1) * (facing === "right" ? 1 : -1);
  return {
    pose: "sprawl",
    position: [x, floorY + lieHeight(classType) - HIP + settle, z],
    yaw: facing === "right" ? FACE_RIGHT : FACE_LEFT,
    tilt: (sign * Math.PI) / 2,
    pivot: HIP,
    expression,
  };
};

/**
 * A victim flattened onto the face of a moving hazard (boulder, crusher,
 * wall). Render it as a child of the hazard's group so it rides along.
 * `faceZ` is the hazard's surface toward the camera, `angle` the in-plane
 * rotation (e.g. minus the boulder roll angle at impact).
 */
export const Splat: React.FC<{
  classType: AdventurerClass;
  faceZ: number;
  frame: number;
  angle?: number;
  size?: number;
  /** z squash: 0.1 = pancake, 0.5 = merely skewered. */
  flat?: number;
  weapon?: Weapon;
}> = ({ classType, faceZ, frame, angle = 0, size = 1, flat = 0.12, weapon }) => {
  const s = CHAR_SCALE * size;
  return (
    <group rotation={[0, 0, angle]}>
      <group position={[0, 0, faceZ]} scale={[1, 1, flat]}>
        <AdventurerUnit
          classType={classType}
          pose="sprawl"
          position={[0, -BODY_MID * s * CLASS_SCALE[classType], 0]}
          scale={s}
          animFrame={frame}
          weapon={weapon}
          expression="dead"
        />
      </group>
    </group>
  );
};
