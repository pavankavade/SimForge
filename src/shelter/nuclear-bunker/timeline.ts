import cues from "./data/narrationCues.json";
import { createCues } from "../../kit/cues";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);

// The picture is a Blender render (scripts/blender_nuclear_bunker.py) keyed from
// the same cue file, so every beat below lines up with the footage. Blender
// renders frames 0..durationFrames + 4; later frames hold on the last one.
export const FOOTAGE_LAST = cues.durationFrames + 4;

export const BEATS = {
  // L1: a hole in the yard caves in on Dad
  climb: w("l1a", "climb"),
  bombDrops: w("l1a", "drops"),
  cavesIn: w("l1b", "caves"),

  // L2: steel pipe, then the explosion and fallout
  pipe: w("l2a", "steel"),
  bury: w("l2a", "bury"),
  explosion: w("l2b", "explosion"),
  rains: w("l2b", "rains"),
  radioactive: w("l2b", "radioactive"),

  // L3: half-value layers, then rays down the doorway
  layers: w("l3a", "every"),
  halfRays: w("l3a", "half", 1) - 26,
  stops: w("l3a", "stops"),
  doorwayRays: lineStart("l3b") + 8,
  doorway: w("l3b", "doorway"),

  // L4: bend the tunnel; ten people make the air stale
  bend: w("l4a", "bend"),
  again: w("l4a", "again"),
  ten: w("l4b", "ten"),
  stale: w("l4b", "stale"),

  // L5: air pipe and fan; the shockwave comes down it
  airPipe: w("l5a", "pipe"),
  fan: w("l5a", "fan"),
  shockwave: w("l5b", "shockwave"),

  // L6: blast valve, blast door
  valveSlams: w("l6a", "slams"),
  truck: w("l6b", "truck"),
  outward: w("l6b", "outward"),

  // L7: rubble traps them; a second tunnel to a hatch
  rubble: w("l7a", "rubble"),
  dig: w("l7b", "dig"),
  hatchOpen: lineEnd("l7b") - 10,

  // L8: Geiger counter
  hang: w("l8b", "hang"),
  clicks: w("l8b", "clicks"),

  // L9-L10: decay, supplies, furniture
  decay: w("l9a", "ten"),
  supplies: w("l9b", "supplies"),
  beds: w("l10a", "beds"),
  radio: w("l10a", "radio"),

  congrats: w("end", "congratulations"),
} as const;
