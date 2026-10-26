import type React from "react";
import { useCurrentFrame } from "remotion";
import {
  ArcaneCoilgun,
  ArmoredMantlet,
  BatDartMesh,
  Cable,
  CycloneShield,
  DartBattery,
  DartMesh,
  DioramaHall,
  DungeonPressurePlate,
  FloorPneumaticRams,
  HarpoonMesh,
  HydraulicBallista,
  MimicChest,
  RotaryGatlingTurret,
  ShotAt,
  SlowMoWake,
  SlugMesh,
  SmokingBoots,
  Streak,
  TrapEndWall,
  WallWinch,
} from "../../artifacts";
import { ActorView, FACE_CAMERA, FACE_RIGHT, HIP, dust, magic, sparks, type Actor } from "../../kit";
import {
  ARCH_X,
  BALLISTA_X,
  BEATS,
  BOLT_Y,
  CART_PUSH,
  CART_STRIDE,
  CART_TRIGGER_X,
  CEILING_Y,
  COIL_MUZZLE_X,
  CYCLONE_Y,
  DODGE_DARTS,
  GOBLIN_DARTS,
  GATLING_TARGET,
  GOBLIN_DEAD_X,
  GOBLIN_WALK,
  HALL_RIGHT,
  HARPOON_LEN,
  MAGE_FLIGHT,
  MAGE_STRIDE,
  MAGE_WALK,
  MAGE_X,
  MIMIC_X,
  MUZZLE_X,
  NOZZLES,
  NOZZLE_X,
  PALADIN_BATS,
  PALADIN_STRIDE,
  PALADIN_WALK,
  PALADIN_X,
  PARTY,
  PARTY_FLIGHT,
  PIN_X,
  PIN_Y,
  PLATE_X,
  RAMS_X,
  ROGUE_BATS,
  ROGUE_DEAD_X,
  ROGUE_HOP,
  ROGUE_LAND_X,
  ROGUE_LEAP,
  ROGUE_PLATE_X,
  ROGUE_RUN,
  SHIELD_X,
  TURRETS,
  WALL_X,
  WINCH,
  Z,
  cartX,
  dodgeDart,
  dodgeSlow,
  goblinBody,
  goblinDart,
  harpoon1,
  harpoon2,
  harpoonTail,
  mageBody,
  paladinBat,
  paladinBatHit,
  paladinBody,
  partyFlight,
  rogueBat,
  rogueBody,
  slug1,
  slug2,
  type Body,
  type Shot,
} from "./timeline";

/** Actor at a Body (hips pivot), facing right unless told otherwise. */
const at = (b: Body, pose: Actor["pose"], extra: Partial<Actor> = {}): Actor => ({
  pose,
  position: [b.x, b.y, Z],
  yaw: FACE_RIGHT,
  tilt: b.tilt,
  pivot: HIP,
  ...extra,
});
const standing = (x: number, pose: Actor["pose"], extra: Partial<Actor> = {}): Actor => ({
  pose,
  position: [x, 0, Z],
  yaw: FACE_RIGHT,
  ...extra,
});

// --- Goblin: walks onto the plate, double-takes, pin-cushioned, blown onto his back.
const goblinActor = (f: number): Actor => {
  const b = goblinBody(f);
  if (f < GOBLIN_WALK[1]) return standing(b.x, f < GOBLIN_WALK[0] ? "idle" : "walk", { expression: "happy" });
  if (f < BEATS.goblinTrigger + 12) return standing(PLATE_X, "idle", { expression: "neutral" });
  if (f < BEATS.goblinHit - 12) return standing(PLATE_X, "idle", { yaw: FACE_CAMERA, expression: "shock" });
  if (f < BEATS.goblinHit) return standing(PLATE_X, "cower", { expression: "scared" });
  if (f < BEATS.goblinHit + 10) return at(b, "fall", { expression: "pain" });
  return at(b, "sprawl", { expression: "dead" });
};

