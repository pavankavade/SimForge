import cues from "./data/narrationCues.json";
import { createCues } from "../../kit/cues";
import { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress } from "../../kit/motion";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, easeOutBack, easeOutCubic, lerp, progress };

// ---------------------------------------------------------------------------
// Geometry. A dusk coastline seen front-on from the sea side: land (beach) to
// the left of SHORE_X, sea (y = 0) to the right and behind. The camera looks
// toward -z. Ships sail in from +x toward the rocks off the beach.
// ---------------------------------------------------------------------------

export const SEA_Y = 0;
export const LAND_Y = 0.32;
export const SHORE_X = 0.9;

/** The tower stands where the beach fire was lit. */
export const TOWER_X = -1.2;
export const TOWER_Z = -2;
export const TOWER_H = 6.4;
export const TOWER_R0 = 1.15;
export const TOWER_R1 = 0.88;
/** Gallery deck on top of the tower (where the fire, then the lamp, sits). */
export const DECK_Y = LAND_Y + TOWER_H;
export const GALLERY_R = 1.38;
/** Lantern room and the lamp at its centre. */
export const ROOM_R = 0.72;
export const ROOM_H = 1.5;
export const LAMP_Y = DECK_Y + 0.72;

/** Rocks off the beach, in the ships' lane. */
export const ROCK_X = 3.7;
export const ROCK_Z = -2.3;
export const ROCK_TOP = 0.95;

/** The keeper ("you") stands on the beach beside the fire, then rides the tower up. */
export const KEEPER_X = TOWER_X - 0.82;
export const KEEPER_Z = TOWER_Z + 0.72;
export const CANDLE_POS = [TOWER_X + 0.75, LAND_Y, TOWER_Z + 0.8] as const;

/** Ships: hull length and deck height; the bow points along -x when yaw = 0. */
export const SHIP_LEN = 3.2;
export const SHIP_DECK = 0.55;

/** Other lighthouses along the coast (they copy ours in level five). */
export const OTHERS = [
  { x: 12, z: -28, s: 1.3 },
  { x: -8, z: -36, s: 1.3 },
] as const;

// ---------------------------------------------------------------------------
// Beats, all from the voice.
// ---------------------------------------------------------------------------

export const BEATS = {
  // L1: a candle won't do, so a big fire on the beach; the ship never sees it
  candle: w("l1a", "candle"),
  wontDo: w("l1a", "won't"),
  light: w("l1a", "light"),
  fire: w("l1a", "fire"),
  farAway: w("l1b", "far"),
  shipSails: w("l1b", "sails"),
  crash: w("l1b", "rocks"),

  // L2: a tall stone tower lifts the fire; the wind blows it out
  tower: w("l2a", "tower"),
  top: w("l2a", "top"),
  miles: w("l2b", "miles"),
  wind: w("l2b", "wind"),
  out: w("l2b", "out"),

  // L3: the lantern room; the bare flame shines everywhere
  seal: w("l3a", "seal"),
  glass: w("l3a", "glass"),
  lanternRoom: w("l3a", "lantern"),
  shines: w("l3b", "shines"),
  sky: w("l3b", "sky"),
  ground: w("l3b", "ground"),

  // L4: mirrors bounce the light out to sea; the Fresnel lens makes one beam
  mirrors: w("l4a", "mirrors"),
  bounce: w("l4a", "bounce"),
  sea: w("l4a", "sea"),
  swap: w("l4b", "swap"),
  fresnel: w("l4b", "fresnel"),
  rings: w("l4b", "rings"),
  beam: w("l4b", "beam"),

  // L5: every lighthouse looks the same; the lens turns and flashes its pattern
  every: w("l5a", "every"),
  cantTell: w("l5a", "can't"),
  turn: w("l5b", "turn"),
  two: w("l5b", "two"),
  flash2: w("l5b", "flashes"),
  charts: w("l5c", "charts"),
  exactly: w("l5c", "exactly"),

  // L6: fog; the foghorn
  fog: w("l6a", "fog"),
  noLight: w("l6a", "no"),
  horn: w("l6b", "horn"),
  blasts: w("l6b", "blasts"),
  foghorn: w("l6b", "foghorn"),

  congrats: w("end", "congratulations"),
} as const;

// ---------------------------------------------------------------------------
// Kinematics and state, pure functions of the frame.
// ---------------------------------------------------------------------------

