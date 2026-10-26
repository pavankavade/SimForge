import type React from "react";
import type { Vec3 } from "../../engine/types";
import { ActorView } from "../../kit";
import { GlowSprite } from "../dungeon/Fx";

export interface SpellOrbProps {
  position: Vec3;
  frame: number;
  r?: number;
  opacity?: number;
  scale?: number;
  /** Previous positions (newest first) for a fading trail. */
  trail?: Vec3[];
}

/** A teleport spell bubble with a tiny, horrified mage trapped inside. */
export const SpellOrb: React.FC<SpellOrbProps> = ({ position, frame, r = 0.45, opacity = 1, scale = 1, trail = [] }) => (
  <group>
    {trail.map((p, i) => (
      <mesh key={i} position={p}>
        <sphereGeometry args={[r * (0.8 - i * 0.12) * scale, 16, 12]} />
        <meshBasicMaterial color="#b07aff" transparent opacity={opacity * (0.28 - i * 0.06)} depthWrite={false} toneMapped={false} />
      </mesh>
    ))}
    <group position={position} scale={scale}>
      <ActorView
        classType="mage"
        frame={frame}
        actor={{ pose: "float", position: [0, -r * 0.62, 0], yaw: 0, expression: "shock", scale: 0.42 / 1.12 }}
      />
      <mesh>
        <sphereGeometry args={[r, 28, 20]} />
        <meshStandardMaterial color="#c7a2ff" emissive="#7a3aff" emissiveIntensity={0.5} transparent opacity={0.32 * opacity} roughness={0.1} depthWrite={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[r * 1.02, 0.018, 8, 40]} />
        <meshBasicMaterial color="#e9d8ff" transparent opacity={0.8 * opacity} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3].map((k) => {
        const a = frame * 0.35 + (k * Math.PI) / 2;
        return (
          <mesh key={k} position={[Math.cos(a) * r * 1.15, Math.sin(a * 1.3) * r * 0.6, Math.sin(a) * r * 1.15]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        );
      })}
      <GlowSprite color="#b07aff" size={r * 3.2} opacity={0.4 * opacity} />
    </group>
  </group>
);
