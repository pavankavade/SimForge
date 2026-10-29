import type React from "react";
import { useCurrentFrame } from "remotion";
import { AdventurerUnit, hipHeight, type AdventurerClass, type AdventurerPose, type Expression } from "../../artifacts/characters/hero";
import { Cow, House, Moon, Piggyback, SkyRig, Tilted, YardFence } from "../../artifacts/sky";
import {
  BALE_R,
  Balloons,
  Barn,
  Blink,
  Bunting,
  Cake,
  Cornfield,
  Drips,
  Globe,
  Ground,
  HayBurst,
  Hayfield,
  Hedge,
  HouseBack,
  LakeDock,
  Lawn,
  PORCH_TOP,
  PaperMap,
  PartyTable,
  PatagoniaSet,
  River,
  SWING,
  Snowball,
  SpeedLines,
  SwingSet,
  TABLE_TOP,
  Tree,
  facing,
  swingSeat,
  type GlobeArrow,
  type GlobePin,
} from "../../artifacts/teleport";
import { dust, jellySplash } from "../../kit";
import {
  ARRIVE_X,
  BEATS,
  HAY_ARRIVE_X,
  HEDGE_X,
  MPH,
  PLACES,
  SIT_ON_SWING,
  Z,
  easeInOut,
  hayRoll,
  hayX,
  kitRunX,
  lerp,
  progress,
  runSpeed,
  shotAt,
  shotEnd,
  shotStart,
  swingAngle,
} from "./timeline";

/** Faces +x (north on the hops, toward the hedge in the yard). */
const EAST = Math.PI / 2;
type P3 = [number, number, number];
const KIT: AdventurerClass = "flyKit";
const TEO: AdventurerClass = "grandpaTeo";

const Person: React.FC<{ who: AdventurerClass; pose?: AdventurerPose; at: P3; yaw?: number; expression?: Expression; frame: number; weapon?: "none" | "cane" }> = ({
  who,
  pose = "idle",
  at,
  yaw = 0,
  expression,
  frame,
  weapon,
}) => <AdventurerUnit classType={who} pose={pose} expression={expression} weapon={weapon ?? (who === TEO ? "none" : undefined)} position={at} rotation={[0, yaw, 0]} animFrame={frame} />;

/** Seated feet height so the hips rest on a surface at `top`. */
const sitY = (who: AdventurerClass, top: number) => top + 0.1 - hipHeight(who);

// ---------------------------------------------------------------------------
// The backyard: swing set on the left, the porch, the lawn, Grandpa's hedge.
// ---------------------------------------------------------------------------
export const SWING_X = -11;
export const HOUSE_X = ARRIVE_X + 3;
/** Porch deck ends here (+x); beyond it the lawn is one step down. */
export const PORCH_END = HOUSE_X + 2.4;
export const PARTY_X = 6.2;
export const TABLE_Z = Z - 1.7;

const BackyardSet: React.FC<{ frame: number; party?: number; hedgeHit?: number }> = ({ frame, party = 0, hedgeHit = 0 }) => (
  <>
    <Lawn />
    <HouseBack position={[HOUSE_X, 0, Z - 1.4]} width={14} />
    <SwingSet position={[SWING_X, 0, Z]} rotationY={EAST} angle={swingAngle(frame)} empty={false} />
    <group position={[HEDGE_X, 0, Z - 2]} rotation={[0, EAST, 0]}>
      <Hedge position={[0, 0, 0]} length={9} hit={hedgeHit} hitX={-2} frame={frame} />
    </group>
    <YardFence position={[0, 0, Z - 9]} length={50} />
    <House position={[-22, 0, -16]} color="#e8d7b6" glow={0} seed={3} />
    <House position={[24, 0, -18]} rotationY={-0.3} color="#b8d0a2" glow={0} seed={5} />
    <Tree position={[-15, 0, Z - 5]} scale={1.3} seed={1} />
    <Tree position={[17, 0, Z - 5.5]} scale={1.4} seed={2} />
    <Tree position={[9, 0, Z - 7]} scale={1.1} seed={3} />
    {party > 0 ? (
      <>
        <PartyTable position={[PARTY_X, 0, TABLE_Z]} />
        <Balloons position={[PARTY_X - 2.0, TABLE_TOP, TABLE_Z - 0.6]} frame={frame} />
        <Balloons position={[PARTY_X + 2.0, TABLE_TOP, TABLE_Z - 0.6]} frame={frame + 30} seed={2} />
        <Bunting a={[HOUSE_X + 2.2, 2.9, Z + 0.9]} b={[9, 3.6, Z - 7]} />
      </>
    ) : null}
  </>
);

// ---------------------------------------------------------------------------
// Cold open: blinking around the yard, then onto the swing.
// ---------------------------------------------------------------------------
const SPOTS: { at: number; pos: P3; yaw: number; pose: AdventurerPose; expr: Expression }[] = [
  { at: 0, pos: [SWING_X + 5, 0, Z], yaw: 0.3, pose: "idle", expr: "happy" },
  { at: BEATS.anywhere, pos: [SWING_X, SWING.beamY + 0.08, Z], yaw: 0, pose: "cheer", expr: "smug" },
  { at: BEATS.blinkWord, pos: [SWING_X + 3.2, 0, Z + 1.2], yaw: -0.4, pose: "point", expr: "happy" },
];

const seatWorld = (frame: number): P3 => {
  const s = swingSeat(swingAngle(frame));
  return [SWING_X + s[2], s[1], Z - s[0]];
};

