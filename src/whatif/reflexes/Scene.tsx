import type React from "react";
import { useCurrentFrame } from "remotion";
import { hipHeight, type AdventurerClass, type AdventurerPose, type Expression } from "../../artifacts/characters/hero";
import { GlowSprite } from "../../artifacts/dungeon/Fx";
import {
  Bed,
  Blueprint,
  Bowl,
  BreakfastTable,
  CHAIR_SEAT,
  CerealBox,
  Chair,
  Desk,
  Dodgeball,
  GLASS_H,
  GarageEave,
  GymHall,
  KitchenCounter,
  LADDER_STEP,
  Lemonade,
  MilkGlass,
  MilkRibbon,
  RaceTrack,
  Room,
  StartingBlocks,
  Stepladder,
  TABLE_TOP,
  WallClock,
  Window,
  bleacherSeat,
} from "../../artifacts/reflexes";
import { House, SkyRig } from "../../artifacts/sky";
import { HouseBack, Lawn, PORCH_TOP, Tree } from "../../artifacts/teleport";
import type { Vec3 } from "../../engine/types";
import { ActorView, CHAR_SCALE, FACE_LEFT, FACE_RIGHT, bezier3, dust, easeOutCubic, type Actor, type ActorTrack } from "../../kit";
import {
  BEATS,
  KIT_GYM_X,
  KIT_LEMON_X,
  KIT_RAIL_X,
  LADDER_X,
  MARCUS_X,
  STEP,
  STEP1,
  STEP2,
  THROW1,
  THROW2,
  Z,
  ballFlight,
  easeInOut,
  glassFall,
  glassSlide,
  kitDive,
  kitchenClock,
  ladderDeg,
  lerp,
  progress,
  shotAt,
  shotEnd,
  shotStart,
} from "./timeline";

type P3 = [number, number, number];
const KIT: AdventurerClass = "flyKit";
const TEO: AdventurerClass = "grandpaTeo";
const TESS: AdventurerClass = "sisterTess";
const MARCUS: AdventurerClass = "neighborF";

/** The what-if cast plays at class scale 1 (ActorView multiplies by CHAR_SCALE). */
const UNIT = 1 / CHAR_SCALE;
const act = (pose: AdventurerPose, at: P3, yaw: number, expression?: Expression, more: Partial<Actor> = {}): Actor => ({ pose, position: at, yaw, expression, scale: UNIT, ...more });

/** Marcus: an eighth grader, a head taller than Kit. */
const marcusAct = (pose: AdventurerPose, at: P3, yaw: number, expression?: Expression, more: Partial<Actor> = {}): Actor => act(pose, at, yaw, expression, { scale: UNIT * 1.15, ...more });

const Cast: React.FC<{ who: AdventurerClass; track: ActorTrack; frame: number }> = ({ who, track, frame }) => (
  <ActorView classType={who} actor={track} frame={frame} weapon="none" />
);

/** Seated feet height so the hips rest on a surface at `top`. */
const sitY = (who: AdventurerClass, top: number, scale = 1) => top + 0.1 - hipHeight(who) * scale;
/** Inside Kit's head the world runs ten times slower: idles breathe at a tenth of the pace. */
const SLOW = 0.1;

// ---------------------------------------------------------------------------
// The kitchen: breakfast table along x, Tess behind it, Kit at the right end.
// The glass sits by Tess's elbow and goes off the front edge (toward camera).
// ---------------------------------------------------------------------------
export const TZ = Z - 0.6;
const FRONT = TZ + 0.45;
const GLASS_HOME: P3 = [0.22, TABLE_TOP, TZ + 0.18];
const GLASS_EDGE: P3 = [0.3, TABLE_TOP, FRONT + 0.015];
/** Where Kit's fingers meet the glass (its base a few centimetres above the floor). */
export const CATCH: P3 = [0.3, 0.11, FRONT + 0.5];
const KIT_CHAIR: P3 = [-1.3, 0, TZ];
const TESS_AT: P3 = [0.35, 0, TZ - 0.72];
/**
 * The catch hand in the "diveCatch" pose, in Kit's body frame: ALONG the body from the hip (shoulder rise
 * plus the arm, pitched 2.45 rad from hanging), toward the BELLY, and to his left (toward the camera when he
 * faces +x). Rig numbers from RIG × Kit's class scale 0.9.
 */
const KIT_S = 0.9;
const ARM = (0.21 + 0.21 + 0.07) * KIT_S;
const HAND_ALONG = (1.04 - 0.62) * KIT_S + ARM * -Math.cos(2.45);
const HAND_BELLY = ARM * Math.sin(2.45);
const HAND_SIDE = 0.3;
const DIVE_TILT = 1.62;
const KIT_SEAT_HIP: P3 = [KIT_CHAIR[0] - 0.05, CHAIR_SEAT + 0.1, TZ];
/** Hand position for a hip and a tilt (negative tilt = head toward +x). */
const handFrom = (h: P3, a: number): P3 => [
  h[0] - HAND_ALONG * Math.sin(a) + HAND_BELLY * Math.cos(a),
  h[1] + HAND_ALONG * Math.cos(a) + HAND_BELLY * Math.sin(a),
  h[2] + HAND_SIDE,
];
/** Where the solve puts the hand relative to the glass base (the rendered fist lands about mid-glass). */
const HAND_TO_GLASS = -0.05;
const CATCH_HAND: P3 = [CATCH[0], CATCH[1] + HAND_TO_GLASS, CATCH[2]];
const KIT_DIVE_END: P3 = (() => {
  const off = handFrom([0, 0, 0], -DIVE_TILT);
  return [CATCH_HAND[0] - off[0], CATCH_HAND[1] - off[1], CATCH_HAND[2] - off[2]];
})();

