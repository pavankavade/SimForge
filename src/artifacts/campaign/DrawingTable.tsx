import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { useSurface } from "../../engine/materials";
import { makeWood } from "../../engine/textures";
import { GlowSprite } from "../dungeon/Fx";

/** Blueprint: the antechamber with its four doors, the core below, trap doodles and the next idea. */
const makeBlueprintTexture = () => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#1d4f8f";
  ctx.fillRect(0, 0, 1024, 600);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  for (let x = 0; x < 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 0; y < 600; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#e8f2ff";
  ctx.lineWidth = 5;
  // Antechamber with four doors, a hallway off each, and the core room below.
  ctx.strokeRect(160, 200, 520, 120);
  [220, 340, 460, 580].forEach((x, i) => {
    ctx.strokeRect(x, 200, 40, 60);
    ctx.beginPath();
    ctx.moveTo(x + 20, 200);
    ctx.lineTo(x + 20 + (i - 1.5) * 60, 70);
    ctx.stroke();
    ctx.strokeRect(x + (i - 1.5) * 60 - 20, 30, 80, 40);
  });
  ctx.strokeRect(220, 400, 400, 130);
  ctx.beginPath();
  ctx.arc(420, 465, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "bold 28px 'Segoe Print', 'Comic Sans MS', cursive";
  ctx.fillStyle = "#e8f2ff";
  ctx.fillText("CORE", 385, 520);
  // Doodles and the next idea.
  ctx.beginPath();
  ctx.arc(820, 150, 32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "bold 150px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = "#ffd84d";
  ctx.fillText("?", 840, 400);
  ctx.font = "bold 40px 'Segoe Print', 'Comic Sans MS', cursive";
  ctx.fillStyle = "#e8f2ff";
  ctx.fillText("ANTI-DRAGON v1", 650, 560);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** Floor two: a sketch of floor one on top, a dig arrow down, and the new hub with five doors. */
const makeFloorTwoTexture = () => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#1d4f8f";
  ctx.fillRect(0, 0, 1024, 600);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  for (let x = 0; x < 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 0; y < 600; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(232,242,255,0.55)";
  ctx.lineWidth = 4;
  ctx.strokeRect(120, 40, 520, 110);
  ctx.font = "bold 30px 'Segoe Print', 'Comic Sans MS', cursive";
  ctx.fillStyle = "rgba(232,242,255,0.7)";
  ctx.fillText("FLOOR 1", 150, 105);
  // Dig arrow.
  ctx.strokeStyle = "#ffd84d";
  ctx.fillStyle = "#ffd84d";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(380, 165);
  ctx.lineTo(380, 255);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(350, 245);
  ctx.lineTo(410, 245);
  ctx.lineTo(380, 285);
  ctx.closePath();
  ctx.fill();
  // Floor two: the hub with five numbered doors.
  ctx.strokeStyle = "#e8f2ff";
  ctx.lineWidth = 6;
  ctx.strokeRect(80, 300, 840, 220);
  ["I", "II", "III", "IV", "V"].forEach((n, i) => {
    const x = 140 + i * 160;
    ctx.strokeRect(x, 360, 80, 120);
    ctx.font = "bold 34px Georgia, serif";
    ctx.fillStyle = "#e8f2ff";
    ctx.fillText(n, x + 40 - ctx.measureText(n).width / 2, 345);
  });
  ctx.font = "bold 46px 'Segoe Print', 'Comic Sans MS', cursive";
  ctx.fillStyle = "#ffd84d";
  ctx.fillText("FLOOR 2", 700, 110);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** The keeper's drafting table with the dungeon blueprint and a candle (`sheet` picks floor one or two). */
export const DrawingTable: React.FC<{ position: Vec3; rotationY?: number; sheet?: "floor1" | "floor2" }> = ({ position, rotationY = 0, sheet = "floor1" }) => {
  const wood = useSurface("xs-table", () => makeWood({ planks: 5, base: "#5a3a20", baseAlt: "#6a4628", seam: "#1e130a", seed: 161 }), [1, 1]);
  const blueprint = useMemo(() => (sheet === "floor2" ? makeFloorTwoTexture() : makeBlueprintTexture()), [sheet]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.0, 0]} rotation={[0.35, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.12, 1.7]} />
        <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} color="#caa47c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.075, 0.02]} rotation={[0.35 - Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 1.45]} />
        <meshStandardMaterial map={blueprint ?? undefined} roughness={0.9} />
      </mesh>
      {[-1.2, 1.2].map((dx) => (
        <mesh key={dx} position={[dx, 0.5, 0]} castShadow>
          <boxGeometry args={[0.14, 1.0, 0.14]} />
          <meshStandardMaterial map={wood.map} color="#a8845e" roughness={0.85} />
        </mesh>
      ))}
      {/* Rolled plans and a quill */}
      <mesh position={[-1.05, 1.3, -0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.7, 10]} />
        <meshStandardMaterial color="#e9dcc0" roughness={0.9} />
      </mesh>
      <mesh position={[1.05, 1.32, -0.35]}>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
        <meshStandardMaterial color="#efe4c8" roughness={0.7} />
      </mesh>
      <GlowSprite position={[1.05, 1.55, -0.35]} color="#ffb04a" size={1.0} opacity={0.8} />
      <pointLight position={[1.0, 1.8, 0.4]} color="#ffb26b" intensity={2.4} distance={6} decay={2} />
    </group>
  );
};
