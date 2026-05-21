var currentGame = "tictactoe";
var score = 0;
var moves = 0;
var statusText = "Ready";
var bestScore = parseInt(localStorage.getItem("ss_arcade_best")) || 0;
var ticBoard = [];
var ticLocked = false;
var blockBoard = [];
var memoryCards = [];
var memoryOpen = [];
var memoryMatched = 0;
var trailTarget = 0;
var trailTimeLeft = 20;
var trailTimer = null;
var trailLevel = 1;
var trailHitsInLevel = 0;
var anagramWords = [
  "focus", "study", "lesson", "review", "notes", "energy",
  "memory", "target", "answer", "project", "practice", "revision"
];
var currentAnagram = "";
var scrambledAnagram = "";

var games = {
  tictactoe: {
    title: "Tic-Tac-Toe",
    description: "Place three marks in a row before the computer does."
  },
  blockblast: {
    title: "Block Blast",
    description: "Drop blocks into the grid. Full rows and columns clear for points."
  },
  memory: {
    title: "Memory Match",
    description: "Flip cards and remember where each matching pair is hiding."
  },
  trail: {
    title: "Focus Trail",
    description: "Click the glowing target. Each level gives you less time."
  },
  anagrams: {
    title: "Anagrams",
    description: "Unscramble study words before moving to the next round."
  }
};

window.onload = function() {
  var bestEl = document.getElementById("arcade-best-score");
  if (bestEl) bestEl.textContent = bestScore;

  var resetBtn = document.getElementById("reset-game-btn");
  if (resetBtn) resetBtn.onclick = resetCurrentGame;

  var tiles = document.querySelectorAll(".game-tile");
  for (var i = 0; i < tiles.length; i++) {
    tiles[i].onclick = function() {
      selectGame(this.getAttribute("data-game"));
    };
  }

  selectGame("tictactoe");
};

function selectGame(gameName) {
  currentGame = gameName;
  clearInterval(trailTimer);
  resetStats();

  var tiles = document.querySelectorAll(".game-tile");
  for (var i = 0; i < tiles.length; i++) {
    tiles[i].classList.toggle("active", tiles[i].getAttribute("data-game") === gameName);
  }

  document.getElementById("game-title").textContent = games[gameName].title;
  document.getElementById("game-description").textContent = games[gameName].description;
  resetCurrentGame();
}

function resetCurrentGame() {
  clearInterval(trailTimer);
  resetStats();

  if (currentGame === "tictactoe") startTicTacToe();
  if (currentGame === "blockblast") startBlockBlast();
  if (currentGame === "memory") startMemory();
  if (currentGame === "trail") startTrail();
  if (currentGame === "anagrams") startAnagrams();
}

function resetStats() {
  score = 0;
  moves = 0;
  statusText = "Ready";
  updateStats();
}

function updateStats() {
  document.getElementById("g-score").textContent = score;
  document.getElementById("g-moves").textContent = moves;
  document.getElementById("g-status").textContent = statusText;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("ss_arcade_best", bestScore);
    document.getElementById("arcade-best-score").textContent = bestScore;
  }
}

function startTicTacToe() {
  ticBoard = ["", "", "", "", "", "", "", "", ""];
  ticLocked = false;
  statusText = "Your turn";
  updateStats();
  renderTicTacToe();
}

function renderTicTacToe() {
  var board = document.getElementById("game-board");
  board.className = "game-board tictactoe-board";
  board.innerHTML = "";

  for (var i = 0; i < ticBoard.length; i++) {
    var cell = document.createElement("button");
    cell.className = "tic-cell";
    cell.textContent = ticBoard[i];
    cell.setAttribute("aria-label", "Tic-Tac-Toe cell " + (i + 1));
    cell.onclick = (function(index) {
      return function() { playTicCell(index); };
    })(i);
    board.appendChild(cell);
  }
}

function playTicCell(index) {
  if (ticLocked || ticBoard[index]) return;

  ticBoard[index] = "X";
  moves++;

  if (finishTicTurn()) return;

  ticLocked = true;
  statusText = "Computer thinking";
  updateStats();
  renderTicTacToe();

  setTimeout(function() {
    if (currentGame !== "tictactoe") return;
    var computerMove = chooseComputerMove();
    if (computerMove !== -1) ticBoard[computerMove] = "O";
    ticLocked = false;
    finishTicTurn();
  }, 450);
}

function finishTicTurn() {
  var winner = getTicWinner();

  if (winner) {
    statusText = winner === "X" ? "You win" : "Computer wins";
    score += winner === "X" ? 100 : 10;
    ticLocked = true;
    updateStats();
    renderTicTacToe();
    return true;
  }

  if (ticBoard.indexOf("") === -1) {
    statusText = "Draw";
    score += 35;
    ticLocked = true;
    updateStats();
    renderTicTacToe();
    return true;
  }

  statusText = "Your turn";
  updateStats();
  renderTicTacToe();
  return false;
}

