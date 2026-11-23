import type React from "react";
import { Block, LP, OctagonFloor, PlankFloor, Prism, Wedge, matte } from "../../../lowpoly";
import {
  BACK_Z,
  CAR_X,
  CAR_Z,
  DOOR_H,
  DOOR_SHUT,
  DOOR_Z0,
  DOOR_Z1,
  FRONT_Z,
  GUSH,
  HALL_X0,
  L2_START,
  L2B_START,
  LAWN_Y,
  PORCH_X,
  ROOM_HALF,
  WALL_H,
  carPose,
  easeInOut,
  hallLevel,
  progress,
  roomLevel,
} from "../timeline";
import { Sheet, WaterSlab } from "./Water";

const DEPTH = FRONT_Z - BACK_Z;
const MID_Z = (FRONT_Z + BACK_Z) / 2;
const TILE = "#b8c7cf";

/** Back wall of one room, with an optional small frosted window. */
const BackWall: React.FC<{ x0: number; x1: number; color: string; window?: number }> = ({ x0, x1, color, window }) => {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  if (window === undefined) return <Block size={[w, WALL_H, 0.3]} position={[cx, WALL_H / 2, BACK_Z]} color={color} />;
  const wx = window;
  const ww = 1.1;
  const y0 = 1.7;
  const y1 = 2.5;
  return (
    <group>
      <Block size={[wx - ww / 2 - x0, WALL_H, 0.3]} position={[(x0 + wx - ww / 2) / 2, WALL_H / 2, BACK_Z]} color={color} />
      <Block size={[x1 - wx - ww / 2, WALL_H, 0.3]} position={[(x1 + wx + ww / 2) / 2, WALL_H / 2, BACK_Z]} color={color} />
      <Block size={[ww, y0, 0.3]} position={[wx, y0 / 2, BACK_Z]} color={color} />
      <Block size={[ww, WALL_H - y1, 0.3]} position={[wx, (WALL_H + y1) / 2, BACK_Z]} color={color} />
      {/* Rain-grey sky through frosted glass */}
      <Block size={[ww, y1 - y0, 0.04]} position={[wx, (y0 + y1) / 2, BACK_Z - 0.04]} material={matte("#9fb1b8", { rough: 0.2, emissive: "#7f9299", emissiveIntensity: 0.35 })} castShadow={false} />
      <Block size={[ww + 0.16, 0.1, 0.36]} position={[wx, y0 - 0.02, BACK_Z + 0.04]} color={LP.trim} />
    </group>
  );
};

/** The bathroom: tiles, sink, toilet, mirror and towel; the tub is a separate Hull. */
const Bathroom: React.FC = () => (
  <group>
    <OctagonFloor cols={8} rows={6} cell={0.6} tile="#c9d3d9" keystone="#7f9aa8" position={[0, 0, MID_Z]} />
    <BackWall x0={-ROOM_HALF} x1={ROOM_HALF} color={TILE} window={1.6} />
    {/* Tile band and trim along the back wall */}
    {Array.from({ length: 8 }, (_, i) => (
      <Block key={i} size={[0.56, 1.1, 0.06]} position={[-ROOM_HALF + 0.3 + i * 0.6, 0.6, BACK_Z + 0.18]} color={i % 2 ? "#d7e2e8" : "#cbd8df"} castShadow={false} />
    ))}
    <Block size={[ROOM_HALF * 2, 0.1, 0.12]} position={[0, 1.2, BACK_Z + 0.2]} color={LP.trim} castShadow={false} />
    {/* Sink on a pedestal, mirror above it */}
    <group position={[-1.75, 0, BACK_Z + 0.5]}>
      <Prism r={0.14} h={0.75} position={[0, 0.38, 0]} color="#eef1f2" />
      <Block size={[0.7, 0.18, 0.5]} position={[0, 0.84, 0]} color="#eef1f2" bevel={0.06} />
      <Block size={[0.6, 0.8, 0.05]} position={[0, 1.75, -0.24]} material={matte("#d6e6ee", { rough: 0.15, emissive: "#b5cbd6", emissiveIntensity: 0.25 })} castShadow={false} />
    </group>
    {/* Toilet in the far corner */}
    <group position={[2.0, 0, BACK_Z + 0.5]}>
      <Block size={[0.42, 0.42, 0.55]} position={[0, 0.21, 0.1]} color="#eef1f2" bevel={0.1} />
      <Block size={[0.5, 0.5, 0.2]} position={[0, 0.65, -0.18]} color="#eef1f2" bevel={0.06} />
    </group>
    {/* Towel rail */}
    <Block size={[0.7, 0.04, 0.04]} position={[0.3, 1.55, BACK_Z + 0.2]} color={LP.steel} castShadow={false} />
    <Block size={[0.5, 0.6, 0.05]} position={[0.3, 1.27, BACK_Z + 0.22]} color="#6fa6c9" castShadow={false} />
  </group>
);

