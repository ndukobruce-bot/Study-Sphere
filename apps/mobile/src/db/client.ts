import * as SQLite from "expo-sqlite";
import { runMigrations } from "./schema";
import type { Database } from "./types";

const DATABASE_NAME = "studysphere.db";

let dbPromise: Promise<Database> | null = null;

async function openPlatformDatabase(): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // Adapt expo-sqlite's real (stricter, overloaded) types to this app's
  // narrower shared Database interface rather than relying on structural
  // assignability, which trips on its optional-vs-required params overload.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindable = (params: unknown[]) => params as any;
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, bindable(params)),
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, bindable(params)),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, bindable(params))
  };
}

/**
 * Single source of truth for the whole app (see docs/AUDIT.md decision 1 —
 * no backend in v1). Opened once, migrated once, then reused everywhere.
 * Repositories call this instead of taking a db as a parameter so zustand
 * store actions (which aren't React components and can't call
 * useSQLiteContext) can use them directly.
 *
 * This is the NATIVE implementation (Android/iOS). client.web.ts is a
 * separate file — Metro's platform-extension resolution means the web
 * fake never ships in the Android/iOS bundle at all, not just that it
 * never runs. Verified by grepping the Android export for "fakeSqlite"
 * (see docs/PROGRESS.md).
 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openPlatformDatabase();
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Test-only escape hatch: forces a fresh database next time getDb() is called. */
export function __resetDbForTests(): void {
  dbPromise = null;
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
