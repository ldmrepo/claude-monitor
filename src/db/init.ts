import { db, sqlite } from "./index";
import { runMigrations } from "./migrate";

let migrated = false;

export function ensureMigrated() {
  if (!migrated) {
    runMigrations();
    migrated = true;
  }
}

// The db/sqlite from index.ts are already lazy Proxies.
// Just ensure migrations run on first actual DB access by calling ensureMigrated
// in the pipeline before any DB operation.
export { db, sqlite };
export * from "./schema";
