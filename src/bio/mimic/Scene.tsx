import type React from "react";
import { useCurrentFrame } from "remotion";
import {
  Atmosphere,
  Backdrop,
  BalanceScale,
  CHEST,
  CHEST_H,
  Crocodile,
  Dragonfly,
  Drift,
  FLESH,
  Gauntlet,
  GiantClam,
  HermitCrab,
  HeroChest,
  MimicBlob,
  Octopus,
  ReefSet,
  SOFT,
  SkinPatch,
  SnailShell,
  SoftChest,
  StudioSet,
  SuckerMacro,
  SwampSet,
  Tentacle,
  ThreePoint,
  Tongue,
  VaultSet,
  panTop,
  tint,
  type Mood,
} from "../../artifacts/bio";
import { G, INK_THIN, Part, glow, vinyl, type AdventurerClass } from "../../artifacts/characters/hero";
import { GlowSprite } from "../../artifacts/dungeon/Fx";
import type { Vec3 } from "../../engine/types";
import { ActorView, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, arc, bezier, dust, jellySplash, slimeSplash, type Actor, type ActorTrack } from "../../kit";
import {
  BEATS,
  CLAM_LAND,
  CRAB,
  CRAB_IN,
  DAGGER_AT,
  DAGGER_LAND,
  GAP_Y,
  KNOCKS,
  MEN_LAND,
  MORPH,
  PASSERS,
  PASS_LEN,
  VICTIM,
  VICTIM_ARRIVE,
  asleep,
  bumps,
  camo,
  chestEyes,
  chestLean,
  chestLid,
  chestSquash,
  chill,
  clamOpen,
  cobwebs,
  crabX,
  crabYaw,
  cutaway,
  daggerT,
  dayPhase,
  dragged,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  energy,
  gauntletLift,
  keyed,
  lerp,
  paint,
  pourT,
  progress,
  sacs,
  scaleTilt,
  shotAt,
  shotStart,
  softWobble,
  tongueOut,
  victimX,
  wobble,
} from "./timeline";

/**
 * Staging for every shot. The subject of each shot stands at the origin of its
 * set; the camera (config.ts) moves around it. Only the set on screen renders.
 */

/** Depth of the flat "diagram" layer in front of the chest's cross-section window. */
const ZF = CHEST.d / 2 + 0.13;

// ---------------------------------------------------------------------------
// The mimic inside its chest (drawn on the cross-section window)
// ---------------------------------------------------------------------------
const InsideMimic: React.FC<{ fill?: number; color?: string; mood?: Mood; blink?: number; thin?: number }> = ({ fill = 1, color = FLESH, mood = "neutral", blink = 0, thin = 0 }) =>
  fill > 0.03 ? (
    <group position={[0, 0.07, ZF]} scale={[1.08 * Math.sqrt(fill) * (1 - thin * 0.28), 0.98 * fill * (1 - thin * 0.3), 0.26]}>
      <MimicBlob arms={false} color={color} mood={mood} blink={blink} look={[0, -0.1]} />
    </group>
  ) : null;

/** The hero chest posed by the timeline curves. */
const Chest: React.FC<{ frame: number; cutawayColor?: string; mouth?: React.ReactNode }> = ({ frame, cutawayColor, mouth }) => (
  <HeroChest
    alive
    lid={chestLid(frame)}
    eyes={chestEyes(frame)}
    squash={chestSquash(frame)}
    lean={chestLean(frame)}
    cobwebs={cobwebs(frame)}
    cutaway={cutaway(frame)}
    cutawayColor={cutawayColor}
    mouth={mouth}
  />
);

