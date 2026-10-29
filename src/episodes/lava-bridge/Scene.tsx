import type React from "react";
import { useCurrentFrame } from "remotion";
import { BridgeSlab, DioramaHall, FloorTwoHub, LavaFlood, LavaGeyser, LavaPit, Skeleton, TreasureHoard } from "../../artifacts";
import { ActorView, CHAR_SCALE, FACE_CAMERA, FACE_LEFT, FACE_RIGHT, HIP, arc, dust, flamePuff, magic, slimeSplash, sparks, type Actor } from "../../kit";
import {
  BARB_FALL,
  BARB_LAND_X,
  BARB_SEG,
  BARB_SPLASH,
  BARB_WALK,
  HUB_CUT,
  HUB_IN,
  HUB_WALK,
  hubBarb,
  BARD_BACK,
  BARD_ENTER,
  BEATS,
  CEILING_Y,
  EDGE_X,
  FALLS_X,
  FLOOD_Y,
  GEYSER_XS,
  GOLD_PILE_X,
  HALL_LEFT,
  HALL_RIGHT,
  LAKE_L,
  MAGE1_ENTER,
  MAGE2_ENTER,
  MAGE2_HOP,
  PARTY,
  PARTY_Z,
  OVER_FALLS,
  PAL_ENTER,
  ROGUE2_ENTER,
  ROGUE2_SEG,
  ROGUE_DIVE,
  ROGUE_ENTER,
  ROGUE_FLIP,
  SEG_W,
  SEG_XS,
  SURF_HOP,
  VAULT_LEDGE,
  VAULT_X,
  VENT_XS,
  Z,
  barbX,
  barbY,
  bardX,
  currentK,
  drift,
  easeInOut,
  floater,
  frostX,
  lavaGlow,
  lavaY,
  mage1X,
  mage1Y,
  engulfAt,
  memberHop,
  memberIn,
  memberStopX,
  memberX,
  memberY,
  memberZ,
  palX,
  palY,
  progress,
  rogue2X,
  rogueX,
  slab,
  waveRun,
  waveX,
} from "./timeline";

/**
 * What is on screen. One `xxxActor(frame): Actor | null` per character:
 * null before they enter and never again after they leave. Everyone who goes
 * into the lava comes back up as a skeleton (and rides the current over the
 * falls in level 4); the last mage floats on the flood.
 */

const LAVA_ORANGE = "#ff8a2a";
/** Per geyser: two demo blasts on "geysers", the launch, and the two rides (column peaks 8 frames in). */
const ERUPTIONS = [[BEATS.geyserDemo], [BEATS.geyserDemo + 12, BEATS.ride1 - 4], [BEATS.launch - 3, BEATS.ride2 - 4]];

// ---------------------------------------------------------------------------
// Cold open + level 1: the barbarian drops into floor two's hub and takes door
// I; in the lava hall he plods onto the bridge, and the slab under him gives
// way (he hangs in the air for a beat first).
// ---------------------------------------------------------------------------
const barbActor = (frame: number): Actor | null => {
  if (frame < BARB_FALL[0]) return null;
  if (frame < BARB_FALL[1]) {
    const t = progress(frame, BARB_FALL);
    return { pose: "fall", position: [BARB_LAND_X, (CEILING_Y - 1.4) * (1 - t * t), Z], yaw: FACE_CAMERA, expression: "yell" };
  }
  // Superhero landing, then a flex for the camera.
  if (frame < BARB_FALL[1] + 12) return { pose: "smash", position: [BARB_LAND_X, 0, Z], yaw: FACE_CAMERA + 0.3, expression: "angry" };
  if (frame < HUB_WALK[0]) return { pose: "cheer", position: [BARB_LAND_X, 0, Z], yaw: FACE_CAMERA + 0.25, expression: "yell", speed: 0.7 };
  // Over to door I and into its dark passage (the passage plane hides him as he goes).
  if (frame < HUB_IN[0]) return { pose: "walk", position: [hubBarb(frame)[0], 0, Z], yaw: FACE_LEFT, speed: 0.8, expression: "smug" };
  if (frame < HUB_IN[1]) {
    const [x, z] = hubBarb(frame);
    return { pose: "walk", position: [x, 0, z], yaw: Math.PI, speed: 0.8 };
  }
  if (frame < BARB_WALK[0]) return null;
  if (frame < BARB_WALK[1]) return { pose: "walk", position: [barbX(frame), 0, Z], yaw: FACE_RIGHT, speed: 0.8, expression: "smug" };
  if (frame < BEATS.barbSlabDrop) return { pose: "smash", position: [SEG_XS[BARB_SEG], 0, Z], yaw: FACE_RIGHT - 0.4, expression: "smug" };
  // The slab is gone: he notices, then drops.
  if (frame < BEATS.barbDrop) return { pose: "cower", position: [SEG_XS[BARB_SEG], 0, Z], yaw: FACE_CAMERA + 0.2, expression: "scared" };
  if (frame < BARB_SPLASH + 4) return { pose: "fall", position: [SEG_XS[BARB_SEG], barbY(frame), Z], yaw: FACE_CAMERA, expression: "scared" };
  return null;
};

