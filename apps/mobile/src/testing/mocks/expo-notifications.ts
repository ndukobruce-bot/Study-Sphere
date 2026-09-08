/**
 * Vitest alias target for the bare "expo-notifications" specifier.
 * Tests can import `__mockNotificationState` to control permission
 * responses and inspect what was scheduled/canceled.
 */

export const SchedulableTriggerInputTypes = {
  DATE: "date",
  TIME_INTERVAL: "timeInterval"
} as const;

interface ScheduledEntry {
  identifier: string;
  content: unknown;
  trigger: unknown;
}

export const __mockNotificationState = {
  granted: true,
  status: "granted" as "granted" | "denied" | "undetermined",
  scheduled: new Map<string, ScheduledEntry>(),
  nextId: 1,
  reset() {
    this.granted = true;
    this.status = "granted";
    this.scheduled = new Map();
    this.nextId = 1;
  }
};

export async function getPermissionsAsync() {
  return { granted: __mockNotificationState.granted, status: __mockNotificationState.status };
}

export async function requestPermissionsAsync() {
  return { granted: __mockNotificationState.granted, status: __mockNotificationState.status };
}

export async function scheduleNotificationAsync(request: { content: unknown; trigger: unknown }) {
  const identifier = `mock-notification-${__mockNotificationState.nextId++}`;
  __mockNotificationState.scheduled.set(identifier, { identifier, ...request });
  return identifier;
}

export async function cancelScheduledNotificationAsync(identifier: string) {
  __mockNotificationState.scheduled.delete(identifier);
}

export async function setNotificationChannelAsync() {}

export function setNotificationHandler() {}