export interface MilkStory {
  /** Kitchen clock for this frame (see timeline.kitchenClock). */
  k: number;
  clip: number;
  tips: number;
  pours: number;
  move: number;
  close: number;
}

/** Kit first slides sideways off the chair (still seated, legs clear of the seat), then dives in front of the table. */
const SCOOT = 0.15;
const KIT_OFF_HIP: P3 = [KIT_SEAT_HIP[0] + 0.05, KIT_SEAT_HIP[1] + 0.06, TZ + 0.62];
const diveHip = (t: number): P3 =>
  t < SCOOT
    ? (() => {
        const u = easeInOut(t / SCOOT);
        return [lerp(KIT_SEAT_HIP[0], KIT_OFF_HIP[0], u), lerp(KIT_SEAT_HIP[1], KIT_OFF_HIP[1], u), lerp(KIT_SEAT_HIP[2], KIT_OFF_HIP[2], u)];
      })()
    : bezier3(KIT_OFF_HIP, [KIT_OFF_HIP[0] + 0.3, 0.85, TZ + 0.78], [KIT_DIVE_END[0] - 0.45, 0.5, KIT_DIVE_END[2]], KIT_DIVE_END, (t - SCOOT) / (1 - SCOOT));
/** Facing +x, a forward tilt is negative (head toward +x). */
const diveTilt = (t: number) => -DIVE_TILT * easeInOut(Math.min(1, Math.max(0, t - SCOOT) / ((1 - SCOOT) * 0.77)));
const handAt = (t: number): P3 => handFrom(diveHip(t), diveTilt(t));

/** The glass on the kitchen clock: slide to the edge, teeter, tip and fall; caught in Kit's hand. */
const glassState = (s: MilkStory): { at: P3; spin: number; milk: number } => {
  const { k } = s;
  if (k >= s.close) {
    const h = handAt(1);
    return { at: [h[0], h[1] - HAND_TO_GLASS, h[2]], spin: 0.5, milk: 0.5 };
  }
  if (k < s.tips) {
    const slide = glassSlide(k, s.clip);
    const at: P3 = [lerp(GLASS_HOME[0], GLASS_EDGE[0], slide), TABLE_TOP, lerp(GLASS_HOME[2], GLASS_EDGE[2], slide)];
    const teeter = slide >= 1 ? 0.06 * Math.sin((k - s.clip) * 0.12) : 0;
    return { at, spin: teeter, milk: 0.8 };
  }
  const fall = glassFall(k, s.tips, s.close);
  return {
    at: [GLASS_EDGE[0], lerp(TABLE_TOP, CATCH[1], fall), lerp(GLASS_EDGE[2], CATCH[2], Math.min(1, fall * 1.5))],
    spin: lerp(0.15, 1.3, Math.min(1, (k - s.tips) / (s.close - s.tips))),
    milk: lerp(0.8, 0.5, progress(k, [s.pours, s.close])),
  };
};

const kitchenKit = (s: (f: number) => MilkStory, after: Expression): ActorTrack => (f) => {
  const st = s(f);
  const seated = act("ride", [KIT_CHAIR[0] - 0.05, sitY(KIT, CHAIR_SEAT), TZ], FACE_RIGHT, st.k >= st.clip ? "shock" : "happy", { speed: st.k >= st.clip ? SLOW : 1 });
  if (st.k < st.move) return seated;
  const t = kitDive(st.k, st.move, st.close);
  const hip = diveHip(t);
  const pivot = hipHeight(KIT);
  if (t < SCOOT) return act("ride", [hip[0], hip[1] - pivot, hip[2]], FACE_RIGHT, "focus", { speed: SLOW });
  return {
    // The overhead "fly" reach turns into the forward-down catch arm as the hand nears the glass.
    ...act(t >= 0.55 ? "diveCatch" : "fly", [hip[0], hip[1] - pivot, hip[2]], FACE_RIGHT, st.k >= st.close ? after : "focus", { speed: SLOW, blend: t >= 0.55 ? 40 : 24 }),
    tilt: diveTilt(t),
    pivot,
  };
};

const kitchenTess = (s: (f: number) => MilkStory, after: Expression): ActorTrack => (f) => {
  const st = s(f);
  const reaching = st.k >= st.clip - 20 && st.k < st.clip + 40;
  const expression: Expression = st.k >= st.close + 2 ? after : st.k >= st.clip + 6 ? "shock" : "happy";
  return act(reaching ? "point" : "idle", TESS_AT, reaching ? -0.9 : -0.15, expression, { speed: st.k >= st.clip ? SLOW : 1 });
};