const YardShot: React.FC<{ frame: number }> = ({ frame }) => {
  const onSwing = frame >= SIT_ON_SWING;
  const spot = SPOTS.filter((s) => frame >= s.at).slice(-1)[0];
  const seat = seatWorld(frame);
  const hip = hipHeight(KIT);
  return (
    <>
      <BackyardSet frame={frame} />
      {onSwing ? (
        <Tilted position={[seat[0], seat[1] + 0.06 - hip, seat[2]]} yaw={EAST} pitch={-swingAngle(frame)} pivot={hip}>
          <AdventurerUnit classType={KIT} pose="ride" expression={frame >= BEATS.swing ? "happy" : "focus"} animFrame={frame} />
        </Tilted>
      ) : (
        <Person who={KIT} pose={spot.pose} at={spot.pos} yaw={spot.yaw} expression={spot.expr} frame={frame} />
      )}
      {SPOTS.slice(1).map((s, i) => (
        <Blink key={`o${i}`} frame={frame} at={s.at} position={SPOTS[i].pos} kind="out" seed={i} />
      ))}
      {SPOTS.slice(1).map((s, i) => (
        <Blink key={`i${i}`} frame={frame} at={s.at} position={s.pos} kind="in" seed={i + 10} />
      ))}
      <Blink frame={frame} at={SIT_ON_SWING} position={SPOTS[2].pos} kind="out" seed={20} />
      <Blink frame={frame} at={SIT_ON_SWING} position={[seat[0], seat[1] - 0.3, seat[2]]} kind="in" seed={21} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Porch: arriving at swing speed, stumble-running into the hedge.
// ---------------------------------------------------------------------------
const kitPorchY = (x: number) => (x < PORCH_END ? PORCH_TOP : Math.max(0, PORCH_TOP - (x - PORCH_END) * 0.6));

const PorchShot: React.FC<{ frame: number }> = ({ frame }) => {
  const x = kitRunX(frame);
  const hit = progress(frame, [BEATS.hedge, BEATS.hedge + 24]);
  const stuck = frame >= BEATS.hedge && frame < BEATS.standing - 20;
  const up = frame >= BEATS.standing - 20;
  const v = runSpeed(frame);
  return (
    <>
      <BackyardSet frame={frame} hedgeHit={hit} />
      {/* The empty swing still swinging back on the left */}
      {!stuck && !up ? (
        <Tilted position={[x, kitPorchY(x), Z]} yaw={EAST} pitch={0.35} pivot={hipHeight(KIT)}>
          <AdventurerUnit classType={KIT} pose="run" expression={frame >= BEATS.twelve + 20 ? "scared" : "shock"} animFrame={frame * 2.6} />
        </Tilted>
      ) : null}
      {stuck ? (
        <Tilted position={[HEDGE_X - 0.85, 0, Z]} yaw={EAST} pitch={1.25} pivot={0.5}>
          <AdventurerUnit classType={KIT} pose="fall" expression="dazed" animFrame={frame} />
        </Tilted>
      ) : null}
      {up ? <Person who={KIT} pose="idle" at={[HEDGE_X - 1.6, 0, Z + 0.3]} yaw={-0.25} expression={frame >= BEATS.standing ? "dazed" : "pain"} frame={frame} /> : null}
      <Person who={TEO} pose={frame >= BEATS.hedge ? "point" : "idle"} at={[HEDGE_X - 3.2, 0, Z - 1.6]} yaw={0.7} expression={frame >= BEATS.hedge ? "shock" : "neutral"} frame={frame} />
      <SpeedLines frame={frame} center={[x - 0.3, kitPorchY(x) + 1.0, Z]} speed={v / 0.18} />
      <Blink frame={frame} at={BEATS.leave} position={[ARRIVE_X, PORCH_TOP, Z]} kind="in" seed={30} />
      {dust(BEATS.hedge, [HEDGE_X - 0.6, 0.9, Z], "hedge-leaves", 0.8)}
      {jellySplash(BEATS.hedge, [HEDGE_X - 0.5, 1.2, Z], "hedge-burst", "#5c9a44")}
    </>
  );
};

// ---------------------------------------------------------------------------
// Globe shots (in space, lit by a key "sun").
// ---------------------------------------------------------------------------
export const GLOBE_R = 3;
const home = PLACES.home;
const ORANGE = "#ff8a3d";
const CYAN = "#5ee1ff";

const SpaceLight: React.FC = () => (
  <>
    <directionalLight position={[-12, 6, 14]} intensity={2.6} color="#fff4e2" />
    <ambientLight intensity={0.35} color="#9fb4ff" />
  </>
);

const grow = (frame: number, at: number, len = 18) => easeInOut(progress(frame, [at, at + len]));

/** Ground arrows: the equator (on "equator"), home (on "Connecticut"). */
const spinArrows = (frame: number): GlobeArrow[] => {
  const eq = grow(frame, BEATS.equator);
  const ct = grow(frame, BEATS.connecticut);
  return [-110, -72.4, -35].map((lon) => ({ lat: 0, lon, scale: eq, color: "#ffd84d" })).concat(ct > 0 ? [{ lat: home[0], lon: home[1], scale: ct * Math.cos((home[0] * Math.PI) / 180), color: ORANGE }] : []);
};

export const spinAngle = (frame: number) => facing(-72.4) - 0.6 + 0.6 * easeInOut(progress(frame, [shotStart("spin"), BEATS.connecticut]));

const SpinShot: React.FC<{ frame: number }> = ({ frame }) => {
  const pins: GlobePin[] = [];
  if (frame >= BEATS.connecticut) pins.push({ lat: home[0], lon: home[1], color: ORANGE });
  if (frame >= BEATS.pole) pins.push({ lat: 90, lon: 0, color: CYAN, size: 0.04 });
  return (
    <>
      <SpaceLight />
      <Globe position={[0, 0, 0]} radius={GLOBE_R} spin={spinAngle(frame)} pins={pins} arrows={spinArrows(frame)} axis={grow(frame, BEATS.pole - 10, 20)} />
    </>
  );
};

/** Sun and orbit: Earth sweeps along its orbit; everything on it goes along. */
const OrbitShot: React.FC<{ frame: number }> = ({ frame }) => {
  const a = -0.35 + (frame - shotStart("orbit")) * 0.0016;
  const R = 13;
  const earth: P3 = [Math.cos(a) * R - 4, 0, Math.sin(a) * R - 8];
  return (
    <>
      <ambientLight intensity={0.3} color="#9fb4ff" />
      <pointLight position={[-4, 0, -8]} intensity={900} distance={80} decay={1.6} color="#fff1d6" />
      <mesh position={[-4, 0, -8]}>
        <sphereGeometry args={[3.2, 48, 32]} />
        <meshBasicMaterial color="#ffe08a" toneMapped={false} />
      </mesh>
      <mesh position={[-4, 0, -8]}>
        <sphereGeometry args={[4.6, 32, 24]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.25} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[-4, 0, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.03, 8, 160]} />
        <meshBasicMaterial color="#9fb4ff" transparent opacity={0.5} />
      </mesh>
      <Globe position={earth} radius={1.1} spin={facing(-72.4) + (frame - shotStart("orbit")) * 0.01} pins={[{ lat: home[0], lon: home[1], color: ORANGE, size: 0.06 }]} />
    </>
  );
};
export const orbitEarth = (frame: number): P3 => {
  const a = -0.35 + (frame - shotStart("orbit")) * 0.0016;
  return [Math.cos(a) * 13 - 4, 0, Math.sin(a) * 13 - 8];
};

/** Two places, two different ground velocities (home and London). */
const RuleShot: React.FC<{ frame: number }> = ({ frame }) => {
  const far = grow(frame, BEATS.far);
  const cos = (lat: number) => Math.cos((lat * Math.PI) / 180);
  const arrows: GlobeArrow[] = [{ lat: home[0], lon: home[1], scale: cos(home[0]), color: ORANGE }];
  if (far > 0) arrows.push({ lat: PLACES.london[0], lon: PLACES.london[1], scale: cos(PLACES.london[0]) * far, color: CYAN });
  return (
    <>
      <SpaceLight />
      <Globe
        position={[0, 0, 0]}
        radius={GLOBE_R}
        spin={facing(-36) + (frame - shotStart("rule")) * 0.0006}
        pins={([{ lat: home[0], lon: home[1], color: ORANGE }] as GlobePin[]).concat(far > 0 ? [{ lat: PLACES.london[0], lon: PLACES.london[1], color: CYAN }] : [])}
        arrows={arrows}
      />
    </>
  );
};

/** One big jump to the pole: the chord, and the pole pin going red on "ice". */
const PolePlanShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SpaceLight />
    <Globe
      position={[0, 0, 0]}
      radius={GLOBE_R}
      spin={facing(-72.4)}
      xray={grow(frame, BEATS.jumpThere - 10) * 0.55}
      pins={[
        { lat: home[0], lon: home[1], color: ORANGE },
        { lat: 89.5, lon: -72.4, color: frame >= BEATS.ice ? "#ff3b3b" : CYAN, size: frame >= BEATS.ice ? 0.06 : 0.04 },
      ]}
      arrows={[{ lat: home[0], lon: home[1], scale: grow(frame, BEATS.poleStill - 30) * Math.cos((home[0] * Math.PI) / 180), color: ORANGE }]}
      chord={{ from: [home[0], home[1]], to: [90, -72.4], progress: grow(frame, BEATS.jumpThere, 24), color: "#ff3b3b" }}
    />
  </>
);

