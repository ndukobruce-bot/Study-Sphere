// ============================================
//  STUDYSPHERE - dashboard.js
// ============================================

const dashboardCache = Object.create(null);
let dashboardEventsBound = false;

function loadJson(key, fallback) {
  if (Object.prototype.hasOwnProperty.call(dashboardCache, key)) {
    return dashboardCache[key];
  }
  try {
    dashboardCache[key] = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    dashboardCache[key] = fallback;
  }
  return dashboardCache[key];
}

function saveJson(key, value) {
  dashboardCache[key] = value;
  localStorage.setItem(key, JSON.stringify(value));
}

function getTasks() {
  return loadJson("ss_tasks", []);
}

function getExams() {
  return loadJson("ss_exams", []);
}

function saveExams(exams) {
  saveJson("ss_exams", exams);
}

function afterFirstPaint(callback) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(callback, { timeout: 650 });
    return;
  }
  setTimeout(callback, 80);
}

function setDashboardBusy(isBusy) {
  document.body.classList.toggle("dashboard-loading", Boolean(isBusy));
}

function loadDashboardStats() {
  setDashboardBusy(true);
  bindDashboardEvents();
  const tasks = getTasks();
  const completed = tasks.filter(t => t.completed).length;
  const remaining = tasks.filter(t => !t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  setText("stat-completed", completed);
  setText("stat-remaining", remaining);
  setText("progress-pct", `${pct}%`);
  const fillEl = document.getElementById("progress-fill");
  if (fillEl) fillEl.style.width = `${pct}%`;

  const today = new Date().toDateString();
  const pomData = loadJson("ss_pomodoros", {});
  const todayPoms = pomData[today] || 0;
  const studyMins = parseInt(localStorage.getItem("ss_study_mins_today") || "0");
  const hours = Math.floor(studyMins / 60);
  const mins = studyMins % 60;

  setText("stat-pomodoros", todayPoms);
  setText("stat-time", `${hours}h ${mins}m`);

  const data = { tasks, completed, remaining, total, pct, todayPoms, studyMins };
  renderRecentTasks(tasks);

  afterFirstPaint(function() {
    renderNotifications(data);
    renderMood();
    renderExams();
    renderSubjects(tasks);
    renderRevision(tasks);
    renderAchievements(data);
    renderAnalytics(data);
    setDashboardBusy(false);
  });
}

function renderRecentTasks(tasks) {
  const recentEl = document.getElementById("recent-tasks");
  if (!recentEl) return;

  recentEl.innerHTML = "";
  if (tasks.length === 0) {
    recentEl.innerHTML = `<li class="no-tasks-msg">No tasks yet. <a href="tasks.html">Add some -></a></li>`;
    return;
  }

  [...tasks].reverse().slice(0, 5).forEach(task => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${task.completed ? "Done" : "Open"}</span>
      <span style="${task.completed ? "text-decoration: line-through; color: var(--text-muted);" : ""}">${escapeHtml(task.text)}</span>
      <span class="priority-badge ${task.priority}" style="margin-left: auto;">${task.priority}</span>
    `;
    recentEl.appendChild(li);
  });
}

function buildNotifications(data) {
  const highPriority = data.tasks.filter(t => !t.completed && t.priority === "high").length;
  const latestTask = [...data.tasks].reverse().find(t => !t.completed);
  const streak = parseInt(localStorage.getItem("ss_streak") || "0");
  const overdue = data.tasks.filter(t => !t.completed && getDaysUntil(t.dueDate) < 0).length;
  const notifications = [];

  if (overdue > 0) {
    notifications.push({
      id: "overdue",
      type: "urgent",
      title: `${overdue} overdue task${overdue === 1 ? "" : "s"}`,
      body: "Move these to the top of your plan before starting new work.",
      action: "Open tasks",
      href: "tasks.html"
    });
  }

  if (highPriority > 0) {
    notifications.push({
      id: "high-priority",
      type: "urgent",
      title: `${highPriority} high-priority task${highPriority === 1 ? "" : "s"} waiting`,
      body: "Start with the hardest item first while your focus is fresh.",
      action: "Open tasks",
      href: "tasks.html"
    });
  }

  if (data.remaining > 0 && latestTask) {
    notifications.push({
      id: "next-task",
      type: "info",
      title: "Next task ready",
      body: latestTask.text,
      action: "View list",
      href: "tasks.html"
    });
  }

  if (data.todayPoms === 0) {
    notifications.push({
      id: "start-pomodoro",
      type: "focus",
      title: "No Pomodoro session yet",
      body: "A 25-minute focus block would get your study rhythm started.",
      action: "Start timer",
      href: "timer.html"
    });
  }

  if (streak >= 3) {
    notifications.push({
      id: "streak",
      type: "success",
      title: `${streak}-day study streak`,
      body: "Your consistency is building. Protect the streak with one focused session.",
      action: "Timer",
      href: "timer.html"
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      id: "quiet",
      type: "info",
      title: "Nothing urgent right now",
      body: "Add a task or create a plan and StudySphere will keep you updated.",
      action: "Planner",
      href: "planner.html"
    });
  }

  return notifications.slice(0, 4);
}

function renderNotifications(data) {
  const listEl = document.getElementById("notification-list");
  const countEl = document.getElementById("notification-count");
  const subEl = document.getElementById("notification-sub");
  const clearBtn = document.getElementById("clear-notifications");
  if (!listEl) return;

  const notifications = buildNotifications(data);
  const readIds = JSON.parse(localStorage.getItem("ss_read_notifications") || "[]");
  const unread = notifications.filter(item => readIds.indexOf(item.id) === -1);

  const fragment = document.createDocumentFragment();
  notifications.forEach(item => {
    const card = document.createElement("article");
    const isRead = readIds.indexOf(item.id) !== -1;
    card.className = `notification-card ${item.type}${isRead ? " read" : ""}`;
    card.innerHTML = `
      <div class="notification-dot"></div>
      <div class="notification-copy">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body)}</p>
      </div>
      <a class="notification-link" href="${item.href}">${escapeHtml(item.action)}</a>
    `;
    fragment.appendChild(card);
  });
  listEl.replaceChildren(fragment);

  setText("notification-count", `${unread.length} new`);
  if (subEl) subEl.textContent = unread.length > 0 ? "Fresh updates from your study tools." : "You are all caught up.";

  if (clearBtn) clearBtn.dataset.notificationIds = JSON.stringify(notifications.map(item => item.id));
}

function renderMood() {
  const mood = localStorage.getItem("ss_mood") || "";
  const tips = {
    low: "Keep it light: 25 minutes, one task, then a real break.",
    okay: "Use two focused blocks and start with your highest priority task.",
    great: "Take on deep work now: planner, practice questions, or exam revision."
  };

  document.querySelectorAll("#mood-options button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mood === mood);
  });

  setText("mood-tip", tips[mood] || "Choose how you feel today.");
}

function renderExams() {
  const list = document.getElementById("exam-list");
  if (!list) return;

  const exams = getExams().sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  list.innerHTML = exams.length === 0 ? `<p class="empty-panel">No exams added yet.</p>` : "";
  exams.forEach(exam => {
    const days = getDaysUntil(exam.date);
    const item = document.createElement("div");
    item.className = "mini-item";
    item.innerHTML = `<strong>${escapeHtml(exam.name)}</strong><span>${days < 0 ? "passed" : days + " days left"}</span>`;
    list.appendChild(item);
  });
}

function bindDashboardEvents() {
  if (dashboardEventsBound) return;
  dashboardEventsBound = true;

  document.querySelectorAll("#mood-options button").forEach(btn => {
    btn.addEventListener("click", function() {
      localStorage.setItem("ss_mood", btn.dataset.mood);
      renderMood();
    });
  });

  const clearBtn = document.getElementById("clear-notifications");
  if (clearBtn) {
    clearBtn.addEventListener("click", function() {
      localStorage.setItem("ss_read_notifications", clearBtn.dataset.notificationIds || "[]");
      dashboardCache.ss_read_notifications = JSON.parse(clearBtn.dataset.notificationIds || "[]");
      const tasks = getTasks();
      const completed = tasks.filter(t => t.completed).length;
      renderNotifications({
        tasks,
        completed,
        remaining: tasks.length - completed,
        total: tasks.length,
        pct: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        todayPoms: loadJson("ss_pomodoros", {})[new Date().toDateString()] || 0,
        studyMins: parseInt(localStorage.getItem("ss_study_mins_today") || "0")
      });
    });
  }

  const addBtn = document.getElementById("add-exam-btn");
  if (addBtn) {
    addBtn.addEventListener("click", function() {
      const nameInput = document.getElementById("exam-name");
      const dateInput = document.getElementById("exam-date");
      const name = nameInput.value.trim();
      const date = dateInput.value;
      if (!name || !date) return;
      const exams = getExams();
      exams.push({ id: Date.now(), name, date });
      saveExams(exams);
      nameInput.value = "";
      dateInput.value = "";
      renderExams();
    });
  }
}

function renderSubjects(tasks) {
  const list = document.getElementById("subject-list");
  if (!list) return;

  const totals = {};
  tasks.forEach(task => {
    const subject = task.subject || "General";
    if (!totals[subject]) totals[subject] = { total: 0, done: 0 };
    totals[subject].total++;
    if (task.completed) totals[subject].done++;
  });

  const subjects = Object.keys(totals);
  list.innerHTML = subjects.length === 0 ? `<p class="empty-panel">Add task subjects to see balance.</p>` : "";
  subjects.slice(0, 5).forEach(subject => {
    const item = totals[subject];
    const pct = Math.round((item.done / item.total) * 100);
    const row = document.createElement("div");
    row.className = "subject-row";
    row.innerHTML = `
      <div><strong>${escapeHtml(subject)}</strong><span>${item.done}/${item.total} done</span></div>
      <div class="tiny-bar"><span style="width:${pct}%"></span></div>
    `;
    list.appendChild(row);
  });
}

function renderRevision(tasks) {
  const list = document.getElementById("revision-list");
  if (!list) return;

  const completed = tasks.filter(t => t.completed).slice(-4).reverse();
  list.innerHTML = completed.length === 0 ? `<p class="empty-panel">Complete tasks to build a revision queue.</p>` : "";
  completed.forEach(task => {
    const created = task.createdAt ? new Date(task.createdAt) : new Date();
    const reviewDate = new Date(created.getTime() + 3 * 86400000);
    const item = document.createElement("div");
    item.className = "mini-item";
    item.innerHTML = `<strong>${escapeHtml(task.text)}</strong><span>Review ${reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>`;
    list.appendChild(item);
  });
}

function renderAchievements(data) {
  const grid = document.getElementById("achievement-grid");
  if (!grid) return;

  const streak = parseInt(localStorage.getItem("ss_streak") || "0");
  const best = parseInt(localStorage.getItem("ss_arcade_best") || "0");
  const badges = [
    { name: "First Steps", unlocked: data.total > 0, detail: "Add your first task" },
    { name: "Focus Starter", unlocked: data.todayPoms > 0, detail: "Finish a Pomodoro" },
    { name: "Task Finisher", unlocked: data.completed >= 5, detail: "Complete 5 tasks" },
    { name: "Streak Builder", unlocked: streak >= 3, detail: "Reach a 3-day streak" },
    { name: "Arcade Mind", unlocked: best >= 100, detail: "Score 100 in games" }
  ];

  grid.innerHTML = "";
  badges.forEach(badge => {
    const card = document.createElement("div");
    card.className = `achievement ${badge.unlocked ? "unlocked" : ""}`;
    card.innerHTML = `<strong>${badge.name}</strong><span>${badge.unlocked ? "Unlocked" : badge.detail}</span>`;
    grid.appendChild(card);
  });
}

function renderAnalytics(data) {
  const grid = document.getElementById("analytics-grid");
  if (!grid) return;

  const highOpen = data.tasks.filter(t => !t.completed && t.priority === "high").length;
  const overdue = data.tasks.filter(t => !t.completed && getDaysUntil(t.dueDate) < 0).length;
  const plans = JSON.parse(localStorage.getItem("ss_plans") || "[]").length;

  const stats = [
    ["Completion", `${data.pct}%`],
    ["Study Time", formatStudyTime(data.studyMins)],
    ["High Priority", highOpen],
    ["Overdue", overdue],
    ["Saved Plans", plans]
  ];

  grid.innerHTML = "";
  stats.forEach(stat => {
    const item = document.createElement("div");
    item.className = "analytics-card";
    item.innerHTML = `<span>${stat[0]}</span><strong>${stat[1]}</strong>`;
    grid.appendChild(item);
  });
}

function getDaysUntil(dateValue) {
  if (!dateValue) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue + "T00:00:00");
  return Math.round((date - today) / 86400000);
}

function formatStudyTime(totalMins) {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text || ""));
  return div.innerHTML;
}

loadDashboardStats();
