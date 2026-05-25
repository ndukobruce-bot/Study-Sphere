function featureLoad(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function featureSave(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function featureUser() {
  return JSON.parse(localStorage.getItem("ss_current_user") || "null");
}

function featureProfileKey() {
  const user = featureUser();
  return user ? "ss_profile_" + user.email : "ss_profile_guest";
}

function escapeFeature(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text || ""));
  return div.innerHTML;
}

function initProfile() {
  const form = document.getElementById("profile-form");
  if (!form) return;

  const user = featureUser() || {};
  const saved = JSON.parse(localStorage.getItem(featureProfileKey()) || "{}");
  const profile = { ...user, ...saved };

  document.getElementById("profile-name").value = profile.name || "";
  document.getElementById("profile-email").value = profile.email || "";
  document.getElementById("profile-university").value = profile.university || "";
  document.getElementById("profile-course").value = profile.course || "";
  document.getElementById("profile-target").value = profile.target || 120;
  document.getElementById("profile-subjects").value = profile.subjects || "";
  document.getElementById("profile-goal").value = profile.goal || "";
  renderProfileSummary(profile);

  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const updated = {
      name: document.getElementById("profile-name").value.trim(),
      email: document.getElementById("profile-email").value.trim(),
      university: document.getElementById("profile-university").value.trim(),
      course: document.getElementById("profile-course").value.trim(),
      target: document.getElementById("profile-target").value,
      subjects: document.getElementById("profile-subjects").value.trim(),
      goal: document.getElementById("profile-goal").value.trim()
    };
    localStorage.setItem(featureProfileKey(), JSON.stringify(updated));
    renderProfileSummary(updated);
  });
}

function renderProfileSummary(profile) {
  const el = document.getElementById("profile-summary");
  if (!el) return;
  el.innerHTML = `
    <div class="feature-item"><strong>${escapeFeature(profile.name || "Student")}</strong><span>${escapeFeature(profile.email || "No email")}</span></div>
    <div class="feature-item"><strong>${escapeFeature(profile.university || "University")}</strong><span>${escapeFeature(profile.course || "Course not set")}</span></div>
    <div class="feature-item"><strong>${escapeFeature(profile.target || "120")} min/day</strong><span>Daily study target</span></div>
    <div class="feature-item"><strong>Subjects</strong><span>${escapeFeature(profile.subjects || "Add your subjects")}</span></div>
    <div class="feature-item"><strong>Goal</strong><span>${escapeFeature(profile.goal || "Add a semester goal")}</span></div>
  `;
}

let calendarOffset = 0;

function initCalendar() {
  if (!document.getElementById("calendar-grid")) return;
  document.getElementById("calendar-prev").onclick = function() { calendarOffset -= 7; renderCalendar(); };
  document.getElementById("calendar-next").onclick = function() { calendarOffset += 7; renderCalendar(); };
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const title = document.getElementById("calendar-title");
  if (!grid || !title) return;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + calendarOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  title.textContent = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " - " + end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const events = collectCalendarEvents();
  grid.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    const dayEvents = events.filter(event => event.date === key);
    const cell = document.createElement("article");
    cell.className = "calendar-day";
    cell.innerHTML = `
      <strong>${date.toLocaleDateString("en-US", { weekday: "short" })}</strong>
      <span>${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      <div>${dayEvents.map(event => `<small class="${event.type}">${escapeFeature(event.label)}</small>`).join("") || "<em>No items</em>"}</div>
    `;
    grid.appendChild(cell);
  }
}

function collectCalendarEvents() {
  const tasks = featureLoad("ss_tasks").filter(task => task.dueDate).map(task => ({ date: task.dueDate, label: "Task: " + task.text, type: "task" }));
  const exams = featureLoad("ss_exams").map(exam => ({ date: exam.date, label: "Exam: " + exam.name, type: "exam" }));
  const plans = featureLoad("ss_plans").flatMap(plan => (plan.days || []).map(day => ({ date: day.date, label: "Plan: " + plan.subject, type: "plan" })));
  const groups = featureLoad("ss_groups").map(group => ({ date: group.time.slice(0, 10), label: "Group: " + group.name, type: "group" }));
  return tasks.concat(exams, plans, groups);
}

