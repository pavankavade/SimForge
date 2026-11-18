import React, { useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { AdventurerClass } from "../artifacts/characters/hero";
import { StumbleHUD } from "./StumbleHUD";
import { StumblePlayer } from "./StumblePlayer";
import { StumbleWorld, type ThemeStyle } from "./StumbleWorld";

export const VardhanStumbleApp: React.FC = () => {
  const [hero, setHero] = useState<AdventurerClass>("paladin");
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [jumpMultiplier, setJumpMultiplier] = useState<number>(1.0);
  const [theme, setTheme] = useState<ThemeStyle>("stumble");
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 2, 10]);
  const [impulse, setImpulse] = useState<[number, number, number] | null>(null);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  // Touch control triggers
  const [touchTrigger, setTouchTrigger] = useState<{ jump: boolean; dive: boolean }>({
    jump: false,
    dive: false,
  });

  const handleImpulse = useCallback((newImpulse: [number, number, number]) => {
    setImpulse(newImpulse);
  }, []);

  const handleClearImpulse = useCallback(() => {
    setImpulse(null);
  }, []);

  const handleVictory = useCallback(() => {
    setIsVictory(true);
  }, []);

  const handleRestart = useCallback(() => {
    setIsVictory(false);
    setImpulse([0, 5, 0]);
  }, []);

  const handleTouchJump = useCallback(() => {
    setTouchTrigger({ jump: true, dive: false });
    setTimeout(() => setTouchTrigger({ jump: false, dive: false }), 100);
  }, []);

  const handleTouchDive = useCallback(() => {
    setTouchTrigger({ jump: false, dive: true });
    setTimeout(() => setTouchTrigger({ jump: false, dive: false }), 100);
  }, []);

  const skyColor = {
    stumble: "#5ab3ff",
    candy: "#f9a8d4",
    neon: "#090d16",
  }[theme];

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: skyColor,
      }}
    >
      <Canvas
        camera={{ position: [0, 6, 16], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
        shadows
      >
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[skyColor, 25, 75]} />

        <StumbleWorld
          theme={theme}
          playerPos={playerPos}
          onImpulse={handleImpulse}
          onVictory={handleVictory}
          isVictory={isVictory}
        />

        <StumblePlayer
          heroClass={hero}
          speedMultiplier={speedMultiplier}
          jumpMultiplier={jumpMultiplier}
          onPositionUpdate={setPlayerPos}
          externalImpulse={impulse}
          onClearImpulse={handleClearImpulse}
          touchControls={{
            moveX: 0,
            moveZ: 0,
            jump: touchTrigger.jump,
            dive: touchTrigger.dive,
          }}
          isVictory={isVictory}
        />
      </Canvas>

      <StumbleHUD
        currentHero={hero}
        onSelectHero={setHero}
        speedMode={speedMultiplier}
        onSelectSpeed={setSpeedMultiplier}
        jumpMode={jumpMultiplier}
        onSelectJump={setJumpMultiplier}
        theme={theme}
        onSelectTheme={setTheme}
        isVictory={isVictory}
        onRestart={handleRestart}
        onTouchJump={handleTouchJump}
        onTouchDive={handleTouchDive}
      />
    </div>
  );
};
