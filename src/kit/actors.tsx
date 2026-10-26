import type React from "react";
import { AdventurerUnit, CLASS_SCALE, RIG, type AdventurerClass, type AdventurerPose, type Expression, type Weapon } from "../artifacts/characters/hero";
import type { Vec3 } from "../engine/types";
import { clamp01 } from "./motion";

/**
 * Actors: how episodes put the hero cast on screen.
 *
 * Scene.tsx defines one small `xxxActor(frame): Actor | null` per character
 * (null = not on screen: not entered yet, or gone for good) and renders it with
 * `<ActorView classType=... actor={xxxActor(frame)} frame={frame} />`.
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
}

export const ActorView: React.FC<{
  classType: AdventurerClass;
  actor: Actor | null;
  frame: number;
  /** Default weapon for this character (an actor's own `weapon` wins). */
  weapon?: Weapon;
}> = ({ classType, actor, frame, weapon }) => {
  if (!actor) return null;
  const pivot = actor.pivot ?? 0;
  const [x, y, z] = actor.position;
  const squash = actor.squash ?? 1;
  const squashX = actor.squashX ?? 1;
  const spread = 1 + (1 - squash) * 0.6;
  return (
    <group position={[x, 0, z]} scale={[spread * squashX, squash, spread * (1 + (1 - squashX) * 0.5)]}>
      <group position={[0, y + pivot, 0]} rotation={[0, 0, actor.tilt ?? 0]}>
        <AdventurerUnit
          classType={classType}
          pose={actor.pose}
          position={[0, -pivot, 0]}
          rotation={[0, actor.yaw, 0]}
          scale={CHAR_SCALE * (actor.scale ?? 1)}
          animFrame={frame * (actor.speed ?? 1)}
          weapon={actor.weapon ?? weapon}
          expression={actor.expression}
        />
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
