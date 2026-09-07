import { getDb, newId } from "../client";

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  text: string;
  subject: string;
  priority: Priority;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  source: string | null;
}

interface TaskRow {
  id: string;
  text: string;
  subject: string;
  priority: string;
  due_date: string | null;
  completed: number;
  created_at: string;
  source: string | null;
}

function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    text: row.text,
    subject: row.subject,
    priority: row.priority as Priority,
    dueDate: row.due_date,
    completed: row.completed === 1,
    createdAt: row.created_at,
    source: row.source
  };
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>("SELECT * FROM tasks ORDER BY created_at DESC");
  return rows.map(fromRow);
}

export interface NewTaskInput {
  text: string;
  subject?: string;
  priority?: Priority;
  dueDate?: string | null;
  source?: string | null;
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const db = await getDb();
  const task: Task = {
    id: newId(),
    text: input.text,
    subject: input.subject?.trim() || "General",
    priority: input.priority ?? "medium",
    dueDate: input.dueDate ?? null,
    completed: false,
    createdAt: new Date().toISOString(),
    source: input.source ?? null
  };
  await db.runAsync(
    "INSERT INTO tasks (id, text, subject, priority, due_date, completed, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [task.id, task.text, task.subject, task.priority, task.dueDate, task.completed ? 1 : 0, task.createdAt, task.source]
  );
  return task;
}

export async function createTasks(inputs: NewTaskInput[]): Promise<Task[]> {
  const created: Task[] = [];
  for (const input of inputs) {
    created.push(await createTask(input));
  }
  return created;
}

export async function toggleTask(id: string, completed: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE tasks SET completed = ? WHERE id = ?", [completed ? 1 : 0, id]);
}

export async function updateTask(id: string, patch: Partial<NewTaskInput>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (patch.text !== undefined) { fields.push("text = ?"); values.push(patch.text); }
  if (patch.subject !== undefined) { fields.push("subject = ?"); values.push(patch.subject); }
  if (patch.priority !== undefined) { fields.push("priority = ?"); values.push(patch.priority); }
  if (patch.dueDate !== undefined) { fields.push("due_date = ?"); values.push(patch.dueDate); }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
}

export async function clearCompletedTasks(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM tasks WHERE completed = 1");
}