/** The rogue's dagger: all that comes back out. */
const LostDagger: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < BEATS.burp + 2) return null;
  const t = daggerT(frame);
  const p = bezier([0.2, CHEST.base + 0.2, 0.2], [0.9, 2.1, 0.5], DAGGER_AT, t);
  const spin = t < 1 ? t * 9 : 0;
  const settle = wobble(frame, DAGGER_LAND, 0.25, 1.1, 5);
  return (
    <group position={[p[0], p[1] + 0.02, p[2]]} rotation={[Math.PI / 2, 0.5, 1.2 + spin + settle]}>
      <Part geo={G.cone(0.05, 0.42, 4)} mat={vinyl("#c9d2e2", "gloss")} position={[0, 0.3, 0]} scale={[1, 1, 0.35]} ink={INK_THIN} />
      <Part geo={G.box(0.2, 0.04, 0.06, 0.015)} mat={vinyl("#e7b545", "gloss")} position={[0, 0.08, 0]} ink={INK_THIN} />
      <Part geo={G.capsule(0.03, 0.2)} mat={vinyl("#5a3622", "leather")} position={[0, -0.03, 0]} ink={INK_THIN} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Vault shots
// ---------------------------------------------------------------------------
/** Cold open: jaws at the lens, slam shut, then an innocent chest. */
const Hook: React.FC<{ frame: number }> = ({ frame }) => {
  const out = 1 - progress(frame, [BEATS.lunge - 2, BEATS.chomp0 - 1]);
  return (
    <>
      <VaultSet />
      <Chest frame={frame} mouth={<Tongue tip={[0.12, 0.72, 0.8]} out={out} sag={0.25} curl={0.6} />} />
      {dust(BEATS.chomp0, [0, 0.08, 0.7], "hook-chomp", 0.45)}
      {dust(BEATS.never + 3, [0, 0.05, 0.6], "hook-shut", 0.4)}
    </>
  );
};

/** The naked mimic squeezes itself into the shape of a chest, then paints itself. */
const Paint: React.FC<{ frame: number }> = ({ frame }) => {
  const squash = keyed(
    [
      [MORPH - 12, 0],
      [MORPH - 3, 0.42],
      [MORPH, -0.25],
    ],
    frame,
  );
  return (
    <>
      <VaultSet />
      {frame < MORPH ? <MimicBlob squash={squash} mood={frame > MORPH - 12 ? "shock" : "neutral"} look={[0, 0.1]} /> : <SoftChest paint={paint(frame)} wobble={softWobble(frame)} />}
      {jellySplash(MORPH, [0, 0.6, 0.5], "morph", "#f08ab8")}
    </>
  );
};

/** A knock on the lid: it is still a bag of water. */
const Knock: React.FC<{ frame: number }> = ({ frame }) => {
  const startled = easeOutBack(progress(frame, [KNOCKS[0] + 1, KNOCKS[0] + 6]));
  return (
    <>
      <VaultSet />
      <SoftChest paint={1} wobble={softWobble(frame)} eyes={frame > KNOCKS[0] ? startled : 0} look={[0.5, 0.8]} lean={wobble(frame, KNOCKS[0], 0.06, 0.6, 14)} />
      <Gauntlet position={[0.18, SOFT.h - 0.1 + gauntletLift(frame), 0.12]} />
      {KNOCKS.map((at, i) => dust(at, [0.2, SOFT.h, 0.3], `knock-${i}`, 0.25))}
    </>
  );
};

/** Stop building a chest: there is a real one right there. */
const Steal: React.FC<{ frame: number }> = ({ frame }) => {
  const seen = progress(frame, [BEATS.steal - 6, BEATS.steal + 4]);
  const hop = arc(progress(frame, [BEATS.steal + 2, BEATS.steal + 12]), 0.16);
  return (
    <>
      <VaultSet />
      <HeroChest position={[0.8, 0, -0.9]} yaw={-0.3} lid={1.15} />
      <GlowSprite position={[0.8, 0.9, -0.8]} color="#ffd36b" size={2.2} opacity={0.25 + 0.2 * seen} />
      <MimicBlob position={[-0.6, hop, 0.7]} yaw={0.45} mood={seen > 0.5 ? "smug" : "sad"} look={[seen, 0.1]} squash={0.12 * (1 - seen)} />
    </>
  );
};

/** No bones: the whole animal pours through a knot hole in the lid. */
const Pour: React.FC<{ frame: number }> = ({ frame }) => {
  const p = pourT(frame);
  const flex = 0.28 * Math.sin((frame - BEATS.bones) * 0.5) * (1 - progress(frame, [BEATS.bones + 20, BEATS.bones + 30])) * (frame >= BEATS.bones ? 1 : 0);
  const outside = Math.max(0, 1 - p * 1.15);
  const skin = vinyl(FLESH, "skin");
  const head = Math.min(1, p * 5);
  const tail = Math.max(0, (p - 0.8) * 5);
  const top = GAP_Y + 0.22;
  const path = (u: number): Vec3 => [0.035 * Math.sin(u * 9 + frame * 0.35), lerp(top, 0.3, u), ZF];
  const gapU = (top - GAP_Y) / (top - 0.3);
  return (
    <>
      <VaultSet />
      <HeroChest lid={0} cutaway={cutaway(frame)} />
      {outside > 0.02 ? <MimicBlob position={[0, CHEST_H - 0.05, 0.12]} scale={0.86 * outside ** 0.6} squash={flex + 0.3 * p} arms={false} mood={p > 0.05 ? "shock" : "neutral"} look={[0, -0.6]} /> : null}
      {p > 0.02 && p < 0.995 ? (
        <>
          <Tentacle n={16} r0={0.1} r1={0.1} mat={skin} path={(t) => path(lerp(tail, head, t))} radius={(t) => 0.045 + 0.1 * Math.min(1, Math.abs(lerp(tail, head, t) - gapU) * 2.4)} />
          {/* The beak: the only hard part, and the last thing through. */}
          {p > 0.8 ? <Part geo={G.cone(0.04, 0.09, 8)} mat={vinyl("#2a1c18", "gloss")} position={path(tail)} rotation={[Math.PI, 0, 0]} ink={false} /> : null}
        </>
      ) : null}
      <mesh geometry={G.torus(0.1, 0.018)} material={glow("#3fe6d4", 1.8)} position={[0, GAP_Y, ZF + 0.02]} rotation={[Math.PI / 2, 0, 0]} />
      <InsideMimic fill={p} mood={p > 0.97 ? "smug" : "neutral"} />
    </>
  );
};

const PASSER_CLASS: AdventurerClass[] = ["rogue", "mage"];
const passer = (i: number): ActorTrack => (frame) => {
  const [start, dir, z] = PASSERS[i];
  if (frame < start || frame > start + PASS_LEN) return null;
  const t = (frame - start) / PASS_LEN;
  return { pose: "run", position: [dir * lerp(-4.6, 4.6, t), 0, z], yaw: dir > 0 ? FACE_RIGHT : FACE_LEFT, speed: 2.6, expression: "focus" };
};

/** A year in the hallway: dinner walks past twice. */
const Wait: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <VaultSet day={dayPhase(frame)} torches={lerp(1, 0.6, progress(frame, [shotStart("wait"), BEATS.warm]))} />
    <Chest frame={frame} />
    {PASSERS.map((_, i) => (
      <ActorView key={i} classType={PASSER_CLASS[i]} actor={passer(i)} frame={frame} />
    ))}
  </>
);

