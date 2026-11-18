import type React from "react";
import { useCurrentFrame } from "remotion";
import { hipHeight, type AdventurerClass, type AdventurerPose, type Expression, type Weapon } from "../../artifacts/characters/hero";
import { GlowSprite } from "../../artifacts/dungeon/Fx";
import {
  BOARD_H,
  CAR_SEAT_Y,
  CURB_H,
  CURB_X,
  CandyBar,
  Car,
  GranolaBar,
  HillStreet,
  KICK_H,
  KICK_L,
  Kicker,
  LunchTray,
  Pancakes,
  Pie,
  PieSlice,
  PotatoBowl,
  QP_R,
  QuarterPipe,
  Rabbit,
  Receipt,
  SLOPE,
  Skateboard,
  SkateparkSet,
  Turkey,
  TurkeyLeg,
  Wagon,
  hillY,
} from "../../artifacts/heal";
import { BED_TOP, Bed, Blueprint, Bowl, BreakfastTable, CHAIR_SEAT, CerealBox, Chair, Desk, KitchenCounter, Room, TABLE_TOP, WallClock, Window } from "../../artifacts/reflexes";
import { SkyRig } from "../../artifacts/sky";
import { HouseBack, Lawn, SpeedLines, Tree } from "../../artifacts/teleport";
import { ActorView, CHAR_SCALE, FACE_LEFT, FACE_RIGHT, dust, easeOutCubic, type Actor, type ActorTrack } from "../../kit";
import {
  BEATS,
  GRAB_X,
  KICK_X,
  KIT0,
  KIT_STOP,
  LAND_X,
  LIP,
  QP_X,
  SKATE,
  WAGON_STOP,
  Z,
  boardAt,
  flightAt,
  healGlow,
  keyed,
  kitHillX,
  lerp,
  progress,
  shotAt,
  shotStart,
  tessHillX,
  wagonSpeed,
  wagonX,
} from "./timeline";

type P3 = [number, number, number];
const KIT: AdventurerClass = "flyKit";
const TEO: AdventurerClass = "grandpaTeo";
const TESS: AdventurerClass = "sisterTess";
const MARCUS: AdventurerClass = "neighborF";
const FRIEND: AdventurerClass = "kid";
const DOCTOR: AdventurerClass = "neighborA";

/** The what-if cast plays at class scale 1 (ActorView multiplies by CHAR_SCALE). */
const UNIT = 1 / CHAR_SCALE;
const act = (pose: AdventurerPose, at: P3, yaw: number, expression?: Expression, more: Partial<Actor> = {}): Actor => ({ pose, position: at, yaw, expression, scale: UNIT, ...more });
const marcusAct = (pose: AdventurerPose, at: P3, yaw: number, expression?: Expression, more: Partial<Actor> = {}): Actor => act(pose, at, yaw, expression, { scale: UNIT * 1.15, ...more });

const Cast: React.FC<{ who: AdventurerClass; track: ActorTrack; frame: number; weapon?: Weapon }> = ({ who, track, frame, weapon = "none" }) => (
  <ActorView classType={who} actor={track} frame={frame} weapon={weapon} />
);

/** Seated feet height so the hips rest on a surface at `top`. */
const sitY = (who: AdventurerClass, top: number, scale = 1) => top + 0.1 - hipHeight(who) * scale;
const KIT_HIP = hipHeight(KIT);
/** Lying flat on a surface at `floorY`, hips at x; head toward -x when `headLeft` (on the back) or face down (`front`). */
const lie = (x: number, z: number, floorY: number, expression: Expression, front = false, headLeft = true): Actor => ({
  ...act("sprawl", [x, floorY + 0.2 * 0.9 - KIT_HIP, z], headLeft ? FACE_RIGHT : FACE_LEFT, expression),
  tilt: ((front ? -1 : 1) * (headLeft ? 1 : -1) * Math.PI) / 2,
  pivot: KIT_HIP,
});

/** The healing glow: a warm sprite on Kit's chest, sized by healGlow(). */
const HealGlow: React.FC<{ frame: number; at: P3; size?: number }> = ({ frame, at, size = 1.6 }) => {
  const g = healGlow(frame);
  if (g <= 0.02) return null;
  const flicker = 0.85 + 0.15 * Math.sin(frame * 0.5);
  return <GlowSprite position={at} color="#ff8a4a" size={size * (0.6 + 0.4 * g)} opacity={0.7 * g * flicker} />;
};

