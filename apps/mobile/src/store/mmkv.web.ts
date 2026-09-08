import { createFakeMmkv } from "./fakeMmkv";

/**
 * Web build of src/store/mmkv.ts. react-native-mmkv v4 is Nitro-module-based
 * with no web implementation, so this in-memory/localStorage fake stands in
 * — Metro picks this file automatically for web, never for Android/iOS.
 */
export const preferences = createFakeMmkv("studysphere-preferences");
export const notificationIds = createFakeMmkv("studysphere-notification-ids");
