(function() {
  function load(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function user() {
    return load("ss_current_user", null);
  }

  function userKey(prefix) {
    const current = user();
    return current && current.email ? `${prefix}_${current.email}` : `${prefix}_guest`;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(value || "")));
    return div.innerHTML;
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function toIso(date) {
    return new Date(date).toISOString().slice(0, 10);
  }

  function daysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((endDate - startDate) / 86400000));
  }

  function splitList(text) {
    return String(text || "")
      .split(/[\n,]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function getOnboarding() {
    return load(userKey("ss_onboarding"), {});
  }

  function saveOnboarding(data) {
    save(userKey("ss_onboarding"), data);
  }

  function parseExamLines(text) {
    return String(text || "").split("\n").map(line => {
      const match = line.match(/^(.+?)(?:\s+-\s+|\s+on\s+)(\d{4}-\d{2}-\d{2})$/i);
      if (!match) return null;
      return {
        id: Date.now() + Math.random(),
        name: match[1].trim(),
        date: match[2],
        source: "onboarding"
      };
    }).filter(Boolean);
  }

  function initOnboarding() {
    const form = document.getElementById("onboarding-form");
    if (!form) return;

    const current = user() || {};
    const saved = getOnboarding();
    const fields = {
      "onboard-name": saved.name || current.name || "",
      "onboard-university": saved.university || current.university || "",
      "onboard-course": saved.course || current.course || "",
      "onboard-year": saved.year || "",
      "onboard-semester": saved.semester || "",
      "onboard-subjects": (saved.subjects || []).join(", "),
      "onboard-weak-subjects": (saved.weakSubjects || []).join(", "),
      "onboard-minutes": saved.dailyMinutes || 120,
      "onboard-days": (saved.availableDays || []).join(", "),
      "onboard-exams": (saved.examLines || ""),
      "onboard-goal": saved.semesterGoal || ""
    };

    Object.keys(fields).forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = fields[id];
    });

    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const data = {
        name: document.getElementById("onboard-name").value.trim(),
        university: document.getElementById("onboard-university").value.trim(),
        course: document.getElementById("onboard-course").value.trim(),
        year: document.getElementById("onboard-year").value.trim(),
        semester: document.getElementById("onboard-semester").value.trim(),
        subjects: splitList(document.getElementById("onboard-subjects").value),
        weakSubjects: splitList(document.getElementById("onboard-weak-subjects").value),
        dailyMinutes: Number(document.getElementById("onboard-minutes").value || 120),
        availableDays: splitList(document.getElementById("onboard-days").value),
        examLines: document.getElementById("onboard-exams").value.trim(),
        semesterGoal: document.getElementById("onboard-goal").value.trim(),
        completedAt: new Date().toISOString()
      };

      saveOnboarding(data);
      const profileKey = userKey("ss_profile");
      const profile = load(profileKey, {});
      save(profileKey, {
        ...profile,
        name: data.name,
        university: data.university,
        course: data.course,
        subjects: data.subjects.join(", "),
        target: data.dailyMinutes,
        goal: data.semesterGoal
      });

      const existingExams = load("ss_exams", []);
      const parsedExams = parseExamLines(data.examLines);
      const merged = existingExams.concat(parsedExams.filter(exam => {
        return !existingExams.some(item => item.name === exam.name && item.date === exam.date);
      }));
      save("ss_exams", merged);
      renderOnboardingSummary(data);
    });

    renderOnboardingSummary(saved);
  }

  function renderOnboardingSummary(data) {
    const target = document.getElementById("onboarding-summary");
    if (!target) return;
    if (!data || !data.completedAt) {
      target.innerHTML = `<p class="empty-panel">Complete setup once, then Autopilot and Sage can personalize the whole app.</p>`;
      return;
    }

    target.innerHTML = `
      <article class="smart-result-card">
        <span>Student Profile</span>
        <strong>${escapeHtml(data.name || "Student")} at ${escapeHtml(data.university || "University")}</strong>
        <p>${escapeHtml(data.course || "Course")} - ${escapeHtml(data.year || "Year not set")} - ${escapeHtml(data.semester || "Semester not set")}</p>
      </article>
      <article class="smart-result-card">
        <span>Study Load</span>
        <strong>${escapeHtml((data.subjects || []).join(", ") || "Subjects not set")}</strong>
        <p>Weak areas: ${escapeHtml((data.weakSubjects || []).join(", ") || "None listed yet")}</p>
      </article>
      <article class="smart-result-card">
        <span>Availability</span>
        <strong>${escapeHtml(data.dailyMinutes || 120)} minutes per study day</strong>
        <p>${escapeHtml((data.availableDays || []).join(", ") || "Any day")}</p>
      </article>
    `;
  }

  function initAutopilot() {
    const form = document.getElementById("autopilot-form");
    if (!form) return;

    const setup = getOnboarding();
    const goal = document.getElementById("autopilot-goal");
    const deadline = document.getElementById("autopilot-deadline");
    const minutes = document.getElementById("autopilot-minutes");
    const focus = document.getElementById("autopilot-focus");

    goal.value = setup.semesterGoal || "";
    minutes.value = setup.dailyMinutes || 120;
    focus.value = (setup.weakSubjects || setup.subjects || []).join(", ");
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 14);
    deadline.value = toIso(defaultDeadline);

    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const plan = buildAutopilotPlan({
        goal: goal.value.trim(),
        deadline: deadline.value,
        minutes: Number(minutes.value || 120),
        focus: splitList(focus.value),
        days: splitList(document.getElementById("autopilot-days").value),
        notes: document.getElementById("autopilot-context").value.trim()
      });
      window.currentAutopilotPlan = plan;
      renderAutopilotPlan(plan);
    });

    const saveBtn = document.getElementById("save-autopilot-plan");
    if (saveBtn) {
      saveBtn.onclick = function() {
        if (!window.currentAutopilotPlan) return;
        persistAutopilotPlan(window.currentAutopilotPlan);
      };
    }
  }

  function buildAutopilotPlan(input) {
    const start = todayIso();
    const totalDays = Math.max(1, daysBetween(start, input.deadline) + 1);
    const focusAreas = input.focus.length ? input.focus : ["Core revision"];
    const blocksPerDay = Math.max(2, Math.min(5, Math.round(input.minutes / 35)));
    const days = [];

    for (let i = 0; i < totalDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      const allowed = !input.days.length || input.days.some(day => dayName.toLowerCase().startsWith(day.toLowerCase().slice(0, 3)));
      if (!allowed) continue;

      const focusArea = focusAreas[i % focusAreas.length];
      const intensity = i < Math.ceil(totalDays * 0.35) ? "Understand" : i < Math.ceil(totalDays * 0.72) ? "Practice" : "Recall";
      const blocks = [];
      for (let block = 0; block < blocksPerDay; block++) {
        const type = block === 0 ? "Preview" : block === blocksPerDay - 1 ? "Active recall" : intensity;
        blocks.push({
          time: `${Math.max(20, Math.floor(input.minutes / blocksPerDay))} min`,
          task: `${type}: ${focusArea}`,
          reason: block === blocksPerDay - 1 ? "Lock it into memory with questions or flashcards." : "Move the topic forward in a focused block."
        });
      }
      days.push({ date: toIso(date), dayName, focusArea, blocks });
    }

    return {
      id: Date.now(),
      goal: input.goal || "Study goal",
      subject: focusAreas[0] || "General study",
      deadline: input.deadline,
      minutes: input.minutes,
      context: input.notes,
      createdAt: new Date().toISOString(),
      days
    };
  }

  function renderAutopilotPlan(plan) {
    const output = document.getElementById("autopilot-output");
    if (!output) return;
    output.innerHTML = `
      <div class="smart-summary-band">
        <div><span>Goal</span><strong>${escapeHtml(plan.goal)}</strong></div>
        <div><span>Deadline</span><strong>${escapeHtml(plan.deadline)}</strong></div>
        <div><span>Study Days</span><strong>${plan.days.length}</strong></div>
      </div>
      <div class="smart-plan-list">
        ${plan.days.map(day => `
          <article class="smart-plan-day">
            <div>
              <strong>${escapeHtml(day.dayName)}</strong>
              <span>${escapeHtml(day.date)} - ${escapeHtml(day.focusArea)}</span>
            </div>
            <ul>
              ${day.blocks.map(block => `<li><b>${escapeHtml(block.time)}</b> ${escapeHtml(block.task)} <small>${escapeHtml(block.reason)}</small></li>`).join("")}
            </ul>
          </article>
        `).join("")}
      </div>
    `;
  }

  function persistAutopilotPlan(plan) {
    const plans = load("ss_plans", []);
    plans.push(plan);
    save("ss_plans", plans);

    const tasks = load("ss_tasks", []);
    plan.days.slice(0, 10).forEach(day => {
      tasks.push({
        id: Date.now() + Math.random(),
        text: `${plan.goal}: ${day.focusArea}`,
        subject: plan.subject,
        priority: daysBetween(todayIso(), day.date) < 3 ? "high" : "medium",
        dueDate: day.date,
        completed: false,
        createdAt: new Date().toISOString(),
        source: "autopilot"
      });
    });
    save("ss_tasks", tasks);

    const status = document.getElementById("autopilot-status");
    if (status) status.textContent = "Saved to Planner and Tasks.";
  }

  function initReminders() {
    const list = document.getElementById("reminder-list");
    if (!list) return;

    const form = document.getElementById("custom-reminder-form");
    if (form) {
      form.addEventListener("submit", function(event) {
        event.preventDefault();
        const reminders = load("ss_custom_reminders", []);
        reminders.push({
          id: Date.now(),
          title: document.getElementById("custom-reminder-title").value.trim(),
          date: document.getElementById("custom-reminder-date").value,
          type: "custom",
          createdAt: new Date().toISOString()
        });
        save("ss_custom_reminders", reminders);
        form.reset();
        renderReminders();
      });
    }

    const permissionBtn = document.getElementById("enable-browser-reminders");
    if (permissionBtn) {
      permissionBtn.onclick = function() {
        if (!("Notification" in window)) {
          setReminderStatus("Browser notifications are not available here.");
          return;
        }
        Notification.requestPermission().then(permission => {
          setReminderStatus(permission === "granted" ? "Browser reminders enabled for this device." : "Browser reminders were not enabled.");
        });
      };
    }

    renderReminders();
  }

  function collectReminders() {
    const tasks = load("ss_tasks", []).filter(task => !task.completed && task.dueDate).map(task => ({
      title: `Task due: ${task.text}`,
      date: task.dueDate,
      type: task.priority === "high" ? "urgent" : "task"
    }));
    const exams = load("ss_exams", []).map(exam => ({
      title: `Exam approaching: ${exam.name}`,
      date: exam.date,
      type: "exam"
    }));
    const plans = load("ss_plans", []).flatMap(plan => (plan.days || []).slice(0, 5).map(day => ({
      title: `Plan block: ${plan.goal || plan.subject}`,
      date: day.date,
      type: "plan"
    })));
    const premium = load(userKey("ss_premium"), null);
    const billing = premium && premium.premiumExpiresAt ? [{
      title: "Premium renewal check",
      date: premium.premiumExpiresAt.slice(0, 10),
      type: "billing"
    }] : [];
    return tasks.concat(exams, plans, billing, load("ss_custom_reminders", []))
      .filter(item => item.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function renderReminders() {
    const list = document.getElementById("reminder-list");
    if (!list) return;
    const reminders = collectReminders();
    list.innerHTML = reminders.length ? "" : `<p class="empty-panel">No reminders yet. Add tasks, exams, plans, or a custom reminder.</p>`;
    reminders.forEach(item => {
      const diff = daysBetween(todayIso(), item.date);
      const label = diff === 0 ? "Today" : diff < 0 ? `${Math.abs(diff)} days overdue` : `${diff} days left`;
      const card = document.createElement("article");
      card.className = `feature-item reminder-${item.type || "custom"}`;
      card.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.date)} - ${label}</span><p>${getReminderAdvice(item, diff)}</p>`;
      list.appendChild(card);
    });
  }

  function getReminderAdvice(item, diff) {
    if (diff < 0) return "Handle this first or reschedule it today.";
    if (diff === 0) return "Put this into a focused session today.";
    if (item.type === "exam") return "Use Exam Mode to build a revision sprint.";
    if (diff <= 2) return "Break it into one small task now.";
    return "Scheduled early enough. Keep it visible.";
  }

  function setReminderStatus(text) {
    const status = document.getElementById("reminder-status");
    if (status) status.textContent = text;
  }

  function initSummarizer() {
    const form = document.getElementById("summarizer-form");
    if (!form) return;
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const title = document.getElementById("summary-title").value.trim() || "Study note";
      const subject = document.getElementById("summary-subject").value.trim() || "General";
      const text = document.getElementById("summary-source").value.trim();
      const result = summarizeText(title, subject, text);
      window.currentSummaryResult = result;
      renderSummary(result);
    });

    const saveBtn = document.getElementById("save-summary-assets");
    if (saveBtn) {
      saveBtn.onclick = function() {
        if (!window.currentSummaryResult) return;
        saveSummaryAssets(window.currentSummaryResult);
      };
    }
  }

  function summarizeText(title, subject, text) {
    const sentences = (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map(sentence => sentence.trim()).filter(sentence => sentence.length > 24);
    const words = text.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
    const stop = new Set(["this", "that", "with", "from", "have", "will", "into", "about", "between", "because", "when", "where", "which", "their", "there", "these", "those", "study", "notes"]);
    const counts = {};
    words.forEach(word => {
      if (!stop.has(word)) counts[word] = (counts[word] || 0) + 1;
    });
    const keywords = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 8);
    const ranked = sentences.map(sentence => ({
      sentence,
      score: keywords.reduce((sum, key) => sum + (sentence.toLowerCase().includes(key) ? 1 : 0), 0)
    })).sort((a, b) => b.score - a.score);
    const summary = ranked.slice(0, 4).map(item => item.sentence);
    const checklist = keywords.slice(0, 5).map(key => `Explain ${key} without looking at the notes.`);
    const flashcards = keywords.slice(0, 6).map(key => ({
      question: `What is the role of ${key} in ${subject}?`,
      answer: `Review your note and explain ${key} using one example.`
    }));
    const quiz = keywords.slice(0, 5).map(key => `How would you apply ${key} in an exam question?`);
    return { title, subject, source: text, summary, keywords, checklist, flashcards, quiz, createdAt: new Date().toISOString() };
  }

  function renderSummary(result) {
    const output = document.getElementById("summary-output");
    if (!output) return;
    output.innerHTML = `
      <article class="smart-result-card wide">
        <span>Summary</span>
        <strong>${escapeHtml(result.title)}</strong>
        <ul>${result.summary.map(item => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Add more note text for a stronger summary.</li>"}</ul>
      </article>
      <article class="smart-result-card">
        <span>Key Terms</span>
        <strong>${escapeHtml(result.keywords.join(", ") || "No terms found")}</strong>
      </article>
      <article class="smart-result-card">
        <span>Revision Checklist</span>
        <ul>${result.checklist.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="smart-result-card">
        <span>Quiz Questions</span>
        <ul>${result.quiz.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    `;
  }

  function saveSummaryAssets(result) {
    const notes = load("ss_notes", []);
    notes.push({
      id: Date.now(),
      title: result.title,
      subject: result.subject,
      body: result.summary.join("\n"),
      createdAt: new Date().toISOString(),
      source: "summarizer"
    });
    save("ss_notes", notes);

    const cards = load("ss_flashcards", []);
    result.flashcards.forEach(card => cards.push({
      id: Date.now() + Math.random(),
      subject: result.subject,
      question: card.question,
      answer: card.answer,
      due: todayIso()
    }));
    save("ss_flashcards", cards);

    const status = document.getElementById("summary-status");
    if (status) status.textContent = "Saved as a note and flashcards.";
  }

  function initExamMode() {
    const form = document.getElementById("exam-mode-form");
    if (!form) return;
    renderExamOptions();
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const examId = document.getElementById("exam-mode-select").value;
      const exams = load("ss_exams", []);
      const selected = exams.find(exam => String(exam.id) === examId) || {
        name: document.getElementById("exam-mode-name").value.trim() || "Upcoming exam",
        date: document.getElementById("exam-mode-date").value || todayIso()
      };
      const plan = buildExamSprint({
        exam: selected,
        topics: splitList(document.getElementById("exam-mode-topics").value),
        weakAreas: splitList(document.getElementById("exam-mode-weak").value),
        confidence: Number(document.getElementById("exam-confidence").value || 50)
      });
      window.currentExamSprint = plan;
      renderExamSprint(plan);
    });

    const saveBtn = document.getElementById("save-exam-sprint");
    if (saveBtn) {
      saveBtn.onclick = function() {
        if (!window.currentExamSprint) return;
        saveExamSprint(window.currentExamSprint);
      };
    }
  }

  function renderExamOptions() {
    const select = document.getElementById("exam-mode-select");
    if (!select) return;
    const exams = load("ss_exams", []);
    select.innerHTML = `<option value="">Manual exam</option>` + exams.map(exam => `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)} - ${escapeHtml(exam.date)}</option>`).join("");
  }

  function buildExamSprint(input) {
    const daysLeft = Math.max(0, daysBetween(todayIso(), input.exam.date));
    const topics = input.topics.length ? input.topics : ["Core concepts", "Past papers", "Weak areas"];
    const weak = input.weakAreas.length ? input.weakAreas : topics.slice(0, 2);
    const dailyLoad = input.confidence < 45 ? 4 : input.confidence < 75 ? 3 : 2;
    const todayBlocks = [];
    for (let i = 0; i < dailyLoad; i++) {
      const topic = (i < weak.length ? weak[i] : topics[i % topics.length]);
      todayBlocks.push({
        title: i === dailyLoad - 1 ? `Active recall: ${topic}` : `Revise: ${topic}`,
        minutes: i === dailyLoad - 1 ? 25 : 40
      });
    }
    const mockQuestions = topics.slice(0, 6).map(topic => `Explain ${topic}, then solve one exam-style question without notes.`);
    return {
      id: Date.now(),
      exam: input.exam,
      daysLeft,
      confidence: input.confidence,
      todayBlocks,
      mockQuestions,
      createdAt: new Date().toISOString()
    };
  }

  function renderExamSprint(plan) {
    const output = document.getElementById("exam-mode-output");
    if (!output) return;
    output.innerHTML = `
      <div class="smart-summary-band">
        <div><span>Exam</span><strong>${escapeHtml(plan.exam.name)}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(plan.exam.date)}</strong></div>
        <div><span>Countdown</span><strong>${plan.daysLeft} days</strong></div>
      </div>
      <article class="smart-result-card wide">
        <span>Today Revision Sprint</span>
        <ul>${plan.todayBlocks.map(block => `<li><b>${block.minutes} min</b> ${escapeHtml(block.title)}</li>`).join("")}</ul>
      </article>
      <article class="smart-result-card wide">
        <span>Mock Questions</span>
        <ul>${plan.mockQuestions.map(question => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
      </article>
    `;
  }

  function saveExamSprint(plan) {
    const tasks = load("ss_tasks", []);
    plan.todayBlocks.forEach(block => tasks.push({
      id: Date.now() + Math.random(),
      text: `${plan.exam.name}: ${block.title}`,
      subject: plan.exam.name,
      priority: "high",
      dueDate: todayIso(),
      completed: false,
      source: "exam-mode",
      createdAt: new Date().toISOString()
    }));
    save("ss_tasks", tasks);
    const sprints = load("ss_exam_sprints", []);
    sprints.push(plan);
    save("ss_exam_sprints", sprints);
    const status = document.getElementById("exam-mode-status");
    if (status) status.textContent = "Saved to today's tasks.";
  }

  function initReport() {
    const output = document.getElementById("weekly-report-output");
    if (!output) return;
    renderReport();
    const refresh = document.getElementById("refresh-report");
    if (refresh) refresh.onclick = renderReport;
  }

  function renderReport() {
    const output = document.getElementById("weekly-report-output");
    const tasks = load("ss_tasks", []);
    const plans = load("ss_plans", []);
    const notes = load("ss_notes", []);
    const flashcards = load("ss_flashcards", []);
    const grades = load("ss_grades", []);
    const pomodoros = load("ss_pomodoros", {});
    const completed = tasks.filter(task => task.completed).length;
    const open = tasks.length - completed;
    const sessions = Object.values(pomodoros).reduce((sum, value) => sum + Number(value || 0), 0);
    const subjects = {};
    tasks.forEach(task => {
      const key = task.subject || "General";
      subjects[key] = (subjects[key] || 0) + 1;
    });
    const weakest = Object.keys(subjects).sort((a, b) => subjects[b] - subjects[a])[0] || "No subject data yet";
    const gradeWeight = grades.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    const gradeScore = grades.reduce((sum, item) => sum + Number(item.score || 0) * Number(item.weight || 0), 0);
    const average = gradeWeight ? Math.round(gradeScore / gradeWeight) : 0;
    const consistency = Math.min(100, Math.round((completed * 8) + (sessions * 6) + (plans.length * 6)));

    output.innerHTML = `
      <div class="smart-summary-band">
        <div><span>Consistency</span><strong>${consistency}%</strong></div>
        <div><span>Focus Sessions</span><strong>${sessions}</strong></div>
        <div><span>Grade Average</span><strong>${average || "N/A"}${average ? "%" : ""}</strong></div>
      </div>
      <div class="report-grid">
        <article class="smart-result-card"><span>Tasks</span><strong>${completed} done / ${open} open</strong><p>Finish the oldest open task before adding more work.</p></article>
        <article class="smart-result-card"><span>Planning</span><strong>${plans.length} saved plans</strong><p>${plans.length ? "Keep using Autopilot for heavy weeks." : "Create one Autopilot plan to structure your week."}</p></article>
        <article class="smart-result-card"><span>Materials</span><strong>${notes.length} notes / ${flashcards.length} flashcards</strong><p>Turn your best notes into recall questions.</p></article>
        <article class="smart-result-card"><span>Attention Area</span><strong>${escapeHtml(weakest)}</strong><p>Sage recommends a focused revision block here next.</p></article>
      </div>
    `;
  }

  initOnboarding();
  initAutopilot();
  initReminders();
  initSummarizer();
  initExamMode();
  initReport();
})();
