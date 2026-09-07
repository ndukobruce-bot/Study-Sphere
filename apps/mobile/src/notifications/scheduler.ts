import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Task } from "../db/repositories/tasks";
import { notificationIds, preferences } from "../store/mmkv";

const CHANNEL_ID = "task-deadlines";
let channelReady = false;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android" || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Task deadlines",
    importance: Notifications.AndroidImportance.DEFAULT
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function reminderDate(dueDateIso: string): Date | null {
  const [year, month, day] = dueDateIso.split("-").map(Number);
  if (!year || !month || !day) return null;
  // 9am local time on the due date - a predictable, non-intrusive nudge.
  return new Date(year, month - 1, day, 9, 0, 0);
}

export async function scheduleTaskReminder(task: Task): Promise<void> {
  await cancelTaskReminder(task.id);
  if (!preferences.getBoolean("notificationsEnabled")) return;
  if (!task.dueDate || task.completed) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const trigger = reminderDate(task.dueDate);
  if (!trigger || trigger.getTime() <= Date.now()) return;

  await ensureAndroidChannel();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: task.priority === "high" ? "High-priority task due today" : "Task due today",
      body: task.text,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {})
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger
    }
  });
  notificationIds.set(task.id, identifier);
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  const identifier = notificationIds.getString(taskId);
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  notificationIds.remove(taskId);
}
