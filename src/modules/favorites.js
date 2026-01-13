import { dom } from "./dom.js";
import { state } from "./state.js";
import { fetchItemUserData, setItemFavorite } from "./api.js";

function canFavorite() {
  return Boolean(state.serverUrl && state.apiKey && state.userId);
}

function setFavoriteButtonState({ enabled, isFavorite, busy }) {
  if (!dom.favoriteToggle) {
    return;
  }
  dom.favoriteToggle.disabled = !enabled || busy;
  dom.favoriteToggle.classList.toggle("is-active", Boolean(isFavorite));
  dom.favoriteToggle.setAttribute("aria-pressed", isFavorite ? "true" : "false");
  dom.favoriteToggle.title = isFavorite ? "Unfavorite track" : "Favorite track";
}

function applyFavoriteToTrackData(track, isFavorite) {
  if (!track || !track.Id) {
    return;
  }
  if (!track.UserData || typeof track.UserData !== "object") {
    track.UserData = {};
  }
  track.UserData.IsFavorite = isFavorite;
}

function updateFavoriteInCollections(trackId, isFavorite) {
  if (!trackId) {
    return;
  }
  if (state.currentTrack?.Id === trackId) {
    applyFavoriteToTrackData(state.currentTrack, isFavorite);
  }
  state.tracksByAlbum.forEach((tracks) => {
    const match = tracks.find((track) => track.Id === trackId);
    if (match) {
      applyFavoriteToTrackData(match, isFavorite);
    }
  });
  state.playlistTracksById.forEach((tracks) => {
    const match = tracks.find((track) => track.Id === trackId);
    if (match) {
      applyFavoriteToTrackData(match, isFavorite);
    }
  });
}

function updateFavoriteIndicators(trackId, isFavorite) {
  if (!trackId || typeof document === "undefined") {
    return;
  }
  const selector = `.track[data-track-id="${trackId}"]`;
  document.querySelectorAll(selector).forEach((button) => {
    const tail = button.querySelector(".track-tail");
    if (!tail) {
      return;
    }
    const existing = tail.querySelector(".track-favorite");
    if (isFavorite) {
      if (!existing) {
        const favoriteEl = document.createElement("span");
        favoriteEl.className = "track-favorite";
        favoriteEl.textContent = "\u2665";
        favoriteEl.setAttribute("aria-hidden", "true");
        tail.insertBefore(favoriteEl, tail.firstChild);
      }
    } else if (existing) {
      existing.remove();
    }
  });
}

function applyFavoriteState(trackId, isFavorite) {
  updateFavoriteInCollections(trackId, isFavorite);
  updateFavoriteIndicators(trackId, isFavorite);
}

export function resetFavoriteState() {
  state.favoriteTrackId = null;
  state.isFavorite = false;
  state.favoriteBusy = false;
  state.favoriteToken += 1;
  setFavoriteButtonState({ enabled: false, isFavorite: false, busy: false });
}

export async function syncFavoriteForTrack(track) {
  if (!track?.Id || !canFavorite()) {
    resetFavoriteState();
    return;
  }
  const trackId = track.Id;
  const token = ++state.favoriteToken;
  state.favoriteTrackId = trackId;
  state.favoriteBusy = false;
  state.isFavorite = false;
  setFavoriteButtonState({ enabled: true, isFavorite: false, busy: true });
  try {
    const data = await fetchItemUserData(trackId);
    if (token !== state.favoriteToken || state.favoriteTrackId !== trackId) {
      return;
    }
    const isFavorite = Boolean(data?.UserData?.IsFavorite);
    state.isFavorite = isFavorite;
    setFavoriteButtonState({ enabled: true, isFavorite, busy: false });
    applyFavoriteState(trackId, isFavorite);
  } catch (error) {
    if (token !== state.favoriteToken || state.favoriteTrackId !== trackId) {
      return;
    }
    state.isFavorite = false;
    setFavoriteButtonState({ enabled: true, isFavorite: false, busy: false });
  }
}

export async function toggleFavoriteForCurrentTrack() {
  if (!state.currentTrack?.Id || !canFavorite() || state.favoriteBusy) {
    return;
  }
  const trackId = state.currentTrack.Id;
  const track = state.currentTrack;
  const shouldFavorite = !state.isFavorite;
  state.favoriteBusy = true;
  setFavoriteButtonState({ enabled: true, isFavorite: state.isFavorite, busy: true });
  try {
    await setItemFavorite(trackId, shouldFavorite);
    if (state.currentTrack?.Id !== trackId) {
      return;
    }
    state.isFavorite = shouldFavorite;
    applyFavoriteState(trackId, shouldFavorite);
  } catch (error) {
    if (state.currentTrack?.Id !== trackId) {
      return;
    }
  } finally {
    if (state.currentTrack?.Id === trackId) {
      state.favoriteBusy = false;
      setFavoriteButtonState({ enabled: true, isFavorite: state.isFavorite, busy: false });
    }
  }
  if (state.currentTrack?.Id === trackId) {
    await syncFavoriteForTrack(track);
  }
}
