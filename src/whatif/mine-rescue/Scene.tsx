import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { PaladinActor } from "../../artifacts/characters/paladin/PaladinActor";
import { Burst, GlowSprite } from "../../artifacts/dungeon";
import {
  Capsule,
  FitRing,
  HammerBit,
  MineWorld,
  PalomaTube,
  People,
  ProbeString,
  RationSet,
  Rod,
  ShelterFit,
  Sun,
  SurfaceCamp,
  Truck,
  minerLook,
  type CampRig,
  type Person,
} from "../../artifacts/mine";
import { CAST_ORDER, actorAct, actorGlasses, actorPlace, actorPos, actorResets, actorVisible, actorYaw } from "./actors";
import { camPose } from "./camera";
import { CAST, MINER_EQUIPMENT, MINER_WORKWEAR } from "./cast";
import {
  BEATS,
  CAP,
  FACE,
  FALL,
  PLANS,
  PROBES,
  RAMP,
  SH,
  SHAFT_R,
  SHOTS,
  SURF,
  TOP,
  TRUCK,
  TUBE,
  TUBE_LEN,
  WORLD,
  capsuleY,
  daylight,
  doorOpen,
  easeInOut,
  grindAmount,
  hatchOpen,
  lerp,
  noteOn,
  paintAmount,
  planBitY,
  planFrac,
  probePoint,
  probeProgress,
  probeTipY,
  progress,
  rampY,
  rigUp,
  truckX,
  tubeY,
  type V3,
} from "./timeline";

/**
 * Mine Rescue scene: one world (the cut mountain with the shelter at its foot and the camp on
 * top), everything that moves in it, and the cast. `World` without its humans, held on a given
 * frame (`at`), is what the set lab renders.
 */

const S = SHOTS;
const B = BEATS;
const W = SURF.winch;
const PX = SURF.probe;

/** The rest of the 33: sitting and standing about the shelter, out of the cast's way. */
const EXTRAS: Person[] = (() => {
  const list: Person[] = [];
  const cols = [-10.5, -9.68, -8.86, -8.04, -7.22, -6.4];
  const rows = [-1.95, -0.95, 0.05, 1.05];
  let i = 0;
  for (const z of rows) {
    for (const x of cols) {
      const jx = Math.sin(i * 12.9898) * 0.16;
      const jz = Math.cos(i * 78.233) * 0.14;
      const back = z < -1.5;
      list.push({ x: x + jx, z: back ? z + 0.05 : z + jz, yaw: back ? 0.2 * Math.sin(i * 3.7) : 0.9 + 0.5 * Math.sin(i * 5.1), pose: back || i % 6 === 4 ? "floor" : "stand", look: minerLook(i), size: 0.95 + 0.1 * Math.abs(Math.sin(i * 2.3)), phase: i * 1.9 });
      i++;
    }
  }
  // Three more at the edge of the group. The middle and right of the room are left to the cast,
  // so no close-up has one of these behind a face.
  list.push({ x: -5.7, z: 0.7, yaw: 0.8, pose: "stand", look: minerLook(25), phase: 4.1 });
  list.push({ x: -5.5, z: -0.5, yaw: 1.1, pose: "floor", look: minerLook(26), phase: 0.6 });
  list.push({ x: -5.8, z: 1.4, yaw: 0.6, pose: "stand", look: minerLook(27), phase: 2.2 });
  return list;
})();

/** The paloma once it is in the hero's hands: carried across his chest. */
const carried = (f: number): { pos: V3; dir: V3 } => {
  const at = actorPos("hero", f);
  const yaw = actorYaw("hero", f);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  return { pos: [at[0] + fx * 0.36 - fz * 0.72, at[1] + 1.12, at[2] + fz * 0.36 + fx * 0.72], dir: [fz, 0, -fx] };
};

