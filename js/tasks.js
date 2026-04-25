// ============================================
//  STUDYSPHERE — tasks.js
// ============================================

function loadTasks() {
  const stored = localStorage.getItem("ss_tasks");
  return stored ? JSON.parse(stored) : [];
}

function saveTasks(tasks) {
  localStorage.setItem("ss_tasks", JSON.stringify(tasks));
}

function addTask() {
  const input    = document.getElementById("task-input");
  const priority = document.getElementById("task-priority");

  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    input.focus();
    input.style.borderColor = "#ef4444";
    setTimeout(() => (input.style.borderColor = ""), 1000);
    return;
  }

  const tasks = loadTasks();

  const task = {
    id:        Date.now(),
    text:      text,
    priority:  priority ? priority.value : "medium",
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  saveTasks(tasks);

  input.value = "";
  renderTasks();
  updateTaskCount();
}

function deleteTask(id) {
  let tasks = loadTasks();
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  renderTasks();
  updateTaskCount();
}

function toggleTask(id) {
  const tasks = loadTasks();
  const task  = tasks.find(t => t.id === id);
  if (task) task.completed = !task.completed;
  saveTasks(tasks);
  renderTasks();
  updateTaskCount();
}

function clearCompleted() {
  let tasks = loadTasks();
  tasks = tasks.filter(t => !t.completed);
  saveTasks(tasks);
  renderTasks();
  updateTaskCount();
}

let currentFilter = "all";

function filterTasks(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderTasks();
}

function renderTasks() {
  const listEl  = document.getElementById("task-list");
  const emptyEl = document.getElementById("empty-state");

  if (!listEl) return;

  let tasks = loadTasks();

  if (currentFilter === "pending") {
    tasks = tasks.filter(t => !t.completed);
  } else if (currentFilter === "completed") {
    tasks = tasks.filter(t => t.completed);
  }

  listEl.innerHTML = "";

  if (tasks.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  tasks.sort((a, b) => a.completed - b.completed);

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.className = `task-item${task.completed ? " completed" : ""}`;

    li.innerHTML = `
      <div class="task-checkbox${task.completed ? " done" : ""}"
           onclick="toggleTask(${task.id})"
           title="Mark complete">
      </div>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <span class="priority-badge ${task.priority}">${task.priority}</span>
      <button class="task-delete" onclick="deleteTask(${task.id})" title="Delete task">✕</button>
    `;

    listEl.appendChild(li);
  });
}

function updateTaskCount() {
  const countEl = document.getElementById("task-count-info");
  if (!countEl) return;

  const tasks     = loadTasks();
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;

  countEl.textContent = `${completed} / ${total} completed`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

const taskInput = document.getElementById("task-input");
if (taskInput) {
  taskInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") addTask();
  });
}

renderTasks();
updateTaskCount();