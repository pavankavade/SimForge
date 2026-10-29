import type React from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { random } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { BrokenBus } from "./BrokenBus";
import { CloudPuff } from "./CloudPuff";
import { Windsock } from "./Windsock";

/**
 * High-plains road for the "What if" series: a two-lane blacktop running into
 * the distance (-z) through a patchwork of fields, with a farm, power poles,
 * a windsock and a far mountain ridge on the horizon.
 *
 * Toon-diorama look: smooth low-poly shapes, flat pastel fields, soft sun.
 * The road centre is x = 0; the right shoulder (+x) is where the bus breaks down.
 */

export const ROAD = {
  /** Half width of the blacktop. */
  half: 1.9,
  /** Gravel shoulder width beyond the blacktop. */
  shoulder: 1.1,
  near: 140,
  far: -420,
} as const;

const FIELD_COLORS = [
  "#e9cf7a",
  "#d9b65e",
  "#b9c76a",
  "#9fb85a",
  "#c98e55",
  "#e4d9a4",
  "#8fae62",
  "#dcae6a",
];

const mat = (color: string, flatShading = false, roughness = 0.95) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    flatShading,
  });

/** Patchwork quilt of crop tiles (one instanced mesh), leaving a strip clear for the road. */
const Fields: React.FC<{ seed?: number }> = ({ seed = 3 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tiles = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; color: string }[] =
      [];
    const size = 14;
    for (let gz = 0; gz < 42; gz++) {
      for (let gx = -16; gx < 16; gx++) {
        const x = gx * size + size / 2;
        const z = ROAD.near - gz * size - size / 2;
        const edge = ROAD.half + ROAD.shoulder + 0.4;
        // Split tiles that straddle the road so the strip stays clear.
        if (Math.abs(x) - size / 2 < edge) {
          const side = x < 0 ? -1 : 1;
          const inner = edge;
          const outer = Math.abs(x) + size / 2;
          if (outer <= inner) continue;
          out.push({
            x: (side * (inner + outer)) / 2,
            z,
            w: outer - inner,
            d: size,
            color: "",
          });
        } else {
          out.push({ x, z, w: size, d: size, color: "" });
        }
      }
    }
    return out.map((t, i) => ({
      ...t,
      color:
        FIELD_COLORS[
          Math.floor(random(`field-${seed}-${i}`) * FIELD_COLORS.length)
        ],
    }));
  }, [seed]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    tiles.forEach((t, i) => {
      // A small gap between tiles reads as a field boundary.
      o.position.set(t.x, 0, t.z);
      o.scale.set(Math.max(0.1, t.w - 0.35), 1, t.d - 0.35);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(t.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tiles]);

  return (
    <>
      {/* Earth under the tiles shows through the gaps as field edges */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.03, -190]}
        receiveShadow
      >
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#a8834f" roughness={1} />
      </mesh>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, tiles.length]}
        receiveShadow
      >
        <boxGeometry args={[1, 0.04, 1]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </>
  );
};

/** Blacktop with a dashed centre line, white edge lines and gravel shoulders. */
const Road: React.FC = () => {
  const len = ROAD.near - ROAD.far;
  const midZ = (ROAD.near + ROAD.far) / 2;
  const dashes = useMemo(
    () =>
      Array.from(
        { length: Math.floor(len / 6) },
        (_, i) => ROAD.near - 1.5 - i * 6,
      ),
    [len],
  );
  return (
    <group>
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`sh${s}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[s * (ROAD.half + ROAD.shoulder / 2), 0.012, midZ]}
          receiveShadow
        >
          <planeGeometry args={[ROAD.shoulder, len]} />
          <meshStandardMaterial color="#cbb08a" roughness={1} />
        </mesh>
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, midZ]}
        receiveShadow
      >
        <planeGeometry args={[ROAD.half * 2, len]} />
        <meshStandardMaterial color="#545866" roughness={0.92} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`edge${s}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[s * (ROAD.half - 0.12), 0.026, midZ]}
        >
          <planeGeometry args={[0.1, len]} />
          <meshStandardMaterial color="#f1ede2" roughness={0.8} />
        </mesh>
      ))}
      {dashes.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.027, z]}>
          <planeGeometry args={[0.12, 2.6]} />
          <meshStandardMaterial color="#f2c14e" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

