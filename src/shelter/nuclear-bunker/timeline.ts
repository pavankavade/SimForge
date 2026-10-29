import cues from "./data/narrationCues.json";
import { createCues } from "../../kit/cues";
import { clamp01, easeInOut, lerp, progress } from "../../kit/motion";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);
export { clamp01, easeInOut, lerp, progress };

// ---------------------------------------------------------------------------
// Geometry. The yard is a cutaway: the soil face is the plane z = 0, the lawn
// is y = 0, the camera looks at the face from +z (front-on, like the original).
// ---------------------------------------------------------------------------

export const GROUND_Y = 0;
export const FACE_Z = 0;

/** The pit Dad digs, later the slot the steel pipe is buried in. */
export const PIT_X0 = -2.75;
export const PIT_X1 = 2.75;
export const PIT_FLOOR = -6.0;
export const PIT_BACK_Z = -5.2;

/** The steel pipe: axis along z, open end flush with the cut face. */
export const TUBE_X = 0;
export const TUBE_R = 2.3;
export const TUBE_Y = PIT_FLOOR + TUBE_R + 0.05;
export const TUBE_TOP = TUBE_Y + TUBE_R;
export const TUBE_FRONT_Z = 0.12;
export const TUBE_BACK_Z = -4.9;
/** Plank deck inside the pipe; people stand on it. */
export const DECK_Y = TUBE_Y - 1.3;
export const DECK_HALF = Math.sqrt(TUBE_R ** 2 - 1.3 ** 2);
/** Height of the pipe's inner wall above the deck at x (for things hung on it). */
export const tubeWallY = (x: number) => TUBE_Y + Math.sqrt(Math.max(0, TUBE_R ** 2 - (x - TUBE_X) ** 2));

/** Entrance: first a straight shaft, then a dog-leg (two bends) from the shed. */
export const SHAFT_X = -1.15;
export const SHAFT_R = 0.46;
export const SHED_X = -4.7;
export const DOGLEG_Y = -0.85;
/** Air pipe with the dust filter, fan and blast valve. */
export const AIR_X = 1.35;
export const AIR_R = 0.2;
export const VALVE_Y = TUBE_TOP + 0.45;
/** Second exit: tunnel out of the right of the pipe, then a ladder shaft to a hatch. */
export const EXIT_Y = DECK_Y + 0.55;
export const HATCH_X = 5.4;
/** The layers explainer sits in the dirt above the pipe. */
export const LAYER_X0 = -0.45;
export const LAYER_X1 = 2.75;
export const LAYER_COUNT = 6;
export const layerY = (k: number) => GROUND_Y - ((k + 1) * (GROUND_Y - TUBE_TOP)) / (LAYER_COUNT + 1);

/** The house and garden behind the yard (+x to the right, -z away from camera). */
export const HOUSE_X = -6.2;
export const HOUSE_Z = -13;

// ---------------------------------------------------------------------------
// Beats, all from the voice.
// ---------------------------------------------------------------------------

