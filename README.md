# StudySphere

StudySphere is a student productivity hub with tasks, planner, timer, notes, flashcards, grades, files, groups, games, Sage assistant, local auth, admin tools, and Premium gating.

## Run Static Version

Open `index.html` in a browser, or serve the folder with any static server.

## Run With Stripe Backend

1. Install dependencies:

```bash
npm install
```

2. Copy environment settings:

```bash
copy .env.example .env
```

3. In Stripe Dashboard, create a recurring monthly price for **$1.99 USD** and put its price id in `.env` as `STRIPE_PRICE_ID`.

4. Add your test secret key:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:4242
```

5. Start the app:

```bash
npm start
```

6. Open:

```text
http://localhost:4242
```

## Stripe Webhook

For local testing, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:4242/api/stripe-webhook
```

Copy the `whsec_...` value into `.env` as `STRIPE_WEBHOOK_SECRET`.

For production, create a webhook endpoint in Stripe pointing to your deployed backend:

```text
https://your-domain.com/api/stripe-webhook
```

The backend listens for:

- `checkout.session.completed`
- `customer.subscription.deleted`

## Important Security Notes

- Do not commit `.env`.
- Stripe secret keys must stay on the server.
- The current student login is still local/demo auth. Production accounts should move to a real backend database and password hashing.
- Server-side Premium status is stored in `data/premium-users.json` for now. A production app should use a real database.
