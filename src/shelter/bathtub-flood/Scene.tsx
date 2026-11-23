import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { ActorView, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, dust, slimeSplash, sparks, type Actor } from "../../kit";
import { Block, Bounce, LP, matte } from "../../lowpoly";
import { FloodLight, FloodSet, InsideBackdrop, Rain } from "./components/Flood";
import { HouseSet } from "./components/House";
import { Hull, PodInside } from "./components/Tub";
import { WaterSlab, waterMat } from "./components/Water";
import {
  BEATS,
  BELTS_IN,
  BOB_X,
  BUMP4,
  CAR_X,
  CREW,
  CRESTS,
  FLOOD_X,
  GASKET_FLASH,
  HALL_START,
  HILL_END,
  HILL_START,
  INT_X,
  INT_Y,
  KEEL_IN,
  L2B_START,
  L2_START,
  L3_START,
  L4_START,
  L5_START,
  L6B_START,
  LAWN_Y,
  LID_H,
  LOG_HIT,
  PINBALL,
  POD_Z,
  POP_UP,
  PORCH_X,
  ROOM_FULL,
  SEATS_IN,
  SEAT_DX,
  SPILL,
  SPLASH3,
  THROW,
  TIP,
  TOP_CROWD,
  TUB_FEET,
  TUB_FLOOR,
  TUB_H,
  TUB_L,
  TUB_W,
  TUB_WALL,
  TUB_X,
  TUB_Z,
  TUB_SPOT,
  VALVE_SHUT,
  VENT_IN,
  X_SLAM,
  Z,
  air,
  arc,
  boltAt,
  climb,
  climbX,
  driveLevel,
  easeInOut,
  easeOutBack,
  hasKeel,
  hasLid,
  hasVents,
  hillY,
  hullPivot,
  hullRoll,
  hullX,
  hullY,
  intRoll,
  intShown,
  lerp,
  paintAt,
  pinball,
  progress,
  step1,
  storm,
  tubLevel,
  walk1,
  waveY,
  type Member,
} from "./timeline";

// ---------------------------------------------------------------------------
// The crew. Each member has four performances, one per place they can be:
// in the house and on the hill (world space), riding in the open tub (hull
// space, so they roll with it), and inside the pod (interior-set space).
// ---------------------------------------------------------------------------

/** Lanes in the house: the kid walks in front of Dad. */
const HALL_LANE: Record<Member, number> = { dad: 0.78, kid: 1.08 };
const TUB_IN_Z = TUB_Z + 0.05;
const IN_TUB_Y = TUB_FEET + TUB_FLOOR;

