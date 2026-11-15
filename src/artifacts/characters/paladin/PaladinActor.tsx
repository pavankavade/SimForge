// The realistic paladin in a Remotion video: drop <PaladinActor> into any <ThreeCanvas> scene
// (an episode's Scene, a lab composition) and drive him by frame.
//
//   <PaladinActor
//     character={CHARACTERS.garrick}                         // or any HumanSpec
//     equipment={{ helm: false }}                            // pieces to change from full plate
//     position={(f) => [walkX(f), 0, 0]}                     // feet, per frame
//     yaw={() => Math.PI / 2}                                // facing (0 = +Z), per frame
//     swings={[BEATS.cut, BEATS.cut + 9, BEATS.cut + 18]}   // a swing starts on each (three chain)
//     act={(f) => ({ block: f > BEATS.raise })}              // anything else the game's input has
//   />
//
// Remotion renders frames in any order, in several tabs at once, so nothing here may depend on
// the previous frame shown. The actor is a replay instead: the game's own animation, cloth and
// blade code stepped from frame 0 at a fixed rate, with input that is a pure function of the
// frame. Rendering forward only costs the new frames; jumping back replays from the start.
// Walking needs no input: the gait follows how fast `position` moves (in his own frame).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  ARMOR_SLOTS,
  DEFAULT_EQUIPMENT,
  FX_LAYER,
  createPaladin,
  type ArmorEquipment,
  type CombatWorld,
  type HumanSpec,
  type Paladin,
  type PaladinInput,
} from ".";

/** The base human in Remotion (the game serves the same file from /assets/characters/). */
export const paladinAssetUrl = (): string => staticFile("dungeon-explorer/assets/characters/human_male.glb");

type V3 = [number, number, number];

export interface PaladinActorProps {
  /** Who is under the armour (see CHARACTERS); defaults to Aldric. */
  character?: HumanSpec;
  /** Pieces worn, as changes from full plate (`{ helm: false }`), or a function of the frame. */
  equipment?: Partial<ArmorEquipment> | ((frame: number) => Partial<ArmorEquipment>);
  /** Where his feet are, per frame (world space of the actor's parent). */
  position?: (frame: number) => V3;
  /** Which way he faces, radians about +Y (0 faces +Z), per frame. */
  yaw?: (frame: number) => number;
  /** Frames on which a swing starts; up to three close together chain into the combo. */
  swings?: number[];
  /** Any other input, per frame (block, aimPitch, or moveX/moveZ to override the derived gait). */
  act?: (frame: number) => Partial<PaladinInput>;
  /** Height of the ground under him (m). */
  floorY?: number;
  /** Things his blade can strike or glance off (the game's CombatWorld; omit for none). */
  world?: CombatWorld;
  /** Simulation steps per video frame (cloth is steadier with 2). */
  substeps?: number;
  /** Environment reflections on his steel (the game uses 0.45 in the dungeon). */
  envIntensity?: number;
  /** Base human file (defaults to the one in public/dungeon-explorer). */
  assetUrl?: string;
}

const FULL: ArmorEquipment = { ...DEFAULT_EQUIPMENT };

export const PaladinActor: React.FC<PaladinActorProps> = ({
  character,
  equipment,
  position,
  yaw,
  swings,
  act,
  floorY = 0,
  world,
  substeps = 2,
  envIntensity = 0.7,
  assetUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { gl, camera, advance } = useThree();
  const [paladin, setPaladin] = useState<Paladin | null>(null);
  const [handle] = useState(() => delayRender("Loading the paladin"));
  const released = useRef(false);
  const simFrame = useRef(-1);
  const release = () => {
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  };

  // Build him (asynchronously: the base human is a file). A new character means a new build.
  const characterKey = JSON.stringify(character ?? null);
  useEffect(() => {
    let alive = true;
    let built: Paladin | null = null;
    createPaladin(gl, { character, assetUrl: assetUrl ?? paladinAssetUrl() })
      .then((p) => {
        if (!alive) {
          p.dispose();
          return;
        }
        built = p;
        p.materials.setEnvIntensity(envIntensity);
        simFrame.current = -1;
        setPaladin(p);
      })
      .catch((err: unknown) => cancelRender(err instanceof Error ? err : new Error(String(err))));
    return () => {
      alive = false;
      if (built) built.dispose();
    };
    // `character` is covered by its key; the env intensity is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, characterKey, assetUrl]);

  // Blade trails and sparks live on their own layer.
  useEffect(() => {
    camera.layers.enable(FX_LAYER);
  }, [camera]);

  // If he unmounts before loading, don't hold the render forever.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => release(), []);

  // Pose him for this frame before the canvas draws it.
  useLayoutEffect(() => {
    if (!paladin) return;
    const p = paladin;
    const at = (f: number): V3 => (position ? position(f) : [0, floorY, 0]);
    const face = (f: number): number => (yaw ? yaw(f) : 0);
    const wear = (f: number): ArmorEquipment => {
      const e = typeof equipment === "function" ? equipment(f) : equipment;
      return { ...FULL, ...(e || {}) };
    };
    const swingAt = new Set(swings || []);
    const dt = 1 / fps / substeps;

    // Going back in time: replay from the start.
    if (frame < simFrame.current) {
      p.reset();
      simFrame.current = -1;
    }
    for (let f = simFrame.current + 1; f <= frame; f++) {
      const e = wear(f);
      for (const s of ARMOR_SLOTS) if (p.equipment[s] !== e[s]) p.setEquipped(s, e[s]);
      const pos = at(f);
      const prev = at(Math.max(0, f - 1));
      const facing = face(f);
      const turn = (facing - face(Math.max(0, f - 1))) * fps;
      // Ground speed in his own frame (x toward his left, z forward), from the path.
      const vx = (pos[0] - prev[0]) * fps;
      const vz = (pos[2] - prev[2]) * fps;
      const s = Math.sin(facing);
      const c = Math.cos(facing);
      const input: PaladinInput = {
        moveX: vx * c - vz * s,
        moveZ: vx * s + vz * c,
        aimPitch: 0,
        turnRate: turn,
        air: Math.max(0, pos[1] - floorY),
        block: false,
        attack: swingAt.has(f),
        firstPerson: false,
        ...(act ? act(f) : {}),
      };
      p.group.position.set(pos[0], pos[1], pos[2]);
      p.group.rotation.y = facing;
      for (let k = 0; k < substeps; k++) {
        p.update(dt, k === 0 ? input : { ...input, attack: false }, floorY, world);
      }
    }
    simFrame.current = frame;
    if (!released.current) {
      // While rendering, <ThreeCanvas> only draws when the frame number changes, and that draw
      // happened before he finished loading: draw once more with him in it, then let it go.
      advance(performance.now());
      release();
    }
  });

  if (!paladin) return null;
  return (
    <>
      <primitive object={paladin.group} />
      <primitive object={paladin.fx} />
    </>
  );
};
