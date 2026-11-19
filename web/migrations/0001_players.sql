-- The dungeon crawler's players (D1 database `simforge-game-db`, bound as DB on the simforge-game
-- Pages project). One row per player id (src/dungeon-explorer/profile.ts): what he brought out of
-- the dungeon (inventory: bag, purse, worn kit) and his rooms and stash chests in town, both as JSON.
-- `updated` is the game's own clock for the save (the newer of browser and server wins);
-- `saved_at` is when the server last stored it.
--
-- Apply: npx wrangler@4 d1 execute simforge-game-db --remote --file migrations/0001_players.sql
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cls TEXT,
  inventory TEXT NOT NULL,
  town TEXT NOT NULL,
  updated INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  saved_at INTEGER NOT NULL
);