// ---------------------------------------------------------------------------
// The party (and its payoff): Tess at the cake, guests, Kit and Grandpa.
// ---------------------------------------------------------------------------
const TESS_AT: P3 = [PARTY_X - 0.8, 0, TABLE_Z + 0.7];
const TESS_YAW = 1.9;
const CAKE_AT: P3 = [PARTY_X, TABLE_TOP + 0.03, TABLE_Z];
const KIT_PARTY: P3 = [PARTY_X - 3.0, 0, Z + 0.4];
const TEO_PARTY: P3 = [PARTY_X + 2.0, 0, Z + 0.2];

const Guests: React.FC<{ frame: number; cheer?: boolean }> = ({ frame, cheer }) => (
  <>
    <Person who="mom" pose={cheer ? "cheer" : "idle"} at={[PARTY_X - 0.6, 0, TABLE_Z - 0.9]} yaw={0.1} frame={frame} />
    <Person who="dad" pose={cheer ? "cheer" : "idle"} at={[PARTY_X + 1.2, 0, TABLE_Z - 1.0]} yaw={-0.3} frame={frame + 9} />
    <Person who="kid" pose={cheer ? "cheer" : "idle"} at={[PARTY_X + 0.3, 0, TABLE_Z - 0.8]} yaw={-0.1} frame={frame + 17} />
  </>
);

