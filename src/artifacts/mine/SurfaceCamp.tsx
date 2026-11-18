import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { GlowSprite } from "../dungeon";
import { Block, Rod, useChileFlag } from "./common";
import { DrillRig } from "./Drills";
import { People, campLook, type Person } from "./Figures";
import { Truck } from "./Truck";

/**
 * The camp on top of the mountain (the parent puts it at ground level on the cut face; local z = 0
 * is the cut). The drill rigs over their holes, the winch headframe over the rescue shaft with its
 * sheave and cable, floodlights for the night, a fence with the crowd behind it, a line of
 * Chilean flags, tents, containers and parked trucks.
 */

export interface CampRig {
  /** Collar x on the cut. */
  x: number;
  height: number;
  color: string;
  big?: boolean;
  /** 0..1 raised into place. */
  up: number;
  turning?: boolean;
}

export interface SurfaceCampProps {
  frame: number;
  daylight: number;
  rigs: CampRig[];
  /** The winch headframe over the rescue shaft: centre x, 0..1 standing, and the cable's lower end (y), or null. */
  winch: { x: number; up: number; cableTo: number | null };
  /** The crowd cheering 0..1. */
  cheer: number;
}

export const CAMP = { sheaveY: 6.6, fenceZ: -5.8 };

const Floodlight: React.FC<{ x: number; z: number; aim: [number, number, number]; on: number }> = ({ x, z, aim, on }) => {
  const light = useMemo(() => new THREE.SpotLight("#fff1d8", 0, 34, 0.62, 0.5, 1.2), []);
  light.intensity = 130 * on;
  light.position.set(x, 6.6, z);
  light.target.position.set(aim[0], aim[1], aim[2]);
  return (
    <group>
      <Rod a={[x, 0, z]} b={[x, 6.6, z]} r={0.06} color="#4a4d52" />
      <Rod a={[x - 0.5, 0, z - 0.3]} b={[x, 1.2, z]} r={0.03} color="#4a4d52" />
      <Rod a={[x + 0.5, 0, z - 0.3]} b={[x, 1.2, z]} r={0.03} color="#4a4d52" />
      {[-0.42, 0.42].map((dx) => (
        <group key={dx} position={[x + dx, 6.65, z + 0.1]} rotation={[0.6, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.42, 0.2]} />
            <meshStandardMaterial color="#2d2f33" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.105]}>
            <planeGeometry args={[0.6, 0.32]} />
            <meshStandardMaterial color="#fff6e6" emissive="#fff1d8" emissiveIntensity={0.25 + 3 * on} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {on > 0.05 && <GlowSprite position={[x, 6.6, z + 0.4]} color="#fff1d8" size={3.4} opacity={0.7 * on} />}
      <primitive object={light} />
      <primitive object={light.target} />
    </group>
  );
};

const Flag: React.FC<{ x: number; z: number; frame: number; h?: number }> = ({ x, z, frame, h = 4 }) => {
  const tex = useChileFlag();
  const wave = Math.sin(frame * 0.15 + x) * 0.18;
  return (
    <group position={[x, 0, z]}>
      <Rod a={[0, 0, 0]} b={[0, h, 0]} r={0.035} color="#dddddd" metalness={0.6} />
      <mesh position={[0.62, h - 0.44, 0]} rotation={[0, wave, 0]}>
        <planeGeometry args={[1.24, 0.82]} />
        <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
    </group>
  );
};

/** A ridge tent: canvas over a frame, door flaps at the front (+z). */
const Tent: React.FC<{ x: number; z: number; yaw?: number; color?: string; w?: number; len?: number }> = ({ x, z, yaw = 0, color = "#ece7da", w = 3.2, len = 4.2 }) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(-w / 2, 1.25);
    s.lineTo(0, 2.35);
    s.lineTo(w / 2, 1.25);
    s.lineTo(w / 2, 0);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    g.translate(0, 0, -len / 2);
    return g;
  }, [w, len]);
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* The doorway and a guy rope or two. */}
      <mesh position={[0, 0.85, len / 2 + 0.006]}>
        <planeGeometry args={[0.9, 1.7]} />
        <meshStandardMaterial color="#3b352d" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <Rod key={s} a={[(s * w) / 2, 1.25, len / 2]} b={[(s * w) / 2 + s * 0.9, 0, len / 2 + 0.5]} r={0.012} color="#c9c2b0" metalness={0} />
      ))}
    </group>
  );
};

