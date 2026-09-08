# StudySphere v2 — Progress

Last updated: 2026-09-08

## Environment constraints (read this first)

This session has **no Android SDK, no emulator, no connected physical
device, and no Expo/EAS account login**. That caps what "done" can mean
here:

- Code that can be typechecked, unit-tested, or actually executed (web
  target, driven with headless Chrome — see "Round two" below) is verified
  and reported as such.
- EAS cloud builds, Play Console submission, and true on-device/emulator
  testing are **not run** — they need your accounts and hardware. Every
  such step is written up as an exact command for you to run
  (docs/RELEASE.md, docs/PLAY_CHECKLIST.md), never claimed as done.

## Round two — what changed

The first pass compiled and bundled but had never executed. This pass
closed that gap and used the results to find and fix real bugs — not
hypothetical ones, ones that were actually reproduced.

### 1. Actually running it

No device exists here, so "run it" meant the web target, driven with a
real headless Chrome instance over CDP (not a simulated/mocked browser —
`chrome.exe --headless=new --remote-debugging-port` + `puppeteer-core`
connected to it). `expo-sqlite`, `react-native-mmkv`, and
`expo-notifications` don't run on web, so each got a platform-specific
`.web.ts` sibling file (Metro's platform-extension resolution, not a
runtime `Platform.OS` branch) backed by an in-memory fake SQLite engine
(`src/db/testing/fakeSqlite.ts`) and fake MMKV — gated so they can never
reach the Android bundle. **Verified, not assumed:** grepped the compiled
Android `.hbc` bytecode for every fake's distinctive strings after adding
gesture-handler/reanimated too — zero matches, both times.

**Bug found and fixed by running it, not by reading the code:**
`platform.web.ts` imported types/values from `"./platform"`. Metro's web
build resolves a relative `"./platform"` specifier to `platform.web.ts`
even from *inside* `platform.web.ts` itself — a genuine self-import cycle,
producing `RangeError: Maximum call stack size exceeded` on every single
boot. Static analysis and `expo export` bundling never caught this (the
module graph is technically valid, it just recurses at runtime). Fixed by
making `platform.web.ts` fully self-contained with no imports from its
native sibling.

