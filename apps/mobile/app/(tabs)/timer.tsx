import {
  advanceAfterCompletion,
  createTimerState,
  formatTime,
  pauseTimer,
  startTimer,
  tick,
  TIMER_MODES,
  type TimerMode,
  type TimerState
} from "@studysphere/shared";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { Button, Card, Muted, Screen, Text } from "../../src/components/ui";
import { recordCompletedSession } from "../../src/db/repositories/pomodoro";
import { notificationsFacade } from "../../src/notifications/platform";
import { useTheme } from "../../src/theme/ThemeProvider";

const MODES: TimerMode[] = ["study", "short", "long"];
let sessionNotificationId: string | null = null;

async function scheduleSessionEndNotice(mode: TimerMode, secondsLeft: number) {
  if (sessionNotificationId) {
    await notificationsFacade.cancelScheduledNotificationAsync(sessionNotificationId);
    sessionNotificationId = null;
  }
  const granted = await notificationsFacade.getPermissionsAsync();
  if (!granted.granted) return;
  sessionNotificationId = await notificationsFacade.scheduleNotificationAsync({
    content: {
      title: mode === "study" ? "Focus session complete" : "Break over",
      body: mode === "study" ? "Time for a break." : "Ready for another session?"
    },
    trigger: { type: "timeInterval", seconds: Math.max(1, secondsLeft) }
  });
}

async function cancelSessionEndNotice() {
  if (!sessionNotificationId) return;
  await notificationsFacade.cancelScheduledNotificationAsync(sessionNotificationId);
  sessionNotificationId = null;
}

export default function Timer() {
  const theme = useTheme();
  const [state, setState] = useState<TimerState>(() => createTimerState("study"));
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (!current.isRunning) return;
      const result = tick(current);
      if (result.ended) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (current.mode === "study") recordCompletedSession(TIMER_MODES.study.minutes);
        const completion = advanceAfterCompletion(result.state);
        setState(completion.state);
      } else {
        setState(result.state);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Re-derive from the wall clock the moment the app comes back to the
    // foreground - the countdown is correct even if JS was suspended.
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (nextAppState !== "active") return;
      const current = stateRef.current;
      if (!current.isRunning) return;
      const result = tick(current);
      setState(result.state);
    });
    return () => subscription.remove();
  }, []);

  function handleStart() {
    const next = startTimer(state);
    setState(next);
    scheduleSessionEndNotice(next.mode, next.secondsLeft);
  }

  function handlePause() {
    setState(pauseTimer(state));
    cancelSessionEndNotice();
  }

  function switchTo(mode: TimerMode) {
    cancelSessionEndNotice();
    setState(createTimerState(mode));
  }

  const modeConfig = TIMER_MODES[state.mode];
  const progress = state.secondsLeft / state.totalSeconds;
  const ringColor = state.mode === "study" ? theme.colors.cyan : state.mode === "short" ? "#22c55e" : "#7c5cfc";

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.xl, alignItems: "center", justifyContent: "center" }}>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          {MODES.map(mode => (
            <Pressable
              key={mode}
              onPress={() => switchTo(mode)}
              accessibilityRole="button"
              accessibilityLabel={TIMER_MODES[mode].label}
              style={{
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.pill,
                backgroundColor: state.mode === mode ? theme.colors.slate : "transparent",
                borderWidth: 1,
                borderColor: theme.colors.line
              }}
            >
              <Text variant="label">{TIMER_MODES[mode].label}</Text>
            </Pressable>
          ))}
        </View>

        <View
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            borderWidth: 8,
            borderColor: theme.colors.line,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: 110,
              borderWidth: 8,
              borderColor: ringColor,
              opacity: Math.max(0.15, progress)
            }}
          />
          <Text variant="display">{formatTime(state.secondsLeft)}</Text>
          <Muted>Session {state.sessionsDone + 1}</Muted>
        </View>

        <Card style={{ width: "100%" }}>
          <Muted>{modeConfig.tip}</Muted>
        </Card>

        <Button label={state.isRunning ? "Pause" : "Start"} onPress={state.isRunning ? handlePause : handleStart} />

        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          {[0, 1, 2, 3].map(index => (
            <View
              key={index}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: index < state.sessionsDone ? theme.colors.cyan : theme.colors.line
              }}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}