/** A shipping container with ribbed sides. */
const Container: React.FC<{ x: number; z: number; yaw?: number; color: string }> = ({ x, z, yaw = 0, color }) => (
  <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
    <Block min={[-3, 0, -1.2]} max={[3, 2.5, 1.2]} color={color} roughness={0.6} metalness={0.2} />
    {Array.from({ length: 14 }, (_, k) => (
      <Block key={k} min={[-2.8 + k * 0.42, 0.12, 1.2]} max={[-2.66 + k * 0.42, 2.38, 1.23]} color={color} roughness={0.6} metalness={0.2} castShadow={false} />
    ))}
    <Block min={[-3.02, 0, -1.22]} max={[3.02, 0.12, 1.22]} color="#30343a" metalness={0.4} castShadow={false} />
    <Block min={[-3.02, 2.42, -1.22]} max={[3.02, 2.52, 1.22]} color="#30343a" metalness={0.4} castShadow={false} />
  </group>
);

export const SurfaceCamp: React.FC<SurfaceCampProps> = ({ frame, daylight, rigs, winch, cheer }) => {
  const night = 1 - daylight;
  const { sheaveY, fenceZ } = CAMP;

  const crowd = useMemo<Person[]>(() => {
    const list: Person[] = [];
    // Two rows behind the fence, facing the pithead.
    for (let i = 0; i < 26; i++) {
      const row = i % 2;
      const x = -15 + (i * 30) / 26 + Math.sin(i * 12.9) * 0.35;
      list.push({ x, z: fenceZ - 0.7 - row * 0.95 - Math.abs(Math.sin(i * 7.3)) * 0.3, yaw: Math.sin(i * 3.1) * 0.25, pose: "stand", look: campLook(i), size: 0.94 + Math.abs(Math.sin(i * 5.7)) * 0.12, phase: i * 2.3 });
    }
    // A few crew standing about on the pad, away from the holes.
    [
      [-11.5, -2.6, 0.8],
      [-10.6, -3.1, -0.2],
      [9.6, -2.4, -0.9],
      [10.5, -3.0, 0.3],
      [7.9, -4.2, -0.5],
    ].forEach(([x, z, yaw], i) => list.push({ x, z, yaw, pose: "stand", look: campLook(i * 3), phase: i * 1.3 }));
    return list;
  }, [fenceZ]);

  return (
    <group>
      {/* Rigs over their holes. */}
      {rigs.map((r, i) => (
        <group key={i} position={[r.x, 0, 0]}>
          <DrillRig height={r.height} color={r.color} big={r.big} up={r.up} frame={frame} turning={r.turning} />
        </group>
      ))}

      {/* Winch headframe over the rescue shaft: an A-frame, the sheave, the cable and the winch house. */}
      {winch.up > 0.001 && (
        <group position={[winch.x, (1 - winch.up) * -0.6, 0]} scale={[1, 0.25 + 0.75 * winch.up, 1]}>
          {[
            [-1.3, -0.6],
            [1.3, -0.6],
            [-1.3, 0.9],
            [1.3, 0.9],
          ].map(([dx, dz], i) => (
            <Rod key={i} a={[dx, 0, -1.2 + dz]} b={[dx * 0.25, sheaveY - 0.4, -0.25]} r={0.075} color="#d8a12a" metalness={0.4} />
          ))}
          {[1.6, 3.2, 4.8].map((y) => {
            const k = 1 - (y / (sheaveY - 0.4)) * 0.75;
            return <Rod key={y} a={[-1.3 * k, y, -0.3 * k - 0.25 * (1 - k) - 0.4]} b={[1.3 * k, y, -0.3 * k - 0.25 * (1 - k) - 0.4]} r={0.04} color="#d8a12a" metalness={0.4} />;
          })}
          <Block min={[-0.6, sheaveY - 0.5, -0.5]} max={[0.6, sheaveY - 0.35, -0.05]} color="#c08e22" metalness={0.4} />
          <group position={[0, sheaveY, -0.25]} rotation={[0, 0, winch.cableTo !== null ? frame * 0.05 : 0]}>
            <mesh>
              <torusGeometry args={[0.5, 0.055, 10, 32]} />
              <meshStandardMaterial color="#3e4247" roughness={0.4} metalness={0.8} />
            </mesh>
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} rotation={[0, 0, (k * Math.PI) / 4]}>
                <boxGeometry args={[1.0, 0.035, 0.035]} />
                <meshStandardMaterial color="#3e4247" roughness={0.4} metalness={0.8} />
              </mesh>
            ))}
          </group>
          <Rod a={[-0.45, sheaveY, -0.25]} b={[-9.4, 1.4, -1.9]} r={0.014} color="#2a2a2a" metalness={0.8} />
          {/* Collar round the shaft. */}
          <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.44, 0.06, 8, 32, Math.PI]} />
            <meshStandardMaterial color="#6e7378" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Winch house. */}
          <Block min={[-11.2, 0, -3.4]} max={[-8.4, 2.4, -1.0]} color="#e2e0d8" roughness={0.6} />
          <Block min={[-11.3, 2.4, -3.5]} max={[-8.3, 2.55, -0.9]} color="#555a60" metalness={0.4} />
          <Block min={[-10.5, 0.9, -1.0]} max={[-9.2, 1.9, -0.985]} color="#27303a" roughness={0.2} metalness={0.5} castShadow={false} />
        </group>
      )}
      {winch.up > 0.5 && winch.cableTo !== null && <Rod a={[winch.x, sheaveY - 0.5, 0]} b={[winch.x, winch.cableTo, 0]} r={0.014} color="#2a2a2a" metalness={0.8} />}

      {/* Fence, the crowd and flags. */}
      <Block min={[-17, 0.95, fenceZ - 0.04]} max={[17, 1.03, fenceZ + 0.04]} color="#e9e9e2" />
      <Block min={[-17, 0.5, fenceZ - 0.03]} max={[17, 0.56, fenceZ + 0.03]} color="#e9e9e2" />
      {Array.from({ length: 12 }, (_, k) => -16.5 + k * 3).map((x) => (
        <Block key={x} min={[x - 0.04, 0, fenceZ - 0.05]} max={[x + 0.04, 1.05, fenceZ + 0.05]} color="#9a9a94" />
      ))}
      <People people={crowd} frame={frame} cheer={cheer} />
      {[-15, -11, -7, -3, 1, 5, 9, 13].map((x, i) => (
        <Flag key={x} x={x} z={fenceZ - 2.6 - (i % 2) * 0.5} frame={frame} h={4.4 + (i % 3) * 0.3} />
      ))}

      {/* Floodlights for the night. */}
      <Floodlight x={winch.x - 4.2} z={-2.6} aim={[winch.x, 0.8, 0]} on={night} />
      <Floodlight x={winch.x + 6.4} z={-2.4} aim={[winch.x + 1, 0.8, 0]} on={night} />

      {/* Tents, containers and trucks behind the crowd. */}
      <Tent x={-13} z={-12.5} yaw={0.25} />
      <Tent x={-8.2} z={-13.5} yaw={-0.1} color="#e4dcc8" />
      <Tent x={-2.8} z={-12.8} yaw={0.12} />
      <Tent x={3.2} z={-13.6} yaw={-0.2} color="#dcd6c6" />
      <Tent x={12.4} z={-12.4} yaw={-0.3} />
      <Container x={-19} z={-9.5} yaw={0.5} color="#3f6fb0" />
      <Container x={18.5} z={-9.8} yaw={-0.4} color="#c84b31" />
      <Container x={8} z={-15.2} yaw={0.05} color="#d8a33c" />
      <group position={[14.2, 0, -3.4]} rotation={[0, 2.5, 0]}>
        <Truck color="#d9dcdd" lights={0.2 + 0.8 * night} />
      </group>
      <group position={[-15.6, 0, -3.2]} rotation={[0, 0.5, 0]}>
        <Truck color="#c8281e" lights={0.2 + 0.8 * night} />
      </group>
    </group>
  );
};
