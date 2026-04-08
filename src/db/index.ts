import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(process.cwd(), "data", "claude-vault.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Lazy singleton — connection created on first property access, not at import time.
// The Proxy pattern keeps all 54+ call sites using `db.select()` / `sqlite.transaction()`
// without needing `db().select()` everywhere.
let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database<typeof schema> | null = null;

function getSqlite(): Database.Database {
  if (!_sqlite) {
    _sqlite = new Database(DB_PATH);
    _sqlite.pragma("busy_timeout = 30000");
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("synchronous = NORMAL");
    _sqlite.pragma("foreign_keys = ON");
  }
  return _sqlite;
}

function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
  }
  return _db;
}

function lazyProxy<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = getter();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (real as any)[prop];
      return typeof val === "function" ? val.bind(real) : val;
    },
  });
}

export const sqlite = lazyProxy(getSqlite);
export const db = lazyProxy(getDb);