// ---------------------------------------------------------------------------
// Level 1 counter: the rogue outruns the collapse, backflips the last gap,
// bows, and dives into the gold.
// ---------------------------------------------------------------------------
const rogueActor = (frame: number): Actor | null => {
  if (frame < ROGUE_ENTER[0] || frame >= ROGUE_DIVE[1]) return null;
  const x = rogueX(frame);
  if (frame < ROGUE_ENTER[1]) return { pose: "run", position: [x, 0, Z], yaw: FACE_RIGHT, speed: 1.6 };
  if (frame < ROGUE_FLIP[0]) return { pose: "run", position: [x, 0, Z], yaw: FACE_RIGHT, speed: 2.6, expression: "smug" };
  if (frame < ROGUE_FLIP[1]) {
    const t = progress(frame, ROGUE_FLIP);
    return { pose: "jump", position: [x, arc(t, 1.5), Z], yaw: FACE_RIGHT, tilt: Math.PI * 2 * easeInOut(t), pivot: HIP, expression: "happy" };
  }
  if (frame < ROGUE_DIVE[0]) return { pose: "cheer", position: [x, 0, Z], yaw: FACE_CAMERA + 0.3, expression: "smug" };
  const t = progress(frame, ROGUE_DIVE);
  return { pose: "fly", position: [x, arc(t, 1.4) + 0.3 * (1 - t), Z], yaw: FACE_RIGHT, tilt: -1.2 - t * 0.5, pivot: HIP, expression: "happy" };
};

// ---------------------------------------------------------------------------
// Level 2: the next rogue reaches the middle just as both ends collapse, and
// sinks with his slab.
// ---------------------------------------------------------------------------
const rogue2Actor = (frame: number): Actor | null => {
  if (frame < ROGUE2_ENTER[0]) return null;
  const x = rogue2X(frame);
  if (frame < ROGUE2_ENTER[1]) return { pose: "run", position: [x, 0, Z], yaw: FACE_RIGHT, speed: 1.6 };
  const s = slab(ROGUE2_SEG, frame);
  if (!s.visible) return null;
  if (frame < BEATS.stranded) {
    const look = Math.sin((frame - ROGUE2_ENTER[1]) * 0.25) * 0.7;
    return { pose: "idle", position: [x, 0, Z], yaw: FACE_CAMERA + look, expression: "shock" };
  }
  return { pose: "cower", position: [x, s.y, Z], yaw: FACE_CAMERA, expression: "scared" };
};

// ---------------------------------------------------------------------------
// Level 2 counter / level 3 victim: the mage floats out over the lake and a
// geyser launches him sky-high.
// ---------------------------------------------------------------------------
const mage1Actor = (frame: number): Actor | null => {
  if (frame < MAGE1_ENTER[0] || frame >= BEATS.mageSplash) return null;
  const x = mage1X(frame);
  const y = mage1Y(frame);
  if (frame < MAGE1_ENTER[1]) return { pose: "walk", position: [x, 0, Z], yaw: FACE_RIGHT };
  if (frame < BEATS.launch) return { pose: "float", position: [x, y, Z], yaw: FACE_CAMERA + 0.55, expression: frame < BEATS.geyserDemo + 4 ? "smug" : "shock" };
  return { pose: "launch", position: [x, y, Z], yaw: FACE_CAMERA, tilt: (frame - BEATS.launch) * 0.25, pivot: HIP, expression: "shock" };
};

