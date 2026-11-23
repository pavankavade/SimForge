import type React from "react";
import { useCurrentFrame } from "remotion";
import { Candle, DragonLair, Islet, Pasture, RocketNozzle, StaticModel, StoveTop } from "../../artifacts/bio/DragonSets";
import { DragonGuts } from "../../artifacts/bio/DragonGuts";
import { FireJet, Fireball, GasJet, SparkShower } from "../../artifacts/bio/Fire";
import { RealDragon, type DragonAnchors } from "../../artifacts/bio/RealDragon";
import type { Vec3 } from "../../engine/types";
import {
  BEATS,
  DRAGON_SCALE,
  FPS,
  HEAP,
  SNAPS,
  blinkAt,
  boomVisible,
  breathAt,
  burpAt,
  candleGust,
  charAt,
  clipsAt,
  cowBob,
  dragonPos,
  dragonYaw,
  eatenAt,
  emberAt,
  fermentAt,
  fillAt,
  flashbackAt,
  flashbackGlow,
  flowAt,
  glandAt,
  glandBurn,
  gutFire,
  headAt,
  ironAt,
  jawAt,
  leanAt,
  neckCurveAt,
  methaneAt,
  neckAt,
  neckFire,
  placeAt,
  shotAt,
  shotStart,
  squeezeAt,
  standoffAt,
  tankAt,
  xrayAt,
} from "./timeline";

/**
 * Dragon ("How a dragon survives its own fire"): the realistic dragon in its
 * cave, seen through an x-ray shell for the anatomy, with inserts of a cow
 * (pasture), a Komodo dragon (islet), a rocket engine and a stove. Only the
 * place on screen renders (`placeAt`).
 */

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Fire, gas, sparks and organs that ride the dragon (its own space: ×1/scale). */
const DragonFx: React.FC<{ a: DragonAnchors; frame: number }> = ({ a, frame }) => {
  const k = 1 / DRAGON_SCALE;
  const shot = shotAt(frame);
  const breath = breathAt(frame);
  const off = standoffAt(frame);
  const flameAt = add(a.mouth, a.mouthDir, off * k);
  const gut = gutFire(frame);
  const nf = neckFire(frame);
  return (
    <>
      <DragonGuts
        a={a}
        s={{
          show: xrayAt(frame),
          ferment: fermentAt(frame),
          methane: methaneAt(frame),
          tank: tankAt(frame),
          fill: fillAt(frame),
          squeeze: squeezeAt(frame),
          flow: flowAt(frame),
          flashback: flashbackAt(frame),
          back: flashbackGlow(frame),
          gland: glandAt(frame),
          burn: glandBurn(frame),
          char: charAt(frame),
        }}
      />
      {/* Fire stored in the belly (the hook). */}
      {gut > 0.01 ? <FireJet origin={add(a.gut, [0, -0.12, 0])} dir={[0, 1, 0]} power={gutFire} start={BEATS.fire - 6} length={0.3} width={0.14} count={180} life={14} seed="gutfire" lift={0} smoke={false} /> : null}
      {/* The gland incinerating the neck. */}
      {nf > 0.01 ? <FireJet origin={a.throat[a.throat.length - 2]} dir={[-0.4, -1, 0]} power={neckFire} start={BEATS.incinerates - 4} length={0.22} width={0.09} count={150} life={12} seed="neckfire" lift={0.6} smoke={false} /> : null}
      {/* Flint and steel at the lips: one shower per snap. */}
      {shot === "strike"
        ? SNAPS.map((t, i) => <SparkShower key={i} at={add(a.mouth, a.mouthDir, 0.04)} dir={a.mouthDir} frame0={t} count={120} speed={0.04} spread={1.2} size={0.02} gravity={0.0008} seed={`snap-${i}`} />)
        : null}
      {/* Methane venting past the lips. */}
      {shot === "lips" ? <GasJet origin={a.mouth} dir={add(a.mouthDir, [0, 0.4, 0])} power={() => 1} start={shotStart("lips")} length={0.22} width={0.05} count={90} opacity={0.22} /> : null}
      {/* The breath: a cool gas jet out of the mouth, the flame held off in front of it. */}
      {breath > 0.01 && off > 0.02 ? <GasJet origin={a.mouth} dir={a.mouthDir} power={breathAt} start={BEATS.blast - 4} length={off * k * 1.1} width={0.03} count={60} opacity={0.25} seed="breathgas" /> : null}
      {breath > 0.01 ? (
        <FireJet origin={flameAt} dir={a.mouthDir} power={breathAt} start={shot === "flashback" || shot === "clench" ? BEATS.backwards - 16 : BEATS.blast - 4} length={shot === "flashback" || shot === "clench" ? 0.2 : 1.6} width={shot === "flashback" || shot === "clench" ? 0.07 : 0.3} count={shot === "finale" || shot === "face" || shot === "blast" ? 480 : 160} life={18} seed="breath" lift={0.12} alpha={shot === "flashback" || shot === "clench" ? 0.5 : 0.55} blend={shot === "flashback" || shot === "clench" ? "add" : "mix"} />
      ) : null}
    </>
  );
};

