import type React from "react";
import { useCurrentFrame } from "remotion";
import { Burst } from "../../artifacts/dungeon/Fx";
import { ActorView, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, arc, dust, sparks, type Actor } from "../../kit";
import type { CivilianClass } from "../../artifacts/characters/hero/kits";
import { AirSystem, SHOCK_BURST, VALVE_BURST } from "./components/AirSystem";
import { Blast } from "./components/Blast";
import { Dog } from "./components/Dog";
import { Exit, HATCH_Z } from "./components/Exit";
import { Explainer } from "./components/Explainer";
import { Furniture } from "./components/Furniture";
import { Geiger } from "./components/Geiger";
import { Rubble, Shed, Truck } from "./components/Shed";
import { Haze } from "./components/Haze";
import { Pipe } from "./components/Pipe";
import { Dogleg, StraightShaft } from "./components/Shafts";
import { Sky } from "./components/Sky";
import { Yard } from "./components/Yard";
import {
  BEATS,
  BURY_FILL,
  BURY_LEVEL,
  CAVE_IN,
  CROWD_IN,
  CROWD_STEP,
  DAD_EDGE_X,
  DAD_HOP,
  DAD_PIT_X,
  DECK_Y,
  DIG,
  DOGLEG_SEG,
  DOOR_Z,
  EXIT_GROW,
  EXIT_Y,
  GROUND_Y,
  HATCH_X,
  HAZE,
  HAZE_CLEAR,
  PIPE_DROP,
  PIT_FLOOR,
  PIT_X0,
  PIT_X1,
  RUBBLE_FALL,
  SHAFT_ON,
  SHED_X1,
  SHAFT_X,
  SHOCK_RUN,
  TRUCK_HIT,
  TUBE_Y,
  VALVE_SHUT,
  lerp,
  lineStart,
  progress,
  tubeWallY,
} from "./timeline";
import type { AdventurerPose, Expression } from "../../artifacts/characters/hero";

// ---------------------------------------------------------------------------
// Dad: the "you" of the narration.
// ---------------------------------------------------------------------------
const DAD_Z = -1.4;
const DAD_LAWN_X = PIT_X0 - 1.1;
/** After the pipe is buried he jogs to the new shaft and climbs down it. */
const DAD_TO_SHAFT = [SHAFT_ON + 4, SHAFT_ON + 18] as const;
const DAD_DOWN = [DAD_TO_SHAFT[1], DAD_TO_SHAFT[1] + 12] as const;
const SHAFT_Z = -0.15;

