const fs = require("fs");
const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4242;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;
const feedbackRecipient = "tijalabs@gmail.com";
const web3FormsAccessKey = process.env.WEB3FORMS_ACCESS_KEY || "";

const dataDir = path.join(__dirname, "data");
const databasePath = path.join(dataDir, "studysphere-db.json");
const feedbackPath = path.join(dataDir, "feedback-log.json");

function ensureDataStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(databasePath, JSON.stringify({
      students: {},
      activity: [],
      createdAt: new Date().toISOString()
    }, null, 2));
  }
  if (!fs.existsSync(feedbackPath)) fs.writeFileSync(feedbackPath, "[]");
}

function readDatabase() {
  ensureDataStore();
  try {
    return JSON.parse(fs.readFileSync(databasePath, "utf8"));
  } catch (error) {
    return { students: {}, activity: [] };
  }
}

function writeDatabase(database) {
  ensureDataStore();
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
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

function appendFeedback(entry) {
  ensureDataStore();
  let feedback = [];
  try {
    feedback = JSON.parse(fs.readFileSync(feedbackPath, "utf8"));
  } catch (error) {
    feedback = [];
  }
  feedback.push(entry);
  feedback = feedback.slice(-500);
  fs.writeFileSync(feedbackPath, JSON.stringify(feedback, null, 2));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    appMode: "free",
    feedbackDeliveryReady: Boolean(web3FormsAccessKey),
    databaseReady: true
  });
});

app.post("/api/feedback", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const name = String(req.body.name || "").trim();
  const type = String(req.body.type || "General feedback").trim();
  const message = String(req.body.message || "").trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }
  if (message.length < 8) {
    return res.status(400).json({ ok: false, error: "Please write a little more detail before sending." });
  }

  const entry = {
    id: Date.now() + Math.random(),
    email,
    name,
    type,
    message,
    page: String(req.body.page || ""),
    userAgent: String(req.body.userAgent || ""),
    recipient: feedbackRecipient,
    createdAt: new Date().toISOString(),
    deliveryStatus: "pending"
  };

  appendFeedback(entry);

  if (!web3FormsAccessKey) {
    return res.status(503).json({
      ok: false,
      error: "Feedback delivery is not configured yet. Add WEB3FORMS_ACCESS_KEY on the server."
    });
  }

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: web3FormsAccessKey,
        subject: `StudySphere ${type}`,
        name: name || "StudySphere user",
        from_name: name || "StudySphere user",
        email,
        message,
        page: entry.page,
        user_agent: entry.userAgent,
        app: "StudySphere",
        botcheck: ""
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Web3Forms rejected the message with status ${response.status}.`);
    }

    entry.deliveryStatus = "sent";
    entry.deliveredAt = new Date().toISOString();
    appendFeedback(entry);
    appendActivity({ email, type: "feedback_sent", role: "student", detail: type });
    res.json({ ok: true });
  } catch (error) {
    entry.deliveryStatus = "failed";
    entry.deliveryError = error.message;
    appendFeedback(entry);
    res.status(502).json({ ok: false, error: "Server delivery failed; browser delivery can retry with Web3Forms." });
  }
});

app.post("/api/db/sync", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "Student email is required." });
  }

  const record = syncStudentRecord(email, {
    profile: req.body.profile || {},
    lastClientSync: new Date().toISOString(),
    consented: Boolean(req.body.consented),
    appSnapshot: req.body.appSnapshot || {}
  });

  const activity = req.body.activity || {};
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
  res.json({
    students: Object.values(database.students),
    activity: database.activity.slice(-200),
    totals: {
      students: Object.keys(database.students).length,
      activityEvents: database.activity.length
    }
  });
});

app.listen(port, () => {
  ensureDataStore();
  console.log(`StudySphere running at ${appUrl}`);
  console.log("Mode: free student toolkit");
});
