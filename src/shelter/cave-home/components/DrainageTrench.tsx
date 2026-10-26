import React, { useMemo } from "react";
import * as THREE from "three";
import { drainageKinematics, DRIP_X, DRIP_Z, WALL_X } from "../timeline";

interface DrainageTrenchProps {
  frame: number;
}

export const DrainageTrench: React.FC<DrainageTrenchProps> = ({ frame }) => {
  const { dripping, puddleRadius, trenchProgress, waterFlowing } = drainageKinematics(frame);

  // Droplet cycle (every 22 frames)
  const dropCycle = (frame % 22) / 22;
  const dropY = 3.2 - dropCycle * 3.18;

  // Stalactite on ceiling above drip point
  const stalactiteMesh = useMemo(() => {
    return (
      <mesh position={[DRIP_X, 3.42, DRIP_Z]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.38, 6]} />
        <meshStandardMaterial color="#423d37" roughness={0.92} />
      </mesh>
    );
  }, []);

  // Trench centerline curve points: starts at drip puddle, sweeps around campfire, exits doorway
  const curvePoints = useMemo(() => {
    return [
      new THREE.Vector3(DRIP_X, 0.005, DRIP_Z),
      new THREE.Vector3(3.2, 0.005, -0.2),
      new THREE.Vector3(2.1, 0.005, 0.05),
      new THREE.Vector3(1.3, 0.005, 0.45),
      new THREE.Vector3(0.8, 0.005, 0.78),
      new THREE.Vector3(0.4, 0.005, 0.82),
      new THREE.Vector3(0.0, 0.005, 0.65),
      new THREE.Vector3(-0.4, 0.005, 0.35),
      new THREE.Vector3(WALL_X + 0.1, 0.005, 0.08),
      new THREE.Vector3(WALL_X - 0.4, 0.005, 0.0),
      new THREE.Vector3(WALL_X - 1.8, 0.005, -0.05),
    ];
  }, []);

  const spline = useMemo(() => {
    return new THREE.CatmullRomCurve3(curvePoints);
  }, [curvePoints]);

  // Construct carved trench bed geometry up to trenchProgress
  const trenchBedGeo = useMemo(() => {
    if (trenchProgress < 0.02) return null;

    const segments = Math.max(4, Math.floor(64 * Math.min(1, trenchProgress)));
    const tMax = Math.min(1, trenchProgress);

    const vertices: number[] = [];
    const indices: number[] = [];

    const width = 0.26;
    const halfW = width / 2;

    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * tMax;
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Left berm (raised dirt lip)
      const leftX = pt.x + normal.x * halfW;
      const leftZ = pt.z + normal.z * halfW;
      // Center ditch (recessed bed)
      const midX = pt.x;
      const midZ = pt.z;
      // Right berm (raised dirt lip)
      const rightX = pt.x - normal.x * halfW;
      const rightZ = pt.z - normal.z * halfW;

      // 3 vertices per cross section: Left (y=0.028), Center (y=0.009), Right (y=0.028)
      vertices.push(leftX, 0.028, leftZ);
      vertices.push(midX, 0.009, midZ);
      vertices.push(rightX, 0.028, rightZ);

      if (i < segments) {
        const row1 = i * 3;
        const row2 = (i + 1) * 3;
        // Quad 1: Left to Center
        indices.push(row1, row2, row1 + 1);
        indices.push(row1 + 1, row2, row2 + 1);
        // Quad 2: Center to Right
        indices.push(row1 + 1, row2 + 1, row1 + 2);
        indices.push(row1 + 2, row2 + 1, row2 + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [spline, trenchProgress]);

  // Construct glistening reflective water stream geometry up to waterFlowing
  const waterStreamGeo = useMemo(() => {
    if (waterFlowing < 0.02) return null;

    const segments = Math.max(4, Math.floor(64 * Math.min(1, waterFlowing)));
    const tMax = Math.min(1, waterFlowing);

    const vertices: number[] = [];
    const indices: number[] = [];

    const waterHalfW = 0.095;

    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * tMax;
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftX = pt.x + normal.x * waterHalfW;
      const leftZ = pt.z + normal.z * waterHalfW;
      const rightX = pt.x - normal.x * waterHalfW;
      const rightZ = pt.z - normal.z * waterHalfW;

      // Water surface at y = 0.018
      vertices.push(leftX, 0.018, leftZ);
      vertices.push(rightX, 0.018, rightZ);

      if (i < segments) {
        const r1 = i * 2;
        const r2 = (i + 1) * 2;
        indices.push(r1, r2, r1 + 1);
        indices.push(r1 + 1, r2, r2 + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [spline, waterFlowing]);

  return (
    <group>
      {/* Ceiling Stalactite */}
      {stalactiteMesh}

      {/* Falling Water Droplet */}
      {dripping && dropCycle < 0.95 && (
        <mesh position={[DRIP_X, dropY, DRIP_Z]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshBasicMaterial color="#bfe0f8" />
        </mesh>
      )}

      {/* Floor Water Puddle with Organic Wet Shape & Ripples */}
      {puddleRadius > 0.02 && (
        <group position={[DRIP_X, 0.008, DRIP_Z]}>
          {/* Main Dark Damp Water Pool */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[puddleRadius, 24]} />
            <meshStandardMaterial
              color="#224866"
              roughness={0.06}
              metalness={0.3}
              transparent
              opacity={0.92}
            />
          </mesh>

          {/* Concentric Soft Wet Ring Ripple */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.001]}>
            <ringGeometry
              args={[
                puddleRadius * (0.35 + 0.55 * dropCycle),
                puddleRadius * (0.44 + 0.55 * dropCycle),
                24,
              ]}
            />
            <meshBasicMaterial
              color="#8ec2ea"
              transparent
              opacity={Math.max(0, (1 - dropCycle) * 0.75)}
            />
          </mesh>
        </group>
      )}

      {/* Carved Floor Trench Bed (Damp Earthen Furrow with Raised Berms) */}
      {trenchBedGeo && (
        <mesh geometry={trenchBedGeo}>
          <meshStandardMaterial
            color="#34251a"
            roughness={0.88}
            metalness={0.05}
          />
        </mesh>
      )}

      {/* Glistening Reflective Flowing Water Stream (matching reference video) */}
      {waterStreamGeo && (
        <mesh geometry={waterStreamGeo}>
          <meshStandardMaterial
            color="#265278"
            roughness={0.04}
            metalness={0.35}
            transparent
            opacity={0.92}
          />
        </mesh>
      )}
    </group>
  );
};
