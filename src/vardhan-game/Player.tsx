import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AdventurerUnit, type AdventurerClass, type AdventurerPose } from "../artifacts/characters/hero";
import type { Expression } from "../artifacts/characters/hero/Face";
import type { Weapon } from "../artifacts/characters/hero/kits";
import { GAME_CONFIG } from "./gameConfig";
import { sfx } from "./sfx";

interface PlayerProps {
  heroClass?: AdventurerClass;
  weapon?: Weapon;
  scale?: number;
  onPositionUpdate: (pos: [number, number, number]) => void;
  onAttack: (pos: [number, number, number]) => void;
  isHurt: boolean;
  isVictorious: boolean;
  isGameOver: boolean;
}

export const Player: React.FC<PlayerProps> = ({
  heroClass = GAME_CONFIG.player.heroClass,
  weapon = GAME_CONFIG.player.weapon,
  scale = GAME_CONFIG.player.scale,
  onPositionUpdate,
  onAttack,
  isHurt,
  isVictorious,
  isGameOver,
}) => {
  // Player physical state
  const posRef = useRef<[number, number, number]>([0, 0, 4]);
  const velYRef = useRef<number>(0);
  const yawRef = useRef<number>(0);
  const isGroundedRef = useRef<boolean>(true);
  const attackTimerRef = useRef<number>(0);

  // Visual pose & frame state
  const [pose, setPose] = useState<AdventurerPose>("idle");
  const [expression, setExpression] = useState<Expression>("neutral");
  const [animFrame, setAnimFrame] = useState<number>(0);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 4]);
  const [playerYaw, setPlayerYaw] = useState<number>(0);

  // Keyboard input state
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      // Jump
      if (e.code === "Space" && isGroundedRef.current && !isGameOver && !isVictorious) {
        velYRef.current = GAME_CONFIG.player.jumpForce;
        isGroundedRef.current = false;
        sfx.jump();
      }

      // Attack
      if ((e.code === "KeyE" || e.code === "KeyF" || e.code === "Enter") && attackTimerRef.current <= 0) {
        attackTimerRef.current = 0.35; // 0.35s attack swing
        sfx.attack();
        onAttack(posRef.current);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handlePointerDown = () => {
      if (attackTimerRef.current <= 0 && !isGameOver && !isVictorious) {
        attackTimerRef.current = 0.35;
        sfx.attack();
        onAttack(posRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isGameOver, isVictorious, onAttack]);

  // Main game loop update per frame
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05); // prevent huge delta spikes

    if (isGameOver) {
      setPose("sprawl");
      setExpression("dead");
      return;
    }

    if (isVictorious) {
      setPose("cheer");
      setExpression("happy");
      setAnimFrame((f) => f + 1);
      return;
    }

    // Input direction
    let moveX = 0;
    let moveZ = 0;
    const keys = keysRef.current;

    if (keys["KeyW"] || keys["ArrowUp"]) moveZ -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) moveZ += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) moveX -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;

    // Movement calculation
    if (isMoving) {
      // Normalize diagonal speed
      const len = Math.hypot(moveX, moveZ);
      const nx = moveX / len;
      const nz = moveZ / len;

      const speed = GAME_CONFIG.player.walkSpeed;
      posRef.current[0] += nx * speed * dt;
      posRef.current[2] += nz * speed * dt;

      // Turn hero smoothly toward movement direction
      const targetYaw = Math.atan2(nx, nz);
      // Smooth angle interpolation
      let diff = targetYaw - yawRef.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      yawRef.current += diff * Math.min(1, 15 * dt);
    }

    // Arena boundary clamp
    const limit = GAME_CONFIG.world.arenaSize / 2 - 1.2;
    posRef.current[0] = Math.max(-limit, Math.min(limit, posRef.current[0]));
    posRef.current[2] = Math.max(-limit, Math.min(limit, posRef.current[2]));

    // Gravity and jump
    const GRAVITY = -26.0;
    velYRef.current += GRAVITY * dt;
    posRef.current[1] += velYRef.current * dt;

    if (posRef.current[1] <= 0) {
      posRef.current[1] = 0;
      velYRef.current = 0;
      isGroundedRef.current = true;
    }

    // Attack cooldown
    if (attackTimerRef.current > 0) {
      attackTimerRef.current -= dt;
    }

    // Determine current pose & expression
    if (isHurt) {
      setPose("cower");
      setExpression("pain");
    } else if (attackTimerRef.current > 0) {
      setPose("smash");
      setExpression("angry");
    } else if (!isGroundedRef.current) {
      setPose(velYRef.current > 0 ? "jump" : "fall");
      setExpression("happy");
    } else if (isMoving) {
      setPose("run");
      setExpression("focus");
      setAnimFrame((f) => f + 1.2);
    } else {
      setPose("idle");
      setExpression("neutral");
      setAnimFrame((f) => f + 0.3);
    }

    // Sync state for rendering
    setPlayerPos([posRef.current[0], posRef.current[1], posRef.current[2]]);
    setPlayerYaw(yawRef.current);
    onPositionUpdate(posRef.current);

    // Smooth Third-Person Camera Follow
    const [px, py, pz] = posRef.current;
    const targetCamPos = new THREE.Vector3(px, py + 4.8, pz + 8.2);
    state.camera.position.lerp(targetCamPos, 0.08);
    state.camera.lookAt(px, py + 1.2, pz);
  });

  return (
    <group position={playerPos} rotation={[0, playerYaw, 0]}>
      <AdventurerUnit
        classType={heroClass}
        scale={scale}
        pose={pose}
        animFrame={Math.floor(animFrame)}
        weapon={weapon}
        expression={expression}
      />
    </group>
  );
};
