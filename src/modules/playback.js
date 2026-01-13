import { Capacitor } from "@capacitor/core";
import { MediaSession as MediaSessionPlugin } from "@capgo/capacitor-media-session";
import { dom } from "./dom.js";
import { state } from "./state.js";
import { buildStreamUrlForTrack, imageUrl } from "./api.js";
import { albumArtist, albumTitle } from "./music.js";
import { loadLyricsForTrack } from "./lyrics.js";
import { resetFavoriteState, syncFavoriteForTrack } from "./favorites.js";

const supportsMediaSession = typeof navigator !== "undefined" && "mediaSession" in navigator;
const supportsMediaMetadata = typeof MediaMetadata !== "undefined";
const shouldUseNativeMediaSession = () =>
  typeof Capacitor !== "undefined" &&
  typeof Capacitor.isNativePlatform === "function" &&
  Capacitor.isNativePlatform();
const runNativeMediaSession = (callback) => {
  if (!shouldUseNativeMediaSession()) {
    return;
  }
  try {
    callback();
  } catch (error) {
    // Ignore native media session errors.
  }
};
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

function trackArtist(track, album) {
  if (track?.AlbumArtist) {
    const clean = track.AlbumArtist.toString().trim();
    if (clean) {
      return clean;
    }
  }
  if (Array.isArray(track?.Artists) && track.Artists.length) {
    const joined = track.Artists.join(", ").trim();
    if (joined) {
      return joined;
    }
  }
  if (album) {
    return albumArtist(album);
  }
  return "Unknown artist";
}

function trackAlbumTitle(track, album) {
  if (track?.Album) {
    const clean = track.Album.toString().trim();
    if (clean) {
      return clean;
    }
  }
  if (album) {
    return albumTitle(album);
  }
  return "Untitled";
}

export function setMediaSessionMetadata(album, track) {
  const title = track?.Name || "Untitled";
  const artist = trackArtist(track, album);
  const albumName = trackAlbumTitle(track, album);
  runNativeMediaSession(() => {
    void MediaSessionPlugin.setMetadata({
      title,
      artist,
      album: albumName,
      artwork: buildArtwork(album?.Id),
    });
  });
  if (!supportsMediaSession || !supportsMediaMetadata || shouldUseNativeMediaSession()) {
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    album: albumName,
    artwork: buildArtwork(album?.Id),
  });
}

export function clearMediaSessionMetadata() {
  runNativeMediaSession(() => {
    void MediaSessionPlugin.setMetadata({ title: "", artist: "", album: "", artwork: [] });
    void MediaSessionPlugin.setPlaybackState({ playbackState: "none" });
    void MediaSessionPlugin.setPositionState({ duration: 0, playbackRate: 1, position: 0 });
  });
  if (!supportsMediaSession || shouldUseNativeMediaSession()) {
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
  runNativeMediaSession(() => {
    void MediaSessionPlugin.setPlaybackState({ playbackState: state });
  });
  if (!supportsMediaSession || shouldUseNativeMediaSession()) {
    return;
  }
  navigator.mediaSession.playbackState = state;
}

export function updateMediaSessionPosition() {
  if (!dom.audio || !Number.isFinite(dom.audio.duration)) {
    return;
  }
  runNativeMediaSession(() => {
    void MediaSessionPlugin.setPositionState({
      duration: dom.audio.duration,
      playbackRate: dom.audio.playbackRate || 1,
      position: dom.audio.currentTime || 0,
    });
  });
  if (!supportsMediaSession || shouldUseNativeMediaSession()) {
    return;
  }
  if (!navigator.mediaSession.setPositionState) {
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
  const albumName = trackAlbumTitle(track, album);
  const artistName = trackArtist(track, album);
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
    albumName,
    albumArtist: artistName,
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
  dom.nowSub.textContent = `${albumName} - ${artistName}`;
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
