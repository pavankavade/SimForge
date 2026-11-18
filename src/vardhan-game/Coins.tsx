import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAME_CONFIG } from "./gameConfig";
import { sfx } from "./sfx";

export interface CoinItem {
  id: number;
  position: [number, number, number];
  collected: boolean;
}

interface CoinsProps {
  coins: CoinItem[];
  playerPos: [number, number, number];
  onCollect: (id: number) => void;
}

export const Coins: React.FC<CoinsProps> = ({ coins, playerPos, onCollect }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const spin = t * GAME_CONFIG.coins.spinSpeed;
    const bob = Math.sin(t * 4) * GAME_CONFIG.coins.bobHeight;

    const [px, py, pz] = playerPos;

    coins.forEach((coin) => {
      if (coin.collected) return;
      const [cx, cy, cz] = coin.position;
      const dist = Math.hypot(px - cx, pz - cz);

      // Player touched coin!
      if (dist < 1.15 && Math.abs(py - cy) < 1.6) {
        sfx.coin();
        onCollect(coin.id);
      }
    });

    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.y = spin + i * 0.4;
        child.position.y = (coins[i]?.position[1] ?? 0.8) + bob;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {coins.map((coin) => {
        if (coin.collected) return null;
        return (
          <group key={`coin-${coin.id}`} position={coin.position}>
            {/* Shiny Gold Coin */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 0.08, 16]} />
              <meshStandardMaterial
                color="#ffc83b"
                roughness={0.2}
                metalness={0.85}
                emissive="#aa7700"
                emissiveIntensity={0.25}
              />
            </mesh>
            {/* Sparkle Glow Center */}
            <pointLight color="#ffcc00" intensity={1.2} distance={3.5} />
          </group>
        );
      })}
    </group>
  );
};