const KitchenSet: React.FC<{ frame: number }> = () => (
  <>
    <Room position={[0, 0, Z - 1.4]} width={14} depth={9} tiles floor="#e9dcc4" floorLine="#cdbb9c" wall="#f6e2b8" />
    <KitchenCounter position={[-2.6, 0, Z - 5.5]} length={3.6} />
    <Window position={[2.4, 1.75, Z - 5.78]} w={1.8} h={1.2} />
    <BreakfastTable position={[0, 0, TZ]} />
    <Chair position={KIT_CHAIR} yaw={FACE_RIGHT} />
    <Chair position={[1.3, 0, TZ]} yaw={FACE_LEFT} />
    <CerealBox position={[-0.25, TABLE_TOP, TZ - 0.15]} yaw={-0.3} />
    <Bowl position={[0.45, TABLE_TOP, TZ - 0.2]} color="#f27a2e" />
    <Bowl position={[-0.85, TABLE_TOP, TZ]} />
    <WallClock position={[-0.4, 2.3, Z - 5.75]} minutes={22} hours={7} seconds={0} />
  </>
);

const MilkShot: React.FC<{ frame: number; story: (f: number) => MilkStory; kitAfter: Expression; tessAfter: Expression }> = ({ frame, story, kitAfter, tessAfter }) => {
  const s = story(frame);
  const g = glassState(s);
  const pourT = progress(s.k, [s.pours, s.close + 3]);
  const mouth: P3 = [g.at[0], g.at[1] + GLASS_H * Math.cos(g.spin), g.at[2] + GLASS_H * Math.sin(g.spin)];
  return (
    <>
      <KitchenSet frame={frame} />
      <MilkGlass position={g.at} spin={g.spin} milk={g.milk} />
      {pourT > 0 ? <MilkRibbon from={mouth} vx={0.04} progress={s.k >= s.close ? 0 : Math.min(1, pourT * 1.4)} puddle={progress(s.k, [s.close - 6, s.close + 30])} /> : null}
      <Cast who={KIT} track={kitchenKit(story, kitAfter)} frame={frame} />
      <Cast who={TESS} track={kitchenTess(story, tessAfter)} frame={frame} />
    </>
  );
};

const milkStory = (f: number): MilkStory => ({ k: kitchenClock(f), clip: BEATS.clips, tips: BEATS.tips, pours: BEATS.pours, move: BEATS.move, close: BEATS.close });
/** Next morning: the same clip, and Kit only just setting off. */
const milkAgain = (f: number): MilkStory => ({
  k: Math.min(f, BEATS.journey) + (f > BEATS.journey ? (f - BEATS.journey) * 0.35 : 0),
  clip: BEATS.clipsAgain,
  tips: BEATS.clipsAgain + (BEATS.tips - BEATS.clips),
  pours: BEATS.clipsAgain + (BEATS.pours - BEATS.clips),
  move: BEATS.journey,
  close: BEATS.journey + (BEATS.close - BEATS.move) * 3,
});

// ---------------------------------------------------------------------------
// The explainer stage: Kit stands on the blueprint; the HUD draws the signal's trip beside him.
// ---------------------------------------------------------------------------
const KIT_HIP = hipHeight(KIT);
const KIT_HEAD = KIT_HIP + (1.39 - 0.62) * 0.9;
const BodyShot: React.FC<{ frame: number }> = ({ frame }) => {
  const twitch = frame >= BEATS.switchOn + 12 && frame < BEATS.none;
  return (
    <>
      <Blueprint />
      <Cast
        who={KIT}
        track={(f) => act(twitch && f >= BEATS.switchOn + 12 ? "point" : "idle", [0, 0, Z], 0.25, f >= BEATS.nowTen ? (f >= BEATS.none ? "dazed" : "focus") : "neutral", { blend: 10 })}
        frame={frame}
      />
    </>
  );
};

/** The false-start line: Kit in the blocks, off a tenth of a second after the gun. */
const RACE_GO = BEATS.gun + 3;
const raceKit: ActorTrack = (f) => {
  if (f < RACE_GO) return act("cower", [0, 0, Z], FACE_RIGHT, "focus");
  const x = Math.min(14, 0.11 * (f - RACE_GO) + 0.004 * (f - RACE_GO) ** 2);
  return act("run", [x, 0, Z], FACE_RIGHT, "yell", { speed: 2.4, blend: 3 });
};
const RaceShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <RaceTrack position={[6, 0, Z + 0.6]} />
    <StartingBlocks position={[-0.1, 0, Z]} />
    <Cast who={KIT} track={raceKit} frame={frame} />
    <Cast who="dad" track={(f) => act(f >= BEATS.blocks - 10 ? "point" : "idle", [-1.4, 0, Z - 2.2], 0.6, "focus")} frame={frame} />
    {dust(RACE_GO, [0, 0, Z], "blocks", 0.8)}
    {frame >= BEATS.gun && frame < BEATS.gun + 10 ? <GlowSprite position={[-1.0, 2.0, Z - 2.0]} color="#fff2c0" size={0.6 * (1 - (frame - BEATS.gun) / 10)} opacity={0.9} /> : null}
  </>
);

