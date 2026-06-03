const fs = require("fs");
const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4242;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

const dataDir = path.join(__dirname, "data");
const databasePath = path.join(dataDir, "studysphere-db.json");

function ensureDataStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(databasePath, JSON.stringify({
      students: {},
      activity: [],
      createdAt: new Date().toISOString()
    }, null, 2));
  }
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    appMode: "free",
    databaseReady: true
  });
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
