import type React from "react";
import type * as THREE from "three";
import type { Vec3 } from "../../../engine/types";
import type { Expression, FaceKit } from "./Face";
import { HeaterShield } from "./gear";
import { G, INK_THIN, glow, vinyl } from "./ink";
import { Part } from "./Part";
import type { AdventurerPose, RigPose } from "./poses";

/**
 * Class kits: everything that makes a goblin a goblin. The rig (AdventurerUnit)
 * owns proportions, joints and the face; a kit only dresses the slots below.
 *
 * Coordinate frames handed to each slot:
 *  - Torso / Back : body space (feet at y=0, faces +z), already leaned at the hips.
 *  - Head         : head centre at the origin, radius `headR`.
 *  - Shoulder     : shoulder joint at the origin, arm hanging along -y.
 *  - Cuff         : wrist at the origin, hand below it along -y.
 */

export type AdventurerClass = "goblin" | "rogue" | "mage" | "paladin";
export type Weapon = "sword" | "warhammer" | "club" | "dagger" | "daggers" | "staff" | "none";

export interface KitCtx {
  frame: number;
  pose: AdventurerPose;
  rig: RigPose;
  weapon: Weapon;
  /** Cape / hood-tail sway in radians (already pose dependent). */
  sway: number;
}

export interface ClassKit {
  scale: number;
  headR: number;
  face: FaceKit;
  blinkSeed: number;
  defaultWeapon: Weapon;
  limbs: {
    upperArm: THREE.Material;
    forearm: THREE.Material;
    hand: THREE.Material;
    thigh: THREE.Material;
    shin: THREE.Material;
    foot: THREE.Material;
    /** Goblins run barefoot: rounded feet instead of boots. */
    bareFeet?: boolean;
  };
  Torso: React.FC<KitCtx>;
  Head: React.FC<KitCtx>;
  Back?: React.FC<KitCtx>;
  Shoulder?: React.FC<{ side: -1 | 1 }>;
  Cuff?: React.FC<{ side: -1 | 1 }>;
  /** Per-pose overrides of the default expression table. */
  expression?: Partial<Record<AdventurerPose, Expression>>;
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Point on a sphere of radius r at (yaw, pitch); pitch > 0 is below the equator. */
export const onSphere = (r: number, yaw: number, pitch: number): Vec3 => [
  r * Math.cos(pitch) * Math.sin(yaw),
  -r * Math.sin(pitch),
  r * Math.cos(pitch) * Math.cos(yaw),
];

const GOLD = "#f2c14e";
const STEEL = "#d9e1ec";
const LEATHER = "#5a3a24";

/**
 * Hood / helmet shell: a closed crown down to `browTheta`, then sides and back
 * down to `thetaMax` with a face opening `gap` radians wide. Inked rims run
 * round the opening and the bottom edge. Thetas are polar angles from the top.
 */
const OpenShell: React.FC<{
  r: number;
  browTheta: number;
  thetaMax: number;
  gap: number;
  mat: THREE.Material;
  rimMat?: THREE.Material;
  rimTube?: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}> = ({ r, browTheta, thetaMax, gap, mat, rimMat, rimTube = 0.018, position, rotation, scale }) => {
  const phiStart = Math.PI / 2 + gap / 2;
  const rim = rimMat ?? mat;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Part geo={G.sphere(r, 0, browTheta)} inkGeo={G.sphere(r, 0, thetaMax)} mat={mat} />
      <Part geo={G.sphere(r, browTheta, thetaMax - browTheta, phiStart, Math.PI * 2 - gap)} mat={mat} ink={false} />
      {/* Brow edge across the opening */}
      <Part
        geo={G.torus(r * Math.sin(browTheta), rimTube, gap)}
        mat={rim}
        position={[0, r * Math.cos(browTheta), 0]}
        rotation={[Math.PI / 2, 0, Math.PI / 2 - gap / 2]}
        ink={INK_THIN}
      />
      {/* Cheek edges (meridians at phi = pi/2 +- gap/2) */}
      {[Math.PI / 2 + gap / 2, Math.PI / 2 - gap / 2].map((phi) => (
        <group key={phi} rotation={[0, phi - Math.PI, 0]}>
          <Part
            geo={G.torus(r, rimTube, thetaMax - browTheta)}
            mat={rim}
            rotation={[0, 0, Math.PI / 2 - thetaMax]}
            ink={INK_THIN}
          />
        </group>
      ))}
      {/* Bottom edge */}
      <Part
        geo={G.torus(r * Math.sin(thetaMax), rimTube, Math.PI * 2 - gap)}
        mat={rimMat ?? mat}
        position={[0, r * Math.cos(thetaMax), 0]}
        rotation={[Math.PI / 2, 0, Math.PI / 2 + gap / 2]}
        ink={INK_THIN}
      />
    </group>
  );
};

