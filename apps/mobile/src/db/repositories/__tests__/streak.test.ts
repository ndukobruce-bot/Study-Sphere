import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as streakRepo from "../streak";

beforeEach(() => { __resetDbForTests(); });

describe("streak repository", () => {
  it("starts at 0/null before any visit", async () => {
    expect(await streakRepo.getStreak()).toEqual({ streak: 0, lastVisit: null });
  });

  it("touchStreak sets streak to 1 on first visit", async () => {
    const result = await streakRepo.touchStreak(new Date(2026, 8, 10, 9, 0, 0));
    expect(result.streak).toBe(1);
    expect(result.lastVisit).toBe("2026-09-10");
    expect(await streakRepo.getStreak()).toEqual(result);
  });

  it("increments on a consecutive-day visit and persists it", async () => {
    await streakRepo.touchStreak(new Date(2026, 8, 10, 9, 0, 0));
    const second = await streakRepo.touchStreak(new Date(2026, 8, 11, 9, 0, 0));
    expect(second.streak).toBe(2);
    expect(await streakRepo.getStreak()).toEqual(second);
  });

  it("resets to 1 after a missed day", async () => {
    await streakRepo.touchStreak(new Date(2026, 8, 10, 9, 0, 0));
    const later = await streakRepo.touchStreak(new Date(2026, 8, 15, 9, 0, 0));
    expect(later.streak).toBe(1);
  });

  it("does not write to the database again on the same day", async () => {
    const first = await streakRepo.touchStreak(new Date(2026, 8, 10, 9, 0, 0));
    const sameDayLater = await streakRepo.touchStreak(new Date(2026, 8, 10, 20, 0, 0));
    expect(sameDayLater).toEqual(first);
  });
});
