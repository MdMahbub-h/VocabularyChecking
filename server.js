const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
} = require("firebase/database");
const dotenv = require("dotenv");

dotenv.config();

const firebase = initializeApp({
  apiKey: "AIzaSyALswdE4EclGpsyA4FYVcL0RYe9HZd6vf4",
  authDomain: "article-bcccc.firebaseapp.com",
  databaseURL: "https://article-bcccc-default-rtdb.firebaseio.com",
  projectId: "article-bcccc",
  storageBucket: "article-bcccc.appspot.com",
  messagingSenderId: "558259234111",
  appId: "1:558259234111:web:8b89fa061e0f5a7e189f8a",
});

const db = getDatabase(firebase);

const app = express();

// In-memory storage for puzzles
let puzzles = [
  // 1️⃣ Animals
  {
    id: 1,
    theme: "ANIMALS",
    spangram: "RABBIT",
    nonThemeWord: "BANANA",
    words: [
      "BANANA",
      "LION",
      "TIGER",
      "HORSE",
      "SHEEP",
      "GOAT",
      "RABBIT",
      "MONKEY",
      "LEOPARD",
    ],
    letters: [
      ["A", "N", "A", "B", "O", "L"],
      ["N", "A", "R", "N", "T", "I"],
      ["E", "E", "G", "I", "S", "P"],
      ["S", "R", "A", "H", "E", "E"],
      ["O", "H", "T", "O", "G", "T"],
      ["R", "A", "B", "B", "I", "O"],
      ["N", "K", "E", "Y", "P", "E"],
      ["M", "O", "D", "R", "A", "L"],
    ],
  },
  // 2️⃣ Fruits
  {
    id: 2,
    theme: "FRUITS",
    spangram: "BANANA",
    nonThemeWord: "ORANGE",
    words: [
      "BANANA",
      "ORANGE",
      "APPLE",
      "GRAPE",
      "LEMON",
      "PEAR",
      "STRAWBERRY",
      "WATERMELON",
    ],
    letters: [
      ["B", "A", "N", "A", "N", "A"],
      ["O", "R", "A", "N", "G", "E"],
      ["A", "P", "P", "L", "E", "P"],
      ["G", "R", "A", "P", "E", "E"],
      ["L", "E", "M", "O", "N", "A"],
      ["P", "E", "A", "R", "S", "R"],
      ["S", "T", "R", "A", "W", "B"],
      ["W", "A", "T", "E", "R", "M"],
    ],
  },
  // 3️⃣ Colors
  {
    id: 3,
    theme: "COLORS",
    spangram: "RAINBOW",
    nonThemeWord: "PURPLE",
    words: [
      "RED",
      "BLUE",
      "GREEN",
      "YELLOW",
      "RAINBOW",
      "PURPLE",
      "ORANGE",
      "PINK",
    ],
    letters: [
      ["R", "E", "D", "B", "L", "U"],
      ["A", "I", "N", "B", "O", "W"],
      ["I", "N", "B", "O", "W", "G"],
      ["N", "B", "O", "W", "R", "E"],
      ["B", "O", "W", "R", "A", "I"],
      ["O", "W", "R", "A", "I", "N"],
      ["W", "R", "A", "I", "N", "B"],
      ["R", "A", "I", "N", "B", "O"],
    ],
  },
];

const server = http.createServer(app);

const port = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const getCodes = (score, codes = "[]") => {
  let unlocked = null;
  let newCodes = [];
  try {
    const _codes = JSON.parse(codes);
    if (Array.isArray(_codes)) {
      newCodes = _codes;
    }
  } catch (err) {
    console.log(err);
  }

  if (score >= 500) {
    const cd5h = newCodes.find((cd) => cd.points == "500");
    if (!cd5h) {
      const code = Math.floor(Math.random() * 900000) + 100000;
      unlocked = {
        points: "500",
        code: code,
      };
      newCodes.push(unlocked);
    }
  }

  if (score >= 1000) {
    const cd1k = newCodes.find((cd) => cd.points == "1000");
    if (!cd1k) {
      const code = Math.floor(Math.random() * 900000) + 100000;
      unlocked = {
        points: "1000",
        code: code,
      };
      newCodes.push(unlocked);
    }
  }

  if (score >= 5000) {
    const cd5k = newCodes.find((cd) => cd.points == "5000");
    if (!cd5k) {
      const code = Math.floor(Math.random() * 900000) + 100000;
      unlocked = {
        points: "5000",
        code: code,
      };
      newCodes.push(unlocked);
    }
  }

  return { codes: JSON.stringify(newCodes), unlocked };
};

