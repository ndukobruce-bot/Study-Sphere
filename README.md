# StudySphere

A student productivity monorepo: a website, a native Android app, a desktop
shell, and the domain logic they share — three separate things, one set of
rules. See `docs/AUDIT.md` for how this repo got here and `docs/PROGRESS.md`
for current status.

## Layout

```
apps/
  web/       the website (static HTML/CSS/JS, no build step) - deploys to Vercel as-is
  mobile/    the native Android/iOS app (Expo + React Native + TypeScript)
  desktop/   the Electron shell wrapping apps/web
packages/
  shared/    pure TypeScript domain logic used by apps/mobile (scheduling,
             revision, timer, summarizer, Sage, date math) - fully unit
             tested, no React, no I/O
store/       Play Store listing assets and copy
docs/        audit, design system, Play compliance checklist, release guide
docs/legacy/ old Android/Play docs describing the retired Capacitor build
```

## Working on the website (`apps/web`)

No build step. Serve the folder with anything:

```bash
cd apps/web
npm run dev   # npx serve . -l 4242
```

The old Express backend (`server.js`) and its unauthenticated data
endpoints were removed — see `docs/AUDIT.md`'s security triage for why.
The site is fully static and always has been in production (Vercel never
ran the old server); nothing about how the site behaves changed.

## Working on the mobile app (`apps/mobile`)

```bash
pnpm install          # from the repo root
cd apps/mobile
npm start             # expo start
```

Zero backend, zero accounts by design — every task, plan, note, and
flashcard lives in an on-device SQLite database (`src/db/`). Settings has
export/import for moving to a new phone. See `docs/DESIGN.md` for the
design system and `docs/PLAY_CHECKLIST.md` / `docs/RELEASE.md` before
shipping a build.

## Working on shared logic (`packages/shared`)

```bash
cd packages/shared
npm test        # vitest
npm run typecheck
```

If you're changing scheduling, revision spacing, the timer, or Sage's
advice, it lives here — not duplicated in `apps/mobile`.

## Working on the desktop shell (`apps/desktop`)

```bash
cd apps/desktop
npm run dev              # packages apps/web into an Electron window
npm run windows:installer
```

## Security

No secret, API key, or user record should ever exist in anything a client
downloads. `apps/mobile` has no server calls at all in v1. If a server is
added later (accounts, sync — queued for v1.1 per `docs/PROGRESS.md`), it
must not live inside whatever directory gets deployed as `apps/web`'s
static content — see `docs/AUDIT.md`'s finding on `server.js` having been
publicly downloadable from the old deployment.