/** Sweat drops sliding off Kit's head while he runs hot. */
const Sweat: React.FC<{ frame: number; head: P3; amount: number }> = ({ frame, head, amount }) => {
  if (amount <= 0.05) return null;
  return (
    <>
      {[0, 1, 2].map((i) => {
        const t = ((frame + i * 13) % 40) / 40;
        return (
          <mesh key={i} position={[head[0] + (i - 1) * 0.12, head[1] + 0.1 - t * 0.5, head[2] + 0.2]} scale={amount}>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshStandardMaterial color="#a9e8ff" roughness={0.2} />
          </mesh>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// The kitchen: breakfast table along x, Tess behind it, Kit on the left end.
// ---------------------------------------------------------------------------
export const TZ = Z - 0.6;
const KIT_CHAIR: P3 = [-1.3, 0, TZ];
const TESS_AT: P3 = [0.35, 0, TZ - 0.72];
const KIT_SEAT: P3 = [KIT_CHAIR[0] - 0.05, sitY(KIT, CHAIR_SEAT), TZ];
const KIT_HEAD_SEATED: P3 = [KIT_CHAIR[0], 1.15, TZ];

const KitchenSet: React.FC<{ night?: boolean; minutes?: number; hours?: number }> = ({ night = false, minutes = 5, hours = 7 }) => (
  <>
    <Room position={[0, 0, Z - 1.4]} width={14} depth={9} tiles floor="#e9dcc4" floorLine="#cdbb9c" wall={night ? "#c9b48e" : "#f6e2b8"} />
    <KitchenCounter position={[-2.6, 0, Z - 5.5]} length={3.6} />
    <Window position={[2.4, 1.75, Z - 5.78]} w={1.8} h={1.2} night={night} />
    <BreakfastTable position={[0, 0, TZ]} />
    <Chair position={KIT_CHAIR} yaw={FACE_RIGHT} />
    <Chair position={[1.3, 0, TZ]} yaw={FACE_LEFT} />
    <WallClock position={[-0.4, 2.3, Z - 5.75]} minutes={minutes} hours={hours} />
  </>
);

/** Empty bowls Kit has finished, stacked by his elbow. */
const bowlsEaten = (f: number) => (f >= BEATS.third + 8 ? 3 : f >= BEATS.second + 8 ? 2 : f >= BEATS.firstBowl + 8 ? 1 : 0);
const breakfastKit: ActorTrack = (f) => {
  if (f >= BEATS.slice && f < BEATS.slice + 16) return act("point", [KIT_SEAT[0], KIT_SEAT[1], KIT_SEAT[2]], FACE_RIGHT, "pain", { blend: 3 });
  const expression: Expression = f >= BEATS.hungryAgain ? "dazed" : f >= BEATS.eat ? "happy" : f >= BEATS.slice ? "focus" : "happy";
  return act("ride", KIT_SEAT, FACE_RIGHT, expression, { speed: f >= BEATS.eat && f < BEATS.stares ? 2.2 : 1 });
};
const breakfastTess: ActorTrack = (f) => act("idle", TESS_AT, f >= BEATS.stares ? -0.5 : -0.15, f >= BEATS.stares ? "shock" : "happy", { blend: 8 });
/** The clock jumps forty minutes between the cut and the bus. */
const breakfastMinutes = (f: number) => keyed([[BEATS.slice, 5], [BEATS.bus, 45]], f);

const KitchenShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <KitchenSet minutes={breakfastMinutes(frame)} />
    <CerealBox position={[-0.55, TABLE_TOP, TZ - 0.2]} yaw={0.3} />
    <Bowl position={[-0.85, TABLE_TOP, TZ + 0.05]} color="#f27a2e" />
    <Bowl position={[0.45, TABLE_TOP, TZ - 0.2]} />
    {Array.from({ length: bowlsEaten(frame) }, (_, i) => (
      <Bowl key={i} position={[-0.95, TABLE_TOP + i * 0.06, TZ - 0.3]} color="#5ea8d8" />
    ))}
    <Cast who={KIT} track={breakfastKit} frame={frame} />
    <Cast who={TESS} track={breakfastTess} frame={frame} />
    <HealGlow frame={frame} at={[KIT_HEAD_SEATED[0] + 0.2, 0.9, TZ + 0.2]} size={0.8} />
  </>
);

// ---------------------------------------------------------------------------
// The explainer stage: Kit on the blueprint; the HUD draws the bill beside him.
// ---------------------------------------------------------------------------
const BodyShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Blueprint />
    <Cast
      who={KIT}
      track={(f) => {
        const expression: Expression = f >= BEATS.muscle ? "scared" : f >= BEATS.fat ? "shock" : f >= BEATS.atOnce ? "shock" : f >= BEATS.building ? "focus" : "neutral";
        const pointing = (f >= BEATS.bricks && f < BEATS.spread) || (f >= BEATS.billOnce && f < BEATS.foodSlow);
        // Paying from his savings: he gets a little thinner on "fat" and "muscle".
        const thin = 1 - 0.05 * progress(f, [BEATS.fat, BEATS.fat + 20]) - 0.04 * progress(f, [BEATS.muscle, BEATS.muscle + 20]);
        return act(pointing ? "point" : "idle", [0, 0, Z], 0.25, expression, { blend: 10, squashX: thin });
      }}
      frame={frame}
    />
  </>
);

// ---------------------------------------------------------------------------
// Always hungry: the scraped knee, the lunches, the snacks, the radiator.
// ---------------------------------------------------------------------------
const TRIP_X = 0;
const scrapeKit: ActorTrack = (f) => {
  const trip = BEATS.knee - 12;
  if (f < trip) return act("run", [TRIP_X - (trip - f) * 0.12, 0, Z], FACE_RIGHT, "happy", { speed: 1.8 });
  if (f < trip + 12) {
    const t = progress(f, [trip, trip + 12]);
    return { ...act("fall", [TRIP_X + 0.5 * t, 0.15 * Math.sin(Math.PI * t), Z], FACE_RIGHT, "shock", { blend: 3 }), tilt: -0.5 * t, pivot: KIT_HIP };
  }
  const expression: Expression = f >= BEATS.candy ? "happy" : f >= BEATS.threeHours ? "focus" : "pain";
  return act("cower", [TRIP_X + 0.5, 0, Z], 0.35, expression, { blend: 6 });
};
const ScrapeShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Lawn />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, Z]} receiveShadow>
      <planeGeometry args={[40, 1.6]} />
      <meshStandardMaterial color="#cfc8bc" roughness={0.95} />
    </mesh>
    <HouseBack position={[2, 0, Z - 4]} width={12} />
    <Tree position={[-5, 0, Z - 3]} scale={1.3} seed={3} />
    <Cast who={KIT} track={scrapeKit} frame={frame} />
    {frame >= BEATS.candy - 4 ? (
      <group position={[TRIP_X + 0.68, 0.78, Z + 0.32]} scale={1.8} rotation={[0.6, 0.4, 0]}>
        <CandyBar position={[0, 0, 0]} bitten={progress(frame, [BEATS.candy + 6, BEATS.candy + 40])} />
      </group>
    ) : null}
    {dust(BEATS.knee - 2, [TRIP_X + 0.5, 0, Z], "trip", 0.6)}
    <HealGlow frame={frame} at={[TRIP_X + 0.6, 0.35, Z + 0.3]} size={0.7} />
  </>
);

/** The cafeteria: Kit and a friend side by side; the friend's tray slides over on "friend's". */
const LUNCH_TABLE_Z = Z - 0.4;
const LunchShot: React.FC<{ frame: number }> = ({ frame }) => {
  const swap = easeOutCubic(progress(frame, [BEATS.friends - 4, BEATS.friends + 10]));
  return (
    <>
      <Room position={[0, 0, Z - 1.5]} width={14} depth={9} wall="#d8e6f0" floor="#c7c2b6" floorLine="#b3ad9f" tiles />
      <BreakfastTable position={[0, 0, LUNCH_TABLE_Z]} width={2.6} depth={0.8} />
      {[-0.45, 0.45].map((x) => (
        <Chair key={x} position={[x, 0, LUNCH_TABLE_Z - 0.62]} color="#4f7dc4" />
      ))}
      <LunchTray position={[-0.45, TABLE_TOP, LUNCH_TABLE_Z]} empty={frame >= BEATS.lunch} />
      <LunchTray position={[lerp(0.45, -0.3, swap), TABLE_TOP + 0.02 * swap, LUNCH_TABLE_Z + 0.12 * swap]} empty={frame >= BEATS.friends + 24} />
      <Cast who={KIT} track={(f) => act("ride", [-0.45, sitY(KIT, CHAIR_SEAT), LUNCH_TABLE_Z - 0.62], 0, f >= BEATS.friends + 24 ? "happy" : f >= BEATS.lunch ? "focus" : "neutral", { speed: 2 })} frame={frame} />
      <Cast who={FRIEND} track={(f) => act("ride", [0.45, sitY(FRIEND, CHAIR_SEAT), LUNCH_TABLE_Z - 0.62], f >= BEATS.friends ? -0.5 : 0, f >= BEATS.friends ? "shock" : "happy")} frame={frame} />
      <HealGlow frame={frame} at={[-0.45, 0.9, LUNCH_TABLE_Z + 0.1]} size={0.7} />
    </>
  );
};

/** The pantry raid: Kit pockets granola bars; Grandpa unrolls the grocery bill. */
const POCKET: P3 = [-0.2, 0, Z + 0.4];
const TEO_PANTRY: P3 = [1.3, 0, Z + 0.2];
const PantryShot: React.FC<{ frame: number }> = ({ frame }) => {
  const bars = Math.floor(progress(frame, [BEATS.snacks, BEATS.peanut]) * 8);
  const receipt = progress(frame, [BEATS.grandpaBill - 6, BEATS.horse - 10]);
  return (
    <>
      <KitchenSet minutes={10} />
      {Array.from({ length: 8 - bars }, (_, i) => (
        <GranolaBar key={i} position={[0.25 + (i % 4) * 0.2, TABLE_TOP + Math.floor(i / 4) * 0.04, TZ + 0.2 - Math.floor(i / 4) * 0.12]} yaw={i * 0.4} />
      ))}
      <Cast
        who={KIT}
        track={(f) => {
          const stuffing = f >= BEATS.snacks && f < BEATS.grandpaBill && Math.floor((f - BEATS.snacks) / 10) % 2 === 0;
          const expression: Expression = f >= BEATS.horse ? "happy" : f >= BEATS.grandpaBill ? "shock" : "focus";
          return act(stuffing ? "point" : "idle", POCKET, f >= BEATS.grandpaBill ? 0.7 : 0.2, expression, { blend: 4 });
        }}
        frame={frame}
      />
      {frame >= shotStart("pantry") + 10 && frame >= BEATS.grandpaBill - 30 ? (
        <>
          <Cast who={TEO} track={(f) => act(f >= BEATS.horse ? "point" : "idle", TEO_PANTRY, -0.7, f >= BEATS.horse ? "angry" : "shock", { blend: 8 })} frame={frame} />
          <Receipt position={[TEO_PANTRY[0] - 0.3, 1.0, TEO_PANTRY[2] + 0.4]} length={0.05 + 0.9 * receipt} />
        </>
      ) : null}
    </>
  );
};

/** Class after the bike fall: Kit glowing like a radiator, sweating through his shirt. */
const DESKS: [number, number][] = [
  [-2.4, -1.6],
  [0, -1.6],
  [2.4, -1.6],
  [-2.4, 0.2],
  [2.4, 0.2],
];
const CLASSMATES: AdventurerClass[] = ["kid", "neighborB", "neighborC", "neighborD", "neighborE"];
const KIT_DESK: P3 = [0, 0, Z + 0.2];
const deskSeat = (at: P3): P3 => [at[0], 0, at[2] - 0.42];
const RadiatorShot: React.FC<{ frame: number }> = ({ frame }) => {
  const seat = deskSeat(KIT_DESK);
  const hot = progress(frame, [BEATS.radiator - 20, BEATS.sweating]);
  return (
    <>
      <Room position={[0, 0, Z - 1.5]} width={14} depth={9} wall="#cfe0d0" floor="#b9a17e" floorLine="#a48c6a" />
      {DESKS.concat([[KIT_DESK[0], KIT_DESK[2]]]).map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
          <Desk position={[0, 0, 0]} />
        </group>
      ))}
      {DESKS.map(([x, z], i) => {
        const s = deskSeat([x, 0, z]);
        return (
          <Cast
            key={i}
            who={CLASSMATES[i]}
            track={(f) => act("ride", [s[0], sitY(CLASSMATES[i], CHAIR_SEAT, 0.8), s[2]], f >= BEATS.radiator ? Math.sign(-x || 1) * 0.5 : 0, f >= BEATS.radiator ? "shock" : "neutral", { scale: UNIT * 0.8, blend: 12 })}
            frame={frame}
          />
        );
      })}
      <Cast who={KIT} track={(f) => act("ride", [seat[0], sitY(KIT, CHAIR_SEAT), seat[2]], 0, f >= BEATS.radiator ? "dazed" : f >= BEATS.warm ? "focus" : "neutral")} frame={frame} />
      <HealGlow frame={frame} at={[seat[0], 0.95, seat[2] + 0.2]} size={1.5} />
      <Sweat frame={frame} head={[seat[0], 1.25, seat[2]]} amount={hot} />
    </>
  );
};