/** The beach fire: lit on "light", roaring by "fire"; blown out on "out". */
export const IGNITE = [BEATS.light + 4, BEATS.fire + 2] as const;
export const BLOW_OUT = [BEATS.out - 6, BEATS.out + 4] as const;
/** The lamp is relit inside the lantern room on "seal the flame". */
export const RELIGHT = [BEATS.seal - 2, BEATS.seal + 10] as const;
export const fireAmount = (f: number) => {
  if (f < BLOW_OUT[0]) return easeOutCubic(progress(f, IGNITE));
  if (f < RELIGHT[0]) return 1 - progress(f, BLOW_OUT);
  return 0;
};
export const lampAmount = (f: number) => easeOutCubic(progress(f, RELIGHT));

/** The tower pushes up out of the beach on "tower", lifting the fire and the keeper. */
export const RISE = [BEATS.tower - 4, BEATS.tower + 34] as const;
export const towerRise = (f: number) => easeOutBack(progress(f, RISE), 1.2);
/** Height of the tower's top (the gallery deck) above the sand. */
export const topY = (f: number) => LAND_Y + TOWER_H * towerRise(f);

/** Wind streaks during "the wind blows the flame right out". */
export const WIND = [BEATS.wind - 8, BEATS.out + 14] as const;

/** Lantern room: frame rises, glass sets in, roof drops on. */
export const ROOM_FRAME = [BEATS.seal + 16, BEATS.glass - 6] as const;
export const ROOM_GLASS = [BEATS.glass - 2, BEATS.glass + 10] as const;
export const ROOF_DROP = [BEATS.lanternRoom - 18, BEATS.lanternRoom - 4] as const;

/** Rays: radiate on "shines"; the sky and ground rays flare on their words. */
export const RAYS_ON = [BEATS.shines - 8, BEATS.shines + 16] as const;
export const SKY_HI = [BEATS.sky - 4, BEATS.sky + 22] as const;
export const GROUND_HI = [BEATS.ground - 4, BEATS.ground + 26] as const;
/** Mirrors slide in, then every ray turns out to sea on "bounce". */
export const MIRROR_IN = [BEATS.mirrors - 8, BEATS.mirrors + 8] as const;
export const RAYS_BOUNCE = [BEATS.bounce - 2, BEATS.sea - 4] as const;
export const MIRROR_OUT = [BEATS.swap - 2, BEATS.swap + 12] as const;
export const LENS_IN = [BEATS.fresnel - 10, BEATS.fresnel + 8] as const;
export const RAYS_OFF = [BEATS.rings + 30, BEATS.beam - 6] as const;
export const BEAM_GROW = [BEATS.beam - 10, BEATS.beam + 6] as const;

/** Other lighthouses rise along the coast on "every lighthouse" and light up, steady. */
export const OTHERS_RISE = [BEATS.every - 6, BEATS.every + 24] as const;
export const OTHERS_LIT = BEATS.every + 26;

/**
 * Our lens turns from "turn". Angle 0 points the beam along +x (out to sea);
 * pi/2 points it at the camera (+z). It spins up so the first panel faces the
 * camera exactly on "two", then turns at a steady rate; the second panel lags
 * so it flashes on "flashes".
 */
export const SPIN_START = BEATS.turn - 4;
const SPIN_S = BEATS.two - SPIN_START;
export const SPIN_RATE = Math.PI / SPIN_S;
export const PANEL_LAG = SPIN_RATE * (BEATS.flash2 - BEATS.two);
export const lensAngle = (f: number) => {
  if (f < SPIN_START) return 0;
  const s = f - SPIN_START;
  if (s < SPIN_S) return (SPIN_RATE / (2 * SPIN_S)) * s * s;
  return Math.PI / 2 + SPIN_RATE * (s - SPIN_S);
};
/** The two lens panels (the "two quick flashes"); the second only after the spin starts. */
export const panelAngles = (f: number) => [lensAngle(f), lensAngle(f) - PANEL_LAG * clamp01((f - SPIN_START) / 20)];
/** 0..1 how squarely a panel at angle a faces the camera (+z). */
export const facing = (a: number) => Math.max(0, Math.cos(a - Math.PI / 2)) ** 24;

