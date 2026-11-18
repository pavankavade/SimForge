import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AdventurerUnit, type AdventurerPose } from "../artifacts/characters/hero";
import type { Expression } from "../artifacts/characters/hero/Face";
import { GAME_CONFIG } from "./gameConfig";
import { sfx } from "./sfx";

export interface EnemyItem {
  id: number;
  position: [number, number, number];
  isAlive: boolean;
  patrolCenter: [number, number];
}

interface EnemiesProps {
  enemies: EnemyItem[];
  playerPos: [number, number, number];
  onEnemyDefeated: (id: number) => void;
  onPlayerHit: () => void;
  isInvulnerable: boolean;
  lastAttackPos: [number, number, number] | null;
  lastAttackTime: number;
}

export const Enemies: React.FC<EnemiesProps> = ({
  enemies,
  playerPos,
  onEnemyDefeated,
  onPlayerHit,
  isInvulnerable,
  lastAttackPos,
  lastAttackTime,
}) => {
  const [enemyStates, setEnemyStates] = useState<{
    [id: number]: {
      pos: [number, number, number];
      yaw: number;
      pose: AdventurerPose;
      expr: Expression;
      animFrame: number;
    };
  }>({});

  const processedAttacksRef = useRef<number>(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const [px, py, pz] = playerPos;

    // Check if player attacked recently near an enemy
    if (lastAttackPos && lastAttackTime !== processedAttacksRef.current) {
      processedAttacksRef.current = lastAttackTime;
      enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        const currentPos = enemyStates[enemy.id]?.pos ?? enemy.position;
        const d = Math.hypot(lastAttackPos[0] - currentPos[0], lastAttackPos[2] - currentPos[2]);
        if (d < 2.0) {
          // Defeated!
          sfx.hit();
          onEnemyDefeated(enemy.id);
        }
      });
    }

    const nextStates: typeof enemyStates = {};

    enemies.forEach((enemy) => {
      if (!enemy.isAlive) {
        nextStates[enemy.id] = {
          pos: enemyStates[enemy.id]?.pos ?? enemy.position,
          yaw: enemyStates[enemy.id]?.yaw ?? 0,
          pose: "sprawl",
          expr: "dead",
          animFrame: 0,
        };
        return;
      }

      const prev = enemyStates[enemy.id] ?? {
        pos: [...enemy.position] as [number, number, number],
        yaw: 0,
        pose: "idle",
        expr: "neutral",
        animFrame: 0,
      };

      const curPos: [number, number, number] = [...prev.pos];
      const distToPlayer = Math.hypot(px - curPos[0], pz - curPos[2]);
      let pose: AdventurerPose = "idle";
      let expr: Expression = "neutral";
      let yaw = prev.yaw;

      // Enemy AI: Chase if player is in range
      if (distToPlayer < GAME_CONFIG.enemies.detectionRange) {
        expr = "angry";
        pose = "run";

        // Move towards player
        const dx = px - curPos[0];
        const dz = pz - curPos[2];
        const angle = Math.atan2(dx, dz);
        yaw = angle;

        if (distToPlayer > 1.1) {
          const speed = GAME_CONFIG.enemies.speed;
          curPos[0] += Math.sin(angle) * speed * dt;
          curPos[2] += Math.cos(angle) * speed * dt;
        } else {
          // Attack player!
          pose = "smash";
          if (!isInvulnerable && Math.abs(py - curPos[1]) < 1.2) {
            sfx.hit();
            onPlayerHit();
          }
        }
      } else {
        // Simple idle / patrol
        pose = "walk";
        expr = "neutral";
        curPos[0] += Math.sin(prev.animFrame * 0.05) * 0.02;
      }

      nextStates[enemy.id] = {
        pos: curPos,
        yaw,
        pose,
        expr,
        animFrame: prev.animFrame + 1,
      };
    });

    setEnemyStates(nextStates);
  });

  return (
    <group>
      {enemies.map((enemy) => {
        const state = enemyStates[enemy.id] ?? {
          pos: enemy.position,
          yaw: 0,
          pose: "idle" as AdventurerPose,
          expr: "neutral" as Expression,
          animFrame: 0,
        };

        return (
          <group key={`enemy-${enemy.id}`} position={state.pos} rotation={[0, state.yaw, 0]}>
            <AdventurerUnit
              classType="goblin"
              scale={0.9}
              pose={state.pose}
              weapon="club"
              expression={state.expr}
              animFrame={state.animFrame}
            />
          </group>
        );
      })}
    </group>
  );
};
