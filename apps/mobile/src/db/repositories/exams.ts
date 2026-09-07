import { getDb, newId } from "../client";

export interface Exam {
  id: string;
  name: string;
  date: string;
}

export async function listExams(): Promise<Exam[]> {
  const db = await getDb();
  return db.getAllAsync<Exam>("SELECT * FROM exams ORDER BY date ASC");
}

export async function createExam(name: string, date: string): Promise<Exam> {
  const db = await getDb();
  const exam: Exam = { id: newId(), name, date };
  await db.runAsync("INSERT INTO exams (id, name, date) VALUES (?, ?, ?)", [exam.id, exam.name, exam.date]);
  return exam;
}

/** Skips exams that already exist with the same name+date (used by onboarding's exam-line parser). */
export async function createExamsIfNew(exams: { name: string; date: string }[]): Promise<void> {
  const db = await getDb();
  const existing = await listExams();
  for (const exam of exams) {
    const isDuplicate = existing.some(item => item.name === exam.name && item.date === exam.date);
    if (isDuplicate) continue;
    await db.runAsync("INSERT INTO exams (id, name, date) VALUES (?, ?, ?)", [newId(), exam.name, exam.date]);
  }
}

export async function deleteExam(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM exams WHERE id = ?", [id]);
}