// ---------------------------------------------------------------------------
// The skate park: the drop-in, the kicker, the lip, the arm.
// ---------------------------------------------------------------------------
const MARCUS_AT: P3 = [-1.4, 0, Z + 0.9];
const skateKit: ActorTrack = (f) => {
  if (f < SKATE.lip) {
    const b = boardAt(f);
    // Feet on the board, body square to the surface (a forward tilt is negative facing +x).
    const feet: P3 = [b.x - Math.sin(b.angle) * BOARD_H, b.y + Math.cos(b.angle) * BOARD_H, Z];
    const riding = f >= SKATE.drop;
    const expression: Expression = f >= BEATS.dropIn ? "focus" : f >= BEATS.worst ? "smug" : "happy";
    return { ...act(riding ? "cower" : "idle", feet, FACE_RIGHT, expression, { blend: riding ? 4 : 6 }), tilt: b.angle, pivot: 0 };
  }
  if (f < SKATE.land) {
    const fl = flightAt(f);
    return { ...act("launch", [fl.hip[0], fl.hip[1] - KIT_HIP, Z], FACE_RIGHT, "scared", { blend: 3 }), tilt: fl.tilt, pivot: KIT_HIP };
  }
  return lie(LAND_X + 0.35, Z, 0, "pain", false, false);
};
/** The board after the lip: it shoots back down the kicker and spins out on the flat. */
const boardAfter = (f: number): { at: P3; tilt: number; flip: number } => {
  const t = f - SKATE.lip;
  const x = LIP[0] - Math.min(2.2, t * 0.09);
  const onKick = x > KICK_X;
  const y = onKick ? ((x - KICK_X) / KICK_L) * KICK_H : 0;
  return { at: [x, y, Z + Math.min(0.5, t * 0.02)], tilt: onKick ? Math.atan2(KICK_H, KICK_L) : 0, flip: Math.min(Math.PI, t * 0.25) };
};
const SkateShot: React.FC<{ frame: number }> = ({ frame }) => {
  const b = boardAt(frame);
  const after = frame >= SKATE.lip ? boardAfter(frame) : null;
  return (
    <>
      <SkateparkSet />
      <QuarterPipe position={[QP_X, 0, Z]} />
      <Kicker position={[KICK_X, 0, Z]} />
      {after ? <Skateboard position={after.at} tilt={after.tilt} flip={after.flip} /> : <Skateboard position={[b.x, b.y, Z]} tilt={b.angle} />}
      <Cast who={KIT} track={skateKit} frame={frame} />
      <Cast
        who={MARCUS}
        track={(f) => marcusAct(f >= BEATS.dares && f < BEATS.dropIn ? "point" : f >= BEATS.crack ? "cower" : "idle", MARCUS_AT, f >= BEATS.dropIn ? 0.5 : -0.9, f >= BEATS.crack ? "shock" : f >= BEATS.dares ? "smug" : "happy", { blend: 8 })}
        frame={frame}
      />
      {dust(SKATE.land, [LAND_X + 0.2, 0, Z], "land", 0.9)}
    </>
  );
};

