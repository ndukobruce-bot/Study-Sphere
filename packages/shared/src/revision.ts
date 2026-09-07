/**
 * Spacing and revision-sprint math. Three ported behaviors:
 *  - flashcard spacing (features.js markFlash: Hard = +1 day, Easy = +4 days)
 *  - exam-mode confidence -> daily block count (smart-tools.js buildExamSprint)
 *  - the dashboard's "review completed work again in 3 days" queue
 *    (dashboard.js renderRevision)
 */

import { addDays, daysUntil, toIsoDate, todayIso } from "./dates";

export type FlashcardRating = "hard" | "easy";

/** Ported from features.js markFlash: Hard +1 day, Easy +4 days. */
export function nextFlashcardDue(rating: FlashcardRating, today: string = todayIso()): string {
  return addDays(today, rating === "hard" ? 1 : 4);
}

export function isFlashcardDue(dueIso: string | undefined | null, today: string = todayIso()): boolean {
  return !dueIso || dueIso <= today;
}

export interface ExamSprintInput {
  exam: { name: string; date: string };
  topics: string[];
  weakAreas: string[];
  /** 0-100 self-reported confidence. Lower confidence -> more daily blocks. */
  confidence: number;
  today?: string;
}

export interface ExamSprintBlock {
  title: string;
  minutes: number;
}

export interface ExamSprint {
  exam: { name: string; date: string };
  daysLeft: number;
  confidence: number;
  todayBlocks: ExamSprintBlock[];
  mockQuestions: string[];
  createdAt: string;
}

export function buildExamSprint(input: ExamSprintInput): ExamSprint {
  const today = input.today ?? todayIso();
  const daysLeft = Math.max(0, daysUntil(input.exam.date, today));
  const topics = input.topics.length ? input.topics : ["Core concepts", "Past papers", "Weak areas"];
  const weak = input.weakAreas.length ? input.weakAreas : topics.slice(0, 2);
  const dailyLoad = input.confidence < 45 ? 4 : input.confidence < 75 ? 3 : 2;

  const todayBlocks: ExamSprintBlock[] = [];
  for (let i = 0; i < dailyLoad; i += 1) {
    const topic = i < weak.length ? weak[i]! : topics[i % topics.length]!;
    const isLast = i === dailyLoad - 1;
    todayBlocks.push({
      title: isLast ? `Active recall: ${topic}` : `Revise: ${topic}`,
      minutes: isLast ? 25 : 40
    });
  }

  const mockQuestions = topics
    .slice(0, 6)
    .map(topic => `Explain ${topic}, then solve one exam-style question without notes.`);

  return {
    exam: input.exam,
    daysLeft,
    confidence: input.confidence,
    todayBlocks,
    mockQuestions,
    createdAt: new Date().toISOString()
  };
}

export interface CompletedTaskLike {
  text: string;
  completed: boolean;
  createdAt?: string;
}

export interface RevisionQueueItem {
  text: string;
  reviewDate: string;
}

/**
 * Ported from dashboard.js renderRevision: the last 4 completed tasks,
 * most recent first, each scheduled for a follow-up review 3 days after
 * it was created (not completed — this matches the original's calc).
 */
export function buildRevisionQueue(tasks: CompletedTaskLike[], now: Date = new Date()): RevisionQueueItem[] {
  return tasks
    .filter(task => task.completed)
    .slice(-4)
    .reverse()
    .map(task => {
      const created = task.createdAt ? new Date(task.createdAt) : now;
      const reviewDate = new Date(created.getTime() + 3 * 86400000);
      return { text: task.text, reviewDate: toIsoDate(reviewDate) };
    });
}
