import { db, sqlite } from "./index";
import { runMigrations } from "./migrate";

let migrated = false;

export function ensureMigrated() {
  if (!migrated) {
    runMigrations();
    migrated = true;
  }
}

export { db, sqlite };
export * from "./schema";
