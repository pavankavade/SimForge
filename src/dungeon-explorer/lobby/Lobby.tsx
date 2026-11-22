// The lobby (Dark and Darker style): where he is between dives without walking about town. The
// stage (stage.ts) shows him at a tavern table with three more chairs for his party; across the top
// are the tabs (Play, Class, Stash, Merchants, Quests, Trade), bottom left the dungeon to enter and
// the way into the Guild Tavern, bottom right the user list and a class change. Everything here is
// what he could walk up to and do in town, for a quick game.
import React, { useEffect, useRef } from "react";
import type { ArmorEquipment, HumanSpec } from "../../artifacts/characters/paladin";
import { classById, type ClassId } from "../classes";
import { MERCHANTS, css } from "../merchants";
import { mp, useMp } from "../net/mp";
import { trade, useTrade } from "../net/trade";
import type { ScreenRect } from "../portrait";
import { PERK_SLOTS, perksOf, skillsOf, type Loadout, type PerkId } from "../skills";
import { SPELL_KEYS, fitSpells, memoryUsed, spellsOf, type SpellId } from "../spells";
import { ATTRIBUTES, ATTRIBUTE_INFO, statLines, type Attributes, type Stats } from "../stats";
import { createLobbyStage, type Guest, type LobbyStage, type StageMode } from "./stage";

export type LobbyTab = "play" | "class" | "stash" | "merchants" | "quests" | "trade";
export const LOBBY_TABS: Array<[LobbyTab, string]> = [
  ["play", "Play"],
  ["class", "Class"],
  ["stash", "Stash"],
  ["merchants", "Merchants"],
  ["quests", "Quests"],
  ["trade", "Trade"],
];
/** Height of the tab bar: the tab screens sit under it. */
export const TAB_BAR = 50;

const GOLDC = "#f2d27a";
const LINE = "rgba(214,186,128,0.28)";
const serif = "Georgia, 'Times New Roman', serif";
const panel: React.CSSProperties = { background: "rgba(14, 12, 10, 0.9)", border: `1px solid ${LINE}`, borderRadius: 4, color: "#e8dcc0", boxShadow: "0 8px 30px rgba(0,0,0,0.6)" };
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

// ---- The stage ------------------------------------------------------------------------------------

export interface LobbyViewProps {
  spec: HumanSpec;
  /** What he wears at the table (nothing in hand) and in the class/stash pictures (his whole kit). */
  kit: ArmorEquipment;
  fullKit: ArmorEquipment;
  mode: StageMode;
  classFrame: ScreenRect;
  guests: Array<Guest | null>;
  portraitRect: ScreenRect | null;
  portraitView: { spin: number; zoom: number };
  anchorsRef: React.MutableRefObject<Array<HTMLElement | null>>;
  onBusy: (busy: boolean) => void;
  onIcons: (icons: Record<string, string>) => void;
}

/** The canvas and its stage (built once while the lobby is up). */
export const LobbyView: React.FC<LobbyViewProps> = ({ spec, kit, fullKit, mode, classFrame, guests, portraitRect, portraitView, anchorsRef, onBusy, onIcons }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<LobbyStage | null>(null);
  const cb = useRef({ onBusy, onIcons });
  cb.current = { onBusy, onIcons };
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const st = createLobbyStage(c, { onBusy: (b) => cb.current.onBusy(b), onIcons: (i) => cb.current.onIcons(i) });
    stageRef.current = st;
    return () => {
      stageRef.current = null;
      st.dispose();
    };
  }, []);
  // The class and stash pictures show his whole kit; at the table his hands are empty.
  const shown = mode === "class" || portraitRect ? fullKit : kit;
  useEffect(() => stageRef.current?.setHero(spec, shown), [spec, shown]);
  useEffect(() => stageRef.current?.setMode(mode, classFrame), [mode, classFrame]);
  useEffect(() => stageRef.current?.setGuests(guests), [guests]);
  useEffect(() => stageRef.current?.setPortrait(portraitRect, portraitView), [portraitRect, portraitView]);
  useEffect(() => {
    const id = window.setInterval(() => stageRef.current?.setAnchors(anchorsRef.current), 250);
    stageRef.current?.setAnchors(anchorsRef.current);
    return () => window.clearInterval(id);
  }, [anchorsRef]);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none" }} />;
};

