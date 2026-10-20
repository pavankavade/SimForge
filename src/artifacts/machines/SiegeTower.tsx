import React, { useMemo } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { FlyInPart } from "../../engine/primitives/FlyInPart";
import { SoldierUnit } from "../characters/SoldierUnit";
import * as THREE from "three";

export const SiegeTower: React.FC = () => {
  const frame = useCurrentFrame();

  // ================= TOWER ROLLING POSITION =================
  // In Act 4 (1000-1440): X = 0, Z = 10
  // In Act 5 (1440-1560): Rolls forward smoothly from [0, 0, 10] to [0.2, 0, 3.6]
  // In Act 6 & 7: Stays at [0.2, 0, 3.6]
  const towerX = interpolate(frame, [1440, 1560], [0, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const towerZ = interpolate(frame, [1440, 1560], [10.0, 3.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const rollDistance = 10.0 - towerZ;
  const wheelRadius = 0.95;
  const wheelRotation = -rollDistance / wheelRadius;

  // ================= TOP DRAWBRIDGE ANIMATION =================
  // Upright (-Math.PI/2) until frame 1560, drops flat (0) onto wall walkway by frame 1630
  const bridgeAngle = interpolate(
    frame,
    [1560, 1630],
    [-Math.PI / 2, -0.42],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // Troops charging across drawbridge in Act 5 & Act 7
  const bridgeChargeProgress = interpolate(frame, [1630, 1770], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const act7FullAssault = interpolate(frame, [2220, 2550], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ================= BATTERING RAM SWING ANIMATION (Act 6 & 7) =================
  let ramOffsetZ = 0;
  let ramImpactShake = 0;

  if (frame >= 1880 && frame < 2220) {
    if (frame < 1960) {
      // Strike 1
      const p = (frame - 1880) / 80;
      ramOffsetZ = -Math.sin(p * Math.PI * 2) * 1.2;
    } else if (frame < 2050) {
      // Strike 2
      const p = (frame - 1960) / 90;
      ramOffsetZ = -Math.sin(p * Math.PI * 2) * 1.8;
    } else if (frame < 2150) {
      // Strike 3 - breaches gate at 2130
      const p = (frame - 2050) / 100;
      ramOffsetZ = -Math.sin(p * Math.PI * 2) * 2.5;
      if (frame >= 2130) {
        ramImpactShake =
          Math.sin((frame - 2130) * 1.4) * 0.18 * Math.exp(-(frame - 2130) / 25);
      }
    } else {
      ramOffsetZ = 0.3;
    }
  } else if (frame >= 2220) {
    // Ram cone head lodged against red gate door (orig_81_0s.png)
    ramOffsetZ = 0.3;
  }

  // Generate 8-spoke wheels
  const wheelSpokes = useMemo(
    () => [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4],
    []
  );

  // Balustrade vertical spindles
  const spindlesTier2Rear = useMemo(() => [-2.2, -1.8, -1.4, -1.0, -0.6, -0.2, 0.2, 0.6, 1.0, 1.4, 1.8, 2.2], []);
  const spindlesTier2Sides = useMemo(() => [0.4, 0.8, 1.2, 1.6, 2.0], []);
  const spindlesTier3 = useMemo(() => [-2.1, -1.7, -1.3, -0.9, -0.5, -0.1, 0.3, 0.7, 1.1, 1.5, 1.9], []);

  // Ladder rungs generator
  const rearLadderRungs = useMemo(() => [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2], []);
  const interiorLadderRungs = useMemo(() => [0.3, 0.7, 1.1, 1.5, 1.9, 2.3, 2.7], []);

  // Wood colors
  const woodMain = "#9c5825"; // Warm cedar amber
  const woodDark = "#693815"; // Dark chassis and posts
  const woodLight = "#d29053"; // Light X-brace straps
  const ironColor = "#26282b";

  // Procedural sharp silver wedge horns on chassis front corners (orig_81_0s.png)
  const wedgeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.16); // back bottom
    shape.lineTo(0, 0.16); // back top
    shape.lineTo(-1.35, 0.02); // front chisel tip top
    shape.lineTo(-1.35, -0.02); // front chisel tip bottom
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.44,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
    });
  }, []);

  return (
    <group position={[towerX, 0, towerZ]} visible={frame >= 1000}>
      {/* Interior Warm Illumination */}
      <pointLight position={[0, 5.0, 0]} intensity={3.0} distance={12} color="#ffa238" />
      <pointLight position={[0, 9.0, 0]} intensity={3.5} distance={12} color="#ffa238" />

      {/* ================= CHASSIS BASE & 6 WHEELS ================= */}
      {/* Left Longitudinal Heavy Chassis Beam */}
      <mesh position={[-2.4, 0.95, 0.5]} castShadow>
        <boxGeometry args={[0.55, 0.65, 8.2]} />
        <meshStandardMaterial color={woodDark} roughness={0.85} />
      </mesh>
      {/* Right Longitudinal Heavy Chassis Beam */}
      <mesh position={[2.4, 0.95, 0.5]} castShadow>
        <boxGeometry args={[0.55, 0.65, 8.2]} />
        <meshStandardMaterial color={woodDark} roughness={0.85} />
      </mesh>
      {/* Transverse Cross Beams */}
      {[-2.8, -0.9, 1.1, 3.1, 4.4].map((cz, ci) => (
        <mesh key={`cz-${ci}`} position={[0, 0.95, cz]} castShadow>
          <boxGeometry args={[5.35, 0.45, 0.45]} />
          <meshStandardMaterial color={woodDark} roughness={0.85} />
        </mesh>
      ))}

      {/* Front Polished Silver Wedge Ramming Horns / Spurs (orig_81_0s.png) */}
      <group position={[-2.4, 0.95, -3.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={wedgeGeometry} position={[0.22, 0, 0]} castShadow>
          <meshStandardMaterial color="#e4e8ee" metalness={0.96} roughness={0.15} />
        </mesh>
      </group>
      <group position={[2.4, 0.95, -3.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={wedgeGeometry} position={[0.22, 0, 0]} castShadow>
          <meshStandardMaterial color="#e4e8ee" metalness={0.96} roughness={0.15} />
        </mesh>
      </group>

      {/* 6 Large Solid Wooden Wheels (3 on Left, 3 on Right) */}
      {[
        { x: -2.85, z: -2.0 },
        { x: -2.85, z: 0.5 },
        { x: -2.85, z: 3.0 },
        { x: 2.85, z: -2.0 },
        { x: 2.85, z: 0.5 },
        { x: 2.85, z: 3.0 },
      ].map((w, idx) => (
        <group key={`wheel-${idx}`} position={[w.x, 0.95, w.z]}>
          <group rotation={[wheelRotation, 0, 0]}>
            {/* Wooden Rim */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.95, 0.95, 0.35, 18]} />
              <meshStandardMaterial color="#4a2e18" roughness={0.8} />
            </mesh>
            {/* Dark Iron Tire Band */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.97, 0.97, 0.18, 18]} />
              <meshStandardMaterial color={ironColor} metalness={0.88} roughness={0.25} />
            </mesh>
            {/* Center Heavy Bronze Hub */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.32, 0.32, 0.44, 12]} />
              <meshStandardMaterial color="#2d2218" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Cross Spokes */}
            {wheelSpokes.map((ang, si) => (
              <mesh key={si} rotation={[ang, 0, 0]}>
                <boxGeometry args={[0.22, 1.7, 0.12]} />
                <meshStandardMaterial color="#6a4425" roughness={0.85} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* Axle Beams */}
      {[-2.0, 0.5, 3.0].map((axZ, i) => (
        <mesh key={`axle-${i}`} position={[0, 0.95, axZ]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 5.8, 8]} />
          <meshStandardMaterial color="#3a2212" roughness={0.85} />
        </mesh>
      ))}

      {/* ================= 4 CORNER UPRIGHT POSTS ================= */}
      {[
        { x: -2.45, z: -2.45 },
        { x: 2.45, z: -2.45 },
        { x: -2.45, z: 2.45 },
        { x: 2.45, z: 2.45 },
      ].map((col, i) => (
        <FlyInPart
          key={`col-${i}`}
          startFrame={1005 + i * 12}
          durationFrames={25}
          fromOffset={[col.x * 2, 12, col.z * 2]}
        >
          <mesh position={[col.x, 7.2, col.z]} castShadow>
            <boxGeometry args={[0.42, 12.2, 0.42]} />
            <meshStandardMaterial color={woodDark} roughness={0.8} />
          </mesh>
        </FlyInPart>
      ))}

      {/* ================= TIER 1 FLOOR (Ground Bed) ================= */}
      <mesh position={[0, 1.25, -0.2]} receiveShadow>
        <boxGeometry args={[5.1, 0.2, 5.1]} />
        <meshStandardMaterial color={woodDark} roughness={0.85} />
      </mesh>

      {/* ================= TIER 2: EXTENDED PLATFORM DECK & BALUSTRADES ================= */}
      {/* Tier 2 Floor extends rearwards: Z from -2.45 to +5.2 */}
      <FlyInPart startFrame={1040} durationFrames={25} fromOffset={[0, 8, 0]}>
        <group position={[0, 3.4, 1.2]}>
          {/* Floor Planks */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.2, 0.24, 7.6]} />
            <meshStandardMaterial color={woodMain} roughness={0.75} />
          </mesh>
          {/* Supporting Rear Platform Cantilever Pillars */}
          <mesh position={[-2.45, -1.1, 3.6]} castShadow>
            <boxGeometry args={[0.38, 2.2, 0.38]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          <mesh position={[2.45, -1.1, 3.6]} castShadow>
            <boxGeometry args={[0.38, 2.2, 0.38]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>

          {/* Tier 2 Extended Platform Balustrades (Rear and Side Railings) */}
          {/* Rear Handrail */}
          <mesh position={[0, 0.82, 3.7]} castShadow>
            <boxGeometry args={[5.2, 0.16, 0.16]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          <mesh position={[0, 0.16, 3.7]}>
            <boxGeometry args={[5.2, 0.12, 0.14]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          {/* Spindles */}
          {spindlesTier2Rear.map((sx, si) => (
            <mesh key={`t2r-sp-${si}`} position={[sx, 0.48, 3.7]} castShadow>
              <boxGeometry args={[0.1, 0.58, 0.1]} />
              <meshStandardMaterial color={woodMain} />
            </mesh>
          ))}
          {/* Left Extended Handrail */}
          <mesh position={[-2.52, 0.82, 2.4]} castShadow>
            <boxGeometry args={[0.16, 0.16, 2.6]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          {spindlesTier2Sides.map((sz, si) => (
            <mesh key={`t2l-sp-${si}`} position={[-2.52, 0.48, 1.2 + sz]} castShadow>
              <boxGeometry args={[0.1, 0.58, 0.1]} />
              <meshStandardMaterial color={woodMain} />
            </mesh>
          ))}
          {/* Right Extended Handrail */}
          <mesh position={[2.52, 0.82, 2.4]} castShadow>
            <boxGeometry args={[0.16, 0.16, 2.6]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          {spindlesTier2Sides.map((sz, si) => (
            <mesh key={`t2r-sp-${si}`} position={[2.52, 0.48, 1.2 + sz]} castShadow>
              <boxGeometry args={[0.1, 0.58, 0.1]} />
              <meshStandardMaterial color={woodMain} />
            </mesh>
          ))}
        </group>
      </FlyInPart>

      {/* Two Inclined Rear Ladders from Ground Chassis up to Tier 2 Platform */}
      {[
        { x: -1.4, zBase: 4.8 },
        { x: 1.4, zBase: 4.8 },
      ].map((lad, li) => (
        <group key={`rear-lad-${li}`} position={[lad.x, 0.95, lad.zBase]}>
          <group rotation={[-0.48, 0, 0]}>
            {/* Left Rail */}
            <mesh position={[-0.45, 1.9, 0]} castShadow>
              <boxGeometry args={[0.1, 3.9, 0.14]} />
              <meshStandardMaterial color={woodMain} />
            </mesh>
            {/* Right Rail */}
            <mesh position={[0.45, 1.9, 0]} castShadow>
              <boxGeometry args={[0.1, 3.9, 0.14]} />
              <meshStandardMaterial color={woodMain} />
            </mesh>
            {/* Rungs */}
            {rearLadderRungs.map((ry, ri) => (
              <mesh key={`rl-r-${ri}`} position={[0, ry, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 0.88, 6]} />
                <meshStandardMaterial color={woodLight} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* Interior Ladder: Tier 2 to Tier 3 */}
      <group position={[0.8, 3.5, 0.6]}>
        <group rotation={[0.46, 0, 0]}>
          <mesh position={[-0.38, 1.6, 0]} castShadow>
            <boxGeometry args={[0.08, 3.4, 0.12]} />
            <meshStandardMaterial color={woodMain} />
          </mesh>
          <mesh position={[0.38, 1.6, 0]} castShadow>
            <boxGeometry args={[0.08, 3.4, 0.12]} />
            <meshStandardMaterial color={woodMain} />
          </mesh>
          {interiorLadderRungs.map((ry, ri) => (
            <mesh key={`il-r-${ri}`} position={[0, ry, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.74, 6]} />
              <meshStandardMaterial color={woodLight} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================= TIER 3: MIDDLE FLOOR & REAR BALUSTRADE ================= */}
      <FlyInPart startFrame={1070} durationFrames={25} fromOffset={[0, 8, 0]}>
        <group position={[0, 6.7, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.2, 0.24, 5.2]} />
            <meshStandardMaterial color={woodMain} roughness={0.75} />
          </mesh>
          {/* Rear Balustrade */}
          <mesh position={[0, 0.82, 2.52]} castShadow>
            <boxGeometry args={[5.2, 0.16, 0.16]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          <mesh position={[0, 0.16, 2.52]}>
            <boxGeometry args={[5.2, 0.12, 0.14]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          {spindlesTier3.map((sx, si) => (
            <mesh key={`t3-sp-${si}`} position={[sx, 0.48, 2.52]} castShadow>
              <boxGeometry args={[0.1, 0.58, 0.1]} />
              <meshStandardMaterial color={woodMain} />
            </mesh>
          ))}
        </group>
      </FlyInPart>

      {/* Interior Ladder: Tier 3 to Tier 4 */}
      <group position={[-0.8, 6.8, 0.6]}>
        <group rotation={[0.46, 0, 0]}>
          <mesh position={[-0.38, 1.6, 0]} castShadow>
            <boxGeometry args={[0.08, 3.4, 0.12]} />
            <meshStandardMaterial color={woodMain} />
          </mesh>
          <mesh position={[0.38, 1.6, 0]} castShadow>
            <boxGeometry args={[0.08, 3.4, 0.12]} />
            <meshStandardMaterial color={woodMain} />
          </mesh>
          {interiorLadderRungs.map((ry, ri) => (
            <mesh key={`il2-r-${ri}`} position={[0, ry, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.74, 6]} />
              <meshStandardMaterial color={woodLight} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================= TIER 4: UPPER ASSAULT FLOOR & BALUSTRADE ================= */}
      <FlyInPart startFrame={1095} durationFrames={25} fromOffset={[0, 8, 0]}>
        <group position={[0, 9.9, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.2, 0.24, 5.2]} />
            <meshStandardMaterial color={woodMain} roughness={0.75} />
          </mesh>
          {/* Rear Balustrade */}
          <mesh position={[0, 0.82, 2.52]} castShadow>
            <boxGeometry args={[5.2, 0.16, 0.16]} />
            <meshStandardMaterial color={woodDark} />
          </mesh>
          {spindlesTier3.map((sx, si) => (
            <mesh key={`t4-sp-${si}`} position={[sx, 0.48, 2.52]} castShadow>
              <boxGeometry args={[0.1, 0.58, 0.1]} />
              <meshStandardMaterial color={woodMain} />
            </mesh>
          ))}
        </group>
      </FlyInPart>

      {/* ================= TOP ROOF DECK WITH CRENELLATED BATTLEMENTS ================= */}
      <FlyInPart startFrame={1120} durationFrames={25} fromOffset={[0, 8, 0]}>
        <group position={[0, 13.0, 0]}>
          {/* Roof Deck Floor */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.3, 0.25, 5.3]} />
            <meshStandardMaterial color={woodMain} roughness={0.75} />
          </mesh>
          {/* Left Crenellations (Merlons) */}
          {[-2.2, -1.4, -0.6, 0.2, 1.0, 1.8, 2.4].map((mz, mi) => (
            <mesh key={`tc-l-${mi}`} position={[-2.55, 0.65, mz]} castShadow>
              <boxGeometry args={[0.22, 1.1, 0.52]} />
              <meshStandardMaterial color={woodDark} roughness={0.8} />
            </mesh>
          ))}
          {/* Right Crenellations */}
          {[-2.2, -1.4, -0.6, 0.2, 1.0, 1.8, 2.4].map((mz, mi) => (
            <mesh key={`tc-r-${mi}`} position={[2.55, 0.65, mz]} castShadow>
              <boxGeometry args={[0.22, 1.1, 0.52]} />
              <meshStandardMaterial color={woodDark} roughness={0.8} />
            </mesh>
          ))}
          {/* Rear Crenellations */}
          {[-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1].map((mx, mi) => (
            <mesh key={`tc-rear-${mi}`} position={[mx, 0.65, 2.55]} castShadow>
              <boxGeometry args={[0.52, 1.1, 0.22]} />
              <meshStandardMaterial color={woodDark} roughness={0.8} />
            </mesh>
          ))}

          {/* Top Front Winch Log & Gantry Frame for Drawbridge Ropes */}
          <group position={[0, 1.25, -2.55]}>
            <mesh position={[-2.45, -0.4, 0]} castShadow>
              <boxGeometry args={[0.22, 0.9, 0.22]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
            <mesh position={[2.45, -0.4, 0]} castShadow>
              <boxGeometry args={[0.22, 0.9, 0.22]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
            {/* Round Winch Log */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 5.1, 12]} />
              <meshStandardMaterial color={woodLight} roughness={0.7} />
            </mesh>
          </group>
        </group>
      </FlyInPart>

      {/* ================= SIDE TIMBER WALL PANELS WITH "X" BRACING ================= */}
      {/* Left Wall Panels (3 Tiers: Tier 2, Tier 3, Tier 4) */}
      {[
        { y: 5.0, h: 3.2 },
        { y: 8.3, h: 3.1 },
        { y: 11.45, h: 3.0 },
      ].map((panel, pi) => (
        <FlyInPart
          key={`l-panel-${pi}`}
          startFrame={1140 + pi * 15}
          durationFrames={25}
          fromOffset={[-6, 0, 0]}
        >
          <group position={[-2.55, panel.y, 0]}>
            {/* Wooden Planks Wall */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.15, panel.h - 0.2, 5.1]} />
              <meshStandardMaterial color={woodMain} roughness={0.8} />
            </mesh>
            {/* Diagonal Cream/Light X-Brace Bars */}
            <mesh rotation={[0.55, 0, 0]}>
              <boxGeometry args={[0.22, panel.h * 1.35, 0.14]} />
              <meshStandardMaterial color={woodLight} roughness={0.7} />
            </mesh>
            <mesh rotation={[-0.55, 0, 0]}>
              <boxGeometry args={[0.22, panel.h * 1.35, 0.14]} />
              <meshStandardMaterial color={woodLight} roughness={0.7} />
            </mesh>
            {/* Horizontal Framing Beams */}
            <mesh position={[0, panel.h / 2 - 0.1, 0]}>
              <boxGeometry args={[0.24, 0.22, 5.2]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
            <mesh position={[0, -panel.h / 2 + 0.1, 0]}>
              <boxGeometry args={[0.24, 0.22, 5.2]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
          </group>
        </FlyInPart>
      ))}

      {/* Right Wall Panels (3 Tiers) */}
      {[
        { y: 5.0, h: 3.2 },
        { y: 8.3, h: 3.1 },
        { y: 11.45, h: 3.0 },
      ].map((panel, pi) => (
        <FlyInPart
          key={`r-panel-${pi}`}
          startFrame={1140 + pi * 15}
          durationFrames={25}
          fromOffset={[6, 0, 0]}
        >
          <group position={[2.55, panel.y, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.15, panel.h - 0.2, 5.1]} />
              <meshStandardMaterial color={woodMain} roughness={0.8} />
            </mesh>
            {/* Diagonal Cream/Light X-Brace Bars */}
            <mesh rotation={[0.55, 0, 0]}>
              <boxGeometry args={[0.22, panel.h * 1.35, 0.14]} />
              <meshStandardMaterial color={woodLight} roughness={0.7} />
            </mesh>
            <mesh rotation={[-0.55, 0, 0]}>
              <boxGeometry args={[0.22, panel.h * 1.35, 0.14]} />
              <meshStandardMaterial color={woodLight} roughness={0.7} />
            </mesh>
            {/* Horizontal Framing Beams */}
            <mesh position={[0, panel.h / 2 - 0.1, 0]}>
              <boxGeometry args={[0.24, 0.22, 5.2]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
            <mesh position={[0, -panel.h / 2 + 0.1, 0]}>
              <boxGeometry args={[0.24, 0.22, 5.2]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
          </group>
        </FlyInPart>
      ))}

      {/* ================= ACT 5: UPPER ASSAULT DRAWBRIDGE ================= */}
      <FlyInPart startFrame={1120} durationFrames={24} fromOffset={[0, 6, 0]}>
        <group position={[0, 13.0, -2.55]}>
          <group rotation={[bridgeAngle, 0, 0]}>
            {/* Main Bridge Plank Surface */}
            <mesh position={[0, 0, -1.8]} castShadow receiveShadow>
              <boxGeometry args={[4.6, 0.18, 3.6]} />
              <meshStandardMaterial color={woodMain} roughness={0.75} />
            </mesh>
            {/* Side Safety Curbs */}
            <mesh position={[-2.2, 0.35, -1.8]} castShadow>
              <boxGeometry args={[0.16, 0.55, 3.6]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
            <mesh position={[2.2, 0.35, -1.8]} castShadow>
              <boxGeometry args={[0.16, 0.55, 3.6]} />
              <meshStandardMaterial color={woodDark} />
            </mesh>
            {/* Iron Reinforcement Ribs */}
            {[-0.9, -1.8, -2.7, -3.35].map((rz, i) => (
              <mesh key={`br-rib-${i}`} position={[0, 0.1, rz]}>
                <boxGeometry args={[4.65, 0.06, 0.14]} />
                <meshStandardMaterial color={ironColor} metalness={0.8} />
              </mesh>
            ))}
          </group>
        </group>
      </FlyInPart>

      {/* ================= SOLDIERS EMBARKED IN SIEGE TOWER ================= */}
      {/* Tier 2 Extended Deck Soldiers (Standing in ranks holding spears) */}
      <FlyInPart startFrame={1296} durationFrames={26} fromOffset={[0, 0, -5]}>
        <group position={[0, 3.55, 0]}>
          {/* Platform extension ranks */}
          {[-1.8, -0.6, 0.6, 1.8].map((sx, xi) => (
            <React.Fragment key={`t2-row1-${xi}`}>
              <SoldierUnit
                position={[sx, 0, 1.8]}
                team="attacker"
                pose="stand"
                headgear="helmet"
                scale={0.88}
              />
              <SoldierUnit
                position={[sx, 0, 3.2]}
                team="attacker"
                pose="stand"
                headgear="helmet"
                scale={0.88}
              />
            </React.Fragment>
          ))}
        </group>
      </FlyInPart>

      {/* Tier 3 Deck Soldiers */}
      <FlyInPart startFrame={1310} durationFrames={26} fromOffset={[0, 0, -5]}>
        <group position={[0, 6.85, 0]}>
          {[-1.8, -0.6, 0.6, 1.8].map((sx, xi) => (
            <React.Fragment key={`t3-sol-${xi}`}>
              <SoldierUnit
                position={[sx, 0, 0.4]}
                team="attacker"
                pose="stand"
                headgear="helmet"
                scale={0.88}
              />
              <SoldierUnit
                position={[sx, 0, 1.8]}
                team="attacker"
                pose="stand"
                headgear="helmet"
                scale={0.88}
              />
            </React.Fragment>
          ))}
        </group>
      </FlyInPart>

      {/* Tier 4 Assault Troops (charging across drawbridge in Act 5 & 7) */}
      <FlyInPart startFrame={1324} durationFrames={26} fromOffset={[0, 0, -6]}>
        <group position={[0, 13.15, 0]}>
          {[-1.5, -0.5, 0.5, 1.5].map((sx, xi) => {
            const startZ = -0.15;
            let zPos = startZ;
            let pose: "stand" | "run" = "stand";

            if (frame >= 1630 && frame < 1770) {
              zPos = startZ - bridgeChargeProgress * 6.1;
              pose = "run";
            } else if (frame >= 1770 && frame < 2220) {
              zPos = -6.25;
              pose = "stand";
            } else if (frame >= 2220) {
              zPos = -6.25 - act7FullAssault * 0.9;
              pose = "run";
            }

            let yPos = 0;
            if (zPos < -2.55) {
              yPos = Math.max(-1.6, (zPos + 2.55) * Math.tan(0.42));
            }

            return (
              <SoldierUnit
                key={`t4-sol-${xi}`}
                position={[sx, yPos, zPos + (xi % 2) * 0.28]}
                team="attacker"
                pose={pose}
                headgear="helmet"
                animFrame={frame}
                scale={0.88}
              />
            );
          })}
        </group>
      </FlyInPart>

      {/* Ground Pushing & Guard Troops beside wheels */}
      {frame >= 1440 && (
        <group position={[0, 0, 0]}>
          {frame < 2200 &&
            [-3.3, 3.3].map((gx, gi) =>
              [-1.5, 1.5].map((gz, gzi) => (
                <SoldierUnit
                  key={`push-${gi}-${gzi}`}
                  position={[gx, 0, gz]}
                  rotation={[0, gi === 0 ? 0.35 : -0.35, 0]}
                  team="attacker"
                  pose="push"
                  headgear="helmet"
                  animFrame={frame}
                  scale={0.92}
                />
              ))
            )}
          {/* Guard soldier near front right wheel (orig_81_0s.png) */}
          <group position={[3.3, 0, -2.4]} rotation={[0, 0.4, 0]}>
            <SoldierUnit
              team="attacker"
              pose="stand"
              headgear="helmet"
              scale={0.92}
            />
          </group>
        </group>
      )}

      {/* ================= ACT 6 & 7: SUSPENDED LOG BATTERING RAM ================= */}
      {frame >= 1800 && (
        <group position={[3.3, 2.2 + ramImpactShake, ramOffsetZ]}>
          {/* Suspension Chains hanging from Tier 2 floor */}
          {[
            { x: -0.9, z: -1.6 },
            { x: 0.9, z: -1.6 },
            { x: -0.9, z: 1.6 },
            { x: 0.9, z: 1.6 },
          ].map((ch, i) => (
            <mesh key={`chain-${i}`} position={[ch.x, 0.7, ch.z]}>
              <cylinderGeometry args={[0.025, 0.025, 1.6, 6]} />
              <meshStandardMaterial color={ironColor} metalness={0.9} roughness={0.2} />
            </mesh>
          ))}

          {/* Heavy Tree Trunk Log */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.46, 0.52, 7.4, 16]} />
            <meshStandardMaterial color="#c66220" roughness={0.8} />
          </mesh>

          {/* Heavy Iron Hoops / Bands around log */}
          {[-2.4, -0.9, 0.9, 2.4].map((hz, hi) => (
            <mesh key={`hoop-${hi}`} position={[0, 0, hz]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.54, 0.54, 0.22, 16]} />
              <meshStandardMaterial color={ironColor} metalness={0.88} roughness={0.25} />
            </mesh>
          ))}

          {/* Pointed Bronze / Iron Conical Head with 4 Sharp Facets (orig_81_0s.png) */}
          <group position={[0, 0, -4.1]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <mesh castShadow>
              <coneGeometry args={[0.62, 1.48, 4]} />
              <meshStandardMaterial color="#46382a" metalness={0.88} roughness={0.25} />
            </mesh>
          </group>

          {/* Ram Pushing Soldiers (Act 6 only; in Act 7 ram is lodged and soldiers charge drawbridge) */}
          {frame < 2200 &&
            [-1.2, 1.2].map((rx, ri) => (
              <group key={`ram-sol-${ri}`} position={[rx, -0.9, 0]}>
                <SoldierUnit
                  team="attacker"
                  pose="push"
                  headgear="helmet"
                  animFrame={frame}
                  rotation={[0, ri === 0 ? 0.35 : -0.35, 0]}
                  scale={0.9}
                />
              </group>
            ))}
        </group>
      )}
    </group>
  );
};
