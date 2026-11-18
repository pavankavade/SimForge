// A slime's body, made in code: a clear, wobbling jelly with its mana crystal floating inside (the
// heart that drops when it dies). Driven from the simulation: it squats, hops and lands (it only
// travels in the air), stretches into a lunge, shudders when cut, and slumps into a puddle when it
// dies, the crystal sinking to the floor.
import * as THREE from "three";
import { SEE_THROUGH } from "../dungeon/view";
import type { MobAgent } from "../mobSim";
import { crystalMesh, glowTexture } from "./props";

const HOP_AIR: [number, number] = [0.22, 0.82];

let blobGeo: THREE.BufferGeometry | null = null;
/** A drop of jelly about a slime's size (0.84 m across, 0.62 m tall), its base on y = 0. */
function blobGeometry(): THREE.BufferGeometry {
  if (blobGeo) return blobGeo;
  const g = new THREE.SphereGeometry(1, 40, 28);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i);
    // Sag: the bottom spreads flat on the floor, the top stays round.
    if (y < -0.35) y = -0.35 + (y + 0.35) * 0.25;
    const spread = y < 0 ? 1 + 0.12 * (1 - (y + 0.5125) / 0.5125) : 1;
    p.setXYZ(i, p.getX(i) * spread, y, p.getZ(i) * spread);
  }
  g.translate(0, 0.5125, 0);
  g.scale(0.42, 0.62 / 1.5125, 0.42);
  g.computeVertexNormals();
  blobGeo = g;
  return g;
}

let discGeo: THREE.BufferGeometry | null = null;
const contactDisc = () => (discGeo ??= new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2));

export interface SlimeBody {
  group: THREE.Group;
  /** Dress it for a monster (colour, size, its heart's rarity). */
  bind: (m: MobAgent) => void;
  update: (dt: number, m: MobAgent, time: number) => void;
  dispose: () => void;
}

