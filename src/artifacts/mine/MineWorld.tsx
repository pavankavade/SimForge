import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Burst, GlowSprite } from "../dungeon";
import { Rod } from "./common";
import { carve, rockBox, useRockMaterials, worldUVs, type V2 } from "./rock";
import { ROCK_TILE } from "./textures";

/**
 * The mountain, cut open like an ant farm: its face stands at z = `face` and everything
 * underground is carved `depth` deep into it. The shelter at the bottom, the ventilation shaft
 * above it, the ramp zig-zagging down on the right with its road, lights and the fall that sealed
 * it, the boreholes drawn down the face as they are drilled, and the rescue shaft as a half pipe
 * the capsule rides. The desert, the hills and the sky sit on top. All in world space.
 */

export interface MineLayout {
  face: number;
  depth: number;
  top: number;
  bounds: { x0: number; x1: number; y0: number; y1: number };
  slope: number;
  rampH: number;
}

export interface MineWorldProps {
  frame: number;
  L: MineLayout;
  /** The ramp's floor line, top to bottom; the last point is the shelter's mouth. */
  ramp: V2[];
  shelter: { left: number; right: number; ceil: number };
  vent: { x: number; w: number; top: number };
  /** The stretch of the last ramp leg that falls in (x), and when. */
  fall: { x0: number; x1: number };
  fallAt: number;
  /** Thin probe holes: from the rig on top to the end point, drilled 0..1. */
  probes: Array<{ top: V2; end: V2; amount: number }>;
  /** Wide holes that are only drawn on the face (the drills that lost the race). */
  bores: Array<{ top: V2; end: V2; amount: number; r: number }>;
  /** The rescue shaft: centre x, radius, and the height it has been drilled down to. */
  shaft: { x: number; r: number; openTo: number };
  /** 1 = day, 0 = night. */
  daylight: number;
  /** The "700 m" measure beside the shelter, 0..1 drawn. */
  measure: number;
}

const SKY_DAY = new THREE.Color("#8cc3ea");
const SKY_NIGHT = new THREE.Color("#3b5a86");
const HILL_DAY = new THREE.Color("#c39a6c");
const HILL_NIGHT = new THREE.Color("#6f6660");

/** Holes drawn on the face: pulled toward the camera in depth, so they hold in the widest shots. */
const HOLE = new THREE.MeshBasicMaterial({ color: "#090604", polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -60 });

/** A hole drawn on the face from a to b (the first `amount` of it), `w` wide. */
const Strip: React.FC<{ a: V2; b: V2; amount: number; w: number; z: number }> = ({ a, b, amount, w, z }) => {
  if (amount <= 0.001) return null;
  const ex = (b[0] - a[0]) * amount;
  const ey = (b[1] - a[1]) * amount;
  const len = Math.hypot(ex, ey);
  return (
    <mesh position={[a[0] + ex / 2, a[1] + ey / 2, z]} rotation={[0, 0, Math.atan2(ey, ex) + Math.PI / 2]} material={HOLE}>
      <planeGeometry args={[w, len]} />
    </mesh>
  );
};

const useMeasureLabel = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 200;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    g.fillStyle = "rgba(16,22,40,0.9)";
    g.beginPath();
    g.roundRect(6, 6, 500, 188, 60);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = "900 124px 'Arial Black', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("700 m", 256, 108);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

