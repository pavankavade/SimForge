import type React from "react";
import { random, useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { G, INK_THIN, Part, flat, vinyl } from "../characters/hero";
import { GlowSprite } from "../dungeon/Fx";
import { Atmosphere, Backdrop, Drift, Rock, Shaft, ThreePoint } from "./common";

/**
 * The extra places of the slime short: the forest floor where the slime mold
 * and the slug live, the sunny courtyard that dries a slime out, and the field
 * of a microscope. As in Sets.tsx, the subject stands at the origin.
 */

// ---------------------------------------------------------------------------
// The forest floor
// ---------------------------------------------------------------------------
export const STUMP = { r: 2.5, h: 0.6 };

const Mushroom: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#d9482f" }) => (
  <group position={position} scale={scale}>
    <Part geo={G.cyl(0.05, 0.07, 0.3, 10)} mat={vinyl("#f0e6d0", "bone")} position={[0, 0.15, 0]} ink={INK_THIN} />
    <Part geo={G.sphere(0.2, 0, Math.PI / 2)} mat={vinyl(color, "gloss")} position={[0, 0.27, 0]} scale={[1, 0.75, 1]} />
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} geometry={G.sphere(0.03)} material={vinyl("#fff6e6", "gloss")} position={[0.11 * Math.cos(i * 1.7), 0.37, 0.11 * Math.sin(i * 1.7)]} scale={[1, 0.5, 1]} />
    ))}
  </group>
);

const Fern: React.FC<{ position: Vec3; scale?: number; seed: string }> = ({ position, scale = 1, seed }) => {
  const frame = useCurrentFrame();
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + random(`${seed}-a`) * 3;
        return (
          <group key={i} rotation={[0, a, 0.03 * Math.sin(frame * 0.04 + i)]}>
            <Part geo={G.bentCone(0.07, 0.015, 1.1, 0.7, 0)} mat={vinyl(i % 2 ? "#3f8a3e" : "#2f7436", "leather")} scale={[1, 1, 3.2]} ink={INK_THIN} />
          </group>
        );
      })}
    </group>
  );
};

/**
 * A damp forest floor around a big sawn stump: the stage is the top of the
 * stump (y = 0). `night` (0..1) turns the warm afternoon into the dark and the
 * damp.
 */
