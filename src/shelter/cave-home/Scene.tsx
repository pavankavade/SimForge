import React from "react";
import { useCurrentFrame } from "remotion";
import { CaveDiorama } from "./components/CaveDiorama";
import { Campfire } from "./components/Campfire";
import { SmokeCloud } from "./components/SmokeCloud";
import { AirflowArrows } from "./components/AirflowArrows";
import { WindWall } from "./components/WindWall";
import { DrainageTrench } from "./components/DrainageTrench";
import { LogBed } from "./components/LogBed";
import { StickDoor } from "./components/StickDoor";
import { CaveDetails } from "./components/CaveDetails";
import { WolfPack } from "./components/WolfPack";

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <group>
      {/* 3D Cutaway Cliff & Forest Set */}
      <CaveDiorama frame={frame} />

      {/* Campfire (Center -> Entrance -> Relit) */}
      <Campfire frame={frame} />

      {/* Volumetric Smoke Cloud */}
      <SmokeCloud frame={frame} />

      {/* 3D Convective Airflow & Wind Arrows */}
      <AirflowArrows frame={frame} />

      {/* Stacked Stone Wind Wall with Smoke Vent */}
      <WindWall frame={frame} />

      {/* Ceiling Water Drip, Puddle & Carved Drainage Trench */}
      <DrainageTrench frame={frame} />

      {/* Rustic Log Bed with Dry Grass */}
      <LogBed frame={frame} />

      {/* Tied Stick Door with Interior Latch */}
      <StickDoor frame={frame} />

      {/* Nocturnal Animals Sniffing at Door */}
      <WolfPack frame={frame} />

      {/* Wall Torch, Prehistoric Mammoth Art, Ceiling Bat */}
      <CaveDetails frame={frame} />
    </group>
  );
};
