import { dom } from "./dom.js";
import { state } from "./state.js";
import { buildStreamUrlForTrack, imageUrl } from "./api.js";
import { albumArtist, albumTitle } from "./music.js";
import { loadLyricsForTrack } from "./lyrics.js";

const nowPlayingListeners = new Set();

export function onNowPlayingChange(handler) {
  if (typeof handler !== "function") {
    return () => {};
  }
  nowPlayingListeners.add(handler);
  return () => {
    nowPlayingListeners.delete(handler);
  };
}

function notifyNowPlayingChange() {
  nowPlayingListeners.forEach((handler) => {
    handler();
  });
}

export function playTrack(album, track, index, options = {}) {
  const url = buildStreamUrlForTrack(track);
  const playlistId = options.playlistId || null;
  const playlistIndex = Number.isFinite(options.playlistIndex) ? options.playlistIndex : null;
  const hasFocusOverride = Object.prototype.hasOwnProperty.call(options, "trackFocusIndex");
  const focusIndex = hasFocusOverride ? options.trackFocusIndex : index;
  state.currentTrack = track;
  state.currentAlbum = album;
  state.trackFocusIndex = Number.isFinite(focusIndex) ? focusIndex : null;
  state.trackFocusAlbumId = album.Id;
  state.playlistPlayback = playlistId
    ? {
      playlistId,
      index: playlistIndex != null ? playlistIndex : 0,
    }
    : null;
  state.nowPlaying = {
    albumId: album.Id,
    albumName: albumTitle(album),
    albumArtist: albumArtist(album),
    trackId: track.Id,
    trackName: track.Name || "Untitled",
    index,
    playlistId,
    playlistIndex,
  };
  dom.audio.src = url;
  dom.audio.preload = "auto";
  dom.audio.load();
  dom.audio.play().catch(() => {});

  const artUrl = imageUrl(album.Id, 200);
  dom.nowCover.style.backgroundImage = `url('${artUrl}')`;
  dom.nowTitle.textContent = track.Name || "Untitled";
  dom.nowSub.textContent = `${albumTitle(album)} - ${albumArtist(album)}`;
  loadLyricsForTrack(track, album);
  notifyNowPlayingChange();
}

export function updateNowPlayingIdle() {
  if (state.nowPlaying) {
    return;
  }
  const isConnected = Boolean(state.serverUrl && state.apiKey && state.userId);
  dom.nowTitle.textContent = "Nothing playing";
  dom.nowSub.textContent = isConnected ? "Waiting for track" : "Connect to start listening";
}

export function toggleAudioPlayback() {
  if (!dom.audio) {
    return;
  }
  if (dom.audio.paused) {
    dom.audio.play().catch(() => {});
    return;
  }
  dom.audio.pause();
}
