const state = {
  serverUrl: "",
  apiKey: "",
  userId: "",
  albums: [],
  activeIndex: 0,
  albumTotal: 0,
  windowed: false,
  windowStartIndex: 0,
  isLoadingAlbums: false,
  loadToken: 0,
  openAlbumId: null,
  trackFocusIndex: null,
  trackFocusAlbumId: null,
  typeaheadQuery: "",
  typeaheadTimer: null,
  typeaheadLookupTimer: null,
  typeaheadLookupToken: 0,
  typeaheadLookupQuery: "",
  jumpToken: 0,
  lyrics: {
    trackId: null,
    lines: [],
    mode: "none",
    activeIndex: -1,
    pendingLines: null,
  },
  lyricsToken: 0,
  lyricsLineEls: [],
  currentTrack: null,
  currentAlbum: null,
  lyricsOnline: true,
  tracksByAlbum: new Map(),
  nowPlaying: null,
};

const dom = {
  status: document.getElementById("status"),
  openSettings: document.getElementById("openSettings"),
  settingsDialog: document.getElementById("settingsDialog"),
  closeSettings: document.getElementById("closeSettings"),
  serverUrlInput: document.getElementById("serverUrlInput"),
  usernameInput: document.getElementById("usernameInput"),
  passwordInput: document.getElementById("passwordInput"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  userSelect: document.getElementById("userSelect"),
  userIdInput: document.getElementById("userIdInput"),
  lyricsToggle: document.getElementById("lyricsToggle"),
  rememberToggle: document.getElementById("rememberToggle"),
  loadUsersBtn: document.getElementById("loadUsersBtn"),
  connectBtn: document.getElementById("connectBtn"),
  resetBtn: document.getElementById("resetBtn"),
  themeToggle: document.getElementById("themeToggle"),
  coverflowTrack: document.getElementById("coverflowTrack"),
  coverflowEmpty: document.getElementById("coverflowEmpty"),
  coverflowEmptyIcon: document.getElementById("coverflowEmptyIcon"),
  coverflowEmptyTitle: document.getElementById("coverflowEmptyTitle"),
  coverflowEmptySub: document.getElementById("coverflowEmptySub"),
  coverflowSection: document.getElementById("coverflowSection"),
  albumMeta: document.getElementById("albumMeta"),
  albumLine: document.getElementById("albumLine"),
  albumCount: document.getElementById("albumCount"),
  lyricsPanel: document.getElementById("lyricsPanel"),
  lyricsPaneToggle: document.getElementById("lyricsPaneToggle"),
  lyricsStatus: document.getElementById("lyricsStatus"),
  lyricsViewport: document.getElementById("lyricsViewport"),
  lyricsTrack: document.getElementById("lyricsTrack"),
  nowCover: document.getElementById("nowCover"),
  nowTitle: document.getElementById("nowTitle"),
  nowSub: document.getElementById("nowSub"),
  audio: document.getElementById("audio"),
  typeahead: document.getElementById("typeahead"),
  cornerControls: document.getElementById("cornerControls"),
};

const ALBUM_PAGE_LIMIT = 120;
const TYPEAHEAD_LOOKUP_DELAY = 250;

function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

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

function setStatus(text, tone = "idle") {
  dom.status.textContent = text;
  dom.status.dataset.tone = tone;
}

function rememberSettings() {
  const payload = {
    serverUrl: dom.serverUrlInput.value.trim(),
    username: dom.usernameInput.value.trim(),
    apiKey: dom.apiKeyInput.value.trim(),
    userId: dom.userIdInput.value.trim(),
  };
  localStorage.setItem("jellyflow-settings", JSON.stringify(payload));
}

function savePreferences() {
  const payload = {
    lyricsOnline: dom.lyricsToggle.checked,
  };
  localStorage.setItem("jellyflow-preferences", JSON.stringify(payload));
}

function clearSettings() {
  localStorage.removeItem("jellyflow-settings");
  localStorage.removeItem("echoflow-settings");
}

function loadSettings() {
  const raw = localStorage.getItem("jellyflow-settings");
  const legacy = raw ? null : localStorage.getItem("echoflow-settings");
  const source = raw || legacy;
  if (!source) {
    return;
  }
  try {
    const saved = JSON.parse(source);
    dom.serverUrlInput.value = saved.serverUrl || "";
    dom.usernameInput.value = saved.username || "";
    dom.apiKeyInput.value = saved.apiKey || "";
    dom.userIdInput.value = saved.userId || "";
    if (!raw) {
      localStorage.setItem("jellyflow-settings", JSON.stringify(saved));
    }
  } catch (error) {
    clearSettings();
  }
}

function loadPreferences() {
  const raw = localStorage.getItem("jellyflow-preferences");
  const legacy = raw ? null : localStorage.getItem("echoflow-preferences");
  const source = raw || legacy;
  if (!source) {
    dom.lyricsToggle.checked = true;
    state.lyricsOnline = true;
    return;
  }
  try {
    const saved = JSON.parse(source);
    const enabled = saved.lyricsOnline !== false;
    dom.lyricsToggle.checked = enabled;
    state.lyricsOnline = enabled;
    if (!raw) {
      localStorage.setItem("jellyflow-preferences", JSON.stringify(saved));
    }
  } catch (error) {
    dom.lyricsToggle.checked = true;
    state.lyricsOnline = true;
  }
}

function applyTheme(theme, persist = true) {
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  dom.themeToggle.classList.toggle("is-active", isDark);
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  dom.themeToggle.textContent = isDark ? "\u2600" : "\u263e";
  dom.themeToggle.setAttribute("aria-label", label);
  dom.themeToggle.title = label;
  if (persist) {
    localStorage.setItem("jellyflow-theme", theme);
  }
}

function initTheme() {
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

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Emby-Token": state.apiKey,
  };
}

