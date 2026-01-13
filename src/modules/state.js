export const state = {
  serverUrl: "",
  apiKey: "",
  userId: "",
  albums: [],
  activeIndex: 0,
  albumTotal: 0,
  windowed: false,
  windowStartIndex: 0,
  windowOffset: 0,
  prefetchToken: 0,
  isPrefetchingAhead: false,
  isPrefetchingBehind: false,
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
  backgroundAudioEnabled: true,
  tracksByAlbum: new Map(),
  nowPlaying: null,
  playlists: [],
  playlistTracksById: new Map(),
  playlistView: "list",
  activePlaylistId: null,
  playlistPlayback: null,
  playlistsLoading: false,
  playlistLoadToken: 0,
  favoriteTrackId: null,
  isFavorite: false,
  favoriteBusy: false,
  favoriteToken: 0,
  shuffleMode: false,
  shuffleHistory: [],
  shuffleIndex: -1,
};

function isSmallViewport() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(max-width: 900px), (max-height: 640px)").matches;
}

function isIOS() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const DEFAULT_ALBUM_PAGE_LIMIT = 120;
const SMALL_ALBUM_PAGE_LIMIT = 60;
export const IS_SMALL_VIEWPORT = isSmallViewport();
export const IS_IOS = isIOS();
export const ALBUM_PAGE_LIMIT =
  IS_IOS || IS_SMALL_VIEWPORT ? SMALL_ALBUM_PAGE_LIMIT : DEFAULT_ALBUM_PAGE_LIMIT;
export const TYPEAHEAD_LOOKUP_DELAY = 250;