export const BEATS = {
  // L1: dig a hole, climb in when the bomb drops; the walls cave in on Dad
  dig: w("l1a", "dig"),
  hole: w("l1a", "hole"),
  climb: w("l1a", "climb"),
  bombDrops: w("l1a", "drops"),
  bunker: w("l1b", "bunker"),
  blastWave: w("l1b", "blast"),
  cavesIn: w("l1b", "caves"),
  onTop: w("l1b", "top"),

  // L2: steel pipe dropped in and buried; the explosion; fallout
  redig: lineStart("l2a") - 8,
  pipe: w("l2a", "steel"),
  bury: w("l2a", "bury"),
  explosion: w("l2b", "explosion"),
  sky: w("l2b", "sky"),
  rains: w("l2b", "rains"),
  radioactive: w("l2b", "radioactive"),
  fallout: w("l2b", "fallout"),

  // L3: half-value layers, then rays straight down the doorway
  layers: w("l3a", "every"),
  halfRays: w("l3a", "half", 1) - 26,
  stops: w("l3a", "stops"),
  doorwayRays: lineStart("l3b") + 8,
  straight: w("l3b", "straight"),
  doorway: w("l3b", "doorway"),

  // L4: bend the tunnel twice; ten people make the air stale
  bend: w("l4a", "bend"),
  again: w("l4a", "again"),
  raysHitDirt: w("l4a", "rays"),
  ten: w("l4b", "ten"),
  stale: w("l4b", "stale"),

  // L5: air pipe, dust filter, hand-cranked fan; the shockwave comes down it
  airPipe: w("l5a", "pipe"),
  filter: w("l5a", "filter"),
  fan: w("l5a", "fan"),
  shockwave: w("l5b", "shockwave"),
  shootsDown: w("l5b", "down"),

  // L6: blast valve, blast door
  valve: w("l6a", "valve"),
  valveSlams: w("l6a", "slams"),
  thousandths: w("l6a", "thousandths"),
  truck: w("l6b", "truck"),
  door: w("l6b", "door"),
  outward: w("l6b", "outward"),
  tighter: w("l6b", "tighter"),
  blastDoor: w("l6b", "door", 1),

  // L7: rubble traps them; second tunnel to a hatch
  rubble: w("l7a", "rubble"),
  trapped: w("l7a", "trapped"),
  dig2: w("l7b", "dig"),
  tunnel2: w("l7b", "tunnel"),
  hatch: w("l7b", "hatch"),
  hatchOpen: lineEnd("l7b") - 10,

  // L8: you can't see radiation; Geiger counter
  cantSee: w("l8a", "see"),
  safe: w("l8a", "safe"),
  years: w("l8c", "years"),
  hang: w("l8b", "hang"),
  clicks: w("l8b", "clicks"),
  geiger: w("l8b", "geiger"),

  // L9-L10: decay overnight, supplies, furniture
  decay: w("l9a", "ten"),
  sevenHours: w("l9a", "seven"),
  twoDays: w("l9a", "days"),
  supplies: w("l9b", "supplies"),
  beds: w("l10a", "beds"),
  food: w("l10a", "food"),
  radio: w("l10a", "radio"),
  game: w("l10a", "game"),

  congrats: w("end", "congratulations"),
} as const;

// ---------------------------------------------------------------------------
// Kinematics and state, pure functions of the frame.
// ---------------------------------------------------------------------------

/** How deep the pit is dug (0 = untouched lawn, 1 = down to PIT_FLOOR). */
export const DIG = [BEATS.dig, BEATS.climb - 8] as const;
export const digDepth = (f: number) => easeInOut(progress(f, DIG));

/** Dad hops into the finished pit on "climb". */
export const DAD_EDGE_X = PIT_X1 + 0.9;
export const DAD_PIT_X = 0.9;
export const DAD_HOP = [BEATS.climb, BEATS.climb + 14] as const;

/** The pit walls slump in on "caves" and bury Dad to the neck. */
export const CAVE_IN = [BEATS.cavesIn - 2, BEATS.cavesIn + 22] as const;
export const BURY_LEVEL = PIT_FLOOR + 1.15;
/** Dirt level inside the pit, as a y (PIT_FLOOR = empty). */
export const pitFillY = (f: number) => {
  if (f < BEATS.redig) return lerp(PIT_FLOOR, BURY_LEVEL, easeInOut(progress(f, CAVE_IN)));
  if (f < BEATS.bury) return lerp(BURY_LEVEL, PIT_FLOOR, easeInOut(progress(f, [BEATS.redig, BEATS.redig + 8])));
  return lerp(PIT_FLOOR, GROUND_Y, easeInOut(progress(f, BURY_FILL)));
};

/** The pipe falls out of the sky and lands in the pit on "steel". */
export const PIPE_DROP = [BEATS.pipe - 14, BEATS.pipe + 4] as const;
export const PIPE_START_Y = 14;
export const pipeY = (f: number) => {
  const t = progress(f, PIPE_DROP);
  return lerp(PIPE_START_Y, TUBE_Y, t * t);
};

