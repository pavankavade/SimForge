// What the cleric's spells look like: a glow in the casting hand, a burst of holy light, a ring of
// healing rising round whoever it reaches, a ward of light about him, and a disc of holy ground.
// Additive, unlit meshes plus one point light that is always in the scene (lights coming and going
// would recompile every material).
import * as THREE from "three";

interface Burst {
  kind: "light" | "heal" | "smite" | "bless";
  x: number;
  y: number;
  z: number;
  t: number;
  life: number;
  mesh: THREE.Mesh | THREE.Sprite;
  ring: THREE.Mesh;
}

const additive = (color: number, opacity: number, map?: THREE.Texture) =>
  new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
const glowSprite = (color: number, opacity: number, map: THREE.Texture) =>
  new THREE.Sprite(new THREE.SpriteMaterial({ color, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));

/** A soft round glow (white in the middle, gone at the edge). */
function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.75)");
    grad.addColorStop(0.6, "rgba(255,255,255,0.2)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A column's light: strong at the floor, gone at the top. */
function columnTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createLinearGradient(0, 64, 0, 0);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createHolyFx(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "holy-fx";
  scene.add(root);
  const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
  const ringGeo = new THREE.RingGeometry(0.82, 1, 48, 1);
  ringGeo.rotateX(-Math.PI / 2);
  const discGeo = new THREE.CircleGeometry(1, 48);
  discGeo.rotateX(-Math.PI / 2);
  const columnGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
  columnGeo.translate(0, 0.5, 0);
  const glowTex = glowTexture();
  const columnTex = columnTexture();

  const light = new THREE.PointLight(0xffe9b0, 0, 9, 1.6);
  root.add(light);
  const hand = glowSprite(0xfff0c0, 0.95, glowTex);
  hand.visible = false;
  root.add(hand);
  const ward = new THREE.Mesh(sphereGeo, additive(0x9fd2ff, 0.08));
  ward.visible = false;
  root.add(ward);
  const holy = new THREE.Group();
  const holyDisc = new THREE.Mesh(discGeo, additive(0xffd77a, 0.22));
  const holyRing = new THREE.Mesh(ringGeo, additive(0xffe7a0, 0.6));
  const holyColumn = new THREE.Mesh(columnGeo, additive(0xffe7a0, 0.07, columnTex));
  holy.add(holyDisc, holyRing, holyColumn);
  holy.visible = false;
  root.add(holy);
  const bursts: Burst[] = [];
  let time = 0;
  let flash = 0;

  return {
    /** A spell landing at a point (feet height for heals and blessings, chest height for light). */
    burst(kind: Burst["kind"], x: number, y: number, z: number) {
      const color = kind === "heal" ? 0xffe9a8 : kind === "bless" ? 0xfff6d8 : kind === "smite" ? 0xffc35a : 0xfff6d8;
      const mesh = kind === "heal" || kind === "bless" ? new THREE.Mesh(columnGeo, additive(color, 0.5, columnTex)) : glowSprite(color, 1, glowTex);
      const ring = new THREE.Mesh(ringGeo, additive(color, 0.8));
      root.add(mesh, ring);
      bursts.push({ kind, x, y, z, t: 0, life: kind === "light" ? 0.7 : kind === "smite" ? 0.45 : 0.9, mesh, ring });
      flash = Math.max(flash, kind === "light" ? 1 : kind === "smite" ? 0.7 : 0.45);
      light.position.set(x, y + (kind === "light" || kind === "smite" ? 0 : 1.1), z);
    },
    /**
     * Each frame: the casting glow at his hand (u = 0..1 of the cast, or null), his ward (strength
     * 0..1, or 0 for none) at his chest, and holy ground at its spot (or null).
     */
    update(
      dt: number,
      cast: { at: THREE.Vector3; u: number; color: string } | null,
      wardAt: THREE.Vector3 | null,
      wardK: number,
      ground: { x: number; y: number; z: number; r: number; left: number } | null
    ) {
      time += dt;
      hand.visible = !!cast;
      if (cast) {
        hand.position.copy(cast.at);
        hand.scale.setScalar(0.16 + 0.22 * cast.u + 0.03 * Math.sin(time * 30));
        hand.material.color.set(cast.color);
      }
      ward.visible = !!wardAt && wardK > 0;
      if (wardAt && wardK > 0) {
        ward.position.copy(wardAt);
        ward.scale.set(0.62, 1.05, 0.62);
        (ward.material as THREE.MeshBasicMaterial).opacity = 0.03 + 0.05 * wardK + 0.015 * Math.sin(time * 5);
      }
      holy.visible = !!ground;
      if (ground) {
        holy.position.set(ground.x, ground.y + 0.03, ground.z);
        holy.scale.set(ground.r, 1, ground.r);
        holyColumn.scale.set(1, 2.4, 1);
        const fade = Math.min(1, ground.left / 0.8);
        (holyDisc.material as THREE.MeshBasicMaterial).opacity = (0.16 + 0.06 * Math.sin(time * 3)) * fade;
        (holyRing.material as THREE.MeshBasicMaterial).opacity = 0.35 * fade;
        (holyColumn.material as THREE.MeshBasicMaterial).opacity = 0.18 * fade;
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.t += dt;
        const u = Math.min(1, b.t / b.life);
        const fade = 1 - u;
        const mm = b.mesh.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
        const rm = b.ring.material as THREE.MeshBasicMaterial;
        if (b.kind === "heal" || b.kind === "bless") {
          // A column of light round him, the ring climbing it.
          b.mesh.position.set(b.x, b.y, b.z);
          b.mesh.scale.set(0.55, 2.2 * (0.4 + 0.6 * Math.min(1, u * 3)), 0.55);
          mm.opacity = 0.45 * fade;
          b.ring.position.set(b.x, b.y + 0.1 + 1.7 * u, b.z);
          b.ring.scale.setScalar(0.6 - 0.2 * u);
          rm.opacity = 0.8 * fade;
        } else {
          // A ball of light swelling and fading, a ring running out along the floor.
          const r = b.kind === "light" ? 2.2 : 0.7;
          b.mesh.position.set(b.x, b.y, b.z);
          // A sprite's scale is its full width: twice the radius, and a bit for the soft edge.
          b.mesh.scale.setScalar(2.6 * r * (0.3 + 0.7 * Math.sqrt(u)));
          mm.opacity = fade * fade;
          b.ring.position.set(b.x, b.y - (b.kind === "light" ? 1.0 : 0.6), b.z);
          b.ring.scale.setScalar(r * (0.3 + 0.9 * u));
          rm.opacity = 0.8 * fade;
        }
        if (u >= 1) {
          root.remove(b.mesh, b.ring);
          mm.dispose();
          rm.dispose();
          bursts.splice(i, 1);
        }
      }
      flash = Math.max(0, flash - dt * 2.2);
      const glow = cast ? 0.6 * cast.u : 0;
      if (cast && flash <= 0) light.position.copy(cast.at);
      light.intensity = 14 * Math.max(flash * flash, glow);
    },
    dispose() {
      scene.remove(root);
      for (const b of bursts) {
        (b.mesh.material as THREE.Material).dispose();
        (b.ring.material as THREE.Material).dispose();
      }
      for (const m of [hand, ward, holyDisc, holyRing, holyColumn]) (m.material as THREE.Material).dispose();
      for (const g of [sphereGeo, ringGeo, discGeo, columnGeo]) g.dispose();
      glowTex.dispose();
      columnTex.dispose();
    },
  };
}

export type HolyFx = ReturnType<typeof createHolyFx>;