function initNotes() {
  const form = document.getElementById("note-form");
  if (!form) return;
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const notes = featureLoad("ss_notes");
    if (typeof canUsePremiumFeature === "function" && !canUsePremiumFeature("notes", notes.length)) {
      showUpgradePrompt("Unlimited notes");
      return;
    }
    notes.push({
      id: Date.now(),
      title: document.getElementById("note-title").value.trim(),
      subject: document.getElementById("note-subject").value.trim(),
      body: document.getElementById("note-body").value.trim(),
      createdAt: new Date().toISOString()
    });
    featureSave("ss_notes", notes);
    form.reset();
    renderNotes();
  });
  document.getElementById("note-search").oninput = renderNotes;
  renderNotes();
}

function renderNotes() {
  const list = document.getElementById("notes-list");
  if (!list) return;
  const query = (document.getElementById("note-search").value || "").toLowerCase();
  const notes = featureLoad("ss_notes").filter(note => (note.title + note.subject + note.body).toLowerCase().includes(query)).reverse();
  list.innerHTML = notes.length ? "" : `<p class="empty-panel">No notes yet.</p>`;
  notes.forEach(note => list.appendChild(featureCard(note.title, note.subject, note.body)));
}

function initFlashcards() {
  const form = document.getElementById("flashcard-form");
  if (!form) return;
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const cards = featureLoad("ss_flashcards");
    if (typeof canUsePremiumFeature === "function" && !canUsePremiumFeature("flashcards", cards.length)) {
      showUpgradePrompt("Unlimited flashcards");
      return;
    }
    cards.push({
      id: Date.now(),
      subject: document.getElementById("flash-subject").value.trim(),
      question: document.getElementById("flash-question").value.trim(),
      answer: document.getElementById("flash-answer").value.trim(),
      due: new Date().toISOString().slice(0, 10)
    });
    featureSave("ss_flashcards", cards);
    form.reset();
    renderFlashcards();
  });
  renderFlashcards();
}

function renderFlashcards() {
  const review = document.getElementById("flash-review");
  const list = document.getElementById("flash-list");
  if (!review || !list) return;
  const cards = featureLoad("ss_flashcards");
  const due = cards.find(card => !card.due || card.due <= new Date().toISOString().slice(0, 10));
  review.innerHTML = due ? `
    <div class="flash-review-card">
      <strong>${escapeFeature(due.question)}</strong>
      <details><summary>Show answer</summary><p>${escapeFeature(due.answer)}</p></details>
      <div class="feature-actions">
        <button class="btn-outline-sm" onclick="markFlash(${due.id}, 1)">Hard</button>
        <button class="btn-primary" onclick="markFlash(${due.id}, 4)">Easy</button>
      </div>
    </div>
  ` : `<p class="empty-panel">No cards due today.</p>`;
  list.innerHTML = cards.length ? "" : `<p class="empty-panel">No flashcards yet.</p>`;
  cards.slice().reverse().forEach(card => list.appendChild(featureCard(card.question, card.subject, "Due: " + (card.due || "today"))));
}

function markFlash(id, days) {
  const cards = featureLoad("ss_flashcards");
  const card = cards.find(item => item.id === id);
  if (card) {
    const due = new Date();
    due.setDate(due.getDate() + days);
    card.due = due.toISOString().slice(0, 10);
    featureSave("ss_flashcards", cards);
    renderFlashcards();
  }
}

function initGrades() {
  const form = document.getElementById("grade-form");
  if (!form) return;
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const grades = featureLoad("ss_grades");
    grades.push({
      id: Date.now(),
      course: document.getElementById("grade-course").value.trim(),
      title: document.getElementById("grade-title").value.trim(),
      score: parseFloat(document.getElementById("grade-score").value),
      weight: parseFloat(document.getElementById("grade-weight").value)
    });
    featureSave("ss_grades", grades);
    form.reset();
    renderGrades();
  });
  renderGrades();
}

