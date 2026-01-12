import { dom } from "./dom.js";
import {
  state,
  ALBUM_PAGE_LIMIT,
  TYPEAHEAD_LOOKUP_DELAY,
  IS_IOS,
  IS_SMALL_VIEWPORT,
} from "./state.js";
import { fetchAlbumsPage, fetchJson, imageUrl } from "./api.js";
import { albumArtist, albumSortKey, albumTitle, compareAlbumKeys } from "./music.js";
import { formatRuntime, placeholderText } from "./utils.js";
import { createTrackButton, setStatus } from "./ui.js";
import { playTrack, updateNowPlayingIdle } from "./playback.js";
import { resetLyricsPanel } from "./lyrics.js";

const isSafari =
  typeof navigator !== "undefined" &&
  /safari/i.test(navigator.userAgent) &&
  !/chrome|crios|android/i.test(navigator.userAgent);
const SAFARI_WILL_CHANGE_TIMEOUT = 450;
const ALBUM_WINDOW_BUFFER = 3;
const ALBUM_PREFETCH_THRESHOLD = 12;
const MAX_LOADED_COUNT =
  IS_IOS || IS_SMALL_VIEWPORT
    ? ALBUM_PAGE_LIMIT + ALBUM_WINDOW_BUFFER * 2
    : ALBUM_PAGE_LIMIT * 2 + ALBUM_WINDOW_BUFFER * 2;
let safariWillChangeBoost = false;
let safariWillChangeTimer = null;
let coverflowAnimationToken = 0;
const COVER_IMAGE_DEFAULT = 600;
const COVER_IMAGE_SMALL = 420;
const coverImageSize =
  IS_IOS || IS_SMALL_VIEWPORT ? COVER_IMAGE_SMALL : COVER_IMAGE_DEFAULT;

function clearSafariNearClasses() {
  if (!dom.coverflowTrack) {
    return;
  }
  dom.coverflowTrack
    .querySelectorAll(".coverflow-item.is-near")
    .forEach((item) => item.classList.remove("is-near"));
}

function boostSafariWillChange() {
  if (!isSafari) {
    return;
  }
  safariWillChangeBoost = true;
  if (safariWillChangeTimer) {
    clearTimeout(safariWillChangeTimer);
  }
  safariWillChangeTimer = window.setTimeout(() => {
    safariWillChangeBoost = false;
    clearSafariNearClasses();
  }, SAFARI_WILL_CHANGE_TIMEOUT);
}

function kickSafari3D() {
  if (!isSafari || !dom.coverflowTrack) {
    return;
  }
  dom.coverflowTrack.classList.add("safari-3d-kick");
  dom.coverflowTrack.getBoundingClientRect();
  requestAnimationFrame(() => {
    dom.coverflowTrack.classList.remove("safari-3d-kick");
  });
}

function kickSafariPerspective() {
  if (!isSafari || !dom.coverflowStage) {
    return;
  }
  dom.coverflowStage.classList.add("safari-perspective-kick");
  dom.coverflowStage.getBoundingClientRect();
  requestAnimationFrame(() => {
    dom.coverflowStage.classList.remove("safari-perspective-kick");
  });
}

function createCoverflowItem(album, index) {
  const item = document.createElement("div");
  item.className = "coverflow-item";
  item.dataset.index = index.toString();
  item.dataset.albumId = album.Id;
  item.tabIndex = 0;
  item.setAttribute("role", "button");

  const card = document.createElement("div");
  card.className = "coverflow-card";

  const front = document.createElement("div");
  front.className = "coverflow-face coverflow-front";

  const media = document.createElement("div");
  media.className = "coverflow-media";

  const hasImage = album.ImageTags && album.ImageTags.Primary;
  if (hasImage) {
    const img = document.createElement("img");
    img.src = imageUrl(album.Id, coverImageSize);
    img.alt = albumTitle(album);
    img.loading = "lazy";
    img.decoding = "async";
    media.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = placeholderText(albumTitle(album));
    media.appendChild(placeholder);
  }
  front.appendChild(media);

  const back = document.createElement("div");
  back.className = "coverflow-face coverflow-back";

  const header = document.createElement("div");
  header.className = "coverflow-back-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "coverflow-back-title";
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = albumTitle(album);
  const subtitle = document.createElement("div");
  subtitle.className = "subtitle";
  subtitle.textContent = albumArtist(album);
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  header.appendChild(titleWrap);

  const body = document.createElement("div");
  body.className = "coverflow-back-body";
  const tracklist = document.createElement("div");
  tracklist.className = "tracklist";
  tracklist.innerHTML = '<div class="empty">Loading tracklist...</div>';
  body.appendChild(tracklist);

  back.appendChild(header);
  back.appendChild(body);

  card.appendChild(front);
  card.appendChild(back);
  item.appendChild(card);

  item.addEventListener("click", (event) => {
    if (event.target.closest(".coverflow-back")) {
      return;
    }
    if (state.openAlbumId && state.openAlbumId !== album.Id) {
      event.preventDefault();
      event.stopPropagation();
      closeOpenAlbum();
      return;
    }
    if (state.activeIndex !== index) {
      setActiveIndex(index);
      focusActiveCover();
      return;
    }
    toggleOpenAlbum(album.Id);
  });

  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (event.target !== item && event.target.closest(".coverflow-back")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      handleCoverClick(index);
    }
  });

  return item;
}