/** "Including you": Kit waves a hand that crawls. */
const SelfShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Blueprint />
    <Cast
      who={KIT}
      track={(f) => act(f >= BEATS.slower ? "cheer" : "idle", [0, 0, Z], 0.15, f >= BEATS.includingYou ? "shock" : "focus", { speed: SLOW * 2, blend: 40 })}
      frame={frame}
    />
  </>
);

// ---------------------------------------------------------------------------
// Life in slow motion: the classroom, the bedroom, the porch.
// ---------------------------------------------------------------------------
const DESKS: [number, number][] = [
  [-2.4, -1.6],
  [0, -1.6],
  [2.4, -1.6],
  [-2.4, 0.2],
  [2.4, 0.2],
];
const CLASSMATES: AdventurerClass[] = ["kid", "neighborB", "neighborC", "neighborD", "neighborE"];
const KIT_DESK: P3 = [0, 0, Z + 0.2];
/** Desks face the camera; the seat is behind the desk (−z). */
const deskSeat = (at: P3): P3 => [at[0], 0, at[2] - 0.42];

/** School-day clock: 6 real hours, the minute hand crawling 10x slow. */
export const classMinutes = (frame: number) => 10 + (frame - shotStart("classroom")) / 30 / 6;

const ClassroomShot: React.FC<{ frame: number }> = ({ frame }) => {
  const hand = frame >= BEATS.finish && frame < BEATS.sixHour;
  return (
    <>
      <Room position={[0, 0, Z - 1.5]} width={14} depth={9} wall="#cfe0d0" floor="#b9a17e" floorLine="#a48c6a" />
      <WallClock position={[0, 2.35, Z - 5.85]} r={0.42} hours={10} minutes={classMinutes(frame)} seconds={(classMinutes(frame) * 60) % 60} />
      {[-3.4, 3.4].map((x) => (
        <Window key={x} position={[x, 1.8, Z - 5.88]} w={1.6} h={1.3} />
      ))}
      {DESKS.concat([[KIT_DESK[0], KIT_DESK[2]]]).map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
          <Desk position={[0, 0, 0]} />
        </group>
      ))}
      {DESKS.map(([x, z], i) => {
        const seat = deskSeat([x, 0, z]);
        return <Cast key={i} who={CLASSMATES[i]} track={() => act("ride", [seat[0], sitY(CLASSMATES[i], CHAIR_SEAT, 0.8), seat[2]], 0, "neutral", { scale: UNIT * 0.8, speed: SLOW })} frame={frame} />;
      })}
      <Cast
        who={KIT}
        track={(f) => {
          const seat = deskSeat(KIT_DESK);
          const expression: Expression = f >= BEATS.sixHour ? "dazed" : f >= BEATS.talking ? "focus" : "neutral";
          return act(hand ? "point" : "ride", [seat[0], hand ? 0 : sitY(KIT, CHAIR_SEAT), seat[2] - (hand ? 0.2 : 0)], hand ? 0.2 : 0, expression, { speed: SLOW * 3, blend: hand ? 30 : 10 });
        }}
        frame={frame}
      />
    </>
  );
};

/** Bedroom: Kit walks along +x, his toe meets the bed's foot post on "stub". */
const BED_AT: P3 = [0.6, 0, Z - 1.05];
/** The foot post Kit's toe hits (bed rotated so its foot faces the camera). */
const POST_X = BED_AT[0] - 0.47;
const TOE_AHEAD = 0.18;
const BED_WALK = 0.035;
const bedKitX = (f: number) => POST_X - TOE_AHEAD - Math.max(0, BEATS.stub - f) * BED_WALK;
const bedroomKit: ActorTrack = (f) => {
  const z = BED_AT[2] + 1.0 + 0.12;
  if (f < BEATS.stub) return act("walk", [bedKitX(f), 0, z], FACE_RIGHT, "happy", { speed: 1.1 });
  // After the stub he steps back off the bed corner, so turning to camera keeps him clear of the frame.
  const back = easeOutCubic(progress(f, [BEATS.stub, BEATS.stub + 10]));
  const x = bedKitX(BEATS.stub) - 0.3 * back;
  const zz = z + 0.2 * back;
  if (f < BEATS.arrives) {
    const flinch = f >= BEATS.sting && f < BEATS.sting + 10 ? "shock" : f >= BEATS.coming ? "scared" : "dazed";
    return act("idle", [x, 0, zz], f >= BEATS.sting ? -0.3 : FACE_RIGHT, flinch, { speed: SLOW });
  }
  const hop = Math.abs(Math.sin(((f - BEATS.arrives) / 9) * Math.PI)) * 0.22;
  return act("jump", [x - 0.15 * Math.min(1, (f - BEATS.arrives) / 20), hop, zz], 0.4, "pain", { blend: 3 });
};
const BedroomShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Room position={[0, 0, Z - 1.6]} width={12} depth={7} wall="#bcd3ea" floor="#b98b5a" floorLine="#a2774c" />
    <Window position={[-2.2, 1.6, Z - 4.98]} w={1.4} h={1.2} night />
    <group position={BED_AT} rotation={[0, -Math.PI / 2, 0]}>
      <Bed position={[0, 0, 0]} />
    </group>
    <mesh position={[-1.6, 0.003, Z + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.9, 32]} />
      <meshStandardMaterial color="#e2533c" roughness={1} />
    </mesh>
    <Cast who={KIT} track={bedroomKit} frame={frame} />
    {dust(BEATS.arrives, [bedKitX(BEATS.stub) - 0.3, 0, BED_AT[2] + 1.32], "ouch", 0.5)}
  </>
);

