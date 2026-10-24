import type React from "react";
import { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { EpisodeVideo } from "../../engine/EpisodeVideo";
import type { CameraPose, EpisodeConfig, Vec3 } from "../../engine/types";
import { config } from "./config";
import { GlowSprite } from "../../artifacts";
import { useSurface } from "../../engine/materials";
import { makeFlagstone, makeMasonry } from "../../engine/textures";

const FONT =
  "'Arial Black', 'Arial Bold', 'Impact', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

interface Line {
  text: string;
  size: number;
  color: string;
  rotate?: number;
}

interface ThumbVariant {
  camera: CameraPose;
  fov?: number;
  boulderPos: Vec3;
  boulderRadius: number;
  boulderRotation: Vec3;
  runnerPos: Vec3;
  runnerRotation: Vec3;
  runnerSprintPhase: number;
  runnerHoldingHat?: boolean;
  runnerLookBack?: boolean;
  lines: Line[];
  top?: number;
  stamp?: string;
}

export const BOULDER_THUMB_VARIANTS: ThumbVariant[] = [
  {
    // Variant 1: Pure classic Raiders of the Lost Ark corridor chase
    // Indiana Jones centered in ancient stone corridor sprinting for his life, shouting in terror!
    // Titanic carved stone boulder right behind him, framed by stone pillars & torchlight.
    camera: { position: [0.0, 1.52, 4.35], lookAt: [0.0, 0.76, 0.0] },
    fov: 46,
    boulderPos: [0.0, 0.93, -0.70],
    boulderRadius: 1.21,
    boulderRotation: [0.22, 0.38, -0.7],
    runnerPos: [0.0, -0.30, 1.25],
    runnerRotation: [-0.04, 0.04, 0.02],
    runnerSprintPhase: 0.82,
    runnerHoldingHat: false,
    runnerLookBack: false,
    top: 18,
    lines: [
      { text: "INDIANA JONES", size: 88, color: "#ffffff" },
      { text: "WAS LUCKY.", size: 120, color: "#ffd84d", rotate: -2.5 },
    ],
    stamp: "LETHAL TRAP",
  },
  {
    // Variant 2: The Iconic "Glance Back & Hold Hat" sprint!
    // Low-angle floor action: Indy clutching his fedora brim while looking back at the crushing stone.
    camera: { position: [-0.18, 1.45, 4.15], lookAt: [0.02, 0.76, 0.0] },
    fov: 48,
    boulderPos: [0.06, 0.93, -0.65],
    boulderRadius: 1.21,
    boulderRotation: [0.15, 0.32, -0.92],
    runnerPos: [-0.06, -0.30, 1.20],
    runnerRotation: [-0.08, -0.14, -0.02],
    runnerSprintPhase: 0.36,
    runnerHoldingHat: true, // Hand clutching fedora brim!
    runnerLookBack: true,   // Panicked glance back over shoulder!
    top: 18,
    lines: [
      { text: "CAN YOU", size: 100, color: "#ffffff" },
      { text: "OUTRUN THIS?", size: 120, color: "#ff4b24", rotate: -3 },
    ],
    stamp: "IMPOSSIBLE",
  },
  {
    // Variant 3: Ancient Stone Corridor Choke Point (Wall-to-wall crushing boulder)
    // Dynamic 3/4 perspective, boulder scraping the ancient stone corridor walls
    camera: { position: [0.72, 1.50, 4.25], lookAt: [-0.10, 0.76, 0.05] },
    fov: 46,
    boulderPos: [-0.08, 0.93, -0.65],
    boulderRadius: 1.21,
    boulderRotation: [0.08, 0.45, -0.75],
    runnerPos: [0.12, -0.30, 1.25],
    runnerRotation: [-0.06, 0.22, 0.03],
    runnerSprintPhase: 0.70,
    runnerHoldingHat: false,
    runnerLookBack: false,
    top: 18,
    lines: [
      { text: "ANCIENT BOULDER", size: 86, color: "#ffffff" },
      { text: "NO ESCAPE", size: 118, color: "#5fe5ff", rotate: -2.5 },
    ],
    stamp: "100% FATAL",
  },
];

const ThumbText: React.FC<{ variant: ThumbVariant }> = ({ variant }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {/* Dark gradient overlay at top to guarantee text pops */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 380,
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0) 100%)",
      }}
    />

    <div
      style={{
        position: "absolute",
        top: variant.top ?? 18,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
        fontWeight: 900,
      }}
    >
      {variant.lines.map((line) => (
        <div
          key={line.text}
          style={{
            fontSize: line.size,
            lineHeight: 1.04,
            color: line.color,
            letterSpacing: 2,
            whiteSpace: "nowrap",
            WebkitTextStroke: `${Math.round(line.size / 6.2)}px #000`,
            paintOrder: "stroke fill",
            textShadow: "0 16px 45px rgba(0,0,0,0.95)",
            transform: `rotate(${line.rotate ?? 0}deg)`,
          }}
        >
          {line.text}
        </div>
      ))}
      {variant.stamp ? (
        <div
          style={{
            marginTop: 6,
            padding: "3px 20px",
            border: "6px solid #e8322a",
            borderRadius: 10,
            color: "#e8322a",
            fontSize: 54,
            background: "rgba(18,7,7,0.85)",
            boxShadow: "0 0 0 3px rgba(0,0,0,0.7), 0 10px 25px rgba(0,0,0,0.9)",
            transform: "rotate(-3.5deg)",
            letterSpacing: 4,
            WebkitTextStroke: "3.5px #000",
            paintOrder: "stroke fill",
          }}
        >
          {variant.stamp}
        </div>
      ) : null}
    </div>
  </AbsoluteFill>
);