const dadActor = (frame: number): Actor | null => {
  if (frame < DAD_HOP[0]) {
    // Digging at the edge of the pit: swings in time with the flying dirt.
    const swing = Math.floor((frame - DIG[0]) / 6) % 2 === 0;
    const digging = frame >= DIG[0] && frame < DIG[1];
    return {
      pose: digging ? (swing ? "windup" : "smash") : "idle",
      position: [DAD_EDGE_X, GROUND_Y, DAD_Z],
      yaw: FACE_LEFT + 0.5,
      expression: digging ? "focus" : "happy",
    };
  }
  if (frame < DAD_HOP[1]) {
    const t = progress(frame, DAD_HOP);
    return {
      pose: "jump",
      position: [lerp(DAD_EDGE_X, DAD_PIT_X, t), lerp(GROUND_Y, PIT_FLOOR, t) + arc(t, 1.2), lerp(DAD_Z, -1.8, t)],
      yaw: FACE_LEFT + 0.3,
    };
  }
  if (frame < CAVE_IN[0] - 8) {
    // "You have a bunker": pleased with himself in the hole.
    return {
      pose: frame >= BEATS.bunker ? "cheer" : "idle",
      position: [DAD_PIT_X, PIT_FLOOR, -1.8],
      yaw: FACE_CAMERA,
      expression: "happy",
    };
  }
  if (frame < BEATS.redig) {
    // The walls slump in: cowers, then buried to the neck, dazed.
    const buried = frame >= CAVE_IN[0] + 10;
    return {
      pose: buried ? "idle" : "cower",
      position: [DAD_PIT_X, PIT_FLOOR - (buried ? 0.12 : 0), -1.8],
      yaw: FACE_CAMERA,
      expression: buried ? "dazed" : "scared",
    };
  }
  if (frame < DAD_TO_SHAFT[0]) {
    // Dug out, watching the pipe drop in and the dirt go back over it.
    return {
      pose: frame >= PIPE_DROP[1] && frame < PIPE_DROP[1] + 30 ? "point" : "idle",
      position: [DAD_LAWN_X, GROUND_Y, DAD_Z],
      yaw: FACE_RIGHT - 0.5,
      expression: frame >= PIPE_DROP[1] ? "happy" : "dazed",
    };
  }
  if (frame < DAD_DOWN[0]) {
    const t = progress(frame, DAD_TO_SHAFT);
    return {
      pose: "walk",
      position: [lerp(DAD_LAWN_X, SHAFT_X, t), GROUND_Y, lerp(DAD_Z, SHAFT_Z, t)],
      yaw: FACE_RIGHT,
      speed: 2,
    };
  }
  if (frame < DAD_DOWN[1]) {
    const t = progress(frame, DAD_DOWN);
    return { pose: "fall", position: [SHAFT_X, lerp(GROUND_Y, DECK_Y, t * t), SHAFT_Z], yaw: FACE_CAMERA };
  }
  // Inside the pipe. On "straight lines... doorway" he wanders under the open
  // shaft and the rays come straight down onto him; after the bend he steps back.
  const home: [number, number, number] = [SHAFT_X + 0.4, DECK_Y, -0.6];
  const under: [number, number, number] = [SHAFT_X, DECK_Y, 0.1];
  if (frame >= DAD_UNDER[0] && frame < DAD_BACK[1]) {
    const toUnder = progress(frame, DAD_UNDER);
    const back = progress(frame, DAD_BACK);
    const t = frame < DAD_BACK[0] ? toUnder : 1 - back;
    const moving = (frame < DAD_UNDER[1]) || frame >= DAD_BACK[0];
    const hit = frame >= DAD_HIT && frame < DAD_BACK[0];
    return {
      pose: moving ? "walk" : hit ? "cower" : "idle",
      position: [lerp(home[0], under[0], t), DECK_Y, lerp(home[2], under[2], t)],
      yaw: moving ? (frame < DAD_BACK[0] ? FACE_LEFT + 0.6 : FACE_RIGHT - 0.6) : FACE_CAMERA,
      expression: hit ? (frame < DAD_HIT + 30 ? "shock" : "pain") : "neutral",
    };
  }
  // "You hang a counter by the ladder": up the hatch shaft, the counter by his head.
  if (frame >= LADDER[0] && frame < LADDER[1]) {
    const clicking = frame >= BEATS.clicks && frame < BEATS.geiger;
    return { pose: clicking ? "cower" : "idle", position: [HATCH_X, LADDER_Y, -0.12], yaw: FACE_CAMERA, expression: clicking ? "shock" : "focus" };
  }
  const t = progress(frame, SETTLE);
  const walking = t > 0 && t < 1;
  return {
    pose: walking ? "walk" : crowdPose(frame),
    position: [lerp(home[0], DAD_SETTLE[0], t), DECK_Y, lerp(home[2], DAD_SETTLE[1], t)],
    yaw: walking ? Math.atan2(DAD_SETTLE[0] - home[0], DAD_SETTLE[1] - home[2]) : FACE_CAMERA + 0.2,
    expression: crowdFace(frame, "happy"),
  };
};

/** On the hatch ladder for the Geiger counter line. */
const LADDER = [lineStart("l8b") - 6, lineStart("l8c") - 8] as const;
const LADDER_Y = EXIT_Y + 0.9;
/** During "years... not even close" everyone settles where the furniture stays visible. */
const SETTLE = [lineStart("l8c") + 4, lineStart("l8c") + 30] as const;
const DAD_SETTLE: [number, number] = [-0.85, -0.35];

/** He is under the shaft for the doorway rays, then steps back after the bend. */
const DAD_UNDER = [BEATS.doorwayRays - 12, BEATS.doorwayRays + 4] as const;
const DAD_HIT = BEATS.doorwayRays + 24;
const DAD_BACK = [DOGLEG_SEG[0] + 2, DOGLEG_SEG[0] + 16] as const;

// ---------------------------------------------------------------------------
// The other nine and the dog drop down the shaft one after another on
// "ten people", walk to their spots, sweat in the stale air, cheer when the
// fan clears it, and jump when the shockwave bursts through the filter.
// ---------------------------------------------------------------------------
const CROWD: Array<{ cls: CivilianClass | "dog"; spot: [number, number]; settle: [number, number] }> = [
  { cls: "mom", spot: [0.45, -0.9], settle: [0.35, -1.3] },
  { cls: "kid", spot: [1.15, -0.45], settle: [0.95, -0.4] },
  { cls: "grandma", spot: [-1.25, -1.8], settle: [-0.5, -1.7] },
  { cls: "neighborA", spot: [0.05, -2.2], settle: [0.0, -2.4] },
  { cls: "neighborB", spot: [1.2, -1.9], settle: [0.65, -2.7] },
  { cls: "dog", spot: [0.35, -0.1], settle: [0.55, -1.0] },
  { cls: "neighborC", spot: [-0.45, -3.25], settle: [-0.55, -3.1] },
  { cls: "neighborD", spot: [0.8, -3.35], settle: [0.3, -3.6] },
  { cls: "neighborE", spot: [-1.2, -3.5], settle: [-0.3, -4.1] },
  { cls: "neighborF", spot: [1.45, -3.0], settle: [0.75, -4.0] },
];

