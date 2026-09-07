import { parseExamLines } from "@studysphere/shared";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Button, Input, Muted, Screen, Text } from "../../src/components/ui";
import { saveProfile } from "../../src/db/repositories/profile";
import { useExamsStore } from "../../src/store/examsStore";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { useTheme } from "../../src/theme/ThemeProvider";

const TOTAL_STEPS = 3;

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const setHasOnboarded = usePreferencesStore(state => state.setHasOnboarded);
  const addExamsIfNew = useExamsStore(state => state.addExamsIfNew);

  const [step, setStep] = useState(0);
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [subjects, setSubjects] = useState("");
  const [examLines, setExamLines] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState("120");
  const [semesterGoal, setSemesterGoal] = useState("");

  async function finish() {
    const subjectList = subjects.split(",").map(item => item.trim()).filter(Boolean);
    await saveProfile({
      name: "",
      university: university.trim(),
      course: course.trim(),
      subjects: subjectList,
      weakSubjects: [],
      dailyMinutes: Number(dailyMinutes) || 120,
      availableDays: [],
      semesterGoal: semesterGoal.trim(),
      onboardingCompletedAt: new Date().toISOString()
    });
    const parsedExams = parseExamLines(examLines);
    if (parsedExams.length) await addExamsIfNew(parsedExams);
    setHasOnboarded(true);
    router.replace("/(tabs)/home");
  }

  function skip() {
    setHasOnboarded(true);
    router.replace("/(tabs)/home");
  }

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Muted>Step {step + 1} of {TOTAL_STEPS}</Muted>
        <Button label="Skip for now" variant="ghost" onPress={skip} />
      </View>

      {step === 0 && (
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="display">What are you studying?</Text>
          <Input label="University" value={university} onChangeText={setUniversity} placeholder="e.g. University of Nairobi" />
          <Input label="Course" value={course} onChangeText={setCourse} placeholder="e.g. Computer Science" />
          <Input label="Subjects (comma separated)" value={subjects} onChangeText={setSubjects} placeholder="Calculus, Physics, Statistics" />
          <Button label="Next" onPress={() => setStep(1)} />
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="display">When are your exams?</Text>
          <Muted>One per line: "Linear Algebra - 2026-11-03". Skip if you don't know yet.</Muted>
          <Input
            label="Exam dates"
            value={examLines}
            onChangeText={setExamLines}
            placeholder={"Linear Algebra - 2026-11-03\nOrganic Chemistry - 2026-11-10"}
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
          <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
            <Button label="Back" variant="outline" onPress={() => setStep(0)} />
            <Button label="Next" onPress={() => setStep(2)} />
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="display">How much time do you have?</Text>
          <Input
            label="Minutes per study day"
            value={dailyMinutes}
            onChangeText={setDailyMinutes}
            keyboardType="number-pad"
          />
          <Input label="This semester's goal" value={semesterGoal} onChangeText={setSemesterGoal} placeholder="e.g. Pass every unit with a B+ or higher" />
          <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
            <Button label="Back" variant="outline" onPress={() => setStep(1)} />
            <Button label="Finish setup" onPress={finish} />
          </View>
        </View>
      )}
    </Screen>
  );
}
