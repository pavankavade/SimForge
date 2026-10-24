import type React from "react";
import type { Vec3 } from "../../../engine/types";
import { Face, type Expression } from "./Face";
import { Dagger, HeaterShield, SpikedClub, Staff, Sword, Warhammer } from "./gear";
import { G, vinyl } from "./ink";
import { KITS, type AdventurerClass, type KitCtx, type Weapon } from "./kits";
import { Part } from "./Part";
import { solvePose, type AdventurerPose } from "./poses";

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
}

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
}) => {
  const kit = KITS[classType];
  const rig = solvePose(pose, animFrame);
  const gear: Weapon = weapon ?? kit.defaultWeapon;
  const airborne = pose === "jump" || pose === "fall" || pose === "launch" || pose === "float";
  const sway =
    Math.sin(animFrame * 0.26) * 0.05 +
    (pose === "walk" || pose === "shieldWalk" ? 0.12 : 0) +
    (pose === "run" ? 0.35 : 0) +
    (airborne ? 0.3 : 0);
  const ctx: KitCtx = { frame: animFrame, pose, rig, weapon: gear, sway };

  const face: Expression = expression ?? kit.expression?.[pose] ?? POSE_EXPRESSION[pose];
  const blink = (animFrame + kit.blinkSeed) % 83 < 3;

  const isPaladin = classType === "paladin";
  const shieldOnArm = isPaladin && gear !== "warhammer";
  const shieldUp = shieldOnArm && (pose === "shield" || pose === "shieldWalk");

  const L = kit.limbs;
  const R = kit.headR;
  const headY = RIG.headY + (R - RIG.headR) * 0.8;

  return (
    <group position={position} rotation={rotation} scale={scale * kit.scale}>
      <group position={[0, rig.bob, 0]}>
        {/* ------------------------------ Legs ------------------------------ */}
        {([-1, 1] as const).map((side) => (
          <group
            key={`leg${side}`}
            position={[side * RIG.hipX, RIG.hipY, 0]}
            rotation={side === -1 ? rig.legL : rig.legR}
          >
            <Part geo={G.capsule(0.088, 0.32)} mat={L.thigh} position={[0, -0.12, 0]} />
            <group position={[0, -RIG.thigh, 0]} rotation={[side === -1 ? rig.kneeL : rig.kneeR, 0, 0]}>
              <Part geo={G.capsule(0.074, 0.28)} mat={L.shin} position={[0, -0.12, 0]} />
              <group position={[0, -RIG.shin, 0]}>
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
        <group position={[0, RIG.hipY, 0]} rotation={[rig.lean, 0, 0]}>
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
                <Part geo={G.sphere(0.082)} mat={L.upperArm} />
                <Part geo={G.capsule(0.074, 0.26)} mat={L.upperArm} position={[0, -0.1, 0]} />
                {kit.Shoulder ? <kit.Shoulder side={side} /> : null}
                <group position={[0, -RIG.upperArm, 0]} rotation={[side === -1 ? rig.elbowL : rig.elbowR, 0, 0]}>
                  <Part geo={G.capsule(0.064, 0.24)} mat={L.forearm} position={[0, -0.09, 0]} />
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
  );
};
