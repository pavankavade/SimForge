import type React from "react";
import { useCurrentFrame } from "remotion";
import {
  AlchemicalFlamers,
  BaitChest,
  ChuteMouth,
  DungeonDiorama,
  EntryDoorway,
  HingedTrapdoor,
  IceBridge,
  PendulumBlade,
  PressurePlate,
  RoomInRock,
  SpikePit,
  TrebuchetFloor,
} from "../../../../artifacts";
import type { AdventurerClass } from "../../../../artifacts";
import { ActorView, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, HIP, dust, flamePuff, lying, magic, sparks, type Actor } from "../../../../kit";
import {
  BEATS,
  CHUTE_X,
  EDGE_X,
  ENTRY_X,
  GOBLIN_WALK,
  LIE_X,
  MAGE_WALK,
  PALADIN_X,
  PARTY,
  PLATE_X,
  RIGHT_LEDGE_X,
  ROGUE_RUN,
  SLAB_LENGTH,
  SLAB_PIVOT,
  SPIKE_TOPS_Y,
  TRAPDOOR_EVENTS,
  Z,
  easeInOut,
  easeOutCubic,
  landFrame,
  lerp,
  partyState,
  pendulumAngle,
  progress,
  slabAngle,
} from "./timeline";

/**
 * Tumble from (x0, y0) into the pit, landing on the spike bed at `lieX` on
 * `window[1]`; afterwards the body lies there dead for the rest of the act.
 */
const fallInto = (
  classType: AdventurerClass,
  frame: number,
  window: readonly [number, number],
  x0: number,
  lieX: number,
  facing: "right" | "left",
  y0 = 0
): Actor => {
  if (frame >= window[1]) return lying({ classType, x: lieX, z: Z, frame, since: window[1], floorY: SPIKE_TOPS_Y, facing, expression: "dead" });
  const t = progress(frame, window);
  const roll = (facing === "right" ? 1 : -1) * (Math.PI / 2) * easeInOut(Math.min(1, t * 1.3));
  return {
    pose: "fall",
    position: [lerp(x0, lieX, easeOutCubic(t)), lerp(y0, SPIKE_TOPS_Y, t * t) - HIP * 0.4 * t, Z],
    yaw: facing === "right" ? FACE_RIGHT : FACE_LEFT,
    tilt: roll + 0.4 * Math.sin(t * Math.PI * 2),
    pivot: HIP,
    expression: "scared",
  };
};

// ---------------------------------------------------------------------------
// Level 1: the goblin walks straight in.
// ---------------------------------------------------------------------------
const goblinActor = (frame: number): Actor | null => {
  if (frame < GOBLIN_WALK[0]) return null;
  if (frame < BEATS.goblinFall) {
    return { pose: "walk", position: [lerp(ENTRY_X + 0.6, EDGE_X + 0.75, progress(frame, GOBLIN_WALK)), 0, Z], yaw: FACE_RIGHT };
  }
  return fallInto("goblin", frame, [BEATS.goblinFall, BEATS.goblinLand], EDGE_X + 0.75, LIE_X.goblin, "right");
};