function renderCoverflow() {
  dom.coverflowTrack.innerHTML = "";
  state.albums.forEach((album, index) => {
    dom.coverflowTrack.appendChild(createCoverflowItem(album, index));
  });

  updateCoverflow();
  if (isSafari) {
    boostSafariWillChange();
    kickSafari3D();
    kickSafariPerspective();
    dom.coverflowTrack.getBoundingClientRect();
    requestAnimationFrame(() => {
      updateCoverflow();
      requestAnimationFrame(updateCoverflow);
    });
  }
}

function appendCoverflowItems(albums, offset) {
  albums.forEach((album, index) => {
    dom.coverflowTrack.appendChild(createCoverflowItem(album, offset + index));
  });
  updateCoverflow();
  if (isSafari) {
    boostSafariWillChange();
    kickSafari3D();
    kickSafariPerspective();
    dom.coverflowTrack.getBoundingClientRect();
    requestAnimationFrame(() => {
      updateCoverflow();
      requestAnimationFrame(updateCoverflow);
    });
  }
}

function getWindowFetchStart() {
  return Math.max(0, state.windowStartIndex - (state.windowOffset || 0));
}

function getWindowLength(startIndex) {
  if (!state.albumTotal) {
    return ALBUM_PAGE_LIMIT;
  }
  return Math.min(ALBUM_PAGE_LIMIT, Math.max(0, state.albumTotal - startIndex));
}

async function prefetchWindow(direction) {
  if (state.isLoadingAlbums || !state.windowed || !state.albumTotal) {
    return;
  }
  const fetchStart = getWindowFetchStart();
  const fetchEnd = fetchStart + state.albums.length;
  const loadToken = state.loadToken;
  const token = ++state.prefetchToken;
  if (direction === "ahead") {
    if (state.isPrefetchingAhead) {
      return;
    }
    const nextWindowStart = state.windowStartIndex + ALBUM_PAGE_LIMIT;
    if (nextWindowStart >= state.albumTotal) {
      return;
    }
    const desiredEnd = Math.min(
      state.albumTotal,
      nextWindowStart + getWindowLength(nextWindowStart)
    );
    if (fetchEnd >= desiredEnd) {
      return;
    }
    const start = fetchEnd;
    const limit = Math.min(ALBUM_PAGE_LIMIT, state.albumTotal - start);
    if (limit <= 0) {
      return;
    }
    state.isPrefetchingAhead = true;
    try {
      const data = await fetchAlbumsPage(start, limit);
      if (token !== state.prefetchToken || loadToken !== state.loadToken) {
        return;
      }
      const items = data.Items || [];
      if (!items.length) {
        return;
      }
      const offset = state.albums.length;
      state.albums.push(...items);
      appendCoverflowItems(items, offset);
      if (state.albums.length > MAX_LOADED_COUNT && state.activeIndex >= ALBUM_PAGE_LIMIT) {
        const fetchStart = getWindowFetchStart();
        const excess = state.albums.length - MAX_LOADED_COUNT;
        const trimCount = Math.min(ALBUM_PAGE_LIMIT, excess);
        state.albums = state.albums.slice(trimCount);
        state.activeIndex = Math.max(0, state.activeIndex - trimCount);
        state.windowOffset = state.windowStartIndex - (fetchStart + trimCount);
        renderCoverflow();
        if (state.openAlbumId) {
          ensureTracksForActive();
        }
      }
    } finally {
      if (token === state.prefetchToken) {
        state.isPrefetchingAhead = false;
      }
    }
    return;
  }
  if (state.isPrefetchingBehind) {
    return;
  }
  const prevWindowStart = state.windowStartIndex - ALBUM_PAGE_LIMIT;
  if (prevWindowStart < 0) {
    return;
  }
  if (fetchStart <= prevWindowStart) {
    return;
  }
  const start = Math.max(0, fetchStart - ALBUM_PAGE_LIMIT);
  const limit = Math.min(ALBUM_PAGE_LIMIT, fetchStart - start);
  if (limit <= 0) {
    return;
  }
  state.isPrefetchingBehind = true;
  try {
    const data = await fetchAlbumsPage(start, limit);
    if (token !== state.prefetchToken || loadToken !== state.loadToken) {
      return;
    }
    const items = data.Items || [];
    if (!items.length) {
      return;
    }
    state.albums = [...items, ...state.albums];
    state.activeIndex += items.length;
    state.windowOffset += items.length;
    if (state.albums.length > MAX_LOADED_COUNT) {
      state.albums = state.albums.slice(0, MAX_LOADED_COUNT);
    }
    renderCoverflow();
    if (state.openAlbumId) {
      ensureTracksForActive();
    }
  } finally {
    if (token === state.prefetchToken) {
      state.isPrefetchingBehind = false;
    }
  }
}

