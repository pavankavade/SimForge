import type React from "react";
import type * as THREE from "three";
import type { Vec3 } from "../../../engine/types";
import { inkGeometry, inkMaterial, INK_WIDTH } from "./ink";

export interface PartProps {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  /** Outline width; `false` for no outline (small dark details, open shells). */
  ink?: number | false;
  /** Closed proxy shape for the outline of an open shell (hoods, helmets). */
  inkGeo?: THREE.BufferGeometry;
  shadow?: boolean;
  children?: React.ReactNode;
}

/** One solid piece of a character: mesh + ink hull, sharing cached geometry. */
export const Part: React.FC<PartProps> = ({
  geo,
  mat,
  position,
  rotation,
  scale,
  ink = INK_WIDTH,
  inkGeo,
  shadow = true,
  children,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh geometry={geo} material={mat} castShadow={shadow} receiveShadow dispose={null} />
    {ink !== false ? (
      <mesh geometry={inkGeometry(inkGeo ?? geo)} material={inkMaterial(ink)} dispose={null} />
    ) : null}
    {children}
  </group>
);
