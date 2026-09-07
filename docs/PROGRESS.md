# StudySphere v2 — Progress

Last updated: 2026-09-07

## Environment constraints (read this first)

This session has **no Android SDK, no emulator, no connected physical device,
and no Expo/EAS account login**. That caps what "done" can mean here:

- Code that can be typechecked, unit-tested, or run via Metro/Expo web preview
  is verified and reported as such.
- EAS cloud builds, Play Console submission, and on-device/emulator smoke
  tests are **not run** — they need your accounts and hardware. Every such
  step is written up as an exact command or checklist item for you to run,
  never claimed as done.

## Done

- **Step 0 — Archive.** Upload keystore + `keystore.properties` + all
  historical `.aab`/`.apk` builds + Play listing graphics (with the
  ~61MB stray Chrome-automation debris purged) copied to
  `../studysphere-backup/` and the keystore hash-verified against the
  original before anything was deleted. **You still need to copy
  `../studysphere-backup/keystore/` to your own cloud storage** — see the
  final report.
- **Step 1 — Restructure.**
  - `apps/web`: the site moved verbatim, verified serving correctly
    locally (spot-checked index/dashboard/css/js/assets all 200).
  - `apps/desktop`: Electron shell moved, `prepare-desktop.js` and
    `create-windows-icon.js` repointed at the new paths (icon script no
    longer depends on the deleted `android/`/`ios/` mipmaps — it
    generates its own sizes).
  - Deleted: `android/`, `ios/`, `mobile-web/`, `desktop-web/`, `dist/`
    (688MB, never committed), `server.js`, `data/`, `capacitor.config.json`,
    `scripts/prepare-mobile.js`, `.env.example`, old root `package-lock.json`.
  - Archived the stale Android/Play docs into `docs/legacy/`.
  - pnpm workspace set up (`pnpm-workspace.yaml`), new root `.gitignore`.
  - **Deviation from the brief:** `admin.html`, `js/auth.js`, `files.html`,
    `groups.html`, `grades.html`, `game.html`, `calendar.html`,
    `report.html` were **not deleted** from `apps/web`. Every page on the
    live site loads `js/auth.js` for session/nav logic; deleting it would
    break navigation and script tags across the whole live site, directly
    contradicting "apps/web must keep serving identically." Read literally,
    "cut from v1" and "delete admin.html/js/auth.js" were describing the
    **mobile app's** scope, not the live website's. Kept the website
    intact; simply didn't port those pages/that logic into
    `packages/shared` or `apps/mobile`.
  - `packages/shared` extracted and ported to TypeScript with 76 passing
    unit tests (`pnpm --filter @studysphere/shared test`) and a clean
    strict-mode typecheck (`pnpm --filter @studysphere/shared typecheck`):
    `scheduler.ts` (merged Autopilot+Planner), `summarizer.ts`, `sage.ts`,
    `revision.ts`, `streaks.ts`, `timer.ts`, `dates.ts`. Fixed one latent
    UTC/local-date bug found while porting (see the commit message on
    `732c2e1`).

## In progress

- `apps/mobile` — Expo scaffold.

## Next

- Wire up `packages/shared` inside `apps/mobile`, build screens in the
  order the brief specifies (Onboarding → Home → Tasks → Autopilot →
  Timer → Notes/Summarizer → Flashcards/Exam mode → Sage → Settings).
- `docs/DESIGN.md` (token file, both themes) — carrying the existing
  navy/cyan brand forward per the v2 decision, not a from-scratch system.
- Restore the archived keystore into EAS credential config once
  `apps/mobile` has an Android project to sign.

## Blocked on you (not on more agent work)

- **EAS account login** (`eas login`) — builds can't be triggered without it.
- **Play Console access** — versionCode verification against the live
  closed track, and the actual submission, both require your login.
- **A physical Android device or emulator** — this environment has no
  Android SDK, no emulator, and no connected device. I can get the app
  running via Metro/Expo web preview and verify logic with unit tests,
  but the actual on-device smoke test in Step 4/6 needs to happen on
  your machine or a real device.
- **Copying `../studysphere-backup/keystore/` off this machine.** If that
  folder is lost, `com.studysphere.app` can never be updated on Play
  again — this is not something I can do on your behalf (cloud upload
  needs your credentials).

## Queued for v1.1 (explicitly out of scope for this build)

- Accounts, server-side auth, cross-device sync (decision 1).
- Real LLM-backed Sage, behind the seam already left in `sage.ts`.
- Games, files, groups, grades, calendar, report — cut from v1 (decision 6).
