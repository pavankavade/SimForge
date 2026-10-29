import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import { useSurface } from "../../../engine/materials";
import { makeGranite } from "../../../engine/textures";
import { clamp01, easeOutBack, progress, wobble } from "../../../kit/motion";
import {
  BEATS,
  DOOR_H,
  DOOR_Z,
  RUBBLE_FALL,
  SHED_H,
  SHED_ON,
  SHED_X,
  SHED_X0,
  SHED_X1,
  SHED_Z0,
  TRUCK_HIT,
  TRUCK_LEN,
  TRUCK_Z,
  doorAngle,
  truckX,
} from "../timeline";

const DOOR_W = DOOR_Z[1] - DOOR_Z[0];

/**
 * Concrete headhouse over the bent entrance, with the blast door on its lawn
 * side: rattled by the "truck" gag, hung to swing outward, slammed back into
 * its frame by the blast, then buried by rubble and jiggled from inside.
 */
export const Shed: React.FC<{ frame: number }> = ({ frame }) => {
  const concrete = useSurface("nb-concrete", () => makeGranite({ base: "#c9c4ba", baseAlt: "#d8d3c8", darkVein: "#a8a296", seed: 8 }), [1.2, 1.2]);
  if (frame < SHED_ON) return null;
  const pop = easeOutBack(progress(frame, [SHED_ON, SHED_ON + 12]), 1.3);
  const depth = -SHED_Z0;
  const rattle = wobble(frame, TRUCK_HIT, 0.12, 1.4, 5);
  // Trapped: someone inside pushes, the door barely budges.
  const push = frame >= BEATS.trapped - 6 && frame < BEATS.trapped + 24 ? Math.max(0, Math.sin((frame - BEATS.trapped) * 0.9)) * 0.05 : 0;
  const angle = doorAngle(frame) + rattle + push;

  return (
    <group scale={[1, pop, 1]}>
      {/* Walls, roof slab, hazard band */}
      <mesh position={[SHED_X, SHED_H / 2, SHED_Z0 / 2]} castShadow receiveShadow>
        <boxGeometry args={[SHED_X1 - SHED_X0, SHED_H, depth]} />
        <meshStandardMaterial {...concrete} roughness={0.95} />
      </mesh>
      <mesh position={[SHED_X, SHED_H + 0.1, SHED_Z0 / 2]} castShadow>
        <boxGeometry args={[SHED_X1 - SHED_X0 + 0.4, 0.2, depth + 0.4]} />
        <meshStandardMaterial {...concrete} color="#e8e4dc" roughness={0.95} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[SHED_X1 + 0.005, SHED_H - 0.22, SHED_Z0 + 0.1 + i * (depth - 0.2) / 8]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[0.02, 0.12, 0.2]} />
          <meshStandardMaterial color={i % 2 ? "#1d1d22" : "#f2c14e"} />
        </mesh>
      ))}
      {/* Dark doorway behind the door */}
      <mesh position={[SHED_X1 + 0.004, DOOR_H / 2, (DOOR_Z[0] + DOOR_Z[1]) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshStandardMaterial color="#14161c" />
      </mesh>
      {/* The blast door: hinged on its front edge, swings out over the lawn */}
      <group position={[SHED_X1 + 0.02, 0, DOOR_Z[1]]} rotation={[0, -angle, 0]}>
        <group position={[0.05, DOOR_H / 2, -DOOR_W / 2]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, DOOR_H, DOOR_W]} />
            <meshStandardMaterial color="#1f2f4f" metalness={0.45} roughness={0.45} />
          </mesh>
          {/* Red hand-wheel */}
          <group position={[0.07, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh>
              <torusGeometry args={[0.24, 0.035, 10, 28]} />
              <meshStandardMaterial color="#d23a2e" roughness={0.5} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
                <boxGeometry args={[0.48, 0.035, 0.03]} />
                <meshStandardMaterial color="#d23a2e" roughness={0.5} />
              </mesh>
            ))}
          </group>
          {[-0.6, 0.6].map((y) => (
            <mesh key={y} position={[0.02, y, DOOR_W / 2 - 0.05]}>
              <boxGeometry args={[0.12, 0.18, 0.08]} />
              <meshStandardMaterial color="#9aa1aa" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};

/** The "like a truck" gag: a little box truck rams the door and backs off. */
export const Truck: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < TRUCK_HIT - 16 || frame > TRUCK_HIT + 40) return null;
  return (
    <group position={[truckX(frame), 0, TRUCK_Z]}>
      {/* Cab faces -x (toward the shed) */}
      <mesh position={[-TRUCK_LEN / 2 + 0.55, 0.85, 0]} castShadow>
        <boxGeometry args={[1.1, 1.2, 1.5]} />
        <meshStandardMaterial color="#c4463a" roughness={0.5} />
      </mesh>
      <mesh position={[-TRUCK_LEN / 2 + 0.02, 1.05, 0]}>
        <boxGeometry args={[0.04, 0.5, 1.3]} />
        <meshStandardMaterial color="#8fc0ee" roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0.55, 1.1, 0]} castShadow>
        <boxGeometry args={[2.2, 1.7, 1.6]} />
        <meshStandardMaterial color="#f2f0ea" roughness={0.6} />
      </mesh>
      {[-1.05, 0.25, 1.15].map((x) =>
        [-0.78, 0.78].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.3, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 18]} />
            <meshStandardMaterial color="#1d1d22" roughness={0.8} />
          </mesh>
        )),
      )}
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} position={[-TRUCK_LEN / 2, 0.55, z]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshBasicMaterial color="#fff6c4" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

/** Rubble raining down onto the lawn and piling up against the door. */
export const Rubble: React.FC<{ frame: number }> = ({ frame }) => {
  const chunks = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const row = Math.floor(i / 9);
        return {
          x: SHED_X1 + 0.25 + random(`rb-x-${i}`) * (1.3 - row * 0.3),
          z: DOOR_Z[0] + random(`rb-z-${i}`) * (DOOR_Z[1] - DOOR_Z[0]),
          y: 0.15 + row * 0.32,
          t: RUBBLE_FALL[0] + random(`rb-t-${i}`) * (RUBBLE_FALL[1] - RUBBLE_FALL[0]) * 0.8 + row * 3,
          s: 0.16 + random(`rb-s-${i}`) * 0.14,
          rot: random(`rb-r-${i}`) * 6,
          grey: random(`rb-c-${i}`) > 0.5,
        };
      }),
    [],
  );
  if (frame < RUBBLE_FALL[0]) return null;
  return (
    <group>
      {chunks.map((c, i) => {
        const t = frame - c.t;
        if (t < -14) return null;
        const fall = clamp01((t + 14) / 14);
        const y = c.y + (1 - fall * fall) * 6;
        return (
          <mesh key={i} position={[c.x, y, c.z]} rotation={[c.rot, c.rot * 1.3, 0]} scale={c.s} castShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={c.grey ? "#9a948a" : "#7a5232"} roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
};
