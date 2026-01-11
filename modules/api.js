import { state } from "./state.js";
import { ticksToSeconds } from "./utils.js";

function getDeviceId() {
  const key = "jellyflow-device-id";
  const legacyKey = "echoflow-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = localStorage.getItem(legacyKey);
    if (id) {
      localStorage.setItem(key, id);
    }
  }
  if (!id) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    localStorage.setItem(key, id);
  }
  return id;
}

function buildAuthHeader() {
  return `MediaBrowser Client="Jellyflow", Device="Web", DeviceId="${getDeviceId()}", Version="1.0.0"`;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Emby-Token": state.apiKey,
  };
}

export async function authenticateByName(serverUrl, username, password) {
  const response = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": buildAuthHeader(),
    },
    body: JSON.stringify({
      Username: username,
      Pw: password,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Login failed");
  }
  return response.json();
}

export async function fetchJson(path) {
  const response = await fetch(`${state.serverUrl}${path}`, {
    headers: headers(),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json();
}

export function imageUrl(itemId, size) {
  return `${state.serverUrl}/Items/${itemId}/Images/Primary?fillWidth=${size}&fillHeight=${size}&quality=90&api_key=${state.apiKey}`;
}

export function streamUrl(itemId) {
  return `${state.serverUrl}/Audio/${itemId}/stream?static=true&api_key=${state.apiKey}`;
}

export function buildStreamUrlForTrack(track) {
  const base = streamUrl(track.Id);
  if (!track?.RunTimeTicks) {
    return base;
  }
  const durationSeconds = ticksToSeconds(track.RunTimeTicks);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return base;
  }
  const endSeconds = Math.max(1, Math.ceil(durationSeconds));
  return `${base}#t=0,${endSeconds}`;
}

export function albumItemsPath(startIndex, limit) {
  return `/Users/${state.userId}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=AlbumArtist,SortName&SortOrder=Ascending&Fields=PrimaryImageAspectRatio,ImageTags,AlbumArtist,Artists,SortName&Limit=${limit}&StartIndex=${startIndex}`;
}

export async function fetchAlbumsPage(startIndex, limit) {
  return fetchJson(albumItemsPath(startIndex, limit));
}
