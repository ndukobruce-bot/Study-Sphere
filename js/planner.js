var currentSchedule = null;

function loadPlans() {
  return JSON.parse(localStorage.getItem("ss_plans") || "[]");
}

function savePlans(plans) {
  localStorage.setItem("ss_plans", JSON.stringify(plans));
}

function buildSchedule(goal, subject, deadlineValue, hoursPerDay, energy) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var deadline = deadlineValue ? new Date(deadlineValue + "T00:00:00") : new Date(today.getTime() + 6 * 86400000);
  var totalDays = Math.max(1, Math.round((deadline - today) / 86400000) + 1);
  var dailyMinutes = Math.max(30, Math.round(hoursPerDay * 60));
  if (energy === "low") dailyMinutes = Math.max(25, Math.round(dailyMinutes * 0.75));
  if (energy === "high") dailyMinutes = Math.round(dailyMinutes * 1.15);

  var phases = [
    "Understand the goal and gather materials",
    "Learn the hardest concepts",
    "Make notes and examples",
    "Practice questions",
    "Review weak points",
    "Final recall and light test"
  ];

  var days = [];
  for (var i = 0; i < totalDays; i++) {
    var date = new Date(today.getTime() + i * 86400000);
    var phaseIndex = Math.min(phases.length - 1, Math.floor((i / totalDays) * phases.length));
    var focus = phases[phaseIndex];
    var blocks = splitBlocks(dailyMinutes, energy);

    days.push({
      date: date.toISOString().slice(0, 10),
      title: "Day " + (i + 1) + " - " + focus,
      blocks: blocks.map(function(block, index) {
        return {
          time: block + " min",
          task: getBlockTask(index, focus, goal, subject)
        };
      })
    });
  }

  return {
    id: Date.now(),
    goal: goal,
    subject: subject || "General",
    deadline: deadline.toISOString().slice(0, 10),
    energy: energy,
    dailyMinutes: dailyMinutes,
    days: days,
    createdAt: new Date().toISOString()
  };
}

function splitBlocks(totalMinutes, energy) {
  var blockLength = energy === "low" ? 25 : 45;
  var breakLength = energy === "low" ? 8 : 10;
  var blocks = [];
  var remaining = totalMinutes;

  while (remaining > 0) {
    var next = Math.min(blockLength, remaining);
    blocks.push(next);
    remaining -= next;
    if (remaining > 0) remaining = Math.max(0, remaining - breakLength);
  }

  return blocks;
}

function getBlockTask(index, focus, goal, subject) {
  var tasks = [
    focus + " for " + subject,
    "Active recall: write what you remember without looking",
    "Practice: solve questions or make flashcards",
    "Wrap up: list what is still confusing"
  ];

  if (index === 0) return tasks[0] + " - " + goal;
  return tasks[index] || tasks[tasks.length - 1];
}

function renderSchedule(schedule) {
  var list = document.getElementById("schedule-list");
  var summary = document.getElementById("planner-summary");
  if (!list || !summary) return;

  currentSchedule = schedule;
  summary.textContent = schedule.days.length + " day plan for " + schedule.subject + " ending " + schedule.deadline + ".";
  list.innerHTML = "";

  schedule.days.forEach(function(day) {
    var item = document.createElement("article");
    item.className = "schedule-day";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(day.title)}</strong>
        <small>${formatPlanDate(day.date)}</small>
      </div>
      <ul>
        ${day.blocks.map(function(block) {
          return `<li><span>${escapeHtml(block.time)}</span>${escapeHtml(block.task)}</li>`;
        }).join("")}
      </ul>
    `;
    list.appendChild(item);
  });
}

function renderSavedPlans() {
  var list = document.getElementById("saved-plans");
  if (!list) return;

  var plans = loadPlans();
  list.innerHTML = "";
  if (plans.length === 0) {
    list.innerHTML = `<p class="empty-panel">No saved plans yet.</p>`;
    return;
  }

  plans.slice().reverse().forEach(function(plan) {
    var card = document.createElement("button");
    card.className = "saved-plan-card";
    card.type = "button";
    card.innerHTML = `
      <strong>${escapeHtml(plan.subject)}</strong>
      <span>${escapeHtml(plan.goal)}</span>
      <small>${plan.days.length} days • due ${plan.deadline}</small>
    `;
    card.onclick = function() { renderSchedule(plan); };
    list.appendChild(card);
  });
}

function formatPlanDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

var form = document.getElementById("planner-form");
if (form) {
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    var goal = document.getElementById("plan-goal").value.trim();
    if (!goal) {
      document.getElementById("plan-goal").focus();
      return;
    }

    var schedule = buildSchedule(
      goal,
      document.getElementById("plan-subject").value.trim() || "General",
      document.getElementById("plan-deadline").value,
      parseFloat(document.getElementById("plan-hours").value || "2"),
      document.getElementById("plan-energy").value
    );

    renderSchedule(schedule);
  });
}

var saveBtn = document.getElementById("save-plan-btn");
if (saveBtn) {
  saveBtn.onclick = function() {
    if (!currentSchedule) return;
    var plans = loadPlans();
    plans.push(currentSchedule);
    savePlans(plans.slice(-8));
    renderSavedPlans();
  };
}

var notesBtn = document.getElementById("notes-search-btn");
if (notesBtn) {
  notesBtn.onclick = function() {
    var query = document.getElementById("notes-query").value.trim() || "study notes";
    window.open("https://www.google.com/search?q=" + encodeURIComponent(query + " notes"), "_blank", "noopener");
  };
}

renderSavedPlans();
