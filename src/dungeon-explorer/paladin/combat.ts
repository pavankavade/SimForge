// Blade physics: the sword is a real swept segment. While a cut is live, the path the blade took
// since the last frame is tested against the world; it bites into targets and rings off stone.
import * as THREE from "three";

/** Additive effects render on the dungeon view's see-through layer, outside its depth prepass. */
export const FX_LAYER = 1;

export interface CombatTarget {
  id: number;
  /** Feet position in world space. */
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
}

export interface CombatWorld {
  /** True where the world is solid (walls, floor, ceiling). */
  solid?: (x: number, y: number, z: number) => boolean;
  targets?: CombatTarget[];
  onHit?: (id: number, dirX: number, dirZ: number, point: THREE.Vector3, swing: number) => void;
  onClang?: (point: THREE.Vector3) => void;
  onSwing?: (swing: number) => void;
  onFootstep?: (side: number) => void;
}

const TRAIL = 16;
const SPARKS = 72;
const _p = new THREE.Vector3();
const _b = new THREE.Vector3();
const _t = new THREE.Vector3();

export class BladeFx {
  /** World-space group: add it to the scene root, not to the character. */
  readonly group = new THREE.Group();
  private readonly trailGeo = new THREE.BufferGeometry();
  private readonly trailPos = new Float32Array(TRAIL * 2 * 3);
  private readonly trailCol = new Float32Array(TRAIL * 2 * 3);
  private readonly trailAge = new Float32Array(TRAIL).fill(9);
  private readonly samples = new Float32Array(TRAIL * 6);
  private head = 0;
  private readonly sparkGeo = new THREE.BufferGeometry();
  private readonly sparkPos = new Float32Array(SPARKS * 3);
  private readonly sparkCol = new Float32Array(SPARKS * 3);
  private readonly sparkVel = new Float32Array(SPARKS * 3);
  private readonly sparkLife = new Float32Array(SPARKS);
  private nextSpark = 0;
  private seed = 1;

