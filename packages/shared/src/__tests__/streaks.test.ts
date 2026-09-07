import { describe, expect, it } from "vitest";
import { buildAchievements, evaluateStreak } from "../streaks";

describe("evaluateStreak", () => {
  it("starts at 1 on first ever visit", () => {
    const result = evaluateStreak({ streak: 0, lastVisit: null }, new Date("2026-09-10T09:00:00"));
    expect(result).toEqual({ streak: 1, lastVisit: "2026-09-10" });
  });

  it("increments when the last visit was yesterday", () => {
    const result = evaluateStreak({ streak: 3, lastVisit: "2026-09-09" }, new Date("2026-09-10T09:00:00"));
    expect(result).toEqual({ streak: 4, lastVisit: "2026-09-10" });
  });

  it("resets to 1 after missing a day", () => {
    const result = evaluateStreak({ streak: 5, lastVisit: "2026-09-05" }, new Date("2026-09-10T09:00:00"));
    expect(result).toEqual({ streak: 1, lastVisit: "2026-09-10" });
  });

  it("is a no-op when already visited today", () => {
    const previous = { streak: 3, lastVisit: "2026-09-10" };
    expect(evaluateStreak(previous, new Date("2026-09-10T18:00:00"))).toEqual(previous);
  });
});

describe("buildAchievements", () => {
  it("unlocks badges based on thresholds", () => {
    const achievements = buildAchievements({ totalTasks: 1, completedTasks: 5, todayPomodoros: 1, streak: 3 });
    expect(achievements.every(badge => badge.unlocked)).toBe(true);
  });

  it("keeps badges locked below thresholds", () => {
    const achievements = buildAchievements({ totalTasks: 0, completedTasks: 0, todayPomodoros: 0, streak: 0 });
    expect(achievements.every(badge => !badge.unlocked)).toBe(true);
  });
});
