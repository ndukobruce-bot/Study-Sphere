import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as examsRepo from "../exams";

beforeEach(() => { __resetDbForTests(); });

describe("exams repository", () => {
  it("creates and lists exams ordered by date ascending", async () => {
    await examsRepo.createExam("Chemistry", "2026-12-01");
    await examsRepo.createExam("Physics", "2026-11-03");
    const exams = await examsRepo.listExams();
    expect(exams.map(exam => exam.name)).toEqual(["Physics", "Chemistry"]);
  });

  it("skips duplicates by name+date but adds genuinely new ones", async () => {
    await examsRepo.createExam("Physics", "2026-11-03");
    await examsRepo.createExamsIfNew([
      { name: "Physics", date: "2026-11-03" }, // duplicate, skipped
      { name: "Biology", date: "2026-11-10" } // new, added
    ]);
    const exams = await examsRepo.listExams();
    expect(exams).toHaveLength(2);
    expect(exams.map(exam => exam.name).sort()).toEqual(["Biology", "Physics"]);
  });

  it("deletes an exam by id", async () => {
    const exam = await examsRepo.createExam("Physics", "2026-11-03");
    await examsRepo.deleteExam(exam.id);
    expect(await examsRepo.listExams()).toHaveLength(0);
  });
});
