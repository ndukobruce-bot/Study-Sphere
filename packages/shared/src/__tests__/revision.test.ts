import { describe, expect, it } from "vitest";
import { buildExamSprint, buildRevisionQueue, isFlashcardDue, nextFlashcardDue } from "../revision";

describe("nextFlashcardDue", () => {
  it("schedules Hard for +1 day", () => {
    expect(nextFlashcardDue("hard", "2026-09-10")).toBe("2026-09-11");
  });
  it("schedules Easy for +4 days", () => {
    expect(nextFlashcardDue("easy", "2026-09-10")).toBe("2026-09-14");
  });
});

describe("isFlashcardDue", () => {
  it("is due when there's no due date yet", () => {
    expect(isFlashcardDue(undefined, "2026-09-10")).toBe(true);
  });
  it("is due when the due date has passed or is today", () => {
    expect(isFlashcardDue("2026-09-09", "2026-09-10")).toBe(true);
    expect(isFlashcardDue("2026-09-10", "2026-09-10")).toBe(true);
  });
  it("is not due when scheduled in the future", () => {
    expect(isFlashcardDue("2026-09-11", "2026-09-10")).toBe(false);
  });
});

describe("buildExamSprint", () => {
  it("assigns 4 daily blocks when confidence is low", () => {
    const sprint = buildExamSprint({
      exam: { name: "Physics", date: "2026-09-20" },
      topics: ["Kinematics", "Optics"],
      weakAreas: [],
      confidence: 20,
      today: "2026-09-10"
    });
    expect(sprint.todayBlocks).toHaveLength(4);
    expect(sprint.daysLeft).toBe(10);
  });

  it("assigns 2 daily blocks when confidence is high", () => {
    const sprint = buildExamSprint({
      exam: { name: "Physics", date: "2026-09-20" },
      topics: ["Kinematics"],
      weakAreas: [],
      confidence: 90,
      today: "2026-09-10"
    });
    expect(sprint.todayBlocks).toHaveLength(2);
  });

  it("marks the last block as active recall at 25 minutes, others at 40", () => {
    const sprint = buildExamSprint({
      exam: { name: "Physics", date: "2026-09-20" },
      topics: ["A", "B", "C"],
      weakAreas: [],
      confidence: 30,
      today: "2026-09-10"
    });
    const last = sprint.todayBlocks.at(-1)!;
    expect(last.title).toMatch(/^Active recall:/);
    expect(last.minutes).toBe(25);
    expect(sprint.todayBlocks[0]!.minutes).toBe(40);
  });

  it("defaults topics/weak areas when none are given", () => {
    const sprint = buildExamSprint({
      exam: { name: "Physics", date: "2026-09-20" },
      topics: [],
      weakAreas: [],
      confidence: 50,
      today: "2026-09-10"
    });
    expect(sprint.mockQuestions.length).toBeGreaterThan(0);
  });

  it("floors daysLeft at 0 for a past exam date", () => {
    const sprint = buildExamSprint({
      exam: { name: "Physics", date: "2026-09-01" },
      topics: ["A"],
      weakAreas: [],
      confidence: 50,
      today: "2026-09-10"
    });
    expect(sprint.daysLeft).toBe(0);
  });
});

describe("buildRevisionQueue", () => {
  it("takes the last 4 completed tasks, most recent first, +3 day review", () => {
    const tasks = [
      { text: "A", completed: true, createdAt: "2026-09-01T00:00:00" },
      { text: "B", completed: false, createdAt: "2026-09-02T00:00:00" },
      { text: "C", completed: true, createdAt: "2026-09-03T00:00:00" },
      { text: "D", completed: true, createdAt: "2026-09-04T00:00:00" }
    ];
    const queue = buildRevisionQueue(tasks);
    expect(queue.map(item => item.text)).toEqual(["D", "C", "A"]);
    expect(queue[0]!.reviewDate).toBe("2026-09-07");
  });

  it("returns an empty queue when nothing is completed", () => {
    expect(buildRevisionQueue([{ text: "A", completed: false }])).toEqual([]);
  });
});
