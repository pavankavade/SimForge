import type React from "react";
import { useCurrentFrame } from "remotion";
import { CeilingCrushers, DioramaHall } from "../../artifacts";
import { ActorView, FACE_CAMERA, FACE_RIGHT, arc, dust, sparks, type Actor } from "../../kit";
import {
  BEATS,
  CEILING_Y,
  CRUSHER_HANG,
  CRUSHER_X,
  CRUSH_Y,
  GOBLIN_WALK,
  GOBLIN_X0,
  ROGUE_ENTER,
  ROGUE_STROLL,
  ROGUE_WAIT_X,
  SLAMS,
  Z,
  lerp,
  progress,
  rogueX,
} from "./timeline";

/**
 * What is on screen. One `xxxActor(frame): Actor | null` per character:
 * null before they enter and never again after they leave. Dead characters
 * stay dead (corpse, splat, pancake, skeleton) for the rest of the episode.
 */

// ---------------------------------------------------------------------------
// Level 1: the goblin wanders under the crusher and gets flattened.
// ---------------------------------------------------------------------------
const goblinActor = (frame: number): Actor | null => {
  if (frame < BEATS.crush) {
    if (frame < GOBLIN_WALK[0]) return { pose: "idle", position: [GOBLIN_X0, 0, Z], yaw: FACE_RIGHT - 0.3 };
    if (frame < GOBLIN_WALK[1]) {
      return { pose: "walk", position: [lerp(GOBLIN_X0, CRUSHER_X, progress(frame, GOBLIN_WALK)), 0, Z], yaw: FACE_RIGHT };
    }
    // Looks up at the descending crusher, too late.
    return { pose: "cower", position: [CRUSHER_X, 0, Z], yaw: FACE_CAMERA + 0.3, expression: "scared" };
  }
  // Pancaked on the word (the face is just above his head one frame earlier),
  // and stays that way for the rest of the episode.
  return { pose: "cower", position: [CRUSHER_X, 0, Z], yaw: FACE_CAMERA + 0.3, squash: 0.16, expression: "dead" };
};

// ---------------------------------------------------------------------------
// Level 1 counter: the rogue jogs in, waits out the slam, strolls through.
// ---------------------------------------------------------------------------
const rogueActor = (frame: number): Actor | null => {
  if (frame < ROGUE_ENTER[0]) return null;
  const x = rogueX(frame);
  if (frame < ROGUE_ENTER[1]) return { pose: "walk", position: [x, 0, Z], yaw: FACE_RIGHT, speed: 2.2 };
  if (frame < ROGUE_STROLL[0]) {
    // Stops short, arms folded while the crusher slams in front of him.
    return { pose: "idle", position: [ROGUE_WAIT_X, 0, Z], yaw: FACE_RIGHT - 0.35, expression: "smug" };
  }
  if (frame < ROGUE_STROLL[1]) {
    // Small hop over the flattened goblin.
    const hop = arc(progress(frame, [ROGUE_STROLL[0] + 12, ROGUE_STROLL[0] + 26]), 0.35);
    return { pose: hop > 0 ? "jump" : "walk", position: [x, hop, Z], yaw: FACE_RIGHT, speed: 1.1 };
  }
  // Smug fist pump to camera.
  return { pose: "cast", position: [x, 0, Z], yaw: FACE_CAMERA + 0.35, expression: "smug" };
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <DioramaHall exit="left" ceilingY={CEILING_Y} />
      <CeilingCrushers
        xs={[CRUSHER_X]}
        installFrame={BEATS.install}
        gearsStart={BEATS.gearsStart}
        slamFrame={SLAMS[0]}
        moreSlams={SLAMS.slice(1)}
        ceilingY={CEILING_Y}
        slamY={CRUSH_Y}
        restDrop={CRUSHER_HANG}
        z={Z}
      />

      <ActorView classType="goblin" actor={goblinActor(frame)} frame={frame} />
      <ActorView classType="rogue" actor={rogueActor(frame)} frame={frame} />

      {/* Every contact gets a burst, keyed to the same beat as its SFX. */}
      {dust(BEATS.install + 14, [CRUSHER_X, CEILING_Y - 0.6, Z + 0.4], "install-dust", 0.7)}
      {dust(BEATS.crush, [CRUSHER_X, 0.1, Z], "crush-dust", 1.2)}
      {sparks(BEATS.crush, [CRUSHER_X + 0.5, 0.4, Z + 0.6], "crush-sparks", "#ffd27a", 30)}
      {dust(SLAMS[1] + 4, [CRUSHER_X, 0.1, Z], "slam2-dust", 1.0)}
      {dust(ROGUE_STROLL[0] + 26, [CRUSHER_X + 0.9, 0.05, Z], "hop-land", 0.4)}
    </>
  );
};
