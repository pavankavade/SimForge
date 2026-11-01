import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { ActorView, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, dust, lying, sparks, type Actor } from "../../kit";
import { Block, Bounce, LP, matte } from "../../lowpoly";
import { House } from "./components/House";
import { LabRig, PANEL_FACE } from "./components/Lab";
import { Clouds, DebrisStream, LabSet, StormLight, Tornadoes, Wind, WindowGust, Yard } from "./components/Outdoors";
import { SafeRoom } from "./components/SafeRoom";
import {
  BEATS,
  BED_START,
  BLOW,
  BOARD_HIT,
  BOARD_LEN,
  BOARD_SHOWN,
  BOARD_Y,
  BOARD_Z,
  CLOSET_SPOT,
  DOOR_OPEN,
  DOOR_Z0,
  DOOR_Z1,
  DOWN,
  FAMILY,
  FIRE,
  HEDGE_SPOT,
  HIT3,
  L2_START,
  L3B_START,
  L4C_START,
  L4_START,
  L5_START,
  L6_START,
  LAB_ON,
  LAB_X,
  LAB_Y,
  LANE,
  LAUNCH,
  LAWN_Y,
  LAYER_IN,
  LIFT,
  MUZZLE_DX,
  OUT_SPOT,
  PART_X,
  PEBBLE_HIT,
  ROOM_SPOT,
  START_X,
  STEEL_HANG,
  TEAR,
  TEST_Y,
  VENT_XS,
  VENT_Y,
  WALL_H,
  WALL_Z,
  WIN_X,
  X_SLAM,
  anchorAt,
  arc,
  boardTip,
  easeInOut,
  easeOutBack,
  lerp,
  lineStart,
  progress,
  run1,
  walk2,
  walkOut,
  type Member,
} from "./timeline";

// ---------------------------------------------------------------------------
// The family: one performance per member across all six attempts.
// ---------------------------------------------------------------------------

const DOOR_X: [number, number] = [-PART_X - 0.05, -PART_X + 2.2];
/** Feet ride up over the blown-in door lying on the floor. */
const floorAt = (f: number, x: number, z: number) => (f >= BLOW[1] && x > DOOR_X[0] && x < DOOR_X[1] && z > DOOR_Z0 && z < DOOR_Z1 ? 0.08 : 0);

const inRoom = (m: Member, f: number, expression: Actor["expression"], pose: Actor["pose"] = "idle", yaw = FACE_CAMERA): Actor => ({
  pose,
  position: [ROOM_SPOT[m], 0, LANE[m]],
  yaw,
  expression,
});