const PartyShot: React.FC<{ frame: number }> = ({ frame }) => {
  const grabbed = frame >= BEATS.grabs;
  const kitPose: AdventurerPose = frame >= BEATS.easy && frame < BEATS.grabs ? "point" : "idle";
  const kitExpr: Expression = frame >= BEATS.grabs ? "shock" : frame >= BEATS.easy ? "smug" : frame >= BEATS.ninety ? "dazed" : "happy";
  const teoAt: P3 = grabbed ? [KIT_PARTY[0] + 0.75, 0, KIT_PARTY[2] - 0.35] : TEO_PARTY;
  return (
    <>
      <BackyardSet frame={frame} party={1} />
      <Cake position={CAKE_AT} lit={0} frame={frame} />
      <Person who="sisterTess" pose={frame >= BEATS.snowball ? "cheer" : "idle"} at={TESS_AT} yaw={0.4} expression="happy" frame={frame} />
      <Guests frame={frame} />
      <Person who={KIT} pose={kitPose} at={KIT_PARTY} yaw={kitPose === "point" ? 0.2 : 0.35} expression={kitExpr} frame={frame} />
      <Person who={TEO} pose={grabbed && frame < BEATS.maps - 10 ? "point" : "idle"} at={teoAt} yaw={grabbed ? -1.2 : -0.5} expression={grabbed ? "angry" : "smug"} frame={frame} />
      {frame >= BEATS.maps - 10 ? <PaperMap position={[teoAt[0] - 0.25, 1.15, teoAt[2] + 0.35]} rotation={[0, -0.6, 0]} open={grow(frame, BEATS.maps - 10, 10)} /> : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// The ladder: one demo hop in the yard, then the piggyback hops north.
// ---------------------------------------------------------------------------
const WALK = 1.7 * MPH;
export const LADDER_X = 5;

const LadderShot: React.FC<{ frame: number }> = ({ frame }) => {
  const hopped = frame >= BEATS.land2 - 3;
  const kitX = hopped ? LADDER_X + 3 + Math.min(frame - BEATS.land2 + 3, 30) * WALK : LADDER_X;
  const mounted = frame >= BEATS.climbs;
  return (
    <>
      <BackyardSet frame={frame} />
      {mounted ? (
        <>
          <Piggyback carrier={KIT} rider={TEO} position={[kitX, 0, Z]} yaw={0.6} carrierExpression="focus" riderExpression="smug" frame={frame} />
          {frame >= BEATS.map ? <PaperMap position={[kitX - 0.05, 1.95, Z + 0.15]} rotation={[-0.3, 0.6, 0]} open={grow(frame, BEATS.map, 10)} /> : null}
        </>
      ) : (
        <>
          <Person who={KIT} pose={hopped && frame < BEATS.land2 + 24 ? "walk" : "idle"} at={[kitX, 0, Z]} yaw={hopped && frame < BEATS.land2 + 24 ? EAST : 0.4} expression={hopped ? "happy" : "focus"} frame={frame} />
          <Person who={TEO} pose="idle" at={[kitX - 1.2, 0, Z - 0.6]} yaw={0.6} expression="smug" frame={frame} weapon="cane" />
        </>
      )}
      <Blink frame={frame} at={BEATS.land2 - 3} position={[LADDER_X, 0, Z]} kind="out" seed={40} />
      <Blink frame={frame} at={BEATS.land2 - 3} position={[LADDER_X + 3, 0, Z]} kind="in" seed={41} />
    </>
  );
};

/** The piggyback pair arriving at walking pace on a hop: x from `at`, stepping for `steps` frames. */
const HopPair: React.FC<{ frame: number; at: number; x0?: number; steps?: number; snowball?: number; carrierExpression?: Expression; riderExpression?: Expression }> = ({
  frame,
  at,
  x0 = 0,
  steps = 26,
  snowball = 0,
  carrierExpression = "focus",
  riderExpression = "happy",
}) => {
  const t = Math.min(Math.max(0, frame - at), steps);
  const x = x0 + t * WALK * 2.2;
  const walking = frame >= at && frame < at + steps;
  return (
    <>
      {walking ? (
        <Tilted position={[x, 0, Z]} yaw={EAST - 0.5} pitch={0.08} pivot={hipHeight(KIT)}>
          <AdventurerUnit classType={KIT} pose="walk" expression={carrierExpression} animFrame={frame * 1.4} />
          <AdventurerUnit classType={TEO} pose="ride" weapon="none" expression={riderExpression} position={[0, hipHeight(KIT) + 0.2 - hipHeight(TEO), -0.34]} animFrame={frame} />
        </Tilted>
      ) : (
        <Piggyback carrier={KIT} rider={TEO} position={[x, 0, Z]} yaw={EAST - 0.5} carrierExpression={carrierExpression} riderExpression={riderExpression} frame={frame} />
      )}
      {snowball > 0 ? <Snowball position={[x + 0.25, 1.05, Z + 0.35]} r={snowball} /> : null}
      <Blink frame={frame} at={at} position={[x0, 0, Z]} kind="in" seed={at} />
    </>
  );
};

const CornShot: React.FC<{ frame: number; at: number; snowball?: number }> = ({ frame, at, snowball }) => (
  <>
    <Ground color="#9c7a4e" />
    <Cornfield />
    <HopPair frame={frame} at={at} snowball={snowball} />
  </>
);

const PastureShot: React.FC<{ frame: number; at: number; snowball?: number }> = ({ frame, at, snowball }) => (
  <>
    <Ground color="#8fbf62" />
    <YardFence position={[0, 0, Z - 3]} length={40} />
    <Cow position={[2.6, 0, Z - 1.6]} heading={-0.4} look={frame >= at + 10 ? -0.5 : 0} chew={frame} />
    <Cow position={[-4, 0, Z - 6]} heading={0.8} chew={frame + 20} />
    <Tree position={[-8, 0, Z - 9]} scale={1.3} seed={4} />
    <Tree position={[9, 0, Z - 11]} scale={1.5} seed={5} />
    <Barn position={[16, 0, -24]} rotationY={-0.4} />
    <HopPair frame={frame} at={at} snowball={snowball} />
  </>
);

/** The dock: arrive at the end, the fisherman jumps, then the maths and the bigger jump. */
const DOCK_ARRIVE = -1.2;
const DockShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <LakeDock frame={frame} startled={frame >= BEATS.dock + 4} />
    <Tree position={[-14, -0.55, -10]} scale={1.4} seed={6} />
    <HopPair frame={frame} at={BEATS.hop3} x0={DOCK_ARRIVE} steps={22} carrierExpression={frame >= BEATS.once ? "angry" : frame >= BEATS.math ? "scared" : "focus"} riderExpression={frame >= BEATS.bigger ? "shock" : "happy"} />
    <Blink frame={frame} at={BEATS.bigJump} position={[DOCK_ARRIVE + 22 * WALK * 2.2, 0, Z]} kind="out" seed={50} />
  </>
);

// ---------------------------------------------------------------------------
// The big hop: arriving in the hayfield at 27 mph.
// ---------------------------------------------------------------------------
const HayCrashShot: React.FC<{ frame: number }> = ({ frame }) => {
  const x = hayX(frame);
  const stopped = frame >= BEATS.bales;
  const flung = frame >= BEATS.soGrandpa;
  const fling = progress(frame, [BEATS.soGrandpa, BEATS.soGrandpa + 26]);
  const teoX = lerp(0.2, 4.2, fling);
  const teoY = Math.sin(Math.PI * fling) * 2.4;
  return (
    <>
      <Hayfield frame={frame} knock={BEATS.bales} hitX={0} />
      {!stopped ? (
        <group position={[0, 0.55, 0]}>
          <Tilted position={[x, -0.55, Z]} yaw={EAST} pitch={hayRoll(frame)} pivot={0.75}>
            <AdventurerUnit classType={KIT} pose="carry" expression="shock" animFrame={frame} />
            <AdventurerUnit classType={TEO} pose="ride" weapon="none" expression="shock" position={[0, hipHeight(KIT) + 0.2 - hipHeight(TEO), -0.34]} animFrame={frame} />
          </Tilted>
        </group>
      ) : (
        <>
          <Tilted position={[0.1, 0, Z]} yaw={EAST} pitch={-1.45} pivot={0.2}>
            <AdventurerUnit classType={KIT} pose="sprawl" expression="dazed" animFrame={frame} />
          </Tilted>
          {!flung ? (
            <Tilted position={[-0.6, 0.2, Z + 0.3]} yaw={EAST} pitch={-1.4} pivot={0.2}>
              <AdventurerUnit classType={TEO} pose="sprawl" weapon="none" expression="dazed" animFrame={frame} />
            </Tilted>
          ) : (
            <Tilted position={[teoX, teoY * (1 - fling) + (fling >= 1 ? 0 : 0.2), Z - 0.4]} yaw={EAST} pitch={fling >= 1 ? -1.45 : fling * 9} pivot={0.6}>
              <AdventurerUnit classType={TEO} pose={fling >= 1 ? "sprawl" : "fall"} weapon="none" expression={fling >= 1 ? "dazed" : "shock"} animFrame={frame} />
            </Tilted>
          )}
        </>
      )}
      <SpeedLines frame={frame} center={[x - 0.5, 0.9, Z]} speed={stopped ? 0 : Math.min(1, (x - HAY_ARRIVE_X < 30 ? 1 : 0.4))} />
      <Blink frame={frame} at={BEATS.bigJump} position={[HAY_ARRIVE_X, 0, Z]} kind="in" seed={60} />
      {dust(BEATS.bigJump + 3, [HAY_ARRIVE_X + 0.8, 0.1, Z], "hay-touch", 1.2)}
      <HayBurst frame={frame} at={BEATS.bales} position={[0.4, 0.8, Z]} />
      <HayBurst frame={frame} at={BEATS.soGrandpa + 26} position={[4.2, 0.3, Z - 0.4]} />
      {dust(BEATS.bales, [0.2, 0.2, Z], "hay-crash", 1.4)}
    </>
  );
};

// ---------------------------------------------------------------------------
// In the hay: Grandpa's keychain globe. Then taking his hand.
// ---------------------------------------------------------------------------
const POCKET_AT: P3 = [0.76, 1.13, Z + 0.12];
const pocketSpin = (frame: number) => (frame < BEATS.spinsIt ? facing(-72.4) : facing(-72.4) + (frame - BEATS.spinsIt) * 0.12 * Math.max(0, 1 - (frame - BEATS.spinsIt) / 120));

const HayTalkShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Hayfield frame={frame + 1000} knock={BEATS.bales} hitX={0} />
    <group position={[0, BALE_R, Z - 1.0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[BALE_R, BALE_R, 3.2, 24]} />
        <meshStandardMaterial color="#e2b85a" roughness={0.9} />
      </mesh>
    </group>
    <Tilted position={[-0.55, 0, Z + 0.7]} yaw={0.25} pitch={-0.8} pivot={0}>
      <AdventurerUnit classType={KIT} pose="idle" expression={frame >= BEATS.spinsIt ? "focus" : "dazed"} animFrame={frame} />
    </Tilted>
    <Tilted position={[0.55, 0, Z + 0.65]} yaw={-0.25} pitch={-0.75} pivot={0}>
      <AdventurerUnit classType={TEO} pose="point" weapon="none" expression={frame >= BEATS.pocketGlobe ? "smug" : "dazed"} animFrame={frame} />
    </Tilted>
    {frame >= BEATS.pocketGlobe - 6 ? <Globe position={POCKET_AT} radius={0.09} spin={pocketSpin(frame)} /> : null}
  </>
);

const HandJumpShot: React.FC<{ frame: number }> = ({ frame }) => {
  const gone = frame >= BEATS.axisJump;
  return (
    <>
      <Hayfield frame={frame + 1000} knock={BEATS.bales} hitX={0} />
      {!gone ? (
        <>
          <Person who={KIT} pose={frame >= BEATS.hand ? "point" : "idle"} at={[-0.35, 0, Z]} yaw={0.9} expression="focus" frame={frame} />
          <Person who={TEO} pose={frame >= BEATS.hand ? "point" : "idle"} at={[0.45, 0, Z]} yaw={-0.9} expression="smug" frame={frame} />
        </>
      ) : null}
      <Blink frame={frame} at={BEATS.axisJump} position={[0.05, 0, Z]} kind="out" seed={70} height={2.4} />
    </>
  );
};

// ---------------------------------------------------------------------------
// The axis diagram and the jump through the Earth.
// ---------------------------------------------------------------------------
const AXIS_FROM: [number, number] = [PLACES.vermont[0], PLACES.vermont[1]];
const AXIS_TO: [number, number] = [PLACES.queulat[0], PLACES.queulat[1]];

const AxisShot: React.FC<{ frame: number }> = ({ frame }) => {
  const k = grow(frame, BEATS.exactly - 4);
  const cos = Math.cos((44.45 * Math.PI) / 180);
  const pins: GlobePin[] = [{ lat: AXIS_FROM[0], lon: AXIS_FROM[1], color: ORANGE }];
  if (frame >= BEATS.through) pins.push({ lat: AXIS_TO[0], lon: AXIS_TO[1], color: CYAN });
  return (
    <>
      <SpaceLight />
      <Globe
        position={[0, 0, 0]}
        radius={GLOBE_R}
        spin={facing(-72.4) + 0.35 + (frame - shotStart("axis")) * 0.0008}
        axis={grow(frame, BEATS.axis - 6, 20)}
        xray={grow(frame, BEATS.parallel - 6) * 0.6}
        pins={pins}
        chord={{ from: AXIS_FROM, to: AXIS_TO, progress: grow(frame, BEATS.parallel, BEATS.through + 8 - BEATS.parallel) }}
        arrows={
          k > 0
            ? [
                { lat: AXIS_FROM[0], lon: AXIS_FROM[1], scale: cos * k, color: ORANGE },
                { lat: AXIS_TO[0], lon: AXIS_TO[1], scale: cos * k, color: CYAN },
              ]
            : []
        }
      />
    </>
  );
};

const ChordShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SpaceLight />
    <Globe
      position={[0, 0, 0]}
      radius={GLOBE_R}
      spin={facing(-72.4) + 0.35}
      axis={1}
      xray={0.6}
      pins={[
        { lat: AXIS_FROM[0], lon: AXIS_FROM[1], color: ORANGE },
        { lat: AXIS_TO[0], lon: AXIS_TO[1], color: CYAN },
      ]}
      chord={{ from: AXIS_FROM, to: AXIS_TO, progress: grow(frame, BEATS.axisJump + 2, BEATS.throughEarth - BEATS.axisJump) }}
    />
  </>
);

// ---------------------------------------------------------------------------
// Patagonia: snow, the hanging glacier, and the biggest snowball.
// ---------------------------------------------------------------------------
export const snowballR = (frame: number) => {
  if (frame < BEATS.pack) return 0;
  return lerp(0.08, 0.3, easeInOut(progress(frame, [BEATS.pack, BEATS.biggest + 10])));
};

const PatagoniaShot: React.FC<{ frame: number }> = ({ frame }) => {
  const arrived = frame >= BEATS.step - 3;
  const shiver = frame >= BEATS.colder ? Math.sin(frame * 2.1) * 0.015 : 0;
  const packing = frame >= BEATS.pack && frame < BEATS.biggest;
  const r = snowballR(frame);
  const kitAt: P3 = [-0.45 + shiver, 0, Z];
  return (
    <>
      <PatagoniaSet frame={frame} />
      {arrived ? (
        <>
          <Person
            who={KIT}
            pose={packing ? "cower" : frame >= BEATS.biggest ? "cheer" : "idle"}
            at={kitAt}
            yaw={frame >= BEATS.glacier && frame < BEATS.sunSpot ? Math.PI + 0.3 : 0.35}
            expression={frame >= BEATS.biggest ? "happy" : frame >= BEATS.colder ? "scared" : frame >= BEATS.glacier ? "shock" : "happy"}
            frame={frame}
          />
          <Person who={TEO} pose="idle" at={[0.6, 0, Z - 0.3]} yaw={frame >= BEATS.jacket ? 0.1 : -0.4} expression={frame >= BEATS.jacket ? "smug" : "happy"} frame={frame} />
        </>
      ) : null}
      {r > 0 ? <Snowball position={packing ? [kitAt[0] + 0.05, 0.62, Z + 0.4] : [kitAt[0], 2.05 + r * 0.6, Z + 0.1]} r={r} /> : null}
      <Blink frame={frame} at={BEATS.step - 3} position={[0.05, 0, Z]} kind="in" color="#bff3ff" height={2.4} seed={80} />
      {dust(BEATS.step, [-0.45, 0.05, Z], "snow-step", 0.6)}
    </>
  );
};

// ---------------------------------------------------------------------------
// Back to the hayfield, the hops home, and the party edge.
// ---------------------------------------------------------------------------
/** Snowball radius on the way home: it shrinks as it drips. */
export const homeSnowball = (frame: number) => lerp(0.3, 0.18, progress(frame, [BEATS.stepBack, BEATS.walking]));

const HayReturnShot: React.FC<{ frame: number }> = ({ frame }) => {
  const r = homeSnowball(frame);
  const gone = frame >= BEATS.hopSouth;
  return (
    <>
      <Hayfield frame={frame + 1000} knock={BEATS.bales} hitX={0} />
      {frame >= BEATS.stepBack - 2 && !gone ? (
        <>
          <Person who={KIT} pose="carry" at={[-0.4, 0, Z]} yaw={0.4} expression="happy" frame={frame} />
          <Snowball position={[-0.2, 1.0, Z + 0.4]} r={r} />
          <Person who={TEO} pose="idle" at={[0.6, 0, Z - 0.3]} yaw={-0.3} expression={frame >= BEATS.eleven ? "focus" : "smug"} frame={frame} />
        </>
      ) : null}
      <Blink frame={frame} at={BEATS.stepBack - 2} position={[0.1, 0, Z]} kind="in" seed={90} height={2.4} />
      <Blink frame={frame} at={BEATS.hopSouth} position={[0.1, 0, Z]} kind="out" seed={91} height={2.4} />
    </>
  );
};

const BarnsShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Ground color="#9cc46a" />
    <Barn position={[3, 0, Z - 6]} rotationY={-0.2} />
    <YardFence position={[0, 0, Z - 2.4]} length={30} />
    <Tree position={[-6, 0, Z - 7]} scale={1.3} seed={7} />
    <HopPair frame={frame} at={BEATS.barns - 4} snowball={homeSnowball(frame)} carrierExpression="focus" />
  </>
);

const RiversShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Ground color="#8fbf62" />
    <River z={Z - 3} width={3.4} />
    <Tree position={[-5, 0, Z - 8]} scale={1.4} seed={8} />
    <Tree position={[6, 0, Z - 9]} scale={1.2} seed={9} />
    <HopPair frame={frame} at={BEATS.rivers - 4} snowball={homeSnowball(frame)} carrierExpression="focus" />
  </>
);

const BackyardsShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Lawn color="#8cbc5e" />
    <House position={[-3, 0, Z - 7]} color="#e7a77a" glow={0} seed={6} />
    <House position={[6, 0, Z - 8]} rotationY={-0.2} color="#d9c3e0" glow={0} seed={7} />
    <YardFence position={[0, 0, Z - 2.5]} length={30} />
    <HopPair frame={frame} at={BEATS.backyards - 4} snowball={homeSnowball(frame)} carrierExpression={frame >= BEATS.drips ? "scared" : "focus"} />
    {frame >= BEATS.drips - 10 ? <Drips frame={frame} position={[26 * WALK * 2.2 + 0.25, 1.0, Z + 0.35]} /> : null}
  </>
);

const ArriveShot: React.FC<{ frame: number }> = ({ frame }) => {
  const t = Math.max(0, frame - BEATS.lastHop);
  const x = KIT_PARTY[0] - 4 + Math.min(t, 50) * WALK * 2.2;
  const walking = t < 50;
  return (
    <>
      <BackyardSet frame={frame} party={1} />
      <Cake position={CAKE_AT} lit={1} frame={frame} />
      <Person who="sisterTess" pose="idle" at={TESS_AT} yaw={0.4} expression="neutral" frame={frame} />
      <Guests frame={frame} />
      <Person who={KIT} pose={walking ? "walk" : "carry"} at={[x, 0, KIT_PARTY[2]]} yaw={walking ? EAST : 0.35} expression="happy" frame={frame} />
      <Snowball position={[x + 0.2, 1.0, KIT_PARTY[2] + 0.4]} r={homeSnowball(frame)} />
      <Person who={TEO} pose={walking ? "walk" : "idle"} at={[x - 1.0, 0, KIT_PARTY[2] - 0.6]} yaw={walking ? EAST : 0.2} expression="smug" frame={frame + 7} />
      <Blink frame={frame} at={BEATS.lastHop} position={[KIT_PARTY[0] - 4.4, 0, KIT_PARTY[2] - 0.3]} kind="in" seed={100} height={2.4} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Payoff: the candles, the snowball, the face.
// ---------------------------------------------------------------------------
const KIT_GIVE: P3 = [PARTY_X - 1.9, 0, Z - 0.3];
const tessHand = (): P3 => [TESS_AT[0] - 0.15, 0.95, TESS_AT[2] + 0.2];
export const snowballFlight = (frame: number): P3 => {
  const t = progress(frame, [BEATS.hits - 6, BEATS.face]);
  const a = tessHand();
  const b: P3 = [KIT_GIVE[0], 1.45, KIT_GIVE[2] + 0.2];
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + Math.sin(Math.PI * t) * 0.5, lerp(a[2], b[2], t)];
};

const PayoffShot: React.FC<{ frame: number }> = ({ frame }) => {
  const blow = progress(frame, [BEATS.blows, BEATS.blows + 14]);
  const lit = 1 - blow;
  const r = 0.17;
  const given = frame >= BEATS.grabsIt;
  const thrown = frame >= BEATS.hits - 6;
  const hit = frame >= BEATS.face;
  const ballAt: P3 = !given ? [KIT_GIVE[0] + 0.35, 1.08, KIT_GIVE[2] + 0.35] : !thrown ? tessHand() : snowballFlight(frame);
  return (
    <>
      <BackyardSet frame={frame} party={1} />
      <Cake position={CAKE_AT} lit={lit} blow={blow} frame={frame} />
      <Person
        who="sisterTess"
        pose={thrown && !hit ? "windup" : hit ? "cheer" : frame >= BEATS.breath && frame < BEATS.blows + 14 ? "cower" : "idle"}
        at={TESS_AT}
        yaw={given ? -0.9 : TESS_YAW}
        expression={hit ? "happy" : frame >= BEATS.grabsIt ? "smug" : frame >= BEATS.holdOut ? "shock" : "focus"}
        frame={frame}
      />
      <Guests frame={frame} cheer={frame >= BEATS.blows + 10} />
      <Person who={KIT} pose={hit ? "fall" : frame >= BEATS.holdOut && !given ? "carry" : "idle"} at={KIT_GIVE} yaw={0.9} expression={hit ? "shock" : "happy"} frame={frame} />
      {hit ? <Snowball position={[KIT_GIVE[0] + 0.12, 1.42, KIT_GIVE[2] + 0.22]} r={0.2} /> : <Snowball position={ballAt} r={r} />}
      <Person who={TEO} pose={hit ? "cheer" : "idle"} at={[PARTY_X + 2.4, 0, Z + 0.1]} yaw={-0.6} expression={hit ? "happy" : "smug"} frame={frame} />
      {jellySplash(BEATS.face, [KIT_GIVE[0] + 0.1, 1.45, KIT_GIVE[2] + 0.25], "snow-splat", "#ffffff")}
    </>
  );
};

// ---------------------------------------------------------------------------
// Night on the porch steps, and the launch idea.
// ---------------------------------------------------------------------------
const NIGHT_GLOBE: P3 = [HOUSE_X - 0.9, 0.95, Z + 2.25];
export const nightSpin = (frame: number) => {
  const t = progress(frame, [BEATS.spinsAgain, BEATS.stops]);
  return facing(-50) + Math.PI * 4 * (1 - (1 - t) * (1 - t));
};

const NightShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <BackyardSet frame={frame} />
    <Moon position={[-60, 120, -300]} size={12} />
    <pointLight position={[HOUSE_X - 1.2, 2.6, Z + 1.6]} intensity={30} color="#ffd9a8" distance={14} decay={1.5} />
    <pointLight position={[HOUSE_X - 1.0, 1.8, Z + 4.5]} intensity={22} color="#ffe2c0" distance={10} decay={1.5} />
    <Person who={TEO} pose="ride" at={[HOUSE_X - 1.2, sitY(TEO, PORCH_TOP * 0.66), Z + 1.55]} yaw={0.2} expression="smug" frame={frame} />
    <Person who={KIT} pose="ride" at={[HOUSE_X - 2.1, sitY(KIT, PORCH_TOP * 0.66), Z + 1.6]} yaw={0.4} expression="happy" frame={frame} />
    <Globe position={NIGHT_GLOBE} radius={0.09} spin={nightSpin(frame)} />
  </>
);

const LaunchGlobeShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <SpaceLight />
    <Globe
      position={[0, 0, 0]}
      radius={GLOBE_R}
      spin={facing(-40) + (frame - shotStart("launchGlobe")) * 0.001}
      xray={grow(frame, BEATS.arrive - 40) * 0.55}
      pins={[
        { lat: 0, lon: -40, color: "#ffd84d" },
        { lat: 89.5, lon: -40, color: CYAN, size: 0.04 },
      ]}
      arrows={[{ lat: 0, lon: -40, scale: grow(frame, shotStart("launchGlobe") + 4), color: "#ffd84d" }]}
      chord={{ from: [0, -40], to: [90, -40], progress: grow(frame, BEATS.arrive - 30, 30), color: "#ffd84d" }}
    />
  </>
);

// ---------------------------------------------------------------------------
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const shot = shotAt(frame);
  const space = shot === "spin" || shot === "orbit" || shot === "rule" || shot === "polePlan" || shot === "axis" || shot === "chord" || shot === "launchGlobe";
  const tod = space ? 2 : shot === "night" ? 2 : shot === "patagonia" ? 0.25 : 0.15;
  return (
    <>
      <SkyRig tod={tod} azimuth={shot === "patagonia" ? 2.5 : -0.5} fogNear={space ? 400 : 60} fogFar={space ? 3000 : 600} />
      {shot === "yard" ? <YardShot frame={frame} /> : null}
      {shot === "porch" ? <PorchShot frame={frame} /> : null}
      {shot === "spin" ? <SpinShot frame={frame} /> : null}
      {shot === "still" ? (
        <>
          <BackyardSet frame={frame} />
          <Person who={KIT} pose="idle" at={[HEDGE_X - 4, 0, Z + 0.3]} yaw={0.2} expression="dazed" frame={frame} />
          <Person who={TEO} pose="idle" at={[HEDGE_X - 2.8, 0, Z - 0.6]} yaw={-0.3} expression="smug" frame={frame} />
        </>
      ) : null}
      {shot === "orbit" ? <OrbitShot frame={frame} /> : null}
      {shot === "rule" ? <RuleShot frame={frame} /> : null}
      {shot === "party" ? <PartyShot frame={frame} /> : null}
      {shot === "polePlan" ? <PolePlanShot frame={frame} /> : null}
      {shot === "ladder" ? <LadderShot frame={frame} /> : null}
      {shot === "corn" ? <CornShot frame={frame} at={BEATS.hop1} /> : null}
      {shot === "pasture" ? <PastureShot frame={frame} at={BEATS.hop2} /> : null}
      {shot === "dock" ? <DockShot frame={frame} /> : null}
      {shot === "hayCrash" ? <HayCrashShot frame={frame} /> : null}
      {shot === "hayTalk" ? <HayTalkShot frame={frame} /> : null}
      {shot === "axis" ? <AxisShot frame={frame} /> : null}
      {shot === "handJump" ? <HandJumpShot frame={frame} /> : null}
      {shot === "chord" ? <ChordShot frame={frame} /> : null}
      {shot === "patagonia" ? <PatagoniaShot frame={frame} /> : null}
      {shot === "hayReturn" ? <HayReturnShot frame={frame} /> : null}
      {shot === "barns" ? <BarnsShot frame={frame} /> : null}
      {shot === "rivers" ? <RiversShot frame={frame} /> : null}
      {shot === "backyards" ? <BackyardsShot frame={frame} /> : null}
      {shot === "corn2" ? <CornShot frame={frame} at={BEATS.twoMin - 4} snowball={homeSnowball(frame)} /> : null}
      {shot === "pasture2" ? <PastureShot frame={frame} at={BEATS.oneMin - 4} snowball={homeSnowball(frame)} /> : null}
      {shot === "arrive" ? <ArriveShot frame={frame} /> : null}
      {shot === "payoff" ? <PayoffShot frame={frame} /> : null}
      {shot === "night" ? <NightShot frame={frame} /> : null}
      {shot === "launchGlobe" ? <LaunchGlobeShot frame={frame} /> : null}
    </>
  );
};

/** Geometry the camera needs. */
export const SHOT_GEOMETRY = { KIT_PARTY, TEO_PARTY, TESS_AT, KIT_GIVE, POCKET_AT, NIGHT_GLOBE, DOCK_ARRIVE, WALK, BALE_R, shotEnd };
