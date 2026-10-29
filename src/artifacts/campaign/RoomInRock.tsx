import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeEarth, makeGranite } from "../../engine/textures";

interface RoomInRockProps {
  /** Opening of the room (world x/y): everything outside it is rock. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** z of the cut face (just in front of the room's front edge). */
  z?: number;
  /** Optional surface line above the room: grass + sky above it. */
  surfaceY?: number;
}

/**
 * The cut rock face around a room, so a 16:9 frame that sees past the set's
 * ends shows solid rock (the same cutaway as the dungeon cross-section)
 * instead of the void. Rock fills a large slab with one hole for the room,
 * plus a back fill behind the set.
 */
export const RoomInRock: React.FC<RoomInRockProps> = ({ x0, x1, y0, y1, z = 1.15, surfaceY }) => {
  // Extruded-shape UVs are world units, so the rock tiles about every 6 m.
  const rock = useSurface("xs-rock", () => makeGranite({ base: "#4a3f3a", baseAlt: "#5a4d45", darkVein: "#2e2724", seed: 181 }), [0.16, 0.16]);
  const soil = useSurface("xs-soil", () => makeEarth({ seed: 182 }), [10, 1]);
  const top = surfaceY ?? y1 + 30;
  const face = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(x0 - 40, y0 - 30);
    shape.lineTo(x1 + 40, y0 - 30);
    shape.lineTo(x1 + 40, top);
    shape.lineTo(x0 - 40, top);
    shape.lineTo(x0 - 40, y0 - 30);
    const hole = new THREE.Path();
    hole.moveTo(x0, y0);
    hole.lineTo(x0, y1);
    hole.lineTo(x1, y1);
    hole.lineTo(x1, y0);
    hole.lineTo(x0, y0);
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
  }, [x0, x1, y0, y1, top]);
  return (
    <group>
      <mesh geometry={face} position={[0, 0, z - 0.5]} receiveShadow>
        <meshStandardMaterial map={rock.map} normalMap={rock.normalMap} color="#d2c0b0" roughness={0.95} />
      </mesh>
      {surfaceY !== undefined ? (
        <>
          <mesh position={[(x0 + x1) / 2, surfaceY - 0.5, z + 0.02]}>
            <boxGeometry args={[x1 - x0 + 80, 1.0, 0.6]} />
            <meshStandardMaterial map={soil.map} color="#8a6a48" roughness={1} />
          </mesh>
          <mesh position={[(x0 + x1) / 2, surfaceY + 0.12, z - 1.5]}>
            <boxGeometry args={[x1 - x0 + 80, 0.24, 4]} />
            <meshStandardMaterial color="#5f9a3a" roughness={0.95} />
          </mesh>
        </>
      ) : null}
      {/* Rock behind the set where its walls stop */}
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, z - 4.6]}>
        <boxGeometry args={[x1 - x0 + 2, y1 - y0 + 2, 0.2]} />
        <meshStandardMaterial color="#231f22" roughness={1} />
      </mesh>
    </group>
  );
};