const storeData = async (data, codes, puzzleId) => {
  try {
    await set(ref(db, `scores/puzzle_${puzzleId}/${data.username}`), {
      username: data.username,
      email: data.email,
      score: data.score,
      news: data.news ? "Yes" : "No",
      codes: codes,
    }).then(() => {
      get(ref(db, `scores/puzzle_${puzzleId}`)).then((scoreValue) => {
        const dataValue = scoreValue.val();

        if (dataValue && Object.keys(dataValue).length > 100) {
          const scores = Object.entries(dataValue)
            .map((score) => {
              return score[1];
            })
            .sort((a, b) => a.score - b.score);

          scores.splice(-1, 1);

          const scoreData = {};

          scores.forEach((score) => {
            scoreData[score.username] = score;
          });

          set(ref(db, `scores/puzzle_${puzzleId}`), scoreData);
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
};

const deleteData = async (username) => {
  try {
    remove(ref(db, `scores/${username}`)).then((value) => {});
  } catch (err) {
    console.log(err);
  }
};

const sendUserData = async (socket, username) => {
  try {
    get(ref(db, `scores/${username}`)).then((value) => {
      if (value.exists()) {
        const user = value.val();
        socket.emit("userData", user);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

io.on("connection", (socket) => {
  console.log("Connected...");

  socket.on("userData", (data) => {
    // deleteData(data.username);
    // Delete user data
    sendUserData(socket, data.username);
  });

  socket.on("scoreUpdate", async (data, callback) => {
    try {
      if (!data.username || data.username.length > 32) return;
      const value = await get(ref(db, `scores/${data.username}`));
      if (data.newUser) {
        if (value.exists()) {
          socket.emit("usernameTaken");
          callback(false);
        } else {
          const codeData = getCodes(data.score);
          await storeData(data, codeData.codes);
          await sendUserData(socket, data.username);
          callback({ ...data, unlocked: codeData.unlocked });
        }
      } else {
        if (value.exists()) {
          const dataValue = value.val();
          const score =
            dataValue.score > data.score ? data.score : dataValue.score; // keep lower time
          const codeData = getCodes(data.score, dataValue.codes);
          await update(ref(db, `scores/${data.username}`), {
            score: score,
            codes: codeData.codes,
          });
          sendUserData(socket, data.username);
          callback({ ...data, unlocked: codeData.unlocked });
        }
      }
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("leaderboard", (puzzleIndex) => {
    // Get the puzzleId from puzzleIndex
    const puzzleId = parseInt(puzzleIndex) + 1;
    get(ref(db, `scores/puzzle_${puzzleId}`)).then((value) => {
      const scores = value.toJSON();
      socket.emit("leaderboard", scores || []);
    });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected...");
  });
});

app.use(express.json()); // For parsing JSON bodies
app.use(express.static(path.join(__dirname, "public")));

// Puzzle API endpoints
app.get("/api/puzzles", (req, res) => {
  res.json(puzzles);
});

app.get("/api/puzzles/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const puzzle = puzzles.find((p) => p.id === id);
  if (!puzzle) {
    return res.status(404).json({ error: "Puzzle not found" });
  }
  res.json(puzzle);
});

app.post("/api/puzzles", (req, res) => {
  const { theme, spangram, nonThemeWord, words, letters } = req.body;
  if (!theme || !words || !letters) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const newId =
    puzzles.length > 0 ? Math.max(...puzzles.map((p) => p.id)) + 1 : 1;
  const newPuzzle = {
    id: newId,
    theme,
    spangram,
    nonThemeWord,
    words,
    letters,
  };
  puzzles.push(newPuzzle);
  res.status(201).json(newPuzzle);
});

app.put("/api/puzzles/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { theme, spangram, nonThemeWord, words, letters } = req.body;
  const puzzleIndex = puzzles.findIndex((p) => p.id === id);
  if (puzzleIndex === -1) {
    return res.status(404).json({ error: "Puzzle not found" });
  }
  if (!theme || !words || !letters) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  puzzles[puzzleIndex] = { id, theme, spangram, nonThemeWord, words, letters };
  res.json(puzzles[puzzleIndex]);
});

app.delete("/api/puzzles/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const puzzleIndex = puzzles.findIndex((p) => p.id === id);
  if (puzzleIndex === -1) {
    return res.status(404).json({ error: "Puzzle not found" });
  }
  puzzles.splice(puzzleIndex, 1);
  res.status(204).send();
});

// Submit score endpoint
app.post("/api/submit-score", async (req, res) => {
  const { username, email, time, puzzleIndex } = req.body;
  if (!username || !email || time === undefined || puzzleIndex === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    // Get the puzzleId from puzzleIndex
    const puzzleId = parseInt(puzzleIndex) + 1;
    const puzzle = puzzles.find((p) => p.id === puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }
    // Store in Firebase or in-memory, similar to existing score handling
    const scoreData = {
      username,
      email,
      score: time, // time in seconds
      puzzleIndex,
    };
    // For simplicity, using the existing storeData function
    await storeData(scoreData, "[]", puzzleId); // Pass puzzleId
    res.json({ message: "Score submitted successfully" });
  } catch (error) {
    console.error("Error submitting score:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`Listening to port ${port}...`);
});
