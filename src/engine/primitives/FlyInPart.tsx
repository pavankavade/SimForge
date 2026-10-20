import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface FlyInPartProps {
  startFrame: number;
  durationFrames?: number;
  fromOffset: [number, number, number];
  scaleFromZero?: boolean;
  children: React.ReactNode;
}

export const FlyInPart: React.FC<FlyInPartProps> = ({
  startFrame,
  durationFrames = 18,
  fromOffset,
  scaleFromZero = false,
  children,
}) => {
  const frame = useCurrentFrame();

  if (frame < startFrame) {
    return null;
  }

  const endFrame = startFrame + durationFrames;
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.2)),
  });

  const posX = fromOffset[0] * (1 - progress);
  const posY = fromOffset[1] * (1 - progress);
  const posZ = fromOffset[2] * (1 - progress);

  const scale = scaleFromZero
    ? interpolate(frame, [startFrame, endFrame], [0.001, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 1;

  return (
    <group position={[posX, posY, posZ]} scale={[scale, scale, scale]}>
      {children}
    </group>
  );
};