/** Porch: Grandpa in his chair, Kit on the steps, taking his time to answer. */
const PORCH_X = 0;
const PorchShot: React.FC<{ frame: number; night?: boolean }> = ({ frame, night = false }) => (
  <>
    <Lawn />
    <HouseBack position={[PORCH_X + 0.6, 0, Z - 2.4]} width={14} />
    <House position={[-16, 0, -18]} color="#e8d7b6" glow={night ? 1 : 0} seed={3} />
    <Tree position={[6, 0, Z - 5]} scale={1.3} seed={1} />
    <Chair position={[PORCH_X + 1.0, PORCH_TOP, Z - 1.6]} yaw={-0.3} color="#f2eadb" />
    <Cast
      who={TEO}
      track={(f) => act("ride", [PORCH_X + 1.0, sitY(TEO, PORCH_TOP + CHAIR_SEAT), Z - 1.6], -0.3, night ? "happy" : f >= BEATS.wise ? "smug" : "happy")}
      frame={frame}
    />
    <Cast
      who={KIT}
      track={(f) => act("ride", [PORCH_X - 0.4, sitY(KIT, PORCH_TOP * 0.66), Z + 0.18], 0.35, night ? (f >= BEATS.youAreNot ? "smug" : "happy") : f >= BEATS.speak ? "smug" : "focus", { speed: SLOW * 4 })}
      frame={frame}
    />
    {night ? (
      <>
        <GlowSprite position={[PORCH_X - 0.6, 2.6, Z - 2.3]} color="#ffcf7a" size={1.6} opacity={0.8} />
        <pointLight position={[PORCH_X - 0.4, 2.4, Z - 0.6]} color="#ffd59a" intensity={9} distance={9} decay={1.6} />
        <ambientLight color="#5a6aa0" intensity={0.5} />
      </>
    ) : null}
  </>
);

// ---------------------------------------------------------------------------
// The gym: Marcus at x < 0, Kit at x > 0, the crowd on the bleachers.
// ---------------------------------------------------------------------------
const GYM_BACK = -6;
const BLEACH: Vec3 = [0, 0, GYM_BACK - 1.2];
const CROWD: { who: AdventurerClass; row: number; x: number }[] = [
  { who: "kid", row: 0, x: -5 },
  { who: "neighborB", row: 1, x: -3.6 },
  { who: "neighborC", row: 0, x: -3.2 },
  { who: "neighborD", row: 2, x: -0.4 },
  { who: "neighborE", row: 1, x: 1.4 },
  { who: "neighborD", row: 0, x: 2.1 },
  { who: "kid", row: 2, x: 4.6 },
  { who: "neighborB", row: 1, x: 6.4 },
  { who: "neighborC", row: 3, x: -2.6 },
  { who: "neighborD", row: 3, x: 2.8 },
];
const TEAMS: { who: AdventurerClass; at: P3; yaw: number }[] = [
  { who: "neighborE", at: [-4.4, 0, Z - 1.6], yaw: FACE_RIGHT - 0.3 },
  { who: "neighborB", at: [-4.8, 0, Z + 0.9], yaw: FACE_RIGHT + 0.3 },
  { who: "neighborC", at: [5.4, 0, Z - 2.0], yaw: FACE_LEFT + 0.3 },
  { who: "kid", at: [4.9, 0, Z + 1.0], yaw: FACE_LEFT - 0.3 },
];

const Crowd: React.FC<{ frame: number; cheerAt?: number; slow?: boolean }> = ({ frame, cheerAt = Infinity, slow = false }) => (
  <>
    {CROWD.map((c, i) => {
      const seat = bleacherSeat(BLEACH, c.row, c.x);
      return (
        <Cast
          key={i}
          who={c.who}
          track={(f) => (f >= cheerAt ? act("cheer", [seat[0], seat[1] + 0.07 - hipHeight(c.who) * 0.75 + 0.02, seat[2] + 0.2], 0, "happy", { scale: UNIT * 0.75, speed: 0.9 + (i % 3) * 0.1 }) : act("ride", [seat[0], seat[1] + 0.07 - hipHeight(c.who) * 0.75, seat[2] + 0.2], 0, "neutral", { scale: UNIT * 0.75, speed: slow ? SLOW : 1 }))}
          frame={frame}
        />
      );
    })}
  </>
);

