// Paladin Lab: the character on a torch-lit stone floor with an orbit camera, for checking the
// model, the rig and every animation outside the dungeon. Open the explorer with `?lab=paladin`.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FX_LAYER, createPaladin, createPaladinSfx, type CombatWorld, type Paladin, type PaladinInput } from "./paladin";

interface LabState {
  moveX: number;
  moveZ: number;
  block: boolean;
  pitch: number;
  firstPerson: boolean;
  paused: boolean;
  timeScale: number;
  air: number;
  bones: boolean;
}

interface LabApi {
  paladin: Paladin;
  wall: THREE.Object3D;
  dummy: THREE.Object3D;
  hits: { clang: number; hit: number };
  state: LabState;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  attack: () => void;
  /** Advance `frames` fixed steps while paused (deterministic screenshots). */
  step: (frames: number, dt?: number) => void;
  view: (name: "front" | "back" | "left" | "right" | "three" | "close") => void;
}

function floorTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#4a4640";
    g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const v = 58 + ((x * 7 + y * 13) % 5) * 7;
        g.fillStyle = `rgb(${v + 8},${v + 4},${v})`;
        g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function mountPaladinLab(host: HTMLElement): LabApi {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c0f);
  scene.fog = new THREE.FogExp2(0x0b0c0f, 0.035);
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 80);
  camera.position.set(1.6, 1.5, 3.4);
  camera.layers.enable(FX_LAYER);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.0, 0);
  controls.enableDamping = true;

  const floorMap = floorTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.92, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.3), new THREE.MeshStandardMaterial({ color: 0x4b4741, roughness: 0.95 }));
  wall.position.set(0, 1.5, 1.2);
  wall.visible = false;
  wall.receiveShadow = true;
  scene.add(wall);
  // A training post to cut at: it rocks back when the blade lands.
  const dummy = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 1.7, 14), new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.9 }));
  post.position.y = 0.85;
  post.castShadow = true;
  dummy.add(post);
  dummy.position.set(0.05, 0, 0.95);
  dummy.visible = false;
  scene.add(dummy);
  const rock = { x: 0, z: 0, vx: 0, vz: 0 };

  scene.add(new THREE.HemisphereLight(0x55606c, 0x18140f, 0.9));
  const torch = new THREE.PointLight(0xffb878, 26, 14, 1.8);
  torch.position.set(2.2, 2.6, 2.4);
  torch.castShadow = true;
  torch.shadow.mapSize.set(1024, 1024);
  torch.shadow.bias = -0.002;
  torch.shadow.normalBias = 0.03;
  scene.add(torch);
  const fill = new THREE.PointLight(0x9fb8ff, 9, 14, 1.8);
  fill.position.set(-2.6, 2.2, -2.2);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xfff1e0, 0.9);
  key.position.set(-1.5, 4, 3);
  scene.add(key);

  const paladin = createPaladin(renderer);
  scene.add(paladin.group, paladin.fx);
  const skeleton = new THREE.SkeletonHelper(paladin.rig.root);
  skeleton.visible = false;
  scene.add(skeleton);

  const params = new URLSearchParams(window.location.search);
  const state: LabState = {
    moveX: 0,
    moveZ: 0,
    block: false,
    pitch: 0,
    firstPerson: params.get("fp") === "1",
    paused: params.get("paused") === "1",
    timeScale: 1,
    air: 0,
    bones: false,
  };
  let attackQueued = false;
  let airVel = 0;
  const eye = new THREE.Vector3();

  const sfx = createPaladinSfx();
  window.addEventListener("pointerdown", () => sfx.unlock());
  const hits = { clang: 0, hit: 0 };
  const world: CombatWorld = {
    solid: (x, y, z) => y < 0 || (wall.visible && Math.abs(x) < 2.5 && y < 3 && Math.abs(z - 1.2) < 0.15),
    targets: [],
    onHit: (_id, dx, dz) => {
      hits.hit++;
      rock.vx += dz * 3.2;
      rock.vz -= dx * 3.2;
      sfx.hit();
    },
    onClang: () => {
      hits.clang++;
      sfx.clang();
    },
    onSwing: (i) => sfx.swing(i),
    onFootstep: () => sfx.step(Math.hypot(state.moveX, state.moveZ) > 3 ? 1 : 0),
  };
  const dummyTarget = { id: 1, x: dummy.position.x, y: 0, z: dummy.position.z, radius: 0.19, height: 1.7 };

  const tick = (dt: number) => {
    if (state.air > 0 || airVel !== 0) {
      state.air += airVel * dt;
      airVel -= 13.5 * dt;
      if (state.air <= 0) {
        state.air = 0;
        airVel = 0;
      }
    }
    paladin.group.position.y = state.air;
    const input: PaladinInput = {
      moveX: state.moveX,
      moveZ: state.moveZ,
      aimPitch: state.pitch,
      turnRate: 0,
      air: state.air,
      block: state.block,
      attack: attackQueued,
      firstPerson: state.firstPerson,
    };
    attackQueued = false;
    paladin.setFirstPerson(state.firstPerson);
    world.targets = dummy.visible ? [dummyTarget] : [];
    paladin.update(dt, input, 0, world);
    rock.vx += (-rock.x * 60 - rock.vx * 5) * dt;
    rock.vz += (-rock.z * 60 - rock.vz * 5) * dt;
    rock.x += rock.vx * dt;
    rock.z += rock.vz * dt;
    dummy.rotation.set(rock.x, 0, rock.z);
    // Treadmill: the floor slides under the feet at the commanded speed.
    floorMap.offset.x -= (state.moveX * dt) / 4;
    floorMap.offset.y -= (state.moveZ * dt) / 4;
    skeleton.visible = state.bones;
  };

  const render = () => {
    if (state.firstPerson) {
      paladin.getEye(eye);
      camera.position.copy(eye);
      camera.rotation.order = "YXZ";
      camera.rotation.set(state.pitch, Math.PI, 0);
      camera.fov = 68;
    } else {
      camera.fov = 42;
      controls.update();
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    if (!state.paused) tick(dt * state.timeScale);
    render();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const api: LabApi = {
    paladin,
    wall,
    dummy,
    hits,
    state,
    camera,
    controls,
    attack: () => {
      attackQueued = true;
    },
    step: (frames: number, dt = 1 / 60) => {
      for (let i = 0; i < frames; i++) tick(dt);
      render();
    },
    view: (name) => {
      const t = controls.target.set(0, 1.0, 0);
      const pos: Record<string, [number, number, number]> = {
        front: [0, 1.25, 3.6],
        back: [0, 1.4, -3.6],
        left: [3.6, 1.25, 0.2],
        right: [-3.6, 1.25, 0.2],
        three: [1.9, 1.55, 3.1],
        close: [0.7, 1.5, 1.5],
      };
      if (name === "close") t.set(0, 1.35, 0);
      camera.position.set(pos[name][0], pos[name][1], pos[name][2]);
      controls.update();
    },
  };

  // Controls panel.
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;left:12px;top:12px;display:flex;flex-wrap:wrap;gap:6px;max-width:430px;font:12px system-ui,sans-serif;color:#e8e4da;";
  const button = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "background:#1c222d;color:#eef2f6;border:1px solid rgba(255,255,255,.2);border-radius:5px;padding:5px 9px;cursor:pointer;font:inherit;";
    b.onclick = fn;
    panel.appendChild(b);
  };
  const move = (x: number, z: number) => () => {
    state.moveX = x;
    state.moveZ = z;
  };
  button("Idle", move(0, 0));
  button("Walk", move(0, 2.2));
  button("Run", move(0, 4));
  button("Back", move(0, -1.6));
  button("Strafe L", move(2, 0));
  button("Strafe R", move(-2, 0));
  button("Attack (click x3)", api.attack);
  button("Block", () => {
    state.block = !state.block;
  });
  button("Jump", () => {
    if (state.air <= 0) airVel = 4.6;
  });
  button("1st / 3rd person", () => {
    state.firstPerson = !state.firstPerson;
  });
  button("Wall", () => {
    wall.visible = !wall.visible;
  });
  button("Dummy", () => {
    dummy.visible = !dummy.visible;
  });
  button("Slow-mo", () => {
    state.timeScale = state.timeScale === 1 ? 0.2 : 1;
  });
  button("Bones", () => {
    state.bones = !state.bones;
  });
  for (const v of ["front", "back", "left", "three", "close"] as const) button(v, () => api.view(v));
  host.appendChild(panel);
  renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

  (window as unknown as { __paladinLab: LabApi }).__paladinLab = api;
  return api;
}
