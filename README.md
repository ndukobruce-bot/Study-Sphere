# StudySphere

StudySphere is a free student productivity hub with tasks, planner, timer, notes, flashcards, grades, files, study rooms, games, Sage assistant, local auth, admin tools, Study Autopilot, reminders, Exam Mode, weekly reports, and installable PWA support.

## Run Static Version

Open `index.html` in a browser, or serve the folder with any static server.

## Smart Student System

- `onboarding.html` captures student setup: university, course, subjects, weak areas, exam dates, availability, and semester goal.
- `autopilot.html` builds a full study schedule from goals, deadlines, focus areas, and daily minutes.
- `reminders.html` combines tasks, exams, plans, and custom reminders into one reminder feed.
- `summarizer.html` turns pasted notes into summaries, keywords, revision checklists, quiz questions, and flashcards.
- `exam-mode.html` creates exam revision sprints and mock questions.
- `groups.html` works as Study Rooms with members, session goals, links, and shared notes.
- `report.html` generates a weekly progress report from local study activity.

## Installable App

The app includes `manifest.json`, `sw.js`, and an SVG app icon. When served over `localhost` or HTTPS, browsers that support PWAs can install StudySphere like an app.

## Optional Local Backend

The Express backend serves the same free app and stores development data for admin/testing.

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Open:

```text
http://localhost:4242
```

## Backend Data Foundation

When the Express backend is running, local login events can sync to:

```text
POST /api/db/sync
GET /api/db/student/:email
GET /api/db/admin/overview
```

Data is stored in `data/studysphere-db.json` for development. This is a stepping stone before moving to a production database.

## Important Security Notes

- Do not commit `.env`.
- The current student login is still local/demo auth. Production accounts should move to a real backend database and password hashing.
- The development database is stored as JSON in `data/`. A production app should use a managed database.