async function authenticateByName(serverUrl, username, password) {
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

async function fetchJson(path) {
  const response = await fetch(`${state.serverUrl}${path}`, {
    headers: headers(),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json();
}

function imageUrl(itemId, size) {
  return `${state.serverUrl}/Items/${itemId}/Images/Primary?fillWidth=${size}&fillHeight=${size}&quality=90&api_key=${state.apiKey}`;
}

function streamUrl(itemId) {
  return `${state.serverUrl}/Audio/${itemId}/stream?static=true&api_key=${state.apiKey}`;
}

function buildStreamUrlForTrack(track) {
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

function albumItemsPath(startIndex, limit) {
  return `/Users/${state.userId}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=AlbumArtist,SortName&SortOrder=Ascending&Fields=PrimaryImageAspectRatio,ImageTags,AlbumArtist,Artists,SortName&Limit=${limit}&StartIndex=${startIndex}`;
}

async function fetchAlbumsPage(startIndex, limit) {
  return fetchJson(albumItemsPath(startIndex, limit));
}

function albumArtist(album) {
  if (album.AlbumArtist) {
    const clean = album.AlbumArtist.toString().trim();
    if (clean) {
      return clean;
    }
  }
  if (Array.isArray(album.Artists) && album.Artists.length) {
    const joined = album.Artists.join(", ").trim();
    if (joined) {
      return joined;
    }
  }
  return "Unknown artist";
}

function albumSortKey(album) {
  const artist =
    album?.AlbumArtist ||
    (Array.isArray(album?.Artists) && album.Artists.length ? album.Artists[0] : "") ||
    "";
  const title = album?.SortName || album?.Name || "";
  return {
    artist: artist.toString(),
    title: title.toString(),
  };
}

function compareAlbumKeys(left, right) {
  const artistLeft = left.artist.toLowerCase();
  const artistRight = right.artist.toLowerCase();
  if (artistLeft < artistRight) {
    return -1;
  }
  if (artistLeft > artistRight) {
    return 1;
  }
  const titleLeft = left.title.toLowerCase();
  const titleRight = right.title.toLowerCase();
  if (titleLeft < titleRight) {
    return -1;
  }
  if (titleLeft > titleRight) {
    return 1;
  }
  return 0;
}

function albumTitle(album) {
  if (album && typeof album.Name === "string") {
    const clean = album.Name.trim();
    if (clean) {
      return clean;
    }
  }
  return "Untitled";
}

function formatRuntime(ticks) {
  if (!ticks) {
    return "--:--";
  }
  const totalSeconds = Math.floor(ticks / 10000000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ticksToSeconds(ticks) {
  return Number(ticks) / 10000000;
}

function parseTimeToSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (!value) {
    return null;
  }
  const text = value.toString().trim();
  const match = text.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const fraction = match[4] ? Number(`0.${match[4]}`) : 0;
  if (![hours, minutes, seconds, fraction].every(Number.isFinite)) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds + fraction;
}

function normalizeStartValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  if (number > 100000) {
    return ticksToSeconds(number);
  }
  return number;
}

function parseLrc(text) {
  const lines = [];
  let hasTimestamps = false;
  const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?]/g;

  text.split(/\r?\n/).forEach((line) => {
    const times = [];
    let match;
    while ((match = timeTag.exec(line)) !== null) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
      if (Number.isFinite(minutes) && Number.isFinite(seconds) && Number.isFinite(fraction)) {
        times.push(minutes * 60 + seconds + fraction);
      }
    }
    timeTag.lastIndex = 0;
    const content = line.replace(timeTag, "").trim();
    if (times.length) {
      hasTimestamps = true;
      if (content) {
        times.forEach((time) => {
          lines.push({ time, text: content });
        });
      }
      return;
    }
    if (content) {
      lines.push({ time: null, text: content });
    }
  });

  return { lines, hasTimestamps };
}

function parseLyricsObject(payload) {
  if (Array.isArray(payload)) {
    return parseLyricsObject({ Lyrics: payload });
  }
  if (payload && Array.isArray(payload.Lyrics)) {
    const lines = payload.Lyrics.map((line) => {
      const text = (line.Text || line.text || "").toString().trim();
      if (!text) {
        return null;
      }
      let time = null;
      if (line.StartTicks != null) {
        time = ticksToSeconds(line.StartTicks);
      } else if (line.Start != null) {
        time = normalizeStartValue(line.Start);
      } else if (line.StartTime != null) {
        time = parseTimeToSeconds(line.StartTime);
      }
      if (time == null) {
        return null;
      }
      return { time, text };
    }).filter(Boolean);
    return { lines, hasTimestamps: true };
  }
  if (payload && typeof payload.Lyrics === "string") {
    return parseLrc(payload.Lyrics);
  }
  if (payload && typeof payload.Text === "string") {
    return parseLrc(payload.Text);
  }
  return { lines: [], hasTimestamps: false };
}

function parseLyricsPayload(payload) {
  if (!payload) {
    return { lines: [], hasTimestamps: false };
  }
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return parseLyricsObject(parsed);
    } catch (error) {
      return parseLrc(payload);
    }
  }
  if (typeof payload === "object") {
    return parseLyricsObject(payload);
  }
  return { lines: [], hasTimestamps: false };
}

