import type { ExamSprint } from "@studysphere/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as examSprintsRepo from "../examSprints";

beforeEach(() => { __resetDbForTests(); });

function sample(overrides: Partial<ExamSprint> = {}): ExamSprint {
  return {
    exam: { name: "Physics", date: "2026-09-20" },
    daysLeft: 10,
    confidence: 50,
    todayBlocks: [{ title: "Revise: Optics", minutes: 40 }],
    mockQuestions: ["Explain refraction."],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("examSprints repository", () => {
  it("round-trips a full sprint, including nested blocks and questions", async () => {
    const sprint = sample();
    await examSprintsRepo.saveExamSprint(sprint);
    const sprints = await examSprintsRepo.listExamSprints();
    expect(sprints).toHaveLength(1);
    expect(sprints[0]!.exam).toEqual(sprint.exam);
    expect(sprints[0]!.todayBlocks).toEqual(sprint.todayBlocks);
    expect(sprints[0]!.mockQuestions).toEqual(sprint.mockQuestions);
  });

  it("lists most-recent first", async () => {
    await examSprintsRepo.saveExamSprint(sample({ exam: { name: "First", date: "2026-09-20" } }));
    await new Promise(resolve => setTimeout(resolve, 2));
    await examSprintsRepo.saveExamSprint(sample({ exam: { name: "Second", date: "2026-09-21" } }));
    const sprints = await examSprintsRepo.listExamSprints();
    expect(sprints[0]!.exam.name).toBe("Second");
  });
});
