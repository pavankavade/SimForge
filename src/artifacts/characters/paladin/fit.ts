// Fitting the harness to the imported body. The torso plates, fauld, gorget and the hanging mail
// were authored around the earlier procedural torso; `warpTorso` maps a point from that torso onto
// the measured one (per height: width, front and back depth), so plates keep their clearance.
import * as THREE from "three";
import { profileAt, type TorsoProfile } from "./body";

/** The torso the harness was authored on: y, half width, front depth, back depth (metres). */
const AUTHOR_TORSO: Array<[number, number, number, number]> = [
  [0.84, 0.158, 0.092, 0.104],
  [0.9, 0.17, 0.1, 0.116],
  [0.96, 0.164, 0.103, 0.11],
  [1.02, 0.152, 0.1, 0.098],
  [1.08, 0.141, 0.097, 0.092],
  [1.15, 0.146, 0.104, 0.097],
  [1.23, 0.157, 0.112, 0.104],
  [1.31, 0.17, 0.122, 0.11],
  [1.385, 0.182, 0.126, 0.114],
  [1.43, 0.192, 0.118, 0.113],
  [1.452, 0.197, 0.11, 0.112],
  [1.468, 0.186, 0.099, 0.107],
  [1.48, 0.152, 0.086, 0.099],
  [1.497, 0.102, 0.069, 0.087],
  [1.515, 0.074, 0.058, 0.075],
  [1.535, 0.063, 0.053, 0.066],
  [1.56, 0.058, 0.051, 0.061],
];

function authorAt(y: number): [number, number, number] {
  const T = AUTHOR_TORSO;
  if (y <= T[0][0]) return [T[0][1], T[0][2], T[0][3]];
  for (let i = 1; i < T.length; i++) {
    if (y <= T[i][0]) {
      const k = (y - T[i - 1][0]) / (T[i][0] - T[i - 1][0]);
      return [T[i - 1][1] + (T[i][1] - T[i - 1][1]) * k, T[i - 1][2] + (T[i][2] - T[i - 1][2]) * k, T[i - 1][3] + (T[i][3] - T[i - 1][3]) * k];
    }
  }
  const l = T[T.length - 1];
  return [l[1], l[2], l[3]];
}

const clampRatio = (r: number) => Math.max(0.75, Math.min(1.45, r));

/**
 * Move a model-space point from the authored torso onto the imported one (in place). Returns the
 * local x and z scales applied there, for transforming normals.
 */
export function warpTorso(p: THREE.Vector3, t: TorsoProfile): [number, number] {
  const y = Math.max(0.84, Math.min(1.56, p.y));
  const [ax, af, ab] = authorAt(y);
  const [nx, nf, nb] = profileAt(t, y);
  const sx = clampRatio(nx / ax);
  const sz = p.z >= 0 ? clampRatio(nf / af) : clampRatio(nb / ab);
  p.x *= sx;
  p.z *= sz;
  return [sx, sz];
}
