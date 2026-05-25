// ============================================
//  STUDYSPHERE — app.js
//  Shared utilities across all pages
// ============================================

console.log("StudySphere loaded ✅");

// ---- DATE DISPLAY ----
function formatDate() {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return now.toLocaleDateString("en-US", options);
}

// Set date on dashboard if element exists
const dashDate = document.getElementById("dash-date");
if (dashDate) {
  dashDate.textContent = formatDate();
}

// ---- STREAK LOGIC ----
// Check if the user has visited today; if not, update streak
function updateStreak() {
  const today       = new Date().toDateString();
  const lastVisit   = localStorage.getItem("ss_last_visit");
  let streak        = parseInt(localStorage.getItem("ss_streak")) || 0;

  if (lastVisit !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastVisit === yesterday.toDateString()) {
      // Visited yesterday → increment streak
      streak++;
    } else if (!lastVisit) {
      // First ever visit
      streak = 1;
    } else {
      // Missed a day → reset streak
      streak = 1;
    }

    localStorage.setItem("ss_last_visit", today);
    localStorage.setItem("ss_streak", streak);
  }

  return streak;
}

// Expose streak to other scripts
window.currentStreak = updateStreak();

const streakEl = document.getElementById("streak-count");
if (streakEl) {
  streakEl.textContent = window.currentStreak;
}

function updateAuthNav() {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  const currentUser = JSON.parse(localStorage.getItem("ss_current_user") || "null");
  const landingAction = document.getElementById("landing-nav-action");
  if (landingAction) {
    if (!currentUser) {
      landingAction.textContent = "Student Login";
      landingAction.onclick = function() {
        window.location.href = "login.html";
      };
    } else if (currentUser.role === "admin") {
      landingAction.textContent = "Admin Panel";
      landingAction.onclick = function() {
        window.location.href = "admin.html";
      };
    } else {
      landingAction.textContent = "Open Dashboard";
      landingAction.onclick = function() {
        window.location.href = "dashboard.html";
      };
    }
    return;
  }

  const existing = document.getElementById("auth-nav-item");
  if (existing) existing.remove();

  const item = document.createElement("li");
  item.id = "auth-nav-item";

  if (!currentUser) {
    item.innerHTML = `<a href="login.html">Login</a>`;
  } else if (currentUser.role === "admin") {
    item.innerHTML = `<a href="admin.html">Admin</a>`;
  } else {
    item.innerHTML = `<a href="#" id="logout-link">Logout</a>`;
  }

  navLinks.appendChild(item);

  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.onclick = function(event) {
      event.preventDefault();
      if (typeof logoutUser === "function") {
        logoutUser();
      } else {
        localStorage.removeItem("ss_current_user");
        window.location.href = "login.html";
      }
    };
  }
}

updateAuthNav();

// ---- STUDYSPHERE GUIDE ASSISTANT ----
const assistantPages = {
  dashboard: {
    label: "Dashboard",
    href: "dashboard.html",
    summary: "Your command center for stats, notifications, mood, exams, revision, achievements, and analytics."
  },
  planner: {
    label: "Planner",
    href: "planner.html",
    summary: "Creates a day-by-day schedule from your goal, deadline, time, subject, and energy level."
  },
  tasks: {
    label: "Tasks",
    href: "tasks.html",
    summary: "Add assignments, priorities, subjects, due dates, and mark work complete."
  },
  timer: {
    label: "Timer",
    href: "timer.html",
    summary: "Run Pomodoro focus sessions and track study time."
  },
  game: {
    label: "Games",
    href: "game.html",
    summary: "Take short brain breaks with Tic-Tac-Toe, Block Blast, Memory, Focus Trail, and Anagrams."
  },
  notes: {
    label: "Online Notes",
    href: "planner.html",
    summary: "Find online notes and learning resources from the Planner page."
  }
};

function createAssistant() {
  if (document.getElementById("ss-assistant")) return;

  const shell = document.createElement("section");
  shell.id = "ss-assistant";
  shell.className = "assistant-widget";
  shell.innerHTML = `
    <button class="assistant-fab" id="assistant-toggle" type="button" aria-label="Open Sage assistant">Sage</button>
    <div class="assistant-panel" id="assistant-panel" aria-live="polite">
      <div class="assistant-head">
        <div>
          <strong>Sage</strong>
          <span>Your StudySphere guide.</span>
        </div>
        <button type="button" id="assistant-close" aria-label="Close assistant">x</button>
      </div>
      <div class="assistant-messages" id="assistant-messages"></div>
      <div class="assistant-suggestions">
        <button type="button" data-prompt="Where is the planner?">Planner</button>
        <button type="button" data-prompt="What should I do next?">Next step</button>
        <button type="button" data-prompt="Where can I find notes online?">Notes</button>
      </div>
      <form class="assistant-form" id="assistant-form">
        <input id="assistant-input" type="text" placeholder="Ask Sage..." autocomplete="off">
        <button type="submit">Ask</button>
      </form>
    </div>
  `;

  document.body.appendChild(shell);
  bindAssistant();
  addAssistantMessage("assistant", getAssistantGreeting());
}

function bindAssistant() {
  const panel = document.getElementById("assistant-panel");
  const toggle = document.getElementById("assistant-toggle");
  const close = document.getElementById("assistant-close");
  const form = document.getElementById("assistant-form");
  const input = document.getElementById("assistant-input");

  toggle.onclick = function() {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) input.focus();
  };

  close.onclick = function() {
    panel.classList.remove("open");
  };

  document.querySelectorAll(".assistant-suggestions button").forEach(btn => {
    btn.onclick = function() {
      askAssistant(btn.dataset.prompt);
    };
  });

  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    askAssistant(text);
  });
}

