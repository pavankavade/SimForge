// Trading at a stall: the merchant's name and greeting, Buy and Sell tabs, the wares with their
// stats and price, and the paladin's gold. Buying puts a new piece in his bag (if it fits); selling
// lists what he carries that this merchant deals in (worn pieces must come off first). The
// merchants with nothing yet say so. Click a row to pick it, double-click (or the button) to deal.
import React, { useEffect, useMemo, useState } from "react";
import { RARITY, addItem, def, newItem, removeItem, type ItemInst } from "./items";
import { ItemIcon, type Icons } from "./itemsUi";
import { buysItem, css, priceOf, sellPriceOf, type Merchant } from "./merchants";
import type { PlayerInv } from "./playerInv";

const GOLD = "#ffd84d";
const LINE = "rgba(214,186,128,0.22)";

export interface ShopScreenProps {
  merchant: Merchant;
  inv: PlayerInv;
  onInv: (inv: PlayerInv) => void;
  icons: Icons;
  onClose: () => void;
  /** Narrow portrait screens: the panel is a sheet along the bottom. */
  compact: boolean;
  touch: boolean;
}

type Tab = "buy" | "sell";

const statLine = (id: string) => {
  const it = def(id);
  if (it.damage) return `${it.damage} damage`;
  if (it.block) return `${it.block}% block`;
  if (it.armor) return `Armor ${it.armor}`;
  if (it.heal) return `Restores ${it.heal}`;
  return it.kind;
};

