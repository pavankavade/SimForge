import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { ActorView, FACE_CAMERA, type Actor } from "../../kit";
import { Blob, Block, Bounce, LP, LowPolyLight, OctagonFloor, PlankFloor, Prism, Wedge, facetGround, matte, steel } from "..";

// ---------------------------------------------------------------------------
// The tornado-shelter house as a clean low-poly cutaway: bedroom (closet on the
// outside wall) | bathroom safe room | living room. Floor tops at y = 0.
// ---------------------------------------------------------------------------

const WALL_Z = -3.1;
const WALL_H = 3.2;
const HALF = 6.35;
const EAVE_Y = WALL_H + 0.24;
const ROOF_H = 2.5;
const SLOPE = Math.atan2(ROOF_H, 6.6);

const House: React.FC = () => (
  <group>
    {/* Foundation slab and floors */}
    <Block size={[13.4, 0.5, 6.6]} position={[0, -0.35, -0.2]} color={LP.concrete} />
    <Block size={[14.2, 0.3, 7.4]} position={[0, -0.62, -0.2]} color={LP.stone} />
    {[0, 1].map((i) => (
      <Block key={i} size={[2.4, 0.22, 0.6]} position={[4.2, -0.24 - i * 0.24, 3.4 + i * 0.5]} color={LP.concrete} />
    ))}
    <PlankFloor w={4.0} d={6.0} position={[-4.2, 0, -0.1]} color="#b48656" />
    <OctagonFloor cols={5} rows={7} cell={0.8} position={[0, 0, -0.1]} />
    <PlankFloor w={4.0} d={6.0} position={[4.2, 0, -0.1]} color="#c39a6b" />

    {/* Back wall with the living-room window cut out */}
    <Block size={[9.0, WALL_H, 0.3]} position={[-1.85, WALL_H / 2, WALL_Z]} color={LP.plaster} />
    <Block size={[2.0, 1.1, 0.3]} position={[3.6, 0.55, WALL_Z]} color={LP.plaster} />
    <Block size={[2.0, 0.7, 0.3]} position={[3.6, WALL_H - 0.35, WALL_Z]} color={LP.plaster} />
    <Block size={[1.8, WALL_H, 0.3]} position={[5.5, WALL_H / 2, WALL_Z]} color={LP.plaster} />
    <Block size={[2.0, 1.4, 0.05]} position={[3.6, 1.8, WALL_Z - 0.05]} material={matte("#cfe3f2", { rough: 0.2, emissive: "#cfe3f2", emissiveIntensity: 0.35 })} castShadow={false} />
    <Block size={[2.2, 0.14, 0.42]} position={[3.6, 1.08, WALL_Z + 0.04]} color={LP.trim} />
    <Block size={[2.2, 0.14, 0.36]} position={[3.6, 2.52, WALL_Z + 0.02]} color={LP.trim} />
    <Block size={[0.12, 1.4, 0.36]} position={[2.56, 1.8, WALL_Z + 0.02]} color={LP.trim} />
    <Block size={[0.12, 1.4, 0.36]} position={[4.64, 1.8, WALL_Z + 0.02]} color={LP.trim} />
    <Block size={[0.08, 1.4, 0.3]} position={[3.6, 1.8, WALL_Z + 0.0]} color={LP.trim} />
    {/* Wainscot: a darker panelled band with a cap rail, and a crown trim */}
    {[
      [-4.2, 3.9],
      [4.2, 3.9],
    ].map(([x, w]) => (
      <group key={x}>
        {Array.from({ length: 4 }, (_, i) => (
          <Block key={i} size={[w / 4 - 0.08, 0.78, 0.1]} position={[x - w / 2 + (i + 0.5) * (w / 4), 0.5, WALL_Z + 0.2]} color="#aeb6bf" />
        ))}
        <Block size={[w, 0.12, 0.2]} position={[x, 0.95, WALL_Z + 0.22]} color={LP.trim} />
        <Block size={[w, 0.16, 0.16]} position={[x, 0.08, WALL_Z + 0.24]} color={LP.trimDark} />
      </group>
    ))}
    <Block size={[12.4, 0.2, 0.26]} position={[0, WALL_H - 0.1, WALL_Z + 0.2]} color={LP.trim} />

    {/* Outside walls, partitions, ceiling */}
    {[-HALF, HALF].map((x) => (
      <Block key={x} size={[0.3, WALL_H, 6.2]} position={[x, WALL_H / 2, -0.2]} color={LP.plasterWarm} />
    ))}
    {[-2.1, 2.1].map((x) => (
      <Block key={x} size={[0.24, WALL_H, 6.1]} position={[x, WALL_H / 2, -0.15]} color={LP.plaster} />
    ))}
    {/* Chunky posts on every wall end at the cut face, each on a plinth (the reference's pillars) */}
    {[-HALF, -2.1, 2.1, HALF].map((x) => (
      <group key={x} position={[x, 0, 2.85]}>
        <Block size={[0.62, 0.32, 0.62]} position={[0, 0.16, 0]} color={LP.stone} />
        <Block size={[0.46, WALL_H - 0.5, 0.46]} position={[0, WALL_H / 2 + 0.06, 0]} color={LP.plasterWarm} />
        <Block size={[0.6, 0.26, 0.6]} position={[0, WALL_H - 0.02, 0]} color={LP.trim} />
      </group>
    ))}
    {/* Ceiling and roof cast no shadow: a cutaway lets the sun into the rooms. */}
    <Block size={[13.0, 0.24, 6.3]} position={[0, WALL_H + 0.12, -0.2]} color={LP.plasterWarm} castShadow={false} />

    {/* Gable roof: two wedges and shingle slabs along the slopes */}
    {[-1, 1].map((s) => (
      <Wedge
        key={s}
        size={[6.6, ROOF_H, 6.0]}
        position={[s * 3.3, EAVE_Y + ROOF_H / 2, -0.2]}
        rotation={[0, s > 0 ? 0 : Math.PI, 0]}
        color={LP.plasterWarm}
        castShadow={false}
      />
    ))}
    {[-1, 1].map((s) => (
      <Block
        key={s}
        size={[7.6, 0.26, 6.9]}
        position={[s * (3.3 + 0.15 * Math.sin(SLOPE)), EAVE_Y + ROOF_H / 2 + 0.15 * Math.cos(SLOPE), -0.2]}
        rotation={[0, 0, -s * SLOPE]}
        color={LP.roof}
        castShadow={false}
      />
    ))}
    <Prism r={0.2} h={6.9} sides={6} position={[0, EAVE_Y + ROOF_H + 0.12, -0.2]} rotation={[Math.PI / 2, 0, 0]} color={LP.stoneDark} castShadow={false} />
  </group>
);

