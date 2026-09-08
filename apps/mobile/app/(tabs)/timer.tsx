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
import { preferences } from "../../src/store/mmkv";
import { useTheme } from "../../src/theme/ThemeProvider";
import { MIN_TOUCH_TARGET } from "../../src/theme/tokens";

const MODES: TimerMode[] = ["study", "short", "long"];
const TIMER_STATE_KEY = "timerState";
let sessionNotificationId: string | null = null;

/**
 * Persisting the running timer's state (not just deriving remaining time
 * from the wall clock) matters because "wall-clock-derived" only helps if
 * the app's JS process is still alive when the user returns — a brief
 * backgrounding (switching apps, screen off) usually survives, but Android
 * can and does kill the whole process under memory pressure or aggressive
 * per-OEM battery optimization during a full 25-minute session. Without
 * this, reopening after a process kill would silently reset to a fresh
 * "Study Time 25:00" with the in-progress session gone, not just less
 * accurate — the worse failure mode. This does NOT require a foreground
 * service: timerEndsAt is a fixed timestamp, so restoring it and calling
 * tick() once is enough to resync correctly, including catching up on a
 * session that finished entirely while the process was dead.
 *
 * What this still does NOT solve: a true persistent notification showing
 * a live countdown while backgrounded needs a real Android foreground
 * service, which needs a custom native module/config plugin beyond stock
 * Expo — not implemented here (see docs/PLAY_CHECKLIST.md). The session-end
 * local notification (below) is the mitigation for "did I miss the end of
 * my session," which is the failure mode that actually drives uninstalls;
 * a missing live progress notification is a polish gap, not a data-loss one.
 */
function saveTimerState(state: TimerState): void {
  preferences.set(TIMER_STATE_KEY, JSON.stringify(state));
}

function loadTimerState(): TimerState | null {
  const raw = preferences.getString(TIMER_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerState;
  } catch {
    return null;
  }
}

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

interface RestoredState {
  state: TimerState;
  /** True when a session was running before the app closed and has now
   * fully elapsed - the caller still needs to run advanceAfterCompletion
   * (mode switch, session/break counters), which isn't done here to keep
   * this a pure "what does storage say" read. */
  needsCompletionCatchUp: boolean;
}

function restoreInitialState(): RestoredState {
  const persisted = loadTimerState();
  if (!persisted) return { state: createTimerState("study"), needsCompletionCatchUp: false };
  if (!persisted.isRunning) return { state: persisted, needsCompletionCatchUp: false };

  // Was running when the app last closed - resync from the wall clock.
  // If the session actually finished while we were gone (including the
  // whole process having been killed), tick() reports it ended right away.
  const result = tick(persisted, Date.now());
  return { state: result.state, needsCompletionCatchUp: result.ended };
}

export default function Timer() {
  const theme = useTheme();
  const restored = useRef(restoreInitialState()).current;
  const [state, setState] = useState<TimerState>(restored.state);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Catch up on a session that fully completed while the process was dead:
  // advance the mode/counters the same way the live tick loop would have.
  useEffect(() => {
    if (!restored.needsCompletionCatchUp) return;
    if (restored.state.mode === "study") recordCompletedSession(TIMER_MODES.study.minutes);
    const completion = advanceAfterCompletion(restored.state);
    setState(completion.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveTimerState(state);
  }, [state]);

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
              accessibilityState={{ selected: state.mode === mode }}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                justifyContent: "center",
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
