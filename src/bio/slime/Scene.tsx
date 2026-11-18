import type React from "react";
import { useCurrentFrame } from "remotion";
import {
  Alga,
  Amoeba,
  CourtyardSet,
  DOOR,
  DoorWall,
  Drift,
  ForestSet,
  MicroSet,
  ReefSet,
  SLIME_COLOR,
  SLIME_H,
  SeaCucumber,
  Slime,
  SlimeMold,
  Slug,
  Snail,
  Stain,
  Stomach,
  StudioSet,
  VaultSet,
  tint,
  type SlimeProps,
} from "../../artifacts/bio";
import { Skeleton } from "../../artifacts/boulder";
import { G, INK_THIN, Part, glow, vinyl } from "../../artifacts/characters/hero";
import { GlowSprite } from "../../artifacts/dungeon/Fx";
import type { Vec3 } from "../../engine/types";
import { ActorView, CHAR_SCALE, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, dust, jellySplash, magic, slimeSplash, type ActorTrack } from "../../kit";
import {
  BEATS,
  BRAIN,
  CORE_SPLIT,
  DISSOLVE,
  END_SCALE,
  FULL_SCALE,
  HALF_SCALE,
  HAM_X,
  HEART,
  HOOK_LANDS,
  HOOK_SCALE,
  KNIGHT,
  KNIGHT_ARRIVE,
  NUDGES,
  POUR,
  PREY_X,
  ROUND_UP,
  SLIME_Z,
  STAND_SCALE,
  STAND_Z,
  STRAIN,
  SWALLOW,
  VAULT_SCALE,
  amoebaClose,
  amoebaReach,
  arc,
  bigCore,
  burning,
  coat,
  cucumberSoft,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  engulfLean,
  engulfScale,
  engulfSquash,
  engulfX,
  halfSquash,
  hookMelt,
  hookSquash,
  hookY,
  hookZ,
  knightX,
  lerp,
  lining,
  lungeT,
  manyCores,
  moldCreep,
  moldFlow,
  moldGrow,
  moldNuclei,
  nudge,
  organ,
  pourStream,
  pourZ,
  progress,
  renew,
  shotAt,
  shotStart,
  sliced,
  slugX,
  snailX,
  splitX,
  standMelt,
  standSquash,
  sunClimb,
  waterLeft,
  wobble,
} from "./timeline";

/**
 * Staging for every shot. The subject of each shot stands at the origin of its
 * set; the camera (config.ts) moves around it. Only the set on screen renders.
 */

// ---------------------------------------------------------------------------
// Small props
// ---------------------------------------------------------------------------
/** One of the rogue's daggers: all that is left of him inside the slime. */
const Dagger: React.FC<{ position: Vec3; rotation: Vec3 }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <Part geo={G.cone(0.035, 0.3, 4)} mat={vinyl("#c9d2e2", "gloss")} position={[0, 0.21, 0]} scale={[1, 1, 0.35]} ink={INK_THIN} />
    <Part geo={G.box(0.14, 0.03, 0.045, 0.012)} mat={vinyl("#e7b545", "gloss")} position={[0, 0.06, 0]} ink={INK_THIN} />
    <Part geo={G.capsule(0.022, 0.14)} mat={vinyl("#5a3622", "leather")} position={[0, -0.02, 0]} ink={INK_THIN} />
  </group>
);
/** Both daggers, drifting inside the dome (slime coordinates). */
const Daggers: React.FC<{ frame: number; which?: 0 | 1 }> = ({ frame, which }) => (
  <>
    {which !== 1 ? <Dagger position={[-0.2, 0.2 + 0.02 * Math.sin(frame * 0.05), -0.12]} rotation={[0.3, 0.4, 1.1 + frame * 0.004]} /> : null}
    {which !== 0 ? <Dagger position={[0.24, 0.28 + 0.02 * Math.sin(frame * 0.05 + 2), -0.05]} rotation={[-0.2, 1.2, -0.8 - frame * 0.003]} /> : null}
  </>
);

