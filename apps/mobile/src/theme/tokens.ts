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
  /** Text/icon color for content placed ON TOP of a cyan-filled surface
   * (primary button labels, selected pill labels, a checkmark on a
   * cyan checkbox). Computed to clear WCAG AA (4.5:1) against `cyan` in
   * both themes — `paper`/`ink` individually do NOT, since one of them
   * is light and cyan's own luminance flips which one works between
   * themes. See docs/DESIGN.md's contrast table. */
  onAccent: string;
  /** `cyan`, tuned for use AS small/normal-size TEXT directly on the
   * page background, rather than as a fill. In dark theme this equals
   * `cyan` (already >4.5:1 on `ink`); in light theme `cyan` itself only
   * reaches 3.4:1 as text (fine for large text, not body/label text),
   * so this is a separately darkened value. See docs/DESIGN.md. */
  accentText: string;
}

export const darkColors: ColorTokens = {
  ink: "#070711",
  slate: "#12121F",
  line: "#232336",
  cyan: "#00C8FF",
  mist: "#A9AEC4",
  paper: "#F4F6FB",
  overdue: "#F04438",
  onAccent: "#070711",
  accentText: "#00C8FF"
};

export const lightColors: ColorTokens = {
  ink: "#F4F6FB",
  slate: "#FFFFFF",
  line: "#DDE1EC",
  cyan: "#0090BC",
  mist: "#5B6178",
  paper: "#0B0B14",
  overdue: "#C4281C",
  onAccent: "#0B0B14",
  accentText: "#007AA0"
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