const Bedroom: React.FC = () => (
  <group position={[-4.2, 0, 0]}>
    {/* Bed */}
    <Block size={[2.2, 0.35, 1.5]} position={[-0.3, 0.28, -2.0]} color={LP.wood} />
    <Block size={[2.1, 0.26, 1.42]} position={[-0.3, 0.58, -2.0]} color={LP.cream} />
    <Block size={[1.4, 0.12, 1.48]} position={[0.05, 0.75, -2.0]} color={LP.cloth} />
    <Block size={[0.45, 0.18, 0.95]} position={[-1.1, 0.78, -2.0]} color="#f3efe6" />
    <Block size={[0.16, 1.25, 1.55]} position={[-1.45, 0.62, -2.0]} color={LP.woodDark} />
    {/* Closet on the outside wall: the one the narration hides in */}
    <Block size={[0.95, 2.5, 1.9]} position={[-1.5, 1.25, 0.55]} color={LP.wood} />
    <Block size={[0.06, 2.2, 0.88]} position={[-1.0, 1.25, 0.1]} color="#d08a4c" />
    <Block size={[0.06, 2.2, 0.88]} position={[-1.0, 1.25, 1.0]} color="#d08a4c" />
    <Prism r={0.05} h={0.1} sides={6} position={[-0.95, 1.3, 0.45]} rotation={[0, 0, Math.PI / 2]} color={LP.trim} />
    <Prism r={0.05} h={0.1} sides={6} position={[-0.95, 1.3, 0.65]} rotation={[0, 0, Math.PI / 2]} color={LP.trim} />
    {/* Nightstand and a toy */}
    <Block size={[0.6, 0.6, 0.5]} position={[1.1, 0.3, -2.45]} color={LP.woodDark} />
    <Prism r={0.12} h={0.35} sides={6} position={[1.1, 0.78, -2.45]} color={LP.hazard} />
    <Block size={[0.5, 0.5, 0.5]} position={[1.0, 0.25, 1.6]} rotation={[0, 0.4, 0]} color="#d9a441" />
  </group>
);

