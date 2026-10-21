import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import {
  AdventurerUnit,
  AlchemicalFlamers,
  BaitChest,
  Burst,
  DungeonDiorama,
  HingedTrapdoor,
  IceBridge,
  MimicChest,
  PendulumBlade,
  PressurePlate,
  SpikePit,
  TrebuchetFloor,
} from "../../artifacts";
import type { AdventurerClass, AdventurerPose } from "../../artifacts";
import type { Vec3 } from "../../engine/types";
import {
  BEATS,
  MIMIC_MOUTH,
  MIMIC_POSITION,
  PARTY,
  SLAB_LENGTH,
  SLAB_PIVOT,
  partyState,
  pendulumAngle,
  slabAngle,
} from "./timeline";

const CHAR_SCALE = 1.12;
const Z = -0.6;
/** Feet height of a body lying among the spikes. */
const LIE_Y = -3.55;
const FACE_RIGHT = Math.PI / 2;
const FACE_LEFT = -Math.PI / 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const progress = (frame: number, [a, b]: readonly [number, number]) =>
  clamp01((frame - a) / (b - a));
const easeInOut = (t: number) => t * t * (3 - 2 * t);

const TRAPDOOR_EVENTS = [
  { frame: BEATS.trapdoorOpen, open: true },
  { frame: BEATS.trapdoorClose, open: false },
  { frame: BEATS.trapdoorOpen3, open: true },
  { frame: BEATS.trapdoorClose3, open: false },
  { frame: BEATS.trapdoorOpen4, open: true },
  { frame: BEATS.trapdoorClose4, open: false },
];

interface Actor {
  pose: AdventurerPose;
  position: Vec3;
  rotation: Vec3;
  scale?: number;
}

interface FallSpec {
  /** [start, landing] frames. */
  window: readonly [number, number];
  from: [number, number];
  toX: number;
  startYaw: number;
  /** Final roll (radians around z). Extra full turns add a tumble. */
  roll: number;
  /** Frame the body sinks out of sight into the spike bed. */
  sinkAt: number;
}

/**
 * Tumbling fall into the pit, a small bounce on the spikes, then the body
 * lies sprawled until it sinks away.
 */
const fallActor = (frame: number, spec: FallSpec): Actor | null => {
  const land = spec.window[1];
  const restYaw = 0.15;
  if (frame >= spec.sinkAt + 14) return null;
  if (frame < land) {
    const t = progress(frame, spec.window);
    return {
      pose: "fall",
      position: [lerp(spec.from[0], spec.toX, t), lerp(spec.from[1], LIE_Y, t * t), Z],
      rotation: [0, lerp(spec.startYaw, restYaw, easeInOut(Math.min(1, t * 1.6))), spec.roll * easeInOut(t)],
    };
  }
  const bounce = 0.14 * Math.sin(Math.PI * clamp01((frame - land) / 8));
  const sink = 0.7 * clamp01((frame - spec.sinkAt) / 14);
  return {
    pose: "sprawl",
    position: [spec.toX, LIE_Y + bounce - sink, Z],
    rotation: [0, restYaw, spec.roll],
  };
};

// ---------------------------------------------------------------------------
// Stage 1: goblin walks straight in, rogue leaps clean over.
// ---------------------------------------------------------------------------
const goblinActor = (frame: number): Actor | null => {
  if (frame < BEATS.goblinFall) {
    return {
      pose: "walk",
      position: [lerp(-6.2, -1.7, frame / BEATS.goblinFall), 0, Z],
      rotation: [0, FACE_RIGHT, 0],
    };
  }
  return fallActor(frame, {
    window: [BEATS.goblinFall, BEATS.goblinLand],
    from: [-1.7, 0],
    toX: -1.0,
    startYaw: FACE_RIGHT,
    roll: Math.PI / 2,
    sinkAt: 440,
  });
};

