// Verlet cloth for the cape and tabard. Particles live in world space, so walking, turning and
// swinging drag the fabric; the top row is pinned to a bone and the rest collides with the body.
import * as THREE from "three";
import { B, type BoneName, type Rig } from "./rig";

export interface ClothCollider {
  bone: BoneName;
  /** Offset in the bone's local frame. */
  at: [number, number, number];
  r: number;
}

export interface ClothSpec {
  cols: number;
  rows: number;
  bone: BoneName;
  /** Pin line in the bone's local frame, left end to right end. */
  pinA: [number, number, number];
  pinB: [number, number, number];
  /** Extra sag of the pin line's middle, in the bone's local frame. */
  pinBow?: [number, number, number];
  widthBottom: number;
  length: number;
  material: THREE.Material;
  colliders: ClothCollider[];
  /** Direction (bone-local) the cloth initially hangs toward besides straight down. */
  drape?: [number, number, number];
}

const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _inv = new THREE.Matrix4();
const GRAVITY = 9.8;

export class Cloth {
  readonly mesh: THREE.Mesh;
  private readonly spec: ClothSpec;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly prev: Float32Array;
  private readonly restH: Float32Array;
  private readonly restV: number;
  private readonly geo: THREE.BufferGeometry;
  private ready = false;
  private acc = 0;
  private readonly spheres: Float32Array;

  constructor(spec: ClothSpec) {
    this.spec = spec;
    const { cols, rows } = spec;
    this.n = cols * rows;
    this.pos = new Float32Array(this.n * 3);
    this.prev = new Float32Array(this.n * 3);
    this.restH = new Float32Array(rows);
    this.restV = spec.length / (rows - 1);
    const top = Math.hypot(spec.pinB[0] - spec.pinA[0], spec.pinB[1] - spec.pinA[1], spec.pinB[2] - spec.pinA[2]);
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
      this.restH[r] = (top + (spec.widthBottom - top) * t) / (cols - 1);
    }
    this.spheres = new Float32Array(spec.colliders.length * 4);

