const ADMIN_EMAIL = "ndukobruce@gmail.com";
const ADMIN_PASSWORD = "@Nduko123";

function authLoad(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

function authSave(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  return authLoad("ss_current_user", null);
}

function setCurrentUser(user) {
  authSave("ss_current_user", user);
}

function logoutUser() {
  const user = getCurrentUser();
  if (user) {
    recordLoginEvent(user.email, user.role, "logout");
    syncAuthToServer(user, "logout");
  }
  localStorage.removeItem("ss_current_user");
  window.location.href = "login.html";
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
  authSave("ss_login_events", events.slice(-100));
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

    setCurrentUser({
      email: profile.email,
      name: profile.name,
      university: profile.university,
      course: profile.course,
      role: "student",
      consented: true,
      loginAt: new Date().toISOString()
    });
    recordLoginEvent(profile.email, "student", "login");
    syncAuthToServer(profile, "login");
    window.location.href = "dashboard.html";
  });

  adminForm.addEventListener("submit", function(event) {
    event.preventDefault();
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

    setCurrentUser({
      email: ADMIN_EMAIL,
      name: "Nduko Bruce",
      role: "admin",
      consented: true,
      loginAt: new Date().toISOString()
    });
    recordLoginEvent(ADMIN_EMAIL, "admin", "login");
    syncAuthToServer({ email: ADMIN_EMAIL, name: "Nduko Bruce", role: "admin", consented: true }, "login");
    window.location.href = "admin.html";
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

  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (path === "admin.html" && user.role !== "admin") {
    window.location.href = "dashboard.html";
  }
}

function initAdminPage() {
  if (!document.getElementById("admin-total-logins")) return;

  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
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
  const consented = students.filter(student => student.consented).length;

  setAdminText("admin-total-logins", events.filter(event => event.type === "login").length);
  setAdminText("admin-total-users", students.length);
  setAdminText("admin-active-user", getCurrentUser() ? "1" : "0");
  setAdminText("admin-consent-rate", students.length ? Math.round((consented / students.length) * 100) + "%" : "0%");

  renderAdminUsers(students);
  renderAdminEvents(events);
  const data = { tasks, plans, exams, pomodoros, students, events, notes, flashcards, grades, files, groups, currentUser: user };
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
        <div class="analytics-card"><span>Premium Users</span><strong>${data.totals.premiumUsers}</strong></div>
        <div class="analytics-card"><span>Payment Orders</span><strong>${data.totals.paymentOrders}</strong></div>
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

requireAuth();
initLoginPage();
initAdminPage();