/** Upper-body lathe profile ([radius, y] from the hips up), squashed front-to-back. */
const TORSO_PROFILE = [
  [0.0, 0.56],
  [0.17, 0.58],
  [0.2, 0.66],
  [0.205, 0.8],
  [0.235, 0.96],
  [0.225, 1.06],
  [0.15, 1.15],
  [0.0, 1.17],
] as const;

const Torso: React.FC<{ mat: THREE.Material; breathe: number; profile?: ReadonlyArray<readonly [number, number]>; id?: string }> = ({
  mat,
  breathe,
  profile = TORSO_PROFILE,
  id = "torso",
}) => (
  <group position={[0, 0.58, 0]} scale={[breathe, 1, breathe]}>
    <Part geo={G.lathe(id, profile.map(([r, y]) => [r, y - 0.58] as const))} mat={mat} scale={[1, 1, 0.8]} />
  </group>
);

const Belt: React.FC<{ color?: string; buckle?: string; y?: number; r?: number }> = ({
  color = LEATHER,
  buckle = GOLD,
  y = 0.68,
  r = 0.212,
}) => (
  <group position={[0, y, 0]}>
    <Part geo={G.cyl(r, r, 0.075, 28)} mat={vinyl(color, "leather")} scale={[1, 1, 0.8]} ink={INK_THIN} />
    <Part geo={G.box(0.09, 0.08, 0.03, 0.012)} mat={vinyl(buckle, "gold")} position={[0, 0, r * 0.8 + 0.01]} ink={INK_THIN} />
  </group>
);

const HumanEars: React.FC<{ r: number; skin: string }> = ({ r, skin }) => (
  <>
    {([-1, 1] as const).map((s) => (
      <Part key={s} geo={G.sphere(0.06)} mat={vinyl(skin, "skin")} position={[s * r * 0.97, -0.02, -0.01]} scale={[0.45, 1, 0.75]} ink={INK_THIN} />
    ))}
  </>
);

const Nose: React.FC<{ r: number; skin: string; size?: number; pitch?: number }> = ({ r, skin, size = 0.05, pitch = 0.24 }) => (
  <Part geo={G.sphere(size)} mat={vinyl(skin, "skin")} position={onSphere(r - size * 0.35, 0, pitch)} scale={[1, 0.9, 0.9]} ink={INK_THIN} />
);

// ---------------------------------------------------------------------------
// Goblin: big-eared, big-nosed scrapper in a rusty pot helm.
// ---------------------------------------------------------------------------

const GOB_SKIN = "#7fc456";
const GOB_SKIN_DARK = "#5a9a3c";
const BURLAP = "#a8834f";
const RUST = "#9c6a44";

