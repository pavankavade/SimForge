import type React from "react";
import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PaladinActor } from "../../artifacts/characters/paladin/PaladinActor";
import { Bike, Bundle, CaveWorld, DiverKit, Floodlight, Flashlight, Gush, Hose, LineTank, MiniSub, Pump, Rain, Stream } from "../../artifacts/cave";
import { Burst, GlowSprite } from "../../artifacts/dungeon";
import { People, Sun, type Person } from "../../artifacts/mine";
import { CAST_ORDER, RESETS, actorAct, actorCentre, actorPitch, actorPos, actorVisible, actorYaw } from "./actors";
import { camPose } from "./camera";
import { CAST, MINER_EQUIPMENT } from "./cast";
import {
  BACK,
  BEATS,
  BOUNDS,
  BUNDLES,
  DEPTH,
  DRIP,
  FACE,
  MOUTH_X,
  P1,
  PASSAGES,
  PROFILE,
  ROUTE,
  SHOTS,
  TANKS,
  bundleT,
  caveLight,
  daylight,
  easeInOut,
  floor3,
  lerp,
  lineY,
  progress,
  rainAmount,
  routeAt,
  surgeFront,
  traceT,
  volunteerLamp,
  waters,
  type V2,
  type V3,
} from "./timeline";

/**
 * Cave Rescue scene: one world (the limestone mountain with the cave winding down through it,
 * the jungle and the mouth outside), everything that moves in it, and the cast. `World` without
 * its humans, held on a given frame (`at`), is what the set lab renders.
 */

const S = SHOTS;
const B = BEATS;

/** Outside on this frame (the mouth in the rain, the pumps, the end in the sun). */
const outside = (f: number) => f < S.inside || (f >= S.pumps && f < S.dive) || (f >= S.sub && f < S.sleep) || f >= S.after;

/** The other boys on the ledge (the real cast are seven of the thirteen). */
const KIT_TOPS = ["#c8281e", "#2f4f9f", "#e8e4dc", "#e0b03a", "#2f8a4a", "#c8281e"];
const BACK_BOYS: Person[] = [
  { x: 20.2, z: -1.45, yaw: -1.3, pose: "floor", look: { suit: KIT_TOPS[0], pants: "#1c1d22", hat: null, skin: "#b98562", hair: "#141010" }, size: 0.8, phase: 0.4 },
  { x: 20.7, z: -0.4, yaw: -1.5, pose: "floor", look: { suit: KIT_TOPS[1], pants: "#1c1d22", hat: null, skin: "#c79670", hair: "#141010" }, size: 0.78, phase: 1.7 },
  { x: 20.5, z: 0.75, yaw: -1.7, pose: "floor", look: { suit: KIT_TOPS[2], pants: "#b8261e", hat: null, skin: "#a8744f", hair: "#141010" }, size: 0.84, phase: 2.6 },
  { x: 17.6, z: -1.6, yaw: -0.6, pose: "floor", look: { suit: KIT_TOPS[3], pants: "#2f4f9f", hat: null, skin: "#c79670", hair: "#141010" }, size: 0.76, phase: 3.3 },
  { x: 21.2, z: -1.25, yaw: -1.4, pose: "floor", look: { suit: KIT_TOPS[5], pants: "#1c1d22", hat: null, skin: "#a8744f", hair: "#141010" }, size: 0.82, phase: 5.1 },
];

const BIKES: Array<{ x: number; z: number; yaw: number; color: string }> = [
  { x: -5.9, z: -1.45, yaw: 0.25, color: "#c8281e" },
  { x: -5.1, z: -1.6, yaw: -0.2, color: "#2f4f9f" },
  { x: -6.8, z: -1.3, yaw: 0.4, color: "#2f8a4a" },
  { x: -4.3, z: -1.35, yaw: 0.1, color: "#e0b03a" },
  { x: -7.6, z: -1.55, yaw: -0.3, color: "#111111" },
  { x: -8.4, z: -1.25, yaw: 0.2, color: "#7a3b9e" },
  { x: -6.3, z: -1.75, yaw: 0.5, color: "#d8d4cc" },
];

/** The pumps by the mouth, their intake hoses into the cave and outlets gushing into the jungle. */
const PUMPS: V3[] = [
  [-7.7, 0, 1.0],
  [-6.1, 0, 0.95],
];
const intakeOf = (p: V3, k: number): V3[] => [
  [p[0], 0.4, p[2] - 0.55],
  [p[0] + 1.0, 0.1, p[2] - 0.9 - k * 0.2],
  [MOUTH_X + 0.6, 0.1, -0.4 + k * 0.6],
  [6, 0.1, -0.6 + k * 0.7],
  [9.4, 0.1, -0.8 + k * 0.6],
  [10.6, -1.0, -0.9 + k * 0.6],
];
const outletOf = (p: V3): V3[] => [
  [p[0] - 0.95, 0.4, p[2]],
  [p[0] - 1.8, 0.12, p[2] + 0.2],
  [p[0] - 3.6, 0.12, p[2] + 0.1],
];

