// The dungeon crawler's multiplayer hub: who is online, where they are (town or a party's dive),
// chat, parties and invites, and the relay that carries every player's moves and the leader's
// monsters to the others. It is plain JavaScript with no platform in it: the Cloudflare Durable
// Object (web/mp-worker) and the local dev server (scripts/mp-server.mjs) both wrap it and hand it
// sockets with `send(text)` and `close()`.
//
// Messages are JSON objects with a type `t`. From a client:
//   hello  { name, cls, token?, look, key, place, run }
//                                            first message: who he is (token: his account session;
//                                            key: his character, so a reload finds his party again;
//                                            place/run: where his game is now)
//   look   { look?, cls?, name? }            his looks changed (armour on or off, a new face)
//   where  { place: "town" | "run", zone? }  he went somewhere (zone: tavern "in" or square "out")
//   s      { ...pose }                       his pose (relayed as is to everyone in the same place)
//   chat   { text, ch: "all" | "party" }
//   invite { to } / accept { from } / decline { from } / leave / kick { id }
//   start  { seed, rooms, theme, life }      the party leader takes the party down
//   joinrun { }                              he joins his party's dive already under way
//   rs     { st: "in" | "dead" | "out" }     how he stands in the party's dive
//   away   { on }                            his window is hidden (his game is paused)
//   g      { to?, ... }                      game traffic inside a dive (monsters, hits, doors)
//   ping   { }
// From the hub: welcome, join, gone, look, where, s, chat, invite, party, run, runstate, g, sys,
// err, pong. Every message from a player carries his id as `id` (or `from`).

const MAX_PARTY = 4;
/** A player whose socket closed keeps his place in his party this long (a reload, a dropped line). */
const GRACE_MS = 60_000;
const INVITE_MS = 60_000;
const CHAT_MAX = 200;
const NAME_RE = /^[\p{L}\p{N} '._-]{1,24}$/u;

/** A short random id (players, parties and runs). */
function rid(n = 8) {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  for (const x of b) s += a[x % a.length];
  return s;
}

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);

export class Hub {
  /**
   * @param {object} [opts]
   * @param {(token: string) => Promise<string | null>} [opts.verify] the account name behind a
   *   session token (null: none). Without it, nobody is shown as signed in.
   * @param {() => number} [opts.now]
   */
  constructor(opts = {}) {
    this.verify = opts.verify ?? null;
    this.now = opts.now ?? (() => Date.now());
    /** @type {Map<string, any>} by player id */
    this.players = new Map();
    /** @type {Map<any, any>} socket -> player */
    this.bySocket = new Map();
    /** @type {Map<string, any>} by party id: { id, leader, members: string[], run } */
    this.parties = new Map();
  }

  // ---- sockets ---------------------------------------------------------------------------------

  /** A socket opened; nothing is known about him until his hello. */
  open(sock) {
    const p = {
      id: rid(),
      sock,
      ready: false,
      name: "",
      user: null,
      cls: "fighter",
      look: null,
      place: "town",
      zone: "in",
      party: null,
      pose: null,
      chatAt: 0,
      chatBurst: 0,
      invites: new Map(),
    };
    this.bySocket.set(sock, p);
  }

  close(sock) {
    const p = this.bySocket.get(sock);
    if (!p) return;
    this.bySocket.delete(sock);
    if (!p.ready || p.sock !== sock) return;
    p.sock = null;
    const party = p.party ? this.parties.get(p.party) : null;
    if (!party) {
      this.drop(p);
      return;
    }
    // In a party: he keeps his place for a while (a reload or a dropped line comes back to it).
    // Meanwhile his game runs nothing for the others, so in a dive he counts as away.
    p.offline = true;
    if (party.run && party.run.status[p.id] && party.run.status[p.id] !== "out") {
      party.run.away[p.id] = true;
      this.runChanged(party);
    }
    clearTimeout(p.grace);
    p.grace = setTimeout(() => this.drop(p), GRACE_MS);
    this.broadcast({ t: "join", p: this.summary(p) });
  }

  /** Gone for good: out of his party, off everyone's list. */
  drop(p) {
    clearTimeout(p.grace);
    if (p.sock) return;
    if (this.players.get(p.id) !== p) return;
    this.leaveParty(p, true);
    this.players.delete(p.id);
    this.broadcast({ t: "gone", id: p.id });
  }

