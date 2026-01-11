import { dom } from "./dom.js";
import { state } from "./state.js";

export function rememberSettings() {
  const payload = {
    serverUrl: dom.serverUrlInput.value.trim(),
    username: dom.usernameInput.value.trim(),
    apiKey: dom.apiKeyInput.value.trim(),
    userId: dom.userIdInput.value.trim(),
  };
  localStorage.setItem("jellyflow-settings", JSON.stringify(payload));
}

export function savePreferences() {
  const payload = {
    lyricsOnline: dom.lyricsToggle.checked,
  };
  localStorage.setItem("jellyflow-preferences", JSON.stringify(payload));
}

export function clearSettings() {
  localStorage.removeItem("jellyflow-settings");
  localStorage.removeItem("echoflow-settings");
}

export function loadSettings() {
  const raw = localStorage.getItem("jellyflow-settings");
  const legacy = raw ? null : localStorage.getItem("echoflow-settings");
  const source = raw || legacy;
  if (!source) {
    return;
  }
  try {
    const saved = JSON.parse(source);
    dom.serverUrlInput.value = saved.serverUrl || "";
    dom.usernameInput.value = saved.username || "";
    dom.apiKeyInput.value = saved.apiKey || "";
    dom.userIdInput.value = saved.userId || "";
    if (!raw) {
      localStorage.setItem("jellyflow-settings", JSON.stringify(saved));
    }
  } catch (error) {
    clearSettings();
  }
}

export function loadPreferences() {
  const raw = localStorage.getItem("jellyflow-preferences");
  const legacy = raw ? null : localStorage.getItem("echoflow-preferences");
  const source = raw || legacy;
  if (!source) {
    dom.lyricsToggle.checked = true;
    state.lyricsOnline = true;
    return;
  }
  try {
    const saved = JSON.parse(source);
    const enabled = saved.lyricsOnline !== false;
    dom.lyricsToggle.checked = enabled;
    state.lyricsOnline = enabled;
    if (!raw) {
      localStorage.setItem("jellyflow-preferences", JSON.stringify(saved));
    }
  } catch (error) {
    dom.lyricsToggle.checked = true;
    state.lyricsOnline = true;
  }
}
