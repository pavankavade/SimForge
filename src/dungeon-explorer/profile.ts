// Who is playing: each browser gets a player id and a random adventurer's name the first time, and
// everything he keeps (the bag and purse he brings out of the dungeon, the rooms he rents and their
// chests) is saved under that id: in the browser always, and on the server (Cloudflare Pages
// Functions + KV, web/functions/api/profile) when it is there. Only what he has in town is sent up,
// so the server copy is what he extracted, never a half-finished run.
//
// `?player=<id>` on the URL takes over an existing profile (the same player on another device).
import type { ClassId } from "./classes";
import type { PlayerInv } from "./playerInv";
import type { TownSave } from "./town/townSave";

const KEY = "simforge.explorer.profile.v1";
const ID_RE = /^[a-z0-9-]{16,64}$/;

export interface Profile {
  id: string;
  name: string;
  created: number;
  /** When his town save last changed here (ms); the newer of this and the server's copy wins. */
  updated: number;
  /** The class he last played (picked on the class screen at the start). */
  cls?: ClassId;
}

/** What the server keeps for a player. */
export interface CloudSave {
  name: string;
  cls?: ClassId;
  inventory: PlayerInv;
  town: TownSave;
  updated: number;
}

const GIVEN = [
  "Aldric", "Brannoc", "Cedric", "Edda", "Godric", "Hilde", "Isolde", "Jorund", "Kestrel", "Leofric",
  "Maude", "Osric", "Rowena", "Sigrun", "Theobald", "Ulric", "Wynn", "Ysolde", "Baldric", "Elspeth",
  "Garrick", "Mirela", "Tamsin", "Corwin",
];
const BYNAME = [
  "Ashford", "Blackmere", "Thornbrook", "the Grey", "Ironside", "of Hollowmere", "Stonehand", "Wolfsbane",
  "the Bold", "Duskwalker", "Emberfall", "Ravenhill", "Coldwater", "the Wanderer", "Oakheart", "Saltmarsh",
];

/** A random number in [0, 1) from the browser's crypto (players are not replays: no seed). */
function cryptoRandom(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

/** A name like "Sigrun Ironside" (the player id, not the name, tells two Sigruns apart). */
export function randomHeroName(rnd: () => number = cryptoRandom): string {
  const pick = (xs: string[]) => xs[Math.floor(rnd() * xs.length)];
  return `${pick(GIVEN)} ${pick(BYNAME)}`;
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // Older browsers: below.
  }
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(cryptoRandom() * 16).toString(16);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export function saveProfile(p: Profile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Blocked storage: he plays as a guest this time.
  }
}

/** This browser's player, made (and saved) the first time; `?player=` switches to another id. */
export function loadProfile(): Profile {
  let p: Profile | null = null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Profile>;
      if (s && typeof s.id === "string" && ID_RE.test(s.id) && typeof s.name === "string") {
        p = { id: s.id, name: s.name.slice(0, 40) || randomHeroName(), created: Number(s.created) || Date.now(), updated: Number(s.updated) || 0, cls: s.cls };
      }
    }
  } catch {
    // A broken save: a new player.
  }
  const asked = new URLSearchParams(window.location.search).get("player");
  if (asked && ID_RE.test(asked) && asked !== p?.id) p = { id: asked, name: p?.name ?? randomHeroName(), created: Date.now(), updated: 0 };
  if (!p) p = { id: newId(), name: randomHeroName(), created: Date.now(), updated: 0 };
  saveProfile(p);
  return p;
}

const api = (id: string) => `/api/profile/${encodeURIComponent(id)}`;

/** The server's copy, or null (none yet, or no server: local play only). */
export async function fetchCloud(id: string): Promise<CloudSave | null> {
  try {
    const r = await fetch(api(id), { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    if (!(r.headers.get("content-type") ?? "").includes("application/json")) return null;
    const s = (await r.json()) as Partial<CloudSave>;
    if (!s || !s.inventory || !s.town || typeof s.updated !== "number") return null;
    return s as CloudSave;
  } catch {
    return null;
  }
}

/** Sends the latest save up a moment after changes stop (and when the page is hidden). */
export function createCloudSync(id: string) {
  let pending: CloudSave | null = null;
  let timer = 0;
  let offline = false;
  const send = (keepalive = false) => {
    window.clearTimeout(timer);
    const body = pending;
    pending = null;
    if (!body || offline) return;
    fetch(api(id), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive })
      .then((r) => {
        // No server here (the local dev server, or storage not set up): stop trying.
        if (r.status === 404 || r.status === 405 || r.status === 503) offline = true;
      })
      .catch(() => {});
  };
  const onHide = () => {
    if (document.visibilityState === "hidden") send(true);
  };
  document.addEventListener("visibilitychange", onHide);
  return {
    push(save: CloudSave) {
      pending = save;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => send(), 1500);
    },
    dispose() {
      send(true);
      document.removeEventListener("visibilitychange", onHide);
    },
  };
}
