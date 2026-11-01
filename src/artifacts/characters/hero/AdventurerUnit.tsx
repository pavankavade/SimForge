import type React from "react";
import type { Vec3 } from "../../../engine/types";
import { Face, type Expression } from "./Face";
import { Cane, Dagger, Greataxe, HeaterShield, SpikedClub, Staff, Sword, Warhammer } from "./gear";
import { G, INK, vinyl } from "./ink";
import { KITS, Lute, type AdventurerClass, type KitCtx, type Weapon } from "./kits";
import { InkColor, Part } from "./Part";
import { solvePose, type AdventurerPose, type RigPose } from "./poses";

/**
 * Rig dimensions at scale 1 (before the per-class scale). Feet rest on y=0 and
 * the character faces +z. Scenes should derive contact heights from these
 * numbers instead of guessing (e.g. a body lying on its back has its spine at
 * about `RIG.lieY * scale` above the floor).
 */
export const RIG = {
  hipY: 0.62,
  hipX: 0.11,
  thigh: 0.26,
  shin: 0.25,
  shoulderY: 1.04,
  shoulderX: 0.27,
  upperArm: 0.21,
  forearm: 0.21,
  headY: 1.39,
  headR: 0.25,
  /** Top of the head (without hats). */
  height: 1.64,
  /** Torso half-depth: a body lying flat rests this high on its back/front. */
  lieY: 0.2,
} as const;

/** Default face per pose; kits can override, the `expression` prop wins. */
const POSE_EXPRESSION: Record<AdventurerPose, Expression> = {
  idle: "neutral",
  walk: "neutral",
  run: "focus",
  jump: "happy",
  cast: "focus",
  shield: "angry",
  shieldWalk: "angry",
  fall: "scared",
  launch: "scared",
  sprawl: "dazed",
  slip: "shock",
  float: "happy",
  windup: "angry",
  smash: "yell",
  cower: "scared",
  cheer: "happy",
  point: "smug",
  matrix: "focus",
  fly: "happy",
  diveCatch: "focus",
  hover: "focus",
  carry: "focus",
  ride: "happy",
  surf: "happy",
  play: "neutral",
};

/** Cape / hood-tail sway (radians) for a pose at an animation frame. */
export const poseSway = (pose: AdventurerPose, animFrame: number) =>
  Math.sin(animFrame * 0.26) * 0.05 +
  (pose === "walk" || pose === "shieldWalk" ? 0.12 : 0) +
  (pose === "run" ? 0.35 : 0) +
  (pose === "jump" || pose === "fall" || pose === "launch" || pose === "float" || pose === "fly" || pose === "diveCatch" || pose === "hover" ? 0.3 : 0);

/** Hip height above the feet for a class (world units at scale 1): the pivot for flight tilts and piggybacks. */
export const hipHeight = (classType: AdventurerClass) => {
  const kit = KITS[classType];
  return (RIG.hipY + ((kit.build?.leg ?? 1) - 1) * (RIG.thigh + RIG.shin)) * kit.scale;
};

export interface AdventurerUnitProps {
  classType: AdventurerClass;
  pose?: AdventurerPose;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  animFrame?: number;
  /** Held weapon; defaults per class (goblin club, rogue daggers, mage staff, paladin sword). */
  weapon?: Weapon;
  /** Face override (e.g. "dead" for corpses, "smug" for a gloat). */
  expression?: Expression;
  /**
   * Head (and, for decal-faced kits, hand) colour override. Light colours flip
   * decal faces to dark line work so they stay readable.
   */
  headColor?: string;
  /** Outline colour override. */
  inkColor?: string;
  /** Pre-solved joints (ActorView's pose blending); defaults to `pose` solved at `animFrame`. */
  rig?: RigPose;
  /** Cape / hood sway override (radians), blended alongside `rig`. */
  sway?: number;
}

/** Relative luminance 0..1 of a #rrggbb colour. */
const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

