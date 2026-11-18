// Bodies for the dungeon's monsters (the simulation is mobSim.ts). Skeletons are fleshless fighters
// (`createPaladin({ fleshless })`) with bones hung on the rig (monsters/skeletonBody.ts): building one
// takes a moment, so a fixed pool is built once and lent to the nearest skeletons, each dressed for
// its kind on loan (armour over the bones, sword and shield, bow, or staff and cape). Slimes are
// light (monsters/slimeBody.ts), so a larger pool of them is made up front. Monsters without a body
// keep living in the simulation unseen (behind the walls). Arrows, bolts and acid puddles are drawn
// here too, and the nameplates (rarity colour, health) once a monster has turned hostile.
import * as THREE from "three";
import { ARMOR_SLOTS, createPaladin, type CombatWorld, type Paladin } from "../artifacts/characters/paladin";
import { randomSpec } from "./CharacterCustomizer";
import { SEE_THROUGH } from "./dungeon/view";
import type { AcidPuddle, MobAgent, Projectile } from "./mobSim";
import { rarityColor } from "./monsters/kinds";
import { BOW_TIP, arrowGeometry, bowGeometry, crystalGeometry, crystalMaterial, glowTexture, staffGeometry } from "./monsters/props";
import { attachBones, type SkeletonBones } from "./monsters/skeletonBody";
import { createSlimeBody, type SlimeBody } from "./monsters/slimeBody";

export const SKELETON_POOL = 8;
export const SLIME_POOL = 12;
/** One nameplate per pooled body. */
export const POOL_SIZE = SKELETON_POOL + SLIME_POOL;
/** Monsters nearer than this get a body; a body is given back past RELEASE_M. */
const BIND_M = 20;
const RELEASE_M = 26;
/** Nameplates show this close. */
const PLATE_M = 16;
const ARROWS = 16;
const BOLTS = 8;
const PUDDLES = 24;

interface SkeletonSlot {
  kind: "skeleton";
  p: Paladin;
  bones: SkeletonBones;
  mob: MobAgent | null;
  prevYaw: number;
  world: CombatWorld;
  /** Its sword lying on the floor once it has fallen (a copy sharing the hand sword's meshes). */
  dropped: THREE.Object3D;
  bow: THREE.Group;
  bowString: [THREE.Mesh, THREE.Mesh];
  nocked: THREE.Mesh;
  staff: THREE.Group;
  staffGlow: THREE.Sprite;
  /** The crystal left on the floor where it fell. */
  crystal: THREE.Mesh;
}

interface SlimeSlot {
  kind: "slime";
  b: SlimeBody;
  mob: MobAgent | null;
}

type Slot = SkeletonSlot | SlimeSlot;

export interface PlayerTarget {
  x: number;
  y: number;
  z: number;
}

export interface MobBodyHooks {
  /** World solidity for the blades (walls ring them). */
  solid: (x: number, y: number, z: number) => boolean;
  /** A skeleton's cut reached the fighter. */
  onPlayerHit: (m: MobAgent, slot: { bounce: () => void }) => void;
  onSwing: (m: MobAgent, swing: number) => void;
  onClang: () => void;
}

export interface MobWorld {
  mobs: MobAgent[];
  projectiles: Projectile[];
  puddles: AcidPuddle[];
}

