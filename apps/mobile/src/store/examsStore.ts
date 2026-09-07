import { create } from "zustand";
import * as examsRepo from "../db/repositories/exams";
import type { Exam } from "../db/repositories/exams";

interface ExamsState {
  exams: Exam[];
  loaded: boolean;
  load: () => Promise<void>;
  addExam: (name: string, date: string) => Promise<void>;
  addExamsIfNew: (exams: { name: string; date: string }[]) => Promise<void>;
  removeExam: (id: string) => Promise<void>;
}

export const useExamsStore = create<ExamsState>((set, get) => ({
  exams: [],
  loaded: false,
  load: async () => set({ exams: await examsRepo.listExams(), loaded: true }),
  addExam: async (name, date) => {
    const exam = await examsRepo.createExam(name, date);
    set({ exams: [...get().exams, exam].sort((a, b) => a.date.localeCompare(b.date)) });
  },
  addExamsIfNew: async (exams) => {
    await examsRepo.createExamsIfNew(exams);
    set({ exams: await examsRepo.listExams() });
  },
  removeExam: async (id) => {
    await examsRepo.deleteExam(id);
    set({ exams: get().exams.filter(exam => exam.id !== id) });
  }
}));

export type { Exam };
