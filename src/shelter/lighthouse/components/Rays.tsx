import type React from "react";
import { GROUND_HI, LAMP_Y, RAYS_BOUNCE, RAYS_OFF, RAYS_ON, SKY_HI, TOWER_X, TOWER_Z, easeInOut, easeOutCubic, lerp, progress } from "../timeline";

const N = 24;
const LEN = 6.5;

/**
 * Explainer rays from the bare flame. They shine every way at first; the sky
 * rays and then the ground rays flare on their words; on "bounce" every ray
 * swings round to run parallel, out to sea (+x); they fade as the beam forms.
 */
export const Rays: React.FC<{ frame: number }> = ({ frame }) => {
  const on = easeOutCubic(progress(frame, RAYS_ON));
  const off = progress(frame, RAYS_OFF);
  if (on <= 0.001 || off >= 1) return null;
  const sky = Math.sin(Math.PI * progress(frame, SKY_HI));
  const ground = Math.sin(Math.PI * progress(frame, GROUND_HI));
  const bounce = easeInOut(progress(frame, RAYS_BOUNCE));
  return (
    <group position={[TOWER_X, LAMP_Y, TOWER_Z + 0.2]}>
      {Array.from({ length: N }, (_, i) => {
        let a = ((i + 0.5) / N) * Math.PI * 2;
        if (a > Math.PI) a -= Math.PI * 2;
        const up = Math.sin(a) > 0.3;
        const down = Math.sin(a) < -0.3;
        const hi = up ? sky : down ? ground : 0;
        const dim = up ? ground : down ? sky : Math.max(sky, ground);
        const angle = lerp(a, 0, bounce);
        const y0 = lerp(0, Math.sin(a) * 0.42, bounce);
        const len = LEN * on * lerp(1, 1.6, bounce);
        const opacity = (0.75 + 0.25 * hi - 0.45 * dim) * (1 - off);
        const thick = 0.045 + 0.05 * hi;
        return (
          <group key={i} position={[0, y0, 0]} rotation={[0, 0, angle]}>
            <mesh position={[0.35 + len / 2, 0, 0]} renderOrder={8}>
              <boxGeometry args={[len, thick, thick]} />
              <meshBasicMaterial color={hi > 0.3 ? "#ffffff" : "#ffd65a"} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0.35 + len, 0, 0]} rotation={[0, 0, -Math.PI / 2]} renderOrder={8}>
              <coneGeometry args={[thick * 2.2, thick * 5, 8]} />
              <meshBasicMaterial color={hi > 0.3 ? "#ffffff" : "#ffd65a"} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
