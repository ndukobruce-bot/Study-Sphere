# StudySphere Mobile — Play Compliance Checklist

Status as of this build pass. Items marked **VERIFIED** were actually run in
this environment. Items marked **BLOCKED — needs your access** require an
EAS/Expo account login, Play Console access, or a physical/emulated Android
device, none of which exist in this environment (see docs/PROGRESS.md).

## Target SDK / build format

- [x] **VERIFIED** — `targetSdk`/`compileSdk` 36. Expo SDK 57 targets and
  compiles against API 36 by default (confirmed against Expo's own SDK 57
  docs) — no manual Gradle override needed or present.
- [x] **VERIFIED** — AAB is the build format: `eas.json`'s `production`
  profile sets `android.buildType: "app-bundle"`.
- [ ] **BLOCKED** — 16 KB page-size compatibility of native libraries.
  Verifying this requires an actual built `.apk`/`.aab` run through
  Android's page-size checker, which needs an EAS build.

## Permissions

- [x] **VERIFIED** — Ran `expo prebuild --platform android` (no SDK needed,
  just Node) to generate the real native project and read the actual merged
  `AndroidManifest.xml` rather than guessing. Full text:

  ```
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" .../>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
  <uses-permission android:name="android.permission.VIBRATE"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" .../>
  ```

  Justification for each:
  - `INTERNET` — **not currently used by any app feature** (there is no
    server in v1 — see docs/AUDIT.md decision 1). It's present because it's
    baked into the React Native/Expo build template, not requested by any
    app code. Low-risk (a "normal" permission, no runtime prompt, no special
    Play disclosure), but flagged honestly rather than justified by a
    feature that doesn't exist. If a future audit confirms nothing ever
    needs it before v1.1's sync work lands, it can likely be dropped.
  - `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` (both
    `maxSdkVersion="32"`, i.e. **inactive on Android 13+**) — legacy storage
    access for the Settings export/import flow (`expo-document-picker`,
    `expo-file-system`) on devices running Android 12L and below, where
    scoped storage/SAF wasn't fully in effect. Correctly scoped out on
    modern Android already.
  - `SYSTEM_ALERT_WINDOW` — traced to
    `react-native/ReactAndroid/src/debug/AndroidManifest.xml` — it's part of
    React Native's **debug-only** manifest fragment (powers the in-app dev
    error overlay), not something any app code requests. Gradle's
    variant-aware manifest merging means this should **not** appear in a
    release build, but confirming that precisely requires unzipping an
    actual release AAB, which needs an EAS build (see below).
  - `VIBRATE` — justified: `expo-haptics`, used for the timer's
    phase-change haptic and Tasks' completion feedback.
  - No location, camera, contacts, or SMS permissions anywhere — confirmed
    by this being the complete list.

- [ ] **BLOCKED** — Confirming the exact release-build permission set
  (specifically that `SYSTEM_ALERT_WINDOW` really is absent from release)
  requires `eas build --profile production` and unzipping the resulting
  `.aab`.

## Foreground service — final decision, stated plainly

