import type React from "react";
import { FortressWall } from "../../artifacts/structures/FortressWall";
import { ScalingLadder } from "../../artifacts/machines/ScalingLadder";
import { SiegeTower } from "../../artifacts/machines/SiegeTower";

export const Scene: React.FC = () => {
  return (
    <>
      <FortressWall />
      <ScalingLadder />
      <SiegeTower />
    </>
  );
};