export const ForestSet: React.FC<{ night?: number }> = ({ night = 0 }) => {
  const dark = night > 0.5;
  const bark = vinyl("#4a3626", "wood");
  const trunk = vinyl(dark ? "#141d1c" : "#2c2a1d", "cloth");
  return (
    <>
      <Atmosphere color={dark ? "#08131a" : "#1c2a1c"} near={8} far={30} />
      <Backdrop stops={dark ? ["#0a1a26", "#0f2a33", "#0b1c1c"] : ["#a9c96a", "#5f8f45", "#2f5230", "#1b2f20"]} z={-20} y={6.5} height={34} />
      <ThreePoint
        key_={{ position: [-4, 8, 5], color: dark ? "#b9d2ff" : "#fff0c8", intensity: dark ? 2.3 : 2.5 }}
        rim={{ position: [5, 5, -6], color: dark ? "#4fb6ff" : "#c8ff8a", intensity: dark ? 2.4 : 1.9 }}
        fill={{ color: dark ? "#6f8fb0" : "#b6d09a", ground: "#2a2a1c", intensity: dark ? 0.9 : 0.8 }}
        area={6}
      />
      {/* Leaf litter, then the stump: bark sides and a sawn top with its rings. */}
      <mesh position={[0, -STUMP.h, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 44]} />
        <meshStandardMaterial color={dark ? "#1d241c" : "#3b3423"} roughness={1} />
      </mesh>
      <Part geo={G.cyl(STUMP.r, STUMP.r * 1.12, STUMP.h, 40)} mat={bark} position={[0, -STUMP.h / 2 - 0.01, 0]} />
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[STUMP.r - 0.05, 48]} />
        <meshStandardMaterial color={dark ? "#6f5a40" : "#7d5c3a"} roughness={0.9} />
      </mesh>
      {[0.4, 0.8, 1.2, 1.6, 2.0, 2.3].map((r) => (
        <mesh key={r} position={[0.1, 0.003, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.022, 48]} />
          <meshStandardMaterial color={dark ? "#56442e" : "#63462a"} roughness={1} />
        </mesh>
      ))}
      {/* Roots, moss, mushrooms and ferns around it. */}
      {[0.4, 1.9, 3.3, 4.6, 5.6].map((a, i) => (
        <Part key={a} geo={G.bentCone(0.34, 0.1, 1.9, 1.2, 0)} mat={bark} position={[Math.cos(a) * STUMP.r * 0.92, -0.2, Math.sin(a) * STUMP.r * 0.92]} rotation={[Math.PI, -a, 0]} scale={[1, 0.9 + 0.1 * (i % 2), 1]} />
      ))}
      {[
        [-1.9, -1.3, 0.5],
        [1.7, -1.6, 0.42],
        [-2.1, 0.6, 0.3],
      ].map(([x, z, r], i) => (
        <Part key={i} geo={G.sphere(r)} mat={vinyl(dark ? "#2a5a3a" : "#5c9a3c", "cloth")} position={[x, 0, z]} scale={[1.3, 0.22, 1]} ink={INK_THIN} />
      ))}
      <Mushroom position={[-1.7, 0, -1.0]} scale={1.3} />
      <Mushroom position={[-1.35, 0, -1.35]} scale={0.8} />
      <Mushroom position={[2.0, 0, -0.9]} scale={1.0} color="#e0a43a" />
      <Fern position={[-3.4, -STUMP.h, -1.8]} scale={1.5} seed="f1" />
      <Fern position={[3.6, -STUMP.h, -2.2]} scale={1.8} seed="f2" />
      <Fern position={[4.2, -STUMP.h, 0.8]} scale={1.1} seed="f3" />
      <Fern position={[-4.4, -STUMP.h, 0.6]} scale={1.2} seed="f4" />
      <Rock position={[-3.2, -STUMP.h, -3.4]} size={1.5} color={dark ? "#2c3a40" : "#5d6a58"} seed="fr1" flat={0.9} />
      <Rock position={[3.0, -STUMP.h, -3.8]} size={1.9} color={dark ? "#27343a" : "#56634f"} seed="fr2" flat={1} />
      {[-8, -5, -1.6, 2.4, 6, 9].map((x, i) => (
        <group key={x} position={[x, -STUMP.h, -7 - (i % 2) * 2.4]}>
          <Part geo={G.cyl(0.5 + (i % 3) * 0.12, 0.7 + (i % 3) * 0.14, 14, 10)} mat={trunk} position={[0, 7, 0]} ink={false} />
        </group>
      ))}
      {dark ? (
        <>
          <Drift count={30} center={[0, 0.7, -1]} box={[16, 1.2, 9]} rise={0.001} size={2.8} color="#8fb6c8" opacity={0.08} seed="forest-mist" />
          <Drift count={26} center={[0, 2.5, 0]} box={[10, 5, 6]} rise={-0.09} size={0.06} color="#cfeaff" opacity={0.7} seed="forest-drips" />
        </>
      ) : (
        <>
          {[-2.6, 0.4, 3.1].map((x, i) => (
            <Shaft key={x} position={[x, 10, -1.2 - (i % 2)]} length={11} width={2.2 + (i % 2)} color="#fff3c0" opacity={0.17} tilt={0.25} />
          ))}
          <Drift count={50} center={[0, 2.2, 0]} box={[12, 5, 8]} rise={0.004} size={0.06} color="#fff6c8" opacity={0.6} seed="forest-pollen" />
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// The sunny courtyard
// ---------------------------------------------------------------------------
/**
 * Dry flagstones under an open sky, outside the dungeon. `sun` (0..1) carries
 * the sun from mid-morning to noon: it climbs, whitens and the shadows shorten.
 */
export const CourtyardSet: React.FC<{ sun?: number }> = ({ sun = 0 }) => {
  const frame = useCurrentFrame();
  const sunX = -6 + 5 * sun;
  const sunY = 6 + 6 * sun;
  return (
    <>
      <Atmosphere color="#bfe0f2" near={16} far={60} />
      <Backdrop stops={["#3f8fe0", "#7fbdf0", "#cfe9f7", "#f6e7b8"]} z={-26} y={9} height={44} width={120} />
      <GlowSprite position={[sunX * 1.5, 9 + sunY * 0.9, -24]} color="#fff3c0" size={11 + 3 * sun} opacity={0.9} />
      <ThreePoint
        key_={{ position: [sunX, sunY, 4], color: "#fff4d6", intensity: 3.0 + 0.8 * sun }}
        rim={{ position: [5, 5, -6], color: "#9fd0ff", intensity: 1.4 }}
        fill={{ color: "#cfe6ff", ground: "#8a7a52", intensity: 1.0 }}
        area={7}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 60]} />
        <meshStandardMaterial color="#8fae4e" roughness={1} />
      </mesh>
      {/* A worn stone terrace: pale slabs so the wet stain reads. */}
      <Part geo={G.cyl(3.4, 3.5, 0.08, 40)} mat={vinyl("#d9cfb4", "cloth")} position={[0, -0.03, 0]} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, (i / 6) * Math.PI]}>
          <planeGeometry args={[6.7, 0.035]} />
          <meshStandardMaterial color="#a89c7c" roughness={1} />
        </mesh>
      ))}
      {[1.2, 2.3].map((r) => (
        <mesh key={r} position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.035, 48]} />
          <meshStandardMaterial color="#a89c7c" roughness={1} />
        </mesh>
      ))}
      {/* The dungeon door it came out of, far behind, and the hills. */}
      <group position={[4.6, 0, -6.5]} rotation={[0, -0.4, 0]}>
        <Part geo={G.box(4.2, 4.2, 1.2, 0.2)} mat={vinyl("#7d8493", "cloth")} position={[0, 2.1, 0]} />
        <mesh position={[0, 1.3, 0.62]}>
          <planeGeometry args={[1.7, 2.6]} />
          <meshStandardMaterial color="#12141c" roughness={1} />
        </mesh>
        <mesh position={[0, 2.6, 0.62]} geometry={G.disc(0.85, 0, Math.PI)} material={flat("#12141c")} />
      </group>
      {[-16, -6, 5, 15].map((x, i) => (
        <Part key={x} geo={G.sphere(6)} mat={vinyl(i % 2 ? "#6f9a4a" : "#7fa955", "cloth")} position={[x, -2.6, -19 - (i % 2) * 3]} scale={[1.7, 0.8, 1]} ink={false} />
      ))}
      {Array.from({ length: 26 }, (_, i) => {
        const a = random(`tuft-a-${i}`) * Math.PI * 2;
        const d = 3.8 + random(`tuft-d-${i}`) * 4.5;
        return (
          <group key={i} position={[Math.cos(a) * d, 0, Math.sin(a) * d * 0.7 - 0.6]} rotation={[0, 0, 0.06 * Math.sin(frame * 0.05 + i)]}>
            {[-0.25, 0, 0.25].map((l) => (
              <Part key={l} geo={G.cone(0.05, 0.34, 5)} mat={vinyl("#5f9a35", "leather")} position={[l * 0.3, 0.17, 0]} rotation={[0, 0, -l]} ink={INK_THIN} />
            ))}
          </group>
        );
      })}
      <Rock position={[-3.9, 0, -2.4]} size={1.1} color="#9a947f" seed="cy1" />
      <Rock position={[-4.6, 0, 1.2]} size={0.5} color="#a8a28c" seed="cy2" />
    </>
  );
};

