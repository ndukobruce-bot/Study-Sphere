import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as moodRepo from "../mood";

beforeEach(() => { __resetDbForTests(); });

describe("mood repository", () => {
  it("returns null before any mood is set today", async () => {
    expect(await moodRepo.getTodayMood()).toBeNull();
  });

  it("sets and reads back today's mood", async () => {
    await moodRepo.setTodayMood("great");
    expect(await moodRepo.getTodayMood()).toBe("great");
  });

  it("overwrites rather than duplicating on a second set the same day", async () => {
    await moodRepo.setTodayMood("low");
    await moodRepo.setTodayMood("okay");
    expect(await moodRepo.getTodayMood()).toBe("okay");
  });
});
