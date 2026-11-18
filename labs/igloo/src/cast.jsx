// The episode cast (src/artifacts/characters/hero) acting inside the realistic snowfield, as in the
// crypt lab: an R3F root mounts the kit's ActorView into our own scene/renderer and never renders
// by itself; the lab's pipeline draws it.
import * as THREE from "three/webgpu";
import { createRoot, extend, flushSync } from "@react-three/fiber";
import { ActorView } from "../../../src/kit/actors";
import { convertRigMaterials } from "./rigNodes.js";
import { TRACKS } from "./anim.js";

extend(THREE); // <Canvas> normally does this

function Actors({ frame, groupRef }) {
  return (
    <group ref={groupRef}>
      {TRACKS.map(({ id, classType, track }) => (
        <ActorView key={id} classType={classType} actor={track} frame={frame} />
      ))}
    </group>
  );
}

// Returns pose(frame): renders every character on its narration-keyed track at that frame.
export async function mountFilm({ renderer, scene, camera, size, parent = scene }) {
  const root = createRoot(renderer.domElement);
  const keep = { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, shadow: renderer.shadowMap.type };
  await root.configure({
    gl: renderer, scene: parent, camera, frameloop: "never", events: undefined, dpr: 1,
    size: { width: size[0], height: size[1], top: 0, left: 0 },
  });
  // R3F applies its own defaults to the renderer; put the lab's grade back
  renderer.toneMapping = keep.toneMapping;
  renderer.toneMappingExposure = keep.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = keep.shadow;
  const groupRef = { current: null };
  // pose/face changes can add meshes, so convert and flag every frame (materials are cached)
  return (frame) => {
    flushSync(() => root.render(<Actors frame={frame} groupRef={groupRef} />));
    const g = groupRef.current;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    convertRigMaterials(g, size[1], camera);
    g.traverse((o) => { if (o.isMesh && o.material.side === 1) o.castShadow = false; });
  };
}
