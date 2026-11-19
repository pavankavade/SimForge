// Accounts for the dungeon crawler (Cloudflare Pages Function, D1 bound as DB). For now an account
// is a username and the session token the browser keeps; passwords and OAuth come later (the
// tables are ready: web/migrations/0002_accounts.sql).
//
// POST /api/account  { username, playerId? } -> 201 { account, token }   (409 if the name is taken)
//      Makes the account and its first session. With `playerId`, the player (character) the browser
//      already has becomes the account's: his D1 save, or his save from the KV days.
// GET  /api/account  (Authorization: Bearer <token>) -> { account, players }

import { PLAYER_ID_RE, USERNAME_RE, hashToken, json, legacySave, newToken, sessionAccount, upsertSave } from "../../../lib/auth.js";

export async function onRequestPost({ env, request }) {
  if (!env.DB) return json({ error: "accounts are not configured" }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "not JSON" }, 400);
  }
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  if (!USERNAME_RE.test(username)) return json({ error: "bad username", hint: "3-20 letters, digits or _" }, 400);
  const playerId = typeof body?.playerId === "string" && PLAYER_ID_RE.test(body.playerId) ? body.playerId : null;

  const key = username.toLowerCase();
  if (await env.DB.prepare("SELECT 1 FROM accounts WHERE username_key = ?1").bind(key).first()) {
    return json({ error: "username taken" }, 409);
  }

  const id = crypto.randomUUID();
  const token = newToken();
  const now = Date.now();
  const steps = [
    env.DB.prepare("INSERT INTO accounts (id, username, username_key, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?4)").bind(id, username, key, now),
    env.DB.prepare("INSERT INTO sessions (token_hash, account_id, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?3)").bind(await hashToken(token), id, now),
  ];
  if (playerId) {
    // His player becomes the account's, unless another account already has it.
    const row = await env.DB.prepare("SELECT account_id FROM players WHERE id = ?1").bind(playerId).first();
    if (row && !row.account_id) steps.push(env.DB.prepare("UPDATE players SET account_id = ?2 WHERE id = ?1 AND account_id IS NULL").bind(playerId, id));
    if (!row) {
      const old = await legacySave(env, playerId);
      if (old) steps.push(upsertSave(env.DB, playerId, id, old));
    }
  }
  try {
    await env.DB.batch(steps); // one transaction: all of it or none
  } catch (e) {
    if (/UNIQUE/i.test(String(e?.message ?? e))) return json({ error: "username taken" }, 409);
    throw e;
  }
  return json({ account: { id, username }, token }, 201);
}

export async function onRequestGet({ env, request }) {
  if (!env.DB) return json({ error: "accounts are not configured" }, 503);
  const me = await sessionAccount(request, env);
  if (!me) return json({ error: "not signed in" }, 401);
  const { results } = await env.DB.prepare("SELECT id, name, cls, updated FROM players WHERE account_id = ?1 ORDER BY updated DESC").bind(me.id).all();
  return json({ account: me, players: results ?? [] });
}
