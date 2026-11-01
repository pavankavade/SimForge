// Style test: the episode cast (src/artifacts/characters/hero) acting inside the realistic hall.
// An R3F root mounts the rig into our own scene/renderer and never renders by itself; the lab's
// pipeline draws it. Shots are picked with ?shot=fall|leap.
import * as THREE from "three/webgpu";
import { createRoot, extend, flushSync } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { AdventurerUnit } from "../../../src/artifacts/characters/hero/AdventurerUnit";
import { CHAR_SCALE_VALUE, FACE_CAMERA, FACE_RIGHT } from "./castConsts.js";
import { convertRigMaterials } from "./rigNodes.js";
import { ActorView } from "../../../src/kit/actors";
import { TRACKS, PIT as FILM_PIT } from "./anim.js";

extend(THREE); // <Canvas> normally does this

export const PIT = { ...FILM_PIT, s: 12.4 };

// Each shot: who is where, and the camera that frames them (portrait).
export const SHOTS = {
  // l1a: the goblin drops into the pit, the sunbeam behind him
  fall: {
    camera: { s: 8.3, x: 0.55, y: 2.35, yaw: 0.12, pitch: -0.3, fov: 50 },
    cast: [
      { classType: "goblin", pose: "fall", expression: "scared", position: [0.05, -0.85, -PIT.s], rotation: [-0.3, FACE_CAMERA - 0.25, 0.15], animFrame: 4 },
    ],
  },
  // l1b: goblin dead on the spikes, the rogue leaps the gap towards camera, backlit by the beam
  leap: {
    camera: { s: 8.2, x: -0.6, y: 1.85, yaw: -0.1, pitch: -0.14, fov: 50 },
    cast: [
      { classType: "goblin", pose: "sprawl", expression: "dead", position: [0.15, -PIT.depth + 0.5, -PIT.s], rotation: [-1.3, 0.5, 0.1], animFrame: 0 },
      { classType: "rogue", pose: "jump", expression: "focus", position: [-0.1, 0.95, -(PIT.s - 0.1)], rotation: [-0.15, FACE_CAMERA - 0.4, 0.05], animFrame: 6 },
    ],
  },
};

function Cast({ actors, onReady }) {
  const ref = useRef(null);
  useLayoutEffect(() => { onReady(ref.current); }, [onReady]);
  return (
    <group ref={ref}>
      {actors.map((a, i) => (
        <AdventurerUnit key={i} {...a} scale={CHAR_SCALE_VALUE} />
      ))}
    </group>
  );
}

export async function mountCast({ renderer, scene, camera, shot, size }) {
  const root = createRoot(renderer.domElement);
  const keep = { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, shadow: renderer.shadowMap.type };
  await root.configure({
    gl: renderer, scene, camera, frameloop: "never", events: undefined, dpr: 1,
    size: { width: size[0], height: size[1], top: 0, left: 0 },
  });
  // R3F applies its own defaults to the renderer; put the lab's grade back
  renderer.toneMapping = keep.toneMapping;
  renderer.toneMappingExposure = keep.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = keep.shadow;
  return new Promise((resolve) => {
    root.render(
      <Cast
        actors={SHOTS[shot].cast}
        onReady={(group) => {
          group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          convertRigMaterials(group, size[1], camera);
          // ink hulls shouldn't cast their own shadow or reflect
          group.traverse((o) => { if (o.isMesh && o.material.side === 1) o.castShadow = false; });
          resolve(group);
        }}
      />,
    );
  });
}

// --- film and game: the kit's own ActorView, handed each character's track (frame -> Actor), so
// pose switches, facing snaps and landings ease exactly as in an episode
function Actors({ tracks, frame, groupRef }) {
  return (
    <group ref={groupRef}>
      {tracks.map(({ id, classType, track }) => (
        <ActorView key={id} classType={classType} actor={track} frame={frame} />
      ))}
    </group>
  );
}

// Returns draw(frame, tracks): renders those characters into the lab's scene at that frame.
export async function mountTracks({ renderer, scene, camera, size }) {
  const root = createRoot(renderer.domElement);
  const keep = { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, shadow: renderer.shadowMap.type };
  await root.configure({
    gl: renderer, scene, camera, frameloop: "never", events: undefined, dpr: 1,
    size: { width: size[0], height: size[1], top: 0, left: 0 },
  });
  renderer.toneMapping = keep.toneMapping;
  renderer.toneMappingExposure = keep.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = keep.shadow;
  const groupRef = { current: null };
  // pose/face changes can add meshes, so convert and flag every frame (materials are cached)
  return (frame, tracks) => {
    flushSync(() => root.render(<Actors tracks={tracks} frame={frame} groupRef={groupRef} />));
    const g = groupRef.current;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    convertRigMaterials(g, size[1], camera);
    g.traverse((o) => { if (o.isMesh && o.material.side === 1) o.castShadow = false; });
  };
}

// film mode (anim.js): the whole cast on its narration-keyed tracks
export async function mountFilm(opts) {
  const draw = await mountTracks(opts);
  return (frame) => draw(frame, TRACKS);
}
