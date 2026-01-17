import { dom } from "./dom.js";
import { imageUrl } from "./api.js";
import { state } from "./state.js";

const ALBUM_BG_SIZE = 1600;
let preferredTheme = "light";
let albumBackgroundEnabled = false;
let hasAlbumArt = false;

function applyThemeUi(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  dom.themeToggle.classList.toggle("is-active", isDark);
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  dom.themeToggle.setAttribute("aria-label", label);
  dom.themeToggle.title = label;
}

function resolveAppliedTheme() {
  if (albumBackgroundEnabled && !hasAlbumArt) {
    return "dark";
  }
  return preferredTheme;
}

function resolveBackgroundAlbum() {
  if (state.currentAlbum) {
    return state.currentAlbum;
  }
  if (!state.nowPlaying?.albumId) {
    return null;
  }
  return state.albums.find((album) => album.Id === state.nowPlaying.albumId) || null;
}

function setAlbumBackgroundImage(url) {
  const value = url ? `url("${url}")` : "none";
  document.body.style.setProperty("--album-bg-image", value);
}

function syncAlbumBackgroundUi() {
  if (!albumBackgroundEnabled) {
    hasAlbumArt = false;
    document.body.classList.remove("has-album-art");
    setAlbumBackgroundImage(null);
    applyThemeUi(resolveAppliedTheme());
    return;
  }
  const album = resolveBackgroundAlbum();
  const hasImage = Boolean(album?.ImageTags?.Primary);
  const canShow = hasImage && Boolean(state.serverUrl && state.apiKey);
  hasAlbumArt = canShow;
  if (canShow) {
    setAlbumBackgroundImage(imageUrl(album.Id, ALBUM_BG_SIZE));
    document.body.classList.add("has-album-art");
  } else {
    document.body.classList.remove("has-album-art");
    setAlbumBackgroundImage(null);
  }
  applyThemeUi(resolveAppliedTheme());
}

function syncAlbumBackgroundToggle() {
  if (!dom.albumBackgroundToggle) {
    return;
  }
  dom.albumBackgroundToggle.classList.toggle("is-active", albumBackgroundEnabled);
  dom.albumBackgroundToggle.setAttribute("aria-pressed", albumBackgroundEnabled ? "true" : "false");
  const label = albumBackgroundEnabled
    ? "Disable album background"
    : "Enable album background";
  dom.albumBackgroundToggle.setAttribute("aria-label", label);
  dom.albumBackgroundToggle.title = label;
}

export function applyTheme(theme, persist = true) {
  preferredTheme = theme;
  applyThemeUi(resolveAppliedTheme());
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

export function initAlbumBackground() {
  const saved = localStorage.getItem("jellyflow-album-background");
  albumBackgroundEnabled = saved === "true";
  document.body.classList.toggle("album-background", albumBackgroundEnabled);
  syncAlbumBackgroundToggle();
  syncAlbumBackgroundUi();
}

export function setAlbumBackgroundEnabled(enabled, persist = true) {
  albumBackgroundEnabled = enabled;
  document.body.classList.toggle("album-background", albumBackgroundEnabled);
  syncAlbumBackgroundToggle();
  if (persist) {
    localStorage.setItem("jellyflow-album-background", enabled ? "true" : "false");
  }
  syncAlbumBackgroundUi();
}

export function isAlbumBackgroundEnabled() {
  return albumBackgroundEnabled;
}

export function syncAlbumBackground() {
  syncAlbumBackgroundUi();
}