// --- Rogue: sprints in, hops the corpse onto the plate, bends back under the
// slow-motion volley, swaggers; backflip leap over the bats, hit from behind.
const rogueActor = (f: number): Actor | null => {
  if (f < ROGUE_RUN[0]) return null;
  const b = rogueBody(f);
  if (f < ROGUE_RUN[1]) return standing(b.x, "run", { speed: 2.2, expression: "focus" });
  if (f < ROGUE_HOP[1]) return at(b, "jump", { expression: "smug" });
  if (f < BEATS.matrixLean) return standing(ROGUE_PLATE_X, "idle", { expression: "smug" });
  // Slow-motion animation rate while the volley crawls over him.
  if (f < BEATS.matrixUp) return standing(ROGUE_PLATE_X, "matrix", { speed: 0.35, expression: "focus" });
  if (f < BEATS.swagger) return standing(ROGUE_PLATE_X, "cheer", { yaw: FACE_CAMERA, expression: "smug" });
  if (f < BEATS.batWings) return standing(ROGUE_PLATE_X, "point", { yaw: FACE_CAMERA, expression: "smug" });
  if (f < ROGUE_LEAP[0]) return standing(ROGUE_PLATE_X, "idle", { expression: "focus" });
  if (f < ROGUE_LEAP[1]) return at(b, "jump", { expression: "focus" });
  if (f < BEATS.uTurn + 4) return standing(ROGUE_LAND_X, "cheer", { yaw: FACE_CAMERA, expression: "smug" });
  if (f < BEATS.uTurn + 20) return standing(ROGUE_LAND_X, "idle", { yaw: FACE_CAMERA, expression: "shock" });
  if (f < BEATS.rogueHit) return standing(ROGUE_LAND_X, "cower", { expression: "scared" });
  if (f < BEATS.rogueHit + 9) return at(b, "fall", { expression: "pain" });
  return at(b, "sprawl", { expression: "dead" });
};

// --- Paladin: shield-walks in, blocks the bats, harpooned, reeled up and pinned to the wall.
const paladinActor = (f: number): Actor | null => {
  if (f < PALADIN_WALK[0]) return null;
  const b = paladinBody(f);
  if (f < PALADIN_WALK[1]) return standing(b.x, "shieldWalk", { speed: PALADIN_STRIDE });
  if (f < BEATS.bounce) return standing(PALADIN_X, "shield", { expression: "focus" });
  if (f < BEATS.rain + 8) return standing(PALADIN_X, "shield", { expression: "smug" });
  if (f < BEATS.ballistaInstall) return standing(PALADIN_X, "cheer", { yaw: FACE_CAMERA, expression: "smug" });
  if (f < BEATS.ballistaFire - 8) return standing(PALADIN_X, "shield", { expression: "shock" });
  if (f < BEATS.harpoonHit) return standing(PALADIN_X, "shield", { expression: "scared" });
  if (f < BEATS.reel) return at(b, "shield", { expression: "pain" });
  if (f < BEATS.pin) return at(b, "fall", { expression: "yell" });
  return at(b, "sprawl", { yaw: FACE_CAMERA, expression: "dead" });
};

// --- Mage: jogs in, cyclone, gloats, strains as the slug grinds, blasted out of his boots.
const mageActor = (f: number): Actor | null => {
  if (f < MAGE_WALK[0] || f >= MAGE_FLIGHT[1]) return null;
  const b = mageBody(f);
  if (f < MAGE_WALK[1]) return standing(b.x, "walk", { speed: MAGE_STRIDE, expression: "focus" });
  if (f < BEATS.deflect + 10) return standing(MAGE_X, "cast", { expression: "focus" });
  if (f < BEATS.upgrade) return standing(MAGE_X, "cast", { yaw: FACE_CAMERA, expression: "smug" });
  if (f < BEATS.slugHit) return standing(MAGE_X, "cast", { expression: "focus" });
  if (f < BEATS.shatter) return standing(MAGE_X, "cast", { expression: "angry" });
  if (f < BEATS.mageBlasted) return standing(MAGE_X, "idle", { yaw: FACE_CAMERA, expression: "scared" });
  return at(b, "launch", { yaw: FACE_CAMERA, expression: "shock" });
};