/** Where the submarine is left, by the mouth. */
export const SUB_AT: V3 = [-4.1, 0, 1.35];

/** A group whose local frame is a human's: feet, facing (Y), lean (X), size. */
const Body: React.FC<{ pos: V3; yaw: number; pitch: number; scale: number; children: React.ReactNode }> = ({ pos, yaw, pitch, scale, children }) => (
  <group position={pos} rotation={[pitch, yaw, 0, "YXZ"]} scale={scale}>
    {children}
  </group>
);

/** The drip off the stalactite over the ledge: a drop every ~0.6 s, faster while the hero drinks. */
const Drips: React.FC<{ frame: number }> = ({ frame }) => {
  const floorY = floor3(DRIP[0]);
  const fall = DRIP[1] - (floorY + 1.1);
  return (
    <>
      {[0, 1, 2].map((k) => {
        const period = 18;
        const t = ((frame + k * 6) % period) / period;
        const y = DRIP[1] - 0.05 - fall * t * t;
        return (
          <mesh key={k} position={[DRIP[0], y, DRIP[2]]} scale={[0.02, 0.035, 0.02]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color="#cfe2ee" roughness={0.05} metalness={0.2} transparent opacity={0.85} />
          </mesh>
        );
      })}
      <GlowSprite position={[DRIP[0], DRIP[1] - 0.04, DRIP[2]]} color="#cfe8ff" size={0.18} opacity={0.6} />
    </>
  );
};

/** Murk drifting in the flooded passages (seen through the water's face). */
const Murk: React.FC<{ frame: number; centre: V2; w: number; h: number; count?: number }> = ({ frame, centre, w, h, count = 60 }) => (
  <>
    {Array.from({ length: count }, (_, i) => {
      const x = centre[0] + (random(`mk-x-${i}`) - 0.5) * w + Math.sin(frame * 0.02 + i) * 0.15;
      const y = centre[1] + (random(`mk-y-${i}`) - 0.5) * h + Math.cos(frame * 0.017 + i * 1.3) * 0.08;
      const z = BACK + 0.3 + random(`mk-z-${i}`) * (DEPTH - 0.4);
      return <GlowSprite key={i} position={[x, y, z]} color="#c7b48a" size={0.05 + random(`mk-s-${i}`) * 0.08} opacity={0.35} />;
    })}
  </>
);

/** The studio reflections the engine lights every scene with, dimmed with the cave's own light. */
const EnvDim: React.FC<{ k: number }> = ({ k }) => {
  const { scene } = useThree();
  scene.environmentIntensity = 0.4 * k;
  return null;
};

export const World: React.FC<{ humans?: boolean; at?: number }> = ({ humans = true, at }) => {
  const live = useCurrentFrame();
  const frame = at ?? live;
  const day = daylight(frame);
  const out = outside(frame);
  const cave = caveLight(frame);
  const wide = (frame >= S.whole && frame < S.ledge + 4) || (frame >= S.out && frame < S.after) || frame >= B.every - 4;

  // One key light, aimed at what the camera looks at, with a shadow box sized to the shot.
  const cam = camPose(frame);
  const dist = Math.hypot(cam.position[0] - cam.lookAt[0], cam.position[1] - cam.lookAt[1], cam.position[2] - cam.lookAt[2]);
  const extent = Math.max(6, Math.min(56, dist * 0.55 + 2));
  const focus: V3 = [cam.lookAt[0], cam.lookAt[1], Math.min(cam.lookAt[2], FACE)];
  const sunFrom: V3 = [focus[0] - 30, focus[1] + 46, focus[2] + 44];
  const sunny = frame >= S.after;
  const storm = sunny ? 0 : 1;
  const keyI = out || wide ? lerp(0.35, sunny ? 2.6 : 1.9, day) : 2.3 * cave;
  const fillI = out || wide ? lerp(0.35, sunny ? 1.25 : 1.1, day) : 0.04 + 1.2 * cave;
  const skyTint = useMemo(() => new THREE.Color(), []);
  skyTint.set(out || wide ? "#9fb2c6" : "#9aa6b8").lerp(new THREE.Color(sunny ? "#fff4e0" : "#dfe6ee"), day * 0.6);

  // --- Water, the line, the trace, the bundles.
  const wet = waters(frame);
  const lineOn = frame >= S.pumps;
  const trace = frame >= S.whole && frame < S.ledge - 12 ? traceT(frame) : 0;
  const bundles: V2[] = [];
  if (frame >= S.out && frame < S.after) {
    for (let i = 0; i < BUNDLES; i++) {
      const t = bundleT(i, frame);
      if (t !== null && t > 0 && t < 1) bundles.push(routeAt(1 - t));
    }
  }

  // --- The hero's kit: mask and wrap.
  const mask = frame >= S.tow ? 1 : easeInOut(progress(frame, [B.mask - 10, B.mask + 4]));
  const wrap = frame >= S.tow ? 1 : easeInOut(progress(frame, [B.stretcher - 4, B.wrapped + 16]));

  const flashOn = frame < S.whole;
  const rainOn = rainAmount(frame) * (out ? 1 : 0);
  const showBackBoys = frame >= B.muddy - 22 && frame < S.out && !(frame >= S.pumps && frame < S.found) && !(frame >= S.tanks && frame < S.sleep);

  return (
    <>
      <EnvDim k={out || wide ? 1 : Math.max(0.03, cave)} />
      <hemisphereLight args={[skyTint, "#8a7d68", fillI]} />
      <Sun position={sunFrom} target={focus} color={out || wide ? (sunny ? "#fff0d8" : "#e6ecf2") : "#eef2f6"} intensity={keyI} extent={extent} />
      <directionalLight position={[-12, 10, 14]} intensity={out || wide ? 0.5 : 0.35 * cave} color="#f4f0ea" />

      <CaveWorld
        face={FACE}
        depth={DEPTH}
        passages={PASSAGES}
        profile={PROFILE}
        bounds={BOUNDS}
        mouthX={MOUTH_X}
        waters={wet}
        line={lineOn ? ROUTE.slice(2, -2) : null}
        lineY={lineY}
        route={ROUTE}
        trace={trace}
        bundles={bundles}
        daylight={day}
        storm={storm}
      />

      {/* Outside: the bikes left at the mouth, the muddy stream running in, the pumps and lights. */}
      {BIKES.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.yaw, 0]}>
          <Bike color={b.color} />
        </group>
      ))}
      <Stream frame={frame} x0={MOUTH_X - 12} x1={MOUTH_X + 0.2} z0={-0.95} z1={0.45} speed={sunny ? 0.008 : 0.045} />
      {/* The monsoon pouring off the cliff over the mouth. */}
      {!sunny && out && <Rain frame={frame} center={[MOUTH_X - 0.35, 3.8, -0.3]} size={[0.6, 7.4, 3.4]} amount={1} count={420} />}
      {/* The surge's front: churned foam rolling along level 1 behind the boys. */}
      {frame >= S.inside && frame < S.whole + 30 && (
        <group position={[surgeFront(frame), 0.4, 0]}>
          {Array.from({ length: 14 }, (_, i) => (
            <mesh key={i} position={[-0.25 * random(`fm-x-${i}`) + 0.1 * Math.sin(frame * 0.6 + i), 0.04 * Math.sin(frame * 0.9 + i * 2), BACK + 0.2 + (i / 13) * (DEPTH - 0.4)]} scale={[0.22, 0.08, 0.2]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#e6dccb" roughness={0.4} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      )}
      {frame >= S.pumps &&
        PUMPS.map((p, k) => (
          <group key={k}>
            <group position={p}>
              <Pump frame={frame} />
            </group>
            <Hose points={intakeOf(p, k)} />
            <Hose points={outletOf(p)} color="#2a3550" r={0.09} />
            {!sunny && <Gush frame={frame} position={outletOf(p)[2]} />}
          </group>
        ))}
      {/* The kid-sized submarine, on its cradle by the mouth, where it was left. */}
      {frame >= S.sub && (
        <group position={SUB_AT} rotation={[0, 0.12, 0]}>
          <MiniSub />
        </group>
      )}
      {frame >= S.pumps && frame < S.end && (
        <group position={[-10.4, 0, 0.9]} rotation={[0, 0.2, 0]}>
          <Floodlight on={1 - day} />
        </group>
      )}
      {frame >= S.pumps && frame < S.end && day < 0.6 && <pointLight position={[-9.5, 2.4, 1.2]} intensity={14 * (1 - day)} distance={14} decay={1.5} color="#fff1d0" />}
      {rainOn > 0 && <Rain frame={frame} center={[cam.lookAt[0], cam.lookAt[1] + 1, 0]} size={[16, 14, 6]} amount={rainOn} />}

      {/* Inside: the drip over the ledge, murk in the bends, the tanks laid along the line. */}
      <Drips frame={frame} />
      {!wide && !out && (
        <>
          <Murk frame={frame} centre={[13.2, -1.5]} w={7} h={2} />
          <Murk frame={frame} centre={[18.6, -9.6]} w={9} h={1.4} />
          <Murk frame={frame} centre={[6.5, -19.2]} w={6} h={1.6} count={40} />
        </>
      )}
      {frame >= S.tanks &&
        TANKS.map((t, i) => (
          <group key={i} position={[t[0], t[1], t[2]]}>
            <LineTank />
            {frame >= B.laying - 4 && frame < S.sleep && <GlowSprite position={[0, 0, 0.4]} color="#ffd36a" size={1.6 * progress(frame, [B.laying - 4, B.tanks])} opacity={0.85} />}
          </group>
        ))}
      {showBackBoys && (
        <>
          {BACK_BOYS.map((p, i) => (
            <group key={i} position={[0, floor3(p.x), 0]}>
              <People people={[p]} frame={frame} cheer={frame >= B.alive - 6 && frame < S.wayOut ? 1 : 0} />
            </group>
          ))}
        </>
      )}

      {/* Splashes as the divers surface, bubbles while they swim. */}
      <Burst at={B.surface - 2} position={[10.4, -17.95, 0.3]} count={30} size={0.12} duration={26} speed={0.05} direction={[0, 0.05, 0.02]} gravity={-0.006} spread={[0.4, 0.05, 0.3]} color="#d8cdb4" seed="surf-1" />
      <Burst at={B.british + 6} position={[9.6, -17.95, -0.5]} count={26} size={0.11} duration={24} speed={0.05} direction={[0, 0.05, 0.02]} gravity={-0.006} spread={[0.4, 0.05, 0.3]} color="#d8cdb4" seed="surf-2" />

      {humans &&
        CAST_ORDER.map((id) => {
          const c = CAST[id];
          const isDiver = id === "d1" || id === "d2" || id === "d3";
          const pos = actorPos(id, frame);
          const yaw = actorYaw(id, frame);
          const pitch = actorPitch(id, frame);
          const shown = actorVisible(id, frame);
          const lamp = id === "d3" ? volunteerLamp(frame) : 1;
          const swimming = isDiver && pitch > 0.6;
          const torch = flashOn && (id === "hero" || id === "coach" || id === "b2");
          const bubbleAt = Math.floor(frame / 22) * 22;
          return (
            <group key={id}>
              <PaladinActor
                character={c.spec}
                outfit={c.outfit}
                equipment={MINER_EQUIPMENT}
                workwear={(f) => ({ ...c.workwear, lamp: isDiver ? (id === "d3" ? volunteerLamp(f) > 0.4 : true) : false })}
                lampIntensity={isDiver ? 3.2 : 0}
                scale={c.scale}
                position={(f) => actorPos(id, f)}
                floorY={(f) => actorPos(id, f)[1]}
                yaw={(f) => actorYaw(id, f)}
                pitch={(f) => actorPitch(id, f)}
                act={(f) => actorAct(id, f)}
                visible={(f) => actorVisible(id, f)}
                resets={RESETS}
              />
              {shown && swimming && (
                <Body pos={pos} yaw={yaw} pitch={pitch} scale={c.scale}>
                  <DiverKit lamp={lamp} />
                  {lamp > 0.05 && <GlowSprite position={[0, 1.78, 0.35]} color="#fff3d2" size={1.5} opacity={0.85 * lamp} />}
                </Body>
              )}
              {shown && isDiver && lamp > 0.05 && (
                <pointLight position={actorCentre(id, frame)} intensity={2.4 * lamp} distance={4.5} decay={1.8} color="#fff1d6" />
              )}
              {shown && swimming && lamp > 0.05 && (
                <Burst
                  key={bubbleAt}
                  at={bubbleAt}
                  position={[actorCentre(id, frame)[0] + Math.sin(yaw) * 0.75, actorCentre(id, frame)[1] + 0.25, actorCentre(id, frame)[2]]}
                  count={10}
                  size={0.05}
                  duration={22}
                  speed={0.02}
                  direction={[0, 0.03, 0]}
                  gravity={0}
                  spread={[0.12, 0.05, 0.12]}
                  color="#e8f2f6"
                  seed={`bub-${id}-${bubbleAt}`}
                />
              )}
              {shown && id === "hero" && frame >= S.sleep && frame < S.out && (
                <Body pos={pos} yaw={yaw} pitch={pitch} scale={c.scale}>
                  <Bundle mask={mask} wrap={wrap} />
                </Body>
              )}
              {shown && torch && (
                <group position={[pos[0] + Math.sin(yaw) * 0.34 * c.scale, pos[1] + 1.02 * c.scale, pos[2] + Math.cos(yaw) * 0.34 * c.scale]} rotation={[0, yaw - Math.PI / 2, 0]}>
                  <Flashlight spot={id !== "b2"} intensity={7} />
                </group>
              )}
            </group>
          );
        })}
      {/* Keep the mouth's cave water from reading as a hole: a faint warm bounce on level 1. */}
      {frame >= S.inside && frame < S.whole && <pointLight position={[P1[1][0], 3.2, 0.6]} intensity={3} distance={10} decay={1.6} color="#ffe1b8" />}
    </>
  );
};

export const Scene: React.FC = () => <World />;
