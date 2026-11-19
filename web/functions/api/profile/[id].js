// A player's save for the dungeon crawler (Cloudflare Pages Function): what he brought out of the
// dungeon (bag, purse, worn kit) and his rooms and stash chests in the tavern, keyed by the random
// player id his browser made (src/dungeon-explorer/profile.ts). Stored in the D1 database bound as
// DB (table `players`, web/migrations/); without that binding the API answers 503 and the game keeps
// saves in the browser.
//
// Every call needs his session (Authorization: Bearer <token>, from POST /api/account), and a
// player can only be read or written by the account that owns him. A player nobody owns yet (a
// save from before accounts) becomes the asking account's.
//
// GET  /api/profile/:id  -> the save, or 404
// PUT  /api/profile/:id  -> store it (JSON, at most 256 KB); an older copy never overwrites a newer

import { PLAYER_ID_RE, json, legacySave, parseSave, sessionAccount, upsertSave } from "../../../lib/auth.js";

const MAX_BYTES = 256 * 1024;

/** The checks every call shares: a good id, storage, and a signed-in account. */
async function check(params, env, request) {
  const id = String(params.id || "");
  if (!PLAYER_ID_RE.test(id)) return { error: json({ error: "bad player id" }, 400) };
  if (!env.DB) return { error: json({ error: "profile storage is not configured" }, 503) };
  const me = await sessionAccount(request, env);
  if (!me) return { error: json({ error: "not signed in" }, 401) };
  return { id, me };
}

const notYours = () => json({ error: "this player belongs to another account" }, 403);

export async function onRequestGet({ params, env, request }) {
  const c = await check(params, env, request);
  if (c.error) return c.error;
  const row = await env.DB.prepare("SELECT account_id, name, cls, inventory, town, updated FROM players WHERE id = ?1").bind(c.id).first();
  if (row) {
    if (row.account_id && row.account_id !== c.me.id) return notYours();
    if (!row.account_id) await env.DB.prepare("UPDATE players SET account_id = ?2 WHERE id = ?1 AND account_id IS NULL").bind(c.id, c.me.id).run();
    return json({
      name: row.name,
      cls: row.cls ?? undefined,
      inventory: JSON.parse(row.inventory),
      town: JSON.parse(row.town),
      updated: row.updated,
    });
  }
  // Not in D1 yet: a save from the KV days, copied over (and made his) on this first read.
  const old = await legacySave(env, c.id);
  if (!old) return json({ error: "no such player" }, 404);
  await upsertSave(env.DB, c.id, c.me.id, old).run();
  return json({ ...old, cls: old.cls ?? undefined });
}

export async function onRequestPut({ params, env, request }) {
  const c = await check(params, env, request);
  if (c.error) return c.error;
  const text = await request.text();
  if (text.length > MAX_BYTES) return json({ error: "save too large" }, 413);
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "not JSON" }, 400);
  }
  const save = parseSave(raw);
  if (!save) return json({ error: "not a save" }, 400);
  const owner = await env.DB.prepare("SELECT account_id FROM players WHERE id = ?1").bind(c.id).first();
  if (owner?.account_id && owner.account_id !== c.me.id) return notYours();
  const r = await upsertSave(env.DB, c.id, c.me.id, save).run();
  return json((r.meta?.changes ?? 0) > 0 ? { ok: true } : { ok: true, kept: "newer" });
}