const rogue1Actor = (frame: number): Actor | null => {
  const [runStart, runEnd] = BEATS.rogue1Run;
  const [leapStart, leapEnd] = BEATS.rogue1Leap;
  const [exitStart, exitEnd] = BEATS.rogue1Exit;
  if (frame < runStart - 5 || frame > exitEnd) return null;
  if (frame < runEnd) {
    return {
      pose: "walk",
      position: [lerp(-7.5, -2.3, progress(frame, BEATS.rogue1Run)), 0, Z],
      rotation: [0, FACE_RIGHT, 0],
    };
  }
  if (frame < leapStart) {
    // Peers down at the goblin, then turns back to the jump.
    const look = Math.sin(Math.PI * progress(frame, [runEnd, leapStart]));
    return { pose: "idle", position: [-2.3, 0, Z], rotation: [0.25 * look, lerp(FACE_RIGHT, 0.4, look), 0] };
  }
  if (frame < leapEnd) {
    const t = progress(frame, BEATS.rogue1Leap);
    return {
      pose: "jump",
      position: [lerp(-2.3, 2.8, t), Math.sin(Math.PI * t) * 1.9, Z],
      rotation: [0, FACE_RIGHT, -0.25 * Math.sin(Math.PI * t)],
    };
  }
  if (frame < exitStart) {
    return { pose: "idle", position: [2.8, 0, Z], rotation: [0, 0.35, 0] };
  }
  return {
    pose: "walk",
    position: [lerp(2.8, 9.8, progress(frame, BEATS.rogue1Exit)), 0, Z],
    rotation: [0, FACE_RIGHT, 0],
  };
};

// ---------------------------------------------------------------------------
// Stage 2: rogue jumps to the bait, steps on the plate, floor drops.
// ---------------------------------------------------------------------------
const rogue2Actor = (frame: number): Actor | null => {
  const [runStart, runEnd] = BEATS.rogue2Run;
  const [, jumpEnd] = BEATS.rogue2Jump;
  if (frame < runStart - 15) return null;
  if (frame < runEnd) {
    return {
      pose: "walk",
      position: [lerp(-8.6, -2.3, progress(frame, [runStart - 15, runEnd])), 0, Z],
      rotation: [0, FACE_RIGHT, 0],
    };
  }
  if (frame < jumpEnd) {
    const t = progress(frame, BEATS.rogue2Jump);
    return {
      pose: "jump",
      position: [lerp(-2.3, 0.55, t), Math.sin(Math.PI * t) * 1.5, Z],
      rotation: [0, FACE_RIGHT, -0.2 * Math.sin(Math.PI * t)],
    };
  }
  if (frame < BEATS.trapdoorOpen + 2) {
    // Creeps onto the plate while reaching up for the chest.
    const step = progress(frame, [jumpEnd + 8, BEATS.plateClick]);
    return {
      pose: frame < jumpEnd + 8 ? "idle" : step < 1 ? "walk" : "cast",
      position: [lerp(0.55, 1.1, step), 0, Z],
      rotation: [0, step < 1 ? FACE_RIGHT : 0.2, 0],
    };
  }
  return fallActor(frame, {
    window: BEATS.rogue2Fall,
    from: [1.1, 0],
    toX: 0.9,
    startYaw: 0.2,
    roll: -Math.PI / 2,
    sinkAt: 770,
  });
};

// ---------------------------------------------------------------------------
// Stage 3: mage freezes a bridge, crosses, comes back and gets torched.
// ---------------------------------------------------------------------------
const mageActor = (frame: number): Actor | null => {
  if (frame < 760) return null;
  if (frame < 865) {
    return {
      pose: "walk",
      position: [lerp(-8.2, -2.5, progress(frame, [760, 865])), 0, Z],
      rotation: [0, FACE_RIGHT, 0],
    };
  }
  if (frame < 935) {
    return { pose: "cast", position: [-2.5, 0, Z], rotation: [0, 0.6, 0] };
  }
  if (frame < 1005) {
    return {
      pose: "walk",
      position: [lerp(-2.5, 2.6, progress(frame, [935, 1005])), 0, Z],
      rotation: [0, FACE_RIGHT, 0],
    };
  }
  if (frame < 1075) {
    return { pose: "idle", position: [2.6, 0, Z], rotation: [0, 0.2, 0] };
  }
  if (frame < BEATS.mageFall[0]) {
    return {
      pose: "walk",
      position: [lerp(2.6, 1.1, progress(frame, [1075, BEATS.mageFall[0]])), 0, Z],
      rotation: [0, FACE_LEFT, 0],
    };
  }
  return fallActor(frame, {
    window: BEATS.mageFall,
    from: [1.1, 0],
    toX: 0.4,
    startYaw: FACE_LEFT,
    roll: Math.PI / 2,
    sinkAt: 1250,
  });
};