  async message(sock, text) {
    const p = this.bySocket.get(sock);
    if (!p) return;
    if (typeof text !== "string" || text.length > 64_000) return;
    let m;
    try {
      m = JSON.parse(text);
    } catch {
      return;
    }
    if (!m || typeof m.t !== "string") return;
    if (!p.ready) {
      if (m.t === "hello") await this.hello(p, m);
      return;
    }
    switch (m.t) {
      case "s":
        // His pose: to everyone in the same place (the town, or his party's dive), and kept for
        // whoever arrives there later (a paused game sends nothing new).
        m.id = p.id;
        p.pose = m;
        this.toPlace(p, m);
        return;
      case "g":
        this.game(p, m);
        return;
      case "ping":
        this.send(p, { t: "pong", now: this.now() });
        return;
      case "look":
        if (m.look && typeof m.look === "object") p.look = m.look;
        if (typeof m.cls === "string") p.cls = clean(m.cls, 16);
        if (typeof m.name === "string" && NAME_RE.test(m.name.trim())) p.name = m.name.trim();
        this.broadcast({ t: "look", id: p.id, look: p.look, cls: p.cls, name: p.name }, p);
        return;
      case "where": {
        const was = p.place;
        p.place = m.place === "run" ? "run" : "town";
        p.zone = m.zone === "out" ? "out" : "in";
        this.broadcast({ t: "where", id: p.id, place: p.place, zone: p.zone }, p);
        if (was !== "town" && p.place === "town") this.sendPoses(p);
        return;
      }
      case "chat":
        this.chat(p, m);
        return;
      case "invite":
        this.invite(p, m.to);
        return;
      case "accept":
        this.accept(p, m.from);
        return;
      case "decline": {
        const from = this.players.get(m.from);
        p.invites.delete(m.from);
        if (from) this.send(from, { t: "sys", text: `${p.name} declined your invite.` });
        return;
      }
      case "leave":
        this.leaveParty(p, false);
        return;
      case "kick":
        this.kick(p, m.id);
        return;
      case "start":
        this.start(p, m);
        return;
      case "joinrun":
        this.joinRun(p);
        return;
      case "rs":
        this.runStatus(p, m.st);
        return;
      case "away":
        this.runAway(p, !!m.on);
        return;
    }
  }

  async hello(p, m) {
    let user = null;
    if (this.verify && typeof m.token === "string" && m.token.length <= 128) {
      try {
        user = await this.verify(m.token);
      } catch {
        user = null;
      }
    }
    // He may have gone while the account was being checked.
    if (!this.bySocket.has(p.sock)) return;
    // The same character again (a reload, a reconnect): he takes his old place, party and all.
    const key = clean(m.key, 64);
    const old = key ? [...this.players.values()].find((o) => o.key === key) : null;
    if (old) {
      if (old.sock && old.sock !== p.sock) {
        // A second socket for him (the old one not closed yet): the new one wins.
        this.bySocket.delete(old.sock);
        try {
          old.sock.close();
        } catch {
          // already closing
        }
      }
      clearTimeout(old.grace);
      old.offline = false;
      old.sock = p.sock;
      this.bySocket.set(p.sock, old);
      p = old;
    } else p.key = key;
    const name = clean(m.name, 24);
    p.name = NAME_RE.test(name) ? name : `Wanderer ${p.id.slice(0, 3)}`;
    p.cls = clean(m.cls, 16) || "fighter";
    p.look = m.look && typeof m.look === "object" ? m.look : null;
    p.zone = m.zone === "out" ? "out" : "in";
    p.place = m.place === "run" ? "run" : "town";
    p.user = user;
    p.ready = true;
    this.players.set(p.id, p);
    this.send(p, {
      t: "welcome",
      id: p.id,
      now: this.now(),
      players: [...this.players.values()].filter((o) => o !== p).map((o) => this.summary(o)),
    });
    const party = p.party ? this.parties.get(p.party) : null;
    if (party) {
      this.send(p, { t: "party", party: this.partyView(party) });
      const run = party.run;
      const st = run?.status[p.id];
      if (run && st && st !== "out") {
        if (p.place === "run" && m.run === run.id) {
          // Still down there (the line dropped a moment): back to playing.
          run.away[p.id] = false;
        } else {
          // His game left the dive (a reload starts in town): he can join it again (joinrun).
          run.status[p.id] = "out";
          run.dropped[p.id] = true;
          run.away[p.id] = false;
        }
        this.runChanged(party);
      }
    }
    this.broadcast({ t: "join", p: this.summary(p) }, p);
    this.sendPoses(p);
  }