/**
 * Authentic procedural ancient carved granite rock texture.
 * Weathered charcoal-grey rock base with mineral strata, dark crack fissures, and quartz flecks.
 */
function createAncientRockTextures() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext("2d")!;

  // Weathered ancient grey-brown granite base
  ctx.fillStyle = "#48423c";
  ctx.fillRect(0, 0, size, size);

  // Broad organic geological strata (dark charcoal shadows, earthy mineral bands)
  const clouds = [
    { x: 280, y: 260, r: 380, col: "rgba(32, 28, 24, 0.72)" },
    { x: 750, y: 350, r: 420, col: "rgba(22, 19, 16, 0.78)" },
    { x: 450, y: 760, r: 450, col: "rgba(92, 84, 74, 0.55)" },
    { x: 800, y: 800, r: 350, col: "rgba(28, 24, 20, 0.82)" },
    { x: 180, y: 660, r: 320, col: "rgba(75, 68, 60, 0.6)" },
    { x: 500, y: 200, r: 340, col: "rgba(105, 96, 85, 0.5)" },
    { x: 512, y: 512, r: 400, col: "rgba(46, 40, 34, 0.65)" },
    // Subtle subterranean lichen / moss stains in depressions
    { x: 320, y: 520, r: 240, col: "rgba(50, 58, 40, 0.35)" },
    { x: 680, y: 640, r: 220, col: "rgba(44, 50, 35, 0.32)" },
  ];
  for (const c of clouds) {
    const grad = ctx.createRadialGradient(c.x, c.y, 25, c.x, c.y, c.r);
    grad.addColorStop(0, c.col);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  // Chiseled stone tool marks and deep jagged fault fissures
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let f = 0; f < 10; f++) {
    let px = 100 + ((f * 197) % (size - 200));
    let py = 80 + ((f * 263) % (size - 180));
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = "rgba(16, 13, 10, 0.45)";
    ctx.beginPath();
    ctx.moveTo(px, py);
    const steps = 18;
    for (let s = 0; s < steps; s++) {
      px += Math.sin(f * 2.3 + s * 0.85) * 22;
      py += Math.cos(f * 1.5 + s * 1.1) * 16 + 10;
      px = Math.max(30, Math.min(size - 30, px));
      py = Math.max(30, Math.min(size - 30, py));
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Secondary fine crack branches
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "rgba(10, 8, 6, 0.32)";
    ctx.stroke();
  }

  // Dense multi-tone mineral grain (tiny quartz grains, iron specks, rock dust)
  const speckles = 32000;
  for (let i = 0; i < speckles; i++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 0.5 + Math.random() * 1.4;
    const isDark = Math.random() > 0.38;
    ctx.fillStyle = isDark
      ? `rgba(16, 12, 9, ${0.2 + Math.random() * 0.35})`
      : `rgba(195, 188, 175, ${0.12 + Math.random() * 0.28})`;
    ctx.fillRect(sx, sy, sr, sr);
  }

  // Generate Normal Map from height data
  const imgData = ctx.getImageData(0, 0, size, size);
  const nData = nCtx.createImageData(size, size);
  const data = imgData.data;
  const dst = nData.data;

  const strength = 3.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const left = (y * size + ((x - 1 + size) % size)) * 4;
      const right = (y * size + ((x + 1) % size)) * 4;
      const up = (((y - 1 + size) % size) * size + x) * 4;
      const down = (((y + 1) % size) * size + x) * 4;

      const hL = data[left] / 255;
      const hR = data[right] / 255;
      const hU = data[up] / 255;
      const hD = data[down] / 255;

      const dx = (hR - hL) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      dst[idx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nData, 0, 0);

  const colorTex = new THREE.CanvasTexture(canvas);
  colorTex.wrapS = THREE.RepeatWrapping;
  colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;

  return { colorTex, normalTex };
}

/**
 * Authentic Indiana Jones carved subterranean stone boulder with rugged geological displacement.
 */