/** A warm body would starve: the window opens on a mimic running out of fuel. */
const Starve: React.FC<{ frame: number }> = ({ frame }) => {
  const e = energy(frame);
  return (
    <>
      <VaultSet torches={0.6} />
      <Chest frame={frame} cutawayColor="#ff5a4a" />
      <InsideMimic fill={cutaway(frame) > 0.85 ? 1 : 0} color={tint(FLESH, "#9a8a94", 1 - e)} mood={e < 0.55 ? "sad" : "neutral"} thin={1 - e} />
    </>
  );
};

/** Run cold, never move. */
const Cold: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <VaultSet torches={0.6} />
    <Chest frame={frame} />
    <InsideMimic fill={cutaway(frame) > 0.85 ? 1 : 0} color={tint(FLESH, "#6f83d6", chill(frame) * 0.85)} blink={asleep(frame)} mood="neutral" />
  </>
);

/** The victim: sneaks in, gloats over the chest, gets taken. Eaten on the chomp, gone for good. */
const victim: ActorTrack = (frame) => {
  const x = victimX(frame);
  if (frame < VICTIM_ARRIVE) return { pose: "walk", position: [x, 0, 0.15], yaw: FACE_LEFT, speed: 0.9, expression: "happy" };
  if (frame < BEATS.tongue - 9) return { pose: "point", position: [VICTIM.stand, 0, 0.15], yaw: FACE_LEFT, expression: "smug" };
  if (frame < BEATS.tongue) return { pose: "idle", position: [VICTIM.stand, 0, 0.15], yaw: FACE_LEFT, expression: "shock" };
  if (frame < BEATS.yank) return { pose: "cower", position: [VICTIM.stand - 0.05, 0, 0.15], yaw: FACE_LEFT, expression: "scared" };
  if (frame < BEATS.chomp - 2) {
    const d = dragged(frame);
    // Reeled in feet-first and shrinking, straight over the teeth.
    return { pose: "fall", position: [lerp(VICTIM.stand, 0.15, d), lerp(0, 0.5, d) + arc(d, 0.2), 0.15 * (1 - d)], yaw: FACE_LEFT, scale: lerp(1, 0.55, d), expression: "yell" };
  }
  return null;
};

