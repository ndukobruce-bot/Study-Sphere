import React, { createContext, useContext, useMemo } from "react";
import { PixelRatio, useColorScheme } from "react-native";
import { AccessibilityInfo } from "react-native";
import { ColorTokens, ThemeName, colorsFor, radius, spacing, typeScale } from "./tokens";
import { usePreferencesStore } from "../store/preferencesStore";

export interface Theme {
  name: ThemeName;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof typeScale;
  fontScale: number;
  reducedMotion: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

/** Caps dynamic type at 1.3x so layouts don't break, per docs/DESIGN.md. */
function cappedFontScale(): number {
  return Math.min(1.3, PixelRatio.getFontScale());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = usePreferencesStore(state => state.themePreference);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => subscription.remove();
  }, []);

  const resolvedName: ThemeName = themePreference === "system" ? (systemScheme === "light" ? "light" : "dark") : themePreference;

  const theme = useMemo<Theme>(() => ({
    name: resolvedName,
    colors: colorsFor(resolvedName),
    spacing,
    radius,
    type: typeScale,
    fontScale: cappedFontScale(),
    reducedMotion
  }), [resolvedName, reducedMotion]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used within a ThemeProvider");
  return theme;
}