/** World space: the house (L1, L2a), the water after the tip (L2c), the hill (L6b on). */
const worldActor = (m: Member, f: number): Actor | null => {
  // L1: the hall, the walk to the tub, the hop over the rim, the tub filling.
  if (f < L2_START) {
    const walk = walk1(m);
    const step = step1(m);
    const lane = HALL_LANE[m];
    if (f < walk[0]) {
      const alarmed = f >= BEATS.flood1 - 2;
      return { pose: "idle", position: [HALL_START[m], 0, lane], yaw: alarmed ? FACE_RIGHT - 0.5 : FACE_CAMERA, expression: alarmed ? "shock" : "happy" };
    }
    if (f < walk[1]) {
      const x = lerp(HALL_START[m], TUB_SPOT[m], easeInOut(progress(f, walk)));
      return { pose: m === "kid" ? "run" : "walk", position: [x, 0, lane], yaw: FACE_RIGHT, speed: m === "kid" ? 1.8 : 1.2, expression: "focus" };
    }
    if (f < step[1]) {
      const p = progress(f, step);
      return { pose: "jump", position: [TUB_SPOT[m], arc(p, 1.15) + IN_TUB_Y * p, lerp(lane, TUB_IN_Z, easeInOut(p))], yaw: FACE_LEFT + 0.6, expression: "focus", blend: 3 };
    }
    const at: Actor["position"] = [TUB_SPOT[m], IN_TUB_Y, TUB_IN_Z];
    if (f < BEATS.pours - 4) return { pose: "cower", position: at, yaw: FACE_CAMERA, expression: f >= BEATS.tornado ? "smug" : "neutral" };
    if (f < SPILL[0]) return { pose: "cower", position: at, yaw: FACE_LEFT + 0.7, expression: "shock" };
    if (f < BEATS.it1 - 4) return { pose: "cower", position: at, yaw: FACE_CAMERA, expression: "scared" };
    return { pose: "cower", position: at, yaw: FACE_CAMERA, expression: m === "kid" ? "dazed" : "pain" };
  }
  // L2a: on the porch with the car keys; the car floats off.
  if (f < L2B_START) {
    const x = m === "dad" ? PORCH_X - 0.2 : PORCH_X - 1.0;
    const z = m === "dad" ? 0.7 : 0.2;
    if (m === "kid") return { pose: "idle", position: [x, 0, z], yaw: FACE_CAMERA + 0.5, expression: f >= BEATS.carry ? "shock" : "neutral" };
    if (f < X_SLAM - 1) return { pose: "point", position: [x, 0, z], yaw: FACE_RIGHT - 0.3, expression: "happy" };
    // Double take on "Don't": snap to camera, then watch the car go.
    if (f < X_SLAM + 10) return { pose: "idle", position: [x, 0, z], yaw: FACE_CAMERA, expression: "shock" };
    if (f < BEATS.carry) return { pose: "idle", position: [x, 0, z], yaw: FACE_CAMERA, expression: "neutral" };
    return { pose: "cower", position: [x, 0, z], yaw: FACE_RIGHT - 0.4, expression: "shock" };
  }
  // L2c: thrown out of the tipping tub, then bobbing in the water.
  if (f < L3_START) {
    const thr = THROW(m);
    if (f < thr[0]) return null;
    const startX = hullX(thr[0]) + SEAT_DX[m] * 1.2;
    if (f < thr[1]) {
      const p = progress(f, thr);
      const x = lerp(startX, BOB_X[m], p);
      const y = lerp(0.6, -1.25, p) + arc(p, 1.4);
      return { pose: "launch", position: [x, y, POD_Z + 0.2], yaw: m === "dad" ? FACE_LEFT : FACE_RIGHT, tilt: (m === "dad" ? 1 : -1) * p * 2.4, pivot: 0.9, expression: "yell", blend: 3 };
    }
    const x = BOB_X[m];
    const bob = waveY(x, POD_Z, f);
    return { pose: "cower", position: [x, bob - 0.85, POD_Z + 0.2], yaw: FACE_CAMERA + (m === "dad" ? 0.4 : -0.4), expression: f < thr[1] + 14 ? "shock" : "dazed" };
  }
  // L6b: up the hill road out of the water; cheering at the top.
  if (f < L6B_START) return null;
  const c = climb(m);
  const z = POD_Z + (m === "dad" ? -0.05 : 0.35);
  if (f < c[0]) return { pose: "idle", position: [HILL_START[m], hillY(HILL_START[m]), z], yaw: FACE_RIGHT, expression: "focus", blend: 0 };
  if (f < c[1]) {
    const x = climbX(m, f);
    return { pose: "walk", position: [x, hillY(x), z], yaw: FACE_RIGHT, speed: 0.8, expression: f >= BEATS.evacuate ? "happy" : "focus" };
  }
  if (f >= BEATS.congrats - 4) return { pose: "cheer", position: [HILL_END[m], hillY(HILL_END[m]), z], yaw: FACE_CAMERA, expression: "happy" };
  return { pose: "idle", position: [HILL_END[m], hillY(HILL_END[m]), z], yaw: FACE_CAMERA - 0.3, expression: "happy" };
};

/** Hull space: riding the freed tub (L2b) until the wave throws them out. */
const rideActor = (m: Member, f: number): Actor | null => {
  if (f < POP_UP[0] || f >= THROW(m)[0] || f >= L3_START) return null;
  const at: Actor["position"] = [SEAT_DX[m], TUB_FLOOR, -0.05];
  if (f < BEATS.ride - 2) return { pose: "cower", position: at, yaw: FACE_CAMERA, expression: f >= POP_UP[1] ? "happy" : "shock" };
  if (f < BEATS.wave2 - 6) {
    if (m === "dad") return { pose: "point", position: at, yaw: FACE_RIGHT - 0.5, expression: "smug" };
    return { pose: "cheer", position: at, yaw: FACE_CAMERA, expression: "happy" };
  }
  return { pose: "cower", position: at, yaw: FACE_LEFT + 0.8, expression: "scared" };
};

