import type { CameraConfig, CameraWaypoint, EpisodeConfig, SfxCue, SubtitleSegment } from "../../engine/types";
import subtitlesData from "./data/wordTimestamps.json";
import { BEATS, DURATION, lineStart, lineEnd } from "./timeline";
import { shot, orbitShot } from "../../kit/camera";
import { loopCue } from "../../kit/sfx";
import { TrapHUD } from "./TrapHUD";

// SFX cue helper for public/shelter/cave-home/sfx/*.wav
export const sfx = (name: string, frame: number, volume = 1, extra: Partial<SfxCue> = {}): SfxCue => ({
  src: `shelter/cave-home/sfx/${name}.wav`,
  frame: Math.round(frame),
  volume,
  ...extra,
});

const wp = (frame: number, pose: ReturnType<typeof shot>): CameraWaypoint => ({
  frame: Math.round(frame),
  position: pose.position,
  lookAt: pose.lookAt,
});

// Camera choreography across the shelter narrative (zoomed out & framed matching reference video)
const WAYPOINTS: CameraWaypoint[] = [
  // 1. Exterior rain establishing cutaway (spacious mountain slope & forest view)
  wp(0, orbitShot(-1.5, 1.8, 13.5, -0.35, { rise: 2.4 })),
  wp(BEATS.coldIntro - 15, orbitShot(-1.2, 1.8, 12.5, -0.32, { rise: 2.2 })),

  // 2. Interior dark push-in (pitch black and freezing cavern)
  wp(BEATS.coldIntro, shot(2.8, 1.8, 9.8, { rise: 1.0 })),
  wp(BEATS.fireBuild - 10, shot(2.6, 1.7, 9.4, { rise: 0.95 })),

  // 3. Campfire center ignite & smoke fill (frames floor, full campfire, & vaulted ceiling)
  wp(BEATS.fireBuild, shot(2.6, 1.6, 9.2, { rise: 1.0 })),
  wp(BEATS.fireMoveStart - 10, shot(2.6, 1.7, 9.6, { rise: 1.05 })),

  // 4. Fire moved to entrance
  wp(BEATS.fireMoveStart, shot(1.0, 1.6, 9.6, { rise: 1.1 })),
  wp(BEATS.windGust - 8, shot(0.6, 1.6, 9.4, { rise: 1.1 })),

  // 5. Wind gust & fire blowout (exterior 3/4 cutaway showing rain and blowing wind)
  wp(BEATS.windGust, orbitShot(-0.2, 1.6, 10.8, -0.38, { rise: 1.5 })),
  wp(BEATS.wallStackStart - 10, orbitShot(-0.8, 1.6, 9.4, -0.58, { rise: 2.0, z: 0.0 })),

  // 6. Wind wall assembly (exterior 3/4 angle: cliff, pine trees, stone wall, doorway & open arch)
  wp(BEATS.wallStackStart, orbitShot(-0.8, 1.6, 9.0, -0.62, { rise: 2.0, z: 0.0 })),
  wp(lineEnd("l4b") + 15, orbitShot(-0.8, 1.6, 8.8, -0.60, { rise: 1.9, z: 0.0 })),

  // 7. Smoke trapped again & Smoke vent gap opens (angled from inside towards entrance: wall, doorway, & prominent top vent gap!)
  wp(BEATS.smokeTrap2, orbitShot(0.2, 1.7, 8.8, 0.28, { rise: 1.0, z: 0.0 })),
  wp(BEATS.ventOpen, orbitShot(0.2, 1.7, 8.6, 0.26, { rise: 0.95, z: 0.0 })),
  wp(BEATS.waterDrip - 15, orbitShot(0.5, 1.6, 8.8, 0.24, { rise: 1.1, z: 0.0 })),

  // 8. Ceiling water drip & carved drainage channel (elevated downward view tracking curved ditch around campfire)
  wp(BEATS.waterDrip, orbitShot(3.4, 1.0, 8.8, -0.24, { rise: 2.8, z: -0.3 })),
  wp(BEATS.drainDigStart, orbitShot(2.2, 0.9, 9.0, -0.26, { rise: 3.0, z: -0.1 })),
  wp(BEATS.drainDone, orbitShot(0.8, 0.9, 9.2, -0.28, { rise: 2.8, z: 0.1 })),

  // 9. Bed of logs & dry grass (intimate view of cozy bed in the corner alcove)
  wp(BEATS.bedDrop, orbitShot(5.2, 0.9, 6.8, -0.20, { rise: 1.8, z: -0.9 })),
  wp(BEATS.animalsNight - 15, orbitShot(5.2, 0.9, 6.6, -0.18, { rise: 1.7, z: -0.9 })),

  // 10. Night animals & Tied stick door closes from inside (clean side-on view of wolves and door)
  wp(BEATS.animalsNight, shot(-0.3, 1.4, 9.5, { rise: 1.0 })),
  wp(BEATS.doorClose + 20, shot(-0.3, 1.4, 9.2, { rise: 0.95 })),

  // 11. Convection physics demonstration (zoomed out full cutaway: floor intake, campfire, vaulted ceiling, and top exhaust)
  wp(BEATS.gapExplain, shot(0.6, 1.8, 11.2, { rise: 1.1 })),
  wp(BEATS.closeWarning + 20, shot(0.6, 1.8, 11.2, { rise: 1.1 })),

  // 12. Cozy details: wall torch, mammoth painting, ceiling bat (well-framed with context)
  wp(BEATS.torchLight, shot(3.6, 2.0, 7.8, { rise: 0.7 })),
  wp(BEATS.mammothArt, shot(4.5, 2.0, 7.8, { rise: 0.7 })),
  wp(BEATS.batReveal, shot(3.4, 3.1, 7.2, { rise: 0.4 })),

  // 13. Finale wide pull-back: Full majestic cutaway diorama
  wp(BEATS.congrats, orbitShot(1.8, 1.8, 17.5, -0.14, { rise: 2.2 })),
  wp(DURATION - 1, orbitShot(1.8, 1.8, 18.2, -0.14, { rise: 2.4 })),
];