// ---------------------------------------------------------------------------
// Level 3 counter / level 4 victim: the paladin surfs his shield, rides two
// geysers, and the current takes him over the lava waterfall.
// ---------------------------------------------------------------------------
const palActor = (frame: number): Actor | null => {
  if (frame < PAL_ENTER[0]) return null;
  const x = palX(frame);
  const y = palY(frame);
  if (y < -6) return null;
  if (frame < SURF_HOP[0]) return { pose: "walk", position: [x, 0, Z], yaw: FACE_RIGHT, speed: 1.1 };
  if (frame < SURF_HOP[1]) return { pose: "jump", position: [x, y, Z], yaw: FACE_RIGHT - 0.6, expression: "happy" };
  if (frame >= OVER_FALLS) return { pose: "fall", position: [x, y, Z], yaw: FACE_CAMERA, expression: "scared" };
  const riding = frame >= BEATS.ride1 && frame < BEATS.ride2 + 30 && y > -0.5;
  const worried = frame >= BEATS.current + 6;
  return { pose: "surf", position: [x, y, Z], yaw: FACE_CAMERA, expression: worried ? "shock" : riding ? "yell" : "happy" };
};

// ---------------------------------------------------------------------------
// Level 4 counter / level 5 victims: the second mage brings the whole party.
// He freezes the lake, they all stroll across, and the wave takes them from
// the back of the line forward.
// ---------------------------------------------------------------------------
const partyActor = (i: number, frame: number): Actor | null => {
  if (!memberIn(i, frame)) return null;
  const x = memberX(i, frame);
  if (frame >= engulfAt(x)) return null;
  const y = memberY(i, frame);
  const z = memberZ(i, frame);
  const hop = memberHop(i, frame);
  const moving = Math.abs(memberX(i, frame + 1) - x) > 0.01;
  const leader = i === 0;
  if (hop > 0 && hop < 1) return { pose: "jump", position: [x, y, z], yaw: FACE_RIGHT, expression: "happy" };
  if (leader && frame >= MAGE2_ENTER[1] && frame < MAGE2_HOP[0]) {
    return { pose: "cast", position: [x, 0, Z], yaw: FACE_RIGHT - 0.3, expression: "focus" };
  }
  if (frame >= BEATS.ventsOpen) return { pose: "cower", position: [x, y, z], yaw: FACE_LEFT + 0.6, expression: "scared" };
  if (frame >= BEATS.cracks) return { pose: "idle", position: [x, y, z], yaw: FACE_CAMERA, expression: "shock" };
  if (moving) {
    const onIce = hop >= 1;
    return { pose: "walk", position: [x, y, z], yaw: FACE_RIGHT - (onIce ? 0.3 : 0), speed: onIce ? 0.8 : 1, expression: onIce ? "smug" : undefined };
  }
  // Waiting in line for the freeze, or arrived on the ice.
  return { pose: hop >= 1 && i === 1 ? "cheer" : "idle", position: [x, y, z], yaw: FACE_CAMERA + 0.4, expression: hop >= 1 ? "smug" : "neutral" };
};

// ---------------------------------------------------------------------------
// Cameo: the bard steps into the doorway, plays one sad note, backs away.
// ---------------------------------------------------------------------------
const bardActor = (frame: number): Actor | null => {
  if (frame < BARD_ENTER[0] || frame >= BARD_BACK[1]) return null;
  const x = bardX(frame);
  if (frame < BEATS.bardPeek) return { pose: "walk", position: [x, 0, Z], yaw: FACE_RIGHT };
  if (frame < BEATS.bardPlay) return { pose: "idle", position: [x, 0, Z], yaw: FACE_RIGHT - 0.5, tilt: -0.18, pivot: HIP, expression: "shock" };
  if (frame < BEATS.bardBack) return { pose: "play", position: [x, 0, Z], yaw: FACE_CAMERA + 0.5, expression: "sad" };
  return { pose: "walk", position: [x, 0, Z], yaw: FACE_RIGHT - 0.3, speed: -0.9, expression: "sad" };
};

