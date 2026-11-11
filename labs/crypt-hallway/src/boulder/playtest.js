// Win/die matrix for the boulder game (sim.js): every class against every trap, run by a scripted
// player. For each pair: standing there doing nothing (must die), each of the class's moves pressed
// at every frame of a window after the ball's release (some timings must win, and only a few), and
// the traps' twists (a move that must fail there, whatever the timing). Runs in node
// (test-game.mjs --node) and in the browser page (test-game.mjs), on the same sim the game plays.
const MOVES = {
  rogue: [
    { id: "vault", key: "e" },
    { id: "roll", key: "q", corner: true, dir: [1, 0] },
  ],
  mage: [
    { id: "levitate", key: "e" },
    { id: "blink", key: "q", dir: [1, 0] },
  ],
  paladin: [
    { id: "warhammer", key: "e" },
    { id: "wedge", key: "q", hold: 40 },
  ],
};
// where to stand for each trap before the move (default: stop where you are when the ball goes)
const STAND = {
  slime: { rogue: { x: 3.6 } },        // off the slime first (the drum's trigger is stepping on it)
  magnet: { paladin: { x: 1.6 } },     // out of the magnet's reach
};
// a move that must fail at a trap (its twist), at any timing
const TWISTS = [
  { cls: "rogue", zone: "slime", move: "vault", stand: { x: 2.2 }, why: "vaulting off the slime: slips" },
  { cls: "rogue", zone: "slime", move: "roll", why: "the drum fills the hall: no corner to roll past it" },
  { cls: "rogue", zone: "magnet", move: "roll", why: "spikes: no corner gap" },
  { cls: "rogue", zone: "crushers", move: "vault", stand: { x: -3.2 }, why: "airborne under the crushers: swatted" },
  { cls: "mage", zone: "crushers", move: "levitate", stand: { x: -3.2 }, why: "floating under the crushers: swatted" },
  { cls: "paladin", zone: "magnet", move: "warhammer", why: "iron spikes: skewered" },
  { cls: "paladin", zone: "magnet", move: "wedge", stand: { x: 4.6 }, why: "bracing on the magnet: yanked onto it" },
];
const WALL_Z = -0.6 + 1.6; // hugging the wall (the sim clamps to the lane)

function runOnce(createSim, cls, zone, plan) {
  const sim = createSim({ classType: cls, only: [zone] });
  const p = () => sim.player;
  let releasedAt = null;
  for (let i = 0; i < 520; i++) {
    if (sim.state.ball && releasedAt == null) releasedAt = sim.frame;
    const input = { move: [0, 0] };
    if (releasedAt == null) {
      input.move = [1, 0]; // walk up the hall until the trap goes (the door's ball comes by itself)
    } else {
      const t = sim.frame - releasedAt;
      const tx = plan.stand?.x;
      if (tx != null && Math.abs(p().x - tx) > 0.15) { input.move = [Math.sign(tx - p().x), 0]; input.run = true; }
      if (plan.corner && Math.abs(p().z - WALL_Z) > 0.3) input.move = [input.move[0], Math.sign(WALL_Z - p().z)];
      if (plan.key && t >= plan.at && t < plan.at + (plan.hold ?? 2)) {
        input[plan.key] = true;
        if (plan.dir) input.move = plan.dir;
      }
    }
    sim.step(input);
    sim.drain();
    if (p().state === "dead" || p().state === "launched") return { win: false, why: p().reason ?? p().state };
    if (sim.state.zone > 0) return { win: true };
  }
  return { win: false, why: "timeout" };
}

export function runMatrix(createSim, zones) {
  const rows = [];
  const scan = (cls, zone, move, stand) => {
    const wins = [];
    const whys = {};
    for (let at = 0; at <= 110; at++) {
      const r = runOnce(createSim, cls, zone, { ...move, at, stand });
      if (r.win) wins.push(at); else whys[r.why] = (whys[r.why] ?? 0) + 1;
    }
    return { wins, whys };
  };
  for (const zone of zones) for (const cls of Object.keys(MOVES)) {
    const idle = runOnce(createSim, cls, zone, { stand: STAND[zone]?.[cls] });
    const moves = MOVES[cls].map((m) => ({ move: m.id, ...scan(cls, zone, m, STAND[zone]?.[cls]) }));
    for (const t of TWISTS.filter((q) => q.cls === cls && q.zone === zone)) {
      moves.push({ move: t.move, twist: t.why, ...scan(cls, zone, MOVES[cls].find((m) => m.id === t.move), t.stand ?? STAND[zone]?.[cls]) });
    }
    rows.push({ zone, cls, idle, moves });
  }
  return rows;
}

// PASS = idle dies, at least one move wins at some timing, twists never win, and no move wins for
// more than a short window (it has to be timed)
export const MAX_WINDOW = 24;
export function report(rows) {
  const out = [];
  let ok = true;
  const span = (w) => (w.length ? `${w[0]}-${w[w.length - 1]} (${w.length}f)` : "never");
  for (const r of rows) {
    const beaten = r.moves.some((m) => !m.twist && m.wins.length > 0);
    // a move the trap's twist rules out may still be listed without the twist: it just must not be the only way
    const twistsHold = r.moves.every((m) => !m.twist || m.wins.length === 0);
    const timed = r.moves.every((m) => m.wins.length <= MAX_WINDOW);
    const line = [
      `${r.zone.padEnd(8)} ${r.cls.padEnd(7)}`,
      `idle: ${r.idle.win ? "SURVIVES" : `dies (${r.idle.why})`}`,
      ...r.moves.map((m) => `${m.move}${m.twist ? " [twist]" : ""}: ${span(m.wins)}`),
    ].join(" | ");
    const good = !r.idle.win && beaten && twistsHold && timed;
    ok &&= good;
    out.push(`${good ? "PASS" : "FAIL"}  ${line}`);
  }
  return { ok, text: out.join("\n") };
}