const Teams: React.FC<{ frame: number; cheerAt?: number; slow?: boolean }> = ({ frame, cheerAt = Infinity, slow = false }) => (
  <>
    {TEAMS.map((t, i) => (
      <Cast key={i} who={t.who} track={(f) => act(f >= cheerAt && t.at[0] > 0 ? "cheer" : "idle", t.at, t.yaw, f >= cheerAt && t.at[0] > 0 ? "happy" : "focus", { scale: UNIT * 0.8, speed: slow ? SLOW : 1 })} frame={frame} />
    ))}
  </>
);

/** Marcus's hand at release, and Kit's stomach (the ball's target line). */
const RELEASE: P3 = [MARCUS_X + 0.45, 1.15, Z + 0.1];
const STOMACH: P3 = [KIT_GYM_X - 0.12, 0.72, Z];

const marcusThrow = (windup: number, release: number, slow: boolean): ActorTrack => (f) => {
  const at: P3 = [MARCUS_X, 0, Z];
  const speed = slow ? SLOW * 3 : 1;
  if (f < windup) return marcusAct("idle", at, FACE_RIGHT, "smug", { speed });
  if (f < release) return marcusAct("windup", at, FACE_RIGHT, "angry", { speed, blend: slow ? 14 : 6 });
  return marcusAct("point", at, FACE_RIGHT + 0.2, "yell", { speed, blend: 4 });
};

const ballAt = (frame: number, release: number, arrive: number, target: P3): P3 => {
  const t = ballFlight(frame, release, arrive);
  return [lerp(RELEASE[0], target[0], t), lerp(RELEASE[1], target[1], t) + 0.25 * Math.sin(Math.PI * t), lerp(RELEASE[2], target[2], t)];
};

/** Throw 1: Kit watches the ball, starts his step too late, and takes it in the stomach. */
const gymKit1: ActorTrack = (f) => {
  const step = STEP * 0.35 * easeInOut(progress(f, [STEP1.start, STEP1.end]));
  const at: P3 = [KIT_GYM_X, 0, Z - step];
  if (f < THROW1.hit) {
    const expression: Expression = f >= BEATS.halfway ? "scared" : f >= BEATS.plenty ? "focus" : f >= BEATS.paysOff ? "smug" : "happy";
    return act(f >= STEP1.start ? "walk" : "idle", at, FACE_LEFT + (f >= STEP1.start ? 0.5 : 0), expression, { speed: f >= BEATS.leave ? SLOW * 4 : 1, blend: 20 });
  }
  const knock = easeOutCubic(progress(f, [THROW1.hit, THROW1.hit + 10]));
  return act("cower", [at[0] + 0.35 * knock, 0, at[2]], FACE_LEFT, "pain", { blend: 3 });
};

const GymBall1: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < THROW1.release) return null;
  if (frame < THROW1.hit) return <Dodgeball position={ballAt(frame, THROW1.release, THROW1.hit, STOMACH)} spin={(frame - THROW1.release) * 0.06} />;
  const t = frame - THROW1.hit;
  const bounce = Math.abs(Math.sin(t * 0.18)) * 0.6 * Math.exp(-t / 30);
  return <Dodgeball position={[STOMACH[0] - 0.3 - t * 0.03, 0.11 + bounce, STOMACH[2] + t * 0.02]} spin={t * 0.3} squash={t < 3 ? 0.8 : 1} />;
};

const GymShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <GymHall backZ={GYM_BACK} />
    <Crowd frame={frame} slow={frame >= BEATS.leave} />
    <Teams frame={frame} slow={frame >= BEATS.leave} />
    <Cast who={MARCUS} track={marcusThrow(THROW1.windup, THROW1.release, true)} frame={frame} />
    <Cast who={KIT} track={gymKit1} frame={frame} />
    <GymBall1 frame={frame} />
    <Cast who="dad" track={(f) => act(f < BEATS.dodgeball + 30 ? "point" : "idle", [0, 0, Z - 3.4], 0, "focus")} frame={frame} />
  </>
);

/** The bench: Kit on the front row, sulking; Marcus warming up on court. */
const BENCH_SEAT = bleacherSeat(BLEACH, 0, 3.4);
const BenchShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <GymHall backZ={GYM_BACK} />
    <Crowd frame={frame} />
    <Cast
      who={KIT}
      track={(f) => act("ride", [BENCH_SEAT[0], BENCH_SEAT[1] + 0.09 - KIT_HIP, BENCH_SEAT[2] + 0.15], f >= BEATS.shoulder ? -0.9 : -0.3, f >= BEATS.everyoneElse ? "focus" : f >= BEATS.nobody ? "dazed" : "pain")}
      frame={frame}
    />
    <Cast who={MARCUS} track={(f) => marcusAct(f >= BEATS.windBack - 4 && f < BEATS.everyoneElse + 30 ? "windup" : "idle", [-0.6, 0, GYM_BACK + 3.2], FACE_RIGHT, "smug", { speed: 0.6, blend: 12 })} frame={frame} />
    {frame >= BEATS.shoulder ? <GlowSprite position={[-0.6, 1.0, GYM_BACK + 3.45]} color="#ffd84d" size={0.32 + 0.05 * Math.sin(frame * 0.3)} opacity={0.6} /> : null}
  </>
);

