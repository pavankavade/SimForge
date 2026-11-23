import type React from "react";
import { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { GlowSprite } from "../dungeon";
import { Block, CurveTube, Rod, type V3 } from "../mine/common";

/**
 * Cave rescue props: the boys' bikes left at the mouth, the pumps and their hoses, the rain and
 * the muddy stream, a flashlight, the divers' gear (side tanks, fins, mask), a tank clipped to the
 * line, and the wrapped stretcher and full-face mask of a sedated boy.
 */

/** A kid's bike lying on its stand. Local origin on the ground under the frame; it faces +x. */
export const Bike: React.FC<{ color: string; lean?: number }> = ({ color, lean = 0.15 }) => {
  const tyre = { color: "#1a1a1a", roughness: 0.85 };
  return (
    <group rotation={[lean, 0, 0]}>
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.33, 0]} castShadow>
          <torusGeometry args={[0.3, 0.035, 8, 22]} />
          <meshStandardMaterial {...tyre} />
        </mesh>
      ))}
      <Rod a={[-0.48, 0.33, 0]} b={[-0.05, 0.36, 0]} r={0.022} color={color} metalness={0.4} />
      <Rod a={[-0.05, 0.36, 0]} b={[0.38, 0.72, 0]} r={0.022} color={color} metalness={0.4} />
      <Rod a={[-0.05, 0.36, 0]} b={[-0.12, 0.74, 0]} r={0.022} color={color} metalness={0.4} />
      <Rod a={[-0.12, 0.74, 0]} b={[0.38, 0.72, 0]} r={0.022} color={color} metalness={0.4} />
      <Rod a={[-0.48, 0.33, 0]} b={[-0.12, 0.74, 0]} r={0.018} color={color} metalness={0.4} />
      <Rod a={[0.48, 0.33, 0]} b={[0.38, 0.72, 0]} r={0.02} color="#9aa0a6" metalness={0.6} />
      <Rod a={[0.38, 0.72, 0]} b={[0.4, 0.86, 0]} r={0.018} color="#9aa0a6" metalness={0.6} />
      <Rod a={[0.4, 0.86, -0.24]} b={[0.4, 0.86, 0.24]} r={0.016} color="#2a2a2a" />
      <Block min={[-0.22, 0.78, -0.06]} max={[-0.02, 0.82, 0.06]} color="#222" />
    </group>
  );
};

/** A diesel water pump on a skid with its intake and outlet stubs. Local origin on the ground; the outlet faces -x. */
export const Pump: React.FC<{ frame: number; on?: boolean }> = ({ frame, on = true }) => {
  const shake = on ? Math.sin(frame * 2.7) * 0.006 : 0;
  return (
    <group position={[0, shake, 0]}>
      <Block min={[-0.8, 0, -0.45]} max={[0.8, 0.12, 0.45]} color="#3d4146" metalness={0.4} roughness={0.6} />
      <Block min={[-0.15, 0.12, -0.38]} max={[0.75, 0.78, 0.38]} color="#e0b02a" roughness={0.5} metalness={0.2} />
      <Block min={[-0.7, 0.12, -0.3]} max={[-0.15, 0.62, 0.3]} color="#2f6aa8" roughness={0.5} metalness={0.3} />
      <Rod a={[0.55, 0.78, 0.2]} b={[0.55, 1.15, 0.2]} r={0.04} color="#2a2a2a" />
      {/* Outlet and intake. */}
      <Rod a={[-0.7, 0.4, 0]} b={[-0.95, 0.4, 0]} r={0.09} color="#1d1f22" />
      <Rod a={[0.0, 0.4, 0.3]} b={[0.0, 0.4, 0.55]} r={0.09} color="#1d1f22" />
      {[-0.55, 0.55].map((x) =>
        [-0.36, 0.36].map((z) => (
          <Block key={`${x}${z}`} min={[x - 0.1, 0.78, z - 0.04]} max={[x + 0.1, 0.82, z + 0.04]} color="#2a2a2a" castShadow={false} />
        ))
      )}
    </group>
  );
};

