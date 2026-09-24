import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

// Tests point this at ':memory:' so they never touch the real project data file.
const dbPath = process.env.WISDOM_STUDIO_DB_PATH || path.join(dataDir, 'wisdom-studio.sqlite');
const database = new DatabaseSync(dbPath);
// Deliberately NOT WAL: this app is a single Node process with no concurrent
// readers, so WAL's concurrency benefit doesn't apply here, and it adds a
// real durability risk — writes can sit unflushed in a separate .sqlite-wal
// file and be lost if the process is killed before a checkpoint runs. The
// default rollback-journal mode commits each write directly and atomically
// to the main database file.

// Thin wrapper so routes can keep using the familiar better-sqlite3-style API.
export const db = {
  prepare: (sql) => {
    const stmt = database.prepare(sql);
    return {
      run: (...args) => stmt.run(...normalizeArgs(args)),
      get: (...args) => stmt.get(...normalizeArgs(args)),
      all: (...args) => stmt.all(...normalizeArgs(args)),
    };
  },
  exec: (sql) => database.exec(sql),
};

// node:sqlite's named-parameter binding expects keys prefixed with '@'/'$'/':'
// exactly as written in the SQL; passing a plain object as the sole arg works
// the same way better-sqlite3 does, so no transformation is needed beyond
// this pass-through — kept as a named helper for clarity at call sites.
function normalizeArgs(args) {
  return args;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    page_size TEXT NOT NULL,
    template_key TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);
