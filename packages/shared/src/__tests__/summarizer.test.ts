import { describe, expect, it } from "vitest";
import { summarizeText } from "../summarizer";

const SAMPLE = `
Mitochondria are the powerhouse of the cell because mitochondria generate ATP through respiration.
Respiration inside mitochondria converts glucose and oxygen into usable energy for the cell.
The cell membrane controls what enters and leaves the cell, protecting internal structures.
Ribosomes inside the cell translate messenger RNA into functional proteins for the organism.
`;

describe("summarizeText", () => {
  it("extracts keywords excluding stop words", () => {
    const result = summarizeText("Cell Biology", "Biology", SAMPLE);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.keywords).not.toContain("this");
    expect(result.keywords).not.toContain("study");
  });

  it("only includes sentences longer than 24 characters", () => {
    const result = summarizeText("Title", "Subject", "Short. " + SAMPLE);
    expect(result.summary.every(sentence => sentence.length > 24)).toBe(true);
  });

  it("produces a flashcard and quiz question per top keyword", () => {
    const result = summarizeText("Title", "Biology", SAMPLE);
    expect(result.flashcards.length).toBeGreaterThan(0);
    expect(result.flashcards[0]).toHaveProperty("question");
    expect(result.flashcards[0]).toHaveProperty("answer");
    expect(result.quiz.length).toBeGreaterThan(0);
  });

  it("handles empty text without throwing", () => {
    const result = summarizeText("Empty", "Subject", "");
    expect(result.summary).toEqual([]);
    expect(result.keywords).toEqual([]);
    expect(result.flashcards).toEqual([]);
  });
});
