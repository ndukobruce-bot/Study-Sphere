import { getDb } from "./client";

/**
 * Full-database export/import for Settings. This is how a user survives a
 * new phone in v1 (there's no server sync — see docs/AUDIT.md decision 1),
 * so it must round-trip losslessly: every table, dumped and restored as-is.
 */

const CURRENT_VERSION = 1;
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

/**
 * Validates the SHAPE of a parsed backup file (not the JSON syntax — that's
 * the caller's job, e.g. fileIO.ts's JSON.parse). Every failure here throws
 * a message written for the person tapping "Import," not a stack trace —
 * see docs/PROGRESS.md's notification/import correctness pass.
 */
export function validateBackup(data: unknown): BackupFile {
  if (data === null || typeof data !== "object") {
    throw new Error("That file doesn't look like a StudySphere backup.");
  }
  const candidate = data as Record<string, unknown>;

  if (typeof candidate.version !== "number") {
    throw new Error("That file doesn't look like a StudySphere backup — it's missing a version number.");
  }
  if (candidate.version > CURRENT_VERSION) {
    throw new Error("This backup was made by a newer version of StudySphere. Update the app, then try importing it again.");
  }
  if (candidate.version < CURRENT_VERSION) {
    throw new Error(`This backup uses an older format (version ${candidate.version}) that this app version can't read.`);
  }
  if (candidate.tables === null || typeof candidate.tables !== "object" || Array.isArray(candidate.tables)) {
    throw new Error("That file doesn't look like a StudySphere backup — it's missing its data.");
  }
  const tables = candidate.tables as Record<string, unknown>;
  for (const [table, rows] of Object.entries(tables)) {
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`That backup file looks corrupted — "${table}" isn't a list of records.`);
    }
  }

  return candidate as unknown as BackupFile;
}

export async function importAllData(rawBackup: unknown): Promise<void> {
  const backup = validateBackup(rawBackup);
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
