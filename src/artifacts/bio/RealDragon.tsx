import type React from "react";
import { useMemo } from "react";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Vec3 } from "../../engine/types";
import { useGltf } from "./gltf";

/**
 * The realistic dragon: "European Dragon" by Regina Cachoa (CC-BY 4.0,
 * sketchfab.com/3d-models/european-dragon-82f393a2e6c048ad80c171ce3b3a7b87),
 * a rigged, hand-painted model with five clips (idle stand, idle sit, walk,
 * run, fly). Credited in public/bio/dragon/models/CREDITS.md.
 *
 * Everything is a pure function of the frame: the clips are sampled at
 * `pose.time` (never advanced by a clock), blended by weight, then the jaw,
 * neck, head and lids are layered on top. The x-ray mode fades the hide to a
 * glassy shell so the organs inside (DragonGuts) read through it.
 *
 * `children(anchors)` receives the bone positions this frame, in the dragon's
 * own space (before `position`/`yaw`/`scale`), so organs, fire and sparks can
 * ride the animated body.
 */

export const DRAGON_GLB = "bio/dragon/models/european_dragon.glb";

export type DragonClip = "idle" | "sit" | "walk" | "run" | "fly";
const CLIP_NAMES: Record<DragonClip, string> = {
  idle: "Idle Stand",
  sit: "Idle Sit",
  walk: "Walk",
  run: "Run",
  fly: "Fly",
};

export interface DragonPose {
  /** Clip weights; normalised, so { idle: 1 } and { idle: 3 } are the same. */
  clips: Partial<Record<DragonClip, number>>;
  /** Seconds into the clips (each loops on its own length). */
  time: number;
  /** Extra jaw opening, 0 (as animated) to 1 (full roar). */
  jaw?: number;
  /** Neck bend added over the neck bones: [pitch down +, turn left +], radians in total. */
  neck?: [number, number];
  /** Head bend on top: [pitch down +, turn left +]. */
  head?: [number, number];
  /** Per-neck-bone pitch, base to head (curl down +): arches the neck to reach the floor. */
  neckCurve?: number[];
  /** Lean the chest forward and down (+). */
  lean?: number;
  /** 0 open, 1 shut. */
  blink?: number;
}

export interface DragonAnchors {
  /** Rumen (gut), tank (chest stomach), throat points base to mouth, mouth tip, mouth direction. */
  gut: Vec3;
  tank: Vec3;
  throat: Vec3[];
  mouth: Vec3;
  mouthDir: Vec3;
  head: Vec3;
  eye: Vec3;
  /** World-ish scale of the body (distance hip to neck base), for sizing organs. */
  size: number;
}

export interface RealDragonProps {
  position?: Vec3;
  yaw?: number;
  scale?: number;
  pose: DragonPose;
  /** 0 = hide, 1 = glass x-ray shell. */
  xray?: number;
  /** 0 = ivory teeth, 1 = iron-capped (dark, metallic, rust-orange edge). */
  iron?: number;
  /** Warm glow in the eyes (0..1). */
  eyeGlow?: number;
  /** Belly lit from inside (fire in the gut): colour and amount. */
  innerGlow?: { color: string; amount: number };
  children?: (a: DragonAnchors) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Rig: bone lookup (GLTFLoader strips dots from names)
// ---------------------------------------------------------------------------
type Rig = {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<DragonClip, THREE.AnimationAction>;
  bones: Record<string, THREE.Bone>;
  neck: THREE.Bone[];
  lids: { bone: THREE.Bone; upper: boolean }[];
  body: THREE.SkinnedMesh[];
  bodyMats: THREE.MeshStandardMaterial[];
  teethMats: THREE.MeshStandardMaterial[];
  eyeMats: THREE.MeshStandardMaterial[];
  xray: THREE.SkinnedMesh[];
  xrayMat: THREE.MeshStandardMaterial;
  base: Map<THREE.Bone, THREE.Quaternion>;
};

const findBone = (all: THREE.Bone[], key: string) => {
  const k = key.replace(/\./g, "");
  const b = all.filter((x) => x.name.replace(/\./g, "").startsWith(k))[0];
  if (!b) throw new Error(`RealDragon: no bone ${key}`);
  return b;
};

/** Glassy fresnel shell: bright rim, see-through middle. */
const makeXrayMaterial = () => {
  const m = new THREE.MeshStandardMaterial({
    color: "#000000",
    emissive: new THREE.Color("#7fe8ff"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const uXray = { value: 0 };
  m.userData.uXray = uXray;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uXray = uXray;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uXray;\nvoid main() {")
      .replace(
        "#include <opaque_fragment>",
        `float fres = pow(clamp(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2); // clamp: pow of a tiny negative is NaN, and bloom spreads it
         outgoingLight = emissive * (0.05 + 1.25 * fres) * uXray;
         diffuseColor.a = 1.0;
         #include <opaque_fragment>`,
      );
  };
  return m;
};

const buildRig = (scene: THREE.Object3D, clips: THREE.AnimationClip[]): Rig => {
  const root = cloneSkinned(scene);
  const all: THREE.Bone[] = [];
  const body: THREE.SkinnedMesh[] = [];
  const bodyMats: THREE.MeshStandardMaterial[] = [];
  const teethMats: THREE.MeshStandardMaterial[] = [];
  const eyeMats: THREE.MeshStandardMaterial[] = [];
  const xrayMat = makeXrayMaterial();
  const xray: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) all.push(o as THREE.Bone);
    const sm = o as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh) {
      sm.frustumCulled = false;
      sm.castShadow = true;
      sm.receiveShadow = true;
      const mat = (sm.material as THREE.MeshStandardMaterial).clone();
      sm.material = mat;
      const name = mat.name;
      if (name === "Low_Poly_Bake") {
        body.push(sm);
        bodyMats.push(mat);
      } else if (name === "Material.002" || name === "Material.003") teethMats.push(mat);
      else eyeMats.push(mat);
    }
  });
  // The glass shell rides the same skeleton as the hide.
  for (const sm of body) {
    const shell = new THREE.SkinnedMesh(sm.geometry, xrayMat);
    shell.bind(sm.skeleton, sm.bindMatrix);
    shell.frustumCulled = false;
    shell.renderOrder = 5;
    sm.parent?.add(shell);
    xray.push(shell);
  }
  for (const m of teethMats) m.userData.base = { color: m.color.clone(), metal: m.metalness, rough: m.roughness };
  for (const m of eyeMats) m.userData.emissive = m.emissive.clone();

