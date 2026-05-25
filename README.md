# StudySphere

StudySphere is a student productivity hub with tasks, planner, timer, notes, flashcards, grades, files, groups, games, Sage assistant, local auth, admin tools, and Premium gating.

## Run Static Version

Open `index.html` in a browser, or serve the folder with any static server. Static mode keeps Premium in demo/local mode only.

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

## Important Security Notes

- Do not commit `.env`.
- Pesapal consumer secrets must stay on the server.
- The current student login is still local/demo auth. Production accounts should move to a real backend database and password hashing.
- Server-side Premium status is stored in `data/premium-users.json` for now. A production app should use a real database.
