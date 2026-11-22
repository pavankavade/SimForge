// The lobby's picture (Dark and Darker style): one dark tavern corner with a round table, four
// chairs and candles, the fighter sitting at the far side facing the camera and his party in the
// other chairs. It is its own small three.js scene on its own canvas: the town and the dungeon are
// not built while he is in the lobby. On the class screen it draws only him, standing, into the
// frame left of the class panel; on the stash tab it also draws him into the inventory's box.
import * as THREE from "three";
import { ARMOR_SLOTS, createPaladin, type ArmorEquipment, type ArmorSlot, type HumanSpec, type Paladin } from "../../artifacts/characters/paladin";
import { makeMasonry, makeWood } from "../../engine/textures";
import { createPortrait, type Portrait, type ScreenRect } from "../portrait";
import { placeModel } from "../props3d";

/** Someone else at the table: a party member, drawn as he looks in the game. */
export interface Guest {
  id: string;
  spec: HumanSpec;
  eq: ArmorEquipment;
}

export type StageMode = "table" | "class";

export interface LobbyStage {
  /** Who he is (a new spec rebuilds him) and what he wears. */
  setHero: (spec: HumanSpec, kit: ArmorEquipment) => void;
  /** The table, or (class screen) only him, standing, framed in `frame`. */
  setMode: (mode: StageMode, frame: ScreenRect) => void;
  /** The three other chairs: left, right and the near one (null: empty). */
  setGuests: (guests: Array<Guest | null>) => void;
  /** Also draw him into this box (the stash tab's inventory), or not (null); `view` is read every frame. */
  setPortrait: (rect: ScreenRect | null, view: { spin: number; zoom: number }) => void;
  /**
   * Elements that follow the table: [0] over his head, [1..3] over the other chairs. Each is moved
   * (CSS transform) every frame; hidden while the table is not drawn.
   */
  setAnchors: (els: Array<HTMLElement | null>) => void;
  dispose: () => void;
}

export interface StageOptions {
  onBusy?: (busy: boolean) => void;
  onIcons?: (icons: Partial<Record<ArmorSlot, string>>) => void;
}

/** Table and chairs (metres): the table at the origin, his chair on the far side (-z). */
const TABLE_R = 0.66;
const TABLE_Y = 0.76;
const SEAT_R = 1.02;
const SEAT_Y = 0.46;
/** Hip height sitting on these chairs (the animator's seat height). */
const HIP_SEAT = 0.52;
/** His chair, then left, right and the near one: position and the way the sitter faces. */
const SEATS: Array<{ x: number; z: number; yaw: number }> = [
  { x: 0, z: -SEAT_R, yaw: 0 },
  { x: -SEAT_R, z: 0.05, yaw: Math.PI / 2 },
  { x: SEAT_R, z: 0.05, yaw: -Math.PI / 2 },
  { x: 0, z: SEAT_R + 0.08, yaw: Math.PI },
];

const SIT = { moveX: 0, moveZ: 0, aimPitch: -0.12, turnRate: 0, air: 0, block: false, attack: false, firstPerson: false, relaxed: true, stance: "sit" as const, seatY: HIP_SEAT, arms: "knees" as const };

