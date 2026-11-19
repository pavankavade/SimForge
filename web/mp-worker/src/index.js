// The multiplayer hub on Cloudflare: GET /ws upgrades to a WebSocket held by the one Lobby Durable
// Object, which runs web/mp/hub.js. Signed-in players are checked against the accounts in D1.
import { Hub } from "../../mp/hub.js";

/** Pages that may open a socket here (the live game, its preview deploys, and local dev). */
const ORIGINS = [/^https:\/\/([a-z0-9-]+\.)?simforge-game\.pages\.dev$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export class Lobby {
  constructor(state, env) {
    this.hub = new Hub({
      verify: env.DB
        ? async (token) => {
            const row = await env.DB.prepare("SELECT a.username FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ?1")
              .bind(await sha256(token))
              .first();
            return row ? row.username : null;
          }
        : null,
    });
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const sock = { send: (t) => server.send(t), close: () => server.close() };
    this.hub.open(sock);
    server.addEventListener("message", (e) => {
      if (typeof e.data === "string") void this.hub.message(sock, e.data);
    });
    const gone = () => this.hub.close(sock);
    server.addEventListener("close", gone);
    server.addEventListener("error", gone);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/ws") return new Response("SimForge multiplayer hub\n", { headers: { "Content-Type": "text/plain" } });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected a WebSocket", { status: 426 });
    const origin = request.headers.get("Origin") || "";
    if (!ORIGINS.some((re) => re.test(origin))) return new Response("forbidden", { status: 403 });
    const lobby = env.LOBBY.get(env.LOBBY.idFromName("lobby"));
    return lobby.fetch(request);
  },
};