function maybePrefetchWindow() {
  if (!state.windowed || state.isLoadingAlbums || !state.albumTotal) {
    return;
  }
  const activeAbs = getWindowFetchStart() + state.activeIndex;
  const windowLength = getWindowLength(state.windowStartIndex);
  const windowStart = state.windowStartIndex;
  const windowEnd = windowStart + windowLength;
  if (activeAbs >= windowEnd - ALBUM_PREFETCH_THRESHOLD) {
    void prefetchWindow("ahead");
  }
  if (activeAbs <= windowStart + ALBUM_PREFETCH_THRESHOLD) {
    void prefetchWindow("behind");
  }
}

function updateAlbumCount() {
  if (state.windowed && state.albumTotal) {
    if (!state.albums.length) {
      dom.albumCount.textContent = `0 of ${state.albumTotal} albums`;
      return;
    }
    const windowLength = Math.min(
      ALBUM_PAGE_LIMIT,
      Math.max(0, state.albumTotal - state.windowStartIndex)
    );
    const start = Math.min(state.albumTotal, state.windowStartIndex + 1);
    const end = Math.min(state.albumTotal, state.windowStartIndex + windowLength);
    dom.albumCount.textContent = `${start}-${end} of ${state.albumTotal} albums`;
    return;
  }
  if (state.albumTotal && state.albums.length < state.albumTotal) {
    dom.albumCount.textContent = `${state.albums.length} of ${state.albumTotal} albums`;
    return;
  }
  dom.albumCount.textContent = `${state.albums.length} albums`;
}

function updateCoverflow() {
  const items = Array.from(dom.coverflowTrack.children);
  items.forEach((item, index) => {
    const offset = index - state.activeIndex;
    const absOffset = Math.abs(offset);
    const nearRange = isSafari ? 1 : 2;
    const shouldHintNear = absOffset <= nearRange && (!isSafari || safariWillChangeBoost);
    item.style.setProperty("--offset", offset.toString());
    item.style.setProperty("--abs", absOffset.toString());
    item.classList.toggle("is-active", index === state.activeIndex);
    item.classList.toggle("is-near", shouldHintNear);
    const albumId = item.dataset.albumId;
    const isOpen = albumId && albumId === state.openAlbumId;
    item.classList.toggle("is-open", isOpen);
    const allowReflection = absOffset <= 3 && (!IS_SMALL_VIEWPORT || IS_IOS);
    item.classList.toggle("with-reflection", allowReflection);
    item.style.zIndex = isOpen ? "200" : (100 - Math.abs(offset)).toString();
    item.style.opacity = Math.abs(offset) > 5 ? "0" : "1";
  });

  updateAlbumMeta();
  maybePrefetchWindow();
}

export function focusActiveCover() {
  const item = dom.coverflowTrack.children[state.activeIndex];
  if (item && document.activeElement !== item) {
    item.focus({ preventScroll: true });
  }
}

async function animateToIndex(targetIndex, options = {}) {
  if (!state.albums.length) {
    return;
  }
  const clampedTarget = Math.max(0, Math.min(state.albums.length - 1, targetIndex));
  if (clampedTarget === state.activeIndex) {
    focusActiveCover();
    return;
  }
  const maxSteps = Number.isFinite(options.maxSteps) ? options.maxSteps : 10;
  const stepDelay = Number.isFinite(options.stepDelay) ? options.stepDelay : 90;
  const diff = clampedTarget - state.activeIndex;
  const direction = diff > 0 ? 1 : -1;
  const totalSteps = Math.abs(diff);
  const steps = Math.min(totalSteps, maxSteps);
  if (totalSteps > maxSteps) {
    const jumpIndex = clampedTarget - direction * steps;
    setActiveIndex(jumpIndex);
  }
  const token = ++coverflowAnimationToken;
  return new Promise((resolve) => {
    const step = () => {
      if (token !== coverflowAnimationToken) {
        resolve();
        return;
      }
      setActiveIndex(state.activeIndex + direction);
      if (state.activeIndex === clampedTarget) {
        focusActiveCover();
        resolve();
        return;
      }
      setTimeout(step, stepDelay);
    };
    setTimeout(step, stepDelay);
  });
}

