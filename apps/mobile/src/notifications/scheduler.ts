import { daysUntil, todayIso } from "@studysphere/shared";
import { Platform } from "react-native";
import type { Task } from "../db/repositories/tasks";
import { notificationIds, preferences } from "../store/mmkv";
import { AndroidImportance, notificationsFacade } from "./platform";

const CHANNEL_ID = "task-deadlines";
let channelReady = false;

/**
 * usePreferencesStore defaults notificationsEnabled to true in memory
 * (`preferences.getBoolean(...) ?? true`) without ever persisting that
 * default to storage. Reading the raw MMKV value directly here (as this
 * file used to) meant every fresh install returned `undefined` ->
 * falsy -> reminders silently never scheduled until a user happened to
 * open Settings and toggle the switch off-then-on. Mirror the store's
 * default instead of reading the raw value.
 */
function notificationsEnabledPreference(): boolean {
  return preferences.getBoolean("notificationsEnabled") ?? true;
}

/**
 * Android does not guarantee scheduled local notifications survive a
 * device reboot unless the app registers a BOOT_COMPLETED receiver and
 * reschedules everything itself. Building that receiver needs a custom
 * config plugin with native Android code (a BroadcastReceiver class) —
 * bigger scope than stock Expo config plugins cover, so it is NOT
 * implemented here (see docs/PROGRESS.md). The mitigation instead: only
 * ever schedule reminders within a near-term window, and unconditionally
 * re-schedule everything in that window every time the app opens
 * (rescheduleAllPendingReminders, called from app/_layout.tsx). This is
 * self-healing after a reboot as long as the user opens the app before
 * the due date — it does not help if the device reboots and the app is
 * never reopened before the reminder should have fired.
 */
const REMINDER_WINDOW_DAYS = 30;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android" || channelReady) return;
  await notificationsFacade.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Task deadlines",
    importance: AndroidImportance.DEFAULT
  });
  channelReady = true;
}

export type NotificationPermissionState = "granted" | "denied" | "undetermined";

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const current = await notificationsFacade.getPermissionsAsync();
  return current.status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await notificationsFacade.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await notificationsFacade.requestPermissionsAsync();
  return requested.granted;
}

function reminderDate(dueDateIso: string): Date | null {
  const [year, month, day] = dueDateIso.split("-").map(Number);
  if (!year || !month || !day) return null;
  // 9am local time (device timezone, via the Date constructor's local
  // fields - not UTC) on the due date: a predictable, non-intrusive nudge.
  return new Date(year, month - 1, day, 9, 0, 0);
}

/**
 * If the 9am nudge for a task due TODAY has already passed (task created
 * or edited later in the day), still notify soon rather than silently
 * skipping - the user asked for a reminder on a day-of deadline, and
 * "it's already past 9am" shouldn't mean "no reminder at all". A task
 * due on a PAST date (genuinely overdue) does not get a fresh reminder -
 * that's what the Home/Tasks overdue badge is for.
 */
function resolveTrigger(dueDateIso: string, now: Date): Date | null {
  const nineAm = reminderDate(dueDateIso);
  if (!nineAm) return null;
  if (nineAm.getTime() > now.getTime()) return nineAm;
  const diff = daysUntil(dueDateIso, todayIso(now));
  if (diff < 0) return null; // genuinely overdue - no fresh reminder
  if (diff === 0) return new Date(now.getTime() + 60_000); // due today, 9am already passed - nudge in a minute
  return nineAm; // future date landed on/before "now" only if clocks are odd; treat as-is
}

export async function scheduleTaskReminder(task: Task, now: Date = new Date()): Promise<void> {
  await cancelTaskReminder(task.id);
  if (!notificationsEnabledPreference()) return;
  if (!task.dueDate || task.completed) return;
  if (daysUntil(task.dueDate, todayIso(now)) > REMINDER_WINDOW_DAYS) return; // outside the near-term window - top-up will pick it up later

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const trigger = resolveTrigger(task.dueDate, now);
  if (!trigger) return;

  await ensureAndroidChannel();
  const identifier = await notificationsFacade.scheduleNotificationAsync({
    content: {
      title: task.priority === "high" ? "High-priority task due today" : "Task due today",
      body: task.text,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {})
    },
    trigger: { type: "date", date: trigger }
  });
  if (identifier) notificationIds.set(task.id, identifier);
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  const identifier = notificationIds.getString(taskId);
  if (!identifier) return;
  await notificationsFacade.cancelScheduledNotificationAsync(identifier);
  notificationIds.remove(taskId);
}

/**
 * Call once per app open. Re-schedules a reminder for every incomplete,
 * not-yet-overdue task due within REMINDER_WINDOW_DAYS. Cheap idempotent
 * self-healing for: notifications lost to a reboot, tasks that have newly
 * entered the reminder window since the app was last opened, and a
 * previous run that was interrupted mid-schedule.
 */
export async function rescheduleAllPendingReminders(tasks: Task[], now: Date = new Date()): Promise<void> {
  if (!notificationsEnabledPreference()) return;
  const today = todayIso(now);
  const upcoming = tasks.filter(task => {
    if (task.completed || !task.dueDate) return false;
    const diff = daysUntil(task.dueDate, today);
    return diff >= 0 && diff <= REMINDER_WINDOW_DAYS;
  });
  for (const task of upcoming) {
    await scheduleTaskReminder(task, now);
  }
}
