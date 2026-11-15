// The character screen (Tab): who is under the armour and what he wears. Every setting is a field
// of the HumanSpec the body is baked from, so what this panel can change is exactly what the
// imported base human supports: face morphs, build, skin, eyes, hair, beard, and the armour slots.
import React from "react";
import { Inventory } from "./Inventory";
import {
  ARMOR_SLOTS,
  AVERAGE_FACE,
  CHARACTERS,
  DEFAULT_CHARACTER,
  DEFAULT_EQUIPMENT,
  characterByName,
  type ArmorEquipment,
  type ArmorSlot,
  type FaceSpec,
  type HairStyle,
  type HumanSpec,
  type RGB,
} from "../artifacts/characters/paladin";

/** Where the panel sits; the 3D view frames the character in the rest of the screen. */
export interface PanelLayout {
  side: "right" | "bottom";
  /** Panel width (right) or height (bottom) in CSS pixels. */
  size: number;
}

export type ShowcaseView = "body" | "face";

const SKIN_TONES: Array<[string, RGB]> = [
  ["Pale", [0.93, 0.79, 0.7]],
  ["Fair", [0.9, 0.74, 0.64]],
  ["Light", [0.8, 0.62, 0.51]],
  ["Olive", [0.74, 0.58, 0.43]],
  ["Tan", [0.66, 0.48, 0.35]],
  ["Brown", [0.55, 0.38, 0.27]],
  ["Dark", [0.47, 0.31, 0.22]],
  ["Deep", [0.35, 0.23, 0.17]],
];

const HAIR_COLORS: Array<[string, RGB]> = [
  ["Black", [0.05, 0.04, 0.04]],
  ["Dark brown", [0.2, 0.13, 0.08]],
  ["Brown", [0.33, 0.22, 0.13]],
  ["Auburn", [0.42, 0.17, 0.08]],
  ["Red", [0.55, 0.23, 0.09]],
  ["Dark blond", [0.52, 0.4, 0.24]],
  ["Blond", [0.74, 0.6, 0.38]],
  ["Ash", [0.45, 0.42, 0.38]],
];

// The four iris textures in the export; the nearest one is used.
const EYE_COLORS: Array<[string, RGB]> = [
  ["Brown", [0.3, 0.18, 0.09]],
  ["Blue", [0.33, 0.48, 0.66]],
  ["Green", [0.3, 0.5, 0.3]],
  ["Grey", [0.43, 0.45, 0.43]],
];

const HAIR_STYLES: Array<[HairStyle, string]> = [
  ["bald", "Bald"],
  ["buzz", "Buzz cut"],
  ["crop", "Crop"],
  ["swept", "Swept back"],
];

const FACE_GROUPS: Array<[string, Array<[keyof FaceSpec, string]>]> = [
  ["Jaw & chin", [["jawWidth", "Jaw width"], ["jawSquare", "Jaw shape"], ["chin", "Chin"], ["chinWidth", "Chin width"]]],
  ["Cheeks", [["cheekbones", "Cheekbones"], ["cheekHollow", "Cheek hollows"]]],
  ["Brow & eyes", [["brow", "Brow ridge"], ["eyeSize", "Eye size"], ["eyeSpacing", "Eye spacing"], ["eyeTilt", "Eye tilt"], ["hooded", "Hooded lids"]]],
  ["Nose", [["noseSize", "Nose length"], ["noseWidth", "Nose width"], ["noseBridge", "Bridge hump"], ["noseTip", "Tip up / down"]]],
  ["Mouth", [["lips", "Lips"], ["mouthWidth", "Mouth width"]]],
  ["Head", [["earSize", "Ears"], ["skullWidth", "Head width"]]],
];

// ---- Saving --------------------------------------------------------------------------------------

const STORE_KEY = "simforge.explorer.character.v1";

