import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface HingePartProps {
  pivot: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  startFrame?: number;
  endFrame?: number;
  fromRotation?: [number, number, number];
  toRotation?: [number, number, number];
  easing?: (t: number) => number;
  children: React.ReactNode;
}

export const HingePart: React.FC<HingePartProps> = ({
  pivot,
  position = [0, 0, 0],
  rotation,
  startFrame,
  endFrame,
  fromRotation,
  toRotation,
  easing = Easing.inOut(Easing.cubic),
  children,
}) => {
  const frame = useCurrentFrame();

  let finalRotation: [number, number, number] = rotation || [0, 0, 0];

  if (
    startFrame !== undefined &&
    endFrame !== undefined &&
    fromRotation &&
    toRotation
  ) {
    const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing,
    });

    finalRotation = [
      fromRotation[0] + (toRotation[0] - fromRotation[0]) * progress,
      fromRotation[1] + (toRotation[1] - fromRotation[1]) * progress,
      fromRotation[2] + (toRotation[2] - fromRotation[2]) * progress,
    ];
  }

  return (
    <group position={position}>
      {/* Shift to pivot */}
      <group position={pivot} rotation={finalRotation}>
        {/* Shift back */}
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>
          {children}
        </group>
      </group>
    </group>
  );
};