/** Next Saturday: Kit walks past the big ramp carrying his board, and keeps walking. */
const skate2Kit: ActorTrack = (f) => {
  const s = shotStart("skate2");
  const x = 1.5 - (f - s) * 0.03;
  const looking = f >= BEATS.rampAgain - 10 && f < BEATS.free;
  return act("walk", [x, 0, Z + 0.6], looking ? FACE_LEFT + 0.6 : FACE_LEFT, looking ? "smug" : "happy", { speed: 0.9, blend: 10 });
};
const Skate2Shot: React.FC<{ frame: number }> = ({ frame }) => {
  const a = skate2Kit(frame);
  const x = a ? a.position[0] : 0;
  return (
    <>
      <SkateparkSet />
      <QuarterPipe position={[QP_X, 0, Z]} />
      <Kicker position={[KICK_X, 0, Z]} />
      <Cast who={KIT} track={skate2Kit} frame={frame} />
      <Skateboard position={[x, 0.42, Z + 0.9]} tilt={Math.PI / 2} yaw={0} />
    </>
  );
};

// ---------------------------------------------------------------------------
// The break, the drive, the doctor.
// ---------------------------------------------------------------------------
const XrayShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Blueprint />
    <Cast who={KIT} track={(f) => act("idle", [0.3, 0, Z], 0.2, f >= BEATS.crooked ? "scared" : f >= BEATS.tenHours ? "happy" : "pain", { blend: 10 })} frame={frame} />
    {frame >= BEATS.remembers - 8 ? (
      <Cast who={TEO} track={(f) => act(f >= BEATS.shape ? "point" : "idle", [-1.2, 0, Z - 0.3], 0.6, f >= BEATS.shape ? "shock" : "focus", { blend: 8 })} frame={frame} />
    ) : null}
  </>
);

