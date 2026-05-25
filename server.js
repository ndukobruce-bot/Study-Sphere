const fs = require("fs");
const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4242;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;
const pesapalEnvironment = process.env.PESAPAL_ENV || "sandbox";
const pesapalBaseUrl = pesapalEnvironment === "live"
  ? "https://pay.pesapal.com/v3"
  : "https://cybqa.pesapal.com/pesapalv3";
const pesapalConsumerKey = process.env.PESAPAL_CONSUMER_KEY || "";
const pesapalConsumerSecret = process.env.PESAPAL_CONSUMER_SECRET || "";
const pesapalIpnId = process.env.PESAPAL_IPN_ID || "";
const premiumAmount = Number(process.env.PREMIUM_PRICE_AMOUNT || 250);
const premiumCurrency = process.env.PREMIUM_PRICE_CURRENCY || "KES";

const dataDir = path.join(__dirname, "data");
const premiumPath = path.join(dataDir, "premium-users.json");
const ordersPath = path.join(dataDir, "pesapal-orders.json");
const databasePath = path.join(dataDir, "studysphere-db.json");

let tokenCache = { token: "", expiresAt: 0 };
let ipnCache = { id: pesapalIpnId };

function ensureDataStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(premiumPath)) fs.writeFileSync(premiumPath, "{}");
  if (!fs.existsSync(ordersPath)) fs.writeFileSync(ordersPath, "{}");
  if (!fs.existsSync(databasePath)) fs.writeFileSync(databasePath, JSON.stringify({
    students: {},
    activity: [],
    payments: [],
    createdAt: new Date().toISOString()
  }, null, 2));
}

