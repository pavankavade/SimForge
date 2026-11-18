// A player's save for the dungeon crawler (Cloudflare Pages Function): what he brought out of the
// dungeon (bag, purse, worn kit) and his rooms and stash chests in the tavern, keyed by the random
// player id his browser made (src/dungeon-explorer/profile.ts). Stored in the KV namespace bound
// as PROFILES; without that binding the API answers 503 and the game keeps saves in the browser.
//
// GET  /api/profile/:id  -> the save, or 404
// PUT  /api/profile/:id  -> store it (JSON, at most 256 KB)

const ID_RE = /^[a-z0-9-]{16,64}$/;
const MAX_BYTES = 256 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function check(params, env) {
  const id = String(params.id || "");
  if (!ID_RE.test(id)) return { error: json({ error: "bad player id" }, 400) };
  if (!env.PROFILES) return { error: json({ error: "profile storage is not configured" }, 503) };
  return { id, key: `profile:${id}` };
}

export async function onRequestGet({ params, env }) {
  const c = check(params, env);
  if (c.error) return c.error;
  const raw = await env.PROFILES.get(c.key);
  if (!raw) return json({ error: "no such player" }, 404);
  return new Response(raw, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export async function onRequestPut({ params, env, request }) {
  const c = check(params, env);
  if (c.error) return c.error;
  const text = await request.text();
  if (text.length > MAX_BYTES) return json({ error: "save too large" }, 413);
  let save;
  try {
    save = JSON.parse(text);
  } catch {
    return json({ error: "not JSON" }, 400);
  }
  const ok =
    save &&
    typeof save === "object" &&
    typeof save.name === "string" &&
    save.name.length <= 40 &&
    typeof save.updated === "number" &&
    save.inventory &&
    typeof save.inventory === "object" &&
    save.town &&
    typeof save.town === "object";
  if (!ok) return json({ error: "not a save" }, 400);
  // An older copy never overwrites a newer one (two tabs, or a slow request arriving late).
  const prev = await env.PROFILES.get(c.key, "json");
  if (prev && typeof prev.updated === "number" && prev.updated > save.updated) return json({ ok: true, kept: "newer" });
  const stored = { name: save.name, inventory: save.inventory, town: save.town, updated: save.updated, seen: Date.now() };
  // The name rides along as metadata, so the KV listing shows who each player is.
  await env.PROFILES.put(c.key, JSON.stringify(stored), { metadata: { name: save.name, updated: save.updated } });
  return json({ ok: true });
}
