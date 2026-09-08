import { createFakeSQLiteDatabase } from "../../db/testing/fakeSqlite";

/** Vitest alias target for the bare "expo-sqlite" specifier (see vitest.config.ts). */
export async function openDatabaseAsync() {
  return createFakeSQLiteDatabase();
}
