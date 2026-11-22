// The other players, in this browser: each gets the same paladin body as ours (built from the
// face and armour he sends, net/mp.ts `Look`), walked through the poses he streams. Poses are
// played a little behind real time (DELAY_MS) so there are always two to ease between; one who
// stops sending (his game paused) stands where he last was. A name
// (and in a dive his health) floats over his head.
//
// Only those in the same place are drawn: in town everyone in the same zone (tavern or square),
// below only the party in this run.
import * as THREE from "three";
import { createPaladin, type Paladin } from "../../artifacts/characters/paladin";
import { dressGear, gearKey, paladinGearKey } from "../mace";
import { mp, type Look, type Pose } from "./mp";

const DELAY_MS = 140;
const PLATE_M = 28;

interface Sample {
  at: number;
  p: Pose;
}

interface Avatar {
  id: string;
  buf: Sample[];
  pal: Paladin | null;
  /** The face the body was built from (a new one rebuilds it) and the build under way. */
  specKey: string;
  building: string;
  lastSw: number;
  /** Smoothed facing and where he was last frame (for the walk cycle). */
  facing: number;
  px: number;
  pz: number;
  deadT: number;
  plate: HTMLDivElement;
  name: HTMLDivElement;
  bar: HTMLDivElement;
  fill: HTMLDivElement;
  /** Where he is drawn this frame (null: not shown). */
  shown: RemoteView | null;
}

/** A teammate as the game needs him: for the monsters, the camera when spectating, the minimap. */
export interface RemoteView {
  id: string;
  x: number;
  y: number;
  z: number;
  facing: number;
  yaw: number;
  pitch: number;
  air: number;
  dead: boolean;
  escaped: boolean;
  swinging: boolean;
  swingStarted: boolean;
  hp: number;
  maxHp: number;
}

export interface RemoteContext {
  place: "town" | "run";
  /** In town: the zone this player is in (others elsewhere are hidden). In a run: its id. */
  zone: "in" | "out";
  runId: string;
  camera: THREE.Camera;
  view: { width: number; height: number };
}

