import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { FpsEnemy } from "./FpsEnemies";
import { fpsSfx } from "./fpsSfx";
import { GunViewModel } from "./GunViewModel";
import type { WeaponSpec } from "./weapons";

interface FpsPlayerProps {
  weapon: WeaponSpec;
  ammo: number;
  maxAmmo: number;
  onShoot: () => void;
  onReload: () => void;
  onHitmarker: (isHeadshot: boolean) => void;
  enemies: FpsEnemy[];
  onDamageEnemy: (enemyId: number, damage: number, isHeadshot: boolean) => void;
  isGameOver: boolean;
  onPlayerPosition: (pos: [number, number, number]) => void;
  onPlayerYaw?: (yaw: number) => void;
}

export const FpsPlayer: React.FC<FpsPlayerProps> = ({
  weapon,
  ammo,
  onShoot,
  onReload,
  onHitmarker,
  enemies,
  onDamageEnemy,
  isGameOver,
  onPlayerPosition,
  onPlayerYaw,
}) => {
  const { camera, gl } = useThree();

  // Position & Velocity
  const posRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.6, 16));
  const velRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isGroundedRef = useRef<boolean>(true);

  // Rotation angles (radians) — 0 faces -Z towards arena and bots
  const yawRef = useRef<number>(0);
  const pitchRef = useRef<number>(0);

  // Shooting & Dragging states
  const isMouseDownRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const nextFireTimeRef = useRef<number>(0);
  const fireShotRef = useRef<() => void>(() => {});
  const [isFiringVisual, setIsFiringVisual] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isScoped, setIsScoped] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const isMovingRef = useRef<boolean>(false);

  // Key tracking
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const startReload = useCallback(() => {
    setIsReloading(true);
    fpsSfx.reload();
    setTimeout(() => {
      setIsReloading(false);
      onReload();
    }, weapon.reloadTime * 1000);
  }, [onReload, weapon.reloadTime]);

  // Pointer lock & Mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isLocked = document.pointerLockElement === gl.domElement;
      if (!isLocked && !isDraggingRef.current) return;
      const sens = isScoped ? 0.0012 : 0.0024;
      yawRef.current -= e.movementX * sens;
      pitchRef.current -= e.movementY * sens;
      pitchRef.current = Math.max(-1.45, Math.min(1.45, pitchRef.current));
    };

    const handleCanvasClick = () => {
      try {
        if (document.pointerLockElement !== gl.domElement && gl.domElement.requestPointerLock) {
          gl.domElement.requestPointerLock();
        }
      } catch {
        // Pointer lock might be restricted in webviews/iframes
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      if (e.button === 0) {
        isMouseDownRef.current = true;
      }
      if (e.button === 2) {
        // Right click: Scope with AWP or zoom
        e.preventDefault();
        setIsScoped((s) => !s);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      isDraggingRef.current = false;
      if (e.button === 0) {
        isMouseDownRef.current = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      // Shoot with F or Enter key
      if ((e.code === "KeyF" || e.code === "Enter") && !isGameOver) {
        fireShotRef.current();
      }

      // Jump
      if (e.code === "Space" && isGroundedRef.current && !isGameOver) {
        velRef.current.y = 8.5;
        isGroundedRef.current = false;
      }

      // Reload
      if (e.code === "KeyR" && !isReloading && ammo < weapon.magSize) {
        startReload();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    gl.domElement.addEventListener("click", handleCanvasClick);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      gl.domElement.removeEventListener("click", handleCanvasClick);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gl, isScoped, isReloading, ammo, weapon, isGameOver, startReload]);

  // Perform Raycast Shot
  const fireShot = () => {
    if (ammo <= 0) {
      startReload();
      return;
    }

    onShoot();
    setIsFiringVisual(true);
    setTimeout(() => setIsFiringVisual(false), 70);

    // Play weapon sound
    if (weapon.category === "pistol") fpsSfx.pistol();
    else if (weapon.category === "smg") fpsSfx.smg();
    else if (weapon.category === "rifle") fpsSfx.rifle();
    else if (weapon.category === "sniper") fpsSfx.sniper();
    else if (weapon.category === "knife") fpsSfx.knife();

    // Raycast from camera center into world
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Check hit against each alive enemy
    let closestHit: { enemyId: number; damage: number; isHeadshot: boolean; dist: number } | null = null;

    enemies.forEach((enemy) => {
      if (!enemy.isAlive) return;

      const botPos = new THREE.Vector3(...enemy.pos);
      // Head sphere (center y = 1.45, radius 0.28)
      const headCenter = new THREE.Vector3(botPos.x, botPos.y + 1.45, botPos.z);
      // Body capsule / cylinder (center y = 0.7, radius 0.42, height 1.2)
      const bodyCenter = new THREE.Vector3(botPos.x, botPos.y + 0.7, botPos.z);

      // Distance from ray to head
      const ray = raycaster.ray;
      const headDist = ray.distanceToPoint(headCenter);
      const bodyDist = ray.distanceToPoint(bodyCenter);
      const camDist = camera.position.distanceTo(botPos);

      // Only hit if enemy is in front of camera
      const toBot = headCenter.clone().sub(camera.position);
      if (toBot.dot(ray.direction) > 0) {
        if (headDist < 0.35) {
          // Headshot!
          const dmg = Math.round(weapon.damage * weapon.headshotMultiplier);
          if (!closestHit || camDist < closestHit.dist) {
            closestHit = { enemyId: enemy.id, damage: dmg, isHeadshot: true, dist: camDist };
          }
        } else if (bodyDist < 0.52) {
          // Body Hit!
          const dmg = weapon.damage;
          if (!closestHit || camDist < closestHit.dist) {
            closestHit = { enemyId: enemy.id, damage: dmg, isHeadshot: false, dist: camDist };
          }
        }
      }
    });

    if (closestHit) {
      const hit = closestHit as { enemyId: number; damage: number; isHeadshot: boolean; dist: number };
      if (hit.isHeadshot) {
        fpsSfx.headshot();
        onHitmarker(true);
      } else {
        fpsSfx.hitmarker();
        onHitmarker(false);
      }
      onDamageEnemy(hit.enemyId, hit.damage, hit.isHeadshot);
    }
  };

  fireShotRef.current = fireShot;

  // Main per-frame update loop
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = state.clock.getElapsedTime();

    if (isGameOver) return;

    // Keyboard Arrow Keys camera rotation (keyboard aiming fallback)
    const keys = keysRef.current;
    const turnSpeed = 2.4;
    if (keys["ArrowLeft"]) yawRef.current += turnSpeed * dt;
    if (keys["ArrowRight"]) yawRef.current -= turnSpeed * dt;
    if (keys["ArrowUp"]) pitchRef.current = Math.min(1.45, pitchRef.current + turnSpeed * 0.7 * dt);
    if (keys["ArrowDown"]) pitchRef.current = Math.max(-1.45, pitchRef.current - turnSpeed * 0.7 * dt);

    // Camera rotation
    camera.rotation.order = "YXZ";
    camera.rotation.y = yawRef.current;
    camera.rotation.x = pitchRef.current;

    // Dynamic FOV for Scoping
    const persCam = camera as THREE.PerspectiveCamera;
    if (weapon.category === "sniper" && isScoped) {
      persCam.fov = THREE.MathUtils.lerp(persCam.fov, 22, dt * 18);
    } else {
      persCam.fov = THREE.MathUtils.lerp(persCam.fov, 74, dt * 18);
    }
    persCam.updateProjectionMatrix();

    // Shooting handling
    if (isMouseDownRef.current && !isReloading && now >= nextFireTimeRef.current) {
      nextFireTimeRef.current = now + 1.0 / weapon.fireRate;
      fireShot();
      if (!weapon.isAutomatic) {
        isMouseDownRef.current = false; // Semi-auto tap requirement
      }
    }

    // Keyboard Movement
    let forward = 0;
    let strafe = 0;

    if (keys["KeyW"]) forward += 1;
    if (keys["KeyS"]) forward -= 1;
    if (keys["KeyA"]) strafe -= 1;
    if (keys["KeyD"]) strafe += 1;

    const moveSpeed = keys["ShiftLeft"] ? 3.5 : 7.2;

    // Movement direction relative to camera yaw
    const forwardX = -Math.sin(yawRef.current);
    const forwardZ = -Math.cos(yawRef.current);
    const rightX = Math.cos(yawRef.current);
    const rightZ = -Math.sin(yawRef.current);

    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe);
      const nx = forward / len;
      const nz = strafe / len;

      const dirX = nx * forwardX + nz * rightX;
      const dirZ = nx * forwardZ + nz * rightZ;

      velRef.current.x = dirX * moveSpeed;
      velRef.current.z = dirZ * moveSpeed;
    } else {
      velRef.current.x *= 0.75;
      velRef.current.z *= 0.75;
    }

    // Gravity
    velRef.current.y -= 24.0 * dt;

    // Update position
    posRef.current.x += velRef.current.x * dt;
    posRef.current.y += velRef.current.y * dt;
    posRef.current.z += velRef.current.z * dt;

    // Ground floor collision (y = 1.6 standing eye height)
    if (posRef.current.y <= 1.6) {
      posRef.current.y = 1.6;
      velRef.current.y = 0;
      isGroundedRef.current = true;
    }

    // Boundary clamp inside arena
    posRef.current.x = Math.max(-17, Math.min(17, posRef.current.x));
    posRef.current.z = Math.max(-23, Math.min(23, posRef.current.z));

    // Update isMoving state for viewmodel walking bob
    const moving = Math.hypot(velRef.current.x, velRef.current.z) > 0.6;
    if (moving !== isMovingRef.current) {
      isMovingRef.current = moving;
      setIsMoving(moving);
    }

    camera.position.copy(posRef.current);
    onPlayerPosition([posRef.current.x, posRef.current.y, posRef.current.z]);
    onPlayerYaw?.(yawRef.current);
  });

  return (
    <group>
      {/* 3D First Person Gun Viewmodel attached to the camera */}
      <primitive object={camera}>
        <GunViewModel
          weapon={weapon}
          isFiring={isFiringVisual}
          isReloading={isReloading}
          isScoped={isScoped}
          isMoving={isMoving}
        />
      </primitive>
    </group>
  );
};