/** Interior-set space: upside down (L3b), the pinball (L4b), seats (L4c), stale air (L5a). */
const insideActor = (m: Member, f: number): Actor | null => {
  if (!intShown(f)) return null;
  const seatX = SEAT_DX[m];
  const floor: Actor["position"] = [seatX, TUB_FLOOR, -0.05];
  if (f < L4_START) return { pose: "cower", position: floor, yaw: FACE_CAMERA, expression: "shock" };
  if (f < L5_START) {
    if (f < PINBALL[0]) return { pose: "cower", position: floor, yaw: FACE_CAMERA, expression: "scared" };
    if (f < PINBALL[1]) {
      const b = pinball(m, f);
      return { pose: "launch", position: [b.x, TUB_FLOOR + b.y, -0.05], yaw: FACE_CAMERA, tilt: b.tilt, pivot: 0.9, expression: "yell", blend: 2 };
    }
    if (f < SEATS_IN[1]) return { pose: "cower", position: floor, yaw: FACE_CAMERA, expression: "dazed", blend: 4 };
    const seated: Actor["position"] = [seatX, TUB_FLOOR + 0.02, -0.1];
    if (f < BELTS_IN[1]) return { pose: "sit", position: seated, yaw: FACE_CAMERA, expression: "neutral" };
    if (f < BUMP4) return { pose: "sit", position: seated, yaw: FACE_CAMERA, expression: "happy" };
    return { pose: "sit", position: seated, yaw: FACE_CAMERA, expression: "smug" };
  }
  // L5a: the air goes stale.
  const a = air(f);
  return { pose: "sit", position: [seatX, TUB_FLOOR + 0.02, -0.1], yaw: FACE_CAMERA, expression: a > 0.8 ? "neutral" : a > 0.45 ? "dazed" : "pain" };
};

/** Neighbours waiting on the hilltop for the finale. */
const crowdActor = (i: number, f: number): Actor | null => {
  if (f < L6B_START) return null;
  const x = TOP_CROWD[i];
  const z = POD_Z - 0.6 - i * 0.4;
  if (f >= BEATS.evacuate + 6) return { pose: "cheer", position: [x, hillY(x), z], yaw: FACE_LEFT + 0.6, expression: "happy" };
  return { pose: "idle", position: [x, hillY(x), z], yaw: FACE_LEFT + 0.4, expression: "neutral" };
};

// ---------------------------------------------------------------------------
// Props that only live for one beat.
// ---------------------------------------------------------------------------

const xMat = matte(LP.red, { emissive: "#ff3b2f", emissiveIntensity: 0.35 });
/** L2a: the big red cross over the car on "Don't". */
const NoDrive: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < X_SLAM - 2 || frame >= BEATS.carry) return null;
  const s = easeOutBack(progress(frame, [X_SLAM - 2, X_SLAM + 5]));
  return (
    <group position={[CAR_X, LAWN_Y + 1.0, 0.9]} scale={[s, s, s]}>
      <Block size={[2.2, 0.32, 0.14]} rotation={[0, 0, Math.PI / 4]} material={xMat} castShadow={false} />
      <Block size={[2.2, 0.32, 0.14]} rotation={[0, 0, -Math.PI / 4]} material={xMat} castShadow={false} />
    </group>
  );
};

/** L5a: the stale-air haze in front of the inside set. */
const hazeMat = new THREE.MeshBasicMaterial({ color: "#a9b79a", transparent: true, opacity: 0, depthWrite: false });
const Haze: React.FC<{ frame: number }> = ({ frame }) => {
  hazeMat.opacity = frame >= L5_START && intShown(frame) ? (1 - air(frame)) * 0.45 : 0;
  if (hazeMat.opacity <= 0) return null;
  return (
    <mesh position={[INT_X, INT_Y + 1.0, TUB_W / 2 + 0.2]} material={hazeMat}>
      <planeGeometry args={[14, 14]} />
    </mesh>
  );
};

