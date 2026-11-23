/* eslint-disable @remotion/deterministic-randomness */
import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AdventurerUnit, type AdventurerPose } from "../../artifacts/characters/hero";
import { fpsSfx } from "./fpsSfx";

export interface FpsEnemy {
  id: number;
  name: string;
  pos: [number, number, number];
  health: number;
  maxHealth: number;
  isAlive: boolean;
  yaw: number;
  pose: AdventurerPose;
  shootCooldown: number;
  aimTime: number; // Time spent aiming at player before firing
  respawnTimer: number;
  patrolTarget: [number, number];
}

interface BulletTracer {
  id: number;
  start: [number, number, number];
  end: [number, number, number];
  life: number;
}

interface FpsEnemiesProps {
  enemies: FpsEnemy[];
  playerPos: [number, number, number];
  onPlayerDamage: (dmg: number, attackerName: string, attackerPos: [number, number, number]) => void;
  difficulty?: "vardhan" | "classic";
}

export const FpsEnemies: React.FC<FpsEnemiesProps> = ({
  enemies,
  playerPos,
  onPlayerDamage,
  difficulty = "vardhan",
}) => {
  const [tracers, setTracers] = useState<BulletTracer[]>([]);
  const [muzzleFlashes, setMuzzleFlashes] = useState<{ id: number; pos: [number, number, number] }[]>([]);
  const enemiesGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const [px, , pz] = playerPos;

    // Decay existing bullet tracers
    setTracers((prev) =>
      prev
        .map((t) => ({ ...t, life: t.life - dt * 4 }))
        .filter((t) => t.life > 0)
    );

    enemies.forEach((enemy) => {
      if (!enemy.isAlive) {
        enemy.respawnTimer -= dt;
        if (enemy.respawnTimer <= 0) {
          // Respawn!
          enemy.isAlive = true;
          enemy.health = 100;
          enemy.pose = "idle";
          enemy.shootCooldown = 2.5 + Math.random() * 1.5;
          enemy.aimTime = 0;
          const spawns: [number, number][] = [
            [-10, -18],
            [10, -18],
            [0, -15],
            [-12, -6],
            [12, -6],
          ];
          const pick = spawns[Math.floor(Math.random() * spawns.length)];
          enemy.pos = [pick[0], 0, pick[1]];
        }
        return;
      }

      // Calculate distance & angle to player
      const dx = px - enemy.pos[0];
      const dz = pz - enemy.pos[2];
      const dist = Math.hypot(dx, dz);

      // Turn towards player smoothly
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - enemy.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      enemy.yaw += diff * Math.min(1, 5 * dt);

      // AI Behavior: Patrol or Engage
      if (dist < 26) {
        enemy.pose = dist > 9 ? "walk" : "idle";

        // Step toward player slowly if far, keep distance if close
        if (dist > 9) {
          enemy.pos[0] += Math.sin(enemy.yaw) * 1.8 * dt;
          enemy.pos[2] += Math.cos(enemy.yaw) * 1.8 * dt;
        }

        // Aiming and Shooting with clear telegraphing
        enemy.shootCooldown -= dt;

        if (enemy.shootCooldown <= 0.8) {
          // Bot is actively aiming / winding up (telegraph period!)
          enemy.aimTime = (enemy.aimTime || 0) + dt;
        }

        if (enemy.shootCooldown <= 0) {
          // Reset cooldown (Staggered: 2.2 to 3.8 seconds so player isn't overwhelmed)
          const baseCooldown = difficulty === "vardhan" ? 2.6 : 1.8;
          enemy.shootCooldown = baseCooldown + Math.random() * 1.4;
          enemy.aimTime = 0;

          // Sound
          fpsSfx.pistol();

          // Spawn visible 3D bullet tracer streak flying from enemy to player
          const muzzlePos: [number, number, number] = [
            enemy.pos[0] + Math.sin(enemy.yaw) * 0.4,
            1.2,
            enemy.pos[2] + Math.cos(enemy.yaw) * 0.4,
          ];
          const targetPos: [number, number, number] = [
            px + (Math.random() - 0.5) * 1.5,
            1.3 + (Math.random() - 0.5) * 0.8,
            pz + (Math.random() - 0.5) * 1.5,
          ];

          const tracerId = Date.now() + Math.random();
          setTracers((prev) => [
            ...prev.slice(-6),
            { id: tracerId, start: muzzlePos, end: targetPos, life: 1.0 },
          ]);

          // Flash muzzle light
          setMuzzleFlashes((prev) => [...prev, { id: tracerId, pos: muzzlePos }]);
          setTimeout(() => {
            setMuzzleFlashes((prev) => prev.filter((f) => f.id !== tracerId));
          }, 90);

          // Hit chance: Fair & forgiving for Vardhan
          // 25% at medium range, 35% up close (much friendlier than old 65%)
          const maxHitChance = difficulty === "vardhan" ? 0.32 : 0.48;
          const hitChance = Math.max(0.15, maxHitChance - dist * 0.015);

          if (Math.random() < hitChance) {
            // Balanced damage: 4 to 8 damage (instead of 12-20)
            const dmgBase = difficulty === "vardhan" ? 5 : 9;
            const dmg = dmgBase + Math.floor(Math.random() * 4);
            onPlayerDamage(dmg, enemy.name, enemy.pos);
          }
        }
      } else {
        enemy.pose = "idle";
        enemy.aimTime = 0;
      }
    });
  });

  return (
    <group ref={enemiesGroupRef}>
      {/* 3D Bullet Tracers Flying through Air */}
      {tracers.map((tracer) => {
        const p1 = new THREE.Vector3(...tracer.start);
        const p2 = new THREE.Vector3(...tracer.end);
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        const length = p1.distanceTo(p2);

        return (
          <group
            key={`tracer-${tracer.id}`}
            position={mid}
            onUpdate={(self) => self.lookAt(p2)}
          >
            {/* Glowing Tracer Beam */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, length, 6]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={tracer.life} />
            </mesh>
            {/* Bright Core */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, length, 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={tracer.life} />
            </mesh>
          </group>
        );
      })}

      {/* Muzzle Flash Point Lights */}
      {muzzleFlashes.map((mf) => (
        <group key={`mf-${mf.id}`} position={mf.pos}>
          <pointLight color="#f97316" intensity={8.0} distance={4.5} />
          <mesh>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* Render Each Enemy Bot */}
      {enemies.map((enemy) => {
        if (!enemy.isAlive) {
          // Corpse / eliminated bot
          return (
            <group key={`enemy-${enemy.id}`} position={enemy.pos} rotation={[0, enemy.yaw, 0]}>
              <AdventurerUnit
                classType="goblin"
                scale={1.0}
                pose="sprawl"
                expression="dead"
                weapon="none"
              />
            </group>
          );
        }

        const isAimingAtPlayer = enemy.shootCooldown <= 0.8;
        const [px, , pz] = playerPos;
        const angleToPlayer = Math.atan2(px - enemy.pos[0], pz - enemy.pos[2]);

        return (
          <group key={`enemy-${enemy.id}`} position={enemy.pos} rotation={[0, enemy.yaw, 0]}>
            {/* Billboard UI Tag (Always faces player camera!) */}
            <group
              position={[0, 2.3, 0]}
              rotation={[0, angleToPlayer - enemy.yaw, 0]}
            >
              {/* Enemy Name & Warning Banner */}
              <group position={[0, 0.22, 0]}>
                {/* Background Tag */}
                <mesh position={[0, 0, 0]}>
                  <planeGeometry args={[1.4, 0.24]} />
                  <meshBasicMaterial
                    color={isAimingAtPlayer ? "#b91c1c" : "#1e293b"}
                    transparent
                    opacity={0.88}
                  />
                </mesh>
                {/* Tag Border */}
                <mesh position={[0, 0, -0.002]}>
                  <planeGeometry args={[1.44, 0.28]} />
                  <meshBasicMaterial color={isAimingAtPlayer ? "#f87171" : "#475569"} />
                </mesh>
              </group>

              {/* Aiming Warning Laser / Beacon when aiming */}
              {isAimingAtPlayer && (
                <group position={[0, 0.44, 0]}>
                  <mesh>
                    <planeGeometry args={[0.8, 0.16]} />
                    <meshBasicMaterial color="#ef4444" />
                  </mesh>
                </group>
              )}

              {/* Health Bar Background */}
              <mesh position={[0, 0, 0]}>
                <planeGeometry args={[1.2, 0.14]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
              {/* Foreground Green/Red Health Fill */}
              <mesh
                position={[-0.6 + (enemy.health / 100) * 0.6, 0, 0.005]}
              >
                <planeGeometry args={[(enemy.health / 100) * 1.18, 0.11]} />
                <meshBasicMaterial color={enemy.health > 40 ? "#22c55e" : "#ef4444"} />
              </mesh>
            </group>

            {/* 3D Model: Terrorist / Rival Bot */}
            <AdventurerUnit
              classType="goblin"
              scale={1.05}
              pose={enemy.pose}
              expression={isAimingAtPlayer ? "angry" : "neutral"}
              weapon="none"
            />

            {/* Tactical Pistol / Blaster in Bot's Hand */}
            <group position={[0.34, 0.95, 0.38]} rotation={[-0.1, 0, 0]}>
              {/* Gun Body */}
              <mesh castShadow>
                <boxGeometry args={[0.07, 0.12, 0.28]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Barrel */}
              <mesh position={[0, 0.03, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.022, 0.022, 0.12, 8]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} />
              </mesh>
              {/* Grip */}
              <mesh position={[0, -0.09, -0.06]} rotation={[-0.25, 0, 0]}>
                <boxGeometry args={[0.06, 0.14, 0.08]} />
                <meshStandardMaterial color="#78350f" roughness={0.7} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};
