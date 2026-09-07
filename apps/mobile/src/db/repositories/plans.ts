import type { StudyPlan } from "@studysphere/shared";
import { getDb, newId } from "../client";

interface PlanRow {
  id: string;
  goal: string;
  subject: string;
  deadline: string;
  daily_minutes: number;
  energy: string;
  context: string;
  created_at: string;
  days_json: string;
}

function fromRow(row: PlanRow): StudyPlan {
  return {
    id: Number(row.id),
    goal: row.goal,
    subject: row.subject,
    deadline: row.deadline,
    dailyMinutes: row.daily_minutes,
    energy: row.energy as StudyPlan["energy"],
    context: row.context,
    createdAt: row.created_at,
    days: JSON.parse(row.days_json)
  };
}

export async function listPlans(): Promise<StudyPlan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlanRow>("SELECT * FROM plans ORDER BY created_at DESC");
  return rows.map(fromRow);
}

export async function savePlan(plan: StudyPlan): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO plans (id, goal, subject, deadline, daily_minutes, energy, context, created_at, days_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      String(plan.id || newId()),
      plan.goal,
      plan.subject,
      plan.deadline,
      plan.dailyMinutes,
      plan.energy,
      plan.context,
      plan.createdAt,
      JSON.stringify(plan.days)
    ]
  );
}

export async function hasAnyPlan(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM plans");
  return (row?.count ?? 0) > 0;
}