  const mixer = new THREE.AnimationMixer(root);
  const actions = {} as Record<DragonClip, THREE.AnimationAction>;
  (Object.keys(CLIP_NAMES) as DragonClip[]).forEach((k) => {
    const clip = clips.filter((c) => c.name === CLIP_NAMES[k])[0];
    const a = mixer.clipAction(clip);
    a.play();
    a.setEffectiveWeight(0);
    actions[k] = a;
  });
  const bones: Record<string, THREE.Bone> = {};
  const keys = ["DEF-Spine_02", "DEF-Spine.002", "DEF-Spine.004", "DEF-Spine.005", "DEF-Teeth_Top", "DEF-Bone_014", "DEF-Bone.002", "DEF-eye.L_", "DEF-Hip.L", "DEF-neck_08"];
  for (const k of keys) bones[k] = findBone(all, k);
  const neck = ["DEF-neck_08", "DEF-neck.001", "DEF-neck.002", "DEF-neck.003", "DEF-neck.004"].map((k) => findBone(all, k));
  const lids = all
    .filter((b) => /lid\d\.?[TB]\.[LR]/.test(b.name) || /lid\d[TB][LR]/.test(b.name.replace(/\./g, "")))
    .map((b) => ({ bone: b, upper: /\.?T\.?[LR]/.test(b.name.replace(/lid\d/, "")) }));
  // Bones we bend start each frame from rest, in case no clip drives them.
  const base = new Map<THREE.Bone, THREE.Quaternion>();
  for (const b of [bones["DEF-Bone.002"], bones["DEF-Spine.004"], bones["DEF-Spine.005"], ...neck, ...lids.map((l) => l.bone)]) base.set(b, b.quaternion.clone());
  return { root, mixer, actions, bones, neck, lids, body, bodyMats, teethMats, eyeMats, xray, xrayMat, base };
};

// ---------------------------------------------------------------------------
// Posing
// ---------------------------------------------------------------------------
const V = new THREE.Vector3();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const toVec = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];
const at = (o: THREE.Object3D, local?: [number, number, number]) => {
  V.set(local ? local[0] : 0, local ? local[1] : 0, local ? local[2] : 0);
  return toVec(V.applyMatrix4(o.matrixWorld));
};

/** Rotate a bone about its own axes, on top of the animated pose. */
const bend = (b: THREE.Bone, x: number, y: number, z: number) => {
  if (!x && !y && !z) return;
  Q.setFromEuler(E.set(x, y, z));
  b.quaternion.multiply(Q);
};

/**
 * Tunables found in the stills (bone axes of this rig): the lower jaw is
 * DEF-Bone.002 and opens about its -X; the upper-teeth bone points back up the
 * snout (its -Y runs to the tip, its +Z down into the mouth).
 */
export const DRAGON_RIG = {
  jawMax: 0.75,
  /** Snout tip and mouth centre, in the upper-teeth bone's space. */
  tipLocal: [0, -0.36, -0.05] as [number, number, number],
  mouthLocal: [0, -0.3, 0.14] as [number, number, number],
  lid: 0.55,
};

