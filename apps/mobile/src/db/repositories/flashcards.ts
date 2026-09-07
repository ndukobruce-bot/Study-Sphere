import type { FlashcardRating } from "@studysphere/shared";
import { nextFlashcardDue, todayIso } from "@studysphere/shared";
import { getDb, newId } from "../client";

export interface FlashcardRow {
  id: string;
  subject: string;
  question: string;
  answer: string;
  dueDate: string;
}

export async function listFlashcards(): Promise<FlashcardRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; subject: string; question: string; answer: string; due_date: string }>(
    "SELECT * FROM flashcards ORDER BY due_date ASC"
  );
  return rows.map(row => ({ id: row.id, subject: row.subject, question: row.question, answer: row.answer, dueDate: row.due_date }));
}

export async function createFlashcard(input: { subject: string; question: string; answer: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO flashcards (id, subject, question, answer, due_date) VALUES (?, ?, ?, ?, ?)",
    [newId(), input.subject, input.question, input.answer, todayIso()]
  );
}

export async function createFlashcards(cards: { subject: string; question: string; answer: string }[]): Promise<void> {
  for (const card of cards) await createFlashcard(card);
}

export async function rateFlashcard(id: string, rating: FlashcardRating): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE flashcards SET due_date = ? WHERE id = ?", [nextFlashcardDue(rating), id]);
}

export async function deleteFlashcard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM flashcards WHERE id = ?", [id]);
}
