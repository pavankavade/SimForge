// The dungeon crawler's multiplayer hub on this machine (web/mp/hub.js behind a plain WebSocket
// server), for playing two browser windows against each other without Cloudflare:
//   npm run mp          (then `npm run explorer` or `npm run web:dev`; the game finds it on localhost)
//   node scripts/mp-server.mjs --port 5397
// Nobody is signed in here (there is no account database); everyone shows by character name.
import http from "node:http";
import { WebSocketServer } from "ws";
import { Hub } from "../web/mp/hub.js";

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const PORT = Number(portIdx >= 0 ? args[portIdx + 1] : process.env.MP_PORT) || 5397;

const hub = new Hub();
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`SimForge multiplayer hub: ${hub.players.size} online\n`);
});
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  const sock = { send: (t) => ws.readyState === ws.OPEN && ws.send(t), close: () => ws.close() };
  hub.open(sock);
  ws.on("message", (data) => void hub.message(sock, data.toString()));
  ws.on("close", () => hub.close(sock));
  ws.on("error", () => hub.close(sock));
});
server.listen(PORT, () => console.log(`multiplayer hub on ws://localhost:${PORT}/ws`));
