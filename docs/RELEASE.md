# StudySphere Mobile — Release Guide

This environment has no EAS/Expo account login, no Android SDK, no
emulator, and no connected device (see docs/PROGRESS.md). Every command
below is exact and ready to run, but none of them have been run here —
run them yourself from `apps/mobile/`.

## 0. Before you touch anything

Copy `../studysphere-backup/keystore/` (created during this session,
outside the repo, one level above `Study Sphere/`) to your own cloud
storage or a second drive. If that folder is lost, `com.studysphere.app`
can never be updated on Play again — there is no way to recover an upload
key. This is the single most important thing in this whole release
process and it's on you, not something an agent can do on your behalf.

## 1. Confirm the real versionCode

`android/app/build.gradle` in the old Capacitor project (now deleted, but
recorded in docs/AUDIT.md) had `versionCode 2`. `apps/mobile/app.json` is
set to `versionCode 3` on that assumption. **Before building, open Play
Console → your app → Release → check the highest versionCode across every
track (including any drafts).** If it's higher than 2, set
`apps/mobile/app.json`'s `android.versionCode` to (that number + 1) before
building.

## 2. Link the existing upload key to EAS

```
cd apps/mobile
eas login
eas credentials
```
Choose Android → your project → "Set up a new keystore" → **no** — instead
pick the option to upload an existing keystore, and point it at
`../studysphere-backup/keystore/studysphere-upload.jks`, using the alias
and passwords from `../studysphere-backup/keystore/keystore.properties`.
**Do not let EAS generate a new keystore.** A new keystore cannot update
the existing Play listing.

## 3. Build

```
cd apps/mobile
eas build --profile production --platform android
```
This produces a signed `.aab` using the linked upload key. `eas.json`'s
`production` profile already sets `autoIncrement: "versionCode"` and
`buildType: "app-bundle"`.

## 4. Verify the build before uploading

```
# Download the .aab EAS gives you a link to, then:
unzip -l app.aab | head -50
mkdir aab-inspect && cd aab-inspect
unzip ../app.aab
grep -riE "pesapal|password|api[_-]?key|token|@gmail|web3forms" -r base/ || echo "clean"
```
Expected: `clean`. Nothing in `apps/mobile` calls a server, embeds a
credential, or references Pesapal — see docs/PLAY_CHECKLIST.md for why.

## 5. Push to the closed testing track

```
eas submit --profile production --platform android
```
`eas.json`'s `submit.production.android.track` is currently set to
`"internal"` as a placeholder — **change it to match whatever your
existing closed-testing track is actually named/IDed in Play Console**
before running this (this environment has no Play Console access to
confirm the exact track name/ID; check under Testing → Closed testing in
the console). Alternatively, skip `eas submit` and upload the `.aab`
manually through the Play Console UI, same as the previous release.

## 6. After it's live on the closed track

- Complete/verify the Data Safety form ("No data collected") —
  docs/PLAY_CHECKLIST.md has the reasoning.
- Confirm `apps/web/privacy.html` is live at
  `https://www.studysphere.it.com/privacy.html` (it already is — this repo
  didn't change the deploy target, only the content).
- Smoke test on a real device: onboarding → add a task → generate an
  Autopilot plan → run a focus session → summarize a note → export data →
  delete all data → import it back. This has not been done by anyone yet;
  do it before applying for production.
- Once the pre-launch report comes back clean and you're satisfied with
  the manual smoke test, apply for production access the same way you did
  for the original closed testing round (see docs/legacy/
  PLAY_STORE_DEPLOYMENT.md for the account/console navigation, which
  hasn't changed).

## Release notes template

```
StudySphere 2.0 — a native app, not a wrapper

- Rebuilt from the ground up as a real Android app — no more web view.
- Works fully offline. Nothing you create ever leaves your phone unless
  you choose to export it.
- One scheduler (Autopilot) instead of two that didn't agree with each
  other.
- Real reminders: tasks with a due date now actually notify you.
- A cleaner look, built for one-handed use.
- Export and import your data any time from Settings.
```
