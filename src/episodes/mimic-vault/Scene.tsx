import type React from "react";
import { useCurrentFrame } from "remotion";
import { DioramaHall, FloorTwoHub, MimicVault, Skeleton, TreasureHoard } from "../../artifacts";
import { G, INK_THIN, Part, vinyl } from "../../artifacts/characters/hero";
import { ActorView, CHAR_SCALE, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, HIP, dust, flamePuff, magic, sparks, type Actor } from "../../kit";
import {
  BARB_RUN,
  BARB_SPOT,
  BEATS,
  CEILING_Y,
  DOOR_II_X,
  GRAB_X,
  HALL_LEFT,
  HALL_RIGHT,
  HINGE_X,
  HINGE_Y,
  HOARD_X,
  HUB_BARB_X,
  HUB_CUT,
  HUB_IN,
  HUB_WALK,
  LIP_X,
  OLD_CHEST_X,
  ROGUE_ENTER,
  ROGUE_IN,
  ROGUE_OUT,
  SEAL_X,
  SNAP,
  TONGUE_Z,
  Z,
  barbX,
  hubBarb,
  progress,
  rogueX,
  vaultEyes,
  vaultOpen,
  vaultTeeth,
} from "./timeline";

/**
 * What is on screen. One `xxxActor(frame): Actor | null` per character: null
 * before they enter and never again after they leave. Whoever the vault eats
 * comes back as bones on its tongue and stays there.
 */

// ---------------------------------------------------------------------------
// Cold open: the barbarian in the hub burns a finger on sealed door I, then
// takes door II.
// ---------------------------------------------------------------------------
const hubBarbActor = (frame: number): Actor | null => {
  if (frame >= HUB_IN[1]) return null;
  const pokeT = frame - BEATS.sealed;
  if (frame < BEATS.sealed) return { pose: "idle", position: [HUB_BARB_X, 0, Z], yaw: FACE_LEFT + 0.5, expression: "neutral" };
  if (pokeT < 10) return { pose: "point", position: [HUB_BARB_X, 0, Z], yaw: FACE_LEFT + 0.3, expression: "focus" };
  if (frame < BEATS.picks) return { pose: "cower", position: [HUB_BARB_X, 0, Z], yaw: FACE_CAMERA - 0.3, expression: "pain" };
  if (frame < HUB_WALK[0]) return { pose: "point", position: [HUB_BARB_X, 0, Z], yaw: FACE_RIGHT - 0.4, expression: "happy" };
  if (frame < HUB_IN[0]) return { pose: "walk", position: [hubBarb(frame)[0], 0, Z], yaw: FACE_RIGHT, speed: 0.9, expression: "smug" };
  const [x, z] = hubBarb(frame);
  return { pose: "walk", position: [x, 0, z], yaw: Math.PI, speed: 0.9 };
};

// ---------------------------------------------------------------------------
// Level 1: a barbarian charges for the gold and the vault shuts on him.
// ---------------------------------------------------------------------------
const barbActor = (frame: number): Actor | null => {
  if (frame < BARB_RUN[0] || frame >= BEATS.chomp) return null;
  if (frame < BARB_RUN[1]) return { pose: "run", position: [barbX(frame), 0, Z], yaw: FACE_RIGHT, speed: 1.7, expression: "yell" };
  // He looks up at the teeth coming down.
  return { pose: "cower", position: [BARB_SPOT, 0, Z], yaw: FACE_CAMERA + 0.3, expression: "scared" };
};

// ---------------------------------------------------------------------------
// Level 1 counter: the show-off rogue nods along to the bites, darts in,
// grabs a sack of gold, darts out as the jaw snaps behind him, and bows.
// ---------------------------------------------------------------------------
const rogueActor = (frame: number): Actor | null => {
  if (frame < ROGUE_ENTER[0] || frame >= BEATS.l2) return null;
  const x = rogueX(frame);
  if (frame < ROGUE_ENTER[1]) return { pose: "run", position: [x, 0, Z], yaw: FACE_RIGHT, speed: 1.5 };
  if (frame < ROGUE_IN[0]) {
    const nod = Math.sin((frame - ROGUE_ENTER[1]) * 0.45) * 0.12;
    return { pose: "idle", position: [x, 0, Z], yaw: FACE_RIGHT - 0.5, tilt: nod, pivot: HIP, expression: "focus" };
  }
  if (frame < ROGUE_IN[1]) return { pose: "run", position: [x, 0, Z], yaw: FACE_RIGHT, speed: 2.6, expression: "smug" };
  if (frame < ROGUE_OUT[0]) return { pose: "carry", position: [x, 0, Z], yaw: FACE_RIGHT - 0.6, expression: "happy" };
  if (frame < ROGUE_OUT[1]) return { pose: "run", position: [x, 0, Z], yaw: FACE_LEFT, speed: 2.6, expression: "shock" };
  if (frame < BEATS.bow) return { pose: "cheer", position: [x, 0, Z], yaw: FACE_CAMERA + 0.3, expression: "smug" };
  // The bow: turned three-quarters to camera, a deep fold at the hips.
  const t = progress(frame, [BEATS.bow, BEATS.bow + 10]) - progress(frame, [BEATS.bow + 30, BEATS.bow + 40]);
  return { pose: "idle", position: [x, 0, Z], yaw: FACE_RIGHT - 0.75, tilt: -0.55 * t, pivot: HIP, expression: "smug" };
};