const SFX_CUES: SfxCue[] = [
  // Ambient rain loop throughout the episode (gentle ambient bed)
  loopCue(sfx("rain_loop", 0, 0.20), DURATION, 20),

  // Title card stamp & Stage badge pops
  sfx("stamp", 6, 0.45),
  sfx("pop", Math.max(84, lineStart("l3a")), 0.4),
  sfx("pop", lineStart("l4a"), 0.4),
  sfx("pop", lineStart("l5b"), 0.4),
  sfx("pop", lineStart("l6b"), 0.4),
  sfx("pop", lineStart("l8b"), 0.4),

  // L2: Campfire
  sfx("thud", BEATS.fireBuild - 2, 0.5),
  sfx("ignite", BEATS.fireBuild, 0.65),
  sfx("whoosh", BEATS.smokeTrap1, 0.45),

  // L3: Wind & Blowout
  sfx("wind_gust", BEATS.windGust, 0.75),
  sfx("fire_extinguish", BEATS.fireBlowout, 0.7),

  // L4: Wind Wall
  sfx("stone_wall", BEATS.wallStackStart, 0.7),
  sfx("pop", BEATS.wallName, 0.4),

  // L5: Relight & Vent
  sfx("ignite", BEATS.smokeTrap2, 0.6),
  sfx("whoosh", BEATS.ventOpen, 0.55),

  // L6: Drips & Trench (soft, realistic water levels)
  sfx("water_drip", BEATS.waterDrip, 0.18),
  sfx("water_drip", BEATS.waterDrip + 24, 0.16),
  sfx("water_drip", BEATS.waterDrip + 48, 0.16),
  sfx("trench_dig", BEATS.drainDigStart, 0.32),

  // L7: Bed
  sfx("thud", BEATS.bedDrop + 10, 0.55),

  // L8: Stick door
  sfx("stick_door", BEATS.doorClose, 0.7),

  // L10: Cozy touches
  sfx("ignite", BEATS.torchLight, 0.55),
  sfx("sparkle", BEATS.mammothArt, 0.5),
  sfx("bat_flutter", BEATS.batReveal, 0.6),

  // Finale: Victory stamp & boom
  sfx("stamp", BEATS.congrats, 0.6),
  sfx("boom", BEATS.homeComplete, 0.65),
];

export const cameraConfig: CameraConfig = {
  fov: 40,
  initialPosition: WAYPOINTS[0].position,
  waypoints: WAYPOINTS,
};

export const config: EpisodeConfig = {
  id: "CaveHome",
  title: "How a Cave Becomes a Home",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: DURATION,
  camera: cameraConfig,
  environment: {
    sky: {
      top: "#1a2538",
      mid: "#3b4f6b",
      bottom: "#657d9e",
    },
    ground: {
      color: "#2b1c12",
      hidden: true, // We use CaveDiorama's foundation ground box
    },
    hills: [],
    clouds: [],
    lights: {
      key: { position: [-5, 8, 5], intensity: 1.0, color: "#a5b9cc" },
      fill: { position: [5, 4, 3], intensity: 0.35, color: "#6a7b8c" },
      rim: { position: [0, 6, -5], intensity: 0.4, color: "#ffffff" },
      ambient: { intensity: 0.5, color: "#c5d8ea" },
    },
  },
  audio: {
    src: "shelter/cave-home/narration_v1.mp3",
    volume: 1.0,
  },
  music: {
    src: "shelter/cave-home/score_v1.mp3",
    volume: 1.0,
  },
  subtitles: {
    segments: subtitlesData as SubtitleSegment[],
    textColor: "#ffffff",
    activeColor: "#ffd84d",
    bottomOffset: 370,
  },
  sfx: SFX_CUES,
  OverlayComponent: TrapHUD,
};