/** Fog rolls in on "fog", swallows the beam on "no light", lifts after the foghorn. */
export const FOG_IN = [BEATS.fog - 12, BEATS.noLight] as const;
export const FOG_OUT = [lineEnd("l6b") + 4, BEATS.congrats + 20] as const;
export const fogAmount = (f: number) => (f < FOG_OUT[0] ? easeInOut(progress(f, FOG_IN)) : 1 - easeInOut(progress(f, FOG_OUT)));
export const BEAM_CHOKE = [BEATS.noLight - 4, BEATS.noLight + 14] as const;
/** Beam length: grows on "beam", choked by the fog, back for the finale. */
export const beamLength = (f: number) => {
  const grow = easeOutCubic(progress(f, BEAM_GROW));
  const choke = f < FOG_OUT[0] ? easeInOut(progress(f, BEAM_CHOKE)) : 1 - easeInOut(progress(f, FOG_OUT));
  return lerp(0.1, 34, grow) * lerp(1, 0.12, choke);
};

/** The foghorn unfolds on "horn" and blasts on "blasts" and "foghorn". */
export const HORN_IN = [BEATS.horn - 6, BEATS.horn + 10] as const;
export const BLASTS = [BEATS.blasts, BEATS.foghorn] as const;

// ---------------------------------------------------------------------------
// Ships.
// ---------------------------------------------------------------------------

export interface ShipState {
  x: number;
  z: number;
  /** Heading: 0 sails toward -x. */
  yaw: number;
  roll: number;
  pitch: number;
  bob: number;
}

const bob = (f: number, seed: number) => 0.05 * Math.sin(f * 0.11 + seed);

/** Ship 1 sails onto the rocks on "rocks" and stays wrecked there. */
export const SHIP1_SPEED = 0.085;
export const SHIP1_Z = ROCK_Z + 0.1;
export const SHIP1_HIT_X = ROCK_X + SHIP_LEN / 2 + 0.25;
export const ship1 = (f: number): ShipState => {
  if (f < BEATS.crash) {
    return { x: SHIP1_HIT_X + SHIP1_SPEED * (BEATS.crash - f), z: SHIP1_Z, yaw: 0, roll: 0.03 * Math.sin(f * 0.09), pitch: 0, bob: bob(f, 0) };
  }
  // Rides up onto the rock: bow lifts, lists to one side, settles.
  const t = easeOutCubic(progress(f, [BEATS.crash, BEATS.crash + 10]));
  return { x: SHIP1_HIT_X - 0.35 * t, z: SHIP1_Z, yaw: 0.12 * t, roll: -0.22 * t, pitch: -0.2 * t, bob: 0.25 * t };
};
/** The captain is thrown over the bow onto the rock. */
export const CAPTAIN1_FLY = [BEATS.crash + 1, BEATS.crash + 16] as const;

/** Ship 2 drifts between the lighthouses in level five, then turns for home once it knows where it is. */
export const SHIP2_X = 9.5;
export const SHIP2_Z = -13;
export const SHIP2_TURN = [BEATS.exactly + 4, BEATS.exactly + 40] as const;
export const ship2 = (f: number): ShipState => {
  const turn = easeInOut(progress(f, SHIP2_TURN));
  const away = Math.max(0, f - SHIP2_TURN[1]) * 0.06;
  return { x: SHIP2_X + 0.012 * (BEATS.exactly - f) + away, z: SHIP2_Z - away * 0.4, yaw: lerp(0.35, Math.PI - 0.4, turn), roll: 0.03 * Math.sin(f * 0.1 + 1), pitch: 0, bob: bob(f, 2) };
};

/** Ship 3 creeps toward the rocks in the fog; the foghorn turns it away. */
export const SHIP3_Z = -6.5;
export const SHIP3_TURN = [BEATS.blasts + 14, BEATS.foghorn + 10] as const;
export const ship3 = (f: number): ShipState => {
  const turnX = 8.4;
  if (f < SHIP3_TURN[0]) return { x: turnX + 0.045 * (SHIP3_TURN[0] - f), z: SHIP3_Z, yaw: 0, roll: 0.03 * Math.sin(f * 0.1 + 3), pitch: 0, bob: bob(f, 4) };
  const t = easeInOut(progress(f, SHIP3_TURN));
  const away = Math.max(0, f - SHIP3_TURN[1]) * 0.05;
  return { x: turnX + 0.6 * t + away, z: SHIP3_Z - 1.4 * t - away * 0.5, yaw: lerp(0, Math.PI - 0.5, t), roll: 0.03 * Math.sin(f * 0.1 + 3), pitch: 0, bob: bob(f, 4) };
};
export const SHIP3_ON = lineStart("l6a") - 20;
