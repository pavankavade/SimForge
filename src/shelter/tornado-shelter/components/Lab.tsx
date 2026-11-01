import type React from "react";
import { Block, LP, Prism, matte, steel } from "../../../lowpoly";
import {
  FIRE,
  GAUGE,
  HIT3,
  LAYER_T,
  LOAD,
  MUZZLE_DX,
  PANEL_DX,
  TEST_LEN,
  TEST_Y,
  easeInOut,
  easeOutCubic,
  lerp,
  progress,
} from "../timeline";

const PANEL_T = LAYER_T[0] + LAYER_T[1] + LAYER_T[2];
/** The cannon-side face of the sample panel (steel faces the cannon). */
export const PANEL_FACE = PANEL_DX - PANEL_T / 2;
const BARREL = 2.0;
const BREECH = MUZZLE_DX - BARREL;

/** Board centre x and roll in lab coordinates (null = hidden inside the barrel). */
export const testBoard = (f: number): { x: number; y: number; roll: number } | null => {
  if (f < LOAD[0]) return null;
  if (f < LOAD[1]) return { x: lerp(BREECH - TEST_LEN, BREECH + TEST_LEN * 0.4, easeInOut(progress(f, LOAD))), y: TEST_Y, roll: 0 };
  if (f < FIRE) return null;
  if (f < HIT3) return { x: lerp(MUZZLE_DX - TEST_LEN / 2, PANEL_FACE - TEST_LEN / 2, progress(f, [FIRE, HIT3])), y: TEST_Y, roll: 0 };
  // Bounce: flung back, tumbling, down onto the floor.
  const t = f - HIT3;
  const land = 20;
  if (t < land) {
    const p = t / land;
    return { x: PANEL_FACE - TEST_LEN / 2 - 1.6 * easeOutCubic(p), y: lerp(TEST_Y, 0.08, p * p) + 0.5 * Math.sin(Math.PI * p), roll: 2.6 * p };
  }
  return { x: PANEL_FACE - TEST_LEN / 2 - 1.6, y: 0.08, roll: Math.PI };
};

/** Air cannon, pressure gauge, the panel on its stand and the test board. */
export const LabRig: React.FC<{ frame: number }> = ({ frame }) => {
  const needle = lerp(-2.1, 1.75, easeInOut(progress(frame, GAUGE)));
  const kick = frame >= FIRE && frame < FIRE + 8 ? 0.12 * (1 - (frame - FIRE) / 8) : 0;
  const board = testBoard(frame);
  return (
    <group>
      {/* Cannon: barrel on a tripod, air tank behind */}
      <group position={[-kick, 0, 0]}>
        <Prism r={0.2} h={BARREL} sides={10} position={[MUZZLE_DX - BARREL / 2, TEST_Y, 0]} rotation={[0, 0, Math.PI / 2]} material={steel("#6b7480")} />
        <Prism r={0.26} h={0.16} sides={10} position={[MUZZLE_DX - 0.08, TEST_Y, 0]} rotation={[0, 0, Math.PI / 2]} color={LP.hazard} />
        <Prism r={0.26} h={0.3} sides={10} position={[BREECH + 0.15, TEST_Y, 0]} rotation={[0, 0, Math.PI / 2]} color={LP.stoneDark} />
      </group>
      {[-0.45, 0.45].map((z) => (
        <Block key={z} size={[0.08, TEST_Y, 0.08]} position={[MUZZLE_DX - 1.3, TEST_Y / 2, z * 0.6]} rotation={[z, 0, 0]} color={LP.ink} />
      ))}
      <Prism r={0.38} h={1.1} sides={10} position={[BREECH - 0.4, 0.55, -0.8]} color={LP.red} />
      <Prism r={0.05} h={0.9} sides={6} position={[BREECH - 0.1, 0.9, -0.45]} rotation={[0.9, 0, 0.5]} color={LP.ink} />
      {/* Speed gauge on the back wall: the needle sweeps into the red */}
      <group position={[-0.8, 2.9, -4.05]}>
        <Prism r={0.62} h={0.1} sides={16} rotation={[Math.PI / 2, 0, 0]} color={LP.cream} />
        {Array.from({ length: 9 }, (_, i) => {
          const a = lerp(-2.1, 1.75, i / 8);
          return (
            <Block
              key={i}
              size={[0.06, 0.14, 0.03]}
              position={[Math.sin(a) * 0.48, Math.cos(a) * 0.48, 0.07]}
              rotation={[0, 0, -a]}
              color={i >= 7 ? LP.red : i >= 5 ? LP.hazard : "#5f7a4a"}
              castShadow={false}
            />
          );
        })}
        <group rotation={[0, 0, -needle]}>
          <Block size={[0.04, 0.46, 0.03]} position={[0, 0.2, 0.09]} color={LP.red} castShadow={false} />
        </group>
        <Prism r={0.06} h={0.05} sides={8} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} color={LP.ink} />
      </group>
      {/* The sample: plywood, plywood, steel, clamped on a stand */}
      <group position={[PANEL_DX, 0, 0]}>
        <Block size={[LAYER_T[2], 1.8, 1.3]} position={[-PANEL_T / 2 + LAYER_T[2] / 2, 1.1, 0]} material={steel()} bevel={0.015} />
        <Block size={[LAYER_T[1], 1.8, 1.3]} position={[-PANEL_T / 2 + LAYER_T[2] + LAYER_T[1] / 2, 1.1, 0]} color="#c9a066" bevel={0.015} />
        <Block size={[LAYER_T[0], 1.8, 1.3]} position={[PANEL_T / 2 - LAYER_T[0] / 2, 1.1, 0]} color="#d9b27a" bevel={0.015} />
        {[-0.75, 0.75].map((z) => (
          <group key={z}>
            <Block size={[0.5, 0.12, 0.16]} position={[0.1, 0.06, z]} color={LP.ink} />
            <Block size={[0.12, 2.05, 0.12]} position={[0.2, 1.05, z]} material={steel("#5f6a78")} />
          </group>
        ))}
      </group>
      {board && (
        <group position={[board.x, board.y, 0]} rotation={[0, 0, board.roll]}>
          <Block size={[TEST_LEN, 0.16, 0.1]} position={[0, 0, 0]} material={matte("#c99a5f")} bevel={0.02} />
        </group>
      )}
    </group>
  );
};
