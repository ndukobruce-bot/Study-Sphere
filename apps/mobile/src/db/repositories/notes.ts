import { getDb, newId } from "../client";

export interface Note {
  id: string;
  title: string;
  subject: string;
  body: string;
  createdAt: string;
  source: string | null;
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string; title: string; subject: string; body: string; created_at: string; source: string | null;
  }>("SELECT * FROM notes ORDER BY created_at DESC");
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,
    source: row.source
  }));
}

export async function createNote(input: { title: string; subject: string; body: string; source?: string }): Promise<Note> {
  const db = await getDb();
  const note: Note = {
    id: newId(),
    title: input.title,
    subject: input.subject,
    body: input.body,
    createdAt: new Date().toISOString(),
    source: input.source ?? null
  };
  await db.runAsync(
    "INSERT INTO notes (id, title, subject, body, created_at, source) VALUES (?, ?, ?, ?, ?, ?)",
    [note.id, note.title, note.subject, note.body, note.createdAt, note.source]
  );
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM notes WHERE id = ?", [id]);
}
