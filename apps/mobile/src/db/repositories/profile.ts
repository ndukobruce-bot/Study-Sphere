import { getDb } from "../client";

export interface Profile {
  name: string;
  university: string;
  course: string;
  subjects: string[];
  weakSubjects: string[];
  dailyMinutes: number;
  availableDays: string[];
  semesterGoal: string;
  onboardingCompletedAt: string | null;
}

const EMPTY_PROFILE: Profile = {
  name: "",
  university: "",
  course: "",
  subjects: [],
  weakSubjects: [],
  dailyMinutes: 120,
  availableDays: [],
  semesterGoal: "",
  onboardingCompletedAt: null
};

interface ProfileRow {
  name: string;
  university: string;
  course: string;
  subjects_json: string;
  weak_subjects_json: string;
  daily_minutes: number;
  available_days_json: string;
  semester_goal: string;
  onboarding_completed_at: string | null;
}

export async function getProfile(): Promise<Profile> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProfileRow>("SELECT * FROM profile WHERE id = 1");
  if (!row) return EMPTY_PROFILE;
  return {
    name: row.name,
    university: row.university,
    course: row.course,
    subjects: JSON.parse(row.subjects_json),
    weakSubjects: JSON.parse(row.weak_subjects_json),
    dailyMinutes: row.daily_minutes,
    availableDays: JSON.parse(row.available_days_json),
    semesterGoal: row.semester_goal,
    onboardingCompletedAt: row.onboarding_completed_at
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO profile (id, name, university, course, subjects_json, weak_subjects_json, daily_minutes, available_days_json, semester_goal, onboarding_completed_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       university = excluded.university,
       course = excluded.course,
       subjects_json = excluded.subjects_json,
       weak_subjects_json = excluded.weak_subjects_json,
       daily_minutes = excluded.daily_minutes,
       available_days_json = excluded.available_days_json,
       semester_goal = excluded.semester_goal,
       onboarding_completed_at = excluded.onboarding_completed_at`,
    [
      profile.name,
      profile.university,
      profile.course,
      JSON.stringify(profile.subjects),
      JSON.stringify(profile.weakSubjects),
      profile.dailyMinutes,
      JSON.stringify(profile.availableDays),
      profile.semesterGoal,
      profile.onboardingCompletedAt
    ]
  );
}
