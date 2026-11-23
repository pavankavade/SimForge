import React, { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { FpsArena } from "./fps/FpsArena";
import { FpsEnemies, type FpsEnemy } from "./fps/FpsEnemies";
import { FpsHUD } from "./fps/FpsHUD";
import { FpsPlayer } from "./fps/FpsPlayer";
import { fpsSfx } from "./fps/fpsSfx";
import { GUN_GAME_LEVELS, type WeaponSpec } from "./fps/weapons";

interface VardhanFpsAppProps {
  onSwitchMode?: () => void;
}

function createInitialBots(): FpsEnemy[] {
  return [
    {
      id: 1,
      name: "Bot Phoenix",
      pos: [-8, 0, -12],
      health: 100,
      maxHealth: 100,
      isAlive: true,
      yaw: 0,
      pose: "idle",
      shootCooldown: 2.2,
      aimTime: 0,
      respawnTimer: 0,
      patrolTarget: [-8, -12],
    },
    {
      id: 2,
      name: "Bot Sabre",
      pos: [8, 0, -12],
      health: 100,
      maxHealth: 100,
      isAlive: true,
      yaw: 0,
      pose: "idle",
      shootCooldown: 2.8,
      aimTime: 0,
      respawnTimer: 0,
      patrolTarget: [8, -12],
    },
    {
      id: 3,
      name: "Bot Elite",
      pos: [0, 0, -16],
      health: 100,
      maxHealth: 100,
      isAlive: true,
      yaw: 0,
      pose: "idle",
      shootCooldown: 2.5,
      aimTime: 0,
      respawnTimer: 0,
      patrolTarget: [0, -16],
    },
    {
      id: 4,
      name: "Bot Anarchist",
      pos: [-10, 0, 4],
      health: 100,
      maxHealth: 100,
      isAlive: true,
      yaw: 0,
      pose: "idle",
      shootCooldown: 3.2,
      aimTime: 0,
      respawnTimer: 0,
      patrolTarget: [-10, 4],
    },
  ];
}

export const VardhanFpsApp: React.FC<VardhanFpsAppProps> = ({ onSwitchMode }) => {
  // Difficulty Mode ("vardhan" has 150 max health, 60% armor absorption, cover health regen)
  const [difficulty, setDifficulty] = useState<"vardhan" | "classic">("vardhan");
  const maxHealth = difficulty === "vardhan" ? 150 : 100;

  // Gun Game Progression state
  const [levelIdx, setLevelIdx] = useState<number>(0);
  const currentWeapon: WeaponSpec = GUN_GAME_LEVELS[levelIdx];
  const [ammo, setAmmo] = useState<number>(currentWeapon.magSize);
  const [killsThisLevel, setKillsThisLevel] = useState<number>(0);
  const killsNeededForNext = levelIdx === GUN_GAME_LEVELS.length - 1 ? 1 : 2;

  // Player Vitals
  const [health, setHealth] = useState<number>(maxHealth);
  const [armor, setArmor] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isMatchWon, setIsMatchWon] = useState<boolean>(false);
  const lastDamageTimeRef = useRef<number>(Date.now());

  // Combat Visual Feedback & Threat Direction
  const [killerName, setKillerName] = useState<string | null>(null);
  const [damageIndicator, setDamageIndicator] = useState<{ angle: number; opacity: number } | null>(null);
  const [lastAttacker, setLastAttacker] = useState<{ name: string; dist: number } | null>(null);
  const [isHurtFlash, setIsHurtFlash] = useState<boolean>(false);

  // FX & UI
  const [hitmarker, setHitmarker] = useState<"body" | "head" | null>(null);
  const [killFeed, setKillFeed] = useState<
    { id: number; killer: string; victim: string; weapon: string; headshot: boolean }[]
  >([]);

  // Enemies state & Player spatial transform
  const [enemies, setEnemies] = useState<FpsEnemy[]>(createInitialBots);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 1.6, 16]);
  const playerYawRef = useRef<number>(0);

  // Health Regeneration in Cover (Vardhan Mode)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGameOver || isMatchWon) return;
      const timeSinceDamage = Date.now() - lastDamageTimeRef.current;
      // Start auto-healing after 2.5 seconds of not taking damage
      if (timeSinceDamage > 2500) {
        setHealth((h) => Math.min(maxHealth, h + 3));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isGameOver, isMatchWon, maxHealth]);

  const handleShoot = useCallback(() => {
    setAmmo((a) => Math.max(0, a - 1));
  }, []);

  const handleReload = useCallback(() => {
    setAmmo(currentWeapon.magSize);
  }, [currentWeapon.magSize]);

  const handleHitmarker = useCallback((isHeadshot: boolean) => {
    setHitmarker(isHeadshot ? "head" : "body");
    setTimeout(() => setHitmarker(null), 120);
  }, []);

  const handlePlayerDamage = useCallback(
    (dmg: number, attackerName: string, attackerPos: [number, number, number]) => {
      if (isGameOver || isMatchWon) return;
      lastDamageTimeRef.current = Date.now();

      // 1. Play hurt sound
      fpsSfx.playerHurt();

      // 2. Calculate Direction of Attacker relative to Player Camera
      const dx = attackerPos[0] - playerPos[0];
      const dz = attackerPos[2] - playerPos[2];
      const dist = Math.hypot(dx, dz);

      // Angle from player to attacker (0 = in front, Math.PI = behind, -Math.PI/2 = left)
      const worldAngleToAttacker = Math.atan2(dx, dz);
      let relAngle = worldAngleToAttacker - playerYawRef.current;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;

      // Show Directional Threat Wedge
      setDamageIndicator({ angle: relAngle, opacity: 1.0 });
      setTimeout(() => {
        setDamageIndicator((prev) => (prev ? { ...prev, opacity: 0 } : null));
      }, 900);

      // Flash Screen Blood Vignette
      setIsHurtFlash(true);
      setTimeout(() => setIsHurtFlash(false), 240);

      // Show Attacker Name & Distance banner
      setLastAttacker({ name: attackerName, dist: Math.round(dist) });
      setTimeout(() => setLastAttacker(null), 2200);

      // 3. Apply Damage with Armor Absorption
      // Armor absorbs 60% of damage in Vardhan Mode, 40% in Classic
      const armorAbsorbRatio = difficulty === "vardhan" ? 0.6 : 0.4;
      const armorDmg = Math.floor(dmg * armorAbsorbRatio);
      const healthDmg = Math.max(1, dmg - armorDmg);

      setArmor((a) => Math.max(0, a - armorDmg));

      setHealth((h) => {
        const nextH = Math.max(0, h - healthDmg);
        if (nextH === 0) {
          setIsGameOver(true);
          setKillerName(attackerName);
        }
        return nextH;
      });
    },
    [isGameOver, isMatchWon, playerPos, difficulty]
  );

  const handleDamageEnemy = useCallback(
    (enemyId: number, damage: number, isHeadshot: boolean) => {
      setEnemies((prev) =>
        prev.map((enemy) => {
          if (enemy.id !== enemyId || !enemy.isAlive) return enemy;
          const nextHealth = Math.max(0, enemy.health - damage);

          if (nextHealth === 0) {
            // ENEMY ELIMINATED!
            const newScore = isHeadshot ? 150 : 100;
            setScore((s) => s + newScore);

            // Add to kill feed
            setKillFeed((feed) => [
              {
                id: Date.now(),
                killer: "Vardhan",
                victim: enemy.name,
                weapon: currentWeapon.name,
                headshot: isHeadshot,
              },
              ...feed.slice(0, 3),
            ]);

            // Gun Game Level Progression
            setKillsThisLevel((k) => {
              const nextK = k + 1;
              if (nextK >= killsNeededForNext) {
                // LEVEL UP TO NEXT WEAPON!
                setLevelIdx((lvl) => {
                  const nextLvl = lvl + 1;
                  if (nextLvl >= GUN_GAME_LEVELS.length) {
                    setIsMatchWon(true);
                    fpsSfx.levelUp();
                    return lvl;
                  }
                  fpsSfx.levelUp();
                  setAmmo(GUN_GAME_LEVELS[nextLvl].magSize);
                  return nextLvl;
                });
                return 0;
              }
              return nextK;
            });

            return {
              ...enemy,
              health: 0,
              isAlive: false,
              pose: "sprawl",
              respawnTimer: 3.5, // Respawns in 3.5s
            };
          }

          return { ...enemy, health: nextHealth };
        })
      );
    },
    [currentWeapon.name, killsNeededForNext]
  );

  const handleRestart = useCallback(() => {
    setLevelIdx(0);
    setAmmo(GUN_GAME_LEVELS[0].magSize);
    setKillsThisLevel(0);
    setHealth(maxHealth);
    setArmor(100);
    setScore(0);
    setIsGameOver(false);
    setIsMatchWon(false);
    setKillerName(null);
    setDamageIndicator(null);
    setLastAttacker(null);
    setEnemies(createInitialBots());
  }, [maxHealth]);

  const handleToggleDifficulty = useCallback(() => {
    setDifficulty((prev) => {
      const next = prev === "vardhan" ? "classic" : "vardhan";
      setHealth(next === "vardhan" ? 150 : 100);
      return next;
    });
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#171c26",
      }}
    >
      <Canvas
        camera={{ position: [0, 1.6, 16], fov: 74 }}
        style={{ width: "100%", height: "100%" }}
        shadows
      >
        <color attach="background" args={["#dfc7a5"]} />

        <FpsArena />

        <FpsPlayer
          weapon={currentWeapon}
          ammo={ammo}
          maxAmmo={currentWeapon.magSize}
          onShoot={handleShoot}
          onReload={handleReload}
          onHitmarker={handleHitmarker}
          enemies={enemies}
          onDamageEnemy={handleDamageEnemy}
          isGameOver={isGameOver || isMatchWon}
          onPlayerPosition={setPlayerPos}
          onPlayerYaw={(yaw) => {
            playerYawRef.current = yaw;
          }}
        />

        <FpsEnemies
          enemies={enemies}
          playerPos={playerPos}
          onPlayerDamage={handlePlayerDamage}
          difficulty={difficulty}
        />
      </Canvas>

      <FpsHUD
        health={health}
        maxHealth={maxHealth}
        armor={armor}
        weapon={currentWeapon}
        ammo={ammo}
        gunGameLevel={levelIdx + 1}
        totalLevels={GUN_GAME_LEVELS.length}
        killsThisLevel={killsThisLevel}
        killsNeeded={killsNeededForNext}
        score={score}
        hitmarker={hitmarker}
        isScoped={false}
        killFeed={killFeed}
        isMatchWon={isMatchWon}
        isGameOver={isGameOver}
        killerName={killerName}
        damageIndicator={damageIndicator}
        lastAttacker={lastAttacker}
        isHurtFlash={isHurtFlash}
        difficulty={difficulty}
        onToggleDifficulty={handleToggleDifficulty}
        onRestart={handleRestart}
        onSwitchMode={onSwitchMode ?? (() => {})}
      />
    </div>
  );
};