/** A soft round glow (candle flames, the lantern's halo). */
function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(32, 32, 1, 32, 32, 32);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.35, outer);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createLobbyStage(canvas: HTMLCanvasElement, opts: StageOptions = {}): LobbyStage {
  const gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  gl.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.05;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07060a);
  scene.fog = new THREE.Fog(0x07060a, 4.5, 9);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 40);

  const owned: Array<{ dispose: () => void }> = [];
  const own = <T extends { dispose: () => void }>(x: T): T => {
    owned.push(x);
    return x;
  };
  const surf = (set: { map: THREE.Texture | null; normalMap: THREE.Texture | null; roughnessMap: THREE.Texture | null }, repeat: [number, number]) => {
    for (const t of [set.map, set.normalMap, set.roughnessMap]) {
      if (!t) continue;
      t.repeat.set(repeat[0], repeat[1]);
      own(t);
    }
    return own(new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, roughness: 0.85 }));
  };
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(own(geo), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // ---- The room: plank floor, a stone wall behind him, a timber post either side ----------------
  const floorMat = surf(makeWood({ size: 512, planks: 7, base: "#3a2616", baseAlt: "#45301c", seam: "#140c06", seed: 11 }), [3, 3]);
  const floor = mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), floorMat, 0, 0, 0);
  floor.castShadow = false;
  const wallMat = surf(makeMasonry({ size: 512, rows: 8, cols: 4, base: "#3b342c", baseAlt: "#2f2923", mortar: "#15110d", seed: 5 }), [3, 1.6]);
  const wall = mesh(new THREE.PlaneGeometry(10, 5), wallMat, 0, 2.5, -2.7);
  wall.castShadow = false;
  const beamMat = surf(makeWood({ size: 256, planks: 2, base: "#2a1a0e", baseAlt: "#301e10", seam: "#0d0804", seed: 4 }), [1, 2]);
  mesh(new THREE.BoxGeometry(0.28, 4, 0.28), beamMat, -2.35, 2, -2.5);
  mesh(new THREE.BoxGeometry(0.28, 4, 0.28), beamMat, 2.35, 2, -2.5);
  mesh(new THREE.BoxGeometry(5.2, 0.26, 0.3), beamMat, 0, 3.05, -2.5);
  const alive = () => !disposed;
  // Barrels and a shelf in the shadows, a lantern on the wall.
  void placeModel(scene, "market/wine_barrel_01", [-2.05, 0, -1.95], { scale: 0.95, yaw: 0.4 }, alive);
  void placeModel(scene, "market/wine_barrel_01", [-2.7, 0, -1.2], { scale: 0.9, yaw: 1.3 }, alive);
  void placeModel(scene, "market/painted_wooden_shelves", [2.15, 0, -2.45], { scale: 1.15 }, alive);
  void placeModel(scene, "market/brass_goblets", [2.0, 1.12, -2.4], { scale: 0.7 }, alive);
  void placeModel(scene, "rooms/wooden_lantern_01", [-1.25, 1.95, -2.55], {}, alive);

  // ---- The table: a round top on a turned pedestal ----------------------------------------------
  const tableMat = surf(makeWood({ size: 512, planks: 5, base: "#6a4426", baseAlt: "#76502c", seam: "#2a180b", seed: 8 }), [1, 1]);
  const darkWood = surf(makeWood({ size: 256, planks: 3, base: "#4a2e18", baseAlt: "#53351c", seam: "#1d1108", seed: 9 }), [1, 1]);
  mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.06, 48), tableMat, 0, TABLE_Y - 0.03, 0);
  mesh(new THREE.TorusGeometry(TABLE_R, 0.022, 8, 48).rotateX(Math.PI / 2), darkWood, 0, TABLE_Y - 0.035, 0);
  mesh(new THREE.CylinderGeometry(0.09, 0.13, TABLE_Y - 0.1, 16), darkWood, 0, (TABLE_Y - 0.06) / 2, 0);
  for (let i = 0; i < 4; i++) {
    const foot = mesh(new THREE.BoxGeometry(0.62, 0.06, 0.08), darkWood, 0, 0.03, 0);
    foot.rotation.y = (i * Math.PI) / 4 + Math.PI / 8;
  }
  // On it: goblets, a plate and bread, two candles.
  void placeModel(scene, "market/brass_goblets", [0.36, TABLE_Y, -0.18], { scale: 0.55, yaw: 0.6 }, alive);
  void placeModel(scene, "market/brass_goblets", [-0.38, TABLE_Y, 0.16], { scale: 0.55, yaw: 2.2 }, alive);
  void placeModel(scene, "rooms/carved_wooden_plate", [0.02, TABLE_Y, 0.08], { scale: 0.7 }, alive);
  void placeModel(scene, "rooms/food_apple_01", [0.06, TABLE_Y + 0.03, 0.06], {}, alive);
  void placeModel(scene, "market/wooden_bowl_01", [-0.2, TABLE_Y, -0.3], { scale: 0.7 }, alive);

  const wax = own(new THREE.MeshStandardMaterial({ color: 0xeee2c6, roughness: 0.6, emissive: 0x3a2208, emissiveIntensity: 0.4 }));
  const flameTex = own(glowTexture("rgba(255,250,220,1)", "rgba(255,150,40,0.55)"));
  const flameMat = own(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  const flames: Array<{ sprite: THREE.Sprite; light: THREE.PointLight; phase: number; base: number }> = [];
  const candle = (x: number, z: number, h: number, power: number, phase: number) => {
    mesh(new THREE.CylinderGeometry(0.019, 0.022, h, 12), wax, x, TABLE_Y + h / 2, z);
    const sprite = new THREE.Sprite(flameMat);
    sprite.position.set(x, TABLE_Y + h + 0.03, z);
    sprite.scale.set(0.09, 0.14, 1);
    scene.add(sprite);
    const light = new THREE.PointLight(0xffa04a, power, 5, 1.6);
    light.position.set(x, TABLE_Y + h + 0.08, z);
    scene.add(light);
    flames.push({ sprite, light, phase, base: power });
  };
  candle(-0.14, 0.22, 0.16, 2.4, 0);
  candle(0.22, 0.12, 0.11, 1.8, 2.1);
  // The lantern's halo and a little warm light on the wall.
  const halo = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: own(glowTexture("rgba(255,200,120,0.9)", "rgba(255,120,30,0.25)")), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })));
  halo.position.set(-1.25, 1.75, -2.4);
  halo.scale.set(0.7, 0.7, 1);
  scene.add(halo);
  const lanternLight = new THREE.PointLight(0xff9a40, 2.2, 4, 1.8);
  lanternLight.position.set(-1.25, 1.75, -2.2);
  scene.add(lanternLight);

  // ---- Light: candles, a warm key from above the table, a cold window fill from the left ---------
  scene.add(new THREE.HemisphereLight(0x5a4a3c, 0x0a0806, 0.35));
  const key = new THREE.SpotLight(0xffd2a0, 26, 9, 0.62, 0.65, 1.6);
  key.position.set(0.4, 3.4, 1.2);
  key.target.position.set(0, 0.7, -0.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const cold = new THREE.DirectionalLight(0x7f9cff, 0.55);
  cold.position.set(-4, 2.6, 1.5);
  scene.add(cold);

  // ---- The chairs: seat, legs, a slatted back (the back away from the table) ----------------------
  const chair = (s: { x: number; z: number; yaw: number }) => {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.yaw;
    mesh(new THREE.BoxGeometry(0.46, 0.05, 0.44), darkWood, 0, SEAT_Y, -0.02, g);
    for (const [lx, lz] of [
      [-0.2, 0.17],
      [0.2, 0.17],
      [-0.2, -0.21],
      [0.2, -0.21],
    ])
      mesh(new THREE.BoxGeometry(0.045, SEAT_Y, 0.045), darkWood, lx, SEAT_Y / 2, lz, g);
    for (const px of [-0.2, 0.2]) mesh(new THREE.BoxGeometry(0.05, 0.58, 0.05), darkWood, px, SEAT_Y + 0.29, -0.22, g);
    for (const py of [0.2, 0.38, 0.54]) mesh(new THREE.BoxGeometry(0.42, 0.06, 0.03), darkWood, 0, SEAT_Y + py, -0.225, g);
    scene.add(g);
  };
  for (const s of SEATS) chair(s);

  // ---- Who sits there -------------------------------------------------------------------------------
  let disposed = false;
  let hero: Paladin | null = null;
  let heroKey = "";
  let heroKit: ArmorEquipment | null = null;
  let heroSerial = 0;
  let iconsDone = false;
  const wear = (p: Paladin, kit: ArmorEquipment) => {
    for (const s of ARMOR_SLOTS) p.setEquipped(s, kit[s]);
  };
  const seat = (p: Paladin, i: number) => {
    const s = SEATS[i];
    p.group.position.set(s.x, 0, s.z);
    p.group.rotation.set(0, s.yaw, 0);
    // Settle into the chair at once (no standing up and sitting down on every build).
    for (let k = 0; k < 30; k++) p.update(1 / 30, SIT, 0);
  };
  const guests: Array<{ key: string; body: Paladin | null; serial: number }> = [0, 1, 2].map(() => ({ key: "", body: null, serial: 0 }));

  const portrait: Portrait = createPortrait(gl);
  let portraitRect: ScreenRect | null = null;
  let portraitView = { spin: 0, zoom: 1 };
  let mode: StageMode = "table";
  let classFrame: ScreenRect = { left: 0, top: 0, width: 1, height: 1 };
  let anchors: Array<HTMLElement | null> = [];

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    gl.setSize(w, h, false);
    camera.aspect = w / h;
    // Hold the table and the chairs either side across the width, whatever the shape of the window.
    const vt = Math.tan((camera.fov * Math.PI) / 360);
    // A little above the near chair, looking down across the table at him: the near chair's back
    // shows along the bottom of the frame.
    // On an upright phone the side chairs go partly out of frame rather than everything shrinking.
    const dist = Math.max(3.25, Math.min(5.4, 1.8 / (vt * camera.aspect)));
    const fog = scene.fog as THREE.Fog;
    fog.near = dist + 1.4;
    fog.far = dist + 6;
    const dir = new THREE.Vector3(0, 0.56, 1).normalize();
    const look = new THREE.Vector3(0, 0.8, 0.02);
    camera.position.copy(look).addScaledVector(dir, dist);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    for (const f of flames) {
      const k = 0.82 + 0.12 * Math.sin(t * 9.3 + f.phase) + 0.08 * Math.sin(t * 23.1 + f.phase * 2.7);
      f.light.intensity = f.base * k;
      f.sprite.scale.set(0.09 * (0.9 + 0.1 * k), 0.14 * k, 1);
    }
    lanternLight.intensity = 2.2 * (0.92 + 0.08 * Math.sin(t * 5.1));
    if (hero) hero.update(dt, SIT, 0);
    for (const g of guests) g.body?.update(dt, SIT, 0);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (mode === "table") {
      gl.setScissorTest(false);
      gl.setViewport(0, 0, w, h);
      gl.render(scene, camera);
      // The name over him and the "+" over each free chair.
      for (let i = 0; i < anchors.length; i++) {
        const el = anchors[i];
        if (!el) continue;
        const s = SEATS[i];
        if (!s) continue;
        tmp.set(s.x, i === 0 ? 1.4 : i === 3 ? 0.95 : 1.05, s.z).project(camera);
        const vis = tmp.z < 1;
        el.style.display = vis ? "" : "none";
        // His name never slides under the tab bar (short landscape phones).
        const y = ((1 - tmp.y) / 2) * h;
        el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * w}px, ${i === 0 ? Math.max(66, y) : y}px)`;
      }
    } else {
      for (const el of anchors) if (el) el.style.display = "none";
      gl.setScissorTest(false);
      gl.setViewport(0, 0, w, h);
      gl.setClearColor(0x07060a, 1);
      gl.clear(true, true, true);
    }
    const kit = heroKit;
    if (kit) {
      if (mode === "class") portrait.render(classFrame, kit, dt, Math.sin(t * 0.35) * 0.35, 1);
      else if (portraitRect) portrait.render(portraitRect, kit, dt, portraitView.spin, portraitView.zoom);
    }
  };
  raf = requestAnimationFrame(frame);

  return {
    setHero(spec, kit) {
      heroKit = kit;
      if (hero) wear(hero, kit);
      const k = JSON.stringify(spec);
      if (k === heroKey) return;
      heroKey = k;
      portrait.setSpec(spec);
      const serial = ++heroSerial;
      opts.onBusy?.(true);
      createPaladin(gl, { character: spec })
        .then((p) => {
          if (disposed || serial !== heroSerial) {
            p.dispose();
            return;
          }
          p.materials.setEnvIntensity(0.5);
          if (hero) {
            scene.remove(hero.group, hero.fx);
            hero.dispose();
          }
          hero = p;
          if (heroKit) wear(p, heroKit);
          seat(p, 0);
          scene.add(p.group, p.fx);
          if (!iconsDone && opts.onIcons) {
            iconsDone = true;
            opts.onIcons(p.renderIcons(gl, 112));
            if (heroKit) wear(p, heroKit);
          }
          opts.onBusy?.(false);
        })
        .catch((err: unknown) => {
          console.error("lobby: the fighter failed to build", err);
          if (serial === heroSerial) opts.onBusy?.(false);
        });
    },
    setMode(m, f) {
      mode = m;
      classFrame = f;
    },
    setGuests(list) {
      for (let i = 0; i < 3; i++) {
        const want = list[i] ?? null;
        const slot = guests[i];
        const k = want ? `${want.id}|${JSON.stringify(want.spec)}` : "";
        if (want && slot.body && k === slot.key) {
          wear(slot.body, want.eq);
          continue;
        }
        if (k === slot.key) continue;
        slot.key = k;
        const serial = ++slot.serial;
        if (slot.body) {
          scene.remove(slot.body.group, slot.body.fx);
          slot.body.dispose();
          slot.body = null;
        }
        if (!want) continue;
        createPaladin(gl, { character: want.spec })
          .then((p) => {
            if (disposed || serial !== slot.serial) {
              p.dispose();
              return;
            }
            p.materials.setEnvIntensity(0.5);
            wear(p, want.eq);
            seat(p, i + 1);
            slot.body = p;
            scene.add(p.group, p.fx);
          })
          .catch((err: unknown) => console.error("lobby: a guest failed to build", err));
      }
    },
    setPortrait(rect, view) {
      portraitRect = rect;
      portraitView = view;
    },
    setAnchors(els) {
      anchors = els;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      portrait.dispose();
      if (hero) hero.dispose();
      for (const g of guests) g.body?.dispose();
      for (const o of owned) o.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
      });
      gl.dispose();
      gl.forceContextLoss();
    },
  };
}