/** The Kid peeks out of the new hatch: "you never know when it is safe". */
const KID_PEEK = [lineStart("l8a") - 6, lineStart("l8b") - 8] as const;

const crowdFace = (frame: number, rest: Expression): Expression => {
  if (frame >= BEATS.congrats) return "happy";
  if (frame >= SHOCK_RUN[1] && frame < SHOCK_RUN[1] + 36) return "shock";
  if (frame >= VALVE_SHUT && frame < VALVE_SHUT + 24) return "shock";
  if (frame >= HAZE[1] && frame < HAZE_CLEAR[0] + 20) return "pain";
  if (frame >= HAZE_CLEAR[0] + 20 && frame < HAZE_CLEAR[1] + 30) return "happy";
  return rest;
};
const crowdPose = (frame: number): AdventurerPose => {
  if (frame >= BEATS.congrats) return "cheer";
  if (frame >= SHOCK_RUN[1] && frame < SHOCK_RUN[1] + 20) return "cower";
  if (frame >= HAZE_CLEAR[0] + 30 && frame < HAZE_CLEAR[1]) return "cheer";
  return "idle";
};

const DROP_TOP = tubeWallY(SHAFT_X) - 0.1;
const crowdState = (i: number, frame: number) => {
  const t0 = CROWD_IN + i * CROWD_STEP;
  if (frame < t0) return null;
  const [sx, sz] = CROWD[i].spot;
  if (frame < t0 + 9) {
    const t = progress(frame, [t0, t0 + 9]);
    return { pose: "fall" as const, position: [SHAFT_X, lerp(DROP_TOP - 1.6, DECK_Y, t * t), -0.15] as [number, number, number], yaw: FACE_CAMERA };
  }
  if (frame < t0 + 26) {
    const t = progress(frame, [t0 + 9, t0 + 26]);
    return {
      pose: "walk" as const,
      position: [lerp(SHAFT_X, sx, t), DECK_Y, lerp(-0.15, sz, t)] as [number, number, number],
      yaw: Math.atan2(sx - SHAFT_X, sz + 0.15),
    };
  }
  if (CROWD[i].cls === "kid" && frame >= KID_PEEK[0] && frame < KID_PEEK[1]) {
    // Head just out of the hatch, looking left and right.
    return { pose: "idle" as const, position: [HATCH_X, -0.78, HATCH_Z + 0.25] as [number, number, number], yaw: Math.sin((frame - KID_PEEK[0]) * 0.08) * 0.7 };
  }
  const [tx, tz] = CROWD[i].settle;
  const t = progress(frame, SETTLE);
  if (t > 0 && t < 1) {
    return { pose: "walk" as const, position: [lerp(sx, tx, t), DECK_Y, lerp(sz, tz, t)] as [number, number, number], yaw: Math.atan2(tx - sx, tz - sz) };
  }
  const [x, z] = t >= 1 ? [tx, tz] : [sx, sz];
  return { pose: crowdPose(frame), position: [x, DECK_Y, z] as [number, number, number], yaw: FACE_CAMERA + (x > 0 ? -0.25 : 0.25) };
};