/** The hallway on the left: planks, coat hooks, a rug. */
const Hall: React.FC = () => {
  const w = -ROOM_HALF - HALL_X0;
  const cx = (HALL_X0 - ROOM_HALF) / 2;
  return (
    <group>
      <PlankFloor w={w} d={DEPTH} color="#b98a5a" position={[cx, 0, MID_Z]} />
      <BackWall x0={HALL_X0} x1={-ROOM_HALF} color={LP.plasterWarm} />
      <Block size={[2.0, 0.03, 1.2]} position={[cx + 0.2, 0.02, 0.3]} color={LP.cloth} castShadow={false} />
      {[-0.6, 0, 0.6].map((dx, i) => (
        <group key={i} position={[cx + dx, 1.85, BACK_Z + 0.2]}>
          <Block size={[0.06, 0.06, 0.16]} color={LP.trimDark} castShadow={false} />
          {i !== 1 && <Block size={[0.34, 0.7, 0.2]} position={[0, -0.38, 0.1]} color={i ? "#c4473d" : "#7d9165"} />}
        </group>
      ))}
    </group>
  );
};

/** The left partition with its doorway; the door swings shut behind them. */
const Partition: React.FC<{ frame: number }> = ({ frame }) => {
  const x = -ROOM_HALF;
  const backD = DOOR_Z0 - BACK_Z;
  const frontD = FRONT_Z - DOOR_Z1;
  const shut = frame >= L2_START ? 1 : easeInOut(progress(frame, DOOR_SHUT));
  const dw = DOOR_Z1 - DOOR_Z0;
  return (
    <group>
      <Block size={[0.22, WALL_H, backD]} position={[x, WALL_H / 2, BACK_Z + backD / 2]} color={LP.plaster} />
      <Block size={[0.22, WALL_H, frontD]} position={[x, WALL_H / 2, DOOR_Z1 + frontD / 2]} color={LP.plaster} />
      <Block size={[0.22, WALL_H - DOOR_H, dw]} position={[x, (WALL_H + DOOR_H) / 2, (DOOR_Z0 + DOOR_Z1) / 2]} color={LP.plaster} />
      {/* The door, hinged at its back edge; open, it lies along the hall side. A gap under it. */}
      <group position={[x - 0.06, 0, DOOR_Z0]} rotation={[0, -(1 - shut) * 1.45, 0]}>
        <Block size={[0.08, DOOR_H - 0.12, dw - 0.06]} position={[0, 0.1 + (DOOR_H - 0.12) / 2, dw / 2]} color={LP.wood} bevel={0.03} />
        <Prism r={0.04} h={0.12} position={[-0.06, 1.05, dw - 0.18]} rotation={[0, 0, Math.PI / 2]} color={LP.hazard} castShadow={false} />
      </group>
      {/* Right wall, with the outside door to the porch */}
      <Block size={[0.22, WALL_H, DEPTH]} position={[ROOM_HALF, WALL_H / 2, MID_Z]} color={LP.plaster} />
      <Block size={[0.22, WALL_H, DEPTH]} position={[HALL_X0, WALL_H / 2, MID_Z]} color={LP.plasterWarm} />
    </group>
  );
};

/** Roof: a shallow gable over the whole house, eaves past the walls. */
const Roof: React.FC = () => {
  const x0 = HALL_X0 - 0.5;
  const x1 = ROOM_HALF + 0.5;
  const half = (x1 - x0) / 2;
  const cx = (x0 + x1) / 2;
  return (
    <group position={[cx, WALL_H, MID_Z]}>
      <Block size={[x1 - x0, 0.22, DEPTH + 0.6]} position={[0, 0.11, 0]} color={LP.trim} />
      <Wedge size={[half, 1.6, DEPTH + 0.8]} position={[half / 2, 1.0, 0]} color={LP.roof} />
      <Wedge size={[half, 1.6, DEPTH + 0.8]} position={[-half / 2, 1.0, 0]} rotation={[0, Math.PI, 0]} color={LP.roof} />
    </group>
  );
};

