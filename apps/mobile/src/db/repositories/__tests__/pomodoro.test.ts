import { todayIso } from "@studysphere/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as pomodoroRepo from "../pomodoro";

beforeEach(() => { __resetDbForTests(); });

describe("pomodoro repository", () => {
  it("starts at zero for today", async () => {
    expect(await pomodoroRepo.getTodayPomodoro()).toEqual({ day: todayIso(), sessionCount: 0, studyMinutes: 0 });
  });

  it("accumulates session count and minutes across multiple sessions", async () => {
    await pomodoroRepo.recordCompletedSession(25);
    await pomodoroRepo.recordCompletedSession(25);
    const today = await pomodoroRepo.getTodayPomodoro();
    expect(today.sessionCount).toBe(2);
    expect(today.studyMinutes).toBe(50);
  });
});