const crowdActor = (i: number, frame: number): Actor | null => {
  const st = crowdState(i, frame);
  if (!st) return null;
  const peeking = CROWD[i].cls === "kid" && frame >= KID_PEEK[0] && frame < KID_PEEK[1];
  const face = peeking ? (frame >= BEATS.safe ? "scared" : "focus") : crowdFace(frame, "neutral");
  return { ...st, expression: st.pose === "fall" ? "shock" : face };
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Sky frame={frame} />
      <Yard frame={frame} />
      <Pipe frame={frame} />
      <StraightShaft frame={frame} />
      <Dogleg frame={frame} />
      <AirSystem frame={frame} />
      <Blast frame={frame} />
      <Explainer frame={frame} />
      <Haze frame={frame} />
      <Shed frame={frame} />
      <Truck frame={frame} />
      <Rubble frame={frame} />
      <Exit frame={frame} />
      <Geiger frame={frame} position={[HATCH_X + 0.3, LADDER_Y + 1.05, 0.02]} scale={1.7} />
      <Furniture frame={frame} />

      <ActorView classType="dad" actor={dadActor} frame={frame} />
      {/* Irradiated: a sickly glow while the rays pour onto him */}
      {frame >= DAD_HIT && frame < DAD_BACK[0] ? (
        <mesh position={[SHAFT_X, DECK_Y + 0.9, 0.1]} scale={[0.75, 1.15, 0.75]}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshBasicMaterial color="#b8ff4a" transparent opacity={0.22 + 0.1 * Math.sin(frame * 0.8)} toneMapped={false} depthWrite={false} />
        </mesh>
      ) : null}
      {CROWD.map((c, i) => {
        if (c.cls === "dog") {
          const st = crowdState(i, frame);
          return st ? <Dog key={i} position={st.position} yaw={st.yaw} frame={frame} /> : null;
        }
        return <ActorView key={i} classType={c.cls} actor={(f) => crowdActor(i, f)} frame={frame} />;
      })}

      {/* Dirt thrown out of the pit while it is dug */}
      {Array.from({ length: Math.floor((DIG[1] - DIG[0]) / 6) }, (_, i) => (
        <Burst
          key={`dig${i}`}
          at={DIG[0] + i * 6}
          position={[lerp(PIT_X0 + 0.6, PIT_X1 - 0.6, (i % 3) / 2), lerp(-0.3, PIT_FLOOR + 0.4, progress(DIG[0] + i * 6, DIG)), -2]}
          count={14}
          size={0.22}
          duration={26}
          speed={0.12}
          direction={[0.05, 0.16, 0.02]}
          gravity={-0.012}
          spread={[0.6, 0.1, 0.6]}
          color="#6e4a2c"
          opacity={1}
          seed={`dig-${i}`}
        />
      ))}
      {dust(DAD_HOP[1], [DAD_PIT_X, PIT_FLOOR + 0.05, -1.8], "dad-land", 0.6)}

      {/* Cave-in: both walls slump onto him */}
      {[PIT_X0 + 0.3, PIT_X1 - 0.3].map((x, i) => (
        <Burst
          key={`cave${i}`}
          at={CAVE_IN[0]}
          position={[x, -1.5, -1.6]}
          count={40}
          size={0.42}
          duration={30}
          speed={0.1}
          direction={[i ? -0.08 : 0.08, -0.05, 0]}
          gravity={-0.016}
          spread={[0.4, 2.4, 1.6]}
          color="#7a5232"
          opacity={1}
          seed={`cave-${i}`}
        />
      ))}
      {dust(CAVE_IN[0] + 12, [DAD_PIT_X, BURY_LEVEL, -1.6], "cave-dust", 1.4)}

      {/* Pipe lands; then the burial */}
      {dust(PIPE_DROP[1], [0, PIT_FLOOR + 0.1, -1.5], "pipe-dust", 2)}
      {sparks(PIPE_DROP[1], [-1.8, TUBE_Y - 1.4, 0.2], "pipe-sparks")}
      {dust(BURY_FILL[1], [0, GROUND_Y + 0.1, -1.5], "bury-dust", 1.6)}
      {dust(SHAFT_ON + 30, [SHAFT_X, DECK_Y + 0.05, 0.2], "dad-deck", 0.5)}
      {CROWD.map((_, i) => dust(CROWD_IN + i * CROWD_STEP + 9, [SHAFT_X, DECK_Y + 0.05, 0.2], `crowd-land-${i}`, 0.35))}

      {/* Shockwave bursts through the filter; the next one splashes on the shut valve */}
      {sparks(SHOCK_RUN[1], SHOCK_BURST, "shock-burst", "#e8f4ff", 60)}
      {dust(SHOCK_RUN[1], SHOCK_BURST, "shock-dust", 1.2)}
      {sparks(VALVE_SHUT, VALVE_BURST, "valve-burst", "#e8f4ff", 50)}

      {/* Truck hits the door; rubble lands; the hatch is dug out */}
      {dust(TRUCK_HIT, [SHED_X1 + 0.2, 0.6, (DOOR_Z[0] + DOOR_Z[1]) / 2], "truck-dust", 1.2)}
      {sparks(TRUCK_HIT, [SHED_X1 + 0.15, 0.9, (DOOR_Z[0] + DOOR_Z[1]) / 2], "truck-sparks")}
      {dust(RUBBLE_FALL[1], [SHED_X1 + 0.8, 0.1, (DOOR_Z[0] + DOOR_Z[1]) / 2], "rubble-dust", 1.4)}
      {dust(EXIT_GROW[1], [HATCH_X, 0.1, HATCH_Z], "hatch-dust", 0.9)}
    </>
  );
};