function chooseComputerMove() {
  var empty = [];
  for (var i = 0; i < ticBoard.length; i++) {
    if (!ticBoard[i]) empty.push(i);
  }

  for (var w = 0; w < empty.length; w++) {
    ticBoard[empty[w]] = "O";
    if (getTicWinner() === "O") {
      ticBoard[empty[w]] = "";
      return empty[w];
    }
    ticBoard[empty[w]] = "";
  }

  for (var b = 0; b < empty.length; b++) {
    ticBoard[empty[b]] = "X";
    if (getTicWinner() === "X") {
      ticBoard[empty[b]] = "";
      return empty[b];
    }
    ticBoard[empty[b]] = "";
  }

  if (!ticBoard[4]) return 4;
  return empty[Math.floor(Math.random() * empty.length)] || -1;
}

function getTicWinner() {
  var wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (var i = 0; i < wins.length; i++) {
    var a = wins[i][0];
    var b = wins[i][1];
    var c = wins[i][2];
    if (ticBoard[a] && ticBoard[a] === ticBoard[b] && ticBoard[a] === ticBoard[c]) {
      return ticBoard[a];
    }
  }

  return "";
}

function startBlockBlast() {
  blockBoard = [];
  for (var i = 0; i < 36; i++) blockBoard.push("");
  statusText = "Place blocks";
  updateStats();
  renderBlockBlast();
}

function renderBlockBlast() {
  var board = document.getElementById("game-board");
  board.className = "game-board blockblast-wrap";
  board.innerHTML = "";

  var grid = document.createElement("div");
  grid.className = "block-grid";

  for (var i = 0; i < blockBoard.length; i++) {
    var cell = document.createElement("button");
    cell.className = "block-cell" + (blockBoard[i] ? " filled" : "");
    cell.onclick = (function(index) {
      return function() { placeBlock(index); };
    })(i);
    grid.appendChild(cell);
  }

  var actions = document.createElement("div");
  actions.className = "block-actions";
  actions.innerHTML = "<p>Pick any open square. Clear lines by filling every space in a row or column.</p>";

  board.appendChild(grid);
  board.appendChild(actions);
}

function placeBlock(index) {
  if (blockBoard[index]) return;

  blockBoard[index] = "filled";
  moves++;
  score += 5;
  var cleared = clearBlockLines();

  if (cleared > 0) {
    score += cleared * 40;
    statusText = "Cleared " + cleared;
  } else if (blockBoard.indexOf("") === -1) {
    statusText = "Board full";
  } else {
    statusText = "Placed";
  }

  updateStats();
  renderBlockBlast();
}

function clearBlockLines() {
  var clear = {};
  var cleared = 0;

  for (var r = 0; r < 6; r++) {
    var rowFull = true;
    for (var c = 0; c < 6; c++) {
      if (!blockBoard[r * 6 + c]) rowFull = false;
    }
    if (rowFull) {
      cleared++;
      for (var rc = 0; rc < 6; rc++) clear[r * 6 + rc] = true;
    }
  }

  for (var col = 0; col < 6; col++) {
    var colFull = true;
    for (var row = 0; row < 6; row++) {
      if (!blockBoard[row * 6 + col]) colFull = false;
    }
    if (colFull) {
      cleared++;
      for (var cr = 0; cr < 6; cr++) clear[cr * 6 + col] = true;
    }
  }

  for (var key in clear) {
    blockBoard[parseInt(key)] = "";
  }

  return cleared;
}

function startMemory() {
  var values = ["A", "B", "C", "D", "E", "F", "A", "B", "C", "D", "E", "F"];
  memoryCards = shuffle(values).map(function(value) {
    return { value: value, open: false, matched: false };
  });
  memoryOpen = [];
  memoryMatched = 0;
  statusText = "Find pairs";
  updateStats();
  renderMemory();
}

function renderMemory() {
  var board = document.getElementById("game-board");
  board.className = "game-board memory-grid";
  board.innerHTML = "";

  for (var i = 0; i < memoryCards.length; i++) {
    var card = document.createElement("button");
    var visible = memoryCards[i].open || memoryCards[i].matched;
    card.className = "memory-card" + (visible ? " open" : "") + (memoryCards[i].matched ? " matched" : "");
    card.textContent = visible ? memoryCards[i].value : "";
    card.onclick = (function(index) {
      return function() { flipMemory(index); };
    })(i);
    board.appendChild(card);
  }
}

function flipMemory(index) {
  var card = memoryCards[index];
  if (card.open || card.matched || memoryOpen.length === 2) return;

  card.open = true;
  memoryOpen.push(index);
  moves++;
  statusText = "Keep looking";
  renderMemory();
  updateStats();

  if (memoryOpen.length === 2) {
    var first = memoryCards[memoryOpen[0]];
    var second = memoryCards[memoryOpen[1]];

    if (first.value === second.value) {
      first.matched = true;
      second.matched = true;
      memoryOpen = [];
      memoryMatched += 2;
      score += 30;
      statusText = memoryMatched === memoryCards.length ? "Complete" : "Matched";
      updateStats();
      renderMemory();
    } else {
      statusText = "Try again";
      updateStats();
      setTimeout(function() {
        if (currentGame !== "memory") return;
        first.open = false;
        second.open = false;
        memoryOpen = [];
        renderMemory();
      }, 700);
    }
  }
}

