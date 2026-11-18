/**
 * Lightweight landing page rendered at bare `/` before loading any Three.js / WebGPU / R3F
 * engine code or 3D textures.
 */
export function renderLanding() {
  document.title = "SimForge — Choose Your Game Mode";
  document.body.style.background = "#090807";

  const root = document.createElement("main");
  root.id = "landing";
  root.innerHTML = `
    <style>
      #landing {
        position: fixed;
        inset: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        background:
          radial-gradient(circle at 50% 0%, rgba(255, 198, 72, 0.14), transparent 54%),
          radial-gradient(circle at 50% 100%, rgba(72, 168, 118, 0.10), transparent 50%),
          linear-gradient(180deg, #120d09 0%, #090807 60%, #050506 100%);
        color: #f3ead8;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        padding:
          max(16px, env(safe-area-inset-top))
          max(16px, env(safe-area-inset-right))
          max(30px, env(safe-area-inset-bottom))
          max(16px, env(safe-area-inset-left));
        box-sizing: border-box;
      }
      .wrap {
        max-width: 1080px;
        margin: 0 auto;
      }
      .who {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
        margin: 4px 0 2px;
        font-size: 14px;
      }
      .who-label { color: #b9ab90; }
      .who-name { color: #ffd84d; font-weight: 800; font-family: Georgia, "Times New Roman", serif; font-size: 17px; }
      .hero {
        text-align: center;
        margin-bottom: 22px;
      }
      .eyebrow {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(255, 216, 77, 0.12);
        border: 1px solid rgba(255, 216, 77, 0.32);
        color: #ffd84d;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      .hero h1 {
        margin: 0;
        font-size: clamp(30px, 5vw, 54px);
        font-weight: 900;
        line-height: 1.04;
        letter-spacing: -0.02em;
        color: #ffd84d;
        text-shadow: 0 4px 0 #3a1808, 0 12px 28px rgba(0, 0, 0, 0.7);
      }
      .hero p {
        margin: 12px auto 0;
        max-width: 640px;
        font-size: 15px;
        line-height: 1.5;
        color: #cbbba2;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
        gap: 16px;
      }
      .card {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 16px;
        background: linear-gradient(180deg, rgba(31, 24, 18, 0.94), rgba(16, 13, 11, 0.96));
        border: 1px solid rgba(255, 224, 150, 0.16);
        border-radius: 16px;
        padding: 22px;
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
        transition: transform 0.16s ease, border-color 0.16s ease;
      }
      .card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 216, 77, 0.45);
      }
      .card.featured {
        border-color: rgba(108, 232, 138, 0.42);
        background: linear-gradient(180deg, rgba(22, 34, 27, 0.96), rgba(13, 18, 15, 0.98));
      }
      .card.featured:hover {
        border-color: rgba(108, 232, 138, 0.8);
      }
      .badge {
        display: inline-block;
        align-self: flex-start;
        padding: 3px 9px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        background: rgba(255, 216, 77, 0.14);
        color: #ffd84d;
      }
      .card.featured .badge {
        background: rgba(108, 232, 138, 0.16);
        color: #7df39b;
      }
      .card h2 {
        margin: 8px 0 6px;
        font-size: 22px;
        font-weight: 800;
        color: #fff6e5;
      }
      .card p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: #c2b6a3;
      }
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }
      .tag {
        font-size: 11px;
        color: #d6cbb8;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 6px;
        padding: 3px 8px;
      }
      .opts {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 12px;
        color: #d7e2db;
      }
      .opts label {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .opts select {
        background: #141c18;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 6px;
        padding: 3px 7px;
        font-size: 12px;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 48px;
        box-sizing: border-box;
        padding: 12px 16px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
        border: none;
        background: #ffd84d;
        color: #1c1106;
        transition: filter 0.14s ease, transform 0.12s ease;
      }
      .card.featured .btn {
        background: #6ce88a;
        color: #082012;
      }
      .btn:hover { filter: brightness(1.06); }
      .btn:active { transform: scale(0.99); }
      .extras {
        margin-top: 22px;
        padding: 14px 18px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .extras-title {
        font-size: 13px;
        font-weight: 700;
        color: #cbbba2;
      }
      .extras-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pill {
        font-size: 12px;
        font-weight: 600;
        color: #ffd84d;
        text-decoration: none;
        padding: 6px 12px;
        border-radius: 8px;
        background: rgba(255, 216, 77, 0.08);
        border: 1px solid rgba(255, 216, 77, 0.24);
      }
      .pill:hover {
        background: rgba(255, 216, 77, 0.16);
      }
    </style>

    <div class="wrap">
      <header class="hero">
        <div class="eyebrow">SimForge Arcade</div>
        <h1>CHOOSE YOUR GAME MODE</h1>
        <p>
          Select an experience below — no 3D engine or game assets load until you pick what to open.
        </p>
      </header>

      <section class="grid">
        <article class="card featured" style="border-color: #f59e0b; box-shadow: 0 0 24px rgba(245, 158, 11, 0.25);">
          <div>
            <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">New · Counter-Strike Gun Game</span>
            <h2>🔫 Vardhan's CS Gun Game</h2>
            <p>
              First-person Counter-Strike Arms Race! Eliminate enemy bots across the Dust 2 arena to level up through
              Glock, MP5-SD, AK-47, AWP Sniper with scope zoom, and the Golden Knife!
            </p>
            <div class="tags">
              <span class="tag">FPS Mouse Look</span>
              <span class="tag">5 Weapon Tiers</span>
              <span class="tag">Headshots &amp; Recoil</span>
              <span class="tag">Dust 2 Crate Arena</span>
            </div>
          </div>
          <a class="btn" href="./vardhan" style="background: #f59e0b; color: #0f172a; font-weight: 800;">
            Play CS Gun Game →
          </a>
        </article>

        <article class="card featured" style="border-color: #38bdf8; box-shadow: 0 0 24px rgba(56, 189, 248, 0.25);">
          <div>
            <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">Vardhan's Game · Stumble Guys</span>
            <h2>🏃 Vardhan's Stumble Sandbox</h2>
            <p>
              Stumble Guys-style bouncy obstacle course! Jump over rotating foam sweeper arms, bounce on trampoline pads,
              dodge pinball bumpers, dive-slide, and reach the Winner's Golden Crown.
            </p>
            <div class="tags">
              <span class="tag">Knight / Ninja / Wizard / Goblin</span>
              <span class="tag">Bouncers &amp; Sweepers</span>
              <span class="tag">In-Game Workshop</span>
              <span class="tag">Mobile &amp; Desktop</span>
            </div>
          </div>
          <a class="btn" href="./vardhan" style="background: #38bdf8; color: #0f172a; font-weight: 800;">
            Play Stumble Sandbox →
          </a>
        </article>

        <article class="card featured">
          <div>
            <span class="badge">New · Dungeon Crawler</span>
            <h2>Dungeon Crawler</h2>
            <p>
              Choose your class, wake in the Wayfarer's Rest, rent a room upstairs to stash your loot and
              trade on the market street, then step onto the teleporter at the Gate of the Deep. Fight
              through a fresh dungeon floor and escape through a portal before it closes, or lose what you found.
            </p>
            <div class="tags">
              <span class="tag">Fighter (more classes soon)</span>
              <span class="tag">Tavern &amp; Market Hub</span>
              <span class="tag">Extraction Runs</span>
              <span class="tag">Rentable Stash Rooms</span>
              <span class="tag">Three.js / WebGL</span>
            </div>
          </div>

          <div class="who">
            <span class="who-label">You play as</span>
            <span class="who-name" id="crawler-name">a new adventurer</span>
          </div>

          <button type="button" id="launch-explorer" class="btn">
            Start Dungeon Crawler →
          </button>
        </article>

        <article class="card">
          <div>
            <span class="badge">Episode 1 · Playable</span>
            <h2>Crypt Hall Traps</h2>
            <p>
              Dash down a trap-filled crypt past spike pits, swinging pendulums, flamers, and mimic chests.
              Play as Goblin, Rogue, Mage, or Paladin.
            </p>
            <div class="tags">
              <span class="tag">Trap Obstacles</span>
              <span class="tag">4 Hero Classes</span>
              <span class="tag">WebGPU</span>
            </div>
          </div>
          <a class="btn" href="?mode=crypt&amp;play=1">Play Crypt Hall →</a>
        </article>

        <article class="card">
          <div>
            <span class="badge">Episode 2 · Playable</span>
            <h2>Boulder Hallway</h2>
            <p>
              Outrun or counter a hall-wide rolling boulder, ceiling crushers, gelatinous cube,
              blast doors, and half-pipe hazards.
            </p>
            <div class="tags">
              <span class="tag">Rolling Boulder</span>
              <span class="tag">4 Hero Classes</span>
              <span class="tag">WebGPU</span>
            </div>
          </div>
          <a class="btn" href="?mode=boulder&amp;play=1">Play Boulder Hallway →</a>
        </article>
      </section>

      <aside class="extras">
        <span class="extras-title">Film &amp; Lab Views (Direct Cameras):</span>
        <div class="extras-links">
          <a class="pill" href="?mode=crypt&amp;lab=1">Crypt Showcase / Walk</a>
          <a class="pill" href="?mode=boulder">Boulder Film Rig</a>
          <a class="pill" href="?mode=walls">Ep3 Crushing Walls</a>
        </div>
      </aside>
    </div>
  `;

  document.body.append(root);

  // The player this browser plays as (a random name, made on the first start; profile.ts).
  const nameEl = document.getElementById("crawler-name");
  try {
    const p = JSON.parse(localStorage.getItem("simforge.explorer.profile.v1") || "null");
    if (p && typeof p.name === "string" && nameEl) nameEl.textContent = p.name;
    else if (nameEl) nameEl.textContent = "a new adventurer (a name is drawn for you)";
  } catch {
    // Blocked storage: a guest.
  }

  const launchBtn = document.getElementById("launch-explorer");
  launchBtn?.addEventListener("click", () => {
    location.search = `?${new URLSearchParams({ mode: "explorer" }).toString()}`;
  });
}
