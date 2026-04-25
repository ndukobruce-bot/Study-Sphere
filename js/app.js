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