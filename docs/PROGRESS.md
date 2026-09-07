# StudySphere v2 — Progress

Last updated: 2026-09-07

## Environment constraints (read this first)

This session has **no Android SDK, no emulator, no connected physical
device, and no Expo/EAS account login**. That caps what "done" can mean
here:

- Code that can be typechecked, unit-tested, or statically bundled via
  Metro is verified and reported as such.
- EAS cloud builds, Play Console submission, and on-device/emulator smoke
  tests are **not run** — they need your accounts and hardware. Every such
  step is written up as an exact command or checklist item for you to run
  (docs/RELEASE.md, docs/PLAY_CHECKLIST.md), never claimed as done.

## Done

### Step 0 — Archive
Upload keystore + `keystore.properties` + all historical `.aab`/`.apk`
builds + Play listing graphics (with the ~61MB stray Chrome-automation
debris across all five `chrome-*` profile dirs purged, not just the one
named in the original brief) copied to `../studysphere-backup/` and the
keystore hash-verified byte-for-byte against the original before deletion.
**You still need to copy `../studysphere-backup/keystore/` to your own
cloud storage** — see docs/RELEASE.md step 0.

### Step 1 — Restructure
- `apps/web`: the site moved verbatim (git-history-preserving `git mv`),
  verified serving correctly via a local static server (index/dashboard/
  css/js/assets all 200). One content-only edit since the move:
  `privacy.html` gained an "Android App" section describing the mobile
  app's actual (zero-data-collection) practices — no scripts, nav, or
  behavior touched.
- `apps/desktop`: Electron shell moved, `prepare-desktop.js` and
  `create-windows-icon.js` repointed at the new paths (icon script no
  longer depends on the deleted `android/`/`ios/` mipmaps — generates its
  own sizes now).
- Deleted: `android/`, `ios/`, `mobile-web/`, `desktop-web/`, `dist/`
  (688MB, never committed), `server.js`, `data/`, `capacitor.config.json`,
  `scripts/prepare-mobile.js`, `.env.example`, old root `package-lock.json`.
- Archived the stale Android/Play docs into `docs/legacy/`.
- pnpm workspace set up (`pnpm-workspace.yaml`, root `.gitignore`).
- **Deviation from the brief, recorded at the time:** `admin.html`,
  `js/auth.js`, `files.html`, `groups.html`, `grades.html`, `game.html`,
  `calendar.html`, `report.html` were **not deleted** from `apps/web`.
  Every page on the live site loads `js/auth.js` for session/nav logic;
  deleting it would break navigation and script tags across the whole
  live site, directly contradicting "apps/web must keep serving
  identically." Read literally, "cut from v1" and "delete admin.html/
  js/auth.js" were describing the **mobile app's** scope, not the live
  website's. Kept the website intact; simply didn't port those pages/that
  logic into `packages/shared` or `apps/mobile`.

### packages/shared
Ported to TypeScript with **76 passing unit tests** (`pnpm --filter
@studysphere/shared test`) and a clean strict-mode typecheck: `scheduler.ts`
(merged Autopilot+Planner per decision 4), `summarizer.ts`, `sage.ts`,
`revision.ts`, `streaks.ts`, `timer.ts`, `dates.ts`. Fixed one latent bug
found while porting: several original functions built "today" via
`date.toISOString().slice(0, 10)`, which converts to UTC before formatting
and can roll the calendar day for users near a UTC boundary — all date
formatting here uses local calendar fields instead.

### apps/mobile — Expo app, first 9 screens
Expo SDK 57 (React Native 0.86, targets/compiles API 36 by default — no
manual Gradle needed), expo-router, TypeScript strict, wired entirely to
`packages/shared` for logic. Data layer: `expo-sqlite` (10 tables, see
`src/db/schema.ts`) as sole source of truth, `react-native-mmkv` v4
(Nitro-based — required `react-native-nitro-modules` as an explicit peer,
and its API is `createMMKV()`/`.remove()`, not the old `new MMKV()`/
`.delete()`) for preferences only.

