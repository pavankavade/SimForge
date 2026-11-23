import type React from "react";
import { useCurrentFrame } from "remotion";
import { PaladinActor } from "../../artifacts/characters/paladin/PaladinActor";
import { Burst } from "../../artifacts/dungeon";
import { CHEST, KNOCK_X, KNOCK_Y, OWNER_AT, RESETS, SOLID_X, SCRIPTS, floorOf, h2HasCandlestick, handsOf } from "./actors";
import { CAST, type CastId } from "./cast";
import { ROPE_IN_A, ROPE_IN_B, ROPE_OUT_A, ROPE_OUT_B } from "./ropes";
import { House, useHouseMaterials, type HouseState } from "./House";
import { Bricks, Candle, Candlestick, Cat, Cobweb, Cushion, KnockRings, PANEL_Z, Rod, Sky, SoupDrops, Steam, flicker } from "./Props";
import {
  BEATS,
  BOLT,
  BRICKS,
  BURST,
  CANDLE_LIT,
  CLOSE1,
  CLOSE2,
  CUSHION_IN,
  DOOR,
  DROP1,
  DROP2,
  EAVES,
  FLOOR2,
  FORCE,
  H1_ON_STEP,
  HATCH_X0,
  HATCH_X1,
  HATCH_Y,
  HEARTH,
  HIDE,
  HINGE_ON,
  KNOCKS_HOLLOW,
  KNOCKS_SOLID,
  LIFT1,
  LIFT2,
  OUT_DOOR,
  PANEL_OFF,
  POUNDS,
  POUR,
  REAL,
  REED_IN,
  ROPE_IN,
  ROPE_OUT,
  SECRET_OPEN,
  SECRET_SHUT,
  SHAFT,
  SHAFT_X,
  SHAFT_Z,
  SHOTS,
  STAIR,
  TABLE,
  THUMP_HIT,
  WEEK,
  COLUMN,
  daylight,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  lerp,
  progress,
  type V3,
} from "./timeline";

/**
 * Priest Hole scene: the cut-open house, everything that moves in it, the lights and the cast.
 */

const B = BEATS;
const S = SHOTS;

const between = (f: number, a: number, b: number) => f >= a && f < b;
const ramp = (f: number, a: number, b: number) => progress(f, [a, b]);

// ---------------------------------------------------------------------------
// The house's moving parts on a frame
// ---------------------------------------------------------------------------
const doorAngle = (f: number): number => {
  // Pounded: the door jumps in its frame with each blow.
  if (f < BURST) {
    let jolt = 0;
    for (const p of POUNDS) if (f >= p && f < p + 5) jolt = Math.max(jolt, 0.05 * (1 - (f - p) / 5));
    return jolt;
  }
  // Burst in, banging back off the wall.
  if (f < S.hinge) {
    const t = ramp(f, BURST, BURST + 7);
    const bounce = f > BURST + 7 ? 0.12 * Math.exp(-(f - BURST - 7) / 6) * Math.cos((f - BURST - 7) * 0.7) : 0;
    return 1.75 * easeOutCubic(t) - bounce;
  }
  // Opened again for the hunter leaving with the candlestick.
  if (f >= OUT_DOOR - 30 && f < S.crooked) return 1.5 * easeInOut(ramp(f, OUT_DOOR - 30, OUT_DOOR - 18));
  return 0;
};

const hatchState = (f: number): HouseState["hatch"] => {
  let angle = 0;
  let rattle = 0;
  let crooked = 0;
  if (f < S.hinge) {
    // The loose board, lifted by hand and dropped back; then rattling under the boot.
    angle = 1.25 * easeInOut(ramp(f, LIFT1[0], LIFT1[1])) * (1 - easeInOut(ramp(f, CLOSE1[0], CLOSE1[1])));
    if (f >= H1_ON_STEP && f < H1_ON_STEP + 22) rattle = Math.sin((f - H1_ON_STEP) * 2.4) * (1 - (f - H1_ON_STEP) / 22);
  } else if (f < S.search) {
    angle = 1.6 * easeInOut(ramp(f, LIFT2[0], LIFT2[1])) * (1 - easeInOut(ramp(f, CLOSE2[0], CLOSE2[1])));
    // While the hinges go on, the step lifts off a little and settles back.
    angle += 0.25 * Math.sin(Math.PI * ramp(f, HINGE_ON[0], HINGE_ON[1]));
    crooked = f >= CLOSE2[1] ? 1 : 0;
  } else if (f < S.crooked) {
    // Forced: it flies up on its hinges and stays up.
    angle = f < FORCE ? 0 : 1.85 * easeOutBack(ramp(f, FORCE, FORCE + 6));
    crooked = 1;
  } else {
    crooked = 1;
  }
  return { angle, rattle, crooked };
};

