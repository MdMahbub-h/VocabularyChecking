let cellDimention = 60;
let foundedColors = 0x99ffa7;

let puzzles = [];
let currentPuzzleIndex = 0;
let selectedPuzzle;
let theme;
let words;
let letters;

let hintTimes = 2;

// Timer variables
let startTime;
let elapsedTime = 0;
let timerInterval;

function startTimer() {
  startTime = Date.now();
  elapsedTime = 0;
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const formattedTime = formatTime(elapsedTime);
  document.getElementById(
    "timer-display"
  ).textContent = `Timer: ${formattedTime}`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

async function loadPuzzles() {
  try {
    const response = await fetch("/api/puzzles");
    puzzles = await response.json();
    const urlParams = new URLSearchParams(window.location.search);
    const puzzleParam = urlParams.get("puzzle");
    const initialIndex = puzzleParam ? parseInt(puzzleParam) : 0;
    updatePuzzle(initialIndex);
  } catch (error) {
    console.error("Error loading puzzles:", error);
  }
}

document.getElementById("hint-button").innerHTML = `Get a hint (${hintTimes})`;

function updatePuzzle(index) {
  if (puzzles.length === 0) return;
  currentPuzzleIndex = index;
  selectedPuzzle = puzzles[currentPuzzleIndex];
  theme = selectedPuzzle.theme;
  words = selectedPuzzle.words;
  letters = selectedPuzzle.letters;
  spangram = selectedPuzzle.spangram;
  nonThemeWord = selectedPuzzle.nonThemeWord;
  document.getElementById("theme-text").textContent = theme;
  // Update leaderboard link with current puzzle index
  document.getElementById(
    "leaderboard-link"
  ).href = `leaderboard.html?puzzle=${currentPuzzleIndex}`;
  // Update found words text after loading new puzzle
  if (game && game.scene.scenes[0]) {
    game.scene.scenes[0].updateFoundWordsText(words);
    // Load persisted found words for this puzzle
    game.scene.scenes[0].loadPersistedFoundWords();
  }
  // Start timer
  startTimer();
}

loadPuzzles();

let game; // Declare game globally

class Game extends Phaser.Scene {
  constructor() {
    super({
      key: "Game",
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
    });
  }

  updateColors() {
    const body = document.body;
    this.bgColor = 0xffffff;
    this.cellBg = 0x888888;
    this.cellText = "#000000";
    this.foundColor = 0x99a7ff;
    this.selectionColor = 0x888888;
    this.lineColor = 0xcccccc;
    this.hintColor = 0xff0000;

    if (body.classList.contains("dark-theme")) {
      this.bgColor = 0x000000;
      this.cellBg = 0x000000;
      this.cellText = "#ffffff";
      this.foundColor = 0x99a7ff;
      this.selectionColor = 0x888888;
      this.lineColor = 0xffffff;
      this.hintColor = 0xff4500;
    } else if (body.classList.contains("neon-theme")) {
      this.bgColor = 0x000000;
      this.cellBg = 0x111111;
      this.cellText = "#e0e722";
      this.foundColor = 0x99a7ff;
      this.selectionColor = 0x888888;
      this.lineColor = 0xe0e722;
      this.hintColor = 0xff0000;
    }

    this.cameras.main.setBackgroundColor(this.bgColor);

    // Update cell circles and texts
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 6; c++) {
        const isFound = this.foundCells.some(
          (cell) => cell.row === r && cell.col === c
        );
        const isSelected = this.selectedCells.some(
          (cell) => cell.row === r && cell.col === c
        );
        if (isFound) {
          this.cellCircles[r][c].setFillStyle(this.cellColors[r][c], 1.0);
        } else if (isSelected) {
          this.cellCircles[r][c].setFillStyle(this.selectionColor, 1.0);
        } else {
          this.cellCircles[r][c].setFillStyle(
            this.cellBg,
            body.classList.contains("dark-theme") ||
              body.classList.contains("neon-theme")
              ? 1.0
              : 0
          );
        }
        this.cellTexts[r][c].setColor(this.cellText);
      }
    }

    // Update global foundedColors for future use
    foundedColors = this.foundColor;

    // Redraw lines if necessary (simplified, may need full redraw for accuracy)
    this.drawLine();
    this.drawFoundLine();
    if (this.hintPositions) {
      this.drawHintLine(this.hintPositions);
    }
  }

  preload() {
    this.load.setBaseURL("assets");
    this.load.image("logo", "loader.png");
  }

  create() {
    document.getElementById("loader").innerHTML = "";

    let board = [
      ["H", "O", "R", "S", "E", null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
    ];

    // Grid settings
    const rows = 8;
    const cols = 6;
    const cellSize = cellDimention;

    this.grid = [];
    this.selectedCells = [];
    this.foundCells = [];
    this.foundWords = [];
    this.foundWordPositions = [];
    this.cellColors = Array(8)
      .fill()
      .map(() => Array(6).fill(foundedColors));
    this.wordColors = [];
    this.updateFoundWordsText(words);
    this.currentHint = null;
    this.isSelecting = false;
    this.startCell = null;
    this.lineGraphics = this.add.graphics();
    this.foundLineGraphics = this.add.graphics();
    this.hintLineGraphics = this.add.graphics();

    // Generate random letters for the grid
    for (let r = 0; r < rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const letter = letters[r][c];
        this.grid[r][c] = letter;
      }
    }

    // Create circle graphics and text objects for each cell
    this.cellCircles = [];
    this.cellTexts = [];
    for (let r = 0; r < rows; r++) {
      this.cellCircles[r] = [];
      this.cellTexts[r] = [];
      for (let c = 0; c < cols; c++) {
        const circle = this.add.circle(
          c * cellSize + cellSize / 2,
          r * cellSize + cellSize / 2,
          cellDimention / 2.5,
          0x888888,
          0
        );
        this.cellCircles[r][c] = circle;

        const text = this.add
          .text(
            c * cellSize + cellSize / 2,
            r * cellSize + cellSize / 2,
            this.grid[r][c],
            {
              fontSize: `${Math.floor(cellDimention * 0.5)}px`,
              color: "#000000",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              fontStyle: "bold",
            }
          )
          .setOrigin(0.5);
        this.cellTexts[r][c] = text;
      }
    }

    // // Add background rectangles for cells (optional for visibility)
    // for (let r = 0; r < rows; r++) {
    //   for (let c = 0; c < cols; c++) {
    //     this.add
    //       .rectangle(
    //         c * cellSize + cellSize / 2,
    //         r * cellSize + cellSize / 2,
    //         cellSize,
    //         cellSize,
    //         0x777777
    //       )
    //       .setStrokeStyle(2, 0x000000);
    //   }
    // }

    // Input handling for selection
    this.input.on("pointerdown", (pointer) => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const centerX = c * cellSize + cellSize / 2;
          const centerY = r * cellSize + cellSize / 2;
          const distance = Phaser.Math.Distance.Between(
            pointer.x,
            pointer.y,
            centerX,
            centerY
          );
          if (distance <= cellDimention / 2) {
            // Check if cell is already found
            const isFound = this.foundCells.some(
              (cell) => cell.row === r && cell.col === c
            );
            if (!isFound) {
              // Circle radius cellDimention / 2
              this.isSelecting = true;
              this.selectedCells = [{ row: r, col: c }];
              this.highlightCell(r, c, true);
              return;
            }
          }
        }
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.isSelecting) return;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const centerX = c * cellSize + cellSize / 2;
          const centerY = r * cellSize + cellSize / 2;
          const distance = Phaser.Math.Distance.Between(
            pointer.x,
            pointer.y,
            centerX,
            centerY
          );
          if (distance <= cellDimention / 2) {
            const alreadySelected = this.selectedCells.some(
              (cell) => cell.row === r && cell.col === c
            );
            const isFound = this.foundCells.some(
              (cell) => cell.row === r && cell.col === c
            );
            if (!alreadySelected && !isFound) {
              // Check if adjacent to the last selected cell
              const lastCell =
                this.selectedCells[this.selectedCells.length - 1];
              const dr = Math.abs(r - lastCell.row);
              const dc = Math.abs(c - lastCell.col);
              if (
                (dr === 0 && dc === 1) ||
                (dr === 1 && dc === 0) ||
                (dr === 1 && dc === 1)
              ) {
                // Adjacent including diagonals
                this.selectedCells.push({ row: r, col: c });
                this.highlightCell(r, c, true);
                return;
              }
            }
          }
        }
      }
    });

    const validateAndMarkWord = () => {
      // Collect the word
      const word = this.selectedCells
        .map((cell) => this.grid[cell.row][cell.col])
        .join("");
      console.log("Selected word:", word);
      // Validate word against the list
      if (words && words.includes(word) && !this.foundWords.includes(word)) {
        // Mark as found: add to foundCells, set blue color, draw permanent blue line
        this.foundCells.push(...this.selectedCells);
        this.foundWords.push(word);
        this.foundWordPositions.push([...this.selectedCells]); // Store positions
        // Conditional highlighting: yellow for spangram, gray for non-theme word, blue for others
        let highlightColor = foundedColors; // default blue
        if (word === spangram) {
          highlightColor = 0xffff00; //
        } else if (word === nonThemeWord) {
          hintTimes += 1;
          document.getElementById(
            "hint-button"
          ).innerHTML = `Get a hint (${hintTimes})`;
          highlightColor = 0x808080; // gray
        }
        this.wordColors.push(highlightColor);
        this.selectedCells.forEach((cell) => {
          if (word === spangram) {
            this.cellTexts[cell.row][cell.col].setColor("#000000");
          }

          this.cellCircles[cell.row][cell.col].setFillStyle(
            highlightColor,
            1.0
          );
          this.cellColors[cell.row][cell.col] = highlightColor;
        });
        this.drawFoundLine();
        this.updateFoundWordsText(words);

        // Persist found words to localStorage
        this.saveFoundWords();

        // Check if the found word was the current hint
        const hintDisplay = document.getElementById("hint-display");
        if (hintDisplay.textContent === word) {
          hintDisplay.textContent = "";
          this.currentHint = null;
          // Clear the hint line
          this.hintLineGraphics.clear();
        }

        // Do not reset selection
      } else {
        // Reset selection
        this.selectedCells.forEach((cell) =>
          this.highlightCell(cell.row, cell.col, false)
        );
        this.lineGraphics.clear();
        this.selectedCells = [];
      }
    };

    this.input.on("pointerup", () => {
      if (this.isSelecting) {
        validateAndMarkWord();
        this.isSelecting = false;
      }
    });

    const canvas = this.sys.game.canvas;
    canvas.addEventListener("mouseleave", () => {
      if (this.isSelecting) {
        validateAndMarkWord();
        this.isSelecting = false;
      }
    });

    // Update colors based on current theme
    this.updateColors();
  }

  highlightCell(row, col, highlight) {
    const circle = this.cellCircles[row][col];
    circle.setFillStyle(highlight ? 0xcccccc : 0xffffff, highlight ? 0.8 : 0);
    this.drawLine();
  }

  drawLine() {
    this.lineGraphics.clear();
    this.lineGraphics.setDepth(-1);
    if (this.selectedCells.length > 1) {
      this.lineGraphics.lineStyle(
        Math.floor(cellDimention * 0.25),
        0xcccccc,
        0.8
      );
      this.lineGraphics.beginPath();
      const firstCell = this.selectedCells[0];
      const startX = firstCell.col * cellDimention + cellDimention / 2;
      const startY = firstCell.row * cellDimention + cellDimention / 2;
      this.lineGraphics.moveTo(startX, startY);
      for (let i = 1; i < this.selectedCells.length; i++) {
        const cell = this.selectedCells[i];
        const lineX = cell.col * cellDimention + cellDimention / 2;
        const lineY = cell.row * cellDimention + cellDimention / 2;
        this.lineGraphics.lineTo(lineX, lineY);
      }
      this.lineGraphics.strokePath();
    }
  }

  drawFoundLine() {
    this.foundLineGraphics.clear();
    for (let i = 0; i < this.foundWordPositions.length; i++) {
      const positions = this.foundWordPositions[i];
      const color = this.wordColors[i];
      if (positions && positions.length > 0) {
        this.foundLineGraphics.lineStyle(
          Math.floor(cellDimention * 0.25),
          color,
          1.0
        );
        this.foundLineGraphics.beginPath();
        const firstCell = positions[0];
        const startX = firstCell.col * cellDimention + cellDimention / 2;
        const startY = firstCell.row * cellDimention + cellDimention / 2;
        this.foundLineGraphics.moveTo(startX, startY);
        for (let j = 1; j < positions.length; j++) {
          const cell = positions[j];
          const lineX = cell.col * cellDimention + cellDimention / 2;
          const lineY = cell.row * cellDimention + cellDimention / 2;
          this.foundLineGraphics.lineTo(lineX, lineY);
        }
        this.foundLineGraphics.strokePath();
      }
    }
  }

  drawHintLine(positions) {
    this.hintLineGraphics.lineStyle(Math.floor(cellDimention * 0.25), 0xff0000);
    this.hintLineGraphics.beginPath();
    const firstCell = positions[0];
    const startX = firstCell.col * cellDimention + cellDimention / 2;
    const startY = firstCell.row * cellDimention + cellDimention / 2;
    this.hintLineGraphics.moveTo(startX, startY);
    for (let i = 1; i < positions.length; i++) {
      const cell = positions[i];
      const lineX = cell.col * cellDimention + cellDimention / 2;
      const lineY = cell.row * cellDimention + cellDimention / 2;
      this.hintLineGraphics.lineTo(lineX, lineY);
    }
    this.hintLineGraphics.strokePath();
  }

  updateFoundWordsText(words) {
    if (!words || !words.length) return;
    const foundCount = this.foundWords.length;
    const totalCount = words.length;
    document.getElementById(
      "found-words-text"
    ).textContent = `Found ${foundCount} of ${totalCount} words`;

    if (foundCount == totalCount && !this.isLoading) {
      this.gameWin();
    }
  }

  findWord(word) {
    const rows = this.grid.length;
    const cols = this.grid[0].length;
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0], // horizontal, vertical
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1], // diagonals
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let dir of directions) {
          let positions = [];
          let match = true;
          for (let i = 0; i < word.length; i++) {
            const nr = r + i * dir[0];
            const nc = c + i * dir[1];
            if (
              nr < 0 ||
              nr >= rows ||
              nc < 0 ||
              nc >= cols ||
              this.grid[nr][nc] !== word[i]
            ) {
              match = false;
              break;
            }
            positions.push({ row: nr, col: nc });
          }
          if (match) {
            return positions;
          }
        }
      }
    }
    return null;
  }

  getHint(words) {
    if (hintTimes > 0) {
      // If there's already a current hint and it's not found, do not show another hint
      if (this.currentHint && !this.foundWords.includes(this.currentHint)) {
        return;
      }

      hintTimes -= 1;
      document.getElementById(
        "hint-button"
      ).innerHTML = `Get a hint (${hintTimes})`;

      // Clear previous hint
      document.getElementById("hint-display").textContent = "";
      // Clear previous hint line
      this.hintLineGraphics.clear();
      this.hintPositions = [];

      const unfoundWords = words.filter(
        (word) => !this.foundWords.includes(word)
      );
      if (unfoundWords.length > 0) {
        const hintWord =
          unfoundWords[Math.floor(Math.random() * unfoundWords.length)];
        this.currentHint = hintWord;
        document.getElementById("hint-display").textContent = hintWord;
        // Find and draw red path for the word in the grid
        const positions = this.findWord(hintWord);
        if (positions) {
          this.hintPositions = positions;
          // this.drawHintLine(positions);
        }
      }
    }
  }

  saveFoundWords() {
    const key = `puzzle_${currentPuzzleIndex}_foundWords`;
    const data = {
      foundWords: this.foundWords,
      foundWordPositions: this.foundWordPositions,
      wordColors: this.wordColors,
      cellColors: this.cellColors,
      foundCells: this.foundCells,
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  loadPersistedFoundWords() {
    this.isLoading = true;
    const key = `puzzle_${currentPuzzleIndex}_foundWords`;
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      this.foundWords = parsed.foundWords || [];
      this.foundWordPositions = parsed.foundWordPositions || [];
      this.wordColors = parsed.wordColors || [];
      this.cellColors =
        parsed.cellColors ||
        Array(8)
          .fill()
          .map(() => Array(6).fill(foundedColors));
      this.foundCells = parsed.foundCells || [];
      // Restore cell colors and draw lines
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          if (this.cellColors[r][c] !== foundedColors) {
            this.cellCircles[r][c].setFillStyle(this.cellColors[r][c], 1.0);
          }
        }
      }
      this.drawFoundLine();
      this.updateFoundWordsText(words);
    }
    this.isLoading = false;
  }
  gameWin() {
    // Stop the timer
    clearInterval(timerInterval);
    // Show win modal
    const winModal = document.getElementById("win-modal");
    const finalTimeSpan = document.getElementById("final-time");
    finalTimeSpan.textContent = formatTime(elapsedTime);
    winModal.style.display = "flex";
    // Handle score submission
    document.getElementById("submit-record").addEventListener("click", () => {
      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      if (username && email) {
        // Submit score to server
        fetch("/api/submit-score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            time: elapsedTime,
            puzzleIndex: currentPuzzleIndex,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            // Redirect to leaderboard to show the submitted record
            window.location.href = `leaderboard.html?puzzle=${currentPuzzleIndex}`;
          })
          .catch((error) => {
            console.error("Error submitting score:", error);
            alert("Error submitting score. Please try again.");
          });
      } else {
        alert("Please enter both username and email.");
      }
    });
    // Handle skip
    document.getElementById("skip-submit").addEventListener("click", () => {
      winModal.style.display = "none";
    });
  }

  update() {}
}