function updateAlbumMeta() {
  if (!state.albums.length) {
    dom.albumLine.textContent = state.serverUrl ? "No albums found" : "";
    updateAlbumCount();
    updateCoverflowEmpty();
    return;
  }
  const album = state.albums[state.activeIndex];
  const artist = albumArtist(album);
  const title = albumTitle(album);
  const line = [artist, title].filter(Boolean).join(" / ");
  dom.albumLine.textContent = line || "Unknown album";
  updateAlbumCount();
  updateCoverflowEmpty();
}

function updateCoverflowEmpty() {
  if (!dom.coverflowEmpty) {
    return;
  }
  const isConnected = Boolean(state.serverUrl && state.apiKey && state.userId);
  if (dom.connectSplashBtn) {
    dom.connectSplashBtn.hidden = isConnected;
  }
  const shouldShow = !state.albums.length;
  if (!shouldShow) {
    dom.coverflowEmpty.classList.remove("is-visible");
    dom.coverflowEmpty.classList.remove("is-brand");
    dom.coverflowEmpty.classList.remove("is-brand-only");
    return;
  }
  dom.coverflowEmpty.classList.add("is-brand");
  dom.coverflowEmpty.classList.add("is-brand-only");
  if (isConnected) {
    dom.coverflowEmptyIcon.textContent = "\u266a";
    if (state.isLoadingAlbums) {
      dom.coverflowEmptyTitle.textContent = "Loading albums";
      dom.coverflowEmptySub.textContent = "Fetching your Jellyfin library.";
    } else {
      dom.coverflowEmptyTitle.textContent = "No albums found";
      dom.coverflowEmptySub.textContent = "Check your Jellyfin library settings.";
    }
  } else {
    dom.coverflowEmptyIcon.textContent = "\u2699";
    dom.coverflowEmptyTitle.textContent = "";
    dom.coverflowEmptySub.textContent = "";
  }
  dom.coverflowEmpty.classList.add("is-visible");
}

export function setActiveIndex(index) {
  if (!state.albums.length) {
    return;
  }
  const clamped = Math.max(0, Math.min(state.albums.length - 1, index));
  const didChange = state.activeIndex !== clamped;
  if (didChange) {
    state.openAlbumId = null;
    state.trackFocusIndex = null;
    state.trackFocusAlbumId = null;
    state.jumpToken += 1;
    boostSafariWillChange();
  }
  state.activeIndex = clamped;
  if (state.windowed && state.albumTotal) {
    const fetchStart = getWindowFetchStart();
    const activeAbs = fetchStart + state.activeIndex;
    const maxStart = Math.max(0, state.albumTotal - ALBUM_PAGE_LIMIT);
    const desiredStart = Math.min(
      maxStart,
      Math.floor(activeAbs / ALBUM_PAGE_LIMIT) * ALBUM_PAGE_LIMIT
    );
    const windowLength = getWindowLength(desiredStart);
    const fetchEnd = fetchStart + state.albums.length;
    if (fetchStart <= desiredStart && fetchEnd >= desiredStart + windowLength) {
      state.windowStartIndex = desiredStart;
      state.windowOffset = state.windowStartIndex - fetchStart;
    }
  }
  updateCoverflow();
  ensureTracksForActive();
}

export function moveActiveIndex(direction) {
  if (!state.albums.length) {
    return;
  }
  if (!state.windowed) {
    setActiveIndex(state.activeIndex + direction);
    focusActiveCover();
    return;
  }
  const fetchStart = getWindowFetchStart();
  const currentAbs = fetchStart + state.activeIndex;
  const nextIndex = state.activeIndex + direction;
  if (nextIndex < 0) {
    if (fetchStart > 0) {
      void shiftAlbumWindow(-1, currentAbs - 1);
      return;
    }
    setActiveIndex(0);
    focusActiveCover();
    return;
  }
  if (nextIndex >= state.albums.length) {
    const endIndex = fetchStart + state.albums.length;
    if (state.albumTotal && endIndex < state.albumTotal) {
      void shiftAlbumWindow(1, currentAbs + 1);
      return;
    }
    setActiveIndex(state.albums.length - 1);
    focusActiveCover();
    return;
  }
  setActiveIndex(nextIndex);
  focusActiveCover();
}

