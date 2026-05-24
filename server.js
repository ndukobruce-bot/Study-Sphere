const fs = require("fs");
const path = require("path");
const express = require("express");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4242;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripePriceId = process.env.STRIPE_PRICE_ID || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;

const dataDir = path.join(__dirname, "data");
const premiumPath = path.join(dataDir, "premium-users.json");

function ensureDataStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(premiumPath)) fs.writeFileSync(premiumPath, "{}");
}

function readPremiumUsers() {
  ensureDataStore();
  return JSON.parse(fs.readFileSync(premiumPath, "utf8"));
}

function writePremiumUsers(users) {
  ensureDataStore();
  fs.writeFileSync(premiumPath, JSON.stringify(users, null, 2));
}

function setPremium(email, patch) {
  const users = readPremiumUsers();
  const normalized = String(email || "").toLowerCase();
  if (!normalized) return;
  users[normalized] = {
    ...(users[normalized] || {}),
    email: normalized,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  writePremiumUsers(users);
}

app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(503).send("Stripe webhook is not configured.");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], stripeWebhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.metadata && session.metadata.email ? session.metadata.email : session.customer_email;
    setPremium(email, {
      plan: "premium",
      paymentStatus: "paid",
      stripeCustomerId: session.customer || "",
      stripeSubscriptionId: session.subscription || "",
      premiumStartedAt: new Date().toISOString()
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const users = readPremiumUsers();
    Object.keys(users).forEach(email => {
      if (users[email].stripeSubscriptionId === subscription.id) {
        setPremium(email, {
          plan: "free",
          paymentStatus: "cancelled",
          cancelledAt: new Date().toISOString()
        });
      }
    });
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    stripeConfigured: Boolean(stripe && stripePriceId && stripeWebhookSecret)
  });
});

app.get("/api/premium-status", (req, res) => {
  const email = String(req.query.email || "").toLowerCase();
  const users = readPremiumUsers();
  res.json(users[email] || { email, plan: "free", paymentStatus: "none" });
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!stripe || !stripePriceId) {
    return res.status(503).json({
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to .env."
    });
  }

  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "A logged-in student email is required." });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/billing.html?checkout=success`,
      cancel_url: `${appUrl}/billing.html?checkout=cancelled`,
      metadata: { email }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  ensureDataStore();
  console.log(`StudySphere running at ${appUrl}`);
});
