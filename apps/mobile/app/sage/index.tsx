import { getAssistantContext, getAssistantGreeting, getAssistantReply, type SageReply } from "@studysphere/shared";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Button, Card, Input, Muted, Screen, Text } from "../../src/components/ui";
import { useExamsStore } from "../../src/store/examsStore";
import { usePlansStore } from "../../src/store/plansStore";
import { useTasksStore } from "../../src/store/tasksStore";
import { useTheme } from "../../src/theme/ThemeProvider";

const TOPIC_ROUTES: Record<string, string> = {
  onboarding: "/onboarding",
  autopilot: "/(tabs)/autopilot",
  tasks: "/(tabs)/tasks",
  timer: "/(tabs)/timer",
  summarizer: "/notes",
  exam: "/exam-mode",
  flashcards: "/flashcards",
  settings: "/settings"
};

interface Message {
  role: "sage" | "user";
  text: string;
  topic?: string;
}

export default function Sage() {
  const theme = useTheme();
  const router = useRouter();
  const { tasks, load: loadTasks } = useTasksStore();
  const { exams, load: loadExams } = useExamsStore();
  const { plans, load: loadPlans } = usePlansStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
      loadExams();
      loadPlans();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (messages.length === 0) {
        const openTasks = tasks.filter(task => !task.completed).length;
        setMessages([{ role: "sage", text: getAssistantGreeting(openTasks) }]);
      }
    }, [tasks.length])
  );

  function ask() {
    if (!input.trim()) return;
    const context = getAssistantContext({
      tasks: tasks.map(t => ({ text: t.text, completed: t.completed, priority: t.priority })),
      exams,
      hasPlan: plans.length > 0
    });
    const reply: SageReply = getAssistantReply(input, context);
    setMessages(prev => [...prev, { role: "user", text: input }, { role: "sage", text: reply.message, topic: reply.topic }]);
    setInput("");
  }

  return (
    <Screen>
      <Muted>Sage is a deterministic, on-device guide - not an AI model. It only ever reads what's already on your phone.</Muted>
      <View style={{ gap: theme.spacing.md }}>
        {messages.map((message, index) => (
          <Card key={index} style={message.role === "user" ? { backgroundColor: theme.colors.ink } : undefined}>
            <Muted>{message.role === "sage" ? "Sage" : "You"}</Muted>
            <Text>{message.text}</Text>
            {message.topic && TOPIC_ROUTES[message.topic] && (
              <Button
                label={`Open ${message.topic}`}
                variant="outline"
                onPress={() => router.push(TOPIC_ROUTES[message.topic!] as never)}
              />
            )}
          </Card>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input value={input} onChangeText={setInput} placeholder="Ask Sage what to do next" onSubmitEditing={ask} />
        </View>
        <Button label="Send" onPress={ask} />
      </View>
    </Screen>
  );
}