// --- Party (new rogue, paladin, mage): push the barricade, hide, creep onto the plate,
// cower in the crossfire, flung off the rams into the mimic. Swallowed on the chomp.
const partyActor = (i: number) => (f: number): Actor | null => {
  if (f < CART_PUSH[0] || f >= BEATS.mimicChomp) return null;
  const p = PARTY[i];
  const x = cartX(f) + p.dx;
  const z = Z + p.dz;
  const base = (pose: Actor["pose"], extra: Partial<Actor> = {}): Actor => ({ pose, position: [x, 0, z], yaw: FACE_RIGHT, ...extra });
  if (f < CART_PUSH[1]) return base("walk", { speed: CART_STRIDE });
  if (f < BEATS.turretsReveal + 10) return base("idle", { expression: "smug" });
  if (f < BEATS.creep) return base("cower", { yaw: FACE_CAMERA, expression: "scared" });
  if (f < BEATS.cartTrigger) return base("walk", { speed: 0.5, expression: "focus" });
  if (f < BEATS.gatlingSpin) return base("idle", { expression: "focus" });
  if (f < BEATS.splinter) return base("cower", { expression: "scared" });
  if (f < PARTY_FLIGHT[0]) return base("cower", { yaw: FACE_CAMERA, expression: "shock" });
  const b = partyFlight(i, f);
  return { pose: "fall", position: [b.x, b.y, z], yaw: FACE_RIGHT, tilt: b.tilt, pivot: HIP, expression: "shock" };
};

