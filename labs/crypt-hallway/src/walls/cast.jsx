// The crushing room's cast: the kit's ActorView for every track, with two world-space wrappers the
// room needs: `turn` swings the whole body about its feet (bodies lying along the hall), and `wsx`
// squeezes it along world x about its feet (between the walls), outside the turn, so a body facing
// the camera gets thinner however it is turned. Extras: the kit's Skeleton (the electrocution flash).
import * as THREE from "three/webgpu";
import { createRoot, extend, flushSync } from "@react-three/fiber";
import { ActorView, CHAR_SCALE, HIP } from "../../../../src/kit/actors";
import { Skeleton } from "../../../../src/artifacts/boulder/Skeleton";
import { convertRigMaterials } from "../rigNodes.js";

extend(THREE);

function Cast({ frame, tracks, extras, groupRef }) {
  return (
    <group ref={groupRef}>
      {tracks.map(({ id, classType, track, weapon }) => {
        const a = track(frame);
        if (!a) return null;
        const view = <ActorView classType={classType} actor={track} frame={frame} weapon={a.weapon ?? weapon} />;
        const [px, , pz] = a.position;
        return (
          <group key={id} position={[px, 0, pz]} scale={[a.wsx ?? 1, 1, 1]}>
            <group rotation={[0, a.turn ?? 0, 0]}>
              <group position={[-px, 0, -pz]}>{view}</group>
            </group>
          </group>
        );
      })}
      {extras.map((e) => {
        if (e.kind === "skeleton") {
          return (
            <group key={e.id} position={e.position} scale={[e.wsx ?? 1, 1, 1]}>
              <Skeleton variant={e.variant} position={[0, -HIP + HIP, 0]} rotation={[0, e.yaw, 0]} scale={CHAR_SCALE * (e.scale ?? 1)} animFrame={frame} />
            </group>
          );
        }
        return null;
      })}
    </group>
  );
}

// Returns draw(frame, tracks, extras): renders those characters into the lab's scene at that frame.
export async function mountCast({ renderer, scene, camera, size }) {
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
  return (frame, tracks, extras = []) => {
    flushSync(() => root.render(<Cast frame={frame} tracks={tracks} extras={extras} groupRef={groupRef} />));
    const g = groupRef.current;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    convertRigMaterials(g, size[1], camera);
    g.traverse((o) => { if (o.isMesh && o.material.side === 1) o.castShadow = false; }); // ink hulls
  };
}
