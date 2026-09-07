/**
 * Date math shared by the scheduler, revision, and task-urgency UI.
 * Everything here is pure and takes "today" as an explicit argument so it's
 * trivially testable and never depends on the caller's timezone quirks.
 */

export type DueBucket = "overdue" | "today" | "tomorrow" | "this-week" | "later" | "none";

function atMidnight(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Formats a Date as YYYY-MM-DD using LOCAL calendar fields, not UTC.
 * Deliberately not `date.toISOString().slice(0, 10)` — that converts to UTC
 * first, which can silently roll the date across midnight for users near a
 * UTC day boundary (the original web app had this exact latent bug via
 * smart-tools.js's toIso). A study app's "today" must match the device's
 * local calendar day.
 */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/**
 * Signed day difference (dateIso - todayIso), rounded. Negative means overdue.
 * Ported from dashboard.js getDaysUntil / tasks.js formatDueLabel's diff calc.
 */
export function daysUntil(dateIso: string, today: string = todayIso()): number {
  if (!dateIso) return Number.POSITIVE_INFINITY;
  const due = atMidnight(parseIsoDate(dateIso));
  const start = atMidnight(parseIsoDate(today));
  return Math.round((due.getTime() - start.getTime()) / 86400000);
}

/**
 * Inclusive day count between two ISO dates, clamped to a minimum of 0.
 * Ported from smart-tools.js daysBetween — used to size a plan's total days.
 */
export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = atMidnight(parseIsoDate(startIso));
  const end = atMidnight(parseIsoDate(endIso));
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
}

export function dueBucket(dateIso: string | undefined | null, today: string = todayIso()): DueBucket {
  if (!dateIso) return "none";
  const diff = daysUntil(dateIso, today);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "this-week";
  return "later";
}

/** Human label matching the original tasks.js copy exactly. */
export function formatDueLabel(dateIso: string | undefined | null, today: string = todayIso()): string {
  if (!dateIso) return "";
  const diff = daysUntil(dateIso, today);
  if (diff < 0) return "overdue";
  if (diff === 0) return "due today";
  if (diff === 1) return "due tomorrow";
  return `due in ${diff} days`;
}

export interface ParsedExamLine {
  name: string;
  date: string;
}

/**
 * Ported from smart-tools.js parseExamLines. Accepts lines like
 * "Linear Algebra - 2026-11-03" or "Linear Algebra on 2026-11-03".
 */
export function parseExamLines(text: string): ParsedExamLine[] {
  return String(text || "")
    .split("\n")
    .map((line): ParsedExamLine | null => {
      const match = line.match(/^(.+?)(?:\s+-\s+|\s+on\s+)(\d{4}-\d{2}-\d{2})$/i);
      if (!match) return null;
      const name = match[1]?.trim();
      const date = match[2];
      if (!name || !date) return null;
      return { name, date };
    })
    .filter((line): line is ParsedExamLine => line !== null);
}

/** Adds `days` calendar days to an ISO date and returns the new ISO date. */
export function addDays(dateIso: string, days: number): string {
  const date = parseIsoDate(dateIso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function weekdayName(dateIso: string): string {
  return parseIsoDate(dateIso).toLocaleDateString("en-US", { weekday: "long" });
}
