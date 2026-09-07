import { buildExamSprint, type ExamSprint } from "@studysphere/shared";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, EmptyState, Input, Muted, Screen, Text } from "../../src/components/ui";
import { saveExamSprint } from "../../src/db/repositories/examSprints";
import { useExamsStore } from "../../src/store/examsStore";
import { useTasksStore } from "../../src/store/tasksStore";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function ExamMode() {
  const theme = useTheme();
  const { exams, load } = useExamsStore();
  const { addTasks } = useTasksStore();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [topics, setTopics] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [confidence, setConfidence] = useState(50);
  const [sprint, setSprint] = useState<ExamSprint | null>(null);
  const [saved, setSaved] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  function generate() {
    const selected = exams.find(exam => exam.id === selectedExamId);
    const exam = selected ?? { name: manualName.trim() || "Upcoming exam", date: manualDate.trim() };
    if (!exam.date) return;
    const result = buildExamSprint({
      exam,
      topics: topics.split(",").map(item => item.trim()).filter(Boolean),
      weakAreas: weakAreas.split(",").map(item => item.trim()).filter(Boolean),
      confidence
    });
    setSprint(result);
    setSaved(false);
  }

  async function save() {
    if (!sprint) return;
    await saveExamSprint(sprint);
    await addTasks(
      sprint.todayBlocks.map(block => ({
        text: `${sprint.exam.name}: ${block.title}`,
        subject: sprint.exam.name,
        priority: "high" as const,
        dueDate: new Date().toISOString().slice(0, 10),
        source: "exam-mode"
      }))
    );
    setSaved(true);
  }

  return (
    <Screen>
      <Text variant="display">Exam Mode</Text>

      {exams.length > 0 && (
        <Card style={{ gap: theme.spacing.sm }}>
          <Muted>Pick a saved exam</Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {exams.map(exam => (
              <Pressable
                key={exam.id}
                onPress={() => setSelectedExamId(exam.id === selectedExamId ? null : exam.id)}
                style={{
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.pill,
                  backgroundColor: selectedExamId === exam.id ? theme.colors.cyan : "transparent",
                  borderWidth: 1,
                  borderColor: theme.colors.line
                }}
              >
                <Text variant="label" color={selectedExamId === exam.id ? theme.colors.ink : theme.colors.paper}>
                  {exam.name} · {exam.date}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {!selectedExamId && (
        <Card style={{ gap: theme.spacing.md }}>
          <Input label="Exam name" value={manualName} onChangeText={setManualName} placeholder="Physics" />
          <Input label="Exam date (YYYY-MM-DD)" value={manualDate} onChangeText={setManualDate} placeholder="2026-10-20" />
        </Card>
      )}

      <Card style={{ gap: theme.spacing.md }}>
        <Input label="Topics (comma separated)" value={topics} onChangeText={setTopics} placeholder="Kinematics, Optics" />
        <Input label="Weak areas (comma separated)" value={weakAreas} onChangeText={setWeakAreas} placeholder="Optics" />
        <View style={{ gap: theme.spacing.xs }}>
          <Muted>Confidence today: {confidence}%</Muted>
          <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
            {[20, 40, 55, 70, 85].map(value => (
              <Pressable
                key={value}
                onPress={() => setConfidence(value)}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.pill,
                  alignItems: "center",
                  backgroundColor: confidence === value ? theme.colors.cyan : "transparent",
                  borderWidth: 1,
                  borderColor: theme.colors.line
                }}
              >
                <Text variant="label" color={confidence === value ? theme.colors.ink : theme.colors.paper}>{value}%</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Button label="Build today's sprint" onPress={generate} />
      </Card>

      {sprint ? (
        <View style={{ gap: theme.spacing.md }}>
          <Card style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Muted>{sprint.exam.name}</Muted>
              <Text variant="title" color={theme.colors.cyan}>{sprint.daysLeft} days left</Text>
            </View>
          </Card>
          <Card>
            <Text variant="title">Today's sprint</Text>
            {sprint.todayBlocks.map((block, index) => (
              <Text key={index}>{block.minutes} min · {block.title}</Text>
            ))}
          </Card>
          <Card>
            <Text variant="title">Mock questions</Text>
            {sprint.mockQuestions.map((question, index) => <Text key={index}>• {question}</Text>)}
          </Card>
          <Button label={saved ? "Saved to Tasks" : "Save to Tasks"} onPress={save} disabled={saved} />
        </View>
      ) : (
        <EmptyState text="Pick or add an exam, then build today's sprint." />
      )}
    </Screen>
  );
}