const poseRig = (rig: Rig, pose: DragonPose) => {
  const { clips, time } = pose;
  rig.base.forEach((q, b) => b.quaternion.copy(q));
  const names = Object.keys(clips) as DragonClip[];
  const total = names.reduce((s, k) => s + Math.max(0, clips[k] ?? 0), 0) || 1;
  (Object.keys(rig.actions) as DragonClip[]).forEach((k) => {
    const a = rig.actions[k];
    const w = Math.max(0, clips[k] ?? 0) / total;
    a.setEffectiveWeight(w);
    const len = a.getClip().duration;
    a.time = ((time % len) + len) % len;
  });
  rig.mixer.update(0);

  const jaw = Math.max(0, pose.jaw ?? 0) * DRAGON_RIG.jawMax;
  bend(rig.bones["DEF-Bone.002"], -jaw, 0, 0);
  const [np, ny] = pose.neck ?? [0, 0];
  for (const b of rig.neck) bend(b, np / rig.neck.length, 0, ny / rig.neck.length);
  (pose.neckCurve ?? []).forEach((v, i) => rig.neck[i] && bend(rig.neck[i], v, 0, 0));
  if (pose.lean) {
    bend(rig.bones["DEF-Spine.004"], pose.lean * 0.5, 0, 0);
    bend(rig.bones["DEF-Spine.005"], pose.lean * 0.5, 0, 0);
  }
  const [hp, hy] = pose.head ?? [0, 0];
  bend(rig.neck[rig.neck.length - 1], hp, 0, hy);
  const blink = Math.max(0, Math.min(1, pose.blink ?? 0));
  if (blink > 0) for (const l of rig.lids) bend(l.bone, (l.upper ? 1 : -1) * blink * DRAGON_RIG.lid, 0, 0);

  // Bone positions in the dragon's own space (the clone root sits at identity).
  rig.root.updateMatrix();
  rig.root.matrixWorld.copy(rig.root.matrix);
  for (const c of rig.root.children) c.updateMatrixWorld(true);
};

const anchorsOf = (rig: Rig): DragonAnchors => {
  const b = rig.bones;
  const top = b["DEF-Teeth_Top"];
  const mouth = at(top, DRAGON_RIG.mouthLocal);
  const tip = at(top, DRAGON_RIG.tipLocal);
  const back = at(top, [0, 0, 0]);
  // Snout axis: from the back of the skull to the tip.
  const skull = at(b["DEF-Bone_014"]);
  const d = new THREE.Vector3(tip[0] - skull[0], tip[1] - skull[1], tip[2] - skull[2]).normalize();
  const hip = at(b["DEF-Spine_02"]);
  const neckBase = at(b["DEF-neck_08"]);
  return {
    gut: at(b["DEF-Spine.002"]),
    tank: at(b["DEF-Spine.004"]),
    throat: [...rig.neck.map((n) => at(n)), back],
    mouth,
    mouthDir: toVec(d),
    head: at(b["DEF-Bone_014"]),
    eye: at(b["DEF-eye.L_"]),
    size: Math.hypot(neckBase[0] - hip[0], neckBase[1] - hip[1], neckBase[2] - hip[2]),
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const IRON = new THREE.Color("#3a3634");
const C = new THREE.Color();

export const RealDragon: React.FC<RealDragonProps> = ({
  position = [0, 0, 0],
  yaw = 0,
  scale = 1,
  pose,
  xray = 0,
  iron = 0,
  eyeGlow = 0,
  innerGlow,
  children,
}) => {
  useVideoConfig();
  const gltf = useGltf(DRAGON_GLB);
  const rig = useMemo(() => (gltf ? buildRig(gltf.scene, gltf.animations) : null), [gltf]);
  if (!rig) return null;

  poseRig(rig, pose);
  const anchors = anchorsOf(rig);

  // Hide → glass.
  const x = Math.max(0, Math.min(1, xray));
  for (const m of rig.bodyMats) {
    const see = x > 0.001;
    m.transparent = see;
    m.opacity = 1 - 0.9 * x;
    m.depthWrite = x < 0.5;
    m.needsUpdate = m.userData.see !== see;
    m.userData.see = see;
    if (innerGlow && innerGlow.amount > 0) {
      m.emissive.set(innerGlow.color);
      m.emissiveIntensity = innerGlow.amount;
    } else m.emissiveIntensity = 0;
  }
  for (const s of rig.xray) s.visible = x > 0.001;
  (rig.xrayMat.userData.uXray as { value: number }).value = x;

  // Ivory → iron teeth.
  for (const m of rig.teethMats) {
    const base = m.userData.base as { color: THREE.Color; metal: number; rough: number };
    m.color.copy(base.color).lerp(C.copy(IRON), iron);
    m.metalness = base.metal + (0.85 - base.metal) * iron;
    m.roughness = base.rough + (0.32 - base.rough) * iron;
    m.emissive.set("#ff6a1a");
    m.emissiveIntensity = 0.06 * iron;
  }
  for (const m of rig.eyeMats) {
    m.emissive.set("#ffae3a");
    m.emissiveIntensity = 0.9 * eyeGlow;
  }

  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <primitive object={rig.root} />
      {children ? children(anchors) : null}
    </group>
  );
};
