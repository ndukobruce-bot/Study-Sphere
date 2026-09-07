/**
 * Streak and achievement rules, ported from app.js updateStreak and
 * dashboard.js renderAchievements.
 *
 * The original also had an "Arcade Mind" badge tied to the games page.
 * Games are cut from mobile v1 (see docs/AUDIT.md, docs/PROGRESS.md), so
 * that badge is dropped here rather than ported to a feature that won't
 * exist.
 */

export interface StreakState {
  streak: number;
  /** ISO date (YYYY-MM-DD) of the last day the streak was evaluated. */
  lastVisit: string | null;
}

function isoDate(date: Date): string {
  // Local calendar date, not UTC — see dates.ts's toIsoDate comment.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isYesterday(lastVisitIso: string, todayIso: string): boolean {
  const yesterday = new Date(`${todayIso}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  return lastVisitIso === isoDate(yesterday);
}

/**
 * Call once per app open. Pure function: pass in the persisted state, get
 * back the (possibly unchanged) new state for the caller to persist.
 * Ported 1:1 from app.js updateStreak's three cases: visited yesterday
 * (increment), first ever visit (start at 1), missed a day (reset to 1).
 */
export function evaluateStreak(previous: StreakState, now: Date = new Date()): StreakState {
  const today = isoDate(now);
  if (previous.lastVisit === today) return previous;

  const streak = !previous.lastVisit
    ? 1
    : isYesterday(previous.lastVisit, today)
      ? previous.streak + 1
      : 1;

  return { streak, lastVisit: today };
}

export interface AchievementInput {
  totalTasks: number;
  completedTasks: number;
  todayPomodoros: number;
  streak: number;
}

export interface Achievement {
  name: string;
  detail: string;
  unlocked: boolean;
}

export function buildAchievements(input: AchievementInput): Achievement[] {
  return [
    { name: "First Steps", detail: "Add your first task", unlocked: input.totalTasks > 0 },
    { name: "Focus Starter", detail: "Finish a Pomodoro", unlocked: input.todayPomodoros > 0 },
    { name: "Task Finisher", detail: "Complete 5 tasks", unlocked: input.completedTasks >= 5 },
    { name: "Streak Builder", detail: "Reach a 3-day streak", unlocked: input.streak >= 3 }
  ];
}
