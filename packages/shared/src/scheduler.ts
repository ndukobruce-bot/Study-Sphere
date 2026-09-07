/**
 * The merged Autopilot scheduler.
 *
 * The original web app shipped two independent engines: Autopilot
 * (js/smart-tools.js buildAutopilotPlan — goal/deadline/minutes/focus
 * inputs, three-phase Understand->Practice->Recall intensity, rotating
 * focus areas) and Planner (js/planner.js buildSchedule — energy-aware
 * block/break sizing via splitBlocks). Per the v2 decision to ship one
 * scheduler, this module takes Autopilot's inputs and day-level intensity
 * model and Planner's energy-aware block distribution.
 */

import { addDays, daysBetweenInclusive, todayIso, weekdayName } from "./dates";

export type EnergyLevel = "low" | "medium" | "high";

export interface StudyPlanInput {
  goal: string;
  /** ISO date (YYYY-MM-DD) the plan should be complete by. */
  deadline: string;
  /** Minutes available to study on a study day, before energy adjustment. */
  minutes: number;
  /** Subjects/topics to rotate across days. Defaults to ["Core revision"]. */
  focus: string[];
  energy: EnergyLevel;
  /**
   * Weekday filter, e.g. ["Mon", "Wed", "Fri"] or full names. Matched by
   * case-insensitive 3-letter prefix, same as the original Autopilot.
   * Empty/omitted means every day is a study day.
   */
  availableDays?: string[];
  context?: string;
  /** Injectable for tests; defaults to the real current date. */
  today?: string;
}

export interface StudyBlock {
  minutes: number;
  task: string;
  reason: string;
}

export interface StudyDay {
  date: string;
  dayName: string;
  focusArea: string;
  intensity: "Understand" | "Practice" | "Recall";
  blocks: StudyBlock[];
}

export interface StudyPlan {
  id: number;
  goal: string;
  subject: string;
  deadline: string;
  dailyMinutes: number;
  energy: EnergyLevel;
  context: string;
  createdAt: string;
  days: StudyDay[];
}

/**
 * Ported from planner.js splitBlocks. Splits a pool of daily minutes into
 * focus blocks, with a fixed break subtracted between blocks (the break
 * itself doesn't appear in the output — it's schedule "dead time").
 */
export function splitBlocks(totalMinutes: number, energy: EnergyLevel): number[] {
  const blockLength = energy === "low" ? 25 : 45;
  const breakLength = energy === "low" ? 8 : 10;
  const blocks: number[] = [];
  let remaining = totalMinutes;

  while (remaining > 0) {
    const next = Math.min(blockLength, remaining);
    blocks.push(next);
    remaining -= next;
    if (remaining > 0) remaining = Math.max(0, remaining - breakLength);
  }

  return blocks;
}

/** Ported from planner.js's energy adjustment to a raw minutes budget. */
export function applyEnergy(minutes: number, energy: EnergyLevel): number {
  if (energy === "low") return Math.max(25, Math.round(minutes * 0.75));
  if (energy === "high") return Math.round(minutes * 1.15);
  return minutes;
}

function matchesAvailableDay(dayName: string, availableDays: string[] | undefined): boolean {
  if (!availableDays || availableDays.length === 0) return true;
  const lowerDay = dayName.toLowerCase();
  return availableDays.some(day => lowerDay.startsWith(day.toLowerCase().slice(0, 3)));
}

function intensityFor(dayIndex: number, totalDays: number): StudyDay["intensity"] {
  if (dayIndex < Math.ceil(totalDays * 0.35)) return "Understand";
  if (dayIndex < Math.ceil(totalDays * 0.72)) return "Practice";
  return "Recall";
}

export function buildStudyPlan(input: StudyPlanInput): StudyPlan {
  const today = input.today ?? todayIso();
  const totalDays = Math.max(1, daysBetweenInclusive(today, input.deadline) + 1);
  const focusAreas = input.focus.length ? input.focus : ["Core revision"];
  const dailyMinutes = applyEnergy(input.minutes, input.energy);

  const days: StudyDay[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const date = addDays(today, i);
    const dayName = weekdayName(date);
    if (!matchesAvailableDay(dayName, input.availableDays)) continue;

    const focusArea = focusAreas[i % focusAreas.length] ?? focusAreas[0] ?? "Core revision";
    const intensity = intensityFor(i, totalDays);
    const blockMinutes = splitBlocks(dailyMinutes, input.energy);

    const blocks: StudyBlock[] = blockMinutes.map((minutes, index) => {
      const isFirst = index === 0;
      const isLast = index === blockMinutes.length - 1;
      const type = isFirst ? "Preview" : isLast ? "Active recall" : intensity;
      return {
        minutes,
        task: `${type}: ${focusArea}`,
        reason: isLast
          ? "Lock it into memory with questions or flashcards."
          : "Move the topic forward in a focused block."
      };
    });

    days.push({ date, dayName, focusArea, intensity, blocks });
  }

  return {
    id: Date.now(),
    goal: input.goal || "Study goal",
    subject: focusAreas[0] ?? "General study",
    deadline: input.deadline,
    dailyMinutes,
    energy: input.energy,
    context: input.context ?? "",
    createdAt: new Date().toISOString(),
    days
  };
}