/** A group whose +Y runs along `dir` from `pos`. */
const Along: React.FC<{ pos: V3; dir: V3; children: React.ReactNode }> = ({ pos, dir, children }) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dir[0], dir[1], dir[2]).normalize());
  return (
    <group position={pos} quaternion={q}>
      {children}
    </group>
  );
};

export const World: React.FC<{ humans?: boolean; at?: number }> = ({ humans = true, at }) => {
  const live = useCurrentFrame();
  const frame = at ?? live;
  const day = daylight(frame);
  const night = 1 - day;

  // One sun, aimed at whatever the camera is looking at, with a shadow box sized to the shot.
  const cam = camPose(frame);
  const dist = Math.hypot(cam.position[0] - cam.lookAt[0], cam.position[1] - cam.lookAt[1], cam.position[2] - cam.lookAt[2]);
  const extent = Math.max(8, Math.min(54, dist * 0.52 + 2));
  const focus: V3 = [cam.lookAt[0], cam.lookAt[1], Math.min(cam.lookAt[2], FACE)];
  const sunFrom: V3 = [focus[0] - 34, focus[1] + 52, focus[2] + 46];
  const skyTint = useMemo(() => new THREE.Color(), []);
  skyTint.set("#5f79a6").lerp(new THREE.Color("#fff3e2"), day);

  // --- Underground.
  const collapse = B.collapse;
  const tx = truckX(frame);
  const tubeShown = frame >= TUBE.show && frame < TUBE.gone;
  const tubeHeld = frame >= TUBE.caught;
  const tubePose = tubeHeld ? carried(frame) : { pos: [PX, tubeY(frame), FACE] as V3, dir: [0, 1, 0] as V3 };
  const hero = actorPos("hero", frame);
  const ringY = lerp(2.7, 0.35, easeInOut(progress(frame, [B.fiftyThree - 4, B.wide + 10])));
  const ringOn = progress(frame, [B.fiftyThree - 8, B.fiftyThree]) * (1 - progress(frame, [B.wide + 8, B.wide + 16]));
  const daysGone = progress(frame, [B.food, S.found]);

  // --- Holes.
  const probeDrilling = (k: number) => probeProgress(k, frame) > 0 && probeProgress(k, frame) < 1;
  const hitString = frame >= B.grinding - 30 && frame < S.life;
  const racing = frame >= B.race - 14;
  const bitY = planBitY(frame);
  const worn = frame < S.breakthrough ? progress(frame, [B.chews - 8, B.bits + 8]) : 0;
  const capY = capsuleY(frame);
  const showCapsule = frame >= S.phoenix;

  // --- The camp.
  const rigs: CampRig[] = [];
  if (frame < S.found) {
    [0, 1, 2].forEach((k) => {
      const up = k === 0 ? 1 : progress(frame, [BEATS[k === 1 ? "again1" : "again2"] - 26, BEATS[k === 1 ? "again1" : "again2"] - 16]);
      rigs.push({ x: PROBES[k].top, height: 7, color: "#e0b23a", up, turning: probeDrilling(k) });
    });
  }
  if (frame >= S.found - 40 && frame < S.race) rigs.push({ x: PX, height: 7, color: "#e0b23a", up: 1, turning: frame < B.bursts || (frame >= B.ride && frame < B.weAreFine) });
  if (frame >= S.race) {
    PLANS.forEach((p, k) => {
      if (k === 1 && frame >= S.phoenix) return;
      rigs.push({ x: p.top, height: 10.5, color: p.color, big: true, up: rigUp(k, frame), turning: racing && planFrac(k, frame) < 1 });
    });
  }
  const cheer = Math.max(
    progress(frame, [B.weAreFine + 6, B.weAreFine + 16]) * (frame < S.life ? 1 : 0),
    frame >= S.night && frame < S.end ? progress(frame, [B.ground + 6, B.ground + 16]) : 0,
    frame >= S.end ? 1 : 0
  );
  const glowWheels = progress(frame, [B.wheels - 4, B.wheels + 4]) * (1 - progress(frame, [B.wheels + 40, B.wheels + 50]));
  const glowO2 = progress(frame, [B.oxygen - 6, B.oxygen + 2]) * (1 - progress(frame, [B.oxygen + 22, B.oxygen + 30]));

  return (
    <>
      <hemisphereLight args={[skyTint, "#a8876a", lerp(0.85, 1.3, day)]} />
      <Sun position={sunFrom} target={focus} color={day > 0.5 ? "#fff0dc" : "#9db4e6"} intensity={lerp(0.9, 2.5, day)} extent={extent} />
      <directionalLight position={[-12, 10, 14]} intensity={lerp(0.25, 0.6, day)} color="#fff4e6" />

      <MineWorld
        frame={frame}
        L={WORLD}
        ramp={RAMP}
        shelter={SH}
        vent={{ x: SH.vent[0], w: SH.ventW, top: SH.ventTop }}
        fall={FALL}
        fallAt={collapse}
        probes={PROBES.map((p, k) => ({ top: [p.top, TOP] as [number, number], end: p.end, amount: probeProgress(k, frame) }))}
        bores={[0, 2].map((k) => ({ top: [PLANS[k].top, TOP] as [number, number], end: PLANS[k].end, amount: racing ? planFrac(k, frame) : 0, r: SHAFT_R }))}
        shaft={{ x: W, r: SHAFT_R, openTo: racing ? Math.max(SH.ceil, bitY + 0.02) : TOP + 1 }}
        daylight={day}
        measure={frame < S.shelterA + 6 ? progress(frame, [B.between + 8, B.sky + 2]) : 0}
      />

      {/* The truck that outran the fall, parked on the ramp for the rest of the story. */}
      <group position={[tx, rampY(tx), TRUCK.z]} rotation={[0, 0, Math.atan(WORLD.slope)]}>
        <Truck roll={(tx - TRUCK.from) / 0.42} lights={1} beacon={frame < TRUCK.stop + 40 ? 0.5 + 0.5 * Math.sin(frame * 0.8) : 0} />
      </group>

      {/* The shelter. */}
      <ShelterFit L={SH} cans={Math.round(lerp(9, 1, daysGone))} grind={grindAmount(frame)} burstAt={B.bursts} planBAt={B.breaks} lamps={1} />
      <group position={[SH.crate[0], 0.5, SH.crate[1]]}>
        <RationSet
          spoon={progress(frame, [B.spoons - 8, B.spoons + 8]) + progress(frame, [B.tuna - 2, B.tuna + 14])}
          milk={progress(frame, [B.sip - 6, B.milk + 12])}
          cracker={progress(frame, [B.bite, B.bite + 6])}
        />
      </group>
      {frame < S.end && <People people={EXTRAS} frame={frame} cheer={frame >= B.breaks + 4 && frame < S.phoenix ? 1 : 0} />}
      <FitRing position={[hero[0], hero[1] + ringY, hero[2] + 0.02]} opacity={ringOn} />

      {/* Probe strings: the three that miss while they drill, and the one that hits. */}
      {[0, 1, 2].map((k) => {
        if (!probeDrilling(k)) return null;
        const [x, y] = probePoint(k, probeProgress(k, frame));
        return (
          <group key={k}>
            <Rod a={[PROBES[k].top, TOP + 7, FACE]} b={[x, y + 0.1, FACE]} r={0.045} color="#8d9196" metalness={0.7} roughness={0.4} />
            <mesh position={[x, y + 0.04, FACE]} rotation={[Math.PI, frame * 0.6, 0]}>
              <coneGeometry args={[0.075, 0.16, 10]} />
              <meshStandardMaterial color="#6f7378" roughness={0.45} metalness={0.7} />
            </mesh>
          </group>
        );
      })}
      {hitString && (
        <group position={[PX, 0, FACE]}>
          <ProbeString tipY={probeTipY(frame)} topY={TOP + 7} paint={paintAmount(frame)} note={noteOn(frame)} spin={frame < B.bursts + 6 ? frame * 0.6 : 0} />
        </group>
      )}

      {/* The paloma on its line, then in the hero's hands. */}
      {tubeShown && (
        <>
          <Along pos={tubePose.pos} dir={tubePose.dir}>
            <PalomaTube len={TUBE_LEN} />
          </Along>
          {!tubeHeld && <Rod a={[PX, tubeY(frame) + TUBE_LEN, FACE]} b={[PX, TOP + 7, FACE]} r={0.008} color="#d8d8d8" metalness={0.6} />}
        </>
      )}

      {/* The three big drills: bits and pipe down their holes, sparks while Plan B grinds. */}
      {racing &&
        frame < S.phoenix &&
        PLANS.map((p, k) => {
          const t = planFrac(k, frame);
          const top: V3 = [p.top, TOP, FACE];
          const len = Math.hypot(p.end[0] - p.top, p.end[1] - TOP);
          const dir: V3 = [(p.top - p.end[0]) / len, (TOP - p.end[1]) / len, 0];
          const down = k === 1 ? TOP - bitY : len * t;
          return (
            <Along key={k} pos={top} dir={dir}>
              <HammerBit y={-down} topY={10} r={SHAFT_R - 0.03} spin={t < 1 ? frame * 0.5 : 0} worn={k === 1 ? worn : 0} />
            </Along>
          );
        })}
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <Burst key={k} at={S.bits + 4 + k * 13} position={[W, bitY - 0.02, FACE + 0.25]} count={22} size={0.1} duration={12} speed={0.13} direction={[0, 0.04, 0.04]} gravity={-0.01} spread={[0.5, 0.05, 0.2]} color="#ffd27a" additive seed={`grind-${k}`} />
      ))}
      <Burst at={B.bits} position={[W, bitY + 0.1, FACE + 0.3]} count={34} size={0.16} duration={24} speed={0.1} direction={[0, 0.05, 0.05]} gravity={-0.008} spread={[0.6, 0.1, 0.2]} color="#3a3530" seed="bit-chips" />

      {/* The camp, the capsule on its cable. */}
      <group position={[0, TOP, FACE]}>
        <SurfaceCamp frame={frame} daylight={day} rigs={rigs} winch={{ x: W, up: frame >= S.phoenix ? 1 : 0, cableTo: showCapsule ? capY + CAP.len + 0.05 : null }} cheer={cheer} />
      </group>
      {showCapsule && (
        <group position={[W, TOP + capY, FACE]}>
          <Capsule travel={capY} hatch={hatchOpen(frame)} door={doorOpen(frame)} doorYaw={Math.PI / 2} wheelGlow={glowWheels} oxygenGlow={glowO2} />
          {/* Inside light so the rider reads in the shaft. */}
          <pointLight position={[0, CAP.cabin0 + 1.6, 0.6]} intensity={1.6} distance={3} color="#fff1dc" />
        </group>
      )}
      {night > 0.3 && <GlowSprite position={[W, TOP + 0.3, FACE]} color="#fff1d8" size={1.4} opacity={0.25 * night} />}
      {humans &&
        CAST_ORDER.map((id) => (
          <PaladinActor
            key={id}
            character={CAST[id].spec}
            outfit={CAST[id].outfit}
            equipment={MINER_EQUIPMENT}
            workwear={(f) => ({ ...MINER_WORKWEAR, lamp: actorPlace(id, f) === "below", sunglasses: actorGlasses(id, f) })}
            lampIntensity={3}
            position={(f) => actorPos(id, f)}
            floorY={(f) => actorPos(id, f)[1]}
            yaw={(f) => actorYaw(id, f)}
            act={(f) => actorAct(id, f)}
            visible={(f) => actorVisible(id, f)}
            resets={actorResets(id)}
          />
        ))}
    </>
  );
};

export const Scene: React.FC = () => <World />;
