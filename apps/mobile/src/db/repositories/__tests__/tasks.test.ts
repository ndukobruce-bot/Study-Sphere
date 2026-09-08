import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as tasksRepo from "../tasks";

beforeEach(() => {
  __resetDbForTests();
});

describe("tasks repository", () => {
  it("creates a task with defaults filled in", async () => {
    const task = await tasksRepo.createTask({ text: "Read chapter 3" });
    expect(task.subject).toBe("General");
    expect(task.priority).toBe("medium");
    expect(task.completed).toBe(false);
    expect(task.dueDate).toBeNull();
  });

  it("lists tasks most-recently-created first", async () => {
    const first = await tasksRepo.createTask({ text: "First" });
    await new Promise(resolve => setTimeout(resolve, 2));
    const second = await tasksRepo.createTask({ text: "Second" });
    const tasks = await tasksRepo.listTasks();
    expect(tasks[0]!.id).toBe(second.id);
    expect(tasks[1]!.id).toBe(first.id);
  });

  it("toggles completion", async () => {
    const task = await tasksRepo.createTask({ text: "Finish lab report" });
    await tasksRepo.toggleTask(task.id, true);
    const tasks = await tasksRepo.listTasks();
    expect(tasks.find(item => item.id === task.id)!.completed).toBe(true);
  });

  it("updates only the provided fields", async () => {
    const task = await tasksRepo.createTask({ text: "Original", subject: "Math", priority: "low" });
    await tasksRepo.updateTask(task.id, { priority: "high" });
    const tasks = await tasksRepo.listTasks();
    const updated = tasks.find(item => item.id === task.id)!;
    expect(updated.priority).toBe("high");
    expect(updated.text).toBe("Original");
    expect(updated.subject).toBe("Math");
  });

  it("deletes a single task", async () => {
    const task = await tasksRepo.createTask({ text: "Delete me" });
    await tasksRepo.deleteTask(task.id);
    expect(await tasksRepo.listTasks()).toHaveLength(0);
  });

  it("clears only completed tasks", async () => {
    const done = await tasksRepo.createTask({ text: "Done" });
    await tasksRepo.createTask({ text: "Open" });
    await tasksRepo.toggleTask(done.id, true);
    await tasksRepo.clearCompletedTasks();
    const remaining = await tasksRepo.listTasks();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.text).toBe("Open");
  });

  it("creates multiple tasks in one call, preserving order", async () => {
    const created = await tasksRepo.createTasks([
      { text: "A", dueDate: "2026-09-10" },
      { text: "B", dueDate: "2026-09-11" }
    ]);
    expect(created.map(task => task.text)).toEqual(["A", "B"]);
    expect((await tasksRepo.listTasks())).toHaveLength(2);
  });
});