/** A roast drumstick on a plate: dinner, for something with a mouth. */
const Drumstick: React.FC<{ position: Vec3; jolt?: number }> = ({ position, jolt = 0 }) => (
  <group position={position}>
    <Part geo={G.cyl(0.42, 0.3, 0.05, 28)} mat={vinyl("#eef0f4", "gloss")} position={[0, 0.03, 0]} />
    <group position={[0, 0.2, 0]} rotation={[0, 0.5, 0.25 + jolt * 0.2]}>
      <Part geo={G.sphere(0.2)} mat={vinyl("#b4682c", "gloss")} scale={[1.45, 1, 1.05]} />
      <Part geo={G.capsule(0.04, 0.34)} mat={vinyl("#f3ead6", "bone")} position={[0.36, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
      <Part geo={G.sphere(0.065)} mat={vinyl("#f3ead6", "bone")} position={[0.53, 0.02, 0]} scale={[0.8, 1.2, 1.2]} ink={INK_THIN} />
    </group>
  </group>
);

/** The organs a slime never grows (slime coordinates). */
const Heart: React.FC<{ scale: number }> = ({ scale }) =>
  scale > 0.02 ? (
    <group position={[-0.27, 0.24, 0.34]} scale={scale * 1.5}>
      {[-1, 1].map((s) => (
        <Part key={s} geo={G.sphere(0.075)} mat={glow("#ff2f4f", 1)} position={[s * 0.055, 0.03, 0]} ink={INK_THIN} />
      ))}
      <Part geo={G.cone(0.105, 0.16, 12)} mat={glow("#ff2f4f", 1)} position={[0, -0.07, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 1, 0.75]} ink={INK_THIN} />
    </group>
  ) : null;
const Brain: React.FC<{ scale: number }> = ({ scale }) =>
  scale > 0.02 ? (
    <group position={[0.27, 0.25, 0.34]} scale={scale * 1.5}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Part geo={G.sphere(0.085)} mat={glow("#ff9cc4", 0.7)} position={[s * 0.05, 0, 0]} scale={[0.9, 0.95, 1.2]} ink={INK_THIN} />
          <Part geo={G.torus(0.04, 0.014, Math.PI)} mat={vinyl("#d9779d", "skin")} position={[s * 0.06, 0.02, 0.09]} rotation={[0, 0, s * 0.6]} ink={false} />
        </group>
      ))}
    </group>
  ) : null;

/** The slime at the size it has in the vault. */
const VaultSlime: React.FC<SlimeProps> = (props) => <Slime scale={VAULT_SCALE} {...props} />;

// ---------------------------------------------------------------------------
// Vault shots
// ---------------------------------------------------------------------------
/** Cold open: it hops at the lens, tries the hop a real one could never make, and gives up into a puddle. */
const Hook: React.FC<{ frame: number }> = ({ frame }) => {
  const melt = hookMelt(frame);
  const mood = frame < BEATS.real ? "happy" : frame < STRAIN[0] ? "shock" : frame < STRAIN[1] ? "neutral" : "sad";
  const z = hookZ(frame);
  return (
    <>
      <VaultSet />
      <Slime position={[0, hookY(frame), z]} scale={HOOK_SCALE} squash={hookSquash(frame)} melt={melt} mood={mood} look={[0, frame >= STRAIN[1] ? -0.6 : 0.2]} blink={frame >= STRAIN[0] && frame < STRAIN[1] ? 0.55 : 0} />
      {HOOK_LANDS.map((at, i) => dust(at, [0, 0.05, hookZ(at) + 0.3], `hook-land-${i}`, 0.4))}
      {slimeSplash(BEATS.puddle, [0, 0.1, z + 0.4], "hook-splat", 0.9, SLIME_COLOR)}
    </>
  );
};

/** Stiff, you stand up like jelly. Soft, you pour under a door. */
const Stand: React.FC<{ frame: number }> = ({ frame }) => {
  const s = pourStream(frame);
  const melt = standMelt(frame);
  const standing = frame >= BEATS.standStiff + 6 && frame < BEATS.goSoft;
  return (
    <>
      <VaultSet />
      <DoorWall rattle={wobble(frame, POUR[0] + 8, 1, 1.2, 8)} />
      <group position={[0, 0, pourZ(frame)]} scale={[1 - 0.68 * s, 1, 1 + 0.25 * s]}>
        <Slime scale={STAND_SCALE} melt={melt} squash={standSquash(frame)} mood={standing ? "happy" : "neutral"} look={[0, standing ? 0.3 : 0]} />
      </group>
      {dust(BEATS.standStiff + 10, [0, 0.05, STAND_Z + 0.5], "stand-up", 0.4)}
      {slimeSplash(POUR[0] + 8, [0, 0.08, DOOR.z + 0.3], "pour-under", 0.5, SLIME_COLOR)}
    </>
  );
};