/** Throw 2: Kit reads the shoulder and is gone before the ball leaves the hand. */
const gymKit2: ActorTrack = (f) => {
  const step = STEP * easeInOut(progress(f, [STEP2.start, STEP2.end]));
  const at: P3 = [KIT_GYM_X, 0, Z - step];
  if (f < STEP2.start) return act("idle", at, FACE_LEFT, "focus");
  if (f < STEP2.end) return act("walk", at, FACE_LEFT + 0.6, "focus", { speed: SLOW * 6, blend: 4 });
  if (f < BEATS.notFaster - 10) return act("idle", at, FACE_LEFT, "smug");
  if (f < BEATS.wins) return act("point", at, -0.2, "smug");
  if (f < BEATS.shoulders - 6) return act("cheer", at, -0.3, "happy");
  return act("point", at, FACE_LEFT + 0.2, "smug");
};
const GymBall2: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < THROW2.release) return null;
  const far: P3 = [KIT_GYM_X + 2.6, 0.85, Z];
  const t = ballFlight(frame, THROW2.release, THROW2.pass);
  if (t < 1) return <Dodgeball position={ballAt(frame, THROW2.release, THROW2.pass, [KIT_GYM_X, 0.75, Z])} spin={(frame - THROW2.release) * 0.06} />;
  const u = frame - THROW2.pass;
  const x = Math.min(far[0] + 1.5, KIT_GYM_X + u * 0.06);
  return <Dodgeball position={[x, Math.max(0.11, 0.75 - u * 0.012), Z]} spin={u * 0.3} />;
};
const marcus2: ActorTrack = (f) => {
  if (f < BEATS.future - 30) return marcusThrow(THROW2.windup, THROW2.release, true)(f);
  const t = progress(f, [BEATS.future - 30, BEATS.future]);
  return marcusAct(t < 1 ? "walk" : "point", [lerp(MARCUS_X, KIT_GYM_X - 1.3, t), 0, Z - STEP], FACE_RIGHT, "shock");
};
const Gym2Shot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <GymHall backZ={GYM_BACK} />
    <Crowd frame={frame} cheerAt={BEATS.wins} slow={frame < BEATS.notFaster} />
    <Teams frame={frame} cheerAt={BEATS.wins} slow={frame < BEATS.notFaster} />
    <Cast who={MARCUS} track={marcus2} frame={frame} />
    <Cast who={KIT} track={gymKit2} frame={frame} />
    <GymBall2 frame={frame} />
  </>
);

// ---------------------------------------------------------------------------
// The ladder: the garage eave, Grandpa on the stepladder, Tess on the porch side.
// ---------------------------------------------------------------------------
const LADDER_AT: P3 = [LADDER_X, 0, Z - 0.75];
const TESS_YARD: P3 = [KIT_LEMON_X + 1.1, 0, Z + 0.2];
const deg = (d: number) => (d * Math.PI) / 180;

/** Grandpa rides the ladder (ladder space: y = LADDER_STEP is the top step). */
const teoOnLadder: ActorTrack = (f) => {
  const leaning = f >= BEATS.leans && f < BEATS.grabsGutter;
  const expression: Expression = f >= BEATS.looksDown ? "shock" : f >= BEATS.rocks ? "scared" : "happy";
  const yaw = f >= BEATS.looksDown ? 0.6 : leaning ? FACE_RIGHT - 0.4 : Math.PI - 0.4;
  return act(f >= BEATS.grabsGutter && f < BEATS.looksDown ? "cheer" : leaning ? "point" : "cheer", [0, LADDER_STEP + 0.03, 0], yaw, expression, { speed: f >= BEATS.rocks && f < BEATS.thump ? SLOW : 1 });
};