const Lair: React.FC<{ frame: number }> = ({ frame }) => {
  const shot = shotAt(frame);
  const ember = emberAt(frame);
  return (
    <>
      <DragonLair heapAt={HEAP} eaten={eatenAt(frame)} embers={1} dim={shot === "fuel" || shot === "ferment" || shot === "stomach2" || shot === "pressure" || shot === "oxygen" ? 0.4 : 0} />
      {boomVisible(frame) ? null : (
        <RealDragon
          position={dragonPos(frame)}
          yaw={dragonYaw(frame)}
          scale={DRAGON_SCALE}
          pose={{ clips: clipsAt(frame), time: frame / FPS, jaw: jawAt(frame), neck: neckAt(frame), head: headAt(frame), neckCurve: neckCurveAt(frame), lean: leanAt(frame), blink: blinkAt(frame) }}
          xray={xrayAt(frame)}
          iron={ironAt(frame)}
          eyeGlow={0.35}
          innerGlow={neckFire(frame) > 0.01 ? { color: "#ff4010", amount: 0.08 * neckFire(frame) } : undefined}
        >
          {(a) => <DragonFx a={a} frame={frame} />}
        </RealDragon>
      )}
      {ember ? <SparkShower at={ember} dir={[1, -0.3, 0]} frame0={frame - 1} count={4} speed={0.01} spread={0.3} size={0.06} gravity={0} seed="ember" /> : null}
      <Fireball at={[0.5, 1.2, 0]} frame0={BEATS.detonates} radius={1.8} count={380} seed="belly-boom" dur={46} />
    </>
  );
};

const PastureShot: React.FC<{ frame: number }> = ({ frame }) => {
  const mouth: Vec3 = [1.08, 0.86, 0];
  return (
    <>
      <Pasture />
      <StaticModel path="bio/dragon/models/cow.glb" position={[0, 0, 0]} yaw={Math.PI / 2} length={2.3} bob={cowBob(frame)} />
      <Candle position={lerp3(mouth, [1.5, 0.66, 0], 1)} gust={candleGust(frame)} />
      {burpAt(frame) > 0.01 ? <GasJet origin={mouth} dir={[1, 0.05, 0]} power={burpAt} start={BEATS.burps - 4} length={0.38} width={0.09} count={70} color={[0.85, 0.9, 0.8]} opacity={0.25} seed="burp" /> : null}
    </>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const place = placeAt(frame);
  if (place === "pasture") return <PastureShot frame={frame} />;
  if (place === "islet")
    return (
      <>
        <Islet />
        <StaticModel path="bio/dragon/models/komodo.glb" position={[0, 0, 0]} yaw={-Math.PI / 2} length={2.6} />
      </>
    );
  if (place === "rocket") return <RocketNozzle start={shotStart("rocket")} />;
  if (place === "stove") return <StoveTop start={shotStart("stove")} />;
  return <Lair frame={frame} />;
};