export interface MobBodies {
  /** Give every body back (a new floor). */
  clear: () => void;
  update: (
    dt: number,
    time: number,
    sim: MobWorld,
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
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Stretch a unit cylinder (along Y, length 1) between two world points. */
function segment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  _c.subVectors(b, a);
  const len = _c.length();
  mesh.position.copy(a).addScaledVector(_c, 0.5);
  mesh.quaternion.setFromUnitVectors(_up, _c.normalize());
  mesh.scale.set(1, Math.max(1e-3, len), 1);
}

/** Build the pools (skeletons one after another, so the page stays responsive), then the driver. */
export async function createMobBodies(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  hooks: MobBodyHooks,
  onProgress?: (built: number, total: number) => void
): Promise<MobBodies> {
  const slots: Slot[] = [];
  const target = { id: 0, x: 0, y: 0, z: 0, radius: 0.34, height: 1.8 };

  // Shared bits for the skeletons' weapons.
  const bowG = bowGeometry();
  const bowMat = new THREE.MeshStandardMaterial({ color: 0xb9a88a, roughness: 0.7, metalness: 0 });
  const stringMat = new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.9 });
  const unitCyl = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 4);
  const arrowG = arrowGeometry();
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0x8c7a5c, roughness: 0.8 });
  const staffG = staffGeometry();
  const staffMat = new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 0.85 });
  const staffHeadMat = new THREE.MeshStandardMaterial({ color: 0x7a5ad8, emissive: 0xa77bff, emissiveIntensity: 1.3, roughness: 0.15, flatShading: true });

  for (let i = 0; i < SKELETON_POOL; i++) {
    const spec = randomSpec(mulberry32(0x5eed + i * 7919));
    const p = await createPaladin(gl, { character: spec, fleshless: true });
    p.materials.setEnvIntensity(0.45);
    // Old steel: duller and browner than the fighter's.
    p.materials.skinned.steel.color.multiplyScalar(0.62).lerp(new THREE.Color(0x6e5a44), 0.3);
    p.materials.blade.color.multiplyScalar(0.7).lerp(new THREE.Color(0x6e5a44), 0.25);
    p.setEquipped("tabard", false);
    p.group.visible = false;
    p.group.rotation.order = "YXZ";
    const bones = attachBones(p);
    scene.add(p.group, p.fx);
    // Blade +Z, flats ±X: turned so a flat faces up, it lies flat on the flagstones.
    const dropped = p.sword.clone(true);
    dropped.visible = false;
    dropped.rotation.order = "YXZ";
    scene.add(dropped);

    // The bow lives in the world, set each frame to the left fist; its string runs to the right hand.
    const bow = new THREE.Group();
    bow.rotation.order = "YXZ";
    bow.add(new THREE.Mesh(bowG.limbs, bowMat));
    const s1 = new THREE.Mesh(unitCyl, stringMat);
    const s2 = new THREE.Mesh(unitCyl, stringMat);
    const nocked = new THREE.Mesh(arrowG, arrowMat);
    bow.visible = s1.visible = s2.visible = nocked.visible = false;
    scene.add(bow, s1, s2, nocked);

    // The staff rides in the right fist like the sword.
    const staff = new THREE.Group();
    staff.add(new THREE.Mesh(staffG.shaft, staffMat), new THREE.Mesh(staffG.head, staffHeadMat));
    const staffGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xb98cff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    staffGlow.position.set(0, 0, 0.95);
    staffGlow.layers.set(SEE_THROUGH);
    staff.add(staffGlow);
    staff.position.copy(p.sword.position);
    staff.quaternion.copy(p.sword.quaternion);
    p.sword.parent?.add(staff);
    staff.visible = false;

    const crystal = new THREE.Mesh(crystalGeometry("common"), crystalMaterial("common"));
    crystal.visible = false;
    crystal.scale.setScalar(1.3);
    scene.add(crystal);

    const slot: SkeletonSlot = { kind: "skeleton", p, bones, mob: null, prevYaw: 0, world: { targets: [target] }, dropped, bow, bowString: [s1, s2], nocked, staff, staffGlow, crystal };
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
    onProgress?.(i + 1, SKELETON_POOL);
    // Let a frame through between builds.
    await new Promise((r) => setTimeout(r, 0));
  }
  for (let i = 0; i < SLIME_POOL; i++) {
    const b = createSlimeBody();
    b.group.visible = false;
    scene.add(b.group);
    slots.push({ kind: "slime", b, mob: null });
  }

  // Arrows and bolts in flight (or stuck in the walls), and acid on the floor.
  const arrows: THREE.Mesh[] = [];
  for (let i = 0; i < ARROWS; i++) {
    const a = new THREE.Mesh(arrowG, arrowMat);
    a.visible = false;
    scene.add(a);
    arrows.push(a);
  }
  const boltCore = new THREE.SphereGeometry(0.07, 12, 8);
  const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc89bff).multiplyScalar(2.2) });
  const bolts: Array<{ core: THREE.Mesh; halo: THREE.Sprite }> = [];
  for (let i = 0; i < BOLTS; i++) {
    const core = new THREE.Mesh(boltCore, boltMat);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xb07cff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.55);
    core.visible = halo.visible = false;
    core.layers.set(SEE_THROUGH);
    halo.layers.set(SEE_THROUGH);
    scene.add(core, halo);
    bolts.push({ core, halo });
  }
  const puddleGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const puddles: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }> = [];
  for (let i = 0; i < PUDDLES; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8fb21c,
      emissive: 0xb6e02a,
      emissiveIntensity: 0.55,
      roughness: 0.05,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(puddleGeo, mat);
    mesh.visible = false;
    mesh.layers.set(SEE_THROUGH);
    mesh.renderOrder = 1;
    scene.add(mesh);
    puddles.push({ mesh, mat });
  }

  const release = (s: Slot) => {
    s.mob = null;
    if (s.kind === "slime") {
      s.b.group.visible = false;
      return;
    }
    s.p.group.visible = false;
    s.dropped.visible = false;
    s.bow.visible = s.bowString[0].visible = s.bowString[1].visible = s.nocked.visible = false;
    s.crystal.visible = false;
  };

  const bind = (s: Slot, m: MobAgent) => {
    s.mob = m;
    if (s.kind === "slime") {
      s.b.bind(m);
      return;
    }
    s.prevYaw = m.yaw;
    for (const k of ARMOR_SLOTS) s.p.setEquipped(k, m.equipment[k]);
    s.p.setEquipped("tabard", false);
    s.bones.sync({ helm: m.equipment.helm, gauntlets: m.equipment.gauntlets, sabatons: m.equipment.sabatons });
    s.bones.setGlow(m.kind.glow, m.elite ? 3.2 : 2.4);
    if (m.kind.cape !== undefined) s.p.materials.cape.color.setHex(m.kind.cape);
    s.staff.visible = m.kind.weapon === "staff";
    s.bow.visible = m.kind.weapon === "bow";
    s.bowString[0].visible = s.bowString[1].visible = s.bow.visible;
    s.nocked.visible = false;
    s.crystal.visible = false;
    s.crystal.geometry = crystalGeometry(m.rarity);
    s.crystal.material = crystalMaterial(m.rarity);
    s.p.reset();
    s.p.group.scale.setScalar(m.scale);
    s.p.group.rotation.set(0, m.yaw, 0);
    s.p.group.position.set(m.wx, m.wy, m.wz);
    s.p.group.visible = true;
    s.dropped.visible = false;
  };

  const updateSkeleton = (s: SkeletonSlot, m: MobAgent, dt: number, time: number) => {
    const g = s.p.group;
    // The fall: a stagger, then over backwards onto the floor (eased in, like gravity).
    const fall = m.dead ? Math.min(1, Math.max(0, m.deadT - 0.12) / 0.5) : 0;
    const fallE = fall * fall;
    g.position.set(m.wx, m.wy + 0.17 * fallE, m.wz);
    g.rotation.y = m.yaw;
    g.rotation.x = -m.flinch - (Math.PI / 2) * fallE;
    if (m.dead) s.bones.setGlow(m.kind.glow, Math.max(0, 2.4 * (1 - m.deadT / 0.6)));
    // Halfway down it lets go of the sword: it lies by its right hand, flat on the floor.
    if (m.dead && fall > 0.5 && m.equipment.sword && !s.dropped.visible) {
      s.p.setEquipped("sword", false);
      const rx = Math.cos(m.yaw);
      const rz = -Math.sin(m.yaw);
      s.dropped.position.set(m.wx - rx * 0.5 - Math.sin(m.yaw) * 0.55, m.wy + 0.014, m.wz - rz * 0.5 - Math.cos(m.yaw) * 0.55);
      s.dropped.rotation.set(0, m.yaw + 2.4, Math.PI / 2);
      s.dropped.visible = true;
    }
    // Down, the mana sets: its crystal rolls out of the ribs onto the floor.
    if (m.dead && fall >= 1 && !s.crystal.visible) {
      s.crystal.visible = true;
      s.crystal.position.set(m.wx - Math.sin(m.yaw) * 0.55, m.wy + 0.04, m.wz - Math.cos(m.yaw) * 0.55);
      s.crystal.rotation.set(1.35, m.yaw + 0.6, 0.2);
    }
    // A fallen skeleton stops animating once it lies still.
    if (!m.dead || m.deadT < 0.9) {
      const sinF = Math.sin(m.yaw);
      const cosF = Math.cos(m.yaw);
      const turn = dt > 0 ? Math.atan2(Math.sin(m.yaw - s.prevYaw), Math.cos(m.yaw - s.prevYaw)) / dt : 0;
      s.prevYaw = m.yaw;
      const w = m.kind.weapon;
      const aiming = !m.dead && m.aimT > 0;
      const moving = Math.hypot(m.vx, m.vz) > 0.25;
      const arms = aiming ? (w === "bow" ? "bow" : "cast") : w === "bow" && m.hostile && !moving && !m.dead ? "bow" : undefined;
      s.p.update(
        dt,
        {
          moveX: m.dead ? 0 : (m.vx * cosF - m.vz * sinF) / m.scale,
          moveZ: m.dead ? 0 : (m.vx * sinF + m.vz * cosF) / m.scale,
          aimPitch: 0,
          turnRate: turn,
          air: 0,
          block: !m.dead && m.blockT > 0 && m.equipment.shield,
          attack: !m.dead && m.attack,
          firstPerson: false,
          // Without a sword the arms hang and swing; a fallen one's arms go slack.
          relaxed: m.dead || (w !== "sword" && !arms),
          arms,
          gripL: w === "bow" && !m.dead ? "sword" : undefined,
        },
        m.wy,
        m.dead ? undefined : s.world
      );
    }

    // The bow in the left fist; the string to the right hand while drawing, straight otherwise.
    if (m.kind.weapon === "bow" && !m.dead) {
      const hl = s.p.rig.bone("handL").localToWorld(_a.copy(s.p.bodyRig.grip.L));
      const hr = s.p.rig.bone("handR").localToWorld(_b.copy(s.p.bodyRig.grip.R));
      s.bow.position.copy(hl);
      s.bow.rotation.set(0, m.yaw + Math.PI, 0.12);
      s.bow.scale.setScalar(m.scale);
      s.bow.updateMatrixWorld(true);
      const top = _v.set(0, BOW_TIP.y, BOW_TIP.z).applyMatrix4(s.bow.matrixWorld).clone();
      const bot = _c.set(0, -BOW_TIP.y, BOW_TIP.z).applyMatrix4(s.bow.matrixWorld).clone();
      const drawn = m.aimT > 0;
      const mid = drawn ? hr.clone() : top.clone().lerp(bot, 0.5);
      segment(s.bowString[0], top, mid);
      segment(s.bowString[1], mid, bot);
      s.nocked.visible = drawn;
      if (drawn) {
        // The arrow lies from the drawing hand out past the grip.
        const dir = hl.clone().sub(hr).normalize();
        s.nocked.position.copy(hr).addScaledVector(dir, 0.36);
        s.nocked.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      }
    } else if (m.kind.weapon === "bow" && m.dead) {
      // Dropped: it lies by the body.
      if (s.bow.position.y > m.wy + 0.05) {
        s.bow.position.set(m.wx + Math.cos(m.yaw) * 0.5, m.wy + 0.03, m.wz - Math.sin(m.yaw) * 0.5);
        s.bow.rotation.set(Math.PI / 2, m.yaw + 0.4, 0);
        s.bow.updateMatrixWorld(true);
        s.bowString[0].visible = s.bowString[1].visible = false;
        s.nocked.visible = false;
      }
    }
    // The staff's crystal gathers light while a spell builds.
    if (m.kind.weapon === "staff") {
      const k = m.dead ? 0 : m.aimT > 0 ? 1 - m.aimT / (m.kind.ranged?.windup ?? 1) : 0;
      s.staffGlow.scale.setScalar(0.18 + 0.5 * k + 0.03 * Math.sin(time * 6));
      s.staffGlow.material.opacity = m.dead ? 0 : 0.45 + 0.5 * k;
    }
  };

  return {
    clear() {
      for (const s of slots) release(s);
    },

    update(dt, time, sim, player, camera, view, plates) {
      const mobs = sim.mobs;
      target.x = player.x;
      target.y = player.y;
      target.z = player.z;
      const dist = (m: MobAgent) => Math.hypot(m.wx - player.x, m.wz - player.z);

      // Give back bodies of monsters that wandered off (or whose floor is gone).
      for (const s of slots) if (s.mob && (dist(s.mob) > RELEASE_M || mobs.indexOf(s.mob) < 0)) release(s);
      // Lend free bodies to the nearest monsters without one; a much nearer one takes the farthest.
      const bound = new Set(slots.map((s) => s.mob));
      const want = mobs.filter((m) => !bound.has(m) && dist(m) < BIND_M).sort((a, b) => dist(a) - dist(b));
      for (const m of want) {
        const kind = m.family === "slime" ? "slime" : "skeleton";
        const mine = slots.filter((o) => o.kind === kind);
        let s = mine.find((o) => !o.mob);
        if (!s) {
          let far: Slot | null = null;
          for (const o of mine) if (o.mob && (!far || dist(o.mob) > dist(far.mob as MobAgent))) far = o;
          if (far && far.mob && dist(m) < dist(far.mob) - 4) s = far;
        }
        if (!s) continue;
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
        if (s.kind === "slime") s.b.update(dt, m, time);
        else updateSkeleton(s, m, dt, time);

        // Nameplate over the head once it is hostile or hurt, while alive and near.
        if (!plate) continue;
        const show = !m.dead && (m.hostile || m.hp < m.stats.maxHp) && dist(m) < PLATE_M;
        if (show) {
          _v.set(m.wx, m.wy + m.height + 0.25, m.wz).project(camera);
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
            name.style.color = rarityColor(m.rarity);
          }
          if (fill) fill.style.width = `${(100 * m.hp) / m.stats.maxHp}%`;
        } else plate.style.display = "none";
      }

      // Projectiles: arrows along their flight (stuck ones stay put), bolts as glowing motes.
      let ai = 0;
      let bi = 0;
      for (const p of sim.projectiles) {
        if (p.dead) continue;
        if (p.kind === "arrow" && ai < arrows.length) {
          const a = arrows[ai++];
          a.visible = true;
          a.position.set(p.x, p.y, p.z);
          _c.set(p.vx, p.vy, p.vz).normalize();
          a.quaternion.setFromUnitVectors(_v.set(0, 0, 1), _c);
          if (p.stuck) a.position.addScaledVector(_c, -0.2);
        } else if (p.kind === "bolt" && bi < bolts.length) {
          const b = bolts[bi++];
          b.core.visible = b.halo.visible = true;
          b.core.position.set(p.x, p.y, p.z);
          b.halo.position.set(p.x, p.y, p.z);
          b.halo.scale.setScalar(0.5 + 0.08 * Math.sin(time * 30 + p.id));
        }
      }
      for (; ai < arrows.length; ai++) arrows[ai].visible = false;
      for (; bi < bolts.length; bi++) bolts[bi].core.visible = bolts[bi].halo.visible = false;

      // Acid: spreads in a moment, burns, then dries and fades.
      for (let i = 0; i < puddles.length; i++) {
        const q = sim.puddles[i];
        const pm = puddles[i];
        if (!q) {
          pm.mesh.visible = false;
          continue;
        }
        pm.mesh.visible = true;
        const grow = Math.min(1, q.t / 0.35);
        const fade = Math.min(1, (q.life - q.t) / 1.5);
        pm.mesh.position.set(q.x, q.y + 0.018, q.z);
        pm.mesh.scale.setScalar(q.r * (0.4 + 0.6 * grow));
        pm.mat.opacity = 0.6 * fade;
        pm.mat.emissiveIntensity = (0.4 + 0.2 * Math.sin(time * 5 + i)) * fade;
      }
    },

    dispose() {
      for (const s of slots) {
        if (s.kind === "slime") {
          s.b.dispose();
          continue;
        }
        // The dropped sword shares the hand sword's geometry: disposing the body frees both.
        s.bones.dispose();
        scene.remove(s.p.group, s.p.fx, s.dropped, s.bow, s.bowString[0], s.bowString[1], s.nocked, s.crystal);
        s.staffGlow.material.dispose();
        s.p.dispose();
      }
      slots.length = 0;
      for (const a of arrows) scene.remove(a);
      for (const b of bolts) {
        scene.remove(b.core, b.halo);
        b.halo.material.dispose();
      }
      for (const q of puddles) {
        scene.remove(q.mesh);
        q.mat.dispose();
      }
      for (const m of [bowMat, stringMat, arrowMat, staffMat, staffHeadMat, boltMat]) m.dispose();
      unitCyl.dispose();
      boltCore.dispose();
      puddleGeo.dispose();
    },
  };
}
