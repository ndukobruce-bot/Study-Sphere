// ============================================
//  STUDYSPHERE - timer.js
//  Pomodoro Timer - study, short break, long break
// ============================================

const MODES = {
  study: { label: "Study Time", minutes: 25, tip: "Close distracting tabs and put your phone face down." },
  short: { label: "Short Break", minutes: 5, tip: "Stretch, grab some water, rest your eyes." },
  long: { label: "Long Break", minutes: 15, tip: "Great work. Take a proper break and walk around." }
};

let currentMode = "study";
let totalSeconds = MODES.study.minutes * 60;
let secondsLeft = totalSeconds;
let timerInterval = null;
let timerEndsAt = 0;
let lastWholeSecond = secondsLeft;
let isRunning = false;
let sessionsDone = 0;
let breaksTaken = 0;
let totalStudySec = 0;
const MAX_SESSIONS = 4;

const RING_RADIUS = 95;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ringFill = document.getElementById("ring-fill");
const timerDisplay = document.getElementById("timer-display");
const modeLabel = document.getElementById("mode-label");
const sessionLabel = document.getElementById("session-label");
const startBtn = document.getElementById("start-btn");

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateRing() {
  const progress = secondsLeft / totalSeconds;
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  if (!ringFill) return;

  ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
  ringFill.style.strokeDashoffset = offset;
  ringFill.style.stroke = currentMode === "study" ? "#00c8ff" : currentMode === "short" ? "#22c55e" : "#7c5cfc";
}

function updateDisplay() {
  if (timerDisplay) timerDisplay.textContent = formatTime(secondsLeft);
  if (modeLabel) modeLabel.textContent = MODES[currentMode].label;
  if (sessionLabel) sessionLabel.textContent = `Session ${sessionsDone + 1}`;
  document.title = `${formatTime(secondsLeft)} - StudySphere`;
  updateRing();
  updateStats();
  renderDots();
}

function syncTimerFromClock() {
  if (!isRunning) return;

  const nextSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
  if (nextSeconds !== lastWholeSecond) {
    if (currentMode === "study" && nextSeconds < secondsLeft) {
      totalStudySec += secondsLeft - nextSeconds;
    }
    secondsLeft = nextSeconds;
    lastWholeSecond = nextSeconds;
    updateDisplay();
  }

  if (secondsLeft <= 0) {
    clearInterval(timerInterval);
    isRunning = false;
    timerEndsAt = 0;
    onTimerEnd();
  }
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timerEndsAt = Date.now() + secondsLeft * 1000;
  lastWholeSecond = secondsLeft;
  if (startBtn) startBtn.textContent = "Pause";

  clearInterval(timerInterval);
  timerInterval = setInterval(syncTimerFromClock, 250);
  syncTimerFromClock();
}

function pauseTimer() {
  syncTimerFromClock();
  isRunning = false;
  clearInterval(timerInterval);
  if (startBtn) startBtn.textContent = "Resume";
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  timerEndsAt = 0;
  secondsLeft = totalSeconds;
  lastWholeSecond = secondsLeft;
  if (startBtn) startBtn.textContent = "Start";
  updateDisplay();
}

function skipSession() {
  clearInterval(timerInterval);
  isRunning = false;
  timerEndsAt = 0;
  onTimerEnd();
}

function onTimerEnd() {
  playBeep();

  if (currentMode === "study") {
    sessionsDone++;
    savePomodoros();

    if (sessionsDone >= MAX_SESSIONS) {
      alert("Excellent. You completed 4 Pomodoro sessions. Time for a long break.");
      sessionsDone = 0;
      switchMode("long");
    } else {
      alert("Session complete. Time for a short break.");
      switchMode("short");
    }
  } else {
    breaksTaken++;
    alert("Break over. Ready for another session?");
    switchMode("study");
  }
}

function switchMode(mode) {
  currentMode = mode;
  totalSeconds = MODES[mode].minutes * 60;
  secondsLeft = totalSeconds;
  lastWholeSecond = secondsLeft;
  timerEndsAt = 0;
  isRunning = false;
  clearInterval(timerInterval);

  if (startBtn) startBtn.textContent = "Start";

  document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
  const tab = document.getElementById(`tab-${mode}`);
  if (tab) tab.classList.add("active");

  const tipEl = document.getElementById("timer-tip");
  if (tipEl) tipEl.textContent = MODES[mode].tip;

  updateDisplay();
}

function renderDots() {
  const dotsEl = document.getElementById("session-dots");
  if (!dotsEl) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < MAX_SESSIONS; i++) {
    const dot = document.createElement("div");
    dot.className = `session-dot${i < sessionsDone ? " done" : ""}`;
    fragment.appendChild(dot);
  }
  dotsEl.replaceChildren(fragment);
}

function updateStats() {
  const tsSession = document.getElementById("ts-sessions");
  const tsTime = document.getElementById("ts-time");
  const tsBreaks = document.getElementById("ts-breaks");

  if (tsSession) tsSession.textContent = sessionsDone;
  if (tsBreaks) tsBreaks.textContent = breaksTaken;
  if (tsTime) tsTime.textContent = `${Math.floor(totalStudySec / 60)} min`;
}

function savePomodoros() {
  const today = new Date().toDateString();
  const stored = localStorage.getItem("ss_pomodoros");
  const data = stored ? JSON.parse(stored) : {};
  data[today] = (data[today] || 0) + 1;
  localStorage.setItem("ss_pomodoros", JSON.stringify(data));

  const studyMins = localStorage.getItem("ss_study_mins_today") || "0";
  localStorage.setItem("ss_study_mins_today", (parseInt(studyMins) + MODES.study.minutes).toString());
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.log("Beep skipped:", e);
  }
}

updateDisplay();