const IndianaBoulderMesh: React.FC<{
  radius: number;
  position: Vec3;
  rotation: Vec3;
}> = ({ radius, position, rotation }) => {
  const { colorTex, normalTex } = useMemo(() => createAncientRockTextures(), []);

  const geometry = useMemo(() => {
    // 64x48 sphere with authentic weathered granite rock harmonics & deep chiseled facets
    const geom = new THREE.SphereGeometry(radius, 64, 48);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      const nx = x / radius;
      const ny = y / radius;
      const nz = z / radius;

      // Heavy carved ancient stone bumps & organic geological fractures
      const h1 = Math.sin(nx * 2.8 + 0.4) * Math.cos(ny * 2.4 + 0.7) * Math.sin(nz * 2.8);
      const h2 = Math.sin(nx * 5.6 + ny * 4.4) * Math.cos(nz * 4.8) * 0.45;
      const h3 = Math.sin(nx * 10.4 + nz * 8.6) * Math.cos(ny * 6.8) * 0.22;
      const h4 = Math.cos(nx * 16.0 + ny * 13.0) * 0.09;

      // Deep chisel gouges & fault fissure across the stone face
      const fissure = Math.exp(-Math.pow(Math.sin(nx * 3.4 + ny * 1.8 - nz * 2.2), 2) * 16) * -0.12;

      const disp = (h1 * 0.055 + h2 * 0.035 + h3 * 0.018 + h4 * 0.008 + fissure) * radius;
      const scale = (radius + disp) / radius;

      pos.setXYZ(i, x * scale, y * scale, z * scale);
    }
    geom.computeVertexNormals();
    return geom;
  }, [radius]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          map={colorTex}
          normalMap={normalTex}
          normalScale={new THREE.Vector2(2.5, 2.5)}
          roughness={0.94}
          metalness={0.02}
          color="#756b60"
        />
      </mesh>
    </group>
  );
};

/**
 * Creates the iconic curved fedora brim with realistic rakish curve and authentic proportions.
 */