const familyActor = (m: Member, f: number): Actor | null => {
  const z = LANE[m];
  // L1: living room -> closet; sucked out with the wall into the hedge.
  if (f < L2_START) {
    const run = run1(m);
    const launch = LAUNCH(m);
    if (f < run[0]) {
      const look = f >= BEATS.siren && f < BEATS.siren + 14;
      return { pose: "idle", position: [START_X[m], 0, z], yaw: look ? FACE_RIGHT - 0.5 : FACE_CAMERA, expression: f >= BEATS.siren ? "shock" : "happy" };
    }
    if (f < run[1]) {
      const x = lerp(START_X[m], CLOSET_SPOT[m], easeInOut(progress(f, run)));
      return { pose: "run", position: [x, 0, z], yaw: FACE_LEFT, speed: 2.2, expression: "scared" };
    }
    if (f < launch[0]) {
      return { pose: "cower", position: [CLOSET_SPOT[m], 0, z], yaw: FACE_CAMERA + 0.3, expression: f >= TEAR[0] ? "shock" : "scared" };
    }
    if (f < launch[1]) {
      const p = progress(f, launch);
      const x = lerp(CLOSET_SPOT[m], HEDGE_SPOT[m], p);
      const y = arc(p, 3.4) + lerp(0, LAWN_Y, p);
      return { pose: "launch", position: [x, y, z], yaw: FACE_LEFT, tilt: p * Math.PI * 2, pivot: 0.95, expression: "yell", blend: 3 };
    }
    return lying({ classType: m, x: HEDGE_SPOT[m], z, frame: f, since: launch[1], floorY: LAWN_Y, expression: "dazed" });
  }
  // L2: walk from the bedroom into the middle room; the board.
  if (f < L3B_START) {
    const walk = walk2(m);
    if (f < walk[0]) return { pose: "idle", position: [BED_START[m], 0, z], yaw: FACE_RIGHT, expression: "focus", blend: 0 };
    if (f < walk[1]) {
      const x = lerp(BED_START[m], ROOM_SPOT[m], easeInOut(progress(f, walk)));
      return { pose: "walk", position: [x, 0, z], yaw: FACE_RIGHT, speed: 1.1, expression: "focus" };
    }
    if (f < BOARD_HIT) {
      if (m === "dad" && f >= BEATS.middle && f < BEATS.middle + 30) return inRoom(m, f, "happy", "point", FACE_CAMERA + 0.3);
      return inRoom(m, f, BEATS.stay <= f ? "neutral" : "happy");
    }
    if (m === "dad") {
      // Double take: glance at the board, back to camera, then the shock.
      if (f < BOARD_HIT + 9) return inRoom(m, f, "neutral", "idle", FACE_LEFT + 0.5);
      if (f < BOARD_HIT + 16) return inRoom(m, f, "shock");
      return inRoom(m, f, "scared", "cower");
    }
    return inRoom(m, f, f < BOARD_HIT + 3 ? "shock" : "scared", f < BOARD_HIT + 3 ? "idle" : "cower");
  }
  // L3b: watching the walls get lined.
  if (f < L4_START) {
    if (m === "kid" && f >= BEATS.steel3 + 4) return inRoom(m, f, "happy", "point", FACE_LEFT + 0.6);
    return inRoom(m, f, f >= BEATS.steel3 ? "happy" : "focus");
  }
  // L4: the room lifts off around them, then slams down and gets bolted.
  if (f < L5_START) {
    if (f >= BEATS.under && f < LIFT[0]) return inRoom(m, f, "shock");
    if (f >= LIFT[0] && f < DOWN[1]) return inRoom(m, f, "scared", "cower");
    if (f >= DOWN[1] && f < DOWN[1] + 12) return inRoom(m, f, "dazed");
    if (m === "kid" && f >= BEATS.around) return inRoom(m, f, "happy", "cheer");
    return inRoom(m, f, "neutral");
  }
  // L5: the door blows in; the steel door goes up.
  if (f < L6_START) {
    if (f >= BLOW[0] - 10 && f < STEEL_HANG[1] + 8) return inRoom(m, f, "scared", "cower");
    if (m === "kid" && f >= BEATS.locks) return inRoom(m, f, "happy", "cheer");
    return inRoom(m, f, "happy");
  }
  // L6: cower through the storm, then walk out onto the bare slab.
  const out = walkOut(m);
  if (f < out[0]) return inRoom(m, f, f < BEATS.gone ? "scared" : "shock", f < DOOR_OPEN[0] ? "cower" : "idle", f < DOOR_OPEN[0] ? FACE_CAMERA : FACE_LEFT + 0.4);
  if (f < out[1]) {
    const p = easeInOut(progress(f, out));
    const x = lerp(ROOM_SPOT[m], OUT_SPOT[m][0], p);
    const zz = x < -PART_X - 0.3 ? lerp(z, OUT_SPOT[m][1], progress(x, [-PART_X - 0.3, OUT_SPOT[m][0]])) : z;
    return { pose: "walk", position: [x, floorAt(f, x, zz), zz], yaw: FACE_LEFT, speed: 1.1, expression: "shock" };
  }
  const [x, zz] = OUT_SPOT[m];
  if (f >= BEATS.congrats - 4) return { pose: m === "mom" ? "point" : "cheer", position: [x, 0, zz], yaw: FACE_CAMERA, expression: "happy" };
  const lookAround = Math.sin((f - out[1]) * 0.07) * 0.6;
  return { pose: "idle", position: [x, 0, zz], yaw: FACE_CAMERA + lookAround, expression: f >= lineStart("l6b") ? "happy" : "shock" };
};

