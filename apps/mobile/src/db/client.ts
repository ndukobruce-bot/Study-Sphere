import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { runMigrations } from "./schema";

const DATABASE_NAME = "studysphere.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Single source of truth for the whole app (see docs/AUDIT.md decision 1 —
 * no backend in v1). Opened once, migrated once, then reused everywhere.
 * Repositories call this instead of taking a db as a parameter so zustand
 * store actions (which aren't React components and can't call
 * useSQLiteContext) can use them directly.
 */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
