import { dom } from "./dom.js";

export function applyTheme(theme, persist = true) {
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  dom.themeToggle.classList.toggle("is-active", isDark);
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  dom.themeToggle.textContent = isDark ? "\u2600" : "\u263e";
  dom.themeToggle.setAttribute("aria-label", label);
  dom.themeToggle.title = label;
  if (persist) {
    localStorage.setItem("jellyflow-theme", theme);
  }
}

export function initTheme() {
  const saved = localStorage.getItem("jellyflow-theme");
  if (saved) {
    applyTheme(saved, false);
    return;
  }
  const legacy = localStorage.getItem("echoflow-theme");
  if (legacy) {
    applyTheme(legacy, true);
    localStorage.removeItem("echoflow-theme");
    return;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light", false);
}
