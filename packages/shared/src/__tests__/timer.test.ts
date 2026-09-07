import { describe, expect, it } from "vitest";
import { advanceAfterCompletion, createTimerState, formatTime, MAX_SESSIONS, pauseTimer, startTimer, tick } from "../timer";

describe("createTimerState", () => {
  it("initializes a 25-minute study session", () => {
    const state = createTimerState("study");
    expect(state.totalSeconds).toBe(25 * 60);
    expect(state.secondsLeft).toBe(25 * 60);
    expect(state.isRunning).toBe(false);
  });
});

describe("wall-clock-synced countdown", () => {
  it("derives secondsLeft from timerEndsAt, not elapsed ticks", () => {
    const start = 1_000_000;
    let state = createTimerState("study");
    state = startTimer(state, start);

    // 10.4s of wall-clock time have passed; remaining time is computed as
    // ceil((endsAt - now) / 1000), so 1489.6s left rounds up to 1490.
    const result = tick(state, start + 10_400);
    expect(result.state.secondsLeft).toBe(1490);
  });

  it("counts down to exactly 0 and reports ended", () => {
    const start = 1_000_000;
    let state = createTimerState("study");
    state = startTimer(state, start);
    const result = tick(state, start + 25 * 60 * 1000);
    expect(result.ended).toBe(true);
    expect(result.state.secondsLeft).toBe(0);
    expect(result.state.isRunning).toBe(false);
  });

  it("does not go negative if the tick arrives late", () => {
    const start = 1_000_000;
    let state = createTimerState("study");
    state = startTimer(state, start);
    const result = tick(state, start + 999_000_000);
    expect(result.state.secondsLeft).toBe(0);
    expect(result.ended).toBe(true);
  });

  it("accumulates totalStudySec only while in study mode", () => {
    const start = 1_000_000;
    let state = createTimerState("study");
    state = startTimer(state, start);
    const afterFive = tick(state, start + 5_000).state;
    expect(afterFive.totalStudySec).toBeGreaterThanOrEqual(4);
  });

  it("pause resyncs then stops the clock", () => {
    const start = 1_000_000;
    let state = createTimerState("study");
    state = startTimer(state, start);
    const paused = pauseTimer(state, start + 5_000);
    expect(paused.isRunning).toBe(false);
    expect(paused.timerEndsAt).toBeNull();
    // A further tick call should be a no-op since isRunning is false.
    const after = tick(paused, start + 50_000);
    expect(after.state.secondsLeft).toBe(paused.secondsLeft);
  });
});

describe("advanceAfterCompletion", () => {
  it("moves from study to a short break before the 4th session", () => {
    const state = createTimerState("study");
    const result = advanceAfterCompletion(state);
    expect(result.nextMode).toBe("short");
    expect(result.state.sessionsDone).toBe(1);
  });

  it("moves to a long break and resets sessionsDone on the 4th session", () => {
    let state = createTimerState("study");
    state = { ...state, sessionsDone: MAX_SESSIONS - 1 };
    const result = advanceAfterCompletion(state);
    expect(result.nextMode).toBe("long");
    expect(result.state.sessionsDone).toBe(0);
  });

  it("returns to study after a break and counts the break", () => {
    const state = createTimerState("short");
    const result = advanceAfterCompletion(state);
    expect(result.nextMode).toBe("study");
    expect(result.state.breaksTaken).toBe(1);
  });
});

describe("formatTime", () => {
  it("pads minutes and seconds to two digits", () => {
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(600)).toBe("10:00");
  });
});
