var score = 0;
var level = 1;
var streak = 0;
var correctCount = 0;
var wrongCount = 0;
var gameActive = false;
var breakSeconds = 300;
var breakInterval = null;
var correctAnswer = 0;
var highScore = parseInt(localStorage.getItem("ss_highscore")) || 0;

window.onload = function() {
  var el = document.getElementById("high-score");
  if (el) el.textContent = highScore;
};

function startGame() {
  score = 0;
  level = 1;
  streak = 0;
  correctCount = 0;
  wrongCount = 0;
  gameActive = true;
  breakSeconds = 300;

  document.getElementById("start-screen").style.display = "none";
  document.getElementById("gameover-screen").style.display = "none";
  document.getElementById("question-screen").style.display = "block";

  updateStats();
  nextQuestion();
  startBreakTimer();
}

function restartGame() {
  clearInterval(breakInterval);
  startGame();
}

function startBreakTimer() {
  clearInterval(breakInterval);
  updateTimerDisplay();
  breakInterval = setInterval(function() {
    breakSeconds--;
    updateTimerDisplay();
    if (breakSeconds <= 0) {
      clearInterval(breakInterval);
      endGame();
    }
  }, 1000);
}

function updateTimerDisplay() {
  var m = Math.floor(breakSeconds / 60).toString().padStart(2, "0");
  var s = (breakSeconds % 60).toString().padStart(2, "0");
  var el = document.getElementById("g-timer");
  if (el) el.textContent = m + ":" + s;
}

function generateQuestion() {
  var num1, num2, operator, answer;

  if (level <= 2) {
    num1 = Math.floor(Math.random() * 20) + 1;
    num2 = Math.floor(Math.random() * 20) + 1;
    operator = Math.random() > 0.5 ? "+" : "-";
    if (operator === "-" && num2 > num1) {
      var temp = num1;
      num1 = num2;
      num2 = temp;
    }
    answer = operator === "+" ? num1 + num2 : num1 - num2;

  } else if (level <= 4) {
    num1 = Math.floor(Math.random() * 12) + 1;
    num2 = Math.floor(Math.random() * 12) + 1;
    operator = "x";
    answer = num1 * num2;

  } else {
    num1 = Math.floor(Math.random() * 50) + 10;
    num2 = Math.floor(Math.random() * 50) + 1;
    operator = "+";
    answer = num1 + num2;
  }

  return { num1: num1, num2: num2, operator: operator, answer: answer };
}

function nextQuestion() {
  if (!gameActive) return;

  var q = generateQuestion();
  correctAnswer = q.answer;

  var questionEl = document.getElementById("question-text");
  if (questionEl) {
    questionEl.textContent = q.num1 + " " + q.operator + " " + q.num2 + " = ?";
  }

  var badge = document.getElementById("difficulty-badge");
  if (badge) {
    if (level <= 2) {
      badge.textContent = "Easy";
      badge.className = "difficulty-badge easy";
    } else if (level <= 4) {
      badge.textContent = "Medium";
      badge.className = "difficulty-badge medium";
    } else {
      badge.textContent = "Hard";
      badge.className = "difficulty-badge hard";
    }
  }

  var answers = generateAnswers(q.answer);
  renderAnswers(answers);

  var feedbackEl = document.getElementById("feedback-msg");
  if (feedbackEl) feedbackEl.textContent = "";
}

function generateAnswers(correct) {
  var answers = [correct];

  while (answers.length < 4) {
    var offset = Math.floor(Math.random() * 10) + 1;
    var wrong = Math.random() > 0.5 ? correct + offset : correct - offset;
    if (wrong !== correct && wrong >= 0 && answers.indexOf(wrong) === -1) {
      answers.push(wrong);
    }
  }

  answers.sort(function() { return Math.random() - 0.5; });
  return answers;
}

function renderAnswers(answers) {
  var grid = document.getElementById("answer-grid");
  if (!grid) return;

  grid.innerHTML = "";

  for (var i = 0; i < answers.length; i++) {
    var btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = answers[i];
    btn.setAttribute("data-value", answers[i]);
    btn.onclick = (function(val, button) {
      return function() { checkAnswer(val, button); };
    })(answers[i], btn);
    grid.appendChild(btn);
  }
}

function checkAnswer(selected, btn) {
  if (!gameActive) return;

  var allBtns = document.querySelectorAll(".answer-btn");
  for (var i = 0; i < allBtns.length; i++) {
    allBtns[i].disabled = true;
  }

  var feedbackEl = document.getElementById("feedback-msg");

  if (selected === correctAnswer) {
    btn.classList.add("correct");
    streak++;
    correctCount++;

    var points = streak >= 3 ? 20 : 10;
    score += points;

    if (correctCount % 5 === 0) {
      level++;
      if (feedbackEl) {
        feedbackEl.textContent = "Correct! +" + points + " pts - Level Up!";
        feedbackEl.style.color = "#7c5cfc";
      }
    } else if (streak >= 3) {
      if (feedbackEl) {
        feedbackEl.textContent = "Correct! +" + points + " pts - " + streak + " Streak!";
        feedbackEl.style.color = "#f59e0b";
      }
    } else {
      if (feedbackEl) {
        feedbackEl.textContent = "Correct! +" + points + " pts";
        feedbackEl.style.color = "#22c55e";
      }
    }

  } else {
    btn.classList.add("wrong");
    streak = 0;
    wrongCount++;
    score = Math.max(0, score - 5);

    for (var j = 0; j < allBtns.length; j++) {
      if (parseInt(allBtns[j].textContent) === correctAnswer) {
        allBtns[j].classList.add("correct");
      }
    }

    if (feedbackEl) {
      feedbackEl.textContent = "Wrong! -5 pts. Answer was " + correctAnswer;
      feedbackEl.style.color = "#ef4444";
    }
  }

  updateStats();

  setTimeout(function() {
    if (gameActive) nextQuestion();
  }, 1200);
}

function updateStats() {
  var scoreEl = document.getElementById("g-score");
  var levelEl = document.getElementById("g-level");
  var streakEl = document.getElementById("g-streak");

  if (scoreEl) scoreEl.textContent = score;
  if (levelEl) levelEl.textContent = level;
  if (streakEl) streakEl.textContent = streak;
}

function endGame() {
  gameActive = false;
  clearInterval(breakInterval);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("ss_highscore", highScore);
    var hsEl = document.getElementById("high-score");
    if (hsEl) hsEl.textContent = highScore;
  }

  var questionScreen = document.getElementById("question-screen");
  var gameoverScreen = document.getElementById("gameover-screen");
  var startScreen = document.getElementById("start-screen");

  if (questionScreen) questionScreen.style.display = "none";
  if (startScreen) startScreen.style.display = "none";
  if (gameoverScreen) gameoverScreen.style.display = "block";

  var finalScore = document.getElementById("final-score");
  var finalCorrect = document.getElementById("final-correct");
  var finalWrong = document.getElementById("final-wrong");
  var finalLevel = document.getElementById("final-level");

  if (finalScore) finalScore.textContent = score;
  if (finalCorrect) finalCorrect.textContent = correctCount;
  if (finalWrong) finalWrong.textContent = wrongCount;
  if (finalLevel) finalLevel.textContent = level;
}