// find_word_coordinates();

// Set theme box content

document.getElementById("theme-title").textContent = "Theme";
document.getElementById("theme-text").textContent = theme;

// Hint button event listener
document.getElementById("hint-button").addEventListener("click", () => {
  // Assuming game.scene.scenes[0] is the Game scene
  const gameScene = game.scene.scenes[0];

  gameScene.getHint(words);
});
// Next Theme button event listener
document.getElementById("next-theme-button").addEventListener("click", () => {
  hintTimes = 2;

  document.getElementById(
    "hint-button"
  ).innerHTML = `Get a hint (${hintTimes})`;
  currentPuzzleIndex = (currentPuzzleIndex + 1) % puzzles.length;
  updatePuzzle(currentPuzzleIndex);
  // Clear hint and found words text
  document.getElementById("hint-display").textContent = "";
  document.getElementById("found-words-text").textContent = "";
  // Restart the game scene
  game.scene.stop("Game");
  game.scene.start("Game");
});

let initialBgColor = 0xffffff;
if (
  document.body.classList.contains("dark-theme") ||
  document.body.classList.contains("neon-theme")
) {
  initialBgColor = 0x000000;
}

game = new Phaser.Game({
  parent: "game",
  type: Phaser.AUTO,
  width: cellDimention * 6,
  height: cellDimention * 8,
  border: 2,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: initialBgColor,
  dom: {
    createContainer: true,
  },
  input: {
    activePointers: 3,
  },
  scene: [Game],
});

// Update initial background color after theme is loaded
const updateInitialBgColor = () => {
  if (game && game.scene && game.scene.scenes[0]) {
    if (
      document.body.classList.contains("dark-theme") ||
      document.body.classList.contains("neon-theme")
    ) {
      game.config.backgroundColor = 0x000000;
      game.scene.scenes[0].cameras.main.setBackgroundColor(0x000000);
    } else {
      game.config.backgroundColor = 0xffffff;
      game.scene.scenes[0].cameras.main.setBackgroundColor(0xffffff);
    }
  }
};
