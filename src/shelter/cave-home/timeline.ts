import cues from "./data/narrationCues.json";
import { createCues } from "../../kit/cues";
import { progress, easeInOut, easeOutBack, easeOutCubic } from "../../kit/motion";

export const { w, wEnd, lineStart, lineEnd, DURATION } = createCues(cues);

// World geometry coordinates (centered around action plane Z = 0)
export const CAVE_ENTRANCE_X = -0.8;
export const CAVE_BACK_X = 6.8;
export const CAVE_HEIGHT = 3.6;
export const CAVE_DEPTH = 4.2; // Z from -2.1 to 2.1
export const FLOOR_Y = 0;
export const Z = 0;

// Prop locations
export const FIRE_MID_X = 2.6;
export const FIRE_FRONT_X = 0.5;
export const BED_X = 5.2;
export const BED_Z = -1.0;
export const DRIP_X = 3.9;
export const DRIP_Z = -0.25;
export const WALL_X = CAVE_ENTRANCE_X;
export const DOOR_WIDTH = 1.15;
export const DOOR_HEIGHT = 2.1;

export const BEATS = {
  // L1: Rain exterior -> cold interior
  rainIntro: w("l1a", "cave"),
  coldIntro: w("l1b", "pitch"),

  // L2: Fire in middle -> smoke trapped
  fireBuild: w("l2a", "fire"),
  smokeTrap1: w("l2b", "smoke"),
  smokeFull1: w("l2b", "fills"),

  // L3: Fire moved to entrance -> wind blowout
  fireMoveStart: w("l3a", "move"),
  fireMoved: w("l3a", "entrance"),
  windGust: w("l3b", "wind"),
  fireBlowout: w("l3b", "out"),

  // L4: Wind wall assembly
  wallStackStart: w("l4a", "stack"),
  wallDone: w("l4a", "wall"),
  wallName: w("l4b", "wall"),

  // L5: Smoke trapped again & Smoke vent
  smokeTrap2: w("l5a", "smoke"),
  smokeFull2: w("l5a", "fills"),
  ventOpen: w("l5b", "gap"),
  ventDone: w("l5b", "vent"),

  // L6: Water drip & floor drainage trench
  waterDrip: w("l6a", "drips"),
  dripBedArea: w("l6a", "sleep"),
  drainDigStart: w("l6b", "dig"),
  drainWaterFlow: w("l6b", "leads"),
  drainDone: w("l6b", "drain"),

  // L7: Bed of logs & dry grass
  coldRock: w("l7a", "rock"),
  bedDrop: w("l7b", "bed"),
  bedLogs: w("l7b", "logs"),
  bedGrass: w("l7b", "grass"),

  // L8: Night animals & tied stick door
  animalsNight: w("l8a", "night"),
  animalsSniff: w("l8a", "sniffing"),
  doorMake: w("l8b", "sticks"),
  doorClose: w("l8b", "close"),

  // L9: Airflow convection physics demonstration
  gapExplain: w("l9a", "gap"),
  convectionStart: w("l9b", "smoke"),
  smokeRiseCeiling: w("l9b", "rises"),
  freshAirFloor: w("l9b", "fresh"),
  closeWarning: w("l9c", "close"),

  // L10: Cozy touches: torch, mammoth art, bat
  torchLight: w("l10a", "torch"),
  mammothArt: w("l10a", "painting"),
  batReveal: w("l10b", "bat"),

  // Finale
  congrats: w("end", "congratulations"),
  homeComplete: w("end", "home"),
} as const;

// -------------------------------------------------------------
// Pure Kinematic & State Functions (all deterministic functions of frame)
// -------------------------------------------------------------

/** Campfire x position, burning state, and flame intensity */
export const campfireKinematics = (frame: number) => {
  // Exists only after fireBuild
  const exists = frame >= BEATS.fireBuild;
  if (!exists) return { exists: false, x: FIRE_MID_X, isBurning: false, intensity: 0 };

  // Move from middle to front
  const moveT = progress(frame, [BEATS.fireMoveStart, BEATS.fireMoved]);
  const x = FIRE_MID_X + (FIRE_FRONT_X - FIRE_MID_X) * easeInOut(moveT);

  // Burning state
  // Off during wind blowout (between fireBlowout and wallDone)
  const isExtinguished = frame >= BEATS.fireBlowout && frame < BEATS.smokeTrap2;
  const isBurning = !isExtinguished;

  // Flame intensity
  let intensity = 1.0;
  if (frame < BEATS.fireBuild + 10) {
    intensity = progress(frame, [BEATS.fireBuild, BEATS.fireBuild + 10]);
  } else if (frame >= BEATS.fireBlowout - 15 && frame < BEATS.fireBlowout) {
    // Flickering violently in wind before going out
    const windT = progress(frame, [BEATS.fireBlowout - 15, BEATS.fireBlowout]);
    intensity = (1 - windT) * (0.6 + 0.4 * Math.sin(frame * 1.5));
  } else if (isExtinguished) {
    intensity = 0;
  } else if (frame >= BEATS.smokeTrap2 && frame < BEATS.smokeTrap2 + 15) {
    // Relighting
    intensity = progress(frame, [BEATS.smokeTrap2, BEATS.smokeTrap2 + 15]);
  }

  return { exists, x, isBurning, intensity };
};

