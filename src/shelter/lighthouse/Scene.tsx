import type React from "react";
import { useCurrentFrame } from "remotion";
import { Burst } from "../../artifacts/dungeon/Fx";
import { ActorView, FACE_CAMERA, FACE_LEFT, arc, dust, lying, magic, sparks, type Actor } from "../../kit";
import type { AdventurerPose, Expression } from "../../artifacts/characters/hero";
import { Coast } from "./components/Coast";
import { Fog } from "./components/Fog";
import { Rays } from "./components/Rays";
import { Ship, shipPoint } from "./components/Ship";
import { Sky } from "./components/Sky";
import { Candle, OtherLighthouse, Tower } from "./components/Tower";
import {
  BEATS,
  BLOW_OUT,
  CANDLE_POS,
  CAPTAIN1_FLY,
  DECK_Y,
  IGNITE,
  KEEPER_X,
  KEEPER_Z,
  LAND_Y,
  LENS_IN,
  OTHERS,
  OTHERS_LIT,
  OTHERS_RISE,
  RISE,
  ROCK_TOP,
  ROCK_X,
  ROCK_Z,
  ROOF_DROP,
  SHIP3_ON,
  SHIP_DECK,
  TOWER_X,
  TOWER_Z,
  WIND,
  easeOutBack,
  fogAmount,
  lerp,
  lineStart,
  progress,
  ship1,
  ship2,
  ship3,
  topY,
} from "./timeline";

// ---------------------------------------------------------------------------
// The keeper: the "you" of the narration. On the beach with the candle, then
// riding the tower up and living on its gallery for the rest of the film.
// ---------------------------------------------------------------------------
const KEEPER_YAW = FACE_CAMERA + 0.45;

const keeperBeat = (frame: number): { pose: AdventurerPose; expression: Expression } => {
  if (frame >= BEATS.congrats) return { pose: "cheer", expression: "happy" };
  if (frame >= BEATS.blasts) return { pose: frame < BEATS.blasts + 40 ? "cheer" : "idle", expression: "smug" };
  if (frame >= BEATS.horn - 6) return { pose: "point", expression: "focus" };
  if (frame >= BEATS.fog) return { pose: "idle", expression: frame >= BEATS.noLight ? "shock" : "dazed" };
  if (frame >= BEATS.turn) return { pose: frame < BEATS.turn + 60 ? "point" : "idle", expression: "smug" };
  if (frame >= BEATS.beam) return { pose: frame < BEATS.beam + 36 ? "cheer" : "idle", expression: "happy" };
  if (frame >= BEATS.mirrors) return { pose: "idle", expression: "happy" };
  if (frame >= BEATS.shines) return { pose: "idle", expression: frame >= BEATS.sky ? "shock" : "focus" };
  if (frame >= BEATS.lanternRoom) return { pose: "point", expression: "happy" };
  if (frame >= BEATS.seal) return { pose: "idle", expression: "happy" };
  if (frame >= BLOW_OUT[1]) return { pose: "idle", expression: "shock" };
  if (frame >= WIND[0]) return { pose: "cower", expression: "scared" };
  if (frame >= RISE[1]) return { pose: frame < BEATS.miles + 20 ? "cheer" : "idle", expression: "happy" };
  if (frame >= RISE[0]) return { pose: "cower", expression: "shock" };
  if (frame >= BEATS.crash) return { pose: "idle", expression: "shock" };
  if (frame >= BEATS.fire) return { pose: frame < BEATS.fire + 40 ? "cheer" : "idle", expression: "happy" };
  if (frame >= BEATS.light) return { pose: "cast", expression: "focus" };
  if (frame >= BEATS.wontDo) return { pose: "idle", expression: "dazed" };
  if (frame >= BEATS.candle) return { pose: "point", expression: "happy" };
  return { pose: "idle", expression: "happy" };
};

const keeperActor = (frame: number): Actor => {
  const { pose, expression } = keeperBeat(frame);
  const y = frame >= RISE[0] ? topY(frame) : LAND_Y;
  return { pose, expression, position: [KEEPER_X, y, KEEPER_Z], yaw: KEEPER_YAW };
};