/** The future safe room: tile floor, bathtub, steel lining on the back wall. */
const SafeRoom: React.FC = () => (
  <group>
    {[-1.32, 0, 1.32].map((x) => (
      <Block key={x} size={[1.28, 2.9, 0.08]} position={[x, 1.55, WALL_Z + 0.2]} material={steel()} />
    ))}
    {Array.from({ length: 10 }, (_, i) => (
      <Block
        key={i}
        size={[0.36, 0.16, 0.04]}
        position={[-1.8 + i * 0.4, 0.14, WALL_Z + 0.26]}
        color={i % 2 ? LP.ink : LP.hazard}
        castShadow={false}
      />
    ))}
    {/* Bathtub */}
    <Block size={[2.5, 0.72, 1.05]} position={[0.35, 0.36, -2.35]} color={LP.cream} />
    <Block size={[2.15, 0.04, 0.72]} position={[0.35, 0.72, -2.35]} color="#9fb7c9" castShadow={false} />
    <Prism r={0.05} h={0.3} sides={6} position={[1.45, 0.92, -2.75]} color={LP.steel} />
    {/* Supply shelf */}
    <Block size={[1.1, 0.08, 0.38]} position={[-1.35, 1.9, -2.75]} color={LP.wood} />
    <Prism r={0.07} h={0.3} sides={6} position={[-1.7, 2.09, -2.7]} color="#79a7c8" />
    <Prism r={0.07} h={0.3} sides={6} position={[-1.52, 2.09, -2.7]} color="#79a7c8" />
    <Prism r={0.055} h={0.32} sides={8} position={[-1.15, 2.0, -2.65]} rotation={[0, 0, Math.PI / 2]} color={LP.hazard} />
    <Blob r={0.17} detail={0} jitter={0} position={[-0.95, 2.02, -2.72]} scale={[1, 0.75, 1]} color={LP.red} />
  </group>
);

const Living: React.FC = () => (
  <group position={[4.2, 0, 0]}>
    <Block size={[2.6, 0.04, 2.3]} position={[0, 0.02, -0.5]} color={LP.red} castShadow={false} />
    {/* Sofa under the window */}
    <Block size={[2.3, 0.42, 0.95]} position={[-0.6, 0.32, -2.35]} color="#4f7d86" />
    <Block size={[2.3, 0.62, 0.3]} position={[-0.6, 0.78, -2.72]} color="#4f7d86" />
    <Block size={[0.3, 0.6, 0.95]} position={[-1.75, 0.42, -2.35]} color="#456f78" />
    <Block size={[0.3, 0.6, 0.95]} position={[0.55, 0.42, -2.35]} color="#456f78" />
    {/* Floor lamp */}
    <Prism r={0.18} h={0.06} sides={8} position={[1.3, 0.03, -2.5]} color={LP.ink} />
    <Prism r={0.035} h={1.5} sides={6} position={[1.3, 0.78, -2.5]} color={LP.ink} />
    <Prism r={0.26} h={0.36} sides={8} position={[1.3, 1.62, -2.5]} material={matte("#f1e2bf", { emissive: "#ffd99a", emissiveIntensity: 0.25 })} />
    {/* Moving boxes, the room's "crates" */}
    <Block size={[0.75, 0.6, 0.65]} position={[1.35, 0.3, 1.5]} color="#c99a5f" />
    <Block size={[0.55, 0.45, 0.5]} position={[1.3, 0.83, 1.45]} rotation={[0, 0.3, 0]} color="#d5a96e" />
    <Block size={[0.6, 0.5, 0.55]} position={[0.55, 0.25, 1.75]} rotation={[0, -0.2, 0]} color={LP.wood} />
  </group>
);

