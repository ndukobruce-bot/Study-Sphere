import type { StreakState } from "@studysphere/shared";
import { evaluateStreak } from "@studysphere/shared";
import { getDb } from "../client";

export async function getStreak(): Promise<StreakState> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ streak: number; last_visit: string | null }>("SELECT * FROM streak WHERE id = 1");
  return { streak: row?.streak ?? 0, lastVisit: row?.last_visit ?? null };
}

async function saveStreak(state: StreakState): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO streak (id, streak, last_visit) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET streak = excluded.streak, last_visit = excluded.last_visit`,
    [state.streak, state.lastVisit]
  );
}

/** Call once per app open. Persists and returns the (possibly unchanged) streak. */
export async function touchStreak(now: Date = new Date()): Promise<StreakState> {
  const previous = await getStreak();
  const next = evaluateStreak(previous, now);
  if (next !== previous) await saveStreak(next);
  return next;
}