/** Which panel each pry takes off (PANEL_OFF is in pry order: h1, h2, h1, h2). */
const PANEL_ORDER = [1, 2, 0, 3];
const panelsOff = (f: number): number[] => {
  const out = [0, 0, 0, 0];
  if (f < S.tear) return out;
  PANEL_ORDER.forEach((panel, i) => {
    out[panel] = easeInOut(ramp(f, PANEL_OFF[i], PANEL_OFF[i] + 12));
  });
  return out;
};

const houseState = (f: number): HouseState => {
  const shut = f >= SECRET_SHUT[0] ? 1 - easeInOut(ramp(f, SECRET_SHUT[0], SECRET_SHUT[1])) : 1;
  return {
    door: doorAngle(f),
    secretDoor: between(f, S.peek, S.twoRooms + 10) ? 1.35 * easeInOut(ramp(f, SECRET_OPEN[0], SECRET_OPEN[1])) * shut : 0,
    hatch: hatchState(f),
    panels: panelsOff(f),
    realFront: f < S.twoRooms ? 1 : 0,
    daylight: daylight(f),
    hingeGlow: Math.sin(Math.PI * ramp(f, HINGE_ON[0], HINGE_ON[1] + 10)) + (between(f, LIFT2[0], CLOSE2[1]) ? 0.5 : 0),
    hinges: f >= HINGE_ON[0] + 6,
    doorFaced: f >= S.decoy,
    bolt: f < S.hinge || f >= FORCE && f < S.crooked ? 0 : f < S.search ? easeInOut(ramp(f, BOLT[0], BOLT[1])) : 1,
  };
};

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------
const Person: React.FC<{ id: CastId }> = ({ id }) => {
  const c = CAST[id];
  const s = SCRIPTS[id];
  return (
    <PaladinActor
      character={c.spec}
      outfit={c.outfit}
      equipment={s.equipment ? (f: number) => ({ ...c.equipment, ...(s.equipment?.(f) ?? {}) }) : c.equipment}
      workwear={c.workwear}
      scale={c.scale}
      resets={RESETS}
      position={s.pos}
      yaw={s.yaw}
      act={s.act}
      swings={s.swings}
      pitch={s.pitch}
      visible={s.visible}
      floorY={floorOf(id)}
      envIntensity={0.5}
    />
  );
};

