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

## Foreground service

- **Deviation, documented, not silently skipped.** The Focus timer does
  **not** use a true Android foreground service. Implementing one correctly
  needs a custom native module or config plugin beyond what stock Expo
  modules provide out of the box — bigger scope than this pass. Instead:
  the countdown is derived from a stored end-timestamp (survives the JS
  timer being suspended in the background) and a local notification is
  scheduled for session-end via `expo-notifications`, so the user is still
  alerted when a session finishes even while backgrounded. This is a
  real, working fallback, not a stub — but it is not the persistent
  live-countdown notification a true foreground service would show, and no
  `FOREGROUND_SERVICE` permission or service type is declared because none
  is implemented. If Play's minimum-functionality review flags this,
  the next step is `expo-task-manager` + a custom dev client.

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
- [ ] **TODO** — `apps/web/privacy.html` needs a pass to describe the
  **mobile app's** actual data practice (fully local, no account) in
  addition to what it already says about the website. Not yet rewritten in
  this pass — flagged for the next one.

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