export function createSlimeBody(): SlimeBody {
  const group = new THREE.Group();
  group.name = "slime";
  const uniforms = { uTime: { value: 0 }, uWobble: { value: 1 }, uRim: { value: new THREE.Color(0x5fd06a) } };
  // The jelly quivers (a few slow waves over the surface, the base held to the floor), and its
  // edges catch the light: brighter and more solid where the surface turns away from the eye.
  const jellyShader = (rim: boolean) => (sh: THREE.WebGLProgramParametersWithUniforms) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uWobble = uniforms.uWobble;
    sh.uniforms.uRim = uniforms.uRim;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWobble;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float wk = smoothstep(0.0, 0.18, position.y) * uWobble;
        transformed += normal * wk * (sin(position.y * 13.0 + uTime * 4.3) * 0.009 + sin(position.x * 11.0 - uTime * 3.1) * 0.007 + sin(position.z * 12.0 + uTime * 2.7) * 0.006);`
      );
    if (!rim) return;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRim;")
      .replace(
        "#include <opaque_fragment>",
        `float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
        outgoingLight += uRim * fres * 0.55;
        diffuseColor.a = clamp(diffuseColor.a * (0.7 + fres * 1.1), 0.0, 0.95);
        #include <opaque_fragment>`
      );
  };
  const inner = new THREE.MeshStandardMaterial({ color: 0x245a2a, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.42, side: THREE.BackSide, depthWrite: false });
  const outer = new THREE.MeshPhysicalMaterial({
    color: 0x5fd06a,
    emissive: 0x5fd06a,
    emissiveIntensity: 0.06,
    roughness: 0.18,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  inner.onBeforeCompile = jellyShader(false);
  outer.onBeforeCompile = jellyShader(true);
  // Shared program keys, so every slime reuses the same two shaders.
  inner.customProgramCacheKey = () => "slime-inner";
  outer.customProgramCacheKey = () => "slime-outer";

  const body = new THREE.Group();
  const back = new THREE.Mesh(blobGeometry(), inner);
  const front = new THREE.Mesh(blobGeometry(), outer);
  back.renderOrder = 2;
  front.renderOrder = 3;
  body.add(back, front);
  group.add(body);

  // The heart: the mana crystal inside, with a soft glow round it.
  let heart: THREE.Mesh = crystalMesh("common");
  heart.renderOrder = 1;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x7fffb0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.renderOrder = 4;
  group.add(heart, halo);

  // A dark smudge under it so it sits on the floor (it is not in the depth pass for contact shade).
  const shade = new THREE.Mesh(contactDisc(), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
  shade.position.y = 0.012;
  shade.renderOrder = 1;
  group.add(shade);

  for (const o of [back, front, halo, shade]) o.layers.set(SEE_THROUGH);
  heart.layers.set(SEE_THROUGH);

  let size = 1;
  let rarity = "";
  const tint = new THREE.Color();
  let phase = 0;

  return {
    group,
    bind(m) {
      size = m.scale;
      group.scale.setScalar(size);
      tint.setHex(m.kind.glow);
      outer.color.copy(tint);
      outer.emissive.copy(tint);
      uniforms.uRim.value.copy(tint).lerp(new THREE.Color(1, 1, 1), 0.35);
      inner.color.copy(tint).multiplyScalar(0.38);
      halo.material.color.copy(tint).lerp(new THREE.Color(1, 1, 1), 0.3);
      if (rarity !== m.rarity) {
        rarity = m.rarity;
        group.remove(heart);
        heart = crystalMesh(m.rarity);
        heart.renderOrder = 1;
        heart.layers.set(SEE_THROUGH);
        group.add(heart);
      }
      phase = (m.id * 0.618) % 1;
      outer.opacity = 0.5;
      inner.opacity = 0.42;
      group.visible = true;
    },
    update(dt, m, time) {
      uniforms.uTime.value = time + phase * 10;
      group.position.set(m.wx, m.wy, m.wz);
      group.rotation.y = m.yaw;
      let sy = 1;
      let sxz = 1;
      let lift = 0;
      let lean = 0;
      if (m.dead) {
        // Slumping into a puddle; the heart sinks and lies on the floor.
        const k = Math.min(1, m.deadT / 0.8);
        const e = 1 - (1 - k) * (1 - k);
        sy = 1 - 0.86 * e;
        sxz = 1 + 0.55 * e;
        uniforms.uWobble.value = 1 - 0.7 * e;
        outer.opacity = 0.5 - 0.18 * e;
        inner.opacity = 0.42 - 0.2 * e;
      } else {
        uniforms.uWobble.value = 1;
        const u = m.hopU;
        const moving = Math.hypot(m.vx, m.vz) > 0.05;
        if (m.lungeT > 0) {
          // The lunge: a long stretched leap at him.
          const t = 1 - m.lungeT / 0.5;
          lift = Math.sin(Math.PI * Math.min(1, t * 1.25)) * 0.32;
          sy = 0.85 + 0.25 * Math.sin(Math.PI * t);
          sxz = 1.05;
          lean = 0.35 * Math.sin(Math.PI * t);
        } else if (moving || u > 0.02) {
          if (u < HOP_AIR[0]) {
            const k = Math.sin((Math.PI * u) / HOP_AIR[0]);
            sy = 1 - 0.22 * k;
            sxz = 1 + 0.12 * k;
          } else if (u < HOP_AIR[1]) {
            const k = (u - HOP_AIR[0]) / (HOP_AIR[1] - HOP_AIR[0]);
            lift = Math.sin(Math.PI * k) * 0.26;
            sy = 1 + 0.14 * Math.sin(Math.PI * Math.min(1, k * 2));
            sxz = 1 - 0.06 * Math.sin(Math.PI * Math.min(1, k * 2));
          } else {
            const k = Math.sin((Math.PI * (u - HOP_AIR[1])) / (1 - HOP_AIR[1]));
            sy = 1 - 0.18 * k;
            sxz = 1 + 0.1 * k;
          }
        }
        // Breathing, and a shudder when cut.
        sy *= 1 + 0.035 * Math.sin(time * 2.6 + phase * 6) - m.flinch * 0.9;
        sxz *= 1 + m.flinch * 0.6;
      }
      body.position.y = lift;
      body.scale.set(sxz, sy, sxz);
      body.rotation.x = lean;
      shade.scale.setScalar(Math.max(0.5, 1.15 - lift * 1.5) * sxz);
      // The heart rides in the middle of the jelly, turning slowly; dead, it rests on the floor.
      const hy = m.dead ? Math.max(0.03, 0.3 * sy) : lift + 0.24 * sy;
      heart.position.set(0, hy, 0);
      heart.rotation.set(m.dead ? 1.3 : 0.2 * Math.sin(time * 0.7 + phase), time * 0.8 + phase * 6, 0);
      heart.scale.setScalar(1.5);
      halo.position.set(0, hy + 0.06, 0);
      halo.scale.setScalar(0.36 * (1 + 0.1 * Math.sin(time * 3 + phase * 5)));
      void dt;
    },
    dispose() {
      group.removeFromParent();
      inner.dispose();
      outer.dispose();
      halo.material.dispose();
      (shade.material as THREE.Material).dispose();
    },
  };
}
