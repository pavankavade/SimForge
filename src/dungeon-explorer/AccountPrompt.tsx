// The first screen for a new player: he picks a username, which becomes his account (account.ts)
// and his hero's name. Shown over the tavern before the class screen, only while this browser has no
// account. With no server to ask (local dev, API down) the name is kept here and he plays on.
import React, { useEffect, useRef, useState } from "react";
import { USERNAME_RE, createAccount, type Account } from "./account";

const GOLD = "#ffd84d";
const LINE = "rgba(214,186,128,0.22)";

export interface AccountPromptProps {
  /** This browser's player id: it becomes the account's. */
  playerId: string;
  /** A name to start from (the name a register-again attempt found taken). */
  initial?: string;
  /** Why he is asked again (the name was taken meanwhile). */
  notice?: string;
  onDone: (account: Account) => void;
}

export const AccountPrompt: React.FC<AccountPromptProps> = ({ playerId, initial = "", notice, onDone }) => {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const valid = USERNAME_RE.test(name.trim());
  const submit = async () => {
    if (busy) return;
    if (!valid) {
      setError("Use 3 to 20 letters, numbers or _.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await createAccount(name, playerId);
    setBusy(false);
    if (r.ok) onDone(r.account);
    // No server: keep the name here, play on local saves (the next start registers it).
    else if (r.reason === "offline") onDone({ id: null, username: name.trim(), token: null });
    else setError(r.message);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 17,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "radial-gradient(circle at 50% 40%, rgba(10,8,6,0.35), rgba(5,4,3,0.82))",
        color: "#eee6d4",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        style={{
          width: "min(400px, 100%)",
          padding: "24px 22px 20px",
          background: "linear-gradient(180deg, rgba(14,12,10,0.95), rgba(8,7,6,0.97))",
          border: `1px solid ${LINE}`,
          borderRadius: 4,
          boxShadow: "0 18px 60px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: "0.28em", color: "#c9b27a" }}>THE WAYFARER'S REST</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, color: "#f3e6c4", marginTop: 4 }}>Who goes there?</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "#a69c88", marginTop: 6 }}>Pick a name. It is your account and your hero's name, and your saves follow it.</div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value.replace(/\s/g, "").slice(0, 20));
            setError(null);
          }}
          // Typing must not reach the game's keys (Tab, Esc, WASD).
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="Username"
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={20}
          aria-label="Username"
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            marginTop: 16,
            padding: "12px 14px",
            fontSize: 18,
            textAlign: "center",
            color: "#f3e6c4",
            background: "rgba(20,18,15,0.9)",
            border: `1px solid ${error ? "#d9785a" : valid ? GOLD : LINE}`,
            borderRadius: 3,
            outline: "none",
          }}
        />
        <div style={{ minHeight: 20, marginTop: 8, fontSize: 13, color: error ? "#f0a080" : "#8f8676" }}>{error ?? "3 to 20 letters, numbers or _"}</div>
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "12px 0",
            borderRadius: 3,
            border: valid && !busy ? `1px solid ${GOLD}` : `1px solid ${LINE}`,
            background: valid && !busy ? "linear-gradient(180deg, #f2d27a, #c99a3a)" : "rgba(30,27,23,0.9)",
            color: valid && !busy ? "#1a1408" : "#8f8676",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "0.12em",
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "CHECKING..." : "ENTER THE TAVERN"}
        </button>
      </form>
    </div>
  );
};
