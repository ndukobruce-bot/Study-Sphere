import { getDb } from "./client";

/**
 * Full-database export/import for Settings. This is how a user survives a
 * new phone in v1 (there's no server sync — see docs/AUDIT.md decision 1),
 * so it must round-trip losslessly: every table, dumped and restored as-is.
 */

const TABLES = ["tasks", "exams", "plans", "notes", "flashcards", "exam_sprints", "profile", "streak", "pomodoro_days", "daily_mood"] as const;

export interface BackupFile {
  version: 1;
  exportedAt: string;
  tables: Partial<Record<(typeof TABLES)[number], unknown[]>>;
}

export async function exportAllData(): Promise<BackupFile> {
  const db = await getDb();
  const tables: BackupFile["tables"] = {};
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }
  return { version: 1, exportedAt: new Date().toISOString(), tables };
}

function quote(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

export async function importAllData(backup: BackupFile): Promise<void> {
  const db = await getDb();
  await db.execAsync("BEGIN TRANSACTION");
  try {
    for (const table of TABLES) {
      await db.execAsync(`DELETE FROM ${table}`);
      const rows = backup.tables[table] as Record<string, unknown>[] | undefined;
      if (!rows || rows.length === 0) continue;
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(column => quote(row[column]));
        await db.execAsync(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")})`);
      }
    }
    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  for (const table of TABLES) {
    await db.runAsync(`DELETE FROM ${table}`);
  }
}
