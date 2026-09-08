/**
 * The subset of expo-sqlite's SQLiteDatabase this app actually uses.
 * src/db/testing/fakeSqlite.ts implements the same shape so the web build
 * and the Vitest suite can stand in for a real device without expo-sqlite's
 * alpha-quality, extra-setup-required web support.
 */
export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}
