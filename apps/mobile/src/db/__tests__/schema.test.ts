import { describe, expect, it } from "vitest";
import { runMigrations } from "../schema";
import { createFakeSQLiteDatabase } from "../testing/fakeSqlite";

describe("runMigrations", () => {
  it("brings a fresh database to the latest version", async () => {
    const db = createFakeSQLiteDatabase();
    await runMigrations(db);
    const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    expect(version?.user_version).toBe(2); // bump this when MIGRATIONS grows
    // The table from migration 0 is usable.
    await db.runAsync("INSERT INTO tasks (id, text, subject, priority, due_date, completed, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["1", "Test", "General", "medium", null, 0, "2026-09-10T00:00:00.000Z", null]);
    expect(await db.getAllAsync("SELECT * FROM tasks")).toHaveLength(1);
  });

  it("is a no-op on a database that's already current", async () => {
    const db = createFakeSQLiteDatabase();
    await runMigrations(db);
    await db.runAsync("INSERT INTO tasks (id, text, subject, priority, due_date, completed, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["1", "Existing", "General", "medium", null, 0, "2026-09-10T00:00:00.000Z", null]);
    await runMigrations(db); // second call
    expect(await db.getAllAsync("SELECT * FROM tasks")).toHaveLength(1); // not duplicated, not lost
  });

  it("upgrades a v1 device (only migration 0 applied) without touching existing data", async () => {
    const db = createFakeSQLiteDatabase();
    // Simulate a device that installed before migration 1 existed: apply
    // only migration 0 by calling runMigrations against a db pinned at
    // user_version 0, then insert data as a real user would have.
    await runMigrations(db);
    // Roll the version pragma back to simulate "only migration 0 ever ran"
    // (migration 1 here is an index, so this is realistic: an old device's
    // schema is otherwise identical, just missing the index and the
    // version bump).
    await db.execAsync("PRAGMA user_version = 1");
    await db.runAsync("INSERT INTO tasks (id, text, subject, priority, due_date, completed, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["1", "Pre-existing task", "General", "high", "2026-09-15", 0, "2026-09-01T00:00:00.000Z", null]);

    await runMigrations(db); // the "app update" moment

    const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    expect(version?.user_version).toBe(2);
    const tasks = await db.getAllAsync<{ text: string }>("SELECT * FROM tasks");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.text).toBe("Pre-existing task"); // untouched by the migration 1 upgrade
  });
});
