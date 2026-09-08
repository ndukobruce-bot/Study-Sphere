# StudySphere Mobile — Design System

Carries the existing navy/cyan brand forward per the v2 decision (it's the
one distinctive thing the current product has) rather than starting from
zero. Implemented as `apps/mobile/src/theme/tokens.ts` — no color literal
appears outside that file.

## Color tokens

| Token | Dark (default) | Light |
|---|---|---|
| `ink` (base background) | `#070711` | `#F4F6FB` |
| `slate` (raised surface / card) | `#12121F` | `#FFFFFF` |
| `line` (border/divider) | `#232336` | `#DDE1EC` |
| `cyan` (accent fill — buttons, rings, selected pills) | `#00C8FF` | `#0090BC` |
| `mist` (secondary text) | `#A9AEC4` | `#5B6178` |
| `paper` (primary text) | `#F4F6FB` | `#0B0B14` |
| `overdue` (the one status color) | `#F04438` | `#C4281C` |
| `onAccent` (text/icons ON a cyan fill) | `#070711` | `#0B0B14` |
| `accentText` (cyan used AS small/normal text, not a fill) | `#00C8FF` | `#007AA0` |

`onAccent` and `accentText` exist because a single "use `ink` on cyan, `cyan`
on the page" rule silently fails WCAG AA in one theme or the other — see the
contrast table below. Both were found and fixed by actually computing every
pairing the app uses, not by eyeballing the palette; see docs/PROGRESS.md.

Rule: **the accent color does work in exactly one place per screen** — the
primary action, or the single most important number. Everything else is
grayscale. This directly answers the brief's "spend boldness in one place."

### Contrast, computed (WCAG 2.1 relative-luminance formula)

Normal/small text needs ≥4.5:1, large text (≥24px, or ≥19px bold) and UI
components need ≥3:1. Every ratio below was computed from the actual hex
values above, not estimated:

| Pairing | Dark | Light | Passes |
|---|---|---|---|
| `paper` on `ink` (body text) | 18.54 | 18.11 | ✅ both |
| `paper` on `slate` (card text) | 17.16 | 19.59 | ✅ both |
| `mist` on `ink`/`slate` (secondary text) | 9.11 / 8.43 | 5.67 / 6.13 | ✅ both |
| `onAccent` on `cyan` (button/pill labels) | 10.22 | 5.33 | ✅ both — this is why `onAccent` exists; naively using `ink` on cyan gives only **3.40** in light theme (fails normal-text AA) |
| `accentText` on `ink` (small "due today" label) | 10.22 | 4.53 | ✅ both — plain `cyan` as text only reaches **3.40** in light theme |
| `overdue` on `ink`/`slate` | 5.34 / 4.94 | 5.30 / 5.73 | ✅ both — the original light-theme red (`#D92D20`) measured 4.47, just under 4.5; darkened to `#C4281C` |
| `cyan` on `ink` (large 32px streak number only) | 10.22 | 3.40 | ✅ both for **large text only** (≥3:1) — do not reuse this pairing for small text, use `accentText` instead |

### Deadline urgency — the only other place color carries meaning

| Bucket | Color |
|---|---|
| Overdue | `overdue` token |
| Today | `accentText` (small text) / `cyan` (large text only) |
| This week | `mist` with a subtle `line` chip background |
| Later | `mist`, no chip |

No other status, badge, or category gets a bespoke color. This is a
deliberate reaction to the brief's own warning against "every content type
in identical rounded cards with identical shadows" — urgency is the one
axis StudySphere actually needs the reader to triage by, so it's the one
axis with color.

## Typography

One variable family: **Inter** (via `@expo-google-fonts/inter`, weights 400/500/600/700).
No second display face — the brief's "cream-and-terracotta, ALL-CAPS eyebrow"
generic-AI-design smell almost always shows up as a second display font, so
this system deliberately has none.

| Role | Size / Line height | Weight |
|---|---|---|
| Display | 32 / 38 | 700 |
| Title | 22 / 28 | 600 |
| Body | 16 / 24 | 400 |
| Label | 13 / 16 | 500 |

Dynamic type: all sizes defined in the token file as a base scale multiplied
by the OS font-scale factor (`PixelRatio.getFontScale()`), capped at 1.3x to
keep layouts from breaking, never hard-disabled.

## Spacing, radius, elevation, motion

