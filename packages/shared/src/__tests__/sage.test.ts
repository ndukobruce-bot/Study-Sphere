import { describe, expect, it } from "vitest";
import { getAssistantContext, getAssistantGreeting, getAssistantReply, getNextStepAdvice } from "../sage";

describe("getAssistantContext", () => {
  it("splits tasks into open and high-priority", () => {
    const context = getAssistantContext({
      tasks: [
        { text: "A", completed: false, priority: "high" },
        { text: "B", completed: true, priority: "high" },
        { text: "C", completed: false, priority: "low" }
      ],
      exams: [],
      hasPlan: false
    });
    expect(context.openTasks).toHaveLength(2);
    expect(context.highTasks).toHaveLength(1);
    expect(context.highTasks[0]!.text).toBe("A");
  });
});

describe("getNextStepAdvice", () => {
  it("prioritizes a high-priority task above everything else", () => {
    const advice = getNextStepAdvice({
      openTasks: [{ text: "Read chapter 3", completed: false }],
      highTasks: [{ text: "Finish lab report", completed: false, priority: "high" }],
      exams: [{ name: "Physics", date: "2026-10-01" }],
      hasPlan: true,
      mood: ""
    });
    expect(advice).toContain("Finish lab report");
  });

  it("suggests Autopilot when there are tasks but no plan", () => {
    const advice = getNextStepAdvice({
      openTasks: [{ text: "Read chapter 3", completed: false }],
      highTasks: [],
      exams: [],
      hasPlan: false,
      mood: ""
    });
    expect(advice).toMatch(/Autopilot/);
  });

  it("suggests Exam Mode when exams exist and tasks have a plan", () => {
    const advice = getNextStepAdvice({
      openTasks: [],
      highTasks: [],
      exams: [{ name: "Physics", date: "2026-10-01" }],
      hasPlan: true,
      mood: ""
    });
    expect(advice).toMatch(/Exam Mode/);
  });

  it("falls back to adding a task when nothing else is going on", () => {
    const advice = getNextStepAdvice({ openTasks: [], highTasks: [], exams: [], hasPlan: false, mood: "" });
    expect(advice).toMatch(/Add one task/);
  });
});

describe("getAssistantGreeting", () => {
  it("mentions open task count when there are open tasks", () => {
    expect(getAssistantGreeting(3)).toContain("3 open tasks");
  });
  it("uses singular phrasing for exactly one open task", () => {
    expect(getAssistantGreeting(1)).toContain("1 open task");
    expect(getAssistantGreeting(1)).not.toContain("1 open tasks");
  });
  it("has a plain greeting with zero open tasks", () => {
    expect(getAssistantGreeting(0)).not.toContain("open task");
  });
});

describe("getAssistantReply", () => {
  const emptyContext = { openTasks: [], highTasks: [], exams: [], hasPlan: false, mood: "" };

  it("routes timer-related questions to the timer topic", () => {
    const reply = getAssistantReply("how do I start a pomodoro?", emptyContext);
    expect(reply.topic).toBe("timer");
  });

  it("routes exam-related questions to the exam topic", () => {
    const reply = getAssistantReply("I have a test coming up", emptyContext);
    expect(reply.topic).toBe("exam");
  });

  it("falls back to real-state advice instead of a generic message when nothing matches", () => {
    const reply = getAssistantReply("asdfghjkl", {
      openTasks: [{ text: "Read chapter 3", completed: false }],
      highTasks: [],
      exams: [],
      hasPlan: false,
      mood: ""
    });
    expect(reply.message).toMatch(/Autopilot/);
  });
});
