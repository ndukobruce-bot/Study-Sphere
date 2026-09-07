import type { ExamSprint } from "@studysphere/shared";
import { getDb, newId } from "../client";

export async function saveExamSprint(sprint: ExamSprint): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO exam_sprints (id, exam_name, exam_date, days_left, confidence, today_blocks_json, mock_questions_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      newId(),
      sprint.exam.name,
      sprint.exam.date,
      sprint.daysLeft,
      sprint.confidence,
      JSON.stringify(sprint.todayBlocks),
      JSON.stringify(sprint.mockQuestions),
      sprint.createdAt
    ]
  );
}