function renderGrades() {
  const summary = document.getElementById("grade-summary");
  const list = document.getElementById("grade-list");
  if (!summary || !list) return;
  const grades = featureLoad("ss_grades");
  const weight = grades.reduce((sum, item) => sum + item.weight, 0);
  const weighted = grades.reduce((sum, item) => sum + (item.score * item.weight), 0);
  const average = weight ? Math.round(weighted / weight) : 0;
  const premium = typeof isPremium === "function" && isPremium();
  summary.innerHTML = `<div class="analytics-card"><span>Current Average</span><strong>${average}%</strong></div><div class="analytics-card"><span>Weight Logged</span><strong>${weight}%</strong></div>${premium ? `<div class="analytics-card"><span>Needed for 80%</span><strong>${Math.max(0, Math.round((80 - average) * 1.2))}%</strong></div>` : `<div class="analytics-card locked-card"><span>Premium Insight</span><strong><a href="premium.html">Unlock</a></strong></div>`}`;
  list.innerHTML = grades.length ? "" : `<p class="empty-panel">No grades added yet.</p>`;
  grades.slice().reverse().forEach(grade => list.appendChild(featureCard(grade.title, grade.course, grade.score + "% score - " + grade.weight + "% weight")));
}

function initFiles() {
  const form = document.getElementById("file-form");
  if (!form) return;
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const input = document.getElementById("file-input");
    const file = input.files[0];
    const files = featureLoad("ss_files");
    if (typeof canUsePremiumFeature === "function" && !canUsePremiumFeature("files", files.length)) {
      showUpgradePrompt("File attachments");
      return;
    }
    files.push({
      id: Date.now(),
      title: document.getElementById("file-title").value.trim(),
      subject: document.getElementById("file-subject").value.trim(),
      name: file ? file.name : "Unknown file",
      type: file ? file.type : "",
      size: file ? file.size : 0
    });
    featureSave("ss_files", files);
    form.reset();
    renderFiles();
  });
  renderFiles();
}

function renderFiles() {
  const list = document.getElementById("file-list");
  if (!list) return;
  const files = featureLoad("ss_files");
  list.innerHTML = files.length ? "" : `<p class="empty-panel">No file references yet.</p>`;
  files.slice().reverse().forEach(file => list.appendChild(featureCard(file.title, file.subject, file.name + " - " + Math.round((file.size || 0) / 1024) + " KB")));
}

function initGroups() {
  const form = document.getElementById("group-form");
  if (!form) return;
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    const groups = featureLoad("ss_groups");
    if (typeof canUsePremiumFeature === "function" && !canUsePremiumFeature("groups", groups.length)) {
      showUpgradePrompt("Unlimited study groups");
      return;
    }
    groups.push({
      id: Date.now(),
      name: document.getElementById("group-name").value.trim(),
      topic: document.getElementById("group-topic").value.trim(),
      time: document.getElementById("group-time").value,
      members: document.getElementById("group-members") ? document.getElementById("group-members").value.trim() : "",
      goal: document.getElementById("group-goal") ? document.getElementById("group-goal").value.trim() : "",
      link: document.getElementById("group-link").value.trim(),
      notes: document.getElementById("group-notes") ? document.getElementById("group-notes").value.trim() : ""
    });
    featureSave("ss_groups", groups);
    form.reset();
    renderGroups();
  });
  renderGroups();
}

function renderGroups() {
  const list = document.getElementById("group-list");
  if (!list) return;
  const groups = featureLoad("ss_groups");
  list.innerHTML = groups.length ? "" : `<p class="empty-panel">No group sessions yet.</p>`;
  groups.slice().reverse().forEach(group => {
    const details = [
      new Date(group.time).toLocaleString(),
      group.members ? "Members: " + group.members : "",
      group.goal ? "Goal: " + group.goal : "",
      group.notes ? "Notes: " + group.notes : ""
    ].filter(Boolean).join("\n");
    const card = featureCard(group.name, group.topic, details);
    if (group.link) card.innerHTML += `<a href="${escapeFeature(group.link)}" target="_blank" rel="noopener">Open shared link</a>`;
    list.appendChild(card);
  });
}

function featureCard(title, meta, body) {
  const item = document.createElement("article");
  item.className = "feature-item";
  item.innerHTML = `<strong>${escapeFeature(title)}</strong><span>${escapeFeature(meta)}</span><p>${escapeFeature(body)}</p>`;
  return item;
}

initProfile();
initCalendar();
initNotes();
initFlashcards();
initGrades();
initFiles();
initGroups();
