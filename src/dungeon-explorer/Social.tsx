// The multiplayer screens (net/mp.ts): the chat in the corner (Enter to talk), an invite card when
// someone asks him into a party (Y / N), the party finder (P: everyone online, invite, leave) and
// the bar shown while he watches a teammate after falling in a party's dive.
import React, { useEffect, useRef, useState } from "react";
import { classById, type ClassId } from "./classes";
import { mp, useMp, type NetPlayer } from "./net/mp";

const panel: React.CSSProperties = {
  background: "rgba(14, 12, 10, 0.92)",
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
};
const gold: React.CSSProperties = { ...button, background: "linear-gradient(180deg, #f2d27a, #c99a3a)", color: "#1a1408", border: "1px solid #f2d27a" };
const serif = "Georgia, 'Times New Roman', serif";

const CH_COLOR = { all: "#e8dcc0", party: "#8fd0ff", sys: "#b9a982", err: "#ff9a86" } as const;
/** Lines fade from the corner this long after they come in (all show while the chat is open). */
const FADE_MS = 12_000;

function where(p: NetPlayer): string {
  if (p.place === "run") return "In the dungeon";
  return p.zone === "out" ? "On the square" : "In the tavern";
}

const className = (cls: string): string => classById(cls as ClassId).name;

/** The chat log in the lower left, and the line he types into once Enter opens it. */
export const ChatBox: React.FC<{ open: boolean; onClose: () => void; compact: boolean; bottom: number | string }> = ({ open, onClose, compact, bottom }) => {
  const st = useMp();
  const [text, setText] = useState("");
  const [toParty, setToParty] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const [, tick] = useState(0);
  // Re-render now and then so old lines fade out.
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 2000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 0);
  }, [open]);
  useEffect(() => {
    if (!st.party) setToParty(false);
  }, [st.party]);
  if (st.status === "off") return null;
  const now = Date.now();
  const lines = st.chat.slice(open ? -14 : -6).filter((l) => open || now - l.at < FADE_MS);
  const send = () => {
    let t = text.trim();
    let ch: "all" | "party" = toParty ? "party" : "all";
    if (/^\/p\s/i.test(t)) {
      ch = "party";
      t = t.slice(3).trim();
    } else if (/^\/a\s/i.test(t)) {
      ch = "all";
      t = t.slice(3).trim();
    }
    if (t) mp.chat(t, ch);
    setText("");
    onClose();
  };
  return (
    <div
      style={{
        position: "fixed",
        left: "max(12px, env(safe-area-inset-left))",
        bottom,
        zIndex: open ? 30 : 12,
        width: compact ? 260 : 360,
        pointerEvents: open ? "auto" : "none",
        fontSize: compact ? 11 : 13,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: open ? 8 : 0, ...(open ? panel : {}), maxHeight: compact ? 150 : 260, overflow: "hidden" }}>
        {lines.map((l) => (
          <div key={l.key} style={{ color: CH_COLOR[l.ch], textShadow: "0 1px 2px #000, 0 0 4px #000", lineHeight: 1.35, opacity: open ? 1 : Math.max(0.25, 1 - (now - l.at) / FADE_MS), wordBreak: "break-word" }}>
            {l.ch === "party" ? <span style={{ color: "#8fd0ff" }}>[Party] </span> : null}
            {l.name ? <b style={{ color: l.ch === "party" ? "#b8e2ff" : "#f2d27a" }}>{l.name}: </b> : null}
            {l.text}
          </div>
        ))}
        {open ? (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {st.party ? (
              <button type="button" style={{ ...button, padding: "4px 8px", color: toParty ? "#8fd0ff" : "#eee3c8" }} onClick={() => setToParty((v) => !v)}>
                {toParty ? "Party" : "All"}
              </button>
            ) : null}
            <input
              ref={input}
              value={text}
              maxLength={200}
              placeholder={st.status === "online" ? (st.party ? "Say something (/p party, /a all)" : "Say something") : "Not connected"}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") send();
                else if (e.key === "Escape") {
                  setText("");
                  onClose();
                }
              }}
              onBlur={() => {
                if (!text) onClose();
              }}
              style={{ flex: 1, minWidth: 0, background: "rgba(0,0,0,0.55)", color: "#f3e6c4", border: "1px solid rgba(214,186,128,0.4)", borderRadius: 3, padding: "5px 8px", fontSize: 13, outline: "none" }}
            />
            <button type="button" style={gold} onMouseDown={(e) => e.preventDefault()} onClick={send}>
              Send
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** "X invites you to their party": Y to join, N to say no (or the buttons). */
export const InviteCards: React.FC<{ top: number }> = ({ top }) => {
  const st = useMp();
  const inv = st.invites[0];
  if (!inv) return null;
  return (
    <div style={{ position: "fixed", top, left: "50%", transform: "translateX(-50%)", zIndex: 26, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, ...panel }}>
      <span style={{ fontSize: 13 }}>
        <b style={{ color: "#f2d27a", fontFamily: serif }}>{inv.name}</b> invites you to their party
      </span>
      <button type="button" style={gold} onClick={() => mp.answer(inv.from, true)}>
        Join (Y)
      </button>
      <button type="button" style={button} onClick={() => mp.answer(inv.from, false)}>
        No (N)
      </button>
    </div>
  );
};

/** The party finder: his party, and everyone else online with an invite button. */
export const PartyScreen: React.FC<{ onClose: () => void; compact: boolean; inDungeon: boolean }> = ({ onClose, compact, inDungeon }) => {
  const st = useMp();
  const me = st.me;
  const party = st.party;
  const lead = !!party && party.leader === me;
  const others = [...st.players.values()].sort((a, b) => (a.place === b.place ? a.name.localeCompare(b.name) : a.place === "town" ? -1 : 1));
  const status = st.status;
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", borderBottom: "1px solid rgba(214,186,128,0.12)" };
  const runSt = party?.run?.status ?? {};
  const stLabel: Record<string, string> = { loading: "going down", in: "in the dungeon", dead: "fallen", out: "back up" };
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ ...panel, width: compact ? "min(94vw, 420px)" : 520, maxHeight: "86vh", overflow: "auto", padding: compact ? 12 : 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: serif, fontSize: compact ? 18 : 22, color: "#f3e6c4", letterSpacing: "0.06em" }}>Party Finder</div>
          <button type="button" style={button} onClick={onClose}>
            Close (P)
          </button>
        </div>
        {status !== "online" ? (
          <div style={{ fontSize: 13, color: "#b9a982", padding: "10px 0" }}>
            {status === "off" ? "Multiplayer is off here: there is no hub to join." : status === "connecting" ? "Connecting to the other players..." : "Offline. Trying to reconnect..."}
          </div>
        ) : null}

        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#b9a982", margin: "8px 0 4px" }}>YOUR PARTY</div>
        {party ? (
          <div>
            {party.members.map((id) => {
              const p = id === me ? null : st.players.get(id);
              const name = id === me ? "You" : (p?.name ?? "...");
              return (
                <div key={id} style={row}>
                  <span style={{ color: "#f2d27a", width: 14 }}>{party.leader === id ? "♛" : "◆"}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>
                    {name}
                    {p?.user && p.user !== p.name ? <span style={{ color: "#9a8c6c" }}> ({p.user})</span> : null}
                    {runSt[id] ? <span style={{ color: "#8fd0ff", fontSize: 12 }}> · {stLabel[runSt[id]]}</span> : null}
                  </span>
                  {lead && id !== me && !party.run ? (
                    <button type="button" style={button} onClick={() => mp.kick(id)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <button type="button" style={button} onClick={() => mp.leaveParty()} disabled={inDungeon && !!party.run}>
                Leave party
              </button>
              <span style={{ fontSize: 12, color: "#9a8c6c" }}>
                {party.run ? "Your party is in the dungeon." : lead ? "Step onto the teleporter to take everyone down." : `${mp.nameOf(party.leader)} starts the dive at the teleporter.`}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#9a8c6c", padding: "4px 0 8px" }}>You are on your own. Invite someone below, or walk up to them in town and press E.</div>
        )}

        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#b9a982", margin: "16px 0 4px" }}>ONLINE NOW ({others.length})</div>
        {others.length === 0 && status === "online" ? <div style={{ fontSize: 13, color: "#9a8c6c", padding: "4px 0" }}>Nobody else is online right now.</div> : null}
        {others.map((p) => {
          const mate = !!party && party.members.indexOf(p.id) >= 0;
          const canInvite = (!party || lead) && !mate && p.place === "town" && !party?.run && (party?.members.length ?? 1) < 4;
          return (
            <div key={p.id} style={row}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, color: mate ? "#8fd0ff" : "#f3e6c4" }}>{p.name}</span>
                {p.user && p.user !== p.name ? <span style={{ fontSize: 12, color: "#9a8c6c" }}> ({p.user})</span> : null}
                <div style={{ fontSize: 11, color: "#9a8c6c" }}>
                  {className(p.cls)} · {where(p)}
                  {p.party && !mate ? ` · in a party of ${p.size}` : ""}
                </div>
              </span>
              {mate ? (
                <span style={{ fontSize: 12, color: "#8fd0ff" }}>in your party</span>
              ) : (
                <button type="button" style={canInvite ? gold : { ...button, opacity: 0.45, cursor: "default" }} disabled={!canInvite} onClick={() => mp.invite(p.id)}>
                  Invite
                </button>
              )}
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: "#7d7258", marginTop: 12, lineHeight: 1.5 }}>Enter: chat · /p for your party · P: this list · Y / N: answer an invite</div>
      </div>
    </div>
  );
};

/** Down in a party's dive: whom the camera follows, the next teammate, and the way home. */
export const SpectateBar: React.FC<{ name: string; count: number; onNext: () => void; onTown: () => void; compact: boolean; lost: string }> = ({ name, count, onNext, onTown, compact, lost }) => (
  <div style={{ position: "fixed", top: compact ? 62 : 88, left: "50%", transform: "translateX(-50%)", zIndex: 19, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
    <div style={{ fontFamily: serif, fontSize: compact ? 24 : 34, letterSpacing: "0.12em", color: "#b3201a", textShadow: "0 0 18px rgba(0,0,0,0.9), 0 2px 4px #000" }}>YOU DIED</div>
    <div style={{ ...panel, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span>
        Watching <b style={{ color: "#8fd0ff", fontFamily: serif }}>{name}</b>
      </span>
      {count > 1 ? (
        <button type="button" style={button} onClick={onNext}>
          Next
        </button>
      ) : null}
      <button type="button" style={button} onClick={onTown}>
        Return to town
      </button>
    </div>
    <div style={{ fontSize: 12, color: "#d8c9a8", textShadow: "0 1px 3px #000" }}>{lost}</div>
  </div>
);
