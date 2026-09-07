import { buildStudyPlan, daysUntil, todayIso, type EnergyLevel, type StudyPlan } from "@studysphere/shared";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, EmptyState, Input, Muted, Screen, Text } from "../../src/components/ui";
import { getProfile } from "../../src/db/repositories/profile";
import { usePlansStore } from "../../src/store/plansStore";
import { useTasksStore } from "../../src/store/tasksStore";
import { useTheme } from "../../src/theme/ThemeProvider";

const ENERGY_LEVELS: EnergyLevel[] = ["low", "medium", "high"];

export default function Autopilot() {
  const theme = useTheme();
  const { save } = usePlansStore();
  const { addTasks } = useTasksStore();

  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [minutes, setMinutes] = useState("90");
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [focus, setFocus] = useState("");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(profile => {
        if (!focus && profile.subjects.length) setFocus((profile.weakSubjects.length ? profile.weakSubjects : profile.subjects).join(", "));
        if (minutes === "90" && profile.dailyMinutes) setMinutes(String(profile.dailyMinutes));
        if (!goal && profile.semesterGoal) setGoal(profile.semesterGoal);
      });
    }, [])
  );

  function generate() {
    if (!goal.trim() || !deadline.trim()) return;
    const result = buildStudyPlan({
      goal: goal.trim(),
      deadline: deadline.trim(),
      minutes: Number(minutes) || 60,
      focus: focus.split(",").map(item => item.trim()).filter(Boolean),
      energy
    });
    setPlan(result);
    setSaved(false);
  }

  async function saveToTasks() {
    if (!plan) return;
    await save(plan);
    const today = todayIso();
    await addTasks(
      plan.days.slice(0, 10).map(day => ({
        text: `${plan.goal}: ${day.focusArea}`,
        subject: plan.subject,
        priority: daysUntil(day.date, today) < 3 ? "high" as const : "medium" as const,
        dueDate: day.date,
        source: "autopilot"
      }))
    );
    setSaved(true);
  }

  return (
    <Screen>
      <Text variant="display">Autopilot</Text>
      <Card style={{ gap: theme.spacing.md }}>
        <Input label="What are you working toward?" value={goal} onChangeText={setGoal} placeholder="Pass the midterm" />
        <Input label="By when? (YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} placeholder="2026-11-03" />
        <Input label="Minutes per study day" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
        <Input label="Focus on (comma separated)" value={focus} onChangeText={setFocus} placeholder="Calculus, Physics" />
        <View style={{ gap: theme.spacing.xs }}>
          <Muted>Energy</Muted>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {ENERGY_LEVELS.map(level => (
              <Pressable
                key={level}
                onPress={() => setEnergy(level)}
                accessibilityRole="button"
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.pill,
                  alignItems: "center",
                  backgroundColor: energy === level ? theme.colors.cyan : "transparent",
                  borderWidth: 1,
                  borderColor: theme.colors.line
                }}
              >
                <Text variant="label" color={energy === level ? theme.colors.ink : theme.colors.paper}>{level}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Button label="Generate this week" onPress={generate} />
      </Card>

      {plan && (
        <View style={{ gap: theme.spacing.md }}>
          <Card style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Muted>Study days</Muted>
              <Text variant="title">{plan.days.length}</Text>
            </View>
            <View>
              <Muted>Daily minutes</Muted>
              <Text variant="title">{plan.dailyMinutes}</Text>
            </View>
          </Card>
          {plan.days.map(day => (
            <Card key={day.date}>
              <Text variant="title">{day.dayName}</Text>
              <Muted>{day.date} · {day.focusArea} · {day.intensity}</Muted>
              {day.blocks.map((block, index) => (
                <Text key={index} variant="body">{block.minutes} min · {block.task}</Text>
              ))}
            </Card>
          ))}
          <Button label={saved ? "Saved to Tasks" : "Save to Tasks"} onPress={saveToTasks} disabled={saved} />
        </View>
      )}

      {!plan && <EmptyState text="Set a goal and a deadline, then generate your week." />}
    </Screen>
  );
}