// ---------------------------------------------------------------------------
// Levels 1-2: the rogue spots the gap, leaps it, gloats... then jumps for the
// bait chest and lands on the plate.
// ---------------------------------------------------------------------------
const rogueActor = (frame: number): Actor | null => {
  const [leapA, leapB] = BEATS.rogueLeap;
  const [jumpA, jumpB] = BEATS.rogueJump;
  if (frame < ROGUE_RUN[0]) return null;
  if (frame < ROGUE_RUN[1]) {
    return { pose: "walk", position: [lerp(ENTRY_X, EDGE_X, progress(frame, ROGUE_RUN)), 0, Z], yaw: FACE_RIGHT, speed: 2 };
  }
  if (frame < leapA) {
    // Peers down into the pit at the goblin.
    return { pose: "idle", position: [EDGE_X, 0, Z], yaw: FACE_RIGHT - 0.6, expression: "focus" };
  }
  if (frame < leapB) {
    const t = progress(frame, [leapA, leapB]);
    return {
      pose: "jump",
      position: [lerp(EDGE_X, RIGHT_LEDGE_X, t), Math.sin(Math.PI * t) * 1.9, Z],
      yaw: FACE_RIGHT,
      tilt: -Math.PI * 2 * easeInOut(t),
      pivot: HIP,
    };
  }
  // Gloats to camera, then eyes the chest when it drops in.
  if (frame < leapB + 6) return { pose: "cower", position: [RIGHT_LEDGE_X, 0, Z], yaw: FACE_RIGHT };
  if (frame < BEATS.trapdoorSpawn) return { pose: frame < leapB + 40 ? "cast" : "idle", position: [RIGHT_LEDGE_X, 0, Z], yaw: FACE_CAMERA, expression: "smug" };
  if (frame < BEATS.chestSpawn + 10) return { pose: "idle", position: [RIGHT_LEDGE_X, 0, Z], yaw: FACE_LEFT + 0.4 };
  if (frame < jumpA) return { pose: "idle", position: [RIGHT_LEDGE_X, 0, Z], yaw: FACE_LEFT, expression: "happy" };
  const reachX = PLATE_X + 0.6;
  if (frame < jumpB) {
    const t = progress(frame, [jumpA, jumpB]);
    return { pose: "jump", position: [lerp(RIGHT_LEDGE_X, reachX, t), Math.sin(Math.PI * t) * 1.5, Z], yaw: FACE_LEFT };
  }
  // Reaches up for the chest, shuffles one step onto the plate.
  const stepA = BEATS.plateClick - 10;
  if (frame < stepA) return { pose: "cast", position: [reachX, 0, Z], yaw: FACE_LEFT + 0.3, expression: "happy" };
  if (frame < BEATS.rogueFall[0]) {
    const t = progress(frame, [stepA, BEATS.plateClick]);
    return { pose: t < 1 ? "walk" : "cower", position: [lerp(reachX, PLATE_X, t), 0, Z], yaw: FACE_LEFT, expression: t < 1 ? "happy" : "shock" };
  }
  return fallInto("rogue", frame, BEATS.rogueFall, PLATE_X, LIE_X.rogue, "left");
};

// ---------------------------------------------------------------------------
// Levels 2-3: the mage freezes the trapdoor, crosses... into a frying pan.
// ---------------------------------------------------------------------------
const mageActor = (frame: number): Actor | null => {
  if (frame < MAGE_WALK[0]) return null;
  if (frame < MAGE_WALK[1]) return { pose: "walk", position: [lerp(ENTRY_X, EDGE_X, progress(frame, MAGE_WALK)), 0, Z], yaw: FACE_RIGHT };
  if (frame < BEATS.iceCast - 6) return { pose: "idle", position: [EDGE_X, 0, Z], yaw: FACE_RIGHT - 0.5, expression: "focus" };
  if (frame < BEATS.iceCast + 28) return { pose: "cast", position: [EDGE_X, 0, Z], yaw: FACE_RIGHT - 0.4 };
  if (frame < BEATS.mageCross[0]) return { pose: "idle", position: [EDGE_X, 0, Z], yaw: FACE_CAMERA, expression: "smug" };
  if (frame < BEATS.mageCross[1]) {
    // Tiptoes out onto the ice.
    return { pose: "walk", position: [lerp(EDGE_X, LIE_X.mage, progress(frame, BEATS.mageCross)), 0, Z], yaw: FACE_RIGHT, speed: 0.6 };
  }
  if (frame < BEATS.mageFall[0]) {
    return { pose: frame < BEATS.fireStart ? "idle" : "cower", position: [LIE_X.mage, 0, Z], yaw: FACE_CAMERA, expression: frame < BEATS.fireStart ? "neutral" : "scared" };
  }
  return fallInto("mage", frame, BEATS.mageFall, LIE_X.mage, LIE_X.mage, "right");
};