/** The lab engineer: watches the gauge, flinches at the shot, cheers the bounce. */
const engineerActor = (f: number): Actor | null => {
  if (f < LAB_ON[0] - 2 || f >= LAB_ON[1]) return null;
  const pos: [number, number, number] = [LAB_X - 2.5, LAB_Y, 1.7];
  if (f >= HIT3 + 6) return { pose: "cheer", position: pos, yaw: FACE_CAMERA, expression: "happy" };
  if (f >= FIRE - 2) return { pose: "cower", position: pos, yaw: FACE_RIGHT - 0.4, expression: "shock" };
  return { pose: "idle", position: pos, yaw: FACE_RIGHT - 0.5, expression: "focus" };
};

// ---------------------------------------------------------------------------
// Props that only live for one beat.
// ---------------------------------------------------------------------------

/** L2: the flying 2x4 that spears through the partition. */
const SpearBoard: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < BOARD_SHOWN[0] || frame >= BOARD_SHOWN[1]) return null;
  const tip = boardTip(frame);
  const wob = frame > BOARD_HIT && frame < BOARD_HIT + 10 ? 0.06 * Math.sin((frame - BOARD_HIT) * 2.2) * (1 - (frame - BOARD_HIT) / 10) : 0;
  return (
    <group position={[tip - BOARD_LEN / 2, BOARD_Y, BOARD_Z]} rotation={[0, 0, wob]}>
      <Block size={[BOARD_LEN, 0.16, 0.34]} color="#c99a5f" bevel={0.03} />
      <Block size={[0.06, 0.17, 0.35]} position={[BOARD_LEN / 2 - 0.02, 0, 0]} color="#e6c79a" bevel={0.01} castShadow={false} />
    </group>
  );
};

const xMat = matte(LP.red, { emissive: "#ff3b2f", emissiveIntensity: 0.35 });
/** L4b: the big red "Don't" over the open window. */
const NoWindow: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < X_SLAM - 2 || frame >= L4C_START) return null;
  const s = easeOutBack(progress(frame, [X_SLAM - 2, X_SLAM + 5]));
  return (
    <group position={[WIN_X, 1.8, WALL_Z + 0.7]} scale={[s, s, s]}>
      <Block size={[1.9, 0.3, 0.14]} rotation={[0, 0, Math.PI / 4]} material={xMat} castShadow={false} />
      <Block size={[1.9, 0.3, 0.14]} rotation={[0, 0, -Math.PI / 4]} material={xMat} castShadow={false} />
    </group>
  );
};