function readJson(filePath, fallback) {
  ensureDataStore();
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDataStore();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readPremiumUsers() {
  return readJson(premiumPath, {});
}

function writePremiumUsers(users) {
  writeJson(premiumPath, users);
}

function readOrders() {
  return readJson(ordersPath, {});
}

function writeOrders(orders) {
  writeJson(ordersPath, orders);
}

function readDatabase() {
  return readJson(databasePath, { students: {}, activity: [], payments: [] });
}

function writeDatabase(database) {
  writeJson(databasePath, database);
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

function setOrder(reference, patch) {
  const orders = readOrders();
  orders[reference] = {
    ...(orders[reference] || {}),
    reference,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  writeOrders(orders);
  return orders[reference];
}

function syncStudentRecord(email, patch) {
  const normalized = String(email || "").toLowerCase();
  if (!normalized) return null;
  const database = readDatabase();
  database.students[normalized] = {
    ...(database.students[normalized] || {}),
    email: normalized,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  writeDatabase(database);
  return database.students[normalized];
}

function appendActivity(event) {
  const database = readDatabase();
  database.activity.push({
    id: Date.now() + Math.random(),
    ...event,
    at: new Date().toISOString()
  });
  database.activity = database.activity.slice(-1000);
  writeDatabase(database);
}

function addMonth(date) {
  const expires = new Date(date);
  expires.setMonth(expires.getMonth() + 1);
  return expires;
}

function assertPesapalConfigured() {
  if (!pesapalConsumerKey || !pesapalConsumerSecret) {
    const message = "Pesapal is not configured. Add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET to .env.";
    const error = new Error(message);
    error.statusCode = 503;
    throw error;
  }
}

async function pesapalRequest(endpoint, options = {}) {
  const response = await fetch(`${pesapalBaseUrl}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || data.error?.code || data.message || `Pesapal request failed with status ${response.status}`);
  }
  return data;
}

async function getPesapalToken() {
  assertPesapalConfigured();
  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 30000) {
    return tokenCache.token;
  }

  const data = await pesapalRequest("/api/Auth/RequestToken", {
    method: "POST",
    body: JSON.stringify({
      consumer_key: pesapalConsumerKey,
      consumer_secret: pesapalConsumerSecret
    })
  });

  tokenCache = {
    token: data.token,
    expiresAt: data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 240000
  };
  return tokenCache.token;
}

async function registerPesapalIpn(token) {
  if (ipnCache.id) return ipnCache.id;

  if (/localhost|127\.0\.0\.1/i.test(appUrl)) {
    const error = new Error("Pesapal needs a public IPN URL. Add PESAPAL_IPN_ID to .env after registering your deployed IPN URL.");
    error.statusCode = 503;
    throw error;
  }

  const data = await pesapalRequest("/api/URLSetup/RegisterIPN", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      url: `${appUrl}/api/pesapal-ipn`,
      ipn_notification_type: "POST"
    })
  });

  ipnCache.id = data.ipn_id;
  return ipnCache.id;
}

async function getPesapalStatus(orderTrackingId) {
  const token = await getPesapalToken();
  return pesapalRequest(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function activatePremiumFromStatus(reference, status) {
  const orders = readOrders();
  const order = orders[reference] || {};
  const isComplete = String(status.payment_status_description || "").toUpperCase() === "COMPLETED" || Number(status.status_code) === 1;

  setOrder(reference, {
    pesapalStatus: status,
    paymentStatus: status.payment_status_description || "UNKNOWN",
    checkedAt: new Date().toISOString()
  });

  if (!isComplete || !order.email) return false;

  const now = new Date();
  setPremium(order.email, {
    plan: "premium",
    price: premiumAmount,
    currency: premiumCurrency,
    paymentStatus: "paid",
    provider: "pesapal",
    pesapalOrderTrackingId: status.order_tracking_id || order.orderTrackingId,
    pesapalMerchantReference: reference,
    pesapalConfirmationCode: status.confirmation_code || "",
    premiumStartedAt: now.toISOString(),
    premiumExpiresAt: addMonth(now).toISOString()
  });
  appendActivity({
    email: order.email,
    role: "student",
    type: "premium_payment",
    detail: reference
  });
  return true;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    paymentProvider: "pesapal",
    pesapalEnvironment,
    pesapalConfigured: Boolean(pesapalConsumerKey && pesapalConsumerSecret),
    pesapalIpnConfigured: Boolean(ipnCache.id),
    databaseReady: true
  });
});

app.post("/api/db/sync", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "Student email is required." });
  }

  const profile = req.body.profile || {};
  const activity = req.body.activity || {};
  const record = syncStudentRecord(email, {
    profile,
    lastClientSync: new Date().toISOString(),
    consented: Boolean(req.body.consented),
    appSnapshot: req.body.appSnapshot || {}
  });

  appendActivity({
    email,
    type: activity.type || "sync",
    role: activity.role || "student",
    detail: activity.detail || ""
  });

  res.json({ ok: true, student: record });
});

app.get("/api/db/student/:email", (req, res) => {
  const email = String(req.params.email || "").toLowerCase();
  const database = readDatabase();
  res.json(database.students[email] || { email, missing: true });
});

app.get("/api/db/admin/overview", (req, res) => {
  const database = readDatabase();
  const premium = readPremiumUsers();
  const orders = readOrders();
  res.json({
    students: Object.values(database.students),
    activity: database.activity.slice(-200),
    premiumUsers: Object.values(premium),
    orders: Object.values(orders),
    totals: {
      students: Object.keys(database.students).length,
      activityEvents: database.activity.length,
      premiumUsers: Object.values(premium).filter(item => item.plan === "premium").length,
      paymentOrders: Object.keys(orders).length
    }
  });
});

app.post("/api/db/payment-event", (req, res) => {
  const database = readDatabase();
  database.payments.push({
    id: Date.now() + Math.random(),
    ...req.body,
    at: new Date().toISOString()
  });
  database.payments = database.payments.slice(-1000);
  writeDatabase(database);
  res.json({ ok: true });
});

app.get("/api/premium-status", (req, res) => {
  const email = String(req.query.email || "").toLowerCase();
  const users = readPremiumUsers();
  res.json(users[email] || { email, plan: "free", paymentStatus: "none" });
});

app.post("/api/create-pesapal-order", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const name = String(req.body.name || "StudySphere Student").trim();

  if (!email) {
    return res.status(400).json({ error: "A logged-in student email is required." });
  }

  try {
    const token = await getPesapalToken();
    const notificationId = await registerPesapalIpn(token);
    const reference = `SS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const [firstName, ...lastNameParts] = name.split(/\s+/);

    setOrder(reference, {
      email,
      name,
      amount: premiumAmount,
      currency: premiumCurrency,
      paymentStatus: "pending",
      createdAt: new Date().toISOString()
    });

    const data = await pesapalRequest("/api/Transactions/SubmitOrderRequest", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: reference,
        currency: premiumCurrency,
        amount: premiumAmount,
        description: "StudySphere Premium monthly access",
        callback_url: `${appUrl}/api/pesapal-callback`,
        cancellation_url: `${appUrl}/billing.html?checkout=cancelled`,
        notification_id: notificationId,
        branch: "StudySphere",
        billing_address: {
          email_address: email,
          phone_number: "",
          country_code: "KE",
          first_name: firstName || "StudySphere",
          middle_name: "",
          last_name: lastNameParts.join(" ") || "Student",
          line_1: "StudySphere",
          line_2: "",
          city: "Nairobi",
          state: "",
          postal_code: "",
          zip_code: ""
        }
      })
    });

    setOrder(reference, {
      orderTrackingId: data.order_tracking_id,
      redirectUrl: data.redirect_url,
      paymentStatus: "submitted"
    });

    res.json({ url: data.redirect_url, reference, orderTrackingId: data.order_tracking_id });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.get("/api/pesapal-callback", async (req, res) => {
  const orderTrackingId = req.query.OrderTrackingId;
  const reference = req.query.OrderMerchantReference;

  if (!orderTrackingId || !reference) {
    return res.redirect("/billing.html?checkout=missing");
  }

  try {
    const status = await getPesapalStatus(orderTrackingId);
    activatePremiumFromStatus(reference, { ...status, order_tracking_id: orderTrackingId });
    res.redirect(`/billing.html?checkout=success&reference=${encodeURIComponent(reference)}`);
  } catch (error) {
    setOrder(reference, {
      orderTrackingId,
      paymentStatus: "verification_failed",
      verificationError: error.message
    });
    res.redirect(`/billing.html?checkout=pending&reference=${encodeURIComponent(reference)}`);
  }
});

app.post("/api/pesapal-ipn", async (req, res) => {
  const orderTrackingId = req.body.OrderTrackingId || req.query.OrderTrackingId;
  const reference = req.body.OrderMerchantReference || req.query.OrderMerchantReference;

  if (!orderTrackingId || !reference) {
    return res.status(400).json({ orderNotificationType: "IPNCHANGE", orderTrackingId: orderTrackingId || "", orderMerchantReference: reference || "", status: 500 });
  }

  try {
    const status = await getPesapalStatus(orderTrackingId);
    activatePremiumFromStatus(reference, { ...status, order_tracking_id: orderTrackingId });
    res.json({ orderNotificationType: "IPNCHANGE", orderTrackingId, orderMerchantReference: reference, status: 200 });
  } catch (error) {
    setOrder(reference, {
      orderTrackingId,
      paymentStatus: "ipn_verification_failed",
      verificationError: error.message
    });
    res.status(500).json({ orderNotificationType: "IPNCHANGE", orderTrackingId, orderMerchantReference: reference, status: 500 });
  }
});

app.listen(port, () => {
  ensureDataStore();
  console.log(`StudySphere running at ${appUrl}`);
  console.log(`Payments: Pesapal ${pesapalEnvironment}`);
});
