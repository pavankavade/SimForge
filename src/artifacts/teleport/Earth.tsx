import type React from "react";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../engine/types";
import { LAND, WATER, type Ring } from "./earthOutlines";

/**
 * A stylized spinning Earth for the teleport explainers: hand-traced
 * continents painted on a canvas texture (no image assets), a polar ice cap,
 * a faint graticule, plus the diagram layer the story needs: pins, eastward
 * ground-speed arrows, the spin axis and a straight chord through the planet.
 *
 * The axis is world +y. `spin` turns the planet (radians); longitude λ faces
 * the camera on +z when spin = facing(λ).
 */

const DEG = Math.PI / 180;

/** Surface point in the globe's own frame (lon 0 on +x, 90 E on -z, north +y). */
export const latLon = (lat: number, lon: number, r = 1): Vec3 => [
  r * Math.cos(lat * DEG) * Math.cos(lon * DEG),
  r * Math.sin(lat * DEG),
  -r * Math.cos(lat * DEG) * Math.sin(lon * DEG),
];

/** Spin that turns longitude `lon` to face +z. */
export const facing = (lon: number) => -Math.PI / 2 - lon * DEG;

/** World point of (lat, lon) on a globe at `center` with radius `r`, spun by `spin`. */
export const globePoint = (center: Vec3, r: number, spin: number, lat: number, lon: number): Vec3 => {
  const [x, y, z] = latLon(lat, lon, r);
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  return [center[0] + x * c + z * s, center[1] + y, center[2] - x * s + z * c];
};

