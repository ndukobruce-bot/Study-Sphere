import { runMigrations } from "./schema";
import { createFakeSQLiteDatabase } from "./testing/fakeSqlite";
import type { Database } from "./types";

/**
 * Web build of src/db/client.ts. Metro picks this file automatically for
 * web (platform-extension resolution) — the real expo-sqlite native module
 * and this fake are never bundled together for the same platform. See
 * client.ts's doc comment for why web gets a fake instead of expo-sqlite's
 * alpha-quality web support.
 */
let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = createFakeSQLiteDatabase();
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}

export function __resetDbForTests(): void {
  dbPromise = null;
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