/** A flat hose along a path (laid on the ground or the cave floor). */
export const Hose: React.FC<{ points: V3[]; r?: number; color?: string }> = ({ points, r = 0.08, color = "#1f2a3a" }) => <CurveTube points={points} amount={1} r={r} color={color} />;

/** Water gushing out of a hose end toward -x: a short arc of droplets. */
export const Gush: React.FC<{ frame: number; position: V3; dir?: number; strength?: number }> = ({ frame, position, dir = -1, strength = 1 }) => {
  const drops = 26;
  return (
    <group position={position}>
      {Array.from({ length: drops }, (_, i) => {
        const t = ((frame * 0.07 + i / drops) % 1) * strength;
        const x = dir * t * 1.4;
        const y = -t * t * 0.9;
        const s = 0.08 + 0.05 * random(`gush-${i}`);
        return (
          <mesh key={i} position={[x, y, (random(`gz-${i}`) - 0.5) * 0.12]}>
            <sphereGeometry args={[s, 6, 5]} />
            <meshStandardMaterial color="#7d6a48" roughness={0.2} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
};

/** A work floodlight on a tripod, aimed along +x. */
export const Floodlight: React.FC<{ on: number; height?: number }> = ({ on, height = 2.2 }) => (
  <group>
    {[0, 2.1, 4.2].map((a) => (
      <Rod key={a} a={[Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4]} b={[0, height, 0]} r={0.025} color="#2a2a2a" />
    ))}
    <Block min={[-0.05, height - 0.18, -0.26]} max={[0.16, height + 0.18, 0.26]} color="#e0b02a" />
    <mesh position={[0.165, height, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.46, 0.3]} />
      <meshStandardMaterial color="#fff8e0" emissive="#fff0c8" emissiveIntensity={3 * on} toneMapped={false} />
    </mesh>
    {on > 0.05 && <GlowSprite position={[0.4, height, 0]} color="#fff2cc" size={2.4} opacity={0.55 * on} />}
  </group>
);

/**
 * Rain in a box round `center` (size `size`), falling fast at a slant. One instanced mesh,
 * placed from the frame so every still matches the render.
 */
export const Rain: React.FC<{ frame: number; center: V3; size: V3; amount: number; count?: number }> = ({ frame, center, size, amount, count = 900 }) => {
  const { mesh, seeds } = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.012, 0.55, 0.012);
    const mat = new THREE.MeshBasicMaterial({ color: "#d6e2ee", transparent: true, opacity: 0.45, depthWrite: false });
    const im = new THREE.InstancedMesh(geo, mat, count);
    im.frustumCulled = false;
    const s = Array.from({ length: count }, (_, i) => [random(`rx-${i}`), random(`ry-${i}`), random(`rz-${i}`), 0.75 + random(`rv-${i}`) * 0.5]);
    return { mesh: im, seeds: s };
  }, [count]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.18));
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3(1, 1, 1);
  const shown = Math.round(count * Math.max(0, Math.min(1, amount)));
  for (let i = 0; i < count; i++) {
    const [rx, ry, rz, rv] = seeds[i];
    const fall = (ry - frame * 0.06 * rv) % 1;
    const y = center[1] + ((fall < 0 ? fall + 1 : fall) - 0.5) * size[1];
    v.set(center[0] + (rx - 0.5) * size[0] - (y - center[1]) * 0.18, y, center[2] + (rz - 0.5) * size[2]);
    sc.setScalar(i < shown ? 1 : 0);
    m.compose(v, q, sc);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

const useFoam = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    g.fillStyle = "#6f5a38";
    g.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 140; i++) {
      const x = random(`fx-${i}`) * 512;
      const y = random(`fy-${i}`) * 128;
      g.fillStyle = `rgba(214,196,160,${0.15 + random(`fa-${i}`) * 0.35})`;
      g.beginPath();
      g.ellipse(x, y, 10 + random(`fw-${i}`) * 40, 2 + random(`fh-${i}`) * 3, 0, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);

/** A muddy stream running along the ground toward +x (into the cave mouth), its foam flowing. */
export const Stream: React.FC<{ frame: number; x0: number; x1: number; z0: number; z1: number; y?: number; speed?: number }> = ({ frame, x0, x1, z0, z1, y = 0.06, speed = 0.03 }) => {
  const foam = useFoam();
  foam.repeat.set((x1 - x0) / 4, 1);
  foam.offset.x = -frame * speed;
  return (
    <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial map={foam} roughness={0.15} metalness={0.05} transparent opacity={0.92} />
    </mesh>
  );
};

/** A hand flashlight with its glow (and an optional spot light), pointing along +x of its group. */
export const Flashlight: React.FC<{ on?: number; spot?: boolean; intensity?: number }> = ({ on = 1, spot = false, intensity = 6 }) => {
  const light = useMemo(() => {
    const l = new THREE.SpotLight("#fff1d0", 0, 9, 0.55, 0.6, 1.4);
    l.position.set(0, 0, 0);
    l.target.position.set(1, -0.25, 0);
    return l;
  }, []);
  light.intensity = intensity * on;
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.025, 0.2, 10]} />
        <meshStandardMaterial color="#26292e" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <circleGeometry args={[0.03, 12]} />
        <meshStandardMaterial color="#fff6dc" emissive="#fff0c8" emissiveIntensity={3 * on} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {on > 0.05 && <GlowSprite position={[0.16, 0, 0]} color="#fff2cc" size={0.9} opacity={0.6 * on} />}
      {spot && (
        <>
          <primitive object={light} />
          <primitive object={light.target} />
        </>
      )}
    </group>
  );
};