const goblin: ClassKit = {
  scale: 0.82,
  headR: 0.29,
  blinkSeed: 11,
  defaultWeapon: "club",
  face: {
    r: 0.29,
    skin: GOB_SKIN,
    eyeYaw: 0.36,
    eyePitch: 0.06,
    eyeR: 0.07,
    sclera: "#fff6c2",
    iris: "#e08a12",
    brow: "#2f4a1f",
    browSize: 1.1,
    mouth: true,
    mouthPitch: 0.5,
    mouthWidth: 1.35,
    fangs: true,
  },
  limbs: {
    upperArm: vinyl(GOB_SKIN, "skin"),
    forearm: vinyl(GOB_SKIN, "skin"),
    hand: vinyl(GOB_SKIN, "skin"),
    thigh: vinyl(GOB_SKIN, "skin"),
    shin: vinyl(GOB_SKIN, "skin"),
    foot: vinyl(GOB_SKIN_DARK, "skin"),
    bareFeet: true,
  },
  Torso: ({ rig }) => (
    <>
      <Torso
        mat={vinyl(GOB_SKIN, "skin")}
        breathe={rig.breathe}
        id="gob-torso"
        profile={[
          [0, 0.56],
          [0.18, 0.58],
          [0.22, 0.68],
          [0.22, 0.82],
          [0.22, 0.96],
          [0.2, 1.06],
          [0.13, 1.14],
          [0, 1.16],
        ]}
      />
      {/* Burlap kilt with a rope belt */}
      <Part
        geo={G.lathe("gob-kilt", [
          [0.3, 0.4],
          [0.27, 0.5],
          [0.235, 0.62],
          [0.225, 0.72],
        ])}
        mat={vinyl(BURLAP, "cloth")}
        scale={[1, 1, 0.82]}
      />
      <Belt color="#c9a86a" buckle="#c9a86a" y={0.7} r={0.232} />
      {/* Leather strap over the shoulder */}
      <Part geo={G.box(0.06, 0.62, 0.36, 0.02)} mat={vinyl(LEATHER, "leather")} position={[0, 0.88, 0]} rotation={[0, 0, 0.62]} scale={[1, 1, 1]} ink={INK_THIN} />
      {/* Belly patch for shape */}
      <Part geo={G.sphere(0.16)} mat={vinyl("#97d46c", "skin")} position={[0, 0.8, 0.09]} scale={[1, 0.95, 0.55]} ink={false} />
    </>
  ),
  Head: () => {
    const r = 0.29;
    return (
      <>
        {/* Ears: long, flat, swept out and up */}
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * (r * 0.9), 0.02, -0.03]} rotation={[0.15, -s * 0.35, -s * (Math.PI / 2 - 0.42)]}>
            <Part geo={G.cone(0.1, 0.34, 16)} mat={vinyl(GOB_SKIN, "skin")} position={[0, 0.15, 0]} scale={[1, 1, 0.38]} />
            <mesh geometry={G.cone(0.06, 0.22, 12)} material={vinyl("#d98a8a", "skin")} position={[0, 0.12, 0.022]} scale={[1, 1, 0.2]} />
          </group>
        ))}
        {/* Long hooked nose */}
        <group position={onSphere(r * 0.92, 0, 0.26)} rotation={[Math.PI / 2 + 0.45, 0, 0]}>
          <Part geo={G.cone(0.06, 0.22, 16)} mat={vinyl(GOB_SKIN_DARK, "skin")} position={[0, 0.09, 0]} />
        </group>
        {/* Rusty pot helm */}
        <group position={[0, 0.07, -0.01]} rotation={[-0.12, 0, 0.1]}>
          <Part geo={G.sphere(r * 1.05, 0, Math.PI * 0.4)} inkGeo={G.sphere(r * 1.05, 0, Math.PI * 0.4)} mat={vinyl(RUST, "metal")} />
          <Part
            geo={G.torus(r * 1.05 * Math.sin(Math.PI * 0.4), 0.028)}
            mat={vinyl("#7d5536", "metal")}
            position={[0, r * 1.05 * Math.cos(Math.PI * 0.4), 0]}
            rotation={[Math.PI / 2, 0, 0]}
            ink={INK_THIN}
          />
          <Part geo={G.cyl(0.03, 0.05, 0.07, 10)} mat={vinyl("#7d5536", "metal")} position={[0, r * 1.05 + 0.02, 0]} ink={INK_THIN} />
        </group>
      </>
    );
  },
  Cuff: () => <Part geo={G.cyl(0.07, 0.072, 0.05, 14)} mat={vinyl(LEATHER, "leather")} ink={INK_THIN} />,
  expression: { idle: "smug", walk: "smug" },
};

// ---------------------------------------------------------------------------
// Rogue: teal hood, crimson scarf, masked face, twin daggers.
// ---------------------------------------------------------------------------

