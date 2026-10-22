import type React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useSurface } from "../../engine/materials";
import { makeWood } from "../../engine/textures";
import type { Vec3 } from "../../engine/types";

const WOOD = () => makeWood({ planks: 3, base: "#6a4a2c", baseAlt: "#7a5634", seam: "#24170c", seed: 71 });

interface ReleaseGateProps {
  edgeX: number;
  ledgeY: number;
  /** 0 = up and holding the boulder, 1 = flat on the ramp. */
  open: number;
  z?: number;
  depth?: number;
}

/** Wooden stop-gate hinged on the ledge lip; swings down onto the ramp. */
export const ReleaseGate: React.FC<ReleaseGateProps> = ({ edgeX, ledgeY, open, z = -0.6, depth = 3.3 }) => {
  const wood = useSurface("gate-wood", WOOD, [1, 1]);
  const angle = open * Math.PI * 0.75;
  const front = z + depth / 2;
  return (
    <group position={[edgeX + 0.02, ledgeY + 0.02, z]}>
      <group rotation={[0, 0, angle]}>
        <mesh position={[0.11, 0.5, 0]} castShadow>
          <boxGeometry args={[0.22, 1.0, depth]} />
          <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} color="#d8c0a0" roughness={0.85} />
        </mesh>
        {[0.2, 0.8].map((y) => (
          <mesh key={y} position={[0.11, y, 0]}>
            <boxGeometry args={[0.25, 0.08, depth + 0.02]} />
            <meshStandardMaterial color="#2c2f37" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        {/* Hazard face on the camera end */}
        <mesh position={[0.11, 0.5, depth / 2 + 0.012]}>
          <planeGeometry args={[0.2, 0.5]} />
          <meshStandardMaterial color="#d8392b" roughness={0.6} />
        </mesh>
        <mesh position={[0.11, 0.5, depth / 2 + 0.016]}>
          <circleGeometry args={[0.06, 12]} />
          <meshStandardMaterial color="#ffd84d" emissive="#a87a10" emissiveIntensity={0.4} />
        </mesh>
      </group>
      {/* Fixed hinge brackets */}
      {[-depth / 2 + 0.05, depth / 2 - 0.05].map((dz) => (
        <mesh key={dz} position={[0.02, 0, dz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.12, 10]} />
          <meshStandardMaterial color="#2c2f37" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0.3, 0.06, front - z - 0.05]}>
        <boxGeometry args={[0.16, 0.12, 0.1]} />
        <meshStandardMaterial color="#b98d3c" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
};

interface TripwireProps {
  x: number;
  /** Each entry strings the wire at `set` and snaps it at `cut`. */
  events: Array<{ set: number; cut: number }>;
  retireFrame: number;
  footX: number;
  edgeX: number;
  ledgeY: number;
  zBack?: number;
  zFront?: number;
}

const PEG_H = 0.34;
const WIRE_Y = 0.27;

const Rod: React.FC<{ from: Vec3; to: Vec3; radius?: number; color?: string }> = ({
  from,
  to,
  radius = 0.016,
  color = "#d9cdb0",
}) => {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 6]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
    </mesh>
  );
};

/** Tripwire across the hall on two iron pegs, with a pull cable to the gate. */
export const Tripwire: React.FC<TripwireProps> = ({
  x,
  events,
  retireFrame,
  footX,
  edgeX,
  ledgeY,
  zBack = -2.05,
  zFront = 0.95,
}) => {
  const frame = useCurrentFrame();
  if (frame < events[0].set) return null;
  const retire = Math.max(0.001, 1 - Math.max(0, frame - retireFrame) / 10);
  if (frame > retireFrame + 10) return null;
  const spawn = Math.min(1, (frame - events[0].set) / 8);

  const current = [...events].reverse().find((e) => frame >= e.set) ?? events[0];
  const span = zFront - zBack;
  const half = span / 2;
  const strung = frame < current.cut;
  const restring = Math.min(1, (frame - current.set) / 8);
  const snapAge = frame - current.cut;
  const droop = strung ? 0 : Math.min(0.2, 0.2 * (1 - Math.exp(-snapAge / 3)) + 0.05 * Math.sin(snapAge * 0.9) * Math.exp(-snapAge / 6));
  const recoil = strung ? 1 : 0.86;
  const wireColor = strung ? "#e8dcb8" : "#b8ac8c";
  const taut = 0.003 * Math.sin(frame * 2.1) * (strung ? 1 : 0);

  const peg = (z: number) => (
    <group position={[x, 0, z]}>
      <mesh position={[0, PEG_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, PEG_H, 8]} />
        <meshStandardMaterial color="#3a3e48" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, PEG_H, 0]}>
        <sphereGeometry args={[0.065, 10, 8]} />
        <meshStandardMaterial color="#b98d3c" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 12]} />
        <meshStandardMaterial color="#2c2f37" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );

  return (
    <group scale={[1, spawn * retire, 1]}>
      {peg(zBack)}
      {peg(zFront)}
      {strung ? (
        <mesh position={[x, WIRE_Y + taut, (zBack + zFront) / 2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, restring, 1]}>
          <cylinderGeometry args={[0.018, 0.018, span, 6]} />
          <meshStandardMaterial color={wireColor} emissive="#5a4a20" emissiveIntensity={0.25} roughness={0.4} metalness={0.4} />
        </mesh>
      ) : (
        <>
          <group position={[x, WIRE_Y, zBack]} rotation={[droop, 0, 0]}>
            <mesh position={[0, 0, (half * recoil) / 2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, half * recoil, 6]} />
              <meshStandardMaterial color={wireColor} roughness={0.5} />
            </mesh>
          </group>
          <group position={[x, WIRE_Y, zFront]} rotation={[-droop, 0, 0]}>
            <mesh position={[0, 0, (-half * recoil) / 2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, half * recoil, 6]} />
              <meshStandardMaterial color={wireColor} roughness={0.5} />
            </mesh>
          </group>
        </>
      )}
      {/* Pull cable: front peg -> ramp foot -> up the ramp -> gate latch */}
      <Rod from={[x, 0.06, zFront + 0.08]} to={[footX, 0.06, zFront + 0.08]} />
      <Rod from={[footX, 0.06, zFront + 0.08]} to={[edgeX, ledgeY + 0.08, zFront + 0.08]} />
      <Rod from={[edgeX, ledgeY + 0.08, zFront + 0.08]} to={[edgeX + 0.3, ledgeY + 0.1, zFront + 0.08]} />
    </group>
  );
};
