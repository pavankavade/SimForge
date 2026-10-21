import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import type { TrapdoorEvent } from "./HingedTrapdoor";
import { trapdoorAngle } from "./HingedTrapdoor";

interface PressurePlateProps {
  spawnFrame?: number;
  /** Frames where something steps on the plate. */
  triggerFrames?: number[];
  /** Trapdoor schedule: the plate is set into the right flap and rides it. */
  trapdoorEvents?: TrapdoorEvent[];
  /** Frames after a trigger that the plate and its wire stay lit. */
  glowFrames?: number;
}

const PLATE_X = 1.1;
const HINGE_X = 2.0;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const PressurePlate: React.FC<PressurePlateProps> = ({
  spawnFrame = 470,
  triggerFrames = [],
  trapdoorEvents = [],
  glowFrames = 70,
}) => {
  const frame = useCurrentFrame();

  if (frame < spawnFrame) return null;

  const spawnScale = interpolate(frame, [spawnFrame, spawnFrame + 14], [0.001, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.5)),
  });

  const lastTrigger = [...triggerFrames].reverse().find((f) => frame >= f);
  const age = lastTrigger === undefined ? Infinity : frame - lastTrigger;
  const depression = age < glowFrames ? interpolate(age, [0, 3], [0, 0.05], clamp) : 0;
  // Glow is strong right after the click, then fades back to a faint idle.
  const lit = age < glowFrames ? interpolate(age, [0, 4, glowFrames - 20, glowFrames], [0, 1, 1, 0], clamp) : 0;
  // Guard: age is Infinity before the first trigger and 0 * NaN would poison
  // the emissive (NaN pixels blow out the whole frame through bloom).
  const pulse = lit > 0 ? 0.35 + lit * (1.6 + Math.sin(age * 0.5) * 0.4) : 0.35;
  // Signal runs from the plate along the wire to the latch in ~6 frames.
  const signal = interpolate(age, [0, 6], [0, 1], clamp);
  const latchSlide = interpolate(age, [4, 6], [0, 0.35], clamp);

  const flap = trapdoorAngle(frame, trapdoorEvents);
  const local = PLATE_X - HINGE_X;
  const wireLen = Math.abs(local) + 0.85;

  const redGlow = (intensity: number) => (
    <meshStandardMaterial
      color="#e04a3a"
      emissive="#ff2a1a"
      emissiveIntensity={intensity}
      roughness={0.4}
    />
  );

  return (
    <group position={[HINGE_X, -0.05, -0.6]} rotation={[0, 0, flap]}>
      <group position={[local, 0.05, 0]} scale={[spawnScale, spawnScale, spawnScale]}>
        {/* Recess */}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[1.1, 0.04, 1.1]} />
          <meshStandardMaterial color="#21222b" roughness={0.9} />
        </mesh>
        <group position={[0, -depression, 0]}>
          <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.06, 0.9]} />
            <meshStandardMaterial color="#3d414e" metalness={0.72} roughness={0.42} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={`rim-x-${side}`} position={[side * 0.42, 0.075, 0]}>
              <boxGeometry args={[0.07, 0.05, 0.92]} />
              <meshStandardMaterial color="#6d7484" metalness={0.85} roughness={0.3} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={`rim-z-${side}`} position={[0, 0.075, side * 0.42]}>
              <boxGeometry args={[0.92, 0.05, 0.07]} />
              <meshStandardMaterial color="#6d7484" metalness={0.85} roughness={0.3} />
            </mesh>
          ))}
          {/* Rune ring */}
          <mesh position={[0, 0.083, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.27, 24]} />
            {redGlow(pulse * 1.5)}
          </mesh>
          <mesh position={[0, 0.084, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <planeGeometry args={[0.1, 0.1]} />
            {redGlow(pulse * 1.8)}
          </mesh>
        </group>
      </group>

      {/* Inlaid trigger wire from the plate to the centre latch */}
      <mesh position={[local - wireLen / 2, 0.012, 0.3]}>
        <boxGeometry args={[wireLen, 0.012, 0.04]} />
        <meshStandardMaterial color="#5a1c18" roughness={0.6} />
      </mesh>
      {signal > 0 && lit > 0 ? (
        <mesh position={[local - (wireLen * signal) / 2, 0.02, 0.3]}>
          <boxGeometry args={[wireLen * signal, 0.016, 0.05]} />
          {redGlow(3 * lit)}
        </mesh>
      ) : null}
      {/* Latch bolt spanning the seam; slides back when the signal arrives */}
      <group position={[-HINGE_X + 0.05 + latchSlide, 0.03, 0.3]}>
        <mesh>
          <boxGeometry args={[0.5, 0.06, 0.16]} />
          <meshStandardMaterial color="#8d94a4" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0.2, 0.04, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.18]} />
          {redGlow(0.4 + lit * 2.5)}
        </mesh>
      </group>
    </group>
  );
};
