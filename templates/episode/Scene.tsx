import type React from "react";
import { useCurrentFrame } from "remotion";
import { Banner, Crate, Rock, Tree } from "../../artifacts";

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame * 0.04) * 0.08;

  return (
    <>
      <Tree position={[-2.0, 0, -2.6]} scale={0.9} />
      <Rock position={[2.3, 0.32, -1.1]} scale={0.5} />
      <Crate
        position={[1.55, 0, 0.3]}
        rotation={[0, 0.45 + sway, 0]}
        scale={0.8}
      />
      <Banner position={[-1.85, 0, 0.7]} rotation={[0, sway, 0]} scale={0.8} />
    </>
  );
};