/** Grandpa's open-top car tearing along the road, Kit in the passenger seat. */
const driveX = (f: number) => (f - shotStart("drive")) * 0.32 - 6;
const DriveShot: React.FC<{ frame: number }> = ({ frame }) => {
  const x = driveX(frame);
  const seat = CAR_SEAT_Y + 0.3;
  return (
    <>
      <Lawn />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, Z]} receiveShadow>
        <planeGeometry args={[200, 3.4]} />
        <meshStandardMaterial color="#5c5f66" roughness={0.95} />
      </mesh>
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-30 + i * 4, 0.008, Z]}>
          <planeGeometry args={[1.6, 0.12]} />
          <meshStandardMaterial color="#f2e7c4" roughness={0.9} />
        </mesh>
      ))}
      {[-24, -12, 0, 12, 24, 36].map((tx, i) => (
        <Tree key={tx} position={[tx, 0, Z - 5]} scale={1.2} seed={i} />
      ))}
      <Car position={[x, 0, Z]} wheelSpin={frame * 0.9}>
        <Cast who={TEO} track={() => act("ride", [-0.2, sitY(TEO, seat), -0.32], FACE_RIGHT, "angry")} frame={frame} />
        <Cast who={KIT} track={(f) => act("ride", [-0.2, sitY(KIT, seat), 0.32], FACE_RIGHT, f >= BEATS.drives + 20 ? "shock" : "pain")} frame={frame} />
      </Car>
      <SpeedLines frame={frame} center={[x - 2.4, 1.0, Z]} speed={1.2} dir={-1} count={16} />
    </>
  );
};

/** The doctor's room: Kit on the exam bed, the cast goes on on "cast". */
const EXAM: P3 = [0, 0, Z - 0.5];
const ClinicShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Room position={[0, 0, Z - 1.4]} width={12} depth={7} wall="#d6efe8" floor="#e9eef0" floorLine="#d3dadd" tiles />
    <Bed position={EXAM} length={1.8} />
    <Cast
      who={KIT}
      weapon={frame >= BEATS.cast ? "cast" : "none"}
      track={(f) => act("ride", [EXAM[0] + 0.2, sitY(KIT, BED_TOP), EXAM[2] + 0.35], 0.2, f >= BEATS.tomorrow ? "smug" : f >= BEATS.cast ? "happy" : f >= BEATS.straightens ? "pain" : "focus", { blend: 8 })}
      frame={frame}
    />
    <Cast
      who={DOCTOR}
      track={(f) => act((f >= BEATS.straightens && f < BEATS.cast + 10) || (f >= BEATS.seeSix && f < BEATS.tomorrow) ? "point" : "idle", [EXAM[0] + 1.25, 0, EXAM[2] + 0.75], -1.0, f >= BEATS.tomorrow ? "shock" : "happy", { blend: 8 })}
      frame={frame}
    />
  </>
);