const ROGUE_HOOD = "#2f6f62";
const ROGUE_TUNIC = "#3a7d6e";
const ROGUE_SKIN = "#eab88e";
const SCARF = "#c8323a";
const MASK = "#2b3542";

const rogue: ClassKit = {
  scale: 1,
  headR: 0.25,
  blinkSeed: 37,
  defaultWeapon: "daggers",
  face: {
    r: 0.25,
    skin: ROGUE_SKIN,
    eyeYaw: 0.33,
    eyePitch: 0.04,
    eyeR: 0.058,
    sclera: "#fbf7ee",
    iris: "#2f9a7e",
    brow: "#3a2418",
    mouth: false,
    mouthPitch: 0.42,
  },
  limbs: {
    upperArm: vinyl(ROGUE_TUNIC, "cloth"),
    forearm: vinyl(LEATHER, "leather"),
    hand: vinyl("#2c2a30", "leather"),
    thigh: vinyl("#2e2b36", "cloth"),
    shin: vinyl("#2e2b36", "cloth"),
    foot: vinyl("#5a3a24", "leather"),
  },
  Torso: ({ rig }) => (
    <>
      <Torso mat={vinyl(ROGUE_TUNIC, "cloth")} breathe={rig.breathe} />
      {/* Tunic skirt */}
      <Part
        geo={G.lathe("rogue-skirt", [
          [0.25, 0.48],
          [0.225, 0.58],
          [0.205, 0.68],
        ])}
        mat={vinyl("#2f6a5d", "cloth")}
        scale={[1, 1, 0.82]}
      />
      <Belt />
      {/* Crossed straps */}
      {[-1, 1].map((s) => (
        <Part
          key={s}
          geo={G.box(0.05, 0.42, 0.36, 0.015)}
          mat={vinyl(LEATHER, "leather")}
          position={[0, 0.9, 0]}
          rotation={[0, 0, s * 0.55]}
          ink={INK_THIN}
        />
      ))}
      <Part geo={G.box(0.12, 0.09, 0.05, 0.02)} mat={vinyl("#6b4a2e", "leather")} position={[0.12, 0.62, 0.15]} ink={INK_THIN} />
      {/* Scarf */}
      <Part geo={G.torus(0.14, 0.055)} mat={vinyl(SCARF, "cloth")} position={[0, 1.13, 0.0]} rotation={[Math.PI / 2 + 0.1, 0, 0]} scale={[1, 0.85, 1]} />
    </>
  ),
  Back: ({ sway }) => (
    <group position={[0.06, 1.12, -0.12]} rotation={[0.25 + sway * 0.8, 0, 0.12]}>
      <Part geo={G.box(0.11, 0.34, 0.03, 0.014)} mat={vinyl(SCARF, "cloth")} position={[0, -0.17, 0]} />
      <Part geo={G.box(0.11, 0.24, 0.03, 0.014)} mat={vinyl("#a8262e", "cloth")} position={[0.06, -0.14, -0.02]} rotation={[0, 0, -0.25]} />
    </group>
  ),
  Head: ({ sway }) => {
    const r = 0.25;
    return (
      <>
        <HumanEars r={r} skin={ROGUE_SKIN} />
        {/* Face mask over nose and mouth */}
        <Part geo={G.sphere(r + 0.008, Math.PI * 0.57, Math.PI * 0.3)} inkGeo={G.sphere(r + 0.008, Math.PI * 0.57, Math.PI * 0.3)} mat={vinyl(MASK, "cloth")} />
        <Part geo={G.sphere(0.04)} mat={vinyl(MASK, "cloth")} position={onSphere(r - 0.012, 0, 0.2)} scale={[1, 0.75, 0.9]} ink={false} />
        {/* Hood with a pointed tail */}
        <OpenShell
          r={r + 0.035}
          browTheta={Math.PI * 0.33}
          thetaMax={Math.PI * 0.68}
          gap={1.8}
          mat={vinyl(ROGUE_HOOD, "cloth")}
          rimMat={vinyl("#3d8a7a", "cloth")}
          rimTube={0.024}
          position={[0, 0.015, -0.01]}
        />
        <group position={[0, 0.12, -0.2]} rotation={[-1.05 - sway * 0.5, 0, 0]}>
          <Part geo={G.cone(0.12, 0.3, 18)} mat={vinyl(ROGUE_HOOD, "cloth")} position={[0, 0.12, 0]} scale={[1, 1, 0.7]} />
        </group>
      </>
    );
  },
  Cuff: () => <Part geo={G.cyl(0.07, 0.07, 0.05, 14)} mat={vinyl("#6b4a2e", "leather")} ink={INK_THIN} />,
  expression: { idle: "smug", point: "smug" },
};

