import type React from "react";
import { easeOutBack, progress } from "../../../kit/motion";
import type { Vec3 } from "../../../engine/types";
import { BEATS } from "../timeline";

/** The counter clicks every 9 frames from "clicks" (matches the SFX). */
export const CLICK_EVERY = 9;
export const CLICKS = 12;
const tick = (f: number) => {
  const t = f - BEATS.clicks;
  if (t < 0 || t > CLICK_EVERY * CLICKS) return 0;
  const k = t % CLICK_EVERY;
  return k < 4 ? 1 - k / 4 : 0;
};

/**
 * A Geiger counter hung by the ladder: yellow case, dial, needle that kicks on
 * every click, with a tiny green spark where the particle hits.
 */
export const Geiger: React.FC<{ frame: number; position: Vec3; scale?: number }> = ({ frame, position, scale = 1 }) => {
  const pop = easeOutBack(progress(frame, [BEATS.hang + 2, BEATS.hang + 12]), 1.6);
  if (pop <= 0) return null;
  const kick = tick(frame);
  return (
    <group position={position} scale={pop * scale}>
      {/* Hook and strap */}
      <mesh position={[0, 0.22, -0.02]}>
        <boxGeometry args={[0.03, 0.18, 0.03]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[0.34, 0.26, 0.14]} />
        <meshStandardMaterial color="#f2c14e" roughness={0.5} />
      </mesh>
      {/* Dial window and needle */}
      <mesh position={[0, 0.03, 0.072]}>
        <boxGeometry args={[0.24, 0.13, 0.01]} />
        <meshStandardMaterial color="#fbf7ee" />
      </mesh>
      <group position={[0, -0.03, 0.08]} rotation={[0, 0, 0.7 - kick * 1.3]}>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.012, 0.12, 0.006]} />
          <meshBasicMaterial color="#d23a2e" />
        </mesh>
      </group>
      <mesh position={[0, -0.09, 0.074]}>
        <boxGeometry args={[0.2, 0.025, 0.01]} />
        <meshBasicMaterial color="#2b2f36" />
      </mesh>
      {kick > 0.5 ? (
        <mesh position={[0.2, 0.14, 0.08]} scale={0.05 * kick}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#d8ff4a" toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};
