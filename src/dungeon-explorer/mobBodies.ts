// Realistic bodies for the dungeon's men. A full human (baked body, fitted armour, rig) is too heavy
// to build for every man on the floor, so a fixed pool is built once, each a different rolled man,
// and lent to the nearest men; the rest keep living in the simulation unseen (behind the walls).
// Each frame the pool drives its bodies from the simulation: walk cycle from the ground speed,
// facing, the shield, the cuts (their blades really sweep, so they can hit the paladin), the fall
// when one dies, and a nameplate with his health once he has turned hostile.
import * as THREE from "three";
import { ARMOR_SLOTS, createPaladin, type CombatWorld, type Paladin } from "../artifacts/characters/paladin";
import { randomSpec } from "./CharacterCustomizer";
import { RARITY_COLOR, type MobAgent } from "./npcSim";

export const POOL_SIZE = 8;
/** Men nearer than this get a body; a body is given back past RELEASE_M. */
const BIND_M = 20;
const RELEASE_M = 26;
/** Nameplates show this close. */
const PLATE_M = 16;

interface Slot {
  p: Paladin;
  mob: MobAgent | null;
  prevYaw: number;
  world: CombatWorld;
  /** His sword lying on the floor once he has fallen (a copy sharing the hand sword's meshes). */
  dropped: THREE.Object3D;
}

export interface PlayerTarget {
  x: number;
  y: number;
  z: number;
}

export interface MobBodyHooks {
  /** World solidity for the blades (walls ring them). */
  solid: (x: number, y: number, z: number) => boolean;
  /** A man's cut reached the paladin. */
  onPlayerHit: (m: MobAgent, slot: { bounce: () => void }) => void;
  onSwing: (m: MobAgent, swing: number) => void;
  onClang: () => void;
}