  /** Where everyone else in town last stood, for a player who just came into it. */
  sendPoses(p) {
    for (const o of this.players.values()) {
      if (o !== p && o.place === "town" && o.pose && o.pose.pl === "town") this.send(p, o.pose);
    }
  }

  // ---- what everyone sees ----------------------------------------------------------------------

  summary(p) {
    const party = p.party ? this.parties.get(p.party) : null;
    return {
      id: p.id,
      name: p.name,
      user: p.user,
      cls: p.cls,
      look: p.look,
      place: p.place,
      zone: p.zone,
      party: party ? party.id : null,
      leader: party ? party.leader === p.id : false,
      size: party ? party.members.length : 0,
      offline: !!p.offline,
    };
  }

  send(p, msg) {
    if (!p.sock) return;
    try {
      p.sock.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    } catch {
      // A socket closing under us: its close comes next.
    }
  }

  broadcast(msg, except = null) {
    const text = JSON.stringify(msg);
    for (const o of this.players.values()) if (o !== except) this.send(o, text);
  }

  /** To the others where he is: in town everyone in town, below only his party's dive. */
  toPlace(p, msg) {
    const text = JSON.stringify(msg);
    if (p.place === "run") {
      const party = p.party ? this.parties.get(p.party) : null;
      if (!party || !party.run) return;
      for (const id of party.members) {
        const o = this.players.get(id);
        if (o && o !== p && o.place === "run") this.send(o, text);
      }
      return;
    }
    for (const o of this.players.values()) if (o !== p && o.place === "town") this.send(o, text);
  }

  partyView(party) {
    return { id: party.id, leader: party.leader, members: party.members.slice(), run: party.run };
  }

  /** Tell the party (and everyone's party finder) how it stands now. */
  partyChanged(party) {
    const view = party ? this.partyView(party) : null;
    if (party) for (const id of party.members) {
      const o = this.players.get(id);
      if (o) this.send(o, { t: "party", party: view });
    }
    if (party) for (const id of party.members) {
      const o = this.players.get(id);
      if (o) this.broadcast({ t: "join", p: this.summary(o) });
    }
  }

  // ---- chat ------------------------------------------------------------------------------------

  chat(p, m) {
    const text = clean(m.text, CHAT_MAX);
    if (!text) return;
    // A burst of five, then one a second.
    const now = this.now();
    p.chatBurst = Math.max(0, p.chatBurst - (now - p.chatAt) / 1000);
    p.chatAt = now;
    if (p.chatBurst >= 5) {
      this.send(p, { t: "err", text: "Slow down a little." });
      return;
    }
    p.chatBurst += 1;
    const out = { t: "chat", from: p.id, name: p.name, user: p.user, text, ch: "all", at: now };
    if (m.ch === "party") {
      const party = p.party ? this.parties.get(p.party) : null;
      if (!party) {
        this.send(p, { t: "err", text: "You are not in a party." });
        return;
      }
      out.ch = "party";
      for (const id of party.members) {
        const o = this.players.get(id);
        if (o) this.send(o, out);
      }
      return;
    }
    this.broadcast(out);
  }

  // ---- parties ---------------------------------------------------------------------------------