Screens built, in the specified order: onboarding (3-step, skippable, no
password field), Home, Tasks (with **real** scheduled local notifications
— the original web app's Reminders page only ever requested permission
and scheduled nothing), Autopilot (the merged scheduler), Focus timer
(wall-clock state machine, resyncs on `AppState` foreground, schedules a
session-end notification), Notes/Summarizer, Flashcards, Exam Mode, Sage,
Settings (theme, notifications, profile, export/import via
`expo-document-picker` + `expo-sharing`, delete-all-data).

Real, on-brand app icon generated procedurally (no SVG rasterizer was
available in this environment) — replaces Expo's default template logo.
See `apps/mobile/scripts/generate-icons.js`.

**Verified in this pass:**
- `tsc --noEmit` — zero errors, whole app.
- `expo-doctor` — 21/21 checks pass.
- `expo export --platform android` — all 1438 modules bundle successfully
  to Hermes bytecode with no resolution/syntax errors.
- `expo prebuild --platform android` — generated the real native project
  and confirmed the actual merged `AndroidManifest.xml` (see
  docs/PLAY_CHECKLIST.md) instead of guessing at permissions.

**Not verified (needs your hardware/accounts):** on-device or emulator
behavior, EAS builds, Play Console submission, the release-AAB secret
grep, device/OS coverage testing.

**Documented deviations (not silent gaps):**
- Tasks screen uses tap-to-toggle + a delete button, not swipe — avoided
  pulling in `react-native-gesture-handler` for this pass. docs/DESIGN.md's
  wireframe mentions swipe as the "memorable element"; this is a real,
  logged gap against that document, not a broken promise.
- The Focus timer does not use a true Android foreground service (would
  need a custom native module/config plugin beyond stock Expo). It uses a
  wall-clock-derived countdown plus a scheduled end-of-session notification
  instead — correct and functional, just not a persistent live-countdown
  notification. See docs/PLAY_CHECKLIST.md's "Foreground service" section.

### Play compliance (docs/PLAY_CHECKLIST.md)
Worked through every line; permissions justified against the *actual*
generated manifest, not assumed. Several items are explicitly blocked on
an EAS account and a physical device and are marked as such rather than
assumed passing.

### Docs written
`docs/AUDIT.md`, `docs/DESIGN.md`, `docs/PLAY_CHECKLIST.md`,
`docs/RELEASE.md`, this file.

## Next

- Store assets: `store/listing.md` (short/full description) and
  `store/feature-graphic.png` are done — both achievable without a device.
  The six screenshots are not — they need a running app on a device or
  emulator to capture from, which this environment doesn't have.
- `apps/mobile/scripts/screenshots/` automation script — can't be usefully
  written or tested until there's a device to run it against.
- A real device smoke test (onboarding → task → Autopilot → timer →
  summarize → export → wipe → import) — the brief's own "never report
  something as working until you have run it" rule means this genuinely
  has not been confirmed working end-to-end on a device yet, only via
  static analysis.

## Blocked on you (not on more agent work)

- **EAS account login** (`eas login`) and linking the existing upload
  keystore to EAS credentials — docs/RELEASE.md has the exact steps.
- **Play Console access** — versionCode verification against the live
  closed track (this build assumes `versionCode 3` based on the last
  recorded build in docs/AUDIT.md, but that's self-reported, not a live
  read of the console — confirm before building), and the actual
  submission.
- **A physical Android device or emulator** — this environment has no
  Android SDK, no emulator, and no connected device.
- **Copying `../studysphere-backup/keystore/` off this machine.** If lost,
  `com.studysphere.app` can never be updated on Play again.
- **`eas.json`'s `submit.production.android.track`** is set to
  `"internal"` as a placeholder — update it to match your actual closed
  testing track name/ID in Play Console before running `eas submit`.

## Queued for v1.1 (explicitly out of scope for this build)

- Accounts, server-side auth, cross-device sync (decision 1).
- Real LLM-backed Sage, behind the seam already left in `sage.ts`.
- Games, files, groups, grades, calendar, report — cut from v1 (decision 6).
- Swipe-to-complete on Tasks (currently tap + delete button).
- A true Android foreground service for the focus timer.
