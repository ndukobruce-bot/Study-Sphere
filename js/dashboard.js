// ============================================
//  STUDYSPHERE — dashboard.js
//  Reads tasks + timer data from localStorage
//  and populates the dashboard stats
// ============================================

function loadDashboardStats() {

  // ---- TASKS ----
  const tasks     = JSON.parse(localStorage.getItem("ss_tasks") || "[]");
  const completed = tasks.filter(t => t.completed).length;
  const remaining = tasks.filter(t => !t.completed).length;
  const total     = tasks.length;

  const elComp = document.getElementById("stat-completed");
  const elRem  = document.getElementById("stat-remaining");
  if (elComp) elComp.textContent = completed;
  if (elRem)  elRem.textContent  = remaining;

  // ---- PROGRESS BAR ----
  const pct    = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pctEl  = document.getElementById("progress-pct");
  const fillEl = document.getElementById("progress-fill");
  if (pctEl)  pctEl.textContent  = `${pct}%`;
  if (fillEl) fillEl.style.width = `${pct}%`;

  // ---- POMODOROS ----
  const today     = new Date().toDateString();
  const pomData   = JSON.parse(localStorage.getItem("ss_pomodoros") || "{}");
  const todayPoms = pomData[today] || 0;

  const elPom = document.getElementById("stat-pomodoros");
  if (elPom) elPom.textContent = todayPoms;

  // ---- STUDY TIME ----
  const studyMins = parseInt(localStorage.getItem("ss_study_mins_today") || "0");
  const hours     = Math.floor(studyMins / 60);
  const mins      = studyMins % 60;

  const elTime = document.getElementById("stat-time");
  if (elTime) elTime.textContent = `${hours}h ${mins}m`;

  // ---- RECENT TASKS ----
  const recentEl = document.getElementById("recent-tasks");
  if (recentEl) {
    recentEl.innerHTML = "";

    if (tasks.length === 0) {
      recentEl.innerHTML = `<li class="no-tasks-msg">No tasks yet. <a href="tasks.html">Add some →</a></li>`;
    } else {
      const recent = [...tasks].reverse().slice(0, 5);
      recent.forEach(task => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${task.completed ? "✅" : "⭕"}</span>
          <span style="${task.completed ? "text-decoration: line-through; color: var(--text-muted);" : ""}">${task.text}</span>
          <span class="priority-badge ${task.priority}" style="margin-left: auto;">${task.priority}</span>
        `;
        recentEl.appendChild(li);
      });
    }
  }
}

// Run on page load
loadDashboardStats();