/**
 * A diver's kit in the human's own frame (place it in a group with the human's feet position,
 * yaw, pitch and scale; +y is up his body, +z is the way his face looks): two side-mounted tanks,
 * fins at the feet, and a lamp beam out ahead of his head.
 */
export const DiverKit: React.FC<{ lamp?: number; fins?: boolean; beam?: boolean; tankColor?: string }> = ({ lamp = 1, fins = true, beam = true, tankColor = "#d8d8d2" }) => (
  <group>
    {[-0.27, 0.27].map((x) => (
      <group key={x} position={[x, 1.05, -0.06]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.62, 14]} />
          <meshStandardMaterial color={tankColor} roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.08, 8]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>
    ))}
    {fins &&
      [-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, -0.18, 0.1]} rotation={[0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.42, 0.02]} />
          <meshStandardMaterial color="#1b1d20" roughness={0.5} />
        </mesh>
      ))}
    {beam && lamp > 0.02 && (
      <mesh position={[0, 1.95, 1.3]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
        <coneGeometry args={[0.55, 2.4, 18, 1, true]} />
        <meshBasicMaterial color="#fff0c8" transparent opacity={0.1 * lamp} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    )}
  </group>
);

/**
 * The kid-sized submarine built from rocket parts: a metal tube with a nose cone, bands, oxygen
 * ports and carry handles, on a wheeled cradle. Local origin on the ground; the nose points +x.
 */