export const MineWorld: React.FC<MineWorldProps> = ({ frame, L, ramp, shelter, vent, fall, fallAt, probes, bores, shaft, daylight, measure }) => {
  const m = useRockMaterials();
  const label = useMeasureLabel();
  const back = L.face - L.depth;
  const mouth = ramp[ramp.length - 1];
  const floorAt = (x: number) => Math.max(0, L.slope * (x - mouth[0]));

  // --- Openings: the shelter, the ventilation shaft, and one slanted room per ramp leg.
  const { carving, legs } = useMemo(() => {
    const openings: V2[][] = [];
    openings.push([
      [shelter.left, 0],
      [shelter.right, 0],
      [shelter.right, shelter.ceil],
      [shelter.left + 0.5, shelter.ceil],
      [shelter.left, shelter.ceil - 0.5],
    ]);
    openings.push([
      [vent.x - vent.w / 2, shelter.ceil - 0.2],
      [vent.x + vent.w / 2, shelter.ceil - 0.2],
      [vent.x + vent.w / 2, vent.top],
      [vent.x - vent.w / 2, vent.top],
    ]);
    const legList: Array<{ a: V2; b: V2; angle: number; len: number }> = [];
    for (let i = 0; i + 1 < ramp.length; i++) {
      const p = ramp[i];
      const q = ramp[i + 1];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const dx = (q[0] - p[0]) / len;
      const dy = (q[1] - p[1]) / len;
      // Up-facing normal of the floor line, and the clear height measured across the leg.
      const nx = dx > 0 ? -dy : dy;
      const ny = Math.abs(dx);
      const t = L.rampH * Math.abs(dx);
      const e0 = i === 0 ? 0.4 : 1.3;
      const a: V2 = [p[0] - dx * e0, p[1] - dy * e0];
      legList.push({ a: p, b: q, angle: Math.atan2(q[1] - p[1], q[0] - p[0]), len });
      if (i + 2 < ramp.length) {
        const b: V2 = [q[0] + dx * 1.3, q[1] + dy * 1.3];
        openings.push([a, b, [b[0] + nx * t, b[1] + ny * t], [a[0] + nx * t, a[1] + ny * t]]);
      } else {
        // The last leg runs out level into the shelter, a hair above its floor.
        const lip = 0.02;
        const xin = q[0] - 0.6;
        openings.push([a, [q[0] + lip / L.slope, lip], [xin, lip], [xin, L.slope * (xin - q[0]) + L.rampH], [a[0] + nx * t, a[1] + ny * t]]);
      }
    }
    const slot: V2[] = [
      [shaft.x - shaft.r, shelter.ceil - 0.1],
      [shaft.x + shaft.r, shelter.ceil - 0.1],
      [shaft.x + shaft.r, L.top + 2],
      [shaft.x - shaft.r, L.top + 2],
    ];
    return { carving: carve(openings, [slot], L.bounds, L.face, L.depth), legs: legList };
    // The layout is constant for an episode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statics = useMemo(() => {
    const { x0, x1, y0, y1 } = L.bounds;
    const backWall = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
    backWall.translate((x0 + x1) / 2, (y0 + y1) / 2, back);
    worldUVs(backWall);
    // The desert on top, from the cut back to the horizon.
    const ground = new THREE.PlaneGeometry(x1 - x0 + 300, 260);
    ground.rotateX(-Math.PI / 2);
    ground.translate((x0 + x1) / 2, L.top, L.face - 130);
    worldUVs(ground, 5);
    // The rescue shaft's lining: the back half of a pipe, with the rock laid round it.
    const h = L.top - shelter.ceil;
    const pipe = new THREE.CylinderGeometry(shaft.r, shaft.r, h, 24, 1, true, Math.PI / 2, Math.PI);
    pipe.translate(shaft.x, shelter.ceil + h / 2, L.face);
    const pos = pipe.getAttribute("position") as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (Math.atan2(pos.getX(i) - shaft.x, pos.getZ(i) - L.face) * shaft.r + shaft.x) / ROCK_TILE;
      uv[i * 2 + 1] = pos.getY(i) / ROCK_TILE;
    }
    pipe.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return { backWall, ground, pipe };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pipeMat = useMemo(() => {
    const mat = m.back.clone();
    mat.side = THREE.BackSide;
    mat.color.set("#d2c4b6");
    mat.onBeforeCompile = m.back.onBeforeCompile;
    mat.customProgramCacheKey = m.back.customProgramCacheKey;
    return mat;
  }, [m]);

  // The rock still in the rescue shaft: a slab of the face over the part not drilled yet.
  const plug = useMemo(() => {
    const y1 = Math.round(Math.min(L.top, shaft.openTo) * 20) / 20;
    if (y1 <= shelter.ceil + 0.01) return null;
    return rockBox([shaft.x - shaft.r - 0.01, shelter.ceil - 0.11, L.face - 0.02], [shaft.x + shaft.r + 0.01, y1, L.face + 0.003]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shaft.openTo]);

  // --- The fall: blocks that drop out of the roof of the last leg and stay there.
  const rubble = useMemo(
    () =>
      Array.from({ length: 58 }, (_, i) => {
        const r = (k: string) => random(`rub-${k}-${i}`);
        const x = fall.x0 + (fall.x1 - fall.x0) * r("x");
        // A pile: tall in the middle of the stretch, tapering at both ends.
        const mid = 1 - Math.abs((x - (fall.x0 + fall.x1) / 2) / ((fall.x1 - fall.x0) / 2));
        const top = (0.5 + 0.5 * Math.sqrt(Math.max(0, mid))) * (L.rampH - 0.15);
        const s = 0.32 + r("s") * 0.5;
        return {
          x,
          y: s * 0.45 + Math.pow(r("y"), 0.8) * Math.max(0.2, top - s),
          z: back + 0.45 + r("z") * (L.depth - 0.8),
          s,
          delay: r("d") * 9,
          rot: [r("a") * 6, r("b") * 6, r("c") * 6] as [number, number, number],
          sq: [0.8 + r("p") * 0.5, 0.65 + r("q") * 0.4, 0.8 + r("u") * 0.5] as [number, number, number],
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const lumpGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    // Knock the sphere about so the blocks are not round.
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const k = 0.78 + 0.4 * random(`lump-${Math.round(p.getX(i) * 50)}-${Math.round(p.getY(i) * 50)}-${Math.round(p.getZ(i) * 50)}`);
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const hills = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        x: -150 + i * 30 + (random(`h-x-${i}`) - 0.5) * 12,
        z: -110 - random(`h-z-${i}`) * 40,
        s: 22 + random(`h-s-${i}`) * 22,
      })),
    []
  );

  const sky = SKY_NIGHT.clone().lerp(SKY_DAY, daylight);
  const hill = HILL_NIGHT.clone().lerp(HILL_DAY, daylight);
  const fallen = frame >= fallAt;
  const zLine = L.face - L.depth * 0.5;

  return (
    <group>
      {/* Sky and far hills. */}
      <mesh position={[0, 30, 0]}>
        <sphereGeometry args={[430, 24, 12]} />
        <meshBasicMaterial color={sky} side={THREE.BackSide} />
      </mesh>
      {hills.map((h, i) => (
        <mesh key={i} position={[h.x, L.top - h.s * 0.12, h.z]} scale={[h.s * 1.7, h.s * 0.5, h.s]} geometry={lumpGeo}>
          <meshStandardMaterial color={hill} roughness={1} />
        </mesh>
      ))}
      <mesh position={[9, L.top - 3, -52]} scale={[34, 15, 20]} geometry={lumpGeo}>
        <meshStandardMaterial color={hill} roughness={1} />
      </mesh>

      {/* The mountain. */}
      <mesh geometry={carving.face} material={m.face} receiveShadow />
      <mesh geometry={carving.walls} material={m.wall} receiveShadow />
      <mesh geometry={carving.floors} material={m.floor} receiveShadow />
      <mesh geometry={statics.backWall} material={m.back} receiveShadow />
      <mesh geometry={statics.ground} material={m.desert} receiveShadow />
      <mesh geometry={statics.pipe} material={pipeMat} />
      {plug && <mesh geometry={plug} material={m.face} />}
      {/* The shaft's mouth in the shelter roof, once it is through. */}
      {shaft.openTo <= shelter.ceil + 0.01 && (
        <mesh position={[shaft.x, shelter.ceil - 0.004, L.face]} rotation={[Math.PI / 2, 0, 0]} material={HOLE}>
          <circleGeometry args={[shaft.r, 24, Math.PI, Math.PI]} />
        </mesh>
      )}

      {/* The ramp: a dashed centre line on the road, and lamps under the roof. */}
      {legs.map((leg, i) => {
        const n = Math.floor(leg.len / 2.2);
        const cos = Math.cos(leg.angle);
        const sin = Math.sin(leg.angle);
        return (
          <group key={i}>
            {Array.from({ length: n }, (_, k) => {
              const t = (k + 0.5) / n;
              const x = leg.a[0] + (leg.b[0] - leg.a[0]) * t;
              const y = leg.a[1] + (leg.b[1] - leg.a[1]) * t;
              const buried = i === legs.length - 1 && x > fall.x0 - 0.3 && x < fall.x1 + 0.3 && fallen;
              const lampOn = k % 2 === 0 && !buried;
              return (
                <group key={k}>
                  <mesh position={[x, y + 0.015, zLine]} rotation={[0, 0, leg.angle]}>
                    <boxGeometry args={[0.9, 0.012, 0.11]} />
                    <meshStandardMaterial color="#e8e2d2" roughness={0.9} />
                  </mesh>
                  {k % 2 === 0 && (
                    <group position={[x - sin * (L.rampH * Math.abs(cos) - 0.12) * Math.sign(cos), y + Math.abs(cos) * (L.rampH * Math.abs(cos) - 0.12), back + 0.5]}>
                      <mesh rotation={[0, 0, leg.angle]}>
                        <boxGeometry args={[0.5, 0.1, 0.16]} />
                        <meshStandardMaterial color="#2b2b2b" emissive="#ffd9a0" emissiveIntensity={lampOn ? 1.6 : 0} roughness={0.6} toneMapped={false} />
                      </mesh>
                      {lampOn && <GlowSprite position={[0, -0.1, 0.3]} color="#ffc277" size={2.6} opacity={0.34} />}
                    </group>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* The fall. */}
      {rubble.map((b, i) => {
        const t = Math.max(0, Math.min(1, (frame - (fallAt - 2 + b.delay)) / 7));
        if (t <= 0) return null;
        const drop = (1 - t * t) * (L.rampH + 0.6);
        return (
          <mesh
            key={i}
            position={[b.x, floorAt(b.x) + b.y + drop, b.z]}
            rotation={[b.rot[0] + drop, b.rot[1], b.rot[2] + drop * 0.7]}
            scale={[b.s * b.sq[0], b.s * b.sq[1], b.s * b.sq[2]]}
            geometry={lumpGeo}
            material={m.loose}
            castShadow
            receiveShadow
          />
        );
      })}
      <Burst
        at={fallAt - 46}
        position={[(fall.x0 + fall.x1) / 2, floorAt((fall.x0 + fall.x1) / 2) + L.rampH - 0.2, L.face - 1.6]}
        count={46}
        size={0.2}
        duration={52}
        speed={0.012}
        direction={[0, -0.03, 0]}
        gravity={-0.004}
        spread={[fall.x1 - fall.x0, 0.2, 2.6]}
        color="#bfae98"
        seed="fall-trickle"
      />
      {[0, 1, 2].map((k) => (
        <Burst
          key={k}
          at={fallAt + k * 3}
          position={[fall.x0 + ((fall.x1 - fall.x0) * (k + 0.5)) / 3, floorAt(fall.x0 + ((fall.x1 - fall.x0) * (k + 0.5)) / 3) + 1.4, L.face - 1.4]}
          count={70}
          size={1.5}
          duration={70}
          speed={0.11}
          direction={[k === 0 ? -0.05 : 0, 0.01, 0.03]}
          gravity={-0.0006}
          spread={[1.6, 2.2, 2.6]}
          color="#c2b29c"
          opacity={0.6}
          seed={`fall-${k}`}
        />
      ))}

      {/* The ventilation shaft: the brackets where the ladders should be, all the way up. */}
      {Array.from({ length: Math.floor((vent.top - shelter.ceil - 0.6) / 0.9) }, (_, k) => {
        const y = shelter.ceil + 0.5 + k * 0.9;
        return (
          <group key={k} position={[vent.x, y, back + 0.04]}>
            {[-0.24, 0.24].map((s) => (
              <group key={s} position={[s, 0, 0]}>
                <mesh>
                  <boxGeometry args={[0.05, 0.16, 0.03]} />
                  <meshStandardMaterial color="#8a4e28" roughness={0.6} metalness={0.5} />
                </mesh>
                <mesh position={[0, -0.06, 0.07]}>
                  <boxGeometry args={[0.05, 0.03, 0.14]} />
                  <meshStandardMaterial color="#8a4e28" roughness={0.6} metalness={0.5} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}

      {/* Boreholes drawn on the face. */}
      {probes.map((p, k) => (
        <Strip key={`p${k}`} a={p.top} b={p.end} amount={p.amount} w={0.17} z={L.face + 0.006} />
      ))}
      {bores.map((p, k) => (
        <Strip key={`b${k}`} a={p.top} b={p.end} amount={p.amount} w={p.r * 2} z={L.face + 0.005} />
      ))}

      {/* The measure: 700 m from the camp down to the shelter. */}
      {measure > 0.01 && (
        <group>
          <Rod a={[shelter.left - 2.2, L.top, L.face + 0.05]} b={[shelter.left - 2.2, L.top - (L.top - 0.1) * measure, L.face + 0.05]} r={0.09} color="#ffffff" metalness={0} roughness={0.6} emissive="#ffffff" emissiveIntensity={0.5} />
          {[L.top, L.top - (L.top - 0.1) * measure].map((y, i) => (
            <Rod key={i} a={[shelter.left - 3.2, y, L.face + 0.05]} b={[shelter.left - 1.2, y, L.face + 0.05]} r={0.09} color="#ffffff" metalness={0} roughness={0.6} emissive="#ffffff" emissiveIntensity={0.5} />
          ))}
          {measure > 0.6 && (
            <mesh position={[shelter.left + 2.6, L.top * 0.55, L.face + 0.3]} scale={Math.min(1, (measure - 0.6) * 4)}>
              <planeGeometry args={[7.2, 2.8]} />
              <meshBasicMaterial map={label} transparent toneMapped={false} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};