/** Volumetric smoke density in the cave */
export const smokeKinematics = (frame: number) => {
  // Phase 1: Smoke fills cave from center fire
  if (frame < BEATS.smokeTrap1) return { density: 0, venting: false };
  if (frame < BEATS.fireMoveStart) {
    const t = progress(frame, [BEATS.smokeTrap1, BEATS.smokeFull1]);
    return { density: easeOutCubic(t) * 0.85, venting: false };
  }
  // Phase 2: Smoke clears as fire moves to entrance
  if (frame < BEATS.windGust) {
    const t = progress(frame, [BEATS.fireMoveStart, BEATS.fireMoved + 10]);
    return { density: (1 - t) * 0.85, venting: true };
  }
  // Phase 3: Wind blew fire out -> air is clear
  if (frame < BEATS.smokeTrap2) {
    return { density: 0, venting: false };
  }
  // Phase 4: Fire relit inside wind wall -> smoke traps again
  if (frame < BEATS.ventOpen) {
    const t = progress(frame, [BEATS.smokeTrap2, BEATS.smokeFull2]);
    return { density: easeOutCubic(t) * 0.9, venting: false };
  }
  // Phase 5: Vent opened -> smoke flows smoothly along ceiling and vents out
  const clearT = progress(frame, [BEATS.ventOpen, BEATS.ventDone + 15]);
  const residualDensity = 0.9 - clearT * 0.65; // settles to clean, steady chimney draft (0.25)
  return { density: residualDensity, venting: true, topVentOnly: true };
};

/** Wind wall assembly and smoke vent gap */
export const windWallKinematics = (frame: number) => {
  if (frame < BEATS.wallStackStart) return { exists: false, buildProgress: 0, ventGap: 0 };
  const buildProgress = progress(frame, [BEATS.wallStackStart, BEATS.wallDone]);
  
  // Top vent gap opens on ventOpen
  let ventGap = 0;
  if (frame >= BEATS.ventOpen) {
    const ventT = progress(frame, [BEATS.ventOpen, BEATS.ventDone]);
    ventGap = easeOutBack(ventT) * 0.45; // 0.45m horizontal transom gap
  }

  return { exists: true, buildProgress: easeOutCubic(buildProgress), ventGap };
};

/** Drainage system: ceiling water drop, floor puddle, and carved trench */
export const drainageKinematics = (frame: number) => {
  const dripping = frame >= BEATS.waterDrip;
  const puddleGrowth = dripping ? Math.min(1, progress(frame, [BEATS.waterDrip, BEATS.drainDigStart])) : 0;
  const trenchProgress = progress(frame, [BEATS.drainDigStart, BEATS.drainDone]);
  const waterFlowing = progress(frame, [BEATS.drainWaterFlow, BEATS.drainWaterFlow + 25]);

  return {
    dripping,
    puddleRadius: puddleGrowth * 0.45,
    trenchProgress: easeOutCubic(trenchProgress),
    waterFlowing: easeInOut(waterFlowing),
  };
};

/** Bed of logs and dry grass */
export const bedKinematics = (frame: number) => {
  if (frame < BEATS.bedDrop) return { exists: false, dropY: 3.0, grassAlpha: 0 };
  const dropT = progress(frame, [BEATS.bedDrop, BEATS.bedLogs]);
  const dropY = (1 - easeOutBack(dropT)) * 2.5;
  const grassT = progress(frame, [BEATS.bedLogs, BEATS.bedGrass]);
  const grassAlpha = easeOutCubic(grassT);

  return { exists: true, dropY, grassAlpha };
};

/** Stick door rotation on interior hinge */
export const stickDoorKinematics = (frame: number) => {
  if (frame < BEATS.doorMake) return { exists: false, angle: 0 };
  if (frame < BEATS.doorClose) {
    // Open position (swung into cave)
    return { exists: true, angle: Math.PI * 0.45 };
  }
  // Swings shut
  const closeT = progress(frame, [BEATS.doorClose, BEATS.doorClose + 18]);
  const angle = Math.PI * 0.45 * (1 - easeOutBack(closeT));
  return { exists: true, angle };
};

/** Convection arrows state (active during explanation) */
export const convectionKinematics = (frame: number) => {
  const isActive = frame >= BEATS.convectionStart && frame < BEATS.torchLight;
  const opacity = progress(frame, [BEATS.convectionStart, BEATS.convectionStart + 15]) *
    (1 - progress(frame, [BEATS.torchLight - 15, BEATS.torchLight]));
  return { isActive, opacity };
};

/** Cozy interior details: wall torch, mammoth art, ceiling bat */
export const detailsKinematics = (frame: number) => {
  // Torch lights on torchLight
  const torchT = progress(frame, [BEATS.torchLight, BEATS.torchLight + 8]);
  const torchLit = torchT > 0;
  const torchIntensity = easeOutBack(torchT);

  // Mammoth painting appears on rock wall
  const artT = progress(frame, [BEATS.mammothArt, BEATS.mammothArt + 18]);
  const mammothAlpha = easeOutCubic(artT);

  // Bat appears on ceiling
  const batT = progress(frame, [BEATS.batReveal, BEATS.batReveal + 12]);
  const batAlpha = easeOutCubic(batT);

  return { torchLit, torchIntensity, mammothAlpha, batAlpha };
};
