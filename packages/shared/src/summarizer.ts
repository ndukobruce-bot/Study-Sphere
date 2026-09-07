/**
 * Ported from smart-tools.js summarizeText. This is a local TF/sentence-
 * scoring heuristic, not an LLM call — see docs/AUDIT.md. Kept deterministic
 * and on-device per the v2 decision; do not describe this as "AI" in copy.
 */

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "have", "will", "into", "about", "between",
  "because", "when", "where", "which", "their", "there", "these", "those",
  "study", "notes"
]);

export interface Flashcard {
  question: string;
  answer: string;
}

export interface SummaryResult {
  title: string;
  subject: string;
  summary: string[];
  keywords: string[];
  checklist: string[];
  flashcards: Flashcard[];
  quiz: string[];
  createdAt: string;
}

export function summarizeText(title: string, subject: string, text: string): SummaryResult {
  const sentences = (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 24);

  const words = text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  const counts: Record<string, number> = {};
  words.forEach(word => {
    if (!STOP_WORDS.has(word)) counts[word] = (counts[word] ?? 0) + 1;
  });

  const keywords = Object.keys(counts)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, 8);

  const ranked = sentences
    .map(sentence => ({
      sentence,
      score: keywords.reduce((sum, key) => sum + (sentence.toLowerCase().includes(key) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  const summary = ranked.slice(0, 4).map(item => item.sentence);
  const checklist = keywords.slice(0, 5).map(key => `Explain ${key} without looking at the notes.`);
  const flashcards: Flashcard[] = keywords.slice(0, 6).map(key => ({
    question: `What is the role of ${key} in ${subject}?`,
    answer: `Review your note and explain ${key} using one example.`
  }));
  const quiz = keywords.slice(0, 5).map(key => `How would you apply ${key} in an exam question?`);

  return {
    title,
    subject,
    summary,
    keywords,
    checklist,
    flashcards,
    quiz,
    createdAt: new Date().toISOString()
  };
}
