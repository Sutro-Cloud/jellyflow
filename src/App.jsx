import React, { useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Heart,
  List,
  Moon,
  Plug,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Sun,
} from "lucide-react";
import { initDom } from "./modules/dom.js";
import { initApp } from "./app/initApp.js";

export default function App() {
  const hasInit = useRef(false);
  const showGithubLink = (import.meta.env.VITE_GITHUB_LINK_ENABLED || "").toLowerCase() === "true";
  const showBuyMeACoffee =
    (import.meta.env.VITE_BUYMEACOFFEE_ENABLED || "").toLowerCase() === "true";
  const iconProps = { "aria-hidden": "true", strokeWidth: 1.8 };

  useEffect(() => {
    if (hasInit.current) {
      return;
    }
    hasInit.current = true;
    initDom();
    initApp();
  }, []);

  return (
    <div className="app">
      <main className="main">
        <section className="coverflow-section" id="coverflowSection">
          {showGithubLink || showBuyMeACoffee ? (
            <div className="corner-links">
              {showGithubLink ? (
                <a
                  className="corner-link github-link"
                  href="https://github.com/sutro-cloud/jellyflow"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View Jellyflow on GitHub"
                  title="Contribute to Jellyflow"
                >
                  <svg
                    className="corner-link-icon"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                </a>
              ) : null}
              {showBuyMeACoffee ? (
                <a
                  className="corner-link buymeacoffee-link"
                  href="https://buymeacoffee.com/jonathanrico"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Buy me a coffee"
                  title="Support this guy"
                >
                  <svg
                    className="corner-link-icon"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M3.172 5.172a4 4 0 0 1 5.656 0L10 6.343l1.172-1.171a4 4 0 1 1 5.656 5.656L10 18.343l-6.828-6.829a4 4 0 0 1 0-5.656z" />
                  </svg>
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="coverflow">
            <div className="coverflow-stage" id="coverflowStage">
              <div className="coverflow-track" id="coverflowTrack"></div>
              <div
                className="coverflow-empty is-visible is-brand-only"
                id="coverflowEmpty"
                aria-live="polite"
              >
                <div className="coverflow-empty-brand" id="coverflowEmptyBrand">
                  <img
                    className="coverflow-empty-logo"
                    src="/jellyflow.png"
                    alt="Jellyflow logo"
                  />
                  <div className="coverflow-empty-name">Jellyflow</div>
                </div>
                <button
                  className="primary coverflow-empty-connect"
                  id="connectSplashBtn"
                  type="button"
                >
                  Connect to server
                </button>
                <div className="coverflow-empty-icon" id="coverflowEmptyIcon">&#9881;</div>
                <div className="coverflow-empty-title" id="coverflowEmptyTitle"></div>
                <div className="coverflow-empty-sub" id="coverflowEmptySub"></div>
              </div>
            </div>
          </div>
          <div className="album-meta" id="albumMeta">
            <div className="album-line" id="albumLine"></div>
            <div className="album-meta-top">
              <button
                className="control-icon search-toggle album-search"
                id="searchToggle"
                type="button"
                aria-label="Search albums"
                title="Search albums"
              >
                <Search className="icon" {...iconProps} />
              </button>
              <div className="album-count" id="albumCount">0 albums</div>
            </div>
          </div>
          <div className="lyrics-panel" id="lyricsPanel">
            <div className="lyrics-header">
              <div className="lyrics-header-text">
                <div className="lyrics-title">Lyrics</div>
                <div className="lyrics-status" id="lyricsStatus">No track playing</div>
              </div>
              <button
                className="icon panel-close"
                id="lyricsPanelClose"
                type="button"
                aria-label="Close lyrics panel"
              >
                &times;
              </button>
            </div>
            <div className="lyrics-viewport" id="lyricsViewport">
              <div className="lyrics-track" id="lyricsTrack">
                <div className="lyrics-line is-active">Start playing a track to see lyrics.</div>
              </div>
            </div>
          </div>
          <div className="playlist-panel" id="playlistPanel" data-view="list">
            <div className="playlist-header">
              <button
                className="icon playlist-back"
                id="playlistBack"
                type="button"
                aria-label="Back to playlists"
                hidden
              >
                &lt;
              </button>
              <div className="playlist-header-text">
                <div className="playlist-title" id="playlistTitle">Playlists</div>
                <div className="playlist-status" id="playlistStatus">No playlists loaded</div>
              </div>
              <button
                className="icon panel-close"
                id="playlistPanelClose"
                type="button"
                aria-label="Close playlists panel"
              >
                &times;
              </button>
            </div>
            <div className="playlist-body">
              <div className="playlist-list" id="playlistList">
                <div className="empty">No playlists loaded</div>
              </div>
              <div className="tracklist playlist-tracklist" id="playlistTracks"></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="player" id="playerFooter">
        <div className="player-left">
          <div className="now-playing">
            <div
              className="now-cover"
              id="nowCover"
              role="button"
              tabIndex={0}
              aria-label="Jump to now playing album"
            ></div>
            <div className="now-info">
              <div className="now-title" id="nowTitle">Nothing playing</div>
              <div className="now-sub" id="nowSub">Connect to start listening</div>
            </div>
          </div>
          <div className="player-controls-row">
            <div className="now-actions">
              <div className="settings-menu" id="settingsMenuWrap">
                <button
                  className="control-icon"
                  id="openSettings"
                  type="button"
                  aria-label="Open settings menu"
                  aria-haspopup="menu"
                  aria-expanded="false"
                  aria-controls="settingsMenu"
                  title="Open settings menu"
                >
                  <Settings className="icon" {...iconProps} />
                </button>
                <div className="settings-menu-popover" id="settingsMenu" role="menu" aria-hidden="true">
                  <button
                    className="settings-menu-item"
                    id="openConnection"
                    type="button"
                    role="menuitem"
                  >
                    <Plug className="icon" {...iconProps} />
                    <span>Connection</span>
                  </button>
                  <button
                    className="settings-menu-item theme-toggle"
                    id="themeToggle"
                    type="button"
                    role="menuitem"
                    aria-label="Toggle theme"
                  >
                    <span className="menu-icon">
                      <Sun className="icon icon-sun" {...iconProps} />
                      <Moon className="icon icon-moon" {...iconProps} />
                    </span>
                    <span>Theme</span>
                  </button>
                  <button
                    className="settings-menu-item"
                    id="playlistPaneToggle"
                    type="button"
                    role="menuitem"
                    aria-label="Toggle playlists panel"
                    aria-expanded="false"
                  >
                    <List className="icon" {...iconProps} />
                    <span>Playlists</span>
                  </button>
                  <button
                    className="settings-menu-item"
                    id="lyricsPaneToggle"
                    type="button"
                    role="menuitem"
                    aria-label="Toggle lyrics panel"
                    aria-expanded="false"
                  >
                    <FileText className="icon" {...iconProps} />
                    <span>Lyrics</span>
                  </button>
                  <button
                    className="settings-menu-item"
                    id="playerCollapse"
                    type="button"
                    role="menuitem"
                    aria-controls="playerFooter"
                    aria-expanded="true"
                    title="Hide player controls"
                  >
                    <ChevronDown className="icon" {...iconProps} />
                    <span>Hide player controls</span>
                  </button>
                </div>
              </div>
              <button
                className="control-icon"
                id="prevTrackBtn"
                type="button"
                aria-label="Previous track"
                title="Previous track"
              >
                <SkipBack className="icon" {...iconProps} />
              </button>
              <button
                className="control-icon"
                id="nextTrackBtn"
                type="button"
                aria-label="Next track"
                title="Next track"
              >
                <SkipForward className="icon" {...iconProps} />
              </button>
              <button
                className="control-icon shuffle-toggle"
                id="shuffleBtn"
                type="button"
                aria-label="Shuffle album and track"
                aria-pressed="false"
                title="Shuffle album and track"
              >
                <Shuffle className="icon" {...iconProps} />
              </button>
              <button
                className="control-icon favorite-toggle"
                id="favoriteToggle"
                type="button"
                aria-label="Favorite track"
                aria-pressed="false"
                title="Favorite track"
              >
                <Heart className="icon" {...iconProps} />
              </button>
            </div>
            <audio id="audio" controls preload="auto"></audio>
          </div>
          <div className="ad-slot" id="adSlot" aria-hidden="true"></div>
          <div className="footer-controls" id="cornerControls">
            <div
              className="status"
              id="status"
              data-tone="idle"
              role="button"
              tabIndex={0}
              aria-label="Open connection settings"
            ></div>
          </div>
        </div>
        <button
          className="player-reveal"
          id="playerReveal"
          type="button"
          aria-label="Show player controls"
          aria-controls="playerFooter"
          aria-expanded="true"
          title="Show player controls"
        >
          <ChevronUp className="icon" {...iconProps} />
        </button>
      </footer>

      <input
        className="typeahead-input"
        id="typeaheadInput"
        type="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        placeholder="Search artists"
        aria-label="Search artists"
      />
      <dialog id="settingsDialog">
        <div className="dialog-header">
          <div>
            <div className="dialog-title">Connect to Jellyfin</div>
            <div className="dialog-sub">Provide your server URL, API key, and user ID.</div>
          </div>
          <button className="icon" id="closeSettings" type="button" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="dialog-body">
          <label className="field">
            <span>Server URL</span>
            <input
              id="serverUrlInput"
              type="url"
              placeholder="https://jellyfin.yourdomain.com"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Username</span>
            <input
              id="usernameInput"
              type="text"
              placeholder="Jellyfin username"
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              id="passwordInput"
              type="password"
              placeholder="Jellyfin password"
              autoComplete="current-password"
            />
          </label>
          <details className="advanced-auth">
            <summary>Use API key instead</summary>
            <div className="advanced-body">
              <label className="field">
                <span>API Key</span>
                <input
                  id="apiKeyInput"
                  type="password"
                  placeholder="Paste your Jellyfin API key"
                  autoComplete="off"
                />
              </label>
              <div className="field-row">
                <button className="ghost" id="loadUsersBtn" type="button">Load Users</button>
                <label className="field">
                  <span>User</span>
                  <select id="userSelect" defaultValue="">
                    <option value="">Select a user</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span>User ID</span>
                <input
                  id="userIdInput"
                  type="text"
                  placeholder="User ID"
                  autoComplete="off"
                />
              </label>
            </div>
          </details>
          <label className="toggle">
            <input id="lyricsToggle" type="checkbox" defaultChecked />
            <span>Fetch lyrics from LRCLIB (online)</span>
          </label>
          <label className="toggle">
            <input id="backgroundAudioToggle" type="checkbox" defaultChecked />
            <span>Keep playing in background</span>
          </label>
          <label className="toggle">
            <input id="rememberToggle" type="checkbox" defaultChecked />
            <span>Remember connection on this device</span>
          </label>
        </div>
        <div className="dialog-actions">
          <button className="primary" id="connectBtn" type="button">Save &amp; Connect</button>
          <button className="ghost" id="resetBtn" type="button">Clear</button>
        </div>
      </dialog>

      <div className="typeahead" id="typeahead" aria-hidden="true"></div>
    </div>
  );
}
