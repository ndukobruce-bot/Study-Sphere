import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as profileRepo from "../profile";

beforeEach(() => { __resetDbForTests(); });

describe("profile repository", () => {
  it("returns an empty default profile before anything is saved", async () => {
    const profile = await profileRepo.getProfile();
    expect(profile).toEqual({
      name: "",
      university: "",
      course: "",
      subjects: [],
      weakSubjects: [],
      dailyMinutes: 120,
      availableDays: [],
      semesterGoal: "",
      onboardingCompletedAt: null
    });
  });

  it("saves and reads back a full profile, including arrays", async () => {
    const profile = {
      name: "Asha",
      university: "UoN",
      course: "CS",
      subjects: ["Calculus", "Physics"],
      weakSubjects: ["Physics"],
      dailyMinutes: 90,
      availableDays: ["Mon", "Wed", "Fri"],
      semesterGoal: "Pass everything",
      onboardingCompletedAt: "2026-09-01T00:00:00.000Z"
    };
    await profileRepo.saveProfile(profile);
    expect(await profileRepo.getProfile()).toEqual(profile);
  });

  it("upserts on a second save rather than creating a second row", async () => {
    await profileRepo.saveProfile({
      name: "Asha", university: "", course: "", subjects: [], weakSubjects: [],
      dailyMinutes: 120, availableDays: [], semesterGoal: "", onboardingCompletedAt: null
    });
    await profileRepo.saveProfile({
      name: "Asha Updated", university: "", course: "", subjects: [], weakSubjects: [],
      dailyMinutes: 120, availableDays: [], semesterGoal: "", onboardingCompletedAt: null
    });
    const profile = await profileRepo.getProfile();
    expect(profile.name).toBe("Asha Updated");
  });
});