// ---- The tab bar and the table's buttons --------------------------------------------------------------

export interface LobbyChromeProps {
  tab: LobbyTab;
  onTab: (t: LobbyTab) => void;
  name: string;
  gold: number;
  compact: boolean;
  touch: boolean;
  anchorsRef: React.MutableRefObject<Array<HTMLElement | null>>;
  /** Names of who sits in the other three chairs (null: free). */
  seated: Array<string | null>;
  /** Bottom left: into the dungeon (floor 1) or the Guild Tavern. */
  onStart: () => void;
  onTavern: () => void;
  /** Why Start would not take him down now (a party member waiting on the leader), or null. */
  startNote: string | null;
  themeLabel: string;
  onUsers: () => void;
  onClassChange: () => void;
  /** Phones: go full screen and turn the view sideways (none on desktop). */
  onFullscreen?: () => void;
}

const FLOORS: Array<{ n: number; name: string; open: boolean; note: string }> = [
  { n: 1, name: "The Crypt Below", open: true, note: "Skeletons, slimes, traps. Find a portal before the dungeon closes." },
  { n: 2, name: "The Burning Halls", open: false, note: "Locked. Coming soon." },
  { n: 3, name: "The Drowned Vault", open: false, note: "Locked. Coming soon." },
];

export const LobbyChrome: React.FC<LobbyChromeProps> = (p) => {
  const st = useMp();
  const [picking, setPicking] = React.useState(false);
  const [floor, setFloor] = React.useState(1);
  const c = p.compact;
  // Full screen: the button shows until the page is full screen (and comes back if he leaves it).
  const [full, setFull] = React.useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  // Held upright, the bottom row is full (Play, User List): the button sits above it.
  const [upright, setUpright] = React.useState(() => typeof window !== "undefined" && window.innerHeight > window.innerWidth);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    const size = () => setUpright(window.innerHeight > window.innerWidth);
    document.addEventListener("fullscreenchange", on);
    window.addEventListener("resize", size);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      window.removeEventListener("resize", size);
    };
  }, []);
  const tabsEl = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: TAB_BAR,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: c ? 2 : 6,
        background: "linear-gradient(180deg, rgba(6,5,4,0.96), rgba(10,9,7,0.88))",
        borderBottom: `1px solid ${LINE}`,
        overflowX: "auto",
        padding: "0 8px",
      }}
    >
      {LOBBY_TABS.map(([id, label]) => {
        const on = p.tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => p.onTab(id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: on ? `2px solid ${GOLDC}` : "2px solid transparent",
              color: on ? "#fff3d2" : "#a99c84",
              fontFamily: serif,
              fontSize: c ? 13 : 17,
              letterSpacing: "0.05em",
              padding: c ? "12px 7px 10px" : "12px 18px 10px",
              cursor: "pointer",
              textShadow: on ? "0 0 12px rgba(242,210,122,0.5)" : undefined,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        );
      })}
      {c ? null : (
        <div style={{ position: "absolute", right: 16, fontSize: 13, color: "#cdbf9f" }}>
          <b style={{ color: GOLDC }}>{p.gold}</b> gold
        </div>
      )}
    </div>
  );
  if (p.tab !== "play") return tabsEl;

  const party = st.party;
  const me = st.me;
  const lead = !party || party.members.length < 2 || party.leader === me;
  const pill: React.CSSProperties = { position: "fixed", left: 0, top: 0, zIndex: 14, pointerEvents: "auto", whiteSpace: "nowrap" };
  return (
    <>
      {tabsEl}
      {/* Over his head: his name; over each free chair a "+" that opens the user list (to invite). */}
      <div
        ref={(el) => {
          p.anchorsRef.current[0] = el;
        }}
        style={{ ...pill, pointerEvents: "none", fontFamily: serif, fontSize: c ? 14 : 17, color: "#f3e6c4", textShadow: "0 1px 3px #000, 0 0 10px #000", display: "none" }}
      >
        <span style={{ color: GOLDC, marginRight: 6 }}>◆</span>
        {p.name}
      </div>
      {[0, 1, 2].map((i) => {
        const who = p.seated[i];
        return (
          <div
            key={i}
            ref={(el) => {
              p.anchorsRef.current[i + 1] = el;
            }}
            style={{ ...pill, display: "none" }}
          >
            {who ? (
              <div style={{ fontFamily: serif, fontSize: c ? 13 : 15, color: "#cfe6ff", textShadow: "0 1px 3px #000, 0 0 10px #000", transform: "translateY(-46px)" }}>{who}</div>
            ) : (
              <button
                type="button"
                onClick={p.onUsers}
                title="Invite a player to your party"
                style={{
                  width: c ? 54 : 72,
                  height: c ? 80 : 108,
                  background: "rgba(10,9,8,0.55)",
                  border: "1px solid rgba(214,186,128,0.18)",
                  color: "rgba(240,230,210,0.75)",
                  fontSize: c ? 30 : 40,
                  fontWeight: 200,
                  cursor: "pointer",
                  backdropFilter: "blur(2px)",
                }}
              >
                +
              </button>
            )}
          </div>
        );
      })}

      {/* Phones: full screen, bottom centre where the thumb finds it (gone once full screen). */}
      {p.onFullscreen && !full ? (
        <button
          type="button"
          onClick={p.onFullscreen}
          style={{
            position: "fixed",
            left: "50%",
            bottom: upright ? "calc(max(14px, env(safe-area-inset-bottom)) + 118px)" : "max(12px, env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            zIndex: 21,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            background: "#6ce88a",
            color: "#071a0d",
            border: "none",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.04em",
            boxShadow: "0 0 0 3px rgba(108,232,138,0.25), 0 4px 16px rgba(0,0,0,0.6)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>⛶</span> Full screen
        </button>
      ) : null}

      {/* Bottom left: the dungeon and the tavern. */}
      <div style={{ position: "fixed", left: "max(14px, env(safe-area-inset-left))", bottom: "max(14px, env(safe-area-inset-bottom))", zIndex: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", maxWidth: "calc(100vw - 28px)" }}>
        {picking ? (
          <div style={{ ...panel, padding: 10, width: c ? "min(92vw, 330px)" : 360 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#b9a982", marginBottom: 6 }}>CHOOSE A DUNGEON</div>
            {FLOORS.map((f) => (
              <button
                key={f.n}
                type="button"
                disabled={!f.open}
                onClick={() => setFloor(f.n)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 5,
                  padding: "8px 10px",
                  background: floor === f.n && f.open ? "rgba(242,210,122,0.14)" : "rgba(0,0,0,0.35)",
                  border: `1px solid ${floor === f.n && f.open ? GOLDC : "rgba(214,186,128,0.18)"}`,
                  borderRadius: 3,
                  color: f.open ? "#eee3c8" : "#6b6356",
                  cursor: f.open ? "pointer" : "not-allowed",
                }}
              >
                <div style={{ fontFamily: serif, fontSize: 15 }}>
                  {f.open ? "" : "🔒 "}Floor {f.n} · {f.name}
                </div>
                <div style={{ fontSize: 11, color: f.open ? "#a99c84" : "#5e574b", marginTop: 2 }}>
                  {f.note}
                  {f.open ? ` Theme: ${p.themeLabel}.` : ""}
                </div>
              </button>
            ))}
            {p.startNote ? <div style={{ fontSize: 12, color: "#ffcf8a", margin: "4px 0 6px" }}>{p.startNote}</div> : null}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                disabled={!!p.startNote}
                style={p.startNote ? { ...button, flex: 1, padding: "9px 14px", fontSize: 14, opacity: 0.55, cursor: "default" } : { ...goldBtn, flex: 1, padding: "9px 14px", fontSize: 14 }}
                onClick={p.onStart}
              >
                {p.startNote ? "Waiting for the leader" : party && party.members.length > 1 && lead ? "Take the party down" : "Enter the dungeon"}
              </button>
              <button type="button" style={button} onClick={() => setPicking(false)}>
                Back
              </button>
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexDirection: c ? "column-reverse" : "row", alignItems: c ? "stretch" : undefined }}>
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            style={{
              ...button,
              minWidth: c ? 150 : 210,
              padding: c ? "12px 18px" : "16px 26px",
              fontFamily: serif,
              fontSize: c ? 20 : 26,
              fontWeight: 400,
              letterSpacing: "0.08em",
              background: "linear-gradient(180deg, rgba(40,36,30,0.96), rgba(18,16,13,0.96))",
              border: "1px solid rgba(214,186,128,0.6)",
              boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.5), 0 0 18px rgba(0,0,0,0.6)",
            }}
          >
            Play
          </button>
          <button type="button" onClick={p.onTavern} style={{ ...button, padding: c ? "7px 10px" : "10px 16px", alignSelf: c ? "stretch" : "flex-end" }} title="Walk about the Adventurers' Guild and its tavern">
            {c ? "Guild Tavern" : "Enter the Guild Tavern"}
          </button>
        </div>
      </div>

      {/* Bottom right: who is online (invite, trade) and a class change. */}
      <div style={{ position: "fixed", right: "max(14px, env(safe-area-inset-right))", bottom: "max(14px, env(safe-area-inset-bottom))", zIndex: 20, display: "flex", gap: 6 }}>
        {[
          ["👥", "User List", p.onUsers] as const,
          ["⚔", "Class Change", p.onClassChange] as const,
        ].map(([icon, label, on]) => (
          <button
            key={label}
            type="button"
            onClick={on}
            style={{ ...button, width: c ? 62 : 74, height: c ? 58 : 68, padding: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 10, fontWeight: 600 }}
          >
            <span style={{ fontSize: c ? 20 : 24, lineHeight: 1 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>
      {st.status === "online" ? (
        <div style={{ position: "fixed", right: "max(14px, env(safe-area-inset-right))", bottom: c ? 82 : 94, zIndex: 20, fontSize: 11, color: "#8a7f6c" }}>
          {st.players.size} other{st.players.size === 1 ? "" : "s"} online
        </div>
      ) : null}
    </>
  );
};

// ---- The tabs' own pages ----------------------------------------------------------------------------

const Page: React.FC<{ compact: boolean; children: React.ReactNode; width?: number }> = ({ compact, children, width = 760 }) => (
  <div style={{ position: "fixed", top: TAB_BAR, left: 0, right: 0, bottom: 0, zIndex: 18, overflow: "auto", background: "rgba(5,4,3,0.55)", display: "flex", justifyContent: "center", padding: compact ? "10px 8px" : "26px 16px" }}>
    <div style={{ ...panel, width: compact ? "100%" : width, alignSelf: "flex-start", padding: compact ? 12 : 20 }}>{children}</div>
  </div>
);
const H: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ fontFamily: serif, fontSize: 22, color: "#f3e6c4", letterSpacing: "0.05em", marginBottom: 10 }}>{children}</div>;
const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#b9a982", margin: "14px 0 6px" }}>{children}</div>;

/** A perk or skill card: click to pick it (or drop it). */
const Pick: React.FC<{ name: string; note: string; on: boolean; extra?: string; onClick: () => void }> = ({ name, note, on, extra, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      textAlign: "left",
      padding: "9px 11px",
      background: on ? "rgba(242,210,122,0.13)" : "rgba(0,0,0,0.35)",
      border: `1px solid ${on ? GOLDC : "rgba(214,186,128,0.18)"}`,
      borderRadius: 3,
      color: on ? "#fff3d2" : "#cdbf9f",
      cursor: "pointer",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: serif, fontSize: 15 }}>
      <span>
        {on ? "◆ " : "◇ "}
        {name}
      </span>
      {extra ? <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: "#8a7f6c" }}>{extra}</span> : null}
    </div>
    <div style={{ fontSize: 12, color: on ? "#d8ccb0" : "#8a7f6c", marginTop: 3, lineHeight: 1.4 }}>{note}</div>
  </button>
);

/** Class: what he plays, his perks and skill, its base attributes and what his gear makes of them. */
export const ClassPage: React.FC<{ cls: ClassId; stats: Stats; base: Attributes; compact: boolean; onChange: () => void; loadout: Loadout; onLoadout: (l: Loadout) => void }> = ({
  cls,
  stats,
  base,
  compact,
  onChange,
  loadout,
  onLoadout,
}) => {
  const c = classById(cls);
  const perks = perksOf(cls);
  const skills = skillsOf(cls);
  const spells = spellsOf(cls);
  const memory = stats.memoryCapacity;
  const known = fitSpells(loadout.spells, memory);
  const used = memoryUsed(known);
  // Spells: as many as his memory holds (each costs its tier); a pick that does not fit is refused.
  const toggleSpell = (id: SpellId, tier: number) => {
    const have = known.indexOf(id) >= 0;
    if (!have && used + tier > memory) return;
    onLoadout({ ...loadout, spells: have ? known.filter((x) => x !== id) : known.concat([id]) });
  };
  // Two perks: a third pick drops the oldest.
  const togglePerk = (id: PerkId) => {
    const have = loadout.perks.indexOf(id) >= 0;
    const next = have ? loadout.perks.filter((p) => p !== id) : loadout.perks.concat([id]).slice(-PERK_SLOTS);
    onLoadout({ ...loadout, perks: next });
  };
  return (
    <Page compact={compact}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <H>
            <span style={{ color: c.color }}>{c.name}</span>
          </H>
          <div style={{ fontSize: 13, color: "#cdbf9f", marginTop: -6 }}>{c.tagline}</div>
        </div>
        <button type="button" style={goldBtn} onClick={onChange}>
          Change class
        </button>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "#d8ccb0", marginTop: 10 }}>{c.blurb}</div>
      {perks.length ? (
        <>
          <Sub>
            PERKS · {loadout.perks.length} / {PERK_SLOTS} · always on
          </Sub>
          <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 8 }}>
            {perks.map((p) => (
              <Pick key={p.id} name={p.name} note={p.note} on={loadout.perks.indexOf(p.id) >= 0} onClick={() => togglePerk(p.id)} />
            ))}
          </div>
        </>
      ) : null}
      {skills.length ? (
        <>
          <Sub>SKILL · G (the green button on a phone) · in the dungeon</Sub>
          <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 8 }}>
            {skills.map((k) => (
              <Pick key={k.id} name={k.name} note={k.note} extra={`${k.cooldown}s cooldown`} on={loadout.skill === k.id} onClick={() => onLoadout({ ...loadout, skill: k.id })} />
            ))}
          </div>
        </>
      ) : null}
      {spells.length ? (
        <>
          <Sub>
            SPELLS · MEMORY {used} / {memory} · keys {SPELL_KEYS[0]}–{SPELL_KEYS[SPELL_KEYS.length - 1]} (the spell buttons on a phone) · X to sit and {cls === "wizard" ? "meditate" : "pray"} the charges back
          </Sub>
          <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 8 }}>
            {spells.map((sp) => {
              const at = known.indexOf(sp.id);
              const fits = at >= 0 || used + sp.tier <= memory;
              return (
                <div key={sp.id} style={{ opacity: fits ? 1 : 0.5, display: "grid" }}>
                  <Pick
                    name={at >= 0 ? `${sp.name}  [${SPELL_KEYS[at]}]` : sp.name}
                    note={fits ? sp.note : `${sp.note} Not enough memory: drop another spell first.`}
                    extra={`tier ${sp.tier} · ${sp.charges} charge${sp.charges === 1 ? "" : "s"}`}
                    on={at >= 0}
                    onClick={() => toggleSpell(sp.id, sp.tier)}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 18 }}>
        <div>
          <Sub>ATTRIBUTES (CLASS BASE + GEAR)</Sub>
          {ATTRIBUTES.map((a) => {
            const v = stats.attributes[a];
            return (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", borderBottom: "1px solid rgba(214,186,128,0.08)" }} title={ATTRIBUTE_INFO[a].does}>
                <span>{ATTRIBUTE_INFO[a].name}</span>
                <span style={{ color: v > base[a] ? "#7ad06d" : "#fff" }}>{v}</span>
              </div>
            );
          })}
          <Sub>STARTING KIT</Sub>
          <div style={{ fontSize: 13, color: "#d8ccb0" }}>{c.kit.join(", ")}</div>
        </div>
        <div>
          <Sub>DERIVED</Sub>
          {statLines(stats).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", borderBottom: "1px solid rgba(214,186,128,0.08)" }}>
              <span>{k}</span>
              <span style={{ color: "#fff" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
};

/** Merchants: every stall in the guild street, one click away. */
export const MerchantsPage: React.FC<{ compact: boolean; onOpen: (i: number) => void }> = ({ compact, onOpen }) => (
  <Page compact={compact}>
    <H>Merchants</H>
    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 10 }}>
      {MERCHANTS.map((m, i) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onOpen(i)}
          style={{ textAlign: "left", padding: 12, background: "rgba(0,0,0,0.35)", border: `1px solid ${css(m.trim)}55`, borderLeft: `4px solid ${css(m.cloth)}`, borderRadius: 3, color: "#eee3c8", cursor: "pointer" }}
        >
          <div style={{ fontFamily: serif, fontSize: 17 }}>{m.name}</div>
          <div style={{ fontSize: 12, color: css(m.trim) }}>
            {m.trade} · {m.shop}
          </div>
          <div style={{ fontSize: 12, color: "#a99c84", marginTop: 5, lineHeight: 1.45 }}>{m.stock.length ? m.greeting : m.empty || "Buys what you bring up from below."}</div>
        </button>
      ))}
    </div>
  </Page>
);