    const uv = new Float32Array(this.n * 2);
    const idx: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        uv[(r * cols + c) * 2] = c / (cols - 1);
        uv[(r * cols + c) * 2 + 1] = 1 - r / (rows - 1);
        if (r < rows - 1 && c < cols - 1) {
          const a = r * cols + c;
          idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
        }
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.n * 3), 3));
    this.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, spec.material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /** World position of pin column c. */
  private pin(rig: Rig, root: THREE.Object3D, c: number, out: THREE.Vector3): THREE.Vector3 {
    const s = this.spec;
    const t = c / (s.cols - 1);
    const bow = Math.sin(t * Math.PI);
    _q.set(
      s.pinA[0] + (s.pinB[0] - s.pinA[0]) * t + (s.pinBow ? s.pinBow[0] * bow : 0),
      s.pinA[1] + (s.pinB[1] - s.pinA[1]) * t + (s.pinBow ? s.pinBow[1] * bow : 0),
      s.pinA[2] + (s.pinB[2] - s.pinA[2]) * t + (s.pinBow ? s.pinBow[2] * bow : 0)
    );
    return rig.toModel(s.bone, _q, out).applyMatrix4(root.matrixWorld);
  }

  /** Drop the cloth into a hanging rest state (first frame, teleports). */
  reset(rig: Rig, root: THREE.Object3D): void {
    const { cols, rows } = this.spec;
    const d = this.spec.drape ?? [0, 0, 0];
    _q.set(d[0], d[1], d[2]).applyQuaternion(rig.mq[B[this.spec.bone]]).transformDirection(root.matrixWorld);
    const dx = _q.x;
    const dz = _q.z;
    for (let c = 0; c < cols; c++) {
      this.pin(rig, root, c, _p);
      for (let r = 0; r < rows; r++) {
        const k = (r * cols + c) * 3;
        const fall = r * this.restV;
        this.pos[k] = _p.x + dx * fall * 0.35;
        this.pos[k + 1] = _p.y - fall * 0.93;
        this.pos[k + 2] = _p.z + dz * fall * 0.35;
        this.prev[k] = this.pos[k];
        this.prev[k + 1] = this.pos[k + 1];
        this.prev[k + 2] = this.pos[k + 2];
      }
    }
    this.ready = true;
    this.acc = 0;
  }

  private link(a: number, b: number, rest: number, stiff: number, aPinned: boolean): void {
    const P = this.pos;
    const dx = P[b * 3] - P[a * 3];
    const dy = P[b * 3 + 1] - P[a * 3 + 1];
    const dz = P[b * 3 + 2] - P[a * 3 + 2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const k = ((len - rest) / len) * stiff;
    if (aPinned) {
      P[b * 3] -= dx * k;
      P[b * 3 + 1] -= dy * k;
      P[b * 3 + 2] -= dz * k;
    } else {
      P[a * 3] += dx * k * 0.5;
      P[a * 3 + 1] += dy * k * 0.5;
      P[a * 3 + 2] += dz * k * 0.5;
      P[b * 3] -= dx * k * 0.5;
      P[b * 3 + 1] -= dy * k * 0.5;
      P[b * 3 + 2] -= dz * k * 0.5;
    }
  }

  step(dt: number, rig: Rig, root: THREE.Object3D, floorY: number): void {
    const { cols, rows, colliders } = this.spec;
    if (!this.ready) this.reset(rig, root);
    // A jump in the pins (respawn, new floor) would whip the cloth: start over instead.
    this.pin(rig, root, 0, _p);
    if (Math.hypot(_p.x - this.pos[0], _p.y - this.pos[1], _p.z - this.pos[2]) > 1.2) this.reset(rig, root);

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      rig.toModel(c.bone, _q.set(c.at[0], c.at[1], c.at[2]), _p).applyMatrix4(root.matrixWorld);
      this.spheres[i * 4] = _p.x;
      this.spheres[i * 4 + 1] = _p.y;
      this.spheres[i * 4 + 2] = _p.z;
      this.spheres[i * 4 + 3] = c.r;
    }

    const H = 1 / 90;
    this.acc = Math.min(this.acc + dt, H * 4);
    const P = this.pos;
    const O = this.prev;
    while (this.acc >= H) {
      this.acc -= H;
      for (let i = cols; i < this.n; i++) {
        const k = i * 3;
        const vx = (P[k] - O[k]) * 0.985;
        const vy = (P[k + 1] - O[k + 1]) * 0.985;
        const vz = (P[k + 2] - O[k + 2]) * 0.985;
        O[k] = P[k];
        O[k + 1] = P[k + 1];
        O[k + 2] = P[k + 2];
        P[k] += vx;
        P[k + 1] += vy - GRAVITY * H * H;
        P[k + 2] += vz;
      }
      for (let c = 0; c < cols; c++) {
        this.pin(rig, root, c, _p);
        P[c * 3] = _p.x;
        P[c * 3 + 1] = _p.y;
        P[c * 3 + 2] = _p.z;
      }
      for (let it = 0; it < 4; it++) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const a = r * cols + c;
            if (c < cols - 1) this.link(a, a + 1, this.restH[r], r === 0 ? 0 : 0.8, false);
            if (r < rows - 1) this.link(a, a + cols, this.restV, 1, r === 0);
            if (r < rows - 2) this.link(a, a + cols * 2, this.restV * 2, 0.25, r === 0);
            if (r < rows - 1 && c < cols - 1) {
              const diag = Math.hypot(this.restV, (this.restH[r] + this.restH[r + 1]) / 2);
              this.link(a, a + cols + 1, diag, 0.35, r === 0);
              this.link(a + 1, a + cols, diag, 0.35, r === 0);
            }
          }
        }
        for (let i = cols; i < this.n; i++) {
          const k = i * 3;
          for (let s = 0; s < colliders.length; s++) {
            const dx = P[k] - this.spheres[s * 4];
            const dy = P[k + 1] - this.spheres[s * 4 + 1];
            const dz = P[k + 2] - this.spheres[s * 4 + 2];
            const rr = this.spheres[s * 4 + 3];
            const q = dx * dx + dy * dy + dz * dz;
            if (q < rr * rr && q > 1e-9) {
              const l = Math.sqrt(q);
              const push = (rr - l) / l;
              P[k] += dx * push;
              P[k + 1] += dy * push;
              P[k + 2] += dz * push;
            }
          }
          if (P[k + 1] < floorY + 0.015) P[k + 1] = floorY + 0.015;
        }
      }
    }

    // Write back in the paladin group's local space.
    _inv.copy(root.matrixWorld).invert();
    const out = this.geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < this.n; i++) {
      _p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(_inv);
      out.setXYZ(i, _p.x, _p.y, _p.z);
    }
    out.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  dispose(): void {
    this.geo.dispose();
  }
}
