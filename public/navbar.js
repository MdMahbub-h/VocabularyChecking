// Load saved theme from localStorage immediately
const savedTheme = localStorage.getItem("theme") || "";
document.body.className = savedTheme;

// Theme toggle functionality
document.addEventListener("DOMContentLoaded", function () {
  const themeToggle = document.getElementById("theme-toggle");
  const body = document.body;
  const themes = ["", "dark-theme", "neon-theme"];
  const themeIcons = ["🌙", "🌞", "⚡"];

  const currentIndex = themes.indexOf(savedTheme);
  themeToggle.textContent = themeIcons[currentIndex];

  themeToggle.addEventListener("click", function () {
    const currentTheme = body.className;
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    body.className = nextTheme;
    themeToggle.textContent = themeIcons[nextIndex];

    // Save theme to localStorage
    localStorage.setItem("theme", nextTheme);

    // Update game colors
    const gameScene = game.scene.scenes[0];
    if (gameScene && gameScene.updateColors) {
      gameScene.updateColors();
    }
  });
});
