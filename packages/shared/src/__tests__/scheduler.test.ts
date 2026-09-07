import { describe, expect, it } from "vitest";
import { applyEnergy, buildStudyPlan, splitBlocks } from "../scheduler";

describe("applyEnergy", () => {
  it("reduces minutes for low energy, floored at 25", () => {
    expect(applyEnergy(100, "low")).toBe(75);
    expect(applyEnergy(20, "low")).toBe(25);
  });
  it("boosts minutes for high energy", () => {
    expect(applyEnergy(100, "high")).toBe(115);
  });
  it("leaves minutes unchanged for medium energy", () => {
    expect(applyEnergy(100, "medium")).toBe(100);
  });
});

describe("splitBlocks", () => {
  it("splits medium/high-energy minutes into 45-minute blocks, subtracting a 10-minute break between them", () => {
    // 100 -> take 45 (55 left) -> minus 10 break = 45 left -> take 45 (0 left) -> stop
    expect(splitBlocks(100, "medium")).toEqual([45, 45]);
  });
  it("splits low-energy minutes into 25-minute blocks, subtracting an 8-minute break between them", () => {
    // 60 -> take 25 (35 left) -> minus 8 break = 27 left -> take 25 (2 left) -> minus 8 break = 0 -> stop
    expect(splitBlocks(60, "low")).toEqual([25, 25]);
  });
  it("returns an empty array for zero minutes", () => {
    expect(splitBlocks(0, "medium")).toEqual([]);
  });
  it("returns one short block when minutes are less than a full block", () => {
    expect(splitBlocks(15, "medium")).toEqual([15]);
  });
});

describe("buildStudyPlan", () => {
  it("builds a plan spanning today through the deadline inclusive", () => {
    const plan = buildStudyPlan({
      goal: "Pass the midterm",
      deadline: "2026-09-14",
      minutes: 90,
      focus: ["Calculus"],
      energy: "medium",
      today: "2026-09-10"
    });

    expect(plan.days).toHaveLength(5);
    expect(plan.days[0]!.date).toBe("2026-09-10");
    expect(plan.days.at(-1)!.date).toBe("2026-09-14");
    expect(plan.dailyMinutes).toBe(90);
    expect(plan.subject).toBe("Calculus");
  });

  it("rotates multiple focus areas across days", () => {
    const plan = buildStudyPlan({
      goal: "Finals",
      deadline: "2026-09-13",
      minutes: 60,
      focus: ["Physics", "Chemistry"],
      energy: "medium",
      today: "2026-09-10"
    });
    expect(plan.days.map(day => day.focusArea)).toEqual(["Physics", "Chemistry", "Physics", "Chemistry"]);
  });

  it("defaults to Core revision when no focus areas are given", () => {
    const plan = buildStudyPlan({
      goal: "Study",
      deadline: "2026-09-10",
      minutes: 60,
      focus: [],
      energy: "medium",
      today: "2026-09-10"
    });
    expect(plan.days[0]!.focusArea).toBe("Core revision");
  });

  it("filters days by availableDays (3-letter prefix match)", () => {
    // 2026-09-10 is a Thursday
    const plan = buildStudyPlan({
      goal: "Study",
      deadline: "2026-09-16",
      minutes: 60,
      focus: ["Math"],
      energy: "medium",
      availableDays: ["Mon", "Wed", "Fri"],
      today: "2026-09-10"
    });
    const weekdays = plan.days.map(day => day.dayName);
    expect(weekdays).toEqual(["Friday", "Monday", "Wednesday"]);
  });

  it("marks the first block Preview and the last Active recall", () => {
    const plan = buildStudyPlan({
      goal: "Study",
      deadline: "2026-09-10",
      minutes: 100,
      focus: ["Math"],
      energy: "medium",
      today: "2026-09-10"
    });
    const blocks = plan.days[0]!.blocks;
    expect(blocks[0]!.task).toMatch(/^Preview:/);
    expect(blocks.at(-1)!.task).toMatch(/^Active recall:/);
  });

  it("assigns Understand/Practice/Recall intensity across thirds of a longer plan", () => {
    const plan = buildStudyPlan({
      goal: "Study",
      deadline: "2026-09-19",
      minutes: 60,
      focus: ["Math"],
      energy: "medium",
      today: "2026-09-10"
    });
    expect(plan.days[0]!.intensity).toBe("Understand");
    expect(plan.days.at(-1)!.intensity).toBe("Recall");
  });
});
