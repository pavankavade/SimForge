import type React from "react";
import { useCurrentFrame } from "remotion";
import { VaultSet } from "../../artifacts/bio";
import { Dragon } from "../../artifacts/bio/Dragon";
import {
  ActorView,
  FACE_CAMERA,
  FACE_LEFT,
  dust,
  sparks,
  type Actor,
} from "../../kit";
import {
  BEATS,
  GOBLIN_ENTER,
  cutawayAmount,
  fermentActivity,
  flameIntensity,
  gasFlow,
  goblinX,
  jawOpening,
  shotStart,
  sparkIntensity,
  stomachClench,
} from "./timeline";

/**
 * 3D Staging for Dragon ("How a dragon survives its own fire").
 *
 * Sets the scene in a grand cavern lair filled with ancient treasure,
 * stone pillars, and flickering wall torches. The Dragon stands at center
 * with its cutaway anatomical chambers, while an adventurous little Goblin
 * wanders in, gets terrified by the flint-spark jaw snap, and ends up
 * comically scorched by the raging flame front.
 */

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // Dragon motion kinematics
  const cutaway = cutawayAmount(frame);
  const ferment = fermentActivity(frame);
  const clench = stomachClench(frame);
  const jaw = jawOpening(frame);
  const sparksVal = sparkIntensity(frame);
  const gas = gasFlow(frame);
  const flame = flameIntensity(frame);

  // Goblin actor state
  const goblinActor = (f: number): Actor | null => {
    if (f < GOBLIN_ENTER[0]) return null;

    const gx = goblinX(f);

    // 1. Walking in
    if (f < GOBLIN_ENTER[1]) {
      return {
        pose: "walk",
        position: [gx, 0, 0.4],
        yaw: FACE_LEFT,
        speed: 1.8,
        expression: "neutral",
        weapon: "none",
      };
    }

    // 2. Curious stop & inspection
    if (f < BEATS.gorge) {
      return {
        pose: "idle",
        position: [gx, 0, 0.4],
        yaw: FACE_LEFT,
        expression: "neutral",
        weapon: "none",
      };
    }

    // 3. Shocked double take at fermenting gurgle
    if (f < BEATS.burps) {
      return {
        pose: "point",
        position: [gx, 0, 0.4],
        yaw: FACE_CAMERA,
        expression: "shock",
        weapon: "none",
      };
    }

    // 4. Laughs at tiny burp
    if (f < shotStart("bomb")) {
      return {
        pose: "cheer",
        position: [gx, 0, 0.4],
        yaw: FACE_CAMERA,
        expression: "smug",
        weapon: "none",
      };
    }

    // 5. Cowering at living bomb warning
    if (f < BEATS.snap - 6) {
      return {
        pose: "cower",
        position: [gx, 0, 0.4],
        yaw: FACE_LEFT,
        expression: "scared",
        weapon: "none",
      };
    }

    // 6. Terror at iron jaw snap & flint sparks!
    if (f < BEATS.blast) {
      return {
        pose: "cower",
        position: [gx, 0, 0.4],
        yaw: FACE_LEFT,
        expression: "shock",
        weapon: "none",
      };
    }

    // 7. Blown back by flame pressure wave!
    if (f < BEATS.blast + 16) {
      return {
        pose: "slip",
        position: [gx, 0.2, 0.4],
        yaw: FACE_LEFT,
        tilt: 0.5,
        expression: "scared",
        weapon: "none",
      };
    }

    // 8. Charred and dazed on the ground
    return {
      pose: "sprawl",
      position: [gx, 0, 0.4],
      yaw: FACE_CAMERA,
      expression: "dazed",
      weapon: "none",
    };
  };

  return (
    <group>
      {/* ---------------- Environment: The Grand Dragon Hoard ---------------- */}
      <VaultSet day={0.35} torches={1.4} motes={true} />

      {/* ---------------- The Star: The Dragon ---------------- */}
      <Dragon
        position={[-0.55, 0, 0]}
        yaw={0.05}
        scale={1.12}
        cutaway={cutaway}
        fermentMulch={ferment}
        stomachClench={clench}
        jawOpen={jaw}
        sparkIntensity={sparksVal}
        gasFlow={gas}
        flameIntensity={flame}
        blink={frame % 130 < 6 ? 1 : 0}
        tailWhip={Math.sin(frame * 0.05)}
        breathPhase={frame * 0.035}
      />

      {/* ---------------- Adventurer: Chibi Goblin ---------------- */}
      <ActorView classType="goblin" actor={goblinActor} frame={frame} />

      {/* ---------------- SFX Particle Bursts ---------------- */}
      {/* 1. Flint & steel spark shower on jaw clash */}
      {sparks(BEATS.snap, [1.15, 1.82, 0.05], "jaw-snap-sparks", "#ffea78", 55)}

      {/* 2. Dust impact when goblin hits the ground */}
      {dust(BEATS.blast + 14, [3.8, 0, 0.4], "goblin-ground-dust", 0.9)}

      {/* 3. Extra ignition sparks when flamethrower roars */}
      {sparks(BEATS.blast, [1.2, 1.78, 0.0], "flamethrower-ignition-sparks", "#ff8822", 60)}
    </group>
  );
};
