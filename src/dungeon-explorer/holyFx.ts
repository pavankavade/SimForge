// What the spells look like. The cleric's: a glow in the casting hand, a burst of holy light, a ring of
// healing rising round whoever it reaches, a ward of light about him, and a disc of holy ground. The
// wizard's: bolts in flight (mana, ice, fire), the bursts where they land, and lightning for Zap.
// Additive, unlit meshes plus one point light that is always in the scene (lights coming and going
// would recompile every material).
import * as THREE from "three";

export type BurstKind = "light" | "heal" | "smite" | "bless" | "fire" | "frost" | "arcane" | "zap" | "smoke" | "poison";
/** A bolt in flight (world metres), its colour and how big its glow is. */
export interface BoltView {
  x: number;
  y: number;
  z: number;
  color: number;
  size: number;
}

const BURST_COLOR: Record<BurstKind, number> = {
  light: 0xfff6d8,
  heal: 0xffe9a8,
  smite: 0xffc35a,
  bless: 0xfff6d8,
  fire: 0xff8a2a,
  frost: 0x9fe6ff,
  arcane: 0xc79bff,
  zap: 0xb9d8ff,
  smoke: 0x2c2c33,
  poison: 0x86f05a,
};

interface Burst {
  kind: BurstKind;
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
  // The ward: a shell that glows at its rim and is clear where you look straight through it, so it
  // never fogs the view when the camera is close behind him.
  const wardMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0x9fd2ff) }, opacity: { value: 0.5 } },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      varying float vNear;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        // A camera right at the shell (close behind his shoulder) sees it fade away.
        vNear = smoothstep(0.25, 1.1, distance(cameraPosition, wp.xyz));
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying vec3 vN;
      varying vec3 vV;
      varying float vNear;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.5);
        gl_FragColor = vec4(color * rim * opacity * vNear, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const ward = new THREE.Mesh(sphereGeo, wardMat);
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
  // Bolts: a pool of glows (and a fainter one trailing each), shown from the list each frame.
  const boltPool: Array<{ head: THREE.Sprite; tail: THREE.Sprite; fresh: boolean }> = [];
  // Lightning: a jagged line from the staff to what it struck, redrawn every frame while it lasts.
  const ZAP_N = 14;
  const zapGeo = new THREE.BufferGeometry();
  zapGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ZAP_N * 3), 3));
  const zapMat = new THREE.LineBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const zapLine = new THREE.Line(zapGeo, zapMat);
  zapLine.frustumCulled = false;
  zapLine.visible = false;
  root.add(zapLine);
  const zap = { t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };
  // Its jitter: a small generator of its own (lightning flickers differently every frame).
  let seed = 7;
  const jitter = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;

  return {
    /** A spell landing at a point (feet height for heals and blessings, chest height for light). */
    burst(kind: BurstKind, x: number, y: number, z: number) {
      const color = BURST_COLOR[kind];
      // Smoke darkens what is behind it (ordinary blending); everything else is light.
      const mesh =
        kind === "heal" || kind === "bless"
          ? new THREE.Mesh(columnGeo, additive(color, 0.5, columnTex))
          : kind === "smoke"
            ? new THREE.Sprite(new THREE.SpriteMaterial({ color, map: glowTex, transparent: true, opacity: 0.9, depthWrite: false }))
            : glowSprite(color, 1, glowTex);
      const ring = new THREE.Mesh(ringGeo, additive(color, 0.8));
      root.add(mesh, ring);
      const life = kind === "light" ? 0.7 : kind === "fire" ? 0.8 : kind === "smoke" ? 1.1 : kind === "frost" || kind === "poison" ? 0.6 : kind === "smite" || kind === "zap" || kind === "arcane" ? 0.4 : 0.9;
      bursts.push({ kind, x, y, z, t: 0, life, mesh, ring });
      if (kind === "smoke") {
        ring.visible = false;
        return;
      }
      flash = Math.max(flash, kind === "light" || kind === "fire" ? 1 : kind === "smite" || kind === "frost" ? 0.7 : kind === "poison" ? 0.2 : 0.45);
      light.color.setHex(kind === "fire" ? 0xff9a48 : kind === "frost" || kind === "zap" ? 0xbfe0ff : kind === "arcane" ? 0xc9a6ff : kind === "poison" ? 0x86f05a : 0xffe9b0);
      light.position.set(x, y + (kind === "heal" || kind === "bless" ? 1.1 : 0), z);
    },
    /** Lightning from his staff to what it struck (a quarter of a second). */
    zap(from: THREE.Vector3, to: THREE.Vector3) {
      zap.t = 0.25;
      zap.from.copy(from);
      zap.to.copy(to);
      flash = Math.max(flash, 0.8);
      light.color.setHex(0xbfe0ff);
      light.position.copy(to);
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
      ground: { x: number; y: number; z: number; r: number; left: number } | null,
      bolts: BoltView[] = []
    ) {
      time += dt;
      while (boltPool.length < bolts.length) {
        const head = glowSprite(0xffffff, 1, glowTex);
        const tail = glowSprite(0xffffff, 0.45, glowTex);
        root.add(head, tail);
        boltPool.push({ head, tail, fresh: true });
      }
      boltPool.forEach((p, i) => {
        const b = bolts[i];
        p.head.visible = p.tail.visible = !!b;
        if (!b) {
          p.fresh = true;
          return;
        }
        const flicker = 1 + 0.12 * Math.sin(time * 40 + i * 2);
        p.head.material.color.setHex(b.color);
        p.tail.material.color.setHex(b.color);
        p.head.scale.setScalar(b.size * flicker);
        p.head.position.set(b.x, b.y, b.z);
        // The tail eases after the head, so it trails behind along the path.
        if (p.fresh) p.tail.position.copy(p.head.position);
        else p.tail.position.lerp(p.head.position, Math.min(1, dt * 12));
        p.fresh = false;
        p.tail.scale.setScalar(b.size * 1.5);
      });
      zapLine.visible = zap.t > 0;
      if (zap.t > 0) {
        zap.t -= dt;
        const pos = zapGeo.attributes.position as THREE.BufferAttribute;
        const len = zap.from.distanceTo(zap.to);
        for (let k = 0; k < ZAP_N; k++) {
          const u = k / (ZAP_N - 1);
          const j = k === 0 || k === ZAP_N - 1 ? 0 : 0.06 + 0.03 * len;
          pos.setXYZ(
            k,
            zap.from.x + (zap.to.x - zap.from.x) * u + jitter() * j,
            zap.from.y + (zap.to.y - zap.from.y) * u + jitter() * j,
            zap.from.z + (zap.to.z - zap.from.z) * u + jitter() * j
          );
        }
        pos.needsUpdate = true;
        zapMat.opacity = Math.max(0, zap.t / 0.25);
      }
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
        wardMat.uniforms.opacity.value = 0.2 + 0.3 * wardK + 0.06 * Math.sin(time * 5);
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
          const r = b.kind === "light" ? 2.2 : b.kind === "fire" ? 2.5 : b.kind === "smoke" ? 1.1 : b.kind === "frost" ? 0.9 : b.kind === "poison" ? 0.45 : 0.7;
          b.mesh.position.set(b.x, b.y, b.z);
          // A sprite's scale is its full width: twice the radius, and a bit for the soft edge.
          b.mesh.scale.setScalar(2.6 * r * (0.3 + 0.7 * Math.sqrt(u)));
          mm.opacity = fade * fade;
          b.ring.position.set(b.x, b.y - (b.kind === "light" || b.kind === "fire" ? 1.0 : 0.6), b.z);
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
      if (flash <= 0) {
        if (cast) {
          light.position.copy(cast.at);
          light.color.set(cast.color);
        } else if (bolts.length) {
          // The first bolt in flight lights the walls it passes.
          light.position.set(bolts[0].x, bolts[0].y, bolts[0].z);
          light.color.setHex(bolts[0].color);
        }
      }
      light.intensity = 14 * Math.max(flash * flash, glow, bolts.length ? 0.3 : 0);
    },
    dispose() {
      scene.remove(root);
      for (const b of bursts) {
        (b.mesh.material as THREE.Material).dispose();
        (b.ring.material as THREE.Material).dispose();
      }
      for (const m of [hand, ward, holyDisc, holyRing, holyColumn]) (m.material as THREE.Material).dispose();
      for (const p of boltPool) {
        p.head.material.dispose();
        p.tail.material.dispose();
      }
      zapGeo.dispose();
      zapMat.dispose();
      for (const g of [sphereGeo, ringGeo, discGeo, columnGeo]) g.dispose();
      glowTex.dispose();
      columnTex.dispose();
    },
  };
}

export type HolyFx = ReturnType<typeof createHolyFx>;
