# StudySphere — Phase 1 Audit

Date: 2026-09-07
Scope: read-only. Nothing in the repo was modified to produce this document.

Repo root: `C:\Users\user\Documents\Study Sphere`
Live site: https://www.studysphere.it.com (Vercel, serving the repo root as a static site)

---

## 0. Corrections to the brief's stated assumptions

Before anything else — three things the brief assumed that the repo doesn't confirm:

1. **"Backend API base URL: none — everything is static + localStorage today" is wrong.** There is a real `server.js` (Express) in the repo root with endpoints for feedback delivery and a JSON-file "database" (`/api/health`, `/api/feedback`, `/api/db/sync`, `/api/db/student/:email`, `/api/db/admin/overview`). It is not deployed as a live API today — the production site (Vercel static hosting) returns 404 for every `/api/*` path — but the client already calls these endpoints opportunistically (`js/auth.js`, `js/feedback.js`) and silently falls back to localStorage-only / Web3Forms-only behavior when they fail. This matters for Phase 3: there is a half-built server contract already defining the shape of "sync," and it is currently insecure (see §1.4).
2. **`dist/` is not committed.** It's listed in `.gitignore` and `git log --all -- dist/` returns nothing. It does not need to be purged from git history — only deleted from disk and kept out of future commits.
3. **"Sage" and the "AI Notes Summarizer" are not AI features today.** Both are local, deterministic JavaScript (a keyword-matching chat widget in `app.js`, a TF/sentence-scoring heuristic in `smart-tools.js`) — no LLM, no network call, no provider key. Phase 3's "Sage and every AI feature route through a server endpoint" and Phase 5's "Sage — chat surface with access to the user's real tasks and schedule" both read as though an AI backend already exists partially. It doesn't. This needs a decision (see §1.2), not just a port.
4. **`desktop/`, `desktop-web/`, `mobile-web/` are not really "hand-maintained near-duplicates."** `desktop/` is genuine hand-authored Electron shell code (tracked in git, 3 files). `desktop-web/` and `mobile-web/` are 100% machine-generated on every build by `scripts/prepare-desktop.js` / `scripts/prepare-mobile.js` — byte-identical copies of the root site plus one injected `<script>` tag per HTML file. They have not drifted because nothing hand-edits them. Full detail in §1.3.

---

## 1.1 Android inventory

Source: `android/` (Capacitor wrapper, currently live on Google Play as `com.studysphere.app`).

