# Store screenshot pipeline

**Not run in this environment** — capturing real screenshots needs a
booted Android emulator or a connected device, neither of which exists
here (see docs/PROGRESS.md). This is a ready-to-run pipeline, not a
placeholder: every command below is real and does what it says once you
have a device.

## Why this exists

Screenshots of empty screens are worthless for a listing. This pipeline
seeds realistic demo data through the app's own UI (Onboarding + Autopilot
— the same flow a real user goes through, not a database fixture that
could drift from what the app actually produces), captures the six listing
screens in order, then composites each into a device frame with a benefit
headline.

## Prerequisites

- A running Android emulator or connected device with the app installed
  (`eas build --profile preview` + install the APK, or `expo run:android`
  if you have the Android SDK locally).
- [Maestro](https://maestro.mobile.dev) installed (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
- `npm install sharp` inside this directory (device-frame compositing).

## Run it

```bash
cd scripts/screenshots
npm install
maestro test seed-and-capture.yaml   # seeds demo data, captures 6 raw PNGs into ./raw/
node compose-frames.js               # composites ./raw/*.png into ./output/*.png
```

Output lands in `scripts/screenshots/output/`, named to match the listing
order in `store/listing.md`: `01-autopilot.png` through `06-exam-mode.png`,
each 1080×1920 with the device frame and headline baked in.

## Files

- `seed-and-capture.yaml` — the Maestro flow. Runs onboarding with
  realistic values, generates a real Autopilot plan, adds a couple of
  tasks, summarizes a real chunk of text, and takes a screenshot at each
  of the six target screens.
- `compose-frames.js` — loads each raw capture, places it inside a simple
  device-frame outline (drawn programmatically, not a stock image asset —
  see its header comment), and overlays the matching headline from
  `headlines.json`.
- `headlines.json` — the one-line benefit headline per screen, kept out of
  the flow file so copy can be edited without touching the capture logic.