export interface MobBodies {
  /** Give every body back (a new floor). */
  clear: () => void;
  update: (
    dt: number,
    mobs: MobAgent[],
    player: PlayerTarget,
    camera: THREE.Camera,
    view: { width: number; height: number },
    plates: Array<HTMLDivElement | null>
  ) => void;
  dispose: () => void;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _v = new THREE.Vector3();

/** Build the pool (one body after another, so the page stays responsive), then hand back the driver. */
export async function createMobBodies(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  hooks: MobBodyHooks,
  onProgress?: (built: number, total: number) => void
): Promise<MobBodies> {
  const slots: Slot[] = [];
  const target = { id: 0, x: 0, y: 0, z: 0, radius: 0.34, height: 1.8 };
  for (let i = 0; i < POOL_SIZE; i++) {
    const spec = randomSpec(mulberry32(0x5eed + i * 7919));
    const p = await createPaladin(gl, { character: spec });
    p.materials.setEnvIntensity(0.45);
    p.group.visible = false;
    p.group.rotation.order = "YXZ";
    scene.add(p.group, p.fx);
    // Blade +Z, flats ±X: turned so a flat faces up, it lies flat on the flagstones.
    const dropped = p.sword.clone(true);
    dropped.visible = false;
    dropped.rotation.order = "YXZ";
    scene.add(dropped);
    const slot: Slot = { p, mob: null, prevYaw: 0, world: { targets: [target] }, dropped };
    const bounce = { bounce: () => p.animator.bounce() };
    slot.world = {
      targets: [target],
      solid: hooks.solid,
      onHit: () => {
        if (slot.mob) hooks.onPlayerHit(slot.mob, bounce);
      },
      onSwing: (swing) => {
        if (slot.mob) hooks.onSwing(slot.mob, swing);
      },
      onClang: () => hooks.onClang(),
    };
    slots.push(slot);
    onProgress?.(i + 1, POOL_SIZE);
    // Let a frame through between builds.
    await new Promise((r) => setTimeout(r, 0));
  }

  const release = (s: Slot) => {
    s.mob = null;
    s.p.group.visible = false;
    s.dropped.visible = false;
  };

  const bind = (s: Slot, m: MobAgent) => {
    s.mob = m;
    s.prevYaw = m.yaw;
    for (const k of ARMOR_SLOTS) s.p.setEquipped(k, m.equipment[k]);
    s.p.reset();
    s.p.group.rotation.set(0, m.yaw, 0);
    s.p.group.position.set(m.wx, m.wy, m.wz);
    s.p.group.visible = true;
    s.dropped.visible = false;
  };

  return {
    clear() {
      for (const s of slots) release(s);
    },

    update(dt, mobs, player, camera, view, plates) {
      target.x = player.x;
      target.y = player.y;
      target.z = player.z;
      const dist = (m: MobAgent) => Math.hypot(m.wx - player.x, m.wz - player.z);

      // Give back bodies of men who wandered off (or whose floor is gone).
      for (const s of slots) if (s.mob && (dist(s.mob) > RELEASE_M || mobs.indexOf(s.mob) < 0)) release(s);
      // Lend free bodies to the nearest men without one; a much nearer man takes the farthest body.
      const bound = new Set(slots.map((s) => s.mob));
      const want = mobs
        .filter((m) => !bound.has(m) && dist(m) < BIND_M)
        .sort((a, b) => dist(a) - dist(b));
      for (const m of want) {
        let s = slots.find((o) => !o.mob);
        if (!s) {
          let far: Slot | null = null;
          for (const o of slots) if (o.mob && (!far || dist(o.mob) > dist(far.mob as MobAgent))) far = o;
          if (far && far.mob && dist(m) < dist(far.mob) - 4) s = far;
        }
        if (!s) break;
        bind(s, m);
      }

      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const plate = plates[i];
        const m = s.mob;
        if (!m) {
          if (plate) plate.style.display = "none";
          continue;
        }
        const g = s.p.group;
        // The fall: a stagger, then over backwards onto the floor (eased in, like gravity).
        const fall = m.dead ? Math.min(1, Math.max(0, m.deadT - 0.12) / 0.5) : 0;
        const fallE = fall * fall;
        g.position.set(m.wx, m.wy + 0.17 * fallE, m.wz);
        g.rotation.y = m.yaw;
        g.rotation.x = -m.flinch - (Math.PI / 2) * fallE;
        // Halfway down he lets go of the sword: it lies by his right hand, flat on the floor.
        if (m.dead && fall > 0.5 && m.equipment.sword && !s.dropped.visible) {
          s.p.setEquipped("sword", false);
          const rx = Math.cos(m.yaw);
          const rz = -Math.sin(m.yaw);
          s.dropped.position.set(m.wx - rx * 0.5 - Math.sin(m.yaw) * 0.55, m.wy + 0.014, m.wz - rz * 0.5 - Math.cos(m.yaw) * 0.55);
          s.dropped.rotation.set(0, m.yaw + 2.4, Math.PI / 2);
          s.dropped.visible = true;
        }
        // A fallen man stops animating once he lies still.
        if (!m.dead || m.deadT < 0.9) {
          const sinF = Math.sin(m.yaw);
          const cosF = Math.cos(m.yaw);
          const turn = dt > 0 ? Math.atan2(Math.sin(m.yaw - s.prevYaw), Math.cos(m.yaw - s.prevYaw)) / dt : 0;
          s.prevYaw = m.yaw;
          s.p.update(
            dt,
            {
              moveX: m.dead ? 0 : m.vx * cosF - m.vz * sinF,
              moveZ: m.dead ? 0 : m.vx * sinF + m.vz * cosF,
              aimPitch: 0,
              turnRate: turn,
              air: 0,
              block: !m.dead && m.blockT > 0 && m.equipment.shield,
              attack: !m.dead && m.attack,
              firstPerson: false,
              // A fallen man's arms go slack (no guard held up off the floor).
              relaxed: m.dead,
            },
            m.wy,
            m.dead ? undefined : s.world
          );
        }

        // Nameplate over the head once he is hostile or hurt, while alive and near.
        if (!plate) continue;
        const show = !m.dead && (m.hostile || m.hp < m.stats.maxHp) && dist(m) < PLATE_M;
        if (show) {
          _v.set(m.wx, m.wy + 2.05, m.wz).project(camera);
          if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) {
            plate.style.display = "none";
            continue;
          }
          plate.style.display = "block";
          plate.style.transform = `translate(${((_v.x + 1) / 2) * view.width}px, ${((1 - _v.y) / 2) * view.height}px) translate(-50%, -100%)`;
          const name = plate.firstElementChild as HTMLDivElement | null;
          const fill = plate.querySelector("[data-fill]") as HTMLDivElement | null;
          if (name) {
            name.textContent = m.name;
            name.style.color = RARITY_COLOR[m.rarity];
          }
          if (fill) fill.style.width = `${(100 * m.hp) / m.stats.maxHp}%`;
        } else plate.style.display = "none";
      }
    },

    dispose() {
      for (const s of slots) {
        // The dropped sword shares the hand sword's geometry: disposing the body frees both.
        scene.remove(s.p.group, s.p.fx, s.dropped);
        s.p.dispose();
      }
      slots.length = 0;
    },
  };
}