// ---------------------------------------------------------------------------
// Mage: violet-blue robe, floppy hat, big white beard, glowing staff.
// ---------------------------------------------------------------------------

const ROBE = "#4b4fd1";
const ROBE_DARK = "#383ba8";
const MAGE_SKIN = "#eebb92";
const BEARD = "#f1f2f6";

const mage: ClassKit = {
  scale: 1,
  headR: 0.25,
  blinkSeed: 63,
  defaultWeapon: "staff",
  face: {
    r: 0.25,
    skin: MAGE_SKIN,
    eyeYaw: 0.32,
    eyePitch: 0.04,
    eyeR: 0.055,
    sclera: "#fbf7ee",
    iris: "#3aa6ff",
    brow: BEARD,
    browSize: 1.45,
    mouth: true,
    mouthPitch: 0.4,
    mouthLift: 0.035,
    mouthWidth: 0.9,
  },
  limbs: {
    upperArm: vinyl(ROBE, "cloth"),
    forearm: vinyl(ROBE, "cloth"),
    hand: vinyl(MAGE_SKIN, "skin"),
    thigh: vinyl(ROBE_DARK, "cloth"),
    shin: vinyl(ROBE_DARK, "cloth"),
    foot: vinyl("#6a3f2a", "leather"),
  },
  Torso: ({ rig }) => (
    <>
      <Torso mat={vinyl(ROBE, "cloth")} breathe={rig.breathe} />
      {/* Flared robe skirt with a gold hem */}
      <Part
        geo={G.lathe("mage-skirt", [
          [0.34, 0.3],
          [0.3, 0.42],
          [0.25, 0.56],
          [0.215, 0.7],
        ])}
        mat={vinyl(ROBE, "cloth")}
        scale={[1, 1, 0.85]}
      />
      <Part geo={G.torus(0.335, 0.022)} mat={vinyl(GOLD, "gloss")} position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.85, 1]} ink={INK_THIN} />
      <Belt color={GOLD} buckle="#5fe8ff" y={0.7} r={0.218} />
      {/* Front buttons */}
      {[0.8, 0.9].map((y) => (
        <Part key={y} geo={G.sphere(0.026)} mat={vinyl(GOLD, "gloss")} position={[0, y, 0.165 + (y - 0.8) * 0.12]} scale={[1, 1, 0.6]} ink={INK_THIN} />
      ))}
      {/* Collar */}
      <Part geo={G.torus(0.15, 0.04)} mat={vinyl(ROBE_DARK, "cloth")} position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.85, 1]} />
    </>
  ),
  Head: ({ sway }) => {
    const r = 0.25;
    return (
      <>
        <HumanEars r={r} skin={MAGE_SKIN} />
        <Nose r={r} skin="#eab08a" size={0.055} pitch={0.2} />
        {/* Beard + moustache */}
        <Part geo={G.cone(0.19, 0.42, 24)} mat={vinyl(BEARD, "hair")} position={[0, -0.27, 0.2]} rotation={[Math.PI - 0.35, 0, 0]} scale={[1, 1, 0.55]} />
        {[-1, 1].map((s) => (
          <Part key={s} geo={G.capsule(0.03, 0.13)} mat={vinyl(BEARD, "hair")} position={[s * 0.055, -0.07, 0.235]} rotation={[0, 0, s * 1.2]} ink={INK_THIN} />
        ))}
        {/* Floppy hat: brim, one bent crown drooping back and sideways, star at the tip */}
        <group position={[0, 0.13, -0.01]} rotation={[-0.1, 0, 0.06]}>
          <Part geo={G.cyl(0.4, 0.42, 0.035, 36)} mat={vinyl(ROBE_DARK, "cloth")} />
          <group rotation={[-sway * 0.25, 0, sway * 0.15]}>
            <Part geo={G.bentCone(0.25, 0.035, 0.56, 0.16, -0.26)} mat={vinyl(ROBE, "cloth")} position={[0, 0.01, 0]} />
            <mesh geometry={G.sphere(0.042)} material={glow("#ffe27a", 2.2)} position={[0.16, 0.01 + 0.56 - 0.42 * 0.35, -0.26]} />
          </group>
          <Part geo={G.cyl(0.258, 0.262, 0.05, 28)} mat={vinyl(GOLD, "gloss")} position={[0, 0.045, 0]} ink={INK_THIN} />
        </group>
      </>
    );
  },
  Cuff: () => (
    <group position={[0, 0.02, 0]}>
      <Part geo={G.cyl(0.075, 0.11, 0.12, 20)} mat={vinyl(ROBE, "cloth")} />
      <Part geo={G.torus(0.105, 0.016)} mat={vinyl(GOLD, "gold")} position={[0, -0.055, 0]} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
    </group>
  ),
};

