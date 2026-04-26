// STUDYSPHERE - game.js
// Math Challenge Break Game

// ---- STATE ----
let score        = 0;
let level        = 1;
let streak       = 0;
let correctCount = 0;
let wrongCount   = 0;
let gameActive   = false;
let breakSeconds = 5 * 60;
let breakInterval = null;
let correctAnswer = 0;

// ---- HIGH SCORE ----
let highScore = parseInt(localStorage.getItem("ss_highscore")) || 0;

// ---- INIT PAGE ----
window.onload = function() {
  document.getElementById("high-score").textContent = highScore;
  renderDifficultyInfo();
};

function renderDifficultyInfo() {
  const startScreen = document.getElementById("start-screen");
  if (!startScreen) return;
}

// ---- START GAME ----
function startGame() {
  score        = 0;
  level        = 1;
  streak       = 0;
  correctCount = 0;
  wrongCount   = 0;
  gameActive   = true;
  breakSeconds = 5 * 60;

  document.getElementById("start-screen").style.display    = "none";
  document.getElementById("gameover-screen").style.display = "none";
  document.getElementById("question-screen").style.display = "block";

  updateStats();
  nextQuestion();
  startBreakTimer();
}

// ---- RESTART ----
function restartGame() {
  clearInterval(breakInterval);
  breakSeconds = 5 * 60;
  startGame();
}

