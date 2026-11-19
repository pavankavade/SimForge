// The player's account: the username he picks the first time he plays, and the session token the
// server gives for it (web/functions/api/account). Both are kept in this browser; the token goes
// with every save (profile.ts), and the server only lets an account read or write its own players.
//
// No password yet: the token is the key, so clearing the browser's storage loses the account until
// passwords (or OAuth) arrive. Without a server (the local dev server, or the API down) the name is
// kept here with no token, he plays on local saves, and the next start tries to register it again.
const KEY = "simforge.explorer.account.v1";

/** 3 to 20 letters, digits or underscores (the server checks the same). */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export interface Account {
  /** The server's account id (null until registered). */
  id: string | null;
  username: string;
  /** The session token (null: not registered with a server yet). */
  token: string | null;
}

export function loadAccount(): Account | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<Account>;
    if (!a || typeof a.username !== "string" || !USERNAME_RE.test(a.username)) return null;
    return { id: typeof a.id === "string" ? a.id : null, username: a.username, token: typeof a.token === "string" ? a.token : null };
  } catch {
    return null;
  }
}

export function saveAccount(a: Account | null): void {
  try {
    if (a) window.localStorage.setItem(KEY, JSON.stringify(a));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: he plays as a guest this time.
  }
}

export type CreateResult =
  | { ok: true; account: Account }
  /** taken: someone has the name; invalid: the server refused it; offline: no server to ask. */
  | { ok: false; reason: "taken" | "invalid" | "offline"; message: string };

/** Registers `username` and makes `playerId` (this browser's player) the account's. */
export async function createAccount(username: string, playerId: string): Promise<CreateResult> {
  const name = username.trim();
  if (!USERNAME_RE.test(name)) return { ok: false, reason: "invalid", message: "Use 3 to 20 letters, numbers or _." };
  let r: Response;
  try {
    r = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: name, playerId }),
    });
  } catch {
    return { ok: false, reason: "offline", message: "No connection to the server." };
  }
  const isJson = (r.headers.get("content-type") ?? "").includes("application/json");
  if (r.status === 409) return { ok: false, reason: "taken", message: `"${name}" is taken. Try another name.` };
  if (r.status === 400 && isJson) return { ok: false, reason: "invalid", message: "Use 3 to 20 letters, numbers or _." };
  if (!r.ok || !isJson) return { ok: false, reason: "offline", message: "The server is not available." };
  const b = (await r.json()) as { account?: { id?: string; username?: string }; token?: string };
  if (!b.token || !b.account?.id) return { ok: false, reason: "offline", message: "The server sent a bad answer." };
  return { ok: true, account: { id: b.account.id, username: b.account.username ?? name, token: b.token } };
}
