// 🎮 VARDHAN'S GAME CONFIGURATION
// Hey Vardhan! Change any of these settings to make the game your own!

export const GAME_CONFIG = {
  // 🦸 YOUR HERO
  player: {
    // Choose your character: "paladin" (heavy knight), "rogue" (swift ninja), "mage" (wizard), "goblin" (little guy)
    heroClass: "paladin" as "paladin" | "rogue" | "mage" | "goblin",

    // Choose your weapon: "sword", "warhammer", "club", "dagger", "daggers", "staff", "none"
    weapon: "sword" as "sword" | "warhammer" | "club" | "dagger" | "daggers" | "staff" | "none",

    // Hero size (1.0 = normal, 1.4 = giant hero, 0.7 = mini hero)
    scale: 1.0,

    // Walk speed (higher = faster runner!)
    walkSpeed: 7.0,

    // Jump force (try 11 for normal, 20 for mega trampoline jumps!)
    jumpForce: 11.0,

    // Maximum health hearts
    maxHealth: 3,
  },

  // 🗺️ THE GAME DUNGEON / ARENA
  world: {
    title: "Vardhan's Dungeon Quest",
    arenaSize: 26,       // Width & length of the stone room
    wallHeight: 3.5,     // Height of dungeon walls
    floorColor: "#2c303c",
    wallColor: "#404656",
  },

  // 🪙 SHINY COINS TO COLLECT
  coins: {
    count: 8,
    spinSpeed: 3.0,
    bobHeight: 0.25,
  },

  // ⚠️ TRAPS & HAZARDS
  traps: {
    spikeCount: 4,
    swingingBladeSpeed: 2.5,
  },

  // 👾 ENEMIES
  enemies: {
    count: 2,
    speed: 2.4,
    detectionRange: 8.0, // When enemy sees you and begins chasing!
  },
};
