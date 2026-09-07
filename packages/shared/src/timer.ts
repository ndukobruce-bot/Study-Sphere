/**
 * Wall-clock-synced Pomodoro state machine, ported from timer.js.
 *
 * The original's key property — worth keeping exactly, per docs/AUDIT.md —
 * is that it never trusts setInterval's cadence for the countdown itself.
 * Elapsed time is always recomputed from `timerEndsAt - Date.now()`, so the
 * timer stays correct across app backgrounding, OS timer throttling, or a
 * slow tick loop. `tick()` is meant to be called frequently (the original
 * used a 250ms interval); each call just resyncs from the wall clock.
 */

export type TimerMode = "study" | "short" | "long";

export interface ModeConfig {
  label: string;
  minutes: number;
  tip: string;
}

export const TIMER_MODES: Record<TimerMode, ModeConfig> = {
  study: { label: "Study Time", minutes: 25, tip: "Close distracting tabs and put your phone face down." },
  short: { label: "Short Break", minutes: 5, tip: "Stretch, grab some water, rest your eyes." },
  long: { label: "Long Break", minutes: 15, tip: "Great work. Take a proper break and walk around." }
};

export const MAX_SESSIONS = 4;

export interface TimerState {
  mode: TimerMode;
  totalSeconds: number;
  secondsLeft: number;
  /** Epoch ms the current countdown ends at, or null when not running. */
  timerEndsAt: number | null;
  isRunning: boolean;
  sessionsDone: number;
  breaksTaken: number;
  totalStudySec: number;
}

export function createTimerState(mode: TimerMode = "study"): TimerState {
  const totalSeconds = TIMER_MODES[mode].minutes * 60;
  return {
    mode,
    totalSeconds,
    secondsLeft: totalSeconds,
    timerEndsAt: null,
    isRunning: false,
    sessionsDone: 0,
    breaksTaken: 0,
    totalStudySec: 0
  };
}

export function startTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (state.isRunning) return state;
  return { ...state, isRunning: true, timerEndsAt: now + state.secondsLeft * 1000 };
}

/**
 * Resync secondsLeft from the wall clock. Call this on every UI tick and
 * whenever pausing. Returns `ended: true` once when secondsLeft reaches 0 —
 * the caller should then call `advanceAfterCompletion`.
 */
export function tick(state: TimerState, now: number = Date.now()): { state: TimerState; ended: boolean } {
  if (!state.isRunning || state.timerEndsAt === null) return { state, ended: false };

  const nextSeconds = Math.max(0, Math.ceil((state.timerEndsAt - now) / 1000));
  if (nextSeconds === state.secondsLeft) return { state, ended: false };

  const studiedDelta = state.mode === "study" && nextSeconds < state.secondsLeft
    ? state.secondsLeft - nextSeconds
    : 0;

  const next: TimerState = {
    ...state,
    secondsLeft: nextSeconds,
    totalStudySec: state.totalStudySec + studiedDelta
  };

  if (nextSeconds <= 0) {
    return { state: { ...next, isRunning: false, timerEndsAt: null }, ended: true };
  }
  return { state: next, ended: false };
}

export function pauseTimer(state: TimerState, now: number = Date.now()): TimerState {
  const { state: synced } = tick(state, now);
  return { ...synced, isRunning: false, timerEndsAt: null };
}

export function resetTimer(state: TimerState): TimerState {
  return createTimerState(state.mode);
}

export function switchMode(state: TimerState, mode: TimerMode): TimerState {
  const base = createTimerState(mode);
  return { ...base, sessionsDone: state.sessionsDone, breaksTaken: state.breaksTaken, totalStudySec: state.totalStudySec };
}

export interface SessionCompletion {
  state: TimerState;
  nextMode: TimerMode;
  message: string;
}

/**
 * Ported from timer.js onTimerEnd + the switchMode call that followed it.
 * Call this once when `tick()` reports `ended: true`.
 */
export function advanceAfterCompletion(state: TimerState): SessionCompletion {
  if (state.mode === "study") {
    const sessionsDone = state.sessionsDone + 1;
    if (sessionsDone >= MAX_SESSIONS) {
      const reset = switchMode({ ...state, sessionsDone: 0 }, "long");
      return { state: reset, nextMode: "long", message: "Excellent. You completed 4 focus sessions. Time for a long break." };
    }
    const withSession = switchMode({ ...state, sessionsDone }, "short");
    return { state: withSession, nextMode: "short", message: "Session complete. Time for a short break." };
  }

  const breaksTaken = state.breaksTaken + 1;
  const next = switchMode({ ...state, breaksTaken }, "study");
  return { state: next, nextMode: "study", message: "Break over. Ready for another session?" };
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
