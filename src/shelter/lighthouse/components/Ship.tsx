import type React from "react";
import { G, INK_THIN, Part, vinyl } from "../../../artifacts/characters/hero";
import { GlowSprite } from "../../../artifacts/dungeon/Fx";
import type { Vec3 } from "../../../engine/types";
import { SEA_Y, SHIP_DECK, SHIP_LEN, type ShipState } from "../timeline";

/** World position of a point given in ship-local coordinates (x along the hull, bow at -x). */
export const shipPoint = (s: ShipState, local: Vec3): Vec3 => {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + local[0] * c + local[2] * n, SEA_Y + s.bob + local[1], s.z - local[0] * n + local[2] * c];
};

/** A small coastal schooner in the ink & vinyl style; the captain is a separate actor. */
export const Ship: React.FC<{ state: ShipState; hull?: string; sail?: string; lantern?: boolean }> = ({ state, hull = "#7a4a2a", sail = "#f3ead6", lantern = true }) => {
  const wood = vinyl(hull, "wood");
  const trim = vinyl("#e9e2d0", "cloth");
  const L = SHIP_LEN - 0.8;
  return (
    <group position={[state.x, SEA_Y + state.bob, state.z]} rotation={[0, state.yaw, 0]}>
      <group rotation={[state.roll, 0, state.pitch]}>
        {/* Hull with a pointed bow and a white stripe */}
        <Part geo={G.box(L, 0.72, 1.15, 0.22)} mat={wood} position={[0.25, 0.18, 0]} />
        <Part geo={G.box(0.82, 0.72, 0.82, 0.18)} mat={wood} position={[-L / 2 + 0.22, 0.18, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.25, 1, 0.78]} />
        <Part geo={G.box(L + 0.05, 0.1, 1.17, 0.04)} mat={trim} position={[0.25, 0.38, 0]} ink={INK_THIN} />
        <Part geo={G.box(L - 0.1, 0.06, 1.0, 0.03)} mat={vinyl("#c99a62", "wood")} position={[0.25, SHIP_DECK - 0.03, 0]} ink={INK_THIN} />
        {/* Wheelhouse at the stern */}
        <Part geo={G.box(0.7, 0.6, 0.78)} mat={vinyl("#f4efe6", "cloth")} position={[1.0, SHIP_DECK + 0.3, 0]} />
        <Part geo={G.box(0.84, 0.1, 0.92, 0.04)} mat={vinyl("#c8322b", "gloss")} position={[1.0, SHIP_DECK + 0.65, 0]} ink={INK_THIN} />
        <Part geo={G.box(0.05, 0.22, 0.3, 0.02)} mat={vinyl("#ffd27a", "gloss")} position={[0.64, SHIP_DECK + 0.36, 0]} ink={false} />
        {/* Mast, boom and sail */}
        <Part geo={G.cyl(0.05, 0.06, 2.5)} mat={vinyl("#5a3820", "wood")} position={[-0.35, SHIP_DECK + 1.25, 0]} ink={INK_THIN} />
        <Part geo={G.cyl(0.035, 0.035, 1.2)} mat={vinyl("#5a3820", "wood")} position={[0.25, SHIP_DECK + 0.55, 0]} rotation={[0, 0, Math.PI / 2]} ink={INK_THIN} />
        <Part geo={G.box(1.1, 1.75, 0.04, 0.02)} mat={vinyl(sail, "cloth")} position={[0.22, SHIP_DECK + 1.5, 0.02]} rotation={[0, 0, -0.08]} ink={INK_THIN} />
        <Part geo={G.box(0.3, 0.16, 0.02, 0.01)} mat={vinyl("#c8322b", "cloth")} position={[-0.2, SHIP_DECK + 2.5, 0]} ink={false} />
        {lantern ? (
          <>
            <Part geo={G.sphere(0.07)} mat={vinyl("#ffe08a", "gloss")} position={[-L / 2 - 0.1, SHIP_DECK + 0.25, 0]} ink={false} />
            <GlowSprite position={[-L / 2 - 0.1, SHIP_DECK + 0.25, 0.1]} size={0.9} color="#ffd38a" opacity={0.6} />
          </>
        ) : null}
      </group>
    </group>
  );
};