interface Row {
  key: string;
  id: string;
  item?: ItemInst;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({ merchant, inv, onInv, icons, onClose, compact, touch }) => {
  const [tab, setTab] = useState<Tab>("buy");
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      tab === "buy"
        ? merchant.stock.map((id) => ({ key: id, id }))
        : inv.bag.items.filter((p) => buysItem(merchant, p.item.id)).map((p) => ({ key: p.item.uid, id: p.item.id, item: p.item })),
    [tab, merchant, inv]
  );
  useEffect(() => {
    if (!pick || !rows.some((r) => r.key === pick)) setPick(rows[0]?.key ?? null);
  }, [rows, pick]);
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 1800);
    return () => window.clearTimeout(t);
  }, [note]);

  const have = (id: string) => {
    const slot = def(id).slot;
    return (slot && inv.equipped[slot] ? 1 : 0) + inv.bag.items.filter((p) => p.item.id === id).length;
  };

  const act = (r: Row) => {
    const name = def(r.id).name.toLowerCase();
    if (tab === "buy") {
      const price = priceOf(r.id);
      if (inv.gold < price) return setNote("Not enough gold.");
      const bag = addItem(inv.bag, newItem(r.id));
      if (!bag) return setNote("No room in your bag.");
      onInv({ ...inv, gold: inv.gold - price, bag });
      setNote(`Bought the ${name} for ${price} gold.`);
    } else if (r.item) {
      const gold = sellPriceOf(r.id, r.item.qty ?? 1);
      onInv({ ...inv, gold: inv.gold + gold, bag: removeItem(inv.bag, r.item.uid) });
      setNote(`Sold the ${name} for ${gold} gold.`);
    }
  };

  const empty = merchant.stock.length === 0;
  const width = compact ? "100%" : "min(460px, 46vw)";
  const picked = rows.find((r) => r.key === pick) ?? null;
  const it = picked ? def(picked.id) : null;
  const canAct = picked ? (tab === "buy" ? inv.gold >= priceOf(picked.id) : true) : false;
  const first = merchant.name.split(" ")[0];

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{
        flex: 1,
        padding: "8px 0",
        background: tab === t ? "rgba(214,186,128,0.16)" : "transparent",
        color: tab === t ? "#f3e6c4" : "#8f8676",
        border: "none",
        borderBottom: tab === t ? `2px solid ${GOLD}` : `2px solid transparent`,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.16em",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 16,
        top: compact ? "auto" : 0,
        bottom: 0,
        right: 0,
        left: compact ? 0 : "auto",
        width,
        height: compact ? "62%" : "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, rgba(14,12,10,0.95), rgba(8,7,6,0.97))",
        borderLeft: compact ? "none" : `1px solid ${LINE}`,
        borderTop: compact ? `1px solid ${LINE}` : "none",
        color: "#eee6d4",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.55)",
      }}
    >
      {/* The merchant. */}
      <div style={{ padding: compact ? "12px 16px 10px" : "22px 24px 14px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: css(merchant.cloth), boxShadow: `0 0 0 1px ${css(merchant.trim)}` }} />
          <span style={{ fontSize: 11, letterSpacing: "0.22em", color: "#c9b27a", textTransform: "uppercase" }}>{merchant.trade}</span>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={closeBtn}>
            {touch ? "Leave" : "Leave (Esc)"}
          </button>
        </div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: compact ? 22 : 28, color: "#f3e6c4", marginTop: 4 }}>{merchant.name}</div>
        <div style={{ fontSize: 12, color: "#8f8676", fontStyle: "italic" }}>{merchant.shop}</div>
        <div style={{ marginTop: 10, fontSize: 13, color: "#d8cdb4", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}>
          “{empty ? merchant.empty : merchant.greeting}”
        </div>
      </div>

      {empty ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#6e675b" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.2em" }}>NOTHING FOR SALE</div>
          <div style={{ fontSize: 12 }}>Come back once {first} has new stock.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", borderBottom: `1px solid ${LINE}` }}>
            {tabBtn("buy", "BUY")}
            {tabBtn("sell", "SELL")}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", minHeight: 0 }}>
            {rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#6e675b" }}>Nothing in your bag {first} would buy. Worn pieces must come off first.</div>
            ) : null}
            {rows.map((r) => {
              const item = def(r.id);
              const col = RARITY[item.rarity].color;
              const price = tab === "buy" ? priceOf(r.id) : sellPriceOf(r.id, r.item?.qty ?? 1);
              const owned = tab === "buy" ? have(r.id) : 0;
              const sel = r.key === pick;
              const dim = tab === "buy" && inv.gold < price;
              return (
                <div
                  key={r.key}
                  onClick={() => setPick(r.key)}
                  onDoubleClick={() => act(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 8px",
                    borderRadius: 3,
                    cursor: "pointer",
                    background: sel ? "rgba(214,186,128,0.14)" : "transparent",
                    border: sel ? `1px solid ${LINE}` : "1px solid transparent",
                  }}
                >
                  <div style={{ width: 40, height: 40, flex: "0 0 40px", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle, ${col}22, rgba(18,16,14,0.9) 70%)`, border: `1px solid ${col}44`, borderRadius: 3 }}>
                    <ItemIcon id={r.id} icons={icons} w={34} h={34} ghost={dim} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: dim ? `${col}88` : col, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "#8f8676" }}>
                      {item.kind} · {statLine(r.id)} · {item.weight} kg
                    </div>
                  </div>
                  {owned ? (
                    <span style={{ fontSize: 10, letterSpacing: "0.12em", color: "#7fb07f", border: "1px solid #7fb07f55", borderRadius: 2, padding: "2px 5px" }}>HAVE {owned}</span>
                  ) : null}
                  <div style={{ minWidth: 58, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 14, color: dim ? "#c0584c" : GOLD }}>
                    {price} <span style={{ fontSize: 11, color: "#a69c88" }}>g</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* The picked item and the deal. */}
          {it && picked ? (
            <div style={{ padding: compact ? "8px 14px" : "12px 20px", borderTop: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: RARITY[it.rarity].color, fontWeight: 600 }}>
                  {it.name} <span style={{ fontSize: 11, color: "#8f8676", fontWeight: 400 }}>{RARITY[it.rarity].label}</span>
                </div>
                <div style={{ fontSize: 12, color: "#a69c88", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.note}</div>
              </div>
              <button
                type="button"
                disabled={!canAct}
                onClick={() => act(picked)}
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  borderRadius: 3,
                  cursor: canAct ? "pointer" : "default",
                  color: canAct ? "#1a1408" : "#6e675b",
                  background: canAct ? "linear-gradient(180deg, #f2d27a, #c99a3a)" : "rgba(40,36,30,0.9)",
                  border: canAct ? "1px solid #ffe7a0" : `1px solid ${LINE}`,
                }}
              >
                {tab === "buy" ? `BUY ${priceOf(picked.id)}g` : `SELL ${sellPriceOf(picked.id, picked.item?.qty ?? 1)}g`}
              </button>
            </div>
          ) : null}
        </>
      )}

      {/* The purse. */}
      <div style={{ padding: compact ? "8px 16px" : "12px 24px", borderTop: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)" }}>
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fff2b0, #d9a530 60%, #8a5a10)", boxShadow: "0 0 6px rgba(255,200,80,0.5)" }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: GOLD, fontVariantNumeric: "tabular-nums" }}>{inv.gold}</span>
        <span style={{ fontSize: 12, color: "#8f8676" }}>gold</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: note ? "#f3d98a" : "#6e675b", textAlign: "right" }}>
          {note || (empty ? "" : touch ? "Tap to pick, then buy or sell" : "Double-click to buy or sell")}
        </span>
      </div>
    </div>
  );
};

const closeBtn: React.CSSProperties = {
  background: "rgba(30,27,23,0.95)",
  color: "#e8dcc0",
  border: "1px solid rgba(214,186,128,0.3)",
  borderRadius: 3,
  padding: "5px 10px",
  fontSize: 12,
  cursor: "pointer",
};
