import { buildStudyPlan } from "@studysphere/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as plansRepo from "../plans";

beforeEach(() => { __resetDbForTests(); });

function samplePlan() {
  return buildStudyPlan({
    goal: "Pass finals",
    deadline: "2026-09-12",
    minutes: 90,
    focus: ["Calculus", "Physics"],
    energy: "medium",
    today: "2026-09-10"
  });
}

describe("plans repository", () => {
  it("reports no plan when empty", async () => {
    expect(await plansRepo.hasAnyPlan()).toBe(false);
  });

  it("saves a plan and round-trips its full day/block structure", async () => {
    const plan = samplePlan();
    await plansRepo.savePlan(plan);
    const plans = await plansRepo.listPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0]!.goal).toBe("Pass finals");
    expect(plans[0]!.days).toEqual(plan.days);
    expect(await plansRepo.hasAnyPlan()).toBe(true);
  });

  it("lists most-recently-saved first", async () => {
    const first = samplePlan();
    await plansRepo.savePlan(first);
    const second = { ...samplePlan(), goal: "Second plan", id: Date.now() + 1 };
    await new Promise(resolve => setTimeout(resolve, 2));
    await plansRepo.savePlan(second);
    const plans = await plansRepo.listPlans();
    expect(plans[0]!.goal).toBe("Second plan");
  });
});
