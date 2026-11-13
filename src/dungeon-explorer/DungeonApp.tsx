import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AdventurerUnit, type AdventurerClass, type AdventurerPose } from "../artifacts/characters/hero";
import type { Expression } from "../artifacts/characters/hero/Face";
import { OUTPUT_HEIGHT } from "../engine/viewport";
import { buildCrypt, type CryptLamp } from "./dungeon/crypt";
import { floorAt } from "./dungeon/floors";
import { FLOOR, generateDungeon, type DungeonData } from "./dungeon/generator";
import { buildLevel, type LevelData } from "./dungeon/level";
import { ashlar } from "./dungeon/masonry";
import { THEMES, type ThemeName } from "./dungeon/themes";
import { CELL_M, createDungeonView, type ScanSet } from "./dungeon/view";
import { createWalker } from "./dungeon/walker";
import { createMobSimulation, type MobAgent } from "./npcSim";
import { createPaladin, createPaladinSfx, type CombatTarget, type CombatWorld, type Paladin, type PaladinSfx } from "./paladin";

// A man in full plate: brisk walk, heavy run, and a slow advance behind the shield.
const WALK_CELLS = 1.5;
const RUN_CELLS = 2.7;
const BLOCK_CELLS = 0.95;
const FIRST_PERSON_FOV = 74;
const LOOK_SENS = 0.0024;
const TOUCH_LOOK_SENS = 0.0052;
const EYE_HEIGHT_CELLS = 1.04;

function responsiveFov(baseVfov: number, width: number, height: number): number {
  const aspect = Math.max(0.35, width / Math.max(1, height));
  if (aspect >= 1) return baseVfov;
  const minHfovRad = (84 * Math.PI) / 180;
  const needed = (2 * Math.atan(Math.tan(minHfovRad / 2) / aspect) * 180) / Math.PI;
  return Math.min(96, Math.max(baseVfov, needed));
}

async function enterLandscapeMode(): Promise<void> {
  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  try {
    if (!document.fullscreenElement) {
      await (docEl.requestFullscreen?.() ?? docEl.webkitRequestFullscreen?.());
    }
  } catch {
    // Optional fullscreen permission
  }
  try {
    const ori = window.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await ori?.lock?.("landscape");
  } catch {
    // Browsers like iOS Safari rely on physical orientation; layout adapts automatically on resize
  }
}

interface CharacterViewProps {
  classType: AdventurerClass;
  scale: number;
  pose: AdventurerPose;
  animFrame: number;
  expression: Expression;
  visible?: boolean;
}

const CharacterModel = React.memo<CharacterViewProps>(
  ({ classType, scale, pose, animFrame, expression, visible = true }) => (
    <group visible={visible}>
      <AdventurerUnit
        classType={classType}
        scale={scale}
        pose={pose}
        animFrame={Math.floor(animFrame)}
        expression={expression}
      />
    </group>
  )
);

interface WorldState {
  dungeon: DungeonData;
  level: LevelData;
  lamps: CryptLamp[];
  walker: ReturnType<typeof createWalker>;
  sim: ReturnType<typeof createMobSimulation>;
  playerFloor: number;
  playerJumpY: number;
  playerJumpVy: number;
  time: number;
  /** What the paladin's blade can strike: stone and the mobs. */
  combat: CombatWorld;
  targets: CombatTarget[];
}

interface HudInfo {
  name: string;
  rooms: number;
  mobs: number;
  roomLabel: string;
  theme: ThemeName;
  seed: number;
  firstPerson: boolean;
  pointerLocked: boolean;
  loading: string | null;
}

interface DungeonSceneProps {
  seed: number;
  roomCount: number;
  theme: ThemeName;
  firstPerson: boolean;
  onHudUpdate: (patch: Partial<HudInfo>) => void;
  minimapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  touchMoveRef: React.RefObject<{ forward: number; strafe: number }>;
  touchSprintRef: React.RefObject<boolean>;
  jumpQueueRef: React.RefObject<boolean>;
  attackQueueRef: React.RefObject<boolean>;
  touchBlockRef: React.RefObject<boolean>;
  onTouchDetected: () => void;
}