// ---- BREAK TIMER ----
function startBreakTimer() {
  clearInterval(breakInterval);
  updateTimerDisplay();
  breakInterval = setInterval(() => {
    breakSeconds--;
    updateTimerDisplay();
    if (breakSeconds <= 0) {
      clearInterval(breakInterval);
      endGame();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(breakSeconds / 60).toString().padStart(2, "0");
  const s = (breakSeconds % 60).toString().padStart(2, "0");
  const el = document.getElementById("g-timer");
  if (el) el.textContent = `${m}:${s}`;
}

// ---- GENERATE QUESTION ----
function generateQuestion() {
  let num1, num2, operator, answer;

  if (level <= 2) {
    num1     = Math.floor(Math.random() * 20) + 1;
    num2     = Math.floor(Math.random() * 20) + 1;
    operator = Math.random() > 0.5 ? "+" : "-";
    if (operator === "-" && num2 > num1) {
      [num1, num2] = [num2, num1];
    }
    answer = operator === "+" ? num1 + num2 : num1 - num2;

  } else if (level <= 4) {
    num1     = Math.floor(Math.random() * 12) + 1;
    num2     = Math.floor(Math.random() * 12) + 1;
    operator = "×";
    answer   = num1 * num2;

  } else {
    const ops = ["+", "-", "×", "÷"];
    operator  = ops[Math.floor(Math.random() * ops.length)];

    if (operator === "÷") {
      num2   = Math.floor(Math.random() * 11) + 2;
      answer = Math.floor(Math.random() * 10) + 1;
      num1   = num2 * answer;
    } else if (operator === "×") {
      num1   = Math.floor(Math.random() * 15) + 1;
      num2   = Math.floor(Math.random() * 15) + 1;
      answer = num1 * num2;
    } else {
      num1   = Math.floor(Math.random() * 50) + 10;
      num2   = Math.floor(Math.random() * 50) + 1;
      if (operator === "-" && num2 > num1) [num1, num2] = [num2, num1];
      answer = operator === "+" ? num1 + num2 : num1 - num2;
    }
  }

  return { num1, num2, operator, answer };
}

// ---- NEXT QUESTION ----
function nextQuestion() {
  if (!gameActive) return;

  const q = generateQuestion();
  correctAnswer = q.answer;

  const questionEl = document.getElementById("question-text");
  if (questionEl) {
    questionEl.textContent = `${q.num1} ${q.operator} ${q.num2} = ?`;
  }

  const badge = document.getElementById("difficulty-badge");
  if (badge) {
    if (level <= 2) {
      badge.textContent = "Easy";
      badge.className   = "difficulty-badge easy";
    } else if (level <= 4) {
      badge.textContent = "Medium";
      badge.className   = "difficulty-badge medium";
    } else {
      badge.textContent = "Hard";
      badge.className   = "difficulty-badge hard";
    }
  }

  const answers = generateAnswers(q.answer);
  renderAnswers(answers);

  const feedbackEl = document.getElementById("feedback-msg");
  if (feedbackEl) feedbackEl.textContent = "";
}

// ---- GENERATE ANSWER OPTIONS ----
function generateAnswers(correct) {
  const answers = new Set([correct]);

  while (answers.size < 4) {
    const offset = Math.floor(Math.random() * 10) + 1;
    const wrong  = Math.random() > 0.5 ? correct + offset : correct - offset;
    if (wrong !== correct && wrong >= 0) answers.add(wrong);
  }

  return [...answers].sort(() => Math.random() - 0.5);
}

// ---- RENDER ANSWER BUTTONS ----
function renderAnswers(answers) {
  const grid = document.getElementById("answer-grid");
  if (!grid) return;

  grid.innerHTML = "";

  answers.forEach(ans => {
    const btn       = document.createElement("button");
    btn.className   = "answer-btn";
    btn.textContent = ans;
    btn.onclick     = () => checkAnswer(ans, btn);
    grid.appendChild(btn);
  });
}

// ---- CHECK ANSWER ----
function checkAnswer(selected, btn) {
  if (!gameActive) return;

  const allBtns = document.querySelectorAll(".answer-btn");
  allBtns.forEach(b => b.disabled = true);

  const feedbackEl = document.getElementById("feedback-msg");

  if (selected === correctAnswer) {
    btn.classList.add("correct");
    streak++;
    correctCount++;

    const points = streak >= 3 ? 20 : 10;
    score += points;

    if (correctCount % 5 === 0) {
      level++;
      if (feedbackEl) {
        feedbackEl.textContent = `✅ +${points} pts — Level Up! 🚀`;
        feedbackEl.style.color = "#7c5cfc";
      }
    } else if (streak >= 3) {
      if (feedbackEl) {
        feedbackEl.textContent = `✅ +${points} pts — ${streak} Streak! 🔥`;
        feedbackEl.style.color = "#f59e0b";
      }
    } else {
      if (feedbackEl) {
        feedbackEl.textContent = `✅ Correct! +${points} pts`;
        feedbackEl.style.color = "#22c55e";
      }
    }

  } else {
    btn.classList.add("wrong");
    streak  = 0;
    wrongCount++;
    score   = Math.max(0, score - 5);

    allBtns.forEach(b => {
      if (parseInt(b.textContent) === correctAnswer) {
        b.classList.add("correct");
      }
    });

    if (feedbackEl) {
      feedbackEl.textContent = `❌ Wrong! -5 pts. Answer was ${correctAnswer}`;
      feedbackEl.style.color = "#ef4444";
    }
  }

  updateStats();

  setTimeout(() => {
    if (gameActive) nextQuestion();
  }, 1200);
}

// ---- UPDATE STATS ----
function updateStats() {
  const scoreEl  = document.getElementById("g-score");
  const levelEl  = document.getElementById("g-level");
  const streakEl = document.getElementById("g-streak");

  if (scoreEl)  scoreEl.textContent  = score;
  if (levelEl)  levelEl.textContent  = level;
  if (streakEl) streakEl.textContent = streak;
}

// ---- END GAME ----
function endGame() {
  gameActive = false;
  clearInterval(breakInterval);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("ss_highscore", highScore);
    const hsEl = document.getElementById("high-score");
    if (hsEl) hsEl.textContent = highScore;
  }

  const questionScreen  = document.getElementById("question-screen");
  const gameoverScreen  = document.getElementById("gameover-screen");
  const startScreen     = document.getElementById("start-screen");

  if (questionScreen) questionScreen.style.display = "none";
  if (startScreen)    startScreen.style.display    = "none";
  if (gameoverScreen) gameoverScreen.style.display = "block";

  const finalScore   = document.getElementById("final-score");
  const finalCorrect = document.getElementById("final-correct");
  const finalWrong   = document.getElementById("final-wrong");
  const finalLevel   = document.getElementById("final-level");

  if (finalScore)   finalScore.textContent   = score;
  if (finalCorrect) finalCorrect.textContent = correctCount;
  if (finalWrong)   finalWrong.textContent   = wrongCount;
  if (finalLevel)   finalLevel.textContent   = level;
}