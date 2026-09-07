import { create } from "zustand";
import type { ThemeName } from "../theme/tokens";
import { preferences } from "./mmkv";

export type ThemePreference = ThemeName | "system";

interface PreferencesState {
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
  hasOnboarded: boolean;
  setThemePreference: (value: ThemePreference) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setHasOnboarded: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  themePreference: (preferences.getString("themePreference") as ThemePreference) ?? "system",
  notificationsEnabled: preferences.getBoolean("notificationsEnabled") ?? true,
  hasOnboarded: preferences.getBoolean("hasOnboarded") ?? false,
  setThemePreference: (value) => {
    preferences.set("themePreference", value);
    set({ themePreference: value });
  },
  setNotificationsEnabled: (value) => {
    preferences.set("notificationsEnabled", value);
    set({ notificationsEnabled: value });
  },
  setHasOnboarded: (value) => {
    preferences.set("hasOnboarded", value);
    set({ hasOnboarded: value });
  }
}));
