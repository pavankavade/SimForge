import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AdventurerUnit, type AdventurerClass, type AdventurerPose } from "../artifacts/characters/hero";
import type { Expression } from "../artifacts/characters/hero/Face";
import type { Weapon } from "../artifacts/characters/hero/kits";
import { stumbleSfx } from "./stumbleSfx";

export interface StumblePlayerProps {
  heroClass: AdventurerClass;
  speedMultiplier: number;
  jumpMultiplier: number;
  onPositionUpdate: (pos: [number, number, number]) => void;
  externalImpulse: [number, number, number] | null;
  onClearImpulse: () => void;
  touchControls?: {
    moveX: number;
    moveZ: number;
    jump: boolean;
    dive: boolean;
  };
  isVictory: boolean;
}

export const StumblePlayer: React.FC<StumblePlayerProps> = ({
  heroClass,
  speedMultiplier,
  jumpMultiplier,
  onPositionUpdate,
  externalImpulse,
  onClearImpulse,
  touchControls,
  isVictory,
}) => {
  // Physical motion
  const posRef = useRef<[number, number, number]>([0, 2, 10]);
  const velRef = useRef<[number, number, number]>([0, 0, 0]);
  const yawRef = useRef<number>(Math.PI); // Face forward towards arena (-z)
  const isGroundedRef = useRef<boolean>(false);
  const isDivingRef = useRef<boolean>(false);
  const diveTimerRef = useRef<number>(0);
  const stumbleTimerRef = useRef<number>(0);

  // Animation rendering
  const [pose, setPose] = useState<AdventurerPose>("idle");
  const [expression, setExpression] = useState<Expression>("neutral");
  const [animFrame, setAnimFrame] = useState<number>(0);
  const [renderPos, setRenderPos] = useState<[number, number, number]>([0, 2, 10]);
  const [renderYaw, setRenderYaw] = useState<number>(Math.PI);

  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      // Jump
      if (e.code === "Space" && isGroundedRef.current && !isDivingRef.current) {
        velRef.current[1] = 11.5 * jumpMultiplier;
        isGroundedRef.current = false;
        stumbleSfx.jump();
      }

      // Dive / Slide (Shift or E or Enter)
      if (
        (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyE") &&
        diveTimerRef.current <= 0
      ) {
        isDivingRef.current = true;
        diveTimerRef.current = 0.55; // 0.55s dive slide
        // Launch forward in direction of facing yaw
        const diveSpeed = 14 * speedMultiplier;
        velRef.current[0] = Math.sin(yawRef.current) * diveSpeed;
        velRef.current[2] = Math.cos(yawRef.current) * diveSpeed;
        if (isGroundedRef.current) {
          velRef.current[1] = 4.0;
        }
        stumbleSfx.dive();
      }
    };

    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [jumpMultiplier, speedMultiplier]);

  // Handle touch buttons (jump / dive)
  useEffect(() => {
    if (touchControls?.jump && isGroundedRef.current && !isDivingRef.current) {
      velRef.current[1] = 11.5 * jumpMultiplier;
      isGroundedRef.current = false;
      stumbleSfx.jump();
    }
    if (touchControls?.dive && diveTimerRef.current <= 0) {
      isDivingRef.current = true;
      diveTimerRef.current = 0.55;
      const diveSpeed = 14 * speedMultiplier;
      velRef.current[0] = Math.sin(yawRef.current) * diveSpeed;
      velRef.current[2] = Math.cos(yawRef.current) * diveSpeed;
      if (isGroundedRef.current) velRef.current[1] = 4.0;
      stumbleSfx.dive();
    }
  }, [touchControls, jumpMultiplier, speedMultiplier]);

  // Apply external impulses (bounce pads, bumpers, sweeper arms)
  useEffect(() => {
    if (externalImpulse) {
      velRef.current[0] += externalImpulse[0];
      velRef.current[1] = externalImpulse[1];
      velRef.current[2] += externalImpulse[2];
      stumbleTimerRef.current = 0.45;
      onClearImpulse();
    }
  }, [externalImpulse, onClearImpulse]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (isVictory) {
      setPose("cheer");
      setExpression("happy");
      setAnimFrame((f) => f + 1.2);
      return;
    }

    // Direction calculation
    let inputX = 0;
    let inputZ = 0;
    const keys = keysRef.current;

    if (keys["KeyW"] || keys["ArrowUp"]) inputZ -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) inputZ += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) inputX -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) inputX += 1;

    if (touchControls && (touchControls.moveX !== 0 || touchControls.moveZ !== 0)) {
      inputX = touchControls.moveX;
      inputZ = touchControls.moveZ;
    }

    const isMoving = inputX !== 0 || inputZ !== 0;

    // Dive timer
    if (diveTimerRef.current > 0) {
      diveTimerRef.current -= dt;
      if (diveTimerRef.current <= 0) {
        isDivingRef.current = false;
      }
    }

    // Stumble timer (reaction to knockback)
    if (stumbleTimerRef.current > 0) {
      stumbleTimerRef.current -= dt;
    }

    // Horizontal movement handling
    const baseSpeed = 7.5 * speedMultiplier;
    if (isDivingRef.current) {
      // Retain dive velocity with gentle air/ground friction
      velRef.current[0] *= 0.94;
      velRef.current[2] *= 0.94;
    } else if (stumbleTimerRef.current > 0) {
      // Knockback decay
      velRef.current[0] *= 0.92;
      velRef.current[2] *= 0.92;
    } else if (isMoving) {
      const len = Math.hypot(inputX, inputZ);
      const nx = inputX / len;
      const nz = inputZ / len;

      velRef.current[0] = nx * baseSpeed;
      velRef.current[2] = nz * baseSpeed;

      // Turn hero to movement direction smoothly
      const targetYaw = Math.atan2(nx, nz);
      let diff = targetYaw - yawRef.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      yawRef.current += diff * Math.min(1, 16 * dt);
    } else {
      velRef.current[0] *= 0.7;
      velRef.current[2] *= 0.7;
    }

    // Gravity
    const GRAVITY = -28.0;
    velRef.current[1] += GRAVITY * dt;

    // Integrate position
    posRef.current[0] += velRef.current[0] * dt;
    posRef.current[1] += velRef.current[1] * dt;
    posRef.current[2] += velRef.current[2] * dt;

    // Platform surface checks (Multi-tier Stumble Guys platforms)
    const [px, py, pz] = posRef.current;
    let floorY = -999;

    // 1. Starting Platform (z from 4 to 14, x from -6 to 6)
    if (pz >= 3.5 && pz <= 14.5 && px >= -6.5 && px <= 6.5) {
      floorY = 0;
    }
    // 2. Center Sweeper Island (radius 7.5 around [0, 0, -4])
    else if (Math.hypot(px, pz - (-4)) <= 7.8) {
      floorY = 0;
    }
    // 3. Stepping Platforms & Bouncer Islands
    else if (Math.hypot(px - (-6), pz - (-14)) <= 3.2) {
      floorY = 0.5;
    } else if (Math.hypot(px - 6, pz - (-14)) <= 3.2) {
      floorY = 0.5;
    } else if (Math.hypot(px, pz - (-16)) <= 3.5) {
      floorY = 1.0;
    }
    // 4. Winner's Trophy Podium (around [0, 1.8, -24])
    else if (pz <= -21 && pz >= -27 && px >= -4.5 && px <= 4.5) {
      floorY = 1.8;
    }

    // Ground collision
    if (py <= floorY) {
      posRef.current[1] = floorY;
      velRef.current[1] = 0;
      isGroundedRef.current = true;
    } else {
      isGroundedRef.current = false;
    }

    // Void fall-off & respawn (Classic Stumble Guys respawn)
    if (posRef.current[1] < -10) {
      stumbleSfx.respawn();
      posRef.current = [0, 3, 10];
      velRef.current = [0, 0, 0];
      yawRef.current = Math.PI;
      isDivingRef.current = false;
      stumbleTimerRef.current = 0;
    }

    // Determine visual pose & expression
    if (stumbleTimerRef.current > 0) {
      setPose("sprawl");
      setExpression("pain");
    } else if (isDivingRef.current) {
      setPose("matrix");
      setExpression("shock");
    } else if (!isGroundedRef.current) {
      setPose(velRef.current[1] > 2 ? "jump" : "fall");
      setExpression("happy");
    } else if (isMoving) {
      setPose("run");
      setExpression("focus");
      setAnimFrame((f) => f + 1.4);
    } else {
      setPose("idle");
      setExpression("neutral");
      setAnimFrame((f) => f + 0.3);
    }

    setRenderPos([posRef.current[0], posRef.current[1], posRef.current[2]]);
    setRenderYaw(yawRef.current);
    onPositionUpdate(posRef.current);

    // Bouncy third-person camera
    const camTarget = new THREE.Vector3(
      posRef.current[0],
      Math.max(1, posRef.current[1]) + 4.6,
      posRef.current[2] + 7.8
    );
    state.camera.position.lerp(camTarget, 0.09);
    state.camera.lookAt(
      posRef.current[0],
      Math.max(0, posRef.current[1]) + 1.2,
      posRef.current[2] - 1
    );
  });

  // Weapon mapping based on class
  const weaponForClass: Partial<Record<AdventurerClass, Weapon>> = {
    paladin: "sword",
    rogue: "daggers",
    mage: "staff",
    goblin: "club",
  };

  return (
    <group position={renderPos} rotation={[0, renderYaw, 0]}>
      <AdventurerUnit
        classType={heroClass}
        scale={1.05}
        pose={pose}
        animFrame={Math.floor(animFrame)}
        weapon={weaponForClass[heroClass] ?? "sword"}
        expression={expression}
      />
    </group>
  );
};