async function shiftAlbumWindow(direction, targetAbsIndex) {
  if (state.isLoadingAlbums) {
    return;
  }
  const total = state.albumTotal || 0;
  if (!total) {
    return;
  }
  const maxStart = Math.max(0, total - ALBUM_PAGE_LIMIT);
  const start =
    direction > 0
      ? Math.min(maxStart, state.windowStartIndex + ALBUM_PAGE_LIMIT)
      : Math.max(0, state.windowStartIndex - ALBUM_PAGE_LIMIT);
  await loadAlbumWindow(start, 0, null, targetAbsIndex);
  focusActiveCover();
}

async function loadAlbumWindow(startIndex, focusIndex = 0, guard = null, focusAbsIndex = null) {
  const token = ++state.loadToken;
  state.isLoadingAlbums = true;
  state.openAlbumId = null;
  state.trackFocusIndex = null;
  state.trackFocusAlbumId = null;
  try {
    const fetchStart = Math.max(0, startIndex - ALBUM_WINDOW_BUFFER);
    const limit = ALBUM_PAGE_LIMIT * 2 + ALBUM_WINDOW_BUFFER * 2;
    const data = await fetchAlbumsPage(fetchStart, limit);
    if (token !== state.loadToken) {
      return;
    }
    if (guard?.type === "typeahead" && guard.token !== state.typeaheadLookupToken) {
      return;
    }
    if (guard?.type === "jump" && guard.token !== state.jumpToken) {
      return;
    }
    const items = data.Items || [];
    state.albums = items;
    state.albumTotal = data.TotalRecordCount || state.albumTotal;
    state.windowed = true;
    state.windowStartIndex = startIndex;
    state.windowOffset = startIndex - fetchStart;
    if (focusAbsIndex != null) {
      const localIndex = focusAbsIndex - fetchStart;
      state.activeIndex = Math.max(0, Math.min(items.length - 1, localIndex));
    } else {
      const localIndex = focusIndex + state.windowOffset;
      state.activeIndex = Math.max(0, Math.min(items.length - 1, localIndex));
    }
    boostSafariWillChange();
    renderCoverflow();
  } catch (error) {
    if (state.albums.length) {
      setStatus(`Loaded ${state.albums.length} albums`, "ok");
    } else {
      setStatus("Albums failed to load", "warn");
    }
  } finally {
    if (token === state.loadToken) {
      state.isLoadingAlbums = false;
      void prefetchWindow("ahead");
      void prefetchWindow("behind");
      maybePrefetchWindow();
    }
  }
}

function maybeApplyTypeahead() {
  if (!state.typeaheadQuery || state.openAlbumId) {
    return;
  }
  const found = jumpToArtistPrefix(state.typeaheadQuery);
  if (found) {
    clearTypeaheadLookup();
  } else if (shouldUseServerLookup()) {
    scheduleTypeaheadLookup(state.typeaheadQuery);
  }
}

async function ensureTracksForActive() {
  const album = state.albums[state.activeIndex];
  if (!album) {
    return;
  }
  if (state.openAlbumId !== album.Id) {
    return;
  }
  if (state.tracksByAlbum.has(album.Id)) {
    renderTrackList(album, state.tracksByAlbum.get(album.Id));
    return;
  }

  const tracklist = getTrackListContainer(album.Id);
  if (tracklist) {
    tracklist.innerHTML = '<div class="empty">Loading tracks...</div>';
  }
  try {
    const data = await fetchJson(
      `/Users/${state.userId}/Items?ParentId=${album.Id}&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&Fields=RunTimeTicks,IndexNumber,Genres,Artists,AlbumArtist,Album`
    );
    const tracks = data.Items || [];
    state.tracksByAlbum.set(album.Id, tracks);
    renderTrackList(album, tracks);
  } catch (error) {
    if (tracklist) {
      tracklist.innerHTML = '<div class="empty">Unable to load tracks</div>';
    }
  }
}

function renderTrackList(album, tracks) {
  const tracklist = getTrackListContainer(album.Id);
  if (!tracklist) {
    return;
  }
  tracklist.innerHTML = "";
  if (!tracks.length) {
    tracklist.innerHTML = '<div class="empty">No tracks for this album</div>';
    return;
  }
  tracks.forEach((track, index) => {
    const durationText = formatRuntime(track.RunTimeTicks);
    const isFavorite = Boolean(track?.UserData?.IsFavorite);
    const button = createTrackButton({
      number: (track.IndexNumber || index + 1).toString(),
      title: track.Name || "Untitled",
      meta: durationText,
      duration: durationText,
      isFavorite,
      dataset: { trackId: track.Id },
      onClick: (event) => {
        event.stopPropagation();
        playTrack(album, track, index);
      },
      onFocus: () => {
        state.trackFocusIndex = index;
        state.trackFocusAlbumId = album.Id;
      },
    });
    tracklist.appendChild(button);
  });

  syncTrackHighlights();
}

