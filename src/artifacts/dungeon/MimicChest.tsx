import type React from "react";
import * as THREE from "three";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeMetal, makeWood } from "../../engine/textures";
import { GlowSprite } from "./Fx";

interface MimicChestProps {
  position?: Vec3;
  rotationY?: number;
  scale?: number;
  spawnFrame: number;
  /** Lid flies wide open to catch the party. */
  openFrame: number;
  /** Lid slams shut. */
  chompFrame: number;
  /** Burp: lid pops open once, then the mimic settles smugly. */
  burpFrame: number;
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const W = 1.8;
const D = 1.3;
const BASE_H = 0.85;

export const MimicChest: React.FC<MimicChestProps> = ({
  position = [7.0, 0, -0.6],
  rotationY = 0,
  scale = 1,
  spawnFrame,
  openFrame,
  chompFrame,
  burpFrame,
}) => {
  const frame = useCurrentFrame();

  const wood = useSurface(
    "mimic-wood",
    () =>
      makeWood({
        planks: 4,
        base: "#6a3f22",
        baseAlt: "#7a4a28",
        seam: "#22120a",
        seed: 81,
      }),
    [1, 1]
  );
  const iron = useSurface(
    "mimic-iron",
    () => makeMetal({ base: "#3c3f48", seed: 82, roughness: 120 }),
    [1, 1]
  );

  if (frame < spawnFrame) return null;

  const spawn = interpolate(frame, [spawnFrame, spawnFrame + 18], [0.001, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.6)),
  });

  // ---- Lid choreography -------------------------------------------------
  const chewEnd = burpFrame;
  let lid = 0.04 + Math.max(0, Math.sin(frame * 0.05)) * 0.03;
  let squash = 0;
  if (frame >= openFrame - 12 && frame < openFrame) {
    // Anticipation: a hungry twitch before the jaws gape.
    lid = 0.12 + Math.sin((frame - openFrame) * 1.4) * 0.08;
  }
  if (frame >= openFrame) {
    lid = interpolate(frame, [openFrame, openFrame + 8], [0.1, 1.3], {
      ...clamp,
      easing: Easing.out(Easing.back(2)),
    });
    lid += Math.sin(frame * 0.5) * 0.05;
  }
  if (frame >= chompFrame - 6) {
    lid = interpolate(frame, [chompFrame - 6, chompFrame], [1.3, 0], {
      ...clamp,
      easing: Easing.in(Easing.cubic),
    });
    squash = interpolate(frame, [chompFrame, chompFrame + 3, chompFrame + 12], [0, 0.18, 0], clamp);
  }
  if (frame >= chompFrame + 6 && frame < chewEnd) {
    const t = frame - chompFrame - 6;
    const chew = Math.abs(Math.sin(t * 0.3));
    lid = chew * 0.22;
    squash = (1 - chew) * 0.08;
  }
  if (frame >= burpFrame) {
    lid = interpolate(frame, [burpFrame, burpFrame + 3, burpFrame + 18], [0, 0.75, 0.12], {
      ...clamp,
    });
    squash = interpolate(frame, [burpFrame, burpFrame + 3, burpFrame + 10], [0, -0.12, 0], clamp);
    if (frame > burpFrame + 18) {
      lid = 0.12 + Math.sin((frame - burpFrame) * 0.08) * 0.04;
    }
  }

  const awake = frame >= openFrame - 12;
  const eyeOpen = interpolate(frame, [openFrame - 12, openFrame - 4], [0, 1], clamp);
  const mouthGlow = Math.min(1, lid / 0.6);
  const tongueOut =
    frame >= burpFrame + 18 ? 0.35 + Math.sin(frame * 0.18) * 0.12 : lid > 0.6 ? 0.3 : 0;

  const woodMat = (
    <meshStandardMaterial
      map={wood.map}
      normalMap={wood.normalMap}
      roughnessMap={wood.roughnessMap}
      color="#e8cdb0"
      roughness={0.78}
    />
  );
  const ironMat = (
    <meshStandardMaterial
      map={iron.map}
      roughnessMap={iron.roughnessMap}
      color="#7c818d"
      metalness={0.85}
      roughness={0.4}
    />
  );
  const goldMat = <meshStandardMaterial color="#e2b14a" metalness={0.85} roughness={0.28} />;
  const toothMat = <meshStandardMaterial color="#f3ecd0" roughness={0.35} />;

  const teethX = Array.from({ length: 9 }, (_, i) => -0.76 + i * 0.19);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      scale={[spawn * scale * (1 + squash), spawn * scale * (1 - squash), spawn * scale * (1 + squash)]}
    >
      {/* ===== Base (lower jaw) ===== */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, BASE_H, D]} />
        {woodMat}
      </mesh>
      {/* Iron bands */}
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={`band-${x}`} position={[x, BASE_H / 2, 0]}>
          <boxGeometry args={[0.1, BASE_H + 0.02, D + 0.04]} />
          {ironMat}
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[W + 0.04, 0.12, D + 0.04]} />
        {ironMat}
      </mesh>
      {/* Gold corner caps */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`corner-${sx}-${sz}`} position={[sx * (W / 2), BASE_H - 0.1, sz * (D / 2)]}>
          <boxGeometry args={[0.16, 0.22, 0.16]} />
          {goldMat}
        </mesh>
      ))}
      {/* Mouth interior */}
      <mesh position={[0, BASE_H - 0.02, 0]}>
        <boxGeometry args={[W - 0.16, 0.05, D - 0.16]} />
        <meshStandardMaterial
          color="#2a0710"
          emissive="#5c0b2b"
          emissiveIntensity={0.6 + mouthGlow * 1.2}
          roughness={0.6}
        />
      </mesh>
      {/* Lower teeth */}
      {teethX.map((x, i) => (
        <mesh
          key={`tooth-low-${i}`}
          position={[x, BASE_H + 0.1, D / 2 - 0.08]}
          rotation={[0.15, 0, (i % 2) * 0.1]}
        >
          <coneGeometry args={[0.065, 0.24 + (i % 3) * 0.05, 5]} />
          {toothMat}
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`tooth-side-${side}`} position={[side * 0.82, BASE_H + 0.1, 0]}>
          <coneGeometry args={[0.06, 0.22, 5]} />
          {toothMat}
        </mesh>
      ))}
      {/* Tongue */}
      <group position={[0, BASE_H + 0.02, -0.25]} rotation={[-tongueOut * 0.6, 0, Math.sin(frame * 0.2) * 0.12]}>
        <mesh position={[0, 0.04, 0.45 + tongueOut * 0.7]} scale={[1, 0.35, 1]} castShadow>
          <sphereGeometry args={[0.32, 14, 10]} />
          <meshStandardMaterial color="#c2306c" emissive="#5a0b30" emissiveIntensity={0.4} roughness={0.35} />
        </mesh>
      </group>
      {/* Keyhole plate */}
      <mesh position={[0, BASE_H - 0.18, D / 2 + 0.03]}>
        <boxGeometry args={[0.3, 0.32, 0.04]} />
        {goldMat}
      </mesh>

      {/* ===== Lid (upper jaw), hinged at the back ===== */}
      <group position={[0, BASE_H, -D / 2]} rotation={[-lid, 0, 0]}>
        <mesh position={[0, 0.22, D / 2]} castShadow>
          <boxGeometry args={[W, 0.44, D]} />
          {woodMat}
        </mesh>
        <mesh position={[0, 0.44, D / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[D / 2, D / 2, W, 18, 1, false, 0, Math.PI]} />
          {woodMat}
        </mesh>
        {[-0.55, 0, 0.55].map((x) => (
          <mesh key={`lid-band-${x}`} position={[x, 0.44, D / 2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[D / 2 + 0.03, D / 2 + 0.03, 0.1, 18, 1, false, 0, Math.PI]} />
            {ironMat}
          </mesh>
        ))}
        {/* Upper teeth */}
        {teethX.map((x, i) => (
          <mesh
            key={`tooth-up-${i}`}
            position={[x + 0.09, -0.1, D - 0.08]}
            rotation={[Math.PI - 0.15, 0, 0]}
          >
            <coneGeometry args={[0.07, 0.28 + ((i + 1) % 3) * 0.05, 5]} />
            {toothMat}
          </mesh>
        ))}
        {/* Lid eyes: hidden while disguised, glare once it wakes */}
        {[-0.42, 0.42].map((x) => (
          <group key={`eye-${x}`} position={[x, 0.32, D + 0.01]}>
            <mesh scale={[1, Math.max(0.05, eyeOpen), 1]}>
              <sphereGeometry args={[0.13, 14, 10]} />
              <meshStandardMaterial
                color="#fff3a0"
                emissive="#ffb800"
                emissiveIntensity={awake ? 2.4 : 0}
              />
            </mesh>
            <mesh position={[0, 0, 0.1]} scale={[0.45, Math.max(0.05, eyeOpen), 1]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshBasicMaterial color="#1a0505" />
            </mesh>
            {/* Angry brow */}
            <mesh position={[0, 0.17, 0.04]} rotation={[0, 0, x < 0 ? -0.35 : 0.35]}>
              <boxGeometry args={[0.32, 0.06, 0.05]} />
              {ironMat}
            </mesh>
          </group>
        ))}
      </group>

      {awake ? (
        <GlowSprite position={[0, BASE_H + 0.3, 0.4]} color="#ff3b8a" size={1.2 + mouthGlow * 1.6} opacity={0.35 * mouthGlow} />
      ) : null}
      <pointLight
        position={[0, BASE_H + 0.5, 0.6]}
        color="#ff3b8a"
        intensity={awake ? 1.2 + mouthGlow * 3 : 0}
        distance={5}
        decay={2}
      />
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.25, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
