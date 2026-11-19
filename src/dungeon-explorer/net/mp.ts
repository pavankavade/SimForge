// The game's line to the multiplayer hub (web/mp/hub.js): who else is online and where, chat,
// the party and its invites, and the dive the party leader starts. Poses and game traffic are
// high-frequency and go to listeners (net/remotes.ts, net/coop.ts) without waking React; the rest
// is a small store the UI reads with useSyncExternalStore (useMp).
//
// Where the hub is: `?mp=<ws url>` on the page, else the hub on this machine when the page is on
// localhost (npm run mp), else the deployed Worker (MP_URL). `?mp=off` plays alone.
import { useSyncExternalStore } from "react";
import type { ArmorEquipment, HumanSpec } from "../../artifacts/characters/paladin";

/** The deployed hub (web/mp-worker, `npm run deploy:mp`). Empty: the live game plays alone. */
export const MP_URL = "wss://simforge-game-mp.pavandev.workers.dev/ws";
const LOCAL_PORT = 5397;

export interface Look {
  spec: HumanSpec;
  /** The armour and weapons shown on him right now. */
  eq: ArmorEquipment;
}

export interface NetPlayer {
  id: string;
  name: string;
  /** His account's username when the hub checked his session (null: not signed in). */
  user: string | null;
  cls: string;
  look: Look | null;
  place: "town" | "run";
  /** In town: in the tavern ("in") or out on the square ("out"). */
  zone: "in" | "out";
  party: string | null;
  leader: boolean;
  size: number;
  /** His line dropped (a reload): the hub keeps his place in his party for two minutes. */
  offline?: boolean;
}

export type RunStatus = "loading" | "in" | "dead" | "out";

export interface RunView {
  id: string;
  seed: number;
  rooms: number;
  theme: string;
  life: number;
  /** Hub time (ms) the run's clock starts at. */
  startAt: number;
  /** Who went down, in party order: the first still on the floor runs the monsters. */
  members: string[];
  status: Record<string, RunStatus>;
  /** Whose game is paused (his window hidden): not targeted, and he runs no monsters. */
  away: Record<string, boolean>;
  /** Who left only because his game did (a reload): he may join again. */
  dropped: Record<string, boolean>;
  /** Whose game runs the monsters (the hub decides, so every game agrees). */
  auth: string;
}

export interface PartyView {
  id: string;
  leader: string;
  members: string[];
  run: RunView | null;
}

export interface ChatLine {
  key: number;
  name: string;
  text: string;
  ch: "all" | "party" | "sys" | "err";
  at: number;
}

export interface Invite {
  from: string;
  name: string;
  at: number;
}

/** One player's pose, ~12 times a second (metres, radians). */
export interface Pose {
  /** Feet (world, with the jump in y), facing, the camera's yaw and pitch, height off the floor. */
  x: number;
  y: number;
  z: number;
  f: number;
  yw: number;
  p: number;
  a: number;
  /** Swing counter (a new cut when it goes up), shield up, bow drawn, down, out through a portal. */
  sw: number;
  b: 0 | 1;
  dr: 0 | 1;
  dd: 0 | 1;
  e: 0 | 1;
  hp: number;
  mh: number;
  /** Where: town (zone in/out) or a party's run. */
  pl: "town" | "run";
  zn: "in" | "out";
  ru: string;
}

export interface MpState {
  status: "off" | "connecting" | "online" | "offline";
  me: string | null;
  players: Map<string, NetPlayer>;
  party: PartyView | null;
  invites: Invite[];
  chat: ChatLine[];
}

type Listener = (msg: Record<string, unknown>) => void;

export interface Hello {
  name: string;
  cls: string;
  token: string | null;
  look: Look | null;
  zone: "in" | "out";
  /** His character's id: a reload (or a dropped line) finds his party again. */
  key: string;
  /** Where his game is, and the party's dive it is in (a dropped line mid-dive carries on). */
  place: "town" | "run";
  run: string | null;
}

