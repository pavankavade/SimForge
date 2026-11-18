// The inventory's own picture of the fighter (Dark and Darker style): a second copy of him in a
// little scene of its own (no dungeon behind, no fight), wearing his whole kit, drawn into the
// inventory's character box on top of the live game. The game keeps playing under the inventory,
// so the player can walk about with it open; this copy only stands, breathes and turns.
import * as THREE from "three";
import { ARMOR_SLOTS, createPaladin, type ArmorEquipment, type HumanSpec, type Paladin } from "../artifacts/characters/paladin";

/** A box on the page (CSS pixels from the top left of the window). */
export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Portrait {
  /** Who he is: a new spec rebuilds the copy (the old one stays up until it is ready). */
  setSpec: (spec: HumanSpec) => void;
  /**
   * Draw him into `rect` over what is on the canvas: `kit` is what he wears, `spin` turns him
   * (radians), `zoom` 1 is the whole body.
   */
  render: (rect: ScreenRect, kit: ArmorEquipment, dt: number, spin: number, zoom: number) => void;
  dispose: () => void;
}

export function createPortrait(gl: THREE.WebGLRenderer): Portrait {
  const scene = new THREE.Scene();
  // Lit like a figure on a dark stage: warm key from the front left, a cool rim from behind.
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x1a1410, 1.1));
  const key = new THREE.DirectionalLight(0xffe2bc, 2.6);
  key.position.set(1.6, 2.6, 2.4);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 1.8);
  rim.position.set(-1.8, 2.2, -2.2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-2, 1, 2);
  scene.add(key, rim, fill);
  // A pool of light on a dark floor under his feet.
  const floorTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (g) {
      const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grad.addColorStop(0, "rgba(120,96,64,0.9)");
      grad.addColorStop(0.55, "rgba(50,40,28,0.6)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  })();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.position.y = 0.002;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 20);

  let body: Paladin | null = null;
  let building = 0;
  let disposed = false;
  let worn = "";
  const clear = new THREE.Color(0x0c0a08);

  return {
    setSpec(spec) {
      const serial = ++building;
      createPaladin(gl, { character: spec })
        .then((p) => {
          if (disposed || serial !== building) {
            p.dispose();
            return;
          }
          p.materials.setEnvIntensity(0.6);
          if (body) {
            scene.remove(body.group);
            body.dispose();
          }
          body = p;
          worn = "";
          scene.add(p.group);
        })
        .catch((err: unknown) => console.error("portrait failed to build", err));
    },

    render(rect, kit, dt, spin, zoom) {
      if (!body || rect.width < 8 || rect.height < 8) return;
      const key2 = ARMOR_SLOTS.map((s) => (kit[s] ? 1 : 0)).join("");
      if (key2 !== worn) {
        worn = key2;
        for (const s of ARMOR_SLOTS) body.setEquipped(s, kit[s]);
      }
      // Standing at ease, breathing (with his weapons in a loose guard, or hands at his sides).
      body.update(
        dt,
        { moveX: 0, moveZ: 0, aimPitch: 0, turnRate: 0, air: 0, block: false, attack: false, firstPerson: false, relaxed: !kit.sword && !kit.shield },
        0
      );
      body.group.rotation.y = spin;

      const size = gl.getSize(new THREE.Vector2());
      camera.aspect = rect.width / rect.height;
      // The whole body fills the height at zoom 1; closer zooms frame the chest and face.
      const z = Math.max(0.35, Math.min(1.1, zoom));
      const fill2 = 1.14 * z;
      const dist = fill2 / Math.tan((camera.fov * Math.PI) / 360);
      const lookY = 0.98 + (1 - z) * 0.62;
      camera.position.set(0, lookY + 0.05, dist);
      camera.lookAt(0, lookY, 0);
      camera.updateProjectionMatrix();

      // Into the box only, straight to the screen, tone-mapped like the rest of the game.
      const prevTone = gl.toneMapping;
      const prevSpace = gl.outputColorSpace;
      const prevAuto = gl.autoClear;
      const prevClear = gl.getClearColor(new THREE.Color());
      const prevAlpha = gl.getClearAlpha();
      gl.setRenderTarget(null);
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1;
      gl.outputColorSpace = THREE.SRGBColorSpace;
      const y = size.y - (rect.top + rect.height);
      gl.setViewport(rect.left, y, rect.width, rect.height);
      gl.setScissor(rect.left, y, rect.width, rect.height);
      gl.setScissorTest(true);
      gl.setClearColor(clear, 1);
      gl.autoClear = false;
      gl.clear(true, true, false);
      gl.render(scene, camera);
      gl.setScissorTest(false);
      gl.setViewport(0, 0, size.x, size.y);
      gl.setClearColor(prevClear, prevAlpha);
      gl.autoClear = prevAuto;
      gl.toneMapping = prevTone;
      gl.outputColorSpace = prevSpace;
    },

    dispose() {
      disposed = true;
      if (body) {
        scene.remove(body.group);
        body.dispose();
        body = null;
      }
      floorTex.dispose();
      (floor.material as THREE.Material).dispose();
      floor.geometry.dispose();
    },
  };
}