/** One bite: the tongue. Also plays under the sucker macro and through the chomp. */
const Bite: React.FC<{ frame: number }> = ({ frame }) => {
  const d = dragged(frame);
  const tip: Vec3 = [lerp(VICTIM.stand - 0.12, 0.25, d), lerp(1.0, 0.8, d) + arc(d, 0.3), 0.15 * (1 - d)];
  return (
    <>
      <VaultSet torches={0.75} />
      <Chest frame={frame} mouth={<Tongue tip={tip} out={tongueOut(frame)} sag={0.22} curl={frame < BEATS.yank ? 0.5 : 0} />} />
      <ActorView classType="rogue" actor={victim} frame={frame} />
      {slimeSplash(BEATS.tongue + 5, [VICTIM.stand - 0.1, 1.0, 0.3], "lash", 0.8, "#ff8fb8")}
      {dust(BEATS.chomp, [0, 0.08, 0.7], "chomp", 0.45)}
      <LostDagger frame={frame} />
      {dust(DAGGER_LAND, DAGGER_AT, "dagger", 0.35)}
    </>
  );
};

/** The clincher: an innocent chest, a dagger on the floor, and something waiting. */
const End: React.FC<{ frame: number }> = ({ frame }) => {
  const sh = shotAt(frame);
  const lunge = progress(frame, [BEATS.finalLunge, BEATS.finalLunge + 5]);
  return (
    <>
      <VaultSet day={dayPhase(frame)} torches={sh === "waiting" ? 0.6 : 0.8} />
      <Chest frame={frame} mouth={lunge > 0 ? <Tongue tip={[0.12, 0.72, 0.8]} out={lunge} sag={0.25} curl={0.6} /> : null} />
      {cutaway(frame) > 0.85 ? <InsideMimic mood="smug" /> : null}
      <LostDagger frame={frame} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Reef shots
// ---------------------------------------------------------------------------
const OctopusShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <ReefSet />
    <Octopus scale={1.1} camo={camo(frame)} camoColor="#e6d7ae" look={[0.2 * Math.sin(frame * 0.05), 0]} />
  </>
);

const ClamShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <ReefSet />
    <GiantClam scale={1.05} open={clamOpen(frame)} />
    {jellySplash(BEATS.snaps, [0, 0.75, 0.7], "clam-bubbles", "#e2fbff")}
    {dust(BEATS.snaps, [0, 0.15, 0.9], "clam-sand", 1.1)}
  </>
);

