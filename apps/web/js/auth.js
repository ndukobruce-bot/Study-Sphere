const CURRENT_USER_KEY = "ss_current_user";
const REMEMBERED_SESSION_KEY = "ss_remembered_session";
const KNOWN_ACCOUNTS_KEY = "ss_known_accounts";
const SIGNED_OUT_KEY = "ss_session_signed_out";

function authLoad(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

function authSave(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  return authLoad(CURRENT_USER_KEY, null);
}

function setCurrentUser(user) {
  const now = new Date().toISOString();
  const session = {
    ...user,
    sessionStartedAt: user.sessionStartedAt || user.loginAt || now,
    lastSeenAt: now,
    remembered: true
  };

  authSave(CURRENT_USER_KEY, session);
  authSave(REMEMBERED_SESSION_KEY, session);
  localStorage.removeItem(SIGNED_OUT_KEY);
  upsertKnownAccount(session);
}

function logoutUser() {
  const user = getCurrentUser();
  if (user) {
    recordLoginEvent(user.email, user.role, "logout");
    syncAuthToServer(user, "logout");
  }
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(REMEMBERED_SESSION_KEY);
  localStorage.setItem(SIGNED_OUT_KEY, new Date().toISOString());
  window.location.href = "login.html";
}

function restoreRememberedUser() {
  const current = getCurrentUser();
  if (current) return touchCurrentSession(current);
  if (localStorage.getItem(SIGNED_OUT_KEY)) return null;

  const remembered = authLoad(REMEMBERED_SESSION_KEY, null);
  if (!remembered || !remembered.email || !remembered.consented) return null;

  const restored = {
    ...remembered,
    restoredAt: new Date().toISOString()
  };
  authSave(CURRENT_USER_KEY, restored);
  recordLoginEvent(restored.email, restored.role || "student", "auto_restore");
  syncAuthToServer(restored, "auto_restore");
  return touchCurrentSession(restored);
}

function touchCurrentSession(user) {
  if (!user || !user.email) return user;
  const updated = {
    ...user,
    lastSeenAt: new Date().toISOString(),
    remembered: true
  };
  authSave(CURRENT_USER_KEY, updated);
  authSave(REMEMBERED_SESSION_KEY, updated);
  upsertKnownAccount(updated);
  return updated;
}

function upsertKnownAccount(user) {
  if (!user || !user.email) return;
  const accounts = authLoad(KNOWN_ACCOUNTS_KEY, []);
  const existing = accounts.find(account => account.email === user.email);
  const safeUser = {
    email: user.email,
    name: user.name || "",
    role: user.role || "student",
    university: user.university || "",
    course: user.course || "",
    consented: Boolean(user.consented),
    firstSeenAt: user.createdAt || user.loginAt || new Date().toISOString(),
    lastSeenAt: user.lastSeenAt || new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, safeUser, {
      firstSeenAt: existing.firstSeenAt || safeUser.firstSeenAt,
      sessionCount: (existing.sessionCount || 0) + 1
    });
  } else {
    accounts.push({
      ...safeUser,
      sessionCount: 1
    });
  }

  authSave(KNOWN_ACCOUNTS_KEY, accounts);
}

function recordLoginEvent(email, role, type) {
  const events = authLoad("ss_login_events", []);
  events.push({
    email: email,
    role: role,
    type: type,
    at: new Date().toISOString(),
    consented: true
  });
  authSave("ss_login_events", events.slice(-500));
}

function syncAuthToServer(profile, type) {
  if (!profile || !profile.email || typeof fetch !== "function") return;
  const apiBase = window.STUDYSPHERE_API_BASE || "";
  const snapshot = {
    tasks: authLoad("ss_tasks", []).length,
    plans: authLoad("ss_plans", []).length,
    notes: authLoad("ss_notes", []).length,
    flashcards: authLoad("ss_flashcards", []).length,
    grades: authLoad("ss_grades", []).length,
    exams: authLoad("ss_exams", []).length
  };

  fetch(apiBase + "/api/db/sync", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: profile.email,
      profile: profile,
      consented: Boolean(profile.consented),
      appSnapshot: snapshot,
      activity: { type: type, role: profile.role || "student" }
    })
  }).catch(function() {
    // Static hosting keeps localStorage as the fallback data layer.
  });
}

/**
 * No password field is written or checked here — this was never real
 * authentication (client-side, plaintext, trivially bypassed), only a
 * per-browser profile store. Re-using an email just updates the existing
 * profile rather than gating on a password match that provided no real
 * security. See docs/AUDIT.md's security triage and
 * migrateAwayFromStoredPasswords() below for existing browsers.
 */
function upsertStudent(profile) {
  const students = authLoad("ss_students", []);
  const existing = students.find(student => student.email === profile.email);

  if (existing) {
    Object.assign(existing, profile, {
      loginCount: (existing.loginCount || 0) + 1,
      lastLogin: new Date().toISOString()
    });
  } else {
    students.push({
      ...profile,
      role: "student",
      loginCount: 1,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
  }

  authSave("ss_students", students);
  return { ok: true };
}

/**
 * One-time cleanup for browsers that registered before password storage
 * was removed: strips the password key out of any existing ss_students
 * entries. Runs once per browser (guarded by a flag), not on every load.
 */
function migrateAwayFromStoredPasswords() {
  const MIGRATION_KEY = "ss_migration_strip_password_v1";
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const students = authLoad("ss_students", []);
  let changed = false;
  students.forEach(student => {
    if (Object.prototype.hasOwnProperty.call(student, "password")) {
      delete student.password;
      changed = true;
    }
  });
  if (changed) authSave("ss_students", students);
  localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
}

function initLoginPage() {
  const studentForm = document.getElementById("student-login-form");
  if (!studentForm) return;

  const activeUser = restoreRememberedUser();
  if (activeUser) {
    window.location.href = "dashboard.html";
    return;
  }

  studentForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const consent = document.getElementById("student-consent").checked;
    if (!consent) {
      setAuthError("Consent is required before StudySphere can store login and activity data.");
      return;
    }

    const profile = {
      email: document.getElementById("student-email").value.trim().toLowerCase(),
      name: document.getElementById("student-name").value.trim(),
      university: document.getElementById("student-university").value.trim(),
      course: document.getElementById("student-course").value.trim(),
      consented: true
    };

    const result = upsertStudent(profile);
    if (!result.ok) {
      setAuthError(result.message);
      return;
    }

    const userSession = {
      email: profile.email,
      name: profile.name,
      university: profile.university,
      course: profile.course,
      role: "student",
      consented: true,
      loginAt: new Date().toISOString()
    };
    setCurrentUser(userSession);
    recordLoginEvent(profile.email, "student", "login");
    syncAuthToServer(profile, "login");
    window.location.href = "dashboard.html";
  });
}

function setAuthError(message) {
  const el = document.getElementById("auth-error");
  if (el) el.textContent = message;
}

function requireAuth() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "login.html"];
  if (publicPages.indexOf(path) !== -1) return;

  const user = restoreRememberedUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
}

migrateAwayFromStoredPasswords();
restoreRememberedUser();
requireAuth();
initLoginPage();
