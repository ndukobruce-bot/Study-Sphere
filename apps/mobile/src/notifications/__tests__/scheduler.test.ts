import { beforeEach, describe, expect, it } from "vitest";
import { __mockNotificationState } from "../../testing/mocks/expo-notifications";
import { preferences, notificationIds } from "../../store/mmkv";
import type { Task } from "../../db/repositories/tasks";
import {
  cancelTaskReminder,
  getNotificationPermissionState,
  rescheduleAllPendingReminders,
  scheduleTaskReminder
} from "../scheduler";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    text: "Read chapter 3",
    subject: "General",
    priority: "medium",
    dueDate: null,
    completed: false,
    createdAt: new Date().toISOString(),
    source: null,
    ...overrides
  };
}

const KNOWN_TASK_IDS = ["task-1", "a", "b", "c", "d", "e"];

beforeEach(() => {
  __mockNotificationState.reset();
  preferences.remove("notificationsEnabled");
  KNOWN_TASK_IDS.forEach(id => notificationIds.remove(id));
});

describe("getNotificationPermissionState", () => {
  it("reflects granted/denied/undetermined from the OS", async () => {
    __mockNotificationState.status = "granted";
    expect(await getNotificationPermissionState()).toBe("granted");
    __mockNotificationState.status = "denied";
    expect(await getNotificationPermissionState()).toBe("denied");
  });
});

describe("scheduleTaskReminder", () => {
  const now = new Date(2026, 8, 10, 8, 0, 0); // 8am, before the 9am nudge

  it("schedules a 9am reminder for a task due in the future", async () => {
    await scheduleTaskReminder(task({ dueDate: "2026-09-12" }), now);
    expect(__mockNotificationState.scheduled.size).toBe(1);
    expect(notificationIds.getString("task-1")).toBeTruthy();
  });

  it("does nothing when notifications are disabled", async () => {
    preferences.set("notificationsEnabled", false);
    await scheduleTaskReminder(task({ dueDate: "2026-09-12" }), now);
    expect(__mockNotificationState.scheduled.size).toBe(0);
  });

  it("defaults to enabled when the preference was never set (regression: used to silently no-op)", async () => {
    // preferences.remove() already ran in beforeEach - nothing set it.
    await scheduleTaskReminder(task({ dueDate: "2026-09-12" }), now);
    expect(__mockNotificationState.scheduled.size).toBe(1);
  });

  it("does not schedule when a task has no due date", async () => {
    await scheduleTaskReminder(task({ dueDate: null }), now);
    expect(__mockNotificationState.scheduled.size).toBe(0);
  });

  it("does not schedule for a completed task", async () => {
    await scheduleTaskReminder(task({ dueDate: "2026-09-12", completed: true }), now);
    expect(__mockNotificationState.scheduled.size).toBe(0);
  });

  it("skips a genuinely overdue task rather than firing a fresh reminder", async () => {
    await scheduleTaskReminder(task({ dueDate: "2026-09-01" }), now);
    expect(__mockNotificationState.scheduled.size).toBe(0);
  });

  it("nudges soon (not silently skipped) when a task is due today but 9am already passed", async () => {
    const laterToday = new Date(2026, 8, 10, 14, 0, 0); // 2pm, past the 9am trigger
    await scheduleTaskReminder(task({ dueDate: "2026-09-10" }), laterToday);
    expect(__mockNotificationState.scheduled.size).toBe(1);
  });

  it("does not schedule outside the near-term reminder window", async () => {
    await scheduleTaskReminder(task({ dueDate: "2026-12-25" }), now); // months away
    expect(__mockNotificationState.scheduled.size).toBe(0);
  });

  it("does not schedule when permission is denied", async () => {
    __mockNotificationState.granted = false;
    __mockNotificationState.status = "denied";
    await scheduleTaskReminder(task({ dueDate: "2026-09-12" }), now);
    expect(__mockNotificationState.scheduled.size).toBe(0);
  });

  it("re-scheduling (e.g. a due-date edit) cancels the old notification first", async () => {
    await scheduleTaskReminder(task({ dueDate: "2026-09-12" }), now);
    const firstId = notificationIds.getString("task-1");
    await scheduleTaskReminder(task({ dueDate: "2026-09-13" }), now);
    const secondId = notificationIds.getString("task-1");
    expect(secondId).not.toBe(firstId);
    expect(__mockNotificationState.scheduled.has(firstId!)).toBe(false);
    expect(__mockNotificationState.scheduled.size).toBe(1);
  });
});

describe("cancelTaskReminder", () => {
  it("cancels on complete/delete: removes both the OS notification and the local mapping", async () => {
    await scheduleTaskReminder(task({ dueDate: "2026-09-12" }), new Date(2026, 8, 10));
    await cancelTaskReminder("task-1");
    expect(__mockNotificationState.scheduled.size).toBe(0);
    expect(notificationIds.getString("task-1")).toBeUndefined();
  });

  it("is a harmless no-op when there was nothing scheduled", async () => {
    await expect(cancelTaskReminder("never-scheduled")).resolves.toBeUndefined();
  });
});

describe("rescheduleAllPendingReminders", () => {
  const now = new Date(2026, 8, 10, 8, 0, 0);

  it("schedules only incomplete, near-term, not-yet-overdue tasks", async () => {
    const tasks = [
      task({ id: "a", dueDate: "2026-09-12" }), // in window
      task({ id: "b", dueDate: "2026-09-01" }), // overdue
      task({ id: "c", dueDate: "2026-09-12", completed: true }), // completed
      task({ id: "d", dueDate: null }), // no due date
      task({ id: "e", dueDate: "2026-12-25" }) // outside window
    ];
    await rescheduleAllPendingReminders(tasks, now);
    expect(__mockNotificationState.scheduled.size).toBe(1);
    expect(notificationIds.getString("a")).toBeTruthy();
  });

  it("is self-healing: re-running finds the same single reminder, not a duplicate", async () => {
    const tasks = [task({ id: "a", dueDate: "2026-09-12" })];
    await rescheduleAllPendingReminders(tasks, now);
    await rescheduleAllPendingReminders(tasks, now);
    expect(__mockNotificationState.scheduled.size).toBe(1);
  });
});