function resolveThirdPersonCam(
  d: DungeonData,
  level: LevelData,
  px: number,
  py: number,
  pz: number,
  yaw: number,
  pitch: number,
  desiredDist: number
): { cx: number; cy: number; cz: number; tx: number; ty: number; tz: number } {
  const tx = px;
  const ty = py + 1.5;
  const tz = pz;
  const dirX = Math.cos(pitch) * Math.sin(yaw);
  const dirY = Math.sin(pitch);
  const dirZ = Math.cos(pitch) * Math.cos(yaw);

  const STEPS = 22;
  let safeDist = desiredDist;
  for (let i = 1; i <= STEPS; i++) {
    const t = (desiredDist * i) / STEPS;
    const x = tx + dirX * t;
    const y = ty + dirY * t;
    const z = tz + dirZ * t;
    const gx = x / CELL_M + d.W / 2;
    const gz = z / CELL_M + d.H / 2;
    const ix = Math.max(0, Math.min(d.W - 1, Math.floor(gx)));
    const iz = Math.max(0, Math.min(d.H - 1, Math.floor(gz)));
    const open = level.openAt ? level.openAt(gx, gz) : d.grid[iz * d.W + ix] === FLOOR ? 1 : 0;
    const ceilY = (level.heights[iz * d.W + ix] || 2.8) * CELL_M - 0.25;
    const flY = floorAt(d, gx, gz) * CELL_M + 0.35;
    if (open < 0.58 || d.grid[iz * d.W + ix] !== FLOOR || y > ceilY || y < flY) {
      safeDist = Math.max(0.55, (desiredDist * (i - 1)) / STEPS - 0.15);
      break;
    }
  }
  const cx = tx + dirX * safeDist;
  let cy = ty + dirY * safeDist;
  const cz = tz + dirZ * safeDist;
  const gx = cx / CELL_M + d.W / 2;
  const gz = cz / CELL_M + d.H / 2;
  const ix = Math.max(0, Math.min(d.W - 1, Math.floor(gx)));
  const iz = Math.max(0, Math.min(d.H - 1, Math.floor(gz)));
  const ceilY = (level.heights[iz * d.W + ix] || 2.8) * CELL_M - 0.28;
  const flY = floorAt(d, gx, gz) * CELL_M + 0.35;
  cy = Math.max(flY, Math.min(ceilY, cy));
  return { cx, cy, cz, tx, ty, tz };
}