// ---------------------------------------------------------------------------
// Levels 3-4: the paladin shields through the flames; the pendulum swats him in.
// ---------------------------------------------------------------------------
const PALADIN_SHIELD_X = EDGE_X - 1.6;
const paladinActor = (frame: number): Actor | null => {
  const [a, b] = BEATS.paladinWalk;
  if (frame < a) return null;
  if (frame < b) {
    const x = lerp(ENTRY_X, PALADIN_X, progress(frame, [a, b]));
    const shielding = x > PALADIN_SHIELD_X;
    return { pose: shielding ? "shieldWalk" : "walk", position: [x, 0, Z], yaw: shielding ? 1.0 : FACE_RIGHT, speed: 0.9 };
  }
  if (frame < BEATS.fireEnd + 10) return { pose: "shield", position: [PALADIN_X, 0, Z], yaw: 0.75 };
  if (frame < BEATS.bladeHit - 14) return { pose: "idle", position: [PALADIN_X, 0, Z], yaw: FACE_CAMERA, expression: "smug" };
  if (frame < BEATS.bladeHit) return { pose: "shield", position: [PALADIN_X, 0, Z], yaw: 0.75, expression: "scared" };
  // Knocked toward +x, spinning, straight down the opened trapdoor.
  return fallInto("paladin", frame, [BEATS.bladeHit, BEATS.paladinLand], PALADIN_X, LIE_X.paladin, "right", 0.3);
};

// ---------------------------------------------------------------------------
// Level 5: the party lines up, refuses to step, huddles, gets launched.
// ---------------------------------------------------------------------------
const partyActor = (i: number, frame: number): Actor | null => {
  const m = PARTY[i];
  if (frame < BEATS.partyEnter[0] + m.delay) return null;
  const s = partyState(m, frame);
  switch (s.phase) {
    case "enter":
      return { pose: "walk", position: s.position, yaw: FACE_RIGHT };
    case "line":
      return {
        pose: m.classType === "paladin" && frame >= BEATS.shieldUp ? "shield" : "idle",
        position: s.position,
        yaw: frame < BEATS.shieldUp ? FACE_RIGHT : 0.5,
        expression: frame < BEATS.shieldUp ? "neutral" : "smug",
      };
    case "huddle":
      return { pose: "idle", position: s.position, yaw: m.huddleFacing, expression: "focus" };
    case "ride":
      return { pose: "launch", position: s.position, yaw: m.huddleFacing, tilt: slabAngle(frame), expression: "shock" };
    case "flight":
      return {
        pose: "launch",
        position: [s.position[0], s.position[1] - HIP, s.position[2]],
        yaw: m.huddleFacing + s.t * 1.5,
        tilt: -s.t * Math.PI * 3.2,
        pivot: HIP,
        scale: s.t < 0.85 ? 1 : 1 - (s.t - 0.85) * 5,
        expression: "scared",
      };
    default:
      return null;
  }
};

