import type React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import {
  DungeonDiorama,
  SpikePit,
  HingedTrapdoor,
  BaitChest,
  PressurePlate,
  IceBridge,
  AlchemicalFlamers,
  PendulumBlade,
  TrebuchetFloor,
  MimicChest,
  AdventurerUnit,
} from "../../artifacts";
import type { AdventurerPose } from "../../artifacts/dungeon/AdventurerUnit";

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  // =========================================================================
  // BEAT 1 (0 - 330): BASE SPIKE PIT vs GOBLIN & ROGUE
  // =========================================================================
  // Goblin walking and falling in
  const goblinWalk = interpolate(frame, [30, 95], [-6.5, -1.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const goblinDropY = interpolate(frame, [95, 125], [0, -3.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const goblinPose = frame < 95 ? "walk" : "fall";
  const showGoblin = frame >= 25 && frame < 330;

  // Rogue leaping cleanly across pit
  const rogue1RunX = interpolate(frame, [150, 195], [-7.5, -2.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rogue1JumpX = interpolate(frame, [195, 240], [-2.2, 2.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rogue1JumpProgress = interpolate(frame, [195, 240], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rogue1JumpY = Math.sin(rogue1JumpProgress * Math.PI) * 1.8;
  const rogue1X = frame < 195 ? rogue1RunX : rogue1JumpX;
  const rogue1Y = frame < 195 ? 0 : rogue1JumpY;
  const rogue1Pose = frame < 195 ? "walk" : frame < 240 ? "jump" : "idle";
  const showRogue1 = frame >= 145 && frame < 330;

  // =========================================================================
  // BEAT 2 (330 - 750): GREED BAIT & FALSE FLOOR vs ROGUE 2
  // =========================================================================
  const rogue2RunX = interpolate(frame, [420, 480], [-7.0, -2.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rogue2JumpX = interpolate(frame, [480, 520], [-2.2, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rogue2JumpProgress = interpolate(frame, [480, 520], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rogue2JumpY = Math.sin(rogue2JumpProgress * Math.PI) * 1.5;
  const rogue2FallY = interpolate(frame, [522, 555], [0, -3.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  const rogue2X = frame < 480 ? rogue2RunX : rogue2JumpX;
  const rogue2Y = frame < 480 ? 0 : frame < 522 ? rogue2JumpY : rogue2FallY;
  const rogue2Pose = frame < 480 ? "walk" : frame < 522 ? "jump" : "fall";
  const showRogue2 = frame >= 415 && frame < 750;

  // =========================================================================
  // BEAT 3 (750 - 1230): MAGE BEATS THE PIT, THEN THE FLAMERS COUNTER IT
  // =========================================================================
  // Narration: the Mage freezes the trapdoor and crosses safely, so you
  // install the alchemical flamers as the next counter-measure.
  const mageWalkX = interpolate(frame, [770, 865], [-6.5, -2.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mageCrossX = interpolate(frame, [935, 1005], [-2.5, 2.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Second attempt: once the flamers are fitted he steps back onto his ice
  // bridge, the jets ignite and drop him through the trapdoor.
  const mageReturnX = interpolate(frame, [1075, 1145], [2.6, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mageBurnY = interpolate(frame, [1145, 1195], [0, -3.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  const mageX =
    frame < 865
      ? mageWalkX
      : frame < 935
        ? -2.5
        : frame < 1005
          ? mageCrossX
          : frame < 1075
            ? 2.6
            : mageReturnX;
  const mageY = frame < 1145 ? 0 : mageBurnY;
  const magePose: AdventurerPose =
    frame < 865
      ? "walk"
      : frame < 935
        ? "cast"
        : frame < 1005
          ? "walk"
          : frame < 1075
            ? "idle"
            : frame < 1150
              ? "walk"
              : "fall";
  const showMage = frame >= 755 && frame < 1240;

  // =========================================================================
  // BEAT 4 (1230 - 1710): PALADIN TOWER SHIELD vs PENDULUM BLADE
  // =========================================================================
  const paladinWalkX = interpolate(frame, [1240, 1400], [-6.5, -0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Holds the safe zone with the tower shield while the blade sweeps, then is
  // knocked through the trapdoor at the end of the line.
  const paladinKnockX = interpolate(frame, [1650, 1705], [-0.9, -1.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const paladinFallY = interpolate(frame, [1650, 1705], [0, -3.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  const paladinX = frame < 1650 ? paladinWalkX : paladinKnockX;
  const paladinY = frame < 1650 ? 0 : paladinFallY;
  const paladinPose: AdventurerPose =
    frame < 1400 ? "walk" : frame < 1650 ? "shield" : "fall";
  const showPaladin = frame >= 1235 && frame < 1712;

  // =========================================================================
  // BEAT 5 (1710 - 2250): FULL PARTY vs OVERKILL CATAPULT & MIMIC
  // =========================================================================
  // Catapult launch trajectory: staggered launches keep the three bodies
  // readable instead of stacking them into one clump mid-air.
  const launchT_R = interpolate(frame, [1856, 1910], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const launchX_R = interpolate(launchT_R, [0, 1], [-7.0, 7.0]);
  const launchY_R = Math.sin(launchT_R * Math.PI) * 6.0;

  const launchT_M = interpolate(frame, [1868, 1924], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const launchX_M = interpolate(launchT_M, [0, 1], [-6.0, 7.0]);
  const launchY_M = Math.sin(launchT_M * Math.PI) * 5.2;

  const launchT_P = interpolate(frame, [1880, 1938], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const launchX_P = interpolate(launchT_P, [0, 1], [-5.0, 7.0]);
  const launchY_P = Math.sin(launchT_P * Math.PI) * 4.4;

  const showParty5 = frame >= 1730 && frame < 1950;

  return (
    <>
      {/* 1. Core Cutaway Diorama Corridor & Underground */}
      <DungeonDiorama />

      {/* 2. Base Spike Pit (Floor of the pit) */}
      <SpikePit spawnFrame={15} />

      {/* 3. Stage 2: False Hinged Trapdoor */}
      <HingedTrapdoor
        spawnFrame={330}
        events={[
          { frame: 522, open: true },
          { frame: 700, open: false },
          { frame: 1145, open: true },
          { frame: 1240, open: false },
          { frame: 1650, open: true },
        ]}
      />

      {/* 4. Stage 2: Hanging Gold Bait Chest */}
      <BaitChest spawnFrame={350} />

      {/* 5. Stage 2: Floor Pressure Plate with Underground Rod Linkage */}
      <PressurePlate spawnFrame={360} triggerFrame={520} />

      {/* 6. Stage 3: Mage Ice Bridge Slab */}
      <IceBridge castFrame={890} meltFrame={1145} />

      {/* 7. Stage 3: Alchemical Flame Jets & Underground Fuel Tank */}
      <AlchemicalFlamers
        spawnFrame={1010}
        fireStartFrame={1125}
        fireEndFrame={1400}
      />

      {/* 8. Stage 4: Ceiling Mounted Pendulum Executioner Blade */}
      <PendulumBlade spawnFrame={1440} swingStartFrame={1500} />

      {/* 9. Stage 5: Catapult Launch Floor & Underground Spring Lever */}
      <TrebuchetFloor spawnFrame={1710} launchFrame={1860} />

      {/* 10. Stage 5: Massive Chomping Mimic Chest */}
      <MimicChest spawnFrame={1720} chompStartFrame={1860} />

      {/* =====================================================================
          CHARACTERS CHOREOGRAPHY
      ====================================================================== */}
      {/* Beat 1: Goblin */}
      {showGoblin && (
        <AdventurerUnit
          classType="goblin"
          pose={goblinPose}
          position={[goblinWalk, goblinDropY, -0.6]}
          rotation={[0, frame < 95 ? Math.PI / 2 : 0.3, 0]}
          animFrame={frame}
        />
      )}

      {/* Beat 1: Rogue 1 */}
      {showRogue1 && (
        <AdventurerUnit
          classType="rogue"
          pose={rogue1Pose}
          position={[rogue1X, rogue1Y, -0.6]}
          rotation={[0, frame < 195 ? Math.PI / 2 : 0.25, 0]}
          animFrame={frame}
        />
      )}

      {/* Beat 2: Rogue 2 */}
      {showRogue2 && (
        <AdventurerUnit
          classType="rogue"
          pose={rogue2Pose}
          position={[rogue2X, rogue2Y, -0.6]}
          rotation={[0, frame < 480 ? Math.PI / 2 : 0.25, 0]}
          animFrame={frame}
        />
      )}

      {/* Beat 3: Mage */}
      {showMage && (
        <AdventurerUnit
          classType="mage"
          pose={magePose}
          position={[mageX, mageY, -0.6]}
          rotation={[0, frame < 815 ? Math.PI / 2 : frame < 885 ? 0.35 : 0.15, 0]}
          animFrame={frame}
        />
      )}

      {/* Beat 4: Paladin */}
      {showPaladin && (
        <AdventurerUnit
          classType="paladin"
          pose={paladinPose}
          position={[paladinX, paladinY, -0.6]}
          rotation={[0, frame < 1335 ? 0.9 : 0.25, 0]}
          animFrame={frame}
        />
      )}

      {/* Beat 5: 3-Man Party Catapult Launch (staggered) */}
      {showParty5 && (
        <>
          {frame < 1911 ? (
            <AdventurerUnit
              classType="rogue"
              pose={frame < 1856 ? "idle" : "launch"}
              position={[launchX_R, launchY_R, -0.3]}
              rotation={[
                0,
                frame > 1856 ? 0.25 + (frame - 1856) * 0.03 : 0.25,
                frame > 1856 ? (frame - 1856) * 0.07 : 0,
              ]}
              animFrame={frame}
            />
          ) : null}
          {frame < 1925 ? (
            <AdventurerUnit
              classType="mage"
              pose={frame < 1868 ? "idle" : "launch"}
              position={[launchX_M, launchY_M, -0.6]}
              rotation={[
                0,
                frame > 1868 ? 0.25 + (frame - 1868) * 0.03 : 0.25,
                frame > 1868 ? (frame - 1868) * 0.07 : 0,
              ]}
              animFrame={frame}
            />
          ) : null}
          {frame < 1939 ? (
            <AdventurerUnit
              classType="paladin"
              pose={frame < 1880 ? "idle" : "launch"}
              position={[launchX_P, launchY_P, -0.9]}
              rotation={[
                0,
                frame > 1880 ? 0.25 + (frame - 1880) * 0.03 : 0.25,
                frame > 1880 ? (frame - 1880) * 0.07 : 0,
              ]}
              animFrame={frame}
            />
          ) : null}
        </>
      )}
    </>
  );
};
