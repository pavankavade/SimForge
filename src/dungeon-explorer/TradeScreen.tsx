// The trade screens (net/trade.ts): the card that asks him to trade (Accept / Decline), and the trade
// window: his bag on the left (click an item to put it on the table or take it back), the two offers
// side by side, gold, and Ready then Confirm. Any change to either offer takes both ready marks off.
import React, { useMemo, useState } from "react";
import { RARITY, itemOf, type ItemInst } from "./items";
import { GOLD, ItemIcon, ItemTooltip, type Icons } from "./itemsUi";
import { trade, useTrade, type Offer } from "./net/trade";
import type { PlayerInv } from "./playerInv";

const panel: React.CSSProperties = {
  background: "rgba(14, 12, 10, 0.95)",
  border: "1px solid rgba(214,186,128,0.35)",
  borderRadius: 4,
  color: "#e8dcc0",
  boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
};
const button: React.CSSProperties = {
  background: "rgba(30,27,23,0.95)",
  color: "#eee3c8",
  border: "1px solid rgba(214,186,128,0.4)",
  borderRadius: 3,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const goldBtn: React.CSSProperties = { ...button, background: "linear-gradient(180deg, #f2d27a, #c99a3a)", color: "#1a1408", border: "1px solid #f2d27a" };
const serif = "Georgia, 'Times New Roman', serif";

/** "X wants to trade with you": shown wherever he is (town or lobby). */
export const TradeAsks: React.FC<{ top: number | string }> = ({ top }) => {
  const st = useTrade();
  if (!st.asks.length) return null;
  return (
    <div style={{ position: "fixed", top, left: "50%", transform: "translateX(-50%)", zIndex: 31, display: "flex", flexDirection: "column", gap: 6 }}>
      {st.asks.map((a) => (
        <div key={a.from} style={{ ...panel, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <span>
            <b style={{ color: "#f2d27a" }}>{a.name}</b> wants to trade with you.
          </span>
          <button type="button" style={goldBtn} onClick={() => trade.answer(a.from, true)}>
            Accept
          </button>
          <button type="button" style={button} onClick={() => trade.answer(a.from, false)}>
            Decline
          </button>
        </div>
      ))}
    </div>
  );
};

const Tile: React.FC<{ item: ItemInst; icons: Icons; size: number; dim?: boolean; onClick?: () => void; onHover: (it: ItemInst | null, x: number, y: number) => void }> = ({
  item,
  icons,
  size,
  dim,
  onClick,
  onHover,
}) => {
  const d = itemOf(item);
  return (
    <div
      onClick={onClick}
      onMouseMove={(e) => onHover(item, e.clientX, e.clientY)}
      onMouseLeave={() => onHover(null, 0, 0)}
      style={{
        position: "relative",
        width: size,
        height: size,
        background: "rgba(0,0,0,0.45)",
        border: `1px solid ${RARITY[d.rarity].color}`,
        borderRadius: 3,
        cursor: onClick ? "pointer" : "default",
        opacity: dim ? 0.3 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ItemIcon id={item.id} icons={icons} w={size - 6} h={size - 6} />
      {item.qty && item.qty > 1 ? <span style={{ position: "absolute", right: 3, bottom: 1, fontSize: 10, color: "#fff", textShadow: "0 1px 2px #000" }}>{item.qty}</span> : null}
    </div>
  );
};

const OfferBox: React.FC<{ title: string; offer: Offer; icons: Icons; size: number; onPick?: (it: ItemInst) => void; onHover: (it: ItemInst | null, x: number, y: number) => void }> = ({
  title,
  offer,
  icons,
  size,
  onPick,
  onHover,
}) => (
  <div style={{ flex: 1, minWidth: 0, border: `1px solid ${offer.ready ? "#7ad06d" : "rgba(214,186,128,0.25)"}`, borderRadius: 4, padding: 8, background: offer.ready ? "rgba(60,110,50,0.18)" : "rgba(0,0,0,0.25)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "#b9a982" }}>{title}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: offer.confirm ? "#9fe08f" : offer.ready ? "#7ad06d" : "#8a7f6c" }}>{offer.confirm ? "CONFIRMED" : offer.ready ? "READY" : "NOT READY"}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minHeight: size * 2 + 4, alignContent: "flex-start" }}>
      {offer.items.map((it) => (
        <Tile key={it.uid} item={it} icons={icons} size={size} onClick={onPick ? () => onPick(it) : undefined} onHover={onHover} />
      ))}
      {offer.items.length === 0 ? <span style={{ fontSize: 12, color: "#6f6656", alignSelf: "center" }}>Nothing yet</span> : null}
    </div>
    <div style={{ marginTop: 6, fontSize: 13 }}>
      Gold: <b style={{ color: GOLD }}>{offer.gold}</b>
    </div>
  </div>
);

/** The trade window, while a trade is open. */
export const TradeWindow: React.FC<{ inv: PlayerInv; icons: Icons; compact: boolean }> = ({ inv, icons, compact }) => {
  const st = useTrade();
  const s = st.session;
  const [gold, setGold] = useState("0");
  const [tip, setTip] = useState<{ item: ItemInst; x: number; y: number } | null>(null);
  const onHover = (it: ItemInst | null, x: number, y: number) => setTip(it ? { item: it, x, y } : null);
  // A new trade starts with the gold box at what is on the table (nothing).
  const [goldFor, setGoldFor] = useState<string | null>(null);
  if (s && goldFor !== s.with) {
    setGoldFor(s.with);
    setGold(String(s.mine.gold));
  }
  const offered = useMemo(() => new Set((s?.mine.items ?? []).map((i) => i.uid)), [s?.mine.items]);
  if (!s) return null;
  const size = compact ? 40 : 50;
  const locked = s.mine.ready;
  const bagItems = inv.bag.items.map((p) => p.item);
  const toggle = (it: ItemInst) => {
    if (locked) return;
    const next = offered.has(it.uid) ? s.mine.items.filter((q) => q.uid !== it.uid) : s.mine.items.concat([it]);
    trade.offer(next, s.mine.gold);
  };
  const setGoldNow = (v: string) => {
    setGold(v);
    const n = Math.max(0, Math.min(inv.gold, Math.floor(Number(v) || 0)));
    if (n !== s.mine.gold) trade.offer(s.mine.items, n);
  };
  const both = s.mine.ready && s.theirs.ready;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ ...panel, width: compact ? "96vw" : 860, maxHeight: "92vh", overflow: "auto", padding: compact ? 10 : 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: serif, fontSize: compact ? 18 : 22, color: "#f3e6c4", letterSpacing: "0.06em" }}>
            Trade with <span style={{ color: "#f2d27a" }}>{s.name}</span>
          </div>
          <button type="button" style={button} onClick={() => trade.cancel()}>
            Cancel
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: compact ? "column" : "row", gap: 12 }}>
          <div style={{ flex: compact ? undefined : "0 0 300px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#b9a982", marginBottom: 6 }}>YOUR BAG · click to offer</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: compact ? 140 : 330, overflow: "auto" }}>
              {bagItems.map((it) => (
                <Tile key={it.uid} item={it} icons={icons} size={size} dim={offered.has(it.uid)} onClick={locked ? undefined : () => toggle(it)} onHover={onHover} />
              ))}
              {bagItems.length === 0 ? <span style={{ fontSize: 12, color: "#6f6656" }}>Your bag is empty. Worn gear must go to the bag before it can be traded.</span> : null}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}>
              Gold to give
              <input
                type="number"
                min={0}
                max={inv.gold}
                value={gold}
                disabled={locked}
                onChange={(e) => setGoldNow(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                style={{ width: 100, background: "rgba(0,0,0,0.55)", color: GOLD, border: "1px solid rgba(214,186,128,0.4)", borderRadius: 3, padding: "4px 6px" }}
              />
              <span style={{ color: "#8a7f6c", fontSize: 12 }}>of {inv.gold}</span>
            </label>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: compact ? "column" : "row", gap: 10 }}>
            <OfferBox title="YOU GIVE" offer={s.mine} icons={icons} size={size} onPick={locked ? undefined : toggle} onHover={onHover} />
            <OfferBox title={`${s.name.toUpperCase()} GIVES`} offer={s.theirs} icons={icons} size={size} onHover={onHover} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span style={{ fontSize: 12, color: "#8a7f6c", marginRight: "auto" }}>
            {both ? (s.mine.confirm ? `Waiting for ${s.name} to confirm...` : "Both ready: confirm to swap.") : "Mark ready when the offers look right. Any change takes both marks off."}
          </span>
          <button type="button" style={locked ? button : goldBtn} onClick={() => trade.ready(!locked)}>
            {locked ? "Not ready" : "Ready"}
          </button>
          <button type="button" style={{ ...goldBtn, opacity: both && !s.mine.confirm ? 1 : 0.4, cursor: both && !s.mine.confirm ? "pointer" : "default" }} disabled={!both || !!s.mine.confirm} onClick={() => trade.confirm()}>
            Confirm trade
          </button>
        </div>
      </div>
      {tip ? <ItemTooltip item={tip.item} x={tip.x} y={tip.y} /> : null}
    </div>
  );
};
