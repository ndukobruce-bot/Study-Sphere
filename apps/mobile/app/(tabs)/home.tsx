import { dueBucket, getAssistantContext, getNextStepAdvice, todayIso } from "@studysphere/shared";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Card, Muted, Screen, Text, UrgencyDot } from "../../src/components/ui";
import { getStreak } from "../../src/db/repositories/streak";
import { getTodayPomodoro } from "../../src/db/repositories/pomodoro";
import { useExamsStore } from "../../src/store/examsStore";
import { usePlansStore } from "../../src/store/plansStore";
import { useTasksStore } from "../../src/store/tasksStore";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const { tasks, load: loadTasks } = useTasksStore();
  const { exams, load: loadExams } = useExamsStore();
  const { plans, load: loadPlans } = usePlansStore();
  const [streak, setStreak] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
      loadExams();
      loadPlans();
      getStreak().then(state => setStreak(state.streak));
      getTodayPomodoro().then(day => setTodayPomodoros(day.sessionCount));
    }, [])
  );

  const today = todayIso();
  const dueSoon = tasks
    .filter(task => !task.completed && task.dueDate)
    .filter(task => ["overdue", "today", "tomorrow"].includes(dueBucket(task.dueDate, today)))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 4);

  const context = getAssistantContext({
    tasks: tasks.map(t => ({ text: t.text, completed: t.completed, priority: t.priority })),
    exams,
    hasPlan: plans.length > 0
  });
  const advice = getNextStepAdvice(context);

  return (
    <Screen>
      <Text variant="display">Hi again</Text>

      <Card style={{ alignItems: "flex-start" }}>
        <Muted>Study streak</Muted>
        <Text variant="display" color={theme.colors.cyan}>
          {streak} {streak === 1 ? "day" : "days"}
        </Text>
        <Muted>{todayPomodoros} focus session{todayPomodoros === 1 ? "" : "s"} today</Muted>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="title">Coming up</Text>
        {dueSoon.length === 0 ? (
          <Card><Muted>Nothing due in the next couple of days. Add a task to see it here.</Muted></Card>
        ) : (
          dueSoon.map(task => (
            <Card key={task.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text>{task.text}</Text>
                <Muted>{task.subject}</Muted>
              </View>
              <UrgencyDot bucket={dueBucket(task.dueDate, today)} />
            </Card>
          ))
        )}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="title">Sage</Text>
        <Card>
          <Text>{advice}</Text>
        </Card>
      </View>
    </Screen>
  );
}