const Yard: React.FC = () => (
  <group>
    <mesh geometry={facetGround(140, 120, 44, 1.1, 3, 11)} material={matte(LP.grass)} position={[0, -0.5, 0]} receiveShadow />
    {/* Stepping-stone path from the porch */}
    {[0, 1, 2, 3, 4].map((i) => (
      <Prism key={i} r={0.36} h={0.14} sides={8} position={[4.2 + Math.sin(i * 1.7) * 0.25, -0.46, 4.7 + i * 0.85]} color={LP.stone} />
    ))}
    {/* Bushes along the front */}
    {[
      [-7.3, 2.6, 0.75, 41],
      [-6.6, 3.2, 0.55, 42],
      [7.0, 2.8, 0.7, 43],
      [1.6, 3.6, 0.5, 44],
      [-1.4, 3.7, 0.45, 45],
    ].map(([x, z, r, seed]) => (
      <Blob key={seed} r={r} seed={seed} position={[x, -0.5 + r * 0.6, z]} scale={[1.2, 0.85, 1]} color={seed % 2 ? LP.leaf : LP.grassDark} />
    ))}
    {/* Tree */}
    <Prism r={0.24} h={2.6} sides={6} position={[-9.2, 1.0, -1.5]} color={LP.woodDark} />
    <Blob r={1.5} seed={3} position={[-9.2, 3.0, -1.5]} color={LP.leaf} />
    <Blob r={1.1} seed={7} position={[-8.3, 2.5, -0.9]} color="#7aa060" />
    <Blob r={1.0} seed={11} position={[-10.0, 2.6, -2.2]} color={LP.grassDark} />
    {/* Siren pole: the episode's first sound */}
    <Prism r={0.12} h={6.5} sides={6} position={[9.5, 2.9, -3.5]} color={LP.stoneDark} />
    <Prism r={0.32} h={0.8} sides={8} position={[9.5, 6.2, -3.5]} rotation={[0, 0, Math.PI / 2]} color={LP.red} />
    {/* Picket fence and mailbox */}
    {Array.from({ length: 8 }, (_, i) => (
      <Block key={i} size={[0.16, 0.9, 0.08]} position={[7.4 + i * 0.4, 0.15, 2.4]} color={LP.cream} />
    ))}
    <Block size={[3.2, 0.1, 0.06]} position={[8.8, 0.3, 2.36]} color={LP.cream} />
    <Prism r={0.06} h={1.1} sides={6} position={[-7.6, 0.2, 2.6]} color={LP.woodDark} />
    <Block size={[0.5, 0.35, 0.3]} position={[-7.6, 0.85, 2.6]} color={LP.cloth} />
    {/* Hills and clouds far back */}
    <Blob r={9} seed={21} detail={1} jitter={0.25} position={[-26, -4, -60]} scale={[1.6, 0.45, 1]} color="#a9b79c" castShadow={false} />
    <Blob r={11} seed={22} detail={1} jitter={0.25} position={[18, -5, -66]} scale={[1.8, 0.45, 1]} color="#9fae93" castShadow={false} />
    {[
      [-12, 15, -35, 2.4],
      [6, 17, -42, 3.0],
      [20, 13, -38, 2.0],
    ].map(([x, y, z, r], i) => (
      <Blob key={i} r={r} seed={31 + i} position={[x, y, z]} scale={[1.9, 0.7, 1]} material={matte("#f4f6f8", { emissive: "#ffffff", emissiveIntensity: 0.3 })} castShadow={false} />
    ))}
    {/* A tornado far out on the horizon */}
    <mesh position={[24, 7, -48]} material={matte("#7c8590")}>
      <coneGeometry args={[3.2, 16, 9, 5, true]} />
    </mesh>
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[150, 24, 12]} />
      <meshBasicMaterial color="#c3d6e6" side={THREE.BackSide} toneMapped={false} />
    </mesh>
  </group>
);

const dadActor = (): Actor => ({ pose: "idle", position: [-0.7, 0, 0.5], yaw: FACE_CAMERA + 0.35 });
const kidActor = (): Actor => ({ pose: "idle", position: [0.6, 0, 0.7], yaw: FACE_CAMERA - 0.3, expression: "happy" });

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <group>
      <LowPolyLight target={[0, 1, -0.5]} bounds={15} />
      {/* Colour bleed off the floors and the rug */}
      <Bounce position={[-4.2, -0.15, 0.5]} color="#f0a868" intensity={4} />
      <Bounce position={[0, -0.15, 0.5]} color="#dfe8f2" intensity={3} />
      <Bounce position={[4.2, -0.15, 0]} color="#ff7058" intensity={4} />
      <Yard />
      <House />
      <Bedroom />
      <SafeRoom />
      <Living />
      <ActorView classType="dad" actor={dadActor} frame={frame} />
      <ActorView classType="kid" actor={kidActor} frame={frame} />
    </group>
  );
};