// ---------------------------------------------------------------------------
// The night: the bill comes due. Kit in bed, burning hot, up at midnight, two and four.
// ---------------------------------------------------------------------------
const BED_AT: P3 = [0.2, 0, Z - 0.6];
const WAKES = [BEATS.midnight, BEATS.two, BEATS.four];
const nightHours = (f: number) => keyed([[shotStart("bedNight"), 22], [BEATS.midnight, 24], [BEATS.two, 26], [BEATS.four, 28], [shotStart("pancakes"), 28.5]], f);
const nightKit: ActorTrack = (f) => {
  const awake = WAKES.some((w) => f >= w - 2 && f < w + 22);
  if (awake) return act("ride", [BED_AT[0] - 0.35, sitY(KIT, BED_TOP), BED_AT[2] + 0.1], 0.3, "shock", { blend: 4 });
  return lie(BED_AT[0] - 0.2, BED_AT[2] + 0.05, BED_TOP, f >= BEATS.fever ? "pain" : "dazed");
};
const BedNightShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Room position={[0, 0, Z - 1.6]} width={12} depth={7} wall="#7f93b8" floor="#8f6c48" floorLine="#7a5a3c" />
    <Window position={[-2.2, 1.6, Z - 4.98]} w={1.4} h={1.2} night />
    <Bed position={BED_AT} />
    <WallClock position={[1.9, 2.0, Z - 4.98]} hours={nightHours(frame) % 12} minutes={(nightHours(frame) % 1) * 60} />
    <Cast who={KIT} weapon="cast" track={nightKit} frame={frame} />
    <HealGlow frame={frame} at={[BED_AT[0] - 0.2, BED_TOP + 0.35, BED_AT[2] + 0.3]} size={2.2} />
    <Sweat frame={frame} head={[BED_AT[0] - 0.75, BED_TOP + 0.3, BED_AT[2]]} amount={progress(frame, [BEATS.fever - 10, BEATS.fever + 20])} />
  </>
);

/** Grandpa at the stove in his pajamas; the stack grows, Kit eats it down to nothing. */
const STOVE: P3 = [-2.4, 0, Z - 4.7];
const stack = (f: number) => keyed([[shotStart("pancakes"), 5], [BEATS.pancakes + 30, 9], [BEATS.batter, 6], [BEATS.runsOut, 0]], f, false);
const PancakesShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <KitchenSet night hours={4} minutes={30} />
    <Pancakes position={[-0.75, TABLE_TOP, TZ + 0.05]} n={stack(frame)} />
    <Cast who={KIT} weapon="cast" track={(f) => act("ride", KIT_SEAT, FACE_RIGHT, f >= BEATS.runsOut ? "happy" : "focus", { speed: 2.4 })} frame={frame} />
    <Cast who={TEO} track={(f) => act(Math.floor(f / 18) % 2 ? "point" : "idle", [STOVE[0] + 0.6, 0, STOVE[2] + 1.2], f >= BEATS.runsOut ? 0.6 : Math.PI - 0.3, f >= BEATS.runsOut ? "dazed" : "focus", { blend: 8 })} frame={frame} />
  </>
);

/** Morning: the bone is whole, the cast is off, and his jeans hang loose. */
const MorningShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Room position={[0, 0, Z - 1.6]} width={12} depth={7} wall="#bcd3ea" floor="#b98b5a" floorLine="#a2774c" />
    <Window position={[-2.2, 1.6, Z - 4.98]} w={1.4} h={1.2} />
    <Bed position={BED_AT} />
    <Cast
      who={KIT}
      weapon={frame >= BEATS.whole ? "none" : "cast"}
      track={(f) => act(f >= BEATS.whole && f < BEATS.jeans ? "cheer" : "idle", [BED_AT[0] + 1.5, 0, BED_AT[2] + 0.9], -0.3, f >= BEATS.kilo ? "shock" : "happy", { squashX: f >= BEATS.jeans ? 0.9 : 1, blend: 8 })}
      frame={frame}
    />
  </>
);

