import { todayIso } from "@studysphere/shared";
import { getDb } from "../client";

export type Mood = "low" | "okay" | "great";

export async function getTodayMood(): Promise<Mood | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ mood: string }>("SELECT mood FROM daily_mood WHERE day = ?", [todayIso()]);
  return (row?.mood as Mood) ?? null;
}

export async function setTodayMood(mood: Mood): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO daily_mood (day, mood) VALUES (?, ?)
     ON CONFLICT(day) DO UPDATE SET mood = excluded.mood`,
    [todayIso(), mood]
  );
}
