import type React from "react";
import { useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, glow, vinyl } from "../characters/hero";
import { Tentacle } from "./Creatures";

/**
 * The Dragon in the series "ink & vinyl" toy aesthetic.
 *
 * Modeled as a chunky fantasy dragon with an anatomical cutaway window
 * exposing the two stomachs (fermentation rumen & muscular pressure chamber),
 * the fuel trachea, Komodo-style iron teeth, flint-strike sparks, and the
 * high-velocity flame exhaust jet that anchors safely outside the jaws.
 */

const Eye: React.FC<{
  position: Vec3;
  r?: number;
  color?: string;
  slit?: "v" | "h" | "round";
  open?: number;
  look?: [number, number];
  yaw?: number;
}> = ({ position, r = 0.1, color = "#ffc038", slit = "v", open = 1, look = [0, 0], yaw = 0 }) => {
  const pupil: Vec3 = slit === "v" ? [r * 0.28, r * 1.3, 1] : slit === "h" ? [r * 1.3, r * 0.32, 1] : [r * 0.75, r * 0.75, 1];
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[1, Math.max(0.06, open), 1]}>
      <Part geo={G.sphere(r)} mat={vinyl(color, "gloss")} ink={INK_THIN} />
      <mesh position={[look[0] * r * 0.35, look[1] * r * 0.35, r * 0.94]} scale={pupil} geometry={G.disc(0.5)} material={flat("#12080a")} />
    </group>
  );
};

export interface DragonProps {
  position?: Vec3;
  yaw?: number;
  pitch?: number;
  scale?: number;
  /** 0 = jaws shut tight, 1 = roaring open */
  jawOpen?: number;
  /** 0 = full scales, 1 = torso opened in cross-section */
  cutaway?: number;
  /** Stomach 1 vegetal mulch churn / fermentation bubbling (0..1) */
  fermentMulch?: number;
  /** Stomach 2 muscular pressure clench / contraction (0..1) */
  stomachClench?: number;
  /** Gas flow pulse traveling up trachea to mouth (0..1) */
  gasFlow?: number;
  /** Spark shower intensity at teeth contact (0..1) */
  sparkIntensity?: number;
  /** Flamethrower blast roaring out of snout (0..1) */
  flameIntensity?: number;
  /** Eye blink (0 = open, 1 = closed) */
  blink?: number;
  /** Horizontal tail sway (-1..1) */
  tailWhip?: number;
  /** Subtly breathe chest (0..1) */
  breathPhase?: number;
}

