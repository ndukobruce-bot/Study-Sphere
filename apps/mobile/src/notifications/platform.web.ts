/**
 * Web build of src/notifications/platform.ts. expo-notifications' web
 * support doesn't cover trigger-based scheduling the way this app needs,
 * so web gets a no-op facade — verification on web is about the UI and app
 * logic, not proving notification delivery, which needs a real device.
 *
 * Deliberately does NOT import anything from "./platform" — Metro's
 * platform-extension resolution treats a relative "./platform" specifier
 * from inside this very file as resolving back to platform.web.ts itself
 * (not the native platform.ts), which created a real self-import cycle
 * and a `RangeError: Maximum call stack size exceeded` at runtime,
 * caught only by actually running the web build (see docs/PROGRESS.md —
 * this is exactly the class of bug static analysis/bundling can't catch).
 * Types are duplicated here rather than shared, on purpose.
 */

export interface PermissionResult {
  granted: boolean;
  status: "granted" | "denied" | "undetermined";
}

export interface NotificationsFacade {
  getPermissionsAsync(): Promise<PermissionResult>;
  requestPermissionsAsync(): Promise<PermissionResult>;
  scheduleNotificationAsync(request: {
    content: { title: string; body: string; channelId?: string };
    trigger: { type: "date"; date: Date } | { type: "timeInterval"; seconds: number };
  }): Promise<string | null>;
  cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  setNotificationChannelAsync(id: string, config: { name: string; importance: number }): Promise<void>;
  setNotificationHandler(): void;
}

export const AndroidImportance = { DEFAULT: 3 } as const;

export const notificationsFacade: NotificationsFacade = {
  async getPermissionsAsync() { return { granted: false, status: "undetermined" }; },
  async requestPermissionsAsync() { return { granted: false, status: "denied" }; },
  async scheduleNotificationAsync() { return null; },
  async cancelScheduledNotificationAsync() {},
  async setNotificationChannelAsync() {},
  setNotificationHandler() {}
};