const spikeDust = (at: number, x: number, seed: string) => dust(at, [x, SPIKE_TOPS_Y + 0.1, Z], seed, 1.1);

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {/* 16:9 sees past the set: the hall sits in the cut rock of the cross-section */}
      <RoomInRock x0={-15.4} x1={11} y0={-4.5} y1={6.35} />
      <DungeonDiorama catapultFrame={BEATS.chamberReveal} />
      {/* Everyone comes in through the crypt door at the left end */}
      <EntryDoorway x={-11} z={Z} depth={3.4} ceilingY={6.3} side="left" />

      <SpikePit spawnFrame={BEATS.spikeSpawn} />
      <HingedTrapdoor spawnFrame={BEATS.trapdoorSpawn} events={TRAPDOOR_EVENTS} />
      <PressurePlate spawnFrame={BEATS.plateSpawn} triggerFrames={[BEATS.plateClick]} trapdoorEvents={TRAPDOOR_EVENTS} glowFrames={70} />
      <BaitChest spawnFrame={BEATS.chestSpawn} />
      <IceBridge castFrame={BEATS.iceCast} meltFrame={BEATS.mageFall[0]} />
      <AlchemicalFlamers spawnFrame={BEATS.flamerSpawn} fireWindows={[[BEATS.fireStart, BEATS.fireEnd]]} />
      <PendulumBlade spawnFrame={BEATS.pendulumSpawn} angle={pendulumAngle(frame)} previousAngle={pendulumAngle(frame - 1)} />
      <TrebuchetFloor
        revealFrame={BEATS.chamberReveal}
        buildWindow={[BEATS.catapultBuild[0], BEATS.catapultBuild[1]]}
        launchFrame={BEATS.launch}
        pivot={SLAB_PIVOT}
        slabLength={SLAB_LENGTH}
        angle={slabAngle(frame)}
      />
      {/* Disposal chute: a floor hatch where the mimic sat in the short */}
      {frame >= BEATS.chuteInstall + 4 ? (
        <mesh position={[CHUTE_X, 0.03, Z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.95, 28]} />
          <meshBasicMaterial color="#07080b" />
        </mesh>
      ) : null}
      <ChuteMouth position={[CHUTE_X, 0.02, Z]} facing="up" radius={1.05} installFrame={BEATS.chuteInstall} openFrame={BEATS.chuteOpen} gulps={PARTY.map(landFrame)} />

      <ActorView classType="goblin" actor={goblinActor} frame={frame} />
      <ActorView classType="rogue" actor={rogueActor} frame={frame} />
      <ActorView classType="mage" actor={mageActor} frame={frame} />
      <ActorView classType="paladin" actor={paladinActor} frame={frame} />
      {PARTY.map((m, i) => (
        <ActorView key={m.classType} classType={m.classType} actor={(f) => partyActor(i, f)} frame={frame} />
      ))}

      {/* Contacts (keyed to the same beats as the SFX) */}
      {dust(BEATS.spikeSpawn + 10, [0, SPIKE_TOPS_Y + 0.2, Z], "spikes-up", 1.2)}
      {spikeDust(BEATS.goblinLand, LIE_X.goblin, "dust-goblin")}
      {dust(BEATS.rogueLeap[1], [RIGHT_LEDGE_X, 0.05, Z], "rogue-land", 0.6)}
      {dust(BEATS.trapdoorSpawn + 16, [0, 0.05, Z], "trapdoor-install", 1.4)}
      {dust(BEATS.rogueJump[1], [PLATE_X + 0.6, 0.05, Z], "rogue-jump-land", 0.5)}
      {sparks(BEATS.plateClick, [PLATE_X, 0.1, Z], "plate-click", "#ffd84d", 18)}
      {spikeDust(BEATS.rogueFall[1], LIE_X.rogue, "dust-rogue")}
      {magic(BEATS.iceCast, [EDGE_X + 1.2, 0.4, Z + 0.3], "ice-cast", "#9ff0ff", 40)}
      {flamePuff(BEATS.fireStart, [-1.2, 0.6, Z], "fire-l", 1.2)}
      {flamePuff(BEATS.fireStart + 3, [1.2, 0.6, Z], "fire-r", 1.2)}
      {spikeDust(BEATS.mageFall[1], LIE_X.mage, "dust-mage")}
      {sparks(BEATS.bladeHit, [PALADIN_X, 1.1, Z + 0.3], "blade-sparks", "#ffd27a", 50)}
      {spikeDust(BEATS.paladinLand, LIE_X.paladin, "dust-paladin")}
      {dust(BEATS.chamberReveal + 6, [-6, -0.2, Z], "chamber-reveal", 1.6)}
      {dust(BEATS.launch, [-7.6, 0.2, Z], "launch-dust", 1.6)}
      {dust(BEATS.chuteInstall + 8, [CHUTE_X, 0.1, Z], "chute-install", 0.9)}
      {PARTY.map((m) => dust(landFrame(m), [CHUTE_X, 0.2, Z], `gulp-${m.classType}`, 0.7))}
    </>
  );
};
