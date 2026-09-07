/**
 * Design tokens — see docs/DESIGN.md. No color literal should appear
 * anywhere else in the app; import from here.
 */

export type ThemeName = "dark" | "light";

export interface ColorTokens {
  ink: string;
  slate: string;
  line: string;
  cyan: string;
  mist: string;
  paper: string;
  overdue: string;
}

export const darkColors: ColorTokens = {
  ink: "#070711",
  slate: "#12121F",
  line: "#232336",
  cyan: "#00C8FF",
  mist: "#A9AEC4",
  paper: "#F4F6FB",
  overdue: "#F04438"
};

export const lightColors: ColorTokens = {
  ink: "#F4F6FB",
  slate: "#FFFFFF",
  line: "#DDE1EC",
  cyan: "#0090BC",
  mist: "#5B6178",
  paper: "#0B0B14",
  overdue: "#D92D20"
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { input: 8, card: 12, pill: 999 } as const;

export const typeScale = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700" as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  label: { fontSize: 13, lineHeight: 16, fontWeight: "500" as const }
};

export const MIN_TOUCH_TARGET = 44;

export function colorsFor(theme: ThemeName): ColorTokens {
  return theme === "dark" ? darkColors : lightColors;
}
