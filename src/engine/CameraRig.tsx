import type React from "react";
import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, random } from "remotion";
import * as THREE from "three";
import type { CameraConfig } from "./types";

interface CameraRigProps {
  config: CameraConfig;
}

export const CameraRig: React.FC<CameraRigProps> = ({ config }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const { waypoints, tracks = [], shake = [], rumbles = [] } = config;

  useLayoutEffect(() => {
    if (waypoints.length === 0) return;

    let targetPos: [number, number, number];
    let targetLook: [number, number, number];

    if (frame <= waypoints[0].frame) {
      targetPos = waypoints[0].position;
      targetLook = waypoints[0].lookAt;
    } else if (frame >= waypoints[waypoints.length - 1].frame) {
      const last = waypoints[waypoints.length - 1];
      targetPos = last.position;
      targetLook = last.lookAt;
    } else {
      let index = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        if (frame >= waypoints[i].frame && frame < waypoints[i + 1].frame) {
          index = i;
          break;
        }
      }
      const from = waypoints[index];
      const to = waypoints[index + 1];
      const span = to.frame - from.frame;
      const rawT = span === 0 ? 1 : (frame - from.frame) / span;
      const t = rawT * rawT * (3 - 2 * rawT);

      targetPos = [
        from.position[0] + (to.position[0] - from.position[0]) * t,
        from.position[1] + (to.position[1] - from.position[1]) * t,
        from.position[2] + (to.position[2] - from.position[2]) * t,
      ];

      targetLook = [
        from.lookAt[0] + (to.lookAt[0] - from.lookAt[0]) * t,
        from.lookAt[1] + (to.lookAt[1] - from.lookAt[1]) * t,
        from.lookAt[2] + (to.lookAt[2] - from.lookAt[2]) * t,
      ];
    }

    for (const track of tracks) {
      if (frame < track.start || frame > track.end) continue;
      const blend = Math.max(1, track.blend ?? 15);
      const raw = Math.min(
        1,
        (frame - track.start) / blend,
        (track.end - frame) / blend
      );
      const w = raw * raw * (3 - 2 * raw);
      const pose = track.fn(frame);
      targetPos = [
        targetPos[0] + (pose.position[0] - targetPos[0]) * w,
        targetPos[1] + (pose.position[1] - targetPos[1]) * w,
        targetPos[2] + (pose.position[2] - targetPos[2]) * w,
      ];
      targetLook = [
        targetLook[0] + (pose.lookAt[0] - targetLook[0]) * w,
        targetLook[1] + (pose.lookAt[1] - targetLook[1]) * w,
        targetLook[2] + (pose.lookAt[2] - targetLook[2]) * w,
      ];
    }

    const burstAmount = shake.reduce((total, burst) => {
      const spread = burst.spread ?? 8;
      return total + burst.strength * Math.exp(-Math.pow((frame - burst.at) / spread, 2));
    }, 0);

    const rumbleAmount = rumbles.reduce((total, rumble) => {
      if (frame < rumble.start || frame > rumble.end) return total;
      const span = Math.max(1, rumble.end - rumble.start);
      return total + rumble.strength * Math.sin(((frame - rumble.start) / span) * Math.PI);
    }, 0);

    const shakeAmount = burstAmount + rumbleAmount;

    const shakeX = (random(`camera-shake-x-${frame}`) - 0.5) * shakeAmount;
    const shakeY = (random(`camera-shake-y-${frame}`) - 0.5) * shakeAmount;
    const shakeZ = (random(`camera-shake-z-${frame}`) - 0.5) * shakeAmount * 0.5;
    const lookShakeX = (random(`camera-look-x-${frame}`) - 0.5) * shakeAmount * 0.8;
    const lookShakeY = (random(`camera-look-y-${frame}`) - 0.5) * shakeAmount * 0.8;

    camera.position.set(
      targetPos[0] + shakeX,
      targetPos[1] + shakeY,
      targetPos[2] + shakeZ
    );
    camera.lookAt(
      new THREE.Vector3(
        targetLook[0] + lookShakeX,
        targetLook[1] + lookShakeY,
        targetLook[2]
      )
    );
    camera.updateProjectionMatrix();
  }, [camera, frame, shake, waypoints, tracks, rumbles]);

  return null;
};