// ---------------------------------------------------------------------------
// Captains: one per ship. Captain 1 is thrown onto the rocks and stays there.
// ---------------------------------------------------------------------------
const CAPTAIN_DECK: [number, number, number] = [0.45, SHIP_DECK, 0.2];
const CAPTAIN1_LAND: [number, number, number] = [ROCK_X - 0.1, ROCK_TOP, ROCK_Z + 0.55];
const CAPTAIN1_UP = lineStart("l2b");

const captain1Actor = (frame: number): Actor => {
  const s = ship1(frame);
  if (frame < CAPTAIN1_FLY[0]) {
    const scared = frame >= BEATS.crash - 14;
    return { pose: scared ? "cower" : "idle", expression: scared ? "shock" : "happy", position: shipPoint(s, CAPTAIN_DECK), yaw: FACE_CAMERA + 0.6 };
  }
  if (frame < CAPTAIN1_FLY[1]) {
    const t = progress(frame, CAPTAIN1_FLY);
    const from = shipPoint(ship1(CAPTAIN1_FLY[0]), CAPTAIN_DECK);
    return {
      pose: "launch",
      expression: "yell",
      position: [lerp(from[0], CAPTAIN1_LAND[0], t), lerp(from[1], CAPTAIN1_LAND[1], t) + arc(t, 1.4), lerp(from[2], CAPTAIN1_LAND[2], t)],
      yaw: FACE_LEFT,
      tilt: 1.6 * t,
      pivot: 0.9,
    };
  }
  if (frame < CAPTAIN1_UP) {
    return lying({ classType: "neighborA", x: CAPTAIN1_LAND[0], z: CAPTAIN1_LAND[2], frame, since: CAPTAIN1_FLY[1], floorY: CAPTAIN1_LAND[1], facing: "left", expression: "dazed" });
  }
  // Back on his feet on the rock, dripping and grumpy; cheers at the end.
  const end = frame >= BEATS.congrats;
  return { pose: end ? "cheer" : "idle", expression: end ? "happy" : "dazed", position: CAPTAIN1_LAND, yaw: FACE_CAMERA - 0.3 };
};

const SHIP2_ON = lineStart("l5a") - 40;
const captain2Actor = (frame: number): Actor | null => {
  if (frame < SHIP2_ON) return null;
  const s = ship2(frame);
  const p = shipPoint(s, CAPTAIN_DECK);
  if (frame >= BEATS.exactly) return { pose: frame < BEATS.exactly + 36 ? "cheer" : "idle", expression: "happy", position: p, yaw: FACE_CAMERA };
  if (frame >= BEATS.charts - 4) return { pose: "idle", expression: "focus", position: p, yaw: FACE_CAMERA - 0.3 };
  if (frame >= BEATS.two - 6) return { pose: "point", expression: "shock", position: p, yaw: FACE_LEFT + 0.6 };
  // Looking from one lighthouse to the other.
  return { pose: "idle", expression: frame >= BEATS.every ? "dazed" : "neutral", position: p, yaw: FACE_CAMERA + 0.8 * Math.sin((frame - SHIP2_ON) * 0.06) };
};

const captain3Actor = (frame: number): Actor | null => {
  if (frame < SHIP3_ON) return null;
  const s = ship3(frame);
  const p = shipPoint(s, CAPTAIN_DECK);
  if (frame >= BEATS.blasts) return { pose: frame < BEATS.blasts + 20 ? "cower" : "idle", expression: frame < BEATS.foghorn ? "shock" : "happy", position: p, yaw: FACE_CAMERA + 0.3 };
  return { pose: "idle", expression: "scared", position: p, yaw: FACE_CAMERA + 0.5 * Math.sin(frame * 0.05) };
};