function hubUrl(): string | null {
  const q = new URLSearchParams(window.location.search).get("mp");
  if (q === "off" || q === "0") return null;
  if (q && /^wss?:\/\//.test(q)) return q;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return `ws://${h}:${LOCAL_PORT}/ws`;
  return MP_URL || null;
}

class Mp {
  state: MpState = { status: "off", me: null, players: new Map(), party: null, invites: [], chat: [] };
  private version = 0;
  private subs = new Set<() => void>();
  private listeners = new Map<string, Set<Listener>>();
  private ws: WebSocket | null = null;
  private hello: Hello | null = null;
  private retry = 0;
  private retryTimer = 0;
  private pingTimer = 0;
  private offset = 0;
  private chatKey = 0;
  readonly url = hubUrl();

  /** Hub time now (ms): the run clock everyone in a party shares. */
  serverNow(): number {
    return Date.now() + this.offset;
  }

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  };
  getVersion = () => this.version;
  private changed() {
    this.version++;
    for (const fn of this.subs) fn();
  }

  /** Listen to one message type (`s`, `g`, `run`, `runstate`, `gone`, ...). */
  on(t: string, fn: Listener): () => void {
    let set = this.listeners.get(t);
    if (!set) this.listeners.set(t, (set = new Set()));
    set.add(fn);
    return () => set?.delete(fn);
  }
  private emit(t: string, msg: Record<string, unknown>) {
    const set = this.listeners.get(t);
    if (set) for (const fn of set) fn(msg);
  }

  connect(hello: Hello) {
    this.hello = hello;
    if (!this.url || this.ws) return;
    this.open();
  }

  private open() {
    if (!this.url || !this.hello) return;
    this.state.status = "connecting";
    this.changed();
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.lost();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      if (this.hello) ws.send(JSON.stringify({ t: "hello", ...this.hello }));
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== "string") return;
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      this.receive(m);
    };
    ws.onclose = () => {
      if (this.ws === ws) this.lost();
    };
  }

  private lost() {
    this.ws = null;
    window.clearInterval(this.pingTimer);
    const was = this.state.status;
    this.state = { status: "offline", me: null, players: new Map(), party: null, invites: [], chat: this.state.chat };
    if (was === "online") this.note("sys", "Lost the connection to the other players. Reconnecting...");
    this.changed();
    this.emit("reset", {});
    // Back off: 1, 2, 4 ... 30 s.
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => this.open(), Math.min(30_000, 1000 * 2 ** this.retry++));
  }

  send(msg: Record<string, unknown>) {
    const ws = this.ws;
    if (ws && ws.readyState === WebSocket.OPEN && this.state.status === "online") ws.send(JSON.stringify(msg));
  }

  private note(ch: ChatLine["ch"], text: string, name = "") {
    this.state.chat = [...this.state.chat.slice(-59), { key: ++this.chatKey, name, text, ch, at: Date.now() }];
  }

  private receive(m: Record<string, unknown>) {
    const st = this.state;
    switch (m.t) {
      case "welcome": {
        this.offset = Number(m.now) - Date.now();
        st.status = "online";
        st.me = String(m.id);
        st.players = new Map((m.players as NetPlayer[]).map((p) => [p.id, p]));
        const n = st.players.size;
        this.note("sys", n ? `Connected. ${n} other ${n === 1 ? "player is" : "players are"} online.` : "Connected. Nobody else is online yet.");
        window.clearInterval(this.pingTimer);
        this.pingTimer = window.setInterval(() => this.send({ t: "ping" }), 20_000);
        this.changed();
        this.emit("welcome", m);
        return;
      }
      case "pong":
        // Keep the clock honest (half the round trip is lost; a party only needs a few tenths).
        this.offset += (Number(m.now) - Date.now() - this.offset) * 0.3;
        return;
      case "join": {
        const p = m.p as NetPlayer;
        if (p.id === st.me) return;
        const fresh = !st.players.has(p.id);
        st.players = new Map(st.players).set(p.id, p);
        if (fresh) this.note("sys", `${p.name} came online.`);
        this.changed();
        this.emit("join", m);
        return;
      }
      case "gone": {
        const p = st.players.get(String(m.id));
        if (!p) return;
        const next = new Map(st.players);
        next.delete(p.id);
        st.players = next;
        st.invites = st.invites.filter((i) => i.from !== p.id);
        this.note("sys", `${p.name} went offline.`);
        this.changed();
        this.emit("gone", m);
        return;
      }
      case "look":
      case "where": {
        const p = st.players.get(String(m.id));
        if (!p) return;
        const q = { ...p };
        if (m.t === "look") {
          q.look = (m.look as Look) ?? null;
          q.cls = String(m.cls ?? q.cls);
          q.name = String(m.name ?? q.name);
        } else {
          q.place = m.place === "run" ? "run" : "town";
          q.zone = m.zone === "out" ? "out" : "in";
        }
        st.players = new Map(st.players).set(p.id, q);
        this.changed();
        this.emit(String(m.t), m);
        return;
      }
      case "chat":
        this.note(m.ch === "party" ? "party" : "all", String(m.text), String(m.name));
        this.changed();
        return;
      case "sys":
      case "err":
        this.note(m.t, String(m.text));
        this.changed();
        return;
      case "invite":
        st.invites = [...st.invites.filter((i) => i.from !== m.from), { from: String(m.from), name: String(m.name), at: Date.now() }];
        this.changed();
        return;
      case "party": {
        st.party = (m.party as PartyView | null) ?? null;
        if (st.party) st.invites = [];
        this.changed();
        this.emit("party", m);
        return;
      }
      case "run":
        if (st.party) st.party = { ...st.party, run: m.run as RunView };
        this.changed();
        this.emit("run", m);
        return;
      case "runstate":
        if (st.party?.run && st.party.run.id === m.run) {
          st.party = {
            ...st.party,
            run: {
              ...st.party.run,
              status: m.status as Record<string, RunStatus>,
              away: (m.away as Record<string, boolean>) ?? {},
              dropped: (m.dropped as Record<string, boolean>) ?? {},
              members: (m.members as string[]) ?? st.party.run.members,
              auth: String(m.auth ?? ""),
            },
          };
        }
        this.changed();
        this.emit("runstate", m);
        return;
      default:
        this.emit(String(m.t), m);
    }
  }

  // ---- what the game says ----------------------------------------------------------------------

  setLook(look: Look, cls: string, name: string) {
    if (this.hello) this.hello = { ...this.hello, look, cls, name };
    this.send({ t: "look", look, cls, name });
  }
  setWhere(place: "town" | "run", zone: "in" | "out") {
    if (this.hello) this.hello = { ...this.hello, zone, place };
    this.send({ t: "where", place, zone });
  }
  chat(text: string, ch: "all" | "party") {
    this.send({ t: "chat", text, ch });
  }
  invite(to: string) {
    this.send({ t: "invite", to });
  }
  answer(from: string, yes: boolean) {
    this.state.invites = this.state.invites.filter((i) => i.from !== from);
    this.changed();
    this.send({ t: yes ? "accept" : "decline", from });
  }
  leaveParty() {
    this.send({ t: "leave" });
  }
  kick(id: string) {
    this.send({ t: "kick", id });
  }
  startRun(seed: number, rooms: number, theme: string, life: number) {
    this.send({ t: "start", seed, rooms, theme, life });
  }
  /** Join the party's dive already under way. */
  joinRun() {
    this.send({ t: "joinrun" });
  }
  /** The party's dive his game is in now (null: none), told again if the line drops. */
  setRun(id: string | null) {
    if (this.hello) this.hello = { ...this.hello, run: id };
  }
  /** His party is down there and he may join it (he missed the start, or a reload took him out). */
  canJoinRun(): boolean {
    const run = this.state.party?.run;
    const me = this.state.me;
    if (!run || !me) return false;
    const st = run.status[me];
    return !st || (st === "out" && !!run.dropped?.[me]);
  }
  runStatus(st: "in" | "dead" | "out") {
    this.send({ t: "rs", st });
  }
  /** His window was hidden or shown again during a party's dive. */
  away(on: boolean) {
    this.send({ t: "away", on });
  }
  /** A blow on another player in the arena (`ko`: he went down to it, sent back to the winner). */
  pvp(to: string, dmg: number, dx: number, dz: number, ko = false) {
    this.send({ t: "pvp", to, dmg, dx, dz, ko });
  }
  pose(p: Pose) {
    this.send({ t: "s", ...p });
  }
  game(msg: Record<string, unknown>) {
    this.send({ t: "g", ...msg });
  }

  /** A player's name (or "someone"). */
  nameOf(id: string | null | undefined): string {
    if (!id) return "someone";
    return this.state.players.get(id)?.name ?? "someone";
  }
  /** Am I in a party, and do I lead it? */
  leading(): boolean {
    const p = this.state.party;
    return !!p && p.leader === this.state.me;
  }
}

export const mp = new Mp();

/** Re-render on any change to the hub's store; returns its state. */
export function useMp(): MpState {
  useSyncExternalStore(mp.subscribe, mp.getVersion);
  return mp.state;
}
