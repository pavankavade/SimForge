import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Background people: light figures (one merged mesh each, coloured per vertex) for the rest of the
 * 33 in the shelter and the crowd at the camp. They stand, sit on a bench or the floor, or throw
 * their arms up, sway a little, and cast shadows. The acting is left to the real cast.
 */

export type FigurePose = "stand" | "sit" | "floor" | "cheer";

export interface FigureLook {
  /** Top (and legs, unless `pants` is given). */
  suit: string;
  pants?: string;
  /** Hard hat colour, or null for bare hair. */
  hat: string | null;
  skin: string;
  hair?: string;
  /** Reflective bands on a coverall. */
  bands?: boolean;
}

export interface Person {
  x: number;
  z: number;
  yaw: number;
  pose: FigurePose;
  look: FigureLook;
  /** 0.9..1.1 */
  size?: number;
  phase?: number;
}

type V3 = [number, number, number];

const tint = (g: THREE.BufferGeometry, color: string) => {
  const c = new THREE.Color(color);
  const n = (g.getAttribute("position") as THREE.BufferAttribute).count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
};

const place = (g: THREE.BufferGeometry, color: string, pos: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])), new THREE.Vector3(...scale));
  g.applyMatrix4(m);
  return tint(g, color);
};

/** A limb as a capsule from a to b. */
const limb = (a: V3, b: V3, r: number, color: string) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CapsuleGeometry(r, len, 3, 8);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return tint(g, color);
};

const BAND = "#eeeee6";
const BOOT = "#1b1a19";

const build = (pose: FigurePose, look: FigureLook): THREE.BufferGeometry => {
  const parts: THREE.BufferGeometry[] = [];
  const legs = look.pants ?? look.suit;
  // Where the hips are, and how far the upper body sits below standing height.
  const hip = pose === "sit" ? 0.56 : pose === "floor" ? 0.2 : 0.9;
  const up = hip - 0.9;
  for (const s of [-1, 1]) {
    const x = s * 0.095;
    if (pose === "sit") {
      parts.push(limb([x, hip, 0], [x, hip, 0.4], 0.08, legs), limb([x, hip - 0.02, 0.42], [x, 0.12, 0.44], 0.07, legs));
      parts.push(place(new THREE.BoxGeometry(0.11, 0.1, 0.27), BOOT, [x, 0.05, 0.5]));
      if (look.bands) parts.push(place(new THREE.CylinderGeometry(0.078, 0.078, 0.05, 10), BAND, [x, 0.26, 0.435]));
    } else if (pose === "floor") {
      parts.push(limb([x, hip, 0], [x * 1.4, 0.5, 0.34], 0.08, legs), limb([x * 1.4, 0.5, 0.36], [x * 1.5, 0.1, 0.66], 0.07, legs));
      parts.push(place(new THREE.BoxGeometry(0.11, 0.1, 0.27), BOOT, [x * 1.5, 0.05, 0.74]));
    } else {
      parts.push(limb([x, 0.16, 0], [x, hip, 0], 0.078, legs));
      parts.push(place(new THREE.BoxGeometry(0.11, 0.1, 0.27), BOOT, [x, 0.05, 0.035]));
      if (look.bands) parts.push(place(new THREE.CylinderGeometry(0.086, 0.086, 0.05, 10), BAND, [x, 0.3, 0]));
    }
    // Arms.
    const sh: V3 = [s * 0.235, 1.4 + up, 0];
    if (pose === "cheer") {
      const hand: V3 = [s * 0.38, 2.0, 0.02];
      parts.push(limb(sh, [s * 0.33, 1.72, 0.02], 0.056, look.suit), limb([s * 0.33, 1.72, 0.02], hand, 0.05, look.suit));
      parts.push(place(new THREE.SphereGeometry(0.058, 8, 6), look.skin, [hand[0], hand[1] + 0.07, hand[2]]));
    } else if (pose === "sit" || pose === "floor") {
      const elbow: V3 = [s * 0.27, 1.1 + up, 0.06];
      const hand: V3 = [s * 0.14, 0.98 + up, 0.34];
      parts.push(limb(sh, elbow, 0.056, look.suit), limb(elbow, hand, 0.05, look.suit));
      parts.push(place(new THREE.SphereGeometry(0.056, 8, 6), look.skin, hand));
    } else {
      const elbow: V3 = [s * 0.27, 1.1, 0];
      const hand: V3 = [s * 0.275, 0.82, 0.05];
      parts.push(limb(sh, elbow, 0.056, look.suit), limb(elbow, hand, 0.05, look.suit));
      parts.push(place(new THREE.SphereGeometry(0.056, 8, 6), look.skin, [hand[0], hand[1] - 0.06, hand[2]]));
    }
  }
  // Torso, neck, head.
  parts.push(place(new THREE.CapsuleGeometry(0.16, 0.34, 4, 12), look.suit, [0, 1.14 + up, 0], [0, 0, 0], [1.16, 1, 0.74]));
  if (look.bands) parts.push(place(new THREE.BoxGeometry(0.385, 0.05, 0.25), BAND, [0, 1.22 + up, 0]));
  parts.push(place(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8), look.skin, [0, 1.49 + up, 0]));
  parts.push(place(new THREE.SphereGeometry(0.105, 14, 10), look.skin, [0, 1.6 + up, 0.005], [0, 0, 0], [0.94, 1.1, 1]));
  parts.push(place(new THREE.SphereGeometry(0.022, 6, 5), look.skin, [0, 1.585 + up, 0.108]));
  if (look.hat) {
    parts.push(place(new THREE.SphereGeometry(0.122, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), look.hat, [0, 1.63 + up, 0], [0, 0, 0], [1, 0.86, 1.1]));
    parts.push(place(new THREE.CylinderGeometry(0.15, 0.15, 0.018, 16), look.hat, [0, 1.635 + up, 0.02], [0, 0, 0], [1, 1, 1.14]));
    parts.push(place(new THREE.BoxGeometry(0.05, 0.045, 0.03), "#fff6d0", [0, 1.685 + up, 0.13]));
  } else {
    parts.push(place(new THREE.SphereGeometry(0.109, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.56), look.hair ?? "#1a1512", [0, 1.615 + up, -0.012], [-0.25, 0, 0], [0.97, 1.08, 1.03]));
  }
  const merged = mergeGeometries(
    parts.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
      g.deleteAttribute("uv");
      return g;
    }),
    false
  );
  return merged ?? new THREE.BufferGeometry();
};