// ---------------------------------------------------------------------------
// Stage 4: paladin shields through the fire, the pendulum swats him in.
// ---------------------------------------------------------------------------
const paladinActor = (frame: number): Actor | null => {
  const [walkStart, walkEnd] = BEATS.paladinWalk;
  if (frame < walkStart) return null;
  if (frame < walkEnd) {
    return {
      pose: frame < 1335 ? "walk" : "shieldWalk",
      position: [lerp(-8.6, -0.9, progress(frame, BEATS.paladinWalk)), 0, Z],
      rotation: [0, frame < 1335 ? FACE_RIGHT : 1.0, 0],
    };
  }
  if (frame < BEATS.bladeHit) {
    return { pose: "shield", position: [-0.9, 0, Z], rotation: [0, 0.75, 0] };
  }
  // Knocked toward +x, spinning, straight down the opened trapdoor.
  const t = progress(frame, [BEATS.bladeHit, BEATS.paladinLand]);
  if (frame < BEATS.paladinLand) {
    const kick = 1 - (1 - Math.min(1, t * 2.5)) ** 2;
    return {
      pose: "fall",
      position: [lerp(-0.9, -0.2, kick), 0.35 * Math.sin(Math.PI * Math.min(1, t * 2.5)) + (LIE_Y - 0) * Math.max(0, (t - 0.2) / 0.8) ** 2, Z],
      rotation: [0, 0.75, -(Math.PI * 2 + Math.PI / 2) * easeInOut(t)],
    };
  }
  return fallActor(frame, {
    window: [BEATS.bladeHit, BEATS.paladinLand],
    from: [-0.2, 0],
    toX: -0.2,
    startYaw: 0.75,
    roll: -Math.PI / 2,
    sinkAt: 1770,
  });
};

// ---------------------------------------------------------------------------
// Stage 5: party enters, refuses to move, huddles, gets launched.
// ---------------------------------------------------------------------------
const partyActor = (index: number, frame: number): Actor | null => {
  const member = PARTY[index];
  const state = partyState(member, frame);
  if (!state.visible) return null;
  const lineYaw = 0.5;
  switch (state.phase) {
    case "enter":
      return { pose: "walk", position: state.position, rotation: [0, FACE_RIGHT, 0] };
    case "line": {
      const turn = easeInOut(clamp01((frame - (BEATS.partyEnter[1] - 28 + member.enterDelay)) / 12));
      const shieldUp = member.classType === "paladin" && frame >= BEATS.shieldUp;
      return {
        pose: shieldUp ? "shield" : "idle",
        position: state.position,
        rotation: [0, lerp(FACE_RIGHT, lineYaw, turn), 0],
      };
    }
    case "huddle": {
      const moving = Math.abs(state.position[0] - member.huddle[0]) > 0.03;
      const t = clamp01((frame - BEATS.huddle[0] - member.enterDelay * 0.5) / 22);
      return {
        pose: moving ? "walk" : "idle",
        position: state.position,
        rotation: [0, lerp(lineYaw, member.huddleFacing, easeInOut(t)), 0],
      };
    }
    case "ride":
      return {
        pose: "launch",
        position: state.position,
        rotation: [0, member.huddleFacing, slabAngle(frame)],
      };
    case "flight":
      return {
        pose: "launch",
        position: state.position,
        rotation: [state.spin[0], member.huddleFacing + state.spin[1], state.spin[2]],
        scale: state.scale,
      };
    default:
      return null;
  }
};

