import React, { useMemo } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import * as THREE from "three";
import { FlyInPart } from "../../engine/primitives/FlyInPart";
import { SoldierUnit } from "../characters/SoldierUnit";
import { ArrowVolley } from "../characters/ArrowVolley";

export const ScalingLadder: React.FC = () => {
  const frame = useCurrentFrame();

  // Horizontal rungs
  const rungs = useMemo(() => {
    const list: number[] = [];
    for (let y = 1.0; y <= 11.5; y += 0.82) {
      list.push(y);
    }
    return list;
  }, []);

  // Continuous smooth curved steel swan-neck hook (orig_17_0s.png)
  const hookGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.48, 0), // Top of sleeve
      new THREE.Vector3(0, 0.96, 0), // Straight vertical rise
      new THREE.Vector3(0, 1.18, -0.1), // Gentle curve over parapet coping
      new THREE.Vector3(0, 1.25, -0.28), // Apex over crenel sill
      new THREE.Vector3(0, 1.08, -0.46), // Downward slope
      new THREE.Vector3(0, 0.82, -0.48), // Pointing down
    ]);
    return new THREE.TubeGeometry(curve, 32, 0.024, 12, false);
  }, []);

  // Act 1 Fall animation (190 -> 280)
  const act1FallProgress = interpolate(frame, [190, 280], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  // Act 2 Shake / Tug jitter (430 -> 490)
  const act2Shake =
    frame >= 430 && frame <= 490
      ? Math.sin((frame - 430) * 0.8) * 0.03 * Math.exp(-(frame - 430) / 30)
      : 0;

  // Ladder pitch angle:
  let ladderAngle = -0.26;
  if (frame >= 0 && frame < 300) {
    ladderAngle = -0.26 + act1FallProgress * 1.58;
  } else if (frame >= 300) {
    ladderAngle = -0.26 + act2Shake;
  }

  // Climbing soldier Y position
  let climberY = -10;
  const climberPose: "stand" | "climb" = "climb";
  let showClimber = false;

  if (frame >= 90 && frame < 190) {
    showClimber = true;
    climberY = interpolate(frame, [90, 190], [0.5, 9.0]);
  } else if (frame >= 190 && frame < 290) {
    // Falls with ladder
    showClimber = true;
    climberY = 9.0;
  } else if (frame >= 420 && frame < 620) {
    showClimber = true;
    climberY = interpolate(frame, [420, 560], [0.5, 6.5], {
      extrapolateRight: "clamp",
    });
  } else if (frame >= 630 && frame < 1000) {
    showClimber = true;
    climberY = interpolate(frame, [720, 980], [1.0, 7.5], {
      extrapolateRight: "clamp",
    });
  }

  // Position ladder against plain wall at X = -7.5
  const ladderX = -7.5;

  return (
    <group position={[ladderX, 0, 0]} visible={frame < 1440}>
      {/* ================= DEFENDERS ON BATTLEMENT (Act 1 pushing) ================= */}
      {frame >= 120 && frame < 270 && (
        <group position={[0, 11.5, -0.6]}>
          <SoldierUnit
            position={[-0.8, 0, 0]}
            rotation={[0, Math.PI, 0]}
            team="defender"
            pose="push"
            headgear="helmet"
            animFrame={frame}
          />
          <SoldierUnit
            position={[0.8, 0, 0]}
            rotation={[0, Math.PI, 0]}
            team="defender"
            pose="push"
            headgear="helmet"
            animFrame={frame}
          />
        </group>
      )}

      {/* ================= WAITING SOLDIERS BOTTLENECK (Act 3) ================= */}
      {frame >= 690 && frame < 960 && (
        <group position={[0, 0, 5.5]}>
          {[
            { x: -1.6, z: 0.5 },
            { x: -0.7, z: 1.2 },
            { x: 0.7, z: 1.1 },
            { x: 1.6, z: 0.6 },
            { x: -1.0, z: 2.2 },
            { x: 0, z: 2.0 },
            { x: 1.0, z: 2.3 },
            { x: -0.5, z: 3.3 },
            { x: 0.6, z: 3.4 },
            { x: 0, z: 4.2 },
          ].map((pos, idx) => (
            <SoldierUnit
              key={idx}
              position={[pos.x, 0, pos.z]}
              rotation={[0, 0.1 * ((idx % 3) - 1), 0]}
              team="attacker"
              pose="stand"
              headgear="helmet"
            />
          ))}
        </group>
      )}

      {/* ================= ARROW VOLLEYS ================= */}
      {/* Act 2 arrows hitting unprotected climber */}
      <ArrowVolley startFrame={420} endFrame={540} targetMode="soldier" />
      {/* Act 3 arrows hitting protective shields */}
      <ArrowVolley startFrame={580} endFrame={750} targetMode="shields" />

      {/* ================= SCALING LADDER ================= */}
      {/* Pivot at base: Z = 3.0 */}
      <group position={[0, 0, 3.0]}>
        <group rotation={[ladderAngle, 0, 0]}>
          {/* Main Rails & Rungs: Fly in at frame 0 */}
          <FlyInPart startFrame={0} durationFrames={45} fromOffset={[0, 8, 8]}>
            {/* Left Rail (Warm cedar orange wood) */}
            <mesh position={[-0.7, 5.9, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 12.2, 12]} />
              <meshStandardMaterial color="#ba5825" roughness={0.7} />
            </mesh>
            {/* Right Rail */}
            <mesh position={[0.7, 5.9, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 12.2, 12]} />
              <meshStandardMaterial color="#ba5825" roughness={0.7} />
            </mesh>

            {/* Horizontal Rungs */}
            {rungs.map((ry, i) => (
              <mesh
                key={i}
                position={[0, ry, 0]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.065, 0.065, 1.4, 8]} />
                <meshStandardMaterial color="#cb6c32" roughness={0.7} />
              </mesh>
            ))}
          </FlyInPart>

          {/* ================= CLIMBING SOLDIER (Ancient Chinese Warrior) ================= */}
          {showClimber && (
            <group position={[0, climberY, 0.28]}>
              <SoldierUnit
                team="attacker"
                pose={climberPose}
                headgear="topknot"
                animFrame={frame}
                scale={0.9}
              />
            </group>
          )}

          {/* ================= ACT 2: SILVER SLEEVES & CURVED STEEL HOOKS UPGRADE ================= */}
          {frame >= 270 && (
            <FlyInPart
              startFrame={270}
              durationFrames={35}
              fromOffset={[0, 3, 2]}
            >
              {/* Left Hook: Sleek brushed silver sleeve + continuous curved steel swan-neck rod */}
              <group position={[-0.7, 12.0, 0]}>
                {/* Brushed Silver Cylindrical Rail Sleeve */}
                <mesh position={[0, 0.22, 0]} castShadow>
                  <cylinderGeometry args={[0.105, 0.105, 0.55, 16]} />
                  <meshStandardMaterial color="#f0f3f8" metalness={0.65} roughness={0.25} />
                </mesh>
                {/* Flat Top Cap */}
                <mesh position={[0, 0.495, 0]} castShadow>
                  <cylinderGeometry args={[0.108, 0.108, 0.03, 16]} />
                  <meshStandardMaterial color="#f5f7fa" metalness={0.65} roughness={0.2} />
                </mesh>
                {/* Continuous Curved Steel Swan-Neck Hook */}
                <mesh geometry={hookGeometry} castShadow>
                  <meshStandardMaterial color="#eaedf2" metalness={0.68} roughness={0.2} />
                </mesh>
                {/* Sharp Pointed Downward Tip */}
                <mesh position={[0, 0.77, -0.48]} rotation={[Math.PI, 0, 0]} castShadow>
                  <coneGeometry args={[0.024, 0.1, 10]} />
                  <meshStandardMaterial color="#d4d7de" metalness={0.7} roughness={0.2} />
                </mesh>
              </group>

              {/* Right Hook */}
              <group position={[0.7, 12.0, 0]}>
                <mesh position={[0, 0.22, 0]} castShadow>
                  <cylinderGeometry args={[0.105, 0.105, 0.55, 16]} />
                  <meshStandardMaterial color="#f0f3f8" metalness={0.65} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.495, 0]} castShadow>
                  <cylinderGeometry args={[0.108, 0.108, 0.03, 16]} />
                  <meshStandardMaterial color="#f5f7fa" metalness={0.65} roughness={0.2} />
                </mesh>
                <mesh geometry={hookGeometry} castShadow>
                  <meshStandardMaterial color="#eaedf2" metalness={0.68} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.77, -0.48]} rotation={[Math.PI, 0, 0]} castShadow>
                  <coneGeometry args={[0.024, 0.1, 10]} />
                  <meshStandardMaterial color="#d4d7de" metalness={0.7} roughness={0.2} />
                </mesh>
              </group>
            </FlyInPart>
          )}

          {/* ================= ACT 3: WOODEN SIDE SHIELDS ================= */}
          {frame >= 540 && (
            <>
              {/* Left Side Shield: Flies in from X = -4 */}
              <FlyInPart
                startFrame={540}
                durationFrames={35}
                fromOffset={[-4, 0, 0]}
              >
                <group position={[-0.88, 5.9, 0.38]}>
                  {/* Thick Wooden Plank extending forward (+Z) */}
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.14, 11.4, 0.95]} />
                    <meshStandardMaterial color="#824925" roughness={0.8} />
                  </mesh>
                  {/* Iron Reinforcement Clamping Bands */}
                  {[-4.5, -2.2, 0, 2.2, 4.5].map((sy, i) => (
                    <mesh key={i} position={[0, sy, 0]}>
                      <boxGeometry args={[0.16, 0.18, 0.98]} />
                      <meshStandardMaterial color="#2c2e33" metalness={0.85} roughness={0.3} />
                    </mesh>
                  ))}
                  {/* Embedded Arrows peppered into shield */}
                  {frame >= 590 && (
                    <group position={[-0.08, 0, 0]}>
                      {[
                        { pos: [0, 2.8, 0.2] as [number, number, number], rot: [0.3, 0, 1.45] as [number, number, number] },
                        { pos: [0, 1.2, -0.15] as [number, number, number], rot: [-0.25, 0, 1.3] as [number, number, number] },
                        { pos: [0, -0.6, 0.25] as [number, number, number], rot: [0.1, 0, 1.5] as [number, number, number] },
                        { pos: [0, -2.2, -0.1] as [number, number, number], rot: [0.4, 0, 1.35] as [number, number, number] },
                        { pos: [0, -3.8, 0.2] as [number, number, number], rot: [-0.3, 0, 1.4] as [number, number, number] },
                      ].map((ar, idx) => (
                        <group key={`lar-${idx}`} position={ar.pos} rotation={ar.rot}>
                          <mesh position={[0, 0.45, 0]} castShadow>
                            <cylinderGeometry args={[0.016, 0.016, 0.95, 6]} />
                            <meshStandardMaterial color="#c49a68" roughness={0.75} />
                          </mesh>
                          <mesh position={[0, -0.04, 0]}>
                            <coneGeometry args={[0.038, 0.12, 4]} />
                            <meshStandardMaterial color="#2a2c30" metalness={0.88} />
                          </mesh>
                          <mesh position={[0, 0.82, 0]}>
                            <boxGeometry args={[0.11, 0.18, 0.014]} />
                            <meshStandardMaterial color="#f2f2f2" />
                          </mesh>
                          <mesh position={[0, 0.82, 0]}>
                            <boxGeometry args={[0.014, 0.18, 0.11]} />
                            <meshStandardMaterial color="#222" />
                          </mesh>
                        </group>
                      ))}
                    </group>
                  )}
                </group>
              </FlyInPart>

              {/* Right Side Shield: Flies in from X = +4 */}
              <FlyInPart
                startFrame={540}
                durationFrames={35}
                fromOffset={[4, 0, 0]}
              >
                <group position={[0.88, 5.9, 0.38]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.14, 11.4, 0.95]} />
                    <meshStandardMaterial color="#824925" roughness={0.8} />
                  </mesh>
                  {[-4.5, -2.2, 0, 2.2, 4.5].map((sy, i) => (
                    <mesh key={i} position={[0, sy, 0]}>
                      <boxGeometry args={[0.16, 0.18, 0.98]} />
                      <meshStandardMaterial color="#2c2e33" metalness={0.85} roughness={0.3} />
                    </mesh>
                  ))}
                  {frame >= 590 && (
                    <group position={[0.08, 0, 0]}>
                      {[
                        { pos: [0, 3.4, -0.1] as [number, number, number], rot: [-0.2, 0, -1.35] as [number, number, number] },
                        { pos: [0, 1.8, 0.2] as [number, number, number], rot: [0.35, 0, -1.45] as [number, number, number] },
                        { pos: [0, 0.1, -0.2] as [number, number, number], rot: [-0.15, 0, -1.5] as [number, number, number] },
                        { pos: [0, -1.5, 0.15] as [number, number, number], rot: [0.25, 0, -1.38] as [number, number, number] },
                        { pos: [0, -3.1, -0.15] as [number, number, number], rot: [-0.3, 0, -1.42] as [number, number, number] },
                      ].map((ar, idx) => (
                        <group key={`rar-${idx}`} position={ar.pos} rotation={ar.rot}>
                          <mesh position={[0, 0.45, 0]} castShadow>
                            <cylinderGeometry args={[0.016, 0.016, 0.95, 6]} />
                            <meshStandardMaterial color="#c49a68" roughness={0.75} />
                          </mesh>
                          <mesh position={[0, -0.04, 0]}>
                            <coneGeometry args={[0.038, 0.12, 4]} />
                            <meshStandardMaterial color="#2a2c30" metalness={0.88} />
                          </mesh>
                          <mesh position={[0, 0.82, 0]}>
                            <boxGeometry args={[0.11, 0.18, 0.014]} />
                            <meshStandardMaterial color="#f2f2f2" />
                          </mesh>
                          <mesh position={[0, 0.82, 0]}>
                            <boxGeometry args={[0.014, 0.18, 0.11]} />
                            <meshStandardMaterial color="#222" />
                          </mesh>
                        </group>
                      ))}
                    </group>
                  )}
                </group>
              </FlyInPart>
            </>
          )}
        </group>
      </group>
    </group>
  );
};
