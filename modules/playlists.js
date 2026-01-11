import { dom } from "./dom.js";
import { state } from "./state.js";
import { fetchJson } from "./api.js";
import { formatRuntime } from "./utils.js";
import { createTrackButton } from "./ui.js";
import { playTrack } from "./playback.js";
import { jumpToAlbumById } from "./coverflow.js";

function updatePlaylistStatus(text) {
  if (!dom.playlistStatus) {
    return;
  }
  dom.playlistStatus.textContent = text;
}

function getPlaylistById(playlistId) {
  if (!playlistId) {
    return null;
  }
  return state.playlists.find((playlist) => playlist.Id === playlistId) || null;
}

export function setPlaylistView(view, playlistId = null) {
  state.playlistView = view;
  if (dom.playlistPanel) {
    dom.playlistPanel.dataset.view = view;
  }
  if (dom.playlistBack) {
    dom.playlistBack.hidden = view !== "tracks";
  }
  if (view === "list") {
    state.activePlaylistId = null;
    if (dom.playlistTitle) {
      dom.playlistTitle.textContent = "Playlists";
    }
    renderPlaylistList();
    updatePlaylistStatus(
      state.playlists.length ? `${state.playlists.length} playlists` : "No playlists loaded"
    );
    return;
  }
  state.activePlaylistId = playlistId;
  const playlist = getPlaylistById(playlistId);
  if (dom.playlistTitle) {
    dom.playlistTitle.textContent = playlist?.Name || "Playlist";
  }
  updatePlaylistStatus("Loading tracks...");
  renderPlaylistList();
}

function renderPlaylistList() {
  if (!dom.playlistList) {
    return;
  }
  dom.playlistList.innerHTML = "";
  if (!state.playlists.length) {
    dom.playlistList.innerHTML = '<div class="empty">No playlists found</div>';
    return;
  }
  state.playlists.forEach((playlist) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playlist-entry";
    button.dataset.playlistId = playlist.Id;
    if (state.activePlaylistId === playlist.Id) {
      button.classList.add("is-active");
    }

    const title = document.createElement("div");
    title.className = "playlist-name";
    title.textContent = playlist.Name || "Untitled playlist";

    const count = document.createElement("div");
    count.className = "playlist-count";
    const childCount = Number.isFinite(playlist.ChildCount) ? playlist.ChildCount : null;
    count.textContent = childCount != null ? `${childCount} tracks` : "Tracks";

    button.appendChild(title);
    button.appendChild(count);
    button.addEventListener("click", () => {
      openPlaylist(playlist);
    });
    dom.playlistList.appendChild(button);
  });
}

function renderPlaylistTracks(playlistId) {
  if (!dom.playlistTracks) {
    return;
  }
  dom.playlistTracks.innerHTML = "";
  const tracks = state.playlistTracksById.get(playlistId) || [];
  if (!tracks.length) {
    dom.playlistTracks.innerHTML = '<div class="empty">No tracks in this playlist</div>';
    return;
  }
  tracks.forEach((track, index) => {
    const titleText = track.Name || "Untitled";
    const albumName = track.Album || "Unknown album";
    const artists = Array.isArray(track.Artists) && track.Artists.length
      ? track.Artists.join(", ")
      : track.AlbumArtist || "Unknown artist";
    const button = createTrackButton({
      number: (index + 1).toString().padStart(2, "0"),
      title: titleText,
      meta: `${albumName} · ${artists}`,
      duration: formatRuntime(track.RunTimeTicks),
      dataset: { trackId: track.Id, playlistId },
      onClick: (event) => {
        event.stopPropagation();
        void playPlaylistTrack(playlistId, track, index);
      },
    });
    dom.playlistTracks.appendChild(button);
  });
  syncPlaylistHighlights();
}

export async function loadPlaylists() {
  if (!state.serverUrl || !state.apiKey || !state.userId) {
    updatePlaylistStatus("Connect to Jellyfin");
    return;
  }
  state.playlistsLoading = true;
  const token = ++state.playlistLoadToken;
  updatePlaylistStatus("Loading playlists...");
  try {
    const data = await fetchJson(
      `/Users/${state.userId}/Items?IncludeItemTypes=Playlist&Recursive=true&SortBy=SortName&SortOrder=Ascending&Fields=ChildCount`
    );
    if (token !== state.playlistLoadToken) {
      return;
    }
    state.playlists = data.Items || [];
    renderPlaylistList();
    updatePlaylistStatus(
      state.playlists.length ? `${state.playlists.length} playlists` : "No playlists found"
    );
  } catch (error) {
    updatePlaylistStatus("Playlists failed to load");
  } finally {
    if (token === state.playlistLoadToken) {
      state.playlistsLoading = false;
    }
  }
}