function askAssistant(text) {
  addAssistantMessage("user", text);
  setTimeout(function() {
    addAssistantMessage("assistant", getAssistantReply(text));
  }, 160);
}

function addAssistantMessage(role, text) {
  const list = document.getElementById("assistant-messages");
  if (!list) return;

  const item = document.createElement("div");
  item.className = `assistant-message ${role}`;
  item.innerHTML = role === "assistant" ? formatAssistantText(text) : escapeAssistantHtml(text);
  list.appendChild(item);
  list.scrollTop = list.scrollHeight;
}

function getAssistantGreeting() {
  const tasks = JSON.parse(localStorage.getItem("ss_tasks") || "[]");
  const openTasks = tasks.filter(task => !task.completed).length;
  if (openTasks > 0) {
    return `Hi, I am Sage. You currently have ${openTasks} open task${openTasks === 1 ? "" : "s"}, so I can help you plan, find a page, or start a focus session.`;
  }
  return "Hi, I am Sage. I can guide you around StudySphere, explain each section, and suggest what to do next.";
}

function getAssistantReply(message) {
  const text = message.toLowerCase();
  const context = getAssistantContext();

  if (matches(text, ["planner", "schedule", "plan", "timetable"])) {
    return pageReply("planner", "Use the Planner when you know what you want to achieve but need a realistic schedule.");
  }

  if (matches(text, ["task", "assignment", "homework", "due", "priority"])) {
    return pageReply("tasks", "Use Tasks to capture work, add due dates, choose a subject, and set priority.");
  }

  if (matches(text, ["timer", "pomodoro", "focus", "study session"])) {
    return pageReply("timer", "Use the Timer when you are ready to work. A 25-minute block is a good default.");
  }

  if (matches(text, ["game", "break", "tic", "anagram", "block", "trail"])) {
    return pageReply("game", "Use Games for short breaks. Focus Trail gets harder by level, and Anagrams keeps your mind active.");
  }

  if (matches(text, ["note", "notes", "online", "resource", "khan", "openstax", "scholar"])) {
    return pageReply("notes", "The Online Notes section is inside Planner. Search a topic or open trusted resources directly.");
  }

  if (matches(text, ["exam", "test", "countdown", "revision"])) {
    return "Go to Dashboard for Exam Countdown and Revision Queue. Add exam dates there, then use Planner to build the study schedule.";
  }

  if (matches(text, ["mood", "tired", "stress", "stressed", "energy", "burnout"])) {
    return "Use the Dashboard Mood Check-In. If energy is low, do one 25-minute focus block and one easy revision task. If energy is high, schedule deep work in Planner.";
  }

  if (matches(text, ["next", "what should i do", "recommend", "help me", "guide"])) {
    return getNextStepAdvice(context);
  }

  if (matches(text, ["premium", "upgrade", "paid", "price", "billing"])) {
    return "StudySphere Premium is KES 250/month. It unlocks unlimited plans, notes, flashcards, files, groups, grade insights, and stronger Sage guidance.\n\nOpen: [Premium](premium.html)";
  }

  if (matches(text, ["where", "find", "located", "go to"])) {
    return "Here is the map: Dashboard = overview and alerts, Planner = generated schedules and online notes, Tasks = assignments and due dates, Timer = Pomodoro focus, Games = break activities.";
  }

  return "I can help with navigation, planning, tasks, timer sessions, online notes, exams, revision, and study strategy. Try asking: 'What should I do next?' or 'Where are online notes?'";
}

function getAssistantContext() {
  const tasks = JSON.parse(localStorage.getItem("ss_tasks") || "[]");
  const exams = JSON.parse(localStorage.getItem("ss_exams") || "[]");
  const plans = JSON.parse(localStorage.getItem("ss_plans") || "[]");
  return {
    tasks,
    openTasks: tasks.filter(task => !task.completed),
    highTasks: tasks.filter(task => !task.completed && task.priority === "high"),
    exams,
    plans,
    mood: localStorage.getItem("ss_mood") || ""
  };
}

function getNextStepAdvice(context) {
  if (context.highTasks.length > 0) {
    return `Start with this high-priority task: ${context.highTasks[0].text}. Open Tasks to review it, then start a Timer session.`;
  }

  if (context.openTasks.length > 0 && context.plans.length === 0) {
    return "You have tasks but no saved plan yet. Open Planner, describe your goal, and create a schedule so the work feels smaller.";
  }

  if (context.exams.length > 0) {
    return "You have exams saved. Check the Dashboard countdown, then use Planner to make a revision schedule before the closest exam.";
  }

  if (context.openTasks.length > 0) {
    return `A good next move is: ${context.openTasks[0].text}. Start a 25-minute Timer session and work only on that.`;
  }

  return "Add one task first, then create a plan or start a 25-minute timer. Small starts beat perfect plans.";
}

function pageReply(key, extra) {
  const page = assistantPages[key];
  return `${extra}\n\nOpen: [${page.label}](${page.href})\n${page.summary}`;
}

function matches(text, words) {
  return words.some(word => text.indexOf(word) !== -1);
}

function formatAssistantText(text) {
  const safe = escapeAssistantHtml(text);
  return safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, "<br>");
}

function escapeAssistantHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

createAssistant();
