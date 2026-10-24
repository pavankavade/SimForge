import { Burst } from "../artifacts/dungeon/Fx";
import type { Vec3 } from "../engine/types";

/**
 * Burst presets. Every contact on screen gets one (feet landing, bodies hitting
 * the floor, hazards hitting victims, props snapping into place), keyed to the
 * same BEATS value as its SFX cue. Each returns a keyed element, so they can be
 * dropped straight into a Scene's JSX. `seed` must be unique per burst.
 */

/** Grey stone dust: landings, impacts, things dropping onto the floor. */
export const dust = (at: number, position: Vec3, seed: string, scale = 1) => (
  <Burst
    key={seed}
    at={at}
    position={position}
    count={Math.round(34 * scale)}
    size={0.55 * scale}
    duration={40}
    speed={0.09 * scale}
    spread={[1.2 * scale, 0.2, 1.6]}
    color="#b8b0a6"
    seed={seed}
  />
);

/** Additive sparks: metal on metal, wires snapping, magic contacts. */
export const sparks = (at: number, position: Vec3, seed: string, color = "#ffd27a", count = 40) => (
  <Burst
    key={seed}
    at={at}
    position={position}
    count={count}
    size={0.15}
    duration={22}
    speed={0.2}
    gravity={-0.012}
    spread={[0.3, 0.3, 0.3]}
    color={color}
    additive
    opacity={1}
    seed={seed}
  />
);

/** Green goo splash: slime, ooze, acid (pass a colour for other liquids). */
export const slimeSplash = (at: number, position: Vec3, seed: string, scale = 1, color = "#8fef55") => (
  <Burst
    key={seed}
    at={at}
    position={position}
    count={Math.round(22 * scale)}
    size={0.22 * scale}
    duration={22}
    speed={0.09 * scale}
    direction={[0, 0.07, 0.02]}
    gravity={-0.012}
    spread={[0.5, 0.05, 0.6]}
    color={color}
    opacity={0.95}
    seed={seed}
  />
);

/** Soft translucent blobs: jelly, water, bubbles. */
export const jellySplash = (at: number, position: Vec3, seed: string, color = "#8ff5b0") => (
  <Burst
    key={seed}
    at={at}
    position={position}
    count={30}
    size={0.3}
    duration={26}
    speed={0.12}
    gravity={-0.008}
    spread={[0.4, 0.4, 0.4]}
    color={color}
    opacity={0.85}
    seed={seed}
  />
);

/** Hot puff: fire, explosions, steam (orange by default). */
export const flamePuff = (at: number, position: Vec3, seed: string, scale = 1, color = "#ff9a3d") => (
  <Burst
    key={seed}
    at={at}
    position={position}
    count={Math.round(30 * scale)}
    size={0.4 * scale}
    duration={28}
    speed={0.11 * scale}
    direction={[0, 0.06, 0]}
    gravity={0.004}
    spread={[0.5 * scale, 0.3, 0.5]}
    color={color}
    additive
    opacity={0.9}
    seed={seed}
  />
);

/** Twinkles for spells and buffs (cyan by default). */
export const magic = (at: number, position: Vec3, seed: string, color = "#7de9ff", count = 26) => (
  <Burst
    key={seed}
    at={at}
    position={position}
    count={count}
    size={0.18}
    duration={30}
    speed={0.06}
    direction={[0, 0.04, 0]}
    gravity={0.002}
    spread={[0.6, 0.8, 0.6]}
    color={color}
    additive
    opacity={1}
    seed={seed}
  />
);