export const Dragon: React.FC<DragonProps> = ({
  position = [0, 0, 0],
  yaw = 0,
  pitch = 0,
  scale = 1,
  jawOpen = 0,
  cutaway = 0,
  fermentMulch = 0,
  stomachClench = 0,
  gasFlow = 0,
  sparkIntensity = 0,
  flameIntensity = 0,
  blink = 0,
  tailWhip = 0,
  breathPhase = 0,
}) => {
  const frame = useCurrentFrame();

  // Materials
  const scales = vinyl("#335838", "leather"); // rich dragon green
  const darkScales = vinyl("#203824", "leather"); // darker dorsal scutes
  const bellyPlates = vinyl("#e0ce94", "leather"); // warm pale reptilian belly
  const hornMat = vinyl("#efe8cd", "bone"); // horn / bone
  const ironTeeth = vinyl("#38424d", "metal"); // Komodo iron-coated enamel
  const redMuscle = vinyl("#a82424", "cloth"); // striated gastric muscle bands
  const mulchMat = vinyl("#526328", "leather"); // fermenting plant mulch
  const ribBone = vinyl("#efe9d5", "bone"); // cutaway ribcage struts
  const wingSkin = vinyl("#263d2b", "cloth"); // wing membrane

  // Breathing & clench offsets
  const chestRise = 0.05 * Math.sin(breathPhase * Math.PI * 2);
  const clenchScale = 1 - stomachClench * 0.28;

  return (
    <group position={position} rotation={[pitch, yaw, 0]} scale={scale}>
      {/* ---------------- Torso & Underbelly ---------------- */}
      <group position={[0, 0.95 + chestRise, 0]}>
        {/* Dorsal spinal scutes along back (always visible) */}
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          const x = -0.7 + 1.4 * t;
          const scuteH = 0.16 + 0.08 * Math.sin(t * Math.PI);
          return (
            <Part
              key={i}
              geo={G.cone(0.08, scuteH, 5)}
              mat={darkScales}
              position={[x, 0.58, 0]}
              rotation={[0, 0, -0.15 + 0.3 * (1 - t)]}
              scale={[0.7, 1, 1]}
              ink={INK_THIN}
            />
          );
        })}

        {/* Back/Dorsal Torso Shell (always rendered at -Z) */}
        <group position={[0, 0, -0.15]}>
          <Part geo={G.capsule(0.55, 1.6)} mat={scales} rotation={[0, 0, Math.PI / 2]} scale={[0.95, 1.05, 0.85]} />
        </group>

        {/* Front/Belly Shell (+Z side): slides open / hides when cutaway is active */}
        {cutaway < 0.95 && (
          <group position={[0, -0.15 * cutaway, 0.25 * (1 - cutaway)]} scale={[1, 1 - cutaway * 0.4, 1 - cutaway]}>
            <Part geo={G.capsule(0.52, 1.55)} mat={scales} rotation={[0, 0, Math.PI / 2]} scale={[0.92, 1.02, 0.85]} />
            <Part geo={G.capsule(0.42, 1.42)} mat={bellyPlates} position={[0, -0.2, 0.1]} rotation={[0, 0, Math.PI / 2]} scale={[0.7, 1.0, 1.1]} ink={false} />
          </group>
        )}

        {/* ---------------- Cutaway Anatomical Cross-Section (+Z side) ---------------- */}
        {cutaway > 0.05 && (
          <group position={[0, 0, 0.15]} scale={[1, 1, cutaway]}>
            {/* Cutaway border / ribcage struts */}
            <Part geo={G.torus(0.52, 0.045)} mat={ribBone} position={[-0.38, 0.02, 0.22]} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.95, 1]} />
            <Part geo={G.torus(0.52, 0.045)} mat={ribBone} position={[0.0, 0.02, 0.22]} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.95, 1]} />
            <Part geo={G.torus(0.52, 0.045)} mat={ribBone} position={[0.38, 0.02, 0.22]} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.95, 1]} />

            {/* Dark internal cavity background */}
            <mesh position={[0, 0, -0.05]} geometry={G.box(1.4, 0.95, 0.35, 0.05)} material={flat("#140d10")} />

            {/* STOMACH 1: Rumen / Fermentation Tank (Left / Low) */}
            <group position={[-0.35, -0.1, 0.2]}>
              <Part geo={G.sphere(0.32)} mat={mulchMat} scale={[1.2, 0.88, 0.9]} />
              {/* Microbe motes / fermenting bubbles */}
              {Array.from({ length: 6 }, (_, i) => {
                const bubbleY = -0.1 + (((frame * 0.04 + i * 0.2) * (1 + fermentMulch)) % 0.35);
                const bubbleX = -0.15 + (i % 3) * 0.14;
                return (
                  <Part
                    key={i}
                    geo={G.sphere(0.04)}
                    mat={glow("#5ae820")}
                    position={[bubbleX, bubbleY, 0.22]}
                    scale={(0.7 + 0.3 * Math.sin(frame * 0.25 + i)) * (0.6 + 0.4 * fermentMulch)}
                    ink={false}
                  />
                );
              })}
            </group>

            {/* STOMACH 2: Muscular Pressure Chamber (Right / High) */}
            <group position={[0.28, 0.08, 0.2]} scale={clenchScale}>
              {/* Red striated muscular outer shell (back & sides) */}
              <Part geo={G.sphere(0.35)} mat={redMuscle} position={[0, 0, -0.06]} scale={[1.15, 0.95, 0.85]} />
              {/* Muscle bands wrapping tight */}
              <Part geo={G.torus(0.32, 0.038)} mat={vinyl("#601010", "cloth")} rotation={[0, Math.PI / 4, 0]} />
              <Part geo={G.torus(0.32, 0.038)} mat={vinyl("#601010", "cloth")} rotation={[0, -Math.PI / 4, 0]} />
              {/* Pressurized methane core (pure CH4, radiant cyan glow shining out) */}
              <Part geo={G.sphere(0.26)} mat={glow("#1ef5bd")} position={[0, 0, 0.12]} scale={[1.05, 0.92, 0.92]} ink={false} />
            </group>

            {/* Trachea / Gas fuel conduit connecting Stomach 2 to the neck */}
            <Tentacle
              n={8}
              r0={0.085 * clenchScale}
              r1={0.06}
              mat={redMuscle}
              path={(t) => [0.45 + 0.45 * t, 0.12 + 0.35 * t, 0.18 - 0.05 * t]}
            />
            {gasFlow > 0.05 && (
              <Tentacle
                n={8}
                r0={0.055}
                r1={0.04}
                mat={glow("#2bf5be")}
                path={(t) => [0.45 + 0.45 * t, 0.12 + 0.35 * t, 0.18 - 0.05 * t]}
                ink={false}
              />
            )}
          </group>
        )}
      </group>

      {/* ---------------- Neck & Skull ---------------- */}
      {/* Sinuous muscular neck */}
      <Tentacle
        n={10}
        r0={0.34}
        r1={0.24}
        mat={scales}
        path={(t) => {
          const x = 0.7 + 0.8 * t;
          const y = 1.0 + 0.7 * t + 0.1 * Math.sin(t * Math.PI);
          return [x, y, 0];
        }}
      />
      {/* Neck underbelly ridge */}
      <Tentacle
        n={8}
        r0={0.22}
        r1={0.14}
        mat={bellyPlates}
        path={(t) => {
          const x = 0.7 + 0.8 * t;
          const y = 0.88 + 0.65 * t;
          return [x, y, 0];
        }}
        ink={false}
      />

      {/* Neck spinal crests */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = i / 5;
        const x = 0.75 + 0.7 * t;
        const y = 1.25 + 0.65 * t;
        return (
          <Part
            key={i}
            geo={G.cone(0.06, 0.18, 5)}
            mat={darkScales}
            position={[x, y, 0]}
            rotation={[0, 0, -0.5]}
            ink={INK_THIN}
          />
        );
      })}

      {/* Head Assembly */}
      <group position={[1.55, 1.82, 0]}>
        {/* Cranium / Braincase */}
        <Part geo={G.sphere(0.3)} mat={scales} scale={[1.1, 0.95, 0.95]} />

        {/* Back-swept horns */}
        {[-1, 1].map((s) => (
          <group key={s} position={[-0.1, 0.22, s * 0.18]} rotation={[0.2 * s, 0, -0.6]}>
            <Part geo={G.cone(0.08, 0.55, 7)} mat={hornMat} position={[0, 0.22, 0]} />
            <Part geo={G.cone(0.05, 0.28, 6)} mat={hornMat} position={[-0.05, 0.05, s * 0.1]} rotation={[0, 0, -0.3]} />
          </group>
        ))}

        {/* Eyes (amber reptilian slit) */}
        {[-1, 1].map((s) => (
          <Eye key={s} position={[0.08, 0.12, s * 0.24]} r={0.09} color="#ffa929" slit="v" open={1 - blink} yaw={s * 0.4} />
        ))}

        {/* Snout / Upper Jaw */}
        <group position={[0.34, 0.02, 0]}>
          <Part geo={G.box(0.55, 0.22, 0.38, 0.06)} mat={scales} position={[0, 0.04, 0]} />
          {/* Nostrils */}
          {[-1, 1].map((s) => (
            <Part key={s} geo={G.sphere(0.04)} mat={darkScales} position={[0.22, 0.09, s * 0.09]} scale={[1.4, 0.8, 0.8]} ink={INK_THIN} />
          ))}

          {/* Upper Komodo Iron-coated Teeth */}
          {Array.from({ length: 6 }, (_, i) => {
            const tx = -0.18 + i * 0.08;
            return [-1, 1].map((s) => (
              <Part
                key={`${i}${s}`}
                geo={G.cone(0.024, 0.09, 5)}
                mat={ironTeeth}
                position={[tx, -0.07, s * 0.16]}
                rotation={[Math.PI, 0, 0]}
                ink={false}
              />
            ));
          })}
        </group>

        {/* Hinged Lower Jaw */}
        <group position={[0.08, -0.16, 0]} rotation={[0, 0, -jawOpen * 0.55]}>
          <Part geo={G.box(0.58, 0.14, 0.34, 0.05)} mat={bellyPlates} position={[0.26, -0.02, 0]} />
          {/* Fleshy Tongue inside jaw */}
          <Part geo={G.capsule(0.06, 0.28)} mat={vinyl("#ab3450", "skin")} position={[0.24, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} ink={false} />

          {/* Lower Komodo Iron-coated Teeth */}
          {Array.from({ length: 6 }, (_, i) => {
            const tx = 0.08 + i * 0.08;
            return [-1, 1].map((s) => (
              <Part
                key={`${i}${s}`}
                geo={G.cone(0.024, 0.09, 5)}
                mat={ironTeeth}
                position={[tx, 0.06, s * 0.14]}
                rotation={[0, 0, 0]}
                ink={false}
              />
            ));
          })}
        </group>

        {/* ---------------- Ignition Flint Sparks (At Mouth Tip) ---------------- */}
        {sparkIntensity > 0.01 && (
          <group position={[0.62, -0.08, 0]}>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const r = 0.08 + 0.14 * ((frame + i * 3) % 4) * 0.25;
              const spX = Math.cos(a) * r;
              const spY = Math.sin(a) * r * 0.8;
              return (
                <Part
                  key={i}
                  geo={G.sphere(0.028)}
                  mat={glow("#ffee88")}
                  position={[spX, spY, (i % 2 === 0 ? 1 : -1) * 0.08]}
                  scale={sparkIntensity * (1 + 0.5 * Math.sin(frame * 0.5 + i))}
                  ink={false}
                />
              );
            })}
          </group>
        )}

        {/* ---------------- Gas Jet Stream & Flamethrower Blast ---------------- */}
        {/* High-velocity fuel stream exiting mouth nozzle */}
        {gasFlow > 0.05 && (
          <group position={[0.6, -0.08, 0]}>
            <Part
              geo={G.cone(0.09, 0.65, 8)}
              mat={glow("#43ebc1")}
              position={[0.3, 0, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              scale={[1, gasFlow, 1]}
              ink={false}
            />
          </group>
        )}

        {/* The Full Roaring Flame Front (Anchored safely outside jaws!) */}
        {flameIntensity > 0.01 && (
          <group position={[0.95, -0.06, 0]}>
            {/* Dynamic Fire Light illuminating the dragon and cavern */}
            <pointLight
              color="#ff8426"
              intensity={flameIntensity * 14 * (0.85 + 0.15 * Math.sin(frame * 0.8))}
              distance={16}
              decay={1.8}
            />

            {/* Inner White-Hot Core */}
            <Part
              geo={G.cone(0.18, 0.9, 10)}
              mat={glow("#ffffff")}
              position={[0.42, 0, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              scale={[flameIntensity * 1.1, flameIntensity * 1.2, flameIntensity * 1.1]}
              ink={false}
            />

            {/* Mid Intense Yellow Flame Body */}
            <Part
              geo={G.cone(0.38, 1.8, 10)}
              mat={glow("#ffe62b")}
              position={[0.85, 0, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              scale={[flameIntensity * (1 + 0.1 * Math.sin(frame * 0.6)), flameIntensity * 1.3, flameIntensity * 1.1]}
              ink={false}
            />

            {/* Outer Deep Orange / Crimson Expanding Flame Plume */}
            {Array.from({ length: 6 }, (_, i) => {
              const plumeX = 0.6 + i * 0.38;
              const plumeR = 0.28 + i * 0.11;
              const wobbleY = 0.08 * Math.sin(frame * 0.4 + i * 1.4);
              const wobbleZ = 0.08 * Math.cos(frame * 0.4 + i * 1.4);
              return (
                <Part
                  key={i}
                  geo={G.sphere(plumeR)}
                  mat={glow(i % 2 === 0 ? "#ff5e14" : "#ff3008")}
                  position={[plumeX, wobbleY, wobbleZ]}
                  scale={flameIntensity * (1 + 0.18 * Math.sin(frame * 0.5 + i))}
                  ink={false}
                />
              );
            })}
          </group>
        )}
      </group>

      {/* ---------------- 4 Chunky Sturdy Legs ---------------- */}
      {/* Front Forelimbs */}
      {[-1, 1].map((s) => (
        <group key={`front-${s}`} position={[0.55, 0.5, s * 0.55]}>
          {/* Upper leg */}
          <Part geo={G.capsule(0.18, 0.55)} mat={scales} rotation={[0.2, 0, -0.1]} />
          {/* Lower leg */}
          <Part geo={G.capsule(0.14, 0.48)} mat={scales} position={[0.04, -0.32, 0]} />
          {/* Claws */}
          <Part geo={G.box(0.32, 0.1, 0.24, 0.04)} mat={scales} position={[0.1, -0.5, 0]} />
          {[-0.07, 0, 0.07].map((cz, ci) => (
            <Part key={ci} geo={G.cone(0.024, 0.12, 5)} mat={hornMat} position={[0.24, -0.5, cz]} rotation={[0, 0, -Math.PI / 2]} ink={false} />
          ))}
        </group>
      ))}

      {/* Rear Hindlimbs */}
      {[-1, 1].map((s) => (
        <group key={`rear-${s}`} position={[-0.58, 0.58, s * 0.58]}>
          {/* Bulky thigh */}
          <Part geo={G.capsule(0.25, 0.62)} mat={scales} rotation={[-0.2, 0, 0.15]} />
          {/* Shank */}
          <Part geo={G.capsule(0.17, 0.52)} mat={scales} position={[-0.04, -0.36, 0]} />
          {/* Foot & Claws */}
          <Part geo={G.box(0.36, 0.12, 0.26, 0.04)} mat={scales} position={[0.08, -0.58, 0]} />
          {[-0.08, 0, 0.08].map((cz, ci) => (
            <Part key={ci} geo={G.cone(0.028, 0.14, 5)} mat={hornMat} position={[0.24, -0.58, cz]} rotation={[0, 0, -Math.PI / 2]} ink={false} />
          ))}
        </group>
      ))}

      {/* ---------------- Sweeping Tail ---------------- */}
      <Tentacle
        n={14}
        r0={0.42}
        r1={0.06}
        mat={scales}
        path={(t) => {
          const x = -0.8 - 2.4 * t;
          const y = 0.85 - 0.5 * t + 0.15 * Math.sin(t * 3.5);
          const z = tailWhip * 0.7 * Math.sin(t * Math.PI);
          return [x, y, z];
        }}
      />
      {/* Tail scutes */}
      {Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        const x = -0.9 - 2.1 * t;
        const y = 0.98 - 0.48 * t + 0.15 * Math.sin(t * 3.5);
        const z = tailWhip * 0.7 * Math.sin(t * Math.PI);
        return (
          <Part
            key={i}
            geo={G.cone(0.05, 0.14 * (1 - t * 0.5), 5)}
            mat={darkScales}
            position={[x, y, z]}
            rotation={[0, 0, 0.4]}
            ink={INK_THIN}
          />
        );
      })}

      {/* ---------------- Folded Dragon Wings ---------------- */}
      {[-1, 1].map((s) => (
        <group key={`wing-${s}`} position={[-0.1, 1.25, s * 0.48]} rotation={[0.3 * s, 0.1 * s, 0.2]}>
          {/* Main wing bone strut */}
          <Part geo={G.capsule(0.08, 1.1)} mat={hornMat} position={[0, 0.5, 0]} rotation={[0, 0, 0.4]} />
          {/* Secondary elbow strut */}
          <Part geo={G.capsule(0.06, 0.95)} mat={hornMat} position={[-0.32, 0.85, 0]} rotation={[0, 0, -0.5]} />
          {/* Wing membrane sail */}
          <mesh position={[-0.22, 0.55, 0]} geometry={G.box(0.7, 0.75, 0.02, 0.01)} material={wingSkin} />
        </group>
      ))}
    </group>
  );
};