  invite(p, to) {
    const o = this.players.get(to);
    if (!o || o === p) return;
    let party = p.party ? this.parties.get(p.party) : null;
    if (party && party.leader !== p.id) {
      this.send(p, { t: "err", text: "Only the party leader can invite." });
      return;
    }
    if (party && party.run) {
      this.send(p, { t: "err", text: "Not while your party is in the dungeon." });
      return;
    }
    if (party && party.members.length >= MAX_PARTY) {
      this.send(p, { t: "err", text: `A party holds ${MAX_PARTY}.` });
      return;
    }
    if (o.party && party && o.party === party.id) {
      this.send(p, { t: "err", text: `${o.name} is already in your party.` });
      return;
    }
    if (o.place === "run") {
      this.send(p, { t: "err", text: `${o.name} is in the dungeon.` });
      return;
    }
    o.invites.set(p.id, this.now() + INVITE_MS);
    this.send(o, { t: "invite", from: p.id, name: p.name });
    this.send(p, { t: "sys", text: `Invited ${o.name}.` });
  }

  accept(p, from) {
    const exp = p.invites.get(from);
    p.invites.delete(from);
    const o = this.players.get(from);
    if (!o || !exp || exp < this.now()) {
      this.send(p, { t: "err", text: "That invite has run out." });
      return;
    }
    if (p.place === "run") {
      this.send(p, { t: "err", text: "Finish your dive first." });
      return;
    }
    let party = o.party ? this.parties.get(o.party) : null;
    if (party && (party.leader !== o.id || party.run || party.members.length >= MAX_PARTY)) {
      this.send(p, { t: "err", text: "That party can't take you now." });
      return;
    }
    // Out of any party he was in, then into the inviter's (made now if he had none).
    this.leaveParty(p, false);
    if (!party) {
      party = { id: rid(), leader: o.id, members: [o.id], run: null };
      this.parties.set(party.id, party);
      o.party = party.id;
    }
    party.members.push(p.id);
    p.party = party.id;
    for (const id of party.members) {
      const m = this.players.get(id);
      if (m && m !== p) this.send(m, { t: "sys", text: `${p.name} joined the party.` });
    }
    this.send(p, { t: "sys", text: `You joined ${o.name}'s party.` });
    this.partyChanged(party);
  }

  /** Out of his party (gone: the socket closed). The leader's place passes to the next. */
  leaveParty(p, gone) {
    const party = p.party ? this.parties.get(p.party) : null;
    p.party = null;
    if (!party) return;
    party.members = party.members.filter((id) => id !== p.id);
    if (party.run && party.run.status[p.id] && party.run.status[p.id] !== "out") party.run.status[p.id] = "out";
    for (const id of party.members) {
      const o = this.players.get(id);
      if (o) this.send(o, { t: "sys", text: `${p.name} ${gone ? "went offline" : "left the party"}.` });
    }
    if (!gone) this.send(p, { t: "party", party: null });
    if (party.members.length <= 1) {
      // A party of one is no party (a dive under way carries on for him alone).
      this.parties.delete(party.id);
      const last = this.players.get(party.members[0]);
      if (last) {
        last.party = null;
        this.send(last, { t: "party", party: null });
        this.broadcast({ t: "join", p: this.summary(last) });
      }
    } else {
      if (party.leader === p.id) party.leader = party.members[0];
      this.partyChanged(party);
      if (party.run) this.runChanged(party);
    }
    if (!gone) this.broadcast({ t: "join", p: this.summary(p) });
  }

  kick(p, id) {
    const party = p.party ? this.parties.get(p.party) : null;
    if (!party || party.leader !== p.id || id === p.id) return;
    const o = this.players.get(id);
    if (!o || o.party !== party.id) return;
    this.send(o, { t: "sys", text: "You were removed from the party." });
    this.leaveParty(o, false);
  }

  // ---- the dive --------------------------------------------------------------------------------