const lyricsCache = new Map();
const LYRICS_CACHE_LIMIT = 120;

function makeLyricsCacheKey(track, album) {
  if (!track) {
    return null;
  }
  const artist = track.AlbumArtist || (Array.isArray(track.Artists) ? track.Artists[0] : "");
  const albumName = track.Album || (album ? albumTitle(album) : "");
  return `${track.Id || ""}|${track.Name || ""}|${artist || ""}|${albumName || ""}`.toLowerCase();
}

function cacheLyrics(key, payload) {
  if (!key || !payload) {
    return;
  }
  if (lyricsCache.has(key)) {
    lyricsCache.delete(key);
  }
  lyricsCache.set(key, payload);
  if (lyricsCache.size > LYRICS_CACHE_LIMIT) {
    const firstKey = lyricsCache.keys().next().value;
    lyricsCache.delete(firstKey);
  }
}

function getCachedLyrics(key) {
  if (!key || !lyricsCache.has(key)) {
    return null;
  }
  const payload = lyricsCache.get(key);
  lyricsCache.delete(key);
  lyricsCache.set(key, payload);
  return payload;
}

async function fetchLyricsFromLrclib(track, album) {
  const title = track?.Name ? track.Name.trim() : "";
  const artist =
    track?.AlbumArtist ||
    (Array.isArray(track?.Artists) && track.Artists.length ? track.Artists[0] : "") ||
    (album ? albumArtist(album) : "");
  if (!title || !artist) {
    return null;
  }
  const albumName = track?.Album || (album ? albumTitle(album) : "");
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
  });
  if (albumName) {
    params.set("album_name", albumName);
  }

  let response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
  if (response.status === 404) {
    const searchParams = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    response = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`);
  }

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data[0] || null;
  }
  return data;
}

function getTrackDurationSeconds(track) {
  if (track && track.RunTimeTicks) {
    return ticksToSeconds(track.RunTimeTicks);
  }
  if (Number.isFinite(dom.audio.duration) && dom.audio.duration > 0) {
    return dom.audio.duration;
  }
  return null;
}

function applyEstimatedTimings(lines, duration) {
  if (!lines.length || !duration) {
    return lines.map((line) => ({ time: null, text: line.text }));
  }
  const step = duration / Math.max(lines.length, 1);
  return lines.map((line, index) => ({
    time: Math.max(0, index * step),
    text: line.text,
  }));
}

function renderLyricsPlaceholder(message) {
  dom.lyricsTrack.style.transform = "translateY(0)";
  dom.lyricsTrack.innerHTML = "";
  const line = document.createElement("div");
  line.className = "lyrics-line is-active";
  line.textContent = message;
  dom.lyricsTrack.appendChild(line);
  state.lyricsLineEls = [line];
  state.lyrics.activeIndex = 0;
}

function updateLyricsStatus(message) {
  dom.lyricsStatus.textContent = message;
}

function resetLyricsPanel() {
  state.lyrics = {
    trackId: null,
    lines: [],
    mode: "none",
    activeIndex: -1,
    pendingLines: null,
  };
  state.lyricsLineEls = [];
  updateLyricsStatus("No track playing");
  renderLyricsPlaceholder("Start playing a track to see lyrics.");
}

function setLyricsLines(lines, mode, pendingLines = null, statusLabel = null) {
  state.lyrics.lines = lines;
  state.lyrics.mode = mode;
  state.lyrics.activeIndex = -1;
  state.lyrics.pendingLines = pendingLines;
  dom.lyricsTrack.style.transform = "translateY(0)";
  dom.lyricsTrack.innerHTML = "";

  if (!lines.length) {
    renderLyricsPlaceholder("No lyrics available");
    updateLyricsStatus(statusLabel || "No lyrics found");
    return;
  }

  lines.forEach((line) => {
    const div = document.createElement("div");
    div.className = "lyrics-line";
    div.textContent = line.text;
    dom.lyricsTrack.appendChild(div);
  });
  state.lyricsLineEls = Array.from(dom.lyricsTrack.children);
  if (mode === "static" && state.lyricsLineEls[0]) {
    state.lyricsLineEls[0].classList.add("is-active");
    state.lyrics.activeIndex = 0;
  }
  if (mode === "timed") {
    updateLyricsStatus(statusLabel || "Synced lyrics");
  } else if (mode === "estimated") {
    updateLyricsStatus(statusLabel || "Estimated timing");
  } else {
    updateLyricsStatus(statusLabel || "Lyrics");
  }
  syncLyrics(true);
}

function findActiveLyricIndex(lines, time) {
  if (!lines.length) {
    return -1;
  }
  let low = 0;
  let high = lines.length - 1;
  let result = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].time <= time) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

function syncLyrics(force = false) {
  if (!state.lyrics.lines.length) {
    return;
  }
  if (state.lyrics.mode === "static") {
    return;
  }
  const currentTime = dom.audio.currentTime;
  if (!Number.isFinite(currentTime)) {
    return;
  }
  const index = findActiveLyricIndex(state.lyrics.lines, currentTime);
  if (index < 0 || (index === state.lyrics.activeIndex && !force)) {
    return;
  }
  const prev = state.lyrics.activeIndex;
  if (prev >= 0 && state.lyricsLineEls[prev]) {
    state.lyricsLineEls[prev].classList.remove("is-active");
  }
  state.lyricsLineEls.forEach((line) => line.classList.remove("is-next"));
  const active = state.lyricsLineEls[index];
  if (active) {
    active.classList.add("is-active");
  }
  const next = state.lyricsLineEls[index + 1];
  if (next) {
    next.classList.add("is-next");
  }
  state.lyrics.activeIndex = index;
  scrollLyricsTo(index);
}

function scrollLyricsTo(index) {
  const line = state.lyricsLineEls[index];
  if (!line) {
    return;
  }
  const viewportHeight = dom.lyricsViewport.clientHeight;
  const offset = line.offsetTop + line.offsetHeight / 2 - viewportHeight / 2;
  const maxOffset = Math.max(0, dom.lyricsTrack.scrollHeight - viewportHeight);
  const clamped = Math.max(0, Math.min(offset, maxOffset));
  dom.lyricsTrack.style.transform = `translateY(${-clamped}px)`;
}

function maybeEstimateLyrics(track) {
  if (!track || track.Id !== state.lyrics.trackId) {
    return;
  }
  if (state.lyrics.mode !== "static" || !state.lyrics.pendingLines) {
    return;
  }
  const duration = getTrackDurationSeconds(track);
  if (!duration) {
    return;
  }
  const timed = applyEstimatedTimings(state.lyrics.pendingLines, duration);
  setLyricsLines(timed, "estimated");
}

async function requestLyricsPayload(trackId) {
  const endpoints = [
    `/Audio/${trackId}/Lyrics`,
    `/Items/${trackId}/Lyrics`,
  ];
  for (const endpoint of endpoints) {
    const url = `${state.serverUrl}${endpoint}?api_key=${state.apiKey}`;
    const response = await fetch(url, {
      headers: { "X-Emby-Token": state.apiKey },
    });
    if (response.ok) {
      return response.text();
    }
    if (response.status !== 404) {
      return null;
    }
  }
  return null;
}

async function loadLyricsForTrack(track, album) {
  if (!track) {
    return;
  }
  const token = ++state.lyricsToken;
  state.lyrics.trackId = track.Id;
  state.lyrics.lines = [];
  state.lyrics.mode = "loading";
  state.lyrics.activeIndex = -1;
  state.lyrics.pendingLines = null;
  updateLyricsStatus("Loading lyrics...");
  renderLyricsPlaceholder("Loading lyrics...");

  let payload = null;
  try {
    payload = await requestLyricsPayload(track.Id);
  } catch (error) {
    payload = null;
  }

  if (token !== state.lyricsToken) {
    return;
  }

  if (!payload && track.Lyrics) {
    payload = track.Lyrics;
  }

  const parsed = parseLyricsPayload(payload);
  if (parsed.lines.length) {
    if (parsed.hasTimestamps) {
      const lines = parsed.lines
        .filter((line) => line.time != null && line.text)
        .sort((a, b) => a.time - b.time);
      setLyricsLines(lines, "timed");
      return;
    }
    const cleanLines = parsed.lines
      .filter((line) => line.text)
      .map((line) => ({ text: line.text }));
    const duration = getTrackDurationSeconds(track);
    if (duration) {
      const lines = applyEstimatedTimings(cleanLines, duration);
      setLyricsLines(lines, "estimated");
      return;
    }
    setLyricsLines(cleanLines.map((line) => ({ time: null, text: line.text })), "static", cleanLines);
    updateLyricsStatus("Lyrics (timing unknown)");
    return;
  }

  if (!state.lyricsOnline) {
    setLyricsLines([], "none");
    return;
  }

  const cacheKey = makeLyricsCacheKey(track, album);
  const cached = getCachedLyrics(cacheKey);
  if (cached) {
    const cachedParsed = parseLyricsPayload(cached);
    if (cachedParsed.lines.length) {
      if (cachedParsed.hasTimestamps) {
        const lines = cachedParsed.lines
          .filter((line) => line.time != null && line.text)
          .sort((a, b) => a.time - b.time);
        setLyricsLines(lines, "timed", null, "Lyrics via LRCLIB");
        return;
      }
      const cleanLines = cachedParsed.lines
        .filter((line) => line.text)
        .map((line) => ({ text: line.text }));
      const duration = getTrackDurationSeconds(track);
      if (duration) {
        const lines = applyEstimatedTimings(cleanLines, duration);
        setLyricsLines(lines, "estimated", null, "Lyrics via LRCLIB");
        return;
      }
      setLyricsLines(
        cleanLines.map((line) => ({ time: null, text: line.text })),
        "static",
        cleanLines,
        "Lyrics via LRCLIB"
      );
      return;
    }
  }

  updateLyricsStatus("Fetching lyrics online...");
  const external = await fetchLyricsFromLrclib(track, album);
  if (token !== state.lyricsToken) {
    return;
  }
  if (!external) {
    setLyricsLines([], "none");
    return;
  }
  if (external.instrumental) {
    setLyricsLines([], "none", null, "Instrumental");
    return;
  }

  const externalPayload = external.syncedLyrics || external.plainLyrics || "";
  const externalParsed = parseLyricsPayload(externalPayload);
  cacheLyrics(cacheKey, externalPayload);

  if (externalParsed.lines.length) {
    if (externalParsed.hasTimestamps) {
      const lines = externalParsed.lines
        .filter((line) => line.time != null && line.text)
        .sort((a, b) => a.time - b.time);
      setLyricsLines(lines, "timed", null, "Lyrics via LRCLIB");
      return;
    }
    const cleanLines = externalParsed.lines
      .filter((line) => line.text)
      .map((line) => ({ text: line.text }));
    const duration = getTrackDurationSeconds(track);
    if (duration) {
      const lines = applyEstimatedTimings(cleanLines, duration);
      setLyricsLines(lines, "estimated", null, "Lyrics via LRCLIB");
      return;
    }
    setLyricsLines(
      cleanLines.map((line) => ({ time: null, text: line.text })),
      "static",
      cleanLines,
      "Lyrics via LRCLIB"
    );
    return;
  }
  setLyricsLines([], "none");
}

function placeholderText(name) {
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean) {
    return "??";
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  const initials = `${first}${second}`.toUpperCase();
  return initials || "??";
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
    img.src = imageUrl(album.Id, 600);
    img.alt = albumTitle(album);
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

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon coverflow-back-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    closeOpenAlbum();
  });

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

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
}

function appendCoverflowItems(albums, offset) {
  albums.forEach((album, index) => {
    dom.coverflowTrack.appendChild(createCoverflowItem(album, offset + index));
  });
  updateCoverflow();
}

function updateAlbumCount() {
  if (state.windowed && state.albumTotal) {
    if (!state.albums.length) {
      dom.albumCount.textContent = `0 of ${state.albumTotal} albums`;
      return;
    }
    const start = Math.min(state.albumTotal, state.windowStartIndex + 1);
    const end = Math.min(state.albumTotal, state.windowStartIndex + state.albums.length);
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
    item.style.setProperty("--offset", offset.toString());
    item.style.setProperty("--abs", absOffset.toString());
    item.classList.toggle("is-active", index === state.activeIndex);
    const albumId = item.dataset.albumId;
    const isOpen = albumId && albumId === state.openAlbumId;
    item.classList.toggle("is-open", isOpen);
    item.classList.toggle("with-reflection", absOffset <= 3);
    item.style.zIndex = isOpen ? "200" : (100 - Math.abs(offset)).toString();
    item.style.opacity = Math.abs(offset) > 5 ? "0" : "1";
  });

  updateAlbumMeta();
}

function focusActiveCover() {
  const item = dom.coverflowTrack.children[state.activeIndex];
  if (item && document.activeElement !== item) {
    item.focus({ preventScroll: true });
  }
}

function updateAlbumMeta() {
  if (!state.albums.length) {
    dom.albumLine.textContent = state.serverUrl ? "No albums found" : "Connect to Jellyfin";
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
  const shouldShow = !state.albums.length && !state.isLoadingAlbums;
  if (!shouldShow) {
    dom.coverflowEmpty.classList.remove("is-visible");
    return;
  }
  if (isConnected) {
    dom.coverflowEmptyIcon.textContent = "\u266a";
    dom.coverflowEmptyTitle.textContent = "No albums found";
    dom.coverflowEmptySub.textContent = "Check your Jellyfin library settings.";
  } else {
    dom.coverflowEmptyIcon.textContent = "\ud83d\udd0c";
    dom.coverflowEmptyTitle.textContent = "Connect to Jellyfin";
    dom.coverflowEmptySub.textContent = "Use the connect button below to sign in.";
  }
  dom.coverflowEmpty.classList.add("is-visible");
}

function setActiveIndex(index) {
  if (!state.albums.length) {
    return;
  }
  const clamped = Math.max(0, Math.min(state.albums.length - 1, index));
  if (state.activeIndex !== clamped) {
    state.openAlbumId = null;
    state.trackFocusIndex = null;
    state.trackFocusAlbumId = null;
    state.jumpToken += 1;
  }
  state.activeIndex = clamped;
  updateCoverflow();
  ensureTracksForActive();
}

function moveActiveIndex(direction) {
  if (!state.albums.length) {
    return;
  }
  if (!state.windowed) {
    setActiveIndex(state.activeIndex + direction);
    focusActiveCover();
    return;
  }
  const nextIndex = state.activeIndex + direction;
  if (nextIndex < 0) {
    if (state.windowStartIndex > 0) {
      void shiftAlbumWindow(-1);
      return;
    }
    setActiveIndex(0);
    focusActiveCover();
    return;
  }
  if (nextIndex >= state.albums.length) {
    const endIndex = state.windowStartIndex + state.albums.length;
    if (state.albumTotal && endIndex < state.albumTotal) {
      void shiftAlbumWindow(1);
      return;
    }
    setActiveIndex(state.albums.length - 1);
    focusActiveCover();
    return;
  }
  setActiveIndex(nextIndex);
  focusActiveCover();
}

async function shiftAlbumWindow(direction) {
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
  const focusIndex = direction > 0 ? 0 : ALBUM_PAGE_LIMIT - 1;
  await loadAlbumWindow(start, focusIndex);
  focusActiveCover();
}

async function loadAlbumWindow(startIndex, focusIndex = 0, guard = null) {
  const token = ++state.loadToken;
  state.isLoadingAlbums = true;
  state.openAlbumId = null;
  state.trackFocusIndex = null;
  state.trackFocusAlbumId = null;
  try {
    const data = await fetchAlbumsPage(startIndex, ALBUM_PAGE_LIMIT);
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
    state.activeIndex = Math.max(0, Math.min(items.length - 1, focusIndex));
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "track";
    button.dataset.trackId = track.Id;

    const number = document.createElement("span");
    number.textContent = (track.IndexNumber || index + 1).toString();

    const title = document.createElement("div");
    const titleText = document.createElement("div");
    titleText.className = "track-title";
    titleText.textContent = track.Name || "Untitled";
    const metaText = document.createElement("div");
    metaText.className = "track-meta";
    metaText.textContent = formatRuntime(track.RunTimeTicks);
    title.appendChild(titleText);
    title.appendChild(metaText);

    const duration = document.createElement("span");
    duration.textContent = formatRuntime(track.RunTimeTicks);

    button.appendChild(number);
    button.appendChild(title);
    button.appendChild(duration);

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      playTrack(album, track, index);
    });
    button.addEventListener("focus", () => {
      state.trackFocusIndex = index;
      state.trackFocusAlbumId = album.Id;
    });

    tracklist.appendChild(button);
  });

  syncTrackHighlights();
}

function playTrack(album, track, index) {
  const url = buildStreamUrlForTrack(track);
  state.currentTrack = track;
  state.currentAlbum = album;
  state.trackFocusIndex = index;
  state.trackFocusAlbumId = album.Id;
  state.nowPlaying = {
    albumId: album.Id,
    albumName: albumTitle(album),
    albumArtist: albumArtist(album),
    trackId: track.Id,
    trackName: track.Name || "Untitled",
    index,
  };
  dom.audio.src = url;
  dom.audio.preload = "auto";
  dom.audio.load();
  dom.audio.play().catch(() => {
    setStatus("Press play to start audio", "warn");
  });

  const artUrl = imageUrl(album.Id, 200);
  dom.nowCover.style.backgroundImage = `url('${artUrl}')`;
  dom.nowTitle.textContent = track.Name || "Untitled";
  dom.nowSub.textContent = `${albumTitle(album)} - ${albumArtist(album)}`;
  loadLyricsForTrack(track, album);
  syncTrackHighlights();
}

function updateNowPlayingIdle() {
  if (state.nowPlaying) {
    return;
  }
  const isConnected = Boolean(state.serverUrl && state.apiKey && state.userId);
  dom.nowTitle.textContent = "Nothing playing";
  dom.nowSub.textContent = isConnected ? "Waiting for track" : "Connect to start listening";
}

function syncTrackHighlights() {
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

async function connect() {
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
    if (dom.rememberToggle.checked) {
      rememberSettings();
    }
    dom.settingsDialog.close();
    void loadAlbumsPaginated();
  } catch (error) {
    setStatus("Connection failed", "warn");
  }
}

function resetLibraryState() {
  state.albums = [];
  state.activeIndex = 0;
  state.albumTotal = 0;
  state.windowed = false;
  state.windowStartIndex = 0;
  state.openAlbumId = null;
  state.currentTrack = null;
  state.currentAlbum = null;
  state.tracksByAlbum.clear();
  clearTypeahead();
  renderCoverflow();
  updateAlbumMeta();
  resetLyricsPanel();
}

async function loadAlbumsPaginated() {
  const token = ++state.loadToken;
  state.isLoadingAlbums = true;
  state.windowed = false;
  state.windowStartIndex = 0;
  resetLibraryState();
  setStatus("Loading albums...", "info");

  let startIndex = 0;
  const limit = ALBUM_PAGE_LIMIT;
  let total = null;
  let hadError = false;

  try {
    while (true) {
      if (total !== null && startIndex >= total) {
        break;
      }
      const pageLimit = total ? Math.min(limit, total - startIndex) : limit;
      let data;
      try {
        data = await fetchJson(albumItemsPath(startIndex, pageLimit));
      } catch (error) {
        if (state.albums.length) {
          hadError = true;
          break;
        }
        throw error;
      }

      if (token !== state.loadToken) {
        return;
      }

      const items = data.Items || [];
      if (total === null) {
        total = data.TotalRecordCount || items.length;
        state.albumTotal = total;
      }

      if (!items.length) {
        break;
      }

      const offset = state.albums.length;
      state.albums.push(...items);

      if (offset === 0) {
        renderCoverflow();
        ensureTracksForActive();
      } else {
        appendCoverflowItems(items, offset);
      }
      maybeApplyTypeahead();

      updateAlbumCount();
      if (state.albumTotal) {
        setStatus(`Loading albums ${state.albums.length}/${state.albumTotal}`, "info");
      }
      startIndex += items.length;

      if (items.length < pageLimit) {
        break;
      }
    }

    if (hadError) {
      setStatus(`Loaded ${state.albums.length} albums`, "ok");
    } else {
      setStatus("Connected", "ok");
    }
    updateNowPlayingIdle();
  } catch (error) {
    if (!state.albums.length) {
      setStatus("Albums failed to load", "warn");
    }
  } finally {
    if (token === state.loadToken) {
      state.isLoadingAlbums = false;
    }
  }
}

async function loadUsers() {
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

function resetForm() {
  dom.serverUrlInput.value = "";
  dom.usernameInput.value = "";
  dom.passwordInput.value = "";
  dom.apiKeyInput.value = "";
  dom.userSelect.innerHTML = '<option value="">Select a user</option>';
  dom.userIdInput.value = "";
  clearSettings();
  setStatus("Cleared saved settings", "info");
}

function setupEvents() {
  dom.openSettings.addEventListener("click", () => {
    dom.settingsDialog.showModal();
  });
  if (dom.lyricsPaneToggle && dom.coverflowSection) {
    dom.lyricsPaneToggle.addEventListener("click", () => {
      const isOpen = dom.coverflowSection.classList.toggle("is-lyrics-open");
      dom.lyricsPaneToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }
  dom.closeSettings.addEventListener("click", () => {
    dom.settingsDialog.close();
  });
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
  window.addEventListener("keydown", (event) => {
    if (dom.settingsDialog.open) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
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
      const targetTrack =
        target && target.closest ? target.closest(".track") : null;
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
    const tracks = state.tracksByAlbum.get(state.nowPlaying.albumId) || [];
    const nextIndex = state.nowPlaying.index + 1;
    if (tracks[nextIndex]) {
      const album = state.albums.find((item) => item.Id === state.nowPlaying.albumId);
      if (album) {
        playTrack(album, tracks[nextIndex], nextIndex);
      }
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

function handleCoverClick(index) {
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

function toggleOpenForActive() {
  const album = state.albums[state.activeIndex];
  if (!album) {
    return;
  }
  toggleOpenAlbum(album.Id);
}

function toggleOpenAlbum(albumId) {
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

function closeOpenAlbum() {
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

function getOpenTrackButtons() {
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

function focusTrackByDelta(delta) {
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


function clearTypeahead() {
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

function clearTypeaheadLookup() {
  if (state.typeaheadLookupTimer) {
    clearTimeout(state.typeaheadLookupTimer);
  }
  state.typeaheadLookupTimer = null;
  state.typeaheadLookupQuery = "";
  state.typeaheadLookupToken += 1;
}

function scheduleTypeaheadClear() {
  if (state.typeaheadTimer) {
    clearTimeout(state.typeaheadTimer);
  }
  state.typeaheadTimer = window.setTimeout(() => {
    clearTypeahead();
  }, 3000);
}

function showTypeahead() {
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

function jumpToArtistPrefix(query) {
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

function normalizeTypeaheadQuery(query) {
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

function shouldUseServerLookup() {
  if (state.windowed) {
    return true;
  }
  if (!state.albumTotal) {
    return true;
  }
  return state.albums.length < state.albumTotal;
}

function scheduleTypeaheadLookup(query) {
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

async function fetchAlbumAtIndex(index) {
  if (index < 0) {
    return null;
  }
  if (state.windowed) {
    const localIndex = index - state.windowStartIndex;
    if (localIndex >= 0 && localIndex < state.albums.length) {
      return state.albums[localIndex];
    }
  } else if (index >= 0 && index < state.albums.length) {
    return state.albums[index];
  }
  const data = await fetchAlbumsPage(index, 1);
  return data.Items?.[0] || null;
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

async function loadAlbumWindowAndFocusById(startIndex, albumId, token) {
  await loadAlbumWindow(startIndex, 0, { type: "jump", token });
  if (token !== state.jumpToken) {
    return false;
  }
  const localIndex = state.albums.findIndex((album) => album.Id === albumId);
  if (localIndex === -1) {
    return false;
  }
  setActiveIndex(localIndex);
  focusActiveCover();
  return true;
}

async function jumpToAlbumById(albumId) {
  if (!albumId || !state.serverUrl || !state.apiKey || !state.userId) {
    return;
  }
  if (state.openAlbumId) {
    closeOpenAlbum();
  }
  clearTypeahead();
  const localIndex = state.albums.findIndex((album) => album.Id === albumId);
  if (localIndex !== -1) {
    setActiveIndex(localIndex);
    focusActiveCover();
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
    const foundCentered = await loadAlbumWindowAndFocusById(centeredStart, albumId, token);
    if (token !== state.jumpToken || foundCentered) {
      return;
    }
    const startAtBase = Math.max(0, Math.min(maxStart, baseIndex));
    const foundAtBase = await loadAlbumWindowAndFocusById(startAtBase, albumId, token);
    if (token !== state.jumpToken) {
      return;
    }
    if (!foundAtBase && state.albums.length) {
      const fallbackIndex = Math.max(
        0,
        Math.min(state.albums.length - 1, baseIndex - state.windowStartIndex)
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

loadSettings();
loadPreferences();
initTheme();
setupEvents();

if (dom.serverUrlInput.value && dom.apiKeyInput.value && dom.userIdInput.value) {
  connect();
}