const SHOT_FLY_MIN = 0.02;
/** A dart in flight gets a streak; stuck darts don't. */
const DartView: React.FC<{ s: Shot | null; flying: boolean; bat?: boolean; flap?: number }> = ({ s, flying, bat, flap = 0 }) =>
  s ? (
    <ShotAt pos={s.pos} angle={s.angle}>
      {bat ? <BatDartMesh flap={flap} /> : <DartMesh />}
      {flying ? <Streak length={bat ? 0.5 : 0.9} from={bat ? 0.6 : 0.48} /> : null}
    </ShotAt>
  ) : null;

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const flap = Math.sin(frame * 1.3) * 0.75;

  const goblinDartHit = BEATS.goblinHit;
  const h1 = harpoon1(frame);
  const h2 = harpoon2(frame);
  const s1 = slug1(frame);
  const s2 = slug2(frame);

  return (
    <group>
      {/* ----------------- Set ----------------- */}
      <DioramaHall
        exit="left"
        right={HALL_RIGHT}
        archX={ARCH_X}
        pillarXs={[-8.4, -2.2, 0.8]}
        torchXs={[-3.6, -0.6, 2.2, 5.0]}
        ceilingY={CEILING_Y}
        bannerColor="#8b1e24"
      />
      <TrapEndWall x={WALL_X} right={HALL_RIGHT + 0.2} ceilingY={CEILING_Y} z={Z} />

      {/* ----------------- Level 1: plate + dart battery ----------------- */}
      <DungeonPressurePlate
        position={[PLATE_X, 0, Z]}
        spawnFrame={BEATS.plateInstall}
        pressWindows={[
          [BEATS.goblinTrigger, BEATS.goblinHit + 4],
          [ROGUE_HOP[1], ROGUE_LEAP[0] + 4],
        ]}
      />
      <DartBattery
        wallX={WALL_X}
        nozzles={NOZZLES}
        installFrame={BEATS.batteryInstall}
        openFrame={BEATS.nozzlesOpen}
        enchantFrame={BEATS.enchant}
        fireFrames={[goblinDartHit - 5, BEATS.matrix, BEATS.batFire, BEATS.paladinBatFire, BEATS.paladinBatFire + 15, BEATS.paladinBatFire + 30]}
        retractFrame={BEATS.ballistaInstall - 10}
      />
      {Array.from({ length: GOBLIN_DARTS }, (_, n) => (
        <DartView key={`gd${n}`} s={goblinDart(n, frame)} flying={frame < goblinDartHit + 2} />
      ))}
      {/* The high volley: bullet-time wake rings while it crawls over the rogue. */}
      {Array.from({ length: DODGE_DARTS }, (_, n) => {
        const s = dodgeDart(n, frame);
        if (!s) return null;
        const slow = dodgeSlow(frame);
        return (
          <ShotAt key={`dd${n}`} pos={s.pos} angle={s.angle}>
            <DartMesh />
            {slow ? <SlowMoWake frame={frame + n * 7} /> : <Streak length={0.9} from={0.48} />}
          </ShotAt>
        );
      })}

      {/* ----------------- Level 2: bat darts ----------------- */}
      {/* Enchanted bat darts peek out of the nozzles on "bat wings", then launch. */}
      {frame >= BEATS.batWings && frame < BEATS.batFire
        ? Array.from({ length: ROGUE_BATS }, (_, i) => {
            const [nx, ny, nz] = NOZZLES[i + 1];
            const peek = Math.min(1, (frame - BEATS.batWings - i) / 8);
            return peek > 0 ? <DartView key={`bp${i}`} s={{ pos: [nx - 0.25 * peek, ny, nz], angle: Math.PI }} flying={false} bat flap={flap} /> : null;
          })
        : null}
      {Array.from({ length: ROGUE_BATS }, (_, i) => {
        const s = rogueBat(i, frame);
        const flying = frame < BEATS.rogueHit + (i % 3);
        return <DartView key={`rb${i}`} s={s} flying={flying && !!s} bat flap={flying ? flap : -0.4} />;
      })}
      {Array.from({ length: PALADIN_BATS }, (_, k) => {
        const s = paladinBat(k, frame);
        const flying = frame < paladinBatHit(k);
        const resting = !!s && s.pos[1] < 0.05 + SHOT_FLY_MIN;
        return <DartView key={`pb${k}`} s={s} flying={flying} bat flap={resting ? -0.5 : flap} />;
      })}

      {/* ----------------- Level 3: ballista, winch, harpoons ----------------- */}
      <HydraulicBallista
        x={BALLISTA_X}
        z={Z}
        boltY={BOLT_Y}
        muzzle={MUZZLE_X - BALLISTA_X}
        harpoonLength={HARPOON_LEN}
        installFrame={BEATS.ballistaInstall}
        boltFrame={BEATS.ballistaBolted}
        liftFrame={BEATS.ballistaLift}
        shots={[
          [BEATS.harpoonLoad, BEATS.ballistaFire],
          [BEATS.pin + 24, BEATS.ballistaFire2],
        ]}
        sinkFrame={BEATS.upgrade - 6}
      />
      <WallWinch position={WINCH} installFrame={BEATS.ballistaInstall + 10} spin={[BEATS.winch, BEATS.pin]} slamFrame={BEATS.pin} />
      {h1 ? (
        <>
          <ShotAt pos={h1.pos} angle={h1.angle}>
            <HarpoonMesh length={HARPOON_LEN} />
            {frame < BEATS.harpoonHit ? <Streak length={1.4} from={HARPOON_LEN} width={0.04} /> : null}
          </ShotAt>
          <Cable a={harpoonTail(h1)} b={WINCH} radius={0.022} />
        </>
      ) : null}
      {h2 ? (
        <ShotAt pos={h2.pos} angle={h2.angle}>
          <HarpoonMesh length={HARPOON_LEN} />
        </ShotAt>
      ) : null}

      {/* ----------------- Level 4: cyclone, coilgun, boots ----------------- */}
      <CycloneShield position={[MAGE_X, 0, Z]} startFrame={BEATS.cyclone} strainFrame={BEATS.slugHit} shatterFrame={BEATS.shatter} />
      <ArcaneCoilgun
        x={BALLISTA_X}
        z={Z}
        boltY={CYCLONE_Y}
        muzzle={COIL_MUZZLE_X - BALLISTA_X}
        installFrame={BEATS.upgrade + 4}
        runeFrame={BEATS.arcane}
        coilFrame={BEATS.magnetic}
        capacitorFrame={BEATS.capacitors}
        shots={[
          [BEATS.capacitors, BEATS.coilFire],
          [BEATS.shatter + 12, BEATS.coilFire2],
        ]}
        sinkFrame={BEATS.coilgunSink}
      />
      {s1 ? (
        <ShotAt pos={s1.pos} angle={s1.angle}>
          <SlugMesh />
          <Streak length={1.2} from={0.42} width={0.05} color="#9ff6ff" />
        </ShotAt>
      ) : null}
      {s2 ? (
        <ShotAt pos={s2.pos} angle={s2.angle}>
          <SlugMesh />
          <Streak length={2.2} from={0.42} width={0.06} color="#9ff6ff" />
        </ShotAt>
      ) : null}
      <SmokingBoots position={[MAGE_X, 0, Z]} spawnFrame={BEATS.mageBlasted} />

      {/* ----------------- Level 5: turrets, barricade, rams, mimic ----------------- */}
      <DungeonPressurePlate position={[CART_TRIGGER_X - 0.2, 0, Z]} spawnFrame={CART_PUSH[0] + 40} pressWindows={[[BEATS.cartTrigger, BEATS.splinter]]} size={0.8} />
      {TURRETS.map((t) => (
        <RotaryGatlingTurret
          key={t.key}
          position={t.pos}
          mount={t.mount}
          revealFrame={BEATS.turretsReveal + (t.mount === "end" ? 8 : 0)}
          spinFrame={BEATS.gatlingSpin}
          fire={[BEATS.gatlingFire, BEATS.splinter + 6]}
          target={GATLING_TARGET}
        />
      ))}
      {frame >= CART_PUSH[0] ? <ArmoredMantlet x={cartX(frame)} z={Z} hitFrame={BEATS.gatlingFire} splinterFrame={BEATS.splinter} /> : null}
      <FloorPneumaticRams x={RAMS_X} z={Z} punchFrame={BEATS.ramPunch} retractFrame={BEATS.ramPunch + 24} />
      <MimicChest
        position={[MIMIC_X, 0, Z]}
        spawnFrame={BEATS.gatling}
        openFrame={BEATS.mimicOpen}
        chompFrame={BEATS.mimicChomp}
        burpFrame={BEATS.mimicBurp}
      />

      {/* ----------------- Contact bursts (keyed to the same beats as the SFX) ----------------- */}
      {dust(BEATS.plateInstall + 4, [PLATE_X, 0, Z], "plate-install", 0.5)}
      {dust(BEATS.batteryInstall + 6, [NOZZLE_X, 0.7, Z], "battery-install", 0.7)}
      {sparks(BEATS.goblinTrigger, [PLATE_X, 0.1, Z], "plate-goblin", "#ffb04a", 18)}
      {sparks(goblinDartHit, [PLATE_X + 0.15, 0.75, Z], "dart-goblin", "#ffd27a", 34)}
      {dust(goblinDartHit + 10, [GOBLIN_DEAD_X, 0, Z], "goblin-land", 0.9)}

      {dust(ROGUE_HOP[1], [ROGUE_PLATE_X, 0, Z], "rogue-plate", 0.5)}
      {sparks(ROGUE_HOP[1], [ROGUE_PLATE_X, 0.1, Z], "plate-rogue", "#ffb04a", 14)}
      {dust(BEATS.matrixLean, [ROGUE_PLATE_X, 0, Z], "matrix-lean", 0.4)}

      {magic(BEATS.enchant, [NOZZLE_X - 0.1, 0.72, Z], "enchant", "#c060ff", 40)}
      {magic(BEATS.batWings, [NOZZLE_X - 0.2, 0.72, Z], "bat-wings", "#ff4a6a", 24)}
      {dust(ROGUE_LEAP[1], [ROGUE_LAND_X, 0, Z], "rogue-leap-land", 0.7)}
      {sparks(BEATS.rogueHit, [ROGUE_LAND_X - 0.2, 0.95, Z], "bats-rogue", "#ff4a5a", 34)}
      {dust(BEATS.rogueHit + 9, [ROGUE_DEAD_X, 0, Z], "rogue-fall", 0.9)}

      {[0, 1, 2].map((wv) => sparks(paladinBatHit(wv * 3), [SHIELD_X + 0.05, 1.0, Z], `shield-${wv}`, "#ffe082", 26))}

      {dust(BEATS.ballistaInstall + 14, [BALLISTA_X, 0, Z], "ballista-rise", 1.2)}
      {sparks(BEATS.ballistaBolted, [BALLISTA_X, 0.3, Z], "ballista-bolts", "#ffd27a", 20)}
      {dust(BEATS.ballistaLift, [BALLISTA_X, 0.3, Z + 0.3], "ballista-hiss", 0.6)}
      {sparks(BEATS.harpoonHit, [SHIELD_X, BOLT_Y, Z], "harpoon-hit", "#ffffff", 50)}
      {dust(BEATS.reel, [PALADIN_X, 0, Z], "reel-yank", 0.8)}
      {dust(BEATS.pin, [PIN_X, PIN_Y + 0.9, Z], "pin-slam", 1.3)}
      {sparks(BEATS.pin, [PIN_X, PIN_Y + 1.0, Z], "pin-sparks", "#ffd27a", 30)}

      {magic(BEATS.cyclone, [MAGE_X, 1.1, Z], "cyclone", "#7de9ff", 36)}
      {sparks(BEATS.deflect, [MAGE_X + 1.0, BOLT_Y, Z], "deflect", "#bff6ff", 40)}
      {dust(BEATS.upgrade + 14, [BALLISTA_X, 0, Z], "coil-rise", 1.2)}
      {magic(BEATS.arcane, [BALLISTA_X, 0.4, Z + 0.6], "coil-runes", "#b45cff", 24)}
      {sparks(BEATS.slugHit, [MAGE_X + 1.0, CYCLONE_Y, Z], "slug-vortex", "#9ff6ff", 44)}
      {magic(BEATS.shatter, [MAGE_X, 1.1, Z], "shatter", "#9ff0ff", 60)}
      {sparks(BEATS.mageBlasted, [MAGE_X, 0.9, Z], "blast", "#9ff6ff", 50)}
      {dust(BEATS.mageBlasted, [MAGE_X, 0, Z], "blast-dust", 1.5)}

      {TURRETS.map((t) => dust(BEATS.turretsReveal + 6, t.pos, `reveal-${t.key}`, 0.6))}
      {sparks(BEATS.cartTrigger, [CART_TRIGGER_X - 0.2, 0.1, Z], "cart-plate", "#ffb04a", 18)}
      {[0, 1, 2, 3, 4, 5, 6].map((i) =>
        sparks(BEATS.gatlingFire + i * 8, [GATLING_TARGET[0] + 0.05, 0.6 + (i % 3) * 0.45, Z + ((i % 2) - 0.5) * 0.6], `flechette-${i}`, "#ffe866", 18)
      )}
      {dust(BEATS.splinter, [CART_TRIGGER_X, 0.9, Z], "splinter", 2.2)}
      {dust(BEATS.ramPunch, [RAMS_X, 0.1, Z], "rams", 1.6)}
      {dust(BEATS.mimicChomp, [MIMIC_X, 0.7, Z], "chomp", 1.4)}
      {sparks(BEATS.mimicBurp, [MIMIC_X - 0.4, 1.1, Z], "burp", "#ffd84d", 24)}

      {/* ----------------- Actors ----------------- */}
      <ActorView classType="goblin" actor={goblinActor(frame)} frame={frame} />
      <ActorView classType="rogue" actor={rogueActor(frame)} frame={frame} />
      <ActorView classType="paladin" actor={paladinActor(frame)} frame={frame} />
      <ActorView classType="mage" actor={mageActor(frame)} frame={frame} />
      <ActorView classType="rogue" actor={partyActor(0)(frame)} frame={frame} />
      <ActorView classType="paladin" actor={partyActor(1)(frame)} frame={frame} />
      <ActorView classType="mage" actor={partyActor(2)(frame)} frame={frame} />
    </group>
  );
};
