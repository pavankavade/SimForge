import type React from "react";
import { G, INK_THIN, Part, vinyl } from "../../../artifacts/characters/hero";
import type { Vec3 } from "../../../engine/types";

/** The family dog, in the same ink & vinyl style. Feet at y = 0, faces +z. */
export const Dog: React.FC<{ position: Vec3; yaw?: number; frame: number; scale?: number }> = ({ position, yaw = 0, frame, scale = 1 }) => {
  const fur = vinyl("#c58a4a", "cloth");
  const dark = vinyl("#6b4126", "cloth");
  const wag = Math.sin(frame * 0.6) * 0.5;
  const trot = Math.sin(frame * 0.5) * 0.04;
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale * 0.9}>
      <Part geo={G.capsule(0.16, 0.42)} mat={fur} position={[0, 0.4 + trot, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <group position={[0, 0.62 + trot, 0.3]}>
        <Part geo={G.sphere(0.17)} mat={fur} />
        <Part geo={G.sphere(0.09)} mat={fur} position={[0, -0.04, 0.15]} scale={[1, 0.8, 1.2]} ink={INK_THIN} />
        <mesh geometry={G.sphere(0.035)} material={vinyl("#1b1b1f", "gloss")} position={[0, -0.01, 0.26]} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh geometry={G.sphere(0.03)} material={vinyl("#1b1b1f", "gloss")} position={[s * 0.07, 0.05, 0.14]} />
            <Part geo={G.sphere(0.08)} mat={dark} position={[s * 0.14, 0.04, -0.03]} scale={[0.45, 1.3, 0.9]} rotation={[0, 0, s * 0.3]} ink={INK_THIN} />
          </group>
        ))}
      </group>
      <group position={[0, 0.5 + trot, -0.3]} rotation={[-0.8, wag, 0]}>
        <Part geo={G.cone(0.05, 0.26, 10)} mat={dark} position={[0, 0.12, 0]} ink={INK_THIN} />
      </group>
      {[-0.09, 0.09].map((x) =>
        [-0.17, 0.17].map((z) => <Part key={`${x}${z}`} geo={G.capsule(0.05, 0.3)} mat={fur} position={[x, 0.15, z]} ink={INK_THIN} />),
      )}
    </group>
  );
};