async function ensurePlaylistTracks(playlistId) {
  if (!playlistId) {
    return;
  }
  if (state.playlistTracksById.has(playlistId)) {
    renderPlaylistTracks(playlistId);
    const tracks = state.playlistTracksById.get(playlistId) || [];
    updatePlaylistStatus(`${tracks.length} tracks`);
    return;
  }
  if (dom.playlistTracks) {
    dom.playlistTracks.innerHTML = '<div class="empty">Loading tracks...</div>';
  }
  updatePlaylistStatus("Loading tracks...");
  try {
    const data = await fetchJson(
      `/Playlists/${playlistId}/Items?UserId=${state.userId}&IncludeItemTypes=Audio&Fields=RunTimeTicks,AlbumId,AlbumArtist,Artists,Album`
    );
    const tracks = data.Items || [];
    state.playlistTracksById.set(playlistId, tracks);
    renderPlaylistTracks(playlistId);
    updatePlaylistStatus(`${tracks.length} tracks`);
  } catch (error) {
    if (dom.playlistTracks) {
      dom.playlistTracks.innerHTML = '<div class="empty">Could not load tracks</div>';
    }
    updatePlaylistStatus("Playlist tracks failed to load");
  }
}

function openPlaylist(playlist) {
  if (!playlist || !playlist.Id) {
    return;
  }
  setPlaylistView("tracks", playlist.Id);
  void ensurePlaylistTracks(playlist.Id);
}

function findAlbumIndexForTrack(albumId, trackId) {
  if (!albumId || !trackId) {
    return null;
  }
  const tracks = state.tracksByAlbum.get(albumId);
  if (!tracks) {
    return null;
  }
  const index = tracks.findIndex((track) => track.Id === trackId);
  return index >= 0 ? index : null;
}

async function resolveAlbumForTrack(track) {
  const albumId = track.AlbumId || track.Album?.Id;
  if (albumId) {
    const cached = state.albums.find((item) => item.Id === albumId);
    if (cached) {
      return cached;
    }
    try {
      return await fetchJson(`/Items/${albumId}`);
    } catch (error) {
      return {
        Id: albumId,
        Name: track.Album || track.Name || "Unknown album",
        AlbumArtist: track.AlbumArtist || track.Artists || "Unknown artist",
        Artists: track.Artists || [],
      };
    }
  }
  return {
    Id: track.Id,
    Name: track.Album || track.Name || "Unknown album",
    AlbumArtist: track.AlbumArtist || track.Artists || "Unknown artist",
    Artists: track.Artists || [],
  };
}

export async function playPlaylistTrack(playlistId, track, playlistIndex) {
  const album = await resolveAlbumForTrack(track);
  const albumIndex = findAlbumIndexForTrack(album.Id, track.Id);
  const resolvedIndex = Number.isFinite(albumIndex) ? albumIndex : 0;
  playTrack(album, track, resolvedIndex, {
    playlistId,
    playlistIndex,
    trackFocusIndex: Number.isFinite(albumIndex) ? albumIndex : null,
  });
  const jumpId = track.AlbumId || (album?.Id !== track.Id ? album?.Id : null);
  if (jumpId) {
    void jumpToAlbumById(jumpId);
  }
}

export function syncPlaylistHighlights() {
  if (!dom.playlistTracks) {
    return;
  }
  const trackButtons = dom.playlistTracks.querySelectorAll(".track");
  trackButtons.forEach((button) => {
    const isPlaying =
      state.nowPlaying &&
      button.dataset.trackId === state.nowPlaying.trackId;
    button.classList.toggle("is-playing", Boolean(isPlaying));
  });
}

export function resetPlaylistState() {
  state.playlists = [];
  state.playlistTracksById.clear();
  state.playlistView = "list";
  state.activePlaylistId = null;
  state.playlistPlayback = null;
  state.playlistsLoading = false;
  state.playlistLoadToken += 1;
  if (dom.coverflowSection) {
    dom.coverflowSection.classList.remove("is-playlist-open");
  }
  document.body.classList.remove("is-playlist-open");
  if (dom.playlistPaneToggle) {
    dom.playlistPaneToggle.setAttribute("aria-expanded", "false");
  }
  if (dom.playlistPanel) {
    dom.playlistPanel.dataset.view = "list";
  }
  if (dom.playlistTitle) {
    dom.playlistTitle.textContent = "Playlists";
  }
  updatePlaylistStatus("No playlists loaded");
  if (dom.playlistList) {
    dom.playlistList.innerHTML = '<div class="empty">No playlists loaded</div>';
  }
  if (dom.playlistTracks) {
    dom.playlistTracks.innerHTML = "";
  }
}
