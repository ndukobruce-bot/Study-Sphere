import { dueBucket, formatDueLabel, todayIso } from "@studysphere/shared";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Button, Card, Divider, EmptyState, Input, Muted, Screen, Text, UrgencyDot } from "../../src/components/ui";
import type { Priority, Task } from "../../src/db/repositories/tasks";
import { useTasksStore } from "../../src/store/tasksStore";
import { useTheme } from "../../src/theme/ThemeProvider";
import { MIN_TOUCH_TARGET } from "../../src/theme/tokens";

type Filter = "all" | "pending" | "completed";

function SwipeAction({ label, background }: { label: string; background: string }) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: background, justifyContent: "center", paddingHorizontal: theme.spacing.lg }}>
      <Text color={theme.colors.onAccent} style={{ fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const theme = useTheme();
  const swipeRef = useRef<Swipeable>(null);

  function handleComplete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onToggle();
    swipeRef.current?.close();
  }

  function handleDelete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    onDelete();
  }

  return (
    <Swipeable
      ref={swipeRef}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <Pressable onPress={handleComplete} accessibilityRole="button" accessibilityLabel={`Mark ${task.text} as complete`}>
          <SwipeAction label={task.completed ? "Reopen" : "Complete"} background={theme.colors.cyan} />
        </Pressable>
      )}
      renderRightActions={() => (
        <Pressable onPress={handleDelete} accessibilityRole="button" accessibilityLabel={`Delete ${task.text}`}>
          <SwipeAction label="Delete" background={theme.colors.overdue} />
        </Pressable>
      )}
    >
      <View style={{ flexDirection: "row", alignItems: "center", padding: theme.spacing.md, gap: theme.spacing.md, backgroundColor: theme.colors.slate }}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          accessibilityLabel={`Mark ${task.text} as ${task.completed ? "not complete" : "complete"}`}
          style={{
            width: 24, height: 24, borderRadius: 6, borderWidth: 2,
            borderColor: task.completed ? theme.colors.cyan : theme.colors.line,
            backgroundColor: task.completed ? theme.colors.cyan : "transparent",
            alignItems: "center", justifyContent: "center"
          }}
        >
          {task.completed ? <Text color={theme.colors.onAccent}>✓</Text> : null}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={task.completed ? { textDecorationLine: "line-through", color: theme.colors.mist } : undefined}>
            {task.text}
          </Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Muted>{task.subject}</Muted>
            {task.dueDate ? <UrgencyDot bucket={dueBucket(task.dueDate, todayIso())} /> : null}
          </View>
          {task.dueDate ? <Muted>{formatDueLabel(task.dueDate)}</Muted> : null}
        </View>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.text}`}
          hitSlop={8}
        >
          <Text color={theme.colors.mist}>✕</Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}

export default function Tasks() {
  const theme = useTheme();
  const { tasks, load, addTask, toggleTask, removeTask, clearCompleted } = useTasksStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [showForm, setShowForm] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const visible = tasks
    .filter(task => (filter === "pending" ? !task.completed : filter === "completed" ? task.completed : true))
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  async function submit() {
    if (!text.trim()) return;
    await addTask({ text: text.trim(), subject: subject.trim() || "General", dueDate: dueDate.trim() || null, priority });
    setText("");
    setSubject("");
    setDueDate("");
    setPriority("medium");
    setShowForm(false);
  }

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="display">Tasks</Text>
        <Button label={showForm ? "Cancel" : "Add task"} variant={showForm ? "outline" : "primary"} onPress={() => setShowForm(!showForm)} />
      </View>

      {showForm && (
        <Card style={{ gap: theme.spacing.md }}>
          <Input placeholder="What do you need to do?" value={text} onChangeText={setText} />
          <Input placeholder="Subject (optional)" value={subject} onChangeText={setSubject} />
          <Input placeholder="Due date (YYYY-MM-DD, optional)" value={dueDate} onChangeText={setDueDate} />
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {(["low", "medium", "high"] as Priority[]).map(level => (
              <Pressable
                key={level}
                onPress={() => setPriority(level)}
                accessibilityRole="button"
                accessibilityLabel={`Priority ${level}`}
                accessibilityState={{ selected: priority === level }}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  justifyContent: "center",
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.pill,
                  backgroundColor: priority === level ? theme.colors.cyan : "transparent",
                  borderWidth: 1,
                  borderColor: theme.colors.line
                }}
              >
                <Text variant="label" color={priority === level ? theme.colors.onAccent : theme.colors.paper}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Save task" onPress={submit} />
        </Card>
      )}

      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        {(["all", "pending", "completed"] as Filter[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setFilter(tab)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${tab} tasks`}
            accessibilityState={{ selected: filter === tab }}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              justifyContent: "center",
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: filter === tab ? theme.colors.slate : "transparent",
              borderWidth: 1,
              borderColor: theme.colors.line
            }}
          >
            <Text variant="label">{tab}</Text>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <EmptyState text="No tasks here. Add one above to see it in your list." />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {visible.map((task, index) => (
            <View key={task.id}>
              {index > 0 && <Divider />}
              <TaskRow task={task} onToggle={() => toggleTask(task.id)} onDelete={() => removeTask(task.id)} />
            </View>
          ))}
        </Card>
      )}

      {tasks.some(task => task.completed) && (
        <Button label="Clear completed" variant="ghost" onPress={clearCompleted} />
      )}
    </Screen>
  );
}