/** The sack of gold the rogue walks off with. */
const GoldSack: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < ROGUE_IN[1] + 4 || frame >= BEATS.l2) return null;
  const x = rogueX(frame);
  const out = frame >= ROGUE_OUT[0];
  return (
    <group position={[x + (out ? -0.15 : 0.25), 0.95 * CHAR_SCALE, Z + 0.35]}>
      <Part geo={G.sphere(0.2)} mat={vinyl("#c99a4a", "leather")} scale={[1, 1.1, 1]} ink={INK_THIN} />
      <Part geo={G.sphere(0.12)} mat={vinyl("#f2c14e", "gloss")} position={[0, 0.2, 0]} scale={[1, 0.5, 1]} ink={INK_THIN} />
    </group>
  );
};

const VaultHall: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <DioramaHall
      exit="left"
      exitStyle="door"
      left={HALL_LEFT}
      right={HALL_RIGHT}
      ceilingY={CEILING_Y}
      archX={null}
      bannerColor="#3d2a5c"
      pillarXs={[-3.4, 0.6]}
      torchXs={[-4.8, -1.4, 1.6]}
    />
    <TreasureHoard x={HOARD_X} z={Z} />
    <MimicVault
      lipX={LIP_X}
      hingeX={HINGE_X}
      hingeY={HINGE_Y}
      z={Z}
      open={vaultOpen(frame)}
      teeth={vaultTeeth(frame)}
      eyes={vaultEyes(frame)}
      lookX={frame < BEATS.chomp ? barbX(frame) : rogueX(frame)}
      oldChestX={OLD_CHEST_X}
    />
    {/* The barbarian, picked clean, stays on the tongue. */}
    {frame >= BEATS.reveal ? (
      <Skeleton variant="barbarian" position={[BARB_SPOT + 0.9, 0.12, TONGUE_Z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={CHAR_SCALE} animFrame={frame} />
    ) : null}
  </>
);

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const inHub = frame < HUB_CUT;
  return (
    <>
      {inHub ? <FloorTwoHub doorOpen={[1e6, BEATS.doorOpen]} doorSealed={[-1000]} breachAt={-1000} z={Z} /> : <VaultHall frame={frame} />}

      <ActorView classType="barbarian" actor={(f) => (f < HUB_CUT ? hubBarbActor(f) : barbActor(f))} frame={frame} />
      <ActorView classType="rogue" actor={rogueActor} frame={frame} />
      <GoldSack frame={frame} />

      {/* Every contact gets a burst, keyed to the same beat as its SFX. */}
      {flamePuff(BEATS.sealed + 6, [SEAL_X + 0.6, 1.4, Z + 0.2], "seal-sizzle", 0.6)}
      {magic(BEATS.teethOut, [LIP_X + 1.5, 0.6, Z + 1.2], "teeth-out", "#ffe9b0", 24)}
      {dust(BEATS.chomp, [BARB_SPOT, 0.3, Z + 1.2], "chomp-dust", 1.4)}
      {dust(BEATS.reveal + 4, [BARB_SPOT + 0.6, 0.4, Z], "burp-dust", 0.8)}
      {dust(ROGUE_IN[0] + 2, [rogueX(ROGUE_IN[0]), 0.05, Z], "dart-in", 0.5)}
      {sparks(BEATS.grabs, [GRAB_X + 0.4, 0.9, Z + 0.3], "grab-coins", "#ffe08a", 24)}
      {dust(SNAP, [LIP_X + 0.4, 0.3, Z + 1.2], "snap-dust", 1.0)}
      {sparks(SNAP, [LIP_X + 0.1, 0.5, Z + 1.0], "snap-sparks", "#fff3c4", 14)}
      {/* Door II glows warm as it opens. */}
      {inHub ? sparks(BEATS.doorOpen, [DOOR_II_X, 1.6, Z - 1.2], "door-open", "#ffd27a", 10) : null}
    </>
  );
};
