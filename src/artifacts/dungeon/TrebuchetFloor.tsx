import type React from "react";
import * as THREE from "three";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMetal, makeWood } from "../../engine/textures";

interface TrebuchetFloorProps {
  /** Frame the underground chamber is revealed; nothing renders before. */
  revealFrame: number;
  /** [start, end] of the parts snapping into place. */
  buildWindow: [number, number];
  launchFrame: number;
  /** Floor pivot (top-right edge of the hinged slab). */
  pivot: Vec3;
  slabLength: number;
  /** Current slab rotation around z (negative flips the far end up). */
  angle: number;
}

const ARM_LENGTH = 2.2;
const ARM_DROP = 0.75;
const CHAMBER_FLOOR = -3.6;

export const TrebuchetFloor: React.FC<TrebuchetFloorProps> = ({
  revealFrame,
  buildWindow,
  launchFrame,
  pivot,
  slabLength,
  angle,
}) => {
  const frame = useCurrentFrame();

  const floorStone = useSurface(
    "diorama-floor",
    () =>
      makeFlagstone({
        cells: 4,
        base: "#4b4e5a",
        baseAlt: "#565965",
        grout: "#1c1e25",
        seed: 24,
      }),
    [4, 1]
  );
  const timber = useSurface(
    "catapult-timber",
    () =>
      makeWood({
        planks: 3,
        base: "#5b3b22",
        baseAlt: "#6b462a",
        seam: "#22150b",
        seed: 71,
      }),
    [1, 2]
  );
  const iron = useSurface(
    "catapult-iron",
    () => makeMetal({ base: "#4c515e", seed: 72, roughness: 110 }),
    [1, 1]
  );

  if (frame < revealFrame) return null;

  const [buildStart, buildEnd] = buildWindow;
  const step = (buildEnd - buildStart) / 4;
  const part = (index: number) =>
    interpolate(
      frame,
      [buildStart + index * step, buildStart + index * step + 14],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(1.6)),
      }
    );
  const frameIn = part(0);
  const axleIn = part(1);
  const armIn = part(2);
  const weightIn = part(3);

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const armEnd: Vec3 = [
    pivot[0] + ARM_LENGTH * cos + ARM_DROP * sin,
    pivot[1] + ARM_LENGTH * sin - ARM_DROP * cos,
    pivot[2],
  ];
  const ropeLength = 0.35;
  const weightHeight = 0.8;
  // The counterweight bounces on its rope as the last part installs.
  const weightLower = (1 - weightIn) * 0.4;
  const weightTop = armEnd[1] - ropeLength + weightLower;
  const weightY = weightTop - weightHeight / 2;

  const latched = frame < launchFrame;
  const snapAge = frame - launchFrame;
  const latchFloorY = CHAMBER_FLOOR;
  const latchTop = weightTop - weightHeight;

  const springGlow = latched ? 0.25 + 0.15 * Math.sin(frame * 0.4) : 0.1;
  const springTwist = latched ? 0 : Math.sin(snapAge * 0.9) * Math.exp(-snapAge / 10) * 0.5;

  const ironMat = (
    <meshStandardMaterial
      map={iron.map}
      roughnessMap={iron.roughnessMap}
      color="#8a909e"
      metalness={0.85}
      roughness={0.38}
    />
  );
  const timberMat = (
    <meshStandardMaterial
      map={timber.map}
      normalMap={timber.normalMap}
      color="#e2cfb8"
      roughness={0.85}
    />
  );

  return (
    <group>
      {/* ===== Hinged floor slab with counter-arm ===== */}
      <group position={pivot} rotation={[0, 0, angle]}>
        <mesh position={[-slabLength / 2, -0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[slabLength, 0.5, 3.2]} />
          <meshStandardMaterial color="#4d505d" roughness={0.88} />
        </mesh>
        <mesh position={[-slabLength / 2, 0.012, 0]} receiveShadow>
          <boxGeometry args={[slabLength, 0.035, 3.2]} />
          <meshStandardMaterial
            map={floorStone.map}
            normalMap={floorStone.normalMap}
            roughnessMap={floorStone.roughnessMap}
            normalScale={new THREE.Vector2(0.6, 0.6)}
            color="#c4c9d5"
            roughness={0.82}
          />
        </mesh>
        {/* Iron edge straps so the slab reads as a separate machine part */}
        {[-1.55, 1.55].map((z) => (
          <mesh key={`slab-strap-${z}`} position={[-slabLength / 2, -0.25, z]}>
            <boxGeometry args={[slabLength + 0.02, 0.52, 0.08]} />
            {ironMat}
          </mesh>
        ))}
        {/* Under-slab ribs */}
        {[-3.6, -2.4, -1.2].map((x) => (
          <mesh key={`slab-rib-${x}`} position={[x, -0.6, 0]} scale={[1, frameIn, 1]}>
            <boxGeometry args={[0.18, 0.22, 3.0]} />
            {timberMat}
          </mesh>
        ))}

        {/* Lever bracket + twin counter-arms */}
        <group scale={[armIn, armIn, armIn]}>
          {[-0.95, 0.95].map((z) => (
            <group key={`arm-${z}`}>
              <mesh position={[0.08, -ARM_DROP / 2 - 0.25, z]} castShadow>
                <boxGeometry args={[0.22, ARM_DROP + 0.1, 0.24]} />
                {ironMat}
              </mesh>
              <mesh position={[ARM_LENGTH / 2, -ARM_DROP, z]} castShadow>
                <boxGeometry args={[ARM_LENGTH + 0.2, 0.22, 0.24]} />
                {timberMat}
              </mesh>
            </group>
          ))}
          <mesh position={[ARM_LENGTH, -ARM_DROP, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 2.2, 10]} />
            {ironMat}
          </mesh>
        </group>
      </group>

      {/* ===== Axle and gold torsion springs ===== */}
      <group position={pivot} scale={[axleIn, axleIn, axleIn]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 3.3, 14]} />
          {ironMat}
        </mesh>
        {[-1.3, -0.45, 0.45, 1.3].map((z) => (
          <group key={`spring-${z}`} position={[0, 0, z]} rotation={[0, 0, springTwist]}>
            {[-0.18, -0.06, 0.06, 0.18].map((dz) => (
              <mesh key={`coil-${dz}`} position={[0, 0, dz]}>
                <torusGeometry args={[0.28, 0.045, 8, 18]} />
                <meshStandardMaterial
                  color="#e0b04a"
                  emissive="#a06a10"
                  emissiveIntensity={springGlow}
                  metalness={0.85}
                  roughness={0.28}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ===== A-frame supports down to the chamber floor ===== */}
      {[-1.75, 0.55].map((z) => (
        <group key={`aframe-${z}`} position={[pivot[0], 0, z]} scale={[1, frameIn, 1]}>
          {[-1, 1].map((side) => {
            const footX = side * 1.1;
            const h = -CHAMBER_FLOOR;
            const len = Math.hypot(footX, h);
            return (
              <mesh
                key={`leg-${side}`}
                position={[footX / 2, CHAMBER_FLOOR / 2, 0]}
                rotation={[0, 0, Math.atan2(footX, h)]}
                castShadow
              >
                <boxGeometry args={[0.2, len, 0.2]} />
                {timberMat}
              </mesh>
            );
          })}
          <mesh position={[0, CHAMBER_FLOOR * 0.55, 0]}>
            <boxGeometry args={[1.3, 0.14, 0.16]} />
            {timberMat}
          </mesh>
        </group>
      ))}

      {/* ===== Counterweight on its rope ===== */}
      {weightIn > 0 ? (
        <group>
          <mesh position={[armEnd[0], (armEnd[1] + weightTop) / 2, armEnd[2]]}>
            <cylinderGeometry args={[0.03, 0.03, Math.max(0.05, armEnd[1] - weightTop), 6]} />
            <meshStandardMaterial color="#8a6a45" roughness={0.9} />
          </mesh>
          <group position={[armEnd[0], weightY, armEnd[2]]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.0, weightHeight, 1.3]} />
              {ironMat}
            </mesh>
            {[-0.25, 0.25].map((y) => (
              <mesh key={`band-${y}`} position={[0, y, 0]}>
                <boxGeometry args={[1.04, 0.08, 1.34]} />
                <meshStandardMaterial color="#c79a3e" metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
            <mesh position={[0, weightHeight / 2 + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.14, 0.035, 8, 14]} />
              {ironMat}
            </mesh>
          </group>
        </group>
      ) : null}

      {/* ===== Latch rope holding the weight up; snaps at launch ===== */}
      {weightIn >= 1 && latched ? (
        <mesh position={[armEnd[0], (latchTop + latchFloorY) / 2, armEnd[2]]}>
          <cylinderGeometry args={[0.035, 0.035, latchTop - latchFloorY, 6]} />
          <meshStandardMaterial color="#c9a46a" roughness={0.8} emissive="#5a3a10" emissiveIntensity={0.2} />
        </mesh>
      ) : null}
      {!latched && snapAge < 14
        ? [-1, 1].map((side) => {
            const whip = Math.exp(-snapAge / 5) * side * 0.9;
            return (
              <mesh
                key={`snap-${side}`}
                position={[
                  pivot[0] + ARM_LENGTH + side * 0.2,
                  side > 0 ? latchFloorY + 0.35 : latchTop - 0.35,
                  pivot[2],
                ]}
                rotation={[0, 0, whip]}
              >
                <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
                <meshStandardMaterial color="#c9a46a" roughness={0.8} />
              </mesh>
            );
          })
        : null}
      {/* Floor anchor ring */}
      <mesh position={[pivot[0] + ARM_LENGTH, CHAMBER_FLOOR + 0.05, pivot[2]]}>
        <boxGeometry args={[0.4, 0.1, 0.4]} />
        {ironMat}
      </mesh>
    </group>
  );
};
