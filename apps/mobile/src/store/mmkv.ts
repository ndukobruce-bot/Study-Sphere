import { createMMKV } from "react-native-mmkv";

/**
 * Native (Android/iOS) implementation. mmkv.web.ts is a separate file —
 * Metro's platform-extension resolution means it's the one used in a web
 * build, and this one (react-native-mmkv, Nitro-based, no web support) is
 * the one used natively. See mmkv.web.ts for why web needs a fake at all.
 *
 * Preferences only — app data lives in SQLite (src/db), not here.
 */
export const preferences = createMMKV({ id: "studysphere-preferences" });

/** Maps a task id -> scheduled-notification identifier, so an edit or
 * completion can find and cancel the right OS-level notification. */
export const notificationIds = createMMKV({ id: "studysphere-notification-ids" });
