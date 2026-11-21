// The way out. A floor is a ten-minute run: from minute two, five escape portals open one by one
// at random places in the rooms (never in the market, never on top of him or each other). E at an
// open portal takes him out with what he carries; when the time runs out the dungeon takes him.
// `planPortals` is pure (seeded), `createPortals` draws them: a violet ring of light standing on
// the floor round a swirling disc, opening with an overshoot.
import * as THREE from "three";
import { floorAt } from "./dungeon/floors";
import type { DungeonData } from "./dungeon/generator";
import { SEE_THROUGH } from "./dungeon/view";
import { createAgentCollider } from "./dungeon/walker";

/** The run's length, when the portals start to open and the last one opens by (seconds). */
export const RUN_SECONDS = 600;
export const PORTALS_FROM = 120;
const PORTALS_BY = 510;
export const PORTAL_COUNT = 5;
/** He can step through from this far (metres, from the portal's centre on the floor). */
export const PORTAL_REACH = 1.6;

export interface PortalPlan {
  /** Grid position (cells, continuous) and the way the ring faces. */
  gx: number;
  gz: number;
  yaw: number;
  /** Run time it opens at (seconds). */
  at: number;
}

/** Five places and opening times for this floor, from the seed. */
export function planPortals(d: DungeonData, rand: () => number, start: { x: number; z: number }): PortalPlan[] {
  // Clear floor in the rooms: no wall, pillar, stall or furniture within ~1.2 m.
  const collider = createAgentCollider(d, 0.85);
  const cells: Array<[number, number]> = [];
  for (let z = 1; z < d.H - 1; z++) {
    for (let x = 1; x < d.W - 1; x++) {
      const c = z * d.W + x;
      const room = d.roomId[c];
      if (!d.walkable[c] || room < 0 || room === d.entrance) continue;
      const P = { x: x + 0.5, y: z + 0.5 };
      collider.collide(P);
      if (Math.hypot(P.x - x - 0.5, P.y - z - 0.5) > 0.01) continue;
      cells.push([x + 0.5, z + 0.5]);
    }
  }
  const picked: Array<[number, number]> = [];
  for (let tries = 0; picked.length < PORTAL_COUNT && tries < 400 && cells.length; tries++) {
    const [x, z] = cells[Math.floor(rand() * cells.length)];
    // Spread them out: away from the start and from each other (relaxed as the tries run out).
    const gap = tries < 250 ? 8 : 4;
    if (Math.hypot(x - start.x, z - start.z) < gap) continue;
    if (picked.some(([px, pz]) => Math.hypot(px - x, pz - z) < gap)) continue;
    picked.push([x, z]);
  }
  // The first opens at minute two, the rest at random times after it.
  const times = picked.map((_, i) => (i === 0 ? PORTALS_FROM : PORTALS_FROM + 20 + rand() * (PORTALS_BY - PORTALS_FROM - 20)));
  times.sort((a, b) => a - b);
  return picked.map(([gx, gz], i) => ({ gx, gz, yaw: rand() * Math.PI, at: times[i] }));
}

export interface Portals {
  plans: PortalPlan[];
  /** World centres on the floor (metres). */
  centres: THREE.Vector3[];
  /** Is portal i open at run time t? */
  isOpen: (i: number, t: number) => boolean;
  update: (time: number, runT: number) => void;
  dispose: () => void;
}

const DISC_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DISC_FRAG = `varying vec2 vUv; uniform float uTime, uOpen;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float a = atan(p.y, p.x);
    float swirl = sin(a * 5.0 - r * 9.0 + uTime * 3.2) * 0.5 + 0.5;
    float swirl2 = sin(a * 3.0 + r * 14.0 - uTime * 2.1) * 0.5 + 0.5;
    float core = smoothstep(1.0, 0.0, r);
    vec3 col = mix(vec3(0.32, 0.12, 0.9), vec3(0.75, 0.55, 1.0), swirl * swirl2);
    col += vec3(0.9, 0.85, 1.0) * pow(core, 3.0) * 0.8;
    float alpha = (0.35 + 0.65 * swirl) * smoothstep(1.0, 0.82, r) * uOpen;
    gl_FragColor = vec4(col * alpha, alpha);
  }`;
const GLOW_FRAG = `varying vec2 vUv; uniform float uTime, uOpen;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    float a = pow(max(0.0, 1.0 - r), 2.2) * (0.75 + 0.25 * sin(uTime * 2.4)) * uOpen;
    gl_FragColor = vec4(vec3(0.45, 0.25, 1.0) * a, a);
  }`;

const RING_Y = 1.25;
const RING_R = 0.9;

export function createPortals(scene: THREE.Scene, d: DungeonData, cellM: number, plans: PortalPlan[]): Portals {
  const group = new THREE.Group();
  scene.add(group);
  const ringGeo = new THREE.TorusGeometry(RING_R, 0.075, 12, 56);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x1a1030, emissive: 0x8c5cff, emissiveIntensity: 2.4, roughness: 0.3 });
  const discGeo = new THREE.PlaneGeometry(RING_R * 2, RING_R * 2);
  const glowGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const mats: THREE.ShaderMaterial[] = [];
  const shader = (frag: string) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } },
      vertexShader: DISC_VERT,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    mats.push(m);
    return m;
  };
  const centres: THREE.Vector3[] = [];
  const items = plans.map((p) => {
    const y = floorAt(d, p.gx, p.gz) * cellM;
    const centre = new THREE.Vector3((p.gx - d.W / 2) * cellM, y, (p.gz - d.H / 2) * cellM);
    centres.push(centre);
    const root = new THREE.Group();
    root.position.copy(centre);
    root.rotation.y = p.yaw;
    root.visible = false;
    const gate = new THREE.Group();
    gate.position.y = RING_Y;
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const disc = new THREE.Mesh(discGeo, shader(DISC_FRAG));
    const glow = new THREE.Mesh(glowGeo, shader(GLOW_FRAG));
    // Transparent parts stay out of the depth-only passes (like the dungeon's water).
    disc.layers.set(SEE_THROUGH);
    glow.layers.set(SEE_THROUGH);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;
    gate.add(ring, disc);
    root.add(gate, glow);
    group.add(root);
    return { root, gate, disc: disc.material as THREE.ShaderMaterial, glow: glow.material as THREE.ShaderMaterial };
  });

  const isOpen = (i: number, t: number) => t >= plans[i].at;
  return {
    plans,
    centres,
    isOpen,
    update(time, runT) {
      items.forEach((it, i) => {
        const age = runT - plans[i].at;
        it.root.visible = age >= 0;
        if (age < 0) return;
        // Opens over 1.2 s with an overshoot, then breathes.
        const k = Math.min(1, age / 1.2);
        const back = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
        const s = Math.max(0.001, back) * (1 + 0.02 * Math.sin(time * 3 + i));
        it.gate.scale.setScalar(s);
        it.gate.rotation.z = time * 0.4;
        it.disc.uniforms.uTime.value = time;
        it.disc.uniforms.uOpen.value = k;
        it.glow.uniforms.uTime.value = time;
        it.glow.uniforms.uOpen.value = k;
      });
    },
    dispose() {
      scene.remove(group);
      ringGeo.dispose();
      ringMat.dispose();
      discGeo.dispose();
      glowGeo.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
