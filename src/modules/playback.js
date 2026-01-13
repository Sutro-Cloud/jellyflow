import { dom } from "./dom.js";
import { state } from "./state.js";
import { buildStreamUrlForTrack, imageUrl } from "./api.js";
import { albumArtist, albumTitle } from "./music.js";
import { loadLyricsForTrack } from "./lyrics.js";
import { resetFavoriteState, syncFavoriteForTrack } from "./favorites.js";

const supportsMediaSession = typeof navigator !== "undefined" && "mediaSession" in navigator;
const supportsMediaMetadata = typeof MediaMetadata !== "undefined";
const MAX_TITLE_LENGTH = 100;

function buildNowPlayingTitle(album) {
  const title = `${albumTitle(album)} / ${albumArtist(album)}`;
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }
  if (MAX_TITLE_LENGTH <= 3) {
    return title.slice(0, MAX_TITLE_LENGTH);
  }
  return `${title.slice(0, MAX_TITLE_LENGTH - 3)}...`;
}

function setDocumentTitle(title) {
  if (typeof document === "undefined") {
    return;
  }
  document.title = title;
}

function buildArtwork(albumId) {
  if (!albumId) {
    return [];
  }
  const sizes = [96, 128, 192, 256, 384, 512];
  return sizes.map((size) => ({
    src: imageUrl(albumId, size),
    sizes: `${size}x${size}`,
    type: "image/jpeg",
  }));
}

export function setMediaSessionMetadata(album, track) {
  if (!supportsMediaSession || !supportsMediaMetadata) {
    return;
  }
  const title = track?.Name || "Untitled";
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist: albumArtist(album),
    album: albumTitle(album),
    artwork: buildArtwork(album?.Id),
  });
}

export function clearMediaSessionMetadata() {
  if (!supportsMediaSession) {
    return;
  }
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = "none";
  if (navigator.mediaSession.setPositionState) {
    try {
      navigator.mediaSession.setPositionState({ duration: 0, playbackRate: 1, position: 0 });
    } catch (error) {
      // Some browsers throw on unsupported position state updates.
    }
  }
}

export function setMediaSessionPlaybackState(state) {
  if (!supportsMediaSession) {
    return;
  }
  navigator.mediaSession.playbackState = state;
}

export function updateMediaSessionPosition() {
  if (!supportsMediaSession || !navigator.mediaSession.setPositionState || !dom.audio) {
    return;
  }
  if (!Number.isFinite(dom.audio.duration)) {
    return;
  }
  try {
    navigator.mediaSession.setPositionState({
      duration: dom.audio.duration,
      playbackRate: dom.audio.playbackRate || 1,
      position: dom.audio.currentTime || 0,
    });
  } catch (error) {
    // Ignore unsupported position updates.
  }
}

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
  syncFavoriteForTrack(track);
  setMediaSessionMetadata(album, track);
  setDocumentTitle(buildNowPlayingTitle(album));
  notifyNowPlayingChange();
}

export function updateNowPlayingIdle() {
  if (state.nowPlaying) {
    return;
  }
  const isConnected = Boolean(state.serverUrl && state.apiKey && state.userId);
  dom.nowTitle.textContent = "Nothing playing";
  dom.nowSub.textContent = isConnected ? "Waiting for track" : "Connect to start listening";
  resetFavoriteState();
  clearMediaSessionMetadata();
  setDocumentTitle("Jellyflow");
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
