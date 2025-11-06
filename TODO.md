# TODO: Implement Timer, Win Form, and Leaderboard for Puzzle Game

## 1. Add Timer Display in index.html ✅

- Add a timer div left of the theme box in the theme-container.
- Style it beautifully using CSS variables for themes (light, dark, neon).
- Ensure responsive design.

## 2. Implement Timer Logic in main.js ✅

- Add timer variables (startTime, elapsedTime, timerInterval).
- Start timer when puzzle loads (in updatePuzzle or loadPuzzles).
- Update timer display every second.
- Stop timer on win and record elapsed time.

## 3. Create Win Form Modal in index.html ✅

- Add modal HTML with name/email inputs, time display, submit and skip buttons.
- Style modal with theme variables, make it overlay, centered, responsive.

## 4. Update gameWin() in main.js ✅

- Show modal on win.
- Handle submit: validate inputs, emit to server with username, email, score=elapsedTime.
- Handle skip: close modal, go to next puzzle.

## 5. Update leaderboard.html ✅

- Change display to show times (MM:SS format) instead of scores.
- Sort by fastest time (lowest score).
- Ensure themed and beautiful design.

## 6. Design Enhancements ✅

- Test and ensure all new elements are responsive and themed.
- Add animations or transitions for better UX.
- Verify mobile compatibility.

## 7. Server Endpoint for Score Submission ✅

- Add POST /api/submit-score endpoint in server.js to handle score submission.