// ---------------------------------------------------------------------------
// Thanksgiving on the hill: the wagon, the sprint, the curb.
// ---------------------------------------------------------------------------
const onHill = (x: number, z: number): P3 => [x, hillY(x), z];
const SIDEWALK_Z = Z;
const hillKit: ActorTrack = (f) => {
  const x = kitHillX(f);
  if (f < BEATS.sprint) return act("idle", onHill(x, SIDEWALK_Z + 0.5), f >= BEATS.cars ? 0.7 : 0.2, f >= BEATS.math ? "focus" : f >= BEATS.rolls ? "shock" : "happy", { blend: 8 });
  if (f < BEATS.grab) return act("run", onHill(x, lerp(SIDEWALK_Z + 0.5, SIDEWALK_Z, progress(f, [BEATS.sprint, BEATS.grab]))), FACE_RIGHT, "yell", { speed: 2.6, blend: 4 });
  if (f < BEATS.curb) {
    // Facing uphill, leaning into the wagon, heels dragging.
    return { ...act("smash", onHill(x, SIDEWALK_Z), FACE_LEFT, "angry", { blend: 4 }), tilt: 0.35, pivot: 0 };
  }
  const curbTop = hillY(CURB_X) + CURB_H;
  const expression: Expression = f >= BEATS.starving ? "dazed" : f >= BEATS.hugsYou ? "happy" : f >= BEATS.alreadyHealing ? "focus" : "pain";
  return act("ride", [KIT_STOP + 0.12, sitY(KIT, curbTop) - 0.06, SIDEWALK_Z], FACE_LEFT + 0.6, expression, { blend: 4 });
};
const hillTess: ActorTrack = (f) => {
  const x = tessHillX(f);
  const moving = f >= BEATS.tessRunning - 10 && f < BEATS.hugsRabbit - 4;
  const slowMo = f >= BEATS.math && f < BEATS.sprint;
  if (f >= BEATS.hugsYou) return act("cheer", onHill(KIT_STOP - 0.55, SIDEWALK_Z + 0.25), FACE_RIGHT + 0.3, "happy", { blend: 8 });
  if (moving) return act("run", onHill(x, SIDEWALK_Z - 0.35), FACE_RIGHT, "scared", { speed: slowMo ? 0.2 : 2.2, blend: 6 });
  return act("idle", onHill(x, SIDEWALK_Z - 0.35), f >= BEATS.hugsRabbit ? FACE_RIGHT + 0.5 : FACE_RIGHT, f >= BEATS.letsGo ? "shock" : "happy", { blend: 6 });
};
const hillTeo: ActorTrack = (f) => act(f >= BEATS.rolls && f < BEATS.curb ? "point" : "idle", [-3.4, 0, Z - 1.0], f >= BEATS.rolls ? 1.2 : 0.4, f >= BEATS.stops ? "happy" : f >= BEATS.rolls ? "shock" : "happy", { blend: 8 });

const HillShot: React.FC<{ frame: number }> = ({ frame }) => {
  const wx = wagonX(frame);
  const onSlope = wx > 0.45;
  const spin = (wx - 0.7) / 0.11;
  const rabbitInTess = frame >= BEATS.hugsRabbit;
  // Tess carries the rabbit in her arms once she has it (her hug spot follows hillTess).
  const tessHugX = frame >= BEATS.hugsYou ? KIT_STOP - 0.55 : tessHillX(frame);
  const tessHugZ = frame >= BEATS.hugsYou ? SIDEWALK_Z + 0.25 : SIDEWALK_Z - 0.35;
  return (
    <>
      <HillStreet />
      <HouseBack position={[-4.5, 0, Z - 3.0]} width={9} />
      <Tree position={[-9, 0, Z - 4]} scale={1.4} seed={2} />
      <Tree position={[4.5, hillY(4.5), Z - 4.2]} scale={1.2} seed={5} />
      <Wagon position={[wx, hillY(wx), SIDEWALK_Z - 0.35]} tilt={onSlope ? -SLOPE : 0} handle={frame >= BEATS.letsGo ? 0.1 : 0.7} spin={spin}>
        {!rabbitInTess ? <Rabbit yaw={-0.4} /> : null}
      </Wagon>
      {rabbitInTess ? <Rabbit position={[tessHugX + 0.2, hillY(tessHugX) + 0.5, tessHugZ + 0.18]} yaw={0.4} scale={0.9} /> : null}
      <Cast who={KIT} track={hillKit} frame={frame} />
      <Cast who={TESS} track={hillTess} frame={frame} />
      <Cast who={TEO} track={hillTeo} frame={frame} />
      {[0, 1, 2, 3, 4].map((i) => {
        const at = lerp(BEATS.grab, BEATS.curb, i / 5);
        const x = kitHillX(at);
        return <group key={i}>{dust(Math.round(at), onHill(x - 0.15, SIDEWALK_Z), `heel${i}`, 0.45)}</group>;
      })}
      {dust(BEATS.curb, onHill(KIT_STOP, SIDEWALK_Z), "curb", 1.0)}
      <HealGlow frame={frame} at={[KIT_STOP, hillY(CURB_X) + 0.7, SIDEWALK_Z + 0.3]} size={1.2} />
      {wagonSpeed(frame) > 0.01 && frame < BEATS.math ? <SpeedLines frame={frame} center={[wx - 1.0, hillY(wx) + 0.4, SIDEWALK_Z - 0.35]} speed={0.6} dir={-1} count={8} /> : null}
    </>
  );
};
export const HILL = { GRAB_X, KIT0, KIT_STOP, WAGON_STOP, SIDEWALK_Z };

