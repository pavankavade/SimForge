import React, { useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Coins, type CoinItem } from "./Coins";
import { Enemies, type EnemyItem } from "./Enemies";
import { GAME_CONFIG } from "./gameConfig";
import { Hazards } from "./Hazards";
import { HUD } from "./HUD";
import { Player } from "./Player";
import { sfx } from "./sfx";
import { World } from "./World";

function generateInitialCoins(): CoinItem[] {
  const count = GAME_CONFIG.coins.count;
  const size = GAME_CONFIG.world.arenaSize;
  const spread = size / 2 - 3.5;
  const coins: CoinItem[] = [];

  // Generate nice spread of coins across the room
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = 3 + ((i * 3.7) % spread);
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r;
    coins.push({
      id: i,
      position: [Number(x.toFixed(1)), 0.8, Number(z.toFixed(1))],
      collected: false,
    });
  }
  return coins;
}

function generateInitialEnemies(): EnemyItem[] {
  return [
    { id: 1, position: [-6, 0, -5], isAlive: true, patrolCenter: [-6, -5] },
    { id: 2, position: [6, 0, -5], isAlive: true, patrolCenter: [6, -5] },
  ];
}

export const GameApp: React.FC = () => {
  const [health, setHealth] = useState<number>(GAME_CONFIG.player.maxHealth);
  const [coins, setCoins] = useState<CoinItem[]>(generateInitialCoins);
  const [enemies, setEnemies] = useState<EnemyItem[]>(generateInitialEnemies);
  const [score, setScore] = useState<number>(0);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 5]);
  const [isInvulnerable, setIsInvulnerable] = useState<boolean>(false);
  const [isHurt, setIsHurt] = useState<boolean>(false);
  const [isVictorious, setIsVictorious] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Attack event state
  const [lastAttackPos, setLastAttackPos] = useState<[number, number, number] | null>(null);
  const [lastAttackTime, setLastAttackTime] = useState<number>(0);

  const collectedCount = coins.filter((c) => c.collected).length;
  const totalCoins = coins.length;

  // Handle Player Coin Collection
  const handleCollectCoin = useCallback((id: number) => {
    setCoins((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, collected: true } : c));
      const newlyCollected = updated.filter((c) => c.collected).length;
      if (newlyCollected === updated.length && !isVictorious) {
        setIsVictorious(true);
        sfx.victory();
      }
      return updated;
    });
    setScore((s) => s + 100);
  }, [isVictorious]);

  // Handle Player taking damage from Hazards or Enemies
  const handlePlayerHit = useCallback(() => {
    if (isInvulnerable || isGameOver || isVictorious) return;

    setHealth((h) => {
      const nextHealth = Math.max(0, h - 1);
      if (nextHealth === 0) {
        setIsGameOver(true);
      }
      return nextHealth;
    });

    setIsHurt(true);
    setIsInvulnerable(true);

    setTimeout(() => setIsHurt(false), 400);
    setTimeout(() => setIsInvulnerable(false), 1200); // 1.2s invulnerability window
  }, [isInvulnerable, isGameOver, isVictorious]);

  // Handle Player Attacking
  const handleAttack = useCallback((pos: [number, number, number]) => {
    setLastAttackPos([...pos]);
    setLastAttackTime(Date.now());
  }, []);

  // Handle Enemy Defeated
  const handleEnemyDefeated = useCallback((id: number) => {
    setEnemies((prev) => prev.map((e) => (e.id === id ? { ...e, isAlive: false } : e)));
    setScore((s) => s + 250);
  }, []);

  // Restart Game
  const handleRestart = useCallback(() => {
    setHealth(GAME_CONFIG.player.maxHealth);
    setCoins(generateInitialCoins());
    setEnemies(generateInitialEnemies());
    setScore(0);
    setIsGameOver(false);
    setIsVictorious(false);
    setIsHurt(false);
    setIsInvulnerable(false);
  }, []);

  // Listen for 'R' key to restart
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "KeyR") && (isGameOver || isVictorious)) {
        handleRestart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isGameOver, isVictorious, handleRestart]);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#07090e",
      }}
    >
      <Canvas
        camera={{ position: [0, 6, 12], fov: 48 }}
        style={{ width: "100%", height: "100%" }}
        shadows
      >
        <World portalOpen={collectedCount === totalCoins} />

        <Player
          onPositionUpdate={setPlayerPos}
          onAttack={handleAttack}
          isHurt={isHurt}
          isVictorious={isVictorious}
          isGameOver={isGameOver}
        />

        <Coins
          coins={coins}
          playerPos={playerPos}
          onCollect={handleCollectCoin}
        />

        <Hazards
          playerPos={playerPos}
          onPlayerHit={handlePlayerHit}
          isInvulnerable={isInvulnerable}
        />

        <Enemies
          enemies={enemies}
          playerPos={playerPos}
          onEnemyDefeated={handleEnemyDefeated}
          onPlayerHit={handlePlayerHit}
          isInvulnerable={isInvulnerable}
          lastAttackPos={lastAttackPos}
          lastAttackTime={lastAttackTime}
        />
      </Canvas>

      <HUD
        health={health}
        maxHealth={GAME_CONFIG.player.maxHealth}
        coinsCollected={collectedCount}
        totalCoins={totalCoins}
        score={score}
        isVictorious={isVictorious}
        isGameOver={isGameOver}
        onRestart={handleRestart}
      />
    </div>
  );
};