function createFedoraBrimGeometry() {
  const geom = new THREE.CylinderGeometry(0.26, 0.28, 0.014, 48);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const angle = Math.atan2(x, z);
    // Subtle swoop up at sides
    const dip = -Math.cos(angle * 2) * 0.018 * (r / 0.28);
    // Front dips down slightly, but not blocking eyes
    const frontDrop = z > 0 ? (z / 0.28) * -0.012 : (z / 0.28) * 0.008;
    pos.setXYZ(i, x, y + dip + frontDrop, z * 1.10); // Oval along Z
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates the iconic Harrison Ford C-crown / teardrop pinched fedora crown.
 */
function createFedoraCrownGeometry() {
  const geom = new THREE.CylinderGeometry(0.13, 0.16, 0.17, 36);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    z *= 1.08; // Oval profile
    // Front lateral pinch dents
    if (z > 0.01 && y > -0.05) {
      const pinchFactor = ((y + 0.05) / 0.14) * (z / 0.18);
      x *= 1 - Math.min(0.42, pinchFactor * 0.45);
    }
    // Top center teardrop crease
    if (y > 0.04) {
      const centerDist = Math.abs(x) / 0.07;
      if (centerDist < 1.0) {
        y -= (1.0 - centerDist) * 0.035;
      }
    }
    pos.setXYZ(i, x, y, z);
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Dedicated Indiana Jones Adventurer Character:
 * - Iconic brown fedora with pinched crown, curved brim, and dark ribbon band
 * - Terrified shouting face: wide eyes, raised brows, open mouth with teeth & tongue
 * - Khaki safari shirt with open collar & button placket
 * - Billowing weathered brown leather jacket with flared lapels
 * - Leather satchel strap across chest & coiled bullwhip at left hip
 * - Rugged khaki trousers & dark riding boots
 * - Full athletic forward sprint cycle
 * - Optional holdingHat pose & lookBack pose
 */
const IndianaJonesCharacter: React.FC<{
  position: Vec3;
  rotation: Vec3;
  phase?: number;
  scale?: number;
  holdingHat?: boolean;
  lookBack?: boolean;
}> = ({ position, rotation, phase = 0, scale = 1.05, holdingHat = false, lookBack = false }) => {
  const brimGeom = useMemo(() => createFedoraBrimGeometry(), []);
  const crownGeom = useMemo(() => createFedoraCrownGeometry(), []);

  // Athletic hard sprint cycle
  const cycle = Math.sin(phase * Math.PI * 2);

  // Sprint forward torso lean
  const bodyLean = 0.32;
  const bodyBob = Math.abs(cycle) * 0.05;

  // Arms driving hard in sprint (or right arm reaching up to hold fedora brim)
  const leftArmRot: Vec3 = [-cycle * 1.15, 0, 0.18];
  const rightArmRot: Vec3 = holdingHat
    ? [-1.35, 0.4, -0.65] // Hand reaches up to grasp fedora brim
    : [cycle * 1.15, 0, -0.18];

  const leftElbow = -1.15 - Math.abs(cycle) * 0.25;
  const rightElbow = holdingHat
    ? -1.75 // Hand positioned right at brim edge
    : -1.15 - Math.abs(cycle) * 0.25;

  // Legs in wide sprint stride
  const leftLegRot: Vec3 = [cycle * 0.95, 0, 0.04];
  const rightLegRot: Vec3 = [-cycle * 0.95, 0, -0.04];
  const leftKnee = Math.max(0, -cycle) * 1.25 + 0.1;
  const rightKnee = Math.max(0, cycle) * 1.25 + 0.1;

  // Head rotation: looking forward or glancing back over shoulder in terror
  const headRot: Vec3 = lookBack
    ? [0.04, -0.34, 0.04] // Panicked glance back at the crushing boulder!
    : [-0.02, 0.04, 0.02];

  // Palette
  const skin = "#d8a078";
  const skinShadow = "#9e6e4e";
  const shirtKhaki = "#c7b494";
  const jacketLeather = "#321d10";
  const jacketLining = "#22130a";
  const trousers = "#523c2c";
  const bootLeather = "#1a0f08";
  const fedoraBrown = "#382214";
  const fedoraBand = "#140c07";
  const hairBrown = "#221309";
  const brass = "#cca045";

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Root bob & sprint forward pitch */}
      <group position={[0, bodyBob, 0]} rotation={[bodyLean, 0, 0]}>
        {/* ===================== HIPS & PELVIS ===================== */}
        <mesh position={[0, 0.94, 0]} castShadow>
          <boxGeometry args={[0.34, 0.18, 0.22]} />
          <meshStandardMaterial color={trousers} roughness={0.85} />
        </mesh>

        {/* Leather belt & brass buckle */}
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.36, 0.05, 0.24]} />
          <meshStandardMaterial color="#201309" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.02, 0.125]}>
          <boxGeometry args={[0.075, 0.06, 0.02]} />
          <meshStandardMaterial color={brass} metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Coiled Bullwhip on Left Hip */}
        <group position={[-0.2, 0.94, 0.02]} rotation={[0.2, 0, 0.3]}>
          <mesh castShadow>
            <torusGeometry args={[0.085, 0.022, 8, 22]} />
            <meshStandardMaterial color="#201106" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.02, 0]} castShadow>
            <torusGeometry args={[0.065, 0.018, 8, 18]} />
            <meshStandardMaterial color="#281509" roughness={0.8} />
          </mesh>
          <mesh position={[0.02, 0.08, 0]} rotation={[0, 0, -0.45]}>
            <cylinderGeometry args={[0.014, 0.018, 0.13, 8]} />
            <meshStandardMaterial color="#120904" roughness={0.65} />
          </mesh>
        </group>

        {/* ===================== TORSO & JACKET ===================== */}
        {/* Khaki shirt base */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.36, 0.34, 0.22]} />
          <meshStandardMaterial color={shirtKhaki} roughness={0.82} />
        </mesh>

        {/* Shirt center placket */}
        <mesh position={[0, 1.2, 0.114]}>
          <boxGeometry args={[0.035, 0.32, 0.01]} />
          <meshStandardMaterial color="#b59f7c" roughness={0.8} />
        </mesh>
        {/* Placket Buttons */}
        {[-0.08, -0.01, 0.06].map((by, i) => (
          <mesh key={`btn-${i}`} position={[0, 1.2 + by, 0.12]}>
            <cylinderGeometry args={[0.007, 0.007, 0.006, 8]} />
            <meshStandardMaterial color="#483827" roughness={0.5} />
          </mesh>
        ))}

        {/* Shirt collar points framing open neck */}
        {[-1, 1].map((side) => (
          <mesh
            key={`collar-${side}`}
            position={[side * 0.065, 1.34, 0.112]}
            rotation={[0.25, 0, side * 0.55]}
          >
            <boxGeometry args={[0.045, 0.065, 0.015]} />
            <meshStandardMaterial color={shirtKhaki} roughness={0.8} />
          </mesh>
        ))}

        {/* Unbuttoned shirt open neck / throat */}
        <mesh position={[0, 1.28, 0.112]} scale={[0.1, 0.14, 0.01]}>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.65} />
        </mesh>

        {/* Satchel strap flat across chest */}
        <mesh position={[0, 1.22, 0.114]} rotation={[0, 0, -0.66]}>
          <boxGeometry args={[0.036, 0.42, 0.008]} />
          <meshStandardMaterial color="#241307" roughness={0.75} />
        </mesh>

        {/* Open Brown Leather Jacket (Left side flap billowing back) */}
        <group position={[-0.14, 1.2, 0.03]} rotation={[-0.1, 0.28, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.11, 0.35, 0.18]} />
            <meshStandardMaterial color={jacketLeather} roughness={0.76} />
          </mesh>
          {/* Folded Lapel Collar */}
          <mesh position={[0.05, 0.04, 0.085]} rotation={[0, -0.32, 0]}>
            <boxGeometry args={[0.038, 0.22, 0.018]} />
            <meshStandardMaterial color={jacketLining} roughness={0.82} />
          </mesh>
        </group>

        {/* Open Brown Leather Jacket (Right side flap billowing back) */}
        <group position={[0.14, 1.2, 0.03]} rotation={[-0.1, -0.28, -0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.11, 0.35, 0.18]} />
            <meshStandardMaterial color={jacketLeather} roughness={0.76} />
          </mesh>
          {/* Folded Lapel Collar */}
          <mesh position={[-0.05, 0.04, 0.085]} rotation={[0, 0.32, 0]}>
            <boxGeometry args={[0.038, 0.22, 0.018]} />
            <meshStandardMaterial color={jacketLining} roughness={0.82} />
          </mesh>
        </group>

        {/* Jacket back draped over shoulders */}
        <mesh position={[0, 1.22, -0.1]} castShadow>
          <boxGeometry args={[0.38, 0.34, 0.06]} />
          <meshStandardMaterial color={jacketLeather} roughness={0.76} />
        </mesh>

        {/* Shoulders */}
        {[-1, 1].map((side) => (
          <mesh key={`shoulder-${side}`} position={[side * 0.22, 1.35, 0]} castShadow>
            <sphereGeometry args={[0.082, 14, 12]} />
            <meshStandardMaterial color={jacketLeather} roughness={0.76} />
          </mesh>
        ))}

        {/* ===================== NECK & HEAD ===================== */}
        <mesh position={[0, 1.44, 0.02]}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 12]} />
          <meshStandardMaterial color={skinShadow} roughness={0.65} />
        </mesh>

        {/* Head Group (Terrified shouting expression) */}
        <group position={[0, 1.58, 0.03]} rotation={headRot}>
          {/* Main head */}
          <mesh castShadow scale={[1, 1.1, 1.0]}>
            <sphereGeometry args={[0.155, 24, 20]} />
            <meshStandardMaterial color={skin} roughness={0.62} />
          </mesh>

          {/* Sculpted Jaw & Chin */}
          <mesh position={[0, -0.11, 0.09]}>
            <boxGeometry args={[0.09, 0.05, 0.07]} />
            <meshStandardMaterial color={skinShadow} roughness={0.75} />
          </mesh>

          {/* Hair under the hat */}
          <mesh position={[0, 0.04, -0.05]} scale={[1.04, 0.88, 1.06]}>
            <sphereGeometry args={[0.155, 16, 14]} />
            <meshStandardMaterial color={hairBrown} roughness={0.9} />
          </mesh>
          {/* Side hair tufts */}
          <mesh position={[-0.145, 0.01, 0.02]}>
            <boxGeometry args={[0.025, 0.09, 0.06]} />
            <meshStandardMaterial color={hairBrown} roughness={0.9} />
          </mesh>
          <mesh position={[0.145, 0.01, 0.02]}>
            <boxGeometry args={[0.025, 0.09, 0.06]} />
            <meshStandardMaterial color={hairBrown} roughness={0.9} />
          </mesh>

          {/* Shouting Mouth with Lips, Teeth & Tongue */}
          <group position={[0, -0.055, 0.146]} rotation={[0.06, 0, 0]}>
            {/* Dark oral cavity */}
            <mesh>
              <boxGeometry args={[0.13, 0.078, 0.04]} />
              <meshStandardMaterial color="#100402" roughness={0.9} />
            </mesh>
            {/* Upper Teeth Row */}
            <mesh position={[0, 0.024, 0.014]}>
              <boxGeometry args={[0.105, 0.02, 0.016]} />
              <meshStandardMaterial color="#f7f3ec" roughness={0.3} />
            </mesh>
            {/* Lower Teeth Row */}
            <mesh position={[0, -0.022, 0.012]}>
              <boxGeometry args={[0.085, 0.016, 0.016]} />
              <meshStandardMaterial color="#efebe3" roughness={0.35} />
            </mesh>
            {/* Red Tongue */}
            <mesh position={[0, -0.016, 0.01]}>
              <boxGeometry args={[0.072, 0.018, 0.02]} />
              <meshStandardMaterial color="#b23a3a" roughness={0.5} />
            </mesh>
          </group>

          {/* Nose */}
          <mesh position={[0, 0.014, 0.158]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.026, 0.07, 8]} />
            <meshStandardMaterial color={skinShadow} roughness={0.65} />
          </mesh>

          {/* Terrified Wide Eyes - Fully visible and unblocked! */}
          {[-1, 1].map((side) => (
            <group key={`eye-${side}`} position={[side * 0.054, 0.048, 0.138]}>
              {/* Eyeball white */}
              <mesh scale={[1.15, 1.0, 0.6]}>
                <sphereGeometry args={[0.03, 14, 12]} />
                <meshStandardMaterial color="#fafafa" roughness={0.2} />
              </mesh>
              {/* Dark Iris & Pupil looking at camera / slightly up */}
              <mesh position={[0, -0.002, 0.023]}>
                <sphereGeometry args={[0.016, 8, 8]} />
                <meshStandardMaterial color="#140c08" roughness={0.2} />
              </mesh>
              {/* Eye glint */}
              <mesh position={[0.006, 0.006, 0.034]}>
                <sphereGeometry args={[0.005, 6, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Panicked arched eyebrow */}
              <mesh position={[0, 0.036, 0.012]} rotation={[0, 0, side * -0.28]}>
                <boxGeometry args={[0.052, 0.013, 0.01]} />
                <meshStandardMaterial color={hairBrown} roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* ===================== THE ICONIC FEDORA ===================== */}
          {/* Tilted slightly back on head to compensate for bodyLean, framing eyes perfectly! */}
          <group position={[0, 0.148, -0.02]} rotation={[0.18, 0.02, -0.02]}>
            {/* Curved fedora brim */}
            <mesh geometry={brimGeom} castShadow receiveShadow>
              <meshStandardMaterial color={fedoraBrown} roughness={0.84} />
            </mesh>

            {/* Fedora Crown with pinched front and teardrop crease */}
            <mesh
              geometry={crownGeom}
              position={[0, 0.085, -0.01]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={fedoraBrown} roughness={0.84} />
            </mesh>

            {/* Dark Grosgrain Ribbon Band */}
            <mesh position={[0, 0.022, -0.01]} scale={[0.88, 1.0, 1.06]}>
              <cylinderGeometry args={[0.165, 0.165, 0.032, 32]} />
              <meshStandardMaterial color={fedoraBand} roughness={0.65} />
            </mesh>
            {/* Ribbon Bow on Left Side */}
            <mesh position={[-0.148, 0.022, -0.01]} rotation={[0, 0, 0.2]}>
              <boxGeometry args={[0.014, 0.03, 0.036]} />
              <meshStandardMaterial color={fedoraBand} roughness={0.65} />
            </mesh>
          </group>
        </group>

        {/* ===================== ARMS ===================== */}
        {([-1, 1] as const).map((side) => {
          const armRot = side === -1 ? leftArmRot : rightArmRot;
          const elbow = side === -1 ? leftElbow : rightElbow;
          return (
            <group
              key={`arm-${side}`}
              position={[side * 0.24, 1.34, 0]}
              rotation={armRot}
            >
              {/* Upper arm (leather jacket sleeve) */}
              <mesh position={[0, -0.16, 0]} castShadow>
                <capsuleGeometry args={[0.064, 0.18, 4, 10]} />
                <meshStandardMaterial color={jacketLeather} roughness={0.76} />
              </mesh>

              {/* Forearm & Clenched Fist */}
              <group position={[0, -0.31, 0]} rotation={[elbow, 0, 0]}>
                {/* Forearm sleeve */}
                <mesh position={[0, -0.13, 0]} castShadow>
                  <capsuleGeometry args={[0.055, 0.15, 4, 10]} />
                  <meshStandardMaterial color={jacketLeather} roughness={0.76} />
                </mesh>
                {/* Hand / Fist */}
                <mesh position={[0, -0.26, 0.01]} castShadow>
                  <boxGeometry args={[0.068, 0.076, 0.058]} />
                  <meshStandardMaterial color={skin} roughness={0.7} />
                </mesh>
              </group>
            </group>
          );
        })}

        {/* ===================== LEGS & RUNNING STRIDE ===================== */}
        {([-1, 1] as const).map((side) => {
          const legRot = side === -1 ? leftLegRot : rightLegRot;
          const knee = side === -1 ? leftKnee : rightKnee;
          return (
            <group
              key={`leg-${side}`}
              position={[side * 0.12, 0.88, 0]}
              rotation={legRot}
            >
              {/* Thigh (trousers) */}
              <mesh position={[0, -0.19, 0]} castShadow>
                <capsuleGeometry args={[0.076, 0.22, 4, 10]} />
                <meshStandardMaterial color={trousers} roughness={0.85} />
              </mesh>

              {/* Lower leg & tall boot */}
              <group position={[0, -0.38, 0]} rotation={[knee, 0, 0]}>
                {/* Calf in tall riding boot */}
                <mesh position={[0, -0.16, 0]} castShadow>
                  <capsuleGeometry args={[0.068, 0.2, 4, 10]} />
                  <meshStandardMaterial color={bootLeather} roughness={0.72} />
                </mesh>

                {/* Boot Foot */}
                <mesh position={[0, -0.32, 0.06]} castShadow>
                  <boxGeometry args={[0.085, 0.09, 0.19]} />
                  <meshStandardMaterial color={bootLeather} roughness={0.72} />
                </mesh>
                {/* Boot heel */}
                <mesh position={[0, -0.33, -0.03]}>
                  <boxGeometry args={[0.085, 0.05, 0.06]} />
                  <meshStandardMaterial color="#100804" roughness={0.65} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
};

/**
 * Authentic Ancient Temple Corridor:
 * - Weathered stone flagstone floor slabs with grouting & floor cracks
 * - Left and right ancient carved masonry walls with projecting stone ribs
 * - Repeating architectural stone archways/lintels receding into cavern depth
 * - Carved Incan stone idol plaques on arch pillars
 * - Creeping jungle roots descending from ceiling fissures
 * - Wall-mounted bronze torch sconces with flickering warm golden firelight
 */
const TempleCorridor: React.FC = () => {
  const wallSurface = useSurface(
    "tc-wall",
    () => makeMasonry({ rows: 6, cols: 4, base: "#3c332b", baseAlt: "#463d33", mortar: "#171410", seed: 42 }),
    [3, 3]
  );
  const floorSurface = useSurface(
    "tc-floor",
    () => makeFlagstone({ cells: 4, base: "#42382e", baseAlt: "#4c4236", grout: "#181410", seed: 43 }),
    [2, 4]
  );
  const pillarSurface = useSurface(
    "tc-pillar",
    () => makeMasonry({ rows: 8, cols: 2, base: "#362e26", baseAlt: "#40372e", mortar: "#15120e", seed: 44 }),
    [1, 3]
  );

  const stoneMat = (surface: typeof wallSurface, color = "#786a5b") => (
    <meshStandardMaterial
      map={surface.map}
      normalMap={surface.normalMap}
      roughnessMap={surface.roughnessMap}
      normalScale={new THREE.Vector2(1.1, 1.1)}
      color={color}
      roughness={0.92}
    />
  );

  // Pillar & Arch Z positions along the tunnel
  const archZs = [-7.0, -4.5, -2.0, 0.5, 3.0];
  const tunnelWidth = 2.50; // Narrow corridor: boulder (radius 1.21, diam 2.42) fills 97% of width!

  return (
    <group>
      {/* Ancient Stone Flagstone Floor */}
      <mesh position={[0, -0.18, -1.5]} receiveShadow>
        <boxGeometry args={[tunnelWidth + 0.6, 0.08, 14]} />
        {stoneMat(floorSurface, "#706152")}
      </mesh>

      {/* Deep Cavern Back Wall */}
      <mesh position={[0, 2.5, -8.2]} receiveShadow>
        <boxGeometry args={[tunnelWidth + 2.0, 5.5, 0.6]} />
        {stoneMat(wallSurface, "#54463a")}
      </mesh>

      {/* Subterranean Heavy Stone Ceiling */}
      <mesh position={[0, 3.9, -1.5]}>
        <boxGeometry args={[tunnelWidth + 0.6, 0.3, 14]} />
        {stoneMat(wallSurface, "#483b30")}
      </mesh>

      {/* Left Wall & Right Wall */}
      {[-1, 1].map((side) => (
        <group key={`wall-${side}`}>
          {/* Continuous masonry wall */}
          <mesh position={[side * (tunnelWidth / 2 + 0.22), 2.0, -1.5]} receiveShadow>
            <boxGeometry args={[0.44, 4.2, 14]} />
            {stoneMat(wallSurface, "#635446")}
          </mesh>

          {/* Lower stone footing ledge */}
          <mesh position={[side * (tunnelWidth / 2 - 0.06), 0.1, -1.5]} receiveShadow>
            <boxGeometry args={[0.18, 0.42, 14]} />
            {stoneMat(wallSurface, "#54463a")}
          </mesh>
        </group>
      ))}

      {/* Repeating Stone Archways / Portal Ribs */}
      {archZs.map((z, idx) => (
        <group key={`arch-${idx}`}>
          {/* Left Pillar */}
          <mesh position={[-tunnelWidth / 2 + 0.1, 2.0, z]} castShadow receiveShadow>
            <boxGeometry args={[0.26, 4.0, 0.42]} />
            {stoneMat(pillarSurface, "#584a3c")}
          </mesh>

          {/* Right Pillar */}
          <mesh position={[tunnelWidth / 2 - 0.1, 2.0, z]} castShadow receiveShadow>
            <boxGeometry args={[0.26, 4.0, 0.42]} />
            {stoneMat(pillarSurface, "#584a3c")}
          </mesh>

          {/* Transverse Heavy Stone Overhead Beam / Lintel */}
          <mesh position={[0, 3.7, z]} castShadow receiveShadow>
            <boxGeometry args={[tunnelWidth - 0.08, 0.36, 0.44]} />
            {stoneMat(pillarSurface, "#584a3c")}
          </mesh>

          {/* Stone Corbel Brackets in Top Corners */}
          {[-1, 1].map((side) => (
            <mesh
              key={`corbel-${idx}-${side}`}
              position={[side * (tunnelWidth / 2 - 0.22), 3.42, z]}
              rotation={[0, 0, side * 0.785]}
            >
              <boxGeometry args={[0.22, 0.22, 0.42]} />
              {stoneMat(pillarSurface, "#4c3f33")}
            </mesh>
          ))}

          {/* Carved Ancient Incan Idol Face Plaque on each arch pillar */}
          {[-1, 1].map((side) => (
            <group
              key={`idol-${idx}-${side}`}
              position={[side * (tunnelWidth / 2 - 0.24), 2.1, z + 0.22]}
            >
              {/* Stone plaque */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.18, 0.32, 0.06]} />
                {stoneMat(pillarSurface, "#4a3e32")}
              </mesh>
              {/* Sunken eye sockets */}
              <mesh position={[-0.04, 0.05, 0.034]}>
                <boxGeometry args={[0.03, 0.03, 0.015]} />
                <meshStandardMaterial color="#1a140e" roughness={0.9} />
              </mesh>
              <mesh position={[0.04, 0.05, 0.034]}>
                <boxGeometry args={[0.03, 0.03, 0.015]} />
                <meshStandardMaterial color="#1a140e" roughness={0.9} />
              </mesh>
              {/* Fierce grimacing mouth */}
              <mesh position={[0, -0.05, 0.034]}>
                <boxGeometry args={[0.08, 0.035, 0.015]} />
                <meshStandardMaterial color="#1a140e" roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Hanging jungle roots from ceiling fissures */}
          {[-0.55, 0.35, -0.15].map((rx, rIdx) => (
            <mesh
              key={`root-${idx}-${rIdx}`}
              position={[rx, 3.65, z + 0.08]}
              rotation={[0.1, 0, (rIdx - 1) * 0.12]}
            >
              <cylinderGeometry args={[0.014, 0.007, 0.65 + rIdx * 0.25, 6]} />
              <meshStandardMaterial color="#261b12" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Wall-Mounted Bronze Torch Sconces with Fiery Flames */}
      {[
        { x: -tunnelWidth / 2 + 0.18, y: 1.9, z: -0.6, lightIntensity: 4.8 },
        { x: tunnelWidth / 2 - 0.18, y: 1.9, z: 0.6, lightIntensity: 4.8 },
        { x: -tunnelWidth / 2 + 0.18, y: 1.9, z: 2.8, lightIntensity: 3.8 },
      ].map((torch, i) => (
        <group key={`torch-${i}`} position={[torch.x, torch.y, torch.z]}>
          {/* Bronze bracket */}
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.22, 8]} />
            <meshStandardMaterial color="#261d12" metalness={0.7} roughness={0.4} />
          </mesh>
          {/* Flame core */}
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.075, 10, 10]} />
            <meshBasicMaterial color="#ffbb44" />
          </mesh>
          {/* Warm torchlight casting rich amber glow on stone & boulder */}
          <pointLight
            position={[0, 0.2, 0.1]}
            intensity={torch.lightIntensity}
            distance={10}
            color="#ff9228"
            castShadow
          />
        </group>
      ))}
    </group>
  );
};

/**
 * Dedicated 3D scene composed specifically for the iconic Indiana Jones boulder chase shot.
 */
const IndianaBoulderScene: React.FC<{ variant: ThumbVariant }> = ({ variant }) => {
  return (
    <group>
      {/* Authentic Subterranean Stone Temple Corridor */}
      <TempleCorridor />

      {/* Atmospheric cavern ambient fill (deep moody shadows) */}
      <ambientLight intensity={0.46} color="#554436" />

      {/* Warm key light illuminating front of hero & boulder without blowing out texture */}
      <directionalLight
        position={[variant.runnerPos[0] + 0.6, 3.2, variant.runnerPos[2] + 3.2]}
        intensity={2.6}
        color="#fff0da"
        castShadow
      />

      {/* Cool cavern back-rim light defining the round silhouette of the rolling boulder */}
      <directionalLight
        position={[0, 3.8, -4.8]}
        intensity={2.2}
        color="#587498"
      />

      {/* Warm floor bounce light */}
      <pointLight
        position={[variant.runnerPos[0], 0.25, variant.runnerPos[2] + 0.8]}
        intensity={1.2}
        distance={6}
        color="#ffc57a"
      />

      {/* Titanic rolling carved ancient stone boulder */}
      <IndianaBoulderMesh
        radius={variant.boulderRadius}
        position={variant.boulderPos}
        rotation={variant.boulderRotation}
      />

      {/* Ground contact shadow under the boulder */}
      <mesh
        position={[variant.boulderPos[0], -0.135, variant.boulderPos[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[variant.boulderRadius * 0.95, 32]} />
        <meshBasicMaterial color="#060506" opacity={0.85} transparent />
      </mesh>

      {/* Flying stone fragments & pebbles kicked up by the rolling boulder */}
      {[-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((px, i) => (
        <mesh
          key={`pebble-${i}`}
          position={[
            variant.boulderPos[0] + px + Math.sin(i * 1.7) * 0.1,
            -0.1 + Math.abs(Math.sin(i * 2.5)) * 0.14,
            variant.boulderPos[2] + 0.95 + Math.cos(i * 1.4) * 0.22,
          ]}
          rotation={[i * 0.8, i * 1.2, i * 0.5]}
        >
          <dodecahedronGeometry args={[0.042 + (i % 3) * 0.018, 0]} />
          <meshStandardMaterial color="#4a4035" roughness={0.92} />
        </mesh>
      ))}

      {/* Ground dust puffs hugging floor level at the boulder contact line */}
      <GlowSprite
        position={[variant.boulderPos[0] - 0.7, 0.02, variant.boulderPos[2] + 0.9]}
        color="#8f7a62"
        size={1.1}
        opacity={0.32}
      />
      <GlowSprite
        position={[variant.boulderPos[0] + 0.7, 0.02, variant.boulderPos[2] + 0.9]}
        color="#8f7a62"
        size={1.1}
        opacity={0.32}
      />
      <GlowSprite
        position={[variant.boulderPos[0], 0.0, variant.boulderPos[2] + 1.05]}
        color="#9e8970"
        size={0.9}
        opacity={0.28}
      />

      {/* The Fleeing Hero: Indiana Jones in full athletic sprint! */}
      <IndianaJonesCharacter
        position={variant.runnerPos}
        rotation={variant.runnerRotation}
        phase={variant.runnerSprintPhase}
        holdingHat={variant.runnerHoldingHat}
        lookBack={variant.runnerLookBack}
      />

      {/* Dust kicked up from Indy's sprinting boots */}
      <GlowSprite
        position={[variant.runnerPos[0] - 0.22, -0.04, variant.runnerPos[2] - 0.25]}
        color="#baa084"
        size={1.2}
        opacity={0.35}
      />
      <GlowSprite
        position={[variant.runnerPos[0] + 0.18, -0.06, variant.runnerPos[2] - 0.12]}
        color="#c5ab8f"
        size={1.0}
        opacity={0.3}
      />
    </group>
  );
};

export const RollingBoulderThumbnail: React.FC<{ variant: number }> = ({ variant }) => {
  const v = BOULDER_THUMB_VARIANTS[variant] ?? BOULDER_THUMB_VARIANTS[0];
  const thumbConfig: EpisodeConfig = {
    ...config,
    camera: {
      ...config.camera,
      fov: v.fov ?? config.camera.fov,
      initialPosition: v.camera.position,
      waypoints: [{ frame: 0, position: v.camera.position, lookAt: v.camera.lookAt }],
      tracks: [],
      shake: [],
      rumbles: [],
    },
    audio: undefined,
    music: undefined,
    sfx: undefined,
    subtitles: undefined,
    overlays: { ...config.overlays, fadeInFrames: 0, fadeOutFrames: 0 },
    OverlayComponent: () => <ThumbText variant={v} />,
  };
  return <EpisodeVideo config={thumbConfig} Scene={() => <IndianaBoulderScene variant={v} />} />;
};