function fromStore(): { spec?: Partial<HumanSpec>; equipment?: Partial<ArmorEquipment> } {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** `?char=<name>` wins, then the last saved character, then the default paladin. */
export function initialSpec(): HumanSpec {
  const q = new URLSearchParams(window.location.search).get("char");
  if (q) return characterByName(q);
  const base = CHARACTERS[DEFAULT_CHARACTER];
  const s = fromStore().spec;
  if (!s) return base;
  return { ...base, ...s, face: { ...AVERAGE_FACE, ...(s.face || {}) }, hair: { ...base.hair, ...(s.hair || {}) } };
}

export function initialEquipment(): ArmorEquipment {
  // Only the pieces that exist now (older saves had "legs" before it was split up).
  const saved = (fromStore().equipment || {}) as Partial<Record<string, boolean>>;
  const e: ArmorEquipment = { ...DEFAULT_EQUIPMENT };
  for (const s of ARMOR_SLOTS) if (typeof saved[s] === "boolean") e[s] = saved[s] as boolean;
  return e;
}

export function saveCharacter(spec: HumanSpec, equipment: ArmorEquipment): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ spec, equipment }));
  } catch {
    // Private windows and blocked storage: the character just isn't remembered.
  }
}

// ---- Random -------------------------------------------------------------------------------------

const NAMES = ["Aldous", "Bertram", "Cedric", "Edmund", "Godfrey", "Hugh", "Osric", "Wystan", "Leofric", "Anselm", "Baldwin", "Roland"];

// A game UI, not a Remotion render: a true random roll is what the Random button wants.
const roll = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

function randomSpec(): HumanSpec {
  const r = (a: number, b: number) => a + roll() * (b - a);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(roll() * xs.length)];
  const face = { ...AVERAGE_FACE };
  for (const k of Object.keys(face) as Array<keyof FaceSpec>) {
    // Most features stay near average; a few stand out.
    face[k] = Math.round(r(-1, 1) * (roll() < 0.3 ? 0.9 : 0.4) * 20) / 20;
  }
  const age = Math.round(r(0, 1) * 20) / 20;
  return {
    ...CHARACTERS[DEFAULT_CHARACTER],
    name: pick(NAMES),
    skin: pick(SKIN_TONES)[1],
    age,
    face,
    eyeColor: pick(EYE_COLORS)[1],
    hair: { style: pick(HAIR_STYLES)[0], color: pick(HAIR_COLORS)[1], grey: age > 0.6 ? Math.round(r(0.2, 0.9) * 20) / 20 : 0 },
    beard: pick([0, 0, 0.3, 0.6, 0.9]),
    muscle: Math.round(r(0.45, 1) * 20) / 20,
    bulk: Math.round(r(-0.8, 0.8) * 20) / 20,
  };
}

// ---- Small controls -----------------------------------------------------------------------------

const GOLD = "#ffd84d";
const same = (a: RGB, b: RGB) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 0.02;
const cssColor = (c: RGB) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
const toHex = (c: RGB) => "#" + c.map((v) => ("0" + Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16)).slice(-2)).join("");
const fromHex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ends?: [string, string];
  center?: number;
}> = ({ label, value, min, max, onChange, ends, center }) => (
  <div style={{ marginBottom: 7 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#d6dde4" }}>
      <span>{label}</span>
      <span
        title="Double-click to reset"
        onDoubleClick={() => center !== undefined && onChange(center)}
        style={{ color: "#8d9aa6", fontVariantNumeric: "tabular-nums", cursor: center !== undefined ? "pointer" : "default" }}
      >
        {value > 0 && min < 0 ? "+" : ""}
        {value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={0.05}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: GOLD, margin: "3px 0 0" }}
    />
    {ends ? (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6f7c88", marginTop: -2 }}>
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    ) : null}
  </div>
);

const Swatches: React.FC<{ items: Array<[string, RGB]>; value: RGB; onPick: (c: RGB) => void; custom?: boolean }> = ({
  items,
  value,
  onPick,
  custom,
}) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
    {items.map(([name, c]) => (
      <button
        key={name}
        type="button"
        title={name}
        aria-label={name}
        onClick={() => onPick(c)}
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: cssColor(c),
          border: same(c, value) ? `2px solid ${GOLD}` : "2px solid rgba(255,255,255,0.16)",
          boxShadow: same(c, value) ? "0 0 0 2px rgba(255,216,77,0.25)" : "none",
          cursor: "pointer",
          padding: 0,
        }}
      />
    ))}
    {custom ? (
      <label title="Custom colour" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9fb0bf", cursor: "pointer" }}>
        <input
          type="color"
          value={toHex(value)}
          onChange={(e) => onPick(fromHex(e.target.value))}
          style={{ width: 28, height: 26, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
        />
        Custom
      </label>
    ) : null}
  </div>
);

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background: on ? "rgba(255,216,77,0.16)" : "#161b23",
      color: on ? GOLD : "#c3ccd5",
      border: on ? "1px solid rgba(255,216,77,0.6)" : "1px solid rgba(255,255,255,0.14)",
      borderRadius: 6,
      padding: "6px 9px",
      fontSize: 12,
      cursor: "pointer",
      textAlign: "left",
    }}
  >
    {children}
  </button>
);

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d9aa6", margin: "12px 0 7px" }}>{children}</div>
);

