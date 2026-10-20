import React, { useMemo } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import * as THREE from "three";

export const FortressWall: React.FC = () => {
  const frame = useCurrentFrame();

  const gateX = 3.5; // Gate center positioned so right side of tower connects to gate and battering ram strikes red door

  // Gate breach animation at Frame 2130 (Strike #3)
  const gateOpenProgress = interpolate(frame, [2130, 2165], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  const leftDoorAngle = gateOpenProgress * (Math.PI * 0.62);
  const rightDoorAngle = -gateOpenProgress * (Math.PI * 0.68);

  // Splinter debris animation after breach
  const debrisProgress = interpolate(frame, [2130, 2190], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showDebris = frame >= 2130 && frame < 2400;
  const dustProgress = interpolate(frame, [2130, 2330], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const showDust = frame >= 2130 && frame < 2380;

  // Generate procedural brick texture
  const wallTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#a8abb0";
    ctx.fillRect(0, 0, 1024, 1024);

    const rows = 32;
    const cols = 16;
    const rowH = 1024 / rows;
    const colW = 1024 / cols;
    ctx.strokeStyle = "#d8dadf";
    ctx.lineWidth = 3.5;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r % 2) * (colW / 2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();

      for (let c = -1; c <= cols + 1; c++) {
        const x = c * colW + offset;
        const hash = Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453);
        const shade = 165 + Math.floor((hash % 1) * 35);
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 1.8);
    return tex;
  }, []);

  // Crenellation blocks along X: -30 to +30, aligned so X = -7.5 is an open crenel gap (orig_17_0s.png)
  const crenellations = useMemo(() => {
    const blocks: number[] = [];
    for (let x = -30.0; x <= 30.0; x += 3.0) {
      if (x === 0 || x === 3) {
        continue;
      }
      blocks.push(x);
    }
    return blocks;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* ================= MAIN VERTICAL FORTRESS WALL ================= */}
      {/* Left Wall Segment (X < gateX - 2.4) */}
      <mesh position={[gateX - 16.2, 5.7, -2]} castShadow receiveShadow>
        <boxGeometry args={[27.6, 11.4, 4.2]} />
        <meshStandardMaterial
          map={wallTexture || undefined}
          color="#b0b3b8"
          roughness={0.88}
        />
      </mesh>

      {/* Right Wall Segment (X > gateX + 2.4) */}
      <mesh position={[gateX + 16.2, 5.7, -2]} castShadow receiveShadow>
        <boxGeometry args={[27.6, 11.4, 4.2]} />
        <meshStandardMaterial
          map={wallTexture || undefined}
          color="#b0b3b8"
          roughness={0.88}
        />
      </mesh>

      {/* Over-Gate Solid Spandrel & Lintel Beam */}
      <mesh position={[gateX, 8.85, -2]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 5.1, 4.2]} />
        <meshStandardMaterial
          map={wallTexture || undefined}
          color="#9da0a5"
          roughness={0.88}
        />
      </mesh>

      {/* Horizontal Stone Cornice / Coping Ledge beneath battlement at Y = 11.4 */}
      <mesh position={[0, 11.42, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[65, 0.28, 0.4]} />
        <meshStandardMaterial color="#94969a" roughness={0.8} />
      </mesh>

      {/* Battlement Walkway Top Floor: Y = 11.4, Z = -2 (Paved terracotta/sandstone flagstone floor) */}
      <mesh position={[0, 11.4, -2]} receiveShadow>
        <boxGeometry args={[65, 0.2, 4.4]} />
        <meshStandardMaterial color="#827663" roughness={0.88} />
      </mesh>

      {/* Parapet Crenellations (Merlons) with Bevelled Coping Slabs and Cross Arrow Slits */}
      {crenellations.map((x, i) => (
        <group key={i} position={[x, 12.35, 0.1]}>
          {/* Main Merlon stone block (width 1.2, gap 1.8 for ladder fit) */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.2, 1.6, 0.55]} />
            <meshStandardMaterial color="#55585d" roughness={0.85} />
          </mesh>
          {/* Bevelled Coping Top Slab (orig_17_0s.png) */}
          <mesh position={[0, 0.84, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.32, 0.12, 0.65]} />
            <meshStandardMaterial color="#6a6d72" roughness={0.8} />
          </mesh>
          {/* Cross Arrow Slit Vertical Cutout */}
          <mesh position={[0, 0, 0.29]}>
            <boxGeometry args={[0.13, 0.72, 0.04]} />
            <meshBasicMaterial color="#1a1b1d" />
          </mesh>
          {/* Cross Arrow Slit Horizontal Cutout */}
          <mesh position={[0, 0.08, 0.29]}>
            <boxGeometry args={[0.46, 0.13, 0.04]} />
            <meshBasicMaterial color="#1a1b1d" />
          </mesh>
        </group>
      ))}

      {/* Back safety parapet on walkway (Z = -4.1) */}
      <mesh position={[0, 12.2, -4.1]} castShadow>
        <boxGeometry args={[65, 1.4, 0.3]} />
        <meshStandardMaterial color="#55585d" roughness={0.85} />
      </mesh>

      {/* ================= ARCHED GATEWAY & STONE VOUSSOIRS ================= */}
      {/* Stone Arch surround piers */}
      <mesh position={[gateX - 2.2, 3.1, 0.12]} castShadow>
        <boxGeometry args={[0.6, 6.2, 0.35]} />
        <meshStandardMaterial color="#888b90" roughness={0.8} />
      </mesh>
      <mesh position={[gateX + 2.2, 3.1, 0.12]} castShadow>
        <boxGeometry args={[0.6, 6.2, 0.35]} />
        <meshStandardMaterial color="#888b90" roughness={0.8} />
      </mesh>

      {/* Arched Voussoir Segments over gate opening */}
      {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((vx, vi) => {
        const archY = 5.8 + Math.sqrt(Math.max(0, 4.0 - vx * vx)) * 0.45;
        return (
          <mesh
            key={vi}
            position={[gateX + vx, archY, 0.14]}
            rotation={[0, 0, -vx * 0.22]}
            castShadow
          >
            <boxGeometry args={[0.62, 0.55, 0.4]} />
            <meshStandardMaterial color={vi % 2 === 0 ? "#8c8f94" : "#7c7f84"} roughness={0.8} />
          </mesh>
        );
      })}

      {/* Arched Tunnel Vault Interior */}
      <mesh position={[gateX, 3.1, -1.8]}>
        <boxGeometry args={[3.8, 6.2, 3.6]} />
        <meshStandardMaterial color="#222326" roughness={0.9} side={THREE.BackSide} />
      </mesh>

      {/* ================= HINGED STUDDED DOUBLE RED DOORS ================= */}
      {/* Left Red Door */}
      <group position={[gateX - 1.85, 0, -0.6]}>
        <group rotation={[0, leftDoorAngle, 0]}>
          <mesh position={[0.92, 2.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.84, 5.8, 0.24]} />
            <meshStandardMaterial color="#a81a14" roughness={0.65} metalness={0.08} />
          </mesh>
          {/* Golden Studs / Bosses */}
          {[1.0, 2.0, 3.0, 4.0, 5.0].map((sy, row) =>
            [0.25, 0.65, 1.1, 1.55].map((sx, col) => (
              <mesh key={`ls-${row}-${col}`} position={[sx, sy, 0.13]}>
                <sphereGeometry args={[0.065, 8, 8]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
              </mesh>
            ))
          )}
          {/* Golden Lion Door Knocker Ring */}
          <group position={[1.4, 2.7, 0.14]}>
            <mesh rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.15, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.04, 8, 16]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Right Red Door */}
      <group position={[gateX + 1.85, 0, -0.6]}>
        <group rotation={[0, -rightDoorAngle, 0]}>
          <mesh position={[-0.92, 2.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.84, 5.8, 0.24]} />
            <meshStandardMaterial color="#a81a14" roughness={0.65} metalness={0.08} />
          </mesh>
          {/* Golden Studs / Bosses */}
          {[1.0, 2.0, 3.0, 4.0, 5.0].map((sy, row) =>
            [-0.25, -0.65, -1.1, -1.55].map((sx, col) => (
              <mesh key={`rs-${row}-${col}`} position={[sx, sy, 0.13]}>
                <sphereGeometry args={[0.065, 8, 8]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
              </mesh>
            ))
          )}
          {/* Golden Lion Door Knocker Ring */}
          <group position={[-1.4, 2.7, 0.14]}>
            <mesh rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.15, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.04, 8, 16]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Splinter Debris on Gate Breach */}
      {showDebris && (
        <group position={[gateX, 2.5, -1.2]}>
          {[
            { dir: [-1.4, 1.6, -2.2], rot: [2, 3, 1] },
            { dir: [1.5, 2.2, -2.8], rot: [-1, 2, 4] },
            { dir: [0.4, 1.0, -3.2], rot: [3, -1, 2] },
            { dir: [-0.9, 2.6, -1.9], rot: [1, 4, -2] },
            { dir: [1.1, 1.4, -2.4], rot: [-2, 1, 3] },
          ].map((d, i) => (
            <mesh
              key={i}
              position={[
                d.dir[0] * debrisProgress,
                d.dir[1] * debrisProgress - 4 * debrisProgress * debrisProgress,
                d.dir[2] * debrisProgress,
              ]}
              rotation={[
                d.rot[0] * debrisProgress * 8,
                d.rot[1] * debrisProgress * 8,
                d.rot[2] * debrisProgress * 8,
              ]}
            >
              <boxGeometry args={[0.38, 0.65, 0.16]} />
              <meshStandardMaterial color="#8a1f18" roughness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {showDust && (
        <group position={[gateX, 2.4, 0.4]}>
          {[
            { x: -1.5, y: 0.4, z: 0.5, size: 1.4 },
            { x: 0.1, y: 0.1, z: 0.9, size: 1.9 },
            { x: 1.4, y: 0.35, z: 0.55, size: 1.55 },
            { x: -0.6, y: 0.9, z: 0.3, size: 1.15 },
          ].map((d, i) => {
            const s = d.size * (0.4 + dustProgress * 1.7);
            return (
              <mesh
                key={`gate-dust-${i}`}
                position={[
                  d.x * dustProgress,
                  d.y + dustProgress * (1.1 + i * 0.18),
                  d.z * dustProgress,
                ]}
                scale={[s, s * 0.85, s]}
              >
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial
                  color="#d3c2a8"
                  transparent
                  opacity={(1 - dustProgress) * 0.42}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* ================= CHINESE GATEHOUSE PAVILION (城楼) ================= */}
      <group position={[gateX, 11.5, -5.0]} scale={[1, 1, 0.7]}>
        {/* Stone Terrace Plinth */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[14.5, 0.4, 6.2]} />
          <meshStandardMaterial color="#6a6c70" roughness={0.85} />
        </mesh>

        {/* Vermilion Balustrades & Railings */}
        <mesh position={[0, 0.8, 2.8]} castShadow>
          <boxGeometry args={[14.2, 0.7, 0.12]} />
          <meshStandardMaterial color="#b22218" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.8, -2.8]} castShadow>
          <boxGeometry args={[14.2, 0.7, 0.12]} />
          <meshStandardMaterial color="#b22218" roughness={0.7} />
        </mesh>

        {/* 10 Red Lacquered Round Columns */}
        {[-5.6, -2.8, 0, 2.8, 5.6].map((cx, ci) => (
          <group key={`col-${ci}`}>
            {/* Front column */}
            <mesh position={[cx, 1.8, 2.0]} castShadow>
              <cylinderGeometry args={[0.22, 0.24, 2.8, 12]} />
              <meshStandardMaterial color="#a3180f" roughness={0.5} />
            </mesh>
            {/* Back column */}
            <mesh position={[cx, 1.8, -2.0]} castShadow>
              <cylinderGeometry args={[0.22, 0.24, 2.8, 12]} />
              <meshStandardMaterial color="#a3180f" roughness={0.5} />
            </mesh>
          </group>
        ))}

        {/* Central Gatehouse Enclosed Room with Lattice Screen Windows */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <boxGeometry args={[10.5, 2.7, 3.6]} />
          <meshStandardMaterial color="#a3180f" roughness={0.7} />
        </mesh>
        {/* Lattice Screen Door & Windows */}
        <mesh position={[0, 1.8, 1.83]}>
          <boxGeometry args={[9.8, 2.4, 0.05]} />
          <meshStandardMaterial color="#e8d8c0" roughness={0.6} />
        </mesh>
        {/* Window Vermilion Mullions */}
        {[-4, -2, 0, 2, 4].map((mx, mi) => (
          <mesh key={`mul-${mi}`} position={[mx, 1.8, 1.85]}>
            <boxGeometry args={[0.12, 2.4, 0.04]} />
            <meshStandardMaterial color="#8a140d" />
          </mesh>
        ))}

        {/* Dougong Eaves Brackets (斗栱) Row */}
        {[-6.2, -4.6, -3.1, -1.5, 0, 1.5, 3.1, 4.6, 6.2].map((bx, bi) => (
          <group key={`dg-${bi}`} position={[bx, 3.25, 2.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.45, 0.22, 0.65]} />
              <meshStandardMaterial color="#c22b20" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.15, 0.1]}>
              <boxGeometry args={[0.65, 0.12, 0.35]} />
              <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        ))}

        {/* ================= LOWER EAVES TIER (飞檐) ================= */}
        {/* Main Lower Roof Slope */}
        <mesh position={[0, 3.7, 0]} castShadow>
          <boxGeometry args={[15.6, 0.45, 7.2]} />
          <meshStandardMaterial color="#2d3036" roughness={0.7} />
        </mesh>
        {/* Lower Eaves Trim with Upturned Eave Corners */}
        <mesh position={[0, 3.5, 3.6]} castShadow>
          <boxGeometry args={[16.2, 0.18, 0.3]} />
          <meshStandardMaterial color="#24262b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 3.5, -3.6]} castShadow>
          <boxGeometry args={[16.2, 0.18, 0.3]} />
          <meshStandardMaterial color="#24262b" roughness={0.8} />
        </mesh>
        {/* Upturned Eave Wings (飞檐翘角) */}
        {[-8.1, 8.1].map((ex, ei) => (
          <mesh
            key={`eave-${ei}`}
            position={[ex, 3.75, 3.6 * (ei === 0 ? 1 : -1)]}
            rotation={[0, 0, (ei === 0 ? -1 : 1) * 0.35]}
          >
            <boxGeometry args={[1.2, 0.2, 0.5]} />
            <meshStandardMaterial color="#1a1c20" />
          </mesh>
        ))}

        {/* ================= UPPER ROOF TIER (歇山顶 HIP-AND-GABLE) ================= */}
        <mesh position={[0, 4.4, 0]} castShadow>
          <boxGeometry args={[11.8, 0.9, 5.0]} />
          <meshStandardMaterial color="#26282e" roughness={0.7} />
        </mesh>
        {/* Main Upper Roof Ridge (正脊) */}
        <mesh position={[0, 5.05, 0]} castShadow>
          <boxGeometry args={[12.6, 0.38, 0.45]} />
          <meshStandardMaterial color="#1c1d22" roughness={0.75} />
        </mesh>
        {/* Ridge Beasts / Dragon Ornaments (吻兽) at ends of main ridge */}
        {[-6.3, 6.3].map((wx, wi) => (
          <mesh key={`ws-${wi}`} position={[wx, 5.35, 0]} castShadow>
            <boxGeometry args={[0.35, 0.65, 0.35]} />
            <meshStandardMaterial color="#d4af37" metalness={0.75} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
