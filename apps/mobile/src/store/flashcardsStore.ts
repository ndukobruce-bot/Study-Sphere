import type { FlashcardRating } from "@studysphere/shared";
import { isFlashcardDue } from "@studysphere/shared";
import { create } from "zustand";
import * as flashcardsRepo from "../db/repositories/flashcards";
import type { FlashcardRow } from "../db/repositories/flashcards";

interface FlashcardsState {
  cards: FlashcardRow[];
  loaded: boolean;
  load: () => Promise<void>;
  addCard: (input: { subject: string; question: string; answer: string }) => Promise<void>;
  rateCard: (id: string, rating: FlashcardRating) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
}

export const useFlashcardsStore = create<FlashcardsState>((set, get) => ({
  cards: [],
  loaded: false,
  load: async () => set({ cards: await flashcardsRepo.listFlashcards(), loaded: true }),
  addCard: async (input) => {
    await flashcardsRepo.createFlashcard(input);
    set({ cards: await flashcardsRepo.listFlashcards() });
  },
  rateCard: async (id, rating) => {
    await flashcardsRepo.rateFlashcard(id, rating);
    set({ cards: await flashcardsRepo.listFlashcards() });
  },
  removeCard: async (id) => {
    await flashcardsRepo.deleteFlashcard(id);
    set({ cards: get().cards.filter(card => card.id !== id) });
  }
}));

export function nextDueCard(cards: FlashcardRow[]): FlashcardRow | undefined {
  return cards.find(card => isFlashcardDue(card.dueDate));
}
