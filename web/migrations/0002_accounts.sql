-- Accounts for the dungeon crawler. A player picks a username the first time he plays; the server
-- makes an account for it and hands his browser a session token (kept in localStorage, sent as
-- `Authorization: Bearer <token>`). Only the token's SHA-256 is stored here.
--
-- An account owns its players (characters): `players.account_id`. A save from before accounts is
-- claimed by the first account that signs in with its player id.
--
-- Ready for later: `password_hash` (username + password login) and `identities` (OAuth: Discord,
-- Google, ...), both unused for now.
--
-- Apply: npx wrangler@4 d1 execute simforge-game-db --remote --file migrations/0002_accounts.sql
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  -- lower-case username: unique, so "Sigrun" and "sigrun" are the same name
  username_key TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);

CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);

ALTER TABLE players ADD COLUMN account_id TEXT REFERENCES accounts(id);
CREATE INDEX IF NOT EXISTS players_account ON players(account_id);