  /** The leader steps onto the teleporter: everyone of the party in town goes down with him. */
  start(p, m) {
    const party = p.party ? this.parties.get(p.party) : null;
    if (!party || party.leader !== p.id) return;
    if (party.run && Object.keys(party.run.status).some((id) => party.run.status[id] !== "out")) {
      this.send(p, { t: "err", text: "Your party is still in the dungeon." });
      return;
    }
    const num = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.floor(Number(v)))) : d);
    const status = {};
    for (const id of party.members) {
      const o = this.players.get(id);
      if (o && o.place === "town") status[id] = "loading";
    }
    party.run = {
      id: rid(),
      seed: num(m.seed, 1, 99999, 1337),
      rooms: num(m.rooms, 4, 10, 8),
      theme: clean(m.theme, 16) || "verdant",
      life: num(m.life, 0, 1e6, 0),
      startAt: this.now() + 1500,
      // Who went down, in party order: the first still on the floor runs the monsters.
      members: Object.keys(status).sort((a, b) => party.members.indexOf(a) - party.members.indexOf(b)),
      status,
      // Whose game is paused (window hidden): the monsters pass to someone playing, and leave him be.
      away: {},
      // Who left it only because his game did (a reload): he may join it again.
      dropped: {},
      // Whose game runs the monsters (pickAuth): decided here so every game agrees.
      auth: "",
    };
    for (const id of party.run.members) {
      const o = this.players.get(id);
      if (o) this.send(o, { t: "run", run: party.run });
    }
    // Anyone of the party not in town now (still below on his own, offline) can follow later.
    for (const id of party.members) {
      const o = this.players.get(id);
      if (o && !status[id]) this.send(o, { t: "sys", text: `${p.name} took the party into the dungeon. Step onto the teleporter to join them.` });
    }
    this.partyChanged(party);
  }

  /** He joins his party's dive under way (he missed the start, or his game left it in a reload). */
  joinRun(p) {
    const party = p.party ? this.parties.get(p.party) : null;
    const run = party?.run;
    if (!run) {
      this.send(p, { t: "err", text: "Your party is not in the dungeon." });
      return;
    }
    if (p.place !== "town") {
      this.send(p, { t: "err", text: "Come back up to town first." });
      return;
    }
    const st = run.status[p.id];
    if (st && st !== "out") return;
    if (st === "out" && !run.dropped[p.id]) {
      this.send(p, { t: "err", text: "You are out of this dive. Wait for your party to come back up." });
      return;
    }
    run.status[p.id] = "loading";
    delete run.dropped[p.id];
    run.away[p.id] = false;
    if (run.members.indexOf(p.id) < 0) run.members.push(p.id);
    this.send(p, { t: "run", run });
    this.runChanged(party);
  }

  /**
   * Whose game runs the monsters: the one there was while he is on the floor and playing; then the
   * first in party order who is; with nobody playing, whoever is still on the floor.
   */
  pickAuth(run) {
    const onFloor = (id) => run.status[id] === "in" || run.status[id] === "dead";
    const playing = (id) => onFloor(id) && !run.away[id];
    if (run.auth && playing(run.auth)) return;
    const next = run.members.find(playing);
    if (next) run.auth = next;
    else if (!run.auth || !onFloor(run.auth)) run.auth = run.members.find(onFloor) ?? "";
  }

  runStatus(p, st) {
    const party = p.party ? this.parties.get(p.party) : null;
    const run = party?.run;
    if (!run || !run.status[p.id]) return;
    if (st !== "in" && st !== "dead" && st !== "out") return;
    if (run.status[p.id] === "out") return;
    run.status[p.id] = st;
    this.runChanged(party);
  }

  runAway(p, on) {
    const party = p.party ? this.parties.get(p.party) : null;
    const run = party?.run;
    if (!run || !run.status[p.id] || !!run.away[p.id] === on) return;
    run.away[p.id] = on;
    this.runChanged(party);
  }

  runChanged(party) {
    const run = party.run;
    if (!run) return;
    this.pickAuth(run);
    for (const id of run.members) {
      const o = this.players.get(id);
      if (o) this.send(o, { t: "runstate", run: run.id, status: run.status, away: run.away, dropped: run.dropped, members: run.members, auth: run.auth });
    }
    // Everyone is back up: the dive is over and the party can go again.
    if (Object.keys(run.status).every((id) => run.status[id] === "out")) {
      party.run = null;
      this.partyChanged(party);
    }
  }

  /** Game traffic inside a dive: to one member (`to`) or to all the others still down there. */
  game(p, m) {
    const party = p.party ? this.parties.get(p.party) : null;
    const run = party?.run;
    if (!run || !run.status[p.id]) return;
    m.from = p.id;
    const to = typeof m.to === "string" ? m.to : null;
    const text = JSON.stringify(m);
    for (const id of run.members) {
      if (id === p.id || (to && id !== to)) continue;
      if (run.status[id] === "out") continue;
      const o = this.players.get(id);
      if (o) this.send(o, text);
    }
  }
}
