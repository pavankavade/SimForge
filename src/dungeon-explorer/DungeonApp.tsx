import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { OUTPUT_HEIGHT } from "../engine/viewport";
import { buildCrypt, type CryptLamp } from "./dungeon/crypt";
import { floorAt } from "./dungeon/floors";
import { FLOOR, generateDungeon, type DungeonData, type DungeonRoom } from "./dungeon/generator";
import { buildLevel, type LevelData } from "./dungeon/level";
import { ashlar } from "./dungeon/masonry";
import { THEMES, type ThemeName } from "./dungeon/themes";
import { CELL_M, createDungeonView, type ScanSet } from "./dungeon/view";
import { createWalker } from "./dungeon/walker";
import { stallPoint } from "./dungeon/market";
import { createMarket, type Market } from "./marketView";
import * as Town from "./town/layout";
import { createTown, type Town as TownView } from "./town/townView";
import { loadTown, saveTown, withRented, withStash, type TownSave } from "./town/townSave";
import { createCloudSync, fetchCloud, loadProfile, saveProfile } from "./profile";
import { createAccount, loadAccount, saveAccount, type Account } from "./account";
import { AccountPrompt } from "./AccountPrompt";
import { PRESETS, frameStats, loadGraphics, maxDpr, saveGraphics, type FrameCap, type Graphics, type QualityPreset } from "./graphics";
import { FPS_HEIGHT, FpsCounter } from "./FpsCounter";
import { beginRun, endRun, loadTownSpot, markRunDead, runAtStart, saveTownSpot, updateRun, type RunSnapshot } from "./runSave";
import { MERCHANTS, css } from "./merchants";
import { MODULES, pieceProps, planFloor, type FloorPlan } from "./dungeon/rooms";
import { buildDressing, type FloorDressing } from "./roomView";
import { createDoors, doorwayProps, type Doors } from "./doorView";
import { rollChest, rollMobLoot, type Container } from "./loot";
import { LootScreen } from "./LootScreen";
import { renderGearIcons } from "./gearIcons";
import { STAFF_TIP_Z, dressGear, gearKey, heldBy, paladinGearKey } from "./mace";
import { BELT_SLOTS, addArrows, arrowCount, equipFromBag, grantClassKit, heldOf, loadBow, shootLoaded, loadInventory, normalizeInventory, saveInventory, spendBelt, unequipToBag, wornOf, type PlayerInv } from "./playerInv";
import { addItem, def, emptyGrid, newItem, removeItem, type Grid, type ItemInst } from "./items";
import { itemIcons } from "./icons";
import { loadModel } from "./props3d";
import { ShopScreen } from "./ShopScreen";
import { createMobSimulation, type MobAgent, type MobEvent, type PlayerView } from "./mobSim";
import { mp, useMp, type Pose, type RunView } from "./net/mp";
import { createRemotes, type Remotes } from "./net/remotes";
import { createCoop, type Coop } from "./net/coop";
import { ChatBox, InviteCards, JoinRunCard, PartyScreen, SpectateBar } from "./Social";
import { QuestScreen } from "./QuestScreen";
import { abandon as abandonQuest, accept as acceptQuest, loadQuests, record as recordQuest, saveQuests, turnIn as turnInQuest, type QuestEvent, type QuestState } from "./quests";
import { computeStats, type Stats } from "./stats";
import { loadLoadout, saveLoadout, skillById, type Loadout, type SkillId } from "./skills";
import { createHolyFx, type BoltView, type BurstKind, type HolyFx } from "./holyFx";
import { SpellBar, SpellButtons, type SpellHud } from "./spellHud";
import { SPELL, SPELL_KEYS, fitSpells, meditates, spellById, type SpellId } from "./spells";
import { createPortrait, type Portrait, type ScreenRect } from "./portrait";
import { createMonsterSfx, type MonsterSfx } from "./monsters/monsterSfx";
import { createSpellSfx, type SpellSfx, type SpellSound } from "./spellSfx";
import { arrowGeometry, bowGeometry } from "./monsters/props";
import { BOW_WOOD, bowLimbs, bowSpec, type BowShape } from "./bows";
import { POOL_SIZE, createMobBodies, type MobBodies } from "./mobBodies";
import { HealthBar } from "./HealthBar";
import { PORTAL_COUNT, PORTAL_REACH, PORTALS_FROM, RUN_SECONDS, createPortals, planPortals, type Portals } from "./portals";
import { createTraps, planTraps, type TrapHit, type Traps } from "./traps";
import {
  CharacterCustomizer,
  initialEquipment,
  initialSpec,
  saveCharacter,
  type CustomizerTab,
  type PanelLayout,
  type ShowcaseView,
} from "./CharacterCustomizer";
import { InventoryScreen, type FrameRect } from "./Inventory";
import { ItemIcon } from "./itemsUi";
import { PauseMenu } from "./PauseMenu";
import { ClassSelect } from "./ClassSelect";
import { ClassPage, LobbyChrome, LobbyView, MerchantsPage, TAB_BAR, TradePage, type LobbyTab } from "./lobby/Lobby";
import { StashScreen } from "./lobby/StashScreen";
import type { Guest } from "./lobby/stage";
import { TradeAsks, TradeWindow } from "./TradeScreen";
import { trade, useTrade } from "./net/trade";
import { classById, type ClassId } from "./classes";
import {
  createPaladin,
  createPaladinSfx,
  setClothRate,
  type ArmorEquipment,
  type ArmorSlot,
  type CombatTarget,
  type CombatWorld,
  type HumanSpec,
  type Paladin,
  type PaladinSfx,
} from "../artifacts/characters/paladin";

// A man in full plate: brisk walk, heavy run, and a slow advance behind the shield.
const WALK_CELLS = 1.5;
const RUN_CELLS = 2.7;
const BLOCK_CELLS = 0.95;

// Scratch vectors for the spells' lights (his casting hand, his ward).
const spellHand = new THREE.Vector3();
const spellWard = new THREE.Vector3();
const spellTo = new THREE.Vector3();
/** Where his spells leave from: the staff's crystal if he holds one, else his right hand (or his chest). */
function spellTip(p: Paladin | null, x: number, floorY: number, z: number): THREE.Vector3 {
  if (!p) return spellHand.set(x, floorY + 1.3, z);
  if (heldBy(p) === "staff") return p.sword.localToWorld(spellHand.set(0, 0, STAFF_TIP_Z));
  return p.rig.bone("handR").getWorldPosition(spellHand);
}
/** Is there a wall between two points (sampled every 20 cm)? */
function lineBlocked(solid: (x: number, y: number, z: number) => boolean, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) / 0.2));
  for (let k = 1; k < n; k++) {
    const u = k / n;
    if (solid(ax + (bx - ax) * u, ay + (by - ay) * u, az + (bz - az) * u)) return true;
  }
  return false;
}
/** Each spell's sound as it leaves him (spellSfx.ts), and a teammate's spell's sound by its fx. */
const CAST_SOUND: Record<SpellId, SpellSound> = {
  lesser_heal: "heal",
  bless: "bless",
  protection: "shield",
  holy_light: "holy_light",
  sanctuary: "sanctuary",
  zap: "zap",
  magic_missile: "missile",
  ice_bolt: "ice_bolt",
  fireball: "fireball",
  haste: "haste",
};
const REMOTE_SOUND: Record<string, SpellSound> = {
  light: "holy_light",
  heal: "bless",
  sanctuary: "sanctuary",
  fire: "fire_boom",
  frost: "ice_hit",
  arcane: "missile_hit",
  zap: "zap",
};
/** The wizard's Arcane Shield (a ward from his skill). */
const ARCANE_SHIELD = 40;
const ARCANE_SHIELD_S = 10;
const FOCUS_CASTS = 3;
// Scratch vectors for the bow in his hand.
const bowAim = new THREE.Vector3();
const bowNock = new THREE.Vector3();
const bowTop = new THREE.Vector3();
const bowBot = new THREE.Vector3();
const bowMid = new THREE.Vector3();
const bowDir = new THREE.Vector3();
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
/** Stretch a unit-long cylinder (along Y) between two world points: a bowstring segment. */
function stretch(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  bowDir.subVectors(b, a);
  const len = bowDir.length();
  mesh.position.copy(a).addScaledVector(bowDir, 0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, bowDir.normalize());
  mesh.scale.set(1, Math.max(1e-3, len), 1);
}
const FIRST_PERSON_FOV = 74;
const LOOK_SENS = 0.0024;
const TOUCH_LOOK_SENS = 0.0052;
const EYE_HEIGHT_CELLS = 1.04;
/** Jump: take-off speed (m/s) and gravity (m/s^2): about 0.4 m up, 0.45 s in the air. */
const JUMP_V = 3.5;
const GRAVITY = 15.5;
/** Seconds after landing before he can jump again. */
const JUMP_REST = 0.32;

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

/** How long Quick Shot speeds the draw (seconds). */
const QUICK_SHOT_S = 6;
/** Smite: how long it waits for a blow, and the holy fire it adds (before magical power). */
const SMITE_S = 10;
const SMITE_DAMAGE = 25;
/** How high his hips sit when he sits down to pray (metres; the floor is his seat). */
const PRAY_SEAT_Y = 0.22;
/** The class skill's state for the HUD: cooldown left of `total`, and seconds it still runs. */
interface SkillHud {
  cd: number;
  total: number;
  active: number;
}

const NO_SPELLS: SpellHud = { charges: {}, casting: null, castU: 0, resting: false, ward: 0, bless: 0, sanctuary: 0, haste: 0, free: 0 };

/** Where the paladin is: in town (tavern, market, gate hall) or down in a dungeon floor. */
export type Place = "town" | "dungeon";

/** What the game loop needs of his feet, in town or below (x and z in cells of CELL_M). */
interface Walker {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  speedNow: number;
  step: (dt: number, forward: number, strafe: number, speed: number, airborne?: boolean) => void;
  room: () => DungeonRoom | null;
}

type Sim = ReturnType<typeof createMobSimulation>;
type SimLike = Pick<Sim, "mobs" | "projectiles" | "puddles" | "snares" | "events" | "step" | "hit" | "shoot" | "setSnare">;
/** Town has no monsters to fight. */
const NO_SIM: SimLike = { mobs: [], projectiles: [], puddles: [], snares: [], events: [], step: () => {}, hit: () => null, shoot: () => {}, setSnare: () => {} };

/**
 * Where the camera may go (world metres): open air with `top` metres under the lid and `bottom`
 * over the floor, and the height kept inside the space it is in.
 */
interface CamSpace {
  open: (x: number, y: number, z: number, top: number, bottom: number) => boolean;
  clampY: (x: number, y: number, z: number) => number;
}

function dungeonSpace(d: DungeonData, level: LevelData): CamSpace {
  const cellOf = (x: number, z: number) => {
    const gx = x / CELL_M + d.W / 2;
    const gz = z / CELL_M + d.H / 2;
    const ix = Math.max(0, Math.min(d.W - 1, Math.floor(gx)));
    const iz = Math.max(0, Math.min(d.H - 1, Math.floor(gz)));
    return { gx, gz, c: iz * d.W + ix };
  };
  return {
    open(x, y, z, top, bottom) {
      const { gx, gz, c } = cellOf(x, z);
      if (d.grid[c] !== FLOOR) return false;
      if (level.openAt && level.openAt(gx, gz) < 0.58) return false;
      return y <= (level.heights[c] || 2.8) * CELL_M - top && y >= floorAt(d, gx, gz) * CELL_M + bottom;
    },
    clampY(x, y, z) {
      const { gx, gz, c } = cellOf(x, z);
      return Math.max(floorAt(d, gx, gz) * CELL_M + 0.35, Math.min((level.heights[c] || 2.8) * CELL_M - 0.28, y));
    },
  };
}

function townSpace(t: TownView): CamSpace {
  return { open: (x, y, z, top, bottom) => t.air(x, y, z, top, bottom), clampY: Town.clampAirY };
}

interface WorldState {
  place: Place;
  /** The dungeon floor (null in town). */
  floor: { dungeon: DungeonData; level: LevelData; lamps: CryptLamp[] } | null;
  space: CamSpace;
  /** The floor height under his feet now (cells). */
  groundAt: () => number;
  walker: Walker;
  sim: SimLike;
  playerFloor: number;
  playerJumpY: number;
  playerJumpVy: number;
  time: number;
  /** What the paladin's blade can strike: stone and the men still standing. */
  combat: CombatWorld;
  targets: CombatTarget[];
  /** The paladin's health; he falls at 0. */
  hp: number;
  maxHp: number;
  dead: boolean;
  deadT: number;
  /** Swing counter last frame (a new cut warns the shield-bearers). */
  lastSerial: number;
  /** Seconds into this floor's run (the clock stops in the Esc menu), and he got out through a portal. */
  runT: number;
  escaped: boolean;
  rand: () => number;
  /** Seconds before he can jump again (after a landing). */
  jumpRest: number;
  /** A bandage at work: hit points still to come back and how fast (per second). */
  regen: { left: number; rate: number };
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
  hp: number;
  maxHp: number;
  dead: boolean;
  /** Why he fell ("The dungeon closed on you" when the time ran out), or null. */
  deathCause: string | null;
  /** Seconds left on the run, and how many escape portals are open. */
  runLeft: number;
  portalsOpen: number;
  escaped: boolean;
  /** What E would do right now, or null. */
  interact: Interact | null;
}

/** Something within reach: a stall, a door, a chest, a fallen man; in town a room, a stash, the teleporter. */
interface Interact {
  kind: "trade" | "door" | "chest" | "corpse" | "pile" | "portal" | "rent" | "roomdoor" | "stash" | "teleport" | "tavernDoor" | "player" | "quest";
  /** Merchant index, door index or container id. */
  key: string;
  verb: string;
  label: string;
}

/** Character-screen framing the panel controls: turntable spin, framed height (m), target lift (m). */
interface Showcase {
  spin: number;
  zoom: number;
  lift: number;
}

const SHOW_ZOOM: Record<ShowcaseView, number> = { body: 2.25, face: 0.52 };
const SHOW_ZOOM_MIN = 0.42;
const SHOW_ZOOM_MAX = 2.4;

interface DungeonSceneProps {
  seed: number;
  roomCount: number;
  theme: ThemeName;
  firstPerson: boolean;
  /** Who the paladin is; a change rebuilds the body (debounced). */
  spec: HumanSpec;
  equipment: ArmorEquipment;
  /** One cut of the sword in hand (its rarity counts), or the fists' without one. */
  weaponDamage: number;
  /** His stats (class base plus gear, stats.ts): health, defences, speeds. */
  stats: Stats;
  /** The recurve bow is in hand (key 2): hold attack to draw, let go to loose. */
  bowInHand: boolean;
  /** The bow in hand (bows.ts), what a full draw's arrow does (its rarity and his power count),
   * the arrows loaded in it and those in the bag. */
  bowId: string | null;
  bowDamage: number;
  loaded: number;
  arrows: number;
  /** A loaded arrow left the string; the bow was loaded (R); he picked arrows up off the floor;
   * a reload began (its seconds); a word for the player (out of arrows). */
  onArrowShot: () => void;
  onReload: () => void;
  onArrowsPicked: (n: number) => void;
  onReloadStart: (seconds: number) => void;
  onBowHint: (text: string) => void;
  /** His class skill (skills.ts; G uses it), the ask from the touch button, and its cooldown and
   * running seconds for the HUD (sent when the whole seconds change). */
  skill: SkillId | null;
  skillAskRef: React.MutableRefObject<boolean>;
  /** The touch Reload button (R on a keyboard). */
  reloadTouchRef: React.MutableRefObject<boolean>;
  onSkillState: (s: SkillHud) => void;
  /** His memorised spells (spells.ts, already fitted to his memory), the cast asked for (the
   * spell's index; 5–9 or the touch buttons), sitting down to pray (X), and the HUD's state. */
  spells: SpellId[];
  spellAskRef: React.MutableRefObject<number>;
  restAskRef: React.MutableRefObject<boolean>;
  onSpellState: (s: SpellHud) => void;
  /** The aiming mark in the middle of the screen (shown with the bow in hand; tightens on the draw). */
  crosshairRef: React.RefObject<HTMLDivElement | null>;
  /** The inventory or character screen is open: the paladin stands still and turns to a showcase camera. */
  customizing: boolean;
  /** The game has the controls (no menu or screen open). */
  playing: boolean;
  /** The inventory is open over the game: he can still walk, run, jump and look, but not fight. */
  freeMove: boolean;
  /** Where the inventory's picture of him goes (null when it is not shown), what he wears in it,
   * and how it is turned and zoomed (dragged in the inventory). */
  portraitRect: ScreenRect | null;
  kit: ArmorEquipment;
  portraitViewRef: React.RefObject<{ spin: number; zoom: number }>;
  showcaseRef: React.RefObject<Showcase>;
  /** Where on screen the showcase frames him. */
  frame: FrameRect;
  onCharacterBusy: (busy: boolean) => void;
  /** Render the inventory icons (once) and hand them back. */
  iconsWanted: boolean;
  onIcons: (icons: Record<string, string>) => void;
  onHudUpdate: (patch: Partial<HudInfo>) => void;
  /** Bumped by Respawn: the floor is rebuilt and the paladin stands up again. */
  life: number;
  /** One nameplate element per pooled body (filled each frame). */
  platesRef: React.RefObject<Array<HTMLDivElement | null>>;
  /** The paladin took a wound (screen flash). */
  onPlayerHurt: () => void;
  /** The chests and fallen men on this floor (shared with the loot screen). */
  containersRef: React.RefObject<Map<string, Container>>;
  /** A door to open or close (set by E), and hit points to give back (a draught, an apple). */
  doorQueueRef: React.RefObject<number>;
  healQueueRef: React.RefObject<number>;
  minimapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  touchMoveRef: React.RefObject<{ forward: number; strafe: number }>;
  touchSprintRef: React.RefObject<boolean>;
  jumpQueueRef: React.RefObject<boolean>;
  attackQueueRef: React.RefObject<boolean>;
  /** Attack is held down (mouse, F or the touch button): the bow draws while it is. */
  attackHeldRef: React.RefObject<boolean>;
  /** Pieces dragged out of the inventory: dropped on the ground at his feet (a sack to search). */
  groundQueueRef: React.RefObject<ItemInst[]>;
  touchBlockRef: React.RefObject<boolean>;
  onTouchDetected: () => void;
  /** The merchant being traded with (-1: none), and where the trade panel leaves the view free. */
  trading: number;
  tradeFrame: FrameRect | null;
  /** The run clock ticks (stopped in the Esc menu and the character screen). */
  clockRunning: boolean;
  /** Set by E at an open portal: he steps through and the run ends. */
  escapeQueueRef: React.RefObject<boolean>;
  /** A floor is built and he stands on it: at the entrance (a new run), or where he was (`resumed`). */
  onFloorReady: (resumed: boolean) => void;
  /** The graphics setting, frame cap and automatic resolution (graphics.ts), and `?perf`. */
  quality: QualityPreset;
  frameCap: FrameCap;
  autoRes: boolean;
  perf: boolean;
  /** A run left open last time, to pick up on its floor (runSave.ts). */
  resume: RunSnapshot | null;
  /** In town or below; where he appears in town (the tavern at the start, the dais back from a dive). */
  place: Place;
  arrival: "tavern" | "gate";
  /** Bumped on every arrival in town (so coming back to it places him again). */
  townVisit: number;
  /** Rooms he rents upstairs, a room door to work (set by E), and the stash chest open (-1: none). */
  rentedRef: React.RefObject<boolean[]>;
  roomDoorQueueRef: React.RefObject<number>;
  /** Set by E at the tavern's front door: "out" to the square, "in" to the common room. */
  tavernDoorQueueRef: React.RefObject<"in" | "out" | null>;
  /** A bandage applied: so many hit points over so many seconds. */
  regenQueueRef: React.RefObject<{ amount: number; seconds: number } | null>;
  /** He has arrived somewhere (town or a new floor): weapons go back in their sheaths. */
  onArrive: () => void;
  stashOpenRef: React.RefObject<{ room: number; slot: number } | null>;
  /** A party's dive (net/coop.ts; null when he plays alone), the teammate the camera follows once
   * he is down (null: none), and where the other players' names are drawn. */
  coopRef: React.RefObject<Coop | null>;
  /** A teammate's sack changed (the loot screen redraws if it shows it). */
  onPileNews: React.Dispatch<React.SetStateAction<number>>;
  spectateRef: React.RefObject<string | null>;
  remoteLayerRef: React.RefObject<HTMLDivElement | null>;
  /** Something a quest may count (a monster fallen near him, an escape), and the arena's news. */
  onQuestEvent: (e: QuestEvent) => void;
  onArenaEvent: (e: ArenaEvent) => void;
}

/** The arena in town: he was knocked out (and is back up), or he knocked someone out. */
export type ArenaEvent = { type: "down"; by: string } | { type: "up" } | { type: "win"; over: string };

/** Seconds a knockout in the arena keeps him down before he is back at the gate. */
const ARENA_KO_S = 4;

/** Over-the-shoulder camera: the pivot sits this far right of his head, at about ear height. */
const SHOULDER_OFFSET = 0.52;
const SHOULDER_HEIGHT = 1.58;
/** The market's stalls in town are planned straight in world cells (no grid to centre on). */
const TOWN_ORIGIN = { W: 0, H: 0 };

/**
 * Third-person camera. The pivot is `shoulder` metres to the right of his head (over the right
 * shoulder), pulled in when a wall is closer (`sideMax` reports how far it could go, up to
 * `shoulderWant`); the camera then backs off from the pivot until it meets stone.
 */
function resolveThirdPersonCam(
  space: CamSpace,
  px: number,
  py: number,
  pz: number,
  yaw: number,
  pitch: number,
  desiredDist: number,
  shoulder = 0,
  shoulderWant = 0,
  solid?: (x: number, y: number, z: number) => boolean
): { cx: number; cy: number; cz: number; tx: number; ty: number; tz: number; sideMax: number } {
  // The view's right-hand direction (the camera looks along -(sin yaw, 0, cos yaw)).
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const headY = py + SHOULDER_HEIGHT;
  let sideMax = shoulderWant;
  for (let i = 1; i <= 8; i++) {
    const s = (shoulderWant * i) / 8 + 0.18;
    if (!space.open(px + rx * s, headY, pz + rz * s, 0.2, 0.2) || solid?.(px + rx * s, headY, pz + rz * s)) {
      sideMax = Math.max(0, (shoulderWant * (i - 1)) / 8 - 0.05);
      break;
    }
  }
  const side = Math.min(shoulder, sideMax);
  const tx = px + rx * side;
  const ty = headY;
  const tz = pz + rz * side;
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
    if (!space.open(x, y, z, 0.25, 0.35) || solid?.(x, y, z)) {
      safeDist = Math.max(0.55, (desiredDist * (i - 1)) / STEPS - 0.15);
      break;
    }
  }
  const cx = tx + dirX * safeDist;
  const cz = tz + dirZ * safeDist;
  const cy = space.clampY(cx, ty + dirY * safeDist, cz);
  return { cx, cy, cz, tx, ty, tz, sideMax };
}