let texture: THREE.CanvasTexture | null = null;
const earthTexture = () => {
  if (texture) return texture;
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d") as CanvasRenderingContext2D;
  const px = (lon: number, lat: number): [number, number] => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  const ocean = g.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, "#3f86c9");
  ocean.addColorStop(0.5, "#2f78c0");
  ocean.addColorStop(1, "#3f86c9");
  g.fillStyle = ocean;
  g.fillRect(0, 0, W, H);
  const ring = (r: Ring) => {
    g.beginPath();
    r.forEach(([lon, lat], i) => {
      const [x, y] = px(lon, lat);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
  };
  // Shallow shelf glow under every coast, then land banded by latitude.
  g.lineJoin = "round";
  g.strokeStyle = "#5fa6dc";
  g.lineWidth = 14;
  LAND.forEach((r) => {
    ring(r);
    g.stroke();
  });
  const land = g.createLinearGradient(0, 0, 0, H);
  land.addColorStop(0.0, "#e9edf2");
  land.addColorStop(0.1, "#e9edf2");
  land.addColorStop(0.16, "#8fae6a");
  land.addColorStop(0.32, "#79a85a");
  land.addColorStop(0.4, "#d8c27e");
  land.addColorStop(0.47, "#6fa552");
  land.addColorStop(0.55, "#6fa552");
  land.addColorStop(0.64, "#cdb878");
  land.addColorStop(0.74, "#86ad62");
  land.addColorStop(0.84, "#9fb27a");
  land.addColorStop(0.88, "#eef1f5");
  land.addColorStop(1, "#eef1f5");
  g.fillStyle = land;
  LAND.forEach((r) => {
    ring(r);
    g.fill();
  });
  g.fillStyle = "#2f78c0";
  WATER.forEach((r) => {
    ring(r);
    g.fill();
  });
  // Arctic sea ice.
  g.fillStyle = "#eef3f8";
  g.fillRect(0, 0, W, px(0, 82)[1]);
  g.strokeStyle = "rgba(255,255,255,0.14)";
  g.lineWidth = 2;
  for (let lon = -180; lon <= 180; lon += 30) {
    g.beginPath();
    g.moveTo(px(lon, 90)[0], 0);
    g.lineTo(px(lon, -90)[0], H);
    g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    g.moveTo(0, px(0, lat)[1]);
    g.lineTo(W, px(0, lat)[1]);
    g.stroke();
  }
  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const UP = new THREE.Vector3(0, 1, 0);

/** A shaft + head from `from` along `dir` (globe frame), length `len`. */
const Arrow: React.FC<{ from: Vec3; dir: Vec3; len: number; color: string; width: number }> = ({ from, dir, len, color, width }) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize()), [dir]);
  if (len < 0.01) return null;
  const head = Math.min(len * 0.45, width * 4);
  return (
    <group position={from} quaternion={q}>
      <mesh position={[0, (len - head) / 2, 0]}>
        <cylinderGeometry args={[width, width, len - head, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, len - head / 2, 0]}>
        <coneGeometry args={[width * 2.4, head, 14]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
};

export interface GlobePin {
  lat: number;
  lon: number;
  color: string;
  size?: number;
}

export interface GlobeArrow {
  lat: number;
  lon: number;
  /** Length as a fraction of the equator arrow (1 = 1,037 mph). */
  scale: number;
  color?: string;
}

export interface GlobeProps {
  position: Vec3;
  radius: number;
  spin: number;
  pins?: GlobePin[];
  /** Eastward ground-velocity arrows (length ∝ cos latitude unless overridden). */
  arrows?: GlobeArrow[];
  /** Spin axis through the poles, 0..1 drawn. */
  axis?: number;
  /** Straight chord through the planet, drawn from `from` toward `to` by `progress`. */
  chord?: { from: [number, number]; to: [number, number]; progress: number; color?: string };
  /** 0 opaque .. 1 see-through, for showing the chord inside. */
  xray?: number;
  /** Dashed hop trail along the surface: [lat, lon] dots. */
  trail?: [number, number][];
}

export const Globe: React.FC<GlobeProps> = ({ position, radius: R, spin, pins = [], arrows = [], axis = 0, chord, xray = 0, trail = [] }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.75, metalness: 0, transparent: true }), []);
  mat.opacity = 1 - xray * 0.6;
  mat.depthWrite = xray < 0.05;
  const atmo = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#9fd4ff", transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false, fog: false }),
    [],
  );
  return (
    <group position={position}>
      {axis > 0 ? (
        <mesh position={[0, 0, 0]} scale={[1, axis, 1]}>
          <cylinderGeometry args={[R * 0.012, R * 0.012, R * 2.7, 10]} />
          <meshBasicMaterial color="#ffd84d" toneMapped={false} />
        </mesh>
      ) : null}
      <group rotation={[0, spin, 0]}>
        <mesh material={mat}>
          <sphereGeometry args={[R, 96, 64]} />
        </mesh>
        {pins.map((p, i) => (
          <mesh key={`pin${i}`} position={latLon(p.lat, p.lon, R * 1.004)}>
            <sphereGeometry args={[R * (p.size ?? 0.028), 16, 12]} />
            <meshBasicMaterial color={p.color} toneMapped={false} />
          </mesh>
        ))}
        {trail.map(([lat, lon], i) => (
          <mesh key={`tr${i}`} position={latLon(lat, lon, R * 1.003)}>
            <sphereGeometry args={[R * 0.009, 8, 6]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        ))}
        {arrows.map((a, i) => {
          const from = latLon(a.lat, a.lon, R * 1.01);
          const east: Vec3 = [-Math.sin(a.lon * DEG), 0, -Math.cos(a.lon * DEG)];
          return <Arrow key={`ar${i}`} from={from} dir={east} len={R * 0.55 * a.scale} color={a.color ?? "#ffd84d"} width={R * 0.014} />;
        })}
        {chord && chord.progress > 0
          ? (() => {
              const a = latLon(chord.from[0], chord.from[1], R);
              const b = latLon(chord.to[0], chord.to[1], R);
              const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
              const len = Math.hypot(d[0], d[1], d[2]) * Math.min(1, chord.progress);
              return <Arrow from={a} dir={d} len={len} color={chord.color ?? "#ff8a3d"} width={R * 0.016} />;
            })()
          : null}
      </group>
      <mesh material={atmo}>
        <sphereGeometry args={[R * 1.06, 64, 32]} />
      </mesh>
    </group>
  );
};
