import { todayIso } from "@studysphere/shared";
import { getDb } from "../client";

export interface PomodoroDay {
  day: string;
  sessionCount: number;
  studyMinutes: number;
}

export async function getTodayPomodoro(): Promise<PomodoroDay> {
  const db = await getDb();
  const today = todayIso();
  const row = await db.getFirstAsync<{ day: string; session_count: number; study_minutes: number }>(
    "SELECT * FROM pomodoro_days WHERE day = ?",
    [today]
  );
  return row
    ? { day: row.day, sessionCount: row.session_count, studyMinutes: row.study_minutes }
    : { day: today, sessionCount: 0, studyMinutes: 0 };
}

export async function recordCompletedSession(studyMinutes: number): Promise<void> {
  const db = await getDb();
  const today = todayIso();
  await db.runAsync(
    `INSERT INTO pomodoro_days (day, session_count, study_minutes) VALUES (?, 1, ?)
     ON CONFLICT(day) DO UPDATE SET
       session_count = session_count + 1,
       study_minutes = study_minutes + excluded.study_minutes`,
    [today, studyMinutes]
  );
}
