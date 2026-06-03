const ADMIN_EMAIL = window.STUDYSPHERE_ADMIN_EMAIL || "ndukobruce@gmail.com";
const ADMIN_PASSWORD = window.STUDYSPHERE_ADMIN_PASSWORD || "";
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

function adminAccessDisabled() {
  return Boolean(window.STUDYSPHERE_DISABLE_ADMIN || window.STUDYSPHERE_MOBILE_BUILD);
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

function upsertStudent(profile) {
  const students = authLoad("ss_students", []);
  const existing = students.find(student => student.email === profile.email);

  if (existing) {
    if (existing.password !== profile.password) {
      return { ok: false, message: "That email already exists. Please use the same password." };
    }

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

function initLoginPage() {
  const studentForm = document.getElementById("student-login-form");
  const adminForm = document.getElementById("admin-login-form");
  if (!studentForm || !adminForm) return;
  configureAdminAccessNotice(adminForm);

  const activeUser = restoreRememberedUser();
  if (activeUser) {
    window.location.href = activeUser.role === "admin" ? "admin.html" : "dashboard.html";
    return;
  }

  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.onclick = function() {
      const tab = button.dataset.authTab;
      document.querySelectorAll("[data-auth-tab]").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      studentForm.style.display = tab === "student" ? "grid" : "none";
      adminForm.style.display = tab === "admin" ? "grid" : "none";
      setAuthError("");
    };
  });

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
      password: document.getElementById("student-password").value,
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

  adminForm.addEventListener("submit", function(event) {
    event.preventDefault();
    if (adminAccessDisabled() || !ADMIN_PASSWORD) {
      setAuthError("Admin access is disabled in this build. Use the hosted admin backend for production analytics.");
      return;
    }

    const email = document.getElementById("admin-email").value.trim().toLowerCase();
    const password = document.getElementById("admin-password").value;
    const consent = document.getElementById("admin-consent").checked;

    if (!consent) {
      setAuthError("Admin consent is required before opening analytics.");
      return;
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setAuthError("Admin email or password is incorrect.");
      return;
    }

    const adminSession = {
      email: ADMIN_EMAIL,
      name: "Nduko Bruce",
      role: "admin",
      consented: true,
      loginAt: new Date().toISOString()
    };
    setCurrentUser(adminSession);
    recordLoginEvent(ADMIN_EMAIL, "admin", "login");
    syncAuthToServer({ email: ADMIN_EMAIL, name: "Nduko Bruce", role: "admin", consented: true }, "login");
    window.location.href = "admin.html";
  });
}

function configureAdminAccessNotice(adminForm) {
  if (!adminAccessDisabled() && ADMIN_PASSWORD) return;

  const adminTab = document.querySelector("[data-auth-tab='admin']");
  if (adminTab) {
    adminTab.disabled = true;
    adminTab.textContent = "Admin Disabled";
  }

  adminForm.innerHTML = `
    <div class="release-notice">
      <strong>Admin access is not available in this app build.</strong>
      <span>Production admin analytics must run from a secured backend, not from credentials shipped inside the public Android app.</span>
    </div>
  `;
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

  if (path === "admin.html" && (adminAccessDisabled() || user.role !== "admin")) {
    window.location.href = "dashboard.html";
  }
}

function initAdminPage() {
  if (!document.getElementById("admin-total-logins")) return;

  const user = getCurrentUser();
  if (adminAccessDisabled() || !user || user.role !== "admin") {
    window.location.href = "login.html";
    return;
  }

  const students = authLoad("ss_students", []);
  const events = authLoad("ss_login_events", []);
  const tasks = authLoad("ss_tasks", []);
  const plans = authLoad("ss_plans", []);
  const exams = authLoad("ss_exams", []);
  const pomodoros = authLoad("ss_pomodoros", {});
  const notes = authLoad("ss_notes", []);
  const flashcards = authLoad("ss_flashcards", []);
  const grades = authLoad("ss_grades", []);
  const files = authLoad("ss_files", []);
  const groups = authLoad("ss_groups", []);
  const knownAccounts = authLoad(KNOWN_ACCOUNTS_KEY, []);
  const activeUsers = knownAccounts.filter(account => {
    if (!account.lastSeenAt) return false;
    return Date.now() - new Date(account.lastSeenAt).getTime() < 1000 * 60 * 30;
  }).length;
  const consented = students.filter(student => student.consented).length;

  setAdminText("admin-total-logins", events.filter(event => event.type === "login").length);
  setAdminText("admin-total-users", knownAccounts.length || students.length);
  setAdminText("admin-active-user", activeUsers);
  setAdminText("admin-consent-rate", students.length ? Math.round((consented / students.length) * 100) + "%" : "0%");

  renderAdminUsers(students);
  renderAdminEvents(events);
  const data = { tasks, plans, exams, pomodoros, students, knownAccounts, events, notes, flashcards, grades, files, groups, currentUser: user };
  renderAdminDataGrid(data);
  renderAdminSnapshot(data);
  initAdminActions(data);
  renderBackendAdminOverview();

  const logout = document.getElementById("admin-logout-btn");
  if (logout) logout.onclick = logoutUser;
}

function renderAdminUsers(students) {
  const list = document.getElementById("admin-user-list");
  if (!list) return;
  list.innerHTML = students.length === 0 ? `<p class="empty-panel">No student logins yet.</p>` : "";

  students.forEach(student => {
    const item = document.createElement("div");
    item.className = "admin-list-item";
    item.innerHTML = `
      <strong>${escapeAuthHtml(student.email)}</strong>
      <span>${escapeAuthHtml(student.name)} - ${escapeAuthHtml(student.university)} - ${escapeAuthHtml(student.course)}</span>
      <small>${student.loginCount || 0} login${student.loginCount === 1 ? "" : "s"}</small>
    `;
    list.appendChild(item);
  });
}

function renderAdminEvents(events) {
  const list = document.getElementById("admin-login-list");
  if (!list) return;
  const recent = events.slice().reverse().slice(0, 10);
  list.innerHTML = recent.length === 0 ? `<p class="empty-panel">No login events yet.</p>` : "";

  recent.forEach(event => {
    const item = document.createElement("div");
    item.className = "admin-list-item";
    item.innerHTML = `
      <strong>${escapeAuthHtml(event.email)}</strong>
      <span>${escapeAuthHtml(event.role)} ${escapeAuthHtml(event.type)}</span>
      <small>${new Date(event.at).toLocaleString()}</small>
    `;
    list.appendChild(item);
  });
}

function renderAdminDataGrid(data) {
  const grid = document.getElementById("admin-data-grid");
  if (!grid) return;

  const totalPomodoros = Object.keys(data.pomodoros).reduce((sum, key) => sum + data.pomodoros[key], 0);
  const cards = [
    ["Tasks", data.tasks.length],
    ["Plans", data.plans.length],
    ["Exams", data.exams.length],
    ["Pomodoros", totalPomodoros],
    ["Students", data.students.length],
    ["Known Accounts", (data.knownAccounts || []).length],
    ["Events", data.events.length],
    ["Notes", data.notes.length],
    ["Flashcards", data.flashcards.length],
    ["Grades", data.grades.length],
    ["Files", data.files.length],
    ["Groups", data.groups.length]
  ];

  grid.innerHTML = "";
  cards.forEach(card => {
    const item = document.createElement("div");
    item.className = "analytics-card";
    item.innerHTML = `<span>${card[0]}</span><strong>${card[1]}</strong>`;
    grid.appendChild(item);
  });
}

function renderAdminSnapshot(data) {
  const snapshot = document.getElementById("admin-snapshot");
  if (!snapshot) return;
  snapshot.textContent = JSON.stringify(data, null, 2);
}

function initAdminActions(data) {
  const exportBtn = document.getElementById("admin-export-btn");
  const announcementBtn = document.getElementById("admin-announcement-btn");
  if (exportBtn) {
    exportBtn.onclick = function() {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "studysphere-admin-export.json";
      link.click();
      URL.revokeObjectURL(url);
    };
  }
  if (announcementBtn) {
    announcementBtn.onclick = function() {
      const input = document.getElementById("admin-announcement");
      localStorage.setItem("ss_admin_announcement", input.value.trim());
      input.value = "";
    };
  }
}

function renderBackendAdminOverview() {
  const grid = document.getElementById("admin-backend-grid");
  if (!grid || typeof fetch !== "function") return;

  fetch("/api/db/admin/overview")
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (!data) {
        grid.innerHTML = `<p class="empty-panel">Backend database is not available in static mode.</p>`;
        return;
      }
      grid.innerHTML = `
        <div class="analytics-card"><span>Server Students</span><strong>${data.totals.students}</strong></div>
        <div class="analytics-card"><span>Server Activity</span><strong>${data.totals.activityEvents}</strong></div>
        <div class="analytics-card"><span>Free Access</span><strong>Enabled</strong></div>
      `;
    })
    .catch(function() {
      grid.innerHTML = `<p class="empty-panel">Backend database is not available in static mode.</p>`;
    });
}

function setAdminText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeAuthHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text || ""));
  return div.innerHTML;
}

restoreRememberedUser();
requireAuth();
initLoginPage();
initAdminPage();