const DARK_DECAL = "#2b2230";
const LIGHT_DECAL = "#fbf6ea";

const HandGear: React.FC<{ weapon: Weapon; side: -1 | 1; frame: number }> = ({ weapon, side, frame }) => {
  if (side === -1) return weapon === "daggers" ? <Dagger tilt={-0.25} /> : null;
  switch (weapon) {
    case "sword":
      return <Sword />;
    case "warhammer":
      return <Warhammer />;
    case "club":
      return <SpikedClub />;
    case "dagger":
    case "daggers":
      return <Dagger />;
    case "staff":
      return <Staff frame={frame} />;
    case "cane":
      return <Cane />;
    case "greataxe":
      return <Greataxe />;
    default:
      return null;
  }
};

export const AdventurerUnit: React.FC<AdventurerUnitProps> = ({
  classType,
  pose = "idle",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  animFrame = 0,
  weapon,
  expression,
  headColor,
  inkColor,
  rig: rigOverride,
  sway: swayOverride,
}) => {
  const base = KITS[classType];
  const lightHead = headColor !== undefined && base.face.decal === true && luma(headColor) > 0.45;
  const kit = headColor
    ? {
        ...base,
        face: {
          ...base.face,
          skin: headColor,
          ...(base.face.decal
            ? lightHead
              ? { decalInk: DARK_DECAL, decalPupil: "#ffffff", brow: DARK_DECAL }
              : { decalInk: LIGHT_DECAL, decalPupil: DARK_DECAL, brow: LIGHT_DECAL }
            : {}),
        },
      }
    : base;
  const rig = rigOverride ?? solvePose(pose, animFrame);
  const gear: Weapon = weapon ?? kit.defaultWeapon;
  const sway = swayOverride ?? poseSway(pose, animFrame);
  const ctx: KitCtx = { frame: animFrame, pose, rig, weapon: gear, sway };

  const face: Expression = expression ?? kit.expression?.[pose] ?? POSE_EXPRESSION[pose];
  const blink = (animFrame + kit.blinkSeed) % 83 < 3;

  const isPaladin = classType === "paladin";
  const surfing = isPaladin && pose === "surf";
  const shieldOnArm = isPaladin && gear !== "warhammer" && !surfing;
  const shieldUp = shieldOnArm && (pose === "shield" || pose === "shieldWalk");

  const L = headColor && base.face.decal ? { ...kit.limbs, hand: vinyl(headColor, "skin") } : kit.limbs;
  const R = kit.headR;
  const headY = RIG.headY + (R - RIG.headR) * 0.8;
  const leg = kit.build?.leg ?? 1;
  const w = kit.build?.limb ?? 1;
  /** Extra hip height from longer legs; everything above the hips rides on it. */
  const lift = (leg - 1) * (RIG.thigh + RIG.shin);

  return (
    <InkColor.Provider value={inkColor ?? kit.inkColor ?? INK}>
    <group position={position} rotation={rotation} scale={scale * kit.scale}>
      <group position={[0, rig.bob, 0]}>
        {/* Surfing: the shield is the board, face up under the feet. */}
        {surfing ? <HeaterShield position={[0, -0.035, 0.02]} rotation={[0, 0, -Math.PI / 2]} scale={1.25} /> : null}

        {/* ------------------------------ Legs ------------------------------ */}
        {([-1, 1] as const).map((side) => (
          <group
            key={`leg${side}`}
            position={[side * RIG.hipX, RIG.hipY + lift, 0]}
            rotation={side === -1 ? rig.legL : rig.legR}
          >
            <Part geo={G.capsule(0.088 * w, 0.32 * leg)} mat={L.thigh} position={[0, -0.12 * leg, 0]} />
            <group position={[0, -RIG.thigh * leg, 0]} rotation={[side === -1 ? rig.kneeL : rig.kneeR, 0, 0]}>
              <Part geo={G.capsule(0.074 * w, 0.28 * leg)} mat={L.shin} position={[0, -0.12 * leg, 0]} />
              <group position={[0, -RIG.shin * leg, 0]}>
                {L.bareFeet ? (
                  <Part geo={G.sphere(0.095)} mat={L.foot} position={[0, -0.045, 0.06]} scale={[0.85, 0.55, 1.45]} />
                ) : (
                  <>
                    <Part geo={G.box(0.16, 0.12, 0.26, 0.045)} mat={L.foot} position={[0, -0.05, 0.04]} />
                    <Part geo={G.cyl(0.088, 0.082, 0.1, 16)} mat={L.foot} position={[0, 0.02, 0]} />
                  </>
                )}
              </group>
            </group>
          </group>
        ))}

        {/* --------------------------- Upper body --------------------------- */}
        <group position={[0, RIG.hipY + lift, 0]} rotation={[rig.lean, 0, 0]}>
          <group position={[0, -RIG.hipY, 0]}>
            {/* Pelvis */}
            <Part geo={G.sphere(0.18)} mat={L.thigh} position={[0, RIG.hipY, 0]} scale={[1.15, 0.7, 0.85]} />
            <kit.Torso {...ctx} />
            {kit.Back ? <kit.Back {...ctx} /> : null}

            {/* Arms */}
            {([-1, 1] as const).map((side) => (
              <group
                key={`arm${side}`}
                position={[side * RIG.shoulderX, RIG.shoulderY, 0]}
                rotation={side === -1 ? rig.armL : rig.armR}
              >
                <Part geo={G.sphere(0.082 * w)} mat={L.upperArm} />
                <Part geo={G.capsule(0.074 * w, 0.26)} mat={L.upperArm} position={[0, -0.1, 0]} />
                {kit.Shoulder ? <kit.Shoulder side={side} /> : null}
                <group position={[0, -RIG.upperArm, 0]} rotation={[side === -1 ? rig.elbowL : rig.elbowR, 0, 0]}>
                  <Part geo={G.capsule(0.064 * w, 0.24)} mat={L.forearm} position={[0, -0.09, 0]} />
                  {kit.Cuff ? (
                    <group position={[0, -0.16, 0]}>
                      <kit.Cuff side={side} />
                    </group>
                  ) : null}
                  {shieldOnArm && side === -1 && !shieldUp ? (
                    <HeaterShield position={[-0.11, -0.1, 0.05]} rotation={[0, 0.75, 0.08]} scale={0.9} />
                  ) : null}
                  <group position={[0, -RIG.forearm, 0]}>
                    <Part geo={G.sphere(0.078)} mat={L.hand} scale={[0.95, 1, 0.9]} />
                    <Part geo={G.sphere(0.032)} mat={L.hand} position={[side * -0.06, 0.015, 0.03]} />
                    <HandGear weapon={gear} side={side} frame={animFrame} />
                  </group>
                </group>
              </group>
            ))}

            {/* Lute played across the chest */}
            {gear === "lute" && pose === "play" ? (
              <group position={[0.02, 0.86, 0.26]} rotation={[0.1, 0, 0.95]} scale={1.35}>
                <Lute />
              </group>
            ) : null}

            {/* Raised shield: braced in front of the chest */}
            {shieldUp ? (
              <HeaterShield position={[-0.08, 0.98, 0.42]} rotation={[0.05, Math.PI / 2 - 0.12, 0]} scale={1.05} />
            ) : null}

            {/* Head */}
            <group position={[0, headY, 0]} rotation={[rig.head[0], 0, rig.head[1]]}>
              <Part geo={G.sphere(R)} mat={vinyl(kit.face.skin, "skin")} />
              <Face kit={kit.face} expression={face} blink={blink} />
              <kit.Head {...ctx} />
            </group>
          </group>
        </group>
      </group>
    </group>
    </InkColor.Provider>
  );
};