export function syncTrackHighlights() {
  if (!state.openAlbumId) {
    return;
  }
  const tracklist = getTrackListContainer(state.openAlbumId);
  if (!tracklist) {
    return;
  }
  const trackButtons = tracklist.querySelectorAll(".track");
  trackButtons.forEach((button) => {
    const isPlaying =
      state.nowPlaying &&
      button.dataset.trackId === state.nowPlaying.trackId;
    button.classList.toggle("is-playing", Boolean(isPlaying));
  });
}

export async function loadAlbumsPaginated() {
  resetLibraryState();
  setStatus("Loading albums...", "info");
  await loadAlbumWindow(0, 0);
  if (state.albums.length) {
    setStatus("Connected", "ok");
    updateNowPlayingIdle();
  }
}

function resetLibraryState() {
  state.albums = [];
  state.activeIndex = 0;
  state.albumTotal = 0;
  state.windowed = false;
  state.windowStartIndex = 0;
  state.windowOffset = 0;
  state.prefetchToken += 1;
  state.isPrefetchingAhead = false;
  state.isPrefetchingBehind = false;
  state.openAlbumId = null;
  state.currentTrack = null;
  state.currentAlbum = null;
  state.tracksByAlbum.clear();
  clearTypeahead();
  renderCoverflow();
  updateAlbumMeta();
  resetLyricsPanel();
}

export function handleCoverClick(index) {
  const album = state.albums[index];
  if (!album) {
    return;
  }
  if (state.activeIndex !== index) {
    setActiveIndex(index);
    focusActiveCover();
    return;
  }
  toggleOpenAlbum(album.Id);
}

export function toggleOpenForActive() {
  const album = state.albums[state.activeIndex];
  if (!album) {
    return;
  }
  toggleOpenAlbum(album.Id);
}

export function toggleOpenAlbum(albumId) {
  if (state.openAlbumId === albumId) {
    closeOpenAlbum();
    return;
  }
  state.openAlbumId = albumId;
  state.trackFocusIndex = null;
  state.trackFocusAlbumId = albumId;
  clearTypeahead();
  updateCoverflow();
  ensureTracksForActive();
}

export function closeOpenAlbum() {
  state.openAlbumId = null;
  state.trackFocusIndex = null;
  state.trackFocusAlbumId = null;
  clearTypeahead();
  updateCoverflow();
}

function getTrackListContainer(albumId) {
  if (!albumId) {
    return null;
  }
  const item = dom.coverflowTrack.querySelector(`[data-album-id="${albumId}"]`);
  if (!item) {
    return null;
  }
  return item.querySelector(".tracklist");
}

export function getOpenTrackButtons() {
  if (!state.openAlbumId) {
    return [];
  }
  const tracklist = getTrackListContainer(state.openAlbumId);
  if (!tracklist) {
    return [];
  }
  return Array.from(tracklist.querySelectorAll(".track"));
}

function focusTrackButton(button) {
  if (!button) {
    return;
  }
  button.focus({ preventScroll: true });
  button.scrollIntoView({ block: "nearest" });
}

export function focusTrackByDelta(delta) {
  const buttons = getOpenTrackButtons();
  if (!buttons.length) {
    return false;
  }
  const active = document.activeElement;
  let index = buttons.findIndex((button) => button === active);
  if (index === -1) {
    if (state.nowPlaying && state.nowPlaying.albumId === state.openAlbumId) {
      index = buttons.findIndex((button) => button.dataset.trackId === state.nowPlaying.trackId);
    }
    if (index === -1) {
      index = delta > 0 ? 0 : buttons.length - 1;
    }
  } else {
    index = Math.max(0, Math.min(buttons.length - 1, index + delta));
  }
  focusTrackButton(buttons[index]);
  state.trackFocusIndex = index;
  state.trackFocusAlbumId = state.openAlbumId;
  return true;
}

export function clearTypeahead() {
  if (state.typeaheadTimer) {
    clearTimeout(state.typeaheadTimer);
  }
  state.typeaheadTimer = null;
  state.typeaheadQuery = "";
  clearTypeaheadLookup();
  if (dom.typeahead) {
    dom.typeahead.textContent = "";
    dom.typeahead.classList.remove("is-active");
  }
}

export function clearTypeaheadLookup() {
  if (state.typeaheadLookupTimer) {
    clearTimeout(state.typeaheadLookupTimer);
  }
  state.typeaheadLookupTimer = null;
  state.typeaheadLookupQuery = "";
  state.typeaheadLookupToken += 1;
}

export function scheduleTypeaheadClear() {
  if (state.typeaheadTimer) {
    clearTimeout(state.typeaheadTimer);
  }
  state.typeaheadTimer = window.setTimeout(() => {
    clearTypeahead();
  }, 3000);
}