/** Trade: everyone online (out of the dungeon) to ask, and asks under way. */
export const TradePage: React.FC<{ compact: boolean }> = ({ compact }) => {
  const st = useMp();
  const tr = useTrade();
  const others = [...st.players.values()].filter((q) => !q.offline).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Page compact={compact} width={600}>
      <H>Trade</H>
      <div style={{ fontSize: 13, color: "#cdbf9f", marginBottom: 8, lineHeight: 1.5 }}>
        Ask a player to trade; when they accept, you each put items and gold on the table. In town you can also walk up to someone and press <b>T</b>.
      </div>
      {st.status !== "online" ? <div style={{ fontSize: 13, color: "#ff9a86", padding: "8px 0" }}>{st.status === "off" ? "Multiplayer is off here." : "Connecting to the other players..."}</div> : null}
      {tr.pending ? <div style={{ fontSize: 13, color: "#ffcf8a", padding: "6px 0" }}>Waiting for {tr.pending.name} to answer...</div> : null}
      {st.status === "online" && others.length === 0 ? <div style={{ fontSize: 13, color: "#8a7f6c", padding: "8px 0" }}>Nobody else is online right now.</div> : null}
      {others.map((o) => {
        const below = o.place === "run";
        return (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderBottom: "1px solid rgba(214,186,128,0.12)" }}>
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 14 }}>{o.name}</span>
              <span style={{ fontSize: 11, color: "#8a7f6c", marginLeft: 8 }}>
                {classById(o.cls as ClassId).name} · {below ? "In the dungeon" : o.zone === "lobby" ? "In the lobby" : "In town"}
              </span>
            </span>
            <button type="button" style={below || !!tr.session ? { ...button, opacity: 0.4 } : goldBtn} disabled={below || !!tr.session} onClick={() => trade.ask(o.id)}>
              Trade
            </button>
            {st.party && st.party.leader === st.me && st.party.members.indexOf(o.id) < 0 ? (
              <button type="button" style={button} onClick={() => mp.invite(o.id)}>
                Invite
              </button>
            ) : !st.party ? (
              <button type="button" style={button} onClick={() => mp.invite(o.id)}>
                Invite
              </button>
            ) : null}
          </div>
        );
      })}
    </Page>
  );
};