const ActorView: React.FC<{ classType: AdventurerClass; actor: Actor | null; frame: number }> = ({
  classType,
  actor,
  frame,
}) =>
  actor ? (
    <AdventurerUnit
      classType={classType}
      pose={actor.pose}
      position={actor.position}
      rotation={actor.rotation}
      scale={CHAR_SCALE * (actor.scale ?? 1)}
      animFrame={frame}
    />
  ) : null;

/** The paladin's helmet, spat back out by the mimic. */
const SpitHelmet: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < BEATS.burp) return null;
  const from: Vec3 = [MIMIC_MOUTH[0] - 0.3, MIMIC_MOUTH[1] + 0.3, MIMIC_MOUTH[2] + 0.5];
  const land: Vec3 = [5.4, 0.2, 0.2];
  const rest: Vec3 = [4.95, 0.2, 0.35];
  let position: Vec3;
  let rotation: Vec3;
  if (frame < BEATS.helmetLand) {
    const t = progress(frame, [BEATS.burp, BEATS.helmetLand]);
    position = [
      lerp(from[0], land[0], t),
      lerp(from[1], land[1], t) + 1.8 * 4 * t * (1 - t),
      lerp(from[2], land[2], t),
    ];
    rotation = [t * 5, t * 2, t * 7];
  } else {
    const t = progress(frame, [BEATS.helmetLand, BEATS.helmetLand + 14]);
    const hop = 0.4 * Math.sin(Math.PI * t);
    const wobble = Math.sin((frame - BEATS.helmetLand) * 0.6) * Math.exp(-(frame - BEATS.helmetLand) / 14) * 0.5;
    position = [lerp(land[0], rest[0], t), land[1] + hop, lerp(land[2], rest[2], t)];
    rotation = [wobble, 0.6, Math.PI * (1 - t) * 0.6 + 0.35 + wobble * 0.5];
  }
  return (
    <group position={position} rotation={rotation} scale={1.25}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c9d4e6" metalness={0.85} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.08, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 16, 1, true]} />
        <meshStandardMaterial color="#c9d4e6" metalness={0.85} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.06, 0.2]}>
        <boxGeometry args={[0.26, 0.04, 0.05]} />
        <meshStandardMaterial color="#1b1d22" />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <torusGeometry args={[0.22, 0.02, 6, 20]} />
        <meshStandardMaterial color="#e2b946" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.26, -0.05]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[0.06, 0.18, 0.3]} />
        <meshStandardMaterial color="#a82f2f" roughness={0.7} />
      </mesh>
    </group>
  );
};