/** Wrapped in mucus. */
const Coat: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <VaultSet torches={0.85} />
    <VaultSlime coat={coat(frame)} mood={frame > BEATS.mucus ? "happy" : "neutral"} squash={wobble(frame, BEATS.mucus + 6, -0.1, 0.7, 9)} look={[0, 0.2]} />
    {magic(BEATS.mucus + 4, [0, 1.0, 0.6], "coat-shine", "#d8fff2", 22)}
  </>
);

/** The dark and the damp: where it stays. */
const Damp: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <VaultSet torches={0.45} day={0.08} />
    <VaultSlime coat={1} mood="happy" squash={0.05 * Math.sin((frame - shotStart("damp")) * 0.25)} look={[0, 0.5]} />
    <Drift count={26} center={[0, 2.6, 0.6]} box={[6, 5, 4]} rise={-0.1} size={0.07} color="#cfeaff" opacity={0.8} seed="vault-drips" />
  </>
);

/** No mouth: it bumps the drumstick and gets nowhere. */
const NoMouth: React.FC<{ frame: number }> = ({ frame }) => {
  const n = nudge(frame);
  return (
    <>
      <VaultSet torches={0.85} />
      <Drumstick position={[HAM_X + 0.5 * n, 0, 0.35]} jolt={n} />
      <VaultSlime position={[-0.75 + n, 0, 0.3]} yaw={0.75} squash={-0.3 * n + 0.08 * Math.sin(Math.PI * progress(frame, [NUDGES[0] - 12, NUDGES[0] - 4]))} mood={frame >= BEATS.noMouth - 4 ? "sad" : "neutral"} look={[0.7, -0.5]} />
      {NUDGES.map((at, i) => dust(at, [HAM_X - 0.35, 0.05, 0.5], `nudge-${i}`, 0.25))}
    </>
  );
};

/** The rogue: admiring the vault, then noticed, then dinner. A skeleton from DISSOLVE on. */
const INSIDE: Vec3 = [0, 0.12, 0.4];
const prey: ActorTrack = (frame) => {
  const at: Vec3 = [PREY_X, 0, 0.15];
  if (frame < BEATS.over - 4) return { pose: "idle", position: at, yaw: FACE_RIGHT, expression: "happy" };
  if (frame < BEATS.over + 8) return { pose: "idle", position: at, yaw: FACE_LEFT, expression: "shock" };
  if (frame < SWALLOW - 2) return { pose: "cower", position: at, yaw: FACE_LEFT, expression: "scared" };
  return { pose: "float", position: [engulfX(frame) + INSIDE[0], INSIDE[1], INSIDE[2] + 0.15], yaw: FACE_CAMERA, scale: 0.55, expression: "shock", weapon: "none", blend: 0 };
};
const swallowed: ActorTrack = (frame) => (frame < DISSOLVE ? { pose: "float", position: INSIDE, yaw: FACE_CAMERA, scale: 0.55, expression: "scared", weapon: "none" } : null);

/** You flow over your dinner, and close around it. */
const Engulf: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <VaultSet torches={0.9} />
    <ActorView classType="rogue" actor={prey} frame={frame} />
    <group position={[engulfX(frame), 0, 0.15]} rotation={[0, 0, engulfLean(frame)]}>
      <Slime scale={engulfScale(frame)} squash={engulfSquash(frame)} coat={1} mood={frame < BEATS.flow ? "neutral" : frame < SWALLOW ? "smug" : "happy"} look={[0.7, 0.2]} yaw={0.35 * (1 - progress(frame, [SWALLOW, SWALLOW + 8]))} />
    </group>
    {slimeSplash(SWALLOW, [PREY_X, 0.2, 0.9], "engulf-flop", 1, SLIME_COLOR)}
    {dust(SWALLOW, [PREY_X, 0.05, 0.8], "engulf-dust", 0.6)}
  </>
);

