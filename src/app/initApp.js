import { dom } from "../modules/dom.js";
import { state } from "../modules/state.js";
import { loadSettings, loadPreferences, savePreferences } from "../modules/storage.js";
import { applyTheme, initTheme } from "../modules/theme.js";
import { connect, loadUsers, resetForm } from "../modules/connection.js";
import {
  clearTypeahead,
  clearTypeaheadLookup,
  closeOpenAlbum,
  focusActiveCover,
  focusTrackByDelta,
  getOpenTrackButtons,
  handleCoverClick,
  jumpToAlbumById,
  jumpToArtistPrefix,
  moveActiveIndex,
  normalizeTypeaheadQuery,
  scheduleTypeaheadClear,
  scheduleTypeaheadLookup,
  shufflePlay,
  setActiveIndex,
  shouldUseServerLookup,
  showTypeahead,
  toggleOpenForActive,
  syncTrackHighlights,
} from "../modules/coverflow.js";
import { loadPlaylists, playPlaylistTrack, setPlaylistView, syncPlaylistHighlights } from "../modules/playlists.js";
import { loadLyricsForTrack, maybeEstimateLyrics, syncLyrics } from "../modules/lyrics.js";
import { onNowPlayingChange, playTrack, toggleAudioPlayback } from "../modules/playback.js";
import { resetFavoriteState, toggleFavoriteForCurrentTrack } from "../modules/favorites.js";
import { initAds } from "../modules/ads.js";
import { initAnalytics } from "../modules/analytics.js";
import { setStatus } from "../modules/ui.js";

