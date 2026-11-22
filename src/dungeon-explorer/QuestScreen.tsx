// The guild representative's desk (E at the desk in the great hall): his quests in hand with their
// progress (and the reward to collect for the finished ones), and the board's other quests to take.
import React from "react";
import { MAX_ACTIVE, QUESTS, isDone, questDef, type QuestState } from "./quests";

const panel: React.CSSProperties = {
  background: "rgba(14, 12, 10, 0.94)",
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
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const gold: React.CSSProperties = { ...button, background: "linear-gradient(180deg, #f2d27a, #c99a3a)", color: "#1a1408", border: "1px solid #f2d27a" };
const serif = "Georgia, 'Times New Roman', serif";

export const QuestScreen: React.FC<{
  quests: QuestState;
  onAccept: (id: string) => void;
  onAbandon: (id: string) => void;
  onTurnIn: (id: string) => void;
  onClose: () => void;
  compact: boolean;
}> = ({ quests, onAccept, onAbandon, onTurnIn, onClose, compact }) => {
  const full = quests.active.length >= MAX_ACTIVE;
  const open = QUESTS.filter((q) => !quests.active.some((a) => a.id === q.id));
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderBottom: "1px solid rgba(214,186,128,0.12)" };
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ ...panel, width: compact ? "min(94vw, 440px)" : 560, maxHeight: "88vh", overflow: "auto", padding: compact ? 12 : 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontFamily: serif, fontSize: compact ? 18 : 22, color: "#f3e6c4", letterSpacing: "0.06em" }}>The Guild Representative</div>
          <button type="button" style={button} onClick={onClose}>
            Close (F)
          </button>
        </div>
        <div style={{ fontSize: 13, color: "#b9a982", fontStyle: "italic", marginBottom: 10 }}>
          {quests.completed > 0 ? `"Back again. ${quests.completed} job${quests.completed === 1 ? "" : "s"} done for the guild so far. There is always more."` : `"New blood. Take a job from the board, do it down there, and come back to me for your pay."`}
        </div>

        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#b9a982", margin: "8px 0 2px" }}>
          YOUR QUESTS ({quests.active.length} / {MAX_ACTIVE})
        </div>
        {quests.active.length === 0 ? <div style={{ fontSize: 13, color: "#9a8c6c", padding: "6px 0" }}>None taken. Pick one below.</div> : null}
        {quests.active.map((a) => {
          const d = questDef(a.id);
          if (!d) return null;
          const done = isDone(a);
          return (
            <div key={a.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: done ? "#9be09b" : "#f3e6c4", fontFamily: serif }}>{d.title}</div>
                <div style={{ fontSize: 12, color: "#9a8c6c", margin: "2px 0 5px" }}>{d.text}</div>
                <div style={{ height: 6, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(214,186,128,0.25)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(100 * a.progress) / d.goal}%`, background: done ? "#5fd37a" : "#c99a3a" }} />
                </div>
                <div style={{ fontSize: 11, color: "#b9a982", marginTop: 3 }}>
                  {a.progress} / {d.goal} · reward {d.reward} gold
                </div>
              </div>
              {done ? (
                <button type="button" style={gold} onClick={() => onTurnIn(a.id)}>
                  Collect {d.reward}g
                </button>
              ) : (
                <button type="button" style={button} onClick={() => onAbandon(a.id)}>
                  Abandon
                </button>
              )}
            </div>
          );
        })}

        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#b9a982", margin: "18px 0 2px" }}>ON THE BOARD</div>
        {open.map((d) => (
          <div key={d.id} style={row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "#f3e6c4", fontFamily: serif }}>{d.title}</div>
              <div style={{ fontSize: 12, color: "#9a8c6c", marginTop: 2 }}>{d.text}</div>
              <div style={{ fontSize: 11, color: "#d8b060", marginTop: 3 }}>Reward: {d.reward} gold</div>
            </div>
            <button type="button" style={full ? { ...button, opacity: 0.45, cursor: "default" } : gold} disabled={full} onClick={() => onAccept(d.id)}>
              Accept
            </button>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#7d7258", marginTop: 12, lineHeight: 1.5 }}>
          Monsters count when they fall near you (your party's kills too). Escapes count when you come back through a portal. Arena bouts count in the ring.
        </div>
      </div>
    </div>
  );
};