| Field | Value |
|---|---|
| Wrapper framework | Capacitor 8 (`@capacitor/android` / `@capacitor/core` / `@capacitor/cli` `^8.3.4`) |
| `applicationId` | `com.studysphere.app` |
| `namespace` | `com.studysphere.app` |
| `versionCode` | `2` |
| `versionName` | `1.0.1` |
| `compileSdkVersion` | `36` |
| `targetSdkVersion` | `36` |
| `minSdkVersion` | `24` |
| Web dir bundled into the app | `mobile-web/` (per `capacitor.config.json` → `"webDir": "mobile-web"`, generated fresh by `cap sync`) |
| Signing | `android/app/build.gradle` reads `android/keystore.properties` (gitignored, present on disk) for `keyAlias`/`keyPassword`/`storeFile`/`storePassword`; keystore file referenced as `android/studysphere-upload.jks` per `PLAY_STORE_DEPLOYMENT.md` (gitignored, present on disk — **not lost**, do not regenerate) |
| Release build | `minifyEnabled true`, `shrinkResources true`, R8 + ProGuard (`proguard-rules.pro`), `debuggable false`, `jniDebuggable false` |
| Cleartext traffic | Disabled (`android:usesCleartextTraffic="false"`) |
| Backup | Disabled (`android:allowBackup="false"`) |
| Merged permissions | **`android.permission.INTERNET` only.** No location, storage, camera, contacts, notifications, or foreground-service permissions declared anywhere in the manifest. |
| Capacitor plugins registered | None beyond core (`capacitor.build.gradle`'s `dependencies {}` block is empty; no `@capacitor/push-notifications`, `@capacitor/splash-screen`, etc. as separate Gradle deps — splash screen is configured only via `capacitor.config.json` plugin config, not a native plugin dependency) |
| `google-services.json` | Not present — no Firebase/FCM wired in |
| Last recorded build | `BUILD_VERIFICATION.md` (dated 2026-06-03): AAB `StudySphere-v1.0.1-free-play-console.aab`, SHA-256 recorded, APK signature v2 verified, Play App Signing-compatible upload key used |

**Best available answer for §0 "existing versionCode on the closed track": `2`** (versionName `1.0.1`), per `android/app/build.gradle`, `RELEASE_CHECKLIST.md`, and `BUILD_VERIFICATION.md`. This is the last version actually built and, per those docs, uploaded. **Confirm directly against Play Console before setting the next `versionCode`** — these docs are self-reported at build time, not a live read of the console.

**Carried-forward assets that must not be touched or regenerated:**
- `android/studysphere-upload.jks` + `android/keystore.properties` (upload key — resetting this breaks updates to the existing Play listing)
- `applicationId com.studysphere.app`

---

## 1.2 Feature inventory

Read every `*.html` in the repo root and every file in `js/`, plus `server.js` and `sw.js`. Cross-checked the live site's homepage, `dashboard.html`, and `autopilot.html` against the local copies — **no divergence found**: same markup, same copy, same 14-card quick-access grid, same footer. (Caveat: the live check was markup-only, no JS execution, so it confirms content parity, not behavioral parity.)

**Architecture, in one paragraph:** every page loads `js/auth.js` + `js/app.js`, then one feature script. Everything is localStorage-first (keys prefixed `ss_*`); server calls exist in exactly two places (`js/auth.js`'s `syncAuthToServer()`, `js/feedback.js`'s backend-then-Web3Forms fallback) and both degrade silently on failure. No page requires a server to function — `feedback.html` is the only one with any real server dependency, and it has its own client-side fallback to a third party (Web3Forms) if the server isn't there.

### Page-by-page

| Page | What it does | Storage | Server needed? | Real logic |
|---|---|---|---|---|
| index.html | Animated landing page, nav | localStorage (nav state only) | No | Mostly cosmetic — `landing.js` (341 lines) drives a canvas globe animation |
| login.html | Student auto-registration + login, admin gate | localStorage; opportunistic `POST /api/db/sync` | No | ~150 of `auth.js`'s 487 lines |
| dashboard.html | Streak, stats, notifications, mood, exam countdown, subject balance, revision queue, achievements, quick-access grid | localStorage | No | Substantial — `dashboard.js` (417 lines): notification rules, achievement badges, spaced-revision math |
| tasks.html | Task CRUD, priority/subject/due date, filters | localStorage | No | Moderate — `tasks.js` (167 lines) |
| timer.html | Pomodoro timer, wall-clock-synced countdown, Web Audio beep | localStorage | No | Moderate — `timer.js` (223 lines), drift-resistant via `timerEndsAt` |
| autopilot.html | Generates a multi-day study schedule from goal/deadline/minutes/focus | localStorage | No | Substantial — `buildAutopilotPlan` in `smart-tools.js` (~130 of 632 lines) |
| planner.html | A **second, independent** day-by-day scheduler (goal/subject/deadline/hours/energy) | localStorage | No | Moderate — `planner.js` (197 lines), different algorithm from Autopilot |
| notes.html | Freeform notes + search | localStorage | No | Light — `features.js` (~20 lines) |
| summarizer.html | "AI Notes Summarizer": paste text → summary/keywords/checklist/quiz/flashcards | localStorage | No | Meaningful but **not AI** — local TF/sentence-scoring heuristic in `smart-tools.js`, no LLM call |
| exam-mode.html | Builds a daily revision sprint from a saved/manual exam | localStorage | No | Moderate — confidence→block-count mapping (~25 lines) |
| game.html | 5 arcade games (Tic-Tac-Toe, Block Blast, Memory, Focus Trail, Anagrams) | localStorage (high score only) | No | Substantial — `game.js` (562 lines) real game logic, cut from v1 per brief |
| calendar.html | Read-only weekly aggregation of tasks/exams/plans/groups | localStorage | No | Light-moderate (~40 lines), likely redundant with Planner per brief |
| reminders.html | "Due soon" feed + custom reminders; "Enable Alerts" button | localStorage | No | Moderate (~40 lines) — **button only requests `Notification` permission, no actual alarm/notification is ever scheduled** client-side |
| report.html | Weekly progress report, consistency %, weakest subject | localStorage | No | Moderate (~35 lines), ad hoc formula, no history persisted |
| onboarding.html | One-time profile/academic setup, seeds Autopilot/Sage/Report | localStorage (`ss_onboarding_<email>`, `ss_profile_<email>`) | No | Moderate — regex exam-date parser |
| profile.html | A **second** profile editor, writes the **same** `ss_profile_<email>` key as onboarding | localStorage | No | Light (~45 lines) — can silently clobber onboarding's fields depending on save order |
| flashcards.html | Flashcard CRUD, SM-2-like spacing (Hard +1d / Easy +4d) | localStorage | No | Light-moderate |
| grades.html | Weighted grade tracker | localStorage | No | Light |
| files.html | "File reference" list | localStorage | No | Minimal — **stores metadata only (name/type/size), never the actual file bytes; nothing can be retrieved.** Effectively non-functional as file storage. |
| groups.html | "Study Rooms" | localStorage | No | Minimal — **no real multi-user sync at all**, despite "coordinate with classmates" framing; single-browser local list |
| feedback.html | Feedback form | Server primary, Web3Forms client fallback | Degrades gracefully without one | Moderate — `feedback.js` (99 lines) |
| admin.html | Local analytics: logins, registered emails, consent rate, JSON export, raw snapshot of all `ss_*` data | Both (localStorage authoritative; backend panel no-ops without server) | No for local panel | Moderate (~160 lines) — see §1.4, this page renders every registered student's email/university/course in plaintext client-side to anyone past the (usually-disabled) gate |
| privacy.html | Static policy text | N/A | No | None — states no payments are processed, consistent with the code; Pesapal scaffolding in `.env.example`/`data/` is vestigial (see below) |

### Shared scripts (`js/`)

| Script | Lines | Loaded by | Role |
|---|---|---|---|
| `auth.js` | 487 | all pages except privacy.html | Session, registration, admin gate, route guard |
| `app.js` | 476 | all pages | Nav, streak, scroll effects, PWA/SW registration, and the **"Sage" assistant** |
| `smart-tools.js` | 632 | onboarding, autopilot, summarizer, exam-mode, reminders, report | Largest file — the real planning "engine" |
| `game.js` | 562 | game.html | 5 arcade games |
| `dashboard.js` | 417 | dashboard.html | Aggregation/rendering |
| `landing.js` | 341 | index.html | Canvas animation |
| `features.js` | 317 | notes, calendar, profile, flashcards, grades, files, groups | 6 independent CRUD features |
| `planner.js` | 197 | planner.html | Second scheduling engine |
| `timer.js` | 223 | timer.html | Pomodoro |
| `tasks.js` | 167 | tasks.html | Task CRUD |
| `feedback.js` | 99 | feedback.html | Dual-path submission |

**Important correction to how these features are marketed vs. how they work:** "Sage" (the chat assistant in `app.js`) and the "AI Notes Summarizer" are both **local rule-based/heuristic JavaScript, not LLM calls** — no network request, no AI provider involved today. The brief's Phase 5 step 8 ("Sage — chat surface with access to the user's real tasks and schedule") and Phase 3's mention of routing "Sage and every AI feature... through a server endpoint" both assume an AI backend that doesn't exist yet. **This is new build, not a port** — worth confirming with stakeholders whether "Sage" should become a real LLM-backed feature (needs a server endpoint + provider key, i.e. real Phase 3 scope) or stay a deterministic rule engine ported to TypeScript in `packages/shared` (much cheaper, no ongoing inference cost).

---

## 1.3 Duplication map

Diffed `desktop/`, `desktop-web/`, `mobile-web/`, `dist/` against the root site.

### `desktop-web/`
Full mirror of root: 24 HTML files, `assets/`, `css/style.css`, `js/` (all root JS files, byte-identical) plus one generated extra, `js/desktop-build.js`. Every HTML file differs from its root counterpart by exactly one injected line (`<script src="js/desktop-build.js"></script>`). That file sets `window.STUDYSPHERE_DESKTOP_BUILD = true` and `window.STUDYSPHERE_PLATFORM = "windows"` — currently **inert flags**, nothing in `js/` branches on them yet.
Regenerated by `scripts/prepare-desktop.js` (wipe + copy + patch), wired into `npm run desktop:dev` and `npm run windows:installer`. Consumed by `desktop/main.js` (`webRoot` hardcoded to `desktop-web/index.html`) and packaged into the Electron `asar` via `package.json`'s `build.files`. Gitignored, not committed.
**Verdict: safe to delete; regenerates exactly via `npm run prepare:desktop`.**

### `mobile-web/`
Same pattern: full mirror + one injected line per HTML file + a generated `js/mobile-build.js` setting `STUDYSPHERE_MOBILE_BUILD`, `STUDYSPHERE_PLATFORM = "android"`, and **`STUDYSPHERE_DISABLE_ADMIN = true`** — this one *is* load-bearing: `js/auth.js`'s `adminAccessDisabled()` checks it and hides the admin login tab in any Capacitor build. That behavior lives entirely in the 3-line generated marker file, not in a hand-forked copy of `auth.js` — so it is not drift, it's intentional generated config that will need an explicit equivalent in the new native app (admin must stay unreachable from the public build).
Regenerated by `scripts/prepare-mobile.js`, consumed by every `android:*`/`ios:*` npm script and by `cap sync` per `capacitor.config.json`'s `webDir: "mobile-web"`. Gitignored, not committed.
**Verdict: safe to delete; regenerates exactly via `npm run prepare:mobile`.**

### `desktop/`
Not a mirror at all — genuine hand-authored Electron main-process source (`main.js`, 47 lines) + two icon assets. `main.js` uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and routes all external links through `shell.openExternal` rather than in-window navigation — this is a properly configured Electron security posture, for what it's worth if desktop keeps shipping. **Tracked in git** (3 files).
**Verdict: keep. Not in scope for deletion — it's real source, not a duplicate.**

### `dist/`
Not an HTML/JS/CSS mirror — build/packaging output. ~688 MB: `dist/android/` (7 historical APK/AAB builds), `dist/ios/` (one zipped Xcode project), `dist/windows/` (electron-builder NSIS/portable output + unpacked asar/Chromium runtime), `dist/play-store-assets/` and `dist/play-store-assets-real/` (listing graphics; the latter also contains a stray ~61 MB headless-Chrome profile directory left over from a screenshot-automation run — pure debris).
Confirmed **not committed**: gitignored, `git log --all -- dist/` and `git ls-files dist/` both empty.
Only `dist/windows/` regenerates automatically (via `npm run windows:installer`); `dist/android/`, `dist/ios/`, and the Play asset folders have **no regeneration script** — they are manually produced artifacts.
**Verdict: safe to delete from a git-hygiene standpoint (nothing tracks it), but back up `dist/play-store-assets*/` (real listing graphics, minus the `chrome-dashboard/` debris) and the historical `dist/android/*.aab` if there is no other copy, before deleting.**

### Summary

| Directory | Git-tracked | Regenerated by script | Real drift from root | Verdict |
|---|---|---|---|---|
| `desktop-web/` | No | Yes (`prepare-desktop.js`) | None (1-line marker only) | Delete, regenerate as needed |
| `mobile-web/` | No | Yes (`prepare-mobile.js`) | Marker only, but the admin-disable flag is functionally real | Delete, regenerate as needed |
| `desktop/` | **Yes** | No — hand-authored | N/A, not a mirror | Keep (pending desktop-ship decision) |
| `dist/` | No, never committed | Partial (`dist/windows` only) | N/A, binaries | Delete after archiving anything without another copy |

---

## 1.4 Security triage

Ranked by severity. No secret **values** are reproduced below — only what exists and where.

### HIGH — Full backend source code is publicly downloadable from the live site
Vercel is serving the entire git working tree as static files, with no route restrictions beyond what's gitignored. Verified live:
- `GET https://www.studysphere.it.com/server.js` → **200**, `content-type: application/javascript`, full 6.2 KB source returned.
- `GET https://www.studysphere.it.com/scripts/prepare-mobile.js` and `.../scripts/prepare-desktop.js` → **200**, full source returned.
- By contrast `package.json`, `.env`, `.env.example`, `.git/HEAD`, `.git/config`, and every `data/*.json` path → **404**.

The 404s confirm the exposure is bounded by `.gitignore`, not by any server-side access control — anything not gitignored is being served verbatim, including source code that documents unauthenticated admin/data endpoints (see next finding) and a hardcoded feedback-recipient email address. This is not a data breach today because the sensitive files themselves are correctly gitignored, but it means **any file added to git in this repo is implicitly public**, and it hands an attacker the exact shape of the backend for free. Recommend: when `server/` is stood up in Phase 3, it must not live inside whatever directory Vercel serves as static content for `apps/web`, or it must be excluded via hosting config (not just `.gitignore`) — gitignore-only exposure control is fragile.

### HIGH — Every backend data endpoint in `server.js` is unauthenticated
`/api/db/sync` (POST — writes/overwrites a student record for any email supplied in the body), `/api/db/student/:email` (GET — returns any student's record by guessing/knowing their email), and `/api/db/admin/overview` (GET — returns **every** student record and the last 200 activity events, no auth check at all) have zero authentication or authorization. Today this is low-impact only because the Express server isn't actually running in production (confirmed: `/api/health` 404s live) — it only runs when someone executes `node server.js` locally or in the Electron desktop build. But `js/auth.js` and `js/feedback.js` are already wired to call these endpoints opportunistically from the deployed static site, silently swallowing the failure. **This is a live design defect that must not be carried into the Phase 3 server** — any real backend needs per-request auth before these routes do anything beyond local dev.

### MEDIUM — Client-side "auth" stores plaintext passwords in localStorage
`js/auth.js`'s `upsertStudent()` stores the full signup payload — including `password` in plaintext — in the `ss_students` localStorage array, and compares plaintext on next login (`existing.password !== profile.password`). There is no hashing, no server round-trip, no cross-device account concept: this is a per-browser profile store, not authentication. It is also exactly what it looks like to a student — nothing hidden or obfuscated — but plaintext password storage on-device is still a real weakness (shared/lab computers, browser extensions, device theft, XSS in any future feature). **Client-side auth must be fully removed in Phase 3, not incrementally hardened** — confirmed as explicitly in scope already (brief's Phase 3 plan is correct here).

### MEDIUM — `admin.html` renders every registered user's PII client-side, gated only by the (currently-dead) password check
Independent of the never-running backend endpoint, `initAdminPage()` in `auth.js` reads the entire `ss_students` localStorage array on the device and renders every registered student's email, name, university, and course in plaintext into the page — plus a full JSON export button and a raw snapshot of every `ss_*` key on that device. Today this is low-risk because (a) it only ever shows data for accounts created *on that specific browser/device* — localStorage isn't shared — and (b) the gate in front of it is currently unconditionally closed (see below). But the pattern itself — an "admin view" that trusts a client-side boolean to decide whether to render sensitive data it already fetched into the DOM — is exactly the anti-pattern to not carry forward. Rebuild as a server-rendered/role-checked route in Phase 3, not a client-gated one.

### LOW — Admin panel is dead code today, but its guard pattern is a warning sign for later
`admin.html` / `initAdminPage()` gates on `getCurrentUser().role === 'admin'`, and the admin login form additionally checks `password !== ADMIN_PASSWORD` where `ADMIN_PASSWORD = window.STUDYSPHERE_ADMIN_PASSWORD || ""`. That global is **never set anywhere** in the current source (`login.html`, all other HTML, all of `js/`) — confirmed by grep across the whole repo — so admin login always fails and the tab is disabled by `configureAdminAccessNotice()`. `scripts/prepare-mobile.js` additionally force-sets `STUDYSPHERE_DISABLE_ADMIN = true` for every Capacitor build, hiding the tab entirely on mobile. **Today: no exposure.** The risk is only that the code is *structured* to accept a real password via a global if one is ever set — if a future dev sets `window.STUDYSPHERE_ADMIN_PASSWORD` to a real value anywhere in shipped HTML/JS, it becomes a plaintext credential visible to anyone who views source, including inside the Android app's bundled assets. `admin.html` must be rebuilt behind server-side role checks in Phase 3 as already planned; the client-side gate should be deleted outright, not reused.

### INFORMATIONAL — Two separate Web3Forms keys exist by design, not by accident
`server.js` reads `WEB3FORMS_ACCESS_KEY` from `.env` (server-side; used for the `/api/feedback` backend path), and `js/feedback.js` has its own hardcoded `WEB3FORMS_PUBLIC_ACCESS_KEY` constant for the direct-from-browser fallback path. These are two different key values. Web3Forms access keys are designed to be public/client-embeddable (they identify a form endpoint, not an account secret), so the hardcoded client key is not a vulnerability by Web3Forms' own threat model — flagged only for completeness, not as a finding requiring a fix.

### Confirmed clean
- `.env` (holds `PORT`, `APP_URL`, `WEB3FORMS_ACCESS_KEY`, and per `.env.example` — `PESAPAL_*`, `PREMIUM_PRICE_*` — key **names** only, not reproduced here) is correctly gitignored and `git log --all -- .env` returns nothing: **never committed**.
- All four `data/*.json` files are correctly gitignored, never committed (`git log --all -- data/` empty), and unreachable over HTTP on the live site (404). Their current contents are harmless demo/test data (one demo student record, two test feedback entries against `example.com` and the project's own domain, empty Pesapal/premium arrays) — not real user PII.
- No Pesapal, Stripe, or premium/billing logic remains anywhere in `js/` — fully removed from the app layer already, consistent with `BUILD_VERIFICATION.md`'s note that payment references were stripped for this release. Only `server.js` and `.env.example` retain Pesapal env-var scaffolding for a feature that isn't wired into any client page.
- No hardcoded API keys, tokens, or credentials found via pattern search across `js/*.js` and `*.html` beyond the two Web3Forms keys noted above.
- `desktop/main.js` (Electron) uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — correctly configured, no renderer-to-Node bridge exposed.
- `ios/` is an unconfigured Capacitor scaffold — no `GoogleService-Info.plist`, no push certs, nothing sensitive.
- Android manifest requests only `INTERNET`; no over-broad permissions to trim.

---

## 1.5 Verdict

**Worth carrying forward as-is (port the logic, not the code):**
- `smart-tools.js` (632 lines — Autopilot, Summarizer's heuristic, Exam Mode, Reminders aggregation, Report formula) and `planner.js` (197 lines, second scheduler) — this is the real product. Extract into `packages/shared`, port to TypeScript, unit test. **But first resolve the duplication**: Autopilot and Planner are two independently-written scheduling engines solving the same problem differently. Pick one algorithm (or deliberately merge the better parts of both) before porting — don't carry both forward as-is, that just moves today's confusion into TypeScript.
- `tasks.js`, `timer.js` (drift-resistant wall-clock timer logic is worth keeping exactly), `dashboard.js`'s aggregation rules, `exam-mode.html`'s confidence→block-count mapping.
- The Android signing identity (`com.studysphere.app`, upload keystore, `versionCode 2`) — non-negotiable, already compliant with `targetSdk 36`/`minSdk 24`.
- `desktop/main.js`'s Electron security configuration (`contextIsolation`/`sandbox`/`nodeIntegration: false`), if desktop keeps shipping.
- The site's information architecture as a feature checklist — the page list is a good product spec even though every implementation is being replaced.

**Worth rewriting from scratch, not porting:**
- All of `js/auth.js` — client-side plaintext-password "auth" has no place in the rebuild; Phase 3's server-side auth replaces it entirely.
- `admin.html` and its client-side gate — replace with a server-role-gated route (see §1.4 MEDIUM finding).
- `server.js`'s data endpoints — the shape (student sync, activity log) is a reasonable starting contract, but every endpoint needs auth added before it's trustworthy; don't copy it forward unauthenticated, and don't deploy it into whatever directory gets served as static content (see §1.4 HIGH finding on source exposure).
- "Sage" and the summarizer's "AI" framing — decide first whether these become real LLM features (new Phase 3 scope: provider key, server endpoint, cost) or stay deterministic (cheap TypeScript port). The brief assumes the former without flagging it as new work; recommend confirming with the user before Phase 5 commits to a chat-with-real-schedule-access Sage.
- `files.html` and `groups.html` — both are more UI mockup than feature today (no file storage, no multi-user sync). Either build them for real on native (device file picker + local storage; real backend-mediated groups) or cut them from v1 alongside games/campus-pulse — they don't currently do what their copy claims.
- `reminders.html`'s notification button — requests permission but schedules nothing. Native local deadline notifications (already in the brief's Tasks phase) supersede this entirely; nothing to port beyond the due-date aggregation math.

**Needs a design decision before porting, not just cleanup:**
- `profile.html` and `onboarding.html` write the same `ss_profile_<email>` key from two different screens and can clobber each other's fields depending on save order. The native app should have exactly one source of truth for profile data.
- Pesapal/premium scaffolding (`.env.example`, `data/pesapal-orders.json`, `data/premium-users.json`) is vestigial — not wired into any route or page. Confirm with the user whether monetization is actually planned before deciding to drop it from the rebuild entirely or design it properly in Phase 3's schema.

**Structurally fine, just needs cleanup, not a rewrite:**
- `desktop-web/`, `mobile-web/` — delete, they're generated, no data loss (see §1.3).
- `dist/` — delete after archiving anything in `dist/android/`, `dist/ios/`, `dist/play-store-assets*/` that has no other copy; purge the `chrome-dashboard/` debris regardless (see §1.3).