/** The hull on the open flood, rolling about its pivot; the riders ride along. */
const FloodHull: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < L2B_START) return null;
  const pivot = hullPivot(frame);
  const valveUp = progress(frame, VALVE_SHUT) < 1 && frame >= VALVE_SHUT[0] ? Math.sin(Math.PI * progress(frame, VALVE_SHUT)) : 0;
  return (
    <group position={[hullX(frame), hullY(frame) + pivot, POD_Z]} rotation={[0, 0, hullRoll(frame)]}>
      <group position={[0, -pivot, 0]}>
        <Hull
          frame={frame}
          lid={hasLid(frame)}
          gasket={frame >= GASKET_FLASH[0] && frame < GASKET_FLASH[1] ? Math.sin(Math.PI * progress(frame, GASKET_FLASH)) : 0}
          keel={easeOutBack(hasKeel(frame))}
          bolts={frame < L4_START ? 0 : [0, 1, 2].filter((k) => frame >= boltAt(k)).length}
          vents={hasVents(frame)}
          valve={valveUp}
          paint={paintAt(frame)}
          beacon={frame >= BEATS.yellow}
          pipe={frame < L3_START}
        />
        {CREW.map((m) => (
          <ActorView key={m} classType={m} actor={(f) => rideActor(m, f)} frame={frame} />
        ))}
      </group>
    </group>
  );
};

/** The tub in the house (L1, L2a), with the water that pours into it. */
const HouseTub: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame >= L2B_START) return null;
  const level = tubLevel(frame);
  const inner = TUB_WALL * 1.6;
  return (
    <group>
      <group position={[TUB_X, TUB_FEET, TUB_Z]}>
        <Hull frame={frame} feet mask={level < TUB_FEET + TUB_H - 0.05} />
      </group>
      {level > 0 && (
        <WaterSlab
          frame={frame}
          x={[TUB_X - TUB_L / 2 + inner, TUB_X + TUB_L / 2 - inner]}
          z={[TUB_Z - TUB_W / 2 + TUB_WALL, TUB_Z + TUB_W / 2 - TUB_WALL]}
          level={Math.min(level, ROOM_FULL)}
          bottom={TUB_FEET + TUB_FLOOR}
          front={false}
          renderOrder={1}
          wave={(x, z) => 0.025 * Math.sin(x * 3 + z * 2 + frame * 0.3)}
          seg={[8, 4]}
        />
      )}
    </group>
  );
};

/** The inside of the pod, rolled with the hull (upside down in L3b). */
const Inside: React.FC<{ frame: number }> = ({ frame }) => {
  if (!intShown(frame)) return null;
  const mid = (TUB_H + LID_H) / 2;
  return (
    <group position={[INT_X, INT_Y + mid, 0]} rotation={[0, 0, intRoll(frame)]}>
      <group position={[0, -mid, 0]}>
        <PodInside
          frame={frame}
          seats={frame >= L4_START ? easeOutBack(progress(frame, SEATS_IN)) : 0}
          belts={frame >= L4_START ? easeOutBack(progress(frame, BELTS_IN)) : 0}
          air={air(frame)}
          paint={0}
        />
        {CREW.map((m) => (
          <ActorView key={m} classType={m} actor={(f) => insideActor(m, f)} frame={frame} />
        ))}
      </group>
    </group>
  );
};

