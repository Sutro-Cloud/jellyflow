import React, { useEffect, useRef } from "react";
import { initDom } from "./modules/dom.js";
import { initApp } from "./app/initApp.js";

export default function App() {
  const hasInit = useRef(false);
  const showGithubLink = (import.meta.env.VITE_GITHUB_LINK_ENABLED || "").toLowerCase() === "true";

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
          {showGithubLink ? (
            <a
              className="github-link"
              href="https://github.com/sutro-cloud/jellyflow"
              target="_blank"
              rel="noreferrer"
              aria-label="View Jellyflow on GitHub"
            >
              <svg
                className="github-icon"
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
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
            <div className="album-count" id="albumCount">0 albums</div>
          </div>
          <div className="lyrics-panel" id="lyricsPanel">
            <div className="lyrics-header">
              <div className="lyrics-header-text">
                <div className="lyrics-title">Lyrics</div>
                <div className="lyrics-status" id="lyricsStatus">No track playing</div>
              </div>
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
            <div className="now-actions">
              <button
                className="control-icon"
                id="openSettings"
                type="button"
                aria-label="Settings"
                title="Settings"
              >
                &#9881;
              </button>
              <button
                className="control-icon"
                id="themeToggle"
                type="button"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                &#9789;
              </button>
              <button
                className="control-icon shuffle-toggle"
                id="shuffleBtn"
                type="button"
                aria-label="Shuffle album and track"
                title="Shuffle album and track"
              >
                &#128256;
              </button>
              <button
                className="lyrics-toggle"
                id="lyricsPaneToggle"
                type="button"
                aria-label="Toggle lyrics panel"
                aria-expanded="false"
              >
                &#9834;
              </button>
              <button
                className="playlist-toggle"
                id="playlistPaneToggle"
                type="button"
                aria-label="Toggle playlists panel"
                aria-expanded="false"
              >
                &#9776;
              </button>
              <button
                className="control-icon player-collapse"
                id="playerCollapse"
                type="button"
                aria-label="Hide player controls"
                aria-controls="playerFooter"
                aria-expanded="true"
                title="Hide player controls"
              ></button>
            </div>
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
        <audio id="audio" controls preload="auto"></audio>
        <button
          className="player-reveal"
          id="playerReveal"
          type="button"
          aria-label="Show player controls"
          aria-controls="playerFooter"
          aria-expanded="true"
          title="Show player controls"
        ></button>
      </footer>

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
