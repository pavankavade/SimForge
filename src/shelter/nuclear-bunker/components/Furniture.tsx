import type React from "react";
import { useSurface } from "../../../engine/materials";
import { makeWood } from "../../../engine/textures";
import { easeOutBack, progress } from "../../../kit/motion";
import { BEATS, DECK_Y } from "../timeline";

const pop = (frame: number, at: number) => easeOutBack(progress(frame, [at - 4, at + 8]), 1.6);

/**
 * Moving in, each thing on its word: crates of supplies, bunk beds, a shelf
 * of canned food, a crank radio on the crates, a board game on the floor.
 */
export const Furniture: React.FC<{ frame: number }> = ({ frame }) => {
  const crateWood = useSurface("nb-crate", () => makeWood({ base: "#b8874e", baseAlt: "#a8773e", planks: 4, seed: 12 }), [1, 1]);
  if (frame < BEATS.supplies - 6) return null;
  const crates: Array<[number, number, number]> = [
    [-1.3, 0, -1.0],
    [-1.3, 0, -1.65],
    [-1.3, 0, -2.3],
    [-1.3, 0.56, -1.0],
    [-1.3, 0.56, -1.65],
    [-1.3, 1.12, -1.3],
  ];
  const bunk = pop(frame, BEATS.beds);
  const cans = pop(frame, BEATS.food);
  const radio = pop(frame, BEATS.radio);
  const game = pop(frame, BEATS.game);
  return (
    <group position={[0, DECK_Y, 0]}>
      {crates.map(([x, y, z], i) => {
        const s = pop(frame, BEATS.supplies + i * 3);
        return s > 0 ? (
          <mesh key={i} position={[x, y + 0.27 * s, z]} scale={s} castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.54, 0.6]} />
            <meshStandardMaterial {...crateWood} roughness={0.85} />
          </mesh>
        ) : null;
      })}

      {/* Bunk beds along the right wall */}
      {bunk > 0 ? (
        <group position={[1.32, 0, -2.9]} scale={bunk}>
          {[0.45, 1.35].map((y) => (
            <group key={y} position={[0, y, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.8, 0.08, 1.9]} />
                <meshStandardMaterial color="#2f5a3a" metalness={0.3} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.72, 0.14, 1.8]} />
                <meshStandardMaterial color="#e8e6e0" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.18, -0.15]}>
                <boxGeometry args={[0.74, 0.05, 1.3]} />
                <meshStandardMaterial color="#3f6ea8" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.2, 0.72]}>
                <boxGeometry args={[0.5, 0.1, 0.28]} />
                <meshStandardMaterial color="#fbfaf4" roughness={0.9} />
              </mesh>
            </group>
          ))}
          {[-0.36, 0.36].map((x) =>
            [-0.92, 0.92].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.85, z]}>
                <boxGeometry args={[0.05, 1.7, 0.05]} />
                <meshStandardMaterial color="#2f5a3a" metalness={0.3} roughness={0.5} />
              </mesh>
            )),
          )}
        </group>
      ) : null}

      {/* Shelf of canned food at the back */}
      {cans > 0 ? (
        <group position={[-0.25, 2.3, -4.55]} scale={cans}>
          {[0, 0.5].map((y) => (
            <group key={y} position={[0, y, 0]}>
              <mesh>
                <boxGeometry args={[1.6, 0.05, 0.4]} />
                <meshStandardMaterial color="#8a6a44" roughness={0.8} />
              </mesh>
              {Array.from({ length: 7 }, (_, i) => (
                <mesh key={i} position={[-0.66 + i * 0.22, 0.13, 0.05]} castShadow>
                  <cylinderGeometry args={[0.08, 0.08, 0.2, 14]} />
                  <meshStandardMaterial color={["#d23a2e", "#f2c14e", "#3f78c4", "#3aa67c"][(i + (y ? 2 : 0)) % 4]} metalness={0.3} roughness={0.4} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ) : null}

      {/* Crank radio on top of the crates */}
      {radio > 0 ? (
        <group position={[-1.3, 1.68 + 0.1, -1.3]} scale={radio}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.3, 0.26]} />
            <meshStandardMaterial color="#c4463a" roughness={0.5} />
          </mesh>
          <mesh position={[0.12, 0, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 18]} />
            <meshStandardMaterial color="#2b2f36" />
          </mesh>
          <mesh position={[-0.12, 0.04, 0.135]}>
            <boxGeometry args={[0.16, 0.08, 0.01]} />
            <meshStandardMaterial color="#f2e6b0" />
          </mesh>
          <mesh position={[0.1, 0.32, 0]} rotation={[0, 0, -0.3]}>
            <cylinderGeometry args={[0.01, 0.01, 0.45, 6]} />
            <meshStandardMaterial color="#9aa1aa" metalness={0.7} />
          </mesh>
          <group position={[0.27, 0, 0]} rotation={[frame * 0.3, 0, 0]}>
            <mesh position={[0.02, 0.08, 0]}>
              <boxGeometry args={[0.03, 0.16, 0.03]} />
              <meshStandardMaterial color="#2b2f36" />
            </mesh>
          </group>
        </group>
      ) : null}

      {/* A very long board game on the floor */}
      {game > 0 ? (
        <group position={[0.05, 0.02, -0.55]} scale={game}>
          <mesh receiveShadow>
            <boxGeometry args={[1.5, 0.03, 0.55]} />
            <meshStandardMaterial color="#f5efe0" roughness={0.8} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} position={[-0.66 + i * 0.12, 0.02, 0]}>
              <boxGeometry args={[0.1, 0.01, 0.4]} />
              <meshStandardMaterial color={["#d23a2e", "#f2c14e", "#3f78c4", "#3aa67c"][i % 4]} />
            </mesh>
          ))}
          {[-0.4, 0.2, 0.55].map((x, i) => (
            <mesh key={x} position={[x, 0.08, 0.05 * (i - 1)]}>
              <coneGeometry args={[0.04, 0.12, 10]} />
              <meshStandardMaterial color={["#2b2f36", "#c4463a", "#3f6ea8"][i]} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
};
