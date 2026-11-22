// Trading between players (Dark and Darker style): one asks (T at a player in town, or the lobby's
// Trade tab), the other accepts, and both get a trade window. Each puts items from his bag and some
// gold on the table; any change takes both "ready" marks off. When both are ready each confirms, and
// once both confirmations name the same two offers, each game swaps them into its own inventory.
//
// The hub only passes the messages along ({ t: "trade", to, op, ... } becomes { t: "trade", from,
// name, op, ... } for `to`, and only between two players out of the dungeon).
import { useSyncExternalStore } from "react";
import { ITEM_DEFS, type ItemInst } from "../items";
import { mp } from "./mp";

export interface Offer {
  items: ItemInst[];
  gold: number;
  /** Goes up with every change: confirmations name the revisions they agree to. */
  rev: number;
  ready: boolean;
  /** Confirmed: [his offer's rev, the other's rev]. */
  confirm: [number, number] | null;
}

export interface TradeSession {
  with: string;
  name: string;
  mine: Offer;
  theirs: Offer;
}

export interface TradeAsk {
  from: string;
  name: string;
  at: number;
}

export interface TradeState {
  asks: TradeAsk[];
  /** Asked someone; waiting for the answer. */
  pending: { to: string; name: string } | null;
  session: TradeSession | null;
}

/** What the game does with a finished trade: give `give` and `gold`, take `get` and `getGold`. */
export interface TradeBank {
  /** Can he take these (room in the bag once his own offer has gone)? */
  canTake: (give: ItemInst[], get: ItemInst[]) => boolean;
  /** Does he still hold these and that much gold? */
  has: (give: ItemInst[], gold: number) => boolean;
  apply: (give: ItemInst[], gold: number, get: ItemInst[], getGold: number) => void;
  /** Where he is: no trading from the dungeon. */
  canTrade: () => boolean;
  notice: (text: string) => void;
}

const empty = (): Offer => ({ items: [], gold: 0, rev: 0, ready: false, confirm: null });
const ASK_MS = 30_000;

/** Only real items with sane fields come in from the other side. */
function cleanItems(x: unknown): ItemInst[] {
  if (!Array.isArray(x)) return [];
  const out: ItemInst[] = [];
  for (const raw of x.slice(0, 40)) {
    const it = raw as Partial<ItemInst>;
    if (!it || typeof it.uid !== "string" || typeof it.id !== "string" || !ITEM_DEFS[it.id] || it.uid.length > 64) continue;
    const q: ItemInst = { uid: it.uid, id: it.id };
    if (typeof it.qty === "number" && it.qty > 0) q.qty = Math.floor(it.qty);
    if (typeof it.rarity === "string") q.rarity = it.rarity;
    if (Array.isArray(it.mods)) q.mods = it.mods.slice(0, 6) as ItemInst["mods"];
    out.push(q);
  }
  return out;
}

class Trade {
  state: TradeState = { asks: [], pending: null, session: null };
  private version = 0;
  private subs = new Set<() => void>();
  private bank: TradeBank | null = null;
  private pendingTimer = 0;