const DungeonScene: React.FC<DungeonSceneProps> = ({
  seed,
  roomCount,
  theme,
  firstPerson,
  onHudUpdate,
  minimapCanvasRef,
  touchMoveRef,
  touchSprintRef,
  jumpQueueRef,
  attackQueueRef,
  touchBlockRef,
  onTouchDetected,
}) => {
  const { gl, scene, camera, size } = useThree();
  const viewRef = useRef<ReturnType<typeof createDungeonView> | null>(null);
  const scansRef = useRef<{ wall: ScanSet; floor: ScanSet; plaster: ScanSet } | null>(null);
  const worldRef = useRef<WorldState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const camDistRef = useRef<number>(3.1);
  const lookPointerRef = useRef<{ id: number; x: number; y: number; touch: boolean } | null>(null);
  const lastTouchDownRef = useRef(false);
  const paladinRef = useRef<Paladin | null>(null);
  const sfxRef = useRef<PaladinSfx | null>(null);
  const mouseBlockRef = useRef(false);
  const freeLookRef = useRef(0);
  const prevYawRef = useRef(0);
  const eyeRef = useRef(new THREE.Vector3());
  const mobGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const [mobs, setMobs] = useState<MobAgent[]>([]);
  const [animTick, setAnimTick] = useState(0);
  const animTimerRef = useRef(0);
  const hudTimerRef = useRef(0);

  OUTPUT_HEIGHT.value = Math.max(480, size.height);

  // Initialize Three.js dungeon renderer + load CC0 PBR maps once.
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    persp.fov = 68;
    persp.near = 0.1;
    persp.far = 240;
    persp.updateProjectionMatrix();

    const view = createDungeonView(gl, scene, persp);
    viewRef.current = view;

    return () => {
      view.dispose();
      viewRef.current = null;
    };
  }, [gl, scene, camera]);

  // The playable paladin: one rigged body for both first and third person.
  useEffect(() => {
    const paladin = createPaladin(gl);
    paladin.materials.setEnvIntensity(0.45);
    paladin.group.visible = false;
    paladinRef.current = paladin;
    scene.add(paladin.group, paladin.fx);
    const sfx = createPaladinSfx();
    sfxRef.current = sfx;
    // Browsers only start audio after a gesture.
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      scene.remove(paladin.group, paladin.fx);
      paladin.dispose();
      sfx.dispose();
      paladinRef.current = null;
      sfxRef.current = null;
    };
  }, [gl, scene]);

  // Input listeners (WASD/Arrows + Shift + Space + Mouse/Touch drag look + Wheel zoom + attack/block).
  useEffect(() => {
    const dom = gl.domElement;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.repeat) keysRef.current.add(e.code);
      if (e.code === "Space" && worldRef.current) {
        const w = worldRef.current;
        if (w.playerJumpY <= 0.01) w.playerJumpVy = 4.6;
      }
      if (e.code === "KeyF" && !e.repeat) attackQueueRef.current = true;
    };
    // Mouse buttons: left swings (once the mouse is captured), right raises the shield.
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) mouseBlockRef.current = true;
      if (e.button === 0 && document.pointerLockElement === dom) attackQueueRef.current = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) mouseBlockRef.current = false;
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onBlur = () => {
      keysRef.current.clear();
      lookPointerRef.current = null;
      mouseBlockRef.current = false;
    };
    const onClick = () => {
      if (lastTouchDownRef.current) return;
      if (document.pointerLockElement !== dom) {
        try {
          const p = dom.requestPointerLock?.() as unknown as Promise<void> | undefined;
          p?.catch?.(() => {});
        } catch {
          // Pointer lock optional; drag-to-look remains active.
        }
      }
    };
    const onPointerLock = () => {
      onHudUpdate({ pointerLocked: document.pointerLockElement === dom });
      if (document.pointerLockElement !== dom) keysRef.current.clear();
    };
    const onPointerDown = (e: PointerEvent) => {
      const isTouch = e.pointerType === "touch";
      lastTouchDownRef.current = isTouch;
      if (isTouch) onTouchDetected();
      if (!isTouch && e.button !== 0) return;
      if (lookPointerRef.current !== null) return;
      lookPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: isTouch };
      try {
        dom.setPointerCapture?.(e.pointerId);
      } catch {
        // Optional capture
      }
    };
    const clearLookPointer = (e: PointerEvent) => {
      if (lookPointerRef.current?.id === e.pointerId) {
        lookPointerRef.current = null;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const world = worldRef.current;
      if (!world) return;
      let dx = 0;
      let dy = 0;
      let sens = LOOK_SENS;
      if (document.pointerLockElement === dom) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (lookPointerRef.current && lookPointerRef.current.id === e.pointerId) {
        dx = e.clientX - lookPointerRef.current.x;
        dy = e.clientY - lookPointerRef.current.y;
        lookPointerRef.current.x = e.clientX;
        lookPointerRef.current.y = e.clientY;
        if (lookPointerRef.current.touch) sens = TOUCH_LOOK_SENS;
      } else {
        return;
      }
      // Hold C in third person to orbit the camera around the paladin without turning him.
      if (!firstPerson && keysRef.current.has("KeyC")) freeLookRef.current -= dx * sens;
      else world.walker.yaw -= dx * sens;
      const minPitch = firstPerson ? -1.1 : -0.35;
      const maxPitch = firstPerson ? 1.1 : 1.05;
      world.walker.pitch = Math.max(minPitch, Math.min(maxPitch, world.walker.pitch + (firstPerson ? -dy : dy) * sens));
    };
    const onWheel = (e: WheelEvent) => {
      camDistRef.current = Math.max(1.6, Math.min(5.2, camDistRef.current + e.deltaY * 0.0025));
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    dom.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onPointerLock);
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", clearLookPointer);
    window.addEventListener("pointercancel", clearLookPointer);
    window.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("wheel", onWheel, { passive: true });
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("contextmenu", onContextMenu);
    return () => {
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      dom.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onPointerLock);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", clearLookPointer);
      window.removeEventListener("pointercancel", clearLookPointer);
      window.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("wheel", onWheel);
    };
  }, [gl, firstPerson, onHudUpdate, onTouchDetected, attackQueueRef]);

  // Build / rebuild the dungeon floor when seed, roomCount, or theme changes.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const view = viewRef.current;
      if (!view) return;

      if (!scansRef.current) {
        onHudUpdate({ loading: "Loading stone & dirt PBR textures..." });
        const loader = new THREE.TextureLoader();
        const scan = async (base: string): Promise<ScanSet> => {
          const [color, normal, roughness, height] = await Promise.all(
            ["baseColor", "normal", "roughness", "displacement"].map((map) => loader.loadAsync(`${base}_${map}.jpg`))
          );
          return { color, normal, roughness, height };
        };
        const [wall, floor, plaster] = await Promise.all([
          scan("/assets/materials/medievalBlocks05/medieval_blocks_05"),
          scan("/assets/materials/dirtFloor/dirt_floor"),
          scan("/assets/materials/medievalWall01/medieval_wall_01"),
        ]);
        if (cancelled) return;
        scansRef.current = { wall, floor, plaster };
        view.setScans(scansRef.current);

        onHudUpdate({ loading: "Cutting masonry..." });
        await new Promise((r) => setTimeout(r, 10));
        if (cancelled) return;
        view.setMasonry({ stone: ashlar(512, 11, 8) });
      }

      onHudUpdate({ loading: "Forging 3D dungeon floor & taller arches..." });
      await new Promise((r) => setTimeout(r, 10));
      if (cancelled) return;

      const dungeon = generateDungeon({ seed, rooms: roomCount, loops: 0.35, decor: 0.6, theme });
      const level = buildLevel(dungeon);
      view.setLevel(dungeon, level);

      onHudUpdate({ loading: "Raising vaults & paving flagstones..." });
      await new Promise((r) => setTimeout(r, 10));
      if (cancelled) return;

      const lamps = buildCrypt(view, dungeon, level);
      const walker = createWalker(dungeon);
      walker.start();
      const playerFloor = floorAt(dungeon, walker.x + dungeon.W / 2, walker.z + dungeon.H / 2);
      const sim = createMobSimulation(dungeon, walker.x * CELL_M, walker.z * CELL_M);

      mobGroupRefs.current = sim.mobs.map(() => null);
      const targets: CombatTarget[] = sim.mobs.map((m) => ({ id: m.id, x: m.wx, y: m.wy, z: m.wz, radius: 0.36 * m.scale, height: 1.62 * m.scale }));
      const combat: CombatWorld = {
        targets,
        solid: (x, y, z) => {
          const gx = x / CELL_M + dungeon.W / 2;
          const gz = z / CELL_M + dungeon.H / 2;
          const ix = Math.floor(gx);
          const iz = Math.floor(gz);
          if (ix < 0 || iz < 0 || ix >= dungeon.W || iz >= dungeon.H) return true;
          const c = iz * dungeon.W + ix;
          if (dungeon.grid[c] !== FLOOR) return true;
          if (level.openAt && level.openAt(gx, gz) < 0.5) return true;
          if (y > (level.heights[c] || 2.8) * CELL_M) return true;
          return y < floorAt(dungeon, gx, gz) * CELL_M - 0.03;
        },
        onHit: (id, dirX, dirZ) => {
          sim.hit(id, dirX, dirZ);
          sfxRef.current?.hit();
        },
        onClang: () => sfxRef.current?.clang(),
        onSwing: (swing) => sfxRef.current?.swing(swing),
        onFootstep: () => sfxRef.current?.step(walker.speedNow > 2 ? 1 : 0),
      };
      freeLookRef.current = 0;
      prevYawRef.current = walker.yaw;
      worldRef.current = {
        dungeon,
        level,
        lamps,
        walker,
        sim,
        playerFloor,
        playerJumpY: 0,
        playerJumpVy: 0,
        time: 0,
        combat,
        targets,
      };
      setMobs(sim.mobs);
      onHudUpdate({
        loading: null,
        name: dungeon.name,
        rooms: dungeon.rooms.length,
        mobs: sim.mobs.length,
        roomLabel: "Entrance",
      });
    };

    run().catch((err) => {
      console.error(err);
      if (!cancelled) onHudUpdate({ loading: `Error: ${err?.message ?? String(err)}` });
    });

    return () => {
      cancelled = true;
    };
  }, [seed, roomCount, theme, onHudUpdate]);

  useFrame((_, rawDelta) => {
    const view = viewRef.current;
    const world = worldRef.current;
    if (!view || !world) return;

    const dt = Math.min(rawDelta, 0.05);
    world.time += dt;
    const { dungeon, level, walker, sim, lamps } = world;
    const keys = keysRef.current;
    const kbForward =
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const kbStrafe =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const tMove = touchMoveRef.current;
    const forward = Math.max(-1, Math.min(1, kbForward + tMove.forward));
    const strafe = Math.max(-1, Math.min(1, kbStrafe + tMove.strafe));
    const stickMag = Math.hypot(tMove.forward, tMove.strafe);
    const sprinting =
      keys.has("ShiftLeft") || keys.has("ShiftRight") || touchSprintRef.current || stickMag > 0.88;
    const paladin = paladinRef.current;
    const blocking = mouseBlockRef.current || keys.has("KeyQ") || touchBlockRef.current;
    const swinging = paladin !== null && paladin.animator.state !== "none";
    const speed = (blocking ? BLOCK_CELLS : sprinting ? RUN_CELLS : WALK_CELLS) * (swinging ? 0.72 : 1);

    if (jumpQueueRef.current) {
      jumpQueueRef.current = false;
      if (world.playerJumpY <= 0.01) world.playerJumpVy = 4.6;
    }

    const x0 = walker.x;
    const z0 = walker.z;
    walker.step(dt, forward, strafe, speed);

    // Smooth vertical stair/basin height + jump arc.
    const targetFloor = floorAt(dungeon, walker.x + dungeon.W / 2, walker.z + dungeon.H / 2);
    world.playerFloor += (targetFloor - world.playerFloor) * (1 - Math.exp(-dt * 12));
    if (world.playerJumpY > 0 || world.playerJumpVy !== 0) {
      world.playerJumpY += world.playerJumpVy * dt;
      world.playerJumpVy -= 13.5 * dt;
      if (world.playerJumpY <= 0) {
        world.playerJumpY = 0;
        world.playerJumpVy = 0;
      }
    }

    const px = walker.x * CELL_M;
    const py = world.playerFloor * CELL_M + world.playerJumpY;
    const pz = walker.z * CELL_M;

    // Step all roaming NPCs/mobs first so the blade tests against where they are now.
    sim.step(dt, px, pz);
    for (let i = 0; i < sim.mobs.length; i++) {
      const t = world.targets[i];
      t.x = sim.mobs[i].wx;
      t.y = sim.mobs[i].wy;
      t.z = sim.mobs[i].wz;
    }

    // The paladin always squares up to where the camera aims; the gait is driven by the
    // distance actually covered (after wall collision), in his own frame.
    if (paladin) {
      const facing = walker.yaw + Math.PI;
      const vx = dt > 0 ? ((walker.x - x0) * CELL_M) / dt : 0;
      const vz = dt > 0 ? ((walker.z - z0) * CELL_M) / dt : 0;
      const sinF = Math.sin(facing);
      const cosF = Math.cos(facing);
      paladin.group.visible = true;
      paladin.group.position.set(px, py, pz);
      paladin.group.rotation.y = facing;
      paladin.setFirstPerson(firstPerson);
      paladin.update(
        dt,
        {
          moveX: vx * cosF - vz * sinF,
          moveZ: vx * sinF + vz * cosF,
          aimPitch: firstPerson ? walker.pitch : -walker.pitch * 0.45,
          turnRate: dt > 0 ? (walker.yaw - prevYawRef.current) / dt : 0,
          air: world.playerJumpY,
          block: blocking,
          attack: attackQueueRef.current,
          firstPerson,
        },
        world.playerFloor * CELL_M,
        world.combat
      );
    }
    attackQueueRef.current = false;
    prevYawRef.current = walker.yaw;
    if (!keys.has("KeyC")) freeLookRef.current *= Math.exp(-dt * 7);

    for (let i = 0; i < sim.mobs.length; i++) {
      const m = sim.mobs[i];
      const g = mobGroupRefs.current[i];
      if (g) {
        g.position.set(m.wx, m.wy, m.wz);
        g.rotation.y = m.yaw;
      }
    }

    // Update camera (3rd-person follow with wall/ceiling collision, or 1st-person eye).
    const persp = camera as THREE.PerspectiveCamera;
    const desiredFov = responsiveFov(firstPerson ? FIRST_PERSON_FOV : 68, size.width, size.height);
    if (Math.abs(persp.fov - desiredFov) > 0.2) {
      persp.fov = desiredFov;
      persp.updateProjectionMatrix();
    }
    const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
    const distScale = aspect < 0.85 ? 1.24 : 1;

    const kick = paladin ? paladin.shake.value : 0;
    if (firstPerson) {
      // True first person: the camera sits at the paladin's eyes, so the arms, sword and
      // shield in view are the same ones everyone else sees.
      if (paladin) persp.position.copy(paladin.getEye(eyeRef.current));
      else persp.position.set(px, (world.playerFloor + EYE_HEIGHT_CELLS) * CELL_M + world.playerJumpY, pz);
      persp.rotation.order = "YXZ";
      persp.rotation.y = walker.yaw + Math.sin(world.time * 61) * kick * 0.012;
      persp.rotation.x = walker.pitch + Math.sin(world.time * 47) * kick * 0.016;
      persp.rotation.z = Math.sin(world.time * 53) * kick * 0.02;
    } else {
      const cam = resolveThirdPersonCam(
        dungeon,
        level,
        px,
        world.playerFloor * CELL_M,
        pz,
        walker.yaw + freeLookRef.current,
        walker.pitch,
        camDistRef.current * distScale
      );
      persp.position.set(cam.cx, cam.cy + Math.sin(world.time * 47) * kick * 0.03, cam.cz);
      persp.up.set(0, 1, 0);
      persp.lookAt(cam.tx, cam.ty, cam.tz);
    }
    persp.updateMatrixWorld();

    // Update nearest shadow lamps + render multi-pass crypt frame.
    view.updateLights(dt, walker.x, walker.z, lamps, dungeon);
    // The carried lantern rides half a metre above the helm so it lights the steel without burning it out.
    view.renderFrame(world.time, dt, px, py + 0.55, pz, size.width, size.height);

    // Throttle React pose/HUD ticks cleanly (~28 Hz for crisp animations, ~6 Hz for room badge & minimap).
    animTimerRef.current += dt;
    if (animTimerRef.current >= 1 / 28) {
      animTimerRef.current = 0;
      setAnimTick((t) => t + 1);
    }

    hudTimerRef.current += dt;
    if (hudTimerRef.current >= 0.16) {
      hudTimerRef.current = 0;
      const room = walker.room();
      const label = room ? `${room.type.charAt(0).toUpperCase()}${room.type.slice(1)} (Room ${room.id + 1})` : "Corridor";
      onHudUpdate({ roomLabel: label });

      const canvas = minimapCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const cw = canvas.width;
          const ch = canvas.height;
          ctx.clearRect(0, 0, cw, ch);
          const scale = Math.min((cw - 12) / dungeon.W, (ch - 12) / dungeon.H);
          const ox = (cw - dungeon.W * scale) / 2;
          const oy = (ch - dungeon.H * scale) / 2;
          for (let z = 0; z < dungeon.H; z++) {
            for (let x = 0; x < dungeon.W; x++) {
              const g = dungeon.grid[z * dungeon.W + x];
              if (g === FLOOR) {
                ctx.fillStyle = dungeon.roomId[z * dungeon.W + x] >= 0 ? "rgba(180,192,200,0.42)" : "rgba(130,140,148,0.34)";
                ctx.fillRect(ox + x * scale, oy + z * scale, Math.ceil(scale), Math.ceil(scale));
              }
            }
          }
          // Mobs (red/green dots)
          ctx.fillStyle = "#6ce88a";
          for (const m of sim.mobs) {
            ctx.beginPath();
            ctx.arc(ox + m.cx * scale, oy + m.cz * scale, Math.max(2, scale * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
          // Player Paladin (gold dot)
          ctx.fillStyle = "#ffd84d";
          ctx.beginPath();
          ctx.arc(ox + (walker.x + dungeon.W / 2) * scale, oy + (walker.z + dungeon.H / 2) * scale, Math.max(3, scale * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, 1);

  // Use animTick to drive smooth pose frame updates on the NPCs (the paladin animates himself).
  void animTick;

  return (
    <>
      {mobs.map((m, idx) => (
        <group
          key={m.id}
          ref={(el) => {
            mobGroupRefs.current[idx] = el;
          }}
          position={[m.wx, m.wy, m.wz]}
          rotation={[0, m.yaw, 0]}
        >
          <CharacterModel
            classType={m.classType}
            scale={m.scale}
            pose={m.pose}
            animFrame={m.animFrame}
            expression={m.expression}
          />
        </group>
      ))}
    </>
  );
};

export interface DungeonAppProps {
  backHref?: string;
}

const VALID_THEMES: ThemeName[] = ["verdant", "ancient", "molten", "frost", "grim"];

function detectInitialTouch(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  return "ontouchstart" in window && window.innerWidth <= 1024;
}

export const DungeonApp: React.FC<DungeonAppProps> = ({ backHref }) => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialSeed = Number(params.get("seed")) || 1337;
  const initialRooms = Math.min(10, Math.max(4, Number(params.get("rooms")) || 8));
  const requestedTheme = params.get("theme") as ThemeName | null;
  const initialTheme: ThemeName =
    requestedTheme && VALID_THEMES.indexOf(requestedTheme) !== -1 ? requestedTheme : "verdant";

  const [seed, setSeed] = useState(initialSeed);
  const [roomCount, setRoomCount] = useState(initialRooms);
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [firstPerson, setFirstPerson] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [isTouchUI, setIsTouchUI] = useState(detectInitialTouch);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }));
  const [sprintLocked, setSprintLocked] = useState(false);
  const [rotateDismissed, setRotateDismissed] = useState(false);
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hud, setHud] = useState<HudInfo>({
    name: "Forging Dungeon...",
    rooms: initialRooms,
    mobs: 0,
    roomLabel: "Entrance",
    theme: "verdant",
    seed: initialSeed,
    firstPerson: false,
    pointerLocked: false,
    loading: "Initializing...",
  });
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const touchMoveRef = useRef<{ forward: number; strafe: number }>({ forward: 0, strafe: 0 });
  const touchSprintRef = useRef(false);
  const jumpQueueRef = useRef(false);
  const attackQueueRef = useRef(false);
  const touchBlockRef = useRef(false);
  const stickPointerRef = useRef<{ id: number; cx: number; cy: number } | null>(null);

  const handleHudUpdate = useCallback((patch: Partial<HudInfo>) => {
    setHud((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleTouchDetected = useCallback(() => {
    setIsTouchUI(true);
  }, []);

  useEffect(() => {
    touchSprintRef.current = sprintLocked;
  }, [sprintLocked]);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    const onOrientation = () => {
      syncViewport();
      window.setTimeout(syncViewport, 120);
    };
    const onTouchStart = () => setIsTouchUI(true);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("touchstart", onTouchStart, { passive: true, once: true });
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyV") setFirstPerson((v) => !v);
      if (e.code === "KeyM") setShowMap((v) => !v);
      if (e.code === "KeyR") setSeed((s) => ((s * 1664525 + 1013904223) >>> 0) % 99999);
      if (e.code === "KeyT") {
        const order: ThemeName[] = ["verdant", "ancient", "molten", "frost", "grim"];
        setTheme((cur) => order[(order.indexOf(cur) + 1) % order.length]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isPortrait = viewport.h > viewport.w;
  const isCompact = viewport.w < 760 || viewport.h < 520;
  const mobileMode = isTouchUI || isCompact;
  const mapPixels = isPortrait ? 94 : mobileMode ? 112 : 156;

  const updateStick = (clientX: number, clientY: number) => {
    const s = stickPointerRef.current;
    if (!s) return;
    const maxR = 38;
    const dx = clientX - s.cx;
    const dy = clientY - s.cy;
    const dist = Math.hypot(dx, dy);
    const scale = dist > maxR ? maxR / dist : 1;
    const clampedX = dx * scale;
    const clampedY = dy * scale;
    setStickOffset({ x: clampedX, y: clampedY });
    touchMoveRef.current = {
      strafe: clampedX / maxR,
      forward: -clampedY / maxR,
    };
  };

  const resetStick = () => {
    stickPointerRef.current = null;
    setStickOffset({ x: 0, y: 0 });
    touchMoveRef.current = { forward: 0, strafe: 0 };
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050608",
        color: "#f2efe8",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      <Canvas
        flat
        linear
        dpr={[1, 1.5]}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 68, near: 0.1, far: 240 }}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      >
        <DungeonScene
          seed={seed}
          roomCount={roomCount}
          theme={theme}
          firstPerson={firstPerson}
          onHudUpdate={handleHudUpdate}
          minimapCanvasRef={minimapRef}
          touchMoveRef={touchMoveRef}
          touchSprintRef={touchSprintRef}
          jumpQueueRef={jumpQueueRef}
          attackQueueRef={attackQueueRef}
          touchBlockRef={touchBlockRef}
          onTouchDetected={handleTouchDetected}
        />
      </Canvas>

      {/* Top-left compact HUD */}
      <div
        style={{
          position: "fixed",
          top: "max(10px, env(safe-area-inset-top))",
          left: "max(10px, env(safe-area-inset-left))",
          background: "rgba(8, 10, 14, 0.72)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: mobileMode ? "7px 10px" : "10px 14px",
          pointerEvents: "auto",
          maxWidth: mobileMode && showMap ? `calc(100vw - ${mapPixels + 44}px)` : mobileMode ? "calc(100vw - 24px)" : 360,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: mobileMode ? 13 : 15, color: "#ffd84d", lineHeight: 1.2 }}>
          {hud.name}
        </div>
        <div style={{ fontSize: mobileMode ? 11 : 12, color: "#c9d2db", marginTop: 2 }}>
          <b>Paladin</b> · {hud.roomLabel}
        </div>
        <div style={{ fontSize: mobileMode ? 10 : 12, color: "#9fb0bf", marginTop: 1 }}>
          Rooms: <b>{hud.rooms}</b> (max 10) · Mobs: <b>{hud.mobs}</b> · {THEMES[theme].label}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setSeed((s) => ((s * 1664525 + 1013904223) >>> 0) % 99999)}
            style={btnStyle}
          >
            {mobileMode ? "Seed" : "New Seed (R)"}
          </button>
          <button type="button" onClick={() => setFirstPerson((v) => !v)} style={btnStyle}>
            {firstPerson ? (mobileMode ? "3rd P" : "3rd Person (V)") : mobileMode ? "1st P" : "1st Person (V)"}
          </button>
          <button
            type="button"
            onClick={() => {
              const order: ThemeName[] = ["verdant", "ancient", "molten", "frost", "grim"];
              setTheme((cur) => order[(order.indexOf(cur) + 1) % order.length]);
            }}
            style={btnStyle}
          >
            {mobileMode ? "Theme" : "Theme (T)"}
          </button>
          {mobileMode ? (
            <button type="button" onClick={() => void enterLandscapeMode()} style={{ ...btnStyle, color: "#7df39b" }}>
              ↻ Wide
            </button>
          ) : null}
          <label style={{ fontSize: 11, color: "#c9d2db", display: "flex", alignItems: "center", gap: 3 }}>
            {mobileMode ? "R:" : "Rooms:"}
            <select
              value={roomCount}
              onChange={(e) => setRoomCount(Math.min(10, Math.max(4, Number(e.target.value))))}
              style={{ background: "#161a22", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "2px 4px", fontSize: 11 }}
            >
              {[5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {backHref ? (
            <a
              href={backHref}
              style={{
                ...btnStyle,
                textDecoration: "none",
                color: "#ffd84d",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              ← Modes
            </a>
          ) : null}
        </div>
      </div>

      {/* Dismissible Auto-Rotate / Landscape tip when holding phone upright */}
      {isTouchUI && isPortrait && !rotateDismissed && !hud.loading ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(max(20px, env(safe-area-inset-bottom)) + 126px)",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(12, 16, 22, 0.86)",
            border: "1px solid rgba(125, 243, 155, 0.35)",
            borderRadius: 999,
            padding: "5px 10px 5px 12px",
            fontSize: 11,
            color: "#e6efe9",
            whiteSpace: "nowrap",
            zIndex: 12,
          }}
        >
          <span>Rotate phone or tap:</span>
          <button
            type="button"
            onClick={() => void enterLandscapeMode()}
            style={{
              background: "#6ce88a",
              color: "#071a0d",
              border: "none",
              borderRadius: 999,
              padding: "4px 9px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↻ Landscape
          </button>
          <button
            type="button"
            aria-label="Dismiss rotate hint"
            onClick={() => setRotateDismissed(true)}
            style={{
              background: "transparent",
              color: "#9fb0bf",
              border: "none",
              padding: "2px 4px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Desktop bottom controls hint (hidden when touch controls are visible) */}
      {!isTouchUI ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 18,
            transform: "translateX(-50%)",
            padding: "7px 14px",
            background: "rgba(8, 10, 14, 0.72)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            fontSize: 12,
            color: "#dce3ea",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {hud.pointerLocked
            ? "LMB Swing (click again to chain) · RMB Shield · WASD Move · Shift Run · Space Jump · V Camera · C Orbit · Esc Unlock"
            : "Click to capture the mouse · F Swing · Q / RMB Shield · WASD Move · Shift Run · Space Jump · V Camera · M Map"}
        </div>
      ) : null}

      {/* Touch Controls: Left virtual thumbstick + Right Jump / Run buttons */}
      {isTouchUI && !hud.loading ? (
        <>
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              stickPointerRef.current = {
                id: e.pointerId,
                cx: rect.left + rect.width / 2,
                cy: rect.top + rect.height / 2,
              };
              try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
              } catch {
                // Optional capture
              }
              updateStick(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (stickPointerRef.current?.id === e.pointerId) {
                e.stopPropagation();
                updateStick(e.clientX, e.clientY);
              }
            }}
            onPointerUp={(e) => {
              if (stickPointerRef.current?.id === e.pointerId) {
                e.stopPropagation();
                resetStick();
              }
            }}
            onPointerCancel={(e) => {
              if (stickPointerRef.current?.id === e.pointerId) {
                e.stopPropagation();
                resetStick();
              }
            }}
            style={{
              position: "fixed",
              left: "max(18px, env(safe-area-inset-left))",
              bottom: "max(18px, env(safe-area-inset-bottom))",
              width: 112,
              height: 112,
              borderRadius: "50%",
              background: "rgba(10, 14, 20, 0.48)",
              border: "2px solid rgba(255, 216, 77, 0.35)",
              backdropFilter: "blur(4px)",
              touchAction: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 14,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "rgba(255, 216, 77, 0.78)",
                border: "2px solid #fff3c4",
                boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
                transform: `translate3d(${stickOffset.x}px, ${stickOffset.y}px, 0)`,
                pointerEvents: "none",
              }}
            />
          </div>

          <div
            style={{
              position: "fixed",
              right: "max(18px, env(safe-area-inset-right))",
              bottom: "max(20px, env(safe-area-inset-bottom))",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 10,
              touchAction: "none",
              zIndex: 14,
            }}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                setSprintLocked((v) => !v);
              }}
              style={{
                width: 56,
                height: 42,
                borderRadius: 999,
                border: sprintLocked ? "2px solid #7df39b" : "1.5px solid rgba(255,255,255,0.28)",
                background: sprintLocked ? "rgba(108, 232, 138, 0.85)" : "rgba(12, 16, 22, 0.64)",
                color: sprintLocked ? "#071a0d" : "#e8eef5",
                fontWeight: 800,
                fontSize: 12,
                touchAction: "none",
              }}
            >
              RUN
            </button>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  touchBlockRef.current = true;
                }}
                onPointerUp={() => {
                  touchBlockRef.current = false;
                }}
                onPointerCancel={() => {
                  touchBlockRef.current = false;
                }}
                onPointerLeave={() => {
                  touchBlockRef.current = false;
                }}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  border: "2px solid rgba(160, 200, 255, 0.7)",
                  background: "rgba(14, 22, 34, 0.76)",
                  color: "#bcd8ff",
                  fontWeight: 900,
                  fontSize: 11,
                  touchAction: "none",
                }}
              >
                SHIELD
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  attackQueueRef.current = true;
                }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "2px solid rgba(255, 120, 100, 0.8)",
                  background: "rgba(40, 12, 10, 0.78)",
                  color: "#ffb4a6",
                  fontWeight: 900,
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  touchAction: "none",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
                }}
              >
                SWING
              </button>
            </div>
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                jumpQueueRef.current = true;
              }}
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                border: "2px solid rgba(255, 216, 77, 0.72)",
                background: "rgba(32, 24, 10, 0.76)",
                color: "#ffd84d",
                fontWeight: 900,
                fontSize: 13,
                letterSpacing: "0.04em",
                touchAction: "none",
                boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
              }}
            >
              JUMP
            </button>
          </div>
        </>
      ) : null}

      {/* Minimap (top-right on touch/mobile so right thumb action pad has clean space) */}
      {showMap ? (
        <div
          style={{
            position: "fixed",
            right: "max(10px, env(safe-area-inset-right))",
            top: mobileMode ? "max(10px, env(safe-area-inset-top))" : undefined,
            bottom: mobileMode ? undefined : 14,
            background: "rgba(8, 10, 14, 0.78)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 10,
            padding: mobileMode ? 5 : 8,
            pointerEvents: "none",
          }}
        >
          <canvas
            ref={minimapRef}
            width={mapPixels}
            height={mapPixels}
            style={{ width: mapPixels, height: mapPixels, display: "block" }}
          />
          <div style={{ fontSize: 10, color: "#9fb0bf", textAlign: "center", marginTop: 2 }}>
            <span style={{ color: "#ffd84d" }}>●</span> Paladin &nbsp; <span style={{ color: "#6ce88a" }}>●</span> Mobs
          </div>
        </div>
      ) : null}

      {/* Loading overlay */}
      {hud.loading ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 6, 8, 0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            letterSpacing: 0.4,
            zIndex: 20,
          }}
        >
          {hud.loading}
        </div>
      ) : null}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: "#1c222d",
  color: "#eef2f6",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 5,
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};
