import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { Burst, GlowSprite } from "../dungeon";
import { Block, type V3 } from "./common";

/**
 * What stands in the shelter (the room itself is carved by MineWorld): the emergency food
 * cabinet, benches, the ration crate, water drums, bulkhead lamps on the back wall, and the dust
 * and rubble of the two holes that come through its roof at the cut face.
 */

export interface ShelterLayout {
  back: number;
  front: number;
  ceil: number;
  left: number;
  right: number;
  cabinet: [number, number];
  bench: { x0: number; x1: number; z: number; seat: number };
  crate: [number, number];
  probeAt: V3;
  planB: [number, number];
}

export interface ShelterFitProps {
  L: ShelterLayout;
  /** Cans left in the cabinet (it empties as the days pass). */
  cans: number;
  /** Roof shudder 0..1 while the probe grinds toward the room, and the frame it bursts through. */
  grind: number;
  burstAt: number;
  /** The frame Plan B breaks through the roof. */
  planBAt: number;
  /** Lamp brightness 0..1. */
  lamps: number;
}

/** The handwritten note: "Estamos bien en el refugio los 33" in red marker. */
export const useNoteTexture = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 240;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    g.fillStyle = "#f4f1e6";
    g.fillRect(0, 0, 384, 240);
    g.strokeStyle = "rgba(80,110,170,0.35)";
    g.lineWidth = 2;
    for (let y = 46; y < 240; y += 36) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(384, y);
      g.stroke();
    }
    g.fillStyle = "#c81818";
    g.font = "bold 46px 'Comic Sans MS', 'Segoe Print', cursive";
    g.textAlign = "center";
    g.fillText("Estamos bien", 192, 72);
    g.fillText("en el refugio", 192, 136);
    g.fillText("los 33", 192, 200);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

const Lamp: React.FC<{ x: number; y: number; z: number; on: number }> = ({ x, y, z, on }) => (
  <group position={[x, y, z]}>
    <mesh castShadow>
      <boxGeometry args={[0.3, 0.17, 0.1]} />
      <meshStandardMaterial color="#2b2b2b" roughness={0.6} metalness={0.4} />
    </mesh>
    <mesh position={[0, 0, 0.055]}>
      <boxGeometry args={[0.24, 0.11, 0.02]} />
      <meshStandardMaterial color="#fff3d6" emissive="#ffd9a0" emissiveIntensity={2.0 * on} toneMapped={false} />
    </mesh>
    <GlowSprite position={[0, 0, 0.18]} color="#ffc277" size={1.3} opacity={0.4 * on} />
  </group>
);

const STEEL = { color: "#c9cdc8", roughness: 0.5, metalness: 0.3 };