export function showTypeahead() {
  if (!dom.typeahead) {
    return;
  }
  dom.typeahead.textContent = state.typeaheadQuery.toUpperCase();
  if (state.typeaheadQuery) {
    dom.typeahead.classList.add("is-active");
  } else {
    dom.typeahead.classList.remove("is-active");
  }
}

export function jumpToArtistPrefix(query) {
  const lookup = normalizeTypeaheadQuery(query);
  if (!lookup) {
    return false;
  }
  const index = findArtistPrefixIndex(lookup);
  if (index === -1) {
    return false;
  }
  setActiveIndex(index);
  focusActiveCover();
  return true;
}

export function normalizeTypeaheadQuery(query) {
  return query.replace(/\s+/g, " ").trimStart();
}

function findArtistPrefixIndex(query) {
  const lookup = query.toLowerCase();
  let low = 0;
  let high = state.albums.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const artist = albumArtist(state.albums[mid]).toLowerCase();
    if (artist < lookup) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (low < state.albums.length) {
    const artist = albumArtist(state.albums[low]).toLowerCase();
    if (artist.startsWith(lookup)) {
      return low;
    }
  }
  return -1;
}

export function shouldUseServerLookup() {
  if (state.windowed) {
    return true;
  }
  if (!state.albumTotal) {
    return true;
  }
  return state.albums.length < state.albumTotal;
}

export function scheduleTypeaheadLookup(query) {
  if (!state.serverUrl || !state.apiKey || !state.userId) {
    return;
  }
  clearTypeaheadLookup();
  state.typeaheadLookupQuery = query;
  const token = ++state.typeaheadLookupToken;
  state.typeaheadLookupTimer = window.setTimeout(() => {
    void runTypeaheadLookup(query, token);
  }, TYPEAHEAD_LOOKUP_DELAY);
}

async function runTypeaheadLookup(query, token) {
  const lookup = normalizeTypeaheadQuery(query);
  if (!lookup) {
    return;
  }
  const index = await findArtistIndexOnServer(lookup, token);
  if (token !== state.typeaheadLookupToken) {
    return;
  }
  if (index === -1) {
    return;
  }
  const maxStart = Math.max(0, (state.albumTotal || 0) - ALBUM_PAGE_LIMIT);
  const startIndex = Math.max(
    0,
    Math.min(maxStart, index - Math.floor(ALBUM_PAGE_LIMIT / 2))
  );
  const focusIndex = index - startIndex;
  await loadAlbumWindow(startIndex, focusIndex, { type: "typeahead", token });
  if (token === state.typeaheadLookupToken) {
    focusActiveCover();
  }
}

async function fetchAlbumAtIndex(index) {
  if (index < 0) {
    return null;
  }
  if (state.windowed) {
    const fetchStart = getWindowFetchStart();
    const localIndex = index - fetchStart;
    if (localIndex >= 0 && localIndex < state.albums.length) {
      return state.albums[localIndex];
    }
  } else if (index >= 0 && index < state.albums.length) {
    return state.albums[index];
  }
  const data = await fetchAlbumsPage(index, 1);
  return data.Items?.[0] || null;
}

async function findArtistIndexOnServer(query, token) {
  let total = state.albumTotal;
  if (!total) {
    const data = await fetchAlbumsPage(0, 1);
    if (token !== state.typeaheadLookupToken) {
      return -1;
    }
    total = data.TotalRecordCount || 0;
    state.albumTotal = total;
  }
  if (!total) {
    return -1;
  }
  const lookup = query.toLowerCase();
  let low = 0;
  let high = total - 1;
  let candidate = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const album = await fetchAlbumAtIndex(mid);
    if (token !== state.typeaheadLookupToken) {
      return -1;
    }
    const artist = album ? albumArtist(album).toLowerCase() : "";
    if (artist < lookup) {
      low = mid + 1;
    } else {
      candidate = mid;
      high = mid - 1;
    }
  }
  if (candidate === -1) {
    return -1;
  }
  const album = await fetchAlbumAtIndex(candidate);
  if (token !== state.typeaheadLookupToken) {
    return -1;
  }
  if (album && albumArtist(album).toLowerCase().startsWith(lookup)) {
    return candidate;
  }
  return -1;
}