const spikeDust = (at: number, x: number, seed: string) => (
  <Burst
    key={seed}
    at={at}
    position={[x, -3.4, Z]}
    count={34}
    size={0.55}
    duration={38}
    speed={0.09}
    spread={[1.2, 0.2, 1.4]}
    color="#b49e82"
    seed={seed}
  />
);

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      <DungeonDiorama catapultFrame={BEATS.chamberReveal} />

      <SpikePit spawnFrame={BEATS.spikeSpawn} />
      <HingedTrapdoor spawnFrame={BEATS.trapdoorSpawn} events={TRAPDOOR_EVENTS} />
      <PressurePlate
        spawnFrame={BEATS.plateSpawn}
        triggerFrames={[BEATS.plateClick]}
        trapdoorEvents={TRAPDOOR_EVENTS}
        glowFrames={70}
      />
      <BaitChest spawnFrame={BEATS.chestSpawn} />
      <IceBridge castFrame={BEATS.iceCast} meltFrame={BEATS.mageFall[0]} />
      <AlchemicalFlamers
        spawnFrame={BEATS.flamerSpawn}
        fireWindows={[
          [BEATS.fireStart, BEATS.fireEnd],
          [BEATS.finaleFire[0], BEATS.finaleFire[1]],
        ]}
      />
      <PendulumBlade
        spawnFrame={BEATS.pendulumSpawn}
        angle={pendulumAngle(frame)}
        previousAngle={pendulumAngle(frame - 1)}
      />
      <TrebuchetFloor
        revealFrame={BEATS.chamberReveal}
        buildWindow={[BEATS.catapultBuild[0], BEATS.catapultBuild[1]]}
        launchFrame={BEATS.launch}
        pivot={SLAB_PIVOT}
        slabLength={SLAB_LENGTH}
        angle={slabAngle(frame)}
      />
      <MimicChest
        position={MIMIC_POSITION}
        rotationY={-0.35}
        scale={1.25}
        spawnFrame={BEATS.mimicSpawn}
        openFrame={BEATS.mimicOpen}
        chompFrame={BEATS.chomp}
        burpFrame={BEATS.burp}
      />
      <SpitHelmet frame={frame} />

      <ActorView classType="goblin" actor={goblinActor(frame)} frame={frame} />
      <ActorView classType="rogue" actor={rogue1Actor(frame)} frame={frame} />
      <ActorView classType="rogue" actor={rogue2Actor(frame)} frame={frame} />
      <ActorView classType="mage" actor={mageActor(frame)} frame={frame} />
      <ActorView classType="paladin" actor={paladinActor(frame)} frame={frame} />
      {PARTY.map((member, index) => (
        <ActorView
          key={member.classType}
          classType={member.classType}
          actor={partyActor(index, frame)}
          frame={frame}
        />
      ))}

      {/* Impacts */}
      {spikeDust(BEATS.goblinLand, -1.0, "dust-goblin")}
      {spikeDust(BEATS.rogue2Fall[1], 0.9, "dust-rogue2")}
      {spikeDust(BEATS.mageFall[1], 0.4, "dust-mage")}
      {spikeDust(BEATS.paladinLand, -0.2, "dust-paladin")}
      <Burst
        at={BEATS.rogue1Leap[1]}
        position={[2.8, 0.05, Z]}
        count={16}
        size={0.35}
        duration={24}
        speed={0.05}
        spread={[0.6, 0.05, 0.8]}
        color="#a8a2a0"
        seed="rogue1-land"
      />
      <Burst
        at={BEATS.trapdoorSpawn + 16}
        position={[0, 0.05, Z]}
        count={40}
        size={0.5}
        duration={34}
        speed={0.1}
        spread={[4, 0.1, 3]}
        color="#a8a2a0"
        seed="trapdoor-install"
      />
      <Burst
        at={BEATS.bladeHit}
        position={[-0.9, 1.0, -0.3]}
        count={46}
        size={0.16}
        duration={22}
        speed={0.2}
        direction={[0.08, 0.06, 0.05]}
        gravity={-0.012}
        spread={[0.2, 0.3, 0.2]}
        color="#ffd27a"
        additive
        opacity={1}
        seed="blade-sparks"
      />
      <Burst
        at={BEATS.launch}
        position={[-7.6, 0.2, Z]}
        count={60}
        size={0.7}
        duration={45}
        speed={0.12}
        direction={[0, 0.04, 0.03]}
        spread={[4.2, 0.2, 2.8]}
        color="#a8a2a0"
        seed="launch-dust"
      />
      <Burst
        at={BEATS.chomp}
        position={[MIMIC_POSITION[0], 1.2, MIMIC_POSITION[2] + 0.4]}
        count={40}
        size={0.32}
        duration={30}
        speed={0.13}
        spread={[1.6, 0.4, 1.0]}
        color="#e8d6a8"
        seed="chomp-splinters"
      />
      <Burst
        at={BEATS.burp}
        position={[MIMIC_MOUTH[0] - 0.3, MIMIC_MOUTH[1] + 0.4, MIMIC_MOUTH[2] + 0.6]}
        count={26}
        size={0.6}
        duration={34}
        speed={0.06}
        direction={[-0.05, 0.03, 0.04]}
        spread={[0.6, 0.3, 0.6]}
        color="#c9b8e8"
        opacity={0.55}
        seed="burp-puff"
      />
    </>
  );
};
