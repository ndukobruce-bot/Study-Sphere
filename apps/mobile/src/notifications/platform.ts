import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Native (Android/iOS) implementation. platform.web.ts is a separate file —
 * Metro's platform-extension resolution picks it for a web build, and this
 * one for native, so the two are never bundled together for one platform.
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
  async getPermissionsAsync() {
    const result = await Notifications.getPermissionsAsync();
    return { granted: result.granted, status: result.status };
  },
  async requestPermissionsAsync() {
    const result = await Notifications.requestPermissionsAsync();
    return { granted: result.granted, status: result.status };
  },
  async scheduleNotificationAsync(request) {
    if (request.trigger.type === "date") {
      return Notifications.scheduleNotificationAsync({
        content: request.content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: request.trigger.date }
      });
    }
    return Notifications.scheduleNotificationAsync({
      content: request.content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: request.trigger.seconds }
    });
  },
  async cancelScheduledNotificationAsync(identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  },
  async setNotificationChannelAsync(id, config) {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync(id, { name: config.name, importance: config.importance });
  },
  setNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false
      })
    });
  }
};