**No true Android foreground service in this build.** A real one needs a
custom native module or config plugin (a Kotlin/Java service class) beyond
what stock Expo modules provide, cannot be verified without a physical
device and a dev client build, and is a materially bigger scope than the
rest of this pass. This is a decided scope cut, not an oversight — the
store listing does not claim persistent background tracking, and the copy
in `store/listing.md` was written to stay true regardless ("keeps accurate
time even if you switch apps or lock your phone" — true — not "shows a
live countdown in your notification shade while backgrounded" — not true).

**What actually happens, verified by running it (not assumed):**

1. While the app process stays alive in the background (screen off, home
   button, switching apps briefly), the countdown is derived from a stored
   end-timestamp, not a fragile per-tick counter — confirmed correct after
   resuming from the background in the browser test run.
2. **A second, more serious failure mode exists and is now handled:**
   Android can kill the whole app process during a long session (memory
   pressure, aggressive per-OEM battery optimization — Samsung/Xiaomi/etc.
   are known for this), not just suspend the JS thread. Without
   persistence, that would silently discard the in-progress session —
   reopening the app would show a fresh "Study Time 25:00," not an
   inaccurate one. **Found by actually testing a full page reload
   mid-session** (the closest simulation available without a device: a
   full reload destroys all in-memory JS state exactly like a process
   kill does) — the timer had no persistence and would have reset. Fixed:
   `apps/mobile/app/(tabs)/timer.tsx` now persists the running timer state
   to MMKV on every change and restores + resyncs it from the wall clock
   on mount, including correctly advancing the mode/session counters if a
   session fully completed while the process was dead. Verified twice:
   once with a real ~4-second in-progress session surviving a full reload
   (resumed at the correct remaining time, button correctly showed
   "Pause"), and once with an injected already-elapsed session correctly
   advancing to "Short Break, Session 2" on reload.
3. A local notification is scheduled for session-end via
   `expo-notifications`, so the user is told when a session finishes even
   while fully backgrounded — this is the mitigation for "did I miss the
   end of my session," the failure mode most likely to actually cause an
   uninstall.
4. What is still genuinely missing: a persistent notification showing a
   *live, ticking* countdown while backgrounded. That specifically needs
   a foreground service. This is a polish gap, not a data-loss gap, given
   point 2 above — logged as a real v1.1 candidate, not shipped ambiguous.

No `FOREGROUND_SERVICE` permission or service type is declared, correctly,
because none is implemented.

## Notifications (API 33+)

- [x] **VERIFIED** — `expo-notifications`' permission flow
  (`requestPermissionsAsync`) is only called from user-driven code paths
  (Settings' notification toggle, and when a task with a due date is first
  created) — never on cold start.

## Data safety / privacy

- [x] **VERIFIED** — Nothing is collected, nothing is shared, nothing
  leaves the device: no server, no accounts, no analytics SDK, no ad SDK.
  Confirmed by reading every dependency in `apps/mobile/package.json` —
  none are analytics/ads/crash-reporting packages.
- [ ] **TODO (you)** — Draft the actual Data Safety form answers in Play
  Console using the above ("No data collected") — the form itself is filled
  in the console, not in a repo file.
- [x] **VERIFIED** — `apps/web/privacy.html` has an "Android App
  (com.studysphere.app)" section describing the mobile app's actual data
  practice (nothing collected, nothing shared, no server, local export/
  delete). Also updated to remove the stale admin-panel paragraph after
  admin.html was deleted from the website (see the website security fix
  commit). Confirmed live by loading the page in a real browser.

## Account deletion

- [x] **N/A by design** — there is no account to delete (decision 1). The
  practical equivalent — Settings' "Delete all data," which wipes every
  SQLite table — is implemented and is what Play's data-deletion
  expectations map to for an account-less app.

## Crashes, ANRs, logging

- [x] **VERIFIED (statically)** — `tsc --noEmit` passes with zero errors
  across the whole app; `expo export --platform android` successfully
  bundles all 1438 modules to Hermes bytecode with no resolution errors.
- [ ] **BLOCKED** — Actual crash/ANR/rotation testing needs a device or
  emulator, neither of which exists here.
- [x] **VERIFIED** — Grepped `apps/mobile/app` and `apps/mobile/src` for
  `console.log`/`console.warn`/`console.debug`: zero matches. Nothing to
  strip.

## Predictive back / edge-to-edge

- [x] **VERIFIED** — `app.json`'s `android.predictiveBackGestureEnabled:
  true` is set (confirmed against Expo SDK 57's config schema — this is the
  real field name for this SDK version, not a guess).

## Release AAB content check

- [ ] **BLOCKED** — "Unzip the built AAB and grep for keys/tokens/emails/
  payment data" needs an actual built AAB from `eas build`. Cannot be run
  here. When you build: `unzip -l app.aab` then grep the extracted
  `base/assets` and any bundled JS for `pesapal`, `password`, `api`, `key`,
  `token`, `@gmail`, `web3forms` — expected result is **zero matches**,
  since none of those exist anywhere in `apps/mobile`.

## Device/OS coverage

- [ ] **BLOCKED** — "Android 8 through 16, 360dp phone and tablet" needs
  physical/emulated devices. Not run.

## Store listing

- [x] Icon replaced — see docs/PROGRESS.md and `apps/mobile/scripts/
  generate-icons.js`. Real, on-brand, legible at small sizes; generated
  procedurally (no rasterizer was available in this environment to convert
  a hand-drawn SVG), not a placeholder logo.
- [ ] Feature graphic, screenshots, descriptions — Phase 7, not started.