// ---------------------------------------------------------------------------
// Paladin: plumed open helm, steel and red tabard, cape, heater shield.
// ---------------------------------------------------------------------------

const TABARD = "#c43a36";
const PAL_SKIN = "#e4ae86";
/** Torso profile inflated a touch so the tabard sits on top of the plate. */
const TABARD_PROFILE = [
  [0.29, 0.36],
  [0.265, 0.48],
  [0.235, 0.62],
  [0.222, 0.72],
  [0.225, 0.84],
  [0.25, 0.96],
  [0.24, 1.05],
] as const;

const paladin: ClassKit = {
  scale: 1.06,
  headR: 0.25,
  blinkSeed: 89,
  defaultWeapon: "sword",
  face: {
    r: 0.25,
    skin: PAL_SKIN,
    eyeYaw: 0.31,
    eyePitch: 0.06,
    eyeR: 0.054,
    sclera: "#fbf7ee",
    iris: "#3d6fd6",
    brow: "#6a3a1e",
    browSize: 1.15,
    mouth: true,
    mouthPitch: 0.44,
    mouthLift: 0.01,
  },
  limbs: {
    upperArm: vinyl("#b9c3d3", "metal"),
    forearm: vinyl(STEEL, "metal"),
    hand: vinyl("#6b4a2e", "leather"),
    thigh: vinyl("#b9c3d3", "metal"),
    shin: vinyl(STEEL, "metal"),
    foot: vinyl("#8792a6", "metal"),
  },
  Torso: ({ rig }) => (
    <>
      <Torso mat={vinyl(STEEL, "metal")} breathe={rig.breathe} />
      {/* Mail skirt */}
      <Part
        geo={G.lathe("pal-skirt", [
          [0.255, 0.44],
          [0.23, 0.56],
          [0.21, 0.68],
        ])}
        mat={vinyl("#8792a6", "metal")}
        scale={[1, 1, 0.82]}
      />
      {/* Tabard front and back panels hugging the torso, with a gold sun emblem */}
      {[0, Math.PI].map((a) => (
        <Part
          key={a}
          geo={G.latheArc("pal-tabard", TABARD_PROFILE, a - 0.6, 1.2)}
          mat={vinyl(TABARD, "cloth")}
          scale={[1, 1, 0.82]}
          ink={INK_THIN}
        />
      ))}
      <group position={[0, 0.9, 0.2]}>
        <Part geo={G.cyl(0.055, 0.055, 0.02, 20)} mat={vinyl(GOLD, "gold")} rotation={[Math.PI / 2, 0, 0]} ink={INK_THIN} />
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} geometry={G.box(0.022, 0.17, 0.016, 0.006)} material={vinyl(GOLD, "gold")} rotation={[0, 0, (i * Math.PI) / 4]} />
        ))}
      </group>
      <Belt color="#4a3020" y={0.66} r={0.238} />
      {/* Gorget */}
      <Part geo={G.cyl(0.13, 0.17, 0.08, 24)} mat={vinyl("#b9c3d3", "metal")} position={[0, 1.13, 0]} scale={[1, 1, 0.85]} />
    </>
  ),
  Back: ({ sway, weapon }) => (
    <>
      {/* Cape */}
      <group position={[0, 1.1, -0.17]} rotation={[0.16 + sway, 0, 0]}>
        <Part geo={G.box(0.46, 0.84, 0.07, 0.03)} mat={vinyl("#a62c2c", "cloth")} position={[0, -0.42, -0.035]} />
      </group>
      {weapon === "warhammer" ? (
        <HeaterShield color={TABARD} position={[0, 0.88, -0.24]} rotation={[-0.08, -Math.PI / 2, 0]} scale={0.85} />
      ) : null}
    </>
  ),
  Head: () => {
    const r = 0.25;
    return (
      <>
        <Nose r={r} skin="#d99c74" size={0.048} pitch={0.24} />
        {/* Moustache */}
        {[-1, 1].map((s) => (
          <Part key={s} geo={G.capsule(0.026, 0.12)} mat={vinyl("#7a4423", "hair")} position={[s * 0.05, -0.085, 0.232]} rotation={[0, s * 0.3, s * 1.25]} ink={INK_THIN} />
        ))}
        {/* Open-face helm with cheek guards and a nasal bar */}
        <OpenShell
          r={r + 0.03}
          browTheta={Math.PI * 0.34}
          thetaMax={Math.PI * 0.62}
          gap={1.6}
          mat={vinyl(STEEL, "metal")}
          rimMat={vinyl(GOLD, "gloss")}
          rimTube={0.02}
          position={[0, 0.02, -0.005]}
        />
        {/* Nasal guard from the brow rim down between the eyes */}
        <Part geo={G.box(0.04, 0.15, 0.025, 0.01)} mat={vinyl(GOLD, "gloss")} position={onSphere(r + 0.04, 0, -0.32)} rotation={[-0.32, 0, 0]} ink={INK_THIN} />
        {/* Crest ridge and plume */}
        <Part geo={G.box(0.04, 0.05, 0.42, 0.015)} mat={vinyl(GOLD, "gold")} position={[0, r + 0.05, -0.02]} rotation={[0.1, 0, 0]} ink={INK_THIN} />
        {[0, 1, 2, 3, 4].map((i) => {
          const t = i / 4;
          const a = -0.35 - t * 1.6;
          return (
            <Part
              key={i}
              geo={G.sphere(0.085 - t * 0.03)}
              mat={vinyl(i % 2 ? "#d63a3a" : "#e84a44", "cloth")}
              position={[0, 0.28 + Math.cos(a + 1.2) * 0.1 + 0.02 - t * 0.12, -0.02 + Math.sin(a) * 0.22 - t * 0.04]}
              scale={[0.7, 1, 1.15]}
            />
          );
        })}
      </>
    );
  },
  Shoulder: ({ side }) => (
    <group rotation={[0, 0, side * -0.25]}>
      <Part geo={G.sphere(0.13, 0, Math.PI * 0.5)} inkGeo={G.sphere(0.13, 0, Math.PI * 0.5)} mat={vinyl(STEEL, "metal")} position={[side * 0.02, -0.02, 0]} scale={[1.05, 0.8, 1]} />
      <Part geo={G.torus(0.128, 0.018)} mat={vinyl(GOLD, "gold")} position={[side * 0.02, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 1]} ink={INK_THIN} />
    </group>
  ),
  Cuff: () => <Part geo={G.cyl(0.08, 0.085, 0.07, 16)} mat={vinyl(GOLD, "gold")} ink={INK_THIN} />,
  expression: { idle: "smug" },
};

export const KITS: Record<AdventurerClass, ClassKit> = { goblin, rogue, mage, paladin };

/** Overall size multiplier per class (feet stay at y=0). */
export const CLASS_SCALE: Record<AdventurerClass, number> = {
  goblin: goblin.scale,
  rogue: rogue.scale,
  mage: mage.scale,
  paladin: paladin.scale,
};