- Spacing scale: `4, 8, 12, 16, 24, 32, 48`.
- Radius: `12` for cards, `8` for inputs, `999` for pills.
- Elevation: **one** level, used only for the floating action surface (the
  "generate my week" button on Autopilot, the timer's start/pause control).
  Everything else is flat, separated by `line` borders, not shadows.
- Motion: answers actions only — task-complete checkmark, timer phase
  change, Autopilot plan reveal, a sheet opening. No entrance animations on
  scroll, no hover-style transitions (there is no hover on a phone).
  `useReducedMotion()` (from `react-native-reanimated` or the OS
  accessibility setting) disables all non-essential motion.

## Explicitly banned

Cream/terracotta palettes, near-black-plus-one-neon palettes, identical
rounded cards with identical soft shadows for every content type, ALL-CAPS
eyebrow labels, `01 / 02 / 03` markers on non-sequential content, `→`
appended to button text, decorative gradient washes.

## Copy rules

Sentence case. Active verbs. A button names what happens ("Generate this
week", not "Submit"). Empty states say what to do next ("Add your first
task to see it here", not "No data"). Errors say what broke and how to fix
it. No exclamation marks. **No "AI" anywhere** — Sage and the summarizer are
deterministic, on-device, and the copy says so plainly ("study guidance",
not "AI assistant").

## Accessibility floor

44dp minimum touch targets, WCAG AA contrast in both themes (the light
theme's accent is deliberately darkened to `#0090BC`, not a straight
inversion, specifically to hold AA against white), dynamic type respected,
reduced motion respected, a TalkBack/VoiceOver label on every interactive
element, no color-only signal (urgency buckets pair color with a text label,
never color alone).

## Screens — wireframes and the one memorable element

### Home

```
┌─────────────────────────────┐
│  Good afternoon, Asha        │  <- Title, mist "day X of streak"
│  ┌─────────────────────────┐│
│  │  🔥 4-day streak          ││  <- the ONE bold/cyan element
│  └─────────────────────────┘│
│  Today                       │
│  • Linear Algebra hw  overdue│  <- red
│  • Read Ch. 4          today │  <- cyan
│  Next focus block             │
│  ┌─────────────────────────┐│
│  │ 25 min · Physics          ││
│  │        [Start]            ││
│  └─────────────────────────┘│
│  Sage                         │
│  "Start with the lab report,  │
│   it's overdue."               │
└─────────────────────────────┘
```
Memorable element: the streak — the one number that's always cyan, always
top of screen, never buried in a stat grid.

### Tasks

```
┌─────────────────────────────┐
│  Tasks            [+ Add]    │
│  [All] [Pending] [Done]      │
│  ─────────────────────────── │
│  ○ Linear Algebra hw          │
│    Math · overdue      (red) │
│  ─────────────────────────── │
│  ○ Read Ch. 4                 │
│    Biology · today    (cyan) │
│  ─────────────────────────── │
│  ✓ Submit lab report (done)   │
└─────────────────────────────┘
   swipe → complete / delete
```
Memorable element: swipe-to-complete with a single haptic tick — the
physical feeling of finishing something, not a checkbox click.

### Autopilot

```
┌─────────────────────────────┐
│  Autopilot                   │
│  What are you working toward?│
│  [ Pass the midterm        ] │
│  By when?      [ Nov 3      ]│
│  Daily time    [ 90 min ▾  ] │
│  Energy        [Low Med High]│
│  Focus on      [ Calculus  ] │
│                               │
│  ┌─────────────────────────┐│
│  │   Generate this week     ││  <- the one elevated cyan button
│  └─────────────────────────┘│
└─────────────────────────────┘
        ↓ one tap later
┌─────────────────────────────┐
│  9 days · 90 min/day          │
│  Thu — Understand             │
│   Preview: Calculus  · 45min │
│   Practice: Calculus · 45min │
│  Fri — Understand             │
│   ...                         │
│           [Save to Tasks]     │
└─────────────────────────────┘
```
Memorable element: one button, one confident action — the whole point of
Autopilot is that generating a week never feels like filling out a form
twice.

### Focus (Timer)

```
┌─────────────────────────────┐
│         Study Time            │
│        ╭───────────╮          │
│       ╱   24:11      ╲        │  <- ring, cyan stroke while studying
│      │                │       │
│       ╲              ╱        │
│        ╰───────────╯          │
│         [ Pause ]              │
│      ● ● ○ ○  Session 2/4      │
└─────────────────────────────┘
```
Memorable element: the ring never resets to a static state while
backgrounded — reopening the app mid-session shows the correct remaining
time immediately, because it's derived from a stored end-timestamp, not a
paused counter.

### Exam Mode

```
┌─────────────────────────────┐
│  Physics — 12 days left       │  <- countdown, cyan number
│  Confidence today              │
│  [──────●──────────]  55%     │
│  Today's sprint                │
│  • Revise: Kinematics  40min  │
│  • Revise: Optics      40min  │
│  • Active recall: Optics 25min│
│           [Save to Tasks]      │
└─────────────────────────────┘
```
Memorable element: the confidence slider is the input, not a settings
toggle — sliding it visibly changes the sprint size, so the connection
between "how I feel" and "what I'm asked to do" is immediate.