/** Acid that melts your dinner would melt you too; so you line your insides with mucus. */
const Acid: React.FC<{ frame: number }> = ({ frame }) => {
  const burn = burning(frame);
  const lined = lining(frame);
  const mood = burn > 0.3 ? "shock" : lined > 0.9 ? "happy" : frame < DISSOLVE ? "smug" : "neutral";
  return (
    <>
      <VaultSet torches={0.8} />
      <ActorView classType="rogue" actor={swallowed} frame={frame} />
      {frame >= DISSOLVE ? <Skeleton variant="rogue" position={[INSIDE[0], INSIDE[1] + 0.05 * Math.sin(frame * 0.07), INSIDE[2]]} scale={0.55 * CHAR_SCALE} animFrame={frame} /> : null}
      <Slime
        scale={FULL_SCALE * (1 - 0.06 * burn)}
        color={tint(SLIME_COLOR, "#e09a2e", burn * 0.85)}
        squash={0.03 * Math.sin(frame * 1.9) * burn + wobble(frame, DISSOLVE, 0.08, 0.8, 8)}
        coat={1}
        core={0.5}
        lining={lined}
        bubbles={easeInOut(progress(frame, [BEATS.acid - 4, BEATS.melts]))}
        mood={mood}
        look={[0, burn > 0.3 ? -0.6 : 0]}
      />
      {jellySplash(DISSOLVE, [0, 1.0, 0.9], "dissolve", "#eafff6")}
      {burn > 0.05 ? <Drift count={22} center={[0, 2.2, 0.2]} box={[2.2, 1.8, 1.4]} rise={0.03} size={0.4} color="#fff0c8" opacity={0.2 * burn} seed="acid-steam" /> : null}
      {magic(BEATS.lined, [0, 1.0, 1.0], "lining-on", "#7dfff0", 24)}
    </>
  );
};

/** You never grow one heart or one brain. */
const NoHeart: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <VaultSet torches={0.85} />
    <VaultSlime coat={1} core={0.6} mood={frame >= HEART[1] && frame < BRAIN[0] ? "happy" : frame >= BRAIN[1] ? "happy" : "neutral"} look={[frame < BRAIN[0] ? -0.5 : 0.5, 0]} squash={wobble(frame, HEART[1], 0.1, 0.8, 7) + wobble(frame, BRAIN[1], 0.1, 0.8, 7)}>
      <Daggers frame={frame} />
      <Heart scale={organ(frame, HEART)} />
      <Brain scale={organ(frame, BRAIN)} />
    </VaultSlime>
    {jellySplash(HEART[1], [-0.3, 0.8, 0.9], "heart-pop", "#ff9fb0")}
    {jellySplash(BRAIN[1], [0.3, 0.8, 0.9], "brain-pop", "#ffc2dc")}
  </>
);

/** Tiny cores, spread through its whole body. */
const Cores: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <VaultSet torches={0.7} />
    <VaultSlime coat={1} core={bigCore(frame)} cores={manyCores(frame)} mood={frame > CORE_SPLIT ? "happy" : "neutral"} squash={wobble(frame, CORE_SPLIT, 0.12, 0.8, 8)} look={[0, 0.2]}>
      <Daggers frame={frame} />
    </VaultSlime>
    {magic(CORE_SPLIT, [0, 0.6, 0.9], "core-split", "#d8fff2", 30)}
  </>
);

/** The paladin: strolls in, laughs at the weakest monster, raises his sword, and regrets it. */
const knight: ActorTrack = (frame) => {
  const at: Vec3 = [KNIGHT.x, 0, KNIGHT.z];
  if (frame < KNIGHT_ARRIVE) return { pose: "walk", position: [knightX(frame), 0, KNIGHT.z], yaw: FACE_LEFT, speed: 1.3, expression: "smug" };
  if (frame < BEATS.cannot) return { pose: "point", position: at, yaw: FACE_CAMERA, expression: "smug" };
  if (frame < BEATS.kill - 2) return { pose: "idle", position: at, yaw: FACE_CAMERA, expression: "smug" };
  if (frame < BEATS.cut - 3) return { pose: "windup", position: at, yaw: FACE_CAMERA, expression: "yell" };
  if (frame < BEATS.half + 14) return { pose: "smash", position: at, yaw: FACE_CAMERA, expression: "angry" };
  if (frame < ROUND_UP + 6) return { pose: "idle", position: at, yaw: FACE_CAMERA, expression: "smug" };
  if (frame < BEATS.two) return { pose: "idle", position: at, yaw: FACE_CAMERA, expression: "shock" };
  return { pose: "cower", position: [KNIGHT.x, 0, KNIGHT.z - 0.25 * easeOutCubic(progress(frame, [BEATS.two, BEATS.two + 10]))], yaw: FACE_CAMERA, expression: "scared" };
};