// ---- Panel --------------------------------------------------------------------------------------

export interface CustomizerProps {
  spec: HumanSpec;
  onSpec: (spec: HumanSpec) => void;
  equipment: ArmorEquipment;
  onEquipment: (e: ArmorEquipment) => void;
  /** A new body is being built from the latest settings. */
  busy: boolean;
  layout: PanelLayout;
  /** The open tab; the game lifts the helm off while it is Face or Hair. */
  tab: CustomizerTab;
  onTab: (t: CustomizerTab) => void;
  onView: (v: ShowcaseView) => void;
  onClose: () => void;
  /** Inventory pictures of the pieces (arrive once rendered). */
  icons: Partial<Record<ArmorSlot, string>>;
}

export type CustomizerTab = "body" | "face" | "hair" | "gear";
type Tab = CustomizerTab;

export const CharacterCustomizer: React.FC<CustomizerProps> = ({
  spec,
  onSpec,
  equipment,
  onEquipment,
  busy,
  layout,
  tab,
  onTab: setTab,
  onView,
  onClose,
  icons,
}) => {
  const set = (patch: Partial<HumanSpec>) => onSpec({ ...spec, ...patch });
  const setFace = (k: keyof FaceSpec, v: number) => onSpec({ ...spec, face: { ...spec.face, [k]: v } });
  const setHair = (patch: Partial<HumanSpec["hair"]>) => onSpec({ ...spec, hair: { ...spec.hair, ...patch } });
  const eye = EYE_COLORS.slice().sort(
    (a, b) =>
      Math.abs(a[1][0] - spec.eyeColor[0]) + Math.abs(a[1][1] - spec.eyeColor[1]) + Math.abs(a[1][2] - spec.eyeColor[2]) -
      (Math.abs(b[1][0] - spec.eyeColor[0]) + Math.abs(b[1][1] - spec.eyeColor[1]) + Math.abs(b[1][2] - spec.eyeColor[2]))
  )[0];

  const right = layout.side === "right";
  return (
    <div
      onKeyDown={(e) => {
        // Keep typing in the name box from reaching the game's hotkeys.
        if (e.code !== "Tab" && e.code !== "Escape") e.stopPropagation();
      }}
      style={{
        position: "fixed",
        zIndex: 16,
        ...(right
          ? { top: 0, right: 0, bottom: 0, width: layout.size, borderLeft: "1px solid rgba(255,255,255,0.12)" }
          : { left: 0, right: 0, bottom: 0, height: layout.size, borderTop: "1px solid rgba(255,255,255,0.12)" }),
        background: "rgba(9, 11, 15, 0.9)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        color: "#eef2f6",
        userSelect: "none",
        touchAction: "pan-y",
      }}
    >
      {/* Header: name, presets */}
      <div style={{ padding: right ? "16px 18px 10px" : "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8d9aa6" }}>Character</div>
          <div style={{ flex: 1 }} />
          {busy ? <div style={{ fontSize: 11, color: GOLD }}>Updating…</div> : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close character screen"
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#c3ccd5", borderRadius: 6, padding: "3px 9px", fontSize: 12, cursor: "pointer" }}
          >
            {right ? "Done (Tab)" : "Done"}
          </button>
        </div>
        <input
          value={spec.name}
          maxLength={24}
          onChange={(e) => set({ name: e.target.value })}
          aria-label="Character name"
          style={{
            width: "100%",
            boxSizing: "border-box",
            margin: "8px 0",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(255,216,77,0.35)",
            color: GOLD,
            fontSize: right ? 22 : 18,
            fontWeight: 700,
            padding: "2px 0",
            outline: "none",
            userSelect: "text",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {Object.keys(CHARACTERS).map((k) => (
            <Chip key={k} on={false} onClick={() => onSpec({ ...CHARACTERS[k] })}>
              {CHARACTERS[k].name}
            </Chip>
          ))}
          <Chip on={false} onClick={() => onSpec(randomSpec())}>
            Random
          </Chip>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {(["body", "face", "hair", "gear"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                // Face and hair are easier to judge up close; gear and build from head to toe.
                onView(t === "face" || t === "hair" ? "face" : "body");
              }}
              style={{
                flex: 1,
                background: tab === t ? GOLD : "#161b23",
                color: tab === t ? "#1a1406" : "#c3ccd5",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                padding: "6px 0",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Body of the active tab */}
      <div style={{ flex: 1, overflowY: "auto", padding: right ? "4px 18px 14px" : "2px 14px 10px", overscrollBehavior: "contain" }}>
        {tab === "body" ? (
          <>
            <Heading>Skin</Heading>
            <Swatches items={SKIN_TONES} value={spec.skin} onPick={(c) => set({ skin: c })} custom />
            <Slider label="Age" value={spec.age} min={0} max={1} ends={["Young", "Weathered"]} onChange={(v) => set({ age: v })} />
            <Heading>Eyes</Heading>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
              {EYE_COLORS.map(([name, c]) => (
                <Chip key={name} on={eye[0] === name} onClick={() => set({ eyeColor: c })}>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: cssColor(c), marginRight: 6 }} />
                  {name}
                </Chip>
              ))}
            </div>
            <Heading>Build</Heading>
            <Slider label="Muscle" value={spec.muscle} min={0.4} max={1} ends={["Soft", "Ripped"]} onChange={(v) => set({ muscle: v })} center={0.7} />
            <Slider label="Weight" value={spec.bulk} min={-1} max={1} ends={["Lean", "Heavy"]} onChange={(v) => set({ bulk: v })} center={0} />
          </>
        ) : null}

        {tab === "face" ? (
          <>
            {FACE_GROUPS.map(([group, fields]) => (
              <div key={group}>
                <Heading>{group}</Heading>
                {fields.map(([k, label]) => (
                  <Slider key={k} label={label} value={spec.face[k]} min={-1} max={1} center={0} onChange={(v) => setFace(k, v)} />
                ))}
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <Chip on={false} onClick={() => set({ face: { ...AVERAGE_FACE } })}>
                Average face
              </Chip>
            </div>
          </>
        ) : null}

        {tab === "hair" ? (
          <>
            <Heading>Style</Heading>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {HAIR_STYLES.map(([s, label]) => (
                <Chip key={s} on={spec.hair.style === s} onClick={() => setHair({ style: s })}>
                  {label}
                </Chip>
              ))}
            </div>
            <Heading>Colour</Heading>
            <Swatches items={HAIR_COLORS} value={spec.hair.color} onPick={(c) => setHair({ color: c })} custom />
            <Slider label="Grey" value={spec.hair.grey} min={0} max={1} onChange={(v) => setHair({ grey: v })} />
            <Heading>Beard</Heading>
            <Slider label="Beard" value={spec.beard} min={0} max={1} ends={["Clean shaven", "Full beard"]} onChange={(v) => set({ beard: v })} />
          </>
        ) : null}

        {tab === "gear" ? (
          <Inventory
            equipment={equipment}
            onEquipment={onEquipment}
            icons={icons}
            cell={Math.min(80, Math.floor(((right ? layout.size - 36 : window.innerWidth - 28) - 18) / 4))}
            viewRect={
              right
                ? { left: 0, top: 0, width: window.innerWidth - layout.size, height: window.innerHeight }
                : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight - layout.size }
            }
          />
        ) : null}
      </div>

      {/* Footer: framing and controls */}
      <div
        style={{
          padding: right ? "10px 18px 14px" : "6px 14px max(8px, env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <Chip on={false} onClick={() => onView("body")}>
          Full body
        </Chip>
        <Chip on={false} onClick={() => onView("face")}>
          Face
        </Chip>
        <div style={{ fontSize: 11, color: "#7d8a96", marginLeft: 4 }}>{right ? "Drag to spin · Scroll to zoom" : "Drag to spin"}</div>
      </div>
    </div>
  );
};
