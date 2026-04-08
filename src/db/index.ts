import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(process.cwd(), "data", "claude-vault.db");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Lazy singleton — connection created on first access, not at import time.
// This prevents build workers from all racing to open the DB simultaneously.
let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database<typeof schema> | null = null;

export function getSqlite(): Database.Database {
  if (!_sqlite) {
    _sqlite = new Database(DB_PATH);
    _sqlite.pragma("busy_timeout = 30000");
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("synchronous = NORMAL");
    _sqlite.pragma("foreign_keys = ON");
  }
  return _sqlite;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
  }
  return _db;
}

// Convenience re-exports (lazy via getter)
export const sqlite = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const real = getSqlite();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (real as any)[prop];
    if (typeof val === "function") return val.bind(real);
    return val;
  },
});

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop, receiver) {
    const real = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (real as any)[prop];
    if (typeof val === "function") return val.bind(real);
    return val;
  },
});
