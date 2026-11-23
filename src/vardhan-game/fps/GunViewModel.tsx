/* eslint-disable @remotion/deterministic-randomness */
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WeaponSpec } from "./weapons";

interface GunViewModelProps {
  weapon: WeaponSpec;
  isFiring: boolean;
  isReloading: boolean;
  isScoped: boolean;
  isMoving?: boolean;
}

export const GunViewModel: React.FC<GunViewModelProps> = ({
  weapon,
  isFiring,
  isReloading,
  isScoped,
  isMoving = false,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const flashMeshRef = useRef<THREE.Group>(null);
  const smokeRef = useRef<THREE.Mesh>(null);

  // Animation values
  const recoilRef = useRef<number>(0);
  const bobTimeRef = useRef<number>(0);

  useFrame((_, delta) => {
    if (!rootGroupRef.current) return;
    const dt = Math.min(delta, 0.05);

    // 1. Recoil Kickback & Recovery
    if (isFiring) {
      recoilRef.current = weapon.category === "sniper" ? 0.16 : weapon.category === "knife" ? 0.04 : 0.09;
    } else {
      recoilRef.current = THREE.MathUtils.lerp(recoilRef.current, 0, dt * 14);
    }

    // 2. Natural Breathing & Walking Bob (Figure-8)
    if (isMoving) {
      bobTimeRef.current += dt * 10;
    } else {
      bobTimeRef.current += dt * 2.5;
    }

    const bobAmount = isMoving ? 0.016 : 0.003;
    const bobX = Math.sin(bobTimeRef.current * 0.5) * bobAmount * 1.4;
    const bobY = Math.abs(Math.sin(bobTimeRef.current)) * bobAmount;

    // 3. Reload Animation
    const reloadDip = isReloading ? -0.18 : 0;
    const reloadTilt = isReloading ? -0.45 : 0;
    const reloadRoll = isReloading ? 0.25 : 0;

    // Apply combined position & rotation
    rootGroupRef.current.position.x = 0.24 + bobX;
    rootGroupRef.current.position.y = -0.22 - bobY + reloadDip;
    rootGroupRef.current.position.z = -0.46 + recoilRef.current;

    rootGroupRef.current.rotation.x = reloadTilt + recoilRef.current * 0.75 + bobY * 2;
    rootGroupRef.current.rotation.y = -bobX * 1.5;
    rootGroupRef.current.rotation.z = reloadRoll + recoilRef.current * 0.2;

    // 4. Dynamic Muzzle Flash & Light
    const showFlash = isFiring && weapon.category !== "knife";
    if (flashLightRef.current) {
      flashLightRef.current.intensity = showFlash ? 4.5 : 0;
    }
    if (flashMeshRef.current) {
      flashMeshRef.current.visible = showFlash;
      if (showFlash) {
        flashMeshRef.current.rotation.z = Math.random() * Math.PI * 2;
      }
    }
    if (smokeRef.current) {
      smokeRef.current.visible = isFiring && Math.random() > 0.4;
    }
  });

  // Hide viewmodel when scoped with sniper rifle
  if (isScoped && weapon.category === "sniper") {
    return null;
  }

  // Realistic Gun Metal & Wood Materials
  const steelMat = new THREE.MeshStandardMaterial({
    color: "#1e2229",
    metalness: 0.92,
    roughness: 0.28,
  });
  const darkPolymerMat = new THREE.MeshStandardMaterial({
    color: "#14171d",
    roughness: 0.65,
    metalness: 0.15,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: "#6b3c1b",
    roughness: 0.52,
    metalness: 0.05,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: "#ffd700",
    metalness: 0.95,
    roughness: 0.15,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: "#1c2029",
    roughness: 0.85,
    metalness: 0.1,
  });
  const knuckleMat = new THREE.MeshStandardMaterial({
    color: "#282d38",
    roughness: 0.4,
    metalness: 0.5,
  });

  return (
    <group ref={rootGroupRef}>
      {/* ======================================================== */}
      {/* TACTICAL OPERATIVE ARMS & GLOVES (First Person Hands)    */}
      {/* ======================================================== */}
      {/* Right Arm & Tactical Glove (Pistol Grip) */}
      <group position={[0.08, -0.14, 0.18]} rotation={[-0.2, 0.15, -0.1]}>
        {/* Forearm Sleeve */}
        <mesh position={[0, -0.16, 0.15]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.38, 16]} />
          <meshStandardMaterial color="#181c24" roughness={0.9} />
        </mesh>
        {/* Wrist Cuff */}
        <mesh position={[0, -0.04, 0.04]}>
          <cylinderGeometry args={[0.076, 0.078, 0.06, 16]} />
          <meshStandardMaterial color="#222834" roughness={0.8} />
        </mesh>
        {/* Tactical Glove Hand */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.085, 0.1, 0.12]} />
          <primitive object={gloveMat} />
        </mesh>
        {/* Reinforced Knuckle Armor Plate */}
        <mesh position={[0.01, 0.035, -0.01]}>
          <boxGeometry args={[0.075, 0.025, 0.06]} />
          <primitive object={knuckleMat} />
        </mesh>
      </group>

      {/* Left Arm & Tactical Glove (Supporting Barrel / Handguard) */}
      {weapon.category !== "knife" && (
        <group
          position={
            weapon.category === "pistol"
              ? [0.04, -0.15, 0.15] // Supporting underneath pistol grip
              : [-0.18, -0.08, -0.12] // Reaching forward to grip rifle/SMG/sniper
          }
          rotation={
            weapon.category === "pistol"
              ? [-0.25, -0.1, 0.15]
              : [0.1, 0.35, -0.2]
          }
        >
          {/* Forearm Sleeve */}
          <mesh position={[-0.05, -0.18, 0.18]} rotation={[0.5, -0.2, 0]}>
            <cylinderGeometry args={[0.072, 0.082, 0.4, 16]} />
            <meshStandardMaterial color="#181c24" roughness={0.9} />
          </mesh>
          {/* Glove Hand Cupping Under Barrel */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.085, 0.11]} />
            <primitive object={gloveMat} />
          </mesh>
          <mesh position={[-0.01, 0.03, -0.01]}>
            <boxGeometry args={[0.07, 0.02, 0.05]} />
            <primitive object={knuckleMat} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 1. GLOCK-18 (TACTICAL PISTOL)                            */}
      {/* ======================================================== */}
      {weapon.category === "pistol" && (
        <group position={[0, 0, 0]} scale={0.78}>
          {/* Slide (Blued Steel with chamfered top) */}
          <mesh position={[0, 0.082, -0.12]}>
            <boxGeometry args={[0.068, 0.074, 0.32]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Slide Cocking Serrations (Rear) */}
          {[-0.03, -0.01, 0.01].map((offset, i) => (
            <mesh key={`ser-${i}`} position={[0, 0.085, offset]}>
              <boxGeometry args={[0.072, 0.045, 0.008]} />
              <meshStandardMaterial color="#111317" metalness={0.9} />
            </mesh>
          ))}
          {/* Ejection Port */}
          <mesh position={[0.025, 0.09, -0.09]}>
            <boxGeometry args={[0.028, 0.035, 0.07]} />
            <meshStandardMaterial color="#0b0d10" metalness={0.95} />
          </mesh>
          {/* 3-Dot Combat Sights: Front Post with White Dot */}
          <mesh position={[0, 0.125, -0.26]}>
            <boxGeometry args={[0.012, 0.018, 0.018]} />
            <primitive object={steelMat} />
          </mesh>
          <mesh position={[0, 0.126, -0.25]}>
            <planeGeometry args={[0.006, 0.006]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Rear Sight Notch with 2 White Dots */}
          <mesh position={[0, 0.126, 0.02]}>
            <boxGeometry args={[0.036, 0.018, 0.018]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Polymer Lower Frame */}
          <mesh position={[0, 0.035, -0.11]}>
            <boxGeometry args={[0.065, 0.04, 0.31]} />
            <primitive object={darkPolymerMat} />
          </mesh>
          {/* Textured Grip */}
          <mesh position={[0, -0.08, 0.01]} rotation={[0.26, 0, 0]}>
            <boxGeometry args={[0.062, 0.24, 0.1]} />
            <primitive object={darkPolymerMat} />
          </mesh>
          {/* Trigger Guard & Curved Steel Trigger */}
          <mesh position={[0, -0.008, -0.08]}>
            <torusGeometry args={[0.035, 0.006, 8, 16, Math.PI]} />
            <primitive object={darkPolymerMat} />
          </mesh>
          <mesh position={[0, -0.01, -0.06]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.008, 0.032, 0.008]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Hollow Barrel Bore Muzzle */}
          <mesh position={[0, 0.08, -0.285]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.02, 16]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 2. MP5-SD (SUPPRESSED SUBMACHINE GUN)                    */}
      {/* ======================================================== */}
      {weapon.category === "smg" && (
        <group position={[0, 0, 0]} scale={0.72}>
          {/* Receiver Body */}
          <mesh position={[0, 0.06, -0.14]}>
            <boxGeometry args={[0.078, 0.095, 0.44]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Ribbed Integrated Sound Suppressor Barrel */}
          <mesh position={[0, 0.07, -0.48]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.32, 24]} />
            <meshStandardMaterial color="#1a1e24" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Suppressor Rib Rings */}
          {[-0.38, -0.44, -0.5, -0.56].map((sz, i) => (
            <mesh key={`rib-${i}`} position={[0, 0.07, sz]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.043, 0.003, 8, 20]} />
              <primitive object={steelMat} />
            </mesh>
          ))}
          {/* Curved Stamped Magazine */}
          <mesh position={[0, -0.18, -0.12]} rotation={[-0.24, 0, 0]}>
            <boxGeometry args={[0.046, 0.28, 0.075]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Grip & Trigger Guard */}
          <mesh position={[0, -0.09, 0.05]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.06, 0.22, 0.088]} />
            <primitive object={darkPolymerMat} />
          </mesh>
          {/* Diopter Rotary Rear Sight */}
          <mesh position={[0, 0.125, 0.02]}>
            <cylinderGeometry args={[0.016, 0.016, 0.02, 12]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Hooded Front Sight Ring */}
          <mesh position={[0, 0.125, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.018, 0.003, 8, 16]} />
            <primitive object={steelMat} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 3. AK-47 (HEAVY ASSAULT RIFLE)                           */}
      {/* ======================================================== */}
      {weapon.category === "rifle" && (
        <group position={[0, 0, 0]} scale={0.68}>
          {/* Stamped Steel Receiver with Fire Selector Switch */}
          <mesh position={[0, 0.07, -0.18]}>
            <boxGeometry args={[0.082, 0.105, 0.48]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Bolt Carrier Charging Handle (Right Side) */}
          <mesh position={[0.055, 0.09, -0.16]}>
            <cylinderGeometry args={[0.01, 0.01, 0.05, 8]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Rich Wooden Handguard & Gas Tube Cover */}
          <mesh position={[0, 0.075, -0.48]}>
            <boxGeometry args={[0.075, 0.095, 0.24]} />
            <primitive object={woodMat} />
          </mesh>
          {/* Long Steel Barrel */}
          <mesh position={[0, 0.085, -0.74]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.019, 0.019, 0.38, 16]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Slant Muzzle Brake */}
          <mesh position={[0, 0.085, -0.94]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.021, 0.06, 12]} />
            <meshStandardMaterial color="#111317" metalness={0.95} />
          </mesh>
          {/* Protected Front Sight Post */}
          <mesh position={[0, 0.12, -0.88]}>
            <boxGeometry args={[0.02, 0.045, 0.02]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Iconic Curved Banana Magazine */}
          <mesh position={[0, -0.2, -0.22]} rotation={[-0.38, 0, 0]}>
            <boxGeometry args={[0.052, 0.34, 0.095]} />
            <meshStandardMaterial color="#b45309" roughness={0.6} metalness={0.3} />
          </mesh>
          {/* Wood Pistol Grip */}
          <mesh position={[0, -0.09, 0.03]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.058, 0.22, 0.088]} />
            <primitive object={woodMat} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 4. AWP (HEAVY SNIPER RIFLE)                              */}
      {/* ======================================================== */}
      {weapon.category === "sniper" && (
        <group position={[0, 0, 0]} scale={0.64}>
          {/* Matte Olive-Drab Chassis Body */}
          <mesh position={[0, 0.065, -0.28]}>
            <boxGeometry args={[0.088, 0.125, 0.72]} />
            <meshStandardMaterial color="#3d4d38" roughness={0.65} metalness={0.1} />
          </mesh>
          {/* Heavy Fluted Sniper Barrel */}
          <mesh position={[0, 0.09, -0.88]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.68, 20]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Dual-Port Heavy Muzzle Brake */}
          <mesh position={[0, 0.09, -1.24]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.045, 0.11, 12]} />
            <meshStandardMaterial color="#0f1115" metalness={0.95} />
          </mesh>
          {/* Massive Telescopic Sniper Scope */}
          <group position={[0, 0.21, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
            {/* Main Scope Tube */}
            <mesh>
              <cylinderGeometry args={[0.035, 0.035, 0.44, 20]} />
              <meshStandardMaterial color="#14171d" metalness={0.85} roughness={0.25} />
            </mesh>
            {/* Objective Bell (Front Flare) */}
            <mesh position={[0, 0.24, 0]}>
              <cylinderGeometry args={[0.052, 0.038, 0.12, 20]} />
              <meshStandardMaterial color="#14171d" metalness={0.9} />
            </mesh>
            {/* Ocular Bell (Eyepiece) */}
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.045, 0.038, 0.08, 20]} />
              <meshStandardMaterial color="#14171d" metalness={0.9} />
            </mesh>
            {/* Scope Lens Glass Reflection */}
            <mesh position={[0, 0.29, 0]}>
              <cylinderGeometry args={[0.048, 0.048, 0.005, 20]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
            </mesh>
          </group>
          {/* Scope Mounting Rings onto Picatinny Rail */}
          <mesh position={[0, 0.145, -0.24]}>
            <boxGeometry args={[0.045, 0.05, 0.32]} />
            <primitive object={steelMat} />
          </mesh>
          {/* Sniper Bolt Handle (Side) */}
          <mesh position={[0.075, 0.09, -0.06]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 10]} />
            <primitive object={steelMat} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* 5. GOLDEN KNIFE (KARAMBIT COMBAT BLADE)                  */}
      {/* ======================================================== */}
      {weapon.category === "knife" && (
        <group position={[0, 0.06, -0.06]} rotation={[0.45, -0.25, 0.35]} scale={0.82}>
          {/* Curved Golden Blade with Razor Bevel */}
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.018, 0.36, 0.09]} />
            <primitive object={goldMat} />
          </mesh>
          {/* Golden Crossguard */}
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.038, 0.025, 0.16]} />
            <primitive object={goldMat} />
          </mesh>
          {/* Ergonomic Combat Handle with Finger Grooves */}
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.03, 0.032, 0.24, 16]} />
            <primitive object={darkPolymerMat} />
          </mesh>
          {/* Pommel Safety Ring */}
          <mesh position={[0, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.035, 0.008, 8, 16]} />
            <primitive object={goldMat} />
          </mesh>
        </group>
      )}

      {/* ======================================================== */}
      {/* DYNAMIC MUZZLE FLASH & SMOKE (Realistic Firing FX)       */}
      {/* ======================================================== */}
      <group
        ref={flashMeshRef}
        position={[
          0,
          weapon.category === "sniper" ? 0.09 : 0.08,
          weapon.category === "sniper" ? -1.3 : weapon.category === "rifle" ? -0.98 : -0.7,
        ]}
        visible={false}
      >
        {/* Star Muzzle Flash Plane 1 */}
        <mesh>
          <planeGeometry args={[0.42, 0.42]} />
          <meshBasicMaterial color="#ffe57f" transparent opacity={0.92} side={THREE.DoubleSide} />
        </mesh>
        {/* Star Muzzle Flash Plane 2 (Crossed) */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.38, 0.38]} />
          <meshBasicMaterial color="#ff9900" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Dynamic Firing Point Light */}
      <pointLight
        ref={flashLightRef}
        color="#ffaa33"
        intensity={0}
        distance={6}
        position={[0, 0.1, -0.8]}
      />
    </group>
  );
};
