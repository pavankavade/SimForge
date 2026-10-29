import type React from "react";
import { useCurrentFrame } from "remotion";
import { AdventurerUnit, hipHeight, type AdventurerPose, type Expression } from "../../artifacts/characters/hero";
import {
  BENCH,
  Biplane,
  BrokenBus,
  Cat,
  CloudPuff,
  Cow,
  FENCE_TOP,
  Flyer,
  Hawk,
  House,
  Jet,
  Moon,
  MountainCrest,
  PERCH,
  Paraglider,
  Piggyback,
  PlainsRoad,
  RecitalStage,
  Ridge,
  STAGE_H,
  School,
  SkyRig,
  ThermalColumn,
  Thermos,
  TownBlock,
  WeatherVane,
  WindStreaks,
  Windsock,
  YardFence,
  riderOffset,
} from "../../artifacts/sky";
import { dust } from "../../kit";
import {
  BEATS,
  BUS_X,
  BUS_Z,
  HOVER_Y,
  LANDING,
  MPH,
  PERCH_LAND,
  SCHOOL_STEPS_X,
  SPIRAL,
  TAKEOFF,
  WINDSOCK_X,
  WINDSOCK_Z,
  Z,
  busX,
  catX,
  climbDrop,
  easeInOut,
  kitRulesX,
  kitYardX,
  lerp,
  progress,
  shotAt,
  shotEnd,
  shotStart,
  takeoffLift,
  timeOfDay,
  w,
  windMph,
} from "./timeline";

/** Faces toward town (+x). */
const EAST = Math.PI / 2;
type P3 = [number, number, number];

/** The plains, turned so the road runs along x toward town; power line and fence on the far side. */
const Plains: React.FC<{ y?: number; x?: number; clouds?: boolean }> = ({ y = 0, x = 0, clouds = true }) => (
  <group position={[x, y, 0]}>
    <group rotation={[0, -Math.PI / 2, 0]}>
      <PlainsRoad bus={false} ridge={false} windsock={false} clouds={clouds} powerSide={-1} />
    </group>
  </group>
);

/** Ground distance scrolled since `from` at a ground speed of `mph(frame)` (integrated per frame). */
const scrolled = (from: number, frame: number, mph: (f: number) => number) => {
  let d = 0;
  for (let f = from; f < frame; f++) d += mph(f) * MPH;
  return d;
};
const groundMph = (f: number) => 3 + windMph(f);

// ---------------------------------------------------------------------------
// Cold open: the farmyard fence, and a cat that walks faster than you fly
// ---------------------------------------------------------------------------
const Yard: React.FC = () => (
  <>
    <Plains />
    <Ridge z={-330} scale={0.9} />
    <House position={[5, 0, -7]} color="#e8d7b6" glow={0} seed={3} />
    <House position={[-9, 0, -12]} rotationY={0.3} color="#9cc0d8" glow={0} seed={4} />
    <YardFence position={[7, 0, Z - 0.9]} length={30} />
  </>
);

const kitYard = (frame: number): { pose: AdventurerPose; expression: Expression } => {
  if (frame < BEATS.catBeats - 4) return { pose: "hover", expression: "focus" };
  if (frame < BEATS.flap - 4) return { pose: "hover", expression: "shock" };
  if (frame < BEATS.noHelp) return { pose: "fall", expression: "angry" };
  return { pose: "hover", expression: "dazed" };
};

const YardShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Yard />
    <Flyer who="flyKit" {...kitYard(frame)} position={[kitYardX(frame), 1.25, Z]} yaw={0.6} frame={frame} />
    <Cat position={[catX(frame), FENCE_TOP, Z - 0.9]} walk={frame} />
  </>
);

