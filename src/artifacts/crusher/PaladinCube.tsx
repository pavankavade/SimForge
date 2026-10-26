import type React from "react";
import { useCurrentFrame } from "remotion";
import type { Vec3 } from "../../engine/types";
import { arc, easeOutBack, lerp, progress } from "../../kit";
import { flat, G, Part, vinyl } from "../characters/hero";

export interface PaladinCubeProps {
  appearAt: number;
  popAt: number;
  /** Floor positions (y ignored). */
  from: Vec3;
  to: Vec3;
  size?: number;
}

/** What is left of the paladin: a neat armoured cube with a visor slit, dazed eyes and steam. */
export const PaladinCube: React.FC<PaladinCubeProps> = ({ appearAt, popAt, from, to, size = 0.6 }) => {
  const frame = useCurrentFrame();
  if (frame < appearAt) return null;
  const t = progress(frame, [popAt, popAt + 10]);
  const land = frame - popAt - 10;
  const squash = land >= 0 && land < 8 ? 1 - 0.18 * Math.sin((land / 8) * Math.PI) : 1;
  const grow = easeOutBack(progress(frame, [appearAt, appearAt + 6]));
  const x = lerp(from[0], to[0], t);
  const z = lerp(from[2], to[2], t);
  const y = arc(t, 0.5);
  const s = size;
  const steam = progress(frame, [appearAt, appearAt + 70]);
  return (
    <group position={[x, y, z]} scale={[grow * (2 - squash), grow * squash, grow * (2 - squash)]}>
      <group position={[0, s / 2, 0]} rotation={[0, -0.25, 0]}>
        <Part geo={G.box(s, s, s, 0.08)} mat={vinyl("#b8bfcc", "cloth")} />
        {/* Red tabard band */}
        <Part geo={G.box(s + 0.02, s * 0.32, s + 0.02, 0.04)} mat={vinyl("#c43a36", "cloth")} position={[0, -s * 0.18, 0]} ink={false} />
        {/* Gold trim on the top edges */}
        <Part geo={G.box(s + 0.03, 0.05, s + 0.03, 0.02)} mat={vinyl("#ffd04a", "gloss")} position={[0, s / 2 - 0.03, 0]} ink={false} />
        {/* Visor slit and dazed eyes */}
        <Part geo={G.box(s * 0.62, 0.07, 0.02, 0.01)} mat={flat("#1a1216")} position={[0, s * 0.16, s / 2 + 0.005]} ink={false} />
        {[-1, 1].map((sx) => (
          <group key={sx} position={[sx * s * 0.17, s * 0.16, s / 2 + 0.02]}>
            <Part geo={G.box(0.09, 0.02, 0.01, 0.004)} mat={flat("#ffffff")} rotation={[0, 0, 0.78]} ink={false} />
            <Part geo={G.box(0.09, 0.02, 0.01, 0.004)} mat={flat("#ffffff")} rotation={[0, 0, -0.78]} ink={false} />
          </group>
        ))}
        {/* Folded plume on top */}
        <Part geo={G.capsule(0.06, s * 0.7)} mat={vinyl("#c43a36", "cloth")} position={[0, s / 2 + 0.04, 0]} rotation={[0, 0, Math.PI / 2]} />
      </group>
      {steam < 1
        ? [0, 1, 2].map((k) => {
            const p = (steam * 3 + k / 3) % 1;
            return (
              <mesh key={k} position={[(k - 1) * 0.15, s + 0.1 + p * 0.8, 0]}>
                <sphereGeometry args={[0.07 + p * 0.1, 10, 8]} />
                <meshStandardMaterial color="#e8e8ea" transparent opacity={(1 - p) * 0.55 * (1 - steam)} roughness={1} />
              </mesh>
            );
          })
        : null}
    </group>
  );
};