// ---------------------------------------------------------------------------
// Thanksgiving dinner: turkey legs, mashed potatoes, and Tess's slice of pie.
// ---------------------------------------------------------------------------
const DZ = Z - 0.5;
const KIT_DIN: P3 = [1.45, 0, DZ];
const TEO_DIN: P3 = [-1.45, 0, DZ];
const TESS_DIN: P3 = [0.45, 0, DZ - 0.65];
const DinnerShot: React.FC<{ frame: number }> = ({ frame }) => {
  const legs = frame >= BEATS.secondOne ? 0 : frame >= BEATS.turkeyLeg ? 1 : 2;
  const slide = easeOutCubic(progress(frame, [BEATS.slides, BEATS.potatoes + 6]));
  const pie = easeOutCubic(progress(frame, [BEATS.pie - 6, BEATS.pie + 12]));
  return (
    <>
      <Room position={[0, 0, Z - 1.4]} width={14} depth={9} height={4.4} floor="#a9744a" floorLine="#93633e" wall="#e9c99a" />
      <Window position={[2.6, 1.7, Z - 5.78]} w={1.6} h={1.2} night />
      <BreakfastTable position={[0, 0, DZ]} width={2.6} depth={1.0} />
      <Chair position={[KIT_DIN[0] + 0.05, 0, DZ]} yaw={FACE_LEFT} />
      <Chair position={[TEO_DIN[0] - 0.05, 0, DZ]} yaw={FACE_RIGHT} />
      <Chair position={[TESS_DIN[0], 0, TESS_DIN[2]]} />
      <Chair position={[-0.45, 0, DZ - 0.65]} />
      <Turkey position={[-0.2, TABLE_TOP, DZ - 0.05]} legs={legs} />
      <PotatoBowl position={[lerp(-0.85, 0.8, slide), TABLE_TOP, DZ + 0.2]} />
      <Pie position={[0.3, TABLE_TOP, DZ - 0.25]} />
      {frame >= BEATS.pie - 6 ? <PieSlice position={[lerp(TESS_DIN[0], 1.0, pie), TABLE_TOP, lerp(DZ - 0.3, DZ + 0.05, pie)]} /> : null}
      {legs < 2 ? <TurkeyLeg position={[KIT_DIN[0] - 0.3, 1.0, DZ + 0.22]} rotation={[0, 0, 0.9]} /> : null}
      <Cast who={KIT} track={(f) => act("ride", [KIT_DIN[0] + 0.05, sitY(KIT, CHAIR_SEAT), DZ], FACE_LEFT, f >= BEATS.pie ? "happy" : f >= BEATS.lazy ? "focus" : "happy", { speed: 1.8 })} frame={frame} />
      <Cast who={TEO} track={(f) => act(f >= BEATS.slides && f < BEATS.potatoes + 10 ? "point" : "ride", f >= BEATS.slides && f < BEATS.potatoes + 10 ? [TEO_DIN[0] + 0.1, 0, DZ + 0.4] : [TEO_DIN[0] - 0.05, sitY(TEO, CHAIR_SEAT), DZ], FACE_RIGHT, "happy", { blend: 6 })} frame={frame} />
      <Cast who={TESS} track={(f) => act(f >= BEATS.pie - 8 && f < BEATS.pie + 20 ? "point" : "ride", f >= BEATS.pie - 8 && f < BEATS.pie + 20 ? [TESS_DIN[0], 0, TESS_DIN[2] + 0.3] : [TESS_DIN[0], sitY(TESS, CHAIR_SEAT), TESS_DIN[2]], 0.5, "happy", { blend: 6 })} frame={frame} />
      <Cast who="dad" track={() => act("ride", [-0.45, sitY("dad", CHAIR_SEAT), DZ - 0.65], 0, "happy")} frame={frame} />
    </>
  );
};

// ---------------------------------------------------------------------------
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const shot = shotAt(frame);
  const outdoor = shot === "scrape" || shot === "skate" || shot === "skate2" || shot === "drive" || shot === "hill";
  const night = shot === "bedNight" || shot === "pancakes";
  return (
    <>
      <SkyRig tod={night ? 1.6 : 0.15} azimuth={-0.5} fogNear={outdoor ? 60 : 200} fogFar={outdoor ? 600 : 900} />
      {shot === "kitchen" ? <KitchenShot frame={frame} /> : null}
      {shot === "body" || shot === "xray" ? (shot === "body" ? <BodyShot frame={frame} /> : <XrayShot frame={frame} />) : null}
      {shot === "scrape" ? <ScrapeShot frame={frame} /> : null}
      {shot === "lunch" ? <LunchShot frame={frame} /> : null}
      {shot === "pantry" ? <PantryShot frame={frame} /> : null}
      {shot === "radiator" ? <RadiatorShot frame={frame} /> : null}
      {shot === "skate" ? <SkateShot frame={frame} /> : null}
      {shot === "drive" ? <DriveShot frame={frame} /> : null}
      {shot === "clinic" ? <ClinicShot frame={frame} /> : null}
      {shot === "bedNight" ? <BedNightShot frame={frame} /> : null}
      {shot === "pancakes" ? <PancakesShot frame={frame} /> : null}
      {shot === "morning" ? <MorningShot frame={frame} /> : null}
      {shot === "skate2" ? <Skate2Shot frame={frame} /> : null}
      {shot === "hill" ? <HillShot frame={frame} /> : null}
      {shot === "dinner" || shot === "outro" ? <DinnerShot frame={frame} /> : null}
    </>
  );
};

/** Geometry the camera needs. */
export const SHOT_GEOMETRY = { KIT_CHAIR, KIT_HEAD_SEATED, TESS_AT, TRIP_X, LUNCH_TABLE_Z, POCKET, TEO_PANTRY, KIT_DESK, MARCUS_AT, EXAM, BED_AT, STOVE, KIT_DIN, TEO_DIN, TESS_DIN, DZ, QP_R, driveX };
