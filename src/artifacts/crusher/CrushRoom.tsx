import type React from "react";

export interface CrushRoomProps {
  /** Room x offset (the Level 5 lunge). */
  dx?: number;
  children: React.ReactNode;
}

/** Everything that belongs to the crush room rides in here, so it all lunges together. */
export const CrushRoom: React.FC<CrushRoomProps> = ({ dx = 0, children }) => <group position={[dx, 0, 0]}>{children}</group>;
