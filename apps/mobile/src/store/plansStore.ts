import type { StudyPlan } from "@studysphere/shared";
import { create } from "zustand";
import * as plansRepo from "../db/repositories/plans";

interface PlansState {
  plans: StudyPlan[];
  loaded: boolean;
  load: () => Promise<void>;
  save: (plan: StudyPlan) => Promise<void>;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  loaded: false,
  load: async () => set({ plans: await plansRepo.listPlans(), loaded: true }),
  save: async (plan) => {
    await plansRepo.savePlan(plan);
    set({ plans: [plan, ...get().plans] });
  }
}));