// ---------------------------------------------------------------------------
// Rules: the gust, then flying into the wind and going nowhere
// ---------------------------------------------------------------------------
const RulesShot: React.FC<{ frame: number }> = ({ frame }) => {
  const headwind = frame >= BEATS.intoWind;
  const gusting = frame >= BEATS.gust;
  const pitch = headwind ? 1.2 : gusting ? lerp(0, 1.2, easeInOut(progress(frame, [BEATS.gust, BEATS.gust + 14]))) : 0;
  const x = headwind ? 0 : kitRulesX(frame);
  const expr: Expression = headwind ? (frame >= BEATS.nowhere ? "angry" : "focus") : gusting ? "happy" : "neutral";
  return (
    <>
      <Plains />
      <Ridge z={-330} scale={0.9} />
      <Flyer who="flyKit" pose={gusting ? "fly" : "hover"} position={[x, HOVER_Y, Z]} yaw={gusting ? EAST : 0.55} pitch={pitch} expression={expr} frame={frame} />
      <WindStreaks frame={frame} center={[x, 2, Z]} speed={headwind ? -0.22 : windMph(frame) * 0.02} size={[30, 10, 8]} />
    </>
  );
};

// ---------------------------------------------------------------------------
// One passenger: Tess on Kit's back over the yard
// ---------------------------------------------------------------------------
const CarryShot: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - shotStart("carry");
  return (
    <>
      <Yard />
      <Piggyback carrier="flyKit" rider="sisterTess" position={[2 + t * 0.012, 1.1 + Math.sin(t * 0.08) * 0.08, Z]} yaw={0.7} carrierExpression="focus" riderExpression="happy" frame={frame} />
    </>
  );
};

// ---------------------------------------------------------------------------
// The bus ride, the preview of the show, and the breakdown
// ---------------------------------------------------------------------------
const BusRideShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Plains />
    <Ridge z={-330} scale={0.9} />
    <BrokenBus position={[busX(frame), 0, -1.2]} rotationY={EAST} broken={0} />
  </>
);

const PreviewShot: React.FC<{ frame: number }> = ({ frame }) => {
  const gone = frame >= w("c2", "Without");
  const sitY = BENCH.top - hipHeight("grandpaTeo") + 0.06;
  return (
    <>
      <RecitalStage open={1} spot={1.4} />
      <pointLight position={[-0.8, 4, 6]} intensity={70} color="#ffd8a8" distance={30} decay={1.5} />
      <AdventurerUnit classType="sisterTess" pose={gone ? "idle" : "cheer"} expression={gone ? "scared" : "happy"} position={[0.5, STAGE_H, -1.6]} animFrame={frame} />
      {!gone ? (
        <AdventurerUnit classType="grandpaTeo" pose="ride" weapon="none" expression="smug" position={[BENCH.x + 0.35, sitY, BENCH.z]} rotation={[0, Math.PI + 0.5, 0]} animFrame={frame} />
      ) : null}
    </>
  );
};

const BusShot: React.FC<{ frame: number }> = ({ frame }) => {
  const broken = easeInOut(progress(frame, [BEATS.coughs, BEATS.dies + 6]));
  const out = frame >= lineStart4();
  const lookUp = frame >= BEATS.sky;
  return (
    <>
      <Plains />
      <Ridge z={-330} scale={0.9} />
      <BrokenBus position={[busX(frame), 0, BUS_Z]} rotationY={EAST} broken={broken} />
      {out ? (
        <>
          <AdventurerUnit classType="flyKit" pose="idle" expression={frame >= BEATS.thirteen ? "scared" : "shock"} position={[-0.5, 0, Z]} rotation={[0, 0.5, 0]} animFrame={frame} />
          <AdventurerUnit
            classType="grandpaTeo"
            pose={lookUp ? "point" : "idle"}
            weapon={lookUp ? "none" : "cane"}
            expression={lookUp ? "smug" : "neutral"}
            position={[0.8, 0, Z - 0.3]}
            rotation={[0, lookUp ? -0.2 : -0.4, 0]}
            animFrame={frame}
          />
        </>
      ) : null}
    </>
  );
};
/** Kit and Grandpa are standing by the bus once the engine has died. */
const lineStart4 = () => BEATS.dies + 12;