/** Dad jumps into the pipe's open end before it is buried. */
export const DAD_INTO_PIPE = [BEATS.pipe + 16, BEATS.pipe + 32] as const;
/** Dirt fills the pit over the pipe on "bury ... three feet of dirt". */
export const BURY_FILL = [BEATS.bury, BEATS.bury + 34] as const;

/** Explosion: the cloud grows on "explosion" and drifts apart after the fallout line. */
export const CLOUD_GROW = [BEATS.explosion - 2, BEATS.explosion + 50] as const;
export const CLOUD_FADE = [lineEnd("l2b") + 4, lineEnd("l2b") + 30] as const;
export const FLASH = [BEATS.bombDrops - 6, BEATS.bombDrops + 54] as const;

/** Fallout lands on the lawn and glows until it decays overnight. */
export const FALLOUT_LAND = [BEATS.rains - 10, BEATS.radioactive + 30] as const;
export const FALLOUT_DECAY = [BEATS.sevenHours, BEATS.twoDays + 10] as const;

/** Entrance shaft: straight on burial, swapped for the dog-leg on "bend". */
export const SHAFT_ON = BEATS.bury + 30;
export const DOGLEG_SEG = [BEATS.bend - 2, BEATS.again - 2, BEATS.again + 10] as const;

/** Ten people climb down the ladder one after another. */
export const CROWD_IN = BEATS.ten - 4;
export const CROWD_STEP = 7;
/** Stale air fills the pipe, and the fan clears it. */
export const HAZE = [BEATS.stale - 6, BEATS.stale + 30] as const;
export const HAZE_CLEAR = [BEATS.fan + 6, BEATS.fan + 60] as const;

/** Air pipe grows up to the surface; the shockwave ball runs down it. */
export const AIR_GROW = [BEATS.airPipe - 4, BEATS.airPipe + 14] as const;
export const SHOCK_RUN = [BEATS.shockwave - 4, BEATS.shootsDown + 8] as const;
/** The valve flap: open, slams shut on "slams", reopens after the blast. */
export const VALVE_SHUT = BEATS.valveSlams;
export const VALVE_OPEN_AGAIN = lineEnd("l6a") - 8;

/** Shed, blast door, truck gag, rubble. */
export const SHED_ON = BEATS.bend + 4;
export const TRUCK_HIT = BEATS.truck + 4;
export const DOOR_OUT = [BEATS.outward - 4, BEATS.outward + 10] as const;
export const RUBBLE_FALL = [BEATS.rubble - 4, BEATS.rubble + 22] as const;

/** Second tunnel and hatch shaft grow, then the hatch opens. */
export const EXIT_GROW = [BEATS.dig2 - 2, BEATS.hatch + 6] as const;

/** Shed over the dog-leg entrance; its blast door is on the right (lawn) side. */
export const SHED_X0 = SHED_X - 1.05;
export const SHED_X1 = SHED_X + 1.05;
export const SHED_Z0 = -1.9;
export const SHED_H = 2.3;
export const DOOR_Z = [-1.5, -0.4] as const;
export const DOOR_H = 1.85;
/** Door angle (0 = shut, + = swung out toward the lawn). */
export const doorAngle = (f: number) => {
  if (f < DOOR_OUT[0]) return 0;
  const open = easeInOut(progress(f, DOOR_OUT));
  // The blast slams it back into its frame on "tighter".
  const shut = easeInOut(progress(f, [BEATS.tighter - 6, BEATS.tighter + 2]));
  return 1.25 * open * (1 - shut);
};
export const TRUCK_Z = (DOOR_Z[0] + DOOR_Z[1]) / 2;
export const TRUCK_LEN = 3.4;
export const truckX = (f: number) => {
  const hitX = SHED_X1 + 0.06 + TRUCK_LEN / 2;
  if (f < TRUCK_HIT) return hitX + 12 * (1 - progress(f, [TRUCK_HIT - 16, TRUCK_HIT])) ** 2 * 1;
  return hitX + 0.5 * Math.sin(Math.PI * clamp01((f - TRUCK_HIT) / 12)) + 9 * easeInOut(progress(f, [TRUCK_HIT + 16, TRUCK_HIT + 40]));
};