// ---------------------------------------------------------------------------
// Wind streaks for "the wind blows the flame right out".
// ---------------------------------------------------------------------------
const Wind: React.FC<{ frame: number }> = ({ frame }) => {
  const t = progress(frame, WIND);
  if (t <= 0 || t >= 1) return null;
  const fade = Math.sin(Math.PI * t);
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const x = TOWER_X + 6 - ((frame * 0.45 + i * 1.7) % 12);
        return (
          <mesh key={i} position={[x, DECK_Y + 0.3 + (i % 4) * 0.45, TOWER_Z + 0.9 + (i % 3) * 0.3]} renderOrder={7}>
            <boxGeometry args={[1.4 + (i % 3) * 0.5, 0.035, 0.035]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.75 * fade} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const fog = fogAmount(frame);
  const othersLit = progress(frame, [OTHERS_LIT, OTHERS_LIT + 10]);
  const s1 = ship1(frame);
  const bow1 = shipPoint(s1, [-1.4, 0.2, 0]);
  return (
    <>
      <Sky frame={frame} />
      <Coast frame={frame} />
      <Tower frame={frame} />
      <Rays frame={frame} />
      <Wind frame={frame} />
      {frame < RISE[0] ? <Candle frame={frame} position={CANDLE_POS} /> : null}
      {OTHERS.map((o, i) => (
        <OtherLighthouse key={i} x={o.x} z={o.z} s={o.s} rise={easeOutBack(progress(frame, [OTHERS_RISE[0] + i * 10, OTHERS_RISE[1] + i * 10]), 1.3)} lit={othersLit} beamAngle={i ? 0.5 : 0.9} fog={fog} />
      ))}

      <Ship state={s1} hull="#7a4a2a" />
      {frame >= SHIP2_ON ? <Ship state={ship2(frame)} hull="#2f5d8a" sail="#f6d9a8" /> : null}
      {frame >= SHIP3_ON ? <Ship state={ship3(frame)} hull="#3f6b3a" /> : null}

      <ActorView classType="dad" actor={keeperActor} frame={frame} />
      <ActorView classType="neighborA" actor={captain1Actor} frame={frame} />
      <ActorView classType="neighborB" actor={captain2Actor} frame={frame} />
      <ActorView classType="neighborC" actor={captain3Actor} frame={frame} />

      <Fog frame={frame} />

      {/* L1: the fire roars up; the ship splinters on the rocks */}
      {dust(IGNITE[0], [TOWER_X, LAND_Y + 0.1, TOWER_Z + 0.3], "ignite", 0.8)}
      <Burst at={BEATS.crash} position={bow1} count={34} size={0.16} duration={30} speed={0.12} direction={[-0.04, 0.12, 0]} gravity={-0.012} spread={[0.4, 0.2, 0.6]} color="#e8f6ff" opacity={0.9} seed="crash-spray" />
      <Burst at={BEATS.crash} position={bow1} count={18} size={0.12} duration={34} speed={0.1} direction={[0.02, 0.1, 0]} gravity={-0.01} spread={[0.3, 0.2, 0.4]} color="#7a4a2a" opacity={1} seed="crash-wood" />
      {dust(CAPTAIN1_FLY[1], CAPTAIN1_LAND, "captain-land", 0.6)}

      {/* L2: sand bursts as the tower pushes up; smoke when the flame dies */}
      {dust(RISE[0], [TOWER_X, LAND_Y + 0.1, TOWER_Z + 0.4], "rise-sand", 2.2)}
      {dust(RISE[1], [TOWER_X, LAND_Y + 0.1, TOWER_Z + 0.8], "rise-settle", 1.2)}
      <Burst at={BLOW_OUT[1]} position={[TOWER_X, DECK_Y + 0.5, TOWER_Z]} count={26} size={0.32} duration={44} speed={0.05} direction={[-0.07, 0.04, 0]} gravity={0.002} spread={[0.3, 0.3, 0.3]} color="#6f7480" opacity={0.75} seed="smoke" />

      {/* L3-L4: roof lands, lens drops in */}
      {sparks(ROOF_DROP[1], [TOWER_X, DECK_Y + 1.5, TOWER_Z + 0.6], "roof-land")}
      {magic(LENS_IN[1], [TOWER_X, DECK_Y + 0.75, TOWER_Z + 0.5], "lens-in", "#c8f0ff", 30)}
      {magic(BEATS.rings, [TOWER_X, DECK_Y + 0.75, TOWER_Z + 0.5], "lens-rings", "#ffffff", 22)}

      {/* L5: the copycat towers push up on their headlands */}
      {OTHERS.map((o, i) => dust(OTHERS_RISE[0] + i * 10 + 2, [o.x, 1.6 * o.s, o.z + 1.5], `other-${i}`, 2.5))}
    </>
  );
};