// ---------------------------------------------------------------------------
// Windsock: five stripes full, pointing toward town
// ---------------------------------------------------------------------------
const WindsockShot: React.FC<{ frame: number }> = ({ frame }) => {
  const knots = lerp(9, 15, easeInOut(progress(frame, [BEATS.fiveStripes, BEATS.allFull])));
  return (
    <>
      <Plains />
      <Ridge z={-330} scale={0.9} />
      <BrokenBus position={[BUS_X - 6, 0, BUS_Z]} rotationY={EAST} broken={0.5} />
      <Windsock position={[WINDSOCK_X, 0, WINDSOCK_Z]} dir={EAST} knots={knots} height={4.5} />
      <AdventurerUnit classType="grandpaTeo" pose={frame >= BEATS.cane ? "point" : "idle"} weapon="cane" expression="focus" position={[0.9, 0, Z]} rotation={[0, 1.15, 0]} animFrame={frame} />
      <AdventurerUnit classType="flyKit" pose="idle" expression={frame >= BEATS.towardTown ? "happy" : "neutral"} position={[-0.1, 0, Z + 0.4]} rotation={[0, 0.9, 0]} animFrame={frame} />
      <WindStreaks frame={frame} center={[1.5, 2.5, Z - 1]} speed={0.2} count={40} size={[22, 6, 6]} opacity={0.4} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Takeoff: Grandpa climbs on, Kit steps into the wind
// ---------------------------------------------------------------------------
const TAKEOFF_X = -0.3;
export const takeoffPair = (frame: number) => {
  const t = takeoffLift(frame);
  return { position: [TAKEOFF_X + t * t * 9, t * 2.6, Z] as P3, pitch: t * 0.95 };
};

const TakeoffShot: React.FC<{ frame: number }> = ({ frame }) => {
  const mounted = frame >= BEATS.onBack;
  const p = takeoffPair(frame);
  return (
    <>
      <Plains />
      <Ridge z={-330} scale={0.9} />
      <Windsock position={[WINDSOCK_X + 6, 0, WINDSOCK_Z - 2]} dir={EAST} knots={15} height={4.5} />
      {mounted ? (
        <Piggyback
          carrier="flyKit"
          rider="grandpaTeo"
          position={p.position}
          yaw={EAST - 0.35}
          pitch={p.pitch}
          carrierExpression={frame < TAKEOFF[0] ? "focus" : "happy"}
          riderExpression={frame < TAKEOFF[0] + 12 ? "smug" : "shock"}
          frame={frame}
        />
      ) : (
        <>
          <AdventurerUnit classType="flyKit" pose="idle" expression="focus" position={[TAKEOFF_X, 0, Z]} rotation={[0, EAST - 0.5, 0]} animFrame={frame} />
          <AdventurerUnit classType="grandpaTeo" pose="idle" expression="smug" position={[TAKEOFF_X - 0.9, 0, Z - 0.2]} rotation={[0, EAST - 0.2, 0]} animFrame={frame} />
        </>
      )}
      {dust(TAKEOFF[0] + 4, [TAKEOFF_X, 0.05, Z], "takeoff-dust", 1)}
      <WindStreaks frame={frame} center={[p.position[0], 2.5, Z]} speed={0.22} count={40} size={[24, 7, 6]} opacity={0.45} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Cruise: twenty mph over the patchwork; the ground scrolls, the air does not
// ---------------------------------------------------------------------------
const CRUISE_ALT = 34;
const CruiseShot: React.FC<{ frame: number }> = ({ frame }) => {
  const s = shotStart("cruise");
  const t = frame - s;
  const ground = -scrolled(s, frame, groundMph);
  const planeT = frame - (BEATS.cropDuster - 50);
  return (
    <>
      <Plains y={-CRUISE_ALT} x={ground - 40} />
      <Ridge z={-330} scale={0.9} />
      <Piggyback
        carrier="flyKit"
        rider="grandpaTeo"
        position={[0, 0, Z]}
        yaw={EAST}
        pitch={0.95}
        carrierExpression="happy"
        riderExpression={frame >= BEATS.salutes ? "smug" : "happy"}
        frame={frame}
      />
      {/* Clouds drift with the wind, so they barely move past the pair */}
      <CloudPuff position={[9 - t * 0.03, -4, -18]} scale={3} seed={11} />
      <CloudPuff position={[-14 - t * 0.03, 3, -24]} scale={3.6} seed={12} />
      <CloudPuff position={[20 - t * 0.03, 1, -34]} scale={5} seed={13} />
      {planeT > 0 ? <Biplane position={[-26 + planeT * 0.45, -7, -6]} heading={EAST} frame={frame} scale={1.2} /> : null}
      <WindStreaks frame={frame} center={[0, 1, Z]} speed={0.05} count={24} size={[18, 6, 5]} opacity={0.3} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Headwind wall: low over a pasture, flying flat out and going nowhere
// ---------------------------------------------------------------------------
const PASTURE_ALT = 7;
const HeadwindShot: React.FC<{ frame: number }> = ({ frame }) => {
  const s = shotStart("headwind");
  const ground = -scrolled(s, frame, (f) => Math.max(0, groundMph(f)));
  const cowLook = easeInOut(progress(frame, [BEATS.cow - 20, BEATS.cow + 10]));
  return (
    <>
      <Plains y={-PASTURE_ALT} x={ground - 70} />
      <Ridge z={-330} scale={0.9} />
      {frame >= BEATS.inFace ? (
        <Cow position={[2.2, -PASTURE_ALT, Z - 3]} heading={lerp(0.4, -0.3, cowLook)} look={lerp(0, -0.5, cowLook)} chew={frame} />
      ) : null}
      <Piggyback
        carrier="flyKit"
        rider="grandpaTeo"
        position={[0, 0, Z]}
        yaw={EAST}
        pitch={0.95}
        carrierExpression={frame >= BEATS.inFace ? (frame >= BEATS.nowhere2 ? "pain" : "angry") : "focus"}
        riderExpression={frame >= BEATS.hawk ? "happy" : "neutral"}
        frame={frame}
      />
      {frame >= BEATS.hawk - 20 ? <Hawk position={[7 + Math.cos(frame * 0.03) * 2, 3 + Math.sin(frame * 0.05) * 0.3, -6 + Math.sin(frame * 0.03) * 2]} heading={-frame * 0.03} bank={0.4} scale={1.3} /> : null}
      <WindStreaks frame={frame} center={[0, 1, Z]} speed={frame >= BEATS.inFace ? -0.2 : 0.06} count={50} size={[22, 8, 6]} opacity={0.5} seed={3} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Climb: spiral up the thermal with the hawk
// ---------------------------------------------------------------------------
/** Thermal centre, ahead and to the side of the pair. */
export const THERMAL: P3 = [3, 0, Z - 2];
const SPIRAL_R = 1.5;
const spiralAngle = (frame: number) => Math.PI * 0.95 + Math.max(0, frame - SPIRAL[0]) * 0.03;

export const climbPair = (frame: number) => {
  if (frame < SPIRAL[0]) {
    const k = progress(frame, [shotStart("climb"), SPIRAL[0]]);
    const a = spiralAngle(SPIRAL[0]);
    const end: P3 = [THERMAL[0] + Math.cos(a) * SPIRAL_R, 0, THERMAL[2] + Math.sin(a) * SPIRAL_R];
    return { position: [lerp(end[0] - 3, end[0], easeInOut(k)), 0, end[2]] as P3, yaw: EAST, pitch: lerp(0.95, 0.55, easeInOut(k)) };
  }
  const a = spiralAngle(frame);
  return {
    position: [THERMAL[0] + Math.cos(a) * SPIRAL_R, 0, THERMAL[2] + Math.sin(a) * SPIRAL_R] as P3,
    yaw: Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI,
    pitch: 0.55,
  };
};

const ClimbShot: React.FC<{ frame: number }> = ({ frame }) => {
  const drop = climbDrop(frame);
  const p = climbPair(frame);
  const a = spiralAngle(frame) + Math.PI;
  const r = SPIRAL_R + 0.9;
  return (
    <>
      <Plains y={-PASTURE_ALT - drop} x={-90} />
      <group position={[125, -PASTURE_ALT - drop, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Ridge z={0} scale={1.5} seed={4} />
      </group>
      <ThermalColumn position={[THERMAL[0], -PASTURE_ALT - drop, THERMAL[2]]} height={PASTURE_ALT + drop + 40} radius={4} frame={frame} opacity={frame >= BEATS.rises ? 0.22 : 0.08} />
      <Piggyback carrier="flyKit" rider="grandpaTeo" position={p.position} yaw={p.yaw} pitch={p.pitch} carrierExpression="happy" riderExpression="happy" frame={frame} />
      <Hawk
        position={[THERMAL[0] + Math.cos(a) * r, 1.4 + Math.sin(frame * 0.05) * 0.3, THERMAL[2] + Math.sin(a) * r]}
        heading={Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI}
        bank={0.4}
        scale={0.85}
      />
      <CloudPuff position={[-10, -8 - drop * 0.6, -26]} scale={4} seed={21} />
      <CloudPuff position={[22, -14 - drop * 0.6, -30]} scale={5} seed={22} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Too high: above the clouds, frost, the thermos, and a jet in the jet stream
// ---------------------------------------------------------------------------
const CloudSea: React.FC<{ y: number; x?: number }> = ({ y, x = 0 }) => (
  <group position={[x, y, 0]}>
    {Array.from({ length: 26 }, (_, i) => (
      <CloudPuff key={i} position={[((i * 37) % 160) - 80, (i % 3) * 1.2, -12 - ((i * 23) % 70)]} scale={5 + (i % 4) * 1.5} seed={40 + i} />
    ))}
  </group>
);

const HighShot: React.FC<{ frame: number }> = ({ frame }) => {
  const open = easeInOut(progress(frame, [BEATS.thermos, BEATS.thermos + 12]));
  const jetX = -120 + (frame - BEATS.jet + 60) * 0.7;
  const rider = riderOffset("flyKit", "grandpaTeo");
  return (
    <>
      <CloudSea y={-14} x={-(frame - shotStart("high")) * 0.02} />
      <Piggyback
        carrier="flyKit"
        rider="grandpaTeo"
        position={[0, 0, Z]}
        yaw={EAST - 0.25}
        pitch={0.2}
        carrierExpression={frame >= BEATS.frost ? "scared" : "focus"}
        riderExpression={frame >= BEATS.thermos ? "happy" : "neutral"}
        frame={frame}
      />
      {/* Grandpa's thermos, held out beside Kit's shoulder */}
      {frame >= BEATS.thermos - 10 ? <Thermos position={[0.55, rider[1] + 1.1, Z + 0.35]} open={open} frame={frame} /> : null}
      {frame >= BEATS.jet - 60 ? <Jet position={[jetX, 46, -70]} trail={140} /> : null}
      <WindStreaks frame={frame} center={[0, 1, Z]} speed={0.04} count={18} size={[16, 6, 5]} opacity={0.25} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Ridge lift: along the crest beside a paraglider
// ---------------------------------------------------------------------------
const RIDGE_Y = -4;
const RidgeShot: React.FC<{ frame: number }> = ({ frame }) => {
  const s = shotStart("ridge");
  const ground = -scrolled(s, frame, groundMph);
  const join = easeInOut(progress(frame, [BEATS.slideIn - 10, BEATS.slideIn + 40]));
  return (
    <>
      <Plains y={-60} x={ground * 0.3} clouds={false} />
      <MountainCrest position={[ground + 40, RIDGE_Y, Z - 6]} length={220} />
      <Piggyback
        carrier="flyKit"
        rider="grandpaTeo"
        position={[lerp(-5, -1.2, join), lerp(0.6, 0, join), Z]}
        yaw={EAST}
        pitch={0.9}
        carrierExpression={frame >= BEATS.escalator ? "happy" : "focus"}
        riderExpression="happy"
        frame={frame}
      />
      <Paraglider position={[1.6, -1.2 + Math.sin(frame * 0.04) * 0.2, Z - 2.4]} heading={EAST} frame={frame} />
      <WindStreaks frame={frame} center={[0, 0, Z - 2]} speed={0.08} count={30} size={[20, 8, 6]} opacity={0.35} seed={5} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Stall and flip: on the perch rock at the top of the ridge
// ---------------------------------------------------------------------------
/** The crest sits so its perch rock top is at y = PERCH.y and z = Z. */
const CREST_POS: P3 = [0, 0, Z - PERCH.z];
const PERCH_TOP: P3 = [0, PERCH.y, Z];

const sitY = (who: "flyKit" | "grandpaTeo") => PERCH_TOP[1] + 0.12 - hipHeight(who);

const PilingClouds: React.FC<{ grow: number }> = ({ grow }) => (
  <>
    <CloudPuff position={[-10, 2, -22]} scale={3 + grow * 4} seed={61} />
    <CloudPuff position={[9, 3, -26]} scale={3.5 + grow * 4} seed={62} />
    <CloudPuff position={[24, 1, -30]} scale={4 + grow * 3} seed={63} />
  </>
);

const StallShot: React.FC<{ frame: number }> = ({ frame }) => {
  const landed = frame >= BEATS.landRock;
  const t = easeInOut(progress(frame, PERCH_LAND));
  const teoSits = frame >= BEATS.sitsDown;
  const teoUp = frame >= BEATS.licks;
  return (
    <>
      <Plains y={-60} x={-60} clouds={false} />
      <MountainCrest position={CREST_POS} length={220} />
      <PilingClouds grow={progress(frame, [BEATS.quiet, BEATS.stops + 30])} />
      {!landed ? (
        <Piggyback
          carrier="flyKit"
          rider="grandpaTeo"
          position={[lerp(-3, PERCH_TOP[0], t), lerp(1.6, PERCH_TOP[1], t), Z]}
          yaw={EAST - 0.4}
          pitch={lerp(0.5, 0, t)}
          carrierExpression={frame >= BEATS.fortyOne ? "scared" : "focus"}
          riderExpression="neutral"
          frame={frame}
        />
      ) : (
        <>
          <AdventurerUnit classType="flyKit" pose="ride" expression={frame >= BEATS.sunflowerField ? "happy" : "dazed"} position={[-0.45, sitY("flyKit"), Z]} rotation={[0, 0.3, 0]} animFrame={frame} />
          <AdventurerUnit
            classType="grandpaTeo"
            pose={teoUp ? "cheer" : teoSits ? "ride" : "idle"}
            weapon="none"
            expression={teoUp ? "smug" : "happy"}
            position={[0.5, teoSits && !teoUp ? sitY("grandpaTeo") : PERCH_TOP[1], Z + 0.05]}
            rotation={[0, -0.3, 0]}
            animFrame={frame}
          />
        </>
      )}
      {dust(BEATS.landRock, [PERCH_TOP[0], PERCH_TOP[1] + 0.02, Z], "rock-dust", 0.8)}
    </>
  );
};

const FlipShot: React.FC<{ frame: number }> = ({ frame }) => {
  const turned = frame >= BEATS.turns;
  const wind = turned ? lerp(-0.1, 0.32, easeInOut(progress(frame, [BEATS.turns, BEATS.turns + 30]))) : -0.1;
  return (
    <>
      <Plains y={-60} x={-60} clouds={false} />
      <MountainCrest position={CREST_POS} length={220} sunset={1} />
      <PilingClouds grow={1} />
      <AdventurerUnit classType="flyKit" pose="idle" expression={turned ? "happy" : "focus"} position={[-0.45, PERCH_TOP[1], Z]} rotation={[0, 0.5, 0]} animFrame={frame} />
      <AdventurerUnit classType="grandpaTeo" pose={turned ? "cheer" : "idle"} weapon="none" expression="smug" position={[0.5, PERCH_TOP[1], Z + 0.05]} rotation={[0, -0.2, 0]} animFrame={frame} />
      <WindStreaks frame={frame} center={[0, -2, Z]} speed={wind} count={60} size={[26, 10, 8]} opacity={0.5} seed={9} />
    </>
  );
};

// ---------------------------------------------------------------------------
// The run: jump off the crest and race the downslope wind to town
// ---------------------------------------------------------------------------
const VALLEY_ALT = 26;
const ValleyShot: React.FC<{ frame: number }> = ({ frame }) => {
  const s = shotStart("valley");
  const glow = Math.min(1, Math.max(0, (timeOfDay(frame) - 0.9) / 0.5));
  const jumped = frame >= BEATS.jump;
  const grabbed = frame >= BEATS.grab;
  const k = easeInOut(progress(frame, [BEATS.jump, BEATS.jump + 26]));
  const x = -scrolled(s, frame, (f) => (f < BEATS.jump ? 0 : 25 * Math.min(1, (f - BEATS.jump) / 30)));
  return (
    <>
      <group position={[x, 0, 0]}>
        <MountainCrest position={CREST_POS} length={220} sunset={1} />
        <group position={[0, -VALLEY_ALT, 0]}>
          <Plains x={60} clouds={false} />
          <TownBlock position={[160, 0.05, -2]} glow={glow} count={22} />
          <School position={[190, 0.05, -12]} glow={glow} />
        </group>
      </group>
      {!grabbed ? (
        <>
          <AdventurerUnit classType="flyKit" pose="idle" expression="focus" position={[-0.45, PERCH_TOP[1], Z]} rotation={[0, EAST - 0.3, 0]} animFrame={frame} />
          <AdventurerUnit classType="grandpaTeo" pose="idle" weapon="none" expression="smug" position={[0.5, PERCH_TOP[1], Z + 0.05]} rotation={[0, -0.2, 0]} animFrame={frame} />
        </>
      ) : (
        <Piggyback
          carrier="flyKit"
          rider="grandpaTeo"
          position={[0, PERCH_TOP[1] + (jumped ? k * 0.8 : 0), Z]}
          yaw={EAST}
          pitch={jumped ? lerp(0, 1.15, k) : 0}
          carrierExpression={jumped ? "happy" : "focus"}
          riderExpression={jumped ? "shock" : "smug"}
          frame={frame}
        />
      )}
      <WindStreaks frame={frame} center={[0, 0, Z]} speed={0.34} count={60} size={[26, 10, 8]} opacity={0.5} seed={7} />
    </>
  );
};

// ---------------------------------------------------------------------------
// School: glide in, land on the steps at 6:59
// ---------------------------------------------------------------------------
const SCHOOL_Z = -3;
/** Ground just in front of the bottom step (School steps run to local z ≈ 2.2). */
export const LAND: P3 = [SCHOOL_STEPS_X - 0.6, 0, SCHOOL_Z + 2.9];

export const schoolPair = (frame: number) => {
  const t = easeInOut(progress(frame, LANDING));
  return {
    position: [lerp(LAND[0] - 9, LAND[0], t), lerp(5, 0, 1 - (1 - t) * (1 - t)), LAND[2]] as P3,
    pitch: lerp(1.0, 0, Math.min(1, t * 1.15)),
  };
};

const SchoolShot: React.FC<{ frame: number }> = ({ frame }) => {
  const landed = frame >= BEATS.land;
  const p = schoolPair(frame);
  const hurry = progress(frame, [BEATS.land + 10, BEATS.land + 70]);
  return (
    <>
      <Plains y={-0.02} />
      <School position={[SCHOOL_STEPS_X, 0, SCHOOL_Z]} glow={1} />
      <TownBlock position={[-60, 0, -26]} glow={1} count={14} />
      <pointLight position={[LAND[0] - 1, 3.5, LAND[2] + 6]} intensity={60} color="#ffd9b0" distance={40} decay={1.5} />
      {!landed ? (
        <Piggyback carrier="flyKit" rider="grandpaTeo" position={p.position} yaw={EAST} pitch={p.pitch} carrierExpression="focus" riderExpression="happy" frame={frame} />
      ) : (
        <>
          <AdventurerUnit classType="flyKit" pose="idle" expression="dazed" position={[LAND[0] - 0.4, 0, LAND[2] + 0.2]} rotation={[0, 0.4, 0]} animFrame={frame} />
          <AdventurerUnit
            classType="grandpaTeo"
            pose={hurry > 0 && hurry < 1 ? "walk" : "idle"}
            expression="focus"
            weapon="none"
            position={[lerp(LAND[0] + 0.5, SCHOOL_STEPS_X, hurry), lerp(0, 0.6, hurry), lerp(LAND[2], SCHOOL_Z + 0.9, hurry)]}
            rotation={[0, hurry > 0 ? Math.PI : 0.3, 0]}
            animFrame={frame * 1.6}
          />
        </>
      )}
      {dust(BEATS.land, [LAND[0], 0.05, LAND[2]], "land-dust", 1.2)}
    </>
  );
};

// ---------------------------------------------------------------------------
// Stage: Grandpa slides onto the bench as the curtain opens on Tess
// ---------------------------------------------------------------------------
export const KIT_BACK_OF_HALL: P3 = [3.6, 1.0, 5.6];

const StageShot: React.FC<{ frame: number }> = ({ frame }) => {
  const open = easeInOut(progress(frame, [BEATS.curtain, BEATS.opens + 24]));
  const slide = easeInOut(progress(frame, [BEATS.slides - 4, BEATS.slides + 16]));
  const sit = BENCH.top - hipHeight("grandpaTeo") + 0.06;
  return (
    <>
      <RecitalStage open={open} spot={1.4 * open} />
      <pointLight position={[-0.8, 4, 6]} intensity={70} color="#ffd8a8" distance={30} decay={1.5} />
      <AdventurerUnit classType="sisterTess" pose={open > 0.6 ? "cheer" : "idle"} expression={frame >= BEATS.grins ? "happy" : "neutral"} position={[0.5, STAGE_H, -1.6]} animFrame={frame} />
      <AdventurerUnit
        classType="grandpaTeo"
        pose={slide > 0.85 ? "ride" : "walk"}
        weapon="none"
        expression={slide > 0.85 ? "smug" : "focus"}
        position={[lerp(-5.4, BENCH.x + 0.35, slide), slide > 0.85 ? sit : STAGE_H, lerp(-0.4, BENCH.z, slide)]}
        rotation={[0, slide > 0.85 ? Math.PI + 0.5 : EAST, 0]}
        animFrame={frame * 1.5}
      />
      <Flyer who="flyKit" pose="hover" position={KIT_BACK_OF_HALL} yaw={Math.PI - 0.3} expression="dazed" frame={frame} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Night: the weather vane spins; next time, the jet stream
// ---------------------------------------------------------------------------
const NightShot: React.FC<{ frame: number }> = ({ frame }) => {
  const spin = frame < BEATS.vane ? 0.4 : 0.4 + (frame - BEATS.vane) * 0.12 * Math.max(0.2, 1 - (frame - BEATS.vane) / 200);
  return (
    <>
      <Plains y={-0.02} />
      <School position={[SCHOOL_STEPS_X, 0, SCHOOL_Z - 4]} glow={1} />
      <WeatherVane position={[SCHOOL_STEPS_X, 8.9, SCHOOL_Z - 3.9]} angle={spin} />
      <Moon position={[-60, 140, -400]} size={14} />
      <pointLight position={[0.2, 2.4, Z + 5]} intensity={45} color="#ffe2c0" distance={20} decay={1.5} />
      <Flyer
        who="flyKit"
        pose="hover"
        position={[0.2, 1.4 + Math.sin(frame * 0.05) * 0.1, Z + 1]}
        yaw={frame >= BEATS.imagine ? 0.1 : -0.6}
        expression={frame >= BEATS.jetStream && frame < BEATS.imagine ? "shock" : "smug"}
        frame={frame}
      />
    </>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const shot = shotAt(frame);
  const tod = timeOfDay(frame);
  const indoor = shot === "stage" || shot === "preview";
  return (
    <>
      <SkyRig
        tod={indoor ? 1.65 : tod}
        azimuth={shot === "valley" || shot === "flip" ? 1.4 : -0.5}
        fogNear={indoor ? 40 : 90}
        fogFar={indoor ? 200 : 900}
      />
      {shot === "yard" ? <YardShot frame={frame} /> : null}
      {shot === "rules" ? <RulesShot frame={frame} /> : null}
      {shot === "carry" ? <CarryShot frame={frame} /> : null}
      {shot === "busRide" ? <BusRideShot frame={frame} /> : null}
      {shot === "preview" ? <PreviewShot frame={frame} /> : null}
      {shot === "bus" ? <BusShot frame={frame} /> : null}
      {shot === "windsock" ? <WindsockShot frame={frame} /> : null}
      {shot === "takeoff" ? <TakeoffShot frame={frame} /> : null}
      {shot === "cruise" ? <CruiseShot frame={frame} /> : null}
      {shot === "headwind" ? <HeadwindShot frame={frame} /> : null}
      {shot === "climb" ? <ClimbShot frame={frame} /> : null}
      {shot === "high" ? <HighShot frame={frame} /> : null}
      {shot === "ridge" ? <RidgeShot frame={frame} /> : null}
      {shot === "stall" ? <StallShot frame={frame} /> : null}
      {shot === "flip" ? <FlipShot frame={frame} /> : null}
      {shot === "valley" ? <ValleyShot frame={frame} /> : null}
      {shot === "school" ? <SchoolShot frame={frame} /> : null}
      {shot === "stage" ? <StageShot frame={frame} /> : null}
      {shot === "night" ? <NightShot frame={frame} /> : null}
    </>
  );
};

/** Shot geometry the camera needs. */
export const SHOT_GEOMETRY = { CRUISE_ALT, PASTURE_ALT, RIDGE_Y, PERCH_TOP, SCHOOL_Z, shotEnd };
