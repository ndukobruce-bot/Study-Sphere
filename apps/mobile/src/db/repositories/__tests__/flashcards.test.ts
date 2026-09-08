import { todayIso } from "@studysphere/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as flashcardsRepo from "../flashcards";

beforeEach(() => { __resetDbForTests(); });

describe("flashcards repository", () => {
  it("creates a card due today", async () => {
    await flashcardsRepo.createFlashcard({ subject: "Biology", question: "What is a cell?", answer: "The basic unit of life." });
    const cards = await flashcardsRepo.listFlashcards();
    expect(cards).toHaveLength(1);
    expect(cards[0]!.dueDate).toBe(todayIso());
  });

  it("creates several cards at once", async () => {
    await flashcardsRepo.createFlashcards([
      { subject: "Biology", question: "Q1", answer: "A1" },
      { subject: "Biology", question: "Q2", answer: "A2" }
    ]);
    expect(await flashcardsRepo.listFlashcards()).toHaveLength(2);
  });

  it("rating Hard pushes the due date out by 1 day, Easy by 4 days", async () => {
    await flashcardsRepo.createFlashcard({ subject: "Math", question: "2+2", answer: "4" });
    const [card] = await flashcardsRepo.listFlashcards();
    const today = todayIso();

    await flashcardsRepo.rateFlashcard(card!.id, "hard");
    let updated = (await flashcardsRepo.listFlashcards())[0]!;
    expect(updated.dueDate > today).toBe(true);

    await flashcardsRepo.rateFlashcard(card!.id, "easy");
    updated = (await flashcardsRepo.listFlashcards())[0]!;
    expect(updated.dueDate > today).toBe(true);
  });

  it("deletes a card", async () => {
    await flashcardsRepo.createFlashcard({ subject: "Math", question: "2+2", answer: "4" });
    const [card] = await flashcardsRepo.listFlashcards();
    await flashcardsRepo.deleteFlashcard(card!.id);
    expect(await flashcardsRepo.listFlashcards()).toHaveLength(0);
  });

  it("orders by due date ascending", async () => {
    await flashcardsRepo.createFlashcard({ subject: "A", question: "Q", answer: "A" });
    const [card] = await flashcardsRepo.listFlashcards();
    await flashcardsRepo.rateFlashcard(card!.id, "easy"); // pushes it further out
    await flashcardsRepo.createFlashcard({ subject: "B", question: "Q2", answer: "A2" }); // due today, earlier
    const cards = await flashcardsRepo.listFlashcards();
    expect(cards[0]!.subject).toBe("B");
  });
});