  constructor() {
    mp.on("trade", (m) => this.receive(m));
    mp.on("gone", (m) => {
      const id = String(m.id);
      if (this.state.session?.with === id) this.end(`${this.state.session.name} went offline. The trade is off.`);
      this.state.asks = this.state.asks.filter((a) => a.from !== id);
      this.changed();
    });
    mp.on("reset", () => {
      if (this.state.session) this.end("Lost the connection. The trade is off.");
      this.state = { asks: [], pending: null, session: null };
      this.changed();
    });
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
  setBank(b: TradeBank | null) {
    this.bank = b;
  }
  private notice(text: string) {
    this.bank?.notice(text);
  }
  private send(to: string, op: string, extra: Record<string, unknown> = {}) {
    mp.send({ t: "trade", to, op, ...extra });
  }

  // ---- what he does ------------------------------------------------------------------------------

  ask(to: string) {
    if (mp.state.status !== "online") return this.notice("Trading needs the connection to the other players.");
    if (this.bank && !this.bank.canTrade()) return this.notice("No trading in the dungeon. Trade in town or from the lobby.");
    if (this.state.session) return this.notice("Finish the trade you are in first.");
    const name = mp.nameOf(to);
    const p = mp.state.players.get(to);
    if (p?.place === "run") return this.notice(`${name} is in the dungeon.`);
    this.state.pending = { to, name };
    this.changed();
    this.send(to, "ask");
    this.notice(`Asked ${name} to trade.`);
    window.clearTimeout(this.pendingTimer);
    this.pendingTimer = window.setTimeout(() => {
      if (this.state.pending?.to !== to) return;
      this.state.pending = null;
      this.changed();
      this.notice(`${name} did not answer.`);
    }, ASK_MS);
  }

  answer(from: string, yes: boolean) {
    const a = this.state.asks.find((q) => q.from === from);
    this.state.asks = this.state.asks.filter((q) => q.from !== from);
    if (!a) return this.changed();
    if (yes && (this.state.session || (this.bank && !this.bank.canTrade()))) {
      this.send(from, "busy");
      this.changed();
      return this.notice(this.state.session ? "Finish the trade you are in first." : "No trading in the dungeon.");
    }
    this.send(from, yes ? "yes" : "no");
    if (yes) this.begin(from, a.name);
    this.changed();
  }

  /** Put these on the table (a fresh offer: both ready marks come off). */
  offer(items: ItemInst[], gold: number) {
    const s = this.state.session;
    if (!s || s.mine.ready) return;
    const mine: Offer = { items: items.slice(0, 40), gold: Math.max(0, Math.floor(gold)), rev: s.mine.rev + 1, ready: false, confirm: null };
    this.state.session = { ...s, mine, theirs: { ...s.theirs, ready: false, confirm: null } };
    this.changed();
    this.send(s.with, "offer", { items: mine.items, gold: mine.gold, rev: mine.rev });
  }

  ready(on: boolean) {
    const s = this.state.session;
    if (!s) return;
    if (on && this.bank) {
      if (!this.bank.has(s.mine.items, s.mine.gold)) return this.notice("You no longer hold everything you offered.");
      if (!this.bank.canTake(s.mine.items, s.theirs.items)) return this.notice("No room in your bag for what they offer.");
    }
    this.state.session = { ...s, mine: { ...s.mine, ready: on, confirm: null }, theirs: on ? s.theirs : { ...s.theirs, confirm: null } };
    this.changed();
    this.send(s.with, "ready", { on, a: s.mine.rev, b: s.theirs.rev });
  }

  confirm() {
    const s = this.state.session;
    if (!s || !s.mine.ready || !s.theirs.ready) return;
    const c: [number, number] = [s.mine.rev, s.theirs.rev];
    this.state.session = { ...s, mine: { ...s.mine, confirm: c } };
    this.changed();
    this.send(s.with, "confirm", { a: c[0], b: c[1] });
    this.tryCommit();
  }

  cancel() {
    const s = this.state.session;
    if (s) this.send(s.with, "cancel");
    this.end(null);
  }

  // ---- what comes in -------------------------------------------------------------------------------

  private begin(withId: string, name: string) {
    window.clearTimeout(this.pendingTimer);
    this.state.pending = null;
    this.state.session = { with: withId, name, mine: empty(), theirs: empty() };
    this.changed();
  }

  private end(why: string | null) {
    this.state.session = null;
    this.changed();
    if (why) this.notice(why);
  }

  private tryCommit() {
    const s = this.state.session;
    if (!s || !s.mine.confirm || !s.theirs.confirm) return;
    const [ma, mb] = s.mine.confirm;
    const [ta, tb] = s.theirs.confirm;
    if (ma !== s.mine.rev || mb !== s.theirs.rev || ta !== s.theirs.rev || tb !== s.mine.rev) return;
    const bank = this.bank;
    if (!bank || !bank.has(s.mine.items, s.mine.gold) || !bank.canTake(s.mine.items, s.theirs.items)) {
      this.send(s.with, "cancel");
      return this.end("The trade could not be finished (your bag changed). Nothing changed hands.");
    }
    bank.apply(s.mine.items, s.mine.gold, s.theirs.items, s.theirs.gold);
    const got = s.theirs.items.length + (s.theirs.gold > 0 ? 1 : 0);
    this.end(got ? `Traded with ${s.name}.` : `Trade with ${s.name} done.`);
  }

  private receive(m: Record<string, unknown>) {
    const from = String(m.from ?? "");
    const name = String(m.name ?? mp.nameOf(from));
    const s = this.state.session;
    switch (m.op) {
      case "ask":
        if (s?.with === from) return;
        if (s) return this.send(from, "busy");
        this.state.asks = [...this.state.asks.filter((a) => a.from !== from), { from, name, at: Date.now() }].slice(-4);
        this.changed();
        window.setTimeout(() => {
          const before = this.state.asks.length;
          this.state.asks = this.state.asks.filter((a) => Date.now() - a.at < ASK_MS);
          if (this.state.asks.length !== before) this.changed();
        }, ASK_MS + 50);
        return;
      case "yes":
        if (this.state.pending?.to !== from) return this.send(from, "cancel");
        if (s) return this.send(from, "cancel");
        this.begin(from, name);
        return;
      case "no":
      case "busy":
        if (this.state.pending?.to !== from) return;
        window.clearTimeout(this.pendingTimer);
        this.state.pending = null;
        this.changed();
        this.notice(m.op === "no" ? `${name} does not want to trade.` : `${name} is busy.`);
        return;
      case "offer": {
        if (!s || s.with !== from) return;
        const theirs: Offer = { items: cleanItems(m.items), gold: Math.max(0, Math.floor(Number(m.gold) || 0)), rev: Number(m.rev) || 0, ready: false, confirm: null };
        this.state.session = { ...s, theirs, mine: { ...s.mine, ready: false, confirm: null } };
        this.changed();
        return;
      }
      case "ready": {
        if (!s || s.with !== from) return;
        // Only a mark on the offers as they stand now counts.
        if (Number(m.a) !== s.theirs.rev || Number(m.b) !== s.mine.rev) return;
        const on = !!m.on;
        this.state.session = { ...s, theirs: { ...s.theirs, ready: on, confirm: null }, mine: on ? s.mine : { ...s.mine, confirm: null } };
        this.changed();
        return;
      }
      case "confirm": {
        if (!s || s.with !== from) return;
        this.state.session = { ...s, theirs: { ...s.theirs, confirm: [Number(m.a), Number(m.b)] } };
        this.changed();
        this.tryCommit();
        return;
      }
      case "cancel":
        if (s?.with === from) this.end(`${s.name} closed the trade.`);
        else if (this.state.pending?.to === from) {
          this.state.pending = null;
          this.changed();
        }
        return;
    }
  }
}

export const trade = new Trade();

export function useTrade(): TradeState {
  useSyncExternalStore(trade.subscribe, trade.getVersion);
  return trade.state;
}
