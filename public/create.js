// Handle login form submission
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorDiv = document.getElementById("login-error");

  if (username === "hkBoxter" && password === "lhw@ghaA5") {
    // Successful login
    document.getElementById("login-container").style.display = "none";
    document.getElementById("create-container").style.display = "block";
    loadPuzzles(); // Load puzzles after login
  } else {
    // Failed login
    errorDiv.textContent = "Invalid username or password.";
  }
});

// Load existing puzzles
async function loadPuzzles() {
  try {
    const response = await fetch("/api/puzzles");
    const puzzles = await response.json();
    const puzzleList = document.getElementById("puzzle-list");
    puzzleList.innerHTML = "";
    puzzles.forEach((puzzle) => {
      const item = document.createElement("div");
      item.className = "puzzle-item";
      item.innerHTML = `
        <div>
          <strong>${puzzle.theme}</strong> (ID: ${puzzle.id})
        </div>
        <div class="actions">
          <button class="button" onclick="editPuzzle(${puzzle.id})">Edit</button>
          <button class="button" onclick="deletePuzzle(${puzzle.id})">Delete</button>
        </div>
      `;
      puzzleList.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading puzzles:", error);
  }
}

// Validation function
function validatePuzzleForm(
  theme,
  spangram,
  nonThemeWord,
  wordsInput,
  lettersInput
) {
  if (!theme.trim()) {
    alert("Theme is required.");
    return false;
  }
  if (!spangram.trim()) {
    alert("Spangram is required.");
    return false;
  }
  if (spangram.length < 6) {
    alert("Spangram must be at least 6 letters.");
    return false;
  }
  if (!nonThemeWord.trim()) {
    alert("Non-theme word is required.");
    return false;
  }
  if (!wordsInput.trim()) {
    alert("Words are required.");
    return false;
  }
  if (!lettersInput.trim()) {
    alert("Letters grid is required.");
    return false;
  }

  // Validate letters: must be 8 rows, each with 6 letters, total 48 letters
  const lettersRows = lettersInput
    .trim()
    .split("\n")
    .filter((row) => row.trim());
  if (lettersRows.length !== 8) {
    alert("Letters grid must have exactly 8 rows.");
    return false;
  }
  let totalLetters = 0;
  for (const row of lettersRows) {
    const lettersInRow = row
      .trim()
      .split(/\s+/)
      .filter((l) => l);
    if (lettersInRow.length !== 6) {
      alert("Each row in letters grid must have exactly 6 letters.");
      return false;
    }
    totalLetters += lettersInRow.length;
  }
  if (totalLetters !== 48) {
    alert("Letters grid must contain exactly 48 letters.");
    return false;
  }

  return true;
}

// Handle form submission for create or update
document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const theme = formData.get("theme").trim().toUpperCase();
  const spangram = formData.get("spangram").trim().toUpperCase();
  const nonThemeWord = formData.get("nonThemeWord").trim().toUpperCase();
  const wordsInput = formData.get("words").trim();
  const lettersInput = formData.get("letters").trim();

  // Validate form
  if (
    !validatePuzzleForm(theme, spangram, nonThemeWord, wordsInput, lettersInput)
  ) {
    return;
  }

  const words = wordsInput.split(",").map((w) => w.trim().toUpperCase());
  const letters = lettersInput.split("\n").map((row) =>
    row
      .trim()
      .split(/\s+/)
      .map((l) => l.toUpperCase())
  );

  const isEdit = e.target.dataset.editId;
  const method = isEdit ? "PUT" : "POST";
  const url = isEdit
    ? `/api/puzzles/${e.target.dataset.editId}`
    : "/api/puzzles";

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme, spangram, nonThemeWord, words, letters }),
    });
    if (response.ok) {
      alert(
        isEdit ? "Puzzle updated successfully!" : "Puzzle created successfully!"
      );
      if (isEdit) {
        delete e.target.dataset.editId;
        e.target.querySelector("button[type=submit]").textContent =
          "Create Puzzle";
      }
      e.target.reset();
      loadPuzzles();
    } else {
      const error = await response.json();
      alert("Error: " + error.error);
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

// Edit puzzle (populate form)
async function editPuzzle(id) {
  try {
    const response = await fetch(`/api/puzzles/${id}`);
    if (response.ok) {
      const puzzle = await response.json();
      document.getElementById("theme").value = puzzle.theme;
      document.getElementById("spangram").value = puzzle.spangram || "";
      document.getElementById("nonThemeWord").value = puzzle.nonThemeWord || "";
      document.getElementById("words").value = puzzle.words.join(", ");
      document.getElementById("letters").value = puzzle.letters
        .map((row) => row.join(" "))
        .join("\n");
      // Change form to update mode
      const form = document.getElementById("create-form");
      form.dataset.editId = id;
      form.querySelector("button[type=submit]").textContent = "Update Puzzle";
      // Update counts after populating
      updateCounts();
    } else {
      alert("Puzzle not found");
    }
  } catch (error) {
    console.error("Error loading puzzle:", error);
  }
}

// Delete puzzle
async function deletePuzzle(id) {
  if (confirm("Are you sure you want to delete this puzzle?")) {
    try {
      const response = await fetch(`/api/puzzles/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        alert("Puzzle deleted successfully!");
        loadPuzzles();
      } else {
        alert("Error deleting puzzle");
      }
    } catch (error) {
      console.error("Error deleting puzzle:", error);
    }
  }
}

// Function to update character counts
function updateCounts() {
  // Spangram count
  const spangramValue = document.getElementById("spangram").value.trim();
  const spangramCount = spangramValue.length;
  const spangramCountEl = document.getElementById("spangram-count");
  spangramCountEl.textContent = spangramCount;
  if (spangramCount < 6) {
    spangramCountEl.style.color = "red";
    spangramCountEl.textContent += " (Min 6)";
  } else {
    spangramCountEl.style.color = "green";
  }

  // Non-Theme Word count
  const nonThemeWordValue = document
    .getElementById("nonThemeWord")
    .value.trim();
  const nonThemeWordCount = nonThemeWordValue.length;
  const nonThemeWordCountEl = document.getElementById("nonThemeWord-count");
  nonThemeWordCountEl.textContent = nonThemeWordCount;
  if (nonThemeWordCount < 4) {
    nonThemeWordCountEl.style.color = "red";
    nonThemeWordCountEl.textContent += " (Min 4)";
  } else {
    nonThemeWordCountEl.style.color = "green";
  }

  // Words count (total letters in all words)
  const wordsValue = document.getElementById("words").value.trim();
  const wordsArray = wordsValue
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w);
  const wordsTotalLetters = wordsArray.reduce(
    (sum, word) => sum + word.length,
    0
  );
  const wordsCountEl = document.getElementById("words-count");
  wordsCountEl.textContent = wordsTotalLetters;
  if (wordsTotalLetters !== 48) {
    wordsCountEl.style.color = "red";
    wordsCountEl.textContent += " (48 required)";
  } else {
    wordsCountEl.style.color = "green";
  }

  // Check each word has at least 4 letters
  const invalidWords = wordsArray.filter((word) => word.length < 4);
  if (invalidWords.length > 0) {
    wordsCountEl.style.color = "red";
    wordsCountEl.textContent += " (Words must be >=4 letters)";
  }

  // Letters grid count
  const lettersValue = document.getElementById("letters").value.trim();
  const lettersRows = lettersValue.split("\n").filter((row) => row.trim());
  let totalLetters = 0;
  for (const row of lettersRows) {
    const lettersInRow = row
      .trim()
      .split(/\s+/)
      .filter((l) => l);
    totalLetters += lettersInRow.length;
  }
  const lettersCountEl = document.getElementById("letters-count");
  lettersCountEl.textContent = totalLetters;
  if (totalLetters < 48) {
    lettersCountEl.style.color = "red";
    lettersCountEl.textContent += " (Min 48)";
  } else if (totalLetters > 48) {
    lettersCountEl.style.color = "orange";
    lettersCountEl.textContent += " (Max 48)";
  } else {
    lettersCountEl.style.color = "green";
  }
}

// Add event listeners for input changes
document.getElementById("spangram").addEventListener("input", updateCounts);
document.getElementById("nonThemeWord").addEventListener("input", updateCounts);
document.getElementById("words").addEventListener("input", updateCounts);
document.getElementById("letters").addEventListener("input", updateCounts);

// Load puzzles on page load
loadPuzzles();