Walked the entire app interactively after the fix: onboarding (all 3
steps, real form input) → Home → Tasks (add, filter) → Autopilot (real
plan generation, save to tasks) → Focus timer (start/pause) → every "More"
screen (Notes/Summarizer, Flashcards, Exam Mode, Sage, Settings) → light
theme (toggled in Settings, re-verified Home renders correctly). Zero
crashes, zero console errors after the fix, one pre-existing React Native
Web `aria-hidden`/focus warning noted below (not fixed — traced to
expo-router/react-navigation's web tab-switching, not app code).

### 2. Testing the layer that had none

`packages/shared` had 76 tests; `apps/mobile` had zero, despite holding
the code most likely to lose user data. Added a Vitest suite (**65
tests**) using the *same* fake SQLite engine from step 1, plus mocks for
`expo-notifications`/`react-native-mmkv`/`react-native`
(`src/testing/mocks/`) — so the exact source that ships is what's under
test, not a parallel implementation.

Covers: every repository's create/read/update/delete and the
ordering/filtering each promises; a real two-version schema migration
harness (`idx_tasks_due_date` added as migration 1, with a test that
simulates a device that only ever ran migration 0 and confirms its data
survives the upgrade untouched); full export/import round-trip with deep
equality across all 10 tables including nested JSON; every backup
validation failure case (missing version, newer version, older version, a
corrupted table shape) with a specific user-facing error message for each,
not a generic throw; and the notification scheduler (schedule, reschedule
on edit, cancel on complete/delete, permission denial, the reminder
window, the "due today but 9am already passed" case).

**Bug found while writing the scheduler tests:** `scheduleTaskReminder`
read the raw MMKV `notificationsEnabled` value directly, but
`usePreferencesStore`'s "default to true" only ever existed in the
zustand store's memory, never persisted to storage. On a fresh install,
the raw value is `undefined` → falsy → every reminder silently never
scheduled, for every user, until they happened to open Settings and
toggle the switch off-then-on. Fixed to mirror the store's actual default.

### 3. Notification correctness

- `rescheduleAllPendingReminders` now runs on every app boot
  (`app/_layout.tsx`) — self-healing for Android not guaranteeing local
  notifications survive a reboot. A true `BOOT_COMPLETED` receiver needs a
  custom native Android config plugin (a real BroadcastReceiver class) —
  out of scope for this pass, documented as a real gap in
  `src/notifications/scheduler.ts`'s doc comment, not silently skipped.
- Reminders capped to a 30-day near-term window (Android limits pending
  alarms); tasks further out get picked up by the boot-time top-up once
  they enter the window.
- A task due today whose 9am nudge has already passed now gets a
  same-day reminder instead of silently nothing.
- Settings now shows a real three-state permission UI (on / off / blocked
  by system) with a link to system settings when blocked — the old web
  app's "Enable Alerts" button that did nothing once denied is gone.

### 4. Design pass

- **Swipe-to-complete and swipe-to-delete, implemented and verified
  working** — `react-native-gesture-handler`'s `Swipeable`, wired into
  Tasks with a checkbox/delete-button fallback kept for accessibility
  (swipe should never be the *only* way to do something). Verified with a
  real simulated mouse-drag over CDP: mid-swipe screenshot shows the red
  "Delete" panel correctly revealing; post-swipe screenshot shows the task
  actually gone from the list. Not a stub — an executed gesture.
- **Real contrast bug found and fixed by computing every token pairing,
  not eyeballing the palette.** The rule "`onAccent`-colored text on a
  cyan fill" was implemented as "`ink` on cyan" — correct in dark theme
  (10.22:1) but **3.40:1 in light theme**, below WCAG AA's 4.5:1 for
  normal-size text, in 7 places (every selected pill button, the task
  checkbox's checkmark). Root cause: `ink`'s luminance flips between
  themes but the pairing didn't account for it. Added two new tokens
  (`onAccent`, `accentText`) computed to clear 4.5:1 in *both* themes, and
  darkened light theme's `overdue` red from `#D92D20` (4.47, just under
  AA) to `#C4281C` (5.30). Full before/after numbers in docs/DESIGN.md.
  Re-verified visually after the fix (light-theme pills now show clearly
  legible dark text on cyan).
- **44dp touch targets**: found 7 pill-button groups (priority, filter,
  energy, exam-select, confidence, theme, timer-mode) sized ~32px tall
  (padding + label line-height, no explicit minimum) — under the button
  size the app's own `MIN_TOUCH_TARGET` constant already enforces
  everywhere else. Added `minHeight: MIN_TOUCH_TARGET` to all 7.
- **Accessibility labels**: audited every `Pressable` across the app;
  found and fixed 3 files (autopilot energy selector, exam-mode's exam and
  confidence pills, settings' theme selector) with zero
  `accessibilityLabel`/`accessibilityRole`/`accessibilityState` at all.
  All interactive elements now have a label; selectable pills report
  `accessibilityState={{ selected }}`.
- **Light theme**: rendered and visually confirmed (Home, Settings,
  Tasks) — not just specified on paper. No breakage found beyond the
  contrast issue above.
- **Timer foreground-service decision — stated plainly, not left
  ambiguous:** no true Android foreground service in this build (needs
  native Kotlin/Java code + a custom config plugin, can't be verified
  without a device — a real scope cut, recorded as such in
  docs/PLAY_CHECKLIST.md). While actually testing this, found and fixed a
  second, more serious gap than "less accurate": the running timer's
  state wasn't persisted at all, so if Android killed the whole app
  process during a long session (not just suspended it — real behavior on
  Samsung/Xiaomi/etc. under battery optimization), reopening the app would
  show a fresh "Study Time 25:00" with the in-progress session silently
  discarded, not just inaccurate. Fixed by persisting the timer's state to
  MMKV on every change and resyncing from the wall clock on mount,
  including correctly advancing mode/session counters if a session fully
  completed while the process was dead. **Verified twice**, both via a
  full page reload mid-session (the closest process-kill simulation
  available without a device — a reload destroys all in-memory JS state):
  once with a real in-progress session correctly resuming at the right
  remaining time with the button correctly showing "Pause," and once with
  an injected already-elapsed session correctly advancing to "Short
  Break, Session 2."

### 5. Manifest cleanup

Added `apps/mobile/plugins/withMinimalPermissions.js`, a config plugin
that strips `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` (legacy,
already `maxSdkVersion=32`, superseded by `expo-file-system`'s modern File
API + SAF) and `SYSTEM_ALERT_WINDOW` (traced to React Native's own
debug-only manifest fragment — no app code requests it). Re-ran
`expo prebuild` after: manifest went from 5 `uses-permission` entries to
2 (`INTERNET`, `VIBRATE`).

**`INTERNET` is deliberately kept**, after checking rather than assuming:
`eas.json`'s `development`/`preview` profiles install a dev client that
loads the JS bundle from Metro over a socket, which Android gates behind
this exact permission even for localhost/LAN connections. Stripping it
globally would have silently broken `expo start`/dev-client iteration for
the whole team the next time someone tried it. Making it variant-aware
(stripped only for `production`) needs `app.json` to become
`app.config.js` so a plugin can read the active EAS build profile — a
real structural change, logged as a deferred follow-up rather than done
reflexively to satisfy a checklist line.

### 6. Screenshot and E2E pipeline

Written, **not run** (no device):
- `apps/mobile/.maestro/smoke-flow.yaml` — onboarding → add task →
  generate a schedule → run a focus session → complete a task (swipe) →
  export → wipe → import → verify state. Written against the real,
  verified screen text from manually driving the app in this pass, not
  guessed — but never executed against an actual device, so expect to fix
  a selector or two on the first real run.
- `scripts/screenshots/` — `seed-and-capture.yaml` (Maestro flow that
  seeds realistic demo data through the app's own UI, not a database
  fixture, then captures the six listing screenshots) and
  `compose-frames.js` (composites each into a device-frame outline with
  the matching headline from `headlines.json`, using `sharp` + an SVG
  overlay — no stock mockup image, no native `canvas` dependency).
- The exact cold-start command sequence (EAS login through screenshot
  capture) is now at the top of docs/RELEASE.md, copy-paste ready.

### 7. Website security fix

`apps/web` still had client-side auth with plaintext passwords in
`localStorage` and an admin panel that (per Phase 1's audit) was already
unreachable in practice but still live in the code. Removed both — the
minimum change, not a refactor:

- Deleted `admin.html` and every admin-only function in `js/auth.js`
  (confirmed via grep, before deleting anything, that nothing else linked
  to it — the only two references were in `js/app.js`'s nav rendering,
  both gated on `role === "admin"`, a role that could never actually be
  set). Removed the admin tab/form from `login.html` and the two
  admin-conditional branches in `js/app.js`.
- `upsertStudent()` no longer writes or checks a password at all — it was
  never validated against anything beyond a same-browser comparison, so
  this is zero functional loss for real security removed. Removed the
  password input from the login form to match (a field that's collected
  but silently ignored would be more misleading than not having it).
- Added a one-time `migrateAwayFromStoredPasswords()` that strips any
  `password` key already sitting in an existing visitor's `ss_students`
  entries, guarded to run once per browser.
- `privacy.html` updated to say there is no admin panel at all, not
  "disabled by default."

**Verified with a real browser**, same approach as the mobile app: served
`apps/web` from a local static server, confirmed `GET /admin.html` now
404s, drove the full student login flow end to end, confirmed the
resulting `ss_students` entry has no `password` key, and spot-checked
index/tasks/planner/timer/feedback all still load with zero console
errors and correct nav (no dangling Admin link).

## Round one — what was done before this pass

### Step 0 — Archive
Upload keystore + `keystore.properties` + all historical `.aab`/`.apk`
builds + Play listing graphics (with the ~61MB stray Chrome-automation
debris across all five `chrome-*` profile dirs purged, not just the one
named in the original brief) copied to `../studysphere-backup/` and the
keystore hash-verified byte-for-byte against the original before deletion.
**You still need to copy `../studysphere-backup/keystore/` to your own
cloud storage** — see docs/RELEASE.md step 0.

### Step 1 — Restructure
- `apps/web`: the site moved verbatim (git-history-preserving `git mv`).
- `apps/desktop`: Electron shell moved, `prepare-desktop.js` and
  `create-windows-icon.js` repointed at the new paths.
- Deleted: `android/`, `ios/`, `mobile-web/`, `desktop-web/`, `dist/`
  (688MB, never committed), `server.js`, `data/`, `capacitor.config.json`,
  `scripts/prepare-mobile.js`, `.env.example`, old root `package-lock.json`.
- Archived the stale Android/Play docs into `docs/legacy/`.
- pnpm workspace set up (`pnpm-workspace.yaml`, root `.gitignore`).
- **Deviation from the brief, recorded at the time:** did not delete
  `admin.html`/`js/auth.js`/etc. from `apps/web` in round one (would have
  broken the live site's nav/session logic). Round two above resolved
  this properly by surgically removing only the admin-specific code and
  the password field, keeping the rest of `js/auth.js` intact.

### packages/shared
Ported to TypeScript with **76 passing unit tests** and a clean
strict-mode typecheck: `scheduler.ts` (merged Autopilot+Planner per
decision 4), `summarizer.ts`, `sage.ts`, `revision.ts`, `streaks.ts`,
`timer.ts`, `dates.ts`. Fixed one latent bug found while porting: several
original functions built "today" via `date.toISOString().slice(0, 10)`,
which converts to UTC before formatting and can roll the calendar day for
users near a UTC boundary — all date formatting here uses local calendar
fields instead.

### apps/mobile — first 9 screens
Expo SDK 57, expo-router, TypeScript strict, wired entirely to
`packages/shared`. Data layer: `expo-sqlite` (10 tables) as sole source of
truth, `react-native-mmkv` v4 for preferences. Screens: onboarding, Home,
Tasks, Autopilot, Focus timer, Notes/Summarizer, Flashcards, Exam Mode,
Sage, Settings. Real, on-brand app icon generated procedurally
(`apps/mobile/scripts/generate-icons.js`) — replaces Expo's default logo.

### Play compliance, store listing, docs
`docs/PLAY_CHECKLIST.md`, `store/listing.md`, `store/feature-graphic.png`,
`README.md` rewrite — all done in round one, refined further in round two
(see above).

## Blocked on you (not on more agent work)

- **EAS account login** (`eas login`) and linking the existing upload
  keystore to EAS credentials — docs/RELEASE.md has the exact steps.
- **Play Console access** — versionCode verification against the live
  closed track (this build assumes `versionCode 3` based on the last
  recorded build in docs/AUDIT.md, but that's self-reported, not a live
  read of the console — confirm before building), and the actual
  submission.
- **A physical Android device or emulator** — this environment has no
  Android SDK, no emulator, and no connected device. Needed for: the
  Maestro smoke flow, the screenshot pipeline, 16 KB page-size
  verification, the release-AAB permission/secret grep, and Android
  8–16 / 360dp-phone / tablet coverage.
- **Copying `../studysphere-backup/keystore/` off this machine.** If lost,
  `com.studysphere.app` can never be updated on Play again.
- **`eas.json`'s `submit.production.android.track`** is set to
  `"internal"` as a placeholder — update it to match your actual closed
  testing track name/ID in Play Console before running `eas submit`.

## Known, accepted gaps (not silently skipped — see the relevant doc)

- No true Android foreground service for the timer — docs/PLAY_CHECKLIST.md.
- No `BOOT_COMPLETED` receiver — reminders self-heal on next app open
  instead — `src/notifications/scheduler.ts`'s doc comment.
- `INTERNET` permission kept for dev-client builds — docs/PLAY_CHECKLIST.md.
- One pre-existing React Native Web console warning (`aria-hidden` on an
  element with retained focus during tab switches) — traced to
  expo-router/react-navigation's web implementation, not app code; not
  reproducible as a real accessibility bug on native (TalkBack/VoiceOver
  don't share the DOM `aria-hidden` mechanism this warning is about).
- Maestro flows are written but unexecuted — no device in this environment.

## Queued for v1.1 (explicitly out of scope for this build)

- Accounts, server-side auth, cross-device sync (decision 1).
- Real LLM-backed Sage, behind the seam already left in `sage.ts`.
- Games, files, groups, grades, calendar, report — cut from v1 (decision 6).
- A true Android foreground service for the focus timer.
- A `BOOT_COMPLETED` receiver for notification rescheduling.
- Variant-aware permissions (`app.config.js`) to drop `INTERNET` from
  production builds specifically.
