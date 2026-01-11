import { dom } from "./dom.js";
import { state } from "./state.js";
import { authenticateByName, fetchJson } from "./api.js";
import { normalizeUrl } from "./utils.js";
import { setStatus } from "./ui.js";
import { rememberSettings, clearSettings } from "./storage.js";
import { loadAlbumsPaginated } from "./coverflow.js";
import { updateNowPlayingIdle } from "./playback.js";
import { resetPlaylistState } from "./playlists.js";

export async function connect() {
  const serverUrl = normalizeUrl(dom.serverUrlInput.value.trim());
  const username = dom.usernameInput.value.trim();
  const password = dom.passwordInput.value;
  const apiKey = dom.apiKeyInput.value.trim();
  const userId = dom.userIdInput.value.trim();
  const hasUsername = Boolean(username);
  const hasPassword = Boolean(password);

  if (!serverUrl) {
    setStatus("Missing server URL", "warn");
    return;
  }

  state.serverUrl = serverUrl;

  if (hasPassword && !hasUsername) {
    setStatus("Enter username", "warn");
    return;
  }

  if (hasUsername && hasPassword) {
    setStatus("Signing in...", "info");
    try {
      const auth = await authenticateByName(serverUrl, username, password);
      const token = auth?.AccessToken || "";
      const authedUserId = auth?.User?.Id || "";
      if (!token || !authedUserId) {
        setStatus("Login failed", "warn");
        return;
      }
      state.apiKey = token;
      state.userId = authedUserId;
      dom.apiKeyInput.value = token;
      dom.userIdInput.value = authedUserId;
      dom.passwordInput.value = "";
      await fetchJson(`/Users/${state.userId}`);
      setStatus("Connected", "ok");
      updateNowPlayingIdle();
      resetPlaylistState();
      if (dom.rememberToggle.checked) {
        rememberSettings();
      }
      dom.settingsDialog.close();
      void loadAlbumsPaginated();
    } catch (error) {
      setStatus("Login failed", "warn");
    }
    return;
  }

  if (!apiKey || !userId) {
    setStatus(hasUsername ? "Enter password or use API key" : "Missing connection details", "warn");
    return;
  }

  state.apiKey = apiKey;
  state.userId = userId;

  setStatus("Validating user...", "info");

  try {
    await fetchJson(`/Users/${state.userId}`);
    setStatus("Connected", "ok");
    updateNowPlayingIdle();
    resetPlaylistState();
    if (dom.rememberToggle.checked) {
      rememberSettings();
    }
    dom.settingsDialog.close();
    void loadAlbumsPaginated();
  } catch (error) {
    setStatus("Connection failed", "warn");
  }
}

export async function loadUsers() {
  const serverUrl = normalizeUrl(dom.serverUrlInput.value.trim());
  const apiKey = dom.apiKeyInput.value.trim();
  if (!serverUrl || !apiKey) {
    setStatus("Enter server URL and API key first", "warn");
    return;
  }
  state.serverUrl = serverUrl;
  state.apiKey = apiKey;
  setStatus("Loading users...", "info");
  try {
    const users = await fetchJson("/Users");
    dom.userSelect.innerHTML = '<option value="">Select a user</option>';
    users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.Id;
      option.textContent = user.Name;
      dom.userSelect.appendChild(option);
    });
    setStatus("Users loaded", "ok");
  } catch (error) {
    setStatus("Could not load users", "warn");
  }
}

export function resetForm() {
  dom.serverUrlInput.value = "";
  dom.usernameInput.value = "";
  dom.passwordInput.value = "";
  dom.apiKeyInput.value = "";
  dom.userSelect.innerHTML = '<option value="">Select a user</option>';
  dom.userIdInput.value = "";
  clearSettings();
  resetPlaylistState();
  setStatus("Cleared saved settings", "info");
}