const HermitShot: React.FC<{ frame: number }> = ({ frame }) => {
  const x = crabX(frame);
  const moving = Math.abs(crabX(frame + 1) - x) > 0.002;
  const worn = frame >= CRAB_IN;
  const lookUp = progress(frame, [BEATS.grows, BEATS.grows + 8]) * (1 - progress(frame, [BEATS.moves - 6, BEATS.moves]));
  const cheer = worn ? 0.6 + 0.4 * Math.sin((frame - CRAB_IN) * 0.5) : 0;
  const hop = worn ? arc(progress(frame, [CRAB_IN, CRAB_IN + 8]), 0.22) : 0;
  const Z0 = 0.4;
  return (
    <>
      <ReefSet />
      {!worn ? <SnailShell position={[CRAB.home + 0.26 * CRAB.scale, 0.02 * CRAB.scale, Z0]} yaw={Math.PI} scale={CRAB.scale * 0.68} roll={0.15} /> : null}
      <HermitCrab position={[x, hop, Z0]} yaw={crabYaw(frame)} scale={CRAB.scale} shell={worn ? 1 : 0} step={moving ? frame * 0.7 : 0} claw={Math.max(lookUp, cheer)} look={[0, lookUp * 0.5]} />
      {dust(CRAB_IN, [CRAB.home + 0.3, 0.08, Z0 + 0.2], "crab-in", 0.4)}
    </>
  );
};

// ---------------------------------------------------------------------------
// Macro stages
// ---------------------------------------------------------------------------
const SkinShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Atmosphere color="#0a3142" near={8} far={26} />
    <Backdrop stops={["#1c6f86", "#0d4257", "#07212e"]} z={-9} y={2} />
    <ThreePoint key_={{ position: [-5, 4.5, 3], color: "#fff4e0", intensity: 2.8 }} rim={{ position: [5, 3, -5], color: "#3fe0cf", intensity: 2.2 }} fill={{ color: "#8fd0e0", ground: "#17404e", intensity: 0.8 }} area={4} />
    <SkinPatch sacs={sacs(frame)} bumps={bumps(frame)} />
    <Drift count={40} center={[0, 1.4, 0]} box={[7, 3, 5]} rise={0.004} size={0.05} color="#bfeef5" opacity={0.5} seed="skin-plankton" />
  </>
);

const SuckerShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <Atmosphere color="#1c0a16" near={8} far={24} />
    <Backdrop stops={["#4a1436", "#2a0c1f", "#12060c"]} z={-8} y={1} />
    <ThreePoint key_={{ position: [-4, 5, 5], color: "#ffe9d6", intensity: 2.6 }} rim={{ position: [5, 2, -4], color: "#ff5aa0", intensity: 2.4 }} fill={{ color: "#c08aa8", ground: "#2a1220", intensity: 0.7 }} area={4} />
    <SuckerMacro grip={progress(frame, [BEATS.suckers, BEATS.suckers + 20])} />
    <Drift count={30} center={[0, 0.5, 0.5]} box={[7, 3, 3]} rise={0.003} size={0.05} color="#ffd0e0" opacity={0.4} seed="sucker-dust" />
  </>
);