  constructor() {
    this.group.name = "paladin-fx";
    const idx: number[] = [];
    for (let i = 0; i < TRAIL - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailPos, 3));
    this.trailGeo.setAttribute("color", new THREE.BufferAttribute(this.trailCol, 3));
    this.trailGeo.setIndex(idx);
    const trail = new THREE.Mesh(
      this.trailGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
      })
    );
    this.sparkGeo.setAttribute("position", new THREE.BufferAttribute(this.sparkPos, 3));
    this.sparkGeo.setAttribute("color", new THREE.BufferAttribute(this.sparkCol, 3));
    const sparks = new THREE.Points(
      this.sparkGeo,
      new THREE.PointsMaterial({
        size: 0.035,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      })
    );
    for (const o of [trail, sparks]) {
      o.frustumCulled = false;
      o.layers.set(FX_LAYER);
      this.group.add(o);
    }
  }

  private rnd(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) | 0;
    return (this.seed >>> 0) / 4294967296;
  }

  /** Record where the blade is this frame (only while a cut is live). */
  sample(base: THREE.Vector3, tip: THREE.Vector3): void {
    this.head = (this.head + 1) % TRAIL;
    const k = this.head * 6;
    this.samples[k] = base.x;
    this.samples[k + 1] = base.y;
    this.samples[k + 2] = base.z;
    this.samples[k + 3] = tip.x;
    this.samples[k + 4] = tip.y;
    this.samples[k + 5] = tip.z;
    this.trailAge[this.head] = 0;
  }

  burst(point: THREE.Vector3, dir: THREE.Vector3, count: number): void {
    for (let n = 0; n < count; n++) {
      const i = this.nextSpark;
      this.nextSpark = (this.nextSpark + 1) % SPARKS;
      this.sparkPos[i * 3] = point.x;
      this.sparkPos[i * 3 + 1] = point.y;
      this.sparkPos[i * 3 + 2] = point.z;
      const sp = 1.2 + this.rnd() * 3.4;
      this.sparkVel[i * 3] = (dir.x * 0.6 + (this.rnd() - 0.5) * 1.5) * sp;
      this.sparkVel[i * 3 + 1] = (dir.y * 0.6 + this.rnd() * 1.1) * sp;
      this.sparkVel[i * 3 + 2] = (dir.z * 0.6 + (this.rnd() - 0.5) * 1.5) * sp;
      this.sparkLife[i] = 0.25 + this.rnd() * 0.45;
    }
  }

  update(dt: number): void {
    const LIFE = 0.11;
    for (let n = 0; n < TRAIL; n++) {
      const i = (this.head - n + TRAIL) % TRAIL;
      this.trailAge[i] += dt;
      const a = Math.max(0, 1 - this.trailAge[i] / LIFE);
      const fade = a * a * 0.32;
      const k = i * 6;
      const o = n * 6;
      // Ribbon covers the outer two thirds of the blade.
      this.trailPos[o] = this.samples[k] + (this.samples[k + 3] - this.samples[k]) * 0.35;
      this.trailPos[o + 1] = this.samples[k + 1] + (this.samples[k + 4] - this.samples[k + 1]) * 0.35;
      this.trailPos[o + 2] = this.samples[k + 2] + (this.samples[k + 5] - this.samples[k + 2]) * 0.35;
      this.trailPos[o + 3] = this.samples[k + 3];
      this.trailPos[o + 4] = this.samples[k + 4];
      this.trailPos[o + 5] = this.samples[k + 5];
      this.trailCol[o] = this.trailCol[o + 1] = this.trailCol[o + 2] = fade * 0.25;
      this.trailCol[o + 3] = fade * 0.85;
      this.trailCol[o + 4] = fade * 0.92;
      this.trailCol[o + 5] = fade;
    }
    (this.trailGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.trailGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

    for (let i = 0; i < SPARKS; i++) {
      if (this.sparkLife[i] <= 0) {
        this.sparkCol[i * 3] = this.sparkCol[i * 3 + 1] = this.sparkCol[i * 3 + 2] = 0;
        continue;
      }
      this.sparkLife[i] -= dt;
      this.sparkVel[i * 3 + 1] -= 9.8 * dt;
      this.sparkPos[i * 3] += this.sparkVel[i * 3] * dt;
      this.sparkPos[i * 3 + 1] += this.sparkVel[i * 3 + 1] * dt;
      this.sparkPos[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt;
      const a = Math.max(0, Math.min(1, this.sparkLife[i] * 4));
      this.sparkCol[i * 3] = 6 * a;
      this.sparkCol[i * 3 + 1] = 3.2 * a * a;
      this.sparkCol[i * 3 + 2] = 0.9 * a * a * a;
    }
    (this.sparkGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.trailGeo.dispose();
    this.sparkGeo.dispose();
  }
}

export type SweepResult = "none" | "hit" | "clang";

/** Sweeps the blade between two frames and reports what it struck. */
export class BladeSweep {
  private readonly prevBase = new THREE.Vector3();
  private readonly prevTip = new THREE.Vector3();
  private live = false;
  private serial = -1;
  private readonly struck: number[] = [];
  /** Where the last contact happened, and which way the blade was travelling. */
  readonly point = new THREE.Vector3();
  readonly travel = new THREE.Vector3();

  /** Call every frame; `active` is true while the cut can do damage. */
  step(active: boolean, serial: number, swing: number, base: THREE.Vector3, tip: THREE.Vector3, world: CombatWorld | undefined): SweepResult {
    let result: SweepResult = "none";
    if (active && world) {
      if (!this.live || serial !== this.serial) {
        this.prevBase.copy(base);
        this.prevTip.copy(tip);
        this.struck.length = 0;
        this.serial = serial;
      }
      this.travel.copy(tip).sub(this.prevTip);
      const STEPS = 5;
      outer: for (let s = 1; s <= STEPS; s++) {
        const f = s / STEPS;
        _b.lerpVectors(this.prevBase, base, f);
        _t.lerpVectors(this.prevTip, tip, f);
        for (let k = 0; k <= 4; k++) {
          _p.lerpVectors(_b, _t, 0.25 + 0.75 * (k / 4));
          if (world.targets) {
            for (const tg of world.targets) {
              if (this.struck.indexOf(tg.id) !== -1) continue;
              if (_p.y < tg.y - 0.05 || _p.y > tg.y + tg.height) continue;
              if (Math.hypot(_p.x - tg.x, _p.z - tg.z) > tg.radius + 0.04) continue;
              this.struck.push(tg.id);
              this.point.copy(_p);
              const l = Math.hypot(this.travel.x, this.travel.z) || 1;
              world.onHit?.(tg.id, this.travel.x / l, this.travel.z / l, this.point, swing);
              result = "hit";
            }
          }
          if (world.solid && world.solid(_p.x, _p.y, _p.z)) {
            this.point.copy(_p);
            world.onClang?.(this.point);
            result = "clang";
            break outer;
          }
        }
      }
    }
    this.live = active;
    this.prevBase.copy(base);
    this.prevTip.copy(tip);
    return result;
  }
}