/** Which set the camera is on, for the sun target and the rain. */
const setAt = (f: number): [number, number, number] => {
  if (intShown(f)) return [INT_X, 1, 0];
  if (f < L2B_START) return f < L2_START ? [-1, 1, 0] : [CAR_X - 1, 0.5, 0];
  return [FLOOD_X + (f >= L6B_START ? 5 : 0), 1, 0];
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const center = setAt(frame);
  // X-ray the water while the keel goes on, so the weight under the hull reads.
  waterMat.opacity = frame >= L4_START && frame < BEATS.keel ? 0.5 : 0.86;
  return (
    <group>
      <FloodLight frame={frame} target={center} />
      {!intShown(frame) && <Rain frame={frame} center={[center[0], 0, Z]} amount={storm(frame)} />}
      <HouseSet frame={frame} driveLevel={driveLevel(frame)} />
      <HouseTub frame={frame} />
      <FloodSet frame={frame} />
      <FloodHull frame={frame} />
      <InsideBackdrop frame={frame} />
      <Inside frame={frame} />
      <Haze frame={frame} />
      <NoDrive frame={frame} />
      <Bounce position={[0, -0.15, 0.3]} color="#dfe8f2" intensity={3} />

      {CREW.map((m) => (
        <ActorView key={m} classType={m} actor={(f) => worldActor(m, f)} frame={frame} />
      ))}
      {[0, 1].map((i) => (
        <ActorView key={`n${i}`} classType={i ? "neighborB" : "neighborA"} actor={(f) => crowdActor(i, f)} frame={frame} />
      ))}

      {/* L1: the hop into the tub, the water spilling over the rim */}
      {CREW.map((m) => dust(step1(m)[1], [TUB_SPOT[m], IN_TUB_Y, TUB_IN_Z], `hop-${m}`, 0.5))}
      {slimeSplash(SPILL[0], [TUB_X, TUB_FEET + TUB_H, TUB_Z + 0.6], "spill", 1.2, "#cfe0e2")}
      {/* L2: the tub pops up; the tip throws them in */}
      {slimeSplash(POP_UP[1] - 2, [FLOOD_X, 0.1, POD_Z], "popup", 1.8, "#d8e6ea")}
      {slimeSplash(TIP[1] - 2, [FLOOD_X, 0.1, POD_Z], "tip", 2, "#d8e6ea")}
      {CREW.map((m) => slimeSplash(THROW(m)[1], [BOB_X[m], 0.1, POD_Z + 0.2], `in-${m}`, 1.4, "#d8e6ea"))}
      {/* L3: the lid lands, the wave washes over, the roll */}
      {sparks(BEATS.lid + 2, [FLOOD_X, TUB_H, POD_Z + 0.6], "lid", "#ffffff", 16)}
      {slimeSplash(SPLASH3, [FLOOD_X, 1.6, POD_Z], "wash3", 2.2, "#d8e6ea")}
      {slimeSplash(CRESTS[1], [FLOOD_X, 0.3, POD_Z], "roll3", 1.8, "#d8e6ea")}
      {/* L4: the keel bolts, the rolls, the log */}
      {[0, 1, 2].map((k) => sparks(boltAt(k), [FLOOD_X - 0.6 + k * 0.6, -0.4, POD_Z + 0.4], `bolt-${k}`, "#ffd27a", 18))}
      {slimeSplash(KEEL_IN[1], [FLOOD_X, -0.1, POD_Z], "keel", 1.2, "#d8e6ea")}
      {slimeSplash(CRESTS[2], [FLOOD_X, 0.4, POD_Z], "right1", 2, "#d8e6ea")}
      {slimeSplash(CRESTS[3], [FLOOD_X, 0.4, POD_Z], "right2", 1.8, "#d8e6ea")}
      {sparks(LOG_HIT, [hullX(LOG_HIT) - TUB_L / 2, 0.4, POD_Z + 0.3], "log", "#e6c79a", 26)}
      {slimeSplash(LOG_HIT, [hullX(LOG_HIT) - TUB_L / 2, 0.1, POD_Z], "log-splash", 1.6, "#d8e6ea")}
      {dust(BUMP4, [INT_X, INT_Y + 0.2, 0.3], "bump4", 0.5)}
      {/* L5: the vents pop up, the wave over the valves, the air puffs */}
      {dust(VENT_IN[1], [FLOOD_X, TUB_H + LID_H, POD_Z], "vents", 0.5)}
      {slimeSplash(VALVE_SHUT[0] + 2, [FLOOD_X - 0.75, TUB_H + LID_H + 0.3, POD_Z], "wash5", 1.6, "#d8e6ea")}
      {[-0.75, 0.75].map((dx, i) => dust(VALVE_SHUT[1] + 2, [FLOOD_X + dx, TUB_H + LID_H + 0.6, POD_Z], `air-${i}`, 0.35))}
      {dust(BEATS.airIn, [FLOOD_X - 0.75, TUB_H + LID_H + 0.6, POD_Z], "air-a", 0.35)}
      {sparks(BEATS.yellow, [FLOOD_X, TUB_H + LID_H, POD_Z + 0.4], "paint", "#ffd84d", 30)}
    </group>
  );
};