/** A skeleton floating on its back, head toward -x, face up. */
const Floater: React.FC<{ variant: "barbarian" | "rogue" | "mage" | "paladin"; x0: number; since: number; frame: number; scale?: number; fixedY?: number }> = ({
  variant,
  x0,
  since,
  frame,
  scale = 1,
  fixedY,
}) => {
  const f = fixedY === undefined ? floater(x0, since, frame) : { x: x0, y: fixedY + 0.04 * Math.sin(frame * 0.15), rise: 1, gone: frame < since };
  if (!f || f.gone || (fixedY !== undefined && frame < since)) return null;
  const s = CHAR_SCALE * scale;
  return (
    <Skeleton
      variant={variant}
      position={[f.x + 0.8 * s, f.y - 0.12 + 0.12 * f.rise, Z + 0.1]}
      rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      scale={s}
      animFrame={frame}
    />
  );
};

/** The lava hall itself: set, lake, bridge, geysers, the vault and the flood. */
const LavaHall: React.FC<{ frame: number }> = ({ frame }) => {
  const surfaceY = lavaY(frame);
  const crack = progress(frame, [BEATS.cracks - 4, BEATS.cracks + 12]);
  const geyserDead = BEATS.freeze + 10;
  return (
    <>
      <DioramaHall
        exit="left"
        exitStyle="door"
        left={HALL_LEFT}
        right={HALL_RIGHT}
        ceilingY={CEILING_Y}
        floorGaps={[[LAKE_L, VAULT_LEDGE]]}
        archX={VAULT_X}
        bannerColor="#6a1a20"
        pillarXs={[-8.6, -5.6, 4.9, 9.8]}
        torchXs={[-7.1, -3.2, 1.6, 5.8, 8.7]}
      />
      <LavaPit
        left={LAKE_L}
        fallsX={FALLS_X}
        right={VAULT_LEDGE}
        surfaceY={surfaceY}
        glow={lavaGlow(frame)}
        flow={currentK(frame)}
        drift={drift(frame)}
        frostX={frostX(frame)}
        crack={crack}
        z={Z}
      />
      {SEG_XS.map((_, i) => {
        const s = slab(i, frame);
        return s.visible ? <BridgeSlab key={i} x={s.x} y={s.y} tilt={s.tilt} width={SEG_W} crack={s.crack} rune={s.rune} z={Z} seed={i} /> : null;
      })}
      {GEYSER_XS.map((gx, i) => (
        <LavaGeyser
          key={gx}
          x={gx}
          surfaceY={surfaceY}
          installFrame={BEATS.geyserInstall + i * 6}
          eruptions={ERUPTIONS[i]}
          deadFrom={geyserDead}
          z={Z}
        />
      ))}
      <TreasureHoard x={VAULT_X} z={Z} splashAt={BEATS.coins} splashX={GOLD_PILE_X} />
      <LavaFlood ventXs={VENT_XS} openFrame={BEATS.ventsOpen} frontX={waveX(frame)} run={waveRun(frame)} left={HALL_LEFT + 0.2} right={HALL_RIGHT} floodY={FLOOD_Y} z={Z} />
    </>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {/* Cold open in floor two's hub; the cut to the lava hall comes with the lava. */}
      {frame < HUB_CUT ? <FloorTwoHub doorOpen={[BEATS.doorOpen]} breachAt={BEATS.punch} z={Z} /> : <LavaHall frame={frame} />}

      <ActorView classType="barbarian" actor={barbActor} frame={frame} />
      <ActorView classType="rogue" actor={rogueActor} frame={frame} />
      <ActorView classType="rogue" actor={rogue2Actor} frame={frame} />
      <ActorView classType="mage" actor={mage1Actor} frame={frame} />
      <ActorView classType="paladin" actor={palActor} frame={frame} />
      {PARTY.map((m, i) => (
        <ActorView key={m.cls} classType={m.cls} actor={(f) => partyActor(i, f)} frame={frame} />
      ))}
      <ActorView classType="bard" actor={bardActor} frame={frame} />

      {/* Everyone who went in comes back up as bones; the current takes them over the falls. */}
      {frame < BEATS.wave + 10 ? (
        <>
          <Floater variant="barbarian" x0={SEG_XS[BARB_SEG]} since={BEATS.barbBones} frame={frame} scale={1.2} />
          <Floater variant="rogue" x0={SEG_XS[ROGUE2_SEG]} since={BEATS.rogue2Under + 14} frame={frame} />
          <Floater variant="mage" x0={mage1X(BEATS.mageSplash)} since={BEATS.mageSplash + 16} frame={frame} />
        </>
      ) : null}
      {PARTY.map((m, i) => (
        <Floater key={m.cls} variant={m.cls} x0={memberStopX(i) + 1.1 - i * 0.15} since={BEATS.flooded - 4 + i * 5} frame={frame} fixedY={FLOOD_Y} scale={m.cls === "barbarian" ? 1.2 : 1} />
      ))}

      {/* Every contact gets a burst, keyed to the same beat as its SFX. */}
      {dust(BEATS.punch, [BARB_LAND_X, CEILING_Y - 0.3, Z], "breach-dust", 1.2)}
      {dust(BEATS.land, [BARB_LAND_X, 0.05, Z], "barb-land", 1.4)}
      {dust(BEATS.barbSlabDrop, [SEG_XS[BARB_SEG], -0.2, Z], "barb-slab", 0.8)}
      {slimeSplash(BARB_SPLASH, [SEG_XS[BARB_SEG], -0.7, Z + 0.2], "barb-splash", 1.6, LAVA_ORANGE)}
      {flamePuff(BARB_SPLASH, [SEG_XS[BARB_SEG], -0.6, Z + 0.2], "barb-puff", 1.2)}
      {SEG_XS.slice(0, 7).map((x, i) => dust(BEATS.rogueSprint + 6 + i * 9, [x, -0.25, Z], `sprint-dust-${i}`, 0.5))}
      {dust(BEATS.lastGapFalls, [SEG_XS[7], -0.2, Z], "last-gap", 0.8)}
      {dust(ROGUE_FLIP[1], [VAULT_LEDGE + 0.55, 0.05, Z], "flip-land", 0.5)}
      {sparks(BEATS.coins, [GOLD_PILE_X, 0.9, Z + 0.3], "coin-sparks", "#ffe08a", 36)}
      {magic(BEATS.bothEnds, [SEG_XS[0], 0.3, Z], "rune-l", "#ff4a4a")}
      {magic(BEATS.bothEnds, [SEG_XS[7], 0.3, Z], "rune-r", "#ff4a4a")}
      {[0, 1, 2, 3].map((k) => dust(BEATS.collapse + k * 9, [k === 3 ? SEG_XS[4] : SEG_XS[k], -0.2, Z], `collapse-${k}`, 0.7))}
      {flamePuff(BEATS.rogue2Under, [SEG_XS[ROGUE2_SEG], -0.6, Z + 0.2], "rogue2-puff", 1.0)}
      {magic(BEATS.mageFloat, [EDGE_X + 0.3, 0.6, Z], "float-magic", "#b79bff")}
      {flamePuff(BEATS.launch, [GEYSER_XS[2], 0.6, Z + 0.2], "launch-puff", 1.3)}
      {slimeSplash(BEATS.mageSplash, [mage1X(BEATS.mageSplash), -0.7, Z + 0.2], "mage-splash", 1.4, LAVA_ORANGE)}
      {flamePuff(BEATS.mageSplash, [mage1X(BEATS.mageSplash), -0.6, Z + 0.2], "mage-puff", 1.0)}
      {slimeSplash(SURF_HOP[1], [LAKE_L + 0.5, -0.7, Z + 0.2], "surf-land", 0.8, LAVA_ORANGE)}
      {[BEATS.ride1, BEATS.ride2].map((r, i) => slimeSplash(r + 26, [GEYSER_XS[i + 1] + 0.2, -0.7, Z + 0.2], `ride-land-${i}`, 0.9, LAVA_ORANGE))}
      {[0, 1, 2, 3, 4, 5].map((k) => magic(BEATS.freeze + k * 6, [LAKE_L + 0.4 + k * 1.4, -0.5, Z], `frost-${k}`, "#9fe2ff", 30))}
      {PARTY.map((m) => dust(MAGE2_HOP[1] + m.delay, [LAKE_L + 0.6, -0.72, Z + 0.4], `hop-${m.cls}`, 0.5))}
      {PARTY.map((m, i) => flamePuff(engulfAt(memberStopX(i)), [memberStopX(i), 0.6, PARTY_Z], `engulf-${m.cls}`, 1.4))}
      {VENT_XS.map((vx) => flamePuff(BEATS.ventsOpen + 4, [vx, 1.3, Z - 1.2], `vent-${vx}`, 1.0))}
      {magic(BEATS.sadNote, [bardX(BEATS.sadNote) + 0.4, 1.3, Z + 0.2], "sad-note", "#9bb8ff", 10)}
    </>
  );
};