async function findAlbumIndexByKeyOnServer(targetKey, token) {
  let total = state.albumTotal;
  if (!total) {
    const data = await fetchAlbumsPage(0, 1);
    if (token !== state.jumpToken) {
      return -1;
    }
    total = data.TotalRecordCount || 0;
    state.albumTotal = total;
  }
  if (!total) {
    return -1;
  }
  let low = 0;
  let high = total - 1;
  let candidate = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const album = await fetchAlbumAtIndex(mid);
    if (token !== state.jumpToken) {
      return -1;
    }
    const albumKey = albumSortKey(album);
    const comparison = compareAlbumKeys(albumKey, targetKey);
    if (comparison < 0) {
      low = mid + 1;
    } else {
      candidate = mid;
      high = mid - 1;
    }
  }
  return candidate;
}

async function loadAlbumWindowAndFocusById(startIndex, albumId, token, options = {}) {
  await loadAlbumWindow(startIndex, 0, { type: "jump", token });
  if (token !== state.jumpToken) {
    return false;
  }
  const localIndex = state.albums.findIndex((album) => album.Id === albumId);
  if (localIndex === -1) {
    return false;
  }
  if (options.animate) {
    await animateToIndex(localIndex, options.animateOptions);
    return true;
  }
  setActiveIndex(localIndex);
  focusActiveCover();
  return true;
}

export async function shufflePlay() {
  if (!state.serverUrl || !state.apiKey || !state.userId) {
    setStatus("Connect to shuffle", "warn");
    return;
  }
  let total = state.albumTotal;
  if (!total) {
    try {
      const data = await fetchAlbumsPage(0, 1);
      total = data.TotalRecordCount || 0;
      state.albumTotal = total;
    } catch (error) {
      setStatus("Shuffle failed", "warn");
      return;
    }
  }
  if (!total) {
    setStatus("No albums found", "warn");
    return;
  }
  const maxAttempts = Math.min(6, total);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const randomIndex = Math.floor(Math.random() * total);
    const album = await fetchAlbumAtIndex(randomIndex);
    if (!album) {
      continue;
    }
    let tracks = state.tracksByAlbum.get(album.Id);
    if (!tracks) {
      try {
    const data = await fetchJson(
      `/Users/${state.userId}/Items?ParentId=${album.Id}&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&Fields=RunTimeTicks,IndexNumber,Genres,Artists,AlbumArtist,Album,UserData`
    );
        tracks = data.Items || [];
        state.tracksByAlbum.set(album.Id, tracks);
      } catch (error) {
        continue;
      }
    }
    if (!tracks.length) {
      continue;
    }
    const trackIndex = Math.floor(Math.random() * tracks.length);
    playTrack(album, tracks[trackIndex], trackIndex);
    void jumpToAlbumById(album.Id, { animate: true });
    return;
  }
  setStatus("Shuffle found no tracks", "warn");
}

export async function jumpToAlbumById(albumId, options = {}) {
  if (!albumId || !state.serverUrl || !state.apiKey || !state.userId) {
    return;
  }
  const animate = Boolean(options.animate);
  if (state.openAlbumId) {
    closeOpenAlbum();
  }
  clearTypeahead();
  const localIndex = state.albums.findIndex((album) => album.Id === albumId);
  if (localIndex !== -1) {
    if (animate) {
      await animateToIndex(localIndex, options.animateOptions);
    } else {
      setActiveIndex(localIndex);
      focusActiveCover();
    }
    return;
  }
  const token = ++state.jumpToken;
  try {
    const album = await fetchJson(`/Items/${albumId}`);
    if (token !== state.jumpToken) {
      return;
    }
    const targetKey = albumSortKey(album);
    const baseIndex = await findAlbumIndexByKeyOnServer(targetKey, token);
    if (token !== state.jumpToken || baseIndex === -1) {
      return;
    }
    const total = state.albumTotal || 0;
    const maxStart = Math.max(0, total - ALBUM_PAGE_LIMIT);
    const half = Math.floor(ALBUM_PAGE_LIMIT / 2);
    const centeredStart = Math.max(0, Math.min(maxStart, baseIndex - half));
    const foundCentered = await loadAlbumWindowAndFocusById(centeredStart, albumId, token, {
      animate,
      animateOptions: options.animateOptions,
    });
    if (token !== state.jumpToken || foundCentered) {
      return;
    }
    const startAtBase = Math.max(0, Math.min(maxStart, baseIndex));
    const foundAtBase = await loadAlbumWindowAndFocusById(startAtBase, albumId, token, {
      animate,
      animateOptions: options.animateOptions,
    });
    if (token !== state.jumpToken) {
      return;
    }
    if (!foundAtBase && state.albums.length) {
      const fetchStart = getWindowFetchStart();
      const fallbackIndex = Math.max(
        0,
        Math.min(state.albums.length - 1, baseIndex - fetchStart)
      );
      setActiveIndex(fallbackIndex);
      focusActiveCover();
    }
  } catch (error) {
    if (token === state.jumpToken) {
      setStatus("Could not jump to album", "warn");
    }
  }
}