export const MiniSub: React.FC = () => {
  const hull = { color: "#d9dde2", roughness: 0.3, metalness: 0.65 };
  const dark = { color: "#22262b", roughness: 0.5, metalness: 0.4 };
  const y = 0.48;
  return (
    <group>
      {/* Cradle: a trolley with two saddles. */}
      <Block min={[-0.85, 0.12, -0.26]} max={[0.85, 0.18, 0.26]} color="#4c5157" metalness={0.4} roughness={0.55} />
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <Block min={[x - 0.08, 0.18, -0.2]} max={[x + 0.08, y - 0.12, 0.2]} color="#8a6a48" />
          {[-0.22, 0.22].map((z) => (
            <mesh key={z} position={[x, 0.07, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.05, 12]} />
              <meshStandardMaterial color="#161616" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Hull, nose cone and tail cap. */}
      <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.5, 28]} />
        <meshStandardMaterial {...hull} />
      </mesh>
      <mesh position={[0.95, y, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.2, 0.4, 28]} />
        <meshStandardMaterial {...hull} />
      </mesh>
      <mesh position={[-0.78, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.205, 0.17, 0.08, 28]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      {[-0.45, 0.1, 0.6].map((x) => (
        <mesh key={x} position={[x, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.206, 0.206, 0.05, 28]} />
          <meshStandardMaterial {...dark} />
        </mesh>
      ))}
      {/* Oxygen ports and carry handles. */}
      {[-0.62, 0.78].map((x) => (
        <mesh key={x} position={[x, y + 0.16, 0.12]}>
          <cylinderGeometry args={[0.03, 0.03, 0.06, 10]} />
          <meshStandardMaterial color="#e0b02a" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      {[-0.3, 0.35].map((x) => (
        <group key={x}>
          <Rod a={[x - 0.1, y + 0.19, 0]} b={[x - 0.1, y + 0.3, 0]} r={0.012} color="#22262b" />
          <Rod a={[x + 0.1, y + 0.19, 0]} b={[x + 0.1, y + 0.3, 0]} r={0.012} color="#22262b" />
          <Rod a={[x - 0.1, y + 0.3, 0]} b={[x + 0.1, y + 0.3, 0]} r={0.012} color="#22262b" />
        </group>
      ))}
    </group>
  );
};

/** A spare tank clipped to the guide line, lying along x. */
export const LineTank: React.FC = () => (
  <group rotation={[0, 0, Math.PI / 2 - 0.2]}>
    <mesh castShadow>
      <cylinderGeometry args={[0.085, 0.085, 0.62, 14]} />
      <meshStandardMaterial color="#e6e2d2" roughness={0.35} metalness={0.45} />
    </mesh>
    <mesh position={[0, 0.34, 0]}>
      <cylinderGeometry args={[0.03, 0.04, 0.08, 8]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.7} />
    </mesh>
    <Block min={[-0.09, -0.05, -0.02]} max={[0.09, 0.05, 0.02]} color="#f2c41a" castShadow={false} />
  </group>
);

/**
 * The sedated boy's kit, in his own frame (as DiverKit): the full-face mask over his face
 * (`mask` 0..1 fits it), and the wrapped stretcher round his body (`wrap` 0..1 closes it from
 * the feet up).
 */
export const Bundle: React.FC<{ mask: number; wrap: number }> = ({ mask, wrap }) => {
  const len = 1.42 * Math.max(0.001, wrap);
  return (
    <group>
      {mask > 0.01 && (
        <group position={[0, 1.6, 0.11]} scale={0.6 + 0.4 * mask}>
          <mesh scale={[0.12, 0.15, 0.075]}>
            <sphereGeometry args={[1, 18, 14]} />
            <meshStandardMaterial color="#15171a" roughness={0.5} transparent opacity={mask} />
          </mesh>
          <mesh position={[0, 0.02, 0.05]} scale={[0.09, 0.075, 0.03]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial color="#9fb7c8" roughness={0.05} metalness={0.3} transparent opacity={0.55 * mask} />
          </mesh>
          <mesh position={[0, -0.12, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.05, 10]} />
            <meshStandardMaterial color="#2c2f33" roughness={0.4} />
          </mesh>
        </group>
      )}
      {wrap > 0.01 && (
        <mesh position={[0, 0.06 + len / 2, 0]} scale={[0.31, 1, 0.2]} castShadow>
          <cylinderGeometry args={[1, 0.85, len, 18]} />
          <meshStandardMaterial color="#f06a1c" roughness={0.45} />
        </mesh>
      )}
      {wrap > 0.6 &&
        [0.35, 0.8, 1.2].map((y) => (
          <mesh key={y} position={[0, y, 0]} scale={[0.325, 1, 0.215]}>
            <cylinderGeometry args={[1, 1, 0.05, 18]} />
            <meshStandardMaterial color="#1e1f22" roughness={0.6} />
          </mesh>
        ))}
    </group>
  );
};
