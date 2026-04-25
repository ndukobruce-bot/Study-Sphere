// ============================================
//  STUDYSPHERE — timer.js
//  Pomodoro Timer — study, short break, long break
// ============================================

// ---- TIMER CONFIG ----
const MODES = {
  study: { label: "Study Time",   minutes: 25, tip: "💡 Close distracting tabs and put your phone face down." },
  short: { label: "Short Break",  minutes: 5,  tip: "☕ Stretch, grab some water, rest your eyes." },
  long:  { label: "Long Break",   minutes: 15, tip: "🎵 Great work! Take a proper break. Walk around." }
};

// ---- STATE ----
let currentMode    = "study";
let totalSeconds   = MODES.study.minutes * 60;
let secondsLeft    = totalSeconds;
let timerInterval  = null;
let isRunning      = false;
let sessionsDone   = 0;
let breaksTaken    = 0;
let totalStudySec  = 0;
const MAX_SESSIONS = 4;

// ---- RING SETUP ----
const RING_RADIUS        = 95;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ringFill     = document.getElementById("ring-fill");
const timerDisplay = document.getElementById("timer-display");
const modeLabel    = document.getElementById("mode-label");
const sessionLabel = document.getElementById("session-label");
const startBtn     = document.getElementById("start-btn");

// ---- FORMAT TIME ----
function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---- UPDATE RING ----
function updateRing() {
  const progress = secondsLeft / totalSeconds;
  const offset   = RING_CIRCUMFERENCE * (1 - progress);
  if (ringFill) {
    ringFill.style.strokeDasharray  = RING_CIRCUMFERENCE;
    ringFill.style.strokeDashoffset = offset;

    if (currentMode === "study") {
      ringFill.style.stroke = "#00c8ff";
    } else if (currentMode === "short") {
      ringFill.style.stroke = "#22c55e";
    } else {
      ringFill.style.stroke = "#7c5cfc";
    }
  }
}

// ---- UPDATE DISPLAY ----
function updateDisplay() {
  if (timerDisplay) timerDisplay.textContent = formatTime(secondsLeft);
  if (modeLabel)    modeLabel.textContent    = MODES[currentMode].label;
  if (sessionLabel) sessionLabel.textContent = `Session ${sessionsDone + 1}`;
  document.title = `${formatTime(secondsLeft)} — StudySphere`;
  updateRing();
  updateStats();
  renderDots();
}

// ---- TOGGLE START / PAUSE ----
function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  isRunning = true;
  if (startBtn) startBtn.textContent = "⏸ Pause";

  timerInterval = setInterval(() => {
    secondsLeft--;

    if (currentMode === "study") totalStudySec++;

    updateDisplay();

    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      onTimerEnd();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  if (startBtn) startBtn.textContent = "▶ Resume";
}

// ---- RESET TIMER ----
function resetTimer() {
  clearInterval(timerInterval);
  isRunning   = false;
  secondsLeft = totalSeconds;
  if (startBtn) startBtn.textContent = "▶ Start";
  updateDisplay();
}

// ---- SKIP SESSION ----
function skipSession() {
  clearInterval(timerInterval);
  isRunning = false;
  onTimerEnd();
}

// ---- TIMER END ----
function onTimerEnd() {
  playBeep();

  if (currentMode === "study") {
    sessionsDone++;
    savePomodoros();

    if (sessionsDone >= MAX_SESSIONS) {
      alert("🎉 Excellent! You completed 4 Pomodoro sessions. Time for a long break!");
      sessionsDone = 0;
      switchMode("long");
    } else {
      alert("✅ Session complete! Time for a short break.");
      switchMode("short");
    }

  } else {
    breaksTaken++;
    alert("⏱ Break over! Ready for another session?");
    switchMode("study");
  }
}

// ---- SWITCH MODE ----
function switchMode(mode) {
  currentMode  = mode;
  totalSeconds = MODES[mode].minutes * 60;
  secondsLeft  = totalSeconds;
  isRunning    = false;
  clearInterval(timerInterval);

  if (startBtn) startBtn.textContent = "▶ Start";

  document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
  const tab = document.getElementById(`tab-${mode}`);
  if (tab) tab.classList.add("active");

  const tipEl = document.getElementById("timer-tip");
  if (tipEl) tipEl.textContent = MODES[mode].tip;

  updateDisplay();
}

// ---- SESSION DOTS ----
function renderDots() {
  const dotsEl = document.getElementById("session-dots");
  if (!dotsEl) return;

  dotsEl.innerHTML = "";
  for (let i = 0; i < MAX_SESSIONS; i++) {
    const dot = document.createElement("div");
    dot.className = `session-dot${i < sessionsDone ? " done" : ""}`;
    dotsEl.appendChild(dot);
  }
}

// ---- UPDATE STATS DISPLAY ----
function updateStats() {
  const tsSession = document.getElementById("ts-sessions");
  const tsTime    = document.getElementById("ts-time");
  const tsBreaks  = document.getElementById("ts-breaks");

  if (tsSession) tsSession.textContent = sessionsDone;
  if (tsBreaks)  tsBreaks.textContent  = breaksTaken;
  if (tsTime) {
    const mins = Math.floor(totalStudySec / 60);
    tsTime.textContent = `${mins} min`;
  }
}

// ---- SAVE POMODOROS TO LOCALSTORAGE ----
function savePomodoros() {
  const today  = new Date().toDateString();
  const stored = localStorage.getItem("ss_pomodoros");
  const data   = stored ? JSON.parse(stored) : {};
  data[today]  = (data[today] || 0) + 1;
  localStorage.setItem("ss_pomodoros", JSON.stringify(data));

  const studyMins = localStorage.getItem("ss_study_mins_today") || "0";
  localStorage.setItem(
    "ss_study_mins_today",
    (parseInt(studyMins) + MODES.study.minutes).toString()
  );
}

// ---- SIMPLE BEEP ----
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
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

// ---- INIT ----
updateDisplay();