/** A chunky low-poly hatchback. Origin under the middle of the body, on the ground. */
export const Car: React.FC = () => (
  <group>
    <Block size={[2.7, 0.62, 1.3]} position={[0, 0.55, 0]} color="#c4473d" bevel={0.16} />
    <Block size={[1.6, 0.55, 1.18]} position={[-0.15, 1.1, 0]} color="#c4473d" bevel={0.16} />
    <Block size={[1.45, 0.42, 1.22]} position={[-0.15, 1.1, 0]} material={matte("#26343c", { rough: 0.2 })} castShadow={false} />
    {[-0.9, 0.9].map((dx) =>
      [-0.62, 0.62].map((dz) => <Prism key={`${dx}${dz}`} r={0.3} h={0.22} sides={10} position={[dx, 0.3, dz]} rotation={[Math.PI / 2, 0, 0]} color="#22262b" />)
    )}
    <Block size={[0.08, 0.14, 0.3]} position={[1.36, 0.62, 0.42]} material={matte("#fff4cc", { emissive: "#fff4cc", emissiveIntensity: 0.6 })} castShadow={false} />
    <Block size={[0.08, 0.14, 0.3]} position={[1.36, 0.62, -0.42]} material={matte("#fff4cc", { emissive: "#fff4cc", emissiveIntensity: 0.6 })} castShadow={false} />
  </group>
);

/** Lawn, porch and driveway, the car, and the driveway flood. */
const Outside: React.FC<{ frame: number }> = ({ frame }) => {
  const car = carPose(frame);
  return (
    <group>
      {/* Foundation and lawn */}
      <Block size={[ROOM_HALF - HALL_X0 + 0.4, 0.6, DEPTH + 0.4]} position={[(HALL_X0 + ROOM_HALF) / 2, -0.3, MID_Z]} color={LP.stone} />
      <Block size={[60, 0.3, 30]} position={[0, LAWN_Y - 0.15, -5]} color={LP.grass} castShadow={false} />
      {/* Porch step and the driveway */}
      <Block size={[1.6, 0.35, 2.4]} position={[PORCH_X - 0.4, LAWN_Y + 0.17, 0.3]} color={LP.concrete} />
      <Block size={[9, 0.06, 3.4]} position={[CAR_X + 1.5, LAWN_Y + 0.03, CAR_Z]} color="#8f938f" castShadow={false} />
      {/* A hedge and a mailbox, to read the water height against */}
      <Prism r={0.05} h={1.1} position={[PORCH_X + 1.2, LAWN_Y + 0.55, 2.2]} color={LP.woodDark} />
      <Block size={[0.4, 0.3, 0.26]} position={[PORCH_X + 1.2, LAWN_Y + 1.2, 2.2]} color="#5c7fa3" bevel={0.08} />
      {Array.from({ length: 6 }, (_, i) => (
        <Block key={i} size={[0.9, 0.9, 0.9]} position={[CAR_X + 6 - i * 0.2, LAWN_Y + 0.45, -2.6 + i * 0.05]} color={i % 2 ? LP.leaf : LP.grassDark} bevel={0.25} />
      ))}
      {frame < L2B_START + 2 && (
        <group position={[car.x, car.y, CAR_Z]} rotation={[0, car.yaw, car.roll]}>
          <Car />
        </group>
      )}
    </group>
  );
};

/** The whole house set (x ≈ 0). The water inside it is drawn here too. */
export const HouseSet: React.FC<{ frame: number; driveLevel: number }> = ({ frame, driveLevel }) => {
  const hall = hallLevel(frame);
  const room = roomLevel(frame);
  const gush = progress(frame, GUSH);
  return (
    <group>
      <Bathroom />
      <Hall />
      <Partition frame={frame} />
      <Roof />
      <Outside frame={frame} />
      {/* Water in the hall (behind the door), then in the bathroom */}
      {hall > 0 && <WaterSlab frame={frame} x={[HALL_X0 + 0.12, -ROOM_HALF - 0.1]} z={[BACK_Z + 0.15, FRONT_Z]} level={hall} bottom={0} wave={(x, z) => 0.03 * Math.sin(x * 2 + z + frame * 0.2)} seg={[8, 6]} />}
      {gush > 0 && room < 0.06 && <Sheet position={[-ROOM_HALF + 0.12, 0.03, (DOOR_Z0 + DOOR_Z1) / 2]} size={[0.2 + gush * 3.4, (DOOR_Z1 - DOOR_Z0) * (0.8 + gush * 1.6)]} />}
      {room > 0 && <WaterSlab frame={frame} x={[-ROOM_HALF + 0.11, ROOM_HALF - 0.11]} z={[BACK_Z + 0.15, FRONT_Z]} level={room} bottom={0} wave={(x, z) => 0.03 * Math.sin(x * 2.2 - z + frame * 0.22)} seg={[10, 6]} />}
      {/* The driveway flood: ankle deep, then a foot */}
      {driveLevel > LAWN_Y && <WaterSlab frame={frame} x={[ROOM_HALF + 0.3, 30]} z={[-6, 4]} level={driveLevel} bottom={LAWN_Y} wave={(x, z) => 0.025 * Math.sin(x * 1.4 + z * 0.8 + frame * 0.18)} seg={[24, 8]} />}
    </group>
  );
};