/** On-screen pointers: the outside wall (L1) and the middle room (L2), as soft pulsing panels. */
const flagMat = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const wallFlag = flagMat("#ff4a3a");
const roomFlag = flagMat("#ffd84d");
const Pointers: React.FC<{ frame: number }> = ({ frame }) => {
  const pulse = (r: readonly [number, number]) => (frame < r[0] || frame >= r[1] ? 0 : 0.42 * (0.6 + 0.4 * Math.sin((frame - r[0]) * 0.35)) * Math.min(1, (frame - r[0]) / 5, (r[1] - frame) / 6));
  wallFlag.opacity = pulse([BEATS.outside - 2, BEATS.tears - 2]);
  roomFlag.opacity = pulse([BEATS.middle - 3, BEATS.windows + 18]);
  return (
    <group>
      {wallFlag.opacity > 0 && (
        <mesh position={[-6.19, WALL_H / 2, -0.15]} rotation={[0, Math.PI / 2, 0]} material={wallFlag}>
          <planeGeometry args={[5.9, WALL_H - 0.1]} />
        </mesh>
      )}
      {roomFlag.opacity > 0 && (
        <mesh position={[0, 0.03, -0.15]} rotation={[-Math.PI / 2, 0, 0]} material={roomFlag}>
          <planeGeometry args={[3.9, 5.8]} />
        </mesh>
      )}
    </group>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <group>
      <StormLight frame={frame} />
      <Clouds frame={frame} />
      <Tornadoes frame={frame} />
      <Yard frame={frame} />
      <House frame={frame} />
      <SafeRoom frame={frame} />
      {/* Colour bleed off the floors and the rug (under the floors, see Bounce) */}
      <Bounce position={[-4.2, -0.15, 0.5]} color="#f0a868" intensity={4} />
      <Bounce position={[0, -0.15, 0.5]} color="#dfe8f2" intensity={3} />
      <Bounce position={[4.2, -0.15, 0]} color="#ff7058" intensity={4} />
      {/* L5: the bedroom face of the door wall sits at a grazing angle to the sun; lift it */}
      {frame >= L5_START && frame < L6_START && <Bounce position={[-3.4, 1.5, 1.6]} color="#ffe2c4" intensity={5} distance={5} />}
      <Wind frame={frame} />
      <WindowGust frame={frame} />
      <DebrisStream frame={frame} />
      <SpearBoard frame={frame} />
      <NoWindow frame={frame} />
      <Pointers frame={frame} />
      <LabSet frame={frame}>
        <LabRig frame={frame} />
      </LabSet>

      {FAMILY.map((m) => (
        <ActorView key={m} classType={m} actor={(f) => familyActor(m, f)} frame={frame} />
      ))}
      <ActorView classType="neighborA" actor={engineerActor} frame={frame} />

      {/* L1 */}
      {dust(TEAR[0] + 2, [-6.4, 0.2, 0.6], "tear", 1.4)}
      {FAMILY.map((m) => dust(LAUNCH(m)[1], [HEDGE_SPOT[m], LAWN_Y + 0.1, LANE[m]], `hedge-${m}`, 0.8))}
      {/* L2 */}
      {dust(BOARD_HIT, [-PART_X, BOARD_Y, BOARD_Z], "board-dust", 0.9)}
      {sparks(BOARD_HIT, [-PART_X, BOARD_Y, BOARD_Z], "board-chips", "#e6c79a", 26)}
      {/* L3 */}
      {LAYER_IN.map((at, k) => dust(at + 8, [0, 0.15, WALL_Z + 0.4], `layer-${k}`, 0.7))}
      {dust(FIRE, [LAB_X + MUZZLE_DX + 0.2, LAB_Y + TEST_Y, 0], "muzzle", 0.7)}
      {sparks(HIT3, [LAB_X + PANEL_FACE, LAB_Y + TEST_Y, 0], "hit3", "#ffd27a", 50)}
      {dust(HIT3 + 20, [LAB_X + PANEL_FACE - 2.3, LAB_Y + 0.1, 0], "board-land", 0.6)}
      {/* L4 */}
      {dust(LIFT[0] + 4, [-PART_X, 0.1, 1.5], "lift-l", 0.8)}
      {dust(LIFT[0] + 4, [PART_X, 0.1, 1.5], "lift-r", 0.8)}
      {dust(DOWN[1], [0, 0.1, 1.8], "slam", 1.4)}
      {Array.from({ length: 8 }, (_, i) => sparks(anchorAt(i), [lerp(-1.5, 1.5, (i % 4) / 3), 0.15, i < 4 ? WALL_Z + 0.5 : 0.5], `anchor-${i}`, "#ffd27a", 14))}
      {/* L5 */}
      {dust(BLOW[0], [-PART_X, 1.1, 0.6], "blow", 1.1)}
      {sparks(BLOW[0], [-PART_X, 1.1, 0.6], "blow-chips", "#e6c79a", 24)}
      {dust(BLOW[1], [-1.0, 0.1, 0.6], "door-land", 0.9)}
      {sparks(STEEL_HANG[1] - 4, [-PART_X - 0.1, 0.1, 0.6], "steel-hang", "#ffd27a", 20)}
      {sparks(PEBBLE_HIT, [VENT_XS[0], VENT_Y, WALL_Z + 0.5], "ping", "#fff2c0", 10)}
    </group>
  );
};