/** Second exit: tunnel from the pipe's right wall to the hatch shaft. */
export const EXIT_X0 = TUBE_X + Math.sqrt(TUBE_R ** 2 - (EXIT_Y - TUBE_Y) ** 2) - 0.25;
export const exitGrow = (f: number) => ({
  tunnel: easeInOut(progress(f, [EXIT_GROW[0], EXIT_GROW[0] + (EXIT_GROW[1] - EXIT_GROW[0]) * 0.55])),
  shaft: easeInOut(progress(f, [EXIT_GROW[0] + (EXIT_GROW[1] - EXIT_GROW[0]) * 0.55, EXIT_GROW[1]])),
});
export const hatchAngle = (f: number) => 1.9 * easeInOut(progress(f, [BEATS.hatchOpen, BEATS.hatchOpen + 10]));

// ---------------------------------------------------------------------------
// The cut face's openings at a frame: everything dug into the soil face.
// ---------------------------------------------------------------------------

export interface Opening {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const faceOpenings = (f: number): { rects: Opening[]; tube: boolean } => {
  const rects: Opening[] = [];
  const dig = digDepth(f);
  if (dig > 0.001) {
    const floor = Math.max(lerp(0, PIT_FLOOR, dig), pitFillY(f));
    if (floor < -0.01) rects.push({ x0: PIT_X0, x1: PIT_X1, y0: floor, y1: 0 });
  }
  const r = SHAFT_R;
  if (f >= SHAFT_ON && f < DOGLEG_SEG[0]) {
    const grow = progress(f, [SHAFT_ON, SHAFT_ON + 10]);
    const y0 = tubeWallY(SHAFT_X) - 0.1;
    rects.push({ x0: SHAFT_X - r, x1: SHAFT_X + r, y0, y1: lerp(y0, 0, grow) });
  }
  if (f >= DOGLEG_SEG[0]) {
    const a = progress(f, [DOGLEG_SEG[0], DOGLEG_SEG[0] + 10]);
    const b = progress(f, [DOGLEG_SEG[0] + 4, DOGLEG_SEG[1]]);
    const c = progress(f, [DOGLEG_SEG[1], DOGLEG_SEG[2]]);
    if (a > 0) rects.push({ x0: SHED_X - r, x1: SHED_X + r, y0: lerp(0, DOGLEG_Y - r, a), y1: 0 });
    if (b > 0) rects.push({ x0: SHED_X, x1: lerp(SHED_X, SHAFT_X + r, b), y0: DOGLEG_Y - r, y1: DOGLEG_Y + r });
    if (c > 0) {
      const y0 = tubeWallY(SHAFT_X) - 0.1;
      rects.push({ x0: SHAFT_X - r, x1: SHAFT_X + r, y0, y1: lerp(y0, DOGLEG_Y + r, c) });
    }
  }
  const ex = exitGrow(f);
  if (ex.tunnel > 0) rects.push({ x0: EXIT_X0, x1: lerp(EXIT_X0, HATCH_X + r, ex.tunnel), y0: EXIT_Y - r, y1: EXIT_Y + r });
  if (ex.shaft > 0) rects.push({ x0: HATCH_X - r, x1: HATCH_X + r, y0: EXIT_Y - r, y1: lerp(EXIT_Y - r, 0, ex.shaft) });
  return { rects, tube: f >= PIPE_DROP[1] };
};

/** Night falls for the decay beat and lifts after "two days". */
export const NIGHT = [BEATS.sevenHours - 12, BEATS.sevenHours + 8, BEATS.twoDays, BEATS.twoDays + 16] as const;
export const nightAmount = (f: number) =>
  f < NIGHT[2] ? easeInOut(progress(f, [NIGHT[0], NIGHT[1]])) : 1 - easeInOut(progress(f, [NIGHT[2], NIGHT[3]]));
