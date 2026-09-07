/**
 * Sage: a deterministic, on-device guidance surface. Ported from app.js's
 * getAssistantReply/getAssistantContext/getNextStepAdvice keyword matcher.
 *
 * This is NOT an LLM — no network call, no provider key. Per docs/AUDIT.md,
 * the original marketed it as "AI"; the v2 decision keeps it deterministic
 * and drops the "AI" framing everywhere in copy. The one behavioral change
 * from the original: when no keyword matches, this version falls back to
 * real-state advice (getNextStepAdvice) instead of a generic canned string,
 * so Sage answers from the user's actual tasks/exams/sessions rather than
 * keyword matching alone.
 *
 * Screen list is trimmed to what mobile v1 actually ships (see
 * docs/PROGRESS.md): Planner and Autopilot are merged into one Autopilot
 * screen; Report, Games, Groups, Files, Grades, and the separate Reminders
 * page are cut from v1, so those topics/keywords are dropped rather than
 * pointing at screens that don't exist.
 */

export type SageTopic =
  | "onboarding"
  | "autopilot"
  | "tasks"
  | "timer"
  | "summarizer"
  | "exam"
  | "flashcards"
  | "settings";

const TOPIC_LABEL: Record<SageTopic, string> = {
  onboarding: "Setup",
  autopilot: "Autopilot",
  tasks: "Tasks",
  timer: "Focus Timer",
  summarizer: "Notes & Summarizer",
  exam: "Exam Mode",
  flashcards: "Flashcards",
  settings: "Settings"
};

export interface TaskLike {
  text: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
}

export interface ExamLike {
  name: string;
  date: string;
}

export interface SageDataSnapshot {
  tasks: TaskLike[];
  exams: ExamLike[];
  hasPlan: boolean;
  mood?: string;
}

export interface SageContext {
  openTasks: TaskLike[];
  highTasks: TaskLike[];
  exams: ExamLike[];
  hasPlan: boolean;
  mood: string;
}

export function getAssistantContext(data: SageDataSnapshot): SageContext {
  return {
    openTasks: data.tasks.filter(task => !task.completed),
    highTasks: data.tasks.filter(task => !task.completed && task.priority === "high"),
    exams: data.exams,
    hasPlan: data.hasPlan,
    mood: data.mood ?? ""
  };
}

export function getAssistantGreeting(openTaskCount: number): string {
  if (openTaskCount > 0) {
    return `Hi, I'm Sage. You have ${openTaskCount} open task${openTaskCount === 1 ? "" : "s"} — I can help you plan, find a screen, or start a focus session.`;
  }
  return "Hi, I'm Sage. I can guide you around StudySphere and suggest what to do next.";
}

export function getNextStepAdvice(context: SageContext): string {
  if (context.highTasks.length > 0) {
    return `Start with this high-priority task: ${context.highTasks[0]!.text}. Open Tasks, then start a focus session.`;
  }
  if (context.openTasks.length > 0 && !context.hasPlan) {
    return "You have tasks but no schedule yet. Open Autopilot, describe your goal, and generate a week so the work feels smaller.";
  }
  if (context.exams.length > 0) {
    return "You have exams saved. Open Exam Mode for a revision sprint, then Autopilot for the full week.";
  }
  if (context.openTasks.length > 0) {
    return `A good next move: ${context.openTasks[0]!.text}. Start a 25-minute focus session and work only on that.`;
  }
  return "Add one task first, then generate a plan or start a 25-minute timer. Small starts beat perfect plans.";
}

export interface SageReply {
  message: string;
  topic?: SageTopic;
}

function matches(text: string, words: string[]): boolean {
  return words.some(word => text.includes(word));
}

function topicReply(topic: SageTopic, extra: string): SageReply {
  return { message: `${extra} Open ${TOPIC_LABEL[topic]}.`, topic };
}

export function getAssistantReply(message: string, context: SageContext): SageReply {
  const text = message.toLowerCase();

  if (matches(text, ["setup", "onboard", "profile", "personalize", "course", "semester"])) {
    return topicReply("onboarding", "Start with Setup so StudySphere knows your academic situation.");
  }
  if (matches(text, ["autopilot", "schedule", "plan", "timetable", "automatic", "weekly"])) {
    return topicReply("autopilot", "Autopilot builds your week from a goal, deadline, and available time.");
  }
  if (matches(text, ["task", "assignment", "homework", "due", "priority"])) {
    return topicReply("tasks", "Tasks is where you capture work, due dates, subjects, and priority.");
  }
  if (matches(text, ["timer", "pomodoro", "focus", "study session"])) {
    return topicReply("timer", "A 25-minute focus block is a good default.");
  }
  if (matches(text, ["summarize", "summary", "summarizer", "quiz", "flashcard from notes"])) {
    return topicReply("summarizer", "Paste raw notes and get a summary, keywords, and flashcards.");
  }
  if (matches(text, ["flashcard", "flash card", "recall", "spaced"])) {
    return topicReply("flashcards", "Review what's due today, then rate it Hard or Easy to reschedule it.");
  }
  if (matches(text, ["exam", "test", "countdown", "revision"])) {
    return topicReply("exam", "Exam Mode builds a revision sprint sized to how confident you feel.");
  }
  if (matches(text, ["mood", "tired", "stress", "stressed", "energy", "burnout"])) {
    return {
      message: context.mood === "low"
        ? "Since you're low on energy: one 25-minute focus block, then an easy review task."
        : "If energy is high, put deep work in Autopilot. If it's low, one focus block is enough."
    };
  }
  if (matches(text, ["export", "backup", "delete my data", "wipe"])) {
    return topicReply("settings", "Settings has data export/import and delete-all-data.");
  }
  if (matches(text, ["next", "what should i do", "recommend", "help me", "guide"])) {
    return { message: getNextStepAdvice(context) };
  }

  return { message: getNextStepAdvice(context) };
}