function setupEvents() {
  dom.openSettings.addEventListener("click", () => {
    dom.settingsDialog.showModal();
  });
  if (dom.lyricsPaneToggle && dom.coverflowSection) {
    dom.lyricsPaneToggle.addEventListener("click", () => {
      const isOpen = dom.coverflowSection.classList.toggle("is-lyrics-open");
      document.body.classList.toggle("is-lyrics-open", isOpen);
      dom.lyricsPaneToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        dom.coverflowSection.classList.remove("is-playlist-open");
        document.body.classList.remove("is-playlist-open");
        if (dom.playlistPaneToggle) {
          dom.playlistPaneToggle.setAttribute("aria-expanded", "false");
        }
      }
    });
  }
  if (dom.playlistPaneToggle && dom.coverflowSection) {
    dom.playlistPaneToggle.addEventListener("click", () => {
      const isOpen = dom.coverflowSection.classList.toggle("is-playlist-open");
      document.body.classList.toggle("is-playlist-open", isOpen);
      dom.playlistPaneToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        dom.coverflowSection.classList.remove("is-lyrics-open");
        document.body.classList.remove("is-lyrics-open");
        if (dom.lyricsPaneToggle) {
          dom.lyricsPaneToggle.setAttribute("aria-expanded", "false");
        }
        setPlaylistView("list");
        if (!state.playlists.length && !state.playlistsLoading) {
          void loadPlaylists();
        }
      }
    });
  }
  if (dom.playlistBack) {
    dom.playlistBack.addEventListener("click", () => {
      setPlaylistView("list");
    });
  }
  dom.closeSettings.addEventListener("click", () => {
    dom.settingsDialog.close();
  });
  dom.settingsDialog.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) {
      event.preventDefault();
      void connect();
    }
  });
  if (dom.status) {
    dom.status.addEventListener("click", () => {
      dom.settingsDialog.showModal();
    });
    dom.status.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        dom.settingsDialog.showModal();
      }
    });
  }
  if (dom.connectSplashBtn) {
    dom.connectSplashBtn.addEventListener("click", () => {
      dom.settingsDialog.showModal();
    });
  }
  dom.loadUsersBtn.addEventListener("click", loadUsers);
  dom.connectBtn.addEventListener("click", connect);
  dom.resetBtn.addEventListener("click", resetForm);
  dom.lyricsToggle.addEventListener("change", () => {
    state.lyricsOnline = dom.lyricsToggle.checked;
    savePreferences();
    if (!state.currentTrack) {
      return;
    }
    loadLyricsForTrack(state.currentTrack, state.currentAlbum);
  });
  dom.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
    applyTheme(nextTheme);
  });
  if (dom.shuffleBtn) {
    dom.shuffleBtn.addEventListener("click", () => {
      void shufflePlay();
    });
  }
  if (dom.favoriteToggle) {
    dom.favoriteToggle.addEventListener("click", () => {
      void toggleFavoriteForCurrentTrack();
    });
  }
  const setPlayerCollapsed = (isCollapsed) => {
    if (!dom.playerFooter) {
      return;
    }
    dom.playerFooter.classList.toggle("is-collapsed", isCollapsed);
    if (dom.playerCollapse) {
      dom.playerCollapse.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      dom.playerCollapse.title = isCollapsed ? "Show player" : "Hide player";
    }
    if (dom.playerReveal) {
      dom.playerReveal.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      dom.playerReveal.title = isCollapsed ? "Show player" : "Hide player";
    }
  };
  if (dom.playerCollapse) {
    setPlayerCollapsed(false);
    dom.playerCollapse.addEventListener("click", () => setPlayerCollapsed(true));
  }
  if (dom.playerReveal) {
    dom.playerReveal.addEventListener("click", () => setPlayerCollapsed(false));
  }
  dom.userSelect.addEventListener("change", (event) => {
    dom.userIdInput.value = event.target.value;
  });
  dom.coverflowTrack.addEventListener(
    "wheel",
    (event) => {
      if (event.target.closest(".tracklist") || event.target.closest(".coverflow-back")) {
        return;
      }
      event.preventDefault();
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) {
        return;
      }
      moveActiveIndex(delta > 0 ? 1 : -1);
    },
    { passive: false }
  );
  dom.coverflowTrack.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (target.closest(".tracklist")) {
        return;
      }
      if (state.openAlbumId) {
        event.preventDefault();
        event.stopPropagation();
        closeOpenAlbum();
        return;
      }
      const activeItem = dom.coverflowTrack.children[state.activeIndex];
      if (activeItem) {
        const rect = activeItem.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleCoverClick(state.activeIndex);
          focusActiveCover();
          return;
        }
      }
      if (target.closest(".coverflow-item")) {
        return;
      }
      const candidates = document.elementsFromPoint(event.clientX, event.clientY);
      const targetItem = candidates
        .map((element) => (element.closest ? element.closest(".coverflow-item") : null))
        .find((item) => item && !item.classList.contains("is-active"));
      if (!targetItem) {
        return;
      }
      const index = Number(targetItem.dataset.index);
      if (!Number.isFinite(index)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (state.openAlbumId) {
        closeOpenAlbum();
      }
      setActiveIndex(index);
      focusActiveCover();
    },
    { capture: true }
  );
  const swipeState = {
    active: false,
    axis: null,
    startX: 0,
    startY: 0,
    stepCount: 0,
    startTime: 0,
    lastX: 0,
    lastTime: 0,
  };
  const SWIPE_LOCK_THRESHOLD = 6;
  const SWIPE_STEP = 55;
  const SWIPE_END_THRESHOLD = 18;
  const shouldIgnoreCoverflowGesture = (target) =>
    target &&
    target.closest &&
    (target.closest(".tracklist") || target.closest(".coverflow-back"));
  const handleCoverflowTouchStart = (event) => {
    if (event.touches && event.touches.length > 1) {
      return;
    }
    if (shouldIgnoreCoverflowGesture(event.target)) {
      return;
    }
    const touch = event.touches ? event.touches[0] : event;
    swipeState.active = true;
    swipeState.axis = null;
    swipeState.startX = touch.clientX;
    swipeState.startY = touch.clientY;
    swipeState.stepCount = 0;
    swipeState.startTime = event.timeStamp || Date.now();
    swipeState.lastX = swipeState.startX;
    swipeState.lastTime = swipeState.startTime;
  };
  const handleCoverflowTouchMove = (event) => {
    if (!swipeState.active) {
      return;
    }
    if (event.touches && event.touches.length > 1) {
      return;
    }
    const touch = event.touches ? event.touches[0] : event;
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;
    if (!swipeState.axis) {
      if (
        Math.abs(deltaX) < SWIPE_LOCK_THRESHOLD &&
        Math.abs(deltaY) < SWIPE_LOCK_THRESHOLD
      ) {
        return;
      }
      swipeState.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }
    if (swipeState.axis !== "x") {
      return;
    }
    event.preventDefault();
    swipeState.lastX = touch.clientX;
    swipeState.lastTime = event.timeStamp || Date.now();
    const nextStep = Math.trunc(deltaX / SWIPE_STEP);
    const delta = nextStep - swipeState.stepCount;
    if (delta === 0) {
      return;
    }
    swipeState.stepCount = nextStep;
    const stepDirection = delta > 0 ? -1 : 1;
    for (let i = 0; i < Math.abs(delta); i += 1) {
      moveActiveIndex(stepDirection);
    }
  };
  const handleCoverflowTouchEnd = (event) => {
    if (!swipeState.active) {
      return;
    }
    const touch = event.changedTouches ? event.changedTouches[0] : event;
    const deltaX = touch.clientX - swipeState.startX;
    const duration = Math.max(16, (swipeState.lastTime || event.timeStamp) - swipeState.startTime);
    const velocity = Math.abs(deltaX) / duration;
    const direction = deltaX > 0 ? -1 : 1;
    if (swipeState.axis === "x" && swipeState.stepCount === 0) {
      if (Math.abs(deltaX) > SWIPE_END_THRESHOLD) {
        moveActiveIndex(direction);
      }
    } else if (swipeState.axis === "x") {
      let extraSteps = 0;
      if (velocity > 0.8) {
        extraSteps = Math.min(4, Math.ceil((velocity - 0.8) * 4));
      }
      for (let i = 0; i < extraSteps; i += 1) {
        moveActiveIndex(direction);
      }
    }
    swipeState.active = false;
    swipeState.axis = null;
  };
  dom.coverflowTrack.addEventListener("touchstart", handleCoverflowTouchStart, {
    passive: true,
  });
  dom.coverflowTrack.addEventListener("touchmove", handleCoverflowTouchMove, {
    passive: false,
  });
  dom.coverflowTrack.addEventListener("touchend", handleCoverflowTouchEnd);
  dom.coverflowTrack.addEventListener("touchcancel", handleCoverflowTouchEnd);
  document.addEventListener("pointerdown", (event) => {
    if (!state.openAlbumId) {
      return;
    }
    const target = event.target;
    if (target && target.closest && target.closest(".coverflow-item.is-open")) {
      return;
    }
    if (dom.coverflowTrack && dom.coverflowTrack.contains(target)) {
      return;
    }
    closeOpenAlbum();
  });
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const active = document.activeElement;
    const isEditable =
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable);
    const isCoverflowFocus =
      !active ||
      active === document.body ||
      active.classList.contains("coverflow-item") ||
      dom.coverflowTrack.contains(active);
    if (event.key === " " || event.key === "Spacebar") {
      if (!isEditable && !state.openAlbumId && isCoverflowFocus && state.typeaheadQuery) {
        // Let typeahead capture spaces inside a query.
      } else if (!isEditable) {
        event.preventDefault();
        toggleAudioPlayback();
        return;
      } else {
        return;
      }
    }
    if (dom.settingsDialog.open) {
      return;
    }
    if (event.key === "Escape") {
      if (state.openAlbumId) {
        event.preventDefault();
        closeOpenAlbum();
        focusActiveCover();
        return;
      }
      if (state.typeaheadQuery) {
        event.preventDefault();
        clearTypeahead();
        return;
      }
      return;
    }
    if (!state.openAlbumId && !isEditable && isCoverflowFocus) {
      if (event.key === "Backspace" && state.typeaheadQuery) {
        event.preventDefault();
        state.typeaheadQuery = normalizeTypeaheadQuery(
          state.typeaheadQuery.slice(0, -1)
        );
        if (state.typeaheadQuery) {
          showTypeahead();
          scheduleTypeaheadClear();
          const found = jumpToArtistPrefix(state.typeaheadQuery);
          if (found) {
            clearTypeaheadLookup();
          } else if (shouldUseServerLookup()) {
            scheduleTypeaheadLookup(state.typeaheadQuery);
          }
        } else {
          clearTypeahead();
        }
        return;
      }
      if (event.key.length === 1 && /[a-z0-9? ]/i.test(event.key)) {
        event.preventDefault();
        state.typeaheadQuery = normalizeTypeaheadQuery(state.typeaheadQuery + event.key);
        if (!state.typeaheadQuery) {
          clearTypeahead();
          return;
        }
        showTypeahead();
        scheduleTypeaheadClear();
        const found = jumpToArtistPrefix(state.typeaheadQuery);
        if (found) {
          clearTypeaheadLookup();
        } else if (shouldUseServerLookup()) {
          scheduleTypeaheadLookup(state.typeaheadQuery);
        }
        return;
      }
    }
    if (event.key === "Enter" && state.openAlbumId && !isEditable) {
      const target = event.target;
      const targetTrack = target && target.closest ? target.closest(".track") : null;
      if (targetTrack) {
        event.preventDefault();
        targetTrack.click();
        return;
      }
      if (state.trackFocusAlbumId === state.openAlbumId && state.trackFocusIndex != null) {
        const buttons = getOpenTrackButtons();
        const button = buttons[state.trackFocusIndex];
        if (button) {
          event.preventDefault();
          button.click();
          return;
        }
      }
    }
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && state.openAlbumId && !isEditable) {
      const delta = event.key === "ArrowDown" ? 1 : -1;
      if (focusTrackByDelta(delta)) {
        event.preventDefault();
        return;
      }
    }
    const isTrackButton = Boolean(active && active.classList && active.classList.contains("track"));
    if (isTrackButton && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      if (state.openAlbumId) {
        closeOpenAlbum();
      }
      const direction = event.key === "ArrowRight" ? 1 : -1;
      moveActiveIndex(direction);
      focusActiveCover();
      return;
    }
    if (
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.tagName === "BUTTON" ||
        active.tagName === "AUDIO" ||
        active.isContentEditable)
    ) {
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      moveActiveIndex(direction);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      toggleOpenForActive();
      focusActiveCover();
      return;
    }
  });
  dom.audio.addEventListener("ended", () => {
    if (!state.nowPlaying) {
      return;
    }
    if (state.playlistPlayback) {
      const playlistId = state.playlistPlayback.playlistId;
      const tracks = state.playlistTracksById.get(playlistId) || [];
      const nextIndex = state.playlistPlayback.index + 1;
      if (tracks[nextIndex]) {
        void playPlaylistTrack(playlistId, tracks[nextIndex], nextIndex);
        return;
      }
    }
    const albumId = state.nowPlaying.albumId;
    const tracks = state.tracksByAlbum.get(albumId) || [];
    let currentIndex = state.nowPlaying.index;
    if (!Number.isFinite(currentIndex) && state.currentTrack) {
      currentIndex = tracks.findIndex((track) => track.Id === state.currentTrack.Id);
    }
    if (!Number.isFinite(currentIndex) || currentIndex < 0) {
      return;
    }
    const nextIndex = currentIndex + 1;
    if (tracks[nextIndex]) {
      const album =
        state.albums.find((item) => item.Id === albumId) ||
        (state.currentAlbum && state.currentAlbum.Id === albumId ? state.currentAlbum : null);
      if (!album) {
        return;
      }
      playTrack(album, tracks[nextIndex], nextIndex);
    }
  });
  dom.audio.addEventListener("timeupdate", () => {
    syncLyrics();
  });
  dom.audio.addEventListener("loadedmetadata", () => {
    maybeEstimateLyrics(state.currentTrack);
    syncLyrics(true);
  });
  dom.nowCover.addEventListener("click", () => {
    if (state.nowPlaying?.albumId) {
      void jumpToAlbumById(state.nowPlaying.albumId);
    }
  });
  dom.nowCover.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (state.nowPlaying?.albumId) {
        void jumpToAlbumById(state.nowPlaying.albumId);
      }
    }
  });
}

export function initApp() {
  loadSettings();
  loadPreferences();
  initTheme();
  initAds();
  initAnalytics();
  setupEvents();
  resetFavoriteState();

  onNowPlayingChange(syncTrackHighlights);
  onNowPlayingChange(syncPlaylistHighlights);

  const hasSavedAuth = Boolean(
    dom.serverUrlInput.value && dom.apiKeyInput.value && dom.userIdInput.value
  );
  if (hasSavedAuth) {
    connect();
  } else {
    setStatus("Disconnected", "idle");
  }
}
