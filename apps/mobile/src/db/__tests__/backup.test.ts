import { beforeEach, describe, expect, it } from "vitest";
import { exportAllData, importAllData, validateBackup, wipeAllData } from "../backup";
import { __resetDbForTests } from "../client";
import * as tasksRepo from "../repositories/tasks";
import * as examsRepo from "../repositories/exams";
import * as notesRepo from "../repositories/notes";
import * as flashcardsRepo from "../repositories/flashcards";
import { saveProfile } from "../repositories/profile";
import { touchStreak } from "../repositories/streak";
import { recordCompletedSession } from "../repositories/pomodoro";
import { setTodayMood } from "../repositories/mood";
import { savePlan } from "../repositories/plans";
import { saveExamSprint } from "../repositories/examSprints";
import { buildStudyPlan } from "@studysphere/shared";

beforeEach(() => { __resetDbForTests(); });

async function seedEveryTable() {
  await tasksRepo.createTask({ text: "Read chapter 3", dueDate: "2026-09-15" });
  await examsRepo.createExam("Physics", "2026-11-03");
  await notesRepo.createNote({ title: "Cells", subject: "Biology", body: "..." });
  await flashcardsRepo.createFlashcard({ subject: "Math", question: "2+2", answer: "4" });
  await saveProfile({
    name: "Asha", university: "UoN", course: "CS", subjects: ["Math"], weakSubjects: [],
    dailyMinutes: 90, availableDays: ["Mon"], semesterGoal: "Pass", onboardingCompletedAt: "2026-09-01T00:00:00.000Z"
  });
  await touchStreak(new Date(2026, 8, 10));
  await recordCompletedSession(25);
  await setTodayMood("great");
  await savePlan(buildStudyPlan({ goal: "Finals", deadline: "2026-09-12", minutes: 60, focus: ["Math"], energy: "medium", today: "2026-09-10" }));
  await saveExamSprint({
    exam: { name: "Physics", date: "2026-09-20" }, daysLeft: 5, confidence: 40,
    todayBlocks: [{ title: "Revise: Optics", minutes: 40 }], mockQuestions: ["Explain refraction."],
    createdAt: new Date().toISOString()
  });
}

describe("export/import round trip", () => {
  it("preserves every table's full content, including nested JSON, byte for byte", async () => {
    await seedEveryTable();
    const before = await exportAllData();

    await wipeAllData();
    for (const table of Object.keys(before.tables)) {
      expect((await exportAllData()).tables[table as keyof typeof before.tables]).toEqual([]);
    }

    await importAllData(before);
    const after = await exportAllData();

    // Deep-equal every table, not just row counts - ids, timestamps and
    // nested JSON blobs (plan days, exam sprint blocks) included.
    expect(after.tables).toEqual(before.tables);
  });

  it("wipes existing data before importing rather than merging", async () => {
    await tasksRepo.createTask({ text: "This should be gone after import" });
    const backup = await exportAllData();
    backup.tables.tasks = []; // an "empty on the imported side" table
    await importAllData(backup);
    expect(await tasksRepo.listTasks()).toHaveLength(0);
  });

  it("rolls back cleanly if an error interrupts the import", async () => {
    await tasksRepo.createTask({ text: "Should survive a failed import" });
    const backup = await exportAllData();
    // Force a mid-import failure: a row referencing a column that will
    // blow up the fake engine's INSERT parser (unbalanced structure).
    (backup.tables as any).tasks = [{ id: "x", text: "ok" }, null];

    await expect(importAllData(backup)).rejects.toBeTruthy();
    // The pre-existing task must still be there - the transaction rolled back.
    const tasks = await tasksRepo.listTasks();
    expect(tasks.some(task => task.text === "Should survive a failed import")).toBe(true);
  });
});

describe("validateBackup failure cases", () => {
  it("rejects a non-object", () => {
    expect(() => validateBackup("just a string")).toThrow(/doesn't look like a StudySphere backup/);
    expect(() => validateBackup(null)).toThrow(/doesn't look like a StudySphere backup/);
  });

  it("rejects a missing version", () => {
    expect(() => validateBackup({ tables: {} })).toThrow(/missing a version number/);
  });

  it("rejects a newer version than this app supports", () => {
    expect(() => validateBackup({ version: 99, tables: {} })).toThrow(/newer version of StudySphere/);
  });

  it("rejects an older version this app no longer reads", () => {
    expect(() => validateBackup({ version: 0, tables: {} })).toThrow(/older format/);
  });

  it("rejects a missing tables object", () => {
    expect(() => validateBackup({ version: 1 })).toThrow(/missing its data/);
    expect(() => validateBackup({ version: 1, tables: [] })).toThrow(/missing its data/);
  });

  it("rejects a table that isn't a list", () => {
    expect(() => validateBackup({ version: 1, tables: { tasks: "not a list" } })).toThrow(/tasks.*isn't a list/);
  });

  it("accepts an otherwise-valid backup with some tables omitted", () => {
    expect(() => validateBackup({ version: 1, tables: { tasks: [] } })).not.toThrow();
  });
});
