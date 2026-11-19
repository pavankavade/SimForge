// Shared by the Pages Functions under web/functions/api: JSON replies, usernames, session tokens
// and who is asking (accounts and sessions live in D1, see web/migrations/0002_accounts.sql).

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/** 3 to 20 letters, digits or underscores. */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

/** A player (character) id as the game makes them (src/dungeon-explorer/profile.ts). */
export const PLAYER_ID_RE = /^[a-z0-9-]{16,64}$/;

/** A new session token: 32 random bytes, base64url. */
export function newToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 of a token, hex: what the sessions table keeps. */
export async function hashToken(token) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** The bearer token on a request, or null. */
export function bearer(request) {
  const h = request.headers.get("Authorization") || "";
  const m = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(h.trim());
  return m ? m[1] : null;
}

/** Stamp a session's last use at most once a minute (saves come every few seconds). */
const SEEN_EVERY_MS = 60_000;

/**
 * The account behind the request's session token ({ id, username }), or null when there is no
 * token or it is not a live session.
 */
export async function sessionAccount(request, env) {
  const token = bearer(request);
  if (!token) return null;
  const hash = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT a.id, a.username, s.last_seen_at AS seen
       FROM sessions s JOIN accounts a ON a.id = s.account_id
      WHERE s.token_hash = ?1`,
  )
    .bind(hash)
    .first();
  if (!row) return null;
  const now = Date.now();
  if (now - row.seen > SEEN_EVERY_MS) {
    await env.DB.batch([
      env.DB.prepare("UPDATE sessions SET last_seen_at = ?2 WHERE token_hash = ?1").bind(hash, now),
      env.DB.prepare("UPDATE accounts SET last_seen_at = ?2 WHERE id = ?1").bind(row.id, now),
    ]);
  }
  return { id: row.id, username: row.username };
}

/** A save as the game sends it, cleaned up, or null when it is not one. */
export function parseSave(save) {
  const ok =
    save &&
    typeof save === "object" &&
    typeof save.name === "string" &&
    save.name.length <= 40 &&
    typeof save.updated === "number" &&
    Number.isFinite(save.updated) &&
    save.inventory &&
    typeof save.inventory === "object" &&
    save.town &&
    typeof save.town === "object";
  if (!ok) return null;
  const cls = typeof save.cls === "string" && save.cls.length <= 16 ? save.cls : null;
  return { name: save.name, cls, inventory: save.inventory, town: save.town, updated: Math.round(save.updated) };
}

/**
 * A player's save from the days before D1 (the KV namespace bound as PROFILES), or null. Copied
 * into D1 the first time its owner asks for it.
 */
export async function legacySave(env, playerId) {
  if (!env.PROFILES) return null;
  return parseSave(await env.PROFILES.get(`profile:${playerId}`, "json"));
}

/** The statement that stores a save for an account, unless the stored one is newer. */
export function upsertSave(db, playerId, accountId, s) {
  const now = Date.now();
  return db
    .prepare(
      `INSERT INTO players (id, account_id, name, cls, inventory, town, updated, created_at, saved_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
       ON CONFLICT(id) DO UPDATE SET
         account_id = excluded.account_id, name = excluded.name, cls = excluded.cls,
         inventory = excluded.inventory, town = excluded.town, updated = excluded.updated,
         saved_at = excluded.saved_at
       WHERE excluded.updated >= players.updated
         AND (players.account_id IS NULL OR players.account_id = excluded.account_id)`,
    )
    .bind(playerId, accountId, s.name, s.cls, JSON.stringify(s.inventory), JSON.stringify(s.town), s.updated, now);
}