/** Wooden power poles with sagging wires along one side of the road. */
const PowerLine: React.FC<{ x: number; spacing?: number; count?: number }> = ({
  x,
  spacing = 22,
  count = 16,
}) => {
  const wood = useMemo(() => mat("#7a5a3c"), []);
  const wire = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#3a3330" }),
    [],
  );
  const poles = Array.from(
    { length: count },
    (_, i) => ROAD.near - 8 - i * spacing,
  );
  const spans = useMemo(
    () =>
      poles.slice(0, -1).map((z0, i) => {
        const z1 = poles[i + 1];
        return [-0.7, 0.7].map((dx) => {
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(x + dx, 7.3, z0),
            new THREE.Vector3(x + dx, 6.4, (z0 + z1) / 2),
            new THREE.Vector3(x + dx, 7.3, z1),
          );
          return new THREE.TubeGeometry(curve, 16, 0.025, 4, false);
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x, spacing, count],
  );
  return (
    <group>
      {poles.map((z) => (
        <group key={z} position={[x, 0, z]}>
          <mesh material={wood} position={[0, 3.8, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 7.6, 8]} />
          </mesh>
          <mesh material={wood} position={[0, 7.3, 0]} castShadow>
            <boxGeometry args={[1.8, 0.16, 0.16]} />
          </mesh>
        </group>
      ))}
      {([] as THREE.TubeGeometry[]).concat(...spans).map((g, i) => (
        <mesh key={i} geometry={g} material={wire} />
      ))}
    </group>
  );
};

/** Post-and-wire farm fence. */
const Fence: React.FC<{ x: number; from: number; to: number }> = ({
  x,
  from,
  to,
}) => {
  const wood = useMemo(() => mat("#8a6a48"), []);
  const posts = Array.from(
    { length: Math.floor((from - to) / 3) },
    (_, i) => from - i * 3,
  );
  const len = from - to;
  return (
    <group>
      {posts.map((z) => (
        <mesh key={z} material={wood} position={[x, 0.55, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.1, 6]} />
        </mesh>
      ))}
      {[0.5, 0.9].map((y) => (
        <mesh key={y} position={[x, y, (from + to) / 2]}>
          <boxGeometry args={[0.02, 0.02, len]} />
          <meshBasicMaterial color="#5a514a" />
        </mesh>
      ))}
    </group>
  );
};

/** Red barn + grain silo cluster. */
const Farm: React.FC<{ position: Vec3; rotationY?: number }> = ({
  position,
  rotationY = 0,
}) => {
  const red = useMemo(() => mat("#c4473a", false, 0.85), []);
  const white = useMemo(() => mat("#f2eadb", false, 0.85), []);
  const roof = useMemo(() => mat("#5a5f6e", false, 0.7), []);
  const steel = useMemo(() => mat("#cfd6dd", false, 0.45), []);
  const roofGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-4.6, 0);
    shape.lineTo(0, 3.2);
    shape.lineTo(4.6, 0);
    shape.lineTo(-4.6, 0);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 12.4,
      bevelEnabled: false,
    });
    g.translate(0, 0, -6.2);
    return g;
  }, []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={red} position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.4, 5.2, 12]} />
      </mesh>
      <mesh
        geometry={roofGeo}
        material={roof}
        position={[0, 5.2, 0]}
        castShadow
      />
      {/* Big doors with white trim */}
      <mesh material={white} position={[0, 2, 6.02]}>
        <boxGeometry args={[3.6, 4, 0.08]} />
      </mesh>
      <mesh material={red} position={[0, 2, 6.07]}>
        <boxGeometry args={[3.1, 3.5, 0.06]} />
      </mesh>
      {/* Silos */}
      {[
        [7.5, 0, -2, 2.4, 13],
        [12.6, 0, -1, 2, 10],
      ].map(([x, , z, r, h]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh material={steel} position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r, h, 24]} />
          </mesh>
          <mesh material={steel} position={[0, h, 0]} castShadow>
            <sphereGeometry
              args={[r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
          </mesh>
          {[0.25, 0.5, 0.75].map((t) => (
            <mesh key={t} position={[0, h * t, 0]}>
              <torusGeometry args={[r + 0.02, 0.05, 6, 32]} />
              <meshStandardMaterial color="#a9b3bd" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** Round, smooth trees in a windbreak row. */
const TreeRow: React.FC<{
  from: Vec3;
  step: Vec3;
  count: number;
  seed: number;
}> = ({ from, step, count, seed }) => {
  const trunk = useMemo(() => mat("#6b4a2e"), []);
  const leaves = useMemo(
    () => [
      mat("#6f9a48", false, 0.9),
      mat("#5c8a3c", false, 0.9),
      mat("#83a955", false, 0.9),
    ],
    [],
  );
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const s = 0.8 + random(`tree-${seed}-${i}`) * 0.6;
        const p: Vec3 = [from[0] + step[0] * i, 0, from[2] + step[2] * i];
        return (
          <group key={i} position={p} scale={s}>
            <mesh material={trunk} position={[0, 1, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.22, 2, 6]} />
            </mesh>
            <mesh material={leaves[i % 3]} position={[0, 3, 0]} castShadow>
              <sphereGeometry args={[1.5, 16, 12]} />
            </mesh>
            <mesh
              material={leaves[(i + 1) % 3]}
              position={[0.7, 2.5, 0.3]}
              castShadow
            >
              <sphereGeometry args={[1, 14, 10]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** The destination: a far ridge of faceted mountains with snow caps, hazed by fog. */
export const Ridge: React.FC<{ z: number; seed?: number; scale?: number }> = ({
  z,
  seed = 9,
  scale = 1,
}) => {
  const rock = useMemo(() => mat("#6f78a8", true, 1), []);
  const rockDark = useMemo(() => mat("#5c6494", true, 1), []);
  const snow = useMemo(() => mat("#f4f2f6", true, 0.9), []);
  const peaks = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => {
        const x = -320 + i * 46 + (random(`rx-${seed}-${i}`) - 0.5) * 24;
        const h = 28 + random(`rh-${seed}-${i}`) * 34;
        const r = 40 + random(`rr-${seed}-${i}`) * 30;
        const dz = (random(`rz-${seed}-${i}`) - 0.5) * 40;
        return { x, h, r, dz, rot: random(`rt-${seed}-${i}`) * Math.PI };
      }),
    [seed],
  );
  return (
    <group position={[0, 0, z]} scale={scale}>
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, 0, p.dz]} rotation={[0, p.rot, 0]}>
          <mesh material={i % 2 ? rock : rockDark} position={[0, p.h / 2, 0]}>
            <coneGeometry args={[p.r, p.h, 7, 1]} />
          </mesh>
          <mesh material={snow} position={[0, p.h * 0.82, 0]}>
            <coneGeometry args={[p.r * 0.36, p.h * 0.36, 7, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export interface PlainsRoadProps {
  /** Wind direction (radians about y, 0 = blowing toward +z) and speed in knots, for the windsock and clouds. */
  wind?: { dir: number; knots: number };
  /** Show the broken-down bus on the right shoulder. */
  bus?: boolean;
  /** Far mountain ridge and the windsock (episodes place their own when the set is turned). */
  ridge?: boolean;
  windsock?: boolean;
  clouds?: boolean;
  /** Which side of the road the power line runs on (+1 right, -1 left). */
  powerSide?: 1 | -1;
}

export const PlainsRoad: React.FC<PlainsRoadProps> = ({
  wind = { dir: -2.2, knots: 12 },
  bus = true,
  ridge = true,
  windsock = true,
  clouds = true,
  powerSide = 1,
}) => (
  <group>
    <Fields />
    <Road />
    <Fence x={-(ROAD.half + ROAD.shoulder + 0.5)} from={ROAD.near} to={-160} />
    <PowerLine x={powerSide * (ROAD.half + ROAD.shoulder + 4.2)} count={26} />
    <Farm position={[-26, 0, -46]} rotationY={0.5} />
    <TreeRow from={[-14, 0, -30]} step={[-4.2, 0, -1.2]} count={7} seed={1} />
    <TreeRow from={[22, 0, -70]} step={[3.6, 0, -2.4]} count={9} seed={2} />
    <TreeRow from={[-40, 0, -120]} step={[5, 0, 0.4]} count={10} seed={3} />
    {windsock ? (
      <Windsock position={[-8.5, 0, -9]} dir={wind.dir} knots={wind.knots} />
    ) : null}
    {bus ? (
      <BrokenBus position={[ROAD.half + 0.9, 0, -5.5]} rotationY={0.04} />
    ) : null}
    {ridge ? <Ridge z={-400} /> : null}
    {/* Puffy cumulus between the plains and the ridge */}
    {clouds ? (
      <>
        <CloudPuff position={[-60, 34, -170]} scale={9} seed={1} />
        <CloudPuff position={[10, 40, -210]} scale={11} seed={2} />
        <CloudPuff position={[80, 30, -160]} scale={8} seed={3} />
        <CloudPuff position={[-120, 44, -240]} scale={12} seed={4} />
        <CloudPuff position={[140, 48, -260]} scale={13} seed={5} />
        <CloudPuff position={[-20, 26, -110]} scale={5} seed={6} />
      </>
    ) : null}
  </group>
);
