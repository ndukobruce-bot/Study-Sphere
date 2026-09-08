import type { Database } from "./types";

/**
 * Every table StudySphere needs, plus every migration since. There are no
 * accounts and no server (see docs/AUDIT.md, docs/PROGRESS.md decision 1),
 * so this database is the entire app's data — which is also exactly what
 * Settings' export/import round-trips (see src/db/backup.ts).
 *
 * MIGRATIONS[i] is applied when a device's PRAGMA user_version === i, then
 * user_version is bumped to i+1. Never edit an already-shipped entry —
 * append a new one, even for something as small as an index, so devices
 * that already ran migration 0 don't lose data or re-run DDL that assumes
 * a pristine database. src/db/__tests__/schema.test.ts proves this harness
 * works with a real (if trivial) two-version upgrade, not just migration 0
 * on a fresh install.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'General',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    source TEXT
  );

  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY NOT NULL,
    goal TEXT NOT NULL,
    subject TEXT NOT NULL,
    deadline TEXT NOT NULL,
    daily_minutes INTEGER NOT NULL,
    energy TEXT NOT NULL,
    context TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    days_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    source TEXT
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY NOT NULL,
    subject TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    due_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exam_sprints (
    id TEXT PRIMARY KEY NOT NULL,
    exam_name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    days_left INTEGER NOT NULL,
    confidence INTEGER NOT NULL,
    today_blocks_json TEXT NOT NULL,
    mock_questions_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '',
    university TEXT NOT NULL DEFAULT '',
    course TEXT NOT NULL DEFAULT '',
    subjects_json TEXT NOT NULL DEFAULT '[]',
    weak_subjects_json TEXT NOT NULL DEFAULT '[]',
    daily_minutes INTEGER NOT NULL DEFAULT 120,
    available_days_json TEXT NOT NULL DEFAULT '[]',
    semester_goal TEXT NOT NULL DEFAULT '',
    onboarding_completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS streak (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    streak INTEGER NOT NULL DEFAULT 0,
    last_visit TEXT
  );

  CREATE TABLE IF NOT EXISTS pomodoro_days (
    day TEXT PRIMARY KEY NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 0,
    study_minutes INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS daily_mood (
    day TEXT PRIMARY KEY NOT NULL,
    mood TEXT NOT NULL
  );
  `,
  // Migration 1: index the column Home/Tasks/notifications filter and sort
  // by most often. Additive and safe to run against an existing database.
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);`
];

export async function runMigrations(db: Database): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let version = result?.user_version ?? 0;

  for (let i = version; i < MIGRATIONS.length; i += 1) {
    await db.execAsync(MIGRATIONS[i]!);
    version = i + 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