/** The reed: from the owner's hands, through the floor, down to the priest's mouth. */
const REED_TOP: V3 = [OWNER_AT[0] - 0.4, FLOOR2 + 0.62, OWNER_AT[2] + 0.05];
const REED_TIP: V3 = [SHAFT_X - 0.03, 1.36, SHAFT_Z + 0.22];
/** Cat: on the stairs at the start, on her step for the end (cushion under her later). */
const CAT_EARLY: V3 = [STAIR.x0 + 2.5 * STAIR.going, 3 * STAIR.rise, -2.42];
export const CAT_STEP: V3 = [STAIR.x0 + 12.5 * STAIR.going, 13 * STAIR.rise, -2.15];

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const mats = useHouseMaterials();
  const s = houseState(frame);
  const f = frame;
  const wide = between(f, S.measure, S.shaft) || f >= S.end;
  const cushion = f >= CUSHION_IN ? easeOutBack(ramp(f, CUSHION_IN, CUSHION_IN + 8)) : 0;
  const catOnCushion = f >= CUSHION_IN + 4;
  const reedT = between(f, S.reed, S.tear) ? easeInOut(ramp(f, REED_IN[0], REED_IN[1])) : 0;
  const reedTip: V3 = [lerp(REED_TOP[0], REED_TIP[0], reedT), lerp(REED_TOP[1], REED_TIP[1], reedT), lerp(REED_TOP[2], REED_TIP[2], reedT)];
  const week = ramp(f, WEEK[0], WEEK[1]);
  const nightLight = 1 - s.daylight;
  return (
    <>
      <Sky />
      {/* Daylight through the cut, a cool fill, and the sky's bounce. */}
      <hemisphereLight args={["#d6e0ee", "#6b4a30", wide ? 0.9 : 0.55]} />
      <directionalLight
        position={[-6, 10, 14]}
        intensity={wide ? 2.6 : 1.9 - 0.7 * nightLight}
        color="#ffe6c4"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={45}
      />
      <directionalLight position={[9, 5, 8]} intensity={0.45} color="#b9cdf0" />
      {/* Warm pools: the hall, the hide, the kitchen and the shaft. */}
      <pointLight position={[-1.6, 2.3, 0.4]} intensity={2.2} distance={7} decay={2} color="#ffbf80" />
      <pointLight position={[0.6, 1.0, -0.9]} intensity={0.8} distance={3} decay={2} color="#ffd2a0" />
      <pointLight position={[SHAFT_X, 1.9, SHAFT.z1 + 0.6]} intensity={1.1} distance={3.5} decay={2} color="#ffd8b0" />
      <pointLight position={[(HEARTH.x0 + HEARTH.x1) / 2, 0.5, -1.6]} intensity={1.6 * flicker(f, "hearth")} distance={4} decay={2} color="#ff9a4a" />
      <pointLight position={[3.4, FLOOR2 + 1.6, -0.3]} intensity={1.0} distance={4} decay={2} color="#ffd0a0" />
      <pointLight position={[(REAL.x0 + REAL.x1) / 2, 1.7, -1.75]} intensity={0.7} distance={2.6} decay={2} color="#ffcf9a" />

      <House s={s} mats={mats} />

      {/* The brick lining (stays for the rest of the film). */}
      <Bricks frame={f} span={BRICKS} door={f >= S.decoy} />

      {/* Hall: the chest's candlestick, or carried off by the hunter. */}
      {h2HasCandlestick(f) && f < OUT_DOOR ? (
        <Candlestick position={handsOf("h2", f, 0.34, 0.95)} frame={f} />
      ) : f < OUT_DOOR ? (
        <Candlestick position={[CHEST[0], 0.55, CHEST[2]]} frame={f} />
      ) : null}

      {/* Kitchen candles, burning down over the week. */}
      {[
        [TABLE.x - 0.25, TABLE.z - 0.25],
        [TABLE.x + 0.1, TABLE.z - 0.3],
      ].map(([x, z], i) => (
        <Candle key={i} position={[x, TABLE.h, z]} height={lerp(0.2, 0.04, week)} frame={f} seed={`k${i}`} light={1.6 + nightLight} />
      ))}

      {/* The garderobe shaft: the reed, the soup going down it, the bowl, steam at the mouth. */}
      {reedT > 0 ? <Rod a={REED_TOP} b={reedTip} r={0.012} color="#b5a46a" roughness={0.6} /> : null}
      {between(f, S.reed, S.tear) ? (
        <group position={[REED_TOP[0] + 0.12, REED_TOP[1] + 0.02, REED_TOP[2]]} rotation={[0, 0, 0.9 * easeInOut(ramp(f, POUR[0], POUR[0] + 10)) * (1 - ramp(f, POUR[1], POUR[1] + 10))]}>
          <mesh>
            <sphereGeometry args={[0.1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.7} side={2} />
          </mesh>
        </group>
      ) : null}
      <SoupDrops top={REED_TOP} tip={REED_TIP} frame={f} span={POUR} />
      <Steam at={REED_TIP} frame={f} from={POUR[0] + 12} to={S.tear - 1} puff={B.hot} />

      {/* Cobwebs in the empty decoy. */}
      {f >= S.decoy
        ? [
            { p: [0.75, 2.1, -2.55] as V3, r: [0, 0, 0.6] as V3, s: 0.42 },
            { p: [REAL.x0 - 0.06, 2.55, -2.55] as V3, r: [0, -Math.PI / 2, 0] as V3, s: 0.5 },
            { p: [-0.1, 1.48, -2.55] as V3, r: [0, 0, 0.62] as V3, s: 0.3 },
            { p: [REAL.x0 - 0.06, 0.5, -1.7] as V3, r: [0, -Math.PI / 2, Math.PI] as V3, s: 0.3 },
          ].map((c, i) => <Cobweb key={i} position={c.p} rotation={c.r} size={c.s} sway={f >= B.cobwebs - 4 && f < B.cobwebs + 30 ? Math.sin((f - B.cobwebs) * 0.5) * (1 - (f - B.cobwebs + 4) / 34) : 0} />)
        : null}

      {/* The real chamber: the candle (lit on "candle"), the priest's cushion. */}
      {f >= S.tear ? (
        <>
          <Candle position={[REAL.x0 + 0.18, 0, -1.85]} height={0.12} lit={f >= CANDLE_LIT ? easeOutBack(ramp(f, CANDLE_LIT, CANDLE_LIT + 8)) : 0} frame={f} seed="real" light={1.8} />
          <Cushion position={[(REAL.x0 + REAL.x1) / 2 + 0.05, 0, -2.05]} scale={1.6} />
        </>
      ) : null}

      {/* The cat. */}
      {f < BURST - 4 ? <Cat position={CAT_EARLY} yaw={0.4} look={f > B.pounding ? -0.8 : 0} frame={f} /> : null}
      {f >= S.catShot ? (
        <>
          <Cushion position={CAT_STEP} scale={cushion} />
          <Cat position={[CAT_STEP[0], CAT_STEP[1] + (catOnCushion ? 0.06 : 0), CAT_STEP[2]]} yaw={0.15} pose={f >= B.quiet - 6 ? "curl" : "sit"} look={f < CUSHION_IN ? -0.3 : 0} frame={f} />
        </>
      ) : null}

      {/* The measuring ropes: outside the house, then inside it; the missing feet glow red. */}
      {between(f, S.measure, S.shaft) ? (
        <>
          <Rod a={ROPE_OUT_A} b={ROPE_OUT_B} t={easeInOut(ramp(f, ROPE_OUT[0], ROPE_OUT[1]))} r={0.06} color="#d8bd7a" />
          <Rod a={ROPE_IN_A} b={ROPE_IN_B} t={easeInOut(ramp(f, ROPE_IN[0], ROPE_IN[1]))} r={0.06} color="#d8bd7a" />
          {f >= B.inside ? (
            <>
              {/* The missing feet: the thick stone column in the middle of the house. */}
              <mesh position={[(COLUMN.x0 + COLUMN.x1) / 2, EAVES / 2, -1.6]}>
                <boxGeometry args={[COLUMN.x1 - COLUMN.x0 + 0.08, EAVES + 0.1, 2.2]} />
                <meshBasicMaterial color="#ff3b2f" transparent opacity={0.3 + 0.15 * Math.sin((f - B.inside) * 0.35)} depthWrite={false} />
              </mesh>
            </>
          ) : null}
        </>
      ) : null}

      {/* Knocks on the stair panel: rings for hollow, a puff of dust for solid. */}
      {KNOCKS_HOLLOW.map((k, i) => (
        <KnockRings key={k} at={[KNOCK_X[i] + 0.05, KNOCK_Y, PANEL_Z]} frame={f} knock={k} />
      ))}
      {KNOCKS_SOLID.map((k) => (
        <Burst key={`s${k}`} at={k} position={[SOLID_X + 0.05, KNOCK_Y, PANEL_Z]} count={10} color="#b8a990" size={0.03} duration={14} speed={0.012} gravity={-0.001} seed={`ks${k}`} />
      ))}

      {/* Dust: pounding, the door bursting, the step rattling, the hatch forced, the thump, the panels. */}
      {POUNDS.map((p) => (
        <Burst key={`p${p}`} at={p} position={[DOOR.x, DOOR.h + 0.1, -2.5]} count={8} color="#a99a82" size={0.03} duration={18} speed={0.01} gravity={-0.0015} seed={`pd${p}`} />
      ))}
      <Burst at={BURST} position={[DOOR.x, 1.2, -2.3]} count={26} color="#9c8b72" size={0.05} duration={22} speed={0.04} direction={[0, 0, 0.02]} gravity={-0.002} spread={[0.5, 1.0, 0.1]} seed="burst" />
      <Burst at={H1_ON_STEP} position={[(HATCH_X0 + HATCH_X1) / 2, HATCH_Y - 0.25, -2.1]} count={22} color="#bfae92" size={0.022} duration={30} speed={0.006} gravity={-0.0012} spread={[0.2, 0.02, 0.6]} seed="sift" />
      <Burst at={FORCE} position={[(HATCH_X0 + HATCH_X1) / 2, HATCH_Y, -2.1]} count={24} color="#8a6a44" size={0.035} duration={22} speed={0.035} direction={[0, 0.02, 0]} gravity={-0.003} seed="force" />
      <Burst at={THUMP_HIT} position={[REAL.x0, 1.0, -2.1]} count={18} color="#b4a48a" size={0.03} duration={20} speed={0.02} gravity={-0.0015} spread={[0.05, 0.6, 0.5]} seed="thump" />
      {PANEL_OFF.map((p, i) => (
        <Burst key={`po${p}`} at={p} position={[[-4.78, -3.98, -5.58, -3.18][i], FLOOR2 + 0.45, -2.45]} count={14} color="#a79680" size={0.035} duration={20} speed={0.02} gravity={-0.002} spread={[0.3, 0.5, 0.05]} seed={`po${i}`} />
      ))}
      {/* Feet landing in the hide. */}
      <Burst at={DROP1[1]} position={[(HATCH_X0 + HATCH_X1) / 2, 0.02, -2.1]} count={12} color="#a8987e" size={0.03} duration={16} speed={0.015} gravity={-0.001} seed="land1" />
      <Burst at={DROP2[1]} position={[(HATCH_X0 + HATCH_X1) / 2, 0.02, -2.1]} count={12} color="#a8987e" size={0.03} duration={16} speed={0.015} gravity={-0.001} seed="land2" />

      {/* The cast. */}
      <Person id="priest" />
      <Person id="h1" />
      <Person id="h2" />
      <Person id="h3" />
      <Person id="owner" />
      {/* The hide's floor dust, for depth. */}
      <mesh position={[(HIDE.x0 + HIDE.x1) / 2, 0.003, -2.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HIDE.x1 - HIDE.x0, 0.95]} />
        <meshStandardMaterial color="#5a4a38" roughness={1} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </>
  );
};