const cache = new Map<string, THREE.BufferGeometry>();
const figureGeo = (pose: FigurePose, look: FigureLook) => {
  const key = `${pose}|${look.suit}|${look.pants ?? ""}|${look.hat ?? ""}|${look.skin}|${look.hair ?? ""}|${look.bands ? 1 : 0}`;
  let g = cache.get(key);
  if (!g) {
    g = build(pose, look);
    cache.set(key, g);
  }
  return g;
};

/** Looks for the miners and for the camp. */
const SKINS = ["#b98562", "#a8744f", "#c79670", "#8f5f43", "#d0a17e"];
const HAIRS = ["#17120f", "#2a1d14", "#3a3a38", "#0f0d0c"];
export const minerLook = (i: number): FigureLook => ({
  suit: i % 3 === 1 ? "#27324f" : i % 7 === 3 ? "#b9541a" : "#d9621c",
  hat: i % 5 === 2 ? "#f2f2ec" : "#f0bd1c",
  skin: SKINS[i % SKINS.length],
  bands: true,
});
export const campLook = (i: number): FigureLook => {
  const tops = ["#c43a2c", "#2f4f8f", "#e0b03a", "#3d6b3f", "#7a3b6e", "#d8d4cc", "#5a4636", "#b8261e"];
  const worker = i % 3 === 0;
  return {
    suit: worker ? "#b8261e" : tops[i % tops.length],
    pants: worker ? undefined : ["#2b3a55", "#3a3a3a", "#55473a"][i % 3],
    hat: worker ? "#f2f2ec" : i % 4 === 1 ? "#f0bd1c" : null,
    skin: SKINS[(i * 2 + 1) % SKINS.length],
    hair: HAIRS[i % HAIRS.length],
    bands: worker,
  };
};

export const People: React.FC<{ people: Person[]; frame: number; cheer?: number }> = ({ people, frame, cheer = 0 }) => {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), []);
  return (
    <>
      {people.map((p, i) => {
        const phase = p.phase ?? i * 1.7;
        const up = cheer > 0.3 && p.pose === "stand" && i % 4 !== 3;
        const bob = up ? Math.max(0, Math.sin(frame * 0.5 + phase)) * 0.1 * cheer : 0;
        const sway = Math.sin(frame * 0.045 + phase) * 0.035;
        const s = p.size ?? 1;
        return (
          <mesh
            key={i}
            geometry={figureGeo(up ? "cheer" : p.pose, p.look)}
            material={material}
            position={[p.x, bob, p.z]}
            rotation={[0, p.yaw + sway * 2, sway * (p.pose === "stand" ? 0.6 : 0.2)]}
            scale={s}
            castShadow
            receiveShadow
          />
        );
      })}
    </>
  );
};