// ---------------------------------------------------------------------------
// Under the microscope
// ---------------------------------------------------------------------------
export const FIELD_R = 2.6;
/** The bright round field of a microscope, seen from straight above; everything lies on y = 0. */
export const MicroSet: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Atmosphere color="#04080c" near={30} far={60} />
      <hemisphereLight args={["#ffffff", "#9fd0c8", 1.5]} />
      <directionalLight position={[2, 8, 3]} color="#ffffff" intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[FIELD_R + 0.3, 64]} />
        <meshStandardMaterial color="#a8ded2" roughness={1} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[FIELD_R * 0.7, 64]} />
        <meshStandardMaterial color="#c2ece2" roughness={1} />
      </mesh>
      {/* Specks and bacteria drifting through the drop of water. */}
      {Array.from({ length: 34 }, (_, i) => {
        const a = random(`micro-a-${i}`) * Math.PI * 2 + frame * 0.002 * (i % 2 ? 1 : -1);
        const d = random(`micro-d-${i}`) * FIELD_R * 0.95;
        const rod = i % 3 === 0;
        return (
          <mesh key={i} position={[Math.cos(a) * d + 0.05 * Math.sin(frame * 0.05 + i), 0.02, Math.sin(a) * d + 0.05 * Math.cos(frame * 0.04 + i)]} rotation={[-Math.PI / 2, 0, i * 1.3 + frame * 0.01]} scale={rod ? [0.09, 0.03, 1] : [0.035, 0.035, 1]}>
            <circleGeometry args={[1, 12]} />
            <meshStandardMaterial color={rod ? "#6fb8a8" : "#7fc4b6"} roughness={1} />
          </mesh>
        );
      })}
      {/* The black tube of the eyepiece around the field. */}
      <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[FIELD_R, 40, 96]} />
        <meshBasicMaterial color="#04080c" toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.69, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[FIELD_R - 0.05, FIELD_R + 0.02, 96]} />
        <meshBasicMaterial color="#3fe6d4" toneMapped={false} fog={false} />
      </mesh>
    </>
  );
};