/** The clincher: one slime, one sword, two slimes. */
const End: React.FC<{ frame: number }> = ({ frame }) => {
  const isCut = frame >= BEATS.cut;
  const slice = sliced(frame);
  const size = lerp(END_SCALE, HALF_SCALE, progress(frame, [BEATS.cut, BEATS.cut + 6]));
  const lunge = lungeT(frame);
  const flash = isCut ? 1 - progress(frame, [BEATS.cut, BEATS.cut + 5]) : 0;
  const mood = frame >= ROUND_UP + 8 ? "smug" : "neutral";
  return (
    <>
      <VaultSet torches={0.85} />
      <ActorView classType="paladin" actor={knight} frame={frame} />
      {!isCut ? (
        <Slime position={[0, 0, SLIME_Z]} scale={END_SCALE} coat={1} core={0} cores={1} mood={frame >= BEATS.cannot ? "smug" : "happy"} look={[0, 0.4]} squash={0.04 * Math.sin(frame * 0.2)}>
          <Daggers frame={frame} />
        </Slime>
      ) : (
        ([-1, 1] as const).map((s) => (
          <group key={s} position={[s * splitX(frame) * (1 - 0.5 * lunge), arc(lunge, 0.5) + 1.1 * lunge, SLIME_Z + 3.4 * easeInOut(lunge)]} scale={[1 - 0.45 * slice, 1, 1]}>
            <Slime
              scale={size * (1 + 0.5 * lunge)}
              coat={1}
              core={0}
              cores={1}
              face={slice < 0.4}
              mood={lunge > 0 ? "shock" : mood}
              look={[-s * 0.4, 0.5]}
              squash={halfSquash(frame) - 0.2 * Math.sin(Math.PI * lunge)}
              yaw={-s * 0.25 * (1 - slice)}
            >
              <Daggers frame={frame} which={s < 0 ? 0 : 1} />
            </Slime>
          </group>
        ))
      )}
      {flash > 0 ? (
        <>
          <mesh position={[0, 0.9, SLIME_Z + 0.2]} material={glow("#ffffff", 3)} scale={[0.03 + 0.05 * flash, 2.4 * flash, 1]}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <GlowSprite position={[0, 0.8, SLIME_Z + 0.4]} color="#d8fff2" size={3 * flash} opacity={0.6 * flash} />
        </>
      ) : null}
      {slimeSplash(BEATS.cut, [0, 0.7, SLIME_Z + 0.5], "cut-splash", 1, SLIME_COLOR)}
      {([-1, 1] as const).map((s) => dust(ROUND_UP + 10, [s * 0.78, 0.05, SLIME_Z + 0.5], `round-${s}`, 0.3))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Forest shots
// ---------------------------------------------------------------------------
const MOLD_AT: Vec3 = [-0.95, 0.01, 0.15];
/** The slime mold: spreading, pumping, being overtaken by a snail, and lighting up its nuclei. */
const MoldShot: React.FC<{ frame: number }> = ({ frame }) => {
  const sh = shotAt(frame);
  const race = sh === "slow";
  return (
    <>
      <ForestSet />
      <SlimeMold position={[MOLD_AT[0] + (race ? moldCreep(frame) : 0), MOLD_AT[1], MOLD_AT[2]]} grow={sh === "nuclei" || race ? 1 : moldGrow(frame)} flow={sh === "nuclei" || race ? Math.sin(frame * 0.07) : moldFlow(frame)} nuclei={sh === "nuclei" ? moldNuclei(frame) : 0} />
      {race ? <Snail position={[snailX(frame), 0, 1.35]} scale={0.62} step={frame * 0.35} /> : null}
    </>
  );
};

const SlugShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <ForestSet night={1} />
    <Slug position={[slugX(frame), 0, 0.3]} scale={1.25} trail={0.4 + 1.6 * progress(frame, [shotStart("slug") - 20, shotStart("slug") + 50])} />
  </>
);

// ---------------------------------------------------------------------------
// Reef, courtyard, microscope, studio
// ---------------------------------------------------------------------------
const CucumberShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <ReefSet rock />
    <SeaCucumber position={[0, 0, -0.1]} soft={cucumberSoft(frame)} />
    {dust(BEATS.seconds - 2, [0.9, 0.3, 0.5], "cucumber-sag", 0.5)}
  </>
);

/** Mostly water, on dry land: a stain by lunch. */
const Dry: React.FC<{ frame: number }> = ({ frame }) => {
  const water = waterLeft(frame);
  const dry = 1 - water;
  const mood = water > 0.93 ? "happy" : water > 0.5 ? "shock" : "sad";
  const steam = Math.sin(Math.PI * Math.min(1, dry * 1.15));
  return (
    <>
      <CourtyardSet sun={sunClimb(frame)} />
      <Stain amount={1.25 * easeOutCubic(progress(frame, [BEATS.sun, BEATS.stain + 6]))} />
      {water > 0.03 ? (
        <Slime
          scale={VAULT_SCALE * (0.3 + 0.7 * water ** 0.7)}
          melt={0.75 * dry ** 2}
          color={tint(SLIME_COLOR, "#a9ae7e", dry)}
          mood={mood}
          look={[-0.4, 0.7]}
          core={water}
          squash={0.03 * Math.sin(frame * 0.6) * steam}
          blink={water < 0.2 ? 0.6 : 0}
        />
      ) : null}
      {steam > 0.03 ? <Drift count={34} center={[0, 0.5 + SLIME_H, 0]} box={[1.5, 2.6, 1.2]} rise={0.045} size={0.5} color="#ffffff" opacity={0.3 * steam} seed="dry-steam" /> : null}
    </>
  );
};

const FOOD: [number, number] = [1.2, 0.25];
const AmoebaShot: React.FC<{ frame: number }> = ({ frame }) => {
  const close = amoebaClose(frame);
  const pull = easeInOut(progress(close, [0.7, 1]));
  return (
    <>
      <MicroSet />
      <Amoeba position={[-0.55, 0, 0]} food={FOOD} reach={amoebaReach(frame)} close={close} gulp={pull} />
      <Alga position={[-0.55 + FOOD[0] * (1 - 0.45 * pull) + 0.03 * Math.sin(frame * 0.9), 0.24, FOOD[1] * (1 - 0.45 * pull)]} scale={1 - 0.2 * pull} />
    </>
  );
};

const StomachShot: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <StudioSet accent="#3fe6d4" />
    <Stomach position={[-0.3, -0.75, 0]} scale={1.3} lining={easeOutBack(progress(frame, [shotStart("stomach") + 2, BEATS.stomach]), 1.2)} renew={renew(frame)} />
  </>
);

// ---------------------------------------------------------------------------
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  switch (shotAt(frame)) {
    case "hook":
      return <Hook frame={frame} />;
    case "mold":
    case "pump":
    case "slow":
    case "nuclei":
      return <MoldShot frame={frame} />;
    case "cucumber":
      return <CucumberShot frame={frame} />;
    case "stand":
    case "pour":
      return <Stand frame={frame} />;
    case "dry":
      return <Dry frame={frame} />;
    case "coat":
      return <Coat frame={frame} />;
    case "slug":
      return <SlugShot frame={frame} />;
    case "damp":
      return <Damp frame={frame} />;
    case "nomouth":
      return <NoMouth frame={frame} />;
    case "amoeba":
      return <AmoebaShot frame={frame} />;
    case "engulf":
      return <Engulf frame={frame} />;
    case "acid":
    case "line":
      return <Acid frame={frame} />;
    case "stomach":
      return <StomachShot frame={frame} />;
    case "noheart":
      return <NoHeart frame={frame} />;
    case "cores":
      return <Cores frame={frame} />;
    default:
      return <End frame={frame} />;
  }
};