function startTrail() {
  trailLevel = 1;
  trailHitsInLevel = 0;
  startTrailLevel();
}

function startTrailLevel() {
  clearInterval(trailTimer);
  trailTarget = Math.floor(Math.random() * 25);
  trailTimeLeft = getTrailLevelTime();
  statusText = "Level " + trailLevel + " - " + trailTimeLeft + "s";
  updateStats();
  renderTrail();

  trailTimer = setInterval(function() {
    trailTimeLeft--;
    statusText = "Level " + trailLevel + " - " + trailTimeLeft + "s";
    updateStats();

    if (trailTimeLeft <= 0) {
      clearInterval(trailTimer);
      statusText = "Time up at L" + trailLevel;
      updateStats();
    }
  }, 1000);
}

function getTrailLevelTime() {
  return Math.max(8, 22 - ((trailLevel - 1) * 3));
}

function renderTrail() {
  var board = document.getElementById("game-board");
  board.className = "game-board trail-grid";
  board.innerHTML = "";

  for (var i = 0; i < 25; i++) {
    var cell = document.createElement("button");
    cell.className = "trail-cell" + (i === trailTarget ? " target" : "");
    cell.onclick = (function(index) {
      return function() { hitTrailTarget(index); };
    })(i);
    board.appendChild(cell);
  }
}

function hitTrailTarget(index) {
  if (trailTimeLeft <= 0) return;

  moves++;
  if (index === trailTarget) {
    trailHitsInLevel++;
    score += 10 + (trailLevel * 5);

    if (trailHitsInLevel >= 5) {
      trailLevel++;
      trailHitsInLevel = 0;
      statusText = "Level " + trailLevel;
      startTrailLevel();
      return;
    }

    statusText = "Hit " + trailHitsInLevel + "/5";
    trailTarget = Math.floor(Math.random() * 25);
  } else {
    score = Math.max(0, score - 5);
    statusText = "Miss";
  }

  updateStats();
  renderTrail();
}

function startAnagrams() {
  statusText = "Unscramble";
  updateStats();
  nextAnagram();
}

function nextAnagram() {
  if (currentGame !== "anagrams") return;
  currentAnagram = anagramWords[Math.floor(Math.random() * anagramWords.length)];
  scrambledAnagram = scrambleWord(currentAnagram);
  statusText = "Ready";
  updateStats();
  renderAnagrams();
}

function renderAnagrams() {
  var board = document.getElementById("game-board");
  board.className = "game-board anagram-wrap";
  board.innerHTML = "";

  var prompt = document.createElement("div");
  prompt.className = "anagram-card";
  prompt.innerHTML = `
    <div class="anagram-scramble">${escapeGameHtml(scrambledAnagram)}</div>
    <label class="anagram-label" for="anagram-input">Your answer</label>
    <div class="anagram-row">
      <input class="anagram-input" id="anagram-input" type="text" autocomplete="off" spellcheck="false">
      <button class="btn-primary" type="button" id="anagram-check">Check</button>
    </div>
    <div class="anagram-actions">
      <button class="btn-outline-sm" type="button" id="anagram-shuffle">Shuffle</button>
      <button class="btn-outline-sm" type="button" id="anagram-skip">Skip</button>
    </div>
  `;

  board.appendChild(prompt);

  document.getElementById("anagram-check").onclick = checkAnagram;
  document.getElementById("anagram-shuffle").onclick = function() {
    scrambledAnagram = scrambleWord(currentAnagram);
    renderAnagrams();
  };
  document.getElementById("anagram-skip").onclick = function() {
    score = Math.max(0, score - 5);
    moves++;
    statusText = "Skipped";
    updateStats();
    nextAnagram();
  };
  document.getElementById("anagram-input").addEventListener("keydown", function(event) {
    if (event.key === "Enter") checkAnagram();
  });
  document.getElementById("anagram-input").focus();
}

function checkAnagram() {
  var input = document.getElementById("anagram-input");
  if (!input) return;

  var answer = input.value.trim().toLowerCase();
  moves++;

  if (answer === currentAnagram) {
    score += Math.max(20, currentAnagram.length * 8);
    statusText = "Correct";
    updateStats();
    setTimeout(function() {
      if (currentGame === "anagrams") nextAnagram();
    }, 450);
  } else {
    score = Math.max(0, score - 3);
    statusText = "Try again";
    input.select();
    updateStats();
  }
}

function scrambleWord(word) {
  var scrambled = word;
  var attempts = 0;

  while (scrambled === word && attempts < 12) {
    scrambled = shuffle(word.split("")).join("");
    attempts++;
  }

  return scrambled.toUpperCase();
}

function escapeGameHtml(text) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function shuffle(items) {
  var copy = items.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}
