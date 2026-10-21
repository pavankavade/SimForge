import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import {
  AdventurerUnit,
  Burst,
  CeilingPistons,
  GelatinousCubeTrap,
  MagneticSpikeBoulder,
  SlimeSlick,
  SlopedCorridor,
  SplitBoulder,
  TripwireBoulder,
} from "../../artifacts";
import type { AdventurerClass, AdventurerPose } from "../../artifacts";
import type { Vec3 } from "../../engine/types";
import {
  BEATS,
  launchTrajectory,
  SLOPE_ANGLE,
  yFloor,
} from "./timeline";

const CHAR_SCALE = 1.12;
const Z = -0.6;
const FACE_RIGHT = Math.PI / 2;
const FACE_LEFT = -Math.PI / 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const progress = (frame: number, [a, b]: readonly [number, number]) =>
  clamp01((frame - a) / (b - a));
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

interface ActorState {
  classType: AdventurerClass;
  pose: AdventurerPose;
  position: Vec3;
  rotation: Vec3;
  scale?: number;
}

// ---------------------------------------------------------------------------
// Stage 1: Goblin trips wire, gets squashed. Rogue leaps over boulder.
// ---------------------------------------------------------------------------
const goblinActor = (frame: number): ActorState | null => {
  const [enterStart, enterEnd] = BEATS.goblinEnter;
  if (frame < enterStart || frame > BEATS.goblinSink + 14) return null;

  if (frame < enterEnd) {
    const t = progress(frame, BEATS.goblinEnter);
    const x = lerp(-7.2, -2.0, t);
    return {
      classType: "goblin",
      pose: "walk",
      position: [x, yFloor(x), Z],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  if (frame < BEATS.goblinSquash) {
    // Reaching down / stepping on wire
    const t = progress(frame, [enterEnd, BEATS.goblinSquash]);
    return {
      classType: "goblin",
      pose: t < 0.6 ? "walk" : "idle",
      position: [-2.0, yFloor(-2.0), Z],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  // Squashed flat on the ramp floor
  const sink = 0.8 * clamp01((frame - BEATS.goblinSink) / 14);
  return {
    classType: "goblin",
    pose: "sprawl",
    position: [-2.0, yFloor(-2.0) - 0.22 - sink, Z],
    rotation: [0, 0.2, Math.PI / 2 + SLOPE_ANGLE],
    scale: 0.9,
  };
};

const rogue1Actor = (frame: number): ActorState | null => {
  const [runStart, runEnd] = BEATS.rogue1Run;
  const [leapStart, leapEnd] = BEATS.rogue1Leap;
  const [exitStart, exitEnd] = BEATS.rogue1Exit;

  if (frame < runStart || frame > exitEnd) return null;

  if (frame < runEnd) {
    const t = progress(frame, BEATS.rogue1Run);
    const x = lerp(-7.5, -2.8, t);
    return {
      classType: "rogue",
      pose: "walk",
      position: [x, yFloor(x), Z],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  if (frame < leapStart) {
    // Spots wire and flicks dagger to trigger early
    const look = Math.sin(Math.PI * progress(frame, [runEnd, leapStart]));
    return {
      classType: "rogue",
      pose: "cast",
      position: [-2.8, yFloor(-2.8), Z],
      rotation: [0.2 * look, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  if (frame < leapEnd) {
    const t = progress(frame, BEATS.rogue1Leap);
    const x = lerp(-2.8, 1.2, t);
    const jumpHeight = Math.sin(Math.PI * t) * 2.3;
    return {
      classType: "rogue",
      pose: "jump",
      position: [x, yFloor(x) + jumpHeight, Z],
      rotation: [0, FACE_RIGHT, -0.3 * Math.sin(Math.PI * t) + SLOPE_ANGLE],
    };
  }

  if (frame < exitStart) {
    return {
      classType: "rogue",
      pose: "idle",
      position: [1.2, yFloor(1.2), Z],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  const t = progress(frame, BEATS.rogue1Exit);
  const x = lerp(1.2, 8.2, t);
  return {
    classType: "rogue",
    pose: "walk",
    position: [x, yFloor(x), Z],
    rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
  };
};

// ---------------------------------------------------------------------------
// Stage 2: Rogue slips on green slime into wide boulder; Paladin smashes boulder
// ---------------------------------------------------------------------------
const rogue2Actor = (frame: number): ActorState | null => {
  const [runStart, runEnd] = BEATS.rogue2Run;
  const [, leapEnd] = BEATS.rogue2Leap;
  const [, slipEnd] = BEATS.rogue2Slip;

  if (frame < runStart || frame > BEATS.rogue2Sink + 14) return null;

  if (frame < runEnd) {
    const t = progress(frame, BEATS.rogue2Run);
    const x = lerp(-7.5, -2.4, t);
    return {
      classType: "rogue",
      pose: "walk",
      position: [x, yFloor(x), Z],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  if (frame < leapEnd) {
    const t = progress(frame, BEATS.rogue2Leap);
    const x = lerp(-2.4, -1.5, t);
    const jumpH = Math.sin(Math.PI * t) * 1.6;
    return {
      classType: "rogue",
      pose: "jump",
      position: [x, yFloor(x) + jumpH, Z],
      rotation: [0, FACE_RIGHT, -0.2 * Math.sin(Math.PI * t) + SLOPE_ANGLE],
    };
  }

  if (frame < slipEnd) {
    const t = progress(frame, BEATS.rogue2Slip);
    // Slipping backward down the slope on green slime!
    const x = lerp(-1.5, -2.1, easeOut(t));
    return {
      classType: "rogue",
      pose: "slip",
      position: [x, yFloor(x), Z],
      rotation: [0, FACE_RIGHT, -0.6 * t + SLOPE_ANGLE],
    };
  }

  // Squashed / flattened by boulder on slime
  const sink = 0.8 * clamp01((frame - BEATS.rogue2Sink) / 14);
  return {
    classType: "rogue",
    pose: "sprawl",
    position: [-2.1, yFloor(-2.1) - 0.2 - sink, Z],
    rotation: [0, -0.2, -Math.PI / 2 + SLOPE_ANGLE],
  };
};

const paladinActor = (frame: number): ActorState | null => {
  // Stage 2 Paladin: enters, braces stance, raises hammer, smashes boulder
  if (frame >= BEATS.paladinEnter[0] && frame < 940) {
    const [, enterEnd] = BEATS.paladinEnter;
    if (frame < enterEnd) {
      const t = progress(frame, BEATS.paladinEnter);
      const x = lerp(-7.5, -3.0, t);
      return {
        classType: "paladin",
        pose: "shieldWalk",
        position: [x, yFloor(x), Z],
        rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
      };
    }

    if (frame < BEATS.paladinSmash) {
      return {
        classType: "paladin",
        pose: "shield",
        position: [-3.0, yFloor(-3.0), Z],
        rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
      };
    }

    if (frame < BEATS.paladinSmash + 18) {
      return {
        classType: "paladin",
        pose: "smash",
        position: [-3.0, yFloor(-3.0), Z],
        rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
      };
    }

    return {
      classType: "paladin",
      pose: "idle",
      position: [-3.0, yFloor(-3.0), Z],
      rotation: [0, 0.3, SLOPE_ANGLE],
    };
  }

  // Stage 3 Paladin: steps forward, violently dragged magnetically into spiked iron ball
  if (frame >= BEATS.paladinStep[0] && frame < BEATS.paladinSink3 + 14) {
    const [, stepEnd] = BEATS.paladinStep;
    if (frame < stepEnd) {
      const t = progress(frame, BEATS.paladinStep);
      const x = lerp(-3.0, -2.2, t);
      return {
        classType: "paladin",
        pose: "walk",
        position: [x, yFloor(x), Z],
        rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
      };
    }

    if (frame < BEATS.paladinSpikeHit) {
      const t = progress(frame, BEATS.paladinMagnetDrag);
      // Pulled violently forward into the spiked ball at x = -1.5
      const x = lerp(-2.2, -1.5, easeInOut(t));
      return {
        classType: "paladin",
        pose: "launch",
        position: [x, yFloor(x) + 0.3 * Math.sin(t * Math.PI), Z],
        rotation: [0, FACE_RIGHT, -0.4 * t + SLOPE_ANGLE],
      };
    }

    const sink = 0.8 * clamp01((frame - BEATS.paladinSink3) / 14);
    return {
      classType: "paladin",
      pose: "sprawl",
      position: [-1.5, yFloor(-1.5) - 0.2 - sink, Z],
      rotation: [0, 0.4, Math.PI / 2 + SLOPE_ANGLE],
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Stage 3 & 4: Mage casts Levitate, party floats to ceiling; Piston swats Mage
// ---------------------------------------------------------------------------
const mageActor = (frame: number): ActorState | null => {
  if (frame < BEATS.mageEnter[0] || frame > BEATS.mageSink4 + 14) return null;

  const [, enterEnd] = BEATS.mageEnter;
  if (frame < enterEnd) {
    const t = progress(frame, BEATS.mageEnter);
    const x = lerp(-7.0, -0.8, t);
    return {
      classType: "mage",
      pose: "walk",
      position: [x, yFloor(x), Z],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  if (frame < BEATS.partyFloatUp[0]) {
    // Chanting / raising staff to cast Levitate
    return {
      classType: "mage",
      pose: "cast",
      position: [-0.8, yFloor(-0.8), Z],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  if (frame < BEATS.partyFloatUp[1]) {
    const t = progress(frame, BEATS.partyFloatUp);
    const floatY = lerp(yFloor(-0.8), yFloor(-0.8) + 3.8, easeOut(t));
    return {
      classType: "mage",
      pose: "float",
      position: [-0.8, floatY, Z],
      rotation: [0, FACE_RIGHT, 0],
    };
  }

  // Floating near rafters until hydraulic piston slams down
  if (frame < BEATS.pistonSlam) {
    const bob = Math.sin(frame * 0.12) * 0.15;
    return {
      classType: "mage",
      pose: "float",
      position: [-0.8, yFloor(-0.8) + 3.8 + bob, Z],
      rotation: [0, FACE_RIGHT, 0],
    };
  }

  if (frame < BEATS.mageSwatted[1]) {
    // Swatted rapidly down to floor
    const t = progress(frame, BEATS.mageSwatted);
    const y = lerp(yFloor(-0.8) + 3.8, yFloor(-0.8), t * t);
    return {
      classType: "mage",
      pose: "fall",
      position: [-0.8, y, Z],
      rotation: [0, FACE_RIGHT, Math.PI * t],
    };
  }

  // Sprawled on track floor
  const sink = 0.8 * clamp01((frame - BEATS.mageSink4) / 14);
  return {
    classType: "mage",
    pose: "sprawl",
    position: [-0.8, yFloor(-0.8) - 0.2 - sink, Z],
    rotation: [0, -0.3, Math.PI / 2 + SLOPE_ANGLE],
  };
};

// Additional floating party members during Levitate (Stage 3)
const floatingRogueActor = (frame: number): ActorState | null => {
  if (frame < BEATS.partyFloatUp[0] || frame >= BEATS.pistonSlam) return null;
  const x = -2.2;
  const t = progress(frame, BEATS.partyFloatUp);
  const floatY = lerp(yFloor(x), yFloor(x) + 3.6, easeOut(t));
  const bob = Math.sin(frame * 0.14 + 1.2) * 0.12;
  return {
    classType: "rogue",
    pose: "float",
    position: [x, floatY + (t >= 1 ? bob : 0), Z + 0.3],
    rotation: [0, FACE_RIGHT, 0],
  };
};

const floatingPaladinActor = (frame: number): ActorState | null => {
  if (frame < BEATS.partyFloatUp[0] || frame >= BEATS.pistonSlam) return null;
  const x = 0.6;
  const t = progress(frame, BEATS.partyFloatUp);
  const floatY = lerp(yFloor(x), yFloor(x) + 3.7, easeOut(t));
  const bob = Math.sin(frame * 0.11 + 2.1) * 0.14;
  return {
    classType: "paladin",
    pose: "float",
    position: [x, floatY + (t >= 1 ? bob : 0), Z - 0.3],
    rotation: [0, FACE_RIGHT, 0],
  };
};

// ---------------------------------------------------------------------------
// Stage 5 Finale: Party flees left, door slams, ramp launches party into Cube!
// ---------------------------------------------------------------------------
const finalePartyMember = (
  frame: number,
  classType: AdventurerClass,
  startX: number,
  offsetZ: number
): ActorState | null => {
  if (frame < BEATS.partyFleeLeft[0]) return null;

  // Running left towards the entrance
  if (frame < BEATS.doorSlam + 10) {
    const t = progress(frame, BEATS.partyFleeLeft);
    const x = lerp(startX, -7.2, t);
    return {
      classType,
      pose: "walk",
      position: [x, yFloor(x), Z + offsetZ],
      rotation: [0, FACE_LEFT, SLOPE_ANGLE],
    };
  }

  // Trapped against blast door at half-pipe ramp
  if (frame < BEATS.launchStart) {
    return {
      classType,
      pose: "idle",
      position: [-7.2, yFloor(-7.2), Z + offsetZ],
      rotation: [0, FACE_RIGHT, SLOPE_ANGLE],
    };
  }

  // Airborne flight from ramp launch into the Gelatinous Cube
  if (frame < BEATS.cubeSplash) {
    const traj = launchTrajectory(frame, BEATS.launchStart, BEATS.cubeSplash, offsetZ);
    return {
      classType,
      pose: "launch",
      position: traj.position,
      rotation: traj.rotation,
    };
  }

  // Floating inside the Gelatinous Cube! (dissolving into jelly)
  const cubeWobbleTime = (frame - BEATS.cubeSplash) * 0.08;
  const floatX = 4.0 + Math.sin(cubeWobbleTime + offsetZ * 2) * 0.6;
  const floatY = yFloor(4.0) + 4.2 + Math.cos(cubeWobbleTime * 0.8 + offsetZ) * 0.5;
  const floatZ = Z + offsetZ * 0.7;

  return {
    classType,
    pose: "sprawl",
    position: [floatX, floatY, floatZ],
    rotation: [0.3 * Math.sin(cubeWobbleTime), 0.5, cubeWobbleTime * 0.2],
    scale: 0.9,
  };
};

// Final launched boulder in Stage 5
const finaleBoulderPosition = (frame: number): { position: Vec3; rotation: Vec3 } | null => {
  if (frame < BEATS.boulderRollFinal) return null;

  const radius = 1.2;

  // Rolling down track towards ramp at x = -7.4
  if (frame < BEATS.launchStart) {
    const t = progress(frame, [BEATS.boulderRollFinal, BEATS.launchStart]);
    const x = lerp(6.8, -7.4, t);
    const y = yFloor(x) + radius * 0.98;
    const rotZ = (6.8 - x) / radius;
    return {
      position: [x, y, Z],
      rotation: [0, 0, rotZ],
    };
  }

  // Airborne flight off launch ramp into Gelatinous Cube
  if (frame < BEATS.cubeSplash) {
    const traj = launchTrajectory(frame, BEATS.launchStart, BEATS.cubeSplash, 0);
    return {
      position: [traj.position[0], traj.position[1] + 0.3, Z],
      rotation: traj.rotation,
    };
  }

  // Trapped inside cube
  const wobbleT = (frame - BEATS.cubeSplash) * 0.06;
  return {
    position: [
      4.0 + Math.sin(wobbleT) * 0.3,
      yFloor(4.0) + 3.8 + Math.cos(wobbleT) * 0.2,
      Z,
    ],
    rotation: [wobbleT * 0.2, wobbleT * 0.3, 0],
  };
};

// ---------------------------------------------------------------------------
// Main Procedural Scene
// ---------------------------------------------------------------------------
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  const actors: (ActorState | null)[] = [
    goblinActor(frame),
    rogue1Actor(frame),
    rogue2Actor(frame),
    paladinActor(frame),
    mageActor(frame),
    floatingRogueActor(frame),
    floatingPaladinActor(frame),
    finalePartyMember(frame, "paladin", 2.2, 0),
    finalePartyMember(frame, "rogue", 3.2, 0.4),
    finalePartyMember(frame, "mage", 4.2, -0.4),
  ];

  const finaleBoulder = finaleBoulderPosition(frame);

  return (
    <>
      {/* Dynamic Master Incline Diorama */}
      <SlopedCorridor />

      {/* Stage 1: Tripwire Boulder */}
      <TripwireBoulder
        rollStartFrame={BEATS.boulderRoll1}
        wireSnappedFrame={BEATS.goblinTrip}
        showWire={frame < BEATS.wideBoulderSpawn}
        activeWindow={[0, 440]}
      />

      {/* Stage 1b: Rogue leap boulder */}
      {frame >= 320 && frame <= 440 && (
        <TripwireBoulder
          rollStartFrame={BEATS.boulderRoll1b}
          wireSnappedFrame={BEATS.boulderRoll1b}
          showWire={false}
          showGate={false}
          activeWindow={[320, 440]}
        />
      )}

      {/* Stage 2: Green Alchemical Slime Slick */}
      <SlimeSlick spawnFrame={BEATS.slimeSpawn} endFrame={BEATS.spikeSpawn} />

      {/* Stage 2: Wide Boulder (splits on Paladin warhammer smash) */}
      <SplitBoulder
        rollStartFrame={BEATS.boulderRoll2b}
        shatterFrame={BEATS.paladinSmash}
        endFrame={950}
      />

      {/* Stage 3: Magnetic Spiked Iron Boulder & Underground Electromagnet */}
      <MagneticSpikeBoulder
        spawnFrame={BEATS.spikeSpawn}
        rollStartFrame={BEATS.ironBoulderRoll3}
        magnetActiveFrame={BEATS.magnetActive}
        endFrame={1780}
      />

      {/* Stage 3b: Harmless roll under floating party */}
      {frame >= 1320 && frame <= 1470 && (
        <TripwireBoulder
          rollStartFrame={BEATS.ironBoulderRoll3b}
          wireSnappedFrame={BEATS.ironBoulderRoll3b}
          showWire={false}
          showGate={false}
          activeWindow={[1320, 1470]}
        />
      )}

      {/* Stage 4: Hydraulic Ceiling Crushers */}
      <CeilingPistons
        spawnFrame={BEATS.pistonsReveal}
        slamFrame={BEATS.pistonSlam}
        endFrame={1790}
      />

      {/* Stage 5: Entrance Blast Door, Half-Pipe Ramp & Suspended Gelatinous Cube */}
      <GelatinousCubeTrap
        spawnFrame={BEATS.cubeTrapReveal}
        doorSlamFrame={BEATS.doorSlam}
        splashFrame={BEATS.cubeSplash}
      />

      {/* Stage 5: Finale launched boulder */}
      {finaleBoulder && (
        <group position={finaleBoulder.position} rotation={finaleBoulder.rotation as unknown as THREE.Euler}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[1.2, 20, 16]} />
            <meshStandardMaterial color="#4a4d58" roughness={0.85} metalness={0.1} />
          </mesh>
        </group>
      )}

      {/* Dynamic Animated Character Units */}
      {actors.map((actor, idx) => {
        if (!actor) return null;
        return (
          <AdventurerUnit
            key={`actor-${actor.classType}-${idx}`}
            classType={actor.classType}
            pose={actor.pose}
            position={actor.position}
            rotation={actor.rotation}
            scale={(actor.scale ?? 1) * CHAR_SCALE}
            animFrame={frame}
          />
        );
      })}

      {/* Particle Bursts on Impacts and Key Action Beats */}
      {/* Goblin squashed dust */}
      <Burst
        at={BEATS.goblinSquash}
        position={[-2.0, yFloor(-2.0) + 0.3, Z]}
        color="#a09485"
        count={35}
        size={0.16}
        speed={0.12}
      />

      {/* Paladin hammer smash rock burst & golden sparks */}
      <Burst
        at={BEATS.paladinSmash}
        position={[-1.7, yFloor(-1.7) + 1.2, Z]}
        color="#8c8a92"
        count={50}
        size={0.22}
        speed={0.18}
      />
      <Burst
        at={BEATS.paladinSmash}
        position={[-1.7, yFloor(-1.7) + 1.2, Z]}
        color="#ffd84d"
        count={25}
        size={0.18}
        additive
        speed={0.22}
      />

      {/* Electromagnet cyan electric sparks */}
      <Burst
        at={BEATS.magnetActive}
        position={[-1.5, yFloor(-1.5) + 0.2, Z]}
        color="#4dc4ff"
        count={30}
        size={0.18}
        additive
        speed={0.16}
      />

      {/* Mage Levitate purple arcane aura burst */}
      <Burst
        at={BEATS.mageLevitate}
        position={[-0.8, yFloor(-0.8) + 1.2, Z]}
        color="#aa44ff"
        count={40}
        size={0.2}
        additive
        speed={0.14}
      />

      {/* Ceiling Piston impact dust & debris */}
      <Burst
        at={BEATS.pistonSlam + 6}
        position={[-0.8, yFloor(-0.8) + 0.4, Z]}
        color="#c8bcae"
        count={45}
        size={0.2}
        speed={0.2}
      />

      {/* Blast door slam ground dust */}
      <Burst
        at={BEATS.doorSlam + 4}
        position={[-8.2, yFloor(-8.2) + 0.2, Z]}
        color="#857c72"
        count={40}
        size={0.18}
        speed={0.15}
      />

      {/* Gelatinous Cube splash emerald green droplet explosion */}
      <Burst
        at={BEATS.cubeSplash}
        position={[4.0, yFloor(4.0) + 4.2, Z]}
        color="#00ff66"
        count={65}
        size={0.25}
        additive
        speed={0.24}
      />
    </>
  );
};