const lerpAngle = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export function createRemotes(gl: THREE.WebGLRenderer, scene: THREE.Scene, layer: HTMLElement) {
  const avatars = new Map<string, Avatar>();
  const _v = new THREE.Vector3();

  const avatar = (id: string): Avatar => {
    let a = avatars.get(id);
    if (a) return a;
    const plate = document.createElement("div");
    plate.style.cssText =
      "position:absolute;left:0;top:0;display:none;pointer-events:none;text-align:center;font:600 12px system-ui,sans-serif;color:#9fd4ff;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap;will-change:transform";
    const name = document.createElement("div");
    const bar = document.createElement("div");
    bar.style.cssText = "width:64px;height:5px;margin:3px auto 0;background:rgba(0,0,0,0.6);border:1px solid rgba(160,210,255,0.5);border-radius:2px;overflow:hidden";
    const fill = document.createElement("div");
    fill.style.cssText = "height:100%;width:100%;background:#5fd37a";
    bar.appendChild(fill);
    plate.append(name, bar);
    layer.appendChild(plate);
    a = { id, buf: [], pal: null, specKey: "", building: "", lastSw: 0, facing: 0, px: 0, pz: 0, deadT: 0, plate, name, bar, fill, shown: null };
    avatars.set(id, a);
    return a;
  };

  const drop = (id: string) => {
    const a = avatars.get(id);
    if (!a) return;
    avatars.delete(id);
    a.plate.remove();
    if (a.pal) {
      scene.remove(a.pal.group, a.pal.fx);
      a.pal.dispose();
    }
  };

  /** Build (or rebuild for a new face) his body; armour changes only switch pieces. */
  const dress = (a: Avatar, look: Look | null) => {
    if (!look) return;
    const key = JSON.stringify(look.spec);
    if (key !== a.specKey && key !== a.building) {
      a.building = key;
      createPaladin(gl, { character: look.spec })
        .then((p) => {
          if (avatars.get(a.id) !== a || a.building !== key) {
            p.dispose();
            return;
          }
          if (a.pal) {
            scene.remove(a.pal.group, a.pal.fx);
            a.pal.dispose();
          }
          a.pal = p;
          a.specKey = key;
          a.building = "";
          p.group.visible = false;
          scene.add(p.group, p.fx);
          const now = mp.state.players.get(a.id)?.look;
          if (now) dressGear(p, now.eq);
        })
        .catch((err: unknown) => {
          a.building = "";
          console.error("remote player body failed", err);
        });
    }
    const p = a.pal;
    if (p && a.specKey === key && paladinGearKey(p) !== gearKey(look.eq)) dressGear(p, look.eq);
  };

  const offPose = mp.on("s", (m) => {
    const id = String(m.id);
    if (!mp.state.players.has(id)) return;
    const a = avatar(id);
    a.buf.push({ at: performance.now(), p: m as unknown as Pose });
    if (a.buf.length > 24) a.buf.splice(0, a.buf.length - 24);
  });
  const offGone = mp.on("gone", (m) => drop(String(m.id)));
  const offReset = mp.on("reset", () => {
    for (const id of [...avatars.keys()]) drop(id);
  });

  /** Ease him between the two poses either side of (now - DELAY_MS). */
  const sample = (a: Avatar, now: number): { p: Pose; next: Pose; t: number } | null => {
    const buf = a.buf;
    if (!buf.length) return null;
    const at = now - DELAY_MS;
    while (buf.length > 2 && buf[1].at <= at) buf.shift();
    const p0 = buf[0];
    const p1 = buf[1] ?? p0;
    const span = p1.at - p0.at;
    const t = span > 0 ? Math.max(0, Math.min(1, (at - p0.at) / span)) : 1;
    return { p: p0.p, next: p1.p, t };
  };

  return {
    /** Everyone shown this frame (after `update`). */
    views(): RemoteView[] {
      const out: RemoteView[] = [];
      for (const a of avatars.values()) if (a.shown) out.push(a.shown);
      return out;
    },
    view(id: string): RemoteView | null {
      return avatars.get(id)?.shown ?? null;
    },
    update(dt: number, ctx: RemoteContext) {
      const now = performance.now();
      const players = mp.state.players;
      const party = mp.state.party;
      for (const a of [...avatars.values()]) {
        const info = players.get(a.id);
        if (!info) {
          drop(a.id);
          continue;
        }
        dress(a, info.look);
        const last = a.buf[a.buf.length - 1];
        const s = sample(a, now);
        // A player whose game is paused (his window hidden or covered) sends nothing: he stays where
        // he last was for as long as the hub has him online in the same place.
        const here =
          !!s &&
          !!last &&
          info.place === ctx.place &&
          info.zone !== "lobby" &&
          last.p.pl === ctx.place &&
          (ctx.place === "town" ? last.p.zn === ctx.zone : last.p.ru === ctx.runId) &&
          !(ctx.place === "run" && last.p.e);
        const pal = a.pal;
        if (!here || !s) {
          a.shown = null;
          a.plate.style.display = "none";
          if (pal) pal.group.visible = false;
          continue;
        }
        const { p, next, t } = s;
        const x = p.x + (next.x - p.x) * t;
        const y = p.y + (next.y - p.y) * t;
        const z = p.z + (next.z - p.z) * t;
        const air = p.a + (next.a - p.a) * t;
        const target = lerpAngle(p.f, next.f, t);
        const firstShow = !a.shown;
        a.facing = firstShow ? target : lerpAngle(a.facing, target, 1 - Math.exp(-dt * 18));
        const dead = !!next.dd;
        a.deadT = dead ? a.deadT + dt : 0;
        const sw = next.sw;
        const swingStarted = sw > a.lastSw;
        a.lastSw = sw;
        const vx = firstShow || dt <= 0 ? 0 : (x - a.px) / dt;
        const vz = firstShow || dt <= 0 ? 0 : (z - a.pz) / dt;
        a.px = x;
        a.pz = z;
        a.shown = {
          id: a.id,
          x,
          y,
          z,
          facing: a.facing,
          yaw: lerpAngle(p.yw, next.yw, t),
          pitch: p.p + (next.p - p.p) * t,
          air,
          dead,
          escaped: !!next.e,
          swinging: swingStarted,
          swingStarted,
          hp: next.hp,
          maxHp: next.mh || 100,
        };
        if (pal) {
          const floorY = y - air;
          const fall = dead ? Math.min(1, a.deadT / 0.55) : 0;
          pal.group.visible = true;
          pal.group.position.set(x, y + 0.17 * fall * fall, z);
          pal.group.rotation.order = "YXZ";
          pal.group.rotation.y = a.facing;
          pal.group.rotation.x = -(Math.PI / 2) * fall * fall;
          const sinF = Math.sin(a.facing);
          const cosF = Math.cos(a.facing);
          const eq = info.look?.eq;
          pal.update(
            dt,
            {
              moveX: vx * cosF - vz * sinF,
              moveZ: vx * sinF + vz * cosF,
              aimPitch: -a.shown.pitch * 0.45,
              turnRate: 0,
              air,
              block: !!next.b && !dead,
              attack: swingStarted && !dead && !next.dr,
              firstPerson: false,
              relaxed: dead || (!!eq && !eq.sword && !eq.shield && !next.dr),
              arms: !dead && next.dr ? "bow" : undefined,
            },
            floorY,
          );
        }
        // His name over his head (party members in blue with their health in a dive).
        _v.set(x, y + 1.9, z).project(ctx.camera);
        const dist = Math.hypot(x - ctx.camera.position.x, z - ctx.camera.position.z);
        if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05 || dist > PLATE_M) {
          a.plate.style.display = "none";
          continue;
        }
        const mate = !!party && party.members.indexOf(a.id) >= 0;
        a.plate.style.display = "block";
        a.plate.style.transform = `translate(${((_v.x + 1) / 2) * ctx.view.width}px, ${((1 - _v.y) / 2) * ctx.view.height}px) translate(-50%, -100%)`;
        const away = ctx.place === "run" && !!party?.run?.away?.[a.id];
        const label = `${mate ? "◆ " : ""}${info.name}${info.user && info.user !== info.name ? ` (${info.user})` : ""}${dead ? " — down" : away ? " — away" : ""}`;
        if (a.name.textContent !== label) a.name.textContent = label;
        a.plate.style.color = dead ? "#c98a80" : away ? "#a8a08c" : mate ? "#8fd0ff" : "#e8dcc0";
        a.bar.style.display = ctx.place === "run" ? "block" : "none";
        a.fill.style.width = `${Math.max(0, Math.min(100, (100 * next.hp) / (next.mh || 100)))}%`;
      }
    },
    dispose() {
      offPose();
      offGone();
      offReset();
      for (const id of [...avatars.keys()]) drop(id);
    },
  };
}

export type Remotes = ReturnType<typeof createRemotes>;
