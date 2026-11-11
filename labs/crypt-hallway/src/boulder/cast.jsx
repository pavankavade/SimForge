// The boulder hallway's cast: the kit's ActorView for every track, plus the bodies Ep2 draws
// differently (the paladin skewered on the spiked ball with the kit's Splat, the party's bones
// in the cube with the Skeleton prop). One R3F root inside the hall's root group, so actors are
// authored in Ep2's frame exactly as in the episode. Drawn by the lab's own pipeline.
import * as THREE from "three/webgpu";
import { createRoot, extend, flushSync } from "@react-three/fiber";
import { ActorView, Splat, CHAR_SCALE, HIP } from "../../../../src/kit/actors";
import { Skeleton } from "../../../../src/artifacts/boulder/Skeleton";
import { convertRigMaterials } from "../rigNodes.js";
import { ROOT } from "./hall.js";

extend(THREE);

function Cast({ frame, tracks, extras, groupRef }) {
  return (
    <group ref={groupRef} position={ROOT.position} rotation={[0, ROOT.rotationY, 0]}>
      {tracks.map(({ id, classType, track, weapon }) => {
        const view = <ActorView key={id} classType={classType} actor={track} frame={frame} weapon={weapon} />;
        const a = track(frame);
        if (!a?.turn) return view;
        // `turn`: the whole body swung about its feet (a corpse lying across the hall)
        return (
          <group key={id} position={[a.position[0], 0, a.position[2]]} rotation={[0, a.turn, 0]}>
            <group position={[-a.position[0], 0, -a.position[2]]}>{view}</group>
          </group>
        );
      })}
      {extras.map((e) => {
        if (e.kind === "splat") {
          // rides the ball: spun with it, on the face that met the victim (the side towards the exit)
          return (
            <group key={e.id} position={e.center} rotation={[0, 0, e.angle]}>
              <group rotation={[0, -Math.PI / 2, 0]}>
                <Splat classType={e.classType} faceZ={e.faceZ} frame={frame} size={e.size} flat={e.flat} weapon={e.weapon} />
              </group>
            </group>
          );
        }
        if (e.kind === "skeleton") {
          return (
            <group key={e.id} position={e.position} rotation={[0, 0, e.tilt]}>
              <Skeleton variant={e.variant} position={[0, -HIP, 0]} rotation={[0, e.yaw, 0]} scale={CHAR_SCALE} animFrame={frame} />
            </group>
          );
        }
        return null;
      })}
    </group>
  );
}

// Returns draw(frame, tracks, extras): renders those characters into the lab's scene at that frame.
export async function mountBoulderCast({ renderer, scene, camera, size }) {
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
  const groupRef = { current: null };
  return (frame, tracks, extras = []) => {
    flushSync(() => root.render(<Cast frame={frame} tracks={tracks} extras={extras} groupRef={groupRef} />));
    const g = groupRef.current;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    convertRigMaterials(g, size[1], camera);
    g.traverse((o) => { if (o.isMesh && o.material.side === 1) o.castShadow = false; }); // ink hulls
  };
}
