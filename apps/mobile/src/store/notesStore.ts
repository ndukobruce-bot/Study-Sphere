import { create } from "zustand";
import * as notesRepo from "../db/repositories/notes";
import type { Note } from "../db/repositories/notes";
import * as flashcardsRepo from "../db/repositories/flashcards";
import type { SummaryResult } from "@studysphere/shared";

interface NotesState {
  notes: Note[];
  loaded: boolean;
  load: () => Promise<void>;
  addNote: (input: { title: string; subject: string; body: string; source?: string }) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  saveSummaryAssets: (result: SummaryResult) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loaded: false,
  load: async () => set({ notes: await notesRepo.listNotes(), loaded: true }),
  addNote: async (input) => {
    const note = await notesRepo.createNote(input);
    set({ notes: [note, ...get().notes] });
  },
  removeNote: async (id) => {
    await notesRepo.deleteNote(id);
    set({ notes: get().notes.filter(note => note.id !== id) });
  },
  saveSummaryAssets: async (result) => {
    const note = await notesRepo.createNote({
      title: result.title,
      subject: result.subject,
      body: result.summary.join("\n"),
      source: "summarizer"
    });
    await flashcardsRepo.createFlashcards(result.flashcards.map(card => ({ subject: result.subject, ...card })));
    set({ notes: [note, ...get().notes] });
  }
}));

export type { Note };
