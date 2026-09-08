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

interface ExamSprintRow {
  exam_name: string;
  exam_date: string;
  days_left: number;
  confidence: number;
  today_blocks_json: string;
  mock_questions_json: string;
  created_at: string;
}

export async function listExamSprints(): Promise<ExamSprint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExamSprintRow>("SELECT * FROM exam_sprints ORDER BY created_at DESC");
  return rows.map(row => ({
    exam: { name: row.exam_name, date: row.exam_date },
    daysLeft: row.days_left,
    confidence: row.confidence,
    todayBlocks: JSON.parse(row.today_blocks_json),
    mockQuestions: JSON.parse(row.mock_questions_json),
    createdAt: row.created_at
  }));
}