/** Kit: holding the ladder, off toward the lemonade, frozen at "One degree", then the sprint back. */
const RUN = { start: BEATS.alreadyRunning, end: BEATS.rail };
/** Holding the ladder from its -x side, clear of the rails; walks off in front of it (+z). */
const KIT_HOLD_X = LADDER_X - 0.8;
const WALK_Z = Z - 0.05;
const yardKitX = (f: number) => {
  if (f < BEATS.letGo) return KIT_HOLD_X;
  if (f < BEATS.rocks) return lerp(KIT_HOLD_X, KIT_LEMON_X - 0.6, easeInOut(progress(f, [BEATS.letGo, BEATS.rocks - 4])));
  if (f < RUN.start) return KIT_LEMON_X - 0.6;
  return lerp(KIT_LEMON_X - 0.6, KIT_RAIL_X, progress(f, [RUN.start, RUN.end]));
};
const yardKit: ActorTrack = (f) => {
  const x = yardKitX(f);
  if (f < BEATS.letGo) return act("smash", [x, 0, Z - 0.75], FACE_RIGHT, "happy");
  if (f < BEATS.rocks - 4) return act("walk", [x, 0, lerp(Z - 0.75, WALK_Z, easeInOut(progress(f, [BEATS.letGo, BEATS.letGo + 14])))], FACE_RIGHT, "happy", { speed: 1.2 });
  if (f < RUN.start) return act("idle", [x, 0, WALK_Z], f >= BEATS.oneDegree ? FACE_LEFT + 0.4 : FACE_RIGHT, f >= BEATS.oneDegree ? "shock" : "happy", { speed: SLOW });
  if (f < RUN.end) return act("run", [x, 0, lerp(WALK_Z, Z - 0.75, progress(f, [RUN.start, RUN.end]))], FACE_LEFT, "yell", { speed: 0.35 });
  if (f < BEATS.looksDown) return act("smash", [KIT_RAIL_X, 0, Z - 0.75], FACE_LEFT, f >= BEATS.thump ? "happy" : "angry", { blend: 4 });
  return act("idle", [KIT_RAIL_X, 0, Z - 0.6], FACE_LEFT + 0.6, "smug");
};
const yardTess: ActorTrack = (f) => act(f >= BEATS.calls ? "point" : "idle", TESS_YARD, FACE_LEFT + 0.3, f >= BEATS.calls && f < BEATS.letGo ? "yell" : "happy", { speed: f >= BEATS.rocks && f < BEATS.thump ? SLOW : 1 });

const YardSet: React.FC<{ frame: number }> = () => (
  <>
    <Lawn />
    <GarageEave position={[0, 0, Z - 1.4]} length={10} />
    <HouseBack position={[KIT_LEMON_X + 6, 0, Z - 2.6]} width={8} />
    <Tree position={[-6.5, 0, Z - 4]} scale={1.4} seed={2} />
    <Tree position={[-9, 0, Z - 7]} scale={1.2} seed={4} />
  </>
);

const YardShot: React.FC<{ frame: number }> = ({ frame }) => {
  const tip = deg(ladderDeg(frame));
  return (
    <>
      <YardSet frame={frame} />
      <Stepladder position={LADDER_AT} tip={tip}>
        <Cast who={TEO} track={teoOnLadder} frame={frame} />
      </Stepladder>
      <Cast who={KIT} track={yardKit} frame={frame} />
      <Cast who={TESS} track={yardTess} frame={frame} />
      <Lemonade position={[TESS_YARD[0] - 0.42, 0.62, TESS_YARD[2] + 0.12]} />
      {dust(BEATS.thump, [LADDER_AT[0] - 0.3, 0, LADDER_AT[2]], "legs", 0.7)}
    </>
  );
};

// ---------------------------------------------------------------------------
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const shot = shotAt(frame);
  const indoor = shot === "kitchen" || shot === "replay" || shot === "after" || shot === "kitchen2" || shot === "outro" || shot === "classroom" || shot === "bedroom" || shot === "gym" || shot === "bench" || shot === "gym2";
  const stage = shot === "body" || shot === "self";
  const tod = shot === "night" ? 2 : shot === "bedroom" ? 1.6 : 0.15;
  return (
    <>
      <SkyRig tod={tod} azimuth={-0.5} fogNear={indoor || stage ? 200 : 60} fogFar={indoor || stage ? 900 : 600} />
      {shot === "kitchen" || shot === "replay" || shot === "after" ? <MilkShot frame={frame} story={milkStory} kitAfter="dazed" tessAfter="dazed" /> : null}
      {shot === "body" ? <BodyShot frame={frame} /> : null}
      {shot === "race" ? <RaceShot frame={frame} /> : null}
      {shot === "self" ? <SelfShot frame={frame} /> : null}
      {shot === "classroom" ? <ClassroomShot frame={frame} /> : null}
      {shot === "bedroom" ? <BedroomShot frame={frame} /> : null}
      {shot === "porch" ? <PorchShot frame={frame} /> : null}
      {shot === "gym" ? <GymShot frame={frame} /> : null}
      {shot === "bench" ? <BenchShot frame={frame} /> : null}
      {shot === "gym2" ? <Gym2Shot frame={frame} /> : null}
      {shot === "yard" || shot === "graph" || shot === "save" ? <YardShot frame={frame} /> : null}
      {shot === "night" ? <PorchShot frame={frame} night /> : null}
      {shot === "kitchen2" || shot === "outro" ? <MilkShot frame={frame} story={milkAgain} kitAfter="focus" tessAfter="happy" /> : null}
    </>
  );
};

/** Geometry the camera needs. */
export const SHOT_GEOMETRY = {
  TESS_AT,
  KIT_CHAIR,
  GLASS_EDGE,
  RELEASE,
  STOMACH,
  BENCH_SEAT,
  LADDER_AT,
  TESS_YARD,
  BED_AT,
  POST_X,
  KIT_DESK,
  KIT_HEAD,
  shotEnd,
  yardKitX,
  handAt,
};