// ---------------------------------------------------------------------------
// Studio: the scale
// ---------------------------------------------------------------------------
const MEN: AdventurerClass[] = ["paladin", "rogue", "mage"];
const MEN_AT: Vec3[] = [
  [-0.42, 0, 0.14],
  [0.44, 0, 0.14],
  [0.02, 0, -0.36],
];
const FALL = 9;
const man = (i: number): ActorTrack => (frame) => {
  const land = MEN_LAND[i];
  if (frame < land - FALL) return null;
  const top = panTop(1, scaleTilt(frame));
  const drop = frame < land ? 5 * (1 - easeInOut(progress(frame, [land - FALL, land])) ** 2) : 0;
  const at: Vec3 = [top[0] + MEN_AT[i][0], top[1] + drop, MEN_AT[i][2]];
  const base: Pick<Actor, "position" | "weapon"> = { position: at, weapon: "none" };
  if (frame < land) return { ...base, pose: "fall", yaw: FACE_CAMERA, expression: "yell" };
  if (frame < land + 14) return { ...base, pose: "cower", yaw: FACE_CAMERA, expression: "shock" };
  if (frame < BEATS.decades - 4) return { ...base, pose: "idle", yaw: FACE_CAMERA, expression: "dazed" };
  return { ...base, pose: i === 0 ? "point" : "idle", yaw: FACE_LEFT, expression: i === 0 ? "angry" : "neutral" };
};

const ScaleShot: React.FC<{ frame: number }> = ({ frame }) => {
  const tilt = scaleTilt(frame);
  const top = panTop(-1, tilt);
  const drop = frame < CLAM_LAND ? 5.5 * (1 - progress(frame, [CLAM_LAND - 10, CLAM_LAND]) ** 2) : 0;
  return (
    <>
      <StudioSet />
      <BalanceScale tilt={tilt} />
      <GiantClam position={[top[0], top[1] + drop, 0]} scale={0.84} open={0} pitch={0} />
      {MEN.map((c, i) => (
        <ActorView key={c} classType={c} actor={man(i)} frame={frame} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Swamp: the crocodile
// ---------------------------------------------------------------------------
const CROC_YAW = -1.0;
/** The tip of the snout in the world (the crocodile is turned toward the lens). */
const SNOUT: Vec3 = [2.62 * Math.cos(CROC_YAW) + 0.1 * Math.sin(CROC_YAW), 0.66, -2.62 * Math.sin(CROC_YAW) + 0.1 * Math.cos(CROC_YAW)];
const CrocShot: React.FC<{ frame: number }> = ({ frame }) => {
  const landAt = BEATS.crocodile + 26;
  const t = easeOutCubic(progress(frame, [shotStart("croc"), landAt]));
  const fly = bezier([4.5, 3.4, 1.5], [3.0, 2.4, 0.5], SNOUT, t);
  const blink = Math.sin(Math.PI * progress(frame, [BEATS.year - 2, BEATS.year + 10]));
  return (
    <>
      <SwampSet />
      <Crocodile blink={blink} yaw={CROC_YAW} />
      <Dragonfly position={[fly[0], fly[1] + (t < 1 ? 0.12 * Math.sin(frame * 0.5) : 0), fly[2]]} yaw={2.4} flying={frame < landAt} />
    </>
  );
};

// ---------------------------------------------------------------------------
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  switch (shotAt(frame)) {
    case "hook":
      return <Hook frame={frame} />;
    case "octopus":
      return <OctopusShot frame={frame} />;
    case "skin":
      return <SkinShot frame={frame} />;
    case "paint":
      return <Paint frame={frame} />;
    case "knock":
      return <Knock frame={frame} />;
    case "clam":
      return <ClamShot frame={frame} />;
    case "scale":
      return <ScaleShot frame={frame} />;
    case "steal":
      return <Steal frame={frame} />;
    case "hermit":
      return <HermitShot frame={frame} />;
    case "pour":
      return <Pour frame={frame} />;
    case "wait":
      return <Wait frame={frame} />;
    case "starve":
      return <Starve frame={frame} />;
    case "cold":
      return <Cold frame={frame} />;
    case "croc":
      return <CrocShot frame={frame} />;
    case "suckers":
      return <SuckerShot frame={frame} />;
    case "bite":
    case "yank":
      return <Bite frame={frame} />;
    default:
      return <End frame={frame} />;
  }
};