const DungeonScene: React.FC<DungeonSceneProps> = ({
  seed,
  roomCount,
  theme,
  firstPerson,
  spec,
  equipment,
  weaponDamage,
  stats,
  bowInHand,
  bowId,
  bowDamage,
  loaded,
  arrows,
  onArrowShot,
  onReload,
  onArrowsPicked,
  onReloadStart,
  onBowHint,
  skill,
  skillAskRef,
  reloadTouchRef,
  onSkillState,
  spells,
  spellAskRef,
  restAskRef,
  onSpellState,
  crosshairRef,
  customizing,
  playing,
  freeMove,
  portraitRect,
  kit,
  portraitViewRef,
  showcaseRef,
  frame,
  onCharacterBusy,
  iconsWanted,
  onIcons,
  onHudUpdate,
  life,
  platesRef,
  onPlayerHurt,
  containersRef,
  doorQueueRef,
  healQueueRef,
  minimapCanvasRef,
  touchMoveRef,
  touchSprintRef,
  jumpQueueRef,
  attackQueueRef,
  attackHeldRef,
  groundQueueRef,
  touchBlockRef,
  onTouchDetected,
  trading,
  tradeFrame,
  clockRunning,
  escapeQueueRef,
  onFloorReady,
  place,
  arrival,
  townVisit,
  rentedRef,
  roomDoorQueueRef,
  stashOpenRef,
  regenQueueRef,
  onArrive,
  quality,
  frameCap,
  autoRes,
  perf,
  resume,
  coopRef,
  onPileNews,
  spectateRef,
  remoteLayerRef,
  onQuestEvent,
  onArenaEvent,
}) => {
  // The run to pick up again (runSave.ts): used by the first floor built, if it is that floor.
  const resumeRef = useRef(resume);
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;
  const townWalkerRef = useRef<Town.TownWalker | null>(null);
  const { gl, scene, camera, size } = useThree();
  const marketRef = useRef<Market | null>(null);
  // The floor's furnishings and doors, the room plan, and what E would do (as last told to the HUD).
  const dressingRef = useRef<FloorDressing | null>(null);
  const doorsRef = useRef<Doors | null>(null);
  const portalsRef = useRef<Portals | null>(null);
  const trapsRef = useRef<Traps | null>(null);
  const townRef = useRef<TownView | null>(null);
  const clockRunningRef = useRef(clockRunning);
  clockRunningRef.current = clockRunning;
  const floorReadyRef = useRef(onFloorReady);
  floorReadyRef.current = onFloorReady;
  const planRef = useRef<FloorPlan | null>(null);
  const chestIdsRef = useRef<string[]>([]);
  const interactKeyRef = useRef("");
  const tradingRef = useRef(trading);
  tradingRef.current = trading;
  const tradeFrameRef = useRef(tradeFrame);
  tradeFrameRef.current = tradeFrame;
  const offsetOnRef = useRef(false);
  const viewRef = useRef<ReturnType<typeof createDungeonView> | null>(null);
  const scansRef = useRef<{ wall: ScanSet; floor: ScanSet; plaster: ScanSet } | null>(null);
  const worldRef = useRef<WorldState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const camDistRef = useRef<number>(2.4);
  // How far over the right shoulder the camera sits now (eased; pulled in at once by a wall).
  const shoulderRef = useRef(SHOULDER_OFFSET);
  const lookPointerRef = useRef<{ id: number; x: number; y: number; touch: boolean } | null>(null);
  const lastTouchDownRef = useRef(false);
  const paladinRef = useRef<Paladin | null>(null);
  const sfxRef = useRef<PaladinSfx | null>(null);
  const monsterSfxRef = useRef<MonsterSfx | null>(null);
  const weaponDamageRef = useRef(weaponDamage);
  weaponDamageRef.current = weaponDamage;
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const skillIdRef = useRef(skill);
  skillIdRef.current = skill;
  /** The skill's cooldown and how long it still runs (seconds), and the last state sent up. */
  const skillRef = useRef({ cd: 0, total: 0, active: 0, sent: "" });
  const spellsRef = useRef(spells);
  spellsRef.current = spells;
  /** Spell charges (by spell), the cast under way, resting, and what his spells left on him. */
  const spellRef = useRef({
    charges: {} as Record<string, number>,
    cast: null as null | { id: SpellId; t: number; total: number },
    rest: { on: false, t: 0, next: 0 },
    ward: { amt: 0, t: 0 },
    bless: 0,
    sanct: null as null | { t: number; x: number; y: number; z: number; tick: number },
    /** The wizard's: Haste (seconds left), Intense Focus (free casts left), bolts in flight. */
    haste: 0,
    free: 0,
    bolts: [] as Array<{ id: SpellId; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; dmg: number }>,
    sent: "",
  });
  const holyFxRef = useRef<HolyFx | null>(null);
  /** The spells' sounds (AI-generated takes, spellSfx.ts). */
  const spellSfxRef = useRef<SpellSfx | null>(null);
  useEffect(() => {
    const fx = createHolyFx(scene);
    holyFxRef.current = fx;
    return () => {
      fx.dispose();
      holyFxRef.current = null;
    };
  }, [scene]);
  const bowNow = {
    inHand: bowInHand,
    spec: bowSpec(bowId ?? undefined),
    damage: bowDamage,
    loaded,
    arrows,
    onShot: onArrowShot,
    onReload,
    onPickup: onArrowsPicked,
    onReloadStart,
    onHint: onBowHint,
  };
  const bowRef = useRef(bowNow);
  bowRef.current = bowNow;
  /** R asked for a reload; the reload under way (seconds left, and its length). */
  const reloadAskRef = useRef(false);
  const reloadRef = useRef({ t: 0, total: 0 });
  const heldBeforeRef = useRef(false);
  /** How long the bowstring has been drawn (s); 0 when it is not. */
  const drawRef = useRef(0);
  // The recurve bow in his left hand, its string (two segments, to his right hand on the draw) and
  // the nocked arrow, placed each frame.
  const bowViewRef = useRef<{ bow: THREE.Mesh; s1: THREE.Mesh; s2: THREE.Mesh; nocked: THREE.Mesh; shape: BowShape } | null>(null);
  useEffect(() => {
    const wood = new THREE.MeshStandardMaterial({ color: BOW_WOOD.recurve, roughness: 0.55, metalness: 0 });
    const gut = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.9 });
    const shaft = new THREE.MeshStandardMaterial({ color: 0x9a7f5a, roughness: 0.75 });
    const g = bowGeometry();
    const bow = new THREE.Mesh(g.limbs, wood);
    const s1 = new THREE.Mesh(g.string, gut);
    const s2 = new THREE.Mesh(g.string, gut);
    const nocked = new THREE.Mesh(arrowGeometry(), shaft);
    for (const o of [bow, s1, s2, nocked]) {
      o.visible = false;
      o.castShadow = true;
      o.frustumCulled = false;
    }
    bow.rotation.order = "YXZ";
    scene.add(bow, s1, s2, nocked);
    bowViewRef.current = { bow, s1, s2, nocked, shape: "recurve" };
    return () => {
      scene.remove(bow, s1, s2, nocked);
      wood.dispose();
      gut.dispose();
      shaft.dispose();
      bowViewRef.current = null;
    };
  }, [scene]);
  const mouseBlockRef = useRef(false);
  const freeLookRef = useRef(0);
  const prevYawRef = useRef(0);
  const eyeRef = useRef(new THREE.Vector3());
  const bodiesRef = useRef<MobBodies | null>(null);
  const bodiesPromiseRef = useRef<Promise<MobBodies> | null>(null);
  const blockingRef = useRef(false);
  const hudTimerRef = useRef(0);
  const customizingRef = useRef(customizing);
  customizingRef.current = customizing;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const freeMoveRef = useRef(freeMove);
  freeMoveRef.current = freeMove;
  const portraitRectRef = useRef(portraitRect);
  portraitRectRef.current = portraitRect;
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const iconsDoneRef = useRef(false);
  const equipmentRef = useRef(equipment);
  equipmentRef.current = equipment;
  // The showcase camera's own state while the character screen is open.
  const showRef = useRef({
    active: false,
    yaw: 0,
    maxDist: 2,
    facing: 0,
    fov: 40,
    camPos: new THREE.Vector3(),
    camTarget: new THREE.Vector3(),
  });

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
    // The entrance market (stalls per floor; the merchants are built once, in the background).
    const market = createMarket(gl, scene);
    marketRef.current = market;
    // The town over the dungeon (built once; hidden while he is below).
    const town = createTown(gl, scene);
    town.setActive(false);
    townRef.current = town;

    return () => {
      town.dispose();
      townRef.current = null;
      market.dispose();
      marketRef.current = null;
      dressingRef.current?.dispose();
      dressingRef.current = null;
      doorsRef.current?.dispose();
      doorsRef.current = null;
      portalsRef.current?.dispose();
      portalsRef.current = null;
      trapsRef.current?.dispose();
      trapsRef.current = null;
      view.dispose();
      viewRef.current = null;
    };
  }, [gl, scene, camera]);

  // The graphics setting (graphics.ts): what the renderer draws besides the scene.
  // Each preset is one fixed object (graphics.ts PRESETS), so this runs only when the setting changes.
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  useEffect(() => {
    viewRef.current?.setQuality(quality);
    townRef.current?.setShadows(quality.shadows);
    bodiesRef.current?.setNearSkeletons(quality.nearSkeletons);
    setClothRate(quality.clothHz);
  }, [quality]);

  // The frame cap, automatic resolution and `?perf` (graphics.ts): read by the frame loop.
  const frameCapRef = useRef(frameCap);
  frameCapRef.current = frameCap;
  const autoResRef = useRef(autoRes);
  autoResRef.current = autoRes;
  const perfRef = useRef(perf);
  perfRef.current = perf;
  const setDpr = useThree((s) => s.setDpr);
  const lastFrameRef = useRef(0);
  const paceRef = useRef({ prevTick: 0, budget: 0 });
  /** Compile the scene's shaders (with the pooled monsters shown) as the frame will draw them. */
  const warmShaders = useCallback(() => {
    const tm = gl.toneMapping;
    const te = gl.toneMappingExposure;
    const cs = gl.outputColorSpace;
    if (qualityRef.current.direct) {
      gl.toneMapping = THREE.CustomToneMapping;
      gl.outputColorSpace = THREE.SRGBColorSpace;
    }
    try {
      if (bodiesRef.current) bodiesRef.current.warm(gl, scene, camera);
      else gl.compile(scene, camera);
    } catch (err) {
      console.warn("shader warm-up failed", err);
    } finally {
      gl.toneMapping = tm;
      gl.toneMappingExposure = te;
      gl.outputColorSpace = cs;
    }
  }, [gl, scene, camera]);
  // Automatic resolution: the scale on the preset's pixel ratio, and the frame-rate window it is judged on.
  const resRef = useRef({ scale: 1, frames: 0, since: 0, low: 0, high: 0 });
  useEffect(() => {
    resRef.current.scale = 1;
    setDpr(maxDpr(quality));
  }, [quality, autoRes, setDpr]);

  // Where he is, kept every few seconds and when the page is hidden (runSave.ts): his spot in town,
  // or the run below (floor, clock, health, chests and remains, the dead).
  const saveProgress = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    if (world.place === "town") {
      const w = townWalkerRef.current;
      if (w) saveTownSpot({ x: w.x * CELL_M, z: w.z * CELL_M, y: w.y, yaw: w.yaw });
      return;
    }
    if (!world.floor || world.dead || world.escaped) return;
    const pileYs: Record<string, number> = {};
    pileYRef.current.forEach((y, id) => (pileYs[id] = y));
    updateRun(
      {
        x: world.walker.x,
        z: world.walker.z,
        yaw: world.walker.yaw,
        hp: world.hp,
        deadMobs: world.sim.mobs.filter((m) => m.dead).map((m) => ({ id: m.id, x: m.wx, z: m.wz })),
        containers: [...containersRef.current.values()],
        pileYs,
      },
      Math.max(0, RUN_SECONDS - world.runT),
    );
  }, [containersRef]);
  const saveTimerRef = useRef(0);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") saveProgress();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", saveProgress);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", saveProgress);
    };
  }, [saveProgress]);

  // The playable paladin: one rigged body for both first and third person, baked from `spec`.
  // A rebuild takes about half a second, so changes wait for a short pause (slider drags), the old
  // body stays until the new one is ready, and a build that finishes after a newer one is dropped.
  const specKey = useMemo(() => JSON.stringify({ ...spec, name: "" }), [spec]);
  const specRef = useRef(spec);
  specRef.current = spec;
  const buildSerialRef = useRef(0);
  const shownSerialRef = useRef(0);
  const unmountedRef = useRef(false);
  useEffect(() => {
    const serial = ++buildSerialRef.current;
    const first = !paladinRef.current;
    onCharacterBusy(true);
    const timer = window.setTimeout(() => {
      createPaladin(gl, { character: specRef.current })
        .then((p) => {
          if (unmountedRef.current || serial < shownSerialRef.current) {
            p.dispose();
            return;
          }
          shownSerialRef.current = serial;
          p.materials.setEnvIntensity(0.45);
          const eq = equipmentRef.current;
          dressGear(p, eq);
          const old = paladinRef.current;
          if (old) {
            p.group.position.copy(old.group.position);
            p.group.rotation.copy(old.group.rotation);
            p.group.visible = old.group.visible;
            scene.remove(old.group, old.fx);
            old.dispose();
          } else {
            p.group.visible = false;
          }
          paladinRef.current = p;
          scene.add(p.group, p.fx);
          if (serial === buildSerialRef.current) onCharacterBusy(false);
        })
        .catch((err: unknown) => {
          console.error("paladin failed to load", err);
          if (serial === buildSerialRef.current) onCharacterBusy(false);
        });
    }, first ? 0 : 220);
    return () => window.clearTimeout(timer);
  }, [gl, scene, specKey, onCharacterBusy]);

  // The inventory's picture of him: a second copy on a little stage of its own (portrait.ts), built
  // the first time the inventory is opened and rebuilt when his look changes.
  const portraitRef = useRef<Portrait | null>(null);
  const portraitWanted = portraitRect !== null;
  const portraitSpecRef = useRef("");
  useEffect(() => {
    if (!portraitWanted && !portraitRef.current) return;
    if (!portraitRef.current) portraitRef.current = createPortrait(gl);
    if (portraitSpecRef.current !== specKey) {
      portraitSpecRef.current = specKey;
      portraitRef.current.setSpec(specRef.current);
    }
  }, [gl, portraitWanted, specKey]);
  useEffect(
    () => () => {
      portraitRef.current?.dispose();
      portraitRef.current = null;
    },
    [gl]
  );

  // The monsters' bodies: pools built once (see mobBodies.ts), lent to the nearest on every floor.
  // A blow reaches the fighter: a skeleton's sword, a slime's lunge, an arrow, a bolt, or acid.
  const hurtPlayerRef = useRef<(m: MobAgent, hit: { damage: number; fromX: number; fromZ: number; blockable: boolean; how: string; bounce?: () => void }) => void>(() => {});
  hurtPlayerRef.current = (m, hit) => {
    const w = worldRef.current;
    const pal = paladinRef.current;
    if (!w || w.dead) return;
    const px = w.walker.x * CELL_M;
    const pz = w.walker.z * CELL_M;
    const facing = w.walker.yaw + Math.PI;
    const tx = hit.fromX - px;
    const tz = hit.fromZ - pz;
    const front = (Math.sin(facing) * tx + Math.cos(facing) * tz) / (Math.hypot(tx, tz) || 1);
    // A raised shield toward the blow takes it: the blade glances off, the arrow or bolt breaks on it.
    if (hit.blockable && blockingRef.current && equipmentRef.current.shield && front > 0.45) {
      if (hit.how === "bolt") monsterSfxRef.current?.burst();
      else if (hit.how === "lunge") monsterSfxRef.current?.squelch(m.scale);
      sfxRef.current?.clang();
      hit.bounce?.();
      if (pal) pal.shake.value = Math.min(1, pal.shake.value + 0.25);
      return;
    }
    // Acid eats through boots and plate alike; a bolt is magic (magic resistance takes some off);
    // everything else is softened by armour.
    const st = statsRef.current;
    const armour = hit.how === "acid" ? 0 : hit.how === "bolt" ? st.magicalReduction : st.physicalReduction;
    let dmg = hit.damage * (hit.how === "acid" ? 1 : 0.9 + w.rand() * 0.2) * (1 - armour);
    // Protection's ward of light takes what it can; a blow also ends a rest.
    const sp = spellRef.current;
    sp.rest.on = false;
    if (sp.ward.amt > 0) {
      const took = Math.min(sp.ward.amt, dmg);
      sp.ward.amt -= took;
      dmg -= took;
      if (took > 0) holyFxRef.current?.burst("smite", px, w.playerFloor * CELL_M + 1.1, pz);
    }
    w.hp = Math.max(0, w.hp - dmg);
    if (hit.how === "acid") monsterSfxRef.current?.sizzle();
    else if (hit.how === "bolt") monsterSfxRef.current?.burst();
    else if (hit.how === "lunge") monsterSfxRef.current?.squelch(m.scale);
    else if (hit.how === "arrow") monsterSfxRef.current?.thock();
    if (hit.how !== "acid") sfxRef.current?.hit();
    if (pal) pal.shake.value = Math.min(1, pal.shake.value + (hit.how === "acid" ? 0.08 : 0.55));
    if (w.hp <= 0) {
      w.dead = true;
      w.deadT = 0;
    }
    onHudUpdate({ hp: w.hp, maxHp: w.maxHp, dead: w.dead });
    onPlayerHurt();
  };
  // A trap caught him: armour softens it (no shield blocks spikes from below), a log throws him back.
  const hurtByTrap = (hit: TrapHit) => {
    const w = worldRef.current;
    const pal = paladinRef.current;
    if (!w || w.dead) return;
    const dmg = hit.damage * (0.9 + w.rand() * 0.2) * (1 - statsRef.current.physicalReduction);
    w.hp = Math.max(0, w.hp - dmg);
    sfxRef.current?.hit();
    if (pal) pal.shake.value = Math.min(1, pal.shake.value + 0.5);
    if (hit.push) {
      w.walker.x = hit.push.x / CELL_M;
      w.walker.z = hit.push.z / CELL_M;
      // The dungeon walker keeps its velocity: stop it, or he runs straight back in.
      const v = w.walker as unknown as { vx?: number; vz?: number };
      if (typeof v.vx === "number") v.vx = 0;
      if (typeof v.vz === "number") v.vz = 0;
    }
    if (w.hp <= 0) {
      w.dead = true;
      w.deadT = 0;
      onHudUpdate({ hp: w.hp, maxHp: w.maxHp, dead: true, deathCause: hit.cause });
    } else onHudUpdate({ hp: w.hp, maxHp: w.maxHp, dead: false });
    onPlayerHurt();
  };
  // A handle for headless checks (scripts drive the game through it): the live floor, the paladin
  // and a way to swing.
  useEffect(() => {
    (window as unknown as { __dungeon?: unknown }).__dungeon = {
      world: () => worldRef.current,
      paladin: () => paladinRef.current,
      spells: () => spellRef.current,
      holyFx: () => holyFxRef.current,
      market: () => marketRef.current,
      plan: () => planRef.current,
      doors: () => doorsRef.current,
      portals: () => portalsRef.current,
      traps: () => trapsRef.current,
      dressing: () => dressingRef.current,
      town: () => townRef.current,
      layout: Town,
      gl,
      scene,
      camera,
      view: () => viewRef.current,
      containers: () => containersRef.current,
      loadModel,
      attack: () => {
        attackQueueRef.current = true;
      },
      // Multiplayer: the hub client, the party's dive, and the other players as drawn.
      mp,
      coop: () => coopRef.current,
      remotes: () => remotesRef.current?.views() ?? [],
      /** A wound of `damage` (acid: no armour or shield takes it). */
      hurt: (damage: number) => {
        const m = worldRef.current?.sim.mobs[0];
        if (m) hurtPlayerRef.current(m, { damage, fromX: 0, fromZ: 0, blockable: false, how: "acid" });
      },
    };
  }, [attackQueueRef, containersRef, gl, scene, camera, coopRef]);

  useEffect(() => {
    let disposed = false;
    const promise = createMobBodies(
      gl,
      scene,
      {
        solid: (x, y, z) => worldRef.current?.combat.solid?.(x, y, z) ?? false,
        onPlayerHit: (m, body) => hurtPlayerRef.current(m, { damage: m.stats.damage, fromX: m.wx, fromZ: m.wz, blockable: true, how: "blade", bounce: body.bounce }),
        onSwing: (m, swing) => {
          const w = worldRef.current;
          if (w && Math.hypot(m.wx - w.walker.x * CELL_M, m.wz - w.walker.z * CELL_M) < 7) sfxRef.current?.swing(swing);
        },
        onClang: () => sfxRef.current?.clang(),
      },
      (built, total) => {
        if (!worldRef.current) onHudUpdate({ loading: `Raising the dead... ${built} / ${total}` });
      }
    );
    bodiesPromiseRef.current = promise;
    promise
      .then((b) => {
        if (disposed) b.dispose();
        else {
          bodiesRef.current = b;
          b.setNearSkeletons(qualityRef.current.nearSkeletons);
        }
      })
      .catch((err: unknown) => console.error("mob bodies failed to load", err));
    return () => {
      disposed = true;
      bodiesRef.current?.dispose();
      bodiesRef.current = null;
    };
  }, [gl, scene, onHudUpdate]);

  // The other players online (net/remotes.ts): bodies built from what they send, named overhead.
  const remotesRef = useRef<Remotes | null>(null);
  useEffect(() => {
    const layer = remoteLayerRef.current ?? document.body;
    const r = createRemotes(gl, scene, layer);
    remotesRef.current = r;
    return () => {
      r.dispose();
      remotesRef.current = null;
    };
  }, [gl, scene, remoteLayerRef]);
  /** His pose as last sent to the hub, and where he last said he was. */
  const poseRef = useRef({ t: 0, key: "", where: "" });
  const questRef = useRef(onQuestEvent);
  questRef.current = onQuestEvent;
  const arenaRef = useRef(onArenaEvent);
  arenaRef.current = onArenaEvent;
  /** Monsters already seen fallen on this floor (a quest counts each once). */
  const fallenRef = useRef<{ floor: unknown; ids: Set<number> }>({ floor: null, ids: new Set() });
  // The arena: other players in the ring as targets for his blade (target id -> player id), the
  // blows that reached him, and a knockout under way.
  const pvpTargetsRef = useRef(new Map<number, string>());
  const pvpInRef = useRef<Array<{ from: string; dmg: number; dx: number; dz: number; ko: boolean }>>([]);
  const knockRef = useRef<{ t: number } | null>(null);
  useEffect(
    () =>
      mp.on("pvp", (m) => {
        pvpInRef.current.push({ from: String(m.from), dmg: Math.max(0, Math.min(200, Number(m.dmg) || 0)), dx: Number(m.dx) || 0, dz: Number(m.dz) || 0, ko: !!m.ko });
      }),
    []
  );

  // Armour changes swap visibility only.
  useEffect(() => {
    const p = paladinRef.current;
    if (!p) return;
    if (paladinGearKey(p) !== gearKey(equipment)) dressGear(p, equipment);
  }, [equipment]);

  useEffect(() => {
    unmountedRef.current = false;
    const sfx = createPaladinSfx();
    sfxRef.current = sfx;
    const msfx = createMonsterSfx();
    monsterSfxRef.current = msfx;
    const spsfx = createSpellSfx();
    spellSfxRef.current = spsfx;
    // Browsers only start audio after a gesture.
    const unlock = () => {
      sfx.unlock();
      msfx.unlock();
      spsfx.unlock();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      unmountedRef.current = true;
      const paladin = paladinRef.current;
      if (paladin) {
        scene.remove(paladin.group, paladin.fx);
        paladin.dispose();
      }
      sfx.dispose();
      spsfx.dispose();
      paladinRef.current = null;
      sfxRef.current = null;
      spellSfxRef.current = null;
    };
  }, [gl, scene]);

  // Input listeners (WASD/Arrows + Shift + Space + Mouse/Touch drag look + Wheel zoom + attack/block).
  useEffect(() => {
    const dom = gl.domElement;
    const onKeyDown = (e: KeyboardEvent) => {
      // Typing in the chat moves nobody.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.repeat) keysRef.current.add(e.code);
      if (!playingRef.current && !freeMoveRef.current) return;
      if (e.code === "Space" && !e.repeat) jumpQueueRef.current = true;
      if (e.code === "KeyR" && !e.repeat && playingRef.current) reloadAskRef.current = true;
      if (e.code === "KeyG" && !e.repeat && playingRef.current) skillAskRef.current = true;
      // Spells on 5–9 (in the order he memorised them), X to sit and pray.
      if (!e.repeat && playingRef.current && e.code.startsWith("Digit") && SPELL_KEYS.indexOf(e.code.slice(5)) >= 0) spellAskRef.current = SPELL_KEYS.indexOf(e.code.slice(5));
      if (e.code === "KeyX" && !e.repeat && playingRef.current) restAskRef.current = true;
      if (!playingRef.current) return;
      if (e.code === "KeyF" && !e.repeat) {
        attackQueueRef.current = true;
        attackHeldRef.current = true;
      }
    };
    // Mouse buttons: left swings (once the mouse is captured), right raises the shield.
    const onMouseDown = (e: MouseEvent) => {
      if (!playingRef.current) return;
      if (e.button === 2) mouseBlockRef.current = true;
      if (e.button === 0 && document.pointerLockElement === dom) {
        attackQueueRef.current = true;
        attackHeldRef.current = true;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) mouseBlockRef.current = false;
      if (e.button === 0) attackHeldRef.current = false;
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      if (e.code === "KeyF") attackHeldRef.current = false;
    };
    const onBlur = () => {
      keysRef.current.clear();
      lookPointerRef.current = null;
      mouseBlockRef.current = false;
      attackHeldRef.current = false;
    };
    const onClick = () => {
      if (lastTouchDownRef.current || !playingRef.current) return;
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
      // Character screen: sideways drags spin the paladin on the spot, vertical ones pan up and down.
      if (customizingRef.current) {
        const sc = showcaseRef.current;
        sc.spin += dx * (lookPointerRef.current?.touch ? 0.016 : 0.011);
        sc.lift = Math.max(-0.9, Math.min(0.9, sc.lift + dy * 0.0028 * (sc.zoom / 1.4)));
        return;
      }
      if (!playingRef.current && !freeMoveRef.current) return;
      // Hold C in third person to orbit the camera around the paladin without turning him.
      if (!firstPerson && keysRef.current.has("KeyC")) freeLookRef.current -= dx * sens;
      else world.walker.yaw -= dx * sens;
      const minPitch = firstPerson ? -1.1 : -0.35;
      const maxPitch = firstPerson ? 1.1 : 1.05;
      world.walker.pitch = Math.max(minPitch, Math.min(maxPitch, world.walker.pitch + (firstPerson ? -dy : dy) * sens));
    };
    const onWheel = (e: WheelEvent) => {
      if (customizingRef.current) {
        const sc = showcaseRef.current;
        sc.zoom = Math.max(SHOW_ZOOM_MIN, Math.min(SHOW_ZOOM_MAX, sc.zoom * Math.exp(e.deltaY * 0.0012)));
        return;
      }
      if (!playingRef.current) return;
      camDistRef.current = Math.max(1.4, Math.min(4.4, camDistRef.current + e.deltaY * 0.0025));
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
  }, [gl, firstPerson, onHudUpdate, onTouchDetected, attackQueueRef, attackHeldRef, jumpQueueRef, showcaseRef, skillAskRef, spellAskRef, restAskRef]);

  // In town: the dungeon put away, the town shown, and he stands in the tavern or on the dais.
  const placedVisitRef = useRef(-1);
  const enterTown = useCallback(() => {
    const view = viewRef.current;
    const town = townRef.current;
    if (!view || !town) return;
    placedVisitRef.current = townVisit;
    view.clearCrypt();
    view.group.visible = false;
    dressingRef.current?.dispose();
    dressingRef.current = null;
    doorsRef.current?.dispose();
    doorsRef.current = null;
    portalsRef.current?.dispose();
    portalsRef.current = null;
    trapsRef.current?.dispose();
    trapsRef.current = null;
    planRef.current = null;
    bodiesRef.current?.clear();
    containersRef.current.clear();
    chestIdsRef.current = [];
    interactKeyRef.current = "";
    town.setActive(true);
    town.setRented(rentedRef.current);
    marketRef.current?.setFloor(TOWN_ORIGIN, Town.townStalls(), CELL_M);
    // Lamplight and firelight in town: his own lantern turned down, the crypt's cold fill off.
    view.carriedLight.intensity = 0.7;
    view.hemiLight.intensity = 0.12;
    const walker = Town.createTownWalker(() => town.dynamicSolids());
    // The first time this page shows the town, he stands where he was last (runSave.ts).
    const last = townVisit === 0 && arrival === "tavern" ? loadTownSpot() : null;
    const spot = last ?? Town.SPAWN[arrival];
    walker.place(spot.x, spot.z, spot.yaw);
    if (last) walker.y = Town.groundAt(last.x, last.z, last.y + 0.4) ?? walker.y;
    townWalkerRef.current = walker;
    // The dungeon's lamp shadows are off up here; the stalls stand out on Guild Street.
    view.setShadows(false);
    marketRef.current?.setVisible(true);
    const targets: CombatTarget[] = [];
    const combat: CombatWorld = {
      targets,
      solid: (x, y, z) => town.solid(x, y, z),
      // Only in the arena are there targets: other players in the ring (the hub carries the blow).
      onHit: (id, dirX, dirZ) => {
        const to = pvpTargetsRef.current.get(id);
        if (!to) return;
        const dmg = (equipmentRef.current.sword ? weaponDamageRef.current : 6) * (0.9 + (worldRef.current?.rand() ?? 0.5) * 0.2);
        mp.pvp(to, Math.round(dmg * 10) / 10, dirX, dirZ);
        sfxRef.current?.hit();
      },
      onClang: () => sfxRef.current?.clang(),
      onSwing: (swing) => sfxRef.current?.swing(swing),
      onFootstep: () => sfxRef.current?.step(walker.speedNow > 2 ? 1 : 0),
    };
    freeLookRef.current = 0;
    prevYawRef.current = walker.yaw;
    let rs = (townVisit * 7919 + 12345) >>> 0;
    worldRef.current = {
      place: "town",
      floor: null,
      space: townSpace(town),
      groundAt: () => walker.y / CELL_M,
      walker,
      sim: NO_SIM,
      playerFloor: walker.y / CELL_M,
      playerJumpY: 0,
      playerJumpVy: 0,
      time: 0,
      combat,
      targets,
      hp: statsRef.current.maxHealth,
      maxHp: statsRef.current.maxHealth,
      dead: false,
      deadT: 0,
      lastSerial: paladinRef.current ? paladinRef.current.animator.swingSerial : 0,
      rand: () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296,
      runT: 0,
      escaped: false,
      jumpRest: 0,
      regen: { left: 0, rate: 0 },
    };
    paladinRef.current?.reset();
    arriveRef.current();
    onHudUpdate({
      loading: null,
      name: "The Wayfarer's Rest",
      rooms: 0,
      mobs: 0,
      roomLabel: Town.areaName(spot.x, spot.z, walker.y),
      hp: statsRef.current.maxHealth,
      maxHp: statsRef.current.maxHealth,
      dead: false,
      deathCause: null,
      runLeft: RUN_SECONDS,
      portalsOpen: 0,
      escaped: false,
      interact: null,
    });
  }, [townVisit, arrival, onHudUpdate, containersRef, rentedRef]);

  // The town as soon as he is in it (once per visit; menu changes to the next dive don't move him).
  useEffect(() => {
    if (place !== "town" || placedVisitRef.current === townVisit) return;
    enterTown();
  }, [place, townVisit, enterTown]);

  // Build a dungeon floor when he goes down (and again when seed, rooms or theme change below).
  useEffect(() => {
    if (place !== "dungeon") return;
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
      // Where he will stand: the room plan keeps its pieces clear of it.
      const probe = createWalker(dungeon);
      probe.start();
      // Every room past the entrance gets a theme and its furnishings, the corridors clutter and
      // chests (rooms.ts); solid before the crypt is built.
      const plan = planFloor(dungeon, { x: probe.x + dungeon.W / 2, z: probe.z + dungeon.H / 2 });
      for (const p of pieceProps(dungeon, plan.pieces)) dungeon.props.push(p);
      // A fire pit burns: an ember lamp in it, lit and shadowed like the crypt's own.
      for (const p of plan.pieces) if (p.kind === "guardFire") dungeon.props.push({ kind: "ember", x: p.x - 0.5, y: p.z - 0.5, rot: 0, scale: 1, roomId: p.room });
      planRef.current = plan;
      // The stone round every door is solid (the passage is clear either side of it).
      for (const p of doorwayProps(dungeon, CELL_M)) dungeon.props.push(p);
      const level = buildLevel(dungeon);
      view.setLevel(dungeon, level);

      onHudUpdate({ loading: "Raising vaults & paving flagstones..." });
      await new Promise((r) => setTimeout(r, 10));
      if (cancelled) return;

      const lamps = buildCrypt(view, dungeon, level);
      // Down here there is no market (the stalls are in town), and the town is put away.
      marketRef.current?.setFloor(dungeon, [], CELL_M);
      townRef.current?.setActive(false);
      placedVisitRef.current = -1;
      view.group.visible = true;
      view.carriedLight.intensity = 2.8;
      view.setShadows(true);
      marketRef.current?.setVisible(true);
      view.hemiLight.intensity = 0.65;
      dressingRef.current?.dispose();
      doorsRef.current?.dispose();
      dressingRef.current = buildDressing(scene, dungeon, plan.pieces, CELL_M);
      doorsRef.current = createDoors(scene, dungeon, CELL_M, view.materials.dressed);
      // What every chest holds (deeper rooms and treasuries roll richer); the last floor's are gone.
      const containers = containersRef.current;
      containers.clear();
      // The same chests on every life of this floor (dying is not a reroll).
      let ls = (Math.imul(seed, 2654435761) + 17) >>> 0;
      const lootRand = () => (ls = (Math.imul(ls, 1664525) + 1013904223) >>> 0) / 4294967296;
      chestIdsRef.current = dressingRef.current.chests.map((c, i) => {
        const room = c.piece.room >= 0 ? dungeon.rooms[c.piece.room] : null;
        const treasury = room ? plan.modules[room.id] === "treasury" : false;
        const tier = treasury ? 3 : room ? Math.round(room.difficulty * 2.4) : 1;
        const id = `chest-${i}`;
        containers.set(id, { id, kind: "chest", name: treasury ? "Treasure chest" : "Chest", x: c.centre.x, z: c.centre.z, grid: rollChest(lootRand, tier), seen: false });
        return id;
      });
      interactKeyRef.current = "";
      const walker = createWalker(dungeon);
      walker.start();
      const playerFloor = floorAt(dungeon, walker.x + dungeon.W / 2, walker.z + dungeon.H / 2);
      const solidAt = (x: number, y: number, z: number): boolean => {
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
      };
      const sim = createMobSimulation(dungeon, walker.x * CELL_M, walker.z * CELL_M, solidAt);
      coopRef.current?.built(sim);
      // A teammate's sacks: dropped, added to or picked from, they lie here as they do there.
      coopRef.current?.onPile((p) => {
        const c = containers.get(p.id);
        if (c) c.grid = p.grid;
        else containers.set(p.id, { id: p.id, kind: "pile", name: "Dropped sack", x: p.x, z: p.z, y: p.y, grid: p.grid, seen: true });
        pileYRef.current.set(p.id, p.y);
        onPileNews((n) => n + 1);
      });
      // The way out: five portals at random places, opening from minute two (portals.ts).
      let ps = (Math.imul(seed ^ 0x51ed27, 2246822519) + Math.imul(life, 362437) + 99) >>> 0;
      const portalRand = () => (ps = (Math.imul(ps, 1664525) + 1013904223) >>> 0) / 4294967296;
      portalsRef.current?.dispose();
      portalsRef.current = createPortals(scene, dungeon, CELL_M, planPortals(dungeon, portalRand, { x: walker.x + dungeon.W / 2, z: walker.z + dungeon.H / 2 }));
      // Five traps in the corridors (traps.ts), from the seed alone: the same ones every life (lava
      // channels on molten floors, acid elsewhere).
      let ts = (Math.imul(seed ^ 0x2c1b3c6d, 2654435761) + 7) >>> 0;
      const trapRand = () => (ts = (Math.imul(ts, 1664525) + 1013904223) >>> 0) / 4294967296;
      trapsRef.current?.dispose();
      trapsRef.current = createTraps(scene, dungeon, CELL_M, planTraps(dungeon, plan.pieces, { x: walker.x + dungeon.W / 2, z: walker.z + dungeon.H / 2 }, trapRand), { lava: theme === "molten" });

      // The men need their bodies before the floor opens.
      if (!bodiesRef.current && bodiesPromiseRef.current) {
        onHudUpdate({ loading: "Raising the dead..." });
        await bodiesPromiseRef.current.catch(() => null);
        if (cancelled) return;
      }
      bodiesRef.current?.clear();
      let rs = (seed * 9301 + 49297 + life * 7919) >>> 0;
      const rand = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296;
      const targets: CombatTarget[] = [];
      const combat: CombatWorld = {
        targets,
        solid: solidAt,
        onHit: (id, dirX, dirZ) => {
          // The sword's cut at its rarity (fists without it), less the monster's armour (mobSim.hit).
          const m = sim.mobs.find((o) => o.id === id);
          // Bless hits harder; the undead take more from Undead Slaying, and a readied Smite adds holy fire.
          const undead = m?.family === "skeleton";
          const st = statsRef.current;
          let dmg = (equipmentRef.current.sword ? weaponDamageRef.current : 6) * (0.9 + rand() * 0.2) * (spellRef.current.bless > 0 ? 1 + SPELL.blessDamage : 1);
          const sk = skillRef.current;
          if (skillIdRef.current === "smite" && sk.active > 0 && m && !m.dead) {
            sk.active = 0;
            dmg += SMITE_DAMAGE * (1 + st.magicalBonus) * (undead ? SPELL.undeadTimes : 1);
            holyFxRef.current?.burst("smite", m.wx, m.wy + 1, m.wz);
            spellSfxRef.current?.play("smite");
          }
          if (undead) dmg *= 1 + st.undeadBonus;
          // In a party the authority's floor takes the blow (net/coop.ts); this copy only sounds it.
          const co = coopRef.current;
          let r: ReturnType<typeof sim.hit>;
          if (co && !co.leads()) {
            co.sendHit(id, dirX, dirZ, dmg);
            r = !m || m.dead ? null : m.blockT > 0 && m.equipment.shield ? "blocked" : "hit";
          } else r = sim.hit(id, dirX, dirZ, dmg);
          const ms = monsterSfxRef.current;
          if (r === "blocked") {
            sfxRef.current?.clang();
            paladinRef.current?.animator.bounce();
          } else if (r && m) {
            // Bone cracks and rattles; jelly squelches.
            if (m.family === "slime") ms?.squelch(m.scale);
            else ms?.boneHit();
            if (r === "killed" && m.family === "skeleton") ms?.collapse();
            if (r === "killed" && m.family === "slime") ms?.squelch(m.scale * 1.6);
          }
        },
        onClang: () => sfxRef.current?.clang(),
        onSwing: (swing) => sfxRef.current?.swing(swing),
        onFootstep: () => sfxRef.current?.step(walker.speedNow > 2 ? 1 : 0),
      };
      freeLookRef.current = 0;
      prevYawRef.current = walker.yaw;
      const world: WorldState = {
        place: "dungeon",
        floor: { dungeon, level, lamps },
        space: dungeonSpace(dungeon, level),
        groundAt: () => floorAt(dungeon, walker.x + dungeon.W / 2, walker.z + dungeon.H / 2),
        walker,
        sim,
        playerFloor,
        playerJumpY: 0,
        playerJumpVy: 0,
        time: 0,
        combat,
        targets,
        hp: statsRef.current.maxHealth,
        maxHp: statsRef.current.maxHealth,
        dead: false,
        deadT: 0,
        lastSerial: paladinRef.current ? paladinRef.current.animator.swingSerial : 0,
        rand,
        runT: 0,
        escaped: false,
        jumpRest: 0,
        regen: { left: 0, rate: 0 },
      };
      // Coming back to a run left open (runSave.ts): the same floor, the clock where it is now, and
      // him, the chests, the remains and the dead as they were at the last save.
      worldRef.current = world;
      // (A party's dive is never picked up again on its own.)
      const r = coopRef.current ? null : resumeRef.current;
      resumeRef.current = null;
      const resumed = !!r && r.seed === seed && r.rooms === roomCount && r.theme === theme && r.life === life;
      if (r && resumed) {
        world.runT = Math.min(RUN_SECONDS, Math.max(0, RUN_SECONDS - (r.endsAt - Date.now()) / 1000));
        const at = r.at;
        if (at) {
          walker.x = at.x;
          walker.z = at.z;
          walker.yaw = at.yaw;
          walker.bodyYaw = at.yaw + Math.PI;
          world.playerFloor = floorAt(dungeon, walker.x + dungeon.W / 2, walker.z + dungeon.H / 2);
          world.hp = Math.max(1, Math.min(world.maxHp, at.hp));
          containers.clear();
          for (const c of at.containers) containers.set(c.id, c);
          for (const id of Object.keys(at.pileYs)) {
            pileYRef.current.set(id, at.pileYs[id]);
            pileSerialRef.current = Math.max(pileSerialRef.current, Number(id.replace("pile-", "")) || 0);
          }
          for (const d of at.deadMobs) {
            const m = sim.mobs.find((o) => o.id === d.id);
            if (!m) continue;
            m.dead = true;
            m.hp = 0;
            m.deadT = 10;
            m.hostile = false;
            m.wx = d.x;
            m.wz = d.z;
            m.cx = d.x / CELL_M + dungeon.W / 2;
            m.cz = d.z / CELL_M + dungeon.H / 2;
          }
        }
      }
      // Build every shader the floor and the monsters need now, behind the loading screen, rather
      // than with a stall the first time each comes into view.
      onHudUpdate({ loading: "Preparing shaders..." });
      await new Promise((r) => setTimeout(r, 10));
      if (cancelled) return;
      warmShaders();
      arriveRef.current();
      // Stand him up fresh (pose, cloth) after a respawn, a new floor or a resumed run.
      paladinRef.current?.reset();
      onHudUpdate({
        loading: null,
        name: dungeon.name,
        rooms: dungeon.rooms.length,
        mobs: sim.mobs.length,
        roomLabel: "Entrance",
        hp: world.hp,
        maxHp: world.maxHp,
        dead: false,
        deathCause: null,
        runLeft: Math.max(0, Math.ceil(RUN_SECONDS - world.runT)),
        portalsOpen: 0,
        escaped: false,
        interact: null,
      });
      floorReadyRef.current(resumed);
    };

    run().catch((err) => {
      console.error(err);
      if (!cancelled) onHudUpdate({ loading: `Error: ${err?.message ?? String(err)}` });
    });

    return () => {
      cancelled = true;
    };
  }, [place, seed, roomCount, theme, life, onHudUpdate, scene, containersRef, warmShaders, coopRef, onPileNews]);

  // What he drops on the ground lies in a sack at his feet (a container to search with E): pieces
  // dropped close together share one sack; an emptied sack is gone.
  const pileMeshesRef = useRef(new Map<string, THREE.Object3D>());
  const pileSerialRef = useRef(0);
  const sackRef = useRef<{ geo: THREE.BufferGeometry; tie: THREE.BufferGeometry; mat: THREE.Material; rope: THREE.Material } | null>(null);
  useEffect(() => {
    const body = new THREE.SphereGeometry(0.2, 18, 12);
    body.scale(1, 0.72, 1);
    body.translate(0, 0.13, 0);
    const neck = new THREE.CylinderGeometry(0.05, 0.08, 0.12, 12);
    neck.translate(0, 0.3, 0);
    const tie = new THREE.TorusGeometry(0.055, 0.012, 6, 16).rotateX(Math.PI / 2).translate(0, 0.27, 0);
    sackRef.current = {
      geo: mergeGeometries([body, neck]) ?? body,
      tie,
      mat: new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.95 }),
      rope: new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 }),
    };
    const meshes = pileMeshesRef.current;
    return () => {
      meshes.forEach((m) => scene.remove(m));
      meshes.clear();
      const s = sackRef.current;
      if (s) {
        s.geo.dispose();
        s.tie.dispose();
        s.mat.dispose();
        s.rope.dispose();
      }
      sackRef.current = null;
    };
  }, [scene]);
  const dropToGround = (facing: number, px: number, py: number, pz: number) => {
    const queue = groundQueueRef.current;
    const containers = containersRef.current;
    const coop = coopRef.current;
    const changed = new Set<Container>();
    while (queue.length) {
      const item = queue.shift() as ItemInst;
      const x = px + Math.sin(facing) * 0.7;
      const z = pz + Math.cos(facing) * 0.7;
      let pile: Container | null = null;
      containers.forEach((c) => {
        if (!pile && c.kind === "pile" && Math.hypot(c.x - x, c.z - z) < 1.2) pile = c;
      });
      const into = pile as Container | null;
      const g = into ? addItem(into.grid, item) : null;
      if (into && g) {
        into.grid = g;
        changed.add(into);
      } else {
        // In a party the id carries his own, so two players' sacks never share one.
        const id = `pile-${coop ? `${mp.state.me ?? ""}-` : ""}${++pileSerialRef.current}`;
        const grid = addItem(emptyGrid(8, 6), item) ?? emptyGrid(8, 6);
        const box: Container = { id, kind: "pile", name: "Dropped sack", x, z, y: py, grid, seen: true };
        containers.set(id, box);
        pileYRef.current.set(id, py);
        changed.add(box);
      }
    }
    // The others in his party see what he dropped.
    if (coop) changed.forEach((c) => coop.sendPile({ id: c.id, x: c.x, y: c.y ?? pileYRef.current.get(c.id) ?? 0, z: c.z, grid: c.grid }));
    // The sacks on the ground: one per pile with something in it.
    const sack = sackRef.current;
    if (!sack) return;
    const meshes = pileMeshesRef.current;
    containers.forEach((c) => {
      if (c.kind !== "pile") return;
      let m = meshes.get(c.id);
      if (!m) {
        const g = new THREE.Group();
        const b = new THREE.Mesh(sack.geo, sack.mat);
        const t = new THREE.Mesh(sack.tie, sack.rope);
        b.castShadow = true;
        g.add(b, t);
        g.position.set(c.x, pileYRef.current.get(c.id) ?? 0, c.z);
        g.rotation.y = (c.x * 7.3 + c.z * 3.1) % (Math.PI * 2);
        scene.add(g);
        meshes.set(c.id, g);
        m = g;
      }
      m.visible = c.grid.items.length > 0;
    });
    meshes.forEach((m, id) => {
      if (!containers.has(id)) {
        scene.remove(m);
        meshes.delete(id);
      }
    });
  };
  const pileYRef = useRef(new Map<string, number>());

  /** What the monsters did to (or near) the fighter this step: blows land, bows twang, slimes plop. */
  const handleMobEvents = (events: MobEvent[], px: number, pz: number) => {
    const ms = monsterSfxRef.current;
    const near = (x: number, z: number, r: number) => Math.hypot(x - px, z - pz) < r;
    for (const e of events) {
      if (e.type === "hit") hurtPlayerRef.current(e.mob, e);
      else if (e.type === "loose") {
        if (near(e.mob.wx, e.mob.wz, 16)) {
          if (e.projectile === "arrow") ms?.twang();
          else ms?.cast();
        }
      } else if (e.type === "impact") {
        if (near(e.projectile.x, e.projectile.z, 14)) {
          if (e.projectile.kind === "arrow") ms?.thock();
          else ms?.burst();
        }
      } else if (e.type === "hop") {
        if (near(e.mob.wx, e.mob.wz, 9)) ms?.plop(e.mob.scale);
      } else if (e.type === "split") ms?.squelch(2.2);
      else if (e.type === "snared") {
        if (near(e.snare.x, e.snare.z, 18)) sfxRef.current?.clang();
      }
      else if (e.type === "struck") {
        // His arrow found a monster: a shield takes it, bone cracks, jelly squelches.
        if (e.result === "blocked") sfxRef.current?.clang();
        else if (e.mob.family === "slime") ms?.squelch(e.mob.scale * (e.result === "killed" ? 1.6 : 1));
        else {
          ms?.boneHit();
          if (e.result === "killed") ms?.collapse();
        }
      }
    }
  };

  useFrame(() => {
    const view = viewRef.current;
    const world = worldRef.current;
    if (!view || !world) return;

    // The frame cap: a budget of real time, spent one frame interval at a time, so a 100 cap gives
    // about 100 frames on a 120 Hz screen too (five drawn in six) and skipped ticks draw nothing.
    const now = performance.now();
    const pace = paceRef.current;
    const tick = pace.prevTick ? now - pace.prevTick : 1000 / 60;
    pace.prevTick = now;
    const interval = 1000 / frameCapRef.current;
    pace.budget = Math.min(pace.budget + tick, interval * 2);
    if (pace.budget < interval - 0.5) return;
    pace.budget = Math.max(0, pace.budget - interval);
    const elapsed = lastFrameRef.current ? (now - lastFrameRef.current) / 1000 : 1 / 60;
    lastFrameRef.current = now;
    frameStats.frames++;
    if (perfRef.current) {
      gl.info.autoReset = false;
      gl.info.reset();
    }
    // Real time down to 12 frames a second (below that the game slows rather than lurches).
    const dt = Math.min(elapsed, 1 / 12);
    world.time += dt;
    const { walker, sim, space } = world;
    const fl = world.floor;
    const town = world.place === "town" ? townRef.current : null;
    // A party's dive (net/coop.ts), and the teammate the camera follows once he is down.
    const coop = fl ? coopRef.current : null;
    const watching = world.dead && coop && spectateRef.current ? (remotesRef.current?.view(spectateRef.current) ?? null) : null;
    const persp = camera as THREE.PerspectiveCamera;
    const show = showRef.current;
    const sc = showcaseRef.current;
    if (customizingRef.current && !show.active) {
      // Open the character screen: find the most open direction around the paladin (preferring
      // in front of him) for the camera, and glide there from wherever the camera is now.
      const front = walker.yaw + Math.PI;
      const fx = walker.x * CELL_M;
      const fz = walker.z * CELL_M;
      let best = front;
      let bestDist = 1;
      let bestScore = -Infinity;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const c = resolveThirdPersonCam(space, fx, world.playerFloor * CELL_M, fz, front + a, 0.05, 4.4);
        const dist = Math.hypot(c.cx - fx, c.cz - fz);
        const score = Math.min(dist, 3.6) + 0.7 * Math.cos(a);
        if (score > bestScore) {
          bestScore = score;
          best = front + a;
          bestDist = dist;
        }
      }
      show.active = true;
      show.yaw = best;
      show.maxDist = Math.max(0.9, bestDist - 0.15);
      show.facing = front;
      show.fov = persp.fov;
      show.camPos.copy(persp.position);
      persp.getWorldDirection(show.camTarget).multiplyScalar(2).add(persp.position);
      sc.spin = 0;
      sc.lift = 0;
      if (document.pointerLockElement) document.exitPointerLock?.();
      keysRef.current.clear();
      mouseBlockRef.current = false;
    } else if (!customizingRef.current && show.active) {
      // Back to the game facing the way he was turned, with the camera behind him.
      show.active = false;
      walker.yaw = show.facing - Math.PI;
      prevYawRef.current = walker.yaw;
      freeLookRef.current = 0;
      persp.clearViewOffset();
    }
    const keys = keysRef.current;
    // In a menu or screen, or once he has fallen, the paladin stops listening (held keys are dropped).
    if (world.dead) world.deadT += dt;
    // E at an open portal: he steps through and the run is over (he keeps what he carries).
    if (escapeQueueRef.current) {
      escapeQueueRef.current = false;
      if (!world.dead && !world.escaped) {
        world.escaped = true;
        onHudUpdate({ escaped: true, interact: null });
      }
    }
    // The run clock; at ten minutes the dungeon takes whoever is still inside.
    if (fl && (clockRunningRef.current || coop) && !world.dead && !world.escaped) {
      // A party shares one clock (the hub's, from the moment the leader took them down) and it
      // never stops for one of them in a menu.
      if (coop) world.runT = Math.max(world.runT, Math.min(RUN_SECONDS, (mp.serverNow() - coop.run.startAt) / 1000));
      else world.runT += dt;
      if (world.runT >= RUN_SECONDS) {
        world.runT = RUN_SECONDS;
        world.hp = 0;
        world.dead = true;
        world.deadT = 0;
        onHudUpdate({ hp: 0, dead: true, deathCause: "The dungeon closed on you", runLeft: 0 });
      }
    }
    // With the inventory open he still walks and looks about (it is drawn over the live game).
    const active = (playingRef.current || freeMoveRef.current) && !world.dead && !world.escaped;
    const fighting = active && playingRef.current;
    if (!active) keys.clear();
    const kbForward =
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const kbStrafe =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const tMove = touchMoveRef.current;
    const still = active ? 1 : 0;
    const forward = Math.max(-1, Math.min(1, kbForward + tMove.forward)) * still;
    const strafe = Math.max(-1, Math.min(1, kbStrafe + tMove.strafe)) * still;
    const stickMag = Math.hypot(tMove.forward, tMove.strafe);
    const sprinting =
      keys.has("ShiftLeft") || keys.has("ShiftRight") || touchSprintRef.current || stickMag > 0.88;
    const paladin = paladinRef.current;
    const blocking = active && equipmentRef.current.shield && (mouseBlockRef.current || keys.has("KeyQ") || touchBlockRef.current);
    blockingRef.current = blocking;
    if (!active) {
      attackQueueRef.current = false;
      jumpQueueRef.current = false;
    }
    const swinging = paladin !== null && paladin.animator.state !== "none";
    const speed =
      (blocking ? BLOCK_CELLS : sprinting && drawRef.current <= 0 ? RUN_CELLS : WALK_CELLS) *
      (swinging ? 0.72 : 1) *
      (drawRef.current > 0 ? 0.55 : reloadRef.current.t > 0 ? 0.75 : 1) *
      (spellRef.current.cast ? 0.5 : 1) *
      (1 + statsRef.current.moveSpeed + (spellRef.current.bless > 0 ? SPELL.blessMove : 0) + (spellRef.current.haste > 0 ? SPELL.hasteMove : 0));

    // A jump needs his feet on the ground, a moment since the last landing, and no shield up or swing under way.
    world.jumpRest = Math.max(0, world.jumpRest - dt);
    const grounded = world.playerJumpY <= 0.001 && world.playerJumpVy === 0;
    if (jumpQueueRef.current) {
      jumpQueueRef.current = false;
      if (grounded && world.jumpRest <= 0 && !blocking && !swinging) world.playerJumpVy = JUMP_V;
    }

    const x0 = walker.x;
    const z0 = walker.z;
    // In the air he keeps the way he was going (only a little steering).
    walker.step(dt, forward, strafe, speed, !grounded || world.playerJumpVy > 0);
    // Monsters are solid: the fighter is eased out of anything standing in his way.
    for (const m of sim.mobs) {
      if (m.dead) continue;
      const dx = walker.x * CELL_M - m.wx;
      const dz = walker.z * CELL_M - m.wz;
      const dd = Math.hypot(dx, dz);
      const gap = Math.max(0.62, m.radius + 0.32);
      if (dd < gap && dd > 1e-4) {
        walker.x += ((dx / dd) * (gap - dd)) / CELL_M;
        walker.z += ((dz / dd) * (gap - dd)) / CELL_M;
      }
    }
    // So are the other players (a little, so nobody gets stuck in a doorway).
    for (const o of remotesRef.current?.views() ?? []) {
      if (o.dead || o.escaped || Math.abs(o.y - o.air - world.playerFloor * CELL_M) > 1) continue;
      const dx = walker.x * CELL_M - o.x;
      const dz = walker.z * CELL_M - o.z;
      const dd = Math.hypot(dx, dz);
      if (dd < 0.62 && dd > 1e-4) {
        walker.x += ((dx / dd) * (0.62 - dd) * 0.5) / CELL_M;
        walker.z += ((dz / dd) * (0.62 - dd) * 0.5) / CELL_M;
      }
    }
    // So are the townsfolk.
    if (town) {
      for (const n of town.npcSpots()) {
        const dx = walker.x * CELL_M - n.x;
        const dz = walker.z * CELL_M - n.z;
        const dd = Math.hypot(dx, dz);
        if (dd < 0.6 && dd > 1e-4 && world.playerFloor * CELL_M < 1) {
          walker.x += ((dx / dd) * (0.6 - dd)) / CELL_M;
          walker.z += ((dz / dd) * (0.6 - dd)) / CELL_M;
        }
      }
    }
    // Shut doors stop him.
    if (doorsRef.current) {
      const at = { x: walker.x * CELL_M, z: walker.z * CELL_M };
      doorsRef.current.block(at, { x: x0 * CELL_M, z: z0 * CELL_M }, 0.36);
      walker.x = at.x / CELL_M;
      walker.z = at.z / CELL_M;
    }

    // Smooth vertical stair/basin height + jump arc.
    const targetFloor = world.groundAt();
    world.playerFloor += (targetFloor - world.playerFloor) * (1 - Math.exp(-dt * 12));
    if (world.playerJumpY > 0 || world.playerJumpVy !== 0) {
      world.playerJumpY += world.playerJumpVy * dt;
      world.playerJumpVy -= GRAVITY * dt;
      if (world.playerJumpY <= 0) {
        // Landing: the plate comes down hard (a jolt and a heavy step), then a moment to recover.
        const impact = -world.playerJumpVy;
        world.playerJumpY = 0;
        world.playerJumpVy = 0;
        world.jumpRest = JUMP_REST;
        if (impact > 2.5) {
          const pal = paladinRef.current;
          if (pal) pal.shake.value = Math.min(1, pal.shake.value + 0.12);
          sfxRef.current?.step(1);
        }
      }
    }

    // The corridor traps (traps.ts): they keep moving when he is down; only the living are caught.
    const traps = fl ? trapsRef.current : null;
    if (traps) {
      const hits = traps.update(
        dt,
        // A party sees the same blades and logs: their clock is the run's.
        coop ? (mp.serverNow() - coop.run.startAt) / 1000 + 600 : world.time,
        { x: walker.x * CELL_M, z: walker.z * CELL_M, prevX: x0 * CELL_M, prevZ: z0 * CELL_M, air: world.playerJumpY, alive: !world.dead && !world.escaped },
        monsterSfxRef.current,
      );
      for (const h of hits) hurtByTrap(h);
    }

    const px = walker.x * CELL_M;
    const py = world.playerFloor * CELL_M + world.playerJumpY;
    const pz = walker.z * CELL_M;

    // Step the men first so the blade tests against where they are now (the living only).
    const serial = paladin ? paladin.animator.swingSerial : 0;
    const swingStarted = serial !== world.lastSerial;
    world.lastSerial = serial;
    const full = fl ? (sim as Sim) : null;
    if (coop && full && !coop.leads()) {
      // A teammate's copy of the floor: the authority's monsters, eased into place.
      full.mirror(dt);
      coop.follow(full);
    } else {
      // The party on this floor, as the monsters see them (the authority's game runs them for all).
      const ids: string[] = [];
      const others: PlayerView[] = [];
      if (coop) {
        for (const id of coop.mates()) {
          const v = remotesRef.current?.view(id);
          if (!v) continue;
          ids.push(id);
          // A teammate whose game is paused (window hidden) is left alone until he is back.
          others.push({ wx: v.x, wy: v.y, wz: v.z, swinging: v.swinging, swingStarted: v.swingStarted, dead: v.dead || v.escaped || coop.isAway(id) });
        }
      }
      // The monsters in two half steps on a slow frame (so a long step never carries one through a wall).
      const simSteps = dt > 0.04 ? 2 : 1;
      for (let k = 0; k < simSteps; k++) {
        sim.step(
          dt / simSteps,
          {
            wx: px,
            wy: py,
            wz: pz,
            swinging: paladin !== null && (paladin.animator.state === "windup" || paladin.animator.state === "strike"),
            swingStarted: swingStarted && k === 0,
            dead: world.dead || world.escaped,
          },
          others,
        );
        // Blows on the others are theirs to take (their shields and armour count in their games).
        for (const e of sim.events) {
          if (e.type === "hit" && e.who > 0) coop?.sendHurt(ids[e.who - 1], { mob: e.mob.id, dmg: e.damage, fx: e.fromX, fz: e.fromZ, bl: e.blockable, how: e.how });
        }
        handleMobEvents(coop ? sim.events.filter((e) => e.type !== "hit" || e.who === 0) : sim.events, px, pz);
      }
      if (coop && full) {
        const ms = monsterSfxRef.current;
        coop.lead(
          dt,
          full,
          others.filter((o) => !o.dead).map((o) => ({ x: o.wx, z: o.wz })),
          (m, r) => {
            if (Math.hypot(m.wx - px, m.wz - pz) > 14) return;
            if (r === "blocked") sfxRef.current?.clang();
            else if (m.family === "slime") ms?.squelch(m.scale);
            else ms?.boneHit();
          },
        );
      }
    }
    // Blows the authority says landed on him (his shield and armour still count here).
    if (coop) {
      for (const h of coop.takeHurts()) {
        const m = sim.mobs.find((o) => o.id === h.mob) ?? sim.mobs[0];
        if (m) hurtPlayerRef.current(m, { damage: h.dmg, fromX: h.fx, fromZ: h.fz, blockable: h.bl, how: h.how });
      }
    }
    dropToGround(world.walker.yaw + Math.PI, px, world.playerFloor * CELL_M, pz);
    // Quests: a monster that falls near him counts (his party's kills too); those already down
    // when the floor came up (a resumed run) do not.
    if (fl) {
      const fallen = fallenRef.current;
      if (fallen.floor !== fl) {
        fallen.floor = fl;
        fallen.ids = new Set(sim.mobs.filter((m) => m.dead).map((m) => m.id));
      }
      for (const m of sim.mobs) {
        if (!m.dead || fallen.ids.has(m.id)) continue;
        fallen.ids.add(m.id);
        if (!world.dead && Math.hypot(m.wx - px, m.wz - pz) < 18) questRef.current({ type: "kill", family: m.family === "slime" ? "slime" : "skeleton", elite: m.elite, boss: !!m.kind.boss });
      }
    }
    // The arena (town): players in the ring are his blade's targets while he is in it too; blows
    // that reached him land (his shield and armour count); a knockout lays him down a moment and
    // stands him up at the gate, with nothing lost.
    if (town) {
      const inRing = Town.inArena(px, pz) && !world.dead;
      const tmap = pvpTargetsRef.current;
      tmap.clear();
      world.targets.length = 0;
      if (inRing) {
        let n = 9000;
        for (const o of remotesRef.current?.views() ?? []) {
          if (o.dead || !Town.inArena(o.x, o.z)) continue;
          tmap.set(++n, o.id);
          world.targets.push({ id: n, x: o.x, y: o.y - o.air, z: o.z, radius: 0.4, height: 1.8 });
        }
      }
      for (const h of pvpInRef.current.splice(0)) {
        if (h.ko) {
          arenaRef.current({ type: "win", over: h.from });
          continue;
        }
        if (!inRing || world.dead) continue;
        const facing = world.walker.yaw + Math.PI;
        const front = -(Math.sin(facing) * h.dx + Math.cos(facing) * h.dz) / (Math.hypot(h.dx, h.dz) || 1);
        if (blockingRef.current && equipmentRef.current.shield && front > 0.45) {
          sfxRef.current?.clang();
          if (paladin) paladin.shake.value = Math.min(1, paladin.shake.value + 0.25);
          continue;
        }
        world.hp = Math.max(0, world.hp - h.dmg * (1 - statsRef.current.physicalReduction));
        sfxRef.current?.hit();
        if (paladin) paladin.shake.value = Math.min(1, paladin.shake.value + 0.5);
        onPlayerHurt();
        if (world.hp <= 0) {
          world.dead = true;
          world.deadT = 0;
          knockRef.current = { t: 0 };
          mp.pvp(h.from, 0, 0, 0, true);
          arenaRef.current({ type: "down", by: h.from });
        }
        onHudUpdate({ hp: Math.round(world.hp) });
      }
      const ko = knockRef.current;
      if (ko) {
        ko.t += dt;
        if (ko.t >= ARENA_KO_S) {
          knockRef.current = null;
          world.dead = false;
          world.hp = world.maxHp;
          const spot = Town.SPAWN.arena;
          townWalkerRef.current?.place(spot.x, spot.z, spot.yaw);
          world.playerFloor = 0;
          world.playerJumpY = 0;
          world.playerJumpVy = 0;
          prevYawRef.current = spot.yaw;
          paladinRef.current?.reset();
          onHudUpdate({ hp: world.hp, maxHp: world.maxHp });
          arenaRef.current({ type: "up" });
        }
      } else if (!Town.inArena(px, pz) && world.hp < world.maxHp && !world.dead) {
        // Out of the ring he gets his breath back quickly.
        world.hp = Math.min(world.maxHp, world.hp + world.maxHp * 0.2 * dt);
        if (Math.floor(world.hp) % 5 === 0 || world.hp >= world.maxHp) onHudUpdate({ hp: Math.round(world.hp) });
      }
    }
    // A fallen monster leaves its crystal and what it carried, to search with E like a chest.
    for (const m of sim.mobs) {
      const id = `corpse-${m.id}`;
      if (!m.dead || containersRef.current.has(id)) continue;
      const grid = rollMobLoot(world.rand, m);
      const name = m.family === "slime" ? `${m.name} remains` : `${m.name} bones`;
      containersRef.current.set(id, { id, kind: "corpse", name, x: m.wx, z: m.wz, grid, seen: grid.items.length === 0 });
    }
    if (fl) {
      world.targets.length = 0;
      for (const m of sim.mobs) if (!m.dead) world.targets.push({ id: m.id, x: m.wx, y: m.wy, z: m.wz, radius: m.radius + 0.04, height: m.height });
    }

    // The paladin always squares up to where the camera aims; the gait is driven by the
    // distance actually covered (after wall collision), in his own frame.
    if (show.active) {
      // Turntable: ease toward the showcase camera plus the player's spin.
      let d = show.yaw + sc.spin - show.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      show.facing += d * (1 - Math.exp(-dt * 12));
    }
    const fp = firstPerson && !show.active;
    if (paladin) {
      const facing = show.active ? show.facing : walker.yaw + Math.PI;
      const vx = dt > 0 ? ((walker.x - x0) * CELL_M) / dt : 0;
      const vz = dt > 0 ? ((walker.z - z0) * CELL_M) / dt : 0;
      const sinF = Math.sin(facing);
      const cosF = Math.cos(facing);
      paladin.group.visible = !world.escaped;
      // Fallen: over backwards onto the floor (eased in, like gravity).
      const fall = world.dead ? Math.min(1, world.deadT / 0.55) : 0;
      paladin.group.position.set(px, py + 0.17 * fall * fall, pz);
      paladin.group.rotation.order = "YXZ";
      paladin.group.rotation.y = facing;
      paladin.group.rotation.x = -(Math.PI / 2) * fall * fall;
      paladin.setFirstPerson(fp);
      // Action speed quickens his swings (the rest of the body keeps its pace).
      paladin.update(
        paladin.animator.state !== "none" ? dt * (1 + statsRef.current.actionSpeed + (spellRef.current.haste > 0 ? SPELL.hasteAction : 0)) : dt,
        {
          moveX: vx * cosF - vz * sinF,
          moveZ: vx * sinF + vz * cosF,
          aimPitch: show.active ? 0 : fp ? walker.pitch : -walker.pitch * 0.45,
          turnRate: !show.active && dt > 0 ? (walker.yaw - prevYawRef.current) / dt : 0,
          air: world.playerJumpY,
          block: blocking,
          attack: fighting && attackQueueRef.current && !bowRef.current.inHand,
          firstPerson: fp,
          // Nothing drawn: off-duty arms in third person (first person keeps the bare fists up in view).
          // The bow hangs in the left hand until it is drawn.
          relaxed: world.dead || (!fp && !show.active && !equipmentRef.current.sword && !equipmentRef.current.shield && drawRef.current <= 0),
          arms:
            !world.dead && !show.active && spellRef.current.cast
              ? "cast"
              : !world.dead && !show.active && spellRef.current.rest.on
                ? "knees"
                : !world.dead && !show.active && drawRef.current > 0
                  ? "bow"
                  : !world.dead && reloadRef.current.t > 0
                    ? "hold"
                    : undefined,
          // Praying for his spells: down on the floor.
          stance: !world.dead && !show.active && spellRef.current.rest.on ? "sit" : undefined,
          seatY: PRAY_SEAT_Y,
          gripL: bowRef.current.inHand && !show.active ? "sword" : undefined,
        },
        world.playerFloor * CELL_M,
        world.combat
      );
    }
    attackQueueRef.current = false;
    prevYawRef.current = walker.yaw;

    // The class skill (skills.ts, G or the touch button): Quick Shot speeds the draw for a while,
    // a snare goes down at his feet, Second Wind heals over a few seconds. Down here only.
    {
      const sk = skillRef.current;
      const asked = skillAskRef.current;
      skillAskRef.current = false;
      const sd = skillById(skillIdRef.current);
      sk.cd = Math.max(0, sk.cd - dt);
      sk.active = Math.max(0, sk.active - dt);
      if (asked && sd) {
        if (world.place !== "dungeon" || world.dead || world.escaped) bowRef.current.onHint("Skills are for the dungeon.");
        else if (sk.cd > 0) bowRef.current.onHint(`${sd.name} is ready again in ${Math.ceil(sk.cd)} s.`);
        else {
          sk.total = sd.cooldown * (1 - statsRef.current.cooldownReduction);
          sk.cd = sk.total;
          if (sd.id === "quick_shot") {
            sk.active = QUICK_SHOT_S;
            monsterSfxRef.current?.thock();
          } else if (sd.id === "snare") {
            const at = { x: walker.x * CELL_M, y: world.playerFloor * CELL_M, z: walker.z * CELL_M };
            // In a party the leader's floor springs it; this copy shows it.
            if (coop && !coop.leads()) coop.sendSnare(at);
            sim.setSnare(at.x, at.y, at.z);
            sfxRef.current?.clang();
          } else if (sd.id === "second_wind") {
            regenQueueRef.current = { amount: world.maxHp / 3, seconds: 8 };
            sk.active = 8;
          } else if (sd.id === "smite") {
            // Waits for his next blow (combat.onHit spends it).
            sk.active = SMITE_S;
            holyFxRef.current?.burst("bless", px, world.playerFloor * CELL_M, pz);
            spellSfxRef.current?.play("bless");
          } else if (sd.id === "prayer") {
            const sp = spellRef.current;
            for (const id of spellsRef.current) sp.charges[id] = Math.min(spellById(id)?.charges ?? 0, (sp.charges[id] ?? 0) + 1);
            holyFxRef.current?.burst("heal", px, world.playerFloor * CELL_M, pz);
            spellSfxRef.current?.play("heal");
            bowRef.current.onHint("Your prayer is heard: a charge back on every spell.");
          } else if (sd.id === "arcane_shield") {
            spellRef.current.ward = { amt: ARCANE_SHIELD, t: ARCANE_SHIELD_S };
            holyFxRef.current?.burst("arcane", px, world.playerFloor * CELL_M + 1, pz);
            spellSfxRef.current?.play("shield");
          } else if (sd.id === "intense_focus") {
            spellRef.current.free = FOCUS_CASTS;
            holyFxRef.current?.burst("arcane", px, world.playerFloor * CELL_M + 1, pz);
            spellSfxRef.current?.play("focus");
            bowRef.current.onHint("Intense Focus: your next three spells cost no charges.");
          }
        }
      }
      const sent = `${Math.ceil(sk.cd)}|${Math.ceil(sk.active)}`;
      if (sent !== sk.sent) {
        sk.sent = sent;
        onSkillState({ cd: sk.cd, total: sk.total, active: sk.active });
      }
    }

    // Spells (spells.ts; casters only): 5–9 cast the memorised ones from their charges, slowly and
    // on foot at half pace; X sits him down to pray the charges back (and a little health). Up in
    // town every charge is full again. Down here only.
    {
      const sp = spellRef.current;
      const list = spellsRef.current;
      const st = statsRef.current;
      const fx = holyFxRef.current;
      const ssfx = spellSfxRef.current;
      const ask = spellAskRef.current;
      spellAskRef.current = -1;
      const restAsk = restAskRef.current;
      restAskRef.current = false;
      const full = (id: SpellId) => spellById(id)?.charges ?? 0;
      const floorY = world.playerFloor * CELL_M;
      // The wizard meditates where the cleric prays (the same rest).
      const rest = meditates(list) ? { verb: "meditate", ing: "You sit down and meditate" } : { verb: "pray", ing: "You sit down and pray" };
      // A spell striking a monster (from where it came: fromX/fromZ, else from him). Ice freezes it
      // where it stands (on the floor that runs the monsters: in a party, the leader's).
      const strike = (m: (typeof sim.mobs)[number], dmg: number, how: "zap" | "arcane" | "ice" | "fire", fromX = px, fromZ = pz) => {
        const far = Math.hypot(m.wx - fromX, m.wz - fromZ) || 1;
        const dirX = (m.wx - fromX) / far;
        const dirZ = (m.wz - fromZ) / far;
        let r: ReturnType<typeof sim.hit> = "hit";
        if (coop && !coop.leads()) coop.sendHit(m.id, dirX, dirZ, dmg);
        else {
          r = sim.hit(m.id, dirX, dirZ, dmg);
          if (how === "ice" && r === "hit") {
            m.stun = Math.max(m.stun, SPELL.iceFreezeS);
            m.kx = m.kz = 0;
          }
        }
        const ms = monsterSfxRef.current;
        if (m.family === "slime") ms?.squelch(m.scale);
        else ms?.boneHit();
        if (r === "killed" && m.family === "skeleton") ms?.collapse();
      };
      const heal = (amount: number, radius: number) => {
        const amt = amount * (1 + st.healBonus);
        healQueueRef.current += amt;
        // Teammates near enough get it too (their own games add it).
        if (coop) {
          for (const o of remotesRef.current?.views() ?? []) {
            if (o.dead || o.escaped || Math.abs(o.y - o.air - floorY) > 1.2 || Math.hypot(o.x - px, o.z - pz) > radius) continue;
            coop.sendHeal(o.id, amt);
            fx?.burst("heal", o.x, o.y - o.air, o.z);
          }
        }
      };
      if (world.place !== "dungeon" || world.dead || world.escaped) {
        for (const id of list) sp.charges[id] = full(id);
        if (sp.cast) ssfx?.stopCharge();
        sp.cast = null;
        sp.rest.on = false;
        sp.bolts.length = 0;
        if (world.place !== "dungeon") {
          sp.ward.amt = 0;
          sp.bless = 0;
          sp.sanct = null;
          sp.haste = 0;
          sp.free = 0;
        }
        if (ask >= 0 && ask < list.length && !world.dead) bowRef.current.onHint("Spells are for the dungeon.");
      } else if (list.length) {
        for (const id of list) if (sp.charges[id] === undefined) sp.charges[id] = full(id);
        sp.bless = Math.max(0, sp.bless - dt);
        sp.haste = Math.max(0, sp.haste - dt);
        sp.ward.t = Math.max(0, sp.ward.t - dt);
        if (sp.ward.t <= 0) sp.ward.amt = 0;
        // X: sit down to pray (or get up). Moving, jumping, a swing, the shield or a blow gets him up.
        if (restAsk) {
          if (sp.rest.on) sp.rest.on = false;
          else if (sp.cast || !grounded || swinging || drawRef.current > 0) bowRef.current.onHint(`Stand still to sit and ${rest.verb}.`);
          else {
            sp.rest = { on: true, t: 0, next: SPELL.restFirst };
            bowRef.current.onHint(`${rest.ing}: your spells come back one charge at a time. Move to get up.`);
          }
        }
        if (sp.rest.on && (forward !== 0 || strafe !== 0 || attackQueueRef.current || world.playerJumpVy > 0 || blocking)) sp.rest.on = false;
        if (sp.rest.on) {
          sp.rest.t += dt;
          if (world.hp < world.maxHp) {
            world.hp = Math.min(world.maxHp, world.hp + SPELL.restHps * dt);
            if (Math.floor(world.hp) !== Math.floor(world.hp - SPELL.restHps * dt)) onHudUpdate({ hp: Math.round(world.hp) });
          }
          if (sp.rest.t >= sp.rest.next) {
            sp.rest.next += SPELL.restEach / (1 + Math.max(-0.5, st.castingSpeed));
            // One charge to the emptiest spell (by share), in key order on a tie.
            let best: SpellId | null = null;
            let share = 1;
            for (const id of list) {
              const k = (sp.charges[id] ?? 0) / Math.max(1, full(id));
              if (k < share) {
                share = k;
                best = id;
              }
            }
            if (best) {
              sp.charges[best] = Math.min(full(best), (sp.charges[best] ?? 0) + 1);
              fx?.burst("bless", px, floorY, pz);
              ssfx?.play("rest_charge", 0.7);
            }
          }
        }
        // A cast asked for.
        if (ask >= 0) {
          const id = list[ask];
          const s = id ? spellById(id) : null;
          if (!s || !id) {
            // No spell on that key.
          } else if (sp.cast) bowRef.current.onHint("You are already casting.");
          else if ((sp.charges[id] ?? 0) <= 0 && sp.free <= 0) bowRef.current.onHint(`${s.name} has no charges left. Sit and ${rest.verb} (X) to get them back.`);
          else if (drawRef.current > 0 || swinging || blocking || !fighting) bowRef.current.onHint("Lower your guard to cast.");
          else {
            sp.rest.on = false;
            sp.cast = { id, t: 0, total: s.cast / (1 + Math.max(-0.5, st.castingSpeed)) };
            ssfx?.charge();
          }
        }
        if (sp.cast) {
          sp.cast.t += dt;
          if (sp.cast.t >= sp.cast.total) {
            const id = sp.cast.id;
            sp.cast = null;
            ssfx?.stopCharge();
            ssfx?.play(CAST_SOUND[id]);
            if (sp.free > 0) sp.free--;
            else sp.charges[id] = Math.max(0, (sp.charges[id] ?? 0) - 1);
            const sd = spellById(id);
            const power = (1 + st.magicalBonus) * (1 + st.spellBonus);
            const tip = spellTip(paladin, px, floorY, pz);
            const sinF = Math.sin(walker.yaw + Math.PI);
            const cosF = Math.cos(walker.yaw + Math.PI);
            if (id === "lesser_heal") {
              heal(SPELL.healAmount * (1 + st.magicalBonus), SPELL.healRadiusM);
              fx?.burst("heal", px, floorY, pz);
            } else if (id === "bless") {
              sp.bless = SPELL.blessS;
              fx?.burst("bless", px, floorY, pz);
            } else if (id === "protection") {
              sp.ward = { amt: SPELL.wardAmount, t: SPELL.wardS };
              fx?.burst("bless", px, floorY, pz);
            } else if (id === "holy_light") {
              // A burst ahead of him at chest height: everything in it is struck (the undead twice over).
              const cx = px + sinF * SPELL.lightReachM;
              const cz = pz + cosF * SPELL.lightReachM;
              const ms = monsterSfxRef.current;
              for (const m of sim.mobs) {
                if (m.dead || Math.abs(m.wy - floorY) > 1.5) continue;
                const d = Math.hypot(m.wx - cx, m.wz - cz);
                if (d > SPELL.lightRadiusM + m.radius * 0.5) continue;
                const undead = m.family === "skeleton";
                const dmg = SPELL.lightDamage * (1 + st.magicalBonus) * (undead ? SPELL.undeadTimes * (1 + st.undeadBonus) : 1);
                const far = Math.hypot(m.wx - px, m.wz - pz) || 1;
                let r: ReturnType<typeof sim.hit> = "hit";
                if (coop && !coop.leads()) coop.sendHit(m.id, (m.wx - px) / far, (m.wz - pz) / far, dmg);
                else r = sim.hit(m.id, (m.wx - px) / far, (m.wz - pz) / far, dmg);
                if (m.family === "slime") ms?.squelch(m.scale);
                else ms?.boneHit();
                if (r === "killed" && undead) ms?.collapse();
              }
              fx?.burst("light", cx, floorY + 1.1, cz);
              coop?.sendSpellFx("light", { x: cx, y: floorY + 1.1, z: cz });
            } else if (id === "zap") {
              // Lightning to the nearest monster in front of him (a cone ahead, on his floor).
              let best: (typeof sim.mobs)[number] | null = null;
              let bestD = SPELL.zapReachM;
              for (const m of sim.mobs) {
                if (m.dead || Math.abs(m.wy - floorY) > 1.5) continue;
                const dx = m.wx - px;
                const dz = m.wz - pz;
                const d = Math.hypot(dx, dz);
                if (d > bestD || (d > 0.8 && (dx * sinF + dz * cosF) / d < 0.55)) continue;
                if (world.combat.solid && lineBlocked(world.combat.solid, tip.x, tip.y, tip.z, m.wx, m.wy + m.height * 0.6, m.wz)) continue;
                best = m;
                bestD = d;
              }
              const to = best ? spellTo.set(best.wx, best.wy + best.height * 0.6, best.wz) : spellTo.set(px + sinF * 3, floorY + 1.2, pz + cosF * 3);
              fx?.zap(tip, to);
              fx?.burst("zap", to.x, to.y, to.z);
              coop?.sendSpellFx("zap", to);
              if (best) strike(best, SPELL.zapDamage * power, "zap");
            } else if (id === "haste") {
              sp.haste = SPELL.hasteS;
              fx?.burst("bless", px, floorY, pz);
              coop?.sendSpellFx("heal", { x: px, y: floorY, z: pz });
            } else if (sd?.bolt) {
              // A bolt from the staff to where he aims (the crosshair: march along the view until a
              // wall or a monster), or straight ahead at chest height.
              const e = persp.matrixWorld.elements;
              const fl = Math.hypot(e[8], e[9], e[10]) || 1;
              let tx = persp.position.x;
              let ty = persp.position.y;
              let tz = persp.position.z;
              for (let k = 0; k < 160; k++) {
                tx -= (e[8] / fl) * 0.25;
                ty -= (e[9] / fl) * 0.25;
                tz -= (e[10] / fl) * 0.25;
                if (k > 4 && world.combat.solid?.(tx, ty, tz)) break;
                if (k > 4 && sim.mobs.some((m) => !m.dead && Math.hypot(tx - m.wx, tz - m.wz) < m.radius && ty > m.wy && ty < m.wy + m.height)) break;
              }
              let dx = tx - tip.x;
              let dy = ty - tip.y;
              let dz = tz - tip.z;
              // Aimed behind him (the camera swung round): straight ahead instead, down to chest height
              // six metres on.
              if (dx * sinF + dz * cosF < 0.5) {
                dx = sinF * 6;
                dy = floorY + 1.1 - tip.y;
                dz = cosF * 6;
              }
              let dl = Math.hypot(dx, dy, dz) || 1;
              // A little help: the monster nearest the way he aims (within ~12° on the floor plan, in
              // sight) draws the bolt onto its middle, whatever the height of the view.
              const ah = Math.hypot(dx, dz) || 1;
              const hx = dx / ah;
              const hz = dz / ah;
              let bestK = Math.cos(0.21);
              for (const m of sim.mobs) {
                if (m.dead || Math.abs(m.wy - floorY) > 2.5) continue;
                const mx = m.wx - tip.x;
                const mz = m.wz - tip.z;
                const mh = Math.hypot(mx, mz) || 1;
                if (mh > 26 || mh < 0.3) continue;
                const k = (mx * hx + mz * hz) / mh;
                const my = m.wy + m.height * 0.5 - tip.y;
                if (k <= bestK || (world.combat.solid && lineBlocked(world.combat.solid, tip.x, tip.y, tip.z, m.wx, m.wy + m.height * 0.5, m.wz))) continue;
                bestK = k;
                dx = mx;
                dy = my;
                dz = mz;
                dl = Math.hypot(mx, my, mz);
              }
              const dmg = (id === "magic_missile" ? SPELL.missileDamage : id === "ice_bolt" ? SPELL.iceDamage : SPELL.fireDamage * (1 + st.fireBonus)) * power;
              sp.bolts.push({ id, x: tip.x, y: tip.y, z: tip.z, vx: (dx / dl) * sd.bolt, vy: (dy / dl) * sd.bolt, vz: (dz / dl) * sd.bolt, life: SPELL.boltLifeS, dmg });
              if (sp.bolts.length > 12) sp.bolts.shift();
            } else if (id === "sanctuary") {
              sp.sanct = { t: SPELL.sanctuaryS, x: px, y: floorY, z: pz, tick: 0 };
              coop?.sendSpellFx("sanctuary", { x: px, y: floorY, z: pz });
            }
            if (id === "lesser_heal" || id === "bless" || id === "protection") coop?.sendSpellFx("heal", { x: px, y: floorY, z: pz });
          }
        }
        // The wizard's bolts fly on; each stops at the first wall or monster in its way.
        for (let i = sp.bolts.length - 1; i >= 0; i--) {
          const b = sp.bolts[i];
          b.life -= dt;
          const speed = Math.hypot(b.vx, b.vy, b.vz) || 1;
          const steps = Math.max(1, Math.ceil((speed * dt) / 0.15));
          let hitAt: null | { wall: boolean; mob: (typeof sim.mobs)[number] | null } = null;
          for (let k = 0; k < steps && !hitAt; k++) {
            b.x += (b.vx * dt) / steps;
            b.y += (b.vy * dt) / steps;
            b.z += (b.vz * dt) / steps;
            if (world.combat.solid?.(b.x, b.y, b.z)) hitAt = { wall: true, mob: null };
            else {
              const m = sim.mobs.find((o) => !o.dead && Math.hypot(b.x - o.wx, b.z - o.wz) < o.radius + 0.12 && b.y > o.wy - 0.1 && b.y < o.wy + o.height + 0.1);
              if (m) hitAt = { wall: false, mob: m };
            }
          }
          if (!hitAt && b.life > 0) continue;
          sp.bolts.splice(i, 1);
          const kind: BurstKind = b.id === "fireball" ? "fire" : b.id === "ice_bolt" ? "frost" : "arcane";
          fx?.burst(kind, b.x, b.y, b.z);
          coop?.sendSpellFx(kind, { x: b.x, y: b.y, z: b.z });
          if (b.id === "fireball") {
            // It bursts: everything near is burnt, less toward the edge.
            const r = SPELL.fireRadiusM + (st.fireBonus > 0 ? 1 : 0);
            for (const m of sim.mobs) {
              if (m.dead || Math.abs(m.wy - (b.y - 1)) > 2) continue;
              const d = Math.hypot(m.wx - b.x, m.wz - b.z);
              if (d > r + m.radius * 0.5) continue;
              strike(m, b.dmg * (1 - 0.5 * Math.min(1, d / r)), "fire", b.x, b.z);
            }
            ssfx?.play("fire_boom");
            if (paladin) paladin.shake.value = Math.min(1, paladin.shake.value + 0.2);
          } else if (hitAt?.mob) {
            strike(hitAt.mob, b.dmg, b.id === "ice_bolt" ? "ice" : "arcane", b.x - b.vx, b.z - b.vz);
            ssfx?.play(b.id === "ice_bolt" ? "ice_hit" : "missile_hit");
          } else ssfx?.play(b.id === "ice_bolt" ? "ice_hit" : "missile_hit", 0.7);
        }
        // Holy ground: every second, health to all standing in it.
        if (sp.sanct) {
          const h = sp.sanct;
          h.t -= dt;
          h.tick += dt;
          if (h.tick >= 1) {
            h.tick -= 1;
            const inside = Math.hypot(px - h.x, pz - h.z) <= SPELL.sanctuaryRadiusM && Math.abs(floorY - h.y) < 1;
            if (inside) healQueueRef.current += SPELL.sanctuaryHps * (1 + st.healBonus);
            if (coop) {
              for (const o of remotesRef.current?.views() ?? []) {
                if (o.dead || o.escaped || Math.abs(o.y - o.air - h.y) > 1.2 || Math.hypot(o.x - h.x, o.z - h.z) > SPELL.sanctuaryRadiusM) continue;
                coop.sendHeal(o.id, SPELL.sanctuaryHps * (1 + st.healBonus));
              }
            }
          }
          if (h.t <= 0) sp.sanct = null;
        }
      }
      // Healing his teammates' spells sent him, and their spells' light.
      if (coop) {
        const got = coop.takeHeals();
        if (got > 0 && !world.dead) {
          healQueueRef.current += got;
          fx?.burst("heal", px, floorY, pz);
        }
        for (const f of coop.takeSpellFx()) {
          if (f.spell === "light") fx?.burst("light", f.x, f.y, f.z);
          else if (f.spell === "heal") fx?.burst("bless", f.x, f.y, f.z);
          else if (f.spell === "sanctuary") fx?.burst("heal", f.x, f.y, f.z);
          else if (f.spell === "fire" || f.spell === "frost" || f.spell === "arcane" || f.spell === "zap") fx?.burst(f.spell, f.x, f.y, f.z);
          // A teammate's spell is heard more softly the farther off it is.
          const near = Math.max(0, 1 - Math.hypot(f.x - px, f.z - pz) / 25);
          const heard = REMOTE_SOUND[f.spell];
          if (heard && near > 0) ssfx?.play(heard, 0.7 * near);
        }
      }
      // What it looks like: the glow in his hand as he casts, the ward about him, holy ground.
      if (fx) {
        const hand = paladin && sp.cast ? spellTip(paladin, px, world.playerFloor * CELL_M, pz) : null;
        const s = sp.cast ? spellById(sp.cast.id) : null;
        fx.update(
          dt,
          hand && s && sp.cast ? { at: hand, u: Math.min(1, sp.cast.t / sp.cast.total), color: s.color } : null,
          sp.ward.amt > 0 ? spellWard.set(px, py + 0.95, pz) : null,
          Math.min(1, sp.ward.amt / SPELL.wardAmount),
          sp.sanct ? { x: sp.sanct.x, y: sp.sanct.y, z: sp.sanct.z, r: SPELL.sanctuaryRadiusM, left: sp.sanct.t } : null,
          sp.bolts.map((b): BoltView => ({ x: b.x, y: b.y, z: b.z, color: b.id === "fireball" ? 0xff8a2a : b.id === "ice_bolt" ? 0x9fe6ff : 0xc79bff, size: b.id === "fireball" ? 0.7 : 0.42 }))
        );
      }
      const castU = sp.cast ? Math.min(1, sp.cast.t / sp.cast.total) : 0;
      const sent = `${list.map((id) => sp.charges[id] ?? 0).join(",")}|${sp.cast?.id ?? ""}|${Math.round(castU * 12)}|${sp.rest.on}|${Math.ceil(sp.ward.amt)}|${Math.ceil(sp.bless)}|${Math.ceil(sp.sanct?.t ?? 0)}|${Math.ceil(sp.haste)}|${sp.free}`;
      if (sent !== sp.sent) {
        sp.sent = sent;
        onSpellState({ charges: { ...sp.charges }, casting: sp.cast?.id ?? null, castU, resting: sp.rest.on, ward: sp.ward.amt, bless: sp.bless, sanctuary: sp.sanct?.t ?? 0, haste: sp.haste, free: sp.free });
      }
    }

    // The bow: hold to draw (slower on his feet, the view narrowing), let go to loose. Each bow draws
    // at its own pace and holds a few arrows loaded (R reloads it from the bag); a fuller draw flies
    // faster and hits harder, and the arrow drops on its way (aim high for a long shot). The arrow
    // leaves toward where the middle of the screen points.
    {
      const bow = bowRef.current;
      const spec = bow.spec;
      const ready = bow.inHand && !!spec && world.place === "dungeon" && fighting && !world.dead && !show.active && paladin !== null;
      const rl = reloadRef.current;
      if (reloadTouchRef.current) {
        reloadTouchRef.current = false;
        reloadAskRef.current = true;
      }
      // R: load the bow (not while drawing; not when it is full or the bag has no arrows).
      if (reloadAskRef.current) {
        reloadAskRef.current = false;
        if (ready && spec && rl.t <= 0 && drawRef.current <= 0) {
          if (bow.loaded >= spec.capacity) bow.onHint("The bow is fully loaded.");
          else if (bow.arrows <= 0) bow.onHint("No arrows in your bag to load.");
          else {
            rl.total = spec.reload / (1 + Math.max(-0.5, statsRef.current.actionSpeed) + statsRef.current.reloadSpeed);
            rl.t = rl.total;
            bow.onReloadStart(rl.total);
            monsterSfxRef.current?.thock();
          }
        }
      }
      if (rl.t > 0) {
        rl.t -= dt;
        if (!ready) rl.t = 0;
        else if (rl.t <= 0) {
          rl.t = 0;
          bow.onReload();
        }
      }
      const canDraw = ready && rl.t <= 0 && bow.loaded > 0;
      const pressed = attackHeldRef.current && !heldBeforeRef.current;
      heldBeforeRef.current = attackHeldRef.current;
      if (ready && pressed && bow.loaded <= 0 && rl.t <= 0) bow.onHint(bow.arrows > 0 ? "Out of loaded arrows: press R to reload." : "No arrows left.");
      const quick = skillIdRef.current === "quick_shot" && skillRef.current.active > 0 ? 3 : 1;
      if (canDraw && attackHeldRef.current) drawRef.current = Math.min(3, drawRef.current + dt * (1 + statsRef.current.actionSpeed + statsRef.current.drawSpeed + (spellRef.current.haste > 0 ? SPELL.hasteAction : 0)) * quick);
      else if (drawRef.current > 0) {
        if (canDraw && spec && !attackHeldRef.current && drawRef.current >= 0.12 && paladin) {
          const power = Math.max(0.15, Math.min(1, drawRef.current / spec.drawTime));
          // Where the eye looks: march along the view until a wall or a monster.
          const e = persp.matrixWorld.elements;
          const fx = -e[8];
          const fy = -e[9];
          const fz = -e[10];
          const fl = Math.hypot(fx, fy, fz) || 1;
          let tx = persp.position.x;
          let ty = persp.position.y;
          let tz = persp.position.z;
          for (let k = 0; k < 320; k++) {
            tx += (fx / fl) * 0.25;
            ty += (fy / fl) * 0.25;
            tz += (fz / fl) * 0.25;
            if (k > 4 && world.combat.solid?.(tx, ty, tz)) break;
            if (k > 4 && sim.mobs.some((m) => !m.dead && Math.hypot(tx - m.wx, tz - m.wz) < m.radius && ty > m.wy && ty < m.wy + m.height)) break;
          }
          const hand = paladin.rig.bone("handL").localToWorld(bowAim.copy(paladin.bodyRig.grip.L));
          const dx = tx - hand.x;
          const dy = ty - hand.y;
          const dz = tz - hand.z;
          const dist = Math.hypot(dx, dy, dz) || 1;
          // A snatched shot leaves slowly; a full draw at the bow's own speed. No lift: it drops.
          const sp = spec.speed * (0.45 + 0.55 * power);
          const shot = {
            x: hand.x + (dx / dist) * 0.35,
            y: hand.y + (dy / dist) * 0.35,
            z: hand.z + (dz / dist) * 0.35,
            vx: (dx / dist) * sp,
            vy: (dy / dist) * sp,
            vz: (dz / dist) * sp,
            dmg: bow.damage * (0.35 + 0.65 * power) * (spellRef.current.bless > 0 ? 1 + SPELL.blessDamage : 1),
          };
          // In a party the arrow flies on the authority's floor (and comes back in its snapshots).
          if (coop && !coop.leads()) coop.sendShot(shot);
          else sim.shoot(shot.x, shot.y, shot.z, shot.vx, shot.vy, shot.vz, shot.dmg);
          monsterSfxRef.current?.twang();
          bow.onShot();
        }
        drawRef.current = 0;
      }
      // His arrows stuck in the stone come back into the bag as he walks over them.
      if (world.place === "dungeon" && !world.dead) {
        let picked = 0;
        for (const p of sim.projectiles) {
          if (p.dead || p.from !== 0 || !p.stuck || p.stuckTo !== undefined) continue;
          if (Math.hypot(p.x - px, p.z - pz) < 0.9 && Math.abs(p.y - (world.playerFloor * CELL_M + 0.8)) < 1.7) {
            p.dead = true;
            picked++;
          }
        }
        if (picked) bow.onPickup(picked);
      }
      const vis = bowViewRef.current;
      if (vis) {
        const show3d = bow.inHand && !!spec && paladin !== null && !world.escaped && !show.active;
        vis.bow.visible = vis.s1.visible = vis.s2.visible = show3d;
        vis.nocked.visible = show3d && drawRef.current > 0;
        if (show3d && paladin && spec) {
          if (vis.shape !== spec.shape) {
            vis.shape = spec.shape;
            vis.bow.geometry = bowLimbs(spec.shape);
            (vis.bow.material as THREE.MeshStandardMaterial).color.setHex(BOW_WOOD[spec.shape]);
          }
          paladin.group.updateMatrixWorld(true);
          // In the closed left fist; the string comes back to the right hand's grip.
          const hl = paladin.rig.bone("handL").localToWorld(bowAim.copy(paladin.bodyRig.grip.L));
          const hr = paladin.rig.bone("handR").localToWorld(bowNock.copy(paladin.bodyRig.grip.R));
          vis.bow.position.copy(hl);
          vis.bow.rotation.set(0, paladin.group.rotation.y + Math.PI, drawRef.current > 0 ? 0.08 : 0.2);
          vis.bow.updateMatrixWorld(true);
          const top = bowTop.set(0, spec.tipY, spec.tipZ).applyMatrix4(vis.bow.matrixWorld);
          const bot = bowBot.set(0, -spec.tipY, spec.tipZ).applyMatrix4(vis.bow.matrixWorld);
          // The string comes back with the draw (a short way on a snatched shot).
          const k = Math.min(1, drawRef.current / spec.drawTime);
          const rest = bowMid.copy(top).lerp(bot, 0.5);
          const mid = drawRef.current > 0 ? rest.lerp(hr, 0.35 + 0.65 * k) : rest;
          stretch(vis.s1, top, mid);
          stretch(vis.s2, mid, bot);
          if (drawRef.current > 0) {
            bowDir.copy(hl).sub(mid).normalize();
            vis.nocked.position.copy(mid).addScaledVector(bowDir, 0.36);
            vis.nocked.quaternion.setFromUnitVectors(Z_AXIS, bowDir);
          }
        }
      }
      const ch = crosshairRef.current;
      if (ch) {
        // The wizard aims his bolts with it too.
        const aims = !bow.inHand && spellsRef.current.some((id) => !!spellById(id)?.bolt);
        const on = (bow.inHand || aims) && world.place === "dungeon" && !show.active && !world.dead;
        ch.style.display = on ? "block" : "none";
        if (aims && on) {
          ch.style.transform = "translate(-50%, -50%) scale(1)";
          ch.style.opacity = "0.5";
        } else if (on) {
          const k = spec ? Math.min(1, drawRef.current / spec.drawTime) : 0;
          ch.style.transform = `translate(-50%, -50%) scale(${1.6 - 0.9 * k})`;
          ch.style.opacity = bow.loaded > 0 && rl.t <= 0 ? String(0.55 + 0.45 * k) : "0.3";
        }
      }
    }

    // E: a door to work, a draught to drink.
    if (doorQueueRef.current >= 0) {
      const di = doorQueueRef.current;
      doorsRef.current?.toggle(di, { x: px, z: pz });
      const dr = doorsRef.current?.doors[di];
      if (dr && coop) coop.sendDoor({ i: di, open: dr.target > 0.5, x: px, z: pz });
      doorQueueRef.current = -1;
    }
    // A teammate worked a door.
    if (coop && doorsRef.current) {
      for (const d of coop.takeDoors()) {
        const dr = doorsRef.current.doors[d.i];
        if (dr && dr.target > 0.5 !== d.open) doorsRef.current.toggle(d.i, { x: d.x, z: d.z });
      }
    }
    if (roomDoorQueueRef.current >= 0) {
      townRef.current?.toggleDoor(roomDoorQueueRef.current);
      roomDoorQueueRef.current = -1;
    }
    if (town) {
      town.setRented(rentedRef.current);
      const open = stashOpenRef.current;
      Town.ROOMS.forEach((r, ri) => r.chests.forEach((_, ci) => town.setChestOpen(ri, ci, !!open && open.room === ri && open.slot === ci)));
      town.update(dt, world.time, eyeRef.current.set(px, world.playerFloor * CELL_M, pz));
    }
    // His health follows his gear (a Vigor ring on, a breastplate off): the same share of it stays.
    if (world.maxHp !== statsRef.current.maxHealth && !world.dead) {
      world.hp = (world.hp * statsRef.current.maxHealth) / world.maxHp;
      world.maxHp = statsRef.current.maxHealth;
      onHudUpdate({ hp: Math.round(world.hp), maxHp: world.maxHp });
    }
    if (healQueueRef.current > 0) {
      if (!world.dead) {
        world.hp = Math.min(world.maxHp, world.hp + healQueueRef.current);
        onHudUpdate({ hp: world.hp });
      }
      healQueueRef.current = 0;
    }
    const regen = regenQueueRef.current;
    if (regen) {
      regenQueueRef.current = null;
      world.regen = { left: regen.amount, rate: regen.amount / regen.seconds };
    }
    if (world.regen.left > 0 && !world.dead) {
      const add = Math.min(world.regen.left, world.regen.rate * dt);
      world.regen.left -= add;
      world.hp = Math.min(world.maxHp, world.hp + add);
      if (Math.floor(world.hp) !== Math.floor(world.hp - add) || world.regen.left <= 0) onHudUpdate({ hp: Math.round(world.hp) });
      if (world.hp >= world.maxHp) world.regen.left = 0;
    }
    const market = marketRef.current;
    const doorsNow = doorsRef.current;
    const dressing = dressingRef.current;
    const men: Array<{ x: number; z: number }> = [];
    for (const m of sim.mobs) if (!m.dead) men.push({ x: m.wx, z: m.wz });
    doorsNow?.update(dt, men);
    portalsRef.current?.update(world.time, world.runT);
    if (dressing) {
      dressing.chests.forEach((c, i) => {
        c.target = containersRef.current.get(chestIdsRef.current[i])?.seen ? 1 : 0;
      });
      dressing.update(dt, eyeRef.current.set(px, py, pz));
    }
    // What E would do: the nearest stall, chest, fallen man or door he is facing.
    const facingNow = walker.yaw + Math.PI;
    const look = (x: number, z: number) => {
      const dx = x - px;
      const dz = z - pz;
      return (Math.sin(facingNow) * dx + Math.cos(facingNow) * dz) / (Math.hypot(dx, dz) || 1);
    };
    const best: { it: Interact | null; d: number } = { it: null, d: Infinity };
    const consider = (it: Interact, dist: number) => {
      if (dist < best.d) {
        best.d = dist;
        best.it = it;
      }
    };
    if (!world.dead && !world.escaped && !show.active) {
      if (market) {
        const at = market.reachable(px, pz, facingNow);
        if (at >= 0) {
          const who = MERCHANTS.findIndex((m) => m.id === market.stalls[at].merchant);
          const st = market.stalls[at];
          consider({ kind: "trade", key: String(who), verb: "Trade with", label: `${MERCHANTS[who].name} · ${MERCHANTS[who].trade}` }, Math.hypot(st.front.x - px, st.front.z - pz));
        }
      }
      containersRef.current.forEach((box) => {
        const dist = Math.hypot(box.x - px, box.z - pz);
        if (dist > (box.kind === "chest" ? 1.75 : 1.9) || look(box.x, box.z) < 0.25) return;
        if (box.kind === "pile" && box.grid.items.length === 0) return;
        const empty = box.seen && box.grid.items.length === 0 ? " (empty)" : "";
        consider({ kind: box.kind, key: box.id, verb: box.kind === "chest" ? "Search" : "Loot", label: `${box.name}${empty}` }, dist - 0.2);
      });
      if (town) {
        const rented = rentedRef.current;
        const feet = world.playerFloor * CELL_M;
        // The guild representative at his desk: quests to take and to turn in.
        const ds = Town.DESK_SPOT;
        const dd = Math.hypot(ds.x - px, ds.z - pz);
        if (dd < ds.reach && feet < 1 && look(Town.CLERK.x, Town.CLERK.z) > 0.3) {
          consider({ kind: "quest", key: "0", verb: "Speak with", label: "the Guild Representative" }, dd);
        }
        // The teleporter: anywhere on the dais near its middle.
        if (feet > Town.DAIS.h * 0.6 && Math.hypot(px - Town.DAIS.x, pz - Town.DAIS.z) < Town.DAIS_REACH) {
          consider({ kind: "teleport", key: "0", verb: "Descend into", label: "the dungeon" }, 0.5);
        }
        if (feet > Town.UPPER_Y - 0.4) {
          Town.ROOMS.forEach((r, ri) => {
            const dx = (r.door.x0 + r.door.x1) / 2;
            const dz = Town.ROOMS_Z + 0.1;
            const dist = Math.hypot(dx - px, dz - pz);
            if (dist < 1.7 && look(dx, dz) > 0.3) {
              if (!rented[ri]) consider({ kind: "rent", key: String(ri), verb: `Rent ${r.name} for`, label: `${r.rent} gold` }, dist + 0.3);
              else consider({ kind: "roomdoor", key: String(ri), verb: town.doorOpen(ri) ? "Close" : "Open", label: `${r.name} (yours)` }, dist + 0.3);
            }
            if (!rented[ri]) return;
            r.chests.forEach((c, ci) => {
              const d2 = Math.hypot(c.x - px, c.z - pz);
              if (d2 < 1.6 && look(c.x, c.z) > 0.25 && pz > Town.ROOMS_Z + 0.2) consider({ kind: "stash", key: `${ri}:${ci}`, verb: "Open", label: `stash chest ${ci + 1}` }, d2);
            });
          });
        }
      }
      // Another player in town: E asks him into the party (only its leader can).
      if (town) {
        const party = mp.state.party;
        const mayInvite = !party || party.leader === mp.state.me;
        for (const o of remotesRef.current?.views() ?? []) {
          if (!mayInvite || (party && party.members.indexOf(o.id) >= 0)) continue;
          const dist = Math.hypot(o.x - px, o.z - pz);
          if (dist > 2.4 || look(o.x, o.z) < 0.4 || Math.abs(o.y - py) > 1) continue;
          consider({ kind: "player", key: o.id, verb: "Invite", label: `${mp.nameOf(o.id)} to your party` }, dist);
        }
      }
      const portals = portalsRef.current;
      if (portals) {
        portals.centres.forEach((c, i) => {
          if (!portals.isOpen(i, world.runT)) return;
          const dist = Math.hypot(c.x - px, c.z - pz);
          if (dist < PORTAL_REACH) consider({ kind: "portal", key: String(i), verb: "Escape through", label: "the portal" }, dist - 1);
        });
      }
      if (doorsNow) {
        const di = doorsNow.reachable(px, pz, facingNow);
        if (di >= 0) {
          const dr = doorsNow.doors[di];
          consider({ kind: "door", key: String(di), verb: dr.target > 0.5 ? "Close" : "Open", label: "door" }, Math.hypot(dr.centre.x - px, dr.centre.z - pz) + 0.5);
        }
      }
    }
    const nextKey = best.it ? `${best.it.kind}|${best.it.key}|${best.it.verb}|${best.it.label}` : "";
    if (nextKey !== interactKeyRef.current && (playingRef.current || !best.it)) {
      interactKeyRef.current = nextKey;
      onHudUpdate({ interact: best.it });
    }
    if (market) {
      const tradingStall = tradingRef.current >= 0 ? market.stalls.findIndex((s) => s.merchant === MERCHANTS[tradingRef.current].id) : -1;
      market.update(dt, eyeRef.current.set(px, py, pz), tradingStall);
    }
    if (tradingRef.current >= 0) freeLookRef.current += (0.62 - freeLookRef.current) * (1 - Math.exp(-dt * 5));
    else if (!keys.has("KeyC")) freeLookRef.current *= Math.exp(-dt * 7);

    // Update camera (character showcase, 3rd-person follow with wall/ceiling collision, or 1st-person eye).
    const drawZoom = 1 - 0.16 * Math.min(1, drawRef.current / 0.7);
    const desiredFov = responsiveFov(firstPerson ? FIRST_PERSON_FOV : 68, size.width, size.height) * drawZoom;
    if (!show.active && Math.abs(persp.fov - desiredFov) > 0.2) {
      persp.fov = desiredFov;
      persp.updateProjectionMatrix();
    }
    const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
    const distScale = aspect < 0.85 ? 1.24 : 1;

    const kick = paladin ? paladin.shake.value : 0;
    let lightX = px;
    let lightY = py + 0.55;
    let lightZ = pz;
    if (show.active) {
      // Frame `zoom` metres of him (face .. head to toe) in `frame`, the part of the screen the
      // panels leave free: the view offset slides the picture over, the distance stays inside the
      // open space found on entry, and the lens makes up the rest.
      const W = size.width;
      const Hs = size.height;
      const fracX = Math.max(0.15, Math.min(1, frame.width / W));
      const fracY = Math.max(0.2, Math.min(1, frame.height / Hs));
      persp.setViewOffset(W, Hs, W / 2 - (frame.left + frame.width / 2), Hs / 2 - (frame.top + frame.height / 2), W, Hs);
      const floorY = world.playerFloor * CELL_M + world.playerJumpY;
      const k = Math.max(0, Math.min(1, (sc.zoom - 0.45) / (2.25 - 0.45)));
      const ty = Math.max(floorY + 0.25, Math.min(floorY + 1.8, floorY + 1.62 + (0.98 - 1.62) * k + sc.lift));
      const dist = Math.min(show.maxDist, 0.75 + sc.zoom * 1.6);
      const halfH = sc.zoom / 2 / fracY;
      const halfW = (0.33 + sc.zoom * 0.18) / fracX;
      const vfov = 2 * Math.atan(Math.max(halfH, halfW / aspect) / dist) * (180 / Math.PI);
      const ease = 1 - Math.exp(-dt * 7);
      show.fov += (Math.max(12, Math.min(80, vfov)) - show.fov) * ease;
      show.camPos.lerp(
        eyeRef.current.set(px + Math.sin(show.yaw) * dist, ty + 0.06 + 0.08 * k, pz + Math.cos(show.yaw) * dist),
        ease
      );
      show.camTarget.lerp(eyeRef.current.set(px, ty, pz), ease);
      persp.fov = show.fov;
      persp.updateProjectionMatrix();      persp.position.copy(show.camPos);
      persp.up.set(0, 1, 0);
      persp.lookAt(show.camTarget);
      // The lantern moves in front of him at head height, a little to one side: a soft key light
      // on the face that doesn't burn out the top of the helm.
      lightX = px + Math.sin(show.yaw + 0.5) * 1.5;
      lightZ = pz + Math.cos(show.yaw + 0.5) * 1.5;
      lightY = floorY - 0.15;
    } else if (watching) {
      // Down, in a party: the camera rides over a teammate's shoulder (the way he looks).
      if (offsetOnRef.current) {
        persp.clearViewOffset();
        offsetOnRef.current = false;
      }
      const cam = resolveThirdPersonCam(
        space,
        watching.x,
        watching.y - watching.air,
        watching.z,
        watching.yaw,
        watching.pitch,
        2.6 * distScale,
        SHOULDER_OFFSET * 0.6,
        SHOULDER_OFFSET * 0.6,
        (x: number, y: number, z: number) => !!doorsRef.current?.solidAt(x, y, z),
      );
      persp.position.set(cam.cx, cam.cy, cam.cz);
      persp.up.set(0, 1, 0);
      persp.lookAt(cam.tx, cam.ty, cam.tz);
      lightX = watching.x;
      lightY = watching.y + 0.55;
      lightZ = watching.z;
    } else if (firstPerson) {
      // True first person: the camera sits at the paladin's eyes, so the arms, sword and
      // shield in view are the same ones everyone else sees.
      if (paladin) persp.position.copy(paladin.getEye(eyeRef.current));
      else persp.position.set(px, (world.playerFloor + EYE_HEIGHT_CELLS) * CELL_M + world.playerJumpY, pz);
      persp.rotation.order = "YXZ";
      persp.rotation.y = walker.yaw + Math.sin(world.time * 61) * kick * 0.012;
      persp.rotation.x = walker.pitch + Math.sin(world.time * 47) * kick * 0.016;
      persp.rotation.z = Math.sin(world.time * 53) * kick * 0.02;
    } else {
      // While trading, the picture slides into the part of the screen the panel leaves free.
      const tf = tradeFrameRef.current;
      if (tf) {
        persp.setViewOffset(size.width, size.height, size.width / 2 - (tf.left + tf.width / 2), size.height / 2 - (tf.top + tf.height / 2), size.width, size.height);
        offsetOnRef.current = true;
      } else if (offsetOnRef.current) {
        persp.clearViewOffset();
        offsetOnRef.current = false;
      }
      // Narrow portrait screens get less offset so he stays in frame.
      const shoulderWant = SHOULDER_OFFSET * (aspect < 0.85 ? 0.6 : 1);
      const cam = resolveThirdPersonCam(
        space,
        px,
        world.playerFloor * CELL_M,
        pz,
        walker.yaw + freeLookRef.current,
        walker.pitch,
        camDistRef.current * distScale,
        shoulderRef.current,
        shoulderWant,
        (x: number, y: number, z: number) => !!(marketRef.current?.solidAt(x, y, z) || doorsRef.current?.solidAt(x, y, z))
      );
      // Ease back out to the shoulder; a wall pulls the camera in straight away (no clipping).
      const shoulderTo = Math.min(shoulderWant, cam.sideMax);
      shoulderRef.current =
        shoulderTo < shoulderRef.current ? shoulderTo : shoulderRef.current + (shoulderTo - shoulderRef.current) * (1 - Math.exp(-dt * 6));
      persp.position.set(cam.cx, cam.cy + Math.sin(world.time * 47) * kick * 0.03, cam.cz);
      persp.up.set(0, 1, 0);
      persp.lookAt(cam.tx, cam.ty, cam.tz);
    }
    // Headless checks can park the camera anywhere (window.__overview = [x, y, z, tx, ty, tz], metres).
    const overview = (window as unknown as { __overview?: number[] }).__overview;
    if (overview) {
      persp.position.set(overview[0], overview[1], overview[2]);
      persp.lookAt(overview[3], overview[4], overview[5]);
    }
    persp.updateMatrixWorld();

    // The other players (their names over them need this frame's camera), then his own pose for them.
    const placeNow = world.place === "town" ? "town" : "run";
    const zoneNow = town ? town.zone() : "in";
    remotesRef.current?.update(dt, { place: placeNow, zone: zoneNow, runId: coop?.run.id ?? "", camera: persp, view: size });
    {
      const pr = poseRef.current;
      pr.t += dt;
      const whereKey = `${placeNow}|${zoneNow}`;
      if (whereKey !== pr.where && mp.state.status === "online") {
        pr.where = whereKey;
        mp.setWhere(placeNow, zoneNow);
      }
      if (mp.state.status !== "online") pr.where = "";
      if (paladin && mp.state.status === "online") {
        const r2 = (v: number) => Math.round(v * 100) / 100;
        const pose: Pose = {
          x: r2(px),
          y: r2(py),
          z: r2(pz),
          f: r2(show.active ? show.facing : walker.yaw + Math.PI),
          yw: r2(walker.yaw),
          p: r2(walker.pitch),
          a: r2(world.playerJumpY),
          sw: paladin.animator.swingSerial,
          b: blocking ? 1 : 0,
          dr: drawRef.current > 0 ? 1 : 0,
          dd: world.dead ? 1 : 0,
          e: world.escaped ? 1 : 0,
          hp: Math.round(world.hp),
          mh: Math.round(world.maxHp),
          pl: placeNow,
          zn: zoneNow,
          ru: coop?.run.id ?? "",
        };
        const key = JSON.stringify(pose);
        // About twelve a second while he moves; standing still, now and then.
        if (pr.t >= (key !== pr.key ? 0.08 : 2)) {
          pr.t = 0;
          pr.key = key;
          mp.pose(pose);
        }
      }
    }

    // The men: bodies lent to the nearest, animated from the simulation; nameplates over the hostile.
    // (Once he is down in a party, around the teammate the camera follows.)
    const eyeX = watching ? watching.x : px;
    const eyeZ = watching ? watching.z : pz;
    bodiesRef.current?.update(dt, world.time, sim, { x: eyeX, y: watching ? watching.y : py, z: eyeZ }, persp, size, platesRef.current);

    // Update nearest shadow lamps + render multi-pass crypt frame.
    if (fl) view.updateLights(dt, eyeX / CELL_M, eyeZ / CELL_M, fl.lamps, fl.dungeon);
    // The carried lantern rides half a metre above the helm so it lights the steel without burning it out.
    view.renderFrame(world.time, dt, lightX, lightY, lightZ, size.width, size.height);
    // What this frame cost (graphics.ts frameStats: the FPS counter and `?perf`).
    frameStats.cpuMs += (performance.now() - now - frameStats.cpuMs) * 0.1;
    frameStats.dpr = gl.getPixelRatio();
    if (perfRef.current) {
      frameStats.calls = gl.info.render.calls;
      frameStats.triangles = gl.info.render.triangles;
      frameStats.programs = gl.info.programs?.length ?? 0;
      if (frameStats.frames % 30 === 0) {
        let lights = 0;
        scene.traverseVisible((o) => {
          if ((o as THREE.Light).isLight && !(o as THREE.HemisphereLight).isHemisphereLight) lights++;
        });
        frameStats.lights = lights;
      }
    }
    // Automatic resolution: down a step after two slow seconds, back up after four smooth ones.
    const res = resRef.current;
    res.frames++;
    if (!res.since) res.since = now;
    if (now - res.since >= 1000) {
      const fps = (res.frames * 1000) / (now - res.since);
      res.frames = 0;
      res.since = now;
      const top = Math.min(frameCapRef.current, 60);
      res.low = fps < 28 ? res.low + 1 : 0;
      res.high = fps > top * 0.9 ? res.high + 1 : 0;
      let next = res.scale;
      if (!autoResRef.current) next = 1;
      else if (res.low >= 2 && res.scale > 0.6) next = Math.max(0.6, res.scale * 0.85);
      else if (res.high >= 4 && res.scale < 1) next = Math.min(1, res.scale * 1.12);
      if (next !== res.scale) {
        res.scale = next;
        res.low = res.high = 0;
        setDpr(maxDpr(qualityRef.current) * next);
      }
    }
    // The inventory's picture of him, drawn into its box over the frame.
    const pr = portraitRectRef.current;
    if (pr && portraitRef.current) {
      const pv = portraitViewRef.current;
      portraitRef.current.render(pr, kitRef.current, dt, pv.spin, pv.zoom);
    }
    // Inventory icons: rendered off screen after the frame, once (they need the paladin built).
    if (iconsWanted && !iconsDoneRef.current && paladin) {
      iconsDoneRef.current = true;
      onIcons(renderGearIcons(paladin, gl));
    }

    // Where he is, kept every two seconds of real time (runSave.ts; game time is capped per frame,
    // so a slow phone would otherwise save far less often).
    const nowMs = performance.now();
    if (nowMs - saveTimerRef.current >= 2000) {
      saveTimerRef.current = nowMs;
      saveProgress();
    }

    // Room badge, head count and minimap at ~6 Hz.
    hudTimerRef.current += dt;
    if (hudTimerRef.current >= 0.16) {
      hudTimerRef.current = 0;
      const room = walker.room();
      const mod = room && planRef.current ? MODULES[planRef.current.modules[room.id]] : null;
      const label = town ? Town.areaName(px, pz, world.playerFloor * CELL_M) : room ? `${mod ? mod.name : room.type} (Room ${room.id + 1})` : "Corridor";
      const portalsNow = portalsRef.current;
      onHudUpdate({
        roomLabel: label,
        mobs: sim.mobs.reduce((n, m) => n + (m.dead ? 0 : 1), 0),
        runLeft: Math.max(0, Math.ceil(RUN_SECONDS - world.runT)),
        portalsOpen: portalsNow ? portalsNow.plans.filter((_, i) => portalsNow.isOpen(i, world.runT)).length : 0,
      });

      const canvas = minimapCanvasRef.current;
      const mapCtx = canvas && town ? canvas.getContext("2d") : null;
      if (canvas && mapCtx && town) {
        town.drawMap(mapCtx, canvas.width, canvas.height, px, pz, world.playerFloor * CELL_M, world.time);
        // The other players on this storey (blue), at the town map's scale (34 m across).
        const k = Math.min(canvas.width, canvas.height) / 34;
        mapCtx.fillStyle = "#6fb8ff";
        for (const o of remotesRef.current?.views() ?? []) {
          if (Math.abs(o.y - o.air - world.playerFloor * CELL_M) > 1.5) continue;
          mapCtx.beginPath();
          mapCtx.arc(canvas.width / 2 + (o.x - px) * k, canvas.height / 2 + (o.z - pz) * k, Math.max(3, k * 0.4), 0, Math.PI * 2);
          mapCtx.fill();
        }
      }
      const dungeon = fl?.dungeon;
      if (canvas && dungeon) {
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
          // The men: green calm, red hostile, grey fallen.
          for (const m of sim.mobs) {
            ctx.fillStyle = m.dead ? "#59595c" : m.hostile ? "#ff5a4a" : "#6ce88a";
            ctx.beginPath();
            ctx.arc(ox + m.cx * scale, oy + m.cz * scale, Math.max(2, scale * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
          // The merchants' stalls, in their awning colours.
          for (const st of marketRef.current?.stalls ?? []) {
            const m = MERCHANTS.find((q) => q.id === st.merchant);
            const c = stallPoint(st.plan, 0, 0.55);
            const sz = Math.max(4, scale * 0.9);
            ctx.fillStyle = css(m?.cloth ?? 0x888888);
            ctx.strokeStyle = "#e6c48a";
            ctx.lineWidth = 1;
            ctx.fillRect(ox + c.x * scale - sz / 2, oy + c.z * scale - sz / 2, sz, sz);
            ctx.strokeRect(ox + c.x * scale - sz / 2, oy + c.z * scale - sz / 2, sz, sz);
          }
          // Doors (shut: a solid bar across the way) and chests not yet searched.
          for (const dr of doorsRef.current?.doors ?? []) {
            const a = dr.arch;
            const cx = ox + (a.x + 0.5) * scale;
            const cz = oy + (a.y + 0.5) * scale;
            const l = (a.len * scale) / 2;
            ctx.strokeStyle = dr.target > 0.5 ? "rgba(176,122,58,0.35)" : "#c08a48";
            ctx.lineWidth = Math.max(2, scale * 0.35);
            ctx.beginPath();
            ctx.moveTo(cx - a.px * l, cz - a.py * l);
            ctx.lineTo(cx + a.px * l, cz + a.py * l);
            ctx.stroke();
          }
          (dressingRef.current?.chests ?? []).forEach((c, i) => {
            if (containersRef.current.get(chestIdsRef.current[i])?.seen) return;
            ctx.fillStyle = "#ffcf5a";
            const sz = Math.max(3, scale * 0.45);
            ctx.fillRect(ox + c.piece.x * scale - sz / 2, oy + c.piece.z * scale - sz / 2, sz, sz);
          });
          // Traps: a spike plate as a red crossed square; across the corridor, a log as an orange
          // bar, a blade as a pale bar with its hub, a channel as a green (lava: orange) band.
          const lavaFloor = theme === "molten";
          for (const t of trapsRef.current?.plans ?? []) {
            const cx = ox + t.gx * scale;
            const cz = oy + t.gz * scale;
            const h = Math.max(2.5, scale * 0.42);
            if (t.kind === "spikes") {
              ctx.strokeStyle = "#ff6a4a";
              ctx.lineWidth = 1.5;
              ctx.strokeRect(cx - h, cz - h, h * 2, h * 2);
              ctx.beginPath();
              ctx.moveTo(cx - h, cz - h);
              ctx.lineTo(cx + h, cz + h);
              ctx.moveTo(cx + h, cz - h);
              ctx.lineTo(cx - h, cz + h);
              ctx.stroke();
              continue;
            }
            // Half its length across the corridor and half its depth along it (minimap pixels).
            const half = (t.span * scale) / 2;
            const deep = t.kind === "channel" ? Math.max(1.5, (t.length === 2 ? 0.9 : 0.27) * scale) : 0;
            const [hx, hz] = t.along === "x" ? [deep, half] : [half, deep];
            if (t.kind === "channel") {
              ctx.fillStyle = lavaFloor ? "rgba(255,110,30,0.8)" : "rgba(110,255,60,0.75)";
              ctx.fillRect(cx - hx, cz - hz, hx * 2, hz * 2);
              continue;
            }
            ctx.strokeStyle = t.kind === "blade" ? "#dfe6ee" : "#ff9f2e";
            ctx.lineWidth = Math.max(2, scale * 0.3);
            ctx.beginPath();
            ctx.moveTo(cx - hx, cz - hz);
            ctx.lineTo(cx + hx, cz + hz);
            ctx.stroke();
            if (t.kind === "blade") {
              ctx.fillStyle = "#dfe6ee";
              ctx.beginPath();
              ctx.arc(cx, cz, Math.max(2, scale * 0.3), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          // Open portals: a violet ring that pulses.
          const portalsMap = portalsRef.current;
          portalsMap?.plans.forEach((pl, i) => {
            if (!portalsMap.isOpen(i, world.runT)) return;
            const r = Math.max(4, scale * 0.9) * (1 + 0.18 * Math.sin(world.time * 5));
            ctx.fillStyle = "rgba(160,110,255,0.35)";
            ctx.strokeStyle = "#c9a8ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ox + pl.gx * scale, oy + pl.gz * scale, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
          // The party (blue dots, grey once down).
          for (const o of remotesRef.current?.views() ?? []) {
            ctx.fillStyle = o.dead ? "#59595c" : "#6fb8ff";
            ctx.beginPath();
            ctx.arc(ox + (o.x / CELL_M + dungeon.W / 2) * scale, oy + (o.z / CELL_M + dungeon.H / 2) * scale, Math.max(3, scale * 0.45), 0, Math.PI * 2);
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

  // Everything in this scene is added imperatively (the paladin, the men, the dungeon view).
  return null;
};

type Screen = "play" | "menu" | "inventory" | "character" | "shop" | "loot" | "class" | "party" | "quests" | "lobby" | "trade";

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

  // The run he left last time (runSave.ts): picked up again if the dungeon is still open, or lost.
  const startRun = useMemo(runAtStart, []);
  const resumeRun = startRun?.kind === "resume" ? startRun.run : null;
  const [seed, setSeed] = useState(resumeRun?.seed ?? initialSeed);
  const [roomCount, setRoomCount] = useState(resumeRun?.rooms ?? initialRooms);
  const [theme, setTheme] = useState<ThemeName>(resumeRun?.theme ?? initialTheme);
  const [firstPerson, setFirstPerson] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [isTouchUI, setIsTouchUI] = useState(detectInitialTouch);
  // The graphics setting (Esc menu) and the FPS counter; touch devices start on Low.
  const [graphics, setGraphics] = useState<Graphics>(() => loadGraphics(detectInitialTouch()));
  useEffect(() => saveGraphics(graphics), [graphics]);
  const quality = PRESETS[graphics.quality];
  // Performance details (Esc menu, or `?perf` on the URL): draw calls, triangles, lights and frame
  // time under the FPS counter.
  const perfMode = graphics.showPerf || params.has("perf");
  // The top-left panel starts folded (menu, bag, clock); a tap or I unfolds it.
  const [hudOpen, setHudOpen] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }));
  const [sprintLocked, setSprintLocked] = useState(false);
  const [rotateDismissed, setRotateDismissed] = useState(false);
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hud, setHud] = useState<HudInfo>({
    name: "The Wayfarer's Rest",
    rooms: initialRooms,
    mobs: 0,
    roomLabel: "Common room",
    theme: "verdant",
    seed: initialSeed,
    firstPerson: false,
    pointerLocked: false,
    loading: "Opening the tavern doors...",
    hp: 100,
    maxHp: 100,
    dead: false,
    deathCause: null,
    runLeft: RUN_SECONDS,
    portalsOpen: 0,
    escaped: false,
    interact: null,
  });
  // Respawns rebuild the floor; nameplates are written by the scene each frame; wounds flash red.
  const [life, setLife] = useState(resumeRun?.life ?? 0);
  const platesRef = useRef<Array<HTMLDivElement | null>>([]);
  const [hurtKey, setHurtKey] = useState(0);
  const handlePlayerHurt = useCallback(() => {
    setHurtKey((k) => k + 1);
    // A short buzz on phones that can (ignored elsewhere).
    try {
      navigator.vibrate?.(35);
    } catch {
      // No vibration here.
    }
  }, []);
  // The run is over (fallen or escaped): losing the mouse then does not open the menu.
  const runOverRef = useRef(false);
  useEffect(() => {
    runOverRef.current = hud.dead || hud.escaped;
    if ((hud.dead || hud.escaped) && document.pointerLockElement) document.exitPointerLock?.();
  }, [hud.dead, hud.escaped]);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const touchMoveRef = useRef<{ forward: number; strafe: number }>({ forward: 0, strafe: 0 });
  const touchSprintRef = useRef(false);
  const jumpQueueRef = useRef(false);
  const attackQueueRef = useRef(false);
  const attackHeldRef = useRef(false);
  const groundQueueRef = useRef<ItemInst[]>([]);
  const crosshairRef = useRef<HTMLDivElement | null>(null);
  const touchBlockRef = useRef(false);
  const stickPointerRef = useRef<{ id: number; cx: number; cy: number } | null>(null);
  // The player: a random adventurer's name and an id his saves are kept under (profile.ts).
  const profile = useMemo(loadProfile, []);
  // His account: the username he picks on the first screen and its session token (account.ts).
  const [account, setAccount] = useState<Account | null>(loadAccount);
  // A name kept while there was no server is registered on the next start; if someone took it
  // meanwhile, he is asked for another (`retakeName` keeps it in the box).
  const [retakeName, setRetakeName] = useState<string | null>(null);
  useEffect(() => {
    if (!account || account.token) return;
    let on = true;
    createAccount(account.username, profile.id).then((r) => {
      if (!on) return;
      if (r.ok) {
        saveAccount(r.account);
        setAccount(r.account);
      } else if (r.reason === "taken") {
        saveAccount(null);
        setRetakeName(account.username);
        setAccount(null);
      }
    });
    return () => {
      on = false;
    };
  }, [account, profile.id]);
  // The character: who he is and what he wears, remembered between visits (CharacterCustomizer.tsx);
  // the name is the player's.
  const [spec, setSpec] = useState<HumanSpec>(() => ({ ...initialSpec(), name: profile.name }));
  // His class (only the fighter is playable for now), picked on the class screen the game opens on.
  const [heroClass, setHeroClass] = useState<ClassId>(() => (profile.cls && classById(profile.cls).available ? profile.cls : "fighter"));
  const className = classById(heroClass).name;
  // What he carries: gold, the pieces he wears and the bag (playerInv.ts); the body shows what is worn.
  // A run that was lost while he was away (the dungeon closed, or he had fallen) puts him back to
  // what he carried in, as a death would.
  const [inv, setInv] = useState<PlayerInv>(() => (startRun?.kind === "lost" ? startRun.runStart : loadInventory(initialEquipment())));
  useEffect(() => saveInventory(inv), [inv]);
  // What he carried when this floor's run began: dying (or abandoning the floor) puts him back to
  // it, so only what he escapes with through a portal is kept.
  const invRef = useRef(inv);
  invRef.current = inv;
  const runStartRef = useRef<PlayerInv>(resumeRun?.runStart ?? inv);
  const escapeQueueRef = useRef(false);
  // The controls hint goes a few seconds after the mouse is captured (and comes back when freed).
  const [hintHidden, setHintHidden] = useState(false);
  useEffect(() => {
    if (!hud.pointerLocked) {
      setHintHidden(false);
      return;
    }
    const t = window.setTimeout(() => setHintHidden(true), 6000);
    return () => window.clearTimeout(t);
  }, [hud.pointerLocked]);
  // In town or below, where he comes up in town, and each arrival there (it places him again).
  const [place, setPlace] = useState<Place>(resumeRun ? "dungeon" : "town");
  const placeRef = useRef(place);
  placeRef.current = place;
  // Multiplayer (net/mp.ts): the hub's store, a party's dive under way (net/coop.ts), whom he
  // watches once he is down in it, where the others' names go, and the chat line.
  const mpState = useMp();
  const coopRef = useRef<Coop | null>(null);
  const [coopRun, setCoopRun] = useState<string | null>(null);
  const spectateRef = useRef<string | null>(null);
  const [watchPick, setWatchPick] = useState(0);
  const remoteLayerRef = useRef<HTMLDivElement | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  // The guild's quests (quests.ts): taken at the representative's desk, counted as he plays.
  const [quests, setQuests] = useState<QuestState>(loadQuests);
  useEffect(() => saveQuests(quests), [quests]);
  const handleQuestEvent = useCallback((e: QuestEvent) => {
    setQuests((q) => {
      const r = recordQuest(q, e);
      if (r.finished.length) setToast(`Quest complete: ${r.finished.join(", ")}. See the guild representative for your reward.`);
      return r.state;
    });
  }, []);
  // Into the ring: what it is (once each time he steps onto the sand).
  const inRing = hud.roomLabel === "The Arena (fighting ground)";
  useEffect(() => {
    if (inRing) setToast("The fighting ground: other players can strike you here, and you them. A knockout costs nothing.");
  }, [inRing]);
  // The arena's news: knocked out (and back up), or a bout won.
  const [knockedBy, setKnockedBy] = useState<string | null>(null);
  const handleArenaEvent = useCallback(
    (e: ArenaEvent) => {
      if (e.type === "down") setKnockedBy(mp.nameOf(e.by));
      else if (e.type === "up") setKnockedBy(null);
      else {
        setToast(`You bested ${mp.nameOf(e.over)} in the arena!`);
        handleQuestEvent({ type: "arenaWin" });
      }
    },
    [handleQuestEvent]
  );
  // A floor is up: a fresh run starts with what he carries now (kept in case he leaves mid-run); a
  // resumed run keeps what he carried in then.
  const resumedRef = useRef(false);
  const floorRef = useRef({ seed, roomCount, theme, life });
  floorRef.current = { seed, roomCount, theme, life };
  const handleFloorReady = useCallback((resumed: boolean) => {
    resumedRef.current = resumed;
    if (resumed) return;
    runStartRef.current = invRef.current;
    // A party's dive: the others learn he is down (and it is not kept to pick up alone later).
    if (coopRef.current) {
      mp.runStatus("in");
      return;
    }
    const f = floorRef.current;
    beginRun({ seed: f.seed, rooms: f.roomCount, theme: f.theme, life: f.life, endsAt: Date.now() + RUN_SECONDS * 1000, runStart: invRef.current });
  }, []);
  const [arrival, setArrival] = useState<"tavern" | "gate">("tavern");
  const [townVisit, setTownVisit] = useState(0);
  // The rooms he rents upstairs and what their chests hold (town/townSave.ts).
  const [townSave, setTownSave] = useState<TownSave>(loadTown);
  useEffect(() => saveTown(townSave), [townSave]);
  // The server's copy: fetched once at the start (the newer of it and this browser's wins), then
  // what he has in town is sent up whenever it changes (never mid-dive: only what he extracted).
  // Only with an account: the server takes saves with his session token (account.ts).
  const token = account?.token ?? null;
  const cloud = useMemo(() => (token ? createCloudSync(profile.id, token) : null), [profile.id, token]);
  useEffect(() => () => cloud?.dispose(), [cloud]);
  const [cloudReady, setCloudReady] = useState(false);
  useEffect(() => {
    if (!token) return;
    let on = true;
    fetchCloud(profile.id, token).then((c) => {
      if (!on) return;
      if (c && c.updated > profile.updated) {
        profile.updated = c.updated;
        profile.name = c.name || profile.name;
        saveProfile(profile);
        setInv(normalizeInventory(c.inventory));
        setTownSave((t) => ({ rented: t.rented.map((_, i) => !!c.town.rented?.[i]), stash: t.stash.map((row, r) => row.map((g, k) => c.town.stash?.[r]?.[k] ?? g)) }));
        setSpec((sp) => ({ ...sp, name: profile.name }));
        if (c.cls && classById(c.cls).available) setHeroClass(c.cls);
      }
      setCloudReady(true);
    });
    return () => {
      on = false;
    };
  }, [profile, token]);
  const syncedRef = useRef("");
  useEffect(() => {
    if (!cloud || !cloudReady || place !== "town") return;
    const name = (spec.name || profile.name).slice(0, 40);
    const key = JSON.stringify([name, heroClass, inv, townSave]);
    if (key === syncedRef.current) return;
    const first = syncedRef.current === "";
    syncedRef.current = key;
    if (name !== profile.name || !first || !profile.updated) {
      profile.name = name;
      profile.updated = Date.now();
      saveProfile(profile);
    }
    cloud.push({ name, cls: heroClass, inventory: inv, town: townSave, updated: profile.updated });
  }, [cloudReady, place, inv, townSave, spec.name, profile, cloud, heroClass]);
  const rentedRef = useRef(townSave.rented);
  rentedRef.current = townSave.rented;
  const roomDoorQueueRef = useRef(-1);
  const stashOpenRef = useRef<{ room: number; slot: number } | null>(null);
  const [stashAt, setStashAt] = useState<{ room: number; slot: number } | null>(null);
  // A line across the screen for a few seconds (rent paid, back from a dive), and the teleport flash.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(t);
  }, [toast]);
  const [flashKey, setFlashKey] = useState(0);
  const [doorFadeKey, setDoorFadeKey] = useState(0);
  /**
   * Keys 1 and 2 take up (or put away) weapon set 1 or 2: its main hand and off hand together (a
   * sword and shield, a bow). Taking up one set puts the other away.
   */
  const toggleDraw = useCallback((set: 1 | 2) => {
    const h = heldOf(invRef.current, set);
    if (!h.main && !h.off) {
      setToast(`Weapon set ${set} is empty. Put a weapon in its main or off hand in the inventory (Tab).`);
      return;
    }
    if (h.bow && arrowCount(invRef.current) === 0) setToast("No arrows in your bag.");
    setActiveSet((a) => (a === set ? 0 : set));
  }, []);
  /** Keys 3 and 4: use what is on that belt slot (the next of its kind in the bag takes its place). */
  const applyBeltSlot = useCallback((i: number) => {
    if (runOverRef.current) return;
    const r = spendBelt(invRef.current, i);
    if (!r) {
      setToast(`Nothing on belt slot ${i + 3}. Put a draught or a bandage there in the inventory (Tab).`);
      return;
    }
    const d = def(r.used.id);
    // Interaction speed: a quicker hand ties the bandage faster.
    if (d.healOver) regenQueueRef.current = { amount: d.heal ?? 0, seconds: d.healOver / (1 + Math.max(-0.5, statsNowRef.current.interactionSpeed)) };
    else healQueueRef.current += d.heal ?? 0;
    setInv(r.inv);
  }, []);
  const goToTown = useCallback((at: "tavern" | "gate") => {
    setArrival(at);
    setTownVisit((v) => v + 1);
    setPlace("town");
    setFlashKey((k) => k + 1);
  }, []);
  /** Leave this floor without escaping: what was found here is lost. */
  const abandonRun = useCallback(() => setInv(runStartRef.current), []);
  // What he holds: weapon set 1 (key 1) or set 2 (key 2); the sets stay in their slots and are
  // only in hand once taken up. He arrives everywhere with everything put away (0).
  const [activeSet, setActiveSet] = useState<0 | 1 | 2>(0);
  const handleArrive = useCallback(() => setActiveSet(0), []);
  // The kit as the showcases and his inventory picture show it: the set in hand, or set 1.
  const equipment = useMemo(() => wornOf(inv, activeSet || 1), [inv, activeSet]);
  // His stats: the class's base attributes plus what he wears and the set in hand (gear is growth).
  // His perks and skill for this class (skills.ts), picked in the lobby's Class tab.
  const [loadoutRev, setLoadoutRev] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadout = useMemo(() => loadLoadout(heroClass), [heroClass, loadoutRev]);
  const pickLoadout = useCallback(
    (l: Loadout) => {
      saveLoadout(heroClass, l);
      setLoadoutRev((r) => r + 1);
    },
    [heroClass]
  );
  const skillAskRef = useRef(false);
  const reloadTouchRef = useRef(false);
  const [skillHud, setSkillHud] = useState<SkillHud>({ cd: 0, total: 0, active: 0 });
  const skillDef = skillById(loadout.skill);
  const stats = useMemo(() => computeStats(classById(heroClass).attributes, inv.equipped, activeSet || 1, loadout.perks), [heroClass, inv.equipped, activeSet, loadout.perks]);
  // His spells as far as his memory holds them (gear can raise or lower it).
  const spells = useMemo(() => fitSpells(loadout.spells, stats.memoryCapacity), [loadout.spells, stats.memoryCapacity]);
  const spellAskRef = useRef(-1);
  const restAskRef = useRef(false);
  const [spellHud, setSpellHud] = useState<SpellHud>(NO_SPELLS);
  const statsNowRef = useRef(stats);
  statsNowRef.current = stats;
  const arrows = arrowCount(inv);
  const held = heldOf(inv, activeSet);
  const bowInHand = held.bow;
  const heldBow = held.bow ? held.main : null;
  const heldSpec = bowSpec(heldBow?.id);
  const activeSetRef = useRef(activeSet);
  activeSetRef.current = activeSet;
  const heldSpecRef = useRef(heldSpec);
  heldSpecRef.current = heldSpec;
  // The bow: a loaded arrow leaves it; R loads it from the bag; arrows picked up go to the bag.
  const handleArrowShot = useCallback(() => setInv((v) => shootLoaded(v, activeSetRef.current)), []);
  const handleReload = useCallback(() => {
    const spec = heldSpecRef.current;
    if (spec) setInv((v) => loadBow(v, activeSetRef.current, spec.capacity));
    setReloading(null);
  }, []);
  const handleArrowsPicked = useCallback((n: number) => {
    setInv((v) => addArrows(v, n));
    setToast(n === 1 ? "Picked up an arrow" : `Picked up ${n} arrows`);
  }, []);
  const [reloading, setReloading] = useState<{ key: number; seconds: number } | null>(null);
  const handleReloadStart = useCallback((seconds: number) => setReloading({ key: performance.now(), seconds }), []);
  const handleBowHint = useCallback((text: string) => setToast(text), []);
  const tavernDoorQueueRef = useRef<"in" | "out" | null>(null);
  const regenQueueRef = useRef<{ amount: number; seconds: number } | null>(null);
  // The merchant he is trading with (index into MERCHANTS), and the chest or man being searched.
  const [shopMerchant, setShopMerchant] = useState(0);
  const [lootId, setLootId] = useState<string | null>(null);
  const [, setLootVersion] = useState(0);
  const containersRef = useRef(new Map<string, Container>());
  const doorQueueRef = useRef(-1);
  const healQueueRef = useRef(0);
  const interactRef = useRef<Interact | null>(null);
  interactRef.current = hud.interact;
  // Pictures of the items that are not part of his kit (rendered once from their models).
  const [itemPics, setItemPics] = useState<Record<string, string>>({});
  useEffect(() => {
    let on = true;
    itemIcons((sofar) => on && setItemPics(sofar))
      .then((pics) => on && setItemPics(pics))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  // What has the screen: the game, the Esc menu, the inventory (Tab) or the character screen.
  // Back in a run he left open: the Esc menu over the floor (Resume), not the class screen.
  const [screen, setScreen] = useState<Screen>(() => (resumeRun && account ? "menu" : "class"));
  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  // The lobby (lobby/): where he is between dives, without the town or the dungeon built. The game
  // opens on it (after the class screen), and he can come back to it from anywhere in the game.
  const [inLobby, setInLobby] = useState(() => !(resumeRun && account));
  const inLobbyRef = useRef(inLobby);
  inLobbyRef.current = inLobby;
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>("play");
  // A screen opened from a lobby tab: a merchant, a stash chest, his gear, or the user list.
  type LobbySub = { kind: "shop"; i: number } | { kind: "gear" } | { kind: "users" } | null;
  const [lobbySub, setLobbySub] = useState<LobbySub>(null);
  const lobbyAnchorsRef = useRef<Array<HTMLElement | null>>([]);
  const [lobbyPortrait, setLobbyPortrait] = useState<FrameRect | null>(null);
  // Leaving the lobby from the dungeon gives up the run: asked first.
  const [lobbyAsk, setLobbyAsk] = useState(false);
  stashOpenRef.current = screen === "loot" && stashAt ? stashAt : null;
  const customizing = screen === "character";
  // The inventory no longer takes the view: it is an overlay with its own picture of him.
  const showcasing = screen === "class" || customizing;
  const portraitViewRef = useRef({ spin: 0, zoom: 1 });
  // A greeting by name once the tavern is up.
  const welcomedRef = useRef(false);
  useEffect(() => {
    if (hud.loading || welcomedRef.current || place !== "town" || screen !== "play") return;
    welcomedRef.current = true;
    // A run left open last time that could not be picked up again is lost, as a death would be.
    if (startRun?.kind === "lost") {
      setToast(
        startRun.why === "fell"
          ? "You fell in the dungeon last time. What you found on that floor is lost."
          : "The dungeon closed while you were away. What you found on that floor is lost.",
      );
      return;
    }
    setToast(`Welcome to the Wayfarer's Rest, ${spec.name || profile.name}. The gate to the dungeon is at the end of the market street.`);
  }, [hud.loading, place, spec.name, profile, screen, startRun]);
  // Back in a run left open: how long the dungeon stays open.
  const resumeNotedRef = useRef(false);
  useEffect(() => {
    if (resumeNotedRef.current || hud.loading || place !== "dungeon" || !resumedRef.current) return;
    resumeNotedRef.current = true;
    const s = hud.runLeft;
    setToast(`Back in ${hud.name}. ${Math.floor(s / 60)}:${s % 60 < 10 ? "0" : ""}${s % 60} left before the dungeon closes.`);
  }, [hud.loading, hud.name, hud.runLeft, place]);
  // The run's record (runSave.ts): over once he is back in town or out through a portal; marked when
  // he falls (coming back then counts as the death it was).
  useEffect(() => {
    if (place === "town") endRun();
  }, [place]);
  useEffect(() => {
    if (place === "dungeon" && hud.dead) markRunDead();
  }, [place, hud.dead]);
  useEffect(() => {
    if (hud.escaped) endRun();
  }, [hud.escaped]);
  const [characterBusy, setCharacterBusy] = useState(true);
  const [customTab, setCustomTab] = useState<CustomizerTab>("face");
  const [icons, setIcons] = useState<Record<string, string>>({});
  // Icons are wanted from the start: the hotbar shows the sword, the shield and the belt.
  const iconsWanted = true;
  const allIcons = useMemo(() => ({ ...itemPics, ...icons }), [itemPics, icons]);
  const [inventoryFrame, setInventoryFrame] = useState<FrameRect>(() => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }));
  const lockLostAtRef = useRef(-1e9);
  // While the face or hair is being edited the helm comes off (without changing the loadout).
  // In play the weapons show only when drawn; the inventory and character screens show the whole kit.
  const shownEquipment = useMemo<ArmorEquipment>(() => {
    const held = showcasing ? equipment : wornOf(inv, activeSet);
    return customizing && (customTab === "face" || customTab === "hair") ? { ...held, helm: false } : held;
  }, [customizing, showcasing, customTab, equipment, inv, activeSet]);
  const showcaseRef = useRef<Showcase>({ spin: 0, zoom: SHOW_ZOOM.body, lift: 0 });
  useEffect(() => saveCharacter(spec, equipment), [spec, equipment]);
  const handleCharacterBusy = useCallback((b: boolean) => setCharacterBusy(b), []);
  const openScreen = useCallback((next: Screen) => {
    if (next === screenRef.current) return;
    if (next === "character") {
      showcaseRef.current.zoom = SHOW_ZOOM.face;
      showcaseRef.current.lift = 0;
      setCustomTab("face");
    } else if (next === "inventory") {
      showcaseRef.current.zoom = SHOW_ZOOM.body;
      showcaseRef.current.lift = 0;
    }
    // Set before letting the mouse go, so losing the pointer lock here doesn't open the menu.
    screenRef.current = next;
    setScreen(next);
    if (next !== "play" && document.pointerLockElement) document.exitPointerLock?.();
  }, []);
  const isTouchUIRef = useRef(false);
  const resume = useCallback(() => {
    openScreen("play");
    // Take the mouse back straight away on desktop (the browser may refuse just after an Esc).
    const canvas = document.querySelector("canvas");
    if (canvas && !isTouchUIRef.current && !document.pointerLockElement) {
      try {
        const r = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
        r?.catch?.(() => {});
      } catch {
        // Click the view to capture it instead.
      }
    }
  }, [openScreen]);
  // Switching apps (or tabs) pauses: the Esc menu opens, which also stops the run clock.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && screenRef.current === "play") openScreen("menu");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [openScreen]);
  // The screen stays awake while he plays (phones dim and lock otherwise); asked again on return.
  useEffect(() => {
    if (screen !== "play") return;
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } };
    if (!nav.wakeLock) return;
    let lock: Sentinel | null = null;
    let on = true;
    const ask = () => {
      if (document.visibilityState !== "visible") return;
      nav.wakeLock
        ?.request("screen")
        .then((l) => {
          if (on) lock = l;
          else void l.release();
        })
        .catch(() => {});
    };
    ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      on = false;
      document.removeEventListener("visibilitychange", ask);
      void lock?.release().catch(() => {});
    };
  }, [screen]);
  // On the hub: he joins once past the class screen, and his looks follow him (a moment after a
  // change, so dragging armour about sends one update).
  const joinedRef = useRef(false);
  useEffect(() => {
    if (screen === "class") return;
    const t = window.setTimeout(() => {
      const look = { spec, eq: shownEquipment };
      const name = spec.name || profile.name;
      if (!joinedRef.current) {
        joinedRef.current = true;
        mp.connect({ name, cls: heroClass, token: account?.token ?? null, look, zone: inLobbyRef.current ? "lobby" : "in", key: profile.id, place: placeRef.current === "dungeon" ? "run" : "town", run: null });
      } else mp.setLook(look, heroClass, name);
    }, 400);
    return () => window.clearTimeout(t);
  }, [screen, spec, shownEquipment, heroClass, account, profile.name, profile.id]);
  // The party leader stepped onto the teleporter: everyone of the party in town goes down with him,
  // to the same floor (seed, rooms, theme and life are the run's).
  useEffect(
    () =>
      mp.on("run", (m) => {
        const run = m.run as RunView;
        if (placeRef.current !== "town" || !run.status[mp.state.me ?? ""]) return;
        if (coopRef.current?.run.id === run.id) return;
        coopRef.current?.dispose();
        coopRef.current = createCoop(run);
        mp.setRun(run.id);
        setCoopRun(run.id);
        setWatchPick(0);
        setSeed(run.seed);
        setRoomCount(run.rooms);
        setTheme(VALID_THEMES.indexOf(run.theme as ThemeName) !== -1 ? (run.theme as ThemeName) : "verdant");
        setLife(run.life);
        setPlace("dungeon");
        setFlashKey((k) => k + 1);
        if (screenRef.current !== "play" && screenRef.current !== "class") resume();
        const others = run.members.filter((id) => id !== mp.state.me).map((id) => mp.nameOf(id));
        setToast(others.length ? `Into the dungeon with ${others.join(", ")}.` : "Into the dungeon.");
      }),
    [resume]
  );
  // His window hidden in a party's dive (another tab, another app, minimised): his game pauses, so
  // the others are told; a teammate takes over the monsters and they leave him be till he is back.
  useEffect(() => {
    if (!coopRun) return;
    const tell = () => mp.away(document.visibilityState === "hidden");
    tell();
    document.addEventListener("visibilitychange", tell);
    return () => {
      document.removeEventListener("visibilitychange", tell);
      mp.away(false);
    };
  }, [coopRun]);
  // How he stands in the party's dive: down (the others see it, and he can watch them), and out
  // (through a portal, or back in town), which ends the party's link to this floor for him.
  useEffect(() => {
    if (coopRun && place === "dungeon" && hud.dead) mp.runStatus("dead");
  }, [coopRun, place, hud.dead]);
  useEffect(() => {
    if (coopRun && hud.escaped) mp.runStatus("out");
  }, [coopRun, hud.escaped]);
  useEffect(() => {
    if (place !== "town" || !coopRef.current) return;
    mp.runStatus("out");
    mp.setRun(null);
    coopRef.current.dispose();
    coopRef.current = null;
    setCoopRun(null);
  }, [place]);
  // Down in a party's dive with a teammate still fighting: the camera follows one of them.
  const runNow = coopRun ? (mpState.party?.run ?? coopRef.current?.run ?? null) : null;
  const watchable = runNow && hud.dead ? runNow.members.filter((id) => id !== mpState.me && runNow.status[id] === "in") : [];
  const watchId = watchable.length ? watchable[watchPick % watchable.length] : null;
  spectateRef.current = watchId;

  // Down through the teleporter: a fresh floor every dive. In a party only the leader can take it,
  // and he takes everyone with him (the hub sends the run back to all of them, him included).
  const descend = useCallback(() => {
    const party = mp.state.party;
    if (party && party.members.length > 1 && mp.state.status === "online") {
      // The party is already down there: he follows them (if he may), else he waits for them.
      if (party.run) {
        if (mp.canJoinRun()) {
          setToast("Joining your party in the dungeon...");
          mp.joinRun();
        } else setToast("You are out of this dive. Wait for your party to come back up (P to see where they are).");
        return;
      }
      if (party.leader !== mp.state.me) {
        setToast(`${mp.nameOf(party.leader)} leads your party: the dive starts when they step onto the teleporter. (P to leave the party.)`);
        return;
      }
      const f = floorRef.current;
      mp.startRun((((f.seed * 1664525 + 1013904223) >>> 0) % 99998) + 1, f.roomCount, f.theme, f.life);
      return;
    }
    setSeed((s) => ((s * 1664525 + 1013904223) >>> 0) % 99999);
    setPlace("dungeon");
    setFlashKey((k) => k + 1);
  }, []);
  /** Rent room `ri` upstairs (at its door in town, or from the lobby's stash tab). */
  const rentRoom = useCallback((ri: number) => {
    const room = Town.ROOMS[ri];
    if (invRef.current.gold < room.rent) {
      setToast(`Not enough gold: ${room.name} is ${room.rent} gold.`);
      return;
    }
    setInv((v) => ({ ...v, gold: v.gold - room.rent }));
    setTownSave((t) => withRented(t, ri));
    setToast(`${room.name} is yours. Its three chests keep what you leave in them between dives.`);
  }, []);

  // ---- The lobby, and the way in and out of it ------------------------------------------------------
  const hudRef = useRef(hud);
  hudRef.current = hud;
  /** Out of the lobby into the game (the town or the dungeon is built now). */
  const leaveLobby = useCallback(
    (loading: string) => {
      setLobbySub(null);
      setLobbyAsk(false);
      setHud((h) => ({ ...h, loading, dead: false, escaped: false, interact: null }));
      setInLobby(false);
      openScreen("play");
    },
    [openScreen]
  );
  /** Into the Guild Tavern, on his feet. */
  const enterTavern = useCallback(() => {
    goToTown("tavern");
    leaveLobby("Opening the tavern doors...");
  }, [goToTown, leaveLobby]);
  // A dive started from the lobby (his own, or his party leader's): the game takes over.
  useEffect(() => {
    if (place === "dungeon" && inLobby) leaveLobby("Going down...");
  }, [place, inLobby, leaveLobby]);
  /**
   * Back to the lobby from anywhere. From a dive this gives it up the way falling does: what he
   * found on this floor is lost (he keeps what he carried in).
   */
  const goLobby = useCallback(() => {
    setLobbyAsk(false);
    if (placeRef.current === "dungeon") {
      const h = hudRef.current;
      if (!h.escaped) setInv(runStartRef.current);
      if (h.dead) setLife((l) => l + 1);
      // Up to town without the teleport's flash: the lobby is not a place he walks into.
      setArrival("tavern");
      setTownVisit((v) => v + 1);
      setPlace("town");
    }
    if (trade.state.session) trade.cancel();
    setChatOpen(false);
    setLobbyTab("play");
    setLobbySub(null);
    setInLobby(true);
    openScreen("lobby");
  }, [openScreen]);
  /** The Lobby buttons: mid-dive he is asked first. */
  const askLobby = useCallback(() => {
    const h = hudRef.current;
    if (placeRef.current === "dungeon" && !h.dead && !h.escaped) {
      if (screenRef.current === "play") openScreen("menu");
      setLobbyAsk(true);
    } else goLobby();
  }, [goLobby, openScreen]);
  // Others see him at the lobby's table, not standing about the tavern.
  useEffect(() => {
    if (inLobby && mpState.status === "online") mp.setWhere("town", "lobby");
  }, [inLobby, mpState.status]);
  // Trading (net/trade.ts): what he holds, room in his bag, and the swap itself.
  const tradeState = useTrade();
  useEffect(() => {
    const without = (bag: Grid, give: ItemInst[]) => give.reduce((b, it) => removeItem(b, it.uid), bag);
    trade.setBank({
      canTrade: () => placeRef.current !== "dungeon",
      has: (give, gold) => {
        const v = invRef.current;
        return gold <= v.gold && give.every((it) => v.bag.items.some((q) => q.item.uid === it.uid));
      },
      canTake: (give, get) => {
        let b: Grid | null = without(invRef.current.bag, give);
        for (const it of get) if (b && def(it.id).category !== "coins") b = addItem(b, it);
        return !!b;
      },
      apply: (give, gold, get, getGold) =>
        setInv((v) => {
          let bag = without(v.bag, give);
          let g = v.gold - gold + getGold;
          for (const it of get) {
            if (def(it.id).category === "coins") g += it.qty ?? 1;
            // A fresh id here: his own items never share one with what came in.
            else bag = addItem(bag, { ...it, uid: newItem(it.id).uid }) ?? bag;
          }
          return { ...v, bag, gold: Math.max(0, g) };
        }),
      notice: (t) => setToast(t),
    });
    return () => trade.setBank(null);
  }, []);
  // A trade in the game takes the screen (he stops, the mouse is let go) until it closes.
  useEffect(() => {
    if (tradeState.session && screenRef.current === "play") openScreen("trade");
    else if (!tradeState.session && screenRef.current === "trade") resume();
  }, [tradeState.session, openScreen, resume]);

  // E (or the touch button): trade at a stall, open or close a door, search a chest or a fallen man;
  // in town rent a room, work its door, open a stash chest, or step onto the teleporter.
  const interactNow = useCallback(
    (it: Interact | null) => {
      if (!it) return;
      if (it.kind === "trade") {
        setShopMerchant(Number(it.key));
        openScreen("shop");
      } else if (it.kind === "door") doorQueueRef.current = Number(it.key);
      else if (it.kind === "portal") escapeQueueRef.current = true;
      else if (it.kind === "teleport") descend();
      else if (it.kind === "player") mp.invite(it.key);
      else if (it.kind === "quest") openScreen("quests");
      else if (it.kind === "tavernDoor") {
        // The screen goes dark, he steps through while it is, and the other side fades in.
        setDoorFadeKey((k) => k + 1);
        const to = it.key === "out" ? "out" : "in";
        window.setTimeout(() => {
          tavernDoorQueueRef.current = to;
        }, 230);
      }
      else if (it.kind === "roomdoor") roomDoorQueueRef.current = Number(it.key);
      else if (it.kind === "rent") rentRoom(Number(it.key)); else if (it.kind === "stash") {
        const [room, slot] = it.key.split(":").map(Number);
        setStashAt({ room, slot });
        setLootId(null);
        openScreen("loot");
      } else {
        const box = containersRef.current.get(it.key);
        if (!box) return;
        box.seen = true;
        setStashAt(null);
        setLootId(it.key);
        openScreen("loot");
      }
    },
    [openScreen, descend, rentRoom]
  );
  const handleShowcaseView = useCallback((v: ShowcaseView) => {
    showcaseRef.current.zoom = SHOW_ZOOM[v];
    showcaseRef.current.lift = 0;
  }, []);

  const handleHudUpdate = useCallback((patch: Partial<HudInfo>) => {
    setHud((prev) => ({ ...prev, ...patch }));
  }, []);

  isTouchUIRef.current = isTouchUI;

  // Esc while the mouse is captured only releases it (the browser keeps that key), so losing the
  // lock during play opens the menu, the way Esc does otherwise.
  useEffect(() => {
    let locked = !!document.pointerLockElement;
    const onChange = () => {
      const now = !!document.pointerLockElement;
      if (locked && !now && screenRef.current === "play" && !runOverRef.current) {
        lockLostAtRef.current = performance.now();
        openScreen("menu");
      }
      locked = now;
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, [openScreen]);

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
      // Typing in the chat (or any box) is not a shortcut.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // The class screen and the lobby take no game shortcuts (Enter is the class screen's own).
      if (screenRef.current === "class" || screenRef.current === "lobby" || inLobbyRef.current) {
        if (e.code === "Tab") e.preventDefault();
        // At the lobby's table Y and N still answer a party invite.
        const ask = mp.state.invites[0];
        if (ask && screenRef.current === "lobby" && !e.repeat && (e.code === "KeyY" || e.code === "KeyN")) mp.answer(ask.from, e.code === "KeyY");
        return;
      }
      // The trade window: Esc closes it (calls the trade off); nothing else reaches the game.
      if (screenRef.current === "trade") {
        if (e.code === "Tab") e.preventDefault();
        if (e.code === "Escape" && !e.repeat) trade.cancel();
        return;
      }
      // Tab opens and closes the inventory (and never moves keyboard focus).
      if (e.code === "Tab") {
        e.preventDefault();
        if (!e.repeat) {
          if (screenRef.current === "inventory") resume();
          else openScreen("inventory");
        }
        return;
      }
      if (e.repeat) return;
      // Esc: the game opens the menu; the menu and the inventory close; the character screen goes back to the menu.
      if (e.code === "Escape") {
        // The same press that just released the mouse (and opened the menu) is not a second one.
        if (performance.now() - lockLostAtRef.current < 300) return;
        const cur = screenRef.current;
        if (cur === "play" || cur === "character") openScreen("menu");
        else if (cur === "menu" || cur === "shop" || cur === "loot" || cur === "party" || cur === "quests") resume();
        else openScreen("play");
        return;
      }
      // E: trade, search, loot, open or close what is in front of him (and E again walks away).
      if (e.code === "KeyE") {
        if (screenRef.current === "shop" || screenRef.current === "loot" || screenRef.current === "quests") resume();
        else if (screenRef.current === "play") interactNow(interactRef.current);
        return;
      }
      // P opens and closes the party finder; Y and N answer an invite.
      if (e.code === "KeyP" && (screenRef.current === "play" || screenRef.current === "party")) {
        if (screenRef.current === "party") resume();
        else openScreen("party");
        return;
      }
      const invite = mp.state.invites[0];
      if (invite && (e.code === "KeyY" || e.code === "KeyN")) {
        mp.answer(invite.from, e.code === "KeyY");
        return;
      }
      // J: follow the party into its dive under way.
      if (e.code === "KeyJ" && placeRef.current === "town" && mp.canJoinRun()) {
        mp.joinRun();
        return;
      }
      if (screenRef.current !== "play") return;
      // T at another player: ask him to trade.
      if (e.code === "KeyT") {
        const it = interactRef.current;
        if (it?.kind === "player") trade.ask(it.key);
        else setToast(placeRef.current === "dungeon" ? "No trading in the dungeon." : "Walk up to another player and press T to trade.");
        return;
      }
      // Enter: say something.
      if (e.code === "Enter" && mp.state.status !== "off") {
        e.preventDefault();
        setChatOpen(true);
        return;
      }
      // H lifts the helm off, so the face under it shows in third person.
      if (e.code === "KeyH") {
        setInv((v) => {
          if (v.equipped.helm) return unequipToBag(v, "helm") ?? v;
          const h = v.bag.items.find((q) => q.item.id === "helm");
          return h ? (equipFromBag(v, h.item.uid) ?? v) : v;
        });
      }
      if (e.code === "KeyV") setFirstPerson((v) => !v);
      if (e.code === "KeyI") setHudOpen((v) => !v);
      if (e.code === "Digit1") toggleDraw(1);
      if (e.code === "Digit2") toggleDraw(2);
      if (e.code === "Digit3") applyBeltSlot(0);
      if (e.code === "Digit4") applyBeltSlot(1);
      if (e.code === "KeyM") setShowMap((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openScreen, resume, interactNow, toggleDraw, applyBeltSlot]);

  const isPortrait = viewport.h > viewport.w;
  const isCompact = viewport.w < 760 || viewport.h < 520;
  const mobileMode = isTouchUI || isCompact;
  // A phone held sideways is short: a smaller minimap keeps clear of the touch buttons under it.
  const mapPixels = isPortrait ? 94 : mobileMode ? (viewport.h < 400 ? 96 : 112) : 156;
  // Character screen: panel on the right and the paladin on the left; on narrow portrait screens
  // the panel takes the bottom half instead.
  const panel: PanelLayout =
    isPortrait && viewport.w < 700
      ? { side: "bottom", size: Math.round(viewport.h * 0.5) }
      : { side: "right", size: Math.round(Math.min(400, Math.max(280, viewport.w * 0.42))) };
  const showGameHud = screen === "play";
  const shopCompact = isPortrait && viewport.w < 700;
  const tradeFrame = useMemo<FrameRect | null>(
    () =>
      screen !== "shop"
        ? null
        : shopCompact
          ? { left: 0, top: 0, width: viewport.w, height: Math.round(viewport.h * 0.38) }
          : { left: 0, top: 0, width: Math.max(200, viewport.w - Math.min(460, viewport.w * 0.46)), height: viewport.h },
    [screen, shopCompact, viewport.w, viewport.h]
  );
  const panelFrame: FrameRect =
    panel.side === "right"
      ? { left: 0, top: 0, width: viewport.w - panel.size, height: viewport.h }
      : { left: 0, top: 0, width: viewport.w, height: viewport.h - panel.size };
  const nextSeed = () => setSeed((s) => ((s * 1664525 + 1013904223) >>> 0) % 99999);
  // Below, these leave the floor mid-run (abandoned); in town they only set up the next dive.
  const leaveFloor = (go: () => void) => {
    if (place === "dungeon" && !hud.escaped) abandonRun();
    if (place === "dungeon" && coopRun) {
      goToTown("gate");
      return;
    }
    go();
  };
  const nextTheme = () => {
    const order: ThemeName[] = ["verdant", "ancient", "molten", "frost", "grim"];
    leaveFloor(() => setTheme((cur) => order[(order.indexOf(cur) + 1) % order.length]));
  };
  // What this run has gained over what he came in with (lost if he dies, kept if he escapes).
  const runGain = (() => {
    const start = runStartRef.current;
    const had = new Set<string>();
    for (const q of start.bag.items) had.add(q.item.uid);
    for (const b of start.belt || []) if (b) had.add(b.uid);
    for (const k of Object.keys(start.equipped) as ArmorSlot[]) {
      const it = start.equipped[k];
      if (it) had.add(it.uid);
    }
    let items = 0;
    for (const q of inv.bag.items) if (!had.has(q.item.uid)) items++;
    for (const b of inv.belt || []) if (b && !had.has(b.uid)) items++;
    for (const k of Object.keys(inv.equipped) as ArmorSlot[]) {
      const it = inv.equipped[k];
      if (it && !had.has(it.uid)) items++;
    }
    return { gold: inv.gold - start.gold, items };
  })();
  const clock = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60 < 10 ? "0" : "") + (sec % 60)}`;
  const haul = (g: { gold: number; items: number }) =>
    `${g.gold > 0 ? `${g.gold} gold` : ""}${g.gold > 0 && g.items > 0 ? " and " : ""}${g.items > 0 ? `${g.items} item${g.items > 1 ? "s" : ""}` : ""}`;
  // Out through a portal: back on the dais in town with what he carried.
  const runGainRef = useRef(runGain);
  runGainRef.current = runGain;
  const escapedNow = hud.escaped && !hud.dead && place === "dungeon";
  useEffect(() => {
    if (!escapedNow) return;
    handleQuestEvent({ type: "escape", party: !!coopRef.current && coopRef.current.run.members.length > 1 });
    const g = runGainRef.current;
    setToast(g.gold > 0 || g.items > 0 ? `Back through the gate. You keep ${haul(g)} from the dungeon.` : "Back through the gate, empty-handed.");
    goToTown("gate");
  }, [escapedNow, goToTown, handleQuestEvent]);
  const runElapsed = RUN_SECONDS - hud.runLeft;
  const portalsIn = Math.max(0, PORTALS_FROM - runElapsed);

  // The guild's quests, at the representative's desk or on the lobby's tab.
  const questActions = {
    onAccept: (id: string) => setQuests((q) => acceptQuest(q, id)),
    onAbandon: (id: string) => setQuests((q) => abandonQuest(q, id)),
    onTurnIn: (id: string) => {
      const r = turnInQuest(quests, id);
      if (!r.reward) return;
      setQuests(r.state);
      setInv((v) => ({ ...v, gold: v.gold + r.reward }));
      setToast(`The guild pays you ${r.reward} gold.`);
    },
  };
  // The lobby's table: his party in the other chairs (as they look in the game), and what Start does.
  const tableKit = useMemo(() => wornOf(inv, 0), [inv]);
  const lobbyGuests = useMemo<Array<Guest | null>>(() => {
    const out: Array<Guest | null> = [null, null, null];
    const party = mpState.party;
    if (!party) return out;
    let i = 0;
    for (const id of party.members) {
      if (id === mpState.me || i >= 3) continue;
      const pl = mpState.players.get(id);
      out[i++] = pl?.look ? { id, spec: pl.look.spec, eq: pl.look.eq } : null;
    }
    return out;
  }, [mpState.party, mpState.players, mpState.me]);
  const lobbySeated = (() => {
    const out: Array<string | null> = [null, null, null];
    const party = mpState.party;
    if (!party) return out;
    let i = 0;
    for (const id of party.members) if (id !== mpState.me && i < 3) out[i++] = mp.nameOf(id);
    return out;
  })();
  const lobbyParty = mpState.status === "online" && mpState.party && mpState.party.members.length > 1 ? mpState.party : null;
  const lobbyStartNote = !lobbyParty
    ? null
    : lobbyParty.run
      ? mp.canJoinRun()
        ? null
        : "Your party is in the dungeon. Wait for them to come back up."
      : lobbyParty.leader !== mpState.me
        ? `${mp.nameOf(lobbyParty.leader)} leads your party: the dive starts when they take the party down.`
        : null;
  const gearCompact = isPortrait || viewport.w < 760;

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
      {inLobby ? null : (
      <Canvas
        flat
        linear
        dpr={quality.dpr}
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
          spec={spec}
          equipment={shownEquipment}
          weaponDamage={stats.swordDamage}
          stats={stats}
          bowInHand={bowInHand}
          bowId={heldBow?.id ?? null}
          bowDamage={stats.bowDamage}
          loaded={heldBow?.loaded ?? 0}
          arrows={arrows}
          onArrowShot={handleArrowShot}
          onReload={handleReload}
          onArrowsPicked={handleArrowsPicked}
          onReloadStart={handleReloadStart}
          onBowHint={handleBowHint}
          skill={loadout.skill}
          skillAskRef={skillAskRef}
          reloadTouchRef={reloadTouchRef}
          onSkillState={setSkillHud}
          spells={spells}
          spellAskRef={spellAskRef}
          restAskRef={restAskRef}
          onSpellState={setSpellHud}
          crosshairRef={crosshairRef}
          customizing={showcasing}
          playing={screen === "play"}
          freeMove={screen === "inventory"}
          portraitRect={screen === "inventory" && !(isPortrait || viewport.w < 760) ? inventoryFrame : null}
          kit={equipment}
          portraitViewRef={portraitViewRef}
          showcaseRef={showcaseRef}
          frame={customizing || screen === "class" ? panelFrame : inventoryFrame}
          onCharacterBusy={handleCharacterBusy}
          iconsWanted={iconsWanted}
          onIcons={setIcons}
          onHudUpdate={handleHudUpdate}
          life={life}
          platesRef={platesRef}
          onPlayerHurt={handlePlayerHurt}
          containersRef={containersRef}
          doorQueueRef={doorQueueRef}
          healQueueRef={healQueueRef}
          minimapCanvasRef={minimapRef}
          touchMoveRef={touchMoveRef}
          touchSprintRef={touchSprintRef}
          jumpQueueRef={jumpQueueRef}
          attackQueueRef={attackQueueRef}
          attackHeldRef={attackHeldRef}
          groundQueueRef={groundQueueRef}
          touchBlockRef={touchBlockRef}
          onTouchDetected={handleTouchDetected}
          trading={screen === "shop" ? shopMerchant : -1}
          tradeFrame={tradeFrame}
          clockRunning={place === "dungeon" && screen !== "menu" && screen !== "character"}
          escapeQueueRef={escapeQueueRef}
          onFloorReady={handleFloorReady}
          quality={quality}
          frameCap={graphics.frameCap}
          autoRes={graphics.autoRes}
          perf={perfMode}
          resume={resumeRun}
          place={place}
          arrival={arrival}
          townVisit={townVisit}
          rentedRef={rentedRef}
          roomDoorQueueRef={roomDoorQueueRef}
          stashOpenRef={stashOpenRef}
          tavernDoorQueueRef={tavernDoorQueueRef}
          regenQueueRef={regenQueueRef}
          onArrive={handleArrive}
          coopRef={coopRef}
          onPileNews={setLootVersion}
          spectateRef={spectateRef}
          remoteLayerRef={remoteLayerRef}
          onQuestEvent={handleQuestEvent}
          onArenaEvent={handleArenaEvent}
        />
      </Canvas>
      )}

      {inLobby ? (
        <LobbyView
          spec={spec}
          kit={tableKit}
          fullKit={equipment}
          mode={screen === "class" ? "class" : "table"}
          classFrame={panelFrame}
          guests={lobbyGuests}
          portraitRect={lobbySub?.kind === "gear" && !gearCompact ? lobbyPortrait : null}
          portraitView={portraitViewRef.current}
          anchorsRef={lobbyAnchorsRef}
          onBusy={handleCharacterBusy}
          onIcons={setIcons}
        />
      ) : null}
      {inLobby && screen === "lobby" ? (
        <>
          {lobbySub && lobbySub.kind !== "users" ? null : (
            <LobbyChrome
              tab={lobbyTab}
              onTab={(t) => {
                setLobbyTab(t);
                setLobbySub(null);
              }}
              name={spec.name || profile.name}
              gold={inv.gold}
              compact={mobileMode}
              touch={isTouchUI}
              anchorsRef={lobbyAnchorsRef}
              seated={lobbySeated}
              onStart={descend}
              onTavern={enterTavern}
              startNote={lobbyStartNote}
              themeLabel={THEMES[theme].label}
              onUsers={() => setLobbySub({ kind: "users" })}
              onClassChange={() => openScreen("class")}
              onFullscreen={isTouchUI ? () => void enterLandscapeMode() : undefined}
            />
          )}
          {lobbyTab === "class" ? <ClassPage cls={heroClass} stats={stats} base={classById(heroClass).attributes} compact={mobileMode} onChange={() => openScreen("class")} loadout={loadout} onLoadout={pickLoadout} /> : null}
          {lobbyTab === "stash" && !lobbySub ? (
            <StashScreen
              top={TAB_BAR}
              town={townSave}
              setTown={setTownSave}
              inv={inv}
              onInv={setInv}
              onRent={rentRoom}
              onGear={() => setLobbySub({ kind: "gear" })}
              icons={allIcons}
              viewport={viewport}
              compact={gearCompact}
              touch={isTouchUI}
            />
          ) : null}
          {lobbySub?.kind === "gear" ? (
            <InventoryScreen
              name={spec.name}
              heroClass={className}
              stats={stats}
              base={classById(heroClass).attributes}
              inv={inv}
              onInv={setInv}
              onUse={(item) => setInv((v) => ({ ...v, bag: removeItem(v.bag, item.uid) }))}
              icons={allIcons}
              viewport={viewport}
              compact={gearCompact}
              touch={isTouchUI}
              onModelRect={setLobbyPortrait}
              onTurn={(dx) => {
                portraitViewRef.current.spin += dx * 0.012;
              }}
              onZoom={(dy) => {
                const v = portraitViewRef.current;
                v.zoom = Math.max(0.35, Math.min(1.1, v.zoom * Math.exp(dy * 0.0012)));
              }}
              onGround={() => setToast("Nothing to drop it on here. Sell it to a merchant or keep it in your stash.")}
              onClose={() => setLobbySub(null)}
            />
          ) : null}
          {lobbyTab === "merchants" && !lobbySub ? <MerchantsPage compact={mobileMode} onOpen={(i) => setLobbySub({ kind: "shop", i })} /> : null}
          {lobbySub?.kind === "shop" ? <ShopScreen merchant={MERCHANTS[lobbySub.i]} inv={inv} onInv={setInv} icons={allIcons} compact={shopCompact} touch={isTouchUI} onClose={() => setLobbySub(null)} /> : null}
          {lobbyTab === "quests" ? <QuestScreen quests={quests} compact={mobileMode} onClose={() => setLobbyTab("play")} {...questActions} /> : null}
          {lobbyTab === "trade" ? <TradePage compact={mobileMode} /> : null}
          {lobbySub?.kind === "users" ? <PartyScreen onClose={() => setLobbySub(null)} compact={mobileMode} inDungeon={false} /> : null}
        </>
      ) : null}
      {lobbyAsk ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(14,12,10,0.96)", border: "1px solid rgba(214,186,128,0.4)", borderRadius: 4, padding: 22, width: "min(92vw, 440px)", color: "#e8dcc0", textAlign: "center" }}>
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "#f3e6c4", marginBottom: 10 }}>Back to the lobby?</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#d8c9a8" }}>
              Leaving now forfeits this dive, the same as falling in it: everything you found on this floor is lost.
              {runGain.gold > 0 || runGain.items > 0 ? <div style={{ color: "#f0b0a0", marginTop: 6 }}>You would lose {haul(runGain)}.</div> : null}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
              <button type="button" onClick={goLobby} style={{ background: "#6b1f1a", color: "#fff", border: "1px solid #b3201a", borderRadius: 3, padding: "9px 18px", fontWeight: 700, cursor: "pointer" }}>
                Forfeit and leave
              </button>
              <button type="button" onClick={() => setLobbyAsk(false)} style={{ background: "rgba(30,27,23,0.95)", color: "#eee3c8", border: "1px solid rgba(214,186,128,0.4)", borderRadius: 3, padding: "9px 18px", fontWeight: 700, cursor: "pointer" }}>
                Stay
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {customizing ? (
        <CharacterCustomizer
          spec={spec}
          onSpec={setSpec}
          busy={characterBusy}
          layout={panel}
          tab={customTab}
          onTab={setCustomTab}
          onView={handleShowcaseView}
          onClose={() => openScreen("menu")}
        />
      ) : null}

      {screen === "class" && (inLobby || !hud.loading) && !account ? (
        <AccountPrompt
          playerId={profile.id}
          initial={retakeName ?? ""}
          notice={retakeName ? `"${retakeName}" was taken while you were offline. Pick another name.` : undefined}
          onDone={(a) => {
            saveAccount(a);
            setAccount(a);
            setRetakeName(null);
            // The username is his hero's name too.
            profile.name = a.username;
            saveProfile(profile);
            setSpec((sp) => ({ ...sp, name: a.username }));
          }}
        />
      ) : null}

      {screen === "class" && (inLobby || !hud.loading) && account ? (
        <ClassSelect
          name={spec.name || profile.name}
          current={heroClass}
          layout={panel}
          touch={isTouchUI}
          busy={characterBusy}
          onPick={(id) => {
            setHeroClass(id);
            // A class played for the first time brings its own kit (the ranger's bow and arrows).
            setInv((v) => grantClassKit(v, id));
            profile.cls = id;
            saveProfile(profile);
            // From the class screen to the lobby's table (or straight back to the game, if he was in it).
            if (inLobbyRef.current) {
              setLobbyTab("play");
              setLobbySub(null);
              openScreen("lobby");
            } else resume();
          }}
        />
      ) : null}

      {screen === "inventory" ? (
        <InventoryScreen
          name={spec.name}
          heroClass={className}
          stats={stats}
          base={classById(heroClass).attributes}
          inv={inv}
          onInv={setInv}
          onUse={(item) => {
            healQueueRef.current += def(item.id).heal ?? 0;
            setInv((v) => ({ ...v, bag: removeItem(v.bag, item.uid) }));
          }}
          icons={allIcons}
          viewport={viewport}
          compact={isPortrait || viewport.w < 760}
          touch={isTouchUI}
          onModelRect={setInventoryFrame}
          onTurn={(dx) => {
            portraitViewRef.current.spin += dx * 0.012;
          }}
          onZoom={(dy) => {
            const v = portraitViewRef.current;
            v.zoom = Math.max(0.35, Math.min(1.1, v.zoom * Math.exp(dy * 0.0012)));
          }}
          onGround={(item) => groundQueueRef.current.push(item)}
          onClose={resume}
        />
      ) : null}

      {screen === "shop" ? (
        <ShopScreen merchant={MERCHANTS[shopMerchant]} inv={inv} onInv={setInv} icons={allIcons} compact={shopCompact} touch={isTouchUI} onClose={resume} />
      ) : null}

      {screen === "loot" && stashAt ? (
        <LootScreen
          title={`${Town.ROOMS[stashAt.room].name} · Chest ${stashAt.slot + 1}`}
          subtitle="Your stash · kept between dives"
          container={townSave.stash[stashAt.room][stashAt.slot]}
          onContainer={(g) => setTownSave((t) => withStash(t, stashAt.room, stashAt.slot, g))}
          inv={inv}
          onInv={setInv}
          icons={allIcons}
          viewport={viewport}
          compact={isPortrait || viewport.w < 760}
          touch={isTouchUI}
          onClose={resume}
        />
      ) : null}

      {screen === "loot" && !stashAt && lootId && containersRef.current.get(lootId)
        ? (() => {
            const box = containersRef.current.get(lootId) as Container;
            return (
              <LootScreen
                title={box.name}
                subtitle={box.kind === "chest" ? "Searched" : "Fallen · what he carried"}
                container={box.grid}
                onContainer={(g) => {
                  box.grid = g;
                  setLootVersion((n) => n + 1);
                  // A sack on the ground: his party sees what he took from it or put in it.
                  if (box.kind === "pile") coopRef.current?.sendPile({ id: box.id, x: box.x, y: box.y ?? 0, z: box.z, grid: g });
                }}
                inv={inv}
                onInv={setInv}
                icons={allIcons}
                viewport={viewport}
                compact={isPortrait || viewport.w < 760}
                touch={isTouchUI}
                onClose={resume}
              />
            );
          })()
        : null}

      {screen === "menu" ? (
        <PauseMenu
          dungeonName={hud.name}
          touch={isTouchUI}
          onResume={resume}
          onInventory={() => openScreen("inventory")}
          onCharacter={() => openScreen("character")}
          onLobby={askLobby}
          onNewSeed={() => leaveFloor(nextSeed)}
          inTown={place === "town"}
          onTown={
            place === "dungeon" && !hud.dead
              ? () => {
                  abandonRun();
                  openScreen("play");
                  goToTown("gate");
                }
              : undefined
          }
          onTheme={nextTheme}
          themeLabel={THEMES[theme].label}
          rooms={roomCount}
          onRooms={(n) => leaveFloor(() => setRoomCount(n))}
          firstPerson={firstPerson}
          onCamera={() => setFirstPerson((v) => !v)}
          showMap={showMap}
          onMap={() => setShowMap((v) => !v)}
          quality={graphics.quality}
          onQuality={(q) => setGraphics((g) => ({ ...g, quality: q }))}
          showFps={graphics.showFps}
          onFps={() => setGraphics((g) => ({ ...g, showFps: !g.showFps }))}
          frameCap={graphics.frameCap}
          onFrameCap={(c) => setGraphics((g) => ({ ...g, frameCap: c }))}
          autoRes={graphics.autoRes}
          onAutoRes={() => setGraphics((g) => ({ ...g, autoRes: !g.autoRes }))}
          showPerf={perfMode}
          onPerf={() => setGraphics((g) => ({ ...g, showPerf: !perfMode }))}
          backHref={backHref}
        />
      ) : null}

      {/* On phones the minimap is top right too: the details go beside it (sideways) or under it (upright). */}
      {(graphics.showFps || perfMode) && !inLobby ? (
        <FpsCounter
          perf={perfMode}
          perfRight={mobileMode && showMap && !isPortrait ? mapPixels + 24 : 0}
          perfTop={mobileMode && showMap && isPortrait ? mapPixels + 44 : 0}
        />
      ) : null}

      {/* Top-left compact HUD */}
      <div
        style={{
          display: showGameHud ? undefined : "none",
          position: "fixed",
          top: "max(10px, env(safe-area-inset-top))",
          left: "max(10px, env(safe-area-inset-left))",
          background: "rgba(8, 10, 14, 0.72)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: !hudOpen ? "4px 5px" : mobileMode ? "7px 10px" : "10px 14px",
          pointerEvents: "auto",
          maxWidth: mobileMode && showMap ? `calc(100vw - ${mapPixels + 44}px)` : mobileMode ? "calc(100vw - 24px)" : 360,
        }}
      >
        {/* Folded (the default): menu, bag, the clock below (gold in town) and a tab to unfold. */}
        {!hudOpen ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button
              type="button"
              aria-label="Menu"
              onClick={(e) => {
                e.currentTarget.blur();
                openScreen("menu");
              }}
              style={{ ...btnStyle, padding: "4px 9px" }}
            >
              ☰
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                openScreen("inventory");
              }}
              style={{ ...btnStyle, padding: "4px 9px", color: "#ffd84d" }}
            >
              Bag
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                askLobby();
              }}
              style={{ ...btnStyle, padding: "4px 9px" }}
            >
              Lobby
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "0 4px", color: place === "dungeon" && hud.runLeft <= 60 ? "#ff5a4a" : "#f2efe8" }}>
              {place === "dungeon" ? clock(hud.runLeft) : <span style={{ color: "#ffd84d" }}>{inv.gold} gold</span>}
            </span>
            <button
              type="button"
              aria-label="Show details"
              aria-expanded={false}
              onClick={(e) => {
                e.currentTarget.blur();
                setHudOpen(true);
              }}
              style={{ ...btnStyle, padding: "4px 8px" }}
            >
              {mobileMode ? "▾" : "▾ (I)"}
            </button>
          </div>
        ) : (
        <>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, fontWeight: 700, fontSize: mobileMode ? 13 : 15, color: "#ffd84d", lineHeight: 1.2 }}>
            {hud.name}
          </div>
          <button
            type="button"
            aria-label="Hide details"
            aria-expanded={true}
            onClick={(e) => {
              e.currentTarget.blur();
              setHudOpen(false);
            }}
            style={{ ...btnStyle, padding: "2px 8px" }}
          >
            {mobileMode ? "▴" : "▴ (I)"}
          </button>
        </div>
        <div style={{ fontSize: mobileMode ? 11 : 12, color: "#c9d2db", marginTop: 2 }}>
          <b>{spec.name || className}</b> · {className} · {hud.roomLabel} · <b style={{ color: "#ffd84d" }}>{inv.gold}</b> gold
        </div>
        <div style={{ fontSize: mobileMode ? 10 : 12, color: "#9fb0bf", marginTop: 1, display: place === "dungeon" ? undefined : "none" }}>
          Monsters: <b>{hud.mobs}</b> · Portals: <b style={{ color: hud.portalsOpen ? "#c9a8ff" : undefined }}>{hud.portalsOpen}</b> / {PORTAL_COUNT}
          {mobileMode ? (
            <>
              {" · "}
              <b style={{ color: hud.runLeft <= 60 ? "#ff5a4a" : "#f2efe8" }}>{clock(hud.runLeft)}</b>
            </>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={(e) => {
              // Drop focus so Space (jump) does not press the button again.
              e.currentTarget.blur();
              openScreen("menu");
            }}
            style={btnStyle}
          >
            {mobileMode ? "Menu" : "Menu (Esc)"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              openScreen("inventory");
            }}
            style={{ ...btnStyle, color: "#ffd84d" }}
          >
            {mobileMode ? "Inventory" : "Inventory (Tab)"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              askLobby();
            }}
            style={btnStyle}
          >
            Lobby
          </button>
          <button type="button" onClick={() => setFirstPerson((v) => !v)} style={btnStyle}>
            {firstPerson ? (mobileMode ? "3rd P" : "3rd Person (V)") : mobileMode ? "1st P" : "1st Person (V)"}
          </button>
          {mobileMode ? (
            <button type="button" onClick={() => void enterLandscapeMode()} style={{ ...btnStyle, color: "#7df39b" }}>
              ↻ Wide
            </button>
          ) : null}
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
        </>
        )}
      </div>

      {/* Dismissible Auto-Rotate / Landscape tip when holding phone upright */}
      {showGameHud && isTouchUI && isPortrait && !rotateDismissed && !hud.loading ? (
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

      {/* The run clock, top centre on desktop (inside the top-left panel on small screens). */}
      {showGameHud && !mobileMode && !hud.loading && place === "dungeon" ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 10,
            transform: "translateX(-50%)",
            padding: "4px 16px 5px",
            background: "rgba(8, 10, 14, 0.72)",
            border: `1px solid ${hud.runLeft <= 60 ? "rgba(255,90,74,0.6)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 8,
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.04em",
              color: hud.runLeft <= 60 ? "#ff5a4a" : "#f2efe8",
            }}
          >
            {clock(hud.runLeft)}
          </div>
          <div style={{ fontSize: 11, color: hud.portalsOpen ? "#c9a8ff" : "#9fb0bf", whiteSpace: "nowrap" }}>
            {hud.portalsOpen ? `${hud.portalsOpen} portal${hud.portalsOpen > 1 ? "s" : ""} open · escape with E` : `Portals open in ${clock(Math.ceil(portalsIn))}`}
          </div>
        </div>
      ) : null}

      {/* Desktop controls hint, bottom left; it fades a few seconds after the mouse is captured. */}
      {showGameHud && !isTouchUI && !hud.loading && !hintHidden ? (
        <div
          style={{
            position: "fixed",
            left: 12,
            bottom: 14,
            maxWidth: "min(330px, calc(50vw - 180px))",
            padding: "6px 10px",
            background: "rgba(8, 10, 14, 0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
            lineHeight: 1.5,
            color: "#dce3ea",
            pointerEvents: "none",
          }}
        >
          {hud.pointerLocked
            ? (spells.length ? `5–9 Spells · X ${meditates(spells) ? "Meditate" : "Pray"} · ` : "") + "1 / 2 Weapon sets · R Reload bow · G Skill · 3 / 4 Belt · LMB Swing (hold to draw the bow) · RMB Shield · WASD Move · Shift Run · Space Jump · V Camera · C Orbit · E Use · H Helm · Tab Inventory · Enter Chat · P Party · Esc Menu"
            : "Click to capture the mouse · " + (spells.length ? `5–9 Spells · X ${meditates(spells) ? "Meditate" : "Pray"} · ` : "") + "1 / 2 Weapon sets · R Reload bow · G Skill · 3 / 4 Belt · F Swing (hold to draw the bow) · Q / RMB Shield · WASD Move · Shift Run · Space Jump · V Camera · E Use · H Helm · Tab Inventory · Enter Chat · P Party · Esc Menu"}
        </div>
      ) : null}

      {/* Touch Controls: Left virtual thumbstick + Right Jump / Run buttons */}
      {showGameHud && isTouchUI && !hud.loading ? (
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
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* The bow's reload and the class skill, beside the fighting buttons. */}
              {place === "dungeon" && bowInHand && heldSpec ? (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    reloadTouchRef.current = true;
                  }}
                  style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid rgba(255,216,77,0.6)", background: "rgba(30,24,10,0.76)", color: "#ffe08a", fontWeight: 900, fontSize: 10, touchAction: "none" }}
                >
                  RELOAD
                </button>
              ) : null}
              {place === "dungeon" && skillDef ? (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    skillAskRef.current = true;
                  }}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    border: `2px solid ${skillHud.active > 0 ? "#7df39b" : skillHud.cd > 0 ? "rgba(255,255,255,0.2)" : "rgba(125,243,155,0.7)"}`,
                    background: "rgba(10,26,16,0.78)",
                    color: skillHud.cd > 0 && skillHud.active <= 0 ? "#7d8a80" : "#bff5cc",
                    fontWeight: 900,
                    fontSize: 9,
                    lineHeight: 1.15,
                    padding: 2,
                    touchAction: "none",
                  }}
                >
                  {skillHud.cd > 0 && skillHud.active <= 0 ? `${Math.ceil(skillHud.cd)}s` : skillDef.name.toUpperCase()}
                </button>
              ) : null}
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
                  attackHeldRef.current = true;
                }}
                onPointerUp={() => {
                  attackHeldRef.current = false;
                }}
                onPointerCancel={() => {
                  attackHeldRef.current = false;
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
            {/* Bottom row: the camera and run toggles beside JUMP (kept low, clear of the minimap). */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* First or third person, a thumb away (also in the top-left panel). */}
            <button
              type="button"
              aria-label={firstPerson ? "Third person view" : "First person view"}
              onPointerDown={(e) => {
                e.stopPropagation();
                setFirstPerson((v) => !v);
              }}
              style={{
                width: 56,
                height: 42,
                borderRadius: 999,
                border: "1.5px solid rgba(255,255,255,0.28)",
                background: "rgba(12, 16, 22, 0.64)",
                color: "#e8eef5",
                fontWeight: 800,
                fontSize: 12,
                touchAction: "none",
              }}
            >
              {firstPerson ? "3RD" : "1ST"}
            </button>
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
          </div>
        </>
      ) : null}

      {/* What E would do here (a button on touch screens). */}
      {showGameHud && hud.interact && !hud.loading && !hud.dead ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: isTouchUI ? "calc(max(18px, env(safe-area-inset-bottom)) + 176px)" : 144,
            transform: "translateX(-50%)",
            zIndex: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 14px",
            background: "rgba(10, 9, 8, 0.82)",
            border: "1px solid rgba(214,186,128,0.35)",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          {isTouchUI ? (
            <button
              type="button"
              onClick={() => interactNow(hud.interact)}
              style={{ ...btnStyle, background: "linear-gradient(180deg, #f2d27a, #c99a3a)", color: "#1a1408", fontWeight: 800, padding: "6px 12px", fontSize: 12 }}
            >
              {hud.interact.kind === "trade"
                ? "TRADE"
                : hud.interact.kind === "door" || hud.interact.kind === "roomdoor" || hud.interact.kind === "tavernDoor"
                  ? hud.interact.verb.toUpperCase()
                  : hud.interact.kind === "chest"
                    ? "SEARCH"
                    : hud.interact.kind === "portal"
                      ? "ESCAPE"
                      : hud.interact.kind === "rent"
                        ? "RENT"
                        : hud.interact.kind === "stash"
                          ? "OPEN"
                          : hud.interact.kind === "teleport"
                            ? "DESCEND"
                            : hud.interact.kind === "player"
                              ? "INVITE"
                              : hud.interact.kind === "quest"
                                ? "QUESTS"
                                : "LOOT"}
            </button>
          ) : (
            <span style={{ display: "inline-block", minWidth: 22, padding: "2px 6px", textAlign: "center", border: "1px solid #e8dcc0", borderRadius: 3, fontSize: 12, fontWeight: 800, color: "#f3e6c4" }}>E</span>
          )}
          <span style={{ fontSize: 13, color: "#e8dcc0" }}>
            {hud.interact.verb} <b style={{ color: "#f3e6c4", fontFamily: "Georgia, 'Times New Roman', serif" }}>{hud.interact.label}</b>
          </span>
          {hud.interact.kind === "player" ? (
            isTouchUI ? (
              <button type="button" onClick={() => hud.interact && trade.ask(hud.interact.key)} style={{ ...btnStyle, fontWeight: 800, padding: "6px 12px", fontSize: 12 }}>
                TRADE
              </button>
            ) : (
              <span style={{ fontSize: 13, color: "#e8dcc0" }}>
                <span style={{ display: "inline-block", minWidth: 22, padding: "2px 6px", textAlign: "center", border: "1px solid #e8dcc0", borderRadius: 3, fontSize: 12, fontWeight: 800, color: "#f3e6c4", marginRight: 6 }}>T</span>
                Trade
              </span>
            )
          ) : null}
        </div>
      ) : null}

      {/* The bow's ammunition: arrows loaded in it / it holds, and in the bag; the reload's bar. */}
      {showGameHud && bowInHand && heldSpec && place === "dungeon" && screen === "play" && !hud.dead ? (
        <div style={{ position: "fixed", left: "50%", top: "calc(50% + 34px)", transform: "translateX(-50%)", zIndex: 9, pointerEvents: "none", textAlign: "center", fontFamily: "system-ui, sans-serif", textShadow: "0 1px 3px #000" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: (heldBow?.loaded ?? 0) > 0 ? "#f3e6c4" : "#ff8a7a", fontVariantNumeric: "tabular-nums" }}>
            {heldBow?.loaded ?? 0} / {heldSpec.capacity}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#a69c88" }}> · {arrows} in bag</span>
          </div>
          {reloading ? (
            <div style={{ width: 90, height: 4, margin: "3px auto 0", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(214,186,128,0.4)" }}>
              <div key={reloading.key} style={{ height: "100%", background: "#ffd84d", animation: `reloadbar ${reloading.seconds}s linear forwards` }} />
            </div>
          ) : (heldBow?.loaded ?? 0) === 0 ? (
            <div style={{ fontSize: 11, color: "#ffd84d" }}>{arrows > 0 ? "R to reload" : "No arrows"}</div>
          ) : null}
          <style>{"@keyframes reloadbar { from { width: 0% } to { width: 100% } }"}</style>
        </div>
      ) : null}

      {/* The caster's spells (5–9) and praying (X). */}
      {showGameHud && !isTouchUI && spells.length && place === "dungeon" && screen === "play" && !hud.dead ? <SpellBar spells={spells} hud={spellHud} /> : null}

      {/* The class skill (G): its name, then its cooldown; green while it runs. */}
      {showGameHud && !isTouchUI && skillDef && place === "dungeon" && screen === "play" && !hud.dead ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 132,
            transform: "translateX(-50%)",
            zIndex: 9,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            background: "rgba(8,10,8,0.7)",
            border: `1px solid ${skillHud.active > 0 ? "#7df39b" : "rgba(214,186,128,0.35)"}`,
            borderRadius: 3,
            fontFamily: "system-ui, sans-serif",
            fontSize: 12,
            color: skillHud.cd > 0 && skillHud.active <= 0 ? "#8a8272" : "#e8f3e4",
          }}
        >
          <span style={{ display: "inline-block", minWidth: 20, padding: "1px 5px", textAlign: "center", border: "1px solid currentColor", borderRadius: 3, fontWeight: 800 }}>G</span>
          {skillDef.name}
          {skillHud.active > 0 ? <b style={{ color: "#7df39b" }}>{Math.ceil(skillHud.active)}s</b> : skillHud.cd > 0 ? <b>{Math.ceil(skillHud.cd)}s</b> : null}
        </div>
      ) : null}

      {/* The bow's aiming mark (shown and tightened by the scene every frame). */}
      <div
        ref={crosshairRef}
        style={{ position: "fixed", left: "50%", top: "50%", zIndex: 9, display: "none", pointerEvents: "none", width: 22, height: 22, transform: "translate(-50%, -50%)" }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(255,240,200,0.85)", boxShadow: "0 0 3px rgba(0,0,0,0.9)" }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 3, height: 3, marginLeft: -1.5, marginTop: -1.5, borderRadius: "50%", background: "#fff4d0", boxShadow: "0 0 2px #000" }} />
      </div>

      {/* The other players' names (net/remotes.ts positions them every frame). */}
      <div ref={remoteLayerRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9, display: showGameHud ? "block" : "none" }} />

      {/* Multiplayer: the chat, an invite to answer, the party finder (P). */}
      {screen === "play" || chatOpen ? (
        <ChatBox
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          compact={mobileMode}
          bottom={isTouchUI ? "calc(max(18px, env(safe-area-inset-bottom)) + 190px)" : 150}
        />
      ) : null}
      {screen === "play" || screen === "party" || inLobby ? <InviteCards top={inLobby ? 60 : mobileMode ? 54 : 80} /> : null}
      {(screen === "play" || screen === "party" || inLobby) && place === "town" && !coopRun ? <JoinRunCard top={inLobby ? 60 : mobileMode ? 54 : 80} /> : null}
      <TradeAsks top={inLobby ? 60 : mobileMode ? 54 : 80} />
      {tradeState.session ? <TradeWindow inv={inv} icons={allIcons} compact={mobileMode} /> : null}
      {screen === "party" ? <PartyScreen onClose={resume} compact={mobileMode} inDungeon={place === "dungeon"} /> : null}
      {screen === "quests" ? <QuestScreen quests={quests} compact={mobileMode} onClose={resume} {...questActions} /> : null}
      {/* Knocked out in the arena: a moment on the sand, then back at the gate (nothing is lost). */}
      {knockedBy && place === "town" ? (
        <div style={{ position: "fixed", top: "38%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 19, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: mobileMode ? 26 : 40, letterSpacing: "0.1em", color: "#e0a040", textShadow: "0 0 18px rgba(0,0,0,0.9), 0 2px 4px #000" }}>KNOCKED OUT</div>
          <div style={{ fontSize: 13, color: "#e8dcc0", textShadow: "0 1px 3px #000", marginTop: 6 }}>{knockedBy} wins the bout. Back on your feet at the gate in a moment. Nothing is lost.</div>
        </div>
      ) : null}
      {/* Chat and the party finder, with who is online (top middle; under the run clock below). */}
      {showGameHud && mpState.status !== "off" && !hud.dead && !hud.loading ? (
        <div
          style={{
            position: "fixed",
            zIndex: 12,
            top: place === "dungeon" ? (mobileMode ? 58 : 76) : "max(10px, env(safe-area-inset-top))",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <button type="button" style={{ ...btnStyle, padding: "4px 10px", fontSize: 11 }} onClick={() => setChatOpen(true)}>
            {isTouchUI ? "CHAT" : "CHAT (ENTER)"}
          </button>
          <button type="button" style={{ ...btnStyle, padding: "4px 10px", fontSize: 11 }} onClick={() => openScreen("party")}>
            {isTouchUI ? "PARTY" : "PARTY (P)"}
            {mpState.party ? ` · ${mpState.party.members.length}` : ""}
          </button>
          <span style={{ fontSize: 11, color: mpState.status === "online" ? "#8fd0ff" : "#b9a982", textShadow: "0 1px 3px #000" }}>
            {mpState.status === "online" ? `${mpState.players.size + 1} online` : mpState.status === "connecting" ? "connecting..." : "offline"}
          </span>
        </div>
      ) : null}

      {/* Nameplates over hostile or wounded monsters (positioned by the scene every frame). */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9, display: showGameHud ? "block" : "none" }}>
        {Array.from({ length: POOL_SIZE }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              platesRef.current[i] = el;
            }}
            style={{ position: "absolute", left: 0, top: 0, display: "none", willChange: "transform" }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", textShadow: "0 1px 2px #000, 0 0 4px #000", whiteSpace: "nowrap", marginBottom: 2 }} />
            <div style={{ width: 86, height: 6, background: "rgba(10,4,3,0.85)", border: "1px solid #000", boxShadow: "0 0 0 1px rgba(214,186,128,0.35)" }}>
              <div data-fill="" style={{ height: "100%", width: "100%", background: "linear-gradient(180deg, #d9302b, #8e1210)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Phone: the caster's spells (tap to cast) and PRAY, in a row over the belt. */}
      {showGameHud && isTouchUI && !hud.loading && !hud.dead && place === "dungeon" && spells.length ? (
        <div style={{ position: "fixed", zIndex: 11, left: "max(18px, env(safe-area-inset-left))", bottom: "calc(max(18px, env(safe-area-inset-bottom)) + 178px)", touchAction: "none" }}>
          <SpellButtons
            spells={spells}
            hud={spellHud}
            onCast={(i) => {
              spellAskRef.current = i;
            }}
            onPray={() => {
              restAskRef.current = true;
            }}
          />
        </div>
      ) : null}

      {/* The hotbar: 1 sword, 2 shield (lit when in hand), 3 and 4 the belt (with how many are left). */}
      {showGameHud && !hud.loading && !hud.dead ? (
        <div
          style={{
            position: "fixed",
            zIndex: 11,
            display: "flex",
            gap: 6,
            ...(isTouchUI
              ? { left: "max(18px, env(safe-area-inset-left))", bottom: "calc(max(18px, env(safe-area-inset-bottom)) + 124px)" }
              : { left: "50%", transform: "translateX(-50%)", bottom: 82 }),
          }}
        >
          {[
            // Weapon sets: the main hand's picture, the off hand's small in the corner (a bow shows its arrows).
            ...([1, 2] as const).map((n) => {
              const h = heldOf(inv, n);
              const first = h.main ?? h.off;
              return { key: String(n), id: first ? first.id : null, sub: h.main && h.off ? h.off.id : null, on: activeSet === n && !!first, act: () => toggleDraw(n), count: h.bow ? arrows : 0 };
            }),
            ...Array.from({ length: BELT_SLOTS }, (_, i) => {
              const b = (inv.belt || [])[i] ?? null;
              const count = b ? 1 + inv.bag.items.filter((q) => q.item.id === b.id).length : 0;
              return { key: String(i + 3), id: b ? b.id : null, sub: null as string | null, on: false, act: () => applyBeltSlot(i), count };
            }),
          ].map((h) => (
            <button
              type="button"
              key={h.key}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                h.act();
              }}
              title={h.id ? def(h.id).name : "Empty"}
              style={{
                position: "relative",
                width: isTouchUI ? 44 : 50,
                height: isTouchUI ? 44 : 50,
                padding: 0,
                borderRadius: 4,
                background: h.on ? "radial-gradient(circle at 50% 40%, rgba(255,216,77,0.28), rgba(14,12,8,0.9) 75%)" : "rgba(10,9,8,0.78)",
                border: h.on ? "2px solid #ffd84d" : "1px solid rgba(214,186,128,0.35)",
                boxShadow: h.on ? "0 0 12px rgba(255,216,77,0.35)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                touchAction: "none",
              }}
            >
              {h.id ? <ItemIcon id={h.id} icons={allIcons} w={isTouchUI ? 34 : 39} h={isTouchUI ? 34 : 39} ghost={!h.on && Number(h.key) <= 2} /> : null}
              {h.sub ? (
                <span style={{ position: "absolute", right: 1, bottom: 1, pointerEvents: "none" }}>
                  <ItemIcon id={h.sub} icons={allIcons} w={isTouchUI ? 16 : 19} h={isTouchUI ? 16 : 19} ghost={!h.on} />
                </span>
              ) : null}
              <span style={{ position: "absolute", left: 3, top: 1, fontSize: 10, fontWeight: 800, color: "#e8dcc0", textShadow: "0 1px 2px #000", pointerEvents: "none" }}>{h.key}</span>
              {h.count > 1 ? (
                <span style={{ position: "absolute", right: 3, bottom: 1, fontSize: 10, fontWeight: 700, color: "#f3e6c4", textShadow: "0 1px 2px #000", pointerEvents: "none" }}>×{h.count}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {/* Through the tavern's front door: a quick fade to black and back. */}
      {doorFadeKey > 0 ? (
        <div key={`door-${doorFadeKey}`} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 18, background: "#000", animation: "simforgeDoor 0.7s ease-in-out forwards" }} />
      ) : null}
      <style>{"@keyframes simforgeDoor { 0% { opacity: 0; } 32% { opacity: 1; } 55% { opacity: 1; } 100% { opacity: 0; } }"}</style>

      {/* The paladin's health, bottom centre (above the thumb controls on touch screens). */}
      {showGameHud && !hud.loading ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            // Held upright the thumb controls fill the bottom, so it sits above them; sideways it
            // fits between the stick and the buttons, at the very bottom.
            bottom: isTouchUI && isPortrait ? "calc(max(18px, env(safe-area-inset-bottom)) + 128px)" : "max(10px, env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            zIndex: 11,
          }}
        >
          <HealthBar name={spec.name} hp={hud.hp} maxHp={hud.maxHp} compact={mobileMode} />
        </div>
      ) : null}

      {/* A wound: the edges of the view flash red. */}
      {hurtKey > 0 && !hud.dead ? (
        <div
          key={hurtKey}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 12,
            background: "radial-gradient(ellipse at center, transparent 45%, rgba(150,0,0,0.55) 100%)",
            animation: "simforgeHurt 0.5s ease-out forwards",
          }}
        />
      ) : null}
      <style>{"@keyframes simforgeHurt { from { opacity: 1; } to { opacity: 0; } }"}</style>

      {/* Fallen: in a party with a teammate still fighting, the camera follows him; else the end. */}
      {hud.dead && watchId ? (
        <SpectateBar
          name={mp.nameOf(watchId)}
          count={watchable.length}
          onNext={() => setWatchPick((n) => n + 1)}
          onTown={() => {
            setInv(runStartRef.current);
            setLife((l) => l + 1);
            goToTown("gate");
          }}
          compact={mobileMode}
          lost={runGain.gold > 0 || runGain.items > 0 ? `Lost with you: ${haul(runGain)} found on this floor.` : "You had found nothing yet."}
        />
      ) : hud.dead ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 19,
            background: "radial-gradient(ellipse at center, rgba(40,0,0,0.55), rgba(8,0,0,0.92))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            animation: "simforgeDied 1.2s ease-out",
          }}
        >
          <style>{"@keyframes simforgeDied { from { opacity: 0; } to { opacity: 1; } }"}</style>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: mobileMode ? 38 : 64, letterSpacing: "0.12em", color: "#b3201a", textShadow: "0 0 24px rgba(0,0,0,0.9)" }}>
            YOU DIED
          </div>
          <div style={{ fontSize: 14, color: "#d8c9a8", textAlign: "center", lineHeight: 1.6, maxWidth: 420, padding: "0 16px" }}>
            {hud.deathCause ? (
              <div style={{ color: "#f0b0a0" }}>{hud.deathCause}.</div>
            ) : null}
            {runGain.gold > 0 || runGain.items > 0
              ? `Lost with you: ${haul(runGain)} found on this floor.`
              : "You had found nothing yet."}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              // Back to what he carried in, waking on the dais in town.
              setInv(runStartRef.current);
              setLife((l) => l + 1);
              goToTown("gate");
            }}
            style={{
              background: "rgba(30,27,23,0.95)",
              color: "#eee3c8",
              border: "1px solid rgba(214,186,128,0.4)",
              borderRadius: 3,
              padding: "10px 26px",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            RETURN TO TOWN
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              goLobby();
            }}
            style={{ background: "none", color: "#cdbf9f", border: "none", fontSize: 13, letterSpacing: "0.1em", cursor: "pointer", textDecoration: "underline" }}
          >
            BACK TO THE LOBBY
          </button>
        </div>
      ) : null}

      {/* A teleport: a violet flash as the runes take him (down or back up). */}
      {flashKey > 0 ? (
        <div
          key={`flash-${flashKey}`}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 18,
            background: "radial-gradient(ellipse at center, rgba(220,200,255,0.95), rgba(110,70,220,0.85) 45%, rgba(10,4,24,0.95) 100%)",
            animation: "simforgeFlash 1.1s ease-out forwards",
          }}
        />
      ) : null}
      <style>{"@keyframes simforgeFlash { 0% { opacity: 1; } 35% { opacity: 0.9; } 100% { opacity: 0; } } @keyframes simforgeToast { from { opacity: 0; } to { opacity: 1; } }"}</style>

      {/* A line of news: rent paid, back from a dive. */}
      {toast ? (
        <div
          key={toast}
          style={{
            position: "fixed",
            left: "50%",
            top: mobileMode ? "28%" : "22%",
            transform: "translateX(-50%)",
            zIndex: inLobby ? 45 : 17,
            maxWidth: "min(560px, calc(100vw - 32px))",
            padding: "10px 18px",
            background: "rgba(10, 9, 8, 0.86)",
            border: "1px solid rgba(214,186,128,0.45)",
            borderRadius: 4,
            color: "#f3e6c4",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: mobileMode ? 14 : 16,
            textAlign: "center",
            lineHeight: 1.45,
            pointerEvents: "none",
            animation: "simforgeToast 0.4s ease-out",
          }}
        >
          {toast}
        </div>
      ) : null}

      {/* Minimap (top-right on touch/mobile so right thumb action pad has clean space) */}
      {showMap && showGameHud ? (
        <div
          style={{
            position: "fixed",
            right: "max(10px, env(safe-area-inset-right))",
            // Below the FPS counter when it is shown.
            top: mobileMode ? `calc(max(10px, env(safe-area-inset-top)) + ${graphics.showFps || perfMode ? FPS_HEIGHT : 0}px)` : undefined,
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
            {place === "town" ? (
              <>
                <span style={{ color: "#ffd84d" }}>●</span> You &nbsp; <span style={{ color: "#6ce88a" }}>●</span> Folk &nbsp; <span style={{ color: "#c9a8ff" }}>◯</span> Gate
              </>
            ) : (
              <>
                <span style={{ color: "#ffd84d" }}>●</span> You &nbsp; <span style={{ color: "#6ce88a" }}>●</span> Monsters &nbsp; <span style={{ color: "#ff5a4a" }}>●</span> Hostile
              </>
            )}
            {hud.portalsOpen ? (
              <>
                {" "}
                &nbsp;<span style={{ color: "#c9a8ff" }}>◯</span> Portal
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Loading overlay */}
      {hud.loading && !inLobby ? (
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
