import { createMMKV } from "react-native-mmkv";

/** Preferences only — app data lives in SQLite (src/db), not here. */
export const preferences = createMMKV({ id: "studysphere-preferences" });

/** Maps a task id -> scheduled-notification identifier, so an edit or
 * completion can find and cancel the right OS-level notification. */
export const notificationIds = createMMKV({ id: "studysphere-notification-ids" });