export const ShelterFit: React.FC<ShelterFitProps> = ({ L, cans, grind, burstAt, planBAt, lamps }) => {
  const [px, py, pz] = L.probeAt;
  const lampXs = [-9.2, -5.6, -2.2, 1.0, 4.0];
  return (
    <group>
      {/* Food cabinet: a steel locker with its doors open and a few cans left. */}
      <group position={[L.cabinet[0], 0, L.cabinet[1]]}>
        <Block min={[-0.5, 0, -0.25]} max={[0.5, 1.8, -0.22]} {...STEEL} />
        <Block min={[-0.5, 0, -0.25]} max={[-0.47, 1.8, 0.25]} {...STEEL} />
        <Block min={[0.47, 0, -0.25]} max={[0.5, 1.8, 0.25]} {...STEEL} />
        <Block min={[-0.5, 1.77, -0.25]} max={[0.5, 1.8, 0.25]} {...STEEL} />
        {[0.05, 0.6, 1.15].map((y) => (
          <Block key={y} min={[-0.47, y, -0.22]} max={[0.47, y + 0.025, 0.24]} color="#b8bcb6" roughness={0.5} metalness={0.3} />
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.5 + s * 0.22 * Math.cos(1.1), 0.9, 0.25 + 0.22 * Math.sin(1.1)]} rotation={[0, -s * 1.1, 0]} castShadow>
            <boxGeometry args={[0.46, 1.76, 0.025]} />
            <meshStandardMaterial color="#bfc4be" roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
        {/* A red cross on the back panel. */}
        <Block min={[-0.06, 1.38, -0.218]} max={[0.06, 1.68, -0.214]} color="#c8281e" castShadow={false} />
        <Block min={[-0.15, 1.47, -0.218]} max={[0.15, 1.59, -0.214]} color="#c8281e" castShadow={false} />
        {Array.from({ length: Math.max(0, Math.round(cans)) }, (_, i) => (
          <mesh key={i} position={[-0.3 + (i % 5) * 0.14, 0.675 + Math.floor(i / 5) * 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.09, 14]} />
            <meshStandardMaterial color={i % 2 ? "#c8a13b" : "#b8bcc4"} roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>
      {/* Benches along the back wall, the ration crate, water drums. */}
      {[
        [L.bench.x0, L.bench.x1],
        [-0.4, 4.2],
      ].map(([x0, x1], k) => (
        <group key={k}>
          <Block min={[x0, L.bench.seat - 0.05, L.bench.z - 0.2]} max={[x1, L.bench.seat, L.bench.z + 0.2]} color="#8a6a48" />
          {[x0 + 0.15, (x0 + x1) / 2, x1 - 0.15].map((x) => (
            <Block key={x} min={[x - 0.03, 0, L.bench.z - 0.15]} max={[x + 0.03, L.bench.seat - 0.05, L.bench.z + 0.15]} color="#3c3c3c" metalness={0.5} roughness={0.5} />
          ))}
        </group>
      ))}
      <Block min={[L.crate[0] - 0.32, 0, L.crate[1] - 0.25]} max={[L.crate[0] + 0.32, 0.5, L.crate[1] + 0.25]} color="#9a7448" />
      {[
        [-5.6, -2.0],
        [-6.2, -1.85],
        [-5.9, -1.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.9, 20]} />
            <meshStandardMaterial color="#2c5ea8" roughness={0.5} />
          </mesh>
          {[0.2, 0.7].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.287, 0.287, 0.04, 20]} />
              <meshStandardMaterial color="#244d8a" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Lamps on the back wall. */}
      {lampXs.map((x) => (
        <Lamp key={x} x={x} y={2.45} z={L.back + 0.12} on={lamps} />
      ))}
      <pointLight position={[-6.5, 2.3, L.back + 1.2]} intensity={17 * lamps} distance={9} decay={1.6} color="#ffc98a" />
      <pointLight position={[-1.5, 2.3, L.back + 1.2]} intensity={17 * lamps} distance={9} decay={1.6} color="#ffc98a" />
      <pointLight position={[3.6, 2.3, L.back + 1.2]} intensity={17 * lamps} distance={9} decay={1.6} color="#ffc98a" />
      {/* The probe: dust trickles from the roof while it grinds closer, then it bursts through. */}
      {grind > 0.05 && (
        <Burst at={burstAt - 44} position={[px, py - 0.05, pz - 0.15]} count={40} size={0.13} duration={48} speed={0.008} direction={[0, -0.02, 0]} gravity={-0.004} spread={[0.5, 0.05, 0.4]} color="#b9a68e" seed="probe-trickle" />
      )}
      <Burst at={burstAt} position={[px, py - 0.25, pz]} count={54} size={0.34} duration={44} speed={0.06} direction={[0, -0.03, 0.02]} gravity={-0.004} spread={[0.5, 0.3, 0.5]} color="#b4a592" seed="probe-burst" />
      {/* Plan B: the roof gives way round the big bit. */}
      <Burst at={planBAt} position={[L.planB[0], L.ceil - 0.2, L.planB[1] - 0.1]} count={90} size={0.5} duration={56} speed={0.07} direction={[0, -0.03, 0.01]} gravity={-0.006} spread={[1.0, 0.3, 0.8]} color="#a99a88" seed="planb-rubble" />
    </group>
  );
};
