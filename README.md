# StudySphere

StudySphere is a student productivity hub with tasks, planner, timer, notes, flashcards, grades, files, study rooms, games, Sage assistant, local auth, admin tools, Premium gating, Study Autopilot, reminders, Exam Mode, weekly reports, and installable PWA support.

## Run Static Version

Open `index.html` in a browser, or serve the folder with any static server. Static mode keeps Premium in demo/local mode only.

## Smart Student System

- `onboarding.html` captures student setup: university, course, subjects, weak areas, exam dates, availability, and semester goal.
- `autopilot.html` builds a full study schedule from goals, deadlines, focus areas, and daily minutes.
- `reminders.html` combines tasks, exams, plans, custom reminders, and renewal dates into one reminder feed.
- `summarizer.html` turns pasted notes into summaries, keywords, revision checklists, quiz questions, and flashcards.
- `exam-mode.html` creates exam revision sprints and mock questions.
- `groups.html` works as Study Rooms with members, session goals, links, and shared notes.
- `report.html` generates a weekly progress report from local study activity.

## Installable App

The app includes `manifest.json`, `sw.js`, and an SVG app icon. When served over `localhost` or HTTPS, browsers that support PWAs can install StudySphere like an app.

## Run With Pesapal Backend

1. Install dependencies:

```bash
npm install
```

2. Copy environment settings:

```bash
copy .env.example .env
```

3. Add your Pesapal credentials to `.env`:

```env
PESAPAL_ENV=sandbox
PESAPAL_CONSUMER_KEY=your_consumer_key
PESAPAL_CONSUMER_SECRET=your_consumer_secret
PESAPAL_IPN_ID=your_registered_ipn_id
PREMIUM_PRICE_AMOUNT=250
PREMIUM_PRICE_CURRENCY=KES
APP_URL=http://localhost:4242
```

4. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:4242
```

## Pesapal IPN Setup

Pesapal API 3.0 requires an IPN ID when submitting an order. Register your public backend URL with Pesapal:

```text
https://your-domain.com/api/pesapal-ipn
```

Use `POST` as the IPN notification method. Put the returned IPN ID in `.env` as:

```env
PESAPAL_IPN_ID=...
```

For local development, `localhost` cannot receive Pesapal IPNs. Use a deployed URL or a secure tunnel, then set `APP_URL` to that public URL.

## Premium Payment Flow

- `POST /api/create-pesapal-order` creates a Pesapal checkout order.
- `/api/pesapal-callback` checks payment status after the student returns from Pesapal.
- `/api/pesapal-ipn` verifies payment status from Pesapal notifications.
- `GET /api/premium-status?email=student@example.com` returns server-side Premium status.

Completed payments activate StudySphere Premium for one month at `KES 250/month`.

## Backend Data Foundation

When the Express backend is running, local login events can sync to:

```text
POST /api/db/sync
GET /api/db/student/:email
GET /api/db/admin/overview
POST /api/db/payment-event
```

Data is stored in `data/studysphere-db.json` for development. This is a stepping stone before moving to a production database.

## Important Security Notes

- Do not commit `.env`.
- Pesapal consumer secrets must stay on the server.
- The current student login is still local/demo auth. Production accounts should move to a real backend database and password hashing.
- Server-side Premium status and the development database are stored as JSON files in `data/`. A production app should use a managed database.
